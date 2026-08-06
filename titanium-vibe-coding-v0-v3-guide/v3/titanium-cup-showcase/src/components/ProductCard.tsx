import Image from 'next/image';
import Link from 'next/link';

interface ProductCardProps {
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

export default function ProductCard({
  id,
  name,
  imageUrl,
  colors,
  capacity,
  features,
  views,
  has3D,
  hasVR,
}: ProductCardProps) {
  return (
    <Link href={`/products/${id}`}>
      <div className="bg-white rounded-xl overflow-hidden cursor-pointer group hover:shadow-lg transition-shadow duration-300 flex flex-col h-full">
        {/* Product Image */}
        <div className="relative aspect-square bg-gray-50 overflow-hidden">
          <Image
            src={imageUrl}
            alt={name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500"
            priority={false}
          />
          {has3D && (
            <div className="absolute top-2 left-2 bg-purple-500/90 backdrop-blur-sm text-white px-2.5 py-1 rounded-full text-xs font-semibold">
              3D
            </div>
          )}
          {hasVR && (
            <div className="absolute top-2 right-2 bg-blue-500/90 backdrop-blur-sm text-white px-2.5 py-1 rounded-full text-xs font-semibold">
              VR 360°
            </div>
          )}
        </div>

        {/* Product Info */}
        <div className="p-4 flex flex-col flex-1">
          {/* Product Name */}
          <h3 className="text-sm font-bold text-gray-900 mb-2 leading-tight">
            {name}
          </h3>

          {/* Colors */}
          <p className="text-xs text-gray-500 mb-1 line-clamp-1">
            {colors.join(' / ')}
          </p>

          {/* Capacity */}
          {capacity && (
            <p className="text-xs text-gray-500 mb-2">{capacity}</p>
          )}

          {/* Feature Tags */}
          <div className="flex flex-wrap gap-1.5 mb-3">
            {features.map((feature, idx) => (
              <span
                key={idx}
                className="inline-block px-2 py-0.5 bg-gray-100 text-gray-600 text-[10px] rounded-full"
              >
                {feature}
              </span>
            ))}
          </div>

          {/* View Details Button & Views */}
          <div className="flex items-center justify-between mt-auto pt-3">
            <button className="bg-gray-900 text-white text-xs font-medium px-5 py-2 rounded-full hover:bg-gray-800 transition-colors">
              View Details
            </button>
            {views && (
              <div className="flex items-center gap-1 text-gray-400">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                <span className="text-[11px]">{views}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
