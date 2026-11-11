// Games/ran-san-moi/js/snake.js — Snake: state, AI, movement, drawing.
// Spec: RAN-SAN-MOI-SPEC.md §4. The interface below is the contract with
// main.js — do NOT rename functions or change signatures.
// main.js loads this file with a plain <script> tag and calls `new Snake(opts)`.
// Node tests can require() it (module.exports guard at the bottom).

const DIRS = [
  { x: 0, y: -1 }, // up
  { x: 1, y: 0 }, // right
  { x: 0, y: 1 }, // down
  { x: -1, y: 0 }, // left
];

const DEFAULT_CONFIG = {
  kichThuocBan: 20, // board size in cells (16-24)
  doDaiBanDau: 5, // starting length
  mauThanRan: '#FF9F1C', // body orange (gradient to yellow toward the tail)
  mauDauRan: '#4CAF50', // head green
};

const TAIL_YELLOW = '#FFD93B'; // gradient end color (tail)

class Snake {
  constructor(opts) {
    opts = opts || {};
    this.board = opts.board || null;
    this.config = Object.assign({}, DEFAULT_CONFIG, opts.config || {});
    this.isBlocked = typeof opts.isBlocked === 'function' ? opts.isBlocked : null;
    this.getFood = typeof opts.getFood === 'function' ? opts.getFood : null;
    this.onEat = typeof opts.onEat === 'function' ? opts.onEat : null;
    this.onDie = typeof opts.onDie === 'function' ? opts.onDie : null;
    this.segments = []; // [{x, y}] head first, tail last
    this.direction = { x: 1, y: 0 }; // facing right
    this.alive = true;
    this._deathCause = null;
    this._prevSegments = []; // segments before the last tick (for smooth render)
    this.reset();
  }

  // Back to the initial state: length doDaiBanDau, board center, facing right.
  reset() {
    const size = this._size();
    let len = Math.floor(this.config.doDaiBanDau) || DEFAULT_CONFIG.doDaiBanDau;
    len = Math.max(1, Math.min(len, size));
    const cx = Math.floor(size / 2);
    const cy = Math.floor(size / 2);
    this.segments = [];
    for (let i = 0; i < len; i++) {
      this.segments.push({ x: cx - i, y: cy });
    }
    this.direction = { x: 1, y: 0 };
    this.alive = true;
    this._deathCause = null;
    this._prevSegments = this.segments.map((s) => ({ x: s.x, y: s.y }));
  }

  get length() {
    return this.segments.length;
  }

  // One tick: AI picks a direction, the snake moves, returns an event.
  // main.js relies on the returned event for score / explosion / respawn.
  // The onEat/onDie callbacks (if given) are ALSO invoked, per spec §4;
  // main.js must use only ONE of the two mechanisms (recommended: the
  // returned event) so score/growth are not applied twice.
  // Returns {type:'eat', apple} | {type:'die', cause} | {type:'move'},
  // or null if the snake is already dead (main.js should guard with alive).
  tick() {
    if (!this.alive) return null;
    const dir = this._chooseDirection();
    this.direction = dir;
    const head = this.segments[0];
    const nh = { x: head.x + dir.x, y: head.y + dir.y };
    this._prevSegments = this.segments.map((s) => ({ x: s.x, y: s.y }));
    if (!this._inBounds(nh.x, nh.y)) return this._die('wall');
    if (this._isBomb(nh.x, nh.y)) return this._die('bomb');
    const apple = this._foodAt(nh.x, nh.y);
    // The tail vacates this tick (see grow(): growth is applied separately
    // by grow(n) after the eat event, so the tail cell is free to move into
    // — except it can never hold an apple, so eating onto the tail is impossible).
    if (this._isBody(nh.x, nh.y, false)) return this._die('self');
    this.segments.unshift(nh);
    this.segments.pop();
    if (apple) {
      if (this.onEat) {
        try { this.onEat(apple); } catch (e) { /* main.js handler must not break the loop */ }
      }
      return { type: 'eat', apple };
    }
    return { type: 'move' };
  }

  // Grow by n segments, immediately. Appends copies of the tail cell, so the
  // tail effectively stays put for one tick while the body shifts — the same
  // observable behavior as the classic rule "the tail does not move on the
  // eating tick". tick() itself never grows; main.js calls grow(1) on eat.
  grow(n) {
    const add = Math.max(0, Math.floor(n) || 0);
    if (!add || !this.segments.length) return;
    const tail = this.segments[this.segments.length - 1];
    for (let i = 0; i < add; i++) {
      this.segments.push({ x: tail.x, y: tail.y });
    }
  }

