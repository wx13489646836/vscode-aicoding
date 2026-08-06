# v1 → v2 Prompt：从基础商品页到高端品牌媒体页

## 阶段定位

这一阶段模拟用户已经看过 v1 页面后的真实反馈。

v1 已经能展示产品、价格、规格和推荐商品，但页面还比较基础，缺少正式独立站应有的视觉质感、产品氛围、媒体展示和购买说服力。

因此 v2 的目标是：在不接入 3D、不接入智能客服的前提下，把 v1 升级为一个更完整的高端品牌媒体页。

v2 需要完成两类提升：

1. 视觉升级  
   从普通白底商品页，升级为更有钛金属质感、黑金调性、礼品属性和文化表达的海外独立站。

2. 媒体增强  
   使用真实图片和已有视频素材，加入主推产品图库、图片/视频切换、场景展示和更丰富的产品卖点表达。

## 用户输入提示词

```text
我已经有了 v1 版本的纯钛杯英文独立站基础页面，但看起来还是太基础了，比较像普通模板页。

我想继续基于 v1 优化一版 v2，不要重新初始化项目。

v1 项目路径是：

D:\vscode-vibe-demo-portable\titanium-vibe-coding-v0-v3-guide\v1\titanium-cup-showcase

素材目录是：

D:\vscode-vibe-demo-portable\titanium-vibe-coding-v0-v3-guide\assets\products

请你先检查 v1 项目结构和素材目录，确认有哪些图片和视频可以使用，不要自己虚构图片、视频或文件路径。

这次我希望 v2 做成更像正式海外独立站的版本：

1. 整体视觉不要再像普通电商模板，要更有高端纯钛产品的质感。
2. 可以使用深色背景、黑金配色、金属光泽、暗色渐变和更精致的卡片设计。
3. 首屏要强化主推产品、价格、购买按钮和核心卖点。
4. 主推产品区需要支持多图切换，点击缩略图后切换主图。
5. 如果素材目录里有视频，请把视频作为图库的一部分或单独的视频展示模块加入页面。
6. 增加一个英文场景展示区，例如 “Crafted for Every Moment”，用真实图片展示礼盒、茶饮、日常使用、产品细节等内容。
7. 增加材质卖点模块，突出 99.95% pure titanium、clean taste、lightweight、durable、gift-ready。
8. 增加更清楚的购买转化信息，例如价格、Buy Now、Add to Cart、shipping、secure checkout、gift-ready。
9. 页面所有 UI 文案必须是英文，面向海外用户。
10. 如果图片里带有中文，可以继续作为图片素材使用，但页面自身不要出现中文说明。
11. 暂时不要做 3D 模型。
12. 暂时不要做智能客服。
13. 不要重绘产品图，不要编造不存在的素材。
14. 完成后在 v2 文件夹中生成可以双击启动预览的脚本，例如 `启动-v2-页面.bat` 和 `run-v2.cmd`。
15. 完成后必须在 v2 文件夹中生成 `V1_TO_V2_CHANGES.md`，记录 v2 是从 v1 复制后增量改造而来，并列出主要代码、素材和功能差异。

请先进入 Plan 阶段：

- 先检查 v1 项目是否存在。
- 再检查素材目录里有哪些图片和视频。
- 根据真实素材情况给我几个 v2 页面升级方案选择。
- 等我选择方案后，你再把 v1 复制到 v2 并开始改代码。
- v2 完成后，请生成一份 v1→v2 的改动记录，方便后续继续从 v2 生成 v3。
```

## AI Plan 阶段应该做什么

AI 不应该直接改代码。应先完成检查，然后给用户选项。

### 1. 检查 v1 项目

应确认：

```text
D:\vscode-vibe-demo-portable\titanium-vibe-coding-v0-v3-guide\v1\titanium-cup-showcase
```

是否存在，并检查：

- `package.json`
- `src/app/page.tsx`
- `src/app/globals.css`
- `public/products`
- v1 启动脚本

### 2. 检查素材目录

应确认：

```text
D:\vscode-vibe-demo-portable\titanium-vibe-coding-v0-v3-guide\assets\products
```

是否存在，并列出可用素材类型：

- `.jpg`
- `.png`
- `.webp`
- `.mp4`
- 其他可用于页面的图片或视频文件

AI 应根据真实文件名判断素材用途，不要猜测不存在的文件。

