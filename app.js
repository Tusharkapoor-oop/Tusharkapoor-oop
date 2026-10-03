/* COGNITUM 6D — the portfolio as a working model.
 *   · hexeract (6-cube) rotating in all 15 planes of SO(6), cascade-projected 6→3
 *   · affine-coupling normalizing flow sampling every particle on screen
 *   · 4096-d bipolar hypervector memory retrieving live from your cursor
 *   · Born-rule background: |ψ|² of a 7-mode superposition
 * Three.js r160 + custom GLSL. Zero frameworks, zero build step. */

import { HV_D, HyperMemory, bundle, normalize, cosine, softmaxAttention, entropy } from './hrr.js';
import { Flow } from './flow.js';
import { buildHexeract, projectAll } from './hexeract.js';
import { loadRepos, planetsFromRepos } from './repos.mjs';

const FALLBACK = () => {
  document.getElementById('fallback').hidden = false;
  document.getElementById('loader').classList.add('done');
};

let THREE;
try {
  THREE = await import('three');
} catch (err) {
  console.error('COGNITUM: three.js failed to load', err);
  FALLBACK();
  throw err;
}

/* ================= data ================= */
const PROJECTS = [
  { name: 'Advance_hand_gesture', short: 'ADVANCE', blurb: 'Real-time hand-gesture recognition — MediaPipe landmarks, TensorFlow classifier, browser demo.', slug: 'Advance_hand_gesture', tags: ['vision', 'perception', 'ml'] },
  { name: 'auracontrol-backend', short: 'AURA', blurb: 'Real-time gesture engine — FastAPI, MediaPipe, WebSocket dispatch loop.', slug: 'auracontrol-backend', tags: ['backend', 'vision', 'agents'] },
  { name: 'VOIS_AICTE_Oct2025_TUSHAR-KAPOOR', short: 'VOIS · EDA', blurb: 'Netflix and Airbnb data analysis — EDA notebooks, decks, course materials.', slug: 'VOIS_AICTE_Oct2025_TUSHAR-KAPOOR', tags: ['data', 'analysis'] },
  { name: 'OS_LAB_Linux_Ubantu', short: 'OS · LAB', blurb: 'Operating systems lab in Python — system calls, CPU scheduling, sync, memory, file systems.', slug: 'OS_LAB_Linux_Ubantu', tags: ['systems', 'fundamentals'] },
  { name: 'go-bric', short: 'GO · BRIC', blurb: 'Multi-agent company scouting — five specialist agents over a shared dataset. Next.js + Gemini.', slug: 'go-bric', tags: ['agents', 'research', 'ml'] },
  { name: 'ReflectAI', short: 'REFLECT', blurb: 'Deterministic end-of-day reflection — structured conversation to a psychological tree output.', slug: 'ReflectAI', tags: ['agents', 'backend', 'research'] },
  { name: 'Sustainable-Agriculture-Project', short: 'AGRI · ML', blurb: 'Crop recommendation from soil/climate features — full ML pipeline with evaluation.', slug: 'Sustainable-Agriculture-Project', tags: ['ml', 'data'] },
  { name: 'tushar_cse-AI-and-ML-A_AI-STUDY-PLANNER', short: 'STUDY · PLANNER', blurb: 'AI study planner — syllabus upload, topic extraction, video curation.', slug: 'tushar_cse-AI-and-ML-A_AI-STUDY-PLANNER', tags: ['backend', 'frontend'] },
  { name: 'Kapoor-portfolio', short: 'PORTFOLIO', blurb: 'Personal portfolio site — React, Vite, Tailwind, GitHub Actions CI/CD.', slug: 'Kapoor-portfolio', tags: ['frontend', 'ui'] },
  { name: 'NPU-Fit-Checker-Automated-NPU-Fallback-Diagnosis', short: 'NPU · FIT', blurb: 'Automated NPU fallback diagnosis — which layers fell back to CPU, on which target, and why. 30/30 tests green.', slug: 'NPU-Fit-Checker-Automated-NPU-Fallback-Diagnosis', tags: ['systems', 'perf', 'ml'] },
  { name: 'IBM-Cloud-project', short: 'IBM · CLOUD', blurb: 'Predictive maintenance on IBM Cloud / Watsonx — Jupyter ML pipeline with evaluation.', slug: 'IBM-Cloud-project', tags: ['cloud', 'ml', 'data'] },
];
const REPO_BASE = 'https://github.com/Tusharkapoor-oop/';

/* ---- GitHub data layer: live API (1h cache) → snapshot → builtin.
 * Enriches the curated list with real stars/language/links and appends
 * any project repo discovered live that the curated list doesn't know. */
const NUMWORD = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
  'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen',
  'twenty', 'twenty-one', 'twenty-two', 'twenty-three', 'twenty-four', 'twenty-five', 'twenty-six',
  'twenty-seven', 'twenty-eight', 'twenty-nine', 'thirty'];
const repoData = await loadRepos();
{
  const live = planetsFromRepos(repoData.repos || []);
  live.forEach((lp) => {
    const ex = PROJECTS.find((p) => p.slug === lp.slug || p.name === lp.name);
    if (ex) {
      ex.stars = lp.stars; ex.language = lp.language; ex.pushedAt = lp.pushedAt;
      ex.href = lp.href; ex.radius = lp.radius; ex.orbit = lp.orbit; ex.hue = lp.hue;
    } else {
      PROJECTS.push({
        name: lp.name, short: lp.short, blurb: lp.blurb, slug: lp.slug,
        tags: lp.tags.length ? lp.tags : ['repo'], stars: lp.stars, language: lp.language,
        pushedAt: lp.pushedAt, href: lp.href, radius: lp.radius, orbit: lp.orbit, hue: lp.hue,
        discovered: true,
      });
    }
  });
  PROJECTS.forEach((p, i) => {
    if (p.radius === undefined) p.radius = 0.42;
    if (p.orbit === undefined) p.orbit = (i / PROJECTS.length) * Math.PI * 2;
    if (p.hue === undefined) p.hue = 0;
  });
  const srcEl = document.getElementById('dataSrc');
  if (srcEl) srcEl.textContent = repoData.source;
  const attractorH2 = document.querySelector('#s2 h2');
  if (attractorH2) attractorH2.textContent = `${NUMWORD[PROJECTS.length] || PROJECTS.length} attractors`;
}

const SKILLS = [
  { name: 'Python', tags: ['lang', 'ml', 'backend'] },
  { name: 'C++', tags: ['lang', 'systems', 'perf'] },
  { name: 'Java', tags: ['lang', 'systems'] },
  { name: 'TypeScript', tags: ['lang', 'frontend', 'backend'] },
  { name: 'SQL', tags: ['lang', 'data'] },
  { name: 'PyTorch', tags: ['ml', 'framework', 'research'] },
  { name: 'TensorFlow', tags: ['ml', 'framework', 'vision'] },
  { name: 'OpenCV', tags: ['vision', 'perception'] },
  { name: 'MediaPipe', tags: ['vision', 'perception', 'agents'] },
  { name: 'scikit-learn', tags: ['ml', 'framework', 'data'] },
  { name: 'FastAPI', tags: ['backend', 'api'] },
  { name: 'React', tags: ['frontend', 'ui'] },
  { name: 'Vite', tags: ['frontend', 'tooling'] },
  { name: 'Docker', tags: ['infra', 'systems'] },
  { name: 'Git / Linux', tags: ['tooling', 'systems'] },
  { name: 'DSA', tags: ['fundamentals', 'algorithms'] },
  { name: 'Multimodal Agents', tags: ['agents', 'ml', 'research'] },
  { name: 'Watsonx', tags: ['cloud', 'ml', 'data'] },
  { name: 'Azure AI', tags: ['cloud', 'ml'] },
  { name: 'Vercel / CI', tags: ['frontend', 'infra'] },
];

/* cursor maps to these 5 concept anchors, in tag-space */
const CONCEPTS = ['vision', 'generative', 'systems', 'agents', 'data'];
const ROLES = ['EMERGENT', 'SUBSTRATE', 'RECALL', 'PROOF', 'SIGNAL'];
const AX = 'xyzwvu';

/* ================= helpers ================= */
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const isMobile = matchMedia('(max-width: 720px)').matches;

/* ================= renderer ================= */
const canvas = document.getElementById('gl');
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
} catch (err) {
  console.error('COGNITUM: WebGL unavailable', err);
  FALLBACK();
  throw err;
}
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.autoClear = false;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 300);
camera.position.set(0, 0.4, 14.5);