  // Draw the snake. alpha (0..1) interpolates each segment between its
  // previous-tick and current-tick cell so movement looks smooth, never
  // jumping cell to cell. main.js computes alpha from elapsed time.
  render(ctx, alpha) {
    if (!ctx || !this.segments.length) return;
    const a = typeof alpha === 'number' && Number.isFinite(alpha)
      ? Math.max(0, Math.min(1, alpha)) : 1;
    const g = this._geometry(ctx);
    const n = this.segments.length;
    const pos = [];
    for (let i = 0; i < n; i++) pos.push(this._interpPos(i, a));
    const toPx = (p) => ({ x: g.ox + (p.x + 0.5) * g.cell, y: g.oy + (p.y + 0.5) * g.cell });
    const pts = pos.map(toPx);
    // Connective strokes first (tail to head) so turns have no gaps between
    // the round segments, then the round segments on top.
    ctx.lineCap = 'round';
    for (let i = n - 1; i >= 1; i--) {
      const t = n <= 1 ? 0 : i / (n - 1);
      ctx.strokeStyle = this._lerpColor(this.config.mauThanRan, TAIL_YELLOW, t);
      ctx.lineWidth = g.cell * 0.72;
      ctx.beginPath();
      ctx.moveTo(pts[i].x, pts[i].y);
      ctx.lineTo(pts[i - 1].x, pts[i - 1].y);
      ctx.stroke();
    }
    for (let i = n - 1; i >= 1; i--) {
      const t = n <= 1 ? 0 : i / (n - 1);
      ctx.beginPath();
      ctx.arc(pts[i].x, pts[i].y, g.cell * 0.46, 0, Math.PI * 2);
      ctx.fillStyle = this._lerpColor(this.config.mauThanRan, TAIL_YELLOW, t);
      ctx.fill();
    }
    this._drawHead(ctx, pts[0].x, pts[0].y, g.cell);
  }

  // --- AI: pick a direction each tick (spec §4, exactly this priority) ---
  _chooseDirection() {
    const head = this.segments[0];
    const cur = this.direction;
    // Candidate directions: all except the 180-degree turn.
    const cands = this._orderedDirs().filter((d) => !(d.x === -cur.x && d.y === -cur.y));
    // 1. BFS to the nearest apple (shortest path, first step).
    const foods = this._foods();
    if (foods.length) {
      const step = this._bfsToFood();
      if (step) return step;
    }
    // 2. Survival: among immediately-safe directions, pick the one with the
    // most reachable empty cells; tie -> keep the snake closest to an apple.
    let best = null;
    let bestSpace = -1;
    let bestDist = Infinity;
    for (const d of cands) {
      const nx = head.x + d.x;
      const ny = head.y + d.y;
      if (this._wouldDie(nx, ny)) continue;
      const space = this._floodCount(nx, ny);
      const dist = this._nearestAppleDist(nx, ny, foods);
      if (space > bestSpace || (space === bestSpace && dist < bestDist)) {
        best = d;
        bestSpace = space;
        bestDist = dist;
      }
    }
    if (best) return best;
    // 3. Surrounded: any direction that does not kill immediately; if every
    // direction kills, go straight (dying is correct per the rules).
    for (const d of cands) {
      if (!this._wouldDie(head.x + d.x, head.y + d.y)) return d;
    }
    return cur;
  }

  // BFS from the head to the nearest apple. Walls, bombs and the body
  // (except the tail, which will move away) are obstacles.
  // IMPORTANT (§4): eating an apple means the tail does NOT move — so if a
  // step onto an apple would land on the tail cell, the tail counts as an
  // obstacle for that step. Apples never spawn on the snake (board spawns on
  // free cells), so this case cannot occur in real play; the guard below
  // keeps the rule explicit and safe anyway.
  // Returns the first-step direction of the shortest path, or null.
  _bfsToFood() {
    const head = this.segments[0];
    const foods = this._foods();
    if (!foods.length) return null;
    const foodSet = new Set();
    for (const f of foods) {
      if (f && Number.isFinite(f.x) && Number.isFinite(f.y)) foodSet.add(f.x + ',' + f.y);
    }
    if (!foodSet.size) return null;
    const tail = this.segments[this.segments.length - 1];
    const startKey = head.x + ',' + head.y;
    const seen = new Set([startKey]);
    const prev = new Map(); // cell key -> { from: key, dir }
    const queue = [{ x: head.x, y: head.y }];
    let qi = 0;
    while (qi < queue.length) {
      const cur = queue[qi++];
      for (const d of this._orderedDirs()) {
        const nx = cur.x + d.x;
        const ny = cur.y + d.y;
        // Never turn 180 degrees on the first step (the neck already blocks
        // it, but forbid it explicitly so the rule holds in every edge case).
        if (cur.x === head.x && cur.y === head.y && d.x === -this.direction.x && d.y === -this.direction.y) continue;
        const key = nx + ',' + ny;
        if (seen.has(key) || !this._inBounds(nx, ny)) continue;
        if (this._isBomb(nx, ny)) continue;
        if (this._isBody(nx, ny, false)) continue; // body except the tail
        const isTailCell = nx === tail.x && ny === tail.y;
        const isFoodCell = foodSet.has(key);
        if (isTailCell && isFoodCell) continue; // eating onto the tail: tail stays -> blocked
        seen.add(key);
        prev.set(key, { from: cur.x + ',' + cur.y, dir: d });
        if (isFoodCell) {
          // Walk back to the head to recover the first step.
          let k = key;
          while (prev.get(k).from !== startKey) k = prev.get(k).from;
          return prev.get(k).dir;
        }
        queue.push({ x: nx, y: ny });
      }
    }
    return null;
  }

