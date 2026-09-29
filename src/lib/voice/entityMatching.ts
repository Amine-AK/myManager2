// ==========================================
// VOICE ENTRY - DETERMINISTIC ENTITY MATCHING
// The AI never picks which existing client/job/debt a voice command refers
// to (see server/services/ai/dataExtraction.js) - it only returns the raw
// name as heard. Matching that name against the user's REAL, currently
// loaded data (clients/jobs/debts already in React state from IndexedDB,
// including anything not yet synced to the backend) happens here, in plain
// deterministic code, so nothing is ever guessed by the model.
//
// Pure functions only - no I/O - fully unit testable.
// ==========================================

import type { Client, Job, DebtObligation } from '../../types';

export interface MatchCandidate<T> {
  item: T;
  score: number; // 0..1, 1 = exact normalized match
}

export interface ClassifiedMatches<T> {
  confident: MatchCandidate<T>[]; // score >= CONFIDENT_THRESHOLD - safe to auto-select if exactly one
  possible: MatchCandidate<T>[]; // score >= POSSIBLE_THRESHOLD but below confident - worth offering, never auto-selected
}

const CONFIDENT_THRESHOLD = 0.82;
const POSSIBLE_THRESHOLD = 0.45;

function normalize(value: string | null | undefined): string {
  if (!value) return '';
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // strip accents/diacritics
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

function tokenize(value: string): string[] {
  return normalize(value).split(' ').filter(Boolean);
}

/** Jaccard token overlap in [0,1]. */
function tokenOverlapScore(a: string, b: string): number {
  const tokensA = new Set(tokenize(a));
  const tokensB = new Set(tokenize(b));
  if (tokensA.size === 0 || tokensB.size === 0) return 0;
  let intersection = 0;
  for (const t of tokensA) {
    if (tokensB.has(t)) intersection++;
  }
  const union = new Set([...tokensA, ...tokensB]).size;
  return union === 0 ? 0 : intersection / union;
}

/**
 * Similarity score in [0,1] between a spoken name and a stored name.
 * Exact normalized equality wins outright; otherwise a prefix/substring
 * relationship (common when the AI mishears a full name as a first name)
 * scores highly; otherwise falls back to token overlap.
 */
export function nameSimilarity(query: string | null | undefined, candidate: string | null | undefined): number {
  const a = normalize(query);
  const b = normalize(candidate);
  if (!a || !b) return 0;
  if (a === b) return 1;
  if (b.startsWith(a) || a.startsWith(b)) return 0.9;
  if (b.includes(a) || a.includes(b)) return 0.75;
  return tokenOverlapScore(a, b);
}

export function classifyMatches<T>(candidates: MatchCandidate<T>[]): ClassifiedMatches<T> {
  const sorted = [...candidates].sort((x, y) => y.score - x.score);
  return {
    confident: sorted.filter(c => c.score >= CONFIDENT_THRESHOLD),
    possible: sorted.filter(c => c.score >= POSSIBLE_THRESHOLD && c.score < CONFIDENT_THRESHOLD)
  };
}

/** Distinct client names actually used across jobs, deduped case-insensitively (kept in first-seen casing). */
function distinctClientNamesFromJobs(jobs: Job[]): string[] {
  const seen = new Map<string, string>();
  for (const job of jobs) {
    const key = normalize(job.clientName);
    if (key && !seen.has(key)) seen.set(key, job.clientName);
  }
  return Array.from(seen.values());
}

export function matchClientsByName(query: string | null | undefined, clients: Client[]): MatchCandidate<Client>[] {
  if (!query) return [];
  return clients
    .map(item => ({ item, score: nameSimilarity(query, item.name) }))
    .filter(c => c.score >= POSSIBLE_THRESHOLD)
    .sort((a, b) => b.score - a.score);
}

/**
 * Matches an existing OPEN job for a job_payment voice command. Scores are
 * dominated by client-name similarity; when a job description was also
 * heard (e.g. "the TV repair"), title/category similarity nudges the score.
 * Jobs that are already fully paid are still returned (never hidden - the
 * user may legitimately want to log an extra payment), just not favored.
 */
export function matchJobsForPayment(
  clientNameQuery: string | null | undefined,
  jobDescriptionQuery: string | null | undefined,
  jobs: Job[]
): MatchCandidate<Job>[] {
  if (!clientNameQuery) return [];
  return jobs
    .map(job => {
      const clientScore = nameSimilarity(clientNameQuery, job.clientName);
      const descScore = jobDescriptionQuery
        ? Math.max(nameSimilarity(jobDescriptionQuery, job.title), nameSimilarity(jobDescriptionQuery, job.category))
        : 0;
      let score = clientScore * (jobDescriptionQuery ? 0.7 : 1) + descScore * (jobDescriptionQuery ? 0.3 : 0);
      const hasBalance = job.agreedPrice - job.paidAmount > 0.01;
      if (hasBalance) score = Math.min(1, score + 0.03);
      return { item: job, score };
    })
    .filter(c => c.score >= POSSIBLE_THRESHOLD)
    .sort((a, b) => b.score - a.score);
}

export function matchDebtsByCreditor(query: string | null | undefined, debts: DebtObligation[]): MatchCandidate<DebtObligation>[] {
  if (!query) return [];
  return debts
    .filter(d => d.status === 'active')
    .map(item => ({ item, score: nameSimilarity(query, item.creditor) }))
    .filter(c => c.score >= POSSIBLE_THRESHOLD)
    .sort((a, b) => b.score - a.score);
}

/**
 * For create_job: decides whether the spoken client name should reuse an
 * existing client's canonical spelling (to avoid creating a near-duplicate
 * client record) or is confidently new. Checks both the Client directory and
 * the client names actually used on jobs, since either can be the more
 * complete/accurate source depending on how the record was created.
 */
export function resolveClientNameForNewJob(
  clientNameQuery: string | null | undefined,
  clients: Client[],
  jobs: Job[]
): { status: 'exact' | 'ambiguous' | 'new' | 'empty'; canonicalName?: string; candidates: MatchCandidate<string>[] } {
  if (!clientNameQuery || !clientNameQuery.trim()) {
    return { status: 'empty', candidates: [] };
  }

  const pool = new Set<string>([...clients.map(c => c.name), ...distinctClientNamesFromJobs(jobs)]);
  const candidates: MatchCandidate<string>[] = Array.from(pool)
    .map(name => ({ item: name, score: nameSimilarity(clientNameQuery, name) }))
    .filter(c => c.score >= POSSIBLE_THRESHOLD)
    .sort((a, b) => b.score - a.score);

  const { confident } = classifyMatches(candidates);
  if (confident.length === 1) {
    return { status: 'exact', canonicalName: confident[0].item, candidates };
  }
  if (confident.length > 1) {
    return { status: 'ambiguous', candidates };
  }
  if (candidates.length > 0) {
    return { status: 'ambiguous', candidates };
  }
  return { status: 'new', candidates: [] };
}
