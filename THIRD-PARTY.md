# 出处与致谢 / Third-Party Notices

这个插件的**代码**是自己写的。这份文件把"用了什么、从哪来、什么许可、用在哪"逐条写清楚。

> 历史说明：早期版本的「Ultra / 闪电策略注入」子系统（`policy.mjs` / `inject.mjs` / `turbo.mjs` / `metrics.mjs`）
> 与它的闪电 SVG 图标**已整体移除**。下面只列当前代码仍在用的第三方内容。

---

## 一、代码 / 资产复用（有许可证，必须署名）

| 来源 | 许可证 | 用在哪 | 是否随本仓库分发 |
| --- | --- | --- | --- |
| [React](https://github.com/facebook/react) | MIT | 客户端半边的 UI 由 React 渲染 | **不打包**。通过宿主的模块加载器 `require('react')` 取，是 peer dependency |
| [Feather Icons](https://github.com/feathericons/feather) 的 `zap` 轮廓<br>`M13 2 L3 14 h9 l-1 8 10-12 h-9 l1-8 z` | MIT | 面板右上角那颗**纯装饰**闪电按钮的 SVG 路径（`client.js` 的 `BOLT_PATH`） | 只有那一行路径字符串，**不含** Feather 的源码或字体 |
| [obra/superpowers](https://github.com/obra/superpowers) 的四个 skill：`dispatching-parallel-agents` / `subagent-driven-development` / `verification-before-completion` / `systematic-debugging` | MIT | **与插件运行无关**：作为可选 playbook 原样留在 `skills/` 目录里 | **原样打包**在 `skills/`（21 个文件，逐字节未改）。pin 在 commit [`8ca22dba…`](https://github.com/obra/superpowers/tree/8ca22dba9a94f28898bbce59f2537ff4d87c747d)；许可证全文见 `skills/LICENSE-superpowers` |

> Feather Icons：Copyright (c) 2013-2023 Cole Bemis。
> React：Copyright (c) Meta Platforms, Inc. and affiliates。
> Superpowers：Copyright (c) Jesse Vincent / Prime Radiant，MIT。

## 二、运行时依赖

本插件**零运行时依赖**（`package.json` 没有 `dependencies`）：宿主半边只用 Node 内置模块，客户端半边只用宿主注入的模块加载器与 React。
不发起任何外部网络请求，也没有遥测。

## 三、如果你的成果出现在这里但你希望被移除

开 issue 即可，会立刻改署名或删掉对应引用。

---

## English

The plugin's **code** is original. Two third-party assets are used: React (MIT) is a peer dependency fetched from the host's module loader rather than bundled; the decorative lightning button uses the [Feather Icons](https://github.com/feathericons/feather) `zap` outline (MIT, just the path string); and four [obra/superpowers](https://github.com/obra/superpowers) skills (MIT) are bundled verbatim under `skills/` as optional playbooks unrelated to the plugin's runtime — the full MIT text ships as `skills/LICENSE-superpowers`.

> The earlier "Ultra / Lightning policy injection" subsystem (`policy.mjs` / `inject.mjs` / `turbo.mjs` / `metrics.mjs`) was removed entirely. The lightning button is now **purely decorative**: it only flips its own lit/unlit look and has no effect.

**No runtime dependencies**, no outbound network requests, no telemetry.
