# Việt Nam — Quê Hương Tôi

Game cho buổi TikTok LIVE, chạy theo cơ chế cũ của LiveGames (LiveBridge).
Người xem gõ tên tỉnh, thành quê mình vào comment, bản đồ Việt Nam bay
tới tỉnh đó, tỉnh sáng lên kèm tên và avatar người gọi, MC đọc tên bạn
ấy và nhắc một món ngon, một nơi nên ghé của quê đó.

> Bản viết lại. Ý tưởng và luật chơi tham khảo repo
> `workaipvlinh-byte/viet-nam-dat-nuoc-ta-oi` (không có LICENSE,
> `private: true`) — toàn bộ code, CSS, bảng màu theme, câu MC, câu
> khen tỉnh trong game này đều do tôi viết lại từ đầu, không copy
> nguyên file hay nguyên văn câu chữ nào. Tên món ăn / địa danh là dữ
> kiện thật nên giữ ý. Dữ liệu bản đồ `vn34.json` là dữ liệu địa lý
> công khai (xem mục Nguồn bản đồ).

## Chạy

Game là file tĩnh, không có server riêng, không cần build, không cần
cài thêm gì. Chỉ cần LiveBridge đang chạy:

1. Bấm đúp `start-livebridge.bat` ở gốc repo (mở trang quản trị
   `http://localhost:8787/`).
2. Bấm bắt đầu live trên TikTok trước, rồi ở trang quản trị nhập
   username kênh đang live, bấm **Kết nối**.
3. Trong TikTok LIVE Studio, thêm nguồn **Link** (nguồn trang web),
   dán `http://localhost:8787/Games/viet-nam-que-huong/`,
   kích thước **1080 × 1920** (màn hình dọc).

## Thử trước khi live (không cần TikTok)

- Demo: `http://localhost:8787/Games/viet-nam-que-huong/?demo=1`
  — bấm **▶ Bắt đầu demo**, người giả sẽ tự gọi quê, tặng quà, thả tim.
  Nút **Qua giai đoạn** / **Vòng mới** / **Xoá đồng hương** chỉ có
  trong demo (xem mục Giới hạn).
- Giả lập LiveBridge:
  `http://localhost:8787/LiveBridge/public/simulator.html?game=viet-nam-que-huong`
  — chọn người xem, vào phòng / follow / share / thả tim / gửi bình
  luận / tặng quà theo mốc. Lưu ý: muốn test giả lập thì ngắt TikTok
  trước (đang LIVE thật thì server bỏ qua sự kiện giả lập), và điểm
  của người giả lập (`sim`) không được lưu.

## Luật chơi

- Gõ tên tỉnh, thành (có dấu, không dấu, viết tắt HN, SG, HCM, tên
  tỉnh cũ trước sáp nhập, tên thành phố, tên đảo đều được):
  **+1 điểm** cho quê, mỗi người tối đa 1 điểm mỗi 10 giây cho 1 tỉnh.
- Thả tim: **15 tim = +1 điểm** cho quê đã chọn.
- Tặng quà: 1–4 xu **+3**, 5–29 xu **+30**, 30–99 xu **+100**,
  100–999 xu **+500**, từ 1.000 xu **+3.000**. Quà càng to hiệu ứng
  càng lớn. Tặng khi chưa gõ quê thì gõ quê lúc nào được cộng bù lúc đó.
- Đủ **2.026 tim** cả phòng thì sáng cả nước 5 giây.
- Mỗi vòng **2 phút 30 giây**, tổng kết 15 giây: ba quê nhiều điểm
  nhất lên bục (dạng cột 2-1-3), người góp nhiều nhất là
  **Người thắp lửa quê**. Sang vòng mới điểm về 0. Đổi thời gian vòng
  qua config `roundSec` (60–600 giây).
- Hàng chờ ghé thăm tối đa 6 lượt thường; quà từ 30 xu chen lên đầu;
  comment cùng tỉnh đang chờ thì gộp "A và N người nữa"; tỉnh vừa
  ghé 30 giây sau mới ghé lại; mỗi lượt đứng tối thiểu 3 giây, quà
  đứng 3–8 giây theo mốc xu.
- **Đồng hương mọi buổi**: số tài khoản khác nhau từng gọi tỉnh đó,
  cộng dồn qua mọi buổi, lưu ở localStorage máy chạy game
  (`qh:fans`, demo dùng `qh:fans.demo`).

