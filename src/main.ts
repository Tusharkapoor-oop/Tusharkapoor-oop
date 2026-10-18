/* TUSHAR KAPOOR: UNIVERSE — v5 galaxy engine.
 * One repository ⟶ one planet orbiting a seeded star map.
 *   · deterministic planet fields via the Phase B data layer (repos.mjs)
 *   · LIVE → CACHE → SNAPSHOT → BUILTIN ladder, shown in the HUD
 *   · raycast planet picking · follow-cam on focus · ESC returns · scroll travel
 * Three.js r169 + OrbitControls. Zero other dependencies. */

import './styles.css';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { loadRepos, planetsFromRepos, hashSeed } from '../repos.mjs';
import type { RepoPlanet, RepoRecord } from '../repos.mjs';

/* ---- builtin corpus ----------------------------------------------------
 * Mirrors the curated PROJECTS list from the v4 engine: used when the
 * LIVE/CACHE/SNAPSHOT ladder is fully exhausted (offline first painting). */

const BUILTIN_REPOS: RepoRecord[] = [
  { name: 'Advance_hand_gesture', language: 'JavaScript', description: 'Real-time hand-gesture recognition — MediaPipe landmarks, TensorFlow classifier, browser demo.' },
  { name: 'auracontrol-backend', language: 'TypeScript', description: 'Real-time gesture engine — FastAPI, MediaPipe, WebSocket dispatch loop.' },
  { name: 'VOIS_AICTE_Oct2025_TUSHAR-KAPOOR', language: 'Jupyter Notebook', description: 'Netflix and Airbnb data analysis — EDA notebooks, decks, course materials.' },
  { name: 'OS_LAB_Linux_Ubantu', language: 'Python', description: 'Operating systems lab in Python — system calls, CPU scheduling, sync, memory, file systems.' },
  { name: 'go-bric', language: 'TypeScript', description: 'Multi-agent company scouting — five specialist agents over a shared dataset. Next.js + Gemini.' },
  { name: 'ReflectAI', language: 'Jupyter Notebook', description: 'Deterministic end-of-day reflection — structured conversation to a psychological tree output.' },
  { name: 'Sustainable-Agriculture-Project', language: 'Jupyter Notebook', description: 'Crop recommendation from soil/climate features — full ML pipeline with evaluation.' },
  { name: 'tushar_cse-AI-and-ML-A_AI-STUDY-PLANNER', language: 'HTML', description: 'AI study planner — syllabus upload, topic extraction, video curation.' },
  { name: 'Kapoor-portfolio', language: 'TypeScript', description: 'Personal portfolio site — React, Vite and Tailwind with GitHub Actions CI/CD.' },
  { name: 'NPU-Fit-Checker-Automated-NPU-Fallback-Diagnosis', language: 'Python', description: 'Automated NPU fallback diagnosis — which layers fell back to CPU, on which target, and why. 30/30 tests green.' },
  { name: 'IBM-Cloud-project', language: 'Jupyter Notebook', description: 'Predictive maintenance on IBM Cloud / Watsonx — Jupyter ML pipeline with evaluation.' },
];

/* ---- DOM handles -------------------------------------------------------- */

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

const els = {
  canvas: $<HTMLCanvasElement>('universe'),
  loading: $('loading'),
  loadingText: $('loading').querySelector('.loading-text') as HTMLElement,
  hero: $('hero'),
  hud: $('hud'),
  dataSource: $('data-source'),
  panel: $('planet-panel'),
  panelClose: $('panel-close'),
  panelClass: $('panel-class'),
  panelName: $('panel-name'),
  panelDesc: $('panel-desc'),
  panelMetrics: $('panel-metrics'),
  panelTopics: $('panel-topics'),
  panelLink: $('panel-link') as HTMLAnchorElement,
};

/* ---- environment discipline (v4 uQual gate, carried forward) ------------ */

const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const COMPACT = window.matchMedia('(max-width: 720px)').matches;
const DPR_CAP = COMPACT ? 1.5 : 2;
const STAR_COUNT = COMPACT ? 3200 : 6500;

/* ---- types + state ------------------------------------------------------ */

