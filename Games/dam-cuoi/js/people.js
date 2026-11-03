/* ============================================================
   Đám Cưới Online — nhân vật trong KHÔNG GIAN PHÒNG RỘNG (people.js)
   - Phòng cưới lớn hơn màn hình: mỗi người vào phòng nhận 1 vị trí
     trống NGẪU NHIÊN (ghế quanh bàn tiệc hoặc điểm đứng) và ở cố định đó.
   - Giới hạn 2000 nhân vật.
   - Ghép đôi: (main lia camera tới) → đổi trang phục cưới tại chỗ +
     phóng to + vòng sáng quanh 2 người → đi thảm đỏ lên sân khấu →
     hết giờ quay về vị trí của mình (ngồi cạnh nhau nếu còn chỗ).
   - Vai cô dâu/chú rể phân theo giới tính đoán từ TÊN tiếng Việt.
   ============================================================ */
'use strict';
const P = {};
(window.Wedding = window.Wedding || {}).people = P;
window.Wedding.peopleApi = P;

const MAX_PEOPLE = 2000;
const FLOOR_Y = 44;              // sàn tiệc bắt đầu từ đây (% chiều cao phòng — dưới bục sân khấu trong ảnh toàn cảnh)
let Ww = 2700, Hw = 3840;        // kích thước phòng (px) — main cập nhật qua P.resize
let FH = 192;                    // chiều cao nhân vật gốc (px trong phòng)
let box = null, tablesBox = null;
let stageY = 17.3;               // điểm đứng trên sân khấu (% chiều cao phòng)

const people = new Map();        // id -> person
const couples = [];
const stageQueue = [];
const stageSlots = [null, null, null];
/* ================= KHUNG SÂN KHẤU / KHÁN ĐÀI CỐ ĐỊNH (xem BG-LAYOUT.md) =================
   Bục vẽ sẵn trong ảnh: mặt bục từ y≈32% (sát vòm hoa) tới y≈42% (mép trước).
   Cặp đôi CHỈ đứng trong vùng an toàn dưới đây — không đè lên bánh cưới
   (x 45–55, y≤35), không chạm 2 cột vòm hoa (x 26–33 & 67–74), bậc thang
   (x 40–60, y 42–46) chỉ đi qua, không đứng lại. */
const STAGE_FRAME = {
  zoneX: [34, 66],        // khoảng x được phép đứng trên bục
  zoneDropMax: 1.6,       // đứng thấp hơn đường lễ tối đa (vẫn trên mặt bục)
  spots: [50, 37, 63],    // tâm 3 vị trí cặp: giữa + 2 bên CÁCH XA nhau cho thoáng
  pairOff: [2.2, 2.0, 2.0],   // nửa khoảng cách 2 người trong cặp: XÍCH GẦN nhau, âu yếm
  sideDrop: 0.55,         // cặp 2 bên đứng thấp hơn cặp giữa một chút
  groomDrop: 0.5,         // chú rể đứng hơi thấp hơn (trước) cô dâu
};
const SPOTS = STAGE_FRAME.spots.map(x => ({ x }));
const CARPETS = [22, 50, 78];    // 3 thảm đỏ (% chiều rộng phòng)

function rand(a, b) { return a + Math.random() * (b - a); }
function hash(s) { let h = 0; s = String(s || ''); for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h); }
function avatarColor(id) { const hues = [340, 262, 200, 158, 24, 288, 96, 0, 210, 45]; return `hsl(${hues[hash(id) % hues.length]} 65% 45%)`; }
function initials(name) { const w = String(name || '?').trim().split(/\s+/); return ((w[0] || '?')[0] + (w.length > 1 ? w[w.length - 1][0] : '')).toUpperCase(); }
function esc(s) { return String(s || '').replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch])); }

/* ---------- Ảnh chibi: nhiều mẫu cô dâu / chú rể / khách ---------- */
const BRIDES = ['img/bride.png', 'img/bride2.png', 'img/bride3.png', 'img/bride4.png'];
const GROOMS = ['img/groom.png', 'img/groom2.png', 'img/groom3.png', 'img/groom4.png'];
const GUEST_GIRLS = ['img/guest-girl.png', 'img/guest-girl2.png'];
const GUEST_BOYS = ['img/guest-boy.png', 'img/guest-boy2.png'];
[...BRIDES, ...GROOMS, ...GUEST_GIRLS, ...GUEST_BOYS].forEach(src => { const im = new Image(); im.src = src; });

