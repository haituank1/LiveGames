/* Lớp học chữ — vòng lặp chính.
   Một câu ~41 giây (SỬA 2026-11-06 19:36: hiện đề là tính giờ luôn):
   hiện đề + voice cô đọc đề + tính giờ CÙNG LÚC (30s, chấm theo thời
   gian trả lời nhanh nhất) → công bố đáp án + Top 5 + cộng điểm bảng
   lớp (8s) → nghỉ 3s → câu tiếp. Hết tiết (20 câu) thì Giờ ra chơi
   30s (M5): bảng Oẳn tù tì, học sinh gõ búa/kéo/bao, cô ra ngẫu nhiên
   sau 20s, ai thắng cô +50 điểm → tiết mới.
   Điểm: hạng 1 = 100, hạng 2 = 80, hạng 3 = 60, hạng 4-5 = 40, trả lời
   đúng sau đó = 20. Chuỗi đúng liên tiếp (streak) từ 3 trở lên nhân đôi.
   Sự kiện "Giờ vàng" (mỗi 10 phút, 3 câu) nhân đôi tiếp. Điểm danh
   1 lần/phiên +50. NPC chỉ diễn cho phòng vui: trả lời hiện bong bóng +
   giơ tay nhưng KHÔNG chiếm top 5, KHÔNG ghi điểm bảng lớp.
   Chấp nhận đáp án không dấu / thường / hoa (chuẩn hóa trước khi so).
   Voice không bao giờ chặn game: chữ luôn hiện, tiếng chỉ là phần thêm. */
