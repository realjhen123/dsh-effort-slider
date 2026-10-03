# dsh-effort-slider

**简体中文** | [English](README.en.md)

> 给 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)（DSH）用的**科幻风推理等级滑条**：输入框里一枚发光核心，点开是一条悬浮能量滑条，点 / 拖 / 方向键切换模型的推理档位。

<p align="center"><img src="docs/images/panel-ultra.png" alt="推理档位面板" width="620"></p>

---

## 这是什么

DSH 的推理等级默认是一个下拉选择。这个插件把它换成一条**能量滑条**：档位用刻度标出，可以点、可以拖、可以用方向键；每个档位都有对应的视觉反馈（流光、星痕、白炽核心）。档位名称与档数都跟着当前模型的推理档位走，模型没有推理档位时整个控件自动隐身。

它**只做一件事**：切换推理档位（写回模型目录里真实的 `reasoningEffort`）。在最高档之上还有一格 **Ultra**，选中时把推理等级钉在该模型的最高真实档（MAX）。

> ⚠️ 早期版本还带过「Ultra / 闪电策略注入」与「子代理 tok/s 读数」——那些功能会往会话里注入 prompt。**它们已整体移除**：本插件现在不注入任何内容、不注册任何宿主路由、不读取任何会话历史，只是一个纯 UI 的档位滑条。

## 截图

| | |
| --- | --- |
| ![面板](docs/images/panel-ultra.png) | ![皮肤](docs/images/skins.png) |
| 展开面板：轨道 + 刻度 + 读数 | 皮肤 `holo` / `chrome` / `fluid`（默认 fluid） |

## 功能细节

### 档位与 Ultra
- 展示档位 = 模型真实可用的档位 **+ 追加的一格 `Ultra`**；选中 Ultra 时写回模型目录的**仍是最高真实档（MAX）**的 id —— `Ultra` 从不出现在模型目录里。
- 不变量：**只要界面停在 Ultra，实际推理等级就一定是 MAX**（拖拽松手 / 点刻度 / 方向键三条入口都走同一个写入口）。
- 档位名是 **`Ultra`**，不是全大写 `ULTRA`。
- 提交失败会回滚到上一次已提交档位并提示；一次提交在 10 秒内没有落地就结束等待（不取消宿主操作），宿主稍后若成功仍以真实目录状态为准。

### 闪电按钮（纯装饰）
- 面板右上角保留了一颗闪电按钮：点击只会切换它自己的亮/灭外观，**不调用任何宿主端点、不注入 prompt、不影响推理档位**。
- 留它是为了界面的完整感；`aria-label` 里明确写着 decorative。

### 皮肤
- `holo`（全息能量）、`chrome`（液态金属）、`fluid`（流体，**默认**，带粒子流体引擎 + 最高档星痕）。
- `nebula`（星际星云）**已按作者要求下线**：代码里只是把它从皮肤数组注释掉，`SKIN_LABELS` 与整套 CSS 规则都还在，想恢复就把数组里的 `"nebula"` 放回并调整 `DEFAULT_SKIN`。

## 安装

需要 **DSH Desktop ≥ 2.0.9**。仓库里自带构建好的 `lib/client.js`，装上即可用，**不需要自己构建**。

```bash
# 推荐：直接从 GitHub 装
dsh plugin add github:realjhen123/dsh-effort-slider
```

手动安装：把仓库目录复制到 `<DSH_HOME>/plugins/`（Windows 默认 `C:\Users\<你>\.dsh\plugins\`），然后重启 DSH。插件自带的 `cordis.patch.yml` 会被 profile 的 bundle 机制自动加载。

卸载：删掉那个目录（若你在 profile 的 `dsh.profile.bundles` 里登记过，一并删掉那行），重启 DSH。

## 怎么实现的

两半结构。

**客户端半边**（`client.js` + `effort-slider.css`）
- 通过 `window.__ModuleLoader__.load({ id, factory })` 注册，React 用 `require('react')` 取；注册进输入框工具行（`conversation.input.right`）。
- 源文件不能直接被宿主读：`node build.mjs` 会把 CSS 内嵌进 `lib/client.js`，并断言"内嵌的 CSS 与 `effort-slider.css` 逐字节一致"。
- 读档 / 写档都走宿主真实的模型目录 store（`ctx.modelDirectories.directoryFor(sessionId)`），写的是 `reasoningEffort`。

**宿主半边**（`index.mjs`）
- `GET/POST /plugins/dsh-effort-slider/preferences`：皮肤偏好 + 客户端心跳（启动各阶段上报，用于"界面到底有没有出来"的判定）。
- 偏好存在 `<DSH_HOME>/storages/effort-slider.json`：`{ skin }`。

## 数据与隐私

- 只在本机读写上面那一个 JSON 文件；**不发起任何外部网络请求**（没有遥测、没有统计上报）。
- 不注入 prompt、不读取会话历史。

## 构建与测试

只需要 Node ≥ 22（运行时零依赖）。

```bash
node build.mjs              # 内嵌 CSS → lib/client.js，并做字节级一致性断言
npm test                    # 下列全部离线套件
node smoke-test.mjs         # 客户端：loader 包法、组件渲染、皮肤/边界回归
node test/host.test.mjs     # 宿主：端点、偏好文件、心跳、异常不逃逸
node test/fluid.test.mjs    # 流体引擎：密度/列覆盖/颜色语义/最高档提速
node test/client-lifecycle.test.mjs # 客户端：档位提交、超时回滚、会话切换
```

测试里的皮肤清单与默认皮肤都是从 `client.js` 源码里读出来的，不写死——皮肤下线或换默认值时测试跟着源码走。

## 目录结构

```
client.js            客户端半边（UI + 流体引擎 + 档位读写）
effort-slider.css    全部样式（4 套皮肤的 CSS 都还在，含已下线的 nebula）
build.mjs            client.js + CSS → lib/client.js
lib/client.js        构建产物（已提交，装上即可用）
index.mjs            宿主半边（偏好端点 + 心跳判定，fail-open）
test/                离线测试
skills/              上游 superpowers skill 的打包副本（与插件运行无关，可删）
THIRD-PARTY.md       出处与致谢
```

## 已知限制

- 插件文件更新后，需要宿主下次正常加载才会采用新代码，正在运行的进程仍使用原版本。
- **包名 = 运行期标识**：`dsh-effort-slider` 同时是 npm 包名、客户端 bundle 的注册 id（`WebBootEntry.id`）、端点前缀（`/plugins/dsh-effort-slider/...`）和 `data-effort-slider` 属性值。**改这个名字要四处同步**：`package.json` 的 `name`、插件自带 `cordis.patch.yml` 的 `name`、profile 的 `dsh.profile.bundles` 条目、以及 `profiles/<profile>/node_modules` 下指向插件目录的 junction。任何一处不同步，DSH 会在 profile 装配阶段直接抛 `package identity is invalid for <name>` 起不来（这是本项目真实踩过的坑）。
- 皮肤 `nebula` 已下线但代码保留；`DEFAULT_SKIN` 与皮肤白名单（`client.js`、`index.mjs` 各一份）必须同时改，测试会检查这一致性。
- 本仓库里的截图取自验证台（真实产物 + 真 React），界面外的灰色说明文字是测试台的标注，不是插件本身。

## 出处与致谢

插件的**代码**是自己写的。第三方来源与许可见 [`THIRD-PARTY.md`](THIRD-PARTY.md)。

本插件**零运行时依赖**、不联网、无遥测。
