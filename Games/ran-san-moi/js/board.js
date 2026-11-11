/* Board — bàn chơi game Rắn Săn Mồi (RAN3D-BOARD, nv3).
   Hợp đồng: RAN-SAN-MOI-3D.md §3 (bàn 3D) + RAN-SAN-MOI-SPEC.md §5 (Board + quà).
   main.js (nv1) gọi đúng các hàm dưới đây; KHÔNG đổi tên/signature của
   state/spawn/update. CHỈ PHẦN VẼ đổi từ canvas 2D sang Three.js 3D.

   Cách dùng (main.js — khung Three.js do nv1 tạo, §1):
     const board = new Board(config);              // config: xem DEFAULT_CONFIG
     board.setScene(scene);                        // gắn scene chung (hoặc board.init(scene) — alias)
     board.setRect(x, y, cell);                    // dời/đổi cỡ bàn sau khi xếp HUD (không bắt buộc)
     board.reset(isBlocked);                       // ván mới: dọn táo/bom/rơi, thả 1 táo
     board.spawnFood(1, isBlocked);                // ăn xong thả táo mới (CŨNG rơi)
     board.spawnFood(n, isBlocked);                // quà rớt n táo (n theo bậc xu, main.js tính)
     board.spawnBomb(n, snake.segments[0], isBlocked); // quà thả n bom
     board.update();                               // mỗi frame/tick: rơi + chạm đất + dọn bom hết hạn
     board.removeFood(x, y);                       // rắn ăn táo xong
     board.render(nowMs);                          // mỗi frame: cập nhật vị trí mesh
         // (cũng nhận render(scene, nowMs) — scene sẽ được gắn nếu chưa có;
         //  main.js vẽ bằng renderer.render(scene, camera) sau đó)
     window.Ran3D = { THREE, scene, camera, renderer }; // main.js giữ object chung (§1);
         // board tự lấy scene từ đó nếu render() gọi mà chưa setScene.
   Board KHÔNG tự tạo renderer/camera/đèn — chỉ thêm/bớt mesh của mình vào scene chung.
   index.html phải nạp js/three.min.js (r128 tự host) TRƯỚC board.js.
   isBlocked(x, y): main.js PHẢI truyền hàm này (trả true nếu ô có thân rắn),
   nếu không táo/bom có thể rớt lên thân rắn — Board chỉ biết tường/táo/bom
   (isFree theo đúng §5: không tường/táo/bom ĐÃ CHẠM ĐẤT, rắn do Snake giữ).
   Khoảng cách bom–đầu rắn ≥ 3 ô tính theo Manhattan (|dx|+|dy|).
   CHỈ KHI CHẠM ĐẤT MỚI TÍNH: táo/bom đang rơi không có trong foods/bombs,
   không tính vào isFood/isBomb/isFree (rắn chưa ăn được / chưa gây chết,
   AI không tính là chướng ngại). Bom hết hạn tính từ lúc THẢ (không phải lúc chạm đất).
   Tọa độ 3D (§1): ô (x, y) → (gridX + (x+0.5)*cell, 0, gridY + (y+0.5)*cell) —
   mặt bàn nằm ngang (mặt XZ), Y là chiều cao, mặt bàn y=0. Xem cellTo3D().
   Vẽ đúng ảnh tham chiếu (live DarkBossTv, user gửi 2026-11-11): bàn caro tối
   2 sắc, khung gỗ nâu + viền vàng, pháo ở giữa cạnh trên + giữa cạnh dưới
   khung (CHỈ trang trí, không bắn).
*/
(function () {
'use strict';

var DEFAULT_CONFIG = {
  kichThuocBan: 20, // ô mỗi chiều, 16–24 (spec §7)
  soTaoToiDa: 3, // táo thường tối đa — main.js tự quyết khi thả táo tự nhiên
  soTaoToiDaTrenBan: 30, // trần táo trên bàn (tính cả đang rơi)
  soBomToiDa: 30, // trần bom trên bàn (tính cả đang rơi)
  thoiGianBom: 30, // giây, 0 = bom không hết hạn
  thoiGianRoi: 600, // ms, thời gian 1 trái rơi từ trên cao xuống đất
  choRoi: 80 // ms, khoảng cách giữa 2 trái rơi nối tiếp trong cùng 1 quà
};

// Màu đúng ảnh tham chiếu (dùng cho cả texture caro lẫn material 3D).
var COLOR = {
  cellA: '#3A3A3A',
  cellB: '#2E2E2E',
  gridLine: 'rgba(0,0,0,0.20)',
  frameWoodA: '#A06A35',
  frameWoodB: '#7A4A21',
  frameEdge: '#5C3413',
  gold: '#E8B93C',
  goldLight: '#FFD76A',
  corner: '#6B3F18',
  cannonMetal: '#2B2B2B',
  cannonMetalLight: '#555555',
  cannonWood: '#5C3413',
  appleRedA: '#FF6B5E',
  appleRedB: '#C62828',
  appleLeaf: '#66BB6A',
  appleLeafDark: '#388E3C',
  bombBodyA: '#555555',
  bombBodyB: '#111111',
  fuse: '#8D6E63',
  sparkA: '#FFD54F',
  sparkB: '#FF7043'
};

var GRID_PX = 640; // cạnh lưới mặc định (khung 20px mỗi bên → tổng 680px, vừa khung 720)
var FRAME = 20; // dày khung gỗ (px)
var STAGE_W = 720; // khổ game dọc 720×1280 (spec §2); khác khổ thì main.js truyền rect
var FALL_CELLS = 6; // táo/bom bắt đầu rơi từ cao hơn ô đích 6 ô
var BOUNCE_MS = 200; // thời gian nảy sau khi chạm đất
var BOUNCE_PX = 6; // cao độ nảy tối đa (đơn vị 3D = px bản 2D)
var SLAB_H = 8; // dày mặt bàn (hộp mỏng)
var FRAME_H = 16; // cao thanh khung gỗ (nhô 8 trên mặt bàn)

// THREE nạp qua <script src="js/three.min.js"> (globalThis.THREE); test Node
// gán globalThis.THREE = mock tối giản. Trả null nếu chưa load.
function getTHREE() {
  if (typeof globalThis !== 'undefined' && globalThis.THREE) return globalThis.THREE;
  return null;
}

function num(v, d) {
  return (typeof v === 'number' && Number.isFinite(v)) ? v : d;
}

function Board(config, rect) {
  var cfg = Object.assign({}, DEFAULT_CONFIG, config || {});
  this.n = Math.max(16, Math.min(24, Math.round(num(cfg.kichThuocBan, 20)) || 20));
  this.config = {
    kichThuocBan: this.n,
    soTaoToiDa: Math.max(1, Math.round(num(cfg.soTaoToiDa, 3))),
    soTaoToiDaTrenBan: Math.max(1, Math.round(num(cfg.soTaoToiDaTrenBan, 30))),
    soBomToiDa: Math.max(0, Math.round(num(cfg.soBomToiDa, 30))),
    thoiGianBom: Math.max(0, num(cfg.thoiGianBom, 30)),
    thoiGianRoi: Math.max(1, num(cfg.thoiGianRoi, 600)),
    choRoi: Math.max(0, num(cfg.choRoi, 80))
  };
  // Hình học: rect { x, y, cell } — góc trái-trên LƯỚI + cỡ 1 ô (px).
  this.cell = (rect && num(rect.cell, 0) > 0) ? rect.cell : GRID_PX / this.n;
  this.gridSize = this.cell * this.n;
  this.frame = FRAME;
  this.gridX = (rect && typeof rect.x === 'number') ? rect.x
    : (STAGE_W - (this.gridSize + 2 * this.frame)) / 2;
  this.gridY = (rect && typeof rect.y === 'number') ? rect.y : 180;
  this.foods = []; // táo ĐÃ chạm đất {x, y}
  this.bombs = []; // bom ĐÃ chạm đất {x, y, expiresAt} — expiresAt = 0: không hết hạn
  this.falling = []; // táo/bom ĐANG rơi {type:'apple'|'bomb', x, y, t0} (+expiresAt nếu là bom)
  this._lastLanded = []; // táo/bom vừa chạm đất ở update() gần nhất {type, x, y, at} — để vẽ nảy
  // Trạng thái 3D (chỉ dùng khi đã gắn scene).
  this._scene = null;
  this._assets = null; // geometry/material dùng chung
  this._staticGroup = null; // group bàn + khung + pháo
  this._itemMeshes = new Map(); // key 'apple:x,y' / 'bomb:x,y' → { group, ring, radius }
}

// Dời/đổi cỡ bàn (main.js xếp HUD xong thì gọi; không bắt buộc).
// Lưu ý: nếu đã gắn scene thì gọi setRect TRƯỚC setScene (hình học tĩnh dựng 1 lần).
Board.prototype.setRect = function (x, y, cell) {
  if (typeof x === 'number') this.gridX = x;
  if (typeof y === 'number') this.gridY = y;
  if (typeof cell === 'number' && cell > 0) {
    this.cell = cell;
    this.gridSize = cell * this.n;
  }
};

Board.prototype.inBounds = function (x, y) {
  return Number.isInteger(x) && Number.isInteger(y)
    && x >= 0 && y >= 0 && x < this.n && y < this.n;
};

Board.prototype.isFood = function (x, y) {
  return this.foods.some(function (f) { return f.x === x && f.y === y; });
};

Board.prototype.isBomb = function (x, y) {
  return this.bombs.some(function (b) { return b.x === x && b.y === y; });
};

// Ô trống theo §5: trong bàn + không táo/bom ĐÃ CHẠM ĐẤT (rắn do Snake giữ —
// main.js truyền isBlocked khi thả để tránh cả thân rắn). Táo/bom đang rơi
// KHÔNG chặn ô (rắn đi xuyên qua được — chúng chưa tính).
Board.prototype.isFree = function (x, y) {
  return this.inBounds(x, y) && !this.isFood(x, y) && !this.isBomb(x, y);
};

// Tâm (px, 2D) của 1 ô — main.js/effects 2D dùng; 3D dùng cellTo3D().
Board.prototype.cellCenter = function (x, y) {
  return { x: this.gridX + (x + 0.5) * this.cell, y: this.gridY + (y + 0.5) * this.cell };
};

// Tâm 3D của 1 ô (§1): (gridX + (x+0.5)*cell, 0, gridY + (y+0.5)*cell).
// Mặt bàn nằm ngang (XZ), Y là chiều cao, mặt bàn y=0.
Board.prototype.cellTo3D = function (x, y) {
  return { x: this.gridX + (x + 0.5) * this.cell, y: 0, z: this.gridY + (y + 0.5) * this.cell };
};

// Có trái nào đang rơi tới ô này không (để lúc thả không chọn trùng ô đích).
Board.prototype._isFallingTarget = function (x, y) {
  return this.falling.some(function (f) { return f.x === x && f.y === y; });
};

Board.prototype._countFalling = function (type) {
  var c = 0;
  for (var i = 0; i < this.falling.length; i++) {
    if (this.falling[i].type === type) c++;
  }
  return c;
};

// Chọn đều 1 ô trống trong số các ô hợp lệ (liệt kê hết rồi chọn —
// không lặp thử/sai, không bao giờ treo khi bàn gần đầy).
// reserved: các ô đã chọn trong cùng đợt thả (tránh 2 trái rơi về 1 ô).
Board.prototype._randomFreeCell = function (isBlocked, minHeadDist, head, reserved) {
  var out = [];
  for (var y = 0; y < this.n; y++) {
    for (var x = 0; x < this.n; x++) {
      if (!this.isFree(x, y)) continue;
      if (isBlocked && isBlocked(x, y)) continue;
      if (this._isFallingTarget(x, y)) continue;
      if (reserved && reserved.some(function (c) { return c.x === x && c.y === y; })) continue;
      if (head && minHeadDist > 0) {
        if (Math.abs(x - head.x) + Math.abs(y - head.y) < minHeadDist) continue;
      }
      out.push({ x: x, y: y });
    }
  }
  if (!out.length) return null;
  return out[(Math.random() * out.length) | 0];
};

// Thả 1 đợt táo/bom (dùng chung cho spawnFood/spawnBomb).
// type 'apple'|'bomb'; now: mốc thời gian bắt đầu đợt (ms).
// Mỗi trái rơi nối tiếp nhau (trái thứ i bắt đầu lúc now + i*choRoi).
// Chỉ thả tới mức trần trên bàn (tính cả trái đang rơi). Trả số trái thực tế đã thả.
Board.prototype._spawnBurst = function (type, count, isBlocked, minHeadDist, head, now) {
  var cap = (type === 'apple') ? this.config.soTaoToiDaTrenBan : this.config.soBomToiDa;
  var inPlay = (type === 'apple')
    ? this.foods.length + this._countFalling('apple')
    : this.bombs.length + this._countFalling('bomb');
  var room = cap - inPlay;
  var want = Math.max(0, Math.floor(num(count, 1)));
  var n = Math.min(want, room);
  var reserved = [];
  var queued = 0;
  for (var i = 0; i < n; i++) {
    var cell = this._randomFreeCell(isBlocked, minHeadDist, head, reserved);
    if (!cell) break;
    reserved.push(cell);
    var entry = { type: type, x: cell.x, y: cell.y, t0: now + queued * this.config.choRoi };
    if (type === 'bomb') {
      // Hạn bom tính từ lúc THẢ (không phải lúc chạm đất).
      entry.expiresAt = this.config.thoiGianBom > 0 ? now + this.config.thoiGianBom * 1000 : 0;
    }
    this.falling.push(entry);
    if (this._scene) this._attachFallingMesh(entry);
    queued++;
  }
  return queued;
};

// Thả count táo (mặc định 1), mỗi trái rơi nối tiếp nhau; chỉ thả tới trần
// soTaoToiDaTrenBan. Trả số táo thực tế đã thả. nowMs: mốc bắt đầu (mặc định
// Date.now(); chỉ dùng để test cho thời gian xác định).
Board.prototype.spawnFood = function (count, isBlocked, nowMs) {
  var now = (typeof nowMs === 'number') ? nowMs : Date.now();
  return this._spawnBurst('apple', count, isBlocked, 0, null, now);
};

// Đảm bảo luôn ≥ 1 táo trên bàn (tính cả táo đang rơi); trả số táo vừa thả (0/1).
Board.prototype.ensureFood = function (isBlocked, nowMs) {
  var have = this.foods.length + this._countFalling('apple');
  if (have >= 1) return 0;
  return this.spawnFood(1, isBlocked, nowMs);
};

// Thả count bom (mặc định 1), rơi nối tiếp; chỉ thả tới trần soBomToiDa;
// bom cách đầu rắn ≥ 3 ô (Manhattan). head: {x, y} vị trí đầu rắn
// (bỏ qua = không áp luật cách đầu). Trả số bom thực tế đã thả.
Board.prototype.spawnBomb = function (count, head, isBlocked, nowMs) {
  var now = (typeof nowMs === 'number') ? nowMs : Date.now();
  return this._spawnBurst('bomb', count, isBlocked, 3, head || null, now);
};

// Mỗi frame/tick: (a) táo/bom nào rơi xong thì chuyển từ falling sang
// foods/bombs (lúc đó mới tính); (b) dọn bom hết hạn.
// Trả { expiredBombs: [...], landed: [...] } — landed là táo/bom VỪA chạm đất
// ({type:'apple'|'bomb', x, y}) để main.js bắn hiệu ứng chạm đất (effects.land).
// main.js gọi mỗi frame/tick — rơi/chạm đất/hết hạn chỉ tiến triển khi update() chạy.
Board.prototype.update = function (nowMs) {
  var now = (typeof nowMs === 'number') ? nowMs : Date.now();
  var landed = [];
  var still = [];
  for (var i = 0; i < this.falling.length; i++) {
    var f = this.falling[i];
    if (now - f.t0 >= this.config.thoiGianRoi) {
      if (f.type === 'apple') this.foods.push({ x: f.x, y: f.y });
      else this.bombs.push({ x: f.x, y: f.y, expiresAt: f.expiresAt });
      landed.push({ type: f.type, x: f.x, y: f.y });
      if (this._scene) this._detachRing(f);
    } else {
      still.push(f);
    }
  }
  this.falling = still;
  this._lastLanded = landed.map(function (e) {
    return { type: e.type, x: e.x, y: e.y, at: now };
  });
  var gone = [];
  this.bombs = this.bombs.filter(function (b) {
    if (b.expiresAt > 0 && b.expiresAt <= now) { gone.push(b); return false; }
    return true;
  });
  // Bom hết hạn thì gỡ cả mesh (kẻo còn hình trên bàn).
  if (this._scene) {
    for (var j = 0; j < gone.length; j++) this._removeItemMesh('bomb', gone[j].x, gone[j].y);
  }
  return { expiredBombs: gone, landed: landed };
};

// Rắn ăn táo xong: gỡ táo khỏi bàn. Trả true nếu có táo ở ô đó.
Board.prototype.removeFood = function (x, y) {
  var i = this.foods.findIndex(function (f) { return f.x === x && f.y === y; });
  if (i < 0) return false;
  this.foods.splice(i, 1);
  if (this._scene) this._removeItemMesh('apple', x, y);
  return true;
};

// Gỡ 1 quả bom (vd nổ xong). Trả true nếu có bom ở ô đó.
Board.prototype.removeBomb = function (x, y) {
  var i = this.bombs.findIndex(function (b) { return b.x === x && b.y === y; });
  if (i < 0) return false;
  this.bombs.splice(i, 1);
  if (this._scene) this._removeItemMesh('bomb', x, y);
  return true;
};

// Ván mới: dọn táo/bom/rơi, thả lại 1 táo. nowMs: mốc bắt đầu (mặc định
// Date.now(); chỉ dùng để test cho thời gian xác định).
Board.prototype.reset = function (isBlocked, nowMs) {
  this.foods = [];
  this.bombs = [];
  this.falling = [];
  this._lastLanded = [];
  if (this._scene) this._clearItemMeshes();
  this.ensureFood(isBlocked, nowMs);
};

/* ---------------- 3D: gắn scene + tài nguyên dùng chung ---------------- */

// Gắn scene chung do main.js tạo (gọi 1 lần sau khi tạo Board).
// Dựng bàn + khung + pháo tĩnh + mesh cho trạng thái hiện có (nếu spawn trước).
// Ném lỗi rõ ràng nếu THREE chưa load (index.html phải nạp three.min.js trước board.js).
Board.prototype.setScene = function (scene) {
  var THREE = getTHREE();
  if (!THREE) throw new Error('Board.setScene: THREE chưa load — index.html phải nạp js/three.min.js TRƯỚC board.js');
  if (!scene || typeof scene.add !== 'function') throw new Error('Board.setScene: scene không hợp lệ (thiếu add)');
  if (this._scene === scene && this._staticGroup) return; // đã gắn rồi
  if (this._scene && this._staticGroup) this._scene.remove(this._staticGroup);
  this._scene = scene;
  this._ensureSharedAssets(THREE);
  this._buildStaticMeshes(THREE);
  this._rebuildItemMeshes();
};

// Alias — main.js gọi init hay setScene đều được.
Board.prototype.init = Board.prototype.setScene;

// Geometry/material dùng chung (tạo 1 lần khi gắn scene — THREE lúc đó đã load).
Board.prototype._ensureSharedAssets = function (THREE) {
  if (this._assets) return this._assets;
  var cell = this.cell;
  var checker = this._makeCheckerTexture(THREE);
  this._assets = {
    appleGeo: new THREE.SphereGeometry(cell * 0.32, 20, 14),
    bombGeo: new THREE.SphereGeometry(cell * 0.34, 20, 14),
    stemGeo: new THREE.CylinderGeometry(1.2, 1.6, 7, 6),
    leafGeo: new THREE.ConeGeometry(4.5, 2.2, 8),
    fuseGeo: new THREE.CylinderGeometry(1.2, 1.2, 9, 6),
    sparkGeo: new THREE.SphereGeometry(3, 8, 6),
    wheelGeo: new THREE.CylinderGeometry(6, 6, 4, 12),
    appleMat: new THREE.MeshStandardMaterial({ color: 0xE53935, roughness: 0.18, metalness: 0.05 }),
    leafMat: new THREE.MeshStandardMaterial({ color: 0x66BB6A, roughness: 0.5 }),
    stemMat: new THREE.MeshStandardMaterial({ color: 0x6D4C41, roughness: 0.8 }),
    bombMat: new THREE.MeshStandardMaterial({ color: 0x1A1A1A, roughness: 0.15, metalness: 0.25 }),
    fuseMat: new THREE.MeshStandardMaterial({ color: 0x8D6E63, roughness: 0.9 }),
    sparkMat: new THREE.MeshBasicMaterial({ color: 0xFFD54F }),
    woodMat: new THREE.MeshStandardMaterial({ color: 0x8B5A2B, roughness: 0.8 }),
    woodDarkMat: new THREE.MeshStandardMaterial({ color: 0x6B3F18, roughness: 0.85 }),
    goldMat: new THREE.MeshStandardMaterial({ color: 0xE8B93C, roughness: 0.4, metalness: 0.35 }),
    darkMat: new THREE.MeshStandardMaterial({ color: 0x2E2E2E, roughness: 0.9 }),
    tableTopMat: checker
      ? new THREE.MeshStandardMaterial({ map: checker, roughness: 0.85 })
      : new THREE.MeshStandardMaterial({ color: 0x3A3A3A, roughness: 0.85 }),
    cannonMat: new THREE.MeshStandardMaterial({ color: 0x2B2B2B, roughness: 0.4, metalness: 0.5 }),
    cannonLightMat: new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.4, metalness: 0.5 })
  };
  return this._assets;
};

