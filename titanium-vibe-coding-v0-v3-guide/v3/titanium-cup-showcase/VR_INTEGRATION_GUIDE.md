# VR 产品图集成指南

## 📋 项目现状分析

### ✅ 已有的 VR 支持基础设施
- **VR 查看器组件**: `VRPanoramaViewer.tsx` - 使用 BabylonJS 引擎
- **主产品页面**: `MainProduct.tsx` - 已集成 VR 查看器
- **全景展示**: 支持 360° 交互式全景图查看
- **渲染方式**: Babylon.js 的 UniversalCamera + Sphere mesh

### 📐 现有 VR 配置
```javascript
// src/app/page.tsx 中的主产品数据
const mainProduct = {
  id: 'titanium-cup-main',
  name: '钛光钛之美',
  hasVR: true,
  vrImage: 'https://via.placeholder.com/1200x800?text=VR+Panorama', // ← 需要替换
  // ...
};
```

### 📁 公共资源目录结构
```
public/
├── file.svg
├── globe.svg
├── next.svg
├── vercel.svg
├── window.svg
└── products/          # 推荐创建 VR 图片目录
```

---

## 🚀 VR 产品图集成步骤

### 第一步：准备 VR 全景图

**关键问题**：您的 ZIP 文件包含什么格式的全景图？

#### 场景 A: 单个 360° 全景图 (推荐)
- **格式**: Equirectangular 全景图 (常见)
- **文件类型**: JPG、PNG、WebP
- **典型分辨率**: 4096×2048 或 2048×1024
- **操作**: 直接使用，无需转换

#### 场景 B: 多个面的立方体贴图 (6 张图)
- **文件**: front.jpg, back.jpg, left.jpg, right.jpg, top.jpg, bottom.jpg
- **当前问题**: VRPanoramaViewer 仅支持 Equirectangular 格式
- **解决方案**: 需要进行立方体→球形投影转换（见下文工具）

#### 场景 C: 条带式全景图 (多张水平条纹)
- **问题**: 同样需要转换
- **解决方案**: 同上

---

### 第二步：文件放置

**目标目录结构**:
```
public/
└── products/
    └── vr-panoramas/
        └── titanium-cup-360.jpg      # 全景图（建议名称）
```

**建议**:
1. 在 `public/products/` 下创建 `vr-panoramas/` 子目录
2. 将全景图放入，使用有意义的命名（如 `titanium-cup-360.jpg`）
3. 图片应优化大小（建议 2-4 MB 以内）

---

### 第三步：更新页面配置

**文件**: `src/app/page.tsx`

**修改前**:
```javascript
const mainProduct = {
  id: 'titanium-cup-main',
  name: '钛光钛之美',
  vrImage: 'https://via.placeholder.com/1200x800?text=VR+Panorama',
  // ...
};
```

**修改后**:
```javascript
const mainProduct = {
  id: 'titanium-cup-main',
  name: '钛光钛之美',
  vrImage: '/products/vr-panoramas/titanium-cup-360.jpg',  // ← 使用本地路径
  // ...
};
```

---

### 第四步：验证集成

1. **启动开发服务器**:
   ```bash
   npm run dev
   ```

2. **访问首页**: `http://localhost:3000`

3. **测试 VR 查看器**:
   - ✅ 全景图正确加载
   - ✅ 鼠标拖动可旋转视角
   - ✅ 滚轮可缩放
   - ✅ 加载状态显示正确

---

## 🔧 特殊情况处理

### 情况 1: 立方体贴图转换 (6 张图 → Equirectangular)

如果您的 ZIP 包含 6 张立方体贴图，需要转换：

**使用 ImageMagick** (Windows 上需要安装):
```bash
# 安装 ImageMagick
# Windows: 从 https://imagemagick.org/script/download.php 下载

# 转换命令示例（假设已有 6 张图）
magick convert -size 4096x2048 \
  xc:white \
  \( front.jpg -resize 1024x1024 -gravity center -composite \) \
  output.jpg
```

**使用在线工具** (推荐，无需安装):
1. 访问 https://cubemapconverter.com/
2. 上传 6 张立方体贴图
3. 下载 Equirectangular 全景图

**使用 Python** (需要安装 PIL):
```python
from PIL import Image
import math

def cubemap_to_equirectangular(front, back, left, right, top, bottom, width=4096, height=2048):
    # 复杂的投影转换逻辑
    # 见：https://github.com/sunset1995/360convert
    pass
```

### 情况 2: 图片格式转换

**JPG → WebP** (更优化的文件大小):
```bash
ffmpeg -i titanium-cup-360.jpg -c:v libwebp -quality 80 titanium-cup-360.webp
```

然后在 `page.tsx` 中更新为 `.webp` 格式。

### 情况 3: 高分辨率优化

