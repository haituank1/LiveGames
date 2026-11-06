# BG-LAYOUT — Lớp học chữ (v17: nền tia nắng + bảng vẽ sẵn, học sinh mới, tự canh ghế, M5 Oẳn tù tì, motto mới)

Khung hình: **720 × 1280** (dọc 9:16), gốc tọa độ tính theo % chiều rộng /
chiều cao của `#stage`. Mọi vị trí dưới đây là % của stage, không phải px,
để OBS co giãn vẫn đúng.

Nền là **ảnh vẽ kín `img/lop-hoc-bg.png`** (720×1280, bản v17, thay bản v16
từ 2026-11-06 tối): trần xà gỗ, cửa sổ **trái** có cây xanh + **tia nắng
vàng xiên vào lớp** (god rays, hạt bụi vàng, vùng sáng ấm trên sàn và mặt
bàn gần cửa sổ), tường gỗ **phải**, sàn gỗ cam, **bảng xanh lá VẼ SẴN
trong ảnh** (khung gỗ, x ~12–88%, y ~15,5–32,5%), **5 dải bàn dài
trống**, không có đèn treo, không còn đám đông đứng 2 bên bảng, không
có chữ. Các khung chữ game (bảng hiệu, banner, bảng, panel) đè lên đúng
vị trí đã vẽ trong ảnh nền. CSS gradient dưới ảnh nền chỉ là dự phòng
nếu ảnh lỗi.

> Ghi chú v8–v10 (đã thử rồi bỏ): từng vẽ lại nền sảnh trống + ghép bàn
> (img/desk.png) + ghế (img/chair.png) riêng, 10 bàn 2 cột × 5 hàng.
> Nhìn xấu hơn video (bàn vẽ mặt trước nhiều nên giống tủ, ghế tựa cao
> thành khung, lối đi giữa rộng trống) nên đã trả lại kiểu video: bàn
> vẽ liền mạch trong nền, ghế ẩn sau lưng học sinh. File desk.png /
> chair.png vẫn còn trong `img/` nhưng không dùng nữa.
>
> Ghi chú v16 (2026-11-06 tối): user gửi ảnh Giờ ra chơi thứ 2, rõ hơn
> ảnh đầu, và chốt **bỏ hết background + nhân vật cũ, làm giống y đúc
> ảnh này, kể cả đổi cô giáo sang áo đỏ**. Nền v16 vẽ theo ảnh đó
> (bảng cao hơn, 5 dải bàn dài, cột phải 4 panel). Bản v16 lưu tại
> `workspace/lop-hoc-chu-polish/src/lop-hoc-bg-v16.png`, bản v15 tại
> `.../src/lop-hoc-bg-v15.png`.
>
> Ghi chú v17 (2026-11-06 tối): user chốt **bỏ vụ cắt mép bàn** (dải
> mặt bàn `.deskstrip` gây lỗi liên tục: cắt tóc hàng sau, cắt chip tên,
> cắt bong bóng chat) + **tự canh tọa độ từng học sinh** + làm lại học
> sinh giống ảnh họ + nền đẹp lên có tia nắng qua cửa sổ + popup giống
> ảnh họ + bỏ sọc chéo trên bảng. Nền v17 vẽ từ v16 (thêm tia nắng);
> lần đầu vẽ bảng luôn vào ảnh (v17a) nhưng bảng HTML đè lên thành 2
> bảng nên vẽ lại v17b — vẫn vẽ bảng vào ảnh nhưng **bảng HTML đổi
> thành khung trong suốt** đè đúng khung bảng vẽ. Đỉnh bàn dịch lên
> 0,3–1% so với v16 (đo lại từ ảnh v17).

## Bố cục tổng thể (đối chiếu ảnh Giờ ra chơi thứ 2 user gửi 2026-11-06)

