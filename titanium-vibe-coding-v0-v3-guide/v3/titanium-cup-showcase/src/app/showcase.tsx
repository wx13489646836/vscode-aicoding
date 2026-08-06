import ChineseBackground from '@/components/ChineseBackground';
import MainProduct from '@/components/MainProduct';
import RecommendedProducts from '@/components/RecommendedProducts';

// 产品数据
const mainProduct = {
  id: 'titanium-cup-main',
  name: '钛光钛之美',
  description:
    '台湾纯钛 × 加贺山中涂 × 蒸三条精密加工。日本工艺之美，在这一次，被完整实现。钛光钛杯是由"纯钛、涂装与金合"共同完成的工艺品。钛造以纯钛为基底，结合石川加贺，拥有四百年历史的山中工艺。',
  imageUrl: '/images/main-product.jpg',
  price: 128.0,
  hasVR: true,
  vrImage: '/images/vr/main-product-panorama.jpg',
  specifications: {
    material: '纯钛（台湾纯钛）',
    capacity: '300ml',
    weight: '150g',
    dimensions: '直径 85mm × 高 95mm',
  },
};

const recommendedProducts = [
  {
    id: 'silicone-base-set',
    name: 'Silicone Base Set',
    imageUrl: '/images/products/silicone-base.jpg',
    colors: ['6 Colors'],
    features: ['Silicone', 'Anti-slip'],
  },
  {
    id: 'titanium-cup-colorful',
    name: 'Pure Titanium Bounce Cup',
    imageUrl: '/images/products/colorful-cup.jpg',
    colors: ['Moon Cyan', 'Milkshake White'],
    capacity: '350ml',
    features: ['Pure Titanium', 'Antibacterial'],
  },
  {
    id: 'straw-set',
    name: 'Straw Set',
    imageUrl: '/images/products/straw-set.jpg',
    colors: ['Thin', 'Thick'],
    features: ['800ml Compatible', 'Pure Titanium'],
  },
  {
    id: 'portable-bag',
    name: 'Portable Cup Sleeve',
    imageUrl: '/images/products/portable-bag.jpg',
    colors: ['Feather Silver', 'Milkshake White'],
    features: ['Pure Titanium', 'Bounce Cover'],
  },
  {
    id: 'large-cup',
    name: 'Large Capacity Cup Mini',
    imageUrl: '/images/products/large-cup.jpg',
    colors: ['Crystal Pink', 'Crystal Gold'],
    features: ['Pure Titanium', 'Bounce Cover'],
  },
  {
    id: 'travel-set',
    name: 'Travel Set',
    imageUrl: '/images/products/travel-set.jpg',
    colors: ['Orchid Pink', 'Rose Gold'],
    features: ['Pure Titanium', 'Bounce Cover'],
  },
  {
    id: 'gift-box',
    name: 'Gift Box Set',
    imageUrl: '/images/products/gift-box.jpg',
    colors: ['Orchid Pink', 'Rose Gold'],
    features: ['Pure Titanium', 'Gift Ready'],
  },
  {
    id: 'premium-set',
    name: 'Premium Collection',
    imageUrl: '/images/products/premium-set.jpg',
    colors: ['Pearl Black', 'Rose Gold'],
    features: ['Pure Titanium', 'Bounce Cover'],
  },
];

export default function ProductShowcase() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <ChineseBackground />

      {/* Header */}
      <header className="bg-white shadow-md sticky top-0 z-40">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
            钛光钛杯
          </div>
          <div className="hidden sm:flex gap-6">
            <a href="/" className="text-gray-700 hover:text-blue-600 font-medium transition-colors">
              首页
            </a>
            <a href="#" className="text-gray-700 hover:text-blue-600 font-medium transition-colors">
              产品
            </a>
            <a href="#" className="text-gray-700 hover:text-blue-600 font-medium transition-colors">
              关于我们
            </a>
            <button className="bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors">
              购物车
            </button>
          </div>
        </nav>
      </header>

      {/* 主要产品模块 */}
      <MainProduct product={mainProduct} />

      {/* 推荐产品模块 */}
      <RecommendedProducts products={recommendedProducts} />

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300 py-12 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            <div>
              <h3 className="text-white font-semibold mb-4">关于钛光</h3>
              <p className="text-sm leading-relaxed">
                致力于传承日本工艺美学，将台湾纯钛与传统涂装艺术完美结合，打造每一件工艺品。
              </p>
            </div>
            <div>
              <h3 className="text-white font-semibold mb-4">快速链接</h3>
              <ul className="text-sm space-y-2">
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    产品列表
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    VR 展示
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    联系我们
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-white font-semibold mb-4">联系信息</h3>
              <p className="text-sm">邮箱: info@titanium-cup.com</p>
              <p className="text-sm">电话: +886-1-800-TITANIUM</p>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8 text-center text-sm">
            <p>&copy; 2024 钛光钛杯展示。版权所有。</p>
          </div>
        </div>
      </footer>
    </main>
  );
}
