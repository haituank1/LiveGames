/* Sàn nhảy v3 – KHÔNG GIAN RỘNG + SLOT CỐ ĐỊNH.
   #world rộng hơn khung 9:16, chia 3 khu: A (DJ + TV) | B (sàn chính + sân khấu top 3) | C (VIP bar).
   Mỗi dancer khi vào phòng được RANDOM một ô trống CỐ ĐỊNH trong 126 ô của cả 3 khu
   (thẻ ô A07/B12/C03 in dưới chân), đứng nhảy tại ô đó, KHÔNG xáo trộn khi người khác vào/ra.
   Chỉ 2 lần rời ô được phép: lên sân khấu top 3 ở Khu B và ra điểm nhảy đôi của khu mình —
   xong đều quay về đúng ô nhà. Solo AU diễn ngay TẠI Ô của dancer (camera lia tới, xem main.js). */
(function () {
'use strict';
const W = (window.Party = window.Party || {});
const P = (W.dancers = {});
const MAX_PEOPLE = 120;

const CLASSES = [
  { id: 'dai-gia',  name: 'Đại Gia',   img: 'img/dai-gia.png',  color: '#ffd76a', weight: 6 },
  { id: 'idol',     name: 'Idol',      img: 'img/idol.png',     color: '#ff7ed6', weight: 18 },
  { id: 'dj',       name: 'DJ',        img: 'img/dj.png',       color: '#7ed6ff', weight: 16 },
  { id: 'quay-hai', name: 'Dân Quẩy',  img: 'img/quay-hai.png', color: '#ff9d5c', weight: 20 },
  { id: 'mascot',   name: 'Mascot Vịt', img: 'img/mascot.png',  color: '#ffe14d', weight: 16 },
  { id: 'tan-binh', name: 'Tân Binh',  img: 'img/tan-binh.png', color: '#9be15d', weight: 24 },
];
P.CLASSES = CLASSES;
const classById = id => CLASSES.find(c => c.id === id) || CLASSES[5];
P.classOf = p => classById(p && p.cls);
P.classImg = id => classById(id).img;
function pickClass() {
  const total = CLASSES.reduce((s, c) => s + c.weight, 0);
  let r = Math.random() * total;
  for (const c of CLASSES) { r -= c.weight; if (r <= 0) return c.id; }
  return 'tan-binh';
}

/* ----- Lưới ô cố định: 3 khu x 7 hàng x 6 cột = 126 ô (tọa độ % của #world) ----- */
const ZONE_DEF = {
  A: { x0: 6.5,  dx: 4.6 },
  B: { x0: 35.5, dx: 5.8 },
  C: { x0: 70.5, dx: 5.1 },
};
P.ZONE_CX = { A: 16.7, B: 50, C: 83.3 };
const ROWS_Y = [69.5, 73.5, 77.5, 81.5, 85.5, 89.5, 93.5];
const slots = [];
for (const z of ['A', 'B', 'C']) {
  const def = ZONE_DEF[z];
  ROWS_Y.forEach((y, ri) => {
    for (let i = 0; i < 6; i++) {
      const n = ri * 6 + i + 1;
      slots.push({ id: z + String(n).padStart(2, '0'), zone: z, x: def.x0 + i * def.dx + (ri % 2 ? def.dx * 0.32 : 0), y, by: null });
    }
  });
}
P.slotCount = () => slots.length;
/* Vị trí sân khấu Khu B cho top 3 bảng vàng (chân trên bục vẽ sẵn của panorama ~55%) */
const STAGE_SLOTS = [
  { x: 50,   y: 55.6, s: 0.175 },
  { x: 40.5, y: 56.1, s: 0.15 },
  { x: 59.5, y: 56.1, s: 0.15 },
];
/* Điểm nhảy đôi của từng khu: 2 vị trí kề nhau + tâm để camera / quầng sáng bám theo */
const PAIR_SPOTS = {
  A: [{ x: 13.2, y: 78.5 }, { x: 21.2, y: 78.5 }],
  B: [{ x: 45.6, y: 78.5 }, { x: 54.4, y: 78.5 }],
  C: [{ x: 79.2, y: 78.5 }, { x: 87.2, y: 78.5 }],
};
P.pairCenter = zone => {
  const s = PAIR_SPOTS[zone] || PAIR_SPOTS.B;
  return { x: (s[0].x + s[1].x) / 2, y: s[0].y };
};

let box = null, Wpx = 400, Hpx = 700;
const people = new Map();
const rand = (a, b) => a + Math.random() * (b - a);
const hash = s => { let x = 0; for (const ch of String(s)) x = (x * 31 + ch.codePointAt(0)) >>> 0; return x; };
function esc(s) { return String(s).replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch])); }

