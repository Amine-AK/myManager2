import {
  JOB_CATEGORIES,
  BUSINESS_EXPENSE_CATEGORIES,
  HOUSEHOLD_EXPENSE_CATEGORIES,
  INDIVIDUAL_EXPENSE_CATEGORIES
} from './domainConstants.js';
import { flatExtractionSchema, voiceCommandSchema } from './voiceCommandSchema.js';

// ==========================================
// AI SERVICE - STRUCTURED DATA EXTRACTION
// Provider-specific code isolated to this file (OpenAI Chat Completions,
// structured outputs / json_schema strict mode). Swapping providers later
// only requires changing this module - callers only ever see a validated
// VoiceCommand, never provider-specific response shapes.
//
// The AI is a data-extraction engine only: it never sees the database, never
// receives credentials, and never chooses what to save. It returns raw
// strings for client/job/creditor references (e.g. clientNameRaw) instead of
// IDs; matching those against the user's real clients/jobs/debts happens
// deterministically in the frontend (src/lib/voice/entityMatching.ts)
// against locally-loaded data, not inside the AI.
// ==========================================

const OPENAI_CHAT_URL = 'https://api.openai.com/v1/chat/completions';
const EXTRACTION_TIMEOUT_MS = 20000;
const MODEL = process.env.OPENAI_EXTRACTION_MODEL || 'gpt-4o-mini';

// A flat schema (see voiceCommandSchema.js for why) with every field
// nullable. OpenAI's strict structured-outputs mode requires every property
// to be listed in `required` and objects to set additionalProperties:false;
// "optional" is expressed by allowing `null` as a value, not by omission.
const FLAT_RESPONSE_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    type: { type: 'string', enum: ['create_job', 'business_expense', 'personal_expense', 'job_payment', 'debt', 'unknown'] },
    confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
    clientNameRaw: { type: ['string', 'null'] },
    jobTitleRaw: { type: ['string', 'null'] },
    jobCategory: { type: ['string', 'null'], enum: [...JOB_CATEGORIES, null] },
    agreedPrice: { type: ['number', 'null'] },
    paidAmountNow: { type: ['number', 'null'] },
    materialCosts: { type: ['number', 'null'] },
    expenseAmount: { type: ['number', 'null'] },
    expenseTitle: { type: ['string', 'null'] },
    expenseCategory: {
      type: ['string', 'null'],
      enum: [...BUSINESS_EXPENSE_CATEGORIES, ...HOUSEHOLD_EXPENSE_CATEGORIES, ...INDIVIDUAL_EXPENSE_CATEGORIES, null]
    },
    personalScope: { type: ['string', 'null'], enum: ['household', 'individual', null] },
    creditorNameRaw: { type: ['string', 'null'] },
    jobDescriptionRaw: { type: ['string', 'null'] },
    paymentAmount: { type: ['number', 'null'] },
    date: { type: ['string', 'null'], description: 'ISO date YYYY-MM-DD, or null if not mentioned' },
    notes: { type: ['string', 'null'] },
    missingFields: { type: 'array', items: { type: 'string' } },
    clarificationReason: { type: ['string', 'null'] }
  },
  required: [
    'type', 'confidence', 'clientNameRaw', 'jobTitleRaw', 'jobCategory', 'agreedPrice', 'paidAmountNow',
    'materialCosts', 'expenseAmount', 'expenseTitle', 'expenseCategory', 'personalScope', 'creditorNameRaw',
    'jobDescriptionRaw', 'paymentAmount', 'date', 'notes', 'missingFields', 'clarificationReason'
  ]
};

/**
 * Builds the server-side system prompt. Exported (pure, no I/O) so it can be
 * unit tested for content without making a network call.
 */
