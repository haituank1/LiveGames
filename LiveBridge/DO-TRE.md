# Đo độ trễ đường webcast LiveBridge (F4)

## Các đoạn được đo

| Đoạn | Định nghĩa | Lấy từ đâu |
|---|---|---|
| `fanout` | Lúc sự kiện tới máy này − lúc TikTok tạo sự kiện | `common.createTime` của webcast (ms epoch, lúc TikTok tạo) so với `Date.now()` lúc callback connector chạy |
| `local` | Lúc đẩy xong cho game − lúc sự kiện tới máy này | Xử lý trong `dispatch()`: chặn, trackViewer, mapper, gửi WS |
| `total` | `fanout + local` | Từ lúc TikTok tạo sự kiện tới lúc game nhận |

`fanout` là đoạn user nghi chậm (TikTok fan-out + mạng). `local` chứng minh máy mình có phải bottleneck không.

**Lưu ý đồng hồ:** `fanout` so giờ máy TikTok với giờ máy local. Nếu đồng hồ máy local lệch X ms thì số `fanout` đo được lệch đúng X ms (chậm hơn → đo thấp hơn thực tế). Trước khi đo, kiểm tra đồng hồ máy đã đồng bộ giờ Internet (Windows: Settings → Time → Sync now). Đo ngày 2026-11-06 trên máy ảo: đồng hồ chậm hơn giờ chuẩn khoảng 0,3–0,9s (so bằng header `Date` của Google, sai số ±0,5s do header chỉ chính xác tới giây).

**Chưa gồm trong số đo:** đoạn người xem bấm trên điện thoại → tới máy chủ TikTok (không có timestamp từ điện thoại), và độ trễ hiển thị trên điện thoại xem live. Muốn đo đầu-cuối thật: bấm giờ thủ công — xem 1 comment/quà hiện trên app TikTok lúc mấy giờ, so với lúc game phản ứng.

## Cách bật

Mặc định TẮT (không ồn log). Bật 1 trong 2 cách:

- `config/default.json`: `"latencyLog": true`, hoặc
- Chạy server với cờ: `node server.js --user=<tiktok> --latency-log=1`

## Cách chạy đo với phòng live thật

1. Cài deps trong `LiveBridge` (`npm install`). Lưu ý môi trường máy ảo: `npm install` trong worktree lỗi EPERM chown (overlay) → cài ra thư mục khác rồi symlink: `npm install` trong `/tmp/lb-deps`, sau đó `ln -s /tmp/lb-deps/node_modules LiveBridge/node_modules`.
2. Chạy LiveBridge trỏ tới phòng ĐANG live, bật đo:
   `node server.js --user=<username> --latency-log=1`
3. Mở game nối vào LiveBridge như khi live bình thường (cần có game nối để đường mapper + WS chạy đủ; không có game thì số `local` sẽ nhỏ hơn thực tế một chút).
4. Chờ ít nhất vài phút có sự kiện thật (chat/tim/quà/follow...).
5. Xem số:
   - Log tóm tắt mỗi 60s: dòng `[latency tổng] <loại> n=... fanout med=... p90=... | local med=... | total med=... p90=...`
   - Hoặc `curl http://127.0.0.1:8787/api/latency` (JSON đầy đủ median/p90/min/max từng loại).
   - Log từng sự kiện: dòng `[latency] <loại> fanout=... local=... total=...` (like lấy mẫu 1/10 cho khỏi ngập log).
6. Dừng: Ctrl+C.

## Phát hiện khi làm

- `eventTs` KHÔNG nằm ở `d.createTime` trên đường v2/v3 (connector 2.5.0 dùng protobuf `tiktok-live-proto/v3`): nó nằm ở **`d.common.createTime`** (`CommonMessageData`, chuỗi số ms epoch). Cả 6 loại sự kiện game dùng (chat/gift/like/member/follow/share) đều có `common`. Đường v1 cũ mới có `d.createTime` ở mức ngoài — code đọc cả hai, ưu tiên `common.createTime`.
- `skippedClock` trong `/api/latency` đếm mẫu bỏ fanout vì `eventTs` bất thường (vượt khoảng −60s..+10 phút) — nếu số này lớn thì nghi đồng hồ lệch.

## Kết quả

- **2026-11-06 (máy ảo): chưa đo được số thật.** @damcuoionline2 không live lúc đo (trang live trả `liveRoomStatus: 0`, `LiveRoomInfo: null`, connector không lập được phòng). Không có phòng live công khai nào khác đã xác minh trong khung giờ đo.
- **Pipeline đã kiểm chứng bằng giả lập** (`POST /api/simulate` với `eventTs` lùi 3s/1,5s): chat `fanout=3068ms local=11ms`, gift `fanout=1591ms local=0ms`, like không `eventTs` → `fanout=n/a`, `skippedClock=1`. Test `eventStamp` 6/6 PASS (chuỗi ms, số ms, giây, thiếu field, rác).
- Commit: nhánh `do-tre` từ `main @ 0e193d5` (xem `git log`).
