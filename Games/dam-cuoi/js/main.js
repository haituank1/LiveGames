/* Đám Cưới Online – cục B (game). Nhận sự kiện từ LiveBridge.
   Luật chính:
   - Bình luận tag tên một người -> người bình luận + người được tag cùng lên sân khấu làm cặp đôi.
   - Quà / bình luận "pháo hoa", "hoa rơi" -> pháo hoa, mưa hoa, giấy màu theo mốc xu.
   - Số mắt xem đạt mốc -> sân khấu nâng cấp (đổi nền + thêm tia sáng / hào quang), MC thông báo.
   - Cặp đôi đang ở vị trí tâm điểm nhận điểm hạnh phúc từ quà tặng lúc đó -> bảng "Cặp đôi được yêu thích".
   Tham số URL: ?demo=1 (tự chạy giả lập), ?debug=1 (hiện trạng thái kết nối), ?bridge=ws://localhost:8787 */
(function () {
'use strict';
const W = window.Wedding, E = W.effects, S = W.stage, A = W.audio;
const GAME_ID = 'dam-cuoi';
const q = new URLSearchParams(location.search);
const cfg = { bridge: q.get('bridge') || 'ws://localhost:8787', demo: q.has('demo'), debug: q.has('debug') };
const $ = id => document.getElementById(id);

/* ---------- Khung hình 9:16 ---------- */
const stage = $('stage');
let Wpx = 0, Hpx = 0;
function resize() {
  if (innerWidth / innerHeight > 9 / 16) { Hpx = innerHeight; Wpx = Hpx * 9 / 16; } else { Wpx = innerWidth; Hpx = Wpx * 16 / 9; }
  Wpx = Math.round(Wpx); Hpx = Math.round(Hpx);
  stage.style.width = Wpx + 'px'; stage.style.height = Hpx + 'px';
  document.documentElement.style.setProperty('--u0', (Wpx / 100) + 'px');
  const dpr = Math.min(devicePixelRatio || 1, 1.5);
  E.resize(Wpx, Hpx, dpr);
  S.resize(Hpx);
}
E.init($('fx'));
S.init($('couples'));
A.init();
const soundBtn = $('sound');
const syncSoundBtn = () => { soundBtn.style.display = A.state() === 'suspended' ? '' : 'none'; };
A.onState = syncSoundBtn;
soundBtn.onclick = () => A.resume();
setTimeout(syncSoundBtn, 600);
addEventListener('resize', resize);

/* ---------- Mốc mắt xem & đổi nền ----------
   anchor = % chiều cao khung nơi chân cặp đôi đứng (mỗi nền sàn sân khấu ở độ cao khác nhau). */
const FILE_ANCHOR = { 'bg.webp': 87, 'bg-1.webp': 90.5, 'bg-2.webp': 78, 'bg-3.webp': 88.5 };
const TIERS = [
  { views: 0, name: 'Lễ Ấm Áp', bg: 'bg.webp', royal: 0 },
  { views: 100, name: 'Hoa Khai', bg: 'bg-1.webp', royal: 0 },
  { views: 300, name: 'Kim Tuyến', bg: 'bg-2.webp', royal: 0 },
  { views: 500, name: 'Lung Linh', bg: 'bg-3.webp', royal: 0 },
  { views: 1000, name: 'Đại Tiệc Vàng', bg: 'bg-3.webp', royal: 1 },
  { views: 2000, name: 'Đám Cưới Hoàng Gia', bg: 'bg-3.webp', royal: 2 },
];
const BG = { viewers: 0, room: 0, tier: 0, shown: '', seq: 0, rules: null };
function tierOf(v) { let t = 0; TIERS.forEach((x, i) => { if (v >= x.views) t = i; }); return t; }
function bgFileFor(v) {
  if (BG.rules) {   // trang quản trị có thể ghi đè file nền theo mốc (bgRules)
    let pick = 'bg.webp', best = -1;
    for (const r of BG.rules) if (r.views <= v && r.views > best) { best = r.views; pick = r.bg; }
    return pick;
  }
  return TIERS[tierOf(v)].bg;
}
function setBackground(file) {
  if (file === BG.shown) return;
  BG.shown = file;
  S.setAnchor(FILE_ANCHOR[file] || 87);
  const seq = ++BG.seq;
  const img = new Image();
  img.onload = () => {
    if (seq !== BG.seq) return;
    const fade = $('bgfade');
    fade.style.backgroundImage = `url("${file}")`;
    fade.style.opacity = 1;
    setTimeout(() => {
      if (seq !== BG.seq) return;
      $('bgmain').style.backgroundImage = `url("${file}")`;
      fade.style.transition = 'none'; fade.style.opacity = 0;
      void fade.offsetWidth; fade.style.transition = '';
    }, 1600);
  };
  img.src = file;
}
function updateGoal() {
  const v = BG.viewers, t = tierOf(v), goal = $('goal');
  goal.style.display = '';
  if (t >= TIERS.length - 1) {
    $('goaltext').innerHTML = `👑 Đang ở mốc cao nhất: <span class="tiername">${TIERS[t].name}</span> · 👁 ${v}`;
    $('goalbar').style.width = '100%';
    return;
  }
  const cur = TIERS[t], next = TIERS[t + 1];
  const pct = Math.max(0, Math.min(100, (v - cur.views) / (next.views - cur.views) * 100));
  $('goaltext').innerHTML = `🎉 ${cur.name} · 👁 ${v} — còn <b>${next.views - v}</b> mắt nữa lên <span class="tiername">${next.name}</span>`;
  $('goalbar').style.width = pct + '%';
}
function applyTierFx() {
  const royal = TIERS[BG.tier].royal;
  $('beams').classList.toggle('on', royal >= 1);
  $('royalglow').classList.toggle('on', royal >= 2);
  E.setTier(BG.tier);
}
function refreshBg(announce = true) {
  const now = performance.now();
  for (const [id, t] of seenAt) if (now - t >= SEEN_MS) seenAt.delete(id);
  BG.viewers = isLive ? BG.room : (cfg.demo ? BG.demoViewers || seenAt.size : seenAt.size);
  const t = tierOf(BG.viewers);
  if (t !== BG.tier) {
    const up = t > BG.tier;
    BG.tier = t;
    applyTierFx();
    if (up && announce && BG.viewers > 0) {
      mcReact(4, MC.milestone.map(x => x.replace(/\{moc\}/g, TIERS[t].name)), null, 7);
      E.fireworksShow(6, 320); E.petals(160);
      flash();
    }
  }
  setBackground(bgFileFor(BG.viewers));
  updateGoal();
}
const SEEN_MS = 5 * 60000;
const seenAt = new Map();
function markSeen(id) { if (id) seenAt.set(id, performance.now()); }
setInterval(() => refreshBg(), 3000);
/* Mốc Hoàng Gia (2.000+): pháo hoa chúc mừng định kỳ cho sảnh luôn rộn ràng */
setInterval(() => { if (TIERS[BG.tier].royal >= 2 && (isLive || cfg.demo)) E.fireworksShow(3, 380); }, 25000);
W.setViewers = n => { BG.room = n; refreshBg(); };

/* ---------- Người xem đã biết (để khớp tên khi tag) ---------- */
const known = new Map();   // id -> user
function register(user) {
  if (!user || !user.id) return;
  known.set(user.id, { ...(known.get(user.id) || {}), ...user });
  if (known.size > 3000) known.delete(known.keys().next().value);
}
/* Tìm người được tag trong câu bình luận: ưu tiên khớp nickname/uniqueId của người đang xem,
   không khớp ai thì lấy phần chữ sau @ (cắt ở các từ dừng thường gặp). */
const STOP = ['ơi', 'nhé', 'nha', 'à', 'ạ', 'yêu', 'thương', 'cưới', 'chúc', 'mừng', 'đẹp', 'xinh', 'trai', 'gái', 'quá', 'lắm', 'không', 'ko', 'là', 'và', 'với', 'đi', 'nào', 'hôn', 'ôm'];
function parseTag(text, self) {
  if (!text || !text.includes('@')) return null;
  const lower = text.toLowerCase();
  let best = null;
  for (const u of known.values()) {
    if (self && u.id === self.id) continue;
    for (const cand of [u.nickname, u.uniqueId]) {
      if (!cand) continue;
      const i = lower.indexOf('@' + cand.toLowerCase());
      if (i >= 0 && (!best || cand.length > best.len)) best = { user: u, len: cand.length };
    }
  }
  if (best) return best.user;
  const m = text.match(/@([^\s@,;:!?]+(?: [^\s@,;:!?]+){0,2})/);
  if (!m) return null;
  const words = m[1].split(' ').filter(Boolean);
  while (words.length && STOP.includes(words[words.length - 1].toLowerCase())) words.pop();
  const name = words.join(' ').trim().slice(0, 30);
  if (name.length < 2) return null;
  return { id: 'tag:' + name.toLowerCase(), nickname: name, avatar: '', tag: true };
}

/* ---------- Điểm hạnh phúc & bảng cặp đôi ---------- */
const coupleScores = new Map();   // key -> { a, b, total }
const SAVE_KEY = cfg.demo ? 'damcuoi.scores.demo' : 'damcuoi.scores';
function addCoupleScore(c, pts) {
  if (!c || !pts) return;
  const s = coupleScores.get(c.key) || { a: c.a, b: c.b, total: 0 };
  s.a = c.a; s.b = c.b; s.total += pts;
  coupleScores.set(c.key, s);
  renderBoard();
}
function renderBoard() {
  const top = [...coupleScores.values()].sort((a, b) => b.total - a.total).slice(0, 5);
  const ol = $('board').querySelector('ol');
  ol.textContent = '';
  for (const s of top) {
    const li = document.createElement('li');
    const n = document.createElement('span'); n.textContent = `${s.a.nickname} ❤ ${s.b.nickname}`;
    const v = document.createElement('em'); v.textContent = s.total.toLocaleString('vi-VN');
    li.append(n, v); ol.appendChild(li);
  }
  $('board').style.display = top.length ? '' : 'none';
  if (top.length) {
    const c = S.byUser(top[0].a.id);
    const cc = (c && (c.a.id === top[0].a.id || c.b.id === top[0].a.id) && c.key === [top[0].a.id, top[0].b.id].sort().join('|')) ? c : null;
    if (cc) S.setCrown(cc);
  }
  saveScores();
}
function saveScores() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify([...coupleScores.values()].slice(0, 200))); } catch (_) { /* bỏ qua */ }
}
try { for (const s of JSON.parse(localStorage.getItem(SAVE_KEY) || '[]')) if (s && s.a && s.b) coupleScores.set([s.a.id, s.b.id].sort().join('|'), s); } catch (_) { /* dữ liệu hỏng */ }
renderBoard();

