import { describe, it, expect } from 'vitest';
import {
  calculateJobEconomicBreakdown,
  calculateAggregateEconomicMetrics
} from '../effectiveHourlyRate';
import type { Job, JobIntervention, BusinessExpense } from '../../../types';

describe('Effective Hourly Rate & Field Service Economics Engine', () => {
  it('correctly calculates single job economic breakdown with travel and diagnostic time', () => {
    const mockJob: Job = {
      id: 'job-cctv-1',
      title: '4x Hikvision CCTV Installation',
      clientName: 'Dr. Tazi Clinic',
      category: 'CCTV Installation',
      status: 'paid',
      agreedPrice: 2000,
      paidAmount: 2000,
      materialCosts: 500,
      startDate: '2026-09-01',
      actualHours: 6,
      diagnosticTimeMinutes: 30, // 0.5h
      travelTimeMinutes: 60,     // 1.0h
      waitingTimeMinutes: 30,    // 0.5h
      travelCost: 100            // 100 MAD fuel
    };

    const breakdown = calculateJobEconomicBreakdown(mockJob);

    // Total economic hours = 6 (labor) + 0.5 (diag) + 1.0 (travel) + 0.5 (waiting) = 8.0 hours
    expect(breakdown.totalEconomicHours).toBe(8);
    expect(breakdown.laborHours).toBe(6);
    expect(breakdown.diagnosticHours).toBe(0.5);
    expect(breakdown.travelHours).toBe(1);
    expect(breakdown.waitingHours).toBe(0.5);
    expect(breakdown.travelCost).toBe(100);

    // Net Job Profit = Paid (2000) - Materials (500) - Travel (100) = 1400 MAD
    expect(breakdown.netJobProfit).toBe(1400);

    // Effective Hourly Rate = 1400 / 8 = 175 MAD/hour
    expect(breakdown.effectiveHourlyRate).toBe(175);
    expect(breakdown.hasCallback).toBe(false);
  });

  it('handles zero economic hours safely without NaN or Infinity', () => {
    const mockJob: Job = {
      id: 'job-zero-1',
      title: 'Quoted Installation',
      clientName: 'Amine',
      category: 'CCTV Installation',
      status: 'quoted',
      agreedPrice: 1500,
      paidAmount: 0,
      materialCosts: 0,
      startDate: '2026-09-02'
    };

    const breakdown = calculateJobEconomicBreakdown(mockJob);

    expect(breakdown.totalEconomicHours).toBe(0);
    expect(breakdown.effectiveHourlyRate).toBe(0);
    expect(Number.isFinite(breakdown.effectiveHourlyRate)).toBe(true);
  });

  it('reveals true negative hourly rate when material and travel costs exceed payment', () => {
    const mockJob: Job = {
      id: 'job-loss-1',
      title: 'Underquoted Long Distance Repair',
      clientName: 'Rural Farm',
      category: 'Camera Error / Repair',
      status: 'paid',
      agreedPrice: 400,
      paidAmount: 400,
      materialCosts: 350,
      travelCost: 150,           // Total costs = 500 MAD (exceeds 400 MAD income)
      startDate: '2026-09-03',
      actualHours: 4,
      travelTimeMinutes: 60      // 1 hour
    };

    const breakdown = calculateJobEconomicBreakdown(mockJob);

    // Net Profit = 400 - 350 - 150 = -100 MAD
    expect(breakdown.netJobProfit).toBe(-100);
    // Total Hours = 4 + 1 = 5 hours
    expect(breakdown.totalEconomicHours).toBe(5);
    // Effective Hourly Rate = -100 / 5 = -20 MAD/hour (STRICT PRINCIPLE: Never hide negative returns)
    expect(breakdown.effectiveHourlyRate).toBe(-20);
  });

  it('incorporates post-completion callbacks into total economic rework time', () => {
    const mockJob: Job = {
      id: 'job-callback-1',
      title: 'Fiber Sharing Installation',
      clientName: 'Mestour',
      category: 'Fiber Sharing (Partage Fibre)',
      status: 'paid',
      agreedPrice: 1000,
      paidAmount: 1000,
      materialCosts: 200,
      startDate: '2026-09-01',
      actualHours: 4
    };

    const mockInterventions: JobIntervention[] = [
      {
        id: 'int-1',
        jobId: 'job-callback-1',
        date: '2026-09-05',
        reason: 'Wi-Fi disconnects on 2nd floor',
        resolved: true,
        hoursSpent: 2,
        reworkTimeMinutes: 30 // 0.5h rework
      }
    ];

    const breakdown = calculateJobEconomicBreakdown(mockJob, mockInterventions);

    // Initial 4h + 2.5h callback = 6.5h
    expect(breakdown.reworkHours).toBe(2.5);
    expect(breakdown.totalEconomicHours).toBe(6.5);
    expect(breakdown.hasCallback).toBe(true);

    // Net profit = 1000 - 200 = 800 MAD
    // EHR = 800 / 6.5 = 123.0769... MAD/hour
    expect(breakdown.effectiveHourlyRate).toBeCloseTo(123.08, 2);
  });

  it('calculates aggregate economic metrics, travel percentage, and rework rate', () => {
    const jobs: Job[] = [
      {
        id: 'j-1',
        title: 'Job 1',
        clientName: 'Client 1',
        category: 'CCTV Installation',
        status: 'paid',
        agreedPrice: 1500,
        paidAmount: 1500,
        materialCosts: 300,
        startDate: '2026-09-01',
        actualHours: 4,
        travelTimeMinutes: 60, // 1h travel
        travelCost: 50
      },
      {
        id: 'j-2',
        title: 'Job 2',
        clientName: 'Client 2',
        category: 'TV Repair',
        status: 'paid',
        agreedPrice: 500,
        paidAmount: 500,
        materialCosts: 100,
        startDate: '2026-09-02',
        actualHours: 3,
        reworkTimeMinutes: 60 // 1h rework
      }
    ];

    const expenses: BusinessExpense[] = [
      {
        id: 'b-1',
        title: 'Workshop tools',
        amount: 200,
        category: 'Tools & Equipment (Outillage)',
        date: '2026-09-01'
      }
    ];

    const metrics = calculateAggregateEconomicMetrics(jobs, expenses);

    // Job 1: 4h + 1h = 5h. Job 2: 3h + 1h = 4h. Total economic hours = 9h
    expect(metrics.totalEconomicHours).toBe(9);
    expect(metrics.travelTimeHours).toBe(1);
    expect(metrics.totalTravelCost).toBe(50);
    // Travel % = (1 / 9) * 100 = 11.11%
    expect(metrics.travelPercentageOfTime).toBeCloseTo(11.11, 2);

    // Rework hours = 1h
    expect(metrics.reworkHours).toBe(1);
    // 1 of 2 jobs had rework = 50%
    expect(metrics.reworkRatePercent).toBe(50);

    // Net business profit = (1500 + 500) - (300 + 100 materials + 200 overhead) = 2000 - 600 = 1400 MAD
    // Overall EHR = 1400 / 9 = 155.56 MAD/h
    expect(metrics.effectiveHourlyRate).toBeCloseTo(155.56, 2);
  });
});
