// ==========================================
// FINANCIAL ENGINE - EFFECTIVE HOURLY RATE & FIELD SERVICE ECONOMICS
// ==========================================

import type { Job, JobIntervention, BusinessExpense } from '../../types';
import { calculateNetBusinessProfit } from './profitability';

export interface JobEconomicBreakdown {
  jobId: string;
  laborHours: number;
  diagnosticHours: number;
  travelHours: number;
  waitingHours: number;
  reworkHours: number;
  totalEconomicHours: number;
  grossRevenue: number;
  collectedIncome: number;
  directMaterialCost: number;
  travelCost: number;
  netJobProfit: number;
  effectiveHourlyRate: number; // MAD per hour (can be negative!)
  hasCallback: boolean;
}

/**
 * Calculates the total economic time and net economic return for a single job.
 * Total Economic Time = Hands-on work + Diagnostic + Travel + Waiting + Rework (callbacks)
 */
export function calculateJobEconomicBreakdown(
  job: Job,
  jobInterventions: JobIntervention[] = []
): JobEconomicBreakdown {
  // 1. Hands-on labor: use job.actualHours if recorded, else sum log hours
  let laborHours = job.actualHours ?? 0;
  if (laborHours <= 0 && job.logs && job.logs.length > 0) {
    laborHours = job.logs.reduce((sum, log) => sum + (log.hoursSpent || 0), 0);
  }

  // 2. Auxiliary time segments (converted from minutes to fractional hours)
  const diagnosticHours = (job.diagnosticTimeMinutes || 0) / 60;
  const travelHours = (job.travelTimeMinutes || 0) / 60;
  const waitingHours = (job.waitingTimeMinutes || 0) / 60;

  // 3. Callback / rework time for this job
  const jobCallbacks = jobInterventions.filter(i => i.jobId === job.id);
  const callbackHours = jobCallbacks.reduce(
    (sum, i) => sum + (i.hoursSpent || 0) + ((i.reworkTimeMinutes || 0) / 60),
    0
  );
  const directReworkHours = (job.reworkTimeMinutes || 0) / 60;
  const reworkHours = directReworkHours + callbackHours;

  const totalEconomicHours = laborHours + diagnosticHours + travelHours + waitingHours + reworkHours;

  // 4. Job Financials
  const grossRevenue = job.agreedPrice || 0;
  const collectedIncome = job.paidAmount || 0;
  const directMaterialCost = job.materialCosts || 0;
  const travelCost = job.travelCost || 0;

  // Net Job Profit: Cash collected minus direct materials and specific travel costs
  const netJobProfit = collectedIncome - directMaterialCost - travelCost;

  // Effective Hourly Rate: Net Profit / Total Economic Time
  // STRICT PRINCIPLE: Never hide negative returns. If profit is negative, EHR is negative.
  const effectiveHourlyRate = totalEconomicHours > 0 ? netJobProfit / totalEconomicHours : 0;

  return {
    jobId: job.id,
    laborHours,
    diagnosticHours,
    travelHours,
    waitingHours,
    reworkHours,
    totalEconomicHours,
    grossRevenue,
    collectedIncome,
    directMaterialCost,
    travelCost,
    netJobProfit,
    effectiveHourlyRate,
    hasCallback: jobCallbacks.length > 0 || reworkHours > 0
  };
}

/**
 * Calculates aggregate economic metrics across all jobs.
 */
export function calculateAggregateEconomicMetrics(
  jobs: Job[],
  businessExpenses: BusinessExpense[],
  jobInterventions: JobIntervention[] = []
): {
  totalEconomicHours: number;
  effectiveHourlyRate: number;
  totalTravelCost: number;
  travelTimeHours: number;
  travelPercentageOfTime: number;
  reworkHours: number;
  reworkRatePercent: number;
} {
  let totalEconomicHours = 0;
  let totalTravelCost = 0;
  let travelTimeHours = 0;
  let reworkHours = 0;
  let jobsWithReworkCount = 0;

  const activeOrClosedJobs = jobs.filter(j => j.status !== 'quote_lost');

  for (const job of activeOrClosedJobs) {
    const breakdown = calculateJobEconomicBreakdown(job, jobInterventions);
    totalEconomicHours += breakdown.totalEconomicHours;
    totalTravelCost += breakdown.travelCost;
    travelTimeHours += breakdown.travelHours;
    reworkHours += breakdown.reworkHours;

    if (breakdown.hasCallback) {
      jobsWithReworkCount++;
    }
  }

  // Net Business Profit across the business
  const netBusinessProfit = calculateNetBusinessProfit(jobs, businessExpenses);

  // Overall Effective Hourly Rate
  const effectiveHourlyRate =
    totalEconomicHours > 0 ? netBusinessProfit / totalEconomicHours : 0;

  // Travel % of total economic hours
  const travelPercentageOfTime =
    totalEconomicHours > 0 ? (travelTimeHours / totalEconomicHours) * 100 : 0;

  // Rework Rate % of won/active jobs
  const reworkRatePercent =
    activeOrClosedJobs.length > 0
      ? (jobsWithReworkCount / activeOrClosedJobs.length) * 100
      : 0;

  return {
    totalEconomicHours,
    effectiveHourlyRate,
    totalTravelCost,
    travelTimeHours,
    travelPercentageOfTime,
    reworkHours,
    reworkRatePercent
  };
}
