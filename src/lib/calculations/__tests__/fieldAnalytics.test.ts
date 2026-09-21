import { describe, it, expect } from 'vitest';
import {
  calculateCategoryProfitability,
  calculateTimeAllocation,
  calculateDelayBreakdown,
  calculateClientProfitability,
  calculateWarrantyDrain
} from '../fieldAnalytics';
import type { Job, JobIntervention } from '../../../types';

describe('Field Service Analytics & True Profitability Engine', () => {
  const sampleJobs: Job[] = [
    {
      id: 'job-1',
      title: 'Installation 4 Caméras Dahua',
      clientName: 'Pharmacie Atlas',
      category: 'Camera Installation',
      status: 'completed',
      agreedPrice: 5000,
      paidAmount: 5000,
      materialCosts: 2000,
      travelCost: 100,
      actualHours: 10,
      travelTimeMinutes: 60,
      waitingTimeMinutes: 60,
      reworkTimeMinutes: 0,
      startDate: '2026-03-01'
    },
    {
      id: 'job-2',
      title: 'Installation Alarme Ajax',
      clientName: 'Villa Dar Bouazza',
      category: 'Alarm Installation',
      status: 'completed',
      agreedPrice: 8000,
      paidAmount: 8000,
      materialCosts: 3000,
      travelCost: 200,
      actualHours: 12,
      travelTimeMinutes: 120,
      waitingTimeMinutes: 0,
      reworkTimeMinutes: 0,
      startDate: '2026-03-05'
    },
    {
      id: 'job-3',
      title: 'Maintenance Caméras',
      clientName: 'Café Paris',
      category: 'Camera Installation',
      status: 'completed',
      agreedPrice: 1200,
      paidAmount: 600,
      materialCosts: 200,
      travelCost: 50,
      actualHours: 6,
      travelTimeMinutes: 30,
      waitingTimeMinutes: 90,
      reworkTimeMinutes: 120, // 2h rework
      delays: [
        {
          id: 'd-1',
          category: 'WAITING_FOR_PARTS',
          durationMinutes: 90,
          createdAt: '2026-03-10'
        }
      ],
      startDate: '2026-03-10'
    }
  ];

  const sampleInterventions: JobIntervention[] = [
    {
      id: 'int-1',
      jobId: 'job-3',
      date: '2026-03-15',
      reason: 'Caméra 2 floue suite à coupure courant',
      resolved: true,
      hoursSpent: 2,
      travelTimeMinutes: 30,
      reworkTimeMinutes: 60
    },
    {
      id: 'int-2',
      jobId: 'job-3',
      date: '2026-03-20',
      reason: 'Connecteur BNC arraché par le vent',
      resolved: false,
      hoursSpent: 1.5,
      travelTimeMinutes: 30
    }
  ];

  it('calculates category profitability and effective hourly rates accurately', () => {
    const result = calculateCategoryProfitability(sampleJobs, 150);
    expect(result).toHaveLength(2);

    const alarmCat = result.find(c => c.category === 'Alarm Installation');
    expect(alarmCat).toBeDefined();
    // Revenue: 8000, Costs: 3000 + 200 = 3200, Net profit: 4800
    expect(alarmCat?.netProfit).toBe(4800);
    expect(alarmCat?.profitMarginPercent).toBe(60); // 4800 / 8000 = 60%
    // Hours: 12 + 2 = 14h -> EHR: 4800 / 14 = ~343 MAD/h
    expect(alarmCat?.effectiveHourlyRate).toBeGreaterThan(300);
    expect(alarmCat?.isAboveBenchmark).toBe(true);

    const cameraCat = result.find(c => c.category === 'Camera Installation');
    expect(cameraCat).toBeDefined();
    expect(cameraCat?.jobCount).toBe(2);
    expect(cameraCat?.totalAgreedPrice).toBe(6200);
  });

  it('calculates overall time allocation accurately across hands-on, travel, delay, and rework', () => {
    const allocation = calculateTimeAllocation(sampleJobs, sampleInterventions);

    expect(allocation.handsOnHours).toBe(28); // 10 + 12 + 6
    expect(allocation.travelHours).toBeGreaterThanOrEqual(4.5); // 1h + 2h + 0.5h + 0.5h + 0.5h = 4.5h
    expect(allocation.delayHours).toBeGreaterThanOrEqual(2.5); // 1h + 1.5h
    expect(allocation.reworkHours).toBeGreaterThanOrEqual(6.5); // 2h (job-3) + 3h (int-1) + 1.5h (int-2)

    expect(allocation.totalRecordedHours).toBeGreaterThan(40);
    expect(allocation.handsOnPercent + allocation.travelPercent + allocation.delayPercent + allocation.reworkPercent).toBeCloseTo(100, -1);
  });

  it('breaks down delays and computes estimated financial loss', () => {
    const delays = calculateDelayBreakdown(sampleJobs, 150);
    expect(delays.length).toBeGreaterThanOrEqual(1);

    const partsDelay = delays.find(d => d.category === 'WAITING_FOR_PARTS');
    expect(partsDelay).toBeDefined();
    expect(partsDelay?.totalMinutes).toBe(90);
    expect(partsDelay?.totalHours).toBe(1.5);
    expect(partsDelay?.estimatedCostMAD).toBe(225); // 1.5h * 150 MAD
  });

  it('identifies red-flag clients with excessive callbacks or unpaid balances', () => {
    const clients = calculateClientProfitability(sampleJobs, sampleInterventions);
    expect(clients).toHaveLength(3);

    const riskyClient = clients.find(c => c.clientName === 'Café Paris');
    expect(riskyClient).toBeDefined();
    expect(riskyClient?.callbackCount).toBe(2);
    expect(riskyClient?.isRedFlag).toBe(true);
    expect(riskyClient?.redFlagReason).toContain('SAV');

    const healthyClient = clients.find(c => c.clientName === 'Pharmacie Atlas');
    expect(healthyClient).toBeDefined();
    expect(healthyClient?.isRedFlag).toBe(false);
  });

  it('calculates warranty drain and unbilled rework financial loss', () => {
    const drain = calculateWarrantyDrain(sampleJobs, sampleInterventions, 150);

    expect(drain.totalInterventions).toBe(2);
    expect(drain.resolvedInterventions).toBe(1);
    expect(drain.totalJobsCount).toBe(3);
    // 2 callbacks / 3 completed jobs = ~66.7%
    expect(drain.callbackRatePercent).toBe(66.7);
    expect(drain.totalReworkHours).toBeGreaterThanOrEqual(6.5);
    expect(drain.estimatedReworkCostMAD).toBeGreaterThanOrEqual(975); // >= 6.5h * 150
  });
});
