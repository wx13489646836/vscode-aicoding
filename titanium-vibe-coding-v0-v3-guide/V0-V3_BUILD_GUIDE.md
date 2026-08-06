# Titanium Cup 独立站 Vibe Coding v0-v3 构建指引

本文档用于指导后续把纯钛杯独立站拆分/复刻为 `v0-v3` 四个阶段版本，用于展示 vibe coding 独立站页面从技术选型、依赖初始化、真实素材接入，到最终交互体验的构建过程。

当前总说明文件为 `V0-V3_BUILD_GUIDE.md`，版本体系已经调整为 `v0-v3`：

- `v0` 保持不变：技术选型与项目初始化。
- `v1` 保持不变：使用真实图片素材生成基础商品独立站。
- 原 `v2` 和原 `v3` 合并为新的 `v2`：高端视觉升级 + 图片/视频内容增强。
- 原 `v4` 改为新的 `v3`：真实 3D 模型 + 智能客服最终版。

核心原则：

- 每个阶段都从一次用户提示词开始。
- 用户不是一开始就规划所有版本，而是在看过上一版后自然提出新的优化要求。
- AI 先进入 Plan 阶段，检查项目和素材，再给用户几个明确选项。
- 用户选择后，AI 再编写代码生成该阶段版本。
- 每一版都必须使用真实项目目录和真实素材，不要凭空编造资源路径。
- 最终版必须严格保留原始 OBJ/MTL/贴图，不压缩、不转 GLB、不替换模型。

## 0. 当前目录基准

工作目录：

```text
D:\vscode-vibe-demo-portable\titanium-vibe-coding-v0-v3-guide
```

公共素材目录：

```text
D:\vscode-vibe-demo-portable\titanium-vibe-coding-v0-v3-guide\assets\products
```

版本目录：

```text
D:\vscode-vibe-demo-portable\titanium-vibe-coding-v0-v3-guide\v0
D:\vscode-vibe-demo-portable\titanium-vibe-coding-v0-v3-guide\v1
D:\vscode-vibe-demo-portable\titanium-vibe-coding-v0-v3-guide\v2
D:\vscode-vibe-demo-portable\titanium-vibe-coding-v0-v3-guide\v3
```

最终版项目当前位于：

```text
D:\vscode-vibe-demo-portable\titanium-vibe-coding-v0-v3-guide\v3\titanium-cup-showcase
```

说明：当前 `v3` 文件夹保留的是已有最终版项目内容，不删除、不替换。构建叙事上，`v3` 应被描述为“从 v2 复制后继续增量实现真实 3D 与智能客服”的最终阶段。

3D 模型资产应使用公共素材目录中的真实 OBJ/MTL/贴图，例如：

```text
D:\vscode-vibe-demo-portable\titanium-vibe-coding-v0-v3-guide\assets\products\model\person-cup
```

版本演进目标：

```text
v0：通过 AI 对话完成技术选型、Node.js 项目初始化和依赖文件构建
v1：用现有图片素材做基础商品独立站
v2：从 v1 复制生成，在 v1 基础上做高端品牌视觉升级，并加入图片/视频内容增强
v3：从 v2 复制生成，接入用户提供的真实 OBJ/MTL/贴图 3D 模型和英文智能客服，形成最终版
```

## 1. v0：技术选型与项目初始化

### 1.1 阶段定位

`v0` 是正式页面开发前的工程准备阶段。这个阶段不追求页面视觉，也不需要完成完整业务页面，而是通过 AI 对话确定技术路线、运行环境、目录结构和必要依赖文件。

该项目使用 Node.js 生态，核心前端框架为 Next.js + React + TypeScript，样式使用 Tailwind CSS。因为后续会接入真实 3D 模型，所以在技术选型阶段也需要提前确认 Babylon.js 是否作为 3D 渲染方案。

### 1.2 用户一次提示词

```text
我想做一个面向海外用户的纯钛杯英文独立站，后续会逐步加入商品展示、产品图片、视频、真实 3D 模型和智能客服。

请先不要写完整页面，先进入 Plan 阶段，帮我确定技术选型和项目初始化方案。

我的要求：
1. 项目要基于 Node.js 生态。
2. 页面需要适合做独立站和产品展示。
3. 后续要能加入图片、视频和 3D 模型。
4. 后续 3D 可能需要加载 OBJ/MTL/贴图。
5. 希望使用现代前端技术，方便后续继续迭代页面版本。
6. 请给我几个技术方案选择，然后我选择后你再创建项目基础文件。
```

