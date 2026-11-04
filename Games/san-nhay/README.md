# Sàn Nhảy Quẩy Max – game tương tác TikTok LIVE

Game thứ ba của dự án, dùng chung **LiveBridge** với game chùa và game đám cưới (không cần sửa LiveBridge).

| Trang | Địa chỉ |
|---|---|
| Chạy qua LiveBridge | http://localhost:8787/Games/san-nhay/ |
| Chạy demo (không cần TikTok) | http://localhost:8787/Games/san-nhay/?demo=1 |
| Giả lập tặng quà | http://localhost:8787/LiveBridge/public/simulator.html?game=san-nhay |
| Khóa camera toàn cảnh để xem phòng | thêm `&cam=overview` vào link demo |

Đưa lên OBS / TikTok LIVE Studio: thêm nguồn Browser với URL trên, kích thước **1080×1920** (khung dọc 9:16).

## Có gì mới ở V4 — PHÒNG BAR DUY NHẤT + CAMERA ĐẠO DIỄN ƯU TIÊN (2026-11-04)

Kiến trúc phòng + camera port từ game đám cưới (1 ảnh phòng lớn, cửa sổ 9:16 lia bằng lò xo giảm chấn):

- **MỘT background duy nhất, đầu tư kỹ:** `bg-bar.webp` (1080×2160) vẽ trọn một phòng bar chuyên nghiệp:
  sân khấu DJ + booth, **màn LED khổng lồ**, 2 tháp loa, giàn đèn laser, **bục podium phát sáng** giữa sàn,
  2 quầy bar kệ rượu phát sáng **chỉ dọc tường hai bên** — và **sàn nhảy TRỐNG HOÀN TOÀN**
  (không bàn, không ghế trên sàn; dancer đứng trên sàn). Bố cục được **đóng băng trong `BAR-LAYOUT.md`**
  (tọa độ % của từng vùng + lưới 99 ô đứng + vùng cấm) — bg thay thế sau này phải giữ đúng khung đó.
- **Vào phòng = RƠI TỪ TRÊN CAO:** dancer spawn trên cao ngay trên ô của mình rồi rơi xuống với
  gia tốc tăng dần, vệt bóng ma + tia lửa, chùm đèn spotlight bám theo; chạm đất có **vòng sóng +
  bùng tia + nảy squash-and-stretch** và tên nảy lên. Người cũ quay lại có LV cao thì rơi hoành tráng hơn
  (rơi từ cao hơn, vệt vàng, vòng sóng đôi, camera zoom sâu hơn).
- **Ô sàn cố định:** 99 ô trên 9 hàng phối cảnh của sàn (mã `F01`…`F99` in mờ dưới chân), cấp random
  khi vào, giữ nguyên suốt phiên. Chỉ rời ô khi: lên bục top 3 (podium + 2 bục phụ), ra điểm nhảy đôi
  trước podium — xong đều quay về đúng ô nhà.
