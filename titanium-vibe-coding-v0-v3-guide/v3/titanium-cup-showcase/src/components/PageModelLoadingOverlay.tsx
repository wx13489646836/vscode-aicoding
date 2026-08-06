'use client';

import { useEffect, useState } from 'react';

export default function PageModelLoadingOverlay() {
  const [isVisible, setIsVisible] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleReady = () => {
      setHasError(false);
      setIsVisible(false);
      document.body.style.overflow = previousOverflow;
    };

    const handleError = () => {
      setHasError(true);
    };

    window.addEventListener('titanium:model3d-ready', handleReady);
    window.addEventListener('titanium:model3d-error', handleError);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('titanium:model3d-ready', handleReady);
      window.removeEventListener('titanium:model3d-error', handleError);
    };
  }, []);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#0b0906]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(245,158,11,0.16),transparent_42%)]" />
      <div className="relative flex flex-col items-center px-6 text-center">
        <div className="relative h-20 w-20">
          <div className="absolute inset-0 rounded-full border border-amber-400/20" />
          <div className="absolute inset-2 rounded-full border-2 border-transparent border-t-amber-400 border-r-amber-500 animate-spin" />
          <div className="absolute inset-6 rounded-full bg-amber-400/15 shadow-[0_0_32px_rgba(245,158,11,0.45)]" />
        </div>

        <p className="mt-6 text-xs font-semibold uppercase tracking-[0.35em] text-amber-400/80">
          Interactive Experience
        </p>
        <h1 className="mt-3 text-2xl font-bold tracking-tight text-white md:text-3xl">
          Loading 3D Model
        </h1>
        <p className="mt-3 max-w-sm text-sm leading-6 text-gray-400">
          Preparing the titanium thermos model before entering the page.
        </p>

        {hasError && (
          <p className="mt-5 max-w-sm rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            The 3D model did not finish loading. Please refresh the page and try again.
          </p>
        )}
      </div>
    </div>
  );
}
