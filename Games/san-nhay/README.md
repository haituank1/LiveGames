# Sàn Nhảy Quẩy Max – game tương tác TikTok LIVE

Game thứ ba của dự án, dùng chung **LiveBridge** với game chùa và game đám cưới (không cần sửa LiveBridge).

| Trang | Địa chỉ |
|---|---|
| Chạy qua LiveBridge | http://localhost:8787/Games/san-nhay/ |
| Chạy demo (không cần TikTok) | http://localhost:8787/Games/san-nhay/?demo=1 |
| Giả lập tặng quà | http://localhost:8787/LiveBridge/public/simulator.html?game=san-nhay |
| Đổi cảnh để xem thử | thêm `&venue=beach` hoặc `&venue=snow` vào link demo |
| Khóa camera để xem từng góc | thêm `&cam=overview` (toàn cảnh), `&cam=a` / `&cam=b` / `&cam=c` (đóng 1 khu), `&cam=focus` (cận cảnh 1 dancer) vào link demo |

Đưa lên OBS / TikTok LIVE Studio: thêm nguồn Browser với URL trên, kích thước **1080×1920** (khung dọc 9:16).

## Có gì mới ở v3 — KHÔNG GIAN RỘNG + CAMERA LIA

- **Thế giới rộng 3 khu:** sân không còn là 1 khung chật nữa mà là một **thế giới rộng 210% × 115%**
  khung hình (nền panorama minh họa vẽ riêng `bg-wide.webp`: quầy DJ trái — sân khấu giữa — bar vàng phải),
  chia 3 khu có biển LED riêng:
  - **KHU A** — quầy DJ + **TV màn hình lớn** gắn trên tường.
  - **KHU B** — sàn chính + sân khấu, nơi top 3 bảng vàng đứng.
  - **KHU C** — VIP bar (biển VIP LOUNGE phát sáng, ánh vàng khi camera đóng vào).
- **Ô cố định cho từng dancer:** mỗi người vào phòng được **random 1 ô trống cố định** trong
  **126 ô** của cả 3 khu (7 hàng × 6 cột mỗi khu), thẻ ô (`A07`, `B12`, `C03`…) in mờ dưới chân.
  Dancer **đứng nhảy tại ô của mình**, không xáo trộn khi người khác vào/ra; rời phòng thì ô được trả lại.
  Chỉ rời ô khi lên sân khấu top 3 (Khu B) hoặc ra điểm nhảy đôi của khu — xong quay về đúng ô nhà.
- **Camera ảo lia cảnh** (đạo diễn tự động, chuyển cảnh mượt ~1,4 giây):
  - **Toàn cảnh:** thấy trọn thế giới 3 khu — lúc mở đầu, lúc Party Max và xen giữa các cảnh.
  - **Đóng 1 khu:** lia tới Khu A / B / C (có pill `KHU A/B/C` sáng lên + ánh sáng rửa theo khu).
  - **Cận cảnh dancer:** zoom ~2x vào đúng ô của người được gọi tên, kèm thanh lower-third kiểu
    truyền hình: `📹 CAMERA → KHU B · <tên>`.
  - Hàng đợi ưu tiên: **VIP đáp trực thăng (≥299 xu) > đổ bộ (≥99 xu) > solo AU > nhảy đôi > lên cấp >
    nổ hũ vàng (≥10 xu) > tour tự động** (cứ ~14 giây camera lại tự đi thăm 1 khu / 1 dancer).
    Trong demo, cảnh cận cảnh đầu tiên đến trong ~6 giây đầu.
- **Solo AU ngay tại ô:** dancer được gọi solo **không rời ô** — camera cận cảnh tới ô, **spotlight**
  chiếu xuống + **vòng sáng** dưới chân, hàng xóm cùng khu bay tim + hô "Cố lên!". Thanh phím AU và
  bảng tally vẫn là overlay cố định ngoài camera nên luôn đọc được.
