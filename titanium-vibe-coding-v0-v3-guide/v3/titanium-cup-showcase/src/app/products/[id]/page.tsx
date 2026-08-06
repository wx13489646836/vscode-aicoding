'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import VRPanoramaViewer from '@/components/VRPanoramaViewer';
import Model3DViewer from '@/components/Model3DViewer';
import Navbar from '@/components/Navbar';
import ChineseBackground from '@/components/ChineseBackground';
import RecommendedProducts from '@/components/RecommendedProducts';
import Link from 'next/link';

interface Product {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  vrImageUrl?: string;
  model3dUrl?: string;
  price?: number;
  specifications?: string;
  images?: string[];
}

const recommendedProducts = [
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

export default function ProductDetailPage() {
  const params = useParams();
  const productId = params.id as string;
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);

  const [activeImgIdx, setActiveImgIdx] = useState(0);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const response = await fetch(`/api/products/${productId}`);
        const data = await response.json();
        setProduct(data.product);
      } catch (error) {
        console.error('Failed to fetch product:', error);
      } finally {
        setLoading(false);
      }
    };

    if (productId) {
      fetchProduct();
    }
  }, [productId]);

  if (loading) {
    return (
      <main className="min-h-screen">
        <ChineseBackground />
        <Navbar />
        <div className="min-h-[60vh] flex items-center justify-center">
          <p className="text-gray-400 text-lg">Loading...</p>
        </div>
      </main>
    );
  }

  if (!product) {
    return (
      <main className="min-h-screen">
        <ChineseBackground />
        <Navbar />
        <div className="min-h-[60vh] flex flex-col items-center justify-center">
          <p className="text-gray-400 text-lg mb-4">Product not found</p>
          <Link href="/products">
            <button className="border border-white/20 text-white px-6 py-2 text-sm font-semibold tracking-wider hover:bg-white hover:text-black transition-all">
              BACK TO PRODUCTS
            </button>
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F5F1EB]">
      <ChineseBackground />
      <Navbar />

      {/* Back to Products */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <Link href="/products" className="text-gray-600 hover:text-gray-900 font-medium mb-6 inline-block text-sm tracking-wider">
          ← BACK TO PRODUCTS
        </Link>
      </div>

      {/* Product Detail - Long Image */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div className="w-full">
          <img
            src="/products/detail-long.jpg"
            alt={product.name}
            className="w-full h-auto rounded-2xl shadow-2xl"
          />
        </div>
      </div>

      {/* 3D & VR Experience Section */}
      {(product.model3dUrl || product.vrImageUrl) && (
        <section className="bg-white py-16 border-t border-gray-200">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <span className="text-gray-500 text-xs font-medium tracking-[0.3em] uppercase">Interactive Experience</span>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mt-2">3D & VR VIEW</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {product.model3dUrl && (
                <div>
                  <div className="h-[400px] rounded-xl overflow-hidden bg-gray-900 border border-gray-200">
                    <Model3DViewer modelUrl={product.model3dUrl} title={product.name} />
                  </div>
                  <p className="text-center text-gray-500 text-xs mt-3 tracking-wider">DRAG TO ROTATE · SCROLL TO ZOOM</p>
                </div>
              )}

              {product.vrImageUrl && (
                <div>
                  <div className="h-[400px] rounded-xl overflow-hidden bg-gray-900 border border-gray-200">
                    <VRPanoramaViewer imageUrl={product.vrImageUrl} title={product.name} />
                  </div>
                  <p className="text-center text-gray-500 text-xs mt-3 tracking-wider">DRAG TO LOOK AROUND · 360° VIEW</p>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Other Products */}
      <RecommendedProducts products={recommendedProducts.filter(p => p.id !== productId)} />

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-gray-600 text-xs tracking-wide">&copy; 2026 TITANIUM WORKSHOP. All rights reserved.</p>
        </div>
      </footer>
    </main>
  );
}
