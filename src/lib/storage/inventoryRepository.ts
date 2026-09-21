import type { InventoryItem, InventoryCategory, InventoryUnit } from '../../types/inventory';

const INVENTORY_STORAGE_KEY = 'artisan_inventory_items_v1';

export const DEFAULT_INVENTORY_ITEMS: InventoryItem[] = [
  // Câblage & Réseau
  {
    id: 'inv-1',
    name: 'Câble Réseau UTP Cat6 Cuivre',
    category: 'cabling',
    quantity: 180,
    unit: 'meters',
    minThreshold: 50,
    unitCostMad: 3.5,
    location: 'Voiture / Coffre',
    notes: 'Bobine 305m Cat6 UTP 100% Cuivre',
    updatedAt: new Date().toISOString().split('T')[0]
  },
  {
    id: 'inv-2',
    name: 'Connecteurs RJ45 Cat6 blindés',
    category: 'cabling',
    quantity: 65,
    unit: 'pcs',
    minThreshold: 20,
    unitCostMad: 1.5,
    location: 'Sacoche Outils',
    notes: 'Boîte de connecteurs avec manchons de protection',
    updatedAt: new Date().toISOString().split('T')[0]
  },
  {
    id: 'inv-3',
    name: 'Câble Coaxial KX6 + Alimentation 2x0.75',
    category: 'cabling',
    quantity: 80,
    unit: 'meters',
    minThreshold: 30,
    unitCostMad: 4.0,
    location: 'Voiture / Coffre',
    notes: 'Pour caméras analogiques HDCVI / AHD',
    updatedAt: new Date().toISOString().split('T')[0]
  },
  {
    id: 'inv-4',
    name: 'Fiches BNC à visser / compression',
    category: 'cabling',
    quantity: 24,
    unit: 'pcs',
    minThreshold: 10,
    unitCostMad: 3.0,
    location: 'Sacoche Outils',
    updatedAt: new Date().toISOString().split('T')[0]
  },

  // Vidéosurveillance & Sécurité
  {
    id: 'inv-5',
    name: 'Caméra Dôme IP 4MP PoE (Dahua / Hik)',
    category: 'cctv',
    quantity: 4,
    unit: 'pcs',
    minThreshold: 2,
    unitCostMad: 320,
    location: 'Atelier',
    notes: 'Vision nocturne IR 30m, objectif 2.8mm',
    updatedAt: new Date().toISOString().split('T')[0]
  },
  {
    id: 'inv-6',
    name: 'Caméra Tube Bullet HDCVI 2MP Extérieure',
    category: 'cctv',
    quantity: 3,
    unit: 'pcs',
    minThreshold: 2,
    unitCostMad: 180,
    location: 'Voiture / Coffre',
    notes: 'Étanche IP67 métal',
    updatedAt: new Date().toISOString().split('T')[0]
  },
  {
    id: 'inv-7',
    name: 'Disque Dur Surveillance 1To (WD Purple / Skyhawk)',
    category: 'cctv',
    quantity: 2,
    unit: 'pcs',
    minThreshold: 1,
    unitCostMad: 450,
    location: 'Atelier',
    notes: 'Spécial enregistrement 24/7 NVR/DVR',
    updatedAt: new Date().toISOString().split('T')[0]
  },

  // Alimentations & Énergie
  {
    id: 'inv-8',
    name: 'Alimentation 12V 2A Plug pour Caméra',
    category: 'power',
    quantity: 8,
    unit: 'pcs',
    minThreshold: 3,
    unitCostMad: 25,
    location: 'Voiture / Coffre',
    notes: 'Transformateur 12V 2A Jack 5.5mm',
    updatedAt: new Date().toISOString().split('T')[0]
  },
  {
    id: 'inv-9',
    name: 'Connecteurs Jack DC Mâles & Femelles',
    category: 'power',
    quantity: 30,
    unit: 'pcs',
    minThreshold: 15,
    unitCostMad: 2.0,
    location: 'Sacoche Outils',
    notes: 'Bornier à vis sans soudure',
    updatedAt: new Date().toISOString().split('T')[0]
  },
  {
    id: 'inv-10',
    name: 'Boîtier Alimentation Centrale 12V 10A 9 Ports',
    category: 'power',
    quantity: 1,
    unit: 'pcs',
    minThreshold: 1,
    unitCostMad: 160,
    location: 'Atelier',
    notes: 'Avec fusibles réarmables PTC et serrure à clé',
    updatedAt: new Date().toISOString().split('T')[0]
  },

  // Fixation & Droguerie
  {
    id: 'inv-11',
    name: 'Goulottes PVC 25x25 (Longueurs 2m)',
    category: 'hardware',
    quantity: 15,
    unit: 'pcs',
    minThreshold: 6,
    unitCostMad: 12,
    location: 'Voiture / Galerie',
    notes: 'Passage propre de câbles le long des plinthes',
    updatedAt: new Date().toISOString().split('T')[0]
  },
  {
    id: 'inv-12',
    name: 'Chevilles 6mm + Vis à tête fraisée',
    category: 'hardware',
    quantity: 3,
    unit: 'boxes',
    minThreshold: 1,
    unitCostMad: 25,
    location: 'Voiture / Coffre',
    notes: 'Boîtes de 100 unités',
    updatedAt: new Date().toISOString().split('T')[0]
  },
  {
    id: 'inv-13',
    name: 'Colliers Serre-câbles Rilsan 200mm (Sachets)',
    category: 'hardware',
    quantity: 4,
    unit: 'boxes',
    minThreshold: 2,
    unitCostMad: 15,
    location: 'Sacoche Outils',
    notes: 'Sachets de 100 colliers noirs anti-UV',
    updatedAt: new Date().toISOString().split('T')[0]
  }
];