- **TV màn hình lớn (Khu A):** mặc định chiếu **DJ nhảy theo nhạc** + thanh equalizer + tem `🔴 LIVE` +
  **ticker chạy chữ** sự kiện mới nhất (ai vào sàn/ô nào, ai tặng quà, ai solo…). Khi camera cận cảnh
  một dancer (solo / đổ bộ / lên cấp), TV **chuyển sang chiếu chính dancer đó** — ảnh + tên + điểm
  trực tiếp (đang solo thì điểm/combo cập nhật theo thời gian thực), hết cảnh thì quay về DJ.
- **Đèn chiếu:** chùm beams quét khắp thế giới, spotlight riêng cho người được cận cảnh (màu theo lớp
  nhân vật), ánh sáng rửa màu theo khu, sàn + sân khấu **nháy theo phách 116 BPM** khi solo / Party Max.
- **Hào quang theo lớp nhân vật** (canvas + vòng CSS dưới chân, dancer ở khu camera đang đóng và các
  dancer nổi bật được ưu tiên để không nặng máy):
  - **Đại Gia:** vòng vàng xoay dưới chân + tia xu lấp lánh + tiền giấy phất phới.
  - **Idol:** tim + sao hồng bay lên, quầng hồng mềm dưới chân.
  - **DJ:** vòng sóng nhạc xanh lan ra + nốt nhạc ♪ bay.
  - **Dân Quẩy:** pháo giấy mini + tia cam bắn nhanh.
  - **Mascot Vịt:** bong bóng xà phòng bay + thỉnh thoảng lông vũ rơi.
  - **Tân Binh:** sao xanh lá lấp lánh quanh đầu.

## Cách chơi (giữ nguyên từ v2, chuyển sang tọa độ thế giới)

- **Ai vào cũng thành dancer:** người xem vào phòng, bình luận, thả tim hay tặng quà đều xuất hiện
  trên sàn với tên + avatar + thẻ ô, nhảy liên tục, thỉnh thoảng bật bong bóng thoại hài.
  Demo ~96 dancer, tối đa 120 dancer.
- **6 lớp nhân vật** — mỗi lớp một ảnh chibi riêng trong `img/`, một điệu nhảy và một màu hiệu ứng riêng:

  | Lớp | Phong cách | Điệu nhảy |
  |---|---|---|
  | Đại Gia (`dai-gia`) | vest đen, kính râm, dây chuyền vàng — hiếm (tỉ lệ thấp), quà ≥99 xu được nâng lên lớp này | lắc lư điềm đạm, ngầu |
  | Idol (`idol`) | đồ neon hồng/tím kiểu K-pop | vẫy tay, xoay người |
  | DJ (`dj`) | hoodie + tai nghe | nhún mạnh theo nhịp, gật đầu |
  | Dân Quẩy (`quay-hai`) | ba lỗ, mũ ngược, dép lê | lắc hông vinahouse |
  | Mascot Vịt (`mascot`) | bộ vịt vàng bông | lắc mông chậm, gây cười |
  | Tân Binh (`tan-binh`) | pijama chấm bi + trà sữa | nhảy vụng về, dễ thương |

- **Solo AU tại ô:** dancer solo theo vòng (gõ `solo` / `lên bục` để được ưu tiên), dãy 12 phím ← ↑ ↓ →
  chạy ở thanh AU dưới, mỗi nhịp chấm **PERFECT / GREAT / COOL / BAD / MISS**, có **COMBO**,
  **bảng chấm điểm dọc bên phải** đếm theo thời gian thực và banner **FINISH** tổng điểm (~20 giây/lượt).
  Khán giả giúp dancer ăn điểm bằng cách bình luận đúng phím: `trái / lên / xuống / phải` hoặc emoji ←↑↓→.
- **Nhảy đôi:** bình luận `nhảy đôi` (hoặc `nhảy đôi` + tag tên bạn nhảy) → hai dancer ra điểm nhảy đôi
  của khu mình, tim bay, banner giới thiệu cặp, camera đóng khung khu đó ~20 giây, xong ai về ô nấy.
- **Party Energy:** thanh năng lượng góc trên-trái tăng theo tim / bình luận / quà.
  Đầy 100% → **PARTY MAX** 10 giây: camera về toàn cảnh, chữ lớn **CẢ SÀN CÙNG QUẨY**, cả sàn nhảy nhanh,
  tia sáng quét, mưa tiền dày + pháo giấy, đèn sàn nháy theo phách nhạc 116 BPM.
