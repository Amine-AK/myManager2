import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type {
  Job,
  BusinessExpense,
  PersonalExpense,
  DebtObligation,
  DebtPayment,
  JobPayment,
  JobIntervention,
  Client
} from '../../../types';

export interface SyncQueueItem {
  id: string;
  entity: 'job' | 'jobPayment' | 'jobIntervention' | 'businessExpense' | 'personalExpense' | 'debt' | 'debtPayment' | 'client';
  action: 'create' | 'update' | 'delete' | 'collectJobPayment';
  entityId: string;
  payload?: any;
  createdAt: string;
  status: 'pending' | 'syncing' | 'failed';
  retryCount: number;
  lastError?: string;
}

export interface AppMetadata {
  key: string;
  value: any;
}

export interface MyManagerDB extends DBSchema {
  jobs: {
    key: string;
    value: Job;
    indexes: {
      'by-client': string;
      'by-status': string;
      'by-startDate': string;
    };
  };
  jobPayments: {
    key: string;
    value: JobPayment;
    indexes: {
      'by-job': string;
      'by-date': string;
    };
  };
  jobInterventions: {
    key: string;
    value: JobIntervention;
    indexes: {
      'by-job': string;
      'by-date': string;
    };
  };
  businessExpenses: {
    key: string;
    value: BusinessExpense;
    indexes: {
      'by-date': string;
      'by-category': string;
    };
  };
  personalExpenses: {
    key: string;
    value: PersonalExpense;
    indexes: {
      'by-date': string;
      'by-category': string;
    };
  };
  debts: {
    key: string;
    value: DebtObligation;
    indexes: {
      'by-status': string;
      'by-type': string;
    };
  };
  debtPayments: {
    key: string;
    value: DebtPayment;
    indexes: {
      'by-debt': string;
      'by-date': string;
    };
  };
  clients: {
    key: string;
    value: Client;
    indexes: {
      'by-name': string;
    };
  };
  _metadata: {
    key: string;
    value: AppMetadata;
  };
  sync_queue: {
    key: string;
    value: SyncQueueItem;
    indexes: {
      'by-status': string;
      'by-createdAt': string;
    };
  };
}

export const DB_NAME = 'myManager_db';
export const DB_VERSION = 2;

let dbPromise: Promise<IDBPDatabase<MyManagerDB>> | null = null;

export function getDb(): Promise<IDBPDatabase<MyManagerDB>> {
  if (!dbPromise) {
    dbPromise = openDB<MyManagerDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // --- JOBS STORE ---
        // Primary key: id
        // Indexes:
        // - 'by-client': Enables instant lookups of all jobs under a specific client for client profile history.
        // - 'by-status': Used in dashboard and jobs list to filter active vs completed vs paused jobs.
        // - 'by-startDate': Required for chronologically ordered timeline views and financial period reporting.
        if (!db.objectStoreNames.contains('jobs')) {
          const jobStore = db.createObjectStore('jobs', { keyPath: 'id' });
          jobStore.createIndex('by-client', 'clientName');
          jobStore.createIndex('by-status', 'status');
          jobStore.createIndex('by-startDate', 'startDate');
        }

        // --- JOB PAYMENTS STORE ---
        // Primary key: id
        // Indexes:
        // - 'by-job': Foreign key index to compute total paid amounts per job and block deleting jobs with payments.
        // - 'by-date': Required for cashflow timelines, monthly revenue ledgers, and reconciliation.
        if (!db.objectStoreNames.contains('jobPayments')) {
          const payStore = db.createObjectStore('jobPayments', { keyPath: 'id' });
          payStore.createIndex('by-job', 'jobId');
          payStore.createIndex('by-date', 'date');
        }

        // --- JOB INTERVENTIONS STORE ---
        // Primary key: id
        // Indexes:
        // - 'by-job': Foreign key index to display warranty callbacks for a job and enforce deletion blockers.
        // - 'by-date': Enables tracking unresolved interventions over time.
        if (!db.objectStoreNames.contains('jobInterventions')) {
          const intervStore = db.createObjectStore('jobInterventions', { keyPath: 'id' });
          intervStore.createIndex('by-job', 'jobId');
          intervStore.createIndex('by-date', 'date');
        }

        // --- BUSINESS EXPENSES STORE ---
        // Primary key: id
        // Indexes:
        // - 'by-date': Computes monthly business burn rate, net margins, and time-range filters.
        // - 'by-category': Enables categorizing overhead vs tools vs materials.
        if (!db.objectStoreNames.contains('businessExpenses')) {
          const bExpStore = db.createObjectStore('businessExpenses', { keyPath: 'id' });
          bExpStore.createIndex('by-date', 'date');
          bExpStore.createIndex('by-category', 'category');
        }

        // --- PERSONAL EXPENSES STORE ---
        // Primary key: id
        // Indexes:
        // - 'by-date': Powers personal monthly budget calculations and emergency runway tracking.
        // - 'by-category': Powers household vs individual spend breakdown.
        if (!db.objectStoreNames.contains('personalExpenses')) {
          const pExpStore = db.createObjectStore('personalExpenses', { keyPath: 'id' });
          pExpStore.createIndex('by-date', 'date');
          pExpStore.createIndex('by-category', 'category');
        }

        // --- DEBTS STORE ---
        // Primary key: id
        // Indexes:
        // - 'by-status': Filters active debts vs paid-off liabilities.
        // - 'by-type': Groups supplier credit lines vs personal loans for debt snowball / avalanche planning.
        if (!db.objectStoreNames.contains('debts')) {
          const debtStore = db.createObjectStore('debts', { keyPath: 'id' });
          debtStore.createIndex('by-status', 'status');
          debtStore.createIndex('by-type', 'type');
        }

        // --- DEBT PAYMENTS STORE ---
        // Primary key: id
        // Indexes:
        // - 'by-debt': Foreign key index to compute remaining balance per debt and block deleting debts with payments.
        // - 'by-date': Tracks debt reduction history over time.
        if (!db.objectStoreNames.contains('debtPayments')) {
          const dPayStore = db.createObjectStore('debtPayments', { keyPath: 'id' });
          dPayStore.createIndex('by-debt', 'debtId');
          dPayStore.createIndex('by-date', 'date');
        }

        // --- CLIENTS STORE ---
        // Primary key: id
        // Indexes:
        // - 'by-name': Used for client deduplication and auto-ingestion during job creation.
        if (!db.objectStoreNames.contains('clients')) {
          const clientStore = db.createObjectStore('clients', { keyPath: 'id' });
          clientStore.createIndex('by-name', 'name');
        }

        // --- METADATA STORE ---
        // Stores local-first state, such as initial hydration flag, schema version, and device sync IDs.
        if (!db.objectStoreNames.contains('_metadata')) {
          db.createObjectStore('_metadata', { keyPath: 'key' });
        }

        // --- SYNC QUEUE STORE (PREPARED FOR PHASE 3) ---
        // Primary key: id
        // Indexes:
        // - 'by-status': Fast retrieval of mutations awaiting push to backend ('pending').
        // - 'by-createdAt': Guarantees FIFO execution order for background synchronization.
        if (!db.objectStoreNames.contains('sync_queue')) {
          const syncStore = db.createObjectStore('sync_queue', { keyPath: 'id' });
          syncStore.createIndex('by-status', 'status');
          syncStore.createIndex('by-createdAt', 'createdAt');
        }
      }
    });
  }
  return dbPromise;
}

export function resetDbPromise(): void {
  dbPromise = null;
}