/* ---------- Hàng chờ & thông báo ---------- */
S.onQueueChange = names => {
  const el = $('queue');
  el.innerHTML = names.length ? `<b>⏳ Chờ lên sân khấu:</b>` + names.slice(0, 4).map(n => `<div class="qrow">💞 ${n.replace(/</g, '&lt;')}</div>`).join('') + (names.length > 4 ? `<div class="qrow">… và ${names.length - 4} cặp nữa</div>` : '') : '';
};
S.onArrive = (c, spot) => {
  if (spot === 0) mcReact(2.5, MC.couple, c, 6);
  addCoupleScore(c, 30);
  toast(`💞 ${c.a.nickname} ❤ ${c.b.nickname}`, 'đã lên sân khấu!');
};
const toasts = [];
function toast(title, text, vip) {
  const el = document.createElement('div');
  el.className = 'toast' + (vip ? ' vip' : '');
  const b = document.createElement('b'); b.textContent = title;
  const sp = document.createElement('span'); sp.textContent = ' ' + text;
  el.append(b, sp);
  $('toasts').appendChild(el);
  toasts.push(el);
  while (toasts.length > 3) { const o = toasts.shift(); o.remove(); }
  setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 350); }, 4200);
}
function flash() { const el = $('flash'); el.classList.remove('on'); void el.offsetWidth; el.classList.add('on'); }

