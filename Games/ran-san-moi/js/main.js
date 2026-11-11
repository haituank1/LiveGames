/* Rắn Săn Mồi — điều phối game (nv1, RAN-SHELL).
   TikTok LIVE -> LiveBridge (port 8787) -> WebSocket -> game này.
   Spec: ~/workspace/multi-session/RAN-SAN-MOI-SPEC.md (§1 luật, §4 Snake,
   §5 Board/quà, §6 FX, §7 config, §8 demo) + 3 lưu ý tích hợp của BOSS
   (2026-11-11 16:42, đã ghi vào spec §4). Spec là hợp đồng — KHÔNG tự
   đổi signature interface của Snake/Board/Effects.

   HỢP ĐỒNG GIAO TIẾP (đối chiếu code thật nv2/nv3/nv4 ngày 2026-11-11):
   - Snake (nv2): new Snake({ board, config, isBlocked(x,y), getFood(),
     onEat, onDie }); snake.reset(); snake.tick() -> {type:'eat',apple} |
     {type:'die',cause} | {type:'move'} | null (đã chết); snake.grow(n);
     snake.render(ctx, alpha); snake.segments/direction/alive/length.
     tick() VỪA trả event VỪA gọi onEat/onDie (theo §4) — main.js CHỈ dùng
     event tick() (onEat/onDie truyền no-op) để tránh cộng điểm/grow 2 lần.
     tick() KHÔNG tự grow — main.js gọi snake.grow(1) khi nhận event eat.
     Snake KHÔNG tự gỡ táo khỏi bàn — main.js gọi board.removeFood().
   - Board (nv3): new Board(config) — config plain, Board chỉ lấy 4 key
     kichThuocBan/soTaoToiDa/soBomToiDa/thoiGianBom; hình học
     board.cell/gridX/gridY/gridSize/frame (mặc định lưới 640px, khung 20px,
     grid (20,180) trên stage 720×1280); board.setRect(x,y,cell);
     board.reset(isBlocked) (dọn táo/bom, thả 1 táo);
     board.spawnFood(isBlocked) / board.ensureFood(isBlocked) (cap soTaoToiDa);
     board.spawnBomb(head, isBlocked, nowMs) (cách đầu rắn ≥3 ô Manhattan);
     board.update(nowMs) — DỌN BOM HẾT HẠN, trả mảng bom vừa hết hạn;
     board.removeFood/removeBomb(x,y); board.isBomb/isFood/isFree(x,y);
     board.inBounds(x,y); board.cellCenter(x,y); board.render(ctx, nowMs)
     (vẽ ở tọa độ TUYỆT ĐỐI stage — canvas phải phủ toàn stage 720×1280).
     isBlocked(x,y) = "ô rắn đang chiếm" — main.js PHẢI truyền khi thả
     (Board chỉ biết tường/táo/bom); main.js PHẢI gọi update() mỗi frame
     nếu không bom hết hạn không tự biến mất.
   - Effects (nv4): window.effects.init({cellSize, cols, rows, originX,
     originY, applePoints}) — PHẢI gọi sau khi biết layout bàn (và gọi lại
     khi đổi bàn/điểm); effects.eat(x,y,points)/explode(x,y)/die()/spawn(x,y)
     (tọa độ Ô LƯỚI); effects.update(dt) với dt tính bằng GIÂY (clamp 0..0.05);
     effects.render(ctx). Chưa có hàm poof riêng cho bom hết hạn — main.js
     gọi update() và chưa bắn FX gì thêm (nv4 có thể thêm effects.poof sau).
   QUYẾT ĐỊNH NỐI TIẾP (để nv2/nv3/nv4/nv6 khỏi đoán):
   - NỐI HÌNH HỌC (lưu ý BOSS #2): Snake._geometry đọc b.cell + b.offsetX/
     b.offsetY (không đọc b.gridX/b.gridY). Board expose gridX/gridY —
     main.js gán alias board.offsetX = board.gridX, board.offsetY =
     board.gridY ngay sau khi tạo Board để rắn vẽ đúng vị trí bàn.
     (Lâu dài: nv2 sửa _geometry đọc gridX/gridY, hoặc nv3 thêm alias
     offsetX/offsetY trong Board — main.js nối tạm bằng alias để game chạy
     đúng ngay, không đợi sửa 2 file kia.)
   - Snake/Board SNAPSHOT config lúc new (copy, không giữ reference) — nên
     main.js KHÔNG trông chờ "giữ nguyên object cfg" nữa: sau mỗi applyConfig,
     main đẩy key đổi được vào object public snake.config/board.config
     (màu thân/đầu, doDaiBanDau, thoiGianBom, soBomToiDa, soTaoToiDa) để
     admin đổi ăn ngay; chỉ đổi kichThuocBan mới rebuild board + snake.
     Tốc độ (tocDo) main đọc trực tiếp từ cfg mỗi frame nên ăn ngay.
   - Điểm: táo +diemTao, tim +1/tim, quà +điểm theo bảng quaTang (vào cả Điểm
     game lẫn Top tặng quà của người tặng). Quà lạ (không có trong bảng): +0,
     không hiệu ứng (ghi console để user bổ sung bảng).
   - Ăn táo: main xử lý event 'eat' (cộng điểm, board.removeFood, gọi
     snake.grow(1), thả táo mới bằng board.spawnFood(isBlocked)).
   - Chết: điểm về 0, giữ Kỷ lục, rắn reset sau thoiGianHoiSinh; bom trên bàn
     GIỮ NGUYÊN (tự hết hạn theo thoiGianBom).
   - Quà combo (count > 1): điểm nhân theo count, hiệu ứng chỉ thả 1 lần.
   - Effects/Snake/Board chưa có (trước khi gộp): main dùng noop/FX rỗng và
     báo trạng thái, trang vẫn load, HUD vẫn hiện, 0 console error.
*/
(function () {
'use strict';
const $ = id => document.getElementById(id);
const q = new URLSearchParams(location.search);
const isDemo = q.has('demo') && q.get('demo') !== '0';
const canvas = $('board');
const ctx = canvas.getContext('2d');
function esc(s) { return String(s || '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch])); }
function setText(id, s) { const e = $(id); if (e) e.textContent = s; }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

/* ---------- Cấu hình mặc định (spec §7) ---------- */
const DEFAULT_CFG = {
  tenGame: 'Rắn Săn Mồi',
  kichThuocBan: 20, // ô (16–24)
  tocDo: 150, // ms/tick (80–300)
  doDaiBanDau: 5,
  diemTao: 10,
  thoiGianBom: 30, // giây, 0 = không hết hạn
  soBomToiDa: 5,
  soTaoToiDa: 3,
  thoiGianHoiSinh: 3, // giây
  mauThanRan: '#FF9F1C', // cam (gradient tới vàng, nv2 vẽ)
  mauDauRan: '#4CAF50', // xanh lá
  // Bảng quà mặc định (spec §5): key = TÊN QUÀ THẬT trên TikTok (đối chiếu
  // catalog LiveBridge — "Rose"/"Doughnut" đã xác nhận có trong mapping các
  // game khác; "GG"/"Apple"/"Chicken"/"Gift Box" theo ảnh tham chiếu, nếu
  // live thật thấy tên khác thì sửa key cho khớp). diem = điểm quà, hieuUng:
  // "tao" = rớt 1 táo, "bom" = thả 1 bom.
  quaTang: '{"Rose":{"diem":1,"hieuUng":"tao"},"GG":{"diem":5,"hieuUng":"tao"},"Apple":{"diem":25,"hieuUng":"tao"},"Doughnut":{"diem":30,"hieuUng":"tao"},"Chicken":{"diem":60,"hieuUng":"tao"},"Gift Box":{"diem":100,"hieuUng":"bom"}}',
};
let cfg = Object.assign({}, DEFAULT_CFG);

/* Nhãn + icon hiển thị cho bảng quà (key chuẩn hóa lowercase). */
const GIFT_LABELS = { rose: 'Hoa hồng', gg: 'GG', apple: 'Táo', doughnut: 'Bánh donut', chicken: 'Gà', 'gift box': 'Hộp quà' };
const GIFT_ICONS = { rose: '🌹', gg: '🎮', apple: '🍎', doughnut: '🍩', chicken: '🍗', 'gift box': '🎁' };

/* ---------- Bảng quà ---------- */
let giftTable = {};
function parseGiftTable(v) {
  let o = v;
  if (typeof v === 'string') { try { o = JSON.parse(v); } catch (_) { return null; } }
  if (!o || typeof o !== 'object' || Array.isArray(o)) return null;
  const out = {};
  for (const k of Object.keys(o)) {
    const name = String(k).trim().slice(0, 40);
    const val = o[k];
    if (!name || !val || typeof val !== 'object') continue;
    const diem = Math.max(0, Math.min(10000, Math.round(Number(val.diem) || 0)));
    const hieuUng = val.hieuUng === 'bom' ? 'bom' : 'tao';
    out[name] = { diem, hieuUng };
  }
  return Object.keys(out).length ? out : null;
}
/* Tìm quà trong bảng: khớp tên thật (không phân biệt hoa/thường) hoặc nhãn
   tiếng Việt (vd sự kiện giả lập/sim ghi giftName = "Hoa hồng"). */
function lookupGift(rawName) {
  const norm = String(rawName || '').trim().toLowerCase();
  if (!norm) return null;
  for (const k of Object.keys(giftTable)) {
    if (k.toLowerCase() === norm) return { key: k, diem: giftTable[k].diem, hieuUng: giftTable[k].hieuUng };
  }
  for (const k of Object.keys(giftTable)) {
    if ((GIFT_LABELS[k.toLowerCase()] || '').toLowerCase() === norm) return { key: k, diem: giftTable[k].diem, hieuUng: giftTable[k].hieuUng };
  }
  return null;
}
function giftDisplayName(rawName, entry) {
  if (entry) return GIFT_LABELS[entry.key.toLowerCase()] || entry.key;
  return String(rawName || 'quà');
}
function giftIcon(entry) {
  if (!entry) return '🎁';
  return GIFT_ICONS[entry.key.toLowerCase()] || '🎁';
}

/* ---------- Effects (noop nếu effects.js chưa gộp) ---------- */
const noopFX = { init: function () {}, eat: function () {}, explode: function () {}, die: function () {}, spawn: function () {}, update: function () {}, render: function () {} };
const FX = (typeof window.effects === 'object' && window.effects) ? window.effects : noopFX;
/* Đẩy hình học bàn thật vào Effects (effects.init bắt buộc — mặc định của
   nó là cell 34px + origin (0,0), sai với bàn thật cell 32px + grid (20,180)). */
function initEffects() {
  if (!board || typeof FX.init !== 'function') return;
  FX.init({
    cellSize: board.cell, cols: board.n, rows: board.n,
    originX: board.gridX, originY: board.gridY,
    applePoints: cfg.diemTao,
  });
}

/* ---------- State ---------- */
let board = null, snake = null;
let score = 0, record = 0, likes = 0;
let status = 'idle'; // idle | running | dead
let started = false;
let topGifters = new Map(); // userId -> { name, points }
let lastFrame = 0, acc = 0;
let demoGiftTimer = 0, demoLikeTimer = 0, demoGiftTurn = 0;

/* ---------- HUD ---------- */
function updateHUD() {
  setText('scoreVal', String(score));
  setText('lenVal', String(snake ? snake.length : cfg.doDaiBanDau));
  setText('recordVal', String(record));
  setText('likeVal', String(likes));
}
function setStatus(s) { setText('statusLine', s); }
function setFeed(s) { setText('feedLine', s); }
function renderGiftBar() {
  const bar = $('giftBar');
  if (!bar) return;
  bar.textContent = '';
  const keys = Object.keys(giftTable);
  if (!keys.length) {
    const d = document.createElement('div');
    d.className = 'top-empty';
    d.textContent = 'Chưa có bảng quà — kiểm tra config quaTang.';
    bar.appendChild(d);
    return;
  }
  for (const k of keys) {
    const e = giftTable[k];
    const card = document.createElement('div');
    card.className = 'gift-card';
    const ic = document.createElement('div');
    ic.className = 'ic';
    ic.textContent = giftIcon({ key: k });
    const nm = document.createElement('div');
    nm.className = 'nm';
    nm.textContent = GIFT_LABELS[k.toLowerCase()] || k;
    const pt = document.createElement('div');
    pt.className = 'pt';
    pt.textContent = '+' + e.diem + ' điểm';
    const fx = document.createElement('div');
    fx.className = 'fx';
    fx.textContent = e.hieuUng === 'bom' ? '💣 +1 bom' : '🍎 +1 táo';
    card.append(ic, nm, pt, fx);
    bar.appendChild(card);
  }
}
function renderTop() {
  const list = $('topList');
  if (!list) return;
  list.textContent = '';
  const top = Array.from(topGifters.values()).sort((a, b) => b.points - a.points).slice(0, 3);
  if (!top.length) {
    const d = document.createElement('div');
    d.className = 'top-empty';
    d.textContent = 'Chưa có ai tặng quà — tặng quà để lên bảng!';
    list.appendChild(d);
    return;
  }
  const medals = ['🥇', '🥈', '🥉'];
  top.forEach((g, i) => {
    const row = document.createElement('div');
    row.className = 'top-row';
    const rank = document.createElement('span');
    rank.className = 'rank';
    rank.textContent = medals[i];
    const nm = document.createElement('span');
    nm.className = 'nm';
    nm.textContent = g.name;
    const pt = document.createElement('span');
    pt.className = 'pt';
    pt.textContent = g.points + ' điểm';
    row.append(rank, nm, pt);
    list.appendChild(row);
  });
}
function addGifter(user, pts) {
  const id = user.id || user.username || user.nickname || 'anon';
  const cur = topGifters.get(id) || { name: user.nickname || user.username || 'Bạn', points: 0 };
  cur.points += pts;
  if (user.nickname) cur.name = user.nickname;
  topGifters.set(id, cur);
  renderTop();
}

/* ---------- Tạo game (Board trước, Snake sau — xem hợp đồng ở đầu file) ---------- */
function isSnakeCell(x, y) {
  if (!snake || !snake.segments) return false;
  return snake.segments.some(s => s.x === x && s.y === y);
}
function getHeadCell() {
  return (snake && snake.segments && snake.segments[0]) ? snake.segments[0] : null;
}
function isBlockedCell(x, y) {
  if (board && board.inBounds) { if (!board.inBounds(x, y)) return true; } // tường (theo kích thước bàn thật)
  else { const size = cfg.kichThuocBan; if (x < 0 || y < 0 || x >= size || y >= size) return true; }
  if (isSnakeCell(x, y)) return true; // thân rắn (AI tự trừ đuôi theo spec §4)
  if (board && board.isBomb && board.isBomb(x, y)) return true; // bom
  return false;
}
function createGame() {
  board = null;
  snake = null;
  if (typeof window.Board !== 'function' || typeof window.Snake !== 'function') {
    setStatus('⏳ Đang chờ file snake.js / board.js (nv2/nv3 chưa gộp) — HUD vẫn chạy.');
    return false;
  }
  board = new Board(cfg); // Board(config) — Board chỉ lấy 4 key kichThuocBan/soTaoToiDa/soBomToiDa/thoiGianBom
  // NỐI HÌNH HỌC (lưu ý BOSS #2): Board expose cell/gridX/gridY; Snake._geometry
  // đọc b.cell + b.offsetX/b.offsetY — gán alias để rắn vẽ đúng vị trí bàn.
  board.offsetX = board.gridX;
  board.offsetY = board.gridY;
  snake = new Snake({
    board: board, config: cfg, isBlocked: isBlockedCell,
    getFood: function () { return board ? board.foods : []; },
    onEat: function () {}, // noop có chủ ý — chỉ dùng event 'eat' từ tick() (tránh cộng 2 lần)
    onDie: function () {}, // noop có chủ ý — chỉ dùng event 'die' từ tick()
  });
  board.reset(isSnakeCell); // dọn táo/bom, thả 1 táo (không trùng rắn)
  // Thả thêm cho đủ soTaoToiDa táo lúc đầu (spawnFood tự cap ở soTaoToiDa).
  const target = Math.max(1, Math.floor(Number(cfg.soTaoToiDa) || 3));
  while (board.foods.length < target) {
    try { if (!board.spawnFood(isSnakeCell)) break; } catch (e) { console.error('[ran-san-moi] spawnFood lỗi:', e); break; }
  }
  initEffects(); // đẩy hình học bàn thật vào Effects
  return true;
}

/* ---------- Vòng lặp game ---------- */
function tickMs() {
  const t = Number(cfg.tocDo);
  return Number.isFinite(t) ? Math.max(50, Math.min(1000, t)) : 150;
}
function tick() {
  if (!snake || !snake.alive) return;
  let ev = null;
  try { ev = snake.tick(); } catch (e) { console.error('[ran-san-moi] snake.tick lỗi:', e); return; }
  if (!ev) return;
  if (ev.type === 'eat') {
    score += cfg.diemTao;
    if (score > record) record = score;
    if (board && ev.apple) { try { board.removeFood(ev.apple.x, ev.apple.y); } catch (e) { console.error('[ran-san-moi] removeFood lỗi:', e); } } // Snake không tự gỡ táo khỏi bàn
    try { snake.grow(1); } catch (e) { console.error('[ran-san-moi] snake.grow lỗi:', e); }
    const a = ev.apple || (snake.segments && snake.segments[0]);
    if (a) FX.eat(a.x, a.y, cfg.diemTao); // truyền điểm để chữ bay "+N" đúng diemTao
    if (board) { try { board.spawnFood(isSnakeCell); } catch (e) { console.error('[ran-san-moi] spawnFood lỗi:', e); } } // ăn 1 táo → thả táo mới (không trùng rắn)
    updateHUD();
  } else if (ev.type === 'die') {
    onDie(ev.cause);
  }
}
function onDie(cause) {
  status = 'dead';
  const head = snake && snake.segments && snake.segments[0];
  if (head) FX.explode(head.x, head.y);
  FX.die();
  const why = cause === 'bomb' ? ' (đụng bom)' : cause === 'wall' ? ' (đụng tường)' : cause === 'self' ? ' (cắn thân mình)' : '';
  setStatus('💥 Rắn đã thua' + why + '! Hồi sinh sau ' + cfg.thoiGianHoiSinh + 's…');
  updateHUD();
  setTimeout(function () {
    if (!snake) return;
    snake.reset();
    score = 0; // điểm về 0, giữ Kỷ lục
    status = 'running';
    setStatus('▶ Đang chạy — tặng quà để can thiệp vào game!');
    updateHUD();
  }, Math.max(1, Number(cfg.thoiGianHoiSinh) || 3) * 1000);
}
function render(dtMs) {
  const alpha = (started && status === 'running') ? Math.min(1, acc / tickMs()) : 0;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (board) {
    try {
      board.update(); // PHẢI gọi mỗi frame (lưu ý BOSS #3): dọn bom hết hạn; trả mảng bom vừa hết hạn
      // (chưa có FX poof riêng cho bom hết hạn trong effects.js — mảng trả về chỉ để log/debug;
      // nv4 có thể thêm effects.poof(x,y) sau, main sẽ bắn tại vị trí bom.)
      board.render(ctx);
    } catch (e) { console.error('[ran-san-moi] board.render lỗi:', e); }
  }
  if (snake) { try { snake.render(ctx, alpha); } catch (e) { console.error('[ran-san-moi] snake.render lỗi:', e); } }
  try { FX.update(dtMs / 1000); } catch (e) { console.error('[ran-san-moi] effects.update lỗi:', e); } // dt tính bằng GIÂY (effects.js clamp 0..0.05)
  try { FX.render(ctx); } catch (e) { console.error('[ran-san-moi] effects.render lỗi:', e); }
}
function frame(now) {
  requestAnimationFrame(frame);
  if (!lastFrame) lastFrame = now;
  const dt = Math.min(100, now - lastFrame);
  lastFrame = now;
  if (started && status === 'running') {
    acc += dt;
    let guard = 0;
    while (acc >= tickMs() && guard++ < 8) {
      acc -= tickMs();
      tick();
      if (status !== 'running') { acc = 0; break; }
    }
    if (guard >= 8) acc = 0; // tab ẩn lâu: bỏ tick dồn để rắn không chạy gấp
  }
  render(dt);
}

/* ---------- Sự kiện LiveBridge ---------- */
function normUser(u) {
  u = u || {};
  return { id: String(u.id || u.username || ''), username: String(u.username || ''), nickname: String(u.nickname || u.username || 'Bạn'), avatar: u.avatar || '' };
}
function onGiftEvent(ev) {
  const e = normUser(ev.user);
  const src = ev.source || {};
  const rawName = String(src.giftName || ev.label || 'quà');
  const count = Math.max(1, Math.floor(ev.count || 1));
  const entry = lookupGift(rawName);
  let pts = 0;
  if (entry) {
    pts = entry.diem * count;
    if (entry.hieuUng === 'bom') {
      const b = board ? board.spawnBomb(getHeadCell(), isSnakeCell) : null; // head + isBlocked (cách đầu ≥3 ô, không trùng rắn)
      if (b) FX.spawn(b.x, b.y); // null = đã đủ số bom tối đa → bỏ qua (spec §1)
    } else {
      const f = board ? board.spawnFood(isSnakeCell) : null; // isBlocked: không rớt táo lên thân rắn
      if (f) FX.spawn(f.x, f.y);
    }
  } else {
    // Quà lạ: +0 điểm, không hiệu ứng — ghi log để user bổ sung vào bảng quaTang.
    console.log('[ran-san-moi] quà chưa có trong bảng quaTang:', rawName);
  }
  if (pts > 0) {
    score += pts;
    if (score > record) record = score;
    addGifter(e, pts);
  }
  setFeed('🎁 ' + e.nickname + ' tặng ' + giftDisplayName(rawName, entry) + (count > 1 ? ' ×' + count : '') + (pts > 0 ? ' +' + pts + ' điểm' : ''));
  updateHUD();
}
function onLikeEvent(m) {
  const n = Math.max(0, Math.floor(m.likeCount || m.count || 1));
  if (!n) return;
  likes += n;
  score += n; // tim +1 điểm mỗi tim (§1)
  if (score > record) record = score;
  updateHUD();
}
function handle(ev) {
  if (!ev || !ev.action) return;
  const src = ev.source || {};
  if (src.kind === 'gift' || ev.action === 'gift') { onGiftEvent(ev); return; }
  switch (ev.action) {
    case 'like': onLikeEvent({ user: ev.user, likeCount: (ev.value || 1) * (ev.count || 1) }); break;
    default: break; // join/follow/share/chat: không ảnh hưởng game (§1)
  }
}

/* ---------- Cấu hình + LiveBridge ---------- */
let cfgApplied = false;
function applyConfig(c) {
  if (!c) return;
  const oldSize = cfg.kichThuocBan;
  Object.assign(cfg, DEFAULT_CFG, c); // giữ nguyên object cfg (main đọc trực tiếp mỗi frame: tocDo, diemTao...)
  cfgApplied = true;
  giftTable = parseGiftTable(cfg.quaTang) || {};
  renderGiftBar();
  // Snake/Board SNAPSHOT config lúc new (copy) — đẩy key đổi được vào object
  // public của chúng để admin đổi ăn ngay (không cần rebuild):
  if (snake) {
    snake.config.mauThanRan = cfg.mauThanRan;
    snake.config.mauDauRan = cfg.mauDauRan;
    snake.config.doDaiBanDau = cfg.doDaiBanDau; // áp từ lần hồi sinh sau
  }
  if (board) {
    board.config.thoiGianBom = Math.max(0, Number(cfg.thoiGianBom) || 0);
    board.config.soBomToiDa = Math.max(0, Math.round(Number(cfg.soBomToiDa) || 0));
    board.config.soTaoToiDa = Math.max(1, Math.round(Number(cfg.soTaoToiDa) || 1));
  }
  if (board && typeof FX.init === 'function') FX.init({ applePoints: cfg.diemTao }); // chữ "+N" bay đúng điểm mới (giữ nguyên hình học)
  if (!board || cfg.kichThuocBan !== oldSize) createGame(); // đổi kích thước bàn → dựng lại bàn + rắn
  updateHUD();
}
function connect() {
  if (typeof LiveBridgeClient === 'undefined') {
    applyConfig(DEFAULT_CFG);
    setText('liveStatus', 'Không thấy livebridge-client.js — chạy demo nội bộ');
    return;
  }
  /* Lấy host/port hiện tại (như QH): mở game qua LiveBridge cổng nào thì WS
     nối cổng đó; mở bằng file:// thì mặc định localhost:8787. */
  const wsHost = location.host || 'localhost:8787';
  const bridge = new LiveBridgeClient({ url: 'ws://' + wsHost, game: 'ran-san-moi' });
  bridge.on('event', handle);
  bridge.on('hello', function (h) {
    if (h && h.config) applyConfig(h.config); else applyConfig(DEFAULT_CFG);
    setText('liveStatus', 'Đã nối LiveBridge');
  });
  bridge.on('config', function (m) { applyConfig(m); });
  bridge.on('status', function (m) {
    if (m && m.tiktok) setText('liveStatus', 'TikTok: ' + m.tiktok.state + (m.tiktok.username ? ' • @' + m.tiktok.username : ''));
  });
  bridge.connect();
  /* Sau 8s chưa thấy config thật thì giữ DEFAULT_CFG (đã áp lúc khởi động). */
  setTimeout(function () { if (!cfgApplied) applyConfig(DEFAULT_CFG); }, 8000);
}

/* ---------- Demo (?demo=1) ---------- */
const DEMO_USERS = [
  { username: 'demo0', nickname: 'Lan Anh' }, { username: 'demo1', nickname: 'Minh Tuấn' },
  { username: 'demo2', nickname: 'Thu Hà' }, { username: 'demo3', nickname: 'Quốc Bảo' },
  { username: 'demo4', nickname: 'Ngọc Mai' }, { username: 'demo5', nickname: 'Hoàng Long' },
];
function demoGift() {
  const u = pick(DEMO_USERS);
  const keys = Object.keys(giftTable);
  if (!keys.length) return;
  /* Xoay: chẵn → quà rớt táo, lẻ → quà thả bom (để demo thấy cả 2 hiệu ứng). */
  const want = (demoGiftTurn++ % 2 === 0) ? 'tao' : 'bom';
  let pool = keys.filter(k => giftTable[k].hieuUng === want);
  if (!pool.length) pool = keys;
  const key = pick(pool);
  onGiftEvent({
    user: { id: u.username, username: u.username, nickname: u.nickname, avatar: '' },
    diamonds: giftTable[key].diem, count: 1, label: giftDisplayName(key, { key: key }),
    source: { kind: 'gift', giftName: key, diamonds: giftTable[key].diem },
  });
}
function demoLike() {
  onLikeEvent({ user: { id: 'demo-like', username: 'demo-like', nickname: '' }, likeCount: 10 });
}
function startGame() {
  if (started) return;
  started = true;
  const btn = $('btnStart');
  if (btn) btn.style.display = 'none'; // ẩn nút khỏi bàn sau khi bắt đầu (không che rắn)
  status = 'running';
  setStatus('▶ Đang chạy — tặng quà để can thiệp vào game!');
  if (isDemo) {
    demoGiftTimer = setInterval(demoGift, 8000); // 8s giả 1 quà ngẫu nhiên (§8)
    demoLikeTimer = setInterval(demoLike, 5000); // 5s giả 10 tim (§8)
  }
  updateHUD();
}

/* ---------- Khởi động ---------- */
applyConfig(DEFAULT_CFG);
connect();
createGame();
updateHUD();
renderGiftBar();
renderTop();
const startBtn = $('btnStart');
if (startBtn) startBtn.addEventListener('click', startGame);
requestAnimationFrame(frame);

/* Tay cầm debug/kiểm chứng (nv6 dùng để test không cần live thật). */
window.RanSanMoi = {
  applyConfig: applyConfig,
  onGiftEvent: onGiftEvent,
  onLikeEvent: onLikeEvent,
  demoGift: demoGift,
  demoLike: demoLike,
  startGame: startGame,
  getBoard: function () { return board; },
  getSnake: function () { return snake; },
  getState: function () {
    return {
      score: score, record: record, likes: likes, status: status, started: started,
      length: snake ? snake.length : 0, alive: snake ? snake.alive : false,
      foods: board ? board.foods.length : 0, bombs: board ? board.bombs.length : 0,
      board: board ? { n: board.n, cell: board.cell, gridX: board.gridX, gridY: board.gridY, offsetX: board.offsetX, offsetY: board.offsetY } : null,
      giftTable: giftTable, cfg: cfg,
    };
  },
};
})();
