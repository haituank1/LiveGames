/* Lớp học chữ — người: cô Ngân (ảnh anime 2D, áo đỏ, kính tròn, tay
   cầm cờ đỏ + tay chỉ sang phải vào bảng) + học sinh ngồi nhìn từ
   SAU LƯNG. Ghế ngồi theo thứ hạng điểm: hàng trên = điểm cao nhất.
   20 ghế (4 hàng × 5, theo user chốt 2026-11-06 tối — 1 dãy ghế 5 hs).
   Ghế lấy ĐÚNG ghế vẽ sẵn trong ảnh nền (không ghép thêm ảnh ghế —
   bài học v8–v10: ghế/bàn ghép riêng nhìn như tủ):
   - Đỉnh bàn các hàng (ĐO từ ảnh nền v16, xem BG-LAYOUT.md):
     y 49,6 / 56,9 / 65,2 / 74,0; chip tên ĐÈ LÊN mặt bàn (chipY =
     đỉnh bàn − 0,2%, như ảnh họ — chip nằm trên mặt trước bàn, không
     nằm dưới bàn như v15/v16 trước).
     Học sinh ngồi CHÌM xuống: eo (đáy hình) nằm DƯỚI mặt bàn (đáy
     hình = đỉnh bàn + ~12px, đúng mép trước mặt bàn).
   - KHÔNG dùng mặt nạ mờ dần nữa (v16): mờ dần làm thân dưới trong
     suốt, nhìn như bóng ma (user chỉ 2026-11-06 tối). Thay bằng dải
     mặt bàn che thân dưới: 4 div .deskstrip trong index.html cắt đúng
     vùng mặt bàn từ ảnh nền (cùng ảnh, cùng vị trí → khớp tuyệt đối),
     z-index 8, nằm trên học sinh (z 7), dưới chip (z 12) — thân dưới
     bị mặt bàn che khuất, cắt sắc như ảnh họ, không còn mờ, không
     còn đường cắt thẳng lộ ra (mép cắt nằm sau mặt bàn).
   - KHÔNG cắt cứng (clip-path) nữa: cắt cứng để lại đường cắt thẳng
     ngang eo, nhìn như người bị chặt ngang ở ghế (user chỉ). Bài học
     v13→v14 từng cho rằng chỉ có mờ dần mới giống khuất sau bàn —
     nhưng mờ dần lại làm thân dưới trong suốt như bóng ma (user chỉ
     2026-11-06 tối), nên v16b bỏ hẳn: thân dưới che bởi dải mặt bàn
     (.deskstrip) cắt đúng từ ảnh nền, mép cắt nằm sau mặt bàn.
     (Bài học v12: ghép thêm ảnh lưng ghế riêng lên trên thì xấu, vì
     lưng ghế ghép không khớp phối cảnh + màu nền; nhưng dải mặt bàn
     cắt đúng từ ảnh nền thì khớp tuyệt đối vì cùng 1 ảnh.)
   - Tỉ lệ người: rộng 50/59/70/76 (v16c thu nhỏ từ 56/66/78/90 — hình
     cũ cao quá, eo hàng dưới chui vào tóc hàng trên). Chip tên + điểm
     đè lên mặt bàn (chipY = đỉnh bàn − 0,2%), như ảnh họ. */
