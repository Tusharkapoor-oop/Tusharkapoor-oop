/* Hexeract (6-cube): 64 vertices, 192 edges, rotations in all 15 planes of
 * so(6), then a nested stereographic cascade 6D -> 5D -> 4D -> 3D.
 * Shadows: the full 6-cube, its 5D hyperplane section (x6 = 0), and its
 * 4D section (x5 = x6 = 0) render as three nested rotating wireframes. */

export function buildHexeract() {
  const verts = [];
  for (let i = 0; i < 64; i++) {
    verts.push([
      (i & 1) ? 1 : -1, (i & 2) ? 1 : -1, (i & 4) ? 1 : -1,
      (i & 8) ? 1 : -1, (i & 16) ? 1 : -1, (i & 32) ? 1 : -1,
    ]);
  }
  const edges = [];
  for (let a = 0; a < 64; a++) {
    for (let b = a + 1; b < 64; b++) {
      let diff = 0;
      for (let k = 0; k < 6; k++) if (verts[a][k] !== verts[b][k]) diff++;
      if (diff === 1) edges.push([a, b]);
    }
  }
  /* 15 bivector planes of SO(6): (i, j) for 0 <= i < j < 6 */
  const planes = [];
  for (let i = 0; i < 6; i++) {
    for (let j = i + 1; j < 6; j++) planes.push([i, j]);
  }
  const GOLD = 1.6180339887;
  const omega = planes.map((_, k) => 0.11 * Math.pow(GOLD, k * 0.37) * (k % 3 === 0 ? -1 : 1));
  const phase = planes.map((_, k) => k * 0.7);
  /* hyperplane-section shadows: 5D (x6=0 -> bit 32 clear), 4D (bits 32|16 clear) */
  const e5 = edges.filter(([a, b]) => !(a & 32) && !(b & 32));
  const e4 = edges.filter(([a, b]) => !((a | b) & 48));
  return { verts, edges, e5, e4, planes, omega, phase };
}

/* rotate in plane (i,j) by angle a — applies to one vertex in place */
function rot(v, i, j, a) {
  const c = Math.cos(a), s = Math.sin(a);
  const vi = v[i], vj = v[j];
  v[i] = vi * c - vj * s;
  v[j] = vi * s + vj * c;
}

/* nested cascade: fold highest dims into the rest, then drop them.
 * f = K/(K - x_d) scales all remaining coords (stereographic step). */
function cascade(v, K) {
  const w = [v[0], v[1], v[2], v[3], v[4], v[5]];
  for (let d = 5; d >= 3; d--) {
    const c = K / (K - Math.max(-K * 0.9, Math.min(K * 0.9, w[d])));
    for (let k = 0; k < d; k++) {
      w[k] = Math.max(-4, Math.min(4, w[k] * c));
    }
  }
  return [w[0], w[1], w[2]];
}

const NORM = 2.44948974278; /* max |coord| of rotated unit 6-cube vertex <= sqrt(6); bound tighter */

/*
 * Full pipeline: SO(6) rotation of all 64 vertices, normalize into the
 * projection radius, then nested stereographic cascade 6->5->4->3.
 * Shadows: full 6-cube (colored by x6), 5D section (x6 bit clear),
 * 4D section (x5 = x6 clear = tesseract).
 */
export function projectAll(hex, t, scale, K = 1.55) {
  const { verts, planes, omega, phase } = hex;
  const n = verts.length;
  const P = new Array(n);
  const tmp = new Array(n);
  const dep = new Float32Array(n);
  for (let i = 0; i < n; i++) tmp[i] = verts[i].slice();

  for (let p = 0; p < planes.length; p++) {
    const [i, j] = planes[p];
    const a = t * omega[p] + phase[p];
    for (let vi = 0; vi < n; vi++) rot(tmp[vi], i, j, a);
  }
  for (let i = 0; i < n; i++) {
    dep[i] = clamp01(tmp[i][5] / NORM * 0.5 + 0.5);
    for (let k = 0; k < 6; k++) tmp[i][k] /= NORM;
    P[i] = cascade(tmp[i], K);
  }

  const mul = scale;
  return {
    project: (vi) => [P[vi][0] * mul, P[vi][1] * mul, P[vi][2] * mul],
    depth: (vi) => dep[vi],
    P, mul,
  };
}

function clamp01(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }
