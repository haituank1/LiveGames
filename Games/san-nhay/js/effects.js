/* Hiệu ứng sàn nhảy trên canvas phủ: pháo hoa, giấy màu, tim bay, mưa tiền/xu,
   nổ hũ vàng, lấp lánh theo màu lớp nhân vật. */
(function () {
'use strict';
const W = (window.Party = window.Party || {});
const E = (W.effects = {});
let cv, ctx, w = 1, h = 1;
const P = [];
let sparkleAcc = 0, lastT = 0, disco = false;
const rand = (a, b) => a + Math.random() * (b - a);
const FW_COLORS = ['#ffd76a', '#ff7ed6', '#7ed6ff', '#b8f26d', '#ffffff', '#ff5c7a'];
const CONFETTI = ['#ffd76a', '#ff7ed6', '#7ed6ff', '#b8f26d', '#ffffff', '#c3a6ff'];
const HEARTS = ['#ff7ed6', '#ff5c7a', '#ffb7cd', '#c3a6ff'];

E.init = function (canvas) { cv = canvas; ctx = cv.getContext('2d'); requestAnimationFrame(loop); };
E.resize = function (W2, H2, dpr) {
  w = W2; h = H2;
  cv.width = Math.round(W2 * dpr); cv.height = Math.round(H2 * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
};
E.setDisco = on => { disco = !!on; };
function add(p) { if (P.length < 1500) P.push(p); }

/* ---------- Pháo hoa ---------- */
E.firework = function (x, y, color) {
  const cx = x != null ? x * w : rand(w * 0.15, w * 0.85);
  const cy = y != null ? y * h : rand(h * 0.1, h * 0.34);
  const col = color || FW_COLORS[Math.floor(Math.random() * FW_COLORS.length)];
  const col2 = FW_COLORS[Math.floor(Math.random() * FW_COLORS.length)];   // tông phụ cho pháo hoa 2 màu
  const n = 44 + Math.floor(rand(0, 24));
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + rand(-0.08, 0.08);
    const sp = rand(90, 250) * (h / 800);
    add({ kind: 'spark', x: cx, y: cy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
      life: 0, max: rand(0.7, 1.3), size: rand(1.6, 3.2), color: Math.random() < 0.24 ? col2 : col, grav: 60, drag: 1.6 });
  }
  add({ kind: 'flash', x: cx, y: cy, vx: 0, vy: 0, life: 0, max: 0.35, size: rand(26, 40), color: col, grav: 0, drag: 0 });
  if (W.audio) W.audio.boom();
};
E.fireworks = function (count = 3, gap = 260) {
  for (let i = 0; i < count; i++) setTimeout(() => E.firework(), i * gap + rand(0, 120));
};

/* ---------- Mưa rơi: giấy màu / tiền giấy / xu ---------- */
function rain(n, kind, colors) {
  for (let i = 0; i < n; i++) {
    add({ kind, x: rand(0, w), y: rand(-h * 0.25, -10), vx: rand(-14, 14), vy: rand(30, 70),
      life: 0, max: rand(5, 9), size: rand(6, 11), rot: rand(0, 6.3), vr: rand(-2.6, 2.6),
      color: colors[Math.floor(Math.random() * colors.length)], grav: 0, drag: 0, sway: rand(0, 6.3) });
  }
}
E.confetti = (n = 50) => rain(n, 'confetti', CONFETTI);
E.moneyRain = function (n = 60) { rain(Math.round(n * 0.6), 'bill', ['#8be28b', '#b8f26d', '#ffd76a']); rain(Math.round(n * 0.7), 'coin', ['#ffd76a', '#ffca3c', '#ffe9a8']); };
E.hearts = function (n = 10, x, y) {
  for (let i = 0; i < n; i++) {
    add({ kind: 'heart', x: (x != null ? x * w : rand(w * 0.3, w * 0.7)) + rand(-30, 30),
      y: (y != null ? y * h : h * 0.6) + rand(-8, 8), vx: rand(-12, 12), vy: rand(-66, -38),
      life: 0, max: rand(1.6, 2.6), size: rand(8, 15), color: HEARTS[Math.floor(Math.random() * HEARTS.length)],
      grav: -6, drag: 0, sway: rand(0, 6.3) });
  }
};

/* ---------- Nổ hũ vàng / bùng nổ tại một điểm ---------- */
E.potBurst = function (x, y) {
  const cx = (x != null ? x : 0.5) * w, cy = (y != null ? y : 0.55) * h;
  for (let i = 0; i < 46; i++) {
    const a = rand(-Math.PI * 0.92, -Math.PI * 0.08), sp = rand(120, 330) * (h / 800);
    add({ kind: Math.random() < 0.6 ? 'coin' : 'bill', x: cx, y: cy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
      life: 0, max: rand(1.2, 2), size: rand(6, 11), rot: rand(0, 6.3), vr: rand(-5, 5),
      color: ['#ffd76a', '#ffca3c', '#8be28b'][i % 3], grav: 420, drag: 0.4 });
  }
  add({ kind: 'flash', x: cx, y: cy, vx: 0, vy: 0, life: 0, max: 0.4, size: 46, color: '#ffd76a', grav: 0, drag: 0 });
  if (W.audio) W.audio.coin();
};
E.burstAt = function (x, y, color, n = 16) {   // tia màu lớp nhân vật khi xuất hiện / được quà nhỏ
  const cx = x * w, cy = y * h;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + rand(-0.2, 0.2), sp = rand(50, 130) * (h / 800);
    add({ kind: 'spark', x: cx, y: cy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
      life: 0, max: rand(0.5, 0.9), size: rand(1.6, 3), color, grav: 30, drag: 1.8 });
  }
};
E.burstRainbow = function (x, y, n = 22) {   // bùng nổ cầu vồng: tia đủ màu + chớp trắng ở tâm
  const cx = x * w, cy = y * h;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + rand(-0.15, 0.15), sp = rand(60, 160) * (h / 800);
    add({ kind: 'spark', x: cx, y: cy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
      life: 0, max: rand(0.55, 1), size: rand(1.8, 3.4), color: FW_COLORS[i % FW_COLORS.length], grav: 30, drag: 1.8 });
  }
  add({ kind: 'flash', x: cx, y: cy, vx: 0, vy: 0, life: 0, max: 0.32, size: rand(20, 28), color: '#ffffff', grav: 0, drag: 0 });
};

