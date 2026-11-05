/* Hiệu ứng đám cưới trên canvas phủ: pháo hoa, mưa cánh hoa hồng, mưa giấy màu, tim bay, lấp lánh ambient.
   Mật độ hiệu ứng ambient tăng theo mốc mắt xem (main.js gọi E.setTier).
   VĐ1 — grade theo mốc: setTier còn đặt data-tier lên #stage để CSS trong
   index.html đổi màu grade / tia sáng / độ sáng sân khấu theo mốc; bảng
   TIER_AMBIENT dưới đây cho mỗi mốc một "chất" riêng (bướm, kim tuyến,
   bokeh, sao băng) thay vì chỉ tăng đều theo tier. */
(function () {
'use strict';
const W = (window.Wedding = window.Wedding || {});
const E = (W.effects = {});
let cv, ctx, w = 1, h = 1;
let rafId = 0, fxHidden = document.hidden, fwTimers = [];   // M11 — id rAF + handle timeout pháo hoa đang chờ
/* VĐ1 — mật độ ambient RIÊNG theo mốc (chỉ số = tier 0..5: 0/10/30/50/100/200
   lượt xem, khớp TIERS trong main.js): mốc 1 thêm bướm sáng, mốc 2 thêm kim
   tuyến + bokeh, mốc 3 bokeh/đèn lồng mạnh hơn, mốc 4 thêm sao băng, mốc 5
   mạnh nhất + pháo hoa định kỳ (đã có sẵn). Tốc độ tính bằng hạt/giây. */
const TIER_AMBIENT = [
  { sparkle: 1.1, dust: 0.7, petal: 0.25, bokeh: 0,    orb: 0,    glit: 0,   bfly: 0 },
  { sparkle: 1.9, dust: 1.1, petal: 0.5,  bokeh: 0,    orb: 0,    glit: 0,   bfly: 2 },
  { sparkle: 2.8, dust: 1.5, petal: 0.8,  bokeh: 0.3,  orb: 0.22, glit: 0.9, bfly: 2 },
  { sparkle: 3.7, dust: 1.9, petal: 1.2,  bokeh: 0.6,  orb: 0.35, glit: 1.6, bfly: 3 },
  { sparkle: 4.6, dust: 2.3, petal: 1.6,  bokeh: 0.9,  orb: 0.5,  glit: 2.6, bfly: 3 },
  { sparkle: 5.6, dust: 2.7, petal: 2.0,  bokeh: 1.2,  orb: 0.6,  glit: 3.4, bfly: 3 },
];
const amb = () => TIER_AMBIENT[Math.max(0, Math.min(TIER_AMBIENT.length - 1, tier))];
function startLoop() { if (!rafId) { lastT = 0; rafId = requestAnimationFrame(loop); } }
function stopLoop() { if (rafId) { cancelAnimationFrame(rafId); rafId = 0; } }
/* M11 — tab ẩn: rAF vốn đã dừng nhưng setInterval ở main.js vẫn gọi FX.*
   nên hạt cứ tích vào mảng (tối đa 1400) rồi nổ dồn khi quay lại tab.
   Ẩn thì dừng hẳn vòng lặp + hủy timeout pháo hoa đang chờ + chặn spawn
   mới (xem add()); hiện thì chạy lại. API FX.* mà main.js gọi giữ nguyên. */
document.addEventListener('visibilitychange', () => {
  fxHidden = document.hidden;
  if (fxHidden) {
    stopLoop();
    for (const t of fwTimers) clearTimeout(t);
    fwTimers.length = 0;
  } else startLoop();
});
const P = [];            // hạt chung: {kind, x,y,vx,vy,life,max,size,color,rot,vr,grav,drag}
let tier = 0, sparkleAcc = 0, lastT = 0, petalAcc = 0, bokehAcc = 0, dustAcc = 0, glitAcc = 0, streakT = 6, royalT = 14, bflyT = 3, orbAcc = 0;
const rand = (a, b) => a + Math.random() * (b - a);
const FW_COLORS = ['#ffd76a', '#ff7eb0', '#ff9d5c', '#a8e6ff', '#c3a6ff', '#ffffff', '#ff5c7a'];
const PETALS = ['#ffb7cd', '#ff8fab', '#ffd6e3', '#fff0f5', '#ff6b9d'];
const CONFETTI = ['#ffd76a', '#ff7eb0', '#7ed6ff', '#b8f26d', '#ffffff', '#c3a6ff'];

E.init = function (canvas) {
  cv = canvas; ctx = cv.getContext('2d');
  startLoop();
};
E.resize = function (W2, H2, dpr) {
  if (!cv) return;   // L12 — resize() có thể chạy trước init (setInterval 2s ở main.js)
  w = W2; h = H2;
  cv.width = Math.round(W2 * dpr); cv.height = Math.round(H2 * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
};
E.setTier = t => {
  tier = t | 0;
  /* VĐ1 — grade theo mốc: main.js đã gọi setTier mỗi lần đổi mốc
     (refreshBg), nên đặt data-tier lên #stage tại đây là đủ, không cần
     sửa main.js. CSS trong index.html đọc data-tier để đổi màu grade /
     tia sáng / độ sáng sân khấu. Kẹp 0..5: admin thêm mốc mới qua bgRules
     thì grade lấy mốc cao nhất đã định nghĩa, không rơi về mặc định. */
  const st = document.getElementById('stage');
  if (st) st.dataset.tier = String(Math.max(0, Math.min(TIER_AMBIENT.length - 1, tier)));
};
E.getTier = () => tier;
E.fireworks = function (n = 3) { E.fireworksShow(n); };

function add(p) { if (fxHidden) return; if (P.length < 1400) P.push(p); }

/* ---------- Pháo hoa 2.0 ----------
   Ban len nhu that: qua phao BAY LEN tu duoi san (keo vet kim tuyen) roi moi
   no thanh 1 trong 7 kieu — mau don co dien, lieu vang ru xuong, vong tron,
   trai tim, ngoi sao, no doi (2 lop) va phao chia 4 (crossette). Sao phao
   nhap nhay (twinkle), keo vet sang va cuoi doi no lac dac (crackle). */
const FW_SHELLS = ['peony', 'peony', 'willow', 'ring', 'heart', 'star', 'double', 'crossette'];
function spark(cx, cy, vx, vy, col, opt) {
  add(Object.assign({ kind: 'spark', x: cx, y: cy, vx, vy, life: 0, max: rand(0.7, 1.3),
    size: rand(1.6, 3.1), color: col, grav: 60, drag: 1.6 }, opt || {}));
}
function explode(cx, cy, col) {
  const type = FW_SHELLS[Math.floor(Math.random() * FW_SHELLS.length)];
  const S = h / 800;   // tỉ lệ tốc độ theo chiều cao khung
  add({ kind: 'flash', x: cx, y: cy, vx: 0, vy: 0, life: 0, max: 0.35, size: rand(26, 42), color: col, grav: 0, drag: 0 });
  if (W.audio) W.audio.boom();
  if (type === 'willow') {
    const n = 42;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * 6.283 + rand(-0.15, 0.15), sp = rand(55, 175) * S;
      spark(cx, cy, Math.cos(a) * sp, Math.sin(a) * sp, Math.random() < 0.7 ? '#ffca7a' : '#ffe9a8',
        { max: rand(1.9, 2.7), size: rand(1.4, 2.2), grav: 100, drag: 1.05, tw: 1 });
    }
  } else if (type === 'ring') {
    const col2 = FW_COLORS[Math.floor(Math.random() * FW_COLORS.length)];
    for (let i = 0; i < 38; i++) {
      const a = (i / 38) * 6.283, sp = 205 * S;
      spark(cx, cy, Math.cos(a) * sp, Math.sin(a) * sp, i % 2 ? col : col2, { max: rand(0.9, 1.2), size: rand(1.8, 2.6), tw: 1 });
    }
  } else if (type === 'heart') {
    for (let i = 0; i < 42; i++) {
      const t = (i / 42) * 6.283;
      const hx = 16 * Math.pow(Math.sin(t), 3);
      const hy = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
      spark(cx, cy, hx / 17 * 195 * S, hy / 17 * 195 * S, Math.random() < 0.75 ? '#ff5c7a' : '#ff9db8',
        { max: rand(1.1, 1.5), size: rand(1.9, 2.8), grav: 34, drag: 1.3, tw: 1 });
    }
  } else if (type === 'star') {
    const rot = rand(0, 6.283);
    for (let k = 0; k < 5; k++) {
      const a0 = rot + k * 1.2566, a1 = a0 + 0.6283, a2 = a0 + 1.2566;
      const pts = [[Math.cos(a0), Math.sin(a0)], [Math.cos(a1) * 0.45, Math.sin(a1) * 0.45], [Math.cos(a2), Math.sin(a2)]];
      for (let sgm = 0; sgm < 2; sgm++) for (let j = 0; j <= 4; j++) {
        const f = j / 4, px = pts[sgm][0] + (pts[sgm + 1][0] - pts[sgm][0]) * f, py = pts[sgm][1] + (pts[sgm + 1][1] - pts[sgm][1]) * f;
        spark(cx, cy, px * 200 * S, py * 200 * S, '#ffd76a', { max: rand(1, 1.4), size: rand(1.8, 2.6), grav: 40, drag: 1.3, tw: 1 });
      }
    }
  } else if (type === 'double') {
    const n = 40;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * 6.283 + rand(-0.08, 0.08), sp = rand(120, 250) * S;
      spark(cx, cy, Math.cos(a) * sp, Math.sin(a) * sp, col, { tw: Math.random() < 0.4 ? 1 : 0 });
    }
    const col2 = FW_COLORS[Math.floor(Math.random() * FW_COLORS.length)];
    add({ kind: 'core', x: cx, y: cy, vx: 0, vy: 0, life: 0, max: 0.3, size: 3.4, color: col2, grav: 0, drag: 0 });
  } else if (type === 'crossette') {
    for (let i = 0; i < 13; i++) {
      const a = (i / 13) * 6.283 + rand(-0.2, 0.2), sp = rand(110, 190) * S;
      spark(cx, cy, Math.cos(a) * sp, Math.sin(a) * sp, col, { max: rand(0.9, 1.2), size: rand(2, 2.8), splitAt: rand(0.35, 0.5) });
    }
  } else {   // peony — mẫu đơn cổ điển, thêm nhấp nháy + nổ lách tách cuối đời
    const n = 48 + Math.floor(rand(0, 24));
    for (let i = 0; i < n; i++) {
      const a = (i / n) * 6.283 + rand(-0.08, 0.08), sp = rand(90, 250) * S;
      spark(cx, cy, Math.cos(a) * sp, Math.sin(a) * sp, col,
        { tw: Math.random() < 0.45 ? 1 : 0, crackle: Math.random() < 0.3 ? 1 : 0 });
    }
  }
}
/* Điều gì xảy ra khi một hạt "chết": pháo tới đích thì NỔ, lõi pháo nổ lớp 2,
   pháo crossette tách làm 4, sao pháo nổ lách tách, sao băng vỡ vụn sao con */
function onDeath(p) {
  if (p.kind === 'rocket') { explode(p.tx, p.ty, p.color); return; }
  if (p.kind === 'core') {
    const S = h / 800;
    for (let i = 0; i < 22; i++) {
      const a = (i / 22) * 6.283 + rand(-0.1, 0.1), sp = rand(50, 120) * S;
      spark(p.x, p.y, Math.cos(a) * sp, Math.sin(a) * sp, p.color, { max: rand(0.6, 1), tw: 1 });
    }
    if (W.audio) W.audio.boom();
    return;
  }
  if (p.kind === 'spark' && p.crackle) {
    for (let i = 0; i < 2; i++) add({ kind: 'spark', x: p.x, y: p.y, vx: p.vx * 0.3 + rand(-46, 46), vy: p.vy * 0.3 + rand(-46, 46), life: 0, max: rand(0.14, 0.3), size: rand(0.9, 1.4), color: '#ffffff', grav: 30, drag: 1 });
    return;
  }
  if (p.kind === 'streak') {
    for (let i = 0; i < 6; i++) add({ kind: 'glit', x: p.x, y: p.y, vx: rand(-40, 40), vy: rand(-40, 40), life: 0, max: rand(0.5, 0.9), size: rand(1.4, 2.2), color: '#ffe9a8', grav: 20, drag: 1, sway: rand(0, 6.3) });
  }
}
E.firework = function (x, y, color) {
  const tx = x != null ? x * w : rand(w * 0.15, w * 0.85);
  const ty = y != null ? y * h : rand(h * 0.12, h * 0.36);
  const col = color || FW_COLORS[Math.floor(Math.random() * FW_COLORS.length)];
  const sx = Math.max(8, Math.min(w - 8, tx + rand(-30, 30)));
  add({ kind: 'rocket', x: sx, y: h + 6, tx, ty, sx, vx: 0, vy: 0, life: 0, max: rand(0.65, 0.9), size: 2.6, color: col, grav: 0, drag: 0 });
};
E.fireworksShow = function (count = 5, gap = 260) {
  for (let i = 0; i < count; i++) {
    const id = setTimeout(() => { const k = fwTimers.indexOf(id); if (k >= 0) fwTimers.splice(k, 1); E.firework(); }, i * gap + rand(0, 120));
    fwTimers.push(id);   // M11 — lưu handle để hủy khi tab ẩn
  }
};

/* ---------- Mưa cánh hoa / giấy màu / tim ---------- */
function rain(n, kind, colors, sizeMul = 1) {
  for (let i = 0; i < n; i++) {
    add({ kind, x: rand(0, w), y: rand(-h * 0.25, -10), vx: rand(-14, 14), vy: rand(26, 62),
      life: 0, max: rand(6, 10), size: rand(5, 10) * sizeMul, rot: rand(0, 6.3), vr: rand(-2.4, 2.4),
      color: colors[Math.floor(Math.random() * colors.length)], grav: 0, drag: 0, sway: rand(0, 6.3),
      flut: rand(1.6, 3.6), ph: rand(0, 6.3), lotus: kind === 'petal' && Math.random() < 0.18 ? 1 : 0 });
  }
}
E.petals = (n = 40) => rain(n, 'petal', PETALS);
E.confetti = (n = 50) => rain(n, 'confetti', CONFETTI);
/* Mưa phong bì đỏ mừng cưới (kèm đồng tiền vàng) — quà càng lớn càng nhiều */
E.envelopes = function (n = 40) {
  for (let i = 0; i < n; i++) {
    add({ kind: 'env', x: rand(0, w), y: rand(-h * 0.3, -12), vx: rand(-12, 12), vy: rand(30, 66),
      life: 0, max: rand(6, 10), size: rand(13, 20), rot: rand(-0.5, 0.5), vr: rand(-1.2, 1.2),
      color: '#d81b3a', grav: 0, drag: 0, sway: rand(0, 6.3) });
  }
};
/* Hai khẩu pháo giấy ở hai góc dưới bắn chéo lên — dùng cho khoảnh khắc đại lễ */
E.cannon = function () {
  for (const fromLeft of [true, false]) {
    for (let i = 0; i < 70; i++) {
      add({ kind: 'confetti', x: fromLeft ? rand(0, w * 0.06) : rand(w * 0.94, w), y: h + rand(0, 14),
        vx: (fromLeft ? 1 : -1) * rand(60, 300), vy: -rand(330, 620),
        life: 0, max: rand(1.6, 2.8), size: rand(5, 10), rot: rand(0, 6.3), vr: rand(-6, 6),
        color: CONFETTI[Math.floor(Math.random() * CONFETTI.length)], grav: 300, drag: 0.7 });
    }
  }
  if (W.audio) W.audio.sparkle();
};
E.hearts = function (n = 10, x, y) {
  for (let i = 0; i < n; i++) {
    add({ kind: 'heart', x: (x != null ? x * w : rand(w * 0.3, w * 0.7)) + rand(-30, 30),
      y: (y != null ? y * h : h * 0.62) + rand(-8, 8), vx: rand(-12, 12), vy: rand(-66, -38),
      life: 0, max: rand(1.6, 2.6), size: rand(8, 15), color: PETALS[Math.floor(Math.random() * PETALS.length)],
      grav: -6, drag: 0, sway: rand(0, 6.3) });
  }
};

/* Vòng tim nở quanh một điểm (lúc cặp đôi làm lễ) */
E.ringHearts = function (x = 0.5, y = 0.38) {
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * 6.283;
    add({ kind: 'heart', x: x * w, y: y * h, vx: Math.cos(a) * rand(38, 60), vy: Math.sin(a) * rand(30, 48) - 14,
      life: 0, max: rand(1.4, 2), size: rand(9, 14), color: PETALS[i % PETALS.length], grav: -4, drag: 1.1, sway: rand(0, 6.3) });
  }
};
/* Chùm hoa nổ tung tại một điểm */
E.petalBurst = function (x = 0.5, y = 0.42) {
  for (let i = 0; i < 30; i++) {
    const a = rand(0, 6.283), sp = rand(40, 190);
    add({ kind: 'petal', x: x * w, y: y * h, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 60,
      life: 0, max: rand(1.6, 2.8), size: rand(6, 11), rot: rand(0, 6.3), vr: rand(-4, 4),
      color: PETALS[Math.floor(Math.random() * PETALS.length)], grav: 55, drag: 1.4, sway: rand(0, 6.3),
      flut: rand(1.6, 3.6), ph: rand(0, 6.3), lotus: Math.random() < 0.18 ? 1 : 0 });
  }
};
/* Mưa kim tuyến vàng lấp lánh */
E.glitter = function (n = 50) {
  for (let i = 0; i < n; i++) {
    add({ kind: 'glit', x: rand(0, w), y: rand(-h * 0.25, -8), vx: rand(-8, 8), vy: rand(46, 96),
      life: 0, max: rand(3.5, 6), size: rand(1.6, 3.2), color: '#ffd76a', grav: 0, drag: 0, sway: rand(0, 6.3) });
  }
};
/* Bong bóng sáng bokeh bay lên mơ màng */
E.bokeh = function (n = 8) {
  for (let i = 0; i < n; i++) {
    add({ kind: 'bokeh', x: rand(0, w), y: rand(h * 0.5, h * 1.02), vx: rand(-6, 6), vy: -rand(9, 24),
      life: 0, max: rand(5, 9), size: rand(10, 30), color: ['#ffd9ec', '#ffe9a8', '#cfe8ff'][i % 3], grav: 0, drag: 0, sway: rand(0, 6.3) });
  }
};

