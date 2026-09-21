import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  loadKnowledgeBase,
  saveGuide,
  toggleGuideFavorite,
  deleteGuide,
  resetKnowledgeBaseToDefault,
  DEFAULT_DIAGNOSTIC_GUIDES
} from '../knowledgeRepository';
import type { DiagnosticGuide } from '../../../types/knowledgeBase';

describe('Technical Knowledge Base Repository', () => {
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

  it('loads starter guides when localStorage is empty', () => {
    const guides = loadKnowledgeBase();
    expect(guides.length).toBe(DEFAULT_DIAGNOSTIC_GUIDES.length);
    expect(guides.some(g => g.title.includes('T568B'))).toBe(true);
    expect(guides.some(g => g.brand === 'Dahua')).toBe(true);
    expect(guides.some(g => g.brand === 'Hikvision')).toBe(true);
  });

  it('toggles favorite status on a guide', () => {
    loadKnowledgeBase();
    const before = loadKnowledgeBase().find(g => g.id === 'kb-5');
    const wasFavorite = !!before?.isFavorite;

    const updated = toggleGuideFavorite('kb-5');
    const after = updated.find(g => g.id === 'kb-5');
    expect(after?.isFavorite).toBe(!wasFavorite);
  });

  it('saves new diagnostic guides and updates existing ones', () => {
    loadKnowledgeBase();
    const newGuide: DiagnosticGuide = {
      id: 'kb-custom-1',
      title: 'Visiophone Dahua VTO2111D : Câblage Gâche Électrique',
      category: 'intercom',
      brand: 'Dahua',
      symptom: 'La gâche ne s\'ouvre pas depuis l\'écran intérieur',
      solutionSteps: [
        'Vérifier le relais NO/COM sur le bornier du portier.',
        'Ajouter une diode de roue libre 1N4007 sur la gâche 12V DC.',
        'Utiliser une alimentation 12V 2A séparée pour la gâche.'
      ],
      tags: ['interphone', 'vto', 'gache', 'relais'],
      updatedAt: '2026-09-19'
    };

    const saved = saveGuide(newGuide);
    expect(saved.some(g => g.id === 'kb-custom-1')).toBe(true);

    // Update existing
    const updated = saveGuide({
      ...newGuide,
      title: 'Visiophone Dahua VTO2111D (Modifié)'
    });
    const found = updated.find(g => g.id === 'kb-custom-1');
    expect(found?.title).toBe('Visiophone Dahua VTO2111D (Modifié)');
  });

  it('deletes guides properly', () => {
    loadKnowledgeBase();
    const initialCount = loadKnowledgeBase().length;
    const afterDelete = deleteGuide('kb-2');
    expect(afterDelete.length).toBe(initialCount - 1);
    expect(afterDelete.some(g => g.id === 'kb-2')).toBe(false);
  });

  it('resets knowledge base to default starter kit', () => {
    deleteGuide('kb-1');
    deleteGuide('kb-2');
    expect(loadKnowledgeBase().length).toBeLessThan(DEFAULT_DIAGNOSTIC_GUIDES.length);

    const reset = resetKnowledgeBaseToDefault();
    expect(reset.length).toBe(DEFAULT_DIAGNOSTIC_GUIDES.length);
  });
});
