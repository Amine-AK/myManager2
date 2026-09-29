import { describe, it, expect } from 'vitest';
import type { Client, Job, DebtObligation } from '../../../types';
import {
  nameSimilarity,
  classifyMatches,
  matchClientsByName,
  matchJobsForPayment,
  matchDebtsByCreditor,
  resolveClientNameForNewJob
} from '../entityMatching';

// This is the disambiguation scenario from the feature spec:
// "Hassan paid me 300." with two clients named Hassan -> the app must ask
// which one, never guess.
const twoHassans: Client[] = [
  { id: 'cli-1', name: 'Hassan El Amrani' },
  { id: 'cli-2', name: 'Hassan Benali' },
  { id: 'cli-3', name: 'Fatima Zahra' }
];

describe('nameSimilarity', () => {
  it('scores an exact (case/accent-insensitive) match as 1', () => {
    expect(nameSimilarity('hassan benali', 'Hassan Benali')).toBe(1);
    expect(nameSimilarity('Été', 'ete')).toBe(1);
  });

  it('scores a prefix relationship highly but not as an exact match', () => {
    const score = nameSimilarity('Hassan', 'Hassan El Amrani');
    expect(score).toBeGreaterThanOrEqual(0.82);
    expect(score).toBeLessThan(1);
  });

  it('scores unrelated names low', () => {
    expect(nameSimilarity('Hassan', 'Fatima Zahra')).toBeLessThan(0.45);
  });
});

describe('matchClientsByName - ambiguous match disambiguation', () => {
  it('returns both Hassans as confident candidates, never auto-picking one', () => {
    const matches = matchClientsByName('Hassan', twoHassans);
    const { confident } = classifyMatches(matches);
    expect(confident.map(c => c.item.name).sort()).toEqual(['Hassan Benali', 'Hassan El Amrani']);
  });

  it('resolves to a single confident match on an exact full-name match', () => {
    const matches = matchClientsByName('Hassan Benali', twoHassans);
    const { confident } = classifyMatches(matches);
    expect(confident).toHaveLength(1);
    expect(confident[0].item.name).toBe('Hassan Benali');
  });

  it('returns no candidates for a name that does not exist', () => {
    expect(matchClientsByName('Zineb Alaoui', twoHassans)).toEqual([]);
  });

  it('returns no candidates for a null/empty query', () => {
    expect(matchClientsByName(null, twoHassans)).toEqual([]);
    expect(matchClientsByName('', twoHassans)).toEqual([]);
  });
});

describe('matchJobsForPayment', () => {
  const jobs: Job[] = [
    {
      id: 'job-1',
      title: 'TV Repair',
      clientName: 'Hassan El Amrani',
      category: 'TV Repair',
      status: 'in_progress',
      agreedPrice: 400,
      paidAmount: 0,
      materialCosts: 0,
      startDate: '2026-09-01'
    },
    {
      id: 'job-2',
      title: 'Camera Install',
      clientName: 'Hassan Benali',
      category: 'CCTV Installation',
      status: 'in_progress',
      agreedPrice: 1500,
      paidAmount: 500,
      materialCosts: 200,
      startDate: '2026-09-05'
    }
  ];

  it('is ambiguous between two open jobs when only a shared first name is heard', () => {
    const { confident } = classifyMatches(matchJobsForPayment('Hassan', null, jobs));
    expect(confident).toHaveLength(2);
  });

  it('narrows to a single confident job once a matching job description is also heard', () => {
    const { confident } = classifyMatches(matchJobsForPayment('Hassan', 'TV repair', jobs));
    expect(confident).toHaveLength(1);
    expect(confident[0].item.id).toBe('job-1');
  });

  it('returns nothing for a client with no jobs at all', () => {
    expect(matchJobsForPayment('Zineb', null, jobs)).toEqual([]);
  });
});

describe('matchDebtsByCreditor', () => {
  const debts: DebtObligation[] = [
    { id: 'debt-1', creditor: 'Droguerie Al Amine', type: 'business_supplier', totalAmount: 2000, remainingBalance: 800, status: 'active' },
    { id: 'debt-2', creditor: 'Banque Populaire Micro', type: 'personal_loan', totalAmount: 5000, remainingBalance: 5000, status: 'active' },
    { id: 'debt-3', creditor: 'Old Paid Off Supplier', type: 'business_supplier', totalAmount: 100, remainingBalance: 0, status: 'paid_off' }
  ];

  it('matches an active debt by creditor name', () => {
    const { confident } = classifyMatches(matchDebtsByCreditor('Droguerie Al Amine', debts));
    expect(confident).toHaveLength(1);
    expect(confident[0].item.id).toBe('debt-1');
  });

  it('excludes debts that are already paid off', () => {
    expect(matchDebtsByCreditor('Old Paid Off Supplier', debts)).toEqual([]);
  });
});

describe('resolveClientNameForNewJob', () => {
  it('reuses the canonical spelling of an existing client on a confident match', () => {
    const result = resolveClientNameForNewJob('hassan el amrani', twoHassans, []);
    expect(result.status).toBe('exact');
    expect(result.canonicalName).toBe('Hassan El Amrani');
  });

  it('asks the user when the spoken name could be more than one existing client', () => {
    const result = resolveClientNameForNewJob('Hassan', twoHassans, []);
    expect(result.status).toBe('ambiguous');
    expect(result.candidates.length).toBeGreaterThanOrEqual(2);
  });

  it('treats a name with no match as a genuinely new client', () => {
    const result = resolveClientNameForNewJob('Zineb Alaoui', twoHassans, []);
    expect(result.status).toBe('new');
  });

  it('treats an empty spoken name as empty rather than guessing', () => {
    expect(resolveClientNameForNewJob(null, twoHassans, []).status).toBe('empty');
    expect(resolveClientNameForNewJob('   ', twoHassans, []).status).toBe('empty');
  });
});
