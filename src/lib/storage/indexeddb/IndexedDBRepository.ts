// ==========================================
// STORAGE LAYER - INDEXEDDB REPOSITORY
// Client-side, local-first offline persistence
// with safe first-load hydration from backend
// and transactional sync_queue integration
// ==========================================

import type { IDataRepository } from '../repository';
import type {
  Job,
  BusinessExpense,
  PersonalExpense,
  DebtObligation,
  DebtPayment,
  JobPayment,
  JobPaymentCollectionRequest,
  JobIntervention,
  Client
} from '../../../types';
import { getDb, type SyncQueueItem } from './db';
import { jsonFileRepository } from '../jsonFileRepository';
import { syncEngine } from '../sync/syncEngine';

function buildJobBlockMessage(title: string, paymentCount: number, paymentTotal: number, interventionCount: number): string {
  const parts: string[] = [];
  if (paymentCount > 0) parts.push(`${paymentCount} payment${paymentCount === 1 ? '' : 's'} totaling ${paymentTotal} MAD`);
  if (interventionCount > 0) parts.push(`${interventionCount} client callback${interventionCount === 1 ? '' : 's'}`);
  return `Cannot delete "${title}": it has ${parts.join(' and ')} recorded. Remove those first if you really need to delete this job.`;
}

function buildDebtBlockMessage(creditor: string, paymentCount: number, paymentTotal: number): string {
  return `Cannot delete debt "${creditor}": it has ${paymentCount} payment${paymentCount === 1 ? '' : 's'} totaling ${paymentTotal} MAD recorded. Remove those first if you really need to delete this debt.`;
}

export class IndexedDBRepository implements IDataRepository {
  private remoteRepo: IDataRepository;
  private hydrationPromise: Promise<void> | null = null;

  constructor(remoteRepo?: IDataRepository) {
    this.remoteRepo = remoteRepo || jsonFileRepository;
  }

  /**
   * Safe First-Load Hydration:
   * Checks if IndexedDB has ever been hydrated. If not, pulls existing data
   * from the backend via the remote repository and commits it to local IndexedDB.
   * On all subsequent runs, reads directly from IndexedDB.
   */
  async ensureHydrated(): Promise<void> {
    if (this.hydrationPromise) {
      return this.hydrationPromise;
    }

    this.hydrationPromise = (async () => {
      try {
        const db = await getDb();
        const meta = await db.get('_metadata', 'hydration_state');
        if (meta && meta.value?.hydrated === true) {
          return;
        }

        // Check if database has any existing local records (e.g. from previous manual entries)
        const existingJobCount = await db.count('jobs');
        if (existingJobCount > 0) {
          await db.put('_metadata', {
            key: 'hydration_state',
            value: { hydrated: true, hydratedAt: new Date().toISOString(), source: 'pre_existing' }
          });
          return;
        }

        // Fetch remote data dump
        let remoteJson: string;
        try {
          remoteJson = await this.remoteRepo.exportAllData();
        } catch (fetchErr) {
          console.warn('[IndexedDBRepository] Backend unreachable during initial hydration, starting offline:', fetchErr);
          return;
        }

        if (!remoteJson) return;

        let remoteData: any;
        try {
          remoteData = JSON.parse(remoteJson);
        } catch {
          console.warn('[IndexedDBRepository] Remote export returned invalid JSON during hydration');
          return;
        }

        if (!remoteData || typeof remoteData !== 'object') return;

        // Populate IndexedDB in an atomic transaction
        const tx = db.transaction(
          ['jobs', 'jobPayments', 'jobInterventions', 'businessExpenses', 'personalExpenses', 'debts', 'debtPayments', 'clients', '_metadata'],
          'readwrite'
        );

        const populate = async <T extends { id: string }>(storeName: any, items?: T[]) => {
          if (!Array.isArray(items)) return;
          const store = tx.objectStore(storeName);
          for (const item of items) {
            if (item && item.id) {
              await store.put(item);
            }
          }
        };

        await Promise.all([
          populate('jobs', remoteData.jobs),
          populate('jobPayments', remoteData.jobPayments),
          populate('jobInterventions', remoteData.jobInterventions),
          populate('businessExpenses', remoteData.businessExpenses),
          populate('personalExpenses', remoteData.personalExpenses),
          populate('debts', remoteData.debts),
          populate('debtPayments', remoteData.debtPayments),
          populate('clients', remoteData.clients)
        ]);

        await tx.objectStore('_metadata').put({
          key: 'hydration_state',
          value: { hydrated: true, hydratedAt: new Date().toISOString(), source: 'backend_api' }
        });

        await tx.done;
        console.log('[IndexedDBRepository] Initial hydration from backend completed successfully.');
      } catch (err) {
        console.error('[IndexedDBRepository] Error during initial hydration:', err);
      }
    })();

    return this.hydrationPromise;
  }

