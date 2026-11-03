/* Hiệu ứng: mưa hoa sen (InstancedMesh), bông sen rơi (sprite), khói nhang + đốm lửa ở lư hương, hào quang quanh nhân vật */
(function () {
'use strict';
const T = window.Temple, C = T.crowd, K = C.consts, rand = T.util.rand;
const E = (T.effects = {});

const MAX_PETALS = 900;
const pal = a => a.map(c => new THREE.Color(c));
const PALETTES = {
  pink: pal([0xffc0d6, 0xff9fc0, 0xfff1d6, 0xffe08a, 0xffffff]),   // cánh sen hồng (mặc định)
  rose: pal([0xff5a78, 0xe8304e, 0xff8fa8, 0xffc0d6]),             // cánh hồng đỏ
  gold: pal([0xffd24a, 0xffe9a0, 0xffb52e, 0xfff4cf]),             // cánh vàng
};
const PETAL_COLORS = PALETTES.pink;
let petals, ember;
const P = [];          // cánh hoa đang bay
const BLOOMS = [];     // pool bông sen nguyên bông (sprite)
const MAX_BLOOMS = 40;
const smoke = [];      // pool sprite khói
const glows = [];      // pool hào quang
let incenseT = 0, smokeAcc = 0;
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3();

E.init = function () {
  const geo = new THREE.SphereGeometry(0.045, 8, 6);
  geo.scale(0.55, 0.18, 1);   // cánh sen dẹt
  petals = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5, emissive: 0x442222, side: THREE.DoubleSide }), MAX_PETALS);
  petals.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(MAX_PETALS * 3), 3);
  petals.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  petals.frustumCulled = false; petals.count = 0;
  C.scene.add(petals);

  const smokeTex = T.radialTexture([[0, 'rgba(255,250,240,.9)'], [1, 'rgba(255,250,240,0)']]);
  for (let i = 0; i < 50; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: smokeTex, transparent: true, depthWrite: false, opacity: 0 }));
    s.visible = false; C.scene.add(s);
    smoke.push({ s, life: 0, max: 1, vx: 0 });
  }
  const glowTex = T.radialTexture([[0, 'rgba(255,225,130,1)'], [0.4, 'rgba(255,180,60,.5)'], [1, 'rgba(255,160,40,0)']]);
  const glowMat = () => new THREE.SpriteMaterial({ map: glowTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 });
  ember = new THREE.Sprite(glowMat());
  ember.position.copy(K.BURNER); ember.scale.setScalar(0.45);
  C.scene.add(ember);
  for (let i = 0; i < 16; i++) {
    const s = new THREE.Sprite(glowMat()); s.visible = false; C.scene.add(s);
    glows.push({ s, p: null, t: 0 });
  }
  // bông sen nguyên bông: vẽ sẵn 2 kiểu (hồng, vàng) lên canvas, dùng làm sprite
  const tex = { pink: lotusTexture('#ff8fb4', '#fff0f5', '#ffd34d'), gold: lotusTexture('#ffb52e', '#fff4cf', '#fff8e0') };
  for (let i = 0; i < MAX_BLOOMS; i++) {
    const mk = t => new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false, opacity: 0 });
    const s = new THREE.Sprite(mk(tex.pink)); s.visible = false; C.scene.add(s);
    BLOOMS.push({ s, mats: { pink: s.material, gold: mk(tex.gold) }, on: false });
  }
};

