'use client';

import ProductCard from './ProductCard';
import Link from 'next/link';

interface Product {
  id: string;
  name: string;
  imageUrl: string;
  colors: string[];
  capacity?: string;
  features: string[];
  views?: number;
  has3D?: boolean;
  hasVR?: boolean;
}

interface RecommendedProductsProps {
  products: Product[];
}

export default function RecommendedProducts({ products }: RecommendedProductsProps) {
  return (
    <section className="relative py-16 md:py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Title */}
        <div className="text-center mb-12">
          <span className="text-gray-500 text-xs font-medium tracking-[0.3em] uppercase">Products</span>
          <h2 className="text-2xl md:text-3xl font-bold text-white mt-2">
            Explore Our Products
          </h2>
        </div>

        {/* Product grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 items-stretch">
          {products.map((product) => (
              <ProductCard
                key={product.id}
                id={product.id}
                name={product.name}
                imageUrl={product.imageUrl}
                colors={product.colors}
                capacity={product.capacity}
                features={product.features}
                views={product.views}
                has3D={product.has3D}
                hasVR={product.hasVR}
              />
          ))}
        </div>

        {/* View all button */}
        <div className="mt-12 text-center">
          <Link href="/products">
            <button className="inline-flex items-center px-8 py-3 border border-white/20 text-white text-sm font-semibold tracking-[0.15em] hover:bg-white hover:text-black transition-all duration-300">
              VIEW ALL PRODUCTS
            </button>
          </Link>
        </div>
      </div>
    </section>
  );
}
