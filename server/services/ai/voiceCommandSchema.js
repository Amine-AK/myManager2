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
// .nullish() (not .nullable()) because Gemini's structured output may omit
// an inapplicable field entirely rather than emit an explicit `null` for it
// - both mean the same thing here, so both are accepted.
const nullableString = z.string().nullish();
const nullableNumber = z.number().finite().nullish();

// A single flat object is used for the model's structured output instead of
// a JSON-Schema union, because structured-output modes across providers
// (Gemini's responseSchema included) handle root-level oneOf/anyOf and
// nested unions inconsistently or not at all. Every field the model might
// need across all five command types lives here (nullable); this schema
// stays provider-agnostic - see server/services/ai/dataExtraction.js for
// how it's translated into the current provider's schema dialect.
// `projectFlatToVoiceCommand` below narrows the flat shape down to the real
// per-type shape.
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
  personalScope: z.enum(['household', 'individual']).nullish(),
  creditorNameRaw: nullableString,
  jobDescriptionRaw: nullableString,
  paymentAmount: nullableNumber,
  date: nullableString,
  notes: nullableString,
  missingFields: z.array(z.string()),
  clarificationReason: nullableString
});

// .strict() matters here: since every field below is individually optional
// (nullish), a non-strict object would happily validate against the WRONG
// per-type schema too (e.g. a debt payload has no fields a business_expense
// schema requires, so without .strict() it would pass as one, just with its
// real fields silently stripped). .strict() rejects any key that isn't in
// that type's declared shape, which is what actually makes the
// discriminated union below catch a type/data mismatch.
const createJobDataSchema = z
  .object({
    clientNameRaw: nullableString,
    title: nullableString,
    category: nullableString,
    agreedPrice: nullableNumber,
    paidAmountNow: nullableNumber,
    materialCosts: nullableNumber,
    date: nullableString,
    notes: nullableString
  })
  .strict();

const businessExpenseDataSchema = z
  .object({
    amount: nullableNumber,
    title: nullableString,
    category: nullableString,
    date: nullableString
  })
  .strict();

const personalExpenseDataSchema = z
  .object({
    amount: nullableNumber,
    title: nullableString,
    category: nullableString,
    scope: z.enum(['household', 'individual']).nullish(),
    date: nullableString
  })
  .strict();

const jobPaymentDataSchema = z
  .object({
    clientNameRaw: nullableString,
    jobDescriptionRaw: nullableString,
    amount: nullableNumber,
    date: nullableString
  })
  .strict();

const debtPaymentDataSchema = z
  .object({
    creditorNameRaw: nullableString,
    amount: nullableNumber,
    date: nullableString,
    notes: nullableString
  })
  .strict();

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
  z.object({ type: z.literal('unknown'), data: z.object({}).strict(), ...commonEnvelope })
]);
