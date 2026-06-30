"use client";

import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

// KİMLİK ELMASI v2 — GERÇEK kırılmalı kristal elmas. MeshPhysicalMaterial ile
// transmission (cam/kırılma) + dispersion (gökkuşağı kenarlar) + clearcoat.
// İçinde ALTIN ATEŞ: her görevle büyüyen bir kor + 10 özelliğe karşılık 10 iç
// kıvılcım; camdan kırılarak ışıldar. Elmas HEP parlak (env yansımalarıyla
// kamp başında bile boş görünmez), usulca döner ve nefes alır. Saf görsel.

// Brillant-kesim geometri: kron (üstte tabla + eğik fasetler) + pavyon (sivri uç).
function elmasGeometri(): THREE.BufferGeometry {
  const kron = new THREE.CylinderGeometry(0.58, 1.0, 0.46, 10, 1, false);
  kron.translate(0, 0.23, 0);
  const pavyon = new THREE.ConeGeometry(1.0, 1.3, 10, 1, false);
  pavyon.rotateX(Math.PI);
  pavyon.translate(0, -0.65, 0);
  // İki parçayı tek non-indexed geometride birleştir (flat fasetler için).
  const birlestir = (g: THREE.BufferGeometry) => g.toNonIndexed();
  const a = birlestir(kron);
  const b = birlestir(pavyon);
  const pa = a.attributes.position.array as Float32Array;
  const pb = b.attributes.position.array as Float32Array;
  const pos = new Float32Array(pa.length + pb.length);
  pos.set(pa, 0);
  pos.set(pb, pa.length);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.computeVertexNormals();
  kron.dispose();
  pavyon.dispose();
  a.dispose();
  b.dispose();
  return geo;
}

// Prosedürel equirectangular ortam (cam taşın yansıtıp kıracağı ışık dünyası):
// koyu lacivart gök + altın/teal/beyaz parlak lekeler → kristalde kıvılcımlar.
function ortamTexturesi(): THREE.Texture {
  const c = document.createElement("canvas");
  c.width = 1024;
  c.height = 512;
  const ctx = c.getContext("2d")!;
  const g = ctx.createLinearGradient(0, 0, 0, 512);
  g.addColorStop(0, "#0a1f38");
  g.addColorStop(0.5, "#0c2742");
  g.addColorStop(1, "#04101c");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 1024, 512);
  const lekeler: [number, number, number, string][] = [
    [240, 150, 150, "rgba(255,239,196,0.95)"], // altın güneş
    [760, 120, 110, "rgba(255,255,255,0.9)"], // beyaz parlama
    [520, 300, 130, "rgba(126,211,255,0.6)"], // teal
    [880, 360, 90, "rgba(255,214,140,0.7)"], // altın
    [120, 380, 80, "rgba(180,210,255,0.5)"], // soğuk
  ];
  for (const [x, y, r, renk] of lekeler) {
    const rg = ctx.createRadialGradient(x, y, 0, x, y, r);
    rg.addColorStop(0, renk);
    rg.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = rg;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.mapping = THREE.EquirectangularReflectionMapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// Ortamı sahneye kur (PMREM ile filtrelenmiş env → yumuşak yansıma/kırılma).
function Ortam() {
  const { gl, scene } = useThree();
  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const ham = ortamTexturesi();
    const env = pmrem.fromEquirectangular(ham).texture;
    scene.environment = env;
    ham.dispose();
    pmrem.dispose();
    return () => {
      scene.environment = null;
      env.dispose();
    };
  }, [gl, scene]);
  return null;
}

