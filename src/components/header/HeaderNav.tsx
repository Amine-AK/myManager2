import React from 'react';
import type { FinancialMetrics } from '../../types';
import {
  Wallet,
  TrendingUp,
  Clock,
  Plus,
  Wrench,
  DollarSign,
  CreditCard,
  Printer,
  BarChart3,
  Receipt,
  PiggyBank,
  Lock,
  Zap,
  ListTodo,
  Package,
  BookOpen
} from 'lucide-react';
import { SyncStatusBadge } from '../common/SyncStatusBadge';
import { InstallAppButton } from '../common/InstallAppButton';
import { VoiceEntryButton } from '../voice/VoiceEntryButton';
import type { VoiceCommand } from '../../types/voice';

interface HeaderNavProps {
  metrics: FinancialMetrics;
  activeTab: 'dashboard' | 'jobs' | 'expenses' | 'debts' | 'print' | 'field' | 'todos' | 'inventory' | 'knowledge';
  setActiveTab: (tab: 'dashboard' | 'jobs' | 'expenses' | 'debts' | 'print' | 'field' | 'todos' | 'inventory' | 'knowledge') => void;
  onOpenQuickExpense: () => void;
  onOpenQuickJob: () => void;
  onOpenQuickDebtPayment: () => void;
  onOpenQuickTodo?: () => void;
  onVoiceCommandReady: (transcript: string, command: VoiceCommand) => void;
  voiceEntryDisabled?: boolean;
  onLogout?: () => void;
}

