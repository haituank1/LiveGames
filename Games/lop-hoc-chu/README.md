# Lớp học chữ — Cô Ngân

Game live TikTok: cô giáo ra câu đố **đảo chữ** kèm gợi ý, người xem gõ đáp án
vào chat, hệ thống chấm theo **thời gian trả lời nhanh nhất**. Giữ nguyên vòng
lặp cốt lõi dễ tham gia của game cùng loại (gõ đáp án là chơi được ngay),
làm hay hơn ở: học sinh có hình riêng và phản ứng được (giơ tay, nhảy mừng,
lên bảng), chuỗi đúng liên tiếp nhân đôi điểm, điểm danh +50, quà lớn cho
học sinh lên bảng + pháo giấy, mục tiêu follow phiên, sự kiện Giờ vàng x2.

## Chạy thử (demo, không cần LiveBridge)

```bash
cd Games/lop-hoc-chu
python3 -m http.server 8000
# mở http://localhost:8000/?demo=1 rồi bấm "Bắt đầu lớp học (bật tiếng)"
```

Demo tự sinh 6 bạn giả lập trả lời (có lúc viết không dấu / thường để thử
chuẩn hóa), điểm danh, tặng quà, follow, thả tim. Cô Ngân nói bằng **file
mp3 tĩnh** trong `voice-static/` (đã sinh sẵn, không cần mạng TTS lúc live).

## Chạy live thật

1. LiveBridge chạy sẵn ở `http://localhost:8787` (xem `LiveBridge/README.md`).
2. Mở `http://localhost:8787/Games/lop-hoc-chu/` trong OBS / TikTok LIVE Studio
   (khung dọc 720×1280, nguồn Browser).
3. Mapping: `LiveBridge/config/mappings/lop-hoc-chu.json` — LiveBridge đọc
   mapping này để biến chat/quà/follow thành sự kiện game.

## Vòng lặp 1 câu (~41 giây, sửa luật tính giờ 2026-11-06 19:36)

| Giai đoạn | Thời gian | Chuyện gì xảy ra |
|---|---|---|
| Làm bài | 30s | Bảng + ô chữ hiện, voice cô đọc đề phát cùng lúc, đồng hồ chạy ngay từ lúc hiện đề; gõ đáp án vào chat, chấm theo thời gian nhanh nhất |
| Công bố | 8s | Hiện đáp án + Top 5 nhanh nhất + cộng điểm bảng lớp |
| Nghỉ | 3s | Câu tiếp theo |

## Điểm

- Hạng 1 = 100, hạng 2 = 80, hạng 3 = 60, hạng 4–5 = 40, trả lời đúng
  sau đó = 20.
- **Ghế ngồi = thứ hạng điểm**: điểm cao ngồi hàng trên (20 ghế:
  4 hàng × 5, cột x 10/30/50/70/90). Ghế đặt đúng tâm bàn đã đo từ ảnh
  nền v17 (đỉnh bàn y 48,7/56,2/64,6/73,7): học sinh neo
  translate(-50%,-100%) nên đáy hình (ngực cắt) chạm đúng mép bàn,
  không còn dải mặt bàn hay mặt nạ mờ nào (v17, user chốt bỏ vụ cắt).
  Chip tên + điểm nằm ngay dưới mép bàn, ở lớp riêng trên cùng nên
  không bao giờ bị đầu học sinh hàng sau che. Điểm đổi thì học sinh
  "chuyển chỗ" mượt; NPC / người 0 điểm ngồi ghế trước thì đổi chỗ
  xuống dưới. Top 1 có chip vàng + ⭐. Mở `?demo=1&seats=1` để tự canh
  tọa độ từng ghế (bấm vào học sinh để chọn, kéo để di chuyển, hoặc
  gõ số; lưu localStorage, nút Copy ra JSON 20 ghế).
- **Streak**: trả lời đúng 3 câu liên tiếp trở lên → điểm câu đó **nhân đôi**.
  Trả lời sai hoặc không trả lời → streak về 0.
