"use client";

import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

// KİMLİK ELMASI — gerçek zamanlı 3B brillant-kesim elmas. 10 liderlik özelliği =
// 10 faset; her özelliğe yatırım yaptıkça (görev tamamladıkça) o faset altın
// ışır, sönükler derin lacivert kalır. Elmas usulca döner, NEFES alır; ışıklar
// yörüngede dönüp yüzeyde kıvılcımlar gezdirir. Saf görsel — hiçbir veri değişmez.

const DIM = new THREE.Color("#0b2740");
const GOLD = new THREE.Color("#f7d97c");

// Bir geometriyi açıya göre 10 fasete böler; her faset değerine göre
// (0..1) lacivert↔altın renklendirir. Merkeze yakın üçgenler ("masa"/tabla)
// her zaman parlak — elmasın üst yıldızı.
function fasetliGeometri(geo: THREE.BufferGeometry, degerler: number[]): THREE.BufferGeometry {
  const g = geo.toNonIndexed();
  const pos = g.attributes.position;
  const renkler = new Float32Array(pos.count * 3);
  const v = new THREE.Vector3();
  const c = new THREE.Color();
  const N = degerler.length;
  for (let i = 0; i < pos.count; i += 3) {
    let cx = 0;
    let cz = 0;
    for (let k = 0; k < 3; k++) {
      v.fromBufferAttribute(pos, i + k);
      cx += v.x;
      cz += v.z;
    }
    cx /= 3;
    cz /= 3;
    const yaricap = Math.hypot(cx, cz);
    let parlak: number;
    if (yaricap < 0.26) {
      parlak = 0.92; // tabla — daima parlak
    } else {
      let ang = Math.atan2(cz, cx);
      if (ang < 0) ang += Math.PI * 2;
      const seg = Math.min(N - 1, Math.floor((ang / (Math.PI * 2)) * N));
      const d = Math.max(0, Math.min(1, degerler[seg] ?? 0));
      parlak = 0.12 + d * 0.88;
    }
    c.copy(DIM).lerp(GOLD, parlak);
    for (let k = 0; k < 3; k++) {
      renkler[(i + k) * 3] = c.r;
      renkler[(i + k) * 3 + 1] = c.g;
      renkler[(i + k) * 3 + 2] = c.b;
    }
  }
  g.setAttribute("color", new THREE.BufferAttribute(renkler, 3));
  g.computeVertexNormals();
  return g;
}

