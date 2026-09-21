import { useState, useEffect, useCallback } from 'react';
import type {
  Job,
  JobPayment,
  JobPaymentCollectionRequest,
  JobIntervention,
  BusinessExpense,
  PersonalExpense,
  DebtObligation,
  DebtPayment,
  Client,
  FinancialMetrics,
  FactualInsight,
  DataHealthReport
} from './types';
import { computeFinancialMetrics, generateFactualInsights, computeDataHealthReport } from './lib/calculations';
import { indexedDBRepository as repository } from './lib/storage/indexeddb/IndexedDBRepository';
import { syncEngine } from './lib/storage/sync/syncEngine';
import { registerServiceWorker } from './lib/pwa/registerServiceWorker';
import { HeaderNav } from './components/header/HeaderNav';
import { DashboardView } from './components/dashboard/DashboardView';
import { JobsView } from './components/jobs/JobsView';
import { ExpensesView } from './components/expenses/ExpensesView';
import { DebtView } from './components/debt/DebtView';
import { PrintStatementView } from './components/export/PrintStatementView';
import { QuickExpenseModal } from './components/quickEntry/QuickExpenseModal';
import { QuickJobModal } from './components/quickEntry/QuickJobModal';
import { QuickDebtPaymentModal } from './components/quickEntry/QuickDebtPaymentModal';
import { LoginModal } from './components/auth/LoginModal';
import { FieldModeView } from './components/field/FieldModeView';
import { TodoView } from './components/todos/TodoView';
import { QuickTodoModal } from './components/todos/QuickTodoModal';
import {
  getStoredTodos,
  saveTodoItem,
  toggleTodoCompleted,
  deleteTodoItem
} from './lib/storage/todoRepository';
import type { TodoItem } from './types';
import { InventoryView } from './components/inventory/InventoryView';
import {
  loadInventory,
  saveInventoryItem,
  adjustInventoryQuantity,
  deleteInventoryItem,
  resetInventoryToDefault
} from './lib/storage/inventoryRepository';
import type { InventoryItem } from './types/inventory';
import { KnowledgeView } from './components/knowledge/KnowledgeView';
import {
  loadKnowledgeBase,
  saveGuide,
  toggleGuideFavorite,
  deleteGuide,
  resetKnowledgeBaseToDefault
} from './lib/storage/knowledgeRepository';
import type { DiagnosticGuide } from './types/knowledgeBase';

