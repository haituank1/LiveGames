// Games/ran-san-moi/js/snake.js — Snake: state, AI, movement, 3D drawing.
// Spec: RAN-SAN-MOI-SPEC.md §4 (AI/logic) + RAN-SAN-MOI-3D.md §2 (3D render).
// The interface below is the contract with main.js — do NOT rename functions
// or change signatures.
// AI (§4, MAX-INTELLIGENCE version, user request 2026-11-11 22:36 — OVERRIDES
// the old decision not to add a safety check): BFS to an apple + virtual-snake
// safety check, tail-chase, flood-fill survival, surrounded fallback.
// Rendering (§2): the body is ONE seamless striped tube (TubeGeometry along
// a CatmullRomCurve3 through the interpolated segment positions). The head
// (green ball + eyes + tongue) is unchanged from the approved version.
// main.js loads this file with a plain <script> tag and calls `new Snake(opts)`.
// 3D setup: main.js creates the renderer/scene/camera/lights (§1) and hands
// the shared scene to the snake via setScene(scene, THREE) or init({scene}).
// render() then only moves the snake's meshes; renderer.render() is main.js's
// job. render() also tolerates render(alpha), render(scene, alpha), and the
// legacy render(ctx, alpha) from the 2D main.js (no-op until a scene is set,
// never throws). Node tests can require() it (module.exports guard).

const DIRS = [
  { x: 0, y: -1 }, // up
  { x: 1, y: 0 }, // right
  { x: 0, y: 1 }, // down
  { x: -1, y: 0 }, // left
];

const DEFAULT_CONFIG = {
  kichThuocBan: 20, // board size in cells (16-24)
  doDaiBanDau: 5, // starting length
  mauThanRan: '#FF9F1C', // body orange (gradient to yellow toward the tail)
  mauDauRan: '#4CAF50', // head green
};

const TAIL_YELLOW = '#FFD93B'; // gradient end color (tail)

class Snake {
  constructor(opts) {
    opts = opts || {};
    this.board = opts.board || null;
    this.config = Object.assign({}, DEFAULT_CONFIG, opts.config || {});
    this.isBlocked = typeof opts.isBlocked === 'function' ? opts.isBlocked : null;
    this.getFood = typeof opts.getFood === 'function' ? opts.getFood : null;
    this.onEat = typeof opts.onEat === 'function' ? opts.onEat : null;
    this.onDie = typeof opts.onDie === 'function' ? opts.onDie : null;
    this.segments = []; // [{x, y}] head first, tail last
    this.direction = { x: 1, y: 0 }; // facing right
    this.alive = true;
    this._deathCause = null;
    this._prevSegments = []; // segments before the last tick (for smooth render)
    // 3D rendering state (empty until main.js hands over the shared scene).
    this._scene = null;
    this._THREE = null;
    this._built3D = false;
    this._headGroup = null; // Group: head sphere + eyes + tongue (unit space)
    this._tongue = null;
    this._tubeMesh = null; // the single seamless striped body tube
    this._tubeGeo = null; // rebuilt every frame from the curve (old one disposed)
    this._tubeMat = null;
    this._stripeTex = null;
    this._tailCap = null; // round yellow cap closing the tail end of the tube
    this._tubePts = []; // persistent Vector3 list (reused, never reallocated)
    this._eatPulse = 0; // 1 right after eating, decays per render -> head swell
    this.reset();
    if (opts.scene) this.setScene(opts.scene, opts.THREE);
  }

  // Back to the initial state: length doDaiBanDau, board center, facing right.
  reset() {
    const size = this._size();
    let len = Math.floor(this.config.doDaiBanDau) || DEFAULT_CONFIG.doDaiBanDau;
    len = Math.max(1, Math.min(len, size));
    const cx = Math.floor(size / 2);
    const cy = Math.floor(size / 2);
    this.segments = [];
    for (let i = 0; i < len; i++) {
      this.segments.push({ x: cx - i, y: cy });
    }
    this.direction = { x: 1, y: 0 };
    this.alive = true;
    this._deathCause = null;
    this._eatPulse = 0;
    this._prevSegments = this.segments.map((s) => ({ x: s.x, y: s.y }));
  }

  get length() {
    return this.segments.length;
  }