function makeEl(p) {
  const el = document.createElement('div');
  const hue = hash(p.user.id) % 360;
  const av = p.user.avatar
    ? `<span class="av"><img src="${esc(p.user.avatar)}" referrerpolicy="no-referrer" alt=""></span>`
    : `<span class="av" style="background:hsl(${hue},55%,48%)">${esc((Array.from(String(p.user.nickname || '?').trim())[0] || '?').toUpperCase())}</span>`;
  el.innerHTML = `<div class="bubble"></div><div class="halo"></div><div class="wing wingL"></div><div class="wing wingR"></div>` +
    `<div class="auraring"></div><div class="focusring"></div>` +
    `<div class="figwrap"><img class="chibi" src="${classById(p.cls).img}" alt=""></div>` +
    `<div class="chip">${av}<span class="nm">${esc(p.user.nickname)}</span></div>` +
    `<div class="slotmark">${p.home ? p.home.id : ''}</div>`;
  return el;
}
function scaleFor(p) {
  if (p.onStage) return Hpx * (STAGE_SLOTS[p.stageIdx] || STAGE_SLOTS[0]).s;
  if (p.paired) return Hpx * 0.148;
  const t = Math.min(1, Math.max(0, (p.y - ROWS_Y[0]) / (ROWS_Y[ROWS_Y.length - 1] - ROWS_Y[0])));
  return Hpx * (0.088 + t * 0.05) * (p.leader ? 1.1 : 1) * (p.focused ? 1.3 : 1);
}
function render(p) {
  p.el.style.setProperty('--fh', scaleFor(p) + 'px');
  p.el.style.transform = `translate(${p.x / 100 * Wpx}px, ${p.y / 100 * Hpx}px) translate(-50%,-100%)`;
  p.el.style.zIndex = String(p.onStage ? 500 + p.stageIdx : p.paired ? 940 : p.focused ? 930 : 100 + Math.round(p.y * 10));
}
function freeSlot(p) { if (p.slot) { p.slot.by = null; p.slot = null; } }
function takeSlot(p, s) { freeSlot(p); s.by = p; p.slot = s; p.home = s; p.x = s.x; p.y = s.y; }
function randomFreeSlot() {
  const free = slots.filter(s => !s.by);
  return free.length ? free[Math.floor(Math.random() * free.length)] : null;
}
function backToSlot(p) {   // quay về đúng ô nhà; ô bị chiếm (không nên xảy ra) thì lấy ô trống random khác
  if (p.home && (!p.home.by || p.home.by === p)) { freeSlot(p); p.home.by = p; p.slot = p.home; p.x = p.home.x; p.y = p.home.y; }
  else { const s = randomFreeSlot(); if (s) takeSlot(p, s); }
  if (!p.onStage) setCrown(p, p.leader);
  render(p);
}
function setCrown(p, on) {
  p.el.querySelectorAll('.crown').forEach(e => e.remove());
  if (on) {
    const c = document.createElement('div');
    c.className = 'crown'; c.textContent = '👑';
    p.el.appendChild(c);
  }
}
function clearSpecial(p) {   // gỡ mọi trạng thái đặc biệt, chưa di chuyển
  if (p.paired) { p.paired = false; p.el.classList.remove('paired'); p.el.querySelectorAll('.pairheart').forEach(e => e.remove()); }
  if (p.onStage) { p.onStage = false; p.stageIdx = -1; p.el.classList.remove('onstage'); setCrown(p, p.leader); }
  if (p.focused) { p.focused = false; p.el.classList.remove('focused'); }
}

P.init = function (container) { box = container; };
P.resize = function (w, h) { Wpx = w; Hpx = h; for (const p of people.values()) render(p); };
P.get = id => people.get(id);
P.count = () => people.size;
P.all = () => [...people.values()];
P.busy = p => !!(p && (p.onStage || p.paired));
P.zoneOf = p => (p && p.home ? p.home.zone : 'B');
P.neighbours = function (p) {   // dancer cùng khu (để cổ vũ khi có người solo)
  if (!p || !p.home) return [];
  return [...people.values()].filter(o => o !== p && o.home && o.home.zone === p.home.zone);
};

