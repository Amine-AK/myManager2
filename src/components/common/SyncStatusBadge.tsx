import React, { useEffect, useState } from 'react';
import { syncEngine, type SyncState } from '../../lib/storage/sync/syncEngine';
import { RefreshCw, WifiOff, AlertTriangle } from 'lucide-react';

export const SyncStatusBadge: React.FC = () => {
  const [syncState, setSyncState] = useState<SyncState>(syncEngine.getState());

  useEffect(() => {
    const unsubscribe = syncEngine.subscribe(setSyncState);
    return () => {
      unsubscribe();
    };
  }, []);

  const handleManualSync = () => {
    if (!syncState.isSyncing) {
      syncEngine.processQueue();
    }
  };

  const formatLastSync = (isoString: string | null) => {
    if (!isoString) return 'Not yet synced';
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // State 1: In the middle of syncing
  if (syncState.isSyncing) {
    return (
      <div
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-medium cursor-wait select-none"
        title="Synchronizing local mutations with backend server..."
      >
        <RefreshCw className="w-3 h-3 animate-spin text-blue-400" />
        <span>Syncing{syncState.pendingCount > 0 ? ` (${syncState.pendingCount})` : ''}</span>
      </div>
    );
  }

  // State 2: Offline or has pending queued operations
  if (!syncState.isOnline || syncState.pendingCount > 0) {
    return (
      <button
        onClick={handleManualSync}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
          !syncState.isOnline
            ? 'bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:bg-amber-500/20'
            : 'bg-sky-500/10 border border-sky-500/30 text-sky-400 hover:bg-sky-500/20'
        }`}
        title={
          !syncState.isOnline
            ? `Offline mode. ${syncState.pendingCount} change(s) stored locally in IndexedDB queue.`
            : `${syncState.pendingCount} change(s) waiting to sync. Click to sync now.`
        }
      >
        {!syncState.isOnline ? (
          <WifiOff className="w-3 h-3 text-amber-400" />
        ) : (
          <RefreshCw className="w-3 h-3 text-sky-400" />
        )}
        <span>
          {!syncState.isOnline ? 'Offline' : 'Pending'}
          {syncState.pendingCount > 0 ? ` (${syncState.pendingCount})` : ''}
        </span>
      </button>
    );
  }

  // State 3: Last sync failed with error
  if (syncState.lastError) {
    return (
      <button
        onClick={handleManualSync}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-medium hover:bg-red-500/20 transition-all"
        title={`Sync error: ${syncState.lastError}. Click to retry.`}
      >
        <AlertTriangle className="w-3 h-3 text-red-400" />
        <span>Sync Error</span>
      </button>
    );
  }

  // State 4: Fully synced & online
  return (
    <div
      onClick={handleManualSync}
      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs font-medium cursor-pointer hover:bg-emerald-500/20 transition-all select-none"
      title={`All changes synced to backend. Last sync: ${formatLastSync(syncState.lastSyncedAt)}. Click to refresh.`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
      <span className="hidden sm:inline">Online ·</span>
      <span>Synced</span>
    </div>
  );
};
