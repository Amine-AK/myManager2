import { describe, it, expect } from 'vitest';
import { flatExtractionSchema, voiceCommandSchema } from '../voiceCommandSchema.js';

describe('flatExtractionSchema', () => {
  const base = {
    type: 'unknown',
    confidence: 'high',
    clientNameRaw: null,
    jobTitleRaw: null,
    jobCategory: null,
    agreedPrice: null,
    paidAmountNow: null,
    materialCosts: null,
    expenseAmount: null,
    expenseTitle: null,
    expenseCategory: null,
    personalScope: null,
    creditorNameRaw: null,
    jobDescriptionRaw: null,
    paymentAmount: null,
    date: null,
    notes: null,
    missingFields: [],
    clarificationReason: null
  };

  it('accepts a fully-null, minimal valid shape', () => {
    expect(flatExtractionSchema.safeParse(base).success).toBe(true);
  });

  it('rejects an unknown command type', () => {
    expect(flatExtractionSchema.safeParse({ ...base, type: 'delete_all_data' }).success).toBe(false);
  });

  it('rejects a non-enum confidence value', () => {
    expect(flatExtractionSchema.safeParse({ ...base, confidence: 'certain' }).success).toBe(false);
  });

  it('rejects a string where a nullable number is expected', () => {
    expect(flatExtractionSchema.safeParse({ ...base, agreedPrice: '400' }).success).toBe(false);
  });

  it('rejects an invalid personalScope value', () => {
    expect(flatExtractionSchema.safeParse({ ...base, personalScope: 'business' }).success).toBe(false);
  });

  it('rejects a non-array missingFields', () => {
    expect(flatExtractionSchema.safeParse({ ...base, missingFields: 'agreedPrice' }).success).toBe(false);
  });
});

describe('voiceCommandSchema (discriminated union returned to the frontend)', () => {
  it('accepts a valid business_expense command', () => {
    const result = voiceCommandSchema.safeParse({
      type: 'business_expense',
      data: { amount: 70, title: 'Fuel', category: 'Transport & Fuel (Carburant)', date: '2026-09-21' },
      missingFields: [],
      confidence: 'high',
      clarificationReason: null
    });
    expect(result.success).toBe(true);
  });

  it('rejects a command whose data shape does not match its declared type', () => {
    const result = voiceCommandSchema.safeParse({
      type: 'business_expense',
      data: { creditorNameRaw: 'Droguerie Al Amine', amount: 300, date: null, notes: null }, // debt-shaped data
      missingFields: [],
      confidence: 'high',
      clarificationReason: null
    });
    expect(result.success).toBe(false);
  });

  it('rejects an unrecognized type discriminator entirely', () => {
    const result = voiceCommandSchema.safeParse({
      type: 'run_sql',
      data: { query: 'DROP TABLE jobs;' },
      missingFields: [],
      confidence: 'high',
      clarificationReason: null
    });
    expect(result.success).toBe(false);
  });
});
