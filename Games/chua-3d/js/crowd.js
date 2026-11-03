/* Chùa 3D – đám đông nhân vật 3D vẽ trên ảnh nền.
   Mỗi bộ phận cơ thể là một InstancedMesh: ~20 draw call cho tới 600 người.
   Mỗi người có hàng đợi lệnh (queue) để game điều khiển: đi tới, quỳ, lạy, gọi hiệu ứng...
   10 đệm đỏ trong ảnh dành cho top 10 công đức (seatVip / demote). */
(function () {
'use strict';
const T = (window.Temple = window.Temple || {});

/* ---------- Camera khớp phối cảnh ảnh nền (bg.webp 915x2000) ----------
   Đo từ 2 hàng đệm đỏ: chân trời ở y=515px (25.75% chiều cao ảnh), tiêu cự 0.5145 × chiều cao ảnh,
   camera cao 1.46m nhìn ngang về -Z; setViewOffset dời tâm ảnh (lens shift).
   Ảnh: y = 515 + 1029·1.46/d (px), x = 457.5 + 1029·x/d (px) với d là độ sâu (m). */
const IMG_ASPECT = 915 / 2000, HORIZON = 0.2575, FOCAL = 0.5145, CAM_H = 1.46;
const FULL_H = 2 * (1 - HORIZON);
/* Khung hình 9:16 (đúng khung dọc TikTok): giữ nguyên bề ngang ảnh, cắt bớt trên/dưới.
   VIEW_H, CROP_TOP tính theo chiều cao ảnh: cắt 4% trên (trần), phần còn lại cắt ở đáy (sàn trống). */
const STAGE_ASPECT = 9 / 16;
const VIEW_H = IMG_ASPECT / STAGE_ASPECT;          // ≈ 0.813 chiều cao ảnh
const CROP_TOP = 0.04;
const D_MIN = 1.4, D_MAX = 6.3;                    // vùng sàn đi lại: độ sâu trước camera (z = -d)
const xLim = d => 0.44 * d - 0.12;                 // nửa bề ngang sàn nhìn thấy ở độ sâu d
const ENTRY_D = 1.1;                               // người mới đi vào từ ngoài mép dưới khung hình
const MAX = 600;

/* ---------- Toạ độ màn hình (% khung 9:16) ↔ sàn 3D ----------
   x% tính từ trái sang, y% từ trên xuống. Điểm sàn (x, z = -d): ảnh y = HORIZON + FOCAL·CAM_H/d, ảnh x = giữa + FOCAL·x/d */
function fromScreen(px, py) {
  const yi = py / 100 * VIEW_H + CROP_TOP;
  const d = FOCAL * CAM_H / Math.max(0.005, yi - HORIZON);
  return { x: (px / 100 * IMG_ASPECT - IMG_ASPECT / 2) * d / FOCAL, z: -d };
}
function toScreen(x, z, y = 0) {   // y: độ cao điểm (0 = trên sàn)
  const d = -z;
  return { x: (IMG_ASPECT / 2 + FOCAL * x / d) / IMG_ASPECT * 100, y: (HORIZON + FOCAL * (CAM_H - y) / d - CROP_TOP) / VIEW_H * 100 };
}

/* Vị trí 10 đệm (theo thứ tự hạng 1..10), miệng lư hương và chỗ quỳ thắp nhang, tính theo % khung game.
   Chỉnh ở trang quản trị → "Vị trí đệm & lư hương" (game tự tải lại); lấy toạ độ bằng ?pick=1.
   Mặc định khớp ảnh nền bg.webp: hạng 1 giữa hàng sau (gần Phật nhất), rồi hai bên; hạng 6-10 hàng trước.
   - cushions, incense: điểm trên SÀN (chỗ người quỳ).
   - burner: miệng lư hương như nhìn thấy trên màn hình (lư hương đặt trên bàn, không phải trên sàn) – khói bốc lên ở đó. */
const DEFAULT_LAYOUT = {
  cushions: [[50, 43.5], [38.8, 43.5], [61.2, 43.5], [27.4, 43.5], [72.6, 43.5],
    [50, 47.3], [36.1, 47.3], [63.9, 47.3], [22.7, 47.3], [77.5, 47.3]],
  burner: [50, 35],     // miệng lư hương trên màn hình
  incense: [50, 42.1],  // chỗ quỳ thắp nhang trên sàn
};
const CUSHIONS = [];                               // [{ x, z }] chỗ người top 10 quỳ
const BURNER = new THREE.Vector3(0, 0.6, -6.62);   // miệng lư hương (khói, đốm lửa)
let PRAY_D = 6.0, PRAY_X = 0;                      // chỗ quỳ thắp nhang (trước lư hương)

/* Hai khu:
   - Khu dưới (d ≤ CROWD_D): đám đông quỳ 2 khối hai bên lối giữa; người đi dạo chỉ đi trên lối giữa.
   - Khu trên: chỉ top 10 trên đệm, người đang lên lễ (PRAY_SPOTS) và người đi thắp nhang.
   CROWD_D và các lối đi được tính lại theo vị trí đệm (applyLayout). */
const SEAT_DMIN = 1.4;   // hàng gần nhất vẫn nằm trọn trong khung 9:16
let CROWD_D = 3.35;
const inUpper = z => -z > CROWD_D;
/* Lối đi có nề nếp (không đi tắt qua người ngồi, không cắt ngang khu đệm):
   - Đám đông ngồi 2 khối hai bên, chừa lối giữa (|x| < aisle). Rời chỗ: đi theo khe giữa 2 hàng ra lối giữa.
   - Lối giữa dẫn lên lối ngang FRONT_D (giữa đám đông và hàng đệm trước).
   - Lên khu trên thì đi vòng hai bên khu đệm theo lối dọc x = ±SIDE_X; đệm hàng sau vào bằng khe MID_D giữa 2 hàng đệm;
     lư hương / chỗ lễ phía sau vào bằng lối BACK_D sau đệm. Về chỗ thì đi ngược lại đúng đường đó.
   ROW1_D / ROW2_D: ranh giới phân biệt chỗ ở hàng đệm trước / hàng đệm sau / phía sau đệm. */
let FRONT_D = 3.62, MID_D = 4.8, BACK_D = 5.72, SIDE_X = 1.32, ROW1_D = 4.6, ROW2_D = 5.5;
const SIZE_K = 0.6;                                // hệ số thu nhỏ chung cho mọi nhân vật (1 = cỡ gốc)
// chỉ to hơn người thường vừa đủ để phân biệt, và chỉ khi đã ở khu trên (đang đi ngang khu dưới thì giữ cỡ thường,
// vì ở gần camera mà phóng to thì trông rất to)
const VIP_K = 1.3;                                 // người trên đệm top 10 = cỡ thường × VIP_K
const UPPER_K = 1.2;                               // người lên khu trên lễ Phật / thắp nhang = cỡ thường × UPPER_K

/* Chỗ quỳ lễ ở khu trên: hai bên khối đệm và phía sau đệm; không chắn trước đệm, không chiếm lư hương */
const PRAY_SPOTS = [];

/* Áp vị trí đệm + lư hương (% khung game) rồi tính lại lối đi, chỗ lễ, mép trên đám đông.
   Gọi trước khi xếp chỗ ngồi (init); đổi vị trí lúc đang chạy thì game tải lại trang. */
function applyLayout(layout) {
  const ok = a => Array.isArray(a) && a.length === 2 && a.every(Number.isFinite);
  const cs = layout && Array.isArray(layout.cushions) && layout.cushions.length === 10 && layout.cushions.every(ok)
    ? layout.cushions : DEFAULT_LAYOUT.cushions;
  const bn = layout && ok(layout.burner) ? layout.burner : DEFAULT_LAYOUT.burner;
  const inc = layout && ok(layout.incense) ? layout.incense : DEFAULT_LAYOUT.incense;
  CUSHIONS.length = 0;
  for (const [px, py] of cs) CUSHIONS.push(fromScreen(px, py));
  const ds = CUSHIONS.map(c => -c.z), dFront = Math.min(...ds), dBack = Math.max(...ds);
  // khoảng cách lấy theo bố cục gốc: đám đông dừng trước chỗ quỳ hàng đệm trước 0.94m, lối ngang 0.67m, lối dọc cách mép đệm 0.27m...
  CROWD_D = Math.max(SEAT_DMIN + 0.6, dFront - 0.94);
  FRONT_D = dFront - 0.67;
  BACK_D = dBack + 0.49;
  MID_D = (dFront + dBack) / 2;
  ROW1_D = (dFront + MID_D) / 2;
  ROW2_D = (dBack + BACK_D) / 2;
  SIDE_X = Math.max(...CUSHIONS.map(c => Math.abs(c.x))) + 0.27;
  // chỗ quỳ thắp nhang (trên sàn); luôn ở sau hàng đệm sau để đi lối sau đệm vào
  const k = fromScreen(inc[0], inc[1]);
  PRAY_X = k.x;
  PRAY_D = Math.max(BACK_D + 0.1, -k.z);
  // miệng lư hương: điểm 3D cách chỗ quỳ 0.62m về phía Phật, cao sao cho nhìn đúng chỗ đã chọn trên màn hình
  const bd = PRAY_D + 0.62, yi = bn[1] / 100 * VIEW_H + CROP_TOP;
  BURNER.set((bn[0] / 100 * IMG_ASPECT - IMG_ASPECT / 2) * bd / FOCAL, Math.min(3, Math.max(0.05, CAM_H - (yi - HORIZON) * bd / FOCAL)), -bd);
  PRAY_SPOTS.length = 0;
  for (let d = BACK_D + 0.38; d >= FRONT_D + 0.08; d -= 0.42) {
    const lim = xLim(d) - 0.15;
    for (let x = -lim; x <= lim + 1e-6; x += 0.42) {
      const besideCushions = Math.abs(x) >= SIDE_X + 0.13;
      const behindCushions = d >= BACK_D - 0.02 && Math.abs(x - PRAY_X) >= 0.45;   // trước lư hương là chỗ thắp nhang
      if (besideCushions || behindCushions) PRAY_SPOTS.push({ x, z: -d, p: null });
    }
  }
  if (T.crowd) Object.assign(T.crowd.consts, { CROWD_D, PRAY_D, PRAY_X });
}
applyLayout(DEFAULT_LAYOUT);

const camera = new THREE.PerspectiveCamera(2 * Math.atan(FULL_H / 2 / FOCAL) * 180 / Math.PI, IMG_ASPECT / FULL_H, 0.1, 60);
camera.position.set(0, CAM_H, 0);
camera.setViewOffset(IMG_ASPECT * 1000, FULL_H * 1000, 0, (FULL_H / 2 - HORIZON + CROP_TOP) * 1000, IMG_ASPECT * 1000, VIEW_H * 1000);

const scene = new THREE.Scene();
scene.add(new THREE.HemisphereLight(0xffe6c0, 0x4a2814, 0.6));
const key = new THREE.DirectionalLight(0xffd29a, 0.9); key.position.set(4, 6, 2); scene.add(key);
const fill = new THREE.DirectionalLight(0xffc890, 0.25); fill.position.set(-4, 2, 3); scene.add(fill);
const rim = new THREE.DirectionalLight(0xffb060, 0.55); rim.position.set(-1, 3, -8); scene.add(rim);

const rand = (a, b) => a + Math.random() * (b - a);
const isNpc = p => !p.user || !!p.user.npc;        // NPC có thể được game đặt tên (user.npc = true)
const clamp = THREE.MathUtils.clamp;
const angDiff = (a, b) => { let d = (a - b) % (Math.PI * 2); if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2; return d; };
T.util = { rand, clamp, angDiff };
// activity: xác suất tự đứng dậy ra lối giữa đi dạo (NPC / người chơi)
// walkSpeed: hệ số tốc độ đi + quay người; actSpeed: hệ số tốc độ lạy, đứng dậy, quỳ xuống (chỉnh ở trang quản trị)
T.params = { activity: 0.05, playerActivity: 0.03, walkSpeed: 3, actSpeed: 2 };

/* ---------- Hình dạng nhân vật ----------
   Tay chân là "viên thuốc" (hai đầu bo tròn) + khớp cầu ở vai, khuỷu, gối để các đoạn nối mềm, không cứng như đồ gỗ. */
const L1 = 0.42, L2 = 0.42;
// LatheGeometry từ danh sách [bán kính, y] theo thứ tự y tăng dần (mặt hướng ra ngoài)
const lathe = (pts, seg = 16) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg);
// viên thuốc dọc trục -Y: đầu trên tâm y=0 bán kính r1, đầu dưới tâm y=-len bán kính r2
function capsule(r1, r2, len, seg = 10, steps = 3) {
  const pts = [];
  for (let i = 0; i <= steps; i++) { const a = -Math.PI / 2 + (i / steps) * Math.PI / 2; pts.push([r2 * Math.cos(a), -len + r2 * Math.sin(a)]); }
  for (let i = 0; i <= steps; i++) { const a = (i / steps) * Math.PI / 2; pts.push([r1 * Math.cos(a), r1 * Math.sin(a)]); }
  return lathe(pts, seg);
}
const GEO = {
  robeTop: lathe([[0.19, -0.04], [0.17, 0.06], [0.158, 0.2], [0.168, 0.32], [0.183, 0.41], [0.172, 0.465], [0.13, 0.505], [0.07, 0.53], [0, 0.535]], 20),
  skirt:   lathe([[0.28, -0.76], [0.235, -0.48], [0.2, -0.2], [0.17, 0.03], [0.12, 0.06], [0, 0.07]], 18),
  collar:  new THREE.CylinderGeometry(0.05, 0.08, 0.05, 14),
  neck:    capsule(0.04, 0.045, 0.08, 10),
  face:    new THREE.SphereGeometry(0.1, 16, 12),
  nose:    new THREE.SphereGeometry(0.016, 6, 4),
  ear:     new THREE.SphereGeometry(0.022, 6, 4),
  hair:    new THREE.SphereGeometry(0.108, 16, 8, 0, Math.PI * 2, 0, Math.PI * 0.6),
  bun:     new THREE.SphereGeometry(0.064, 12, 10),
  eye:     new THREE.SphereGeometry(0.011, 4, 3),
  thigh:   capsule(0.075, 0.066, L1),
  shin:    capsule(0.064, 0.05, L2),
  joint:   new THREE.SphereGeometry(1, 10, 8),       // vai / khuỷu / gối (scale theo bán kính)
  foot:    new THREE.SphereGeometry(1, 8, 6),
  upper:   capsule(0.062, 0.07, 0.3),
  // ống tay áo tràng loe rộng, có mép bo
  sleeve:  lathe([[0, -0.27], [0.085, -0.274], [0.115, -0.262], [0.112, -0.2], [0.096, -0.12], [0.08, -0.04], [0.066, 0.01], [0.035, 0.035], [0, 0.04]], 12),
  hand:    new THREE.SphereGeometry(0.04, 8, 6),
  shadow:  new THREE.PlaneGeometry(1, 1),
};
GEO.shadow.rotateX(-Math.PI / 2);

function radialTexture(stops, size = 64) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  const g = c.getContext('2d'), gr = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  for (const [o, col] of stops) gr.addColorStop(o, col);
  g.fillStyle = gr; g.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(c);
}
T.radialTexture = radialTexture;

const MAT = {
  robe: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.82, side: THREE.DoubleSide }),
  skin: new THREE.MeshStandardMaterial({ color: 0xf0c6a2, roughness: 0.55 }),
  hair: new THREE.MeshStandardMaterial({ color: 0x16100c, roughness: 0.4 }),
  white: new THREE.MeshStandardMaterial({ color: 0xf2efe8, roughness: 0.8 }),
  shoe: new THREE.MeshStandardMaterial({ color: 0x241c18, roughness: 0.7 }),
  eye: new THREE.MeshBasicMaterial({ color: 0x1a1210 }),
  shadow: new THREE.MeshBasicMaterial({ map: radialTexture([[0, 'rgba(20,8,0,.55)'], [1, 'rgba(20,8,0,0)']]), transparent: true, depthWrite: false }),
};
// áo tràng lam (xám xanh / xám tím) như Phật tử đi chùa. Đèn trong cảnh khá sáng nên màu gốc phải tối hơn màu muốn thấy
const ROBE_COLORS = [0x6f7690, 0x687089, 0x777b94, 0x6c738c, 0x74778f, 0x656e86].map(c => new THREE.Color(c));

function IM(geo, mat, per) {
  const m = new THREE.InstancedMesh(geo, mat, MAX * per);
  m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  if (mat === MAT.robe) m.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(MAX * per * 3), 3);
  m.frustumCulled = false; m.count = 0; m.userData.per = per;
  scene.add(m);
  return m;
}
const I = {
  shadow: IM(GEO.shadow, MAT.shadow, 1),
  robeTop: IM(GEO.robeTop, MAT.robe, 1), skirt: IM(GEO.skirt, MAT.robe, 1),
  thigh: IM(GEO.thigh, MAT.robe, 2), shin: IM(GEO.shin, MAT.robe, 2),
  upper: IM(GEO.upper, MAT.robe, 2), sleeve: IM(GEO.sleeve, MAT.robe, 2),
  joint: IM(GEO.joint, MAT.robe, 6),                 // 2 vai, 2 khuỷu, 2 gối
  collar: IM(GEO.collar, MAT.white, 1), neck: IM(GEO.neck, MAT.skin, 1),
  face: IM(GEO.face, MAT.skin, 1), nose: IM(GEO.nose, MAT.skin, 1), ear: IM(GEO.ear, MAT.skin, 2),
  hair: IM(GEO.hair, MAT.hair, 1), bun: IM(GEO.bun, MAT.hair, 1),
  eye: IM(GEO.eye, MAT.eye, 2), foot: IM(GEO.foot, MAT.shoe, 2), hand: IM(GEO.hand, MAT.skin, 2),
};
I.shadow.renderOrder = -1;
const ALL_IMS = Object.values(I);
const ROBE_IMS = [I.robeTop, I.skirt, I.thigh, I.shin, I.upper, I.sleeve, I.joint];

