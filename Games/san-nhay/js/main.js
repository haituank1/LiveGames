/* Sàn Nhảy Quẩy Max – cục B (game). Nhận sự kiện từ LiveBridge.
   Luật chơi v1:
   - Mọi người xem vào phòng / bình luận / thả tim / tặng quà đều thành một dancer trên sàn,
     thuộc 1 trong 6 lớp nhân vật (ảnh + điệu nhảy + màu hiệu ứng riêng, xem js/dancers.js).
   - Lượt SOLO kiểu Audition: dancer lên bục giữa theo vòng, dãy phím mũi tên chạy ở thanh dưới,
     chấm PERFECT / GREAT / COOL / MISS + COMBO. Khán giả bình luận "trái / lên / xuống / phải"
     (hoặc emoji ←↑↓→) để giúp dancer ăn điểm.
   - Thanh PARTY ENERGY đầy 100% -> PARTY MAX 10 giây: cả sàn nhảy nhanh, mưa tiền + pháo giấy.
   - Quà: nhỏ = pháo giấy / tim tại dancer; vừa = nổ hũ vàng; lớn (>=99 xu) = đổ bộ có cánh + hào quang lên bục.
   - Bảng vàng tuần (lưu trình duyệt): Chủ Tịch Sàn / Phó Chủ Tịch / Thư Ký theo điểm quà.
   - Sàn đổi cảnh theo TỔNG LƯỢT VIEW tích lũy: Neon -> Bãi Biển (1.500) -> Tuyết (4.000). */