| Vùng | Vị trí (% stage) | Ghi chú |
|---|---|---|
| Bảng hiệu `#classSign` | left 30, top 0.8, w 40 | Trắng viền nâu: `LỚP HỌC CHỮ` + `Tiết {tiết} · Câu {câu}/20 · {views} bạn` (renderSign) |
| Banner khẩu hiệu `#mottoBar` | left 2, top 6.8, w 96 | Đỏ/vàng `TIÊN HỌC LỄ – HẬU HỌC VĂN` (v16b, user chốt 2026-11-06 tối — bỏ câu cũ `NGHE HẾT ĐỀ – GÕ MỚI ĂN ĐIỂM` vì đề hiện là tính giờ luôn, câu đó sai luật). Chữ LỄ không có chấm dưới — chấm user thấy là của chữ Ọ trong HỌC (đã tra 2026-11-06 tối, chữ đúng chuẩn) |
| Bảng xanh lá `#board` | left 12, top 15.5, w 76, h 17 | **KHUNG TRONG SUỐT** (v17): nền/border/shadow bỏ hết, chữ đè trực tiếp lên bảng vẽ sẵn trong ảnh nền (khung gỗ x ~12–88%, y ~15,5–32,5%). Chữ phấn trắng thêm bóng đậm (`text-shadow: 0 2px 4px rgba(0,0,0,.55)`) để đọc được trên tia nắng; `#qHint` chừa `padding-left: 110px` cho đầu cô Ngân; ô chữ/vạch đáp án/đáp án vàng như cũ. **Sọc chéo trên bảng đã bỏ** (v17, user chốt — nhìn lâu đau mắt) |
| Thanh thời gian `#timerBarWrap` | left 12, top 36.8, w 76, h 8px | Vàng-cam, co dần theo thời gian còn lại của giai đoạn (v17: rộng theo bảng mới) |
| Panel Nhanh nhất `#fastestPanel` | left 12, top 38.5, w 76 | Ngay dưới bảng: header nâu `⚡ Nhanh nhất` + `N bạn đã đúng`, 3 cột avatar mặt trước + tên + thời gian (lúc công bố hiện +điểm) |
| Banner luật chơi `#guideBar` | left 14, bottom 9.5, w 72 | Đỏ/vàng, xoay mỗi 8s; ở dưới cùng, trên dải chat/sổ quà |
| BXH `#topPanel` | left 2, top 12.5, w 18 | `🏆 Học sinh xuất sắc`, **top 3** bảng lớp, hẹp như ảnh họ (x 2–20%); mỗi hàng 1 dòng (huy chương + tên cắt ngắn + điểm) |
| Cột phải `#rightRail` | right 1.5, top 1, w 20 | 4 panel xếp dọc như ảnh họ (xem dưới) |
| — `#eventPanel` | (trong rail) | `📌 SỰ KIỆN TRONG LỚP`: Đường lên đỉnh Everest / Rung Chuông Vàng + badge đỏ `ĐANG DIỄN RA` (tĩnh, theo ảnh; tên dài vẫn cắt "…" vì rail hẹp) |
| — `#teamPanel` | (trong rail) | `🚩 Thi đua tổ`: Tổ 2 / Tổ 3 / Tổ 1 / Tổ 4, mỗi hàng `N bạn` + `0đ` (tĩnh, theo ảnh — chưa có tính năng chia tổ) |
| — `#fundPanel` | (trong rail) | `❤️ Quỹ lớp`: **ĐÃ NỐI QUÀ THẬT** (v16b, user chốt 2026-11-06 tối): số lớn = tổng xu quà thật (bắt đầu từ 0, số 106 cũ là số của ảnh họ), 4 dòng đếm số lần tặng theo loại (Gửi tặng cô / Tặng cô hoa / Bắn tim cho cô / Mời cô ăn bánh), lưu localStorage, like không tính |
| — `#interactPanel` | (trong rail) | `🔥 Top Tương tác` (động): tim +2 / chat +2 / quà +5 / follow +10 / share +3, top 5 |
| Pill nhỏ `#pillStack` | — | **ĐÃ BỎ ở v16** (follow / sự kiện Giờ vàng / hạng lớp) — cột phải đã chật vì 4 panel theo ảnh họ. Các hàm update trong main.js (`renderGoal`, `renderEvent`, tier) đã có guard `if (el)` nên không lỗi khi phần tử không còn. Mục tiêu follow còn nhắc trong guideLines xoay dòng. |
| Khung chat `#chatLog` | — | **ĐÃ BỎ ở v16b** (user chốt 2026-11-06 tối — không cần thiết; chat thật vẫn ở TikTok, `appendChatLine` đã có guard `if (!box) return` nên không lỗi). Góc trái dưới giờ trống, chỉ còn Sổ quà bên phải (+ panel chỉnh ghế khi `?seats=1`). |
| Sổ quà `#giftPanel` | right 2, bottom 1, w 46, h 7.5 | 5 quà gần nhất, dải mỏng dưới cùng |
| Banner `#banner` | top 46, giữa | Thông báo lớn (Giờ vàng / quà lớn / đủ follow), hiện 6s ở khoảng trống giữa panel Nhanh nhất và hàng bàn 1. **v17: thẻ trắng** như ảnh họ (nền `#fffdf5`, chữ nâu `#4e342e`, viền cam `#ff9800`, bóng mềm) — bỏ nền đỏ/cam chói + chữ vàng |
| Toast `#toast` | left 2, bottom 14.5, w ≤60% | Dòng ngắn 4s (điểm danh, follow, quà), góc trái dưới — KHÔNG che panel Nhanh nhất. **v17: thẻ trắng** (nền `#fffdf5`, chữ nâu, viền xanh lá `#43a047`; `.vip` nền `#fff3e0` viền cam) |
| Bảng Top 5 cũ `#revealList` | — | Đã bỏ (CSS `display:none`); thông tin Top 5 nằm ở panel Nhanh nhất + BXH |
| Panel chỉnh ghế `#seatEditor` | left 2, bottom 1, w 46 | Chỉ hiện khi `?seats=1` (demo): dropdown 20 ghế + ô X/Y/Rộng + nút Sao chép JSON ghế / Đặt lại mặc định (xem dưới) |

