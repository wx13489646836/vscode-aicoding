'use client';

import React, { useEffect, useRef, useState } from 'react';
import type * as BabylonTypes from 'babylonjs';

interface Model3DViewerProps {
  modelUrl: string;
  title?: string;
}

export default function Model3DViewer({ modelUrl, title }: Model3DViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<BabylonTypes.Engine | null>(null);
  const sceneRef = useRef<BabylonTypes.Scene | null>(null);
  const cameraRef = useRef<BabylonTypes.ArcRotateCamera | null>(null);
  const fittedViewRef = useRef<{ target: BabylonTypes.Vector3; radius: number } | null>(null);
  const autoRotateRef = useRef(true);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [autoRotate, setAutoRotate] = useState(true);

  useEffect(() => {
    autoRotateRef.current = autoRotate;
  }, [autoRotate]);

  useEffect(() => {
    if (!canvasRef.current) return;
    let isDisposed = false;
    const canvas = canvasRef.current;
    let sceneToDispose: BabylonTypes.Scene | null = null;
    let engineToDispose: BabylonTypes.Engine | null = null;
    let handleResize: (() => void) | null = null;
    let stopAutoRotateOnInteraction: (() => void) | null = null;
    let preventCanvasWheelScroll: ((event: WheelEvent) => void) | null = null;

    setIsLoading(true);
    setLoadError(null);

    const initializeViewer = async () => {
      try {
        const BABYLON = await import('babylonjs');
        const { OBJFileLoader } = await import('babylonjs-loaders');

        if (isDisposed) return;

      // Create engine
      const engine = new BABYLON.Engine(canvas, true, {
        antialias: true,
        preserveDrawingBuffer: true,
        stencil: true,
      });
      engineToDispose = engine;
      engineRef.current = engine;

      // Create scene
      const scene = new BABYLON.Scene(engine);
      sceneToDispose = scene;
      sceneRef.current = scene;

      // Set background color - gradient from dark to lighter
      scene.clearColor = new BABYLON.Color4(0.1, 0.1, 0.12, 1);

      // Create arc rotate camera (orbit camera)
      const camera = new BABYLON.ArcRotateCamera(
        'camera',
        -Math.PI / 2, // alpha (horizontal rotation)
        Math.PI / 3,   // beta (vertical rotation)
        5,              // radius (distance from target - closer)
        BABYLON.Vector3.Zero(),
        scene
      );
      cameraRef.current = camera;
      // Prevent page scrolling while the pointer is over the 3D canvas.
      // The second argument must be false so Babylon prevents the native wheel event.
      camera.attachControl(canvas, false);
      camera.lowerRadiusLimit = 2;
      camera.upperRadiusLimit = 30;
      camera.wheelPrecision = 20;
      camera.panningSensibility = 100;
      camera.inertia = 0.9;

      // Create lighting for PBR materials
      // Environment light
      const hemisphericLight = new BABYLON.HemisphericLight(
        'hemisphericLight',
        new BABYLON.Vector3(0, 1, 0),
        scene
      );
      hemisphericLight.intensity = 0.75;
      hemisphericLight.diffuse = new BABYLON.Color3(1, 1, 1);
      hemisphericLight.groundColor = new BABYLON.Color3(0.3, 0.3, 0.35);

      // Key light
      const keyLight = new BABYLON.DirectionalLight(
        'keyLight',
        new BABYLON.Vector3(-1, -2, 1),
        scene
      );
      keyLight.intensity = 1.35;
      keyLight.diffuse = new BABYLON.Color3(1, 0.98, 0.95);

      // Fill light
      const fillLight = new BABYLON.DirectionalLight(
        'fillLight',
        new BABYLON.Vector3(1, -1, -1),
        scene
      );
      fillLight.intensity = 0.55;
      fillLight.diffuse = new BABYLON.Color3(0.9, 0.92, 1.0);

      // Rim light
      const rimLight = new BABYLON.PointLight(
        'rimLight',
        new BABYLON.Vector3(0, 3, -5),
        scene
      );
      rimLight.intensity = 0.75;

      const baseUrl = modelUrl.substring(0, modelUrl.lastIndexOf('/') + 1);

      const frameLoadedMeshes = (meshes: BabylonTypes.AbstractMesh[]) => {
          const modelMeshes = meshes.filter((mesh) => mesh.getTotalVertices() > 0);

          if (modelMeshes.length === 0) {
            if (isDisposed) return;
            setLoadError('Model failed to load: no mesh data found.');
            setIsLoading(false);
            window.dispatchEvent(
              new CustomEvent('titanium:model3d-error', {
                detail: { reason: 'no mesh data found' },
              })
            );
            return;
          }

          const makeMaterialOpaque = (material: BabylonTypes.Material) => {
            material.backFaceCulling = false;
            material.alpha = 1;
            material.transparencyMode = BABYLON.Material.MATERIAL_OPAQUE;

            const materialWithTextures = material as BabylonTypes.Material & {
              albedoTexture?: BabylonTypes.BaseTexture | null;
              diffuseTexture?: BabylonTypes.BaseTexture | null;
              opacityTexture?: BabylonTypes.BaseTexture | null;
              useAlphaFromAlbedoTexture?: boolean;
              useAlphaFromDiffuseTexture?: boolean;
              needDepthPrePass?: boolean;
              separateCullingPass?: boolean;
            };

            if (materialWithTextures.albedoTexture) {
              materialWithTextures.albedoTexture.hasAlpha = false;
            }

            if (materialWithTextures.diffuseTexture) {
              materialWithTextures.diffuseTexture.hasAlpha = false;
            }

            materialWithTextures.opacityTexture = null;
            materialWithTextures.useAlphaFromAlbedoTexture = false;
            materialWithTextures.useAlphaFromDiffuseTexture = false;
            materialWithTextures.needDepthPrePass = true;
            materialWithTextures.separateCullingPass = true;
          };

          scene.materials.forEach(makeMaterialOpaque);

          modelMeshes.forEach((mesh) => {
            mesh.computeWorldMatrix(true);

            if (mesh.material) {
              makeMaterialOpaque(mesh.material);
            }
          });

          const bounds = BABYLON.Mesh.MinMax(modelMeshes);
          const center = BABYLON.Mesh.Center(bounds);
          const modelHeight = Math.max(bounds.max.y - bounds.min.y, 0.001);

          const fittedTarget = center.add(new BABYLON.Vector3(0, modelHeight * 0.08, 0));
          const fittedRadius = (modelHeight / (2 * Math.tan(camera.fov / 2))) * 1.18;

          camera.setTarget(fittedTarget);
          camera.radius = fittedRadius;
          camera.lowerRadiusLimit = fittedRadius * 0.55;
          camera.upperRadiusLimit = fittedRadius * 3;
          fittedViewRef.current = {
            target: fittedTarget.clone(),
            radius: fittedRadius,
          };

          if (isDisposed) return;
          setIsLoading(false);
          window.dispatchEvent(
            new CustomEvent('titanium:model3d-ready', {
              detail: { meshCount: modelMeshes.length },
            })
          );
      };

      const response = await fetch(modelUrl);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText}`);
      }
      const objText = await response.text();
      if (isDisposed) return;

      const result = await new OBJFileLoader().importMeshAsync(null, scene, objText, baseUrl);
      if (isDisposed) return;
      frameLoadedMeshes(result.meshes);

      stopAutoRotateOnInteraction = () => {
        autoRotateRef.current = false;
        setAutoRotate(false);
      };

      canvas.addEventListener('pointerdown', stopAutoRotateOnInteraction);

      // Auto-rotate. Increment the current camera angle instead of resetting it
      // from a fixed base angle, otherwise horizontal drag gets overwritten.
      scene.registerBeforeRender(() => {
        if (autoRotateRef.current && cameraRef.current) {
          cameraRef.current.alpha += 0.003;
        }
      });

      // Render loop
      engine.runRenderLoop(() => {
        scene.render();
      });

      preventCanvasWheelScroll = (event: WheelEvent) => {
        event.preventDefault();
      };

      canvas.addEventListener('wheel', preventCanvasWheelScroll, {
        passive: false,
      });

      // Handle window resize
      handleResize = () => {
        engine.resize();
      };
      window.addEventListener('resize', handleResize);
      } catch (error) {
        console.error('Error initializing 3D viewer:', error);
        if (isDisposed) return;
        setLoadError('Failed to initialize the 3D viewer.');
        setIsLoading(false);
        window.dispatchEvent(
          new CustomEvent('titanium:model3d-error', {
            detail: {
              reason: error instanceof Error ? error.message : String(error),
            },
          })
        );
      }
    };

    void initializeViewer();

    // Cleanup
    return () => {
      isDisposed = true;
      if (stopAutoRotateOnInteraction) {
        canvas.removeEventListener('pointerdown', stopAutoRotateOnInteraction);
      }
      if (preventCanvasWheelScroll) {
        canvas.removeEventListener('wheel', preventCanvasWheelScroll);
      }
      if (handleResize) {
        window.removeEventListener('resize', handleResize);
      }
      sceneToDispose?.dispose();
      engineToDispose?.dispose();
    };
  }, [modelUrl]);

  const toggleAutoRotate = () => {
    const nextAutoRotate = !autoRotate;
    autoRotateRef.current = nextAutoRotate;
    setAutoRotate(nextAutoRotate);
  };

  const resetCamera = () => {
    if (cameraRef.current && fittedViewRef.current) {
      cameraRef.current.alpha = -Math.PI / 2;
      cameraRef.current.beta = Math.PI / 3;
      cameraRef.current.setTarget(fittedViewRef.current.target.clone());
      cameraRef.current.radius = fittedViewRef.current.radius;
    }
  };

  return (
    <div className="w-full h-full bg-gray-900 rounded-lg overflow-hidden relative">
      {/* Loading indicator */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900 z-20 rounded-lg">
          <div className="text-center px-6">
            <div className="inline-block animate-spin">
              <svg className="w-12 h-12 text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
            <p className="text-white mt-4 font-semibold">Loading 3D model...</p>
            <p className="text-gray-400 text-sm mt-2">This model is large. Please wait a moment.</p>
          </div>
        </div>
      )}

      {/* Error message */}
      {loadError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900 z-20 rounded-lg">
          <div className="text-center p-6">
            <svg className="w-16 h-16 text-red-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <p className="text-red-400 font-semibold">{loadError}</p>
          </div>
        </div>
      )}

      {/* Title overlay */}
      {title && (
        <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/70 via-black/30 to-transparent p-4 z-10">
          <h3 className="text-white text-lg font-semibold">{title}</h3>
          <p className="text-gray-300 text-sm mt-1">3D model viewer - drag to rotate | scroll to zoom</p>
        </div>
      )}

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{ display: 'block', touchAction: 'none' }}
      />

      {/* Control buttons */}
      <div className="absolute bottom-4 left-4 flex gap-2 z-10">
        <button
          onClick={toggleAutoRotate}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            autoRotate
              ? 'bg-blue-600 text-white'
              : 'bg-white/20 text-white hover:bg-white/30'
          }`}
        >
          {autoRotate ? '⏸ Stop Rotation' : '▶ Auto Rotate'}
        </button>
        <button
          onClick={resetCamera}
          className="px-3 py-1.5 rounded-lg text-sm font-medium bg-white/20 text-white hover:bg-white/30 transition-colors"
        >
          🔄 Reset View
        </button>
      </div>

      {/* Help text at bottom */}
      <div className="absolute bottom-4 right-4 z-10">
        <p className="text-gray-400 text-xs">🖱️ Left-drag to rotate | right-drag to pan | scroll to zoom</p>
      </div>
    </div>
  );
}
