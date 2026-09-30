/* Affine-coupling normalizing flow (RealNVP-style) with slowly drifting phases.
 * Every particle on the page is a sample z ~ N(0, I) pushed through this map.
 * log-det is accumulated exactly: log p(x) = log p(z) - sum s. */

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a ^= a << 13; a >>>= 0;
    a ^= a >>> 17;
    a ^= a << 5; a >>>= 0;
    return a / 4294967296;
  };
}

const LAYERS = [
  { mask: [1, 0, 1] },
  { mask: [0, 1, 0] },
  { mask: [1, 1, 0] },
];
const R = 4; /* sinusoidal terms per transformed coordinate */
const SCALE = 1.1;

export class Flow {
  constructor(seed = 0x5eed1234) {
    const rnd = rng(seed);
    this.layers = LAYERS.map(({ mask }) => {
      const aIdx = [], bIdx = [];
      mask.forEach((m, i) => (m ? bIdx : aIdx).push(i));
      const terms = bIdx.map(() => {
        const v = aIdx.map(() => (rnd() - 0.5) * 3.2); /* frequency vector over x_a */
        const w = Array.from({ length: R }, () => (rnd() - 0.5) * 1.6);
        const phi0 = Array.from({ length: R }, () => rnd() * Math.PI * 2);
        const omg = Array.from({ length: R }, () => (rnd() - 0.5) * 0.55);
        const bw = Array.from({ length: R }, () => (rnd() - 0.5) * 1.6);
        const cphi0 = Array.from({ length: R }, () => rnd() * Math.PI * 2);
        const comg = Array.from({ length: R }, () => (rnd() - 0.5) * 0.55);
        return { v, w, phi0, omg, bw, cphi0, comg };
      });
      return { aIdx, bIdx, terms };
    });
  }

  /* forward: z -> x ; accumulates logDet (sum of s) into acc[0] */
  forward(z, t, out, acc) {
    out[0] = z[0]; out[1] = z[1]; out[2] = z[2];
    let sumS = 0;
    for (const L of this.layers) {
      for (let bi = 0; bi < L.bIdx.length; bi++) {
        const b = L.bIdx[bi];
        const term = L.terms[bi];
        /* projection of x_a (only masked coords feed the sub-network) */
        let proj = 0;
        for (let k = 0; k < L.aIdx.length; k++) proj += term.v[k] * out[L.aIdx[k]];
        let s = 0, c = 0;
        for (let r = 0; r < R; r++) {
          const ph = proj + term.phi0[r] + term.omg[r] * t;
          s += term.w[r] * Math.sin(ph);
          const ph2 = proj + term.cphi0[r] + term.comg[r] * t;
          c += term.bw[r] * Math.sin(ph2);
        }
        s = SCALE * Math.tanh(s);
        c = SCALE * Math.tanh(c);
        out[b] = out[b] * Math.exp(s) + c;
        sumS += s;
      }
    }
    if (acc) acc[0] = sumS;
    return out;
  }

  /* log density of sample x produced from latent z: log N(z) - sum s */
  logp(z, sumS) {
    const n = -(z[0] * z[0] + z[1] * z[1] + z[2] * z[2]) / 2 - 1.5 * Math.log(2 * Math.PI);
    return n - sumS;
  }

  gauss(rnd) {
    const u = Math.max(1e-9, rnd()), v = rnd();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }
}
