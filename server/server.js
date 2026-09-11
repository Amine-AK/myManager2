import express from 'express';
import cors from 'cors';
import {
  initDb,
  getActiveBackend,
  DeleteBlockedError,
  getJobsDb,
  saveJobDb,
  deleteJobDb,
  getJobPaymentsDb,
  saveJobPaymentDb,
  collectJobPaymentDb,
  getJobInterventionsDb,
  saveJobInterventionDb,
  getBusinessExpensesDb,
  saveBusinessExpenseDb,
  deleteBusinessExpenseDb,
  getPersonalExpensesDb,
  savePersonalExpenseDb,
  deletePersonalExpenseDb,
  getDebtsDb,
  saveDebtDb,
  deleteDebtDb,
  getDebtPaymentsDb,
  saveDebtPaymentDb,
  getClientsDb,
  saveClientDb,
  clearAllDataDb
} from './db.js';
import {
  validateBody,
  jobSchema,
  jobPaymentSchema,
  collectJobPaymentSchema,
  jobInterventionSchema,
  businessExpenseSchema,
  personalExpenseSchema,
  debtSchema,
  debtPaymentSchema,
  clientSchema
} from './validation.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Initialize DB tables if Neon DATABASE_URL is set
initDb();

// --- DIAGNOSTICS ---
// Reports which storage backend is actually live and rough record counts.
// No connection strings, tokens, or other secrets are ever included here.
app.get('/api/health', async (req, res) => {
  try {
    const backend = getActiveBackend();
    const [jobs, jobPayments, businessExpenses, personalExpenses, debts, clients] = await Promise.all([
      getJobsDb(),
      getJobPaymentsDb(),
      getBusinessExpensesDb(),
      getPersonalExpensesDb(),
      getDebtsDb(),
      getClientsDb()
    ]);
    res.json({
      backend,
      persistent: backend !== 'json-file',
      counts: {
        jobs: jobs.length,
        jobPayments: jobPayments.length,
        businessExpenses: businessExpenses.length,
        personalExpenses: personalExpenses.length,
        debts: debts.length,
        clients: clients.length
      },
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- JOBS ---
app.get('/api/jobs', async (req, res) => {
  try {
    const jobs = await getJobsDb();
    res.json(jobs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/jobs', validateBody(jobSchema), async (req, res) => {
  try {
    const job = await saveJobDb(req.body);
    res.json(job);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/jobs/:id', async (req, res) => {
  try {
    await deleteJobDb(req.params.id);
    res.json({ success: true });
  } catch (err) {
    if (err instanceof DeleteBlockedError) {
      res.status(409).json({ error: err.message, code: err.code, details: err.details });
      return;
    }
    res.status(500).json({ error: err.message });
  }
});

// --- JOB PAYMENTS ---
app.get('/api/job-payments', async (req, res) => {
  try {
    const payments = await getJobPaymentsDb();
    res.json(payments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/job-payments', validateBody(jobPaymentSchema), async (req, res) => {
  try {
    const payment = await saveJobPaymentDb(req.body);
    res.json(payment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Atomically records a payment against an existing job and recomputes
// paid_amount from the payment ledger in one transaction (see collectJobPaymentDb).
app.post('/api/jobs/:id/collect-payment', validateBody(collectJobPaymentSchema), async (req, res) => {
  try {
    const { payment, jobUpdate } = req.body;
    const job = await collectJobPaymentDb(req.params.id, payment, jobUpdate);
    if (!job) {
      return res.status(404).json({ error: `Job ${req.params.id} not found` });
    }
    res.json(job);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- JOB INTERVENTIONS (post-completion client callbacks) ---
app.get('/api/job-interventions', async (req, res) => {
  try {
    const interventions = await getJobInterventionsDb();
    res.json(interventions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/job-interventions', validateBody(jobInterventionSchema), async (req, res) => {
  try {
    const intervention = await saveJobInterventionDb(req.body);
    res.json(intervention);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- BUSINESS EXPENSES ---
app.get('/api/business-expenses', async (req, res) => {
  try {
    const expenses = await getBusinessExpensesDb();
    res.json(expenses);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/business-expenses', validateBody(businessExpenseSchema), async (req, res) => {
  try {
    const exp = await saveBusinessExpenseDb(req.body);
    res.json(exp);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/business-expenses/:id', async (req, res) => {
  try {
    await deleteBusinessExpenseDb(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- PERSONAL EXPENSES ---
app.get('/api/personal-expenses', async (req, res) => {
  try {
    const expenses = await getPersonalExpensesDb();
    res.json(expenses);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/personal-expenses', validateBody(personalExpenseSchema), async (req, res) => {
  try {
    const exp = await savePersonalExpenseDb(req.body);
    res.json(exp);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/personal-expenses/:id', async (req, res) => {
  try {
    await deletePersonalExpenseDb(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- DEBTS & PAYMENTS ---
app.get('/api/debts', async (req, res) => {
  try {
    const debts = await getDebtsDb();
    res.json(debts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/debts', validateBody(debtSchema), async (req, res) => {
  try {
    const debt = await saveDebtDb(req.body);
    res.json(debt);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/debts/:id', async (req, res) => {
  try {
    await deleteDebtDb(req.params.id);
    res.json({ success: true });
  } catch (err) {
    if (err instanceof DeleteBlockedError) {
      res.status(409).json({ error: err.message, code: err.code, details: err.details });
      return;
    }
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/debt-payments', async (req, res) => {
  try {
    const payments = await getDebtPaymentsDb();
    res.json(payments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/debt-payments', validateBody(debtPaymentSchema), async (req, res) => {
  try {
    const payment = await saveDebtPaymentDb(req.body);
    res.json(payment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- CLIENTS ---
app.get('/api/clients', async (req, res) => {
  try {
    const clients = await getClientsDb();
    res.json(clients);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/clients', validateBody(clientSchema), async (req, res) => {
  try {
    const client = await saveClientDb(req.body);
    res.json(client);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- BACKUP & RESTORE ---
app.get('/api/export', async (req, res) => {
  try {
    const dump = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      jobs: await getJobsDb(),
      jobPayments: await getJobPaymentsDb(),
      jobInterventions: await getJobInterventionsDb(),
      businessExpenses: await getBusinessExpensesDb(),
      personalExpenses: await getPersonalExpensesDb(),
      debts: await getDebtsDb(),
      debtPayments: await getDebtPaymentsDb(),
      clients: await getClientsDb()
    };
    res.json(dump);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Validates and imports one array of records against `schema`, skipping (not
// throwing on) individually invalid records so one bad row can't abort or
// silently corrupt the rest of an otherwise-good backup.
async function importRecords(records, schema, saveFn, skipped) {
  if (!Array.isArray(records)) return 0;
  let imported = 0;
  for (const record of records) {
    const result = schema.safeParse(record);
    if (!result.success) {
      skipped.push({ id: record?.id, reason: result.error.issues[0]?.message });
      continue;
    }
    await saveFn(result.data);
    imported++;
  }
  return imported;
}

app.post('/api/import', async (req, res) => {
  try {
    const data = req.body;
    const skipped = [];
    const imported = {
      jobs: await importRecords(data.jobs, jobSchema, saveJobDb, skipped),
      jobPayments: await importRecords(data.jobPayments, jobPaymentSchema, saveJobPaymentDb, skipped),
      jobInterventions: await importRecords(data.jobInterventions, jobInterventionSchema, saveJobInterventionDb, skipped),
      businessExpenses: await importRecords(data.businessExpenses, businessExpenseSchema, saveBusinessExpenseDb, skipped),
      personalExpenses: await importRecords(data.personalExpenses, personalExpenseSchema, savePersonalExpenseDb, skipped),
      debts: await importRecords(data.debts, debtSchema, saveDebtDb, skipped),
      debtPayments: await importRecords(data.debtPayments, debtPaymentSchema, saveDebtPaymentDb, skipped),
      clients: await importRecords(data.clients, clientSchema, saveClientDb, skipped)
    };
    res.json({ success: true, imported, skipped });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- CLEAR ALL DATA (testing / fresh start) ---
app.post('/api/clear-all', async (req, res) => {
  try {
    await clearAllDataDb();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`⚡ Server running on port ${PORT}`);
});

export default app;