- **ĐẠO DIỄN CAMERA theo điểm ưu tiên** (yêu cầu trọng tâm của V4): hàng đợi cảnh có điểm —
  **quà ≥1000 xu: 120 · quà ≥299: 100 · LÊN LV: 95 · quà ≥99: 85 · solo AU: 70 · quà ≥10: 65 ·
  nhảy đôi: 60 · người mới rơi vào: 55 · tour ngắm sàn: 10**. Quà càng to càng ưu tiên khi XẾP HÀNG.
  **LUẬT LIA CAM** (Nguyen chốt lại 2026-11-04): dancer đang được lia là **ưu tiên số 1** — cảnh của họ
  chạy **TRỌN thời lượng cấu hình**. Sự kiện khác xếp hàng, điểm cao chạy trước (điểm bằng nhau
  thì cảnh vào trước chạy trước); mỗi dancer chỉ giữ 1 cảnh chờ điểm cao nhất. **Ngoại lệ duy nhất —
  QUÀ LỚN CHEN NGANG:** cảnh **quà** (cờ `gift` trong code: ≥10 xu = 65 · ≥99 = 85 · ≥299 = 100 ·
  ≥1000 = 120) có điểm **cao hơn hẳn** cảnh đang chạy thì được chen ngang sau thời gian giữ tối thiểu
  `directorMinHoldSec` (mặc định 1.2s) — vì người tặng quà to đã ủng hộ game. Cảnh bị chen bị **huỷ hẳn**
  (không xếp hàng lại), dancer của cảnh đó trở lại bình thường ngay. Mọi cảnh **không phải quà**
  (lên LV 95 · solo 70 · nhảy đôi 60 · vào phòng 55) **không bao giờ chen ngang**, chỉ xếp hàng.
  Sự kiện mới cho **chính dancer đang lia** không tạo cảnh 2 mà **nâng cấp cảnh tại chỗ**: hình/zoom theo
  sự kiện lớn hơn, lý do lower-third cập nhật, giờ kết thúc kéo dài (tổng cảnh tối đa 15s).
  **Party Max xếp hàng với ưu tiên cao nhất (200)** sau cảnh lia đang chạy (bắt đầu ngay khi cảnh đó kết
  thúc) và 10s Party Max cũng không bị cảnh nhân vật chen ngang (chúng xếp hàng chạy tiếp sau). Chỉ cảnh
  đệm không có dancer đích — **tour ngắm sàn / toàn cảnh trực thăng** — mới nhường đường ngay cho cảnh
  thật. Hết cảnh, dancer **trở lại bình thường**: GIF chữ ký tại ô, tắt vòng focus, bỏ làm mờ phần còn lại.
  Mỗi cảnh có thời lượng + mức zoom riêng trong config. Có **lower-third** hiện tên + lý do
  (🎁 QUÀ / ⬆ LÊN CẤP / 👋 MỚI VÀO…).
  Camera chạy 1 vòng `requestAnimationFrame` duy nhất với **lò xo smooth-damp** (vị trí 0.55s, zoom 0.75s,
  chống vọt đích) + `clampXY` không bao giờ lia ra ngoài phòng + **culling** ẩn dancer ngoài khung mỗi ~220ms.
- **Nhân vật = GIF động thật theo roster** (`img/`, nguồn `~/workspace/san-nhay-anim`): 11 nhân vật người chơi
  NV01–NV08 + NV13–NV15, mỗi người xem được cấp **ngẫu nhiên 1 nhân vật cố định** (lưu theo id).
  3 trạng thái hình ảnh theo camera: tại ô = GIF hành động chữ ký · được cận cảnh = bản **xung-dai 24 khung** ·
  khoảnh khắc chiếm sóng (quà khủng / lên LV / sao Party Max) = bản **spotlight-dai 32 khung**.
- **Nhân viên quán bar NV09–NV12** (chỉ trạng thái thường): khi số dancer thật trên sàn thấp hơn
  `staffThreshold` (mặc định 14), nhân viên tự vào **lấp sàn** cho đỡ trống; khách thật vào đủ thì
  nhân viên **rời sàn lịch sự** (mờ dần). Nhân viên không có tên XP/bảng vàng.
- **Cấp độ LV + lưu trữ 7 ngày:** mỗi id TikTok lưu `{nhân vật, XP, LV, tổng quà, thống kê tuần, lastSeen}`
  trong localStorage. **Quá 7 ngày không quay lại → tự xoá.** **Reset tuần mỗi THỨ 6** (`resetDay`, mặc định 5):
  điểm bảng vàng / quà tuần / XP tuần về 0 (nhân vật + LV tích lũy giữ nguyên trong hạn 7 ngày).
  LV hiện tại thể hiện bằng: **huy hiệu LV trên thẻ tên**, **vòng hào quang dưới chân theo bậc**
  (LV5+ đồng · LV10+ bạc + vương miện nhỏ · LV15+ vàng · LV20+ cầu vồng), **cỡ người lớn dần theo LV**
  (tối đa `lvScaleMax` 1.25×).
