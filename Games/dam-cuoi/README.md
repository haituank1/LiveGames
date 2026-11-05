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
  banner "💍 LỄ THÀNH HÔN". Sân khấu chỉ có 1 vị trí giữa duy nhất (tâm điểm, nhân vật trên sân khấu được
  phóng to), cặp sau xếp hàng chờ (bảng dưới-trái). Hết giờ, cặp đôi đi thảm đỏ về **hai ghế cạnh
  nhau cùng một bàn**. Hàng chờ chia 4 làn ưu tiên: quà → tag tên → ngẫu nhiên → NPC; trong làn quà
  thì món quà lớn nhất (1 lần tặng) lên trước. Để làn thấp không bị đói khi quà dồn dập, cặp
  random/NPC chờ quá **30 giây** được bóc lên trước cả cặp quà — ngưỡng này chỉnh được bằng config
  `choDoiLanThapGiay` (giây, 0 = tắt; mặc định 30).
- **MC Anh Tú:** dẫn chương trình như MC đám cưới thật: giới thiệu cặp đôi lên sân khấu, cảm ơn quà,
  chào khách mới, chúc mừng khi sảnh nâng cấp, xen kẽ câu ý nghĩa và câu hài. Câu chữ sửa trong
  `LiveBridge/config/mappings/dam-cuoi.json` mục `defaults` (mcLines, mcFunny, mcCouple...).
- **Điểm hạnh phúc & vương miện:** cặp đôi lên sân khấu được +30 điểm; khi đang ở trên sân khấu,
  quà khán giả tặng cộng **+50 điểm mỗi xu** cho cặp của chính người tặng (người tặng chưa có đôi
  thì cộng cho cặp đang diễn trên sân khấu). Top 3 hiện ở bảng "💞 Cặp đôi được yêu thích", cặp dẫn đầu **cả hai cùng đội 👑**.
  Điểm lưu trong trình duyệt.
- **Follow** → MC se duyên: người follow được ghép đôi ngẫu nhiên với một khách đang độc thân.
- **Đủ 50 tim/người** (like) → tất cả nhân vật trong khuôn viên nhảy mừng. Người chỉ thả tim cũng có
  nhân vật vào sảnh (thả tim tính là vào dự).
- **Quà càng lớn, hiệu ứng càng to:** mọi món quà đều bắn cả 3 loại cùng lúc (mưa hoa + pháo hoa +
  pháo giấy), số lượng theo mốc xu — quà nhỏ 1, từ 99 xu 5, từ 299 xu 10 hiệu ứng mỗi loại; thêm
  kim tuyến từ 10 xu, mưa phong bì đỏ từ 30 xu, pháo giấy đại lễ + lóe sáng + banner mừng cưới từ
  99 xu. Gõ "pháo hoa" / "hoa rơi" trong bình luận cũng có hiệu ứng.
- **Nhạc nền:** game tự tạo nhạc lãng mạn + chuông cưới bằng WebAudio. Muốn dùng nhạc thật: thả file
  nhạc (mp3/ogg/wav/m4a) vào thư mục `audio/` của game, game tự phát thay nhạc tự tạo.

## Sảnh nâng cấp theo TỔNG LƯỢT VIEW tích lũy

Không tính mắt xem cùng lúc (khó đạt) — game đếm **tổng lượt view**: mỗi người xem mới (vào phòng,
thả tim, bình luận, tặng quà, follow...) tính 1 lượt, **cộng dồn qua mọi phiên live** và lưu trong trình
duyệt (localStorage). Sân khấu chiếm nửa trên khung hình, khuôn viên rộng ở nửa dưới.

| Tổng lượt view | Mốc | Khác biệt |
|---|---|---|
| 0 | Lễ Ấm Áp | Nền `bg-full.webp` (sảnh tiệc lớn) |
| 10 | Hoa Khai | Nền `bg-500.webp` + bướm phát sáng |
| 30 | Kim Tuyến | Nền `bg-2000.webp` |
| 50 | Lung Linh | Nền `bg-5000.webp` + tia sáng sân khấu, bokeh, đèn lồng |
| 100 | Đại Tiệc Vàng | Nền `bg-10000.webp` + sao băng, cặp lên bục đội vương miện |
| 200 | Đám Cưới Hoàng Gia | Nền `bg-sanh-moi.webp` + hào quang vàng + pháo hoa chúc mừng định kỳ |

Thanh tiến trình góc trên-trái luôn hiện tổng lượt view và còn bao nhiêu lượt nữa lên mốc tiếp theo.
Muốn đặt lại từ đầu: xóa localStorage khóa `damcuoi.totalviews` trong trình duyệt (hoặc mở game
bằng trình duyệt khác).

> **Một nguồn sự thật (2026-11-05):** bảng mốc trên là bộ mặc định. Game xây danh sách mốc
> (TIERS) từ `bgRules` trong `LiveBridge/config/mappings/dam-cuoi.json` lúc nhận config — mỗi mục
> `{viewers, file, label, royal}` cho ra 1 mốc (`label` = tên mốc, `royal` 0 = thường / 1 = vàng /
> 2 = hoàng gia). Sửa/thêm/bớt/đổi thứ tự mốc trong trang quản trị (mục "🌸 Nền sảnh theo tổng lượt
> xem") là game áp theo; `bgRules` thiếu/rỗng thì game giữ bộ mặc định trên.

## Ghi chú kỹ thuật

- Nhân vật là **ảnh chibi nền trong suốt** trong thư mục `img/` (`bride.png`, `groom.png`,
  `guest-girl.png`, `guest-boy.png`) do `js/people.js` gắn vào, hoạt ảnh nhún/lắc bằng CSS khi đi,
  khoảng 335–360 vị trí đứng trong sảnh (ghế quanh bàn + điểm đứng tự do, tùy khung nền), tối đa từng đó nhân vật
  trên sân cùng lúc. Muốn thêm mẫu khách mới: thả thêm ảnh vào `img/` và
  khai báo trong `CHIBI`/`figHTML` ở js/people.js.
- Bố cục từng nền (vị trí bàn tiệc để xếp ghế + điểm thảm đỏ chạm sân khấu) nằm trong `TABLE_FRAMES`
  ở js/people.js (xem `BG-LAYOUT.md`) — đổi nền phải đo lại và thêm hồ sơ khung riêng cho đúng tên file.
- Banner nghi thức (lễ thành hôn / nâng cấp sảnh / mừng cưới lớn) là hàm `showBanner` trong js/main.js.
- Trạng thái kiểm chứng: đã test bản demo bằng môi trường giả lập + chụp ảnh thật từ trình duyệt
  headless (khách đi dạo, cặp đôi lên sân khấu, các mốc sảnh). Quà TikTok thật vẫn cần kiểm chứng
  khi live thật (LiveBridge chưa từng nhận quà thật — giống game chùa).
