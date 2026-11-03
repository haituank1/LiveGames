/* Đám Cưới Online – cục B (game). Nhận sự kiện từ LiveBridge.
   Luật chơi v2:
   - MỌI người xem đều có nhân vật ở khuôn viên tiệc (nửa dưới): vào phòng là xuất hiện, tự đi dạo qua lại,
     mặc đồ đời thường hài hước khi chưa kết duyên.
   - Bình luận tag @tên người thương -> hai người "lên đồ" cô dâu/chú rể, nắm tay nhau lên sân khấu,
     hết giờ lại nắm tay nhau xuống khuôn viên đi dạo tiếp.
   - Quà / bình luận "pháo hoa", "hoa rơi" -> pháo hoa, mưa hoa, giấy màu theo mốc xu.
   - Sảnh cưới nâng cấp theo TỔNG LƯỢT VIEW TÍCH LŨY (không cần cùng lúc): mỗi người xem mới tính 1 lượt,
     cộng dồn qua các phiên live, lưu trong trình duyệt.
   - Cặp đôi trên sân khấu nhận điểm hạnh phúc từ quà -> bảng "Cặp đôi được yêu thích", dẫn đầu đội vương miện. */
(function () {
'use strict';
const W = (window.Wedding = window.Wedding || {});
const FX = W.effects, A = W.audio, P = W.people;
const q = new URLSearchParams(location.search);
const isDemo = q.has('demo');
const $ = id => document.getElementById(id);
const rand = (a, b) => a + Math.random() * (b - a);
const stageEl = $('stage'), statusEl = $('status');
const say = (html, cls) => { statusEl.className = cls || ''; statusEl.innerHTML = html; };

/* ============ Mốc sảnh theo TỔNG lượt view tích lũy ============ */
const TIERS = [
  { at: 0,     name: 'Lễ Ấm Áp',            file: 'bg-full.webp', royal: 0 },
  { at: 500,   name: 'Hoa Khai',            file: 'bg-full.webp', royal: 0 },
  { at: 2000,  name: 'Kim Tuyến',           file: 'bg-full.webp', royal: 0 },
  { at: 5000,  name: 'Lung Linh',           file: 'bg-full.webp', royal: 0 },
  { at: 10000, name: 'Đại Tiệc Vàng',       file: 'bg-full.webp', royal: 1 },
  { at: 20000, name: 'Đám Cưới Hoàng Gia',  file: 'bg-full.webp', royal: 2 },
];
/* Điểm đứng trên sân khấu trong PHÒNG RỘNG (% chiều cao phòng), theo từng ảnh phông */
const STAGE_Y = { 'bg-full.webp': 37.2 };   // đường đứng làm lễ: chắc chân trên mặt bục, không sát mép bậc thang
const tierOf = v => { let t = 0; TIERS.forEach((x, i) => { if (v >= x.at) t = i; }); return t; };

const LS_TOTAL = isDemo ? 'damcuoi.totalviews.demo' : 'damcuoi.totalviews';
let totalBase = parseInt(localStorage.getItem(LS_TOTAL) || '0', 10) || 0;
const counted = new Set();
let demoExtra = 0;
const totalViews = () => totalBase + counted.size + demoExtra;
let saveTimer = 0;
function persistTotal() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => localStorage.setItem(LS_TOTAL, String(totalBase + counted.size)), 1500);
}
function countView(user) {
  if (!user || !user.id || counted.has(user.id)) return;
  counted.add(user.id);
  persistTotal();
  refreshBg(false);
}

/* ============ Trạng thái ============ */
let cfg = {};
const known = new Map();       // user.id -> user (để parse tag theo tên)
const tagCooldown = new Map();
const greeted = new Set();
let lastGreet = -1e9;
const coupleByKey = new Map();
const LS = isDemo ? 'damcuoi.scores.demo' : 'damcuoi.scores';
let scores = {};
try { scores = JSON.parse(localStorage.getItem(LS) || '{}'); } catch (e) { scores = {}; }
const saveScores = () => localStorage.setItem(LS, JSON.stringify(scores));

