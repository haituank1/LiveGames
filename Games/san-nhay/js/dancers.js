/* Sàn nhảy: MỌI người xem đều có một dancer chibi đứng trên sàn, nhảy liên tục theo lớp nhân vật.
   6 lớp, mỗi lớp một ảnh chibi riêng (img/), một điệu nhảy CSS riêng (index.html: .d-<lớp> .figwrap)
   và một màu hiệu ứng riêng. Dancer đứng theo ô sàn (hàng ngang so le), thỉnh thoảng đổi ô cho sinh động. */
(function () {
'use strict';
const W = (window.Party = window.Party || {});
const P = (W.dancers = {});
const MAX_PEOPLE = 60;

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
function pickClass() {
  const total = CLASSES.reduce((s, c) => s + c.weight, 0);
  let r = Math.random() * total;
  for (const c of CLASSES) { r -= c.weight; if (r <= 0) return c.id; }
  return 'tan-binh';
}

/* Ô sàn: 5 hàng so le, hàng dưới to hơn (phối cảnh) */
const ROWS = [52, 60, 68, 76, 84];
const slots = [];
ROWS.forEach((y, ri) => {
  for (let i = 0; i < 9; i++) slots.push({ x: 8 + i * 10.5 + (ri % 2 ? 3 : 0), y, by: null });
});

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
  if (p.onPodium) return Hpx * 0.30;
  return Hpx * 0.155 * (0.74 + Math.max(0, (p.y - ROWS[0])) / (ROWS[ROWS.length - 1] - ROWS[0]) * 0.36) * (p.leader ? 1.13 : 1);
}
function render(p) {
  p.el.style.setProperty('--fh', scaleFor(p) + 'px');
  p.el.style.transform = `translate(${p.x / 100 * Wpx}px, ${p.y / 100 * Hpx}px) translate(-50%,-100%)`;
  p.el.style.zIndex = String(p.onPodium ? 900 : 100 + Math.round(p.y * 10));
}
function freeSlot(p) { if (p.slot) { p.slot.by = null; p.slot = null; } }
function takeSlot(p, s) { freeSlot(p); s.by = p; p.slot = s; p.x = s.x; p.y = s.y; }
function nearestFreeSlot(x, y, self) {
  let best = null, bd = 1e9;
  for (const s of slots) { if (s.by && s.by !== self) continue; const d = Math.hypot(s.x - x, (s.y - y) * 1.6); if (d < bd) { bd = d; best = s; } }
  return best;
}

P.init = function (container) {
  box = container;
  setInterval(() => {   // thỉnh thoảng đổi ô gần kề cho sàn sống động
    const floor = [...people.values()].filter(p => !p.onPodium);
    for (let k = 0; k < 3 && floor.length; k++) {
      const p = floor[Math.floor(Math.random() * floor.length)];
      if (!p || !p.slot) continue;
      const s = nearestFreeSlot(p.x + rand(-16, 16), p.y + rand(-9, 9), p);
      if (s && s !== p.slot) { takeSlot(p, s); render(p); }
    }
  }, 3000);
};
P.resize = function (w, h) { Wpx = w; Hpx = h; for (const p of people.values()) render(p); };
P.get = id => people.get(id);
P.count = () => people.size;
P.all = () => [...people.values()];

P.spawn = function (user) {
  if (!user || !user.id) return null;
  let p = people.get(user.id);
  if (p) { p.user = { ...p.user, ...user, avatar: user.avatar || p.user.avatar }; return p; }
  if (people.size >= MAX_PEOPLE) return null;
  p = { user, cls: pickClass(), x: 50, y: 107, slot: null, onPodium: false, leader: false, bubbleUntil: 0, el: null };
  p.el = document.createElement('div');
  p.el.className = 'dancer d-' + p.cls;
  p.el.innerHTML = makeEl(p).innerHTML;
  box.appendChild(p.el);
  people.set(user.id, p);
  render(p);
  const s = nearestFreeSlot(50 + rand(-20, 20), 84, p);
  requestAnimationFrame(() => requestAnimationFrame(() => {
    if (s) { takeSlot(p, s); render(p); }
    if (W.effects) W.effects.burstAt(p.x / 100, (p.y - 8) / 100, classById(p.cls).color, 14);
  }));
  return p;
};
P.setClass = function (p, clsId) {
  if (!p || p.cls === clsId) return;
  p.cls = clsId;
  p.el.className = 'dancer d-' + clsId + (p.onPodium ? ' onpodium' : '') + (p.leader ? ' leader' : '');
  p.el.querySelector('.figwrap').innerHTML = `<img class="chibi" src="${classById(clsId).img}" alt="">`;
  render(p);
};
P.toPodium = function (p) {
  if (!p || p.onPodium) return;
  freeSlot(p);
  p.onPodium = true; p.x = 50; p.y = 40;
  p.el.classList.add('onpodium');
  render(p);
};
P.offPodium = function (p) {
  if (!p || !p.onPodium) return;
  p.onPodium = false;
  p.el.classList.remove('onpodium', 'grand');
  const s = nearestFreeSlot(p.x + rand(-14, 14), 76, p);
  if (s) takeSlot(p, s);
  render(p);
};
P.setLeader = function (id) {
  for (const p of people.values()) {
    const on = p.user.id === id;
    if (on === p.leader) continue;
    p.leader = on;
    p.el.classList.toggle('leader', on);
    p.el.querySelectorAll('.crown').forEach(e => e.remove());
    if (on) {
      const c = document.createElement('div');
      c.className = 'crown'; c.textContent = '👑';
      p.el.appendChild(c);
    }
    render(p);
  }
};
P.sayBubble = function (p, text) {
  if (!p) return;
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