/* ================= post: bloom + afterimage trails ================= */
let composer = null, bloomPass = null;
if (!isMobile) {
  try {
    const [pc, pr, pb, pa, po] = await Promise.all([
      import('three/addons/postprocessing/EffectComposer.js'),
      import('three/addons/postprocessing/RenderPass.js'),
      import('three/addons/postprocessing/UnrealBloomPass.js'),
      import('three/addons/postprocessing/AfterimagePass.js'),
      import('three/addons/postprocessing/OutputPass.js'),
    ]);
    composer = new pc.EffectComposer(renderer);
    composer.addPass(new pr.RenderPass(scene, camera));
    bloomPass = new pb.UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.5, 0.4, 0.72);
    composer.addPass(bloomPass);
    composer.addPass(new pa.AfterimagePass(0.72));
    composer.addPass(new po.OutputPass());
    composer.setSize(innerWidth, innerHeight);
    composer.setPixelRatio(renderer.getPixelRatio());
  } catch (err) {
    console.warn('COGNITUM: post-processing disabled', err);
    composer = null; bloomPass = null;
  }
}

/* ================= background: Born-rule density |ψ|² ================= */
const bgUniforms = {
  uTime: { value: 0 },
  uMouse: { value: new THREE.Vector2(0, 0) },
  uScroll: { value: 0 },
  uQual: { value: isMobile ? 0 : 1 },
};
const bgMat = new THREE.ShaderMaterial({
  depthTest: false,
  depthWrite: false,
  uniforms: bgUniforms,
  vertexShader: `
    varying vec2 vUv;
    void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
  `,
  fragmentShader: `
    precision highp float;
    varying vec2 vUv;
    uniform float uTime;
    uniform vec2 uMouse;
    uniform float uScroll;
    uniform float uQual;

    float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    float vnoise(vec2 p){
      vec2 i = floor(p), f = fract(p);
      f = f * f * (3.0 - 2.0 * f);
      return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
                 mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
    }
    float fbm(vec2 p){
      float v = 0.0, a = 0.5;
      for (int i = 0; i < 4; i++){ v += a * vnoise(p); p = p * 2.03 + vec2(17.3, 9.1); a *= 0.5; }
      return v;
    }
    /* one parallax star shell: jittered cells, gaussian points, twinkle, tint */
    vec3 starLayer(vec2 uv, float scale, float density, float sharp, float t, float seed){
      vec2 p = uv * scale;
      vec2 id = floor(p), f = fract(p);
      float rnd = hash(id + seed);
      float on = step(1.0 - density, rnd);
      vec2 sp = vec2(hash(id + seed + 11.7), hash(id + seed + 27.3)) * 0.8 + 0.1;
      float d = length(f - sp);
      float tw = 0.55 + 0.45 * sin(t * (1.2 + 2.6 * hash(id + seed + 3.1)) + rnd * 40.0);
      vec3 tint = mix(vec3(1.0, 0.94, 0.88), vec3(0.78, 0.88, 1.0), fract(rnd * 7.13));
      float mag = 0.6 + 0.7 * hash(id + seed + 7.7);
      return tint * on * exp(-d * d * sharp) * tw * mag;
    }

    vec2 rot2(vec2 p, float a){ float c = cos(a), s = sin(a); return vec2(c*p.x - s*p.y, s*p.x + c*p.y); }

    /* Milky Way: galactic plane band with turbulent dust lanes + central bulge */
    float mwBand(vec2 p){
      float b = p.y, along = p.x;
      float core = exp(-b*b*8.5);
      float lane = fbm(vec2(along*1.3, b*7.0) + 3.7);
      float dust = smoothstep(0.48, 0.85, fbm(vec2(along*2.6 - 1.3, b*11.0)));
      float glow = core * (0.5 + 0.5*lane);
      glow *= 1.0 - 0.72 * dust * exp(-b*b*14.0);
      float bulge = exp(-(along*along*1.7 + b*b*26.0)) * 1.7;
      return glow + bulge;
    }

    /* distant spiral galaxy brightness — two winding arms + old-star bulge */
    float spiral(vec2 q, float arms, float t, float seed){
      float r = length(q);
      float disk = 1.0 - smoothstep(0.3, 1.0, r);
      if (disk <= 0.002) return 0.0;
      float th = atan(q.y, q.x);
      float wind = th*arms + log(r + 0.05)*6.5 - t;
      float arm = pow(sin(wind)*0.5 + 0.5, 2.2);
      float tex = fbm(q*7.0 + seed);
      float bulge = exp(-r*r*30.0) * 2.4;
      return (arm*disk*(0.35 + 0.65*tex) + bulge) * (0.55 + 0.45*tex);
    }
    vec3 galaxyCol(vec2 suv, vec2 c, float rad, float rot, float squash, float t, float seed){
      vec2 q = rot2(suv - c, rot);
      q.y /= squash;
      q /= rad;
      float v = spiral(q, 2.0, t, seed);
      vec3 warm = vec3(1.0, 0.8, 0.5);
      vec3 cool = vec3(0.5, 0.66, 1.0);
      return mix(cool, warm, exp(-dot(q,q)*7.0)) * v;
    }

    void main(){
      vec2 asp = vec2(1.75, 1.0);
      vec2 suv = (vUv - 0.5) * asp;
      vec2 x = suv * 5.2;

      /* psi = sum_k a_k exp(i (k_k . x - w_k t)) : 7-mode superposition */
      vec2 psi = vec2(0.0);
      for (int k = 0; k < 7; k++){
        float fk = float(k);
        float ang = fk * 2.39996 + sin(uTime * 0.07 + fk) * 0.4 + uScroll * 1.3;
        vec2 dir = vec2(cos(ang), sin(ang));
        float freq = 1.1 + fk * 0.62;
        float w = 0.35 + fk * 0.21;
        float amp = 0.85 / (1.0 + fk * 0.42);
        float phase = dot(dir, x) * freq - w * uTime;
        psi += amp * vec2(cos(phase), sin(phase));
      }
      float I = dot(psi, psi) / 6.0;

      /* measurement: cursor is a detector — Born rule concentrates locally */
      vec2 m = uMouse * asp * 5.2;
      float d2 = dot(x - m, x - m);
      I *= 1.0 + 1.7 * exp(-d2 * 0.055);

      /* ---- deep space: nebula gas drifting under three star shells ---- */
      vec2 drift = vec2(uTime * 0.006, -uTime * 0.004) + uMouse * 0.05;
      vec2 nuv = suv * 2.1 + drift + vec2(0.0, uScroll * 0.45);
      float n1 = fbm(nuv);
      float n2 = fbm(nuv * 1.8 + vec2(4.7, 1.3) - uTime * 0.008);
      float cloud = smoothstep(0.42, 0.9, n1 * (0.55 + 0.45 * n2));
      vec3 neb = mix(vec3(0.14, 0.05, 0.34), vec3(0.02, 0.2, 0.36), n2);
      neb = mix(neb, vec3(0.36, 0.07, 0.3), smoothstep(0.55, 0.95, n1) * 0.7);
      float centerDim = 1.0 - 0.5 * smoothstep(0.5, 0.0, length(suv));

      /* palette: deep space -> indigo fringes -> cyan interference */
      vec3 deep = vec3(0.008, 0.008, 0.03);
      vec3 indigo = mix(vec3(0.14, 0.12, 0.5), vec3(0.08, 0.32, 0.5), smoothstep(0.3, 0.7, uScroll));
      vec3 cyan = vec3(0.1, 0.62, 0.7);

      vec3 col = deep;
      col += neb * cloud * 0.42 * centerDim;

      if (uQual > 0.5){
        /* the Milky Way itself: a diagonal galactic plane across the sky */
        vec2 mw = rot2(suv - vec2(0.0, 0.22 + uScroll*0.12), -0.42);
        float mwg = 0.0;
        if (abs(mw.y) < 0.62) mwg = mwBand(mw);
        vec3 mwCol = mix(vec3(1.0, 0.9, 0.72), vec3(0.6, 0.7, 1.0), smoothstep(0.0, 0.45, abs(mw.y)));
        col += mwCol * mwg * 0.11 * (1.0 - 0.5 * smoothstep(0.62, 0.0, length(suv)));

        /* three distant island universes, drifting on cursor + scroll parallax */
        col += galaxyCol(suv, vec2(-0.58, 0.30) + uMouse*0.015 + vec2(0.0, -uScroll*0.18), 0.30, 0.7, 0.55, uTime*0.03, 4.0) * 0.52;
        col += galaxyCol(suv, vec2(0.55, -0.30) + uMouse*0.028 + vec2(0.0, -uScroll*0.30), 0.22, -0.4, 0.45, uTime*0.04, 9.0) * 0.46;
        col += galaxyCol(suv, vec2(-0.34, -0.44) + uMouse*0.04 + vec2(0.0, -uScroll*0.42), 0.15, 1.9, 0.7, -uTime*0.05, 15.0) * 0.4;
      }

      /* Born-rule interference laid over the gas */
      col += indigo * smoothstep(0.05, 0.9, I) * 0.5;
      col += cyan * pow(smoothstep(0.5, 2.4, I), 2.0) * 0.4;
      col += vec3(0.55, 0.3, 0.9) * pow(smoothstep(1.4, 4.2, I), 3.0) * 0.32;

      /* fringe contours: iso-I bands */
      float band = abs(fract(I * 1.7) - 0.5);
      col += indigo * 0.1 * smoothstep(0.16, 0.0, band) * smoothstep(0.1, 0.5, I);

      /* three star shells: far / mid / near, parallaxed by cursor + scroll */
      col += starLayer(suv * (1.0 + uScroll * 0.10) + uMouse * 0.010, 46.0, 0.5, 900.0, uTime, 3.0) * 0.5;
      col += starLayer(suv * (1.0 + uScroll * 0.22) + uMouse * 0.022 + 5.0, 22.0, 0.34, 520.0, uTime, 17.0) * 0.8;
      col += starLayer(suv * (1.0 + uScroll * 0.40) + uMouse * 0.045 + 11.0, 9.5, 0.16, 240.0, uTime, 29.0) * 1.1;

      /* a small blue marble: clouds, continents, terminator, atmosphere limb */
      if (uQual > 0.5){
        vec2 pc = vec2(0.52, 0.30) + uMouse*0.02 + vec2(0.0, -uScroll*0.26);
        vec2 pq = (suv - pc) / 0.062;
        float pd2 = dot(pq, pq);
        if (pd2 < 1.0){
          float z = sqrt(1.0 - pd2);
          vec3 pn = vec3(pq, z);
          float lnd = dot(normalize(pn), normalize(vec3(0.55, 0.5, 0.65)));
          float day = smoothstep(-0.12, 0.32, lnd);
          vec2 su2 = vec2(asin(clamp(pn.x, -1.0, 1.0)), asin(clamp(pn.y, -1.0, 1.0))) * 1.2;
          float cont = fbm(su2*3.1 + 8.0);
          float cl = fbm(su2*6.5 + vec2(uTime*0.02, 0.0) + 21.0);
          vec3 surf = mix(vec3(0.05, 0.16, 0.42), vec3(0.16, 0.42, 0.24), smoothstep(0.48, 0.62, cont));
          surf = mix(surf, vec3(0.9, 0.95, 1.0), smoothstep(0.56, 0.78, cl) * 0.75);
          surf *= 0.12 + 1.05 * day;
          float rim = pow(1.0 - z, 2.6);
          vec3 pcol = surf + vec3(0.35, 0.6, 1.0) * rim * 1.5 * max(day, 0.25);
          col = mix(col, pcol, 1.0 - smoothstep(0.94, 1.0, pd2));
        }
      }

      col *= 1.0 - 0.45 * length(vUv - 0.5);
      col += (hash(vUv * vec2(uTime * 60.0, uTime * 47.0)) - 0.5) * 0.026;

      gl_FragColor = vec4(col * 0.62, 1.0);
    }
  `,
});
const bgMesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), bgMat);
bgMesh.frustumCulled = false;
bgMesh.renderOrder = -999;
scene.add(bgMesh);