function register(user) {
  if (!user || !user.id) return null;
  const old = known.get(user.id);
  const u = old ? { ...old, ...user, avatar: user.avatar || old.avatar } : { ...user };
  known.set(user.id, u);
  return u;
}
function ensureGuest(user) {
  const u = register(user);
  if (!u) return null;
  countView(u);
  return P.spawn(u);
}
function coupleScore(c, pts) {
  if (!c || pts <= 0) return;
  coupleByKey.set(c.key, c);
  const s = scores[c.key] || (scores[c.key] = { a: c.a.user.nickname, b: c.b.user.nickname, score: 0 });
  s.a = c.a.user.nickname; s.b = c.b.user.nickname;
  s.score += pts;
  saveScores(); renderBoard();
}
function renderBoard() {
  const top = Object.entries(scores).map(([key, s]) => ({ key, ...s })).sort((x, y) => y.score - x.score).slice(0, 3);
  const board = $('board');
  board.style.display = top.length ? '' : 'none';
  board.querySelector('ol').innerHTML = top.map((s, i) =>
    `<li><span>${i === 0 ? '👑 ' : ''}${escapeHtml(s.a)} ❤ ${escapeHtml(s.b)}</span><em>${fmtNum(s.score)}</em></li>`).join('');
  P.setCrown(top.length ? coupleByKey.get(top[0].key) : null);
  if (top.length && top[0].key !== lastLeaderKey) {
    const first = lastLeaderKey === null;
    lastLeaderKey = top[0].key;
    if (!first && Date.now() - lastLeaderAt > 25000) {
      lastLeaderAt = Date.now();
      showBanner(`👑 CẶP ĐÔI DẪN ĐẦU MỚI · ${top[0].a} ❤ ${top[0].b}`, 5000);
      FX.fireworks(2); FX.hearts(14);
    }
  }
}
let lastLeaderKey = null, lastLeaderAt = 0;
function fmtNum(n) { return n >= 10000 ? (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k' : String(n); }
function escapeHtml(s) { return String(s).replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch])); }

/* ============ MC ============ */
const MC = {
  name: 'MC',
  queue: [], busyUntil: 0, timer: null, lastLine: '',
  lines: [], funny: [], couple: [], thank: [], greet: [], follow: [], milestone: [],
};
function fill(tpl, vars) {
  return String(tpl).replace(/\{(\w+)\}/g, (m, k) => (vars[k] != null ? vars[k] : m));
}
function pick(arr, avoid) {
  if (!arr || !arr.length) return '';
  let s = arr[Math.floor(Math.random() * arr.length)], n = 0;
  while (s === avoid && arr.length > 1 && n++ < 6) s = arr[Math.floor(Math.random() * arr.length)];
  return s;
}
function mcSay(text, prio) {
  if (!text) return;
  MC.queue.push({ text, prio: prio || 1, at: performance.now() });
  MC.queue.sort((a, b) => b.prio - a.prio);
  if (MC.queue.length > 4) MC.queue.length = 4;
  mcPump();
}
function mcPump() {
  const now = performance.now();
  if (now < MC.busyUntil || !MC.queue.length) return;
  MC.queue = MC.queue.filter(m => now - m.at < 40000);
  const m = MC.queue.shift();
  if (!m) return;
  const el = $('mc');
  el.querySelector('.say b').textContent = MC.name;
  el.querySelector('.say span').textContent = m.text;
  el.classList.add('on');
  const dur = Math.min(9000, Math.max(3400, m.text.length * 95));
  MC.busyUntil = now + dur;
  setTimeout(() => { el.classList.remove('on'); setTimeout(mcPump, 350); }, dur);
}
function mcReact(prio, tplArr, vars) {
  mcSay(fill(pick(tplArr), vars || {}), prio);
}
function mcRandomLoop() {
  const lo = (cfg.mcMinSec || 18) * 1000, hi = (cfg.mcMaxSec || 26) * 1000;
  setTimeout(() => {
    const funny = Math.random() < 0.45;
    const line = pick(funny ? MC.funny : MC.lines, MC.lastLine);
    MC.lastLine = line;
    if (line) mcSay(line, 1);
    mcRandomLoop();
  }, lo + Math.random() * Math.max(0, hi - lo));
}

/* ============ Bảng hướng dẫn / luật chơi ============ */
let guideIdx = 0, guideTimer = null;
function startGuide() {
  const lines = [...(cfg.rulesLines || []), ...(cfg.guideLines || [])].filter(Boolean);
  const el = $('guide');
  if (!lines.length) { el.textContent = ''; return; }
  const show = () => { el.classList.remove('out'); el.textContent = lines[guideIdx++ % lines.length]; };
  show();
  clearInterval(guideTimer);
  guideTimer = setInterval(() => { el.classList.add('out'); setTimeout(show, 380); }, 4200);
}
function renderRules() { /* luật chơi đã gộp vào khung hướng dẫn xoay vòng cho gọn màn hình */ }

/* ============ Nền / mốc sảnh ============ */
const BG = { file: '', tier: -1 };
function applyTierFx(tier) {
  $('beams').classList.toggle('on', tier >= 2 || !!TIERS[tier].royal);
  $('royalglow').classList.toggle('on', TIERS[tier].royal === 2);
}
let bgToken = 0;
function setBackground(file) {
  P.setStageY(STAGE_Y[file] || 38.5);
  const tk = ++bgToken;
  const img = new Image();
  img.onload = () => {
    if (tk !== bgToken) return;   // đã có nền mới hơn đang tải — bỏ qua ảnh cũ về muộn
    $('bgfull').style.backgroundImage = `url("${file}")`;
  };
  img.src = file;
}