/* Vầng lấp lánh bùng quanh cặp đôi lúc làm lễ: vòng sao vàng + mưa kim tuyến
   phủ xuống sân khấu — khoảnh khắc lung linh nhất của buổi live */
E.stageSparkle = function (x = 0.5, y = 0.4) {
  // vòi phun kim tuyến dựng đứng dưới chân cặp đôi ~1.6 giây
  add({ kind: 'fountain', x: x * w, y: (y + 0.045) * h, vx: 0, vy: 0, life: 0, max: 1.6, size: 3, color: '#ffd76a', grav: 0, drag: 0, emit: 0 });
  for (let i = 0; i < 26; i++) {
    const a = (i / 26) * 6.283 + rand(-0.1, 0.1), sp = rand(50, 150);
    add({ kind: 'glit', x: x * w, y: y * h, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 26,
      life: 0, max: rand(1.4, 2.4), size: rand(2, 3.6), color: '#ffd76a', grav: 42, drag: 1.2, sway: rand(0, 6.3) });
  }
  for (let i = 0; i < 12; i++) {
    add({ kind: 'twinkle', x: x * w + rand(-70, 70), y: y * h + rand(-52, 30), vx: 0, vy: rand(-6, 0),
      life: 0, max: rand(1.4, 2.6), size: rand(2.2, 4.2), color: '#ffe9a8', grav: 0, drag: 0 });
  }
  E.glitter(42);
};

