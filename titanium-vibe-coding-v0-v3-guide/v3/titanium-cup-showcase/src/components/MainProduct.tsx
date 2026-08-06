'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';

interface MainProductProps {
  product: {
    id: string;
    name: string;
    description: string;
    imageUrl: string;
    price: number;
    vrImage?: string;
    images?: string[];
    specifications?: {
      material: string;
      capacity: string;
      weight: string;
      dimensions: string;
    };
  };
}

export default function MainProduct({ product }: MainProductProps) {
  const allImages = product.images || [product.imageUrl];
  const [activeIndex, setActiveIndex] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);

  const isVideo = (url: string) => url.endsWith('.mp4') || url.endsWith('.webm');
  const activeItem = allImages[activeIndex];
  const showingVideo = isVideo(activeItem);

  useEffect(() => {
    if (!showingVideo || !videoRef.current) return;

    const video = videoRef.current;
    video.load();
    const playPromise = video.play();

    if (playPromise) {
      playPromise.catch(() => {
        // Controls remain visible so the user can start playback manually if autoplay is blocked.
      });
    }
  }, [activeItem, showingVideo]);

  return (
    <section className="relative py-12 md:py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Title */}
        <div className="text-center mb-12">
          <span className="text-gray-500 text-xs font-medium tracking-[0.3em] uppercase">Featured</span>
          <h2 className="text-2xl md:text-3xl font-bold text-white mt-2">FEATURED PRODUCT</h2>
        </div>

        {/* Product display */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-start">
          {/* Left: Image/Video Gallery */}
          <div className="space-y-4">
            {/* Main display */}
            {showingVideo ? (
              <div className="relative aspect-square bg-black rounded-lg overflow-hidden">
                <video
                  ref={videoRef}
                  key={activeItem}
                  autoPlay
                  muted
                  loop
                  playsInline
                  controls
                  preload="metadata"
                  className="w-full h-full object-contain"
                >
                  <source
                    src={activeItem}
                    type={activeItem.endsWith('.webm') ? 'video/webm' : 'video/mp4'}
                  />
                  Your browser does not support HTML5 video.
                </video>
              </div>
            ) : (
              <div className="relative aspect-square bg-white rounded-lg overflow-hidden">
                <Image
                  src={activeItem}
                  alt={product.name}
                  fill
                  className="object-contain"
                  priority
                />
              </div>
            )}

            {/* Thumbnail strip */}
            {allImages.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {allImages.map((img, idx) => (
                  <button
                    type="button"
                    key={idx}
                    onClick={() => setActiveIndex(idx)}
                    className={`relative w-16 h-16 flex-shrink-0 rounded-md overflow-hidden border-2 transition-all ${
                      idx === activeIndex
                        ? 'border-amber-500 opacity-100'
                        : 'border-white/10 opacity-60 hover:opacity-90'
                    }`}
                  >
                    {isVideo(img) ? (
                      <div className="w-full h-full bg-black/80 flex items-center justify-center pointer-events-none">
                        <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </div>
                    ) : (
                      <Image
                        src={img}
                        alt={`${product.name} - ${idx + 1}`}
                        fill
                        className="object-cover pointer-events-none"
                      />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right: Product Info */}
          <div className="space-y-6">
            {/* Product Name */}
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">
                {product.name}
              </h2>
              <p className="text-base text-gray-400 leading-relaxed">
                {product.description}
              </p>
            </div>

            {/* Price */}
            <div className="py-4 border-y border-white/10">
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold text-amber-400">
                  ${product.price.toFixed(2)}
                </span>
                <span className="text-gray-500 text-sm">USD</span>
              </div>
            </div>

            {/* Specifications */}
            {product.specifications && (
              <div className="bg-white/5 rounded-xl p-6 space-y-4">
                <h3 className="text-lg font-semibold text-white mb-4">Specifications</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500 font-medium">Material</p>
                    <p className="text-gray-300 font-semibold">{product.specifications.material}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 font-medium">Capacity</p>
                    <p className="text-gray-300 font-semibold">{product.specifications.capacity}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 font-medium">Weight</p>
                    <p className="text-gray-300 font-semibold">{product.specifications.weight}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 font-medium">Dimensions</p>
                    <p className="text-gray-300 font-semibold">{product.specifications.dimensions}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <button className="flex-1 bg-gradient-to-r from-amber-500 to-amber-600 text-white py-3 rounded-xl font-semibold hover:from-amber-400 hover:to-amber-500 transition-all shadow-lg shadow-amber-500/25">
                Buy Now
              </button>
              <button className="flex-1 border border-white/10 text-gray-300 py-3 rounded-xl font-semibold hover:bg-white/5 transition-all">
                Add to Cart
              </button>
            </div>

            {/* Features */}
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-semibold">
                100% Titanium
              </span>
              <span className="inline-flex items-center px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-semibold">
                Antibacterial
              </span>
              <span className="inline-flex items-center px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-semibold">
                Acid-Base Resistant
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
