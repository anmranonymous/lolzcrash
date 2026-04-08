// ============ CRASH GAME ENGINE ============
const canvas = document.getElementById('crashCanvas');
const ctx = canvas.getContext('2d');
const multEl = document.getElementById('multiplierDisplay');
const multValue = document.getElementById('multValue');
const cashoutBtn = document.getElementById('cashoutBtn');
const placeBetBtn = document.getElementById('placeBetBtn');
const betInput = document.getElementById('betAmount');
const autoCashoutInput = document.getElementById('autoCashout');

let gameState = 'waiting'; // waiting, running, crashed
let currentMult = 1.0;
let crashPoint = 1.0;
let animFrame = null;
let startTime = null;
let userBetActive = false;
let userBetAmount = 0;
let waitTimer = null;
let points = [];
let countdownVal = 5;
let countdownInterval = null;

const FAKE_USERS = ['Ali_007', 'ZaraW', 'CryptoKing', 'MoonShot', 'LahoriPro', 'Hamza_X', 'RizwanBet', 'SaraWins', 'FaisalK', 'UmarBig', 'NomiPK', 'ShahidG'];

// Generate crash point with house edge
function generateCrashPoint() {
  const r = Math.random();
  if (r < 0.4) return 1.0 + Math.random() * 0.5; // 40% crash below 1.5x
  if (r < 0.7) return 1.5 + Math.random() * 1.5;  // 30% 1.5x-3x
  if (r < 0.88) return 3 + Math.random() * 5;      // 18% 3x-8x
  if (r < 0.96) return 8 + Math.random() * 12;     // 8%  8x-20x
  return 20 + Math.random() * 80;                   // 4%  20x-100x
}

// Multiplier growth formula
function calcMultiplier(elapsed) {
  return Math.pow(Math.E, elapsed * 0.00006);
}

// Resize canvas
function resizeCanvas() {
  const rect = canvas.parentElement.getBoundingClientRect();
  canvas.width = rect.width;
  canvas.height = 320;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// Draw crash graph
function drawGraph() {
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);

  // Grid
  ctx.strokeStyle = 'rgba(0,229,255,0.04)';
  ctx.lineWidth = 1;
  for (let i = 0; i < W; i += 60) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, H); ctx.stroke(); }
  for (let i = 0; i < H; i += 50) { ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(W, i); ctx.stroke(); }

  if (points.length < 2) return;

  const maxMult = Math.max(currentMult, 2);
  const scaleX = (W - 60) / Math.max(points.length, 1);
  const scaleY = (H - 40) / (maxMult - 1);

  const crashed = gameState === 'crashed';
  const lineColor = crashed ? '#ff3d71' : '#00e5ff';
  const glowColor = crashed ? 'rgba(255,61,113,0.3)' : 'rgba(0,229,255,0.3)';

  // Fill area
  ctx.beginPath();
  ctx.moveTo(40, H - 20);
  points.forEach((p, i) => {
    const x = 40 + i * scaleX;
    const y = H - 20 - (p - 1) * scaleY;
    if (i === 0) ctx.lineTo(x, y); else ctx.lineTo(x, y);
  });
  ctx.lineTo(40 + (points.length - 1) * scaleX, H - 20);
  ctx.closePath();
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, glowColor);
  grad.addColorStop(1, 'transparent');
  ctx.fillStyle = grad;
  ctx.fill();

  // Line
  ctx.beginPath();
  ctx.strokeStyle = lineColor;
  ctx.lineWidth = 3;
  ctx.shadowBlur = 10;
  ctx.shadowColor = lineColor;
  points.forEach((p, i) => {
    const x = 40 + i * scaleX;
    const y = H - 20 - (p - 1) * scaleY;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  });
  ctx.stroke();
  ctx.shadowBlur = 0;

  // Dot at tip
  if (points.length > 0) {
    const lx = 40 + (points.length - 1) * scaleX;
    const ly = H - 20 - (points[points.length - 1] - 1) * scaleY;
    ctx.beginPath();
    ctx.arc(lx, ly, 5, 0, Math.PI * 2);
    ctx.fillStyle = lineColor;
    ctx.shadowBlur = 15;
    ctx.shadowColor = lineColor;
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  // Y-axis labels
  ctx.fillStyle = 'rgba(122,154,191,0.7)';
  ctx.font = '11px Share Tech Mono';
  for (let m = 1; m <= Math.ceil(maxMult); m++) {
    const y = H - 20 - (m - 1) * scaleY;
    if (y > 0 && y < H) { ctx.fillText(m.toFixed(1) + 'x', 2, y + 4); }
  }
}

// Start game loop
function startRound() {
  crashPoint = generateCrashPoint();
  startTime = performance.now();
  points = [1.0];
  gameState = 'running';
  multEl.classList.remove('crashed');
  multValue.textContent = '1.00x';
  document.getElementById('roundStatus').textContent = '🟢 LIVE';
  cashoutBtn.disabled = !userBetActive;
  placeBetBtn.disabled = true;
  placeBetBtn.textContent = '⏳ In Progress...';
  spawnFakeBets();

  function loop(ts) {
    const elapsed = ts - startTime;
    currentMult = calcMultiplier(elapsed);
    if (currentMult >= crashPoint) {
      currentMult = crashPoint;
      points.push(currentMult);
      drawGraph();
      crashRound();
      return;
    }
    points.push(currentMult);
    drawGraph();

    // Auto cashout
    const autoVal = parseFloat(autoCashoutInput?.value);
    if (userBetActive && autoVal > 0 && currentMult >= autoVal) {
      doCashout();
    }

    multValue.textContent = currentMult.toFixed(2) + 'x';
    if (currentMult >= 10) multValue.style.color = '#ffd700';
    else if (currentMult >= 3) multValue.style.color = '#39ff14';
    else multValue.style.color = '#00e5ff';

    animFrame = requestAnimationFrame(loop);
  }
  animFrame = requestAnimationFrame(loop);
}

