/* Board — bàn chơi game Rắn Săn Mồi (RAN-BOARD, nv3).
   Hợp đồng: RAN-SAN-MOI-SPEC.md §3 (bàn + layout) và §5 (Board + quà).
   main.js (nv1) gọi đúng các hàm dưới đây; KHÔNG đổi tên/signature.

   Cách dùng (main.js):
     const board = new Board(config);              // config: xem DEFAULT_CONFIG
     board.setRect(x, y, cell);                    // dời/đổi cỡ bàn sau khi xếp HUD (không bắt buộc)
     board.reset(isBlocked);                       // ván mới: dọn táo/bom, thả 1 táo
     board.spawnFood(isBlocked);                   // quà rớt táo / ăn xong thả táo mới
     board.spawnBomb(snake.segments[0], isBlocked); // quà thả bom
     board.update();                               // mỗi frame/tick: dọn bom hết hạn, trả mảng bom vừa hết hạn (để main.js bắn poof)
     board.removeFood(x, y);                       // rắn ăn táo xong
     board.render(ctx);                            // mỗi frame, vẽ dưới rắn + FX
   isBlocked(x, y): main.js PHẢI truyền hàm này (trả true nếu ô có thân rắn),
   nếu không táo/bom có thể rớt lên thân rắn — Board chỉ biết tường/táo/bom
   (isFree theo đúng §5: không tường/táo/bom, rắn do Snake giữ).
   Khoảng cách bom–đầu rắn ≥ 3 ô tính theo Manhattan (|dx|+|dy|).
   Vẽ đúng ảnh tham chiếu (live DarkBossTv, user gửi 2026-11-11): bàn caro tối
   2 sắc, khung gỗ nâu + viền vàng, pháo ở giữa cạnh trên + giữa cạnh dưới
   khung (CHỈ trang trí, không bắn).
*/
(function () {
'use strict';

var DEFAULT_CONFIG = {
  kichThuocBan: 20, // ô mỗi chiều, 16–24 (spec §7)
  soTaoToiDa: 3,
  soBomToiDa: 5,
  thoiGianBom: 30, // giây, 0 = bom không hết hạn
};

// Màu đúng ảnh tham chiếu.
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

function num(v, d) {
  return (typeof v === 'number' && Number.isFinite(v)) ? v : d;
}

function Board(config, rect) {
  var cfg = Object.assign({}, DEFAULT_CONFIG, config || {});
  this.n = Math.max(16, Math.min(24, Math.round(num(cfg.kichThuocBan, 20)) || 20));
  this.config = {
    kichThuocBan: this.n,
    soTaoToiDa: Math.max(1, Math.round(num(cfg.soTaoToiDa, 3))),
    soBomToiDa: Math.max(0, Math.round(num(cfg.soBomToiDa, 5))),
    thoiGianBom: Math.max(0, num(cfg.thoiGianBom, 30))
  };
  // Hình học: rect { x, y, cell } — góc trái-trên LƯỚI + cỡ 1 ô (px).
  this.cell = (rect && num(rect.cell, 0) > 0) ? rect.cell : GRID_PX / this.n;
  this.gridSize = this.cell * this.n;
  this.frame = FRAME;
  this.gridX = (rect && typeof rect.x === 'number') ? rect.x
    : (STAGE_W - (this.gridSize + 2 * this.frame)) / 2;
  this.gridY = (rect && typeof rect.y === 'number') ? rect.y : 180;
  this.foods = []; // táo {x, y}
  this.bombs = []; // bom {x, y, expiresAt} — expiresAt = 0: không hết hạn
}

// Dời/đổi cỡ bàn (main.js xếp HUD xong thì gọi; không bắt buộc).
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

// Ô trống theo §5: trong bàn + không táo/bom (rắn do Snake giữ —
// main.js truyền isBlocked khi thả để tránh cả thân rắn).
Board.prototype.isFree = function (x, y) {
  return this.inBounds(x, y) && !this.isFood(x, y) && !this.isBomb(x, y);
};

// Tâm (px) của 1 ô — Snake/FX dùng để vẽ đúng vị trí.
Board.prototype.cellCenter = function (x, y) {
  return { x: this.gridX + (x + 0.5) * this.cell, y: this.gridY + (y + 0.5) * this.cell };
};

// Chọn đều 1 ô trống trong số các ô hợp lệ (liệt kê hết rồi chọn —
// không lặp thử/sai, không bao giờ treo khi bàn gần đầy).
Board.prototype._randomFreeCell = function (isBlocked, minHeadDist, head) {
  var out = [];
  for (var y = 0; y < this.n; y++) {
    for (var x = 0; x < this.n; x++) {
      if (!this.isFree(x, y)) continue;
      if (isBlocked && isBlocked(x, y)) continue;
      if (head && minHeadDist > 0) {
        if (Math.abs(x - head.x) + Math.abs(y - head.y) < minHeadDist) continue;
      }
      out.push({ x: x, y: y });
    }
  }
  if (!out.length) return null;
  return out[(Math.random() * out.length) | 0];
};

// Thả 1 táo ở ô trống ngẫu nhiên; trả vị trí hoặc null (đã đủ soTaoToiDa / bàn đầy).
Board.prototype.spawnFood = function (isBlocked) {
  if (this.foods.length >= this.config.soTaoToiDa) return null;
  var cell = this._randomFreeCell(isBlocked, 0, null);
  if (!cell) return null;
  this.foods.push(cell);
  return cell;
};

// Đảm bảo luôn ≥ 1 táo trên bàn (ván mới / sau khi ăn); trả mảng vị trí vừa thả.
Board.prototype.ensureFood = function (isBlocked) {
  var spawned = [];
  while (this.foods.length < 1) {
    var c = this.spawnFood(isBlocked);
    if (!c) break;
    spawned.push(c);
  }
  return spawned;
};

// Thả 1 bom ở ô trống ngẫu nhiên, cách đầu rắn ≥ 3 ô (Manhattan).
// head: {x, y} vị trí đầu rắn (bỏ qua = không áp luật cách đầu).
// Trả bom {x, y, expiresAt} hoặc null (đã đủ soBomToiDa / không còn ô hợp lệ).
// expiresAt = 0 nghĩa là không hết hạn (thoiGianBom = 0).
Board.prototype.spawnBomb = function (head, isBlocked, nowMs) {
  if (this.bombs.length >= this.config.soBomToiDa) return null;
  var now = (typeof nowMs === 'number') ? nowMs : Date.now();
  var cell = this._randomFreeCell(isBlocked, 3, head || null);
  if (!cell) return null;
  var bomb = {
    x: cell.x,
    y: cell.y,
    expiresAt: this.config.thoiGianBom > 0 ? now + this.config.thoiGianBom * 1000 : 0
  };
  this.bombs.push(bomb);
  return bomb;
};

// Dọn bom hết hạn; trả mảng bom vừa hết hạn (main.js bắn hiệu ứng poof).
// main.js gọi mỗi frame/tick — bom hết hạn chỉ biến mất khi update() chạy.
Board.prototype.update = function (nowMs) {
  var now = (typeof nowMs === 'number') ? nowMs : Date.now();
  var gone = [];
  this.bombs = this.bombs.filter(function (b) {
    if (b.expiresAt > 0 && b.expiresAt <= now) { gone.push(b); return false; }
    return true;
  });
  return gone;
};

// Rắn ăn táo xong: gỡ táo khỏi bàn. Trả true nếu có táo ở ô đó.
Board.prototype.removeFood = function (x, y) {
  var i = this.foods.findIndex(function (f) { return f.x === x && f.y === y; });
  if (i < 0) return false;
  this.foods.splice(i, 1);
  return true;
};

// Gỡ 1 quả bom (vd nổ xong). Trả true nếu có bom ở ô đó.
Board.prototype.removeBomb = function (x, y) {
  var i = this.bombs.findIndex(function (b) { return b.x === x && b.y === y; });
  if (i < 0) return false;
  this.bombs.splice(i, 1);
  return true;
};

// Ván mới: dọn táo/bom, thả lại 1 táo.
Board.prototype.reset = function (isBlocked) {
  this.foods = [];
  this.bombs = [];
  this.ensureFood(isBlocked);
};

/* ---------------- Vẽ ---------------- */

Board.prototype.render = function (ctx, nowMs) {
  if (!ctx) return;
  var now = (typeof nowMs === 'number') ? nowMs : Date.now();
  this._renderFrame(ctx);
  this._renderGrid(ctx);
  this._renderCannons(ctx);
  for (var i = 0; i < this.foods.length; i++) this._renderApple(ctx, this.foods[i].x, this.foods[i].y);
  for (var j = 0; j < this.bombs.length; j++) this._renderBomb(ctx, this.bombs[j], now);
};

// Khung gỗ: nền gỗ gradient + vân ván + viền ngoài tối + viền vàng sát lưới
// + 4 ụ góc có đinh vàng (như ảnh tham chiếu).
Board.prototype._renderFrame = function (ctx) {
  var f = this.frame;
  var x0 = this.gridX - f, y0 = this.gridY - f;
  var w = this.gridSize + 2 * f, h = w;
  var g = ctx.createLinearGradient(x0, y0, x0 + w, y0 + h);
  g.addColorStop(0, COLOR.frameWoodA);
  g.addColorStop(1, COLOR.frameWoodB);
  ctx.fillStyle = g;
  ctx.fillRect(x0, y0, w, h);
  // Vân ván: đường dọc trên dải trên/dưới, đường ngang trên dải trái/phải.
  ctx.strokeStyle = 'rgba(0,0,0,0.22)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (var x = x0 + 48; x < x0 + w - 8; x += 64) {
    ctx.moveTo(x, y0 + 2); ctx.lineTo(x, y0 + f - 2);
    ctx.moveTo(x, y0 + h - f + 2); ctx.lineTo(x, y0 + h - 2);
  }
  for (var y = y0 + 48; y < y0 + h - 8; y += 64) {
    ctx.moveTo(x0 + 2, y); ctx.lineTo(x0 + f - 2, y);
    ctx.moveTo(x0 + w - f + 2, y); ctx.lineTo(x0 + w - 2, y);
  }
  ctx.stroke();
  // Viền ngoài tối + viền vàng sát lưới.
  ctx.strokeStyle = COLOR.frameEdge;
  ctx.lineWidth = 2;
  ctx.strokeRect(x0 + 1, y0 + 1, w - 2, h - 2);
  ctx.strokeStyle = COLOR.gold;
  ctx.lineWidth = 3;
  ctx.strokeRect(this.gridX - 1.5, this.gridY - 1.5, this.gridSize + 3, this.gridSize + 3);
  // 4 ụ góc + đinh vàng.
  var c = f + 8;
  var corners = [[x0, y0], [x0 + w - c, y0], [x0, y0 + h - c], [x0 + w - c, y0 + h - c]];
  for (var i = 0; i < corners.length; i++) {
    ctx.fillStyle = COLOR.corner;
    ctx.fillRect(corners[i][0], corners[i][1], c, c);
    ctx.fillStyle = COLOR.goldLight;
    ctx.beginPath();
    ctx.arc(corners[i][0] + c / 2, corners[i][1] + c / 2, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }
};

// Lưới caro 2 sắc + đường kẻ mờ giữa các ô.
Board.prototype._renderGrid = function (ctx) {
  var cell = this.cell, n = this.n;
  for (var y = 0; y < n; y++) {
    for (var x = 0; x < n; x++) {
      ctx.fillStyle = ((x + y) % 2 === 0) ? COLOR.cellA : COLOR.cellB;
      ctx.fillRect(this.gridX + x * cell, this.gridY + y * cell, cell, cell);
    }
  }
  ctx.strokeStyle = COLOR.gridLine;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (var i = 0; i <= n; i++) {
    var p = this.gridX + i * cell;
    ctx.moveTo(p, this.gridY); ctx.lineTo(p, this.gridY + this.gridSize);
    var q = this.gridY + i * cell;
    ctx.moveTo(this.gridX, q); ctx.lineTo(this.gridX + this.gridSize, q);
  }
  ctx.stroke();
};

// Pháo trang trí: giữa cạnh trên (nòng chĩa lên) + giữa cạnh dưới (chĩa xuống),
// đặt trên dải khung — CHỈ trang trí, không bắn.
Board.prototype._renderCannons = function (ctx) {
  var cx = this.gridX + this.gridSize / 2;
  this._renderCannon(ctx, cx, this.gridY - this.frame / 2, 0);
  this._renderCannon(ctx, cx, this.gridY + this.gridSize + this.frame / 2, Math.PI);
};

// angle: hướng nòng (radian trong hệ canvas, 0 = chĩa lên, PI = chĩa xuống).
// Nòng vẽ dọc theo trục -y cục bộ nên góc 0 là chĩa lên (không xoay).
Board.prototype._renderCannon = function (ctx, cx, cy, angle) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle);
  // Bệ gỗ.
  ctx.fillStyle = COLOR.cannonWood;
  ctx.fillRect(-17, -6, 34, 12);
  // Bánh xe 2 bên.
  ctx.fillStyle = COLOR.cannonMetal;
  ctx.beginPath();
  ctx.arc(-11, 8, 6, 0, Math.PI * 2);
  ctx.arc(11, 8, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = COLOR.gold;
  ctx.beginPath();
  ctx.arc(-11, 8, 2, 0, Math.PI * 2);
  ctx.arc(11, 8, 2, 0, Math.PI * 2);
  ctx.fill();
  // Nòng: thân đen + vành vàng ở đầu nòng.
  ctx.fillStyle = COLOR.cannonMetal;
  ctx.fillRect(-4, -26, 8, 30);
  ctx.fillStyle = COLOR.cannonMetalLight;
  ctx.fillRect(-4, -26, 8, 6);
  ctx.fillStyle = COLOR.gold;
  ctx.fillRect(-5.5, -28, 11, 4);
  ctx.restore();
};

// Táo: tròn đỏ + cuống + lá xanh + bóng sáng.
Board.prototype._renderApple = function (ctx, x, y) {
  var c = this.cellCenter(x, y);
  var r = this.cell * 0.32;
  var g = ctx.createRadialGradient(c.x - r * 0.35, c.y - r * 0.4, r * 0.1, c.x, c.y, r);
  g.addColorStop(0, COLOR.appleRedA);
  g.addColorStop(1, COLOR.appleRedB);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(c.x, c.y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.25)';
  ctx.lineWidth = 1;
  ctx.stroke();
  // Bóng sáng.
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.beginPath();
  ctx.ellipse(c.x - r * 0.35, c.y - r * 0.4, r * 0.28, r * 0.16, -0.6, 0, Math.PI * 2);
  ctx.fill();
  // Cuống + lá.
  ctx.strokeStyle = '#6D4C41';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(c.x, c.y - r * 0.9);
  ctx.lineTo(c.x + 1, c.y - r * 1.25);
  ctx.stroke();
  ctx.fillStyle = COLOR.appleLeaf;
  ctx.beginPath();
  ctx.ellipse(c.x + r * 0.42, c.y - r * 1.05, r * 0.42, r * 0.2, -0.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = COLOR.appleLeafDark;
  ctx.lineWidth = 1;
  ctx.stroke();
};

// Bom: tròn đen + ngòi + tia lửa nhấp nháy (phase theo nowMs).
Board.prototype._renderBomb = function (ctx, bomb, now) {
  var c = this.cellCenter(bomb.x, bomb.y);
  var r = this.cell * 0.34;
  var g = ctx.createRadialGradient(c.x - r * 0.35, c.y - r * 0.4, r * 0.1, c.x, c.y, r);
  g.addColorStop(0, COLOR.bombBodyA);
  g.addColorStop(1, COLOR.bombBodyB);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(c.x, c.y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.18)';
  ctx.lineWidth = 1;
  ctx.stroke();
  // Bóng sáng nhỏ.
  ctx.fillStyle = 'rgba(255,255,255,0.28)';
  ctx.beginPath();
  ctx.ellipse(c.x - r * 0.35, c.y - r * 0.4, r * 0.22, r * 0.13, -0.6, 0, Math.PI * 2);
  ctx.fill();
  // Ngòi: cong lên-phải từ đỉnh bom.
  var fx = c.x + r * 0.55, fy = c.y - r * 1.05;
  ctx.strokeStyle = COLOR.fuse;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(c.x + r * 0.1, c.y - r * 0.85);
  ctx.quadraticCurveTo(c.x + r * 0.45, c.y - r * 1.25, fx, fy);
  ctx.stroke();
  // Tia lửa nhấp nháy: alpha + cỡ pulsing theo thời gian.
  var phase = 0.5 + 0.5 * Math.sin(now / 130);
  var sr = r * (0.32 + 0.18 * phase);
  var glow = ctx.createRadialGradient(fx, fy, 0, fx, fy, sr * 2.2);
  glow.addColorStop(0, 'rgba(255,112,67,' + (0.35 * phase).toFixed(3) + ')');
  glow.addColorStop(1, 'rgba(255,112,67,0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(fx, fy, sr * 2.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = COLOR.sparkA;
  ctx.globalAlpha = 0.55 + 0.45 * phase;
  ctx.beginPath();
  ctx.moveTo(fx, fy - sr);
  ctx.quadraticCurveTo(fx, fy, fx + sr, fy);
  ctx.quadraticCurveTo(fx, fy, fx, fy + sr);
  ctx.quadraticCurveTo(fx, fy, fx - sr, fy);
  ctx.quadraticCurveTo(fx, fy, fx, fy - sr);
  ctx.fill();
  ctx.fillStyle = COLOR.sparkB;
  ctx.beginPath();
  ctx.arc(fx, fy, sr * 0.35, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
};

if (typeof window !== 'undefined') window.Board = Board;
if (typeof module !== 'undefined' && module.exports) module.exports = Board;

})();
