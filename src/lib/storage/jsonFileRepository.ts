// ==========================================
// STORAGE LAYER - JSON FILE REPOSITORY
// Reads & writes directly to local disk .json files via Express backend
// ==========================================

import type { IDataRepository } from './repository';
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

const API_BASE = '/api';

export class JsonFileRepository implements IDataRepository {
  // --- JOBS ---
  async getJobs(): Promise<Job[]> {
    try {
      const res = await fetch(`${API_BASE}/jobs`);
      return await res.json();
    } catch {
      return [];
    }
  }

  async saveJob(job: Job): Promise<Job> {
    const res = await fetch(`${API_BASE}/jobs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(job)
    });
    return await res.json();
  }

  async deleteJob(id: string): Promise<boolean> {
    const res = await fetch(`${API_BASE}/jobs/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Failed to delete job ${id}`);
    }
    const data = await res.json();
    return data.success;
  }

  // --- JOB PAYMENTS ---
  async getJobPayments(): Promise<JobPayment[]> {
    try {
      const res = await fetch(`${API_BASE}/job-payments`);
      return await res.json();
    } catch {
      return [];
    }
  }

  async saveJobPayment(payment: JobPayment): Promise<JobPayment> {
    const res = await fetch(`${API_BASE}/job-payments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payment)
    });
    return await res.json();
  }

  async collectJobPayment(jobId: string, request: JobPaymentCollectionRequest): Promise<Job> {
    const res = await fetch(`${API_BASE}/jobs/${jobId}/collect-payment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Failed to record payment for job ${jobId}`);
    }
    return await res.json();
  }

  // --- JOB INTERVENTIONS (post-completion client callbacks) ---
  async getJobInterventions(): Promise<JobIntervention[]> {
    try {
      const res = await fetch(`${API_BASE}/job-interventions`);
      return await res.json();
    } catch {
      return [];
    }
  }

  async saveJobIntervention(intervention: JobIntervention): Promise<JobIntervention> {
    const res = await fetch(`${API_BASE}/job-interventions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(intervention)
    });
    return await res.json();
  }

  // --- BUSINESS EXPENSES ---
  async getBusinessExpenses(): Promise<BusinessExpense[]> {
    try {
      const res = await fetch(`${API_BASE}/business-expenses`);
      return await res.json();
    } catch {
      return [];
    }
  }

  async saveBusinessExpense(expense: BusinessExpense): Promise<BusinessExpense> {
    const res = await fetch(`${API_BASE}/business-expenses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(expense)
    });
    return await res.json();
  }

  async deleteBusinessExpense(id: string): Promise<boolean> {
    const res = await fetch(`${API_BASE}/business-expenses/${id}`, { method: 'DELETE' });
    const data = await res.json();
    return data.success;
  }

  // --- PERSONAL EXPENSES ---
  async getPersonalExpenses(): Promise<PersonalExpense[]> {
    try {
      const res = await fetch(`${API_BASE}/personal-expenses`);
      return await res.json();
    } catch {
      return [];
    }
  }

  async savePersonalExpense(expense: PersonalExpense): Promise<PersonalExpense> {
    const res = await fetch(`${API_BASE}/personal-expenses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(expense)
    });
    return await res.json();
  }

  async deletePersonalExpense(id: string): Promise<boolean> {
    const res = await fetch(`${API_BASE}/personal-expenses/${id}`, { method: 'DELETE' });
    const data = await res.json();
    return data.success;
  }

  // --- DEBTS & PAYMENTS ---
  async getDebtObligations(): Promise<DebtObligation[]> {
    try {
      const res = await fetch(`${API_BASE}/debts`);
      return await res.json();
    } catch {
      return [];
    }
  }

  async saveDebtObligation(debt: DebtObligation): Promise<DebtObligation> {
    const res = await fetch(`${API_BASE}/debts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(debt)
    });
    return await res.json();
  }

  async deleteDebtObligation(id: string): Promise<boolean> {
    const res = await fetch(`${API_BASE}/debts/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Failed to delete debt ${id}`);
    }
    const data = await res.json();
    return data.success;
  }

  async getDebtPayments(): Promise<DebtPayment[]> {
    try {
      const res = await fetch(`${API_BASE}/debt-payments`);
      return await res.json();
    } catch {
      return [];
    }
  }

  async saveDebtPayment(payment: DebtPayment): Promise<DebtPayment> {
    const res = await fetch(`${API_BASE}/debt-payments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payment)
    });
    return await res.json();
  }

  // --- CLIENTS ---
  async getClients(): Promise<Client[]> {
    try {
      const res = await fetch(`${API_BASE}/clients`);
      return await res.json();
    } catch {
      return [];
    }
  }

  async saveClient(client: Client): Promise<Client> {
    const res = await fetch(`${API_BASE}/clients`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(client)
    });
    return await res.json();
  }

  // --- BACKUP & RESTORE ---
  async exportAllData(): Promise<string> {
    const res = await fetch(`${API_BASE}/export`);
    const data = await res.json();
    return JSON.stringify(data, null, 2);
  }

  async importAllData(jsonString: string): Promise<boolean> {
    try {
      const data = JSON.parse(jsonString);
      const res = await fetch(`${API_BASE}/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const result = await res.json();
      return result.success;
    } catch {
      return false;
    }
  }

  async clearAllData(): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/clear-all`, { method: 'POST' });
      const result = await res.json();
      return result.success;
    } catch {
      return false;
    }
  }
}

export const jsonFileRepository = new JsonFileRepository();