interface UniversePlanet extends RepoPlanet {
  group: THREE.Group;
  shell: THREE.Mesh;
  shellMat: THREE.MeshStandardMaterial;
  label: THREE.Sprite;
  orbitR: number;
  baseAngle: number;
  speed: number;
  tilt: number;
}

let renderer: THREE.WebGLRenderer;
let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let controls: OrbitControls;
let pickables: THREE.Object3D[] = [];
let planets: UniversePlanet[] = [];
let selected: number = -1;

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const tmp = new THREE.Vector3();
const ORIGIN = new THREE.Vector3(0, 0, 0);

/* ---- deterministic crafts ---------------------------------------------- */

function hueColor(hue: number, saturation = 0.62, lightness = 0.55): THREE.Color {
  return new THREE.Color().setHSL((hue % 360) / 360, saturation, lightness);
}

function orbitRadius(planet: RepoPlanet): number {
  // orbital shell derived from the planet's own identity — stable across reloads
  const band = (hashSeed(planet.name) % 950) / 950;          // 0..1
  return 6.5 + band * 9.5;                                   // 6.5..16
}

function orbitSpeed(planet: RepoPlanet): number {
  return (0.012 + (hashSeed(planet.name) % 60) / 10_000) * (REDUCED ? 0.25 : 1);
}

function orbitTilt(planet: RepoPlanet): number {
  return (((hashSeed(planet.name) >> 3) % 100) / 100 - 0.5) * 4; // ±2 world units
}

/* ---- textures ----------------------------------------------------------- */

