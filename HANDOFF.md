# Prompt tiếp tục dự án (dán vào session mới)

Tôi đang làm dự án **game tương tác TikTok LIVE** ở `C:\TestGameAI` (Windows, đã cài Node.js 26 tại `C:\Program Files\nodejs`).
Đọc `C:\TestGameAI\README.md` trước khi sửa. Trả lời tôi bằng tiếng Việt.

## Kiến trúc
- **Cục A – `LiveBridge\`** (Node.js, dùng chung cho mọi game). Chạy bằng `C:\TestGameAI\start-livebridge.bat`, cổng 8787, chỉ nghe 127.0.0.1.
  Tham số dòng lệnh viết dạng `--ten=giatri` (`--port=8799`, `--host=0.0.0.0`), viết `--host 0.0.0.0` (thiếu `=`) sẽ bị bỏ qua.
  - `src/tiktok.js`: `tiktok-live-connector` **v2.5.0**, proto **v3** (`user.id`, `user.displayId`, `user.avatarThumb.urlList`...). Không bật `enableExtendedGiftInfo` (cần gói trả phí). Kết nối miễn phí.
    TikTok **không có sự kiện rời phòng**; `roomUser` gửi `ranks` (người xem top đang trong phòng) → game nhận qua `room.present` (mảng id).
    Vào phòng (`join`) chưa tạo nhân vật / chưa cộng điểm: config `joinSeat` (vào phòng là có nhân vật, mặc định false), `seatLikes:30` (tim cộng dồn `likeCount` từ `seen` — server gửi kèm `count`; event `like` của người chưa đủ tim bị bỏ) → `SEAT` trong main.js. Bình luận / quà / follow / share luôn `playerFor()`. `{tim}` trong `rulesLines` (ui.js) và `guideLines` (`fillTim`).
  - `src/mapper.js`: quy đổi quà/tim/bình luận → hành động theo `config/mappings/<game>.json` (tim: mỗi người đủ 30 tim mới thành hành động).
  - `src/settings.js`: lưu `config/settings.json`. GAME_DEFAULTS (= bản settings.json đã chỉnh trên LIVE 01/11/2026: npc 2, max 600, tickSec 5, xu 50, bình luận 5, thầy 15–18s, safeTop 5, safeSide 3, walk 300, act 200, tắt feed*) có `leaveMin:10` (phút vắng thì nhân vật tự rời chùa, 0 = tắt → `LEAVE` trong main.js), `showChat:false`, `monkOn`, `monkMinSec:15`, `monkMaxSec:18` (giây).
    Câu thầy nói `monkFollow` (chuỗi, '' = không nhắc) + các mảng `LINE_KEYS` (`monkLines`, `monkGreet`, `monkThank`, `monkFollowThanks`, `guideLines`,
    `rulesLines` (khung luật, `{giay}{diem}{binhluan}{xu}{follow}`, số 0 thì ẩn dòng → `U.rules(P, lines)`);
    rỗng = xoá khỏi settings → dùng mặc định ở `defaults` của `config/mappings/chua-3d.json`).
    Thêm: `monkGreetOn`, `monkGreetGap:10`, `pointsPerFollow:100`, `guideOn`, `safeTop:5`, `safeSide:3` (% chừa trên / mỗi bên cho TikTok trên điện thoại → CSS `--safe`, `--side`; `#status` nằm riêng giữa mép trên; `#monk` xếp dọc trong cột trái), `uiScale:120` (% cỡ chữ),
    `nameScale:100` (% cỡ tên dưới chân), `walkSpeed:300`, `actSpeed:200` (% tốc độ đi / lạy-đứng-quỳ → `T.params.walkSpeed/actSpeed`).
  - `server.js`: WebSocket. Game `ws://localhost:8787/?game=chua-3d`, admin `role=admin`. Gửi game: `event`, `chat`, `seen` (mỗi lần thả tim), `room`, `status`, `block`, `config`, `reset-scores`.
    Người giả lập (`/api/simulate`, simulator.html) được gắn `user.sim = true`.
  - `public/admin.html` (quản trị: kết nối TikTok, chặn, cấu hình game, điểm, âm thanh, Thầy, reset điểm), `public/simulator.html`, `public/livebridge-client.js`.
- **Cục B – `Games\chua-3d\`**: game chùa 3D (Three.js r128 từ CDN, script thường, không module).
  - `js/crowd.js`: camera khớp `bg.webp`, khung 9:16. InstancedMesh, 10 đệm VIP, PRAY_SPOTS. `SIZE_K = 0.6` (cỡ chung),
    `VIP_K = 1.3`, `UPPER_K = 1.2` (chỉ to ra khi đã ở khu trên). `isNpc(p)` = không có user hoặc `user.npc`.
    Đám đông 2 khối hai bên lối giữa (`AISLE`), ghế lấp theo `lvl` (cách 4 → cách 2 → kín). Không còn đi dạo tự do / né người:
    mọi di chuyển qua bước `{t:'go'}` / `home` / `spot` → `goTo()` → `route()` (khe hàng → lối giữa → `FRONT_D` → vòng `SIDE_X` → `MID_D`/`BACK_D`), đi xuyên người (ghost).
    Tên vẽ dưới chân (`projectPoint(x,0,z)`), bong bóng / "+điểm" ở đầu (`project`).
    Vị trí theo % khung game (`cushions` [[x,y]×10] + `incense` [x,y] là điểm trên sàn; `burner` [x,y] là miệng lư hương trên màn hình,
    độ sâu = chỗ quỳ + 0.62m, độ cao tính ngược để khớp màn hình; mặc định ở `defaults` file mapping + `DEFAULT_LAYOUT`):
    `applyLayout()` đổi % → sàn (`fromScreen`/`toScreen`), tính lại CROWD_D, FRONT_D, MID_D, BACK_D, SIDE_X, ROW1_D/ROW2_D, PRAY_D/PRAY_X, PRAY_SPOTS.
    main.js nhớ bố cục ở sessionStorage `chua3d.layout`, khác cấu hình thì tải lại trang. `?pick=1`: mốc đệm + bấm lấy/copy toạ độ.
    `route()`: trên→trên đi chung 1 lối dọc (không qua lối giữa), bỏ đoạn quay ngược, luôn giữ điểm đích; `dropTrailingHome()` cho người mới tặng quà đi thẳng.
    Về chỗ: bước `home` gọi `resolveHome(p)` (top 10 → đệm hạng hiện tại; ghế đang giữ → ghế đó; mất → `origSeat` nếu trống, không thì `pickSeat`; hết ghế → `p.spare`).
    Đệm top 10 giữ cố định: `p.vipRank` = số đệm, `p.topRank` = hạng thật (huy hiệu); `updateRanking()` chỉ cho người mới lọt top vào đệm trống.
    Đã test 6 tình huống (thường về chỗ cũ, mất chỗ, lọt top, rớt top về chỗ gốc, rớt top mất chỗ gốc, top 10 thắp nhang).
    Admin: bấm Áp dụng chờ `game.saved` (server trả `ignored`), hiện "Đã lưu ✓" hoặc cảnh báo LiveBridge bản cũ.
    Lớp canvas: `#tags` (tên + avatar, ui `tg`) nằm DƯỚI `#gl` (nhân vật) để người che tên; `#fx` (ui `fc`: bong bóng, "+điểm") trên cùng.
    Bong bóng tối đa 6.
    Hiện / ẩn thông báo: `show` {feedChat, feedGift, feedJoin, feedFollow, feedLike, feedShare, bubbleChat, floatPoints, nameTags, rulesBox, boardTop10, toastTop,
    liveLabel, monkGreet, monkThank, monkFollow} (`SHOW_KEYS` trong settings.js; thiếu = bật) + showChat, guideOn, monkOn. main.js `shown(k)`, ui.js `U.setShow`.
  - `js/effects.js`: cánh hoa (InstancedMesh, bảng màu pink/rose/gold), bông sen nguyên bông (sprite vẽ canvas), `E.giftRain(xu)` theo 6 mốc `GIFT_TIERS` (1/5/10/30/99/500 xu), khói nhang, hào quang.
  - `js/ui.js`: tên + avatar (canvas), bong bóng chat, "+N", thông báo `U.toast(user, text, count, kind)` ('vip' vàng) nằm **dưới bảng Top 10 bên phải**,
    khung luật + nhãn LIVE ở **góc trên trái** (`#left`), Thầy `U.monk(text)` hiện **ngay dưới khung luật** (ảnh `thay.png`/`thay.webp` nếu có, không thì SVG vẽ sẵn).
    Khung bình luận góc dưới mặc định ẩn.
  - `js/main.js`:
    - Nhân vật ảo: 20 người đầu có pháp danh (`NPC_NAMES`, id `npc:<tên>`), +1 điểm / 60 giây; còn lại không tên, không điểm.
    - Điểm: thời gian `tickSec` (+1), bình luận +1 / 20 giây, 1 xu +10. Điểm thời gian chỉ khi đang LIVE (hoặc demo) và người đó còn "thấy" trong `activeMin = 5` phút
      (`p.seenAt`: vào phòng, bình luận, tim, quà, hoặc có trong `room.present`). Không dùng `lastActive` để tính điểm (bị làm mới khi đi lên/xuống đệm).
    - Chỉ lưu localStorage điểm của id dạng số (TikTok thật) và `npc:`; người test/giả lập không lưu. Khi nối TikTok (LIVE) thì mời hết người test ra và bỏ qua sự kiện giả lập.
    - Tặng quà: **không** hiện thông báo/banner (TikTok tự hiện), chỉ hoa rơi theo xu, "+điểm", hào quang. Chỉ còn thông báo vàng "được lên đệm Top N".
    - Dòng trạng thái lỗi/kết nối ẩn (màn hình lên sóng), chỉ hiện "● LIVE"; `?debug=1` để xem lỗi.
    - Thầy (`MONK`): câu ngẫu nhiên, ~1/3 là câu follow, khoảng thời gian **và danh sách câu** lấy từ admin (`setMonk`); `MONK` trong code chỉ là dự phòng cho demo; `?monk=10` để test.
      Chào/cảm ơn theo tên: `monkReact(pri, lines, user, sec)` → hàng chờ `monkQ` (follow 3 > quà 2.x > chào 1, giữ 4, bỏ câu cũ), `greet()` mỗi người 1 lần, cách `greetGap` giây.
    - Pháp danh: follow lần đầu (`onFollow`) → `makePhapDanh(id)` (băm id, ghép `PD_A`+`PD_B`), +`POINTS.follow`; lưu localStorage `chua3d.phapdanh`; `U.pdOf(id)` để ui.js vẽ.
    - `#guide` (ui `U.guide`): dòng "tặng gì – được gì" xoay 4 giây; `GUIDE` trong main.js là dự phòng demo.
    - Cỡ chữ / vùng an toàn: CSS `--u0` (1% bề ngang), `--k` (cỡ chữ), `--u = --u0×--k` chỉ trong `#left/#side/#monk`; `--safe` (px) đẩy `#left/#side` xuống. `U.layout(uiScale, safeTop)`.
    - Tham số URL: `?demo=1`, `?debug=1`, `?monk=N`, `?npc=`, `?max=` (tối đa nhân vật trên màn hình, cứng ≤ 600), `?bridge=ws://IP:8787`.
  - `audio/`: `nhac1.m4a` (nhạc nền) + `chuong/chuong-lon/mo/niem.wav`.