/* ---------- MC ---------- */
const MC = {
  on: true, name: 'MC Anh Tú', minSec: 18, maxSec: 26,
  lines: [
    'Chúc mừng hạnh phúc! Hôm nay sảnh cưới online của chúng ta lại thêm một cặp đôi đẹp nữa rồi!',
    'Tình yêu là thứ duy nhất càng chia sẻ càng nhiều thêm. Cảm ơn mọi người đã tới chung vui!',
    'Trăm năm tình viên mãn, bạc đầu nghĩa phu thê — chúc các cặp đôi của chúng ta mãi bền chặt!',
    'Một like của bạn là một lời chúc phúc. Một follow là một phong bao lì xì tinh thần đấy!',
    'Sảnh cưới đang nóng dần lên! Mọi người tag người thương vào để cùng lên sân khấu nào!',
    'Đám cưới vui nhất là đám cưới đông khách. Mời bà con cô bác thả tim cho rộn ràng nào!',
  ],
  funny: [
    'MC xin thông báo: ai còn độc thân thì cứ tag crush vào đây, MC gả luôn, khỏi cần mai mối!',
    'Cưới online tiện lắm: không cần phong bì, chỉ cần phong... tim thôi ạ!',
    'Cô dâu chú rể hôm nay đẹp quá, MC đứng cạnh cũng thấy mình... cần đi spa gấp.',
    'Ai tag người yêu cũ vào đây là MC tính phí gấp đôi nhé, vì tội làm sảnh cưới thêm phần kịch tính!',
    'Xin nhắc nhẹ: thả tim là miễn phí, còn bỏ lỡ người thương là mất phí cả đời đấy!',
    'Hôm nay ai lên sân khấu cũng auto đẹp — vì sảnh này có filter hạnh phúc sẵn rồi!',
  ],
  couple: [
    'Xin giới thiệu cặp đôi {a} ❤ {b}! Mời hai bạn lên sân khấu ra mắt bà con hai họ... online!',
    'Một tràng pháo tay cho {a} và {b}! Trai tài gái sắc, đúng là trời sinh một cặp!',
    '{a} ơi, {b} ơi — hai bạn chính thức là cặp đôi của sảnh cưới lúc này!',
    'MC xin được se duyên cho {a} ❤ {b}. Chúc hai bạn trăm năm hạnh phúc, đầu bạc răng long!',
  ],
  thank: [
    'Cảm ơn {ten} đã tặng quà mừng cưới! Phong bao này MC ghi sổ vàng luôn nhé!',
    '{ten} chơi lớn quá! Cặp đôi trên sân khấu thay mặt hai họ cảm ơn bạn!',
    'Quà của {ten} vừa tới là pháo hoa nổ tung trời luôn. Quá đã!',
  ],
  greet: [
    'Chào {ten} đã ghé sảnh cưới! Tìm chỗ ngồi đẹp, chuẩn bị tag người thương nhé!',
    'Hoan nghênh {ten}! Đám cưới đang vui, bạn vào là vui gấp đôi!',
  ],
  milestone: [
    '🎉 Sảnh cưới vừa nâng cấp lên {moc}! Càng đông càng đẹp — cảm ơn cả nhà đã tới chung vui!',
    'Không khí quá tuyệt vời! Chúng ta đã chạm mốc {moc} rồi mọi người ơi!',
  ],
  follow: [
    'Cảm ơn {ten} đã follow! Từ nay bạn là khách VIP của sảnh cưới này nhé!',
  ],
  guide: [
    '💌 Gõ "@tên người thương" → 2 bạn lên sân khấu',
    '🎁 Tặng quà → pháo hoa + mưa hoa',
    '💬 Gõ "pháo hoa" → bắn pháo hoa',
    '💬 Gõ "hoa rơi" → mưa hoa hồng',
    '❤️ Thả tim → cặp đôi nhảy chúc mừng',
  ],
};
const mcQ = [];
let mcBusyUntil = 0, mcTimer = 0, lastLine = '';
function fillLine(tpl, c, user) {
  let out = tpl;
  if (c) out = out.replace(/\{a\}/g, c.a.nickname).replace(/\{b\}/g, c.b.nickname);
  if (user) out = out.replace(/\{ten\}/g, user.nickname);
  return out;
}
function mcReact(pri, lines, c, sec, user) {
  if (!MC.on || !lines || !lines.length) return;
  const text = fillLine(lines[Math.floor(Math.random() * lines.length)], c, user);
  mcQ.push({ pri, text, sec: sec || 6, at: performance.now() });
  mcQ.sort((a, b) => b.pri - a.pri || a.at - b.at);
  if (mcQ.length > 4) mcQ.length = 4;
  mcNext();
}
function mcNext() {
  clearTimeout(mcTimer);
  const now = performance.now();
  if (now < mcBusyUntil) { mcTimer = setTimeout(mcNext, mcBusyUntil - now + 50); return; }
  for (let i = mcQ.length - 1; i >= 0; i--) if (now - mcQ[i].at > 40000) mcQ.splice(i, 1);
  const m = mcQ.shift();
  if (!m) return;
  mcShow(m.text, m.sec);
  if (mcQ.length) mcTimer = setTimeout(mcNext, m.sec * 1000 + 600);
}
function mcShow(text, sec = 7) {
  const el = $('mc');
  el.style.top = '';
  el.querySelector('.say b').textContent = MC.name;
  el.querySelector('.say span').textContent = text;
  el.classList.add('on');
  mcBusyUntil = performance.now() + sec * 1000 + 600;
  clearTimeout(el._hide);
  el._hide = setTimeout(() => el.classList.remove('on'), sec * 1000);
}
/* MC chào người mới vào phòng: mỗi người 1 lần, cách nhau ít nhất 8 giây cho đỡ ồn */
const greeted = new Set();
let lastGreet = -1e9;
function greet(user) {
  if (!user || user.tag || greeted.has(user.id)) return;
  const now = performance.now();
  if (now - lastGreet < 8000) return;
  greeted.add(user.id);
  if (greeted.size > 5000) greeted.clear();
  lastGreet = now;
  mcReact(1, MC.greet, null, 5, user);
}
function mcRandom() {
  if (performance.now() < mcBusyUntil || mcQ.length) return scheduleMc(10);
  const pool = Math.random() < 0.42 ? MC.funny : MC.lines;
  let line = pool[Math.floor(Math.random() * pool.length)];
  if (line === lastLine && pool.length > 1) line = pool[(pool.indexOf(line) + 1) % pool.length];
  lastLine = line;
  mcShow(line, 7);
  A.sparkle();
  scheduleMc();
}
let mcSched = 0;
function scheduleMc(sec = MC.minSec + Math.random() * (MC.maxSec - MC.minSec)) {
  clearTimeout(mcSched);
  if (MC.on) mcSched = setTimeout(mcRandom, sec * 1000);
}
scheduleMc(6);

