"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { MotionValue } from "motion/react";
import { useTema } from "@/lib/tema";

// "Canlı Ağ": karanlıkta dönen bir küre; yüzeyine dağılmış altın düğümler ve
// yakın düğümler arası ışık bağlantıları. Scroll ilerledikçe ağ büyür, kamera
// geri çekilir. "4 kıta" bölümüne gelince aynı küre DÜNYAYA dönüşür (morf):
// düğümler ülke konumlarına akar, İstanbul'dan altın yaylar uzanır, bölüm
// geçilince ağ haline geri döner. Tek sahne, tek canvas — "ağ = dünya".
// prefers-reduced-motion'da salınım durur; morf scroll'a bağlı kalır.

const DUGUM_MASAUSTU = 260;
const DUGUM_MOBIL = 120;
const YARICAP = 2.4;

// Sahne renkleri temaya göre (gündüz porselen / gece mürekkep laciverti).
const PALET = {
  gunduz: { zemin: "#f1efe9", kure: "#c9b78a", cizgi: "#a07f36", nokta: "#8a6d24" },
  gece: { zemin: "#0f1220", kure: "#5b5330", cizgi: "#b8912f", nokta: "#e3c366" },
} as const;

// İstanbul + 4 kıtaya yayılmış 38 temsili erişim noktası (enlem, boylam).
// Noktalar temsilidir; başlıktaki rakamlar gerçektir.
const ISTANBUL: [number, number] = [41.01, 28.98];
const ULKELER: [number, number][] = [
  [51.5, -0.13], [48.85, 2.35], [52.52, 13.4], [40.42, -3.7], [41.9, 12.5],
  [52.37, 4.9], [48.21, 16.37], [59.33, 18.07], [52.23, 21.01], [50.45, 30.52],
  [55.75, 37.62], [38.0, 23.73], [47.37, 8.54], [38.72, -9.14], [44.43, 26.1],
  [40.41, 49.87], [25.2, 55.27], [24.71, 46.68], [28.61, 77.21], [19.08, 72.88],
  [13.76, 100.5], [1.35, 103.82], [22.32, 114.17], [35.68, 139.69], [37.57, 126.98],
  [43.24, 76.89], [35.69, 51.39], [41.3, 69.24], [30.04, 31.24], [33.57, -7.59],
  [6.52, 3.38], [-26.2, 28.04], [40.71, -74.0], [34.05, -118.24], [43.65, -79.38],
  [19.43, -99.13], [-23.55, -46.63], [-33.87, 151.21],
];

// Yay çizgilerinin paylaşılan malzemesi (opaklık/renk tek yerden sürülür).
const yayMalzeme = new THREE.LineBasicMaterial({
  color: "#a07f36",
  transparent: true,
  opacity: 0,
  depthWrite: false,
});

function cografiKonum(lat: number, lon: number, r = YARICAP): THREE.Vector3 {
  const phi = ((90 - lat) * Math.PI) / 180;
  const theta = ((lon + 180) * Math.PI) / 180;
  return new THREE.Vector3(
    -r * Math.sin(phi) * Math.cos(theta),
    r * Math.cos(phi),
    r * Math.sin(phi) * Math.sin(theta),
  );
}

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

// İstanbul'dan bir ülkeye yükselen yay (quadratic bezier, 28 nokta).
function yayGeometrisi(merkez: THREE.Vector3, uc: THREE.Vector3) {
  const orta = merkez.clone().add(uc).multiplyScalar(0.5);
  const yukseklik = YARICAP * (1.1 + merkez.distanceTo(uc) * 0.12);
  orta.normalize().multiplyScalar(yukseklik);
  const egri = new THREE.QuadraticBezierCurve3(merkez, orta, uc);
  return new THREE.BufferGeometry().setFromPoints(egri.getPoints(28));
}

