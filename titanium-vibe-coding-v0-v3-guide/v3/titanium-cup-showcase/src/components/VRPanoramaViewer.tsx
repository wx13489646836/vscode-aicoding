'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as BABYLON from 'babylonjs';

interface VRPanoramaViewerProps {
  imageUrl: string;
  title?: string;
}

export default function VRPanoramaViewer({ imageUrl, title }: VRPanoramaViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<BABYLON.Scene | null>(null);
  const engineRef = useRef<BABYLON.Engine | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!canvasRef.current) return;

    try {
      // Create engine and scene
      const engine = new BABYLON.Engine(canvasRef.current, true, { antialias: true });
      engineRef.current = engine;
      const scene = new BABYLON.Scene(engine);
      sceneRef.current = scene;

      // Create camera - positioned at center for 360 panorama
      const camera = new BABYLON.UniversalCamera('camera', new BABYLON.Vector3(0, 0, 0));
      camera.attachControl(canvasRef.current, true);
      camera.inertia = 0.7;
      camera.angularSensibility = 1000;
      // @ts-ignore - wheelPrecision exists at runtime on some camera types
      camera.wheelPrecision = 50;
      camera.speed = 0;

      // Create hemispheric light for better illumination
      const light = new BABYLON.HemisphericLight('light', new BABYLON.Vector3(0, 1, 0));
      light.intensity = 1;

      // Create sphere for panorama - inverted so camera is inside
      const sphere = BABYLON.MeshBuilder.CreateSphere(
        'panoramaSphere',
        { diameter: 1000, segments: 64 },
        scene
      );

      // Create material with panorama image
      const material = new BABYLON.StandardMaterial('panoramaMaterial', scene);
      const emissiveTex = new BABYLON.Texture(imageUrl, scene, false, true, BABYLON.Texture.TRILINEAR_SAMPLINGMODE);
      material.emissiveTexture = emissiveTex;
      material.backFaceCulling = false;
      (emissiveTex as BABYLON.Texture).uScale = -1; // Mirror horizontally for proper panorama
      sphere.material = material;

      // On texture loaded, hide loading indicator
      (emissiveTex as BABYLON.Texture).onLoadObservable.add(() => {
        setIsLoading(false);
      });

      // Render loop
      engine.runRenderLoop(() => {
        scene.render();
      });

      // Handle window resize
      const handleResize = () => {
        engine.resize();
      };
      window.addEventListener('resize', handleResize);

      // Cleanup
      return () => {
        window.removeEventListener('resize', handleResize);
        scene.dispose();
        engine.dispose();
      };
    } catch (error) {
      console.error('Error initializing VR viewer:', error);
      setIsLoading(false);
    }
  }, [imageUrl]);

  return (
    <div className="w-full h-full bg-black rounded-lg overflow-hidden relative">
      {/* Loading indicator */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 z-20 rounded-lg">
          <div className="text-center">
            <div className="inline-block animate-spin">
              <svg className="w-12 h-12 text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
            <p className="text-white mt-4 font-semibold">Loading panorama...</p>
          </div>
        </div>
      )}

      {/* Title overlay */}
      {title && (
        <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black via-black to-transparent p-4 z-10">
          <h3 className="text-white text-lg font-semibold">{title}</h3>
          <p className="text-gray-300 text-sm mt-1">Drag to explore the 360° panorama</p>
        </div>
      )}

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{ display: 'block' }}
      />

      {/* Help text at bottom */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black to-transparent p-4 z-10">
        <p className="text-gray-400 text-xs text-center">💡 Drag to look around | scroll to zoom</p>
      </div>
    </div>
  );
}
