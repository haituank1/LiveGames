# Sàn Nhảy Quẩy Max – game tương tác TikTok LIVE

Game thứ ba của dự án, dùng chung **LiveBridge** với game chùa và game đám cưới (không cần sửa LiveBridge).

| Trang | Địa chỉ |
|---|---|
| Chạy qua LiveBridge | http://localhost:8787/Games/san-nhay/ |
| Chạy demo (không cần TikTok) | http://localhost:8787/Games/san-nhay/?demo=1 |
| Giả lập tặng quà | http://localhost:8787/LiveBridge/public/simulator.html?game=san-nhay |
| Đổi cảnh để xem thử | thêm `&venue=beach` hoặc `&venue=snow` vào link demo |

Đưa lên OBS / TikTok LIVE Studio: thêm nguồn Browser với URL trên, kích thước **1080×1920** (khung dọc 9:16).

## Cách chơi (v2 — sát video mẫu)

- **Ai vào cũng thành dancer:** người xem vào phòng, bình luận, thả tim hay tặng quà đều xuất hiện
  trên sàn nhảy với tên + avatar, nhảy liên tục, thỉnh thoảng bật bong bóng thoại hài.
  Sàn CHẬT kiểu video: 7 hàng × 14 ô so le, hàng trước to hơn và chồng nhẹ lên hàng sau —
  demo ~96 dancer, tối đa 120 dancer trên sàn.
- **6 lớp nhân vật** — mỗi lớp một ảnh chibi riêng trong `img/`, một điệu nhảy và một màu hiệu ứng riêng:

  | Lớp | Phong cách | Điệu nhảy |
  |---|---|---|
  | Đại Gia (`dai-gia`) | vest đen, kính râm, dây chuyền vàng — hiếm (tỉ lệ thấp), quà ≥99 xu được nâng lên lớp này | lắc lư điềm đạm, ngầu |
  | Idol (`idol`) | đồ neon hồng/tím kiểu K-pop | vẫy tay, xoay người |
  | DJ (`dj`) | hoodie + tai nghe | nhún mạnh theo nhịp, gật đầu |
  | Dân Quẩy (`quay-hai`) | ba lỗ, mũ ngược, dép lê | lắc hông vinahouse |
  | Mascot Vịt (`mascot`) | bộ vịt vàng bông | lắc mông chậm, gây cười |
  | Tân Binh (`tan-binh`) | pijama chấm bi + trà sữa | nhảy vụng về, dễ thương |

- **Solo AU lên bục giữa:** dancer lên bục theo vòng (gõ `solo` / `lên bục` để được ưu tiên),
  dãy 12 phím ← ↑ ↓ → chạy ở thanh AU dưới (ô phím to), mỗi nhịp chấm **PERFECT / GREAT / COOL / BAD / MISS**,
  có **COMBO**, **bảng chấm điểm dọc bên phải** đếm từng loại theo thời gian thực và banner
  **FINISH** tổng điểm + thống kê P/G/C/B/M cuối lượt (~20 giây/lượt).
  Khán giả giúp dancer ăn điểm bằng cách bình luận đúng phím: `trái / lên / xuống / phải` hoặc emoji ←↑↓→.
- **Nhảy đôi:** bình luận `nhảy đôi` (hoặc `nhảy đôi` + tag tên bạn nhảy) → hai dancer ra điểm sáng
  giữa sàn nhảy đôi ~20 giây, tim bay, có banner giới thiệu cặp.
- **Party Energy:** thanh năng lượng góc trên-trái tăng theo tim / bình luận / quà.
  Đầy 100% → **PARTY MAX** 10 giây: chữ lớn **CẢ SÀN CÙNG QUẨY** hiện giữa màn hình, cả sàn nhảy nhanh,
  tia sáng quét, mưa tiền dày + pháo giấy, đèn sàn nháy theo phách nhạc 116 BPM.
- **Quà theo mốc xu:** 1+ pháo giấy/tim tại dancer · 10+ **nổ hũ vàng** văng xu và tiền ·
  99+ **đổ bộ**: dancer được nâng lớp Đại Gia, lên bục giữa với **cánh + hào quang**, pháo hoa và banner vinh danh ·
  299+ **trực thăng VIP**: trực thăng vàng bay ngang thả VIP xuống bục, banner "VIP … đáp xuống sàn nhảy".
- **Lên cấp:** dancer nhận XP từ quà / điểm solo / nhảy đôi; đủ XP thì banner **LÊN CẤP n** + pháo tia tại dancer.
- **Bảng vàng tuần (lưu trong trình duyệt):** thanh vàng trang trọng chạy ngang trên cùng —
  3 ô **Chủ Tịch / Phó Chủ Tịch / Thư Ký** hiện ảnh lớp + tên + tổng 💎 trong tuần (ghi chú "Reset sau 6 ngày"),
  hạng 4–5 ở dòng nhỏ bên dưới. **Top 3 đồng thời đứng LỚN trên sân khấu nền** và nhảy tại chỗ
  (Chủ Tịch đứng giữa, đội vương miện); rớt khỏi top 3 thì về sàn.
- **Đổi cảnh sàn** theo **tổng lượt view tích lũy** (lưu trình duyệt): 0 = Sàn Neon,
  1.500 = Sàn Bãi Biển, 4.000 = Sàn Tuyết. Cả 3 cảnh là **nền minh họa vẽ riêng** (`bg.webp`,
  `bg-beach.webp`, `bg-snow.webp`, 1152×2048): sân khấu ở nửa trên, sàn nhảy rộng ở nửa dưới.
- **Nhạc:** tự tạo nhịp disco 116 BPM + hiệu ứng (đúng nhịp, nổ hũ, pháo hoa, ăn mừng) bằng WebAudio.
  Muốn dùng nhạc thật: thả file nhạc vào thư mục `audio/` của game.

## Ghi chú kỹ thuật

- Nhân vật là **ảnh chibi nền trong suốt tự tạo** trong `img/` (6 lớp + `heli.png` trực thăng VIP),
  gắn bởi `js/dancers.js`; điệu nhảy là animation CSS theo class `.d-<lớp>` trong `index.html`. Muốn thêm lớp mới:
  thêm ảnh vào `img/`, khai báo trong `CLASSES` ở `js/dancers.js` và một `@keyframes` mới.
- Ô sàn, sân khấu top 3, bục solo, nhảy đôi, bong bóng thoại: `js/dancers.js`.
  Hiệu ứng canvas (pháo hoa, mưa tiền, nổ hũ): `js/effects.js`.
  Lượt solo, tally, Party Energy, bảng vàng + sân khấu, nhảy đôi, VIP, lên cấp, đổi cảnh: `js/main.js`.
  `audio.js` gọi `Party.onBeat` mỗi phách để main nháy đèn sàn. Câu hướng dẫn + thoại hài sửa trong
  `LiveBridge/config/mappings/san-nhay.json` mục `defaults` (`guideLines`, `funnyLines`, `pairSec`, `soloSec`).
  Hướng dẫn trong game là **một dòng ngắn xoay vòng ở góc trái dưới**, trên thanh AU.
- Trạng thái kiểm chứng v2: đã test bản demo bằng Chromium headless thật (sàn 96 dancer + bảng vàng +
  top 3 trên sân khấu, solo + tally đếm, nhảy đôi, trực thăng VIP, Party Max, cảnh bãi biển) —
  ảnh chụp ở `~/workspace/your_files/san-nhay-v2/`. Quà TikTok thật vẫn cần kiểm chứng khi live thật
  (LiveBridge chưa từng nhận quà thật — giống hai game trước).
