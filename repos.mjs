/* COGNITUM — GitHub repository data layer.
 * repos → planets: pure, deterministic mapping functions (seeded hash →
 * orbit / radius / hue / short label) plus an async loader with a
 * 1h localStorage cache, live API, committed snapshot and builtin fallback.
 * source ladder: LIVE → CACHE → SNAPSHOT → BUILTIN. */

export const USERNAME = 'Tusharkapoor-oop';
export const API_URL = `https://api.github.com/users/${USERNAME}/repos?per_page=100&sort=pushed`;
export const CACHE_KEY = 'cognitum.repos.v1';
export const CACHE_TTL_MS = 60 * 60 * 1000;
export const FETCH_TIMEOUT_MS = 4500;

/* ---------- pure mapping fns ---------- */

export function hashSeed(str) {
  let h = 0x811c9dc5;
  const s = String(str);
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function isProjectRepo(repo, username = USERNAME) {
  if (!repo || typeof repo.name !== 'string' || !repo.name) return false;
  if (repo.fork || repo.archived) return false;
  if (repo.name === username) return false;
  if (repo.name === `${username}.github.io`) return false;
  return true;
}

export function shortLabel(name) {
  const segs = String(name).split(/[-_ .]+/).filter(Boolean);
  if (!segs.length) return '?';
  const take = segs.slice(0, 2).map((w) => w.toUpperCase());
  let s = take.join(' · ');
  if (s.length > 14) s = s.slice(0, 14).trim();
  return s;
}

export function orbitFor(i, n, name) {
  const base = (i / Math.max(1, n)) * Math.PI * 2;
  const jitter = ((hashSeed(name) % 1000) / 1000 - 0.5) * 0.36;
  return (base + jitter + Math.PI * 4) % (Math.PI * 2);
}

export function radiusFor(repo, min = 0.35, max = 0.88) {
  const stars = Math.max(0, Number(repo && repo.stargazers_count) || 0);
  const forks = Math.max(0, Number(repo && repo.forks_count) || 0);
  const size = Math.max(0, Number(repo && repo.size) || 0);
  const r = 0.42 * (1 + stars * 0.055 + forks * 0.07 + Math.min(size, 4000) / 4000 * 0.25);
  return Math.min(max, Math.max(min, r));
}

export function hueFor(name) {
  return hashSeed(name) % 360;
}

export function tagsFor(repo, limit = 4) {
  const out = [];
  if (Array.isArray(repo && repo.topics)) out.push(...repo.topics);
  if (repo && repo.language && !out.includes(repo.language)) out.push(String(repo.language).toLowerCase());
  return out.slice(0, limit);
}

export function isCacheFresh(entry, now) {
  if (!entry || typeof entry !== 'object') return false;
  if (typeof entry.ts !== 'number') return false;
  if (!Array.isArray(entry.repos)) return false;
  return now - entry.ts < CACHE_TTL_MS;
}

export function planetsFromRepos(repos, username = USERNAME) {
  if (!Array.isArray(repos)) return [];
  return repos.filter((r) => isProjectRepo(r, username)).map((r) => ({
    name: r.name,
    slug: r.name,
    short: shortLabel(r.name),
    blurb: (typeof r.description === 'string' && r.description.trim())
      ? r.description.trim().replace(/\s+/g, ' ')
      : 'GitHub repository — live metadata pending.',
    tags: tagsFor(r),
    href: r.html_url || `https://github.com/${username}/${r.name}`,
    stars: Math.max(0, Number(r.stargazers_count) || 0),
    language: r.language || '',
    pushedAt: r.pushed_at || '',
    radius: radiusFor(r),
    orbit: 0,
    hue: hueFor(r.name),
  })).map((p, i, arr) => {
    p.orbit = orbitFor(i, arr.length, p.name);
    return p;
  });
}

/* ---------- loader ---------- */

function safeStorage(storage) {
  try {
    const k = '__cognitum_test__';
    storage.setItem(k, '1');
    storage.removeItem(k);
    return storage;
  } catch (e) {
    return null;
  }
}

async function fetchJson(url, fetchFn, timeoutMs) {
  const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = ctrl ? setTimeout(() => ctrl.abort(), timeoutMs) : null;
  try {
    const res = await fetchFn(url, ctrl ? { signal: ctrl.signal } : undefined);
    if (!res || !res.ok) return null;
    return await res.json();
  } catch (e) {
    return null;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function loadRepos(opts = {}) {
  const fetchFn = opts.fetchFn !== undefined
    ? opts.fetchFn
    : (typeof fetch !== 'undefined' ? fetch : null);
  const storage = safeStorage(opts.storage !== undefined
    ? opts.storage
    : (typeof localStorage !== 'undefined' ? localStorage : null));
  const now = opts.now !== undefined ? opts.now : Date.now;
  const snapshotUrl = opts.snapshotUrl || 'repos.snapshot.json';
  const timeoutMs = opts.timeoutMs || FETCH_TIMEOUT_MS;

  /* 1 — live API */
  if (fetchFn) {
    const live = await fetchJson(API_URL, fetchFn, timeoutMs);
    if (Array.isArray(live) && live.length) {
      if (storage) {
        try {
          storage.setItem(CACHE_KEY, JSON.stringify({ ts: now(), repos: live }));
        } catch (e) { /* quota — ignore */ }
      }
      return { repos: live, source: 'LIVE' };
    }
  }

  /* 2 — fresh localStorage cache */
  if (storage) {
    try {
      const raw = storage.getItem(CACHE_KEY);
      if (raw) {
        const entry = JSON.parse(raw);
        if (isCacheFresh(entry, now())) return { repos: entry.repos, source: 'CACHE' };
      }
    } catch (e) { /* corrupt cache — ignore */ }
  }

  /* 3 — committed snapshot (shipped with the site) */
  if (fetchFn) {
    const snap = await fetchJson(snapshotUrl, fetchFn, timeoutMs);
    if (snap && Array.isArray(snap.repos)) return { repos: snap.repos, source: 'SNAPSHOT' };
  }

  /* 4 — builtin: caller keeps its curated list */
  return { repos: null, source: 'BUILTIN' };
}
