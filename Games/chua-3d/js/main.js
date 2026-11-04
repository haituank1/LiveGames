/* Chùa 3D – cục B (game). Nhận sự kiện từ LiveBridge và cho nhân vật của người xem hành động.

   Cấu hình (số nhân vật ảo, tối đa nhân vật, hiện bình luận) chỉnh ở trang quản trị LiveBridge.
   Tham số URL (ghi đè cấu hình, dùng khi test):
     ?npc=60        số người ảo ngồi sẵn cho đông vui
     ?max=500       tối đa số nhân vật trên màn hình
     ?bridge=ws://localhost:8787   địa chỉ LiveBridge
     ?demo=1        tự sinh sự kiện giả, không cần LiveBridge
     ?debug=1       hiện cả dòng trạng thái kết nối / lỗi trên màn hình (mặc định ẩn vì màn hình này lên sóng)
     ?pick=1        chế độ lấy toạ độ: hiện mốc 10 đệm + lư hương, bấm vào đâu thì hiện và copy "x, y" (% khung game)

   Hành động hỗ trợ (khai báo trong LiveBridge/config/mappings/chua-3d.json):
     join, walk, bow, incense, lotus, golden */
(function () {
'use strict';
const T = window.Temple, C = T.crowd, E = T.effects, U = T.ui, S = T.audio;
const GAME_ID = 'chua-3d';
const q = new URLSearchParams(location.search);
const store = {   // nhớ cấu hình gần nhất để lần tải lại không bị nháy số nhân vật
  get(k) { try { return sessionStorage.getItem('chua3d.' + k); } catch (_) { return null; } },
  set(k, v) { try { sessionStorage.setItem('chua3d.' + k, String(v)); } catch (_) { /* bỏ qua */ } },
};
const cfg = {
  npc: Number(q.get('npc') || store.get('npc') || 60),
  max: Number(q.get('max') || store.get('max') || 500),
  bridge: q.get('bridge') || 'ws://localhost:8787',
  demo: q.has('demo'),
  debug: q.has('debug'),
};

/* Vị trí 10 đệm + lư hương (% khung game) chỉnh ở trang quản trị. Phải có trước khi xếp chỗ ngồi,
   nên nhớ lại bản gần nhất; trang quản trị đổi vị trí thì tải lại trang (xem applyConfig) */
const layoutKey = c => JSON.stringify({ cushions: c.cushions || C.DEFAULT_LAYOUT.cushions, burner: c.burner || C.DEFAULT_LAYOUT.burner,
  incense: c.incense || C.DEFAULT_LAYOUT.incense });
let layout = null;
try { layout = JSON.parse(store.get('layout') || 'null'); } catch (_) { /* hỏng thì dùng mặc định */ }
const curLayoutKey = layoutKey(layout || {});

/* ---------- Khởi tạo ---------- */
const players = new Map();   // user.id → Person
C.init(document.getElementById('gl'), {
  maxPeople: cfg.max,
  layout,
  onRemove: p => { if (p.user && players.get(p.user.id) === p) players.delete(p.user.id); },
});
E.init();
U.init();
S.init();
// trình duyệt thường chặn tiếng tới khi bấm vào trang (OBS / LIVE Studio thì không): hiện nút nhắc
const soundBtn = document.getElementById('sound');
const syncSoundBtn = () => { soundBtn.style.display = S.state() === 'suspended' ? '' : 'none'; };
S.onState = syncSoundBtn;
soundBtn.onclick = () => S.resume();
setTimeout(syncSoundBtn, 500);

const stage = document.getElementById('stage');
let W = 0, H = 0;
function resize() {
  const K = C.consts, a = K.STAGE_ASPECT;   // khung 9:16
  if (innerWidth / innerHeight > a) { H = innerHeight; W = H * a; } else { W = innerWidth; H = W / a; }
  W = Math.round(W); H = Math.round(H);
  stage.style.width = W + 'px'; stage.style.height = H + 'px';
  // ảnh nền phủ hết bề ngang, cắt trên/dưới đúng chỗ camera 3D cắt (để nhân vật khớp đệm)
  const imgH = W / K.IMG_ASPECT;
  stage.style.backgroundSize = bgFade.style.backgroundSize = `${W}px ${imgH}px`;
  stage.style.backgroundPosition = bgFade.style.backgroundPosition = `0 ${-K.CROP_TOP * imgH}px`;
  const dpr = Math.min(devicePixelRatio || 1, 1.5);
  C.resize(W, H, dpr);
  U.resize(W, H, dpr);
}
addEventListener('resize', resize);

/* ---------- Đổi nền theo số người xem ----------
   Trang quản trị → Game → "Đổi nền theo số người xem": khi số người xem đạt "Khi đạt" thì đổi sang ảnh bg*.webp đã chọn.
   Dùng mốc cao nhất mà số người xem hiện tại đã đạt; chưa đạt mốc nào thì về bg.webp. Chuyển cảnh mờ dần. */
const BG = { rules: [], viewers: 0, room: 0, shown: 'bg.webp', seq: 0 };
const bgFade = document.getElementById('bgfade');
function setBackground(file) {
  if (file === BG.shown) return;
  BG.shown = file;
  const seq = ++BG.seq;   // chỉ ảnh mới nhất được hiện, ảnh tải chậm bị bỏ
  const img = new Image();
  img.onload = () => {
    if (seq !== BG.seq) return;
    const url = `url("${encodeURI(file)}")`;
    bgFade.style.backgroundImage = url;
    bgFade.style.opacity = 1;
    setTimeout(() => {
      if (seq !== BG.seq) return;
      stage.style.backgroundImage = url;
      bgFade.style.transition = 'none';   // lớp mờ đã trùng nền chính: tắt ngay, không nháy
      bgFade.style.opacity = 0;
      void bgFade.offsetWidth;
      bgFade.style.transition = '';
    }, 1600);
  };
  img.onerror = () => console.warn('[chua-3d] không tải được nền', file);
  img.src = encodeURI(file);
}
function updateBg() {
  let pick = 'bg.webp', best = -1;
  for (const r of BG.rules) if (r.views <= BG.viewers && r.views > best) { best = r.views; pick = r.bg; }
  setBackground(pick);
}
/* Số người xem: khi LIVE thật thì lấy số TikTok báo trong phòng (BG.room); khi chưa LIVE (giả lập / demo)
   thì đếm người đã tương tác trong 5 phút gần nhất (vào phòng, bình luận, tim, quà...). Người không tương tác nữa thì tự bớt. */
const SEEN_MS = 5 * 60000;
const seenAt = new Map();   // user.id → lúc tương tác cuối
function markSeen(id) { if (id) seenAt.set(id, performance.now()); }
function refreshBg() {
  const now = performance.now();
  for (const [id, t] of seenAt) if (now - t >= SEEN_MS) seenAt.delete(id);
  BG.viewers = isLive ? BG.room : seenAt.size;   // đang LIVE thật: dùng số của TikTok; chưa LIVE (giả lập / demo): đếm tương tác
  updateBg();
}
setInterval(refreshBg, 3000);
T.BG = BG;   // để test thủ công trong console
T.setViewers = n => { BG.room = n; refreshBg(); };
resize();

/* Nhân vật ảo: một nhóm được đặt pháp danh cho phòng có tên, có điểm (lên điểm chậm, xem POINTS.npcTickSec);
   số còn lại không tên cho đỡ rối. id cố định theo tên để điểm đã lưu nối lại đúng người. */
const NPC_NAMES = ['Tu Tâm', 'Tích Đức', 'Thiện Tâm', 'An Nhiên', 'Minh Tâm', 'Tâm An', 'Từ Bi', 'Hỷ Xả', 'Thanh Tịnh', 'Diệu Hạnh',
  'Bình An', 'Như Ý', 'Chánh Niệm', 'Diệu Âm', 'Phước Thiện', 'Hoan Hỷ', 'Liên Hoa', 'Bồ Đề', 'Tâm Từ', 'Huệ Minh'];
function nameNpcs() {
  const used = new Set();
  for (const p of C.people) if (!p.removed && p.user && p.user.npc) used.add(p.user.nickname);
  const free = NPC_NAMES.filter(n => !used.has(n));
  // chọn ngẫu nhiên người để đặt tên, cho tên rải đều trong 2 khối chứ không dồn ở mấy hàng đầu
  const pool = [...C.people].sort(() => Math.random() - 0.5);
  for (const p of pool) {
    if (!free.length) break;
    if (p.removed || p.user) continue;
    const name = free.shift();
    p.user = { id: 'npc:' + name, nickname: name, avatar: '', npc: true };
    players.set(p.user.id, p);
  }
}
function setNpc(n) { C.setNpcCount(n); nameNpcs(); }
setNpc(Math.min(cfg.npc, cfg.max));

/* Bật / tắt từng loại thông báo (trang quản trị → "Hiện / ẩn thông báo"); không có trong cấu hình = bật.
   feedChat, feedGift, feedJoin, feedFollow, feedLike, feedShare: dòng trong khung bình luận (cả khung bật / tắt bằng showChat)
   bubbleChat, floatPoints, nameTags: bong bóng chat, "+điểm", tên dưới chân · rulesBox, boardTop10, toastTop, liveLabel: phía trên
   monkGreet, monkThank, monkFollow: thầy chào người mới / cảm ơn quà / cảm ơn follow (câu ngẫu nhiên: monkOn) */
let SHOW = {};
const shown = k => SHOW[k] !== false;
const FEED_KEY = { like: 'feedLike', share: 'feedShare', follow: 'feedFollow' };

/* Cấu hình từ trang quản trị LiveBridge (tham số URL được ưu tiên hơn) */
function applyConfig(c) {
  if (!c) return;
  if (c.max && c.max !== cfg.max && !q.has('max')) {   // đổi số chỗ phải dựng lại chỗ ngồi → tải lại trang
    store.set('max', c.max); store.set('npc', c.npc);
    location.reload();
    return;
  }
  if (layoutKey(c) !== curLayoutKey) {   // đổi vị trí đệm / lư hương: lối đi, chỗ ngồi phải tính lại → tải lại trang
    store.set('layout', layoutKey(c));
    location.reload();
    return;
  }
  if (c.npc != null && !q.has('npc')) { cfg.npc = c.npc; store.set('npc', c.npc); setNpc(Math.min(c.npc, cfg.max)); }
  if (c.showChat != null) U.showChat(c.showChat);
  if (c.pointsPerTick != null) POINTS.tick = c.pointsPerTick;
  if (c.tickSec != null) POINTS.tickSec = Math.max(1, c.tickSec);
  if (c.pointsPerDiamond != null) POINTS.perDiamond = c.pointsPerDiamond;
  if (c.pointsPerChat != null) POINTS.chat = c.pointsPerChat;
  if (c.pointsPerFollow != null) POINTS.follow = c.pointsPerFollow;
  if (c.leaveMin != null) LEAVE.min = Math.max(0, c.leaveMin);
  if (c.show) {   // bật / tắt từng loại thông báo (trang quản trị, mặc định bật hết)
    SHOW = c.show; U.setShow(SHOW);
    if (liveText) status(liveText, 'ok'); else if (!cfg.debug && !shown('liveLabel')) U.status('');
  }
  if (c.joinSeat != null) SEAT.join = !!c.joinSeat;
  if (c.seatLikes != null) SEAT.likes = Math.max(1, c.seatLikes);
  U.rules({ ...POINTS, seatLikes: SEAT.likes }, c.rulesLines);   // câu chữ khung luật: rulesLines (trang quản trị), trống = mặc định
  U.layout(c.uiScale, c.safeTop, c.nameScale, c.safeSide);   // cỡ chữ, phần trên / hai bên chừa cho TikTok, cỡ tên nhân vật
  // tốc độ nhân vật (%): đi lại / lạy, đứng, quỳ
  if (c.walkSpeed != null) T.params.walkSpeed = Math.max(0.3, c.walkSpeed / 100);
  if (c.actSpeed != null) T.params.actSpeed = Math.max(0.3, c.actSpeed / 100);
  if (c.guideOn != null || c.guideLines) U.guide(fillTim(Array.isArray(c.guideLines) && c.guideLines.length ? c.guideLines : GUIDE), c.guideOn !== false);
  S.setConfig(c);   // musicVolume, sfxVolume, musicOn, sfxOn, chantOn, chantGap, duckPercent
  if (window.NpcVoice) NpcVoice.setConfig(c);   // giọng thầy: npcVoiceOn / npcVoice / tần suất
  if (c.chantMinDiamonds != null) SOUND.chantMinDiamonds = c.chantMinDiamonds;
  setMonk(c);   // thầy hiện lên nói: bật/tắt, mỗi bao nhiêu phút
  // mốc & định kỳ (trang quản trị → Game): timedRules, personalRules, globalRules
  if (c.timedRules) startTimed(c.timedRules);
  if (c.personalEvery) MILESTONE.personal = c.personalEvery;
  if (c.globalEvery) MILESTONE.global = c.globalEvery;
  if (c.bgRules) { BG.rules = c.bgRules; refreshBg(); }   // đổi nền theo số người xem
}

/* ---------- Điểm công đức ----------
   - Ở trong live: cứ tickSec giây được +tick điểm, chỉ khi đang LIVE (hoặc demo) và chỉ cho người còn "thấy" trong
     activeMin phút gần nhất (p.seenAt: vào phòng, bình luận, tim, quà, hoặc nằm trong danh sách người xem top TikTok gửi về).
     TikTok không báo khi người xem rời phòng nên thoát live quá activeMin phút là ngừng cộng; vào lại thì cộng tiếp.
   - Tặng quà: mỗi 1 xu được +perDiamond điểm
   - Bình luận: +chat điểm, tối đa 1 lần mỗi chatCooldown giây
   - Follow: +follow điểm, mỗi người 1 lần (lần đầu được đặt pháp danh)
   - Nhân vật ảo có tên: chỉ +npcTick điểm mỗi npcTickSec giây, để người xem thật dễ vượt, không bị chiếm top */
const POINTS = { tick: 1, tickSec: 5, perDiamond: 50, chat: 5, chatCooldown: 20, follow: 100, activeMin: 5, npcTick: 1, npcTickSec: 60 };

/* "Tặng gì – được gì" (dòng vàng xoay vòng dưới khung luật). Sửa ở trang quản trị; đây chỉ là bản dự phòng cho ?demo=1 */
const GUIDE = [
  '🙏 Bình luận hoặc thả {tim} tim → vào chùa ngồi',
  '🌹 Tặng Hoa hồng (1 xu) → lên thắp nhang', '🎁 Quà từ 5 xu → lên lạy Phật 3 lạy', '🪷 Quà từ 10 xu → mưa hoa sen khắp chùa',
  '✨ Quà từ 99 xu → hào quang vàng rực rỡ', '➕ Follow → được thầy đặt pháp danh', '❤️ Thả 30 tim → lạy Phật 1 lạy',
];

/* ---------- Pháp danh: ai follow lần đầu được thầy đặt một pháp danh cố định (theo id), hiện vàng sau tên ----------
   Lưu trong trình duyệt như điểm (chỉ người xem TikTok thật); reset bảng điểm không xoá pháp danh. */
const PD_KEY = cfg.demo ? 'chua3d.phapdanh.demo' : 'chua3d.phapdanh';
const PD_A = ['Diệu', 'Minh', 'Tâm', 'Thiện', 'Huệ', 'Quảng', 'Nhuận', 'Đức', 'Phước', 'Chánh', 'Hạnh', 'Tịnh', 'Liên', 'Thanh', 'Như', 'Viên'];
const PD_B = ['An', 'Hạnh', 'Từ', 'Hiền', 'Lạc', 'Quang', 'Nguyên', 'Phúc', 'Ngọc', 'Hòa', 'Huệ', 'Minh', 'Thành', 'Nhã', 'Châu', 'Bảo'];
const phapDanh = new Map();   // user.id → pháp danh
try { for (const [id, n] of JSON.parse(localStorage.getItem(PD_KEY) || '[]')) phapDanh.set(id, n); } catch (_) { /* dữ liệu hỏng: bỏ qua */ }
U.pdOf = id => phapDanh.get(id) || '';
function makePhapDanh(id) {
  // băm FNV-1a + trộn bit, để id gần giống nhau (…01, …02) vẫn ra pháp danh khác hẳn nhau
  let h = 2166136261;
  for (const ch of String(id)) h = Math.imul(h ^ ch.codePointAt(0), 16777619);
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b); h = (h ^ (h >>> 16)) >>> 0;
  for (let k = 0; k < PD_A.length * PD_B.length; k++) {   // tránh trùng tên nhân vật ảo và chữ lặp ("Huệ Huệ")
    const i = (h + k * 7) % (PD_A.length * PD_B.length);
    const a = PD_A[i % PD_A.length], b = PD_B[Math.floor(i / PD_A.length)];
    if (a !== b && !NPC_NAMES.includes(a + ' ' + b)) return a + ' ' + b;
  }
  return 'Diệu An';
}
function savePhapDanh() {
  try { localStorage.setItem(PD_KEY, JSON.stringify([...phapDanh].filter(([id]) => isKept({ id })).slice(-5000))); } catch (_) { /* bỏ qua */ }
}
/* follow: lần đầu được pháp danh + điểm + thầy cảm ơn; follow lại (bỏ rồi follow) thì không cộng nữa */
function onFollow(user, p) {
  if (phapDanh.has(user.id)) return;
  const pd = makePhapDanh(user.id);
  phapDanh.set(user.id, pd);
  if (!user.sim) savePhapDanh();
  addPoints(user, POINTS.follow, p);
  E.glow(p, 6);
  if (shown('monkFollow')) monkReact(3, MONK.followThanks, user, 7);
  rankDirty = true;   // bảng top hiện 🪷
}

/* ---------- Ai được vào chùa ngồi ----------
   Bình luận, quà, follow, share: luôn được vào. Vào phòng: chỉ khi SEAT.join (trang quản trị "Vào phòng là có nhân vật").
   Thả tim: cộng dồn theo người (likeCount), đủ SEAT.likes tim mới vào. Chưa vào thì chưa có nhân vật, chưa được cộng điểm. */
const SEAT = { join: false, likes: 30 };
const likeCount = new Map();   // user.id → tổng tim đã thả
const fillTim = lines => lines.map(l => l.replace(/\{tim\}/g, SEAT.likes));   // {tim} trong dòng "Tặng gì"

/* ---------- Người chơi ---------- */
function playerFor(user) {
  let p = players.get(user.id);
  if (p && !p.removed) { p.user = { ...p.user, ...user, avatar: user.avatar || p.user.avatar }; return { p, isNew: false }; }
  p = C.spawnPlayer(user);
  if (p) players.set(user.id, p);
  return { p, isNew: true };
}

/* Âm thanh theo quà (mốc riêng, không đụng mốc quà của game):
   - quà tổng từ chantMinDiamonds xu trở lên → tiếng niệm (đang niệm / chưa đủ giãn cách thì thay bằng chuông)
   - quà nhỏ hơn → chuông; bình luận / tim → mõ
   - quà lớn (Thắp sáng) → chuông lớn + niệm */
const SOUND = { chantMinDiamonds: 6 };
const isGift = ev => ev && ev.source && ev.source.kind === 'gift';
function giftSound(ev) {
  if (!isGift(ev)) return S.play('mo');
  if ((ev.diamonds || 0) >= SOUND.chantMinDiamonds && S.chant()) return;
  S.play('bell');
}
const ACTIONS = {
  join() { /* nhân vật đã được tạo khi gọi playerFor */ },
  walk(p) { p.cmdWalk(); },
  // tặng quà: lên khu trên quỳ lạy rồi về chỗ (top 10 thì lạy ngay trên đệm)
  bow(p, n, ev) { p.cmdPray(Math.min(n, 6)); giftSound(ev); },
  incense(p, n, ev) {
    if (isGift(ev)) giftSound(ev);
    p.cmdIncense(() => { E.incense(n); S.play('mo'); });   // gõ mõ lúc cắm nhang
  },
  // quà thì hoa rơi theo số xu (giftRain trong handle); follow / share... vẫn mưa hoa như cũ
  lotus(p, n, ev) { if (!isGift(ev)) E.lotusRain(Math.min(500, 40 * n)); p.cmdPray(1); giftSound(ev); },
  golden(p, n, ev) { E.glow(p, 14); if (!isGift(ev)) E.lotusRain(Math.min(500, 120 * n)); U.flash(); p.cmdPray(3); S.play('bigbell'); S.chant(); },
  // hiệu ứng dùng cho mốc điểm (không lạy, không tiếng): hoa rơi nhẹ, ánh vàng quanh thân
  petal(p, n) { E.lotusRain(Math.min(200, 30 * n)); },
  glow(p, n) { E.glow(p, 6 * n); },
};

function handle(ev) {
  if (!ev || !ev.user || !ev.user.id) return;
  if (isLive && (ev.user.sim || (ev.source && ev.source.simulated))) return;   // đang LIVE thật: bỏ qua sự kiện giả lập
  markSeen(ev.user.id);   // đếm người xem (đổi nền)
  // chưa có nhân vật: chỉ vào phòng (SEAT.join tắt) hoặc tim chưa đủ SEAT.likes thì chưa vào chùa, chưa được cộng điểm; thầy vẫn chào
  const old = players.get(ev.user.id);
  if (!old || old.removed) {
    if (ev.action === 'join' && !SEAT.join) {
      if (shown('feedJoin')) U.feed(ev.user, 'đã vào phòng', 'sys');
      if (shown('monkGreet')) greet(ev.user);
      return;
    }
    if (ev.source && ev.source.kind === 'like' && (likeCount.get(ev.user.id) || 0) < SEAT.likes) return;
  }
  const { p, isNew } = playerFor(ev.user);
  if (!p) return;
  if (ev.action !== 'join') p.hl = 4;   // live thật có rất nhiều người vào phòng: chỉ tô vàng khi tặng quà / tương tác
  p.lastActive = p.seenAt = performance.now();
  const n = Math.max(1, (ev.value || 1) * (ev.count || 1));
  const fn = ACTIONS[ev.action];
  if (fn) fn(p, n, ev);
  else console.warn('[chua-3d] chưa hỗ trợ hành động', ev.action);

  const src = ev.source || {};
  if (src.kind === 'gift') {
    // không hiện banner tặng quà: TikTok tự hiện rồi, game chỉ làm hiệu ứng (hoa rơi, hào quang, "+điểm")
    if (shown('feedGift')) U.feed(ev.user, `đã tặng ${src.giftName || 'quà'}${(ev.count || 1) > 1 ? ' x' + ev.count : ''}`, 'gift');
    addPoints(ev.user, Math.round((ev.diamonds || 0) * POINTS.perDiamond), p);
    if (E.giftRain(ev.diamonds || 0) >= 5 && ev.action !== 'golden') { E.glow(p, 10); U.flash(); }   // quà 500+ xu
    if (shown('monkThank')) monkReact(2 + Math.min(0.9, (ev.diamonds || 0) / 1000), MONK.thank, ev.user, 6);   // quà to được cảm ơn trước
  } else if (src.kind === 'follow') {
    if (shown('feedFollow')) U.feed(ev.user, 'đã follow', 'sys');
    onFollow(ev.user, p);
  } else if (ev.action === 'join') {
    if (isNew && shown('feedJoin')) U.feed(ev.user, 'đã vào chùa', 'sys');   // live đông thì tắt dòng này ở trang quản trị
    if (shown('monkGreet')) greet(ev.user);
  } else if (ev.label && shown(FEED_KEY[src.kind] || 'feedOther')) {
    U.feed(ev.user, ev.label, 'sys');   // thả tim, chia sẻ...
  }
}
T.handle = handle;   // để test thủ công trong console

/* Bình luận: hiện trong khung chat + bong bóng trên đầu nhân vật (người bình luận cũng được vào chùa) */
function onChat(m) {
  if (!m.user || !m.user.id || !m.text) return;
  if (!(isLive && m.user.sim)) markSeen(m.user.id);
  if (isLive && m.user.sim) return;
  const { p } = playerFor(m.user);
  const now = performance.now();
  if (p) {
    if (shown('bubbleChat')) { p.say = m.text; p.sayUntil = now + 5000; }
    p.lastActive = p.seenAt = now;
    if (POINTS.chat && !(now - (p.chatPtsAt || -1e9) < POINTS.chatCooldown * 1000)) { p.chatPtsAt = now; addPoints(m.user, POINTS.chat, p); }
  }
  if (shown('feedChat')) U.chat(m.user, m.text);
}
T.chat = onChat;

/* nhân vật đi ra khỏi chùa, xoá công đức */
function kick(p) {
  removeScore(p.user.id);
  players.delete(p.user.id);
  p.queue.length = 0;   // bỏ hết lệnh đang chờ, đi ra luôn
  p.cmdLeave();
}
/* Bị chặn trên trang quản trị */
function onBlock(m) {
  const u = m.user || {};
  const uid = String(u.uniqueId || '').toLowerCase();
  for (const p of [...players.values()]) {
    if (p.user.id === u.id || (uid && String(p.user.uniqueId || '').toLowerCase() === uid)) kick(p);
  }
}
/* Bắt đầu LIVE thật: người giả lập / test còn trong chùa thì mời ra hết, chỉ giữ nhân vật ảo và người xem thật */
let isLive = false;
function setLive(on) {
  if (on === isLive) return;
  isLive = on;
  if (!on) return;
  for (const p of [...players.values()]) if (!isKept(p.user)) kick(p);
  for (const s of [...scores.values()]) if (!isKept(s.user)) removeScore(s.user.id);
}

/* ---------- Bảng công đức: top 10 lên ngồi 10 đệm ----------
   Hạng 1 ngồi giữa hàng sau (gần Phật nhất). Rớt khỏi top 10 thì xuống ngồi với đám đông.
   Gom thay đổi lại, tối đa mỗi 1.5s xếp lại một lần để người không phải đi tới đi lui liên tục. */
const scores = new Map();    // user.id → { user, total (điểm) }
let vipIds = [];
let rankDirty = false, rankWait = 0;
/* cộng điểm; có `p` thì hiện "+N" bay lên trên đầu nhân vật */
function addPoints(user, pts, p) {
  if (!pts) return;
  const s = scores.get(user.id) || { user, total: 0 };
  const before = s.total, sumBefore = MILESTONE.globalSum;
  s.user = user; s.total += pts;
  scores.set(user.id, s);
  MILESTONE.globalSum += pts;
  rankDirty = true;
  if (p && shown('floatPoints')) U.float(p, '+' + pts);
  checkMilestones(user, before, s.total, sumBefore, MILESTONE.globalSum);
}
T.addPoints = addPoints;   // để test thủ công trong console

/* ---------- Mốc & định kỳ ----------
   Cấu hình ở trang quản trị → Game (LiveBridge lưu trong settings.json, gửi về game qua config):
   - timedRules: cứ sec giây thì count người ngẫu nhiên trong chùa làm hành động (chỉ khi đang LIVE / demo)
   - personalEvery: mỗi khi điểm của một người vượt bội số của every (100 → 100, 200, 300...) thì người đó làm hành động
   - globalEvery: mỗi khi tổng điểm mọi người vượt bội số của every (1000 → 1000, 2000...) thì cả chùa làm hành động
   Hành động lấy từ "actions" của file mapping, chạy đúng như hành động của quà (ACTIONS). */
const MILESTONE = { personal: [], global: [], globalSum: 0 };   // globalSum: tổng điểm của mọi người trong bảng
const GLOBAL_MAX = 60;   // cả chùa: tối đa bấy nhiêu người làm hành động cùng lúc (đỡ nặng máy, đỡ tiếng mõ)
let timedTimers = [];
function runAct(p, action, value) {
  const fn = ACTIONS[action];
  if (!fn) { console.warn('[chua-3d] mốc: chưa hỗ trợ hành động', action); return; }
  if (p && !p.removed) fn(p, Math.max(1, value || 1), {});   // ev rỗng: không phải quà
}
/* chọn ngẫu nhiên tối đa n phần tử */
function sample(list, n) {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a.slice(0, n);
}
function startTimed(rules) {
  for (const t of timedTimers) clearInterval(t);
  timedTimers = rules.filter(r => r.sec > 0 && r.action).map(r => setInterval(() => {
    if (!(isLive || cfg.demo)) return;   // chỉ làm khi đang LIVE (hoặc demo)
    const list = [...players.values()].filter(p => !p.removed);
    for (const p of sample(list, r.count || 5)) runAct(p, r.action, r.value);
  }, r.sec * 1000));
}
/* gọi sau mỗi lần cộng điểm: điểm người đó đi từ before lên after, tổng cả chùa đi từ sumBefore lên sumAfter */
function checkMilestones(user, before, after, sumBefore, sumAfter) {
  // "mỗi X điểm": kích hoạt mỗi khi điểm vượt qua một bội số của X (cộng nhiều một lúc vẫn không sót)
  for (const r of MILESTONE.personal) if (Math.floor(after / r.every) > Math.floor(before / r.every)) runAct(players.get(user.id), r.action, r.value);
  for (const r of MILESTONE.global) if (Math.floor(sumAfter / r.every) > Math.floor(sumBefore / r.every)) {
    for (const p of sample([...players.values()].filter(q => !q.removed), GLOBAL_MAX)) runAct(p, r.action, r.value);
  }
}
/* bỏ điểm của một người khỏi bảng (ra khỏi chùa / không còn là người thật) */
function removeScore(id) {
  const s = scores.get(id);
  if (s) { MILESTONE.globalSum -= s.total; scores.delete(id); }
  rankDirty = true;
}
T.MILESTONE = MILESTONE;   // để test thủ công trong console
T.players = players;

/* điểm theo thời gian ở trong live – tính theo đồng hồ thật (setInterval), không theo khung hình,
   để máy chậm hay OBS thu nhỏ cửa sổ vẫn cộng đúng mỗi tickSec giây */
let lastTick = performance.now(), lastNpcTick = lastTick;
setInterval(() => {
  const now = performance.now();
  const on = isLive || cfg.demo;   // hết LIVE / mất kết nối TikTok thì không ai được cộng điểm thời gian
  if (now - lastTick >= POINTS.tickSec * 1000) {
    lastTick = now;
    const activeMs = POINTS.activeMin * 60000;
    // seenAt (không dùng lastActive: lastActive bị làm mới cả khi nhân vật tự đi lên / xuống đệm top)
    if (on) for (const p of players.values()) {
      if (!p.removed && !p.user.npc && now - (p.seenAt || -1e12) < activeMs) addPoints(p.user, POINTS.tick);
    }
  }
  if (now - lastNpcTick >= POINTS.npcTickSec * 1000) {   // nhân vật ảo luôn ở trong chùa, không cần xét tương tác
    lastNpcTick = now;
    if (on) for (const p of players.values()) if (!p.removed && p.user.npc) addPoints(p.user, POINTS.npcTick);
  }
}, 1000);

/* Người xem vắng mặt: TikTok không báo rời phòng, nên ai không "thấy" (p.seenAt) quá LEAVE.min phút thì nhân vật tự đi ra.
   Vẫn giữ điểm (khác kick); tương tác lại thì vào chùa lại. Nhân vật ảo và người đang trên đệm top 10 không bị mời ra.
   Mỗi lần xét chỉ mời ra vài người để không cả đoàn cùng đứng dậy đi một lúc. LEAVE.min = 0: tắt. */
const LEAVE = { min: 10, checkSec: 5, perCheck: 3 };
T.LEAVE = LEAVE;   // để test thủ công trong console
setInterval(() => {
  if (!LEAVE.min) return;
  const now = performance.now(), limit = LEAVE.min * 60000;
  const gone = [...players.values()]
    .filter(p => !p.removed && !p.user.npc && p.vipRank < 0 && now - (p.seenAt || -1e12) > limit)
    .sort((a, b) => (a.seenAt || 0) - (b.seenAt || 0)).slice(0, LEAVE.perCheck);
  for (const p of gone) {
    players.delete(p.user.id);
    p.queue.length = 0;   // bỏ lệnh đang chờ, đi ra luôn
    p.cmdLeave();
  }
}, LEAVE.checkSec * 1000);

/* lưu điểm vào trình duyệt để tải lại trang / tắt mở OBS không mất bảng xếp hạng */
const SAVE_KEY = cfg.demo ? 'chua3d.scores.demo' : 'chua3d.scores';   // demo không đè điểm thật
// chỉ lưu người xem TikTok thật (id là dãy số) và nhân vật ảo có tên (id "npc:...").
// Người giả lập / test (trang simulator, API simulate, id tự đặt) vẫn xếp hạng lúc test nhưng không lưu,
// tải lại trang là hết; điểm test cũ đã lưu cũng bị bỏ khi tải trang.
const isKept = u => !u.sim && (/^\d+$/.test(String(u.id)) || String(u.id).startsWith('npc:'));
function saveScores() {
  try {
    const top = [...scores.values()].filter(s => isKept(s.user)).sort((a, b) => b.total - a.total).slice(0, 2000);
    localStorage.setItem(SAVE_KEY, JSON.stringify(top));
  } catch (_) { /* hết chỗ / chặn storage: bỏ qua */ }
}
function loadScores() {
  try {
    for (const s of JSON.parse(localStorage.getItem(SAVE_KEY) || '[]')) {
      if (s && s.user && s.user.id && s.total > 0 && isKept(s.user)) { scores.set(s.user.id, { user: s.user, total: s.total }); MILESTONE.globalSum += s.total; }
    }
    rankDirty = scores.size > 0;
  } catch (_) { /* dữ liệu hỏng: bắt đầu lại */ }
}
function resetScores() {
  scores.clear();
  MILESTONE.globalSum = 0;
  try { localStorage.removeItem(SAVE_KEY); } catch (_) { /* bỏ qua */ }
  rankDirty = true;
}
setInterval(saveScores, 15000);
addEventListener('beforeunload', saveScores);
function updateRanking() {
  rankDirty = false;
  // nhân vật ảo không còn trong chùa (đã bớt số NPC) thì không xếp hạng, không gọi lại vào
  const top = [...scores.values()].filter(s => !s.user.npc || players.has(s.user.id))
    .sort((a, b) => b.total - a.total).slice(0, C.consts.CUSHIONS.length);
  const ids = top.map(s => s.user.id);
  for (const id of vipIds) {
    if (ids.includes(id)) continue;
    const p = players.get(id);
    if (p && !p.removed) C.demote(p);
  }
  // người vẫn trong top 10 ngồi yên trên đệm đang giữ (chỉ đổi số hạng trên huy hiệu);
  // người mới lọt top lấy đệm vừa trống, hạng cao hơn được đệm gần Phật hơn (số đệm nhỏ hơn)
  const fresh = [], used = new Set();
  top.forEach((s, rank) => {
    const { p, isNew } = playerFor(s.user);
    if (!p) return;
    // dựng lại từ điểm đã lưu: chưa chắc còn trong live, chỉ tính điểm thời gian khi họ tương tác lại
    if (isNew) p.lastActive = -1e12;
    p.topRank = rank;
    if (p.vipRank >= 0 && !used.has(p.vipRank)) used.add(p.vipRank);
    else fresh.push({ p, s, rank });
  });
  const free = C.consts.CUSHIONS.map((_, i) => i).filter(i => !used.has(i));
  fresh.forEach(({ p, s, rank }, k) => {
    const promoted = p.vipRank < 0;
    C.seatVip(p, free[k]);
    if (promoted) { E.glow(p, 4); if (shown('toastTop')) U.toast(s.user, '🏆 được lên đệm Top ' + (rank + 1), 0, 'vip'); }
  });
  vipIds = ids;
  U.board(top);
}
T.updateRanking = updateRanking;   // để test thủ công trong console

loadScores();
U.rules({ ...POINTS, seatLikes: SEAT.likes });
U.guide(fillTim(GUIDE));

/* ---------- Kết nối ---------- */
/* Màn hình game được phát lên LIVE: người xem chỉ thấy nhãn "● LIVE" khi đã nối TikTok.
   Trạng thái đang nối / lỗi chỉ hiện khi mở với ?debug=1 (xem lỗi ở trang quản trị). */
function status(text, kind) {
  if (cfg.debug || ((kind === 'ok' || kind === 'demo') && shown('liveLabel'))) U.status(text, kind);
  else U.status('');
}
let liveText = '';
function showStatus(s) {
  const t = (s && s.tiktok) || {};
  if (s && s.room) { BG.room = s.room.viewers || 0; refreshBg(); }
  const viewers = s && s.room && s.room.viewers ? '  ·  👁 ' + s.room.viewers : '';
  if (t.state !== 'connected') liveText = '';
  if (t.state) setLive(t.state === 'connected');
  if (t.state === 'connected') { liveText = '● LIVE @' + t.username; status(liveText + viewers, 'ok'); }
  else if (t.state === 'idle') status('LiveBridge ✓ (chưa nối TikTok)', 'warn');
  else if (t.state) status('TikTok: ' + t.state + (t.message ? ' – ' + t.message : ''), t.state === 'error' ? 'err' : 'warn');
}
U.status('');

if (cfg.demo) {
  status('DEMO', 'demo');
  startDemo();
} else if (window.LiveBridgeClient) {
  status('Đang kết nối LiveBridge…', 'warn');
  const lbClient = new LiveBridgeClient({ url: cfg.bridge, game: GAME_ID });
  if (window.NpcVoice) NpcVoice.attach(lbClient);   // thầy nói -> báo LiveBridge để voice khán giả tự tắt tiếng
  lbClient
    .on('event', handle)
    .on('chat', onChat)
    .on('block', onBlock)
    .on('config', m => applyConfig(m.config))
    .on('reset-scores', resetScores)
    .on('open', () => status('LiveBridge ✓', 'warn'))
    .on('close', () => { liveText = ''; status('Mất kết nối LiveBridge – đang thử lại…', 'err'); })
    .on('hello', h => {
      if (!h.mapping) status('LiveBridge chưa có mapping cho ' + GAME_ID, 'err');
      applyConfig(h.config);
    })
    .on('status', showStatus)
    .on('seen', m => {   // mỗi lần thả tim: cộng dồn, đủ SEAT.likes tim thì vào chùa; đã có nhân vật thì tính là còn trong live
      if (m.user && !(isLive && m.user.sim)) markSeen(m.user.id);
      if (!m.user || !m.user.id || (isLive && m.user.sim)) return;
      const n = (likeCount.get(m.user.id) || 0) + (m.count || 1);
      if (likeCount.size > 20000) likeCount.clear();
      likeCount.set(m.user.id, n);
      let p = players.get(m.user.id);
      if ((!p || p.removed) && n >= SEAT.likes) p = playerFor(m.user).p;
      if (p && !p.removed) p.lastActive = p.seenAt = performance.now();
    })
    .on('room', m => {
      if (liveText) status(liveText + (m.room.viewers ? '  ·  👁 ' + m.room.viewers : ''), 'ok');
      BG.room = m.room.viewers || 0; refreshBg();
      // người xem top TikTok báo đang ở trong phòng: vẫn được tính điểm thời gian dù không tương tác
      const now = performance.now();
      for (const id of m.room.present || []) { const p = players.get(id); if (p && !p.removed) p.seenAt = now; }
    })
    .connect();
} else {
  status('Không tải được livebridge-client.js – mở game qua LiveBridge hoặc thêm ?demo=1', 'err');
}

/* ---------- Thầy thỉnh thoảng hiện lên nói vài câu ----------
   Mỗi MONK.minSec..maxSec giây hiện một câu ngẫu nhiên (không lặp lại câu vừa nói);
   câu nhắc follow hiện thường hơn, khoảng 1/3 số lần.
   Bật/tắt, khoảng thời gian và câu nói chỉnh ở trang quản trị (monkOn, monkMinSec, monkMaxSec – giây, monkFollow, monkLines);
   câu dưới đây chỉ là bản dự phòng khi chạy ?demo=1 không có LiveBridge (câu mặc định nằm trong file mapping).
   ?monk=20 để test (20 giây một lần, ghi đè khoảng thời gian của trang quản trị). */
const MONK = {
  on: true, minSec: 120, maxSec: 240,
  follow: 'Follow thầy, mai mình cùng tu tiếp nhé 🙏',
  lines: [
    'A Di Đà Phật, chúc quý Phật tử một ngày an lạc 🙏',
    'Tâm an thì cảnh an. Thở chậm lại một chút nhé con.',
    'Mỗi câu niệm Phật là một hạt giống lành gieo vào tâm.',
    'Thắp một nén nhang, cầu cho gia đình bình an.',
    'Tích đức không cần lớn, một lời nói tử tế cũng là công đức.',
    'Buông bỏ được phiền não thì lòng nhẹ như mây.',
    'Hôm nay con đã niệm Phật chưa? Cùng niệm với thầy nhé.',
    'Sống chậm lại, thương người nhiều hơn, đó là tu.',
    'Gieo nhân lành thì gặt quả lành. A Di Đà Phật.',
    'Ai mới vào chùa thì gõ "Nam mô A Di Đà Phật" để cùng lễ Phật nhé.',
    'Cảm ơn các con đã ghé chùa, chúc các con mạnh khoẻ, bình an.',
  ],
  // chào / cảm ơn theo tên: {ten} = tên người xem, {phapdanh} = pháp danh vừa đặt
  greetOn: true, greetGap: 20,
  greet: ['Chào con {ten} đã ghé chùa 🙏', 'A Di Đà Phật, chào {ten}! Vào thắp nén nhang cùng thầy nhé.'],
  thank: ['A Di Đà Phật, thầy cảm ơn con {ten} 🙏', 'Công đức của con {ten} thầy ghi nhận rồi nhé 🙏'],
  followThanks: ['Con {ten} vừa follow thầy. Thầy đặt pháp danh cho con là {phapdanh} 🙏'],
};
if (q.has('monk')) MONK.minSec = MONK.maxSec = Math.max(5, Number(q.get('monk')) || 20);

/* Thầy chào / cảm ơn theo tên: hàng chờ ưu tiên follow (3) > quà (2, quà to trước) > chào người mới (1).
   Mỗi câu hiện vài giây rồi mới tới câu sau; hàng chờ chỉ giữ 4 câu, câu chờ quá lâu thì bỏ (không nói chuyện cũ). */
const monkQ = [];
let monkBusyUntil = 0, monkQTimer = 0, lastGreet = -1e9;
const greeted = new Set();
const pick = a => a[Math.floor(Math.random() * a.length)];
function fillLine(tpl, user) {
  const name = Array.from(String(user.nickname || 'con').trim()).slice(0, 20).join('');
  return tpl.replace(/\{ten\}/g, name).replace(/\{phapdanh\}/g, phapDanh.get(user.id) || '');
}
function monkReact(pri, lines, user, sec) {
  if (!MONK.greetOn || !lines || !lines.length) return;
  const i = monkQ.findIndex(m => m.uid === user.id && Math.floor(m.pri) === Math.floor(pri));
  if (i >= 0) monkQ.splice(i, 1);   // cùng người, cùng loại: chỉ giữ câu mới nhất
  const reactText = fillLine(pick(lines), user);
  if (window.NpcVoice) NpcVoice.prefetch(reactText);   // chuyển giọng trước, tới lượt thầy hiện chữ là nói luôn
  monkQ.push({ pri, uid: user.id, text: reactText, sec, at: performance.now() });
  monkQ.sort((a, b) => b.pri - a.pri || a.at - b.at);
  if (monkQ.length > 4) monkQ.length = 4;
  monkNext();
}
function monkNext() {
  clearTimeout(monkQTimer);
  const now = performance.now();
  if (now < monkBusyUntil) { monkQTimer = setTimeout(monkNext, monkBusyUntil - now + 50); return; }
  // lời chào chờ quá 15 giây, lời cảm ơn chờ quá 40 giây thì bỏ
  for (let i = monkQ.length - 1; i >= 0; i--) if (now - monkQ[i].at > (monkQ[i].pri < 2 ? 15000 : 40000)) monkQ.splice(i, 1);
  const m = monkQ.shift();
  if (!m) return;
  monkShow(m.text, m.sec, 'event');
  if (m.pri >= 3) S.play('bell');
  if (monkQ.length) monkQTimer = setTimeout(monkNext, m.sec * 1000 + 600);
}
function monkShow(text, sec = 8, kind = 'event') {
  if (window.NpcVoice && NpcVoice.enabled()) {
    monkBusyUntil = performance.now() + (sec + 8) * 1000;   // giữ hàng chờ trong lúc chờ tiếng sẵn sàng
    const fallback = () => {
      U.monk(text, 'Thầy', sec);
      monkBusyUntil = performance.now() + sec * 1000 + 600;
      if (monkQ.length) { clearTimeout(monkQTimer); monkQTimer = setTimeout(monkNext, sec * 1000 + 600); }
    };
    NpcVoice.speak(text, { kind, onStart: ({ durationMs }) => {
      const showSec = Math.max(sec, Math.ceil((durationMs || 0) / 1000) + 1);
      U.monk(text, 'Thầy', showSec);   // chữ hiện đúng lúc thầy bắt đầu nói
      monkBusyUntil = performance.now() + showSec * 1000 + 600;
      if (monkQ.length) { clearTimeout(monkQTimer); monkQTimer = setTimeout(monkNext, showSec * 1000 + 600); }
    } }).then(r => { if (!r.played) fallback(); }).catch(fallback);
    return;
  }
  U.monk(text, 'Thầy', sec);
  monkBusyUntil = performance.now() + sec * 1000 + 600;
}
/* chào người mới vào phòng: mỗi người 1 lần, cách nhau ít nhất greetGap giây cho đỡ ồn (live đông người vào liên tục) */
function greet(user) {
  if (!MONK.greetOn || user.npc || greeted.has(user.id)) return;
  const now = performance.now();
  if (now - lastGreet < MONK.greetGap * 1000) return;
  greeted.add(user.id);
  if (greeted.size > 20000) greeted.clear();
  lastGreet = now;
  monkReact(1, MONK.greet, user, 5);
}

let monkLast = '';
function monkSay() {
  // đang chào / cảm ơn ai đó thì để câu ngẫu nhiên lùi lại
  if (performance.now() < monkBusyUntil || monkQ.length) return scheduleMonk(15);
  let line = MONK.follow;
  if (!line || Math.random() > 0.34 || monkLast === MONK.follow) {
    let pool = MONK.lines.filter(l => l !== monkLast);
    if (!pool.length) pool = MONK.lines;   // chỉ có 1 câu thì đành lặp lại
    line = pool[Math.floor(Math.random() * pool.length)];
  }
  if (!line) return scheduleMonk();
  monkLast = line;
  if (window.NpcVoice) NpcVoice.prefetch(line);
  monkShow(line, 8, 'random');
  S.play('bell');
  scheduleMonk();
}
let monkTimer = 0;
function scheduleMonk(sec = MONK.minSec + Math.random() * (MONK.maxSec - MONK.minSec)) {
  clearTimeout(monkTimer);
  if (MONK.on) monkTimer = setTimeout(monkSay, sec * 1000);
}
/* cấu hình từ trang quản trị: đổi khoảng thời gian thì hẹn lại lần nói kế tiếp theo khoảng mới */
function setMonk(c) {
  if (c.monkFollow != null) MONK.follow = String(c.monkFollow).trim();
  if (Array.isArray(c.monkLines) && c.monkLines.length) MONK.lines = c.monkLines.map(String).filter(Boolean);
  for (const [k, key] of [['greet', 'monkGreet'], ['thank', 'monkThank'], ['followThanks', 'monkFollowThanks']]) {
    if (Array.isArray(c[key]) && c[key].length) MONK[k] = c[key].map(String).filter(Boolean);
  }
  if (c.monkGreetOn != null) MONK.greetOn = !!c.monkGreetOn;
  if (c.monkGreetGap != null) MONK.greetGap = Math.max(0, c.monkGreetGap);
  if (q.has('monk')) return;
  const before = `${MONK.on}|${MONK.minSec}|${MONK.maxSec}`;
  if (c.monkOn != null) MONK.on = !!c.monkOn;
  if (c.monkMinSec != null) MONK.minSec = Math.max(15, c.monkMinSec);
  if (c.monkMaxSec != null) MONK.maxSec = Math.max(MONK.minSec, c.monkMaxSec);
  if (`${MONK.on}|${MONK.minSec}|${MONK.maxSec}` !== before) scheduleMonk();
}
scheduleMonk(q.has('monk') ? 3 : 45);   // lần đầu sau 45 giây

/* Sự kiện giả để chạy thử không cần TikTok/LiveBridge */
function startDemo() {
  const names = ['Xuân Maii', 'Nguyễn Hà Vy', 'Lê Minh Nhựt', 'hieuhocxay', 'Bắp Bắp', 'Kiệt báo', 'Hạnh Nhi', 'Kim Hân', 'fw ry', 'Trường',
    'Bánh Ú', 'Xấu ngủ', 'Thu Trang', 'Diệu Hiền', 'Ngọc Lan', 'Bảo Ngọc', 'Hoàng Nam', 'Mai Anh', 'Quang Huy', 'Gia Bảo'];
  const chats = ['Nam mô A Di Đà Phật', 'con xin cầu bình an', 'hello mọi người', 'thắp nhang nào', 'đẹp quá', 'A Di Đà Phật 🙏'];
  const users = names.map((n, i) => ({ id: 'demo' + i, nickname: n, avatar: '' }));
  const table = [
    ['join', 20, null], ['chat', 25, null], ['bow', 15, { name: 'Tim ngón tay', d: 5, label: 'Lễ Phật', value: 3 }],
    ['incense', 20, { name: 'Hoa hồng', d: 1, label: 'Dâng hương', value: 1 }], ['walk', 5, null],
    ['lotus', 12, { name: 'Bánh vòng', d: 30, label: 'Hoa sen', value: 1 }], ['golden', 3, { name: 'Đèn lồng', d: 99, label: 'Thắp sáng', value: 1 }],
    ['follow', 3, null],
  ];
  const total = table.reduce((s, r) => s + r[1], 0);
  setInterval(() => {
    let r = Math.random() * total, row = table[0];
    for (const x of table) { if ((r -= x[1]) < 0) { row = x; break; } }
    const [action, , gift] = row;
    const user = users[Math.floor(Math.random() * users.length)];
    if (action === 'chat') return onChat({ user, text: chats[Math.floor(Math.random() * chats.length)] });
    if (action === 'follow') return handle({ action: 'bow', value: 1, count: 1, label: 'Theo dõi', user, source: { kind: 'follow' } });
    const count = gift ? 1 + Math.floor(Math.random() * 3) : 1;
    handle({
      action, value: gift ? gift.value : 1, count, label: gift ? gift.label : '',
      diamonds: gift ? gift.d * count : 0, user,
      source: gift ? { kind: 'gift', giftName: gift.name, diamonds: gift.d } : { kind: 'join' },
    });
  }, 1200);
}

/* ---------- ?pick=1: lấy toạ độ để chỉnh vị trí đệm / lư hương ở trang quản trị ----------
   Hiện số 1..10 tại chỗ quỳ của từng đệm (theo hạng), 🔥 tại miệng lư hương, 🙏 tại chỗ quỳ thắp nhang đang dùng.
   Bấm lên khung game: hiện "x, y" (% từ trái, % từ trên) và copy sẵn để dán vào trang quản trị. */
if (q.has('pick')) {
  const mk = (x, y, text, bg) => {
    const d = document.createElement('div');
    d.style.cssText = `position:absolute;left:${x}%;top:${y}%;transform:translate(-50%,-50%);z-index:50;pointer-events:none;
      min-width:22px;height:22px;border-radius:11px;display:grid;place-items:center;font:700 13px system-ui;color:#2a1600;
      background:${bg};box-shadow:0 0 0 2px #fff,0 2px 6px #000a`;
    d.textContent = text;
    stage.appendChild(d);
    return d;
  };
  C.consts.CUSHIONS.forEach((c, i) => { const s = C.toScreen(c.x, c.z); mk(s.x, s.y, String(i + 1), '#f2b632'); });
  const b = C.consts.BURNER, bs = C.toScreen(b.x, b.z, b.y);   // % khung game
  mk(bs.x, bs.y, '🔥', '#ffb0a0');
  const ks = C.toScreen(C.consts.PRAY_X, -C.consts.PRAY_D);
  mk(ks.x, ks.y, '🙏', '#bfe8a0');
  const info = document.createElement('div');
  info.style.cssText = `position:absolute;left:50%;bottom:8px;transform:translateX(-50%);z-index:51;max-width:92%;text-align:center;
    background:rgba(0,0,0,.8);color:#fff;font:600 14px system-ui;padding:6px 12px;border-radius:10px;pointer-events:none`;
  info.textContent = 'Chế độ lấy toạ độ: bấm vào chỗ quỳ của đệm / miệng lư hương / chỗ quỳ thắp nhang';
  stage.appendChild(info);
  let dot = null;
  stage.addEventListener('click', e => {
    const r = stage.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width * 100).toFixed(1), y = ((e.clientY - r.top) / r.height * 100).toFixed(1);
    const text = `${x}, ${y}`;
    if (dot) dot.remove();
    dot = mk(x, y, '+', '#7fd4ff');
    info.textContent = `${text}  (đã copy)`;
    if (navigator.clipboard) navigator.clipboard.writeText(text).catch(() => { info.textContent = text; });
  });
}

/* ---------- Vòng lặp ---------- */
const clock = new THREE.Clock();
function loop() {
  requestAnimationFrame(loop);
  const dt = Math.min(clock.getDelta(), 0.05);
  rankWait -= dt;
  if (rankDirty && rankWait <= 0) { updateRanking(); rankWait = 1.5; }
  C.update(dt);
  E.update(dt, clock.elapsedTime);
  C.render();
  U.drawTags();
}
loop();
})();
