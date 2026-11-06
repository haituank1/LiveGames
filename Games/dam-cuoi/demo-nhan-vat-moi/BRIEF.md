# Brief nâng cấp hình nhân vật — F5 (thử nghiệm, chưa rollout)

Nhánh: `nv2-nhan-vat-moi` (từ nv6 @ ab2cd30). Ảnh mẫu:
`~/workspace/user/media_library/image/image-24.png` (151×151, chụp từ 1 game
khác, chỉ làm tham chiếu phong cách — KHÔNG copy y trang phục/mặt của game đó).

## 1. Ảnh mẫu hơn ở đâu (đã nhìn trực tiếp, ảnh 151×151)

Nhìn rõ:
- **Điểm nhấn màu đậm duy nhất, đọc được ngay cả khi rất nhỏ:** cô dâu váy
  trắng/kem + dải đỏ to (choàng qua vai xuống tới eo, gặp nhau ở eo) + bó
  hồng đỏ ở eo. Trắng–đỏ–vàng, 3 mảng màu lớn, không lẫn vào nhau.
- **Silhouette sạch, eo nhìn thấy được:** váy dáng chuông/A-line, eo được
  đánh dấu rõ bằng dải đỏ; không bị bó hoa che mất eo.
- **Viền vàng dọc thân váy:** các đường vàng chạy dọc tạo chiều sâu mà vẫn
  đơn giản, không rối.
- Chú rể phía sau (chỉ thấy một phần): trang phục tím đậm/navy + viền vàng +
  vương miện — tương phản mạnh với cô dâu trắng.

Chưa rõ (ảnh nhỏ + mờ, KHÔNG bịa):
- Họa tiết thêu cụ thể trên váy/áo, trang sức (dây chuyền, khuyên tai),
  kiểu giày, chất liệu vải, kiểu bó hoa chi tiết.
- Mặt mẫu: chỉ thấy mắt tối nhỏ + miệng cười nhỏ, không đủ chi tiết để so
  sánh mặt. Trang phục chú rể: phần lớn bị che khuất.
- Có bóng đổ dưới chân hay không: không khẳng định được (nền ảnh mẫu là
  sảnh game, không phải nền trong suốt).

## 2. Nhân vật hiện tại của mình (đã nhìn trực tiếp 6 file)

- `bride.png` (413×720): cô dâu tóc vàng, vương miện vàng gắn đá, voan,
  váy trắng thêu vàng + ren, bó hồng, dây chuyền ngọc trai. Chi tiết đã
  nhiều.
- `groom.png` (353×720): chú rể tóc nâu, vest kem thêu vàng, nơ vàng,
  hoa hồng cài áo, đồng hồ bỏ túi, hộp nhẫn xanh. Chi tiết đã nhiều.
- `bride-aodai.png` (400×720) / `groom-aodai.png` (352×720): áo dài sen
  hồng thêu sen + khăn mấn; áo dài đỏ thêu mây vàng + khăn đóng đen.
  Chi tiết đã nhiều, đúng chất Việt.
- `royal-bride1.png` (364×720) / `royal-groom1.png` (372×720): vương miện
  vàng to gắn đá, váy vàng đính đá; quân phục trắng, cầu vai vàng, dải
  đỏ–vàng, quyền trượng hoa trắng. Rất giàu chi tiết.
- Tất cả cao 720px, nền trong suốt (4 góc alpha = 0), chân chạm mép dưới
  ảnh, viền đậm — khớp hệ thống scale theo y (V2) và preload (V9).

## 3. Kết luận trung thực: khoảng cách thật sự là gì

Nhân vật hiện tại KHÔNG thiếu chi tiết — về mật độ thêu/vương miện/trang sức
đã ngang hoặc hơn ảnh mẫu. Khoảng cách thật nằm ở **độ đọc được khi hiển
thị nhỏ**:
- Trong sảnh, nhân vật chỉ cao ~100–200px: thêu vàng mảnh + ren trắng trên
  nền trắng chìm hẳn, chỉ còn lại khối màu tổng thể. Ảnh mẫu thắng ở chỗ
  3 mảng màu lớn (trắng/đỏ/vàng) vẫn phân biệt được ở 150px.
- Eo cô dâu hiện tại bị bó hoa che, silhouette kém rõ hơn dáng chuông có
  dải đỏ của mẫu.

Vì vậy hướng nâng cấp đúng là **tăng tương phản + làm rõ silhouette**, KHÔNG
phải thêm thêu cho dày thêm (thêm nữa cũng chìm khi thu nhỏ).

## 4. Brief thử 1 cặp (bride-moi.png / groom-moi.png)

GIỮ NGUYÊN (không đổi):
- Mặt nhân vật hiện tại: cô dâu tóc vàng xoăn, mắt nâu, nụ cười; chú rể
  tóc nâu rẽ ngôi, mắt nâu, nụ cười. Không đổi thành mặt trong ảnh mẫu.
- Dáng đứng toàn thân nhìn thẳng, 2 tay tư thế như cũ (cô dâu ôm bó hoa,
  chú rể cầm hộp nhẫn).
- Nền trong suốt PNG, chân chạm mép dưới ảnh, 4 góc alpha = 0, cao 720px
  (cô dâu ~413 rộng, chú rể ~353 rộng), viền đậm như cũ. KHÔNG vẽ bóng đổ
  trong file (game đã có `.gshadow` riêng, V2).

