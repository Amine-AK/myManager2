// ==========================================
// SHARED EXPENSE FORM OPTIONS (used by Quick Expense entry & AI Voice Entry)
// Hoisted out of QuickExpenseModal.tsx so the values have a single source of
// truth instead of being duplicated across every place that needs them -
// same pattern as src/lib/jobOptions.ts for Job categories/sources.
// ==========================================

import type { BusinessExpenseCategory, PersonalExpenseCategory } from '../types';

export const BUSINESS_EXPENSE_CATEGORIES: BusinessExpenseCategory[] = [
  'Tools & Equipment (Outillage)',
  'Transport & Fuel (Carburant)',
  'Materials & droguerie (Fournitures)',
  'Licenses & Permits (Patente)',
  'Workshop & Storage (Atelier)',
  'Other Business Expense'
];

export const HOUSEHOLD_EXPENSE_CATEGORIES: PersonalExpenseCategory[] = [
  'Food & Groceries (Alimentation)',
  'Housing & Rent (Loyer)',
  'Utilities & Phone (Eau, Électricité, Recharge)',
  'Family & Children (Famille / Enfants)',
  'Healthcare & Medical (Santé)',
  'Other Household Expense'
];

export const INDIVIDUAL_EXPENSE_CATEGORIES: PersonalExpenseCategory[] = [
  'Café & Snacks (Café / Thé / Snacks)',
  'Gaming & Entertainment (Gaming / Loisirs)',
  'Personal Pocket Money (Loisirs & Sorties)',
  'Other Personal Expense'
];

export const PERSONAL_EXPENSE_CATEGORIES: PersonalExpenseCategory[] = [...HOUSEHOLD_EXPENSE_CATEGORIES, ...INDIVIDUAL_EXPENSE_CATEGORIES];
