'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { label: 'HOME', href: '/' },
  { label: 'PRODUCT', href: '/products' },
  { label: 'BRAND', href: '/#brand' },
  { label: 'SHOP', href: '/products' },
  { label: 'NEWS', href: '/#news' },
  { label: 'SERVICE', href: '/#service' },
];

export default function Navbar() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href.split('#')[0]);
  };

  return (
    <header className="sticky top-0 z-50">
      <div className="bg-black/90 backdrop-blur-md border-b border-white/10">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 group">
              <span className="text-lg font-bold text-white tracking-[0.3em] uppercase">
                TITANIUM WORKSHOP
              </span>
            </Link>

            {/* Desktop navigation */}
            <div className="hidden md:flex items-center gap-8">
              {navItems.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className={`text-xs font-medium tracking-[0.2em] transition-colors duration-200 ${
                    isActive(item.href)
                      ? 'text-white'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
              {/* Search button */}
              <button
                onClick={() => setSearchOpen(!searchOpen)}
                className="text-xs font-medium tracking-[0.2em] text-gray-400 hover:text-white transition-colors duration-200 flex items-center gap-1.5"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                SEARCH
              </button>
            </div>

            {/* Mobile menu button */}
            <button
              className="md:hidden p-2 text-gray-400 hover:text-white transition-colors"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </nav>

        {/* Search bar */}
        {searchOpen && (
          <div className="border-t border-white/10 bg-black/95">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
              <div className="flex items-center gap-3">
                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search products..."
                  className="flex-1 bg-transparent text-white text-sm placeholder-gray-600 outline-none tracking-wide"
                  autoFocus
                />
                <button
                  onClick={() => { setSearchOpen(false); setSearchQuery(''); }}
                  className="text-gray-500 hover:text-white text-xs tracking-widest transition-colors"
                >
                  CLOSE
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-white/10 bg-black/95">
            <div className="px-4 py-4 space-y-1">
              {navItems.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`block px-3 py-2.5 text-xs font-medium tracking-[0.2em] transition-colors ${
                    isActive(item.href)
                      ? 'text-white'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
              <button
                onClick={() => { setSearchOpen(true); setMobileMenuOpen(false); }}
                className="block w-full text-left px-3 py-2.5 text-xs font-medium tracking-[0.2em] text-gray-400 hover:text-white transition-colors"
              >
                SEARCH
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
