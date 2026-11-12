# Rắn Săn Mồi — Game live TikTok

Rắn TỰ CHƠI (AI): tự tìm táo, tự tránh tường / cắn thân mình / bom nên cứ
chạy hoài không thua. Người xem không điều khiển rắn — họ can thiệp bằng
quà tặng và tim.

## Luật chơi

- **Ăn táo:** rắn dài ra +1 đốt, **+điểm** (mặc định 10, config `diemTao`).
  Ăn xong bàn tự thả táo mới (bàn luôn có `soTaoToiDa` táo).
- **Tặng quà** (theo bảng `quaTang` — **điểm = số xu của quà**, vd hồng 1 xu
  → +1 điểm, hộp quà 100 xu → +100 điểm):
  - Hoa hồng / GG / Táo / Bánh donut / Gà → rớt **táo** xuống bàn.
  - Hộp quà → thả **bom** xuống bàn.
  - **Số lượng theo xu** (`tangQuaTheoXu`): 1 quà rớt NHIỀU trái — xu ≤9 → 1,
    ≤29 → 3, ≤99 → 5, ≤299 → 10, ≤999 → 20, còn lại → 30 (tối đa 30/lần).
    Nhiều trái rơi nối tiếp thành cơn mưa (cách nhau `choRoi` ms).
  - Quà không có trong bảng → **+điểm = số xu (nếu event kèm xu), không
    rớt đồ** (ghi log trong console để user bổ sung vào bảng).
- **RƠI từ trên cao:** táo/bom KHÔNG hiện ngay — rơi xuống ô đích trong
  `thoiGianRoi` ms (mặc định 600ms), có bóng dưới đất lớn dần + nảy nhẹ +
  bụi khi chạm đất. **CHỈ KHI CHẠM ĐẤT MỚI TÍNH:** táo đang rơi rắn chưa ăn
  được, bom đang rơi chưa gây chết, đồ đang rơi không chặn đường rắn.
- **Bom là bẫy:** rắn phải tránh. Đụng bom → CHẾT (nổ), tự chơi lại sau
  `thoiGianHoiSinh` giây (mặc định 3s): thân về độ dài ban đầu, điểm về 0,
  giữ Kỷ lục. Bom có thời hạn `thoiGianBom` giây (mặc định 30s, 0 = không
  hết hạn) rồi tự biến mất; tối đa `soBomToiDa` bom cùng lúc (mặc định 30),
  tối đa `soTaoToiDaTrenBan` táo cùng lúc (mặc định 30) — quà rớt vượt quá
  thì chỉ rớt tới mức trần (phần thừa bỏ qua).
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
| `soBomToiDa` | 30 | Tối đa bom cùng lúc trên bàn; quà thả bom khi đủ thì bỏ qua (phần thừa). |
| `soTaoToiDa` | 3 | Số táo thường trực trên bàn (táo tự nhiên sau khi ăn). |
| `soTaoToiDaTrenBan` | 30 | Tối đa táo cùng lúc trên bàn (kể cả táo quà). |
| `tangQuaTheoXu` | `[[9,1],[29,3],[99,5],[299,10],[999,20],[999999,30]]` | Bảng bậc số lượng theo xu (JSON): [xu tối đa, số trái]. |
| `thoiGianRoi` | 600 (ms, 100–2000) | Thời gian 1 trái rơi từ trên cao xuống đất. |
| `choRoi` | 80 (ms, 0–500) | Khoảng cách giữa 2 trái rơi nối tiếp trong cùng 1 quà. |
| `thoiGianHoiSinh` | 3 (giây) | Chết bao lâu thì chơi lại. |
| `tuRoiTaoGiay` | 12 (giây, 0–60; 0 = tắt) | Không có quà từng này giây thì tự rơi 1 táo (đếm từ quà gần nhất). |
| `tuRoiBomGiay` | 20 (giây, 0–120; 0 = tắt) | Không có quà từng này giây thì tự rơi 1 bom (đếm riêng với táo). |
| `voiceOn` | true | Bật/tắt voice MC (NpcVoice). |
| `voiceGiong` | `HoaiMy` | Giọng MC: `HoaiMy` (nữ) / `NamMinh` (nam). |
| `mauThanRan` | `#FF9F1C` | Màu thân rắn (cam, gradient tới vàng). |
| `mauDauRan` | `#4CAF50` | Màu đầu rắn (xanh lá). |
| `quaTang` | (xem dưới) | Bảng quà JSON: tên quà → {diem, hieuUng}. |
| `tenGame` | `Rắn Săn Mồi` | Tên game hiển thị. |

