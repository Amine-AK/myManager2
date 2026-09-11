import { neon } from '@neondatabase/serverless';
import { Redis } from '@upstash/redis';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '..', 'data');

// Thrown instead of deleting a job/debt that still has payment history (or,
// for jobs, client callbacks) attached. Deletion is blocked, not cascaded -
// financial records are never silently destroyed as a side effect of
// deleting the thing they're attached to.
export class DeleteBlockedError extends Error {
  constructor(message, details) {
    super(message);
    this.name = 'DeleteBlockedError';
    this.code = 'HAS_DEPENDENTS';
    this.details = details;
  }
}

// 1. Neon Postgres Connection URL
const pgUrl =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.DATABASE_URL_UNPOOLED ||
  process.env.POSTGRES_URL_NON_POOLING;

// 2. Vercel KV / Upstash Redis Connection URL
const kvUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const kvToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

let sql = null;
let redis = null;

if (pgUrl) {
  try {
    sql = neon(pgUrl);
    console.log('🐘 Connected to Neon PostgreSQL Database!');
  } catch (err) {
    console.error('Neon connection error:', err.message);
  }
} else if (kvUrl && kvToken) {
  try {
    redis = new Redis({ url: kvUrl, token: kvToken });
    console.log('🔴 Connected to Vercel KV / Upstash Redis Database!');
  } catch (err) {
    console.error('Vercel KV connection error:', err.message);
  }
}

// Reports which storage backend is actually active, for diagnostics.
// Reveals no connection strings or secrets - just which mode is live.
export function getActiveBackend() {
  if (sql) return 'postgres';
  if (redis) return 'redis';
  return 'json-file';
}

// Auto-initialize Neon PostgreSQL tables if using Postgres
export async function initDb() {
  if (sql) {
    try {
      await sql`
        CREATE TABLE IF NOT EXISTS jobs (
          id VARCHAR(255) PRIMARY KEY,
          title TEXT NOT NULL,
          client_name TEXT NOT NULL,
          client_phone TEXT,
          category TEXT NOT NULL,
          status TEXT NOT NULL,
          agreed_price NUMERIC NOT NULL,
          paid_amount NUMERIC NOT NULL DEFAULT 0,
          material_costs NUMERIC NOT NULL DEFAULT 0,
          start_date TEXT NOT NULL,
          completed_date TEXT,
          acquisition_source TEXT,
          waiting_reason TEXT,
          days_spent INT DEFAULT 1,
          days_paused INT DEFAULT 0,
          logs JSONB DEFAULT '[]'::jsonb
        );
      `;

      await sql`
        CREATE TABLE IF NOT EXISTS job_interventions (
          id VARCHAR(255) PRIMARY KEY,
          job_id TEXT NOT NULL,
          date TEXT NOT NULL,
          reason TEXT NOT NULL,
          resolved BOOLEAN NOT NULL DEFAULT false,
          resolved_date TEXT,
          notes TEXT
        );
      `;

      await sql`
        CREATE TABLE IF NOT EXISTS job_payments (
          id VARCHAR(255) PRIMARY KEY,
          job_id TEXT NOT NULL,
          amount NUMERIC NOT NULL,
          date TEXT NOT NULL,
          notes TEXT
        );
      `;

      await sql`
        CREATE TABLE IF NOT EXISTS business_expenses (
          id VARCHAR(255) PRIMARY KEY,
          title TEXT NOT NULL,
          amount NUMERIC NOT NULL,
          category TEXT NOT NULL,
          date TEXT NOT NULL,
          job_id TEXT,
          notes TEXT
        );
      `;

      await sql`
        CREATE TABLE IF NOT EXISTS personal_expenses (
          id VARCHAR(255) PRIMARY KEY,
          title TEXT NOT NULL,
          amount NUMERIC NOT NULL,
          category TEXT NOT NULL,
          date TEXT NOT NULL,
          notes TEXT
        );
      `;

      await sql`
        CREATE TABLE IF NOT EXISTS debts (
          id VARCHAR(255) PRIMARY KEY,
          creditor TEXT NOT NULL,
          type TEXT NOT NULL,
          total_amount NUMERIC NOT NULL,
          remaining_balance NUMERIC NOT NULL,
          monthly_min_payment NUMERIC,
          due_date TEXT,
          status TEXT NOT NULL,
          notes TEXT
        );
      `;

      await sql`
        CREATE TABLE IF NOT EXISTS debt_payments (
          id VARCHAR(255) PRIMARY KEY,
          debt_id TEXT NOT NULL,
          amount NUMERIC NOT NULL,
          date TEXT NOT NULL,
          notes TEXT
        );
      `;

      await sql`
        CREATE TABLE IF NOT EXISTS clients (
          id VARCHAR(255) PRIMARY KEY,
          name TEXT NOT NULL,
          phone TEXT,
          city TEXT,
          acquisition_source TEXT,
          notes TEXT
        );
      `;

      console.log('✅ Neon PostgreSQL tables initialized successfully.');

      // Foreign keys as a backstop behind the app-level blocked-delete checks
      // below. ON DELETE RESTRICT (the default) matches that app-level
      // behavior: deleting a job/debt with payment history attached fails
      // rather than cascading, so financial records are never destroyed as
      // a side effect. Each is added independently and idempotently - if one
      // fails (e.g. pre-existing orphaned rows in production data), it's
      // logged and the others are still attempted; the app keeps working
      // either way since the app-level checks are the primary enforcement.
      const foreignKeys = [
        {
          name: 'fk_job_payments_job_id',
          run: () => sql`ALTER TABLE job_payments ADD CONSTRAINT fk_job_payments_job_id FOREIGN KEY (job_id) REFERENCES jobs(id);`
        },
        {
          name: 'fk_job_interventions_job_id',
          run: () => sql`ALTER TABLE job_interventions ADD CONSTRAINT fk_job_interventions_job_id FOREIGN KEY (job_id) REFERENCES jobs(id);`
        },
        {
          name: 'fk_debt_payments_debt_id',
          run: () => sql`ALTER TABLE debt_payments ADD CONSTRAINT fk_debt_payments_debt_id FOREIGN KEY (debt_id) REFERENCES debts(id);`
        }
      ];
      for (const fk of foreignKeys) {
        try {
          const [{ exists }] = await sql`SELECT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = ${fk.name}) AS exists;`;
          if (!exists) {
            await fk.run();
            console.log(`✅ Added foreign key ${fk.name}.`);
          }
        } catch (fkErr) {
          console.error(`Could not add foreign key ${fk.name} (app-level checks still enforce this):`, fkErr.message);
        }
      }
    } catch (err) {
      console.error('Error initializing Neon DB tables:', err);
    }
  } else if (redis) {
    console.log('✅ Vercel KV Ready.');
  } else {
    console.log('💻 Running in Local Development mode with JSON files.');
  }
}

