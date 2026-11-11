# Rắn Săn Mồi — Game live TikTok

Rắn TỰ CHƠI (AI): tự tìm táo, tự tránh tường / cắn thân mình / bom nên cứ
chạy hoài không thua. Người xem không điều khiển rắn — họ can thiệp bằng
quà tặng và tim.

## Luật chơi

- **Ăn táo:** rắn dài ra +1 đốt, **+điểm** (mặc định 10, config `diemTao`).
  Ăn xong bàn tự thả táo mới (bàn luôn có `soTaoToiDa` táo).
- **Tặng quà** (theo bảng `quaTang`):
  - Hoa hồng / GG / Táo / Bánh donut / Gà → rớt **1 quả táo** xuống bàn.
  - Hộp quà → thả **1 quả bom** xuống bàn.
  - Quà không có trong bảng → **+0 điểm, không hiệu ứng** (ghi log trong
    console để user bổ sung vào bảng).
- **Bom là bẫy:** rắn phải tránh. Đụng bom → CHẾT (nổ), tự chơi lại sau
  `thoiGianHoiSinh` giây (mặc định 3s): thân về độ dài ban đầu, điểm về 0,
  giữ Kỷ lục. Bom có thời hạn `thoiGianBom` giây (mặc định 30s, 0 = không
  hết hạn) rồi tự biến mất; tối đa `soBomToiDa` bom cùng lúc (mặc định 5).
  Bom thả cách đầu rắn ít nhất 3 ô.
- **Tim:** +1 điểm mỗi tim.
- **Top 3 tặng quà:** xếp theo tổng điểm quà của từng người, cập nhật live.
- **Điểm game** = điểm táo + điểm tim + điểm quà. Kỷ lục = điểm cao nhất phiên.

## Cách chạy

- Live thật: mở game qua LiveBridge (`Games/ran-san-moi/`), bấm **Start**.
  LiveBridge nối TikTok (cổng 8787) và đẩy event quà/tim vào game.
- Demo không cần live: `Games/ran-san-moi/?demo=1` — bấm Start, game tự
  chạy; cứ 8s giả 1 quà ngẫu nhiên (xoay hoa → táo, hộp quà → bom), cứ 5s
  giả 10 tim.

## Config (admin LiveBridge, nhóm "Rắn Săn Mồi")

| Key | Mặc định | Ý nghĩa |
|---|---|---|
| `kichThuocBan` | 20 (16–24) | Lưới bàn vuông N×N ô. Đổi là dựng lại bàn + rắn. |
| `tocDo` | 150 (80–300) | ms/tick — rắn đi 1 ô mỗi tick. Số càng nhỏ rắn càng nhanh. |
| `doDaiBanDau` | 5 | Độ dài rắn lúc bắt đầu / sau khi hồi sinh. |
| `diemTao` | 10 | Điểm mỗi quả táo ăn được. |
| `thoiGianBom` | 30 (giây, 0 = không hết hạn) | Bom tự biến mất sau từng này giây. |
| `soBomToiDa` | 5 | Tối đa bom cùng lúc; quà thả bom khi đủ thì bỏ qua. |
| `soTaoToiDa` | 3 | Số táo thường trực trên bàn. |
| `thoiGianHoiSinh` | 3 (giây) | Chết bao lâu thì chơi lại. |
| `mauThanRan` | `#FF9F1C` | Màu thân rắn (cam, gradient tới vàng). |
| `mauDauRan` | `#4CAF50` | Màu đầu rắn (xanh lá). |
| `quaTang` | (xem dưới) | Bảng quà JSON: tên quà → {diem, hieuUng}. |
| `tenGame` | `Rắn Săn Mồi` | Tên game hiển thị. |

Bảng quà mặc định (`quaTang`, JSON):

```json
{"Rose":{"diem":1,"hieuUng":"tao"},"GG":{"diem":5,"hieuUng":"tao"},"Apple":{"diem":25,"hieuUng":"tao"},"Doughnut":{"diem":30,"hieuUng":"tao"},"Chicken":{"diem":60,"hieuUng":"tao"},"Gift Box":{"diem":100,"hieuUng":"bom"}}
```

- Key = **tên quà thật trên TikTok** (khớp không phân biệt hoa/thường;
  `Rose`/`Doughnut` đã xác nhận có trong catalog LiveBridge;
  `GG`/`Apple`/`Chicken`/`Gift Box` theo ảnh tham chiếu — nếu live thật
  thấy tên khác thì sửa key cho khớp, game cũng nhận cả nhãn tiếng Việt
  như "Hoa hồng").
- `diem` = điểm quà (cộng vào Điểm game + Top tặng quà), `hieuUng` =
  `"tao"` (rớt táo) hoặc `"bom"` (thả bom). Quà combo (count > 1): điểm
  nhân theo count, hiệu ứng chỉ thả 1 lần.

## Kiến trúc file (spec `RAN-SAN-MOI-SPEC.md`)

