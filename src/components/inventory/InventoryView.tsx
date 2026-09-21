import React, { useState } from 'react';
import type { InventoryItem, InventoryCategory } from '../../types/inventory';
import {
  INVENTORY_CATEGORIES,
  INVENTORY_UNITS
} from '../../lib/storage/inventoryRepository';
import { InventoryItemModal } from './InventoryItemModal';
import {
  Package,
  Plus,
  Search,
  AlertTriangle,
  Trash2,
  Pencil,
  RotateCcw,
  MapPin,
  Coins
} from 'lucide-react';

interface InventoryViewProps {
  inventory: InventoryItem[];
  onSaveItem: (item: InventoryItem) => void;
  onAdjustQuantity: (id: string, delta: number) => void;
  onDeleteItem: (id: string) => void;
  onResetToDefaults: () => void;
}

export const InventoryView: React.FC<InventoryViewProps> = ({
  inventory,
  onSaveItem,
  onAdjustQuantity,
  onDeleteItem,
  onResetToDefaults
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<InventoryCategory | 'all' | 'low_stock'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [itemToEdit, setItemToEdit] = useState<InventoryItem | null>(null);

  // Compute metrics
  const totalItemsCount = inventory.length;
  const lowStockItems = inventory.filter(i => i.quantity <= i.minThreshold);
  const lowStockCount = lowStockItems.length;
  const totalStockValueMad = inventory.reduce((sum, item) => {
    return sum + (item.unitCostMad ? item.quantity * item.unitCostMad : 0);
  }, 0);

  // Filter items
  const filteredItems = inventory.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.notes || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.location || '').toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    if (selectedCategory === 'all') return true;
    if (selectedCategory === 'low_stock') return item.quantity <= item.minThreshold;
    return item.category === selectedCategory;
  });

  const handleOpenAdd = () => {
    setItemToEdit(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: InventoryItem) => {
    setItemToEdit(item);
    setIsModalOpen(true);
  };

  const getUnitShort = (unit: string) => {
    const found = INVENTORY_UNITS.find(u => u.key === unit);
    return found ? found.short : unit;
  };

  return (
    <div className="max-w-6xl mx-auto space-y-5 animate-fadeIn select-none">
      
      {/* Top Banner & KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        {/* Total Stock Value */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-lg flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Valeur Estimée du Stock
            </span>
            <div className="text-2xl sm:text-3xl font-black text-amber-400 tracking-tight">
              {Math.round(totalStockValueMad).toLocaleString('fr-MA')} MAD
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Fournitures & consommables en stock</p>
          </div>
          <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Coins className="w-6 h-6" />
          </div>
        </div>

        {/* Total Articles Count */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-lg flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Articles Référencés
            </span>
            <div className="text-2xl sm:text-3xl font-black text-slate-100 tracking-tight">
              {totalItemsCount}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Câbles, caméras, connectique, etc.</p>
          </div>
          <div className="p-3 rounded-2xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
            <Package className="w-6 h-6" />
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div className={`border rounded-2xl p-4 sm:p-5 shadow-lg flex items-center justify-between transition ${
          lowStockCount > 0
            ? 'bg-rose-950/20 border-rose-500/40 text-rose-300'
            : 'bg-slate-900 border-slate-800 text-slate-100'
        }`}>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider block mb-1">
              {lowStockCount > 0 ? '⚠️ À Réapprovisionner' : 'Niveau de Stock'}
            </span>
            <div className={`text-2xl sm:text-3xl font-black tracking-tight ${
              lowStockCount > 0 ? 'text-rose-400' : 'text-emerald-400'
            }`}>
              {lowStockCount} {lowStockCount === 1 ? 'article bas' : 'articles bas'}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              {lowStockCount > 0 ? 'Quantité ≤ Seuil minimal' : 'Tous les stocks sont suffisants'}
            </p>
          </div>
          <div className={`p-3 rounded-2xl border ${
            lowStockCount > 0
              ? 'bg-rose-500/20 text-rose-400 border-rose-500/30 animate-pulse'
              : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
          }`}>
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Action Bar: Search, Category Filters & Add Button */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Search input */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Rechercher un article, câble, emplacement..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-sm placeholder-slate-500 focus:outline-none focus:border-amber-400"
            />
          </div>

          {/* Add Article Button */}
          <button
            onClick={handleOpenAdd}
            className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs sm:text-sm transition shadow-md shadow-amber-500/20 active:scale-98 min-h-[44px]"
          >
            <Plus className="w-4 h-4" />
            <span>Nouvel Article</span>
          </button>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none text-xs">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 rounded-xl font-bold transition border flex-shrink-0 ${
              selectedCategory === 'all'
                ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            Tous ({totalItemsCount})
          </button>

          {lowStockCount > 0 && (
            <button
              onClick={() => setSelectedCategory('low_stock')}
              className={`px-3 py-1.5 rounded-xl font-bold transition border flex-shrink-0 flex items-center gap-1.5 ${
                selectedCategory === 'low_stock'
                  ? 'bg-rose-500/20 border-rose-400 text-rose-300'
                  : 'bg-slate-950 border-rose-500/30 text-rose-400 hover:bg-rose-500/10'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Stock Faible ({lowStockCount})</span>
            </button>
          )}

          {INVENTORY_CATEGORIES.map((cat) => {
            const count = inventory.filter(i => i.category === cat.key).length;
            return (
              <button
                key={cat.key}
                onClick={() => setSelectedCategory(cat.key)}
                className={`px-3 py-1.5 rounded-xl font-bold transition border flex-shrink-0 ${
                  selectedCategory === cat.key
                    ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {cat.label} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Inventory Items Grid */}
      {filteredItems.length === 0 ? (
        <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-3xl space-y-3">
          <Package className="w-12 h-12 text-slate-600 mx-auto" />
          <h3 className="text-base font-bold text-slate-300">Aucun article trouvé</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {searchTerm
              ? 'Aucun matériel ne correspond à votre recherche.'
              : 'Aucun article dans cette catégorie.'}
          </p>
          <button
            onClick={handleOpenAdd}
            className="px-4 py-2 rounded-xl bg-amber-500/20 border border-amber-400/30 text-amber-300 font-bold text-xs hover:bg-amber-500/30 transition"
          >
            + Ajouter un article
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
          {filteredItems.map((item) => {
            const isLowStock = item.quantity <= item.minThreshold;
            const categoryMeta = INVENTORY_CATEGORIES.find(c => c.key === item.category);

            // Determine dynamic step amounts based on unit
            const isMeters = item.unit === 'meters';
            const smallDelta = isMeters ? 10 : 1;
            const largeDelta = isMeters ? 50 : 5;

            return (
              <div
                key={item.id}
                className={`bg-slate-900 border rounded-2xl p-4 sm:p-5 shadow-md flex flex-col justify-between transition ${
                  isLowStock
                    ? 'border-rose-500/40 bg-gradient-to-br from-slate-900 to-rose-950/20'
                    : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                {/* Card Top: Badges, Title & Edit/Delete */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-slate-950 text-slate-400 border border-slate-800">
                        {categoryMeta?.label || item.category}
                      </span>
                      {isLowStock && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center gap-1 animate-pulse">
                          <AlertTriangle className="w-3 h-3" />
                          Stock Faible (Seuil: {item.minThreshold})
                        </span>
                      )}
                    </div>

                    {/* Edit / Delete actions */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEdit(item)}
                        className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded-lg transition"
                        title="Modifier"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          if (window.confirm(`Supprimer l'article "${item.name}" du stock ?`)) {
                            onDeleteItem(item.id);
                          }
                        }}
                        className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition"
                        title="Supprimer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Title & Notes */}
                  <div>
                    <h4 className="text-base sm:text-lg font-black text-slate-100 leading-snug">
                      {item.name}
                    </h4>
                    {item.notes && (
                      <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{item.notes}</p>
                    )}
                  </div>

                  {/* Location & Unit cost strip */}
                  <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400 pt-1">
                    {item.location && (
                      <span className="flex items-center gap-1 text-slate-300">
                        <MapPin className="w-3 h-3 text-amber-400" />
                        {item.location}
                      </span>
                    )}
                    {item.unitCostMad && (
                      <span className="text-slate-400">
                        P.U. : <strong className="text-slate-200">{item.unitCostMad} MAD</strong>
                      </span>
                    )}
                    {item.unitCostMad && (
                      <span className="text-slate-500">
                        Total : <strong className="text-amber-400">{Math.round(item.quantity * item.unitCostMad)} MAD</strong>
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Bottom: Quantity & 1-Tap Adjust Buttons */}
                <div className="pt-4 mt-3 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  {/* Current Quantity */}
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-xs text-slate-400 font-bold uppercase">En Stock:</span>
                    <span className={`text-2xl font-black tracking-tight ${
                      isLowStock ? 'text-rose-400' : 'text-emerald-400'
                    }`}>
                      {item.quantity}
                    </span>
                    <span className="text-xs font-extrabold text-slate-400">
                      {getUnitShort(item.unit)}
                    </span>
                  </div>

                  {/* 1-Tap Tactile Buttons (Minus / Plus) */}
                  <div className="flex items-center gap-1.5">
                    {/* Large decrement if meters/pcs */}
                    {largeDelta > 1 && (
                      <button
                        type="button"
                        onClick={() => onAdjustQuantity(item.id, -largeDelta)}
                        disabled={item.quantity <= 0}
                        className="px-2.5 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 disabled:opacity-30 border border-slate-800 text-slate-300 text-xs font-bold transition min-h-[42px]"
                        title={`Consommer -${largeDelta} ${getUnitShort(item.unit)}`}
                      >
                        -{largeDelta}
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => onAdjustQuantity(item.id, -smallDelta)}
                      disabled={item.quantity <= 0}
                      className="px-3.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 disabled:opacity-30 border border-rose-500/30 text-rose-300 text-xs font-bold transition min-h-[42px] flex items-center justify-center"
                      title={`Consommer -${smallDelta} ${getUnitShort(item.unit)}`}
                    >
                      -{smallDelta}
                    </button>

                    <button
                      type="button"
                      onClick={() => onAdjustQuantity(item.id, smallDelta)}
                      className="px-3.5 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-300 text-xs font-bold transition min-h-[42px] flex items-center justify-center shadow-sm"
                      title={`Ajouter +${smallDelta} ${getUnitShort(item.unit)} (Achat droguerie)`}
                    >
                      +{smallDelta}
                    </button>

                    {/* Large increment */}
                    {largeDelta > 1 && (
                      <button
                        type="button"
                        onClick={() => onAdjustQuantity(item.id, largeDelta)}
                        className="px-2.5 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs font-bold transition min-h-[42px]"
                        title={`Ajouter +${largeDelta} ${getUnitShort(item.unit)}`}
                      >
                        +{largeDelta}
                      </button>
                    )}
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* Footer Tools: Reset to Default Starter Kit */}
      <div className="pt-4 flex items-center justify-between text-xs text-slate-500 border-t border-slate-800/80">
        <p>Gestion de stock locale 100% hors-ligne (Local-First)</p>
        <button
          onClick={() => {
            if (window.confirm('Voulez-vous réinitialiser la liste avec le Kit Matériel de démarrage par défaut ?')) {
              onResetToDefaults();
            }
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 transition"
        >
          <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
          <span>Réinitialiser Kit Matériel</span>
        </button>
      </div>

      {/* Modal: Add or Edit Inventory Item */}
      <InventoryItemModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={onSaveItem}
        itemToEdit={itemToEdit}
      />

    </div>
  );
};