/* ============ Camera lia trong phòng rộng ============ */
let SW = 0, SH = 0, WW = 0, WH = 0;
const Cam = {
  cx: 50, cy: 36, z: 0.63, tx: 50, ty: 36, tz: 0.63, busyUntil: 0,
  apply() {
    const world = $('world');
    if (!world || !WW) return;
    const px = SW / 2 - (this.cx / 100 * WW) * this.z;
    const py = SH / 2 - (this.cy / 100 * WH) * this.z;
    world.style.transform = `translate(${px.toFixed(1)}px,${py.toFixed(1)}px) scale(${this.z})`;
  },
  cullNow() {
    const mx = (SW / 2) / this.z / WW * 100 + 7, my = (SH / 2) / this.z / WH * 100 + 7;
    P.cull(this.cx - mx, this.cy - my, this.cx + mx, this.cy + my);
  },
  clampXY(cx, cy, z) {
    // Kẹp tâm camera để khung hình không lia ra ngoài phòng (tránh dải đen)
    const halfW = (SW / 2) / z / WW * 100, halfH = (SH / 2) / z / WH * 100;
    const mX = Math.min(halfW, 49), mY = Math.min(halfH, 49);
    return [Math.max(mX, Math.min(100 - mX, cx)), Math.max(mY, Math.min(100 - mY, cy))];
  },
  panTo(cx, cy, z) {
    const [x, y] = this.clampXY(cx, cy, z);
    this.tx = x; this.ty = y; this.tz = z;
  },
  snap() { this.cx = this.tx; this.cy = this.ty; this.z = this.tz; this.apply(); this.cullNow(); },
  followC: null, farPair: null,
  follow(couple) { this.followC = couple; this.busyUntil = 0; },
  unfollow() { this.followC = null; this.farPair = null; },
  home() { this.panTo(50, 36, 0.63); },
  stage() { this.panTo(50, 34, 1.02); },
  toScreen(x, y) {
    return { fx: 0.5 + (x - this.cx) / 100 * WW * this.z / SW, fy: 0.5 + (y - this.cy) / 100 * WH * this.z / SH };
  },
};
/* Zoom vừa đủ để CẢ HAI người lọt khung hình (dựa trên khoảng cách giữa họ) */
function fitZoom(a, b, padX, padY, zMax) {
  const zx = 31.25 / (Math.abs(a.x - b.x) + padX);
  const zy = 45.45 / (Math.abs(a.y - b.y) + padY);
  return Math.max(0.55, Math.min(zMax, zx, zy));
}
/* Vòng camera chạy theo rAF (60fps, khớp nhịp vẽ của trình duyệt).
   Dùng lò xo giảm chấn (smooth-damp): vận tốc bắt đầu từ 0, tăng tốc dần rồi
   chậm dần khi tới đích — như máy quay thật, không giật đầu/giật cuối. */
function damp(cur, target, vel, smoothTime, dt) {
  const omega = 2 / smoothTime;
  const x = omega * dt;
  const e = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);
  const change = cur - target;
  const temp = (vel + omega * change) * dt;
  let v = (vel - omega * temp) * e;
  let out = target + (change + temp) * e;
  if ((target - cur > 0) === (out > target)) { out = target; v = 0; }  // chống vọt qua đích
  return [out, v];
}
let camLastT = 0, camCullT = 0;
function camLoop(t) {
  requestAnimationFrame(camLoop);
  if (!WW) return;
  const dt = Math.min(0.05, camLastT ? (t - camLastT) / 1000 : 0.016);
  camLastT = t;
  const c = Cam.followC;
  if (c && c.a && c.b) {
    Cam.tz = fitZoom(c.a, c.b, 16, 14, cfg.zoomBamTheo || 1.08);
    const mx = (c.a.x + c.b.x) / 2, my = (c.a.y + c.b.y) / 2 - 2.5;
    const [x, y] = Cam.clampXY(mx, my, Cam.tz);
    Cam.tx = x; Cam.ty = y;
  }
  [Cam.cx, Cam.vx] = damp(Cam.cx, Cam.tx, Cam.vx || 0, 0.55, dt);
  [Cam.cy, Cam.vy] = damp(Cam.cy, Cam.ty, Cam.vy || 0, 0.55, dt);
  [Cam.z, Cam.vz] = damp(Cam.z, Cam.tz, Cam.vz || 0, 0.75, dt);
  Cam.apply();
  if (t - camCullT > 220) { camCullT = t; Cam.cullNow(); }
}
requestAnimationFrame(camLoop);
P.onPairFocus = function (c) {
  Cam.unfollow();
  Cam.busyUntil = Date.now() + 11000;
  const zFit = fitZoom(c.a, c.b, 17, 15, cfg.zoomGoiTen || 1.18);
  if (zFit >= 0.62) {
    // Đủ gần nhau: 1 cú lia tới điểm giữa, zoom vừa đủ thấy cả hai
    Cam.panTo((c.a.x + c.b.x) / 2, (c.a.y + c.b.y) / 2 - 2, zFit);
  } else {
    // Ở quá xa nhau: lia cận cảnh người A trước, lát đổi đồ xong lia sang người B
    Cam.farPair = c;
    Cam.panTo(c.a.x, c.a.y - 2, cfg.zoomGoiTen || 1.18);
  }
};
P.onPairWalk = function (c) { Cam.follow(c); };       // bám theo lúc đi thảm đỏ lên sân khấu
P.onPairReturn = function (c) { Cam.follow(c); };     // bám theo lúc đi về chỗ
P.onPairHome = function (c) {                          // về tới nơi: nhả camera, quay về toàn cảnh
  if (Cam.followC === c) { Cam.unfollow(); Cam.home(); }
};

