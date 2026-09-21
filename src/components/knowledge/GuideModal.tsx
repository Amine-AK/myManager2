import React, { useState, useEffect } from 'react';
import type { DiagnosticGuide, KnowledgeCategory } from '../../types/knowledgeBase';
import { KNOWLEDGE_CATEGORIES } from '../../lib/storage/knowledgeRepository';
import { X, BookOpen, Save } from 'lucide-react';

interface GuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (guide: DiagnosticGuide) => void;
  guideToEdit?: DiagnosticGuide | null;
}

export const GuideModal: React.FC<GuideModalProps> = ({
  isOpen,
  onClose,
  onSave,
  guideToEdit
}) => {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<KnowledgeCategory>('cctv');
  const [brand, setBrand] = useState('Dahua');
  const [defaultIp, setDefaultIp] = useState('');
  const [defaultPort, setDefaultPort] = useState('');
  const [defaultCredentials, setDefaultCredentials] = useState('');
  const [symptom, setSymptom] = useState('');
  const [cause, setCause] = useState('');
  const [solutionText, setSolutionText] = useState('');
  const [tagsText, setTagsText] = useState('');

  useEffect(() => {
    if (guideToEdit) {
      setTitle(guideToEdit.title);
      setCategory(guideToEdit.category);
      setBrand(guideToEdit.brand || '');
      setDefaultIp(guideToEdit.defaultIp || '');
      setDefaultPort(guideToEdit.defaultPort || '');
      setDefaultCredentials(guideToEdit.defaultCredentials || '');
      setSymptom(guideToEdit.symptom);
      setCause(guideToEdit.cause || '');
      setSolutionText(guideToEdit.solutionSteps.join('\n'));
      setTagsText((guideToEdit.tags || []).join(', '));
    } else {
      setTitle('');
      setCategory('cctv');
      setBrand('Dahua');
      setDefaultIp('');
      setDefaultPort('');
      setDefaultCredentials('');
      setSymptom('');
      setCause('');
      setSolutionText('');
      setTagsText('');
    }
  }, [guideToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !symptom.trim() || !solutionText.trim()) return;

    const steps = solutionText
      .split('\n')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    const tags = tagsText
      .split(',')
      .map(t => t.trim().toLowerCase())
      .filter(t => t.length > 0);

    const guide: DiagnosticGuide = {
      id: guideToEdit ? guideToEdit.id : `kb-${Date.now()}`,
      title: title.trim(),
      category,
      brand: brand.trim() || undefined,
      defaultIp: defaultIp.trim() || undefined,
      defaultPort: defaultPort.trim() || undefined,
      defaultCredentials: defaultCredentials.trim() || undefined,
      symptom: symptom.trim(),
      cause: cause.trim() || undefined,
      solutionSteps: steps,
      tags,
      isFavorite: guideToEdit ? guideToEdit.isFavorite : false,
      updatedAt: new Date().toISOString().split('T')[0]
    };

    onSave(guide);
    onClose();
  };

  const brandPresets = ['Dahua', 'Hikvision', 'TP-Link', 'MikroTik', 'Uniview', 'Universel'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-5 sm:p-6 text-slate-100 space-y-4 max-h-[92vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-base text-slate-100">
                {guideToEdit ? 'Modifier la Fiche Technique' : 'Nouvelle Fiche / Mémo Terrain'}
              </h3>
              <p className="text-xs text-slate-400">Diagnostic, panne, procédure ou astuce matériel</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Title */}
          <div>
            <label className="block text-slate-300 font-bold mb-1.5 uppercase tracking-wide">
              Titre de la fiche / Équipement <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="ex: Dahua : Réinitialisation mot de passe caméra IP"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 font-semibold text-sm focus:outline-none focus:border-amber-400"
            />
          </div>

          {/* Category & Brand */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-bold mb-1.5 uppercase tracking-wide">
                Catégorie
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as KnowledgeCategory)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 font-bold text-xs focus:outline-none focus:border-amber-400"
              >
                {KNOWLEDGE_CATEGORIES.map((cat) => (
                  <option key={cat.key} value={cat.key}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-300 font-bold mb-1.5 uppercase tracking-wide">
                Marque / Fabricant
              </label>
              <input
                type="text"
                placeholder="ex: Dahua, Hikvision, MikroTik..."
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 font-bold text-xs focus:outline-none focus:border-amber-400"
              />
              <div className="flex flex-wrap gap-1 mt-1.5">
                {brandPresets.map((b) => (
                  <button
                    key={b}
                    type="button"
                    onClick={() => setBrand(b)}
                    className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-800 text-slate-400 hover:text-amber-300 border border-slate-700"
                  >
                    {b}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Technical Connection Info (IP, Ports, Login) */}
          <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2.5">
            <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider block">
              Paramètres Réseau / Usine (Optionnel)
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div>
                <label className="block text-slate-400 text-[10px] font-semibold mb-1">IP par défaut</label>
                <input
                  type="text"
                  placeholder="192.168.1.108"
                  value={defaultIp}
                  onChange={(e) => setDefaultIp(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 text-xs font-mono"
                />
              </div>
              <div>
                <label className="block text-slate-400 text-[10px] font-semibold mb-1">Ports par défaut</label>
                <input
                  type="text"
                  placeholder="37777, 80, 554"
                  value={defaultPort}
                  onChange={(e) => setDefaultPort(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 text-xs font-mono"
                />
              </div>
              <div>
                <label className="block text-slate-400 text-[10px] font-semibold mb-1">Identifiants par défaut</label>
                <input
                  type="text"
                  placeholder="admin / admin123"
                  value={defaultCredentials}
                  onChange={(e) => setDefaultCredentials(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 text-xs font-mono"
                />
              </div>
            </div>
          </div>

          {/* Symptom & Cause */}
          <div>
            <label className="block text-slate-300 font-bold mb-1.5 uppercase tracking-wide">
              Symptôme / Problème constaté <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="ex: Le voyant clignote en rouge, pas d'accès web, bip continu..."
              value={symptom}
              onChange={(e) => setSymptom(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 focus:outline-none focus:border-amber-400"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-bold mb-1.5 uppercase tracking-wide">
              Cause Probable
            </label>
            <input
              type="text"
              placeholder="ex: Conflit d'adresse IP, alimentation sous-dimensionnée..."
              value={cause}
              onChange={(e) => setCause(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 focus:outline-none focus:border-amber-400"
            />
          </div>

          {/* Solution steps */}
          <div>
            <label className="block text-slate-300 font-bold mb-1.5 uppercase tracking-wide">
              Solution étape par étape <span className="text-rose-400">*</span> (1 étape par ligne)
            </label>
            <textarea
              rows={4}
              required
              placeholder="1. Vérifier la tension 12V&#10;2. Brancher le câble sur le port LAN 2&#10;3. Ouvrir l'outil de scan..."
              value={solutionText}
              onChange={(e) => setSolutionText(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 focus:outline-none focus:border-amber-400 font-mono text-xs"
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-slate-300 font-bold mb-1.5 uppercase tracking-wide">
              Mots-clés de recherche (séparés par des virgules)
            </label>
            <input
              type="text"
              placeholder="dahua, password, reset, sadp, bip..."
              value={tagsText}
              onChange={(e) => setTagsText(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 focus:outline-none focus:border-amber-400"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl transition min-h-[44px]"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="flex-1 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl transition shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 min-h-[44px]"
            >
              <Save className="w-4 h-4" />
              <span>{guideToEdit ? 'Enregistrer Modifs' : 'Créer la Fiche'}</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