export function buildSystemPrompt(todayIso) {
  return `You are a structured data extraction engine for "Artisan Cash", a bookkeeping app used by a Moroccan handyman/technician (CCTV, networking, TV/printer repair, satellite, IT).

Your ONLY job: read one short voice transcript and extract it into ONE of these command types. You are NOT a chat assistant, you never produce prose, and you never talk to the user.

Allowed types:
- "create_job": a new job/work order was agreed with a client (may include an initial cash payment and material costs).
- "business_expense": money spent on the business (fuel, tools, materials, workshop, permits).
- "personal_expense": money spent on the user's household or personal life (food, rent, café, gaming, etc.).
- "job_payment": the user received cash from a client for an EXISTING job (not a new job).
- "debt": the user paid money toward an EXISTING debt/credit obligation (a supplier, a loan, a family loan).
- "unknown": the transcript is not a recognizable financial entry, or is empty/noise/unrelated speech.

Hard rules:
1. Return ONLY the JSON object matching the provided schema. No prose, no markdown, no explanation.
2. NEVER invent a numeric value (price, amount, cost) that was not stated or clearly implied. If a required amount is missing, leave it null and list it in "missingFields".
3. NEVER invent a client name, job description, or creditor name. If speech is unclear, leave the field null.
4. All money amounts are Moroccan Dirhams (MAD / د.م. / dh / dirhams), regardless of which language is spoken. Strip currency words, return a plain number.
5. "jobCategory" must be exactly one of these existing values, or null if none fits: ${JOB_CATEGORIES.join(' | ')}
6. "expenseCategory" (for business_expense) must be exactly one of: ${BUSINESS_EXPENSE_CATEGORIES.join(' | ')}
7. "expenseCategory" (for personal_expense) must be exactly one of these, and you must also set "personalScope":
   - household scope: ${HOUSEHOLD_EXPENSE_CATEGORIES.join(' | ')}
   - individual scope: ${INDIVIDUAL_EXPENSE_CATEGORIES.join(' | ')}
8. Distinguish business vs personal carefully: fuel/tools/materials/workshop/client-related = business. Food, rent, family, café, gaming, personal errands = personal.
9. "date": resolve relative dates ("today", "yesterday", "hier", "aujourd'hui", "لبارح", "اليوم") against today's date, which is ${todayIso}. If no date is mentioned at all, use ${todayIso}.
10. For "job_payment" and "debt", put the spoken client/creditor name (as heard, unmodified) into clientNameRaw / creditorNameRaw. Do NOT try to guess which exact existing client or job this is - you do not have access to the user's client list. That matching happens later in the app, not by you.
11. For "create_job", clientNameRaw is the client's name as heard; do not resolve it to an ID.
12. Set "confidence" to "low" whenever you had to guess at the type or any field; "high" only when the transcript was clear and unambiguous.
13. Set "clarificationReason" (a short factual sentence, in the same language the user spoke) whenever something is missing or ambiguous enough that the app should ask the user before saving. Otherwise null.
14. Populate "missingFields" with the names of any fields required for that command type that you could not extract (e.g. ["agreedPrice"], ["expenseAmount"]). Empty array if nothing is missing.
15. The user speaks English, French, Moroccan Darija (Arabic script or Latin transliteration), or a mix of these in the same sentence. Understand common Moroccan financial expressions (e.g. "صرفت" = "I spent", "خلصني" = "he/she paid me", "خلصت" = "I paid", "ديال" = "of/for", "درهم"/"dh"/"MAD" = dirhams, "دار" / "درت" = "did/made [a job]").
16. Fields you leave unset (not applicable to the chosen type) should be null - do not repurpose one field for another meaning.
17. You never output SQL, database table names, or IDs. You never decide what gets saved - you only describe what was said.

Examples (transcript -> type):
- "I spent 70 dirhams on fuel" -> business_expense, expenseAmount=70, expenseCategory="Transport & Fuel (Carburant)"
- "New job for Hassan, Samsung TV repair, 400 dirhams, he paid 200" -> create_job, clientNameRaw="Hassan", jobTitleRaw="Samsung TV repair", jobCategory="TV Repair", agreedPrice=400, paidAmountNow=200
- "Hassan paid me 300 dirhams for the TV repair" -> job_payment, clientNameRaw="Hassan", jobDescriptionRaw="TV repair", paymentAmount=300
- "صرفت 70 درهم على البنزين" -> business_expense, expenseAmount=70, expenseCategory="Transport & Fuel (Carburant)"
- "خلصني حسن 300 درهم" -> job_payment, clientNameRaw="حسن" or "Hassan" (as heard), paymentAmount=300
- "I did a TV repair for Hassan" (no price mentioned) -> create_job, clientNameRaw="Hassan", jobTitleRaw="TV repair", jobCategory="TV Repair", agreedPrice=null, missingFields=["agreedPrice"], clarificationReason="Agreed price was not mentioned."
- "hello" / silence / unrelated chatter -> unknown`;
}

/**
 * Narrows the flat AI response down to the real { type, data } VoiceCommand
 * shape the frontend expects, and computes the final missingFields list
 * (required fields for that type that are still null, merged with whatever
 * the model itself flagged). Pure function - no I/O - so it is fully unit
 * testable without calling OpenAI.
 */
