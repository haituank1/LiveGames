/* Sàn Nhảy V4 – PHÒNG BAR 1 NỀN + Ô SÀN CỐ ĐỊNH + RƠI TỪ TRÊN CAO.
   - Phòng là MỘT ảnh bg-bar.webp; khung bố cục đóng băng trong BAR-LAYOUT.md, cài tại LAYOUT dưới đây.
   - Mỗi dancer nhận 1 Ô SÀN random CỐ ĐỊNH trong 99 ô (không xáo trộn khi người khác vào/ra).
   - VÀO PHÒNG = RƠI TỪ TRÊN CAO xuống đúng ô nhà: tăng tốc dần + vệt sáng + chùm đèn bám theo,
     chạm đất: vòng sóng + tia lửa + nảy squash. LV càng cao rơi càng hoành tráng (main.js truyền flair).
   - Nhân vật là GIF động theo roster NV01–NV15 (~/workspace/san-nhay-anim):
     crowd = GIF hành động chữ ký (nhảy tại ô) · xung = bản xung-dai 24 khung (khi camera cận cảnh)
     · spot = bản spotlight-dai 32 khung (khoảnh khắc chiếm sóng). main.js quyết định trạng thái qua setVis().
   - Nhân viên quán NV09–NV12 (chỉ trạng thái thường): main.js cho vào lấp sàn khi vắng khách.
   - Phụ kiện (cánh/bóng bay/trang phục theo LV): LỚP TRỐNG .acc + trường dữ liệu p.accessories —
     TODO giai đoạn trang phục/phụ kiện, xem README. */