export const INVENTORY_CATEGORIES: { key: InventoryCategory; label: string; iconName: string; color: string }[] = [
  { key: 'cabling', label: 'Câblage & Réseau', iconName: 'Network', color: 'text-sky-400' },
  { key: 'cctv', label: 'Vidéosurveillance & Sécurité', iconName: 'Camera', color: 'text-amber-400' },
  { key: 'power', label: 'Alimentations & Énergie', iconName: 'Zap', color: 'text-emerald-400' },
  { key: 'hardware', label: 'Fixation & Quincaillerie', iconName: 'Wrench', color: 'text-purple-400' },
  { key: 'other', label: 'Outillage & Divers', iconName: 'Package', color: 'text-slate-400' }
];

export const INVENTORY_UNITS: { key: InventoryUnit; label: string; short: string }[] = [
  { key: 'pcs', label: 'Pièces / Unités', short: 'pcs' },
  { key: 'meters', label: 'Mètres', short: 'm' },
  { key: 'boxes', label: 'Boîtes / Sachets', short: 'boîtes' },
  { key: 'rolls', label: 'Rouleaux / Bobines', short: 'roul.' }
];

export const loadInventory = (): InventoryItem[] => {
  try {
    const raw = localStorage.getItem(INVENTORY_STORAGE_KEY);
    if (!raw) {
      saveAllInventory(DEFAULT_INVENTORY_ITEMS);
      return DEFAULT_INVENTORY_ITEMS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    saveAllInventory(DEFAULT_INVENTORY_ITEMS);
    return DEFAULT_INVENTORY_ITEMS;
  } catch (err) {
    console.warn('Failed to parse inventory from localStorage, falling back to defaults:', err);
    return DEFAULT_INVENTORY_ITEMS;
  }
};

export const saveAllInventory = (items: InventoryItem[]): void => {
  try {
    localStorage.setItem(INVENTORY_STORAGE_KEY, JSON.stringify(items));
  } catch (err) {
    console.error('Failed to save inventory to localStorage:', err);
  }
};

export const saveInventoryItem = (item: InventoryItem): InventoryItem[] => {
  const current = loadInventory();
  const index = current.findIndex(i => i.id === item.id);
  const updatedItem: InventoryItem = {
    ...item,
    updatedAt: new Date().toISOString().split('T')[0]
  };

  let next: InventoryItem[];
  if (index >= 0) {
    next = [...current];
    next[index] = updatedItem;
  } else {
    next = [updatedItem, ...current];
  }
  saveAllInventory(next);
  return next;
};

export const adjustInventoryQuantity = (id: string, delta: number): InventoryItem[] => {
  const current = loadInventory();
  const next = current.map(item => {
    if (item.id === id) {
      const newQty = Math.max(0, item.quantity + delta);
      return {
        ...item,
        quantity: newQty,
        updatedAt: new Date().toISOString().split('T')[0]
      };
    }
    return item;
  });
  saveAllInventory(next);
  return next;
};

export const deleteInventoryItem = (id: string): InventoryItem[] => {
  const current = loadInventory();
  const next = current.filter(i => i.id !== id);
  saveAllInventory(next);
  return next;
};

export const resetInventoryToDefault = (): InventoryItem[] => {
  saveAllInventory(DEFAULT_INVENTORY_ITEMS);
  return DEFAULT_INVENTORY_ITEMS;
};
