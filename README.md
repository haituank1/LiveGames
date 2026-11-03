# TestGameAI – Game tương tác TikTok LIVE

```
TikTok LIVE ──► [A] LiveBridge (Node.js) ──WebSocket──► [B] Game (trình duyệt / OBS / TikTok LIVE Studio)
                  • nhận quà, tim, bình luận, follow, share
                  • quy đổi theo "gói" của từng game
                  • gửi { action, value, user } cho game
```

```
C:\TestGameAI
├─ LiveBridge\                    ← cục A, dùng chung cho mọi game
│  ├─ server.js                   HTTP + WebSocket, phát sự kiện tới game
│  ├─ src\tiktok.js               kết nối TikTok LIVE, chuẩn hoá sự kiện
│  ├─ src\mapper.js               quy đổi sự kiện → hành động theo file mapping
│  ├─ src\settings.js             cài đặt từ trang quản trị (tài khoản, chặn, cấu hình game)
│  ├─ config\default.json         cổng, tự kết nối lại, in dữ liệu thô
│  ├─ config\settings.json        (tự tạo) tài khoản, danh sách chặn, cấu hình game
│  ├─ config\mappings\<game>.json gói quà → hành động, mỗi game một file
│  └─ public\
│     ├─ livebridge-client.js     thư viện client cho game (dùng chung)
│     ├─ admin.html               trang quản trị
│     └─ simulator.html           trang giả lập tặng quà để test
└─ Games\                         ← cục B, mỗi game một thư mục
   └─ chua-3d\
      ├─ index.html, bg.webp
      └─ js\ crowd.js (nhân vật 3D) · effects.js (hiệu ứng) · ui.js (giao diện) · main.js (xử lý sự kiện)
```

## Chạy

Bấm đúp **`C:\TestGameAI\start-livebridge.bat`**: lần đầu tự cài thư viện, rồi bật LiveBridge và mở trang quản trị.
Đóng cửa sổ đen là tắt LiveBridge.

File `.bat` tự tìm Node.js theo thứ tự: `runtime\node.exe` đi kèm → Node.js đã cài trên máy → chưa có thì tự cài bằng `winget`
(Windows 10/11), không được nữa thì mở trang nodejs.org để cài tay.

Hoặc chạy tay (tham số viết dạng `--ten=giatri`, ví dụ `--port=8788`, `--host=0.0.0.0` cho điện thoại cùng WiFi vào được):

```bash
cd C:\TestGameAI\LiveBridge
npm install
npm start -- --host=0.0.0.0
```

### Gửi cho người khác (không cần cài Node.js)

Bấm đúp **`dong-goi.bat`** → ra file `dist\TestGameAI.zip` (khoảng 45 MB không kèm nhạc nền), đã kèm sẵn `runtime\node.exe`,
thư viện `node_modules` và file `HUONG-DAN.txt`. **Không** kèm cài đặt riêng (`settings.json`: tài khoản TikTok, danh sách chặn).
Người nhận giải nén rồi bấm đúp `start-livebridge.bat` là chạy. Mặc định **không kèm nhạc nền** trong `audio` cho nhẹ
(vẫn kèm tiếng chuông, mõ, niệm; thiếu nhạc thì game tự tạo nhạc nền thiền). Muốn kèm cả nhạc: `dong-goi.bat -WithMusic`.

| Trang | Địa chỉ |
|---|---|
| **Trang quản trị** | http://localhost:8787/ |
| Game chùa (link cho OBS / LIVE Studio) | http://localhost:8787/Games/chua-3d/ |
| Giả lập tặng quà | http://localhost:8787/LiveBridge/public/simulator.html?game=chua-3d |
| Game chạy demo (không cần TikTok) | http://localhost:8787/Games/chua-3d/?demo=1 |

### Trang quản trị

- **Kết nối TikTok LIVE**: nhập username tài khoản *đang phát LIVE*, bấm Kết nối. Tích "Tự kết nối" để lần sau bật LiveBridge là tự nối.
  Có ô *Sign API key (Euler Stream)*, không bắt buộc. Nếu kết nối hay bị từ chối vì giới hạn lượt miễn phí thì đăng ký key ở eulerstream.com rồi dán vào.
- **Game**: số nhân vật ảo ngồi sẵn (cho phòng đỡ trống), tối đa nhân vật, bật/tắt khung bình luận trong game, điểm, hướng dẫn tặng quà, âm thanh, thầy.
  Bấm Áp dụng là màn hình game đổi ngay, không cần tải lại.
- **Màn hình, tốc độ & vị trí** (cột bên phải): chừa trên / hai bên cho TikTok, cỡ chữ, cỡ tên, tốc độ nhân vật, vị trí 10 đệm + lư hương.
  Có nút Áp dụng riêng (gửi chung cấu hình với khung Game).
