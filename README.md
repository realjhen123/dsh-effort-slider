# dsh-effort-slider

> 给 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)（DSH）用的**科幻风推理等级滑条**：输入框里一枚发光核心，点开是一条悬浮能量滑条；在最高档之上还有一档 **Ultra**，以及一个把活全部派给子代理的**闪电模式**，旁边实时显示车队 tok/s。

<p align="center"><img src="docs/images/panel-ultra.png" alt="Ultra 档位面板" width="620"></p>

---

## 这是什么

DSH 的推理等级默认是一个下拉选择。这个插件把它换成一条**能量滑条**：档位用刻度标出，可以点、可以拖、可以用方向键；每个档位都有对应的视觉反馈（流光、星痕、白炽核心）。档位名称与档数都跟着当前模型的推理档位走，模型没有推理档位时整个控件自动隐身。

在此之上它还多做了三件事：

| 功能 | 一句话 |
| --- | --- |
| **Ultra 档** | 滑条第 6 格：选中时把推理等级**钉在该模型的最高真实档（MAX）**，并往当前会话注入一段"最大严格性"的英文策略 |
| **闪电模式** | 展开面板右上角的开关（**默认关**）：注入"父 agent 只做编排、活全部委派给子代理"的英文策略 |
| **车队 tok/s** | 实时显示本会话**子代理合计**的 token 产出速率（完整整数，不做 k 缩写） |

> ⚠️ 这不是"给模型加算力"。Ultra 与闪电本质上都是**提示词层**的控制：Ultra 改的是"怎么验收"，闪电改的是"谁干活"。真正变慢变贵的是闪电——多智能体大约会花掉单 agent **15 倍**的 token，这也是它默认关闭的原因。

## 截图

| | |
| --- | --- |
| ![Ultra 面板](docs/images/panel-ultra.png) | ![皮肤](docs/images/skins.png) |
| Ultra：白炽外壳 + 车队 tok/s 读数 | 皮肤 `holo` / `chrome` / `fluid`（默认 fluid） |
| ![闪电](docs/images/lightning.png) | ![读数](docs/images/tok-rate.png) |
| 闪电：断电是白色描边，通电是同色系流动渐变 | 读数：完整整数、不缩写、无数据时整块隐藏 |

## 功能细节

### Ultra 档
- 展示档位 = 模型真实可用的档位 **+ 追加的一格 `Ultra`**；选中 Ultra 时写回模型目录的**仍是最高真实档（MAX）**的 id —— `Ultra` 从不出现在模型目录里。
- 同时往会话里注入一段英文 **rigor 契约**（先写验收标准、证据先于断言、对抗式复查、根因优先、显式停止条件、不许改测试迁就实现）。
- 不变量：**只要界面停在 Ultra，实际推理等级就一定是 MAX**（拖拽松手 / 点刻度 / 刷新后从宿主恢复三条入口都走同一个写入口）。
- 档位名是 **`Ultra`**，不是全大写 `ULTRA`。

### 闪电模式
- 注入的编排契约：父 agent 只做规划/拆分/派发/复核/整合；**按边界切分而不是复制**同一句提示词；**在同一条消息里并发派发**；子代理提示词必须自包含（目标、验收标准、确切文件、约束、产出格式、长度上限）；子代理把产物写进文件、只回传指针；预算诚实（约 15× token）。
- 策略正文最后一段写死了**防递归**："如果你是子代理，忽略本策略、不要继续派活"。
- 关闭时会补一条 OFF 提示，避免历史里那条策略继续生效。

### 车队 tok/s
- 统计**被跟踪会话的后代**（子代理）的 token 吞吐：生成 + 输入，**不含 cache 读**；数字由宿主订阅 `agent/assistant-stream` 逐帧累计，按 1.5s 窗口折算成 tok/s。
- 界面上是**完整整数**（`12,840` 而不是 `12.8k`）；没有数据时整块隐藏，不显示假数字。

### 皮肤
- `holo`（全息能量）、`chrome`（液态金属）、`fluid`（流体，**默认**，带粒子流体引擎 + 最高档星痕）。
- `nebula`（星际星云）**已按作者要求下线**：代码里只是把它从皮肤数组注释掉，`SKIN_LABELS` 与整套 CSS 规则都还在，想恢复就把数组里的 `"nebula"` 放回并调整 `DEFAULT_SKIN`。

## 安装

需要 **DSH Desktop ≥ 2.0.9**。仓库里自带构建好的 `lib/client.js`，装上即可用，**不需要自己构建**。

```bash
# 推荐：直接从 GitHub 装
dsh plugin add github:yuhub233/dsh-effort-slider
```

