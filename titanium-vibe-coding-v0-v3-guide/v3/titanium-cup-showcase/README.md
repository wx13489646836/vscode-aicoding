# Titanium Cup Showcase Website

A modern, bilingual e-commerce platform featuring English product displays with VR/360° panoramic image support. Built with Next.js 14+, TypeScript, Tailwind CSS, and Babylon.js.

## 🎯 Features

- **Product Display**: Showcase titanium cup products with English descriptions
- **360° VR Panorama Viewer**: Immersive product viewing with Babylon.js
- **Admin Dashboard**: Easy product management with image uploads
- **Responsive Design**: Works seamlessly on desktop and mobile devices
- **Image Optimization**: Next.js built-in image optimization
- **Modern UI**: Clean, professional interface with Tailwind CSS

## 📋 Project Structure

```
src/
├── app/
│   ├── page.tsx                    # Home page
│   ├── products/
│   │   ├── page.tsx               # Products listing page
│   │   └── [id]/page.tsx          # Product detail page with VR viewer
│   ├── admin/
│   │   └── page.tsx               # Admin panel for product management
│   └── api/
│       ├── products/
│       │   ├── route.ts           # GET/POST products
│       │   └── [id]/route.ts      # GET/DELETE specific product
│       └── upload/
│           └── route.ts           # File upload handler
├── components/
│   ├── VRPanoramaViewer.tsx       # 360° panorama viewer component
│   ├── ProductCard.tsx            # Product card component
│   └── FileUpload.tsx             # File upload component
public/
├── products/                       # Product images folder
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- npm, yarn, pnpm, or bun

### Installation

1. Navigate to the project directory:
```bash
cd titanium-cup-showcase
```

2. Install dependencies:
```bash
npm install
```

### Development

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production Build

Build for production:

```bash
npm run build
npm run start
```

## 📸 Pages Overview

### Home Page (`/`)
- Hero section with call-to-action
- Features highlight section
- Navigation to products and admin

### Products Page (`/products`)
- Grid display of all products
- Product cards with VR indicator
- Quick navigation to product details

### Product Detail Page (`/products/[id]`)
- Full product information
- Product image display
- VR 360° panorama viewer toggle
- Product specifications
- Add to cart button

### Admin Panel (`/admin`)
- Add new products form
- Product image upload
- VR panorama image upload (optional)
- Product price and specifications
- Active products list with delete option

## 🎮 VR Panorama Viewer

The VR panorama viewer uses Babylon.js to create an immersive 360° experience:

- **Features**:
  - Smooth camera controls (mouse/touch)
  - Auto-rotating panorama option
  - Responsive viewport sizing
  - Loading optimization

- **Usage**:
  1. Upload a panoramic image in the admin panel
  2. Image format: Equirectangular projection (2:1 aspect ratio recommended)
  3. View in product detail page with VR toggle

## 📤 File Upload

The upload system handles:
- Product images (JPG, PNG, GIF, WebP)
- VR panorama images (high-resolution formats)
- Automatic file validation
- Mock storage (configure real storage in production)

### Production Upload Setup

Replace the mock upload handler in `src/app/api/upload/route.ts` with:
- AWS S3
- Azure Blob Storage
- Google Cloud Storage
- Or any other cloud storage service

## 🛠️ Technology Stack

- **Frontend**: Next.js 14+ with React & TypeScript
- **Styling**: Tailwind CSS + Custom CSS
- **VR Viewer**: Babylon.js for 360° panorama
- **File Upload**: FormData API with Next.js API Routes
- **Database**: Mock data (configure with MongoDB/PostgreSQL in production)
- **HTTP Client**: Axios (optional, can use fetch)

## 📦 Dependencies

Main packages:
- `next`: React framework
- `react`, `react-dom`: UI library
- `tailwindcss`: Utility-first CSS
- `babylonjs`: 3D engine for VR viewer
- `typescript`: Type safety
- `eslint`: Code linting

## 🔧 Configuration

### Environment Variables

Create a `.env.local` file for production:

```
NEXT_PUBLIC_API_URL=your_api_url
UPLOAD_STORAGE_URL=your_storage_url
```

### Next.js Configuration

- **Image Optimization**: Configured in `next.config.ts`
- **TypeScript**: Configured in `tsconfig.json`
- **Tailwind CSS**: Configured in `tailwind.config.ts`

## 📱 Responsive Design

- Mobile-first approach
- Breakpoints: sm (640px), md (768px), lg (1024px)
- Touch-friendly interfaces
- Optimized panorama viewer for all screen sizes

## 🚀 Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Deploy with one click

### Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

### Self-Hosted

1. Build: `npm run build`
2. Start: `npm run start`
3. Configure reverse proxy (nginx/Apache)
4. Set up SSL/TLS certificates

## 📊 Database Setup (Production)

For production use, configure one of:

### MongoDB
```javascript
// Add to API routes
import { MongoClient } from 'mongodb';
const client = new MongoClient(process.env.MONGODB_URI);
```

### PostgreSQL
```javascript
// Add to API routes
import { Pool } from 'pg';
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
```

## 🔒 Security Considerations

- Validate all file uploads
- Implement authentication for admin panel
- Use environment variables for sensitive data
- Configure CORS properly
- Sanitize user inputs
- Rate limit API endpoints

## 📝 License

MIT License - Feel free to use this project for commercial purposes.

## 🤝 Support

For issues and questions:
1. Check the [Next.js documentation](https://nextjs.org/docs)
2. Review [Babylon.js documentation](https://doc.babylonjs.com/)
3. Consult [Tailwind CSS docs](https://tailwindcss.com/docs)

## 🎓 Learning Resources

- [Next.js App Router](https://nextjs.org/docs/app)
- [Babylon.js Playground](https://playground.babylonjs.com/)
- [Tailwind CSS Tutorial](https://tailwindcss.com/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

---

**Created**: May 28, 2024
**Framework Version**: Next.js 16.2.6
**Node Version**: v18+