(function () {
'use strict';
const W = (window.Party = window.Party || {});
const P = (W.dancers = {});
const FX = () => W.effects;

/* ================= KHUNG BỐ CỤC (BAR-LAYOUT.md) ================= */
const LAYOUT = {
  screen: { x: 19.2, y: 19.4, w: 61.6, h: 11.2 },          // màn LED vẽ sẵn — #screen phủ đúng khung này
  podium: { x: 50, y: 56.5, s: 0.135 },                      // điểm đứng spotlight trên đĩa phát sáng
  stageSpots: [                                             // top 3 bảng vàng
    { x: 50, y: 56.5, s: 0.135 },
    { x: 37, y: 63.0, s: 0.095 },
    { x: 63, y: 63.0, s: 0.095 },
  ],
  pairSpots: [{ x: 44.5, y: 68 }, { x: 55.5, y: 68 }],      // nhảy đôi trước podium
  rows: [                                                   // 9 hàng sàn: y chân, x từ–đến, số ô, cỡ cơ bản (đã giảm ~20% sau vòng chụp kiểm chứng: sàn thoáng hơn, cận cảnh không quá khổ)
    { y: 61.0, x0: 20, x1: 80, n: 8,  s: 0.058 },
    { y: 65.5, x0: 17, x1: 83, n: 9,  s: 0.064 },
    { y: 70.0, x0: 14, x1: 86, n: 10, s: 0.070 },
    { y: 74.5, x0: 12, x1: 88, n: 11, s: 0.076 },
    { y: 79.0, x0: 10, x1: 90, n: 11, s: 0.082 },
    { y: 83.5, x0: 8,  x1: 92, n: 12, s: 0.088 },
    { y: 88.0, x0: 6,  x1: 94, n: 12, s: 0.094 },
    { y: 92.5, x0: 5,  x1: 95, n: 13, s: 0.100 },
    { y: 97.0, x0: 4,  x1: 96, n: 13, s: 0.106 },
  ],
};
P.LAYOUT = LAYOUT;
const slots = [];
LAYOUT.rows.forEach((r, ri) => {
  for (let i = 0; i < r.n; i++) {
    const t = r.n === 1 ? 0.5 : i / (r.n - 1);
    const stagger = (ri % 2 && i > 0 && i < r.n - 1) ? (r.x1 - r.x0) / r.n * 0.28 : 0;
    slots.push({ id: 'F' + String(slots.length + 1).padStart(2, '0'), row: ri, x: r.x0 + (r.x1 - r.x0) * t + stagger, y: r.y, s: r.s, by: null });
  }
});
P.slotCount = () => slots.length;
P.pairCenter = () => ({ x: 50, y: LAYOUT.pairSpots[0].y });

/* ================= NHÂN VẬT (roster GIF) ================= */
const CHARS = [
  { code: 'NV01', id: 'nv01', name: 'Đại Gia',        color: '#ffd76a', weight: 6,  crowd: 'img/nv01-dai-gia-vung-tien.gif',    xung: 'img/nv01-dai-gia-xung-dai.gif',    spot: 'img/nv01-dai-gia-spotlight-dai.gif',    fx: 'gold' },
  { code: 'NV02', id: 'nv02', name: 'Idol',           color: '#ff7ed6', weight: 15, crowd: 'img/nv02-idol-nhay.gif',            xung: 'img/nv02-idol-xung-dai.gif',       spot: 'img/nv02-idol-spotlight-dai.gif',       fx: 'idol' },
  { code: 'NV03', id: 'nv03', name: 'DJ',             color: '#7ed6ff', weight: 13, crowd: 'img/nv03-dj-headspin.gif',          xung: 'img/nv03-dj-xung-dai.gif',         spot: 'img/nv03-dj-spotlight-dai.gif',         fx: 'dj' },
  { code: 'NV04', id: 'nv04', name: 'Dân Quẩy',       color: '#ff9d5c', weight: 16, crowd: 'img/nv04-dan-quay-vinahouse.gif',   xung: 'img/nv04-dan-quay-xung-dai.gif',   spot: 'img/nv04-dan-quay-spotlight-dai.gif',   fx: 'orange' },
  { code: 'NV05', id: 'nv05', name: 'Mascot Vịt',     color: '#ffe14d', weight: 13, crowd: 'img/nv05-mascot-lac-mong.gif',      xung: 'img/nv05-mascot-xung-dai.gif',     spot: 'img/nv05-mascot-spotlight-dai.gif',     fx: 'mascot' },
  { code: 'NV06', id: 'nv06', name: 'Tân Binh',       color: '#9be15d', weight: 19, crowd: 'img/nv06-tan-binh-nhay.gif',        xung: 'img/nv06-tan-binh-xung-dai.gif',   spot: 'img/nv06-tan-binh-spotlight-dai.gif',   fx: 'green' },
  { code: 'NV07', id: 'nv07', name: 'Kiếm Tiên',      color: '#8be9ff', weight: 5,  crowd: 'img/kiem-tien-1-thuong.gif',        xung: 'img/kiem-tien-2-xung-dai.gif',     spot: 'img/kiem-tien-3-spotlight-dai.gif',     fx: 'sword' },
  { code: 'NV08', id: 'nv08', name: 'Phượng Hoàng',   color: '#ff9d2e', weight: 5,  crowd: 'img/phuong-hoang-1-thuong.gif',     xung: 'img/phuong-hoang-2-xung-dai.gif',  spot: 'img/phuong-hoang-3-spotlight-dai.gif',  fx: 'phoenix' },
  { code: 'NV13', id: 'nv13', name: 'Đại Ca Bá Đạo',  color: '#ff5c3c', weight: 8,  crowd: 'img/nv13-dai-ca-ba-dao.gif',        xung: 'img/nv13-dai-ca-xung-dai.gif',     spot: 'img/nv13-dai-ca-spotlight-dai.gif',     fx: 'boss' },
  { code: 'NV14', id: 'nv14', name: 'Siêu Hài',       color: '#ffe14d', weight: 10, crowd: 'img/nv14-sieu-hai-nhay-ga.gif',     xung: 'img/nv14-sieu-hai-xung-dai.gif',   spot: 'img/nv14-sieu-hai-spotlight-dai.gif',   fx: 'funny' },
  { code: 'NV15', id: 'nv15', name: 'Nữ Vương',       color: '#9be8ff', weight: 8,  crowd: 'img/nv15-nu-vuong-quat-lanh.gif',   xung: 'img/nv15-nu-vuong-xung-dai.gif',   spot: 'img/nv15-nu-vuong-spotlight-dai.gif',   fx: 'queen' },
];
const STAFF = [
  { code: 'NV09', id: 'nv09', name: 'Phục Vụ Chân Dài', color: '#ff8fb3', crowd: 'img/nv09-phuc-vu-nhay.gif', fx: 'idol' },
  { code: 'NV10', id: 'nv10', name: 'Bartender 6 Múi',  color: '#7ed6ff', crowd: 'img/nv10-bartender-nhay.gif', fx: 'dj' },
  { code: 'NV11', id: 'nv11', name: 'Bê Rượu',          color: '#c3a6ff', crowd: 'img/nv11-be-ruou-nhay.gif', fx: 'funny' },
  { code: 'NV12', id: 'nv12', name: 'Bảo Vệ',           color: '#b8c4d6', crowd: 'img/nv12-bao-ve-nhay.gif', fx: 'green' },
];
P.CHARS = CHARS; P.STAFF = STAFF;
const charById = id => CHARS.find(c => c.id === id) || STAFF.find(c => c.id === id) || CHARS[5];
P.charOf = p => charById(p && p.cls);
/* ===== TỐC ĐỘ NHẢY (main.js gọi P.setSpeedDir theo config tocDoNhay) =====
   Trình duyệt không đổi được tốc độ GIF đang chạy (delay đã nướng trong file), nên mỗi GIF
   có sẵn 3 bộ tốc độ: img/ = thường 1.0x · img/cham/ = 0.8x · img/nhanh/ = 1.3x.
   Mọi URL ảnh nhân vật đều đi qua sped() để đổi tốc độ chỉ cần đổi 1 biến này. */
let speedDir = '';
function sped(path) { return speedDir && path ? path.replace('img/', 'img/' + speedDir) : path; }
P.sped = sped;
P.setSpeedDir = d => { speedDir = d || ''; };
P.charImg = id => sped(charById(id).crowd);
P.refreshImgs = function () {   // áp lại src theo tốc độ hiện tại cho mọi dancer đang có mặt
  for (const p of people.values()) {
    const c = charById(p.cls);
    const raw = p.vis === 'spot' ? (c.spot || c.xung || c.crowd) : p.vis === 'xung' ? (c.xung || c.crowd) : c.crowd;
    const src = sped(raw);
    const img = p.el.querySelector('.chibi');
    if (img.getAttribute('src') !== src) img.src = src;
  }
};
function pickCharId() {
  const total = CHARS.reduce((s, c) => s + c.weight, 0);
  let r = Math.random() * total;
  for (const c of CHARS) { r -= c.weight; if (r <= 0) return c.id; }
  return 'nv06';
}

/* ================= TRẠNG THÁI ================= */
let box = null, trailBox = null, coneEl = null, Wpx = 400, Hpx = 800;
const people = new Map();
const rand = (a, b) => a + Math.random() * (b - a);
const hash = s => { let x = 0; for (const ch of String(s)) x = (x * 31 + ch.codePointAt(0)) >>> 0; return x; };
function esc(s) { return String(s).replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch])); }
let tune = { lvScaleMax: 1.25, dropHeight: 40, dropHeightVip: 48 };
P.setTune = t => { if (t) tune = { ...tune, ...t }; };

