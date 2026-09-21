import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { IndexedDBRepository } from '../indexeddb/IndexedDBRepository';
import { SyncEngine } from '../sync/syncEngine';
import { resetDbPromise, getDb } from '../indexeddb/db';
import type { IDataRepository } from '../repository';
import type { Job, JobPaymentCollectionRequest, BusinessExpense } from '../../../types';

function createMockRemoteRepository(): IDataRepository & {
  calls: Array<{ method: string; args: any[] }>;
  failNext?: boolean;
} {
  const calls: Array<{ method: string; args: any[] }> = [];

  const store = {
    jobs: [] as Job[],
    jobPayments: [] as any[],
    jobInterventions: [] as any[],
    businessExpenses: [] as BusinessExpense[],
    personalExpenses: [] as any[],
    debts: [] as any[],
    debtPayments: [] as any[],
    clients: [] as any[]
  };

  const repo = {
    calls,
    failNext: false,
    getJobs: async () => store.jobs,
    saveJob: async (j: Job) => {
      if (repo.failNext) throw new Error('Simulated network error during saveJob');
      calls.push({ method: 'saveJob', args: [j] });
      const idx = store.jobs.findIndex(x => x.id === j.id);
      if (idx >= 0) store.jobs[idx] = j;
      else store.jobs.push(j);
      return j;
    },
    deleteJob: async (id: string) => {
      if (repo.failNext) throw new Error('Simulated network error during deleteJob');
      calls.push({ method: 'deleteJob', args: [id] });
      store.jobs = store.jobs.filter(x => x.id !== id);
      return true;
    },
    getJobPayments: async () => store.jobPayments,
    saveJobPayment: async (p: any) => {
      calls.push({ method: 'saveJobPayment', args: [p] });
      store.jobPayments.push(p);
      return p;
    },
    collectJobPayment: async (jobId: string, req: JobPaymentCollectionRequest) => {
      calls.push({ method: 'collectJobPayment', args: [jobId, req] });
      const job = store.jobs.find(j => j.id === jobId);
      if (job) {
        job.paidAmount = (job.paidAmount || 0) + req.payment.amount;
        job.status = req.jobUpdate.status;
      }
      return job || ({} as any);
    },
    getJobInterventions: async () => store.jobInterventions,
    saveJobIntervention: async (i: any) => {
      calls.push({ method: 'saveJobIntervention', args: [i] });
      store.jobInterventions.push(i);
      return i;
    },
    getBusinessExpenses: async () => store.businessExpenses,
    saveBusinessExpense: async (e: BusinessExpense) => {
      calls.push({ method: 'saveBusinessExpense', args: [e] });
      store.businessExpenses.push(e);
      return e;
    },
    deleteBusinessExpense: async (id: string) => {
      calls.push({ method: 'deleteBusinessExpense', args: [id] });
      store.businessExpenses = store.businessExpenses.filter(x => x.id !== id);
      return true;
    },
    getPersonalExpenses: async () => store.personalExpenses,
    savePersonalExpense: async (e: any) => {
      calls.push({ method: 'savePersonalExpense', args: [e] });
      store.personalExpenses.push(e);
      return e;
    },
    deletePersonalExpense: async (id: string) => {
      calls.push({ method: 'deletePersonalExpense', args: [id] });
      return true;
    },
    getDebtObligations: async () => store.debts,
    saveDebtObligation: async (d: any) => {
      calls.push({ method: 'saveDebtObligation', args: [d] });
      store.debts.push(d);
      return d;
    },
    deleteDebtObligation: async (id: string) => {
      calls.push({ method: 'deleteDebtObligation', args: [id] });
      return true;
    },
    getDebtPayments: async () => store.debtPayments,
    saveDebtPayment: async (p: any) => {
      calls.push({ method: 'saveDebtPayment', args: [p] });
      store.debtPayments.push(p);
      return p;
    },
    getClients: async () => store.clients,
    saveClient: async (c: any) => {
      calls.push({ method: 'saveClient', args: [c] });
      store.clients.push(c);
      return c;
    },
    exportAllData: async () => JSON.stringify(store),
    importAllData: async () => true,
    clearAllData: async () => true
  };

  return repo;
}