/* ---------- Khung luật + dòng hướng dẫn ---------- */
const RULES = ['💌 Tag @tên người thương → cùng lên sân khấu', '🎁 Quà càng lớn, pháo hoa càng to', '👁 Đông mắt xem → sảnh cưới nâng cấp'];
function renderRules(lines) {
  const el = $('rules'); el.textContent = '';
  for (const t of (Array.isArray(lines) && lines.length ? lines : RULES)) {
    const d = document.createElement('div'); d.textContent = t; el.appendChild(d);
  }
}
renderRules();
let guideIdx = 0;
setInterval(() => {
  const el = $('guide');
  el.classList.add('out');
  setTimeout(() => { guideIdx = (guideIdx + 1) % MC.guide.length; el.textContent = MC.guide[guideIdx]; el.classList.remove('out'); }, 350);
}, 4200);
$('guide').textContent = MC.guide[0];

/* ---------- Cặp đôi ---------- */
const tagCooldown = new Map();
function requestCouple(a, b, viaTag) {
  register(a); register(b);
  const now = performance.now();
  if (viaTag) {
    if (now - (tagCooldown.has(a.id) ? tagCooldown.get(a.id) : -1e9) < 20000) return null;
    tagCooldown.set(a.id, now);
  }
  const c = S.addCouple(a, b);
  if (c) {
    markSeen(a.id); markSeen(b.id);
    return c;
  }
  return null;
}
function randomPartner(self) {
  const others = [...known.values()].filter(u => u.id !== self.id && !u.tag);
  if (others.length) return others[Math.floor(Math.random() * others.length)];
  return { id: 'tag:người thương bí mật', nickname: 'Người thương bí mật', avatar: '', tag: true };
}