- **Đóng gói gửi người khác**: `dong-goi.bat` → `tools/dong-goi.ps1` (UTF-8 có BOM) → `dist\TestGameAI.zip` (~43 MB): kèm `runtime\node.exe` + `node_modules` + `HUONG-DAN.txt`,
  không kèm `settings.json`, mặc định không kèm nhạc nền (`-WithMusic` để kèm). `start-livebridge.bat` tìm Node: `runtime\node.exe` → Node đã cài → `winget` → mở nodejs.org.
  Comment trong file `.bat` viết **không dấu** (cmd đọc sai chữ có dấu).

## Trạng thái
- Đã test bằng giả lập / demo và nối thử một kênh LIVE công khai: bình luận, vào phòng, tim, follow, số người xem, avatar, tên chạy. **Quà thật chưa kiểm chứng.**
- Tài khoản dự định: `@gocdoxinhdaily`, LIVE Studio trên PC báo **No access**; có thể LIVE bằng điện thoại (chia sẻ màn hình, mở game trên điện thoại qua WiFi với `--host=0.0.0.0` và `?bridge=ws://<IP PC>:8787`).
- Chưa kiểm chứng với LIVE thật: tính điểm theo `room.present` / `seen`, nhánh tự cài Node bằng winget, chạy gói zip trên máy Windows khác.

## Quy ước làm việc
- Test xong thì **đóng trình duyệt trong app**. **Không tắt LiveBridge tôi đang chạy**, không gửi quà / sự kiện / reset qua LiveBridge của tôi
  (test bằng `?demo=1`, hoặc chạy LiveBridge riêng ở cổng khác như `--port=8799`). Demo trong trình duyệt app: xoá `chua3d.scores.demo` sau khi test.
- Không tự ý đổi `config/settings.json`.
- Sửa code LiveBridge thì nhắc tôi khởi động lại `start-livebridge.bat`. Sửa code game thì chỉ cần tải lại trang.
- Code theo phong cách sẵn có: comment tiếng Việt, tên user gán bằng textContent (không innerHTML), cập nhật README khi thêm tính năng.

## Việc tiếp theo
<ghi yêu cầu mới ở đây>
