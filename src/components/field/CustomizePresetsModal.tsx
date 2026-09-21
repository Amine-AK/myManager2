import React, { useState } from 'react';
import type { FieldPresetsConfig, DelayPresetItem, DurationPresetItem, ExpensePresetItem } from '../../lib/storage/fieldPresets';
import { X, Plus, Trash2, RotateCcw, Check, Settings2 } from 'lucide-react';

interface CustomizePresetsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: FieldPresetsConfig;
  onSave: (newConfig: FieldPresetsConfig) => void;
  onReset: () => void;
}

export const CustomizePresetsModal: React.FC<CustomizePresetsModalProps> = ({
  isOpen,
  onClose,
  config,
  onSave,
  onReset
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'delays' | 'durations' | 'expenses'>('delays');
  const [delays, setDelays] = useState<DelayPresetItem[]>(config.delays);
  const [durations, setDurations] = useState<DurationPresetItem[]>(config.durations);
  const [expenses, setExpenses] = useState<ExpensePresetItem[]>(config.expenses);

  // New item inputs
  const [newDelayLabel, setNewDelayLabel] = useState('');
  const [newDurationMinutes, setNewDurationMinutes] = useState<number | ''>('');
  const [newExpenseAmount, setNewExpenseAmount] = useState<number | ''>('');

  if (!isOpen) return null;

  // Add delay item
  const handleAddDelay = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDelayLabel.trim()) return;
    const newItem: DelayPresetItem = {
      id: `custom-d-${Date.now()}`,
      key: newDelayLabel.trim().toUpperCase().replace(/\s+/g, '_').slice(0, 30),
      label: newDelayLabel.trim()
    };
    setDelays([...delays, newItem]);
    setNewDelayLabel('');
  };

  const handleRemoveDelay = (id: string) => {
    setDelays(delays.filter(d => d.id !== id));
  };

  // Add duration item
  const handleAddDuration = (e: React.FormEvent) => {
    e.preventDefault();
    if (typeof newDurationMinutes !== 'number' || newDurationMinutes <= 0) return;
    const label = newDurationMinutes >= 60
      ? `${Math.floor(newDurationMinutes / 60)}h${newDurationMinutes % 60 ? newDurationMinutes % 60 : ''}`
      : `${newDurationMinutes} min`;
    const newItem: DurationPresetItem = {
      id: `custom-dur-${Date.now()}`,
      minutes: newDurationMinutes,
      label
    };
    setDurations([...durations, newItem].sort((a, b) => a.minutes - b.minutes));
    setNewDurationMinutes('');
  };

  const handleRemoveDuration = (id: string) => {
    setDurations(durations.filter(d => d.id !== id));
  };

  // Add expense item
  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (typeof newExpenseAmount !== 'number' || newExpenseAmount <= 0) return;
    const newItem: ExpensePresetItem = {
      id: `custom-exp-${Date.now()}`,
      amount: newExpenseAmount,
      label: `${newExpenseAmount} MAD`
    };
    setExpenses([...expenses, newItem].sort((a, b) => a.amount - b.amount));
    setNewExpenseAmount('');
  };

  const handleRemoveExpense = (id: string) => {
    setExpenses(expenses.filter(e => e.id !== id));
  };

  const handleSaveAll = () => {
    onSave({
      delays,
      durations,
      expenses
    });
    onClose();
  };

  const handleResetAll = () => {
    if (window.confirm('Réinitialiser toutes les listes de presets par défaut ?')) {
      onReset();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh] overflow-hidden text-slate-100">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Settings2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-100">Personnaliser les Listes</h3>
              <p className="text-xs text-slate-400">Modifier les boutons et chips du Mode Chantier</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sub-tabs */}
        <div className="flex border-b border-slate-800 bg-slate-900/50 px-4 pt-2 gap-2 text-xs font-semibold">
          <button
            onClick={() => setActiveSubTab('delays')}
            className={`px-3 py-2 border-b-2 transition ${
              activeSubTab === 'delays'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Motifs Retard ({delays.length})
          </button>
          <button
            onClick={() => setActiveSubTab('durations')}
            className={`px-3 py-2 border-b-2 transition ${
              activeSubTab === 'durations'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Durées ({durations.length})
          </button>
          <button
            onClick={() => setActiveSubTab('expenses')}
            className={`px-3 py-2 border-b-2 transition ${
              activeSubTab === 'expenses'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Dépenses Cash ({expenses.length})
          </button>
        </div>

        {/* Content area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {activeSubTab === 'delays' && (
            <div className="space-y-3">
              <form onSubmit={handleAddDelay} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Ex: Accès toiture refusé..."
                  value={newDelayLabel}
                  onChange={(e) => setNewDelayLabel(e.target.value)}
                  className="flex-1 px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-sm focus:outline-none focus:border-amber-400"
                />
                <button
                  type="submit"
                  disabled={!newDelayLabel.trim()}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-amber-500 text-slate-950 font-bold text-sm hover:bg-amber-400 disabled:opacity-50 transition"
                >
                  <Plus className="w-4 h-4" />
                  <span>Ajouter</span>
                </button>
              </form>

              <div className="space-y-2">
                {delays.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-slate-700 transition text-sm"
                  >
                    <span className="font-medium text-slate-200">{item.label}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveDelay(item.id)}
                      className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
                      title="Supprimer ce motif"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeSubTab === 'durations' && (
            <div className="space-y-3">
              <form onSubmit={handleAddDuration} className="flex gap-2">
                <input
                  type="number"
                  min="5"
                  max="480"
                  step="5"
                  placeholder="Durée en minutes (ex: 20)"
                  value={newDurationMinutes}
                  onChange={(e) => setNewDurationMinutes(e.target.value ? Number(e.target.value) : '')}
                  className="flex-1 px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-sm focus:outline-none focus:border-amber-400"
                />
                <button
                  type="submit"
                  disabled={typeof newDurationMinutes !== 'number' || newDurationMinutes <= 0}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-amber-500 text-slate-950 font-bold text-sm hover:bg-amber-400 disabled:opacity-50 transition"
                >
                  <Plus className="w-4 h-4" />
                  <span>Ajouter</span>
                </button>
              </form>

              <div className="grid grid-cols-2 gap-2">
                {durations.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-slate-950/70 border border-slate-800 text-sm"
                  >
                    <span className="font-bold text-amber-400">{item.label}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveDuration(item.id)}
                      className="p-1 text-slate-500 hover:text-rose-400 transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeSubTab === 'expenses' && (
            <div className="space-y-3">
              <form onSubmit={handleAddExpense} className="flex gap-2">
                <input
                  type="number"
                  min="5"
                  step="5"
                  placeholder="Montant en MAD (ex: 75)"
                  value={newExpenseAmount}
                  onChange={(e) => setNewExpenseAmount(e.target.value ? Number(e.target.value) : '')}
                  className="flex-1 px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-sm focus:outline-none focus:border-amber-400"
                />
                <button
                  type="submit"
                  disabled={typeof newExpenseAmount !== 'number' || newExpenseAmount <= 0}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-amber-500 text-slate-950 font-bold text-sm hover:bg-amber-400 disabled:opacity-50 transition"
                >
                  <Plus className="w-4 h-4" />
                  <span>Ajouter</span>
                </button>
              </form>

              <div className="grid grid-cols-2 gap-2">
                {expenses.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-slate-950/70 border border-slate-800 text-sm"
                  >
                    <span className="font-bold text-emerald-400">{item.label}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveExpense(item.id)}
                      className="p-1 text-slate-500 hover:text-rose-400 transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleResetAll}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Réinitialiser par défaut</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-300 hover:bg-slate-800 text-sm font-semibold transition"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={handleSaveAll}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/20 transition"
            >
              <Check className="w-4 h-4" />
              <span>Enregistrer</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
