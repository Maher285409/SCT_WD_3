/* =============================================
   THEME TOGGLE
============================================= */
let isDark = false;

function toggleTheme() {
  isDark = !isDark;
  document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
  document.getElementById('themeIcon').textContent = isDark ? '☀️' : '🌙';
}

/* =============================================
   SCREEN NAVIGATION
============================================= */
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  if (id === 'game')    initBoard();
  if (id === 'landing') buildHeroBoard();
}

/* =============================================
   LANDING — HERO BOARD (static preview)
============================================= */
const HERO_PATTERN = [
  { dk: true  },
  { dk: true  },
  { dk: true  },
  { dk: true,  sym: 'x' },
  { dk: false, sym: 'o' },
  { dk: true  },
  { dk: true  },
  { dk: true,  sym: 'x' },
  { dk: true  },
  { dk: true  },
  { dk: true  },
  { dk: true,  sym: 'x' },
  { dk: true,  sym: 'o' },
  { dk: true  },
  { dk: true  },
  { dk: true  },
];

function buildHeroBoard() {
  const el = document.getElementById('heroBoardEl');
  el.innerHTML = '';
  HERO_PATTERN.forEach(p => {
    const cell = document.createElement('div');
    cell.className = 'hero-cell' + (p.dk ? ' dk' : '');
    if (p.sym === 'o') cell.classList.add('has-o');
    if (p.sym === 'x') cell.classList.add('has-x');
    el.appendChild(cell);
  });
}

/* =============================================
   MODE SELECTION
============================================= */
let gameMode = 'human';

function chooseMode(mode, el) {
  gameMode = mode;

  // deselect all
  document.querySelectorAll('.mode-card').forEach(c => c.classList.remove('selected'));
  el.classList.add('selected');

  // enable play button
  const btn = document.getElementById('playBtn');
  btn.classList.add('ready');
  btn.textContent = 'Play Game →';
  btn.disabled = false;
}

function startGame() {
  if (!document.querySelector('.mode-card.selected')) return;
  showScreen('game');
}

/* =============================================
   GAME STATE
============================================= */
const GRID = 16; // 4×4

let board    = [];
let current  = 'O';
let active   = false;
let history  = [];
let wins     = 0;
let losses   = 0;

function initBoard() {
  board   = Array(GRID).fill('');
  current = 'O';
  active  = true;
  history = [];

  document.getElementById('winOverlay').classList.remove('show');
  renderBoard();
  setStatus();
  updateChips();
}

/* =============================================
   RENDER BOARD
============================================= */
function renderBoard() {
  const el = document.getElementById('gameBoard');
  el.innerHTML = '';

  board.forEach((val, i) => {
    const cell = document.createElement('div');
    cell.className = 'gcell' + (i % 2 !== 0 ? ' dk' : '') + (val ? ' taken' : '');
    if (val === 'O') cell.classList.add('has-o');
    if (val === 'X') cell.classList.add('has-x');
    cell.addEventListener('click', () => makeMove(i));
    el.appendChild(cell);
  });
}

/* =============================================
   PLAYER MOVE
============================================= */
function makeMove(index) {
  if (!active || board[index] !== '') return;
  if (gameMode === 'ai' && current === 'X') return; // block user during AI turn

  placeToken(index, current);

  if (checkWin()) {
    endGame(current);
    return;
  }
  if (!board.includes('')) {
    endGame(null);
    return;
  }

  current = current === 'O' ? 'X' : 'O';
  setStatus();
  updateChips();

  if (gameMode === 'ai' && current === 'X' && active) {
    setTimeout(aiMove, 480);
  }
}

function placeToken(index, player) {
  board[index] = player;
  history.push({ index, player });
  renderBoard();

  // pop animation on the placed cell
  const cells = document.querySelectorAll('.gcell');
  if (cells[index]) cells[index].classList.add('pop');
}

/* =============================================
   AI — MINIMAX-LITE (block + win priority)
============================================= */
function aiMove() {
  if (!active) return;
  const move = bestMove();
  placeToken(move, 'X');

  if (checkWin()) {
    endGame('X');
    return;
  }
  if (!board.includes('')) {
    endGame(null);
    return;
  }

  current = 'O';
  setStatus();
  updateChips();
}

function bestMove() {
  // 1. Can AI win now?
  for (let i = 0; i < GRID; i++) {
    if (!board[i]) {
      board[i] = 'X';
      if (checkWin()) { board[i] = ''; return i; }
      board[i] = '';
    }
  }
  // 2. Block human win
  for (let i = 0; i < GRID; i++) {
    if (!board[i]) {
      board[i] = 'O';
      if (checkWin()) { board[i] = ''; return i; }
      board[i] = '';
    }
  }
  // 3. Prefer center-ish cells
  const preferred = [5, 6, 9, 10, 0, 3, 12, 15, 1, 2, 4, 7, 8, 11, 13, 14];
  for (const p of preferred) {
    if (!board[p]) return p;
  }
  return board.findIndex(v => !v);
}

