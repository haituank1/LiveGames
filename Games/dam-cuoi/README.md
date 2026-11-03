# Đám Cưới Online – game tương tác TikTok LIVE

Game thứ hai của dự án, dùng chung **LiveBridge** với game chùa (không cần sửa LiveBridge).

| Trang | Địa chỉ |
|---|---|
| Chạy qua LiveBridge | http://localhost:8787/Games/dam-cuoi/ |
| Chạy demo (không cần TikTok) | http://localhost:8787/Games/dam-cuoi/?demo=1 |
| Giả lập tặng quà | http://localhost:8787/LiveBridge/public/simulator.html?game=dam-cuoi |

Đưa lên OBS / TikTok LIVE Studio: thêm nguồn Browser với URL trên, kích thước **1080×1920** (khung dọc 9:16).

## Cách chơi (v3 — bố cục sảnh tiệc lớn)

- **Sảnh tiệc kiểu ballroom:** sân khấu vòm hoa + bánh cưới ở trên cùng, **thảm đỏ dài ở giữa**,
  hai bên là **hai dãy bàn tiệc**. Ai vào phòng cũng được xếp một **ghế quanh bàn tiệc** và đứng
  tại bàn của mình (thỉnh thoảng đổi bàn cho sinh động). Khi chưa kết duyên, nhân vật mặc đồ đời
  thường hài hước ngẫu nhiên: áo thun quần đùi, pijama chấm bi, áo Hawaii đeo kính râm, ba lỗ đội
  mũ ngược, váy hoa ở nhà, đồ thể thao cầm trà sữa...
- **Tag là cưới:** người xem bình luận `@tên người thương` → người bình luận và người được tag
  (không cần đang xem) **"lên đồ" ngay tại chỗ**: một người thành chú rể veston lịch lãm, một người
  thành cô dâu váy cưới lộng lẫy, rồi cả hai ra thảm đỏ, **đi dọc thảm đỏ lên sân khấu** trong
  banner "💍 LỄ THÀNH HÔN". Sân khấu có 3 vị trí (giữa là tâm điểm, nhân vật trên sân khấu được
  phóng to), cặp sau xếp hàng chờ (bảng dưới-trái). Hết giờ, cặp đôi đi thảm đỏ về **hai ghế cạnh
  nhau cùng một bàn**.
- **MC Anh Tú:** dẫn chương trình như MC đám cưới thật: giới thiệu cặp đôi lên sân khấu, cảm ơn quà,
  chào khách mới, chúc mừng khi sảnh nâng cấp, xen kẽ câu ý nghĩa và câu hài. Câu chữ sửa trong
  `LiveBridge/config/mappings/dam-cuoi.json` mục `defaults` (mcLines, mcFunny, mcCouple...).
- **Điểm hạnh phúc & vương miện:** cặp đôi lên sân khấu được +30 điểm; khi đang ở trên sân khấu,
  quà khán giả tặng cộng **+50 điểm mỗi xu** cho cặp tâm điểm (hoặc cặp của chính người tặng nếu họ
  đã có đôi). Top 5 hiện ở bảng "💞 Cặp đôi được yêu thích", cặp dẫn đầu **cả hai cùng đội 👑**.
  Điểm lưu trong trình duyệt.
- **Follow** → MC se duyên: người follow được ghép đôi ngẫu nhiên với một khách đang độc thân.
- **Đủ 50 tim** (like) → tất cả nhân vật trong khuôn viên nhảy mừng.
- **Quà càng lớn, hiệu ứng càng to:** mưa hoa theo mốc xu, thêm giấy màu từ 10 xu, pháo hoa từ 30 xu,
  pháo hoa lớn + lóe sáng từ 99 xu. Gõ "pháo hoa" / "hoa rơi" trong bình luận cũng có hiệu ứng.
- **Nhạc nền:** game tự tạo nhạc lãng mạn + chuông cưới bằng WebAudio. Muốn dùng nhạc thật: thả file
  nhạc (mp3/ogg/wav/m4a) vào thư mục `audio/` của game, game tự phát thay nhạc tự tạo.

## Sảnh nâng cấp theo TỔNG LƯỢT VIEW tích lũy

Không tính mắt xem cùng lúc (khó đạt) — game đếm **tổng lượt view**: mỗi người xem mới (vào phòng,
bình luận, tặng quà, follow...) tính 1 lượt, **cộng dồn qua mọi phiên live** và lưu trong trình
duyệt (localStorage). Sân khấu chiếm nửa trên khung hình, khuôn viên rộng ở nửa dưới.

| Tổng lượt view | Mốc | Khác biệt |
|---|---|---|
| 0 | Lễ Ấm Áp | Nền `bg.webp` (sảnh tiệc lớn) |
| 500 | Hoa Khai | Nền `bg.webp` |
| 2.000 | Kim Tuyến | Nền `bg.webp` |
| 5.000 | Lung Linh | Nền `bg-3.webp` (sảnh hoàng gia) |
| 10.000 | Đại Tiệc Vàng | Nền `bg-3.webp` + tia sáng sân khấu xoay |
| 20.000 | Đám Cưới Hoàng Gia | Thêm hào quang vàng + pháo hoa chúc mừng định kỳ |

Thanh tiến trình góc trên-trái luôn hiện tổng lượt view và còn bao nhiêu lượt nữa lên mốc tiếp theo.
Muốn đặt lại từ đầu: xóa localStorage khóa `damcuoi.totalviews` trong trình duyệt (hoặc mở game
bằng trình duyệt khác).

## Ghi chú kỹ thuật

- Nhân vật là SVG vẽ trong `js/people.js` (vẽ 1 lần, hoạt ảnh chân tay bằng CSS, di chuyển bằng rAF),
  tối đa 110 nhân vật trên sân cùng lúc.
- Bố cục từng nền (vị trí bàn tiệc để xếp ghế + điểm thảm đỏ chạm sân khấu) nằm trong `FILE_LAYOUT`
  và điểm neo sàn sân khấu trong `FILE_ANCHOR` ở js/main.js — đổi nền phải đo lại hai thông số này.
- Banner nghi thức (lễ thành hôn / nâng cấp sảnh / mừng cưới lớn) là hàm `showBanner` trong js/main.js.
- Trạng thái kiểm chứng: đã test bản demo bằng môi trường giả lập + chụp ảnh thật từ trình duyệt
  headless (khách đi dạo, cặp đôi lên sân khấu, các mốc sảnh). Quà TikTok thật vẫn cần kiểm chứng
  khi live thật (LiveBridge chưa từng nhận quà thật — giống game chùa).
