// ==========================================
// SYNC ENGINE - QUEUE-BASED REPLICATION
// Connects local IndexedDB with remote API
// ==========================================

import type { IDataRepository } from '../repository';
import { jsonFileRepository } from '../jsonFileRepository';
import { getDb, type SyncQueueItem } from '../indexeddb/db';

export interface SyncState {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  lastSyncedAt: string | null;
  lastError: string | null;
}

type SyncListener = (state: SyncState) => void;

export class SyncEngine {
  private remoteRepo: IDataRepository;
  private listeners: Set<SyncListener> = new Set();
  private debounceTimer: any = null;
  private heartbeatTimer: any = null;

  private state: SyncState = {
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    isSyncing: false,
    pendingCount: 0,
    lastSyncedAt: null,
    lastError: null
  };

  constructor(remoteRepo?: IDataRepository) {
    this.remoteRepo = remoteRepo || jsonFileRepository;
  }

  public init(): void {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.handleOnline);
      window.addEventListener('offline', this.handleOffline);

      // Periodic heartbeat check every 30 seconds
      if (!this.heartbeatTimer) {
        this.heartbeatTimer = setInterval(() => {
          if (this.state.isOnline && this.state.pendingCount > 0 && !this.state.isSyncing) {
            this.processQueue();
          }
        }, 30000);
      }
    }

    // Refresh pending count and trigger initial sync
    this.updatePendingCount().then(() => {
      if (this.state.isOnline) {
        this.processQueue();
      }
    });
  }

  public destroy(): void {
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.handleOnline);
      window.removeEventListener('offline', this.handleOffline);
    }
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    this.listeners.clear();
  }

  private handleOnline = () => {
    this.state.isOnline = true;
    this.state.lastError = null;
    this.notifyListeners();
    this.processQueue();
  };

  private handleOffline = () => {
    this.state.isOnline = false;
    this.notifyListeners();
  };

  public getState(): SyncState {
    return { ...this.state };
  }

  public subscribe(listener: SyncListener): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(): void {
    const currentState = this.getState();
    this.listeners.forEach(listener => {
      try {
        listener(currentState);
      } catch (err) {
        console.error('[SyncEngine] Error in sync listener:', err);
      }
    });
  }

  public async updatePendingCount(): Promise<number> {
    try {
      const db = await getDb();
      const count = await db.count('sync_queue');
      this.state.pendingCount = count;
      this.notifyListeners();
      return count;
    } catch {
      return this.state.pendingCount;
    }
  }

  public notifyMutation(): void {
    // Immediate count update for UI responsiveness
    this.updatePendingCount();

    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    // Debounce triggering processQueue by 300ms
    this.debounceTimer = setTimeout(() => {
      if (this.state.isOnline) {
        this.processQueue();
      }
    }, 300);
  }

  /**
   * Process all queued operations in strict chronological FIFO order.
   * If any network error occurs, processing halts to maintain mutation order.
   */
  public async processQueue(): Promise<void> {
    if (this.state.isSyncing) {
      return;
    }

    try {
      const db = await getDb();
      const allItems = await db.getAll('sync_queue');

      if (allItems.length === 0) {
        this.state.pendingCount = 0;
        this.notifyListeners();
        return;
      }

      // Sort strictly by createdAt ascending (FIFO)
      allItems.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

      this.state.isSyncing = true;
      this.state.pendingCount = allItems.length;
      this.notifyListeners();

      let failed = false;

      for (const item of allItems) {
        try {
          await this.executeOperation(item);
          // Operation succeeded: remove from sync queue
          await db.delete('sync_queue', item.id);
          this.state.pendingCount--;
          this.notifyListeners();
        } catch (opErr: any) {
          console.warn(`[SyncEngine] Operation ${item.id} (${item.entity}:${item.action}) failed:`, opErr);
          item.status = 'failed';
          item.retryCount = (item.retryCount || 0) + 1;
          item.lastError = opErr?.message || String(opErr);
          await db.put('sync_queue', item);

          this.state.lastError = item.lastError || null;
          failed = true;
          // Halt queue to prevent subsequent operations from running out of order
          break;
        }
      }

      if (!failed) {
        this.state.lastSyncedAt = new Date().toISOString();
        this.state.lastError = null;
      }
    } catch (err: any) {
      console.error('[SyncEngine] Error in processQueue:', err);
      this.state.lastError = err?.message || String(err);
    } finally {
      this.state.isSyncing = false;
      await this.updatePendingCount();
    }
  }

  private async executeOperation(item: SyncQueueItem): Promise<void> {
    const { entity, action, entityId, payload } = item;

    switch (entity) {
      case 'job':
        if (action === 'delete') {
          await this.remoteRepo.deleteJob(entityId);
        } else if (action === 'collectJobPayment') {
          await this.remoteRepo.collectJobPayment(entityId, payload);
        } else {
          await this.remoteRepo.saveJob(payload);
        }
        break;

      case 'jobPayment':
        await this.remoteRepo.saveJobPayment(payload);
        break;

      case 'jobIntervention':
        await this.remoteRepo.saveJobIntervention(payload);
        break;

      case 'businessExpense':
        if (action === 'delete') {
          await this.remoteRepo.deleteBusinessExpense(entityId);
        } else {
          await this.remoteRepo.saveBusinessExpense(payload);
        }
        break;

      case 'personalExpense':
        if (action === 'delete') {
          await this.remoteRepo.deletePersonalExpense(entityId);
        } else {
          await this.remoteRepo.savePersonalExpense(payload);
        }
        break;

      case 'debt':
        if (action === 'delete') {
          await this.remoteRepo.deleteDebtObligation(entityId);
        } else {
          await this.remoteRepo.saveDebtObligation(payload);
        }
        break;

      case 'debtPayment':
        await this.remoteRepo.saveDebtPayment(payload);
        break;

      case 'client':
        await this.remoteRepo.saveClient(payload);
        break;

      default:
        console.warn(`[SyncEngine] Unknown entity type: ${entity}`);
    }
  }
}

export const syncEngine = new SyncEngine();
