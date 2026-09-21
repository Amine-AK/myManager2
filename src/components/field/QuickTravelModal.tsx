import React, { useState } from 'react';
import type { Job, TransportType } from '../../types';
import { X, Navigation, Car, Bike, Bus, Check } from 'lucide-react';

interface QuickTravelModalProps {
  isOpen: boolean;
  onClose: () => void;
  job: Job;
  onSaveTravel: (jobId: string, distanceKm: number, transportType: TransportType, travelCost?: number) => void;
}

export const QuickTravelModal: React.FC<QuickTravelModalProps> = ({
  isOpen,
  onClose,
  job,
  onSaveTravel
}) => {
  const [distanceKm, setDistanceKm] = useState<number>(job.distanceKm || 10);
  const [transportType, setTransportType] = useState<TransportType>(job.transportType || 'CAR');
  const [travelCost, setTravelCost] = useState<number>(job.travelCost || 30);

  if (!isOpen) return null;

  const DISTANCE_PRESETS = [5, 10, 15, 25, 40, 60];

  const handleSelectPreset = (km: number) => {
    setDistanceKm(km);
    // Rough estimate: ~1.5 - 2 MAD per km for fuel
    setTravelCost(Math.round(km * 2));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveTravel(job.id, distanceKm, transportType, travelCost);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-3 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700/80 rounded-t-3xl sm:rounded-2xl w-full max-w-md shadow-2xl p-5 text-slate-100 space-y-5">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
              <Navigation className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-100">Trajet & Déplacement</h3>
              <p className="text-xs text-slate-400 truncate max-w-[240px]">{job.title}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Transport Type Chips */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">Moyen de transport</label>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setTransportType('CAR')}
              className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-bold transition min-h-[56px] ${
                transportType === 'CAR'
                  ? 'bg-sky-500/20 border-sky-400 text-sky-300'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
            >
              <Car className="w-5 h-5 mb-1" />
              <span>Voiture / Van</span>
            </button>

            <button
              type="button"
              onClick={() => setTransportType('MOTORCYCLE')}
              className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-bold transition min-h-[56px] ${
                transportType === 'MOTORCYCLE'
                  ? 'bg-sky-500/20 border-sky-400 text-sky-300'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
            >
              <Bike className="w-5 h-5 mb-1" />
              <span>Moto</span>
            </button>

            <button
              type="button"
              onClick={() => setTransportType('PUBLIC_TRANSPORT')}
              className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-bold transition min-h-[56px] ${
                transportType === 'PUBLIC_TRANSPORT'
                  ? 'bg-sky-500/20 border-sky-400 text-sky-300'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
            >
              <Bus className="w-5 h-5 mb-1" />
              <span>Transport</span>
            </button>
          </div>
        </div>

        {/* Distance Preset Chips */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">Distance Aller-Retour (km)</label>
          <div className="grid grid-cols-3 gap-2">
            {DISTANCE_PRESETS.map((km) => (
              <button
                key={km}
                type="button"
                onClick={() => handleSelectPreset(km)}
                className={`py-2.5 rounded-xl border font-bold text-sm transition min-h-[48px] ${
                  distanceKm === km
                    ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                    : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                {km} km
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="number"
              min="0"
              value={distanceKm}
              onChange={(e) => setDistanceKm(Number(e.target.value))}
              className="w-1/2 px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-sm focus:outline-none"
              placeholder="Km manuel"
            />
            <input
              type="number"
              min="0"
              value={travelCost}
              onChange={(e) => setTravelCost(Number(e.target.value))}
              className="w-1/2 px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-sm focus:outline-none"
              placeholder="Frais carburant (MAD)"
            />
          </div>
        </div>

        {/* Action Button */}
        <button
          type="button"
          onClick={handleSave}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-extrabold text-base transition shadow-lg shadow-sky-500/20 active:scale-98 min-h-[52px]"
        >
          <Check className="w-5 h-5" />
          <span>Enregistrer le Trajet</span>
        </button>

      </div>
    </div>
  );
};
