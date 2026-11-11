/* Board — bàn chơi game Rắn Săn Mồi (RAN-BOARD, nv3).
   Hợp đồng: RAN-SAN-MOI-SPEC.md §3 (bàn + layout) và §5 (Board + quà), bản cập nhật
   hiệu ứng RƠI (user bổ sung 2026-11-11 16:53).
   main.js (nv1) gọi đúng các hàm dưới đây; KHÔNG đổi tên/signature.

   ĐỔI SO VỚI BẢN fa31f3f (BOSS giao bổ sung — nv1/nv6 lưu ý):
   - spawnFood(count, isBlocked) / spawnBomb(count, head, isBlocked, nowMs):
     tham số đầu giờ là SỐ TRÁI (mặc định 1), trả SỐ TRÁI thực tế đã thả (không
     còn trả vị trí/null). Táo/bom KHÔNG hiện ra ngay — chúng RƠI từ trên cao
     xuống ô đích (rơi thoiGianRoi ms, mỗi trái cách nhau choRoi ms).
   - update(nowMs) giờ trả OBJECT { expiredBombs: [...], landed: [...] }
     (không còn trả mảng bom hết hạn) — landed là táo/bom VỪA chạm đất
     ({type:'apple'|'bomb', x, y}); main.js gọi effects.land() cho mỗi cái đó.
   - Trần mới: tối đa 30 táo / 30 bom trên bàn (soTaoToiDaTrenBan=30,
     soBomToiDa=30 — tính cả táo/bom đang rơi).

   Cách dùng (main.js):
     const board = new Board(config);              // config: xem DEFAULT_CONFIG
     board.setRect(x, y, cell);                    // dời/đổi cỡ bàn sau khi xếp HUD (không bắt buộc)
     board.reset(isBlocked);                       // ván mới: dọn táo/bom/rơi, thả 1 táo
     board.spawnFood(1, isBlocked);                // ăn xong thả táo mới (CŨNG rơi)
     board.spawnFood(n, isBlocked);                // quà rớt n táo (n theo bậc xu, main.js tính)
     board.spawnBomb(n, snake.segments[0], isBlocked); // quà thả n bom
     board.update();                               // mỗi frame/tick: rơi + chạm đất + dọn bom hết hạn
     board.removeFood(x, y);                       // rắn ăn táo xong
     board.render(ctx);                            // mỗi frame, vẽ dưới rắn + FX
   isBlocked(x, y): main.js PHẢI truyền hàm này (trả true nếu ô có thân rắn),
   nếu không táo/bom có thể rớt lên thân rắn — Board chỉ biết tường/táo/bom
   (isFree theo đúng §5: không tường/táo/bom ĐÃ CHẠM ĐẤT, rắn do Snake giữ).
   Khoảng cách bom–đầu rắn ≥ 3 ô tính theo Manhattan (|dx|+|dy|).
   CHỈ KHI CHẠM ĐẤT MỚI TÍNH: táo/bom đang rơi không có trong foods/bombs,
   không tính vào isFood/isBomb/isFree (rắn chưa ăn được / chưa gây chết,
   AI không tính là chướng ngại). Bom hết hạn tính từ lúc THẢ (không phải lúc chạm đất).
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
var FALL_CELLS = 6; // táo/bom bắt đầu rơi từ cao hơn ô đích 6 ô
var BOUNCE_MS = 200; // thời gian nảy sau khi chạm đất
var BOUNCE_PX = 6; // cao độ nảy tối đa (px)

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

// Ô trống theo §5: trong bàn + không táo/bom ĐÃ CHẠM ĐẤT (rắn do Snake giữ —
// main.js truyền isBlocked khi thả để tránh cả thân rắn). Táo/bom đang rơi
// KHÔNG chặn ô (rắn đi xuyên qua được — chúng chưa tính).
Board.prototype.isFree = function (x, y) {
  return this.inBounds(x, y) && !this.isFood(x, y) && !this.isBomb(x, y);
};

// Tâm (px) của 1 ô — Snake/FX dùng để vẽ đúng vị trí.
Board.prototype.cellCenter = function (x, y) {
  return { x: this.gridX + (x + 0.5) * this.cell, y: this.gridY + (y + 0.5) * this.cell };
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
  return { expiredBombs: gone, landed: landed };
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

// Ván mới: dọn táo/bom/rơi, thả lại 1 táo. nowMs: mốc bắt đầu (mặc định
// Date.now(); chỉ dùng để test cho thời gian xác định).
Board.prototype.reset = function (isBlocked, nowMs) {
  this.foods = [];
  this.bombs = [];
  this.falling = [];
  this._lastLanded = [];
  this.ensureFood(isBlocked, nowMs);
};

/* ---------------- Vẽ ---------------- */

Board.prototype.render = function (ctx, nowMs) {
  if (!ctx) return;
  var now = (typeof nowMs === 'number') ? nowMs : Date.now();
  this._renderFrame(ctx);
  this._renderGrid(ctx);
  this._renderCannons(ctx);
  for (var i = 0; i < this.foods.length; i++) {
    var f = this.foods[i];
    this._renderApple(ctx, f.x, f.y, this._bounceOffset('apple', f.x, f.y, now));
  }
  for (var j = 0; j < this.bombs.length; j++) {
    var b = this.bombs[j];
    this._renderBomb(ctx, b, now, this._bounceOffset('bomb', b.x, b.y, now));
  }
  this._renderFalling(ctx, now);
};

