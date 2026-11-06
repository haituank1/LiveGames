/* Hiệu ứng Lớp học chữ trên canvas phủ: sao vàng, pháo giấy, tim bay,
   pháo hoa, lấp lánh ambient. Rút gọn từ js/effects.js game đám cưới:
   giữ cùng vòng lặp rAF + chốt tab ẩn (dừng hẳn khi tab ẩn để hạt không
   tích rồi nổ dồn khi quay lại) + giới hạn 1400 hạt. */
(function () {
'use strict';
const W = (window.Classroom = window.Classroom || {});
const E = (W.effects = {});
let cv, ctx, w = 1, h = 1;
let rafId = 0, fxHidden = document.hidden, fwTimers = [];
function startLoop() { if (!rafId) { lastT = 0; rafId = requestAnimationFrame(loop); } }
function stopLoop() { if (rafId) { cancelAnimationFrame(rafId); rafId = 0; } }
document.addEventListener('visibilitychange', () => {
  fxHidden = document.hidden;
  if (fxHidden) {
    stopLoop();
    for (const t of fwTimers) clearTimeout(t);
    fwTimers.length = 0;
  } else startLoop();
});
const P = [];
let tier = 0, sparkleAcc = 0, lastT = 0, dustAcc = 0;
const rand = (a, b) => a + Math.random() * (b - a);
const FW_COLORS = ['#ffd76a', '#ff7eb0', '#7ed6ff', '#b8f26d', '#ffffff', '#c3a6ff'];
const CONFETTI = ['#ffd76a', '#ff7eb0', '#7ed6ff', '#b8f26d', '#ffffff', '#c3a6ff'];
const HEARTS = ['#ff5c7a', '#ff9db8', '#ffb7cd'];

E.init = function (canvas) { cv = canvas; ctx = cv.getContext('2d'); startLoop(); };
E.resize = function (w2, h2, dpr) {
  if (!cv) return;
  w = w2; h = h2;
  cv.width = Math.round(w2 * dpr); cv.height = Math.round(h2 * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
};
E.setTier = function (t) { tier = t; };
function add(p) { if (fxHidden) return; if (P.length < 1400) P.push(p); }

/* Sao vàng bay lên từ một điểm (thưởng trả lời đúng / điểm danh). */
E.stars = function (n, x, y) {
  for (let i = 0; i < (n || 12); i++) {
    const a = rand(0, 6.283), sp = rand(40, 170);
    add({ kind: 'star', x: (x != null ? x * w : w * 0.5) + rand(-20, 20), y: (y != null ? y * h : h * 0.5) + rand(-10, 10),
      vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 70, life: 0, max: rand(1.2, 2), size: rand(4, 8),
      color: '#ffd76a', grav: 60, drag: 1.2, rot: rand(0, 6.3), vr: rand(-3, 3) });
  }
  if (W.audio) W.audio.sparkle();
};
/* Pháo giấy từ hai góc dưới bắn chéo lên (quà lớn / lên bảng). */
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
E.confetti = function (n) {
  for (let i = 0; i < (n || 50); i++) {
    add({ kind: 'confetti', x: rand(0, w), y: rand(-h * 0.25, -10), vx: rand(-14, 14), vy: rand(26, 62),
      life: 0, max: rand(6, 10), size: rand(5, 10), rot: rand(0, 6.3), vr: rand(-2.4, 2.4),
      color: CONFETTI[Math.floor(Math.random() * CONFETTI.length)], grav: 0, drag: 0, sway: rand(0, 6.3) });
  }
};
E.hearts = function (n, x, y) {
  for (let i = 0; i < (n || 10); i++) {
    add({ kind: 'heart', x: (x != null ? x * w : rand(w * 0.3, w * 0.7)) + rand(-30, 30),
      y: (y != null ? y * h : h * 0.62) + rand(-8, 8), vx: rand(-12, 12), vy: rand(-66, -38),
      life: 0, max: rand(1.6, 2.6), size: rand(8, 15), color: HEARTS[Math.floor(Math.random() * HEARTS.length)],
      grav: -6, drag: 0, sway: rand(0, 6.3) });
  }
};
function spark(cx, cy, vx, vy, col, opt) {
  add(Object.assign({ kind: 'spark', x: cx, y: cy, vx, vy, life: 0, max: rand(0.7, 1.3),
    size: rand(1.6, 3.1), color: col, grav: 60, drag: 1.6 }, opt || {}));
}
function explode(cx, cy, col) {
  const S = h / 800;
  add({ kind: 'flash', x: cx, y: cy, vx: 0, vy: 0, life: 0, max: 0.35, size: rand(26, 42), color: col, grav: 0, drag: 0 });
  if (W.audio) W.audio.boom();
  const n = 48;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * 6.283 + rand(-0.08, 0.08), sp = rand(90, 250) * S;
    spark(cx, cy, Math.cos(a) * sp, Math.sin(a) * sp, col, { tw: Math.random() < 0.45 ? 1 : 0 });
  }
}
E.firework = function (x, y, color) {
  const tx = x != null ? x * w : rand(w * 0.15, w * 0.85);
  const ty = y != null ? y * h : rand(h * 0.12, h * 0.36);
  const col = color || FW_COLORS[Math.floor(Math.random() * FW_COLORS.length)];
  const sx = Math.max(8, Math.min(w - 8, tx + rand(-30, 30)));
  add({ kind: 'rocket', x: sx, y: h + 6, tx, ty, sx, vx: 0, vy: 0, life: 0, max: rand(0.65, 0.9), size: 2.6, color: col, grav: 0, drag: 0 });
};
E.fireworks = function (count, gap) {
  const n = count || 3, g = gap || 260;
  for (let i = 0; i < n; i++) {
    const id = setTimeout(() => { const k = fwTimers.indexOf(id); if (k >= 0) fwTimers.splice(k, 1); E.firework(); }, i * g + rand(0, 120));
    fwTimers.push(id);
  }
};
E.fireworksShow = E.fireworks;

function drawHeart(x, y, s, color, alpha) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s / 10, s / 10); ctx.globalAlpha = alpha;
  ctx.fillStyle = color; ctx.beginPath();
  ctx.moveTo(0, 3);
  ctx.bezierCurveTo(-6, -3, -3, -9, 0, -4.5);
  ctx.bezierCurveTo(3, -9, 6, -3, 0, 3);
  ctx.fill(); ctx.restore();
}
function drawStar(x, y, s, color, alpha, rot) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot || 0); ctx.globalAlpha = alpha;
  ctx.fillStyle = color; ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? s : s * 0.45, a = (i / 10) * 6.283 - 1.5708;
    const px = Math.cos(a) * r, py = Math.sin(a) * r;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath(); ctx.fill(); ctx.restore();
}
function loop(t) {
  rafId = requestAnimationFrame(loop);
  const dt = Math.min(0.05, lastT ? (t - lastT) / 1000 : 0.016); lastT = t;
  ctx.clearRect(0, 0, w, h);
  sparkleAcc += dt * (1.1 + tier * 0.85);
  while (sparkleAcc >= 1) {
    sparkleAcc--;
    add({ kind: 'twinkle', x: rand(0, w), y: rand(h * 0.05, h * 0.5), vx: 0, vy: rand(-4, 2),
      life: 0, max: rand(1.2, 2.4), size: rand(1.4, 3.2), color: '#ffe9a8', grav: 0, drag: 0 });
  }
  dustAcc += dt * (0.7 + tier * 0.5);
  while (dustAcc >= 1) {
    dustAcc--;
    add({ kind: 'dust', x: rand(0, w), y: rand(h * 0.25, h * 1.02), vx: rand(-7, 7), vy: -rand(5, 15),
      life: 0, max: rand(6, 11), size: rand(5, 13), color: '#ffd76a', grav: 0, drag: 0, sway: rand(0, 6.3) });
  }
  for (let i = P.length - 1; i >= 0; i--) {
    const p = P[i];
    p.life += dt;
    if (p.life >= p.max || p.y > h + 30) {
      if (p.kind === 'rocket') explode(p.tx, p.ty, p.color);
      P[i] = P[P.length - 1]; P.pop(); continue;
    }
    if (p.kind === 'rocket') {
      const f = Math.min(1, p.life / p.max), e = 1 - Math.pow(1 - f, 1.6);
      p.x = p.sx + (p.tx - p.sx) * e + Math.sin(f * 9 + p.tx) * 3;
      p.y = (h + 6) + (p.ty - h - 6) * e;
    } else {
      const dragK = p.drag ? Math.max(0, 1 - p.drag * dt) : 1;
      p.vx *= dragK; p.vy = p.vy * dragK + (p.grav || 0) * dt;
      p.x += p.vx * dt + (p.sway != null ? Math.sin(t / 480 + p.sway) * 18 * dt : 0);
      p.y += p.vy * dt;
      if (p.rot != null) p.rot += (p.vr || 0) * dt;
    }
    const fade = p.life > p.max - 0.7 ? (p.max - p.life) / 0.7 : 1;
    if (p.kind === 'spark') {
      let a = Math.max(0, fade);
      if (p.tw) a *= 0.35 + 0.65 * Math.abs(Math.sin(t / 90 + p.x * 0.7 + p.y));
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = a;
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size * fade + 0.4, 0, 6.3); ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
    } else if (p.kind === 'rocket') {
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
    } else if (p.kind === 'twinkle' || p.kind === 'star') {
      if (p.kind === 'twinkle') {
        ctx.globalAlpha = Math.sin((p.life / p.max) * Math.PI) * 0.9;
        ctx.fillStyle = p.color;
        const s = p.size;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y - s * 2); ctx.lineTo(p.x + s * 0.6, p.y - s * 0.6); ctx.lineTo(p.x + s * 2, p.y);
        ctx.lineTo(p.x + s * 0.6, p.y + s * 0.6); ctx.lineTo(p.x, p.y + s * 2); ctx.lineTo(p.x - s * 0.6, p.y + s * 0.6);
        ctx.lineTo(p.x - s * 2, p.y); ctx.lineTo(p.x - s * 0.6, p.y - s * 0.6);
        ctx.fill();
      } else drawStar(p.x, p.y, p.size, p.color, Math.max(0, fade), p.rot);
    } else if (p.kind === 'dust') {
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
      g.addColorStop(0, p.color); g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.globalAlpha = Math.sin((p.life / p.max) * Math.PI) * 0.2;
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, 6.3); ctx.fill();
    } else if (p.kind === 'confetti') {
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot || 0); ctx.globalAlpha = Math.max(0, fade);
      const fl2 = 0.2 + 0.8 * Math.abs(Math.sin((p.rot || 0) * 1.7));
      ctx.scale(1, fl2);
      ctx.fillStyle = p.color; ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2); ctx.restore();
    } else if (p.kind === 'heart') {
      drawHeart(p.x, p.y, p.size, p.color, Math.max(0, fade));
    }
  }
  ctx.globalAlpha = 1;
}
})();
