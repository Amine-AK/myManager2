// ==========================================
// VOICE ENTRY - DOMAIN RECORD BUILDERS
// Turns a confirmed voice command (already matched against real entities by
// entityMatching.ts and edited/approved by the user in the confirmation UI)
// into the exact same objects the manual quick-entry modals build, using the
// exact same id-prefix conventions and payment/status logic as
// QuickJobModal.tsx / QuickExpenseModal.tsx / QuickDebtPaymentModal.tsx /
// JobsView.tsx's 1-tap collect-payment handler.
//
// These are pure functions - no repository calls, no side effects - so the
// confirmation UI (or a test) can build the record and then hand it to the
// EXACT same repository methods manual entry already uses
// (repository.saveJob, repository.collectJobPayment, etc.). This file never
// computes financial totals itself; paidAmount/remainingBalance are always
// left to the repository, which recomputes them from the payment ledger.
// ==========================================

import type {
  Job,
  JobActivityLog,
  JobPaymentCollectionRequest,
  BusinessExpense,
  PersonalExpense,
  DebtPayment,
  DebtObligation,
  BusinessExpenseCategory,
  PersonalExpenseCategory
} from '../../types';
import { CATEGORIES } from '../jobOptions';
import {
  BUSINESS_EXPENSE_CATEGORIES,
  HOUSEHOLD_EXPENSE_CATEGORIES,
  INDIVIDUAL_EXPENSE_CATEGORIES
} from '../expenseOptions';
import type { VoiceCreateJobData, VoiceBusinessExpenseData, VoicePersonalExpenseData } from '../../types/voice';

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function todayIso(): string {
  return new Date().toISOString().split('T')[0];
}

/** Falls back to today when the AI didn't extract a valid ISO date. */
export function resolveDate(voiceDate: string | null | undefined): string {
  return voiceDate && ISO_DATE_RE.test(voiceDate) ? voiceDate : todayIso();
}

/** Falls back to the first known category when the AI's value isn't one of the app's real categories. */
function resolveJobCategory(category: string | null | undefined): string {
  return category && CATEGORIES.includes(category as (typeof CATEGORIES)[number]) ? category : CATEGORIES[0];
}

function resolveBusinessCategory(category: string | null | undefined): BusinessExpenseCategory {
  return (BUSINESS_EXPENSE_CATEGORIES as readonly string[]).includes(category || '')
    ? (category as BusinessExpenseCategory)
    : 'Other Business Expense';
}

function resolvePersonalCategory(category: string | null | undefined, scope: 'household' | 'individual' | null): PersonalExpenseCategory {
  const pool = scope === 'individual' ? INDIVIDUAL_EXPENSE_CATEGORIES : HOUSEHOLD_EXPENSE_CATEGORIES;
  if (category && (pool as readonly string[]).includes(category)) return category as PersonalExpenseCategory;
  // Category didn't land in the scope the AI reported (or scope was null) - fall back by
  // checking both pools before defaulting, so a correct category isn't discarded over a scope guess.
  if (category && (HOUSEHOLD_EXPENSE_CATEGORIES as readonly string[]).includes(category)) return category as PersonalExpenseCategory;
  if (category && (INDIVIDUAL_EXPENSE_CATEGORIES as readonly string[]).includes(category)) return category as PersonalExpenseCategory;
  return scope === 'individual' ? 'Other Personal Expense' : 'Other Household Expense';
}

export interface BuiltJob {
  job: Job;
  paymentRequest: JobPaymentCollectionRequest | null;
}

/**
 * Mirrors QuickJobModal.handleSubmit exactly: the job is always saved with
 * paidAmount 0, and an initial cash payment (if any) is recorded immediately
 * after through the same atomic collectJobPayment path used everywhere else,
 * so paidAmount is never set from anywhere but the payment ledger.
 */
