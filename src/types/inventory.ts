// ==========================================
// INVENTORY & CONSUMABLES SCHEMAS
// Specialized for CCTV, Network & Electronics Technicians
// ==========================================

export type InventoryCategory =
  | 'cabling'   // Câblage & Réseau (UTP Cat6, Coaxial KX6, fibre)
  | 'cctv'      // Vidéosurveillance & Sécurité (Caméras, NVR, DVR, HDD)
  | 'power'     // Alimentations & Énergie (12V 2A, 12V 5A, boîtiers d'alim)
  | 'hardware'  // Fixation & Droguerie (Goulottes, chevilles, vis, colliers)
  | 'other';    // Outillage & Divers

export type InventoryUnit =
  | 'pcs'       // Pièces / Unités
  | 'meters'    // Mètres (câbles, goulottes)
  | 'boxes'     // Boîtes (chevilles, vis)
  | 'rolls';    // Rouleaux / Bobines (câbles, scotch isolant)

export interface InventoryItem {
  id: string;
  name: string;
  category: InventoryCategory;
  quantity: number;
  unit: InventoryUnit;
  minThreshold: number;       // Alert threshold: if quantity <= minThreshold => low stock
  unitCostMad?: number;       // Average purchase price in MAD
  location?: string;          // e.g. "Voiture / Coffre", "Atelier", "Sacoche"
  notes?: string;
  updatedAt: string;          // ISO date YYYY-MM-DD
}