// Vẽ caro 2 sắc + kẻ mờ lên canvas làm texture mặt bàn (khớp bản 2D).
// Không có document (test Node) thì trả null để dùng màu trơn.
Board.prototype._makeCheckerTexture = function (THREE) {
  if (typeof document === 'undefined' || !document.createElement) return null;
  var size = 1024;
  var cv = document.createElement('canvas');
  cv.width = size;
  cv.height = size;
  var g = cv.getContext('2d');
  if (!g) return null;
  var cell = size / this.n;
  for (var y = 0; y < this.n; y++) {
    for (var x = 0; x < this.n; x++) {
      g.fillStyle = ((x + y) % 2 === 0) ? COLOR.cellA : COLOR.cellB;
      g.fillRect(x * cell, y * cell, cell, cell);
    }
  }
  g.strokeStyle = 'rgba(0,0,0,0.20)';
  g.lineWidth = 1;
  g.beginPath();
  for (var i = 0; i <= this.n; i++) {
    g.moveTo(i * cell, 0); g.lineTo(i * cell, size);
    g.moveTo(0, i * cell); g.lineTo(size, i * cell);
  }
  g.stroke();
  var tex = new THREE.CanvasTexture(cv);
  if ('sRGBEncoding' in THREE) tex.encoding = THREE.sRGBEncoding;
  tex.anisotropy = 4;
  return tex;
};