- Bấm **Áp dụng** là lưu ngay vào `config/settings.json` (tải lại trang hay tắt / bật LiveBridge vẫn giữ). Cạnh nút hiện **"Đã lưu ✓"** khi LiveBridge xác nhận.
  Nếu hiện cảnh báo "LiveBridge không xác nhận đã lưu" hoặc "chưa hiểu: …" thì LiveBridge đang chạy bản cũ (vừa cập nhật code mà chưa bật lại):
  tắt cửa sổ đen, bấm đúp `start-livebridge.bat` rồi Áp dụng lần nữa.
- **Người xem gần đây**: avatar, tên, @username, tổng 💎, số bình luận, số tim. Có nút Chặn.
- **Đã chặn**: chặn theo @username hoặc bỏ chặn. Người bị chặn: quà, bình luận, tim bị bỏ qua, nhân vật của họ rời khỏi chùa.
- **Hoạt động trực tiếp**: dòng chảy sự kiện thật / giả.

Cài đặt được lưu ở `LiveBridge/config/settings.json`. Máy chưa có file này (vd. gói zip gửi người khác) thì dùng **mặc định = bản đã chỉnh trên LIVE thật**
(số ở `GAME_DEFAULTS` trong `LiveBridge/src/settings.js`; câu chữ, vị trí đệm ở `defaults` trong `LiveBridge/config/mappings/chua-3d.json`).

### Trong game

- Bình luận hiện thành bong bóng chat trên đầu nhân vật người đó, và ghi vào khung bình luận góc dưới trái.
- **Hiện / ẩn từng loại thông báo**: trang quản trị → cột phải → "Hiện / ẩn thông báo". **Mặc định bật hết, trừ các dòng trong khung bình luận** (TikTok đã có sẵn), bỏ tích rồi Áp dụng là ẩn ngay:
  - Khung bình luận (cả khung) và từng loại dòng trong đó: bình luận, tặng quà, vào chùa, follow, thả tim, chia sẻ.
  - Trên nhân vật: bong bóng bình luận trên đầu, "+điểm" bay lên, tên + avatar dưới chân.
  - Phía trên màn hình: khung luật điểm, bảng Top 10, thông báo "được lên đệm Top N", nhãn ● LIVE, dòng "Tặng gì – được gì".
  - Thầy: câu ngẫu nhiên / nhắc follow, chào người mới vào, cảm ơn khi tặng quà, cảm ơn khi follow.
  Câu chữ và thời gian của thầy, nội dung dòng "Tặng gì" vẫn chỉnh ở khung Game. Lưu trong `settings.json` → `show` (thiếu = bật).
- **Chỉ người có tương tác mới vào chùa**: bình luận, thả đủ 30 tim (cộng dồn), tặng quà, follow, share thì mới có nhân vật riêng (tên + avatar thật từ TikTok) và được cộng điểm.
  Chỉ vào phòng xem thôi thì chưa có nhân vật, chưa được điểm (thầy vẫn chào theo tên). Đã có nhân vật mà vào lại phòng thì vẫn tính là còn trong live.
  Chỉnh ở trang quản trị → Game → "Ai được vào chùa ngồi": **"Thả bao nhiêu tim thì được vào ngồi"** (mặc định 30, tách riêng với mốc "30 tim → lạy" trong file mapping)  và **"Vào phòng là có nhân vật"** (mặc định tắt; bật lên thì ai vào phòng cũng có nhân vật như bản cũ). Trong câu khung luật / "Tặng gì" viết `{tim}` để tự hiện đúng số tim.
- **Thông báo lên đệm top** (vàng) hiện ngay dưới bảng Top 10, bên phải tượng Phật. Tặng quà thì không hiện thông báo hay banner (TikTok tự hiện), game chỉ làm hiệu ứng hoa rơi, hào quang, "+điểm".
  Thông báo trượt vào từ phải, viền sáng nhấp nháy, có vệt sáng lướt qua, tối đa 4 dòng, mỗi dòng 4 giây.
- **Hoa rơi khi tặng quà**, mốc xu càng cao hoa càng nhiều, càng đẹp (sửa `GIFT_TIERS` trong `js/effects.js`):

  | Tổng xu của lần tặng | Hiệu ứng |
  |---|---|
  | 1–4 | Mưa cánh sen hồng nhẹ |
  | 5–9 | Thêm cánh hồng đỏ |
  | 10–29 | Thêm vài bông sen nguyên bông |
  | 30–98 | Mưa dày, có cánh vàng, nhiều bông sen |
  | 99–499 | Mưa cánh vàng + bông sen vàng |
  | 500+ | Mưa vàng rất dày, bông sen vàng khắp chùa, hào quang + loé sáng |