  // Flood-fill: how many empty cells are reachable from (sx, sy).
  // Obstacles: walls, bombs, body (except the tail — it will move away).
  // The start cell itself counts (it is the cell the head would move into).
  _floodCount(sx, sy) {
    const seen = new Set([sx + ',' + sy]);
    const queue = [{ x: sx, y: sy }];
    let qi = 0;
    let count = 0;
    while (qi < queue.length) {
      const cur = queue[qi++];
      count++;
      for (const d of DIRS) {
        const nx = cur.x + d.x;
        const ny = cur.y + d.y;
        const key = nx + ',' + ny;
        if (seen.has(key) || !this._inBounds(nx, ny)) continue;
        if (this._isBomb(nx, ny)) continue;
        if (this._isBody(nx, ny, false)) continue;
        seen.add(key);
        queue.push({ x: nx, y: ny });
      }
    }
    return count;
  }

  // Would moving the head to (x, y) kill it right now? Wall, bomb, or body
  // (except the tail, which vacates this tick). An apple cell is safe.
  _wouldDie(x, y) {
    if (!this._inBounds(x, y)) return true;
    if (this._isBomb(x, y)) return true;
    if (this._isBody(x, y, false)) return true;
    return false;
  }

  _die(cause) {
    this.alive = false;
    this._deathCause = cause;
    const ev = { type: 'die', cause };
    if (this.onDie) {
      try { this.onDie(cause); } catch (e) { /* main.js handler must not break the loop */ }
    }
    return ev;
  }

  // --- Board / food queries (all defensive: main.js may pass partial opts) ---
  _size() {
    const c = this.config.kichThuocBan;
    if (Number.isFinite(c) && c >= 4) return Math.floor(c);
    if (this.board && Number.isFinite(this.board.size)) return Math.floor(this.board.size);
    if (this.board && Number.isFinite(this.board.width)) return Math.floor(this.board.width);
    return DEFAULT_CONFIG.kichThuocBan;
  }

  _inBounds(x, y) {
    const s = this._size();
    return x >= 0 && y >= 0 && x < s && y < s;
  }

  _foods() {
    if (!this.getFood) return [];
    try {
      const f = this.getFood();
      return Array.isArray(f) ? f : [];
    } catch (e) {
      return [];
    }
  }

  _foodAt(x, y) {
    const foods = this._foods();
    for (const f of foods) {
      if (f && f.x === x && f.y === y) return { x: f.x, y: f.y };
    }
    return null;
  }

  _isBody(x, y, includeTail) {
    const segs = this.segments;
    const end = includeTail ? segs.length : segs.length - 1;
    for (let i = 0; i < end; i++) {
      if (segs[i].x === x && segs[i].y === y) return true;
    }
    return false;
  }

  _isBomb(x, y) {
    const b = this.board;
    if (b && typeof b.isBomb === 'function') {
      try { return !!b.isBomb(x, y); } catch (e) { /* fall through to isBlocked */ }
    }
    // Fallback: isBlocked true + in bounds + not my own body means a bomb
    // (walls are out of bounds already; apples are never "blocked" per spec).
    if (this.isBlocked && this._inBounds(x, y) && !this._isBody(x, y, true)) {
      try { return !!this.isBlocked(x, y); } catch (e) { return false; }
    }
    return false;
  }

  _nearestAppleDist(x, y, foods) {
    if (!foods || !foods.length) return 0;
    let best = Infinity;
    for (const f of foods) {
      if (!f || !Number.isFinite(f.x) || !Number.isFinite(f.y)) continue;
      const d = Math.abs(f.x - x) + Math.abs(f.y - y);
      if (d < best) best = d;
    }
    return best === Infinity ? 0 : best;
  }

