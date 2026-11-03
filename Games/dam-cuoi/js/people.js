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
const SPOTS = [{ x: 50 }, { x: 24 }, { x: 76 }];        // 3 vị trí cặp đôi trên sân khấu
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

/* ================= Nhân vật & di chuyển ================= */
function esc(s) { return String(s).replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch])); }
function makePersonEl(p) {
  const el = document.createElement('div');
  el.className = 'person';
  const hue = hash(p.user.id) % 360;
  const av = p.user.avatar
    ? `<span class="av"><img src="${esc(p.user.avatar)}" referrerpolicy="no-referrer" alt=""></span>`
    : `<span class="av" style="background:hsl(${hue},55%,48%)">${esc((Array.from(String(p.user.nickname || '?').trim())[0] || '?').toUpperCase())}</span>`;
  el.innerHTML = `<div class="figwrap"></div><div class="chip">${av}<span class="nm">${esc(p.user.nickname)}</span></div>`;
  el.querySelector('.figwrap').innerHTML = figureSVG(p);
  return el;
}
function courtPoint() {
  for (let i = 0; i < 8; i++) {
    const x = rand(COURT.x1, COURT.x2), y = rand(courtY1, COURT.y2);
    if (avoid && x > avoid.x1 && x < avoid.x2 && y > avoid.y1 && y < avoid.y2) continue;
    return { x, y };
  }
  return { x: rand(COURT.x1, COURT.x2), y: rand(courtY1 + 22, COURT.y2) };
}
function scaleFor(p) {
  if (p.state === 'stage' || p.state === 'toStage') return 0.92;
  return 0.55 + Math.max(0, (p.y - courtY1)) / (COURT.y2 - courtY1) * 0.45;
}
function render(p) {
  const s = scaleFor(p), fh = Hpx * 0.155 * s;
  p.el.style.setProperty('--fh', fh + 'px');
  p.el.style.transform = `translate(${p.x / 100 * Wpx}px, ${p.y / 100 * Hpx}px) translate(-50%,-100%)`;
  p.el.style.zIndex = String(p.state === 'stage' ? 600 + Math.round(p.y) : Math.round(p.y * 10));
  p.el.classList.toggle('walking', p.state === 'walk' || p.state === 'toStage' || p.state === 'toCourt');
  p.el.classList.toggle('flip', p.faceLeft);
}
function walkTo(p, target, state, done) {
  p.target = target; p.state = state || 'walk'; p.done = done || null;
  p.faceLeft = target.x < p.x;
}
function stepPerson(p, dt) {
  if (!p.target) return;
  const dx = p.target.x - p.x, dy = p.target.y - p.y;
  const dist = Math.hypot(dx, dy);
  const speed = 9.5;   // % khung / giây
  if (dist < 0.5) {
    p.x = p.target.x; p.y = p.target.y;
    const done = p.done;
    p.target = null;
    if (p.state !== 'stage') p.state = 'idle';
    p.idleFor = rand(1.5, 6);
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
    else if (p.state === 'idle') {
      p.idleFor -= dt;
      if (p.idleFor <= 0) {
        p.idleFor = rand(2, 7);
        if (p.couple && p.couple.state === 'court') {
          // cặp đôi ở khuôn viên: chỉ "người dẫn" chọn điểm đến, người kia đi cạnh bên
          if (p.couple.a === p && Math.random() < 0.6) {
            const t2 = courtPoint();
            walkTo(p, t2, 'walk');
            walkTo(p.couple.b, { x: t2.x + 12, y: t2.y + rand(-0.6, 0.6) }, 'walk');
          }
        } else if (!p.couple && Math.random() < 0.45) {
          walkTo(p, courtPoint(), 'walk');
        }
      }
    }
    render(p);
  }
}

P.init = function (container) { box = container; requestAnimationFrame(loop); };
P.resize = function (w, h) { Wpx = w; Hpx = h; };
P.setAnchor = function (y) { stageAnchor = y; };
P.setAvoid = function (rect) { avoid = rect; };
P.setCourtY1 = function (y) { courtY1 = y; };
P.get = id => people.get(id);
P.count = () => people.size;