ĐỔI (theo hướng ảnh mẫu, không copy y):
- Cô dâu: thêm dải đỏ đậm choàng vai → eo (gặp nhau ở eo, thắt nơ đỏ nhỏ),
  bó hoa thêm hồng đỏ nổi hơn; viền vàng trên váy đậm + dày hơn, bớt họa
  tiết ren mảnh; giữ vương miện + voan + váy trắng.
- Chú rể: thêm dải đỏ đậm (cummerbund/sash ngang eo) + khăn túi đỏ, giữ nơ
  vàng + hoa hồng cài áo + đồng hồ; thêu vàng trên vest đậm + dày hơn.
- Mục tiêu: ở cỡ hiển thị nhỏ vẫn đọc được 3 mảng màu (trắng/đỏ/vàng).

## 5. Kết quả thử 1 cặp — VÒNG 1 (chỉ trang phục; đã thay bằng vòng 2)

- Cô dâu vòng 1 (401×720, 549KB): mặt giữ được rất tốt, dải đỏ + hồng đỏ
  + thêu vàng dày hơn; lệch nhỏ: voan hơi ngả xanh lá, váy hơi xòe rộng
  hơn, góc dưới-trái alpha 111 (đuôi voan chạm sàn).
- Chú rể vòng 1 (352×720, 350KB): mặt giữ được nhưng ĐẦU TO HƠN rõ so
  với bản cũ (điểm chưa khớp lớn nhất vòng 1).

## 5b. Brief MỚI của user (11:13, BOSS chuyển): làm đẹp TOÀN BỘ nhân vật

Mặt + tóc + phụ kiện CŨNG nằm trong phạm vi làm đẹp, không chỉ trang phục:
mặt đẹp hơn, dễ thương hơn (mắt to có hồn, da/tóc có bóng đổ mềm), tóc
nhiều chi tiết + highlight, phụ kiện tóc/vương miện/trang sức đầy đủ —
NHƯNG vẫn phải nhận ra là nhân vật của mình: giữ khuôn mặt, màu tóc, kiểu
tóc gốc, làm đẹp lên chứ không đổi thành mặt của game trong ảnh mẫu.

## 5c. Kết quả thử 1 cặp — VÒNG 2 (theo brief mới, file hiện tại)

- Cô dâu mới (`bride-moi.png`, 402×720, 557KB): VẪN NHẬN RA NGAY — cùng
  khuôn mặt, tóc vàng xoăn, nụ cười. Mắt to hơn có hồn (thêm highlight),
  da/tóc có bóng đổ mềm, tóc nhiều sợi + highlight hơn; vương miện giàu
  hơn (đá hồng — mới, trước đây đá trắng/trong); khuyên tai + dây chuyền
  đá hồng đầy đủ. Dải đỏ + hồng đỏ + thêu vàng giữ như vòng 1. Lệch nhỏ:
  voan vẫn hơi ngả xanh lá; đá vương miện đổi sang hồng là thay đổi nhỏ
  trong câu chuyện màu.
- Chú rể mới (`groom-moi.png`, 352×720, 373KB): VẪN NHẬN RA NGAY — cùng
  khuôn mặt, tóc nâu rẽ ngôi, nụ cười. Mắt to hơn có hồn, tóc nhiều sợi +
  highlight hơn; thêu vàng dày hơn nhiều (ve áo, vai, cổ tay), hoa hồng
  cài áo to hơn có lá, đồng hồ nay có mặt số. Dải đỏ ngang eo có thêm
  hoa văn vàng + chốt hoa. TỈ LỆ ĐẦU ĐÃ KHỚP LẠI với bản cũ (điểm lệch
  lớn nhất vòng 1 đã hết). Lệch nhỏ: vài tia lấp lánh trên tóc (mới);
  hoa cài áo hơi to, che một phần ngực.
- Mức độ lệch mặt (đánh giá thẳng): THẤP ở cả hai — mắt to hơn + chi
  tiết hơn nhưng khuôn mặt, màu tóc, kiểu tóc, nụ cười giữ nguyên, không
  ai nhìn nhầm thành nhân vật khác. Không đổi thành mặt game mẫu.
- Hậu xử lý (cả 2 vòng): ảnh sinh ra RGB không alpha (1120×2016 /
  1056×2160) → tách nền flood-fill từ mép (ngưỡng gần-trắng min>=248,
  độ bão hòa<=12) + cắt sát content + resize về cao 720. Kiểm tra vòng 2:
  4 góc alpha 0 cả hai file, chân chạm mép dưới.
- Kết luận thử: hướng làm đẹp toàn bộ ĐÚNG brief mới, cặp thử dùng được.
  Vòng 2 tốt hơn vòng 1 ở cả mặt lẫn tỉ lệ đầu chú rể.

## 6. Rủi ro đã biết trước khi thử

- Generator có thể không giữ đúng mặt hiện tại (mắt/miệng/tóc lệch) — nếu
  lệch thì báo thẳng, không giấu, và cặp thử coi như không dùng được.
- Ảnh sinh ra có thể không trong suốt / không đúng 720px — cần hậu xử lý
  (tách nền flood-fill như V5 đã làm + resize về cao 720).
- Đồng nhất giữa các set: nếu chỉ cặp thường đẹp hơn mà áo dài/hoàng gia/
  khách giữ nguyên thì game sẽ lệch tông giữa các bộ — rollout phải làm
  lại toàn bộ cùng 1 lượt (xem ước lượng ở báo cáo BOSS).
