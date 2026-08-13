# Scripted IP Workflow

This note documents the fixed `ip` workflow in this checkout and the main places to edit it later.

## What Triggers It

The workflow is implemented in:

- `src/vs/workbench/contrib/chat/browser/chatSetup/chatSetupProviders.ts`

The trigger keyword is:

```ts
const SCRIPTED_IP_WORKFLOW_KEYWORD = 'ip';
```

Any chat message whose lowercase text contains `ip` enters this scripted flow:

```ts
message.toLowerCase().includes(SCRIPTED_IP_WORKFLOW_KEYWORD)
```

If no workspace folder is open, the flow stops with the warning that it cannot create the target page files.

## Fixed Output Paths

Generated page project:

- Workspace output directory: `vibe-demo`
- Entry file: `vibe-demo/index.html`
- Style file: `vibe-demo/styles.css`
- Script file: `vibe-demo/app.js`
- Generated README: `vibe-demo/README.md`
- Plan snapshot: `vibe-demo/data/plan.json`
- V3 knowledge snapshot: `vibe-demo/data/knowledge-base.json`
- Asset notes: `vibe-demo/assets/asset-notes.md`

Fixed external fixture directory:

- Fixture root: `D:/vibe-demo/fixtures`
- Current fixture directory: `D:/vibe-demo/fixtures/current`
- Manifest file: `D:/vibe-demo/fixtures/current/manifest.json`

This directory is a read-only input to the scripted workflow. The provider validates the existing manifest and every referenced image before it generates or revises the page. It never creates, clears, rewrites, or repairs files under this directory.

The generated page reads fixture data through this browser path:

```js
/external-fixtures/current/manifest.json
```

The template source is:

- `resources/chat-templates/line-art-ip-product.html`

The generated page title in that template is:

- `BrandVision AI 绘图智能体`

## Current User Flow

1. User sends a message containing `ip`.
2. The provider enters the scripted IP planning flow.
3. The user chooses a page positioning option:
   - `品牌提案型`
   - `电商转化型`
   - `发布展示型`
4. The user chooses a display focus option:
   - `IP 形象优先`
   - `产品卖点优先`
   - `IP 与产品平衡`
5. The user chooses a generation pace option:
   - `标准推进`
   - `细节增强`
   - `演示感渐进生成`
6. The user confirms with a message such as:
   - `可以`
   - `继续`
   - `开始`
   - `开始做`
   - `按这个来`
   - `确认`
   - `没问题`
   - `就这样`
   - `开始创建`
   - `按这个计划开始`
7. The provider reads and validates `D:/vibe-demo/fixtures/current/manifest.json` and its referenced images.
8. The provider creates or updates `vibe-demo`.
9. The provider reads `resources/chat-templates/line-art-ip-product.html`.
10. The template is split into page sections and rewritten into:
   - `index.html`
   - `styles.css`
   - `app.js`
   - `README.md`
   - `data/plan.json`
   - `assets/asset-notes.md`
11. The provider opens `vibe-demo/index.html`.
12. The provider validates the generated state and reports completion.
13. After V1 completes, the follow-up can create:
   - `vibe-demo/start-preview.bat`
   - `vibe-demo/preview_server.py`

## Generated Page Flow

The template page is a four-stage single-page tool:

1. `uploadSection`: upload hand-drawn IP and product image, save API config, generate 4 IP options.
2. `ipSection`: select one IP option, then generate 4 poster text/prompt options.
3. `posterSection`: select or edit poster options, then generate 5 final images.
4. `finalSection`: select finals and export an asset package.

Important template sections and IDs:

- `uploadSection`
- `ipSection`
- `posterSection`
- `finalSection`
- `confirmUpload`
- `confirmIp`
- `confirmPoster`
- `exportBtn`
- `resetAll`

## V1, V2, and V3 Behavior

The workflow starts as V1:

```ts
workflowVersion: 'v1'
```

