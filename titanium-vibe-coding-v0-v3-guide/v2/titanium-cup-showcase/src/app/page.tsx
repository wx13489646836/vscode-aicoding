"use client";

import Image from "next/image";
import { useState } from "react";

type GalleryItem =
  | { type: "image"; src: string; alt: string; label: string }
  | { type: "video"; src: string; poster: string; alt: string; label: string };

const featuredProduct = {
  name: "Han Dynasty Heavenly Horse Pattern Pure Titanium Thermos",
  eyebrow: "99.95% Pure Titanium · Heritage Pattern · Gift-ready",
  price: "$37.00",
  description:
    "A premium titanium thermos inspired by the Han Dynasty Heavenly Horse motif. Clean taste, lightweight carry, and a refined finish for tea, coffee, office use, and thoughtful gifting.",
  specs: [
    ["Material", "99.95% Pure Titanium"],
    ["Capacity", "300ml"],
    ["Weight", "150g"],
    ["Surface", "Etched Heritage Pattern"],
  ],
  trust: ["Secure checkout", "Gift-ready packaging", "Daily-use durability"],
};

const galleryItems: GalleryItem[] = [
  { type: "image", src: "/products/main-black.jpg", alt: "Black titanium thermos", label: "Black Finish" },
  { type: "image", src: "/products/main-new-white.jpg", alt: "White product view", label: "Product View" },
  { type: "image", src: "/products/detail-scene-2.jpg", alt: "Titanium thermos in tea setting", label: "Tea Moment" },
  { type: "image", src: "/products/detail-1-wide.png", alt: "Titanium thermos craft detail", label: "Craft Detail" },
  { type: "video", src: "/products/product-video-h264.mp4", poster: "/products/product-video-poster.jpg", alt: "Product video", label: "Product Video" },
];

const features = [
  ["Pure Titanium, Pure Taste", "Food-grade titanium keeps tea and coffee clean, bright, and free from metallic flavor."],
  ["Naturally Antibacterial", "Titanium is stable, corrosion-resistant, and well suited to everyday drinkware."],
  ["Lightweight Daily Carry", "A lighter body makes the thermos easier to carry from commute to office to travel."],
  ["Gift-ready Heritage Design", "The Heavenly Horse motif brings cultural depth to a refined daily object."],
];

const moments = [
  ["Morning Tea Ritual", "/products/detail-scene-1.jpg", "A clean titanium interior preserves the character of tea leaves and warm infusions."],
  ["Impressive Gifting", "/products/detail-scene-3.jpg", "A refined presentation for business gifts, holiday gifting, and premium personal use."],
  ["Everyday Desk Companion", "/products/detail-scene-4.jpg", "Durable enough for daily use while keeping the object visually distinctive."],
];

const recommendedProducts = [
  ["TAIC Pure Titanium Chopsticks", "/products/product-1.jpg"],
  ["Planet Cup", "/products/product-2.jpg"],
  ["Pure Titanium Round Fusion Cup", "/products/product-3.jpg"],
  ["Pure Titanium T-Shaped Thermos", "/products/product-4.jpg"],
  ["Pure Titanium Coffee Cup", "/products/product-5.webp"],
  ["Pure Titanium Steeping Cup", "/products/product-6.webp"],
  ["Pure Titanium Direct Filter Cup", "/products/product-7.webp"],
  ["Tea-Water Separation Glass Cup", "/products/product-8.webp"],
];