## Ghế ngồi = thứ hạng điểm (20 ghế: 4 hàng × 5)

Tọa độ đo từ ảnh nền **v17** bằng xử lý ảnh (màu bàn gỗ vàng nhạt):
- Dải bàn trong nền (đỉnh mỗi dải): y **48,7 / 56,2 / 64,6 / 73,7 / 85,4**
  (dịch lên 0,3–1% so với v16 do vẽ lại). Dùng 4 dải làm ghế:
  **48,7 / 56,2 / 64,6 / 73,7**. Dải 85,4% (bàn trống sát đáy, như ảnh
  họ) để trống — dải chat + banner luật che mất chip tên nếu ngồi đó.
- **Tâm bàn:** bàn vẽ là dải dài liền mạch, không chia cột, nên 5 cột
  chia đều x 10/30/50/70/90 (v16b, user chốt 2026-11-06 tối — 1 dãy
  ghế 5 hs; ảnh họ ngồi 7/hàng nhưng user chốt 5).
- **Học sinh KHÔNG còn bị cắt (v17, user chốt bỏ vụ cắt):** học sinh
  neo `translate(-50%,-100%)` nên **đáy hình (ngực cắt) = y = đúng
  đỉnh bàn** — người ngồi sau bàn như ảnh họ. **Bỏ hẳn 4 dải mặt bàn
  `.deskstrip`** (đã xóa khỏi index.html + CSS) **và mặt nạ mờ dần**:
  v16b dùng dải mặt bàn để che thân dưới, nhưng dải gây 3 lỗi liên
  tiếp (cắt tóc hàng sau, cắt chip tên, cắt bong bóng chat) nên user
  chốt bỏ. Không còn cơ chế che nào nữa — vị trí do user tự canh.
- **Tỉ lệ người (v17):** ảnh học sinh mới 600×600 (tỉ lệ 1,0, đầu +
  vai cắt ngang ngực), rộng **48/56/64/74** → thân hiện 48/56/64/74px.

| Hàng | y (%) | w (px) | x các cột (%) | chipY (%) |
|---|---|---|---|---|
| 1 (xa nhất) | 48.7 | 48 | 10, 30, 50, 70, 90 | 49.0 |
| 2 | 56.2 | 56 | 10, 30, 50, 70, 90 | 56.5 |
| 3 | 64.6 | 64 | 10, 30, 50, 70, 90 | 64.9 |
| 4 | 73.7 | 74 | 10, 30, 50, 70, 90 | 74.0 |

`P.reseat(ids)` xếp lại ghế theo thứ tự điểm (điểm cao ngồi hàng trên):
ghế đang bị NPC / người 0 điểm ngồi thì **đổi chỗ** (người kia xuống ghế
vừa trống), người đang lên bảng giữ ghế. Học sinh "chuyển chỗ" mượt nhờ
`transition: left/top/width 1.2s`.

