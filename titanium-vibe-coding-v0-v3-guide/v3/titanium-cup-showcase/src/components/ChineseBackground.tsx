'use client';

import { useEffect, useState } from 'react';

export default function ChineseBackground() {
  const [mousePos, setMousePos] = useState({ x: 50, y: 50 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({
        x: (e.clientX / window.innerWidth) * 100,
        y: (e.clientY / window.innerHeight) * 100,
      });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <>
      {/* Main background - deep metallic dark matching titanium product */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          zIndex: -2,
          background: `
            radial-gradient(ellipse 50% 40% at ${mousePos.x}% ${mousePos.y}%, rgba(212, 175, 110, 0.04) 0%, transparent 50%),
            radial-gradient(ellipse 80% 60% at 10% 90%, rgba(35, 30, 25, 0.8) 0%, transparent 60%),
            radial-gradient(ellipse 60% 50% at 90% 10%, rgba(45, 40, 35, 0.5) 0%, transparent 50%),
            radial-gradient(ellipse 40% 30% at 50% 50%, rgba(212, 175, 110, 0.015) 0%, transparent 60%),
            linear-gradient(165deg, #13120f 0%, #17150f 20%, #1b1913 40%, #19170f 60%, #151310 80%, #111010 100%)
          `,
        }}
      />

      {/* Fine noise texture - metallic grain feel */}
      <svg
        className="fixed inset-0 w-full h-full pointer-events-none"
        style={{ zIndex: -1, opacity: 0.02 }}
        preserveAspectRatio="xMidYMid slice"
      >
        <filter id="noiseFilter">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.8"
            numOctaves="5"
            stitchTiles="stitch"
          />
        </filter>
        <rect width="100%" height="100%" filter="url(#noiseFilter)" />
      </svg>

      {/* Metallic accent decorations */}
      <div
        className="fixed inset-0 pointer-events-none overflow-hidden"
        style={{ zIndex: -1 }}
      >
        {/* Top golden hairline */}
        <div
          className="absolute top-0 left-0 right-0 h-px"
          style={{
            background: 'linear-gradient(90deg, transparent 0%, rgba(212, 175, 110, 0.15) 25%, rgba(212, 175, 110, 0.35) 50%, rgba(212, 175, 110, 0.15) 75%, transparent 100%)',
          }}
        />

        {/* Subtle diagonal warm light - upper left */}
        <div
          className="absolute"
          style={{
            top: '-15%',
            left: '-8%',
            width: '55%',
            height: '130%',
            background: 'linear-gradient(140deg, rgba(212, 175, 110, 0.018) 0%, rgba(212, 175, 110, 0.005) 30%, transparent 50%)',
            transform: 'skewX(-12deg)',
          }}
        />

        {/* Cool silver accent - upper right */}
        <div
          className="absolute"
          style={{
            top: '-5%',
            right: '-5%',
            width: '35%',
            height: '90%',
            background: 'linear-gradient(220deg, rgba(192, 192, 200, 0.012) 0%, transparent 40%)',
            transform: 'skewX(8deg)',
          }}
        />

        {/* Center warm glow - subtle product illumination feel */}
        <div
          className="absolute"
          style={{
            top: '30%',
            left: '25%',
            width: '50%',
            height: '40%',
            background: 'radial-gradient(ellipse 80% 60% at 50% 50%, rgba(212, 175, 110, 0.012) 0%, transparent 70%)',
          }}
        />

        {/* Bottom depth shadow */}
        <div
          className="absolute bottom-0 left-0 right-0"
          style={{
            height: '30%',
            background: 'linear-gradient(to top, rgba(17, 16, 15, 0.6) 0%, transparent 100%)',
          }}
        />

        {/* Very subtle side vignettes */}
        <div
          className="absolute top-0 left-0 h-full"
          style={{
            width: '15%',
            background: 'linear-gradient(to right, rgba(17, 16, 15, 0.3) 0%, transparent 100%)',
          }}
        />
        <div
          className="absolute top-0 right-0 h-full"
          style={{
            width: '15%',
            background: 'linear-gradient(to left, rgba(17, 16, 15, 0.3) 0%, transparent 100%)',
          }}
        />
      </div>
    </>
  );
}
