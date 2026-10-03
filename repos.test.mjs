/* COGNITUM repos data layer — unit tests.
 * run: node repos.test.mjs   (exit 0 = all pass) */

import {
  hashSeed, isProjectRepo, shortLabel, orbitFor, radiusFor, hueFor,
  tagsFor, isCacheFresh, planetsFromRepos, loadRepos,
  CACHE_KEY, CACHE_TTL_MS, API_URL,
} from './repos.mjs';

let pass = 0, fail = 0;
const t = (name, cond) => {
  if (cond) { pass++; } else { fail++; console.error('FAIL:', name); }
};

/* ---- hashSeed ---- */
t('hash deterministic', hashSeed('go-bric') === hashSeed('go-bric'));
t('hash differs by input', hashSeed('go-bric') !== hashSeed('ReflectAI'));
t('hash is uint32', hashSeed('x') >= 0 && hashSeed('x') <= 0xffffffff && Number.isInteger(hashSeed('x')));
t('hash accepts non-strings via String()', typeof hashSeed(42) === 'number');

/* ---- isProjectRepo ---- */
t('filters profile repo', !isProjectRepo({ name: 'Tusharkapoor-oop' }));
t('filters site repo', !isProjectRepo({ name: 'Tusharkapoor-oop.github.io' }));
t('filters forks', !isProjectRepo({ name: 'something', fork: true }));
t('filters archived', !isProjectRepo({ name: 'something', archived: true }));
t('keeps normal project', isProjectRepo({ name: 'go-bric' }));
t('rejects empty', !isProjectRepo({}));
t('rejects null', !isProjectRepo(null));
t('custom username respected', !isProjectRepo({ name: 'alice' }, 'alice'));

/* ---- shortLabel ---- */
t('shortLabel never empty', shortLabel('').length >= 1);
t('shortLabel caps length', shortLabel('A_Very_Long_Repository_Name_Indeed').length <= 14);
t('shortLabel uppercases', shortLabel('go-bric').indexOf('GO') === 0);
t('shortLabel deterministic', shortLabel('NPU-Fit-Checker') === shortLabel('NPU-Fit-Checker'));

/* ---- orbitFor ---- */
{
  const n = 13;
  let ok = true;
  for (let i = 0; i < n; i++) {
    const a = orbitFor(i, n, `repo-${i}`);
    if (!(a >= 0 && a < Math.PI * 2)) ok = false;
  }
  t('orbit in [0, 2pi)', ok);
  t('orbit deterministic', orbitFor(3, 13, 'go-bric') === orbitFor(3, 13, 'go-bric'));
  t('orbit differs by name', orbitFor(3, 13, 'go-bric') !== orbitFor(3, 13, 'ReflectAI'));
}

/* ---- radiusFor ---- */
t('radius floor', radiusFor({ stargazers_count: 0, forks_count: 0, size: 0 }) >= 0.35);
t('radius ceiling', radiusFor({ stargazers_count: 100000, forks_count: 99999 }) <= 0.88);
t('radius grows with stars', radiusFor({ stargazers_count: 8 }) > radiusFor({ stargazers_count: 0 }));
t('radius tolerates junk', typeof radiusFor({ stargazers_count: 'x' }) === 'number');

/* ---- hueFor ---- */
{
  let ok = true;
  for (const s of ['a', 'go-bric', 'ReflectAI', '']) {
    const h = hueFor(s);
    if (!(h >= 0 && h < 360 && Number.isInteger(h))) ok = false;
  }
  t('hue in [0,360) integer', ok);
}

/* ---- tagsFor ---- */
t('tags from topics', tagsFor({ topics: ['ai', 'ml'], language: 'Python' }).includes('ai'));
t('tags adds language', tagsFor({ topics: [], language: 'Python' }).includes('python'));
t('tags respects limit', tagsFor({ topics: ['a', 'b', 'c', 'd', 'e', 'f'] }, 4).length === 4);

/* ---- isCacheFresh ---- */
t('null never fresh', !isCacheFresh(null, 1000));
t('fresh inside TTL', isCacheFresh({ ts: 1000, repos: [] }, 1000 + CACHE_TTL_MS - 1));
t('expired at TTL', !isCacheFresh({ ts: 1000, repos: [] }, 1000 + CACHE_TTL_MS));
t('wrong shape rejected', !isCacheFresh({ ts: 1000 }, 1001));
t('repos not array rejected', !isCacheFresh({ ts: 1000, repos: {} }, 1001));