function crashRound() {
  gameState = 'crashed';
  multEl.classList.add('crashed');
  multValue.textContent = crashPoint.toFixed(2) + 'x';
  multValue.style.color = '#ff3d71';
  document.getElementById('roundStatus').textContent = '🔴 CRASHED';

  if (userBetActive) {
    userBetActive = false;
    cashoutBtn.disabled = true;
    const loss = userBetAmount;
    api('/api/bet/lost', 'POST', { betAmount: loss });
    toast(`💥 Crashed at ${crashPoint.toFixed(2)}x! Lost ₨${loss}`, 'error');
    refreshBalance();
  }

  addToHistory(crashPoint);
  placeBetBtn.disabled = false;
  placeBetBtn.textContent = '🎯 Place Bet';

  clearTimeout(waitTimer);
  startCountdown();
}

function startCountdown() {
  countdownVal = 5;
  const statusEl = document.getElementById('roundStatus');
  clearInterval(countdownInterval);
  countdownInterval = setInterval(() => {
    statusEl.textContent = `⏳ Next round in ${countdownVal}s`;
    countdownVal--;
    if (countdownVal < 0) {
      clearInterval(countdownInterval);
      startRound();
    }
  }, 1000);
}

async function doCashout() {
  if (!userBetActive || gameState !== 'running') return;
  userBetActive = false;
  cashoutBtn.disabled = true;
  const mult = parseFloat(currentMult.toFixed(2));
  const winnings = parseFloat((userBetAmount * mult).toFixed(2));
  const profit = parseFloat((winnings - userBetAmount).toFixed(2));
  const data = await api('/api/bet/cashout', 'POST', { betAmount: userBetAmount, multiplier: mult });
  if (data.success) {
    toast(`🚀 Cashed out at ${mult}x! +₨${profit.toFixed(2)}`, 'success');
    const balEl = document.getElementById('nav-balance');
    if (balEl) balEl.textContent = `₨ ${data.balance.toFixed(2)}`;
    multEl.classList.add('cashout-anim');
    setTimeout(() => multEl.classList.remove('cashout-anim'), 400);
  } else {
    toast(data.msg || 'Error', 'error');
  }
}

cashoutBtn?.addEventListener('click', doCashout);

placeBetBtn?.addEventListener('click', async () => {
  const amt = parseFloat(betInput.value);
  if (!amt || amt <= 0) return toast('Enter a valid bet amount', 'error');
  if (amt < 1) return toast('Minimum bet is ₨1', 'error');
  if (gameState === 'running') return toast('Wait for next round!', 'error');

  const data = await api('/api/me');
  if (!data.success) return window.location.href = '/login';
  if (data.user.balance < amt) return toast('Insufficient balance!', 'error');

  userBetAmount = amt;
  userBetActive = true;
  cashoutBtn.disabled = false;
  toast(`Bet placed: ₨${amt} — Good luck!`, 'info');
});

// Quick bet buttons
document.querySelectorAll('.quick-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    betInput.value = btn.dataset.amount;
  });
});

// HISTORY
const historyData = [];
function addToHistory(val) {
  historyData.unshift(val);
  if (historyData.length > 12) historyData.pop();
  renderHistory();
}

function renderHistory() {
  const el = document.getElementById('historyGrid');
  if (!el) return;
  el.innerHTML = historyData.map(v => {
    const cls = v >= 5 ? 'high' : v >= 2 ? 'mid' : 'low';
    return `<span class="history-pill ${cls}">${v.toFixed(2)}x</span>`;
  }).join('');
}

// FAKE LIVE FEED
const fakeNames = ['Ali', 'Zara', 'Hamza', 'Sara', 'Rizwan', 'Nomi', 'Farrukh', 'Ayesha', 'Bilal', 'Hina', 'Umar', 'Kiran', 'Tariq', 'Sadia'];

function randomFakeBet() {
  const name = fakeNames[Math.floor(Math.random() * fakeNames.length)] + Math.floor(Math.random() * 99);
  const amt = [10, 20, 50, 100, 200, 500][Math.floor(Math.random() * 6)];
  const won = Math.random() > 0.4;
  const mult = won ? (1.1 + Math.random() * 4).toFixed(2) : null;
  return { username: name, amount: amt, won, multiplier: mult };
}

function addFeedItem(bet) {
  const list = document.getElementById('feedList');
  if (!list) return;
  const el = document.createElement('div');
  el.className = `feed-item ${bet.won ? 'win' : 'loss'}`;
  el.innerHTML = `
    <span class="feed-user">👤 ${bet.username}</span>
    <span class="feed-amount" style="color:var(--text-dim)">₨${bet.amount}</span>
    <span class="feed-multi ${bet.won ? 'win-text' : 'loss-text'}">${bet.won ? `${bet.multiplier}x ✓` : 'BUST ✗'}</span>
  `;
  list.prepend(el);
  if (list.children.length > 15) list.lastChild?.remove();
}

function spawnFakeBets() {
  const count = Math.floor(Math.random() * 4) + 2;
  for (let i = 0; i < count; i++) {
    setTimeout(() => addFeedItem(randomFakeBet()), i * 300 + Math.random() * 500);
  }
}

// Seed initial history
[2.41, 1.02, 5.67, 1.33, 3.12, 8.54, 1.01, 2.08].forEach(addToHistory);
// Seed fake feed
for (let i = 0; i < 6; i++) setTimeout(() => addFeedItem(randomFakeBet()), i * 200);

// Init
startCountdown();
