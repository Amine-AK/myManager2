import React, { useState } from 'react';
import { X, Wrench, Check, User, Share2 } from 'lucide-react';
import type { Job, JobPaymentCollectionRequest, Client } from '../../types';
import { CATEGORIES, DEFAULT_SOURCES } from '../../lib/jobOptions';

interface QuickJobModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveJob: (job: Job) => Promise<void>;
  onCollectJobPayment: (jobId: string, request: JobPaymentCollectionRequest) => Promise<void>;
  clients: Client[];
}

export const QuickJobModal: React.FC<QuickJobModalProps> = ({
  isOpen,
  onClose,
  onSaveJob,
  onCollectJobPayment,
  clients
}) => {
  const [title, setTitle] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [category, setCategory] = useState<string>(CATEGORIES[0]);
  const [agreedPrice, setAgreedPrice] = useState('');
  const [paidAmount, setPaidAmount] = useState('');
  const [materialCosts, setMaterialCosts] = useState('');
  const [hoursWorked, setHoursWorked] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [acquisitionSource, setAcquisitionSource] = useState<string>(DEFAULT_SOURCES[0]);
  const [customSource, setCustomSource] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const priceNum = parseFloat(agreedPrice);
    if (isNaN(priceNum) || priceNum <= 0) return;

    const paidNum = parseFloat(paidAmount) || 0;
    const materialNum = parseFloat(materialCosts) || 0;
    const hoursNum = parseFloat(hoursWorked) || 0;

    setSubmitting(true);
    try {
      // Job is always created with paidAmount 0; if there's an initial payment,
      // it's recorded right after through the same atomic ledger-derived path
      // "1-Tap Collect Payment" uses, so paidAmount is never set from anywhere else.
      const initialStatus: Job['status'] = paidNum > 0 ? 'in_progress' : 'quoted';
      const finalSource = acquisitionSource === 'Custom' ? customSource.trim() || 'Direct' : acquisitionSource;

      const newJob: Job = {
        id: `job-${Date.now()}`,
        title: title.trim() || `${category} - ${clientName || 'Client'}`,
        clientName: clientName.trim() || 'Client (Direct)',
        clientPhone: clientPhone.trim() || undefined,
        category,
        status: initialStatus,
        agreedPrice: priceNum,
        paidAmount: 0,
        materialCosts: materialNum,
        startDate,
        acquisitionSource: finalSource,
        daysSpent: 1,
        daysPaused: 0,
        logs: [
          {
            id: `log-${Date.now()}`,
            timestamp: new Date().toISOString().split('T')[0],
            status: initialStatus,
            note: `Job created via source: ${finalSource}`,
            hoursSpent: hoursNum > 0 ? hoursNum : undefined
          }
        ]
      };

      await onSaveJob(newJob);

      if (paidNum > 0) {
        const finalStatus: Job['status'] = paidNum >= priceNum ? 'paid' : 'in_progress';
        await onCollectJobPayment(newJob.id, {
          payment: {
            id: `jpay-${Date.now()}`,
            amount: paidNum,
            date: startDate
          },
          jobUpdate: {
            status: finalStatus,
            completedDate: finalStatus === 'paid' ? startDate : undefined,
            logEntry: {
              id: `log-${Date.now()}-pay`,
              timestamp: startDate,
              status: finalStatus,
              note: `Payment collected: +${paidNum} MAD (Total paid: ${Math.min(paidNum, priceNum)} MAD)`
            }
          }
        });
      }
      setTitle('');
      setClientName('');
      setClientPhone('');
      setAgreedPrice('');
      setPaidAmount('');
      setMaterialCosts('');
      setHoursWorked('');
      setCustomSource('');
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  const handleSelectClient = (c: Client) => {
    setClientName(c.name);
    if (c.phone) setClientPhone(c.phone);
    if (c.acquisitionSource) setAcquisitionSource(c.acquisitionSource);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/80 backdrop-blur-sm p-0 sm:p-4">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-t-2xl sm:rounded-2xl shadow-2xl p-5 text-slate-100 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Record Job / Payment</h2>
              <p className="text-xs text-slate-400">Target entry time: &lt; 20 seconds</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Agreed Price & Cash Received Row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-amber-400 mb-1">
                AGREED PRICE (MAD) *
              </label>
              <input
                type="number"
                step="any"
                required
                autoFocus
                placeholder="1500"
                value={agreedPrice}
                onChange={e => {
                  setAgreedPrice(e.target.value);
                  if (!paidAmount) setPaidAmount(e.target.value); // default full paid
                }}
                className="w-full px-3 py-2.5 bg-slate-950 border border-amber-500/40 rounded-xl text-xl font-bold text-amber-400 focus:outline-none focus:border-amber-400"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-emerald-400 mb-1">
                CASH RECEIVED NOW (MAD)
              </label>
              <input
                type="number"
                step="any"
                placeholder="0"
                value={paidAmount}
                onChange={e => setPaidAmount(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-950 border border-emerald-500/40 rounded-xl text-xl font-bold text-emerald-400 focus:outline-none focus:border-emerald-400"
              />
            </div>
          </div>

          {/* Client Lead Acquisition Source */}
          <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 space-y-2">
            <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5 uppercase tracking-wider">
              <Share2 className="w-3.5 h-3.5 text-emerald-400" />
              How did the client find you? (Lead Source)
            </label>
            <div className="flex flex-wrap gap-1.5">
              {DEFAULT_SOURCES.map(src => (
                <button
                  key={src}
                  type="button"
                  onClick={() => setAcquisitionSource(src)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                    acquisitionSource === src
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {src}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setAcquisitionSource('Custom')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                  acquisitionSource === 'Custom'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                + Custom Source
              </button>
            </div>

            {acquisitionSource === 'Custom' && (
              <input
                type="text"
                placeholder="e.g. Facebook, WhatsApp group, flyer..."
                value={customSource}
                onChange={e => setCustomSource(e.target.value)}
                className="w-full mt-2 px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-100 focus:outline-none"
              />
            )}
          </div>

          {/* Material Cost Row */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              MATERIAL / OUT-OF-POCKET COSTS (MAD)
            </label>
            <input
              type="number"
              step="any"
              placeholder="0 (e.g. cameras, droguerie, cable rolls)"
              value={materialCosts}
              onChange={e => setMaterialCosts(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm font-semibold text-slate-100 focus:outline-none focus:border-slate-500"
            />
          </div>

          {/* Hours Worked Row */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              HOURS WORKED (OPTIONAL)
            </label>
            <input
              type="number"
              step="any"
              placeholder="e.g. 7"
              value={hoursWorked}
              onChange={e => setHoursWorked(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm font-semibold text-slate-100 focus:outline-none focus:border-slate-500"
            />
          </div>

          {/* Job Title / Work Description */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              JOB TITLE / WORK DESCRIPTION
            </label>
            <input
              type="text"
              placeholder="e.g. 4x Dahua IP Cameras, Fiber Router Setup, Parabole"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-slate-500"
            />
          </div>

          {/* Client Name & Quick Select */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              CLIENT NAME
            </label>
            <input
              type="text"
              placeholder="e.g. Hassan El Amrani"
              value={clientName}
              onChange={e => setClientName(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-slate-500"
            />

            {/* Quick Clients Pill Bar */}
            {clients.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                <span className="text-[10px] text-slate-500 flex items-center gap-1 self-center">
                  <User className="w-3 h-3" /> Recent:
                </span>
                {clients.slice(0, 4).map(c => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => handleSelectClient(c)}
                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-medium text-slate-300 transition"
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Trade Category */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              TRADE CATEGORY
            </label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-slate-500"
            >
              {CATEGORIES.map(cat => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Date */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              START DATE
            </label>
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-slate-500"
            />
          </div>

          {/* Submit */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={submitting || !agreedPrice}
              className="w-full flex items-center justify-center gap-2 py-3.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold rounded-xl shadow-lg transition"
            >
              <Check className="w-5 h-5" />
              {submitting ? 'Saving...' : 'Save Job & Cash (< 20s)'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
