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
const stageEl = $('stage');
/* Dong trang thai "Dang cho ket noi LIVE..." tren dau da bo han (Nguyen chot
   2026-11-04: khong can de) — say() giu lai lam ham rong de cac cho goi cu
   (trang thai cau noi, demo) chay qua khong loi, khong hien gi len man hinh. */
const say = () => {};

/* ============ Mốc sảnh theo TỔNG lượt view tích lũy ============ */
const TIERS = [
  { at: 0,     name: 'Lễ Ấm Áp',            file: 'bg-full.webp', royal: 0 },
  { at: 50,    name: 'Hoa Khai',            file: 'bg-500.webp', royal: 0 },
  { at: 150,   name: 'Kim Tuyến',           file: 'bg-2000.webp', royal: 0 },
  { at: 300,   name: 'Lung Linh',           file: 'bg-5000.webp', royal: 0 },
  { at: 600,   name: 'Đại Tiệc Vàng',       file: 'bg-10000.webp', royal: 1 },
  { at: 1000,  name: 'Đám Cưới Hoàng Gia',  file: 'bg-sanh-moi.webp', royal: 2 },
];
/* Điểm đứng trên sân khấu trong PHÒNG RỘNG (% chiều cao phòng), theo từng ảnh phông */
/* Góc máy theo từng nền (nền nào sân khấu nằm chỗ khác thì khung hình bám theo).
   Khung vị trí nhân vật (bàn/sàn/đường đứng) nằm ở people.js TABLE_FRAMES. */
const BG_VIEW = { 'bg-sanh-moi.webp': { home: [50, 40, 0.63], stage: [50, 41, 1.02] } };
let curView = null;
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

/* BỘ ĐẾM CẶP ĐÔI (học theo live đối thủ "CẶP ĐÔI #161" — Nguyen duyệt
   2026-11-04 18:08): đếm số LỄ THÀNH HÔN đã diễn ra — mỗi lần một cặp
   đặt chân lên sân khấu tính một lễ. Lưu bền qua các phiên như tổng
   lượt xem; nút Reset ở trang quản trị xoá cả số này. */
const LS_COUPLLES = isDemo ? 'damcuoi.couples.demo' : 'damcuoi.couples';
let couplesDone = parseInt(localStorage.getItem(LS_COUPLLES) || '0', 10) || 0;
function renderCoupleCount() {
  const el = $('couplecount');
  if (!el) return;
  el.style.display = couplesDone > 0 ? '' : 'none';
  if (couplesDone > 0) el.textContent = `💒 CẶP ĐÔI THỨ ${fmtNum(couplesDone)}`;
}

/* SỔ MỪNG CƯỚI (học theo live đối thủ — Nguyen duyệt 2026-11-04 18:08):
   sổ chạy các món quà gần nhất, nằm dưới bảng cặp đôi được yêu thích —
   người tặng được ghi danh công khai thì càng muốn tặng tiếp. Chỉ giữ
   trong phiên live hiện tại, tối đa 5 dòng, mới nhất lên đầu. */
