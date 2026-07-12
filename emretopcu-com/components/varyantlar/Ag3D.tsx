"use client";

import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { MotionValue } from "motion/react";

// "Canlı Ağ": karanlıkta dönen bir küre; yüzeyine dağılmış altın düğümler ve
// yakın düğümler arası ışık bağlantıları. Scroll ilerledikçe ağ büyür (daha
// çok düğüm ve bağlantı belirir), kamera geri çekilip tüm ağı gösterir.
// "Kimse tek başına başarmadı." — 4 kıtada 220.000 kişilik ağın metaforu.
// prefers-reduced-motion durumunda salınım durur; ağ yine scroll'u izler.

const DUGUM_SAYISI = 260;
const YARICAP = 2.4;

// Fibonacci küresi: düğümleri yüzeye düzgün dağıtır.
function kureNoktalari(adet: number) {
  const noktalar: THREE.Vector3[] = [];
  const altinAci = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < adet; i++) {
    const y = 1 - (i / (adet - 1)) * 2;
    const r = Math.sqrt(1 - y * y);
    const theta = altinAci * i;
    noktalar.push(
      new THREE.Vector3(
        Math.cos(theta) * r * YARICAP,
        y * YARICAP,
        Math.sin(theta) * r * YARICAP,
      ),
    );
  }
  return noktalar;
}

// Yakın düğümleri bağla; her bağlantı düğüm sırasına göre "beliriş" eşiği taşır.
function baglantilar(noktalar: THREE.Vector3[]) {
  const cizgiler: { a: number; b: number; esik: number }[] = [];
  const esikMesafe = YARICAP * 0.62;
  for (let i = 0; i < noktalar.length; i++) {
    for (let j = i + 1; j < noktalar.length; j++) {
      if (noktalar[i].distanceTo(noktalar[j]) < esikMesafe) {
        cizgiler.push({
          a: i,
          b: j,
          esik: Math.max(i, j) / noktalar.length, // ne kadar geç belireceği
        });
      }
    }
  }
  return cizgiler;
}

function Ag({
  ilerleme,
  hareket,
}: {
  ilerleme: MotionValue<number>;
  hareket: boolean;
}) {
  const grup = useRef<THREE.Group>(null);
  const cizgiGeo = useRef<THREE.BufferGeometry>(null);
  const noktaGeo = useRef<THREE.BufferGeometry>(null);
  const isaretci = useRef({ x: 0, y: 0 });

  const { noktalar, ciz, cizgiKonum, noktaKonum, noktaTemel } = useMemo(() => {
    const noktalar = kureNoktalari(DUGUM_SAYISI);
    const ciz = baglantilar(noktalar);
    const cizgiKonum = new Float32Array(ciz.length * 6);
    const noktaKonum = new Float32Array(noktalar.length * 3);
    const noktaTemel = new Float32Array(noktalar.length); // beliriş eşiği
    noktalar.forEach((p, i) => {
      noktaKonum[i * 3] = p.x;
      noktaKonum[i * 3 + 1] = p.y;
      noktaKonum[i * 3 + 2] = p.z;
      noktaTemel[i] = i / noktalar.length;
    });
    return { noktalar, ciz, cizgiKonum, noktaKonum, noktaTemel };
  }, []);

  useFrame((state, delta) => {
    const p = ilerleme.get(); // 0..1 sayfa scroll'u
    const t = state.clock.elapsedTime;

    // ağ ne kadar "açıldı": scroll'un ilk yarısında hızla büyür
    const acilim = Math.min(1, 0.25 + p * 1.6);

    if (grup.current) {
      if (hareket) grup.current.rotation.y += delta * 0.12;
      grup.current.rotation.x = 0.12 + (hareket ? Math.sin(t * 0.3) * 0.05 : 0);
    }

    // imleç paralaksı + scroll ile kamera geri çekilir
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
    state.camera.position.x = isaretci.current.x * 0.8;
    state.camera.position.y = isaretci.current.y * 0.5;
    state.camera.position.z = 6.2 + p * 2.2;
    state.camera.lookAt(0, 0, 0);

    // görünür bağlantı sayısını güncelle (eşiği açılımın altında kalanlar)
    if (cizgiGeo.current) {
      let n = 0;
      for (const c of ciz) {
        if (c.esik <= acilim) {
          const a = noktalar[c.a];
          const b = noktalar[c.b];
          cizgiKonum[n++] = a.x;
          cizgiKonum[n++] = a.y;
          cizgiKonum[n++] = a.z;
          cizgiKonum[n++] = b.x;
          cizgiKonum[n++] = b.y;
          cizgiKonum[n++] = b.z;
        }
      }
      const attr = cizgiGeo.current.getAttribute(
        "position",
      ) as THREE.BufferAttribute;
      attr.needsUpdate = true;
      cizgiGeo.current.setDrawRange(0, n / 3);
    }

    // görünür düğüm sayısı
    if (noktaGeo.current) {
      let görünen = 0;
      for (let i = 0; i < noktaTemel.length; i++) {
        if (noktaTemel[i] <= acilim) görünen = i + 1;
      }
      noktaGeo.current.setDrawRange(0, görünen);
    }
  });

  return (
    <group ref={grup}>
      {/* ince küre teli — ağın "dünya" hissi (açık zeminde soluk altın) */}
      <mesh>
        <sphereGeometry args={[YARICAP * 0.985, 32, 24]} />
        <meshBasicMaterial
          color="#c9b78a"
          wireframe
          transparent
          opacity={0.14}
        />
      </mesh>

      {/* bağlantı iplikleri — açık zeminde koyu altın, normal harmanlama */}
      <lineSegments frustumCulled={false}>
        <bufferGeometry ref={cizgiGeo}>
          <bufferAttribute
            attach="attributes-position"
            args={[cizgiKonum, 3]}
            count={cizgiKonum.length / 3}
          />
        </bufferGeometry>
        <lineBasicMaterial
          color="#a07f36"
          transparent
          opacity={0.28}
          depthWrite={false}
        />
      </lineSegments>

      {/* düğümler — derin altın, açık zeminde okunur */}
      <points frustumCulled={false}>
        <bufferGeometry ref={noktaGeo}>
          <bufferAttribute
            attach="attributes-position"
            args={[noktaKonum, 3]}
            count={noktaKonum.length / 3}
          />
        </bufferGeometry>
        <pointsMaterial
          color="#8a6d24"
          size={0.05}
          sizeAttenuation
          transparent
          opacity={0.85}
          depthWrite={false}
        />
      </points>
    </group>
  );
}

export default function Ag3D({
  ilerleme,
  hareket = true,
}: {
  ilerleme: MotionValue<number>;
  hareket?: boolean;
}) {
  return (
    <div className="fixed inset-0 -z-10" aria-hidden>
      <Canvas
        camera={{ position: [0, 0, 6.2], fov: 45 }}
        dpr={[1, 1.75]}
        gl={{ antialias: true, alpha: false }}
      >
        <color attach="background" args={["#f1efe9"]} />
        <fog attach="fog" args={["#f1efe9", 8, 16]} />
        <Ag ilerleme={ilerleme} hareket={hareket} />
      </Canvas>
    </div>
  );
}
