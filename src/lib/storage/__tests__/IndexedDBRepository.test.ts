import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { IndexedDBRepository } from '../indexeddb/IndexedDBRepository';
import { resetDbPromise } from '../indexeddb/db';
import type { IDataRepository } from '../repository';
import type { Job, JobPaymentCollectionRequest, DebtObligation } from '../../../types';

function createMockRemoteRepository(initialData?: Partial<{
  jobs: Job[];
  jobPayments: any[];
  jobInterventions: any[];
  businessExpenses: any[];
  personalExpenses: any[];
  debts: DebtObligation[];
  debtPayments: any[];
  clients: any[];
}>): IDataRepository {
  const data = {
    jobs: initialData?.jobs || [],
    jobPayments: initialData?.jobPayments || [],
    jobInterventions: initialData?.jobInterventions || [],
    businessExpenses: initialData?.businessExpenses || [],
    personalExpenses: initialData?.personalExpenses || [],
    debts: initialData?.debts || [],
    debtPayments: initialData?.debtPayments || [],
    clients: initialData?.clients || []
  };

  return {
    getJobs: async () => data.jobs,
    saveJob: async (j) => { data.jobs.push(j); return j; },
    deleteJob: async () => true,
    getJobPayments: async () => data.jobPayments,
    saveJobPayment: async (p) => { data.jobPayments.push(p); return p; },
    collectJobPayment: async () => ({} as any),
    getJobInterventions: async () => data.jobInterventions,
    saveJobIntervention: async (i) => { data.jobInterventions.push(i); return i; },
    getBusinessExpenses: async () => data.businessExpenses,
    saveBusinessExpense: async (e) => { data.businessExpenses.push(e); return e; },
    deleteBusinessExpense: async () => true,
    getPersonalExpenses: async () => data.personalExpenses,
    savePersonalExpense: async (e) => { data.personalExpenses.push(e); return e; },
    deletePersonalExpense: async () => true,
    getDebtObligations: async () => data.debts,
    saveDebtObligation: async (d) => { data.debts.push(d); return d; },
    deleteDebtObligation: async () => true,
    getDebtPayments: async () => data.debtPayments,
    saveDebtPayment: async (p) => { data.debtPayments.push(p); return p; },
    getClients: async () => data.clients,
    saveClient: async (c) => { data.clients.push(c); return c; },
    exportAllData: async () => JSON.stringify(data),
    importAllData: async () => true,
    clearAllData: async () => true
  };
}

