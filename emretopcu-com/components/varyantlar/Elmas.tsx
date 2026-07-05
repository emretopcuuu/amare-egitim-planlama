"use client";

import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

// Hero'daki 3D elmas: pırlanta kesimli taş; kendi ekseninde yavaşça döner,
// imleci hafifçe takip eder, nefes alır gibi süzülür. Altın jant ışığıyla
// aydınlatılır. prefers-reduced-motion durumunda animasyon durur.

function pirlantaGeometrisi() {
  // Klasik pırlanta: taç (üst tabla + kuşak) ve köşk (alt koni) profili
  // LatheGeometry ile döndürülür, düşük segment sayısı faset görünümü verir.
  const profil = [
    new THREE.Vector2(0.0, 1.0), // tabla merkezi
    new THREE.Vector2(0.52, 0.98), // tabla kenarı
    new THREE.Vector2(0.98, 0.55), // taç eğimi
    new THREE.Vector2(1.12, 0.18), // kuşak
    new THREE.Vector2(0.0, -1.35), // kület (alt uç)
  ];
  const geo = new THREE.LatheGeometry(profil, 10);
  return geo.toNonIndexed(); // düz yüzeyler (flat shading) için
}

function Tas({ hareket }: { hareket: boolean }) {
  const grup = useRef<THREE.Group>(null);
  const geometri = useMemo(() => pirlantaGeometrisi(), []);
  const isaretci = useRef({ x: 0, y: 0 });

  useFrame((state, delta) => {
    if (!grup.current) return;
    if (!hareket) return;
    const t = state.clock.elapsedTime;
    grup.current.rotation.y += delta * 0.35;
    grup.current.position.y = Math.sin(t * 0.8) * 0.12;
    // imleç paralaksı: yumuşak takip
    isaretci.current.x = THREE.MathUtils.lerp(
      isaretci.current.x,
      state.pointer.x,
      0.04,
    );
    isaretci.current.y = THREE.MathUtils.lerp(
      isaretci.current.y,
      state.pointer.y,
      0.04,
    );
    grup.current.rotation.x = 0.35 + isaretci.current.y * -0.25;
    grup.current.rotation.z = isaretci.current.x * 0.15;
  });

  return (
    <group ref={grup} rotation={[0.35, 0.6, 0]}>
      <mesh geometry={geometri}>
        <meshStandardMaterial
          color="#8a6f3d"
          metalness={0.9}
          roughness={0.28}
          flatShading
        />
      </mesh>
      {/* faset kenarlarını belli eden ince altın tel kafes */}
      <lineSegments>
        <edgesGeometry args={[geometri, 12]} />
        <lineBasicMaterial color="#f0d9a6" transparent opacity={0.5} />
      </lineSegments>
    </group>
  );
}

export default function Elmas({ hareket = true }: { hareket?: boolean }) {
  return (
    <Canvas
      camera={{ position: [0, 0.4, 4.6], fov: 40 }}
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true }}
      style={{ background: "transparent" }}
      aria-hidden
    >
      <ambientLight intensity={0.5} />
      {/* altın ana ışık + soğuk dolgu + arkadan jant ışığı + ön parlama */}
      <directionalLight position={[4, 5, 3]} intensity={3.2} color="#e8c684" />
      <directionalLight position={[-5, -2, 2]} intensity={0.8} color="#8fb4d9" />
      <directionalLight position={[0, 3, -6]} intensity={2.2} color="#f3e3bd" />
      <pointLight position={[0, 0.5, 3.5]} intensity={6} color="#ffe9bf" />
      <Tas hareket={hareket} />
    </Canvas>
  );
}