function makeGlowTexture(): THREE.Texture {
  const size = 256;
  const cv = document.createElement('canvas');
  cv.width = size;
  cv.height = size;
  const ctx = cv.getContext('2d')!;
  const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, 'rgba(255, 244, 214, 0.9)');
  grad.addColorStop(0.35, 'rgba(255, 214, 148, 0.35)');
  grad.addColorStop(1, 'rgba(255, 200, 120, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeLabelTexture(planet: RepoPlanet): THREE.Texture {
  const w = 512;
  const h = 128;
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  const ctx = cv.getContext('2d')!;

  const color = `hsl(${planet.hue}, 72%, 74%)`;
  ctx.font = '600 46px "JetBrains Mono", ui-monospace, monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(2, 3, 10, 0.9)';
  ctx.shadowBlur = 12;
  ctx.fillStyle = color;
  ctx.fillText(planet.short, w / 2, h / 2 - 8);

  // classification tick under the name
  ctx.shadowBlur = 0;
  ctx.fillStyle = 'rgba(136, 146, 164, 0.8)';
  ctx.font = '300 26px "JetBrains Mono", ui-monospace, monospace';
  const cls = planet.language ? planet.language.toUpperCase() : 'SYSTEM';
  ctx.fillText(cls, w / 2, h / 2 + 34);

  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeStarfield(count: number, radiusMin: number, radiusMax: number): THREE.Points {
  const geo = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const warmth = new THREE.Color(0xffe8c8);
  const cold = new THREE.Color(0x9dc2ff);

  for (let i = 0; i < count; i++) {
    // uniform sphere shell, then squash y toward the galactic plane
    const r = radiusMin + Math.random() * (radiusMax - radiusMin);
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const y = Math.cos(phi) * r;
    const flat = 0.35 + Math.random() * 0.35;
    positions[i * 3] = Math.sin(phi) * Math.cos(theta) * r;
    positions[i * 3 + 1] = y * flat;
    positions[i * 3 + 2] = Math.sin(phi) * Math.sin(theta) * r;

    const c = (i % 3 === 0 ? warmth : cold).clone();
    c.lerp(new THREE.Color(0xffffff), Math.random() * 0.5);
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }

  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const mat = new THREE.PointsMaterial({
    size: radiusMax > 100 ? 0.8 : 0.14,
    sizeAttenuation: true,
    vertexColors: true,
    transparent: true,
    opacity: 0.85,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  return new THREE.Points(geo, mat);
}

/* ---- scene -------------------------------------------------------------- */

function initRenderer(): boolean {
  try {
    renderer = new THREE.WebGLRenderer({
      canvas: els.canvas,
      antialias: !COMPACT,
      powerPreference: 'high-performance',
    });
  } catch (err) {
    console.error('UNIVERSE: WebGL unavailable', err);
    els.loadingText.textContent = 'WEBGL UNAVAILABLE — GRAPHICS STORE OFFLINE';
    return false;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, DPR_CAP));
  renderer.setSize(window.innerWidth, window.innerHeight);
  return true;
}

function initScene(planetData: RepoPlanet[]) {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x02030a);
  scene.fog = new THREE.FogExp2(0x02030a, 0.0045);

  camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 400);
  camera.position.set(0, 9, 26);

  controls = new OrbitControls(camera, els.canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.enablePan = false;
  controls.minDistance = 4;
  controls.maxDistance = 64;
  controls.maxPolarAngle = Math.PI * 0.72;
  controls.target.set(0, 0, 0);

  /* lights */
  const sun = new THREE.PointLight(0xfff0d0, 900, 0, 2);
  scene.add(sun);
  scene.add(new THREE.AmbientLight(0x334455, 0.35));

  /* core + halo */
  const core = new THREE.Mesh(
    new THREE.SphereGeometry(1.35, 32, 32),
    new THREE.MeshBasicMaterial({ color: 0xfff4d6 }),
  );
  scene.add(core);

  const halo = new THREE.Sprite(new THREE.SpriteMaterial({
    map: makeGlowTexture(),
    color: 0xffdca0,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  }));
  halo.scale.set(16, 16, 1);
  scene.add(halo);

  /* sky */
  scene.add(makeStarfield(STAR_COUNT, 120, 220));
  scene.add(makeStarfield(STAR_COUNT >> 2, 45, 90));

  /* planets */
  const shellGeo = new THREE.SphereGeometry(1, 28, 36);
  for (const data of planetData) {
    const p: UniversePlanet = {
      ...data,
      orbitR: orbitRadius(data),
      baseAngle: data.orbit,
      speed: orbitSpeed(data),
      tilt: orbitTilt(data),
    } as UniversePlanet;

    const group = new THREE.Group();
    group.userData.idx = planets.length;

    const r = data.radius * 2.3;
    const shellMat = new THREE.MeshStandardMaterial({
      color: hueColor(data.hue),
      roughness: 0.55,
      metalness: 0.2,
      emissive: hueColor(data.hue, 0.8, 0.35),
      emissiveIntensity: 0.22,
    });
    const shell = new THREE.Mesh(shellGeo, shellMat);
    shell.scale.setScalar(r);
    shell.userData.idx = planets.length;
    group.add(shell);

    /* ring for decorated bodies (3★+) */
    if (data.stars >= 3) {
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(r * 1.5, r * 2.05, 64),
        new THREE.MeshBasicMaterial({
          color: hueColor(data.hue, 0.5, 0.7),
          transparent: true,
          opacity: 0.35,
          side: THREE.DoubleSide,
          depthWrite: false,
        }),
      );
      ring.rotation.x = Math.PI / 2 - ((data.hue % 40) / 40 - 0.5);
      ring.userData.idx = planets.length;
      group.add(ring);
    }

    /* identification label */
    const label = new THREE.Sprite(new THREE.SpriteMaterial({
      map: makeLabelTexture(data),
      transparent: true,
      depthWrite: false,
    }));
    label.scale.set(4.4, 1.1, 1);
    label.position.y = r + 1.35;
    label.userData.idx = planets.length;
    group.add(label);

    scene.add(group);
    p.group = group;
    p.shell = shell;
    p.shellMat = shellMat;
    p.label = label;
    planets.push(p);
  }

  pickables = planets.flatMap((p) => p.group.children);
}

/* ---- panel -------------------------------------------------------------- */

function fmtUpdated(push: string): string {
  if (!push) return '—';
  const d = new Date(push);
  if (Number.isNaN(+d)) return '—';
  const days = Math.floor((Date.now() - +d) / 86_400_000);
  if (days <= 0) return 'TODAY';
  if (days < 30) return `${days}D AGO`;
  return d.toISOString().slice(0, 10);
}

