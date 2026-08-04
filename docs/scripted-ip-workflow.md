# Scripted IP Workflow

这份文档说明本项目最重要的定制能力：当 Chat 输入中包含 `ip` 时，VS Code 内置聊天逻辑会进入一套固定的 IP 页面生成演示流程。后续 AI 维护这个项目时，应优先阅读本文，再修改相关源码。

## 核心入口

主要实现文件：

- `src/vs/workbench/contrib/chat/browser/chatSetup/chatSetupProviders.ts`

关键常量：

- `SCRIPTED_IP_WORKFLOW_KEYWORD = 'ip'`
- `SCRIPTED_IP_FEATURE_WORD = '功能'`
- `SCRIPTED_IP_WORKFLOW_DIR = 'vibe-demo'`
- `SCRIPTED_IP_WORKFLOW_FILE = 'index.html'`
- `SCRIPTED_IP_TEMPLATE_RELATIVE_PATH = 'resources/chat-templates/line-art-ip-product.html'`

触发判断逻辑：用户消息转成小写后，只要包含 `ip`，就会尝试启动 scripted IP workflow。如果当前没有打开工作区，则不会生成文件，只会提示无法创建目标页面。

## 用户流程

完整流程分为五个大阶段：

1. 用户输入包含 `ip` 的提示词。
2. 系统进行三轮 followup 问询，收集页面计划。
3. 用户确认计划后，系统输出第一版 `v1` 页面。
4. 用户输入两个修复关键词后，系统输出第二版 `v2` 修正版页面。
5. `v2` 完成后，用户输入精确关键词 `功能`，系统输出第三版 `v3` 功能增强版页面。

## 三轮问询

第一次问询：页面定位。

- `品牌提案型`
- `电商转化型`
- `发布展示型`

第二次问询：展示重心。

- `IP 形象优先`
- `产品卖点优先`
- `IP 与产品平衡`

第三次问询：生成节奏。

- `标准推进`
- `细节增强`
- `演示感渐进生成`

这些选项由以下数组维护：

- `SCRIPTED_IP_SCENARIO_OPTIONS`
- `SCRIPTED_IP_FOCUS_OPTIONS`
- `SCRIPTED_IP_PACE_OPTIONS`

用户完成三轮选择后，状态会进入 `awaitingConfirmation`。用户输入确认词后，才正式开始生成文件。

## 输出文件

确认后，系统会在工作区生成或更新 `vibe-demo` 目录。主要输出包括：

- `vibe-demo/index.html`
- `vibe-demo/styles.css`
- `vibe-demo/app.js`
- `vibe-demo/README.md`
- `vibe-demo/data/plan.json`
- `vibe-demo/assets/asset-notes.md`

此外，代码当前会使用外部 fixtures 根目录：

- `D:/vibe-demo/fixtures/current/manifest.json`

注意：本便携项目目录内也存在一份 `vibe-demo/fixtures/current/manifest.json`。如果后续修改资源路径，需要先确认到底应使用项目内 fixtures，还是继续使用 `D:/vibe-demo/fixtures` 这个外部目录。

## v1：初版演示

首次生成时，workflow 版本是 `v1`。状态初始化时会标记两个已知问题：

```ts
workflowVersion: 'v1',
knownIssues: {
	uiOverflow: true,
	imageOversize: true
}
```

`v1` 的作用是演示一段真实的 AI 编程迭代：

- 先根据 plan 输出一个可运行页面。
- 页面存在已知上传区 UI 布局问题。
- 图片上传策略也不完整，未自动压缩到目标限制。
- 生成完成后进入等待用户修复反馈状态。

生成完成时只有 `v1` 会设置：

```ts
state.awaitingFixes = state.workflowVersion === 'v1';
```

## v1 到 v2：修复关键词

`v1` 完成后，如果用户继续输入指定关键词，系统会记录修复请求。

UI 修复关键词：

- `修复ui`
- `修复UI`

图片修复关键词：

- 包含 `4mb`
- `优化图片上传策略：自动压缩到长边 1536 以内，并控制在 4MB 内`
- `图片自动压缩到1536和4m以内`
- `凡事上传的图片都需要被你自动压缩到长边为1536以下，然后再压缩到4M以内`

重要细节：不是任意一个关键词就立刻输出 `v2`。系统必须同时收到 UI 修复请求和图片修复请求。

```ts
sessionState.readyForSecondVersion = sessionState.fixRequests.uiOverflow && sessionState.fixRequests.imageCompression;
```

如果只收到其中一个，系统只会提示已记录该项，等待另一个修复要求。

## v2：修正版输出

当两个修复请求都满足后，状态切换为 `v2`，随后重新执行 `runScriptedWorkflow(...)`，输出修正版页面。

`v2` 只保留两类修复能力：

- 上传区 UI 布局修复。
- 图片自动预处理：压缩到长边 `1536` 以内，并控制在 `4 * 1024 * 1024` 字节以内。