/* vẽ một bông sen nhìn chính diện: 3 lớp cánh nhọn, ngoài đậm trong nhạt, nhụy ở giữa */
function lotusTexture(outer, inner, core) {
  const S = 128, cv = document.createElement('canvas'); cv.width = cv.height = S;
  const g = cv.getContext('2d');
  const petal = (ang, len, wid, col, cy) => {
    g.save(); g.translate(S / 2, cy); g.rotate(ang);
    const gr = g.createLinearGradient(0, 0, 0, -len);
    gr.addColorStop(0, inner); gr.addColorStop(1, col);
    g.fillStyle = gr; g.strokeStyle = 'rgba(160,40,80,.35)'; g.lineWidth = 1.5;
    g.beginPath(); g.moveTo(0, 0);
    g.bezierCurveTo(wid, -len * 0.35, wid * 0.6, -len * 0.8, 0, -len);
    g.bezierCurveTo(-wid * 0.6, -len * 0.8, -wid, -len * 0.35, 0, 0);
    g.fill(); g.stroke(); g.restore();
  };
  const base = S * 0.68;
  [-1.35, 1.35, -0.95, 0.95].forEach(a => petal(a, S * 0.42, S * 0.15, outer, base));   // cánh ngoài xoè ngang
  [-0.55, 0.55].forEach(a => petal(a, S * 0.46, S * 0.15, outer, base));
  [-0.22, 0.22, 0].forEach(a => petal(a, S * 0.5, S * 0.14, inner, base));               // cánh trong đứng
  const cg = g.createRadialGradient(S / 2, base - S * 0.06, 1, S / 2, base - S * 0.06, S * 0.09);
  cg.addColorStop(0, '#fff'); cg.addColorStop(1, core);
  g.fillStyle = cg; g.beginPath(); g.ellipse(S / 2, base - S * 0.05, S * 0.08, S * 0.05, 0, 0, Math.PI * 2); g.fill();
  const t = new THREE.CanvasTexture(cv);
  return t;
}

/* Mưa hoa sen: n cánh rơi từ mép trên khung hình xuống sàn. colors: mảng THREE.Color (mặc định cánh sen hồng) */
E.lotusRain = function (n, colors = PETAL_COLORS) {
  for (let i = 0; i < n && P.length < MAX_PETALS; i++) {
    const d = rand(2.6, K.D_MAX + 0.5);   // không rơi quá gần camera (sẽ to quá)
    const top = K.CAM_H + K.HORIZON * d / K.FOCAL;   // độ cao mép trên ảnh ở độ sâu d
    P.push({
      x: rand(-1, 1) * K.xLim(d) * 1.15, y: top + rand(0, 1.6), z: -d,   // rơi vào khung sau ~1 giây
      vy: rand(0.35, 0.7), ph: rand(0, 6), rx: rand(0, 6), ry: rand(0, 6), spin: rand(-3, 3),
      land: 0, c: colors[Math.floor(Math.random() * colors.length)],
    });
  }
};

/* Bông sen nguyên bông rơi chậm, lắc nhẹ, chạm sàn thì mờ dần. kind: 'pink' | 'gold' */
E.blooms = function (n, kind = 'pink') {
  for (let i = 0; i < n; i++) {
    const b = BLOOMS.find(x => !x.on);
    if (!b) return;
    const d = rand(3, K.D_MAX);
    const top = K.CAM_H + K.HORIZON * d / K.FOCAL;
    b.on = true; b.land = 0; b.ph = rand(0, 6); b.vy = rand(0.28, 0.45); b.size = rand(0.26, 0.38);
    b.s.material = b.mats[kind === 'gold' ? 'gold' : 'pink'];
    b.s.position.set(rand(-1, 1) * K.xLim(d), top + rand(0.2, 1.6), -d);
    b.s.scale.setScalar(b.size);
    b.s.visible = true;
  }
};

/* Tặng quà: hoa rơi theo tổng số xu, mốc càng cao hoa càng nhiều, càng đẹp
   1-4 xu cánh sen · 5-9 thêm cánh hồng đỏ · 10-29 thêm bông sen · 30-98 dày hơn, có cánh vàng
   99-499 mưa vàng + bông sen vàng · 500+ mưa vàng rất dày, bông sen vàng khắp chùa */
const GIFT_TIERS = [
  { min: 500, petals: [[300, 'gold'], [200, 'pink']], blooms: [[22, 'gold'], [12, 'pink']] },
  { min: 99, petals: [[200, 'gold'], [140, 'pink']], blooms: [[12, 'gold'], [8, 'pink']] },
  { min: 30, petals: [[140, 'pink'], [60, 'rose'], [40, 'gold']], blooms: [[8, 'pink']] },
  { min: 10, petals: [[90, 'pink'], [40, 'rose']], blooms: [[4, 'pink']] },
  { min: 5, petals: [[40, 'pink'], [25, 'rose']], blooms: [] },
  { min: 0, petals: [[30, 'pink']], blooms: [] },
];
E.giftRain = function (diamonds) {
  const t = GIFT_TIERS.find(x => diamonds >= x.min);
  for (const [n, c] of t.petals) E.lotusRain(n, PALETTES[c]);
  for (const [n, k] of t.blooms) E.blooms(n, k);
  return GIFT_TIERS.length - 1 - GIFT_TIERS.indexOf(t);   // bậc 0..5
};