## Nhận diện tên quê

- 34 tỉnh, thành sau sáp nhập 2025, gồm tên tỉnh cũ, viết tắt,
  tên thành phố (Hạ Long, Nha Trang, Đà Lạt...), đảo gần
  (Phú Quốc, Côn Đảo, Lý Sơn...) và đảo xa (Hoàng Sa → Đà Nẵng,
  Trường Sa → Khánh Hòa).
- Chống bắt nhầm: xét dấu trước khi bỏ dấu ("chị Huệ" không phải
  Huế, "hơn là" không phải Hòn La...), đảo nhỏ phải gõ kèm chữ
  "đảo", gõ dính liền (thanhhoa, danang) vẫn nhận.
- MC không bao giờ đọc nguyên văn comment. Comment có lời cầu chúc
  (thi cử, sức khỏe, tình duyên...) thì MC chúc lại bằng câu của
  mình, tối đa 1 lần mỗi người mỗi 10 phút, cả phòng 1 lần mỗi 20 giây.

## Chỉnh game

Mọi số / câu chỉnh được nằm ở 2 chỗ (phải khớp nhau):

- `LiveBridge/config/mappings/viet-nam-que-huong.json` → mục
  `defaults`: thời gian vòng, điểm, mốc quà, giọng MC, nhạc, câu
  hướng dẫn, theme mặc định... LiveBridge gộp `defaults` này với
  `settings.json` rồi gửi cho game lúc nối vào; sửa file rồi tải lại
  trang game là nhận.
- `Games/viet-nam-que-huong/js/main.js` → `DEFAULT_CFG`: cùng các
  key trên, để game chạy được độc lập khi chưa có LiveBridge
  (demo, fallback 8 giây).

Giọng MC live: nữ HoaiMy (`vi-VN-HoaiMyNeural`, mặc định) hoặc nam
NamMinh (`vi-VN-NamMinhNeural`), đổi bằng key `voice: "F" | "M"`
trong `defaults`. Giọng đi qua `NpcVoice` của LiveBridge (có cache,
có hàng đợi 2 mức ưu tiên, tôn trọng `npcVoiceMinGapSec` /
`npcVoiceMaxPerMin` / `npcVoiceWaitMs`); voice lỗi thì chỉ hiện chữ,
game không kẹt. Giọng GV01BongBong / GV02LemLinh chỉ dùng khi làm
video, không dùng cho live.

Theme: 20 bộ màu trong `js/themes.js`, chỉ đổi màu / bo góc / font
tiêu đề, bố cục giữ nguyên. Đổi theme mặc định bằng key `theme`
trong `defaults` (vd `bien-dem`, `hoa-sen`, `co-do`...).

## Nguồn bản đồ

