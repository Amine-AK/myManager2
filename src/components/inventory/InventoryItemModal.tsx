import React, { useState, useEffect } from 'react';
import type { InventoryItem, InventoryCategory, InventoryUnit } from '../../types/inventory';
import { INVENTORY_CATEGORIES, INVENTORY_UNITS } from '../../lib/storage/inventoryRepository';
import { X, Package, Save } from 'lucide-react';

interface InventoryItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: InventoryItem) => void;
  itemToEdit?: InventoryItem | null;
}

export const InventoryItemModal: React.FC<InventoryItemModalProps> = ({
  isOpen,
  onClose,
  onSave,
  itemToEdit
}) => {
  const [name, setName] = useState('');
  const [category, setCategory] = useState<InventoryCategory>('cabling');
  const [quantity, setQuantity] = useState<number | ''>(1);
  const [unit, setUnit] = useState<InventoryUnit>('pcs');
  const [minThreshold, setMinThreshold] = useState<number | ''>(5);
  const [unitCostMad, setUnitCostMad] = useState<number | ''>('');
  const [location, setLocation] = useState('Voiture / Coffre');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (itemToEdit) {
      setName(itemToEdit.name);
      setCategory(itemToEdit.category);
      setQuantity(itemToEdit.quantity);
      setUnit(itemToEdit.unit);
      setMinThreshold(itemToEdit.minThreshold);
      setUnitCostMad(itemToEdit.unitCostMad ?? '');
      setLocation(itemToEdit.location || 'Voiture / Coffre');
      setNotes(itemToEdit.notes || '');
    } else {
      setName('');
      setCategory('cabling');
      setQuantity(1);
      setUnit('pcs');
      setMinThreshold(5);
      setUnitCostMad('');
      setLocation('Voiture / Coffre');
      setNotes('');
    }
  }, [itemToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const item: InventoryItem = {
      id: itemToEdit ? itemToEdit.id : `inv-${Date.now()}`,
      name: name.trim(),
      category,
      quantity: typeof quantity === 'number' ? Math.max(0, quantity) : 0,
      unit,
      minThreshold: typeof minThreshold === 'number' ? Math.max(0, minThreshold) : 1,
      unitCostMad: typeof unitCostMad === 'number' && unitCostMad > 0 ? unitCostMad : undefined,
      location: location.trim() || undefined,
      notes: notes.trim() || undefined,
      updatedAt: new Date().toISOString().split('T')[0]
    };

    onSave(item);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-5 sm:p-6 text-slate-100 space-y-4 max-h-[92vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-base text-slate-100">
                {itemToEdit ? "Modifier l'Article de Stock" : 'Nouvel Article en Stock'}
              </h3>
              <p className="text-xs text-slate-400">Consommables, matériel et droguerie</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Article Name */}
          <div>
            <label className="block text-slate-300 font-bold mb-1.5 uppercase tracking-wide">
              Nom de l'article / Matériel <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="ex: Câble UTP Cat6, Connecteur RJ45, Caméra Dôme..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 font-semibold text-sm focus:outline-none focus:border-amber-400"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-slate-300 font-bold mb-1.5 uppercase tracking-wide">
              Catégorie
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {INVENTORY_CATEGORIES.map((cat) => (
                <button
                  key={cat.key}
                  type="button"
                  onClick={() => setCategory(cat.key)}
                  className={`px-3 py-2 rounded-xl text-left border font-bold transition text-xs flex items-center justify-between ${
                    category === cat.key
                      ? 'bg-amber-500/20 border-amber-400 text-amber-300 shadow-sm'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <span className="truncate">{cat.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Quantity & Unit */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-bold mb-1.5 uppercase tracking-wide">
                Quantité en stock
              </label>
              <input
                type="number"
                min="0"
                step="any"
                required
                value={quantity}
                onChange={(e) => setQuantity(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 font-bold text-sm focus:outline-none focus:border-amber-400"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-bold mb-1.5 uppercase tracking-wide">
                Unité de mesure
              </label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value as InventoryUnit)}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 font-bold text-sm focus:outline-none focus:border-amber-400"
              >
                {INVENTORY_UNITS.map((u) => (
                  <option key={u.key} value={u.key}>
                    {u.label} ({u.short})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Threshold & Unit Cost */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-bold mb-1.5 uppercase tracking-wide flex items-center justify-between">
                <span>Seuil Alerte Faible</span>
                <span className="text-amber-400 font-normal text-[11px]">⚠️ Alerte</span>
              </label>
              <input
                type="number"
                min="0"
                step="any"
                required
                value={minThreshold}
                onChange={(e) => setMinThreshold(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 font-bold text-sm focus:outline-none focus:border-amber-400"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-bold mb-1.5 uppercase tracking-wide">
                Prix unitaire (MAD) <span className="text-slate-500 font-normal">Optionnel</span>
              </label>
              <input
                type="number"
                min="0"
                step="any"
                placeholder="ex: 25"
                value={unitCostMad}
                onChange={(e) => setUnitCostMad(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 font-bold text-sm focus:outline-none focus:border-amber-400"
              />
            </div>
          </div>

          {/* Location */}
          <div>
            <label className="block text-slate-300 font-bold mb-1.5 uppercase tracking-wide">
              Emplacement
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {['Voiture / Coffre', 'Atelier', 'Sacoche Outils', 'Chantier'].map((loc) => (
                <button
                  key={loc}
                  type="button"
                  onClick={() => setLocation(loc)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition ${
                    location === loc
                      ? 'bg-slate-800 border-amber-400 text-amber-300'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {loc}
                </button>
              ))}
            </div>
            <input
              type="text"
              placeholder="Emplacement personnalisé..."
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 font-semibold focus:outline-none focus:border-amber-400"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-slate-300 font-bold mb-1.5 uppercase tracking-wide">
              Notes techniques & Références
            </label>
            <textarea
              rows={2}
              placeholder="Marque, spécifications, fournisseur..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 focus:outline-none focus:border-amber-400"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl transition min-h-[44px]"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="flex-1 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl transition shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 min-h-[44px]"
            >
              <Save className="w-4 h-4" />
              <span>{itemToEdit ? 'Enregistrer Modif' : 'Ajouter au Stock'}</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