/* ---------- Bướm phát sáng + đèn lồng bay (hiệu ứng sống của sảnh) ---------- */
const BFLY_COLORS = ['#ff9db8', '#ffd76a', '#c3a6ff', '#a8e6ff'];
function spawnButterfly(x, y) {
  add({ kind: 'bfly', x: x != null ? x : rand(w * 0.1, w * 0.9), y: y != null ? y : rand(h * 0.3, h * 0.55),
    vx: rand(-14, 14), vy: rand(-8, 8), tx: rand(w * 0.25, w * 0.75), ty: rand(h * 0.28, h * 0.55),
    retarget: rand(2, 4), life: 0, max: rand(22, 34), size: rand(7, 10.5),
    color: BFLY_COLORS[Math.floor(Math.random() * BFLY_COLORS.length)], grav: 0, drag: 0, ph: rand(0, 6.3) });
}
E.butterflies = function (n = 2) { for (let i = 0; i < n; i++) spawnButterfly(); };
/* Đèn lồng sáng ấm bay lên chầm chậm khắp sảnh (khác bokeh: có lõi sáng + quầng) */
E.lanterns = function (n = 5) {
  for (let i = 0; i < n; i++) {
    add({ kind: 'orb', x: rand(0, w), y: rand(h * 0.75, h * 1.05), vx: rand(-6, 6), vy: -rand(11, 24),
      life: 0, max: rand(8, 13), size: rand(13, 30), color: ['#ffca7a', '#ffb7cd', '#ffe9a8'][i % 3],
      grav: 0, drag: 0, sway: rand(0, 6.3), ph: rand(0, 6.3) });
  }
};

