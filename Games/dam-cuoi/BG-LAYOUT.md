# KHUNG BỐ CỤC cho background Đám Cưới Online

Game hỗ trợ **khung riêng theo từng file nền** trong `js/people.js`
(`TABLE_FRAMES` + `P.setBgFile`). Sáu nền cũ dùng chung hồ sơ `mac-dinh` bên
dưới. Nếu một nền mới thay đổi vị trí sân khấu/bàn/sàn thì **không ép tranh vẽ
giống hệt nền cũ**: phải đo lại bằng lưới tọa độ %, thêm một hồ sơ khung riêng
cho đúng tên file, kiểm phủ ellipse/ghế lên tranh và chạy test vị trí trước khi
đưa vào mốc. Chỉ khi hình học thật sự trùng khớp mới được dùng chung hồ sơ.

## Khung hình

- Ảnh tỉ lệ **rộng : cao = 0.818** (bản chuẩn 1440×1760), vẽ trọn CẢ PHÒNG
  trong 1 tấm: sân khấu + sàn + thảm + bàn đều nằm trong ảnh.
- Màn hình điện thoại chỉ là "cửa sổ" di chuyển bên trong ảnh này (camera).

## Các mốc theo % chiều cao ảnh (y)

| Phần tử | Vị trí |
|---|---|
| Sân khấu (vòm hoa, bánh cưới) | giữa, x = 50%, phần trên ảnh |
| **Đường đứng làm lễ trên bục** | **y = 37.2%** (chân cặp đôi chạm đúng đây) |
| Mép trước bục sân khấu | y ≈ 42% |
| Sàn tiệc bắt đầu | y = 44% |
| Lối đi thảm đỏ giữa | x từ 43% → 57%, chạy từ bậc thang xuống đáy ảnh |

## Khung sân khấu / khán đài (đã cài trong js/people.js — STAGE_FRAME)

| Phần tử | Vị trí chuẩn |
|---|---|
| Mặt bục | y từ ≈32% (sát vòm hoa) tới ≈42% (mép trước bục) |
| Đường đứng làm lễ | y = 37.2% |
| 1 vị trí duy nhất ở giữa | tâm x = **50%**; trong cặp 2 người cách nhau 3.4–3.6% (xích gần) |
| Vùng được phép đứng | x từ 34% → 66%, không thấp quá đường lễ +1.6% |

Vùng CẤM đứng (phải vẽ trống, nhân vật không bao giờ đặt chân vào):

- **Bánh cưới:** x 45–55%, y ≤ 35% (cặp giữa đứng TRƯỚC bánh, không đè lên).
- **2 cột vòm hoa:** x 26–33% và 67–74% ở ngang mặt bục.
- **Bậc thang giữa:** x 40–60%, y 42–46% — chỉ đi qua khi lên/xuống, không đứng lại.

## Bàn tiệc — 42 bàn, ellipse theo hàng (tâm y, bán kính rx × ry, các tâm x)

ĐO TRỰC TIẾP trên tranh bằng lưới tọa độ % (2026-11-04), CẢ 6 nền dùng chung
khung này (đã phủ lưới kiểm từng nền: hình học lệch nhau không quá ±0.5%).
Khung cũ 54 bàn/7 hàng là ước lượng và SAI: có bàn "ma" ở cột giữa các hàng
dưới (trên tranh là sàn đá/thảm) và lệch tâm tới ~3% ở nhiều bàn thật — ghế
vòng quanh bàn ma rơi đúng lên mặt bàn thật, đó là gốc của lỗi "đứng trên bàn".

| Hàng y% | rx% | ry% | Tâm x% |
|---|---|---|---|
| 42.8 | 2.6 | 1.4 | 16.5, 23.5, 30.5, 35.5 · 64.5, 69.5, 76.5, 83.5 |
| 46.3 | 3.0 | 1.6 | 12.3, 20.5, 28.5 · 71.5, 79.5, 87.7 |
| 50.3 | 3.5 | 1.9 | 9.3, 18.8, 28.3 · 71.7, 81.2, 90.7 |
| 54.5 | 4.0 | 2.2 | 4.8, 15.8, 26.3 · 73.7, 84.2, 95.2 |
| 59.8 | 4.6 | 2.6 | 0.8, 11.8, 24.3 · 75.7, 88.2, 99.2 |
| 67.8 | 5.3 | 3.0 | 5.8, 21 · 79, 94.2 |
| 78 | 6.1 | 3.5 | 1.5, 16.5 · 83.5, 98.5 |
| 92.3 | 7.0 | 4.0 | 8.3 · 91.7 |

Bàn tròn phủ khăn, tâm có hoa trang trí. Bàn xa nhỏ, bàn gần to (phối cảnh như
bảng). Bàn ở mép (x 0.8/99.2, 1.5/98.5) bị cắt nửa ngoài khung — vẫn phải có
mặt trong bảng để chặn đường đi và tính ghế.

## Hồ sơ riêng: `bg-sanh-moi.webp` — sảnh vàng mẫu mới (ĐÃ GÁN: mốc 200)

Chủ phòng chốt 2026-11-04: sảnh này là nền của mốc cao nhất **200 — Đám
Cưới Hoàng Gia** (bgRules ở mapping + demo đều trỏ về `bg-sanh-moi.webp`;
file `bg-20000.webp` cũ đã xóa khỏi repo). Từ 2026-11-05 (M14b): TIERS
không hardcode trong main.js nữa mà được xây từ `bgRules` lúc nhận config
— mỗi mục bgRules `{viewers, file, label, royal}` cho ra 1 mốc (label =
tên mốc, royal 0 = thường / 1 = vàng / 2 = hoàng gia); mốc 0 (sảnh mặc
định `bg-full.webp`) tự thêm nếu bgRules không có; bgRules thiếu/rỗng thì
game giữ bộ mốc mặc định cũ.

