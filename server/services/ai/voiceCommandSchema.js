import { z } from 'zod';

// ==========================================
// VOICE ENTRY - STRUCTURED OUTPUT VALIDATION
// AI output is UNTRUSTED INPUT, validated exactly like a manual API request
// body (see server/validation.js). Two layers:
//   1. `flatExtractionSchema` validates the raw JSON the model returns
//      (a single flat shape covering every command type - see comment below).
//   2. `voiceCommandSchema` validates the narrowed { type, data } command
//      this module projects the flat shape into, which is what the
//      /api/ai/voice-entry endpoint actually returns to the frontend.
// Nothing here saves data or touches the database - it only decides whether
// the AI's JSON is well-formed enough to show the user a confirmation card.
// ==========================================

const CONFIDENCE = z.enum(['high', 'medium', 'low']);
const nullableString = z.string().nullable();
const nullableNumber = z.number().finite().nullable();

// A single flat object is used for the model's structured output instead of
// a JSON-Schema union, because OpenAI's strict structured-outputs mode does
// not support a `oneOf`/`anyOf` at the root and nested unions are brittle in
// practice. Every field the model might need across all five command types
// lives here (nullable); `projectFlatToVoiceCommand` below narrows it down
// to the real per-type shape.
export const flatExtractionSchema = z.object({
  type: z.enum(['create_job', 'business_expense', 'personal_expense', 'job_payment', 'debt', 'unknown']),
  confidence: CONFIDENCE,
  clientNameRaw: nullableString,
  jobTitleRaw: nullableString,
  jobCategory: nullableString,
  agreedPrice: nullableNumber,
  paidAmountNow: nullableNumber,
  materialCosts: nullableNumber,
  expenseAmount: nullableNumber,
  expenseTitle: nullableString,
  expenseCategory: nullableString,
  personalScope: z.enum(['household', 'individual']).nullable(),
  creditorNameRaw: nullableString,
  jobDescriptionRaw: nullableString,
  paymentAmount: nullableNumber,
  date: nullableString,
  notes: nullableString,
  missingFields: z.array(z.string()),
  clarificationReason: nullableString
});

const createJobDataSchema = z.object({
  clientNameRaw: nullableString,
  title: nullableString,
  category: nullableString,
  agreedPrice: nullableNumber,
  paidAmountNow: nullableNumber,
  materialCosts: nullableNumber,
  date: nullableString,
  notes: nullableString
});

const businessExpenseDataSchema = z.object({
  amount: nullableNumber,
  title: nullableString,
  category: nullableString,
  date: nullableString
});

const personalExpenseDataSchema = z.object({
  amount: nullableNumber,
  title: nullableString,
  category: nullableString,
  scope: z.enum(['household', 'individual']).nullable(),
  date: nullableString
});

const jobPaymentDataSchema = z.object({
  clientNameRaw: nullableString,
  jobDescriptionRaw: nullableString,
  amount: nullableNumber,
  date: nullableString
});

const debtPaymentDataSchema = z.object({
  creditorNameRaw: nullableString,
  amount: nullableNumber,
  date: nullableString,
  notes: nullableString
});

const commonEnvelope = {
  missingFields: z.array(z.string()),
  confidence: CONFIDENCE,
  clarificationReason: nullableString
};

export const voiceCommandSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('create_job'), data: createJobDataSchema, ...commonEnvelope }),
  z.object({ type: z.literal('business_expense'), data: businessExpenseDataSchema, ...commonEnvelope }),
  z.object({ type: z.literal('personal_expense'), data: personalExpenseDataSchema, ...commonEnvelope }),
  z.object({ type: z.literal('job_payment'), data: jobPaymentDataSchema, ...commonEnvelope }),
  z.object({ type: z.literal('debt'), data: debtPaymentDataSchema, ...commonEnvelope }),
  z.object({ type: z.literal('unknown'), data: z.object({}), ...commonEnvelope })
]);