- `index.html` — khung 720×1280: canvas bàn + HUD DOM (điểm, độ dài, kỷ lục,
  tim, thanh quà, top 3, trạng thái, nút Start).
- `js/main.js` (nv1) — điều phối: init, vòng lặp (tick theo `tocDo`), state,
  nhận event LiveBridge (quà/tim), demo mode.
- `js/snake.js` (nv2) — Snake AI (BFS tới táo + flood-fill sinh tồn) + vẽ rắn.
- `js/board.js` (nv3) — Board: lưới, táo/bom, vẽ bàn + khung gỗ.
- `js/effects.js` (nv4) — FX: hạt ăn táo, nổ bom, chết, chữ điểm bay.
- Không dùng CDN / thư viện ngoài. Canvas 2D thuần.

## Hợp đồng interface (không tự đổi signature — đối chiếu code thật nv2/nv3/nv4)

- `new Snake({ board, config, isBlocked(x,y), getFood(), onEat, onDie })`;
  `snake.reset()`; `snake.tick()` → `{type:'eat',apple}` /
  `{type:'die',cause}` / `{type:'move'}` / `null` (đã chết); `snake.grow(n)`;
  `snake.render(ctx, alpha)`; `snake.segments/direction/alive/length`.
  - main.js CHỈ dùng event trả về từ `tick()`; callback `onEat`/`onDie`
    truyền no-op (tick vừa trả event vừa gọi callback — dùng cả 2 sẽ cộng
    điểm/grow 2 lần). `tick()` chỉ BÁO ăn/chết — main gọi `snake.grow(1)`
    khi ăn. Snake KHÔNG tự gỡ táo khỏi bàn — main gọi `board.removeFood()`.
  - Snake snapshot config lúc new (copy) — main đẩy màu/độ dài mới vào
    `snake.config` sau mỗi applyConfig để admin đổi ăn ngay.
  - Snake._geometry đọc `board.cell` + `board.offsetX`/`board.offsetY`
    (không đọc `gridX`/`gridY`) — main gán alias
    `board.offsetX = board.gridX`, `board.offsetY = board.gridY` sau khi
    tạo Board để rắn vẽ đúng vị trí bàn.
- `new Board(config)` (config plain — Board chỉ lấy 4 key
  `kichThuocBan`/`soTaoToiDa`/`soBomToiDa`/`thoiGianBom`);
  hình học `board.cell/gridX/gridY/gridSize/frame` (mặc định lưới 640px,
  khung 20px, grid (20,180) trên stage 720×1280);
  `board.setRect(x,y,cell)`; `board.reset(isBlocked)`;
  `board.spawnFood(isBlocked)` / `board.ensureFood(isBlocked)`;
  `board.spawnBomb(head, isBlocked, nowMs)` (cách đầu ≥3 ô Manhattan);
  `board.update(nowMs)` — PHẢI gọi mỗi frame, dọn bom hết hạn, trả mảng
  bom vừa hết hạn; `board.removeFood/removeBomb(x,y)`;
  `board.isBomb/isFood/isFree/inBounds(x,y)`; `board.cellCenter(x,y)`;
  `board.render(ctx, nowMs)` (vẽ ở tọa độ tuyệt đối stage — canvas phủ
  toàn stage 720×1280). `isBlocked` = "ô rắn đang chiếm", main PHẢI truyền
  khi thả (Board chỉ biết tường/táo/bom). `isFree` không tính rắn.
  - Board snapshot config lúc new (copy) — main đẩy `thoiGianBom`/
    `soBomToiDa`/`soTaoToiDa` mới vào `board.config` sau mỗi applyConfig.
- `window.effects.init({cellSize, cols, rows, originX, originY, applePoints})`
  — PHẢI gọi sau khi biết layout bàn (và gọi lại khi đổi bàn/điểm);
  `effects.eat(x,y,points)/explode(x,y)/die()/spawn(x,y)` (tọa độ ô lưới),
  `update(dt)` (dt tính bằng GIÂY), `render(ctx)`. Chưa có hàm poof riêng
  cho bom hết hạn — main gọi `update()` và chưa bắn FX gì thêm.

## Lưu ý kiểm chứng

- Demo 5 phút: rắn di chuyển mượt, ăn táo lớn lên, không đơ, không chết
  vô cớ, hồi sinh đúng sau 3s, bom hết hạn biến mất, quà giả lập rớt đúng
  táo/bom. 0 console error.
- Đổi màu/tốc độ qua admin ăn ngay (không cần load lại trang); đổi
  `kichThuocBan` thì dựng lại bàn + rắn.
- Trường hợp biên (để nv6 kiểm): rắn hồi sinh ngay trên ô có bom (bom cũ
  chưa hết hạn) có thể chết ngay tick đầu — xác suất thấp, AI tránh bom
  nên chỉ chết khi đầu hồi sinh đúng ô bom.
- Chưa test live TikTok/OBS/điện thoại thật.