const mat4 = (x, y, z, rx = 0, sx = 1, sy = sx, sz = sx) => {
  const m = new THREE.Matrix4().makeRotationX(rx); m.scale(new THREE.Vector3(sx, sy, sz)); return m.setPosition(x, y, z);
};
const LOCAL = {
  shadow: mat4(0, 0.004, 0, 0, 0.62, 1, 0.62),
  collar: mat4(0, 0.505, 0), neck: mat4(0, 0.075, 0),
  face: mat4(0, 0.165, 0.004, 0, 0.92, 1.08, 0.98),
  nose: mat4(0, 0.148, 0.097, 0, 1, 1.25, 1),
  earP: mat4(0.092, 0.158, -0.004, 0, 0.6, 1.3, 1), earM: mat4(-0.092, 0.158, -0.004, 0, 0.6, 1.3, 1),
  hair: mat4(0, 0.176, -0.008, -0.5), bun: mat4(0, 0.215, -0.11, 0, 1, 0.9, 1),
  eyeP: mat4(0.034, 0.17, 0.09), eyeM: mat4(-0.034, 0.17, 0.09),
  foot: mat4(0, -L2 - 0.03, 0.05, 0, 0.05, 0.035, 0.1),
  shoulderP: mat4(0.175, 0.428, 0, 0, 0.066), shoulderM: mat4(-0.175, 0.428, 0, 0, 0.066),
};
const ZERO = new THREE.Matrix4().makeScale(0, 0, 0);

/* ---------- Tư thế ----------
   P = bên +x, M = bên -x. t/k: góc đùi/gối. legW: bề ngang chân (thu nhỏ khi quỳ cho váy che).
   Tay: vị trí khuỷu (e) và bàn tay (h) trong hệ toạ độ thân. sk: váy áo tràng (xoè ra khi quỳ). */
const SH_X = 0.19, SH_Y = 0.43, UPPER = 0.3, FORE = 0.27;
const ARM_KEYS = ['ePx', 'ePy', 'ePz', 'hPx', 'hPy', 'hPz', 'eMx', 'eMy', 'eMz', 'hMx', 'hMy', 'hMz'];
const KEYS = ['hipY', 'torso', 'head', 'tP', 'kP', 'tM', 'kM', 'legW', 'skY', 'skW', 'skZ', ...ARM_KEYS];
const arms = (e, h, e2 = e, h2 = h) => ({
  ePx: e[0], ePy: e[1], ePz: e[2], hPx: h[0], hPy: h[1], hPz: h[2],
  eMx: -e2[0], eMy: e2[1], eMz: e2[2], hMx: -h2[0], hMy: h2[1], hMz: h2[2],
});
const STAND = { hipY: 0.88, torso: 0, head: 0, tP: 0, kP: 0.03, tM: 0, kM: 0.03, legW: 1, skY: 1, skW: 1, skZ: 0,
  ...arms([0.22, 0.14, 0.02], [0.21, -0.12, 0.07]) };