### 3. 给用户选项

推荐 Plan 输出如下：

```text
我会基于 v1 继续做 v2，不重新初始化项目。

我会先检查：

1. v1 项目目录：
D:\vscode-vibe-demo-portable\titanium-vibe-coding-v0-v3-guide\v1\titanium-cup-showcase

2. 素材目录：
D:\vscode-vibe-demo-portable\titanium-vibe-coding-v0-v3-guide\assets\products

确认真实图片和视频后，我会复制 v1 到：

D:\vscode-vibe-demo-portable\titanium-vibe-coding-v0-v3-guide\v2\titanium-cup-showcase

然后再进行 v2 改造。

请确认 v2 的升级方向：

1. 视觉方向
A. 黑金高端钛金属风：深色背景、金色点缀、适合礼品和高端材质表达
B. 明亮高级电商风：白底为主，信息清楚，转化优先
C. 东方文化礼品风：强调 Han Dynasty Heavenly Horse、Silk Road、heritage pattern

2. 首屏结构
A. 左侧英文卖点 + 右侧大产品图 + 价格和购买按钮
B. 大图海报式首屏，文字叠加在背景上
C. 主图居中，核心卖点和按钮分布在下方

3. 媒体展示方式
A. 主推产品多图缩略图切换
B. 图片 + 视频混合缩略图切换
C. 图片图库 + 单独视频展示模块

4. 场景展示重点
A. Daily Carry：日常携带、轻量、耐用
B. Tea & Coffee：茶饮、咖啡、clean taste
C. Gift-ready：礼盒、文化纹样、送礼属性
D. 综合展示：日常、茶饮、礼品、细节都包含

5. 页面复杂度
A. 中等复杂度：主要集中在 page.tsx 和 globals.css，少量交互
B. 组件化版本：拆分 ProductGallery、HeroSection、FeatureGrid 等组件
C. 极简增强：只在 v1 基础上做视觉和少量内容优化
```

## 推荐用户选择

```text
选择：
视觉方向 A
首屏结构 A
媒体展示方式 B
场景展示重点 D
页面复杂度 A
```

## v2 应实现的内容

### 1. 项目生成方式

生成 v2 前必须先复制 v1 项目，不允许直接在 v1 项目中修改。

应从：

```text
D:\vscode-vibe-demo-portable\titanium-vibe-coding-v0-v3-guide\v1\titanium-cup-showcase
```

复制到：

```text
D:\vscode-vibe-demo-portable\titanium-vibe-coding-v0-v3-guide\v2\titanium-cup-showcase
```

复制时可以排除：

```text
node_modules
.next
tsconfig.tsbuildinfo
```

不要直接覆盖 v1。复制完成后，所有 v2 代码改动都应发生在：

```text
D:\vscode-vibe-demo-portable\titanium-vibe-coding-v0-v3-guide\v2\titanium-cup-showcase
```

v2 的完成状态必须可以作为后续 v3 的生成基线，即后续 v3 应从 v2 复制后继续增量实现。

### 2. 页面功能

v2 应包含：

- 高端品牌感导航栏
- 深色高级 Hero 区
- 主推产品英文标题
- 主推产品价格
- `Buy Now`
- `Add to Cart`
- 规格和核心卖点
- 主推产品多图切换
- 可选图片/视频混合图库
- `Crafted for Every Moment` 场景展示区
- 材质卖点区
- 推荐产品区视觉升级
- shipping / secure checkout / gift-ready 等信任信息
- 英文页脚

### 3. 视频使用

如果素材目录里有视频：

- 可以把视频作为图库 item。
- 可以单独做一个 `Product Video` 模块。
- 视频控件应该能播放、暂停。
- 不要把视频说成 3D。
- 不要因为视频加入而引入不相关的复杂功能。

如果视频在浏览器中不能播放，AI 应先说明具体原因，再提出处理方案；不要盲目改动整个页面结构。

### 4. 文案方向

推荐英文文案重点：

```text
Pure Titanium, Pure Taste
99.95% Pure Titanium
Clean Taste, No Metallic Flavor
Naturally Antibacterial
Lightweight for Daily Carry
Gift-ready Heritage Design
Built for Tea, Coffee, and Everyday Hydration
Crafted for Every Moment
```

### 5. 图片使用

AI 应先扫描素材目录，再决定图片用途。

