import React from 'react';
import type { FinancialMetrics, FactualInsight, Job, JobPayment, DebtObligation, BusinessExpense, PersonalExpense } from '../../types';
import {
  Wallet,
  TrendingUp,
  Receipt,
  PieChart as PieChartIcon,
  AlertTriangle,
  CheckCircle2,
  Info,
  ArrowUpRight,
  ShieldCheck,
  CreditCard
} from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { AcquisitionFunnelCard } from './AcquisitionFunnelCard';
import { WeeklySpendingTrackerCard } from './WeeklySpendingTrackerCard';
import { FieldAnalyticsCard } from './FieldAnalyticsCard';
import type { JobIntervention } from '../../types';

interface DashboardViewProps {
  metrics: FinancialMetrics;
  insights: FactualInsight[];
  jobs: Job[];
  jobPayments: JobPayment[];
  jobInterventions?: JobIntervention[];
  debts: DebtObligation[];
  businessExpenses: BusinessExpense[];
  personalExpenses: PersonalExpense[];
  onOpenQuickJob: () => void;
  onOpenQuickExpense: () => void;
  onOpenQuickDebtPayment: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  metrics,
  insights,
  jobs,
  jobPayments,
  jobInterventions = [],
  businessExpenses,
  personalExpenses,
  onOpenQuickJob,
  onOpenQuickExpense,
  onOpenQuickDebtPayment
}) => {
  // Chart Data: Cash Outflow Breakdown (Where did my money go?)
  const outflowData = [
    { name: 'Direct Job Materials', value: metrics.directJobCosts, color: '#f59e0b' },
    { name: 'Business Overhead', value: metrics.businessOverhead, color: '#d97706' },
    { name: 'Household (Family)', value: metrics.householdSpending, color: '#f43f5e' },
    { name: 'Personal (Just Me)', value: metrics.individualSpending, color: '#ec4899' },
    { name: 'Debt Repayments', value: metrics.totalDebtPaid, color: '#8b5cf6' }
  ].filter(d => d.value > 0);

  return (
    <div className="space-y-6">
      {/* SECTION 1: THE 4 CORE QUESTIONS - 10 SECOND FINANCIAL TRUTH */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Q1: Available Cash */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800/50 border border-slate-700/60 hover:border-emerald-500/50 rounded-3xl p-6 relative overflow-hidden shadow-xl hover:-translate-y-1 hover:shadow-2xl hover:shadow-emerald-500/10 transition-all duration-300">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-emerald-400/80 uppercase tracking-wider bg-emerald-500/10 px-2.5 py-1 rounded-lg">
              Available Cash Right Now
            </span>
            <div className="p-2.5 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 text-emerald-400 border border-emerald-500/20">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-4xl font-black text-emerald-400 tracking-tight drop-shadow-sm">
              {metrics.availableCash.toLocaleString('fr-MA')} MAD
            </div>
            <p className="text-xs text-slate-400 mt-2 font-medium">
              Collected Cash minus All Costs, Household & Debt
            </p>
          </div>
          <div className="mt-5 pt-4 border-t border-slate-700/50 flex items-center justify-between text-xs">
            <span className="text-slate-400 font-medium">Net Cash Flow:</span>
            <span className={`font-bold px-2 py-1 rounded-md ${metrics.netCashFlow >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
              {metrics.netCashFlow >= 0 ? '+' : ''}{metrics.netCashFlow.toLocaleString('fr-MA')} MAD
            </span>
          </div>
        </div>

        {/* Q2: Real Earned (Net Profit) */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800/50 border border-slate-700/60 hover:border-blue-500/50 rounded-3xl p-6 relative overflow-hidden shadow-xl hover:-translate-y-1 hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-300">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-blue-400/80 uppercase tracking-wider bg-blue-500/10 px-2.5 py-1 rounded-lg">
              Money Really Earned
            </span>
            <div className="p-2.5 rounded-2xl bg-gradient-to-br from-blue-500/20 to-blue-600/10 text-blue-400 border border-blue-500/20">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-4xl font-black text-slate-100 tracking-tight drop-shadow-sm">
              {metrics.netBusinessProfit.toLocaleString('fr-MA')} MAD
            </div>
            <p className="text-xs text-slate-400 mt-2 font-medium">
              Net Business Profit (Income - Work Costs)
            </p>
          </div>
          <div className="mt-5 pt-4 border-t border-slate-700/50 flex items-center justify-between text-xs">
            <span className="text-slate-400 font-medium">Profit Margin:</span>
            <span className="font-bold text-blue-400 bg-blue-500/10 px-2 py-1 rounded-md">
              {metrics.profitMarginPercent.toFixed(1)}%
            </span>
          </div>
        </div>

        {/* Q3: Where did money go? (Total Outflows) */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800/50 border border-slate-700/60 hover:border-amber-500/50 rounded-3xl p-6 relative overflow-hidden shadow-xl hover:-translate-y-1 hover:shadow-2xl hover:shadow-amber-500/10 transition-all duration-300">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-amber-400/80 uppercase tracking-wider bg-amber-500/10 px-2.5 py-1 rounded-lg">
              Total Outflows & Spent
            </span>
            <div className="p-2.5 rounded-2xl bg-gradient-to-br from-amber-500/20 to-amber-600/10 text-amber-400 border border-amber-500/20">
              <Receipt className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-4xl font-black text-amber-400 tracking-tight drop-shadow-sm">
              {(metrics.totalBusinessCosts + metrics.totalPersonalSpending + metrics.totalDebtPaid).toLocaleString('fr-MA')} MAD
            </div>
            <p className="text-xs text-slate-400 mt-2 font-medium">
              Work ({metrics.totalBusinessCosts.toLocaleString('fr-MA')}) + Home ({metrics.totalPersonalSpending.toLocaleString('fr-MA')}) + Debt ({metrics.totalDebtPaid.toLocaleString('fr-MA')})
            </p>
          </div>
          <div className="mt-5 pt-4 border-t border-slate-700/50 flex items-center justify-between text-xs">
            <span className="text-slate-400 font-medium">Household Split:</span>
            <span className="font-bold text-rose-400 bg-rose-500/10 px-2 py-1 rounded-md">
              {metrics.totalPersonalSpending.toLocaleString('fr-MA')} MAD
            </span>
          </div>
        </div>

        {/* Q4: Uncollected Revenue & Debt Burden */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800/50 border border-slate-700/60 hover:border-purple-500/50 rounded-3xl p-6 relative overflow-hidden shadow-xl hover:-translate-y-1 hover:shadow-2xl hover:shadow-purple-500/10 transition-all duration-300">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-purple-400/80 uppercase tracking-wider bg-purple-500/10 px-2.5 py-1 rounded-lg">
              Owed To Me vs My Debt
            </span>
            <div className="p-2.5 rounded-2xl bg-gradient-to-br from-purple-500/20 to-purple-600/10 text-purple-400 border border-purple-500/20">
              <CreditCard className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-black text-amber-400 tracking-tight drop-shadow-sm truncate">
              +{metrics.uncollectedRevenue.toLocaleString('fr-MA')} MAD
            </div>
            <p className="text-xs text-slate-400 mt-2 font-medium">
              Clients Owe Me (Uncollected)
            </p>
          </div>
          <div className="mt-5 pt-4 border-t border-slate-700/50 flex items-center justify-between text-xs">
            <span className="text-slate-400 font-medium">My Outstanding Debt:</span>
            <span className="font-bold text-purple-400 bg-purple-500/10 px-2 py-1 rounded-md">
              -{metrics.totalDebtOutstanding.toLocaleString('fr-MA')} MAD
            </span>
          </div>
        </div>
      </div>

      {/* SECTION 2: OBJECTIVE FACTUAL INSIGHTS & CASH OUTFLOW GRAPH */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Factual Insights Card (Objective Observations Only) */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <h3 className="font-bold text-slate-100">Factual Financial Trajectory</h3>
            </div>
            <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-1 rounded-md font-mono">
              Data-Driven Only
            </span>
          </div>

          <div className="space-y-3">
            {insights.length === 0 ? (
              <p className="text-sm text-slate-400 py-4 text-center">
                Log jobs and expenses to generate real-time financial observations.
              </p>
            ) : (
              insights.map(item => (
                <div
                  key={item.id}
                  className={`p-3.5 rounded-xl border flex items-start gap-3 transition ${
                    item.type === 'warning'
                      ? 'bg-amber-500/10 border-amber-500/30 text-amber-200'
                      : item.type === 'positive'
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
                      : 'bg-slate-800/60 border-slate-700/60 text-slate-300'
                  }`}
                >
                  <div className="mt-0.5">
                    {item.type === 'warning' && <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />}
                    {item.type === 'positive' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
                    {item.type === 'info' && <Info className="w-4 h-4 text-blue-400 shrink-0" />}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold uppercase tracking-wider">{item.title}</h4>
                      {item.metric && (
                        <span className="text-xs font-mono font-bold">{item.metric}</span>
                      )}
                    </div>
                    <p className="text-xs mt-1 opacity-90">{item.message}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Cash Outflow Pie Breakdown */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <PieChartIcon className="w-5 h-5 text-amber-400" />
              <h3 className="font-bold text-slate-100">Where Did Cash Go?</h3>
            </div>
            <p className="text-xs text-slate-400">Total cash outflow structure</p>

            {outflowData.length > 0 ? (
              <div className="h-48 my-3">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={outflowData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={75}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {outflowData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val: any) => [`${Number(val).toLocaleString('fr-MA')} MAD`, 'Spent']}
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-48 flex items-center justify-center text-xs text-slate-500">
                No expense entries yet
              </div>
            )}
          </div>

          {/* Outflow Legend */}
          <div className="space-y-1.5 pt-3 border-t border-slate-800 text-xs">
            {outflowData.map(item => (
              <div key={item.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-slate-300 text-[11px]">{item.name}</span>
                </div>
                <strong className="text-slate-200 font-mono text-[11px]">
                  {item.value.toLocaleString('fr-MA')} MAD
                </strong>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* SECTION: FIELD SERVICE ANALYTICS & PROFITABILITY ENGINE */}
      <FieldAnalyticsCard
        jobs={jobs}
        jobInterventions={jobInterventions}
      />

      {/* SECTION: WEEKLY SPENDING & REWARD TRACKER */}
      <WeeklySpendingTrackerCard
        jobPayments={jobPayments}
        businessExpenses={businessExpenses}
        personalExpenses={personalExpenses}
      />

      {/* SECTION: CLIENT ACQUISITION LEAD FUNNEL */}
      <AcquisitionFunnelCard jobs={jobs} />

      {/* SECTION 3: QUICK ACTIONS INVITATION */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800/80 border border-slate-700/80 rounded-3xl p-5 sm:p-6 flex flex-wrap items-center justify-between gap-5 shadow-xl">
        <div className="space-y-1">
          <h4 className="text-base font-black text-slate-100 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-400" />
            Rapid Financial Logging
          </h4>
          <p className="text-sm text-slate-400 font-medium">Keep available cash updated in seconds between jobs.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={onOpenQuickExpense}
            className="px-4 py-2.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-xl text-sm font-bold transition-all hover:scale-105 flex items-center gap-2"
          >
            <span>+ Expense</span>
            <ArrowUpRight className="w-4 h-4 opacity-70" />
          </button>
          <button
            onClick={onOpenQuickJob}
            className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white rounded-xl text-sm font-bold transition-all hover:scale-105 flex items-center gap-2 shadow-lg shadow-emerald-500/25"
          >
            <span>+ Job / Payment</span>
            <ArrowUpRight className="w-4 h-4 opacity-70" />
          </button>
          <button
            onClick={onOpenQuickDebtPayment}
            className="px-4 py-2.5 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/30 rounded-xl text-sm font-bold transition-all hover:scale-105 flex items-center gap-2"
          >
            <span>+ Debt Pay</span>
            <ArrowUpRight className="w-4 h-4 opacity-70" />
          </button>
        </div>
      </div>
    </div>
  );
};