function Ag({
  ilerleme,
  morf,
  hareket,
  dugumSayisi,
  tema,
}: {
  ilerleme: MotionValue<number>;
  morf: MotionValue<number>;
  hareket: boolean;
  dugumSayisi: number;
  tema: "gunduz" | "gece";
}) {
  const grup = useRef<THREE.Group>(null);
  const cizgiGeo = useRef<THREE.BufferGeometry>(null);
  const noktaGeo = useRef<THREE.BufferGeometry>(null);
  const kureMat = useRef<THREE.MeshBasicMaterial>(null);
  const cizgiMat = useRef<THREE.LineBasicMaterial>(null);
  const noktaMat = useRef<THREE.PointsMaterial>(null);
  const yayMat = useRef<THREE.LineBasicMaterial>(yayMalzeme);
  const istMarker = useRef<THREE.Mesh>(null);
  const isaretci = useRef({ x: 0, y: 0 });
  const { scene } = useThree();

  const {
    noktalar,
    ciz,
    cizgiKonum,
    noktaKonum,
    noktaTemel,
    hedefKonum,
    simdiKonum,
    yaylar,
    istanbulPos,
  } = useMemo(() => {
    const noktalar = kureNoktalari(dugumSayisi);
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
    // Morf hedefleri: her düğüm bir şehir noktasına (küçük sapmayla) akar —
    // kümelenme organik "ışıyan şehirler" görüntüsü verir.
    const istanbulPos = cografiKonum(ISTANBUL[0], ISTANBUL[1]);
    const sehirler = [istanbulPos, ...ULKELER.map(([a, b]) => cografiKonum(a, b))];
    const hedefKonum = new Float32Array(noktalar.length * 3);
    for (let i = 0; i < noktalar.length; i++) {
      const s = sehirler[i % sehirler.length];
      // deterministik küçük sapma (i'ye bağlı; Math.random build'i bozar)
      const j1 = Math.sin(i * 12.9898) * 0.06;
      const j2 = Math.sin(i * 78.233) * 0.06;
      const v = s
        .clone()
        .add(new THREE.Vector3(j1, j2, j1 - j2))
        .normalize()
        .multiplyScalar(YARICAP);
      hedefKonum[i * 3] = v.x;
      hedefKonum[i * 3 + 1] = v.y;
      hedefKonum[i * 3 + 2] = v.z;
    }
    const simdiKonum = new Float32Array(noktaKonum); // her karede yazılan çalışma dizisi
    const yaylar = ULKELER.map(
      ([a, b]) =>
        new THREE.Line(
          yayGeometrisi(istanbulPos, cografiKonum(a, b)),
          yayMalzeme,
        ),
    );
    return {
      noktalar,
      ciz,
      cizgiKonum,
      noktaKonum,
      noktaTemel,
      hedefKonum,
      simdiKonum,
      yaylar,
      istanbulPos,
    };
  }, [dugumSayisi]);

  // Tema değişince sahne zemini, sisi ve malzeme renklerini güncelle.
  useEffect(() => {
    const p = PALET[tema];
    scene.background = new THREE.Color(p.zemin);
    if (scene.fog) scene.fog.color.set(p.zemin);
    kureMat.current?.color.set(p.kure);
    cizgiMat.current?.color.set(p.cizgi);
    noktaMat.current?.color.set(p.nokta);
    yayMat.current?.color.set(p.cizgi);
  }, [tema, scene]);

  useFrame((state, delta) => {
    const p = ilerleme.get(); // 0..1 sayfa scroll'u
    const t = state.clock.elapsedTime;
    const mHam = morf.get(); // 0..1 dünya morfu
    const m = mHam * mHam * (3 - 2 * mHam); // smoothstep

    // ağ ne kadar "açıldı": scroll'un ilk yarısında hızla büyür
    const acilim = Math.min(1, 0.25 + p * 1.6);

    if (grup.current) {
      if (hareket) grup.current.rotation.y += delta * (0.12 - m * 0.07);
      grup.current.rotation.x =
        (0.12 + (hareket ? Math.sin(t * 0.3) * 0.05 : 0)) * (1 - m) + 0.32 * m;
      // Küre koreografisi: bölümlere göre sahnede yer değiştirir; morf
      // sırasında merkeze çekilir (dünya sahnenin yıldızı olur).
      grup.current.position.x = Math.sin(p * Math.PI * 2) * 1.15 * (1 - m);
      grup.current.position.y = Math.sin(p * Math.PI * 3) * 0.25 * (1 - m);
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
    state.camera.position.x = isaretci.current.x * 0.8 * (1 - m * 0.7);
    state.camera.position.y = isaretci.current.y * 0.5 * (1 - m * 0.7);
    state.camera.position.z = 6.2 + p * 2.2 - m * 1.1;
    state.camera.lookAt(0, 0, 0);

    // Morf: düğümler ağ konumundan şehir konumuna akar.
    for (let i = 0; i < simdiKonum.length; i++) {
      simdiKonum[i] = noktaKonum[i] + (hedefKonum[i] - noktaKonum[i]) * m;
    }
    if (noktaGeo.current) {
      const attr = noktaGeo.current.getAttribute("position") as THREE.BufferAttribute;
      (attr.array as Float32Array).set(simdiKonum);
      attr.needsUpdate = true;
    }

    // görünür bağlantı sayısını güncelle (uçlar morf edilmiş konumlardan)
    if (cizgiGeo.current) {
      let n = 0;
      for (const c of ciz) {
        if (c.esik <= acilim) {
          cizgiKonum[n++] = simdiKonum[c.a * 3];
          cizgiKonum[n++] = simdiKonum[c.a * 3 + 1];
          cizgiKonum[n++] = simdiKonum[c.a * 3 + 2];
          cizgiKonum[n++] = simdiKonum[c.b * 3];
          cizgiKonum[n++] = simdiKonum[c.b * 3 + 1];
          cizgiKonum[n++] = simdiKonum[c.b * 3 + 2];
        }
      }
      const attr = cizgiGeo.current.getAttribute(
        "position",
      ) as THREE.BufferAttribute;
      attr.needsUpdate = true;
      cizgiGeo.current.setDrawRange(0, n / 3);
    }
    if (cizgiMat.current) cizgiMat.current.opacity = 0.28 * (1 - m * 0.75);

    // görünür düğüm sayısı
    if (noktaGeo.current) {
      let görünen = 0;
      for (let i = 0; i < noktaTemel.length; i++) {
        if (noktaTemel[i] <= acilim) görünen = i + 1;
      }
      noktaGeo.current.setDrawRange(0, görünen);
    }

    // İstanbul yayları + işaretçisi yalnız morf sırasında görünür
    if (yayMat.current) {
      yayMat.current.opacity = 0.38 * m;
      yayMat.current.visible = m > 0.02;
    }
    if (istMarker.current) {
      const s = 0.0001 + m;
      istMarker.current.scale.setScalar(s);
      (istMarker.current.material as THREE.MeshBasicMaterial).opacity = m;
    }
  });

  return (
    <group ref={grup}>
      {/* ince küre teli — ağın "dünya" hissi (açık zeminde soluk altın) */}
      <mesh>
        <sphereGeometry args={[YARICAP * 0.985, 32, 24]} />
        <meshBasicMaterial
          ref={kureMat}
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
          ref={cizgiMat}
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
          ref={noktaMat}
          color="#8a6d24"
          size={0.05}
          sizeAttenuation
          transparent
          opacity={0.85}
          depthWrite={false}
        />
      </points>

      {/* İstanbul'dan 38 erişim yayı — yalnız dünya halinde ışır */}
      <group>
        {yaylar.map((l, i) => (
          <primitive key={i} object={l} />
        ))}
      </group>

      {/* İstanbul işaretçisi */}
      <mesh ref={istMarker} position={istanbulPos}>
        <sphereGeometry args={[0.05, 16, 16]} />
        <meshBasicMaterial color="#c9a227" transparent opacity={0} />
      </mesh>
    </group>
  );
}

export default function Ag3D({
  ilerleme,
  morf,
  hareket = true,
}: {
  ilerleme: MotionValue<number>;
  morf: MotionValue<number>;
  hareket?: boolean;
}) {
  // Mobilde daha az düğüm; düşük dpr. İlk render'da ölç, sonra sabit tut.
  const [mobil, setMobil] = useState(false);
  // Sekme arka plandayken render'ı durdur (pil/CPU tasarrufu).
  const [gorunur, setGorunur] = useState(true);
  const [tema] = useTema();

  useEffect(() => {
    setMobil(window.matchMedia("(max-width: 767px)").matches);
    const gorunurluk = () => setGorunur(!document.hidden);
    document.addEventListener("visibilitychange", gorunurluk);
    return () => document.removeEventListener("visibilitychange", gorunurluk);
  }, []);

  const zemin = PALET[tema].zemin;

  return (
    <div className="fixed inset-0 -z-10" aria-hidden>
      <Canvas
        camera={{ position: [0, 0, 6.2], fov: 45 }}
        dpr={mobil ? [1, 1.3] : [1, 1.75]}
        gl={{ antialias: !mobil, alpha: false, powerPreference: "low-power" }}
        frameloop={gorunur ? "always" : "never"}
      >
        <color attach="background" args={[zemin]} />
        <fog attach="fog" args={[zemin, 8, 16]} />
        <Ag
          ilerleme={ilerleme}
          morf={morf}
          hareket={hareket}
          dugumSayisi={mobil ? DUGUM_MOBIL : DUGUM_MASAUSTU}
          tema={tema}
        />
      </Canvas>
    </div>
  );
}