/* ---------- Xử lý sự kiện từ LiveBridge ---------- */
let isLive = false;
function handle(ev) {
  if (!ev || !ev.user || !ev.user.id) return;
  if (isLive && (ev.user.sim || (ev.source && ev.source.simulated))) return;
  register(ev.user); markSeen(ev.user.id);
  const src = ev.source || {};
  const n = Math.max(1, (ev.value || 1) * (ev.count || 1));
  if (ev.action === 'couple') {
    const partner = (src.text && parseTag(src.text, ev.user)) || randomPartner(ev.user);
    requestCouple(ev.user, partner, true);
  } else if (ev.action === 'spotlight') {
    requestCouple(ev.user, randomPartner(ev.user), false);
  } else if (ev.action === 'fireworks') {
    E.fireworksShow(Math.min(6, n + 1), 280);
  } else if (ev.action === 'petals') {
    E.petals(Math.min(300, 40 * n));
  } else if (ev.action === 'confetti') {
    E.confetti(Math.min(260, 40 * n)); E.petals(40);
  } else if (ev.action === 'dance') {
    S.dance(6); E.hearts(12);
  }
  if (src.kind === 'gift') {
    const tier = E.giftRain(ev.diamonds || 0);
    const feat = S.featured();
    if (feat) addCoupleScore(feat, Math.round((ev.diamonds || 0) * 50));
    else { const mine = S.byUser(ev.user.id); if (mine) addCoupleScore(mine, Math.round((ev.diamonds || 0) * 50)); }
    if (tier >= 3) flash();
    mcReact(3, MC.thank, null, 6, ev.user);
    if ((ev.diamonds || 0) >= 30) S.dance(5);
  } else if (src.kind === 'follow') {
    E.hearts(14); A.bell();
    mcReact(3.2, MC.follow, null, 6, ev.user);
  } else if (src.kind === 'join') {
    greet(ev.user);
  }
}
function onChat(m) {
  if (!m.user || !m.user.id || !m.text) return;
  if (isLive && m.user.sim) return;
  register(m.user); markSeen(m.user.id);
  const partner = parseTag(m.text, m.user);
  if (partner) { requestCouple(m.user, partner, true); return; }
  const t = m.text.toLowerCase();
  if (t.includes('pháo hoa')) E.fireworksShow(2, 300);
  else if (t.includes('hoa rơi') || t.includes('mưa hoa')) E.petals(70);
}
W.handle = handle; W.chat = onChat; W.parseTag = parseTag;   // để test thủ công trong console
function onBlock(m) {
  const u = m.user || {};
  // người bị chặn: cặp đôi có họ thì mời xuống (xoá khỏi sân khấu/hàng chờ đơn giản bằng reload điểm) — v1: bỏ qua hiển thị mới
  if (u.id) tagCooldown.set(u.id, performance.now() + 1e12);
}

