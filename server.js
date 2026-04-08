const express = require('express');
const session = require('express-session');
const path = require('path');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const db = require('./data/db');
const { requireAuth, requireAdmin } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_CODE = process.env.ADMIN_CODE || 'Pakistan786';

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: process.env.SESSION_SECRET || 'lolzcrash-secret-key-2024',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, maxAge: 7 * 24 * 60 * 60 * 1000 }
}));

// Serve HTML pages
const sendPage = (res, page) => res.sendFile(path.join(__dirname, 'public', page));

app.get('/', (req, res) => sendPage(res, 'index.html'));
app.get('/login', (req, res) => sendPage(res, 'login.html'));
app.get('/signup', (req, res) => sendPage(res, 'signup.html'));
app.get('/dashboard', requireAuth, (req, res) => sendPage(res, 'dashboard.html'));
app.get('/deposit', requireAuth, (req, res) => sendPage(res, 'deposit.html'));
app.get('/withdraw', requireAuth, (req, res) => sendPage(res, 'withdraw.html'));
app.get('/support', (req, res) => sendPage(res, 'support.html'));
app.get('/faq', (req, res) => sendPage(res, 'faq.html'));
app.get('/admin/login', (req, res) => sendPage(res, 'admin-login.html'));
app.get('/admin', requireAdmin, (req, res) => sendPage(res, 'admin.html'));

// ===== AUTH ROUTES =====
app.post('/api/signup', async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) return res.json({ success: false, msg: 'All fields required' });
  const users = db.read('users');
  if (users.find(u => u.email === email || u.username === username))
    return res.json({ success: false, msg: 'User already exists' });
  const hash = await bcrypt.hash(password, 10);
  const bonus = Math.floor(Math.random() * 11) + 10; // 10-20 PKR
  const user = { id: uuidv4(), username, email, password: hash, balance: bonus, createdAt: new Date().toISOString(), welcomeBonus: bonus };
  users.push(user);
  db.write('users', users);
  req.session.userId = user.id;
  req.session.username = user.username;
  res.json({ success: true, msg: `Welcome! You got ${bonus} PKR bonus!`, bonus });
});

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  const users = db.read('users');
  const user = users.find(u => u.email === email);
  if (!user) return res.json({ success: false, msg: 'Invalid credentials' });
  const match = await bcrypt.compare(password, user.password);
  if (!match) return res.json({ success: false, msg: 'Invalid credentials' });
  req.session.userId = user.id;
  req.session.username = user.username;
  res.json({ success: true, msg: 'Logged in!' });
});