**Chip tên + điểm:** tách ra lớp riêng `#chipLayer` (z-index 12, trên
mọi học sinh trong `#room`) — đầu học sinh hàng sau không bao giờ che
chip hàng trước. Vị trí chip tính từ ghế (`applySeat`): top = `chipY`
(**đỉnh bàn + 0,3%, ngay dưới mép bàn, trên mặt trước bàn như ảnh họ**).
`P.setScore` cập nhật số điểm trong chip, `P.topStudent` tô chip vàng
+ ⭐ cho Top 1, `raiseHand` tô chip xanh lá khi trả lời đúng. Lên bảng
thì ẩn chip, về ghế thì hiện lại.
Lưu ý: `#chipLayer` nằm TRONG `#room` (z-index 7) nên chip vẫn nằm
DƯỚI các khung trực thuộc `#stage` có z-index cao hơn (banner, toast,
guideBar) — chip hàng cuối không được đặt vào vùng các khung đó.

**Bong bóng chat học sinh:** lớp riêng `#bubbleLayer` (con trực tiếp
của `#stage`, z-index 30, `pointer-events: none`) — `P.say` tạo bong
bóng ở đó, đặt đáy bong bóng = đỉnh đầu học sinh (tính từ vị trí thật
của phần tử nên đúng cả khi user đã kéo ghế). Bong bóng không bao giờ
bị panel/bảng che (v16c: bong bóng nằm trong `#room` (z 7) nên bị panel
Nhanh nhất + dải mặt bàn cắt — user chỉ 2026-11-06 tối).

**Tự canh tọa độ từng ghế (`?seats=1`, v17):** user chốt tự chỉnh vị
trí thay vì để Muse canh hộ. Mở `?demo=1&seats=1` (demo) → panel
`#seatEditor` góc trái dưới + học sinh thành `editable`:
- Bấm vào 1 học sinh (hoặc chọn trong dropdown "Ghế N — hàng M") để
  chọn ghế; ghế đang chọn có viền cam.
- Kéo học sinh để di chuyển (giữ đúng điểm cầm: neo ghế ở đáy hình,
  không nhảy khi kéo); hoặc gõ số X (%)/Y (%)/Rộng (px) trong panel.
  Chip theo y + 0,3 tự động.
- Lưu `localStorage` (`lophochchu.seats.v1`) ngay khi thả chuột / đổi
  số; mở lại game vẫn giữ vị trí đã canh.
- Nút **Sao chép JSON ghế**: copy mảng 20 ghế `{x, y, w, chipY}` để
  chép vào `SEATS` trong `js/people.js` (khóa lại vĩnh viễn).
- Nút **Đặt lại mặc định**: xóa ghi đè, về tọa độ mặc định trong code.
- `P.getSeats()` / `P.setSeat(si, patch, save)` / `P.resetSeats()` /
  `P.setEditMode(on)` trong `js/people.js`; `main.js` bật khi
  `q.has('seats')`. Học sinh mới vào sau khi bật chế độ vẫn kéo được
  (`spawn` thêm class `editable` khi `editMode` bật).

## M5 — Giờ ra chơi: Oẳn tù tì với cô (xong 2026-11-06 tối)

Hết tiết (20 câu, `roundNo % 20 === 0`) thì `endRound()` gọi
`startBreak()` thay vì nghỉ 3s rồi câu tiếp:
- 30s (`cfg.breakSec`, mặc định 30): bảng hiệu đổi thành `Giờ ra chơi
  {còn}/30` (đếm ngược, như ảnh họ); bảng hiện `✊✌️✋ Oẳn tù tì với
  cô` + 3 ô Búa/Kéo/Bao với số phiếu; học sinh gõ `búa`/`kéo`/`bao`
  (có/không dấu) vào chat để bỏ phiếu — mỗi người 1 phiếu, phiếu sau
  ghi đè phiếu trước, phiếu không tính là đáp án (`onChat` kiểm tra
  phase `break` trước `submitAnswer`).
- Sau 20s (`cfg.breakRevealSec`): cô ra ngẫu nhiên (búa/kéo/bao),
  bảng hiện `Cô ra: ✌️ Kéo!` + dòng `🎉 N bạn thắng +50 điểm!`, banner
  công bố, ai thắng cô +50 điểm (`cfg.breakWinPoints`), BXH cập nhật.
  Voice cô: `break-1` (mở đầu), `break-bua`/`break-keo`/`break-bao`
  (công bố theo quân cô ra), `break-3` (hết giờ) — giọng Cô Ngân,
  tổng voice-static 162 dòng.