- **Thầy hiện lên nói**: cứ 15–18 giây (mặc định), thầy hiện ngay dưới khung luật điểm (góc trên trái) nói một câu về chùa (kèm tiếng chuông nhỏ), khoảng 1/3 số lần là
  câu nhắc follow ("Follow thầy để thầy đặt pháp danh cho con nhé 🙏"). Bật/tắt và **mỗi bao lâu hiện một lần** (từ … đến … giây, ngẫu nhiên trong khoảng) chỉnh ở trang quản trị → Game → "Thầy hiện lên nói", bấm Áp dụng.
  **Câu thầy nói** sửa ngay ở trang quản trị, cùng mục đó: ô "Câu nhắc follow" (để trống = không nhắc follow) và ô danh sách câu,
  **mỗi dòng một câu** (dòng trống tự bỏ, tối đa 100 câu). Bấm Áp dụng là game đổi ngay. Xoá trống ô danh sách rồi Áp dụng là quay về câu mặc định.
  Câu mặc định nằm ở `defaults` trong `LiveBridge/config/mappings/chua-3d.json`; `MONK` trong `js/main.js` chỉ là bản dự phòng khi chạy `?demo=1` không có LiveBridge.
  Muốn dùng ảnh thầy thật thì bỏ file `thay.png` (hoặc `thay.webp`, nền trong suốt) vào `Games/chua-3d/`. Thử nhanh: `?monk=10` (10 giây một lần).
- **Thầy chào và cảm ơn theo tên**: người mới vào phòng được chào ("Chào con Xuân Mai đã ghé chùa 🙏"), tặng quà được cảm ơn, follow được đặt pháp danh.
  Có hàng chờ ưu tiên: follow > quà (quà to trước) > chào người mới. Mỗi câu hiện vài giây rồi tới câu sau, chỉ giữ 4 câu chờ;
  câu chờ quá lâu thì bỏ (chào quá 15 giây, cảm ơn quá 40 giây) để thầy không nói chuyện cũ. Mỗi người chỉ được chào 1 lần,
  và hai lần chào cách nhau ít nhất 10 giây (live đông người vào liên tục). Lúc thầy đang chào/cảm ơn thì câu ngẫu nhiên lùi lại.
  Trang quản trị → Game: bật/tắt, số giây giữa hai lần chào, và 3 ô câu (mỗi dòng một câu): chào, cảm ơn quà, follow.
  Trong câu dùng `{ten}` = tên người xem, `{phapdanh}` = pháp danh vừa đặt.
- **Follow được pháp danh**: follow lần đầu được thầy đặt một pháp danh (ví dụ "Diệu Hòa", cố định theo người), **+100 điểm** (chỉnh ở "Follow + điểm"),
  nhân vật loé hào quang. Pháp danh hiện màu vàng sau tên trên đầu nhân vật (người trên đệm chỉ có 🪷 cho gọn), tên trong bảng Top 10 có 🪷.
  Bỏ follow rồi follow lại không được cộng nữa. Pháp danh lưu trong trình duyệt chạy game (như điểm, chỉ người xem TikTok thật), **reset bảng điểm không xoá pháp danh**.
  Danh sách chữ ghép pháp danh: `PD_A`, `PD_B` trong `js/main.js`.
- **Dòng "Tặng gì – được gì"**: dòng vàng ngay dưới khung luật, mỗi 4 giây đổi một câu (🌹 Tặng Hoa hồng (1 xu) → lên thắp nhang…),
  để người mới vào biết tặng gì thì nhân vật làm gì. Sửa ở trang quản trị → Game → "Hướng dẫn tặng quà", mỗi dòng một câu;
  nên viết đúng tên quà người xem thấy trong app TikTok. Đổi mốc quà trong file mapping thì nhớ sửa luôn các dòng này.
- **Màn hình trên điện thoại** (đo từ ảnh chụp LIVE thật trên iPhone):
  - Phía trên ≈ 12.5% bị TikTok che: hàng avatar chủ kênh + nút Follow + số người xem, rồi hàng "Bảng xếp hạng hằng ngày", mục tiêu quà, huy hiệu.
  - Hai bên bị cắt ≈ 9% mỗi bên: màn hình điện thoại dài hơn 9:16 nên TikTok phóng cho đầy chiều cao rồi cắt bớt hai mép.
  - Từ ≈ 66% chiều cao trở xuống là khung bình luận + ô nhập của TikTok.
  - Trang quản trị → Game: "Chừa phía trên cho TikTok (%)" (mặc định 5%) và "Chừa hai bên (%)" (mặc định 3%) đẩy khung luật, thầy,
    bảng Top 10 và thông báo lên đệm vào vùng không bị che. Khung luật và bảng Top 10 luôn ngang hàng nhau.
    Xem trên máy tính (OBS / LIVE Studio) sẽ thấy hở ở trên và hai bên: đó là phần điện thoại bị che / cắt.
  - "Cỡ chữ (%)" (mặc định 120%) phóng to khung luật, Top 10, thông báo, thầy, bong bóng chat, "+điểm". Quá 140% thì khung luật xuống dòng, sát bảng Top 10.
  - Cột trái: khung luật → dòng "tặng gì – được gì" → thầy (bong bóng lời nói ở trên, hình thầy ở dưới).
    Cột phải: bảng Top 10 → thông báo vàng "được lên đệm Top N". Hai cột không đè nhau.
- **Tên nhân vật nằm dưới chân**, chữ nhỏ (đông người vẫn nhìn rõ người, không bị chữ che). Bong bóng chat và "+điểm" vẫn hiện trên đầu.
  Cỡ tên chỉnh ở "Cỡ tên dưới nhân vật (%)" (mặc định 100%).