/* ---------------- 3D: bàn + khung + pháo (tĩnh) ---------------- */

Board.prototype._buildStaticMeshes = function (THREE) {
  var A = this._assets;
  var group = new THREE.Group();
  var cx = this.gridX + this.gridSize / 2;
  var cz = this.gridY + this.gridSize / 2;
  var f = this.frame;
  // Mặt bàn: hộp mỏng, mặt trên là caro, các mặt khác tối; mặt trên y=0.
  var slab = new THREE.Mesh(
    new THREE.BoxGeometry(this.gridSize, SLAB_H, this.gridSize),
    [A.darkMat, A.darkMat, A.tableTopMat, A.darkMat, A.darkMat, A.darkMat]
  );
  slab.position.set(cx, -SLAB_H / 2, cz);
  slab.receiveShadow = true;
  group.add(slab);
  // Khung gỗ: 4 thanh hộp, cao hơn mặt bàn 8 (tâm y=0, cao 16).
  function bar(w, d, x, z) {
    var m = new THREE.Mesh(new THREE.BoxGeometry(w, FRAME_H, d), A.woodMat);
    m.position.set(x, 0, z);
    m.castShadow = true;
    m.receiveShadow = true;
    group.add(m);
  }
  bar(this.gridSize + 2 * f, f, cx, this.gridY - f / 2); // trên
  bar(this.gridSize + 2 * f, f, cx, this.gridY + this.gridSize + f / 2); // dưới
  bar(f, this.gridSize, this.gridX - f / 2, cz); // trái
  bar(f, this.gridSize, this.gridX + this.gridSize + f / 2, cz); // phải
  // Viền vàng: 4 thanh mỏng trên mặt khung, sát mép lưới (như bản 2D).
  function trim(w, d, x, z) {
    var m = new THREE.Mesh(new THREE.BoxGeometry(w, 2, d), A.goldMat);
    m.position.set(x, FRAME_H / 2 + 1, z);
    group.add(m);
  }
  trim(this.gridSize, 3, cx, this.gridY - 1.5);
  trim(this.gridSize, 3, cx, this.gridY + this.gridSize + 1.5);
  trim(3, this.gridSize, this.gridX - 1.5, cz);
  trim(3, this.gridSize, this.gridX + this.gridSize + 1.5, cz);
  // 4 ụ góc + đinh vàng (như bản 2D).
  var c = f + 8;
  var corners = [
    [this.gridX - f, this.gridY - f],
    [this.gridX + this.gridSize + f - c, this.gridY - f],
    [this.gridX - f, this.gridY + this.gridSize + f - c],
    [this.gridX + this.gridSize + f - c, this.gridY + this.gridSize + f - c]
  ];
  for (var i = 0; i < corners.length; i++) {
    var block = new THREE.Mesh(new THREE.BoxGeometry(c, FRAME_H + 4, c), A.woodDarkMat);
    block.position.set(corners[i][0] + c / 2, 2, corners[i][1] + c / 2);
    block.castShadow = true;
    group.add(block);
    var stud = new THREE.Mesh(new THREE.SphereGeometry(3.5, 10, 8), A.goldMat);
    stud.position.set(corners[i][0] + c / 2, FRAME_H / 2 + 6, corners[i][1] + c / 2);
    group.add(stud);
  }
  // Pháo trang trí: giữa cạnh trên (nòng chĩa -z) + giữa cạnh dưới (chĩa +z).
  group.add(this._buildCannon(THREE, cx, this.gridY - f / 2, -1));
  group.add(this._buildCannon(THREE, cx, this.gridY + this.gridSize + f / 2, 1));
  this._staticGroup = group;
  this._scene.add(group);
};