/* ---------- Đoán giới tính theo tên tiếng Việt ----------
   Điểm > 0: nữ · < 0: nam · = 0: không rõ. Tên đệm Thị (nữ) / Văn (nam) mạnh nhất,
   sau đó là tên chính (từ cuối) trong danh sách tên phổ biến. */
const FEMALE_GIVEN = new Set(('thao huong hang trang linh phuong ngoc hong lan hoa mai dao cuc truc quynh chi hanh dung nhung tuyet nguyet thu ha hien hue kieu lien lieu ly my nga ngan nhi nhien oanh quyen sen thuy thuong tien tram trinh tuyen uyen van yen dieu diem bich chau gam').split(' '));
const MALE_GIVEN = new Set(('tuan dung hung cuong manh quan hoang duc hai nam phong son tung kien trung hieu thang vinh long dat tien viet quang huy khoa dang loc phat tai tri khang minh duy trong nghia binh lam vu sang thai thinh toan truong').split(' '));
function normName(s) {
  return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd')
    .replace(/[^a-z\s]/g, ' ').replace(/\s+/g, ' ').trim();
}
function genderScore(name) {
  const w = normName(name).split(' ').filter(Boolean);
  if (!w.length) return 0;
  const given = w[w.length - 1];
  let s = 0;
  if (given === 'van') s += 2;
  else if (w.includes('van')) s -= 3;
  if (w.includes('thi')) s += 3;
  if (FEMALE_GIVEN.has(given)) s += 2;
  if (MALE_GIVEN.has(given)) s -= 2;
  return s;
}
P.guessGender = name => { const s = genderScore(name); return s > 0 ? 'F' : s < 0 ? 'M' : '?'; };

function figHTML(p) {
  const seed = hash(p.user.id || p.user.nickname);
  let file;
  if (p.outfit === 'bride') file = BRIDES[seed % BRIDES.length];
  else if (p.outfit === 'groom') file = GROOMS[seed % GROOMS.length];
  else {
    const gs = genderScore(p.user.nickname);
    const girl = gs > 0 || (gs === 0 && seed % 2 === 1);
    file = girl ? GUEST_GIRLS[(seed >> 4) % GUEST_GIRLS.length] : GUEST_BOYS[(seed >> 4) % GUEST_BOYS.length];
  }
  return `<img class="chibi" src="${file}" alt="">`;
}
function setOutfit(p, outfit) {
  p.outfit = outfit;
  p.el.querySelector('.figwrap').innerHTML = figHTML(p);
  p.el.classList.toggle('wedding', outfit !== 'casual');
  p.dirty = true;
}

/* ---------- Vị trí trong phòng: ghế quanh bàn + điểm đứng ---------- */
const positions = [];            // {x, y, kind, taken}
let freePool = [];
/* ================= KHUNG BÀN CỐ ĐỊNH (chuẩn cho mọi bg sau này) =================
   Bàn tiệc ĐÃ VẼ SẴN trong ảnh toàn cảnh. Mỗi bàn = 1 ellipse (tâm x/y + bán kính
   rx/ry theo % ảnh, lớn dần về cuối phòng theo phối cảnh) — xem BG-LAYOUT.md.
   QUY TẮC CỨNG: nhân vật CHỈ đứng NGOÀI ellipse mặt bàn (ghế quanh bàn đặt chân
   ngoài mép bàn + lề an toàn; lưới điểm đứng cũng né ellipse phồng to) —
   TUYỆT ĐỐI không để chân nhân vật rơi lên mặt bàn. */
const TABLE_ROWS = [
  { y: 45, rx: 2.8, ry: 1.6, xs: [17, 24, 30, 36, 64, 70, 77, 84] },
  { y: 50, rx: 3.3, ry: 1.9, xs: [14, 22, 29, 36, 64, 71, 78, 86] },
  { y: 56, rx: 3.8, ry: 2.2, xs: [11, 20, 29, 37, 63, 71, 80, 89] },
  { y: 63, rx: 4.3, ry: 2.5, xs: [8, 18, 28, 38, 62, 72, 82, 92] },
  { y: 71, rx: 4.8, ry: 2.8, xs: [6, 16, 27, 38, 62, 73, 84, 94] },
  { y: 80, rx: 5.5, ry: 3.2, xs: [4, 14, 26, 38, 62, 74, 86, 96] },
  { y: 90, rx: 6.3, ry: 3.7, xs: [10, 24, 38, 62, 76, 90] },
];
const PAINTED_TABLES = [];
for (const r of TABLE_ROWS) for (const x of r.xs) PAINTED_TABLES.push({ x, y: r.y, rx: r.rx, ry: r.ry });
/* Điểm (x,y) có rơi vào ellipse của bàn nào không (phồng thêm mx/my %)? self = bàn được bỏ qua */
function inTable(x, y, mx, my, self) {
  for (const t of PAINTED_TABLES) {
    if (t === self) continue;
    const dx = (x - t.x) / (t.rx + mx), dy = (y - t.y) / (t.ry + my);
    if (dx * dx + dy * dy < 1) return true;
  }
  return false;
}

