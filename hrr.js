/* COGNITUM 6D — hypervector memory (HRR-style superposition, D=4096 bipolar). */

export const HV_D = 4096;

function xorshift(seed) {
  let a = seed >>> 0;
  return () => {
    a ^= a << 13; a >>>= 0;
    a ^= a >>> 17;
    a ^= a << 5; a >>>= 0;
    return a / 4294967296;
  };
}

export function bipolar(seed) {
  const rnd = xorshift(seed);
  const v = new Float32Array(HV_D);
  for (let i = 0; i < HV_D; i++) v[i] = rnd() < 0.5 ? -1 : 1;
  return v;
}

export function normalize(v) {
  let s = 0;
  for (let i = 0; i < HV_D; i++) s += v[i] * v[i];
  s = 1 / Math.sqrt(s);
  for (let i = 0; i < HV_D; i++) v[i] *= s;
  return v;
}

/* superposition bundling: sum + normalize */
export function bundle(vectors, weights) {
  const out = new Float32Array(HV_D);
  for (let k = 0; k < vectors.length; k++) {
    const w = weights ? weights[k] : 1;
    const v = vectors[k];
    for (let i = 0; i < HV_D; i++) out[i] += w * v[i];
  }
  return normalize(out);
}

export function cosine(a, b) {
  let s = 0;
  for (let i = 0; i < HV_D; i++) s += a[i] * b[i];
  return s; /* both unit-length */
}

/*
 * Item memory: each item = bundle(its tag vectors + small id component).
 * Shared tags produce genuinely correlated hypervectors — retrieval by
 * cosine reproduces compositional similarity, not random noise.
 */
export class HyperMemory {
  constructor(seed = 0xc0617) {
    this.rnd = xorshift(seed);
    this.tagVecs = new Map();
    this.items = new Map();
  }

  tag(name) {
    if (!this.tagVecs.has(name)) {
      this.tagVecs.set(name, bipolar((this.rnd() * 0xffffffff) >>> 0));
    }
    return this.tagVecs.get(name);
  }

  encode(key, tags, idWeight = 0.35) {
    const vecs = tags.map((t) => this.tag(t));
    vecs.push(bipolar((this.rnd() * 0xffffffff) >>> 0)); /* unique id component */
    const weights = tags.map(() => 1).concat([idWeight]);
    const v = normalize(bundle(vecs, weights));
    this.items.set(key, v);
    return v;
  }

  /* query = weighted bundle of concept vectors; returns [[key, cos], ...] desc */
  query(q, top = Infinity) {
    const out = [];
    for (const [key, v] of this.items) out.push([key, cosine(q, v)]);
    out.sort((a, b) => b[1] - a[1]);
    return out.slice(0, top);
  }
}

/* softmax attention over cosine scores */
export function softmaxAttention(pairs, beta = 42) {
  let max = -Infinity;
  for (const [, s] of pairs) if (s > max) max = s;
  let z = 0;
  const out = pairs.map(([key, s]) => {
    const e = Math.exp((s - max) * beta);
    z += e;
    return [key, e];
  });
  for (const row of out) row[1] /= z;
  return out;
}

export function entropy(att) {
  let h = 0;
  for (const [, a] of att) if (a > 1e-9) h -= a * Math.log(a);
  return h;
}