const giftLedger = [];
function addLedger(user, giftName, dia) {
  giftLedger.unshift({ ten: user ? user.nickname : 'Khách', gift: giftName || 'quà', dia: dia || 0 });
  if (giftLedger.length > 5) giftLedger.length = 5;
  const box = $('ledger');
  if (!box) return;
  box.style.display = '';
  box.querySelector('ul').innerHTML = giftLedger.map((g, i) =>
    `<li${i === 0 ? ' class="new"' : ''}><span>🎁 ${escapeHtml(g.ten)}</span><em>${escapeHtml(g.gift)}${g.dia > 0 ? ' · ' + fmtNum(g.dia) + ' xu' : ''}</em></li>`).join('');
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
/* Làm sạch điểm đã lưu từ các bản game đời đầu: có mục tên bị lưu dạng
   OBJECT (lên bảng thành "[object Object]") và điểm trống ("undefined").
   Chuẩn hoá ngay lúc nạp: tên là object thì lấy nickname, điểm ép số,
   mục nào không cứu được thì bỏ — bảng tự lành, khỏi xoá tay. */
for (const k of Object.keys(scores)) {
  const s = scores[k] || {};
  const ten = v => typeof v === 'string' ? v : (v && typeof v.nickname === 'string' ? v.nickname : '');
  s.a = ten(s.a); s.b = ten(s.b); s.score = Number(s.score) || 0;
  if (!s.a || !s.b) delete scores[k];
}
const saveScores = () => localStorage.setItem(LS, JSON.stringify(scores));

function register(user) {
  if (!user || !user.id) return null;
  const old = known.get(user.id);
  const u = old ? { ...old, ...user, avatar: user.avatar || old.avatar } : { ...user };
  known.set(user.id, u);
  if (u.avatar) P.setAvatar(u.id, u.avatar);   // anh ve muon thi chip ten cap nhat sang anh that ngay
  return u;
}
function ensureGuest(user) {
  const u = register(user);
  if (!u) return null;
  countView(u);
  const moi = !P.get(u.id);   // lần đầu xuất hiện trong phòng?
  const p = P.spawn(u);
  if (p) P.touch(u.id);   // bất kỳ sự kiện nào cũng tính là còn tương tác -> giữ chỗ đẹp
  if (moi && p) maybeWelcomePan(p);
  return p;
}
/* LIA CAM CHÀO KHÁCH MỚI (Nguyen yêu cầu 2026-11-04): chỉ khi KHÔNG có cặp
   nào đang làm lễ hay đang chờ tới lượt — có đám cưới thì tuyệt đối không
   giật cam khỏi sân khấu. Chống lia dồn dập khi khách vào ồ ạt (tối thiểu
   6s giữa 2 lần) và không chen khi camera đang bận việc khác. */
let lastWelcomePanAt = 0;
function maybeWelcomePan(p) {
  if (cfg.liaCamNguoiMoiKhiVang === false) return;
  if (P.stageBusy && P.stageBusy()) return;
  if (Cam.followC || Date.now() < Cam.busyUntil) return;
  const now = Date.now();
  if (now - lastWelcomePanAt < 6000) return;
  lastWelcomePanAt = now;
  const holdMs = (Number(cfg.liaCamNguoiMoiGiay) || 4) * 1000;
  Cam.busyUntil = now + holdMs + 1500;
  Cam.panTo(p.home.x, p.home.y - 2, 1.0);
  setTimeout(() => {
    if (!Cam.followC && Date.now() >= Cam.busyUntil - 100 && !(P.stageBusy && P.stageBusy())) Cam.home();
  }, holdMs + 1500);
}
function coupleScore(c, pts) {
  if (!c || pts <= 0) return;
  coupleByKey.set(c.key, c);
  const s = scores[c.key] || (scores[c.key] = { a: c.a.user.nickname, b: c.b.user.nickname, score: 0 });
  s.a = c.a.user.nickname; s.b = c.b.user.nickname;
  s.score += pts;
  saveScores(); renderBoard();
}
/* RESET TOÀN BỘ từ trang quản trị (nút "Reset điểm" của LiveBridge gửi
   lệnh 'reset-scores'): với game đám cưới, reset = xoá CẢ bảng xếp hạng +
   điểm hạnh phúc + TỔNG LƯỢT XEM (Nguyen hỏi 2026-11-04 — trước đây game
   không hề nghe lệnh này nên bấm reset chẳng có tác dụng gì). Khách đang
   trong phòng giữ nguyên; số liệu tích luỹ về 0, sảnh quay lại mốc đầu. */
function resetAll() {
  scores = {}; saveScores(); renderBoard();
  couplesDone = 0;
  try { localStorage.setItem(LS_COUPLLES, '0'); } catch (e) {}
  renderCoupleCount();
  totalBase = 0; counted.clear(); demoExtra = 0;
  clearTimeout(saveTimer);
  try { localStorage.setItem(LS_TOTAL, '0'); } catch (e) {}
  refreshBg(false);
  showBanner('🔄 ĐÃ RESET TOÀN BỘ · Bảng xếp hạng, điểm hạnh phúc và tổng lượt xem đã về 0', 5200);
}
function renderBoard() {
  const top = Object.entries(scores).map(([key, s]) => ({ key, a: String((s && s.a) || ''), b: String((s && s.b) || ''), score: Number(s && s.score) || 0 })).filter(s => s.a && s.b).sort((x, y) => y.score - x.score).slice(0, 3);
  const board = $('board');
  /* Bang LUON hien: chua co cap nao ghi diem thi hien dong moi choi thay vi
     an han bang — truoc day an khi rong nen nhin nhu bang "bi mat" luc moi
     mo game/chua co cap len san khau (Nguyen bao 2026-11-04). */
  board.style.display = '';
  board.querySelector('ol').innerHTML = top.length
    ? top.map((s, i) =>
      `<li><span>${i === 0 ? '👑 ' : ''}${escapeHtml(s.a)} ❤ ${escapeHtml(s.b)}</span><em>${fmtNum(s.score)}</em></li>`).join('')
    : '<li><span>💌 Chưa có cặp nào — tag người thương để mở màn!</span></li>';
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
  lines: [], funny: [], couple: [], thank: [], greet: [], follow: [], milestone: [], tagVang: [], tagDaCoDoi: [], sapMoc: [],
  personas: null, _lastPersona: -1, _streak: 0,   // 2 MC luân phiên (nam/nữ) — dựng trong applyConfig
};
function fill(tpl, vars) {
  return String(tpl).replace(/\{(\w+)\}/g, (m, k) => (vars[k] != null ? vars[k] : m));
}
/* ===== Voice theo ĐOẠN (Nguyen chot): câu mẫu tách thành đoạn TĨNH + đoạn
   TÊN riêng. Đoạn tĩnh tổng hợp 1 lần rồi cache mãi (làm nóng sẵn lúc nhận
   config); mỗi sự kiện chỉ tốn tổng hợp tiếng của cái tên ngắn, phát nối
   tiếp [tĩnh][tên][tĩnh]... thay vì tổng hợp cả câu dài không bao giờ
   trúng cache. Chữ hiển thị vẫn là câu đầy đủ như cũ. ===== */
function splitTpl(tpl) {
  const raw = String(tpl).split(/\{(\w+)\}/);
  const toks = [];
  for (let i = 0; i < raw.length; i++) toks.push(i % 2 ? { ph: raw[i] } : { tx: raw[i] });
  return toks;
}
const HAS_WORD = /[\p{L}\p{N}]/u;
function buildParts(tpl, vars) {
  if (!/\{(\w+)\}/.test(tpl)) return null;   // không placeholder -> đi đường speak() cả câu như cũ
  vars = vars || {};
  const parts = [];
  let buf = '';
  const flush = () => { const s = buf.trim(); buf = ''; if (s && HAS_WORD.test(s)) parts.push(s); };
  for (const t of splitTpl(tpl)) {
    if (t.tx != null) { buf += t.tx; continue; }
    const v = vars[t.ph];
    if (v == null || v === '') { buf += '{' + t.ph + '}'; continue; }   // thiếu biến: giữ nguyên token trong đoạn tĩnh
    flush();
    parts.push(String(v));
  }
  flush();
  return parts.length ? parts : null;
}
function staticSegmentsOf(tpl) {
  const out = [];
  for (const t of splitTpl(tpl)) {
    if (t.tx == null) continue;
    const s = t.tx.trim();
    if (s && HAS_WORD.test(s)) out.push(s);
  }
  return out;
}
function pick(arr, avoid) {
  if (!arr || !arr.length) return '';
  let s = arr[Math.floor(Math.random() * arr.length)], n = 0;
  while (s === avoid && arr.length > 1 && n++ < 6) s = arr[Math.floor(Math.random() * arr.length)];
  return s;
}
/* Chọn MC cho câu sắp nói: NGẪU NHIÊN nam/nữ (đúng ý chủ phòng — luân
   phiên kiểu random, không phải nam rồi nữ rồi nam cứng nhắc), chỉ tránh
   để 1 người nói 3 câu liên tiếp kẻo nhìn như chỉ có 1 MC. */
function pickPersona() {
  if (!MC.personas || !MC.personas.length) return null;
  if (MC.personas.length === 1) return MC.personas[0];
  let i = Math.random() < 0.5 ? 0 : 1;
  if (i === MC._lastPersona) { MC._streak++; if (MC._streak >= 3) { i = 1 - i; MC._streak = 1; } }
  else MC._streak = 1;
  MC._lastPersona = i;
  return MC.personas[i];
}
function mcSay(text, prio, kind, parts) {
  if (!text) return;
  const persona = pickPersona();   // chốt người nói NGAY khi câu vào hàng chờ — để chuyển giọng đúng giọng của người đó
  MC.queue.push({ text, prio: prio || 1, kind: kind || ((prio || 1) >= 2 ? 'event' : 'random'), at: performance.now(), parts: parts || null, persona });
  MC.queue.sort((a, b) => b.prio - a.prio);
  if (MC.queue.length > 4) MC.queue.length = 4;
  if (window.NpcVoice) {
    // chuyển giọng TRƯỚC ngay khi câu vào hàng chờ: có parts thì prefetch
    // từng đoạn (đoạn tĩnh thường đã nóng sẵn), không thì cả câu như cũ
    const pv = persona && persona.voice ? persona.voice : undefined;
    if (parts && parts.length >= 2) { for (const p of parts) NpcVoice.prefetch(p, pv); }
    else NpcVoice.prefetch(text, pv);
  }
  mcPump();
}
let mcSpeaking = false;
async function mcPump() {
  if (mcSpeaking) return;
  const now = performance.now();
  if (now < MC.busyUntil || !MC.queue.length) return;
  MC.queue = MC.queue.filter(m => now - m.at < 40000);
  const m = MC.queue.shift();
  if (!m) return;
  mcSpeaking = true;
  const el = $('mc');
  let shown = false, dur = Math.min(9000, Math.max(3400, m.text.length * 95));
  const show = voiceDurMs => {
    if (shown) return; shown = true;
    el.querySelector('.say b').textContent = m.persona ? m.persona.name : MC.name;
    const pic = el.querySelector('.pic img');
    if (pic && m.persona && m.persona.img && !pic.src.endsWith(m.persona.img)) pic.src = m.persona.img;
    el.querySelector('.say span').textContent = m.text;
    el.classList.add('on');
    placeBanner();   // MC vua hien: day banner xuong duoi bong MC neu dang trung
    if (voiceDurMs) dur = Math.min(14000, Math.max(dur, voiceDurMs + 700));
    MC.busyUntil = performance.now() + dur;
    setTimeout(() => { el.classList.remove('on'); mcSpeaking = false; setTimeout(mcPump, 350); }, dur);
  };
  let r = { played: false };
  if (window.NpcVoice && NpcVoice.enabled()) {
    // chữ chỉ hiện khi voice bắt đầu phát (onStart) — chữ và tiếng khớp nhau;
    // voice bị chặn tần suất / lỗi / chậm quá thì hiện chữ luôn, không kẹt game.
    // Câu có parts (>=2 đoạn) thì phát theo đoạn: tĩnh đã cache + tên riêng.
    try {
      const pv = m.persona && m.persona.voice ? m.persona.voice : undefined;   // MC nam đọc giọng nam, MC nữ giọng mặc định (nữ)
      if (m.parts && m.parts.length >= 2 && NpcVoice.speakParts) r = await NpcVoice.speakParts(m.parts, { kind: m.kind, voice: pv, onStart: ({ durationMs }) => show(durationMs) });
      else r = await NpcVoice.speak(m.text, { kind: m.kind, voice: pv, onStart: ({ durationMs }) => show(durationMs) });
    } catch (_) { /* rơi xuống hiện chữ */ }
  }
  if (!r.played && !shown) show(0);
  if (!r.played && shown) { /* onStart đã hiện + đã hẹn giờ ẩn */ }
  if (r.played) { /* show() đã chạy trong onStart */ }
  if (!shown) { mcSpeaking = false; }
}
function mcReact(prio, tplArr, vars) {
  const tpl = pick(tplArr);
  if (!tpl) return;
  vars = vars || {};
  mcSay(fill(tpl, vars), prio, undefined, buildParts(tpl, vars));
}
function mcRandomLoop(first) {
  const lo = (cfg.mcMinSec || 18) * 1000, hi = (cfg.mcMaxSec || 26) * 1000;
  setTimeout(() => {
    const funny = Math.random() < 0.45;
    const line = pick(funny ? MC.funny : MC.lines, MC.lastLine);
    MC.lastLine = line;
    if (line) mcSay(line, 1, 'random');
    mcRandomLoop(false);
  }, first ? 5000 : lo + Math.random() * Math.max(0, hi - lo));   // câu đầu sau ~5s: mở game là thấy MC ngay, khỏi tưởng MC bị lỗi khi phòng đang vắng
}

/* ============ Bảng hướng dẫn / luật chơi ============ */
let guideIdx = 0, guideTimer = null;
function startGuide() {
  let lines = [...(cfg.rulesLines || []), ...(cfg.guideLines || [])].filter(Boolean);
  const el = $('guide');
  /* Cả luật lẫn hướng dẫn đều rỗng (config hỏng/trống) -> dùng 3 dòng mặc
     định trong code để khung trái không bao giờ nằm chết trống. */
  if (!lines.length) lines = ['💌 Comment tag tên người thương để ghép đôi lên sân khấu', '🎁 Tặng quà để cặp của bạn được ưu tiên lên sân khấu', '👗 Gõ "nam" / "nữ" / "đổi đồ" để đổi nhân vật, trang phục'];
  /* THỰC ĐƠN QUÀ (học theo live đối thủ — Nguyen duyệt 2026-11-04 18:08):
     3 dòng quà -> hiệu ứng viết cứng trong code, khớp đúng GIFT_TIERS +
     cách tính điểm, để luôn có mặt trong vòng xoay dù danh sách hướng
     dẫn trong config có bị sửa thế nào. */
  lines.push('🎁 Tặng quà → mưa hoa, pháo hoa chúc phúc cặp đôi', '🎆 Quà từ 99 xu → pháo hoa lớn + banner mừng cưới', '💞 Quà cộng điểm cho cặp đang làm lễ — nhất bảng đội vương miện 👑');
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
  P.setBgFile(file);   // nạp khung vị trí khớp với tranh của nền này
  curView = BG_VIEW[file] || null;
  const tk = ++bgToken;
  const el = $('bgfull');
  /* ÁP CSS NGAY khi biết file nền, KHÔNG cổng qua Image() nữa: bản cổng
     qua Image chờ ảnh tải xong mới hiện — mà lúc mới mở game, khâu làm
     nóng voice bắn hàng trăm request tổng hợp cùng lúc (Chrome chỉ cho
     ~6 kết nối/host, bridge lại tổng hợp TUẦN TỰ) nên request ảnh nền bị
     kẹt sau hàng chờ cả phút: sảnh trống đỏ dù file nền hoàn toàn bình
     thường (đúng lỗi Nguyen chụp 2026-11-04 16:18, vẫn tái diễn sau bản
     vá retry trước). Nay CSS áp ngay (trình duyệt tự xếp hàng tải như
     mọi tài nguyên khác, và khâu làm nóng voice đã bơm nhỏ giọt — xem
     applyConfig), song song dùng Image() DÒ LỖI: file hỏng thật thì thử
     lại 2 lần rồi lùi dần bg-full -> bg-500, mọi lần lùi đều ghi vào hộp
     chẩn đoán để lần sau nhìn là biết file nào chết. */
  el.style.backgroundImage = `url("${file}")`;
  const chain = [file, 'bg-full.webp', 'bg-500.webp'].filter((v, i, a) => a.indexOf(v) === i);
  let ci = 0;
  const probe = (f, n) => {
    if (tk !== bgToken) return;
    const url = n ? f + '?r=' + n : f;
    const img = new Image();
    img.onload = () => { if (tk === bgToken) el.style.backgroundImage = `url("${url}")`; };
    img.onerror = () => {
      if (tk !== bgToken) return;
      if (n < 2) { setTimeout(() => probe(f, n + 1), 700); return; }
      ci++;
      if (ci < chain.length) {
        if (window.__diag) { window.__diag.errs.push('bg fail: ' + f); window.__diag.uiErr = 'Không tải được nền ' + f + ' — đã lùi về ' + chain[ci]; }
        el.style.backgroundImage = `url("${chain[ci]}")`;
        probe(chain[ci], 0);
      } else if (window.__diag) { window.__diag.errs.push('bg fail tat ca'); window.__diag.uiErr = 'Không tải được bất kỳ nền nào — kiểm tra LiveBridge có đang chạy không'; }
    };
    img.src = url;
  };
  probe(file, 0);
}

/* ============ Camera lia trong phòng rộng ============ */
let SW = 0, SH = 0, WW = 0, WH = 0;
/* KHÓA TÂM ĐIỂM SÂN KHẤU (Nguyen chốt 2026-11-04 18:31): cặp đang diễn
   là ưu tiên tuyệt đối — phải để họ ĐỨNG ĐỦ 5-6 giây (đúng mốc
   nhaCapTiepSauGiay) camera mới được lia đi chỗ khác. Hàm này trả số
   giây khóa còn lại (0 = hết khóa / không có cặp nào đang diễn). */
function stageLockRemain() {
  if (!P.stageFreshSec) return 0;
  return Math.max(0, (P.releaseSec || 6) - P.stageFreshSec());
}
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
  followC: null, farPair: null, pendingFollow: null, _pendT: 0,
  follow(couple) {
    /* ƯU TIÊN CAMERA (Nguyen chốt 2026-11-04 18:31):
       (a) Cặp đang ĐI LÊN giữ camera trước cặp đang ĐI XUỐNG — không để
           cảnh đi về cướp khung hình của cặp đang lên sân khấu.
       (b) Cặp đang DIỄN chưa đứng đủ 5-6s (khóa tâm điểm còn) thì chưa
           bám cặp khác: cặp đang đi lên được GHI NHỚ, hết khóa sẽ tự
           bám nếu còn đang đi lên; cặp đang đi xuống thì BỎ QUA luôn,
           giữ nguyên camera ở sân khấu cho cặp đang diễn. */
    if (couple && this.followC && this.followC.state === 'toStage' && couple.state !== 'toStage') return;
    const remain = stageLockRemain();
    if (couple && couple.state !== 'stage' && remain > 0) {
      if (couple.state === 'toStage') {
        this.pendingFollow = couple;
        clearTimeout(this._pendT);
        this._pendT = setTimeout(() => {
          const c = this.pendingFollow; this.pendingFollow = null;
          if (c && c.state === 'toStage' && !this.followC) { this.followC = c; this.busyUntil = 0; }
        }, remain * 1000 + 120);
      }
      return;
    }
    this.pendingFollow = null;
    this.followC = couple; this.busyUntil = 0;
  },
  unfollow() { this.followC = null; this.farPair = null; this.pendingFollow = null; clearTimeout(this._pendT); },
  home() { const v = (curView && curView.home) || [50, 36, 0.63]; this.panTo(v[0], v[1], v[2]); },
  stage() { const v = (curView && curView.stage) || [50, 34, 1.02]; this.panTo(v[0], v[1], v[2]); },
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
/* onPairFocus: GIỮ LẠI nhưng không còn chỗ nào gọi — ghép đôi/xếp lại hàng
   không lia cam nữa (Nguyen chot 2026-11-04), camera chỉ bám lúc lên sân khấu. */
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
  if (FX.stageSparkle) FX.stageSparkle(mid.fx, mid.fy - 0.04);
  FX.hearts(12, mid.fx, mid.fy);
  if (c.tagVangTen && MC.tagVang && MC.tagVang.length) {
    // Cặp "ghép tạm" vì người thương vắng mặt: MC tranh thủ rủ người thương vào live
    mcReact(2.6, MC.tagVang, { a: c.a.user.nickname, b: c.b.user.nickname, ten: c.tagVangTen });
  } else {
    mcReact(2.5, MC.couple, { a: c.a.user.nickname, b: c.b.user.nickname });
  }
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
  /* SẮP ĐẠT MỐC (Nguyen yêu cầu 2026-11-04): còn cách mốc kế tiếp không xa
     (<= mcSapMocConLai lượt, mặc định 20) thì MC hô hào cả phòng chia sẻ /
     rủ thêm người vào xem để mở sảnh mới — mỗi mốc chỉ hô 1 lần trong phiên.
     Biến: {moc} = mốc sắp đạt, {con} = số lượt còn thiếu, {sanh} = tên sảnh mới. */
  if (next && MC.sapMoc && MC.sapMoc.length) {
    const conLai = next.at - total, nguong = Number(cfg.mcSapMocConLai) || 20;
    if (conLai > 0 && conLai <= nguong && !sapMocDaBao.has(next.at)) {
      sapMocDaBao.add(next.at);
      mcReact(2.4, MC.sapMoc, { moc: String(next.at), con: String(conLai), sanh: next.name });
    }
  }
}
const sapMocDaBao = new Set();