// quỳ: lưng thẳng, chắp tay trước ngực, váy áo tràng xoè ra
const KNEEL = { hipY: 0.17, torso: 0.03, head: 0.08, tP: -1.5, kP: 3.0, tM: -1.5, kM: 3.0, legW: 0.55, skY: 0.3, skW: 1.5, skZ: 0.12,
  ...arms([0.14, 0.21, 0.16], [0.03, 0.41, 0.27]) };
const BOW = { hipY: 0.22, torso: 1.15, head: 0.25, tP: -1.5, kP: 3.0, tM: -1.5, kM: 3.0, legW: 0.55, skY: 0.32, skW: 1.5, skZ: 0.12,
  ...arms([0.21, 0.5, 0.29], [0.16, 0.52, 0.55]) };
const WALK = {};
const swing = a => [[SH_X + 0.02, SH_Y - UPPER * Math.cos(a), -UPPER * Math.sin(a)],
  [SH_X + 0.02, SH_Y - UPPER * Math.cos(a) - FORE * Math.cos(a - 0.35), -UPPER * Math.sin(a) - FORE * Math.sin(a - 0.35)]];
function walkPose(ph, amp) {
  const s = Math.sin(ph), c = Math.cos(ph);
  const [eP, hP] = swing(-s * 0.35 * amp), [eM, hM] = swing(s * 0.35 * amp);
  Object.assign(WALK, STAND, {
    hipY: 0.86 + 0.02 * Math.cos(2 * ph) * amp, torso: 0.05 * amp, head: -0.03,
    tP: s * 0.42 * amp, kP: 0.05 + Math.max(0, -c) * 0.75 * amp,
    tM: -s * 0.42 * amp, kM: 0.05 + Math.max(0, c) * 0.75 * amp,
  }, arms(eP, hP, eM, hM));
  return WALK;
}

/* ---------- Trạng thái chung ---------- */
let renderer = null;
let people = [];
let seats = [];
let maxPeople = 500;
let S = 0.6 * SIZE_K;   // tỉ lệ kích thước nhân vật thường
let AISLE = 0.2;        // nửa bề rộng lối giữa (m), tính lại theo chỗ ngồi
let ROW_GAP = 0.3;      // khoảng cách 2 hàng ngồi (đi theo khe giữa 2 hàng)
let onRemove = null;
let colorDirty = false;
const vipAt = new Array(CUSHIONS.length).fill(null);   // ai đang giữ đệm hạng i

/* ---------- Đường đi ---------- */
const sideOf = x => x > 0.01 ? 1 : x < -0.01 ? -1 : (Math.random() < 0.5 ? -1 : 1);
// từ điểm nối lối giữa (0, -FRONT_D) đi tới (x, z) ở khu trên, không cắt ngang khu đệm; side: đi lối dọc bên nào (-1 / 1)
function upperPath(x, z, side = sideOf(x)) {
  const d = -z, sx = side * SIDE_X;
  if (d <= FRONT_D + 0.05) return [[x, -FRONT_D], [x, z]];
  if (Math.abs(x) >= SIDE_X) return [[sx, -FRONT_D], [sx, z], [x, z]];          // chỗ lễ hai bên khối đệm
  if (d < ROW1_D) return [[x, -FRONT_D], [x, z]];                                // đệm hàng trước: vào thẳng từ lối ngang
  if (d < ROW2_D) return [[sx, -FRONT_D], [sx, -MID_D], [x, -MID_D], [x, z]];       // đệm hàng sau: vào khe giữa 2 hàng đệm
  return [[sx, -FRONT_D], [sx, -BACK_D], [x, -BACK_D], [x, z]];                  // lư hương / chỗ lễ phía sau đệm
}
// từ chỗ ngồi khu dưới ra lối giữa: đi theo khe phía trước hàng của mình (về phía camera)
function lowerOut(x, z) {
  if (Math.abs(x) < AISLE) return [];
  const zz = z + ROW_GAP / 2;
  return [[x, zz], [0, zz]];
}
/* danh sách điểm đi qua từ (fx, fz) tới (tx, tz) */
function route(fx, fz, tx, tz) {
  const H = [0, -FRONT_D], pts = [];
  const fu = inUpper(fz), tu = inUpper(tz);
  if (fu && tu) {
    // đi trong khu trên (vd. từ đệm ra lư hương): cùng một lối dọc, không quay ra lối giữa phía trước
    const s = Math.abs(tx) > 0.01 ? sideOf(tx) : sideOf(fx);
    pts.push(...upperPath(fx, fz, s).reverse().slice(1), ...upperPath(tx, tz, s));
  } else {
    if (fu) pts.push(...upperPath(fx, fz).reverse().slice(1), H);
    else pts.push(...lowerOut(fx, fz));
    if (tu) pts.push(H, ...upperPath(tx, tz));
    else {
      const zz = Math.abs(tx) < AISLE ? tz : tz + ROW_GAP / 2;
      pts.push([0, zz], [tx, zz], [tx, tz]);
    }
  }
  // bỏ điểm trùng / quá gần nhau (điểm đích cuối luôn giữ, để ngồi đúng chỗ dù 2 hàng ghế sát nhau)
  let list = [[fx, fz]];
  pts.forEach((p, i) => {
    const q = list[list.length - 1], d = Math.hypot(p[0] - q[0], p[1] - q[1]);
    if (d >= 0.04 || (i === pts.length - 1 && d > 0.005)) list.push(p);
  });
  // bỏ đoạn "đi tới rồi quay ngược lại" trên cùng một đường thẳng (vd. xuống lối trước rồi lại lên lối dọc)
  for (let changed = true; changed;) {
    changed = false;
    for (let i = 1; i < list.length - 1; i++) {
      const [a, p, b] = [list[i - 1], list[i], list[i + 1]];
      const sameX = Math.abs(a[0] - p[0]) < 0.01 && Math.abs(b[0] - p[0]) < 0.01;
      const sameZ = Math.abs(a[1] - p[1]) < 0.01 && Math.abs(b[1] - p[1]) < 0.01;
      const k = sameX ? 1 : sameZ ? 0 : -1;
      if (k >= 0 && (p[k] - a[k]) * (b[k] - p[k]) < 0) { list.splice(i, 1); changed = true; break; }
    }
  }
  return list.slice(1).map(([x, z]) => ({ t: 'walk', x, z }));
}