Bảng quà mặc định (`quaTang`, JSON):

```json
{"Rose":{"diem":1,"hieuUng":"tao"},"GG":{"diem":5,"hieuUng":"tao"},"Apple":{"diem":25,"hieuUng":"tao"},"Doughnut":{"diem":30,"hieuUng":"tao"},"Chicken":{"diem":60,"hieuUng":"tao"},"Gift Box":{"diem":100,"hieuUng":"bom"},"Perfume":{"diem":20,"hieuUng":"bom"},"Fire":{"diem":100,"hieuUng":"bom"},"Rocket":{"diem":1000,"hieuUng":"bom"}}
```

- Key = **tên quà thật trên TikTok** (khớp không phân biệt hoa/thường;
  `Rose`/`Doughnut` đã xác nhận có trong catalog LiveBridge;
  `GG`/`Apple`/`Chicken`/`Gift Box` theo ảnh tham chiếu;
  `Perfume`/`Fire`/`Rocket` là quà bom BOSS chọn 2026-11-11 (tên thường
  gặp trên TikTok — nếu live thật thấy tên khác thì sửa key cho khớp, user
  sửa lại trong config sau nếu cần), game cũng nhận cả nhãn tiếng Việt
  như "Hoa hồng"/"Nước hoa".
- `diem` = số xu mặc định của quà (điểm quà = số xu kèm event, fallback
  diem này; cộng vào Điểm game + Top tặng quà), `hieuUng` = `"tao"` (rớt
  táo) hoặc `"bom"` (thả bom). **Số trái không nằm trong bảng này** — tính
  theo bậc xu `tangQuaTheoXu` (vd hộp quà 100 xu → 10 trái). Quà combo
  (count > 1): điểm = xu × count, số trái tính theo xu đơn của 1 quà.

## Kiến trúc file (spec `RAN-SAN-MOI-SPEC.md`)

- `index.html` — khung 720×1280: canvas bàn + HUD DOM (điểm, độ dài, kỷ lục,
  tim, thanh quà, top 3, trạng thái, nút Start).
- `js/main.js` (nv1) — điều phối: init, vòng lặp (tick theo `tocDo`), state,
  nhận event LiveBridge (quà/tim), demo mode.
- `js/snake.js` (nv2) — Snake AI (BFS tới táo + flood-fill sinh tồn) + vẽ rắn.
- `js/board.js` (nv3) — Board: lưới, táo/bom, vẽ bàn + khung gỗ.
- `js/effects.js` (nv4) — FX: hạt ăn táo, nổ bom, chết, chữ điểm bay.
- Không dùng CDN. Three.js r128 tự host (`js/three.min.js`, copy từ game chùa)
  vẽ WebGL lên canvas `#board` — xem mục "Khung Three.js" dưới đây.

## Khung Three.js (RAN3D-SHELL, spec RAN-SAN-MOI-3D.md §1/§5)

- `main.js` tạo DUY NHẤT 1 lần: `renderer` (WebGLRenderer, antialias, pixelRatio
  tối đa 2), `scene`, `camera` (Perspective fov 60, góc 3/4 từ trên xuống ~52 độ,
  bàn nằm mặt XZ, Y là cao), đèn (Ambient 0.75 + Directional 1.0 từ
  trước-phải-trên, castShadow, shadow map 1024 — theo ảnh test nv3, đèn yếu
  hơn sẽ làm ô caro tối bị tối quá), nền trong suốt (gradient nâu của `#stage`
  hiện qua). Object dùng chung `window.Ran3D = { THREE, scene, camera, renderer }`.
- Tọa độ 3D dùng đúng số 2D: ô (x,y) → `(gridX + (x+0.5)*cell, 0,
  gridY + (y+0.5)*cell)`. Camera (340, 1082, 1475) nhìn (340, 0, 620) —
  cả bàn (kể cả khung gỗ dưới) hiện đủ trên thanh quà. BIÊN: táo/bom rơi từ
  cao 6 ô (board 3D nv3: FALL_CELLS = 6) nên ở cột biên lúc cao nhất bị phóng
  đại ra ngoài thêm ~40px — camera đã kéo xa để chừa biên ~47px quanh bàn
  (đo bằng phép chiếu, xem `workspace/multi-session/ran-test/ran-measure-cam.py`).
- `main.js` truyền `scene` cho Snake/Board/Effects qua `setScene(scene)` (nếu
  có) ngay sau khi tạo, rồi mỗi frame gọi `snake.render(scene, alpha)` /
  `board.render(scene, Date.now())` / `effects.render(scene)` (chúng CHỈ cập
  nhật vị trí mesh, KHÔNG vẽ) rồi `renderer.render(scene, camera)`.
  Các module KHÔNG tự tạo renderer/camera/đèn.
- Module 3D NÊN có `dispose()` để gỡ mesh của mình khỏi scene khi main dựng
  lại bàn/rắn (đổi `kichThuocBan`) — main gọi `dispose()` nếu có (guard
  `typeof`); không có thì mesh cũ còn sót trong scene. Khởi động chỉ tạo
  game 1 lần (bản 2D tạo 2 lần — 3D không được, sẽ thêm mesh trùng).

## Tự rơi + Voice MC (RAN-TUROI-VOICE, spec §7 mới)

- **Tự rơi khi không ai tặng quà:** đếm từ lúc nhận quà gần nhất
  (`lastGiftAt` — quà thật + quà giả demo đều tính, nên demo có quà giả 8s
  thì tự rơi ít khi kích hoạt — đó là đúng). Táo (`tuRoiTaoGiay` 12s) và bom
  (`tuRoiBomGiay` 20s) đếm RIÊNG; quà tới đặt lại cả 2 đếm; rơi xong cũng đặt
  lại đếm của món đó. Rơi qua board như quà (rơi từ trên cao, chạm đất mới
  tính, trần 30 board tự chặn). KHÔNG cộng điểm, KHÔNG tính vào Top tặng quà.
  0 = tắt món đó. Kiểm chứng: `window.RanSanMoi.getState()` có `autoTao`/
  `autoBom` (số táo/bom tự rơi).
- **Voice MC (NpcVoice của LiveBridge):** `index.html` nạp
  `LiveBridge/public/npc-voice.js` (như đám cưới/QH); `main.js` gọi
  `NpcVoice.speak(text, { kind, voice })`, giọng `vi-VN-HoaiMyNeural` /
  `vi-VN-NamMinhNeural` theo config `voiceGiong` (`HoaiMy`/`NamMinh`) —
  KHÔNG dùng GV01/GV02 cho game live. Các lúc nói: cảm ơn quà
  (`Cảm ơn [tên] tặng [quà]!`), rắn chết, mốc điểm mỗi 500 (số đọc ra chữ,
  vd "năm nghìn"), bom TỰ RƠI (`Cẩn thận, bom rơi kìa!`), mồi khi yên ắng
  25s không tương tác THẬT (quà giả demo không tính — luân phiên 4 câu),
  rắn dài mốc 20/40/60... đốt. Không nói khi ăn táo thường. Mốc điểm/dài chỉ
  nói mốc cao nhất đã vượt (1 câu/lần tăng điểm). NpcVoice tự nối tiếp +
  giới hạn tần suất (event gap 2s, random tối đa 6/phút) nên quà dồn dập thì
  câu sau bị bỏ qua, không chồng tiếng. Không có LiveBridge thì game vẫn
  chạy, chỉ không có tiếng (guard `typeof NpcVoice`).

## Hợp đồng interface (không tự đổi signature — đối chiếu code thật nv2/nv3/nv4)

- `new Snake({ board, config, isBlocked(x,y), getFood(), onEat, onDie })`;
  `snake.reset()`; `snake.tick()` → `{type:'eat',apple}` /
  `{type:'die',cause}` / `{type:'move'}` / `null` (đã chết); `snake.grow(n)`;
  `snake.render(scene, alpha)` (3D: chỉ cập nhật vị trí mesh);
  `snake.segments/direction/alive/length`. `setScene(scene)` + `dispose()`
  (gỡ mesh khỏi scene khi dựng lại — xem mục "Khung Three.js").
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
- `new Board(config)` (config plain — Board chỉ lấy các key nó cần:
  `kichThuocBan`/`soTaoToiDa`/`soBomToiDa`/`thoiGianBom`/`thoiGianRoi`/
  `choRoi`/`soTaoToiDaTrenBan`);
  hình học `board.cell/gridX/gridY/gridSize/frame` (mặc định lưới 640px,
  khung 20px, grid (20,180) trên stage 720×1280);
  `board.setRect(x,y,cell)`; `board.reset(isBlocked)`;
  `board.spawnFood(count, isBlocked, nowMs)` / `board.ensureFood(isBlocked)` —
  count mặc định 1, nowMs (ms) để board tính t0 bắt đầu rơi cho từng trái
  (đính chính BOSS 2026-11-11 17:03, spec §5); rơi nối tiếp cách nhau
  `choRoi` ms, chỉ thả tới trần 30 trên bàn (`soTaoToiDaTrenBan`), TRẢ số
  trái thực tế đã thả;
  `board.spawnBomb(count, head, isBlocked, nowMs)` (cách đầu ≥3 ô
  Manhattan, trần 30 bom `soBomToiDa`);
  `board.update(nowMs)` — PHẢI gọi mỗi frame: tiến độ rơi + dọn bom hết
  hạn, TRẢ object `{ expiredBombs: [...], landed: [...] }` (landed = táo/
  bom VỪA chạm đất `{type:'apple'|'bomb', x, y}`);
  `board.removeFood/removeBomb(x,y)`;
  `board.isBomb/isFood/isFree/inBounds(x,y)`; `board.cellCenter(x,y)`;
  `board.render(scene, nowMs)` (3D: chỉ cập nhật vị trí mesh — bàn nằm mặt
  XZ, Y là cao; vẽ cả đồ ĐANG RƠI + bóng đổ thật). `isBlocked` = "ô rắn
  đang chiếm", main PHẢI truyền khi thả (Board chỉ biết tường/táo/bom).
  `isFree` không tính rắn. CHỈ táo/bom ĐÃ CHẠM ĐẤT mới nằm trong
  `foods`/`bombs` — đồ đang rơi nằm trong mảng riêng `board.falling`
  `{type, x, y, t0}`, không tính vào `isFood`/`isBomb`/`isFree`.
  `setScene(scene)` + `dispose()` (xem mục "Khung Three.js").
  - TƯƠNG THÍCH TẠM: board cũ (nv3 @ fa31f3f) chưa có spawn(count)/
    falling/update-object — main.js có adapter (spawnApples/spawnBombs/
    boardUpdate) tự chọn API theo `board.falling` có tồn tại hay không;
    xóa adapter khi nv6 gộp xong.
  - Board snapshot config lúc new (copy) — main đẩy `thoiGianBom`/
    `soBomToiDa`/`soTaoToiDa`/`soTaoToiDaTrenBan`/`thoiGianRoi`/`choRoi`
    mới vào `board.config` sau mỗi applyConfig.
- `window.effects.init({cellSize, cols, rows, originX, originY, applePoints})`
  — PHẢI gọi sau khi biết layout bàn (và gọi lại khi đổi bàn/điểm);
  `effects.eat(x,y,points)/explode(x,y)/die()/spawn(x,y)/land(x,y,type)`
  (tọa độ ô lưới; type `'apple'`|`'bomb'`),
  `update(dt)` (dt tính bằng GIÂY), `render(scene)` (3D: chỉ cập nhật vị trí
  hạt). `setScene(scene)` (nếu có). main gọi `land()` cho
  mỗi item trong `landed` sau mỗi `board.update()` (Board tự vẽ đồ rơi +
  bóng; main KHÔNG gọi `effects.spawn` cho quà nữa vì không biết vị trí
  từng trái trong cơn mưa). Bom hết hạn cũng bắn `land()` `'bomb'` (poof
  nhỏ, RAN-QA gộp 2026-11-11).

## Lưu ý kiểm chứng

- Demo 5 phút: rắn di chuyển mượt, ăn táo lớn lên, không đơ, không chết
  vô cớ, hồi sinh đúng sau 3s, bom hết hạn biến mất, quà giả lập rớt đúng
  táo/bom (rơi từ trên cao, chạm đất mới tính, số lượng theo xu). 0 console error.
- Quà 100 xu → rớt đúng 10 trái (theo bậc); quà 5000 xu → đúng 30 trái
  (chặn ở trần 30); quà không kèm xu → 1 trái.
- Đổi màu/tốc độ qua admin ăn ngay (không cần load lại trang); đổi
  `kichThuocBan` thì dựng lại bàn + rắn.
- Trường hợp biên (để nv6 kiểm): rắn hồi sinh ngay trên ô có bom (bom cũ
  chưa hết hạn) có thể chết ngay tick đầu — xác suất thấp, AI tránh bom
  nên chỉ chết khi đầu hồi sinh đúng ô bom.
- Chưa test live TikTok/OBS/điện thoại thật.