export function projectFlatToVoiceCommand(flat) {
  const reportedMissing = new Set(flat.missingFields || []);

  const withMissing = (data, requiredKeys, keyToField) => {
    for (const key of requiredKeys) {
      if (data[key] === null || data[key] === undefined || data[key] === '') {
        reportedMissing.add(keyToField ? keyToField[key] || key : key);
      }
    }
    return Array.from(reportedMissing);
  };

  switch (flat.type) {
    case 'create_job': {
      const data = {
        clientNameRaw: flat.clientNameRaw,
        title: flat.jobTitleRaw,
        category: flat.jobCategory,
        agreedPrice: flat.agreedPrice,
        paidAmountNow: flat.paidAmountNow,
        materialCosts: flat.materialCosts,
        date: flat.date,
        notes: flat.notes
      };
      const missingFields = withMissing(data, ['clientNameRaw', 'agreedPrice']);
      return { type: 'create_job', data, missingFields, confidence: flat.confidence, clarificationReason: flat.clarificationReason };
    }
    case 'business_expense': {
      const data = {
        amount: flat.expenseAmount,
        title: flat.expenseTitle,
        category: flat.expenseCategory,
        date: flat.date
      };
      const missingFields = withMissing(data, ['amount']);
      return { type: 'business_expense', data, missingFields, confidence: flat.confidence, clarificationReason: flat.clarificationReason };
    }
    case 'personal_expense': {
      const data = {
        amount: flat.expenseAmount,
        title: flat.expenseTitle,
        category: flat.expenseCategory,
        scope: flat.personalScope,
        date: flat.date
      };
      const missingFields = withMissing(data, ['amount']);
      return { type: 'personal_expense', data, missingFields, confidence: flat.confidence, clarificationReason: flat.clarificationReason };
    }
    case 'job_payment': {
      const data = {
        clientNameRaw: flat.clientNameRaw,
        jobDescriptionRaw: flat.jobDescriptionRaw,
        amount: flat.paymentAmount,
        date: flat.date
      };
      const missingFields = withMissing(data, ['clientNameRaw', 'amount']);
      return { type: 'job_payment', data, missingFields, confidence: flat.confidence, clarificationReason: flat.clarificationReason };
    }
    case 'debt': {
      const data = {
        creditorNameRaw: flat.creditorNameRaw,
        amount: flat.paymentAmount,
        date: flat.date,
        notes: flat.notes
      };
      const missingFields = withMissing(data, ['creditorNameRaw', 'amount']);
      return { type: 'debt', data, missingFields, confidence: flat.confidence, clarificationReason: flat.clarificationReason };
    }
    case 'unknown':
    default:
      return {
        type: 'unknown',
        data: {},
        missingFields: Array.from(reportedMissing),
        confidence: flat.confidence,
        clarificationReason: flat.clarificationReason
      };
  }
}

/** Pure request-body builder, exported for testability. */
export function buildExtractionRequestBody(transcript, todayIso) {
  return {
    model: MODEL,
    temperature: 0,
    messages: [
      { role: 'system', content: buildSystemPrompt(todayIso) },
      { role: 'user', content: transcript }
    ],
    response_format: {
      type: 'json_schema',
      json_schema: { name: 'voice_command_extraction', strict: true, schema: FLAT_RESPONSE_JSON_SCHEMA }
    }
  };
}

/**
 * Parses and validates a raw JSON string from the model's response content
 * (two-stage: JSON.parse, then flatExtractionSchema). Throws a descriptive
 * error on either failure - the AI's output is untrusted input and must
 * never reach the frontend (let alone a save) unvalidated.
 */
export function parseAndValidateFlatResponse(jsonText) {
  let raw;
  try {
    raw = JSON.parse(jsonText);
  } catch {
    throw new Error('AI returned a response that was not valid JSON.');
  }
  const parsed = flatExtractionSchema.safeParse(raw);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    throw new Error(`AI returned malformed structured data (${issue?.path.join('.') || 'root'}: ${issue?.message}).`);
  }
  return parsed.data;
}

/**
 * Full extraction pipeline: transcript -> OpenAI structured output -> parsed
 * & validated flat shape -> narrowed VoiceCommand -> final schema check.
 * Throws on any failure; the caller (the API route) turns that into a
 * user-friendly error response.
 */
export async function extractVoiceCommand(transcript) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured on the server.');
  }

  const todayIso = new Date().toISOString().split('T')[0];
  const body = buildExtractionRequestBody(transcript, todayIso);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), EXTRACTION_TIMEOUT_MS);

  let content;
  try {
    const response = await fetch(OPENAI_CHAT_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      throw new Error(`AI extraction request failed (HTTP ${response.status}): ${errText.slice(0, 300)}`);
    }

    const data = await response.json();
    content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('AI extraction returned no content.');
    }
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error('AI extraction request timed out.');
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }

  const flat = parseAndValidateFlatResponse(content);
  const command = projectFlatToVoiceCommand(flat);

  const finalCheck = voiceCommandSchema.safeParse(command);
  if (!finalCheck.success) {
    const issue = finalCheck.error.issues[0];
    throw new Error(`AI extraction produced an invalid command (${issue?.path.join('.') || 'root'}: ${issue?.message}).`);
  }

  return finalCheck.data;
}