P.onPairReveal = function (c) {
  const far = Cam.farPair === c;
  const fp = far ? c.a : { x: (c.a.x + c.b.x) / 2, y: (c.a.y + c.b.y) / 2 };
  const mid = Cam.toScreen(fp.x, fp.y);
  if (FX.ringHearts) FX.ringHearts(mid.fx, mid.fy - 0.05);
  if (FX.petalBurst) FX.petalBurst(mid.fx, mid.fy);
  FX.hearts(12, mid.fx, mid.fy);
  mcReact(2.5, MC.couple, { a: c.a.user.nickname, b: c.b.user.nickname });
  if (far) {
    // Cặp ở xa nhau: vừa đổi đồ cho A xong thì lia sang B cho khán giả thấy B lên đồ
    Cam.farPair = null;
    setTimeout(() => { if (!Cam.followC) Cam.panTo(c.b.x, c.b.y - 2, cfg.zoomGoiTen || 1.18); }, 350);
  }
};
function bgFileFor(total) {
  const rules = Array.isArray(cfg.bgRules) ? cfg.bgRules.filter(r => r && r.file).slice().sort((a, b) => a.viewers - b.viewers) : [];
  let file = 'bg-full.webp';
  for (const r of rules) if (total >= r.viewers) file = r.file;
  return file;
}
function refreshBg(announce) {
  const total = totalViews();
  const tier = tierOf(total);
  const file = bgFileFor(total);
  if (file !== BG.file) { BG.file = file; setBackground(file); }
  if (tier !== BG.tier) {
    const old = BG.tier;
    BG.tier = tier;
    FX.setTier(tier);
    P.setTierLevel(tier);
    applyTierFx(tier);
    if (announce && old >= 0) {
      showBanner(`🎉 SẢNH CƯỚI NÂNG CẤP · ${TIERS[tier].name}`, 6000);
      mcReact(4, MC.milestone, { moc: TIERS[tier].name });
      FX.fireworks(8); FX.petals(180); A.bell(3);
      if (FX.cannon) FX.cannon();
      if (FX.envelopes) FX.envelopes(60);
      if (FX.glitter) FX.glitter(140);
      if (FX.bokeh) FX.bokeh(14);
      const fl = $('flash'); fl.classList.remove('on'); void fl.offsetWidth; fl.classList.add('on');
    }
  }
  const cur = TIERS[tier], next = TIERS[tier + 1];
  const goal = $('goal');
  goal.style.display = '';
  if (next) {
    const pct = Math.max(0, Math.min(100, (total - cur.at) / (next.at - cur.at) * 100));
    $('goaltext').innerHTML = `🎉 <span class="tiername">${cur.name}</span> · 👁 tổng ${fmtNum(total)} lượt xem — còn ${fmtNum(next.at - total)} lượt nữa lên ${next.name}`;
    $('goalbar').style.width = pct + '%';
  } else {
    $('goaltext').innerHTML = `👑 <span class="tiername">${cur.name}</span> · 👁 tổng ${fmtNum(total)} lượt xem — cảm ơn cả nhà!`;
    $('goalbar').style.width = '100%';
  }
}

/* ============ Banner nghi thức giữa sân khấu ============ */
let bannerTimer = 0;
function showBanner(text, ms = 4600) {
  const el = $('banner');
  if (!el) return;
  el.textContent = text;
  el.classList.add('on');
  clearTimeout(bannerTimer);
  bannerTimer = setTimeout(() => el.classList.remove('on'), ms);
}

