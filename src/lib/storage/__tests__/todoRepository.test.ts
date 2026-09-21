import { describe, it, expect, beforeEach } from 'vitest';
import {
  getStoredTodos,
  saveTodoItem,
  toggleTodoCompleted,
  deleteTodoItem
} from '../todoRepository';
import type { TodoItem } from '../../../types';

// Mock localStorage for Vitest Node environment
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    clear: () => {
      store = {};
    },
    removeItem: (key: string) => {
      delete store[key];
    }
  };
})();

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  writable: true
});

describe('Todo Repository (Local-First Persistence)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns default seed todos when storage is uninitialized', () => {
    const todos = getStoredTodos();
    expect(todos.length).toBeGreaterThanOrEqual(3);
    expect(todos.some(t => t.category === 'CALL_CLIENT')).toBe(true);
    expect(todos.some(t => t.category === 'BUY_PARTS')).toBe(true);
    expect(todos.some(t => t.category === 'SITE_SURVEY')).toBe(true);
  });

  it('saves a new todo item cleanly at the front of the list', () => {
    const newTodo: TodoItem = {
      id: 'test-todo-1',
      title: 'Appeler client Driss pour caméra IP',
      category: 'CALL_CLIENT',
      priority: 'urgent',
      completed: false,
      clientName: 'Driss',
      clientPhone: '0661998877',
      createdAt: new Date().toISOString()
    };

    const updated = saveTodoItem(newTodo);
    expect(updated[0].id).toBe('test-todo-1');
    expect(updated[0].title).toBe('Appeler client Driss pour caméra IP');
    expect(updated[0].priority).toBe('urgent');

    // Confirm persisted to storage
    const reloaded = getStoredTodos();
    expect(reloaded[0].id).toBe('test-todo-1');
  });

  it('updates an existing todo item when saving matching id', () => {
    const initial = getStoredTodos();
    const first = initial[0];
    const modified: TodoItem = {
      ...first,
      title: 'Titre Modifié',
      priority: 'urgent'
    };

    const updated = saveTodoItem(modified);
    const found = updated.find(t => t.id === first.id);
    expect(found?.title).toBe('Titre Modifié');
    expect(found?.priority).toBe('urgent');
  });

  it('toggles completion status and sets completedAt timestamp', () => {
    const initial = getStoredTodos();
    const targetId = initial[0].id;
    expect(initial[0].completed).toBe(false);

    const afterToggle = toggleTodoCompleted(targetId);
    const toggled = afterToggle.find(t => t.id === targetId);
    expect(toggled?.completed).toBe(true);
    expect(toggled?.completedAt).toBeDefined();

    // Toggle back
    const untoggledList = toggleTodoCompleted(targetId);
    const untoggled = untoggledList.find(t => t.id === targetId);
    expect(untoggled?.completed).toBe(false);
    expect(untoggled?.completedAt).toBeUndefined();
  });

  it('deletes a todo item by id', () => {
    const initial = getStoredTodos();
    const initialCount = initial.length;
    const targetId = initial[0].id;

    const afterDelete = deleteTodoItem(targetId);
    expect(afterDelete.length).toBe(initialCount - 1);
    expect(afterDelete.some(t => t.id === targetId)).toBe(false);

    // Confirm persisted
    const reloaded = getStoredTodos();
    expect(reloaded.some(t => t.id === targetId)).toBe(false);
  });
});