(function () {
'use strict';
const W = (window.Classroom = window.Classroom || {});
const P = (W.people = {});
function hash(s) { let h = 0; s = String(s || ''); for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h); }
function esc(s) { return String(s || '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch])); }

const TEACHER_IMG = 'img/co-ngan.png';
const STUDENT_IMGS = ['img/hoc-sinh-sau-1.png', 'img/hoc-sinh-sau-2.png', 'img/hoc-sinh-sau-3.png', 'img/hoc-sinh-sau-4.png', 'img/hoc-sinh-sau-5.png', 'img/hoc-sinh-sau-6.png'];
const FRONT_IMGS = ['img/hoc-sinh-1.png', 'img/hoc-sinh-2.png', 'img/hoc-sinh-3.png', 'img/hoc-sinh-4.png', 'img/hoc-sinh-5.png', 'img/hoc-sinh-6.png'];

/* SEATS v16d (2026-11-06 tối, user chốt bỏ vụ cắt mép bàn + tự canh
   tọa độ): 20 ghế (4 hàng × 5). x/y = vị trí phần tử (%, học sinh neo
   translate(-50%,-100%) nên ĐÁY hình = y, đặt y đúng đỉnh bàn thì ngực
   cắt chạm mép bàn như ảnh họ — không dải mặt bàn, không mặt nạ, không
   cắt nào nữa. w = rộng ảnh (px); ảnh học sinh mới 600×600 (tỉ lệ 1.0,
   đầu + vai cắt ngang ngực), w 48/56/64/74 → thân hiện 48/56/64/74px.
   chipY = top (%) của chip tên + điểm (ngay dưới mép bàn, trên mặt
   trước bàn, như ảnh họ). y = đỉnh bàn ĐO TỪ ẢNH NỀN v17 (tia nắng):
   48,7/56,2/64,6/73,7 (bàn dịch lên 0,3–1% so với v16). Tọa độ từng ghế
   user tự canh bằng ?seats=1 (xem P.setEditMode ở cuối file). */
const SEATS = [
  { x: 10, y: 48.7, w: 48, chipY: 49.0 }, { x: 30, y: 48.7, w: 48, chipY: 49.0 },
  { x: 50, y: 48.7, w: 48, chipY: 49.0 }, { x: 70, y: 48.7, w: 48, chipY: 49.0 },
  { x: 90, y: 48.7, w: 48, chipY: 49.0 },
  { x: 10, y: 56.2, w: 56, chipY: 56.5 }, { x: 30, y: 56.2, w: 56, chipY: 56.5 },
  { x: 50, y: 56.2, w: 56, chipY: 56.5 }, { x: 70, y: 56.2, w: 56, chipY: 56.5 },
  { x: 90, y: 56.2, w: 56, chipY: 56.5 },
  { x: 10, y: 64.6, w: 64, chipY: 64.9 }, { x: 30, y: 64.6, w: 64, chipY: 64.9 },
  { x: 50, y: 64.6, w: 64, chipY: 64.9 }, { x: 70, y: 64.6, w: 64, chipY: 64.9 },
  { x: 90, y: 64.6, w: 64, chipY: 64.9 },
  { x: 10, y: 73.7, w: 74, chipY: 74.0 }, { x: 30, y: 73.7, w: 74, chipY: 74.0 },
  { x: 50, y: 73.7, w: 74, chipY: 74.0 }, { x: 70, y: 73.7, w: 74, chipY: 74.0 },
  { x: 90, y: 73.7, w: 74, chipY: 74.0 },
];
/* Ghi đè tọa độ ghế do user tự canh (?seats=1): lưu localStorage, nạp
   khi mở game, ưu tiên hơn SEATS mặc định. */
const LS_SEATS = 'lophochchu.seats.v1';
let seatOverrides = {};
try { seatOverrides = JSON.parse(localStorage.getItem(LS_SEATS) || '{}') || {}; } catch (_) { seatOverrides = {}; }
function getSeat(si) {
  const base = SEATS[si];
  if (!base) return null;
  const o = seatOverrides[si];
  if (!o) return base;
  return {
    x: o.x != null ? +o.x : base.x,
    y: o.y != null ? +o.y : base.y,
    w: o.w != null ? +o.w : base.w,
    chipY: o.chipY != null ? +o.chipY : base.chipY,
  };
}
function saveSeats() { try { localStorage.setItem(LS_SEATS, JSON.stringify(seatOverrides)); } catch (_) {} }
P.getSeats = function () { return SEATS.map((s, i) => getSeat(i)); };
P.setSeat = function (si, patch, save) {
  si = +si;
  if (!SEATS[si]) return;
  seatOverrides[si] = Object.assign({}, getSeat(si), patch);
  if (save !== false) saveSeats();
  seatOf.forEach((s2, pid) => { if (s2 === si) { const p = people.get(pid); if (p) applySeat(p, si); } });
  if (typeof P._onSeatChange === 'function') P._onSeatChange(si);
};
P.resetSeats = function () {
  seatOverrides = {};
  try { localStorage.removeItem(LS_SEATS); } catch (_) {}
  people.forEach(p => applySeat(p, p.seatIdx));
};
const NPC_SEAT_START = 15; // NPC nền chỉ ngồi hàng 4 (hàng sau), chừa 3 hàng trước cho người thật
const TEACHER_POS = { x: 13, y: 42.5 }; // co dung trai bang, tay chi ve phia bang; chan co y ~46%, dau co y ~23%
const BOARD_POS = { x: 88, y: 38 };
const MAX_PEOPLE = 20;

const names = ['An', 'Bình', 'Chi', 'Dũng', 'Hân', 'Khoa', 'Linh', 'Minh', 'Ngọc', 'Phúc', 'Quỳnh', 'Sơn', 'Thảo', 'Tuấn', 'Vy', 'Đức', 'Hà', 'Huy', 'Mai', 'Nam'];
let rootEl = null;
let chipLayer = null; // lớp chip tên+điểm riêng, z cao hơn học sinh để đầu hàng sau không che chip hàng trước
let bubbleLayer = null; // lớp bong bóng chat riêng trên cùng #stage (z 30), không bị panel che
let teacherEl = null;
let teacherBubble = null;
let tierLevel = 0;
let nextIdx = 0;
const people = new Map();   // id -> person
const seatOf = new Map();   // id -> seat index

function firstFreeSeat() {
  const taken = {};
  seatOf.forEach(i => { taken[i] = true; });
  for (let i = 0; i < SEATS.length; i++) if (!taken[i]) return i;
  return -1;
}
function applySeat(p, si) {
  const s = getSeat(si);
  if (!s || !p.el) return;
  p.el.style.left = s.x + '%';
  p.el.style.top = s.y + '%';
  p.el.style.width = s.w + 'px';
  // Chip ở lớp riêng trên cùng, ngay dưới mép bàn (chipY = đỉnh bàn + 0,3%).
  const chip = p.chipEl;
  if (chip) {
    chip.style.left = s.x + '%';
    chip.style.top = s.chipY + '%';
  }
}
function makeEl(p) {
  const el = document.createElement('div');
  el.className = 'student';
  el.dataset.id = p.id;
  el.innerHTML = '<div class="figwrap"><img src="' + p.img + '" alt="' + esc(p.name) + '" draggable="false"></div>'
    + '<div class="dot">✓</div><div class="hand">✋</div>';
  return el;
}

P.init = function (el) {
  rootEl = el || document.getElementById('room');
  if (!rootEl || teacherEl) return;
  chipLayer = document.createElement('div');
  chipLayer.id = 'chipLayer';
  rootEl.appendChild(chipLayer);
  bubbleLayer = document.getElementById('bubbleLayer');
  // Preload toàn bộ ảnh nhân vật ngay khi mở game (tránh "mất hình").
  [TEACHER_IMG].concat(STUDENT_IMGS, FRONT_IMGS).forEach(src => { const im = new Image(); im.src = src; });
  // Cô giáo đứng cố định bên trái bảng, không chiếm ghế học sinh.
  teacherEl = document.createElement('div');
  teacherEl.className = 'teacher';
  teacherEl.id = 'teacher';
  teacherEl.innerHTML = '<div class="figwrap"><img src="' + TEACHER_IMG + '" alt="Cô Ngân" draggable="false"></div>'
    + '<div class="gshadow"></div>';
  teacherEl.style.left = TEACHER_POS.x + '%';
  teacherEl.style.top = TEACHER_POS.y + '%';
  rootEl.appendChild(teacherEl);
  // Bong bóng cô Ngân: dải trống dưới khẩu hiệu, trên bảng — giữa
  // khung, không che câu đố/ô chữ trên bảng, không che đầu cô.
  teacherBubble = document.createElement('div');
  teacherBubble.className = 'bubble teacher-bubble';
  teacherBubble.id = 'teacherBubble';
  rootEl.appendChild(teacherBubble);
  P.teacherEl = teacherEl;
  // 3 NPC nền ngồi hàng 4 để lớp không trống (3 hàng trước chừa cho người thật).
  for (let i = 0; i < 3; i++) {
    const k = nextIdx++;
    const nm = names[k % names.length] + (k >= names.length ? ' ' + (k + 1) : '');
    P.spawn({ id: 'npc' + (i + 1), nickname: nm, npc: true, seatIdx: NPC_SEAT_START + i });
  }
};
P.setTier = function (n) {
  tierLevel = n | 0;
  const st = document.getElementById('stage');
  if (st) { st.classList.remove('tier-1', 'tier-2', 'tier-3'); if (tierLevel > 0) st.classList.add('tier-' + tierLevel); }
};
/* Ảnh cô Ngân: tay trái chỉ thẳng sang PHẢI về phía bảng (không lật
   ngang), tay phải cầm cờ đỏ giơ cao. .point chỉ bật hiệu ứng nhún
   nhẹ khi ra câu mới. */
P.teacherPoint = function (on) { if (teacherEl) teacherEl.classList.toggle('point', !!on); };
P.teacherHappy = function (sec) {
  if (!teacherEl) return;
  teacherEl.classList.add('happy');
  setTimeout(() => teacherEl.classList.remove('happy'), (sec || 2) * 1000);
};
P.teacherSay = function (text, sec) {
  if (!teacherBubble) return;
  teacherBubble.textContent = text;
  teacherBubble.classList.add('on');
  clearTimeout(P._sayT);
  P._sayT = setTimeout(() => teacherBubble.classList.remove('on'), (sec || 4) * 1000);
};

P.spawn = function (user) {
  if (!rootEl || people.has(user.id)) return people.get(user.id) || null;
  if (people.size >= MAX_PEOPLE) return null;   // hết ghế: vẫn chơi + ghi điểm, không có hình riêng
  let si = (user.seatIdx != null) ? user.seatIdx : firstFreeSeat();
  if (si < 0 || si >= SEATS.length) return null;
  let taken = false;
  seatOf.forEach(v => { if (v === si) taken = true; });
  if (taken) { si = firstFreeSeat(); if (si < 0) return null; }
  const h = hash(user.id);
  const p = {
    id: user.id, user,
    name: user.nickname || user.name || ('Bạn ' + user.id),
    img: STUDENT_IMGS[h % STUDENT_IMGS.length],
    avatar: FRONT_IMGS[h % FRONT_IMGS.length],
    seatIdx: si, state: 'home', lastActive: Date.now(), lastInteract: 0, pts: 0,
  };
  p.el = makeEl(p);
  if (editMode) p.el.classList.add('editable');
  rootEl.appendChild(p.el);
  p.chipEl = document.createElement('div');
  p.chipEl.className = 'chip';
  p.chipEl.innerHTML = '<span class="nm">' + esc(p.name) + '</span><span class="pts">0</span>';
  chipLayer.appendChild(p.chipEl);
  seatOf.set(user.id, si);
  applySeat(p, si);
  people.set(user.id, p);
  return p;
};
P.get = id => people.get(id) || null;
P.count = () => people.size;
P.all = () => [...people.values()];
P.removeUser = function (id) {
  const p = people.get(id);
  if (!p) return;
  if (p._boardTimer) clearTimeout(p._boardTimer);
  if (p.el) p.el.remove();
  if (p.chipEl) p.chipEl.remove();
  if (p.layerBubble) p.layerBubble.remove();
  seatOf.delete(id);
  people.delete(id);
};
P.touch = function (id) { const p = people.get(id); if (p) p.lastActive = Date.now(); };
P.markInteract = function (id) { const p = people.get(id); if (p) p.lastInteract = Date.now(); };
P.say = function (id, text, sec) {
  const p = people.get(id);
  if (!p || !bubbleLayer) return;
  if (!p.layerBubble) {
    p.layerBubble = document.createElement('div');
    p.layerBubble.className = 'bubble';
    bubbleLayer.appendChild(p.layerBubble);
  }
  const b = p.layerBubble;
  // Bong bóng nằm trên đầu học sinh: đáy bong bóng = đỉnh đầu (đỉnh
  // phần tử — học sinh neo -100% nên đỉnh phần tử = mép bàn − chiều
  // cao hình). Tính theo tọa độ thật của phần tử để đúng cả khi user
  // đã kéo ghế đi chỗ khác.
  const stage = document.getElementById('stage');
  const srect = stage ? stage.getBoundingClientRect() : { left: 0, top: 0, width: 720, height: 1280 };
  const rect = p.el.getBoundingClientRect();
  const cx = (rect.left + rect.width / 2 - srect.left) / (srect.width / 720);
  const top = (rect.top - srect.top) / (srect.height / 1280) - 6;
  b.style.left = (cx / 720 * 100) + '%';
  b.style.top = (top / 1280 * 100) + '%';
  b.textContent = String(text || '').slice(0, 60);
  b.classList.add('on');
  clearTimeout(p._sayT);
  p._sayT = setTimeout(() => b.classList.remove('on'), (sec || 4) * 1000);
};
P.raiseHand = function (id, sec) {
  const p = people.get(id);
  if (!p) return;
  p.el.classList.add('raise');
  if (p.chipEl) p.chipEl.classList.add('correct');   // chấm ✓ xanh + chip xanh như live đối thủ
  const t = sec || 3;
  setTimeout(() => { p.el.classList.remove('raise'); if (p.chipEl) p.chipEl.classList.remove('correct'); }, t * 1000);
};
/* Xếp lại ghế theo thứ tự điểm: ids[0] (điểm cao nhất) ngồi ghế đầu tiên,
   cứ thế xuống hàng dưới. Ghế đang bị NPC / người 0 điểm ngồi thì ĐỔI CHỖ
   (người kia xuống ghế vừa trống) — điểm cao luôn được ngồi hàng trên dù
   NPC đã ngồi trước. Người đang lên bảng không bị dời (ghế giữ lại);
   học sinh "chuyển chỗ" mượt nhờ transition CSS. */
P.reseat = function (ids) {
  if (!rootEl || !ids || !ids.length) return;
  const moving = {};
  ids.forEach(id => { const p = people.get(id); if (p && !p.onboard) moving[id] = true; });
  // Ghế mục tiêu theo thứ tự tốt -> xấu, bỏ qua ghế của người đang lên bảng.
  const targets = [];
  for (let i = 0; i < SEATS.length; i++) {
    let onb = false;
    seatOf.forEach((si, pid) => { if (si === i) { const pp = people.get(pid); if (pp && pp.onboard) onb = true; } });
    if (!onb) targets.push(i);
  }
  ids.forEach((id, k) => {
    const p = people.get(id);
    if (!p || p.onboard || k >= targets.length) return;
    const target = targets[k];
    if (seatOf.get(id) === target) return; // đã đúng chỗ
    // Ai đang ngồi ghế mục tiêu (không phải người đang dời) thì đổi chỗ.
    let occ = null;
    seatOf.forEach((si, pid) => { if (si === target && !moving[pid]) occ = pid; });
    if (occ) {
      const cur = seatOf.get(id);
      seatOf.set(occ, cur);
      const op = people.get(occ);
      if (op) { op.seatIdx = cur; applySeat(op, cur); }
    }
    seatOf.set(id, target);
    p.seatIdx = target;
    applySeat(p, target);
  });
};
/* Cập nhật số điểm trong chip tên + điểm của học sinh. */
P.setScore = function (id, pts) {
  const p = people.get(id);
  if (!p) return;
  p.pts = pts;
  const el = p.chipEl && p.chipEl.querySelector('.pts');
  if (el) el.textContent = String(pts);
};
P.topStudent = function (id) {
  for (const p of people.values()) {
    p.el.classList.toggle('top1', p.id === id);
    if (p.chipEl) p.chipEl.classList.toggle('top1', p.id === id);
  }
};
P.celebrate = function (ids, sec) {
  for (const id of ids || []) {
    const p = people.get(id);
    if (!p) continue;
    p.el.classList.add('happy');
    setTimeout(((el) => () => el.classList.remove('happy'))(p.el), (sec || 3) * 1000);
  }
  if (teacherEl) P.teacherHappy(sec || 3);
};
P.danceAll = function (sec) {
  for (const p of people.values()) {
    p.el.classList.add('happy');
    setTimeout(((el) => () => el.classList.remove('happy'))(p.el), (sec || 3) * 1000);
  }
  if (teacherEl) P.teacherHappy(sec || 3);
};
/* Học sinh lên bảng nhận thưởng (quà lớn): đứng cạnh bảng rồi tự quay về ghế. */
P.toBoard = function (id, sec) {
  const p = people.get(id);
  if (!p || p.state === 'board') return;
  p.state = 'board';
  p.onboard = true;
  if (p.chipEl) p.chipEl.style.display = 'none'; // lên bảng thì ẩn chip ghế
  if (p._boardTimer) clearTimeout(p._boardTimer);
  p.el.classList.add('onboard');
  p.el.style.left = BOARD_POS.x + '%';
  p.el.style.top = BOARD_POS.y + '%';
  p.el.style.width = ((getSeat(p.seatIdx) || {}).w * 1.25 || 86) + 'px';
  p._boardTimer = setTimeout(() => {
    if (!people.get(id)) return;
    p.state = 'home';
    p.onboard = false;
    p.el.classList.remove('onboard');
    if (p.chipEl) p.chipEl.style.display = '';
    applySeat(p, p.seatIdx);
  }, (sec || 8) * 1000);
};
/* Chế độ chỉnh ghế (?seats=1, demo): user tự canh tọa độ từng học sinh.
   - Bấm vào 1 học sinh (hoặc chọn trong dropdown) để chọn ghế.
   - Kéo học sinh để di chuyển (x/y theo % sân khấu 720×1280).
   - Gõ số X/Y/Rộng trong panel; chip theo y + 0,3 tự động.
   - Lưu localStorage ngay khi thả chuột / đổi số; nút Copy ra JSON
     đầy đủ 20 ghế để chép vào SEATS; nút Đặt lại xóa ghi đè. */
let editMode = false;
let selSeat = 0;
let drag = null;

function stagePct(clientX, clientY) {
  const st = document.getElementById('stage');
  if (!st) return null;
  const r = st.getBoundingClientRect();
  return {
    x: Math.max(0, Math.min(100, (clientX - r.left) / r.width * 100)),
    y: Math.max(0, Math.min(100, (clientY - r.top) / r.height * 100)),
  };
}
function editorEls() {
  return {
    panel: document.getElementById('seatEditor'),
    sel: document.getElementById('seSeat'),
    x: document.getElementById('seX'),
    y: document.getElementById('seY'),
    w: document.getElementById('seW'),
    msg: document.getElementById('seMsg'),
  };
}
function refreshEditor() {
  const e = editorEls();
  if (!e.panel || e.panel.style.display === 'none') return;
  const s = getSeat(selSeat);
  if (!s) return;
  e.sel.value = String(selSeat);
  e.x.value = (+s.x).toFixed(1);
  e.y.value = (+s.y).toFixed(1);
  e.w.value = String(Math.round(+s.w));
  people.forEach(p => p.el.classList.toggle('se-sel', p.seatIdx === selSeat && !p.onboard));
}
P._onSeatChange = function (si) { if (editMode && si === selSeat) refreshEditor(); };
function selectSeat(si) { selSeat = +si; refreshEditor(); }
function applyEditorPatch(patch) {
  const s = getSeat(selSeat);
  const y = patch.y != null ? +patch.y : s.y;
  P.setSeat(selSeat, Object.assign({}, patch, { chipY: +(y + 0.3).toFixed(1) }));
}
function onPointerMove(ev) {
  if (!drag) return;
  const pt = stagePct(ev.clientX, ev.clientY);
  if (!pt) return;
  if (Math.abs(ev.clientX - drag.sx) + Math.abs(ev.clientY - drag.sy) > 4) drag.moved = true;
  if (!drag.moved) return;
  // Giữ đúng điểm cầm: ghế neo ở ĐÁY hình (mép bàn), chuột thường cầm
  // giữa hình — cộng lại độ lệch lúc bắt đầu kéo để hình không nhảy.
  const x = Math.max(0, Math.min(100, pt.x + drag.ox / 720 * 100));
  const y = Math.max(0, Math.min(100, pt.y + drag.oy / 1280 * 100));
  P.setSeat(drag.si, { x: +x.toFixed(1), y: +y.toFixed(1), chipY: +(y + 0.3).toFixed(1) }, false);
}
function onPointerUp() {
  if (!drag) return;
  const p = people.get(drag.pid);
  if (p) p.el.classList.remove('dragging');
  if (drag.moved) { saveSeats(); refreshEditor(); }
  drag = null;
}
function onPointerDown(ev) {
  if (!editMode) return;
  const t = ev.target.closest ? ev.target.closest('.student') : null;
  if (!t || !t.dataset.id) return;
  const p = people.get(t.dataset.id);
  if (!p || p.onboard) return;
  ev.preventDefault();
  selectSeat(p.seatIdx);
  // Độ lệch giữa điểm neo ghế (đáy hình = mép bàn) và điểm chuột lúc
  // bắt đầu kéo — để hình đi theo tay đúng chỗ cầm, không nhảy.
  const s0 = getSeat(p.seatIdx);
  const pt0 = stagePct(ev.clientX, ev.clientY) || { x: s0.x, y: s0.y };
  drag = {
    pid: p.id, si: p.seatIdx, moved: false, sx: ev.clientX, sy: ev.clientY,
    ox: s0.x / 100 * 720 - pt0.x / 100 * 720,
    oy: s0.y / 100 * 1280 - pt0.y / 100 * 1280,
  };
  p.el.classList.add('dragging');
  try { p.el.setPointerCapture(ev.pointerId); } catch (_) {}
  p.el.addEventListener('pointermove', onPointerMove);
  p.el.addEventListener('pointerup', onPointerUp, { once: true });
  p.el.addEventListener('pointercancel', onPointerUp, { once: true });
}
P.setEditMode = function (on) {
  editMode = !!on;
  const e = editorEls();
  if (!e.panel) return;
  e.panel.style.display = editMode ? 'block' : 'none';
  if (!editMode) return;
  e.sel.innerHTML = '';
  for (let i = 0; i < 20; i++) {
    const o = document.createElement('option');
    o.value = String(i);
    o.textContent = 'Ghế ' + (i + 1) + ' — hàng ' + (Math.floor(i / 5) + 1);
    e.sel.appendChild(o);
  }
  e.sel.onchange = () => selectSeat(+e.sel.value);
  e.x.onchange = () => applyEditorPatch({ x: parseFloat(e.x.value) || 0 });
  e.y.onchange = () => applyEditorPatch({ y: parseFloat(e.y.value) || 0 });
  e.w.onchange = () => applyEditorPatch({ w: parseFloat(e.w.value) || 48 });
  document.getElementById('seCopy').onclick = () => {
    const json = JSON.stringify(P.getSeats().map(s => ({ x: +s.x, y: +s.y, w: +s.w, chipY: +s.chipY })));
    const done = () => { e.msg.textContent = 'Đã sao chép 20 ghế ✓'; setTimeout(() => { e.msg.textContent = ''; }, 2500); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(json).then(done, () => { e.msg.textContent = 'Không sao chép được'; });
    else e.msg.textContent = 'Trình duyệt không hỗ trợ sao chép';
  };
  document.getElementById('seReset').onclick = () => { P.resetSeats(); selectSeat(selSeat); e.msg.textContent = 'Đã về mặc định'; setTimeout(() => { e.msg.textContent = ''; }, 2500); };
  people.forEach(p => p.el.classList.add('editable'));
  if (!rootEl._editBound) { rootEl.addEventListener('pointerdown', onPointerDown); rootEl._editBound = true; }
  refreshEditor();
};

P.esc = esc;
})();