export default function Home() {
  const [activeIndex, setActiveIndex] = useState(0);
  const activeItem = galleryItems[activeIndex];

  return (
    <main className="min-h-screen overflow-hidden bg-[#0f0e0a] text-[#f7f1e6]">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_78%_5%,rgba(195,143,55,0.18),transparent_34%),radial-gradient(circle_at_12%_12%,rgba(255,255,255,0.08),transparent_24%),linear-gradient(180deg,#15130e_0%,#090806_100%)]" />

      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#0f0e0a]/82 backdrop-blur-xl">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <a className="text-sm font-bold uppercase tracking-[0.35em] text-[#f6d28a]" href="#">
            Titanium Cup
          </a>
          <div className="hidden items-center gap-8 text-sm font-medium text-[#b9b0a1] md:flex">
            <a className="transition hover:text-[#f6d28a]" href="#featured">Featured</a>
            <a className="transition hover:text-[#f6d28a]" href="#moments">Moments</a>
            <a className="transition hover:text-[#f6d28a]" href="#collection">Collection</a>
          </div>
          <a className="rounded-full border border-[#d9a94e]/50 bg-[#d9a94e] px-5 py-2 text-sm font-bold uppercase tracking-wide text-[#11100c] shadow-[0_0_34px_rgba(217,169,78,0.28)] transition hover:bg-[#f2c977]" href="#featured">
            Shop Now
          </a>
        </nav>
      </header>

      <section className="mx-auto grid max-w-7xl gap-12 px-6 pb-20 pt-16 md:grid-cols-[0.92fr_1.08fr] md:items-center md:pb-28 md:pt-24">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.4em] text-[#d9a94e]">Pure Titanium Drinkware</p>
          <h1 className="mt-6 max-w-3xl text-5xl font-black leading-[0.94] tracking-[-0.06em] text-white md:text-7xl">
            Pure titanium. Heritage presence. Daily clarity.
          </h1>
          <p className="mt-7 max-w-2xl text-lg leading-8 text-[#c8beb0]">
            A premium thermos designed around clean taste, lighter carry, and a gift-ready Heavenly Horse pattern inspired by Chinese heritage.
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <a className="rounded-full bg-[#f1c66b] px-8 py-4 text-center text-sm font-black uppercase tracking-wide text-[#11100c] transition hover:-translate-y-0.5 hover:bg-[#ffdc87]" href="#featured">
              View Product
            </a>
            <a className="rounded-full border border-white/20 px-8 py-4 text-center text-sm font-black uppercase tracking-wide text-white transition hover:border-[#d9a94e] hover:text-[#f6d28a]" href="#video">
              Watch Video
            </a>
          </div>
          <div className="mt-10 grid max-w-xl grid-cols-3 gap-3 text-center">
            {["99.95% Titanium", "Clean Taste", "Gift-ready"].map((item) => (
              <div key={item} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-[#d9a94e]">{item}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="relative">
          <div className="absolute -inset-6 rounded-[3rem] bg-[#d9a94e]/10 blur-3xl" />
          <div className="relative overflow-hidden rounded-[2.5rem] border border-white/10 bg-[#1a1813] p-5 shadow-2xl shadow-black/50">
            <div className="relative aspect-[4/5] overflow-hidden rounded-[2rem] bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.12),rgba(255,255,255,0.03)_48%,transparent_72%)]">
              <Image src="/products/main-black.jpg" alt="Han Dynasty Heavenly Horse titanium thermos" fill priority className="object-contain p-8" />
            </div>
          </div>
        </div>
      </section>

      <section id="featured" className="mx-auto grid max-w-7xl gap-12 px-6 py-16 md:grid-cols-[1.08fr_0.92fr] md:items-start md:py-24">
        <div>
          <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-[#171610] p-4 shadow-2xl shadow-black/40">
            <div className="relative aspect-[16/11] overflow-hidden rounded-[1.5rem] bg-black">
              {activeItem.type === "image" ? (
                <Image src={activeItem.src} alt={activeItem.alt} fill className="object-contain" sizes="(max-width: 768px) 100vw, 60vw" />
              ) : (
                <video key={activeItem.src} className="h-full w-full object-contain" controls playsInline poster={activeItem.poster}>
                  <source src={activeItem.src} type="video/mp4" />
                </video>
              )}
            </div>
          </div>

          <div className="mt-4 grid grid-cols-5 gap-3">
            {galleryItems.map((item, index) => (
              <button
                key={item.label}
                type="button"
                onClick={() => setActiveIndex(index)}
                className={`group overflow-hidden rounded-2xl border p-1 text-left transition ${
                  activeIndex === index ? "border-[#d9a94e] bg-[#d9a94e]/12" : "border-white/10 bg-white/[0.04] hover:border-white/30"
                }`}
                aria-label={`Show ${item.label}`}
              >
                <div className="relative aspect-square overflow-hidden rounded-xl bg-black">
                  {item.type === "image" ? (
                    <Image src={item.src} alt={item.alt} fill className="object-cover transition group-hover:scale-105" />
                  ) : (
                    <>
                      <Image src={item.poster} alt={item.alt} fill className="object-cover opacity-80" />
                      <span className="absolute inset-0 grid place-items-center text-xl text-white">▶</span>
                    </>
                  )}
                </div>
                <span className="mt-2 block truncate px-1 pb-1 text-[11px] font-bold uppercase tracking-wide text-[#c8beb0]">{item.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-[2rem] border border-white/10 bg-white/[0.045] p-7 backdrop-blur">
          <p className="text-xs font-black uppercase tracking-[0.35em] text-[#d9a94e]">{featuredProduct.eyebrow}</p>
          <h2 className="mt-5 text-4xl font-black leading-tight tracking-[-0.04em] text-white md:text-5xl">{featuredProduct.name}</h2>
          <p className="mt-5 text-base leading-8 text-[#c8beb0]">{featuredProduct.description}</p>

          <div className="mt-8 flex items-end gap-3 border-y border-white/10 py-6">
            <span className="text-6xl font-black tracking-tight text-white">{featuredProduct.price}</span>
            <span className="pb-2 text-sm font-bold uppercase tracking-[0.2em] text-[#d9a94e]">USD</span>
          </div>

          <div className="mt-7 grid gap-3 sm:grid-cols-2">
            {featuredProduct.specs.map(([label, value]) => (
              <div key={label} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-[#8f8678]">{label}</p>
                <p className="mt-2 font-black text-white">{value}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <button className="rounded-full bg-[#f1c66b] px-8 py-4 text-sm font-black uppercase tracking-wide text-[#11100c] transition hover:-translate-y-0.5 hover:bg-[#ffdc87]">Buy Now</button>
            <button className="rounded-full border border-white/20 px-8 py-4 text-sm font-black uppercase tracking-wide text-white transition hover:border-[#d9a94e] hover:text-[#f6d28a]">Add to Cart</button>
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            {featuredProduct.trust.map((item) => (
              <span key={item} className="rounded-full border border-[#d9a94e]/25 bg-[#d9a94e]/10 px-4 py-2 text-xs font-bold uppercase tracking-wide text-[#f6d28a]">{item}</span>
            ))}
          </div>
        </div>
      </section>

      <section id="moments" className="mx-auto max-w-7xl px-6 py-16 md:py-24">
        <div className="max-w-3xl">
          <p className="text-xs font-black uppercase tracking-[0.35em] text-[#d9a94e]">Experience</p>
          <h2 className="mt-4 text-4xl font-black tracking-[-0.04em] text-white md:text-6xl">Crafted for Every Moment</h2>
          <p className="mt-5 text-lg leading-8 text-[#c8beb0]">
            From tea rituals to premium gifting, the thermos is presented as a refined object for everyday life rather than a disposable accessory.
          </p>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {moments.map(([title, image, body]) => (
            <article key={title} className="group overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.04]">
              <div className="relative aspect-[4/3] overflow-hidden bg-black">
                <Image src={image} alt={title} fill className="object-cover transition duration-500 group-hover:scale-105" />
              </div>
              <div className="p-6">
                <h3 className="text-xl font-black text-white">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-[#b9b0a1]">{body}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-16 md:py-24">
        <div className="grid gap-5 md:grid-cols-4">
          {features.map(([title, body]) => (
            <article key={title} className="rounded-[1.75rem] border border-white/10 bg-[#171610] p-6">
              <div className="mb-6 h-px w-14 bg-[#d9a94e]" />
              <h3 className="text-lg font-black text-white">{title}</h3>
              <p className="mt-4 text-sm leading-6 text-[#b9b0a1]">{body}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="video" className="mx-auto max-w-7xl px-6 py-16 md:py-24">
        <div className="grid gap-8 rounded-[2rem] border border-white/10 bg-[#171610] p-5 md:grid-cols-[0.9fr_1.1fr] md:p-8">
          <div className="flex flex-col justify-center">
            <p className="text-xs font-black uppercase tracking-[0.35em] text-[#d9a94e]">Product Video</p>
            <h2 className="mt-4 text-3xl font-black tracking-[-0.03em] text-white md:text-5xl">See the finish, form, and gift-ready presence.</h2>
            <p className="mt-5 text-base leading-8 text-[#c8beb0]">
              The video uses the existing product media asset and keeps the page focused on real material rather than generated placeholders.
            </p>
          </div>
          <div className="overflow-hidden rounded-[1.5rem] bg-black">
            <video className="aspect-video h-full w-full object-contain" controls playsInline poster="/products/product-video-poster.jpg">
              <source src="/products/product-video-h264.mp4" type="video/mp4" />
            </video>
          </div>
        </div>
      </section>

      <section id="collection" className="mx-auto max-w-7xl px-6 py-16 md:py-24">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.35em] text-[#d9a94e]">Collection</p>
            <h2 className="mt-4 text-4xl font-black tracking-[-0.04em] text-white md:text-6xl">Titanium Essentials</h2>
          </div>
          <p className="max-w-xl text-[#c8beb0]">
            A concise product grid for adjacent titanium drinkware and tableware, keeping the purchase path visible without overwhelming the main offer.
          </p>
        </div>

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {recommendedProducts.map(([name, image]) => (
            <article key={name} className="group rounded-[1.75rem] border border-white/10 bg-white/[0.045] p-4 transition hover:-translate-y-1 hover:border-[#d9a94e]/45">
              <div className="relative aspect-square overflow-hidden rounded-[1.25rem] bg-[#f5f1ea]">
                <Image src={image} alt={name} fill className="object-contain p-5 transition duration-500 group-hover:scale-105" />
              </div>
              <h3 className="mt-4 min-h-12 text-base font-black text-white">{name}</h3>
              <p className="mt-2 text-sm text-[#b9b0a1]">Pure titanium quality for refined daily use.</p>
            </article>
          ))}
        </div>
      </section>

      <footer className="border-t border-white/10 px-6 py-12 text-center text-sm text-[#8f8678]">
        <p className="font-black uppercase tracking-[0.35em] text-[#f6d28a]">Titanium Cup</p>
        <p className="mt-3">v2 premium media storefront · real images and video · no 3D model or chatbot.</p>
      </footer>
    </main>
  );
}
