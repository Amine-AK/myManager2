import React, { useMemo, useState } from 'react';
import { X, Check, Wrench, DollarSign, Home, CreditCard, HelpCircle, AlertTriangle } from 'lucide-react';
import type { Job, Client, DebtObligation, JobPaymentCollectionRequest, BusinessExpense, PersonalExpense, DebtPayment } from '../../types';
import type { VoiceCommand } from '../../types/voice';
import { CATEGORIES } from '../../lib/jobOptions';
import { BUSINESS_EXPENSE_CATEGORIES, HOUSEHOLD_EXPENSE_CATEGORIES, INDIVIDUAL_EXPENSE_CATEGORIES } from '../../lib/expenseOptions';
import {
  classifyMatches,
  matchJobsForPayment,
  matchDebtsByCreditor,
  resolveClientNameForNewJob
} from '../../lib/voice/entityMatching';
import {
  buildJobFromVoiceData,
  buildBusinessExpenseFromVoiceData,
  buildPersonalExpenseFromVoiceData,
  buildJobPaymentRequest,
  buildDebtPaymentFromVoiceData,
  todayIso
} from '../../lib/voice/buildRecords';

interface VoiceConfirmationModalProps {
  transcript: string;
  command: VoiceCommand;
  clients: Client[];
  jobs: Job[];
  debts: DebtObligation[];
  onClose: () => void;
  onSaveJob: (job: Job) => Promise<void>;
  onCollectJobPayment: (jobId: string, request: JobPaymentCollectionRequest) => Promise<void>;
  onSaveBusinessExpense: (exp: BusinessExpense) => Promise<void>;
  onSavePersonalExpense: (exp: PersonalExpense) => Promise<void>;
  onSaveDebtPayment: (payment: DebtPayment) => Promise<void>;
}

// Tailwind's build-time scanner needs literal class strings, not interpolated
// ones (e.g. `bg-${color}-500/10` would silently be missing from the CSS
// build), so each type's icon-wrapper classes are spelled out in full here.
const ICON_WRAP_CLASSES: Record<string, string> = {
  emerald: 'bg-emerald-500/10 text-emerald-400',
  amber: 'bg-amber-500/10 text-amber-400',
  rose: 'bg-rose-500/10 text-rose-400',
  purple: 'bg-purple-500/10 text-purple-400',
  slate: 'bg-slate-500/10 text-slate-400'
};

const TYPE_META: Record<VoiceCommand['type'], { label: string; icon: React.ReactNode; color: keyof typeof ICON_WRAP_CLASSES }> = {
  create_job: { label: 'New Job', icon: <Wrench className="w-5 h-5" />, color: 'emerald' },
  business_expense: { label: 'Business Expense', icon: <DollarSign className="w-5 h-5" />, color: 'amber' },
  personal_expense: { label: 'Personal / Household Expense', icon: <Home className="w-5 h-5" />, color: 'rose' },
  job_payment: { label: 'Client Payment', icon: <DollarSign className="w-5 h-5" />, color: 'emerald' },
  debt: { label: 'Debt Payment', icon: <CreditCard className="w-5 h-5" />, color: 'purple' },
  unknown: { label: "Didn't Understand", icon: <HelpCircle className="w-5 h-5" />, color: 'slate' }
};

const inputClass =
  'w-full px-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-slate-500';
const labelClass = 'block text-xs font-medium text-slate-400 mb-1';

