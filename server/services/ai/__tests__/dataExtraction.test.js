import { describe, it, expect } from 'vitest';
import {
  projectFlatToVoiceCommand,
  parseAndValidateFlatResponse,
  buildExtractionRequestBody,
  buildSystemPrompt
} from '../dataExtraction.js';

// These tests exercise the deterministic parts of the extraction pipeline -
// the JSON parsing/validation and the flat-to-VoiceCommand projection - by
// simulating what OpenAI would have returned. They do NOT call the real
// OpenAI API (no network, no API key needed), matching the two "AI parsing"
// examples requested in the spec.

function flatFixture(overrides) {
  return {
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
    date: '2026-09-21',
    notes: null,
    missingFields: [],
    clarificationReason: null,
    ...overrides
  };
}

describe('projectFlatToVoiceCommand', () => {
  it('projects "I spent 70 dirhams on fuel" into a business_expense command', () => {
    const flat = flatFixture({
      type: 'business_expense',
      expenseAmount: 70,
      expenseTitle: 'Fuel',
      expenseCategory: 'Transport & Fuel (Carburant)'
    });

    const command = projectFlatToVoiceCommand(flat);

    expect(command.type).toBe('business_expense');
    expect(command.data.amount).toBe(70);
    expect(command.data.category).toBe('Transport & Fuel (Carburant)');
    expect(command.missingFields).toEqual([]);
  });

  it('projects "Hassan paid me 300 dirhams" into a job_payment command', () => {
    const flat = flatFixture({
      type: 'job_payment',
      clientNameRaw: 'Hassan',
      paymentAmount: 300
    });

    const command = projectFlatToVoiceCommand(flat);

    expect(command.type).toBe('job_payment');
    expect(command.data.amount).toBe(300);
    expect(command.data.clientNameRaw).toBe('Hassan');
  });

  it('projects a create_job command and flags a missing agreedPrice', () => {
    const flat = flatFixture({
      type: 'create_job',
      clientNameRaw: 'Hassan',
      jobTitleRaw: 'TV repair',
      jobCategory: 'TV Repair',
      agreedPrice: null,
      clarificationReason: 'Agreed price was not mentioned.'
    });

    const command = projectFlatToVoiceCommand(flat);

    expect(command.type).toBe('create_job');
    expect(command.missingFields).toContain('agreedPrice');
    expect(command.data.agreedPrice).toBeNull();
  });

  it('merges model-reported missingFields with computed ones without duplicates', () => {
    const flat = flatFixture({
      type: 'debt',
      creditorNameRaw: null,
      paymentAmount: null,
      missingFields: ['creditorNameRaw']
    });

    const command = projectFlatToVoiceCommand(flat);

    expect(command.missingFields.sort()).toEqual(['amount', 'creditorNameRaw'].sort());
  });

  it('passes through an unknown command with an empty data object', () => {
    const command = projectFlatToVoiceCommand(flatFixture({ type: 'unknown' }));
    expect(command.type).toBe('unknown');
    expect(command.data).toEqual({});
  });
});

describe('parseAndValidateFlatResponse', () => {
  it('rejects a response that is not valid JSON', () => {
    expect(() => parseAndValidateFlatResponse('not json {')).toThrow(/not valid JSON/);
  });

  it('rejects a well-formed JSON object with an invalid type enum', () => {
    const malformed = JSON.stringify(flatFixture({ type: 'drop_table_jobs' }));
    expect(() => parseAndValidateFlatResponse(malformed)).toThrow(/malformed structured data/);
  });

  it('rejects a response with the wrong primitive type for a numeric field', () => {
    const malformed = JSON.stringify({ ...flatFixture({ type: 'business_expense' }), expenseAmount: 'seventy' });
    expect(() => parseAndValidateFlatResponse(malformed)).toThrow(/malformed structured data/);
  });

  it('rejects a response missing required envelope fields', () => {
    const flat = flatFixture({ type: 'business_expense' });
    delete flat.missingFields;
    expect(() => parseAndValidateFlatResponse(JSON.stringify(flat))).toThrow(/malformed structured data/);
  });

  it('accepts a well-formed flat response', () => {
    const flat = flatFixture({ type: 'business_expense', expenseAmount: 70, expenseCategory: 'Transport & Fuel (Carburant)' });
    const parsed = parseAndValidateFlatResponse(JSON.stringify(flat));
    expect(parsed.expenseAmount).toBe(70);
  });
});

describe('buildExtractionRequestBody', () => {
  it('sends today\'s date and every allowed category into the system prompt', () => {
    const body = buildExtractionRequestBody('I spent 70 dirhams on fuel', '2026-09-21');
    expect(body.messages[0].role).toBe('system');
    expect(body.messages[0].content).toContain('2026-09-21');
    expect(body.messages[0].content).toContain('Transport & Fuel (Carburant)');
    expect(body.messages[1]).toEqual({ role: 'user', content: 'I spent 70 dirhams on fuel' });
    expect(body.response_format.type).toBe('json_schema');
    expect(body.response_format.json_schema.strict).toBe(true);
  });

  it('lists every schema property in required[] (OpenAI strict mode requirement)', () => {
    const body = buildExtractionRequestBody('test', '2026-09-21');
    const schema = body.response_format.json_schema.schema;
    expect(schema.additionalProperties).toBe(false);
    expect(new Set(schema.required)).toEqual(new Set(Object.keys(schema.properties)));
  });
});

describe('buildSystemPrompt', () => {
  it('instructs the model to never invent missing financial values and to output JSON only', () => {
    const prompt = buildSystemPrompt('2026-09-21');
    expect(prompt).toMatch(/NEVER invent/i);
    expect(prompt).toMatch(/ONLY the JSON object/i);
  });
});