(function () {
'use strict';
const W = (window.Classroom = window.Classroom || {});
const FX = W.effects, A = W.audio, P = W.people, QUESTIONS = W.QUESTIONS || [];
const q = new URLSearchParams(location.search);
const isDemo = q.has('demo') && q.get('demo') !== '0';
const $ = id => document.getElementById(id);
const rand = (a, b) => a + Math.random() * (b - a);
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const stageEl = $('stage');

function lsGet(key, fallback) { try { const v = localStorage.getItem(key); return v == null ? fallback : v; } catch (e) { return fallback; } }
function lsSet(key, value) { try { localStorage.setItem(key, value); } catch (e) {} }
function esc(s) { return String(s || '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch])); }

/* ---------- Cấu hình ---------- */
const DEFAULT_CFG = {
  teacherName: 'Cô Ngân',
  mcName: 'MC Bong Bóng',
  npcVoiceOn: true, npcVoice: 'avocado_v2:rumi', npcVoiceMinGapSec: 8, npcVoiceMaxPerMin: 6,
  answerSec: 30, revealSec: 8, gapSec: 3,
  breakSec: 30, breakWinPoints: 50, breakRevealSec: 20,
  viTriGhe: '[{"x":10,"y":55,"w":68,"chipY":55.3},{"x":30,"y":55,"w":68,"chipY":55.3},{"x":50,"y":55,"w":68,"chipY":55.3},{"x":70,"y":55,"w":68,"chipY":55.3},{"x":90,"y":55,"w":68,"chipY":55.3},{"x":10,"y":65,"w":81,"chipY":65.3},{"x":30,"y":65,"w":81,"chipY":65.3},{"x":50,"y":65,"w":81,"chipY":65.3},{"x":70,"y":65,"w":81,"chipY":65.3},{"x":90,"y":65,"w":81,"chipY":65.3},{"x":10,"y":75,"w":93,"chipY":75.3},{"x":30,"y":75,"w":93,"chipY":75.3},{"x":50,"y":75,"w":93,"chipY":75.3},{"x":70,"y":75,"w":93,"chipY":75.3},{"x":90,"y":75,"w":93,"chipY":75.3},{"x":10,"y":85,"w":107,"chipY":85.3},{"x":30,"y":85,"w":107,"chipY":85.3},{"x":50,"y":85,"w":107,"chipY":85.3},{"x":70,"y":85,"w":107,"chipY":85.3},{"x":90,"y":85,"w":107,"chipY":85.3}]', // vị trí 20 ghế [{x,y,w,chipY}] — chuỗi JSON, user chỉnh qua admin (people.js applyConfigSeats); sai thì về SEATS v19
  rankPoints: [100, 80, 60, 40, 40], latePoints: 20,
  streakMin: 3, streakMult: 2,
  attendPoints: 50,
  quaTangMocVua: 99, quaTangMocLon: 299,
  followGoal: 20, eventEverySec: 600, eventRounds: 3,
  mcMinSec: 18, mcMaxSec: 26,
  npcTuDong: true, npcNguongVang: 6, npcDanhSach: ['Bảo An', 'Khánh Vy', 'Đức Anh', 'Thảo Nhi', 'Minh Khôi', 'Lan Anh', 'Quốc Huy', 'Phương Nam', 'Thùy Dương', 'Hoàng Phúc'],
  musicOn: true, musicVolume: 30, sfxOn: true, sfxVolume: 55, voiceOn: true, voiceVolume: 90,
  guideLines: [
    '⭐ Đoán nhanh, điểm cao được vào lớp ngồi!',
    '✋ Gõ "có mặt" → điểm danh +50 điểm (1 lần/phiên)',
    '🎁 Tặng quà → giơ tay, quà lớn lên bảng + pháo giấy',
    '🔥 Đúng 3 câu liên tiếp → điểm nhân đôi',
    '🎯 Follow đủ mục tiêu → cả lớp nhảy mừng',
    '⭐ Tiên học lễ – hậu học văn!',
    '⭐ Tương tác nhiều để lên top nha!',
  ],
  teacherLines: [
    'Cả lớp tập trung nè, câu đố sắp ra rồi đó!',
    'Ai chưa trả lời thì nhanh tay lên nha, thời gian đang chạy đó!',
    'Lớp mình hôm nay chăm quá, cô Ngân vui lắm luôn!',
    'Nhớ gõ "có mặt" để điểm danh lấy điểm nè!',
    'Đảo chữ không khó đâu, cứ bình tĩnh xếp chữ lại là ra!',
  ],
};
let cfg = {};
const RANK_POINTS = () => (cfg.rankPoints && cfg.rankPoints.length === 5 ? cfg.rankPoints : DEFAULT_CFG.rankPoints);

/* ---------- Chuẩn hóa đáp án ---------- */
function norm(s) {
  return String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D')
    .toUpperCase().replace(/[^A-Z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
}
W.norm = norm;

/* ---------- Trạng thái ---------- */
const known = new Map();          // user.id -> user
const scores = new Map();         // user.id -> { name, pts, streak, correct, npc }
const attended = new Set();       // user.id đã điểm danh trong phiên
const likeTotals = new Map();
const likeFxAt = new Map();
let roundNo = 0;
let deck = [];
let round = null;                 // { q, phase, phaseEnd, startAt, answers: Map }
let eventLeft = 0;                // số câu còn nhân đôi (Giờ vàng)
let eventCountdown = (DEFAULT_CFG.eventEverySec || 600);
let follows = 0, followTarget = (DEFAULT_CFG.followGoal || 20);
let giftLedger = [];
let totalViews = 0;
const counted = new Set();
let demoExtra = 0;
const viewsTotal = () => totalViews + counted.size + demoExtra;
let lastGiftVoiceAt = 0;
let audioInited = false;

const LS_SCORES = isDemo ? 'lophochchu.scores.demo' : 'lophochchu.scores';
function loadScores() {
  try {
    const raw = lsGet(LS_SCORES, '');
    if (!raw) return;
    const obj = JSON.parse(raw);
    for (const [id, s] of Object.entries(obj)) scores.set(id, s);
  } catch (_) { /* điểm hỏng thì bắt đầu lại từ 0, không chết game */ }
}
function saveScores() {
  const obj = {};
  for (const [id, s] of scores) obj[id] = s;
  lsSet(LS_SCORES, JSON.stringify(obj));
}
loadScores();

/* Quỹ lớp (nối dữ liệu thật 2026-11-06 tối): số lớn = tổng xu quà đã
   nhận trong phiên; 4 dòng = số lượt quà theo nhóm. Lưu localStorage
   như điểm (demo và live dùng khóa riêng) để tải lại trang không mất. */
const LS_FUND = isDemo ? 'lophochchu.fund.demo' : 'lophochchu.fund';
let fundTotal = 0;
let fundCats = { tang: 0, hoa: 0, tim: 0, banh: 0 };
function loadFund() {
  try {
    const raw = lsGet(LS_FUND, '');
    if (!raw) return;
    const o = JSON.parse(raw);
    fundTotal = Number(o.total) || 0;
    fundCats = Object.assign({ tang: 0, hoa: 0, tim: 0, banh: 0 }, o.cats || {});
  } catch (_) { /* quỹ hỏng thì bắt đầu lại từ 0, không chết game */ }
}
function saveFund() { lsSet(LS_FUND, JSON.stringify({ total: fundTotal, cats: fundCats })); }
loadFund();

/* ---------- Vòng lặp câu hỏi ---------- */
function nextQuestion() {
  if (!QUESTIONS.length) return null;
  if (!deck.length) {
    deck = QUESTIONS.map((_, i) => i);
    for (let i = deck.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [deck[i], deck[j]] = [deck[j], deck[i]]; }
  }
  const idx = deck.pop();
  return { q: QUESTIONS[idx], idx };
}
function setPhase(phase, sec) {
  round.phase = phase;
  round.phaseEnd = Date.now() + sec * 1000;
  renderBoard();
}
function startRound() {
  const nq = nextQuestion();
  if (!nq) return;
  roundNo++;
  round = { q: nq.q, qIdx: nq.idx, phase: 'answer', phaseEnd: 0, startAt: Date.now(), answers: new Map() };
  if (eventLeft > 0) eventLeft--;
  round.eventX2 = eventLeft > 0;
  P.teacherPoint(true);
  // Hiện đề + voice đọc đề + tính giờ CÙNG LÚC (luật user chốt 19:36):
  // voice phát không đợi, đồng hồ chạy ngay từ lúc hiện đề.
  setPhase('answer', Number(cfg.answerSec) || 30);
  sayTeacher(pick(['Câu mới đây nè!', 'Nhìn bảng nè cả lớp!', 'Đảo chữ mới ra rồi!']), 4);
  // Chờ index voice tĩnh tải xong (vài chục ms) rồi mới phát — nếu không
  // câu đầu tiên sẽ im lặng vì fetch index chạy đua với startRound.
  const qIdx = round.qIdx;
  const nextIdx = deck.length ? deck[deck.length - 1] : -1;
  (A.whenIndexReady ? A.whenIndexReady() : Promise.resolve())
    .then(() => (A.whenFree ? A.whenFree() : Promise.resolve()))
    .then(() => {
      A.speakQuestion(qIdx);
      // Nạp trước voice đọc đề của câu tiếp theo (deck đã xáo sẵn).
      if (nextIdx >= 0) A.prefetchById('q-' + String(nextIdx + 1).padStart(3, '0') + '-doc');
    });
  scheduleNpcAnswers();
}
function revealRound() {
  const ans = [...round.answers.values()].sort((a, b) => a.t - b.t);
  const top = ans.slice(0, 5);
  const rp = RANK_POINTS();
  for (let i = 0; i < ans.length; i++) {
    const a = ans[i];
    const s = scores.get(a.id);
    if (!s || s.npc) continue;
    s.correct = (s.correct || 0) + 1;
    s.streak = (s.streak || 0) + 1;
    let pts = i < 5 ? rp[i] : (Number(cfg.latePoints) || 20);
    if (s.streak >= (Number(cfg.streakMin) || 3)) pts *= (Number(cfg.streakMult) || 2);
    if (eventLeft >= 0 && round.eventX2) pts *= 2;
    s.pts += pts;
    a.pts = pts;
    a.streak = s.streak;
  }
  // Người trả lời sai / không trả lời: streak về 0 (chỉ tính người đã có điểm).
  for (const [id, s] of scores) {
    if (!s.npc && !round.answers.has(id)) s.streak = 0;
  }
  saveScores();
  round.top = top;
  setPhase('reveal', Number(cfg.revealSec) || 8);
  P.teacherPoint(false);
  P.teacherHappy(3);
  P.celebrate(top.map(a => a.id), 3);
  FX.stars(16, 0.5, 0.3);
  A.cheer();
  A.speakLine(pick(['reveal-1', 'reveal-2']));
  if (top.length) setTimeout(() => A.speakLine(pick(['top-1', 'top-2', 'top-3'])), 2500);
  renderBoard();
  renderTop();
}
function endRound() {
  // Hết tiết (20 câu) thì vào Giờ ra chơi (M5) thay vì câu tiếp theo.
  if (roundNo % 20 === 0) { startBreak(); return; }
  setPhase('gap', Number(cfg.gapSec) || 3);
  renderBoard();
}

/* ---------- M5: Giờ ra chơi — Oẳn tù tì với cô ---------- */
const RPS = {
  bua: { emoji: '✊', label: 'Búa' },
  keo: { emoji: '✌️', label: 'Kéo' },
  bao: { emoji: '✋', label: 'Bao' },
};
const RPS_BEATS = { bua: 'keo', keo: 'bao', bao: 'bua' }; // bua thang keo, keo thang bao, bao thang bua
function parseRpsVote(text) {
  const n = norm(text);
  if (n === 'BUA') return 'bua';
  if (n === 'KEO') return 'keo';
  if (n === 'BAO') return 'bao';
  return null;
}
function breakCounts() {
  const c = { bua: 0, keo: 0, bao: 0 };
  if (round && round.votes) for (const v of round.votes.values()) if (c[v] != null) c[v]++;
  return c;
}
function startBreak() {
  const sec = Number(cfg.breakSec) || 30;
  const revealAt = Number(cfg.breakRevealSec) || 20;
  round = { phase: 'break', phaseEnd: 0, votes: new Map(), teacherChoice: null, revealed: false, winners: [] };
  round.revealAt = Date.now() + revealAt * 1000;
  setPhase('break', sec);
  P.teacherPoint(true);
  sayTeacher('Giờ ra chơi rồi nè, mình chơi Oẳn tù tì với cô nha!', 5);
  // Chờ index voice tĩnh tải xong rồi mới phát (như startRound — nếu không
  // break-1 im lặng khi nhảy thẳng vào break bằng ?break=1).
  (A.whenIndexReady ? A.whenIndexReady() : Promise.resolve()).then(() => A.speakLine('break-1'));
  renderBoard();
}
function revealBreak() {
  if (!round || round.phase !== 'break' || round.revealed) return;
  round.revealed = true;
  round.teacherChoice = pick(['bua', 'keo', 'bao']);
  const winPts = Number(cfg.breakWinPoints) || 50;
  const winners = [];
  if (round.votes) for (const [id, v] of round.votes) {
    if (RPS_BEATS[v] === round.teacherChoice) {
      const s = scores.get(id);
      if (s && !s.npc) { s.pts += winPts; winners.push(id); }
    }
  }
  round.winners = winners;
  saveScores();
  P.teacherPoint(false);
  P.teacherHappy(3);
  P.celebrate(winners, 3);
  FX.stars(16, 0.5, 0.3);
  A.cheer();
  A.speakLine('break-' + round.teacherChoice);
  if (winners.length) showBanner('🎉 Cô ra ' + RPS[round.teacherChoice].label + ' — ' + winners.length + ' bạn thắng +' + winPts + ' điểm!');
  else showBanner('😅 Cô ra ' + RPS[round.teacherChoice].label + ' — không ai thắng cô lần này!');
  renderBoard();
  renderTop();
}
function endBreak() {
  A.speakLine('break-3');
  startRound();
}
function renderBreakBoard() {
  const qEl = $('qScrambled'), hEl = $('qHint'), cEl = $('qCat'), pEl = $('phaseLabel'), aEl = $('qAnswer');
  const c = breakCounts();
  if (cEl) cEl.textContent = '✊✌️✋ Oẳn tù tì với cô';
  if (hEl) hEl.textContent = round.revealed
    ? 'Cô ra: ' + RPS[round.teacherChoice].emoji + ' ' + RPS[round.teacherChoice].label + '!'
    : 'Gõ búa / kéo / bao vào chat nè!';
  if (qEl) {
    qEl.innerHTML = ['bua', 'keo', 'bao'].map(k =>
      '<div class="rps-choice"><span class="rps-emoji">' + RPS[k].emoji + '</span>'
      + '<span class="rps-name">' + RPS[k].label + '</span>'
      + '<span class="rps-count">' + c[k] + '</span></div>').join('');
  }
  const dEl = $('qDashes');
  // Dòng vạch đáp án bỏ trống lúc giờ ra chơi: câu "Cô ra: ✌️ Kéo!" đã
  // hiện ở gợi ý phía trên — để lại thì bảng tràn xuống, dòng thắng
  // bị thanh đồng hồ che mất (lỗi thấy ở verify v16b).
  if (dEl) dEl.textContent = '';
  const rEl = $('qRound');
  if (rEl) rEl.textContent = '☕';
  if (pEl) pEl.textContent = phaseLabel('break');
  if (aEl) {
    if (round.revealed) {
      const winPts = Number(cfg.breakWinPoints) || 50;
      aEl.textContent = round.winners.length
        ? '🎉 ' + round.winners.length + ' bạn thắng +' + winPts + ' điểm!'
        : 'Không ai thắng cô lần này!';
      aEl.classList.add('show');
    } else {
      aEl.textContent = '';
      aEl.classList.remove('show');
    }
  }
}
setInterval(() => {
  if (!round) return;
  if (round.phase === 'break') {
    if (!round.revealed && Date.now() >= round.revealAt) revealBreak();
    if (Date.now() >= round.phaseEnd) { endBreak(); return; }
    renderSign(); // đếm ngược n/30 trên bảng hiệu
    return;
  }
  if (Date.now() < round.phaseEnd) return;
  if (round.phase === 'answer') revealRound();
  else if (round.phase === 'reveal') endRound();
  else if (round.phase === 'gap') startRound();
}, 250);
/* Đếm ngược sự kiện Giờ vàng: hết giờ thì 3 câu tiếp theo nhân đôi điểm. */
setInterval(() => {
  if (eventLeft > 0) return;
  eventCountdown--;
  if (eventCountdown <= 0) {
    eventCountdown = Number(cfg.eventEverySec) || 600;
    eventLeft = Number(cfg.eventRounds) || 3;
    showBanner('⚡ GIỜ VÀNG — 3 câu tiếp theo nhân đôi điểm!');
    FX.fireworks(3);
    A.speakLine('mc-2');
  }
  renderEvent();
}, 1000);

/* ---------- Nộp đáp án ---------- */
function submitAnswer(user, text) {
  if (!round || round.phase !== 'answer') return false;
  if (!user || !user.id) return false;
  if (round.answers.has(user.id)) return false;   // mỗi người 1 đáp án / câu
  if (norm(text) !== norm(round.q.a)) return false;
  const t = (Date.now() - round.startAt) / 1000;
  round.answers.set(user.id, { id: user.id, name: user.nickname || 'Bạn', t, npc: !!user.npc });
  const s = scores.get(user.id);
  if (s && !s.npc) P.raiseHand(user.id, 3);
  FX.stars(6, 0.5, 0.3);
  renderFastest();
  return true;
}

/* ---------- Người xem / điểm ---------- */
function ensureGuest(user) {
  if (!user || !user.id) return null;
  if (!known.has(user.id)) known.set(user.id, user);
  if (!user.npc) counted.add(user.id);
  if (!scores.has(user.id)) scores.set(user.id, { name: user.nickname || 'Bạn', pts: 0, streak: 0, correct: 0, npc: !!user.npc });
  const p = P.spawn(user);
  if (p) P.touch(user.id);
  return p;
}
function markInteract(user) {
  if (!user || !user.id) return;
  const p = P.get(user.id);
  if (p) p.lastInteract = Date.now();
}
function greet(user) {
  sayTeacher('Chào ' + (user.nickname || 'bạn mới') + ' nè, vào lớp ngồi đi, câu đố sắp ra rồi!', 4);
}
function doAttend(user) {
  if (attended.has(user.id)) { toast(user.nickname + ' đã điểm danh rồi nè!', false); return; }
  attended.add(user.id);
  const s = scores.get(user.id);
  if (s && !s.npc) { s.pts += Number(cfg.attendPoints) || 50; saveScores(); }
  P.raiseHand(user.id, 3);
  FX.stars(10, 0.5, 0.5);
  A.speakLine(pick(['attend-1', 'attend-2']));
  toast('✅ ' + (user.nickname || 'Bạn') + ' điểm danh +' + (Number(cfg.attendPoints) || 50) + ' điểm!', true);
  renderTop();
}

/* ---------- Chat ---------- */
function onChat(m) {
  if (!m || !m.user) return;
  ensureGuest(m.user);
  markInteract(m.user);
  addInteract(m.user, 2);
  const text = String(m.text || '');
  appendChatLine(m.user.nickname || 'Bạn', text);
  P.say(m.user.id, text, 4);
  const n = norm(text);
  if (n === 'CO MAT' || n === 'DIEM DANH' || n === 'CO MAT A' || n.indexOf('DIEM DANH') === 0) { doAttend(m.user); return; }
  if (round && round.phase === 'break') {
    // M5: giờ ra chơi — gõ búa/kéo/bao để bỏ phiếu (mỗi người 1 phiếu,
    // phiếu sau ghi đè phiếu trước), không tính là đáp án.
    const v = parseRpsVote(text);
    if (v) { round.votes.set(m.user.id, v); renderBoard(); }
    return;
  }
  if (!submitAnswer(m.user, text)) {
    // Trả lời sai: không phạt, không hiện gì thêm (tránh làm người xem ngại).
  } else if (round && round.answers.size === 1) {
    A.speakLine(pick(['correct-1', 'correct-2', 'correct-3', 'correct-4']));
  }
}

/* ---------- Sự kiện LiveBridge ---------- */
function handle(ev) {
  const src = ev.source || {};
  if (ev.user && ev.action !== 'like') ensureGuest(ev.user);
  if (ev.action === 'join' && ev.user) greet(ev.user);
  else if (ev.action === 'like') onLike(ev);
  else if (ev.action === 'follow' || ev.action === 'spotlight') onFollow(ev);
  else if (ev.action === 'share') { FX.confetti(40); if (ev.user) addInteract(ev.user, 3); }
  else if (ev.action === 'dance') { P.danceAll(5); }
  else if (ev.action === 'gift' || src.kind === 'gift') onGift(ev);
  else if (ev.action === 'fireworks') { FX.fireworks(3); }
  else if (ev.action === 'petals') { FX.hearts(10, 0.5, 0.5); }
  else if (ev.action === 'confetti') { FX.confetti(50); }
}
function onLike(ev) {
  const u = ev.user;
  if (!u || !u.id) return;
  const n = Math.max(1, Number(ev.count) || 1);
  const tot = (likeTotals.get(u.id) || 0) + n;
  if (likeTotals.size > 500) likeTotals.delete(likeTotals.keys().next().value);
  likeTotals.set(u.id, tot);
  addInteract(u, n);
  if (Math.floor(tot / 50) > Math.floor((tot - n) / 50)) P.danceAll(5);
  const now = performance.now();
  if (now - (likeFxAt.get(u.id) || -1e9) < 2000) return;
  likeFxAt.set(u.id, now);
  FX.hearts(6, 0.5, 0.6);
}
function onFollow(ev) {
  if (!ev.user) return;
  follows++;
  addInteract(ev.user, 10);
  renderGoal();
  A.speakLine('mc-3');
  toast('💛 ' + (ev.user.nickname || 'Bạn') + ' vừa follow lớp!', true);
  if (follows >= followTarget) {
    showBanner('🎯 Đủ ' + followTarget + ' follow — cả lớp nhảy mừng!');
    P.danceAll(5);
    FX.fireworks(4);
    followTarget += Number(cfg.followGoal) || 20;
    follows = 0;
    renderGoal();
  }
}
function onGift(ev) {
  const u = ev.user;
  const dia = Number(ev.diamonds) || Number(ev.value) || 0;
  const giftName = (ev.source && ev.source.giftName) || ev.giftName || 'quà';
  // Quỹ lớp: cộng xu + đếm lượt theo nhóm quà (kể cả quà không rõ người tặng).
  fundTotal += dia;
  const cat = fundCatOf(giftName);
  fundCats[cat] = (fundCats[cat] || 0) + 1;
  saveFund();
  renderFund();
  if (u) {
    giftLedger.unshift({ ten: u.nickname || 'Bạn', gift: giftName, dia });
    if (giftLedger.length > 5) giftLedger.pop();
    renderLedger();
    addInteract(u, 5);
  }
  const big = Number(cfg.quaTangMocLon) || 299;
  const mid = Number(cfg.quaTangMocVua) || 99;
  if (dia >= big) {
    if (u) P.toBoard(u.id, 8);
    FX.cannon();
    FX.fireworks(5);
    showBanner('🎁 Quà lớn từ ' + (u ? u.nickname : 'bạn') + ' — lên bảng nhận thưởng!');
    A.speakLine('gift-3');
  } else if (dia >= mid) {
    if (u) P.raiseHand(u.id, 4);
    FX.confetti(80);
    FX.fireworks(3);
    A.speakLine('gift-2');
  } else {
    if (u) P.raiseHand(u.id, 3);
    FX.stars(12, 0.5, 0.4);
    if (Date.now() - lastGiftVoiceAt > 8000) {
      lastGiftVoiceAt = Date.now();
      A.speakLine(pick(['gift-1', 'gift-2', 'gift-4']));
    }
  }
  if (u) toast('🎁 ' + (u.nickname || 'Bạn') + ' tặng ' + giftName + (dia ? ' (' + dia + ' xu)' : ''), dia >= mid);
}

/* ---------- NPC: học sinh ảo lấp lớp ---------- */
const NPC = { started: false, users: [] };
function npcRoster() {
  return (cfg.npcDanhSach || []).map(x => String(x).trim()).filter(Boolean).slice(0, 12)
    .map((name, i) => ({ id: 'npc-' + (i + 1), nickname: name, uniqueId: 'npc' + (i + 1), avatar: '', npc: true }));
}
function npcSync() {
  if (NPC.started || cfg.npcTuDong === false) return;
  const list = npcRoster();
  if (!list.length) return;
  NPC.started = true; NPC.users = list;
  list.forEach((u, i) => setTimeout(() => { if (cfg.npcTuDong !== false) ensureGuest(u); }, 1200 + i * 1200));
}
function npcRealCount() {
  let n = 0;
  for (const u of known.values()) if (!u.npc && P.get(u.id)) n++;
  return n;
}
function scheduleNpcAnswers() {
  if (!NPC.started || cfg.npcTuDong === false) return;
  if (npcRealCount() > (Number(cfg.npcNguongVang) || 6)) return;
  if (!round) return;
  const pool = NPC.users.filter(u => P.get(u.id));
  const n = 1 + Math.floor(Math.random() * 3);
  for (let i = 0; i < n; i++) {
    const u = pool[Math.floor(Math.random() * pool.length)];
    if (!u) continue;
    const delay = 3000 + Math.random() * 15000;
    setTimeout(() => {
      if (!round || round.phase !== 'answer') return;
      if (Math.random() < 0.6) {
        // NPC trả lời đúng (hiện bong bóng + giơ tay, không ghi điểm).
        submitAnswer(u, round.q.a);
        P.say(u.id, round.q.a, 4);
      } else {
        P.say(u.id, pick(['Để mình nghĩ đã!', 'Câu này khó quá!', 'Mình đoán là... hmm']), 4);
      }
    }, delay);
  }
}

/* ---------- Hiển thị ---------- */
function catLabel(c) {
  return { 'lich-su': 'Lịch sử', 'doi-song': 'Đời sống', 'do-an': 'Đồ ăn', 'dia-ly': 'Địa lý' }[c] || c || '';
}
function phaseLabel(p) {
  return { answer: 'Gõ đáp án nhanh lên!', reveal: 'Đáp án đây!', gap: 'Câu tiếp theo...', break: 'Giờ ra chơi!' }[p] || p;
}
function renderBoard() {
  if (!round) return;
  if (round.phase === 'break') { renderBreakBoard(); renderSign(); renderFastest(); renderRevealList(); renderTimer(); return; }
  const qEl = $('qScrambled'), hEl = $('qHint'), cEl = $('qCat'), pEl = $('phaseLabel'), aEl = $('qAnswer');
  const qq = round.q;
  if (qEl) {
    // Dãy ô chữ: mỗi ký tự của chữ đảo là 1 ô vuông kem chữ nâu.
    qEl.innerHTML = String(qq.s || '').split('').filter(ch => ch !== ' ').map(ch => '<span class="tile">' + esc(ch) + '</span>').join('');
  }
  if (hEl) hEl.textContent = qq.h;
  if (cEl) cEl.textContent = catLabel(qq.c) + (round.eventX2 ? ' · ⚡ Giờ vàng x2' : '');
  if (pEl) pEl.textContent = 'Câu ' + roundNo + ' · ' + phaseLabel(round.phase);
  const dEl = $('qDashes');
  if (dEl) {
    // Vạch đáp án: mỗi từ của đáp án là 1 nhóm gạch ngang dài bằng số chữ.
    dEl.innerHTML = String(qq.a || '').split(' ').filter(Boolean).map(w => '<span class="dash-group">' + '_'.repeat([...w].length) + '</span>').join('');
  }
  const rEl = $('qRound');
  if (rEl) rEl.textContent = String(roundNo);
  if (aEl) {
    if (round.phase === 'reveal') {
      aEl.textContent = '✅ Đáp án: ' + qq.a;
      aEl.classList.add('show');
    } else {
      aEl.textContent = '';
      aEl.classList.remove('show');
    }
  }
  renderSign();
  renderFastest();
  renderRevealList();
  renderTimer();
}
/* Bảng hiệu lớp: Tiết {tiết} · Câu {câu}/20 · {views} bạn.
   Lúc giờ ra chơi: Giờ ra chơi {còn}/30 (đếm ngược, như ảnh họ). */
function renderSign() {
  const el = $('signLine2');
  if (!el) return;
  if (round && round.phase === 'break') {
    const left = Math.max(0, Math.ceil((round.phaseEnd - Date.now()) / 1000));
    el.textContent = 'Giờ ra chơi ' + left + '/30';
    return;
  }
  const qInTiet = roundNo < 1 ? 1 : ((roundNo - 1) % 20) + 1;
  const tiet = roundNo < 1 ? 1 : Math.floor((roundNo - 1) / 20) + 1;
  el.textContent = 'Tiết ' + tiet + ' · Câu ' + qInTiet + '/20 · ' + viewsTotal() + ' bạn';
}
/* Panel "Nhanh nhất" dưới bảng: top 3 người trả lời đúng nhanh nhất
   (avatar mặt trước + tên + thời gian; lúc công bố hiện +điểm). */
function renderFastest() {
  const box = $('fastestPanel');
  if (!box) return;
  if (!round || !round.answers || round.answers.size === 0) { box.style.display = 'none'; box.innerHTML = ''; return; }
  const ans = [...round.answers.values()].sort((a, b) => a.t - b.t);
  const top = ans.slice(0, 3);
  const reveal = round.phase === 'reveal';
  const cols = top.map((a, i) => {
    const p = P.get(a.id);
    const av = (p && p.avatar)
      ? '<img class="f-av" src="' + p.avatar + '" alt="">'
      : '<span class="f-av f-av-none">' + ['🥇', '🥈', '🥉'][i] + '</span>';
    const val = reveal ? '+' + (a.pts || 0) : a.t.toFixed(2).replace('.', ',') + 's';
    return '<div class="f-col">' + av + '<span class="f-name">' + esc(a.name) + '</span><span class="f-pts">' + val + '</span></div>';
  }).join('');
  box.innerHTML = '<div class="f-head"><span>⚡ Nhanh nhất</span><span>' + ans.length + ' bạn đã đúng</span></div>'
    + '<div class="f-cols">' + cols + '</div>';
  box.style.display = 'block';
}
function renderTimer() {
  const bar = $('timerBar');
  if (!bar || !round) return;
  const total = { answer: Number(cfg.answerSec) || 30, reveal: Number(cfg.revealSec) || 8, gap: Number(cfg.gapSec) || 3, break: Number(cfg.breakSec) || 30 }[round.phase] || 30;
  const left = Math.max(0, round.phaseEnd - Date.now()) / 1000;
  bar.style.width = (left / total * 100).toFixed(1) + '%';
}
setInterval(renderTimer, 200);
function renderRevealList() {
  // Bảng công bố Top 5 cũ đã gộp vào panel "Nhanh nhất" + BXH lớp.
  renderFastest();
}
function renderTop() {
  const box = $('topList');
  if (!box) return;
  const list = [...scores.values()].filter(s => !s.npc).sort((a, b) => b.pts - a.pts).slice(0, 3);
  if (!list.length) { box.innerHTML = '<div class="empty">Chưa có ai — trả lời đúng để lên bảng nè!</div>'; return; }
  box.innerHTML = list.map((s, i) => {
    const medal = ['🥇', '🥈', '🥉'][i] || '';
    const fire = s.streak >= (Number(cfg.streakMin) || 3) ? ' 🔥' + s.streak : '';
    return '<div class="top-row">' + medal + ' <b>' + esc(s.name) + '</b><span class="pts">' + s.pts + ' điểm' + fire + '</span></div>';
  }).join('');
  const top1 = [...scores.entries()].filter(([, s]) => !s.npc).sort((a, b) => b[1].pts - a[1].pts)[0];
  if (top1) P.topStudent(top1[0]);
  // Ghế ngồi = thứ hạng điểm: xếp lại ghế theo điểm + cập nhật chip tên/điểm.
  const rankedIds = [...scores.entries()].filter(([id, s]) => !s.npc && P.get(id)).sort((a, b) => b[1].pts - a[1].pts).map(([id]) => id);
  P.reseat(rankedIds);
  for (const [id, s] of scores) { if (!s.npc) P.setScore(id, s.pts); }
}
/* Top Tương tác (cột phải): tim/chat/quà/follow/share đều cộng điểm
   tương tác, riêng với điểm trả lời đúng trên bảng lớp. */
const interact = new Map();       // user.id -> { name, pts }
function addInteract(user, pts) {
  if (!user || !user.id || !pts) return;
  const cur = interact.get(user.id) || { name: user.nickname || 'Bạn', pts: 0 };
  cur.name = user.nickname || cur.name;
  cur.pts += pts;
  interact.set(user.id, cur);
  renderInteract();
}
function renderInteract() {
  const box = $('interactList');
  if (!box) return;
  const list = [...interact.values()].sort((a, b) => b.pts - a.pts).slice(0, 5);
  if (!list.length) { box.innerHTML = '<div class="empty">Tương tác để lên top nè!</div>'; return; }
  box.innerHTML = list.map((s, i) => {
    const medal = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'][i] || '';
    return '<div class="top-row">' + medal + ' <b>' + esc(s.name) + '</b><span class="pts">' + s.pts + '</span></div>';
  }).join('');
}
function renderGoal() {
  const bar = $('followBar'), txt = $('followText');
  if (bar) bar.style.width = Math.min(100, follows / followTarget * 100).toFixed(1) + '%';
  if (txt) txt.textContent = '🎯 Follow phiên: ' + follows + ' / ' + followTarget;
}
function renderEvent() {
  const el = $('eventText');
  if (!el) return;
  if (eventLeft > 0) el.textContent = '⚡ GIỜ VÀNG x2 — còn ' + eventLeft + ' câu';
  else {
    const m = Math.floor(eventCountdown / 60), s = eventCountdown % 60;
    el.textContent = '⏰ Giờ vàng sau ' + String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
  }
}
function renderLedger() {
  const box = $('giftList');
  if (!box) return;
  if (!giftLedger.length) { box.innerHTML = '<div class="empty">Chưa có quà — tặng quà để lên bảng nè!</div>'; return; }
  box.innerHTML = giftLedger.map(g => '<div class="gift-row">🎁 <b>' + esc(g.ten) + '</b> tặng ' + esc(g.gift) + (g.dia ? ' · ' + g.dia + ' xu' : '') + '</div>').join('');
}
/* Nhóm quà cho Quỹ lớp: tên quà chứa "hoa" → hoa, "tim" → tim,
   "bánh" → bánh, còn lại → tặng chung. */
function fundCatOf(name) {
  const n = norm(name);
  if (n.indexOf('HOA') >= 0) return 'hoa';
  if (n.indexOf('TIM') >= 0) return 'tim';
  if (n.indexOf('BANH') >= 0) return 'banh';
  return 'tang';
}
function renderFund() {
  const t = $('fundTotal');
  if (t) t.textContent = String(fundTotal);
  const map = { tang: 'fundCatTang', hoa: 'fundCatHoa', tim: 'fundCatTim', banh: 'fundCatBanh' };
  for (const [k, id] of Object.entries(map)) {
    const el = $(id);
    if (!el) continue;
    const b = el.querySelector('.fund-cnt');
    if (b) b.textContent = String(fundCats[k] || 0);
  }
}
function renderGuide() {
  const box = $('guideList');
  if (!box) return;
  box.innerHTML = (cfg.guideLines || []).map(l => '<div class="guide-row">' + esc(l) + '</div>').join('');
}
let toastTimer = null;
function toast(msg, vip) {
  const t = $('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  if (vip) t.classList.add('vip'); else t.classList.remove('vip');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 4000);
}
let bannerTimer = null;
function showBanner(msg) {
  const b = $('banner');
  if (!b) return;
  b.textContent = msg;
  b.classList.add('show');
  clearTimeout(bannerTimer);
  bannerTimer = setTimeout(() => b.classList.remove('show'), 6000);
}
function sayTeacher(text, sec) { P.teacherSay(text, sec || 4); }

function appendChatLine(name, text) {
  const box = $('chatLines');
  if (!box) return;
  const row = document.createElement('div');
  const b = document.createElement('b');
  b.textContent = name + ': ';
  row.appendChild(b);
  row.appendChild(document.createTextNode(String(text || '').slice(0, 80)));
  box.appendChild(row);
  while (box.children.length > 7) box.removeChild(box.firstChild);
}
/* Xoay dòng hướng dẫn dưới lớp học. */
let guideIdx = 0;
setInterval(() => {
  const el = $('guideBar');
  const lines = cfg.guideLines || DEFAULT_CFG.guideLines;
  if (!el || !lines.length) return;
  guideIdx = (guideIdx + 1) % lines.length;
  el.textContent = lines[guideIdx];
}, 8000);

/* ---------- Cô Ngân nói chuyện ngẫu nhiên ---------- */
setInterval(() => {
  if (!round) return;
  if (Math.random() < 0.5) return;
  sayTeacher(pick(cfg.teacherLines || DEFAULT_CFG.teacherLines), 4);
}, 20000);

/* ---------- Cấu hình + LiveBridge ---------- */
function applyConfig(c) {
  if (!c) return;
  cfg = Object.assign({}, DEFAULT_CFG, c);
  P.applyConfigSeats(cfg.viTriGhe); // vị trí ghế từ admin; sai/thiếu thì về SEATS v19
  if (window.NpcVoice && NpcVoice.setConfig) {
    NpcVoice.setConfig({
      enabled: cfg.npcVoiceOn !== false, voice: cfg.npcVoice || 'avocado_v2:rumi',
      minGapSec: cfg.npcVoiceMinGapSec || 8, maxPerMin: cfg.npcVoiceMaxPerMin || 6,
      staticBase: 'Games/lop-hoc-chu/voice-static/', game: 'lop-hoc-chu',
    });
  }
  A.setConfig(cfg);
  followTarget = Number(cfg.followGoal) || 20;
  eventCountdown = Number(cfg.eventEverySec) || 600;
  renderGuide(); renderGoal(); renderEvent(); renderLedger(); renderFund(); renderTop(); renderInteract();
  updateTier();
}
function updateTier() {
  const v = viewsTotal();
  const t = v >= 100 ? 3 : v >= 50 ? 2 : v >= 20 ? 1 : 0;
  P.setTier(t);
  FX.setTier(t);
  const el = $('tierLabel');
  if (el) el.textContent = ['🌱 Lớp Mới', '🌿 Lớp Vui', '⭐ Lớp Sao', '👑 Lớp Vàng'][t];
  renderSign();
}
function startGame() {
  startRound();
  npcSync();
}
function initAudioOnce() {
  if (audioInited) return;
  audioInited = true;
  A.init().then(() => {
    if (window.NpcVoice) {
      NpcVoice.setConfig({ staticBase: 'Games/lop-hoc-chu/voice-static/', game: 'lop-hoc-chu' });
      NpcVoice.attach(bridge);
      if (typeof NpcVoice.prefetch === 'function') {
        // Làm nóng trước 2 câu hay dùng nhất (chỉ khi chạy qua LiveBridge).
        NpcVoice.prefetch('Câu mới đây nè!', 'avocado_v2:rumi');
        NpcVoice.prefetch('Đúng rồi, giỏi quá!', 'avocado_v2:rumi');
      }
    }
  });
}
function applyDefaultConfigAfterDelay(ms) {
  setTimeout(() => {
    if (!cfgApplied) { cfgApplied = true; applyConfig(DEFAULT_CFG); }
  }, ms || 8000);
}
let cfgApplied = false, bridge = null;
function connect() {
  if (typeof LiveBridgeClient === 'undefined') {
    applyConfig(DEFAULT_CFG);
    initAudioOnce();
    return;
  }
  bridge = new LiveBridgeClient({ url: 'ws://localhost:8787', game: 'lop-hoc-chu' });
  bridge.on('event', handle);
  bridge.on('chat', onChat);
  bridge.on('hello', () => { totalViews++; updateTier(); });
  bridge.on('config', c => { cfgApplied = true; applyConfig(c); initAudioOnce(); });
  bridge.on('seen', u => { if (u) ensureGuest(u); });
  bridge.on('block', u => { if (u && u.id) { P.removeUser(u.id); known.delete(u.id); } });
  bridge.on('reset-scores', () => { scores.clear(); saveScores(); renderTop(); });
  bridge.on('status', () => {});
  bridge.connect();
  applyDefaultConfigAfterDelay(8000);
}

/* ---------- Demo: ?demo=1 ---------- */
const DEMO_USERS = [
  { id: 'demo-1', nickname: 'Mai Xuân Chính', uniqueId: 'maixuanchinh', avatar: '' },
  { id: 'demo-2', nickname: 'qanhhhhh', uniqueId: 'qanhhhhh', avatar: '' },
  { id: 'demo-3', nickname: 'Ngọc Vy', uniqueId: 'ngocvy', avatar: '' },
  { id: 'demo-4', nickname: 'Hoàng Kim', uniqueId: 'hoangkim', avatar: '' },
  { id: 'demo-5', nickname: 'Minh Anh', uniqueId: 'minhanh', avatar: '' },
  { id: 'demo-6', nickname: 'Thu Hằng', uniqueId: 'thuhang', avatar: '' },
];
const DEMO_WRONG = ['Bánh mì', 'Đế chế', 'Bim bim', 'Có mặt', 'Đồ uống ăn vặt'];
function startDemo() {
  DEMO_USERS.forEach((u, i) => setTimeout(() => ensureGuest(u), 800 + i * 900));
  demoExtra = 42;
  updateTier();
  setInterval(() => {
    if (!round) return;
    if (round.phase === 'break') {
      // Demo: học sinh giả gõ búa/kéo/bao để bỏ phiếu Oẳn tù tì.
      const u = pick(DEMO_USERS);
      if (Math.random() < 0.7) onChat({ user: u, text: pick(['búa', 'kéo', 'bao', 'bua', 'keo', 'bao']) });
      return;
    }
    if (round.phase !== 'ask' && round.phase !== 'answer') return;
    const u = pick(DEMO_USERS);
    const r = Math.random();
    if (r < 0.55) {
      // Đáp đúng, có lúc viết không dấu / thường để thử chuẩn hóa.
      const a = round.q.a;
      const v = Math.random() < 0.4 ? norm(a).toLowerCase() : a;
      if (submitAnswer(u, v)) { P.say(u.id, v, 3); appendChatLine(u.nickname, v); }
    } else if (r < 0.8) {
      P.say(u.id, pick(DEMO_WRONG), 3);
    } else if (r < 0.85) {
      onChat({ user: u, text: 'có mặt' });
    } else if (r < 0.92) {
      onGift({ user: u, diamonds: pick([1, 10, 99, 299]), giftName: pick(['Hoa hồng', 'Trái tim', 'Bánh ngọt']), source: { kind: 'gift' } });
    } else if (r < 0.96) {
      onFollow({ user: u });
    } else {
      onLike({ user: u, count: 3 });
    }
  }, 1800);
}

/* ---------- Khung hình + chẩn đoán ---------- */
const fxCanvas = $('fx');
function resize() {
  if (!stageEl || !fxCanvas) return;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  FX.resize(stageEl.clientWidth, stageEl.clientHeight, dpr);
}
addEventListener('resize', resize);
function diagSet(stage, extra) {
  const d = window.__diag || (window.__diag = {});
  d.stages = d.stages || [];
  d.stages.push([stage, Date.now(), extra || '']);
}
if (window.__diag) window.__diag.build = 'lop-hoc-chu-v1';

/* ---------- Khởi động ---------- */
P.init($('room'));
if (q.has('seats')) P.setEditMode(true); // ?seats=1: user tự canh tọa độ từng ghế
FX.init(fxCanvas);
renderGuide(); renderGoal(); renderEvent(); renderLedger(); renderFund(); renderTop(); renderInteract();
resize();
if (isDemo) {
  applyConfig(DEFAULT_CFG);
  const btn = $('startBtn');
  if (btn) btn.addEventListener('click', () => {
    btn.remove();
    initAudioOnce();
    sayTeacher('Chào cả lớp nè, cô Ngân đây, hôm nay mình cùng đảo chữ cho vui nha!', 5);
    A.speakLine('hello-1');
    if (q.has('break') && q.get('break') !== '0') {
      // Demo nhanh màn giờ ra chơi: nhảy thẳng vào break (coi như hết tiết 1).
      // Gọi npcSync như startGame vẫn làm để đủ NPC nền (không thì lớp
      // chỉ có 6 học sinh giả + 3 NPC nền, 2 hàng giữa trống).
      roundNo = 20;
      npcSync();
      startBreak();
    } else {
      startGame();
    }
    startDemo();
    diagSet('demo-start');
  });
  diagSet('demo-ready');
} else {
  const btn0 = $('startBtn');
  if (btn0) btn0.remove();
  connect();
  initAudioOnce();
  startGame();
  diagSet('live-ready');
}
diagSet('main-ok');

W.handle = handle;
W.chat = onChat;
W.state = () => ({ roundNo, phase: round && round.phase, breakVotes: round && round.phase === 'break' ? breakCounts() : null, breakChoice: round && round.teacherChoice, scores: [...scores.entries()].map(([id, s]) => ({ id, name: s.name, pts: s.pts, streak: s.streak })), follows, followTarget, eventLeft, views: viewsTotal() });
W.submitAnswer = submitAnswer;
W.questions = QUESTIONS;
})();