/* ---- planetsFromRepos (purity + mapping) ---- */
const SAMPLE = [
  { name: 'go-bric', description: 'Multi-agent scouting.', language: 'TypeScript', stargazers_count: 4, forks_count: 0, size: 120, topics: ['ai-agents'], pushed_at: '2026-09-01T00:00:00Z', html_url: 'https://github.com/Tusharkapoor-oop/go-bric' },
  { name: 'ReflectAI', description: 'End-of-day reflection.', language: 'Jupyter Notebook', stargazers_count: 4, size: 80, topics: ['journaling'], pushed_at: '2026-08-01T00:00:00Z' },
  { name: 'Tusharkapoor-oop', description: 'profile', language: 'JavaScript' },
  { name: 'Tusharkapoor-oop.github.io', description: 'site', language: 'JavaScript' },
  { name: 'old-fork', fork: true },
];
t('planets filter meta+fork', planetsFromRepos(SAMPLE).length === 2);
t('planets pure (same output twice)', JSON.stringify(planetsFromRepos(SAMPLE)) === JSON.stringify(planetsFromRepos(SAMPLE)));
t('planets null-safe', planetsFromRepos(null).length === 0);
{
  const p = planetsFromRepos(SAMPLE);
  t('planet radius from repo', p[0].radius === radiusFor(SAMPLE[0]));
  t('planet orbit assigned', p[0].orbit === orbitFor(0, 2, 'go-bric'));
  t('planet blurb fallback', planetsFromRepos([{ name: 'new-repo' }])[0].blurb.length > 0);
  t('planet href fallback', planetsFromRepos([{ name: 'new-repo' }])[0].href === 'https://github.com/Tusharkapoor-oop/new-repo');
}

/* ---- loadRepos ladder (injected fakes) ---- */
const mkStorage = (initial = {}) => {
  const m = new Map(Object.entries(initial));
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) };
};
const okJson = (data) => Promise.resolve({ ok: true, json: () => Promise.resolve(data) });
const fail404 = () => Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({}) });
const netErr = () => Promise.reject(new Error('network down'));

{
  /* live succeeds → LIVE + cache written */
  const st = mkStorage();
  const urls = [];
  const f = (u) => { urls.push(u); return okJson(SAMPLE); };
  const r = await loadRepos({ fetchFn: f, storage: st, now: () => 5000 });
  t('live → source LIVE', r.source === 'LIVE');
  t('live → repos array', Array.isArray(r.repos) && r.repos.length === SAMPLE.length);
  t('live → cache written', isCacheFresh(JSON.parse(st.getItem(CACHE_KEY)), 5000));
  t('live → hits API url', urls[0] === API_URL);
}
{
  /* live fails → fresh cache → CACHE */
  const st = mkStorage({ [CACHE_KEY]: JSON.stringify({ ts: 1000, repos: [{ name: 'cached-repo' }] }) });
  const r = await loadRepos({ fetchFn: netErr, storage: st, now: () => 1000 + CACHE_TTL_MS - 10 });
  t('net fail → source CACHE', r.source === 'CACHE');
  t('cache repos returned', r.repos[0].name === 'cached-repo');
}
{
  /* live fails + expired cache → SNAPSHOT */
  const st = mkStorage({ [CACHE_KEY]: JSON.stringify({ ts: 1000, repos: [{ name: 'stale' }] }) });
  const urls = [];
  const f = (u) => { urls.push(u); return u.indexOf('repos.snapshot.json') >= 0 ? okJson({ repos: [{ name: 'snap-repo' }] }) : netErr(); };
  const r = await loadRepos({ fetchFn: f, storage: st, now: () => 1000 + CACHE_TTL_MS + 1 });
  t('expired cache → source SNAPSHOT', r.source === 'SNAPSHOT');
  t('snapshot url requested', urls.some((u) => u.indexOf('repos.snapshot.json') >= 0));
}
{
  /* everything fails → BUILTIN */
  const r = await loadRepos({ fetchFn: netErr, storage: mkStorage(), now: () => 99999999 });
  t('all fail → source BUILTIN', r.source === 'BUILTIN');
  t('builtin repos null', r.repos === null);
}
{
  /* no fetch at all → BUILTIN quickly */
  const r = await loadRepos({ fetchFn: null, storage: mkStorage(), now: () => 0 });
  t('no fetch → BUILTIN', r.source === 'BUILTIN');
}
{
  /* corrupt cache JSON → falls through, no throw */
  const st = mkStorage({ [CACHE_KEY]: '{not json' });
  const r = await loadRepos({ fetchFn: fail404, storage: st, now: () => 0 });
  t('corrupt cache tolerated → BUILTIN', r.source === 'BUILTIN');
}

console.log(`repos.test: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
