import React, { useState } from 'react';
import type { FinancialMetrics, DebtObligation, DebtPayment, DebtType } from '../../types';
import {
  PiggyBank,
  Plus,
  Trash2,
  CheckCircle2,
  Building,
  User,
  ShoppingBag,
  CreditCard
} from 'lucide-react';

interface DebtViewProps {
  metrics: FinancialMetrics;
  debts: DebtObligation[];
  debtPayments: DebtPayment[];
  onSaveDebtObligation: (debt: DebtObligation) => Promise<void>;
  onDeleteDebtObligation: (id: string) => Promise<void>;
  onOpenQuickDebtPayment: () => void;
}

export const DebtView: React.FC<DebtViewProps> = ({
  metrics,
  debts,
  debtPayments,
  onSaveDebtObligation,
  onDeleteDebtObligation,
  onOpenQuickDebtPayment
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [creditor, setCreditor] = useState('');
  const [type, setType] = useState<DebtType>('business_supplier');
  const [totalAmount, setTotalAmount] = useState('');
  const [remainingBalance, setRemainingBalance] = useState('');
  const [monthlyMinPayment, setMonthlyMinPayment] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const activeDebts = debts.filter(d => d.status === 'active');
  const totalDebtBurden = metrics.totalDebtOutstanding;

  const handleAddDebt = async (e: React.FormEvent) => {
    e.preventDefault();
    const totNum = parseFloat(totalAmount);
    const remNum = parseFloat(remainingBalance) || totNum;
    if (!creditor.trim() || isNaN(totNum) || totNum <= 0) return;

    setSubmitting(true);
    try {
      await onSaveDebtObligation({
        id: `debt-${Date.now()}`,
        creditor: creditor.trim(),
        type,
        totalAmount: totNum,
        remainingBalance: remNum,
        monthlyMinPayment: parseFloat(monthlyMinPayment) || undefined,
        dueDate: dueDate || undefined,
        status: remNum <= 0 ? 'paid_off' : 'active',
        notes: notes.trim() || undefined
      });

      setCreditor('');
      setTotalAmount('');
      setRemainingBalance('');
      setMonthlyMinPayment('');
      setDueDate('');
      setNotes('');
      setShowAddModal(false);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteDebt = async (debt: DebtObligation) => {
    const payments = debtPayments.filter(p => p.debtId === debt.id);
    if (payments.length > 0) {
      const total = payments.reduce((sum, p) => sum + p.amount, 0);
      alert(`Cannot delete debt "${debt.creditor}": it has ${payments.length} payment${payments.length === 1 ? '' : 's'} totaling ${total} MAD recorded. Remove those first if you really need to delete this debt.`);
      return;
    }
    if (!confirm(`Delete debt record for "${debt.creditor}"?`)) return;
    try {
      await onDeleteDebtObligation(debt.id);
    } catch (err) {
      alert(err instanceof Error ? err.message : `Failed to delete debt "${debt.creditor}".`);
    }
  };

  const getDebtIcon = (t: DebtType) => {
    switch (t) {
      case 'business_supplier':
        return <ShoppingBag className="w-4 h-4 text-amber-400" />;
      case 'equipment_finance':
        return <Building className="w-4 h-4 text-blue-400" />;
      case 'personal_loan':
        return <CreditCard className="w-4 h-4 text-purple-400" />;
      default:
        return <User className="w-4 h-4 text-emerald-400" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-lg">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
            <PiggyBank className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-100">Debt Obligations & Supplier Accounts</h2>
            <p className="text-xs text-slate-400">
              Total Outstanding Balance: <strong className="text-purple-400 font-bold">{totalDebtBurden.toLocaleString('fr-MA')} MAD</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenQuickDebtPayment}
            className="flex items-center gap-1.5 px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md transition"
          >
            <Plus className="w-4 h-4" />
            Pay Creditor (&lt;15s)
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl border border-slate-700 transition"
          >
            <Plus className="w-4 h-4" />
            Add Debt / Supplier
          </button>
        </div>
      </div>

      {/* Active Debt Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {activeDebts.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-500 text-sm bg-slate-900 border border-slate-800 rounded-2xl">
            Zero active debts recorded!
          </div>
        ) : (
          activeDebts.map(debt => {
            const paidPct = Math.min(
              100,
              Math.max(0, ((debt.totalAmount - debt.remainingBalance) / debt.totalAmount) * 100)
            );

            return (
              <div
                key={debt.id}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4 hover:border-slate-700 transition"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-slate-800 border border-slate-700">
                      {getDebtIcon(debt.type)}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-100 text-base">{debt.creditor}</h3>
                      <span className="text-[11px] text-slate-400 capitalize">
                        {debt.type.replace('_', ' ')}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDeleteDebt(debt)}
                    className="text-slate-600 hover:text-rose-400 transition p-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Balance Progress Bar */}
                <div>
                  <div className="flex justify-between items-baseline mb-1 text-xs">
                    <span className="text-slate-400">Remaining Balance:</span>
                    <strong className="text-purple-400 font-bold text-base">
                      {debt.remainingBalance.toLocaleString('fr-MA')} MAD
                    </strong>
                  </div>

                  <div className="w-full bg-slate-950 rounded-full h-2.5 border border-slate-800 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-purple-600 to-emerald-400 h-2.5 rounded-full transition-all duration-500"
                      style={{ width: `${paidPct}%` }}
                    />
                  </div>

                  <div className="flex justify-between items-center text-[10px] text-slate-500 mt-1.5">
                    <span>Initial: {debt.totalAmount.toLocaleString('fr-MA')} MAD</span>
                    <span>Paid: {paidPct.toFixed(0)}%</span>
                  </div>
                </div>

                {/* Details Footer */}
                <div className="grid grid-cols-2 gap-2 bg-slate-950 p-2.5 rounded-xl border border-slate-800/80 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-500 block">Monthly Min</span>
                    <strong className="text-slate-200 font-bold">
                      {debt.monthlyMinPayment ? `${debt.monthlyMinPayment.toLocaleString('fr-MA')} MAD` : 'N/A'}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Due Date</span>
                    <strong className="text-amber-400 font-bold">
                      {debt.dueDate || 'Flexible'}
                    </strong>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Debt Repayment History Log */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
        <h3 className="font-bold text-slate-100 text-sm">Recent Debt Repayments Log</h3>
        {debtPayments.length === 0 ? (
          <p className="text-xs text-slate-500 py-4 text-center">No debt payments recorded yet.</p>
        ) : (
          <div className="space-y-2">
            {debtPayments.map(pay => {
              const matchedDebt = debts.find(d => d.id === pay.debtId);
              return (
                <div
                  key={pay.id}
                  className="flex items-center justify-between p-3 bg-slate-950/60 rounded-xl border border-slate-800/80 text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <div>
                      <strong className="text-slate-200 font-semibold block">
                        {matchedDebt?.creditor || 'Debt Payment'}
                      </strong>
                      <span className="text-[10px] text-slate-500">{pay.date}</span>
                    </div>
                  </div>
                  <strong className="text-emerald-400 font-mono text-sm font-bold">
                    -{pay.amount.toLocaleString('fr-MA')} MAD
                  </strong>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Debt Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-5 text-slate-100">
            <h3 className="font-bold text-lg mb-4">Add Debt / Supplier Credit</h3>
            <form onSubmit={handleAddDebt} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">CREDITOR NAME *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Droguerie Al Amine, Banque Populaire"
                  value={creditor}
                  onChange={e => setCreditor(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-slate-100"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">DEBT TYPE</label>
                <select
                  value={type}
                  onChange={e => setType(e.target.value as DebtType)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-slate-100"
                >
                  <option value="business_supplier">Business Supplier (Droguerie Credit)</option>
                  <option value="equipment_finance">Equipment / Van Finance</option>
                  <option value="personal_loan">Personal / Microfinance Loan</option>
                  <option value="family_friend">Family / Friend Loan</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">TOTAL DEBT (MAD) *</label>
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="3000"
                    value={totalAmount}
                    onChange={e => {
                      setTotalAmount(e.target.value);
                      if (!remainingBalance) setRemainingBalance(e.target.value);
                    }}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">CURRENT REMAINING</label>
                  <input
                    type="number"
                    step="any"
                    placeholder="1200"
                    value={remainingBalance}
                    onChange={e => setRemainingBalance(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-slate-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">MONTHLY MINIMUM (MAD)</label>
                  <input
                    type="number"
                    step="any"
                    placeholder="600"
                    value={monthlyMinPayment}
                    onChange={e => setMonthlyMinPayment(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">DUE DATE</label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={e => setDueDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-slate-100"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="w-1/2 py-2.5 bg-slate-800 text-slate-300 font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-1/2 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl"
                >
                  Save Debt
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