function buildPositions() {
  positions.length = 0;
  const tables = PAINTED_TABLES;
  for (const t of tables) {
    for (let k = 0; k < 6; k++) {
      const a = k / 6 * Math.PI * 2 + 0.26;
      // Ghế: chân đứng NGOÀI mép bàn + lề an toàn (1.7% ngang, 1.3% dọc)
      const sx = t.x + Math.cos(a) * (t.rx + 1.7);
      const sy = Math.max(43.5, t.y + Math.sin(a) * (t.ry + 1.3));
      if (inTable(sx, sy, 0.9, 0.7, t)) continue;   // ghế này lại chui vào bàn bên cạnh -> bỏ
      positions.push({ x: sx, y: sy, kind: 'seat', taken: null });
    }
  }
  for (let gx = 3.6; gx <= 96.5; gx += 2.35)
    for (let gy = FLOOR_Y + 2.4; gy <= 98.4; gy += 1.95) {
      const x = gx + rand(-0.7, 0.7), y = gy + rand(-0.5, 0.5);
      if (inTable(x, y, 1.8, 1.4, null)) continue;   // điểm đứng cũng né mặt bàn + lề
      positions.push({ x, y, kind: 'stand', taken: null });
    }
  // Ưu tiên: GHẾ QUANH BÀN trước (đúng chất tiệc cưới), từ gần sân khấu ra xa;
  // điểm đứng tự do chỉ dùng khi hết ghế — tránh khách dồn cục giữa thảm đỏ
  const fillKey = p => (p.kind === 'seat' ? 0 : 1000) + Math.hypot(p.x - 50, (p.y - 52) * 1.35) + rand(0, 14);
  freePool = positions.slice().sort((p1, p2) => fillKey(p1) - fillKey(p2));
  return tables;
}
function takePosition() {
  while (freePool.length) { const pos = freePool.shift(); if (!pos.taken) return pos; }   // lấy từ GẦN sân khấu trước (đầu mảng đã sắp xếp)
  return null;
}
function freePosition(pos) { if (pos && pos.taken) { pos.taken = null; freePool.push(pos); } }

/* ---------- Di chuyển (tính theo px trong phòng, tốc độ theo quãng đường) ---------- */
function walkPath(p, points, state, done) {
  p.path = points.slice(); p.state = state || 'walk'; p.done = done || null;
  p.target = p.path[0] || null;
  let total = 0, px = p.x, py = p.y;
  for (const q of points) { total += Math.hypot((q.x - px) / 100 * Ww, (q.y - py) / 100 * Hw); px = q.x; py = q.y; }
  p.speedPx = Math.max(170, Math.min(780, total / 4.2));
  if (p.target) p.faceLeft = p.target.x < p.x;
  p.dirty = true;
}
function walkTo(p, pt, state, done) { walkPath(p, [pt], state, done); }
function stepPerson(p, dt) {
  if (!p.target) return;
  const dxPx = (p.target.x - p.x) / 100 * Ww, dyPx = (p.target.y - p.y) / 100 * Hw;
  const dist = Math.hypot(dxPx, dyPx);
  if (dist < 6) {
    p.x = p.target.x; p.y = p.target.y;
    p.path.shift();
    if (p.path.length) { p.target = p.path[0]; p.dirty = true; return; }
    p.target = null;
    const done = p.done; p.done = null;
    if (p.state !== 'stage') p.state = p.couple ? p.state : 'home';
    p.idleFor = rand(5, 14);
    p.dirty = true;
    if (done) done();
    return;
  }
  const step = Math.min(dist, p.speedPx * dt);
  p.x += dxPx / dist * step / Ww * 100;
  p.y += dyPx / dist * step / Hw * 100;
  p.faceLeft = dxPx < -4 ? true : dxPx > 4 ? false : p.faceLeft;
  p.dirty = true;
}

