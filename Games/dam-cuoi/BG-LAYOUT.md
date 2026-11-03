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

## Bàn tiệc — 54 bàn, ellipse theo hàng (tâm y, bán kính rx × ry, các tâm x)

| Hàng y% | rx% | ry% | Tâm x% |
|---|---|---|---|
| 45 | 2.8 | 1.6 | 17, 24, 30, 36 · 64, 70, 77, 84 |
| 50 | 3.3 | 1.9 | 14, 22, 29, 36 · 64, 71, 78, 86 |
| 56 | 3.8 | 2.2 | 11, 20, 29, 37 · 63, 71, 80, 89 |
| 63 | 4.3 | 2.5 | 8, 18, 28, 38 · 62, 72, 82, 92 |
| 71 | 4.8 | 2.8 | 6, 16, 27, 38 · 62, 73, 84, 94 |
| 80 | 5.5 | 3.2 | 4, 14, 26, 38 · 62, 74, 86, 96 |
| 90 | 6.3 | 3.7 | 10, 24, 38 · 62, 76, 90 |

Bàn tròn phủ khăn, tâm có hoa trang trí. Bàn xa nhỏ, bàn gần to (phối cảnh như bảng).

## Luật đứng của nhân vật (đã cài trong js/people.js — TABLE_ROWS / inTable)

- Ghế quanh bàn: chân đứng NGOÀI ellipse mặt bàn, cộng lề an toàn 1.7% ngang /
  1.3% dọc; ghế nào rơi vào ellipse bàn bên cạnh thì tự loại.
- Điểm đứng tự do: né mọi ellipse phồng thêm 1.8% / 1.4%.
- Vẽ bg mới chỉ cần giữ đúng bảng trên; code không phải chỉnh lại.