如果图片超过 5 MB:
1. **使用 ImageMagick 缩小**:
   ```bash
   magick convert input.jpg -resize 2048x1024 -quality 85 output.jpg
   ```

2. **使用 FFmpeg**:
   ```bash
   ffmpeg -i input.jpg -vf scale=2048:1024 -q:v 5 output.jpg
   ```

---

## 📊 VRPanoramaViewer 技术详情

### 当前实现
```javascript
// BabylonJS 配置
- 相机: UniversalCamera (支持鼠标/触摸交互)
- 网格: Sphere (1000 直径, 64 分段)
- 纹理映射: StandardMaterial.emissiveTexture
- 采样模式: TRILINEAR (高质量)
- 水平镜像: uScale = -1 (正确的全景方向)
```

### 支持的图片格式
- ✅ JPEG
- ✅ PNG
- ✅ WebP
- ✅ AVIF (某些浏览器)

### 浏览器兼容性
- ✅ Chrome/Edge 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ 移动浏览器 (iOS Safari, Android Chrome)

---

## 🎯 建议的工作流程

### 快速开始 (5 分钟)
1. ✓ 确认 ZIP 文件中是单个全景图
2. ✓ 在 `public/products/vr-panoramas/` 创建目录
3. ✓ 解压全景图到该目录
4. ✓ 在 `src/app/page.tsx` 更新 `vrImage` 路径
5. ✓ 运行 `npm run dev` 测试

### 完整优化 (15 分钟)
1. ✓ 检查图片分辨率和文件大小
2. ✓ 如需优化，使用 ImageMagick/FFmpeg 处理
3. ✓ 考虑转换为 WebP 格式
4. ✓ 检查移动设备上的加载性能
5. ✓ 运行 `npm run build` 验证生产构建

---

## 📝 文件修改清单

### 需要修改的文件
- [ ] `src/app/page.tsx` - 更新 `vrImage` 字段

### 需要创建的目录
- [ ] `public/products/vr-panoramas/`

### 需要添加的文件
- [ ] `public/products/vr-panoramas/titanium-cup-360.jpg` (或对应格式)

---

## 🐛 常见问题排查

### 问题 1: 全景图不显示
**原因**: 路径错误或图片加载失败
**解决**:
1. 检查浏览器开发工具 Console 是否有错误
2. 验证文件是否在 `public/` 目录中
3. 确保路径前缀为 `/` (相对于 public)

### 问题 2: 图片加载缓慢
**原因**: 文件过大或网络问题
**解决**:
1. 检查文件大小（应 < 5 MB）
2. 转换为 WebP 格式
3. 使用图片优化工具

### 问题 3: 在移动设备上卡顿
**原因**: 分辨率过高或设备性能不足
**解决**:
1. 降低图片分辨率到 2048×1024
2. 减少 Sphere mesh 的分段数（改 64 为 32）
3. 在 VRPanoramaViewer.tsx 中调整

### 问题 4: 视角方向错误（倒过来或左右反)
**原因**: 全景图投影方式不同
**解决**: 在 VRPanoramaViewer.tsx 中调整:
```javascript
// 当前配置（Equirectangular 标准)
material.emissiveTexture.uScale = -1;  // 水平镜像

// 如果方向错误，尝试：
// material.emissiveTexture.uScale = 1;      // 不镜像
// material.emissiveTexture.vScale = -1;     // 垂直镜像
```

---

## 📚 有用的资源

### 全景图工具
- [Cubemap Converter](https://cubemapconverter.com/) - 立方体贴图转换
- [Panorama Converter](https://www.360toolkit.co/) - 全景图转换工具
- [ImageMagick](https://imagemagick.org/) - 图片处理

### 全景图格式
- [Equirectangular Format](https://en.wikipedia.org/wiki/Equirectangular_projection)
- [360 Photography Guide](https://www.360toolkit.co/guide)

### Babylon.js 文档
- [Babylon.js Textures](https://doc.babylonjs.com/features/featuresDeepDive/Meshes/Using_StandardMaterial)
- [Sphere Mesh](https://doc.babylonjs.com/features/featuresDeepDive/Meshes/MeshCreateTube)

---

## ✅ 验证清单

在生产环境前检查：

- [ ] 全景图在本地开发环境正确显示
- [ ] 鼠标拖动和缩放功能正常
- [ ] 图片在不同分辨率的设备上加载
- [ ] 页面加载时间 < 3 秒
- [ ] `npm run build` 构建成功
- [ ] 生产环境中全景图可正确访问

---

## 📞 后续支持

如需帮助，请提供：
1. ZIP 文件内的图片文件列表和格式
2. 图片分辨率信息
3. 任何错误消息或截图
4. 浏览器版本

---

**最后更新**: 2024年
**状态**: 准备就绪等待 VR 图片文件