// Helper functions for JSON disk file fallback during local development
async function readJson(filename) {
  try {
    const filePath = path.join(DATA_DIR, filename);
    const data = await fs.readFile(filePath, 'utf8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

async function writeJson(filename, data) {
  const filePath = path.join(DATA_DIR, filename);
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
}

// --- JOBS ---
function mapJobRow(r) {
  return {
    id: r.id,
    title: r.title,
    clientName: r.client_name,
    clientPhone: r.client_phone || undefined,
    category: r.category,
    status: r.status,
    agreedPrice: parseFloat(r.agreed_price),
    paidAmount: parseFloat(r.paid_amount),
    materialCosts: parseFloat(r.material_costs),
    startDate: r.start_date,
    completedDate: r.completed_date || undefined,
    acquisitionSource: r.acquisition_source || undefined,
    waitingReason: r.waiting_reason || undefined,
    daysSpent: r.days_spent || 1,
    daysPaused: r.days_paused || 0,
    logs: typeof r.logs === 'string' ? JSON.parse(r.logs) : (r.logs || [])
  };
}

export async function getJobsDb() {
  if (sql) {
    const rows = await sql`SELECT * FROM jobs ORDER BY start_date DESC;`;
    return rows.map(mapJobRow);
  }

  if (redis) {
    const data = await redis.get('jobs');
    return data || [];
  }

  return await readJson('jobs.json');
}

export async function saveJobDb(job) {
  if (sql) {
    await sql`
      INSERT INTO jobs (
        id, title, client_name, client_phone, category, status,
        agreed_price, paid_amount, material_costs, start_date,
        completed_date, acquisition_source, waiting_reason, days_spent, days_paused, logs
      ) VALUES (
        ${job.id}, ${job.title}, ${job.clientName}, ${job.clientPhone || null}, ${job.category}, ${job.status},
        ${job.agreedPrice}, ${job.paidAmount || 0}, ${job.materialCosts || 0}, ${job.startDate},
        ${job.completedDate || null}, ${job.acquisitionSource || null}, ${job.waitingReason || null},
        ${job.daysSpent || 1}, ${job.daysPaused || 0}, ${JSON.stringify(job.logs || [])}
      )
      ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        client_name = EXCLUDED.client_name,
        client_phone = EXCLUDED.client_phone,
        category = EXCLUDED.category,
        status = EXCLUDED.status,
        agreed_price = EXCLUDED.agreed_price,
        paid_amount = EXCLUDED.paid_amount,
        material_costs = EXCLUDED.material_costs,
        start_date = EXCLUDED.start_date,
        completed_date = EXCLUDED.completed_date,
        acquisition_source = EXCLUDED.acquisition_source,
        waiting_reason = EXCLUDED.waiting_reason,
        days_spent = EXCLUDED.days_spent,
        days_paused = EXCLUDED.days_paused,
        logs = EXCLUDED.logs;
    `;

    if (job.clientName) {
      const existing = await sql`SELECT id FROM clients WHERE LOWER(name) = LOWER(${job.clientName}) LIMIT 1;`;
      if (existing.length === 0) {
        await saveClientDb({
          id: `cli-${Date.now()}`,
          name: job.clientName,
          phone: job.clientPhone,
          acquisitionSource: job.acquisitionSource
        });
      }
    }

    return job;
  }

  if (redis) {
    const jobs = (await redis.get('jobs')) || [];
    const index = jobs.findIndex(j => j.id === job.id);
    if (index >= 0) jobs[index] = job;
    else jobs.unshift(job);
    await redis.set('jobs', jobs);

    if (job.clientName) {
      const clients = (await redis.get('clients')) || [];
      const existing = clients.find(c => c.name.toLowerCase() === job.clientName.toLowerCase());
      if (!existing) {
        clients.unshift({
          id: `cli-${Date.now()}`,
          name: job.clientName,
          phone: job.clientPhone,
          acquisitionSource: job.acquisitionSource
        });
        await redis.set('clients', clients);
      }
    }
    return job;
  }

  const jobs = await readJson('jobs.json');
  const index = jobs.findIndex(j => j.id === job.id);
  if (index >= 0) jobs[index] = job;
  else jobs.unshift(job);
  await writeJson('jobs.json', jobs);
  return job;
}

// Builds the "why" message shown when a job/debt delete is blocked because
// payment history (or, for jobs, unresolved client callbacks) is attached.
function buildJobBlockMessage(title, paymentCount, paymentTotal, interventionCount) {
  const parts = [];
  if (paymentCount > 0) parts.push(`${paymentCount} payment${paymentCount === 1 ? '' : 's'} totaling ${paymentTotal} MAD`);
  if (interventionCount > 0) parts.push(`${interventionCount} client callback${interventionCount === 1 ? '' : 's'}`);
  return `Cannot delete "${title}": it has ${parts.join(' and ')} recorded. Remove those first if you really need to delete this job.`;
}

function buildDebtBlockMessage(creditor, paymentCount, paymentTotal) {
  return `Cannot delete debt "${creditor}": it has ${paymentCount} payment${paymentCount === 1 ? '' : 's'} totaling ${paymentTotal} MAD recorded. Remove those first if you really need to delete this debt.`;
}

export async function deleteJobDb(id) {
  if (sql) {
    const [job] = await sql`SELECT title FROM jobs WHERE id = ${id};`;
    const [{ count: paymentCount, total: paymentTotal }] = await sql`
      SELECT COUNT(*)::int AS count, COALESCE(SUM(amount), 0) AS total FROM job_payments WHERE job_id = ${id};
    `;
    const [{ count: interventionCount }] = await sql`
      SELECT COUNT(*)::int AS count FROM job_interventions WHERE job_id = ${id};
    `;
    if (paymentCount > 0 || interventionCount > 0) {
      throw new DeleteBlockedError(
        buildJobBlockMessage(job?.title || id, paymentCount, parseFloat(paymentTotal), interventionCount),
        { paymentCount, paymentTotal: parseFloat(paymentTotal), interventionCount }
      );
    }
    await sql`DELETE FROM jobs WHERE id = ${id};`;
    return true;
  }

  if (redis) {
    const jobs = (await redis.get('jobs')) || [];
    const job = jobs.find(j => j.id === id);
    const payments = ((await redis.get('job_payments')) || []).filter(p => p.jobId === id);
    const interventions = ((await redis.get('job_interventions')) || []).filter(i => i.jobId === id);
    if (payments.length > 0 || interventions.length > 0) {
      const total = payments.reduce((sum, p) => sum + p.amount, 0);
      throw new DeleteBlockedError(
        buildJobBlockMessage(job?.title || id, payments.length, total, interventions.length),
        { paymentCount: payments.length, paymentTotal: total, interventionCount: interventions.length }
      );
    }
    const filtered = jobs.filter(j => j.id !== id);
    await redis.set('jobs', filtered);
    return true;
  }

  const jobs = await readJson('jobs.json');
  const job = jobs.find(j => j.id === id);
  const payments = (await readJson('job_payments.json')).filter(p => p.jobId === id);
  const interventions = (await readJson('job_interventions.json')).filter(i => i.jobId === id);
  if (payments.length > 0 || interventions.length > 0) {
    const total = payments.reduce((sum, p) => sum + p.amount, 0);
    throw new DeleteBlockedError(
      buildJobBlockMessage(job?.title || id, payments.length, total, interventions.length),
      { paymentCount: payments.length, paymentTotal: total, interventionCount: interventions.length }
    );
  }
  await writeJson('jobs.json', jobs.filter(j => j.id !== id));
  return true;
}

// --- JOB INTERVENTIONS (post-completion client callbacks) ---
export async function getJobInterventionsDb() {
  if (sql) {
    const rows = await sql`SELECT * FROM job_interventions ORDER BY date DESC;`;
    return rows.map(r => ({
      id: r.id,
      jobId: r.job_id,
      date: r.date,
      reason: r.reason,
      resolved: r.resolved,
      resolvedDate: r.resolved_date || undefined,
      notes: r.notes || undefined
    }));
  }

  if (redis) {
    const data = await redis.get('job_interventions');
    return data || [];
  }

  return await readJson('job_interventions.json');
}

export async function saveJobInterventionDb(intervention) {
  if (sql) {
    await sql`
      INSERT INTO job_interventions (id, job_id, date, reason, resolved, resolved_date, notes)
      VALUES (
        ${intervention.id}, ${intervention.jobId}, ${intervention.date}, ${intervention.reason},
        ${intervention.resolved || false}, ${intervention.resolvedDate || null}, ${intervention.notes || null}
      )
      ON CONFLICT (id) DO UPDATE SET
        date = EXCLUDED.date,
        reason = EXCLUDED.reason,
        resolved = EXCLUDED.resolved,
        resolved_date = EXCLUDED.resolved_date,
        notes = EXCLUDED.notes;
    `;
    return intervention;
  }

  if (redis) {
    const interventions = (await redis.get('job_interventions')) || [];
    const index = interventions.findIndex(i => i.id === intervention.id);
    if (index >= 0) interventions[index] = intervention;
    else interventions.unshift(intervention);
    await redis.set('job_interventions', interventions);
    return intervention;
  }

  const interventions = await readJson('job_interventions.json');
  const index = interventions.findIndex(i => i.id === intervention.id);
  if (index >= 0) interventions[index] = intervention;
  else interventions.unshift(intervention);
  await writeJson('job_interventions.json', interventions);
  return intervention;
}

// --- JOB PAYMENTS ---
export async function getJobPaymentsDb() {
  if (sql) {
    const rows = await sql`SELECT * FROM job_payments ORDER BY date DESC;`;
    return rows.map(r => ({
      id: r.id,
      jobId: r.job_id,
      amount: parseFloat(r.amount),
      date: r.date,
      notes: r.notes || undefined
    }));
  }

  if (redis) {
    const data = await redis.get('job_payments');
    return data || [];
  }

  return await readJson('job_payments.json');
}

export async function saveJobPaymentDb(pay) {
  if (sql) {
    await sql`
      INSERT INTO job_payments (id, job_id, amount, date, notes)
      VALUES (${pay.id}, ${pay.jobId}, ${pay.amount}, ${pay.date}, ${pay.notes || null});
    `;
    return pay;
  }

  if (redis) {
    const payments = (await redis.get('job_payments')) || [];
    payments.unshift(pay);
    await redis.set('job_payments', payments);
    return pay;
  }

  const payments = await readJson('job_payments.json');
  payments.unshift(pay);
  await writeJson('job_payments.json', payments);
  return pay;
}

/**
 * Atomically records a payment against an existing job and recomputes
 * jobs.paid_amount from SUM(job_payments) in the same transaction, instead
 * of incrementing a cached value across two separate writes. This is the
 * path "1-Tap Collect Payment" uses so paid_amount can never drift from the
 * payment ledger it's supposed to summarize.
 */
export async function collectJobPaymentDb(jobId, payment, jobUpdate) {
  if (sql) {
    const logEntryJson = JSON.stringify(jobUpdate.logEntry);
    const results = await sql.transaction([
      sql`INSERT INTO job_payments (id, job_id, amount, date, notes)
          VALUES (${payment.id}, ${jobId}, ${payment.amount}, ${payment.date}, ${payment.notes || null});`,
      sql`UPDATE jobs SET
            paid_amount = LEAST(agreed_price, (SELECT COALESCE(SUM(amount), 0) FROM job_payments WHERE job_id = ${jobId})),
            status = ${jobUpdate.status},
            completed_date = ${jobUpdate.completedDate || null},
            logs = jsonb_build_array(${logEntryJson}::jsonb) || logs
          WHERE id = ${jobId}
          RETURNING *;`
    ]);
    const row = results[1][0];
    return row ? mapJobRow(row) : null;
  }

  if (redis) {
    const payments = (await redis.get('job_payments')) || [];
    payments.unshift({ ...payment, jobId });
    await redis.set('job_payments', payments);

    const jobs = (await redis.get('jobs')) || [];
    const jobIndex = jobs.findIndex(j => j.id === jobId);
    if (jobIndex < 0) return null;

    const job = jobs[jobIndex];
    const totalPaid = payments.filter(p => p.jobId === jobId).reduce((sum, p) => sum + p.amount, 0);
    job.paidAmount = Math.min(job.agreedPrice, totalPaid);
    job.status = jobUpdate.status;
    job.completedDate = jobUpdate.completedDate || job.completedDate;
    job.logs = [jobUpdate.logEntry, ...(job.logs || [])];
    jobs[jobIndex] = job;
    await redis.set('jobs', jobs);
    return job;
  }

  const payments = await readJson('job_payments.json');
  payments.unshift({ ...payment, jobId });
  await writeJson('job_payments.json', payments);

  const jobs = await readJson('jobs.json');
  const jobIndex = jobs.findIndex(j => j.id === jobId);
  if (jobIndex < 0) return null;

  const job = jobs[jobIndex];
  const totalPaid = payments.filter(p => p.jobId === jobId).reduce((sum, p) => sum + p.amount, 0);
  job.paidAmount = Math.min(job.agreedPrice, totalPaid);
  job.status = jobUpdate.status;
  job.completedDate = jobUpdate.completedDate || job.completedDate;
  job.logs = [jobUpdate.logEntry, ...(job.logs || [])];
  jobs[jobIndex] = job;
  await writeJson('jobs.json', jobs);
  return job;
}

// --- BUSINESS EXPENSES ---
export async function getBusinessExpensesDb() {
  if (sql) {
    const rows = await sql`SELECT * FROM business_expenses ORDER BY date DESC;`;
    return rows.map(r => ({
      id: r.id,
      title: r.title,
      amount: parseFloat(r.amount),
      category: r.category,
      date: r.date,
      notes: r.notes || undefined
    }));
  }

  if (redis) {
    const data = await redis.get('business_expenses');
    return data || [];
  }

  return await readJson('business_expenses.json');
}

export async function saveBusinessExpenseDb(exp) {
  if (sql) {
    await sql`
      INSERT INTO business_expenses (id, title, amount, category, date, notes)
      VALUES (${exp.id}, ${exp.title}, ${exp.amount}, ${exp.category}, ${exp.date}, ${exp.notes || null})
      ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        amount = EXCLUDED.amount,
        category = EXCLUDED.category,
        date = EXCLUDED.date,
        notes = EXCLUDED.notes;
    `;
    return exp;
  }

  if (redis) {
    const expenses = (await redis.get('business_expenses')) || [];
    const index = expenses.findIndex(e => e.id === exp.id);
    if (index >= 0) expenses[index] = exp;
    else expenses.unshift(exp);
    await redis.set('business_expenses', expenses);
    return exp;
  }

  const expenses = await readJson('business_expenses.json');
  const index = expenses.findIndex(e => e.id === exp.id);
  if (index >= 0) expenses[index] = exp;
  else expenses.unshift(exp);
  await writeJson('business_expenses.json', expenses);
  return exp;
}

export async function deleteBusinessExpenseDb(id) {
  if (sql) {
    await sql`DELETE FROM business_expenses WHERE id = ${id};`;
    return true;
  }

  if (redis) {
    const expenses = (await redis.get('business_expenses')) || [];
    const filtered = expenses.filter(e => e.id !== id);
    await redis.set('business_expenses', filtered);
    return true;
  }

  const expenses = await readJson('business_expenses.json');
  await writeJson('business_expenses.json', expenses.filter(e => e.id !== id));
  return true;
}

// --- PERSONAL EXPENSES ---
export async function getPersonalExpensesDb() {
  if (sql) {
    const rows = await sql`SELECT * FROM personal_expenses ORDER BY date DESC;`;
    return rows.map(r => ({
      id: r.id,
      title: r.title,
      amount: parseFloat(r.amount),
      category: r.category,
      date: r.date,
      notes: r.notes || undefined
    }));
  }

  if (redis) {
    const data = await redis.get('personal_expenses');
    return data || [];
  }

  return await readJson('personal_expenses.json');
}

export async function savePersonalExpenseDb(exp) {
  if (sql) {
    await sql`
      INSERT INTO personal_expenses (id, title, amount, category, date, notes)
      VALUES (${exp.id}, ${exp.title}, ${exp.amount}, ${exp.category}, ${exp.date}, ${exp.notes || null})
      ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        amount = EXCLUDED.amount,
        category = EXCLUDED.category,
        date = EXCLUDED.date,
        notes = EXCLUDED.notes;
    `;
    return exp;
  }

  if (redis) {
    const expenses = (await redis.get('personal_expenses')) || [];
    const index = expenses.findIndex(e => e.id === exp.id);
    if (index >= 0) expenses[index] = exp;
    else expenses.unshift(exp);
    await redis.set('personal_expenses', expenses);
    return exp;
  }

  const expenses = await readJson('personal_expenses.json');
  const index = expenses.findIndex(e => e.id === exp.id);
  if (index >= 0) expenses[index] = exp;
  else expenses.unshift(exp);
  await writeJson('personal_expenses.json', expenses);
  return exp;
}

export async function deletePersonalExpenseDb(id) {
  if (sql) {
    await sql`DELETE FROM personal_expenses WHERE id = ${id};`;
    return true;
  }

  if (redis) {
    const expenses = (await redis.get('personal_expenses')) || [];
    const filtered = expenses.filter(e => e.id !== id);
    await redis.set('personal_expenses', filtered);
    return true;
  }

  const expenses = await readJson('personal_expenses.json');
  await writeJson('personal_expenses.json', expenses.filter(e => e.id !== id));
  return true;
}

// --- DEBTS & PAYMENTS ---
export async function getDebtsDb() {
  if (sql) {
    const rows = await sql`SELECT * FROM debts ORDER BY status ASC;`;
    return rows.map(r => ({
      id: r.id,
      creditor: r.creditor,
      type: r.type,
      totalAmount: parseFloat(r.total_amount),
      remainingBalance: parseFloat(r.remaining_balance),
      monthlyMinPayment: r.monthly_min_payment ? parseFloat(r.monthly_min_payment) : undefined,
      dueDate: r.due_date || undefined,
      status: r.status,
      notes: r.notes || undefined
    }));
  }

  if (redis) {
    const data = await redis.get('debts');
    return data || [];
  }

  return await readJson('debts.json');
}

export async function saveDebtDb(debt) {
  if (sql) {
    await sql`
      INSERT INTO debts (id, creditor, type, total_amount, remaining_balance, monthly_min_payment, due_date, status, notes)
      VALUES (${debt.id}, ${debt.creditor}, ${debt.type}, ${debt.totalAmount}, ${debt.remainingBalance}, ${debt.monthlyMinPayment || null}, ${debt.dueDate || null}, ${debt.status}, ${debt.notes || null})
      ON CONFLICT (id) DO UPDATE SET
        creditor = EXCLUDED.creditor,
        type = EXCLUDED.type,
        total_amount = EXCLUDED.total_amount,
        remaining_balance = EXCLUDED.remaining_balance,
        monthly_min_payment = EXCLUDED.monthly_min_payment,
        due_date = EXCLUDED.due_date,
        status = EXCLUDED.status,
        notes = EXCLUDED.notes;
    `;
    return debt;
  }

  if (redis) {
    const debts = (await redis.get('debts')) || [];
    const index = debts.findIndex(d => d.id === debt.id);
    if (index >= 0) debts[index] = debt;
    else debts.unshift(debt);
    await redis.set('debts', debts);
    return debt;
  }

  const debts = await readJson('debts.json');
  const index = debts.findIndex(d => d.id === debt.id);
  if (index >= 0) debts[index] = debt;
  else debts.unshift(debt);
  await writeJson('debts.json', debts);
  return debt;
}

export async function deleteDebtDb(id) {
  if (sql) {
    const [debt] = await sql`SELECT creditor FROM debts WHERE id = ${id};`;
    const [{ count: paymentCount, total: paymentTotal }] = await sql`
      SELECT COUNT(*)::int AS count, COALESCE(SUM(amount), 0) AS total FROM debt_payments WHERE debt_id = ${id};
    `;
    if (paymentCount > 0) {
      throw new DeleteBlockedError(
        buildDebtBlockMessage(debt?.creditor || id, paymentCount, parseFloat(paymentTotal)),
        { paymentCount, paymentTotal: parseFloat(paymentTotal) }
      );
    }
    await sql`DELETE FROM debts WHERE id = ${id};`;
    return true;
  }

  if (redis) {
    const debts = (await redis.get('debts')) || [];
    const debt = debts.find(d => d.id === id);
    const payments = ((await redis.get('debt_payments')) || []).filter(p => p.debtId === id);
    if (payments.length > 0) {
      const total = payments.reduce((sum, p) => sum + p.amount, 0);
      throw new DeleteBlockedError(
        buildDebtBlockMessage(debt?.creditor || id, payments.length, total),
        { paymentCount: payments.length, paymentTotal: total }
      );
    }
    const filtered = debts.filter(d => d.id !== id);
    await redis.set('debts', filtered);
    return true;
  }

  const debts = await readJson('debts.json');
  const debt = debts.find(d => d.id === id);
  const payments = (await readJson('debt_payments.json')).filter(p => p.debtId === id);
  if (payments.length > 0) {
    const total = payments.reduce((sum, p) => sum + p.amount, 0);
    throw new DeleteBlockedError(
      buildDebtBlockMessage(debt?.creditor || id, payments.length, total),
      { paymentCount: payments.length, paymentTotal: total }
    );
  }
  await writeJson('debts.json', debts.filter(d => d.id !== id));
  return true;
}

export async function getDebtPaymentsDb() {
  if (sql) {
    const rows = await sql`SELECT * FROM debt_payments ORDER BY date DESC;`;
    return rows.map(r => ({
      id: r.id,
      debtId: r.debt_id,
      amount: parseFloat(r.amount),
      date: r.date,
      notes: r.notes || undefined
    }));
  }

  if (redis) {
    const data = await redis.get('debt_payments');
    return data || [];
  }

  return await readJson('debt_payments.json');
}

/**
 * Atomically records a debt payment and recomputes debts.remaining_balance
 * from total_amount - SUM(debt_payments) in the same transaction, instead of
 * decrementing a cached value across two separate writes. A crash between
 * the two writes can no longer leave the balance permanently wrong.
 */
export async function saveDebtPaymentDb(pay) {
  if (sql) {
    await sql.transaction([
      sql`INSERT INTO debt_payments (id, debt_id, amount, date, notes)
          VALUES (${pay.id}, ${pay.debtId}, ${pay.amount}, ${pay.date}, ${pay.notes || null});`,
      sql`UPDATE debts SET
            remaining_balance = GREATEST(0, total_amount - (SELECT COALESCE(SUM(amount), 0) FROM debt_payments WHERE debt_id = ${pay.debtId})),
            status = CASE
              WHEN total_amount - (SELECT COALESCE(SUM(amount), 0) FROM debt_payments WHERE debt_id = ${pay.debtId}) <= 0 THEN 'paid_off'
              ELSE status
            END
          WHERE id = ${pay.debtId};`
    ]);
    return pay;
  }

  if (redis) {
    const payments = (await redis.get('debt_payments')) || [];
    payments.unshift(pay);
    await redis.set('debt_payments', payments);

    const debts = (await redis.get('debts')) || [];
    const debtIndex = debts.findIndex(d => d.id === pay.debtId);
    if (debtIndex >= 0) {
      const debt = debts[debtIndex];
      const totalPaid = payments.filter(p => p.debtId === pay.debtId).reduce((sum, p) => sum + p.amount, 0);
      debt.remainingBalance = Math.max(0, debt.totalAmount - totalPaid);
      if (debt.remainingBalance === 0) debt.status = 'paid_off';
      debts[debtIndex] = debt;
      await redis.set('debts', debts);
    }
    return pay;
  }

  const payments = await readJson('debt_payments.json');
  payments.unshift(pay);
  await writeJson('debt_payments.json', payments);

  const debts = await readJson('debts.json');
  const debtIndex = debts.findIndex(d => d.id === pay.debtId);
  if (debtIndex >= 0) {
    const debt = debts[debtIndex];
    const totalPaid = payments.filter(p => p.debtId === pay.debtId).reduce((sum, p) => sum + p.amount, 0);
    debt.remainingBalance = Math.max(0, debt.totalAmount - totalPaid);
    if (debt.remainingBalance === 0) debt.status = 'paid_off';
    debts[debtIndex] = debt;
    await writeJson('debts.json', debts);
  }
  return pay;
}

// --- CLIENTS ---
export async function getClientsDb() {
  if (sql) {
    const rows = await sql`SELECT * FROM clients ORDER BY name ASC;`;
    return rows.map(r => ({
      id: r.id,
      name: r.name,
      phone: r.phone || undefined,
      city: r.city || undefined,
      acquisitionSource: r.acquisition_source || undefined,
      notes: r.notes || undefined
    }));
  }

  if (redis) {
    const data = await redis.get('clients');
    return data || [];
  }

  return await readJson('clients.json');
}

export async function saveClientDb(client) {
  if (sql) {
    await sql`
      INSERT INTO clients (id, name, phone, city, acquisition_source, notes)
      VALUES (${client.id}, ${client.name}, ${client.phone || null}, ${client.city || null}, ${client.acquisitionSource || null}, ${client.notes || null})
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        phone = EXCLUDED.phone,
        city = EXCLUDED.city,
        acquisition_source = EXCLUDED.acquisition_source,
        notes = EXCLUDED.notes;
    `;
    return client;
  }

  if (redis) {
    const clients = (await redis.get('clients')) || [];
    const index = clients.findIndex(c => c.id === client.id);
    if (index >= 0) clients[index] = client;
    else clients.unshift(client);
    await redis.set('clients', clients);
    return client;
  }

  const clients = await readJson('clients.json');
  const index = clients.findIndex(c => c.id === client.id);
  if (index >= 0) clients[index] = client;
  else clients.unshift(client);
  await writeJson('clients.json', clients);
  return client;
}

// --- CLEAR ALL DATA (testing / fresh start) ---
export async function clearAllDataDb() {
  if (sql) {
    await sql`DELETE FROM job_payments;`;
    await sql`DELETE FROM job_interventions;`;
    await sql`DELETE FROM debt_payments;`;
    await sql`DELETE FROM jobs;`;
    await sql`DELETE FROM business_expenses;`;
    await sql`DELETE FROM personal_expenses;`;
    await sql`DELETE FROM debts;`;
    await sql`DELETE FROM clients;`;
    return true;
  }

  if (redis) {
    await redis.set('jobs', []);
    await redis.set('job_payments', []);
    await redis.set('job_interventions', []);
    await redis.set('business_expenses', []);
    await redis.set('personal_expenses', []);
    await redis.set('debts', []);
    await redis.set('debt_payments', []);
    await redis.set('clients', []);
    return true;
  }

  await writeJson('jobs.json', []);
  await writeJson('job_payments.json', []);
  await writeJson('job_interventions.json', []);
  await writeJson('business_expenses.json', []);
  await writeJson('personal_expenses.json', []);
  await writeJson('debts.json', []);
  await writeJson('debt_payments.json', []);
  await writeJson('clients.json', []);
  return true;
}