P.spawn = function (user) {
  if (!user || !user.id) return null;
  let p = people.get(user.id);
  if (p) { p.user = { ...p.user, ...user, avatar: user.avatar || p.user.avatar }; return p; }
  if (people.size >= MAX_PEOPLE) return null;
  const seed = hash(user.id || user.nickname);
  p = { user, outfit: 'casual', casualIdx: seed % CASUAL.length, x: 50 + rand(-4, 4), y: 100.5,
    state: 'idle', target: null, done: null, idleFor: rand(0.5, 2), faceLeft: false, couple: null, el: null };
  p.el = makePersonEl(p);
  box.appendChild(p.el);
  render(p);
  walkTo(p, courtPoint(), 'walk');
  people.set(user.id, p);
  return p;
};

/* ================= Ghép đôi & sân khấu ================= */
function setOutfit(p, outfit) {
  p.outfit = outfit;
  p.el.querySelector('.figwrap').innerHTML = figureSVG(p);
  p.el.classList.toggle('wedding', outfit !== 'casual');
}
function notifyQueue() { if (P.onQueueChange) P.onQueueChange(stageQueue.map(c => `${c.a.user.nickname} ❤ ${c.b.user.nickname}`)); }
function promoteStage() {
  for (let i = 0; i < SPOTS.length && stageQueue.length; i++) {
    if (stageSlots[i]) continue;
    const c = stageQueue.shift();
    c.state = 'toStage'; c.spot = i;
    stageSlots[i] = c;
    const y = stageAnchor + (i ? 1.6 : 0);
    walkTo(c.a, { x: SPOTS[i].x - 6.4, y }, 'toStage');
    walkTo(c.b, { x: SPOTS[i].x + 6.4, y }, 'toStage', () => arriveStage(c));
    notifyQueue();
  }
}
function arriveStage(c) {
  if (c.state !== 'toStage') return;
  c.state = 'stage';
  c.a.state = 'stage'; c.b.state = 'stage';
  c.a.el.classList.add('paired'); c.b.el.classList.add('paired');
  if (W.effects) {
    const r = c.a.el.getBoundingClientRect(), stage = box.parentElement.getBoundingClientRect();
    W.effects.hearts(10, (r.left + r.width / 2 - stage.left) / stage.width, 0.52);
  }
  if (W.audio) W.audio.cheer();
  if (P.onCoupleStage) P.onCoupleStage(c);
  c.timer = setTimeout(() => leaveStage(c), P.coupleSec * 1000);
  c.heartTimer = setInterval(() => {
    if (W.effects && c.state === 'stage') W.effects.hearts(3, SPOTS[c.spot].x / 100, 0.5);
  }, 4000);
}
function leaveStage(c) {
  clearTimeout(c.timer); clearInterval(c.heartTimer);
  if (c.spot >= 0 && stageSlots[c.spot] === c) stageSlots[c.spot] = null;
  c.spot = -1; c.state = 'court';
  c.a.el.classList.remove('paired'); c.b.el.classList.remove('paired');
  c.a.state = 'idle'; c.b.state = 'idle';
  const t2 = courtPoint();
  walkTo(c.a, t2, 'toCourt');
  walkTo(c.b, { x: Math.min(95, t2.x + 12), y: t2.y }, 'toCourt');
  promoteStage();
}
P.makeCouple = function (userA, userB) {
  const a = P.spawn(userA), b = P.spawn(userB);
  if (!a || !b || a === b) return null;
  if (a.couple && a.couple !== b.couple) return null;
  if (b.couple && b.couple !== a.couple) return null;
  if (a.couple) return a.couple;
  const swap = (hash(a.user.id) + hash(b.user.id)) % 2 === 0;
  setOutfit(a, swap ? 'groom' : 'bride');
  setOutfit(b, swap ? 'bride' : 'groom');
  const c = { key: [a.user.id, b.user.id].sort().join('|'), a, b, state: 'queue', spot: -1, timer: 0, heartTimer: 0 };
  a.couple = c; b.couple = c;
  couples.push(c);
  // hai người đi lại gần nhau trước rồi cùng lên sân khấu
  const mid = { x: (a.x + b.x) / 2, y: Math.max(a.y, b.y) };
  walkTo(a, { x: mid.x - 6, y: mid.y }, 'walk');
  walkTo(b, { x: mid.x + 6, y: mid.y }, 'walk');
  stageQueue.push(c);
  notifyQueue();
  setTimeout(promoteStage, 1200);
  return c;
};
P.featured = () => stageSlots[0];
P.byUser = function (uid) {
  const p = people.get(uid);
  return p && p.couple && (p.couple.state === 'stage' || p.couple.state === 'toStage') ? p.couple : (p && p.couple) || null;
};
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