- **Ưu tiên thấy người hơn chữ**: lớp tên (tên + avatar) nằm **dưới** lớp nhân vật 3D. Người ngồi đè lên đoạn nào của tên thì đoạn đó bị che,
  chỗ không bị che vẫn hiện đủ. Bong bóng chat và "+điểm" ở lớp trên cùng nên luôn thấy. Chat dồn dập thì chỉ giữ 6 bong bóng mới nhất.
  (3 lớp canvas trong `index.html`: `#tags` → `#gl` (nhân vật) → `#fx`.)
- **Tốc độ nhân vật**: trang quản trị → Game → "Tốc độ đi lại (%)" (mặc định 300%) và "Tốc độ lạy, đứng dậy, quỳ (%)" (mặc định 200%).
  100% = chậm rãi như bản cũ. Bấm Áp dụng là đổi ngay. Thời gian ngồi yên giữa các lần lạy không đổi.

**Đưa lên livestream:** trong OBS hoặc TikTok LIVE Studio, thêm nguồn *Browser* / *Link* với URL `http://localhost:8787/Games/chua-3d/`, kích thước **1080×1920**.
Game làm sẵn đúng tỉ lệ 9:16 nên phủ kín khung dọc của TikTok: ảnh nền giữ nguyên bề ngang, cắt bớt trần phía trên và phần sàn trống phía dưới.
Đổi tỉ lệ cắt ở `CROP_TOP` trong `Games/chua-3d/js/crowd.js`.

Tham số URL của game chùa (ghi đè trang quản trị, dùng khi test): `?npc=60`, `?max=500`, `?bridge=ws://localhost:8787`, `?demo=1`, `?debug=1`.

Màn hình game là thứ lên sóng, nên nhãn **● LIVE @tên kênh** đã bị **ẩn hẳn** bằng CSS (`#status.ok` trong `index.html`): TikTok thấy chữ LIVE + tên kênh trong hình dễ tưởng phát lại / copy live cũ. Các trạng thái đang nối,
mất kết nối hay lỗi (ví dụ "Tài khoản này đang không LIVE") **không hiện ra cho người xem**; xem ở trang quản trị,
hoặc mở game với `?debug=1` khi cần kiểm tra.

## Gói quà → hành động

Sửa ngay ở trang quản trị → **Gói quà & hành động** (chọn hành động từ danh sách, bấm **Lưu gói quà**, có hiệu lực ngay, không cần tải lại game):
- Vào phòng, Follow, Chia sẻ, Thả tim (mỗi N tim), Bình luận khớp câu (regex, kèm chống spam), Quà theo tên (kèm số xu), Quà theo số xu (từ X xu trở lên, mốc lớn nhất khớp trước).
- **Combo (giả lập)**: số lượng mỗi lần bấm thử trên `simulator.html` cho từng quà / mốc. Không ảnh hưởng quà thật.
- **Trang quản trị có 2 tab**: *Cấu hình LiveBridge* (kết nối TikTok, chặn, người xem, hoạt động) và *Cấu hình game* (mỗi game một tab con). Trong tab game, thanh **💾 Lưu config** ghim trên cùng khi cuộn: một nút lưu cả cấu hình game lẫn gói quà. Các ô được nhóm (Nhân vật, Điểm, Mốc, Định kỳ, Nền, Gói quà, Hướng dẫn, Thầy, Âm thanh, Màn hình, Vị trí đệm, Hiện/ẩn thông báo); nhóm gập / mở được.
- **Mốc điểm → hiệu ứng** (mục "Mốc điểm → hiệu ứng"): theo bội số, kích hoạt mỗi khi điểm vượt qua một bội số (vượt 100, 200, 300… đều tính, cộng nhiều một lúc chỉ kích hoạt một lần):
  - *Điểm từng người*: mỗi X điểm (mặc định 100) → người đó được hiệu ứng (mặc định hoa rơi `petal`).
  - *Tổng điểm cả chùa*: mỗi Y điểm (mặc định 1000) → cả chùa được hiệu ứng (mặc định sen rơi `lotus` + ánh vàng `glow`; tối đa 60 người cùng lúc).
  - Hiệu ứng lấy từ danh sách hành động của gói quà; có thêm `petal` (hoa rơi nhẹ) và `glow` (ánh vàng quanh thân) để dùng cho mốc.
