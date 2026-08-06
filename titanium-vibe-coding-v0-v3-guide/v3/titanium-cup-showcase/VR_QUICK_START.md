# VR 产品图快速集成参考

> **快速查看**: 从解压 ZIP 到上线只需 5 分钟！

## 🎯 快速开始 (3 步完成)

### 步骤 1️⃣ : 解压文件
```bash
# 解压 VR 产品图 ZIP 文件到本地
# 例如: a44d7d546fda73dbc4910da62459a0c9.zip
```

### 步骤 2️⃣ : 运行集成脚本
```bash
cd d:\websites\titanium-cup-showcase

# Windows 用户 - Python 脚本
python setup-vr-images.py <解压后的全景图路径>

# 示例:
python setup-vr-images.py "C:\Users\xu\Downloads\panorama.jpg"

# 或者直接放在项目根目录，脚本会自动找到
copy "C:\Users\xu\Downloads\panorama.jpg" .
python setup-vr-images.py
```

### 步骤 3️⃣ : 验证并启动
```bash
# 启动开发服务器
npm run dev

# 打开浏览器访问
# http://localhost:3000
```

---

## 📊 检查你的文件

### 检查单个全景图
```bash
python panorama-processor.py "path/to/panorama.jpg"
```

**输出示例**:
```
📊 图片信息:
  路径: panorama.jpg
  分辨率: 4096 × 2048 px
  宽高比: 2.00:1
  格式: JPEG (RGB)
  文件大小: 3.45 MB
  ✅ 符合全景图规格 (2:1 宽高比)
```

### 检查目录中的所有图片
```bash
python panorama-processor.py "path/to/images/"
```

---

## 🔄 文件格式转换

### 优化图片大小 (推荐)
```bash
python panorama-processor.py <图片> --optimize

# 输出: 4.2 MB → 1.8 MB (减少 57%)
```

### 转换到 WebP (更小的体积)
```bash
python panorama-processor.py <图片> --webp

# 输出: 3.45 MB (JPEG) → 1.23 MB (WebP)
```

---

## 📁 最终文件结构

集成完成后的目录结构:
```
public/
└── products/
    └── vr-panoramas/
        └── titanium-cup-360.jpg    ← 你的全景图
        
src/app/
└── page.tsx                        ← 自动更新路径
```

**page.tsx 中的配置**:
```javascript
const mainProduct = {
  id: 'titanium-cup-main',
  vrImage: '/products/vr-panoramas/titanium-cup-360.jpg',  // ← 已更新
};
```

---

## ✅ 测试清单

在本地验证 (2 分钟):
- [ ] npm run dev 成功启动
- [ ] 页面加载无错误
- [ ] 全景图在 VR 查看器中显示
- [ ] 鼠标拖动可旋转视角
- [ ] 滚轮可缩放

在生产环境验证:
- [ ] npm run build 构建成功
- [ ] npm run start 启动生产服务器
- [ ] 全景图加载正常
- [ ] 在不同设备上测试 (手机/平板/桌面)

---

## 🚨 常见问题

| 问题 | 解决方案 |
|------|--------|
| 图片不显示 | ✓ 检查文件是否在 `public/products/vr-panoramas/` 目录<br/>✓ 确保路径前缀为 `/`<br/>✓ 检查浏览器控制台错误 |
| 加载缓慢 | ✓ 运行 `--optimize` 脚本<br/>✓ 转换为 WebP 格式<br/>✓ 检查文件大小 (应 < 5 MB) |
| 视角上下颠倒 | ✓ 编辑 `VRPanoramaViewer.tsx`<br/>✓ 改 `uScale: -1` → `uScale: 1` |
| 在手机上卡顿 | ✓ 降低分辨率到 2048×1024<br/>✓ 使用 WebP 格式<br/>✓ 减少 mesh 分段数 (64→32) |

---

## 📋 自动化脚本详解

### setup-vr-images.py
```bash
python setup-vr-images.py <全景图>

作用:
  1. 自动创建 public/products/vr-panoramas/ 目录
  2. 复制全景图到目标位置
  3. 自动更新 src/app/page.tsx 中的路径
  4. 提示后续操作步骤
```

### panorama-processor.py
```bash
python panorama-processor.py <文件或目录>

作用:
  1. 检测图片格式和分辨率
  2. 检测是否为 2:1 全景图
  3. 检测立方体贴图 (6 张图)
  4. 优化图片大小
  5. 转换格式 (JPG ↔ WebP)
```

---

## 🔗 全景图来源和格式

### 常见全景图格式

**✅ Equirectangular (推荐)**
- 宽高比: 2:1 (4096×2048 常见)
- 格式: JPG, PNG, WebP
- 兼容性: 最好
- 文件: 1 张

**⚠️ 立方体贴图 (需要转换)**
- 格式: 6 张正方形图
- 文件名: front, back, left, right, top, bottom
- 需要转换: https://cubemapconverter.com/

**⚠️ 球形贴图 (少见)**
- 格式: 1 张特殊投影
- 需要转换: 同上

---

## 📊 推荐的图片规格

| 用途 | 分辨率 | 格式 | 大小 | 质量 |
|------|--------|------|------|------|
| 快速预览 | 1024×512 | WebP | 200-400 KB | 75% |
| 标准显示 | 2048×1024 | WebP | 500-800 KB | 80% |
| 高质量 | 4096×2048 | WebP | 1-2 MB | 85% |
| 超高质量 | 8192×4096 | WebP | 3-5 MB | 90% |

---

## 🛠️ 高级配置

### 修改 VR 查看器性能

编辑 `src/components/VRPanoramaViewer.tsx`:

```javascript
// 减少分段数 (提高性能)
const sphere = BABYLON.MeshBuilder.CreateSphere(
  'panoramaSphere',
  { diameter: 1000, segments: 32 },  // ← 从 64 改为 32
  scene
);

// 调整鼠标灵敏度
camera.angularSensibility = 1000;    // ← 越大越不灵敏

// 调整缩放速度
camera.wheelPrecision = 50;          // ← 越大越灵敏
```

### 支持多个产品的 VR 图片

在 `src/app/page.tsx` 中:
```javascript
const products = [
  {
    id: 'titanium-cup-main',
    vrImage: '/products/vr-panoramas/titanium-cup-360.jpg',
  },
  {
    id: 'titanium-cup-colorful',
    vrImage: '/products/vr-panoramas/colorful-cup-360.jpg',
  },
  // 更多产品...
];
```

---

## 📚 更多资源

### 全景图转换工具
- **在线**: https://cubemapconverter.com/ (无需安装)
- **Python**: `pip install pillow numpy` + 自定义脚本
- **ImageMagick**: 命令行工具

### 全景图素材
- **免费**: https://polyhaven.com/ (HDRI)
- **付费**: https://www.sketchfab.com/ (3D 全景)

### 相关文档
- [Babylon.js Textures](https://doc.babylonjs.com/)
- [Equirectangular Format](https://en.wikipedia.org/wiki/Equirectangular_projection)

---

## 💡 提示

1. **优化很重要**: 全景图通常 2-4 MB，优化后可降到 500 KB-1 MB
2. **WebP 很划算**: 同样质量下比 JPG 小 30-50%
3. **测试很关键**: 在不同设备/网络条件下测试
4. **备份原文件**: 处理前备份原始全景图

---

**最后更新**: 2024年
**状态**: ✅ 准备就绪
