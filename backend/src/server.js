import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import sqlite3 from 'sqlite3';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDirectory = path.join(__dirname, '..', 'data');
const dbPath = path.join(dataDirectory, 'paymeny.db');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'paymeny-demo-secret';
const db = new sqlite3.Database(dbPath);
let initializationPromise = null;

const closeDatabase = () =>
  new Promise((resolve, reject) => {
    db.close((error) => (error ? reject(error) : resolve()));
  });

const run = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.run(sql, params, function onRun(err) {
      if (err) return reject(err);
      resolve({ id: this.lastID, changes: this.changes });
    });
  });

const get = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });

const all = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows || []);
    });
  });

const createToken = (user) =>
  jwt.sign({ userId: user.id, email: user.email, role: user.role || 'customer' }, JWT_SECRET, { expiresIn: '7d' });

const normalizeUser = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role || 'customer',
  wallet: { balance: Number(user.wallet_balance || 0) },
  accountNumber: user.account_number,
  kycStatus: user.kyc_status || 'not_started',
  createdAt: user.created_at,
});

const normalizeTransaction = (transaction) => ({
  id: transaction.id,
  title: transaction.title,
  amount: Number(transaction.amount),
  direction: transaction.direction,
  type: transaction.type,
  note: transaction.note,
  counterparty: transaction.counterparty,
  createdAt: transaction.created_at,
});

const normalizeCard = (card) => ({
  id: card.id,
  brand: card.brand,
  last4: card.last4,
  type: card.type,
  expiry: card.expiry,
  status: card.status,
  name: card.name,
  createdAt: card.created_at,
});

