/* Khuôn viên đám cưới: MỌI người xem đều có nhân vật đứng/đi lại ở khuôn viên (nửa dưới khung hình).
   - Chưa kết duyên: mặc đồ đời thường hài hước (áo thun quần đùi, pijama, Hawaii, ba lỗ, đồ bộ...), tự đi dạo qua lại.
   - Được tag ghép đôi: cả hai "lên đồ" — chú rể veston lịch lãm / cô dâu váy cưới lộng lẫy — nắm tay nhau
     đi lên sân khấu (hàng chờ nếu sân khấu đầy), hết giờ thì nắm tay nhau quay xuống khuôn viên đi dạo tiếp.
   Nhân vật là SVG vẽ chi tiết, chân tay có hoạt ảnh bước đi (CSS), di chuyển bằng vòng lặp rAF chung. */
(function () {
'use strict';
const W = (window.Wedding = window.Wedding || {});
const P = (W.people = {});
P.coupleSec = 25;
const MAX_PEOPLE = 110;
const COURT = { x1: 5, x2: 95, y1: 55, y2: 96 };       // vùng khuôn viên (% khung)
let courtY1 = 55;                                        // mép trên khuôn viên, chỉnh theo từng nền
const SPOTS = [{ x: 50 }, { x: 16 }, { x: 84 }];        // 3 vị trí cặp đôi trên sân khấu
let box = null, Wpx = 400, Hpx = 700, stageAnchor = 54;
let avoid = null;                                        // vùng cấm đứng theo nền (vd. đài phun nước)
const people = new Map();                                // user.id -> person
const couples = [];                                      // mọi cặp đôi đã ghép
const stageSlots = [null, null, null];
const stageQueue = [];
P.onCoupleStage = null;                                  // main.js: MC giới thiệu + cộng điểm
P.onQueueChange = null;

const rand = (a, b) => a + Math.random() * (b - a);
const hash = s => { let x = 0; for (const ch of String(s)) x = (x * 31 + ch.codePointAt(0)) >>> 0; return x; };
const SKINS = ['#ffe3c2', '#f7d3a5', '#f0c08e', '#e8b184', '#ffd9b8'];
const HAIRS = ['#2a1a10', '#3d2417', '#17100b', '#542f1a', '#6b4423'];

/* ================= Vẽ nhân vật ================= */
function face(seed, bride) {
  const skin = SKINS[seed % SKINS.length], hair = HAIRS[Math.floor(seed / 5) % HAIRS.length];
  const style = seed % 5;
  let hairSvg = '', hairBack = '';
  if (bride) {
    hairBack = `<rect x="14.5" y="24" width="11" height="40" rx="5.5" fill="${hair}"/><rect x="54.5" y="24" width="11" height="40" rx="5.5" fill="${hair}"/>`;
    hairSvg = `<path d="M22 31 a18 16 0 0 1 36 0 l0 -4 a18 14 0 0 0 -36 0Z" fill="${hair}"/>
      <path d="M31 12 l3 -6 3 6 3 -7 3 7 3 -6 3 6 q-9 3 -18 0Z" fill="#f5c542" stroke="#d9a41c" stroke-width="1"/>
      <circle cx="40" cy="9" r="2.2" fill="#ff5c8a"/><circle cx="33" cy="10.5" r="1.7" fill="#7ed6ff"/><circle cx="47" cy="10.5" r="1.7" fill="#7ed6ff"/>`;
  } else if (style === 0) {         // tóc ngắn gọn gàng
    hairSvg = `<path d="M22 31 a18 16 0 0 1 36 0 l0 -4 a18 14 0 0 0 -36 0Z" fill="${hair}"/>`;
  } else if (style === 1) {         // búi tóc
    hairSvg = `<path d="M22 31 a18 16 0 0 1 36 0 l0 -4 a18 14 0 0 0 -36 0Z" fill="${hair}"/><circle cx="40" cy="12" r="6.5" fill="${hair}"/>`;
  } else if (style === 2) {         // tóc dài
    hairSvg = `<path d="M20 34 a20 18 0 0 1 40 0 l2 22 q-5 3 -8 0 l-2 -18 a16 14 0 0 0 -24 0 l-2 18 q-3 3 -8 0Z" fill="${hair}"/><path d="M22 31 a18 16 0 0 1 36 0 q-18 -12 -36 0Z" fill="${hair}"/>`;
  } else if (style === 3) {         // đầu trọc hài hước
    hairSvg = `<ellipse cx="33" cy="17" rx="4.5" ry="2.6" fill="#ffffff" opacity=".5" transform="rotate(-18 33 17)"/>`;
  } else {                          // tóc dựng
    hairSvg = `<path d="M24 26 l3 -10 4 7 3 -11 4 8 3 -10 4 7 3 -8 2 17 a18 15 0 0 0 -36 0Z" fill="${hair}"/>`;
  }
  const lashes = bride ? `<path d="M27 30 l-3 -2 M53 30 l3 -2" stroke="#333" stroke-width="1.6" stroke-linecap="round"/>` : '';
  return `
    <rect x="35" y="42" width="10" height="10" rx="4" fill="${skin}"/>
    <ellipse cx="21.5" cy="31" rx="3.4" ry="4.6" fill="${skin}"/>
    <ellipse cx="58.5" cy="31" rx="3.4" ry="4.6" fill="${skin}"/>
    ${hairBack}
    <circle cx="40" cy="30" r="17.5" fill="${skin}"/>
    ${hairSvg}
    ${lashes}
    <ellipse cx="31.5" cy="30.5" rx="3.4" ry="4.4" fill="#fff"/>
    <ellipse cx="48.5" cy="30.5" rx="3.4" ry="4.4" fill="#fff"/>
    <circle cx="32" cy="31.5" r="2.3" fill="#2b1a12"/><circle cx="48" cy="31.5" r="2.3" fill="#2b1a12"/>
    <circle cx="32.8" cy="30.6" r="0.85" fill="#fff"/><circle cx="48.8" cy="30.6" r="0.85" fill="#fff"/>
    <path d="M28 24.5 q4 -2.6 8 -1 M44 23.5 q4 -1.6 8 1" stroke="#5a3a22" stroke-width="1.7" fill="none" stroke-linecap="round"/>
    <path d="M40 34 q-1.6 3 0.6 4.4" stroke="#d89a68" stroke-width="1.5" fill="none" stroke-linecap="round"/>
    <path d="M33 42.5 q7 6 14 0" stroke="#b03a5b" stroke-width="2.1" fill="none" stroke-linecap="round"/>
    <path d="M34.5 43.8 q5.5 3.4 11 0" stroke="#e88ca0" stroke-width="1.2" fill="none" stroke-linecap="round"/>
    <circle cx="26.5" cy="38" r="3.4" fill="#ff9db4" opacity=".65"/>
    <circle cx="53.5" cy="38" r="3.4" fill="#ff9db4" opacity=".65"/>`;
}
function arms(color, skin, opts = {}) {
  const aL = opts.holdR ? 'rotate(38 27 56)' : '', aR = opts.holdL ? 'rotate(-38 53 56)' : '';
  return `<g class="arm armL" ${aL ? `transform="${aL}"` : ''}><rect x="21.5" y="54" width="8.6" height="27" rx="4.3" fill="${color}"/><circle cx="25.8" cy="82" r="4.4" fill="${skin}"/></g>
    <g class="arm armR" ${aR ? `transform="${aR}"` : ''}><rect x="49.9" y="54" width="8.6" height="27" rx="4.3" fill="${color}"/><circle cx="54.2" cy="82" r="4.4" fill="${skin}"/></g>`;
}
function legsPants(pants, shoes, skin, shorts) {
  const len = shorts ? 15 : 30;
  const skinPart = shorts ? `<rect x="29.5" y="${88 + len}" width="7.6" height="13" rx="3.4" fill="${skin}"/><rect x="42.9" y="${88 + len}" width="7.6" height="13" rx="3.4" fill="${skin}"/>` : '';
  return `<g class="leg legL"><rect x="29" y="86" width="8.6" height="${len}" rx="3.6" fill="${pants}"/>${shorts ? '' : ''}<ellipse cx="33" cy="${88 + len + (shorts ? 14 : 2)}" rx="5.6" ry="3.2" fill="${shoes}"/></g>
    <g class="leg legR"><rect x="42.4" y="86" width="8.6" height="${len}" rx="3.6" fill="${pants}"/><ellipse cx="47" cy="${88 + len + (shorts ? 14 : 2)}" rx="5.6" ry="3.2" fill="${shoes}"/></g>
    ${skinPart}`;
}
/* Đồ đời thường hài hước cho khách chưa kết duyên */
const CASUAL = [
  (s, skin) => ({ torso: `<path d="M24 54 q16 -7 32 0 l3 36 q-19 6 -38 0Z" fill="${['#ff8a5c', '#5cc8ff', '#ffd93c', '#9be15d', '#ff7eb0'][s % 5]}"/><path d="M24 54 q16 -7 32 0 l1 9 q-17 -6 -34 0Z" fill="#ffffff" opacity=".35"/>`, legs: legsPants('#3a6ea8', '#8a5a2b', skin, true), armC: ['#ff8a5c', '#5cc8ff', '#ffd93c', '#9be15d', '#ff7eb0'][s % 5] }),   // áo thun + quần đùi + dép
  (s, skin) => ({ torso: `<path d="M24 54 q16 -7 32 0 l3 38 q-19 6 -38 0Z" fill="#a8c8ff"/><circle cx="33" cy="66" r="2.6" fill="#fff"/><circle cx="46" cy="74" r="2.6" fill="#fff"/><circle cx="36" cy="82" r="2.6" fill="#fff"/><circle cx="48" cy="60" r="2.2" fill="#fff"/>`, legs: legsPants('#a8c8ff', '#ffb7cd', skin, false), armC: '#a8c8ff' }),   // pijama chấm bi
  (s, skin) => ({ torso: `<path d="M24 54 q16 -7 32 0 l3 36 q-19 6 -38 0Z" fill="#2fb37c"/><circle cx="33" cy="68" r="3.6" fill="#ff7eb0"/><circle cx="46" cy="78" r="3.2" fill="#ffd93c"/><circle cx="44" cy="62" r="2.6" fill="#ff8a5c"/><circle cx="32" cy="80" r="2.6" fill="#fff"/>`, legs: legsPants('#f2f2f2', '#8a5a2b', skin, true), armC: '#2fb37c', extra: `<g><rect x="24" y="26" width="13" height="7.5" rx="3.4" fill="#222"/><rect x="43" y="26" width="13" height="7.5" rx="3.4" fill="#222"/><rect x="36" y="28.5" width="8" height="2.4" fill="#222"/></g>` }),   // Hawaii + kính râm
  (s, skin) => ({ torso: `<path d="M27 54 q13 -6 26 0 l2 34 q-15 5 -30 0Z" fill="#f5f5f5"/><rect x="27" y="54" width="26" height="7" fill="#e8e8e8"/>`, legs: legsPants('#4a4a55', '#333', skin, false), armC: skin, extra: `<path d="M23 22 a17 13 0 0 1 34 0 l-4 0 a13 9 0 0 0 -26 0Z" fill="#e53935" transform="rotate(180 40 22)"/><rect x="20" y="20.5" width="40" height="4" rx="2" fill="#e53935"/>` }),   // ba lỗ + mũ ngược
  (s, skin) => ({ torso: `<path d="M24 54 q16 -7 32 0 l9 52 q-25 7 -50 0Z" fill="${['#ff9db4', '#c3a6ff', '#ffb35c'][s % 3]}"/><circle cx="34" cy="70" r="2.8" fill="#fff" opacity=".8"/><circle cx="46" cy="84" r="2.8" fill="#fff" opacity=".8"/><circle cx="38" cy="96" r="2.8" fill="#fff" opacity=".8"/>`, legs: `<ellipse class="leg legL" cx="33" cy="118" rx="5.6" ry="3.2" fill="#c2185b"/><ellipse class="leg legR" cx="47" cy="118" rx="5.6" ry="3.2" fill="#c2185b"/>`, armC: ['#ff9db4', '#c3a6ff', '#ffb35c'][s % 3] }),   // váy hoa ở nhà
  (s, skin) => ({ torso: `<path d="M24 54 q16 -7 32 0 l3 36 q-19 6 -38 0Z" fill="#37474f"/><rect x="38.6" y="56" width="2.8" height="32" fill="#ffd93c"/>`, legs: legsPants('#263238', '#ffffff', skin, false), armC: '#37474f', extra: `<g><rect x="52" y="66" width="9" height="13" rx="2.5" fill="#fff" stroke="#d8a24a" stroke-width="1.6"/><rect x="55.5" y="60" width="2.2" height="7" rx="1" fill="#8a5a2b"/><circle cx="56.5" cy="72" r="3" fill="#b5772f"/></g>` }),   // đồ thể thao + trà sữa
];
function figureSVG(p) {
  const seed = hash(p.user.id || p.user.nickname);
  const skin = SKINS[seed % SKINS.length];
  if (p.outfit === 'groom') {
    return `<svg viewBox="0 0 80 122">
      ${arms('#23263d', skin)}
      ${legsPants('#23263d', '#14100c', skin, false)}
      <path d="M23 53 q17 -8 34 0 l3 38 q-20 7 -40 0Z" fill="#23263d"/>
      <path d="M40 55 L31 92 L40 96 L49 92Z" fill="#fbf8f2"/>
      <path d="M31 55 L40 68 L29 78 Z M49 55 L40 68 L51 78 Z" fill="#31365a"/>
      <path d="M35 63 l5 4 5 -4 -1.6 6 h-6.8Z" fill="#c2185b"/>
      <circle cx="50.5" cy="72" r="3.1" fill="#ff5c8a"/><circle cx="50.5" cy="72" r="1.3" fill="#ffd93c"/>
      ${face(seed, false)}
    </svg>`;
  }
  if (p.outfit === 'bride') {
    return `<svg viewBox="0 0 80 122">
      <path d="M14 26 a26 30 0 0 1 52 0 l4 44 q-30 10 -60 0Z" fill="#ffffff" opacity=".45"/>
      ${arms('#ffffff', skin)}
      <path d="M40 50 C28 74 16 96 10 118 q30 8 60 0 C64 96 52 74 40 50Z" fill="#fffdfd"/>
      <path d="M40 56 C31 76 23 96 18 114 q22 6 44 0 C57 96 49 76 40 56Z" fill="#ffffff"/>
      <path d="M40 64 C34 80 29 96 26 110 q14 4 28 0 C51 96 46 80 40 64Z" fill="#fdf3f6"/>
      <path d="M13 112 q4 -5 8 0 q4 -5 8 0 q4 -5 8 0 q4 -5 8 0 q4 -5 8 0 q4 -5 8 0" stroke="#f3c6d8" stroke-width="2" fill="none"/>
      <circle cx="30" cy="88" r="1.7" fill="#ffd76a"/><circle cx="47" cy="98" r="1.7" fill="#ffd76a"/><circle cx="40" cy="80" r="1.7" fill="#ffd76a"/><circle cx="52" cy="86" r="1.5" fill="#ffd76a"/>
      <path d="M28 50 q12 -6 24 0 l2 13 q-14 5 -28 0Z" fill="#ffffff"/>
      <path d="M28 50 q12 -6 24 0 q-12 7 -24 0Z" fill="#fdeef4"/>
      <path d="M36 47 q4 3 8 0 l-1 5 h-6Z" fill="#ffd76a"/>
      <g transform="translate(58 84)"><circle r="6.4" fill="#ff5c8a"/><circle cx="-6" cy="3.4" r="5" fill="#ffb7cd"/><circle cx="6" cy="3.4" r="5" fill="#e75480"/><circle cy="-4.6" r="4.8" fill="#ffd6e3"/><path d="M-2 6 q-4 8 -8 10 M3 7 q1 9 -2 13" stroke="#3e9e4f" stroke-width="2.2" fill="none"/></g>
      <ellipse class="leg legL" cx="33" cy="119" rx="5.4" ry="3" fill="#e8b4c8"/>
      <ellipse class="leg legR" cx="47" cy="119" rx="5.4" ry="3" fill="#e8b4c8"/>
      ${face(seed, true)}
    </svg>`;
  }
  const c = CASUAL[seed % CASUAL.length](seed, skin);
  return `<svg viewBox="0 0 80 122">
    ${arms(c.armC, skin)}
    ${c.legs}
    ${c.torso}
    ${face(seed, false)}
    ${c.extra || ''}
  </svg>`;
}

/* ================= Nhân vật, ghế ngồi & di chuyển ================= */
function esc(s) { return String(s).replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch])); }
function makePersonEl(p) {
  const el = document.createElement('div');
  el.className = 'person';
  const hue = hash(p.user.id) % 360;
  const av = p.user.avatar
    ? `<span class="av"><img src="${esc(p.user.avatar)}" referrerpolicy="no-referrer" alt=""></span>`
    : `<span class="av" style="background:hsl(${hue},55%,48%)">${esc((Array.from(String(p.user.nickname || '?').trim())[0] || '?').toUpperCase())}</span>`;
  el.innerHTML = `<div class="figwrap"></div><div class="chip">${av}<span class="nm">${esc(p.user.nickname)}</span></div>`;
  el.querySelector('.figwrap').innerHTML = figHTML(p);
  return el;
}