- **Màn LED trên sân khấu** là phần tử DOM phủ **đúng khung màn vẽ sẵn** trong tranh: mặc định là **DJ CAM** —
  DJ NV03 hiện **lớn gần kín chiều cao màn**, đứng sau **bóng quầy DJ**, **luân phiên động tác headspin <-> scratch
  mỗi ~4 giây** (crossfade 2 lớp ảnh, không cắt cứng); sau lưng là **EQ 14 cột** nhảy theo thời lượng phách
  116 BPM, **2 chùm đèn quét** trong màn, lớp **lưới chấm LED + scanline**, thẻ **🔴 DJ CAM** và cả màn
  **"zoom punch" theo phách** (scale 1<->1.05, cao trào 1.09). **Cao trào:** Party Max hoặc cảnh quà >=299 xu
  -> DJ chuyển **bản xung-dai**; cảnh **quà khủng >=1000 xu** -> **bản spotlight-dai** (trạng thái suy ra từ
  đạo diễn/Party Max sẵn có, hết cao trào tự về luân phiên). Khi camera cận cảnh ai thì màn chiếu chính người đó
  (GIF xung + tên + lý do/điểm trực tiếp) — DJ CAM tạm dừng luân phiên, hết focus tự chạy tiếp. Ticker sự kiện
  chạy ở mép dưới màn như cũ. Ảnh DJ cũng qua `sped()` nên `tocDoNhay` áp dụng cho cả DJ trên màn.

## Cách chơi

- **Ai vào cũng thành dancer:** vào phòng / bình luận / thả tim / tặng quà đều xuất hiện trên sàn
  (rơi từ trên cao!) với tên + avatar + huy hiệu LV, nhảy liên tục, thỉnh thoảng bật bong bóng thoại hài.
- **XP / lên LV:** bình luận +2 XP (tối đa 1 lần/10s), quà +2 XP/xu, follow +5, mỗi 100 tim +5,
  solo được điểm/15, nhảy đôi +15. Đủ ngưỡng `levelXp` (LV1→LV20) thì **LÊN CẤP**: banner + fanfare +
  camera cận cảnh chúc mừng (ưu tiên 95) + GIF spotlight 4 giây.
- **Solo AU tại ô:** dancer solo theo vòng (gõ `solo` / `lên bục` để ưu tiên), dãy **6 phím** ← ↑ ↓ →
  (config `soloSoPhim`), nhịp mỗi phím = `soloSec`/`soloSoPhim` ≈ 0.87s nên cả lượt chỉ ~**5–6 giây**
  (config `soloSec`, mặc định 5.2) — cảnh camera solo cũng dài đúng bằng lượt solo, nhả camera ngay khi FINISH.
  Chấm **PERFECT / GREAT / COOL / BAD / MISS**, COMBO, bảng tally dọc bên phải, banner FINISH.
  Khán giả giúp bằng cách bình luận đúng phím `trái / lên / xuống / phải`.
- **Nhảy đôi:** bình luận `nhảy đôi` (+ tag tên bạn nhảy) → cặp ra 2 điểm trước podium, tim bay,
  camera bám theo cặp, xong ai về ô nấy (+15 XP mỗi người).
- **Party Energy:** đầy 100% → **PARTY MAX** 10 giây: camera toàn cảnh bị khóa, chữ lớn CẢ SÀN CÙNG QUẨY,
  mọi dancer chuyển bản xung (Chủ Tịch dùng bản spotlight), mưa tiền + pháo giấy + beams quét.
- **Quà theo mốc xu:** 1+ tim/pháo giấy tại dancer · 10+ **nổ hũ vàng** + cận cảnh · 99+ **đổ bộ**:
  cánh + hào quang, pháo hoa, cận cảnh · 299+ **trực thăng VIP** bay ngang phòng + spotlight ·
  1000+ **QUÀ KHỦNG**: ăn mừng toàn sàn (pháo hoa ×8, mưa tiền, trực thăng) + focus spotlight dài nhất (ưu tiên 120).
- **Bảng vàng tuần:** 3 ô Chủ Tịch / Phó Chủ Tịch / Thư Ký theo **điểm tuần** (quà ×10 + điểm solo/10),
  hạng 4–5 ở dòng nhỏ. **Top 3 đứng bục**: Chủ Tịch trên **podium phát sáng**, hạng 2–3 ở 2 bục phụ trước podium.
  Bảng ghi rõ "Reset thứ 6 · còn X ngày". Nút reset điểm của LiveBridge cũng reset tuần.

## TODO — giai đoạn trang phục / phụ kiện (Nguyen: "phần nhân vật tính sau")

- Trang phục riêng theo LV (hiện mới có huy hiệu + vòng hào quang + vương miện + cỡ người).
- Phụ kiện theo nhân vật (cánh, bóng bay…): mỗi dancer đã có sẵn **lớp DOM `.acc` trống** +
  trường dữ liệu `p.accessories` trong `js/dancers.js` — chỉ cần gắn asset + luật hiển thị vào đây.
