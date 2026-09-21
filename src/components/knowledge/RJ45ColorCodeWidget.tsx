import React from 'react';
import { Network, CheckCircle2 } from 'lucide-react';

export const RJ45ColorCodeWidget: React.FC = () => {
  const pins = [
    { num: 1, name: 'Blanc-Orange', colorClass: 'bg-orange-500', isStripe: true, stripeColor: '#f97316' },
    { num: 2, name: 'Orange', colorClass: 'bg-orange-500', isStripe: false },
    { num: 3, name: 'Blanc-Vert', colorClass: 'bg-emerald-500', isStripe: true, stripeColor: '#10b981' },
    { num: 4, name: 'Bleu', colorClass: 'bg-blue-600', isStripe: false },
    { num: 5, name: 'Blanc-Bleu', colorClass: 'bg-blue-500', isStripe: true, stripeColor: '#3b82f6' },
    { num: 6, name: 'Vert', colorClass: 'bg-emerald-600', isStripe: false },
    { num: 7, name: 'Blanc-Marron', colorClass: 'bg-amber-800', isStripe: true, stripeColor: '#92400e' },
    { num: 8, name: 'Marron', colorClass: 'bg-amber-800', isStripe: false },
  ];

  return (
    <div className="bg-slate-900 border-2 border-sky-500/30 rounded-3xl p-4 sm:p-5 shadow-xl space-y-3">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-sky-500/20 text-sky-400 border border-sky-500/30">
            <Network className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-black text-sm sm:text-base text-slate-100 flex items-center gap-2">
              <span>Code Couleur RJ45 (Norme T568B)</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                Standard Universel
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Ordre de sertissage de gauche à droite (connecteur vu de face, languette vers le bas)
            </p>
          </div>
        </div>
      </div>

      {/* Visual Pins Strip */}
      <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 pt-1">
        {pins.map((pin) => (
          <div
            key={pin.num}
            className="flex flex-col items-center bg-slate-950 border border-slate-800 rounded-2xl p-2.5 space-y-2 hover:border-slate-700 transition"
          >
            {/* Pin Number */}
            <span className="text-xs font-black text-slate-400 bg-slate-900 px-2 py-0.5 rounded-lg border border-slate-800">
              #{pin.num}
            </span>

            {/* Wire visual bar */}
            <div
              className={`w-6 h-14 rounded-lg shadow-md flex items-center justify-center relative overflow-hidden border border-slate-700/50`}
              style={
                pin.isStripe
                  ? {
                      background: `repeating-linear-gradient(45deg, #ffffff, #ffffff 4px, ${pin.stripeColor} 4px, ${pin.stripeColor} 8px)`
                    }
                  : undefined
              }
            >
              {!pin.isStripe && <div className={`w-full h-full ${pin.colorClass}`} />}
            </div>

            {/* Color Label */}
            <span className="text-[11px] font-extrabold text-slate-200 text-center leading-tight">
              {pin.name}
            </span>
          </div>
        ))}
      </div>

      {/* Quick Field Tip */}
      <div className="flex items-center gap-2 bg-sky-500/10 border border-sky-500/20 px-3 py-2 rounded-xl text-xs text-sky-300 font-medium">
        <CheckCircle2 className="w-4 h-4 text-sky-400 flex-shrink-0" />
        <span>
          <strong>Astuce terrain :</strong> En caméra PoE et réseau Gigabit, les 8 fils sont indispensables. Pour du 100 Mbps (Fast Ethernet), seuls les broches <strong>1, 2, 3 et 6</strong> transportent les données.
        </span>
      </div>
    </div>
  );
};