/* Ghế quanh bàn tiệc: khách vào phòng được xếp ghế, ngồi/đứng tại bàn của mình.
   Cặp đôi rời ghế, đi dọc thảm đỏ lên sân khấu, xong quay về hai ghế cạnh nhau. */
let seats = [];                 // {x, y, by}
let carpetTop = 44;             // % y nơi thảm đỏ chạm sân khấu
const SEAT_OFFS = [[-8.5, 2.5], [8.5, 2.5], [-6.5, 7.5], [6.5, 7.5], [0, 9.5], [-11, 6], [11, 6]];
function buildSeats(tables) {
  seats = [];
  for (const t of tables || []) for (const [dx, dy] of SEAT_OFFS) {
    seats.push({ x: Math.max(3, Math.min(97, t.x + dx)), y: Math.max(42, Math.min(97.5, t.y + dy)), by: null });
  }
  // ghế của người đang ngồi giữ nguyên theo chỉ số gần nhất khi đổi nền: gán lại theo vị trí
  for (const p of people.values()) {
    if (p.seat) {
      let best = null, bd = 1e9;
      for (const s of seats) { if (s.by) continue; const d = Math.hypot(s.x - p.x, s.y - p.y); if (d < bd) { bd = d; best = s; } }
      if (best) { best.by = p; p.seat = best; }
    }
  }
}
function freeSeat(p) { if (p && p.seat) { p.seat.by = null; p.seat = null; } }
function takeSeat(p, seat) { freeSeat(p); seat.by = p; p.seat = seat; }
function nearestFreeSeat(x, y, excl) {
  let best = null, bd = 1e9;
  for (const s of seats) { if (s.by && s.by !== excl) continue; const d = Math.hypot(s.x - x, s.y - y); if (d < bd) { bd = d; best = s; } }
  return best;
}
function scaleFor(p) {
  if (p.state === 'stage' || p.state === 'toStage') return p.spotScale || 1.12;
  return 0.5 + Math.max(0, (p.y - 42)) / (97 - 42) * 0.52;
}
function render(p) {
  const s = scaleFor(p), fh = Hpx * 0.15 * s;
  p.el.style.setProperty('--fh', fh + 'px');
  p.el.style.transform = `translate(${p.x / 100 * Wpx}px, ${p.y / 100 * Hpx}px) translate(-50%,-100%)`;
  p.el.style.zIndex = String(p.state === 'stage' ? 600 + Math.round(p.y) : Math.round(p.y * 10));
  p.el.classList.toggle('walking', !!p.target);
  p.el.classList.toggle('flip', p.faceLeft);
}
function walkTo(p, target, state, done) {
  p.path = [target]; p.state = state || 'walk'; p.done = done || null;
  p.target = p.path[0];
  p.faceLeft = target.x < p.x;
}
function walkPath(p, points, state, done) {
  p.path = points.slice(); p.state = state || 'walk'; p.done = done || null;
  p.target = p.path[0];
  if (p.target) p.faceLeft = p.target.x < p.x;
}
function stepPerson(p, dt) {
  if (!p.target) return;
  const dx = p.target.x - p.x, dy = p.target.y - p.y;
  const dist = Math.hypot(dx, dy);
  const speed = 10.5;
  if (dist < 0.5) {
    p.x = p.target.x; p.y = p.target.y;
    p.path.shift();
    if (p.path.length) { p.target = p.path[0]; return; }
    p.target = null;
    const done = p.done; p.done = null;
    if (p.state !== 'stage') { p.state = p.seat ? 'seat' : 'idle'; }
    p.idleFor = rand(4, 11);
    if (done) done();
    return;
  }
  const step = Math.min(dist, speed * dt);
  p.x += dx / dist * step; p.y += dy / dist * step;
  p.faceLeft = dx < -0.2 ? true : dx > 0.2 ? false : p.faceLeft;
}
let lastT = 0;
function loop(t) {
  requestAnimationFrame(loop);
  const dt = Math.min(0.05, lastT ? (t - lastT) / 1000 : 0.016); lastT = t;
  for (const p of people.values()) {
    if (p.target) stepPerson(p, dt);
    else if (p.state === 'seat') {
      p.idleFor -= dt;
      if (p.idleFor <= 0) {
        p.idleFor = rand(5, 13);
        // thỉnh thoảng đổi ghế / ra đứng gần thảm đỏ ngắm sân khấu cho sinh động
        if (!p.couple && Math.random() < 0.16) {
          const s = nearestFreeSeat(p.x + rand(-18, 18), p.y + rand(-8, 8), p);
          if (s && s !== p.seat) { takeSeat(p, s); walkTo(p, { x: s.x, y: s.y }, 'walk'); }
        }
      }
    }
    render(p);
  }
}