- Có thể vẽ thêm nhân vật mới vào roster rồi thêm 1 dòng vào bảng `CHARS` trong `js/dancers.js`.

## Ghi chú kỹ thuật

- `js/dancers.js`: khung `LAYOUT` (đọc từ BAR-LAYOUT.md), lưới 99 ô, máy rơi (rAF: gia tốc + vệt + cone + chạm đất),
  trượt về ô/bục/điểm đôi, 3 trạng thái GIF (`setVis`), LV visuals (`setLv`), culling (`cull`), nhân viên quán.
- `js/main.js`: Cam (damp/clampXY/culling như đám cưới), `Dir` đạo diễn ưu tiên, Store (7 ngày + reset thứ 6),
  solo AU, nhảy đôi, quà theo tầng, Party Max, màn LED, demo + móc `Party.test` để kiểm chứng.
- `js/effects.js`: canvas phủ cả thế giới (tọa độ thế giới): pháo hoa, mưa tiền, nổ hũ, vòng sóng, hạt theo
  "bộ hiệu ứng" riêng của từng nhân vật (`ambient(fx, x, y)`).
- Mọi overlay (bảng vàng, Party Energy, lower-third, tally, thanh AU, hướng dẫn) nằm **ngoài** `#world`
  nên không bị camera phóng/thu.
- Cấu hình: toàn bộ con số (zoom/thời lượng từng loại cảnh, XP, ngưỡng LV, retentionDays, resetDay,
  staffThreshold…) nằm trong `defaults` của `LiveBridge/config/mappings/san-nhay.json`; game có bản
  mặc định tại máy giống hệt để chạy demo độc lập.
- **Làm mờ khi lia cam** (`lamMoKhiLia` = true, `doMoPhanConLai` = 0.55): khi đạo diễn giữ cảnh cận
  cảnh (quà / lên LV / solo / nhảy đôi / người mới rơi), mọi dancer trừ người được lia bị giảm sáng +
  bão hoà + hơi trong để nhân vật chính nổi bật (CSS `#world.focusing .dancer` + `.is-focus`, chuyển
  mượt 0.45s, main.js `syncDim()` gọi theo Dir.start/end). Party Max / toàn cảnh / tour ngắm sàn
  thì không mờ. Đặt `lamMoKhiLia: false` để tắt hẳn.
- **Tốc độ nhảy** (`tocDoNhay`: `cham` | `thuong` | `nhanh`): trình duyệt không đổi được tốc độ GIF
  đang chạy, nên mỗi GIF trong `img/` có sẵn 2 bộ biến thể delay trong `img/cham/` (0.8x) và
  `img/nhanh/` (1.3x) — sinh bằng cách vá trường delay của từng frame, dung lượng không đổi.
  Game đổi tốc độ = đổi thư mục ảnh (dancers.js `sped()`), đồng thời nhân thời lượng animation hào
  quang/bob qua biến CSS `--spd` (1.25 / 1 / 0.77). `partyMaxNhanhHon` = true: trong Party Max cả
  sàn tạm nhảy bản `nhanh`, hết Party Max trả về tốc độ config.
- **Hiệu ứng luôn màu mè** (yêu cầu 2026-11-04: "màu mè hoa hoè luôn luôn", không chỉ lúc có sự kiện lớn):
  chùm đèn `#beams` **luôn quét nhẹ + tự xoay hue**, quầng sáng sàn `#floorglow` đổi màu luân phiên và
  bừng sáng theo phách nhạc, **mưa kim tuyến** canvas rơi thường trực, hào quang theo nhân vật ưu tiên
  dancer **đang trong khung camera**. Chấm solo có hiệu ứng riêng theo nấc: **PERFECT = nổ cầu vồng
  (`FX.burstRainbow`) · GREAT = vàng · COOL = cyan**, mốc combo x3/x5 có pháo giấy (+ chớp viền màn
  hình `#edgeglow` ở x5). Sự kiện (lên cấp / đổ bộ / quà khủng / đáp đất LV cao) đều thêm điểm nhấn
  cầu vồng đa hue; pháo hoa 2 tông màu. Trần hạt canvas giữ nguyên (1500) và culling không đổi nên
  hiệu năng không đổi.