/* ================= glow sprite texture ================= */
function glowTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.35, 'rgba(255,255,255,0.55)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
const glowTex = glowTexture();

/* ================= star dust (depth layer) + core pulse ================= */
const dustGroup = new THREE.Group();
scene.add(dustGroup);
{
  const DUST = isMobile ? 500 : 1100;
  const dp = new Float32Array(DUST * 3);
  for (let i = 0; i < DUST; i++) {
    const r = 22 + Math.random() * 46;
    const th = Math.random() * Math.PI * 2;
    const ph = Math.acos(2 * Math.random() - 1);
    dp[i * 3] = r * Math.sin(ph) * Math.cos(th);
    dp[i * 3 + 1] = r * Math.sin(ph) * Math.sin(th) * 0.7;
    dp[i * 3 + 2] = r * Math.cos(ph);
  }
  const dg = new THREE.BufferGeometry();
  dg.setAttribute('position', new THREE.BufferAttribute(dp, 3));
  dustGroup.add(new THREE.Points(dg, new THREE.PointsMaterial({
    size: 0.55, map: glowTex, color: 0x7f9cf5, transparent: true, opacity: 0.4,
    depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true,
  })));
}
/* near shell: few, bright, close — reads as real-space bokeh depth */
{
  const NEAR = isMobile ? 80 : 160;
  const dp = new Float32Array(NEAR * 3);
  for (let i = 0; i < NEAR; i++) {
    const r = 9 + Math.random() * 13;
    const th = Math.random() * Math.PI * 2;
    const ph = Math.acos(2 * Math.random() - 1);
    dp[i * 3] = r * Math.sin(ph) * Math.cos(th);
    dp[i * 3 + 1] = r * Math.sin(ph) * Math.sin(th) * 0.7;
    dp[i * 3 + 2] = r * Math.cos(ph);
  }
  const dg = new THREE.BufferGeometry();
  dg.setAttribute('position', new THREE.BufferAttribute(dp, 3));
  dustGroup.add(new THREE.Points(dg, new THREE.PointsMaterial({
    size: 0.4, map: glowTex, color: 0xdbeafe, transparent: true, opacity: 0.5,
    depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true,
  })));
}
const coreGlow = new THREE.Sprite(new THREE.SpriteMaterial({
  map: glowTex, color: 0x67e8f9, transparent: true, opacity: 0.0,
  blending: THREE.AdditiveBlending, depthWrite: false,
}));
coreGlow.scale.setScalar(2.6);
scene.add(coreGlow);

/* ================= universe: ringed gas giant + moon ================= */
const planetGroup = new THREE.Group();
planetGroup.position.set(17, -4, -30);
planetGroup.rotation.z = 0.42;
scene.add(planetGroup);

const planetMat = new THREE.ShaderMaterial({
  uniforms: { uT: { value: 0 }, uMoon: { value: 0 } },
  vertexShader: `
    varying vec3 vN; varying vec3 vV; varying vec2 vUv;
    void main(){
      vUv = uv;
      vN = normalize(normalMatrix * normal);
      vec4 mv = modelViewMatrix * vec4(position, 1.0);
      vV = normalize(-mv.xyz);
      gl_Position = projectionMatrix * mv;
    }`,
  fragmentShader: `
    precision highp float;
    varying vec3 vN; varying vec3 vV; varying vec2 vUv;
    uniform float uT; uniform float uMoon;
    float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    float vnoise(vec2 p){
      vec2 i = floor(p), f = fract(p);
      f = f * f * (3.0 - 2.0 * f);
      return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
                 mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
    }
    float fbm(vec2 p){
      float v = 0.0, a = 0.5;
      for (int i = 0; i < 4; i++){ v += a * vnoise(p); p = p * 2.03 + vec2(17.3, 9.1); a *= 0.5; }
      return v;
    }
    void main(){
      vec3 n = normalize(vN);
      vec3 V = normalize(vV);
      vec3 L = normalize(vec3(0.5, 0.62, 0.6));
      float ndl = dot(n, L);
      float day = smoothstep(-0.14, 0.3, ndl);
      float lat = vUv.y;
      /* banded gas turbulence */
      float turb = fbm(vec2(vUv.x*6.0 + uT*0.012, lat*10.0));
      float zone = sin(lat*34.0 + turb*3.6)*0.5 + 0.5;
      float sw = fbm(vec2(vUv.x*4.0 - uT*0.008, lat*16.0 + 4.0));
      vec3 surf = mix(vec3(0.86, 0.62, 0.4), vec3(0.96, 0.87, 0.7), zone);
      surf = mix(surf, vec3(0.72, 0.38, 0.26), smoothstep(0.5, 0.85, sw)*0.55);
      surf *= 0.72 + 0.28*sin(lat*3.14159);
      if (uMoon > 0.5){
        float g = fbm(vec2(vUv.x*8.0, lat*8.0) + 3.0);
        surf = mix(vec3(0.5, 0.5, 0.55), vec3(0.72, 0.72, 0.78), g);
        surf *= 0.7 + 0.3*fbm(vec2(vUv.x*22.0, lat*22.0));
      }
      vec3 col = surf * (0.04 + 0.78*day);
      float fr = pow(1.0 - abs(dot(n, V)), 3.0);
      vec3 atmo = uMoon > 0.5 ? vec3(0.6, 0.65, 0.8) : vec3(1.0, 0.72, 0.45);
      col += fr * atmo * (0.1 + 0.9*day) * 0.6;
      gl_FragColor = vec4(col, 1.0);
    }`,
});
const planet = new THREE.Mesh(new THREE.SphereGeometry(7, 48, 32), planetMat);
planet.rotation.z = 0.08;
planetGroup.add(planet);

