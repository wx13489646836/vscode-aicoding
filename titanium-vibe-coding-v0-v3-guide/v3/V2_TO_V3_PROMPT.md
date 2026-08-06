# v2 → v3 Prompt：从高端品牌媒体页到真实 3D + 智能客服最终版

## 阶段定位

这一阶段模拟用户已经看过 v2 页面后的继续优化需求。

v2 已经完成了高端品牌视觉、图片/视频媒体展示、场景区、材质卖点和购买转化信息。v3 的目标是在 v2 基础上加入最终交互能力：

- 使用真实 OBJ/MTL/贴图 3D 模型。
- 进入页面时等待 3D 模型加载完成，再呈现完整页面。
- 提供可旋转、可缩放、可重置视角的 3D 查看体验。
- 解决 3D 区域滚轮和页面滚动冲突。
- 添加右下角英文智能客服。

v3 必须从 v2 复制生成，不能重新初始化项目，不能从空项目开始，也不能跳过 v2。

## 用户输入提示词

```text
我已经有了 v2 版本，它是一个高端纯钛杯英文品牌媒体页，包含图片、视频、场景展示和购买转化信息。

现在请基于 v2 继续做最终版 v3。

v2 项目路径是：

D:\vscode-vibe-demo-portable\titanium-vibe-coding-v0-v3-guide\v2\titanium-cup-showcase

请先把 v2 复制到 v3：

D:\vscode-vibe-demo-portable\titanium-vibe-coding-v0-v3-guide\v3\titanium-cup-showcase

复制时排除：

node_modules
.next
tsconfig.tsbuildinfo

3D 模型素材目录是：

D:\vscode-vibe-demo-portable\titanium-vibe-coding-v0-v3-guide\assets\products\model\person-cup

这个目录里包含真实的 OBJ、MTL 和 PNG 贴图。要求：

1. 必须使用这个目录里的真实 OBJ/MTL/贴图渲染。
2. 产品是人物拿着杯子的 3D 模型，不要自己做模型。
3. 不要压缩模型，不要转 GLB，不要替换格式。
4. 使用 Babylon.js 实现 3D 查看。
5. 支持鼠标拖动旋转。
6. 支持滚轮缩放。
7. 鼠标在 3D 区域滚轮缩放时，不要让页面跟着滚动。
8. 支持自动旋转、暂停/继续旋转、重置视角。
9. 页面进入时显示加载动画，实际是在等待 3D 模型加载完成。
10. 3D 模型加载完成后再进入正常页面。
11. 添加右下角英文智能客服，回答产品材质、颜色、物流、售后、保养和礼品定制问题。
12. 全站 UI 文案保持英文。
13. 本地开发需要同时支持 localhost 和 127.0.0.1。
14. 完成后在 v3 文件夹中生成双击启动脚本：`启动-v3-页面.bat` 和 `run-v3.cmd`。

请先进入 Plan 阶段：

- 检查 v2 项目是否存在。
- 检查 3D 模型目录是否存在。
- 列出真实 OBJ、MTL 和贴图文件名。
- 给我几个 3D 加载方式、交互控制和客服形式的选项。
- 等我选择后，再复制 v2 到 v3 并开始改代码。
```

## AI Plan 阶段应该做什么

AI 不应该直接改代码。应先检查真实项目和真实模型素材。

### 1. 检查 v2 项目

必须确认：

```text
D:\vscode-vibe-demo-portable\titanium-vibe-coding-v0-v3-guide\v2\titanium-cup-showcase
```

并检查：

- `package.json`
- `src/app/page.tsx`
- `src/app/globals.css`
- `public/products`
- v2 图片和视频展示是否已经存在

### 2. 检查 3D 模型素材

必须确认：

```text
D:\vscode-vibe-demo-portable\titanium-vibe-coding-v0-v3-guide\assets\products\model\person-cup
```

并列出真实文件：

- `.obj`
- `.mtl`
- diffuse/base texture `.png`
- metallic map
- normal map
- roughness map

AI 必须基于真实文件名写代码，不要猜路径。

### 3. 给用户选项

推荐 Plan 输出：