function Elmas({ facetler, parlaklik }: { facetler: number[]; parlaklik: number }) {
  const grup = useRef<THREE.Group>(null);
  const korRef = useRef<THREE.Mesh>(null);
  const isikRef = useRef<THREE.PointLight>(null);

  const geo = useMemo(() => elmasGeometri(), []);
  const mat = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        transmission: 1,
        thickness: 1.4,
        ior: 2.42, // elmas
        roughness: 0.03,
        metalness: 0,
        clearcoat: 1,
        clearcoatRoughness: 0.06,
        dispersion: 6, // gökkuşağı kenarlar (kromatik)
        attenuationColor: new THREE.Color("#fff3d6"),
        attenuationDistance: 2.4,
        color: new THREE.Color("#ffffff"),
        envMapIntensity: 2.0,
        flatShading: true,
      }),
    [],
  );

  // İç altın ATEŞ koru — parlaklıkla büyür/parlar (camdan kırılarak görünür).
  const korMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: new THREE.Color("#ffd27a"),
        transparent: true,
        toneMapped: false,
      }),
    [],
  );
  const korGeo = useMemo(() => new THREE.IcosahedronGeometry(0.5, 1), []);

  // 10 iç kıvılcım — her biri bir özelliğe (facet) karşılık; değeri arttıkça parlar.
  const kivilcimlar = useMemo(() => {
    const renkA = new THREE.Color("#0a1f33"); // sönük
    const renkB = new THREE.Color("#ffdf9a"); // dolu altın
    return facetler.map((deger, i) => {
      const a = (i / facetler.length) * Math.PI * 2;
      const yar = 0.42;
      const y = ((i % 5) / 5 - 0.4) * 0.7;
      const c = renkA.clone().lerp(renkB, Math.max(0.04, deger));
      return { pos: [Math.cos(a) * yar, y, Math.sin(a) * yar] as [number, number, number], renk: c, deger };
    });
  }, [facetler]);

  const korOlcek = 0.4 + parlaklik * 0.7;

  useFrame((state, delta) => {
    if (grup.current) {
      grup.current.rotation.y += delta * 0.4;
      const t = state.clock.elapsedTime;
      grup.current.scale.setScalar(1 + Math.sin(t * (0.8 + parlaklik * 0.6)) * 0.018);
    }
    if (korRef.current) {
      // ateş nefes alır
      const t = state.clock.elapsedTime;
      const titre = korOlcek * (1 + Math.sin(t * 3) * 0.08);
      korRef.current.scale.setScalar(titre);
      (korRef.current.material as THREE.MeshBasicMaterial).opacity = 0.55 + parlaklik * 0.4;
    }
    if (isikRef.current) {
      const t = state.clock.elapsedTime;
      isikRef.current.position.set(Math.cos(t * 0.8) * 3.2, 1.8, Math.sin(t * 0.8) * 3.2);
    }
  });

  return (
    <group ref={grup}>
      {/* İç altın ateş + 10 kıvılcım (camın ARDINDA → kırılarak görünür) */}
      <mesh ref={korRef} geometry={korGeo} material={korMat} />
      {kivilcimlar.map((k, i) => (
        <mesh key={i} position={k.pos} scale={0.07 + k.deger * 0.06}>
          <sphereGeometry args={[1, 8, 8]} />
          <meshBasicMaterial color={k.renk} toneMapped={false} />
        </mesh>
      ))}

      {/* Kristal kabuk — gerçek kırılma */}
      <mesh geometry={geo} material={mat} />

      {/* Işıklar: clearcoat parıltıları + env zaten yansıma sağlıyor */}
      <ambientLight intensity={0.35} />
      <pointLight ref={isikRef} color="#fff3d6" intensity={26} distance={14} />
      <pointLight position={[-3, -1.5, 2.5]} color="#7fd7ff" intensity={12} distance={12} />
      <directionalLight position={[0, 3, 4]} intensity={1.2} color="#ffffff" />
    </group>
  );
}

// Çevrede twinkle eden kıvılcımlar — dışarıda dönen yıldız tozu.
function Yildizlar({ adet, parlaklik }: { adet: number; parlaklik: number }) {
  const ref = useRef<THREE.Points>(null);
  const { geo, mat } = useMemo(() => {
    const pos = new Float32Array(adet * 3);
    for (let i = 0; i < adet; i++) {
      const a = (i / adet) * Math.PI * 2;
      const r = 1.85 + (i % 3) * 0.34;
      pos[i * 3] = Math.cos(a) * r;
      pos[i * 3 + 1] = (((i * 7) % 11) / 11 - 0.5) * 3.2;
      pos[i * 3 + 2] = Math.sin(a) * r;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const t = document.createElement("canvas");
    t.width = 64;
    t.height = 64;
    const ctx = t.getContext("2d")!;
    const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, "rgba(255,247,214,1)");
    grad.addColorStop(0.4, "rgba(247,217,124,0.55)");
    grad.addColorStop(1, "rgba(247,217,124,0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);
    const tex = new THREE.CanvasTexture(t);
    const m = new THREE.PointsMaterial({
      size: 0.3,
      map: tex,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      opacity: 0.5 + parlaklik * 0.4,
    });
    return { geo: g, mat: m };
  }, [adet, parlaklik]);

  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.y = state.clock.elapsedTime * 0.1;
      const m = ref.current.material as THREE.PointsMaterial;
      m.opacity = (0.4 + parlaklik * 0.45) * (0.7 + Math.sin(state.clock.elapsedTime * 2.4) * 0.3);
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
      gl={{ antialias: true, alpha: true, toneMapping: THREE.ACESFilmicToneMapping }}
      camera={{ position: [0, 0.25, 3.8], fov: 32 }}
      frameloop={hareketli ? "always" : "demand"}
      style={{ background: "transparent" }}
    >
      <Ortam />
      <group position={[0, 0.35, 0]}>
        <Elmas facetler={facetler} parlaklik={parlaklik} />
        {hareketli && <Yildizlar adet={16} parlaklik={parlaklik} />}
      </group>
    </Canvas>
  );
}