### 1.3 AI Plan 阶段应给出的选项

```text
我会先确定独立站的技术栈、目录结构和必要依赖。由于后续需要产品图片、视频和 3D 模型，建议选择支持 React 组件化和静态资源管理的框架。

请确认：

1. 前端框架
A. Next.js + React：适合独立站、产品页面、静态资源管理和后续扩展
B. Vite + React：更轻量，适合纯前端展示页
C. 原生 HTML/CSS/JS：最简单，但后续扩展 3D 和客服会更吃力

2. 样式方案
A. Tailwind CSS：适合快速做高质量响应式页面
B. CSS Modules：结构清晰，但开发速度较慢
C. 普通全局 CSS：简单直接，但大型页面维护性较弱

3. 3D 技术预留
A. Babylon.js：适合加载 OBJ/MTL/贴图和做交互式 3D 查看器
B. Three.js：生态广，但 OBJ/MTL 细节需要更多手动处理
C. v0 先不安装 3D 依赖，等最终版再接入

4. 语言和工程约束
A. TypeScript：更适合长期维护
B. JavaScript：更简单，但大型组件容易失控

5. 包管理和运行方式
A. npm：默认 Node.js 工具链，通用性高
B. pnpm：速度快，但需要额外环境确认
```

### 1.4 v0 代码实现要点

应创建或确认：

- Node.js 项目基础
- `package.json`
- `package-lock.json`
- `next.config.ts`
- `tsconfig.json`
- `src/app`
- `src/app/page.tsx`
- `src/app/layout.tsx`
- `src/app/globals.css`
- `public`
- `public/products`
- 基础 README 或项目说明

推荐依赖：

```text
next
react
react-dom
typescript
tailwindcss
@tailwindcss/postcss
babylonjs
babylonjs-loaders
```

v0 不应该：

- 不应该做完整视觉设计。
- 不应该接入真实产品内容。
- 不应该处理图片、视频、3D 或客服。

v0 展示价值：

```text
AI 先和用户确认 Node.js / Next.js / React / Tailwind / Babylon.js 等技术路线，再生成后续版本可持续迭代的工程基础。
```

## 2. v1：基础商品独立站

### 2.1 阶段定位

`v1` 是最基础的可用独立站版本，目标是先把商业骨架搭出来。

这一版不追求高级视觉，也不加入 3D、视频、智能客服或复杂动画。重点是：基于真实图片素材做出一个能展示产品、能承载购买转化的英文页面。

### 2.2 用户一次提示词

```text
我已经有一个基于 Node.js / Next.js / React / TypeScript / Tailwind CSS 的项目基础，现在想继续做第一个可用页面。

项目路径是：

D:\vscode-vibe-demo-portable\titanium-vibe-coding-v0-v3-guide\v0\titanium-cup-showcase

现在请基于这个项目做一个面向海外用户的纯钛杯英文独立站基础版本。

我会提供产品图片素材，素材目录是：

D:\vscode-vibe-demo-portable\titanium-vibe-coding-v0-v3-guide\assets\products

请你先检查这个素材目录里有哪些图片，不要自己虚构图片路径。

主推产品是：

Han Dynasty Heavenly Horse Pattern Pure Titanium Thermos

页面要求：

1. 使用真实素材目录里的产品图片。
2. 首页包含导航、Hero、主推产品区、产品价格、规格、购买按钮、推荐产品区和页脚。
3. 页面文案使用英文，面向海外用户。
4. 重点突出 99.95% pure titanium、antibacterial、lightweight、gift-ready。
5. 这一版只做基础可用页面，不需要 3D，不需要视频，不需要智能客服，不需要复杂动画。
6. 完成页面后，请在 v1 文件夹中生成一个双击即可启动预览的 Windows 脚本，例如 `启动-v1-页面.bat`，最好同时提供一个纯英文文件名的 `run-v1.cmd`。
7. 请先进入 Plan 阶段，检查项目和素材后给我几个页面方案选择。
8. 等我选择方案后，你再开始改代码。
```

### 2.3 AI Plan 阶段应给出的选项

