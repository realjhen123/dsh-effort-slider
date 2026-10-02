# Bundled skills

这四个 skill 是 **Ultra 模式 / 闪电模式**策略文本里点名要加载的 playbook。策略只写"不写就会做错"的短条款，
详细流程靠 skill 按需加载；仓库把它们**原样打包**，装上插件就有，不用再去别处找。

| skill | 策略里在哪用到 |
| --- | --- |
| `dispatching-parallel-agents` | 闪电模式：按边界正交拆分、一条消息并发派发、子代理 prompt 自包含 |
| `subagent-driven-development` | 闪电模式：一个任务一个全新实现者 + 任务级复查 + 收尾整体复查 |
| `verification-before-completion` | Ultra 模式：证据先于断言，不许没跑就宣称通过 |
| `systematic-debugging` | Ultra 模式：先定位根因再动手，不许拿改测试当修复 |

## 安装

DSH 从 `~/.dsh/skills/<name>/SKILL.md` 发现 skill。把本目录下的四个文件夹复制过去即可：

```powershell
Copy-Item -Recurse -Force .\skills\dispatching-parallel-agents,`
  .\skills\subagent-driven-development,`
  .\skills\verification-before-completion,`
  .\skills\systematic-debugging `
  "$env:USERPROFILE\.dsh\skills\"
```

Windows 上 `Copy-Item` 的路径分隔符用反斜杠；Linux/macOS 换成 `cp -r skills/{dispatching-parallel-agents,subagent-driven-development,verification-before-completion,systematic-debugging} ~/.dsh/skills/`。

装完在会话里用 `skill` 工具按名字加载（名字就是目录名）。**不装也能用**——策略文本里这些条款本身是自包含的，
skill 只是更细的 playbook；缺失时按策略正文做即可。

## 来源与许可

原样取自 [obra/superpowers](https://github.com/obra/superpowers)（MIT，Jesse Vincent / Prime Radiant），
pin 在 commit [`8ca22dba9a94f28898bbce59f2537ff4d87c747d`](https://github.com/obra/superpowers/tree/8ca22dba9a94f28898bbce59f2537ff4d87c747d)
（`main`，v6.3.0 之后），**逐字节未改**。许可证全文见同目录 `LICENSE-superpowers`。

几点适配说明，看的时候心里有数：

- 这些 skill 原本写给 Claude Code，正文里的 `bash scripts/review-package …` 这类调用假设 POSIX shell 与
  `git`；在 DSH / Windows 上跑，把脚本换成等价的原生命令即可，流程本身与工具无关。
- `superpowers:<name>` 是上游的 skill 命名空间语法，DSH 里按**裸名字**加载（如 `systematic-debugging`）。
- 它们提到的一些配套 skill（`requesting-code-review`、`test-driven-development`、`writing-plans` …）**没有**
  一并打包，用到时会缺；按需从上游取。
