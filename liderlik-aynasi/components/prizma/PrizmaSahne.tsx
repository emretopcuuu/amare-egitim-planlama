"use client";

import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

// PRİZMA evreninin imzası: grafit boşlukta süzülen, ışığı sedefli tayfa
// kıran ayna kırıkları. Gerçek WebGL (three.js) — MeshPhysicalMaterial'ın
// iridescence katmanı holografik kırılımı verir; RoomEnvironment ücretsiz
// ve asset'siz yansıma ortamı sağlar. Telefon bütçesi: ≤28 parça, dpr ≤1.5.

type Kirik = {
  poz: [number, number, number];
  don: [number, number, number];
  olcek: [number, number, number];
  hiz: number;
  faz: number;
};

// Deterministik sözde-rastgele: her açılışta aynı kompozisyon (mulberry32)
function rastgeleUret(tohum: number) {
  let t = tohum;
  return () => {
    t |= 0;
    t = (t + 0x6d2b79f5) | 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function kiriklarUret(adet: number): Kirik[] {
  const r = rastgeleUret(40);
  return Array.from({ length: adet }, () => ({
    poz: [(r() - 0.5) * 9, (r() - 0.5) * 7, -1.5 - r() * 4],
    don: [r() * Math.PI, r() * Math.PI, r() * Math.PI],
    olcek: [0.25 + r() * 0.9, 0.5 + r() * 1.6, 0.015],
    hiz: 0.15 + r() * 0.35,
    faz: r() * Math.PI * 2,
  }));
}

function Ortam() {
  const { gl, scene } = useThree();
  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const ortam = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    // three.js sahne API'si mutasyonla çalışır — fiber'da olağan desen.
    // eslint-disable-next-line react-hooks/immutability
    scene.environment = ortam;
    return () => {
      ortam.dispose();
      pmrem.dispose();
    };
  }, [gl, scene]);
  return null;
}

function Kiriklar({ adet, hareketli }: { adet: number; hareketli: boolean }) {
  const grup = useRef<THREE.Group>(null);
  const kiriklar = useMemo(() => kiriklarUret(adet), [adet]);
  const zaman = useRef(0);

  useFrame((durum, dt) => {
    const g = grup.current;
    if (!g) return;
    // İşaretçi paralaksı her zaman (hareket azaltmada bile statik kalsın diye hareketli'ye bağlı)
    if (hareketli) {
      zaman.current += dt;
      g.rotation.y = THREE.MathUtils.lerp(
        g.rotation.y,
        durum.pointer.x * 0.18,
        0.04
      );
      g.rotation.x = THREE.MathUtils.lerp(
        g.rotation.x,
        -durum.pointer.y * 0.12,
        0.04
      );
      g.children.forEach((parca, i) => {
        const k = kiriklar[i];
        parca.position.y =
          k.poz[1] + Math.sin(zaman.current * k.hiz + k.faz) * 0.35;
        parca.rotation.x += dt * 0.08 * k.hiz;
        parca.rotation.y += dt * 0.11 * k.hiz;
      });
    }
  });

  return (
    <group ref={grup}>
      {kiriklar.map((k, i) => (
        <mesh key={i} position={k.poz} rotation={k.don} scale={k.olcek}>
          <boxGeometry args={[1, 1, 1]} />
          <meshPhysicalMaterial
            color="#cfd3dc"
            metalness={0.92}
            roughness={0.12}
            iridescence={1}
            iridescenceIOR={1.7}
            iridescenceThicknessRange={[120, 480]}
            envMapIntensity={1.4}
            transparent
            opacity={0.92}
          />
        </mesh>
      ))}
    </group>
  );
}

export default function PrizmaSahne({
  adet = 22,
  hareketli = true,
}: {
  adet?: number;
  hareketli?: boolean;
}) {
  return (
    <Canvas
      dpr={[1, 1.5]}
      camera={{ position: [0, 0, 6], fov: 50 }}
      gl={{ antialias: true, alpha: true, powerPreference: "low-power" }}
      style={{ pointerEvents: "none" }}
      eventSource={typeof document !== "undefined" ? document.body : undefined}
    >
      <Ortam />
      <ambientLight intensity={0.25} />
      <directionalLight position={[4, 6, 5]} intensity={1.1} color="#ffffff" />
      <pointLight position={[-5, -3, 2]} intensity={0.5} color="#9be7ff" />
      <pointLight position={[5, 2, -3]} intensity={0.4} color="#ffb3e6" />
      <Kiriklar adet={adet} hareketli={hareketli} />
    </Canvas>
  );
}
