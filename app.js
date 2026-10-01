/* COGNITUM 6D — the portfolio as a working model.
 *   · hexeract (6-cube) rotating in all 15 planes of SO(6), cascade-projected 6→3
 *   · affine-coupling normalizing flow sampling every particle on screen
 *   · 4096-d bipolar hypervector memory retrieving live from your cursor
 *   · Born-rule background: |ψ|² of a 7-mode superposition
 * Three.js r160 + custom GLSL. Zero frameworks, zero build step. */

import { HV_D, HyperMemory, bundle, normalize, cosine, softmaxAttention, entropy } from './hrr.js';
import { Flow } from './flow.js';
import { buildHexeract, projectAll } from './hexeract.js';

const FALLBACK = () => {
  document.getElementById('fallback').hidden = false;
  document.getElementById('loader').classList.add('done');
};

let THREE;
try {
  THREE = await import('https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js');
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

/* ================= background: Born-rule density |ψ|² ================= */
const bgScene = new THREE.Scene();
const bgCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
const bgUniforms = {
  uTime: { value: 0 },
  uMouse: { value: new THREE.Vector2(0, 0) },
  uScroll: { value: 0 },
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

    float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

    void main(){
      vec2 x = (vUv - 0.5) * vec2(1.75, 1.0) * 5.2;

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
      vec2 m = uMouse * vec2(1.75, 1.0) * 5.2;
      float d2 = dot(x - m, x - m);
      I *= 1.0 + 2.6 * exp(-d2 * 0.055);

      /* palette: deep space -> indigo fringes -> cyan interference */
      vec3 deep = vec3(0.012, 0.012, 0.04);
      vec3 indigo = mix(vec3(0.14, 0.12, 0.5), vec3(0.08, 0.32, 0.5), smoothstep(0.3, 0.7, uScroll));
      vec3 cyan = vec3(0.1, 0.62, 0.7);

      vec3 col = deep;
      col += indigo * smoothstep(0.05, 0.9, I);
      col += cyan * pow(smoothstep(0.5, 2.4, I), 2.0) * 0.85;
      col += vec3(0.55, 0.3, 0.9) * pow(smoothstep(1.4, 4.2, I), 3.0) * 0.7;

      /* fringe contours: iso-I bands */
      float band = abs(fract(I * 1.7) - 0.5);
      col += indigo * 0.14 * smoothstep(0.16, 0.0, band) * smoothstep(0.1, 0.5, I);

      col *= 1.0 - 0.45 * length(vUv - 0.5);
      col += (hash(vUv * vec2(uTime * 60.0, uTime * 47.0)) - 0.5) * 0.026;

      gl_FragColor = vec4(col, 1.0);
    }
  `,
});
bgScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), bgMat));

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
        a *= mix(0.42, uOpacity, vTitle);
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
  hexGroup.add(new THREE.Points(g, new THREE.PointsMaterial({
    size: 0.5, map: glowTex, color: 0xa5b4fc, transparent: true, opacity: 0.95,
    depthWrite: false, blending: THREE.AdditiveBlending,
  })));
  hexGroup.userData.vertPoints = g;
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
      let co = 0;
      for (const [a, b] of entry.edges) {
        _c.copy(COL_A).lerp(COL_B, proj.depth(a));
        entry.colors[co] = _c.r; entry.colors[co + 1] = _c.g; entry.colors[co + 2] = _c.b; co += 3;
        _c.copy(COL_A).lerp(COL_B, proj.depth(b));
        entry.colors[co] = _c.r; entry.colors[co + 1] = _c.g; entry.colors[co + 2] = _c.b; co += 3;
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
  PROJECTS.map((p) => REPO_BASE + p.slug)
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
const cellLocal = PROJECTS.map((_, i) => {
  const a = (i / PROJECTS.length) * Math.PI * 2;
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
  const wire = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.42, 0),
    new THREE.MeshBasicMaterial({ color: 0x22d3ee, wireframe: true, transparent: true, opacity: 0.9 })
  );
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTex, color: 0x4f46e5, transparent: true, opacity: 0.85,
    blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  glow.scale.setScalar(2.1);
  const hit = new THREE.Mesh(new THREE.SphereGeometry(1.0, 8, 8),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }));
  hit.userData.projectIndex = i;
  const label = labelSprite(proj.short);
  label.position.y = 1.15;
  holder.add(wire, glow, hit, label);
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
  if (hovered !== null) window.open(REPO_BASE + cells[hovered].proj.slug, '_blank', 'noopener');
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
    s.el.classList.toggle('on', fade > 0.35);
    if (fade > 0.5) activeIdx = i;
  });
  navBtns.forEach((b, i) => b.classList.toggle('active', i === activeIdx));
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

  cur += (target - cur) * Math.min(1, dt * 3.4);
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
  line5.material.opacity = 0.16 + 0.2 * sstep(0.1, 0.5, p);
  line4.material.opacity = 0.12 + 0.18 * sstep(0.3, 0.8, p);
  line6.material.opacity = 0.9 - 0.35 * sstep(0.2, 0.9, p);
  hexGroup.rotation.y = Math.sin(t * 0.12) * 0.15;
  hexGroup.rotation.x = Math.cos(t * 0.09) * 0.1;

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
      tooltip.innerHTML = `<b>${pr.name}</b><span>${pr.blurb}</span><span>click to open ↗</span>`;
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
  updateSections(p);

  frames++;
  if (t - lastFpsAt >= 0.5) {
    fpsEl.textContent = 'fps ' + Math.round(frames / (t - lastFpsAt));
    frames = 0; lastFpsAt = t;
  }

  renderer.clear();
  renderer.render(bgScene, bgCam);
  renderer.clearDepth();
  renderer.render(scene, camera);

  if (!loaderHidden && t > 0.9) {
    loaderHidden = true;
    document.getElementById('loader').classList.add('done');
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
});

/* ================= go ================= */
console.log('%c COGNITUM 6D ', 'background:#4f46e5;color:#fff;font-size:16px',
  `SO(6)·flow·HRR(D=${HV_D}) — you inspect like an engineer.`);
updateAttention();
sampleLogP(0);
requestAnimationFrame(tick);
