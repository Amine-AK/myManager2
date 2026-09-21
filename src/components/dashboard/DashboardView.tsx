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
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 relative overflow-hidden shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              3. Available Cash Right Now
            </span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black text-emerald-400 tracking-tight">
              {metrics.availableCash.toLocaleString('fr-MA')} MAD
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Collected Cash minus All Costs, Household & Debt
            </p>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
            <span className="text-slate-400">Net Cash Flow:</span>
            <span className={`font-bold ${metrics.netCashFlow >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {metrics.netCashFlow >= 0 ? '+' : ''}{metrics.netCashFlow.toLocaleString('fr-MA')} MAD
            </span>
          </div>
        </div>

        {/* Q2: Real Earned (Net Profit) */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 relative overflow-hidden shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              1. Money Really Earned
            </span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black text-slate-100 tracking-tight">
              {metrics.netBusinessProfit.toLocaleString('fr-MA')} MAD
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Net Business Profit (Income - Work Costs)
            </p>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
            <span className="text-slate-400">Profit Margin:</span>
            <span className="font-bold text-blue-400">
              {metrics.profitMarginPercent.toFixed(1)}%
            </span>
          </div>
        </div>

        {/* Q3: Where did money go? (Total Outflows) */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 relative overflow-hidden shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              2. Total Outflows & Spent
            </span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
              <Receipt className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black text-amber-400 tracking-tight">
              {(metrics.totalBusinessCosts + metrics.totalPersonalSpending + metrics.totalDebtPaid).toLocaleString('fr-MA')} MAD
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Work ({metrics.totalBusinessCosts.toLocaleString('fr-MA')}) + Home ({metrics.totalPersonalSpending.toLocaleString('fr-MA')}) + Debt ({metrics.totalDebtPaid.toLocaleString('fr-MA')})
            </p>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
            <span className="text-slate-400">Household Split:</span>
            <span className="font-bold text-rose-400">
              {metrics.totalPersonalSpending.toLocaleString('fr-MA')} MAD
            </span>
          </div>
        </div>

        {/* Q4: Uncollected Revenue & Debt Burden */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 relative overflow-hidden shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              4. Owed To Me vs My Debt
            </span>
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
              <CreditCard className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-amber-400 tracking-tight">
              +{metrics.uncollectedRevenue.toLocaleString('fr-MA')} MAD
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Clients Owe Me (Uncollected)
            </p>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
            <span className="text-slate-400">My Outstanding Debt:</span>
            <span className="font-bold text-purple-400">
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
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h4 className="text-sm font-bold text-slate-200">Rapid Financial Logging</h4>
          <p className="text-xs text-slate-400">Keep available cash updated in seconds between jobs.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenQuickExpense}
            className="px-3 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
          >
            <span>+ Expense</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onOpenQuickJob}
            className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-emerald-600/20"
          >
            <span>+ Job / Payment</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onOpenQuickDebtPayment}
            className="px-3 py-2 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/30 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
          >
            <span>+ Debt Pay</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
