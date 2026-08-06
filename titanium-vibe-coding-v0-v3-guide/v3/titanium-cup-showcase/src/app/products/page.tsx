'use client';

import { useEffect, useState } from 'react';
import ProductCard from '@/components/ProductCard';
import Navbar from '@/components/Navbar';
import ChineseBackground from '@/components/ChineseBackground';
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
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await fetch('/api/products');
        const data = await response.json();
        setProducts(data.products || []);
      } catch (error) {
        console.error('Failed to fetch products:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  return (
    <main className="min-h-screen">
      <ChineseBackground />
      <Navbar />

      {/* Products Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-2xl md:text-3xl font-bold text-white mb-12 tracking-wide">ALL PRODUCTS</h1>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-400 text-lg">Loading...</p>
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-400 text-lg mb-4">No products available</p>
            <Link href="/admin">
              <button className="border border-white/20 text-white px-6 py-2 text-sm font-semibold tracking-wider hover:bg-white hover:text-black transition-all">
                ADD PRODUCT
              </button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                id={product.id}
                name={product.name}
                imageUrl={product.imageUrl}
                colors={[]}
                capacity={product.specifications ? product.specifications.split('\n').find(s => s.includes('Capacity'))?.split(': ')[1] : undefined}
                features={['Pure Titanium', 'Antibacterial', 'EU SGS Certified']}
                views={undefined}
                has3D={!!product.model3dUrl}
                hasVR={!!product.vrImageUrl}
              />
            ))}
          </div>
        )}
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8 mt-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-gray-600 text-xs tracking-wide">&copy; 2026 TITANIUM WORKSHOP. All rights reserved.</p>
        </div>
      </footer>
    </main>
  );
}
