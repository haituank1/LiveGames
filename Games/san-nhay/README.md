# Sàn Nhảy Quẩy Max – game tương tác TikTok LIVE

Game thứ ba của dự án, dùng chung **LiveBridge** với game chùa và game đám cưới (không cần sửa LiveBridge).

| Trang | Địa chỉ |
|---|---|
| Chạy qua LiveBridge | http://localhost:8787/Games/san-nhay/ |
| Chạy demo (không cần TikTok) | http://localhost:8787/Games/san-nhay/?demo=1 |
| Giả lập tặng quà | http://localhost:8787/LiveBridge/public/simulator.html?game=san-nhay |
| Đổi cảnh để xem thử | thêm `&venue=beach` hoặc `&venue=snow` vào link demo |

Đưa lên OBS / TikTok LIVE Studio: thêm nguồn Browser với URL trên, kích thước **1080×1920** (khung dọc 9:16).

## Cách chơi (v1)

- **Ai vào cũng thành dancer:** người xem vào phòng, bình luận, thả tim hay tặng quà đều xuất hiện
  trên sàn nhảy với tên + avatar, nhảy liên tục, thỉnh thoảng bật bong bóng thoại hài.
  Tối đa 60 dancer trên sàn.
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
  dãy 12 phím ← ↑ ↓ → chạy ở thanh dưới, mỗi nhịp chấm **PERFECT / GREAT / COOL / MISS**,
  có **COMBO** và banner **FINISH** tổng điểm cuối lượt (~20 giây/lượt).
  Khán giả giúp dancer ăn điểm bằng cách bình luận đúng phím: `trái / lên / xuống / phải` hoặc emoji ←↑↓→.
- **Party Energy:** thanh năng lượng góc trên-trái tăng theo tim / bình luận / quà.
  Đầy 100% → **PARTY MAX** 10 giây: cả sàn nhảy nhanh gấp đôi, tia sáng quét, mưa tiền + pháo giấy.
- **Quà theo mốc xu:** 1+ pháo giấy/tim tại dancer · 10+ **nổ hũ vàng** văng xu và tiền ·
  99+ **đổ bộ**: dancer được nâng lớp Đại Gia, lên bục giữa với **cánh + hào quang**, pháo hoa và banner vinh danh.
- **Bảng vàng (lưu trong trình duyệt):** điểm quà xếp hạng tuần — hạng 1 **Chủ Tịch Sàn** (đội vương miện,
  nhân vật to hơn, có hào quang), hạng 2 **Phó Chủ Tịch**, hạng 3 **Thư Ký**; hiện top 5 góc trên-phải.
- **Đổi cảnh sàn** theo **tổng lượt view tích lũy** (lưu trình duyệt): 0 = Sàn Neon,
  1.500 = Sàn Bãi Biển, 4.000 = Sàn Tuyết.
- **Nhạc:** tự tạo nhịp disco 116 BPM + hiệu ứng (đúng nhịp, nổ hũ, pháo hoa, ăn mừng) bằng WebAudio.
  Muốn dùng nhạc thật: thả file nhạc vào thư mục `audio/` của game.

## Ghi chú kỹ thuật

- Nhân vật là **ảnh chibi nền trong suốt tự tạo** trong `img/` (6 lớp), gắn bởi `js/dancers.js`;
  điệu nhảy là animation CSS theo class `.d-<lớp>` trong `index.html`. Muốn thêm lớp mới:
  thêm ảnh vào `img/`, khai báo trong `CLASSES` ở `js/dancers.js` và một `@keyframes` mới.
- Ô sàn, bục solo, bong bóng thoại: `js/dancers.js`. Hiệu ứng canvas (pháo hoa, mưa tiền, nổ hũ): `js/effects.js`.
  Lượt solo, Party Energy, bảng vàng, đổi cảnh: `js/main.js`. Câu hướng dẫn + thoại hài sửa trong
  `LiveBridge/config/mappings/san-nhay.json` mục `defaults` (`guideLines`, `funnyLines`).
- Trạng thái kiểm chứng: đã test bản demo bằng trình duyệt headless thật (đám đông, lượt solo,
  Party Max, nổ hũ, đổ bộ quà lớn) — ảnh chụp ở thư mục kiểm chứng của dự án.
  Quà TikTok thật vẫn cần kiểm chứng khi live thật (LiveBridge chưa từng nhận quà thật — giống hai game trước).
