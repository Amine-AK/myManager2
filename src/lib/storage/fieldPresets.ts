// ==========================================
// FIELD PRESETS CONFIGURATION
// User-customizable chips for delays, durations, and quick expenses
// ==========================================

export interface DelayPresetItem {
  id: string;
  key: string;       // Matches DelayCategory or custom string
  label: string;     // Human-readable label (e.g., "Attente pièces (Droguerie)")
  color?: string;    // Badge highlight
}

export interface DurationPresetItem {
  id: string;
  minutes: number;
  label: string;     // e.g. "15 min", "30 min", "1 h"
}

export interface ExpensePresetItem {
  id: string;
  amount: number;
  label: string;     // e.g. "50 MAD", "100 MAD"
}

export interface FieldPresetsConfig {
  delays: DelayPresetItem[];
  durations: DurationPresetItem[];
  expenses: ExpensePresetItem[];
}

export const DEFAULT_FIELD_PRESETS: FieldPresetsConfig = {
  delays: [
    { id: 'd-1', key: 'WAITING_FOR_PARTS', label: 'Attente pièces (Droguerie)' },
    { id: 'd-2', key: 'MISSING_TOOL', label: 'Outil manquant' },
    { id: 'd-3', key: 'CLIENT_DELAY', label: 'Retard / Absent client' },
    { id: 'd-4', key: 'SITE_UNPREPARED', label: 'Site non prêt / En travaux' },
    { id: 'd-5', key: 'CABLING_PROBLEM', label: 'Complication goulotte / câble' },
    { id: 'd-6', key: 'POWER_ISSUE', label: 'Problème alimentation / 220V' },
    { id: 'd-7', key: 'ACCESS_PROBLEM', label: 'Accès toiture / local refusé' },
    { id: 'd-8', key: 'NETWORK_PROBLEM', label: 'Box / Port IP injoignable' }
  ],
  durations: [
    { id: 'dur-1', minutes: 15, label: '15 min' },
    { id: 'dur-2', minutes: 30, label: '30 min' },
    { id: 'dur-3', minutes: 45, label: '45 min' },
    { id: 'dur-4', minutes: 60, label: '1 h' },
    { id: 'dur-5', minutes: 90, label: '1h30' },
    { id: 'dur-6', minutes: 120, label: '2 h' }
  ],
  expenses: [
    { id: 'exp-1', amount: 50, label: '50 MAD' },
    { id: 'exp-2', amount: 100, label: '100 MAD' },
    { id: 'exp-3', amount: 150, label: '150 MAD' },
    { id: 'exp-4', amount: 200, label: '200 MAD' },
    { id: 'exp-5', amount: 300, label: '300 MAD' },
    { id: 'exp-6', amount: 500, label: '500 MAD' }
  ]
};

const STORAGE_KEY = 'mymanager_field_presets_v1';

export function loadFieldPresets(): FieldPresetsConfig {
  if (typeof localStorage === 'undefined') {
    return DEFAULT_FIELD_PRESETS;
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_FIELD_PRESETS;
    const parsed = JSON.parse(raw);
    return {
      delays: Array.isArray(parsed.delays) && parsed.delays.length > 0 ? parsed.delays : DEFAULT_FIELD_PRESETS.delays,
      durations: Array.isArray(parsed.durations) && parsed.durations.length > 0 ? parsed.durations : DEFAULT_FIELD_PRESETS.durations,
      expenses: Array.isArray(parsed.expenses) && parsed.expenses.length > 0 ? parsed.expenses : DEFAULT_FIELD_PRESETS.expenses
    };
  } catch {
    return DEFAULT_FIELD_PRESETS;
  }
}

export function saveFieldPresets(config: FieldPresetsConfig): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch (err) {
    console.error('[FieldPresets] Error saving presets to localStorage:', err);
  }
}

export function resetFieldPresets(): FieldPresetsConfig {
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem(STORAGE_KEY);
  }
  return DEFAULT_FIELD_PRESETS;
}