```text
我会基于现有 v0 项目继续做 v1 基础商品独立站。编码前我会先检查项目目录和素材目录，只使用真实存在的图片路径。

请确认 v1 页面方向：

1. 页面结构
A. 标准单页落地页：Hero + Featured Product + Recommended Products + Footer
B. 商品详情式首页：主商品信息更重，推荐产品较少
C. 产品目录式首页：推荐产品较多，主商品较弱

2. 视觉风格
A. 简洁白底电商风
B. 浅灰卡片风
C. 基础深色风

3. 主推产品布局
A. 左图右文
B. 上图下文
C. 大图居中 + 下方参数卡片

4. 推荐产品数量
A. 4 个
B. 8 个
C. 根据素材数量自动决定
```

### 2.4 v1 代码实现要点

应实现：

- 顶部导航
- Hero 区域
- 主推产品区
- 产品价格
- 产品规格
- `Buy Now` / `Add to Cart`
- 推荐产品网格
- 页脚
- 双击即可查看页面的 Windows 启动脚本

不要实现：

- 3D 模型
- 视频播放
- 智能客服
- 入场 loading
- 图片重生成
- 复杂背景动效

v1 展示价值：

```text
AI 先读取真实素材，再生成基础可上线页面。
```

## 3. v2：高端视觉升级 + 图片/视频内容增强

### 3.1 阶段定位

`v2` 合并了原本“高端品牌视觉升级”和“图片/视频内容增强”两个阶段。生成 v2 前必须先复制 v1 项目，不能直接覆盖或修改 v1。

用户在看过 v1 后，通常不会只说“做一个品牌视觉版”，也可能同时指出页面不够高级、图片展示不够丰富、视频没有加入、图片比例或中文素材不适合海外页面。因此新的 v2 应该一次性完成：

- 更高级的品牌视觉。
- 更完整的产品图片展示。
- 主推产品多图切换。
- 图片/视频混合展示。
- 场景展示区。
- 英文文案和海外用户表达。

这一版仍然不接入 3D，也不添加智能客服。

v2 的基线来源固定为：

```text
D:\vscode-vibe-demo-portable\titanium-vibe-coding-v0-v3-guide\v1\titanium-cup-showcase
```

v2 的生成目标固定为：

```text
D:\vscode-vibe-demo-portable\titanium-vibe-coding-v0-v3-guide\v2\titanium-cup-showcase
```

复制时应排除：

```text
node_modules
.next
tsconfig.tsbuildinfo
```

### 3.2 用户一次提示词

```text
我已经有了 v1 版本的纯钛杯英文独立站基础页面，但现在看起来还是太基础了，比较像普通模板。

请你基于现有 v1 项目继续优化成 v2。

v1 项目路径是：

D:\vscode-vibe-demo-portable\titanium-vibe-coding-v0-v3-guide\v1\titanium-cup-showcase

素材目录是：

D:\vscode-vibe-demo-portable\titanium-vibe-coding-v0-v3-guide\assets\products

请你先检查 v1 项目和素材目录，不要自己虚构图片或视频路径。

我希望 v2 做这些提升：

1. 整体视觉更像一个正式的海外产品独立站，不要只是简单卡片堆叠。
2. 首页首屏要更有产品氛围，可以使用深色高级感、钛金属质感、暖色点缀。
3. 主推产品需要支持多图切换：点击缩略图后，主图随之切换。
4. 如果素材目录里有视频，请加入图片/视频混合展示，但不要接入 3D。
5. 增加“Crafted for Every Moment”或类似的产品场景展示区，用真实图片展示产品使用场景。
6. 如果图片素材里有中文文字，页面自己的 UI 文案必须全部改为英文；如果需要重新生成适合网页比例的英文图片，请先说明方案再执行。
7. 增加材质卖点模块，突出 pure titanium、clean taste、lightweight、durable、gift-ready。
8. 增加更清晰的购买转化区域，例如价格、按钮、保障信息、礼品属性。
9. 暂时不要做 3D，不要做智能客服。
10. 完成后在 v2 文件夹中生成可以双击启动预览的脚本，例如 `启动-v2-页面.bat` 和 `run-v2.cmd`。

请先进入 Plan 阶段：

- 先检查 v1 项目结构。
- 再检查素材目录里有哪些图片和视频可用。
- 然后给我几个 v2 页面升级方案选择。
- 等我选择方案后，你再复制 v1 到 v2 并开始改代码。
- v2 完成后，请生成 `D:\vscode-vibe-demo-portable\titanium-vibe-coding-v0-v3-guide\v2\V1_TO_V2_CHANGES.md`，记录 v1→v2 的复制来源、代码改动、素材变化和功能差异。
```

### 3.3 AI Plan 阶段应给出的选项