/* ============ Ghép đôi ============ */
function parseTag(text, self) {
  if (!text || !text.includes('@')) return null;
  const lower = text.toLocaleLowerCase('vi');
  let best = null, bestLen = 0;
  for (const u of known.values()) {
    if (self && u.id === self.id) continue;
    for (const cand of [u.nickname, u.uniqueId]) {
      if (!cand) continue;
      const c = String(cand).toLocaleLowerCase('vi');
      if (c.length >= 2 && lower.includes('@' + c) && c.length > bestLen) { best = u; bestLen = c.length; }
    }
  }
  if (best) return best;
  const m = text.match(/@([^\s@,;:!?]+(?: [^\s@,;:!?]+){0,2})/);
  if (!m) return null;
  const STOP = ['cưới', 'ơi', 'ơi!', 'yêu', 'nhé', 'nha', 'nè', 'đi', 'à', 'ạ', 'quá', 'lắm', 'luôn', 'không', 'ko', 'hông', 'với', 'và', 'của', 'làm', 'cho', 'em', 'anh', 'chị', 'mình', 'tớ', 'tao', 'mày'];
  const words = m[1].split(/\s+/).filter(Boolean);
  while (words.length && (STOP.includes(words[words.length - 1].toLocaleLowerCase('vi')) || words[words.length - 1].length === 1)) words.pop();
  const name = words.join(' ').trim();
  if (name.length < 2) return null;
  for (const u of known.values()) {
    if (self && u.id === self.id) continue;
    if (String(u.nickname).toLocaleLowerCase('vi') === name.toLocaleLowerCase('vi')) return u;
  }
  return { id: 'tag:' + name.toLocaleLowerCase('vi').replace(/\s+/g, '-'), nickname: name, avatar: '' };
}
function randomSingle(except) {
  const singles = [];
  for (const u of known.values()) {
    if (except && u.id === except.id) continue;
    const p = P.get(u.id);
    if (p && !p.couple) singles.push(u);
  }
  return singles.length ? singles[Math.floor(Math.random() * singles.length)] : null;
}
function requestCouple(a, b, viaTag) {
  const ua = register(a), ub = register(b);
  if (!ua || !ub || ua.id === ub.id) return null;
  const now = performance.now();
  if (viaTag) {
    if (now - (tagCooldown.has(ua.id) ? tagCooldown.get(ua.id) : -1e9) < 20000) return null;
    tagCooldown.set(ua.id, now);
  }
  const c = P.makeCouple(ua, ub);
  if (!c) {
    mcSay(`Ôi, một trong hai bạn đã có đôi rồi, MC không phá hạnh phúc nhà người ta được đâu nha!`, 2);
    return null;
  }
  coupleByKey.set(c.key, c);
  toast(`${ua.nickname} ❤ ${ub.nickname} — đang lên sân khấu!`, false);
  return c;
}
P.onCoupleStage = function (c) {
  coupleScore(c, 30);
  if (BG.tier >= 4) P.setCrown(c);   // mốc Hoàng Gia (10.000+): cặp nào lên bục cũng đội vương miện
  Cam.unfollow();
  Cam.busyUntil = Date.now() + 9000;
  Cam.stage();
  showBanner(`💍 LỄ THÀNH HÔN · ${c.a.user.nickname} ❤ ${c.b.user.nickname}`);
  const sp = Cam.toScreen(c.a.x, c.a.y);
  if (FX.cannon) FX.cannon();
  FX.petals(60);
  if (FX.petalBurst) FX.petalBurst(sp.fx, sp.fy);
  if (FX.ringHearts) FX.ringHearts(sp.fx, sp.fy - 0.09);
  const spot = $('spot'); if (spot) spot.classList.add('on');
};
P.onQueueChange = function (names) {
  const el = $('queue');
  el.innerHTML = names.length
    ? `<b>💌 Cặp chờ lên sân khấu:</b>` + names.map(n => `<div class="qrow">💞 ${escapeHtml(n)}</div>`).join('')
    : '';
};

/* ============ Toast ============ */
function toast(text, vip) {
  const box = $('toasts');
  const t = document.createElement('div');
  t.className = 'toast' + (vip ? ' vip' : '');
  t.textContent = text;
  box.prepend(t);
  while (box.children.length > 2) box.lastChild.remove();
  setTimeout(() => t.classList.add('out'), 6000);
  setTimeout(() => t.remove(), 6600);
}

/* ============ Hiệu ứng theo quà ============ */
const GIFT_TIERS = [
  { min: 500, petals: 260, confetti: 160, fw: 6 },
  { min: 99, petals: 180, confetti: 110, fw: 4 },
  { min: 30, petals: 130, confetti: 60, fw: 2 },
  { min: 10, petals: 90, confetti: 30, fw: 1 },
  { min: 5, petals: 55, confetti: 0, fw: 0 },
  { min: 1, petals: 30, confetti: 0, fw: 0 },
];
function giftFx(diamonds) {
  const t = GIFT_TIERS.find(x => diamonds >= x.min) || GIFT_TIERS[GIFT_TIERS.length - 1];
  if (t.petals) FX.petals(t.petals);
  if (t.confetti) FX.confetti(t.confetti);
  if (t.fw) FX.fireworks(t.fw);
  if (diamonds >= 10 && FX.glitter) FX.glitter(Math.min(120, 20 + diamonds));
  if (diamonds >= 30 && FX.envelopes) FX.envelopes(diamonds >= 99 ? 90 : 40);
  if (diamonds >= 99) {
    if (FX.cannon) FX.cannon();
    if (FX.bokeh) FX.bokeh(10);
    const fl = $('flash'); fl.classList.remove('on'); void fl.offsetWidth; fl.classList.add('on');
  }
}

