import Link from 'next/link';
import Image from 'next/image';
import ChineseBackground from '@/components/ChineseBackground';
import MainProduct from '@/components/MainProduct';
import RecommendedProducts from '@/components/RecommendedProducts';
import Model3DViewer from '@/components/Model3DViewer';
import Navbar from '@/components/Navbar';
import PageModelLoadingOverlay from '@/components/PageModelLoadingOverlay';

// Product data
const mainProduct = {
  id: 'titanium-cup-main',
  name: 'Han Dynasty Heavenly Horse Pattern Pure Titanium Thermos',
  description:
    'A masterpiece of pure titanium craftsmanship. Featuring the iconic Han Dynasty Heavenly Horse motif, this thermos combines 4000-year-old artistic heritage with cutting-edge titanium technology. 99.95% titanium content, naturally antibacterial, acid-base resistant, preserving the authentic taste of every brew.',
  imageUrl: '/products/main-new-white.jpg',
  price: 37.0,
  hasVR: true,
  vrImage: 'https://via.placeholder.com/1200x800?text=VR+Panorama',
  images: [
    '/products/main-new-white.jpg',
    '/products/detail-scene-2.jpg',
    '/products/detail-scene-3.jpg',
    '/products/detail-scene-4.jpg',
    '/products/detail-scene-5.jpg',
    '/products/product-video-h264.mp4',
  ],
  specifications: {
    material: 'Pure Titanium (99.95%)',
    capacity: '300ml',
    weight: '150g',
    dimensions: 'Dia. 85mm × H 95mm',
  },
};

const recommendedProducts = [
  // Page 1 products
  {
    id: 'titanium-chopsticks',
    name: 'TAIC Pure Titanium Chopsticks',
    imageUrl: '/products/product-1.jpg',
    colors: ['Monet · Ocean Blue', 'Monet · Moon Silver', 'Monet · Radiant Gold'],
    features: ['Exquisite', 'Portable', 'Healthy', 'Lightweight', 'Pure Titanium', 'EU SGS Certified'],
    views: 2117,
  },
  {
    id: 'planet-cup',
    name: 'Planet Cup',
    imageUrl: '/products/product-2.jpg',
    colors: ['Monet · Ocean Blue', 'Monet · Maple Red'],
    capacity: '550ml',
    features: ['Inner & Outer Pure Titanium', 'Antibacterial', 'Gemstone Texture', 'Gift Group Purchase', 'EU SGS Certified'],
    views: 644,
  },
  {
    id: 'round-fusion-cup',
    name: 'Pure Titanium Round Fusion Cup',
    imageUrl: '/products/product-3.jpg',
    colors: ['Monet · Ocean Blue', 'Monet · Maple Red', 'Monet · Dream Purple', 'Monet · Radiant Gold', 'Monet · Moon Silver'],
    capacity: '200ml',
    features: ['Pure Titanium', 'Antibacterial', 'No Spray Coating', 'Gift Group Purchase', 'EU SGS Certified'],
    views: 2193,
  },
  {
    id: 't-thermos-cup',
    name: 'Pure Titanium T-Shaped Thermos',
    imageUrl: '/products/product-4.jpg',
    colors: ['Monet · Ocean Blue', 'Monet · Maple Red', 'Monet · Radiant Gold', 'Monet · Moon Silver', 'Monet · Dream Purple'],
    capacity: '420ml / 330ml / 280ml',
    features: ['Pure Titanium', 'Antibacterial', 'Gemstone Texture', 'Naturally Outstanding', 'Gift Group Purchase', 'EU SGS Certified'],
    views: 1984,
  },
  // Page 2 products
  {
    id: 'coffee-cup',
    name: 'Pure Titanium Coffee Cup',
    imageUrl: '/products/product-5.webp',
    colors: ['Monet · Ocean Blue', 'Monet · Maple Red', 'Monet · Radiant Gold'],
    capacity: '480ml',
    features: ['Pure Titanium', 'Antibacterial', 'Gemstone Texture', 'Naturally Outstanding', 'Gift Group Purchase', 'EU SGS Certified'],
    views: 853,
  },
  {
    id: 'steeping-cup',
    name: 'Pure Titanium Steeping Cup',
    imageUrl: '/products/product-6.webp',
    colors: ['Monet · Ocean Blue', 'Monet · Maple Red', 'Monet · Radiant Gold', 'Monet · Moon Silver', 'Monet · Dream Purple'],
    capacity: '420ml',
    features: ['Pure Titanium', 'Antibacterial', 'Gemstone Texture', 'Naturally Outstanding', 'Gift Group Purchase', 'EU SGS Certified'],
    views: 1376,
  },
  {
    id: 'direct-filter-cup',
    name: 'Pure Titanium Direct Filter Cup',
    imageUrl: '/products/product-7.webp',
    colors: ['Monet · Ocean Blue', 'Monet · Maple Red', 'Monet · Radiant Gold', 'Monet · Moon Silver', 'Monet · Dream Purple'],
    capacity: '480ml / 400ml / 260ml / 220ml',
    features: ['Pure Titanium', 'Antibacterial', 'Gemstone Texture', 'Naturally Outstanding', 'Gift Group Purchase', 'EU SGS Certified'],
    views: 2467,
  },
  {
    id: 'tea-separation-glass',
    name: 'Tea-Water Separation Glass Cup',
    imageUrl: '/products/product-8.webp',
    colors: ['Monet · Ocean Blue', 'Monet · Moon Silver', 'Monet · Radiant Gold'],
    capacity: '360ml',
    features: ['Tea-Water Separation', 'Integrated Design', 'Borosilicate Glass', 'Heat Resistant', 'Pure Titanium Parts', 'Healthy Freshness'],
    views: 2944,
  },
];

