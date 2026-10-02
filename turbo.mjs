/**
 * turbo.mjs —— ULTRA / LIGHTNING 的宿主半边：状态、路由、舰队令牌计量、策略注入。
 *
 * 它把四个模块接起来：
 *   policy.mjs   → 英文策略正文（组合现成轮子，见该文件头注释）
 *   inject.mjs   → agent/pre-step 按会话精确注入（变了才注入）
 *   metrics.mjs  → 纯函数式的 tok/s 统计（按窗口、CJK 感知）
 *   本文件        → 会话状态持久化 + `/turbo` 路由 + 子代理成员集维护
 *
 * 设计纪律（每条都有出处）：
 *  1. **绝不全局注入**：注入按 `agent.id` 精确过滤，子代理与其它会话不受影响。
 *  2. **变了才注入**：策略文本只在"应当生效的文本发生变化"时进历史，
 *     与 `dsh-agent-loop` 自己的 `RuntimeContextProjection.retained` 同款做法。
 *  3. **读数绝不作假**：拿不到流数据就返回 0；宿主任何异常都退化成"不注入、读数为 0"，
 *     绝不让 `/turbo` 路由把插件带崩。
 *  4. 只统计**被跟踪会话的后代**（`origin === 'subagent'` 的会话），
 *     不把别的会话（例如长驻的微信会话）算进来。
 */

import { policyText } from "./policy.mjs";
import { createFleetMeter } from "./metrics.mjs";
import { createPolicyInjector } from "./inject.mjs";

export const TURBO_ENDPOINT = "/plugins/dsh-client-effort-slider/turbo";

/** 模式关闭时补的一句，避免历史里那条策略继续生效（引擎"变了才注入"的同款用法）。 */
export const OFF_NOTICE =
  "Ultra Mode and Lightning Mode are now OFF for this session. Disregard any earlier policy text from them in this conversation.";

const MAX_TRACKED_SESSIONS = 40;   // 状态文件是给人看的，别无限长
const MAX_MEMBERS = 96;            // 单次统计的舰队规模上限
const MEMBER_REFRESH_MS = 2000;    // 子代理成员集刷新周期（比事件驱动简单且够快）

function isSessionId(value) {
  return typeof value === "string" && /^session-[A-Za-z0-9._-]{4,120}$/.test(value);
}

/**
 * @param {object} ctx  宿主 Cordis 上下文
 * @param {object} options
 *   { log, readSessions: () => Record<string,{lightning?:boolean,ultra?:boolean}>,
 *     writeSessions: (sessions) => Promise<boolean>, readJson, endpoint? }
 * @returns {{ dispose: () => void, sample: () => object, stateOf: (id:string) => object }}
 */