/* =============================================
   WIN DETECTION  (3-in-a-row on 4×4)
============================================= */
function getWinPatterns() {
  const patterns = [];
  // rows
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c <= 1; c++) {
      patterns.push([r * 4 + c, r * 4 + c + 1, r * 4 + c + 2]);
    }
  }
  // cols
  for (let c = 0; c < 4; c++) {
    for (let r = 0; r <= 1; r++) {
      patterns.push([r * 4 + c, (r + 1) * 4 + c, (r + 2) * 4 + c]);
    }
  }
  // diagonals top-left → bottom-right
  for (let r = 0; r <= 1; r++) {
    for (let c = 0; c <= 1; c++) {
      patterns.push([r * 4 + c, (r + 1) * 4 + c + 1, (r + 2) * 4 + c + 2]);
    }
  }
  // diagonals top-right → bottom-left
  for (let r = 0; r <= 1; r++) {
    for (let c = 2; c < 4; c++) {
      patterns.push([r * 4 + c, (r + 1) * 4 + c - 1, (r + 2) * 4 + c - 2]);
    }
  }
  return patterns;
}

function checkWin() {
  const cells = document.querySelectorAll('.gcell');
  for (const [a, b, c] of getWinPatterns()) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      // highlight winning cells
      [a, b, c].forEach(idx => cells[idx] && cells[idx].classList.add('win-cell'));
      return true;
    }
  }
  return false;
}

/* =============================================
   END GAME
============================================= */
function endGame(winner) {
  active = false;

  const overlay = document.getElementById('winOverlay');
  const badge   = document.getElementById('winBadge');
  const msg     = document.getElementById('winMsg');
  const sub     = document.getElementById('winSub');

  if (winner === 'O') {
    wins = Math.min(wins + 1, 3);
    badge.textContent = '🏆 You Win!';
    msg.textContent   = '🎉 O Wins!';
    sub.textContent   = gameMode === 'ai' ? 'You outsmarted the AI!' : 'Player O takes the round!';
  } else if (winner === 'X') {
    losses = Math.min(losses + 1, 3);
    badge.textContent = gameMode === 'ai' ? '🤖 AI Wins' : '🥇 X Wins';
    msg.textContent   = '🤖 X Wins!';
    sub.textContent   = gameMode === 'ai' ? 'The AI is too clever!' : 'Player X takes the round!';
  } else {
    badge.textContent = "🤝 Draw";
    msg.textContent   = "It's a Draw!";
    sub.textContent   = 'Perfectly balanced!';
  }

  updateScores();
  setTimeout(() => overlay.classList.add('show'), 700);
}

/* =============================================
   SCORE DISPLAY
============================================= */
function updateScores() {
  document.querySelectorAll('#winsEl .sc-o').forEach((el, i) => {
    el.classList.toggle('filled', i < wins);
  });
  document.querySelectorAll('#lossEl .sc-x').forEach((el, i) => {
    el.classList.toggle('filled', i < losses);
  });
}

/* =============================================
   STATUS + CHIPS
============================================= */
function setStatus() {
  document.getElementById('statusBar').textContent =
    current === 'O' ? "Player O's Turn" : "Player X's Turn";
}

function updateChips() {
  document.getElementById('chipO').classList.toggle('active', current === 'O');
  document.getElementById('chipX').classList.toggle('active', current === 'X');
}

/* =============================================
   CONTROLS
============================================= */
function undoMove() {
  if (!active || history.length === 0) return;

  if (gameMode === 'ai') {
    // Undo both AI and player move together
    if (history.length >= 2) {
      const m2 = history.pop(); board[m2.index] = '';
      const m1 = history.pop(); board[m1.index] = '';
      current = 'O';
    } else {
      const m = history.pop(); board[m.index] = ''; current = m.player;
    }
  } else {
    const m = history.pop(); board[m.index] = ''; current = m.player;
  }

  renderBoard();
  setStatus();
  updateChips();
}

function resetGame() {
  wins   = 0;
  losses = 0;
  updateScores();
  initBoard();
}

function skipTurn() {
  if (!active) return;
  current = current === 'O' ? 'X' : 'O';
  setStatus();
  updateChips();
  if (gameMode === 'ai' && current === 'X') {
    setTimeout(aiMove, 480);
  }
}

/* =============================================
   CHERRY BLOSSOM PETALS
============================================= */
function spawnPetals() {
  const container = document.getElementById('petals');
  const colors    = [
    'var(--petal-1)', 'var(--petal-2)', 'var(--petal-3)',
    'var(--petal-4)', 'var(--petal-5)', 'var(--petal-6)',
  ];

  for (let i = 0; i < 24; i++) {
    const petal = document.createElement('div');
    petal.className = 'petal';

    const size = 8 + Math.random() * 9;
    petal.style.cssText = [
      `left: ${Math.random() * 100}%`,
      `width: ${size}px`,
      `height: ${size * 1.3}px`,
      `background: ${colors[Math.floor(Math.random() * colors.length)]}`,
      `animation-duration: ${5 + Math.random() * 9}s`,
      `animation-delay: ${-Math.random() * 12}s`,
      `transform: rotate(${Math.random() * 360}deg)`,
    ].join(';');

    container.appendChild(petal);
  }
}

/* =============================================
   INIT
============================================= */
spawnPetals();
buildHeroBoard();