- **Định kỳ theo thời gian**: cứ mỗi "Mỗi (giây)" thì số người ngẫu nhiên trong chùa làm hành động (chỉ khi đang LIVE).
- **Đổi nền theo số người xem** (mục "Đổi nền theo số người xem"): mỗi dòng "Khi đạt (người xem)" + "Ảnh nền" (chọn từ mọi file `bg*.webp` trong `Games/chua-3d/`; thêm ảnh mới vào thư mục thì làm mới trang quản trị là hiện). Dùng mốc cao nhất đã đạt; dưới mốc nhỏ nhất thì về `bg.webp`. Khi LIVE thật dùng số người xem của TikTok; khi giả lập / demo thì đếm người đã tương tác trong 5 phút. Nền chuyển mờ dần. Ảnh nền nên cùng khung 915×2000 như bg-1…bg-3 để đệm và nhân vật khớp.
- Có thể làm tay: sửa `LiveBridge/config/mappings/chua-3d.json`, file được đọc lại tự động khi lưu. Lưu từ trang quản trị ghi lại file này (các phần `defaults`, `actions`, `description` giữ nguyên, nhưng file được ghi lại theo định dạng JSON chuẩn nên mất xuống dòng gọn của mảng toạ độ).

| Nguồn | Mặc định | Hành động |
|---|---|---|
| Vào phòng | `join` | Thầy chào; chưa tạo nhân vật (phải bình luận / tim / quà mới vào chùa) |
| Quà 1+ xu | `incense` | Đi lên lư hương thắp nhang, lạy 3 lạy, về chỗ |
| Quà 5+ xu | `bow` ×3 | Lạy Phật |
| Quà 10+ xu | `lotus` | Lên lễ Phật (hoa rơi theo số xu, xem trên) |
| Quà 99+ xu | `golden` | Hào quang vàng + loé sáng (hoa rơi theo số xu) |
| Quà theo tên (`gifts`) | Rose → `incense`, Doughnut → `lotus` | Ưu tiên hơn bậc xu |
| 30 tim | `bow` | Lạy 1 lạy |
| Bình luận "nam mô a di đà phật" / "thắp nhang" / "đi" | `bow` / `incense` / `walk` | Có thời gian chờ 5 giây mỗi người |
| Follow / Share | `bow` / `lotus` | Follow: thêm pháp danh + điểm (xem trên) |

`value` × `count` (số combo) = cường độ hành động, ví dụ số lạy hoặc độ dày mưa hoa.

### Điểm công đức

| Cách | Mặc định |
|---|---|
| Ở trong live | +1 công đức mỗi 5 giây |
| Bình luận | +5 công đức (tối đa 1 lần / 20 giây, chống spam) |
| Tặng quà | +50 công đức cho mỗi 1 xu |
| Follow | +100 công đức, mỗi người 1 lần (kèm pháp danh) |

- Chỉnh luật trên trang quản trị → Game → "Điểm công đức", bấm Áp dụng là đổi ngay. Luật đang dùng hiện ở góc trên trái màn hình game (bảng top 10 ở góc trên phải).
- **Câu chữ khung luật** (mặc định "⏱ Mỗi 10 giây: +1 công đức"…) sửa ở ô "Khung luật trên màn hình", mỗi dòng một câu.
  `{giay}` `{diem}` `{binhluan}` `{xu}` `{follow}` `{tim}` tự thay bằng số đang dùng; dòng có số bằng 0 thì tự ẩn. Xoá trống là quay về mặc định
  (`rulesLines` trong `defaults` của `LiveBridge/config/mappings/chua-3d.json`). Câu dài quá thì khung xuống dòng, nên viết ngắn.
- **Nhân vật ảo**: 20 người đầu mang pháp danh (Tu Tâm, Tích Đức, Thiện Tâm…), hiện tên trên đầu và được tính điểm,
  nhưng chậm hơn hẳn: **+1 điểm mỗi 60 giây**, không có điểm bình luận hay quà. Người xem thật vì thế dễ vượt lên top 10.
  Các nhân vật ảo còn lại không tên, không điểm. Danh sách tên `NPC_NAMES` và tốc độ `npcTick` / `npcTickSec` (trong `POINTS`)
  nằm ở `Games/chua-3d/js/main.js`.
- TikTok không báo khi người xem rời phòng, nên điểm thời gian chỉ tính cho ai còn **thấy trong live 5 phút gần nhất**: vào phòng, bình luận,
  thả tim (kể cả chưa đủ mốc), tặng quà, hoặc nằm trong danh sách người xem top mà TikTok gửi về định kỳ.
  Thoát live thì sau tối đa 5 phút ngừng cộng; vào lại (hoặc tương tác) thì cộng tiếp. Hết LIVE / mất kết nối TikTok thì không ai được cộng
  điểm thời gian, kể cả nhân vật ảo. Số phút: `activeMin` trong `POINTS` ở `Games/chua-3d/js/main.js`.
- **Người vắng tự rời chùa**: ai không "thấy" (như trên) quá **10 phút** thì nhân vật đứng dậy đi ra khỏi chùa cho đỡ chật, **vẫn giữ điểm**;
  tương tác lại thì vào chùa lại. Người đang trên đệm Top 10 và nhân vật ảo không bị mời ra. Mỗi 5 giây chỉ mời ra tối đa 3 người
  (không cả đoàn đứng dậy cùng lúc). Chỉnh ở trang quản trị → Game → "Vắng quá (phút) thì rời chùa", **0 = không bao giờ**.
