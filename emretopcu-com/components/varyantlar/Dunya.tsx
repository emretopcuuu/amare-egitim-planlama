"use client";

import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useReducedMotion } from "motion/react";

// "4 kıta, 38 ülke" — İstanbul merkezli bir dünya küresi; erişilen coğrafyaya
// altın yaylar uzanır. Noktalar temsilidir (belirli ülke iddiası değil);
// başlık gerçek rakamları taşır. Ag3D ile aynı altın-üstü-porselen estetiği.

const YARICAP = 1;
const ISTANBUL: [number, number] = [41.01, 28.98];

// 4 kıtaya yayılmış 38 temsili erişim noktası (enlem, boylam).
const NOKTALAR: [number, number][] = [
  // Avrupa
  [51.5, -0.13], [48.85, 2.35], [52.52, 13.4], [40.42, -3.7], [41.9, 12.5],
  [52.37, 4.9], [48.21, 16.37], [59.33, 18.07], [52.23, 21.01], [50.45, 30.52],
  [55.75, 37.62], [38.0, 23.73], [47.37, 8.54], [38.72, -9.14], [44.43, 26.1],
  [40.41, 49.87],
  // Asya
  [25.2, 55.27], [24.71, 46.68], [28.61, 77.21], [19.08, 72.88], [13.76, 100.5],
  [1.35, 103.82], [22.32, 114.17], [35.68, 139.69], [37.57, 126.98], [43.24, 76.89],
  [35.69, 51.39], [41.3, 69.24],
  // Afrika
  [30.04, 31.24], [33.57, -7.59], [6.52, 3.38], [-26.2, 28.04],
  // Amerika
  [40.71, -74.0], [34.05, -118.24], [43.65, -79.38], [19.43, -99.13], [-23.55, -46.63],
  // Okyanusya
  [-33.87, 151.21],
];

function konum(lat: number, lon: number, r = YARICAP): THREE.Vector3 {
  const phi = ((90 - lat) * Math.PI) / 180;
  const theta = ((lon + 180) * Math.PI) / 180;
  return new THREE.Vector3(
    -r * Math.sin(phi) * Math.cos(theta),
    r * Math.cos(phi),
    r * Math.sin(phi) * Math.sin(theta),
  );
}

function Kure({ hareket }: { hareket: boolean }) {
  const grup = useRef<THREE.Group>(null);

  const { noktaGeo, yaylar, merkez } = useMemo(() => {
    const merkez = konum(ISTANBUL[0], ISTANBUL[1]);
    const uclar = NOKTALAR.map(([la, lo]) => konum(la, lo));

    const hepsi = [merkez, ...uclar];
    const dizi = new Float32Array(hepsi.length * 3);
    hepsi.forEach((p, i) => {
      dizi[i * 3] = p.x;
      dizi[i * 3 + 1] = p.y;
      dizi[i * 3 + 2] = p.z;
    });
    const noktaGeo = new THREE.BufferGeometry();
    noktaGeo.setAttribute("position", new THREE.BufferAttribute(dizi, 3));

    // Her uca İstanbul'dan yükselen bir yay (quadratic bezier).
    const yaylar = uclar.map((uc) => {
      const orta = merkez
        .clone()
        .add(uc)
        .multiplyScalar(0.5);
      const yukseklik = 1 + 0.18 + merkez.distanceTo(uc) * 0.28;
      orta.normalize().multiplyScalar(yukseklik);
      const egri = new THREE.QuadraticBezierCurve3(merkez, orta, uc);
      const g = new THREE.BufferGeometry().setFromPoints(egri.getPoints(28));
      return g;
    });

    return { noktaGeo, yaylar, merkez };
  }, []);

  useFrame((_, delta) => {
    if (grup.current && hareket) grup.current.rotation.y += delta * 0.12;
  });

  return (
    <group ref={grup} rotation={[0.32, 0, 0.1]}>
      {/* Tel küre */}
      <mesh>
        <sphereGeometry args={[YARICAP * 0.995, 40, 28]} />
        <meshBasicMaterial color="#b79a52" wireframe transparent opacity={0.12} />
      </mesh>
      {/* Dolu iç küre (yayları arkada gizler, derinlik hissi) */}
      <mesh>
        <sphereGeometry args={[YARICAP * 0.985, 40, 28]} />
        <meshBasicMaterial color="#e9e4d6" transparent opacity={0.04} />
      </mesh>
      {/* Erişim yayları */}
      {yaylar.map((g, i) => (
        <primitive key={i} object={new THREE.Line(g, yayMat)} />
      ))}
      {/* Noktalar */}
      <points geometry={noktaGeo}>
        <pointsMaterial
          color="#9a7a2c"
          size={0.045}
          sizeAttenuation
          transparent
          opacity={0.9}
          depthWrite={false}
        />
      </points>
      {/* İstanbul vurgusu */}
      <mesh position={merkez}>
        <sphereGeometry args={[0.028, 16, 16]} />
        <meshBasicMaterial color="#9a7a2c" />
      </mesh>
    </group>
  );
}

const yayMat = new THREE.LineBasicMaterial({
  color: "#a07f36",
  transparent: true,
  opacity: 0.32,
  depthWrite: false,
});

export default function Dunya() {
  const azalt = useReducedMotion();
  return (
    <Canvas
      camera={{ position: [0, 0, 3.15], fov: 42 }}
      dpr={[1, 1.75]}
      gl={{ antialias: true, alpha: true, powerPreference: "low-power" }}
    >
      <Kure hareket={!azalt} />
    </Canvas>
  );
}