/* ---------- Nhân vật ---------- */
class Person {
  constructor(o) {
    this.user = o.user || null;            // null = NPC (NPC có tên thì user.npc = true)
    this.x = o.x; this.z = o.z;
    this.homeX = o.x; this.homeZ = o.z;
    const hr = Math.random();   // kiểu tóc: búi (đa số) / tóc ngắn / cạo trọc (ít)
    this.hair = hr < 0.62 ? 'bun' : hr < 0.95 ? 'short' : 'bald';
    this.color = ROBE_COLORS[Math.floor(Math.random() * ROBE_COLORS.length)];
    this.queue = [];
    this.ghost = false;                    // đang chạy lệnh: được đi xuyên qua người khác
    this.hl = 0;                           // thời gian còn làm nổi bật tên
    this.vipRank = -1;                     // >=0: số đệm top 10 đang giữ (0..9)
    this.topRank = -1;                     // hạng thật trong top 10 (main.js gán; khác số đệm vì người trong top ngồi yên)
    this.sc = S; this.targetScale = S;     // kích thước (người trên đệm to hơn)
    this.lastActive = performance.now();
    this.heading = Math.PI; this.targetHeading = Math.PI;   // nhìn về tượng Phật (-Z)
    this.tx = o.x; this.tz = o.z;
    this.phase = rand(0, 6); this.blockT = 0;
    this.dirty = true; this.removed = false; this.headY = 1;
    if (o.standing) { this.p = { ...STAND }; this.set('idle', 0.3); }
    else { this.p = { ...KNEEL }; this.set('sit', rand(1, 12)); }
  }
  get activity() { return this.vipRank >= 0 ? 0 : isNpc(this) ? T.params.activity : T.params.playerActivity; }

  set(state, timer) {
    this.state = state; this.timer = timer;
    if (state !== 'hold') this.low = state === 'sit' || state === 'bow' || state === 'sitdown';
  }

  /* ----- hàng đợi lệnh ----- */
  enqueue(steps) {
    if (this.removed || this.queue.length > 40) return false;
    this.queue.push(...steps);
    this.lastActive = performance.now();
    this.kick();
    return true;
  }
  kick() {   // cho lệnh chạy sớm, không đợi hết lượt ngồi
    if (this.state === 'sit' || this.state === 'idle' || this.state === 'hold') this.timer = Math.min(this.timer, 0.05);
    else if (this.state === 'walk' && !this.ghost) this.set('idle', 0.05);
  }
  finish(fallback) {   // trạng thái hiện tại xong: chạy lệnh tiếp theo hoặc tự do
    if (this.queue.length) this.run(this.queue.shift());
    else { this.ghost = false; fallback(); }
  }
  run(step) {
    switch (step.t) {
      case 'stand': if (this.low) this.set('standup', 1.3); else this.set('hold', 0.05); break;
      case 'kneel': if (this.low) this.set('hold', 0.05); else this.goSit(); break;
      case 'bow':
        if (!this.low) { this.queue.unshift(step); this.goSit(); }
        else this.set('bow', 2.2);
        break;
      case 'walk': this.walkTo(step.x, step.z); break;
      case 'go': this.goTo(step.x, step.z); break;   // đi theo lối (route), không đi tắt
      case 'home':   // chọn chỗ về theo tình trạng mới nhất (top 10 / chỗ cũ / ghế trống); đang ở đúng chỗ thì khỏi đứng dậy
        resolveHome(this);
        if (Math.hypot(this.homeX - this.x, this.homeZ - this.z) < 0.05) this.set('hold', 0.01);
        else if (this.low) { this.queue.unshift(step); this.set('standup', 1.3); }
        else this.goTo(this.homeX, this.homeZ);
        break;
      case 'spot': {   // giữ một chỗ lễ ở khu trên rồi đi tới; hết chỗ thì lễ tại chỗ
        const s = reserveSpot(this);
        if (s) this.goTo(s.x, s.z); else this.set('hold', 0.01);
        break;
      }
      case 'release': releaseSpot(this); this.set('hold', 0.01); break;
      case 'wait': this.set('hold', step.d || 1); break;
      case 'call': try { step.fn(this); } catch (e) { console.error(e); } if (!this.removed) this.set('hold', 0.01); break;
    }
  }
  cmdBow(n) { this.enqueue(Array.from({ length: n }, () => ({ t: 'bow' }))); }
  /* đi dạo có nề nếp: ra lối giữa, đi lên / xuống một đoạn, đứng một lúc rồi về chỗ quỳ */
  cmdWalk() {
    if (this.vipRank >= 0) return;
    this.enqueue([{ t: 'stand' }, { t: 'go', x: rand(-0.04, 0.04), z: -rand(SEAT_DMIN + 0.2, CROWD_D - 0.1) },
      { t: 'wait', d: rand(1, 3) }, { t: 'home' }, { t: 'kneel' }]);
  }
  /* lệnh đang chờ kết thúc bằng "về chỗ, quỳ" mà sắp làm việc khác (cũng tự về chỗ sau đó) thì bỏ, khỏi đi về rồi lại đi ra
     (vd. người mới vào tặng quà ngay: đi thẳng tới lư hương, không lên chỗ ngồi trước) */
  dropTrailingHome() {
    const q = this.queue;
    while (q.length >= 2 && q[q.length - 1].t === 'kneel' && q[q.length - 2].t === 'home') q.length -= 2;
  }
  cmdIncense(onLight) {
    this.dropTrailingHome();
    this.enqueue([{ t: 'stand' }, { t: 'go', x: PRAY_X + rand(-0.25, 0.25), z: -PRAY_D }, { t: 'kneel' },
      { t: 'call', fn: onLight }, { t: 'bow' }, { t: 'bow' }, { t: 'bow' }, { t: 'home' }, { t: 'kneel' }]);
  }
  /* tặng quà: lên khu trên quỳ lạy n lạy rồi về chỗ; người trên đệm top 10 thì lạy ngay tại đệm */
  cmdPray(n) {
    if (this.vipRank >= 0) return this.cmdBow(n);
    this.dropTrailingHome();
    this.enqueue([{ t: 'stand' }, { t: 'spot' }, { t: 'kneel' },
      ...Array.from({ length: n }, () => ({ t: 'bow' })),
      { t: 'wait', d: 0.8 }, { t: 'release' }, { t: 'home' }, { t: 'kneel' }]);
  }
  cmdGoHome() {   // cuối hàng đợi đã có "về chỗ, quỳ" thì thôi (chỗ mới lấy theo homeX/homeZ lúc chạy tới)
    const q = this.queue;
    if (q.length >= 2 && q[q.length - 1].t === 'kneel' && q[q.length - 2].t === 'home') return this.kick();
    this.enqueue([{ t: 'home' }, { t: 'kneel' }]);
  }
  cmdLeave() { this.enqueue([{ t: 'stand' }, { t: 'go', x: 0, z: -0.9 }, { t: 'call', fn: p => remove(p) }]); }

