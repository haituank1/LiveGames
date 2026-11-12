/* Rắn Săn Mồi — điều phối game 3D (nv1, RAN3D-SHELL).
   TikTok LIVE -> LiveBridge (port 8787) -> WebSocket -> game này.
   Spec logic 2D: ~/workspace/multi-session/RAN-SAN-MOI-SPEC.md (§1 luật,
   §4 Snake, §5 Board/quà, §6 FX, §7 config, §8 demo) + 3 lưu ý tích hợp
   của BOSS (2026-11-11 16:42, đã ghi vào spec §4).
   Spec 3D: ~/workspace/multi-session/RAN-SAN-MOI-3D.md (§0 nguyên tắc,
   §1 khung Three.js, §5 khung + main.js). CHỈ thay phần VẼ — logic game
   giữ nguyên 100% như bản 2D đã kiểm chứng (nhánh ran-san-moi @ c07d40e).
   KHÔNG dùng CDN — Three.js r128 tự host (js/three.min.js).

   HỢP ĐỒNG GIAO TIẾP 3D (spec 3D §1–§4):
   - main.js tạo DUY NHẤT 1 lần: renderer (WebGLRenderer, antialias,
     pixelRatio tối đa 2), scene, camera (Perspective, góc 3/4 từ trên
     xuống ~55 độ, bàn nằm mặt XZ, Y là cao), đèn (Ambient + Directional
     castShadow, shadow map 1024), nền trong suốt (gradient nâu của #stage
     hiện qua). Giữ object dùng chung window.Ran3D = { THREE, scene,
     camera, renderer }; truyền scene cho Snake/Board/Effects qua setScene
     (nếu có) + render(scene, ...) mỗi frame. Các module KHÔNG tự tạo
     renderer/camera/đèn — chỉ thêm/bớt mesh của mình vào scene chung.
   - Tọa độ: ô (x, y) trên bàn 2D -> vị trí 3D
     (gridX + (x+0.5)*cell, 0, gridY + (y+0.5)*cell) — dùng đúng board.cell /
     board.gridX / board.gridY như bản 2D (đã có alias offsetX/Y).
   - Vòng lặp: main gọi snake.render / board.render / effects.render (chúng
     CHỈ cập nhật vị trí mesh, KHÔNG vẽ) rồi renderer.render(scene, camera)
     mỗi frame. KHÔNG còn ctx 2D.
   - Module 3D NÊN có dispose() để gỡ mesh của mình khỏi scene khi main
     dựng lại bàn/rắn (đổi kichThuocBan) — main gọi dispose() nếu có
     (guard typeof); không có thì mesh cũ còn sót trong scene.
   - Snake (nv2): new Snake({ board, config, isBlocked(x,y), getFood(),
     onEat, onDie }); snake.reset(); snake.tick() -> {type:'eat',apple} |
     {type:'die',cause} | {type:'move'} | null (đã chết); snake.grow(n);
     snake.render(scene, alpha); snake.segments/direction/alive/length.
     tick() VỪA trả event VỪA gọi onEat/onDie (theo §4) — main.js CHỈ dùng
     event tick() (onEat/onDie truyền no-op) để tránh cộng điểm/grow 2 lần.
     tick() KHÔNG tự grow — main.js gọi snake.grow(1) khi nhận event eat.
     Snake KHÔNG tự gỡ táo khỏi bàn — main.js gọi board.removeFood().
   - Board (nv3): new Board(config) — config plain, Board chỉ lấy các key
     nó cần (kichThuocBan/soTaoToiDa/soBomToiDa/thoiGianBom/thoiGianRoi/
     choRoi/soTaoToiDaTrenBan); hình học board.cell/gridX/gridY/gridSize/
     frame (mặc định lưới 640px, khung 20px, grid (20,180) trên stage
     720×1280); board.setRect(x,y,cell); board.reset(isBlocked) (dọn
     táo/bom, thả 1 táo); board.spawnFood(count, isBlocked, nowMs) /
     board.spawnBomb(count, head, isBlocked, nowMs) — count mặc định 1,
     nowMs (ms) để board tính t0 bắt đầu rơi cho từng trái (đính chính BOSS
     2026-11-11 17:03, spec §5); rơi nối tiếp cách nhau choRoi ms, chỉ thả
     tới trần 30 trên bàn (soTaoToiDaTrenBan / soBomToiDa), TRẢ số trái
     thực tế đã thả;
     board.update(nowMs) — tiến độ rơi + dọn bom hết hạn, TRẢ object
     { expiredBombs: [...], landed: [...] } (landed = táo/bom VỪA chạm đất
     {type:'apple'|'bomb', x, y}); board.removeFood/removeBomb(x,y);
     board.isBomb/isFood/isFree(x,y); board.inBounds(x,y);
     board.cellCenter(x,y); board.render(scene, nowMs) (3D: chỉ cập nhật vị
     trí mesh — bàn nằm mặt XZ, Y là cao; vẽ cả đồ ĐANG RƠI + bóng đổ thật).
     CHỈ táo/bom ĐÃ CHẠM ĐẤT mới nằm trong foods/bombs — đồ đang rơi nằm
     trong mảng riêng board.falling {type, x, y, t0}, KHÔNG tính vào
     isFood/isBomb/isFree (rắn/AI không thấy chúng).
     isBlocked(x,y) = "ô rắn đang chiếm" — main.js PHẢI truyền khi thả
     (Board chỉ biết tường/táo/bom); main.js PHẢI gọi update() mỗi frame
     nếu không bom hết hạn không tự biến mất.
   - Effects (nv4): window.effects.init({cellSize, cols, rows, originX,
     originY, applePoints}) — PHẢI gọi sau khi biết layout bàn (và gọi lại
     khi đổi bàn/điểm); effects.eat(x,y,points)/explode(x,y)/die()/spawn(x,y)
     /land(x,y,type) (tọa độ Ô LƯỚI; type 'apple'|'bomb'); effects.update(dt)
     với dt tính bằng GIÂY (clamp 0..0.05); effects.render(scene).
     main.js gọi land() cho mỗi item trong landed sau mỗi board.update()
     (Board tự vẽ đồ rơi + bóng; main KHÔNG gọi effects.spawn cho quà nữa
     vì không biết vị trí từng trái trong cơn mưa — land khi chạm đất mới
     là FX của quà). Bom hết hạn cũng bắn land() 'bomb' (poof nhỏ, RAN-QA
     gộp 2026-11-11).
   QUYẾT ĐỊNH NỐI TIẾP (để nv2/nv3/nv4/nv6 khỏi đoán):
   - NỐI HÌNH HỌC (lưu ý BOSS #2): Snake._geometry đọc b.cell + b.offsetX/
     b.offsetY (không đọc b.gridX/b.gridY). Board expose gridX/gridY —
     main.js gán alias board.offsetX = board.gridX, board.offsetY =
     board.gridY ngay sau khi tạo Board để rắn vẽ đúng vị trí bàn.
     (Lâu dài: nv2 sửa _geometry đọc gridX/gridY, hoặc nv3 thêm alias
     offsetX/offsetY trong Board — main.js nối tạm bằng alias để game chạy
     đúng ngay, không đợi sửa 2 file kia.)
   - Snake/Board SNAPSHOT config lúc new (copy, không giữ reference) — nên
     main.js KHÔNG trông chờ "giữ nguyên object cfg" nữa: sau mỗi applyConfig,
     main đẩy key đổi được vào object public snake.config/board.config
     (màu thân/đầu, doDaiBanDau, thoiGianBom, soBomToiDa, soTaoToiDa) để
     admin đổi ăn ngay; chỉ đổi kichThuocBan mới rebuild board + snake.
     Tốc độ (tocDo) main đọc trực tiếp từ cfg mỗi frame nên ăn ngay.
   - Điểm: táo +diemTao, tim +1/tim, quà ĐIỂM = SỐ XU của quà (vd hồng 1 xu
     → +1, hộp quà 100 xu → +100; lấy xu kèm event, fallback bảng quaTang),
     vào cả Điểm game lẫn Top tặng quà của người tặng. Quà lạ (không có
     trong bảng): +điểm = số xu (nếu event kèm xu), không rớt đồ.
   - Số lượng theo xu (§1/§7 mới, user bổ sung 2026-11-11 16:53): 1 event quà
     rớt NHIỀU táo/bom theo bảng bậc tangQuaTheoXu (xu ≤9 → 1, ≤29 → 3,
     ≤99 → 5, ≤299 → 10, ≤999 → 20, còn lại → 30; tối đa 30/lần; không kèm
     xu → 1 trái). Hiệu ứng theo bảng quaTang (hoa/táo/donut/gà → táo;
     hộp quà → bom). Board tự thả rơi nối tiếp (cách nhau choRoi ms) +
     chặn ở trần 30 trên bàn.
   - RƠI (§1 mới): táo/bom KHÔNG hiện ngay — RƠI từ trên cao (~0.6s,
     thoiGianRoi), có bóng + nảy + bụi khi chạm đất. CHỈ KHI CHẠM ĐẤT MỚI
     TÍNH: táo đang rơi rắn chưa ăn được, bom đang rơi chưa gây chết, đồ
     đang rơi không chặn đường rắn. main gọi effects.land(x,y,type) cho mỗi
     item trong landed mà board.update() trả về.
   - Ăn táo: main xử lý event 'eat' (cộng điểm, board.removeFood, gọi
     snake.grow(1), thả táo mới cho đủ soTaoToiDa táo tự nhiên — đếm cả táo
     đang rơi, để không thả thừa khi táo còn trên đường rơi).
   - Chết: điểm về 0, giữ Kỷ lục, rắn reset sau thoiGianHoiSinh; bom trên bàn
     GIỮ NGUYÊN (tự hết hạn theo thoiGianBom).
   - Quà combo (count > 1): điểm = xu × count, số trái tính theo xu ĐƠN
     của 1 quà (không nhân theo count), thả 1 lần/event.
   - Effects/Snake/Board chưa có (trước khi gộp): main dùng noop/FX rỗng và
     báo trạng thái, trang vẫn load, HUD vẫn hiện, 0 console error.
*/
(function () {
'use strict';
const $ = id => document.getElementById(id);
const q = new URLSearchParams(location.search);
const isDemo = q.has('demo') && q.get('demo') !== '0';
const canvas = $('board');
function esc(s) { return String(s || '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch])); }
function setText(id, s) { const e = $(id); if (e) e.textContent = s; }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

/* ---------- Khung Three.js (RAN3D-SHELL, spec 3D §1) ----------
   Renderer/scene/camera/đèn do main.js tạo DUY NHẤT 1 lần; Snake/Board/
   Effects KHÔNG tự tạo renderer/camera/đèn — chỉ thêm/bớt mesh của mình
   vào scene chung. Bàn nằm mặt XZ (x = cột, z = hàng), Y là chiều cao.
   Tọa độ 3D dùng đúng số 2D: ô (x,y) -> (gridX + (x+0.5)*cell, 0,
   gridY + (y+0.5)*cell). */
let renderer = null, scene = null, camera = null;
let camBase = null; // vị trí gốc của camera — rung chỉ lệch tạm quanh đây, không dồn
function initThree() {
  if (typeof window.THREE === 'undefined') {
    setText('liveStatus', 'Không thấy three.min.js — kiểm tra js/three.min.js');
    return false;
  }
  const T = window.THREE;
  renderer = new T.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(720, 1280, false); // canvas đã 720×1280, false = không đổi style
  renderer.setClearColor(0x000000, 0); // trong suốt — nền gradient nâu của #stage hiện qua
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFSoftShadowMap;
  scene = new T.Scene();
  // Camera: góc 3/4 từ trên xuống (~52 độ), nhìn vào tâm bàn (340, 0, 500).
  // Canvas dọc 720×1280 (aspect 0.5625) nên fov phải đủ rộng (60) để ôm hết
  // chiều ngang bàn (640 + khung). lookAt z=620 (sau tâm bàn 1 chút) để bàn
  // hiện cao hơn giữa khung — khớp vị trí bàn bản 2D (tâm y ~500/1280) và
  // mép dưới bàn không bị thanh quà (y 844) che.
  // BIÊN (lưu ý nv3/BOSS 2026-11-11 19:12): táo/bom rơi từ cao 6 ô (board 3D
  // nv3: FALL_CELLS = 6) nên ở cột biên lúc cao nhất bị phóng đại ra ngoài
  // thêm ~40px — camera kéo xa thêm 3% so với bản đầu để chừa biên ~44px
  // quanh bàn (đo bằng phép chiếu, xem ran-test/ran-measure-cam.py).
  camera = new T.PerspectiveCamera(60, 720 / 1280, 1, 4000);
  camera.position.set(340, 1082, 1475);
  camBase = { x: 340, y: 1082, z: 1475 };
  camera.lookAt(340, 0, 620);
  // Đèn: Ambient sáng nền + Directional chính (castShadow, shadow map 1024).
  // Độ sáng theo ảnh test nv3 (BOSS 2026-11-11 19:12): Ambient 0.75 +
  // Directional 1.0 từ TRƯỚC-PHẢI-TRÊN thì caro đọc rõ; đèn yếu hơn sẽ tối.
  scene.add(new T.AmbientLight(0xffffff, 0.75));
  const sun = new T.DirectionalLight(0xfff2d9, 1.0);
  sun.position.set(340 + 400, 950, 500 + 550);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -500; sun.shadow.camera.right = 500;
  sun.shadow.camera.top = 500; sun.shadow.camera.bottom = -500;
  sun.shadow.camera.near = 1; sun.shadow.camera.far = 3000;
  sun.target.position.set(340, 0, 500);
  scene.add(sun);
  scene.add(sun.target);
  window.Ran3D = { THREE: T, scene: scene, camera: camera, renderer: renderer };
  return true;
}
/* Đưa scene chung cho các module 3D (chúng chỉ thêm/bớt mesh của mình vào
   scene này; guard typeof để chạy được cả khi module chưa có setScene). */
function passScene() {
  if (!scene) return;
  if (board && typeof board.setScene === 'function') { try { board.setScene(scene); } catch (e) { console.error('[ran-san-moi] board.setScene lỗi:', e); } }
  if (snake && typeof snake.setScene === 'function') { try { snake.setScene(scene); } catch (e) { console.error('[ran-san-moi] snake.setScene lỗi:', e); } }
  if (typeof FX.setScene === 'function') { try { FX.setScene(scene); } catch (e) { console.error('[ran-san-moi] effects.setScene lỗi:', e); } }
}

/* ---------- Cấu hình mặc định (spec §7) ---------- */
const DEFAULT_CFG = {
  tenGame: 'Rắn Săn Mồi',
  kichThuocBan: 20, // ô (16–24)
  tocDo: 150, // ms/tick (80–300)
  doDaiBanDau: 5,
  diemTao: 10,
  thoiGianBom: 30, // giây, 0 = không hết hạn
  soBomToiDa: 30, // tối đa bom trên bàn (đổi từ 5 → 30 theo spec §7 mới)
  soTaoToiDa: 1, // táo thường duy trì (táo tự nhiên sau khi ăn)
  soTaoToiDaTrenBan: 30, // tối đa táo trên bàn (kể cả táo quà)
  thoiGianHoiSinh: 3, // giây
  mauThanRan: '#FF9F1C', // cam (gradient tới vàng, nv2 vẽ)
  mauDauRan: '#4CAF50', // xanh lá
  // Bảng bậc số lượng theo xu (spec §1/§7 mới): [xu tối đa, số trái] — xu ≤9 → 1,
  // ≤29 → 3, ≤99 → 5, ≤299 → 10, ≤999 → 20, còn lại → 30 (tối đa 30/lần).
  tangQuaTheoXu: '[[9,1],[29,3],[99,5],[299,10],[999,20],[999999,30]]',
  thoiGianRoi: 600, // ms, thời gian 1 trái rơi từ trên cao xuống đất
  choRoi: 80, // ms, khoảng cách giữa 2 trái rơi nối tiếp trong cùng 1 quà
  // Tự rơi khi không ai tặng quà (spec §7 mới, user 2026-11-11 22:36):
  // tuRoiTaoGiay 20 (0–60, 0 = tắt), tuRoiBomGiay 30 (0–120, 0 = tắt).
  tuRoiTaoGiay: 20, // giây KHÔNG CÓ QUÀ thì tự rơi 1 táo
  tuRoiBomGiay: 30, // giây KHÔNG CÓ QUÀ thì tự rơi 1 bom
  // Tim -> táo (user 2026-11-12): đủ timMoiTao tim ĐƯỢC TÍNH thì rơi 1 táo;
  // mỗi người chỉ được tính tim 1 lần mỗi timDelayGiay giây (chống spam bấm).
  timMoiTao: 100, // số tim được tính để rơi 1 táo (0 = tắt)
  timDelayGiay: 5, // giây delay tính tim theo từng người (0 = không delay)
  voiceOn: true, // bật/tắt voice MC (NpcVoice)
  voiceGiong: 'HoaiMy', // 'HoaiMy' nữ / 'NamMinh' nam (map sang vi-VN-*Neural)
  // Bảng quà mặc định (spec §5): key = TÊN QUÀ THẬT trên TikTok (đối chiếu
  // catalog LiveBridge — "Rose"/"Doughnut" đã xác nhận có trong mapping các
  // game khác; "GG"/"Apple"/"Chicken"/"Gift Box" theo ảnh tham chiếu, nếu
  // live thật thấy tên khác thì sửa key cho khớp). diem = số xu mặc định của
  // quà (dùng làm điểm khi event không kèm xu), hieuUng: "tao" = rớt táo,
  // "bom" = thả bom. SỐ TRÁI không nằm trong bảng này — tính theo bậc xu.
  quaTang: '{"Rose":{"diem":1,"hieuUng":"tao"},"GG":{"diem":5,"hieuUng":"tao"},"Apple":{"diem":25,"hieuUng":"tao"},"Doughnut":{"diem":30,"hieuUng":"tao"},"Chicken":{"diem":60,"hieuUng":"tao"},"Gift Box":{"diem":100,"hieuUng":"bom"},"Perfume":{"diem":20,"hieuUng":"bom"},"Fire":{"diem":100,"hieuUng":"bom"},"Rocket":{"diem":1000,"hieuUng":"bom"}}',
};
let cfg = Object.assign({}, DEFAULT_CFG);

/* Nhãn + icon hiển thị cho bảng quà (key chuẩn hóa lowercase). */
const GIFT_LABELS = { rose: 'Hoa hồng', gg: 'GG', apple: 'Táo', doughnut: 'Bánh donut', chicken: 'Gà', 'gift box': 'Hộp quà', perfume: 'Nước hoa', fire: 'Lửa', rocket: 'Tên lửa' };
const GIFT_ICONS = { rose: '🌹', gg: '🎮', apple: '🍎', doughnut: '🍩', chicken: '🍗', 'gift box': '🎁', perfume: '💐', fire: '🔥', rocket: '🚀' };

/* ---------- Bảng quà ---------- */
let giftTable = {};
function parseGiftTable(v) {
  let o = v;
  if (typeof v === 'string') { try { o = JSON.parse(v); } catch (_) { return null; } }
  if (!o || typeof o !== 'object' || Array.isArray(o)) return null;
  const out = {};
  for (const k of Object.keys(o)) {
    const name = String(k).trim().slice(0, 40);
    const val = o[k];
    if (!name || !val || typeof val !== 'object') continue;
    const diem = Math.max(0, Math.min(10000, Math.round(Number(val.diem) || 0)));
    const hieuUng = val.hieuUng === 'bom' ? 'bom' : 'tao';
    out[name] = { diem, hieuUng };
  }
  return Object.keys(out).length ? out : null;
}
/* Tìm quà trong bảng: khớp tên thật (không phân biệt hoa/thường) hoặc nhãn
   tiếng Việt (vd sự kiện giả lập/sim ghi giftName = "Hoa hồng"). */
function lookupGift(rawName) {
  const norm = String(rawName || '').trim().toLowerCase();
  if (!norm) return null;
  for (const k of Object.keys(giftTable)) {
    if (k.toLowerCase() === norm) return { key: k, diem: giftTable[k].diem, hieuUng: giftTable[k].hieuUng };
  }
  for (const k of Object.keys(giftTable)) {
    if ((GIFT_LABELS[k.toLowerCase()] || '').toLowerCase() === norm) return { key: k, diem: giftTable[k].diem, hieuUng: giftTable[k].hieuUng };
  }
  return null;
}
/* ---------- Bảng bậc số lượng theo xu (tangQuaTheoXu) ---------- */
let giftTiers = [];
function parseGiftTiers(v) {
  let o = v;
  if (typeof v === 'string') { try { o = JSON.parse(v); } catch (_) { return null; } }
  if (!Array.isArray(o) || !o.length) return null;
  const out = [];
  for (const p of o) {
    if (!Array.isArray(p) || p.length < 2) continue;
    const maxXu = Math.max(1, Math.floor(Number(p[0]) || 0));
    const count = Math.max(1, Math.min(30, Math.floor(Number(p[1]) || 0)));
    if (!maxXu || !count) continue;
    out.push([maxXu, count]);
  }
  if (!out.length) return null;
  out.sort((a, b) => a[0] - b[0]);
  return out;
}
/* Số trái rớt theo xu: bậc đầu tiên có maxXu >= xu; xu lớn hơn mọi bậc → bậc
   cuối (30). Không có xu (event không kèm) → 1 trái. */
function giftCountFor(xu) {
  const x = Math.floor(Number(xu) || 0);
  if (x <= 0 || !giftTiers.length) return 1;
  for (const t of giftTiers) { if (x <= t[0]) return t[1]; }
  return giftTiers[giftTiers.length - 1][1];
}
function giftDisplayName(rawName, entry) {
  if (entry) return GIFT_LABELS[entry.key.toLowerCase()] || entry.key;
  return String(rawName || 'quà');
}
function giftIcon(entry) {
  if (!entry) return '🎁';
  return GIFT_ICONS[entry.key.toLowerCase()] || '🎁';
}

/* ---------- Effects (noop nếu effects.js chưa gộp) ---------- */
const noopFX = { init: function () {}, eat: function () {}, explode: function () {}, die: function () {}, spawn: function () {}, land: function () {}, update: function () {}, render: function () {} };
const FX = (typeof window.effects === 'object' && window.effects) ? window.effects : noopFX;
/* Đẩy hình học bàn thật vào Effects (effects.init bắt buộc — mặc định của
   nó là cell 34px + origin (0,0), sai với bàn thật cell 32px + grid (20,180)). */
function initEffects() {
  if (!board || typeof FX.init !== 'function') return;
  FX.init({
    cellSize: board.cell, cols: board.n, rows: board.n,
    originX: board.gridX, originY: board.gridY,
    applePoints: cfg.diemTao,
  });
  passScene(); // đưa scene chung cho Effects (cùng lúc với Board/Snake)
}

/* ---------- State ---------- */
let board = null, snake = null;
let score = 0, record = 0, likes = 0;
let likePool = 0; // tim đã tính, chờ đủ timMoiTao thì rơi 1 táo
const lastLikeAtByUser = new Map(); // id người -> mốc tim được tính gần nhất
let status = 'idle'; // idle | running | dead
let started = false;
/* Tự rơi + voice MC (spec §7 mới, user 2026-11-11 22:36). */
let lastGiftAt = Date.now(); // quà gần nhất (thật + demo giả) — đếm tự rơi
let lastAppleAt = Date.now(); // mốc đếm RIÊNG của táo tự rơi
let lastBombAt = Date.now(); // mốc đếm RIÊNG của bom tự rơi
let lastInteractAt = Date.now(); // tương tác THẬT gần nhất (quà/tim thật) — đếm mồi voice
let lastLureAt = 0; // lần mồi voice gần nhất
let nextScoreMilestone = 500; // mốc điểm tiếp theo (mỗi 500)
let nextLengthMilestone = 20; // mốc độ dài tiếp theo (mỗi 20 đốt)
let autoTaoCount = 0, autoBomCount = 0; // đếm táo/bom tự rơi (debug/kiểm chứng)
let topGifters = new Map(); // userId -> { name, points }
let lastFrame = 0, acc = 0;
let demoGiftTimer = 0, demoLikeTimer = 0, demoGiftTurn = 0;

/* ---------- HUD ---------- */
function updateHUD() {
  setText('scoreVal', String(score));
  setText('lenVal', String(snake ? snake.length : cfg.doDaiBanDau));
  setText('recordVal', String(record));
  setText('likeVal', String(likes));
}
function setStatus(s) { setText('statusLine', s); }
function setFeed(s) { setText('feedLine', s); }
function renderGiftBar() {
  const bar = $('giftBar');
  if (!bar) return;
  bar.textContent = '';
  const keys = Object.keys(giftTable);
  if (!keys.length) {
    const d = document.createElement('div');
    d.className = 'top-empty';
    d.textContent = 'Chưa có bảng quà — kiểm tra config quaTang.';
    bar.appendChild(d);
    return;
  }
  for (const k of keys) {
    const e = giftTable[k];
    const card = document.createElement('div');
    card.className = 'gift-card';
    const ic = document.createElement('div');
    ic.className = 'ic';
    ic.textContent = giftIcon({ key: k });
    const nm = document.createElement('div');
    nm.className = 'nm';
    nm.textContent = GIFT_LABELS[k.toLowerCase()] || k;
    const pt = document.createElement('div');
    pt.className = 'pt';
    pt.textContent = '+' + e.diem + ' điểm';
    const fx = document.createElement('div');
    fx.className = 'fx';
    const n = giftCountFor(e.diem); // số trái theo bậc xu (vd hộp quà 100 xu → 10)
    fx.textContent = e.hieuUng === 'bom' ? '💣 +' + n + ' bom' : '🍎 +' + n + ' táo';
    card.append(ic, nm, pt, fx);
    bar.appendChild(card);
  }
}
function renderTop() {
  const list = $('topList');
  if (!list) return;
  list.textContent = '';
  const top = Array.from(topGifters.values()).sort((a, b) => b.points - a.points).slice(0, 3);
  if (!top.length) {
    const d = document.createElement('div');
    d.className = 'top-empty';
    d.textContent = 'Chưa có ai tặng quà — tặng quà để lên bảng!';
    list.appendChild(d);
    return;
  }
  const medals = ['🥇', '🥈', '🥉'];
  top.forEach((g, i) => {
    const row = document.createElement('div');
    row.className = 'top-row';
    const rank = document.createElement('span');
    rank.className = 'rank';
    rank.textContent = medals[i];
    const nm = document.createElement('span');
    nm.className = 'nm';
    nm.textContent = g.name;
    const pt = document.createElement('span');
    pt.className = 'pt';
    pt.textContent = g.points + ' điểm';
    row.append(rank, nm, pt);
    list.appendChild(row);
  });
}
function addGifter(user, pts) {
  const id = user.id || user.username || user.nickname || 'anon';
  const cur = topGifters.get(id) || { name: user.nickname || user.username || 'Bạn', points: 0 };
  cur.points += pts;
  if (user.nickname) cur.name = user.nickname;
  topGifters.set(id, cur);
  renderTop();
}

/* ---------- Tạo game (Board trước, Snake sau — xem hợp đồng ở đầu file) ---------- */
function isSnakeCell(x, y) {
  if (!snake || !snake.segments) return false;
  return snake.segments.some(s => s.x === x && s.y === y);
}
function getHeadCell() {
  return (snake && snake.segments && snake.segments[0]) ? snake.segments[0] : null;
}
function isBlockedCell(x, y) {
  if (board && board.inBounds) { if (!board.inBounds(x, y)) return true; } // tường (theo kích thước bàn thật)
  else { const size = cfg.kichThuocBan; if (x < 0 || y < 0 || x >= size || y >= size) return true; }
  if (isSnakeCell(x, y)) return true; // thân rắn (AI tự trừ đuôi theo spec §4)
  if (board && board.isBomb && board.isBomb(x, y)) return true; // bom
  return false;
}
/* ---------- Thả táo/bom (adapter theo spec §5 mới) ----------
   Board mới: spawnFood(count, isBlocked, nowMs) / spawnBomb(count, head,
   isBlocked, nowMs) — count trái, nowMs để board tính t0 bắt đầu rơi cho
   từng trái (đính chính BOSS 2026-11-11 17:03, spec §5); rơi nối tiếp,
   chặn ở trần 30, TRẢ số trái thực tế đã thả.
   Board cũ (nv3 @ fa31f3f, chưa cập nhật): spawnFood(isBlocked) /
   spawnBomb(head, isBlocked) — 1 trái/lần, không rơi, trần táo 3/bom 5.
   Adapter tự chọn API theo board.falling có tồn tại hay không; khi nv3 cập
   nhật thì tự chuyển sang API mới. Xóa adapter khi nv6 gộp xong. */
function boardHasFalling() { return !!(board && Array.isArray(board.falling)); }
function spawnApples(count) {
  if (!board) return 0;
  const n = Math.max(0, Math.floor(count) || 0);
  if (!n) return 0;
  try {
    // Board mới: spawnFood(count, isBlocked, nowMs) — nowMs (thời gian hiện
    // tại, ms) để board tính t0 bắt đầu rơi cho từng trái (đính chính BOSS
    // 2026-11-11 17:03, spec §5). 1 mốc thời gian cho cả cơn mưa.
    if (boardHasFalling()) return Math.max(0, Math.floor(board.spawnFood(n, isSnakeCell, Date.now())) || 0);
    let done = 0;
    for (let i = 0; i < n; i++) { if (board.spawnFood(isSnakeCell)) done++; else break; }
    return done;
  } catch (e) { console.error('[ran-san-moi] spawnFood lỗi:', e); return 0; }
}
function spawnBombs(count) {
  if (!board) return 0;
  const n = Math.max(0, Math.floor(count) || 0);
  if (!n) return 0;
  try {
    if (boardHasFalling()) return Math.max(0, Math.floor(board.spawnBomb(n, getHeadCell(), isSnakeCell, Date.now())) || 0);
    let done = 0;
    for (let i = 0; i < n; i++) { if (board.spawnBomb(getHeadCell(), isSnakeCell, Date.now())) done++; else break; }
    return done;
  } catch (e) { console.error('[ran-san-moi] spawnBomb lỗi:', e); return 0; }
}
/* Số táo hiện có — ĐÃ chạm đất + ĐANG RƠI (dùng để duy trì táo tự nhiên mà
   không thả thừa khi táo còn trên đường rơi). */
function countApples() {
  if (!board) return 0;
  let n = board.foods ? board.foods.length : 0;
  if (Array.isArray(board.falling)) n += board.falling.filter(f => f.type === 'apple').length;
  return n;
}
/* board.update() mỗi frame + bắn FX chạm đất (board mới trả object
   {expiredBombs, landed}; board cũ trả mảng bom hết hạn — không có landed
   nên không bắn land; effects cũ chưa có land() thì guard, không crash). */
function boardUpdate() {
  if (!board) return;
  let r = null;
  try { r = board.update(); } catch (e) { console.error('[ran-san-moi] board.update lỗi:', e); return; }
  if (r && !Array.isArray(r) && Array.isArray(r.landed) && typeof FX.land === 'function') {
    for (const it of r.landed) {
      try { FX.land(it.x, it.y, it.type); } catch (e) { console.error('[ran-san-moi] effects.land lỗi:', e); }
    }
  }
  // RAN-QA gộp (BOSS 2026-11-11): bom hết hạn trước đây biến mất lặng —
  // bắn land() 'bomb' (vòng + bụi, đọc như 1 cái poof nhỏ) cho từng bom vừa
  // hết hạn, ngay cạnh đoạn land cho `landed` ở trên. Không thêm hàm poof mới.
  if (r && !Array.isArray(r) && Array.isArray(r.expiredBombs) && typeof FX.land === 'function') {
    for (const b of r.expiredBombs) {
      try { FX.land(b.x, b.y, 'bomb'); } catch (e) { console.error('[ran-san-moi] effects.land (bom het han) lỗi:', e); }
    }
  }
}
function createGame() {
  // Dọn mesh của bàn/rắn cũ khỏi scene trước khi dựng lại (3D: mesh thêm vào
  // scene không tự biến mất khi bỏ reference như canvas 2D — module 3D nên
  // có dispose(); main gọi nếu có, không có thì mesh cũ còn sót trong scene).
  if (board && typeof board.dispose === 'function') { try { board.dispose(); } catch (e) { console.error('[ran-san-moi] board.dispose lỗi:', e); } }
  if (snake && typeof snake.dispose === 'function') { try { snake.dispose(); } catch (e) { console.error('[ran-san-moi] snake.dispose lỗi:', e); } }
  board = null;
  snake = null;
  if (typeof window.Board !== 'function' || typeof window.Snake !== 'function') {
    setStatus('⏳ Đang chờ file snake.js / board.js 3D (nv2/nv3 chưa xong) — HUD vẫn chạy.');
    return false;
  }
  board = new Board(cfg); // Board(config) — Board chỉ lấy các key nó cần
  // NỐI HÌNH HỌC (lưu ý BOSS #2): Board expose cell/gridX/gridY; Snake._geometry
  // đọc b.cell + b.offsetX/b.offsetY — gán alias để rắn vẽ đúng vị trí bàn.
  board.offsetX = board.gridX;
  board.offsetY = board.gridY;
  snake = new Snake({
    board: board, config: cfg, isBlocked: isBlockedCell,
    getFood: function () { return board ? board.foods : []; },
    onEat: function () {}, // noop có chủ ý — chỉ dùng event 'eat' từ tick() (tránh cộng 2 lần)
    onDie: function () {}, // noop có chủ ý — chỉ dùng event 'die' từ tick()
  });
  passScene(); // đưa scene chung cho Board/Snake ngay sau khi tạo
  board.reset(isSnakeCell); // dọn táo/bom, thả 1 táo (không trùng rắn)
  // Thả thêm cho đủ soTaoToiDa táo tự nhiên lúc đầu — tính cả táo đang rơi
  // (foods chỉ đếm táo đã chạm đất; dùng while theo foods.length sẽ thả thừa).
  const target = Math.max(1, Math.floor(Number(cfg.soTaoToiDa) || 3));
  const need = target - countApples();
  if (need > 0) spawnApples(need);
  initEffects(); // đẩy hình học bàn thật vào Effects
  return true;
}

/* ---------- Vòng lặp game ---------- */
function tickMs() {
  const t = Number(cfg.tocDo);
  return Number.isFinite(t) ? Math.max(50, Math.min(1000, t)) : 150;
}
function tick() {
  if (!snake || !snake.alive) return;
  let ev = null;
  try { ev = snake.tick(); } catch (e) { console.error('[ran-san-moi] snake.tick lỗi:', e); return; }
  if (!ev) return;
  if (ev.type === 'eat') {
    score += cfg.diemTao;
    if (score > record) record = score;
    if (board && ev.apple) { try { board.removeFood(ev.apple.x, ev.apple.y); } catch (e) { console.error('[ran-san-moi] removeFood lỗi:', e); } } // Snake không tự gỡ táo khỏi bàn
    try { snake.grow(1); } catch (e) { console.error('[ran-san-moi] snake.grow lỗi:', e); }
    const a = ev.apple || (snake.segments && snake.segments[0]);
    if (a) FX.eat(a.x, a.y, cfg.diemTao); // truyền điểm để chữ bay "+N" đúng diemTao
    checkScoreMilestone(); // mốc điểm mỗi 500 (ăn táo cũng lên điểm)
    checkLengthMilestone(); // mốc dài mỗi 20 đốt (vừa grow xong)
    // Thả táo tự nhiên cho đủ soTaoToiDa (táo rơi từ trên cao; đếm cả táo đang
    // rơi để không thả thừa; nếu bàn đã nhiều táo quà thì không thả thêm).
    if (board && countApples() < Math.max(1, Math.floor(Number(cfg.soTaoToiDa) || 3))) spawnApples(1);
    updateHUD();
  } else if (ev.type === 'die') {
    onDie(ev.cause);
  }
}
function onDie(cause) {
  status = 'dead';
  const head = snake && snake.segments && snake.segments[0];
  if (head) FX.explode(head.x, head.y);
  FX.die();
  speakVoice('Ôi không, rắn thua rồi! Chơi lại nào!', 'event');
  const why = cause === 'bomb' ? ' (đụng bom)' : cause === 'wall' ? ' (đụng tường)' : cause === 'self' ? ' (cắn thân mình)' : '';
  setStatus('💥 Rắn đã thua' + why + '! Hồi sinh sau ' + cfg.thoiGianHoiSinh + 's…');
  updateHUD();
  setTimeout(function () {
    if (!snake) return;
    snake.reset();
    score = 0; // điểm về 0, giữ Kỷ lục
    nextScoreMilestone = 500; // mốc điểm/dài về lại từ đầu (như điểm + độ dài)
    nextLengthMilestone = 20;
    status = 'running';
    setStatus('▶ Đang chạy — tặng quà để can thiệp vào game!');
    updateHUD();
  }, Math.max(1, Number(cfg.thoiGianHoiSinh) || 3) * 1000);
}
function render(dtMs) {
  const alpha = (started && status === 'running') ? Math.min(1, acc / tickMs()) : 0;
  if (board) {
    try {
      boardUpdate(); // PHẢI gọi mỗi frame (lưu ý BOSS #3): tiến độ rơi + dọn bom hết hạn + bắn FX land khi chạm đất
      board.render(scene, Date.now()); // 3D: chỉ cập nhật vị trí mesh (không vẽ); Date.now() khớp đồng hồ rơi (t0 từ Date.now())
    } catch (e) { console.error('[ran-san-moi] board.render lỗi:', e); }
  }
  if (snake) { try { snake.render(scene, alpha); } catch (e) { console.error('[ran-san-moi] snake.render lỗi:', e); } } // 3D: chỉ cập nhật vị trí mesh
  try { FX.update(dtMs / 1000); } catch (e) { console.error('[ran-san-moi] effects.update lỗi:', e); } // dt tính bằng GIÂY (effects.js clamp 0..0.05)
  try { FX.render(scene); } catch (e) { console.error('[ran-san-moi] effects.render lỗi:', e); } // 3D: chỉ cập nhật vị trí hạt
  // RAN3D-QA gộp (BOSS 2026-11-11): rung camera theo effects.getShakeOffset()
  // (nv4 tính rung nhưng main chưa hề đọc — nổ không rung). Áp lệch tạm quanh
  // camBase mỗi khung rồi trả về gốc ở khung sau (offset về 0 khi hết rung).
  if (camera && camBase) {
    try {
      const sh = (FX && typeof FX.getShakeOffset === 'function') ? FX.getShakeOffset() : null;
      if (sh) camera.position.set(camBase.x + (sh.x || 0), camBase.y + (sh.y || 0), camBase.z);
    } catch (e) { /* rung lỗi thì giữ camera gốc */ }
  }
  // Vẽ 1 khung hình 3D (renderer chung — các module chỉ cập nhật mesh).
  if (renderer && scene && camera) {
    try { renderer.render(scene, camera); } catch (e) { console.error('[ran-san-moi] renderer.render lỗi:', e); }
  }
}
function frame(now) {
  requestAnimationFrame(frame);
  if (!lastFrame) lastFrame = now;
  const dt = Math.min(100, now - lastFrame);
  lastFrame = now;
  if (started && status === 'running') {
    acc += dt;
    let guard = 0;
    while (acc >= tickMs() && guard++ < 8) {
      acc -= tickMs();
      tick();
      if (status !== 'running') { acc = 0; break; }
    }
    if (guard >= 8) acc = 0; // tab ẩn lâu: bỏ tick dồn để rắn không chạy gấp
  }
  checkAutoDrop(Date.now()); // tự rơi táo/bom khi lâu không có quà (§7 mới)
  checkLure(Date.now()); // mồi voice khi yên ắng 25s không tương tác thật
  render(dt);
}

/* ---------- Voice MC + tự rơi (spec §7 mới, user 2026-11-11 22:36) ---------- */
/* Đọc số ra chữ cho voice MC ("năm trăm", "một nghìn năm trăm", "hai mươi mốt")
   — TTS đọc chữ hay hơn đọc dãy số. Chỉ dùng cho mốc điểm/dài (< 1 triệu). */
const NUM_WORDS = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];
function readTens(t, u, hasHigher) {
  if (t === 0) return u === 0 ? '' : (hasHigher ? 'lẻ ' + NUM_WORDS[u] : NUM_WORDS[u]);
  if (t === 1) return 'mười' + (u === 0 ? '' : u === 5 ? ' lăm' : ' ' + NUM_WORDS[u]);
  return NUM_WORDS[t] + ' mươi' + (u === 0 ? '' : u === 1 ? ' mốt' : u === 5 ? ' lăm' : ' ' + NUM_WORDS[u]);
}
function read3(n, hasHigher) {
  const h = Math.floor(n / 100), t = Math.floor(n % 100 / 10), u = n % 10;
  const head = h > 0 ? NUM_WORDS[h] + ' trăm' : '';
  const tail = readTens(t, u, hasHigher || h > 0);
  return (head && tail ? head + ' ' + tail : head || tail);
}
function numToWords(n) {
  n = Math.floor(Number(n) || 0);
  if (n < 0) return 'âm ' + numToWords(-n);
  if (n === 0) return 'không';
  if (n >= 1000000) return String(n); // quá lớn: đọc số (không chế chữ sai)
  const nghin = Math.floor(n / 1000), rest = n % 1000;
  const parts = [];
  if (nghin > 0) parts.push(read3(nghin, false) + ' nghìn');
  if (rest > 0 || parts.length === 0) parts.push(read3(rest, parts.length > 0));
  return parts.join(' ').trim();
}

/* Voice MC dùng NpcVoice của LiveBridge (npc-voice.js) — server tổng hợp bằng
   node-edge-tts + cache đĩa, giọng vi-VN-HoaiMyNeural / vi-VN-NamMinhNeural.
   KHÔNG tự tạo engine TTS, KHÔNG dùng GV01/GV02 cho game live. Guard typeof
   để không có LiveBridge thì game vẫn chạy, chỉ không có tiếng. kind 'event'
   (cảm ơn quà, chết, mốc — ưu tiên, gap 2s) / 'random' (mồi — gap 8s, tối đa
   6/phút). NpcVoice tự nối tiếp (không chồng tiếng); main không gọi speak
   dồn dập — mốc điểm/dài chỉ nói mốc cao nhất đã vượt (1 câu/lần tăng điểm). */
const LURE_LINES = [
  'Tặng quà để thả táo hoặc bom nào, rắn đang đói!',
  'Ai tặng hoa hồng là rắn có táo ăn liền!',
  'Tặng hộp quà đi, bom rơi vui lắm!',
  'Rắn đang chờ quà của bạn đó!',
];
let lureIdx = 0;
function voiceName() {
  return cfg.voiceGiong === 'NamMinh' ? 'vi-VN-NamMinhNeural' : 'vi-VN-HoaiMyNeural';
}
function speakVoice(text, kind) {
  if (!cfg.voiceOn || !text) return;
  if (typeof window.NpcVoice === 'undefined' || typeof NpcVoice.speak !== 'function') return;
  try {
    const r = NpcVoice.speak(text, { kind: kind || 'event', voice: voiceName() });
    if (r && typeof r.catch === 'function') r.catch(function () {}); // speak async — lỗi thì câm, không crash game
  } catch (e) { /* NpcVoice lỗi thì game vẫn chạy */ }
}
function applyVoiceConfig() {
  if (typeof window.NpcVoice === 'undefined' || typeof NpcVoice.setConfig !== 'function') return;
  try {
    NpcVoice.setConfig({ npcVoiceOn: cfg.voiceOn !== false, npcVoice: voiceName() });
  } catch (e) { /* không set được thì NpcVoice giữ mặc định (tắt) */ }
}
/* Mốc điểm mỗi 500 / mốc dài mỗi 20 đốt — chỉ nói mốc CAO NHẤT đã vượt
   (1 câu/lần tăng điểm, tránh 1 quà lớn (+5000) làm MC nói 10 câu liền). */
function checkScoreMilestone() {
  const crossed = Math.floor(score / 500) * 500;
  if (crossed > 0 && crossed >= nextScoreMilestone) {
    speakVoice('Tuyệt vời, đã ' + numToWords(crossed) + ' điểm rồi!', 'event');
    nextScoreMilestone = crossed + 500;
  }
}
function checkLengthMilestone() {
  if (!snake) return;
  const crossed = Math.floor(snake.length / 20) * 20;
  if (crossed > 0 && crossed >= nextLengthMilestone) {
    speakVoice('Rắn dài ' + numToWords(crossed) + ' đốt rồi, giỏi quá!', 'event');
    nextLengthMilestone = crossed + 20;
  }
}
/* Tự rơi khi không ai tặng quà (spec §7 mới): đếm từ lúc nhận quà gần nhất
   (lastGiftAt — quà thật + quà giả demo đều tính, nên demo có quà giả 8s thì
   tự rơi ít khi kích hoạt — đó là đúng); táo và bom đếm RIÊNG (lastAppleAt /
   lastBombAt độc lập); quà tới đặt lại cả 2 đếm; rơi xong cũng đặt lại đếm
   của món đó. Rơi qua board như quà (rơi từ trên cao, chạm đất mới tính,
   trần 30 board tự chặn). KHÔNG cộng điểm, KHÔNG tính vào Top tặng quà.
   0 = tắt món đó. */
function checkAutoDrop(now) {
  if (!started || !board) return;
  const taoGiay = Math.max(0, Number(cfg.tuRoiTaoGiay) || 0);
  const bomGiay = Math.max(0, Number(cfg.tuRoiBomGiay) || 0);
  if (taoGiay > 0 && now - lastAppleAt >= taoGiay * 1000) {
    spawnApples(1);
    autoTaoCount++;
    lastAppleAt = now; // đặt lại đếm táo (dù board đầy không rớt được — thử lại sau 1 chu kỳ)
  }
  if (bomGiay > 0 && now - lastBombAt >= bomGiay * 1000) {
    const dropped = spawnBombs(1);
    autoBomCount++;
    lastBombAt = now;
    if (dropped >= 1) speakVoice('Cẩn thận, bom rơi kìa!', 'event'); // chỉ nói khi bom rơi thật (board đầy thì không nói)
  }
}
/* Mồi voice khi yên ắng (giống game QH): 25s không tương tác THẬT (quà/tim
   thật — quà giả demo KHÔNG tính, để mồi vẫn nói được trong demo) thì MC nói
   1 câu mồi, luân phiên, tối đa 1 câu/25s. */
const LURE_QUIET_MS = 25000;
function checkLure(now) {
  if (!started || !cfg.voiceOn) return;
  if (now - lastInteractAt < LURE_QUIET_MS) return;
  if (now - lastLureAt < LURE_QUIET_MS) return;
  lastLureAt = now;
  speakVoice(LURE_LINES[lureIdx++ % LURE_LINES.length], 'random');
}

/* ---------- Sự kiện LiveBridge ---------- */
function normUser(u) {
  u = u || {};
  return { id: String(u.id || u.username || ''), username: String(u.username || ''), nickname: String(u.nickname || u.username || 'Bạn'), avatar: u.avatar || '' };
}
/* isSim: quà giả demo — vẫn rớt táo/bom + đặt lại đếm tự rơi, nhưng KHÔNG
   tính là tương tác thật (để mồi voice vẫn nói được trong demo). */
function onGiftEvent(ev, isSim) {
  const e = normUser(ev.user);
  const src = ev.source || {};
  const rawName = String(src.giftName || ev.label || 'quà');
  const count = Math.max(1, Math.floor(ev.count || 1));
  const entry = lookupGift(rawName);
  // Quà tới (thật hay giả) đặt lại cả 2 đếm tự rơi (táo/bom đếm riêng nhưng
  // cùng mốc từ quà gần nhất); tương tác thật mới đặt lại đếm mồi voice.
  lastGiftAt = Date.now();
  lastAppleAt = Date.now();
  lastBombAt = Date.now();
  if (!isSim) lastInteractAt = Date.now();
  // Điểm quà = SỐ XU của quà (§5 mới): ưu tiên xu kèm event, fallback diem
  // trong bảng quaTang (cũng là số xu mặc định của quà đó).
  // SỐ TRÁI chỉ tính theo xu KÈM EVENT — event không kèm xu thì 1 trái
  // (spec §5), dù bảng có diem mặc định (diem chỉ để tính điểm fallback).
  let xuEvent = 0;
  if (typeof src.diamonds === 'number' && src.diamonds > 0) xuEvent = Math.floor(src.diamonds);
  else if (typeof ev.diamonds === 'number' && ev.diamonds > 0) xuEvent = Math.floor(ev.diamonds);
  const xu = xuEvent > 0 ? xuEvent : (entry ? entry.diem : 0);
  let pts = 0;
  if (entry) {
    pts = xu * count; // điểm = xu × số quà combo
    // Số trái theo bậc xu kèm event (không kèm xu → 1 trái); Board tự thả
    // rơi nối tiếp + chặn ở trần 30. Board tự vẽ rơi + bóng — main KHÔNG gọi
    // effects.spawn nữa, chỉ gọi effects.land khi chạm đất (trong boardUpdate()).
    const n = xuEvent > 0 ? giftCountFor(xuEvent) : 1;
    if (entry.hieuUng === 'bom') spawnBombs(n);
    else spawnApples(n);
  } else {
    // Quà lạ: +điểm = số xu (nếu event kèm xu), không rớt đồ — ghi log để
    // user bổ sung vào bảng quaTang.
    pts = xu > 0 ? xu * count : 0;
    console.log('[ran-san-moi] quà chưa có trong bảng quaTang (chỉ +điểm, không rớt đồ):', rawName);
  }
  if (pts > 0) {
    score += pts;
    if (score > record) record = score;
    addGifter(e, pts);
    checkScoreMilestone(); // quà cũng lên điểm — mốc 500/1000...
  }
  speakVoice('Cảm ơn ' + e.nickname + ' tặng ' + giftDisplayName(rawName, entry) + '!', 'event'); // quan trọng nhất — kéo quà
  setFeed('🎁 ' + e.nickname + ' tặng ' + giftDisplayName(rawName, entry) + (count > 1 ? ' ×' + count : '') + (pts > 0 ? ' +' + pts + ' điểm' : ''));
  updateHUD();
}
function onLikeEvent(m, isSim) {
  const n = Math.max(0, Math.floor(m.likeCount || m.count || 1));
  if (!n) return;
  if (!isSim) lastInteractAt = Date.now(); // tim thật = tương tác thật (đếm mồi voice) — kể cả tim bị delay chặn, người vẫn đang xem
  // Delay theo người (user 2026-11-12): mỗi người chỉ được TÍNH tim 1 lần
  // mỗi timDelayGiay giây — bấm dồn trong lúc countdown thì bỏ qua (không
  // điểm, không vào hũ tim). Không rõ id (khách lạ) thì tính luôn.
  const e = normUser(m.user);
  const delayMs = Math.max(0, Number(cfg.timDelayGiay) || 0) * 1000;
  if (delayMs > 0 && e.id) {
    const now = Date.now();
    if (now - (lastLikeAtByUser.get(e.id) || 0) < delayMs) return;
    lastLikeAtByUser.set(e.id, now);
    if (lastLikeAtByUser.size > 500) { // dọn người cũ, tránh phình bộ nhớ
      for (const [k, t] of lastLikeAtByUser) if (now - t > 3600000) lastLikeAtByUser.delete(k);
    }
  }
  likes += n;
  score += n; // tim +1 điểm mỗi tim (§1)
  if (score > record) record = score;
  checkScoreMilestone(); // tim cũng lên điểm
  // Hũ tim: đủ timMoiTao tim được tính -> rơi 1 táo (qua board, rơi từ cao)
  const need = Math.max(0, Math.floor(Number(cfg.timMoiTao) || 0));
  if (need > 0) {
    likePool += n;
    while (likePool >= need) {
      likePool -= need;
      if (spawnApples(1) >= 1) setFeed('❤️ Đủ ' + need + ' tim — rơi 1 táo!');
    }
  }
  updateHUD();
}
function handle(ev) {
  if (!ev || !ev.action) return;
  const src = ev.source || {};
  if (src.kind === 'gift' || ev.action === 'gift') { onGiftEvent(ev); return; }
  switch (ev.action) {
    case 'like': onLikeEvent({ user: ev.user, likeCount: (ev.value || 1) * (ev.count || 1) }); break;
    default: break; // join/follow/share/chat: không ảnh hưởng game (§1)
  }
}

/* ---------- Cấu hình + LiveBridge ---------- */
let cfgApplied = false;
function applyConfig(c) {
  if (!c) return;
  const oldSize = cfg.kichThuocBan;
  Object.assign(cfg, DEFAULT_CFG, c); // giữ nguyên object cfg (main đọc trực tiếp mỗi frame: tocDo, diemTao...)
  cfgApplied = true;
  giftTable = parseGiftTable(cfg.quaTang) || {};
  giftTiers = parseGiftTiers(cfg.tangQuaTheoXu) || parseGiftTiers(DEFAULT_CFG.tangQuaTheoXu) || [];
  renderGiftBar();
  // Snake/Board SNAPSHOT config lúc new (copy) — đẩy key đổi được vào object
  // public của chúng để admin đổi ăn ngay (không cần rebuild):
  if (snake) {
    snake.config.mauThanRan = cfg.mauThanRan;
    snake.config.mauDauRan = cfg.mauDauRan;
    snake.config.doDaiBanDau = cfg.doDaiBanDau; // áp từ lần hồi sinh sau
  }
  if (board) {
    board.config.thoiGianBom = Math.max(0, Number(cfg.thoiGianBom) || 0);
    board.config.soBomToiDa = Math.max(0, Math.round(Number(cfg.soBomToiDa) || 0));
    board.config.soTaoToiDa = Math.max(1, Math.round(Number(cfg.soTaoToiDa) || 1));
    board.config.soTaoToiDaTrenBan = Math.max(1, Math.round(Number(cfg.soTaoToiDaTrenBan) || 30));
    board.config.thoiGianRoi = Math.max(0, Number(cfg.thoiGianRoi) || 0);
    board.config.choRoi = Math.max(0, Number(cfg.choRoi) || 0);
  }
  if (board && typeof FX.init === 'function') FX.init({ applePoints: cfg.diemTao }); // chữ "+N" bay đúng điểm mới (giữ nguyên hình học)
  applyVoiceConfig(); // đẩy voiceOn/voiceGiong vào NpcVoice (giọng MC)
  if (!board || cfg.kichThuocBan !== oldSize) createGame(); // đổi kích thước bàn → dựng lại bàn + rắn
  updateHUD();
}
function connect() {
  if (typeof LiveBridgeClient === 'undefined') {
    applyConfig(DEFAULT_CFG);
    setText('liveStatus', 'Không thấy livebridge-client.js — chạy demo nội bộ');
    return;
  }
  /* Lấy host/port hiện tại (như QH): mở game qua LiveBridge cổng nào thì WS
     nối cổng đó; mở bằng file:// thì mặc định localhost:8787. */
  const wsHost = location.host || 'localhost:8787';
  const bridge = new LiveBridgeClient({ url: 'ws://' + wsHost, game: 'ran-san-moi' });
  if (typeof window.NpcVoice !== 'undefined' && NpcVoice.attach) {
    try { NpcVoice.attach(bridge); } catch (e) {} // báo ưu tiên voice qua LiveBridge (như QH/đám cưới)
  }
  bridge.on('event', handle);
  bridge.on('hello', function (h) {
    if (h && h.config) applyConfig(h.config); else applyConfig(DEFAULT_CFG);
    setText('liveStatus', 'Đã nối LiveBridge');
  });
  bridge.on('config', function (m) { applyConfig(m); });
  bridge.on('status', function (m) {
    if (m && m.tiktok) setText('liveStatus', 'TikTok: ' + m.tiktok.state + (m.tiktok.username ? ' • @' + m.tiktok.username : ''));
  });
  bridge.connect();
  /* Sau 8s chưa thấy config thật thì giữ DEFAULT_CFG (đã áp lúc khởi động). */
  setTimeout(function () { if (!cfgApplied) applyConfig(DEFAULT_CFG); }, 8000);
}

/* ---------- Demo (?demo=1) ---------- */
const DEMO_USERS = [
  { username: 'demo0', nickname: 'Lan Anh' }, { username: 'demo1', nickname: 'Minh Tuấn' },
  { username: 'demo2', nickname: 'Thu Hà' }, { username: 'demo3', nickname: 'Quốc Bảo' },
  { username: 'demo4', nickname: 'Ngọc Mai' }, { username: 'demo5', nickname: 'Hoàng Long' },
];
function demoGift() {
  const u = pick(DEMO_USERS);
  const keys = Object.keys(giftTable);
  if (!keys.length) return;
  /* Xoay: chẵn → quà rớt táo, lẻ → quà thả bom (để demo thấy cả 2 hiệu ứng). */
  const want = (demoGiftTurn++ % 2 === 0) ? 'tao' : 'bom';
  let pool = keys.filter(k => giftTable[k].hieuUng === want);
  if (!pool.length) pool = keys;
  const key = pick(pool);
  onGiftEvent({
    user: { id: u.username, username: u.username, nickname: u.nickname, avatar: '' },
    diamonds: giftTable[key].diem, count: 1, label: giftDisplayName(key, { key: key }),
    source: { kind: 'gift', giftName: key, diamonds: giftTable[key].diem },
  }, true); // quà giả: rớt đồ + đặt lại đếm tự rơi, KHÔNG tính tương tác thật (mồi voice)
}
function demoLike() {
  onLikeEvent({ user: { id: 'demo-like', username: 'demo-like', nickname: '' }, likeCount: 10 }, true);
}
function startGame() {
  if (started) return;
  started = true;
  lastGiftAt = lastAppleAt = lastBombAt = lastInteractAt = Date.now(); // đếm tự rơi + mồi từ lúc bắt đầu chơi
  lastLureAt = 0;
  const btn = $('btnStart');
  if (btn) btn.style.display = 'none'; // ẩn nút khỏi bàn sau khi bắt đầu (không che rắn)
  status = 'running';
  setStatus('▶ Đang chạy — tặng quà để can thiệp vào game!');
  if (isDemo) {
    demoGiftTimer = setInterval(demoGift, 8000); // 8s giả 1 quà ngẫu nhiên (§8)
    demoLikeTimer = setInterval(demoLike, 5000); // 5s giả 10 tim (§8)
  }
  updateHUD();
}

/* ---------- Khởi động ---------- */
initThree(); // khung Three.js TRƯỚC khi tạo game (createGame truyền scene cho các module)
applyConfig(DEFAULT_CFG); // đã tạo game lần 1 (board null -> createGame)
connect();
if (!board) createGame(); // chỉ tạo khi applyConfig chưa tạo (vd Snake/Board chưa có) —
// TRÁNH tạo game 2 lần như bản 2D: 3D dựng lại sẽ thêm mesh mới vào scene mà
// mesh cũ chưa gỡ (chỉ gỡ được qua dispose() của module).
updateHUD();
renderGiftBar();
renderTop();
const startBtn = $('btnStart');
if (startBtn) startBtn.addEventListener('click', startGame);
requestAnimationFrame(frame);

/* Tay cầm debug/kiểm chứng (nv6 dùng để test không cần live thật). */
window.RanSanMoi = {
  applyConfig: applyConfig,
  onGiftEvent: onGiftEvent,
  onLikeEvent: onLikeEvent,
  demoGift: demoGift,
  demoLike: demoLike,
  startGame: startGame,
  getBoard: function () { return board; },
  getSnake: function () { return snake; },
  getThree: function () { return window.Ran3D || null; },
  numToWords: numToWords,
  /* Mồi voice: gọi trực tiếp để test (khi đã ép lastInteractAt về quá khứ).
     _setLastInteractAt/_setLastGiftAt: hook test — ép mốc thời gian để kiểm
     chứng mồi/tự rơi mà không cần chờ 25s/12s thật. */
  lureTick: function (nowMs) { checkLure(nowMs || Date.now()); },
  _setLastInteractAt: function (ms) { lastInteractAt = ms; },
  _setLastGiftAt: function (ms) { lastGiftAt = ms; lastAppleAt = ms; lastBombAt = ms; },
  getState: function () {
    return {
      score: score, record: record, likes: likes, status: status, started: started,
      length: snake ? snake.length : 0, alive: snake ? snake.alive : false,
      foods: board ? board.foods.length : 0, bombs: board ? board.bombs.length : 0,
      falling: board && Array.isArray(board.falling) ? board.falling.length : 0,
      autoTao: autoTaoCount, autoBom: autoBomCount, likePool: likePool,
      voice: { on: !!cfg.voiceOn, giong: cfg.voiceGiong, lastGiftAt: lastGiftAt, lastInteractAt: lastInteractAt, nextScoreMilestone: nextScoreMilestone, nextLengthMilestone: nextLengthMilestone },
      three: !!(renderer && scene && camera),
      board: board ? { n: board.n, cell: board.cell, gridX: board.gridX, gridY: board.gridY, offsetX: board.offsetX, offsetY: board.offsetY } : null,
      giftTable: giftTable, giftTiers: giftTiers, cfg: cfg,
    };
  },
};
})();
