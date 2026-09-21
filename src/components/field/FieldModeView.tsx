import React, { useState } from 'react';
import type { Job, JobPaymentCollectionRequest, TransportType, DelayRecord } from '../../types';
import {
  loadFieldPresets,
  saveFieldPresets,
  resetFieldPresets,
  type FieldPresetsConfig,
  type DelayPresetItem
} from '../../lib/storage/fieldPresets';
import { CustomizePresetsModal } from './CustomizePresetsModal';
import { QuickTravelModal } from './QuickTravelModal';
import {
  Wrench,
  Phone,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  Navigation,
  Settings2,
  Pause,
  Play,
  ShoppingBag,
  ListTodo,
  Briefcase
} from 'lucide-react';

interface FieldModeViewProps {
  jobs: Job[];
  onUpdateJob: (job: Job) => Promise<void>;
  onCollectPayment: (jobId: string, request: JobPaymentCollectionRequest) => Promise<void>;
  onAddQuickExpense: (expense: { title: string; amount: number; category: string; date: string }) => Promise<void>;
  onOpenQuickTodo?: () => void;
}

export const FieldModeView: React.FC<FieldModeViewProps> = ({
  jobs,
  onUpdateJob,
  onCollectPayment,
  onAddQuickExpense,
  onOpenQuickTodo
}) => {
  // Presets state
  const [presets, setPresets] = useState<FieldPresetsConfig>(loadFieldPresets);
  const [isCustomizeOpen, setIsCustomizeOpen] = useState(false);
  const [isTravelOpen, setIsTravelOpen] = useState(false);

  // Active Job Selection: ONLY in-process / ongoing jobs appear in Mode Terrain.
  // Completed, paid, and quote_lost jobs are strictly excluded.
  const activeJobs = jobs.filter(
    j => j.status === 'in_progress' || j.status === 'waiting_parts' || j.status === 'revision_requested' || j.status === 'quoted'
  );
  const [selectedJobId, setSelectedJobId] = useState<string>(activeJobs[0]?.id || '');

  const currentJob = activeJobs.find(j => j.id === selectedJobId) || activeJobs[0] || null;

  // Selected Delay State
  const [selectedDelay, setSelectedDelay] = useState<DelayPresetItem | null>(null);
  const [selectedDuration, setSelectedDuration] = useState<number>(30);
  const [delayFeedback, setDelayFeedback] = useState<string | null>(null);

  // Selected Quick Expense State
  const [customExpenseAmount, setCustomExpenseAmount] = useState<number | ''>('');
  const [expenseFeedback, setExpenseFeedback] = useState<string | null>(null);

  // Update presets handler
  const handleSavePresets = (newConfig: FieldPresetsConfig) => {
    setPresets(newConfig);
    saveFieldPresets(newConfig);
  };

  const handleResetPresets = () => {
    const defaultCfg = resetFieldPresets();
    setPresets(defaultCfg);
  };

  // 1-Tap Log Delay
  const handleLogDelay = async () => {
    if (!currentJob || !selectedDelay) return;

    const newDelayRecord: DelayRecord = {
      id: `del-${Date.now()}`,
      category: (selectedDelay.key as any) || 'OTHER',
      durationMinutes: selectedDuration,
      notes: selectedDelay.label,
      createdAt: new Date().toISOString()
    };

    const updatedJob: Job = {
      ...currentJob,
      waitingReason: selectedDelay.label,
      delays: [...(currentJob.delays || []), newDelayRecord],
      logs: [
        {
          id: `log-${Date.now()}`,
          timestamp: new Date().toISOString().split('T')[0],
          status: currentJob.status,
          note: `[Retard Chantier] ${selectedDelay.label} (${selectedDuration} min)`
        },
        ...(currentJob.logs || [])
      ]
    };

    await onUpdateJob(updatedJob);
    setDelayFeedback(`✓ Retard enregistré: ${selectedDelay.label} (${selectedDuration} min)`);
    setTimeout(() => setDelayFeedback(null), 3500);
    setSelectedDelay(null);
  };

  // 1-Tap Quick Droguerie Expense -> Automatically increments currentJob.materialCosts AND logs Business Expense
  const handleLogQuickExpense = async (amount: number, label?: string) => {
    if (amount <= 0) return;

    let newMaterialCosts: number | null = null;

    // 1. Automatically update Job's materialCosts if a job is currently selected
    if (currentJob) {
      const previousCosts = Number(currentJob.materialCosts) || 0;
      newMaterialCosts = previousCosts + amount;

      const updatedJob: Job = {
        ...currentJob,
        materialCosts: newMaterialCosts,
        logs: [
          {
            id: `log-${Date.now()}`,
            timestamp: new Date().toISOString().split('T')[0],
            status: currentJob.status,
            note: `[Achat Express] +${amount} MAD matériel (${label || 'Droguerie/Fournitures'}) -> Total matériel: ${newMaterialCosts} MAD`
          },
          ...(currentJob.logs || [])
        ]
      };

      await onUpdateJob(updatedJob);
    }

    // 2. Also record in business cashflow expenses so financial accounting stays in sync
    const title = label
      ? `Droguerie (${label}) - ${currentJob ? currentJob.title : 'Chantier'}`
      : `Achat Droguerie/Matériel (${currentJob ? currentJob.title : 'Chantier'})`;
    await onAddQuickExpense({
      title,
      amount,
      category: 'Materials & droguerie (Fournitures)',
      date: new Date().toISOString().split('T')[0]
    });

    if (newMaterialCosts !== null) {
      setExpenseFeedback(`✓ +${amount} MAD ajouté aux frais matériel du chantier (Total: ${newMaterialCosts} MAD)`);
    } else {
      setExpenseFeedback(`✓ Dépense enregistrée: ${amount} MAD`);
    }
    setTimeout(() => setExpenseFeedback(null), 3500);
    setCustomExpenseAmount('');
  };

  // 1-Tap Collect Remaining Balance & Complete
  const handleCollectFullBalance = async () => {
    if (!currentJob) return;
    const remaining = Math.max(0, currentJob.agreedPrice - currentJob.paidAmount);
    if (remaining <= 0) return;

    const request: JobPaymentCollectionRequest = {
      payment: {
        id: `pay-${Date.now()}`,
        amount: remaining,
        date: new Date().toISOString().split('T')[0],
        notes: 'Encaissement total en fin de chantier (Mode Chantier)'
      },
      jobUpdate: {
        status: 'completed',
        completedDate: new Date().toISOString().split('T')[0],
        logEntry: {
          id: `log-${Date.now()}`,
          timestamp: new Date().toISOString().split('T')[0],
          status: 'completed',
          note: `Encaissement du solde (${remaining} MAD) et validation installation.`
        }
      }
    };

    await onCollectPayment(currentJob.id, request);
  };

  // Toggle job status
  const handleToggleStatus = async (newStatus: Job['status']) => {
    if (!currentJob) return;
    const updatedJob: Job = {
      ...currentJob,
      status: newStatus,
      completedDate: newStatus === 'completed' ? new Date().toISOString().split('T')[0] : currentJob.completedDate,
      logs: [
        {
          id: `log-${Date.now()}`,
          timestamp: new Date().toISOString().split('T')[0],
          status: newStatus,
          note: `Statut changé en: ${newStatus}`
        },
        ...(currentJob.logs || [])
      ]
    };
    await onUpdateJob(updatedJob);
  };

  const handleSaveTravel = async (_jobId: string, distanceKm: number, transportType: TransportType, travelCost?: number) => {
    if (!currentJob) return;
    const updated: Job = {
      ...currentJob,
      distanceKm,
      transportType,
      travelCost
    };
    await onUpdateJob(updated);
  };

  const remainingBalance = currentJob ? Math.max(0, currentJob.agreedPrice - currentJob.paidAmount) : 0;

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-4 py-3 sm:py-6 space-y-4 sm:space-y-6 select-none animate-fadeIn">
      
      {/* Top Banner: Mode Chantier & Config Cog */}
      <div className="flex items-center justify-between bg-slate-900 border border-slate-800 px-4 py-3 rounded-2xl shadow-md">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
            <Wrench className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-black tracking-wide text-slate-100 uppercase">
              Mode Chantier <span className="text-amber-400">Terrain</span>
            </h1>
            <p className="text-[11px] sm:text-xs text-slate-400">Ergonomie tactile rapide (≤ 3 clics)</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onOpenQuickTodo && (
            <button
              onClick={onOpenQuickTodo}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-bold border border-amber-500/40 transition"
              title="Noter un rappel client ou tâche (<10s)"
            >
              <ListTodo className="w-4 h-4 text-amber-400" />
              <span>+ Rappel / Tâche</span>
            </button>
          )}

          <button
            onClick={() => setIsCustomizeOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold border border-slate-700 transition"
            title="Modifier les listes de motifs, durées et dépenses"
          >
            <Settings2 className="w-4 h-4 text-amber-400" />
            <span className="hidden xs:inline">Personnaliser</span>
          </button>
        </div>
      </div>

      {/* Chantier Actuel Selector (Dropdown + Quick-tap pills) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 sm:p-4 shadow-md space-y-2.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-amber-400 flex-shrink-0" />
            <span className="text-xs font-black text-slate-200 uppercase tracking-wide">
              Chantier Actuel :
            </span>
          </div>

          <div className="flex-1 max-w-md">
            <select
              value={currentJob?.id || ''}
              onChange={(e) => setSelectedJobId(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 font-bold text-sm focus:outline-none focus:border-amber-400 transition cursor-pointer"
            >
              {activeJobs.length === 0 && <option value="">Aucun chantier en cours</option>}
              {activeJobs.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.clientName || 'Client'} — {j.title} ({
                    j.status === 'in_progress' ? 'En cours' :
                    j.status === 'revision_requested' ? 'En révision' :
                    j.status === 'waiting_parts' ? 'En attente pièces' : 'Devis'
                  })
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Quick 1-Tap switcher pills */}
        {activeJobs.length > 1 && (
          <div className="flex items-center gap-2 overflow-x-auto pt-1 pb-0.5 scrollbar-none">
            <span className="text-[11px] font-bold text-slate-500 uppercase flex-shrink-0">Accès rapide:</span>
            {activeJobs.map((j) => (
              <button
                key={j.id}
                type="button"
                onClick={() => setSelectedJobId(j.id)}
                className={`flex-shrink-0 px-3.5 py-1.5 rounded-xl text-xs font-bold transition border min-h-[40px] ${
                  currentJob?.id === j.id
                    ? 'bg-amber-500/20 border-amber-400 text-amber-300 shadow-md font-black'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <span className="truncate max-w-[150px] block">{j.clientName || j.title}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {currentJob ? (
        <>
          {/* Hero Card: Current Active Job */}
          <div className="bg-slate-900 border-2 border-slate-800 rounded-3xl p-4 sm:p-6 shadow-xl relative overflow-hidden space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-slate-800 text-slate-300 border border-slate-700">
                    {currentJob.category}
                  </span>
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${
                    currentJob.status === 'completed'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : currentJob.status === 'in_progress'
                      ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                      : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  }`}>
                    {currentJob.status}
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-100 tracking-tight leading-snug">
                  {currentJob.title}
                </h2>
                <p className="text-sm font-semibold text-slate-400">Client: {currentJob.clientName}</p>
              </div>

              {/* 1-Tap Dial Phone Button */}
              {currentJob.clientPhone && (
                <a
                  href={`tel:${currentJob.clientPhone}`}
                  className="flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm transition shadow-lg shadow-emerald-500/20 active:scale-95 min-h-[52px]"
                >
                  <Phone className="w-5 h-5 text-slate-950" />
                  <span>Appeler Client</span>
                </a>
              )}
            </div>

            {/* Financial Metrics Strip - 4 Columns */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 p-3.5 rounded-2xl bg-slate-950 border border-slate-800/80 text-center">
              <div>
                <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wide">Prix Convenu</span>
                <p className="text-sm sm:text-lg font-black text-slate-100">{currentJob.agreedPrice} MAD</p>
              </div>
              <div className="border-l border-slate-800/80">
                <span className="text-[10px] sm:text-xs font-bold text-amber-400 uppercase tracking-wide" title="Coûts matériels et débours chantier">Frais Matériel</span>
                <p className="text-sm sm:text-lg font-black text-amber-400">{currentJob.materialCosts || 0} MAD</p>
              </div>
              <div className="border-t sm:border-t-0 sm:border-l border-slate-800/80 pt-2 sm:pt-0">
                <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wide">Déjà Encaissé</span>
                <p className="text-sm sm:text-lg font-black text-emerald-400">{currentJob.paidAmount} MAD</p>
              </div>
              <div className="border-t sm:border-t-0 border-l border-slate-800/80 pt-2 sm:pt-0">
                <span className="text-[10px] sm:text-xs font-bold text-sky-400 uppercase tracking-wide">Reste Dû</span>
                <p className="text-sm sm:text-lg font-black text-sky-400">{remainingBalance} MAD</p>
              </div>
            </div>

            {/* Status Quick Stepper / Action Controls */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {currentJob.status !== 'in_progress' && (
                <button
                  type="button"
                  onClick={() => handleToggleStatus('in_progress')}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-sky-500/20 border border-sky-400/40 text-sky-300 font-bold text-xs hover:bg-sky-500/30 transition min-h-[48px]"
                >
                  <Play className="w-4 h-4" />
                  <span>Démarrer / En cours</span>
                </button>
              )}

              {currentJob.status === 'in_progress' && (
                <button
                  type="button"
                  onClick={() => handleToggleStatus('waiting_parts')}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-amber-500/20 border border-amber-400/40 text-amber-300 font-bold text-xs hover:bg-amber-500/30 transition min-h-[48px]"
                >
                  <Pause className="w-4 h-4" />
                  <span>Mettre en Pause</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setIsTravelOpen(true)}
                className="flex items-center justify-center gap-1.5 px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 font-bold text-xs hover:bg-slate-700 transition min-h-[48px]"
                title="Enregistrer trajet et véhicule"
              >
                <Navigation className="w-4 h-4 text-sky-400" />
                <span>Trajet ({currentJob.distanceKm ? `${currentJob.distanceKm}km` : '0km'})</span>
              </button>
            </div>
          </div>

          {/* Section 1: 1-Tap Quick Delay Tagging */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-5 shadow-lg space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
                <h3 className="font-black text-sm sm:text-base text-slate-100 uppercase tracking-wide">
                  Signaler un Imprévu / Retard
                </h3>
              </div>
              <button
                onClick={() => setIsCustomizeOpen(true)}
                className="text-slate-400 hover:text-amber-400 text-xs font-semibold"
              >
                Modifier motifs
              </button>
            </div>

            {delayFeedback && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold animate-fadeIn">
                {delayFeedback}
              </div>
            )}

            {/* Delay Category Chips (48px+ min-height) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {presets.delays.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setSelectedDelay(d)}
                  className={`p-3 rounded-2xl border text-xs font-bold transition flex items-center justify-center text-center min-h-[52px] ${
                    selectedDelay?.id === d.id
                      ? 'bg-amber-500/30 border-amber-400 text-amber-200 shadow-md shadow-amber-500/10'
                      : 'bg-slate-950 border-slate-800/90 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <span>{d.label}</span>
                </button>
              ))}
            </div>

            {/* Duration Selector & Submit */}
            {selectedDelay && (
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-amber-500/30 space-y-3 animate-fadeIn">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-amber-400">Temps perdu estimé:</span>
                  <span className="text-slate-400">{selectedDelay.label}</span>
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {presets.durations.map((dur) => (
                    <button
                      key={dur.id}
                      type="button"
                      onClick={() => setSelectedDuration(dur.minutes)}
                      className={`py-2 rounded-xl text-xs font-bold border transition min-h-[44px] ${
                        selectedDuration === dur.minutes
                          ? 'bg-amber-500 text-slate-950 border-amber-400 font-extrabold'
                          : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      {dur.label}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={handleLogDelay}
                  className="w-full py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm transition shadow-md shadow-amber-500/20 active:scale-98 min-h-[48px]"
                >
                  Valider l'Imprévu ({selectedDuration} min)
                </button>
              </div>
            )}
          </div>

          {/* Section 2: Rapid Droguerie / Cash Purchases */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-5 shadow-lg space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-emerald-400" />
                <h3 className="font-black text-sm sm:text-base text-slate-100 uppercase tracking-wide">
                  Achat Express Droguerie / Matériel
                </h3>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="text-[11px] font-bold text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20">
                  Total Matériel Chantier : <strong className="text-amber-300 font-black">{currentJob.materialCosts || 0} MAD</strong>
                </span>
                <button
                  onClick={() => setIsCustomizeOpen(true)}
                  className="text-slate-400 hover:text-emerald-400 text-xs font-semibold"
                >
                  Modifier montants
                </button>
              </div>
            </div>

            <p className="text-xs text-slate-400">
              Tout achat express est automatiquement imputé au <strong className="text-amber-400">Coût Matériel / Frais (Out-of-pocket costs)</strong> de ce chantier (<span className="text-slate-200 font-semibold">{currentJob.title}</span>) et consigné en comptabilité.
            </p>

            {expenseFeedback && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold animate-fadeIn">
                {expenseFeedback}
              </div>
            )}

            {/* Quick Expense Preset Chips */}
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {presets.expenses.map((exp) => (
                <button
                  key={exp.id}
                  type="button"
                  onClick={() => handleLogQuickExpense(exp.amount, exp.label)}
                  className="py-3 px-2 rounded-2xl bg-slate-950 hover:bg-emerald-500/20 border border-slate-800 hover:border-emerald-400/40 text-emerald-400 font-extrabold text-sm transition min-h-[50px] active:scale-95"
                >
                  +{exp.label}
                </button>
              ))}
            </div>

            {/* Custom Amount Field */}
            <div className="flex gap-2 pt-1">
              <input
                type="number"
                min="1"
                placeholder="Autre montant cash (MAD)..."
                value={customExpenseAmount}
                onChange={(e) => setCustomExpenseAmount(e.target.value ? Number(e.target.value) : '')}
                className="flex-1 px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-emerald-400"
              />
              <button
                type="button"
                disabled={typeof customExpenseAmount !== 'number' || customExpenseAmount <= 0}
                onClick={() => handleLogQuickExpense(Number(customExpenseAmount))}
                className="px-5 py-2.5 rounded-xl bg-emerald-500 text-slate-950 font-black text-xs hover:bg-emerald-400 disabled:opacity-40 transition"
              >
                Enregistrer
              </button>
            </div>
          </div>

          {/* Section 3: 1-Tap Handover & Final Cash Collection */}
          {remainingBalance > 0 && (
            <div className="bg-gradient-to-br from-slate-900 to-emerald-950/40 border-2 border-emerald-500/40 rounded-3xl p-5 shadow-xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                  <div>
                    <h3 className="font-black text-base text-slate-100 uppercase tracking-wide">
                      Fin de Chantier & Encaissement
                    </h3>
                    <p className="text-xs text-slate-400">Encaisser le solde restant et clôturer</p>
                  </div>
                </div>
                <span className="text-lg font-black text-emerald-400">{remainingBalance} MAD</span>
              </div>

              <button
                type="button"
                onClick={handleCollectFullBalance}
                className="w-full flex items-center justify-center gap-2.5 py-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-base transition shadow-xl shadow-emerald-500/25 active:scale-98 min-h-[56px]"
              >
                <DollarSign className="w-5 h-5 text-slate-950" />
                <span>Encaisser Solde ({remainingBalance} MAD) & Clôturer</span>
              </button>
            </div>
          )}
        </>
      ) : (
        /* Empty State when no active jobs exist in Mode Terrain */
        <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-3xl space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 mx-auto flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-black text-slate-200">Aucun chantier en cours d'intervention</h3>
          <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
            Seuls les chantiers en cours (<span className="text-sky-300 font-semibold">En cours</span>, <span className="text-amber-300 font-semibold">En révision</span>, <span className="text-purple-300 font-semibold">En attente</span>) apparaissent en Mode Terrain.
          </p>
          <p className="text-xs text-slate-500 max-w-md mx-auto pt-1">
            Pour réintervenir sur un chantier déjà terminé, rendez-vous dans l'onglet <strong className="text-amber-300">Chantiers</strong> et cliquez sur <strong className="text-amber-300">« Relancer pour Révision »</strong>.
          </p>
        </div>
      )}

      {/* Customize Presets Modal */}
      <CustomizePresetsModal
        isOpen={isCustomizeOpen}
        onClose={() => setIsCustomizeOpen(false)}
        config={presets}
        onSave={handleSavePresets}
        onReset={handleResetPresets}
      />

      {/* Quick Travel Modal */}
      {currentJob && (
        <QuickTravelModal
          isOpen={isTravelOpen}
          onClose={() => setIsTravelOpen(false)}
          job={currentJob}
          onSaveTravel={handleSaveTravel}
        />
      )}

    </div>
  );
};