function render(p) {
  const X = p.x / 100 * Ww, Y = p.y / 100 * Hw;
  const depth = 0.8 + Math.max(0, Math.min(1, (p.y - FLOOR_Y) / 62)) * 0.38;
  const stMul = (p.state === 'stage' || p.state === 'toStage') ? (p.spotScale || 1.18) : 1;
  if (p.boostCur == null) p.boostCur = p.boost || 1;
  p.boostCur += ((p.boost || 1) - p.boostCur) * 0.13;   // phóng to/thu nhỏ cũng phải mượt, không nhảy cóc
  if (Math.abs((p.boost || 1) - p.boostCur) > 0.01) p.dirty = true;
  const fh = FH * depth * stMul * p.boostCur;
  p.el.style.transform = `translate(${X.toFixed(1)}px,${Y.toFixed(1)}px) translate(-50%,-100%)`;
  p.el.style.zIndex = Math.round(Y) + (p.boost > 1 ? 6000 : 0);
  p.el.style.setProperty('--fh', fh.toFixed(0) + 'px');
  p.el.classList.toggle('flip', !!p.faceLeft);
  p.el.classList.toggle('walking', !!p.target);
  p.dirty = false;
}

/* ---------- Vòng lặp chính ---------- */
let lastT = 0;
function loop(t) {
  requestAnimationFrame(loop);
  const dt = Math.min(0.05, lastT ? (t - lastT) / 1000 : 0.016); lastT = t;
  for (const p of people.values()) {
    if (p.target) stepPerson(p, dt);
    else if (p.state === 'home' && !p.couple) {
      p.idleFor -= dt;
      if (p.idleFor <= 0) {
        p.idleFor = rand(6, 15);
        if (Math.random() < 0.13) {           // thỉnh thoảng đổi sang vị trí trống gần đó
          const np = positions.find(q => !q.taken && Math.abs(q.x - p.x) < 11 && Math.abs(q.y - p.y) < 7 && q !== p.home);
          if (np) { freePosition(p.home); np.taken = p; p.home = np; walkTo(p, { x: np.x, y: np.y }, 'walk'); }
        }
      }
    }
    if (p.dirty || p.target) render(p);
  }
  for (const c of couples) {
    if (c.state === 'stage') {
      c.timer -= dt;
      if (c.timer <= 0) leaveStage(c);
    }
  }
}

/* ---------- Sinh nhân vật ---------- */
function makeEl(user) {
  const el = document.createElement('div');
  el.className = 'person';
  const av = user.avatar
    ? `<span class="av"><img src="${esc(user.avatar)}" alt="" onerror="this.remove()"></span>`
    : `<span class="av" style="background:${avatarColor(user.id)}">${esc(initials(user.nickname))}</span>`;
  el.innerHTML = `<div class="figwrap"></div><div class="chip">${av}<span class="nm">${esc(user.nickname)}</span></div>`;
  return el;
}
P.spawn = function (user) {
  if (!user || !user.id) return null;
  const old = people.get(user.id);
  if (old) return old;
  if (people.size >= MAX_PEOPLE) return null;
  const home = takePosition();
  if (!home) return null;
  const p = {
    user, el: makeEl(user), x: home.x, y: 99.4, home, outfit: 'casual',
    state: 'walk', target: null, path: [], done: null, faceLeft: false,
    couple: null, idleFor: rand(2, 9), boost: 1, spotScale: 1, dirty: true, speedPx: 200,
  };
  home.taken = p;
  people.set(user.id, p);
  p.el.querySelector('.figwrap').innerHTML = figHTML(p);
  box.appendChild(p.el);
  render(p);
  walkTo(p, { x: home.x, y: home.y }, 'walk', () => { p.state = 'home'; });
  return p;
};
P.removeUser = function (id) {
  const p = people.get(id);
  if (!p) return;
  if (p.couple) dissolveCouple(p.couple, p);
  freePosition(p.home);
  p.el.remove();
  people.delete(id);
};
P.count = () => people.size;
P.get = id => people.get(id) || null;
P.tourTarget = function () {
  const arr = [...people.values()].filter(p => !p.couple && p.state === 'home');
  if (!arr.length) return null;
  const p = arr[Math.floor(Math.random() * arr.length)];
  return { x: p.x, y: p.y };
};