After V1 is done, it waits for two kinds of fix requests:

1. UI/layout request:
   - `修复`
2. Image upload/compression request:
   - `优化图片上传策略：自动压缩到长边 1536 以内，并控制在 4MB 内`
   - `图片自动压缩到1536和4m以内`
   - `凡事上传的图片都需要被你自动压缩到长边为1536以下，然后再压缩到4M以内`

Only after both requests are recorded does it switch to V2:

```ts
sessionState.workflowVersion = 'v2';
```

V2 revises the same `vibe-demo/index.html`, `styles.css`, and `app.js`. It does not create a separate V2 HTML file.

After V2 completes, a chat message containing `知识库` switches the same session to V3. V1 cannot skip directly to V3.

V3 keeps the V2 upload compression and layout fixes, then adds:

- a top-bar `知识库` button with three read-only summary categories;
- `vibe-demo/data/knowledge-base.json`, copied from the bundled brand/compliance snapshot;
- knowledge-base progress presentation while poster prompts and final images continue to come directly from the fixed fixture manifest;
- 10-second progress animations for poster prompt generation and final image generation;
- the required progress message `正在读取知识库并调整生成效果`.

The bundled source snapshot is:

- `resources/chat-templates/orange-leaf-knowledge-base.json`

V3 revises the same `vibe-demo/index.html`, `styles.css`, and `app.js`; it does not create a separate V3 HTML file. Repeating `知识库` while already on V3 reports that the knowledge base is already connected and does not run another revision.

## Where To Modify Common Things

### Change Trigger Keyword

Edit:

```ts
const SCRIPTED_IP_WORKFLOW_KEYWORD = 'ip';
```

File:

- `src/vs/workbench/contrib/chat/browser/chatSetup/chatSetupProviders.ts`

### Change Output Directory Or File Names

Edit these constants:

```ts
const SCRIPTED_IP_WORKFLOW_DIR = 'vibe-demo';
const SCRIPTED_IP_WORKFLOW_FILE = 'index.html';
const SCRIPTED_IP_WORKFLOW_STYLE_FILE = 'styles.css';
const SCRIPTED_IP_WORKFLOW_SCRIPT_FILE = 'app.js';
const SCRIPTED_IP_WORKFLOW_README_FILE = 'README.md';
const SCRIPTED_IP_WORKFLOW_DATA_DIR = 'data';
const SCRIPTED_IP_WORKFLOW_PLAN_FILE = 'plan.json';
const SCRIPTED_IP_WORKFLOW_KNOWLEDGE_BASE_FILE = 'knowledge-base.json';
const SCRIPTED_IP_WORKFLOW_ASSETS_DIR = 'assets';
const SCRIPTED_IP_WORKFLOW_ASSET_NOTES_FILE = 'asset-notes.md';
```

### Change Fixed Fixture Directory

Edit:

```ts
const SCRIPTED_IP_WORKFLOW_EXTERNAL_FIXTURES_ROOT = 'D:/vibe-demo/fixtures';
const SCRIPTED_IP_WORKFLOW_FIXTURES_CURRENT_DIR = 'current';
const SCRIPTED_IP_WORKFLOW_FIXTURE_MANIFEST_FILE = 'manifest.json';
```

Also check the generated preview server code in `createScriptedWorkflowLauncher`, because it hardcodes:

```py
EXTERNAL_FIXTURES_ROOT = Path(r"D:\vibe-demo\fixtures").resolve()
EXTERNAL_PREFIX = "/external-fixtures/"
```

### Change Plan Options

Edit these arrays:

```ts
SCRIPTED_IP_SCENARIO_OPTIONS
SCRIPTED_IP_FOCUS_OPTIONS
SCRIPTED_IP_PACE_OPTIONS
```

These control the three rounds of follow-up choices shown before file generation.

### Change Confirmation Words

Edit:

```ts
const SCRIPTED_IP_CONFIRMATION_WORDS = [...]
```

### Change V2 Fix Triggers

Edit:

```ts
const SCRIPTED_IP_UI_FIX_WORDS = [...]
const SCRIPTED_IP_IMAGE_FIX_COMMAND = ...
const SCRIPTED_IP_IMAGE_FIX_WORDS = [...]
```

The V2 switch happens in `handleScriptedWorkflowRequest` after both `uiOverflow` and `imageCompression` are recorded.

### Change V3 Knowledge Trigger Or Content

Edit:

```ts
const SCRIPTED_IP_KNOWLEDGE_BASE_WORDS = ['知识库'];
```

The V3 switch happens in `handleScriptedWorkflowRequest` only when the current session is finished on V2.

Edit the bundled summary data in:

- `resources/chat-templates/orange-leaf-knowledge-base.json`

### Change Generated HTML Layout

Edit:

- `resources/chat-templates/line-art-ip-product.html`

This is the base HTML template. The TypeScript provider splits it into sections and then writes the generated project.

When editing the template, keep these section IDs unless you also update the splitter and scripts:

- `uploadSection`
- `ipSection`
- `posterSection`
- `finalSection`

### Change Generated CSS Or JS Injection

Edit these methods:

```ts
createScriptedWorkflowCss(...)
createScriptedWorkflowJs(...)
createScriptedWorkflowV1UploadScript()
createScriptedWorkflowV2UploadScript()
```

Patch markers used in generated output:

```css
/* scripted-ip-upload-variant:start */
/* scripted-ip-upload-variant:end */
```

```js
/* scripted-ip-upload-workflow:start */
/* scripted-ip-upload-workflow:end */
```

### External Fixture Manifest And Images

The workflow treats `D:/vibe-demo/fixtures/current/manifest.json` and every image it references as user-owned read-only inputs.

Before page generation, `validateScriptedWorkflowFixtures(...)` checks that:

- the manifest exists and is valid JSON;
- it contains `ip`, `poster`, and `final` arrays;
- the `ip` and `final` entries reference local image files;
- every referenced image exists under `D:/vibe-demo/fixtures/current/`;
- image references are relative paths that cannot escape the `current` directory.

If validation fails, the workflow stops with a warning. It does not create a replacement manifest or placeholder SVG files.

### Change Generated `plan.json`

Edit `createScriptedWorkflowProjectFiles(...)`.

The current generated plan includes:

- `project`
- `output`
- `entry`
- `version`
- selected `scenario`, `focus`, and `pace`
- `revision`
- preview URL

### Change File Tree Display In Chat

Edit:

```ts
createScriptedWorkflowTreeData(...)
```

This controls the file tree shown in the chat response after resources are created.

### Change Local Preview Script

Edit:

```ts
createScriptedWorkflowLauncher(...)
```

This writes:

- `start-preview.bat`
- `preview_server.py`

The current preview server uses:

- host: `127.0.0.1`
- port: `5500`
- external fixture URL prefix: `/external-fixtures/`

## Validation After Editing

This repo's instructions say to check TypeScript compilation errors before running tests.

For TypeScript changes under `src/`, use:

```powershell
npm run compile-check-ts-native
```

Do not use:

```powershell
npm run compile
```

After the compile check passes, test the workflow manually:

1. Open the VS Code build using this checkout.
2. Open any workspace folder.
3. Send a chat message containing `ip`.
4. Choose the three plan options.
5. Confirm with `按这个计划开始`.
6. Check that `vibe-demo/index.html`, `styles.css`, `app.js`, and `data/plan.json` are generated.
7. Check that the timestamp and content of `D:/vibe-demo/fixtures/current/manifest.json` and all referenced images are unchanged.
8. Confirm that the page displays the images referenced by the existing manifest.
9. Create the preview launcher if needed and open `http://127.0.0.1:5500/index.html`.