- **Quà theo mốc xu:** 1+ pháo giấy/tim tại dancer · 10+ **nổ hũ vàng** văng xu và tiền (camera lia tới) ·
  99+ **đổ bộ tại ô**: nâng lớp Đại Gia, cánh + hào quang ngay tại ô, pháo hoa, banner + camera cận cảnh ·
  299+ **trực thăng VIP**: camera về toàn cảnh xem trực thăng vàng bay ngang thả VIP xuống, rồi cận cảnh màn đổ bộ.
- **Lên cấp:** dancer nhận XP từ quà / điểm solo / nhảy đôi; đủ XP thì banner **LÊN CẤP n** + camera lia tới chúc mừng.
- **Bảng vàng tuần (lưu trong trình duyệt):** thanh vàng trang trọng chạy ngang trên cùng —
  3 ô **Chủ Tịch / Phó Chủ Tịch / Thư Ký** hiện ảnh lớp + tên + tổng 💎 trong tuần (ghi chú "Reset sau 6 ngày"),
  hạng 4–5 ở dòng nhỏ bên dưới. **Top 3 đồng thời đứng LỚN trên sân khấu Khu B** (Chủ Tịch đứng giữa,
  đội vương miện); rớt khỏi top 3 thì về ô nhà.
- **Đổi cảnh sàn** theo **tổng lượt view tích lũy** (lưu trình duyệt): 0 = Sàn Neon (panorama rộng),
  1.500 = Sàn Bãi Biển, 4.000 = Sàn Tuyết (2 cảnh sau dùng nền v2 phủ lên thế giới rộng).
- **Nhạc:** tự tạo nhịp disco 116 BPM + hiệu ứng (đúng nhịp, nổ hũ, pháo hoa, ăn mừng) bằng WebAudio.
  Muốn dùng nhạc thật: thả file nhạc vào thư mục `audio/` của game.

## Ghi chú kỹ thuật

- Nhân vật là **ảnh chibi nền trong suốt tự tạo** trong `img/` (6 lớp + `heli.png` trực thăng VIP),
  gắn bởi `js/dancers.js`; điệu nhảy là animation CSS theo class `.d-<lớp>` trong `index.html`.
- `js/dancers.js`: lưới ô cố định 3 khu (slot id/tọa độ/về ô nhà), sân khấu top 3 Khu B, điểm nhảy đôi
  theo khu, vòng sáng solo tại ô (`setFocus`), hào quang CSS theo lớp (`.auraring`).
- `js/main.js`: đạo diễn camera (`camGo`/`camRequest`/hàng đợi ưu tiên/khóa `&cam=`), TV Khu A
  (DJ/EQ/ticker/chế độ chiếu dancer + điểm trực tiếp), solo tại ô, Party Energy/Max, bảng vàng,
  nhảy đôi, VIP, lên cấp, vòng lặp hiệu ứng ambient theo lớp (chỉ dancer nổi bật + trong khu camera).
- `js/effects.js`: canvas phủ **cả thế giới** (tọa độ thế giới): pháo hoa, mưa tiền, nổ hũ, vòng sóng,
  nốt nhạc, bong bóng, lông vũ, twinkle — hàm `ambient(cls, x, y)` phát hiệu ứng riêng từng lớp.
- Mọi overlay (bảng vàng, Party Energy, pill khu, lower-third camera, tally, thanh AU, hướng dẫn)
  nằm **ngoài** `#world` nên không bị camera phóng/thu.
- Trạng thái kiểm chứng v3: đã test bản demo bằng Chromium headless thật — 5 ảnh chụp ở
  `~/workspace/your_files/san-nhay-v3/`: toàn cảnh 3 khu (96 dancer), Khu A với TV/DJ, cận cảnh solo
  tại ô (Ô B26/C25, spotlight + vòng sáng, tally đếm), nhảy đôi được camera đóng khung Khu A,
  Party Max toàn cảnh. Zero pageerror. Quà TikTok thật vẫn cần kiểm chứng khi live thật
  (LiveBridge chưa từng nhận quà thật — giống hai game trước).