/* ---------- Ghép đôi: lia cam → đổi đồ cưới → lên sân khấu ---------- */
function notifyQueue() { if (P.onQueueChange) P.onQueueChange(stageQueue.map(c => `${c.a.user.nickname} ❤ ${c.b.user.nickname}`)); }
function rolesFor(a, b) {
  const sa = genderScore(a.user.nickname), sb = genderScore(b.user.nickname);
  const bride = sa > sb ? a : b;
  return { bride, groom: bride === a ? b : a };
}
P.makeCouple = function (userA, userB) {
  const a = P.spawn(userA), b = P.spawn(userB);
  if (!a || !b || a === b) return null;
  if (a.couple && a.couple !== b.couple) return null;
  if (b.couple && b.couple !== a.couple) return null;
  if (a.couple) return a.couple;
  const { bride, groom } = rolesFor(a, b);
  const c = { key: [a.user.id, b.user.id].sort().join('|'), a, b, bride, groom, state: 'focus', spot: -1, timer: 0 };
  a.couple = c; b.couple = c;
  couples.push(c);
  for (const p of [a, b]) { p.target = null; p.path = []; p.done = null; p.state = 'focus'; p.dirty = true; }  // đứng yên tại chỗ cho camera lia tới
  if (P.onPairFocus) P.onPairFocus(c);                    // main lia camera tới vị trí 2 người
  setTimeout(() => {                                      // camera tới nơi: đổi đồ cưới + phóng to + vòng sáng
    if (!couples.includes(c)) return;
    setOutfit(groom, 'groom'); setOutfit(bride, 'bride');
    a.boost = b.boost = P.tune.boost; a.dirty = b.dirty = true;
    a.el.classList.add('pairfx'); b.el.classList.add('pairfx');
    if (P.onPairReveal) P.onPairReveal(c);
  }, 1500);
  setTimeout(() => {                                      // rồi nắm tay nhau ra thảm đỏ lên sân khấu
    if (!couples.includes(c)) return;
    a.boost = b.boost = 1; a.dirty = b.dirty = true;
    c.state = 'queue';
    stageQueue.push(c); notifyQueue();
    promoteStage();
  }, 3600);
  return c;
};

