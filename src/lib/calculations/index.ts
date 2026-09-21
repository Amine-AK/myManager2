// ==========================================
// CENTRALIZED FINANCIAL ENGINE - SINGLE SOURCE OF TRUTH
// ==========================================

import type { Job, BusinessExpense, PersonalExpense, DebtObligation, DebtPayment, JobIntervention, FinancialMetrics } from '../../types';
import {
  calculateCollectedIncome,
  calculateTotalRevenueAgreed,
  calculateUncollectedRevenue,
  calculateDirectJobCosts,
  calculateBusinessOverhead,
  calculateTotalBusinessCosts,
  calculatePersonalSpending,
  calculateTotalDebtPaid,
  calculateAvailableCash
} from './cashflow';
import { calculateNetBusinessProfit, calculateProfitMarginPercent } from './profitability';
import { calculateTotalDebtOutstanding, countActiveDebts } from './debt';
import { calculateHouseholdSpending, calculateIndividualSpending } from './personalExpenseScope';
import { calculateInterventionSummary } from './interventions';
import { calculateAggregateEconomicMetrics } from './effectiveHourlyRate';

export * from './cashflow';
export * from './profitability';
export * from './debt';
export * from './insights';
export * from './acquisition';
export * from './weeklyTracker';
export * from './jobTiming';
export * from './personalExpenseScope';
export * from './interventions';
export * from './dataHealth';
export * from './effectiveHourlyRate';
export * from './fieldAnalytics';

/**
 * SINGLE SOURCE OF TRUTH FOR ALL FINANCIAL CALCULATIONS.
 * UI components must call this function and consume computed FinancialMetrics.
 * UI components must NEVER recreate or duplicate mathematical formulas.
 */
export function computeFinancialMetrics(
  jobs: Job[],
  businessExpenses: BusinessExpense[],
  personalExpenses: PersonalExpense[],
  debts: DebtObligation[],
  debtPayments: DebtPayment[],
  jobInterventions: JobIntervention[] = []
): FinancialMetrics {
  const totalRevenueAgreed = calculateTotalRevenueAgreed(jobs);
  const collectedIncome = calculateCollectedIncome(jobs);
  const uncollectedRevenue = calculateUncollectedRevenue(jobs);

  const directJobCosts = calculateDirectJobCosts(jobs);
  const businessOverhead = calculateBusinessOverhead(businessExpenses);
  const totalBusinessCosts = calculateTotalBusinessCosts(jobs, businessExpenses);

  const totalPersonalSpending = calculatePersonalSpending(personalExpenses);
  const householdSpending = calculateHouseholdSpending(personalExpenses);
  const individualSpending = calculateIndividualSpending(personalExpenses);
  const totalDebtPaid = calculateTotalDebtPaid(debtPayments);

  const netBusinessProfit = calculateNetBusinessProfit(jobs, businessExpenses);
  const availableCash = calculateAvailableCash(jobs, businessExpenses, personalExpenses, debtPayments);
  const netCashFlow = collectedIncome - totalBusinessCosts - totalPersonalSpending - totalDebtPaid;

  const totalDebtOutstanding = calculateTotalDebtOutstanding(debts);
  const activeDebtCount = countActiveDebts(debts);

  const profitMarginPercent = calculateProfitMarginPercent(jobs, businessExpenses);
  const uncollectedRatioPercent = totalRevenueAgreed > 0 ? (uncollectedRevenue / totalRevenueAgreed) * 100 : 0;

  const waitingPartsCount = jobs.filter(j => j.status === 'waiting_parts').length;
  const revisionRequestedCount = jobs.filter(j => j.status === 'revision_requested').length;

  const quoteLostCount = jobs.filter(j => j.status === 'quote_lost').length;
  const wonJobsCount = jobs.filter(j => j.status !== 'quote_lost' && j.status !== 'quoted').length;
  const quoteConversionRatePercent =
    wonJobsCount + quoteLostCount > 0 ? (wonJobsCount / (wonJobsCount + quoteLostCount)) * 100 : 0;

  const { totalInterventions, unresolvedInterventionsCount, jobsWithInterventionsCount } =
    calculateInterventionSummary(jobInterventions);

  const {
    totalEconomicHours,
    effectiveHourlyRate,
    totalTravelCost,
    travelTimeHours,
    travelPercentageOfTime,
    reworkHours,
    reworkRatePercent
  } = calculateAggregateEconomicMetrics(jobs, businessExpenses, jobInterventions);

  return {
    totalRevenueAgreed,
    collectedIncome,
    uncollectedRevenue,
    directJobCosts,
    businessOverhead,
    totalBusinessCosts,
    totalPersonalSpending,
    householdSpending,
    individualSpending,
    totalDebtPaid,
    netBusinessProfit,
    netCashFlow,
    availableCash,
    totalDebtOutstanding,
    activeDebtCount,
    profitMarginPercent,
    uncollectedRatioPercent,
    waitingPartsCount,
    revisionRequestedCount,
    quoteLostCount,
    quoteConversionRatePercent,
    totalInterventions,
    unresolvedInterventionsCount,
    jobsWithInterventionsCount,
    totalEconomicHours,
    effectiveHourlyRate,
    totalTravelCost,
    travelTimeHours,
    travelPercentageOfTime,
    reworkHours,
    reworkRatePercent
  };
}
