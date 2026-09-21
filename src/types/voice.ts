// ==========================================
// AI VOICE ENTRY - STRUCTURED COMMAND TYPES
// Mirrors server/services/ai/voiceCommandSchema.js field-for-field (the
// server is plain ESM/Zod, not TypeScript, so this is a manually-synced
// duplicate - the same pattern server/validation.js already uses against
// src/types/index.ts). These are NOT a second domain model: every field that
// maps onto a real entity uses the exact same name/meaning as the Job /
// BusinessExpense / PersonalExpense / DebtPayment fields in ./index.ts.
// Fields referencing an existing entity (client, job, creditor) are raw
// strings as heard - the AI never resolves or invents an ID. Resolving them
// against the user's real, currently-loaded data happens in
// src/lib/voice/entityMatching.ts, after this command comes back from the
// server and before anything is saved.
// ==========================================

export type VoiceCommandType = 'create_job' | 'business_expense' | 'personal_expense' | 'job_payment' | 'debt' | 'unknown';
export type VoiceCommandConfidence = 'high' | 'medium' | 'low';

export interface VoiceCreateJobData {
  clientNameRaw: string | null;
  title: string | null;
  category: string | null;
  agreedPrice: number | null;
  paidAmountNow: number | null;
  materialCosts: number | null;
  date: string | null;
  notes: string | null;
}

export interface VoiceBusinessExpenseData {
  amount: number | null;
  title: string | null;
  category: string | null;
  date: string | null;
}

export interface VoicePersonalExpenseData {
  amount: number | null;
  title: string | null;
  category: string | null;
  scope: 'household' | 'individual' | null;
  date: string | null;
}

export interface VoiceJobPaymentData {
  clientNameRaw: string | null;
  jobDescriptionRaw: string | null;
  amount: number | null;
  date: string | null;
}

export interface VoiceDebtPaymentData {
  creditorNameRaw: string | null;
  amount: number | null;
  date: string | null;
  notes: string | null;
}

interface VoiceCommandEnvelope {
  missingFields: string[];
  confidence: VoiceCommandConfidence;
  clarificationReason: string | null;
}

export type VoiceCommand =
  | ({ type: 'create_job'; data: VoiceCreateJobData } & VoiceCommandEnvelope)
  | ({ type: 'business_expense'; data: VoiceBusinessExpenseData } & VoiceCommandEnvelope)
  | ({ type: 'personal_expense'; data: VoicePersonalExpenseData } & VoiceCommandEnvelope)
  | ({ type: 'job_payment'; data: VoiceJobPaymentData } & VoiceCommandEnvelope)
  | ({ type: 'debt'; data: VoiceDebtPaymentData } & VoiceCommandEnvelope)
  | ({ type: 'unknown'; data: Record<string, never> } & VoiceCommandEnvelope);

export interface VoiceEntryResponse {
  success: boolean;
  transcript?: string;
  command?: VoiceCommand;
  error?: string;
}