```text
我会基于现有 v1 项目继续做 v2，而不是重新初始化项目。

我会先检查：

1. v1 项目目录：
D:\vscode-vibe-demo-portable\titanium-vibe-coding-v0-v3-guide\v1\titanium-cup-showcase

2. 素材目录：
D:\vscode-vibe-demo-portable\titanium-vibe-coding-v0-v3-guide\assets\products

然后把 v1 复制到：
D:\vscode-vibe-demo-portable\titanium-vibe-coding-v0-v3-guide\v2\titanium-cup-showcase

v2 会继续使用真实存在的图片和视频，不会编造素材路径。

请确认 v2 优化方向：

1. 视觉方向
A. 深色高级产品展示页：黑金、钛金属质感、适合礼品和高端材质表达
B. 明亮电商详情页：白底、信息清楚、购买转化优先
C. 文化礼品风：强调 Han Dynasty Heavenly Horse 与文化纹样

2. 首页首屏
A. 左文右大产品图，突出标题、价格和购买按钮
B. 大图背景叠加标题，更有品牌海报感
C. 主图居中，下方快速展示核心卖点

3. 媒体交互
A. 主推产品多图缩略图切换
B. 图片 + 视频混合缩略图切换
C. 视频单独作为一个展示模块

4. 图片处理方式
A. 只调整 CSS 裁切方式
B. 重新生成适合网页比例的英文版场景图
C. 保留原图，同时新增英文补充图

5. 产品内容重点
A. 强调材质和健康：pure titanium、clean taste、antibacterial
B. 强调礼品属性：gift-ready、premium packaging、heritage pattern
C. 强调材质、文化、礼品和日常使用的综合表达
```

### 3.4 v2 代码实现要点

应实现：

- 基于 v1 复制生成 v2 项目，而不是直接覆盖 v1。
- 更有质感的英文首页视觉。
- 深色背景、钛金属质感、暗金色点缀。
- Hero 区域强化主推产品、价格、CTA 和核心卖点。
- 主推产品多图展示，支持缩略图点击切换主图。
- 如果有视频素材，加入图片/视频混合展示或单独视频模块。
- 新增场景展示区，例如 `Crafted for Every Moment`。
- 新增材质/功能卖点区。
- 新增保障或信任信息，例如 shipping、gift-ready、secure checkout。
- 所有页面 UI 文案使用英文。
- v2 文件夹根目录生成双击启动脚本。
- v2 文件夹根目录生成 `V1_TO_V2_CHANGES.md`，记录 v1→v2 的增量改动。

不要实现：

- 3D 模型
- 智能客服
- 入场 3D loading
- 模型压缩或格式转换
- 不存在的图片/视频路径
- 直接修改 v1 项目本体

v2 展示价值：

```text
AI 在真实素材基础上，把基础商品页升级为更完整的品牌媒体页，但还没有进入 3D 和智能客服的最终交互阶段。
```

v2 完成后必须能作为 v3 的生成基线。后续 v3 应从 v2 复制后继续实现，而不是从 v1 或空项目重新开始。

## 4. v3：真实 3D 模型与智能客服最终版

### 4.1 阶段定位

`v3` 是最终交互体验版，在 `v2` 的图文视频页面基础上加入真实 3D 模型、入场加载动画和右下角英文智能客服。

这一版必须严格使用用户提供的真实 OBJ/MTL/贴图资产。

当前目录中的 `v3` 保留为已有最终版参考，不删除、不替换。后续如果重新演示或重做 v3，正确流程应是先复制：

```text
D:\vscode-vibe-demo-portable\titanium-vibe-coding-v0-v3-guide\v2\titanium-cup-showcase
```

再在复制出的 v3 项目中接入真实 3D 模型和智能客服。

### 4.2 用户一次提示词

```text
基于 v2 制作最终版。

项目路径：

D:\vscode-vibe-demo-portable\titanium-vibe-coding-v0-v3-guide\v2\titanium-cup-showcase

3D 模型素材在：

D:\vscode-vibe-demo-portable\titanium-vibe-coding-v0-v3-guide\assets\products\model\person-cup

里面包含：
- OBJ 模型
- MTL 材质
- PNG 贴图

要求：
1. 必须使用这个目录里的真实 OBJ/MTL/贴图渲染。
2. 产品是人物拿着杯子的 3D 模型，不要自己做模型。
3. 不要压缩模型，不要转 GLB，不要替换格式。
4. 使用 Babylon.js 实现 3D 查看。
5. 支持鼠标拖动旋转、滚轮缩放、重置视角、暂停/开启自动旋转。
6. 鼠标在 3D 区域滚轮缩放时，不要让页面跟着滚动。
7. 页面进入时显示加载动画，实际是在等待 3D 模型加载完成。
8. 3D 模型加载完成后再进入正常页面。
9. 添加右下角英文智能客服，回答产品材质、颜色、物流、售后、保养和礼品定制问题。
10. 保持全站英文。
11. 本地开发要同时支持 localhost 和 127.0.0.1。
12. 完成后在 v3 文件夹中生成可以双击启动预览的脚本，例如 `启动-v3-页面.bat` 和 `run-v3.cmd`。
```