/* ---------- Vẽ ---------- */
function drawHeart(x, y, s, color, alpha) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s / 10, s / 10); ctx.globalAlpha = alpha;
  ctx.fillStyle = color; ctx.beginPath();
  ctx.moveTo(0, 3);
  ctx.bezierCurveTo(-6, -3, -3, -9, 0, -4.5);
  ctx.bezierCurveTo(3, -9, 6, -3, 0, 3);
  ctx.fill(); ctx.restore();
}
function loop(t) {
  rafId = requestAnimationFrame(loop);
  const dt = Math.min(0.05, lastT ? (t - lastT) / 1000 : 0.016); lastT = t;
  ctx.clearRect(0, 0, w, h);
  // lấp lánh ambient: mật độ riêng theo mốc (xem TIER_AMBIENT), thỉnh thoảng
  // có "sao lớn" sáng hẳn lên giữa sảnh cho ra chất lung linh
  sparkleAcc += dt * amb().sparkle;
  while (sparkleAcc >= 1) {
    sparkleAcc--;
    const hero = Math.random() < 0.12;
    add({ kind: 'twinkle', x: rand(0, w), y: rand(h * 0.05, h * 0.62), vx: 0, vy: rand(-4, 2),
      life: 0, max: rand(1.2, 2.4), size: rand(1.4, 3.2) * (hero ? 1.9 : 1), color: '#ffe9a8', grav: 0, drag: 0 });
  }
  // bụi vàng li ti bay lơ lửng khắp sảnh — nền "có không khí" ở mọi mốc
  dustAcc += dt * amb().dust;
  while (dustAcc >= 1) {
    dustAcc--;
    add({ kind: 'dust', x: rand(0, w), y: rand(h * 0.25, h * 1.02), vx: rand(-7, 7), vy: -rand(5, 15),
      life: 0, max: rand(6, 11), size: rand(5, 13), color: '#ffd76a', grav: 0, drag: 0, sway: rand(0, 6.3) });
  }
  // sao băng xẹt qua vòm hoa ở hai mốc cao nhất (mốc hoàng gia dày hơn)
  if (tier >= 4) {
    streakT -= dt;
    if (streakT <= 0) {
      streakT = tier >= 5 ? rand(5, 9) : rand(8, 15);
      add({ kind: 'streak', x: rand(w * 0.08, w * 0.5), y: rand(h * 0.05, h * 0.2), vx: rand(280, 400), vy: rand(70, 120),
        life: 0, max: rand(0.7, 1), size: rand(1.8, 2.6), color: '#ffffff', grav: 0, drag: 0 });
    }
  }
  // mốc hoàng gia: cứ ~30 giây tự có một tràng pháo hoa nhỏ mừng sảnh
  if (tier >= 5) {
    royalT -= dt;
    if (royalT <= 0) { royalT = rand(26, 38); E.fireworksShow(3, 340); }
  }
  // hoa rơi ambient rất nhẹ + bokeh mơ màng ở các mốc cao — sảnh lúc nào cũng "sống"
  petalAcc += dt * amb().petal;
  while (petalAcc >= 1) {
    petalAcc--;
    add({ kind: 'petal', x: rand(0, w), y: -12, vx: rand(-10, 10), vy: rand(22, 44),
      life: 0, max: rand(7, 11), size: rand(5, 9), rot: rand(0, 6.3), vr: rand(-2, 2),
      color: PETALS[Math.floor(Math.random() * PETALS.length)], grav: 0, drag: 0, sway: rand(0, 6.3),
      flut: rand(1.6, 3.6), ph: rand(0, 6.3), lotus: Math.random() < 0.18 ? 1 : 0 });
  }
  if (amb().bokeh > 0) {
    bokehAcc += dt * amb().bokeh;
    while (bokehAcc >= 1) {
      bokehAcc--;
      add({ kind: 'bokeh', x: rand(0, w), y: rand(h * 0.55, h * 1.02), vx: rand(-6, 6), vy: -rand(9, 22),
        life: 0, max: rand(5, 9), size: rand(10, 28), color: ['#ffd9ec', '#ffe9a8', '#cfe8ff'][Math.floor(Math.random() * 3)], grav: 0, drag: 0, sway: rand(0, 6.3) });
    }
    // đèn lồng ấm bay lên — sảnh cao cấp lúc nào cũng có ánh sáng chuyển động
    orbAcc += dt * amb().orb;
    while (orbAcc >= 1) { orbAcc--; E.lanterns(1); }
  }
  // VĐ1 — kim tuyến rơi ambient từ mốc Kim Tuyến (tier 2) trở đi: sảnh vàng
  // lấp lánh ngay cả khi không ai tặng quà (rơi chậm hơn kim tuyến bắn ra
  // từ E.glitter để không át mặt cặp đôi)
  if (amb().glit > 0) {
    glitAcc += dt * amb().glit;
    while (glitAcc >= 1) {
      glitAcc--;
      add({ kind: 'glit', x: rand(0, w), y: rand(-h * 0.2, -8), vx: rand(-8, 8), vy: rand(18, 38),
        life: 0, max: rand(4, 7), size: rand(1.6, 3), color: '#ffd76a', grav: 0, drag: 0, sway: rand(0, 6.3) });
    }
  }
  // bướm phát sáng bay quanh sảnh từ mốc Hoa Khai trở đi (tối đa theo bảng mốc)
  if (amb().bfly > 0) {
    bflyT -= dt;
    if (bflyT <= 0) {
      bflyT = 2.5;
      let alive = 0;
      for (const q of P) if (q.kind === 'bfly') alive++;
      if (alive < amb().bfly) spawnButterfly();
    }
  }
  for (let i = P.length - 1; i >= 0; i--) {
    const p = P[i];
    p.life += dt;
    if (p.life >= p.max || p.y > h + 30) { onDeath(p); P[i] = P[P.length - 1]; P.pop(); continue; }
    /* --- cập nhật riêng theo loại --- */
    if (p.kind === 'rocket') {
      const f = Math.min(1, p.life / p.max), e = 1 - Math.pow(1 - f, 1.6);
      p.x = p.sx + (p.tx - p.sx) * e + Math.sin(f * 9 + p.tx) * 3;
      p.y = (h + 6) + (p.ty - h - 6) * e;
      add({ kind: 'glit', x: p.x + rand(-2, 2), y: p.y + rand(0, 5), vx: rand(-8, 8), vy: rand(14, 34),
        life: 0, max: rand(0.3, 0.6), size: rand(1.1, 2), color: p.color, grav: 0, drag: 0, sway: rand(0, 6.3) });
    } else if (p.kind === 'bfly') {
      p.retarget -= dt;
      if (p.retarget <= 0) { p.retarget = rand(2.2, 4.5); p.tx = rand(w * 0.18, w * 0.82); p.ty = rand(h * 0.24, h * 0.58); }
      p.vx += ((p.tx - p.x) * 0.55 - p.vx * 1.4) * dt * 2.2;
      p.vy += ((p.ty - p.y) * 0.55 - p.vy * 1.4) * dt * 2.2 + Math.sin(t / 300 + p.ph) * 9 * dt;
      p.x += p.vx * dt; p.y += p.vy * dt;
    } else if (p.kind === 'fountain') {
      p.emit = (p.emit || 0) + dt * 90;
      while (p.emit >= 1) {
        p.emit--;
        add({ kind: 'glit', x: p.x + rand(-13, 13), y: p.y, vx: rand(-26, 26), vy: -rand(120, 235),
          life: 0, max: rand(0.7, 1.3), size: rand(1.5, 2.8), color: Math.random() < 0.75 ? '#ffd76a' : '#ff9db8', grav: 165, drag: 0.6, sway: rand(0, 6.3) });
      }
    } else {
      const dragK = p.drag ? Math.max(0, 1 - p.drag * dt) : 1;
      p.vx *= dragK; p.vy = p.vy * dragK + (p.grav || 0) * dt;
      p.x += p.vx * dt + (p.sway != null ? Math.sin(t / 480 + p.sway) * 18 * dt : 0);
      p.y += p.vy * dt;
      if (p.rot != null) p.rot += (p.vr || 0) * dt;
      if (p.splitAt && !p.splitDone && p.life >= p.splitAt) {   // pháo crossette tách làm 4 giữa trời
        p.splitDone = 1; p.life = p.max;
        for (let k = 0; k < 4; k++) {
          const a = k * 1.5708 + rand(-0.3, 0.3);
          add({ kind: 'spark', x: p.x, y: p.y, vx: p.vx * 0.45 + Math.cos(a) * 62, vy: p.vy * 0.45 + Math.sin(a) * 62,
            life: 0, max: rand(0.4, 0.65), size: rand(1.3, 2), color: p.color, grav: 55, drag: 1.2, tw: 1 });
        }
      }
    }
    const fade = p.life > p.max - 0.7 ? (p.max - p.life) / 0.7 : 1;
    if (p.kind === 'spark') {
      // vệt sáng kéo sau sao pháo + nhấp nháy nếu là sao twinkle; cộng sáng cho rực
      let a = Math.max(0, fade);
      if (p.tw) a *= 0.35 + 0.65 * Math.abs(Math.sin(t / 90 + p.x * 0.7 + p.y));
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = a * 0.5; ctx.strokeStyle = p.color; ctx.lineWidth = Math.max(1, p.size * 0.55); ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(p.x - p.vx * 0.045, p.y - p.vy * 0.045); ctx.lineTo(p.x, p.y); ctx.stroke();
      ctx.globalAlpha = a;
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size * fade + 0.4, 0, 6.3); ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
    } else if (p.kind === 'rocket' || p.kind === 'core') {
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.95; ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size * 0.8, 0, 6.3); ctx.fill();
      ctx.globalAlpha = 0.55; ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size * 1.7, 0, 6.3); ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
    } else if (p.kind === 'flash') {
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 2.2);
      g.addColorStop(0, 'rgba(255,255,255,.85)'); g.addColorStop(0.35, p.color); g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.globalAlpha = Math.max(0, fade) * 0.7; ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size * 2.2, 0, 6.3); ctx.fill();
    } else if (p.kind === 'twinkle') {
      ctx.globalAlpha = Math.sin((p.life / p.max) * Math.PI) * 0.9;
      ctx.fillStyle = p.color;
      const s = p.size;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y - s * 2); ctx.lineTo(p.x + s * 0.6, p.y - s * 0.6); ctx.lineTo(p.x + s * 2, p.y);
      ctx.lineTo(p.x + s * 0.6, p.y + s * 0.6); ctx.lineTo(p.x, p.y + s * 2); ctx.lineTo(p.x - s * 0.6, p.y + s * 0.6);
      ctx.lineTo(p.x - s * 2, p.y); ctx.lineTo(p.x - s * 0.6, p.y - s * 0.6);
      ctx.fill();
    } else if (p.kind === 'dust') {
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
      g.addColorStop(0, p.color); g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.globalAlpha = Math.sin((p.life / p.max) * Math.PI) * (0.1 + 0.1 * Math.abs(Math.sin(t / 300 + (p.sway || 0))));
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, 6.3); ctx.fill();
    } else if (p.kind === 'streak') {
      const fadeS = Math.sin((p.life / p.max) * Math.PI);
      const tl = 0.22;   // đuôi sao: ngược hướng bay 0.22 giây quãng đường
      const grad = ctx.createLinearGradient(p.x, p.y, p.x - p.vx * tl, p.y - p.vy * tl);
      grad.addColorStop(0, 'rgba(255,255,255,.95)'); grad.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.globalAlpha = fadeS; ctx.strokeStyle = grad; ctx.lineWidth = p.size; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx * tl, p.y - p.vy * tl); ctx.stroke();
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size * 1.15, 0, 6.3); ctx.fill();
    } else if (p.kind === 'petal') {
      // cánh hoa có hình dáng thật (nhọn đầu, cong mình) + lật 3D khi rơi +
      // gân sáng ở giữa; 18% là cánh sen nhạt viền vàng sang hơn
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot || 0); ctx.globalAlpha = Math.max(0, fade);
      const flip = 0.25 + 0.75 * Math.abs(Math.cos(t / 1000 * (p.flut || 2.4) + (p.ph || 0)));
      ctx.scale(1, flip);
      const s = p.size;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.moveTo(0, -s * 0.62);
      ctx.bezierCurveTo(s * 0.58, -s * 0.3, s * 0.5, s * 0.34, 0, s * 0.62);
      ctx.bezierCurveTo(-s * 0.5, s * 0.34, -s * 0.58, -s * 0.3, 0, -s * 0.62);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = 0.7;
      ctx.beginPath(); ctx.moveTo(0, -s * 0.5); ctx.quadraticCurveTo(s * 0.1, 0, 0, s * 0.5); ctx.stroke();
      if (p.lotus) { ctx.fillStyle = 'rgba(255,205,90,.85)'; ctx.beginPath(); ctx.arc(0, -s * 0.34, s * 0.11, 0, 6.3); ctx.fill(); }
      ctx.restore();
    } else if (p.kind === 'confetti') {
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot || 0); ctx.globalAlpha = Math.max(0, fade);
      const fl2 = 0.2 + 0.8 * Math.abs(Math.sin((p.rot || 0) * 1.7));   // lật mặt: mặt nghiêng thì tối lại như giấy thật
      ctx.scale(1, fl2);
      ctx.fillStyle = p.color; ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2); ctx.restore();
    } else if (p.kind === 'bfly') {
      const fadeB = Math.min(1, p.life / 1.5) * (p.life > p.max - 2 ? Math.max(0, (p.max - p.life) / 2) : 1);
      ctx.save(); ctx.translate(p.x, p.y); ctx.globalAlpha = fadeB;
      const halo = ctx.createRadialGradient(0, 0, 0, 0, 0, p.size * 2.4);
      halo.addColorStop(0, p.color); halo.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.globalAlpha = fadeB * 0.3; ctx.fillStyle = halo;
      ctx.beginPath(); ctx.arc(0, 0, p.size * 2.4, 0, 6.3); ctx.fill();
      ctx.globalAlpha = fadeB * 0.92;
      const flap = Math.sin(t / 68 + p.ph) * 0.75, dir = p.vx < -2 ? -1 : 1;
      ctx.fillStyle = p.color;
      for (const sgn of [-1, 1]) {
        ctx.save(); ctx.scale(dir * sgn, 1); ctx.rotate(-0.5 - flap * sgn * 0.55);
        ctx.beginPath(); ctx.ellipse(p.size * 0.52, 0, p.size * 0.62, p.size * 0.34, 0, 0, 6.3); ctx.fill();
        ctx.restore();
      }
      ctx.fillStyle = 'rgba(90,30,50,.9)';
      ctx.beginPath(); ctx.ellipse(0, 0, p.size * 0.13, p.size * 0.3, 0, 0, 6.3); ctx.fill();
      ctx.restore();
    } else if (p.kind === 'orb') {
      const pulse = 0.85 + 0.15 * Math.sin(t / 620 + (p.ph || 0));
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * pulse);
      g.addColorStop(0, 'rgba(255,246,220,.95)'); g.addColorStop(0.25, p.color); g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.globalAlpha = Math.sin((p.life / p.max) * Math.PI) * 0.5;
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size * pulse, 0, 6.3); ctx.fill();
    } else if (p.kind === 'bokeh') {
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
      g.addColorStop(0, p.color); g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.globalAlpha = Math.sin((p.life / p.max) * Math.PI) * 0.16;
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, 6.3); ctx.fill();
    } else if (p.kind === 'glit') {
      ctx.globalAlpha = Math.max(0, fade) * (0.45 + 0.55 * Math.abs(Math.sin(t / 130 + (p.sway || 0))));
      ctx.fillStyle = p.color;
      const s2 = p.size;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y - s2 * 2); ctx.lineTo(p.x + s2 * 0.6, p.y - s2 * 0.6); ctx.lineTo(p.x + s2 * 2, p.y);
      ctx.lineTo(p.x + s2 * 0.6, p.y + s2 * 0.6); ctx.lineTo(p.x, p.y + s2 * 2); ctx.lineTo(p.x - s2 * 0.6, p.y + s2 * 0.6);
      ctx.lineTo(p.x - s2 * 2, p.y); ctx.lineTo(p.x - s2 * 0.6, p.y - s2 * 0.6);
      ctx.fill();
    } else if (p.kind === 'env') {
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot || 0); ctx.globalAlpha = Math.max(0, fade);
      const ew = p.size, eh = p.size * 1.45;
      ctx.fillStyle = '#c8102e';
      ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(-ew / 2, -eh / 2, ew, eh, 2.5); else ctx.rect(-ew / 2, -eh / 2, ew, eh); ctx.fill();   // L5 — CEF cũ không có roundRect (Chrome <99)
      ctx.fillStyle = '#e8334d'; ctx.fillRect(-ew / 2, -eh / 2, ew, eh * 0.3);
      ctx.fillStyle = '#ffd76a';
      ctx.beginPath(); ctx.arc(0, eh * 0.12, ew * 0.3, 0, 6.3); ctx.fill();
      ctx.fillStyle = '#c8102e';
      ctx.beginPath(); ctx.arc(0, eh * 0.12, ew * 0.17, 0, 6.3); ctx.fill();
      ctx.restore();
    } else if (p.kind === 'heart') {
      drawHeart(p.x, p.y, p.size, p.color, Math.max(0, fade));
    }
  }
  ctx.globalAlpha = 1;
}
})();
