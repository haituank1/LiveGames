/* Hieu ung tren canvas phu toan khung 720x1280: xu roi, phao hoa,
   phao giay, tim bay, dom sang bay theo duong cong.
   Tran hat 1200; tab an thi dung han de hat khong tich roi no don. */
(function () {
'use strict';
var W = (window.QueHuong = window.QueHuong || {});
var E = (W.effects = {});
var cv = null, ctx = null, w = 720, h = 1280;
var P = [], rafId = 0, lastT = 0, hidden = false, sparkFx = null;
var FW_COLORS = ['#ffd76a', '#ff7eb0', '#7ed6ff', '#b8f26d', '#ffffff', '#c3a6ff'];
var CONFETTI = ['#ffd76a', '#ff7eb0', '#7ed6ff', '#b8f26d', '#ffffff', '#c3a6ff'];
var HEARTS = ['#ff5c7a', '#ff9db8', '#ffb7cd'];

function rand(a, b) { return a + Math.random() * (b - a); }
function add(p) { if (!hidden && P.length < 1200) P.push(p); }

function loop(t) {
  rafId = 0;
  if (hidden) return;
  var dt = Math.min(0.05, (t - lastT) / 1000 || 0.016);
  lastT = t;
  ctx.clearRect(0, 0, w, h);
  /* Dom sang bay theo duong cong (quadratic bezier). */
  if (sparkFx) {
    var s = sparkFx;
    s.t += dt / (s.dur / 1000);
    if (s.t >= 1) {
      s.t = 1;
      drawGlow(s.to[0], s.to[1], 26, 'rgba(255,215,106,.95)');
      drawGlow(s.to[0], s.to[1], 60, 'rgba(255,215,106,.35)');
      if (s.done) { var d = s.done; sparkFx = null; d(); }
    } else {
      var mt = 1 - s.t;
      var x = mt * mt * s.from[0] + 2 * mt * s.t * s.mid[0] + s.t * s.t * s.to[0];
      var y = mt * mt * s.from[1] + 2 * mt * s.t * s.mid[1] + s.t * s.t * s.to[1];
      drawGlow(x, y, 14, 'rgba(255,220,130,.95)');
      drawGlow(x, y, 30, 'rgba(255,200,80,.4)');
      addTrail(x, y);
    }
  }
  for (var i = P.length - 1; i >= 0; i--) {
    var p = P[i];
    p.life += dt;
    if (p.life >= p.max) { P.splice(i, 1); continue; }
    p.vy += (p.grav || 0) * dt;
    p.vx *= Math.pow(p.drag == null ? 1 : p.drag, dt * 60 / 60);
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.rot = (p.rot || 0) + (p.vr || 0) * dt;
    var fade = p.life > p.max * 0.7 ? 1 - (p.life - p.max * 0.7) / (p.max * 0.3) : 1;
    ctx.save();
    ctx.globalAlpha = Math.max(0, fade);
    ctx.translate(p.x, p.y);
    if (p.rot) ctx.rotate(p.rot);
    if (p.kind === 'coin') {
      ctx.fillStyle = '#f7c948';
      ctx.beginPath(); ctx.arc(0, 0, p.size / 2, 0, 6.283); ctx.fill();
      ctx.fillStyle = '#a86f00';
      ctx.font = 'bold ' + Math.round(p.size * 0.55) + 'px sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('xu', 0, 1);
    } else if (p.kind === 'fw') {
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(0, 0, p.size / 2, 0, 6.283); ctx.fill();
    } else if (p.kind === 'confetti') {
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
    } else if (p.kind === 'heart') {
      ctx.fillStyle = p.color;
      ctx.font = p.size + 'px sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('♥', 0, 0);
    } else if (p.kind === 'star') {
      ctx.fillStyle = p.color;
      ctx.beginPath();
      for (var k = 0; k < 5; k++) {
        var a = -Math.PI / 2 + k * 2 * Math.PI / 5;
        var r = k % 2 === 0 ? p.size : p.size * 0.45;
        ctx[k === 0 ? 'moveTo' : 'lineTo'](Math.cos(a) * r, Math.sin(a) * r);
      }
      ctx.closePath(); ctx.fill();
    } else if (p.kind === 'trail') {
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(0, 0, p.size / 2, 0, 6.283); ctx.fill();
    }
    ctx.restore();
  }
  rafId = requestAnimationFrame(loop);
}
function drawGlow(x, y, r, color) {
  var g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, color);
  g.addColorStop(1, 'rgba(255,215,106,0)');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(x, y, r, 0, 6.283); ctx.fill();
}
function addTrail(x, y) {
  add({ kind: 'trail', x: x + rand(-6, 6), y: y + rand(-6, 6), vx: 0, vy: 0, life: 0, max: 0.5, size: rand(4, 8), color: 'rgba(255,210,100,.8)', grav: 0, drag: 1 });
}
function startLoop() { if (!rafId && !hidden) { lastT = 0; rafId = requestAnimationFrame(loop); } }
function stopLoop() { if (rafId) { cancelAnimationFrame(rafId); rafId = 0; } }
document.addEventListener('visibilitychange', function () {
  hidden = document.hidden;
  if (hidden) { stopLoop(); P.length = 0; sparkFx = null; } else startLoop();
});

E.init = function (canvas) {
  cv = canvas;
  ctx = cv.getContext('2d');
  var dpr = Math.min(2, window.devicePixelRatio || 1);
  cv.width = Math.round(w * dpr);
  cv.height = Math.round(h * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  startLoop();
};

/* Mua xu roi quanh 1 diem (x,y theo toa do khung 720x1280). */
E.coins = function (n, x, y, wide) {
  for (var i = 0; i < n; i++) {
    var cx = wide ? rand(40, 680) : x + rand(-180, 180);
    add({ kind: 'coin', x: cx, y: y - rand(280, 420), vx: rand(-30, 30), vy: rand(60, 160), life: 0, max: rand(1.1, 1.9), size: rand(18, 30), grav: 420, drag: 0.99, rot: rand(0, 6.3), vr: rand(-6, 6) });
  }
};
/* Phap hoa: n chum, moi chum 16 tia no tu 1 diem. */
E.fireworks = function (n, x, y, wide) {
  for (var i = 0; i < n; i++) {
    var bx = wide ? rand(90, 630) : x + rand(-130, 130);
    var by = wide ? rand(260, 800) : y + rand(-220, -40);
    var color = FW_COLORS[Math.floor(Math.random() * FW_COLORS.length)];
    for (var k = 0; k < 16; k++) {
      var a = k / 16 * Math.PI * 2, sp = rand(90, 200);
      add({ kind: 'fw', x: bx, y: by, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0, max: rand(0.9, 1.4), size: rand(4, 8), color: color, grav: 60, drag: 0.94 });
    }
  }
  if (W.audio) W.audio.gift(Math.min(5, 2 + n));
};
E.confetti = function (n) {
  for (var i = 0; i < n; i++) {
    var left = Math.random() < 0.5;
    add({ kind: 'confetti', x: left ? rand(0, 40) : rand(680, 720), y: h + rand(0, 14), vx: (left ? 1 : -1) * rand(60, 300), vy: -rand(330, 620), life: 0, max: rand(1.6, 2.8), size: rand(5, 10), color: CONFETTI[Math.floor(Math.random() * CONFETTI.length)], grav: 300, drag: 0.7, rot: rand(0, 6.3), vr: rand(-6, 6) });
  }
};
E.hearts = function (n, x, y) {
  for (var i = 0; i < n; i++) {
    add({ kind: 'heart', x: x + rand(-50, 50), y: y + rand(-10, 30), vx: rand(-25, 25), vy: -rand(50, 120), life: 0, max: rand(1.4, 2.2), size: rand(16, 28), color: HEARTS[Math.floor(Math.random() * HEARTS.length)], grav: -20, drag: 1 });
  }
};
E.stars = function (n, x, y) {
  for (var i = 0; i < n; i++) {
    var a = rand(0, 6.283), sp = rand(40, 170);
    add({ kind: 'star', x: x + rand(-20, 20), y: y + rand(-10, 10), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 70, life: 0, max: rand(1.2, 2), size: rand(4, 8), color: '#ffd76a', grav: 60, drag: 1, rot: rand(0, 6.3), vr: rand(-3, 3) });
  }
};
/* Dom sang bay tu from toi to theo duong cong, xong goi done. */
E.spark = function (from, to, durMs, done) {
  var dist = Math.hypot(to[0] - from[0], to[1] - from[1]);
  sparkFx = {
    from: from, to: to,
    mid: [(from[0] + to[0]) / 2, Math.min(from[1], to[1]) - Math.min(150, dist * 0.35)],
    t: 0, dur: durMs || 750, done: done || null
  };
  startLoop();
};
/* Hieu ung qua theo tier 1..5 tai diem (x,y) tren khung. */
E.giftFx = function (tier, x, y) {
  var COINS = [0, 0, 12, 22, 36, 60];
  var FWS = [0, 0, 0, 0, 3, 8];
  if (tier < 2) return;
  E.coins(COINS[tier], x, y, tier === 5);
  if (FWS[tier]) E.fireworks(FWS[tier], x, y, tier === 5);
  if (tier >= 4 && W.audio) W.audio.celebrate();
};
})();
