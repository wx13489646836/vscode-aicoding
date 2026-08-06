import Image from 'next/image';

const featuredProduct = {
  name: 'Han Dynasty Heavenly Horse Pattern Pure Titanium Thermos',
  description:
    'A gift-ready pure titanium thermos inspired by the Han Dynasty Heavenly Horse motif. Built for clean taste, daily durability, and a lighter carry.',
  image: '/products/main-new-white.jpg',
  price: '$37.00',
  specs: [
    ['Material', '99.95% Pure Titanium'],
    ['Capacity', '300ml'],
    ['Weight', '150g'],
    ['Finish', 'Heritage Pattern'],
  ],
  highlights: [
    '99.95% Pure Titanium',
    'Naturally Antibacterial',
    'Lightweight and Durable',
    'Gift-ready Design',
  ],
};

const recommendedProducts = [
  {
    name: 'TAIC Pure Titanium Chopsticks',
    image: '/products/product-1.jpg',
    note: 'Lightweight tableware for home and travel',
  },
  {
    name: 'Planet Cup',
    image: '/products/product-2.jpg',
    note: 'Pure titanium cup with rounded silhouette',
  },
  {
    name: 'Pure Titanium Round Fusion Cup',
    image: '/products/product-3.jpg',
    note: 'Compact everyday titanium drinkware',
  },
  {
    name: 'Pure Titanium T-Shaped Thermos',
    image: '/products/product-4.jpg',
    note: 'Insulated titanium bottle for daily carry',
  },
  {
    name: 'Pure Titanium Coffee Cup',
    image: '/products/product-5.webp',
    note: 'Clean taste for coffee and tea',
  },
  {
    name: 'Pure Titanium Steeping Cup',
    image: '/products/product-6.webp',
    note: 'Designed for loose leaf tea brewing',
  },
  {
    name: 'Pure Titanium Direct Filter Cup',
    image: '/products/product-7.webp',
    note: 'Integrated filter for tea separation',
  },
  {
    name: 'Tea-Water Separation Glass Cup',
    image: '/products/product-8.webp',
    note: 'Glass body with titanium components',
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-[#f7f5f0] text-neutral-900">
      <header className="border-b border-neutral-200 bg-white/90">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <a className="text-lg font-bold tracking-wide" href="#">
            TITANIUM CUP
          </a>
          <div className="hidden items-center gap-8 text-sm font-medium text-neutral-600 md:flex">
            <a href="#featured">Featured</a>
            <a href="#products">Products</a>
            <a href="#details">Details</a>
          </div>
          <a
            className="rounded-full bg-neutral-900 px-5 py-2 text-sm font-semibold text-white"
            href="#featured"
          >
            Shop Now
          </a>
        </nav>
      </header>

      <section className="mx-auto grid max-w-7xl gap-10 px-6 py-16 md:grid-cols-[1.05fr_0.95fr] md:items-center md:py-24">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-amber-700">
            Pure Titanium Drinkware
          </p>
          <h1 className="mt-5 max-w-3xl text-5xl font-bold leading-tight tracking-tight md:text-7xl">
            Clean taste. Lighter carry. Gift-ready design.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-neutral-600">
            Discover a premium titanium thermos collection made for daily tea,
            coffee, office use, and refined gifting.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a
              className="rounded-full bg-neutral-900 px-7 py-3 text-center text-sm font-bold uppercase tracking-wide text-white"
              href="#featured"
            >
              View Featured Product
            </a>
            <a
              className="rounded-full border border-neutral-300 px-7 py-3 text-center text-sm font-bold uppercase tracking-wide text-neutral-900"
              href="#products"
            >
              Browse Collection
            </a>
          </div>
        </div>
        <div className="rounded-[2rem] bg-white p-6 shadow-xl shadow-neutral-200/80">
          <div className="relative aspect-square overflow-hidden rounded-[1.5rem] bg-neutral-100">
            <Image
              src={featuredProduct.image}
              alt={featuredProduct.name}
              fill
              priority
              className="object-contain p-8"
            />
          </div>
        </div>
      </section>

      <section id="featured" className="bg-white py-16 md:py-20">
        <div className="mx-auto grid max-w-7xl gap-10 px-6 md:grid-cols-[0.95fr_1.05fr] md:items-start">
          <div className="relative aspect-square overflow-hidden rounded-3xl bg-neutral-100">
            <Image
              src={featuredProduct.image}
              alt={featuredProduct.name}
              fill
              className="object-contain p-10"
            />
          </div>

          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-amber-700">
              Featured Product
            </p>
            <h2 className="mt-4 text-3xl font-bold tracking-tight md:text-5xl">
              {featuredProduct.name}
            </h2>
            <p className="mt-5 text-lg leading-8 text-neutral-600">
              {featuredProduct.description}
            </p>

            <div className="mt-7 flex items-end gap-3 border-y border-neutral-200 py-5">
              <span className="text-5xl font-bold">{featuredProduct.price}</span>
              <span className="pb-2 text-sm font-semibold uppercase tracking-wide text-neutral-500">
                USD
              </span>
            </div>

            <div id="details" className="mt-7 grid gap-3 sm:grid-cols-2">
              {featuredProduct.specs.map(([label, value]) => (
                <div key={label} className="rounded-2xl bg-neutral-50 p-5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                    {label}
                  </p>
                  <p className="mt-2 font-bold">{value}</p>
                </div>
              ))}
            </div>

            <div className="mt-7 flex flex-wrap gap-2">
              {featuredProduct.highlights.map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-800"
                >
                  {item}
                </span>
              ))}
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button className="rounded-full bg-neutral-900 px-8 py-4 text-sm font-bold uppercase tracking-wide text-white">
                Buy Now
              </button>
              <button className="rounded-full border border-neutral-300 px-8 py-4 text-sm font-bold uppercase tracking-wide text-neutral-900">
                Add to Cart
              </button>
            </div>
          </div>
        </div>
      </section>

      <section id="products" className="mx-auto max-w-7xl px-6 py-16 md:py-20">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-amber-700">
              Collection
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight md:text-5xl">
              Recommended Products
            </h2>
          </div>
          <p className="max-w-xl text-neutral-600">
            A simple product grid built from real image assets. Later versions can
            add richer storytelling, video, 3D, and customer support.
          </p>
        </div>

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {recommendedProducts.map((product) => (
            <article
              key={product.name}
              className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-neutral-200"
            >
              <div className="relative aspect-square overflow-hidden rounded-2xl bg-neutral-100">
                <Image
                  src={product.image}
                  alt={product.name}
                  fill
                  className="object-contain p-5"
                />
              </div>
              <h3 className="mt-4 min-h-12 text-base font-bold">{product.name}</h3>
              <p className="mt-2 text-sm leading-6 text-neutral-600">{product.note}</p>
            </article>
          ))}
        </div>
      </section>

      <footer className="border-t border-neutral-200 bg-white px-6 py-10 text-center text-sm text-neutral-500">
        <p className="font-semibold text-neutral-900">TITANIUM CUP</p>
        <p className="mt-2">
          v1 basic storefront — real images, clear product information, simple
          conversion structure.
        </p>
      </footer>
    </main>
  );
}
