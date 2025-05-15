// tetris.js

// ── REFERENCES TO HTML ELEMENTS ────────────────────────────────────────────────
const startScreen = document.getElementById('start-screen');
const startButton = document.getElementById('start-button');
const canvas      = document.getElementById('tetris');
const context     = canvas.getContext('2d');
context.scale(20, 20);  // each block is 20×20px

// ── GAME STATE AND FLAGS ──────────────────────────────────────────────────────
let gameStarted  = false;
let lastTime     = 0;
let dropCounter  = 0;
let dropInterval = 980; // ms per drop, will speed up
let score        = 0;
let lines        = 0;

// ── COLORS FOR PIECES ─────────────────────────────────────────────────────────
const colors = [
  null,
  '#FF0D72', // T
  '#0DC2FF', // I
  '#0DFF72', // S
  '#F538FF', // Z
  '#FF8E0D', // L
  '#FFE138', // J
  '#3877FF', // O
];

// ── ARENA CREATION ────────────────────────────────────────────────────────────
function createMatrix(w, h) {
  const matrix = [];
  while (h--) {
    matrix.push(new Array(w).fill(0));
  }
  return matrix;
}

// Standard Tetris field: 10 cols × 20 rows
let arena = createMatrix(15, 30);

// ── PIECE FACTORY ──────────────────────────────────────────────────────────────
function createPiece(type) {
  switch (type) {
    case 'T': return [
      [0, 0, 0],
      [1, 1, 1],
      [0, 1, 0],
    ];
    case 'O': return [
      [2, 2],
      [2, 2],
    ];
    case 'L': return [
      [0, 3, 0],
      [0, 3, 0],
      [0, 3, 3],
    ];
    case 'J': return [
      [0, 4, 0],
      [0, 4, 0],
      [4, 4, 0],
    ];
    case 'I': return [
      [0, 5, 0, 0],
      [0, 5, 0, 0],
      [0, 5, 0, 0],
      [0, 5, 0, 0],
    ];
    case 'S': return [
      [0, 6, 6],
      [6, 6, 0],
      [0, 0, 0],
    ];
    case 'Z': return [
      [7, 7, 0],
      [0, 7, 7],
      [0, 0, 0],
    ];
  }
}

// ── COLLISION CHECK ───────────────────────────────────────────────────────────
function collide(arena, player) {
  const [m, o] = [player.matrix, player.pos];
  for (let y = 0; y < m.length; ++y) {
    for (let x = 0; x < m[y].length; ++x) {
      if (m[y][x] !== 0 &&
         (arena[y + o.y] && arena[y + o.y][x + o.x]) !== 0) {
        return true;
      }
    }
  }
  return false;
}

// ── MERGE PIECE INTO ARENA ────────────────────────────────────────────────────
function merge(arena, player) {
  player.matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value !== 0) {
        arena[y + player.pos.y][x + player.pos.x] = value;
      }
    });
  });
}

// ── CLEAR FULL LINES ──────────────────────────────────────────────────────────
function arenaSweep() {
  let rowCount = 0;
  outer: for (let y = arena.length - 1; y >= 0; --y) {
    for (let x = 0; x < arena[y].length; ++x) {
      if (arena[y][x] === 0) {
        continue outer;
      }
    }
    // Row is full
    const row = arena.splice(y, 1)[0].fill(0);
    arena.unshift(row);
    ++y;
    ++rowCount;
  }
  if (rowCount > 0) {
    lines += rowCount;
    score += rowCount * 100;
  }
}

// ── PLAYER OBJECT ─────────────────────────────────────────────────────────────
const player = {
  pos:    { x: 0, y: 0 },
  matrix: null,
};

function playerReset() {
  const pieces = 'ILJOTSZ';
  player.matrix = createPiece(
    pieces[(pieces.length * Math.random()) | 0]
  );
  player.pos.y = 0;
  player.pos.x = ((arena[0].length / 2) | 0) -
                 ((player.matrix[0].length / 2) | 0);
  if (collide(arena, player)) {
    // Game over
    arena.forEach(row => row.fill(0));
    updateCanvas();
    sendResultsToQualtrics(score, lines);
  }
}

function playerDrop() {
  player.pos.y++;
  dropCounter = 0;
  if (collide(arena, player)) {
    player.pos.y--;
    merge(arena, player);
    arenaSweep();
    playerReset();
  }
}

// ── DRAWING FUNCTIONS ─────────────────────────────────────────────────────────
function drawMatrix(matrix, offset) {
  matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value !== 0) {
        context.fillStyle = colors[value];
        context.fillRect(x + offset.x, y + offset.y, 1, 1);
      }
    });
  });
}

function updateCanvas() {
  context.fillStyle = '#000';
  context.fillRect(0, 0, canvas.width / 20, canvas.height / 20);
  drawMatrix(arena, { x: 0, y: 0 });
  drawMatrix(player.matrix, player.pos);
}

// ── MAIN UPDATE LOOP ─────────────────────────────────────────────────────────
function update(time = 0) {
  if (!gameStarted) return;  // wait for start
  const deltaTime = time - lastTime;
  lastTime = time;
  dropCounter += deltaTime;
  if (dropCounter > dropInterval) {
    playerDrop();
  }
  updateCanvas();
  requestAnimationFrame(update);
}

// ── SPEED INCREASE EVERY 20s ─────────────────────────────────────────────────
setInterval(() => {
  dropInterval = Math.max(100, dropInterval - 33);
}, 20000);

// ── INPUT HANDLING ─────────────────────────────────────────────────────────────
document.addEventListener('keydown', event => {
  if (!gameStarted) return;
  if (event.key === 'ArrowLeft') {
    player.pos.x--;
    if (collide(arena, player)) player.pos.x++;
  } else if (event.key === 'ArrowRight') {
    player.pos.x++;
    if (collide(arena, player)) player.pos.x--;
  } else if (event.key === 'ArrowDown') {
    playerDrop();
  } else if (event.key === ' ' || event.key === 'ArrowUp') {
    rotate(player.matrix);
  }
});

// ── PIECE ROTATION ─────────────────────────────────────────────────────────────
function rotate(matrix) {
  for (let y = 0; y < matrix.length; ++y) {
    for (let x = 0; x < y; ++x) {
      [ matrix[x][y], matrix[y][x] ] =
      [ matrix[y][x], matrix[x][y] ];
    }
  }
  matrix.reverse();
}

// ── COMMUNICATE WITH QUALTRICS ─────────────────────────────────────────────────
function sendResultsToQualtrics(finalScore, totalLines) {
  parent.postMessage({ score: finalScore, lines: totalLines }, '*');
}

// ── START BUTTON HANDLING ─────────────────────────────────────────────────────
startButton.addEventListener('click', () => {
  gameStarted = true;
  startScreen.style.display = 'none';
  score = 0;
  lines = 0;
  arena = createMatrix(15, 30);
  playerReset();
  lastTime = performance.now();
  update(lastTime);
});