// 1 khẩu pháo 3D nhỏ: bệ gỗ + 2 bánh xe + nòng chĩa ra ngoài (dirZ = -1/+1).
// Đặt trên dải khung (tâm y=0 là mặt khung trên cùng ≈ y=8).
Board.prototype._buildCannon = function (THREE, cx, cz, dirZ) {
  var A = this._assets;
  var g = new THREE.Group();
  // Bệ gỗ.
  var carriage = new THREE.Mesh(new THREE.BoxGeometry(34, 12, 14), A.woodDarkMat);
  carriage.position.set(0, 14, 0);
  carriage.castShadow = true;
  g.add(carriage);
  // Bánh xe 2 bên (trục dọc X).
  [-11, 11].forEach(function (dx) {
    var w = new THREE.Mesh(A.wheelGeo, A.cannonMat);
    w.rotation.z = Math.PI / 2;
    w.position.set(dx, 14, 0);
    w.castShadow = true;
    g.add(w);
  });
  // Nòng: hình trụ nằm ngang, chĩa ra ngoài; vành vàng ở đầu nòng.
  var barrel = new THREE.Mesh(new THREE.CylinderGeometry(4, 4.5, 30, 12), A.cannonMat);
  barrel.rotation.x = (dirZ > 0) ? Math.PI / 2 : -Math.PI / 2;
  barrel.position.set(0, 18, dirZ * 12);
  barrel.castShadow = true;
  g.add(barrel);
  var muzzle = new THREE.Mesh(new THREE.CylinderGeometry(5.5, 5.5, 4, 12), A.goldMat);
  muzzle.rotation.x = barrel.rotation.x;
  muzzle.position.set(0, 18, dirZ * 26);
  g.add(muzzle);
  g.position.set(cx, 0, cz);
  return g;
};

