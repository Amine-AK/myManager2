// ==========================================
// FIELD SERVICE ANALYTICS & PROFITABILITY ENGINE
// True Hourly Rate by Category, Time Allocation, Delay Drain, and Client Audit
// ==========================================

import type { Job, JobIntervention } from '../../types';

export interface CategoryProfitabilityMetrics {
  category: string;
  jobCount: number;
  totalAgreedPrice: number;
  totalPaidAmount: number;
  totalMaterialCosts: number;
  totalTravelCosts: number;
  netProfit: number;
  profitMarginPercent: number;
  totalBillableHours: number;
  effectiveHourlyRate: number;
  isAboveBenchmark: boolean;
}

export interface TimeAllocationMetrics {
  handsOnHours: number;
  travelHours: number;
  delayHours: number;
  reworkHours: number;
  totalRecordedHours: number;
  handsOnPercent: number;
  travelPercent: number;
  delayPercent: number;
  reworkPercent: number;
}

export interface DelayBreakdownItem {
  category: string;
  label: string;
  occurrences: number;
  totalMinutes: number;
  totalHours: number;
  percentOfDelays: number;
  estimatedCostMAD: number;
}

export interface ClientProfitabilityItem {
  clientName: string;
  jobCount: number;
  totalAgreed: number;
  totalPaid: number;
  unpaidBalance: number;
  netProfit: number;
  reworkHours: number;
  callbackCount: number;
  effectiveHourlyRate: number;
  isRedFlag: boolean;
  redFlagReason?: string;
}

export interface WarrantyDrainMetrics {
  totalInterventions: number;
  resolvedInterventions: number;
  totalJobsCount: number;
  callbackRatePercent: number;
  totalReworkHours: number;
  estimatedReworkCostMAD: number;
}

export const DEFAULT_HOURLY_BENCHMARK = 150; // 150 MAD/hr standard benchmark for technical installers

/**
 * 1. Calculate Profitability & Effective Hourly Rate by Job Category
 */
export function calculateCategoryProfitability(
  jobs: Job[],
  benchmarkHourlyRate: number = DEFAULT_HOURLY_BENCHMARK
): CategoryProfitabilityMetrics[] {
  const categoryMap: Record<string, {
    jobCount: number;
    totalAgreedPrice: number;
    totalPaidAmount: number;
    totalMaterialCosts: number;
    totalTravelCosts: number;
    totalHours: number;
    totalNetProfit: number;
  }> = {};

  for (const job of jobs) {
    const cat = job.category || 'Non classé';
    if (!categoryMap[cat]) {
      categoryMap[cat] = {
        jobCount: 0,
        totalAgreedPrice: 0,
        totalPaidAmount: 0,
        totalMaterialCosts: 0,
        totalTravelCosts: 0,
        totalHours: 0,
        totalNetProfit: 0
      };
    }

    const travelCost = job.travelCost || 0;
    const directCosts = job.materialCosts + travelCost;
    const netProfit = job.agreedPrice - directCosts;

    // Time: actualHours or daysSpent * 6
    const handsOnHours = job.actualHours || ((job.daysSpent || 1) * 6);
    const travelHours = (job.travelTimeMinutes || 0) / 60;
    const delayHours = (job.waitingTimeMinutes || 0) / 60;
    const reworkHours = (job.reworkTimeMinutes || 0) / 60;
    const totalJobHours = Math.max(0.5, handsOnHours + travelHours + delayHours + reworkHours);

    categoryMap[cat].jobCount += 1;
    categoryMap[cat].totalAgreedPrice += job.agreedPrice;
    categoryMap[cat].totalPaidAmount += job.paidAmount;
    categoryMap[cat].totalMaterialCosts += job.materialCosts;
    categoryMap[cat].totalTravelCosts += travelCost;
    categoryMap[cat].totalNetProfit += netProfit;
    categoryMap[cat].totalHours += totalJobHours;
  }

  const results: CategoryProfitabilityMetrics[] = Object.entries(categoryMap).map(([category, data]) => {
    const profitMarginPercent = data.totalAgreedPrice > 0
      ? Math.round((data.totalNetProfit / data.totalAgreedPrice) * 1000) / 10
      : 0;

    const effectiveHourlyRate = data.totalHours > 0
      ? Math.round(data.totalNetProfit / data.totalHours)
      : 0;

    return {
      category,
      jobCount: data.jobCount,
      totalAgreedPrice: data.totalAgreedPrice,
      totalPaidAmount: data.totalPaidAmount,
      totalMaterialCosts: data.totalMaterialCosts,
      totalTravelCosts: data.totalTravelCosts,
      netProfit: data.totalNetProfit,
      profitMarginPercent,
      totalBillableHours: Math.round(data.totalHours * 10) / 10,
      effectiveHourlyRate,
      isAboveBenchmark: effectiveHourlyRate >= benchmarkHourlyRate
    };
  });

  // Sort descending by net profit
  return results.sort((a, b) => b.netProfit - a.netProfit);
}