  private async enqueueSync(
    tx: any | null,
    entity: SyncQueueItem['entity'],
    action: SyncQueueItem['action'],
    entityId: string,
    payload?: any
  ): Promise<void> {
    const syncItem: SyncQueueItem = {
      id: `sync-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      entity,
      action,
      entityId,
      payload,
      createdAt: new Date().toISOString(),
      status: 'pending',
      retryCount: 0
    };

    if (tx) {
      await tx.objectStore('sync_queue').put(syncItem);
    } else {
      const db = await getDb();
      await db.put('sync_queue', syncItem);
    }

    syncEngine.notifyMutation();
  }

  // --- JOBS ---
  async getJobs(): Promise<Job[]> {
    await this.ensureHydrated();
    const db = await getDb();
    const jobs = await db.getAll('jobs');
    return jobs.reverse();
  }

  async saveJob(job: Job): Promise<Job> {
    await this.ensureHydrated();
    const db = await getDb();
    const tx = db.transaction(['jobs', 'clients', 'sync_queue'], 'readwrite');
    const jobStore = tx.objectStore('jobs');
    const clientStore = tx.objectStore('clients');

    await jobStore.put(job);
    await this.enqueueSync(tx, 'job', 'update', job.id, job);

    // Auto-create client if clientName provided and client doesn't exist
    if (job.clientName) {
      const clients = await clientStore.getAll();
      const existing = clients.find(c => c.name.toLowerCase() === job.clientName.toLowerCase());
      if (!existing) {
        const newClient: Client = {
          id: `cli-${Date.now()}`,
          name: job.clientName,
          phone: job.clientPhone,
          acquisitionSource: job.acquisitionSource
        };
        await clientStore.put(newClient);
        await this.enqueueSync(tx, 'client', 'create', newClient.id, newClient);
      }
    }

    await tx.done;
    return job;
  }

  async deleteJob(id: string): Promise<boolean> {
    await this.ensureHydrated();
    const db = await getDb();
    const job = await db.get('jobs', id);

    const allPayments = await db.getAllFromIndex('jobPayments', 'by-job', id);
    const allInterventions = await db.getAllFromIndex('jobInterventions', 'by-job', id);

    if (allPayments.length > 0 || allInterventions.length > 0) {
      const total = allPayments.reduce((sum, p) => sum + p.amount, 0);
      throw new Error(buildJobBlockMessage(job?.title || id, allPayments.length, total, allInterventions.length));
    }

    const tx = db.transaction(['jobs', 'sync_queue'], 'readwrite');
    await tx.objectStore('jobs').delete(id);
    await this.enqueueSync(tx, 'job', 'delete', id);
    await tx.done;

    return true;
  }

  // --- JOB PAYMENTS ---
  async getJobPayments(): Promise<JobPayment[]> {
    await this.ensureHydrated();
    const db = await getDb();
    const payments = await db.getAll('jobPayments');
    return payments.reverse();
  }

  async saveJobPayment(payment: JobPayment): Promise<JobPayment> {
    await this.ensureHydrated();
    const db = await getDb();
    const tx = db.transaction(['jobPayments', 'sync_queue'], 'readwrite');
    await tx.objectStore('jobPayments').put(payment);
    await this.enqueueSync(tx, 'jobPayment', 'create', payment.id, payment);
    await tx.done;
    return payment;
  }

  async collectJobPayment(jobId: string, request: JobPaymentCollectionRequest): Promise<Job> {
    await this.ensureHydrated();
    const db = await getDb();
    const tx = db.transaction(['jobs', 'jobPayments', 'sync_queue'], 'readwrite');
    const jobStore = tx.objectStore('jobs');
    const payStore = tx.objectStore('jobPayments');

    const job = await jobStore.get(jobId);
    if (!job) {
      await tx.done;
      throw new Error(`Job ${jobId} not found`);
    }

    // Save payment locally
    const paymentRecord: JobPayment = {
      ...request.payment,
      jobId
    };
    await payStore.put(paymentRecord);

    // Get all payments for this job to compute totalPaid atomically
    const jobPaymentsIndex = payStore.index('by-job');
    const existingPayments = await jobPaymentsIndex.getAll(jobId);
    const totalPaid = existingPayments.reduce((sum, p) => sum + p.amount, 0);

    const updatedJob: Job = {
      ...job,
      paidAmount: Math.min(job.agreedPrice, totalPaid),
      status: request.jobUpdate.status,
      completedDate: request.jobUpdate.completedDate || job.completedDate,
      logs: [request.jobUpdate.logEntry, ...(job.logs || [])]
    };

    await jobStore.put(updatedJob);

    // Enqueue atomic payment collection sync item
    await this.enqueueSync(tx, 'job', 'collectJobPayment', jobId, request);

    await tx.done;
    return updatedJob;
  }

  // --- JOB INTERVENTIONS ---
  async getJobInterventions(): Promise<JobIntervention[]> {
    await this.ensureHydrated();
    const db = await getDb();
    const interventions = await db.getAll('jobInterventions');
    return interventions.reverse();
  }

  async saveJobIntervention(intervention: JobIntervention): Promise<JobIntervention> {
    await this.ensureHydrated();
    const db = await getDb();
    const tx = db.transaction(['jobInterventions', 'sync_queue'], 'readwrite');
    await tx.objectStore('jobInterventions').put(intervention);
    await this.enqueueSync(tx, 'jobIntervention', 'create', intervention.id, intervention);
    await tx.done;
    return intervention;
  }

  // --- BUSINESS EXPENSES ---
  async getBusinessExpenses(): Promise<BusinessExpense[]> {
    await this.ensureHydrated();
    const db = await getDb();
    const expenses = await db.getAll('businessExpenses');
    return expenses.reverse();
  }

  async saveBusinessExpense(expense: BusinessExpense): Promise<BusinessExpense> {
    await this.ensureHydrated();
    const db = await getDb();
    const tx = db.transaction(['businessExpenses', 'sync_queue'], 'readwrite');
    await tx.objectStore('businessExpenses').put(expense);
    await this.enqueueSync(tx, 'businessExpense', 'create', expense.id, expense);
    await tx.done;
    return expense;
  }

  async deleteBusinessExpense(id: string): Promise<boolean> {
    await this.ensureHydrated();
    const db = await getDb();
    const tx = db.transaction(['businessExpenses', 'sync_queue'], 'readwrite');
    await tx.objectStore('businessExpenses').delete(id);
    await this.enqueueSync(tx, 'businessExpense', 'delete', id);
    await tx.done;
    return true;
  }

  // --- PERSONAL EXPENSES ---
  async getPersonalExpenses(): Promise<PersonalExpense[]> {
    await this.ensureHydrated();
    const db = await getDb();
    const expenses = await db.getAll('personalExpenses');
    return expenses.reverse();
  }

  async savePersonalExpense(expense: PersonalExpense): Promise<PersonalExpense> {
    await this.ensureHydrated();
    const db = await getDb();
    const tx = db.transaction(['personalExpenses', 'sync_queue'], 'readwrite');
    await tx.objectStore('personalExpenses').put(expense);
    await this.enqueueSync(tx, 'personalExpense', 'create', expense.id, expense);
    await tx.done;
    return expense;
  }

  async deletePersonalExpense(id: string): Promise<boolean> {
    await this.ensureHydrated();
    const db = await getDb();
    const tx = db.transaction(['personalExpenses', 'sync_queue'], 'readwrite');
    await tx.objectStore('personalExpenses').delete(id);
    await this.enqueueSync(tx, 'personalExpense', 'delete', id);
    await tx.done;
    return true;
  }

  // --- DEBTS & PAYMENTS ---
  async getDebtObligations(): Promise<DebtObligation[]> {
    await this.ensureHydrated();
    const db = await getDb();
    return await db.getAll('debts');
  }

  async saveDebtObligation(debt: DebtObligation): Promise<DebtObligation> {
    await this.ensureHydrated();
    const db = await getDb();
    const tx = db.transaction(['debts', 'sync_queue'], 'readwrite');
    await tx.objectStore('debts').put(debt);
    await this.enqueueSync(tx, 'debt', 'create', debt.id, debt);
    await tx.done;
    return debt;
  }

  async deleteDebtObligation(id: string): Promise<boolean> {
    await this.ensureHydrated();
    const db = await getDb();
    const debt = await db.get('debts', id);
    const allPayments = await db.getAllFromIndex('debtPayments', 'by-debt', id);

    if (allPayments.length > 0) {
      const total = allPayments.reduce((sum, p) => sum + p.amount, 0);
      throw new Error(buildDebtBlockMessage(debt?.creditor || id, allPayments.length, total));
    }

    const tx = db.transaction(['debts', 'sync_queue'], 'readwrite');
    await tx.objectStore('debts').delete(id);
    await this.enqueueSync(tx, 'debt', 'delete', id);
    await tx.done;
    return true;
  }

  async getDebtPayments(): Promise<DebtPayment[]> {
    await this.ensureHydrated();
    const db = await getDb();
    const payments = await db.getAll('debtPayments');
    return payments.reverse();
  }

  async saveDebtPayment(payment: DebtPayment): Promise<DebtPayment> {
    await this.ensureHydrated();
    const db = await getDb();
    const tx = db.transaction(['debts', 'debtPayments', 'sync_queue'], 'readwrite');
    const debtStore = tx.objectStore('debts');
    const payStore = tx.objectStore('debtPayments');

    await payStore.put(payment);

    const debt = await debtStore.get(payment.debtId);
    if (debt) {
      const debtPaymentsIndex = payStore.index('by-debt');
      const payments = await debtPaymentsIndex.getAll(payment.debtId);
      const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);

      debt.remainingBalance = Math.max(0, debt.totalAmount - totalPaid);
      if (debt.remainingBalance === 0) {
        debt.status = 'paid_off';
      }
      await debtStore.put(debt);
    }

    await this.enqueueSync(tx, 'debtPayment', 'create', payment.id, payment);

    await tx.done;
    return payment;
  }

  // --- CLIENTS ---
  async getClients(): Promise<Client[]> {
    await this.ensureHydrated();
    const db = await getDb();
    return await db.getAll('clients');
  }

  async saveClient(client: Client): Promise<Client> {
    await this.ensureHydrated();
    const db = await getDb();
    const tx = db.transaction(['clients', 'sync_queue'], 'readwrite');
    await tx.objectStore('clients').put(client);
    await this.enqueueSync(tx, 'client', 'create', client.id, client);
    await tx.done;
    return client;
  }

  // --- BACKUP & RESTORE ---
  async exportAllData(): Promise<string> {
    await this.ensureHydrated();
    const db = await getDb();
    const [
      jobs,
      jobPayments,
      jobInterventions,
      businessExpenses,
      personalExpenses,
      debts,
      debtPayments,
      clients
    ] = await Promise.all([
      db.getAll('jobs'),
      db.getAll('jobPayments'),
      db.getAll('jobInterventions'),
      db.getAll('businessExpenses'),
      db.getAll('personalExpenses'),
      db.getAll('debts'),
      db.getAll('debtPayments'),
      db.getAll('clients')
    ]);

    const backup = {
      jobs,
      jobPayments,
      jobInterventions,
      businessExpenses,
      personalExpenses,
      debts,
      debtPayments,
      clients,
      exportDate: new Date().toISOString(),
      schemaVersion: 2
    };

    return JSON.stringify(backup, null, 2);
  }

  async importAllData(jsonString: string): Promise<boolean> {
    try {
      const data = JSON.parse(jsonString);
      if (!data || typeof data !== 'object') {
        throw new Error('Import data is not an object');
      }

      // Basic structure validation: expected fields if present must be arrays
      const entityStores = [
        'jobs',
        'jobPayments',
        'jobInterventions',
        'businessExpenses',
        'personalExpenses',
        'debts',
        'debtPayments',
        'clients'
      ] as const;

      for (const store of entityStores) {
        if (data[store] !== undefined && !Array.isArray(data[store])) {
          throw new Error(`Invalid format for ${store}: expected array`);
        }
      }

      const db = await getDb();
      const tx = db.transaction(
        ['jobs', 'jobPayments', 'jobInterventions', 'businessExpenses', 'personalExpenses', 'debts', 'debtPayments', 'clients', '_metadata'],
        'readwrite'
      );

      const restoreStore = async <T extends { id: string }>(storeName: any, items: T[] | undefined) => {
        if (!Array.isArray(items)) return;
        const store = tx.objectStore(storeName);
        await store.clear();
        for (const item of items) {
          if (item && item.id) {
            await store.put(item);
          }
        }
      };

      await Promise.all([
        restoreStore('jobs', data.jobs),
        restoreStore('jobPayments', data.jobPayments),
        restoreStore('jobInterventions', data.jobInterventions),
        restoreStore('businessExpenses', data.businessExpenses),
        restoreStore('personalExpenses', data.personalExpenses),
        restoreStore('debts', data.debts),
        restoreStore('debtPayments', data.debtPayments),
        restoreStore('clients', data.clients)
      ]);

      await tx.objectStore('_metadata').put({
        key: 'hydration_state',
        value: { hydrated: true, hydratedAt: new Date().toISOString(), source: 'import' }
      });

      await tx.done;
      return true;
    } catch (e) {
      console.error('Failed to import data into IndexedDB:', e);
      return false;
    }
  }

  async clearAllData(): Promise<boolean> {
    try {
      const db = await getDb();
      const tx = db.transaction(
        ['jobs', 'jobPayments', 'jobInterventions', 'businessExpenses', 'personalExpenses', 'debts', 'debtPayments', 'clients', '_metadata', 'sync_queue'],
        'readwrite'
      );

      await Promise.all([
        tx.objectStore('jobs').clear(),
        tx.objectStore('jobPayments').clear(),
        tx.objectStore('jobInterventions').clear(),
        tx.objectStore('businessExpenses').clear(),
        tx.objectStore('personalExpenses').clear(),
        tx.objectStore('debts').clear(),
        tx.objectStore('debtPayments').clear(),
        tx.objectStore('clients').clear(),
        tx.objectStore('_metadata').clear(),
        tx.objectStore('sync_queue').clear()
      ]);

      await tx.done;
      this.hydrationPromise = null;
      syncEngine.notifyMutation();
      return true;
    } catch (e) {
      console.error('Failed to clear IndexedDB:', e);
      return false;
    }
  }
}

export const indexedDBRepository = new IndexedDBRepository();