describe('IndexedDBRepository with Safe Initial Hydration', () => {
  beforeEach(async () => {
    resetDbPromise();
    const tempRepo = new IndexedDBRepository(createMockRemoteRepository());
    await tempRepo.clearAllData();
    resetDbPromise();
  });

  describe('Safe First-Load Hydration', () => {
    it('automatically hydrates from remote repository when local IndexedDB is empty', async () => {
      const mockRemote = createMockRemoteRepository({
        jobs: [
          {
            id: 'job-remote-1',
            title: 'Hikvision CCTV 4-Cam Setup',
            clientName: 'Restaurant Casablanca',
            category: 'Camera Installation',
            status: 'in_progress',
            agreedPrice: 8000,
            paidAmount: 3000,
            materialCosts: 4000,
            startDate: '2026-03-01',
            daysSpent: 1,
            daysPaused: 0
          }
        ],
        debts: [
          {
            id: 'debt-remote-1',
            creditor: 'Droguerie Al Amine',
            type: 'business_supplier',
            totalAmount: 12000,
            remainingBalance: 5000,
            status: 'active'
          }
        ]
      });

      const repo = new IndexedDBRepository(mockRemote);

      // Verify that local database hydrates and returns backend data
      const jobs = await repo.getJobs();
      expect(jobs).toHaveLength(1);
      expect(jobs[0].title).toBe('Hikvision CCTV 4-Cam Setup');

      const debts = await repo.getDebtObligations();
      expect(debts).toHaveLength(1);
      expect(debts[0].creditor).toBe('Droguerie Al Amine');
    });

    it('does NOT overwrite local changes on subsequent loads once hydrated', async () => {
      const mockRemote = createMockRemoteRepository({
        jobs: [
          {
            id: 'job-init-1',
            title: 'Initial Title',
            clientName: 'Client 1',
            category: 'Camera Installation',
            status: 'in_progress',
            agreedPrice: 2000,
            paidAmount: 0,
            materialCosts: 500,
            startDate: '2026-03-01',
            daysSpent: 1,
            daysPaused: 0
          }
        ]
      });

      const repo1 = new IndexedDBRepository(mockRemote);
      const jobs1 = await repo1.getJobs();
      expect(jobs1[0].title).toBe('Initial Title');

      // Locally update the job
      await repo1.saveJob({
        ...jobs1[0],
        title: 'Locally Modified Title'
      });

      // Simulate app restart with a new repository instance pointing to same backend
      const repo2 = new IndexedDBRepository(mockRemote);
      const jobs2 = await repo2.getJobs();

      // Local modification must remain intact!
      expect(jobs2).toHaveLength(1);
      expect(jobs2[0].title).toBe('Locally Modified Title');
    });
  });

  describe('Core CRUD & Referential Integrity', () => {
    it('blocks job deletion when payments or interventions exist', async () => {
      const repo = new IndexedDBRepository(createMockRemoteRepository());

      const job: Job = {
        id: 'job-test-delete',
        title: 'Access Control System',
        clientName: 'Dr. Bennani Clinic',
        category: 'Access Control',
        status: 'in_progress',
        agreedPrice: 6000,
        paidAmount: 2000,
        materialCosts: 1800,
        startDate: '2026-03-05',
        daysSpent: 1,
        daysPaused: 0
      };
      await repo.saveJob(job);

      // Add payment
      await repo.saveJobPayment({
        id: 'pay-test-1',
        jobId: 'job-test-delete',
        amount: 2000,
        date: '2026-03-05'
      });

      await expect(repo.deleteJob('job-test-delete')).rejects.toThrow(/Cannot delete "Access Control System"/);

      // Also auto-ingested client should exist
      const clients = await repo.getClients();
      expect(clients.some(c => c.name === 'Dr. Bennani Clinic')).toBe(true);
    });

    it('blocks debt deletion when debt payments exist', async () => {
      const repo = new IndexedDBRepository(createMockRemoteRepository());

      const debt: DebtObligation = {
        id: 'debt-test-del',
        creditor: 'Droguerie Mustapha',
        type: 'business_supplier',
        totalAmount: 5000,
        remainingBalance: 4000,
        status: 'active'
      };
      await repo.saveDebtObligation(debt);

      await repo.saveDebtPayment({
        id: 'dpay-test-1',
        debtId: 'debt-test-del',
        amount: 1000,
        date: '2026-03-06'
      });

      await expect(repo.deleteDebtObligation('debt-test-del')).rejects.toThrow(/Cannot delete debt "Droguerie Mustapha"/);
    });
  });

  describe('Atomic Transactions', () => {
    it('atomically collects job payment, updates paidAmount, status and activity logs', async () => {
      const repo = new IndexedDBRepository(createMockRemoteRepository());

      const job: Job = {
        id: 'job-atomic',
        title: 'Store Camera Upgrade',
        clientName: 'Epicerie Atlas',
        category: 'Camera Installation',
        status: 'in_progress',
        agreedPrice: 4000,
        paidAmount: 1000,
        materialCosts: 1500,
        startDate: '2026-03-02',
        daysSpent: 1,
        daysPaused: 0,
        logs: []
      };
      await repo.saveJob(job);

      const request: JobPaymentCollectionRequest = {
        payment: {
          id: 'pay-atomic-2',
          amount: 3000,
          date: '2026-03-07',
          notes: 'Final payment collected'
        },
        jobUpdate: {
          status: 'completed',
          completedDate: '2026-03-07',
          logEntry: {
            id: 'log-atomic-1',
            timestamp: '2026-03-07',
            status: 'completed',
            note: 'Installed 4 Dahua IP cams, testing passed and client approved'
          }
        }
      };

      const result = await repo.collectJobPayment('job-atomic', request);
      expect(result.paidAmount).toBe(3000); // 3000 total paid from payments
      expect(result.status).toBe('completed');
      expect(result.completedDate).toBe('2026-03-07');
      expect(result.logs?.[0].note).toContain('testing passed');

      const allPayments = await repo.getJobPayments();
      expect(allPayments).toHaveLength(1);
    });

    it('atomically tracks debt payment and sets status to paid_off when remaining balance hits zero', async () => {
      const repo = new IndexedDBRepository(createMockRemoteRepository());

      const debt: DebtObligation = {
        id: 'debt-payoff',
        creditor: 'Microfinance Loan',
        type: 'personal_loan',
        totalAmount: 3000,
        remainingBalance: 3000,
        status: 'active'
      };
      await repo.saveDebtObligation(debt);

      // Make payment
      await repo.saveDebtPayment({
        id: 'dpay-full',
        debtId: 'debt-payoff',
        amount: 3000,
        date: '2026-03-08'
      });

      const debts = await repo.getDebtObligations();
      const updated = debts.find(d => d.id === 'debt-payoff');
      expect(updated?.remainingBalance).toBe(0);
      expect(updated?.status).toBe('paid_off');
    });
  });

  describe('Import / Export Safety', () => {
    it('exports all entity stores with metadata and safely imports valid backup', async () => {
      const repo = new IndexedDBRepository(createMockRemoteRepository());

      await repo.saveBusinessExpense({
        id: 'bexp-safe-1',
        title: 'Cable Cat6 Reel',
        amount: 850,
        category: 'Hardware & Materials (Matériel)',
        date: '2026-03-05'
      });

      const exportString = await repo.exportAllData();
      expect(exportString).toContain('Cable Cat6 Reel');

      await repo.clearAllData();
      expect(await repo.getBusinessExpenses()).toHaveLength(0);

      const success = await repo.importAllData(exportString);
      expect(success).toBe(true);

      const restoredExpenses = await repo.getBusinessExpenses();
      expect(restoredExpenses).toHaveLength(1);
      expect(restoredExpenses[0].title).toBe('Cable Cat6 Reel');
    });

    it('rejects malformed import data without corrupting existing database', async () => {
      const repo = new IndexedDBRepository(createMockRemoteRepository());

      await repo.saveBusinessExpense({
        id: 'bexp-keep',
        title: 'Keep Me',
        amount: 200,
        category: 'Tools & Work Equipment (Outillage)',
        date: '2026-03-05'
      });

      const invalidPayload = JSON.stringify({
        jobs: 'THIS_SHOULD_BE_AN_ARRAY_NOT_A_STRING'
      });

      const success = await repo.importAllData(invalidPayload);
      expect(success).toBe(false);

      // Existing data must remain intact!
      const currentExpenses = await repo.getBusinessExpenses();
      expect(currentExpenses).toHaveLength(1);
      expect(currentExpenses[0].title).toBe('Keep Me');
    });
  });
});
