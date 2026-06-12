"use client";

import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

// GECE GÖLÜ artık gerçek bir 3D sahne: gökyüzü bir kubbe, su gerçek bir
// düzlem. Yansıma, bakış ışınının su normalinden gerçek fizikle yansıtılıp
// aynı prosedürel gökyüzü fonksiyonuyla örneklenmesinden doğar — ikinci bir
// render geçişi yok, telefonda hâlâ ucuz. Kamera suyun üstünde usulca
// süzülür; dokunulan yer ışınla su düzlemine indirilir ve orada halkalanır.

const MAX_HALKA = 8;

type ZamanU = { value: number };
type HalkaU = { value: THREE.Vector3[] };

// Yön (birim vektör) → gökyüzü rengi. Hem kubbe hem suyun yansıması bu
// fonksiyonu kullanır; orman silüeti yönde yaşadığı için suda kendiliğinden
// yansır. AY_YONU portre telefonda da görünsün diye merkeze yakın seçildi.
// uGunes (-1 gece yarısı … +1 öğle) gerçek saatten gelir: geceleri gece,
// gündüzleri gündüz — tan vakti ufuk kızıllaşır, gök cismi ay↔güneş dönüşür.
const GOK_GLSL = /* glsl */ `
const vec3 AY_YONU = vec3(0.147, 0.342, -0.928);

float kar(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float gunduzOrani() {
  return smoothstep(-0.08, 0.3, uGunes);
}

float yildizlar(vec2 p) {
  vec2 g = floor(p * 90.0);
  vec2 f = fract(p * 90.0);
  float h = kar(g);
  float y = step(0.985, h) * smoothstep(0.45, 0.0, length(f - 0.5));
  float titreme = 0.55 + 0.45 * sin(uZaman * 1.4 + h * 43.0);
  // ara ara: her yıldızın kendi nadir, kısa elmas ışıltısı anı
  float isilti = pow(0.5 + 0.5 * sin(uZaman * 0.6 + h * 271.0), 18.0) * 2.6;
  return y * (titreme + isilti);
}

float kayanYildiz(vec2 p) {
  // ~18 saniyede bir kısa ömürlü kayan yıldız — gökte ve suyun aynasında.
  // Faz kayması: ilk yıldız sahne açıldıktan ~3 sn sonra geçer (uZaman 10'dan
  // başlar; 10+5=15 → 3 sn sonra 18'e ulaşıp ilk deviri başlatır).
  float faz = uZaman + 5.0;
  float devir = floor(faz / 18.0);
  float t = fract(faz / 18.0) * 5.5;
  if (t > 1.0) return 0.0;
  float h1 = kar(vec2(devir, 3.7));
  float h2 = kar(vec2(devir, 9.1));
  vec2 bas = vec2(mix(-2.5, 1.2, h1), mix(1.4, 2.1, h2));
  vec2 dogrultu = normalize(vec2(0.82, -0.40));
  vec2 uc = bas + dogrultu * t * 2.4;
  vec2 q = p - uc;
  float s = clamp(dot(q, -dogrultu), 0.0, 0.5);
  float d = length(q + dogrultu * s);
  return exp(-d * 240.0) * (1.0 - s * 2.0) * sin(3.14159 * t) * 1.6;
}

float ormanHatti(float az) {
  return 0.045
       + 0.020 * sin(az * 6.0)
       + 0.014 * sin(az * 13.0 + 2.1)
       + 0.008 * sin(az * 29.0 + 5.0);
}

vec3 gokyuzu(vec3 yon) {
  float el = yon.y;
  float az = atan(yon.x, -yon.z);
  float gunduz = gunduzOrani();
  // tan kuşağı: güneş ufka yakınken (doğum/batım) ufuk kızıllaşır
  float tan = exp(-uGunes * uGunes * 22.0);

  // gece derin petrol ↔ gündüz berrak mavi
  vec3 ust = mix(vec3(0.010, 0.030, 0.058), vec3(0.13, 0.36, 0.70), gunduz);
  vec3 alt = mix(vec3(0.035, 0.085, 0.135), vec3(0.47, 0.65, 0.84), gunduz);
  vec3 renk = mix(alt, ust, clamp(el * 2.2, 0.0, 1.0));

  // tan kızıllığı ufukta toplanır
  renk += vec3(0.98, 0.42, 0.16) * tan * exp(-max(el, 0.0) * 7.0) * 0.55;

  // yıldızlar ve kayan yıldız yalnız gece görünür
  vec2 yildizP = vec2(az * 1.6, el * 2.4);
  renk += vec3(1.0, 0.97, 0.92) * yildizlar(yildizP)
        * smoothstep(0.02, 0.12, el) * (1.0 - gunduz);
  renk += vec3(0.85, 0.93, 1.0) * kayanYildiz(yildizP)
        * smoothstep(0.05, 0.2, el) * (1.0 - gunduz);

  // gök cismi: gece gümüş ay, gündüz sıcak güneş (disk + halo)
  float d = distance(yon, AY_YONU);
  vec3 cisim = mix(vec3(0.95, 0.97, 1.0), vec3(1.0, 0.93, 0.78), gunduz);
  renk += cisim * smoothstep(0.030, 0.024, d) * (1.0 + gunduz * 2.5);
  renk += mix(vec3(0.55, 0.68, 0.85), vec3(1.0, 0.85, 0.55), gunduz)
        * exp(-d * 6.0) * (0.5 + gunduz * 0.45);

  // ufuktaki orman silüeti: gece kömür, gündüz çam yeşili
  vec3 orman = mix(vec3(0.008, 0.020, 0.016), vec3(0.07, 0.16, 0.10), gunduz);
  renk = mix(orman, renk, smoothstep(-0.006, 0.006, el - ormanHatti(az)));
  return renk;
}
`;

