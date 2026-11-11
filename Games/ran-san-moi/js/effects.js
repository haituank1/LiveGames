// Rắn Săn Mồi — effects.js (nv4). Pure Canvas 2D FX, no DOM, no external libs.
// Contract (RAN-SAN-MOI-SPEC.md §6): main.js calls exactly
//   effects.init(opts), effects.eat(x,y), effects.explode(x,y), effects.die(),
//   effects.spawn(x,y), effects.land(x,y,type), effects.update(dt), effects.render(ctx).
// Coordinates x,y are BOARD CELLS (0-based). Cell -> pixel conversion uses the
// layout main.js gives via init() (cellSize/origin/cols/rows); defaults match
// the spec (20x20 board, 34px cells). If the board layout changes, call init()
// again or the setters below — do NOT hardcode pixel positions here.
// Division of labour: board.js draws the falling apple/bomb itself + its ground
// shadow + its own squash-bounce; effects.land() only adds dust + debris + a
// ring at the landing cell (it never draws the apple/bomb). main.js calls
// land() once per item in `landed` from board.update() — only then does the
// item count (a falling item is not yet edible / not yet a danger).
// Coordinates x,y are BOARD CELLS (0-based). Cell -> pixel conversion uses the
// layout main.js gives via init() (cellSize/origin/cols/rows); defaults match
// the spec (20x20 board, 34px cells). If the board layout changes, call init()
// again or the setters below — do NOT hardcode pixel positions here.
// Optional extras (main.js may ignore them): getShakeOffset() + render(ctx, false)
// for a whole-scene shake, setCellSize/setOrigin/setBoard, clear(), count(), _diag().
// Budget: at most ~100 particles alive at once (oldest dropped first); floating
// texts are separate, at most 6. FX never covers the snake/board for long:
// bursts fade in <= 1.5s, the "Rắn đã thua!" text in 1.8s.
(function () {
  'use strict';

  var MAX_PARTICLES = 100;
  var MAX_TEXTS = 6;
  var TAU = Math.PI * 2;

  var cfg = {
    cellSize: 34, // px per cell (board ~680px at 20 cols)
    cols: 20, rows: 20,
    originX: 0, originY: 0, // px of the board's top-left corner on the canvas
    applePoints: 10, // shown in the "+10" floating text (spec §7 diemTao)
  };

  var P = []; // particles
  var T = []; // floating texts
  var shakeMag = 0, shakeT = 0, shakeDur = 1;
  var shakeOX = 0, shakeOY = 0; // offset computed in update(), used by render()

  function rand(a, b) { return a + Math.random() * (b - a); }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  // Pixel center of a board cell.
  function cellCenter(cx, cy) {
    return {
      x: cfg.originX + (cx + 0.5) * cfg.cellSize,
      y: cfg.originY + (cy + 0.5) * cfg.cellSize,
    };
  }

  function add(p) {
    // Hard budget: drop the oldest particle so the count never exceeds the cap.
    if (P.length >= MAX_PARTICLES) P.shift();
    P.push(p);
  }

  function addText(x, y, text, size, color, life) {
    if (T.length >= MAX_TEXTS) T.shift();
    T.push({ x: x, y: y, vy: -34, life: 0, max: life || 1.1, size: size, color: color, text: text });
  }

  function burst(x, y, n, colors, speed, life, size, kind, grav) {
    for (var i = 0; i < n; i++) {
      var a = rand(0, TAU), sp = rand(speed * 0.35, speed);
      add({
        kind: kind || 'spark', x: x, y: y,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - speed * 0.25,
        life: 0, max: rand(life * 0.6, life),
        size: rand(size * 0.6, size * 1.3),
        color: colors[(Math.random() * colors.length) | 0],
        grav: grav == null ? 140 : grav, drag: 1.6, rot: rand(0, TAU), vr: rand(-6, 6),
      });
    }
  }

  function ring(x, y, size, color, life) {
    add({ kind: 'ring', x: x, y: y, vx: 0, vy: 0, life: 0, max: life || 0.45, size: size, color: color, grav: 0, drag: 0, rot: 0, vr: 0 });
  }

  function flash(x, y, size, life) {
    add({ kind: 'flash', x: x, y: y, vx: 0, vy: 0, life: 0, max: life || 0.3, size: size, color: '#fff7d6', grav: 0, drag: 0, rot: 0, vr: 0 });
  }

  function landDrop(p) {
    // A falling gift item lands: ring + sparkles + a soft poof.
    ring(p.tx, p.ty, cfg.cellSize * 1.1, '#ffd54f', 0.4);
    burst(p.tx, p.ty, 6, ['#ffd54f', '#fff176', '#ffffff'], cfg.cellSize * 4, 0.5, cfg.cellSize * 0.1, 'spark', 40);
    add({ kind: 'poof', x: p.tx, y: p.ty, vx: 0, vy: 0, life: 0, max: 0.35,
      size: cfg.cellSize * 0.55, color: '#fff8e1', grav: 0, drag: 0, rot: 0, vr: 0 });
  }
  function shake(mag, dur) {
    // Strongest shake wins; a new shake never shortens a bigger one in progress.
    if (mag >= shakeMag || shakeT <= 0) { shakeMag = mag; shakeT = dur; shakeDur = dur; }
  }

  var effects = {
    // main.js calls this once after the board layout is known.
    // opts: { cellSize, cols, rows, originX, originY, applePoints } (all optional).
    init: function (opts) {
      if (opts) {
        if (opts.cellSize > 0) cfg.cellSize = opts.cellSize;
        if (opts.cols > 0) cfg.cols = opts.cols;
        if (opts.rows > 0) cfg.rows = opts.rows;
        if (opts.originX != null) cfg.originX = opts.originX;
        if (opts.originY != null) cfg.originY = opts.originY;
        if (opts.applePoints != null) cfg.applePoints = opts.applePoints;
      }
      return effects;
    },
    setCellSize: function (px) { if (px > 0) cfg.cellSize = px; return effects; },
    setOrigin: function (x, y) { cfg.originX = x; cfg.originY = y; return effects; },
    setBoard: function (cols, rows) { if (cols > 0) cfg.cols = cols; if (rows > 0) cfg.rows = rows; return effects; },

    // Apple eaten at cell (x,y): red/green chunks fly + "+10" floats up.
    // points overrides cfg.applePoints for this one call.
    eat: function (x, y, points) {
      var c = cellCenter(x, y);
      var s = cfg.cellSize;
      burst(c.x, c.y, 10, ['#ff5252', '#e53935', '#ff8a80'], s * 7, 0.7, s * 0.22, 'chunk', 340);
      burst(c.x, c.y, 3, ['#66bb6a', '#43a047'], s * 5, 0.6, s * 0.16, 'chunk', 300);
      burst(c.x, c.y, 4, ['#ffd54f', '#fff176'], s * 6, 0.5, s * 0.12, 'spark', 60);
      addText(c.x, c.y - s * 0.4, '+' + (points != null ? points : cfg.applePoints),
        Math.round(s * 0.62), '#ffd54f', 1.1);
    },

    // Bomb hit at cell (x,y): fire + smoke + flash + ring + a light screen shake.
    explode: function (x, y) {
      var c = cellCenter(x, y);
      var s = cfg.cellSize;
      flash(c.x, c.y, s * 2.6, 0.3);
      ring(c.x, c.y, s * 2.2, '#ffb74d', 0.45);
      burst(c.x, c.y, 14, ['#ff9800', '#ff5722', '#ffeb3b', '#fff3e0'], s * 9, 0.8, s * 0.24, 'spark', 200);
      for (var i = 0; i < 7; i++) {
        add({ kind: 'smoke', x: c.x + rand(-s * 0.3, s * 0.3), y: c.y + rand(-s * 0.2, s * 0.2),
          vx: rand(-14, 14), vy: rand(-55, -18), life: 0, max: rand(0.9, 1.5),
          size: rand(s * 0.3, s * 0.5), color: '#9e9e9e', grav: 0, drag: 0.4, rot: 0, vr: 0 });
      }
      shake(5, 0.35);
    },

    // Snake died (no coords in the contract, so the blast is centered on the
    // board): big fire + smoke + flash + rings + "Rắn đã thua!" + strong shake.
    // main.js respawns the snake after config thoiGianHoiSinh (3s); the FX is
    // gone long before that.
    die: function () {
      var cx = cfg.originX + (cfg.cols * cfg.cellSize) / 2;
      var cy = cfg.originY + (cfg.rows * cfg.cellSize) / 2;
      var s = cfg.cellSize;
      flash(cx, cy, s * 6, 0.4);
      ring(cx, cy, s * 4.5, '#ff8a65', 0.6);
      ring(cx, cy, s * 3, '#ffd54f', 0.5);
      burst(cx, cy, 22, ['#ff9800', '#ff5722', '#ffeb3b', '#fff3e0', '#ffc107'], s * 12, 1.0, s * 0.28, 'spark', 220);
      for (var i = 0; i < 10; i++) {
        add({ kind: 'smoke', x: cx + rand(-s, s), y: cy + rand(-s * 0.6, s * 0.6),
          vx: rand(-20, 20), vy: rand(-70, -25), life: 0, max: rand(1.0, 1.6),
          size: rand(s * 0.4, s * 0.7), color: '#8d8d8d', grav: 0, drag: 0.4, rot: 0, vr: 0 });
      }
      addText(cx, cy - s * 0.5, 'Rắn đã thua!', Math.round(s * 1.35), '#ffffff', 1.8);
      shake(8, 0.6);
    },

    // A gift dropped an apple/bomb at cell (x,y): a glowing dot falls from
    // 3 cells above into the cell, then a gold ring + sparkles mark the landing.
    spawn: function (x, y) {
      var c = cellCenter(x, y);
      var s = cfg.cellSize;
      add({ kind: 'drop', x: c.x, y: c.y - 3 * s, tx: c.x, ty: c.y,
        vx: 0, vy: s * 15, life: 0, max: 2, size: s * 0.22, color: '#ffd54f',
        grav: 0, drag: 0, rot: 0, vr: 0 });
    },

    // An apple/bomb JUST touched the ground at cell (x,y): dust + debris bounce
    // + a small ring. type is 'apple' or 'bomb' (anything else behaves like
    // 'apple'). Only dust/debris/ring here — board.js draws the item itself,
    // its shadow and its own bounce, so nothing is drawn twice.
    land: function (x, y, type) {
      var c = cellCenter(x, y);
      var s = cfg.cellSize;
      var gy = c.y + s * 0.3; // ground line of the cell (dust stays low)
      var accent = type === 'bomb' ? '#ff8a65' : '#aed581';
      var i;
      for (i = 0; i < 7; i++) {
        add({ kind: 'dust', x: c.x + rand(-s * 0.35, s * 0.35), y: gy + rand(-s * 0.08, s * 0.08),
          vx: rand(-s * 4.4, s * 4.4), vy: rand(-s * 1.8, -s * 0.3), life: 0, max: rand(0.5, 0.8),
          size: rand(s * 0.12, s * 0.24), color: (Math.random() < 0.5 ? '#cbb59a' : '#b8a88f'),
          grav: 260, drag: 2.0, rot: 0, vr: 0 });
      }
      ring(c.x, gy, s * 1.0, accent, 0.35);
      for (i = 0; i < 2; i++) {
        add({ kind: 'bounce', x: c.x + rand(-s * 0.2, s * 0.2), y: gy,
          vx: rand(-s * 1.2, s * 1.2), vy: rand(-s * 6, -s * 4.2), life: 0, max: rand(0.4, 0.55),
          size: rand(s * 0.07, s * 0.11), color: '#d7ccc8', grav: 520, drag: 0.3, rot: 0, vr: 0 });
      }
      burst(c.x, gy - s * 0.1, 2, [accent, '#ffffff'], s * 2.5, 0.4, s * 0.09, 'spark', 60);
    },

    // dt: seconds since the last frame (clamped, so a hidden tab cannot jump FX).
    update: function (dt) {
      dt = clamp(dt || 0, 0, 0.05);
      var i, p, k;
      if (shakeT > 0) {
        shakeT = Math.max(0, shakeT - dt);
        k = shakeMag * Math.max(0, shakeT / shakeDur);
        shakeOX = rand(-k, k);
        shakeOY = rand(-k, k);
        if (shakeT <= 0) { shakeOX = 0; shakeOY = 0; shakeMag = 0; }
      }
      for (i = P.length - 1; i >= 0; i--) {
        p = P[i];
        p.life += dt;
        if (p.life >= p.max) {
          if (p.kind === 'drop') landDrop(p); // safety net if it never reached ty
          P.splice(i, 1);
          continue;
        }
        var dragK = Math.max(0, 1 - p.drag * dt);
        p.vx *= dragK; p.vy *= dragK;
        p.vy += p.grav * dt;
        p.x += p.vx * dt; p.y += p.vy * dt;
        p.rot += p.vr * dt;
        if (p.kind === 'drop' && p.y >= p.ty) { landDrop(p); P.splice(i, 1); }
      }
      for (i = T.length - 1; i >= 0; i--) {
        T[i].life += dt;
        T[i].y += T[i].vy * dt;
        if (T[i].life >= T[i].max) T.splice(i, 1);
      }
    },

    // Draw all live FX on ctx. main.js calls this AFTER board.render + snake.render.
    // applyShake (default true) translates the FX layer by the current shake
    // offset; pass false only if main.js already translated the whole scene by
    // getShakeOffset() itself.
    render: function (ctx, applyShake) {
      if (!ctx) return;
      ctx.save();
      if (applyShake !== false && (shakeOX !== 0 || shakeOY !== 0)) ctx.translate(shakeOX, shakeOY);
      var i, p, f, r;
      for (i = 0; i < P.length; i++) {
        p = P[i];
        f = 1 - p.life / p.max; // 1 -> 0 over the particle's life
        if (p.kind === 'spark') {
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = f;
          ctx.fillStyle = p.color;
          ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(0.5, p.size * (0.5 + f * 0.5)), 0, TAU); ctx.fill();
          ctx.globalCompositeOperation = 'source-over';
        } else if (p.kind === 'smoke') {
          ctx.globalAlpha = 0.28 * Math.sin(Math.min(1, p.life / p.max) * Math.PI);
          ctx.fillStyle = p.color;
          ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (1 + (p.life / p.max) * 1.4), 0, TAU); ctx.fill();
        } else if (p.kind === 'chunk') {
          ctx.globalAlpha = f;
          ctx.fillStyle = p.color;
          ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.75); ctx.restore();
        } else if (p.kind === 'ring') {
          ctx.globalAlpha = f;
          ctx.strokeStyle = p.color;
          ctx.lineWidth = 1 + 3 * f;
          ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (0.25 + 0.75 * (p.life / p.max)), 0, TAU); ctx.stroke();
        } else if (p.kind === 'flash') {
          r = p.size * (0.4 + 0.6 * (p.life / p.max));
          var g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
          g.addColorStop(0, 'rgba(255,247,214,' + (0.75 * f).toFixed(3) + ')');
          g.addColorStop(1, 'rgba(255,247,214,0)');
          ctx.globalAlpha = 1;
          ctx.fillStyle = g;
          ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, TAU); ctx.fill();
        } else if (p.kind === 'drop') {
          ctx.globalAlpha = 0.9;
          ctx.strokeStyle = 'rgba(255,213,79,0.55)';
          ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(p.x, p.y - cfg.cellSize * 0.9); ctx.lineTo(p.x, p.y); ctx.stroke();
          ctx.globalCompositeOperation = 'lighter';
          ctx.fillStyle = p.color;
          ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, TAU); ctx.fill();
          ctx.globalCompositeOperation = 'source-over';
        } else if (p.kind === 'dust') {
          // Ground dust: soft tan puff, low alpha, grows a little as it settles.
          ctx.globalAlpha = 0.35 * Math.sin(Math.min(1, p.life / p.max) * Math.PI);
          ctx.fillStyle = p.color;
          ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (1 + (p.life / p.max) * 0.9), 0, TAU); ctx.fill();
        } else if (p.kind === 'bounce') {
          // Debris that jumps up on impact and falls back down.
          ctx.globalAlpha = f;
          ctx.fillStyle = p.color;
          ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, TAU); ctx.fill();
        } else if (p.kind === 'poof') {
          ctx.globalAlpha = 0.55 * f;
          ctx.fillStyle = p.color;
          ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (0.5 + 0.5 * (p.life / p.max)), 0, TAU); ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
      for (i = 0; i < T.length; i++) {
        var t = T[i];
        var tf = t.life / t.max;
        ctx.globalAlpha = tf < 0.6 ? 1 : 1 - (tf - 0.6) / 0.4;
        ctx.font = '800 ' + t.size + 'px "Segoe UI", system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.lineWidth = Math.max(3, Math.round(t.size / 10));
        ctx.strokeStyle = 'rgba(0,0,0,0.55)';
        ctx.strokeText(t.text, t.x, t.y);
        ctx.fillStyle = t.color;
        ctx.fillText(t.text, t.x, t.y);
      }
      ctx.globalAlpha = 1;
      ctx.restore();
    },

    // Current shake offset in px (0,0 when idle). main.js may translate the
    // whole scene by this before drawing board+snake; then call render(ctx, false).
    getShakeOffset: function () { return { x: shakeOX, y: shakeOY }; },

    // Wipe all live FX (e.g. on game reset). Shake is cancelled too.
    clear: function () { P.length = 0; T.length = 0; shakeMag = 0; shakeT = 0; shakeOX = 0; shakeOY = 0; },

    // Live particle + text count (0 when everything faded out).
    count: function () { return P.length + T.length; },

    // Diagnostics for tests / nv6: counts by kind, live texts, shake state.
    _diag: function () {
      var byKind = {};
      for (var i = 0; i < P.length; i++) byKind[P[i].kind] = (byKind[P[i].kind] || 0) + 1;
      return { n: P.length + T.length, particles: P.length, texts: T.length, byKind: byKind,
        shake: { mag: shakeMag, t: +(shakeT.toFixed(3)) } };
    },
  };

  if (typeof window !== 'undefined') { window.effects = effects; window.RanEffects = effects; }
  if (typeof module !== 'undefined' && module.exports) { module.exports = effects; }
})();
