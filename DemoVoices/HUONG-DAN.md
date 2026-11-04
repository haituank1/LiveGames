# DemoVoices — Hai chất giọng chuẩn của kênh

> **Dành cho AI làm việc sau này: đọc kỹ file này trước khi tạo bất kỳ voice lồng tiếng / voice demo / giọng đọc nào cho chủ kênh.**
> Hai chất giọng dưới đây do chính chủ kênh nghe thử và chốt ngày 2026-11-04, dùng **xuyên suốt từ giờ về sau**. Chủ kênh gọi chúng bằng mã **GV01** và **GV02** — khi chủ kênh nhắn "đọc bằng GV01", "voice GV02", "cả 2 giọng"... thì áp dụng đúng bảng dưới đây, không tự ý đổi giọng khác.

## 1. Bảng giọng chuẩn

| Mã | Tên gọi | Voice ID (dùng nguyên văn) | Tên trong catalog | Mô tả chất giọng |
|---|---|---|---|---|
| **GV01** | Giọng Bong Bóng | `avocado_v2:lumi` | Bubbly Pompom | Nữ, tông trung, tươi vui "bong bóng", năng lượng cao, nhí nhảnh, âm trong và sáng. Catalog gốc: *"Feminine, Finnish, Bubbly, Energetic — Medium pitch, Finnish accented Adult voice, Bubbly, Energetic, Clear timbre and bright tone. (F, Young)"* |
| **GV02** | Giọng Lém Lỉnh | `avocado_v2:rumi` | Cheeky Bubble | Nữ, tông cao hơn GV01 một chút, trẻ, trong, lém lỉnh, hơi tinh nghịch. Catalog gốc: *"Feminine, American, Bubbly, Bright — High-pitched American voice with a fast pace. Bubbly, sarcastic, wry tone. Smooth, silky, warm timbre. (F, Young)"* |

File mẫu chuẩn (nghe để đối chiếu trước khi giao):
- `GV01-Giong-Bong-Bong.mp3` — giọng GV01, 10,0 giây
- `GV02-Giong-Lem-Linh.mp3` — giọng GV02, 10,2 giây

Cả hai file mẫu đọc cùng một câu:

> "Bạn đã bao giờ được tổ chức đám cưới ngay trên TikTok chưa nè? Chỉ cần bình luận, gắn thẻ người thương vào, là hai bạn lập tức cùng lên sân khấu, làm cô dâu chú rể liền luôn! Vui lắm đó nha!"

## 2. Cách tạo voice đúng chất giọng (Muse / Meta AI TTS)

Dùng công cụ TTS tích hợp của Muse (`/opt/hatch/bin/tts`), truyền text qua stdin:

```bash
# GV01 — Giọng Bong Bóng
printf '%s' "<văn bản cần đọc>" | /opt/hatch/bin/tts speak \
  --output <file-dich.mp3> --voice avocado_v2:lumi --language vi --speed 100 --text-stdin

# GV02 — Giọng Lém Lỉnh
printf '%s' "<văn bản cần đọc>" | /opt/hatch/bin/tts speak \
  --output <file-dich.mp3> --voice avocado_v2:rumi --language vi --speed 100 --text-stdin
```

Thông số cố định:
- `--language vi`, `--speed 100` (chỉ chỉnh trong khoảng 95–110 khi chủ kênh yêu cầu nhanh/chậm hơn; ngoài khoảng này chất giọng bị lệch).
- Định dạng ra: MP3.
- Voice ID phải copy **nguyên văn**, kể cả tiền tố `avocado_v2:`.

## 3. Cách viết văn bản để giọng đọc tự nhiên, vui nhộn (rất quan trọng)

Chất giọng chỉ hay khi văn bản viết đúng kiểu. Chủ kênh yêu cầu: **âm điệu tự nhiên, vui nhộn, sôi động**. Khi soạn text cho GV01/GV02:

- Viết như **lời nói miệng**, không viết văn viết trang trọng. Dùng từ đệm tự nhiên: "nè", "nha", "đó nha", "liền luôn", "xem nè"...
- Câu **ngắn**, nhịp nhanh; dùng dấu chấm than cho câu hào hứng và dấu hỏi cho câu móc người xem (TTS lên giọng theo dấu câu).
- Số, giờ, tiền: viết ra chữ như cách đọc ("một trăm nghìn đồng", "tám giờ tối") — không để số thô.
- **Không** để markdown, emoji, hashtag, ký tự trang trí trong phần text đem đọc (TTS sẽ đọc vấp hoặc đọc ra tiếng lạ). Emoji/hashtag chỉ để ở phần chữ hiển thị đi kèm, không nằm trong text đọc.
- Một lần đọc nên là một đoạn liền mạch theo câu; text dài thì chia theo câu tự nhiên, tránh cắt giữa cụm từ.

## 4. Nếu hệ thống khác không có đúng Voice ID

- Ưu tiên số 1: luôn thử đúng ID ở mục 2 trước.
- Nếu nền tảng TTS khác không có ID này: chọn giọng nữ theo đúng đặc điểm — GV01 = nữ trẻ, tông trung, bubbly/năng lượng, âm sáng; GV02 = nữ trẻ, tông cao, trong, lém lỉnh/tinh nghịch — rồi **nghe đối chiếu A/B với file MP3 mẫu** trong thư mục này. Chỉ giao khi nghe gần với file mẫu.
- **Không** tự ý thay bằng các giọng sau (chủ kênh đã nghe thử và không chọn cho voiceover): Microsoft HoaiMy, Microsoft NamMinh, giọng Google, giọng nữ ấm Aria (`avocado_v2:MAI_01`). Các giọng đó chỉ dùng khi chủ kênh yêu cầu đích danh.
- Lưu ý đã được chủ kênh chấp nhận: GV01/GV02 là giọng gốc tiếng Anh nên phát âm tiếng Việt hơi "Tây" nhẹ. Đây là đặc tính cố hữu — **không** vì lý do này mà đổi sang giọng khác; chỉ chỉnh tốc độ và cách viết câu như mục 3 để tự nhiên hơn.

## 5. Quy ước gọi tắt

- "GV01" → Giọng Bong Bóng (`avocado_v2:lumi`)
- "GV02" → Giọng Lém Lỉnh (`avocado_v2:rumi`)
- "cả 2 giọng" → làm 2 bản, mỗi bản một giọng, cùng một văn bản để chủ kênh so sánh/chọn.

---
*Cập nhật: 2026-11-04 — chủ kênh chốt GV01 + GV02 làm hai giọng chuẩn lâu dài cho toàn bộ video/voiceover của kênh (game đám cưới, sàn nhảy và các game sau này).*