app.post('/api/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

app.get('/api/me', requireAuth, (req, res) => {
  const users = db.read('users');
  const user = users.find(u => u.id === req.session.userId);
  if (!user) return res.json({ success: false });
  const { password, ...safe } = user;
  res.json({ success: true, user: safe });
});

// ===== GAME ROUTES =====
app.post('/api/bet/cashout', requireAuth, (req, res) => {
  const { betAmount, multiplier } = req.body;
  const amount = parseFloat(betAmount);
  const multi = parseFloat(multiplier);
  if (!amount || amount <= 0 || !multi) return res.json({ success: false, msg: 'Invalid bet' });
  const users = db.read('users');
  const idx = users.findIndex(u => u.id === req.session.userId);
  if (idx === -1) return res.json({ success: false });
  if (users[idx].balance < amount) return res.json({ success: false, msg: 'Insufficient balance' });
  const winnings = parseFloat((amount * multi).toFixed(2));
  users[idx].balance = parseFloat((users[idx].balance - amount + winnings).toFixed(2));
  const bets = db.read('bets');
  bets.push({ id: uuidv4(), userId: req.session.userId, username: users[idx].username, amount, multiplier: multi, won: true, profit: parseFloat((winnings - amount).toFixed(2)), createdAt: new Date().toISOString() });
  db.write('users', users);
  db.write('bets', bets);
  res.json({ success: true, balance: users[idx].balance, winnings });
});

app.post('/api/bet/lost', requireAuth, (req, res) => {
  const { betAmount } = req.body;
  const amount = parseFloat(betAmount);
  if (!amount || amount <= 0) return res.json({ success: false });
  const users = db.read('users');
  const idx = users.findIndex(u => u.id === req.session.userId);
  if (idx === -1) return res.json({ success: false });
  if (users[idx].balance < amount) return res.json({ success: false, msg: 'Insufficient balance' });
  users[idx].balance = parseFloat((users[idx].balance - amount).toFixed(2));
  const bets = db.read('bets');
  bets.push({ id: uuidv4(), userId: req.session.userId, username: users[idx].username, amount, multiplier: 0, won: false, profit: -amount, createdAt: new Date().toISOString() });
  db.write('users', users);
  db.write('bets', bets);
  res.json({ success: true, balance: users[idx].balance });
});

// ===== DEPOSIT ROUTES =====
app.post('/api/deposit', requireAuth, (req, res) => {
  const { amount, method, txId } = req.body;
  if (!amount || !method || !txId) return res.json({ success: false, msg: 'All fields required' });
  if (parseFloat(amount) < 100) return res.json({ success: false, msg: 'Minimum deposit is 100 PKR' });
  const deposits = db.read('deposits');
  if (deposits.find(d => d.txId === txId)) return res.json({ success: false, msg: 'Transaction ID already used' });
  deposits.push({ id: uuidv4(), userId: req.session.userId, username: req.session.username, amount: parseFloat(amount), method, txId, status: 'pending', createdAt: new Date().toISOString() });
  db.write('deposits', deposits);
  res.json({ success: true, msg: 'Deposit request submitted! Admin will approve shortly.' });
});

// ===== WITHDRAWAL ROUTES =====
app.post('/api/withdraw', requireAuth, (req, res) => {
  const { amount, method, accountNumber } = req.body;
  const amt = parseFloat(amount);
  if (!amt || amt < 500) return res.json({ success: false, msg: 'Minimum withdrawal is 500 PKR' });
  if (!method || !accountNumber) return res.json({ success: false, msg: 'All fields required' });
  const users = db.read('users');
  const user = users.find(u => u.id === req.session.userId);
  if (!user || user.balance < amt) return res.json({ success: false, msg: 'Insufficient balance' });
  const withdrawals = db.read('withdrawals');
  withdrawals.push({ id: uuidv4(), userId: req.session.userId, username: req.session.username, amount: amt, method, accountNumber, status: 'pending', createdAt: new Date().toISOString() });
  db.write('withdrawals', withdrawals);
  res.json({ success: true, msg: 'Withdrawal request submitted! Processing within 24 hours.' });
});

// ===== SUPPORT ROUTES =====
app.post('/api/support', (req, res) => {
  const { name, email, message } = req.body;
  if (!name || !email || !message) return res.json({ success: false, msg: 'All fields required' });
  const support = db.read('support');
  support.push({ id: uuidv4(), name, email, message, userId: req.session?.userId || null, status: 'open', reply: null, createdAt: new Date().toISOString() });
  db.write('support', support);
  res.json({ success: true, msg: 'Message sent! We will reply within 24 hours.' });
});

// ===== LIVE FEED =====
app.get('/api/live-feed', (req, res) => {
  const bets = db.read('bets');
  const recent = bets.slice(-20).reverse();
  res.json({ success: true, bets: recent });
});

// ===== ADMIN ROUTES =====
app.post('/api/admin/login', (req, res) => {
  const { code } = req.body;
  if (code === ADMIN_CODE) {
    req.session.isAdmin = true;
    return res.json({ success: true });
  }
  res.json({ success: false, msg: 'Invalid admin code' });
});

app.get('/api/admin/stats', requireAdmin, (req, res) => {
  const users = db.read('users');
  const deposits = db.read('deposits');
  const withdrawals = db.read('withdrawals');
  const support = db.read('support');
  res.json({
    users: users.map(({ password, ...u }) => u),
    deposits,
    withdrawals,
    support,
    stats: {
      totalUsers: users.length,
      pendingDeposits: deposits.filter(d => d.status === 'pending').length,
      pendingWithdrawals: withdrawals.filter(w => w.status === 'pending').length,
      openTickets: support.filter(s => s.status === 'open').length
    }
  });
});

app.post('/api/admin/deposit/:id', requireAdmin, (req, res) => {
  const { action } = req.body;
  const deposits = db.read('deposits');
  const idx = deposits.findIndex(d => d.id === req.params.id);
  if (idx === -1) return res.json({ success: false });
  deposits[idx].status = action;
  if (action === 'approved') {
    const users = db.read('users');
    const uidx = users.findIndex(u => u.id === deposits[idx].userId);
    if (uidx !== -1) {
      users[uidx].balance = parseFloat((users[uidx].balance + deposits[idx].amount).toFixed(2));
      db.write('users', users);
    }
  }
  db.write('deposits', deposits);
  res.json({ success: true });
});

app.post('/api/admin/withdrawal/:id', requireAdmin, (req, res) => {
  const { action } = req.body;
  const withdrawals = db.read('withdrawals');
  const idx = withdrawals.findIndex(w => w.id === req.params.id);
  if (idx === -1) return res.json({ success: false });
  withdrawals[idx].status = action;
  if (action === 'approved') {
    const users = db.read('users');
    const uidx = users.findIndex(u => u.id === withdrawals[idx].userId);
    if (uidx !== -1) {
      users[uidx].balance = parseFloat((users[uidx].balance - withdrawals[idx].amount).toFixed(2));
      db.write('users', users);
    }
  }
  db.write('withdrawals', withdrawals);
  res.json({ success: true });
});

app.post('/api/admin/balance', requireAdmin, (req, res) => {
  const { userId, amount, action } = req.body;
  const users = db.read('users');
  const idx = users.findIndex(u => u.id === userId);
  if (idx === -1) return res.json({ success: false });
  const amt = parseFloat(amount);
  if (action === 'add') users[idx].balance = parseFloat((users[idx].balance + amt).toFixed(2));
  else users[idx].balance = Math.max(0, parseFloat((users[idx].balance - amt).toFixed(2)));
  db.write('users', users);
  res.json({ success: true, balance: users[idx].balance });
});

app.post('/api/admin/support/:id/reply', requireAdmin, (req, res) => {
  const { reply } = req.body;
  const support = db.read('support');
  const idx = support.findIndex(s => s.id === req.params.id);
  if (idx === -1) return res.json({ success: false });
  support[idx].reply = reply;
  support[idx].status = 'replied';
  db.write('support', support);
  res.json({ success: true });
});

app.listen(PORT, () => console.log(`LolzCrash running on http://localhost:${PORT}`));

// User transaction history
app.get('/api/my-deposits', requireAuth, (req, res) => {
  const deposits = db.read('deposits').filter(d => d.userId === req.session.userId);
  const withdrawals = db.read('withdrawals').filter(w => w.userId === req.session.userId);
  res.json({ success: true, deposits, withdrawals });
});
