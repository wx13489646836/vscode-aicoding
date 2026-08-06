# v0 → v1 Prompt：从工程基础到基础商品独立站

## 使用目标

这一阶段用于把 v0 的技术工程基础推进为第一个可用的商品独立站页面。

v1 的核心目标是：

- 基于 v0 已创建的 Next.js / React / TypeScript / Tailwind 项目继续开发。
- 使用用户提供的真实图片素材，而不是让 AI 编造图片路径。
- 先完成一个“能展示产品、能承载购买转化”的英文基础页面。
- 不追求复杂视觉，不做 3D，不做智能客服，不做高级动画。

## 用户输入提示词

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
6. 完成页面后，请在 v1 文件夹中生成一个双击即可启动预览的 Windows 脚本，例如 `启动-v1-页面.bat`，最好同时提供一个纯英文文件名的 `run-v1.cmd`，避免 Windows 批处理编码问题。
7. 启动脚本需要自动进入 v1 项目目录，必要时执行 `npm install`，然后启动 `npm run dev -- --hostname 127.0.0.1 --port 3000`，并打开 `http://127.0.0.1:3000`。
8. 请先进入 Plan 阶段，检查项目和素材后给我几个页面方案选择。
9. 等我选择方案后，你再开始改代码。
```

## 期望 AI Plan 输出

AI 应该先检查：

- v0 项目是否存在
- `package.json` 是否存在
- `src/app` 是否存在
- 素材目录是否存在
- 素材目录里有哪些可用于页面的图片

然后再给用户选项。

推荐 AI 输出结构如下：

```text
我会基于现有 v0 项目继续做 v1 基础商品独立站。编码前我会先检查：

1. 项目目录：
D:\vscode-vibe-demo-portable\titanium-vibe-coding-v0-v3-guide\v0\titanium-cup-showcase

2. 素材目录：
D:\vscode-vibe-demo-portable\titanium-vibe-coding-v0-v3-guide\assets\products

检查后会只使用真实存在的图片路径，不会编造素材。

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

5. 商品转化重点
A. 强调价格和购买按钮
B. 强调材质、健康和轻量
C. 强调礼品属性和文化纹样
```

## 推荐用户选择

```text
选择：
页面结构 A
视觉风格 A
主推产品布局 A
推荐产品数量 B
商品转化重点 B
```

## v1 应实现的内容

应实现：

- 顶部导航
- Hero 区域
- 主推产品区
- 主推产品图片
- 产品英文标题
- 产品英文描述
- 价格展示
- 规格卡片
- `Buy Now` 按钮
- `Add to Cart` 按钮
- 推荐产品网格
- 页脚
- 双击即可查看页面的 Windows 启动脚本

推荐文案重点：

```text
99.95% Pure Titanium
Naturally Antibacterial
Lightweight and Durable
Gift-ready Design
No Metallic Taste
Acid-Base Resistant
```

## v1 不应该做的事情

v1 不应该：

- 不应该接入 3D 模型。
- 不应该接入视频。
- 不应该添加智能客服。
- 不应该生成复杂品牌背景。
- 不应该重绘或重生成图片。
- 不应该转码视频。
- 不应该加入入场 loading。
- 不应该做复杂滚动动画。

## v1 文件实现建议

在 v1 中，AI 可以优先修改：

```text
src/app/page.tsx
src/app/globals.css
```

如页面结构变复杂，可以新增：

```text
src/components/MainProduct.tsx
src/components/RecommendedProducts.tsx
src/components/Navbar.tsx
```

但 v1 应保持尽量简单，不要过度拆分。

另外需要在 v1 文件夹根目录生成启动脚本：

```text
D:\vscode-vibe-demo-portable\titanium-vibe-coding-v0-v3-guide\v1\启动-v1-页面.bat
D:\vscode-vibe-demo-portable\titanium-vibe-coding-v0-v3-guide\v1\run-v1.cmd
```

脚本内容建议使用纯 ASCII 英文输出，避免 Windows `cmd` 因中文编码导致批处理解析错误。脚本应执行：

```text
1. 定位到 v1\titanium-cup-showcase 项目目录
2. 检查 package.json 是否存在
3. 如果 node_modules 不存在，则执行 npm install
4. 打开 http://127.0.0.1:3000
5. 执行 npm run dev -- --hostname 127.0.0.1 --port 3000
```

## v1 完成标准

v1 完成后应该满足：

- 页面可以正常启动。
- 首页能看到基础商品独立站结构。
- 页面使用真实存在的图片素材。
- 页面英文文案完整。
- 商品卖点、价格、规格和购买按钮清晰。
- 不包含 3D、视频、客服等后续功能。
- v1 文件夹中有可以双击启动的 `.bat` 或 `.cmd` 文件。

## v1 展示价值

```text
用户不是让 AI 一次性做最终页面，而是在已有 Node.js / Next.js 工程基础上，提供真实素材目录，让 AI 先生成第一个可用的基础商品独立站。
```

