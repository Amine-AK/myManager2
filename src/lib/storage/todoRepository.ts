// ==========================================
// STORAGE LAYER - TODO REPOSITORY
// Local-first persistent storage for client calls,
// future projects, parts procurement, and field notes.
// ==========================================

import type { TodoItem, TodoCategory } from '../../types';

const STORAGE_KEY = 'mymanager_todos_v1';

export const DEFAULT_TODOS: TodoItem[] = [
  {
    id: 'todo-seed-1',
    title: 'Rappeler M. Alami pour confirmation accès toiture',
    category: 'CALL_CLIENT',
    priority: 'urgent',
    completed: false,
    dueDate: new Date().toISOString().split('T')[0], // Today
    clientName: 'M. Alami',
    clientPhone: '0661123456',
    notes: 'Vérifier si le gardien aura les clés de la terrasse pour passer les câbles caméra.',
    createdAt: new Date().toISOString()
  },
  {
    id: 'todo-seed-2',
    title: 'Acheter 2 rouleaux câble Cat6 FTP + connecteurs RJ45',
    category: 'BUY_PARTS',
    priority: 'normal',
    completed: false,
    dueDate: new Date().toISOString().split('T')[0],
    clientName: 'Droguerie Centrale',
    estimatedAmount: 650,
    notes: 'Prendre aussi du chatterton et des chevilles 6mm.',
    createdAt: new Date().toISOString()
  },
  {
    id: 'todo-seed-3',
    title: 'Visite technique & devis 8 caméras IP - Clinique Atlas',
    category: 'SITE_SURVEY',
    priority: 'normal',
    completed: false,
    dueDate: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0], // in 2 days
    clientName: 'Clinique Atlas (Dr. Bennani)',
    clientPhone: '0662987654',
    estimatedAmount: 4200,
    notes: 'Relever distances câblage et emplacement du switch PoE dans la baie.',
    createdAt: new Date().toISOString()
  }
];

export function getStoredTodos(): TodoItem[] {
  if (typeof localStorage === 'undefined') {
    return DEFAULT_TODOS;
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_TODOS));
      return DEFAULT_TODOS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : DEFAULT_TODOS;
  } catch (err) {
    console.error('Failed to load todos from localStorage, using defaults:', err);
    return DEFAULT_TODOS;
  }
}

export function saveStoredTodos(todos: TodoItem[]): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
  } catch (err) {
    console.error('Failed to save todos to localStorage:', err);
  }
}

export function saveTodoItem(todo: TodoItem): TodoItem[] {
  const current = getStoredTodos();
  const index = current.findIndex(t => t.id === todo.id);
  let updated: TodoItem[];
  if (index >= 0) {
    updated = [...current];
    updated[index] = todo;
  } else {
    updated = [todo, ...current];
  }
  saveStoredTodos(updated);
  return updated;
}

export function toggleTodoCompleted(id: string): TodoItem[] {
  const current = getStoredTodos();
  const updated = current.map(t => {
    if (t.id !== id) return t;
    const nowCompleted = !t.completed;
    return {
      ...t,
      completed: nowCompleted,
      completedAt: nowCompleted ? new Date().toISOString() : undefined
    };
  });
  saveStoredTodos(updated);
  return updated;
}

export function deleteTodoItem(id: string): TodoItem[] {
  const current = getStoredTodos();
  const updated = current.filter(t => t.id !== id);
  saveStoredTodos(updated);
  return updated;
}

export const CATEGORY_METADATA: Record<TodoCategory, { label: string; iconLabel: string; badgeColor: string; textColor: string }> = {
  CALL_CLIENT: {
    label: 'Rappeler Client',
    iconLabel: '📞',
    badgeColor: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
    textColor: 'text-sky-400'
  },
  FUTURE_WORK: {
    label: 'Chantier Futur / Devis',
    iconLabel: '🔨',
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    textColor: 'text-emerald-400'
  },
  BUY_PARTS: {
    label: 'Achat Matériel / Droguerie',
    iconLabel: '🛒',
    badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    textColor: 'text-amber-400'
  },
  SITE_SURVEY: {
    label: 'Visite Technique / Devis',
    iconLabel: '📐',
    badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    textColor: 'text-purple-400'
  },
  OTHER: {
    label: 'Note / Autre',
    iconLabel: '📝',
    badgeColor: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
    textColor: 'text-slate-400'
  }
};