- Mỗi lần được cộng điểm từ quà/bình luận có chữ "+N" bay lên trên đầu nhân vật.
- Điểm được lưu trong trình duyệt đang chạy game (OBS/LIVE Studio), tắt mở lại không mất. Nút "Reset bảng điểm" trên trang quản trị để bắt đầu lại.
- Chỉ lưu điểm của người xem TikTok thật và nhân vật ảo có tên. Người giả lập / test (trang giả lập, `/api/simulate`)
  vẫn lên bảng lúc test nhưng **không được lưu**: tải lại trang game là họ biến mất khỏi bảng.
- Khi LiveBridge báo đã nối TikTok (đang LIVE thật), game tự mời hết người test còn trong chùa ra, xoá điểm của họ,
  và **bỏ qua mọi sự kiện giả lập** cho tới khi ngắt kết nối. Muốn test bằng trang giả lập thì ngắt TikTok trước.

### Âm thanh

Game tự phát âm thanh, OBS / TikTok LIVE Studio thu luôn tiếng của nguồn Browser:

| Sự kiện | Tiếng |
|---|---|
| Luôn luôn | Nhạc nền thiền (lặp lại) |
| Quà Dâng hương | Chuông nhỏ; mõ lúc nhân vật cắm nhang |
| Quà Lễ Phật | Tiếng niệm "Nam mô A Di Đà Phật" |
| Quà Hoa sen | Chuông + tiếng niệm |
| Quà lớn (Thắp sáng) | Chuông lớn + tiếng niệm |
| Bình luận "nam mô…" / thả tim | Chỉ gõ mõ (đỡ ồn) |

- **Nhạc nền**: thả bao nhiêu bài cũng được vào `Games/chua-3d/audio/`, tên gì cũng được (mp3, m4a, ogg, wav, flac...).
  Game phát lần lượt theo tên, hết thì quay lại; trang quản trị có "Phát ngẫu nhiên".
  Nhạc phát trực tiếp từ file nên bài dài, file lớn vẫn nhẹ. Đã thử với một bài m4a dài 86 phút.
- **Hiệu ứng**: file `niem`, `chuong`, `chuong-lon`, `mo` (đuôi gì cũng được), xem `audio/README.txt`.
  Có sẵn bản `.wav` tạo bằng `node tools/make-sfx.mjs`. `niem.wav` chỉ là tiếng tụng tạm không có lời, nên thu giọng thật để thay.
  Có file thì phát file; thiếu file nào thì game tự tạo âm thanh thay thế.
- Thêm hoặc đổi file xong thì tải lại trang game (trong OBS: Refresh nguồn Browser).
- Chống nhiễu: tiếng niệm chỉ phát cho quà từ **6 xu** trở lên (mốc riêng, không đổi mốc quà của game).
  Mỗi lần niệm cách nhau ít nhất **6 giây**, không xếp hàng. Trong lúc niệm không chen chuông nhỏ hay mõ.
  Quà nhỏ hơn mốc, hoặc tới khi đang niệm, chỉ đánh chuông (chuông cách nhau ≥ 1.2 giây).
- Lúc niệm, nhạc nền chỉ nhỏ xuống còn **90%** chứ không tắt. Cả 3 con số chỉnh ở trang quản trị → Game → Âm thanh.
- Trang quản trị: bật/tắt nhạc nền, chuông/mõ, tiếng niệm; kéo âm lượng là game đổi ngay.
- Mở game bằng Chrome thường thì phải bấm nút "🔈 Bấm để bật âm thanh" một lần (trình duyệt chặn tự phát tiếng). OBS và LIVE Studio không chặn.
- Bản quyền: dùng nhạc miễn phí bản quyền hoặc tự thu, tránh bị TikTok tắt tiếng hay cảnh báo buổi LIVE.

### Top 10 công đức – 10 đệm đỏ

- Xếp hạng theo tổng điểm công đức ở trên. Bảng Top 10 chỉ ghi số, không kèm chữ "đ".
- Top 10 lên ngồi 10 đệm đỏ trong ảnh nền. Hạng 1 ngồi giữa hàng sau (gần Phật nhất), hạng 2-5 hai bên hàng sau, hạng 6-10 ở hàng trước.
  Người trên đệm được vẽ to hơn và có huy hiệu số hạng cạnh tên.
- **Đệm giữ cố định**: thứ tự đệm ở trên chỉ áp dụng lúc xếp chỗ ban đầu. Sau đó ai **vẫn còn trong top 10 thì ngồi yên trên đệm của mình**,
  thứ hạng thay đổi chỉ đổi số trên huy hiệu và bảng Top 10, không đổi chỗ cho nhau (tránh cả hàng đệm đứng dậy đi lung tung).
  Người mới lọt top lấy đúng đệm vừa trống của người rớt top (nhiều người cùng lọt thì hạng cao hơn lấy đệm số nhỏ hơn).