function makeEl(p) {
  const el = document.createElement('div');
  const hue = hash(p.user.id) % 360;
  const av = p.user.avatar
    ? `<span class="av"><img src="${esc(p.user.avatar)}" referrerpolicy="no-referrer" alt=""></span>`
    : `<span class="av" style="background:hsl(${hue},55%,48%)">${esc((Array.from(String(p.user.nickname || '?').trim())[0] || '?').toUpperCase())}</span>`;
  el.innerHTML = `<div class="bubble"></div><div class="halo"></div><div class="wing wingL"></div><div class="wing wingR"></div>` +
    `<div class="auraring"></div><div class="focusring"></div>` +
    `<div class="figwrap"><img class="chibi" src="${sped(charById(p.cls).crowd)}" alt=""></div>` +
    `<div class="acc"></div>` +
    `<div class="chip">${av}<span class="nm">${esc(p.user.nickname)}</span><span class="lvb"></span></div>` +
    `<div class="slotmark">${p.staff ? 'STAFF' : (p.home ? p.home.id : '')}</div>`;
  return el;
}
function baseScale(p) {
  if (p.onStage) return (LAYOUT.stageSpots[p.stageIdx] || LAYOUT.stageSpots[0]).s;
  return p.home ? p.home.s : 0.1;
}
function scaleFor(p) {
  let s = baseScale(p) * Hpx;
  if (p.vis === 'xung') s *= 1.45;
  else if (p.vis === 'spot') s *= 1.8;
  s *= p.lvScale || 1;
  return s;
}
function render(p) {
  p.el.style.setProperty('--fh', scaleFor(p) + 'px');
  p.el.style.transform = `translate(${p.x / 100 * Wpx}px, ${p.y / 100 * Hpx}px) translate(-50%,-100%)`;
  p.el.style.zIndex = String(p.falling ? 2400 : p.onStage ? 500 + p.stageIdx : p.paired ? 940 : p.focused ? 930 : 100 + Math.round(p.y * 10));
}
function freeSlot(p) { if (p.slot) { p.slot.by = null; p.slot = null; } }
function randomFreeSlot() {
  const free = slots.filter(s => !s.by);
  return free.length ? free[Math.floor(Math.random() * free.length)] : null;
}
function backToSlot(p) {
  if (p.home && (!p.home.by || p.home.by === p)) { freeSlot(p); p.home.by = p; p.slot = p.home; moveTo(p, p.home.x, p.home.y); }
  else { const s = randomFreeSlot(); if (s) { freeSlot(p); s.by = p; p.slot = s; p.home = s; p.el.querySelector('.slotmark').textContent = s.id; moveTo(p, s.x, s.y); } }
}
function setCrown(p, on) {
  p.el.querySelectorAll('.crown').forEach(e => e.remove());
  if (on) {
    const c = document.createElement('div');
    c.className = 'crown'; c.textContent = '👑';
    p.el.appendChild(c);
  }
}
/* LV: huy hiệu trên chip + vòng hào quang theo bậc + vương miện nhỏ từ LV10 (main.js gọi khi LV đổi) */
P.setLv = function (p, lv) {
  if (!p) return;
  p.lv = lv;
  const b = p.el.querySelector('.lvb');
  b.textContent = p.staff ? '' : 'LV' + lv;
  const tier = lv >= 20 ? 4 : lv >= 15 ? 3 : lv >= 10 ? 2 : lv >= 5 ? 1 : 0;
  p.el.querySelector('.auraring').className = 'auraring t' + tier;
  p.lvScale = lv >= 2 ? Math.min(tune.lvScaleMax, 1 + (lv - 1) * 0.0125) : 1;
  if (!p.onStage) setCrown(p, lv >= 10 || p.leader);
  render(p);
};
/* Trạng thái hình ảnh: crowd (tại ô) | xung (camera cận cảnh) | spot (chiếm sóng) */
P.setVis = function (p, vis) {
  if (!p || p.vis === vis) return;
  p.vis = vis;
  const c = charById(p.cls);
  const src = sped(vis === 'spot' ? (c.spot || c.xung || c.crowd) : vis === 'xung' ? (c.xung || c.crowd) : c.crowd);
  const img = p.el.querySelector('.chibi');
  if (img.getAttribute('src') !== src) img.src = src;
  p.el.classList.toggle('vis-spot', vis === 'spot');
  p.el.classList.toggle('vis-xung', vis === 'xung');
  render(p);
};
P.setFocus = function (p, on) {   // vòng sáng dưới chân khi được chú ý (solo / tâm điểm)
  if (!p) return;
  p.focused = !!on;
  p.el.classList.toggle('focused', !!on);
  render(p);
};
function clearSpecial(p) {
  if (p.paired) { p.paired = false; p.el.classList.remove('paired'); p.el.querySelectorAll('.pairheart').forEach(e => e.remove()); }
  if (p.onStage) { p.onStage = false; p.stageIdx = -1; p.el.classList.remove('onstage'); if (!p.staff) setCrown(p, (p.lv || 1) >= 10 || p.leader); }
  if (p.focused) { p.focused = false; p.el.classList.remove('focused'); }
}

