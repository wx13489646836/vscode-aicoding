# 钛杯产品展示页面

## 项目概述

这是一个集成中国元素背景的钛杯产品展示页面，分为两个主要模块：
1. **主要产品介绍** - 包含 VR 360° 全景查看功能
2. **其他产品推荐** - 产品网格展示

## 功能特性

✅ **中国元素背景设计**
- 水墨渐变背景
- 传统云纹装饰
- 金属纹样点缀
- 古典优雅的视觉呈现

✅ **VR 360° 全景查看**
- 使用 Babylon.js 3D 引擎
- 支持鼠标拖动旋转
- 支持滚轮缩放
- 流畅的全景体验

✅ **产品展示**
- 主产品详细信息展示
- 产品规格详情
- 推荐产品网格布局
- 响应式设计

✅ **用户友好**
- 流畅的交互体验
- 加载状态提示
- 帮助文本提示
- 移动端适配

## 项目结构

```
src/
├── app/
│   ├── page.tsx                 # 主页面（产品展示）
│   ├── globals.css              # 全局样式
│   └── ...
├── components/
│   ├── ChineseBackground.tsx    # 中国元素背景
│   ├── MainProduct.tsx          # 主产品模块
│   ├── RecommendedProducts.tsx  # 推荐产品模块
│   ├── VRPanoramaViewer.tsx     # VR 全景查看器
│   ├── ProductCard.tsx          # 产品卡片
│   └── ...
└── ...
```

## 技术栈

- **框架**: Next.js 16.2.6
- **UI库**: React 19.2.4
- **3D引擎**: Babylon.js 9.10.0
- **样式**: Tailwind CSS 4
- **语言**: TypeScript

## 快速开始

### 安装依赖

```bash
npm install
```

### 本地开发

```bash
npm run dev
```

然后在浏览器中打开 `http://localhost:3000`

### 构建生产版本

```bash
npm run build
npm start
```

## 使用说明

### 查看 VR 全景

1. 在主产品区域找到 VR 查看器
2. 用鼠标左键按住并拖动查看 360° 全景
3. 使用鼠标滚轮放大/缩小

### 添加自定义全景图

在 `src/app/page.tsx` 中更新 `mainProduct` 的 `vrImage` 字段：

```typescript
vrImage: 'https://your-image-url.com/panorama.jpg'
```

### 自定义产品数据

编辑 `src/app/page.tsx` 中的 `mainProduct` 和 `recommendedProducts` 数组来修改产品信息。

### 修改背景风格

编辑 `src/components/ChineseBackground.tsx` 来自定义背景设计：
- 修改颜色值
- 调整不透明度
- 更改纹样设计

## 响应式设计

页面在以下设备上都有优化：
- 📱 移动设备 (320px+)
- 📱 平板设备 (768px+)
- 🖥️ 桌面设备 (1024px+)

## 性能优化

- ✅ 图片优化和懒加载
- ✅ 组件代码分割
- ✅ CSS 优化
- ✅ Babylon.js 场景优化

## 浏览器支持

- Chrome / Edge (最新版本)
- Firefox (最新版本)
- Safari (最新版本)
- 不支持 IE 11

## 相关文件

- `ChineseBackground.tsx` - 中国元素背景组件
- `VRPanoramaViewer.tsx` - VR 全景查看器
- `MainProduct.tsx` - 主产品展示
- `RecommendedProducts.tsx` - 推荐产品展示

## 常见问题

### Q: VR 全景图加载很慢
A: 确保使用的是优化过的图片格式（JPG、WebP），建议大小在 2MB 以下

### Q: 如何修改中国元素背景
A: 编辑 `ChineseBackground.tsx` 中的 SVG 定义和渐变颜色

### Q: 如何添加购物车功能
A: 需要在对应的按钮点击处理中集成后端 API

## 许可证

© 2024 钛光钛杯. All rights reserved.