export function createTurbo(ctx, options = {}) {
  const log = typeof options.log === "function" ? options.log : () => {};
  const readSessions = typeof options.readSessions === "function" ? options.readSessions : () => ({});
  const writeSessions = typeof options.writeSessions === "function" ? options.writeSessions : async () => false;
  const readJson = typeof options.readJson === "function" ? options.readJson : null;
  const endpoint = typeof options.endpoint === "string" ? options.endpoint : TURBO_ENDPOINT;

  const disposers = [];
  let sessions = {};
  let tracked = new Set();          // 需要统计子代理的会话（当前有模式开的）
  const everOn = new Set();         // 曾经开过（用于补"模式已关闭"那句）
  let members = new Set();
  let refreshTimer = null;
  let refreshing = false;
  let disposed = false;

  const meter = createFleetMeter({});

  try {
    sessions = readSessions() ?? {};
  } catch (error) {
    log(`读取 turbo 状态失败，按空状态处理：${String(error)}`);
    sessions = {};
  }

  function stateOf(sessionId) {
    const raw = sessions[sessionId];
    return { lightning: raw?.lightning === true, ultra: raw?.ultra === true };
  }

  function anyOn(sessionId) {
    const state = stateOf(sessionId);
    return state.lightning || state.ultra;
  }

  /** 本会话"当前应当生效"的文本（去重交给 inject.mjs）。 */
  function activeText(sessionId) {
    try {
      if (anyOn(sessionId)) {
        everOn.add(sessionId);
        return policyText(stateOf(sessionId));
      }
      return everOn.has(sessionId) ? OFF_NOTICE : "";
    } catch (error) {
      log(`计算策略文本失败：${String(error)}`);
      return "";
    }
  }

  /** 只给界面看"现在注入了什么"，不触发 OFF 提示的落盘语义。 */
  function currentPolicy(sessionId) {
    try {
      return anyOn(sessionId) ? policyText(stateOf(sessionId)) : "";
    } catch {
      return "";
    }
  }

  const injector = createPolicyInjector(ctx, { log, resolve: activeText });

  /* ── 1. 流式计量：订阅所有 agent 的 chunk，只留成员 ───────────────────── */

  try {
    const off = ctx.on("agent/assistant-stream", (payload) => {
      try {
        if (disposed) return;
        const frame = payload?.frame;
        if (frame?.type !== "chunk") return;                       // 只要 chunk 帧
        const agentId = payload?.agent?.id;
        if (typeof agentId !== "string" || !members.has(agentId)) return;
        meter.ingest(agentId, frame.chunk, typeof frame.time === "number" ? frame.time : undefined);
      } catch { /* 计量异常绝不影响会话 */ }
    });
    if (typeof off === "function") disposers.push(off);
  } catch (error) {
    log(`订阅 assistant-stream 失败（tok/s 读数将恒为 0）：${String(error)}`);
  }

  /* ── 2. 成员集：被跟踪会话的后代 ─────────────────────────────────────── */

  async function refreshMembers() {
    if (disposed || refreshing) return;
    refreshing = true;
    try {
      const subagents = typeof ctx.get === "function" ? ctx.get("subagents") : undefined;
      const next = new Set();
      tracked = new Set(Object.keys(sessions).filter((id) => anyOn(id)));
      if (subagents && typeof subagents.listDescendants === "function") {
        for (const rootId of tracked) {
          if (next.size >= MAX_MEMBERS) break;
          try {
            const list = await subagents.listDescendants(rootId);
            if (!Array.isArray(list)) continue;
            for (const entry of list) {
              if (next.size >= MAX_MEMBERS) break;
              if (entry && entry.kind === "child" && typeof entry.id === "string") next.add(entry.id);
            }
          } catch { /* 某个会话列不出来就跳过它 */ }
        }
      }
      members = next;
      meter.setMembers(next);
    } catch (error) {
      log(`刷新子代理成员集失败（本次按空集处理）：${String(error)}`);
      members = new Set();
      try { meter.setMembers(members); } catch { /* 忽略 */ }
    } finally {
      refreshing = false;
    }
  }

  try {
    void refreshMembers();
    refreshTimer = setInterval(() => { void refreshMembers(); }, MEMBER_REFRESH_MS);
    if (typeof refreshTimer.unref === "function") refreshTimer.unref();
  } catch (error) {
    log(`启动成员集刷新失败：${String(error)}`);
  }

  /* ── 3. 路由 ─────────────────────────────────────────────────────────── */

  try {
    const disposeRoute = ctx.webServer.register({
      kind: "exact",
      path: endpoint,
      handler: async (request, response) => {
        const headers = {
          "Content-Type": "application/json; charset=utf-8",
          "Cache-Control": "no-store",
          "X-Content-Type-Options": "nosniff",
        };
        try {
          const url = new URL(request.url ?? "/", "http://localhost");
          if (request.method === "GET") {
            const raw = url.searchParams.get("session");
            const sessionId = isSessionId(raw) ? raw : null;
            const sample = meter.sample();
            response.writeHead(200, headers);
            response.end(JSON.stringify({
              ok: true,
              session: sessionId,
              lightning: sessionId ? stateOf(sessionId).lightning : false,
              ultra: sessionId ? stateOf(sessionId).ultra : false,
              rate: sample.rate,
              gen: sample.gen,
              agents: sample.agents,
              generating: sample.generating,
              total: sample.total,
              policy: sessionId ? currentPolicy(sessionId) : "",
              stamp: Date.now(),
            }));
            return;
          }
          if (request.method === "PATCH" || request.method === "POST") {
            if (readJson === null) {
              response.writeHead(503, headers);
              response.end(JSON.stringify({ ok: false, error: "body-reader-unavailable" }));
              return;
            }
            const body = await readJson(request, response);
            if (!body.ok) {
              if (!response.headersSent) {
                response.writeHead(400, headers);
                response.end(JSON.stringify({ ok: false, error: body.tooLarge ? "body-too-large" : "invalid-body" }));
              }
              return;
            }
            const payload = body.value ?? {};
            const sessionId = payload.session;
            if (!isSessionId(sessionId)) {
              response.writeHead(400, headers);
              response.end(JSON.stringify({ ok: false, error: "invalid-session" }));
              return;
            }
            const previous = stateOf(sessionId);
            const nextState = {
              lightning: typeof payload.lightning === "boolean" ? payload.lightning : previous.lightning,
              ultra: typeof payload.ultra === "boolean" ? payload.ultra : previous.ultra,
            };
            sessions[sessionId] = nextState;
            // 键太多就丢最早的（对象键顺序 = 插入顺序）
            const keys = Object.keys(sessions);
            if (keys.length > MAX_TRACKED_SESSIONS) {
              for (const key of keys.slice(0, keys.length - MAX_TRACKED_SESSIONS)) delete sessions[key];
            }
            const persisted = await writeSessions(sessions);
            void refreshMembers();
            log(`turbo 状态更新：lightning=${nextState.lightning} ultra=${nextState.ultra}（持久化：${persisted ? "成功" : "失败"}）`);
            response.writeHead(200, headers);
            response.end(JSON.stringify({ ok: true, ...nextState, persisted }));
            return;
          }
          response.writeHead(405, { ...headers, Allow: "GET, PATCH, POST" });
          response.end();
        } catch (error) {
          log(`/turbo 端点异常：${String(error)}`);
          try {
            if (!response.headersSent) response.writeHead(500, headers);
            response.end(JSON.stringify({ ok: false, error: "internal" }));
          } catch { /* 连接可能已断 */ }
        }
      },
    });
    if (typeof disposeRoute === "function") disposers.push(disposeRoute);
  } catch (error) {
    log(`注册 /turbo 路由失败（界面上的闪电与读数将不可用）：${String(error)}`);
  }

  log(`turbo 就绪（端点 ${endpoint}；注入器：${injector ? "已挂载" : "不可用"}）`);

  return {
    sample: () => meter.sample(),
    stateOf,
    dispose() {
      disposed = true;
      try { if (refreshTimer !== null) clearInterval(refreshTimer); } catch { /* 忽略 */ }
      refreshTimer = null;
      try { injector.dispose(); } catch { /* 忽略 */ }
      for (const dispose of disposers.splice(0)) {
        try { dispose?.(); } catch { /* 卸载异常不冒泡 */ }
      }
    },
  };
}

export default { createTurbo, TURBO_ENDPOINT, OFF_NOTICE };