const DUNYA_TEPE = /* glsl */ `
varying vec3 vDunya;
void main() {
  vDunya = (modelMatrix * vec4(position, 1.0)).xyz;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const GOK_PARCA = /* glsl */ `
varying vec3 vDunya;
uniform float uZaman;
uniform float uGunes;
${GOK_GLSL}
void main() {
  gl_FragColor = vec4(gokyuzu(normalize(vDunya - cameraPosition)), 1.0);
}
`;

const SU_PARCA = /* glsl */ `
varying vec3 vDunya;
uniform float uZaman;
uniform float uGunes;
uniform vec3 uHalka[${MAX_HALKA}];
${GOK_GLSL}

void main() {
  vec3 bakis = normalize(vDunya - cameraPosition);
  vec2 p = vDunya.xz;
  float t = uZaman;

  // sakin göl dalgaları: yüzey eğimi (normal pertürbasyonu) analitik.
  // Genlikler bilinçli düşük — su durulunca ayna netleşir.
  vec2 egim = vec2(0.0);
  egim.x += 0.021 * cos(p.x * 1.7 + t * 0.9);
  egim.y += 0.022 * cos(p.y * 2.3 - t * 0.7);
  egim += 0.010 * cos(dot(p, vec2(0.8, 1.4)) + t * 1.3) * vec2(0.8, 1.4);

  // dokunma halkaları: dünya uzayında sönümlenerek yayılan dairesel dalgalar
  float halkaIz = 0.0;
  float aktivite = 0.0; // su ne kadar hareketli? (silüet bununla dağılır)
  for (int i = 0; i < ${MAX_HALKA}; i++) {
    vec3 h = uHalka[i];
    float yas = t - h.z;
    if (yas > 0.0 && yas < 4.0) {
      vec2 fark = p - h.xy;
      float d = length(fark) + 1e-4;
      float dalga = cos(d * 7.0 - yas * 6.0) * exp(-d * 0.5) * exp(-yas * 1.2);
      egim += (fark / d) * dalga * 0.35;
      halkaIz += dalga;
      aktivite += exp(-yas * 1.1);
    }
  }

  vec3 n = normalize(vec3(-egim.x, 1.0, -egim.y));
  vec3 r = normalize(reflect(bakis, n));
  r.y = max(r.y, -0.03); // ufkun hemen altı: orman karanlığı yansısın
  vec3 yansima = gokyuzu(normalize(r));

  float gunduz = gunduzOrani();

  // Fresnel: dik bakışta derin su, yatık bakışta ayna — taban yansıtma
  // yüksek tutuldu ki göl "ayna" kimliğini her açıdan korusun
  float fres = 0.30 + 0.70 * pow(1.0 - max(dot(-bakis, n), 0.0), 2.5);
  vec3 derin = mix(vec3(0.006, 0.020, 0.034), vec3(0.035, 0.110, 0.140), gunduz);
  vec3 renk = mix(derin, yansima * 1.1, fres);

  // gök cismi parıltısı: yansıma ışını aya/güneşe yaklaştıkça keskin glint
  float parilti = pow(max(dot(r, AY_YONU), 0.0), 700.0);
  renk += mix(vec3(1.0, 0.98, 0.9), vec3(1.0, 0.9, 0.65), gunduz)
        * parilti * (0.55 + gunduz * 0.4);

  // halkaların gümüş izi
  renk += vec3(0.45, 0.65, 0.85) * abs(halkaIz) * 0.10;

  // SUDAKİ SİLÜET: tam karşında, ışıktan bir yansıma — suda kendini görmeye
  // çalışmak gibi. Su durgunken belirir, dokununca halkalarla dağılır,
  // durulunca yeniden toplanır. Kamerayla (parmağınla) birlikte kayar.
  float sukunet = clamp(1.0 - aktivite, 0.0, 1.0);
  float sx = p.x - cameraPosition.x + egim.x * 6.0 + halkaIz * 3.0;
  float derinZ = p.y; // dünya z'si: kıyıdan (5) ufka (-) doğru
  float govde = exp(-sx * sx * 2.6)
              * smoothstep(4.6, 3.6, derinZ)
              * smoothstep(-0.8, 1.2, derinZ);
  vec2 basFark = vec2(sx * 1.6, (derinZ - 0.1) * 0.85);
  float bas = exp(-dot(basFark, basFark) * 2.4);
  renk += vec3(0.72, 0.84, 0.96) * (govde * 0.5 + bas * 0.95)
        * 0.13 * sukunet * (1.0 - gunduz * 0.35)
        * (0.82 + 0.18 * sin(t * 0.7)); // nefes alır

  // kamp ateşinin amber yansıması (sol kıyı) — gündüz söner
  float kor = exp(-length(p - vec2(-4.0, -7.0)) * 0.22);
  renk += vec3(0.96, 0.55, 0.08) * kor * 0.20
        * (0.85 + 0.15 * sin(t * 3.1)) * (1.0 - gunduz);

  // uzakta su, karşı kıyının karanlığına karışır
  float uzak = length(vDunya.xz - cameraPosition.xz);
  renk = mix(renk, gokyuzu(vec3(bakis.x, 0.012, bakis.z)),
             smoothstep(28.0, 75.0, uzak) * 0.65);

  gl_FragColor = vec4(renk, 1.0);
}
`;

const BOCEK_TEPE = /* glsl */ `
attribute float aTohum;
uniform float uZaman;
varying float vParlak;
void main() {
  vec3 k = position;
  k.x += sin(uZaman * 0.30 + aTohum * 12.0) * 0.7;
  k.y += sin(uZaman * 0.50 + aTohum * 29.0) * 0.3;
  k.z += cos(uZaman * 0.22 + aTohum * 17.0) * 0.7;
  vParlak = 0.5 + 0.5 * sin(uZaman * (1.0 + aTohum * 1.5) + aTohum * 40.0);
  vec4 mv = modelViewMatrix * vec4(k, 1.0);
  gl_PointSize = clamp(110.0 / -mv.z, 1.5, 16.0);
  gl_Position = projectionMatrix * mv;
}
`;

const BOCEK_PARCA = /* glsl */ `
varying float vParlak;
uniform float uGunes;
void main() {
  // ateş böcekleri gün ışığında görünmez
  float gunduz = smoothstep(-0.08, 0.3, uGunes);
  float d = length(gl_PointCoord - 0.5);
  float a = smoothstep(0.5, 0.05, d) * vParlak * (1.0 - gunduz);
  gl_FragColor = vec4(vec3(1.0, 0.74, 0.34) * a, a * 0.85);
}
`;

// deterministik sözde-rastgele: lint-dostu (render saf kalır) ve her
// yüklemede aynı dizilim
function rasgele(i: number, tuz: number) {
  const x = Math.sin(i * 127.1 + tuz * 311.7) * 43758.5453;
  return x - Math.floor(x);
}

function GokKubbesi({ uZaman, uGunes }: { uZaman: ZamanU; uGunes: ZamanU }) {
  const uniforms = useMemo(() => ({ uZaman, uGunes }), [uZaman, uGunes]);
  return (
    <mesh frustumCulled={false} renderOrder={-1}>
      <sphereGeometry args={[90, 32, 20]} />
      <shaderMaterial
        vertexShader={DUNYA_TEPE}
        fragmentShader={GOK_PARCA}
        uniforms={uniforms}
        side={THREE.BackSide}
        depthWrite={false}
      />
    </mesh>
  );
}

function SuYuzeyi({
  uZaman,
  uGunes,
  uHalka,
}: {
  uZaman: ZamanU;
  uGunes: ZamanU;
  uHalka: HalkaU;
}) {
  const uniforms = useMemo(
    () => ({ uZaman, uGunes, uHalka }),
    [uZaman, uGunes, uHalka]
  );
  return (
    <mesh rotation-x={-Math.PI / 2} frustumCulled={false}>
      <planeGeometry args={[240, 240]} />
      <shaderMaterial
        vertexShader={DUNYA_TEPE}
        fragmentShader={SU_PARCA}
        uniforms={uniforms}
      />
    </mesh>
  );
}

// Kamp ateşinden savrulan korlar + su üstünde süzülen ateş böcekleri:
// yakındakiler büyük, uzaktakiler küçük — derinliği en çok satan katman.
function AtesBocekleri({ uZaman, uGunes }: { uZaman: ZamanU; uGunes: ZamanU }) {
  const { konumlar, tohumlar } = useMemo(() => {
    const adet = 26;
    const konumlar = new Float32Array(adet * 3);
    const tohumlar = new Float32Array(adet);
    for (let i = 0; i < adet; i++) {
      const r1 = rasgele(i, 1);
      const r2 = rasgele(i, 2);
      const r3 = rasgele(i, 3);
      if (i < 14) {
        // ateşin çevresinde küme
        konumlar[i * 3] = -4 + (r1 - 0.5) * 6;
        konumlar[i * 3 + 1] = 0.2 + r2 * 1.6;
        konumlar[i * 3 + 2] = -7 + (r3 - 0.5) * 6;
      } else {
        // göl üstüne dağılmış tek tük
        konumlar[i * 3] = (r1 - 0.5) * 36;
        konumlar[i * 3 + 1] = 0.25 + r2 * 1.1;
        konumlar[i * 3 + 2] = -4 - r3 * 34;
      }
      tohumlar[i] = rasgele(i, 7);
    }
    return { konumlar, tohumlar };
  }, []);

  const uniforms = useMemo(() => ({ uZaman, uGunes }), [uZaman, uGunes]);

  return (
    <points frustumCulled={false} renderOrder={1}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[konumlar, 3]} />
        <bufferAttribute attach="attributes-aTohum" args={[tohumlar, 1]} />
      </bufferGeometry>
      <shaderMaterial
        vertexShader={BOCEK_TEPE}
        fragmentShader={BOCEK_PARCA}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

function GolDunyasi({ hareketli }: { hareketli: boolean }) {
  const { camera } = useThree();
  const sira = useRef(0);
  const fare = useRef({ x: 0, y: 0 });

  const uZaman = useMemo<ZamanU>(() => ({ value: 10 }), []);
  const uGunes = useMemo<ZamanU>(() => ({ value: -1 }), []);
  const uHalka = useMemo<HalkaU>(
    () => ({
      value: Array.from(
        { length: MAX_HALKA },
        () => new THREE.Vector3(0, 0, -100)
      ),
    }),
    []
  );

  useEffect(() => {
    if (!hareketli) return;
    let sonEkleme = 0;
    function ekle(e: PointerEvent) {
      const nx = (e.clientX / window.innerWidth) * 2 - 1;
      const ny = -((e.clientY / window.innerHeight) * 2 - 1);
      fare.current.x = nx;
      fare.current.y = ny;
      const simdi = performance.now();
      if (e.type === "pointermove" && simdi - sonEkleme < 300) return;
      sonEkleme = simdi;
      // ekran noktasını ışınla y=0 su düzlemine indir
      const yon = new THREE.Vector3(nx, ny, 0.5)
        .unproject(camera)
        .sub(camera.position)
        .normalize();
      if (yon.y > -0.02) return; // göğe dokunuldu, su halkası yok
      const t = -camera.position.y / yon.y;
      if (t > 60) return; // ufka çok yakın: halka zaten görünmez
      const nokta = camera.position.clone().addScaledVector(yon, t);
      uHalka.value[sira.current % MAX_HALKA].set(
        nokta.x,
        nokta.z,
        uZaman.value
      );
      sira.current++;
    }
    window.addEventListener("pointerdown", ekle, { passive: true });
    window.addEventListener("pointermove", ekle, { passive: true });
    return () => {
      window.removeEventListener("pointerdown", ekle);
      window.removeEventListener("pointermove", ekle);
    };
  }, [hareketli, camera, uZaman, uHalka]);

  // three sahne nesneleri (uniform + kamera) tasarım gereği her karede
  // mutasyonla güncellenir — render saflığını bozmaz, useFrame'de yaşar.
  // eslint-disable-next-line react-hooks/immutability
  useFrame((_, dt) => {
    // eslint-disable-next-line react-hooks/immutability
    if (hareketli) uZaman.value += dt;
    const t = uZaman.value;
    // gerçek saat → güneş yüksekliği: 06:00 doğum, 12:00 öğle, 18:00 batım
    const simdi = new Date();
    const saat = simdi.getHours() + simdi.getMinutes() / 60;
    // eslint-disable-next-line react-hooks/immutability
    uGunes.value = Math.sin((Math.PI * 2 * (saat - 6)) / 24);
    // kendiliğinden süzülen + parmağa/fareye hafifçe eğilen kamera
    // eslint-disable-next-line react-hooks/immutability
    camera.position.x = Math.sin(t * 0.1) * 0.45 + fare.current.x * 0.45;
    camera.position.y = 1.1 + Math.sin(t * 0.23) * 0.09 + fare.current.y * 0.2;
    camera.position.z = 5.2;
    camera.lookAt(0, 1.05, -14);
  });

  return (
    <>
      <GokKubbesi uZaman={uZaman} uGunes={uGunes} />
      <SuYuzeyi uZaman={uZaman} uGunes={uGunes} uHalka={uHalka} />
      <AtesBocekleri uZaman={uZaman} uGunes={uGunes} />
    </>
  );
}

export default function GolSahne({ hareketli = true }: { hareketli?: boolean }) {
  return (
    <Canvas
      dpr={[1, 1.5]}
      camera={{ position: [0, 1.1, 5.2], fov: 58, near: 0.1, far: 300 }}
      gl={{ antialias: false, alpha: false, powerPreference: "low-power" }}
      style={{ pointerEvents: "none" }}
      frameloop={hareketli ? "always" : "demand"}
    >
      <GolDunyasi hareketli={hareketli} />
    </Canvas>
  );
}