### 4.3 AI Plan 阶段应给出的选项

```text
我会先检查 3D 模型目录，确认 OBJ、MTL 和贴图文件名，然后接入 Babylon.js。

请确认：

1. 3D 加载方式
A. 页面进入后立即加载 3D，加载完成后隐藏全屏 loading
B. 用户滚动到 3D 区域再加载
C. 用户点击按钮后再加载

2. 模型资产策略
A. 严格使用原始 OBJ/MTL/贴图，不压缩、不转格式
B. 允许生成网页优化版
C. 使用占位模型先完成交互

3. 交互控制
A. 拖动旋转 + 滚轮缩放
B. 拖动旋转 + 滚轮缩放 + 自动旋转
C. 拖动旋转 + 滚轮缩放 + 自动旋转 + 重置视角 + 暂停按钮

4. 客服形式
A. FAQ 列表
B. 右下角悬浮客服
C. 聊天弹窗 + 常见问题快捷按钮

5. 本地开发兼容
A. 只支持 localhost
B. 同时支持 localhost 和 127.0.0.1
```

### 4.4 v3 代码实现要点

应新增：

- Babylon.js 真实 OBJ/MTL/贴图加载
- `Model3DViewer`
- `PageModelLoadingOverlay`
- `titanium:model3d-ready` 事件
- `titanium:model3d-error` 事件
- 入场 loading
- 3D 加载完成后进入页面
- 鼠标拖动旋转
- 滚轮缩放
- 阻止 3D 区域滚轮带动页面滚动
- 自动旋转
- 暂停/开启自动旋转
- 重置视角
- 右下角英文智能客服
- `allowedDevOrigins: ['127.0.0.1', 'localhost']`

不要做：

- 不要转 GLB
- 不要压缩模型
- 不要用占位模型
- 不要自己建模
- 不要替换用户提供的 OBJ/MTL/贴图

v3 展示价值：

```text
AI 在用户明确约束下接入真实复杂资产，并解决真实工程兼容问题。
```

## 5. 每个版本的通用执行规则

每一版都按以下流程执行：

```text
1. 用户给一次完整提示词
2. AI 检查项目路径和真实素材
3. AI 进入 Plan 阶段并给选项
4. 用户选择方向
5. AI 编码实现
6. AI 做基本检查
7. 输出该版本结果
```

AI 编码前必须做：

- 检查项目目录是否存在
- 检查素材目录是否存在
- 用真实文件名组织页面资源
- 不编造不存在的图片、视频、模型路径

AI 编码后必须做：

- TypeScript 检查
- 页面能正常启动
- 关键资源路径存在
- 不引入和当前版本无关的功能
- 对 Windows 双击启动脚本做基础检查
- 对 v1→v2、v2→v3 的来源关系做文档记录

## 6. 推荐目录结构

当前推荐使用独立目录：

```text
D:\vscode-vibe-demo-portable\titanium-vibe-coding-v0-v3-guide
  assets
  v0
  v1
  v2
  v3
```

也可以使用 Git 分支：

```text
v0-project-foundation
v1-basic-storefront
v2-premium-media
v3-final-3d
```

如果用于录屏或教学展示，推荐独立目录方式，更直观、更不容易被后续修改影响。

## 7. 展示叙事

整体展示主题：

```text
用 Vibe Coding 从真实素材构建一个高端纯钛杯独立站
```

四个版本的核心表达：

```text
v0：技术选择 → Node.js / Next.js 工程基础
v1：真实素材 → 基础可售卖页面
v2：基础页面 → 高端品牌视觉 + 图文视频媒体增强
v3：从 v2 继续 → 真实 3D + 智能客服完整交互体验
```

最重要的展示观点：

```text
AI 不是凭空生成页面，而是在读取真实项目目录和真实素材后，根据用户选择逐步编码。
```