/**
 * 2. Calculate Field Time Allocation (Hands-on vs Travel vs Delay vs Callback Rework)
 */
export function calculateTimeAllocation(
  jobs: Job[],
  interventions: JobIntervention[] = []
): TimeAllocationMetrics {
  let handsOnHours = 0;
  let travelHours = 0;
  let delayHours = 0;
  let reworkHours = 0;

  for (const job of jobs) {
    handsOnHours += job.actualHours || ((job.daysSpent || 1) * 6);
    travelHours += (job.travelTimeMinutes || 0) / 60;

    // Delay hours from structured waitingTimeMinutes or delay records
    if (job.waitingTimeMinutes) {
      delayHours += job.waitingTimeMinutes / 60;
    } else if (job.delays && job.delays.length > 0) {
      const minutes = job.delays.reduce((sum, d) => sum + (d.durationMinutes || 0), 0);
      delayHours += minutes / 60;
    }

    reworkHours += (job.reworkTimeMinutes || 0) / 60;
  }

  // Interventions rework hours
  for (const interv of interventions) {
    reworkHours += (interv.hoursSpent || 0);
    travelHours += (interv.travelTimeMinutes || 0) / 60;
    if (interv.reworkTimeMinutes) {
      reworkHours += interv.reworkTimeMinutes / 60;
    }
  }

  const totalRecordedHours = handsOnHours + travelHours + delayHours + reworkHours;

  const round = (val: number) => Math.round(val * 10) / 10;
  const pct = (val: number) => totalRecordedHours > 0 ? Math.round((val / totalRecordedHours) * 100) : 0;

  return {
    handsOnHours: round(handsOnHours),
    travelHours: round(travelHours),
    delayHours: round(delayHours),
    reworkHours: round(reworkHours),
    totalRecordedHours: round(totalRecordedHours),
    handsOnPercent: pct(handsOnHours),
    travelPercent: pct(travelHours),
    delayPercent: pct(delayHours),
    reworkPercent: pct(reworkHours)
  };
}

/**
 * 3. Calculate Delay Breakdown & Financial Bottleneck Cost
 */
export function calculateDelayBreakdown(
  jobs: Job[],
  benchmarkHourlyRate: number = DEFAULT_HOURLY_BENCHMARK
): DelayBreakdownItem[] {
  const breakdownMap: Record<string, { occurrences: number; totalMinutes: number; label: string }> = {};

  const CATEGORY_LABELS: Record<string, string> = {
    WAITING_FOR_PARTS: 'Attente pièces (Droguerie / Fournisseur)',
    MISSING_TOOL: 'Outil manquant',
    CLIENT_DELAY: 'Retard / Absence client',
    SITE_UNPREPARED: 'Site non prêt / En chantier',
    CABLING_PROBLEM: 'Complication passage câbles',
    POWER_ISSUE: 'Problème alimentation 220V',
    ACCESS_PROBLEM: 'Accès toiture / local verrouillé',
    NETWORK_PROBLEM: 'Box IP / Réseau injoignable',
    TRAVEL: 'Bouchons / Retard transport',
    REWORK: 'Reprise câblage / Caméra défectueuse',
    OTHER: 'Autre imprévu chantier'
  };

  let totalAllDelayMinutes = 0;

  for (const job of jobs) {
    if (job.delays && job.delays.length > 0) {
      for (const d of job.delays) {
        const cat = d.category || 'OTHER';
        const mins = d.durationMinutes || 30;
        const label = d.notes || CATEGORY_LABELS[cat] || cat;

        if (!breakdownMap[cat]) {
          breakdownMap[cat] = { occurrences: 0, totalMinutes: 0, label: CATEGORY_LABELS[cat] || label };
        }
        breakdownMap[cat].occurrences += 1;
        breakdownMap[cat].totalMinutes += mins;
        totalAllDelayMinutes += mins;
      }
    } else if (job.waitingReason) {
      // Backward compatibility with legacy waitingReason
      const cat = 'WAITING_LEGACY';
      const mins = (job.daysPaused || 1) * 60;
      if (!breakdownMap[cat]) {
        breakdownMap[cat] = { occurrences: 0, totalMinutes: 0, label: job.waitingReason };
      }
      breakdownMap[cat].occurrences += 1;
      breakdownMap[cat].totalMinutes += mins;
      totalAllDelayMinutes += mins;
    }
  }

  const items: DelayBreakdownItem[] = Object.entries(breakdownMap).map(([category, data]) => {
    const hours = Math.round((data.totalMinutes / 60) * 10) / 10;
    const percentOfDelays = totalAllDelayMinutes > 0 ? Math.round((data.totalMinutes / totalAllDelayMinutes) * 100) : 0;
    const estimatedCostMAD = Math.round(hours * benchmarkHourlyRate);

    return {
      category,
      label: data.label,
      occurrences: data.occurrences,
      totalMinutes: data.totalMinutes,
      totalHours: hours,
      percentOfDelays,
      estimatedCostMAD
    };
  });

  // Sort descending by total lost hours
  return items.sort((a, b) => b.totalMinutes - a.totalMinutes);
}