/* ============ Banner nghi thức giữa sân khấu ============ */
let bannerTimer = 0;
function showBanner(text, ms = 4600) {
  const el = $('banner');
  if (!el) return;
  el.textContent = text;
  el.classList.add('on');
  placeBanner();
  clearTimeout(bannerTimer);
  bannerTimer = setTimeout(() => el.classList.remove('on'), ms);
}
/* Can vi tri banner cho vua ca hai phia (Nguyen chot 2026-11-04): mac dinh o
   bannerY (30%) — nhung khi bong MC dang hien thi phai dat banner NGAY DUOI
   bong MC, vi bong MC cao/thap theo do dai cau noi va z-index cua MC nam
   tren banner nen de co dinh se bi che chu. Van kep tran 36% de day banner
   khong vuot xuong che dau cap doi tren san khau (dau o ~39%). */
function placeBanner() {
  const el = $('banner');
  if (!el || !el.classList.contains('on')) return;
  let center = cfg.bannerY != null ? cfg.bannerY : 30;
  const mc = $('mc');
  if (mc && mc.classList.contains('on')) {
    const stg = stageEl.getBoundingClientRect();
    const mcBottom = (mc.getBoundingClientRect().bottom - stg.top) / stg.height * 100;
    center = Math.min(Math.max(center, mcBottom + 2.3), 36);
  }
  el.style.top = center + '%';
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
/* ===== Bong chat + san loc comment =====
   Nguyen chot cach loc (2026-11-04): tu cam thi CHE bang dau * (giu nguyen do
   dai, cau van hien — vi du "vui vl chung may a" -> "vui ** chung may a");
   comment chua QUA NHIEU tu cam (config bongChatAnKhiTuCamQua) thi AN HAN;
   text qua dai thi cat bot + "...". Danh sach tu cam sua trong config
   (tuCamComment), tat ca deu co config rieng.
   Cach khop tu (tranh che nham tu vo toi): tu CO DAU chi khop nguyen van voi
   danh sach (nen "lon" trong "sanh lon" khong bi che); tu KHONG DAU (go nhanh
   khong dau) khop theo dang bo dau — danh sach tu an toan (tuAnToanComment,
   dang bo dau) duoc mien tru, vd "cac" trong "cac ban". */
const FOLD_GROUPS = { a: 'àáảãạăằắẳẵặâầấẩẫậ', e: 'èéẻẽẹêềếểễệ', i: 'ìíỉĩị', o: 'òóỏõọôồốổỗộơờớởỡợ', u: 'ùúủũụưừứửữự', y: 'ỳýỷỹỵ', d: 'đ' };
const FOLD_MAP = {};
for (const base in FOLD_GROUPS) for (const ch of FOLD_GROUPS[base]) FOLD_MAP[ch] = base;
function foldWord(s) {
  return String(s).toLowerCase().split('').map(ch => FOLD_MAP[ch] || ch).join('').replace(/(.)\1+/g, '$1');
}
let banExact = new Set(), banFold = new Set(), safeFold = new Set(['cac']);
/* Danh sách trong config PHẢI là mảng — nhưng settings.json trên máy người
   dùng có thể lưu dạng CHUỖI thô (bản admin cũ ghi text thẳng vào file) và
   cầu nối trộn nguyên xi vào config gửi cho game. Ép kiểu tại đây: mảng thì
   giữ, chuỗi thì tách theo dấu phẩy/xuống dòng. Thiếu bước này, 1 key dạng
   chuỗi làm .map() văng TypeError GIỮA applyConfig -> mọi thứ sau nó (bảng,
   hướng dẫn, nền...) chết theo mà sự kiện vẫn chạy — đúng lỗi Nguyen gặp
   2026-11-04 (màn hình đỏ #430b18, mất hết khung). */
function asList(v) {
  return Array.isArray(v) ? v : (typeof v === 'string' ? v.split(/[\n,;]+/).map(s => s.trim()).filter(Boolean) : []);
}
function buildBanSets() {
  banExact = new Set(); banFold = new Set();
  for (const w of asList(cfg.tuCamComment)) {
    const t = String(w).trim().toLowerCase();
    if (!t) continue;
    banExact.add(t); banFold.add(foldWord(t));
  }
  safeFold = new Set((cfg.tuAnToanComment == null ? ['cac'] : asList(cfg.tuAnToanComment)).map(w => foldWord(String(w).trim())));
}
function chatFilter(raw) {
  const text = String(raw || '').trim().replace(/\s+/g, ' ');
  if (!text) return null;
  let hits = 0;
  const shown = text.split(' ').map(tok => {
    const m = tok.match(/^([^\p{L}\p{N}]*)([\p{L}\p{N}]+)([^\p{L}\p{N}]*)$/u);
    if (!m) return tok;
    const core = m[2], low = core.toLowerCase();
    let bad = /[^\x00-\x7F]/.test(core) ? banExact.has(low) : (banFold.has(foldWord(core)) && !safeFold.has(foldWord(core)));
    if (!bad) return tok;
    hits++;
    return m[1] + '*'.repeat(Math.min(core.length, 12)) + m[3];
  }).join(' ');
  if (hits > (cfg.bongChatAnKhiTuCamQua != null ? cfg.bongChatAnKhiTuCamQua : 2)) return null; // nhieu tu cam qua -> an han
  const max = cfg.bongChatMaxKyTu || 60;
  return shown.length > max ? shown.slice(0, max - 1).trimEnd() + '…' : shown;
}
/* Uu tien len san khau cho NGUOI TANG QUA (Nguyen chot 2026-11-04): cap cua ho
   duoc dua len DAU hang cho — tuc la cap KE TIEP duoc len san khau, khong chen
   ngang cap dang dien. Ho con doc than thi MC se duyen luon (uu tien khac
   gioi) roi cung dua len dau hang. Tat bang config uuTienQuaTang: false. */
function giftPriority(user) {
  if (!user) return;
  const c = P.coupleOf(user.id);
  if (c) {
    if (P.bumpCouple(c)) toast(`🎁 ${user.nickname} tặng quà — cặp của bạn được ưu tiên lên sân khấu kế tiếp!`, true);
    return;
  }
  const alt = randomSingleOpp(user) || randomSingle(user);
  if (!alt) return;
  const nc = requestCouple(user, alt, false);
  if (nc) { nc.giftPriority = true; toast(`🎁 ${user.nickname} tặng quà — MC se duyên và ưu tiên cặp của bạn lên sân khấu kế tiếp!`, true); }
}
function showBubble(user, text) {
  if (cfg.hienBongChat === false) return;
  const shown = chatFilter(text);
  if (shown) P.say(user.id, shown, cfg.bongChatGiay || 4);
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
/* Người độc thân KHÁC GIỚI đang có mặt trong phòng (phục vụ ghép tạm khi tag
   người thương vắng mặt): ưu tiên người đoán giới tính ngược hẳn với người tag;
   không có thì lấy người chưa đoán được giới tính; tuyệt không ghép cùng giới
   khi đã đoán được giới tính của cả hai. */
function randomSingleOpp(except) {
  const g = (P.get(except.id) || {}).genderFixed || P.guessGender(except.nickname || '');
  const strict = [], loose = [];
  for (const u of known.values()) {
    if (u.id === except.id) continue;
    const p = P.get(u.id);
    if (!p || p.couple) continue;
    const gu = p.genderFixed || P.guessGender(u.nickname || '');
    if (g !== '?' && gu !== '?' && gu === g) continue;   // cùng giới rõ ràng -> bỏ qua
    (gu !== '?' && g !== '?' ? strict : loose).push(u);
  }
  const pool = strict.length ? strict : loose;
  return pool.length ? pool[Math.floor(Math.random() * pool.length)] : null;
}
/* ===== Chong spam len san khau: so giay nghi TU DONG (Nguyen chot) =====
   Cong thuc (moi tham so deu o config): giay nghi = co ban
   + (so cap dang cho x congMoiCapCho) + (so cap ghep thua trong 3 phut
   x congMoiCapGhep), roi nhan he so theo TONG LUOT XEM (vang nguoi < nguong
   -> giam, dong > nguong -> tang) va kep trong [min, max]. Phong vang thi
   nghi ngan (cap len lai nhanh cho co khong khi), phong dong thi nghi dai
   (chia san khau deu cho moi nguoi). Tat tu dong bang choTuDong: false thi
   dung co dinh choLenSanKhauCoBan giay. */
const coupleFormTimes = [];
let lastQueueLen = 0;
function computeStageCooldown() {
  const base = cfg.choLenSanKhauCoBan != null ? cfg.choLenSanKhauCoBan : 90;
  if (cfg.choTuDong === false) return base;
  const now = Date.now();
  while (coupleFormTimes.length && now - coupleFormTimes[0] > 180000) coupleFormTimes.shift();
  const extra = Math.max(0, coupleFormTimes.length - (cfg.choMienGhep != null ? cfg.choMienGhep : 2));
  let sec = base
    + lastQueueLen * (cfg.choCongMoiCapCho != null ? cfg.choCongMoiCapCho : 15)
    + extra * (cfg.choCongMoiCapGhep != null ? cfg.choCongMoiCapGhep : 8);
  const views = totalBase + counted.size;
  if (views < (cfg.choNguongVang != null ? cfg.choNguongVang : 300)) sec *= (cfg.choHeSoVang != null ? cfg.choHeSoVang : 0.6);
  else if (views > (cfg.choNguongDong != null ? cfg.choNguongDong : 1500)) sec *= (cfg.choHeSoDong != null ? cfg.choHeSoDong : 1.3);
  const min = cfg.choLenSanKhauMin != null ? cfg.choLenSanKhauMin : 20;
  const max = cfg.choLenSanKhauMax != null ? cfg.choLenSanKhauMax : 600;
  return Math.round(Math.min(max, Math.max(min, sec)));
}
setInterval(() => { P.setStageCooldown(computeStageCooldown()); }, 5000);
/* ===== Hieu ung NGAU NHIEN giu sanh luon song (Nguyen chot 2026-11-04) =====
   Nguoi xem nhieu khi chi chat / tha tim chu khong tang qua — neu chi cho
   qua moi co hieu ung thi sanh trong chet. Cu moi mot khoang ngau nhien
   [hieuUngNgauNhienTuGiay, hieuUngNgauNhienDenGiay] giay game tu ban 1 hieu
   ung bat ky (hoa roi, kim tuyen, phao hoa, tim bay...) — moc sanh cang cao
   lua chon cang phong phu. Tat bang hieuUngNgauNhien: false. */
let nextRandomFxAt = 0;
function fireRandomFx() {
  const tier = BG.tier;
  const pool = ['petals', 'glitter', 'hearts', 'confetti', 'fireworks'];
  if (tier >= 2) pool.push('petals', 'bokeh', 'fireworks');
  if (tier >= 3) pool.push('lanterns');
  const pick = pool[Math.floor(Math.random() * pool.length)];
  const R = (a, b) => a + Math.random() * (b - a);
  if (pick === 'petals') FX.petals(Math.round(R(45, 95)));
  else if (pick === 'glitter') FX.glitter(Math.round(R(45, 85)));
  else if (pick === 'confetti') FX.confetti(Math.round(R(30, 60)));
  else if (pick === 'fireworks') FX.fireworksShow(Math.round(R(1, 3.4)), 320);
  else if (pick === 'bokeh') FX.bokeh(Math.round(R(5, 9)));
  else if (pick === 'lanterns') FX.lanterns(Math.round(R(3, 5)));
  else if (pick === 'hearts') {
    const feat = P.featured();
    if (feat) { const sp = Cam.toScreen(feat.a.x, feat.a.y); FX.ringHearts(sp.fx, sp.fy - 0.05); }
    else FX.hearts(Math.round(R(8, 14)));
  }
  const feat2 = P.featured();
  if (feat2 && Math.random() < 0.35 && FX.stageSparkle) {
    const sp2 = Cam.toScreen(feat2.a.x, feat2.a.y);
    FX.stageSparkle(sp2.fx, sp2.fy - 0.05);
  }
}
setInterval(() => {
  if (cfg.hieuUngNgauNhien === false) return;
  const now = performance.now();
  const lo = (cfg.hieuUngNgauNhienTuGiay != null ? cfg.hieuUngNgauNhienTuGiay : 12) * 1000;
  const hi = Math.max(lo, (cfg.hieuUngNgauNhienDenGiay != null ? cfg.hieuUngNgauNhienDenGiay : 25) * 1000);
  if (!nextRandomFxAt) { nextRandomFxAt = now + lo + Math.random() * (hi - lo); return; }
  if (now < nextRandomFxAt) return;
  nextRandomFxAt = now + lo + Math.random() * (hi - lo);
  fireRandomFx();
}, 1000);
P.onStageSkipped = function (c) {
  toast(`⏳ ${c.a.user.nickname} ❤ ${c.b.user.nickname} vừa làm lễ xong — ${P.stageCooldownRemain(c)}s nữa mới lên lại được`, false);
};
/* ===== MC chế giễu khi tag trúng người ĐÃ CÓ ĐÔI (Nguyen chot) =====
   Trước đây tag hụt kiểu này chỉ có 1 câu cứng không tên tuổi. Nay dùng
   pool mcTagDaCoDoi trong config (nhiều biến thể hài, chèn tên {a} người
   tag, {b} người bị tag, {c} bạn đời hiện tại của phía đã có đôi) +
   cooldown theo người tag (mcCheGheuChoGiay) và tối thiểu 6s toàn cục. */
const cheGheuCd = new Map();
let lastCheGheuAt = -1e9;
function cheGheuTag(ua, ub) {
  const pool = MC.tagDaCoDoi || [];
  if (!pool.length) return;
  const now = performance.now();
  const cdMs = (cfg.mcCheGheuChoGiay != null ? cfg.mcCheGheuChoGiay : 20) * 1000;
  if (now - (cheGheuCd.get(ua.id) || -1e9) < cdMs) return;
  if (now - lastCheGheuAt < 6000) return;
  let partner = null;
  const cplB = P.coupleOf(ub.id);
  if (cplB && cplB.a.user.id !== ua.id && cplB.b.user.id !== ua.id) {
    partner = cplB.a.user.id === ub.id ? cplB.b.user : cplB.a.user;   // B đã có đôi với người khác
  } else {
    const cplA = P.coupleOf(ua.id);
    if (cplA && cplA.a.user.id !== ub.id && cplA.b.user.id !== ub.id) {
      partner = cplA.a.user.id === ua.id ? cplA.b.user : cplA.a.user; // ngược lại: A đã có đôi với người khác
    }
  }
  if (!partner) return;
  cheGheuCd.set(ua.id, now);
  lastCheGheuAt = now;
  mcReact(2.2, pool, { a: ua.nickname, b: ub.nickname, c: partner.nickname });
}
function requestCouple(a, b, viaTag) {
  const ua = register(a), ub = register(b);
  if (!ua || !ub || ua.id === ub.id) return null;
  const now = performance.now();
  if (viaTag) {
    if (now - (tagCooldown.has(ua.id) ? tagCooldown.get(ua.id) : -1e9) < 20000) return null;
    tagCooldown.set(ua.id, now);
  }
  const before = P.coupleOf(ua.id);
  const wasPair = !!(before && ((before.a.user.id === ua.id && before.b.user.id === ub.id) || (before.a.user.id === ub.id && before.b.user.id === ua.id)));
  const c = P.makeCouple(ua, ub);
  if (!c) {
    cheGheuTag(ua, ub);   // một trong hai đã có đôi khác -> MC chế giễu có tên tuổi theo pool config
    return null;
  }
  coupleByKey.set(c.key, c);
  if (wasPair) {
    /* Cap da ton tai: dang trong quy trinh len san khau (gioi thieu / hang
       cho / dang dien) thi bo qua — comment them KHONG them trung vao danh
       sach cho. Da lam le xong va o nha thi xet dem nguoc de len LAN NUA. */
    if (c.state === 'court') {
      /* Khong doi ca hai phai ve toi nha: walkPath thay duong di + callback
         cu nen ke ca dang di ve cung re len san khau sach se duoc. */
      const remain = P.stageCooldownRemain(c);
      if (remain > 0) {
        toast(`⏳ ${ua.nickname} ❤ ${ub.nickname} vừa làm lễ xong — ${remain}s nữa mới lên lại được`, false);
        return c;
      }
      if (P.requeueCouple(c)) {
        coupleFormTimes.push(Date.now());
        /* NGOẠI LỆ cho cặp ĐÃ làm lễ được tag lại (Nguyen chot 2026-11-04):
           thay sang BỘ ĐỒ CƯỚI KHÁC + lia cam tới như cặp mới cho đẹp.
           (Cặp ghép lần đầu vẫn: không lia cam, chờ tới lượt mới thay đồ.) */
        P.cycleOutfit(c.a.user.id);
        c.a.el.classList.add('pairfx'); c.b.el.classList.add('pairfx');
        if (P.onPairFocus) P.onPairFocus(c);
        toast(`${ua.nickname} ❤ ${ub.nickname} — lên sân khấu lần nữa!`, false);
      }
    }
    return c;
  }
  coupleFormTimes.push(Date.now());
  toast(`${ua.nickname} ❤ ${ub.nickname} — đang lên sân khấu!`, false);
  return c;
}
P.onCoupleStage = function (c) {
  couplesDone++;
  try { localStorage.setItem(LS_COUPLLES, String(couplesDone)); } catch (e) {}
  renderCoupleCount();
  coupleScore(c, 30);
  if (BG.tier >= 4) P.setCrown(c);   // từ mốc Đại Tiệc Vàng (600+): cặp nào lên bục cũng đội vương miện
  Cam.unfollow();
  Cam.busyUntil = Date.now() + 9000;
  Cam.stage();
  showBanner(`💍 LỄ THÀNH HÔN #${couplesDone} · ${c.a.user.nickname} ❤ ${c.b.user.nickname}`);
  const sp = Cam.toScreen(c.a.x, c.a.y);
  if (FX.cannon) FX.cannon();
  if (FX.butterflies) FX.butterflies(2);   // bướm phát sáng bay ra mừng lễ thành hôn
  FX.petals(60);
  if (FX.petalBurst) FX.petalBurst(sp.fx, sp.fy);
  if (FX.ringHearts) FX.ringHearts(sp.fx, sp.fy - 0.09);
  if (FX.stageSparkle) FX.stageSparkle(sp.fx, sp.fy - 0.06);
  const spot = $('spot'); if (spot) spot.classList.add('on');
};
P.onQueueChange = function (names) {
  lastQueueLen = names.length;
  const el = $('queue');
  if (!names.length) { el.innerHTML = ''; return; }
  /* Chi hien toi da hangChoToiDa cap (mac dinh 4) cho gon khung hinh —
     phan con lai gom thanh 1 dong tong (Nguyen chot 2026-11-04). */
  const cap = Math.max(1, cfg.hangChoToiDa || 4);
  const rows = names.slice(0, cap).map(n => `<div class="qrow">💞 ${escapeHtml(n)}</div>`).join('');
  const more = names.length > cap ? `<div class="qrow" style="opacity:.75">➕ ${names.length - cap} cặp đang chờ nữa</div>` : '';
  el.innerHTML = `<b>💌 Cặp chờ lên sân khấu:</b>` + rows + more;
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
/* Ưu tiên VOICE cho người tặng quà (Nguyen yêu cầu 2026-11-04): hàng chờ
   MC vốn đã sắp xếp theo prio giảm dần và chen lên trước được — nên chỉ
   cần cho câu cảm ơn quà một prio TĂNG THEO GIÁ TRỊ QUÀ: quà càng lớn
   càng nói trước; quà nhỏ nhất (3.0) vẫn trên follow (2.9); mốc sảnh
   nâng cấp giữ 4.0, chỉ quà ≥299 mới vượt qua. */
function giftVoicePrio(dia) {
  if (dia >= 1000) return 4.8;
  if (dia >= 299) return 4.4;
  if (dia >= 99) return 4.0;
  if (dia >= 30) return 3.6;
  if (dia >= 10) return 3.3;
  return 3.0;
}
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
/* ===== Lệnh chat tương tác: tự khai giới tính + đổi trang phục (Nguyen chot) =====
   Tên người dùng rất khó đoán nam/nữ (nickname lạ, không dấu, tên nước ngoài)
   — thay vì đoán mò, cho họ TỰ KHAI: gõ "nam" / "nữ" (hoặc "tôi là nam",
   "là nữ", "con trai", "con gái") là nhân vật đổi sang đúng giới tính, đang
   có đôi thì đảo vai cô dâu/chú rể cho đúng. Gõ "đổi đồ" là thay trang phục
   (có đôi thì cả cặp đổi bộ phối sẵn). Vừa sửa được nhận dạng sai, vừa thêm
   lý do để khách comment tương tác và có cảm giác trải nghiệm. */
const outfitCd = new Map();
function foldCmd(s) {
  return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/\s+/g, ' ').trim();
}
function handleChatCommands(user, text) {
  const p = P.get(user.id);
  if (!p) return;
  const f = foldCmd(text);
  if (cfg.lenhDoiGioiTinh !== false) {
    let g = null;
    if (/\b(la nu|la gai|con gai)\b/.test(f) || /^(nu|gai)[ !.~]*$/.test(f)) g = 'F';
    else if (/\b(la nam|la trai|con trai)\b/.test(f) || /^(nam|trai)[ !.~]*$/.test(f)) g = 'M';
    if (g) {
      const r = P.declareGender(user.id, g);
      const sp = Cam.toScreen(p.x, p.y);
      FX.hearts(6, sp.fx, sp.fy - 0.03);
      toast(g === 'F'
        ? `✅ ${user.nickname} là nữ — đã đổi sang nhân vật nữ${r && r.roleSwapped ? ' + đảo vai cô dâu cho đúng' : ''}!`
        : `✅ ${user.nickname} là nam — đã đổi sang nhân vật nam${r && r.roleSwapped ? ' + đảo vai chú rể cho đúng' : ''}!`, false);
    }
  }
  if (cfg.lenhDoiTrangPhuc !== false && /\b(doi do|doi trang phuc|thay do|thay trang phuc)\b/.test(f)) {
    const now = performance.now();
    const cdMs = (cfg.doiTrangPhucChoGiay != null ? cfg.doiTrangPhucChoGiay : 5) * 1000;
    if (now - (outfitCd.get(user.id) || -1e9) >= cdMs) {
      outfitCd.set(user.id, now);
      const r = P.cycleOutfit(user.id);
      const sp = Cam.toScreen(p.x, p.y);
      FX.hearts(6, sp.fx, sp.fy - 0.03);
      if (r && r.couple) toast(`👗 ${p.couple.a.user.nickname} ❤ ${p.couple.b.user.nickname} đổi bộ đồ cưới "${r.setName}"!`, false);
      else toast(`👗 ${user.nickname} vừa đổi trang phục mới!`, false);
    }
  }
}
function onChat(m) {
  if (!m.user) return;
  ensureGuest(m.user);
  const text = String(m.text || '');
  showBubble(m.user, text);
  handleChatCommands(m.user, text);
  const partner = parseTag(text, m.user);
  if (partner) {
    /* Người được tag CHƯA HỀ có mặt trong game (parseTag trả về "bóng ma"
       tag:...): thay vì ghép với bóng ma, ghép TẠM với 1 người độc thân khác
       giới đang có mặt + MC đọc câu rủ người thương vào live — tạo động lực
       kéo đúng người yêu/vợ chồng của họ vào phòng để ghép đúng đôi. Hết
       người phù hợp thì mới quay về ghép bóng ma như cũ. */
    if (String(partner.id).startsWith('tag:') && cfg.ghepDoiNgauNhien !== false) {
      const alt = randomSingleOpp(m.user);
      if (alt) {
        const c = requestCouple(m.user, alt, true);
        if (c) { c.tagVangTen = partner.nickname; return; }
      }
    }
    requestCouple(m.user, partner, true); return;
  }
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
    mcReact(2.9, MC.follow, { ten: ev.user.nickname });   // follow xếp SAU mọi câu cảm ơn quà (Nguyen yêu cầu 2026-11-04)
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
    mcReact(giftVoicePrio(dia), MC.thank, { ten: ev.user ? ev.user.nickname : 'Bạn' });
    toast(`🎁 ${ev.user ? ev.user.nickname : 'Khách'} tặng ${src.giftName || 'quà'}${dia >= 99 ? ' — pháo hoa rực trời!' : ''}`, dia >= 30);
    addLedger(ev.user, src.giftName, dia);
    if (cfg.uuTienQuaTang !== false) giftPriority(ev.user);
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

/* Vi tri cac KHUNG UI theo config (Nguyen chot 2026-11-04): khi live qua
   TikTok, nhieu vung bi giao dien TikTok che — moi khung chinh duoc dich
   bang 2 so % cua khung hinh: X duong = dich sang phai, Y duong = dich
   xuong. Ap vao cac bien CSS offset ma index.html da cong vao vi tri
   neo cua tung khung (khung ben phai neo theo canh phai nen tru nguoc). */
function applyPanelPos() {
  const root = document.documentElement.style;
  const px = (v, base) => ((Number(v) || 0) / 100 * (base || 0)) + 'px';
  root.setProperty('--plx', px(cfg.khungTraiX, SW)); root.setProperty('--ply', px(cfg.khungTraiY, SH));
  root.setProperty('--prx', px(cfg.khungPhaiX, SW)); root.setProperty('--pry', px(cfg.khungPhaiY, SH));
  root.setProperty('--qx', px(cfg.khungHangChoX, SW)); root.setProperty('--qy', px(cfg.khungHangChoY, SH));
  root.setProperty('--mcx', px(cfg.khungMcX, SW)); root.setProperty('--mcy', px(cfg.khungMcY, SH));
  /* Banner "LE THANH HON" (va banner moc/qua lon): cao bao nhieu % tinh tu
     mep tren — dua len cao de khong che mat nhan vat tren san khau (mac dinh
     30%, truoc day co dinh 44% nen che ngang cap doi). */
  root.setProperty('--by', String(cfg.bannerY != null ? cfg.bannerY : 30));
}
/* ============ Cấu hình ============ */
function applyConfig(c) {
  cfg = c || {};
  /* Chuẩn hoá MỌI key danh sách ngay đầu vào, VÔ ĐIỀU KIỆN: settings.json
     trên máy người dùng có thể lưu key dạng chuỗi thô, object hoặc số (di
     chứng các bản admin cũ) — asList ép hết về mảng chuỗi sạch. 1 key sai
     kiểu không được phép giết cả quá trình áp config/UI (lỗi 2026-11-04:
     màn hình mất hết khung/BXH/MC dù sự kiện vẫn chạy). */
  for (const k of ['mcLines', 'mcFunny', 'mcCouple', 'mcThank', 'mcGreet', 'mcFollowLines', 'mcMilestone', 'mcTagVang', 'mcTagDaCoDoi', 'mcSapMoc', 'rulesLines', 'guideLines']) {
    cfg[k] = asList(cfg[k]).filter(x => typeof x === 'string');
  }
  if (cfg.mcName) MC.name = cfg.mcName;
  /* HAI MC LUÂN PHIÊN (Nguyen yêu cầu 2026-11-04): 1 nam + 1 nữ, hiện lên
     kiểu NGẪU NHIÊN (không phải nam-nữ-nam cứng nhắc — chỉ tránh 1 người
     nói 3 câu liên tiếp). MC nữ dùng giọng mặc định của game (ô "Giọng
     NPC" trong admin, mặc định Hoài My); MC nam dùng npcVoiceNam (mặc
     định Nam Minh). Nhân vật được chốt ngay khi câu vào hàng chờ để khâu
     chuyển giọng chuẩn bị đúng giọng của người sắp nói. */
  MC.personas = [
    { name: cfg.mcName || 'MC Anh Tú', img: 'img/mc.png', voice: cfg.npcVoiceNam || 'vi-VN-NamMinhNeural' },
    { name: cfg.mcNameNu || 'MC Ngọc Trâm', img: 'img/mc-nu.png', voice: null },
  ];
  MC.lines = (cfg.mcLines && cfg.mcLines.length) ? cfg.mcLines : ['Một đám cưới vui là khi khách mời cười nhiều hơn cô dâu chú rể.', 'Tình yêu không cần hoàn hảo, chỉ cần hai người cùng tag nhau lên sân khấu là đủ.', 'Cả nhà thả tim thật nhiều để chúc phúc cho các cặp đôi nhé!'];
  MC.funny = (cfg.mcFunny && cfg.mcFunny.length) ? cfg.mcFunny : ['MC dặn nhỏ: tag người yêu cũ vào đây MC tính phí gấp đôi nhé!', 'Ai còn độc thân giơ tay, MC nhìn thấy hết đấy, đừng trốn sau hàng ghế nữa!', 'Đi ăn cưới online mà không mất tiền mừng, thời đại này sướng thật!'];
  MC.couple = cfg.mcCouple || [];
  MC.thank = cfg.mcThank || []; MC.greet = cfg.mcGreet || []; MC.follow = cfg.mcFollowLines || [];
  MC.tagVang = cfg.mcTagVang || [];
  MC.tagDaCoDoi = (cfg.mcTagDaCoDoi && cfg.mcTagDaCoDoi.length) ? cfg.mcTagDaCoDoi : ['ê {a}, {b} đã có đôi rồi, mình không nên phá hoại gia đình nhà người khác nhá!', '{a} à, {b} đã có gia đình rồi, bạn nên chọn người khác đi nhé!', '{b} là của {c} rồi {a} ơi, chen vào là MC không cứu được đâu!', 'Thôi {a} ơi, {b} với {c} đang hạnh phúc, mình đừng làm kỳ đà cản mũi nha!'];
  try {
  buildBanSets();
  P.setStageCooldown(computeStageCooldown());
  MC.milestone = cfg.mcMilestone || [];
  MC.sapMoc = (cfg.mcSapMoc && cfg.mcSapMoc.length) ? cfg.mcSapMoc : ['Cả nhà ơi, chỉ còn {con} lượt xem nữa là chạm mốc {moc} — sảnh {sanh} sắp mở rồi! Mọi người chia sẻ live giúp MC nhé!', 'Sắp rồi, sắp rồi! Còn đúng {con} lượt xem nữa là lên mốc {moc} — ai chưa vào thì vào nhanh nào!', 'Mốc {moc} lượt xem ở ngay trước mắt, chỉ thiếu {con} nữa thôi! Cả nhà thả tim và chia sẻ để mở sảnh {sanh} nhé!'];
  if (window.NpcVoice) NpcVoice.setConfig(cfg);
  if (window.NpcVoice && NpcVoice.enabled()) {
    /* LÀM NÓNG voice — nhưng PHẢI NHƯỜNG ĐƯỜNG lúc mới mở game: bản cũ
       bắn ~260 request tổng hợp CÙNG LÚC (2 giọng × ~130 đoạn tĩnh) ngay
       khi nhận config; Chrome chỉ cho ~6 kết nối/host và bridge tổng hợp
       TUẦN TỰ, nên ảnh nền/ảnh nhân vật bị kẹt sau hàng chờ voice cả
       phút — sảnh trống đỏ khi mới mở game (Nguyen chụp 2026-11-04
       16:18). Nay: chờ 2.5s cho nền và khung ổn định, rồi bơm NHỎ GIỌT
       2 đoạn (×2 giọng) mỗi 300ms; voice vẫn nóng dần trong ~1 phút đầu
       mà không nghẽn mạng. Câu nào cần nói trước khi nóng kịp thì khâu
       prefetch lúc vào hàng chờ vẫn lo như cũ. */
    const jobs = [];
    const seenSeg = new Set();
    for (const pool of [MC.lines, MC.funny, MC.greet, MC.follow, MC.thank, MC.milestone, MC.tagVang, MC.tagDaCoDoi, MC.sapMoc, MC.couple]) {
      for (const tpl of pool || []) for (const seg of staticSegmentsOf(tpl)) {
        if (!seenSeg.has(seg)) { seenSeg.add(seg); jobs.push(seg); }
      }
    }
    const mv = MC.personas && MC.personas[0] && MC.personas[0].voice;
    if (MC._warmTimer) clearTimeout(MC._warmTimer);
    let ji = 0;
    const pumpWarm = () => {
      for (let n = 0; n < 2 && ji < jobs.length; n++) {
        const seg = jobs[ji++];
        NpcVoice.prefetch(seg);          // giọng mặc định (MC nữ)
        if (mv) NpcVoice.prefetch(seg, mv);   // cả giọng MC nam
      }
      if (ji < jobs.length) MC._warmTimer = setTimeout(pumpWarm, 300);
    };
    MC._warmTimer = setTimeout(pumpWarm, 2500);
  }
  if (cfg.coupleSec) P.coupleSec = cfg.coupleSec;
  if (cfg.nhaCapTiepSauGiay) P.releaseSec = cfg.nhaCapTiepSauGiay;
  if (cfg.boQuaLiaCamKhiChoTren) P.crowdSkip = cfg.boQuaLiaCamKhiChoTren;
  P.setTune({ boost: cfg.phongToGoiTen, scaleC: cfg.coCapGiua, scaleS: cfg.coCapBen, maxStage: cfg.soCapToiDa, crowdQueue: cfg.hangChoDongThiThemCap, pairOffC: cfg.lechCapGiua, pairOffS: cfg.lechCapBen, spotSide: cfg.tamCapBen, priorityOn: cfg.uuTienChoTrong !== false, crowdMin: cfg.nguongDongNguoi, staleMin: cfg.phutImMatCho, innerRatio: cfg.tyLeChoTrong, quietMax: cfg.phongVangDuoi });
  FX.setTier(BG.tier < 0 ? 0 : BG.tier);
  applyPanelPos();
  A.setConfig(cfg);
  } catch (e) { console.error('[dam-cuoi] applyConfig loi o phan cau hinh:', e); }
  /* Hàng UI chạy SAU và TỪNG BƯỚC RIÊNG: dù bất kỳ bước cấu hình nào ở trên
     còn vấp, các khung luật/hướng dẫn/BXH/nền VẪN phải hiện — test giả lập
     hay live thật đều thấy UI như nhau. */
  for (const fn of [renderRules, startGuide, renderBoard, renderCoupleCount, () => refreshBg(false)]) {
    try { fn(); } catch (e) { console.error('[dam-cuoi] loi ve UI:', e); if (window.__diag) window.__diag.uiErr = String((e && e.message) || e); }
  }
  if (window.__diag) window.__diag.stage = 'config-ok';   // mốc cho hộp tự chẩn đoán ở index.html
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
    const top = Math.max(0, innerHeight * 0.10);
    root.setProperty('--k', u0 < 2.8 && Hpx > Wpx ? '1.55' : '1');
    root.setProperty('--safe', top + 'px');
  } else {
    root.setProperty('--k', '1.2'); root.setProperty('--safe', '0px');
  }
  /* --side LUÔN = 0: các khung nằm TRONG #stage nên chỉ được bám mép sân
     khấu. Trước đây nhánh compact gán --side = fitW (khoảng trống NGOÀI sân
     khấu khi cửa sổ trình duyệt rộng hơn 9:16) — trên Chrome desktop cửa sổ
     landscape, fitW vài trăm px cộng vào left/right của khung làm khung bị
     đẩy văng hẳn khỏi sân khấu (và max-width của #left âm -> co còn ~18px):
     game chạy đúng hết (DOM/config/BXH đều sẵn) mà không thấy khung nào.
     LIVE Studio và bản test tự động vừa khung 9:16 (fitW = 0) nên không lộ.
     Đã tái hiện bằng cửa sổ 1600x900 giả lập Chrome thật: khung trái x=1099
     trong khi sân khấu chỉ tới 1053, BXH bị đẩy sang trái khỏi sân khấu. */
  root.setProperty('--side', '0px');
  FX.resize(sw, sh, Math.min(2, window.devicePixelRatio || 1));
  SW = sw; SH = sh; WW = Math.round(sw * 3.2); WH = Math.round(sh * 2.2);
  applyPanelPos();
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

/* ============ Âm thanh: theo config, KHÔNG còn nút bấm (Nguyen chot 2026-11-04) ============
   Nút "Bấm để bật âm thanh" đã bỏ hẳn: tiếng đi theo config trong setting
   (mặc định tắt). audio.js tự mở khóa âm thanh ở lần chạm/phím đầu tiên trên
   trang (pointerdown/keydown) nên nếu bật nhạc trong config thì click đầu
   tiên vào trang là có tiếng — không cần nút riêng che khung hình nữa. */
let audioInited = false;
function initAudio() {
  if (audioInited) return;
  audioInited = true;
  A.init();
}

/* ============ Khởi động ============ */
FX.init($('fx'));
P.init($('people'), $('tables'));
resize();
Cam.home();
refreshBg(false);
/* Rảnh rỗi lâu thì camera tự lia đi ngắm khách một vòng rồi về sân khấu */
setInterval(() => {
  if (Date.now() < Cam.busyUntil || P.featured() || Cam.followC || stageLockRemain() > 0) return;
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
    mcNameNu: 'MC Ngọc Trâm',
    npcVoiceOn: true, npcVoice: 'vi-VN-HoaiMyNeural', npcVoiceNam: 'vi-VN-NamMinhNeural', npcVoiceMinGapSec: 8, npcVoiceMaxPerMin: 6,
    coupleSec: 15, nhaCapTiepSauGiay: 6, boQuaLiaCamKhiChoTren: 12,
    phongToGoiTen: 1.32, coCapGiua: 1.22, coCapBen: 1.22, soCapToiDa: 2, hangChoDongThiThemCap: 4,
    phongVangDuoi: 15, liaCamNguoiMoiKhiVang: true, liaCamNguoiMoiGiay: 4,
    zoomGoiTen: 1.18, zoomBamTheo: 1.08, lechCapGiua: 1.8, lechCapBen: 1.7, tamCapBen: 42,
    uuTienChoTrong: true, nguongDongNguoi: 70, phutImMatCho: 4, tyLeChoTrong: 0.45,
    mcMinSec: 16, mcMaxSec: 24,
    bgRules: [
      { viewers: 50, file: 'bg-500.webp' }, { viewers: 150, file: 'bg-2000.webp' },
      { viewers: 300, file: 'bg-5000.webp' }, { viewers: 600, file: 'bg-10000.webp' }, { viewers: 1000, file: 'bg-sanh-moi.webp' },
    ],
    rulesLines: ['💌 Tag @tên người thương → cùng lên sân khấu', '🎁 Quà càng lớn, pháo hoa càng to', '👁 Tổng lượt xem càng cao → sảnh cưới càng xịn'],
    guideLines: ['💌 Gõ "@tên người thương" → 2 bạn lên sân khấu', '🎁 Tặng quà → pháo hoa cho cặp đôi tâm điểm', '👑 Cặp được tặng nhiều quà nhất sẽ đội vương miện', '👗 Gõ "nam" / "nữ" / "đổi đồ" → đổi nhân vật, trang phục', '👁 Kéo bạn bè vào xem → sảnh nâng cấp theo tổng lượt view'],
    mcLines: ['Một đám cưới vui là khi khách mời cười nhiều hơn cô dâu chú rể.', 'Tình yêu không cần hoàn hảo, chỉ cần hai người cùng tag nhau lên sân khấu là đủ.', 'Cả nhà thả tim thật nhiều để chúc phúc cho các cặp đôi nhé!', 'Đám cưới online mà vui như offline — chỉ thiếu mỗi phong bao của bạn thôi đó!', 'Ai chưa tag người thương thì tag lẹ đi, sân khấu đang trống nè!', 'Sảnh cưới hôm nay rộn ràng quá — MC dẫn mà cũng muốn cưới theo luôn!', 'Cả nhà nhớ thả tim đều tay nhé, tim càng nhiều cặp đôi càng hạnh phúc!'],
    mcFunny: ['MC dặn nhỏ: tag người yêu cũ vào đây MC tính phí gấp đôi nhé!', 'Ai còn độc thân giơ tay, MC nhìn thấy hết đấy, đừng trốn sau hàng ghế nữa!', 'Đi ăn cưới online mà không mất tiền mừng, thời đại này sướng thật!', 'Luật của sảnh: vào đây là phải vui, ai buồn MC cho lên sân khấu cưới luôn!', 'MC đếm rồi: phòng mình còn nhiều người độc thân lắm — tag nhau đi kẻo MC mai mối đại đó!', 'Ăn cưới online sướng nhất là không phải rửa chén — cứ ngồi xem và thả tim thôi!', 'Ai tag trúng người yêu cũ thì MC không chịu trách nhiệm đâu nha, MC chỉ se duyên thôi!'],
    mcCouple: ['Xin giới thiệu cặp đôi {a} ❤ {b}! Mời hai bạn lên sân khấu làm lễ nào!', 'Cả nhà ơi, cặp đôi {a} và {b} sắp lên sân khấu! Chuẩn bị pháo tay nào!', 'MC xin được se duyên cho {a} ❤ {b}. Chúc hai bạn trăm năm hạnh phúc, đầu bạc răng long!', 'Trân trọng giới thiệu: {a} và {b} — cặp đôi tiếp theo của sảnh cưới chúng ta!', 'Đến lượt {a} ❤ {b} rồi! Hai bạn nắm tay nhau bước lên sân khấu nhé!', 'Một tràng pháo tay cho {a} và {b} nào cả nhà! Cặp đôi này dễ thương quá đi!', 'MC gọi tên {a} ❤ {b}! Mời hai bạn lên nhận lời chúc phúc của cả sảnh!', 'Duyên trời sắp đặt: {a} và {b} đã thành một cặp! Mời hai bạn lên sân khấu!', 'Xin mời cặp đôi {a} ❤ {b} tiến lên sân khấu — nhạc đâu, hoa đâu, lên nào!', 'Cặp đôi vàng của giờ này: {a} và {b}! Chúc hai bạn sớm về chung một nhà!'],
    mcThank: ['Cảm ơn {ten} đã tặng quà mừng cưới! Phong bao này MC ghi sổ vàng rồi nhé!', 'Ôi, {ten} tặng quà nè! Cả sảnh cưới cảm ơn bạn — hậu tạ này nồng ấm quá!', 'Quà của {ten} tới rồi! MC thay mặt cô dâu chú rể cảm ơn bạn nhiều lắm!', '{ten} hào phóng quá! Quà này làm sảnh cưới sáng rực luôn — cảm ơn bạn!', 'Nhận được quà của {ten} rồi! Chúc bạn ví luôn đầy như phong bao bạn tặng nhé!', 'Cảm ơn {ten}! Quà mừng cưới này MC sẽ đọc to cho cả sảnh cùng vui!', 'Ui, {ten} tặng quà xịn quá! Cô dâu chú rể mà biết là cảm động lắm đó!', '{ten} ơi, quà tới tay rồi! MC cảm ơn tấm lòng vàng của bạn nhé!', 'Một món quà từ {ten} — sảnh cưới rộn ràng hẳn lên! Cảm ơn bạn rất nhiều!', 'Cảm ơn {ten} đã mừng cưới! Chúc bạn tặng quà xong là lộc lá đầy nhà luôn!'],
    mcGreet: ['Chào {ten} đã ghé sảnh cưới! Tìm chỗ ngồi đẹp, chuẩn bị tag người thương nhé!', 'Hoan nghênh {ten}! Vào rồi thì ở lại dự tiệc, đừng về sớm đó nha!', 'A, {ten} tới rồi! Sảnh cưới hôm nay đông vui quá — chào mừng bạn!', 'Chào mừng {ten} đến với đám cưới online! Cứ tự nhiên như ở nhà nhé!', '{ten} ơi, vào phòng là có duyên rồi — kiếm người thương tag lên sân khấu đi nè!', 'MC chào {ten}! Hôm nay bạn muốn dự tiệc hay muốn lên làm nhân vật chính đây?', 'Hoan hô, {ten} đã vào phòng! Ngồi xuống, thả tim, chuẩn bị xem lễ cưới nào!', 'Chào {ten}! Sảnh cưới đang vui lắm, bạn vào đúng lúc rồi đó!'],
    mcFollowLines: ['Cảm ơn {ten} đã follow! Từ nay bạn là khách VIP của sảnh cưới này nhé!', 'Hoan hô! {ten} vừa follow phòng — MC ghi tên vào sổ khách quý rồi đó!', 'Cảm ơn {ten} đã theo dõi! Có bạn là sảnh cưới vui thêm hẳn luôn!', 'A, {ten} follow rồi nè! Từ nay đám cưới nào vui là có mặt bạn hết nhé!', 'MC cảm ơn {ten} đã follow. Tặng bạn một tràng pháo tay của cả sảnh cưới!', '{ten} ơi, follow là có duyên với sảnh cưới này rồi đó — ở lại chơi lâu nhé!', 'Tuyệt vời! {ten} đã follow — từ nay bạn là người nhà của MC rồi!', 'Cảm ơn {ten} đã nhấn theo dõi! Chuẩn bị tinh thần, sắp có cặp đôi dễ thương lên sân khấu đó!', 'Một lượt follow từ {ten}! MC cảm ơn bạn — khách quý như bạn là sảnh cưới đông vui hẳn!', '{ten} follow rồi! MC chúc bạn sớm tìm được người thương để tag lên sân khấu nhé!'],
    ghepDoiNgauNhien: true,
    uuTienQuaTang: true,
    choLenSanKhauCoBan: 90, choTuDong: true, choLenSanKhauMin: 20, choLenSanKhauMax: 600,
    choCongMoiCapCho: 15, choCongMoiCapGhep: 8, choMienGhep: 2,
    choNguongVang: 300, choHeSoVang: 0.6, choNguongDong: 1500, choHeSoDong: 1.3,
    hieuUngNgauNhien: true, hieuUngNgauNhienTuGiay: 12, hieuUngNgauNhienDenGiay: 25,
    lenhDoiGioiTinh: true, lenhDoiTrangPhuc: true, doiTrangPhucChoGiay: 5,
    hangChoToiDa: 4,
    bannerY: 30,
    khungTraiX: 0, khungTraiY: 0, khungPhaiX: 0, khungPhaiY: 0, khungHangChoX: 0, khungHangChoY: 0, khungMcX: 0, khungMcY: 0,
    hienBongChat: true, bongChatGiay: 4, bongChatMaxKyTu: 60, bongChatAnKhiTuCamQua: 2,
    tuCamComment: ['vl', 'vcl', 'vkl', 'vãi', 'địt', 'đụ', 'đéo', 'cặc', 'lồn', 'buồi', 'đĩ', 'đm', 'dm', 'đmm', 'dcm', 'đcm', 'cave', 'loz'],
    tuAnToanComment: ['cac'],
    mcTagVang: ['{a} gọi {ten} mà {ten} chưa có trong phòng — MC ghép tạm {a} với {b} cho đỡ trống nhé! {ten} ơi, vào nhanh để làm lễ cùng {a} nào!', '{ten} ơi, {a} đang gọi bạn kìa! MC giữ chỗ sẵn rồi — vào nhanh để thành đôi với {a} nhé!', '{a} tag {ten} nhưng {ten} chưa tới — tạm thời MC se duyên {a} với {b}, {ten} xuất hiện là MC đổi lại ngay!', 'Alo {ten}, có {a} đang chờ bạn ở sảnh cưới! Trong lúc chờ, {a} đứng cặp tạm với {b} nhé!', '{a} nhớ {ten} quá nên MC đành ghép tạm {a} với {b} — {ten} mà vào là có lễ cưới liền đó!', '{ten} chưa vào phòng nên MC mượn tạm {b} đứng cặp với {a} — {ten} ơi, vào nhanh kẻo mất lượt!'],
    mcMilestone: ['🎉 Sảnh cưới vừa nâng cấp lên {moc}! Càng đông càng đẹp — cảm ơn cả nhà đã tới chung vui!', 'Không khí quá tuyệt vời! Chúng ta đã chạm mốc {moc} rồi mọi người ơi!', 'Đẳng cấp mới rồi cả nhà ơi — sảnh {moc} chính thức mở cửa! Đẹp chưa, đẹp chưa?', 'Nhờ cả nhà chung tay, sảnh cưới đã lên {moc}! MC tự hào về phòng mình quá!', 'Khoảnh khắc này phải ghi nhớ: sảnh cưới đạt mốc {moc}! Cảm ơn từng lượt xem của mọi người!', 'Lên đời rồi! Sảnh {moc} lung linh hơn hẳn — cả nhà ở lại ngắm cho đã nhé!'],
    mcSapMoc: [
      'Cả nhà ơi, chỉ còn {con} lượt xem nữa là chạm mốc {moc} — sảnh {sanh} sắp mở rồi! Mọi người chia sẻ live giúp MC nhé!',
      'Sắp rồi, sắp rồi! Còn đúng {con} lượt xem nữa là lên mốc {moc}, sảnh mới sắp xuất hiện — ai chưa vào thì vào nhanh nào!',
      'Mốc {moc} lượt xem ở ngay trước mắt rồi, chỉ thiếu {con} nữa thôi! Cả nhà thả tim và chia sẻ để mở sảnh {sanh} nhé!',
      'Nghe MC nói này: thêm {con} lượt xem nữa là đám cưới mình được lên sảnh {sanh} đó! Rủ bạn bè vào xem chung cho vui nào!',
      'Chuẩn bị đếm ngược nào cả nhà — còn {con} lượt xem nữa là đạt mốc {moc}! Chia sẻ ngay kẻo lỡ khoảnh khắc đổi sảnh nhé!',
      'Sảnh {sanh} đang chờ mở khóa, chỉ còn cách {con} lượt xem nữa thôi! Mỗi người một lượt chia sẻ là tới nơi luôn đó!',
      'Tin vui đây: nhà mình sắp chạm mốc {moc} lượt xem rồi, còn đúng {con} nữa! Người xem càng đông, sảnh càng đẹp — rủ thêm bạn vào nhé!',
      'Còn {con} lượt xem nữa thôi là bùng nổ mốc {moc} — lên sảnh {sanh} lộng lẫy hơn hẳn! Cả nhà cùng đẩy view nào!',
    ],
    mcSapMocConLai: 20,
    mcCheGheuChoGiay: 20,
    mcTagDaCoDoi: [
      'ê {a}, {b} đã có đôi rồi, mình không nên phá hoại gia đình nhà người khác nhá!',
      '{a} à, {b} đã có gia đình rồi, bạn nên chọn người khác đi nhé!',
      '{b} là của {c} rồi {a} ơi, chen vào là MC không cứu được đâu!',
      'Ối {a} ơi, {b} đang tay trong tay với {c} kìa, mình chậm chân mất rồi!',
      '{a} dũng cảm thật, dám tag cả {b} — mà {b} là hoa đã có chủ {c} rồi nhé!',
      'Thôi {a} ơi, {b} với {c} đang hạnh phúc, mình đừng làm kỳ đà cản mũi nha!',
      '{a} ơi là {a}, {b} đã yên bề gia thất với {c} rồi, đổi mục tiêu đi nè!',
      'MC nhắc nhẹ {a} nè: chuyện của {b} và {c} đang đẹp, mình đừng chen ngang nha!',
      'Hụt rồi {a} ơi! {b} đã về chung một nhà với {c} rồi, cả nhà tag người khác cho {a} đi!',
      '{a} tag {b} là có gu đấy, tiếc là {b} thuộc về {c} mất rồi!',
      'Ê {a}, {c} đang nhìn kìa! Còn tag {b} nữa là tối nay có người ngủ sofa đó!',
      '{b} đã có đôi rồi, {a} đừng buồn — sảnh cưới còn bao nhiêu người độc thân đang chờ {a} kìa!',
    ],
    musicOn: true, musicVolume: 0.5, sfxOn: true, sfxVolume: 0.8,
  });
  initAudio();
  startDemo();
} else {
  // LiveBridgeClient dùng API .on('event'|'chat'|'hello'|'config'|'status'|'block'|'seen')
  // — bản cũ truyền onConfig/onEvent qua opts nên client BỎ QUA hết: live thật sẽ
  // không nhận được config lẫn sự kiện TikTok. URL lấy theo đúng cổng đang mở game.
  const bridgeUrl = 'ws://' + location.hostname + ':' + (location.port || '8787');
  const bridge = new LiveBridgeClient({ url: bridgeUrl, game: 'dam-cuoi' });
  if (window.NpcVoice) NpcVoice.attach(bridge);   // MC nói -> báo LiveBridge để voice khán giả tự tắt tiếng
  bridge
    .on('event', handle)
    .on('chat', onChat)
    .on('block', onBlock)
    .on('config', m => applyConfig(m.config))
    .on('hello', h => { if (h && h.config) applyConfig(h.config); })
    .on('open', () => { if (window.__diag && window.__diag.stage !== 'config-ok') window.__diag.stage = 'ws-ok'; })
    .on('seen', m => { if (m && m.user) ensureGuest(m.user); })   // thả tim cũng tính là khách đến dự
    .on('reset-scores', resetAll)   // nút "Reset điểm" ở trang quản trị LiveBridge
    .on('status', m => {
      const st = (m && m.tiktok) || {};
      if (st.state === 'live') { say('● LIVE — ' + (st.username ? '@' + st.username : ''), 'ok'); refreshBg(false); }
      else if (st.state === 'error') say('⚠ ' + (st.message || 'Lỗi kết nối TikTok'), 'err');
      else say('Đang chờ kết nối LIVE…', '');
    })
    .connect();
  setTimeout(initAudio, 300);
}
mcRandomLoop(true);

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
if (window.__diag && window.__diag.stage === 'html') window.__diag.stage = 'main-ok';
})();