P.spawn = function (user) {
  if (!user || !user.id) return null;
  let p = people.get(user.id);
  if (p) { p.user = { ...p.user, ...user, avatar: user.avatar || p.user.avatar }; return p; }
  if (people.size >= MAX_PEOPLE) return null;
  const s = randomFreeSlot();
  p = { user, cls: pickClass(), x: s ? s.x : 50, y: 104, slot: null, home: null, onStage: false, stageIdx: -1, paired: false, focused: false, leader: false, el: null };
  if (s) { s.by = p; p.slot = s; p.home = s; }
  p.el = document.createElement('div');
  p.el.className = 'dancer d-' + p.cls;
  p.el.innerHTML = makeEl(p).innerHTML;
  box.appendChild(p.el);
  people.set(user.id, p);
  render(p);   // bắt đầu từ dưới mép thế giới (y=104%) rồi trượt lên ô nhà
  requestAnimationFrame(() => requestAnimationFrame(() => {
    if (p.home) { p.x = p.home.x; p.y = p.home.y; }
    else { p.x = rand(8, 92); p.y = rand(70, 92); }   // hết ô (không nên xảy ra với cap 120 < 126 ô)
    render(p);
    if (W.effects) W.effects.burstAt(p.x / 100, (p.y - 8) / 100, classById(p.cls).color, 14);
    if (W.effects && W.effects.ambient) W.effects.ambient(p.cls, p.x / 100, p.y / 100);
  }));
  return p;
};
P.setClass = function (p, clsId) {
  if (!p || p.cls === clsId) return;
  p.cls = clsId;
  p.el.className = 'dancer d-' + clsId + (p.onStage ? ' onstage' : '') + (p.paired ? ' paired' : '') + (p.focused ? ' focused' : '') + (p.leader ? ' leader' : '');
  p.el.querySelector('.figwrap').innerHTML = `<img class="chibi" src="${classById(clsId).img}" alt="">`;
  render(p);
};
/* ---- Solo tại ô: vòng sáng + spotlight do camera bám (main.js lo camera) ---- */
P.setFocus = function (p, on) {
  if (!p) return;
  p.focused = !!on;
  p.el.classList.toggle('focused', !!on);
  render(p);
};
/* ---- Sân khấu Khu B: top 3 bảng vàng ---- */
P.toStage = function (p, idx) {
  if (!p) return;
  if (p.onStage && p.stageIdx === idx) { render(p); return; }
  clearSpecial(p);
  p.onStage = true; p.stageIdx = idx;
  const s = STAGE_SLOTS[idx] || STAGE_SLOTS[0];
  p.x = s.x; p.y = s.y;
  p.el.classList.add('onstage');
  setCrown(p, idx === 0);
  render(p);
};
P.offStage = function (p) {
  if (!p || !p.onStage) return;
  p.onStage = false; p.stageIdx = -1;
  p.el.classList.remove('onstage');
  setCrown(p, p.leader);
  backToSlot(p);
};
/* ---- Nhảy đôi tại điểm nhảy đôi của khu ---- */
P.toPair = function (p, zone, side) {
  if (!p) return;
  clearSpecial(p);
  p.paired = true;
  const pos = (PAIR_SPOTS[zone] || PAIR_SPOTS.B)[side] || PAIR_SPOTS.B[0];
  p.x = pos.x; p.y = pos.y;
  p.el.classList.add('paired');
  if (!p.el.querySelector('.pairheart')) {
    const hh = document.createElement('div');
    hh.className = 'pairheart'; hh.textContent = '💞';
    p.el.appendChild(hh);
  }
  render(p);
};
P.offPair = function (p) {
  if (!p || !p.paired) return;
  p.paired = false;
  p.el.classList.remove('paired');
  p.el.querySelectorAll('.pairheart').forEach(e => e.remove());
  backToSlot(p);
};
P.toFloor = function (p) {   // rời mọi vị trí đặc biệt, về ô nhà
  if (!p) return;
  clearSpecial(p);
  backToSlot(p);
};
P.setLeader = function (id) {
  for (const p of people.values()) {
    const on = p.user.id === id;
    if (on === p.leader) continue;
    p.leader = on;
    p.el.classList.toggle('leader', on);
    if (!p.onStage) setCrown(p, on);   // trên sân khấu thì vương miện theo vị trí #1
    render(p);
  }
};
/* Bong bóng thoại: giới hạn số bong bóng cùng lúc cho sàn đông khỏi rối (trừ dancer đặc biệt) */
let bubbleFreeAt = 0;
P.sayBubble = function (p, text) {
  if (!p) return;
  const special = P.busy(p) || p.focused;
  const now = performance.now();
  if (!special && now < bubbleFreeAt) return;
  if (!special) bubbleFreeAt = now + 1100;
  const b = p.el.querySelector('.bubble');
  b.textContent = text;
  b.classList.add('on');
  clearTimeout(p._bt);
  p._bt = setTimeout(() => b.classList.remove('on'), 3600);
};
P.grandEntrance = function (p, sec = 6) {   // cánh + hào quang cho màn đổ bộ của quà lớn (ngay tại ô)
  if (!p) return;
  p.el.classList.add('grand');
  clearTimeout(p._gt);
  p._gt = setTimeout(() => p.el.classList.remove('grand'), sec * 1000);
};
P.removeUser = function (uid) {
  const p = people.get(uid);
  if (!p) return;
  freeSlot(p);
  if (p.home && p.home.by === p) p.home.by = null;
  p.el.remove();
  people.delete(uid);
};
})();

