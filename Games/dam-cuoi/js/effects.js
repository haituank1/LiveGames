/* Hiệu ứng đám cưới trên canvas phủ: pháo hoa, mưa cánh hoa hồng, mưa giấy màu, tim bay, lấp lánh ambient.
   Mật độ hiệu ứng ambient tăng theo mốc mắt xem (main.js gọi E.setTier). */
(function () {
'use strict';
const W = (window.Wedding = window.Wedding || {});
const E = (W.effects = {});
let cv, ctx, w = 1, h = 1;
const P = [];            // hạt chung: {kind, x,y,vx,vy,life,max,size,color,rot,vr,grav,drag}
let tier = 0, sparkleAcc = 0, lastT = 0;
const rand = (a, b) => a + Math.random() * (b - a);
const FW_COLORS = ['#ffd76a', '#ff7eb0', '#ff9d5c', '#a8e6ff', '#c3a6ff', '#ffffff', '#ff5c7a'];
const PETALS = ['#ffb7cd', '#ff8fab', '#ffd6e3', '#fff0f5', '#ff6b9d'];
const CONFETTI = ['#ffd76a', '#ff7eb0', '#7ed6ff', '#b8f26d', '#ffffff', '#c3a6ff'];

E.init = function (canvas) {
  cv = canvas; ctx = cv.getContext('2d');
  requestAnimationFrame(loop);
};
E.resize = function (W2, H2, dpr) {
  w = W2; h = H2;
  cv.width = Math.round(W2 * dpr); cv.height = Math.round(H2 * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
};
E.setTier = t => { tier = t; };
E.fireworks = function (n = 3) { E.fireworksShow(n); };

function add(p) { if (P.length < 1400) P.push(p); }

/* ---------- Pháo hoa ---------- */
E.firework = function (x, y, color) {
  const cx = x != null ? x * w : rand(w * 0.15, w * 0.85);
  const cy = y != null ? y * h : rand(h * 0.12, h * 0.38);
  const col = color || FW_COLORS[Math.floor(Math.random() * FW_COLORS.length)];
  const n = 46 + Math.floor(rand(0, 26));
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + rand(-0.08, 0.08);
    const sp = rand(90, 250) * (h / 800);   // px/s, tỉ lệ theo chiều cao khung
    add({ kind: 'spark', x: cx, y: cy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
      life: 0, max: rand(0.7, 1.3), size: rand(1.6, 3.2), color: col, grav: 60, drag: 1.6 });
  }
  // lõi sáng + vòng tim nhỏ ở tâm
  add({ kind: 'flash', x: cx, y: cy, vx: 0, vy: 0, life: 0, max: 0.35, size: rand(26, 40), color: col, grav: 0, drag: 0 });
  if (W.audio) W.audio.boom();
};
E.fireworksShow = function (count = 5, gap = 260) {
  for (let i = 0; i < count; i++) setTimeout(() => E.firework(), i * gap + rand(0, 120));
};

/* ---------- Mưa cánh hoa / giấy màu / tim ---------- */
function rain(n, kind, colors, sizeMul = 1) {
  for (let i = 0; i < n; i++) {
    add({ kind, x: rand(0, w), y: rand(-h * 0.25, -10), vx: rand(-14, 14), vy: rand(26, 62),
      life: 0, max: rand(6, 10), size: rand(5, 10) * sizeMul, rot: rand(0, 6.3), vr: rand(-2.4, 2.4),
      color: colors[Math.floor(Math.random() * colors.length)], grav: 0, drag: 0, sway: rand(0, 6.3) });
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

/* Mưa theo tổng xu của lần tặng (mốc càng cao càng rực rỡ, như GIFT_TIERS ở game chùa) */
const GIFT_TIERS = [
  { min: 500, petals: 260, confetti: 160, fw: 6 },
  { min: 99, petals: 180, confetti: 110, fw: 4 },
  { min: 30, petals: 130, confetti: 60, fw: 2 },
  { min: 10, petals: 90, confetti: 30, fw: 1 },
  { min: 5, petals: 55, confetti: 0, fw: 0 },
  { min: 0, petals: 30, confetti: 0, fw: 0 },
];
E.giftRain = function (diamonds) {
  const t = GIFT_TIERS.find(x => diamonds >= x.min);
  if (t.petals) E.petals(t.petals);
  if (t.confetti) E.confetti(t.confetti);
  if (t.fw) E.fireworksShow(t.fw, 300);
  return GIFT_TIERS.length - 1 - GIFT_TIERS.indexOf(t);
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
  requestAnimationFrame(loop);
  const dt = Math.min(0.05, lastT ? (t - lastT) / 1000 : 0.016); lastT = t;
  ctx.clearRect(0, 0, w, h);
  // lấp lánh ambient: mốc càng cao càng nhiều (0.4 → 3 hạt/giây)
  sparkleAcc += dt * (0.4 + tier * 0.55);
  while (sparkleAcc >= 1) {
    sparkleAcc--;
    add({ kind: 'twinkle', x: rand(0, w), y: rand(h * 0.05, h * 0.6), vx: 0, vy: rand(-4, 2),
      life: 0, max: rand(1.2, 2.4), size: rand(1.4, 3), color: '#ffe9a8', grav: 0, drag: 0 });
  }
  for (let i = P.length - 1; i >= 0; i--) {
    const p = P[i];
    p.life += dt;
    if (p.life >= p.max || p.y > h + 30) { P[i] = P[P.length - 1]; P.pop(); continue; }
    const dragK = p.drag ? Math.max(0, 1 - p.drag * dt) : 1;
    p.vx *= dragK; p.vy = p.vy * dragK + (p.grav || 0) * dt;
    p.x += p.vx * dt + (p.sway != null ? Math.sin(t / 480 + p.sway) * 18 * dt : 0);
    p.y += p.vy * dt;
    if (p.rot != null) p.rot += (p.vr || 0) * dt;
    const fade = p.life > p.max - 0.7 ? (p.max - p.life) / 0.7 : 1;
    if (p.kind === 'spark') {
      ctx.globalAlpha = Math.max(0, fade);
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size * fade + 0.4, 0, 6.3); ctx.fill();
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
    } else if (p.kind === 'petal') {
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot || 0); ctx.globalAlpha = Math.max(0, fade);
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.ellipse(0, 0, p.size * 0.62, p.size * 0.34, 0, 0, 6.3); ctx.fill(); ctx.restore();
    } else if (p.kind === 'confetti') {
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot || 0); ctx.globalAlpha = Math.max(0, fade);
      ctx.fillStyle = p.color; ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2); ctx.restore();
    } else if (p.kind === 'env') {
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot || 0); ctx.globalAlpha = Math.max(0, fade);
      const ew = p.size, eh = p.size * 1.45;
      ctx.fillStyle = '#c8102e';
      ctx.beginPath(); ctx.roundRect(-ew / 2, -eh / 2, ew, eh, 2.5); ctx.fill();
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