`v2` 不包含 IP 风格选择窗口，也不记录 `state.ipStylePreferences` 或 `state.ipStyleCustom`。用户在 `v2` 点击 `生成 4 个 IP 方案` 时，应直接进入现有图片压缩校验和 IP 生成流程。

如果目标文件已存在，`v2` 会优先走 patch 流程：

- CSS 中替换上传区布局相关 marked region。
- JS 中替换上传预处理相关 marked region。
- 更新 `plan.json`、`README.md`、fixtures manifest 和 assets notes。

关键函数：

- `createScriptedWorkflowCss(...)`
- `createScriptedWorkflowV2UploadScript()`
- `applyScriptedWorkflowRevisionPatch(...)`
- `applyScriptedWorkflowSafeMarkedPatch(...)`

## v2 到 v3：功能关键词

`v2` 完成后，系统进入 `done` 状态。此时如果用户输入精确关键词 `功能`，状态会切换为 `v3`：

```ts
sessionState.workflowVersion = 'v3';
sessionState.phase = 'scoping';
```

`功能` 是精确触发词。消息会先经过 `normalizeScriptedWorkflowMessage(...)` 归一化，只有归一化后等于 `功能` 才触发升级，避免普通句子误触发。

## v3：功能增强版输出

`v3` 完全复制 `v2` 的修正版能力，并额外增加 IP 风格选择窗口。

`v3` 保留：

- 上传区 UI 布局修复。
- 图片自动预处理。
- fixture 揭示、IP 卡片标题描述、真实生图 prompt 等既有逻辑。

`v3` 新增：

- 用户点击 `生成 4 个 IP 方案` 后，先打开 `选择 IP 生成风格` 弹窗。
- 弹窗包含三组配置：颜色、风格、背景。
- 每组都有更多固定选项，并提供一条自定义输入框。
- 默认值是 `天青碧影`、`3D 手办质感`、`纯白背景`。
- 用户点击固定选项时，选择结果保存到 `state.ipStylePreferences`。
- 用户填写自定义输入时，自定义内容保存到 `state.ipStyleCustom`，并覆盖对应的 `state.ipStylePreferences`。
- 用户点击 `确认生成` 后，弹窗关闭，然后继续执行原有 IP 生成流程。
- 用户点击关闭或取消时只关闭弹窗，不触发生成。
- 再次打开弹窗时保留上一次选择。
- v3 脚本会通过 `ensureIpStyleDialogCss()` 注入运行时兜底 CSS，确保已有页面的 `styles.css` 没有成功 patch 时，弹窗也不会退回浏览器默认样式。

注意：这个窗口当前只做 UI 演示和状态记录，不会改写 `buildIpImagePrompt()`，不会影响 `generateImage(...)` 入参，也不会改变 fixture 揭示、IP 卡片标题或描述。

## 安全校验

JS patch 有额外安全校验，防止把损坏的代码片段写入 `app.js`。校验函数是：

- `isValidScriptedWorkflowUploadRegion(...)`

基础校验适用于 `v2` 和 `v3`，要求存在：

- `const maxEdge = 1536;`
- `const maxBytes = 4 * 1024 * 1024;`
- `const processed = await preprocessImage(file);`

当检测到 v3 弹窗脚本时，还会额外要求：

- `const defaultIpStylePreferences = { color: "天青碧影", style: "3D 手办质感", background: "纯白背景" };`
- `const defaultIpStyleCustom = { color: "", style: "", background: "" };`
- `function ensureIpStyleDialogCss()`
- `function createIpStyleDialog()`
- `openIpStyleDialog();`

同时拒绝一些已知损坏片段，例如：

- `const axxEdEd = 1536;`
- `blobToDlbaUrlTblobataUrl`
- `apyCmpressePreviw`

如果校验失败，会抛出错误并拒绝写入。

## 后续维护注意事项

- 这套流程是硬编码演示流程，不是通用聊天逻辑。
- 不要轻易改动 `SCRIPTED_IP_WORKFLOW_KEYWORD`，否则会改变触发入口。
- 不要把 `v1` 的已知问题直接删掉，除非明确要取消“先出 bug 再修复”的演示设计。
- 修改三轮问询时，要同步检查 `tryApplyScriptedWorkflowPlanSelection(...)` 和 `provideFollowups(...)`。
- 修改输出文件结构时，要同步检查 `createScriptedWorkflowTreeData(...)`、`areScriptedWorkflowProjectFilesUpToDate(...)` 和 `writeScriptedWorkflowProjectFiles(...)`。
- 修改 v2/v3 上传 JS 时，要同步更新 `isValidScriptedWorkflowUploadRegion(...)` 的 required snippets。
- 修改 v3 风格选择窗口时，要保持它只记录 `state.ipStylePreferences`，除非明确要让它影响真实生图 prompt。
- 修改 fixtures 路径前，先决定使用项目内 `vibe-demo/fixtures/current`，还是外部 `D:/vibe-demo/fixtures/current`。