function Elmas({ facetler, parlaklik }: { facetler: number[]; parlaklik: number }) {
  const grup = useRef<THREE.Group>(null);
  const isik1 = useRef<THREE.PointLight>(null);
  const isik2 = useRef<THREE.PointLight>(null);

  // Brillant kesim: kron (üstte, tabla + eğik fasetler) + pavyon (altta, sivri).
  const { geo } = useMemo(() => {
    const kron = new THREE.CylinderGeometry(0.6, 1.0, 0.46, 10, 1, false);
    kron.translate(0, 0.23, 0);
    const pavyon = new THREE.ConeGeometry(1.0, 1.28, 10, 1, false);
    pavyon.rotateX(Math.PI); // sivri uç aşağı
    pavyon.translate(0, -0.64, 0);
    const kronR = fasetliGeometri(kron, facetler);
    const pavR = fasetliGeometri(pavyon, facetler);
    kron.dispose();
    pavyon.dispose();
    return { geo: { kronR, pavR } };
  }, [facetler]);

  const mat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        vertexColors: true,
        metalness: 0.55,
        roughness: 0.12,
        flatShading: true,
        envMapIntensity: 1,
      }),
    [],
  );
  // Dış altın hâle (fresnel benzeri aura): geometrinin biraz büyüğü, arka yüz.
  const auraMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: GOLD,
        side: THREE.BackSide,
        transparent: true,
        opacity: 0.1 + parlaklik * 0.28,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    [parlaklik],
  );

  useFrame((state, delta) => {
    if (grup.current) {
      grup.current.rotation.y += delta * 0.35;
      // Nefes: parlaklık arttıkça biraz daha canlı.
      const t = state.clock.elapsedTime;
      const nefes = 1 + Math.sin(t * (0.9 + parlaklik * 0.6)) * 0.02;
      grup.current.scale.setScalar(nefes);
    }
    const t = state.clock.elapsedTime;
    if (isik1.current) {
      isik1.current.position.set(Math.cos(t * 0.9) * 3, 1.6, Math.sin(t * 0.9) * 3);
    }
    if (isik2.current) {
      isik2.current.position.set(Math.cos(t * 0.6 + 2) * 2.6, -1.2, Math.sin(t * 0.6 + 2) * 2.6);
    }
  });

  return (
    <group ref={grup}>
      <mesh geometry={geo.kronR} material={mat} />
      <mesh geometry={geo.pavR} material={mat} />
      {/* aura */}
      <mesh geometry={geo.kronR} material={auraMat} scale={1.05} />
      <mesh geometry={geo.pavR} material={auraMat} scale={1.05} />
      <hemisphereLight args={["#bcd6ff", "#1a1206", 0.5]} />
      <pointLight ref={isik1} color="#fff3d6" intensity={28} distance={12} />
      <pointLight ref={isik2} color="#7fd7ff" intensity={16} distance={10} />
      <pointLight position={[0, 0, 4]} color="#ffffff" intensity={10} distance={12} />
    </group>
  );
}

// Çevrede twinkle eden kıvılcımlar — "canlı" his.
function Kivilcimlar({ adet, parlaklik }: { adet: number; parlaklik: number }) {
  const ref = useRef<THREE.Points>(null);
  const { geo, mat } = useMemo(() => {
    const pos = new Float32Array(adet * 3);
    for (let i = 0; i < adet; i++) {
      const a = (i / adet) * Math.PI * 2;
      const r = 1.7 + (i % 3) * 0.32;
      pos[i * 3] = Math.cos(a) * r;
      pos[i * 3 + 1] = (((i * 7) % 11) / 11 - 0.5) * 3;
      pos[i * 3 + 2] = Math.sin(a) * r;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const tuval = document.createElement("canvas");
    tuval.width = 64;
    tuval.height = 64;
    const ctx = tuval.getContext("2d")!;
    const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, "rgba(255,247,214,1)");
    grad.addColorStop(0.4, "rgba(247,217,124,0.6)");
    grad.addColorStop(1, "rgba(247,217,124,0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);
    const tex = new THREE.CanvasTexture(tuval);
    const m = new THREE.PointsMaterial({
      size: 0.34,
      map: tex,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      opacity: 0.5 + parlaklik * 0.5,
    });
    return { geo: g, mat: m };
  }, [adet, parlaklik]);

  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.y = state.clock.elapsedTime * 0.12;
      const m = ref.current.material as THREE.PointsMaterial;
      m.opacity = (0.4 + parlaklik * 0.5) * (0.7 + Math.sin(state.clock.elapsedTime * 2.5) * 0.3);
    }
  });

  return <points ref={ref} geometry={geo} material={mat} />;
}

export default function ElmasSahne({
  facetler,
  parlaklik,
  hareketli = true,
}: {
  facetler: number[];
  parlaklik: number;
  hareketli?: boolean;
}) {
  return (
    <Canvas
      dpr={[1, 1.6]}
      gl={{ antialias: true, alpha: true }}
      camera={{ position: [0, 0.25, 3.7], fov: 34 }}
      frameloop={hareketli ? "always" : "demand"}
      style={{ background: "transparent" }}
    >
      <group position={[0, 0.35, 0]}>
        <Elmas facetler={facetler} parlaklik={parlaklik} />
        {hareketli && <Kivilcimlar adet={14} parlaklik={parlaklik} />}
      </group>
    </Canvas>
  );
}
