import React, { useState } from 'react';
import type { TodoItem, TodoCategory, TodoPriority } from '../../types';
import { CATEGORY_METADATA } from '../../lib/storage/todoRepository';
import { X, CheckSquare, Phone, Calendar, DollarSign, AlertCircle, User } from 'lucide-react';

interface QuickTodoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveTodo: (todo: TodoItem) => void;
  initialCategory?: TodoCategory;
  initialClientName?: string;
  initialClientPhone?: string;
}

export const QuickTodoModal: React.FC<QuickTodoModalProps> = ({
  isOpen,
  onClose,
  onSaveTodo,
  initialCategory = 'CALL_CLIENT',
  initialClientName = '',
  initialClientPhone = ''
}) => {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<TodoCategory>(initialCategory);
  const [priority, setPriority] = useState<TodoPriority>('normal');
  const [dueDate, setDueDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [clientName, setClientName] = useState(initialClientName);
  const [clientPhone, setClientPhone] = useState(initialClientPhone);
  const [estimatedAmount, setEstimatedAmount] = useState<string>('');
  const [notes, setNotes] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const newTodo: TodoItem = {
      id: `todo-${Date.now()}`,
      title: title.trim(),
      category,
      priority,
      completed: false,
      dueDate: dueDate || undefined,
      clientName: clientName.trim() || undefined,
      clientPhone: clientPhone.trim() || undefined,
      estimatedAmount: estimatedAmount ? parseFloat(estimatedAmount) : undefined,
      notes: notes.trim() || undefined,
      createdAt: new Date().toISOString()
    };

    onSaveTodo(newTodo);
    handleReset();
    onClose();
  };

  const handleReset = () => {
    setTitle('');
    setCategory('CALL_CLIENT');
    setPriority('normal');
    setDueDate(new Date().toISOString().split('T')[0]);
    setClientName('');
    setClientPhone('');
    setEstimatedAmount('');
    setNotes('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-4 sm:p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <CheckSquare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-100 flex items-center gap-2">
                Nouvelle Tâche / Rappel
                <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-mono">
                  &lt;10s
                </span>
              </h3>
              <p className="text-xs text-slate-400">Rappeler un client, planifier un chantier ou matériel</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Category Chips */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">Type de Tâche</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
              {(Object.keys(CATEGORY_METADATA) as TodoCategory[]).map(catKey => {
                const meta = CATEGORY_METADATA[catKey];
                const isSelected = category === catKey;
                return (
                  <button
                    key={catKey}
                    type="button"
                    onClick={() => setCategory(catKey)}
                    className={`flex items-center gap-1.5 px-2.5 py-2 rounded-xl text-xs font-bold border transition text-left ${
                      isSelected
                        ? `${meta.badgeColor} border-current font-extrabold ring-1 ring-amber-400/50`
                        : 'bg-slate-800/60 border-slate-700/60 text-slate-400 hover:border-slate-600 hover:text-slate-200'
                    }`}
                  >
                    <span className="text-sm">{meta.iconLabel}</span>
                    <span className="truncate">{meta.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Title Field */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Description / Action <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="ex: Rappeler pour tester liaison NVR à distance"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
              autoFocus
            />
          </div>

          {/* Client Name & Phone (especially important for CALL_CLIENT) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1 flex items-center gap-1">
                <User className="w-3.5 h-3.5" /> Client / Interlocuteur
              </label>
              <input
                type="text"
                placeholder="ex: M. Tazi (Villa Hay Riad)"
                value={clientName}
                onChange={e => setClientName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1 flex items-center gap-1">
                <Phone className="w-3.5 h-3.5 text-sky-400" /> N° Téléphone (1-tap dial)
              </label>
              <input
                type="tel"
                placeholder="ex: 0661123456"
                value={clientPhone}
                onChange={e => setClientPhone(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-400 font-mono"
              />
            </div>
          </div>

          {/* Due Date, Priority, Amount */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" /> Échéance
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs sm:text-sm text-slate-100 focus:outline-none focus:border-amber-400"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" /> Priorité
              </label>
              <select
                value={priority}
                onChange={e => setPriority(e.target.value as TodoPriority)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs sm:text-sm text-slate-100 focus:outline-none focus:border-amber-400"
              >
                <option value="urgent">🔴 Urgent</option>
                <option value="normal">🟡 Normal</option>
                <option value="low">⚪ Faible</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1 flex items-center gap-1">
                <DollarSign className="w-3.5 h-3.5 text-emerald-400" /> Montant / Coût (MAD)
              </label>
              <input
                type="number"
                min="0"
                step="10"
                placeholder="ex: 1500"
                value={estimatedAmount}
                onChange={e => setEstimatedAmount(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-400"
              />
            </div>
          </div>

          {/* Detailed Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Notes / Détails</label>
            <textarea
              rows={2}
              placeholder="Détails techniques, références matériel, adresse..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs sm:text-sm text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-xl transition"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs sm:text-sm transition shadow-lg shadow-amber-500/20 active:scale-95"
            >
              <CheckSquare className="w-4 h-4" />
              <span>Enregistrer la Tâche</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
