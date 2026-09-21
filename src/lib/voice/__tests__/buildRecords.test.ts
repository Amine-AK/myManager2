import { describe, it, expect } from 'vitest';
import type { Job, DebtObligation } from '../../../types';
import {
  buildJobFromVoiceData,
  buildBusinessExpenseFromVoiceData,
  buildPersonalExpenseFromVoiceData,
  buildJobPaymentRequest,
  buildDebtPaymentFromVoiceData
} from '../buildRecords';

// These tests verify that a CONFIRMED voice command produces exactly the
// shape of object the manual quick-entry modals build (QuickJobModal.tsx,
// QuickExpenseModal.tsx, QuickDebtPaymentModal.tsx, JobsView.tsx's 1-tap
// collect-payment handler), so the confirmation UI can hand them to the
// SAME repository methods (repository.saveJob, repository.collectJobPayment,
// etc.) manual entry already uses - no parallel save path is introduced.

describe('buildJobFromVoiceData', () => {
  it('always creates the job with paidAmount 0, exactly like QuickJobModal', () => {
    const { job, paymentRequest } = buildJobFromVoiceData(
      { clientNameRaw: 'Hassan', title: 'TV repair', category: 'TV Repair', agreedPrice: 400, paidAmountNow: null, materialCosts: null, date: '2026-09-21', notes: null },
      'Hassan'
    );
    expect(job.paidAmount).toBe(0);
    expect(job.agreedPrice).toBe(400);
    expect(job.status).toBe('quoted');
    expect(paymentRequest).toBeNull();
  });

  it('records a partial initial payment through a collectJobPayment-shaped request, not by setting paidAmount directly', () => {
    const { job, paymentRequest } = buildJobFromVoiceData(
      { clientNameRaw: 'Hassan', title: 'TV repair', category: 'TV Repair', agreedPrice: 400, paidAmountNow: 200, materialCosts: 50, date: '2026-09-21', notes: null },
      'Hassan'
    );
    expect(job.status).toBe('in_progress'); // paidNow > 0 at creation time
    expect(job.paidAmount).toBe(0); // never set directly - only the ledger sets it
    expect(paymentRequest).not.toBeNull();
    expect(paymentRequest!.payment.amount).toBe(200);
    expect(paymentRequest!.jobUpdate.status).toBe('in_progress'); // 200 < 400
  });

  it('marks the job paid and sets completedDate when the initial payment covers the full price', () => {
    const { paymentRequest } = buildJobFromVoiceData(
      { clientNameRaw: 'Hassan', title: 'TV repair', category: 'TV Repair', agreedPrice: 400, paidAmountNow: 400, materialCosts: null, date: '2026-09-21', notes: null },
      'Hassan'
    );
    expect(paymentRequest!.jobUpdate.status).toBe('paid');
    expect(paymentRequest!.jobUpdate.completedDate).toBe('2026-09-21');
  });

  it('falls back to a known category when the AI category is not one of the app\'s real categories', () => {
    const { job } = buildJobFromVoiceData(
      { clientNameRaw: 'Hassan', title: null, category: 'Something Invented', agreedPrice: 400, paidAmountNow: null, materialCosts: null, date: null, notes: null },
      'Hassan'
    );
    expect(job.category).toBe('CCTV Installation'); // CATEGORIES[0]
  });

  it('falls back to today when no date is given', () => {
    const { job } = buildJobFromVoiceData(
      { clientNameRaw: 'Hassan', title: null, category: null, agreedPrice: 400, paidAmountNow: null, materialCosts: null, date: null, notes: null },
      'Hassan'
    );
    expect(job.startDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('buildBusinessExpenseFromVoiceData', () => {
  it('uses the AI category when it is valid', () => {
    const exp = buildBusinessExpenseFromVoiceData({ amount: 70, title: 'Fuel', category: 'Transport & Fuel (Carburant)', date: '2026-09-21' });
    expect(exp.category).toBe('Transport & Fuel (Carburant)');
    expect(exp.amount).toBe(70);
    expect(exp.id).toMatch(/^exp-/);
  });

  it('falls back to "Other Business Expense" for an invalid category instead of inventing one', () => {
    const exp = buildBusinessExpenseFromVoiceData({ amount: 70, title: null, category: 'Not A Real Category', date: null });
    expect(exp.category).toBe('Other Business Expense');
    expect(exp.title).toBe('Other Business Expense'); // falls back to category when no title heard
  });
});

describe('buildPersonalExpenseFromVoiceData', () => {
  it('picks a category from the household pool when scope is household', () => {
    const exp = buildPersonalExpenseFromVoiceData({ amount: 100, title: 'Groceries', category: 'Food & Groceries (Alimentation)', scope: 'household', date: '2026-09-21' });
    expect(exp.category).toBe('Food & Groceries (Alimentation)');
  });

  it('picks a category from the individual pool when scope is individual', () => {
    const exp = buildPersonalExpenseFromVoiceData({ amount: 15, title: 'Café', category: 'Café & Snacks (Café / Thé / Snacks)', scope: 'individual', date: '2026-09-21' });
    expect(exp.category).toBe('Café & Snacks (Café / Thé / Snacks)');
  });

  it('never invents a category - falls back to a safe "Other" bucket for the reported scope', () => {
    const exp = buildPersonalExpenseFromVoiceData({ amount: 15, title: null, category: null, scope: 'individual', date: null });
    expect(exp.category).toBe('Other Personal Expense');
  });
});

describe('buildJobPaymentRequest', () => {
  const openJob: Job = {
    id: 'job-1',
    title: 'TV Repair',
    clientName: 'Hassan',
    category: 'TV Repair',
    status: 'in_progress',
    agreedPrice: 1000,
    paidAmount: 700,
    materialCosts: 0,
    startDate: '2026-09-01'
  };

  it('marks the job paid once the ledger total reaches the agreed price, mirroring JobsView.handleCollectPayment', () => {
    const request = buildJobPaymentRequest(openJob, 300, '2026-09-21');
    expect(request.payment.amount).toBe(300);
    expect(request.jobUpdate.status).toBe('paid');
    expect(request.jobUpdate.completedDate).toBe('2026-09-21');
  });

  it('never marks a job under revision as paid, even if the balance is covered', () => {
    const revisionJob: Job = { ...openJob, status: 'revision_requested' };
    const request = buildJobPaymentRequest(revisionJob, 300, '2026-09-21');
    expect(request.jobUpdate.status).toBe('revision_requested');
  });

  it('keeps the job in progress when the payment is only partial', () => {
    const request = buildJobPaymentRequest(openJob, 100, '2026-09-21');
    expect(request.jobUpdate.status).toBe('in_progress');
    expect(request.jobUpdate.completedDate).toBeUndefined();
  });
});

describe('buildDebtPaymentFromVoiceData', () => {
  const debt: DebtObligation = {
    id: 'debt-1',
    creditor: 'Droguerie Al Amine',
    type: 'business_supplier',
    totalAmount: 2000,
    remainingBalance: 800,
    status: 'active'
  };

  it('builds a DebtPayment referencing the resolved debt id, like QuickDebtPaymentModal', () => {
    const payment = buildDebtPaymentFromVoiceData(debt, 300, '2026-09-21', 'Cash at the shop');
    expect(payment.id).toMatch(/^dpay-/);
    expect(payment.debtId).toBe('debt-1');
    expect(payment.amount).toBe(300);
    expect(payment.notes).toBe('Cash at the shop');
  });

  it('leaves notes undefined rather than an empty string when none were heard', () => {
    const payment = buildDebtPaymentFromVoiceData(debt, 300, '2026-09-21', null);
    expect(payment.notes).toBeUndefined();
  });
});