/* ring system: banded ice chunks, Cassini gap, lit limb */
const ringMat = new THREE.ShaderMaterial({
  transparent: true, depthWrite: false, side: THREE.DoubleSide,
  blending: THREE.AdditiveBlending,
  uniforms: {},
  vertexShader: `
    varying vec3 vP;
    void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `
    precision highp float;
    varying vec3 vP;
    float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    float vnoise(vec2 p){
      vec2 i = floor(p), f = fract(p);
      f = f * f * (3.0 - 2.0 * f);
      return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
                 mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
    }
    void main(){
      float r = length(vP.xy);
      float rn = clamp((r - 10.0) / 7.5, 0.0, 1.0);
      float th = atan(vP.y, vP.x);
      float bands = 0.55 + 0.45*sin(rn*54.0 + vnoise(vec2(rn*7.0, 0.5))*4.0);
      float gap = 1.0 - 0.85*exp(-pow((rn - 0.63)*14.0, 2.0));
      float shade = 0.72 + 0.28*sin(th + 1.2);
      float a = bands * gap * smoothstep(0.0, 0.08, rn) * (1.0 - smoothstep(0.86, 1.0, rn)) * shade * 0.36;
      vec3 col = mix(vec3(0.95, 0.87, 0.7), vec3(0.7, 0.75, 0.9), rn);
      gl_FragColor = vec4(col * a, a);
    }`,
});
const ring = new THREE.Mesh(new THREE.RingGeometry(10, 17.5, 128, 1), ringMat);
ring.rotation.x = -Math.PI / 2 + 0.45;
planetGroup.add(ring);

const moonMat = planetMat.clone();
moonMat.uniforms.uMoon.value = 1;
const moon = new THREE.Mesh(new THREE.SphereGeometry(1.5, 24, 16), moonMat);
planetGroup.add(moon);

/* ================= universe: black hole ================= */
const bhGroup = new THREE.Group();
bhGroup.position.set(-30, 10, -65);
bhGroup.rotation.z = 0.15;
scene.add(bhGroup);
const bhHeat = { value: 0.55 };
bhGroup.add(new THREE.Mesh(new THREE.SphereGeometry(6, 32, 24), new THREE.MeshBasicMaterial({ color: 0x000000 })));

function ringTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  g.strokeStyle = 'rgba(190,235,255,0.95)';
  g.lineWidth = 5;
  g.shadowColor = 'rgba(140,220,255,0.9)';
  g.shadowBlur = 16;
  g.beginPath(); g.arc(128, 128, 108, 0, Math.PI * 2); g.stroke();
  g.strokeStyle = 'rgba(255,255,255,0.95)';
  g.lineWidth = 2;
  g.shadowBlur = 6;
  g.beginPath(); g.arc(128, 128, 108, 0, Math.PI * 2); g.stroke();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
const photonRing = new THREE.Sprite(new THREE.SpriteMaterial({
  map: ringTexture(), transparent: true, opacity: 0.95,
  blending: THREE.AdditiveBlending, depthWrite: false, color: 0xbfeaff,
}));
photonRing.scale.setScalar(16);
photonRing.position.z = 0.5;
bhGroup.add(photonRing);

/* accretion disk: differential spin, doppler-beamed hot side, heat rises at D3 */
const accMat = new THREE.ShaderMaterial({
  transparent: true, depthWrite: false, side: THREE.DoubleSide,
  blending: THREE.AdditiveBlending,
  uniforms: { uT: { value: 0 }, uHeat: bhHeat },
  vertexShader: `
    varying vec3 vP;
    void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `
    precision highp float;
    varying vec3 vP;
    uniform float uT; uniform float uHeat;
    float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    float vnoise(vec2 p){
      vec2 i = floor(p), f = fract(p);
      f = f * f * (3.0 - 2.0 * f);
      return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
                 mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
    }
    void main(){
      float r = length(vP.xy);
      float rn = clamp((r - 7.0) / 11.0, 0.0, 1.0);
      float th = atan(vP.y, vP.x);
      float spin = th - uT*0.55 + rn*3.2;
      float streak = pow(0.5 + 0.5*sin(spin*3.0 + vnoise(vec2(spin*1.4, rn*6.0))*5.0), 1.6);
      float tex = 0.4 + 0.6*vnoise(vec2(spin*2.2, rn*9.0));
      float beam = 0.35 + 0.85*pow(0.5 + 0.5*cos(th + 0.9), 2.0);
      vec3 col = mix(vec3(1.0, 0.96, 0.85), vec3(1.0, 0.62, 0.25), smoothstep(0.0, 0.5, rn));
      col = mix(col, vec3(0.85, 0.2, 0.12), smoothstep(0.45, 1.0, rn));
      float a = streak * tex * beam * (1.0 - smoothstep(0.7, 1.0, rn)) * smoothstep(0.0, 0.07, rn);
      a *= (0.5 + 0.5*uHeat) * 1.15;
      gl_FragColor = vec4(col * a * uHeat, a);
    }`,
});
const accDisk = new THREE.Mesh(new THREE.RingGeometry(7, 18, 128, 1), accMat);
accDisk.rotation.x = -Math.PI / 2 + 0.55;
bhGroup.add(accDisk);

/* ================= normalizing-flow particle field ================= */
const flow = new Flow(0x5eed1234);
const TITLE_N = isMobile ? 2400 : 4600;
const CLOUD_N = isMobile ? 1400 : 2600;
const N_PART = TITLE_N + CLOUD_N;
const SPREAD = 3.6;
const flowRnd = (() => { let a = 0xbeef01; return () => { a ^= a << 13; a >>>= 0; a ^= a >>> 17; a ^= a << 5; a >>>= 0; return a / 4294967296; }; })();

const aPos = new Float32Array(N_PART * 3);
const aZ = new Float32Array(N_PART * 3);
const aTarget = new Float32Array(N_PART * 3);
const aRnd = new Float32Array(N_PART);
const aTitle = new Float32Array(N_PART);

for (let i = 0; i < N_PART; i++) {
  aZ[i * 3] = flow.gauss(flowRnd) * 0.9;
  aZ[i * 3 + 1] = flow.gauss(flowRnd) * 0.9;
  aZ[i * 3 + 2] = flow.gauss(flowRnd) * 0.9;
  aRnd[i] = flowRnd();
  aTitle[i] = i < TITLE_N ? 1 : 0;
}

/* title targets: sample "TUSHAR KAPOOR" from a canvas */
{
  const W = 1240, H = 260;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  g.fillStyle = '#fff';
  g.font = '800 128px Arial, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText('TUSHAR KAPOOR', W / 2, H / 2);
  const img = g.getImageData(0, 0, W, H).data;
  const hits = [];
  const step = isMobile ? 7 : 5;
  for (let y = 0; y < H; y += step) {
    for (let x = 0; x < W; x += step) {
      if (img[(y * W + x) * 4 + 3] > 128) hits.push([x, y]);
    }
  }
  const stride = Math.max(1, Math.ceil(hits.length / TITLE_N));
  const SCALE = 0.0116, Y_OFF = 3.05, Z_OFF = 3.4;
  for (let i = 0; i < TITLE_N; i++) {
    const [px, py] = hits[(i * stride) % hits.length];
    aTarget[i * 3] = (px - W / 2) * SCALE;
    aTarget[i * 3 + 1] = -(py - H / 2) * SCALE + Y_OFF;
    aTarget[i * 3 + 2] = Z_OFF + (flowRnd() - 0.5) * 0.3;
  }
}

const titleUniforms = {
  uProg: { value: 0 },
  uTime: { value: 0 },
  uOpacity: { value: 1 },
  uPixel: { value: renderer.getPixelRatio() },
  uColA: { value: new THREE.Color('#22d3ee') },
  uColB: { value: new THREE.Color('#c084fc') },
};
let flowPoints = null;
{
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(aPos, 3).setUsage(THREE.DynamicDrawUsage));
  geo.setAttribute('aTarget', new THREE.BufferAttribute(aTarget, 3));
  geo.setAttribute('aRnd', new THREE.BufferAttribute(aRnd, 1));
  geo.setAttribute('aTitle', new THREE.BufferAttribute(aTitle, 1));
  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: titleUniforms,
    vertexShader: `
      attribute vec3 aTarget;
      attribute float aRnd;
      attribute float aTitle;
      uniform float uProg;
      uniform float uTime;
      uniform float uPixel;
      varying float vMix;
      varying float vTitle;
      void main(){
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = (1.7 + aRnd * 2.2) * uPixel * (14.0 / -mv.z);
        gl_Position = projectionMatrix * mv;
        vMix = mix(aRnd, smoothstep(-7.0, 7.0, aTarget.x), aTitle);
        vTitle = aTitle;
      }
    `,
    fragmentShader: `
      precision highp float;
      uniform vec3 uColA;
      uniform vec3 uColB;
      uniform float uOpacity;
      varying float vMix;
      varying float vTitle;
      void main(){
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.08, d);
        a *= mix(0.3, uOpacity, vTitle);
        if (a < 0.01) discard;
        gl_FragColor = vec4(mix(uColA, uColB, vMix), a);
      }
    `,
  });
  flowPoints = new THREE.Points(geo, mat);
  scene.add(flowPoints);
}

