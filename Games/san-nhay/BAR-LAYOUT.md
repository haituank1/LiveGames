# KHUNG BỐ CỤC CỐ ĐỊNH cho background Sàn Nhảy V4 (bg-bar.webp)

Mọi background thay thế sau này PHẢI vẽ đúng khung này — chỉ thay màu sắc/không khí.
Không đổi vị trí/kích thước các phần tử, để nhân vật trong game luôn khớp tranh và
KHÔNG BAO GIỜ đứng lên cảnh vẽ (bàn DJ, loa, quầy bar, bục...).
Toạ độ tính bằng % kích thước ảnh (gốc trái-trên). Ảnh chuẩn: 1080×2160 (tỉ lệ 0.5).
Các hằng số này được cài trong `js/dancers.js` (LAYOUT) — code đọc từ đó, không rải rác.

## Khung hình

- Ảnh tỉ lệ **rộng : cao = 0.5** (bản chuẩn 1080×2160), vẽ trọn CẢ PHÒNG BAR trong 1 tấm:
  sân khấu DJ + màn LED + sàn nhảy + 2 quầy bar ở tường bên.
- Màn hình điện thoại chỉ là "cửa sổ" di chuyển bên trong ảnh này (camera, xem js/main.js — Cam).
- Sàn nhảy trong tranh **TRỐNG HOÀN TOÀN**: không bàn, không ghế, không sofa trên mặt sàn.

## Các vùng theo % ảnh

| Vùng | x (%) | y (%) | Ghi chú |
|---|---|---|---|
| Giàn đèn / truss | 0–100 | 4–17 | trên cao, chỉ là cảnh |
| Màn LED vẽ sẵn | 19–81 | 19–31 | Màn DOM `#screen` phủ ĐÚNG khung này (left 19.2 / top 19.4 / w 61.6 / h 11.2) |
| Tháp loa trái | 4–16 | 16.5–32 | CẤM ĐỨNG |
| Tháp loa phải | 84–96 | 16.5–32 | CẤM ĐỨNG |
| Bàn DJ (booth) | 30–69 | 30–36.5 | CẤM ĐỨNG — nhân vật không bao giờ lên bàn DJ |
| Mặt gác sân khấu (mezzanine) | 0–100 | 35–39.5 | dải tối dưới booth, CẤM ĐỨNG |
| Tường sau + chùm đèn chiếu sàn | 12–88 | 39.5–53 | sau lưng sàn nhảy, CẤM ĐỨNG |
| Kệ rượu trái (tường) | 0–11 | 40–49 | chỉ là cảnh tường |
| Quầy bar trái | 0–16 | 49–57 | CẤM ĐỨNG (chỉ dọc tường) |
| Kệ rượu phải (tường) | 89–100 | 40–50 | chỉ là cảnh tường |
| Quầy bar phải | 90–100 | 50–55 | CẤM ĐỨNG (chỉ dọc tường) |
| **Bục podium phát sáng** | tâm x = 50, đĩa x 29.5–70.5 | mặt đĩa 54–58.5 | **điểm đứng spotlight: chân tại (50, 56.5)** |
| **Sàn nhảy (vùng đứng DUY NHẤT)** | theo hàng bên dưới | 59–98.5 | mặt sàn bóng phản chiếu, trống |

## Lưới ô đứng trên sàn (chân dancer chạm đúng y của hàng)

9 hàng phối cảnh — hàng càng gần (y lớn) thì dancer càng to (cột "cỡ" = chiều cao dancer / chiều cao thế giới):

| Hàng | y chân (%) | x từ–đến (%) | Số ô | Cỡ (× chiều cao thế giới) |
|---|---|---|---|---|
| R1 | 61.0 | 20–80 | 8 | 0.058 |
| R2 | 65.5 | 17–83 | 9 | 0.064 |
| R3 | 70.0 | 14–86 | 10 | 0.070 |
| R4 | 74.5 | 12–88 | 11 | 0.076 |
| R5 | 79.0 | 10–90 | 11 | 0.082 |
| R6 | 83.5 | 8–92 | 12 | 0.088 |
| R7 | 88.0 | 6–94 | 12 | 0.094 |
| R8 | 92.5 | 5–95 | 13 | 0.100 |
| R9 | 97.0 | 4–96 | 13 | 0.106 |

Tổng 99 ô. Ô được cấp RANDOM khi dancer vào phòng và CỐ ĐỊNH suốt phiên (không xáo trộn
khi người khác vào/ra). Các hàng so le nhẹ (hàng lẻ lệch nửa bước) để đám đông tự nhiên.

## Điểm đặc biệt

| Điểm | Toạ độ | Dùng cho |
|---|---|---|
| Podium | (50, 56.5), cỡ 0.135 | Chủ Tịch bảng vàng / khoảnh khắc spotlight lớn |
| Bục trái | (37, 63), cỡ 0.095 | Top 2 bảng vàng |
| Bục phải | (63, 63), cỡ 0.095 | Top 3 bảng vàng |
| Nhảy đôi A / B | (44.5, 68) / (55.5, 68) | cặp nhảy đôi trước podium |
| Không gian rơi (airspace) | x = x của ô, y từ (y ô − 40) → y ô | dancer MỚI RƠI TỪ TRÊN CAO xuống đúng ô nhà; chỉ là đường rơi, điểm chạm đất luôn là ô trong lưới |

## Luật đứng (đã cài trong js/dancers.js)

- Dancer CHỈ đứng tại: ô sàn (lưới trên), 3 điểm bục, 2 điểm nhảy đôi. Ngoài ra không đứng ở đâu khác.
- Rơi từ trên cao kết thúc đúng chân ô; hiệu ứng rơi không đổi điểm đáp.
- Vẽ bg mới chỉ cần giữ đúng bảng này; code không phải chỉnh lại.
