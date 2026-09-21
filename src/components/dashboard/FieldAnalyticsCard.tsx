import React, { useState } from 'react';
import type { Job, JobIntervention } from '../../types';
import {
  calculateCategoryProfitability,
  calculateTimeAllocation,
  calculateDelayBreakdown,
  calculateClientProfitability,
  calculateWarrantyDrain,
  DEFAULT_HOURLY_BENCHMARK
} from '../../lib/calculations';
import {
  Clock,
  AlertTriangle,
  ShieldAlert,
  CheckCircle2,
  Activity,
  Layers,
  Users
} from 'lucide-react';

interface FieldAnalyticsCardProps {
  jobs: Job[];
  jobInterventions: JobIntervention[];
}

export const FieldAnalyticsCard: React.FC<FieldAnalyticsCardProps> = ({
  jobs,
  jobInterventions
}) => {
  const [activeTab, setActiveTab] = useState<'categories' | 'time' | 'clients' | 'warranty'>('categories');

  const categories = calculateCategoryProfitability(jobs);
  const timeAllocation = calculateTimeAllocation(jobs, jobInterventions);
  const delays = calculateDelayBreakdown(jobs);
  const clients = calculateClientProfitability(jobs, jobInterventions);
  const warranty = calculateWarrantyDrain(jobs, jobInterventions);

  const topDelay = delays[0];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-5">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-black text-base sm:text-lg text-slate-100 tracking-tight">
              Rentabilité Réelle & Analyse Chantier
            </h2>
            <p className="text-xs text-slate-400">
              Où va votre temps et quels travaux génèrent le vrai cash
            </p>
          </div>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-2xl border border-slate-800 overflow-x-auto text-xs font-bold scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveTab('categories')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition whitespace-nowrap ${
              activeTab === 'categories'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Catégories & Taux/h</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('time')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition whitespace-nowrap ${
              activeTab === 'time'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Temps & Retards</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('clients')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition whitespace-nowrap ${
              activeTab === 'clients'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Clients & Alertes</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('warranty')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition whitespace-nowrap ${
              activeTab === 'warranty'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>SAV & Garantie</span>
          </button>
        </div>
      </div>

      {/* TAB 1: Categories & True Hourly Rate */}
      {activeTab === 'categories' && (
        <div className="space-y-4 animate-fadeIn">
          <div className="flex items-center justify-between text-xs text-slate-400 bg-slate-950 px-4 py-2.5 rounded-xl border border-slate-800/80">
            <span>Standard cible de l'artisan: <strong className="text-amber-400">{DEFAULT_HOURLY_BENCHMARK} MAD/heure</strong></span>
            <span>{categories.length} catégories analysées</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {categories.map((c) => (
              <div
                key={c.category}
                className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 space-y-3 hover:border-slate-700 transition"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                      {c.jobCount} chantier{c.jobCount > 1 ? 's' : ''}
                    </span>
                    <h3 className="font-black text-sm text-slate-100">{c.category}</h3>
                  </div>

                  <div className={`px-2.5 py-1 rounded-xl text-xs font-extrabold flex items-center gap-1 border ${
                    c.isAboveBenchmark
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                  }`}>
                    <span>{c.effectiveHourlyRate} MAD/h</span>
                  </div>
                </div>

                {/* Metrics Breakdown */}
                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800/80 text-center">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-bold">Chiffre Affaires</span>
                    <span className="text-xs font-black text-slate-200">{c.totalAgreedPrice.toLocaleString('fr-MA')} MAD</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-bold">Bénéfice Net</span>
                    <span className="text-xs font-black text-emerald-400">+{c.netProfit.toLocaleString('fr-MA')} MAD</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-bold">Marge Réelle</span>
                    <span className="text-xs font-black text-amber-400">{c.profitMarginPercent}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: Time Allocation & Delays */}
      {activeTab === 'time' && (
        <div className="space-y-4 animate-fadeIn">
          {/* Top Time Wasting Bottleneck Highlight */}
          {topDelay && (
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3 text-xs">
              <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <strong className="text-amber-300 block text-sm font-black">
                  Goulot d'Étranglement #1: {topDelay.label}
                </strong>
                <p className="text-slate-300 mt-1">
                  Vous avez perdu <span className="font-bold text-amber-400">{topDelay.totalHours} heures</span> sur cet imprévu, représentant un coût d'opportunité estimé à <span className="font-bold text-amber-400">~{topDelay.estimatedCostMAD} MAD</span>.
                </p>
              </div>
            </div>
          )}

          {/* Time Allocation Distribution Bar */}
          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-slate-300">
              <span>Répartition globale des {timeAllocation.totalRecordedHours}h enregistrées:</span>
            </div>

            {/* Stacked percentage bar */}
            <div className="h-4 rounded-full overflow-hidden flex bg-slate-800">
              <div
                style={{ width: `${timeAllocation.handsOnPercent}%` }}
                className="bg-emerald-500 transition-all"
                title={`Installation active: ${timeAllocation.handsOnHours}h (${timeAllocation.handsOnPercent}%)`}
              />
              <div
                style={{ width: `${timeAllocation.travelPercent}%` }}
                className="bg-sky-500 transition-all"
                title={`Déplacements: ${timeAllocation.travelHours}h (${timeAllocation.travelPercent}%)`}
              />
              <div
                style={{ width: `${timeAllocation.delayPercent}%` }}
                className="bg-amber-500 transition-all"
                title={`Imprévus & Attente: ${timeAllocation.delayHours}h (${timeAllocation.delayPercent}%)`}
              />
              <div
                style={{ width: `${timeAllocation.reworkPercent}%` }}
                className="bg-rose-500 transition-all"
                title={`Retouches & SAV gratuit: ${timeAllocation.reworkHours}h (${timeAllocation.reworkPercent}%)`}
              />
            </div>

            {/* Legend */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span className="text-slate-300">Installation: <strong>{timeAllocation.handsOnHours}h</strong> ({timeAllocation.handsOnPercent}%)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-500" />
                <span className="text-slate-300">Trajets: <strong>{timeAllocation.travelHours}h</strong> ({timeAllocation.travelPercent}%)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <span className="text-slate-300">Imprévus: <strong>{timeAllocation.delayHours}h</strong> ({timeAllocation.delayPercent}%)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                <span className="text-slate-300">SAV gratuit: <strong>{timeAllocation.reworkHours}h</strong> ({timeAllocation.reworkPercent}%)</span>
              </div>
            </div>
          </div>

          {/* Delays Table */}
          {delays.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase text-slate-400 tracking-wider">
                Détail des motifs d'imprévus enregistrés
              </h3>
              <div className="space-y-1.5">
                {delays.map((d) => (
                  <div
                    key={d.category}
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs"
                  >
                    <div>
                      <span className="font-bold text-slate-200">{d.label}</span>
                      <span className="text-slate-500 ml-2">({d.occurrences} fois)</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-black text-amber-400">{d.totalHours} h</span>
                      <span className="text-slate-400">(~{d.estimatedCostMAD} MAD)</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: Client Profitability & Red Flags */}
      {activeTab === 'clients' && (
        <div className="space-y-3 animate-fadeIn">
          <div className="text-xs text-slate-400 bg-slate-950 px-4 py-2.5 rounded-xl border border-slate-800">
            Clients classés par marge nette générée avec détection des dossiers à risque (retouches gratuites ou impayés).
          </div>

          <div className="space-y-2">
            {clients.map((cli) => (
              <div
                key={cli.clientName}
                className={`p-4 rounded-2xl border transition ${
                  cli.isRedFlag
                    ? 'bg-rose-950/20 border-rose-500/40 hover:border-rose-500/60'
                    : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    {cli.isRedFlag ? (
                      <div className="p-1.5 rounded-lg bg-rose-500/20 text-rose-400">
                        <ShieldAlert className="w-4 h-4" />
                      </div>
                    ) : (
                      <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                    )}
                    <div>
                      <h4 className="font-bold text-sm text-slate-100">{cli.clientName}</h4>
                      <p className="text-[11px] text-slate-400">
                        {cli.jobCount} chantier{cli.jobCount > 1 ? 's' : ''} • Taux horaire réel: <strong className="text-slate-200">{cli.effectiveHourlyRate} MAD/h</strong>
                      </p>
                    </div>
                  </div>

                  {/* Financial Pills */}
                  <div className="flex items-center gap-3 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-bold">Total Facturé</span>
                      <span className="font-bold text-slate-200">{cli.totalAgreed} MAD</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-bold">Bénéfice Net</span>
                      <span className="font-black text-emerald-400">+{cli.netProfit} MAD</span>
                    </div>
                  </div>
                </div>

                {/* Red flag alert message if applicable */}
                {cli.isRedFlag && cli.redFlagReason && (
                  <div className="mt-2.5 pt-2 border-t border-rose-500/20 text-[11px] font-bold text-rose-300 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />
                    <span>Alerte Rentabilité: {cli.redFlagReason}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: Warranty & Callback Drain */}
      {activeTab === 'warranty' && (
        <div className="space-y-4 animate-fadeIn">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
              <span className="text-xs font-bold text-slate-400 uppercase">Taux de SAV</span>
              <p className="text-2xl font-black text-amber-400 mt-1">{warranty.callbackRatePercent}%</p>
              <span className="text-[10px] text-slate-500">des chantiers complétés</span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
              <span className="text-xs font-bold text-slate-400 uppercase">Heures Retouches Gratuites</span>
              <p className="text-2xl font-black text-rose-400 mt-1">{warranty.totalReworkHours} h</p>
              <span className="text-[10px] text-slate-500">passées sur des reprises</span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
              <span className="text-xs font-bold text-slate-400 uppercase">Perte Financière Estimée</span>
              <p className="text-2xl font-black text-rose-400 mt-1">{warranty.estimatedReworkCostMAD} MAD</p>
              <span className="text-[10px] text-slate-500">au taux standard de 150 MAD/h</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-xs space-y-2">
            <h4 className="font-bold text-slate-200">Recommandation Métier Field-Service:</h4>
            <p className="text-slate-400 leading-relaxed">
              Pour chaque heure passée en SAV non facturé, votre taux horaire réel sur le chantier d'origine s'effondre.
              Si une installation génère plus de 2 interventions SAV, prévoyez un devis de maintenance ou vérifiez la qualité du matériel (câblage cuivre vs alu, alimentation stabilisée).
            </p>
          </div>
        </div>
      )}

    </div>
  );
};