/* ---------- Hiệu ứng ambient theo lớp (v3) ----------
   Tọa độ vào là phân số của THẾ GIỚI (canvas phủ cả #world): x = ngang, y = chân dancer. */
E.ring = function (x, y, color) {   // vòng sóng lan ra dưới chân
  add({ kind: 'ring', x: x * w, y: y * h, vx: 0, vy: 0, life: 0, max: 1.25, size: rand(16, 22) * (h / 800) + 8, color, grav: 0, drag: 0 });
};
E.twinkleAt = function (x, y, color, n = 2) {
  for (let i = 0; i < n; i++) {
    add({ kind: 'twinkle', x: x * w + rand(-26, 26), y: y * h + rand(-14, 14), vx: rand(-4, 4), vy: rand(-12, -4),
      life: 0, max: rand(0.9, 1.6), size: rand(1.8, 3.2), color, grav: 0, drag: 0 });
  }
};
E.note = function (x, y, color) {   // nốt nhạc bay lên (lớp DJ)
  add({ kind: 'note', x: x * w + rand(-16, 16), y: y * h, vx: rand(-8, 8), vy: rand(-52, -34),
    life: 0, max: rand(1.4, 2), size: rand(11, 16), color: color || '#7ed6ff', grav: -4, drag: 0, sway: rand(0, 6.3) });
};
E.bubbleFx = function (x, y) {   // bong bóng xà phòng (lớp Mascot)
  add({ kind: 'bubble', x: x * w + rand(-20, 20), y: y * h + rand(-6, 6), vx: rand(-6, 6), vy: rand(-44, -26),
    life: 0, max: rand(1.6, 2.4), size: rand(4, 8.5), color: '#cfeaff', grav: -8, drag: 0, sway: rand(0, 6.3) });
};
E.feather = function (x, y) {   // lông vũ rơi lã chã (lớp Mascot)
  add({ kind: 'feather', x: x * w + rand(-14, 14), y: y * h, vx: rand(-10, 10), vy: rand(14, 26),
    life: 0, max: rand(1.6, 2.4), size: rand(5, 8), rot: rand(0, 6.3), vr: rand(-1.6, 1.6), color: '#ffffff', grav: 4, drag: 0, sway: rand(0, 6.3) });
};
E.billAt = function (x, y) {   // một tờ tiền bay phất phới tại điểm (lớp Đại Gia)
  add({ kind: 'bill', x: x * w + rand(-18, 18), y: y * h, vx: rand(-16, 16), vy: rand(-30, -12),
    life: 0, max: rand(1.6, 2.4), size: rand(6, 10), rot: rand(0, 6.3), vr: rand(-3, 3),
    color: ['#8be28b', '#b8f26d', '#ffd76a'][Math.floor(rand(0, 3))], grav: 26, drag: 0, sway: rand(0, 6.3) });
};
/* fx = "bộ hiệu ứng" của nhân vật (dancers.js: charOf(p).fx) — mỗi nhân vật 1 chữ ký hạt riêng */
const AMBIENT = {
  gold:    (x, y, head) => { E.ring(x, y, '#ffd76a'); E.twinkleAt(x, head, '#ffd76a', 2); if (Math.random() < 0.55) E.billAt(x, head); },
  idol:    (x, y, head) => { E.hearts(1, x, head); E.twinkleAt(x, head, '#ff7ed6', 2); },
  dj:      (x, y, head) => { E.ring(x, y, '#7ed6ff'); E.note(x, head); },
  orange:  (x, y, head) => { E.burstAt(x, y - 0.05, '#ff9d5c', 4); E.twinkleAt(x, head, '#ff9d5c', 1); },
  mascot:  (x, y, head) => { E.bubbleFx(x, head); E.bubbleFx(x, head); if (Math.random() < 0.35) E.feather(x, head); },
  green:   (x, y, head) => { E.twinkleAt(x, head, '#9be15d', 2); },
  sword:   (x, y, head) => { E.ring(x, y, '#8be9ff'); E.twinkleAt(x, head, '#8be9ff', 2); },
  phoenix: (x, y, head) => { E.burstAt(x, y - 0.05, '#ff9d2e', 3); E.twinkleAt(x, head, '#ffb35c', 2); if (Math.random() < 0.3) E.feather(x, head); },
  boss:    (x, y, head) => { E.ring(x, y, '#ff5c3c'); E.twinkleAt(x, head, '#ff8a5c', 2); },
  funny:   (x, y, head) => { E.twinkleAt(x, head, '#ffe14d', 2); if (Math.random() < 0.4) E.burstAt(x, y - 0.05, '#ffe14d', 3); },
  queen:   (x, y, head) => { E.ring(x, y, '#9be8ff'); E.twinkleAt(x, head, '#cfeeff', 2); },
};
E.ambient = function (fx, x, y) {   // hào quang sống quanh dancer, khác nhau theo nhân vật
  if (x == null || y == null) return;
  const head = Math.max(0.03, y - 0.115);
  (AMBIENT[fx] || AMBIENT.green)(x, y, head);
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
  sparkleAcc += dt * (disco ? 9 : 2.6);   // lấp lánh thường trực khắp sàn (mưa kim tuyến nhẹ, luôn có)
  while (sparkleAcc >= 1) {
    sparkleAcc--;
    const falling = Math.random() < 0.45;   // một phần là kim tuyến RƠI xuống chậm, phần còn lại nhấp nháy tại chỗ
    add({ kind: 'twinkle', x: rand(0, w), y: rand(h * 0.03, h * 0.8), vx: 0, vy: falling ? rand(9, 22) : rand(-4, 2),
      life: 0, max: rand(1, 2.1), size: rand(1.4, 3.1), color: FW_COLORS[Math.floor(Math.random() * FW_COLORS.length)], grav: 0, drag: 0 });
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
      ctx.globalAlpha = Math.max(0, fade); ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size * fade + 0.4, 0, 6.3); ctx.fill();
    } else if (p.kind === 'flash') {
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 2.2);
      g.addColorStop(0, 'rgba(255,255,255,.85)'); g.addColorStop(0.35, p.color); g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.globalAlpha = Math.max(0, fade) * 0.7; ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size * 2.2, 0, 6.3); ctx.fill();
    } else if (p.kind === 'twinkle') {
      ctx.globalAlpha = Math.sin((p.life / p.max) * Math.PI) * 0.9; ctx.fillStyle = p.color;
      const s = p.size;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y - s * 2); ctx.lineTo(p.x + s * 0.6, p.y - s * 0.6); ctx.lineTo(p.x + s * 2, p.y);
      ctx.lineTo(p.x + s * 0.6, p.y + s * 0.6); ctx.lineTo(p.x, p.y + s * 2); ctx.lineTo(p.x - s * 0.6, p.y + s * 0.6);
      ctx.lineTo(p.x - s * 2, p.y); ctx.lineTo(p.x - s * 0.6, p.y - s * 0.6);
      ctx.fill();
    } else if (p.kind === 'confetti') {
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot || 0); ctx.globalAlpha = Math.max(0, fade);
      ctx.fillStyle = p.color; ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2); ctx.restore();
    } else if (p.kind === 'coin') {
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot || 0); ctx.globalAlpha = Math.max(0, fade);
      ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(0, 0, p.size * 0.55, 0, 6.3); ctx.fill();
      ctx.strokeStyle = 'rgba(160,100,0,.65)'; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.arc(0, 0, p.size * 0.36, 0, 6.3); ctx.stroke(); ctx.restore();
    } else if (p.kind === 'bill') {
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot || 0); ctx.globalAlpha = Math.max(0, fade);
      ctx.fillStyle = p.color; ctx.fillRect(-p.size, -p.size * 0.45, p.size * 2, p.size * 0.9);
      ctx.fillStyle = 'rgba(255,255,255,.55)';
      ctx.beginPath(); ctx.arc(0, 0, p.size * 0.3, 0, 6.3); ctx.fill(); ctx.restore();
    } else if (p.kind === 'heart') {
      drawHeart(p.x, p.y, p.size, p.color, Math.max(0, fade));
    } else if (p.kind === 'ring') {
      const t = p.life / p.max;
      ctx.save(); ctx.globalAlpha = (1 - t) * 0.85; ctx.strokeStyle = p.color; ctx.lineWidth = 2.2;
      ctx.beginPath(); ctx.ellipse(p.x, p.y, p.size * (0.5 + t * 1.15), p.size * 0.32 * (0.5 + t * 1.15), 0, 0, 6.3); ctx.stroke();
      ctx.restore();
    } else if (p.kind === 'note') {
      ctx.save(); ctx.globalAlpha = Math.max(0, fade); ctx.fillStyle = p.color;
      ctx.font = `700 ${p.size * 2}px system-ui,sans-serif`; ctx.textAlign = 'center';
      ctx.fillText(p.sway > 3.1 ? '♫' : '♪', p.x, p.y); ctx.restore();
    } else if (p.kind === 'bubble') {
      ctx.save(); ctx.globalAlpha = Math.max(0, fade) * 0.9;
      ctx.strokeStyle = 'rgba(200,235,255,.95)'; ctx.lineWidth = 1.3;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, 6.3); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.35)';
      ctx.beginPath(); ctx.arc(p.x - p.size * 0.35, p.y - p.size * 0.35, p.size * 0.28, 0, 6.3); ctx.fill();
      ctx.restore();
    } else if (p.kind === 'feather') {
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot || 0); ctx.globalAlpha = Math.max(0, fade) * 0.95;
      ctx.fillStyle = '#fffbe8'; ctx.beginPath(); ctx.ellipse(0, 0, p.size * 0.42, p.size, 0, 0, 6.3); ctx.fill();
      ctx.strokeStyle = 'rgba(190,170,120,.8)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(0, -p.size); ctx.lineTo(0, p.size); ctx.stroke(); ctx.restore();
    }
  }
  ctx.globalAlpha = 1;
}
})();