P.init = function (container) { box = container; requestAnimationFrame(loop); };
P.resize = function (w, h) { Wpx = w; Hpx = h; };
P.setAnchor = function (y) { stageAnchor = y; };
P.setLayout = function (layout) {
  if (!layout) return;
  if (layout.tables) buildSeats(layout.tables);
  if (layout.carpetTop) carpetTop = layout.carpetTop;
};
P.get = id => people.get(id);
P.count = () => people.size;

P.spawn = function (user) {
  if (!user || !user.id) return null;
  let p = people.get(user.id);
  if (p) { p.user = { ...p.user, ...user, avatar: user.avatar || p.user.avatar }; return p; }
  if (people.size >= MAX_PEOPLE) return null;
  const seed = hash(user.id || user.nickname);
  p = { user, outfit: 'casual', x: 50 + rand(-3, 3), y: 101,
    state: 'idle', target: null, path: [], done: null, idleFor: rand(3, 9), faceLeft: false, couple: null, seat: null, el: null };
  p.el = makePersonEl(p);
  box.appendChild(p.el);
  render(p);
  const s = nearestFreeSeat(50, 95, p) || nearestFreeSeat(p.x, p.y, p);
  if (s) { takeSeat(p, s); walkTo(p, { x: s.x, y: s.y }, 'walk'); }
  people.set(user.id, p);
  return p;
};

