# 快速入门指南 (Quick Start Guide)

## 项目完成情况 (Project Status)

✅ **项目构建成功！** (Project built successfully!)

您的钛杯产品展示独立站已完全搭建完成，包含所有需要的功能。

## 项目位置 (Project Location)

```
d:\钛杯工坊网站\titanium-cup-showcase
```

## 如何运行 (How to Run)

### 1. 启动开发服务器 (Start Development Server)

```bash
cd d:\钛杯工坊网站\titanium-cup-showcase
npm run dev
```

然后在浏览器中打开: http://localhost:3000

### 2. 生产构建 (Production Build)

```bash
npm run build
npm run start
```

## 网站功能 (Features)

### 🏠 首页 (Home Page)
- URL: `http://localhost:3000`
- 展示品牌信息和产品特点
- 导航到产品页面和管理后台

### 📦 产品页面 (Products Page)
- URL: `http://localhost:3000/products`
- 显示所有产品卡片
- 支持VR 360°标签显示
- 点击查看产品详情

### 🎮 产品详情 (Product Detail)
- URL: `http://localhost:3000/products/[id]`
- 产品完整信息、描述和价格
- **VR 360° 全景图查看器** - 点击"Show VR 360°"按钮
- 产品规格说明

### 🛠️ 管理后台 (Admin Panel)
- URL: `http://localhost:3000/admin`
- **添加新产品**: 填写表单信息
  - 产品名称 (Product Name)
  - 产品描述 (Description)
  - 价格 (Price in USD)
  - 规格说明 (Specifications)
- **上传产品图片**: 点击上传区域
  - 支持 JPG, PNG, GIF, WebP
- **上传VR全景图** (可选): 
  - 支持高分辨率全景图
  - 推荐格式: 等距柱状投影 (2:1 宽高比)
- **产品管理**: 查看所有产品和删除

## 演示数据 (Demo Data)

系统预置了两个示例产品:

1. **Premium Titanium Cup** - $49.99
   - 包含VR 360° 全景图
   
2. **Deluxe Titanium Mug** - $59.99

进入管理后台添加更多产品!

## 技术栈 (Technology Stack)

- **Next.js 16.2.6** - React 框架
- **TypeScript** - 类型安全
- **Tailwind CSS** - 样式框架
- **Babylon.js** - VR/360° 全景图引擎
- **Node.js v24.16.0** - 运行环境

## 项目结构 (Project Structure)

```
titanium-cup-showcase/
├── src/
│   ├── app/
│   │   ├── page.tsx              # 首页
│   │   ├── products/page.tsx     # 产品列表页
│   │   ├── products/[id]/page.tsx # 产品详情页
│   │   ├── admin/page.tsx        # 管理后台
│   │   └── api/                  # API路由
│   └── components/               # React组件
├── public/products/              # 产品图片文件夹
└── README.md                     # 详细文档
```

## 常用命令 (Common Commands)

```bash
# 启动开发服务器
npm run dev

# 编译项目
npm run build

# 启动生产服务器
npm start

# 代码检查
npm run lint

# 清理构建文件
rm -rf .next
```

## 自定义内容 (Customize)

### 修改品牌名称
编辑 `src/app/page.tsx` 和 `src/app/products/page.tsx`:
```typescript
"Titanium Cup Showcase" → 您的品牌名称
```

### 修改公司联系信息
编辑各页面的 footer 部分:
- Email: info@titaniumcup.com
- Phone: +1-800-TITANIUM

### 修改颜色主题
编辑 `tailwind.config.ts` 修改配色:
```typescript
colors: {
  blue: {
    600: '#your-color'
  }
}
```

## 下一步 (Next Steps)

### 1️⃣ 生产环境配置 (Production Setup)
- 配置真实数据库 (MongoDB/PostgreSQL)
- 配置云存储 (AWS S3/Azure/Google Cloud)
- 配置认证系统 (NextAuth.js)

### 2️⃣ 部署 (Deployment)

**最简单方式 - Vercel 部署:**

1. 将代码推送到 GitHub
2. 在 https://vercel.com 连接仓库
3. 一键部署

**其他部署方式:**
- 自建服务器 (Ubuntu/CentOS)
- Docker 容器化部署
- AWS/Azure/Google Cloud 云平台

### 3️⃣ 域名配置 (Domain Setup)
- 购买域名
- 配置 DNS 指向您的服务器
- 启用 HTTPS/SSL

### 4️⃣ 完善功能 (Add Features)
- 购物车功能
- 支付集成 (Stripe/PayPal)
- 用户账户系统
- 订单管理

## 常见问题 (FAQ)

**Q: VR 全景图怎么上传?**
A: 
1. 进入 Admin Panel (`/admin`)
2. 在表单中填写产品信息
3. 上传产品图片
4. 上传 VR 全景图 (可选)
5. 点击 "Create Product"

**Q: 图片应该是什么格式?**
A: 支持 JPG, PNG, GIF, WebP 格式
- 产品图片: 建议 800x600px 或更大
- VR 全景图: 建议 2048x1024px 或更大 (2:1 宽高比)

**Q: 如何修改产品信息?**
A: 目前系统支持添加和删除。要修改，请先删除再重新添加。

**Q: 生产环境数据在哪里保存?**
A: 当前使用内存存储（刷新页面后丢失）。生产环境需要配置数据库。

## 文件上传配置 (File Upload Configuration)

当前系统使用模拟存储。生产环境需要配置真实存储:

编辑 `src/app/api/upload/route.ts`:

```typescript
// 替换为您的云存储服务
// 示例: AWS S3
import AWS from 'aws-sdk';

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

// 上传文件到 S3
await s3.upload({
  Bucket: process.env.S3_BUCKET,
  Key: fileName,
  Body: fileBuffer,
}).promise();
```

## 获取帮助 (Get Help)

- 📖 [Next.js 文档](https://nextjs.org/docs)
- 🎮 [Babylon.js 文档](https://doc.babylonjs.com/)
- 🎨 [Tailwind CSS 文档](https://tailwindcss.com/docs)
- 📝 [TypeScript 官网](https://www.typescriptlang.org/)

## 许可证 (License)

MIT License - 可自由用于商业项目

---

**项目创建时间**: 2024年5月28日
**框架版本**: Next.js 16.2.6
**Node版本**: v24.16.0

**开始使用**: `npm run dev` 🚀
