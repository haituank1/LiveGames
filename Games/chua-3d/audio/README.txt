Âm thanh của game Chùa 3D
==========================

NHẠC NỀN: thả bao nhiêu bài cũng được, tên gì cũng được (ví dụ nhac1.m4a, nhac2.mp3...).
Game phát lần lượt theo tên (hoặc ngẫu nhiên nếu bật "Phát ngẫu nhiên" ở trang quản trị),
hết bài cuối thì quay lại bài đầu. Hỗ trợ mp3, m4a, aac, ogg, opus, wav, flac.
Bài dài / file lớn không sao: nhạc được phát trực tiếp từ file, không tải hết vào bộ nhớ.
Chưa có bài nào thì game dùng nhạc nền tự tạo (tiếng ngân trầm + chuông gió).

HIỆU ỨNG: đặt đúng tên dưới đây (đuôi gì cũng được: .mp3, .m4a, .wav...).
Có file thì game phát file; thiếu file nào thì game tự tạo âm thanh thay thế nên vẫn chạy được.

Các file .wav có sẵn (chuong, chuong-lon, mo, niem) được tạo bằng máy:
  node C:\TestGameAI\tools\make-sfx.mjs           tạo lại file nào đang thiếu
  node C:\TestGameAI\tools\make-sfx.mjs --force   tạo lại tất cả
niem.wav chỉ là tiếng tụng tạm (ngân theo nhịp "Nam-mô-A-Di-Đà-Phật", không có lời).
Muốn thay bằng tiếng thật: xoá file .wav cũ, bỏ file mới cùng tên vào (ví dụ niem.mp3).

  niem.mp3        Tiếng niệm "Nam mô A Di Đà Phật" – phát khi tặng quà Lễ Phật / Hoa sen / Thắp sáng
                  (chưa có file thì thay bằng 3 tiếng mõ + tiếng ngân "ôm")
  chuong.mp3      Tiếng chuông nhỏ – khi tặng quà Dâng hương / Hoa sen
  chuong-lon.mp3  Tiếng chuông lớn – khi tặng quà lớn (Thắp sáng)
  mo.mp3          Tiếng mõ – lúc cắm nhang, và khi bình luận / thả tim làm nhân vật lạy

Lưu ý bản quyền: TikTok có thể tắt tiếng hoặc cảnh báo buổi LIVE nếu phát nhạc có bản quyền.
Nên dùng nhạc miễn phí bản quyền hoặc tự thu tiếng niệm bằng giọng của mình.

Mẹo: tiếng niệm nên dài 2-4 giây, cắt sạch khoảng lặng đầu/cuối, âm lượng vừa phải.
Âm lượng nhạc nền / hiệu ứng chỉnh ở trang quản trị LiveBridge (mục Game).
Sau khi thêm/đổi file, tải lại trang game (hoặc bấm Refresh nguồn Browser trong OBS).
