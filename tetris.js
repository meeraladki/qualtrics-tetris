// tetris.js

// ── SETUP ───────────────────────────────────────────────────────────────────────
const canvas  = document.getElementById('tetris');
const context = canvas.getContext('2d');
context.scale(20, 20);  // each “block” is 20×20px

// colors for each piece type (0 is empty)
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

// the playfield matrix (rows × cols)
function createMatrix(w, h) {
  const m = [];
  while (h--) {
    m.push(new Array(w).fill(0));
  }
  return m;
}

let arena = createMatrix(15, 30);

// ── PIECE FACTORY ────────────────────────────────────────────────────────────────
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

// ── COLLISION & MERGE ────────────────────────────────────────────────────────────
function collide(arena, player) {
  const [m, o] = [player.matrix, player.pos];
  for (let y = 0; y < m.length; ++y) {
    for (let x = 0; x < m[y].length; ++x) {
      if (
        m[y][x] !== 0 &&
        (arena[y + o.y] && arena[y + o.y][x + o.x]) !== 0
      ) {
        return true;
      }
    }
  }
  return false;
}

function merge(arena, player) {
  player.matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value !== 0) {
        arena[y + player.pos.y][x + player.pos.x] = value;
      }
    });
  });
}

// ── LINE CLEAR ───────────────────────────────────────────────────────────────────
function arenaSweep() {
  let rowCount = 0;
  outer: for (let y = arena.length - 1; y >= 0; --y) {
    for (let x = 0; x < arena[y].length; ++x) {
      if (arena[y][x] === 0) {
        continue outer;
      }
    }
    // full row
    const row = arena.splice(y, 1)[0].fill(0);
    arena.unshift(row);
    ++y;
    ++rowCount;
  }
  if (rowCount > 0) {
    lines += rowCount;
    // scoring: e.g. 100 points per line
    score += rowCount * 100;
  }
}

// ── PLAYER SETUP ────────────────────────────────────────────────────────────────
const player = {
  pos:   { x: 0, y: 0 },
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
    // game over
    arena.forEach(row => row.fill(0));
    updateCanvas(); // draw cleared field
    sendResultsToQualtrics(score, lines);
    return;
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

// ── DRAWING ─────────────────────────────────────────────────────────────────────
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
  context.fillRect(0, 0, canvas.width, canvas.height);
  drawMatrix(arena, { x: 0, y: 0 });
  drawMatrix(player.matrix, player.pos);
}

// ── GAME LOOP ──────────────────────────────────────────────────────────────────
let dropCounter = 0;
let dropInterval = 980;  // start at 980 ms per line
let lastTime = 0;
let score = 0;
let lines = 0;

function update(time = 0) {
  const deltaTime = time - lastTime;
  lastTime = time;
  dropCounter += deltaTime;
  if (dropCounter > dropInterval) {
    playerDrop();
  }
  updateCanvas();
  requestAnimationFrame(update);
}

// ── SPEED INCREASE ──────────────────────────────────────────────────────────────
// every 20 seconds, speed up by 33 ms, but never faster than ~100 ms
setInterval(() => {
  dropInterval = Math.max(100, dropInterval - 33);
}, 20000);

// ── INPUT HANDLING ──────────────────────────────────────────────────────────────
document.addEventListener('keydown', event => {
  if (event.key === 'ArrowLeft') {
    player.pos.x--;
    if (collide(arena, player)) player.pos.x++;
  } else if (event.key === 'ArrowRight') {
    player.pos.x++;
    if (collide(arena, player)) player.pos.x--;
  } else if (event.key === 'ArrowDown') {
    playerDrop();
  } else if (event.key === ' ' || event.key === 'ArrowUp') {
    // rotate
    rotate(player.matrix);
  }
});

// simple matrix rotation
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
  parent.postMessage(
    { score: finalScore, lines: totalLines },
    '*'
  );
}

// ── START THE GAME ───────────────────────────────────────────────────────────────
playerReset();
update();