/* ---------------- 3D: mesh táo/bom ---------------- */

Board.prototype._itemKey = function (type, x, y) {
  return type + ':' + x + ',' + y;
};

// Tạo (hoặc lấy lại) mesh cho 1 táo/bom; đặt ở vị trí nghỉ trên mặt bàn.
// Trả null nếu chưa có scene.
Board.prototype._ensureItemMesh = function (type, x, y) {
  if (!this._scene) return null;
  var key = this._itemKey(type, x, y);
  var rec = this._itemMeshes.get(key);
  if (rec) return rec;
  var THREE = getTHREE();
  var group = (type === 'apple') ? this._makeAppleMesh(THREE) : this._makeBombMesh(THREE);
  var c = this.cellTo3D(x, y);
  var radius = (type === 'apple') ? this.cell * 0.32 : this.cell * 0.34;
  group.position.set(c.x, radius, c.z);
  this._scene.add(group);
  rec = { group: group, ring: null, radius: radius };
  this._itemMeshes.set(key, rec);
  return rec;
};

// Táo: cầu đỏ bóng + cuống + lá xanh (hình nón dẹt).
Board.prototype._makeAppleMesh = function (THREE) {
  var A = this._assets;
  var g = new THREE.Group();
  var body = new THREE.Mesh(A.appleGeo, A.appleMat);
  body.castShadow = true;
  g.add(body);
  var stem = new THREE.Mesh(A.stemGeo, A.stemMat);
  stem.position.set(0.5, this.cell * 0.32 + 2, 0);
  stem.rotation.z = -0.15;
  g.add(stem);
  var leaf = new THREE.Mesh(A.leafGeo, A.leafMat);
  leaf.scale.set(1, 0.35, 1);
  leaf.position.set(this.cell * 0.14, this.cell * 0.32 + 3, 0);
  leaf.rotation.z = -0.6;
  leaf.castShadow = true;
  g.add(leaf);
  return g;
};