/* ================= Ghép đôi & sân khấu ================= */
const CHIBI = { bride: 'img/bride.png', groom: 'img/groom.png', girl: 'img/guest-girl.png', boy: 'img/guest-boy.png' };
function figHTML(p) {
  const seed = hash(p.user.id || p.user.nickname);
  const file = p.outfit === 'bride' ? CHIBI.bride : p.outfit === 'groom' ? CHIBI.groom
    : (seed % 2 ? CHIBI.girl : CHIBI.boy);
  return `<img class="chibi" src="${file}" alt="">`;
}
function setOutfit(p, outfit) {
  p.outfit = outfit;
  p.el.querySelector('.figwrap').innerHTML = figHTML(p);
  p.el.classList.toggle('wedding', outfit !== 'casual');
}
function notifyQueue() { if (P.onQueueChange) P.onQueueChange(stageQueue.map(c => `${c.a.user.nickname} ❤ ${c.b.user.nickname}`)); }
function carpetPoints(px, side) {
  // điểm tập kết ở cuối thảm đỏ rồi đi thẳng lên sân khấu
  return [{ x: 50 + side * 7.5, y: 90 }, { x: 50 + side * 7.5, y: carpetTop + 6 }];
}
function promoteStage() {
  for (let i = 0; i < SPOTS.length && stageQueue.length; i++) {
    if (stageSlots[i]) continue;
    const c = stageQueue.shift();
    c.state = 'toStage'; c.spot = i;
    stageSlots[i] = c;
    c.a.spotScale = c.b.spotScale = i === 0 ? 1.12 : 0.82;   // cặp hai bên nhỏ hơn để không chen cặp tâm điểm
    const y = stageAnchor + (i ? 1.4 : 0);
    const off = i === 0 ? 10.5 : 8.5;   // ảnh chibi bè ngang — phải đứng cách xa nhau kẻo che mất nhau
    // chú rể đứng hơi thấp hơn (phía trước) để không bị váy cô dâu che khuất
    const yA = y + (c.a.outfit === 'groom' ? 1.3 : 0);
    const yB = y + (c.b.outfit === 'groom' ? 1.3 : 0);
    walkPath(c.a, [...carpetPoints(c.a.x, -1), { x: SPOTS[i].x - off, y: yA }], 'toStage');
    walkPath(c.b, [...carpetPoints(c.b.x, 1), { x: SPOTS[i].x + off, y: yB }], 'toStage', () => arriveStage(c));
    notifyQueue();
  }
}
function arriveStage(c) {
  if (c.state !== 'toStage') return;
  c.state = 'stage';
  c.a.state = 'stage'; c.b.state = 'stage';
  c.a.el.classList.add('paired'); c.b.el.classList.add('paired');
  if (W.effects) W.effects.hearts(12, SPOTS[c.spot].x / 100, 0.42);
  if (W.audio) W.audio.cheer();
  if (P.onCoupleStage) P.onCoupleStage(c);
  c.timer = setTimeout(() => leaveStage(c), P.coupleSec * 1000);
  c.heartTimer = setInterval(() => {
    if (W.effects && c.state === 'stage') W.effects.hearts(3, SPOTS[c.spot].x / 100, 0.4);
  }, 4000);
}
function leaveStage(c) {
  clearTimeout(c.timer); clearInterval(c.heartTimer);
  if (c.spot >= 0 && stageSlots[c.spot] === c) stageSlots[c.spot] = null;
  c.spot = -1; c.state = 'court';
  c.a.spotScale = c.b.spotScale = null;
  c.a.el.classList.remove('paired'); c.b.el.classList.remove('paired');
  // về hai ghế cạnh nhau (cùng một bàn nếu còn trống)
  let sa = nearestFreeSeat(30, 80, c.a), sb = null;
  if (sa) sb = nearestFreeSeat(sa.x, sa.y, c.b);
  if (!sb) sb = nearestFreeSeat(70, 80, c.b);
  const goBack = (p, s, side) => {
    if (s) takeSeat(p, s);
    const pts = [{ x: 50 + side * 7.5, y: 90 }];
    if (s) pts.push({ x: s.x, y: s.y });
    walkPath(p, pts, 'walk');
  };
  goBack(c.a, sa, -1);
  goBack(c.b, sb, 1);
  promoteStage();
}
P.makeCouple = function (userA, userB) {
  const a = P.spawn(userA), b = P.spawn(userB);
  if (!a || !b || a === b) return null;
  if (a.couple && a.couple !== b.couple) return null;
  if (b.couple && b.couple !== a.couple) return null;
  if (a.couple) return a.couple;
  const swap = (hash(a.user.id) + hash(b.user.id)) % 2 === 0;
  freeSeat(a); freeSeat(b);
  setOutfit(a, swap ? 'groom' : 'bride');
  setOutfit(b, swap ? 'bride' : 'groom');
  const c = { key: [a.user.id, b.user.id].sort().join('|'), a, b, state: 'queue', spot: -1, timer: 0, heartTimer: 0 };
  a.couple = c; b.couple = c;
  couples.push(c);
  // hai người ra cuối thảm đỏ gặp nhau trước
  walkPath(a, [{ x: 42, y: 90 }], 'walk');
  walkPath(b, [{ x: 58, y: 90 }], 'walk');
  stageQueue.push(c);
  notifyQueue();
  setTimeout(promoteStage, 1400);
  return c;
};
P.featured = () => stageSlots[0];
P.coupleOf = function (uid) { const p = people.get(uid); return p ? p.couple : null; };
P.danceAll = function (sec = 5) {
  for (const p of people.values()) { p.el.classList.add('dance'); setTimeout(() => p.el.classList.remove('dance'), sec * 1000); }
};
P.setCrown = function (couple) {
  document.querySelectorAll('.person .crown').forEach(e => e.remove());
  if (!couple) return;
  for (const p of [couple.a, couple.b]) {
    const crown = document.createElement('div');
    crown.className = 'crown'; crown.textContent = '👑';
    p.el.prepend(crown);
  }
};
P.removeUser = function (uid) {
  const p = people.get(uid);
  if (!p) return;
  freeSeat(p);
  if (p.couple) {
    const c = p.couple;
    if (c.state === 'stage' || c.state === 'toStage') leaveStage(c);
    const i = stageQueue.indexOf(c); if (i >= 0) stageQueue.splice(i, 1);
    const other = c.a === p ? c.b : c.a;
    if (other) { other.couple = null; setOutfit(other, 'casual'); }
    const ci = couples.indexOf(c); if (ci >= 0) couples.splice(ci, 1);
    notifyQueue();
  }
  p.el.remove();
  people.delete(uid);
};
})();
