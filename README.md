# dsh-effort-slider

**简体中文** | [English](README.en.md)

> 给 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)（DSH）做的**科幻风推理档位滑条**。
> 输入框里是一枚发光核心，点开是一条悬浮能量条：点刻度、拖拽、方向键都能切换模型的推理档位。

<p align="center"><img src="docs/images/panel-ultra.png" alt="推理档位面板" width="620"></p>

---

## 这是什么

DSH 默认用一个下拉框切换推理档位。这个插件把它换成一条**能量滑条**——档位由刻度标出，每一档都有对应的视觉反馈（轨道流光、星痕、白炽核心）。档位名和档数都跟着当前模型的真实 `reasoningEffort` 列表走；模型没有推理档位时，控件自动隐身。

它只做一件事：**切换推理档位**。写回的是模型目录里真实存在的档位 id，不注入 prompt、不注册宿主路由、不读取会话历史。

| 能力 | 说明 |
| --- | --- |
| **档位滑条** | 点刻度 / 拖拽 / 方向键切换；写回模型真实的 `reasoningEffort`；提交失败回滚并提示 |
| **Ultra 档** | 最高档之上追加的一格。选中它会把推理档位钉在该模型的**最高真实档（MAX）** |
| **三套皮肤** | `holo`（全息）/ `chrome`（液态金属）/ `fluid`（流体，默认，带粒子引擎） |
| **闪电按钮** | 面板右上角的装饰按钮：只切换自己的亮/灭外观，**没有任何实际效果** |

## 截图

| | |
| --- | --- |
| ![档位面板](docs/images/panel-ultra.png) | ![皮肤](docs/images/skins.png) |
| 展开态：轨道 + 刻度 + 读数 | 皮肤切换 |

## 功能细节

### 档位切换
- 展示档位 = 模型目录里真实可用的档位 **+ 追加的一格 `Ultra`**。
- 选中 Ultra 时，写回模型目录的**仍是最高真实档（MAX）**的 id —— `Ultra` 本身从不出现在模型目录里。
- 不变量：**只要界面停在 Ultra，实际推理档位就一定是 MAX**。拖拽松手 / 点刻度 / 方向键三条入口走同一个写入口。
- 提交失败会回滚到上一次已提交档位，并在面板描述行与收起态 tooltip 里给出同一句提示。
- 一次提交若 10 秒内没有落地，滑条结束等待（**不取消宿主操作**）；宿主稍后成功时以真实目录状态为准。
- 界面文案**全英文**：档位名优先用模型目录里的原文，但只接受纯 ASCII，否则回退到内置英文梯子（`Low / Medium / High / Very High / Max / Full`）。

### Ultra 档
- 第 6 格（真实档位之后那一格）。它只是展示层的一格，不是模型拥有的档位。
- 点它 / 拖到最右再松手 / 用方向键走到它，效果都是：把推理档位写到 MAX。
- 档位名是 **`Ultra`**（不是全大写 `ULTRA`）。

### 闪电按钮（纯装饰）
- 面板右上角保留了一颗闪电按钮（内联 SVG 描边）。
- 点击**只会**切换它自己的亮/灭外观：不调用任何宿主端点、不注入 prompt、不影响推理档位。
- `aria-label` / `title` 里明确写着 decorative。

### 皮肤
- `holo`：全息能量；`chrome`：液态金属；`fluid`：流体（**默认**，带粒子流体引擎 + 最高档星痕）。
- `nebula`（星际星云）**已下线**：代码里只是把它从皮肤数组注释掉，`SKIN_LABELS` 与整套 CSS 规则都保留。想恢复就把 `client.js` 里的 `"nebula"` 放回数组、并按需调整 `DEFAULT_SKIN`。
- 皮肤偏好同时缓存在宿主偏好文件和浏览器 `localStorage`，刷新后保持。

## 安装

需要 **DSH Desktop ≥ 2.0.9**。仓库里自带构建好的 `lib/client.js`，装上即可用，**不需要自己构建**。

```bash
# 从 GitHub 装（本仓库的 fork）
dsh plugin add github:realjhen123/dsh-effort-slider
```