function promoteStage() {
  /* Số cặp lên cùng lúc: vắng thì 1 cặp; có hàng chờ thì mở thêm tới tối đa
     (config soCapToiDa) — sức chứa = tổng số cặp đang có mặt, kẹp ở mức tối đa */
  const staged = stageSlots.filter(Boolean).length;
  const cap = Math.max(1, Math.min(P.tune.maxStage || 3, staged + stageQueue.length));
  let onStage = staged;
  for (let i = 0; i < 3; i++) {
    if (stageSlots[i] || !stageQueue.length || onStage >= cap) continue;
    const c = stageQueue.shift(); notifyQueue();
    c.state = 'toStage'; c.spot = i;
    stageSlots[i] = c;
    onStage++;
    c.a.spotScale = c.b.spotScale = i === 0 ? P.tune.scaleC : P.tune.scaleS;
    const y = stageY + (i ? STAGE_FRAME.sideDrop : 0);
    const off = STAGE_FRAME.pairOff[i];
    /* Xếp NỮ KỀ NỮ, NAM KỀ NAM ở đường giáp giữa các cặp:
       cặp giữa: nam trái – nữ phải; cặp 2 bên: nữ trái – nam phải */
    const leftP = i === 0 ? c.groom : c.bride;
    const rightP = i === 0 ? c.bride : c.groom;
    const yL = y + (leftP === c.groom ? STAGE_FRAME.groomDrop : 0);
    const yR = y + (rightP === c.groom ? STAGE_FRAME.groomDrop : 0);
    // Kẹp điểm đứng cuối vào đúng vùng an toàn trên bục (khung cố định)
    const clampX = v => Math.max(STAGE_FRAME.zoneX[0], Math.min(STAGE_FRAME.zoneX[1], v));
    const yMax = stageY + STAGE_FRAME.zoneDropMax;
    walkPath(leftP, [{ x: 47, y: 90 }, { x: 47, y: stageY + 7 }, { x: clampX(SPOTS[i].x - off), y: Math.min(yMax, yL) }], 'toStage');
    walkPath(rightP, [{ x: 53, y: 90 }, { x: 53, y: stageY + 7 }, { x: clampX(SPOTS[i].x + off), y: Math.min(yMax, yR) }], 'toStage', () => arriveStage(c));
    if (P.onPairWalk) P.onPairWalk(c);   // camera bám theo khi đi thảm đỏ
  }
}
function arriveStage(c) {
  if (c.state !== 'toStage') return;
  c.state = 'stage';
  c.timer = P.coupleSec || 25;
  c.a.state = 'stage'; c.b.state = 'stage';
  c.a.el.classList.remove('pairfx'); c.b.el.classList.remove('pairfx');
  if (P.onCoupleStage) P.onCoupleStage(c);
}
function leaveStage(c) {
  if (c.spot >= 0) stageSlots[c.spot] = null;
  c.spot = -1; c.state = 'court';
  c.a.spotScale = c.b.spotScale = 1;
  // người về sau: nếu còn vị trí trống sát cạnh vị trí của bạn đời thì chuyển sang ngồi cạnh
  const mover = c.b, anchor = c.a;
  const near = positions.find(q => !q.taken && q !== mover.home && Math.abs(q.x - anchor.home.x) < 4.6 && Math.abs(q.y - anchor.home.y) < 3.4);
  if (near) { freePosition(mover.home); near.taken = mover; mover.home = near; }
  let back = 0;
  for (const p of [c.a, c.b]) {
    p.el.classList.remove('pairfx');
    walkPath(p, [{ x: p.home.x < 50 ? 47 : 53, y: 90 }, { x: p.home.x, y: p.home.y }], 'walk', () => { p.state = 'home'; if (++back === 2 && P.onPairHome) P.onPairHome(c); });
  }
  if (P.onPairReturn) P.onPairReturn(c);   // camera bám theo khi đi về chỗ
  promoteStage();
}
function dissolveCouple(c, leaving) {
  const i = couples.indexOf(c); if (i >= 0) couples.splice(i, 1);
  const qi = stageQueue.indexOf(c); if (qi >= 0) { stageQueue.splice(qi, 1); notifyQueue(); }
  if (c.spot >= 0) { stageSlots[c.spot] = null; promoteStage(); }
  const other = leaving === c.a ? c.b : c.a;
  if (other && people.get(other.user.id) === other) {
    other.couple = null; other.boost = 1;
    other.el.classList.remove('pairfx');
    setOutfit(other, 'casual');
    walkTo(other, { x: other.home.x, y: other.home.y }, 'walk', () => { other.state = 'home'; });
  }
}
P.featured = () => stageSlots[0];
P.staged = () => stageSlots.map((c, i) => c ? { couple: c, spot: i } : null).filter(Boolean);
/* Thông số tinh chỉnh — main.js nạp từ config (mapping) qua setTune */
P.tune = { boost: 1.32, scaleC: 1.18, scaleS: 0.95, maxStage: 3 };
P.setTune = function (t) {
  if (!t) return;
  for (const k of ['boost', 'scaleC', 'scaleS', 'maxStage']) {
    const v = Number(t[k]);
    if (isFinite(v) && v > 0) P.tune[k] = v;
  }
};
P.coupleOf = function (uid) { const p = people.get(uid); return p ? p.couple : null; };
P.danceAll = function (sec = 5) {
  for (const p of people.values()) { p.el.classList.add('dance'); setTimeout(() => p.el.classList.remove('dance'), sec * 1000); }
};
P.setCrown = function (couple) {
  document.querySelectorAll('.person .crown').forEach(e => e.remove());
  if (!couple) return;
  for (const p of [couple.a, couple.b]) {
    if (!p || !p.el) continue;
    const s = document.createElement('span');
    s.className = 'crown'; s.textContent = '👑';
    p.el.appendChild(s);
  }
};
/* Tắt hoạt ảnh nhân vật ngoài khung camera cho nhẹ máy */
P.cull = function (x0, y0, x1, y1) {
  for (const p of people.values()) {
    const inside = p.x > x0 && p.x < x1 && p.y > y0 && p.y < y1;
    if (inside !== p.inside) { p.inside = inside; p.el.classList.toggle('far', !inside); }
  }
};

/* ---------- Khởi tạo ---------- */
P.init = function (container, tablesEl) {
  box = container; tablesBox = tablesEl || null;
  const tables = buildPositions();
  if (tablesBox) {
    tablesBox.innerHTML = '';
    for (const t of tables) {
      const d = document.createElement('div');
      d.className = 'wtable';
      d.style.left = t.x + '%'; d.style.top = t.y + '%';
      tablesBox.appendChild(d);
    }
  }
  requestAnimationFrame(loop);
};
P.resize = function (w, h) { Ww = w; Hw = h; FH = h * 0.05; for (const p of people.values()) p.dirty = true; };
P.setStageY = function (y) { stageY = y; };
P.coupleSec = 25;
