// ==========================================
// STORAGE LAYER - REPOSITORY PATTERN INTERFACE
// Ready for local browser storage & future Vercel Postgres / Supabase cloud sync
// ==========================================

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
} from '../../types';

export interface IDataRepository {
  // Jobs
  getJobs(): Promise<Job[]>;
  saveJob(job: Job): Promise<Job>;
  /** Throws if the job has payments or callbacks recorded against it; the error message explains what's blocking the delete. */
  deleteJob(id: string): Promise<boolean>;
  getJobPayments(): Promise<JobPayment[]>;
  saveJobPayment(payment: JobPayment): Promise<JobPayment>;
  /** Atomically records a payment against jobId and recomputes its paidAmount from the ledger. */
  collectJobPayment(jobId: string, request: JobPaymentCollectionRequest): Promise<Job>;
  getJobInterventions(): Promise<JobIntervention[]>;
  saveJobIntervention(intervention: JobIntervention): Promise<JobIntervention>;

  // Business Expenses
  getBusinessExpenses(): Promise<BusinessExpense[]>;
  saveBusinessExpense(expense: BusinessExpense): Promise<BusinessExpense>;
  deleteBusinessExpense(id: string): Promise<boolean>;

  // Personal Expenses
  getPersonalExpenses(): Promise<PersonalExpense[]>;
  savePersonalExpense(expense: PersonalExpense): Promise<PersonalExpense>;
  deletePersonalExpense(id: string): Promise<boolean>;

  // Debts & Payments
  getDebtObligations(): Promise<DebtObligation[]>;
  saveDebtObligation(debt: DebtObligation): Promise<DebtObligation>;
  /** Throws if the debt has payments recorded against it; the error message explains what's blocking the delete. */
  deleteDebtObligation(id: string): Promise<boolean>;
  getDebtPayments(): Promise<DebtPayment[]>;
  saveDebtPayment(payment: DebtPayment): Promise<DebtPayment>;

  // Clients
  getClients(): Promise<Client[]>;
  saveClient(client: Client): Promise<Client>;

  // Backup & Import/Export
  exportAllData(): Promise<string>; // Returns JSON string
  importAllData(jsonString: string): Promise<boolean>;
  clearAllData(): Promise<boolean>;
}