const _fv = new Float32Array(3);
const _lv = new Float32Array(3);
const _acc = new Float32Array(1);
function updateFlowField(t, g) {
  const e = titleUniforms.uProg.value;
  const sin = Math.sin, cos = Math.cos;
  for (let i = 0; i < N_PART; i++) {
    _lv[0] = aZ[i * 3]; _lv[1] = aZ[i * 3 + 1]; _lv[2] = aZ[i * 3 + 2];
    flow.forward(_lv, t, _fv, _acc);
    let x = _fv[0] * SPREAD, y = _fv[1] * SPREAD, z = _fv[2] * SPREAD;
    if (aTitle[i] > 0.5) {
      const stag = clamp((e - aRnd[i] * 0.45) / 0.55, 0, 1);
      const k = (1 - Math.pow(1 - stag, 3)) * g;
      if (k > 0.001) {
        const tx = aTarget[i * 3] + sin(t * 0.9 + aRnd[i] * 40.0) * 0.07;
        const ty = aTarget[i * 3 + 1] + cos(t * 0.7 + aRnd[i] * 31.0) * 0.07;
        const tz = aTarget[i * 3 + 2];
        x = lerp(x, tx, k); y = lerp(y, ty, k); z = lerp(z, tz, k);
      }
    }
    aPos[i * 3] = x; aPos[i * 3 + 1] = y; aPos[i * 3 + 2] = z;
  }
}

/* mean log p(x) over a subset — read out in the HUD */
let logpMean = -1.5;
function sampleLogP(t) {
  let s = 0;
  const M = Math.min(600, N_PART);
  for (let i = 0; i < M; i++) {
    _lv[0] = aZ[i * 3]; _lv[1] = aZ[i * 3 + 1]; _lv[2] = aZ[i * 3 + 2];
    flow.forward(_lv, t, _fv, _acc);
    s += flow.logp(_lv, _acc[0]);
  }
  logpMean = s / M;
}

/* ================= hexeract: 6D -> 5D -> 4D -> 3D ================= */
const hex = buildHexeract();
const hexGroup = new THREE.Group();
scene.add(hexGroup);
const hexLines = [];
function makeHexLines(edges, color, opacity) {
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(edges.length * 6);
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
  let colors = null;
  if (color === null) {
    colors = new Float32Array(edges.length * 6);
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3).setUsage(THREE.DynamicDrawUsage));
  }
  const mat = new THREE.LineBasicMaterial({
    vertexColors: color === null,
    color: color === null ? 0xffffff : color,
    transparent: true, opacity,
    blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const lines = new THREE.LineSegments(geo, mat);
  hexGroup.add(lines);
  hexLines.push({ lines, edges, colors });
  return lines;
}
const line6 = makeHexLines(hex.edges, null, 0.9);   /* full 6-cube, colored by x6 */
const line5 = makeHexLines(hex.e5, 0x22d3ee, 0.30); /* 5D section shadow */
const line4 = makeHexLines(hex.e4, 0xc084fc, 0.24); /* 4D section shadow (tesseract) */

/* 64 vertex glows */
{
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(64 * 3), 3).setUsage(THREE.DynamicDrawUsage));
  const vertMat = new THREE.PointsMaterial({
    size: 0.26, map: glowTex, color: 0xa5b4fc, transparent: true, opacity: 0.55,
    depthWrite: false, blending: THREE.AdditiveBlending,
  });
  hexGroup.add(new THREE.Points(g, vertMat));
  hexGroup.userData.vertPoints = g;
  hexGroup.userData.vertMat = vertMat;

  /* white specular glints on the 64 polished joints (shares geometry) */
  hexGroup.add(new THREE.Points(g, new THREE.PointsMaterial({
    size: 0.1, map: glowTex, color: 0xffffff, transparent: true, opacity: 0.85,
    depthWrite: false, blending: THREE.AdditiveBlending,
  })));
}

/* glossy glass shell around the 6-cube: fresnel rim + orbiting specular */
const shellMat = new THREE.ShaderMaterial({
  transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  uniforms: { uT: { value: 0 } },
  vertexShader: `
    varying vec3 vN; varying vec3 vV;
    void main(){
      vN = normalize(normalMatrix * normal);
      vec4 mv = modelViewMatrix * vec4(position, 1.0);
      vV = normalize(-mv.xyz);
      gl_Position = projectionMatrix * mv;
    }`,
  fragmentShader: `
    precision highp float;
    varying vec3 vN; varying vec3 vV;
    uniform float uT;
    void main(){
      vec3 n = normalize(vN);
      float fr = pow(1.0 - abs(dot(n, normalize(vV))), 3.0);
      vec3 rim = mix(vec3(0.13, 0.83, 0.93), vec3(0.75, 0.52, 0.99), clamp(n.y * 0.5 + 0.5, 0.0, 1.0));
      float spec = pow(max(0.0, dot(n, normalize(vec3(0.45 + 0.2 * sin(uT * 0.6), 0.8, 0.35)))), 42.0);
      vec3 col = rim * fr * 0.5 + vec3(1.0) * spec * 0.45;
      float a = fr * 0.42 + spec * 0.45;
      gl_FragColor = vec4(col, a);
    }`,
});
const shell = new THREE.Mesh(new THREE.SphereGeometry(4.6, 48, 32), shellMat);
hexGroup.add(shell);

