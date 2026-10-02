# 出处与致谢 / Third-Party Notices

这个插件的**代码**几乎全是自己写的，但它的**交互设计与提示词策略**明确建立在若干公开成果之上。
这份文件把"用了什么、从哪来、什么许可、用在哪"逐条写清楚，免得含糊。

---

## 一、代码 / 资产复用（有许可证，必须署名）

| 来源 | 许可证 | 用在哪 | 是否随本仓库分发 |
| --- | --- | --- | --- |
| [Feather Icons](https://github.com/feathericons/feather) 的 `zap` 轮廓<br>`M13 2 L3 14 h9 l-1 8 10-12 h-9 l1-8 z` | MIT | 闪电开关按钮的 SVG 路径（`client.js` 的 `BOLT_PATH`）；描边/渐变/电流包都是在这条路径上做的 | 只有那一行路径字符串，**不含** Feather 的源码或字体 |
| [React](https://github.com/facebook/react) | MIT | 客户端半边的 UI 由 React 渲染 | **不打包**。通过宿主的模块加载器 `require('react')` 取，是 peer dependency |

> Feather Icons：Copyright (c) 2013-2023 Cole Bemis。
> React：Copyright (c) Meta Platforms, Inc. and affiliates。

## 二、提示词 / 设计参考（文章与社区实践，非代码）

| 来源 | 用在哪 |
| --- | --- |
| [obra/superpowers](https://github.com/obra/superpowers)（MIT）<br>四个 skill：`dispatching-parallel-agents`、`subagent-driven-development`、`verification-before-completion`、`systematic-debugging` | **闪电模式**的派活与集成纪律（先切边界再派、子代理自包含、产物回传指针）；**Ultra 档**的证据与根因纪律（先定义"做完"、证据先于断言、对抗式复查、先定位根因） |
| [How we built our multi-agent research system](https://www.anthropic.com/engineering/multi-agent-research-system)，Anthropic（2025-06-13） | 委派契约的四要素（目标 / 产出格式 / 工具与来源 / 任务边界）、按复杂度分档的规模阶梯、"多智能体约 15× token"这条成本事实、"子代理把产物写进文件、只回传引用"这条反电话游戏的做法 |
| 社区对 Claude Code 档位设置的整理（详见 `TURBO-CONTRACT.md` §7） | "**effort 与 orchestration 是两个正交的控制**"这一分档依据——正因为正交，Ultra 与闪电才是两个开关而不是一个等级 |
| 本机另一个 DSH 插件 `gpt6-delegation` 的实战经验 | "卡住时问一个不同模型的第二意见"这条兜底（写进 Ultra 第 8 条）；**未**采用它的对拍 SOP，原因记在 `policy.mjs` 顶部注释 |

**没有打包任何第三方代码**：上表提到的 skill 一个都没有随仓库分发（它们是 Claude Code 生态的 skill，DSH 上不保证存在），本仓库也不含它们的源码。相关能力不存在时，策略文本要求模型**直接跳过**。

## 三、运行时依赖

本插件**零运行时依赖**（`package.json` 没有 `dependencies`）：宿主半边只用 Node 内置模块，客户端半边只用宿主注入的模块加载器与 React。
不发起任何外部网络请求，也没有遥测。

## 四、如果你的成果出现在这里但你希望被移除

开 issue 即可，会立刻改署名或删掉对应引用。

---

## English

The plugin's **code** is original; its **interaction design and prompt strategies** build on public work, credited above. Two assets are reused under licence: the lightning-bolt outline is [Feather Icons](https://github.com/feathericons/feather) `zap` (MIT), and React (MIT) is a peer dependency fetched from the host's module loader rather than bundled. The prompt engineering draws on [obra/superpowers](https://github.com/obra/superpowers) (MIT) and Anthropic's [multi-agent research system post](https://www.anthropic.com/engineering/multi-agent-research-system).

**No third-party source code is bundled**, and there are no runtime dependencies.