// Bom: cầu đen bóng + ngòi + tia lửa (lưu vào userData để render nhấp nháy).
Board.prototype._makeBombMesh = function (THREE) {
  var A = this._assets;
  var g = new THREE.Group();
  var body = new THREE.Mesh(A.bombGeo, A.bombMat);
  body.castShadow = true;
  g.add(body);
  var fuse = new THREE.Mesh(A.fuseGeo, A.fuseMat);
  fuse.position.set(this.cell * 0.08, this.cell * 0.34 + 3, 0);
  fuse.rotation.z = -0.5;
  g.add(fuse);
  var spark = new THREE.Mesh(A.sparkGeo, A.sparkMat);
  spark.position.set(this.cell * 0.19, this.cell * 0.34 + 7, 0);
  g.add(spark);
  g.userData.spark = spark;
  return g;
};

// Vòng bóng mờ dưới ô đích của trái đang rơi (mesh tròn tối, transparent).
Board.prototype._makeShadowRing = function (THREE) {
  var geo = new THREE.CircleGeometry(1, 24);
  geo.rotateX(-Math.PI / 2); // nằm phẳng trên mặt bàn
  var mat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.08, depthWrite: false });
  var m = new THREE.Mesh(geo, mat);
  m.position.y = 0.15; // trên mặt bàn 1 chút để không z-fighting
  return m;
};