export default function Home() {
  return (
    <main className="min-h-screen relative z-10">
      <PageModelLoadingOverlay />
      <ChineseBackground />
      <Navbar />

      {/* Hero */}
      <section className="relative py-16 md:py-24 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-amber-950/5 to-transparent"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="flex flex-col items-center text-center">
            <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold text-white mb-4 leading-tight tracking-tight">
              Pure Titanium Collection
            </h1>
            <p className="text-gray-400 text-base md:text-lg max-w-xl mb-8 leading-relaxed">
              Crafted with premium titanium. Naturally antibacterial. EU SGS Certified.
            </p>
            <Link
              href="/products"
              className="px-8 py-3 rounded-none text-sm font-semibold tracking-[0.2em] border border-white/30 text-white hover:bg-white hover:text-black transition-all duration-300"
            >
              VIEW ALL PRODUCTS
            </Link>
          </div>
        </div>
      </section>

      {/* Featured Product - Gallery with white image + video */}
      <MainProduct product={mainProduct} />

      {/* 3D Model Viewer - Below product details */}
      <section className="py-20 md:py-28 relative">
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-black/20 pointer-events-none"></div>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-10">
            <span className="text-gray-500 text-xs font-medium tracking-[0.3em] uppercase">Interactive Experience</span>
            <h2 className="text-2xl md:text-3xl font-bold text-white mt-2">3D & VR VIEW</h2>
          </div>
          <div className="relative w-full h-[450px] md:h-[550px] lg:h-[620px] rounded-xl overflow-hidden bg-black/40 border border-white/5">
            <Model3DViewer
              modelUrl="/products/model/person-cup/1fc6efad408e0e29cd41b44a8aa88efc.obj"
              title="Pure Titanium Thermos - 3D View"
            />
          </div>
          <p className="text-center text-gray-500 text-xs mt-3 tracking-wider">DRAG TO ROTATE · SCROLL TO ZOOM · INTERACTIVE 3D MODEL</p>
        </div>
      </section>

      {/* Product Experience - Scene Showcase */}
      <section className="py-16 md:py-24 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-amber-950/5 to-transparent pointer-events-none"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-12">
            <span className="text-gray-500 text-xs font-medium tracking-[0.3em] uppercase">Experience</span>
            <h2 className="text-2xl md:text-3xl font-bold text-white mt-2">CRAFTED FOR EVERY MOMENT</h2>
          </div>

          <div className="space-y-16 md:space-y-24">
            {/* Scene 1 - Han Dynasty Heavenly Horse */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10 items-center">
              <div className="relative aspect-[4/3] rounded-xl overflow-hidden">
                <Image
                  src="/products/detail-1-wide.png"
                  alt="Han Dynasty Heavenly Horse Pattern"
                  fill
                  className="object-cover"
                />
              </div>
              <div className="space-y-4">
                <span className="text-amber-400 text-xs font-semibold tracking-[0.3em] uppercase">Heritage</span>
                <h3 className="text-2xl md:text-3xl font-bold text-white">Han Dynasty Heavenly Horse</h3>
                <p className="text-gray-400 leading-relaxed">
                  Inspired by the iconic Silk Road artifacts, the Heavenly Horse motif brings 2,000 years of Chinese artistic heritage to your everyday life. Each pattern is precision-etched onto pure titanium, creating a timeless piece that bridges ancient art and modern craftsmanship.
                </p>
                <div className="flex gap-3 pt-2">
                  <span className="px-3 py-1 border border-amber-500/30 text-amber-300 text-xs rounded-full">100% Titanium</span>
                  <span className="px-3 py-1 border border-amber-500/30 text-amber-300 text-xs rounded-full">Cultural Heritage</span>
                </div>
              </div>
            </div>

            {/* Scene 2 - Pure Titanium Inside & Out */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10 items-center">
              <div className="space-y-4 md:order-1">
                <span className="text-amber-400 text-xs font-semibold tracking-[0.3em] uppercase">Purity</span>
                <h3 className="text-2xl md:text-3xl font-bold text-white">Pure Titanium, Inside & Out</h3>
                <p className="text-gray-400 leading-relaxed">
                  Both the interior and exterior are crafted from pure titanium. Unlike stainless steel or plastic linings, titanium never releases harmful substances, keeping your beverages pure and safe. Naturally antibacterial, it preserves the authentic taste of every drink — from morning coffee to evening tea.
                </p>
                <div className="flex gap-3 pt-2">
                  <span className="px-3 py-1 border border-amber-500/30 text-amber-300 text-xs rounded-full">Antibacterial</span>
                  <span className="px-3 py-1 border border-amber-500/30 text-amber-300 text-xs rounded-full">No Metal Taste</span>
                </div>
              </div>
              <div className="relative aspect-[4/3] rounded-xl overflow-hidden md:order-2">
                <Image
                  src="/products/detail-2-wide.png"
                  alt="Pure Titanium Inside and Out"
                  fill
                  className="object-cover"
                />
              </div>
            </div>

            {/* Scene 3 - Pure Titanium Tea Strainer */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10 items-center">
              <div className="relative aspect-[4/3] rounded-xl overflow-hidden">
                <Image
                  src="/products/detail-3-wide.png"
                  alt="Pure Titanium Tea Strainer"
                  fill
                  className="object-cover"
                />
              </div>
              <div className="space-y-4">
                <span className="text-amber-400 text-xs font-semibold tracking-[0.3em] uppercase">Function</span>
                <h3 className="text-2xl md:text-3xl font-bold text-white">Pure Titanium Tea Strainer</h3>
                <p className="text-gray-400 leading-relaxed">
                  The built-in pure titanium tea strainer separates tea leaves from your brew in seconds. Fine filtration ensures a smooth, sediment-free cup every time. Enjoy the ritual of tea without the hassle — pour with confidence, sip with pleasure.
                </p>
                <div className="flex gap-3 pt-2">
                  <span className="px-3 py-1 border border-amber-500/30 text-amber-300 text-xs rounded-full">Fine Filtration</span>
                  <span className="px-3 py-1 border border-amber-500/30 text-amber-300 text-xs rounded-full">Quick Separation</span>
                </div>
              </div>
            </div>

            {/* Scene 4 - Acid & Base Resistant */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10 items-center">
              <div className="space-y-4 md:order-1">
                <span className="text-amber-400 text-xs font-semibold tracking-[0.3em] uppercase">Safety</span>
                <h3 className="text-2xl md:text-3xl font-bold text-white">Acid & Base Resistant</h3>
                <p className="text-gray-400 leading-relaxed">
                  Pure titanium stands up to both acidic and alkaline beverages without reacting. Whether it's citrus juice, coffee, or herbal tea, the original flavor remains untouched. No metallic aftertaste, no chemical leaching — just pure, unaltered taste in every sip.
                </p>
                <div className="flex gap-3 pt-2">
                  <span className="px-3 py-1 border border-amber-500/30 text-amber-300 text-xs rounded-full">Corrosion Resistant</span>
                  <span className="px-3 py-1 border border-amber-500/30 text-amber-300 text-xs rounded-full">Original Taste</span>
                </div>
              </div>
              <div className="relative aspect-[4/3] rounded-xl overflow-hidden md:order-2">
                <Image
                  src="/products/detail-4-wide.png"
                  alt="Acid and Base Resistant"
                  fill
                  className="object-cover"
                />
              </div>
            </div>

            {/* Scene 5 - Premium Gift Box */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10 items-center">
              <div className="relative aspect-[4/3] rounded-xl overflow-hidden">
                <Image
                  src="/products/detail-5-wide.png"
                  alt="Premium Gift Box"
                  fill
                  className="object-cover"
                />
              </div>
              <div className="space-y-4">
                <span className="text-amber-400 text-xs font-semibold tracking-[0.3em] uppercase">Gifting</span>
                <h3 className="text-2xl md:text-3xl font-bold text-white">Exquisite Gift Box</h3>
                <p className="text-gray-400 leading-relaxed">
                  Presented in a beautifully crafted gift box with matching gift bag, the Titanium Workshop thermos makes an unforgettable present. Whether for business partners, family, or friends, giving the gift of titanium shows refined taste and genuine care for their health.
                </p>
                <div className="flex gap-3 pt-2">
                  <span className="px-3 py-1 border border-amber-500/30 text-amber-300 text-xs rounded-full">Gift Ready</span>
                  <span className="px-3 py-1 border border-amber-500/30 text-amber-300 text-xs rounded-full">Elegant Packaging</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Recommended Products */}
      <RecommendedProducts products={recommendedProducts} />

      {/* Footer */}
      <footer id="contact" className="border-t border-white/5 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <Link href="/" className="text-lg font-bold text-white tracking-[0.3em] uppercase">
              TITANIUM WORKSHOP
            </Link>
            <div className="flex items-center gap-8">
              {['HOME', 'PRODUCT', 'BRAND', 'SHOP', 'NEWS', 'SERVICE'].map((item) => (
                <Link
                  key={item}
                  href={item === 'HOME' ? '/' : item === 'PRODUCT' || item === 'SHOP' ? '/products' : `/#${item.toLowerCase()}`}
                  className="text-xs text-gray-500 hover:text-white tracking-[0.15em] transition-colors"
                >
                  {item}
                </Link>
              ))}
            </div>
            <p className="text-gray-600 text-xs tracking-wide">&copy; 2026 TITANIUM WORKSHOP. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </main>
  );
}
