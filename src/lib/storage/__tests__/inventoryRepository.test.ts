import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  loadInventory,
  saveInventoryItem,
  adjustInventoryQuantity,
  deleteInventoryItem,
  resetInventoryToDefault,
  DEFAULT_INVENTORY_ITEMS
} from '../inventoryRepository';
import type { InventoryItem } from '../../../types/inventory';

describe('Inventory & Consumables Repository', () => {
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

  it('loads starter kit when localStorage is empty', () => {
    const items = loadInventory();
    expect(items.length).toBe(DEFAULT_INVENTORY_ITEMS.length);
    expect(items.some(i => i.name.includes('UTP Cat6'))).toBe(true);
    expect(items.some(i => i.name.includes('Caméra Dôme'))).toBe(true);
  });

  it('increments and decrements item quantity with 1-tap adjustInventoryQuantity', () => {
    loadInventory();
    // Test increment (+10)
    const afterInc = adjustInventoryQuantity('inv-1', 10);
    const itemInc = afterInc.find(i => i.id === 'inv-1');
    expect(itemInc?.quantity).toBe(190); // 180 + 10

    // Test decrement (-30)
    const afterDec = adjustInventoryQuantity('inv-1', -30);
    const itemDec = afterDec.find(i => i.id === 'inv-1');
    expect(itemDec?.quantity).toBe(160);

    // Quantity cannot be negative
    const afterExcessiveDec = adjustInventoryQuantity('inv-1', -500);
    const itemZero = afterExcessiveDec.find(i => i.id === 'inv-1');
    expect(itemZero?.quantity).toBe(0);
  });

  it('detects low stock condition when quantity is below or equal to minThreshold', () => {
    loadInventory();
    // inv-2 has quantity 65, minThreshold 20
    let items = adjustInventoryQuantity('inv-2', -50); // becomes 15
    const item = items.find(i => i.id === 'inv-2');
    expect(item?.quantity).toBe(15);
    expect(item!.quantity <= item!.minThreshold).toBe(true);
  });

  it('saves new inventory items and updates existing ones', () => {
    loadInventory();
    const newItem: InventoryItem = {
      id: 'inv-custom-1',
      name: 'Switch Gigabit PoE 8 Ports',
      category: 'cabling',
      quantity: 2,
      unit: 'pcs',
      minThreshold: 1,
      unitCostMad: 350,
      location: 'Atelier',
      notes: 'Switch manageable 802.3af/at',
      updatedAt: '2026-09-18'
    };

    const items = saveInventoryItem(newItem);
    expect(items.some(i => i.id === 'inv-custom-1')).toBe(true);

    // Update existing item
    const updated = saveInventoryItem({
      ...newItem,
      quantity: 5
    });
    const found = updated.find(i => i.id === 'inv-custom-1');
    expect(found?.quantity).toBe(5);
  });

  it('deletes inventory items properly', () => {
    loadInventory();
    const beforeCount = loadInventory().length;
    const items = deleteInventoryItem('inv-3');
    expect(items.length).toBe(beforeCount - 1);
    expect(items.some(i => i.id === 'inv-3')).toBe(false);
  });

  it('resets to default starter kit', () => {
    deleteInventoryItem('inv-1');
    deleteInventoryItem('inv-2');
    expect(loadInventory().length).toBeLessThan(DEFAULT_INVENTORY_ITEMS.length);

    const reset = resetInventoryToDefault();
    expect(reset.length).toBe(DEFAULT_INVENTORY_ITEMS.length);
  });
});