/* ============ Nhận sự kiện ============ */
function onChat(m) {
  if (!m.user) return;
  ensureGuest(m.user);
  const text = String(m.text || '');
  const partner = parseTag(text, m.user);
  if (partner) { requestCouple(m.user, partner, true); return; }
  const low = text.toLocaleLowerCase('vi');
  if (/(pháo\s*hoa|phao\s*hoa)/.test(low)) { FX.fireworks(3); return; }
  if (/(hoa\s*rơi|mưa\s*hoa|hoa\s*roi)/.test(low)) { FX.petals(120); return; }
}
function greet(user) {
  const now = performance.now();
  if (!user || greeted.has(user.id) || now - lastGreet < 8000) return;
  greeted.add(user.id); lastGreet = now;
  mcReact(1, MC.greet, { ten: user.nickname });
}
function handle(ev) {
  const src = ev.source || {};
  if (ev.user) ensureGuest(ev.user);
  if (ev.action === 'join' && ev.user) greet(ev.user);
  if (ev.action === 'couple') {
    const partner = (src.text && parseTag(src.text, ev.user)) || randomSingle(ev.user);
    if (ev.user && partner) requestCouple(ev.user, partner, true);
  } else if (ev.action === 'spotlight') {           // follow
    if (!ev.user) return;
    const partner = randomSingle(ev.user);
    if (partner) requestCouple(ev.user, partner, false);
    else FX.hearts(12, 0.5, 0.6);
    mcReact(3.2, MC.follow, { ten: ev.user.nickname });
  } else if (ev.action === 'dance') {
    P.danceAll(5);
  } else if (ev.action === 'fireworks') {
    FX.fireworks(Math.max(1, Math.min(6, ev.value || 1)));
  } else if (ev.action === 'petals') {
    FX.petals(60 + (ev.value || 1) * 40);
  } else if (ev.action === 'confetti') {
    FX.confetti(50 + (ev.value || 1) * 25);
  }

  if (src.kind === 'gift') {
    const dia = Math.max(0, Number(ev.diamonds || ev.value || 1));
    const featured = P.featured() || P.coupleOf(ev.user && ev.user.id);
    if (featured) coupleScore(featured, dia * 50);
    giftFx(dia);
    if (dia >= 99) showBanner(`🎁 ${ev.user ? ev.user.nickname : 'Khách quý'} VỪA MỪNG CƯỚI LỚN!`, 5200);
    A.bell(dia >= 30 ? 3 : 1);
    mcReact(3, MC.thank, { ten: ev.user ? ev.user.nickname : 'Bạn' });
    toast(`🎁 ${ev.user ? ev.user.nickname : 'Khách'} tặng ${src.giftName || 'quà'}${dia >= 99 ? ' — pháo hoa rực trời!' : ''}`, dia >= 30);
  }
  refreshBg(false);
}
function onBlock(m) {
  for (const raw of [m && m.userId, m && m.uniqueId]) {
    if (!raw) continue;
    for (const [id] of known) {
      if (id === raw) { P.removeUser(id); known.delete(id); }
    }
  }
}

/* ============ Cấu hình ============ */
function applyConfig(c) {
  cfg = c || {};
  if (cfg.mcName) MC.name = cfg.mcName;
  MC.lines = cfg.mcLines || []; MC.funny = cfg.mcFunny || []; MC.couple = cfg.mcCouple || [];
  MC.thank = cfg.mcThank || []; MC.greet = cfg.mcGreet || []; MC.follow = cfg.mcFollowLines || [];
  MC.milestone = cfg.mcMilestone || [];
  if (cfg.coupleSec) P.coupleSec = cfg.coupleSec;
  P.setTune({ boost: cfg.phongToGoiTen, scaleC: cfg.coCapGiua, scaleS: cfg.coCapBen, maxStage: cfg.soCapToiDa, pairOffC: cfg.lechCapGiua, pairOffS: cfg.lechCapBen, spotSide: cfg.tamCapBen });
  FX.setTier(BG.tier < 0 ? 0 : BG.tier);
  A.setConfig(cfg);
  renderRules(); startGuide(); renderBoard(); refreshBg(false);
}