// Gắn mesh + vòng bóng cho 1 trái vừa thả (gọi trong _spawnBurst khi đã có scene).
Board.prototype._attachFallingMesh = function (entry) {
  var rec = this._ensureItemMesh(entry.type, entry.x, entry.y);
  if (!rec) return;
  var ring = this._makeShadowRing(getTHREE());
  var c = this.cellTo3D(entry.x, entry.y);
  ring.position.set(c.x, 0.15, c.z);
  this._scene.add(ring);
  rec.ring = ring;
};

// Trái chạm đất: gỡ vòng bóng (mesh trái giữ lại ở vị trí nghỉ).
Board.prototype._detachRing = function (entry) {
  var rec = this._itemMeshes.get(this._itemKey(entry.type, entry.x, entry.y));
  if (rec && rec.ring) {
    this._scene.remove(rec.ring);
    rec.ring = null;
  }
};

// Gỡ hẳn mesh của 1 táo/bom (ăn xong / nổ xong / hết hạn).
Board.prototype._removeItemMesh = function (type, x, y) {
  var rec = this._itemMeshes.get(this._itemKey(type, x, y));
  if (!rec) return;
  this._scene.remove(rec.group);
  if (rec.ring) this._scene.remove(rec.ring);
  this._itemMeshes.delete(this._itemKey(type, x, y));
};

// Gỡ hết mesh táo/bom (ván mới).
Board.prototype._clearItemMeshes = function () {
  var self = this;
  this._itemMeshes.forEach(function (rec) {
    self._scene.remove(rec.group);
    if (rec.ring) self._scene.remove(rec.ring);
  });
  this._itemMeshes.clear();
};

// Dựng lại mesh cho toàn bộ trạng thái hiện có (gọi trong setScene —
// trường hợp spawn trước khi có scene).
Board.prototype._rebuildItemMeshes = function () {
  for (var i = 0; i < this.foods.length; i++) {
    this._ensureItemMesh('apple', this.foods[i].x, this.foods[i].y);
  }
  for (var j = 0; j < this.bombs.length; j++) {
    this._ensureItemMesh('bomb', this.bombs[j].x, this.bombs[j].y);
  }
  for (var k = 0; k < this.falling.length; k++) {
    this._attachFallingMesh(this.falling[k]);
  }
};

