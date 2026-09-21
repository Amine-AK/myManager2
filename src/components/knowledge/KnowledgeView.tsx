import React, { useState } from 'react';
import type { DiagnosticGuide, KnowledgeCategory } from '../../types/knowledgeBase';
import { KNOWLEDGE_CATEGORIES } from '../../lib/storage/knowledgeRepository';
import { RJ45ColorCodeWidget } from './RJ45ColorCodeWidget';
import { GuideModal } from './GuideModal';
import {
  BookOpen,
  Plus,
  Search,
  Star,
  Network,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Pencil,
  Trash2,
  Copy,
  Check,
  AlertCircle
} from 'lucide-react';

interface KnowledgeViewProps {
  guides: DiagnosticGuide[];
  onSaveGuide: (guide: DiagnosticGuide) => void;
  onToggleFavorite: (id: string) => void;
  onDeleteGuide: (id: string) => void;
  onResetToDefaults: () => void;
}

export const KnowledgeView: React.FC<KnowledgeViewProps> = ({
  guides,
  onSaveGuide,
  onToggleFavorite,
  onDeleteGuide,
  onResetToDefaults
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<KnowledgeCategory | 'all' | 'favorites'>('all');
  const [showRj45Widget, setShowRj45Widget] = useState(true);
  const [expandedGuideIds, setExpandedGuideIds] = useState<Record<string, boolean>>({
    'kb-1': true,
    'kb-2': true,
    'kb-3': true
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [guideToEdit, setGuideToEdit] = useState<DiagnosticGuide | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedGuideIds(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleOpenAdd = () => {
    setGuideToEdit(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (guide: DiagnosticGuide) => {
    setGuideToEdit(guide);
    setIsModalOpen(true);
  };

  // Filtering logic
  const filteredGuides = guides.filter((guide) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      guide.title.toLowerCase().includes(term) ||
      guide.symptom.toLowerCase().includes(term) ||
      (guide.cause || '').toLowerCase().includes(term) ||
      (guide.brand || '').toLowerCase().includes(term) ||
      (guide.defaultIp || '').toLowerCase().includes(term) ||
      guide.tags.some(t => t.toLowerCase().includes(term));

    if (!matchesSearch) return false;

    if (selectedCategory === 'all') return true;
    if (selectedCategory === 'favorites') return !!guide.isFavorite;
    return guide.category === selectedCategory;
  });

  const favoritesCount = guides.filter(g => g.isFavorite).length;

  return (
    <div className="max-w-5xl mx-auto space-y-5 animate-fadeIn select-none">
      
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-black text-slate-100 uppercase tracking-wide">
              Diagnostics & Fiches <span className="text-amber-400">Terrain</span>
            </h2>
            <p className="text-xs text-slate-400">
              Codes couleurs RJ45, IPs par défaut, déblocage mots de passe et pannes fréquentes
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* RJ45 Widget Toggle Button */}
          <button
            onClick={() => setShowRj45Widget(!showRj45Widget)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition ${
              showRj45Widget
                ? 'bg-sky-500/20 border-sky-400/40 text-sky-300'
                : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Network className="w-4 h-4 text-sky-400" />
            <span>{showRj45Widget ? 'Masquer Code RJ45' : 'Code RJ45'}</span>
          </button>

          {/* Add Guide Button */}
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs sm:text-sm transition shadow-md shadow-amber-500/20 active:scale-98 min-h-[40px]"
          >
            <Plus className="w-4 h-4" />
            <span>Nouvelle Fiche</span>
          </button>
        </div>
      </div>

      {/* Visual RJ45 Color Code Widget */}
      {showRj45Widget && <RJ45ColorCodeWidget />}

      {/* Search Bar & Category Filters */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg space-y-3">
        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Rechercher par mot-clé (ex: Dahua, Hikvision, SADP, bip, 192.168.1.108, mot de passe)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-sm placeholder-slate-500 focus:outline-none focus:border-amber-400"
          />
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none text-xs">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 rounded-xl font-bold transition border flex-shrink-0 ${
              selectedCategory === 'all'
                ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            Toutes les fiches ({guides.length})
          </button>

          {favoritesCount > 0 && (
            <button
              onClick={() => setSelectedCategory('favorites')}
              className={`px-3 py-1.5 rounded-xl font-bold transition border flex-shrink-0 flex items-center gap-1.5 ${
                selectedCategory === 'favorites'
                  ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
              <span>Favoris ({favoritesCount})</span>
            </button>
          )}

          {KNOWLEDGE_CATEGORIES.map((cat) => {
            const count = guides.filter(g => g.category === cat.key).length;
            return (
              <button
                key={cat.key}
                onClick={() => setSelectedCategory(cat.key)}
                className={`px-3 py-1.5 rounded-xl font-bold transition border flex-shrink-0 ${
                  selectedCategory === cat.key
                    ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {cat.label} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Guides List */}
      {filteredGuides.length === 0 ? (
        <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-3xl space-y-3">
          <AlertCircle className="w-12 h-12 text-slate-600 mx-auto" />
          <h3 className="text-base font-bold text-slate-300">Aucune fiche trouvée</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {searchTerm
              ? 'Aucun résultat ne correspond à votre recherche.'
              : 'Aucune fiche dans cette catégorie.'}
          </p>
          <button
            onClick={handleOpenAdd}
            className="px-4 py-2 rounded-xl bg-amber-500/20 border border-amber-400/30 text-amber-300 font-bold text-xs hover:bg-amber-500/30 transition"
          >
            + Créer une fiche technique
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredGuides.map((guide) => {
            const isExpanded = !!expandedGuideIds[guide.id];
            const catMeta = KNOWLEDGE_CATEGORIES.find(c => c.key === guide.category);

            return (
              <div
                key={guide.id}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-md space-y-3 hover:border-slate-700 transition"
              >
                {/* Header Row: Title, Badges, Favorite & Actions */}
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-slate-950 text-slate-400 border border-slate-800">
                        {catMeta?.label || guide.category}
                      </span>
                      {guide.brand && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-300 border border-amber-500/20">
                          {guide.brand}
                        </span>
                      )}
                    </div>

                    <h3
                      onClick={() => toggleExpand(guide.id)}
                      className="text-base sm:text-lg font-black text-slate-100 hover:text-amber-300 cursor-pointer transition leading-snug"
                    >
                      {guide.title}
                    </h3>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* Favorite Star */}
                    <button
                      onClick={() => onToggleFavorite(guide.id)}
                      className={`p-1.5 rounded-lg border transition ${
                        guide.isFavorite
                          ? 'bg-amber-500/20 border-amber-500/40 text-amber-400'
                          : 'bg-slate-950 border-slate-800 text-slate-500 hover:text-slate-300'
                      }`}
                      title={guide.isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                    >
                      <Star className={`w-4 h-4 ${guide.isFavorite ? 'fill-amber-400' : ''}`} />
                    </button>

                    {/* Edit */}
                    <button
                      onClick={() => handleOpenEdit(guide)}
                      className="p-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-amber-400 transition"
                      title="Modifier"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>

                    {/* Delete */}
                    <button
                      onClick={() => {
                        if (window.confirm(`Supprimer la fiche "${guide.title}" ?`)) {
                          onDeleteGuide(guide.id);
                        }
                      }}
                      className="p-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-rose-400 transition"
                      title="Supprimer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    {/* Expand/Collapse Toggle */}
                    <button
                      onClick={() => toggleExpand(guide.id)}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                      title={isExpanded ? 'Réduire' : 'Déplier'}
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Technical Parameters Strip (IP / Port / Credentials) */}
                {(guide.defaultIp || guide.defaultPort || guide.defaultCredentials) && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-3 rounded-xl bg-slate-950 border border-slate-800/80 text-xs">
                    {guide.defaultIp && (
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-slate-500 text-[11px]">IP par défaut :</span>
                        <button
                          onClick={() => handleCopy(guide.defaultIp!, `ip-${guide.id}`)}
                          className="flex items-center gap-1 font-mono font-bold text-amber-400 hover:text-amber-300"
                          title="Copier l'IP"
                        >
                          <span>{guide.defaultIp}</span>
                          {copiedId === `ip-${guide.id}` ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 opacity-60" />}
                        </button>
                      </div>
                    )}

                    {guide.defaultPort && (
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-slate-500 text-[11px]">Ports :</span>
                        <span className="font-mono font-semibold text-slate-300">{guide.defaultPort}</span>
                      </div>
                    )}

                    {guide.defaultCredentials && (
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-slate-500 text-[11px]">Accès usine :</span>
                        <span className="font-mono font-semibold text-slate-300">{guide.defaultCredentials}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Symptom & Cause */}
                <div className="space-y-1 text-xs">
                  <p className="text-slate-300">
                    <strong className="text-rose-400 uppercase tracking-wide text-[10px]">Symptôme :</strong> {guide.symptom}
                  </p>
                  {guide.cause && (
                    <p className="text-slate-400">
                      <strong className="text-amber-400 uppercase tracking-wide text-[10px]">Cause probable :</strong> {guide.cause}
                    </p>
                  )}
                </div>

                {/* Expanded Solution Steps */}
                {isExpanded && (
                  <div className="pt-2 border-t border-slate-800/80 space-y-2 animate-fadeIn">
                    <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider block">
                      Procédure de Résolution :
                    </span>
                    <ol className="space-y-1.5 pl-2">
                      {guide.solutionSteps.map((step, idx) => (
                        <li key={idx} className="text-xs text-slate-200 flex items-start gap-2">
                          <span className="w-5 h-5 rounded-full bg-slate-800 text-emerald-400 text-[11px] font-black flex-shrink-0 flex items-center justify-center mt-0.5 border border-slate-700">
                            {idx + 1}
                          </span>
                          <span className="leading-relaxed">{step}</span>
                        </li>
                      ))}
                    </ol>

                    {/* Tags */}
                    {guide.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-2">
                        {guide.tags.map((tag, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-950 text-slate-400 border border-slate-800"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Footer: Reset to defaults */}
      <div className="pt-4 flex items-center justify-between text-xs text-slate-500 border-t border-slate-800/80">
        <p>Base de connaissances 100% hors-ligne (Local-First)</p>
        <button
          onClick={() => {
            if (window.confirm('Voulez-vous réinitialiser les fiches techniques avec le guide de démarrage par défaut ?')) {
              onResetToDefaults();
            }
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 transition"
        >
          <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
          <span>Réinitialiser Fiches Techniques</span>
        </button>
      </div>

      {/* Guide Add/Edit Modal */}
      <GuideModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={onSaveGuide}
        guideToEdit={guideToEdit}
      />

    </div>
  );
};