export const HeaderNav: React.FC<HeaderNavProps> = ({
  metrics,
  activeTab,
  setActiveTab,
  onOpenQuickExpense,
  onOpenQuickJob,
  onOpenQuickDebtPayment,
  onOpenQuickTodo,
  onVoiceCommandReady,
  voiceEntryDisabled,
  onLogout
}) => {
  return (
    <>
      <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 text-slate-100 no-print">
        {/* Top Strip: Available Cash Position Banner */}
        <div className="bg-slate-950 px-3 sm:px-4 py-2 border-b border-slate-800/60 text-xs">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 min-w-0">
            {/* Main Available Cash Indicator - never shrinks; it's the one
                number this whole strip exists to show. */}
            <div className="flex items-center gap-2 shrink-0">
              <div className="p-1 rounded-lg bg-emerald-500/20 text-emerald-400">
                <Wallet className="w-4 h-4" />
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-slate-400 uppercase font-bold text-[10px] sm:text-[11px] tracking-wide">
                  Cash:
                </span>
                <strong className="text-emerald-400 font-extrabold text-sm sm:text-base">
                  {metrics.availableCash.toLocaleString('fr-MA')} MAD
                </strong>
              </div>
            </div>

            {/* Quick Metrics Pills. Profit's label AND the whole pill, plus the
                Lock button's text, wait for `sm` (640px) rather than `xs`
                (400px) - measured with Playwright at a real 412px viewport,
                showing all of Cash/Profit/Owed/Sync/Lock at once overflowed
                the strip by 9px and clipped the Lock label. Profit and the
                Lock word are the least essential pieces of this row (Cash
                and Owed are the actionable ones), so they're what waits.
                Even with those hidden, the remaining Owed/Sync/Lock pills
                can still be too wide for the very narrowest phones (measured
                overflow at 360px) - overflow-x-auto is a robust fallback so
                that case scrolls horizontally within this strip instead of
                pushing the whole page wider than the viewport. */}
            <div className="flex items-center gap-3 text-[10px] sm:text-[11px] min-w-0 overflow-x-auto no-scrollbar flex-nowrap">
              <div className="hidden sm:flex items-center gap-1 text-slate-300 shrink-0">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden md:inline text-slate-400">Profit:</span>
                <strong className="text-slate-100 font-bold">
                  {metrics.netBusinessProfit.toLocaleString('fr-MA')} MAD
                </strong>
              </div>

              <div className="flex items-center gap-1 text-slate-300 shrink-0">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline text-slate-400">Owed:</span>
                <strong className="text-amber-400 font-bold">
                  {metrics.uncollectedRevenue.toLocaleString('fr-MA')} MAD
                </strong>
              </div>

              {/* PWA Install Button (renders when install prompt is available) */}
              <InstallAppButton />

              {/* Offline/Online Synchronization Status Badge */}
              <SyncStatusBadge />

              {/* Lock / Logout Button */}
              {onLogout && (
                <button
                  onClick={onLogout}
                  className="flex items-center gap-1 px-2 py-0.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-lg text-[10px] font-bold transition shrink-0"
                  title="Lock Private Session"
                >
                  <Lock className="w-3 h-3" />
                  <span className="hidden sm:inline">Lock</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Main Nav Bar & Rapid Action Buttons */}
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2.5 sm:py-3 flex items-center justify-between gap-2">
          {/* Brand */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-emerald-400 flex items-center justify-center text-slate-950 font-black text-xs sm:text-base shadow-lg shadow-emerald-500/20 shrink-0">
              AC
            </div>
            {/* Below 400px (the new xs breakpoint - see index.css), only the AC
                logo mark shows; the full name would push the rapid-action
                buttons off a narrow phone's screen. */}
            <div className="hidden xs:block min-w-0">
              <h1 className="text-sm sm:text-base font-black tracking-tight flex items-center gap-1">
                ARTISAN CASH
                <span className="text-[9px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded-full font-mono border border-slate-700 hidden sm:inline">
                  MA
                </span>
              </h1>
              <p className="text-[10px] text-slate-400 hidden md:block">
                CCTV, IT, Telecom & Electronics Handyman System
              </p>
            </div>
          </div>

          {/* Rapid Action Buttons (<10s, <20s, <15s). Below the `sm` breakpoint
              every button collapses to just its one meaningful icon (the
              decorative "+" and the text label both hide) so four-plus
              buttons plus the brand mark actually fit a real phone's width
              instead of overflowing/wrapping. */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {onOpenQuickTodo && (
              <button
                onClick={onOpenQuickTodo}
                className="flex items-center gap-1 px-2.5 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-xl text-xs font-bold transition shadow-sm active:scale-95 min-h-[40px]"
                title="Ajouter une tâche, rappel client ou matériel (<10s)"
              >
                <Plus className="hidden sm:inline w-3.5 h-3.5 stroke-[2.5]" />
                <ListTodo className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Tâche</span>
                <span className="hidden md:inline text-[9px] opacity-75">&lt;10s</span>
              </button>
            )}

            <button
              onClick={onOpenQuickExpense}
              className="flex items-center gap-1 px-2.5 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-xl text-xs font-bold transition shadow-sm active:scale-95 min-h-[40px]"
            >
              <Plus className="hidden sm:inline w-3.5 h-3.5" />
              <DollarSign className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Expense</span>
              <span className="hidden md:inline text-[9px] opacity-75">&lt;10s</span>
            </button>

            <button
              onClick={onOpenQuickJob}
              className="flex items-center gap-1 px-2.5 sm:px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition shadow-md shadow-emerald-600/20 active:scale-95 min-h-[40px]"
            >
              <Plus className="hidden sm:inline w-3.5 h-3.5" />
              <Wrench className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Job</span>
              <span className="hidden md:inline text-[9px] opacity-75">&lt;20s</span>
            </button>

            <button
              onClick={onOpenQuickDebtPayment}
              className="flex items-center gap-1 px-2.5 py-2 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/30 rounded-xl text-xs font-bold transition shadow-sm active:scale-95 min-h-[40px] hidden xs:flex"
            >
              <Plus className="hidden sm:inline w-3.5 h-3.5" />
              <CreditCard className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Debt</span>
            </button>

            <VoiceEntryButton onResult={onVoiceCommandReady} disabled={voiceEntryDisabled} />
          </div>
        </div>

        {/* Desktop Navigation Tabs (Hidden on Phone screens, replaced by bottom bar) */}
        <div className="max-w-7xl mx-auto px-4 hidden sm:flex border-t border-slate-800/80 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('field')}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-black border-b-2 transition whitespace-nowrap ${
              activeTab === 'field'
                ? 'border-amber-400 text-amber-300 bg-amber-500/10'
                : 'border-transparent text-amber-400/90 hover:text-amber-300 hover:bg-slate-800/30'
            }`}
          >
            <Zap className="w-4 h-4 text-amber-400" />
            <span>Mode Chantier (Terrain)</span>
          </button>

          <button
            onClick={() => setActiveTab('todos')}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition whitespace-nowrap ${
              activeTab === 'todos'
                ? 'border-amber-400 text-amber-300 bg-amber-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ListTodo className="w-4 h-4" />
            <span>Tâches & Planification</span>
          </button>

          <button
            onClick={() => setActiveTab('inventory')}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition whitespace-nowrap ${
              activeTab === 'inventory'
                ? 'border-amber-400 text-amber-300 bg-amber-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Package className="w-4 h-4 text-amber-400" />
            <span>Stock & Matériel</span>
          </button>

          <button
            onClick={() => setActiveTab('knowledge')}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition whitespace-nowrap ${
              activeTab === 'knowledge'
                ? 'border-amber-400 text-amber-300 bg-amber-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <BookOpen className="w-4 h-4 text-amber-400" />
            <span>Diagnostics & Fiches</span>
          </button>

          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition whitespace-nowrap ${
              activeTab === 'dashboard'
                ? 'border-emerald-500 text-emerald-400 bg-slate-800/40'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            Dashboard (10s Overview)
          </button>

          <button
            onClick={() => setActiveTab('jobs')}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition whitespace-nowrap ${
              activeTab === 'jobs'
                ? 'border-emerald-500 text-emerald-400 bg-slate-800/40'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Wrench className="w-4 h-4" />
            Jobs & Client Payments
          </button>

          <button
            onClick={() => setActiveTab('expenses')}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition whitespace-nowrap ${
              activeTab === 'expenses'
                ? 'border-emerald-500 text-emerald-400 bg-slate-800/40'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Receipt className="w-4 h-4" />
            Work vs Household Expenses
          </button>

          <button
            onClick={() => setActiveTab('debts')}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition whitespace-nowrap ${
              activeTab === 'debts'
                ? 'border-emerald-500 text-emerald-400 bg-slate-800/40'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <PiggyBank className="w-4 h-4" />
            Debt Obligations
          </button>

          <button
            onClick={() => setActiveTab('print')}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition whitespace-nowrap ${
              activeTab === 'print'
                ? 'border-emerald-500 text-emerald-400 bg-slate-800/40'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Printer className="w-4 h-4" />
            Print & Data Export
          </button>
        </div>
      </header>

      {/* MOBILE PHONE NATIVE BOTTOM NAVIGATION BAR. 9 tabs need ~486px at
          their original padding but a real narrow phone only has ~360-412px
          - measured with Playwright: Expenses/Debts/Report were partially or
          fully past the right edge and literally untappable, with no visual
          hint they existed (a `fixed` nav's own overflow doesn't show up in
          document-level scroll checks, which is how this stayed hidden).
          overflow-x-auto is the safety net (nothing is ever truly
          unreachable, worst case it's a swipe away); tighter per-tab padding
          below narrows the gap so most real phones fit all 9 without
          needing to scroll at all. */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-slate-900/98 backdrop-blur-lg border-t border-slate-800 flex items-center justify-around overflow-x-auto no-scrollbar py-2 px-1 sm:hidden no-print shadow-2xl">
        <button
          onClick={() => setActiveTab('field')}
          className={`flex flex-col items-center gap-0.5 px-1.5 py-1 rounded-xl transition shrink-0 ${
            activeTab === 'field' ? 'text-amber-400 font-black scale-105' : 'text-amber-400/80'
          }`}
        >
          <Zap className="w-5 h-5" />
          <span className="text-[10px] font-bold">Chantier</span>
        </button>

        <button
          onClick={() => setActiveTab('todos')}
          className={`flex flex-col items-center gap-0.5 px-1.5 py-1 rounded-xl transition shrink-0 ${
            activeTab === 'todos' ? 'text-amber-400 font-black scale-105' : 'text-slate-400'
          }`}
        >
          <ListTodo className="w-5 h-5" />
          <span className="text-[10px] font-bold">Tâches</span>
        </button>

        <button
          onClick={() => setActiveTab('inventory')}
          className={`flex flex-col items-center gap-0.5 px-1.5 py-1 rounded-xl transition shrink-0 ${
            activeTab === 'inventory' ? 'text-amber-400 font-black scale-105' : 'text-slate-400'
          }`}
        >
          <Package className="w-5 h-5" />
          <span className="text-[10px] font-bold">Stock</span>
        </button>

        <button
          onClick={() => setActiveTab('knowledge')}
          className={`flex flex-col items-center gap-0.5 px-1.5 py-1 rounded-xl transition shrink-0 ${
            activeTab === 'knowledge' ? 'text-amber-400 font-black scale-105' : 'text-slate-400'
          }`}
        >
          <BookOpen className="w-5 h-5" />
          <span className="text-[10px] font-bold">Fiches</span>
        </button>

        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex flex-col items-center gap-0.5 px-1.5 py-1 rounded-xl transition shrink-0 ${
            activeTab === 'dashboard' ? 'text-emerald-400 font-extrabold' : 'text-slate-400'
          }`}
        >
          <BarChart3 className="w-5 h-5" />
          <span className="text-[10px]">Overview</span>
        </button>

        <button
          onClick={() => setActiveTab('jobs')}
          className={`flex flex-col items-center gap-0.5 px-1.5 py-1 rounded-xl transition shrink-0 ${
            activeTab === 'jobs' ? 'text-emerald-400 font-extrabold' : 'text-slate-400'
          }`}
        >
          <Wrench className="w-5 h-5" />
          <span className="text-[10px]">Jobs</span>
        </button>

        <button
          onClick={() => setActiveTab('expenses')}
          className={`flex flex-col items-center gap-0.5 px-1.5 py-1 rounded-xl transition shrink-0 ${
            activeTab === 'expenses' ? 'text-emerald-400 font-extrabold' : 'text-slate-400'
          }`}
        >
          <Receipt className="w-5 h-5" />
          <span className="text-[10px]">Expenses</span>
        </button>

        <button
          onClick={() => setActiveTab('debts')}
          className={`flex flex-col items-center gap-0.5 px-1.5 py-1 rounded-xl transition shrink-0 ${
            activeTab === 'debts' ? 'text-emerald-400 font-extrabold' : 'text-slate-400'
          }`}
        >
          <PiggyBank className="w-5 h-5" />
          <span className="text-[10px]">Debts</span>
        </button>

        <button
          onClick={() => setActiveTab('print')}
          className={`flex flex-col items-center gap-0.5 px-1.5 py-1 rounded-xl transition shrink-0 ${
            activeTab === 'print' ? 'text-emerald-400 font-extrabold' : 'text-slate-400'
          }`}
        >
          <Printer className="w-5 h-5" />
          <span className="text-[10px]">Report</span>
        </button>
      </nav>
    </>
  );
};
