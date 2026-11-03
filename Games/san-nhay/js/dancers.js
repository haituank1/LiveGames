/* Sàn nhảy: MỌI người xem đều có một dancer chibi đứng trên sàn, nhảy liên tục theo lớp nhân vật.
   6 lớp, mỗi lớp một ảnh chibi riêng (img/), một điệu nhảy CSS riêng (index.html: .d-<lớp> .figwrap)
   và một màu hiệu ứng riêng. Sàn CHẬT kiểu video: 7 hàng x 14 ô so le, hàng trước to hơn và
   chồng nhẹ lên hàng sau. Ngoài ô sàn còn 3 vị trí đặc biệt:
   - onStage: top 3 bảng vàng đứng LỚN trên sân khấu nền (2 bên + giữa), #1 có vương miện.
   - onPodium: dancer solo AU / đổ bộ VIP ở bục trước sân khấu.
   - paired: hai dancer nhảy đôi ở điểm sáng giữa sàn. */
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

/* Ô sàn: 7 hàng so le x 14 cột = 98 ô, hàng dưới to hơn (phối cảnh) */
const ROWS = [63, 67.5, 72, 76.5, 81, 85.5, 90];
const slots = [];
ROWS.forEach((y, ri) => {
  for (let i = 0; i < 14; i++) slots.push({ x: 4.6 + i * 6.55 + (ri % 2 ? 1.6 : 0), y, by: null });
});
/* Vị trí sân khấu nền cho top 3: trái / giữa (#1, to nhất) / phải — chân đứng trên mặt sàn khấu của nền (~45%) */
const STAGE_SLOTS = [
  { x: 50, y: 44.6, s: 0.19 },
  { x: 17, y: 45, s: 0.165 },
  { x: 83, y: 45, s: 0.165 },
];
const PAIR_POS = [{ x: 41.5, y: 73 }, { x: 58.5, y: 73 }];

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
    `<div class="figwrap"><img class="chibi" src="${classById(p.cls).img}" alt=""></div>` +
    `<div class="chip">${av}<span class="nm">${esc(p.user.nickname)}</span></div>`;
  return el;
}
function scaleFor(p) {
  if (p.onPodium) return Hpx * 0.21;
  if (p.onStage) return Hpx * (STAGE_SLOTS[p.stageIdx] || STAGE_SLOTS[0]).s;
  if (p.paired) return Hpx * 0.21;
  const t = Math.min(1, Math.max(0, (p.y - ROWS[0]) / (ROWS[ROWS.length - 1] - ROWS[0])));
  return Hpx * (0.105 + t * 0.05) * (p.leader ? 1.12 : 1);
}
function render(p) {
  p.el.style.setProperty('--fh', scaleFor(p) + 'px');
  p.el.style.transform = `translate(${p.x / 100 * Wpx}px, ${p.y / 100 * Hpx}px) translate(-50%,-100%)`;
  p.el.style.zIndex = String(p.onPodium ? 950 : p.paired ? 940 : p.onStage ? 500 + p.stageIdx : 100 + Math.round(p.y * 10));
}
function freeSlot(p) { if (p.slot) { p.slot.by = null; p.slot = null; } }
function takeSlot(p, s) { freeSlot(p); s.by = p; p.slot = s; p.x = s.x; p.y = s.y; }
function nearestFreeSlot(x, y, self) {
  let best = null, bd = 1e9;
  for (const s of slots) { if (s.by && s.by !== self) continue; const d = Math.hypot(s.x - x, (s.y - y) * 1.6); if (d < bd) { bd = d; best = s; } }
  return best;
}
function backToFloor(p) {
  const s = nearestFreeSlot(p.x + rand(-14, 14), 78, p);
  if (s) takeSlot(p, s);
  else { p.x = rand(8, 92); p.y = rand(64, 89); }
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

P.init = function (container) {
  box = container;
  setInterval(() => {   // thỉnh thoảng đổi ô gần kề cho sàn sống động (chỉ dancer thường trên sàn)
    const floor = [...people.values()].filter(p => !p.onPodium && !p.onStage && !p.paired);
    for (let k = 0; k < 3 && floor.length; k++) {
      const p = floor[Math.floor(Math.random() * floor.length)];
      if (!p || !p.slot) continue;
      const s = nearestFreeSlot(p.x + rand(-13, 13), p.y + rand(-5, 5), p);
      if (s && s !== p.slot) { takeSlot(p, s); render(p); }
    }
  }, 3000);
};
P.resize = function (w, h) { Wpx = w; Hpx = h; for (const p of people.values()) render(p); };
P.get = id => people.get(id);
P.count = () => people.size;
P.all = () => [...people.values()];
P.busy = p => !!(p && (p.onPodium || p.onStage || p.paired));

P.spawn = function (user) {
  if (!user || !user.id) return null;
  let p = people.get(user.id);
  if (p) { p.user = { ...p.user, ...user, avatar: user.avatar || p.user.avatar }; return p; }
  if (people.size >= MAX_PEOPLE) return null;
  p = { user, cls: pickClass(), x: 50, y: 107, slot: null, onPodium: false, onStage: false, stageIdx: -1, paired: false, leader: false, el: null };
  p.el = document.createElement('div');
  p.el.className = 'dancer d-' + p.cls;
  p.el.innerHTML = makeEl(p).innerHTML;
  box.appendChild(p.el);
  people.set(user.id, p);
  render(p);
  const s = nearestFreeSlot(50 + rand(-24, 24), 82, p);
  requestAnimationFrame(() => requestAnimationFrame(() => {
    if (P.busy(p)) { render(p); return; }   // vừa vào đã được lên bục / sân khấu: đừng kéo xuống ô sàn
    if (s && !s.by) takeSlot(p, s);
    else if (!p.slot) { p.x = rand(8, 92); p.y = rand(64, 89); }   // sàn đầy ô: đứng tự do trong sàn
    render(p);
    if (W.effects) W.effects.burstAt(p.x / 100, (p.y - 8) / 100, classById(p.cls).color, 14);
  }));
  return p;
};
P.setClass = function (p, clsId) {
  if (!p || p.cls === clsId) return;
  p.cls = clsId;
  p.el.className = 'dancer d-' + clsId + (p.onPodium ? ' onpodium' : '') + (p.onStage ? ' onstage' : '') + (p.paired ? ' paired' : '') + (p.leader ? ' leader' : '');
  p.el.querySelector('.figwrap').innerHTML = `<img class="chibi" src="${classById(clsId).img}" alt="">`;
  render(p);
};
/* ---- Bục solo / đổ bộ (trước sân khấu) ---- */
P.toPodium = function (p) {
  if (!p || p.onPodium) return;
  P.offStage(p); P.offPair(p);
  freeSlot(p);
  p.onPodium = true; p.x = 50; p.y = 59;
  p.el.classList.add('onpodium');
  render(p);
};
P.offPodium = function (p) {
  if (!p || !p.onPodium) return;
  p.onPodium = false;
  p.el.classList.remove('onpodium', 'grand');
  backToFloor(p);
};
/* ---- Sân khấu nền: top 3 bảng vàng ---- */
P.toStage = function (p, idx) {
  if (!p) return;
  if (p.onStage && p.stageIdx === idx) { render(p); return; }
  P.offPair(p);
  if (p.onPodium) { p.onPodium = false; p.el.classList.remove('onpodium', 'grand'); }
  freeSlot(p);
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
};
/* ---- Nhảy đôi giữa sàn ---- */
P.toPair = function (p, side) {
  if (!p) return;
  P.offStage(p);
  if (p.onPodium) { p.onPodium = false; p.el.classList.remove('onpodium', 'grand'); }
  freeSlot(p);
  p.paired = true;
  p.x = PAIR_POS[side].x; p.y = PAIR_POS[side].y;
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
  backToFloor(p);
};
P.toFloor = function (p) {   // rời mọi vị trí đặc biệt, về ô sàn
  if (!p) return;
  if (p.paired) { p.paired = false; p.el.classList.remove('paired'); p.el.querySelectorAll('.pairheart').forEach(e => e.remove()); }
  if (p.onStage) { p.onStage = false; p.stageIdx = -1; p.el.classList.remove('onstage'); setCrown(p, p.leader); }
  if (p.onPodium) { p.onPodium = false; p.el.classList.remove('onpodium', 'grand'); }
  backToFloor(p);
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
  const now = performance.now();
  if (!P.busy(p) && now < bubbleFreeAt) return;
  if (!P.busy(p)) bubbleFreeAt = now + 1100;
  const b = p.el.querySelector('.bubble');
  b.textContent = text;
  b.classList.add('on');
  clearTimeout(p._bt);
  p._bt = setTimeout(() => b.classList.remove('on'), 3600);
};
P.grandEntrance = function (p, sec = 6) {   // cánh + hào quang cho màn đổ bộ của quà lớn
  if (!p) return;
  p.el.classList.add('grand');
  clearTimeout(p._gt);
  p._gt = setTimeout(() => p.el.classList.remove('grand'), sec * 1000);
};
P.removeUser = function (uid) {
  const p = people.get(uid);
  if (!p) return;
  freeSlot(p);
  p.el.remove();
  people.delete(uid);
};
})();