/* Thắp nhang: lư hương bốc khói + đốm lửa sáng, cộng dồn theo số nén */
E.incense = function (n) { incenseT = Math.min(60, incenseT + 8 * n); };

/* Hào quang vàng bám theo một nhân vật trong `sec` giây */
E.glow = function (person, sec) {
  let g = glows.find(x => x.p === person) || glows.find(x => x.t <= 0);
  if (!g) g = glows.reduce((a, b) => (a.t < b.t ? a : b));
  g.p = person; g.t = sec; g.s.visible = true;
};

E.update = function (dt, t) {
  // cánh hoa
  for (let i = P.length - 1; i >= 0; i--) {
    const q = P[i];
    if (!q.land) {
      q.y -= q.vy * dt;
      q.x += Math.sin(t * 1.5 + q.ph) * 0.25 * dt;
      q.rx += q.spin * dt; q.ry += q.spin * 0.7 * dt;
      if (q.y <= 0.012) { q.y = 0.012; q.rx = 0; q.land = 1e-3; }
    } else if ((q.land += dt) > 5) { P[i] = P[P.length - 1]; P.pop(); }
  }
  for (let i = 0; i < P.length; i++) {
    const q = P[i], sc = q.land > 4 ? 5 - q.land : 1;
    _q.setFromEuler(_e.set(q.rx, q.ry, 0));
    _m.compose(_p.set(q.x, q.y, q.z), _q, _s.set(sc, sc, sc));
    petals.setMatrixAt(i, _m);
    petals.setColorAt(i, q.c);
  }
  petals.count = P.length;
  petals.instanceMatrix.needsUpdate = true;
  if (P.length) petals.instanceColor.needsUpdate = true;

  // bông sen nguyên bông
  for (const b of BLOOMS) {
    if (!b.on) continue;
    const s = b.s;
    if (!b.land) {
      s.position.y -= b.vy * dt;
      s.position.x += Math.sin(t * 1.2 + b.ph) * 0.18 * dt;
      s.material.rotation = Math.sin(t * 1.6 + b.ph) * 0.35;
      if (s.position.y <= b.size * 0.25) { s.position.y = b.size * 0.25; b.land = 1e-3; }
    } else if ((b.land += dt) > 4) { b.on = false; s.visible = false; continue; }
    s.material.opacity = b.land > 3 ? 4 - b.land : 1;
  }

  // khói nhang
  if (incenseT > 0) {
    incenseT -= dt;
    smokeAcc += dt * 7;
    while (smokeAcc >= 1) {
      smokeAcc--;
      const s = smoke.find(x => !x.s.visible);
      if (!s) break;
      s.s.visible = true; s.life = 0; s.max = rand(2.5, 4); s.vx = rand(-0.06, 0.06);
      s.s.position.set(K.BURNER.x + rand(-0.05, 0.05), K.BURNER.y, K.BURNER.z);
    }
  }
  for (const s of smoke) {
    if (!s.s.visible) continue;
    s.life += dt;
    const k = s.life / s.max;
    if (k >= 1) { s.s.visible = false; continue; }
    s.s.position.y += 0.35 * dt;
    s.s.position.x += (s.vx + Math.sin(t * 2 + s.max * 9) * 0.04) * dt;
    s.s.scale.setScalar(0.15 + 0.6 * k);
    s.s.material.opacity = 0.32 * (1 - k) * Math.min(1, s.life * 3);
  }
  ember.material.opacity = Math.min(1, incenseT / 4) * (0.8 + 0.2 * Math.sin(t * 9));

  // hào quang

  for (const g of glows) {
    if (g.t <= 0) continue;
    g.t -= dt;
    if (g.t <= 0 || !g.p || g.p.removed) { g.t = 0; g.s.visible = false; g.p = null; continue; }
    g.s.position.set(g.p.x, (g.p.low ? 0.35 : 0.8) * g.p.sc, g.p.z + 0.02);
    g.s.scale.setScalar(g.p.sc * 1.8 * (1 + 0.08 * Math.sin(t * 5)));
    g.s.material.opacity = Math.min(1, g.t) * 0.9;
  }
};
})();