/* ---------- Cấu hình từ trang quản trị / mapping ---------- */
function applyConfig(c) {
  if (!c) return;
  if (Array.isArray(c.bgRules) && c.bgRules.length) { BG.rules = c.bgRules; BG.shown = ''; refreshBg(false); }
  A.setConfig(c);
  if (c.uiScale != null || c.safeTop != null || c.safeSide != null) {
    const st = document.documentElement.style;
    if (c.uiScale != null) st.setProperty('--k', Math.max(0.6, Math.min(2, c.uiScale / 100)));
    if (c.safeTop != null) st.setProperty('--safe', Math.round(Hpx * c.safeTop / 100) + 'px');
    if (c.safeSide != null) st.setProperty('--side', Math.round(Wpx * c.safeSide / 100) + 'px');
  }
  if (c.coupleSec != null) S.coupleSec = Math.max(8, Math.min(120, Number(c.coupleSec) || 22));
  for (const k of ['lines', 'funny', 'couple', 'thank', 'greet', 'milestone', 'follow', 'guide']) {
    const key = 'mc' + k[0].toUpperCase() + k.slice(1);
    if (Array.isArray(c[key]) && c[key].length) MC[k] = c[key].map(String);
  }
  if (typeof c.mcFollow === 'string') { /* tương thích key đơn */ }
  if (Array.isArray(c.mcFollowLines) && c.mcFollowLines.length) MC.follow = c.mcFollowLines.map(String);
  if (c.mcName) MC.name = String(c.mcName).slice(0, 30);
  if (c.mcOn != null) { MC.on = !!c.mcOn; if (MC.on) scheduleMc(5); }
  if (c.mcMinSec != null) MC.minSec = Math.max(8, Number(c.mcMinSec) || 18);
  if (c.mcMaxSec != null) MC.maxSec = Math.max(MC.minSec, Number(c.mcMaxSec) || 26);
  if (c.rulesLines) renderRules(c.rulesLines);
}