  // Directions ordered with the current direction first, so equal-length
  // paths and equal flood-fill scores prefer going straight (smoother play).
  _orderedDirs() {
    const cur = this.direction;
    const rest = DIRS.filter((d) => !(d.x === cur.x && d.y === cur.y));
    return [{ x: cur.x, y: cur.y }].concat(rest);
  }

  // --- Drawing helpers ---
  _interpPos(i, alpha) {
    const cur = this.segments[i];
    const prev = this._prevSegments || [];
    // Segment i moves from its own previous cell to its current cell.
    // A brand-new tail segment (just grown) has no previous cell: it stays.
    const from = prev[i] || cur;
    return {
      x: from.x + (cur.x - from.x) * alpha,
      y: from.y + (cur.y - from.y) * alpha,
    };
  }

  // Board pixel geometry. Board (nv3) should expose cellSize / offsetX /
  // offsetY; otherwise fall back to fitting the board to the canvas width.
  _geometry(ctx) {
    const size = this._size();
    const b = this.board;
    let cell = null;
    let ox = 0;
    let oy = 0;
    if (b) {
      if (Number.isFinite(b.cellSize)) cell = b.cellSize;
      else if (Number.isFinite(b.cell)) cell = b.cell;
      if (Number.isFinite(b.offsetX)) ox = b.offsetX;
      else if (Number.isFinite(b.originX)) ox = b.originX;
      else if (Number.isFinite(b.x)) ox = b.x;
      if (Number.isFinite(b.offsetY)) oy = b.offsetY;
      else if (Number.isFinite(b.originY)) oy = b.originY;
      else if (Number.isFinite(b.y)) oy = b.y;
    }
    if (Number.isFinite(this.config.cellSize)) cell = this.config.cellSize;
    if (!cell) {
      const w = ctx && ctx.canvas ? ctx.canvas.width : 720;
      cell = Math.max(8, Math.floor(w / size));
      ox = Math.floor((w - cell * size) / 2);
    }
    return { cell, ox, oy };
  }

  _drawHead(ctx, px, py, cell) {
    const r = cell * 0.5;
    ctx.beginPath();
    ctx.arc(px, py, r, 0, Math.PI * 2);
    ctx.fillStyle = this.config.mauDauRan || DEFAULT_CONFIG.mauDauRan;
    ctx.fill();
    const d = this.direction;
    const perp = { x: -d.y, y: d.x };
    const eyeFwd = cell * 0.14;
    const eyeOff = cell * 0.17;
    const eyeR = cell * 0.11;
    const pupR = cell * 0.055;
    for (const s of [-1, 1]) {
      const ex = px + d.x * eyeFwd + perp.x * eyeOff * s;
      const ey = py + d.y * eyeFwd + perp.y * eyeOff * s;
      ctx.beginPath();
      ctx.arc(ex, ey, eyeR, 0, Math.PI * 2);
      ctx.fillStyle = '#FFFFFF';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(ex + d.x * eyeR * 0.35, ey + d.y * eyeR * 0.35, pupR, 0, Math.PI * 2);
      ctx.fillStyle = '#222222';
      ctx.fill();
    }
    // Small forked tongue in front of the head.
    const tx = px + d.x * r;
    const ty = py + d.y * r;
    const tLen = cell * 0.22;
    ctx.strokeStyle = '#E53935';
    ctx.lineWidth = Math.max(1, cell * 0.05);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(tx, ty);
    ctx.lineTo(tx + d.x * tLen + perp.x * tLen * 0.4, ty + d.y * tLen + perp.y * tLen * 0.4);
    ctx.moveTo(tx, ty);
    ctx.lineTo(tx + d.x * tLen - perp.x * tLen * 0.4, ty + d.y * tLen - perp.y * tLen * 0.4);
    ctx.stroke();
  }

  _hexToRgb(hex) {
    const h = String(hex || '').replace('#', '');
    const v = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
    const n = parseInt(v, 16);
    if (!Number.isFinite(n)) return { r: 255, g: 159, b: 28 };
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }

  _lerpColor(a, b, t) {
    const ca = this._hexToRgb(a);
    const cb = this._hexToRgb(b);
    const r = Math.round(ca.r + (cb.r - ca.r) * t);
    const g = Math.round(ca.g + (cb.g - ca.g) * t);
    const bl = Math.round(ca.b + (cb.b - ca.b) * t);
    return 'rgb(' + r + ',' + g + ',' + bl + ')';
  }
}

if (typeof window !== 'undefined') window.Snake = Snake;
if (typeof module !== 'undefined' && module.exports) module.exports = Snake;