/* ================= shooting stars ================= */
const shoots = [];
for (let i = 0; i < 3; i++) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3).setUsage(THREE.DynamicDrawUsage));
  const m = new THREE.LineBasicMaterial({
    color: 0xd8f4ff, transparent: true, opacity: 0,
    blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const line = new THREE.Line(g, m);
  line.frustumCulled = false;
  scene.add(line);
  shoots.push({ g, m, life: -1, dur: 1, x0: 0, y0: 0, z0: 0, vx: 0, vy: 0 });
}
function spawnShoot(s) {
  const left = Math.random() < 0.5;
  s.x0 = left ? 12 + Math.random() * 6 : -12 - Math.random() * 6;
  s.y0 = 5 + Math.random() * 7;
  s.z0 = -7 - Math.random() * 16;
  s.vx = (left ? -1 : 1) * (16 + Math.random() * 10);
  s.vy = -(5 + Math.random() * 4);
  s.life = 0;
  s.dur = 1.0 + Math.random() * 0.6;
}
function updateShoots(dt) {
  for (const s of shoots) {
    if (s.life < 0) {
      if (Math.random() < dt * 0.35) spawnShoot(s);
      else { s.m.opacity = 0; continue; }
    }
    s.life += dt;
    if (s.life > s.dur) { s.life = -1; s.m.opacity = 0; continue; }
    const k = s.life / s.dur;
    const hx = s.x0 + s.vx * s.life, hy = s.y0 + s.vy * s.life;
    const tx = s.x0 + s.vx * Math.max(0, s.life - 0.28), ty = s.y0 + s.vy * Math.max(0, s.life - 0.28);
    const arr = s.g.attributes.position.array;
    arr[0] = tx; arr[1] = ty; arr[2] = s.z0;
    arr[3] = hx; arr[4] = hy; arr[5] = s.z0;
    s.g.attributes.position.needsUpdate = true;
    s.m.opacity = Math.sin(Math.PI * k) * 0.8;
  }
}

/* ================= comets: rare visitors with head glow + ion tail ================= */
const comets = [];
function makeTail(color, opacity) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3).setUsage(THREE.DynamicDrawUsage));
  const m = new THREE.LineBasicMaterial({
    color, transparent: true, opacity,
    blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const line = new THREE.Line(g, m);
  line.frustumCulled = false;
  scene.add(line);
  return { g, m, line };
}
for (let i = 0; i < 2; i++) {
  const head = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTex, color: 0xeaf6ff, transparent: true, opacity: 0,
    blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  head.scale.setScalar(1.15);
  scene.add(head);
  comets.push({
    head, dust: makeTail(0xfff2d8, 0), ion: makeTail(0x7dd3fc, 0),
    life: -1, dur: 5, x0: 0, y0: 0, z0: 0, vx: 0, vy: 0, ix: 0, iy: 0,
  });
}
function spawnComet(c) {
  const left = Math.random() < 0.5;
  c.x0 = left ? 16 + Math.random() * 8 : -16 - Math.random() * 8;
  c.y0 = 7 + Math.random() * 6;
  c.z0 = -12 - Math.random() * 14;
  c.vx = (left ? -1 : 1) * (5 + Math.random() * 4);
  c.vy = -(2 + Math.random() * 2);
  const il = Math.hypot(c.x0, c.y0) || 1;
  c.ix = c.x0 / il; c.iy = c.y0 / il;
  c.life = 0;
  c.dur = 4.5 + Math.random() * 2;
}
function updateComets(dt) {
  for (const c of comets) {
    if (c.life < 0) {
      if (Math.random() < dt * 0.055) spawnComet(c);
      else { c.head.material.opacity = 0; c.dust.m.opacity = 0; c.ion.m.opacity = 0; continue; }
    }
    c.life += dt;
    if (c.life > c.dur) { c.life = -1; c.head.material.opacity = c.dust.m.opacity = c.ion.m.opacity = 0; continue; }
    const k = c.life / c.dur;
    const env = Math.sin(Math.PI * k);
    const hx = c.x0 + c.vx * c.life, hy = c.y0 + c.vy * c.life;
    c.head.position.set(hx, hy, c.z0);
    c.head.material.opacity = env * 0.95;
    /* dust tail: behind the head, along travel direction */
    const vl = Math.hypot(c.vx, c.vy) || 1;
    const d = c.dust.g.attributes.position.array;
    d[0] = hx - (c.vx / vl) * 5.5; d[1] = hy - (c.vy / vl) * 5.5; d[2] = c.z0;
    d[3] = hx; d[4] = hy; d[5] = c.z0;
    c.dust.g.attributes.position.needsUpdate = true;
    c.dust.m.opacity = env * 0.6;
    /* ion tail: pushed away from the core (solar wind of the hexeract) */
    const t2 = c.ion.g.attributes.position.array;
    t2[0] = hx; t2[1] = hy; t2[2] = c.z0;
    t2[3] = hx + c.ix * 7.5; t2[4] = hy + c.iy * 7.5; t2[5] = c.z0;
    c.ion.g.attributes.position.needsUpdate = true;
    c.ion.m.opacity = env * 0.4 * (0.7 + 0.3 * Math.sin(c.life * 7));
  }
}
const COL_A = new THREE.Color('#22d3ee'), COL_B = new THREE.Color('#c084fc'), _c = new THREE.Color();

function updateHex(t) {
  const proj = projectAll(hex, t, 2.05);
  const P = proj.P, mul = proj.mul;
  for (const entry of hexLines) {
    const arr = entry.lines.geometry.attributes.position.array;
    let o = 0;
    for (const [a, b] of entry.edges) {
      arr[o] = P[a][0] * mul; arr[o + 1] = P[a][1] * mul; arr[o + 2] = P[a][2] * mul; o += 3;
      arr[o] = P[b][0] * mul; arr[o + 1] = P[b][1] * mul; arr[o + 2] = P[b][2] * mul; o += 3;
    }
    entry.lines.geometry.attributes.position.needsUpdate = true;
    if (entry.colors) {
      /* glossy: moving key-light band + white specular hotspot per joint */
      const Lx = Math.cos(t * 0.55) * 0.8, Ly = 0.55, Lz = Math.sin(t * 0.55) * 0.8;
      const ll = Math.hypot(Lx, Ly, Lz);
      const lx = Lx / ll, ly = Ly / ll, lz = Lz / ll;
      let co = 0;
      for (const [a, b] of entry.edges) {
        for (const vi of [a, b]) {
          const px = P[vi][0], py = P[vi][1], pz = P[vi][2];
          const il = 1 / (Math.hypot(px, py, pz) + 1e-6);
          const nd = Math.max(0, (px * lx + py * ly + pz * lz) * il);
          _c.copy(COL_A).lerp(COL_B, proj.depth(vi));
          const g = 0.55 + 0.65 * nd * nd;
          const w = Math.pow(nd, 10) * 0.7;
          entry.colors[co] = _c.r * g + w;
          entry.colors[co + 1] = _c.g * g + w;
          entry.colors[co + 2] = _c.b * g + w;
          co += 3;
        }
      }
      entry.lines.geometry.attributes.color.needsUpdate = true;
    }
  }
  const vp = hexGroup.userData.vertPoints.attributes.position.array;
  for (let i = 0; i < 64; i++) {
    vp[i * 3] = P[i][0] * mul;
    vp[i * 3 + 1] = P[i][1] * mul;
    vp[i * 3 + 2] = P[i][2] * mul;
  }
  hexGroup.userData.vertPoints.attributes.position.needsUpdate = true;
}

/* ================= hypervector memory ================= */
const mem = new HyperMemory(0xc0617);
SKILLS.forEach((s) => mem.encode('S:' + s.name, s.tags));
PROJECTS.forEach((p) => mem.encode('R:' + p.name, p.tags));
const conceptVecs = CONCEPTS.map((c) => mem.tag(c));
const roleVecs = ROLES.map((r) => mem.tag('role:' + r));

/* DOM: chips */
const chipBox = document.getElementById('skillChips');
const chipEls = SKILLS.map((s) => {
  const el = document.createElement('span');
  el.textContent = s.name;
  chipBox.appendChild(el);
  return el;
});

/* DOM: meters */
function buildMeters(container, rows, hrefs) {
  return rows.map((r, i) => {
    const row = document.createElement(hrefs ? 'a' : 'div');
    row.className = 'row';
    if (hrefs) { row.href = hrefs[i]; row.target = '_blank'; row.rel = 'noopener'; }
    row.innerHTML = `<span class="name">${r}</span><span class="track"><span class="fill"></span></span><span class="val">0%</span>`;
    container.appendChild(row);
    return row;
  });
}
const skillMeterRows = buildMeters(document.getElementById('skillMeters'), SKILLS.map((s) => s.name));
const repoMeterRows = buildMeters(
  document.getElementById('repoMeters'),
  PROJECTS.map((p) => p.name),
  PROJECTS.map((p) => p.href || REPO_BASE + p.slug)
);

/* query construction: cursor -> concept blend in tag space + layer role */
const mouseN = new THREE.Vector2(0, 0);
const mouseS = new THREE.Vector2(0, 0);
let layerIdx = 0;

function buildQuery() {
  const u = ((mouseN.x + 1) / 2) * (CONCEPTS.length - 1);
  const i0 = Math.floor(clamp(u, 0, CONCEPTS.length - 1.001));
  const f = u - i0;
  const intent = new Float32Array(HV_D);
  for (let i = 0; i < HV_D; i++) {
    intent[i] = conceptVecs[i0][i] * (1 - f) + conceptVecs[i0 + 1][i] * f;
  }
  normalize(intent);
  return bundle([intent, roleVecs[layerIdx]], [0.72, 0.28]);
}

let skillAtt = [], repoAtt = [], hEnt = 0, topMatch = '—';
function updateAttention() {
  const q = buildQuery();

  const skillPairs = SKILLS.map((s) => ['S:' + s.name, cosine(q, mem.items.get('S:' + s.name))]);
  skillAtt = softmaxAttention(skillPairs, 46);
  const skillByRank = [...skillAtt].sort((a, b) => b[1] - a[1]);
  const rankOf = new Map(skillByRank.map((r, i) => [r[0], i]));
  skillAtt.forEach(([key, a], i) => {
    const row = skillMeterRows[i];
    row.querySelector('.fill').style.width = (a * 100 * 4.2).toFixed(1) + '%';
    row.querySelector('.val').textContent = (a * 100).toFixed(1) + '%';
    const rank = rankOf.get(key);
    row.style.opacity = rank < 8 ? 1 : 0.45;
    chipEls[i].classList.toggle('hot', rank < 5);
  });

  const repoPairs = PROJECTS.map((p) => ['R:' + p.name, cosine(q, mem.items.get('R:' + p.name))]);
  repoAtt = softmaxAttention(repoPairs, 46);
  hEnt = entropy(repoAtt);
  let top = 0;
  repoAtt.forEach(([key, a], i) => {
    if (a > repoAtt[top][1]) top = i;
    const row = repoMeterRows[i];
    row.querySelector('.fill').style.width = (a * 100 * 3.4).toFixed(1) + '%';
    row.querySelector('.val').textContent = (a * 100).toFixed(1) + '%';
  });
  topMatch = PROJECTS[top].short + ' ' + (repoAtt[top][1] * 100).toFixed(0) + '%';
  buildArcs();
}

/* ================= memory cells + co-attention arcs ================= */
const cellGroup = new THREE.Group();
scene.add(cellGroup);
const cells = [];
const rayTargets = [];
const CELL_R = 7.6;
const cellLocal = PROJECTS.map((p, i) => {
  const a = p.orbit !== undefined ? p.orbit : (i / PROJECTS.length) * Math.PI * 2;
  return [Math.cos(a) * CELL_R, Math.sin(i * 2.7) * 0.9, Math.sin(a) * CELL_R];
});

function labelSprite(text) {
  const c = document.createElement('canvas');
  c.width = 640; c.height = 128;
  const g = c.getContext('2d');
  g.font = '700 46px "Cascadia Code", Consolas, monospace';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.shadowColor = 'rgba(103,232,249,0.9)';
  g.shadowBlur = 22;
  g.fillStyle = '#e2e8f0';
  g.fillText(text, 320, 64);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: 0, depthWrite: false }));
  spr.scale.set(3.1, 0.62, 1);
  return spr;
}