手动安装：把仓库目录复制到 `<DSH_HOME>/plugins/`（Windows 默认 `C:\Users\<你>\.dsh\plugins\`），然后重启 DSH。插件自带的 `cordis.patch.yml` 会被 profile 的 bundle 机制自动加载。

卸载：删掉那个目录（若你在 profile 的 `dsh.profile.bundles` 里登记过，一并删掉那行），重启 DSH。

## 怎么用

- **展开 / 收起**：点输入框里那枚核心。点面板外面或按 `Esc` 收起。
- **切档**：点刻度、拖拽珠子、或用 `←` `→`（`↑` `↓` 同义）。
- **换皮肤**：面板底部的三个皮肤按钮。

## 怎么实现的

客户端 + 宿主两半。

**客户端**（`client.js` + `effort-slider.css`）
- 通过 `window.__ModuleLoader__.load({ id, factory })` 注册，React 从 `require('react')` 取（peer dependency，不打包）。
- 注册进输入框工具行的插槽 `conversation.input.right`。
- 档位数据直接读写宿主真实的模型目录 store：`ctx.modelDirectories.directoryFor(sessionId).store`，写 `reasoningEffort`。
- 源文件不能直接被宿主读：`node build.mjs` 会把 CSS 内嵌进 `lib/client.js`，并断言内嵌 CSS 与 `effort-slider.css` **逐字节一致**。
- 任何渲染异常都被错误边界挡在控件内部：控件自己隐身，绝不冒泡拖垮宿主界面。

**宿主**（`index.mjs`）
- `GET/POST /plugins/dsh-effort-slider/preferences`：读/写皮肤偏好 + 接收客户端启动心跳。
- 心跳按阶段（`apply → resolveReact → slotRegistered → inject → mount`）上报，用于判断"控件到底有没有出来"；判定只在确实观测到时才下结论，失败上报不会被当成成功。
- 偏好文件：`<DSH_HOME>/storages/effort-slider.json`，内容 `{ skin }`；写入走"读-改-写 + 唯一临时文件 + 原子 rename"。
- 整个 `apply()` 都包在兜底里：宿主半边出问题只会让功能降级，绝不阻止插件树加载。

## 数据与隐私

- 只在本机读写那一个 JSON 偏好文件（外加浏览器 `localStorage` 里的一份皮肤缓存）。
- **不发起任何外部网络请求**，没有遥测、没有统计上报。
- **不注入 prompt、不读取会话历史、不注册额外路由**。

## 构建与测试

只需要 Node ≥ 22（运行时零依赖）。

```bash
node build.mjs              # 内嵌 CSS → lib/client.js，并做字节级一致性 + 产物形状断言
npm test                    # 跑下面全部离线套件
node smoke-test.mjs         # 客户端：loader 包法、组件渲染、皮肤与边界回归
node test/host.test.mjs     # 宿主：偏好端点、偏好文件、心跳判定、异常不逃逸
node test/fluid.test.mjs    # 流体引擎：粒子密度 / 列覆盖 / 颜色语义 / 最高档提速
node test/client-lifecycle.test.mjs # 客户端：档位提交、超时回滚、会话切换、装饰按钮
```

测试里的皮肤清单与默认皮肤都是从 `client.js` 源码里读出来的，不写死 —— 皮肤下线或换默认值时测试跟着源码走。

## 目录结构

```
client.js            客户端：UI + 流体引擎 + 档位读写 + 装饰闪电按钮
effort-slider.css    全部样式（含已下线的 nebula）
build.mjs            client.js + CSS → lib/client.js
lib/client.js        构建产物（已提交，装上即可用）
index.mjs            宿主：偏好端点 + 心跳判定（fail-open）
cordis.patch.yml     插件装载声明
test/                离线测试
preview/             流体皮肤的预览页
skills/              上游 superpowers skill 的打包副本（与插件运行无关，可删）
docs/images/         README 截图
THIRD-PARTY.md       第三方出处与许可
```

## 已知限制

- 插件文件更新后，需要宿主下次正常加载才会采用新代码；正在运行的进程仍使用已加载的版本。
- **包名 = 运行期标识**：`dsh-effort-slider` 同时是 npm 包名、客户端 bundle 的注册 id（`WebBootEntry.id`）、端点前缀（`/plugins/dsh-effort-slider/...`）和 `data-effort-slider` 属性值。改这个名字要**四处同步**：`package.json` 的 `name`、`cordis.patch.yml` 的 `name`、profile 的 `dsh.profile.bundles` 条目、以及 `profiles/<profile>/node_modules` 下指向插件目录的 junction。任何一处不同步，DSH 会在 profile 装配阶段抛 `package identity is invalid for <name>` 起不来。
- 皮肤 `nebula` 已下线但代码保留；`DEFAULT_SKIN` 与皮肤白名单（`client.js`、`index.mjs` 各一份）必须同时改，测试会检查这一致性。
- 闪电按钮高亮时的发光动画依赖 CSS `@property`；不支持的宿主上会退化成静态渐变。
- 本仓库截图取自验证台（真实产物 + 真 React），界面外的灰色说明文字是测试台标注，不是插件本身。

## 出处与致谢

插件的**代码**是自己写的。第三方来源与许可见 [`THIRD-PARTY.md`](THIRD-PARTY.md)：React（peer dependency）、Feather Icons 的 `zap` 轮廓（装饰闪电按钮的路径字符串）、以及 `skills/` 里可选的上游 playbook。

本插件**零运行时依赖**、不联网、无遥测。
