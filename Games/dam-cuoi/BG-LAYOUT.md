# KHUNG BỐ CỤC CỐ ĐỊNH cho background Đám Cưới Online

Mọi background mới (mốc hoàng gia, sự kiện...) PHẢI vẽ đúng khung này — chỉ thay
màu sắc, chất liệu, cảnh quan. Không đổi vị trí/kích thước các phần tử, để nhân
vật trong game luôn khớp tranh và KHÔNG BAO GIỜ đứng lên mặt bàn.

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
| 3 vị trí cặp đôi | tâm x = **42% · 50% · 58%**; trong cặp 2 người cách nhau 3.4–3.6% (xích gần), cặp giữa to 1.18×, hai bên 0.95× và thấp hơn 0.55% |
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

## Luật đứng của nhân vật (đã cài trong js/people.js — TABLE_ROWS / inTable)

- Ghế quanh bàn: chân đứng NGOÀI ellipse mặt bàn, cộng lề an toàn 1.7% ngang /
  1.3% dọc; ghế nào rơi vào ellipse bàn bên cạnh thì tự loại.
- Điểm đứng tự do: né mọi ellipse phồng thêm 1.8% / 1.4%.
- Vẽ bg mới chỉ cần giữ đúng bảng trên; code không phải chỉnh lại.