export const VoiceConfirmationModal: React.FC<VoiceConfirmationModalProps> = ({
  transcript,
  command,
  clients,
  jobs,
  debts,
  onClose,
  onSaveJob,
  onCollectJobPayment,
  onSaveBusinessExpense,
  onSavePersonalExpense,
  onSaveDebtPayment
}) => {
  const [submitting, setSubmitting] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // --- create_job fields ---
  const clientResolution = useMemo(
    () => (command.type === 'create_job' ? resolveClientNameForNewJob(command.data.clientNameRaw, clients, jobs) : null),
    [] // command is fixed for the lifetime of this mounted instance
  );
  const [clientName, setClientName] = useState(() =>
    command.type === 'create_job'
      ? clientResolution?.status === 'exact'
        ? clientResolution.canonicalName || ''
        : command.data.clientNameRaw || ''
      : ''
  );
  const [jobTitle, setJobTitle] = useState(() => (command.type === 'create_job' ? command.data.title || '' : ''));
  const [jobCategory, setJobCategory] = useState(() =>
    command.type === 'create_job' && command.data.category && (CATEGORIES as readonly string[]).includes(command.data.category)
      ? command.data.category
      : CATEGORIES[0]
  );
  const [agreedPrice, setAgreedPrice] = useState(() =>
    command.type === 'create_job' && command.data.agreedPrice ? String(command.data.agreedPrice) : ''
  );
  const [paidNow, setPaidNow] = useState(() =>
    command.type === 'create_job' && command.data.paidAmountNow ? String(command.data.paidAmountNow) : ''
  );
  const [materialCosts, setMaterialCosts] = useState(() =>
    command.type === 'create_job' && command.data.materialCosts ? String(command.data.materialCosts) : ''
  );
  const [jobDate, setJobDate] = useState(() => (command.type === 'create_job' && command.data.date) || todayIso());

  // --- business / personal expense fields ---
  const isPersonal = command.type === 'personal_expense';
  const [expenseAmount, setExpenseAmount] = useState(() =>
    (command.type === 'business_expense' || command.type === 'personal_expense') && command.data.amount ? String(command.data.amount) : ''
  );
  const [expenseTitle, setExpenseTitle] = useState(() =>
    command.type === 'business_expense' || command.type === 'personal_expense' ? command.data.title || '' : ''
  );
  const [personalScope, setPersonalScope] = useState<'household' | 'individual'>(() =>
    command.type === 'personal_expense' && command.data.scope === 'individual' ? 'individual' : 'household'
  );
  const scopedPersonalCategories = personalScope === 'individual' ? INDIVIDUAL_EXPENSE_CATEGORIES : HOUSEHOLD_EXPENSE_CATEGORIES;
  const [expenseCategory, setExpenseCategory] = useState(() => {
    if (command.type === 'business_expense') {
      return command.data.category && (BUSINESS_EXPENSE_CATEGORIES as readonly string[]).includes(command.data.category)
        ? command.data.category
        : BUSINESS_EXPENSE_CATEGORIES[0];
    }
    if (command.type === 'personal_expense') {
      const pool = command.data.scope === 'individual' ? INDIVIDUAL_EXPENSE_CATEGORIES : HOUSEHOLD_EXPENSE_CATEGORIES;
      return command.data.category && (pool as readonly string[]).includes(command.data.category) ? command.data.category : pool[0];
    }
    return '';
  });
  const [expenseDate, setExpenseDate] = useState(() =>
    (command.type === 'business_expense' || command.type === 'personal_expense') && command.data.date ? command.data.date : todayIso()
  );

  // --- job_payment matching ---
  const jobMatchResult = useMemo(() => {
    if (command.type !== 'job_payment') return { confident: [], possible: [] };
    const matches = matchJobsForPayment(command.data.clientNameRaw, command.data.jobDescriptionRaw, jobs);
    return classifyMatches(matches);
  }, []);
  const jobCandidates = [...jobMatchResult.confident, ...jobMatchResult.possible];
  const fallbackJobs = jobCandidates.length === 0 ? [...jobs].sort((a, b) => (a.startDate < b.startDate ? 1 : -1)).slice(0, 25) : [];
  const [selectedJobId, setSelectedJobId] = useState<string>(() =>
    jobMatchResult.confident.length === 1 ? jobMatchResult.confident[0].item.id : ''
  );
  const [paymentAmount, setPaymentAmount] = useState(() =>
    command.type === 'job_payment' && command.data.amount ? String(command.data.amount) : ''
  );
  const [paymentDate, setPaymentDate] = useState(() => (command.type === 'job_payment' && command.data.date) || todayIso());

  // --- debt payment matching ---
  const debtMatchResult = useMemo(() => {
    if (command.type !== 'debt') return { confident: [], possible: [] };
    const matches = matchDebtsByCreditor(command.data.creditorNameRaw, debts);
    return classifyMatches(matches);
  }, []);
  const debtCandidates = [...debtMatchResult.confident, ...debtMatchResult.possible];
  const activeDebts = debts.filter(d => d.status === 'active');
  const fallbackDebts = debtCandidates.length === 0 ? activeDebts : [];
  const [selectedDebtId, setSelectedDebtId] = useState<string>(() =>
    debtMatchResult.confident.length === 1 ? debtMatchResult.confident[0].item.id : ''
  );
  const [debtAmount, setDebtAmount] = useState(() => (command.type === 'debt' && command.data.amount ? String(command.data.amount) : ''));
  const [debtDate, setDebtDate] = useState(() => (command.type === 'debt' && command.data.date) || todayIso());
  const [debtNotes, setDebtNotes] = useState(() => (command.type === 'debt' && command.data.notes) || '');

  const meta = TYPE_META[command.type];

  const handleConfirm = async () => {
    setSaveError(null);
    setSubmitting(true);
    try {
      if (command.type === 'create_job') {
        const amount = parseFloat(agreedPrice);
        if (!clientName.trim()) throw new Error('Please enter a client name.');
        if (isNaN(amount) || amount <= 0) throw new Error('Agreed price must be greater than 0.');
        const { job, paymentRequest } = buildJobFromVoiceData(
          {
            clientNameRaw: clientName,
            title: jobTitle,
            category: jobCategory,
            agreedPrice: amount,
            paidAmountNow: parseFloat(paidNow) || 0,
            materialCosts: parseFloat(materialCosts) || 0,
            date: jobDate,
            notes: command.data.notes
          },
          clientName
        );
        await onSaveJob(job);
        if (paymentRequest) {
          await onCollectJobPayment(job.id, paymentRequest);
        }
      } else if (command.type === 'business_expense') {
        const amount = parseFloat(expenseAmount);
        if (isNaN(amount) || amount <= 0) throw new Error('Amount must be greater than 0.');
        await onSaveBusinessExpense(
          buildBusinessExpenseFromVoiceData({ amount, title: expenseTitle, category: expenseCategory, date: expenseDate })
        );
      } else if (command.type === 'personal_expense') {
        const amount = parseFloat(expenseAmount);
        if (isNaN(amount) || amount <= 0) throw new Error('Amount must be greater than 0.');
        await onSavePersonalExpense(
          buildPersonalExpenseFromVoiceData({ amount, title: expenseTitle, category: expenseCategory, scope: personalScope, date: expenseDate })
        );
      } else if (command.type === 'job_payment') {
        const job = jobs.find(j => j.id === selectedJobId);
        const amount = parseFloat(paymentAmount);
        if (!job) throw new Error('Please choose which job this payment is for.');
        if (isNaN(amount) || amount <= 0) throw new Error('Amount must be greater than 0.');
        await onCollectJobPayment(job.id, buildJobPaymentRequest(job, amount, paymentDate));
      } else if (command.type === 'debt') {
        const debt = debts.find(d => d.id === selectedDebtId);
        const amount = parseFloat(debtAmount);
        if (!debt) throw new Error('Please choose which debt this payment is for.');
        if (isNaN(amount) || amount <= 0) throw new Error('Amount must be greater than 0.');
        await onSaveDebtPayment(buildDebtPaymentFromVoiceData(debt, amount, debtDate, debtNotes));
      }
      onClose();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Could not save this entry. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const canConfirm = (() => {
    if (command.type === 'create_job') return clientName.trim().length > 0 && parseFloat(agreedPrice) > 0;
    if (command.type === 'business_expense' || command.type === 'personal_expense') return parseFloat(expenseAmount) > 0;
    if (command.type === 'job_payment') return !!selectedJobId && parseFloat(paymentAmount) > 0;
    if (command.type === 'debt') return !!selectedDebtId && parseFloat(debtAmount) > 0;
    return false;
  })();

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/80 backdrop-blur-sm p-0 sm:p-4">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-t-2xl sm:rounded-2xl shadow-2xl p-5 text-slate-100 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-xl ${ICON_WRAP_CLASSES[meta.color]}`}>{meta.icon}</div>
            <div>
              <h2 className="text-lg font-bold">AI understood: {meta.label}</h2>
              {transcript && <p className="text-xs text-slate-500 italic">&ldquo;{transcript}&rdquo;</p>}
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-4 space-y-4">
          {command.missingFields.length > 0 && command.type !== 'unknown' && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-300 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                {command.clarificationReason || `Missing: ${command.missingFields.join(', ')}. Please fill it in below.`}
              </span>
            </div>
          )}

          {command.type === 'unknown' && (
            <p className="text-sm text-slate-300">
              I couldn't understand that as a job, expense, payment, or debt entry. Please try again, or use the manual quick-entry buttons.
            </p>
          )}

          {command.type === 'create_job' && (
            <>
              <div>
                <label className={labelClass}>CLIENT</label>
                {clientResolution?.status === 'ambiguous' ? (
                  <select value={clientName} onChange={e => setClientName(e.target.value)} className={inputClass}>
                    {clientResolution.candidates.map(c => (
                      <option key={c.item} value={c.item}>
                        {c.item} (existing client)
                      </option>
                    ))}
                    <option value={command.data.clientNameRaw || ''}>
                      None of these — new client: &ldquo;{command.data.clientNameRaw}&rdquo;
                    </option>
                  </select>
                ) : (
                  <input type="text" value={clientName} onChange={e => setClientName(e.target.value)} className={inputClass} placeholder="Client name" />
                )}
                {clientResolution?.status === 'exact' && <p className="text-[11px] text-slate-500 mt-1">Matched to an existing client.</p>}
                {clientResolution?.status === 'new' && clientName && <p className="text-[11px] text-slate-500 mt-1">A new client will be created.</p>}
              </div>
              <div>
                <label className={labelClass}>JOB TITLE</label>
                <input type="text" value={jobTitle} onChange={e => setJobTitle(e.target.value)} className={inputClass} placeholder="Work description" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>CATEGORY</label>
                  <select value={jobCategory} onChange={e => setJobCategory(e.target.value)} className={inputClass}>
                    {CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>DATE</label>
                  <input type="date" value={jobDate} onChange={e => setJobDate(e.target.value)} className={inputClass} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-amber-400 mb-1">AGREED PRICE (MAD) *</label>
                  <input
                    type="number"
                    step="any"
                    value={agreedPrice}
                    onChange={e => setAgreedPrice(e.target.value)}
                    className={`${inputClass} border-amber-500/40 text-amber-300 font-bold`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-emerald-400 mb-1">PAID NOW (MAD)</label>
                  <input
                    type="number"
                    step="any"
                    value={paidNow}
                    onChange={e => setPaidNow(e.target.value)}
                    className={`${inputClass} border-emerald-500/40 text-emerald-300 font-bold`}
                  />
                </div>
                <div>
                  <label className={labelClass}>MATERIALS (MAD)</label>
                  <input type="number" step="any" value={materialCosts} onChange={e => setMaterialCosts(e.target.value)} className={inputClass} />
                </div>
              </div>
            </>
          )}

          {(command.type === 'business_expense' || command.type === 'personal_expense') && (
            <>
              {isPersonal && (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setPersonalScope('household');
                      if (!(HOUSEHOLD_EXPENSE_CATEGORIES as readonly string[]).includes(expenseCategory)) setExpenseCategory(HOUSEHOLD_EXPENSE_CATEGORIES[0]);
                    }}
                    className={`py-2.5 rounded-xl border text-sm font-semibold transition ${
                      personalScope === 'household' ? 'bg-rose-500/20 border-rose-500 text-rose-400' : 'bg-slate-800/50 border-slate-700 text-slate-400'
                    }`}
                  >
                    Household
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPersonalScope('individual');
                      if (!(INDIVIDUAL_EXPENSE_CATEGORIES as readonly string[]).includes(expenseCategory)) setExpenseCategory(INDIVIDUAL_EXPENSE_CATEGORIES[0]);
                    }}
                    className={`py-2.5 rounded-xl border text-sm font-semibold transition ${
                      personalScope === 'individual' ? 'bg-rose-500/20 border-rose-500 text-rose-400' : 'bg-slate-800/50 border-slate-700 text-slate-400'
                    }`}
                  >
                    Individual
                  </button>
                </div>
              )}
              <div>
                <label className={labelClass}>AMOUNT (MAD) *</label>
                <input
                  type="number"
                  step="any"
                  value={expenseAmount}
                  onChange={e => setExpenseAmount(e.target.value)}
                  className={`${inputClass} text-xl font-bold text-emerald-400`}
                />
              </div>
              <div>
                <label className={labelClass}>DESCRIPTION</label>
                <input type="text" value={expenseTitle} onChange={e => setExpenseTitle(e.target.value)} className={inputClass} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>CATEGORY</label>
                  <select value={expenseCategory} onChange={e => setExpenseCategory(e.target.value)} className={inputClass}>
                    {(isPersonal ? scopedPersonalCategories : BUSINESS_EXPENSE_CATEGORIES).map(cat => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>DATE</label>
                  <input type="date" value={expenseDate} onChange={e => setExpenseDate(e.target.value)} className={inputClass} />
                </div>
              </div>
            </>
          )}

          {command.type === 'job_payment' && (
            <>
              <p className="text-xs text-slate-500">
                Heard client: <strong className="text-slate-300">{command.data.clientNameRaw || 'unspecified'}</strong>
                {command.data.jobDescriptionRaw ? ` — ${command.data.jobDescriptionRaw}` : ''}
              </p>
              {jobs.length === 0 ? (
                <p className="text-sm text-rose-300 bg-rose-500/10 border border-rose-500/30 rounded-xl p-3">
                  You have no jobs yet. Add the job first, then record the payment.
                </p>
              ) : (
                <div>
                  <label className={labelClass}>WHICH JOB? *</label>
                  {jobCandidates.length === 0 && (
                    <p className="text-[11px] text-amber-400 mb-1">No confident match found — please choose manually.</p>
                  )}
                  <select value={selectedJobId} onChange={e => setSelectedJobId(e.target.value)} className={inputClass}>
                    <option value="">Select a job…</option>
                    {(jobCandidates.length > 0 ? jobCandidates.map(c => c.item) : fallbackJobs).map(job => (
                      <option key={job.id} value={job.id}>
                        {job.clientName} — {job.title} (Balance: {(job.agreedPrice - job.paidAmount).toLocaleString('fr-MA')} MAD)
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>AMOUNT (MAD) *</label>
                  <input
                    type="number"
                    step="any"
                    value={paymentAmount}
                    onChange={e => setPaymentAmount(e.target.value)}
                    className={`${inputClass} text-xl font-bold text-emerald-400`}
                  />
                </div>
                <div>
                  <label className={labelClass}>DATE</label>
                  <input type="date" value={paymentDate} onChange={e => setPaymentDate(e.target.value)} className={inputClass} />
                </div>
              </div>
            </>
          )}

          {command.type === 'debt' && (
            <>
              <p className="text-xs text-slate-500">
                Heard creditor: <strong className="text-slate-300">{command.data.creditorNameRaw || 'unspecified'}</strong>
              </p>
              {activeDebts.length === 0 ? (
                <p className="text-sm text-rose-300 bg-rose-500/10 border border-rose-500/30 rounded-xl p-3">
                  You have no active debt obligations to pay towards.
                </p>
              ) : (
                <div>
                  <label className={labelClass}>WHICH DEBT? *</label>
                  {debtCandidates.length === 0 && (
                    <p className="text-[11px] text-amber-400 mb-1">No confident match found — please choose manually.</p>
                  )}
                  <select value={selectedDebtId} onChange={e => setSelectedDebtId(e.target.value)} className={inputClass}>
                    <option value="">Select a debt…</option>
                    {(debtCandidates.length > 0 ? debtCandidates.map(c => c.item) : fallbackDebts).map(debt => (
                      <option key={debt.id} value={debt.id}>
                        {debt.creditor} — Balance: {debt.remainingBalance.toLocaleString('fr-MA')} MAD
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>AMOUNT (MAD) *</label>
                  <input
                    type="number"
                    step="any"
                    value={debtAmount}
                    onChange={e => setDebtAmount(e.target.value)}
                    className={`${inputClass} text-xl font-bold text-rose-400`}
                  />
                </div>
                <div>
                  <label className={labelClass}>DATE</label>
                  <input type="date" value={debtDate} onChange={e => setDebtDate(e.target.value)} className={inputClass} />
                </div>
              </div>
              <div>
                <label className={labelClass}>NOTES</label>
                <input type="text" value={debtNotes} onChange={e => setDebtNotes(e.target.value)} className={inputClass} />
              </div>
            </>
          )}

          {saveError && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{saveError}</span>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl transition"
            >
              Cancel
            </button>
            {command.type !== 'unknown' && (
              <button
                type="button"
                onClick={handleConfirm}
                disabled={!canConfirm || submitting}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold rounded-xl shadow-lg transition"
              >
                <Check className="w-4 h-4" />
                {submitting ? 'Saving…' : 'Confirm'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
