// ==========================================
// VOICE ENTRY - DOMAIN CONSTANTS
// Mirrors the literal enum values already used by the frontend
// (src/lib/jobOptions.ts, src/components/quickEntry/QuickExpenseModal.tsx,
// src/types/index.ts). Kept as a manually-synced duplicate on the server
// side, the same pattern server/validation.js already uses for JOB_STATUSES -
// these are plain string enums, not shared modules, because the frontend is
// TypeScript (types erase at build time) and the server runs as plain ESM.
// The AI extraction prompt is constrained to these exact strings so it can
// never invent a category that doesn't exist in the app.
// ==========================================

export const JOB_CATEGORIES = [
  'CCTV Installation',
  'IP Camera Installation',
  'Camera Error / Repair',
  'Satellite Dish (Parabole)',
  'Câblage (Network & Cable)',
  'TV Repair',
  'Printer Repair & Maintenance',
  'Informatique (IT & Hardware)',
  'Fiber Sharing (Partage Fibre)'
];

export const BUSINESS_EXPENSE_CATEGORIES = [
  'Tools & Equipment (Outillage)',
  'Transport & Fuel (Carburant)',
  'Materials & droguerie (Fournitures)',
  'Licenses & Permits (Patente)',
  'Workshop & Storage (Atelier)',
  'Other Business Expense'
];

export const HOUSEHOLD_EXPENSE_CATEGORIES = [
  'Food & Groceries (Alimentation)',
  'Housing & Rent (Loyer)',
  'Utilities & Phone (Eau, Électricité, Recharge)',
  'Family & Children (Famille / Enfants)',
  'Healthcare & Medical (Santé)',
  'Other Household Expense'
];

export const INDIVIDUAL_EXPENSE_CATEGORIES = [
  'Café & Snacks (Café / Thé / Snacks)',
  'Gaming & Entertainment (Gaming / Loisirs)',
  'Personal Pocket Money (Loisirs & Sorties)',
  'Other Personal Expense'
];

export const PERSONAL_EXPENSE_CATEGORIES = [...HOUSEHOLD_EXPENSE_CATEGORIES, ...INDIVIDUAL_EXPENSE_CATEGORIES];
