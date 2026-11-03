/* Sân khấu đám cưới: cặp đôi (2 nhân vật vẽ SVG) lên sân khấu theo hàng chờ,
   đứng ở 1 trong 3 vị trí (giữa = cặp đôi tâm điểm), hết giờ thì xuống ngồi bàn tiệc phía dưới. */
(function () {
'use strict';
const W = (window.Wedding = window.Wedding || {});
const S = (W.stage = {});
let box = null, anchorY = 87, H = 800;
S.coupleSec = 22;
const SPOTS = [{ x: 50, s: 1 }, { x: 25, s: 0.8 }, { x: 75, s: 0.8 }];
const onStage = [null, null, null];
const queue = [];
const guests = [];        // cặp đôi đã xuống bàn tiệc (tối đa 10)
let guestIdx = 0;
S.onQueueChange = null;   // main.js gán: (tên các cặp đang chờ) => {}
S.onFeaturedChange = null;

const hash = s => { let x = 0; for (const ch of String(s)) x = (x * 31 + ch.codePointAt(0)) >>> 0; return x; };
const SUITS = ['#2e3350', '#4a2c3a', '#274036', '#513b75', '#6e243a', '#31435f'];
const DRESSES = ['#ffffff', '#fff3f6', '#fdf6ec', '#fdeef4', '#f3f0ff'];
const SKINS = ['#ffe2c4', '#f5cfa8', '#eec39b', '#e8b48c'];
const HAIRS = ['#241812', '#3a2417', '#15100c', '#4c2e1c'];

function figure(groom, seed) {
  const suit = SUITS[seed % SUITS.length], dress = DRESSES[seed % DRESSES.length];
  const skin = SKINS[seed % SKINS.length], hair = HAIRS[Math.floor(seed / 3) % HAIRS.length];
  if (groom) return `<svg viewBox="0 0 60 120" style="height:100%">
    <path d="M14 120 L17 66 L43 66 L46 120 Z" fill="#26262e"/>
    <path d="M10 118 L30 58 L50 118 L44 120 L30 74 L16 120 Z" fill="${suit}"/>
    <path d="M30 58 L24 120 L36 120 Z" fill="#f8f5ef"/>
    <path d="M30 62 L27 70 L30 84 L33 70 Z" fill="#c2185b"/>
    <path d="M22 60 L30 70 L20 76 Z M38 60 L30 70 L40 76 Z" fill="#e75480"/>
    <rect x="25" y="42" width="10" height="12" rx="4" fill="${skin}"/>
    <circle cx="30" cy="32" r="15" fill="${skin}"/>
    <path d="M15 30 a15 14 0 0 1 30 0 l0 -5 a15 12 0 0 0 -30 0 Z" fill="${hair}"/>
    <path d="M23 33 q3.5 3 7 0 M30 33 q3.5 3 7 0" stroke="#4a2c14" stroke-width="1.6" fill="none" stroke-linecap="round" transform="translate(-4 0)"/>
    <path d="M25 43 q5 4 10 0" stroke="#a5523a" stroke-width="1.8" fill="none" stroke-linecap="round"/>
    <circle cx="21" cy="39" r="2.6" fill="#ff9db4" opacity=".55"/><circle cx="39" cy="39" r="2.6" fill="#ff9db4" opacity=".55"/>
  </svg>`;
  return `<svg viewBox="0 0 60 120" style="height:100%">
    <path d="M30 52 C16 78 8 100 4 120 L56 120 C52 100 44 78 30 52 Z" fill="${dress}"/>
    <path d="M30 52 C22 76 16 98 13 120 L47 120 C44 98 38 76 30 52 Z" fill="#ffffff" opacity=".55"/>
    <path d="M21 44 L39 44 L37 60 L23 60 Z" fill="${dress}"/>
    <rect x="25" y="42" width="10" height="10" rx="4" fill="${skin}"/>
    <circle cx="30" cy="31" r="14.5" fill="${skin}"/>
    <path d="M15.5 30 a14.5 13.5 0 0 1 29 0 l0 -4 a14.5 12 0 0 0 -29 0 Z" fill="${hair}"/>
    <path d="M16 26 a15 16 0 0 1 28 0 l3 -8 a17 10 0 0 0 -34 0 Z" fill="#ffffff" opacity=".75"/>
    <circle cx="30" cy="12" r="3" fill="#ffd76a"/><circle cx="22" cy="15" r="2" fill="#ffd76a"/><circle cx="38" cy="15" r="2" fill="#ffd76a"/>
    <path d="M23 32 q3.5 3 7 0 M30 32 q3.5 3 7 0" stroke="#4a2c14" stroke-width="1.6" fill="none" stroke-linecap="round" transform="translate(-4 0)"/>
    <path d="M25 42 q5 4 10 0" stroke="#b03a5b" stroke-width="1.8" fill="none" stroke-linecap="round"/>
    <circle cx="21" cy="38" r="2.6" fill="#ff9db4" opacity=".7"/><circle cx="39" cy="38" r="2.6" fill="#ff9db4" opacity=".7"/>
    <g transform="translate(47 74)"><circle r="6" fill="#ff8fab"/><circle cx="-5" cy="3" r="4.6" fill="#ffb7cd"/><circle cx="5" cy="3" r="4.6" fill="#e75480"/><circle cy="-4" r="4.4" fill="#ffd6e3"/></g>
  </svg>`;
}
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const initial = n => (Array.from(String(n || '?').trim())[0] || '?').toUpperCase();
function chip(user, gold) {
  const hue = hash(user.id || user.nickname) % 360;
  const av = user.avatar
    ? `<span class="av"><img src="${esc(user.avatar)}" referrerpolicy="no-referrer" alt=""></span>`
    : `<span class="av" style="background:hsl(${hue},55%,48%)">${esc(initial(user.nickname))}</span>`;
  return `<span class="chip${gold ? ' gold' : ''}">${av}${esc(user.nickname)}</span>`;
}

function makeEl(c) {
  const el = document.createElement('div');
  el.className = 'couple';
  const seedA = hash(c.a.id || c.a.nickname), seedB = hash(c.b.id || c.b.nickname);
  const swap = (seedA + seedB) % 2 === 0;   // ngẫu nhiên (theo tên) ai mặc vest / váy cho vui
  el.innerHTML = `<div class="pair">
      <div class="fig f1">${figure(swap, seedA)}</div>
      <div class="heartlink">💞</div>
      <div class="fig f2">${figure(!swap, seedB)}</div>
    </div>
    <div class="names">${chip(c.a)}${chip(c.b)}</div>`;
  return el;
}
function place(el, x, feetY, s, fh) {
  el.style.left = x + '%';
  el.style.top = feetY + '%';
  el.style.setProperty('--fh', Math.round(fh * s) + 'px');
  el.querySelectorAll('.fig').forEach(f => { f.style.height = Math.round(fh * s) + 'px'; });
}
function notifyQueue() { if (S.onQueueChange) S.onQueueChange(queue.map(c => `${c.a.nickname} ❤ ${c.b.nickname}`)); }
function notifyFeatured() { if (S.onFeaturedChange) S.onFeaturedChange(onStage[0]); }

S.init = function (container) { box = container; };
S.resize = function (heightPx) { H = heightPx; };
S.setAnchor = function (y) {
  anchorY = y;
  onStage.forEach((c, i) => { if (c) place(c.el, SPOTS[i].x, anchorY + (i ? 1.4 : 0), SPOTS[i].s, H * 0.27); });
  guests.forEach((c, i) => place(c.el, c.gx, Math.min(97.5, anchorY + c.gy), 0.46, H * 0.27));
};

S.addCouple = function (a, b, opts = {}) {
  const key = [a.id, b.id].sort().join('|');
  const dup = [...onStage, ...queue].some(c => c && c.key === key);
  if (dup) return null;
  const c = { key, a, b, score: 0, el: null, spot: -1, timer: 0, onStageAt: 0 };
  c.el = makeEl(c);
  box.appendChild(c.el);
  const fromLeft = (hash(key) % 2) === 0;
  place(c.el, fromLeft ? -14 : 114, anchorY + 2, 0.9, H * 0.27);
  queue.push(c);
  notifyQueue();
  promote();
  return c;
};
function promote() {
  for (let i = 0; i < SPOTS.length && queue.length; i++) {
    if (onStage[i]) continue;
    const c = queue.shift();
    c.spot = i; c.onStageAt = Date.now();
    onStage[i] = c;
    // chạy vào vị trí (transition CSS lo phần chuyển động)
    requestAnimationFrame(() => requestAnimationFrame(() => place(c.el, SPOTS[i].x, anchorY + (i ? 1.4 : 0), SPOTS[i].s, H * 0.27)));
    c.timer = setTimeout(() => leaveStage(c), S.coupleSec * 1000);
    if (W.effects) { W.effects.hearts(8, SPOTS[i].x / 100, 0.6); }
    if (W.audio) W.audio.cheer();
    notifyQueue();
    if (i === 0) notifyFeatured();
    if (S.onArrive) S.onArrive(c, i);
  }
}
function leaveStage(c) {
  const i = c.spot;
  if (i >= 0 && onStage[i] === c) { onStage[i] = null; if (i === 0) notifyFeatured(); }
  c.spot = -1;
  if (guests.length >= 10) {
    const old = guests.shift();
    if (old) { old.el.classList.add('leaving'); setTimeout(() => old.el.remove(), 1300); }
  }
  const gi = guestIdx++;
  c.gx = 11 + (gi % 5) * 19.5;
  c.gy = 8.5 + Math.floor((gi % 10) / 5) * 5.5;
  c.el.classList.add('guest');
  guests.push(c);
  place(c.el, c.gx, Math.min(97.5, anchorY + c.gy), 0.46, H * 0.27);
  promote();
}
S.featured = () => onStage[0];
S.byUser = function (uid) {
  return [...onStage, ...queue, ...guests].find(c => c && (c.a.id === uid || c.b.id === uid)) || null;
};
S.dance = function (sec = 6) {
  for (const c of onStage) if (c) { c.el.classList.add('dance'); setTimeout(() => c.el.classList.remove('dance'), sec * 1000); }
};
S.setCrown = function (c) {
  document.querySelectorAll('.couple .crown').forEach(e => e.remove());
  document.querySelectorAll('.couple .chip.gold').forEach(e => e.classList.remove('gold'));
  if (!c || !c.el) return;
  const crown = document.createElement('div');
  crown.className = 'crown'; crown.textContent = '👑';
  c.el.prepend(crown);
  c.el.querySelectorAll('.chip').forEach(e => e.classList.add('gold'));
};
S.counts = () => ({ stage: onStage.filter(Boolean).length, queue: queue.length, guests: guests.length });
})();