- Hết 30s: `endBreak()` → `startRound()` (câu 1 tiết mới). Câu đầu
  tiết mới chờ voice rảnh mới đọc đề (`A.whenFree`, tối đa ~6s) —
  nếu không, `break-3` còn đang phát thì câu đó im lặng (lỗi thấy ở
  verify v16b).
- Demo nhanh: `?demo=1&break=1` nhảy thẳng vào break (coi như hết
  tiết 1); học sinh giả tự gõ búa/kéo/bao để bỏ phiếu; `npcSync()`
  vẫn chạy để đủ NPC nền như lúc chơi thật.

## Nhân vật

- Cô giáo **Cô Ngân** (đổi từ Cô An theo user chốt 2026-11-06 20:16):
  **ảnh `img/co-ngan.png`** — mẫu anime 2D, dáng người lớn (không
  chibi): áo khoác đỏ + áo đỏ trong, quần tối màu, bốt nâu, tóc nâu
  ngang vai, kính tròn, **tay phải cầm cờ đỏ giơ cao, tay trái chỉ
  thẳng sang phải ngang vai về phía bảng**. Ảnh gốc do AI vẽ trên nền
  trắng (1200×1920) — đã tách nền bằng flood-fill từ biên + ramp alpha
  rồi cắt gọn còn 1151×1833 (tỉ lệ cao/rộng 1,593); có thẻ tên
  "Cô Ngân" trên ngực (giữ, giống ảnh họ). Đứng **bên trái bảng**,
  rộng 185px, `TEACHER_POS` (13%, 42.5%) — ngón tay trỏ tới
  x ~25,7%, y ~31,7% (mép trái bảng, ngang tầm ô chữ/vạch đáp án),
  chân ~46%, đầu ~23%, cao ~23% khung. Không có chip tên riêng.
  Bong bóng thoại `.teacher-bubble` ở dải trống dưới khẩu hiệu, trên
  bảng (`left: 50%; top: 11%; width: fit-content; max-width: 55%`,
  giữa khung) — không che câu đố trên bảng, không che đầu cô (v15 để
  ở tường trái đã hết chỗ vì bảng v16 cao lên tới y 16,5%).
  Cô An cũ (`img/co-an.png`, `co-an-a.png`, `co-an-b.png`) không dùng
  nữa. Giọng vẫn **GV02LemLinh** (`avocado_v2:rumi`); 6 dòng voice
  nhắc tên đã sinh lại với "cô Ngân" (hello-1, hello-4, correct-3,
  gift-1, end-1, end-3 — xem tools/tao-giong-lop-hoc.js), index vẫn
  157 dòng.
- Học sinh: **ảnh nhìn từ SAU LƯNG `img/hoc-sinh-sau-1..6.png` MỚI
  (v17, 2026-11-06 tối)** — 6 mẫu giống ảnh họ: tóc ngắn đen, tóc dài
  đen, đuôi ngựa vàng + nơ vàng, búi 2 bên, mũ đỏ, tóc vàng dài; áo
  trắng, **đầu + vai cắt ngang ngực** (tỉ lệ 1,0, 600×600, đã chuẩn
  hóa canvas chung), PNG trong suốt tách từ grid 3×2 (flood-fill từ
  biên, ngưỡng 242, ramp alpha — áo trắng ~214–232 nên không bị ăn
  vào). Ảnh cũ (320×~420, tỉ lệ 1,32, nửa người tới eo) lưu tại
  `workspace/lop-hoc-chu-polish/src/hoc-sinh-sau-*.png`. Ảnh mặt
  trước `img/hoc-sinh-1..6.png` chỉ dùng làm **avatar tròn** trong
  panel Nhanh nhất. Mỗi người một mẫu theo hash id. Tối đa **20 ghế
  hình**; người thứ 21 trở đi vẫn chơi + ghi điểm nhưng không có hình
  riêng.
- NPC nền: 3 NPC `P.init` ngồi hàng 4; NPC trong `npcDanhSach`
  (main.js) vào sau, ngồi ghế trống bất kỳ. NPC chỉ làm nền, không chiếm
  Top 5, không ghi điểm.