PROJECTS.forEach((proj, i) => {
  const holder = new THREE.Group();
  holder.position.set(...cellLocal[i]);
  const cellR = proj.radius || 0.42;
  const wire = new THREE.Mesh(
    new THREE.IcosahedronGeometry(cellR, 0),
    new THREE.MeshBasicMaterial({ color: 0x22d3ee, wireframe: true, transparent: true, opacity: 0.9 })
  );
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTex, color: 0x4f46e5, transparent: true, opacity: 0.85,
    blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  glow.scale.setScalar(2.1 * (cellR / 0.42));
  /* specular hotspot: reads as a polished glass body */
  const spec = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTex, color: 0xffffff, transparent: true, opacity: 0.8,
    blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  spec.scale.setScalar(0.45);
  spec.position.set(-0.3, 0.34, 0.34);
  const hit = new THREE.Mesh(new THREE.SphereGeometry(1.0, 8, 8),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }));
  hit.userData.projectIndex = i;
  const label = labelSprite(proj.short);
  label.position.y = 1.15;
  holder.add(wire, glow, spec, hit, label);
  holder.scale.setScalar(0.001);
  holder.visible = false;
  cellGroup.add(holder);
  cells.push({ holder, wire, glow, label, proj });
  rayTargets.push(hit);
});

/* structural arcs: pairs with genuine cosine similarity > threshold */
const ARC_PAIRS = [];
for (let i = 0; i < PROJECTS.length; i++) {
  for (let j = i + 1; j < PROJECTS.length; j++) {
    const s = cosine(mem.items.get('R:' + PROJECTS[i].name), mem.items.get('R:' + PROJECTS[j].name));
    if (s > 0.075) ARC_PAIRS.push([i, j, s]);
  }
}
const arcGeo = new THREE.BufferGeometry();
const arcPos = new Float32Array(ARC_PAIRS.length * 6);
const arcCol = new Float32Array(ARC_PAIRS.length * 6);
ARC_PAIRS.forEach(([i, j], k) => {
  arcPos.set([...cellLocal[i], ...cellLocal[j]], k * 6);
});
arcGeo.setAttribute('position', new THREE.BufferAttribute(arcPos, 3));
arcGeo.setAttribute('color', new THREE.BufferAttribute(arcCol, 3).setUsage(THREE.DynamicDrawUsage));
const arcLines = new THREE.LineSegments(arcGeo, new THREE.LineBasicMaterial({
  vertexColors: true, transparent: true, opacity: 0.9,
  blending: THREE.AdditiveBlending, depthWrite: false,
}));
cellGroup.add(arcLines);
const AC_A = new THREE.Color('#22d3ee'), AC_B = new THREE.Color('#818cf8');

function buildArcs() {
  if (!repoAtt.length) return;
  const att = repoAtt.map(([, a]) => a);
  for (let k = 0; k < ARC_PAIRS.length; k++) {
    const [i, j, s] = ARC_PAIRS[k];
    const w = clamp(Math.sqrt(att[i] * att[j]) * 26, 0, 1) * clamp(s * 4, 0.3, 1);
    _c.copy(AC_A).lerp(AC_B, 1 - s * 3);
    arcCol[k * 6] = arcCol[k * 6 + 3] = _c.r * w;
    arcCol[k * 6 + 1] = arcCol[k * 6 + 4] = _c.g * w;
    arcCol[k * 6 + 2] = arcCol[k * 6 + 5] = _c.b * w;
  }
  arcGeo.attributes.color.needsUpdate = true;
}

/* ================= scroll state ================= */
let target = 0, cur = 0;
addEventListener('wheel', (e) => {
  if (e.target.closest && e.target.closest('.awards')) return;
  target = clamp(target + e.deltaY * 0.00042, 0, 1);
}, { passive: true });

let dragging = false, lastY = 0;
canvas.addEventListener('pointerdown', (e) => { dragging = true; lastY = e.clientY; });
addEventListener('pointerup', () => { dragging = false; });
addEventListener('pointermove', (e) => {
  if (dragging) {
    target = clamp(target + (lastY - e.clientY) * 0.0016, 0, 1);
    lastY = e.clientY;
  }
});
addEventListener('keydown', (e) => {
  if (['ArrowDown', 'PageDown', ' '].includes(e.key)) { target = clamp(target + 0.1, 0, 1); e.preventDefault(); }
  if (['ArrowUp', 'PageUp'].includes(e.key)) { target = clamp(target - 0.1, 0, 1); e.preventDefault(); }
});
document.querySelectorAll('#layerNav button').forEach((b, i) => {
  b.addEventListener('click', () => { target = parseFloat(b.dataset.goto); });
});

/* ================= camera keyframes ================= */
const KEYS = [
  { p: 0.00, pos: new THREE.Vector3(0, 0.6, 14.5), look: new THREE.Vector3(0, 1.0, 0) },
  { p: 0.24, pos: new THREE.Vector3(4.4, 1.9, 9.2), look: new THREE.Vector3(0, 0.3, 0) },
  { p: 0.50, pos: new THREE.Vector3(0, 8.2, 8.8), look: new THREE.Vector3(0, -0.5, 0) },
  { p: 0.74, pos: new THREE.Vector3(-5.4, 1.3, 9.0), look: new THREE.Vector3(0, 0.7, 0) },
  { p: 1.00, pos: new THREE.Vector3(0, -0.8, 19.5), look: new THREE.Vector3(0, 0.3, 0) },
];
const camPos = new THREE.Vector3(), camLook = new THREE.Vector3();
function cameraAt(p, mx, my) {
  let a = KEYS[0], b = KEYS[KEYS.length - 1];
  for (let i = 0; i < KEYS.length - 1; i++) {
    if (p >= KEYS[i].p && p <= KEYS[i + 1].p) { a = KEYS[i]; b = KEYS[i + 1]; break; }
  }
  const u = sstep(0, 1, (p - a.p) / Math.max(1e-6, b.p - a.p));
  camPos.lerpVectors(a.pos, b.pos, u);
  camLook.lerpVectors(a.look, b.look, u);
  camPos.x += mx * 0.9;
  camPos.y += my * 0.55;
  camera.position.copy(camPos);
  camera.lookAt(camLook);
}

/* ================= pointer / raycast / tooltip ================= */
const raycaster = new THREE.Raycaster();
let hovered = null;
const tooltip = document.getElementById('tooltip');

let entropySeed = 0x9e3779b9;
addEventListener('pointermove', (e) => {
  mouseN.x = (e.clientX / innerWidth) * 2 - 1;
  mouseN.y = -(e.clientY / innerHeight) * 2 + 1;
  entropySeed = (Math.imul(entropySeed ^ ((e.clientX * 73856093) ^ (e.clientY * 19349663) ^ (performance.now() & 0xfffff)), 2654435761)) >>> 0;
  if (hovered !== null) {
    tooltip.style.left = e.clientX + 18 + 'px';
    tooltip.style.top = e.clientY + 18 + 'px';
  }
});
canvas.addEventListener('click', () => {
  if (hovered !== null) window.open(cells[hovered].proj.href || REPO_BASE + cells[hovered].proj.slug, '_blank', 'noopener');
});

const embedEl = document.getElementById('embed');
setInterval(() => {
  const a = entropySeed >>> 0;
  const b = Math.imul(a ^ 0x5bf03635, 0x27d4eb2f) >>> 0;
  embedEl.textContent = '0x' + a.toString(16).padStart(8, '0') + b.toString(16).padStart(8, '0');
}, 1200);

/* ================= sections / HUD ================= */
const sections = [...document.querySelectorAll('section')].map((el) => ({
  el, in: parseFloat(el.dataset.in), out: parseFloat(el.dataset.out), t: 0,
}));
const navBtns = [...document.querySelectorAll('#layerNav button')];
const railFillEl = document.getElementById('railFill');
const legendRows = [...document.querySelectorAll('#shellLegend .lg-row')];
const cursorGlowEl = document.getElementById('cursorGlow');
const fpsEl = document.getElementById('fps');
const logpEl = document.getElementById('logp');
const hentEl = document.getElementById('hent');
const topEl = document.getElementById('topmatch');
const thetaEl = document.getElementById('thetaRead');
const stateEl = document.getElementById('stateLabel');