  goSit() { this.targetHeading = Math.PI; this.next = 'sitdown'; this.set('turn', 99); }
  // đi theo lối: chèn các đoạn đi thẳng vào đầu hàng đợi
  goTo(x, z) {
    this.queue.unshift(...route(this.x, this.z, x, z));
    this.set('hold', 0.01);
  }
  walkTo(x, z) {   // đi thẳng một đoạn (đang làm lệnh nên đi xuyên qua người khác, không bị kẹt)
    this.tx = x; this.tz = z; this.ghost = true;
    if (Math.hypot(x - this.x, z - this.z) < 0.03) { this.set('hold', 0.01); return; }
    this.targetHeading = Math.atan2(x - this.x, z - this.z);
    this.next = 'walk';
    this.set('turn', 99);
  }

  update(dt) {
    if (this.hl > 0) this.hl -= dt;
    // tốc độ chỉnh ở trang quản trị: đi / quay người theo walkSpeed, lạy / đứng / quỳ theo actSpeed;
    // thời gian ngồi yên giữa các lần lạy giữ nguyên
    const wk = T.params.walkSpeed, ak = T.params.actSpeed;
    const walking = this.state === 'walk' || this.state === 'turn';
    this.timer -= this.state === 'sit' || this.state === 'idle' ? dt : dt * (walking ? wk : ak);
    let d = KNEEL, rate = 4, moved = false;
    switch (this.state) {
      case 'sit':
        rate = 3;
        if (this.timer <= 0) this.finish(() => {
          const r = Math.random();
          if (r < 0.2) this.set('bow', 2.2);
          else if (r < 0.2 + this.activity) this.cmdWalk();
          else this.set('sit', rand(3, 9));
        });
        break;
      case 'bow':   // cúi xuống rồi ngẩng lên trong 2.2s
        d = this.timer > 0.9 ? BOW : KNEEL; rate = 3;
        if (this.timer <= 0) this.finish(() => this.set('sit', rand(3, 9)));
        break;
      case 'standup':
        d = STAND; rate = 2.6;
        if (this.timer <= 0) this.finish(() => this.set('idle', rand(0.3, 1.2)));
        break;
      case 'idle':   // đứng không có lệnh: về chỗ (theo lối) rồi quỳ
        d = STAND;
        if (this.timer <= 0) this.finish(() => {
          if (Math.hypot(this.homeX - this.x, this.homeZ - this.z) < 0.05) this.goSit();
          else this.enqueue([{ t: 'home' }, { t: 'kneel' }]);
        });
        break;
      case 'hold':
        d = this.low ? KNEEL : STAND;
        if (this.timer <= 0) this.finish(() => this.set(this.low ? 'sit' : 'idle', rand(1, 4)));
        break;
      case 'sitdown':
        d = KNEEL; rate = 2.6;
        if (this.timer <= 0) {
          if (!this.ghost && this.vipRank < 0) { this.homeX = this.x; this.homeZ = this.z; }
          this.finish(() => this.set('sit', rand(3, 9)));
        }
        break;
      case 'turn': {
        const diff = angDiff(this.targetHeading, this.heading);
        this.heading += Math.sign(diff) * Math.min(Math.abs(diff), 2.6 * wk * dt);
        this.phase += dt * 6 * wk; moved = true;
        d = walkPose(this.phase, 0.4); rate = 8;
        if (Math.abs(diff) < 0.02) {
          this.heading = this.targetHeading;
          if (this.next === 'walk') this.set('walk', 99); else this.set('sitdown', 1.6);
        }
        break;
      }
      case 'walk': {
        let dx = this.tx - this.x, dz = this.tz - this.z;
        const dist = Math.hypot(dx, dz);
        if (dist < 0.005) { d = STAND; this.finish(() => this.set('idle', rand(0.5, 2))); break; }   // bước cuối được kẹp đúng điểm đích
        dx /= dist; dz /= dist;
        const step = Math.min(1.1 * this.sc * wk * dt, dist);
        this.x += dx * step; this.z += dz * step; moved = true;
        this.heading += angDiff(Math.atan2(dx, dz), this.heading) * Math.min(1, dt * 8 * wk);
        this.phase += dt * 7 * wk * Math.sqrt(S / this.sc);
        d = walkPose(this.phase, 1); rate = 10;
        break;
      }
    }
    if (this.removed) return;
    // kích thước theo vị trí: trên đệm top 10 > lên khu trên lễ > đám đông khu dưới
    this.targetScale = !inUpper(this.z) ? S : this.vipRank >= 0 ? S * VIP_K : S * UPPER_K;
    if (Math.abs(this.targetScale - this.sc) > 1e-3) { this.sc += (this.targetScale - this.sc) * Math.min(1, dt * 1.5); moved = true; }
    const k = 1 - Math.exp(-rate * dt * (walking ? wk : ak));
    let change = 0;
    for (const key of KEYS) { const v = (d[key] - this.p[key]) * k; this.p[key] += v; change += Math.abs(v); }
    if (moved || change > 1e-4) this.dirty = true;   // ngồi yên thì không tính lại ma trận
  }

  applyColor() {
    for (const im of ROBE_IMS) for (let k = 0; k < im.userData.per; k++) im.setColorAt(this.i * im.userData.per + k, this.color);
    colorDirty = true;
  }

  write() {
    const p = this.p, i = this.i, i2 = i * 2, j = i * 6;
    bone(B.root, null, 0, 0, 0, 0, this.heading, this.sc); B.root.setPosition(this.x, 0, this.z);
    bone(B.hips, B.root, 0, p.hipY, 0, 0);
    bone(B.torso, B.hips, 0, 0, 0, p.torso);
    bone(B.head, B.torso, 0, 0.52, 0, p.head);
    bone(B.thP, B.hips, 0.09, 0, 0, p.tP); bone(B.knP, B.thP, 0, -L1, 0, p.kP);
    bone(B.thM, B.hips, -0.09, 0, 0, p.tM); bone(B.knM, B.thM, 0, -L1, 0, p.kM);
    _s.makeScale(p.skW, p.skY, p.skW).setPosition(0, 0, p.skZ); put(I.skirt, i, B.hips, _s);
    put(I.shadow, i, B.root, LOCAL.shadow);
    I.robeTop.setMatrixAt(i, B.torso);
    put(I.collar, i, B.torso, LOCAL.collar);
    put(I.neck, i, B.head, LOCAL.neck);
    put(I.face, i, B.head, LOCAL.face);
    put(I.nose, i, B.head, LOCAL.nose);
    put(I.ear, i2, B.head, LOCAL.earP); put(I.ear, i2 + 1, B.head, LOCAL.earM);
    if (this.hair !== 'bald') put(I.hair, i, B.head, LOCAL.hair); else I.hair.setMatrixAt(i, ZERO);
    if (this.hair === 'bun') put(I.bun, i, B.head, LOCAL.bun); else I.bun.setMatrixAt(i, ZERO);
    put(I.eye, i2, B.head, LOCAL.eyeP); put(I.eye, i2 + 1, B.head, LOCAL.eyeM);
    // chân + khớp gối
    _s.makeScale(p.legW, 1, p.legW);
    put(I.thigh, i2, B.thP, _s); put(I.thigh, i2 + 1, B.thM, _s);
    put(I.shin, i2, B.knP, _s); put(I.shin, i2 + 1, B.knM, _s);
    const kr = 0.068 * clamp((p.legW - 0.55) / 0.45, 0, 1);   // khi quỳ gối nằm trong váy: ẩn khớp
    _s.makeScale(kr, kr, kr);
    put(I.joint, j + 4, B.knP, _s); put(I.joint, j + 5, B.knM, _s);
    put(I.foot, i2, B.knP, LOCAL.foot); put(I.foot, i2 + 1, B.knM, LOCAL.foot);
    // tay: vai, bắp tay, khuỷu, ống tay áo, bàn tay
    put(I.joint, j, B.torso, LOCAL.shoulderP); put(I.joint, j + 1, B.torso, LOCAL.shoulderM);
    seg(I.upper, i2, SH_X, SH_Y, 0, p.ePx, p.ePy, p.ePz, UPPER);
    seg(I.sleeve, i2, p.ePx, p.ePy, p.ePz, p.hPx, p.hPy, p.hPz, FORE, I.hand);
    seg(I.upper, i2 + 1, -SH_X, SH_Y, 0, p.eMx, p.eMy, p.eMz, UPPER);
    seg(I.sleeve, i2 + 1, p.eMx, p.eMy, p.eMz, p.hMx, p.hMy, p.hMz, FORE, I.hand);
    _s.makeScale(0.07, 0.07, 0.07);
    _s.setPosition(p.ePx, p.ePy, p.ePz); put(I.joint, j + 2, B.torso, _s);
    _s.setPosition(p.eMx, p.eMy, p.eMz); put(I.joint, j + 3, B.torso, _s);
    this.headY = B.head.elements[13] + 0.3 * this.sc;   // vị trí vẽ tên
    this.dirty = false;
  }
}