/* ---------- Kết nối ---------- */
function status(text, kind) {
  const el = $('status');
  if (cfg.debug || kind === 'demo') { el.textContent = text; el.className = kind || ''; el.style.display = text ? '' : 'none'; }
  else if (kind === 'ok') { el.textContent = text; el.className = 'ok'; }
  else { el.textContent = ''; el.style.display = 'none'; }
}
function showStatus(s) {
  const t = (s && s.tiktok) || {};
  if (s && s.room) { BG.room = s.room.viewers || 0; refreshBg(); }
  if (t.state) isLive = t.state === 'connected';
  if (t.state === 'connected') status('● LIVE @' + t.username, 'ok');
  else if (cfg.debug) status('TikTok: ' + (t.state || '?') + (t.message ? ' – ' + t.message : ''), 'warn');
}
if (cfg.demo) {
  status('DEMO', 'demo');
  startDemo();
} else if (window.LiveBridgeClient) {
  new LiveBridgeClient({ url: cfg.bridge, game: GAME_ID })
    .on('event', handle)
    .on('chat', onChat)
    .on('block', onBlock)
    .on('config', m => applyConfig(m.config))
    .on('hello', h => applyConfig(h.config))
    .on('status', showStatus)
    .on('room', m => { BG.room = (m.room && m.room.viewers) || 0; refreshBg(); })
    .on('seen', m => { if (m.user) { register(m.user); markSeen(m.user.id); } })
    .connect();
} else {
  status('Không tải được livebridge-client.js – mở game qua LiveBridge hoặc thêm ?demo=1', 'err');
}
resize();
refreshBg(false);

/* ---------- Demo ---------- */
function startDemo() {
  const names = ['Xuân Mai', 'Minh Tuấn', 'Thu Hằng', 'Hoàng Nam', 'Ngọc Anh', 'Văn Đức', 'Khánh Ly', 'Tuấn Anh', 'Mỹ Linh', 'Quốc Bảo', 'Phương Thảo', 'Đình Phong'];
  const users = names.map((n, i) => ({ id: 'demo' + i, nickname: n, avatar: '' }));
  users.forEach(register);
  BG.demoViewers = 40;
  setInterval(() => { BG.demoViewers = Math.min(2300, (BG.demoViewers || 40) + Math.floor(Math.random() * 26)); refreshBg(); }, 5000);
  const chats = [
    u => ({ user: u, text: '@' + users[(users.indexOf(u) + 3) % users.length].nickname + ' cưới nhau đi' }),
    u => ({ user: u, text: '@' + users[(users.indexOf(u) + 5) % users.length].nickname + ' ơi yêu quá' }),
    () => null,
  ];
  let k = 0;
  setInterval(() => {
    const u = users[Math.floor(Math.random() * users.length)];
    const r = Math.random();
    k++;
    if (r < 0.42) { const c = chats[k % chats.length](u); if (c) onChat(c); }
    else if (r < 0.62) handle({ action: 'petals', value: 1, count: 1, user: u, source: { kind: 'like' } });
    else if (r < 0.8) handle({ action: 'couple', value: 1, count: 1, user: u, diamonds: [1, 5, 10, 30, 99][Math.floor(Math.random() * 5)], source: { kind: 'gift', giftName: 'Hoa hồng' } });
    else if (r < 0.9) handle({ action: 'dance', value: 1, count: 1, user: u, source: { kind: 'follow' } });
    else E.fireworksShow(2, 300);
  }, 2600);
  setTimeout(() => onChat({ user: users[0], text: '@Minh Tuấn cưới em nhé' }), 1200);
}
})();