/**
 * 4. Calculate Client Profitability & Identify Red-Flag Clients
 */
export function calculateClientProfitability(
  jobs: Job[],
  interventions: JobIntervention[] = []
): ClientProfitabilityItem[] {
  const clientMap: Record<string, {
    jobCount: number;
    totalAgreed: number;
    totalPaid: number;
    totalMaterialCosts: number;
    totalTravelCosts: number;
    totalHours: number;
    reworkHours: number;
    callbackCount: number;
  }> = {};

  for (const job of jobs) {
    const client = job.clientName || 'Client Inconnu';
    if (!clientMap[client]) {
      clientMap[client] = {
        jobCount: 0,
        totalAgreed: 0,
        totalPaid: 0,
        totalMaterialCosts: 0,
        totalTravelCosts: 0,
        totalHours: 0,
        reworkHours: 0,
        callbackCount: 0
      };
    }

    const hours = job.actualHours || ((job.daysSpent || 1) * 6);
    clientMap[client].jobCount += 1;
    clientMap[client].totalAgreed += job.agreedPrice;
    clientMap[client].totalPaid += job.paidAmount;
    clientMap[client].totalMaterialCosts += job.materialCosts;
    clientMap[client].totalTravelCosts += (job.travelCost || 0);
    clientMap[client].totalHours += hours;
    clientMap[client].reworkHours += ((job.reworkTimeMinutes || 0) / 60);
  }

  // Factor in callbacks/interventions
  for (const interv of interventions) {
    const matchingJob = jobs.find(j => j.id === interv.jobId);
    const client = matchingJob?.clientName;
    if (client && clientMap[client]) {
      clientMap[client].callbackCount += 1;
      clientMap[client].reworkHours += (interv.hoursSpent || 0) + ((interv.reworkTimeMinutes || 0) / 60);
      clientMap[client].totalHours += (interv.hoursSpent || 0);
    }
  }

  const items: ClientProfitabilityItem[] = Object.entries(clientMap).map(([clientName, d]) => {
    const netProfit = d.totalAgreed - (d.totalMaterialCosts + d.totalTravelCosts);
    const unpaidBalance = Math.max(0, d.totalAgreed - d.totalPaid);
    const effectiveHourlyRate = d.totalHours > 0 ? Math.round(netProfit / d.totalHours) : 0;

    // Red Flag Criteria:
    // 1. High rework hours (> 3h spent on free fixes)
    // 2. High callback count (>= 2 callbacks)
    // 3. High unpaid balance (> 40% of total revenue unpaid and > 1000 MAD)
    let isRedFlag = false;
    let redFlagReason: string | undefined = undefined;

    if (d.callbackCount >= 2 || d.reworkHours >= 3) {
      isRedFlag = true;
      redFlagReason = `${d.callbackCount} SAV / ${Math.round(d.reworkHours)}h de retouche non facturée`;
    } else if (d.totalAgreed > 1000 && (unpaidBalance / d.totalAgreed) > 0.4) {
      isRedFlag = true;
      redFlagReason = `Impayé élevé: ${unpaidBalance} MAD (${Math.round((unpaidBalance / d.totalAgreed) * 100)}%)`;
    }

    return {
      clientName,
      jobCount: d.jobCount,
      totalAgreed: d.totalAgreed,
      totalPaid: d.totalPaid,
      unpaidBalance,
      netProfit,
      reworkHours: Math.round(d.reworkHours * 10) / 10,
      callbackCount: d.callbackCount,
      effectiveHourlyRate,
      isRedFlag,
      redFlagReason
    };
  });

  return items.sort((a, b) => b.netProfit - a.netProfit);
}

/**
 * 5. Calculate Warranty / Callback Drain
 */
export function calculateWarrantyDrain(
  jobs: Job[],
  interventions: JobIntervention[] = [],
  benchmarkHourlyRate: number = DEFAULT_HOURLY_BENCHMARK
): WarrantyDrainMetrics {
  const completedJobs = jobs.filter(j => j.status === 'completed' || j.status === 'paid');
  let totalReworkHours = 0;

  for (const job of jobs) {
    totalReworkHours += (job.reworkTimeMinutes || 0) / 60;
  }

  for (const interv of interventions) {
    totalReworkHours += (interv.hoursSpent || 0) + ((interv.reworkTimeMinutes || 0) / 60);
  }

  const callbackRatePercent = completedJobs.length > 0
    ? Math.round((interventions.length / completedJobs.length) * 1000) / 10
    : 0;

  const estimatedReworkCostMAD = Math.round(totalReworkHours * benchmarkHourlyRate);

  return {
    totalInterventions: interventions.length,
    resolvedInterventions: interventions.filter(i => i.resolved).length,
    totalJobsCount: completedJobs.length,
    callbackRatePercent,
    totalReworkHours: Math.round(totalReworkHours * 10) / 10,
    estimatedReworkCostMAD
  };
}
