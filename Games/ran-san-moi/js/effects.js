// Rắn Săn Mồi — effects.js (nv4, bản 3D). Three.js r128, KHÔNG tự tạo
// renderer/camera/đèn — chỉ thêm/bớt object FX vào scene chung của main.js.
// Contract (RAN-SAN-MOI-3D.md §4, giữ nguyên API bản 2D): main.js gọi đúng
//   effects.init(opts), effects.eat(x,y), effects.explode(x,y), effects.die(),
//   effects.spawn(x,y), effects.land(x,y,type), effects.update(dt),
//   effects.render(scene), effects.count().
// Tọa độ x,y vẫn là Ô TRÊN BÀN (0-based). Đổi sang vị trí 3D theo công thức
// spec §1: (gridX + (x+0.5)*cell, 0, gridY + (y+0.5)*cell) — bàn nằm ngang
// mặt XZ, Y là chiều cao, mặt đất Y=0. main.js truyền đúng số đo của board
// qua init(), vd: effects.init({ scene, cell: board.cell, gridX: board.gridX,
// gridY: board.gridY, cols: board.n, rows: board.n }). Mặc định (cell 34,
// bàn 680×680 căn giữa gốc) chỉ để test độc lập — game thật PHẢI truyền số
// đo thật, vì board 3D có thể dùng đơn vị khác.
// Scene: truyền qua init({scene}) hoặc setScene(scene) hoặc render(scene)
// (render nhận scene mới thì dùng scene đó). THREE lấy từ init({THREE})
// hoặc window.THREE (three.min.js tự host, load trước effects.js).
// Hạt: 1 THREE.Sprite / hạt (texture chấm tròn dùng chung, material riêng để
// fade từng hạt), ring là Mesh RingGeometry nằm phẳng trên mặt bàn, chữ là
// Sprite với CanvasTexture. Không tự vẽ táo/bom/bóng — board.js giữ phần đó;
// land() chỉ thêm bụi/nảy/vòng ở ô đích (như bản 2D).
// Rung camera: effects KHÔNG chạm camera — main.js đọc effects.getShakeOffset()
// mỗi frame rồi cộng vào vị trí camera (đơn vị world, giống số px bản 2D).
// Budget: tối đa ~100 hạt (thừa thì bỏ hạt cũ nhất, dispose material); text
// tối đa 6; mọi object FX nằm trong 1 Group 'ran-fx' để dọn sạch không rò.
(function () {
  'use strict';

  var MAX_PARTICLES = 100;
  var MAX_TEXTS = 6;
  var TAU = Math.PI * 2;

  var cfg = {
    cell: 34, // 1 ô theo đơn vị world (bàn 680 với 20 ô)
    cols: 20, rows: 20,
    gridX: -340, gridY: -340, // góc bàn trong world (mặc định: bàn căn giữa gốc)
    applePoints: 10, // chữ "+10" (spec §7 diemTao)
  };

  var providedTHREE = null;
  var scene = null;
  var group = null; // THREE.Group 'ran-fx', chứa mọi object FX
  var dotTex = null; // texture chấm tròn dùng chung cho mọi sprite hạt
  var warnedNoThree = false;

  var P = []; // sprite particles {kind, spr, vx, vy, vz, life, max, size0, size1, grav, drag, op0, ground}
  var R = []; // rings {mesh, life, max, r0, r1}
  var T = []; // text sprites {spr, tex, vy, life, max}
  var B = []; // light beams {mesh, life, max, drop}
  var pendingLand = []; // landing bursts queued during update(), run after the loops
  // (landBurst adds particles — adding mid-iteration would shift P under the
  // backward loop and orphan sprites in the scene, so bursts are queued.)
  var shakeMag = 0, shakeT = 0, shakeDur = 1;
  var shakeOX = 0, shakeOY = 0;

  function rand(a, b) { return a + Math.random() * (b - a); }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  function getTHREE() {
    if (providedTHREE) return providedTHREE;
    if (typeof window !== 'undefined' && window.THREE) return window.THREE;
    if (typeof globalThis !== 'undefined' && globalThis.THREE) return globalThis.THREE;
    return null;
  }

  function warnNoThree() {
    if (!warnedNoThree) {
      warnedNoThree = true;
      if (typeof console !== 'undefined' && console.warn) console.warn('[ran-fx] THREE chua co — hieu ung bi bo qua (can three.min.js truoc effects.js)');
    }
  }

  // World position of a cell center (ground Y=0).
  function cellPos(cx, cy) {
    return {
      x: cfg.gridX + (cx + 0.5) * cfg.cell,
      y: 0,
      z: cfg.gridY + (cy + 0.5) * cfg.cell,
    };
  }

  function boardCenter() {
    return {
      x: cfg.gridX + (cfg.cols * cfg.cell) / 2,
      y: 0,
      z: cfg.gridY + (cfg.rows * cfg.cell) / 2,
    };
  }

  function ensureGroup() {
    var TH = getTHREE();
    if (!TH) { warnNoThree(); return null; }
    if (!group) {
      group = new TH.Group();
      group.name = 'ran-fx';
    }
    if (scene && group.parent !== scene) scene.add(group);
    return group;
  }

  // Shared soft-dot texture for particle sprites (canvas radial gradient).
  // Falls back to null (plain square sprite) when no document/canvas exists.
  function dotTexture() {
    if (dotTex) return dotTex;
    var TH = getTHREE();
    if (!TH || typeof document === 'undefined') return null;
    try {
      var cv = document.createElement('canvas');
      cv.width = 64; cv.height = 64;
      var c2 = cv.getContext('2d');
      var g = c2.createRadialGradient(32, 32, 0, 32, 32, 32);
      g.addColorStop(0, 'rgba(255,255,255,1)');
      g.addColorStop(0.4, 'rgba(255,255,255,0.6)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      c2.fillStyle = g;
      c2.fillRect(0, 0, 64, 64);
      dotTex = new TH.CanvasTexture(cv);
    } catch (e) { dotTex = null; }
    return dotTex;
  }

  function makeSprite(color, size, additive, opacity) {
    var TH = getTHREE();
    var mat = new TH.SpriteMaterial({
      map: dotTexture(), color: color, transparent: true,
      opacity: opacity == null ? 1 : opacity,
      blending: additive ? TH.AdditiveBlending : TH.NormalBlending,
      depthWrite: false,
    });
    var spr = new TH.Sprite(mat);
    spr.scale.set(size * 2, size * 2, 1); // size = radius, scale = diameter
    return spr;
  }

  // Text sprite (canvas texture, crisp text that floats in 3D). height = world height.
  function makeTextSprite(text, height, color) {
    var TH = getTHREE();
    var spr = null, tex = null;
    try {
      var pad = 24, fontPx = 96;
      var cv = document.createElement('canvas');
      var c2 = cv.getContext('2d');
      c2.font = '800 ' + fontPx + 'px "Segoe UI", system-ui, sans-serif';
      var w = Math.ceil(c2.measureText(text).width) + pad * 2;
      cv.width = w; cv.height = fontPx + pad * 2;
      c2.font = '800 ' + fontPx + 'px "Segoe UI", system-ui, sans-serif';
      c2.textAlign = 'center'; c2.textBaseline = 'middle';
      c2.lineWidth = 12; c2.strokeStyle = 'rgba(0,0,0,0.6)';
      c2.strokeText(text, w / 2, cv.height / 2);
      c2.fillStyle = color;
      c2.fillText(text, w / 2, cv.height / 2);
      tex = new TH.CanvasTexture(cv);
      var mat = new TH.SpriteMaterial({ map: tex, transparent: true, depthWrite: false });
      spr = new TH.Sprite(mat);
      spr.scale.set(height * (w / cv.height), height, 1);
    } catch (e) {
      spr = makeSprite(color, height / 2, false, 1); // fallback: plain dot
    }
    return { spr: spr, tex: tex };
  }

  function disposeObj(o) {
    if (!o) return;
    if (o.spr) {
      if (o.spr.material) o.spr.material.dispose();
      if (o.tex) o.tex.dispose();
    }
    if (o.mesh) {
      if (o.mesh.material) o.mesh.material.dispose();
      if (o.mesh.geometry) o.mesh.geometry.dispose();
    }
  }

  function removeFromGroup(o) {
    if (group && o) {
      if (o.spr) group.remove(o.spr);
      if (o.mesh) group.remove(o.mesh);
    }
    disposeObj(o);
  }

  function add(p) {
    // Hard budget: drop the oldest particle so the count never exceeds the cap.
    if (!ensureGroup()) return;
    if (P.length >= MAX_PARTICLES) removeFromGroup(P.shift());
    p.spr.position.set(p.x, p.y, p.z); // visible at the right place even before update()
    group.add(p.spr);
    P.push(p);
  }

  function addText(x, y, z, text, height, color, life) {
    if (!ensureGroup()) return;
    if (T.length >= MAX_TEXTS) {
      var old = T.shift();
      removeFromGroup(old);
    }
    var t = makeTextSprite(text, height, color);
    t.spr.position.set(x, y, z);
    group.add(t.spr);
    T.push({ spr: t.spr, tex: t.tex, vy: cfg.cell * 1.0, life: 0, max: life || 1.1 });
  }

  // Burst of sprites flying in 3D (random sphere directions + upward bias).
  // speed/life/size/grav are in world units (cell-relative, like the 2D px values).
  function burst(x, y, z, n, colors, speed, life, size, kind, grav, upBias) {
    for (var i = 0; i < n; i++) {
      var th = rand(0, TAU), ph = Math.acos(rand(-1, 1));
      var sp = rand(speed * 0.35, speed);
      var col = colors[(Math.random() * colors.length) | 0];
      var additive = kind === 'spark' || kind === 'flash';
      var sz = rand(size * 0.6, size * 1.3);
      add({
        kind: kind || 'spark', spr: makeSprite(col, sz, additive, 1),
        x: x, y: y, z: z,
        vx: Math.sin(ph) * Math.cos(th) * sp,
        vy: Math.cos(ph) * sp + (upBias == null ? speed * 0.35 : upBias),
        vz: Math.sin(ph) * Math.sin(th) * sp,
        life: 0, max: rand(life * 0.6, life),
        size0: sz, size1: kind === 'smoke' ? sz * 2.4 : sz * 0.7,
        grav: grav == null ? 140 : grav, drag: 1.6,
        op0: kind === 'smoke' ? 0.28 : 1, ground: true,
      });
    }
  }

  // Flat ring mesh on the board (XZ plane), expands r0 -> r1 then fades.
  function ring(x, z, r0, r1, color, life) {
    if (!ensureGroup()) return;
    var TH = getTHREE();
    var geo = new TH.RingGeometry(0.85, 1, 40);
    var mat = new TH.MeshBasicMaterial({
      color: color, transparent: true, opacity: 1,
      side: TH.DoubleSide, depthWrite: false,
    });
    var mesh = new TH.Mesh(geo, mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(x, 0.06, z);
    mesh.scale.set(r0, r0, 1);
    group.add(mesh);
    R.push({ mesh: mesh, life: 0, max: life || 0.45, r0: r0, r1: r1 });
  }

  function flash(x, y, z, radius, life) {
    add({
      kind: 'flash', spr: makeSprite('#fff7d6', radius * 0.4, true, 0.75),
      x: x, y: y, z: z, vx: 0, vy: 0, vz: 0, life: 0, max: life || 0.3,
      size0: radius * 0.4, size1: radius, grav: 0, drag: 0, op0: 0.75, ground: false,
    });
  }

  // Landing burst shared by spawn()'s drop and the land() dust (small version).
  // Queue it instead of running immediately when called from update(): adding
  // particles mid-iteration would shift P and orphan sprites in the scene.
  function queueLandBurst(x, z) { pendingLand.push({ x: x, z: z }); }
  function landBurst(x, z, accent) {
    var s = cfg.cell;
    ring(x, z, s * 0.3, s * 1.1, '#ffd54f', 0.4);
    burst(x, s * 0.15, z, 6, ['#ffd54f', '#fff176', '#ffffff'], s * 4, 0.5, s * 0.1, 'spark', 40, s * 2);
    add({
      kind: 'poof', spr: makeSprite('#fff8e1', s * 0.28, false, 0.55),
      x: x, y: s * 0.15, z: z, vx: 0, vy: s * 0.4, vz: 0, life: 0, max: 0.35,
      size0: s * 0.28, size1: s * 0.55, grav: 0, drag: 0, op0: 0.55, ground: false,
    });
  }

  function shake(mag, dur) {
    // Strongest shake wins; a new shake never shortens a bigger one in progress.
    if (mag >= shakeMag || shakeT <= 0) { shakeMag = mag; shakeT = dur; shakeDur = dur; }
  }

  var effects = {
    // main.js calls this once after the board layout is known.
    // opts: { scene, THREE, cell, gridX, gridY, cols, rows,
    //         cellSize (=cell), originX (=gridX), originY (=gridY), applePoints }.
    init: function (opts) {
      if (opts) {
        if (opts.THREE) providedTHREE = opts.THREE;
        if (opts.scene) effects.setScene(opts.scene);
        if (opts.cell > 0) cfg.cell = opts.cell;
        if (opts.cellSize > 0) cfg.cell = opts.cellSize;
        if (opts.cols > 0) cfg.cols = opts.cols;
        if (opts.rows > 0) cfg.rows = opts.rows;
        if (opts.gridX != null) cfg.gridX = opts.gridX;
        if (opts.gridY != null) cfg.gridY = opts.gridY;
        if (opts.originX != null) cfg.gridX = opts.originX;
        if (opts.originY != null) cfg.gridY = opts.originY;
        if (opts.applePoints != null) cfg.applePoints = opts.applePoints;
      }
      return effects;
    },

    // Attach (or switch) the shared scene. FX objects live in group 'ran-fx'.
    setScene: function (sc) {
      if (!sc) return effects;
      if (scene && group && group.parent === scene) scene.remove(group);
      scene = sc;
      ensureGroup(); // creates group 'ran-fx' if needed + attaches it now
      return effects;
    },
    setCellSize: function (px) { if (px > 0) cfg.cell = px; return effects; },
    setOrigin: function (x, z) { cfg.gridX = x; cfg.gridY = z; return effects; },
    setBoard: function (cols, rows) { if (cols > 0) cfg.cols = cols; if (rows > 0) cfg.rows = rows; return effects; },

    // Apple eaten at cell (x,y): red/green chunks fly in 3D + "+10" floats up.
    // points overrides cfg.applePoints for this one call.
    eat: function (x, y, points) {
      if (!getTHREE()) { warnNoThree(); return; }
      var c = cellPos(x, y);
      var s = cfg.cell;
      burst(c.x, s * 0.3, c.z, 10, ['#ff5252', '#e53935', '#ff8a80'], s * 7, 0.7, s * 0.22, 'chunk', s * 10, s * 2.5);
      burst(c.x, s * 0.3, c.z, 3, ['#66bb6a', '#43a047'], s * 5, 0.6, s * 0.16, 'chunk', s * 9, s * 2);
      burst(c.x, s * 0.3, c.z, 4, ['#ffd54f', '#fff176'], s * 6, 0.5, s * 0.12, 'spark', s * 2, s * 2.5);
      addText(c.x, s * 0.9, c.z, '+' + (points != null ? points : cfg.applePoints),
        Math.round(s * 0.62), '#ffd54f', 1.1);
    },

    // Bomb hit at cell (x,y): fire + smoke rising + flash + ring + light camera shake.
    explode: function (x, y) {
      if (!getTHREE()) { warnNoThree(); return; }
      var c = cellPos(x, y);
      var s = cfg.cell;
      flash(c.x, s * 0.5, c.z, s * 2.6, 0.3);
      ring(c.x, c.z, s * 0.4, s * 2.2, '#ffb74d', 0.45);
      burst(c.x, s * 0.4, c.z, 14, ['#ff9800', '#ff5722', '#ffeb3b', '#fff3e0'], s * 9, 0.8, s * 0.24, 'spark', s * 6, s * 4);
      for (var i = 0; i < 7; i++) {
        add({
          kind: 'smoke', spr: makeSprite('#9e9e9e', rand(s * 0.3, s * 0.5), false, 0.28),
          x: c.x + rand(-s * 0.3, s * 0.3), y: s * 0.3, z: c.z + rand(-s * 0.3, s * 0.3),
          vx: rand(-s * 0.4, s * 0.4), vy: rand(s * 0.6, s * 1.6), vz: rand(-s * 0.4, s * 0.4),
          life: 0, max: rand(0.9, 1.5),
          size0: rand(s * 0.3, s * 0.5), size1: rand(s * 0.7, s * 1.1),
          grav: 0, drag: 0.4, op0: 0.28, ground: false,
        });
      }
      shake(5, 0.35);
    },

    // Snake died (no coords in the contract, so the blast is centered on the
    // board): big fire + smoke + flash + rings + "Rắn đã thua!" + strong shake.
    // main.js respawns the snake after config thoiGianHoiSinh (3s); the FX is
    // gone long before that.
    die: function () {
      if (!getTHREE()) { warnNoThree(); return; }
      var bc = boardCenter();
      var s = cfg.cell;
      flash(bc.x, s * 1, bc.z, s * 6, 0.4);
      ring(bc.x, bc.z, s * 0.6, s * 4.5, '#ff8a65', 0.6);
      ring(bc.x, bc.z, s * 0.4, s * 3, '#ffd54f', 0.5);
      burst(bc.x, s * 0.8, bc.z, 22, ['#ff9800', '#ff5722', '#ffeb3b', '#fff3e0', '#ffc107'], s * 12, 1.0, s * 0.28, 'spark', s * 6.5, s * 5);
      for (var i = 0; i < 10; i++) {
        add({
          kind: 'smoke', spr: makeSprite('#8d8d8d', rand(s * 0.4, s * 0.7), false, 0.28),
          x: bc.x + rand(-s, s), y: s * 0.5, z: bc.z + rand(-s, s),
          vx: rand(-s * 0.6, s * 0.6), vy: rand(s * 0.8, s * 2), vz: rand(-s * 0.6, s * 0.6),
          life: 0, max: rand(1.0, 1.6),
          size0: rand(s * 0.4, s * 0.7), size1: rand(s * 0.9, s * 1.4),
          grav: 0, drag: 0.4, op0: 0.28, ground: false,
        });
      }
      addText(bc.x, s * 2, bc.z, 'Rắn đã thua!', Math.round(s * 1.35), '#ffffff', 1.8);
      shake(8, 0.6);
    },

    // A gift dropped an apple/bomb at cell (x,y): a glowing dot falls from
    // 3 cells above into the cell, with a light beam, then a gold ring +
    // sparkles mark the landing. (Board.js draws the falling item itself;
    // this is only the FX: falling glow + beam + landing burst.)
    spawn: function (x, y) {
      if (!getTHREE()) { warnNoThree(); return; }
      var TH = getTHREE();
      var c = cellPos(x, y);
      var s = cfg.cell;
      var h = 3 * s;
      var beam = null;
      if (ensureGroup()) {
        var geo = new TH.CylinderGeometry(s * 0.12, s * 0.12, h, 12, 1, true);
        var mat = new TH.MeshBasicMaterial({
          color: '#ffd54f', transparent: true, opacity: 0.22,
          blending: TH.AdditiveBlending, depthWrite: false, side: TH.DoubleSide,
        });
        beam = new TH.Mesh(geo, mat);
        beam.position.set(c.x, h / 2, c.z);
        group.add(beam);
        B.push({ mesh: beam, life: 0, max: 2, drop: null });
      }
      var drop = {
        kind: 'drop', spr: makeSprite('#ffd54f', s * 0.22, true, 0.9),
        x: c.x, y: h, z: c.z, tx: c.x, tz: c.z,
        vx: 0, vy: -s * 15, vz: 0, life: 0, max: 2,
        size0: s * 0.22, size1: s * 0.22, grav: 0, drag: 0, op0: 0.9, ground: false,
        beam: B.length ? B[B.length - 1] : null,
      };
      if (drop.beam) drop.beam.drop = drop;
      add(drop);
    },

    // An apple/bomb JUST touched the ground at cell (x,y): dust + debris bounce
    // + a small ring. type is 'apple' or 'bomb' (anything else behaves like
    // 'apple'). Only dust/debris/ring here — board.js draws the item itself,
    // its shadow and its own bounce, so nothing is drawn twice.
    land: function (x, y, type) {
      if (!getTHREE()) { warnNoThree(); return; }
      var c = cellPos(x, y);
      var s = cfg.cell;
      var accent = type === 'bomb' ? '#ff8a65' : '#aed581';
      var i;
      for (i = 0; i < 7; i++) {
        add({
          kind: 'dust', spr: makeSprite((Math.random() < 0.5 ? '#cbb59a' : '#b8a88f'), rand(s * 0.12, s * 0.24), false, 0.35),
          x: c.x + rand(-s * 0.35, s * 0.35), y: s * 0.1, z: c.z + rand(-s * 0.35, s * 0.35),
          vx: rand(-s * 4.4, s * 4.4), vy: rand(-s * 0.3, s * 0.6), vz: rand(-s * 4.4, s * 4.4),
          life: 0, max: rand(0.5, 0.8),
          size0: rand(s * 0.12, s * 0.24), size1: rand(s * 0.22, s * 0.4),
          grav: s * 7.6, drag: 2.0, op0: 0.35, ground: true,
        });
      }
      ring(c.x, c.z, s * 0.2, s * 1.0, accent, 0.35);
      for (i = 0; i < 2; i++) {
        add({
          kind: 'bounce', spr: makeSprite('#d7ccc8', rand(s * 0.07, s * 0.11), false, 1),
          x: c.x + rand(-s * 0.2, s * 0.2), y: s * 0.1, z: c.z + rand(-s * 0.2, s * 0.2),
          vx: rand(-s * 1.2, s * 1.2), vy: rand(s * 4.2, s * 6), vz: rand(-s * 1.2, s * 1.2),
          life: 0, max: rand(0.4, 0.55),
          size0: rand(s * 0.07, s * 0.11), size1: rand(s * 0.07, s * 0.11),
          grav: s * 15, drag: 0.3, op0: 1, ground: true,
        });
      }
      burst(c.x, s * 0.15, c.z, 2, [accent, '#ffffff'], s * 2.5, 0.4, s * 0.09, 'spark', s * 2, s * 1.5);
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
          if (p.kind === 'drop') queueLandBurst(p.tx, p.tz); // safety net
          if (p.beam) killBeam(p.beam);
          removeFromGroup(p);
          P.splice(i, 1);
          continue;
        }
        var dragK = Math.max(0, 1 - p.drag * dt);
        p.vx *= dragK; p.vy *= dragK; p.vz *= dragK;
        p.vy -= p.grav * dt; // Y-up: gravity pulls down
        p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
        if (p.ground && p.y < 0.03 * cfg.cell) {
          p.y = 0.03 * cfg.cell;
          if (p.vy < 0) p.vy = -p.vy * 0.25; // small settle bounce, then drag stops it
        }
        if (p.kind === 'drop' && p.y <= 0.03 * cfg.cell) {
          queueLandBurst(p.tx, p.tz);
          if (p.beam) killBeam(p.beam);
          removeFromGroup(p);
          P.splice(i, 1);
          continue;
        }
        syncSprite(p);
      }
      for (i = R.length - 1; i >= 0; i--) {
        var r = R[i];
        r.life += dt;
        if (r.life >= r.max) { removeFromGroup(r); R.splice(i, 1); continue; }
        var rf = r.life / r.max;
        var rr = r.r0 + (r.r1 - r.r0) * rf;
        r.mesh.scale.set(rr, rr, 1);
        r.mesh.material.opacity = 1 - rf;
      }
      for (i = T.length - 1; i >= 0; i--) {
        var t = T[i];
        t.life += dt;
        if (t.life >= t.max) { removeFromGroup(t); T.splice(i, 1); continue; }
        t.spr.position.y += t.vy * dt;
        var tf = t.life / t.max;
        t.spr.material.opacity = tf < 0.6 ? 1 : 1 - (tf - 0.6) / 0.4;
      }
      for (i = B.length - 1; i >= 0; i--) {
        var b = B[i];
        b.life += dt;
        if (b.life >= b.max || !b.drop) { removeFromGroup(b); B.splice(i, 1); continue; }
        b.mesh.material.opacity = 0.22 * (1 - b.life / b.max);
      }
      // Run queued landing bursts now that no loop is iterating P.
      while (pendingLand.length) {
        var lb = pendingLand.shift();
        landBurst(lb.x, lb.z, '#ffd54f');
      }
    },

    // Sync the FX group with the scene. main.js calls this every frame AFTER
    // snake.render / board.render (it only adopts a scene passed in — the
    // actual drawing is renderer.render(scene, camera) in main.js).
    // render(scene): use that scene from now on. render() with no argument
    // keeps the scene from init()/setScene().
    render: function (sc) {
      if (sc && typeof sc.add === 'function') effects.setScene(sc);
      if (scene) ensureGroup();
      return effects;
    },

    // Current shake offset in world units (0,0 when idle). main.js adds this
    // to the camera position each frame for a light camera shake on explode/die.
    getShakeOffset: function () { return { x: shakeOX, y: shakeOY }; },

    // Wipe all live FX (e.g. on game reset). Shake is cancelled too.
    clear: function () {
      var i;
      for (i = P.length - 1; i >= 0; i--) removeFromGroup(P[i]);
      for (i = R.length - 1; i >= 0; i--) removeFromGroup(R[i]);
      for (i = T.length - 1; i >= 0; i--) removeFromGroup(T[i]);
      for (i = B.length - 1; i >= 0; i--) removeFromGroup(B[i]);
      P.length = 0; R.length = 0; T.length = 0; B.length = 0; pendingLand.length = 0;
      shakeMag = 0; shakeT = 0; shakeOX = 0; shakeOY = 0;
    },

    // Live FX object count (particles + rings + texts + beams; 0 when all faded).
    count: function () { return P.length + R.length + T.length + B.length; },

    // Diagnostics for tests / nv6: counts by kind, live texts/rings/beams, shake.
    _diag: function () {
      var byKind = {};
      for (var i = 0; i < P.length; i++) byKind[P[i].kind] = (byKind[P[i].kind] || 0) + 1;
      return { n: P.length + R.length + T.length + B.length,
        particles: P.length, rings: R.length, texts: T.length, beams: B.length,
        byKind: byKind, shake: { mag: shakeMag, t: +(shakeT.toFixed(3)) } };
    },
  };

  // Sync one particle's sprite to its simulated state (position/scale/opacity).
  function syncSprite(p) {
    var f = 1 - p.life / p.max; // 1 -> 0 over the particle's life
    var lf = p.life / p.max;
    var size = p.size0 + (p.size1 - p.size0) * lf;
    p.spr.position.set(p.x, p.y, p.z);
    p.spr.scale.set(size * 2, size * 2, 1);
    if (p.kind === 'smoke' || p.kind === 'dust') {
      p.spr.material.opacity = p.op0 * Math.sin(Math.min(1, lf) * Math.PI);
    } else {
      p.spr.material.opacity = p.op0 * f;
    }
  }

  function killBeam(b) {
    var idx = B.indexOf(b);
    if (idx >= 0) { removeFromGroup(b); B.splice(idx, 1); }
  }

  if (typeof window !== 'undefined') { window.effects = effects; window.RanEffects = effects; }
  if (typeof module !== 'undefined' && module.exports) { module.exports = effects; }
})();