describe('Phase 3: Synchronization Engine', () => {
  beforeEach(async () => {
    resetDbPromise();
    const tempRepo = new IndexedDBRepository(createMockRemoteRepository());
    await tempRepo.clearAllData();
    resetDbPromise();
  });

  it('enqueues mutations locally in sync_queue when offline', async () => {
    const mockRemote = createMockRemoteRepository();
    const localRepo = new IndexedDBRepository(mockRemote);

    // Save job while offline
    const job: Job = {
      id: 'job-offline-1',
      title: 'Solar Inverter Cabling',
      clientName: 'Ferme Berrechid',
      category: 'Solar Installation',
      status: 'in_progress',
      agreedPrice: 4500,
      paidAmount: 0,
      materialCosts: 1200,
      startDate: '2026-03-01',
      daysSpent: 1,
      daysPaused: 0
    };

    await localRepo.saveJob(job);

    const db = await getDb();
    const queueItems = await db.getAll('sync_queue');

    // Should have enqueued job mutation (and auto-created client mutation)
    expect(queueItems.length).toBeGreaterThanOrEqual(1);
    const jobQueueItem = queueItems.find(q => q.entity === 'job' && q.entityId === 'job-offline-1');
    expect(jobQueueItem).toBeDefined();
    expect(jobQueueItem?.status).toBe('pending');
    expect(jobQueueItem?.payload.title).toBe('Solar Inverter Cabling');
  });

  it('Critical Test: offline accumulation of 5 jobs, payments, expenses, then seamless reconnection flush', async () => {
    const mockRemote = createMockRemoteRepository();
    const localRepo = new IndexedDBRepository(mockRemote);
    const sync = new SyncEngine(mockRemote);

    // 1. Turn off Internet (simulate offline)
    (sync as any).state.isOnline = false;

    // 2. Create 5 jobs offline
    for (let i = 1; i <= 5; i++) {
      await localRepo.saveJob({
        id: `job-batch-${i}`,
        title: `CCTV Installation Site #${i}`,
        clientName: `Client #${i}`,
        category: 'Camera Installation',
        status: 'in_progress',
        agreedPrice: 3000 * i,
        paidAmount: 0,
        materialCosts: 1000 * i,
        startDate: '2026-03-01',
        daysSpent: 1,
        daysPaused: 0
      });
    }

    // 3. Add expense offline
    await localRepo.saveBusinessExpense({
      id: 'bexp-batch-1',
      title: 'BNC Connectors Box (100pcs)',
      amount: 350,
      category: 'Hardware & Materials (Matériel)',
      date: '2026-03-02'
    });

    // 4. Verify local IndexedDB has all 5 jobs and expense
    const localJobs = await localRepo.getJobs();
    expect(localJobs).toHaveLength(5);
    const localExpenses = await localRepo.getBusinessExpenses();
    expect(localExpenses).toHaveLength(1);

    // Verify remote repository has NOT received them yet (still offline)
    expect(mockRemote.calls).toHaveLength(0);

    // Verify sync queue accumulated pending mutations
    const db = await getDb();
    const pendingCount = await db.count('sync_queue');
    expect(pendingCount).toBeGreaterThanOrEqual(6); // 5 jobs + 1 expense + clients

    // 5. Internet returns (simulate online)
    (sync as any).state.isOnline = true;

    // 6. Process Queue
    await sync.processQueue();

    // 7. Verify everything synchronized to remote repository!
    expect(mockRemote.calls.length).toBeGreaterThanOrEqual(6);
    expect(mockRemote.calls.some(c => c.method === 'saveJob' && c.args[0].id === 'job-batch-1')).toBe(true);
    expect(mockRemote.calls.some(c => c.method === 'saveJob' && c.args[0].id === 'job-batch-5')).toBe(true);
    expect(mockRemote.calls.some(c => c.method === 'saveBusinessExpense' && c.args[0].id === 'bexp-batch-1')).toBe(true);

    // 8. Verify sync queue is now completely flushed
    const remainingQueue = await db.getAll('sync_queue');
    expect(remainingQueue).toHaveLength(0);
    expect(sync.getState().pendingCount).toBe(0);
    expect(sync.getState().lastSyncedAt).not.toBeNull();
  });

  it('atomically replays collectJobPayment against remote API', async () => {
    const mockRemote = createMockRemoteRepository();
    const localRepo = new IndexedDBRepository(mockRemote);
    const sync = new SyncEngine(mockRemote);

    // Create job
    await localRepo.saveJob({
      id: 'job-collect-test',
      title: 'Access Control Turnstile',
      clientName: 'Tech Park',
      category: 'Access Control',
      status: 'in_progress',
      agreedPrice: 8000,
      paidAmount: 0,
      materialCosts: 3000,
      startDate: '2026-03-01',
      daysSpent: 2,
      daysPaused: 0,
      logs: []
    });

    // Collect payment
    const collectReq: JobPaymentCollectionRequest = {
      payment: {
        id: 'pay-sync-1',
        amount: 8000,
        date: '2026-03-04',
        notes: 'Final cheque cleared'
      },
      jobUpdate: {
        status: 'completed',
        completedDate: '2026-03-04',
        logEntry: {
          id: 'log-sync-1',
          timestamp: '2026-03-04',
          status: 'completed',
          note: 'Turnstile programmed and handed over to security'
        }
      }
    };

    await localRepo.collectJobPayment('job-collect-test', collectReq);

    // Process sync
    (sync as any).state.isOnline = true;
    await sync.processQueue();

    // Verify collectJobPayment was called on remote repo with exact args
    const collectCall = mockRemote.calls.find(c => c.method === 'collectJobPayment');
    expect(collectCall).toBeDefined();
    expect(collectCall?.args[0]).toBe('job-collect-test');
    expect(collectCall?.args[1].payment.amount).toBe(8000);
  });

  it('halts FIFO queue on server error and retries safely without corruption', async () => {
    const mockRemote = createMockRemoteRepository();
    const localRepo = new IndexedDBRepository(mockRemote);
    const sync = new SyncEngine(mockRemote);

    // Add 2 jobs
    await localRepo.saveJob({
      id: 'job-fail-1',
      title: 'Job 1',
      clientName: 'Client A',
      category: 'General',
      status: 'in_progress',
      agreedPrice: 1000,
      paidAmount: 0,
      materialCosts: 200,
      startDate: '2026-03-01',
      daysSpent: 1,
      daysPaused: 0
    });

    await localRepo.saveJob({
      id: 'job-fail-2',
      title: 'Job 2',
      clientName: 'Client B',
      category: 'General',
      status: 'in_progress',
      agreedPrice: 2000,
      paidAmount: 0,
      materialCosts: 400,
      startDate: '2026-03-01',
      daysSpent: 1,
      daysPaused: 0
    });

    // Make remote repo fail on next saveJob
    mockRemote.failNext = true;
    (sync as any).state.isOnline = true;

    await sync.processQueue();

    // State should record error and pending items remain
    expect(sync.getState().lastError).toContain('Simulated network error');
    expect(sync.getState().pendingCount).toBeGreaterThan(0);

    const db = await getDb();
    const queue = await db.getAll('sync_queue');
    const failedItem = queue.find(q => q.status === 'failed');
    expect(failedItem).toBeDefined();
    expect(failedItem?.retryCount).toBeGreaterThan(0);

    // Now fix network error
    mockRemote.failNext = false;
    await sync.processQueue();

    // All should be synced now!
    const finalQueue = await db.getAll('sync_queue');
    expect(finalQueue).toHaveLength(0);
    expect(sync.getState().lastError).toBeNull();
  });
});