  // One tick: AI picks a direction, the snake moves, returns an event.
  // main.js relies on the returned event for score / explosion / respawn.
  // The onEat/onDie callbacks (if given) are ALSO invoked, per spec §4;
  // main.js must use only ONE of the two mechanisms (recommended: the
  // returned event) so score/growth are not applied twice.
  // Returns {type:'eat', apple} | {type:'die', cause} | {type:'move'},
  // or null if the snake is already dead (main.js should guard with alive).
  tick() {
    if (!this.alive) return null;
    const dir = this._chooseDirection();
    this.direction = dir;
    const head = this.segments[0];
    const nh = { x: head.x + dir.x, y: head.y + dir.y };
    this._prevSegments = this.segments.map((s) => ({ x: s.x, y: s.y }));
    if (!this._inBounds(nh.x, nh.y)) return this._die('wall');
    if (this._isBomb(nh.x, nh.y)) return this._die('bomb');
    const apple = this._foodAt(nh.x, nh.y);
    // The tail vacates this tick (see grow(): growth is applied separately
    // by grow(n) after the eat event, so the tail cell is free to move into
    // — except it can never hold an apple, so eating onto the tail is impossible).
    if (this._isBody(nh.x, nh.y, false)) return this._die('self');
    this.segments.unshift(nh);
    this.segments.pop();
    if (apple) {
      this._eatPulse = 1; // head swells for one beat (render() decays it)
      if (this.onEat) {
        try { this.onEat(apple); } catch (e) { /* main.js handler must not break the loop */ }
      }
      return { type: 'eat', apple };
    }
    return { type: 'move' };
  }

  // Grow by n segments, immediately. Appends copies of the tail cell, so the
  // tail effectively stays put for one tick while the body shifts — the same
  // observable behavior as the classic rule "the tail does not move on the
  // eating tick". tick() itself never grows; main.js calls grow(1) on eat.
  grow(n) {
    const add = Math.max(0, Math.floor(n) || 0);
    if (!add || !this.segments.length) return;
    const tail = this.segments[this.segments.length - 1];
    for (let i = 0; i < add; i++) {
      this.segments.push({ x: tail.x, y: tail.y });
    }
  }

  // --- 3D rendering (RAN-SAN-MOI-3D.md §2) ---
  // main.js owns the renderer/scene/camera/lights; the snake only owns its
  // meshes inside the shared scene. Geometry/materials are created ONCE and
  // reused — render() only moves meshes and recolours them, never allocates.

  // Hand over the shared scene (call once, from main.js). `three` is optional:
  // without it, window.THREE (three.min.js global) is used. Returns true once
  // the meshes are built; false only when THREE is not available yet (render()
  // retries on every call, so a late three.min.js still works).
  setScene(scene, three) {
    if (!scene || typeof scene.add !== 'function') return false;
    this._scene = scene;
    if (!this._THREE) this._THREE = this._resolveTHREE(three);
    if (this._THREE) this._ensure3D();
    return this._built3D;
  }

  // Same as setScene, in init({scene, THREE}) / init(scene) form.
  init(opts) {
    if (!opts) return false;
    if (opts.scene) return this.setScene(opts.scene, opts.THREE);
    return this.setScene(opts, opts.THREE);
  }

  _resolveTHREE(three) {
    if (three) return three;
    if (typeof window !== 'undefined' && window.THREE) return window.THREE;
    if (typeof globalThis !== 'undefined' && globalThis.THREE) return globalThis.THREE;
    return null;
  }

