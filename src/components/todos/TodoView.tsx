import React, { useState } from 'react';
import type { TodoItem, TodoCategory } from '../../types';
import { CATEGORY_METADATA } from '../../lib/storage/todoRepository';
import {
  CheckSquare,
  Square,
  Plus,
  Phone,
  Trash2,
  Calendar,
  AlertTriangle,
  Clock,
  CheckCircle2,
  DollarSign,
  User,
  ListTodo
} from 'lucide-react';

interface TodoViewProps {
  todos: TodoItem[];
  onSaveTodo?: (todo: TodoItem) => void;
  onToggleComplete: (id: string) => void;
  onDeleteTodo: (id: string) => void;
  onOpenQuickTodo: () => void;
}

export const TodoView: React.FC<TodoViewProps> = ({
  todos,
  onToggleComplete,
  onDeleteTodo,
  onOpenQuickTodo
}) => {
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>('ALL');
  const [showCompleted, setShowCompleted] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Counts
  const pendingTodos = todos.filter(t => !t.completed);
  const completedTodos = todos.filter(t => t.completed);
  const urgentCount = pendingTodos.filter(t => t.priority === 'urgent').length;
  const callsCount = pendingTodos.filter(t => t.category === 'CALL_CLIENT').length;

  const todayStr = new Date().toISOString().split('T')[0];

  // Filtering
  const filteredTodos = todos.filter(t => {
    if (!showCompleted && t.completed) return false;
    if (activeCategoryFilter !== 'ALL' && t.category !== activeCategoryFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = t.title.toLowerCase().includes(q);
      const matchClient = t.clientName?.toLowerCase().includes(q);
      const matchPhone = t.clientPhone?.toLowerCase().includes(q);
      const matchNotes = t.notes?.toLowerCase().includes(q);
      if (!matchTitle && !matchClient && !matchPhone && !matchNotes) return false;
    }
    return true;
  });

  // Sort: Uncompleted first (urgent -> normal -> low, then by dueDate), then completed
  const sortedTodos = [...filteredTodos].sort((a, b) => {
    if (a.completed !== b.completed) {
      return a.completed ? 1 : -1;
    }
    const priorityWeight = { urgent: 0, normal: 1, low: 2 };
    if (priorityWeight[a.priority] !== priorityWeight[b.priority]) {
      return priorityWeight[a.priority] - priorityWeight[b.priority];
    }
    if (a.dueDate && b.dueDate) {
      return a.dueDate.localeCompare(b.dueDate);
    }
    return (b.createdAt || '').localeCompare(a.createdAt || '');
  });

  return (
    <div className="space-y-6">
      {/* Top Banner / Metrics Overview */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <ListTodo className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-slate-100 flex items-center gap-2">
                Tâches & Planification Chantier
                <span className="text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full border border-slate-700">
                  {pendingTodos.length} à faire
                </span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-400">
                Rappels clients avec appel 1-tap, prévisions de chantiers, achats matériel et devis
              </p>
            </div>
          </div>

          <button
            onClick={onOpenQuickTodo}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-sm transition shadow-lg shadow-amber-500/20 active:scale-95 min-h-[48px]"
          >
            <Plus className="w-5 h-5 stroke-[2.5]" />
            <span>Nouvelle Tâche / Rappel (&lt;10s)</span>
          </button>
        </div>

        {/* Quick Stat Indicators */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-4 pt-4 border-t border-slate-800/80">
          <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between">
            <span className="text-xs text-slate-400 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-400" /> En attente
            </span>
            <span className="font-extrabold text-slate-100 text-sm">{pendingTodos.length}</span>
          </div>

          <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between">
            <span className="text-xs text-rose-400 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" /> Urgents
            </span>
            <span className="font-extrabold text-rose-400 text-sm">{urgentCount}</span>
          </div>

          <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between">
            <span className="text-xs text-sky-400 flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5" /> Appels Clients
            </span>
            <span className="font-extrabold text-sky-400 text-sm">{callsCount}</span>
          </div>

          <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between">
            <span className="text-xs text-emerald-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" /> Terminées
            </span>
            <span className="font-extrabold text-emerald-400 text-sm">{completedTodos.length}</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Category Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
          <button
            onClick={() => setActiveCategoryFilter('ALL')}
            className={`px-3 py-1.5 rounded-xl font-bold border transition whitespace-nowrap min-h-[38px] ${
              activeCategoryFilter === 'ALL'
                ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-sm'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            Toutes ({todos.length})
          </button>

          {(Object.keys(CATEGORY_METADATA) as TodoCategory[]).map(catKey => {
            const meta = CATEGORY_METADATA[catKey];
            const count = todos.filter(t => t.category === catKey && !t.completed).length;
            const isSelected = activeCategoryFilter === catKey;
            return (
              <button
                key={catKey}
                onClick={() => setActiveCategoryFilter(catKey)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold border transition whitespace-nowrap min-h-[38px] ${
                  isSelected
                    ? `${meta.badgeColor} border-current font-extrabold ring-1 ring-amber-400/40`
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>{meta.iconLabel}</span>
                <span>{meta.label}</span>
                {count > 0 && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-300 font-mono">
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Toggle Completed & Search */}
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Rechercher tâche, client, n°..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-400 min-h-[38px] w-full md:w-48"
          />

          <button
            onClick={() => setShowCompleted(!showCompleted)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition whitespace-nowrap min-h-[38px] ${
              showCompleted
                ? 'bg-slate-800 text-slate-200 border-slate-700'
                : 'bg-slate-900 text-slate-500 border-slate-800 hover:text-slate-300'
            }`}
            title="Afficher ou masquer les tâches terminées"
          >
            {showCompleted ? '✓ Masquer Terminées' : '✓ Voir Terminées'}
          </button>
        </div>
      </div>

      {/* Todos List */}
      <div className="space-y-2.5">
        {sortedTodos.length === 0 ? (
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-800/60 flex items-center justify-center text-slate-400 mx-auto">
              <CheckSquare className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-300">Aucune tâche trouvée</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {searchQuery || activeCategoryFilter !== 'ALL'
                ? 'Essayez de changer les filtres ou la recherche.'
                : 'Ajoutez votre première tâche, rappel client ou prévision de chantier ci-dessous.'}
            </p>
            <button
              onClick={onOpenQuickTodo}
              className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs transition"
            >
              <Plus className="w-4 h-4" />
              <span>Ajouter une tâche</span>
            </button>
          </div>
        ) : (
          sortedTodos.map(todo => {
            const meta = CATEGORY_METADATA[todo.category] || CATEGORY_METADATA.OTHER;
            const isOverdue = !todo.completed && todo.dueDate && todo.dueDate < todayStr;
            const isToday = !todo.completed && todo.dueDate === todayStr;

            return (
              <div
                key={todo.id}
                className={`p-3.5 sm:p-4 rounded-2xl border transition-all ${
                  todo.completed
                    ? 'bg-slate-950/40 border-slate-900/80 opacity-60'
                    : todo.priority === 'urgent'
                    ? 'bg-rose-950/10 border-rose-900/40 hover:border-rose-700/60 shadow-sm'
                    : 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  {/* Left: Checkbox + Content */}
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <button
                      type="button"
                      onClick={() => onToggleComplete(todo.id)}
                      className={`mt-0.5 p-1 rounded-lg transition shrink-0 min-w-[32px] min-h-[32px] flex items-center justify-center ${
                        todo.completed
                          ? 'text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20'
                          : 'text-slate-400 hover:text-amber-400 bg-slate-800/80 hover:bg-slate-800'
                      }`}
                      title={todo.completed ? 'Marquer non terminée' : 'Marquer comme terminée'}
                    >
                      {todo.completed ? (
                        <CheckSquare className="w-5 h-5 text-emerald-400" />
                      ) : (
                        <Square className="w-5 h-5" />
                      )}
                    </button>

                    <div className="space-y-1.5 flex-1 min-w-0">
                      {/* Title & Badges */}
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`text-sm sm:text-base font-bold ${
                            todo.completed ? 'line-through text-slate-500' : 'text-slate-100'
                          }`}
                        >
                          {todo.title}
                        </span>

                        {/* Category Badge */}
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold border ${meta.badgeColor}`}
                        >
                          <span>{meta.iconLabel}</span>
                          <span>{meta.label}</span>
                        </span>

                        {/* Priority Badge */}
                        {todo.priority === 'urgent' && (
                          <span className="px-2 py-0.5 rounded-lg text-[10px] font-black bg-rose-500/20 text-rose-300 border border-rose-500/30 animate-pulse">
                            🔴 URGENT
                          </span>
                        )}
                        {todo.priority === 'low' && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] text-slate-500">
                            Faible
                          </span>
                        )}
                      </div>

                      {/* Client / Phone / Due date / Amount Info Line */}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
                        {todo.clientName && (
                          <div className="flex items-center gap-1 text-slate-300">
                            <User className="w-3.5 h-3.5 text-slate-400" />
                            <span>{todo.clientName}</span>
                          </div>
                        )}

                        {todo.clientPhone && (
                          <a
                            href={`tel:${todo.clientPhone}`}
                            className="inline-flex items-center gap-1 px-2 py-0.5 bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/30 rounded-lg font-bold font-mono transition text-xs active:scale-95"
                            title="Appeler directement ce client"
                          >
                            <Phone className="w-3 h-3" />
                            <span>{todo.clientPhone}</span>
                          </a>
                        )}

                        {todo.dueDate && (
                          <div
                            className={`flex items-center gap-1 font-semibold ${
                              isOverdue
                                ? 'text-rose-400 font-bold'
                                : isToday
                                ? 'text-amber-400 font-bold'
                                : 'text-slate-400'
                            }`}
                          >
                            <Calendar className="w-3.5 h-3.5" />
                            <span>
                              {isOverdue
                                ? `En retard (${todo.dueDate})`
                                : isToday
                                ? `Aujourd'hui (${todo.dueDate})`
                                : `Échéance: ${todo.dueDate}`}
                            </span>
                          </div>
                        )}

                        {todo.estimatedAmount !== undefined && todo.estimatedAmount > 0 && (
                          <div className="flex items-center gap-1 text-emerald-400 font-bold">
                            <DollarSign className="w-3.5 h-3.5" />
                            <span>{todo.estimatedAmount.toLocaleString('fr-MA')} MAD</span>
                          </div>
                        )}
                      </div>

                      {/* Notes snippet */}
                      {todo.notes && (
                        <p className="text-xs text-slate-400 bg-slate-950/60 p-2 rounded-xl border border-slate-800/60 font-mono">
                          {todo.notes}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Right Actions: Direct Call & Delete */}
                  <div className="flex items-center gap-1 shrink-0">
                    {todo.clientPhone && (
                      <a
                        href={`tel:${todo.clientPhone}`}
                        className="p-2 sm:px-3 sm:py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-emerald-600/20 active:scale-95 min-h-[38px]"
                        title="Appeler le client"
                      >
                        <Phone className="w-4 h-4" />
                        <span className="hidden sm:inline">Appeler</span>
                      </a>
                    )}

                    <button
                      type="button"
                      onClick={() => onDeleteTodo(todo.id)}
                      className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition min-h-[38px] min-w-[38px] flex items-center justify-center"
                      title="Supprimer la tâche"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