export function App() {
  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(
    () => localStorage.getItem('handyman_authenticated') === 'true'
  );

  // Navigation State
  const [activeTab, setActiveTab] = useState<'dashboard' | 'jobs' | 'expenses' | 'debts' | 'print' | 'field' | 'todos' | 'inventory' | 'knowledge'>('dashboard');

  // Modal Visibility States
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isJobModalOpen, setIsJobModalOpen] = useState(false);
  const [isDebtModalOpen, setIsDebtModalOpen] = useState(false);
  const [isTodoModalOpen, setIsTodoModalOpen] = useState(false);

  // Todo Items State (Local-first persistence)
  const [todos, setTodos] = useState<TodoItem[]>(getStoredTodos);

  // Inventory & Consumables State (Local-first persistence)
  const [inventory, setInventory] = useState<InventoryItem[]>(loadInventory);

  // Technical Knowledge Base State (Local-first persistence)
  const [guides, setGuides] = useState<DiagnosticGuide[]>(loadKnowledgeBase);

  // Entities Data State
  const [jobs, setJobs] = useState<Job[]>([]);
  const [jobPayments, setJobPayments] = useState<JobPayment[]>([]);
  const [jobInterventions, setJobInterventions] = useState<JobIntervention[]>([]);
  const [businessExpenses, setBusinessExpenses] = useState<BusinessExpense[]>([]);
  const [personalExpenses, setPersonalExpenses] = useState<PersonalExpense[]>([]);
  const [debts, setDebts] = useState<DebtObligation[]>([]);
  const [debtPayments, setDebtPayments] = useState<DebtPayment[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  // Load dataset from repository
  const loadData = useCallback(async () => {
    try {
      const [j, jp, ji, be, pe, d, dp, c] = await Promise.all([
        repository.getJobs(),
        repository.getJobPayments(),
        repository.getJobInterventions(),
        repository.getBusinessExpenses(),
        repository.getPersonalExpenses(),
        repository.getDebtObligations(),
        repository.getDebtPayments(),
        repository.getClients()
      ]);
      setJobs(j);
      setJobPayments(jp);
      setJobInterventions(ji);
      setBusinessExpenses(be);
      setPersonalExpenses(pe);
      setDebts(d);
      setDebtPayments(dp);
      setClients(c);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    registerServiceWorker();
    syncEngine.init();
    loadData();
    return () => {
      syncEngine.destroy();
    };
  }, [loadData]);

  // SINGLE SOURCE OF TRUTH: Compute all financial metrics using /lib/calculations
  const metrics: FinancialMetrics = computeFinancialMetrics(
    jobs,
    businessExpenses,
    personalExpenses,
    debts,
    debtPayments,
    jobInterventions
  );

  // Generate objective factual insights
  const insights: FactualInsight[] = generateFactualInsights(metrics, jobs, debts);

  // Read-only reconciliation: stored values vs. their source ledgers
  const dataHealthReport: DataHealthReport = computeDataHealthReport(
    jobs,
    jobPayments,
    jobInterventions,
    debts,
    debtPayments,
    businessExpenses,
    personalExpenses,
    clients
  );

  // --- Handlers for saving records ---
  const handleSaveJob = async (job: Job) => {
    await repository.saveJob(job);
    await loadData();
  };

  const handleDeleteJob = async (id: string) => {
    await repository.deleteJob(id);
    await loadData();
  };

  const handleCollectJobPayment = async (jobId: string, request: JobPaymentCollectionRequest) => {
    await repository.collectJobPayment(jobId, request);
    await loadData();
  };

  const handleSaveJobIntervention = async (intervention: JobIntervention) => {
    await repository.saveJobIntervention(intervention);
    await loadData();
  };

  const handleSaveBusinessExpense = async (exp: BusinessExpense) => {
    await repository.saveBusinessExpense(exp);
    await loadData();
  };

  const handleDeleteBusinessExpense = async (id: string) => {
    await repository.deleteBusinessExpense(id);
    await loadData();
  };

  const handleSavePersonalExpense = async (exp: PersonalExpense) => {
    await repository.savePersonalExpense(exp);
    await loadData();
  };

  const handleDeletePersonalExpense = async (id: string) => {
    await repository.deletePersonalExpense(id);
    await loadData();
  };

  const handleSaveDebtObligation = async (debt: DebtObligation) => {
    await repository.saveDebtObligation(debt);
    await loadData();
  };

  const handleDeleteDebtObligation = async (id: string) => {
    await repository.deleteDebtObligation(id);
    await loadData();
  };

  const handleSaveDebtPayment = async (payment: DebtPayment) => {
    await repository.saveDebtPayment(payment);
    await loadData();
  };

  const handleExportData = async () => {
    const jsonStr = await repository.exportAllData();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `artisan_cash_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportData = async (jsonStr: string) => {
    const ok = await repository.importAllData(jsonStr);
    if (ok) await loadData();
    return ok;
  };

  const handleClearAllData = async () => {
    await repository.clearAllData();
    await loadData();
  };

  const handleLogout = () => {
    localStorage.removeItem('handyman_authenticated');
    setIsAuthenticated(false);
  };

  if (!isAuthenticated) {
    return <LoginModal onLoginSuccess={() => setIsAuthenticated(true)} />;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-semibold">Loading Financial Decision Engine...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Persistent Header with Available Cash Indicator */}
      <HeaderNav
        metrics={metrics}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenQuickExpense={() => setIsExpenseModalOpen(true)}
        onOpenQuickJob={() => setIsJobModalOpen(true)}
        onOpenQuickDebtPayment={() => setIsDebtModalOpen(true)}
        onOpenQuickTodo={() => setIsTodoModalOpen(true)}
        onLogout={handleLogout}
      />

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6 pb-24 sm:pb-8">
        {activeTab === 'todos' && (
          <TodoView
            todos={todos}
            onSaveTodo={(t) => setTodos(saveTodoItem(t))}
            onToggleComplete={(id) => setTodos(toggleTodoCompleted(id))}
            onDeleteTodo={(id) => setTodos(deleteTodoItem(id))}
            onOpenQuickTodo={() => setIsTodoModalOpen(true)}
          />
        )}

        {activeTab === 'inventory' && (
          <InventoryView
            inventory={inventory}
            onSaveItem={(item) => setInventory(saveInventoryItem(item))}
            onAdjustQuantity={(id, delta) => setInventory(adjustInventoryQuantity(id, delta))}
            onDeleteItem={(id) => setInventory(deleteInventoryItem(id))}
            onResetToDefaults={() => setInventory(resetInventoryToDefault())}
          />
        )}

        {activeTab === 'knowledge' && (
          <KnowledgeView
            guides={guides}
            onSaveGuide={(g) => setGuides(saveGuide(g))}
            onToggleFavorite={(id) => setGuides(toggleGuideFavorite(id))}
            onDeleteGuide={(id) => setGuides(deleteGuide(id))}
            onResetToDefaults={() => setGuides(resetKnowledgeBaseToDefault())}
          />
        )}

        {activeTab === 'field' && (
          <FieldModeView
            jobs={jobs}
            onUpdateJob={handleSaveJob}
            onCollectPayment={handleCollectJobPayment}
            onAddQuickExpense={async (exp) => {
              await handleSaveBusinessExpense({
                id: `bexp-${Date.now()}`,
                ...exp
              });
            }}
            onOpenQuickTodo={() => setIsTodoModalOpen(true)}
          />
        )}

        {activeTab === 'dashboard' && (
          <DashboardView
            metrics={metrics}
            insights={insights}
            jobs={jobs}
            jobPayments={jobPayments}
            jobInterventions={jobInterventions}
            debts={debts}
            businessExpenses={businessExpenses}
            personalExpenses={personalExpenses}
            onOpenQuickJob={() => setIsJobModalOpen(true)}
            onOpenQuickExpense={() => setIsExpenseModalOpen(true)}
            onOpenQuickDebtPayment={() => setIsDebtModalOpen(true)}
          />
        )}

        {activeTab === 'jobs' && (
          <JobsView
            jobs={jobs}
            jobPayments={jobPayments}
            jobInterventions={jobInterventions}
            onSaveJob={handleSaveJob}
            onCollectJobPayment={handleCollectJobPayment}
            onSaveJobIntervention={handleSaveJobIntervention}
            onDeleteJob={handleDeleteJob}
            onOpenQuickJob={() => setIsJobModalOpen(true)}
          />
        )}

        {activeTab === 'expenses' && (
          <ExpensesView
            metrics={metrics}
            businessExpenses={businessExpenses}
            personalExpenses={personalExpenses}
            onDeleteBusinessExpense={handleDeleteBusinessExpense}
            onDeletePersonalExpense={handleDeletePersonalExpense}
            onOpenQuickExpense={() => setIsExpenseModalOpen(true)}
          />
        )}

        {activeTab === 'debts' && (
          <DebtView
            metrics={metrics}
            debts={debts}
            debtPayments={debtPayments}
            onSaveDebtObligation={handleSaveDebtObligation}
            onDeleteDebtObligation={handleDeleteDebtObligation}
            onOpenQuickDebtPayment={() => setIsDebtModalOpen(true)}
          />
        )}

        {activeTab === 'print' && (
          <PrintStatementView
            metrics={metrics}
            jobs={jobs}
            businessExpenses={businessExpenses}
            personalExpenses={personalExpenses}
            debts={debts}
            debtPayments={debtPayments}
            dataHealthReport={dataHealthReport}
            onExportData={handleExportData}
            onImportData={handleImportData}
            onClearAllData={handleClearAllData}
          />
        )}
      </main>

      {/* Rapid Action Modals (<10s, <20s, <15s) */}
      <QuickExpenseModal
        isOpen={isExpenseModalOpen}
        onClose={() => setIsExpenseModalOpen(false)}
        onSaveBusinessExpense={handleSaveBusinessExpense}
        onSavePersonalExpense={handleSavePersonalExpense}
      />

      <QuickJobModal
        isOpen={isJobModalOpen}
        onClose={() => setIsJobModalOpen(false)}
        onSaveJob={handleSaveJob}
        onCollectJobPayment={handleCollectJobPayment}
        clients={clients}
      />

      <QuickDebtPaymentModal
        isOpen={isDebtModalOpen}
        onClose={() => setIsDebtModalOpen(false)}
        debts={debts}
        onSaveDebtPayment={handleSaveDebtPayment}
      />

      <QuickTodoModal
        isOpen={isTodoModalOpen}
        onClose={() => setIsTodoModalOpen(false)}
        onSaveTodo={(t) => setTodos(saveTodoItem(t))}
      />
    </div>
  );
}

export default App;