/* Ma trận xương dùng chung (tính tuần tự từng người) */
const B = {}; for (const n of ['root', 'hips', 'torso', 'head', 'thP', 'knP', 'thM', 'knM']) B[n] = new THREE.Matrix4();
const _m = new THREE.Matrix4(), _s = new THREE.Matrix4(), _o = new THREE.Matrix4(), _v = new THREE.Vector3();
// out = parent * T(x,y,z) * Rx(rx)   (gốc: Ry(ry) * S(s))
function bone(out, parent, x, y, z, rx, ry = 0, s = 1) {
  if (!parent) { out.makeRotationY(ry); out.scale(_v.set(s, s, s)); return; }
  _m.makeRotationX(rx).setPosition(x, y, z);
  out.multiplyMatrices(parent, _m);
}
function put(im, idx, parent, local) { _o.multiplyMatrices(parent, local); im.setMatrixAt(idx, _o); }
// Đoạn tay (hướng -Y, dài `rest`) nối điểm a → b trong hệ thân; kèm bàn tay ở đầu b nếu có
const DOWN = new THREE.Vector3(0, -1, 0), _q = new THREE.Quaternion(), _d = new THREE.Vector3(), _sc = new THREE.Vector3();
function seg(im, idx, ax, ay, az, bx, by, bz, rest, handIm) {
  _d.set(bx - ax, by - ay, bz - az);
  const len = _d.length() || 1e-4;
  _d.divideScalar(len);
  _q.setFromUnitVectors(DOWN, _d);
  _m.compose(_v.set(ax, ay, az), _q, _sc.set(1, len / rest, 1));
  put(im, idx, B.torso, _m);
  if (handIm) {
    _m.compose(_v.set(bx + _d.x * 0.045, by + _d.y * 0.045, bz + _d.z * 0.045), _q, _sc.set(0.85, 1.2, 0.75));
    put(handIm, idx, B.torso, _m);
  }
}

/* ---------- Chỗ ngồi đám đông (chỉ khu dưới) ----------
   Hai khối hai bên, chừa lối giữa; hàng ngay ngắn, cột thẳng. Hàng đầu sát khu trên.
   Đông quá thì nhân vật tự nhỏ lại (tối thiểu 0.26) rồi ngồi sát nhau hơn.
   Thứ tự lấp ghế (ít người vẫn phủ đều cả hai khối, vẫn thẳng hàng thẳng cột): trước hết các ghế cách 4 hàng 4 cột,
   rồi cách 2 hàng 2 cột, rồi lấp kín; trong mỗi lượt thì hàng trên (gần Phật) trước. */
function buildSeats(n) {
  const aisleOf = sp => Math.max(0.14, sp * 0.55);
  const rows = sp => {
    const out = [], a = aisleOf(sp);
    let r = 0;
    for (let d = CROWD_D - 0.05; d >= SEAT_DMIN; d -= sp * 0.8, r++) {
      const lim = xLim(d) - 0.04;
      for (let x = a + sp / 2, c = 0; x <= lim; x += sp, c++) {
        const lvl = r % 4 === 0 && c % 4 === 0 ? 0 : r % 2 === 0 && c % 2 === 0 ? 1 : 2;
        out.push({ x: -x, z: -d, r, lvl }, { x, z: -d, r, lvl });
      }
    }
    return out;
  };
  let sp = 0.8 * 0.6;
  while (rows(sp).length < n && sp > 0.06) sp *= 0.97;
  S = Math.min(0.6, Math.max(0.26, sp / 0.8)) * SIZE_K;
  AISLE = aisleOf(sp) * 0.8; ROW_GAP = sp * 0.8;
  seats = rows(sp).slice(0, n).sort((a, b) => a.lvl - b.lvl || a.r - b.r).map(s => ({ x: s.x, z: s.z, p: null }));
}
/* chỗ lễ ở khu trên */
function reserveSpot(p) {
  if (p.spot) return p.spot;
  const free = PRAY_SPOTS.filter(s => !s.p);
  if (!free.length) return null;
  const s = free[Math.floor(Math.random() * free.length)];
  s.p = p; p.spot = s;
  return s;
}
function releaseSpot(p) { if (p.spot) { p.spot.p = null; p.spot = null; } }
// ghế xếp từ hàng trên xuống, gần lối giữa trước: NPC lấy ghế trống đầu tiên cho khối ngồi liền nhau, gọn;
// người chơi lấy ngẫu nhiên trong vài ghế trống đầu tiên
function pickSeat(front) {
  const free = seats.filter(s => !s.p);
  if (!free.length) return null;
  return front ? free[Math.floor(Math.random() * Math.min(free.length, 6))] : free[0];
}
// origSeat: chỗ ngồi gốc của người đó, vẫn nhớ khi lên top 10 (rớt top thì xin về lại đúng chỗ đó nếu còn trống)
function takeSeat(p, seat) { if (!seat) return; seat.p = p; p.seat = seat; p.origSeat = seat; p.homeX = seat.x; p.homeZ = seat.z; }
function leaveSeat(p) { if (p.seat) { if (p.seat.p === p) p.seat.p = null; p.seat = null; } }
/* Quyết định "về đâu" ngay lúc bắt đầu quay về (sau thắp nhang / lên lễ / đi dạo / rớt top), theo tình trạng mới nhất:
   1. đang trong top 10 → đúng đệm của hạng hiện tại
   2. chỗ ngồi đang giữ vẫn là của mình → về đó
   3. mất chỗ → chỗ gốc nếu còn trống, không thì ghế trống gần hàng trên; hết ghế thì một chỗ cố định trong khối ngồi (không đứng giữa lối) */