- Trạng thái: `raise` (hiện tay ✋ vẫy + nhún), `correct` (dấu ✓ xanh lá
  ở góc đầu + chip tên nền xanh lá, như live đối thủ), `happy` (nhảy),
  `onboard` (lên bảng cạnh bảng, phóng to 1.25×, tự về ghế sau 8s),
  `top1` (chip tên nền vàng + ⭐).

## Hiệu ứng (canvas `#fx`, z-index 40, trên nhân vật, dưới banner/toast)

- Sao vàng: bay lên từ bảng khi có người trả lời đúng.
- Pháo giấy: 2 khẩu từ 2 góc dưới bắn chéo lên (quà lớn).
- Pháo hoa: nổ trên trời lớp (quà vừa/lớn, đủ follow, Giờ vàng).
- Tim: bay lên khi thả tim.
- Lấp lánh + bụi vàng: ambient nhẹ, dày dần theo hạng lớp (tier 0–3).

## Nền và chữ trên bảng

- Ảnh nền `img/lop-hoc-bg.png` (bản v17): trần xà gỗ, cửa sổ trái có
  cây xanh + **tia nắng vàng xiên qua cửa sổ** (vệt sáng trên tường,
  sàn, mặt bàn + hạt bụi vàng), tường gỗ phải, sàn gỗ cam, 5 dải bàn
  gỗ vàng trống, **bảng xanh lá vẽ sẵn trong ảnh** (khung gỗ). Không
  có đám đông, không có chữ. Bản v16 lưu tại
  `workspace/lop-hoc-chu-polish/src/lop-hoc-bg-v16.png`; bản v15 tại
  `.../src/lop-hoc-bg-v15.png`; bản v1 tại `.../src/lop-hoc-bg-v1.png`.
- Bảng HTML **trong suốt** đè lên bảng vẽ: pill chủ đề + vòng tròn số
  câu + câu đố (chữ viết tay `Comic Sans MS` / `Chalkboard SE` — trên
  máy Linux không có font này nên rơi về serif, trên Windows/OBS hiện
  đúng kiểu viết tay; `#qHint` chừa `padding-left: 110px` cho đầu cô
  Ngân, font 23px, margin-top 32px, bóng chữ đậm để đọc trên tia nắng)
  + ô chữ từng ký tự của chữ đảo + vạch đáp án theo số từ + đáp án vàng.
- Chữ trên ảnh nền: KHÔNG có (đã ghi NO TEXT khi tạo ảnh), mọi chữ đều
  là HTML của game.

## Vòng lặp 1 câu v16 (~41 giây, sửa luật tính giờ 2026-11-06 19:36)

User chốt: **hiện câu hỏi là tính giờ luôn** — bảng + voice cô đọc đề +
đồng hồ bắt đầu CÙNG 1 lúc, 1 phase trả lời 30s (voice ~6s chạy chồng
trong đó), gõ sớm vẫn tính. Không còn phase "ra đảo chữ" riêng, không
còn `askSec`. Xem `KE-HOACH-UPDATE-THEO-ANH-MOI-2026-11-06.md` §3.

| Giai đoạn | Thời gian | Chuyện gì xảy ra |
|---|---|---|
| Làm bài | 30s | Bảng + ô chữ hiện, voice cô đọc đề phát cùng lúc, đồng hồ chạy ngay; gõ đáp án vào chat, chấm theo thời gian nhanh nhất |
| Công bố | 8s | Hiện đáp án + Top 5 nhanh nhất + cộng điểm bảng lớp |
| Nghỉ | 3s | Câu tiếp theo |

## Còn lệch so với ảnh live đối thủ / ảnh mới (đã biết)

- Nền v17 không vẽ đèn treo (ảnh họ có 1 đèn xanh lá giữa trần);
  không đáng kể vì đèn nằm sau bảng hiệu.
- Học sinh mình là ảnh PNG tách nền (6 mẫu), họ là nhân vật vẽ tay nhiều
  mẫu tóc hơn; đủ 6 kiểu tóc khác nhau, cùng nhìn từ sau lưng.
- Panel Thi đua tổ đang tĩnh (số 0đ chép từ ảnh) vì chưa có tính năng
  chia tổ — chỉ làm giao diện giống ảnh. Muốn số chạy thật thì làm thêm
  tính năng. (Quỹ lớp đã nối quà thật ở v16b.)
- Tên sự kiện "Đường lên đỉnh E…" vẫn cắt "…" vì cột phải hẹp.
