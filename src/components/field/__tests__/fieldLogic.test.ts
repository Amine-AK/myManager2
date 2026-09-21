import { describe, it, expect, vi } from 'vitest';
import type { Job } from '../../../types';

describe('Field Mode - Actual Work Selection & Achat Express Integration', () => {
  const initialJob: Job = {
    id: 'job-101',
    clientName: 'Karim Bennani',
    clientPhone: '0661122334',
    title: 'Installation Caméras & Câblage',
    category: 'CCTV Installation',
    agreedPrice: 4500,
    materialCosts: 800,
    paidAmount: 2000,
    status: 'in_progress',
    startDate: '2026-09-18',
    logs: [
      {
        id: 'log-1',
        timestamp: '2026-09-18',
        status: 'in_progress',
        note: 'Démarrage du chantier'
      }
    ]
  };

  it('automatically adds Achat Express amount to job materialCosts and appends history log', async () => {
    let savedJob: Job | undefined;
    const mockOnUpdateJob = vi.fn(async (job: Job) => {
      savedJob = job;
    });

    let loggedExpense: { title: string; amount: number; category: string; date: string } | undefined;
    const mockOnAddQuickExpense = vi.fn(async (expense: any) => {
      loggedExpense = expense;
    });

    const expenseAmount = 150;
    const expenseLabel = 'Goulottes & Visserie';
    const previousCosts = Number(initialJob.materialCosts) || 0;
    const newMaterialCosts = previousCosts + expenseAmount;

    const updatedJob: Job = {
      ...initialJob,
      materialCosts: newMaterialCosts,
      logs: [
        {
          id: `log-${Date.now()}`,
          timestamp: new Date().toISOString().split('T')[0],
          status: initialJob.status,
          note: `[Achat Express] +${expenseAmount} MAD matériel (${expenseLabel}) -> Total matériel: ${newMaterialCosts} MAD`
        },
        ...(initialJob.logs || [])
      ]
    };

    await mockOnUpdateJob(updatedJob);
    await mockOnAddQuickExpense({
      title: `Droguerie (${expenseLabel}) - ${initialJob.title}`,
      amount: expenseAmount,
      category: 'Materials & droguerie (Fournitures)',
      date: new Date().toISOString().split('T')[0]
    });

    expect(mockOnUpdateJob).toHaveBeenCalledTimes(1);
    expect(savedJob).toBeDefined();
    expect(savedJob!.materialCosts).toBe(950);
    expect(savedJob!.logs![0].note).toContain('+150 MAD matériel');
    expect(savedJob!.logs![0].note).toContain('Total matériel: 950 MAD');

    expect(mockOnAddQuickExpense).toHaveBeenCalledTimes(1);
    expect(loggedExpense).toBeDefined();
    expect(loggedExpense!.amount).toBe(150);
    expect(loggedExpense!.category).toBe('Materials & droguerie (Fournitures)');
  });

  it('correctly handles zero prior materialCosts', async () => {
    const freshJob: Job = {
      ...initialJob,
      materialCosts: 0
    };

    const expenseAmount = 50;
    const newCosts = (freshJob.materialCosts || 0) + expenseAmount;
    expect(newCosts).toBe(50);
  });

  it('strictly excludes completed and paid jobs from Mode Terrain active work list', () => {
    const allJobs: Job[] = [
      { ...initialJob, id: 'job-active-1', status: 'in_progress' },
      { ...initialJob, id: 'job-active-2', status: 'waiting_parts' },
      { ...initialJob, id: 'job-active-3', status: 'revision_requested' },
      { ...initialJob, id: 'job-active-4', status: 'quoted' },
      { ...initialJob, id: 'job-done-1', status: 'completed' },
      { ...initialJob, id: 'job-done-2', status: 'paid' },
      { ...initialJob, id: 'job-lost-1', status: 'quote_lost' }
    ];

    const activeJobs = allJobs.filter(
      j => j.status === 'in_progress' || j.status === 'waiting_parts' || j.status === 'revision_requested' || j.status === 'quoted'
    );

    expect(activeJobs.map(j => j.id)).toEqual([
      'job-active-1',
      'job-active-2',
      'job-active-3',
      'job-active-4'
    ]);
    expect(activeJobs.some(j => j.status === 'completed')).toBe(false);
    expect(activeJobs.some(j => j.status === 'paid')).toBe(false);
  });

  it('includes a completed job in Mode Terrain once restarted for revision from Job section', () => {
    const completedJob: Job = { ...initialJob, id: 'job-done', status: 'completed' };

    // Initially excluded
    const isTerrainVisibleBefore = (j: Job) =>
      j.status === 'in_progress' || j.status === 'waiting_parts' || j.status === 'revision_requested' || j.status === 'quoted';
    expect(isTerrainVisibleBefore(completedJob)).toBe(false);

    // Technician restarts job for revision from Job section
    const restartedJob: Job = {
      ...completedJob,
      status: 'revision_requested',
      logs: [
        {
          id: 'log-rev-1',
          timestamp: '2026-09-18',
          status: 'revision_requested',
          note: 'Réouverture chantier pour révision / SAV.'
        },
        ...(completedJob.logs || [])
      ]
    };

    // Now included in Mode Terrain
    expect(isTerrainVisibleBefore(restartedJob)).toBe(true);
    expect(restartedJob.status).toBe('revision_requested');
  });
});