/* ============ Khung hình 9:16 ============ */
let lastLayoutKey = '';
function resize() {
  const Wpx = innerWidth, Hpx = innerHeight;
  const narrow = Math.min(Wpx / Hpx, 9 / 16);
  const sw = narrow * Hpx, sh = Hpx;
  const key = [Wpx, Hpx, document.fullscreenElement ? 1 : 0].join('|');
  if (key === lastLayoutKey) return;
  lastLayoutKey = key;
  const u0 = sw / 100;
  const root = document.documentElement.style;
  root.setProperty('--u0', u0 + 'px');
  const compact = navigator.webdriver || /live|obs/i.test(navigator.userAgent) || q.has('compact') ? 0 : 1;
  stageEl.style.width = sw + 'px'; stageEl.style.height = sh + 'px';
  if (compact) {
    const fitW = Math.max(0, (Wpx - sw) / 2), top = Math.max(0, innerHeight * 0.10);
    root.setProperty('--k', u0 < 2.8 && Hpx > Wpx ? '1.55' : '1');
    root.setProperty('--safe', top + 'px');
    root.setProperty('--side', fitW + 'px');
  } else {
    root.setProperty('--k', '1.2'); root.setProperty('--safe', '0px'); root.setProperty('--side', '0px');
  }
  FX.resize(sw, sh, Math.min(2, window.devicePixelRatio || 1));
  SW = sw; SH = sh; WW = Math.round(sw * 3.2); WH = Math.round(sh * 2.2);
  const world = $('world');
  world.style.width = WW + 'px'; world.style.height = WH + 'px';
  P.resize(WW, WH);
  Cam.apply(false);
}
addEventListener('resize', resize);
document.addEventListener('fullscreenchange', () => { lastLayoutKey = ''; resize(); });
setInterval(resize, 2000);
setInterval(() => { const sp = $('spot'); if (sp && !P.featured()) sp.classList.remove('on'); }, 3000);

/* Hiệu ứng ÂU YẾM riêng cho từng cặp đang trên bục — mỗi vị trí 1 kiểu khác nhau:
   cặp giữa: suối tim + vòng tim · cặp trái: mưa cánh hoa · cặp phải: vòng tim + hoa xen kẽ */
let loveTick = 0;
setInterval(() => {
  if (!P.staged) return;
  loveTick++;
  for (const s of P.staged()) {
    const c = s.couple;
    if (c.state !== 'stage') continue;
    const mid = Cam.toScreen((c.a.x + c.b.x) / 2, (c.a.y + c.b.y) / 2);
    if (s.spot === 0) {
      FX.hearts(9, mid.fx, mid.fy - 0.04);
      if (loveTick % 2 === 0 && FX.ringHearts) FX.ringHearts(mid.fx, mid.fy - 0.05);
    } else if (s.spot === 1) {
      if (FX.petalBurst) FX.petalBurst(mid.fx, mid.fy);
      FX.hearts(4, mid.fx, mid.fy - 0.03);
    } else {
      if (loveTick % 2 === 0) { if (FX.ringHearts) FX.ringHearts(mid.fx, mid.fy - 0.05); }
      else if (FX.petalBurst) FX.petalBurst(mid.fx, mid.fy);
      FX.hearts(5, mid.fx, mid.fy - 0.03);
    }
  }
}, 2400);

/* ============ Âm thanh: nút bật tiếng ============ */
function setupSoundBtn() {
  const btn = $('sound');
  A.init();
  const upd = () => { btn.style.display = A.state() === 'running' ? 'none' : ''; };
  setTimeout(upd, 1200);
  btn.addEventListener('click', () => { A.resume(); setTimeout(upd, 300); });
}

/* ============ Khởi động ============ */
FX.init($('fx'));
P.init($('people'), $('tables'));
resize();
Cam.home();
refreshBg(false);
/* Rảnh rỗi lâu thì camera tự lia đi ngắm khách một vòng rồi về sân khấu */
setInterval(() => {
  if (Date.now() < Cam.busyUntil || P.featured() || Cam.followC) return;
  const t = P.tourTarget && P.tourTarget();
  if (t && Math.random() < 0.75) {
    Cam.busyUntil = Date.now() + 13000;
    Cam.panTo(t.x, t.y - 2, 0.95);
    setTimeout(() => { if (Date.now() >= Cam.busyUntil - 100) Cam.home(); }, 7000);
  }
}, 20000);
setInterval(() => { if (TIERS[BG.tier] && TIERS[BG.tier].royal === 2) FX.fireworks(2); }, 25000);

