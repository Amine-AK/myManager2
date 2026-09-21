import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  loadFieldPresets,
  saveFieldPresets,
  resetFieldPresets,
  DEFAULT_FIELD_PRESETS,
  type FieldPresetsConfig
} from '../../../lib/storage/fieldPresets';

describe('Field Presets Configuration & Customization', () => {
  let store: Record<string, string> = {};

  beforeEach(() => {
    store = {};
    const mockLocalStorage = {
      getItem: (key: string) => store[key] || null,
      setItem: (key: string, val: string) => { store[key] = val; },
      removeItem: (key: string) => { delete store[key]; },
      clear: () => { store = {}; }
    };
    (globalThis as any).localStorage = mockLocalStorage;
  });

  afterEach(() => {
    delete (globalThis as any).localStorage;
  });

  it('loads default presets when no custom config exists', () => {
    const presets = loadFieldPresets();
    expect(presets.delays.length).toBe(DEFAULT_FIELD_PRESETS.delays.length);
    expect(presets.durations.length).toBe(DEFAULT_FIELD_PRESETS.durations.length);
    expect(presets.expenses.length).toBe(DEFAULT_FIELD_PRESETS.expenses.length);

    expect(presets.delays[0].label).toContain('Attente pièces');
    expect(presets.durations[0].minutes).toBe(15);
    expect(presets.expenses[0].amount).toBe(50);
  });

  it('persists custom delay categories, custom durations, and custom expense amounts', () => {
    const customConfig: FieldPresetsConfig = {
      delays: [
        ...DEFAULT_FIELD_PRESETS.delays,
        { id: 'custom-1', key: 'ROOF_LOCKED', label: 'Accès toiture verrouillé' },
        { id: 'custom-2', key: 'NVR_PASSWORD_LOST', label: 'Mot de passe NVR perdu' }
      ],
      durations: [
        { id: 'dur-custom', minutes: 20, label: '20 min' },
        ...DEFAULT_FIELD_PRESETS.durations
      ],
      expenses: [
        { id: 'exp-custom', amount: 75, label: '75 MAD' },
        ...DEFAULT_FIELD_PRESETS.expenses
      ]
    };

    saveFieldPresets(customConfig);

    const loaded = loadFieldPresets();
    expect(loaded.delays).toHaveLength(DEFAULT_FIELD_PRESETS.delays.length + 2);
    expect(loaded.delays.some(d => d.label === 'Accès toiture verrouillé')).toBe(true);
    expect(loaded.durations.some(d => d.minutes === 20)).toBe(true);
    expect(loaded.expenses.some(e => e.amount === 75)).toBe(true);
  });

  it('allows removing presets and resetting to defaults', () => {
    // Delete all except 1 delay
    const reducedConfig: FieldPresetsConfig = {
      delays: [{ id: 'd-only', key: 'TEST', label: 'Unique Delay' }],
      durations: DEFAULT_FIELD_PRESETS.durations,
      expenses: DEFAULT_FIELD_PRESETS.expenses
    };

    saveFieldPresets(reducedConfig);
    let loaded = loadFieldPresets();
    expect(loaded.delays).toHaveLength(1);
    expect(loaded.delays[0].label).toBe('Unique Delay');

    // Reset to defaults
    const resetResult = resetFieldPresets();
    expect(resetResult.delays.length).toBe(DEFAULT_FIELD_PRESETS.delays.length);

    loaded = loadFieldPresets();
    expect(loaded.delays.length).toBe(DEFAULT_FIELD_PRESETS.delays.length);
  });
});