function openPanel(idx: number) {
  const p = planets[idx];
  if (!p) return;

  selected = idx;
  els.panelClass.textContent = `PROJECT BODY · ${(p.language || 'SYSTEM').toUpperCase()}`;
  els.panelName.textContent = p.name;
  els.panelDesc.textContent = p.blurb;

  els.panelMetrics.innerHTML = [
    ['STARS', p.stars ? `★ ${p.stars}` : '0'],
    ['SIZE', `R ${p.radius.toFixed(2)}`],
    ['LANGUAGE', p.language || '—'],
    ['UPDATED', fmtUpdated(p.pushedAt)],
  ].map(([label, value]) => `
    <div class="metric">
      <span class="metric-label">${label}</span>
      <span class="metric-value">${value}</span>
    </div>`).join('');

  els.panelTopics.innerHTML = (p.tags.length ? p.tags : ['github'])
    .map((t) => `<span class="topic">${t}</span>`).join('');

  els.panelLink.href = p.href;
  els.panelLink.hidden = !p.href;
  els.panel.classList.remove('hidden');

  p.shellMat.emissiveIntensity = 0.75;
}

function closePanel() {
  if (selected >= 0) {
    planets[selected].shellMat.emissiveIntensity = 0.22;
  }
  selected = -1;
  els.panel.classList.add('hidden');
}

/* ---- picking ------------------------------------------------------------ */

function pickAt(clientX: number, clientY: number): number {
  pointer.x = (clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(pointer, camera as THREE.Camera);
  const hits = raycaster.intersectObjects(pickables, false);
  for (const hit of hits) {
    const idx = hit.object.userData.idx;
    if (typeof idx === 'number' && idx >= 0) return idx;
  }
  return -1;
}

let downX = 0;
let downY = 0;
const DRAG_THRESHOLD = 6;

els.canvas.addEventListener('pointerdown', (e) => {
  downX = e.clientX;
  downY = e.clientY;
});

els.canvas.addEventListener('pointerup', (e) => {
  const moved = Math.hypot(e.clientX - downX, e.clientY - downY);
  if (moved > DRAG_THRESHOLD) return;
  const idx = pickAt(e.clientX, e.clientY);
  if (idx >= 0) openPanel(idx);
  else closePanel();
});

els.canvas.addEventListener('pointermove', (e) => {
  const idx = pickAt(e.clientX, e.clientY);
  els.canvas.style.cursor = idx >= 0 ? 'pointer' : 'grab';
});

window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closePanel();
});

els.panelClose.addEventListener('click', closePanel);

/* ---- boot --------------------------------------------------------------- */

function onReady(source: string) {
  els.dataSource.textContent = `DATA ⟶ ${source} · ${planets.length} BODIES`;
  els.loadingText.textContent = 'STAR MAP READY';
  window.setTimeout(() => {
    els.loading.classList.add('hidden');
    els.hero.classList.remove('hidden');
    els.hud.classList.remove('hidden');
  }, 600);
}

async function boot(): Promise<void> {
  if (!initRenderer()) return;
  els.loadingText.textContent = 'RESOLVING REPOSITORY BODIES';

  const { repos, source } = await loadRepos();

  // planet list: live/cache/snapshot corpus, falling back to the curated set
  let list: RepoPlanet[] = repos ? planetsFromRepos(repos) : [];
  let sourceLabel: string = source;
  if (!list.length) {
    list = planetsFromRepos(BUILTIN_REPOS);
    sourceLabel = 'BUILTIN';
  }

  initScene(list);
  els.loadingText.textContent = 'COMPILING ORBITS';

  onReady(sourceLabel);

  const clock = new THREE.Clock();

  function frame(): void {
    requestAnimationFrame(frame);
    if (document.hidden) return;

    const t = clock.getElapsedTime();

    for (const p of planets) {
      const a = p.baseAngle + t * p.speed;
      p.group.position.set(
        Math.cos(a) * p.orbitR,
        Math.sin(a) * p.tilt * 0.25,
        Math.sin(a) * p.orbitR,
      );
    }

    // follow-cam: ease target toward the selected body, back to the sun otherwise
    if (selected >= 0) {
      planets[selected].group.getWorldPosition(tmp);
    } else {
      tmp.copy(ORIGIN);
    }
    controls.target.lerp(tmp, 0.08);

    controls.update();
    renderer.render(scene, camera);
  }
  frame();

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
}

boot().catch((err) => {
  console.error('UNIVERSE: boot failed', err);
  els.loadingText.textContent = 'STAR MAP FAULT — CHECK CONSOLE';
});

export { openPanel, closePanel };