if (isDemo) {
  say('<span style="color:#ffd76a">● CHẾ ĐỘ DEMO</span> — xem thử, không cần LIVE thật', 'demo');
  applyConfig({
    mcName: 'MC Anh Tú',
    coupleSec: 25,
    phongToGoiTen: 1.32, coCapGiua: 1.05, coCapBen: 1.05, soCapToiDa: 3,
    zoomGoiTen: 1.18, zoomBamTheo: 1.08, lechCapGiua: 1.8, lechCapBen: 1.7, tamCapBen: 42,
    mcMinSec: 16, mcMaxSec: 24,
    bgRules: [
      { viewers: 500, file: 'bg-full.webp' }, { viewers: 2000, file: 'bg-full.webp' },
      { viewers: 5000, file: 'bg-full.webp' }, { viewers: 10000, file: 'bg-full.webp' }, { viewers: 20000, file: 'bg-full.webp' },
    ],
    rulesLines: ['💌 Tag @tên người thương → cùng lên sân khấu', '🎁 Quà càng lớn, pháo hoa càng to', '👁 Tổng lượt xem càng cao → sảnh cưới càng xịn'],
    guideLines: ['💌 Gõ "@tên người thương" → 2 bạn lên sân khấu', '🎁 Tặng quà → pháo hoa cho cặp đôi tâm điểm', '👑 Cặp được tặng nhiều quà nhất sẽ đội vương miện', '👁 Kéo bạn bè vào xem → sảnh nâng cấp theo tổng lượt view'],
    mcLines: ['Một đám cưới vui là khi khách mời cười nhiều hơn cô dâu chú rể.', 'Tình yêu không cần hoàn hảo, chỉ cần hai người cùng tag nhau lên sân khấu là đủ.', 'Cả nhà thả tim thật nhiều để chúc phúc cho các cặp đôi nhé!'],
    mcFunny: ['MC dặn nhỏ: tag người yêu cũ vào đây MC tính phí gấp đôi nhé!', 'Ai còn độc thân giơ tay, MC nhìn thấy hết đấy, đừng trốn sau hàng ghế nữa!', 'Đi ăn cưới online mà không mất tiền mừng, thời đại này sướng thật!'],
    mcCouple: ['Xin giới thiệu cặp đôi {a} và {b} — hai bạn bước lên sân khấu trong tiếng vỗ tay của cả nhà!', 'Trời sinh một cặp: {a} ❤ {b}! Cả nhà thả tim chúc phúc nào!'],
    mcThank: ['{ten} chơi lớn quá! Cặp đôi trên sân khấu thay mặt hai họ cảm ơn bạn!', 'Cảm ơn {ten} đã mừng cưới thật hậu hĩnh!'],
    mcGreet: ['Chào mừng {ten} đã đến dự đám cưới online của chúng ta!', 'Khách quý {ten} vừa đến! Mời bạn vào khuôn viên chọn chỗ đẹp nhé!'],
    mcFollowLines: ['Cảm ơn {ten} đã follow! MC se duyên cho bạn ngay đây!'],
    mcMilestone: ['CẢ NHÀ ƠI! Sảnh cưới đã nâng cấp lên mốc {moc} nhờ tổng lượt xem tăng vọt!'],
    musicOn: true, musicVolume: 0.5, sfxOn: true, sfxVolume: 0.8,
  });
  setupSoundBtn();
  startDemo();
} else {
  const client = new LiveBridgeClient({
    game: 'dam-cuoi',
    onConfig: applyConfig,
    onEvent: handle,
    onChat: onChat,
    onBlock: onBlock,
    onStatus: st => {
      if (st.state === 'live') { say('● LIVE — ' + (st.username ? '@' + st.username : ''), 'ok'); refreshBg(false); }
      else if (st.state === 'error') say('⚠ ' + (st.message || 'Lỗi kết nối TikTok'), 'err');
      else say('Đang chờ kết nối LIVE…', '');
    },
  });
  client.connect();
  setTimeout(setupSoundBtn, 300);
}
mcRandomLoop();

/* ============ Demo ============ */
function startDemo() {
  const names = ['Xuân Mai', 'Minh Tuấn', 'Thu Hằng', 'Văn Đức', 'Ngọc Anh', 'Hoàng Nam', 'Khánh Linh', 'Tuấn Anh', 'Mỹ Linh', 'Đức Huy', 'Phương Thảo', 'Hải Yến', 'Quốc Bảo', 'Thanh Tùng', 'Bảo Trâm', 'Văn Hải'];
  const users = names.map((n, i) => ({ id: 'demo' + i, nickname: n, avatar: '' }));
  users.forEach((u, i) => setTimeout(() => { ensureGuest(u); greet(u); }, 400 + i * 550));
  const chats = [
    u => ({ user: u, text: '@' + users[(users.indexOf(u) + 3) % users.length].nickname + ' cưới nhau đi' }),
    u => ({ user: u, text: '@' + users[(users.indexOf(u) + 5) % users.length].nickname + ' ơi yêu quá' }),
    () => ({ user: users[Math.floor(Math.random() * users.length)], text: 'pháo hoa đẹp quá' }),
    () => null,
  ];
  let k = 0;
  setInterval(() => {
    const u = users[Math.floor(Math.random() * users.length)];
    const r = Math.random();
    k++;
    if (r < 0.42) { const c = chats[k % chats.length](u); if (c) onChat(c); }
    else if (r < 0.62) handle({ action: 'petals', value: 1, count: 1, user: u, source: { kind: 'like' } });
    else if (r < 0.8) handle({ action: 'couple', value: 1, count: 1, user: u, diamonds: [1, 5, 10, 39, 99][Math.floor(Math.random() * 5)], source: { kind: 'gift', giftName: 'Rose' } });
    else handle({ action: 'spotlight', value: 1, count: 1, user: u, source: { kind: 'follow' } });
    demoExtra += Math.floor(rand(6, 18));
    refreshBg(false);
  }, 2600);
  setInterval(() => { demoExtra += Math.floor(rand(30, 90)); refreshBg(false); }, 5000);
}

W.handle = handle; W.chat = onChat; W.parseTag = parseTag; W.peopleApi = P;
})();
