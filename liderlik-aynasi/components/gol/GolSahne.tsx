"use client";

import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

// GECE GÖLÜ evreninin imzası: tek tam-ekran fragment shader'da yıldızlı gök,
// onu yansıtan durgun su, ay yolu, orman silüeti ve kamp ateşi parıltısı.
// Dokunulan yerde su halkalanır. Tek quad = telefonda son derece ucuz.

const MAX_HALKA = 6;

const TEPE = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

const PARCA = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform float uZaman;
uniform float uOran;
uniform vec3 uHalka[${MAX_HALKA}];

float kar(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float yildizlar(vec2 p, float yogunluk) {
  vec2 g = floor(p * 110.0);
  vec2 f = fract(p * 110.0);
  float h = kar(g);
  float yildiz = step(yogunluk, h) * smoothstep(0.42, 0.0, length(f - 0.5));
  float titreme = 0.55 + 0.45 * sin(uZaman * 1.4 + h * 43.0);
  return yildiz * titreme;
}

vec3 gokyuzu(vec2 p) {
  // ufka doğru hafifçe aydınlanan derin petrol gece
  vec3 renk = mix(vec3(0.012, 0.035, 0.065), vec3(0.035, 0.085, 0.135), 1.0 - p.y);
  renk += vec3(1.0, 0.97, 0.92) * yildizlar(p, 0.986);
  // ay: disk + halo
  vec2 ay = vec2(0.72, 0.78);
  float d = length((p - ay) * vec2(uOran, 1.0));
  renk += vec3(0.95, 0.97, 1.0) * smoothstep(0.034, 0.026, d);
  renk += vec3(0.55, 0.68, 0.85) * exp(-d * 7.0) * 0.45;
  return renk;
}

float siluet(float x) {
  // ufuktaki orman çizgisi: katmanlı sinüslerle pürüzlü tepe hattı
  return 0.018 * sin(x * 19.0)
       + 0.022 * sin(x * 8.7 + 2.1)
       + 0.011 * sin(x * 43.0 + 5.3);
}

void main() {
  float ufuk = 0.58;

  if (vUv.y > ufuk) {
    vec2 gokP = vec2(vUv.x, (vUv.y - ufuk) / (1.0 - ufuk));
    vec3 renk = gokyuzu(gokP);
    // ufkun hemen üstünde orman silüeti
    float tepeHatti = ufuk + 0.045 + siluet(vUv.x);
    renk = mix(vec3(0.008, 0.022, 0.018), renk,
               smoothstep(tepeHatti - 0.004, tepeHatti + 0.004, vUv.y));
    gl_FragColor = vec4(renk, 1.0);
    return;
  }

  // ---- SU ----
  float wp = (ufuk - vUv.y) / ufuk; // 0 = ufuk, 1 = en alt
  float dalga = sin(vUv.x * 42.0 + uZaman * 0.8) * 0.0035
              + sin(vUv.x * 13.0 - uZaman * 0.45) * 0.0045;
  dalga *= (0.35 + wp);

  // dokunma halkaları: sönümlü yayılan dairesel dalgalar
  float halka = 0.0;
  for (int i = 0; i < ${MAX_HALKA}; i++) {
    vec3 h = uHalka[i];
    float yas = uZaman - h.z;
    if (yas > 0.0 && yas < 3.5) {
      float d = length((vUv - h.xy) * vec2(uOran, 1.0));
      halka += sin(d * 70.0 - yas * 6.5)
             * exp(-d * 9.0)
             * exp(-yas * 1.4) * 0.006;
    }
  }

  vec2 ornek = vec2(vUv.x + dalga + halka, wp * 0.85);
  vec3 yansima = gokyuzu(ornek);

  vec3 su = mix(vec3(0.018, 0.055, 0.085), vec3(0.005, 0.018, 0.032), wp);
  vec3 renk = su + yansima * 0.5 * (1.0 - wp * 0.55);

  // ay yolu: suda titreşen dikey ışık şeridi
  float ayYolu = exp(-pow((vUv.x - 0.72 + (dalga + halka) * 7.0) * 9.0, 2.0)) * (1.0 - wp * 0.8);
  renk += vec3(0.85, 0.9, 1.0) * ayYolu * 0.16 * (0.7 + 0.3 * sin(uZaman * 2.2 + vUv.y * 70.0));

  // uzak kamp ateşinin amber yansıması (sol alt)
  float kor = exp(-length((vUv - vec2(0.13, 0.07)) * vec2(uOran, 1.5)) * 4.0);
  renk += vec3(0.96, 0.55, 0.08) * kor * 0.12 * (0.85 + 0.15 * sin(uZaman * 3.1));

  gl_FragColor = vec4(renk, 1.0);
}
`;

function GolYuzeyi({ hareketli }: { hareketli: boolean }) {
  const { size } = useThree();
  const sira = useRef(0);

  const uniforms = useMemo(
    () => ({
      uZaman: { value: 10 }, // donuk modda bile dolu bir kare görünsün
      uOran: { value: 1 },
      uHalka: {
        value: Array.from(
          { length: MAX_HALKA },
          () => new THREE.Vector3(-10, -10, -100)
        ),
      },
    }),
    []
  );

  useEffect(() => {
    if (!hareketli) return;
    let sonEkleme = 0;
    function ekle(e: PointerEvent) {
      const simdi = performance.now();
      if (e.type === "pointermove" && simdi - sonEkleme < 350) return;
      sonEkleme = simdi;
      const v = uniforms.uHalka.value[sira.current % MAX_HALKA];
      v.set(
        e.clientX / window.innerWidth,
        1 - e.clientY / window.innerHeight,
        uniforms.uZaman.value
      );
      sira.current++;
    }
    window.addEventListener("pointerdown", ekle, { passive: true });
    window.addEventListener("pointermove", ekle, { passive: true });
    return () => {
      window.removeEventListener("pointerdown", ekle);
      window.removeEventListener("pointermove", ekle);
    };
  }, [hareketli, uniforms]);

  useFrame((_, dt) => {
    // three uniform'ları tasarım gereği mutasyonla güncellenir (her karede)
    // eslint-disable-next-line react-hooks/immutability
    if (hareketli) uniforms.uZaman.value += dt;
    // eslint-disable-next-line react-hooks/immutability
    uniforms.uOran.value = size.width / Math.max(size.height, 1);
  });

  return (
    <mesh frustumCulled={false}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        vertexShader={TEPE}
        fragmentShader={PARCA}
        uniforms={uniforms}
        depthTest={false}
        depthWrite={false}
      />
    </mesh>
  );
}

export default function GolSahne({ hareketli = true }: { hareketli?: boolean }) {
  return (
    <Canvas
      dpr={[1, 1.5]}
      gl={{ antialias: false, alpha: false, powerPreference: "low-power" }}
      style={{ pointerEvents: "none" }}
      frameloop={hareketli ? "always" : "demand"}
    >
      <GolYuzeyi hareketli={hareketli} />
    </Canvas>
  );
}