const paymentProvider = (process.env.PAYMENT_PROVIDER || 'demo').toLowerCase();
const paymentGatewayReference = () => `pay_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

const initializeGatewayPayment = async ({ user, amount, email, channel, note }) => {
  const reference = paymentGatewayReference();
  const normalizedAmount = Number(amount);

  if (paymentProvider === 'paystack' && process.env.PAYSTACK_SECRET_KEY) {
    const response = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        email: email || user.email,
        amount: Math.round(normalizedAmount * 100),
        currency: 'NGN',
        reference,
        channels: channel ? [channel] : ['card', 'bank', 'ussd'],
        metadata: {
          customer_name: user.name,
          customer_id: user.id,
          note: note || 'Paymeny payment',
        },
      }),
    });

    const data = await response.json();
    if (!response.ok || !data?.status) {
      throw new Error(data?.message || 'Payment gateway rejected the request.');
    }

    return {
      provider: 'paystack',
      status: 'pending',
      reference,
      authorizationUrl: data.data.authorization_url,
      accessCode: data.data.access_code,
      message: 'Payment initialized via Paystack.',
    };
  }

  return {
    provider: paymentProvider === 'demo' ? 'demo' : paymentProvider,
    status: 'pending',
    reference,
    authorizationUrl: `/payments/checkout/${reference}`,
    accessCode: reference,
    message: process.env.PAYMENT_PROVIDER
      ? 'Gateway configured in demo mode for local testing.'
      : 'Demo gateway initialized successfully. Add PAYSTACK_SECRET_KEY to switch to live processing.',
  };
};

const initializeDatabase = async () => {
  if (initializationPromise) {
    return initializationPromise;
  }

  initializationPromise = (async () => {
    await import('node:fs/promises').then(({ mkdir }) => mkdir(dataDirectory, { recursive: true }));

    await run(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        wallet_balance REAL DEFAULT 0,
        account_number TEXT,
        role TEXT DEFAULT 'customer',
        kyc_status TEXT DEFAULT 'not_started',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await run(`
      CREATE TABLE IF NOT EXISTS cards (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        brand TEXT NOT NULL,
        last4 TEXT NOT NULL,
        type TEXT NOT NULL,
        expiry TEXT,
        status TEXT DEFAULT 'active',
        name TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id)
      )
    `);

    await run(`
      CREATE TABLE IF NOT EXISTS transactions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        title TEXT NOT NULL,
        amount REAL NOT NULL,
        direction TEXT NOT NULL,
        type TEXT NOT NULL,
        note TEXT,
        counterparty TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id)
      )
    `);

    await run(`
      CREATE TABLE IF NOT EXISTS kyc_records (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        full_name TEXT,
        bvn TEXT,
        nin TEXT,
        document_type TEXT,
        status TEXT DEFAULT 'pending',
        review_notes TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id),
        FOREIGN KEY(user_id) REFERENCES users(id)
      )
    `);

    await run('ALTER TABLE kyc_records ADD COLUMN review_notes TEXT').catch((error) => {
      if (!/duplicate column/i.test(error.message)) {
        throw error;
      }
    });

    const jane = await get('SELECT * FROM users WHERE email = ?', ['jane@paymeny.com']);
    if (!jane) {
      const janeId = 'user_jane';
      await run(
        'INSERT OR IGNORE INTO users (id, name, email, password_hash, wallet_balance, account_number, role, kyc_status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          janeId,
          'Jane Doe',
          'jane@paymeny.com',
          bcrypt.hashSync('password123', 10),
          24500.75,
          '1002003001',
          'customer',
          'verified',
          new Date().toISOString(),
        ]
      );

      const seedTransactions = [
        ['t_1', janeId, 'Salary Deposit', 180000, 'in', 'credit', 'Monthly salary', 'Employer', new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString()],
        ['t_2', janeId, 'Rent Payment', 350000, 'out', 'debit', 'Apartment rent', 'Landlord', new Date(Date.now() - 1000 * 60 * 60 * 24 * 1).toISOString()],
        ['t_3', janeId, 'Grocery Shopping', 25000, 'out', 'debit', 'Fresh groceries', 'Market', new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString()],
        ['t_4', janeId, 'Freelance payout', 65000, 'in', 'credit', 'UX audit', 'Client', new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString()],
      ];

      for (const transaction of seedTransactions) {
        await run(
          'INSERT OR IGNORE INTO transactions (id, user_id, title, amount, direction, type, note, counterparty, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
          transaction
        );
      }

      await run(
        'INSERT OR IGNORE INTO cards (id, user_id, brand, last4, type, expiry, status, name, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        ['card_1', janeId, 'Visa', '4567', 'Virtual', '09/29', 'active', 'Jane Doe', new Date().toISOString()]
      );
    }

    const admin = await get('SELECT * FROM users WHERE email = ?', ['admin@paymeny.com']);
    if (!admin) {
      await run(
        'INSERT OR IGNORE INTO users (id, name, email, password_hash, wallet_balance, account_number, role, kyc_status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          'admin_1',
          'System Admin',
          'admin@paymeny.com',
          bcrypt.hashSync('admin123', 10),
          500000,
          '1002003002',
          'admin',
          'verified',
          new Date().toISOString(),
        ]
      );
    }
  })();

  try {
    await initializationPromise;
  } catch (error) {
    initializationPromise = null;
    throw error;
  }

  return initializationPromise;
};

app.use(cors());
app.use(express.json());

app.get('/', (_req, res) => {
  res.json({
    ok: true,
    service: 'WAOO PAY API',
    message: 'Use the /api routes for app endpoints.',
    timestamp: new Date().toISOString(),
  });
});

const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authentication required.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await get('SELECT * FROM users WHERE id = ?', [decoded.userId]);

    if (!user) {
      return res.status(401).json({ message: 'User not found.' });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired token.' });
  }
};

app.get('/api', (_req, res) => {
  res.json({
    ok: true,
    service: 'WAOO PAY API',
    endpoints: ['/api/health', '/api/login', '/api/register', '/api/dashboard', '/api/cards', '/api/transactions', '/api/transfer', '/api/kyc', '/api/admin/summary'],
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'WAOO PAY API', timestamp: new Date().toISOString() });
});

app.post('/api/register', async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Name, email and password are required.' });
  }

  const existingUser = await get('SELECT * FROM users WHERE LOWER(email) = LOWER(?)', [email]);
  if (existingUser) {
    return res.status(409).json({ message: 'User already exists.' });
  }

  const userId = randomUUID();
  const passwordHash = await bcrypt.hash(password, 10);
  const accountNumber = `100${Math.floor(100000 + Math.random() * 900000)}`;

  await run(
    'INSERT INTO users (id, name, email, password_hash, wallet_balance, account_number, role, kyc_status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [userId, name, email, passwordHash, 2500.0, accountNumber, 'customer', 'pending', new Date().toISOString()]
  );

  await run(
    'INSERT INTO transactions (id, user_id, title, amount, direction, type, note, counterparty, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [randomUUID(), userId, 'Welcome bonus', 2500, 'in', 'credit', 'Account setup bonus', 'Paymeny', new Date().toISOString()]
  );

  const user = await get('SELECT * FROM users WHERE id = ?', [userId]);

  return res.status(201).json({
    user: normalizeUser(user),
    token: createToken(user),
  });
});

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required.' });
  }

  const user = await get('SELECT * FROM users WHERE LOWER(email) = LOWER(?)', [email]);
  if (!user) {
    return res.status(401).json({ message: 'Invalid credentials.' });
  }

  const isValid = await bcrypt.compare(password, user.password_hash);
  if (!isValid) {
    return res.status(401).json({ message: 'Invalid credentials.' });
  }

  return res.json({
    user: normalizeUser(user),
    token: createToken(user),
  });
});

app.get('/api/me', authMiddleware, async (req, res) => {
  const user = await get('SELECT * FROM users WHERE id = ?', [req.user.id]);
  return res.json({ user: normalizeUser(user) });
});

app.get('/api/dashboard', authMiddleware, async (req, res) => {
  const user = req.user;
  const transactions = await all('SELECT * FROM transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT 8', [user.id]);
  const cards = await all('SELECT * FROM cards WHERE user_id = ? ORDER BY created_at DESC LIMIT 4', [user.id]);
  const kyc = await get('SELECT * FROM kyc_records WHERE user_id = ?', [user.id]);

  const totalIncome = transactions
    .filter((entry) => entry.direction === 'in')
    .reduce((sum, entry) => sum + Number(entry.amount), 0);

  const totalExpenses = transactions
    .filter((entry) => entry.direction === 'out')
    .reduce((sum, entry) => sum + Number(entry.amount), 0);

  const balance = Number(user.wallet_balance || 0);
  const savingsRate = balance > 0 ? Math.min(85, ((balance / Math.max(totalIncome, 1)) * 100).toFixed(1)) : 0;

  return res.json({
    balance,
    income: totalIncome,
    spending: totalExpenses,
    savingsRate,
    recentTransactions: transactions.map(normalizeTransaction),
    cards: cards.map(normalizeCard),
    kycStatus: user.kyc_status || 'not_started',
    accountNumber: user.account_number,
    kyc,
  });
});

app.get('/api/cards', authMiddleware, async (req, res) => {
  const cards = await all('SELECT * FROM cards WHERE user_id = ? ORDER BY created_at DESC', [req.user.id]);
  res.json({ cards: cards.map(normalizeCard) });
});

app.post('/api/cards', authMiddleware, async (req, res) => {
  const { brand, last4, type, expiry, name } = req.body;

  if (!brand || !last4 || !type || !name) {
    return res.status(400).json({ message: 'Card details are incomplete.' });
  }

  const cardId = randomUUID();
  await run(
    'INSERT INTO cards (id, user_id, brand, last4, type, expiry, status, name, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [cardId, req.user.id, brand, last4, type, expiry || '09/29', 'active', name, new Date().toISOString()]
  );

  const card = await get('SELECT * FROM cards WHERE id = ?', [cardId]);
  return res.status(201).json({ card: normalizeCard(card), message: 'Card added successfully.' });
});

app.get('/api/transactions', authMiddleware, async (req, res) => {
  const transactions = await all('SELECT * FROM transactions WHERE user_id = ? ORDER BY created_at DESC', [req.user.id]);
  res.json({ transactions: transactions.map(normalizeTransaction) });
});

app.post('/api/transfer', authMiddleware, async (req, res) => {
  const { recipient, amount, note } = req.body;
  const numericAmount = Number(amount);

  if (!recipient || !numericAmount || numericAmount <= 0) {
    return res.status(400).json({ message: 'Recipient and a valid amount are required.' });
  }

  if (numericAmount > Number(req.user.wallet_balance || 0)) {
    return res.status(400).json({ message: 'Insufficient balance for this transfer.' });
  }

  const txId = randomUUID();
  const updatedBalance = Number(req.user.wallet_balance || 0) - numericAmount;

  await run('UPDATE users SET wallet_balance = ? WHERE id = ?', [updatedBalance, req.user.id]);
  await run(
    'INSERT INTO transactions (id, user_id, title, amount, direction, type, note, counterparty, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [txId, req.user.id, `Transfer to ${recipient}`, numericAmount, 'out', 'debit', note || 'Instant transfer', recipient, new Date().toISOString()]
  );

  const transaction = await get('SELECT * FROM transactions WHERE id = ?', [txId]);

  return res.status(201).json({
    message: 'Transfer completed successfully.',
    transaction: normalizeTransaction(transaction),
    balance: updatedBalance,
  });
});

app.get('/api/kyc', authMiddleware, async (req, res) => {
  const kyc = await get('SELECT * FROM kyc_records WHERE user_id = ?', [req.user.id]);
  res.json({ kyc: kyc || null });
});

app.post('/api/kyc', authMiddleware, async (req, res) => {
  const { fullName, bvn, nin, documentType } = req.body;

  if (!fullName || !bvn || !nin || !documentType) {
    return res.status(400).json({ message: 'KYC fields are incomplete.' });
  }

  const existing = await get('SELECT * FROM kyc_records WHERE user_id = ?', [req.user.id]);

  if (existing) {
    await run(
      'UPDATE kyc_records SET full_name = ?, bvn = ?, nin = ?, document_type = ?, status = ?, updated_at = ? WHERE user_id = ?',
      [fullName, bvn, nin, documentType, 'pending', new Date().toISOString(), req.user.id]
    );
    await run('UPDATE users SET kyc_status = ? WHERE id = ?', ['pending', req.user.id]);

    const updated = await get('SELECT * FROM kyc_records WHERE user_id = ?', [req.user.id]);
    return res.json({ message: 'KYC information submitted for review.', kyc: updated });
  }

  const kycId = randomUUID();
  await run(
    'INSERT INTO kyc_records (id, user_id, full_name, bvn, nin, document_type, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [kycId, req.user.id, fullName, bvn, nin, documentType, 'pending', new Date().toISOString(), new Date().toISOString()]
  );
  await run('UPDATE users SET kyc_status = ? WHERE id = ?', ['pending', req.user.id]);

  const created = await get('SELECT * FROM kyc_records WHERE id = ?', [kycId]);
  return res.status(201).json({ message: 'KYC information submitted for review.', kyc: created });
});

app.post('/api/payments/initialize', authMiddleware, async (req, res) => {
  const { amount, email, channel, note } = req.body;
  const numericAmount = Number(amount);

  if (!numericAmount || numericAmount <= 0) {
    return res.status(400).json({ message: 'A valid amount is required.' });
  }

  try {
    const payment = await initializeGatewayPayment({
      user: req.user,
      amount: numericAmount,
      email: email || req.user.email,
      channel: channel || 'card',
      note: note || 'Paymeny transfer',
    });

    await run(
      'INSERT INTO transactions (id, user_id, title, amount, direction, type, note, counterparty, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [payment.reference, req.user.id, 'Gateway payment', numericAmount, 'out', 'payment', note || 'Payment initiated', 'Gateway', new Date().toISOString()]
    );

    return res.status(201).json({
      message: payment.message,
      provider: payment.provider,
      reference: payment.reference,
      authorizationUrl: payment.authorizationUrl,
      accessCode: payment.accessCode,
      status: payment.status,
    });
  } catch (error) {
    return res.status(400).json({ message: error.message || 'Payment initialization failed.' });
  }
});

app.get('/api/admin/summary', authMiddleware, async (req, res) => {
  if ((req.user.role || 'customer') !== 'admin') {
    return res.status(403).json({ message: 'Admin access required.' });
  }

  const totals = await get('SELECT COUNT(*) AS users, SUM(wallet_balance) AS walletValue FROM users');
  const transactions = await get('SELECT COUNT(*) AS count, SUM(amount) AS volume FROM transactions');
  const pendingKyc = await get('SELECT COUNT(*) AS count FROM kyc_records WHERE status = ?', ['pending']);
  const userRows = await all('SELECT id, name, email, role, kyc_status, wallet_balance FROM users ORDER BY created_at DESC LIMIT 10');

  return res.json({
    totals: {
      users: Number(totals.users || 0),
      walletValue: Number(totals.walletValue || 0),
      transactionCount: Number(transactions.count || 0),
      transactionVolume: Number(transactions.volume || 0),
      pendingKyc: Number(pendingKyc.count || 0),
    },
    users: userRows.map((entry) => ({
      id: entry.id,
      name: entry.name,
      email: entry.email,
      role: entry.role,
      kycStatus: entry.kyc_status,
      walletBalance: Number(entry.wallet_balance || 0),
    })),
  });
});

app.get('/api/admin/kyc', authMiddleware, async (req, res) => {
  if ((req.user.role || 'customer') !== 'admin') {
    return res.status(403).json({ message: 'Admin access required.' });
  }

  const queue = await all(
    `SELECT k.*, u.name, u.email, u.role, u.wallet_balance
     FROM kyc_records k
     JOIN users u ON u.id = k.user_id
     ORDER BY k.updated_at DESC`
  );

  return res.json({
    kycQueue: queue.map((entry) => ({
      id: entry.id,
      userId: entry.user_id,
      name: entry.name,
      email: entry.email,
      role: entry.role,
      fullName: entry.full_name,
      bvn: entry.bvn,
      nin: entry.nin,
      documentType: entry.document_type,
      status: entry.status,
      reviewNotes: entry.review_notes,
      createdAt: entry.created_at,
      updatedAt: entry.updated_at,
      walletBalance: Number(entry.wallet_balance || 0),
    })),
  });
});

app.patch('/api/admin/kyc/:id', authMiddleware, async (req, res) => {
  if ((req.user.role || 'customer') !== 'admin') {
    return res.status(403).json({ message: 'Admin access required.' });
  }

  const { status, reviewNotes } = req.body;
  const allowedStatuses = ['pending', 'verified', 'rejected'];

  if (!allowedStatuses.includes(status)) {
    return res.status(400).json({ message: 'KYC status must be pending, verified, or rejected.' });
  }

  const record = await get('SELECT * FROM kyc_records WHERE id = ?', [req.params.id]);
  if (!record) {
    return res.status(404).json({ message: 'KYC record not found.' });
  }

  await run(
    'UPDATE kyc_records SET status = ?, review_notes = ?, updated_at = ? WHERE id = ?',
    [status, reviewNotes || '', new Date().toISOString(), record.id]
  );
  await run('UPDATE users SET kyc_status = ? WHERE id = ?', [status, record.user_id]);

  const updated = await get('SELECT * FROM kyc_records WHERE id = ?', [record.id]);
  return res.json({
    message: status === 'verified' ? 'KYC approved.' : 'KYC status updated.',
    kyc: updated,
  });
});

app.use((req, res) => {
  res.status(404).json({ message: 'Route not found.' });
});

const startServer = async (port = PORT) => {
  await initializeDatabase();
  return app.listen(port, () => {
    console.log(`WAOO PAY API running on http://localhost:${port}`);
  });
};

const isDirectRun = typeof process.argv[1] === 'string' && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
  startServer().catch((error) => {
    console.error('Failed to initialize database:', error);
    process.exit(1);
  });
} else {
  initializeDatabase().catch((error) => {
    console.error('Failed to initialize database:', error);
  });
}

export { app, startServer, initializeDatabase, closeDatabase };