/* ================= DI CHUYỂN: rơi + trượt (1 vòng rAF) ================= */
function moveTo(p, x, y) { p.gx = x; p.gy = y; p.gliding = true; }
let lastTick = 0;
function tick(t) {
  requestAnimationFrame(tick);
  const dt = Math.min(0.05, lastTick ? (t - lastTick) / 1000 : 0.016);
  lastTick = t;
  for (const p of people.values()) {
    if (p.falling) {
      p.vy += 52 * dt;                                    // gia tốc rơi (% chiều cao thế giới / s²) — rơi 40% mất ~1.3s
      p.y += p.vy * dt;
      const remain = Math.max(0, (p.slotY - p.y) / Math.max(1, p.dropH));
      p.x = p.slotX + Math.sin(t / 210 + p.seed) * 1.5 * remain;
      p.trailAcc = (p.trailAcc || 0) + dt;
      if (p.trailAcc > 0.055) {
        p.trailAcc = 0;
        spawnGhost(p);
        if (FX() && Math.random() < 0.8) FX().twinkleAt(p.x / 100, p.y / 100 - 0.01, p.flair >= 1 ? '#ffd76a' : charById(p.cls).color, 1);
      }
      if (coneEl && coneFollow === p) {
        coneEl.style.left = p.x + '%';
        coneEl.style.top = (p.y - 46) + '%';
      }
      if (p.y >= p.slotY) land(p);
      else render(p);
    } else if (p.gliding) {
      const dx = p.gx - p.x, dy = p.gy - p.y;
      const d = Math.hypot(dx, dy);
      const step = Math.min(22, Math.max(5, d * 1.6)) * dt;   // trượt ~1s, chậm dần khi tới nơi
      if (d < 0.35) { p.x = p.gx; p.y = p.gy; p.gliding = false; }
      else { p.x += dx / d * Math.min(d, step); p.y += dy / d * Math.min(d, step); }
      render(p);
    }
  }
}
requestAnimationFrame(tick);
let coneFollow = null;
function spawnGhost(p) {
  if (!trailBox) return;
  const g = document.createElement('img');
  g.src = sped(charById(p.cls).crowd);
  g.className = 'ghost';
  g.style.height = scaleFor(p) + 'px';
  g.style.transform = `translate(${p.x / 100 * Wpx}px, ${p.y / 100 * Hpx}px) translate(-50%,-100%)`;
  g.style.borderColor = charById(p.cls).color;
  trailBox.appendChild(g);
  setTimeout(() => g.classList.add('out'), 20);
  setTimeout(() => g.remove(), 480);
}
P.onLand = null;   // main.js gán: ăn mừng + xin camera khi chạm đất
function land(p) {
  p.falling = false;
  p.y = p.slotY; p.x = p.slotX;
  p.el.classList.remove('falling');
  p.el.classList.add('landed');
  setTimeout(() => p.el.classList.remove('landed'), 520);
  if (coneFollow === p) { coneFollow = null; if (coneEl) coneEl.classList.remove('on'); }
  render(p);
  const fx = FX();
  if (fx) {
    fx.ring(p.x / 100, p.y / 100, p.flair >= 1 ? '#ffd76a' : charById(p.cls).color);
    fx.burstAt(p.x / 100, (p.y - 4) / 100, charById(p.cls).color, p.flair >= 2 ? 34 : p.flair >= 1 ? 24 : 15);
    fx.burstAt(p.x / 100, (p.y - 4) / 100, '#ffffff', 5);                       // tia trắng điểm xuyết cho cú đáp thêm màu
    if (p.flair >= 1 && fx.burstRainbow) fx.burstRainbow(p.x / 100, (p.y - 5) / 100, 14);   // khách LV cao đáp đất nổ cầu vồng
    if (p.flair >= 2) { fx.ring(p.x / 100, p.y / 100, '#ffffff'); fx.twinkleAt(p.x / 100, (p.y - 12) / 100, '#ffd76a', 6); }
  }
  const chip = p.el.querySelector('.chip');
  chip.classList.remove('pop'); void chip.offsetWidth; chip.classList.add('pop');
  if (P.onLand) P.onLand(p);
}