- Rớt khỏi top 10 thì đứng dậy, xuống ngồi lại với đám đông. Bảng xếp lại tối đa mỗi 1.5 giây.
- **Về chỗ sau khi thắp nhang / lên lễ / đi dạo** (quyết định lúc bắt đầu quay về, theo tình trạng mới nhất):
  1. đang trong top 10 → về đúng đệm của hạng hiện tại (vừa lọt top lúc đang thắp nhang thì về thẳng đệm);
  2. không thì về **chỗ ngồi cũ** – chỗ được giữ cho người đó trong lúc đi, người khác không lấy;
  3. mất chỗ (vd. lên top 10 thì trả chỗ ngồi, rớt top lúc chỗ đó đã có người) → về chỗ gốc nếu còn trống, không thì tìm ghế trống khác.
  Rớt khỏi top 10 cũng theo đúng thứ tự này. Hàm `resolveHome()` trong `Games/chua-3d/js/crowd.js`.
- Sàn chia hai khu:
  - **Khu dưới**: đám đông quỳ thành **2 khối hai bên, chừa lối đi ở giữa**, hàng thẳng cột thẳng. Hàng đầu sát dưới hàng đệm trước, không che 10 đệm.
    Ít người thì ghế được lấp rải đều cả hai khối (trước hết cách 4 hàng 4 cột, rồi cách 2, rồi lấp kín), nên vẫn thẳng hàng mà không dồn một chỗ.
  - **Khu trên** (quanh và sau 10 đệm): không ai ngồi thường trực. Chỉ có top 10 trên đệm, người đang lên lễ và người đi thắp nhang.
- **Đi lại có nề nếp**, không đi tắt qua người ngồi, không cắt ngang khu đệm:
  - Rời chỗ: đi theo khe trước hàng của mình ra **lối giữa**, đi theo lối giữa lên lối ngang trước hàng đệm.
  - Lên khu trên: **đi vòng hai bên khu đệm** (lối dọc sát mép ngoài khối đệm). Đệm hàng sau vào bằng khe giữa 2 hàng đệm;
    lư hương / chỗ lễ phía sau đệm vào bằng lối sau đệm. Về chỗ thì đi ngược lại đúng đường đó.
  - Người mới vào đi từ dưới lên theo lối giữa rồi rẽ vào hàng. Nhân vật tự đi dạo (hoặc bình luận "đi") chỉ đi trên lối giữa rồi về chỗ.
  - Các lối (`FRONT_D`, `MID_D`, `BACK_D`, `SIDE_X`) tự tính theo vị trí đệm (hàm `applyLayout()` trong `crowd.js`); đường đi tính ở hàm `route()`.
- **Chỉnh vị trí 10 đệm và lư hương** ở trang quản trị → khung "Màn hình, tốc độ & vị trí", không cần sửa code:
  - Toạ độ tính theo **% khung game**: x = % từ trái sang, y = % từ trên xuống (đúng như nhìn thấy trên màn hình).
  - Ô "10 đệm": đúng 10 dòng `x, y` theo thứ tự hạng 1 → 10 – điểm **trên sàn** chỗ người top 10 quỳ.
  - Ô "Miệng lư hương": bấm **đúng vào cái lư** như nhìn thấy (lư đặt trên bàn, không phải trên sàn) – khói nhang bốc lên ở đó.
  - Ô "Chỗ quỳ thắp nhang": điểm **trên sàn** chỗ người quỳ thắp nhang. Phải ở phía sau hàng đệm sau
    (người thắp nhang đi vòng qua lối sau đệm); đặt trước hàng đệm sau thì game tự đẩy ra ngay sau hàng đệm sau.
  - Lấy toạ độ nhanh: bấm "Mở chế độ lấy toạ độ ↗" (game mở với `?pick=1`). Số 1–10 là vị trí đệm, 🔥 là miệng lư hương,
    🙏 là chỗ quỳ thắp nhang đang dùng; bấm vào đâu thì hiện và **copy sẵn** `x, y` để dán vào trang quản trị.
  - Bấm Áp dụng: màn hình game tự tải lại. Lối đi vòng hai bên, khe giữa 2 hàng đệm, lối sau đệm, chỗ lễ hai bên / sau đệm
    và mép trên đám đông tự tính lại theo vị trí mới. Sai định dạng (không đủ 10 dòng...) thì trang quản trị báo, không gửi.
  - Xoá trống các ô rồi Áp dụng là quay về vị trí mặc định (khớp ảnh nền gốc, nằm ở `defaults` trong `LiveBridge/config/mappings/chua-3d.json`).
- Đi lại trong khu trên (vd. từ đệm top 10 ra thắp nhang rồi về) đi theo lối dọc một bên, không quay ra lối ngang phía trước.
  Người mới vào mà tặng quà ngay thì đi thẳng tới chỗ lễ / lư hương, không lên chỗ ngồi trước rồi mới đi.
- Tặng quà Lễ Phật / Hoa sen / Thắp sáng: đi lên một chỗ lễ ở khu trên (hai bên hoặc phía sau đệm), quỳ lạy, rồi về lại chỗ cũ.
  Top 10 thì lạy ngay trên đệm. Dâng hương thì lên lư hương, thắp nhang, lạy 3 lạy rồi về.