function updateSections(p) {
  let activeIdx = 0;
  sections.forEach((s, i) => {
    const fin = i === 0 ? 1 : sstep(s.in, s.in + 0.05, p);
    const fout = 1 - sstep(s.out - 0.05, s.out, p);
    const fade = Math.min(fin, fout);
    const baseY = i === 0 ? -30 : -46;
    s.t = fade;
    s.el.style.opacity = fade.toFixed(3);
    s.el.style.transform = `translate(-50%, ${(baseY + (1 - fade) * 6).toFixed(2)}%)`;
    s.el.classList.toggle('on', fade > 0.35 && loaderHidden);
    if (fade > 0.5) activeIdx = i;
  });
  navBtns.forEach((b, i) => b.classList.toggle('active', i === activeIdx));
  railFillEl.style.transform = `scaleY(${p.toFixed(4)})`;
  const activeShell = p < 0.38 ? '6' : (p < 0.66 ? '5' : '4');
  legendRows.forEach((r) => r.classList.toggle('active', r.dataset.shell === activeShell));
  if (activeIdx !== layerIdx) { layerIdx = activeIdx; stateEl.textContent = ROLES[activeIdx]; }
}

function updateThetaHUD(t) {
  const samples = [3, 9, 14];
  const parts = samples.map((pi) => {
    const ang = ((t * hex.omega[pi] + hex.phase[pi]) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
    const [i, j] = hex.planes[pi];
    return `&#952;${AX[i]}${AX[j]} ${ang.toFixed(2)}`;
  });
  thetaEl.innerHTML = 'SO(6) ' + parts.join(' · ');
}

/* ================= main loop ================= */
const clock = new THREE.Clock();

let frames = 0, lastFpsAt = 0, loaderHidden = false;
let lastHudAt = -1, lastLogpAt = -1, lastAttAt = -1;
const mouseSmX = { v: 0 }, mouseSmY = { v: 0 };

function tick() {
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;

  cur += (target - cur) * (1 - Math.exp(-dt * 4.2));
  const p = cur;

  mouseSmX.v = lerp(mouseSmX.v, mouseN.x, dt * 4);
  mouseSmY.v = lerp(mouseSmY.v, mouseN.y, dt * 4);
  bgUniforms.uMouse.value.set(mouseSmX.v, mouseSmY.v);
  bgUniforms.uTime.value = t;
  bgUniforms.uScroll.value = p;

  /* flow field + title assembly/dissolve */
  const g = 1 - sstep(0.05, 0.16, p);
  titleUniforms.uProg.value = clamp((t - 0.6) / 2.4, 0, 1);
  titleUniforms.uTime.value = t;
  titleUniforms.uOpacity.value = 0.28 + 0.72 * g;
  updateFlowField(t, g);
  if (flowPoints) flowPoints.geometry.attributes.position.needsUpdate = true;

  /* hexeract: shadow brightness rises with depth of descent */
  updateHex(t);
  const breathe = 1 + 0.08 * Math.sin(t * 1.6);
  line5.material.opacity = (0.18 + 0.26 * sstep(0.1, 0.5, p)) * breathe;
  line4.material.opacity = (0.14 + 0.24 * sstep(0.3, 0.8, p)) * breathe;
  line6.material.opacity = (0.95 - 0.35 * sstep(0.2, 0.9, p)) * breathe;
  hexGroup.rotation.y = Math.sin(t * 0.14) * (0.2 + p * 0.35);
  hexGroup.rotation.x = Math.cos(t * 0.11) * (0.12 + p * 0.2);
  hexGroup.userData.vertMat.size = 0.26 + 0.08 * Math.sin(t * 2.3);
  shellMat.uniforms.uT.value = t;
  shell.scale.setScalar(1 + 0.02 * Math.sin(t * 0.8));

  /* atmosphere layers */
  dustGroup.rotation.y = t * 0.008 + mouseSmX.v * 0.05;
  dustGroup.rotation.x = Math.sin(t * 0.05) * 0.05 + mouseSmY.v * 0.035;
  updateShoots(dt);
  updateComets(dt);

  /* universe bodies */
  planet.rotation.y += dt * 0.02;
  planetMat.uniforms.uT.value = t;
  moonMat.uniforms.uT.value = t;
  const ma = t * 0.14;
  moon.position.set(Math.cos(ma) * 12.5, Math.sin(ma * 0.7) * 2.2, Math.sin(ma) * 12.5);
  planetGroup.rotation.y = Math.sin(t * 0.03) * 0.1;
  accMat.uniforms.uT.value = t;
  bhHeat.value = 0.5 + 0.5 * sstep(0.58, 0.78, p);
  bhGroup.rotation.y = Math.sin(t * 0.05) * 0.1;
  coreGlow.material.opacity = (0.22 + 0.1 * Math.sin(t * 1.9)) * (1 - sstep(0.3, 0.7, p));
  if (bloomPass) bloomPass.strength = 0.45 + 0.08 * Math.sin(t * 0.5) + 0.12 * sstep(0.4, 0.55, p);

  /* memory cells in D2 */
  const sp = sstep(0.40, 0.47, p) * (1 - sstep(0.68, 0.74, p));
  cellGroup.rotation.y += dt * 0.07;
  cellGroup.visible = sp > 0.005;
  arcLines.visible = cellGroup.visible;

  /* attention refresh (wall-clock throttled) */
  if (t - lastAttAt > 0.12) { lastAttAt = t; updateAttention(); }
  if (t - lastHudAt > 0.15) {
    lastHudAt = t;
    logpEl.textContent = logpMean.toFixed(2);
    hentEl.textContent = hEnt.toFixed(3);
    topEl.textContent = topMatch;
    updateThetaHUD(t);
  }
  if (t - lastLogpAt > 1.2) { lastLogpAt = t; sampleLogP(t); }

  /* hover raycast */
  let newHover = null;
  if (sp > 0.35) {
    raycaster.setFromCamera(mouseN, camera);
    const hits = raycaster.intersectObjects(rayTargets, false);
    if (hits.length) newHover = hits[0].object.userData.projectIndex;
  }
  if (newHover !== hovered) {
    hovered = newHover;
    if (hovered !== null) {
      const pr = cells[hovered].proj;
      const meta = pr.stars !== undefined
        ? `<span>&#9733; ${pr.stars}${pr.language ? ' · ' + pr.language : ''}</span>`
        : '';
      tooltip.innerHTML = `<b>${pr.name}</b><span>${pr.blurb}</span>${meta}<span>click to open ↗</span>`;
      tooltip.classList.add('show');
      canvas.style.cursor = 'pointer';
    } else {
      tooltip.classList.remove('show');
      canvas.style.cursor = '';
    }
  }

  cells.forEach((c, i) => {
    const att = repoAtt[i] ? repoAtt[i][1] : 0;
    const want = sp * (0.55 + att * 5.2) * (hovered === i ? 1.4 : 1);
    c.holder.visible = sp > 0.005;
    const s = lerp(c.holder.scale.x, Math.max(0.001, want), Math.min(1, dt * 8));
    c.holder.scale.setScalar(s);
    c.holder.rotation.y += dt * (hovered === i ? 1.6 : 0.5);
    c.holder.rotation.x += dt * 0.3;
    c.label.material.opacity = sp * (hovered === i ? 1 : 0.85);
    c.wire.material.color.setHex(hovered === i ? 0xa5f3fc : 0x22d3ee);
    c.glow.material.opacity = 0.55 + att * 2.4;
  });

  cameraAt(p, mouseSmX.v, mouseSmY.v);
  camera.rotateZ(Math.sin(t * 0.09) * 0.045 + (mouseSmX.v * 0.02));
  cursorGlowEl.style.transform =
    `translate3d(${((mouseSmX.v + 1) / 2 * innerWidth).toFixed(1)}px,${((1 - mouseSmY.v) / 2 * innerHeight).toFixed(1)}px,0)`;
  updateSections(p);

  frames++;
  if (t - lastFpsAt >= 0.5) {
    fpsEl.textContent = 'fps ' + Math.round(frames / (t - lastFpsAt));
    frames = 0; lastFpsAt = t;
  }

  if (composer) composer.render(dt);
  else { renderer.clear(); renderer.render(scene, camera); }

  if (!loaderHidden && t > (document.body.classList.contains('snap') ? 0.05 : 0.9)) {
    loaderHidden = true;
    document.getElementById('loader').classList.add('done');
    document.body.classList.add('booted');
  }
  requestAnimationFrame(tick);
}

/* ================= resize ================= */
addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  titleUniforms.uPixel.value = renderer.getPixelRatio();
  if (composer) {
    composer.setPixelRatio(renderer.getPixelRatio());
    composer.setSize(innerWidth, innerHeight);
    if (bloomPass) bloomPass.resolution.set(innerWidth, innerHeight);
  }
});

/* ================= go ================= */
const pParam = location.search.match(/[?&]p=([\d.]+)/);
if (pParam) { const v = parseFloat(pParam[1]); if (isFinite(v)) { target = v; cur = v; } document.body.classList.add('snap'); }
console.log('%c COGNITUM 6D ', 'background:#4f46e5;color:#fff;font-size:16px',
  `v4 UNIVERSE — SO(6)·flow·HRR(D=${HV_D})·${composer ? 'bloom+afterimage' : 'direct'} — you inspect like an engineer.`);
updateAttention();
sampleLogP(0);
requestAnimationFrame(tick);
