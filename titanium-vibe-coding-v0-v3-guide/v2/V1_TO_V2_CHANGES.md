# v1 → v2 Code Change Record

This document records how v2 was generated from v1 and what changed during the v1 → v2 step.

## 1. Baseline and Copy Rule

v2 is based on v1. The v2 project must be understood as a copied-and-modified version of the v1 project, not a separately initialized project.

Baseline source:

```text
D:\vscode-vibe-demo-portable\titanium-vibe-coding-v0-v3-guide\v1\titanium-cup-showcase
```

Copy target:

```text
D:\vscode-vibe-demo-portable\titanium-vibe-coding-v0-v3-guide\v2\titanium-cup-showcase
```

The copy process excludes generated or local dependency files:

```text
node_modules
.next
tsconfig.tsbuildinfo
```

After the copy, all v2 implementation work is applied only inside the v2 folder.

## 2. Added or Expanded Assets

v1 only contained the smaller product image subset needed for a basic storefront. v2 expands the local `public/products` media set from the shared asset directory:

```text
D:\vscode-vibe-demo-portable\titanium-vibe-coding-v0-v3-guide\assets\products
```

Added/used asset groups include:

- Main product images: `main-black.jpg`, `main-new-white.jpg`, `main-white.jpg`
- Detail images: `detail-1.jpg` through `detail-5.jpg`
- Wide detail images: `detail-1-wide.png` through `detail-5-wide.png`
- Scene images: `detail-scene-1.jpg` through `detail-scene-5.jpg`
- Video assets: `product-video-h264.mp4`, `product-video.mp4`, `product-video-edge.mp4`, `product-video-new.mp4`
- Video poster: `product-video-poster.jpg`
- Recommended product images: `product-1.jpg` through `product-8.webp`

No 3D model assets are added for v2.

## 3. Main Code Changes

The main implementation differences from v1 are:

- `src/app/page.tsx`
  - Converted the page to a client component for gallery state.
  - Added a black/gold premium hero section.
  - Added a featured product media gallery.
  - Added image/video thumbnail switching.
  - Added a product video section.
  - Added `Crafted for Every Moment` scene cards.
  - Added material and trust feature blocks.
  - Refined the recommended product grid.

- `src/app/globals.css`
  - Changed the visual base from light storefront styling to dark titanium-inspired styling.
  - Added smoother scrolling and dark color scheme defaults.
  - Kept global styling minimal so most layout remains readable in `page.tsx`.

- `src/app/layout.tsx`
  - Updated metadata from basic storefront wording to v2 premium media storefront wording.

- `next.config.ts`
  - Keeps local development origins for `localhost` and `127.0.0.1`.
  - Sets `turbopack.root` to the current project directory so v2 runs independently inside the multi-version guide folder.

- `package.json` and `package-lock.json`
  - Renamed package metadata from `titanium-cup-showcase-v1` to `titanium-cup-showcase-v2`.
  - Updated version from `1.0.0` to `2.0.0`.

- README files
  - Added v2-specific description and run notes.

- Startup scripts
  - Added `启动-v2-页面.bat`.
  - Added `run-v2.cmd`.
  - Both scripts enter the v2 project directory, install dependencies when needed, start `npm run dev`, and open `http://127.0.0.1:3000`.

## 4. Functional Differences from v1

v1 was a basic English storefront. v2 adds:

- Dark premium titanium-inspired visual direction.
- Black/gold visual language.
- Stronger hero section.
- Featured product media gallery.
- Thumbnail-based image switching.
- Video as real product media.
- Dedicated product video module.
- `Crafted for Every Moment` scene storytelling.
- More explicit material benefits.
- Stronger purchase conversion information.
- More refined product collection grid.

## 5. Explicitly Not Included in v2

v2 intentionally does not include:

- 3D model loading.
- OBJ/MTL/texture integration.
- 3D loading overlay.
- Smart customer service.
- Chat widget.
- Model compression or format conversion.

These features belong to v3.

## 6. v3 Generation Requirement

v3 should be generated from v2 by copying:

```text
D:\vscode-vibe-demo-portable\titanium-vibe-coding-v0-v3-guide\v2\titanium-cup-showcase
```

to the v3 target project, then adding the final interactive features:

- Real OBJ/MTL/texture 3D model loading.
- Babylon.js 3D viewer.
- 3D loading gate.
- Mouse drag rotation and wheel zoom behavior.
- English smart customer service widget.

The current `v3` folder is preserved as the existing final version reference. It should not be deleted or replaced unless explicitly requested.
