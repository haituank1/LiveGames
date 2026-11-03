# Đám Cưới Online – game tương tác TikTok LIVE

Game thứ hai của dự án, dùng chung **LiveBridge** với game chùa (không cần sửa LiveBridge).

| Trang | Địa chỉ |
|---|---|
| Chạy qua LiveBridge | http://localhost:8787/Games/dam-cuoi/ |
| Chạy demo (không cần TikTok) | http://localhost:8787/Games/dam-cuoi/?demo=1 |
| Giả lập tặng quà | http://localhost:8787/LiveBridge/public/simulator.html?game=dam-cuoi |

Đưa lên OBS / TikTok LIVE Studio: thêm nguồn Browser với URL trên, kích thước **1080×1920** (khung dọc 9:16).

## Cách chơi

- **Tag là cưới:** người xem bình luận `@tên người thương` → người bình luận và người được tag
  cùng xuất hiện trên sân khấu thành một cặp đôi (người được tag không cần đang xem live).
  Mỗi cặp đứng trên sân khấu ~22 giây (chỉnh `coupleSec` trong file mapping), tối đa 3 cặp cùng lúc,
  các cặp sau xếp hàng chờ (hiện ở góc dưới trái). Hết giờ cặp đôi xuống ngồi bàn tiệc phía dưới.
- **MC** (giống cơ chế "thầy" ở game chùa): hiện lên nói câu vui vẻ / ý nghĩa / hài hước sau mỗi 18–26 giây,
  giới thiệu từng cặp đôi lên sân khấu, cảm ơn người tặng quà và follow, thông báo khi sảnh nâng cấp.
  Hàng chờ ưu tiên: nâng cấp sảnh > follow > cảm ơn quà > giới thiệu cặp đôi > chào khách mới.
- **Quà tặng:** hoa rơi theo mốc xu; từ 10 xu thêm mưa giấy màu, từ 30 xu có pháo hoa, từ 99 xu pháo hoa lớn.
  Bình luận `pháo hoa` → bắn pháo hoa, `hoa rơi` → mưa hoa hồng, thả đủ 50 tim → cặp đôi trên sân khấu nhảy.
- **Điểm hạnh phúc:** cặp đôi đang ở vị trí tâm điểm (giữa sân khấu) nhận +50 điểm cho mỗi 1 xu quà tặng
  trong lúc họ đứng đó (+30 điểm khi lên sân khấu). Bảng **💞 Cặp đôi được yêu thích** ở góc phải;
  cặp dẫn đầu được đội vương miện 👑. Điểm lưu trong trình duyệt chạy game như game chùa.

## Nâng cấp sảnh theo mắt xem

Số mắt xem lấy từ TikTok khi đang LIVE thật; chưa LIVE thì đếm người đã tương tác trong 5 phút gần nhất.
Thanh tiến trình ở góc trên trái luôn cho biết còn bao nhiêu mắt nữa thì lên mốc tiếp theo.

| Mắt xem | Cấp sảnh | Thay đổi |
|---|---|---|
| 0 | Lễ Ấm Áp | `bg.webp` – cổng hoa hồng pastel |
| 100 | Hoa Khai | `bg-1.webp` – thêm đèn chùm, hoa hai bên sân khấu |
| 300 | Kim Tuyến | `bg-2.webp` – tường kim tuyến vàng, 2 đèn chùm lớn |
| 500 | Lung Linh | `bg-3.webp` – sảnh hoàng gia cẩm thạch vàng |
| 1.000 | Đại Tiệc Vàng | nền 500 + tia sáng sân khấu xoay + mật độ lấp lánh tăng |
| 2.000 | Đám Cưới Hoàng Gia | thêm hào quang vàng nhấp nháy + pháo hoa chúc mừng định kỳ từ hiệu ứng mốc |

Mỗi nền có điểm đặt chân sân khấu riêng (`FILE_ANCHOR` trong `js/main.js`) để cặp đôi luôn đứng đúng sàn
dù mỗi ảnh vẽ sân khấu ở độ cao khác nhau. Đổi file nền theo mốc cũng chỉnh được ở trang quản trị (bgRules)
hoặc trong `defaults` của `LiveBridge/config/mappings/dam-cuoi.json`.

## Âm thanh

- Chưa có file nhạc: game tự tạo nhạc nền lãng mạn (vòng hợp âm C–Am–F–G) + chuông cưới, tiếng pháo hoa,
  hợp âm chúc mừng khi cặp đôi lên sân khấu — tất cả bằng WebAudio, không cần file.
- Muốn nhạc thật: thả file vào `Games/dam-cuoi/audio/` (xem `audio/README.txt`), tải lại trang game.

## Sửa câu MC / luật chơi

Sửa trong `defaults` của `LiveBridge/config/mappings/dam-cuoi.json` rồi tải lại trang game:
`mcLines` (câu ý nghĩa), `mcFunny` (câu hài), `mcCouple` (`{a}` `{b}` = tên 2 người),
`mcThank` / `mcGreet` / `mcFollowLines` (`{ten}` = tên người xem), `mcMilestone` (`{moc}` = tên mốc),
`mcName`, `mcMinSec`/`mcMaxSec`, `coupleSec` (số giây một cặp đứng trên sân khấu), `guideLines`, `rulesLines`.
Gói quà → hành động sửa ở trang quản trị như game chùa (file mapping `dam-cuoi`).

## Trạng thái

- Đã có bản demo chạy không cần TikTok (`?demo=1`): tự sinh cặp đôi, quà, follow và mắt xem tăng dần
  để xem đủ các cấp sảnh.
- Chưa kiểm chứng với quà TikTok thật (kế thừa cùng LiveBridge với game chùa).