/* ================= SPAWN / REMOVE ================= */
P.init = function (container, trails, cone) { box = container; trailBox = trails; coneEl = cone; };
P.resize = function (w, h) { Wpx = w; Hpx = h; for (const p of people.values()) render(p); };
P.get = id => people.get(id);
P.count = () => people.size;
P.realCount = () => [...people.values()].filter(p => !p.staff).length;
P.all = () => [...people.values()];
P.busy = p => !!(p && (p.onStage || p.paired || p.falling));
P.neighbours = function (p) {
  if (!p || !p.home) return [];
  return [...people.values()].filter(o => o !== p && o.home && Math.abs(o.home.row - p.home.row) <= 1);
};
/* user: {id, nickname, avatar} · opts: {cls (mã NV đã lưu), flair 0|1|2, staff, staffCls, instant} */
P.spawn = function (user, opts = {}) {
  if (!user || !user.id) return null;
  let p = people.get(user.id);
  if (p) { p.user = { ...p.user, ...user, avatar: user.avatar || p.user.avatar }; return p; }
  if (people.size >= slots.length + 3) return null;
  const s = randomFreeSlot();
  const cls = opts.staff ? opts.staffCls : (opts.cls || pickCharId());
  p = {
    user, cls, staff: !!opts.staff, lv: 1, lvScale: 1, accessories: [],   // accessories: TODO giai đoạn phụ kiện
    x: s ? s.x : 50, y: s ? s.y : 97, slot: null, home: null,
    onStage: false, stageIdx: -1, paired: false, focused: false, leader: false,
    vis: 'crowd', falling: false, gliding: false, seed: rand(0, 6.3), flair: opts.flair || 0, el: null,
  };
  if (s) { s.by = p; p.slot = s; p.home = s; }
  p.el = makeEl(p);
  p.el.className = 'dancer d-' + cls + (p.staff ? ' staff' : '');
  box.appendChild(p.el);
  people.set(user.id, p);
  if (p.home) { p.el.querySelector('.slotmark').textContent = p.staff ? 'STAFF' : p.home.id; }
  P.setLv(p, opts.lv || 1);
  if (opts.instant || !p.home) { render(p); return p; }
  /* RƠI TỪ TRÊN CAO xuống đúng ô nhà */
  p.dropH = (p.flair >= 1 ? tune.dropHeightVip : tune.dropHeight) + rand(0, 5);
  p.slotX = p.x; p.slotY = p.y;
  p.x = p.slotX + rand(-1.5, 1.5);
  p.y = Math.max(2, p.slotY - p.dropH);
  p.vy = 6; p.falling = true;
  p.el.classList.add('falling');
  coneFollow = p;
  if (coneEl) {
    coneEl.style.left = p.x + '%';
    coneEl.style.top = (p.y - 46) + '%';
    coneEl.style.background = `linear-gradient(180deg, ${charById(p.cls).color}cc, ${charById(p.cls).color}0d 85%)`;
    coneEl.classList.add('on');
  }
  render(p);
  return p;
};
P.removeUser = function (uid, polite) {
  const p = people.get(uid);
  if (!p) return;
  people.delete(uid);
  freeSlot(p);
  if (p.home && p.home.by === p) p.home.by = null;
  if (coneFollow === p) { coneFollow = null; if (coneEl) coneEl.classList.remove('on'); }
  if (polite) {   // nhân viên rời sàn lịch sự: mờ dần rồi biến mất
    p.el.classList.add('bye');
    setTimeout(() => p.el.remove(), 750);
  } else p.el.remove();
};
/* ================= VỊ TRÍ ĐẶC BIỆT ================= */
P.toStage = function (p, idx) {
  if (!p) return;
  if (p.onStage && p.stageIdx === idx) { render(p); return; }
  clearSpecial(p);
  p.onStage = true; p.stageIdx = idx;
  const s = LAYOUT.stageSpots[idx] || LAYOUT.stageSpots[0];
  p.el.classList.add('onstage');
  setCrown(p, idx === 0);
  moveTo(p, s.x, s.y);
  render(p);
};
P.offStage = function (p) {
  if (!p || !p.onStage) return;
  p.onStage = false; p.stageIdx = -1;
  p.el.classList.remove('onstage');
  if (!p.staff) setCrown(p, (p.lv || 1) >= 10 || p.leader);
  backToSlot(p);
};
P.toPair = function (p, side) {
  if (!p) return;
  clearSpecial(p);
  p.paired = true;
  const pos = LAYOUT.pairSpots[side] || LAYOUT.pairSpots[0];
  p.el.classList.add('paired');
  if (!p.el.querySelector('.pairheart')) {
    const hh = document.createElement('div');
    hh.className = 'pairheart'; hh.textContent = '💞';
    p.el.appendChild(hh);
  }
  moveTo(p, pos.x, pos.y);
  render(p);
};
P.offPair = function (p) {
  if (!p || !p.paired) return;
  p.paired = false;
  p.el.classList.remove('paired');
  p.el.querySelectorAll('.pairheart').forEach(e => e.remove());
  backToSlot(p);
};
P.toFloor = function (p) { if (!p) return; clearSpecial(p); if (!p.falling) backToSlot(p); };
P.setLeader = function (id) {
  for (const p of people.values()) {
    const on = p.user.id === id;
    if (on === p.leader) continue;
    p.leader = on;
    p.el.classList.toggle('leader', on);
    if (!p.onStage && !p.staff) setCrown(p, on || (p.lv || 1) >= 10);
    render(p);
  }
};
/* Ẩn dancer ngoài khung camera (main.js gọi mỗi ~220ms, toạ độ % của thế giới) */
P.cull = function (x0, y0, x1, y1) {
  for (const p of people.values()) {
    const out = p.x < x0 || p.x > x1 || p.y < y0 || p.y > y1;
    const d = out ? 'none' : '';
    if (p.el.style.display !== d) p.el.style.display = d;
  }
};
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
})();