```text
我会基于 v2 生成 v3，而不是重新初始化项目。

我会先检查：

1. v2 项目：
D:\vscode-vibe-demo-portable\titanium-vibe-coding-v0-v3-guide\v2\titanium-cup-showcase

2. 3D 模型目录：
D:\vscode-vibe-demo-portable\titanium-vibe-coding-v0-v3-guide\assets\products\model\person-cup

确认后会复制 v2 到：
D:\vscode-vibe-demo-portable\titanium-vibe-coding-v0-v3-guide\v3\titanium-cup-showcase

请确认 v3 实现方向：

1. 3D 加载方式
A. 页面进入后立即加载 3D，加载完成后隐藏全屏 loading
B. 用户滚动到 3D 区域再加载
C. 用户点击按钮后再加载

2. 模型资产策略
A. 严格使用原始 OBJ/MTL/贴图，不压缩、不转格式
B. 复制原始 OBJ/MTL/贴图到 v3 public 目录，但不转换格式
C. 使用外部公共 assets 路径引用模型

3. 交互控制
A. 拖动旋转 + 滚轮缩放
B. 拖动旋转 + 滚轮缩放 + 自动旋转
C. 拖动旋转 + 滚轮缩放 + 自动旋转 + 暂停按钮 + 重置视角

4. 客服形式
A. FAQ 静态列表
B. 右下角悬浮客服按钮
C. 聊天弹窗 + 常见问题快捷按钮
```

## 推荐用户选择

```text
选择：
3D 加载方式 A
模型资产策略 A
交互控制 C
客服形式 C
```

## v3 应实现的内容

### 1. 项目生成方式

生成 v3 前必须先从 v2 复制：

```text
D:\vscode-vibe-demo-portable\titanium-vibe-coding-v0-v3-guide\v2\titanium-cup-showcase
```

到：

```text
D:\vscode-vibe-demo-portable\titanium-vibe-coding-v0-v3-guide\v3\titanium-cup-showcase
```

复制时排除：

```text
node_modules
.next
tsconfig.tsbuildinfo
```

不要从空项目开始，不要直接修改 v2。

### 2. 3D 功能

v3 应实现：

- Babylon.js 3D Viewer。
- 真实 OBJ/MTL/贴图加载。
- 3D 区域标题和英文说明。
- 鼠标拖动旋转。
- 滚轮缩放。
- 阻止 3D 区域滚轮带动页面滚动。
- 自动旋转。
- 暂停/继续自动旋转。
- 重置视角。
- 模型加载错误提示。

### 3. 页面加载体验

v3 应实现：

- 页面进入时显示 loading。
- loading 文案使用英文。
- loading 实际等待 3D 模型加载完成。
- 模型加载完成后进入完整页面。
- 如果模型加载失败，需要显示英文错误提示，不应无限 loading。

### 4. 智能客服

v3 应添加右下角英文客服组件：

- 默认收起为悬浮按钮。
- 展开后显示英文欢迎语。
- 提供常见问题快捷按钮。
- 支持产品材质、容量、颜色、物流、售后、保养、礼品定制等问题。
- 页面 UI 不出现中文。

## v3 不应该做的事情

v3 不应该：

- 不应该自己建模。
- 不应该用占位 3D 模型。
- 不应该把 OBJ 转成 GLB。
- 不应该压缩模型。
- 不应该替换用户给的贴图。
- 不应该破坏 v2 的图片/视频展示。
- 不应该移除 v2 的购买转化结构。
- 不应该让 3D 区域滚轮带动页面滚动。
- 不应该出现中文 UI 文案。

## 启动脚本要求

需要在 v3 文件夹根目录生成：

```text
D:\vscode-vibe-demo-portable\titanium-vibe-coding-v0-v3-guide\v3\启动-v3-页面.bat
D:\vscode-vibe-demo-portable\titanium-vibe-coding-v0-v3-guide\v3\run-v3.cmd
```

脚本内容建议使用纯 ASCII 英文输出，避免 Windows `cmd` 因中文编码导致批处理解析错误。

脚本应执行：

```text
1. 定位到 v3\titanium-cup-showcase 项目目录
2. 检查 package.json 是否存在
3. 如果 node_modules 不存在，则执行 npm install
4. 打开 http://127.0.0.1:3000
5. 执行 npm run dev -- --hostname 127.0.0.1 --port 3000
```

## v3 完成标准

v3 完成后应该满足：

- v3 是独立项目目录，不破坏 v2。
- v3 可以正常启动。
- v2 的图片、视频、场景展示和购买转化结构仍然存在。
- 3D 模型使用真实 OBJ/MTL/贴图。
- 鼠标拖动和滚轮缩放可用。
- 3D 区域滚轮不带动页面滚动。
- 页面进入 loading 与 3D 加载状态绑定。
- 智能客服是英文 UI。
- v3 文件夹中有可以双击启动的 `.bat` 或 `.cmd` 文件。

## v3 展示价值

```text
用户不是一开始就要求最终复杂功能，而是在 v2 已经具备高端品牌媒体页后，继续提出真实 3D 模型和智能客服的最终交互需求。

这一阶段体现的是：AI 能在已有页面基础上接入复杂真实资产，并解决加载、交互、兼容和客服体验问题。
```