- **Điểm danh**: gõ `có mặt` / `điểm danh` → **+50**, 1 lần mỗi phiên.
- **Giờ vàng**: mỗi 10 phút, 3 câu tiếp theo **nhân đôi** điểm (chồng với
  streak được, tối đa x4).
- Đáp án chấp nhận **không dấu / thường / hoa** (chuẩn hóa trước khi so).
  Mỗi người chỉ được 1 đáp án đúng mỗi câu (đáp án đầu tiên đúng được tính).

## Quà

- Quà nhỏ (< 99 xu): học sinh tặng quà giơ tay + sao vàng bay.
- Quà vừa (≥ 99 xu): pháo giấy + pháo hoa, tên hiện sổ quà lớp.
- Quà lớn (≥ 299 xu): học sinh **lên bảng** nhận thưởng 8 giây + pháo giấy
  2 khẩu + pháo hoa + banner tên to. Mốc đổi được trong config
  (`quaTangMocVua`, `quaTangMocLon`).

## Follow

- Mục tiêu follow phiên mặc định 20. Đủ mục tiêu → cả lớp nhảy mừng +
  pháo hoa, mục tiêu tăng thêm 20.
- Follow cũng cho người mới một ghế trong lớp (tối đa 20 ghế hình).

## NPC học sinh ảo

Khi phòng vắng (≤ 6 người thật có hình), NPC trong `npcDanhSach` vào lớp
ngồi cho vui (NPC nền ngồi hàng sau, chừa hàng trước cho người thật).
NPC trả lời đúng thì hiện bong bóng + giơ tay nhưng **không
chiếm Top 5, không ghi điểm bảng lớp** — điểm chỉ dành cho người thật.

## Voice — TẤT CẢ câu cố định đều có file tĩnh

Bài học V11 game đám cưới: xóa source là mất cache voice, TTS nối tiếp
~3s/câu nên voice chết dần. Game này **không tổng hợp voice lúc live**
cho câu cố định:

- 157 câu cố định của cô An (giọng `GV02LemLinh`, `avocado_v2:rumi`) và MC
  (giọng `GV01BongBong`, `avocado_v2:lumi`) nằm trong `voice-static/`
  kèm `voice-static/index.json`: 37 câu chung (ask/hint/reveal/…) +
  **120 file đọc đề riêng cho từng câu hỏi** (`q-001-doc` … `q-120-doc`,
  text = "Câu hỏi nè: {gợi ý}. Chữ đảo ở trên bảng rồi đó, cả lớp nhìn
  kỹ nha!" — chỉ đọc gợi ý, không đọc đáp án), mỗi file kèm `durationSec`
  đo bằng ffprobe. Hiện đề là voice phát cùng lúc, đồng hồ chạy ngay.
- Key file = `sha256(voice|rate|text sau khi làm sạch)`, 24 ký tự đầu.
- `js/audio.js` đọc file tĩnh TRƯỚC; chỉ **tên người chơi** (động) mới
  tổng hợp live qua NpcVoice. Câu tĩnh nào thiếu file thì game chỉ hiện
  chữ, không kẹt.
- Sinh lại / thêm câu mới:

```bash
node tools/tao-giong-lop-hoc.js        # sinh file nào chưa có
node tools/tao-giong-lop-hoc.js --force # sinh lại tất cả
```

Script gọi `/opt/hatch/bin/tts speak --language vi --speed 100` với đúng
2 Voice ID chuẩn trong `DemoVoices/HUONG-DAN.md`. Text đọc viết như lời
nói miệng, câu ngắn, từ đệm, số viết ra chữ, không markdown/emoji/hashtag.

## Cấu trúc file

| File | Việc |
|---|---|
| `index.html` | Khung dọc 720×1280, nền ảnh vẽ kín `img/lop-hoc-bg.png`, bố cục giống hệt live đối thủ: bảng hiệu + banner đỏ trên cùng, bảng xanh lá, BXH trái, panel Nhanh nhất + banner luật chơi dưới bảng, chat + sổ quà dải mỏng dưới cùng |
| `img/` | Nhân vật PNG nền trong suốt: `co-ngan.png` (cô Ngân dáng người lớn kiểu anime, áo đỏ, tay cầm cờ + chỉ bảng) + `hoc-sinh-sau-1..6.png` (6 mẫu học sinh nhìn từ sau lưng) + `hoc-sinh-1..6.png` (6 mẫu mặt trước, chỉ làm avatar panel Nhanh nhất) + `lop-hoc-bg.png` (ảnh nền lớp học vẽ kín v16), đã tách nền trắng, preload khi mở game |
| `js/questions.js` | Ngân hàng 120 câu đảo chữ (30 lịch sử / 30 đời sống / 30 đồ ăn / 30 địa lý), mỗi câu có đảo chữ, đáp án, gợi ý, độ khó |
| `js/main.js` | Vòng lặp 41s, chấm điểm, leaderboard, điểm danh, quà, follow, NPC, demo `?demo=1` |
| `js/people.js` | Cô Ngân + học sinh nhìn từ sau lưng dùng ảnh PNG (v17: 6 mẫu mới giống ảnh họ, 600×600), 20 ghế theo thứ hạng điểm (`reseat` đổi chỗ mượt, `setScore` cập nhật chip tên + điểm), giơ tay / chấm ✓ xanh / nhảy / lên bảng; bong bóng chat ở lớp riêng `#bubbleLayer` (z 30); chế độ chỉnh ghế `?seats=1` (`setEditMode`, kéo/gõ số, lưu localStorage, copy JSON) |
| `js/effects.js` | Sao vàng, pháo giấy, pháo hoa, tim, lấp lánh (canvas, dừng hẳn khi tab ẩn) |
| `js/audio.js` | Nhạc nền + SFX WebAudio, đọc voice-static trước, warm-up ưu tiên thấp |
| `tools/tao-giong-lop-hoc.js` | Sinh 157 file voice tĩnh bằng TTS (`--limit=N` chỉ sinh N câu hỏi đầu, không ghi lại index.json) |
| `voice-static/` | 157 file mp3 + `index.json` |
| `BG-LAYOUT.md` | Vị trí các khung theo % |
| `LiveBridge/config/mappings/lop-hoc-chu.json` | Mapping mẫu cho LiveBridge |

## Config (mapping `defaults`)

`answerSec` (30), `revealSec` (8), `gapSec` (3) — `askSec` đã bỏ từ v15,
`rankPoints` ([100,80,60,40,40]), `latePoints` (20), `streakMin` (3),
`streakMult` (2), `attendPoints` (50), `quaTangMocVua` (99),
`quaTangMocLon` (299), `followGoal` (20), `eventEverySec` (600),
`eventRounds` (3), `npcDanhSach` (10 tên), `npcTuDong` (true),
`npcNguongVang` (6), `guideLines`, `teacherLines`,
`musicOn`/`musicVolume`/`sfxOn`/`sfxVolume`/`voiceOn`/`voiceVolume`,
`npcVoiceMinGapSec` (8), `npcVoiceMaxPerMin` (6).

Điểm bảng lớp lưu localStorage (`lophochchu.scores`, demo dùng
`lophochchu.scores.demo`), có try/catch — lỗi lưu trữ không làm chết game.
Reset điểm: LiveBridge gửi sự kiện `reset-scores`, hoặc xóa key trên.

## Chưa test

- Chưa test live TikTok / OBS thật (chỉ test demo bằng trình duyệt).
- Chưa test với LiveBridge thật (chỉ theo đúng giao diện `LiveBridgeClient`
  của game đám cưới: `on('event'|'chat'|'hello'|'config'|'seen'|'block'|
  'reset-scores')`).