(function () {
'use strict';
const W = (window.Party = window.Party || {});
const FX = W.effects, A = W.audio, P = W.dancers;
const q = new URLSearchParams(location.search);
const isDemo = q.has('demo');
const $ = id => document.getElementById(id);
const rand = (a, b) => a + Math.random() * (b - a);
const stageEl = $('stage'), statusEl = $('status');
const say = (html, cls) => { statusEl.className = cls || ''; statusEl.innerHTML = html; };
const esc = s => String(s).replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
const fmtNum = n => n >= 10000 ? (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k' : String(Math.round(n));
const noAccent = s => String(s || '').toLocaleLowerCase('vi').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd');

/* ============ Sàn đổi cảnh theo tổng lượt view tích lũy ============ */
const VENUES = [
  { at: 0,    id: 'neon',  label: '🌃 Sàn Neon' },
  { at: 1500, id: 'beach', label: '🏖 Sàn Bãi Biển' },
  { at: 4000, id: 'snow',  label: '❄️ Sàn Tuyết' },
];
const LS_TOTAL = isDemo ? 'sannhay.totalviews.demo' : 'sannhay.totalviews';
let totalBase = parseInt(localStorage.getItem(LS_TOTAL) || '0', 10) || 0;
const counted = new Set();
let demoExtra = 0, saveTimer = 0;
const totalViews = () => totalBase + counted.size + demoExtra;
function countView(user) {
  if (!user || !user.id || counted.has(user.id)) return;
  counted.add(user.id);
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => localStorage.setItem(LS_TOTAL, String(totalBase + counted.size)), 1500);
  refreshVenue();
}
function refreshVenue() {
  const forced = q.get('venue');
  let v = VENUES[0];
  for (const x of VENUES) if (totalViews() >= x.at) v = x;
  if (forced && VENUES.some(x => x.id === forced)) v = VENUES.find(x => x.id === forced);
  stageEl.dataset.venue = v.id;
  $('venue').firstChild.textContent = v.label + ' · 👁 ';
}

/* ============ Trạng thái chung ============ */
let cfg = {};
const known = new Map();
let viewersNow = 0;
function register(user) {
  if (!user || !user.id) return null;
  const old = known.get(user.id);
  const u = old ? { ...old, ...user, avatar: user.avatar || old.avatar } : { ...user };
  known.set(user.id, u);
  return u;
}
function ensureDancer(user) {
  const isNew = user && !known.has(user.id);
  const u = register(user);
  if (!u) return null;
  countView(u);
  const p = P.spawn(u);
  if (isNew && p) joinOrder.push(u.id);
  return p;
}
function renderViewers() { $('viewers').textContent = fmtNum(viewersNow || P.count()); }

/* ============ Bảng vàng ============ */
const LS = isDemo ? 'sannhay.scores.demo' : 'sannhay.scores';
let scores = {};
try { scores = JSON.parse(localStorage.getItem(LS) || '{}'); } catch (e) { scores = {}; }
const TITLES = ['Chủ Tịch Sàn', 'Phó Chủ Tịch', 'Thư Ký'];
function addScore(user, pts) {
  if (!user || !user.id || pts <= 0) return;
  const s = scores[user.id] || (scores[user.id] = { nickname: user.nickname, score: 0 });
  s.nickname = user.nickname; s.score += pts;
  localStorage.setItem(LS, JSON.stringify(scores));
  renderBoard();
}
function renderBoard() {
  const top = Object.entries(scores).map(([id, s]) => ({ id, ...s })).sort((a, b) => b.score - a.score).slice(0, 5);
  const board = $('board');
  board.style.display = top.length ? '' : 'none';
  board.querySelector('ol').innerHTML = top.map((s, i) =>
    `<li><span>${i < 3 ? `<span class="ttl">${TITLES[i]} · </span>` : ''}${esc(s.nickname)}</span><em>${fmtNum(s.score)}</em></li>`).join('');
  P.setLeader(top.length ? top[0].id : null);
}

/* ============ Banner / toast / hướng dẫn ============ */
let bannerTimer = 0;
function showBanner(text, ms = 4600) {
  const el = $('banner');
  el.textContent = text;
  el.classList.add('on');
  clearTimeout(bannerTimer);
  bannerTimer = setTimeout(() => el.classList.remove('on'), ms);
}
function toast(text, vip) {
  const box = $('toasts');
  const t = document.createElement('div');
  t.className = 'toast' + (vip ? ' vip' : '');
  t.textContent = text;
  box.prepend(t);
  while (box.children.length > 2) box.lastChild.remove();
  setTimeout(() => t.classList.add('out'), 5500);
  setTimeout(() => t.remove(), 6100);
}
let guideIdx = 0, guideTimer = null;
function startGuide() {
  const lines = (cfg.guideLines || []).filter(Boolean);
  const el = $('guide');
  if (!lines.length) { el.textContent = ''; return; }
  const show = () => { el.classList.remove('out'); el.textContent = lines[guideIdx++ % lines.length]; };
  show();
  clearInterval(guideTimer);
  guideTimer = setInterval(() => { el.classList.add('out'); setTimeout(show, 380); }, 4200);
}

/* ============ Party Energy ============ */
let energy = 12, partyUntil = 0, partyFxTimer = null;
function renderEnergy() {
  $('energypct').textContent = Math.round(energy) + '%';
  $('energybar').style.width = Math.min(100, energy) + '%';
}
function addEnergy(n) {
  if (performance.now() < partyUntil) return;
  energy = Math.min(100, energy + n);
  renderEnergy();
  if (energy >= 100) partyMax();
}
function partyMax() {
  energy = 100; renderEnergy();
  partyUntil = performance.now() + 10000;
  stageEl.classList.add('partymax');
  $('beams').classList.add('on');
  FX.setDisco(true);
  showBanner('⚡ PARTY MAX — CẢ SÀN CÙNG QUẨY! ⚡', 6000);
  A.cheer();
  FX.moneyRain(90); FX.confetti(120); FX.fireworks(3);
  clearInterval(partyFxTimer);
  partyFxTimer = setInterval(() => { FX.moneyRain(50); FX.confetti(60); }, 2200);
  setTimeout(() => {
    stageEl.classList.remove('partymax');
    $('beams').classList.remove('on');
    FX.setDisco(false);
    clearInterval(partyFxTimer);
    energy = 30; renderEnergy();
  }, 10000);
}

/* ============ Lượt solo AU ============ */
const ARROWS = [
  { s: '←', w: 'trai' }, { s: '↑', w: 'len' }, { s: '↓', w: 'xuong' }, { s: '→', w: 'phai' },
];
const JUDGE_PTS = { PERFECT: 300, GREAT: 200, COOL: 100, MISS: 0 };
let solo = null, soloTimer = null, nextSoloAt = 0, joinOrder = [], grandUntil = 0;
const soloQueue = [];
function renderAU() {
  const who = $('auwho'), steps = $('austeps'), combo = $('aucombo');
  if (!solo) {
    who.textContent = '🎤 Chờ dancer lên bục…';
    steps.innerHTML = ''; combo.textContent = '';
    return;
  }
  who.textContent = `🎤 SOLO: ${solo.p.user.nickname} · ${P.classOf(solo.p).name}`;
  combo.textContent = `COMBO x${solo.combo} · ${fmtNum(solo.score)} đ`;
  steps.innerHTML = solo.seq.map((a, i) =>
    `<span class="step${i === solo.idx ? ' cur' : ''}${solo.marks[i] ? (solo.marks[i] === 'MISS' ? ' missed' : ' ok') : ''}">${ARROWS[a].s}</span>`).join('');
}
function showJudge(res) {
  const el = $('judge');
  el.textContent = res + (res !== 'MISS' && solo && solo.combo > 1 ? ` · x${solo.combo}` : '');
  el.className = '';
  void el.offsetWidth;
  el.className = 'pop ' + res.toLowerCase();
}
function judge(res) {
  if (!solo || solo.judged) return;
  solo.judged = true;
  solo.marks[solo.idx] = res;
  solo.score += JUDGE_PTS[res];
  if (res === 'MISS') { solo.combo = 0; A.bad(); } else { solo.combo++; solo.best = Math.max(solo.best, solo.combo); A.good(); }
  showJudge(res);
  renderAU();
}
function advanceStep() {
  if (!solo) return;
  solo.idx++;
  solo.judged = false;
  if (solo.idx >= solo.seq.length) { endSolo(); return; }
  renderAU();
}
function autoJudge() {
  const r = Math.random();
  if (isDemo) return r < 0.32 ? 'PERFECT' : r < 0.62 ? 'GREAT' : r < 0.86 ? 'COOL' : 'MISS';
  return r < 0.55 ? 'COOL' : 'MISS';   // live thật: khán giả không giúp thì chỉ đạt COOL / MISS
}
function startSolo(p) {
  if (!p || solo) return;
  const len = 12;
  solo = { p, seq: Array.from({ length: len }, () => Math.floor(Math.random() * 4)), marks: {}, idx: 0, score: 0, combo: 0, best: 0, judged: false };
  P.toPodium(p);
  P.sayBubble(p, 'Tới lượt mình quẩy nè!');
  renderAU();
  A.cheer();
  const mySolo = solo;
  soloTimer = setInterval(() => {
    if (!solo) return;
    if (!solo.judged) judge(autoJudge());
    setTimeout(advanceStep, 240);
  }, 980);
  setTimeout(() => { if (solo === mySolo) endSolo(); }, (cfg.soloSec || 20) * 1000 + 4000);
}
function endSolo() {
  if (!solo) return;
  clearInterval(soloTimer); soloTimer = null;
  const { p, score, best } = solo;
  solo = null;
  renderAU();
  showBanner(`🏁 FINISH · ${p.user.nickname} — ${fmtNum(score)} điểm · Combo cao nhất x${best}`, 5200);
  if (score >= 2400) { FX.fireworks(3); A.fanfare(); } else A.cheer();
  addScore(p.user, Math.round(score / 10));
  P.offPodium(p);
  nextSoloAt = performance.now() + 3200;
}
function pickNextSolo() {
  while (soloQueue.length) {
    const p = P.get(soloQueue.shift());
    if (p && !p.onPodium) return p;
  }
  const all = P.all().filter(p => !p.onPodium);
  if (!all.length) return null;
  joinOrder = joinOrder.filter(id => P.get(id));
  const id = joinOrder.find(x => { const p = P.get(x); return p && !p.onPodium; });
  if (id) { joinOrder = joinOrder.filter(x => x !== id); joinOrder.push(id); return P.get(id); }
  return all[Math.floor(Math.random() * all.length)];
}
setInterval(() => {
  if (!solo && performance.now() >= nextSoloAt && performance.now() >= grandUntil && P.count() >= 1) {
    const p = pickNextSolo();
    if (p) startSolo(p);
  }
}, 1500);

/* ============ Bong bóng thoại hài ============ */
setInterval(() => {
  const all = P.all();
  if (!all.length || !(cfg.funnyLines || []).length) return;
  const p = all[Math.floor(Math.random() * all.length)];
  P.sayBubble(p, cfg.funnyLines[Math.floor(Math.random() * cfg.funnyLines.length)]);
}, 4600);

/* ============ Hiệu ứng theo quà ============ */
function grandArrival(user) {
  const p = ensureDancer(user);
  if (!p) return;
  P.setClass(p, 'dai-gia');            // quà lớn -> nâng lớp Đại Gia
  if (solo && solo.p !== p) { const cur = solo; clearInterval(soloTimer); soloTimer = null; solo = null; P.offPodium(cur.p); }
  if (soloTimer) { clearInterval(soloTimer); soloTimer = null; }
  solo = null;
  P.toPodium(p);
  P.grandEntrance(p, 7);
  grandUntil = performance.now() + 7000;
  renderAU();
  showBanner(`👑 ${user.nickname} ĐỔ BỘ SÀN NHẢY!`, 5600);
  FX.fireworks(4); FX.moneyRain(70); FX.confetti(80);
  A.fanfare();
  setTimeout(() => { if (!solo) { P.offPodium(p); nextSoloAt = performance.now() + 1200; } }, 7000);
}
function giftFx(user, dia, giftName) {
  const p = user ? P.get(user.id) : null;
  const x = p ? p.x / 100 : 0.5, y = p ? (p.y - 10) / 100 : 0.6;
  addScore(user, dia * 10);
  addEnergy(Math.min(30, 4 + dia * 0.5));
  if (dia >= 99) { grandArrival(user); return; }
  if (dia >= 10) {
    FX.potBurst(x, y);
    FX.moneyRain(24);
    toast(`💰 ${user ? user.nickname : 'Khách'} làm NỔ HŨ VÀNG!`, true);
    return;
  }
  if (p) FX.burstAt(x, y, P.classOf(p).color, 18);
  FX.confetti(26);
  if (p) FX.hearts(5, x, y);
}

/* ============ Nhận sự kiện ============ */
function onChat(m) {
  if (!m.user) return;
  const p = ensureDancer(m.user);
  const text = String(m.text || '');
  // lượt solo: bình luận phím mũi tên / từ phím giúp dancer ăn điểm
  if (solo && !solo.judged) {
    const norm = noAccent(text);
    let arrow = -1;
    ARROWS.forEach((a, i) => { if (norm.includes(a.w) || text.includes(a.s)) arrow = i; });
    const fromFeatured = solo.p.user.id === m.user.id;
    if (arrow >= 0 || fromFeatured) {
      judge(arrow === solo.seq[solo.idx] ? (Math.random() < 0.6 ? 'PERFECT' : 'GREAT') : fromFeatured && arrow < 0 ? 'GREAT' : 'COOL');
      setTimeout(advanceStep, 260);
      return;
    }
  }
  if (p && text.trim()) P.sayBubble(p, text.trim().slice(0, 42));
  if (isDemo) {   // demo không qua mapper: tự nhận lệnh chữ
    const norm = noAccent(text);
    if (/phao hoa/.test(norm)) FX.fireworks(3);
    else if (/mua tien|no hu/.test(norm)) FX.potBurst(0.5, 0.55);
    else if (/quay/.test(norm)) { FX.confetti(40); addEnergy(6); }
  }
  addEnergy(1.5);
}
function handle(ev) {
  const src = ev.source || {};
  if (ev.user) ensureDancer(ev.user);
  switch (ev.action) {
    case 'join':
      if (ev.user) { const p = P.get(ev.user.id); if (p) P.sayBubble(p, 'Chào cả nhà, mình tới quẩy nè!'); }
      break;
    case 'dance':
      FX.confetti(36); addEnergy(5);
      break;
    case 'solo':
      if (ev.user && !soloQueue.includes(ev.user.id)) soloQueue.push(ev.user.id);
      break;
    case 'confetti': FX.confetti(50 + (ev.value || 1) * 20); break;
    case 'fireworks': FX.fireworks(Math.max(1, Math.min(6, ev.value || 2))); break;
    case 'hearts': {
      const p = ev.user && P.get(ev.user.id);
      FX.hearts(10, p ? p.x / 100 : 0.5, p ? (p.y - 10) / 100 : 0.6);
      break;
    }
    case 'pot': {
      const p = ev.user && P.get(ev.user.id);
      FX.potBurst(p ? p.x / 100 : 0.5, p ? (p.y - 10) / 100 : 0.55);
      break;
    }
    case 'spotlight':
      if (src.kind === 'gift') break;   // quà lớn xử lý ở nhánh gift bên dưới
      if (ev.user) grandArrival(ev.user);
      break;
    case 'cheer':
      if (ev.user) { const p = P.get(ev.user.id); if (p) { P.sayBubble(p, 'Cảm ơn cả nhà đã follow!'); FX.hearts(8, p.x / 100, (p.y - 10) / 100); } }
      addEnergy(4);
      break;
  }
  if (src.kind === 'gift') {
    const dia = Math.max(1, Number(ev.diamonds || 1));
    giftFx(ev.user, dia, src.giftName);
    if (dia >= 10 && dia < 99) A.coin();
    toast(`🎁 ${ev.user ? ev.user.nickname : 'Khách'} tặng ${src.giftName || 'quà'} (${fmtNum(dia)} xu)`, dia >= 30);
  }
  if (src.kind === 'like') addEnergy(0.4 * (ev.count || 1));
  renderViewers();
}
function onBlock(m) {
  for (const raw of [m && m.userId, m && m.uniqueId, m && m.user && m.user.id]) {
    if (!raw) continue;
    for (const [id] of known) if (id === raw) { P.removeUser(id); known.delete(id); }
  }
}
function resetScores() { scores = {}; localStorage.setItem(LS, '{}'); renderBoard(); }

/* ============ Cấu hình ============ */
function applyConfig(c) {
  cfg = c || {};
  A.setConfig(cfg);
  startGuide();
  renderBoard();
  refreshVenue();
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
  P.resize(sw, sh);
}
addEventListener('resize', resize);
document.addEventListener('fullscreenchange', () => { lastLayoutKey = ''; resize(); });
setInterval(resize, 2000);

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
P.init($('people'));
resize();
renderEnergy();
renderBoard();
refreshVenue();
renderViewers();
renderAU();

if (isDemo) {
  say('<span style="color:#ffd76a">● CHẾ ĐỘ DEMO</span> — xem thử, không cần LIVE thật', 'demo');
  applyConfig({
    soloSec: 20,
    guideLines: [
      '🎤 Dancer lên bục nhảy AU — gõ "trái / lên / xuống / phải" giúp ăn điểm!',
      '🎁 Quà vừa: nổ hũ vàng · Quà 99 xu+: đổ bộ lên bục có cánh',
      '⚡ Đầy Party Energy = cả sàn quẩy Party Max!',
      '👑 Tặng quà nhiều nhất tuần = Chủ Tịch Sàn',
    ],
    funnyLines: [
      'Sàn này vui quá trời luôn!', 'Cho xin bài vinahouse đi!', 'Quẩy tới sáng luôn nè!',
      'Nhạc hay quá, chân mình tự nhảy!', 'Ai solo yếu là mình cười đó nha!', 'Đông quá, chen nhau quẩy luôn!',
      'Chủ tịch sàn ngầu quá đi!', 'Combo x10 rồi kìa, đỉnh!', 'Mình nhảy vì đam mê thôi!',
    ],
    musicOn: true, musicVolume: 40, sfxOn: true, sfxVolume: 70, musicShuffle: true,
  });
  setupSoundBtn();
  startDemo();
} else {
  const bridgeUrl = q.get('bridge') || undefined;
  new LiveBridgeClient({ url: bridgeUrl, game: 'san-nhay' })
    .on('event', handle)
    .on('chat', onChat)
    .on('block', onBlock)
    .on('config', m => applyConfig(m.config))
    .on('reset-scores', resetScores)
    .on('hello', h => { if (h.config) applyConfig(h.config); })
    .on('status', s => {
      const t = (s && s.tiktok) || {};
      if (s && s.room) { viewersNow = s.room.viewers || 0; renderViewers(); }
      if (t.state === 'connected') say('● LIVE', 'ok');
      else if (q.has('debug')) say('LiveBridge: ' + (t.state || 'đang nối…'), t.state === 'error' ? 'err' : '');
    })
    .on('room', m => { if (m.room) { viewersNow = m.room.viewers || 0; renderViewers(); } })
    .on('seen', m => { if (m.user) { ensureDancer(m.user); addEnergy(0.15 * (m.count || 1)); } })
    .connect();
  setTimeout(setupSoundBtn, 300);
}

/* ============ Demo ============ */
function startDemo() {
  const names = ['Xuân Mai', 'Minh Tuấn', 'Thu Hằng', 'Văn Đức', 'Ngọc Anh', 'Hoàng Nam', 'Khánh Linh', 'Tuấn Anh',
    'Mỹ Linh', 'Đức Huy', 'Phương Thảo', 'Hải Yến', 'Quốc Bảo', 'Thanh Tùng', 'Bảo Trâm', 'Văn Hải',
    'Gia Bảo', 'Kim Ngân', 'Trọng Nghĩa', 'Thanh Hà', 'Đình Phong', 'Ngọc Trâm', 'Hữu Tài', 'Bích Ngọc',
    'Văn Sơn', 'Thu Trang', 'Minh Khôi', 'Hồng Nhung', 'Tuấn Kiệt', 'Diệu Linh', 'Quang Vinh', 'Ánh Tuyết',
    'Hùng Cường', 'Mai Phương', 'Đức Anh', 'Thảo Nguyên', 'Văn Long', 'Kim Chi', 'Hoài Nam', 'Yến Nhi',
    'Trí Dũng', 'Lan Anh', 'Phúc Hậu', 'Ngọc Diệp', 'Mạnh Hùng', 'Thuỳ Dương'];
  const users = names.map((n, i) => ({ id: 'demo' + i, nickname: n, avatar: '' }));
  let joined = 0;
  const joinOne = () => {
    if (joined >= users.length) return;
    const u = users[joined++];
    joinOrder.push(u.id);
    ensureDancer(u);
    renderViewers();
  };
  for (let i = 0; i < 16; i++) setTimeout(joinOne, 300 + i * 420);
  const joinTimer = setInterval(() => { joinOne(); joinOne(); if (joined >= users.length) clearInterval(joinTimer); }, 3400);
  const arrowWords = ['trái', 'lên', 'xuống', 'phải'];
  const chatLines = ['quẩy lên cả nhà ơi', 'nhạc hay quá', 'pháo hoa', 'mưa tiền đi chủ tịch', 'sàn đông vui quá', 'combo cao lên nào'];
  setInterval(() => {
    const pool = users.slice(0, Math.max(joined, 1));
    if (!pool.length) return;
    const u = pool[Math.floor(Math.random() * pool.length)];
    const r = Math.random();
    if (solo && r < 0.45) {
      const correct = Math.random() < 0.62;
      const w = correct ? ARROWS[solo.seq[solo.idx]].w : arrowWords[Math.floor(Math.random() * 4)];
      onChat({ user: u, text: w === 'xuong' ? 'xuống' : w === 'trai' ? 'trái' : w === 'phai' ? 'phải' : 'lên' });
    } else if (r < 0.62) {
      onChat({ user: u, text: chatLines[Math.floor(Math.random() * chatLines.length)] });
    } else if (r < 0.78) {
      addEnergy(2.5);
      const p = P.get(u.id); if (p) FX.hearts(3, p.x / 100, (p.y - 10) / 100);
    } else if (r < 0.93) {
      const dia = [1, 5, 10, 39][Math.floor(Math.random() * 4)];
      handle({ action: dia >= 10 ? 'pot' : 'hearts', value: 1, count: 1, user: u, diamonds: dia, source: { kind: 'gift', giftName: dia >= 10 ? 'Hũ vàng' : 'Rose', diamonds: dia } });
    } else {
      handle({ action: 'spotlight', value: 1, count: 1, user: u, diamonds: 99, source: { kind: 'gift', giftName: 'Siêu xe', diamonds: 99 } });
    }
    viewersNow = 120 + joined * 9 + Math.floor(rand(0, 60));
    renderViewers();
  }, 2100);
  setInterval(() => { demoExtra += Math.floor(rand(10, 30)); refreshVenue(); }, 6000);
}

W.handle = handle; W.chat = onChat;
W.energy = { add: addEnergy, party: partyMax, get: () => energy };
})();
