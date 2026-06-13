"use client";

/* İmperatif WebGL: dönme/rotasyon ref'leri useFrame ve pointer olaylarında
   mutasyonla güncellenir (r3f deseni) — render saflığını bozmaz. */
/* eslint-disable react-hooks/immutability */
import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

// 3B VERİ PORTRESİ: 10 liderlik özelliğin, döndürülebilir bir kristale dönüşür.
// Her özellik gövdede bir çıkıntı; dış puanı ne kadar yüksekse o yön o kadar
// uzun. Profilin asimetrisi elle çevrilebilir bir mücevver olarak görünür.
// Harici kütüphane yok (drei değil); dönme elle, three ile.

function kristalGeometrisi(degerler: number[]): THREE.BufferGeometry {
  const n = degerler.length;
  const tepe = new THREE.Vector3(0, 0.95, 0);
  const dip = new THREE.Vector3(0, -0.95, 0);
  const halka: THREE.Vector3[] = degerler.map((d, i) => {
    const a = (i / n) * Math.PI * 2;
    const r = 0.55 + (Math.max(0, Math.min(10, d)) / 10) * 1.05; // 0.55..1.6
    return new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r);
  });

  const noktalar: number[] = [];
  const ekle = (v: THREE.Vector3) => noktalar.push(v.x, v.y, v.z);
  for (let i = 0; i < n; i++) {
    const a = halka[i];
    const b = halka[(i + 1) % n];
    // üst yüz
    ekle(tepe);
    ekle(a);
    ekle(b);
    // alt yüz
    ekle(dip);
    ekle(b);
    ekle(a);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(noktalar, 3));
  geo.computeVertexNormals();
  return geo;
}

function Kristal({
  degerler,
  donme,
  hareketli,
}: {
  degerler: number[];
  donme: React.MutableRefObject<{ x: number; y: number; suruluyor: boolean }>;
  hareketli: boolean;
}) {
  const grup = useRef<THREE.Group>(null);
  const geo = useMemo(() => kristalGeometrisi(degerler), [degerler]);
  const kenarlar = useMemo(() => new THREE.EdgesGeometry(geo, 1), [geo]);

  useFrame(() => {
    if (!grup.current) return;
    if (hareketli && !donme.current.suruluyor) donme.current.y += 0.004;
    grup.current.rotation.y = donme.current.y;
    grup.current.rotation.x = donme.current.x;
  });

  return (
    <group ref={grup}>
      <mesh geometry={geo}>
        <meshStandardMaterial
          color="#cfe6ff"
          emissive="#f59e0b"
          emissiveIntensity={0.18}
          metalness={0.35}
          roughness={0.25}
          flatShading
          transparent
          opacity={0.92}
        />
      </mesh>
      <lineSegments geometry={kenarlar}>
        <lineBasicMaterial color="#fbe3a8" transparent opacity={0.5} />
      </lineSegments>
    </group>
  );
}

export default function KristalPortre({ degerler }: { degerler: number[] }) {
  const donme = useRef({ x: 0.18, y: 0.4, suruluyor: false });
  const son = useRef({ x: 0, y: 0 });
  const [hareketli] = useState(
    () =>
      typeof window === "undefined" ||
      !window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
  );
  // WebGL yalnız istemcide kurulur — SSR'da yer tutucu göster.
  const [hazir, setHazir] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setHazir(true), []);
  if (!hazir) {
    return <div className="iskelet h-64 w-full rounded-2xl" />;
  }

  return (
    <div
      className="h-64 w-full cursor-grab touch-none rounded-2xl active:cursor-grabbing"
      onPointerDown={(e) => {
        donme.current.suruluyor = true;
        son.current = { x: e.clientX, y: e.clientY };
        (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
      }}
      onPointerMove={(e) => {
        if (!donme.current.suruluyor) return;
        donme.current.y += (e.clientX - son.current.x) * 0.01;
        donme.current.x = Math.max(
          -1.2,
          Math.min(1.2, donme.current.x + (e.clientY - son.current.y) * 0.01)
        );
        son.current = { x: e.clientX, y: e.clientY };
      }}
      onPointerUp={() => {
        donme.current.suruluyor = false;
      }}
      onPointerLeave={() => {
        donme.current.suruluyor = false;
      }}
    >
      <Canvas camera={{ position: [0, 0.4, 3.6], fov: 42 }} dpr={[1, 2]}>
        <ambientLight intensity={0.6} />
        <pointLight position={[3, 4, 5]} intensity={40} color="#fff4d6" />
        <pointLight position={[-4, -2, -3]} intensity={18} color="#7cc4ff" />
        <Kristal degerler={degerler} donme={donme} hareketli={hareketli} />
      </Canvas>
    </div>
  );
}