export function buildJobFromVoiceData(data: VoiceCreateJobData, resolvedClientName: string): BuiltJob {
  const agreedPrice = data.agreedPrice ?? 0;
  const paidNow = data.paidAmountNow ?? 0;
  const materialCosts = data.materialCosts ?? 0;
  const date = resolveDate(data.date);
  const category = resolveJobCategory(data.category);
  const clientName = resolvedClientName.trim() || 'Client (Direct)';

  const initialStatus: Job['status'] = paidNow > 0 ? 'in_progress' : 'quoted';

  const job: Job = {
    id: `job-${Date.now()}`,
    title: (data.title || '').trim() || `${category} - ${clientName}`,
    clientName,
    category,
    status: initialStatus,
    agreedPrice,
    paidAmount: 0,
    materialCosts,
    startDate: date,
    notes: data.notes || undefined,
    daysSpent: 1,
    daysPaused: 0,
    logs: [
      {
        id: `log-${Date.now()}`,
        timestamp: date,
        status: initialStatus,
        note: 'Job created via AI voice entry'
      }
    ]
  };

  let paymentRequest: JobPaymentCollectionRequest | null = null;
  if (paidNow > 0) {
    const finalStatus: Job['status'] = paidNow >= agreedPrice ? 'paid' : 'in_progress';
    const logEntry: JobActivityLog = {
      id: `log-${Date.now()}-pay`,
      timestamp: date,
      status: finalStatus,
      note: `Payment collected: +${paidNow} MAD (Total paid: ${Math.min(paidNow, agreedPrice)} MAD) via AI voice entry`
    };
    paymentRequest = {
      payment: { id: `jpay-${Date.now()}`, amount: paidNow, date },
      jobUpdate: { status: finalStatus, completedDate: finalStatus === 'paid' ? date : undefined, logEntry }
    };
  }

  return { job, paymentRequest };
}

export function buildBusinessExpenseFromVoiceData(data: VoiceBusinessExpenseData): BusinessExpense {
  const category = resolveBusinessCategory(data.category);
  return {
    id: `exp-${Date.now()}`,
    title: (data.title || '').trim() || category,
    amount: data.amount ?? 0,
    category,
    date: resolveDate(data.date)
  };
}

export function buildPersonalExpenseFromVoiceData(data: VoicePersonalExpenseData): PersonalExpense {
  const category = resolvePersonalCategory(data.category, data.scope);
  return {
    id: `exp-${Date.now()}`,
    title: (data.title || '').trim() || category,
    amount: data.amount ?? 0,
    category,
    date: resolveDate(data.date)
  };
}

/**
 * Mirrors JobsView.handleCollectPayment exactly: paidAmount is only ever an
 * estimate used for the log note and the "did this reach full payment"
 * status check - the repository recomputes the authoritative paidAmount
 * from the payment ledger inside collectJobPayment.
 */
export function buildJobPaymentRequest(job: Job, amount: number, voiceDate: string | null | undefined): JobPaymentCollectionRequest {
  const date = resolveDate(voiceDate);
  const estimatedNewPaid = Math.min(job.agreedPrice, (job.paidAmount || 0) + amount);
  let status = job.status;
  if (estimatedNewPaid >= job.agreedPrice && status !== 'revision_requested') {
    status = 'paid';
  }

  return {
    payment: { id: `jpay-${Date.now()}`, amount, date },
    jobUpdate: {
      status,
      completedDate: status === 'paid' ? date : job.completedDate,
      logEntry: {
        id: `log-${Date.now()}`,
        timestamp: date,
        status,
        note: `Payment collected: +${amount} MAD (Total paid: ${estimatedNewPaid} MAD) via AI voice entry`
      }
    }
  };
}

export function buildDebtPaymentFromVoiceData(debt: DebtObligation, amount: number, voiceDate: string | null | undefined, notes: string | null | undefined): DebtPayment {
  return {
    id: `dpay-${Date.now()}`,
    debtId: debt.id,
    amount,
    date: resolveDate(voiceDate),
    notes: notes?.trim() || undefined
  };
}