Đã đo trực tiếp trên tranh 1440×1760 bằng lưới tọa độ % và kiểm phủ
ellipse + điểm ghế. Đây là bố cục khác nền cũ nên có khung riêng:

| Phần tử | Vị trí |
|---|---|
| Đường đứng làm lễ | **y = 42.6%** |
| Mặt bục tròn | khoảng y 40.5–43.5%; bậc thang giữa y 44–50% |
| Sàn tiệc bắt đầu | **y = 50%** (`floorY`) |
| Trần ghế quanh bàn | **y = 47.5%** (`seatTop`) |
| Góc máy toàn cảnh | tâm (50%, 40%), zoom 0.63 |
| Góc máy sân khấu | tâm (50%, 41%), zoom 1.02 |

Bàn của sảnh mới — 28 bàn, ellipse theo hàng:

| Hàng y% | rx% | ry% | Tâm x% |
|---|---|---|---|
| 48.5 | 3.6 | 1.6 | 2.5, 13 · 76, 87, 97.5 |
| 50.3 | 3.7 | 1.7 | 24, 32.5 · 67.5 |
| 53 | 4.3 | 1.9 | 6, 17.5, 28 · 72, 82.5, 94 |
| 61.5 | 5.0 | 2.2 | 3, 15, 26.5 · 73.5, 85, 97 |
| 69.5 | 5.5 | 2.6 | 11, 24 · 76, 89 |
| 78 | 6.4 | 3.0 | 8 · 92 |
| 90 | 7.5 | 3.5 | 11 · 89 |

Kết quả test tự động trên nền mới: 90 người vào phòng, 88 người đã yên vị khi
chụp kết quả, 0 cặp đứng gần như trùng, 0/40 vòng lấy mẫu có chân trong ellipse
bàn; cặp đôi lên được sân khấu và chân ở y = 42.6–43.1%.

## Vùng cấm đứng — bậc thang (keepClear, theo yêu cầu chủ phòng 2026-11-04)

Mỗi hồ sơ khung có thêm `keepClear`: các ellipse mà nhân vật chỉ ĐI QUA, tuyệt
đối không được cấp vị trí đứng (cả ghế quanh bàn lẫn điểm đứng tự do đều bị
loại nếu rơi vào). Khách trước đây hay đứng sát bậc thang trông rất vướng.

- `mac-dinh`: ellipse tâm (50, 44), rx 11, ry 2.6 — bậc thang giữa của sảnh cũ.
- `bg-sanh-moi.webp`: ellipse tâm (50, 44), rx 40, ry 6.5 — phủ toàn bộ vòng
  bậc thang của bục tròn + thang đỏ giữa của sảnh mới.

Kiểm chứng: cấp 260 vị trí ở mỗi khung — 0 vị trí trên bàn, 0 vị trí trong
vùng bậc thang; ảnh trong game cho thấy khách đứng trên sàn đá hai bên, bậc
thang và thảm đỏ trống hoàn toàn.

## Luật đứng của nhân vật (đã cài trong js/people.js — TABLE_FRAMES / inTable)

- Ghế quanh bàn: chân đứng NGOÀI ellipse mặt bàn, cộng lề an toàn 1.7% ngang /
  1.3% dọc; ghế nào rơi vào ellipse của **chính bàn đó** hoặc bàn bên cạnh thì
  tự loại.
- Điểm đứng tự do: né mọi ellipse phồng thêm 1.8% / 1.4%.
- Khi đổi nền giữa phiên, `P.setBgFile` dựng lại bàn, lưới tìm đường và pool vị
  trí theo đúng hồ sơ của file đang hiển thị; vị trí thuộc khung cũ không được
  tái sử dụng. Người đang đứng lọt vào bàn theo khung mới sẽ được dời đi.

## Bổ sung 2026-11-04 (theo yêu cầu chủ phòng): thảm đỏ giữa + thứ tự cấp chỗ

- **Thảm đỏ giữa là vùng CẤM ĐỨNG** (cả 2 khung): `frame.aisle = { y0, hw, slope }`
  trong `js/people.js` — nửa bề rộng thảm ở độ cao y là `hw + (y − y0) × slope`
  (mở rộng dần xuống dưới theo phối cảnh; khung mặc định y0=43, hw=7.5,
  slope=0.13 — khớp dải 43→57% ở trên; sảnh mới y0=46, hw=8.5, slope=0.10).
  Ghế và điểm đứng rơi vào thảm đều bị loại khi dựng pool; người đang đứng
  lọt vào thảm khi đổi nền cũng bị dời đi. Thảm chỉ để ĐI QUA (lưới tìm
  đường không cấm).
- **Thứ tự cấp chỗ**: theo khoảng cách tới điểm ngay dưới sân khấu
  (trọng số dọc ×1.5); ghế quanh bàn chỉ hơn điểm đứng tự do +5, jitter
  0..3. Hệ quả: vùng trọng tâm hai bên thảm + gần sảnh cưới đầy trước,
  phòng đông mới tràn xuống dưới/xa. Chỗ "trọng tâm" khi phòng vắng
  (`takeCentralPosition`) cũng là 2 điểm hai bên thảm ngay dưới sân khấu.
