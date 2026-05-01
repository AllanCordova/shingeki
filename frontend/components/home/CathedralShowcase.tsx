"use client";

import { Canvas, invalidate } from "@react-three/fiber";
import { Center, OrbitControls, useGLTF } from "@react-three/drei";
import { Suspense, useEffect, useMemo, useState } from "react";
import { MOUSE, Mesh } from "three";

type ModelAssetProps = {
  path: string;
  position: [number, number, number];
  scale: [number, number, number];
  rotation?: [number, number, number];
};

const MODEL_PATH = "/trostdistrict.glb";
const MODEL_SCALE = 0.0022;
const GROUND_SIZE = 560;
const ORBIT_TARGET: [number, number, number] = [0, 0.35, 0];
const INITIAL_CAMERA_POSITION: [number, number, number] = [0, 91, 280];

function ModelAsset({ path, position, scale, rotation = [0, 0, 0] }: ModelAssetProps) {
  const { scene } = useGLTF(path, false, false);
  const model = useMemo(() => {
    const nextModel = scene.clone();
    nextModel.traverse((child) => {
      if (child instanceof Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    return nextModel;
  }, [scene]);

  return <primitive object={model} position={position} rotation={rotation} scale={scale} />;
}

const TROST_GROUP_Y = 21;
const GROUND_Y = -3.22;

function CathedralScene() {
  const s = MODEL_SCALE;
  return (
    <group position={[0, TROST_GROUP_Y, -2.6]}>
      <Center bottom>
        <ModelAsset
          path={MODEL_PATH}
          position={[0, 0.08, 0]}
          scale={[s, s, s]}
          rotation={[0, 0, 0]}
        />
      </Center>
    </group>
  );
}

function Ground() {
  const g = GROUND_SIZE;
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, GROUND_Y, 0]} receiveShadow>
      <planeGeometry args={[g, g]} />
      <meshStandardMaterial color="#09090b" roughness={1} />
    </mesh>
  );
}

function Controls({ reducedMotion }: { reducedMotion: boolean }) {
  return (
    <OrbitControls
      target={ORBIT_TARGET}
      enablePan={false}
      enableZoom={!reducedMotion}
      minDistance={0.8}
      maxDistance={190}
      minPolarAngle={0.15}
      maxPolarAngle={Math.PI - 0.15}
      minAzimuthAngle={-Infinity}
      maxAzimuthAngle={Infinity}
      mouseButtons={{ LEFT: MOUSE.ROTATE, MIDDLE: MOUSE.DOLLY }}
      zoomSpeed={2.3}
      rotateSpeed={0.6}
      onChange={() => invalidate()}
    />
  );
}

export default function CathedralShowcase() {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReducedMotion(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  return (
    <div
      className="h-[58vh] min-h-[380px] w-full bg-black md:h-[70vh]"
      style={{ touchAction: reducedMotion ? "pan-y" : "none" }}
    >
      <Canvas
        className="cursor-grab touch-none active:cursor-grabbing [&_canvas]:h-full [&_canvas]:w-full"
        camera={{ position: INITIAL_CAMERA_POSITION, fov: 50, near: 0.01, far: 8000 }}
        dpr={[1, 1.5]}
        frameloop="demand"
        gl={{ antialias: true, powerPreference: "high-performance" }}
        onCreated={() => invalidate()}
      >
        <color attach="background" args={["#000000"]} />
        <ambientLight intensity={0.55} />
        <directionalLight intensity={1.85} position={[8, 12, 8]} castShadow />
        <pointLight intensity={0.45} position={[-8, 5, -7]} />

        <group>
          <Suspense fallback={null}>
            <CathedralScene />
          </Suspense>
        </group>
        <Ground />

        <Controls reducedMotion={reducedMotion} />
      </Canvas>
    </div>
  );
}

useGLTF.preload(MODEL_PATH, false, false);