- Nhân vật mặc áo tràng lam (xám xanh / xám tím, `ROBE_COLORS` trong `crowd.js`), đa số tóc búi, một số tóc ngắn, ít người cạo trọc.
- Lên tới khu trên, nhân vật to ra vừa đủ để phân biệt (người trên đệm ×1.3, người lên lễ / thắp nhang ×1.2);
  lúc còn đi ngang khu dưới thì giữ cỡ thường. Về khu dưới thì nhỏ lại.
- Cỡ nhân vật chỉnh chung bằng `SIZE_K` ở đầu `Games/chua-3d/js/crowd.js` (đang là 0.6); mức to ra ở khu trên chỉnh bằng `VIP_K`, `UPPER_K`.
- Đổi ảnh nền thì phải căn lại phối cảnh (`HORIZON`, `FOCAL`, `CAM_H` ở đầu `Games/chua-3d/js/crowd.js`),
  còn vị trí đệm / lư hương chỉnh ở trang quản trị như trên.

## Giao thức A → B

Game kết nối `ws://localhost:8787/?game=<id-game>`. LiveBridge gửi JSON:

```jsonc
// khi kết nối
{ "type": "hello", "game": "chua-3d", "mapping": { ... } }
// trạng thái TikTok: idle | connecting | connected | disconnected | ended | error
{ "type": "status", "tiktok": { "state": "connected", "username": "abc" } }
// hành động đã quy đổi
{
  "type": "event", "id": 12, "game": "chua-3d",
  "action": "incense", "value": 1, "count": 3, "label": "Dâng hương", "diamonds": 3,
  "user":   { "id": "6812...", "uniqueId": "abc", "nickname": "Xuân Maii", "avatar": "https://..." },
  "source": { "kind": "gift", "giftId": 5655, "giftName": "Rose", "diamonds": 1, "simulated": false },
  "ts": 1730000000000
}
```

Game có thể gửi lên `{ "type": "simulate", "event": { "kind": "gift", "user": {...}, "giftName": "Rose", "diamonds": 1, "count": 1 } }`
để giả lập. Hoặc dùng HTTP: `POST /api/simulate` với cùng nội dung `event`.

## Thêm game mới

1. Tạo thư mục `Games\<id-game>\` với `index.html`.
2. Nhúng client: `<script src="../../LiveBridge/public/livebridge-client.js"></script>`
3. Kết nối:
   ```js
   new LiveBridgeClient({ url: 'ws://localhost:8787', game: '<id-game>' })
     .on('event', e => { /* e.action, e.value, e.count, e.user */ })
     .connect();
   ```
4. Tạo `LiveBridge\config\mappings\<id-game>.json` (copy từ `chua-3d.json`), đặt tên action theo game của bạn.

## Lưu ý

- `tiktok-live-connector` là thư viện **không chính thức**: nó đọc dữ liệu LIVE công khai và có thể hỏng khi TikTok thay đổi.
  `src/tiktok.js` đã hỗ trợ cả API v1 lẫn v2. Nếu kết nối báo lỗi ký (sign), xem README của thư viện để lấy API key
  rồi đặt vào `config/default.json` → `tiktok.connectionOptions`.
- Chỉ nhận sự kiện khi tài khoản **đang LIVE**.
- LiveBridge mặc định chỉ nghe trên `127.0.0.1`. Muốn máy khác trong mạng LAN truy cập thì đổi `host` thành `0.0.0.0`.

## Game đám cưới online (Games/dam-cuoi)

Game thứ hai, dùng chung LiveBridge: người xem bình luận `@tên người thương` thì cả hai cùng lên
sân khấu làm cặp đôi, MC dẫn chương trình, quà tặng bắn pháo hoa / mưa hoa, và sảnh cưới **nâng cấp
theo mốc mắt xem** (100 / 300 / 500 / 1.000 / 2.000). Chạy thử: mở
http://localhost:8787/Games/dam-cuoi/?demo=1 — chi tiết trong `Games/dam-cuoi/README.md`.

## Game sàn nhảy (Games/san-nhay)

Game thứ ba, dùng chung LiveBridge: mọi người xem thành một dancer chibi trên sàn nhảy, chia
**6 lớp nhân vật** (Đại Gia, Idol, DJ, Dân Quẩy, Mascot Vịt, Tân Binh — mỗi lớp một hình, một điệu
nhảy, một màu hiệu ứng), dancer lên bục giữa **nhảy solo kiểu Audition** (phím ←↑↓→, chấm
PERFECT/GREAT/COOL/MISS + combo), thanh **Party Energy** đầy thì cả sàn quẩy Party Max, quà vừa
**nổ hũ vàng**, quà từ 99 xu **đổ bộ lên bục có cánh + hào quang**, bảng vàng tuần phong
Chủ Tịch Sàn / Phó Chủ Tịch / Thư Ký. Chạy thử: mở
http://localhost:8787/Games/san-nhay/?demo=1 — chi tiết trong `Games/san-nhay/README.md`.