function resolveHome(p) {
  if (p.vipRank >= 0) { const c = CUSHIONS[p.vipRank]; p.homeX = c.x; p.homeZ = c.z; return; }
  if (p.seat && p.seat.p === p) { p.homeX = p.seat.x; p.homeZ = p.seat.z; return; }
  p.seat = null;
  const seat = p.origSeat && !p.origSeat.p ? p.origSeat : pickSeat(true);
  if (seat) return takeSeat(p, seat);
  if (!p.spare) {
    const d = rand(SEAT_DMIN + 0.2, CROWD_D - 0.1), side = Math.random() < 0.5 ? -1 : 1;
    p.spare = { x: side * rand(AISLE + 0.05, Math.max(AISLE + 0.06, xLim(d) - 0.1)), z: -d };
  }
  p.homeX = p.spare.x; p.homeZ = p.spare.z;
}

/* ---------- Thêm / bớt người ---------- */
function syncCounts() { for (const im of ALL_IMS) im.count = people.length * im.userData.per; }
function addPerson(p) {
  p.i = people.length;
  people.push(p);
  p.applyColor();
  syncCounts();
  return p;
}
// đầy chỗ: mời một NPC ra (ưu tiên NPC không tên, rồi NPC có tên ngoài top 10);
// không còn NPC thì người chơi lâu không tương tác (trừ top 10)
function makeRoom() {
  if (people.length < maxPeople) return true;
  let victim = null;
  for (const p of people) if (!p.user && !p.removed) { victim = p; break; }
  if (!victim) for (const p of people) if (isNpc(p) && p.vipRank < 0 && !p.removed) { victim = p; break; }
  if (!victim) for (const p of people) if (p.vipRank < 0 && (!victim || p.lastActive < victim.lastActive)) victim = p;
  if (victim) remove(victim);
  return people.length < maxPeople;
}
function remove(p) {
  if (p.removed) return;
  p.removed = true;
  releaseSpot(p);
  leaveSeat(p);
  if (p.vipRank >= 0 && vipAt[p.vipRank] === p) vipAt[p.vipRank] = null;
  const last = people.pop();
  if (last !== p) { people[p.i] = last; last.i = p.i; last.applyColor(); last.dirty = true; }
  syncCounts();
  if (onRemove) onRemove(p);
}

T.crowd = {
  consts: { IMG_ASPECT, STAGE_ASPECT, VIEW_H, CROP_TOP, HORIZON, FOCAL, CAM_H, D_MIN, D_MAX, CROWD_D, BURNER, PRAY_D, PRAY_X, CUSHIONS, PRAY_SPOTS, xLim, inUpper },
  scene, camera, fromScreen, toScreen, DEFAULT_LAYOUT,
  get people() { return people; },
  get size() { return S; },

  // opts.layout: { cushions: [[x%, y%] ×10], burner: [x%, y%] } – vị trí đệm + lư hương (bỏ trống = mặc định)
  init(canvas, opts = {}) {
    maxPeople = Math.min(MAX, opts.maxPeople || 500);
    onRemove = opts.onRemove || null;
    applyLayout(opts.layout);
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setClearColor(0x000000, 0);
    buildSeats(maxPeople);
  },
  resize(W, H, dpr) { renderer.setPixelRatio(dpr); renderer.setSize(W, H, false); },

  spawnNPC(count) {
    for (let k = 0; k < count && people.length < maxPeople; k++) {
      const seat = pickSeat(false);
      if (!seat) break;
      const p = new Person({ x: seat.x, z: seat.z });
      takeSeat(p, seat);
      addPerson(p);
    }
  },
  /* đặt số nhân vật ảo: thiếu thì thêm, thừa thì bớt (không đụng tới người xem thật; bớt NPC không tên trước) */
  setNpcCount(n) {
    const npcs = people.filter(isNpc).sort((a, b) => !!b.user - !!a.user);
    if (npcs.length < n) this.spawnNPC(n - npcs.length);
    else for (const p of npcs.slice(n)) remove(p);
  },
  // người xem mới: đi vào từ phía dưới màn hình theo lối giữa, rẽ vào hàng của mình rồi quỳ xuống
  spawnPlayer(user) {
    if (!makeRoom()) return null;
    const p = new Person({ user, x: rand(-0.03, 0.03), z: -ENTRY_D, standing: true });
    takeSeat(p, pickSeat(true));
    addPerson(p);
    p.cmdGoHome();
    return p;
  },
  /* lên đệm số `rank` (0..9): bỏ chỗ cũ, đi lên đệm, quỳ; main.js chỉ gọi với đệm đang trống */
  seatVip(p, rank) {
    if (p.vipRank === rank) return;
    if (p.vipRank >= 0 && vipAt[p.vipRank] === p) vipAt[p.vipRank] = null;
    leaveSeat(p);
    p.vipRank = rank;
    vipAt[rank] = p;
    const c = CUSHIONS[rank];
    p.homeX = c.x; p.homeZ = c.z;
    p.cmdGoHome();
  },
  /* rớt khỏi top 10: xuống ngồi lại với đám đông */
  demote(p) {
    if (p.vipRank < 0) return;
    if (vipAt[p.vipRank] === p) vipAt[p.vipRank] = null;
    p.vipRank = -1; p.topRank = -1;
    resolveHome(p);   // về chỗ ngồi gốc nếu còn trống, không thì ghế trống khác
    p.cmdGoHome();
  },
  remove,

  update(dt) {
    let any = false;
    for (let k = 0; k < people.length; k++) {
      const p = people[k];
      p.update(dt);
      if (p.removed) { k--; continue; }     // người cuối đã được đổi vào vị trí k
      if (p.dirty) { p.write(); any = true; }
    }
    if (any) for (const im of ALL_IMS) im.instanceMatrix.needsUpdate = true;
    if (colorDirty) { for (const im of ROBE_IMS) im.instanceColor.needsUpdate = true; colorDirty = false; }
  },
  render() { renderer.render(scene, camera); },

  // toạ độ màn hình (px CSS) của một điểm 3D
  projectPoint(x, y, z, W, H, out) {
    _v.set(x, y, z).project(camera);
    out.x = (_v.x * 0.5 + 0.5) * W;
    out.y = (-_v.y * 0.5 + 0.5) * H;
    return out;
  },
  // toạ độ màn hình (px CSS) của điểm trên đầu nhân vật
  project(p, W, H, out) {
    _v.set(p.x, p.headY, p.z).project(camera);
    out.x = (_v.x * 0.5 + 0.5) * W;
    out.y = (-_v.y * 0.5 + 0.5) * H;
    return out;
  },
};
})();