手动安装：把仓库目录复制到 `<DSH_HOME>/plugins/`（Windows 默认 `C:\Users\<你>\.dsh\plugins\`），然后重启 DSH。插件自带的 `cordis.patch.yml` 会被 profile 的 bundle 机制自动加载。

卸载：删掉那个目录（若你在 profile 的 `dsh.profile.bundles` 里登记过，一并删掉那行），重启 DSH。

## 怎么实现的

两半结构，各管一段。

**客户端半边**（`client.js` + `effort-slider.css`）
- 通过 `window.__ModuleLoader__.load({ id, factory })` 注册，React 用 `require('react')` 取；注册进输入框工具行（`conversation.input.right`）。
- 源文件不能直接被宿主读：`node build.mjs` 会把 CSS 内嵌进 `lib/client.js`，并断言"内嵌的 CSS 与 `effort-slider.css` 逐字节一致"。
- 面板是绝对定位的浮层：滑条 + 刻度 + 读数 + 闪电开关；收起态只有档位名一个子元素。

**宿主半边**（`index.mjs`）
- `GET/POST /plugins/dsh-client-effort-slider/preferences`：皮肤偏好 + 客户端心跳（启动各阶段上报，用于"界面到底有没有出来"的判定）。
- `GET/PATCH /plugins/dsh-client-effort-slider/turbo`：闪电/Ultra 开关、车队 tok/s 快照、当前生效的策略正文。
- `inject.mjs` 走 **`agent/pre-step` 瀑布**把策略文本注入到当前这一步的模型请求，三条纪律：
  1. 先 `await next()`，在框架自己的决定之上追加，绝不吞掉别人的决定；
  2. **按会话 id 精确过滤** —— 子代理会继承父作用域，所以"按作用域注册"是错的，必须按 id；
  3. **文本没变就不注入** —— agent loop 会把这一步的消息逐条落盘，每步都注入会在历史里堆满重复条目。
- 状态存在 `<DSH_HOME>/storages/effort-slider.json`：`{ skin, sessions: { "<sessionId>": { lightning, ultra } } }`（最多保留 40 个会话）。

## 数据与隐私

- 只在本机读写上面那一个 JSON 文件；**不发起任何外部网络请求**（没有遥测、没有统计上报）。
- 策略文本只注入到**被跟踪的那一个会话**，并且只由这个插件的界面开关控制。

## 构建与测试

只需要 Node ≥ 22（运行时零依赖）。

```bash
node build.mjs              # 内嵌 CSS → lib/client.js，并做字节级一致性断言
npm test                    # 下列全部离线套件
node smoke-test.mjs         # 客户端：loader 包法、组件渲染、皮肤/边界回归
node test/host.test.mjs     # 宿主：端点、偏好文件、心跳、异常不逃逸
node test/turbo.test.mjs    # turbo 路由 + 策略注入（假 ctx 集成）
node test/metrics.test.mjs  # tok/s 计量（纯函数，含随机压力）
node test/fluid.test.mjs    # 流体引擎：密度/列覆盖/颜色语义/最高档提速
```

测试里的皮肤清单与默认皮肤都是从 `client.js` 源码里读出来的，不写死——皮肤下线或换默认值时测试跟着源码走。

## 目录结构

```
client.js            客户端半边（UI + 流体引擎 + Ultra/闪电/tok-s 交互）
effort-slider.css    全部样式（4 套皮肤的 CSS 都还在，含已下线的 nebula）
build.mjs            client.js + CSS → lib/client.js
lib/client.js        构建产物（已提交，装上即可用）
index.mjs            宿主半边（端点 + 心跳判定 + 接线，fail-open）
inject.mjs           策略注入（agent/pre-step）
policy.mjs           Ultra / 闪电两段英文策略正文
turbo.mjs            turbo 路由 + 会话状态 + 车队计量接线
metrics.mjs          纯函数式的 tok/s 统计
test/                离线测试
TURBO-CONTRACT.md    接口冻结单（档位模型、端点契约、注入纪律、实证）
```

## 已知限制

- **运行期标识仍是 `dsh-client-effort-slider`**：端点路径（`/plugins/dsh-client-effort-slider/...`）、根节点的 `data-effort-slider` 属性值和日志前缀都用这个名字，与仓库名 `dsh-effort-slider` 不同。它是历史 id，改它需要同步宿主装配配置，因此保留以兼容已安装的实例。
- 皮肤 `nebula` 已下线但代码保留；`DEFAULT_SKIN` 与皮肤白名单（`client.js`、`index.mjs` 各一份）必须同时改，测试会检查这一致性。
- Ultra 扫光在高 tok/s 时观感偏张扬；闪电的渐变流动依赖 CSS `@property`，不支持的宿主上会退化成静态渐变。
- 本仓库里的截图取自验证台（真实产物 + 真 React），界面外的灰色说明文字是测试台的标注，不是插件本身。

## English

**dsh-effort-slider** — a sci-fi reasoning-effort slider for DeepSeek Harness (DSH). It replaces the plain effort selector with an animated energy bar, and adds three things on top:

- **Ultra level** — a 6th stop above MAX: it pins the model's highest real effort level and injects an English *rigor contract* (define done first, evidence over claims, adversarial second pass, root cause first, explicit stop rule).
- **Lightning mode** (off by default) — injects an *orchestration contract*: the parent agent only plans, decomposes, dispatches, reviews and integrates, while subagents do the work; dispatch happens in parallel within a single message, child prompts must be self-contained, and children return pointers to artifacts instead of pasting their output back.
- **Fleet tok/s readout** — live token throughput of this session's subagents, shown as a full integer (no `k` shorthand).

The plugin ships a built `lib/client.js`, so it works right after installation (`dsh plugin add github:yuhub233/dsh-effort-slider`, DSH Desktop ≥ 2.0.9). It stores one JSON file locally and makes no network requests. Prompt-injection is scoped to a single session id, and the injected text is only re-sent when it actually changes.

MIT licensed. The prompt-engineering ideas borrow from Anthropic's public multi-agent writing and the community `superpowers` skill set (MIT); those skills are **not** bundled here.
