"use client";

import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { MotionValue } from "motion/react";

// Sayfanın tamamının arkasında yaşayan sinematik 3D sahne:
// altın parçacık alanı + sis + pırlanta. Scroll ilerledikçe kamera süzülür,
// elmas döner; imleç hafif paralaks verir. prefers-reduced-motion'da sahne
// tek karede sabit kalır (ilerleme yine scroll'u izler ama salınım durur).

function pirlantaGeometrisi() {
  const profil = [
    new THREE.Vector2(0.0, 1.0),
    new THREE.Vector2(0.52, 0.98),
    new THREE.Vector2(0.98, 0.55),
    new THREE.Vector2(1.12, 0.18),
    new THREE.Vector2(0.0, -1.35),
  ];
  return new THREE.LatheGeometry(profil, 10).toNonIndexed();
}

function parcacikAlani(adet: number) {
  const konumlar = new Float32Array(adet * 3);
  for (let i = 0; i < adet; i++) {
    konumlar[i * 3] = (Math.random() - 0.5) * 26;
    konumlar[i * 3 + 1] = (Math.random() - 0.5) * 16;
    konumlar[i * 3 + 2] = (Math.random() - 0.5) * 30 - 6;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(konumlar, 3));
  return geo;
}

function Sahne({
  ilerleme,
  hareket,
}: {
  ilerleme: MotionValue<number>;
  hareket: boolean;
}) {
  const elmas = useRef<THREE.Group>(null);
  const parcaciklar = useRef<THREE.Points>(null);
  const elmasGeo = useMemo(() => pirlantaGeometrisi(), []);
  const parcacikGeo = useMemo(() => parcacikAlani(900), []);
  const isaretci = useRef({ x: 0, y: 0 });

  useFrame((state, delta) => {
    const p = ilerleme.get(); // 0..1 sayfa scroll'u
    const t = state.clock.elapsedTime;

    // kamera: scroll ile ileri süzülür, imleci yumuşak takip eder
    isaretci.current.x = THREE.MathUtils.lerp(
      isaretci.current.x,
      state.pointer.x,
      0.03,
    );
    isaretci.current.y = THREE.MathUtils.lerp(
      isaretci.current.y,
      state.pointer.y,
      0.03,
    );
    state.camera.position.z = 6 - p * 7;
    state.camera.position.x = isaretci.current.x * 0.4;
    state.camera.position.y = 0.2 + isaretci.current.y * 0.25;
    state.camera.lookAt(0, 0, -6);

    if (elmas.current) {
      // elmas: scroll'la döner (scrub), hareket açıksa üstüne yavaş salınım
      elmas.current.rotation.y = p * Math.PI * 3 + (hareket ? t * 0.15 : 0);
      elmas.current.rotation.x = 0.3;
      if (hareket) {
        elmas.current.position.y = Math.sin(t * 0.7) * 0.15;
      }
    }
    if (parcaciklar.current && hareket) {
      parcaciklar.current.rotation.y += delta * 0.008;
    }
  });

  return (
    <>
      <fog attach="fog" args={["#0b0a09", 6, 26]} />
      <ambientLight intensity={0.5} />
      <directionalLight position={[4, 5, 3]} intensity={3.2} color="#e8c684" />
      <directionalLight position={[-5, -2, 2]} intensity={0.8} color="#8fb4d9" />
      <directionalLight position={[0, 3, -6]} intensity={2.2} color="#f3e3bd" />
      <pointLight position={[0, 0.5, 1]} intensity={5} color="#ffe9bf" />

      <group ref={elmas} position={[0, 0, -4]}>
        <mesh geometry={elmasGeo}>
          <meshStandardMaterial
            color="#8a6f3d"
            metalness={0.9}
            roughness={0.28}
            flatShading
          />
        </mesh>
        <lineSegments>
          <edgesGeometry args={[elmasGeo, 12]} />
          <lineBasicMaterial color="#f0d9a6" transparent opacity={0.5} />
        </lineSegments>
      </group>

      <points ref={parcaciklar} geometry={parcacikGeo}>
        <pointsMaterial
          color="#d4b06a"
          size={0.045}
          transparent
          opacity={0.55}
          sizeAttenuation
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
    </>
  );
}

export default function Sahne3D({
  ilerleme,
  hareket = true,
}: {
  ilerleme: MotionValue<number>;
  hareket?: boolean;
}) {
  return (
    <div className="fixed inset-0 -z-10" aria-hidden>
      <Canvas
        camera={{ position: [0, 0.2, 6], fov: 42 }}
        dpr={[1, 1.75]}
        gl={{ antialias: true, alpha: false }}
      >
        <color attach="background" args={["#0b0a09"]} />
        <Sahne ilerleme={ilerleme} hareket={hareket} />
      </Canvas>
    </div>
  );
}
