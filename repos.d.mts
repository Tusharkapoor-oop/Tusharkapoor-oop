/* Type declarations for the Phase B data layer (repos.mjs).
 * Keeps src/ in strict TypeScript without duplicating runtime code. */

export interface RepoRecord {
  name: string;
  fork?: boolean;
  archived?: boolean;
  description?: string | null;
  html_url?: string;
  stargazers_count?: number;
  forks_count?: number;
  size?: number;
  language?: string | null;
  topics?: string[];
  pushed_at?: string;
}

export interface RepoPlanet {
  name: string;
  slug: string;
  short: string;
  blurb: string;
  tags: string[];
  href: string;
  stars: number;
  language: string;
  pushedAt: string;
  /** visual radius 0.35..0.88 */
  radius: number;
  /** orbital phase 0..2π */
  orbit: number;
  /** 0..360 */
  hue: number;
}

export type RepoSource = 'LIVE' | 'CACHE' | 'SNAPSHOT' | 'BUILTIN';

export interface RepoLoadResult {
  repos: RepoRecord[] | null;
  source: RepoSource;
}

export interface RepoLoadOpts {
  fetchFn?: typeof fetch | null;
  storage?: Storage | null;
  now?: () => number;
  snapshotUrl?: string;
  timeoutMs?: number;
}

export function hashSeed(value: unknown): number;
export function isProjectRepo(repo: RepoRecord | null, username?: string): boolean;
export function shortLabel(name: unknown): string;
export function hueFor(name: string): number;
export function radiusFor(repo: RepoRecord | null, min?: number, max?: number): number;
export function orbitFor(i: number, n: number, name: string): number;
export function tagsFor(repo: RepoRecord | null, limit?: number): string[];
export function planetsFromRepos(repos: RepoRecord[] | null, username?: string): RepoPlanet[];
export function loadRepos(opts?: RepoLoadOpts): Promise<RepoLoadResult>;

export const USERNAME: string;
export const CACHE_TTL_MS: number;
export const FETCH_TIMEOUT_MS: number;