  // Build the shared geometry + head group ONCE, add them to the scene.
  // The head is built in UNIT space (head radius = 1); render() scales the
  // whole group to the real cell size, so a board-size change needs no rebuild.
  _ensure3D() {
    if (this._built3D || !this._scene || !this._THREE) return;
    const T = this._THREE;
    this._sphereGeo = new T.SphereGeometry(1, 12, 8);
    this._coneGeo = new T.ConeGeometry(1, 1, 8);
    const head = new T.Group();
    const tilt = new T.Group();
    tilt.rotation.x = 0.15; // head leans slightly into the direction of travel
    head.add(tilt);
    const headMat = new T.MeshStandardMaterial({
      color: this.config.mauDauRan || DEFAULT_CONFIG.mauDauRan, roughness: 0.35,
    });
    const headMesh = new T.Mesh(this._sphereGeo, headMat);
    headMesh.castShadow = true;
    tilt.add(headMesh);
    // Eyes sit on the front of the head (local +Z = forward); pupils sit on
    // the white surface; tongue cone below the nose, pointing forward.
    const whiteMat = new T.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2 });
    const blackMat = new T.MeshStandardMaterial({ color: 0x222222, roughness: 0.2 });
    const eyeR = 0.22; // 0.128 / 0.58 (head radius in unit space is 1)
    const pupR = 0.11;
    for (const s of [-1, 1]) {
      const dir = new T.Vector3(0.41 * s, 0.37, 0.80).normalize();
      const eyePos = dir.clone().multiplyScalar(0.97);
      const eye = new T.Mesh(this._sphereGeo, whiteMat);
      eye.scale.setScalar(eyeR);
      eye.position.copy(eyePos);
      tilt.add(eye);
      const pup = new T.Mesh(this._sphereGeo, blackMat);
      pup.scale.setScalar(pupR);
      pup.position.copy(eyePos).addScaledVector(dir, eyeR * 0.55);
      tilt.add(pup);
    }
    const tongueMat = new T.MeshStandardMaterial({ color: 0xe53935, roughness: 0.4, emissive: 0x330000 });
    const tongue = new T.Mesh(this._coneGeo, tongueMat);
    tongue.rotation.x = Math.PI / 2; // cone points +Y by default; aim it +Z (forward)
    tongue.scale.set(0.12, 0.85, 0.12);
    tongue.position.set(0, -0.08, 1.0);
    tilt.add(tongue);
    this._tongue = tongue;
    this._headGroup = head;
    this._scene.add(head);
    // Body tube: ONE mesh, rebuilt every frame (see render()). The stripe
    // texture / material / mesh are created once and reused.
    this._stripeTex = this._makeStripeTexture();
    this._tubeMat = new T.MeshStandardMaterial({ map: this._stripeTex, roughness: 0.35 });
    this._tubeMesh = new T.Mesh(new T.BufferGeometry(), this._tubeMat);
    this._tubeMesh.castShadow = true;
    this._tubeMesh.visible = false;
    this._scene.add(this._tubeMesh);
    // Round cap closing the tail end (TubeGeometry is open-ended).
    const capMat = new T.MeshStandardMaterial({ color: TAIL_YELLOW, roughness: 0.35 });
    this._tailCap = new T.Mesh(this._sphereGeo, capMat);
    this._tailCap.castShadow = true;
    this._tailCap.visible = false;
    this._scene.add(this._tailCap);
    this._built3D = true;
  }

  // Stripe texture: alternating pale-yellow / orange bands, one period = half
  // light + half dark. Built as a DataTexture (raw pixels, no DOM canvas),
  // so it also works headless in Node tests. TubeGeometry UVs run along the
  // tube length, so with wrapS = Repeat the bands become rings around the
  // body; repeat.x is set per frame to ~1 period per cell.
  _makeStripeTexture() {
    const T = this._THREE;
    const W = 64;
    const data = new Uint8Array(W * 4);
    const light = [255, 230, 160]; // pale yellow #FFE6A0
    const dark = [245, 166, 35]; // orange #F5A623 (as in the DarkBossTv reference)
    for (let i = 0; i < W; i++) {
      const c = i < W / 2 ? light : dark;
      data[i * 4] = c[0];
      data[i * 4 + 1] = c[1];
      data[i * 4 + 2] = c[2];
      data[i * 4 + 3] = 255;
    }
    const tex = new T.DataTexture(data, W, 1, T.RGBAFormat);
    tex.wrapS = T.RepeatWrapping;
    tex.wrapT = T.RepeatWrapping;
    tex.needsUpdate = true;
    return tex;
  }

  // Board pixel geometry in 3D: cell (x, y) -> (gridX + (x+0.5)*cell, 0, gridY + (y+0.5)*cell).
  // Board (nv3) exposes cell/gridX/gridY (aliases offsetX/Y kept as fallback).
  _geometry3d() {
    const b = this.board;
    let cell = 34; // 680px board / 20 cells (fallback when no board is attached)
    let gx = 0;
    let gy = 0;
    if (b) {
      if (Number.isFinite(b.cell)) cell = b.cell;
      else if (Number.isFinite(b.cellSize)) cell = b.cellSize;
      if (Number.isFinite(b.gridX)) gx = b.gridX;
      else if (Number.isFinite(b.offsetX)) gx = b.offsetX;
      else if (Number.isFinite(b.originX)) gx = b.originX;
      else if (Number.isFinite(b.x)) gx = b.x;
      if (Number.isFinite(b.gridY)) gy = b.gridY;
      else if (Number.isFinite(b.offsetY)) gy = b.offsetY;
      else if (Number.isFinite(b.originY)) gy = b.originY;
      else if (Number.isFinite(b.y)) gy = b.y;
    }
    if (Number.isFinite(this.config.cellSize)) cell = this.config.cellSize;
    return { cell, gx, gy };
  }

  // Move the 3D meshes to the snake's interpolated position. alpha (0..1)
  // interpolates each segment between its previous-tick and current-tick
  // cell, exactly like the 2D version — movement stays smooth, never jumps.
  // Accepts render(alpha), render(scene, alpha), or legacy render(ctx, alpha);
  // with no scene set yet it simply does nothing (never throws), so the 2D
  // main.js keeps running until nv1's 3D main.js hands over the scene.
  render(a, b) {
    let alpha = 1;
    if (typeof a === 'number') alpha = a;
    else if (a && typeof a.add === 'function') {
      this.setScene(a);
      if (typeof b === 'number') alpha = b;
    } else if (typeof b === 'number') alpha = b;
    alpha = Number.isFinite(alpha) ? Math.max(0, Math.min(1, alpha)) : 1;
    if (!this._scene || !this.segments.length) return;
    if (!this._THREE) this._THREE = this._resolveTHREE();
    if (!this._THREE) return;
    this._ensure3D();
    const g = this._geometry3d();
    const n = this.segments.length;
    const headR = g.cell * 0.58;
    const tubeR = g.cell * 0.5; // spec §2: body tube radius ~cell*0.5
    const now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
    // Head: interpolated cell -> 3D position, yaw to face the travel direction.
    const hp = this._interpPos(0, alpha);
    this._headGroup.position.set(g.gx + (hp.x + 0.5) * g.cell, headR, g.gy + (hp.y + 0.5) * g.cell);
    this._headGroup.rotation.y = Math.atan2(this.direction.x, this.direction.y);
    this._headGroup.visible = true;
    // Eat swell: one beat, decays every frame.
    this._eatPulse *= 0.9;
    const s = 1 + 0.22 * this._eatPulse;
    this._headGroup.scale.set(s * headR, s * headR, s * headR);
    // Tongue flicks gently in and out.
    if (this._tongue) this._tongue.scale.y = 0.85 * (0.7 + 0.3 * Math.sin(now / 160));
    // Body: ONE seamless striped tube along a smooth curve through the
    // interpolated segment positions (centripetal Catmull-Rom passes through
    // every point, so the tube follows the snake exactly, corners included).
    // The old tube geometry is disposed every frame — the mesh, material and
    // texture are reused, so nothing leaks.
    if (n >= 2) {
      const pts = this._tubePts;
      while (pts.length < n) pts.push(new this._THREE.Vector3());
      for (let i = 0; i < n; i++) {
        const p = this._interpPos(i, alpha);
        pts[i].set(g.gx + (p.x + 0.5) * g.cell, tubeR, g.gy + (p.y + 0.5) * g.cell);
      }
      const curve = new this._THREE.CatmullRomCurve3(pts.slice(0, n), false, 'centripetal');
      const tubular = Math.max(32, Math.min(360, n * 6));
      const geo = new this._THREE.TubeGeometry(curve, tubular, tubeR, 10, false);
      if (this._tubeGeo) this._tubeGeo.dispose();
      this._tubeGeo = geo;
      this._tubeMesh.geometry = geo;
      // One stripe period per cell, so the bands stay ~1 cell wide at any length.
      this._stripeTex.repeat.x = Math.max(2, n - 1);
      this._tubeMesh.visible = true;
      // Round cap closing the tail end.
      const tp = pts[n - 1];
      this._tailCap.position.set(tp.x, tp.y, tp.z);
      this._tailCap.scale.setScalar(tubeR);
      this._tailCap.visible = true;
    } else {
      this._tubeMesh.visible = false;
      this._tailCap.visible = false;
    }
  }

  // --- AI: pick a direction each tick (spec §4, MAX-INTELLIGENCE version) ---
  // Priority: 1. safe apple (BFS + virtual-snake check) 2. chase the tail
  // 3. flood-fill survival 4. any non-lethal direction, else straight.
  // (User request 2026-11-11 22:36 — this OVERRIDES the old BOSS decision not
  // to add a safety check. The snake must live as long as possible and never
  // walk itself into a dead end.)
  _chooseDirection() {
    const head = this.segments[0];
    const cur = this.direction;
    // Candidate directions: all except the 180-degree turn.
    const cands = this._orderedDirs().filter((d) => !(d.x === -cur.x && d.y === -cur.y));
    // 1. BFS to an apple, accepted only if the virtual-snake check proves the
    // snake can still escape after eating it. Tries the nearest apples first.
    const foods = this._foods();
    if (foods.length) {
      const step = this._safeAppleStep(foods);
      if (step) return step;
    }
    // 2. Chase the tail: follow it and stay alive until a new apple lands
    // somewhere safe.
    const tailStep = this._tailChaseStep();
    if (tailStep) return tailStep;
    // 3. Survival: prefer a direction that KEEPS an escape route to the tail
    // (simulate one step, then check the tail is still reachable — the same
    // virtual-snake principle as step 1, so the head never walks into a
    // pocket it cannot leave). Among those, pick the one with the most
    // reachable empty cells; tie -> keep the snake closest to an apple.
    // If NO direction keeps the escape, fall back to plain flood-fill
    // (biggest space) — a trapped snake's best remaining chance.
    let best = null;
    let bestSpace = -1;
    let bestDist = Infinity;
    let fallback = null;
    let fallbackSpace = -1;
    let fallbackDist = Infinity;
    for (const d of cands) {
      const nx = head.x + d.x;
      const ny = head.y + d.y;
      if (this._wouldDie(nx, ny)) continue;
      const space = this._floodCount(nx, ny);
      const dist = this._nearestAppleDist(nx, ny, foods);
      if (space > fallbackSpace || (space === fallbackSpace && dist < fallbackDist)) {
        fallback = d;
        fallbackSpace = space;
        fallbackDist = dist;
      }
      if (this._stepKeepsEscape(nx, ny, d)) {
        if (space > bestSpace || (space === bestSpace && dist < bestDist)) {
          best = d;
          bestSpace = space;
          bestDist = dist;
        }
      }
    }
    if (best) return best;
    if (fallback) return fallback;
    // 4. Surrounded: any direction that does not kill immediately; if every
    // direction kills, go straight (dying is correct per the rules).
    for (const d of cands) {
      if (!this._wouldDie(head.x + d.x, head.y + d.y)) return d;
    }
    return cur;
  }

  // Step 1: try the nearest apples (up to 5) in turn. For each, find a SAFE
  // route to it (Yen's k-shortest paths + the virtual-snake check) and take
  // its first step. Only when every route to an apple fails is it discarded.
  _safeAppleStep(foods) {
    const tried = new Set(); // 'x,y' of apples already proven unsafe (every route)
    for (let attempt = 0; attempt < 5; attempt++) {
      const found = this._bfsToNearestFood(tried);
      if (!found) return null;
      const step = this._tryAppleRoutes(found.apple, tried, found.path);
      if (step) return step;
      tried.add(found.apple.x + ',' + found.apple.y);
    }
    return null;
  }

  // Yen's k-shortest simple paths to one apple (k <= 4), each tested with
  // the virtual-snake check. Returns the first step of the first SAFE route,
  // or null when every distinct route to the apple is unsafe (or none exists).
  // Why enumerate routes at all: a route can be unsafe even when the apple
  // is fine — e.g. two parallel 1-wide corridors, where walking up one seals
  // the escape and the other leaves it open (seed 37, t=8534: plain BFS
  // returns the x=7 route first, which is unsafe, while the x=6 route is
  // safe — giving up on the apple there killed the snake 25 ticks later).
  // Yen's spur rule: for each spur cell along the previous path, keep the
  // prefix, ban the edge the previous path took out of that cell (for every
  // earlier path sharing the prefix), and BFS from the spur cell — so each
  // new candidate diverges from all earlier ones at some point. Candidates
  // are tested in length order; the first safe one wins. (Earlier attempts
  // banned a single fixed edge of the rejected route — the entry, the
  // approach, or the second edge — but the safe route shared that edge with
  // the unsafe one in each case, so those bans killed it too.)
  _tryAppleRoutes(apple, tried, firstPath) {
    const head = this.segments[0];
    const foods = this._foods();
    const foodSet = new Set();
    for (const f of foods) {
      if (f && Number.isFinite(f.x) && Number.isFinite(f.y)) foodSet.add(f.x + ',' + f.y);
    }
    const isGoal = (x, y) => x === apple.x && y === apple.y;
    const paths = [firstPath];
    if (this._pathIsSafe(firstPath, apple)) return firstPath[0];
    for (let k = 1; k < 4; k++) {
      let best = null;
      const prev = paths[paths.length - 1];
      for (let i = 0; i < prev.length; i++) {
        const root = prev.slice(0, i);
        // Spur cell = head + root; root cells are blocked in the spur BFS
        // (the snake will occupy them — the spur route must not revisit them).
        const rootCells = new Set([head.x + ',' + head.y]);
        let sx = head.x, sy = head.y;
        for (const d of root) { sx += d.x; sy += d.y; rootCells.add(sx + ',' + sy); }
        // Ban the edge out of the spur cell for every earlier path that
        // shares this root prefix — the new route must diverge here.
        const banned = new Set();
        for (const p of paths) {
          if (p.length > i && this._sameDirPrefix(p, root)) {
            banned.add(this._edgeKey({ x: sx, y: sy }, p[i]));
          }
        }
        const facing = root.length ? root[root.length - 1] : this.direction;
        const spur = this._bfs(sx, sy, this.segments, isGoal, foodSet, facing, rootCells, banned);
        if (!spur) continue;
        const cand = root.concat(spur);
        if (paths.some((p) => this._samePath(p, cand))) continue;
        if (!best || cand.length < best.length) best = cand;
      }
      if (!best) return null;
      if (this._pathIsSafe(best, apple)) return best[0];
      paths.push(best);
    }
    return null;
  }

  // True when the first `prefix.length` directions of `path` equal `prefix`.
  _sameDirPrefix(path, prefix) {
    for (let i = 0; i < prefix.length; i++) {
      if (path[i].x !== prefix[i].x || path[i].y !== prefix[i].y) return false;
    }
    return true;
  }

  // True when two direction arrays are identical.
  _samePath(a, b) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (a[i].x !== b[i].x || a[i].y !== b[i].y) return false;
    }
    return true;
  }

  // Directed edge key for the route-diversity bans: the step from cell
  // `from` in direction `dir`.
  _edgeKey(from, dir) {
    return from.x + ',' + from.y + '>' + dir.x + ',' + dir.y;
  }

  // BFS from the head to a specific cell (tx, ty). extraBlocked: Set of 'x,y'
  // cells to treat as obstacles (apples already proven unsafe). bannedEdges:
  // Set of directed-edge keys the route must not use (Yen's spur bans in
  // _tryAppleRoutes). Returns the path ([dir...]) or null.
  _bfsPathTo(tx, ty, extraBlocked, bannedEdges) {
    const head = this.segments[0];
    const foods = this._foods();
    const foodSet = new Set();
    for (const f of foods) {
      if (f && Number.isFinite(f.x) && Number.isFinite(f.y)) foodSet.add(f.x + ',' + f.y);
    }
    const isGoal = (x, y) => x === tx && y === ty;
    return this._bfs(head.x, head.y, this.segments, isGoal, foodSet, this.direction, extraBlocked, bannedEdges);
  }

  // BFS from the head to the nearest food cell not in `excluded`.
  // Returns { path: [dir...], apple: {x, y} } or null. Excluded apples are
  // treated as obstacles, so the path never crosses another apple (eating it
  // mid-path would grow the snake and invalidate the simulation).
  _bfsToNearestFood(excluded) {
    const head = this.segments[0];
    const foods = this._foods();
    const foodSet = new Set();
    for (const f of foods) {
      if (f && Number.isFinite(f.x) && Number.isFinite(f.y)) foodSet.add(f.x + ',' + f.y);
    }
    if (!foodSet.size) return null;
    const isGoal = (x, y) => foodSet.has(x + ',' + y) && !excluded.has(x + ',' + y);
    const path = this._bfs(head.x, head.y, this.segments, isGoal, foodSet, this.direction, excluded);
    if (!path) return null;
    // The endpoint is the apple reached (the path's only food cell).
    let x = head.x, y = head.y;
    for (const d of path) { x += d.x; y += d.y; }
    return { path, apple: { x, y } };
  }

  // Step 2: BFS from the head to the tail (body except the tail is an
  // obstacle). Returns the first step, or null when the tail is unreachable.
  _tailChaseStep() {
    const head = this.segments[0];
    const tail = this.segments[this.segments.length - 1];
    if (head.x === tail.x && head.y === tail.y) return null;
    const isGoal = (x, y) => x === tail.x && y === tail.y;
    const path = this._bfs(head.x, head.y, this.segments, isGoal, null, this.direction, null);
    if (!path) return null;
    // One lethal edge: if the path is a single step onto the tail cell AND
    // the tail is duplicated right now (grow(1) after eating), the tail does
    // NOT vacate this tick — stepping onto it would be suicide.
    if (path.length === 1 && this._hasDuplicateTail()) return null;
    return path[0];
  }

  // True when the last two segments sit on the same cell — grow(1) after
  // eating appends a copy of the tail, so for one tick the tail does NOT
  // vacate (the pop only removes the duplicate).
  _hasDuplicateTail() {
    const s = this.segments;
    return s.length >= 2
      && s[s.length - 1].x === s[s.length - 2].x
      && s[s.length - 1].y === s[s.length - 2].y;
  }

  // Simulate one step to (nx, ny) and check the head can still reach the
  // tail afterwards. Eating an apple on that step grows the snake (no pop),
  // otherwise the tail vacates (which also clears a duplicated tail left by
  // the previous eat). Used by step 3 so the snake never walks into a pocket
  // it cannot leave while an escape-preserving direction exists.
  _stepKeepsEscape(nx, ny, dir) {
    const sim = this.segments.map((s) => ({ x: s.x, y: s.y }));
    sim.unshift({ x: nx, y: ny });
    if (!this._foodAt(nx, ny)) sim.pop();
    const head = sim[0];
    const tail = sim[sim.length - 1];
    if (head.x === tail.x && head.y === tail.y) return true;
    const isGoal = (x, y) => x === tail.x && y === tail.y;
    return this._bfs(head.x, head.y, sim, isGoal, null, dir, null) !== null;
  }

  // Virtual-snake safety check: simulate the snake following `path` (it eats
  // the apple at the end, growing by 1 so the tail does not move that tick),
  // then check there is still a BFS path from the new head to the new tail.
  // If yes, the snake can escape after eating — the path is safe.
  _pathIsSafe(path, apple) {
    const sim = this.segments.map((s) => ({ x: s.x, y: s.y }));
    let ate = false;
    for (const d of path) {
      const h = sim[0];
      const nh = { x: h.x + d.x, y: h.y + d.y };
      sim.unshift(nh);
      if (!ate && nh.x === apple.x && nh.y === apple.y) ate = true; // tail stays
      else sim.pop();
    }
    const head = sim[0];
    const tail = sim[sim.length - 1];
    const facing = path[path.length - 1];
    const isGoal = (x, y) => x === tail.x && y === tail.y;
    return this._bfs(head.x, head.y, sim, isGoal, null, facing, null) !== null;
  }

  // General BFS on the grid with a given body.
  // - segments: body (head first). All body cells except the last (tail)
  //   are obstacles — the tail will move away (except when eating, see below).
  // - isGoal(x, y): true for the destination cell.
  // - foodSet: Set of 'x,y' food cells, or null. When set, a step onto the
  //   tail cell is forbidden if that cell holds food (eating means the tail
  //   does NOT move — §4). Apples never spawn on the snake, so this guard is
  //   theoretical; it keeps the rule explicit and safe.
  // - facing: the direction the snake faces at the start (its reverse is
  //   banned on the first step — no 180-degree turns).
  // - extraBlocked: Set of 'x,y' cells to treat as obstacles, or null
  //   (used for apples already proven unsafe — the path must not cross them).
  // - bannedEdges: Set of directed-edge keys the route must not use, or null
  //   (Yen's spur bans in _tryAppleRoutes: the edge an earlier path took out
  //   of a spur cell it shares with the candidate's root prefix).
  // Returns the path as an array of direction vectors, or null.
  _bfs(sx, sy, segments, isGoal, foodSet, facing, extraBlocked, bannedEdges) {
    const tail = segments[segments.length - 1];
    const blocked = new Set();
    for (let i = 0; i < segments.length - 1; i++) blocked.add(segments[i].x + ',' + segments[i].y);
    const dirs = facing
      ? [facing].concat(DIRS.filter((d) => !(d.x === facing.x && d.y === facing.y)))
      : DIRS;
    const startKey = sx + ',' + sy;
    const seen = new Set([startKey]);
    const prev = new Map(); // cell key -> { from: key, dir }
    const queue = [{ x: sx, y: sy }];
    let qi = 0;
    while (qi < queue.length) {
      const cur = queue[qi++];
      for (const d of dirs) {
        const nx = cur.x + d.x;
        const ny = cur.y + d.y;
        // Never turn 180 degrees on the first step (the neck already blocks
        // it, but forbid it explicitly so the rule holds in every edge case).
        if (cur.x === sx && cur.y === sy && facing && d.x === -facing.x && d.y === -facing.y) continue;
        // Banned directed edge (route-diversity retry in _safeAppleStep).
        if (bannedEdges && bannedEdges.has(cur.x + ',' + cur.y + '>' + d.x + ',' + d.y)) continue;
        const key = nx + ',' + ny;
        if (seen.has(key) || !this._inBounds(nx, ny)) continue;
        if (this._isBomb(nx, ny)) continue;
        const isGoalCell = isGoal(nx, ny);
        const isTailCell = nx === tail.x && ny === tail.y;
        // Eating onto the tail cell is always blocked (eating means the tail
        // does NOT move — §4), even when that cell is the goal.
        if (isTailCell && foodSet && foodSet.has(key)) continue;
        // The goal cell is reachable even if it is in the blocked set. That
        // only ever happens for the tail cell: grow(1) duplicates the tail
        // for one tick, so the tail cell sits in the blocked set right after
        // eating — but the tail-chase / escape route is a multi-tick plan and
        // the duplicate clears on the next tick, so the goal stays reachable.
        // (The single lethal case — stepping onto the duplicated tail cell
        // THIS tick — is guarded by the caller, see _tailChaseStep.)
        if (!isGoalCell) {
          if (blocked.has(key)) continue;
          if (extraBlocked && extraBlocked.has(key)) continue;
        }
        seen.add(key);
        prev.set(key, { from: cur.x + ',' + cur.y, dir: d });
        if (isGoalCell) {
          // Walk back to the start to recover the full path.
          const path = [];
          let k = key;
          while (prev.get(k).from !== startKey) { path.unshift(prev.get(k).dir); k = prev.get(k).from; }
          path.unshift(prev.get(k).dir);
          return path;
        }
        queue.push({ x: nx, y: ny });
      }
    }
    return null;
  }

  // Flood-fill: how many empty cells are reachable from (sx, sy).
  // Obstacles: walls, bombs, body (except the tail — it will move away).
  // The start cell itself counts (it is the cell the head would move into).
  _floodCount(sx, sy) {
    const seen = new Set([sx + ',' + sy]);
    const queue = [{ x: sx, y: sy }];
    let qi = 0;
    let count = 0;
    while (qi < queue.length) {
      const cur = queue[qi++];
      count++;
      for (const d of DIRS) {
        const nx = cur.x + d.x;
        const ny = cur.y + d.y;
        const key = nx + ',' + ny;
        if (seen.has(key) || !this._inBounds(nx, ny)) continue;
        if (this._isBomb(nx, ny)) continue;
        if (this._isBody(nx, ny, false)) continue;
        seen.add(key);
        queue.push({ x: nx, y: ny });
      }
    }
    return count;
  }

  // Would moving the head to (x, y) kill it right now? Wall, bomb, or body
  // (except the tail, which vacates this tick). An apple cell is safe.
  _wouldDie(x, y) {
    if (!this._inBounds(x, y)) return true;
    if (this._isBomb(x, y)) return true;
    if (this._isBody(x, y, false)) return true;
    return false;
  }

  _die(cause) {
    this.alive = false;
    this._deathCause = cause;
    this._eatPulse = 0;
    const ev = { type: 'die', cause };
    if (this.onDie) {
      try { this.onDie(cause); } catch (e) { /* main.js handler must not break the loop */ }
    }
    return ev;
  }

  // --- Board / food queries (all defensive: main.js may pass partial opts) ---
  _size() {
    const c = this.config.kichThuocBan;
    if (Number.isFinite(c) && c >= 4) return Math.floor(c);
    if (this.board && Number.isFinite(this.board.size)) return Math.floor(this.board.size);
    if (this.board && Number.isFinite(this.board.width)) return Math.floor(this.board.width);
    return DEFAULT_CONFIG.kichThuocBan;
  }

  _inBounds(x, y) {
    const s = this._size();
    return x >= 0 && y >= 0 && x < s && y < s;
  }

  _foods() {
    if (!this.getFood) return [];
    try {
      const f = this.getFood();
      return Array.isArray(f) ? f : [];
    } catch (e) {
      return [];
    }
  }

  _foodAt(x, y) {
    const foods = this._foods();
    for (const f of foods) {
      if (f && f.x === x && f.y === y) return { x: f.x, y: f.y };
    }
    return null;
  }

  _isBody(x, y, includeTail) {
    const segs = this.segments;
    const end = includeTail ? segs.length : segs.length - 1;
    for (let i = 0; i < end; i++) {
      if (segs[i].x === x && segs[i].y === y) return true;
    }
    return false;
  }

  _isBomb(x, y) {
    const b = this.board;
    if (b && typeof b.isBomb === 'function') {
      try { return !!b.isBomb(x, y); } catch (e) { /* fall through to isBlocked */ }
    }
    // Fallback: isBlocked true + in bounds + not my own body means a bomb
    // (walls are out of bounds already; apples are never "blocked" per spec).
    if (this.isBlocked && this._inBounds(x, y) && !this._isBody(x, y, true)) {
      try { return !!this.isBlocked(x, y); } catch (e) { return false; }
    }
    return false;
  }

  _nearestAppleDist(x, y, foods) {
    if (!foods || !foods.length) return 0;
    let best = Infinity;
    for (const f of foods) {
      if (!f || !Number.isFinite(f.x) || !Number.isFinite(f.y)) continue;
      const d = Math.abs(f.x - x) + Math.abs(f.y - y);
      if (d < best) best = d;
    }
    return best === Infinity ? 0 : best;
  }

  // Directions ordered with the current direction first, so equal-length
  // paths and equal flood-fill scores prefer going straight (smoother play).
  _orderedDirs() {
    const cur = this.direction;
    const rest = DIRS.filter((d) => !(d.x === cur.x && d.y === cur.y));
    return [{ x: cur.x, y: cur.y }].concat(rest);
  }

  // --- Drawing helpers ---
  _interpPos(i, alpha) {
    const cur = this.segments[i];
    const prev = this._prevSegments || [];
    // Segment i moves from its own previous cell to its current cell.
    // A brand-new tail segment (just grown) has no previous cell: it stays.
    const from = prev[i] || cur;
    return {
      x: from.x + (cur.x - from.x) * alpha,
      y: from.y + (cur.y - from.y) * alpha,
    };
  }

}

if (typeof window !== 'undefined') window.Snake = Snake;
if (typeof module !== 'undefined' && module.exports) module.exports = Snake;