建议分类：

```text
主推产品主图：清晰杯子产品图
缩略图库：主图、产品细节图、场景图、视频封面
场景展示图：礼盒、茶饮、手持、桌面、内胆、茶滤等
推荐产品图：product 系列或其他独立产品图
```

如果图片素材中带中文：

- 可以作为图片素材继续使用。
- 页面外部标题、说明、按钮、标签必须使用英文。
- 不要在页面 UI 中新增中文解释。

## v2 不应该做的事情

v2 不应该：

- 不应该接入 3D 模型。
- 不应该添加智能客服。
- 不应该做“等待 3D 加载完成”的入场 loading。
- 不应该压缩或转换 3D 模型。
- 不应该编造不存在的图片或视频路径。
- 不应该重绘产品图。
- 不应该直接修改 v1 项目本体。
- 不应该把页面文案写成中文。

## 文件实现建议

优先修改：

```text
src/app/page.tsx
src/app/globals.css
package.json
package-lock.json
README.md
```

如果需要组件化，可以新增：

```text
src/components/ProductGallery.tsx
src/components/HeroSection.tsx
src/components/FeatureGrid.tsx
src/components/MediaShowcase.tsx
```

但 v2 不应过度拆分。页面重点是视觉升级和媒体展示，不是架构复杂化。

## v1 → v2 改动记录要求

v2 完成后，必须在 v2 文件夹根目录生成：

```text
D:\vscode-vibe-demo-portable\titanium-vibe-coding-v0-v3-guide\v2\V1_TO_V2_CHANGES.md
```

记录内容必须包括：

- v2 的基线来源：`D:\vscode-vibe-demo-portable\titanium-vibe-coding-v0-v3-guide\v1\titanium-cup-showcase`
- v2 的复制目标：`D:\vscode-vibe-demo-portable\titanium-vibe-coding-v0-v3-guide\v2\titanium-cup-showcase`
- 复制时排除的内容：`node_modules`、`.next`、`tsconfig.tsbuildinfo`
- 新增或补充的真实素材：图片、视频、poster 等
- 主要代码改动：`page.tsx`、`globals.css`、`layout.tsx`、`next.config.ts`、`package.json`、README、启动脚本
- 功能差异：黑金视觉、主推产品图库、图片/视频展示、场景区、材质卖点、转化信息
- 明确未做内容：3D、智能客服、3D loading
- 后续 v3 应以 v2 为基线继续生成

## 启动脚本要求

需要在 v2 文件夹根目录生成：

```text
D:\vscode-vibe-demo-portable\titanium-vibe-coding-v0-v3-guide\v2\启动-v2-页面.bat
D:\vscode-vibe-demo-portable\titanium-vibe-coding-v0-v3-guide\v2\run-v2.cmd
```

脚本内容建议使用纯 ASCII 英文输出，避免 Windows `cmd` 因中文编码导致批处理解析错误。

脚本应执行：

```text
1. 定位到 v2\titanium-cup-showcase 项目目录
2. 检查 package.json 是否存在
3. 如果 node_modules 不存在，则执行 npm install
4. 打开 http://127.0.0.1:3000
5. 执行 npm run dev -- --hostname 127.0.0.1 --port 3000
```

## v2 完成标准

v2 完成后应该满足：

- v2 是独立项目目录，不破坏 v1。
- 页面可以正常启动。
- 首页明显比 v1 更有品牌质感。
- 页面使用真实存在的图片和视频素材。
- 主推产品支持多图切换。
- 如使用视频，视频模块或图库项能正常展示。
- 页面 UI 文案全部是英文。
- 商品卖点、价格、购买按钮、规格和信任信息清晰。
- 不包含 3D 模型。
- 不包含智能客服。
- v2 文件夹中有可以双击启动的 `.bat` 或 `.cmd` 文件。
- v2 文件夹中有 `V1_TO_V2_CHANGES.md`，清楚记录 v1→v2 的复制来源和增量改动。

## v2 展示价值

```text
用户不是一开始就计划做复杂最终版，而是在看到 v1 基础页面后，自然提出“页面太普通、不够高级、媒体展示不够完整”的优化需求。

这一阶段体现的是：AI 读取已有 v1 工程和真实素材后，先给出可选升级方向，再把基础商品页升级为更完整的高端品牌媒体页。
```