/* ---------------- 3D: render mỗi frame ---------------- */

// Cập nhật vị trí mesh mỗi frame — KHÔNG vẽ (main.js vẽ bằng renderer.render).
// Nhận render(scene, nowMs) hoặc render(nowMs) hoặc render() (lấy scene từ
// window.Ran3D nếu chưa gắn). Chưa có scene thì không làm gì (không throw).
Board.prototype.render = function (a, b) {
  var now;
  if (a && typeof a === 'object' && typeof a.add === 'function') {
    // render(scene, nowMs) — main.js truyền scene mỗi frame
    if (!this._scene) this.setScene(a);
    now = (typeof b === 'number') ? b : Date.now();
  } else if (typeof a === 'number') {
    now = a; // render(nowMs) — scene đã gắn qua setScene/init
  } else {
    now = Date.now();
  }
  if (!this._scene) {
    var shared = (typeof globalThis !== 'undefined' && globalThis.Ran3D) || null;
    if (shared && shared.scene) this.setScene(shared.scene);
    else return;
  }
  this._renderItemMeshes(now);
};

// Độ nảy lên (đơn vị 3D, âm = lên trên) của táo/bom vừa chạm đất trong 200ms gần nhất.
Board.prototype._bounceOffset = function (type, x, y, now) {
  var list = this._lastLanded;
  for (var i = 0; i < list.length; i++) {
    var e = list[i];
    if (e.type === type && e.x === x && e.y === y) {
      var q = (now - e.at) / BOUNCE_MS;
      if (q >= 0 && q < 1) return -BOUNCE_PX * Math.sin(Math.PI * q);
    }
  }
  return 0;
};

// Tia lửa bom nhấp nháy theo thời gian (phóng to/thu nhỏ).
Board.prototype._pulseSpark = function (group, now) {
  var spark = group.userData.spark;
  if (!spark) return;
  var phase = 0.5 + 0.5 * Math.sin(now / 130);
  spark.scale.setScalar(0.7 + 0.5 * phase);
};

// Đặt vị trí mesh cho trái đang rơi (nội suy + bóng) và trái đã chạm đất (nảy).
Board.prototype._renderItemMeshes = function (now) {
  var fallH = FALL_CELLS * this.cell;
  var dur = Math.max(1, this.config.thoiGianRoi);
  var i, c, rec;
  // Trái đang rơi: vị trí nội suy (rơi nhanh dần) + bóng dưới ô đích lớn dần.
  for (i = 0; i < this.falling.length; i++) {
    var f = this.falling[i];
    rec = this._itemMeshes.get(this._itemKey(f.type, f.x, f.y));
    if (!rec) continue;
    var p = (now - f.t0) / dur;
    if (p < 0) { // chưa tới lượt rơi (nối tiếp)
      rec.group.visible = false;
      if (rec.ring) rec.ring.visible = false;
      continue;
    }
    if (p > 1) p = 1; // render gọi mà chưa update: vẽ ở đất
    var s = p * p; // rơi nhanh dần (trọng lực)
    c = this.cellTo3D(f.x, f.y);
    rec.group.visible = true;
    rec.group.position.set(c.x, rec.radius + fallH * (1 - s), c.z);
    rec.group.scale.setScalar(0.85 + 0.15 * s);
    if (rec.ring) {
      var rx = this.cell * 0.30 * (0.4 + 0.6 * s);
      rec.ring.visible = true;
      rec.ring.scale.set(rx, 1, rx * 0.45);
      rec.ring.material.opacity = 0.08 + 0.22 * s;
    }
    if (f.type === 'bomb') this._pulseSpark(rec.group, now);
  }
  // Trái đã chạm đất (+ nảy nhẹ 200ms).
  for (i = 0; i < this.foods.length; i++) {
    var fd = this.foods[i];
    rec = this._itemMeshes.get(this._itemKey('apple', fd.x, fd.y));
    if (!rec) continue;
    c = this.cellTo3D(fd.x, fd.y);
    rec.group.visible = true;
    rec.group.scale.setScalar(1);
    rec.group.position.set(c.x, rec.radius + this._bounceOffset('apple', fd.x, fd.y, now), c.z);
  }
  for (i = 0; i < this.bombs.length; i++) {
    var bd = this.bombs[i];
    rec = this._itemMeshes.get(this._itemKey('bomb', bd.x, bd.y));
    if (!rec) continue;
    c = this.cellTo3D(bd.x, bd.y);
    rec.group.visible = true;
    rec.group.scale.setScalar(1);
    rec.group.position.set(c.x, rec.radius + this._bounceOffset('bomb', bd.x, bd.y, now), c.z);
    this._pulseSpark(rec.group, now);
  }
};

if (typeof window !== 'undefined') window.Board = Board;
if (typeof module !== 'undefined' && module.exports) module.exports = Board;

})();
