import React, { useState } from 'react';
import { X, Briefcase, Home, Check, DollarSign, Coffee, Gamepad2 } from 'lucide-react';
import type { BusinessExpense, PersonalExpense, BusinessExpenseCategory, PersonalExpenseCategory } from '../../types';
import {
  BUSINESS_EXPENSE_CATEGORIES as BIZ_CATEGORIES,
  HOUSEHOLD_EXPENSE_CATEGORIES as HOUSEHOLD_CATEGORIES,
  INDIVIDUAL_EXPENSE_CATEGORIES as INDIVIDUAL_CATEGORIES,
  PERSONAL_EXPENSE_CATEGORIES as PERSONAL_CATEGORIES
} from '../../lib/expenseOptions';

interface QuickExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveBusinessExpense: (exp: BusinessExpense) => Promise<void>;
  onSavePersonalExpense: (exp: PersonalExpense) => Promise<void>;
}

const QUICK_AMOUNTS = [10, 20, 50, 100, 200, 500];

export const QuickExpenseModal: React.FC<QuickExpenseModalProps> = ({
  isOpen,
  onClose,
  onSaveBusinessExpense,
  onSavePersonalExpense
}) => {
  const [expenseType, setExpenseType] = useState<'business' | 'personal'>('business');
  const [amount, setAmount] = useState<string>('');
  const [title, setTitle] = useState<string>('');
  const [category, setCategory] = useState<string>(BIZ_CATEGORIES[1]);
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) return;

    setSubmitting(true);
    try {
      const id = `exp-${Date.now()}`;
      const expenseTitle = title.trim() || (expenseType === 'business' ? category : category);

      if (expenseType === 'business') {
        await onSaveBusinessExpense({
          id,
          title: expenseTitle,
          amount: numAmount,
          category: category as BusinessExpenseCategory,
          date
        });
      } else {
        await onSavePersonalExpense({
          id,
          title: expenseTitle,
          amount: numAmount,
          category: category as PersonalExpenseCategory,
          date
        });
      }

      // Reset and close
      setAmount('');
      setTitle('');
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  const setPersonalPreset = (cat: PersonalExpenseCategory, defaultAmt: number, defaultTitle: string) => {
    setExpenseType('personal');
    setCategory(cat);
    setAmount(defaultAmt.toString());
    setTitle(defaultTitle);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/80 backdrop-blur-sm p-0 sm:p-4">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-t-2xl sm:rounded-2xl shadow-2xl p-5 text-slate-100 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Log New Expense</h2>
              <p className="text-xs text-slate-400">Target entry time: &lt; 10 seconds</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Business vs Personal Toggle */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              EXPENSE TYPE (STRICT SEPARATION)
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setExpenseType('business');
                  setCategory(BIZ_CATEGORIES[1]);
                }}
                className={`flex items-center justify-center gap-2 py-3 rounded-xl border text-sm font-semibold transition ${
                  expenseType === 'business'
                    ? 'bg-amber-500/20 border-amber-500 text-amber-400'
                    : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:bg-slate-800'
                }`}
              >
                <Briefcase className="w-4 h-4" />
                Work Expense
              </button>
              <button
                type="button"
                onClick={() => {
                  setExpenseType('personal');
                  setCategory(PERSONAL_CATEGORIES[0]);
                }}
                className={`flex items-center justify-center gap-2 py-3 rounded-xl border text-sm font-semibold transition ${
                  expenseType === 'personal'
                    ? 'bg-rose-500/20 border-rose-500 text-rose-400'
                    : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:bg-slate-800'
                }`}
              >
                <Home className="w-4 h-4" />
                Household / Personal
              </button>
            </div>
          </div>

          {/* Quick Preset Shortcuts for Café, Gaming & Personal Spending */}
          {expenseType === 'personal' && (
            <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 space-y-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                ⚡ Quick Personal Presets (&lt; 5 seconds)
              </span>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setPersonalPreset('Café & Snacks (Café / Thé / Snacks)', 15, 'Café & Thé')}
                  className="px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-lg text-xs font-semibold flex items-center gap-1 transition"
                >
                  <Coffee className="w-3.5 h-3.5" />
                  Café (15 MAD)
                </button>
                <button
                  type="button"
                  onClick={() => setPersonalPreset('Gaming & Entertainment (Gaming / Loisirs)', 50, 'Gaming / PS5 / Steam')}
                  className="px-2.5 py-1 bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded-lg text-xs font-semibold flex items-center gap-1 transition"
                >
                  <Gamepad2 className="w-3.5 h-3.5" />
                  Gaming (50 MAD)
                </button>
                <button
                  type="button"
                  onClick={() => setPersonalPreset('Food & Groceries (Alimentation)', 100, 'Epicerie / Marjane')}
                  className="px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-lg text-xs font-semibold transition"
                >
                  Groceries (100 MAD)
                </button>
                <button
                  type="button"
                  onClick={() => setPersonalPreset('Utilities & Phone (Eau, Électricité, Recharge)', 20, 'Recharge Telecom')}
                  className="px-2.5 py-1 bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded-lg text-xs font-semibold transition"
                >
                  Recharge (20 MAD)
                </button>
              </div>
            </div>
          )}

          {/* Amount Input with Large Numeric Focus */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              AMOUNT (MAD / د.م.) *
            </label>
            <div className="relative">
              <input
                type="number"
                step="any"
                required
                autoFocus
                placeholder="0.00"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                className="w-full pl-4 pr-16 py-3.5 bg-slate-950 border border-slate-700 rounded-xl text-2xl font-bold text-emerald-400 focus:outline-none focus:border-emerald-500 placeholder-slate-600"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                MAD
              </span>
            </div>

            {/* Quick Amount Chips */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {QUICK_AMOUNTS.map(val => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setAmount(val.toString())}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-semibold text-slate-300 transition"
                >
                  +{val} MAD
                </button>
              ))}
            </div>
          </div>

          {/* Description (Optional) */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              DESCRIPTION / ITEM NAME
            </label>
            <input
              type="text"
              placeholder={expenseType === 'business' ? 'e.g. Fuel, droguerie supplies' : 'e.g. Café, Gaming subscription, groceries'}
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-slate-500"
            />
          </div>

          {/* Category Dropdown */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              CATEGORY
            </label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-slate-500"
            >
              {expenseType === 'business' ? (
                BIZ_CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))
              ) : (
                <>
                  <optgroup label="Household (Family)">
                    {HOUSEHOLD_CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Personal (Just Me)">
                    {INDIVIDUAL_CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </optgroup>
                </>
              )}
            </select>
          </div>

          {/* Date Picker (Defaults to today) */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              DATE
            </label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-slate-500"
            />
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={submitting || !amount}
              className="w-full flex items-center justify-center gap-2 py-3.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold rounded-xl shadow-lg transition"
            >
              <Check className="w-5 h-5" />
              {submitting ? 'Saving...' : 'Save Expense (< 10s)'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