Ranh giới 34 tỉnh, thành lấy từ dữ liệu cộng đồng
[nguyenduy1133/Free-GIS-Data](https://github.com/nguyenduy1133/Free-GIS-Data),
đã rút gọn và bổ sung đảo. File `vn34.json` trong thư mục game này
là bản sao dữ liệu đó (giữ nguyên id / tên / màu từng tỉnh).

**Lưu ý trên màn hình (đừng xoá):** "Hình ảnh mô phỏng, vẽ thu nhỏ,
không theo tỷ lệ". Hoàng Sa, Trường Sa được vẽ thu nhỏ, đặt gần bờ
hơn thực tế cho vừa khung hình. Ranh giới tỉnh lấy từ bộ dữ liệu
cộng đồng, không phải bản đồ chính thức của nhà nước.

## Giới hạn đã biết

- LiveBridge hiện **không có kênh custom admin → game** (không có
  lệnh `skip` / `newRound` / `resetFans` từ trang quản trị), và bản
  này không sửa core LiveBridge. Nút **Qua giai đoạn / Vòng mới /
  Xoá đồng hương** chỉ có trong `?demo=1`. Reset điểm thì trang quản
  trị vẫn làm được qua lệnh reset-scores có sẵn của LiveBridge.
- Các key mới trong mapping `defaults` (vd `roundSec`, `heartGoal`)
  được game nhận qua `settings.game()` merge, nhưng trang quản trị
  chỉ hiện / lưu được key nào nó biết (allowlist trong
  `LiveBridge/src/settings.js` + `GAME_SCHEMAS` trong `admin.html`).
  Muốn sửa các key này trên admin thì phải thêm vào allowlist/schema
  của core — đó là việc sửa core, không làm trong bản này. Cách sửa
  hiện tại: sửa trực tiếp trong file mapping `defaults`, rồi tải lại
  trang game.
- "Đồng hương" lưu ở localStorage của máy chạy game (trang stage),
  không đồng bộ lên server.
- Kết nối TikTok dùng thư viện không chính thức qua LiveBridge (như
  mọi game khác trong repo). Thư viện này có thể ngừng chạy khi
  TikTok đổi giao thức; rủi ro với tài khoản, chủ kênh tự cân nhắc.
- Bộ lọc từ tục không bắt được hết. Chủ kênh vẫn phải tự để mắt và
  chịu trách nhiệm về nội dung buổi live của mình.
- Không dùng game để trao thưởng tiền / quà cho người đứng top nếu
  chưa làm thủ tục theo luật. Quà người xem tặng là thu nhập của
  người live, tự kê khai thuế theo quy định.

## Checklist bảo mật — những gì đã loại bỏ so với repo gốc

- ❌ Bỏ toàn bộ server Express riêng (port 3000), bỏ React + Vite +
  build step, bỏ Dashboard riêng, bỏ tự kết nối TikTok trực tiếp
  trong game, bỏ `/api/test` / emit thử, bỏ proxy `/api/tts` mở.
- ❌ Không `eval` / `Function` / `innerHTML` /
  `dangerouslySetInnerHTML` / `document.write` / `insertAdjacentHTML`
  ở bất cứ đâu — chỉ dùng `textContent` và `createElement`.
- ❌ Không `child_process` / `spawn` / `exec`, không `npm install`
  tự động, không secret / key / token hardcode.
- ❌ Không dùng msedge-tts hay Google TTS trong game; giọng chỉ qua
  `NpcVoice` của LiveBridge.
- ❌ Không đưa string người dùng vào `setAttribute` transform/style
  hay câu đọc khi chưa qua `speakableName` (bỏ ký hiệu, tối đa 5 từ,
  số thành chữ); tên bậy thì MC đọc "bạn", màn hình hiện "Người xem".
- ✅ Avatar chỉ chấp nhận `https://` và host `*.tiktokcdn.com` /
  `*.tiktok.com`, sai thì hiện chữ cái đầu tên.
- ✅ `localStorage` parse có `try/catch` + lọc `typeof string` +
  kiểm tra id tỉnh hợp lệ; dữ liệu hỏng thì bắt đầu từ 0, không crash.
- ✅ Bản đồ `vn34.json` được validate khi load (phải là
  `FeatureCollection`, đủ 34 tỉnh + 2 đảo, id thuộc danh sách cho
  phép), sai thì báo lỗi rõ trên màn hình thay vì crash.
- ✅ Không lưu điểm cho sự kiện giả lập (`user.sim === true`).
- ✅ Không dùng CDN ngoài khi live: bản đồ vẽ bằng projection
  Mercator tự viết trong `js/map.js`, nhạc + SFX bằng Web Audio,
  không tải script / font / ảnh từ domain lạ.

## Cấu trúc file

```
Games/viet-nam-que-huong/
  index.html            khung 720x1280, include livebridge-client + npc-voice
  css/style.css         giao dien, bien CSS theo theme
  js/main.js            luat choi, vong, hang cho, LiveBridge, demo
  js/provinces.js       34 tinh + dia danh, nhan dien ten que
  js/provinceTalk.js    mon ngon / noi ghe / loi khen tung tinh
  js/themes.js          20 theme
  js/map.js             chieu Mercator tay, camera zoom/pan
  js/effects.js         xu roi, phao hoa, phao giay, tim bay, dom sang
  js/audio.js           nhac nen + SFX bang Web Audio
  js/voice-queue.js     hang doi giong MC 2 muc uu tien (qua NpcVoice)
  js/filter.js          loc tu cam, ten de doc, loi cau chuc, chong spam
  vn34.json             du lieu ban do (xem muc Nguon ban do)
  README.md             file nay
LiveBridge/config/mappings/viet-nam-que-huong.json
  actions + join/follow/share/like/chat/gifts/giftTiers + defaults
```