// Độ nảy lên (px, âm = lên trên) của táo/bom vừa chạm đất trong 200ms gần nhất.
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

// Vẽ táo/bom đang rơi: ở vị trí nội suy (rơi nhanh dần) + bóng ellipse dưới ô
// đích (lớn dần + đậm dần khi tới gần đất). Trái chưa tới lượt (p < 0) thì chưa vẽ.
Board.prototype._renderFalling = function (ctx, now) {
  var fallH = FALL_CELLS * this.cell;
  var dur = Math.max(1, this.config.thoiGianRoi);
  for (var i = 0; i < this.falling.length; i++) {
    var f = this.falling[i];
    var p = (now - f.t0) / dur;
    if (p < 0) continue;
    if (p > 1) p = 1; // render gọi mà chưa update: vẽ ở đất
    var s = p * p; // rơi nhanh dần (trọng lực)
    var c = this.cellCenter(f.x, f.y);
    var py = c.y - fallH * (1 - s);
    var scale = 0.85 + 0.15 * s;
    var rx = this.cell * 0.30 * (0.4 + 0.6 * s);
    ctx.fillStyle = 'rgba(0,0,0,' + (0.08 + 0.22 * s).toFixed(3) + ')';
    ctx.beginPath();
    ctx.ellipse(c.x, c.y, rx, rx * 0.45, 0, 0, Math.PI * 2);
    ctx.fill();
    if (f.type === 'apple') this._drawApple(ctx, c.x, py, scale);
    else this._drawBomb(ctx, c.x, py, now, scale);
  }
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

// Táo đã chạm đất ở ô (x, y); dy: độ nảy lên (px, âm = lên trên).
Board.prototype._renderApple = function (ctx, x, y, dy) {
  var c = this.cellCenter(x, y);
  this._drawApple(ctx, c.x, c.y + (dy || 0), 1);
};

// Vẽ táo tại điểm (px, py) với tỉ lệ scale — dùng chung cho táo đã chạm đất
// (scale=1) và táo đang rơi (scale nhỏ dần khi còn cao).
Board.prototype._drawApple = function (ctx, px, py, scale) {
  var r = this.cell * 0.32 * scale;
  var g = ctx.createRadialGradient(px - r * 0.35, py - r * 0.4, r * 0.1, px, py, r);
  g.addColorStop(0, COLOR.appleRedA);
  g.addColorStop(1, COLOR.appleRedB);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(px, py, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.25)';
  ctx.lineWidth = 1;
  ctx.stroke();
  // Bóng sáng.
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.beginPath();
  ctx.ellipse(px - r * 0.35, py - r * 0.4, r * 0.28, r * 0.16, -0.6, 0, Math.PI * 2);
  ctx.fill();
  // Cuống + lá.
  ctx.strokeStyle = '#6D4C41';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(px, py - r * 0.9);
  ctx.lineTo(px + 1, py - r * 1.25);
  ctx.stroke();
  ctx.fillStyle = COLOR.appleLeaf;
  ctx.beginPath();
  ctx.ellipse(px + r * 0.42, py - r * 1.05, r * 0.42, r * 0.2, -0.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = COLOR.appleLeafDark;
  ctx.lineWidth = 1;
  ctx.stroke();
};

// Bom đã chạm đất; dy: độ nảy lên (px).
Board.prototype._renderBomb = function (ctx, bomb, now, dy) {
  var c = this.cellCenter(bomb.x, bomb.y);
  this._drawBomb(ctx, c.x, c.y + (dy || 0), now, 1);
};

// Vẽ bom tại điểm (px, py) — dùng chung cho bom đã chạm đất và bom đang rơi.
// Tia lửa nhấp nháy theo now.
Board.prototype._drawBomb = function (ctx, px, py, now, scale) {
  var r = this.cell * 0.34 * scale;
  var g = ctx.createRadialGradient(px - r * 0.35, py - r * 0.4, r * 0.1, px, py, r);
  g.addColorStop(0, COLOR.bombBodyA);
  g.addColorStop(1, COLOR.bombBodyB);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(px, py, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.18)';
  ctx.lineWidth = 1;
  ctx.stroke();
  // Bóng sáng nhỏ.
  ctx.fillStyle = 'rgba(255,255,255,0.28)';
  ctx.beginPath();
  ctx.ellipse(px - r * 0.35, py - r * 0.4, r * 0.22, r * 0.13, -0.6, 0, Math.PI * 2);
  ctx.fill();
  // Ngòi: cong lên-phải từ đỉnh bom.
  var fx = px + r * 0.55, fy = py - r * 1.05;
  ctx.strokeStyle = COLOR.fuse;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(px + r * 0.1, py - r * 0.85);
  ctx.quadraticCurveTo(px + r * 0.45, py - r * 1.25, fx, fy);
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
