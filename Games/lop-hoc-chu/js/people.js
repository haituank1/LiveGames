/* Lớp học chữ — người: cô Ngân (ảnh anime 2D, áo đỏ, kính tròn, tay
   cầm cờ đỏ + tay chỉ sang phải vào bảng) + học sinh ngồi nhìn từ
   SAU LƯNG. Ghế ngồi theo thứ hạng điểm: hàng trên = điểm cao nhất.
   20 ghế (4 hàng × 5, theo user chốt 2026-11-06 tối — 1 dãy ghế 5 hs).
   Ghế lấy ĐÚNG ghế vẽ sẵn trong ảnh nền (không ghép thêm ảnh ghế —
   bài học v8–v10: ghế/bàn ghép riêng nhìn như tủ):
   - Đỉnh bàn các hàng (ĐO từ ảnh nền v16, xem BG-LAYOUT.md):
     y 49,6 / 56,9 / 65,2 / 74,0; chip tên ĐÈ LÊN mặt bàn (chipY =
     đỉnh bàn − 0,2%, như ảnh họ — chip nằm trên mặt trước bàn, không
     nằm dưới bàn như v15/v16 trước).
     Học sinh ngồi CHÌM xuống: eo (đáy hình) nằm DƯỚI mặt bàn (đáy
     hình = đỉnh bàn + ~12px, đúng mép trước mặt bàn).
   - KHÔNG dùng mặt nạ mờ dần nữa (v16): mờ dần làm thân dưới trong
     suốt, nhìn như bóng ma (user chỉ 2026-11-06 tối). Thay bằng dải
     mặt bàn che thân dưới: 4 div .deskstrip trong index.html cắt đúng
     vùng mặt bàn từ ảnh nền (cùng ảnh, cùng vị trí → khớp tuyệt đối),
     z-index 8, nằm trên học sinh (z 7), dưới chip (z 12) — thân dưới
     bị mặt bàn che khuất, cắt sắc như ảnh họ, không còn mờ, không
     còn đường cắt thẳng lộ ra (mép cắt nằm sau mặt bàn).
   - KHÔNG cắt cứng (clip-path) nữa: cắt cứng để lại đường cắt thẳng
     ngang eo, nhìn như người bị chặt ngang ở ghế (user chỉ). Bài học
     v13→v14 từng cho rằng chỉ có mờ dần mới giống khuất sau bàn —
     nhưng mờ dần lại làm thân dưới trong suốt như bóng ma (user chỉ
     2026-11-06 tối), nên v16b bỏ hẳn: thân dưới che bởi dải mặt bàn
     (.deskstrip) cắt đúng từ ảnh nền, mép cắt nằm sau mặt bàn.
     (Bài học v12: ghép thêm ảnh lưng ghế riêng lên trên thì xấu, vì
     lưng ghế ghép không khớp phối cảnh + màu nền; nhưng dải mặt bàn
     cắt đúng từ ảnh nền thì khớp tuyệt đối vì cùng 1 ảnh.)
   - Tỉ lệ người: rộng 50/59/70/76 (v16c thu nhỏ từ 56/66/78/90 — hình
     cũ cao quá, eo hàng dưới chui vào tóc hàng trên). Chip tên + điểm
     đè lên mặt bàn (chipY = đỉnh bàn − 0,2%), như ảnh họ. */
(function () {
'use strict';
const W = (window.Classroom = window.Classroom || {});
const P = (W.people = {});
function hash(s) { let h = 0; s = String(s || ''); for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h); }
function esc(s) { return String(s || '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch])); }

const TEACHER_IMG = 'img/co-ngan.png';
/* Giáo viên theo môn học (cheDo): 9 cô giáo (LH-GV2: tất cả nữ, áo
   dài trắng, tư thế 1 tay chỉ bảng + 1 tay ngang eo), mỗi môn 1
   người, cùng phong cách vẽ 2D anime với Cô Ngân (người lớn, đứng
   ở bảng, thẻ tên vẽ trong ảnh). tong-hop / olympic / lạ → Cô Ngân
   (áo dài đỏ) mặc định. Giọng đọc KHÔNG đổi: mọi giáo viên vẫn
   dùng GV02LemLinh — chỉ đổi ảnh + tên.
   LH-GV3: mỗi cô 3 tư thế (poses) — A chỉ bảng (ảnh gốc), B ôm sách,
   C suy nghĩ — xoay A→B→C→A mỗi lần câu hỏi đổi. */
const TEACHERS = {
  'tieng-viet': { name: 'Cô Mai Lan', img: 'img/gv-tieng-viet.png', poses: ['img/gv-tieng-viet.png', 'img/gv-tieng-viet-2.png', 'img/gv-tieng-viet-3.png'], happy: 'img/gv-tieng-viet-vui.png', sad: 'img/gv-tieng-viet-buon.png', voTay: 'img/gv-tieng-viet-vo-tay.png', traiTim: 'img/gv-tieng-viet-trai-tim.png', chuV: 'img/gv-tieng-viet-chu-v.png', ngonCai: 'img/gv-tieng-viet-ngon-cai.png', vayTay: 'img/gv-tieng-viet-vay-tay.png' },
  'toan': { name: 'Cô Thu Hằng', img: 'img/gv-toan.png', poses: ['img/gv-toan.png', 'img/gv-toan-2.png', 'img/gv-toan-3.png'], happy: 'img/gv-toan-vui.png', sad: 'img/gv-toan-buon.png', voTay: 'img/gv-toan-vo-tay.png', traiTim: 'img/gv-toan-trai-tim.png', chuV: 'img/gv-toan-chu-v.png', ngonCai: 'img/gv-toan-ngon-cai.png', vayTay: 'img/gv-toan-vay-tay.png' },
  'khoa-hoc': { name: 'Cô Diệu Anh', img: 'img/gv-khoa-hoc.png', poses: ['img/gv-khoa-hoc.png', 'img/gv-khoa-hoc-2.png', 'img/gv-khoa-hoc-3.png'], happy: 'img/gv-khoa-hoc-vui.png', sad: 'img/gv-khoa-hoc-buon.png', voTay: 'img/gv-khoa-hoc-vo-tay.png', traiTim: 'img/gv-khoa-hoc-trai-tim.png', chuV: 'img/gv-khoa-hoc-chu-v.png', ngonCai: 'img/gv-khoa-hoc-ngon-cai.png', vayTay: 'img/gv-khoa-hoc-vay-tay.png' },
  'tieng-anh': { name: 'Cô Phương Thảo', img: 'img/gv-tieng-anh.png', poses: ['img/gv-tieng-anh.png', 'img/gv-tieng-anh-2.png', 'img/gv-tieng-anh-3.png'], happy: 'img/gv-tieng-anh-vui.png', sad: 'img/gv-tieng-anh-buon.png', voTay: 'img/gv-tieng-anh-vo-tay.png', traiTim: 'img/gv-tieng-anh-trai-tim.png', chuV: 'img/gv-tieng-anh-chu-v.png', ngonCai: 'img/gv-tieng-anh-ngon-cai.png', vayTay: 'img/gv-tieng-anh-vay-tay.png' },
  'lich-su': { name: 'Cô Thanh Huyền', img: 'img/gv-lich-su.png', poses: ['img/gv-lich-su.png', 'img/gv-lich-su-2.png', 'img/gv-lich-su-3.png'], happy: 'img/gv-lich-su-vui.png', sad: 'img/gv-lich-su-buon.png', voTay: 'img/gv-lich-su-vo-tay.png', traiTim: 'img/gv-lich-su-trai-tim.png', chuV: 'img/gv-lich-su-chu-v.png', ngonCai: 'img/gv-lich-su-ngon-cai.png', vayTay: 'img/gv-lich-su-vay-tay.png' },
  'dia-ly': { name: 'Cô Quỳnh Chi', img: 'img/gv-dia-ly.png', poses: ['img/gv-dia-ly.png', 'img/gv-dia-ly-2.png', 'img/gv-dia-ly-3.png'], happy: 'img/gv-dia-ly-vui.png', sad: 'img/gv-dia-ly-buon.png', voTay: 'img/gv-dia-ly-vo-tay.png', traiTim: 'img/gv-dia-ly-trai-tim.png', chuV: 'img/gv-dia-ly-chu-v.png', ngonCai: 'img/gv-dia-ly-ngon-cai.png', vayTay: 'img/gv-dia-ly-vay-tay.png' },
  'doi-song': { name: 'Cô Hồng Nhung', img: 'img/gv-doi-song.png', poses: ['img/gv-doi-song.png', 'img/gv-doi-song-2.png', 'img/gv-doi-song-3.png'], happy: 'img/gv-doi-song-vui.png', sad: 'img/gv-doi-song-buon.png', voTay: 'img/gv-doi-song-vo-tay.png', traiTim: 'img/gv-doi-song-trai-tim.png', chuV: 'img/gv-doi-song-chu-v.png', ngonCai: 'img/gv-doi-song-ngon-cai.png', vayTay: 'img/gv-doi-song-vay-tay.png' },
  'do-an': { name: 'Cô Ngọc Trâm', img: 'img/gv-do-an.png', poses: ['img/gv-do-an.png', 'img/gv-do-an-2.png', 'img/gv-do-an-3.png'], happy: 'img/gv-do-an-vui.png', sad: 'img/gv-do-an-buon.png', voTay: 'img/gv-do-an-vo-tay.png', traiTim: 'img/gv-do-an-trai-tim.png', chuV: 'img/gv-do-an-chu-v.png', ngonCai: 'img/gv-do-an-ngon-cai.png', vayTay: 'img/gv-do-an-vay-tay.png' },
  'do-vui': { name: 'Cô Bảo Châu', img: 'img/gv-do-vui.png', poses: ['img/gv-do-vui.png', 'img/gv-do-vui-2.png', 'img/gv-do-vui-3.png'], happy: 'img/gv-do-vui-vui.png', sad: 'img/gv-do-vui-buon.png', voTay: 'img/gv-do-vui-vo-tay.png', traiTim: 'img/gv-do-vui-trai-tim.png', chuV: 'img/gv-do-vui-chu-v.png', ngonCai: 'img/gv-do-vui-ngon-cai.png', vayTay: 'img/gv-do-vui-vay-tay.png' },
};
const TEACHER_DEFAULT = { name: 'Cô Ngân', img: TEACHER_IMG, poses: [TEACHER_IMG, 'img/co-ngan-2.png', 'img/co-ngan-3.png'], happy: 'img/co-ngan-vui.png', sad: 'img/co-ngan-buon.png', voTay: 'img/co-ngan-vo-tay.png', traiTim: 'img/co-ngan-trai-tim.png', chuV: 'img/co-ngan-chu-v.png', ngonCai: 'img/co-ngan-ngon-cai.png', vayTay: 'img/co-ngan-vay-tay.png' };
/* Vị trí + cỡ giáo viên từ config (key viTriGiaoVien): {x, y, w} —
   x/y = điểm neo của CSS .teacher (translate -50%,-85%), tính theo %
   khung; w = rộng px ở khung 720×1280, cao tự theo tỉ lệ ảnh
   (1151×1833). Mặc định = vị trí Cô Ngân hiện tại (TEACHER_POS
   13/42,5 + CSS .teacher rộng 185px, cao ~295px). Áp chung cho mọi
   giáo viên. Sai/thiếu thì về mặc định. */
const TEACHER_POS_DEFAULT = { x: 13, y: 42.5, w: 185 };
let teacherPos = Object.assign({}, TEACHER_POS_DEFAULT);
function parseTeacherPos(v) {
  let o = v;
  if (typeof v === 'string') { try { o = JSON.parse(v); } catch (_) { return null; } }
  if (!o || typeof o !== 'object' || Array.isArray(o)) return null;
  const x = +o.x, y = +o.y, w = +o.w;
  if (![x, y, w].every(Number.isFinite)) return null;
  if (x < 0 || x > 100 || y < 0 || y > 100 || w < 50 || w > 400) return null;
  return { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10, w: Math.round(w) };
}
function applyTeacherPosToEl() {
  if (!teacherEl) return;
  teacherEl.style.left = teacherPos.x + '%';
  teacherEl.style.top = teacherPos.y + '%';
  teacherEl.style.width = teacherPos.w + 'px';
}
P.applyTeacherPos = function (v) {
  const p = parseTeacherPos(v);
  teacherPos = p || Object.assign({}, TEACHER_POS_DEFAULT);
  applyTeacherPosToEl();
  return !!p;
};
P.teacherPos = function () { return Object.assign({}, teacherPos); };
/* Khung tên dưới chân cô (LH-GV5c): thay bảng tên vẽ trong ảnh
   (nv2 bỏ ở LH-GV5a). Vị trí theo config viTriKhungTen {x, y, w} —
   x/y = tâm/trên của khung (%, khung neo translateX(-50%)), w = rộng
   px ở khung 720×1280. Mặc định: ngay dưới chân cô — chân ở
   y + 15% chiều cao hình (neo -85%), cộng khe 0,5%: với vị trí mặc
   định {13, 42.5, 185} và ảnh 1151×1833 (cao ~295px = 23%) thì chân
   ở ~46%, khung ở y = 46,5. Config sai/thiếu thì tính lại từ vị trí
   cô hiện tại (đổi vị trí cô mà chưa sửa khung tên thì khung vẫn bám
   theo chân cô). */
const IMG_RATIO = 1833 / 1151; // ảnh giáo viên 1151×1833, cùng tỉ lệ mọi cô
const PLATE_W_DEFAULT = 140; // rộng TỐI ĐA khung tên — vừa tên dài nhất ("Cô Thanh Huyền" ~110px + padding), tên ngắn thì khung co lại
function platePosDefault() {
  const hPct = teacherPos.w * IMG_RATIO / 1280 * 100;
  return { x: teacherPos.x, y: Math.round((teacherPos.y + hPct * 0.15 + 0.5) * 10) / 10, w: PLATE_W_DEFAULT };
}
let teacherNamePos = platePosDefault();
let teacherNameTagEl = null;
function applyTeacherNamePosToEl() {
  if (!teacherNameTagEl) return;
  teacherNameTagEl.style.left = teacherNamePos.x + '%';
  teacherNameTagEl.style.top = teacherNamePos.y + '%';
  // Khung ôm vừa tên (đỡ che hông cô): rộng co theo chữ, w trong config
  // là rộng TỐI ĐA — tên dài nhất vừa đủ, tên dài hơn thì cắt … (CSS).
  teacherNameTagEl.style.width = 'auto';
  teacherNameTagEl.style.maxWidth = teacherNamePos.w + 'px';
}
P.applyTeacherNamePos = function (v) {
  const p = parseTeacherPos(v);
  teacherNamePos = p || platePosDefault();
  applyTeacherNamePosToEl();
  return !!p;
};
P.teacherNamePos = function () { return Object.assign({}, teacherNamePos); };
/* Tên hiển thị từng cô (LH-GV5c): config tenGiaoVien {chế độ: tên}
   (chuỗi JSON hoặc object) — chỉ giữ key chế độ đã biết + tên không
   rỗng (cắt 30 ký tự); key thiếu/sai thì về tên mặc định của cô đó.
   Tên mặc định lấy từ TEACHERS (tránh ghi trùng 10 tên ở 2 chỗ);
   riêng Cô Ngân (tong-hop) lấy cfg.teacherName nếu admin có nhập. */
const TEACHER_NAMES_DEFAULT = { 'tong-hop': TEACHER_DEFAULT.name, 'olympic': TEACHER_DEFAULT.name };
Object.keys(TEACHERS).forEach(k => { TEACHER_NAMES_DEFAULT[k] = TEACHERS[k].name; });
let teacherNames = {};
let cfgTeacherName = TEACHER_DEFAULT.name;
function parseTeacherNames(v) {
  let o = v;
  if (typeof v === 'string') { try { o = JSON.parse(v); } catch (_) { return null; } }
  if (!o || typeof o !== 'object' || Array.isArray(o)) return null;
  const out = {};
  for (const k of Object.keys(TEACHER_NAMES_DEFAULT)) {
    const name = typeof o[k] === 'string' ? o[k].trim().slice(0, 30) : '';
    if (name) out[k] = name;
  }
  return Object.keys(out).length ? out : null;
}
function refreshTeacherNameTag() {
  if (!teacherNameTagEl) return;
  teacherNameTagEl.textContent = P.teacherDisplayName();
}
P.applyTeacherNames = function (v, defaultName) {
  if (typeof defaultName === 'string' && defaultName.trim()) cfgTeacherName = defaultName.trim().slice(0, 30);
  const m = parseTeacherNames(v);
  teacherNames = m || {};
  refreshTeacherNameTag();
  return !!m;
};
P.teacherDisplayName = function () {
  const m = teacherMode;
  if (teacherNames[m]) return teacherNames[m];
  if (m === 'tong-hop') return cfgTeacherName || TEACHER_DEFAULT.name;
  return (TEACHERS[m] || TEACHER_DEFAULT).name;
};
/* Tư thế giáo viên (LH-GV3): mỗi cô 3 tư thế — A chỉ bảng, B ôm sách,
   C suy nghĩ. Xoay A→B→C→A mỗi lần câu hỏi đổi (main.js gọi 1 dòng
   P.nextTeacherPose() trong nextQuestion); đổi giáo viên (đổi môn /
   cheDo) thì về lại A. Câu hỏi đầu tiên giữ tư thế A, từ câu 2 mới
   xoay. Tư thế KHÔNG đổi ở mỗi lần render — chỉ đổi khi câu hỏi
   đổi hoặc đổi giáo viên. */
let teacherPoseIdx = 0;
let teacherPoseStarted = false;
function teacherPoseImg() {
  const t = TEACHERS[teacherMode] || TEACHER_DEFAULT;
  const poses = t.poses || [t.img];
  return poses[teacherPoseIdx % poses.length];
}
function applyTeacherPoseImg() {
  if (!teacherImgEl) return;
  const t = TEACHERS[teacherMode] || TEACHER_DEFAULT;
  teacherImgEl.src = currentTeacherImg();
  teacherImgEl.alt = t.name;
}
/* Cảm xúc giáo viên (LH-GV4 + LH-GV6): khi hết câu hỏi (vào phase công
   bố đáp án), cô VUI nếu >=1 học sinh THẬT trả lời đúng, BUỒN nếu 0
   bạn đúng — main.js gọi P.celebrateRandom() (vui: chọn ngẫu nhiên 1
   trong 6 kiểu ăn mừng) hoặc P.setTeacherMood('sad'). Cảm xúc giữ
   suốt phase công bố; sang câu sau (nextQuestion) hoặc vào Giờ ra
   chơi thì gọi P.setTeacherMood(null) để về lại tư thế A/B/C hiện
   tại. Ảnh cảm xúc đè lên ảnh tư thế (không đổi teacherPoseIdx),
   nên đổi cảm xúc không làm mất tư thế đang xoay. */
/* Mood → field trong dữ liệu từng cô (LH-GV6: 5 kiểu ăn mừng mới cộng
   thêm vào 'happy' cũ; LH-GV7 thêm 5 kiểu buồn vào đây khi gộp). */
const MOOD_FIELD = { happy: 'happy', sad: 'sad', 'vo-tay': 'voTay', 'trai-tim': 'traiTim', 'chu-v': 'chuV', 'ngon-cai': 'ngonCai', 'vay-tay': 'vayTay' };
const CELEBRATIONS = ['happy', 'vo-tay', 'trai-tim', 'chu-v', 'ngon-cai', 'vay-tay']; // 6 kiểu ăn mừng khi có bạn thật đúng
let teacherMood = null; // null | 'happy' | 'sad' | 1 trong 5 kiểu ăn mừng
function currentTeacherImg() {
  const t = TEACHERS[teacherMode] || TEACHER_DEFAULT;
  if (teacherMood && t[MOOD_FIELD[teacherMood]]) return t[MOOD_FIELD[teacherMood]];
  return teacherPoseImg();
}
P.setTeacherMood = function (mood) {
  teacherMood = MOOD_FIELD[mood] ? mood : null;
  applyTeacherPoseImg();
  return teacherMood;
};
P.teacherMood = function () { return teacherMood; };
/* LH-GV6: chọn ngẫu nhiên 1 trong 6 kiểu ăn mừng (vui cũ + 5 mới) rồi
   áp lên cô; trả về kiểu đã chọn (để demo/log kiểm chứng). */
P.celebrateRandom = function () {
  const m = CELEBRATIONS[Math.floor(Math.random() * CELEBRATIONS.length)];
  P.setTeacherMood(m);
  return teacherMood;
};
P.nextTeacherPose = function () {
  if (!teacherPoseStarted) { teacherPoseStarted = true; return teacherPoseIdx; } // câu đầu giữ A
  teacherPoseIdx = (teacherPoseIdx + 1) % 3;
  applyTeacherPoseImg();
  return teacherPoseIdx;
};
P.resetTeacherPose = function () { teacherPoseIdx = 0; teacherPoseStarted = false; applyTeacherPoseImg(); };
P.teacherPose = function () { return teacherPoseIdx; };
/* Đổi giáo viên theo chế độ lớp (cfg.cheDo): tên môn → giáo viên môn
   đó; tong-hop / olympic / lạ → Cô Ngân. Chỉ đổi ảnh + tên, không
   đổi vị trí (cùng 1 chỗ đứng) và không đổi giọng đọc. Đổi giáo
   viên thì tư thế về lại A. */
let teacherMode = 'tong-hop';
let teacherImgEl = null;
P.setTeacherMode = function (mode) {
  const m = String(mode || 'tong-hop');
  const next = TEACHERS[m] ? m : 'tong-hop';
  if (next !== teacherMode) { teacherMode = next; P.resetTeacherPose(); } // chỉ về A khi đổi giáo viên thật (applyConfig khác không làm mất tư thế đang xoay)
  refreshTeacherNameTag(); // khung tên đổi theo cô đang đứng lớp
  return teacherMode;
};
P.teacherMode = function () { return teacherMode; };
P.teacherName = function () { return (TEACHERS[teacherMode] || TEACHER_DEFAULT).name; };
const STUDENT_IMGS = ['img/hoc-sinh-sau-1.png', 'img/hoc-sinh-sau-2.png', 'img/hoc-sinh-sau-3.png', 'img/hoc-sinh-sau-4.png', 'img/hoc-sinh-sau-5.png', 'img/hoc-sinh-sau-6.png'];
const FRONT_IMGS = ['img/hoc-sinh-1.png', 'img/hoc-sinh-2.png', 'img/hoc-sinh-3.png', 'img/hoc-sinh-4.png', 'img/hoc-sinh-5.png', 'img/hoc-sinh-6.png'];

/* SEATS v19 (theo NỀN v18 — thay SEATS v18 theo nền v17): 20 ghế
   (4 hàng × 5). x/y = vị trí phần tử (%, học sinh neo
   translate(-50%,-100%) nên ĐÁY hình = y, đặt y đúng đỉnh bàn thì ngực
   cắt chạm mép bàn như ảnh họ — không dải mặt bàn, không mặt nạ, không
   cắt nào nữa. w = rộng ảnh (px); ảnh học sinh mới 600×600 (tỉ lệ 1.0,
   đầu + vai cắt ngang ngực).
   y = đỉnh bàn ĐO TRỰC TIẾP TỪ ẢNH NỀN v18 (nv3 warp dọc v17, đỉnh
   623→704, 719→832, 827→960, 944→1088, 1093→1216): đo bằng profile
   độ sáng cột x 300–420 — mép trên bàn là hàng tối (~40–100) rồi
   nhảy lên mặt bàn sáng (~145–167): 704/832/960/1088/1216px =
   55,0/65,0/75,0/85,0/95,0% (khớp đúng số nv3/BOSS báo; phương pháp
   này đo lại v17 ra đúng 623/719/827/944/1093). Dùng 4 dải làm ghế:
   55/65/75/85; dải 95% để trống như ảnh họ. Khoảng cách hàng đều
   128px (10% × 1280).
   w chốt theo ĐẦU học sinh đo từ ảnh mẫu (~40/48/55/63px ở khung
   720; đầu ≈ 59% bề rộng ảnh sau-lưng): 68/81/93/107 → đầu
   ~40/48/55/63px, khớp ảnh mẫu (không copy mù gợi ý 75/86/97/109
   của nv3 — gợi ý đó cho đầu to hơn ảnh mẫu ở hàng 1–3). Giới hạn
   trên do chip hàng trên (chip cao ~31px, chipY = y + 0,3%): đầu
   hàng dưới chạm mép dưới chip hàng trên ở w ≈ 101; w 107 ở hàng 4
   chỉ lấn ~5px sau chip (chip ở lớp trên, không che chữ — như v18
   đã kiểm chứng bằng ảnh). Hàng 1: đầu top 641px, cách chân cô
   (588px) 53px — hết lỗi hs nấp sau chân cô ở nền v17.
   chipY = top (%) của chip tên + điểm (ngay dưới mép bàn, trên mặt
   trước bàn, như v17 chốt). Tọa độ từng ghế user tự canh bằng
   ?seats=1 (xem P.setEditMode ở cuối file). */
const SEATS = [
  { x: 10, y: 55.0, w: 68, chipY: 55.3 }, { x: 30, y: 55.0, w: 68, chipY: 55.3 },
  { x: 50, y: 55.0, w: 68, chipY: 55.3 }, { x: 70, y: 55.0, w: 68, chipY: 55.3 },
  { x: 90, y: 55.0, w: 68, chipY: 55.3 },
  { x: 10, y: 65.0, w: 81, chipY: 65.3 }, { x: 30, y: 65.0, w: 81, chipY: 65.3 },
  { x: 50, y: 65.0, w: 81, chipY: 65.3 }, { x: 70, y: 65.0, w: 81, chipY: 65.3 },
  { x: 90, y: 65.0, w: 81, chipY: 65.3 },
  { x: 10, y: 75.0, w: 93, chipY: 75.3 }, { x: 30, y: 75.0, w: 93, chipY: 75.3 },
  { x: 50, y: 75.0, w: 93, chipY: 75.3 }, { x: 70, y: 75.0, w: 93, chipY: 75.3 },
  { x: 90, y: 75.0, w: 93, chipY: 75.3 },
  { x: 10, y: 85.0, w: 107, chipY: 85.3 }, { x: 30, y: 85.0, w: 107, chipY: 85.3 },
  { x: 50, y: 85.0, w: 107, chipY: 85.3 }, { x: 70, y: 85.0, w: 107, chipY: 85.3 },
  { x: 90, y: 85.0, w: 107, chipY: 85.3 },
];
/* Ghi đè tọa độ ghế do user tự canh (?seats=1): lưu localStorage, nạp
   khi mở game, chỉ áp khi đang ở chế độ editor — xem thường thì
   config (hoặc SEATS v19) thắng. */
const LS_SEATS = 'lophochchu.seats.v1';
let seatOverrides = {};
try { seatOverrides = JSON.parse(localStorage.getItem(LS_SEATS) || '{}') || {}; } catch (_) { seatOverrides = {}; }
/* Vị trí ghế từ config LiveBridge (key viTriGhe): user chỉnh qua admin.
   Chấp nhận chuỗi JSON hoặc mảng [{x,y,w,chipY}] x20; sai/thiếu thì
   về SEATS v19 hardcode. Thứ tự ưu tiên: xem thường thì config (hoặc
   v19) luôn thắng — localStorage (?seats=1) CHỈ áp khi đang ở chế độ
   editor (editMode bật), để sửa config trong admin không bị
   localStorage cũ (kể cả từ lúc test v17) chặn mất tác dụng. */
let seatBase = SEATS;
function parseSeats(v) {
  let arr = v;
  if (typeof v === 'string') { try { arr = JSON.parse(v); } catch (_) { return null; } }
  else if (Array.isArray(v) && v.length === 1 && typeof v[0] === 'string') { try { arr = JSON.parse(v[0]); } catch (_) { return null; } }
  if (!Array.isArray(arr) || arr.length !== 20) return null;
  const out = [];
  for (const s of arr) {
    if (!s || typeof s !== 'object') return null;
    const x = +s.x, y = +s.y, w = +s.w, chipY = +s.chipY;
    if (![x, y, w, chipY].every(Number.isFinite)) return null;
    if (x < 0 || x > 100 || y < 0 || y > 100 || chipY < 0 || chipY > 100 || w < 10 || w > 300) return null;
    out.push({ x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10, w: Math.round(w), chipY: Math.round(chipY * 10) / 10 });
  }
  return out;
}
/* Áp vị trí ghế từ config (main.js applyConfig gọi): học sinh đang
   ngồi dời theo ngay; config sai thì về v19. Trả về true nếu config
   hợp lệ và được áp. */
P.applyConfigSeats = function (v) {
  const s = parseSeats(v);
  seatBase = s || SEATS;
  people.forEach(p => { if (p.seatIdx != null && !p.onboard) applySeat(p, p.seatIdx); });
  return !!s;
};
P.seatsFromConfig = function () { return seatBase !== SEATS; };
function getSeat(si) {
  const base = seatBase[si];
  if (!base) return null;
  // Ghi đè localStorage chỉ áp trong chế độ editor (?seats=1); xem
  // thường thì config (hoặc v19) luôn thắng.
  const o = editMode ? seatOverrides[si] : null;
  if (!o) return base;
  return {
    x: o.x != null ? +o.x : base.x,
    y: o.y != null ? +o.y : base.y,
    w: o.w != null ? +o.w : base.w,
    chipY: o.chipY != null ? +o.chipY : base.chipY,
  };
}
function saveSeats() { try { localStorage.setItem(LS_SEATS, JSON.stringify(seatOverrides)); } catch (_) {} }
P.getSeats = function () { return SEATS.map((s, i) => getSeat(i)); };
P.setSeat = function (si, patch, save) {
  si = +si;
  if (!SEATS[si]) return;
  seatOverrides[si] = Object.assign({}, getSeat(si), patch);
  if (save !== false) saveSeats();
  seatOf.forEach((s2, pid) => { if (s2 === si) { const p = people.get(pid); if (p) applySeat(p, si); } });
  if (typeof P._onSeatChange === 'function') P._onSeatChange(si);
};
P.resetSeats = function () {
  seatOverrides = {};
  try { localStorage.removeItem(LS_SEATS); } catch (_) {}
  people.forEach(p => applySeat(p, p.seatIdx));
};
const NPC_SEAT_START = 15; // NPC nền chỉ ngồi hàng 4 (hàng sau), chừa 3 hàng trước cho người thật
const TEACHER_POS = { x: 13, y: 42.5 }; // co dung trai bang, tay chi ve phia bang; chan co y ~46%, dau co y ~23%
const BOARD_POS = { x: 88, y: 38 };
const MAX_PEOPLE = 20;

const names = ['An', 'Bình', 'Chi', 'Dũng', 'Hân', 'Khoa', 'Linh', 'Minh', 'Ngọc', 'Phúc', 'Quỳnh', 'Sơn', 'Thảo', 'Tuấn', 'Vy', 'Đức', 'Hà', 'Huy', 'Mai', 'Nam'];
let rootEl = null;
let chipLayer = null; // lớp chip tên+điểm riêng, z cao hơn học sinh để đầu hàng sau không che chip hàng trước
let bubbleLayer = null; // lớp bong bóng chat riêng trên cùng #stage (z 30), không bị panel che
let teacherEl = null;
let teacherBubble = null;
let tierLevel = 0;
let nextIdx = 0;
const people = new Map();   // id -> person
const seatOf = new Map();   // id -> seat index

function firstFreeSeat() {
  const taken = {};
  seatOf.forEach(i => { taken[i] = true; });
  for (let i = 0; i < SEATS.length; i++) if (!taken[i]) return i;
  return -1;
}
function applySeat(p, si) {
  const s = getSeat(si);
  if (!s || !p.el) return;
  p.el.style.left = s.x + '%';
  p.el.style.top = s.y + '%';
  p.el.style.width = s.w + 'px';
  // Chip ở lớp riêng trên cùng, ngay dưới mép bàn (chipY = đỉnh bàn + 0,3%).
  const chip = p.chipEl;
  if (chip) {
    chip.style.left = s.x + '%';
    chip.style.top = s.chipY + '%';
  }
}
function makeEl(p) {
  const el = document.createElement('div');
  el.className = 'student';
  el.dataset.id = p.id;
  el.innerHTML = '<div class="figwrap"><img src="' + p.img + '" alt="' + esc(p.name) + '" draggable="false"></div>'
    + '<div class="dot">✓</div><div class="hand">✋</div>';
  return el;
}

P.init = function (el) {
  rootEl = el || document.getElementById('room');
  if (!rootEl || teacherEl) return;
  chipLayer = document.createElement('div');
  chipLayer.id = 'chipLayer';
  rootEl.appendChild(chipLayer);
  bubbleLayer = document.getElementById('bubbleLayer');
  // Preload toàn bộ ảnh nhân vật ngay khi mở game (tránh "mất hình").
  // Preload cả 3 tư thế + cảm xúc (vui/buồn + 5 ăn mừng LH-GV6) của mọi giáo viên để đổi tức thì, không nhấp nháy.
  (TEACHER_DEFAULT.poses || [TEACHER_IMG]).concat([TEACHER_DEFAULT.happy, TEACHER_DEFAULT.sad, TEACHER_DEFAULT.voTay, TEACHER_DEFAULT.traiTim, TEACHER_DEFAULT.chuV, TEACHER_DEFAULT.ngonCai, TEACHER_DEFAULT.vayTay], Object.values(TEACHERS).flatMap(t => (t.poses || [t.img]).concat([t.happy, t.sad, t.voTay, t.traiTim, t.chuV, t.ngonCai, t.vayTay])), STUDENT_IMGS, FRONT_IMGS).filter(Boolean).forEach(src => { const im = new Image(); im.src = src; });
  // Cô giáo đứng cố định bên trái bảng, không chiếm ghế học sinh.
  teacherEl = document.createElement('div');
  teacherEl.className = 'teacher';
  teacherEl.id = 'teacher';
  teacherEl.innerHTML = '<div class="figwrap"><img src="' + TEACHER_IMG + '" alt="Cô Ngân" draggable="false"></div>'
    + '<div class="gshadow"></div>';
  teacherImgEl = teacherEl.querySelector('.figwrap img');
  applyTeacherPosToEl(); // vị trí + cỡ từ config (mặc định = Cô Ngân)
  // Khung tên dưới chân cô (LH-GV5c): tạo cùng lúc với cô giáo, vị trí
  // + chữ lấy từ config (đã về trước P.init thì áp ngay).
  teacherNameTagEl = document.createElement('div');
  teacherNameTagEl.className = 'teacher-nametag';
  teacherNameTagEl.id = 'teacherNameTag';
  applyTeacherNamePosToEl();
  refreshTeacherNameTag();
  rootEl.appendChild(teacherNameTagEl);
  P.setTeacherMode(teacherMode); // đồng bộ ảnh theo chế độ lớp (nếu config đã về trước P.init)
  rootEl.appendChild(teacherEl);
  // Bong bóng cô Ngân: dải trống dưới khẩu hiệu, trên bảng — giữa
  // khung, không che câu đố/ô chữ trên bảng, không che đầu cô.
  teacherBubble = document.createElement('div');
  teacherBubble.className = 'bubble teacher-bubble';
  teacherBubble.id = 'teacherBubble';
  rootEl.appendChild(teacherBubble);
  P.teacherEl = teacherEl;
  // 3 NPC nền ngồi hàng 4 để lớp không trống (3 hàng trước chừa cho người thật).
  for (let i = 0; i < 3; i++) {
    const k = nextIdx++;
    const nm = names[k % names.length] + (k >= names.length ? ' ' + (k + 1) : '');
    P.spawn({ id: 'npc' + (i + 1), nickname: nm, npc: true, seatIdx: NPC_SEAT_START + i });
  }
};
P.setTier = function (n) {
  tierLevel = n | 0;
  const st = document.getElementById('stage');
  if (st) { st.classList.remove('tier-1', 'tier-2', 'tier-3'); if (tierLevel > 0) st.classList.add('tier-' + tierLevel); }
};
/* Ảnh cô Ngân: tay trái chỉ thẳng sang PHẢI về phía bảng (không lật
   ngang), tay phải cầm cờ đỏ giơ cao. .point chỉ bật hiệu ứng nhún
   nhẹ khi ra câu mới. */
P.teacherPoint = function (on) { if (teacherEl) teacherEl.classList.toggle('point', !!on); };
P.teacherHappy = function (sec) {
  if (!teacherEl) return;
  teacherEl.classList.add('happy');
  setTimeout(() => teacherEl.classList.remove('happy'), (sec || 2) * 1000);
};
P.teacherSay = function (text, sec) {
  if (!teacherBubble) return;
  teacherBubble.textContent = text;
  teacherBubble.classList.add('on');
  clearTimeout(P._sayT);
  P._sayT = setTimeout(() => teacherBubble.classList.remove('on'), (sec || 4) * 1000);
};

P.spawn = function (user) {
  if (!rootEl || people.has(user.id)) return people.get(user.id) || null;
  if (people.size >= MAX_PEOPLE) return null;   // hết ghế: vẫn chơi + ghi điểm, không có hình riêng
  let si = (user.seatIdx != null) ? user.seatIdx : firstFreeSeat();
  if (si < 0 || si >= SEATS.length) return null;
  let taken = false;
  seatOf.forEach(v => { if (v === si) taken = true; });
  if (taken) { si = firstFreeSeat(); if (si < 0) return null; }
  const h = hash(user.id);
  const p = {
    id: user.id, user,
    name: user.nickname || user.name || ('Bạn ' + user.id),
    img: STUDENT_IMGS[h % STUDENT_IMGS.length],
    avatar: FRONT_IMGS[h % FRONT_IMGS.length],
    seatIdx: si, state: 'home', lastActive: Date.now(), lastInteract: 0, pts: 0,
  };
  p.el = makeEl(p);
  if (editMode) p.el.classList.add('editable');
  rootEl.appendChild(p.el);
  p.chipEl = document.createElement('div');
  p.chipEl.className = 'chip';
  p.chipEl.innerHTML = '<span class="nm">' + esc(p.name) + '</span><span class="pts">0</span>';
  chipLayer.appendChild(p.chipEl);
  seatOf.set(user.id, si);
  applySeat(p, si);
  people.set(user.id, p);
  return p;
};
P.get = id => people.get(id) || null;
P.count = () => people.size;
P.all = () => [...people.values()];
P.removeUser = function (id) {
  const p = people.get(id);
  if (!p) return;
  if (p._boardTimer) clearTimeout(p._boardTimer);
  if (p.el) p.el.remove();
  if (p.chipEl) p.chipEl.remove();
  if (p.layerBubble) p.layerBubble.remove();
  seatOf.delete(id);
  people.delete(id);
};
P.touch = function (id) { const p = people.get(id); if (p) p.lastActive = Date.now(); };
P.markInteract = function (id) { const p = people.get(id); if (p) p.lastInteract = Date.now(); };
P.say = function (id, text, sec) {
  const p = people.get(id);
  if (!p || !bubbleLayer) return;
  if (!p.layerBubble) {
    p.layerBubble = document.createElement('div');
    p.layerBubble.className = 'bubble';
    bubbleLayer.appendChild(p.layerBubble);
  }
  const b = p.layerBubble;
  // Bong bóng nằm trên đầu học sinh: đáy bong bóng = đỉnh đầu (đỉnh
  // phần tử — học sinh neo -100% nên đỉnh phần tử = mép bàn − chiều
  // cao hình). Tính theo tọa độ thật của phần tử để đúng cả khi user
  // đã kéo ghế đi chỗ khác.
  const stage = document.getElementById('stage');
  const srect = stage ? stage.getBoundingClientRect() : { left: 0, top: 0, width: 720, height: 1280 };
  const rect = p.el.getBoundingClientRect();
  const cx = (rect.left + rect.width / 2 - srect.left) / (srect.width / 720);
  const top = (rect.top - srect.top) / (srect.height / 1280) - 6;
  b.style.left = (cx / 720 * 100) + '%';
  b.style.top = (top / 1280 * 100) + '%';
  b.textContent = String(text || '').slice(0, 60);
  b.classList.add('on');
  clearTimeout(p._sayT);
  p._sayT = setTimeout(() => b.classList.remove('on'), (sec || 4) * 1000);
};
P.raiseHand = function (id, sec) {
  const p = people.get(id);
  if (!p) return;
  p.el.classList.add('raise');
  if (p.chipEl) p.chipEl.classList.add('correct');   // chấm ✓ xanh + chip xanh như live đối thủ
  const t = sec || 3;
  setTimeout(() => { p.el.classList.remove('raise'); if (p.chipEl) p.chipEl.classList.remove('correct'); }, t * 1000);
};
/* Xếp lại ghế theo thứ tự điểm: ids[0] (điểm cao nhất) ngồi ghế đầu tiên,
   cứ thế xuống hàng dưới. Ghế đang bị NPC / người 0 điểm ngồi thì ĐỔI CHỖ
   (người kia xuống ghế vừa trống) — điểm cao luôn được ngồi hàng trên dù
   NPC đã ngồi trước. Người đang lên bảng không bị dời (ghế giữ lại);
   học sinh "chuyển chỗ" mượt nhờ transition CSS. */
P.reseat = function (ids) {
  if (!rootEl || !ids || !ids.length) return;
  const moving = {};
  ids.forEach(id => { const p = people.get(id); if (p && !p.onboard) moving[id] = true; });
  // Ghế mục tiêu theo thứ tự tốt -> xấu, bỏ qua ghế của người đang lên bảng.
  const targets = [];
  for (let i = 0; i < SEATS.length; i++) {
    let onb = false;
    seatOf.forEach((si, pid) => { if (si === i) { const pp = people.get(pid); if (pp && pp.onboard) onb = true; } });
    if (!onb) targets.push(i);
  }
  ids.forEach((id, k) => {
    const p = people.get(id);
    if (!p || p.onboard || k >= targets.length) return;
    const target = targets[k];
    if (seatOf.get(id) === target) return; // đã đúng chỗ
    // Ai đang ngồi ghế mục tiêu (không phải người đang dời) thì đổi chỗ.
    let occ = null;
    seatOf.forEach((si, pid) => { if (si === target && !moving[pid]) occ = pid; });
    if (occ) {
      const cur = seatOf.get(id);
      seatOf.set(occ, cur);
      const op = people.get(occ);
      if (op) { op.seatIdx = cur; applySeat(op, cur); }
    }
    seatOf.set(id, target);
    p.seatIdx = target;
    applySeat(p, target);
  });
};
/* Cập nhật số điểm trong chip tên + điểm của học sinh. */
P.setScore = function (id, pts) {
  const p = people.get(id);
  if (!p) return;
  p.pts = pts;
  const el = p.chipEl && p.chipEl.querySelector('.pts');
  if (el) el.textContent = String(pts);
};
P.topStudent = function (id) {
  for (const p of people.values()) {
    p.el.classList.toggle('top1', p.id === id);
    if (p.chipEl) p.chipEl.classList.toggle('top1', p.id === id);
  }
};
P.celebrate = function (ids, sec) {
  for (const id of ids || []) {
    const p = people.get(id);
    if (!p) continue;
    p.el.classList.add('happy');
    setTimeout(((el) => () => el.classList.remove('happy'))(p.el), (sec || 3) * 1000);
  }
  if (teacherEl) P.teacherHappy(sec || 3);
};
P.danceAll = function (sec) {
  for (const p of people.values()) {
    p.el.classList.add('happy');
    setTimeout(((el) => () => el.classList.remove('happy'))(p.el), (sec || 3) * 1000);
  }
  if (teacherEl) P.teacherHappy(sec || 3);
};
/* Học sinh lên bảng nhận thưởng (quà lớn): đứng cạnh bảng rồi tự quay về ghế. */
P.toBoard = function (id, sec) {
  const p = people.get(id);
  if (!p || p.state === 'board') return;
  p.state = 'board';
  p.onboard = true;
  if (p.chipEl) p.chipEl.style.display = 'none'; // lên bảng thì ẩn chip ghế
  if (p._boardTimer) clearTimeout(p._boardTimer);
  p.el.classList.add('onboard');
  p.el.style.left = BOARD_POS.x + '%';
  p.el.style.top = BOARD_POS.y + '%';
  p.el.style.width = ((getSeat(p.seatIdx) || {}).w * 1.25 || 86) + 'px';
  p._boardTimer = setTimeout(() => {
    if (!people.get(id)) return;
    p.state = 'home';
    p.onboard = false;
    p.el.classList.remove('onboard');
    if (p.chipEl) p.chipEl.style.display = '';
    applySeat(p, p.seatIdx);
  }, (sec || 8) * 1000);
};
/* Chế độ chỉnh ghế (?seats=1, demo): user tự canh tọa độ từng học sinh.
   - Bấm vào 1 học sinh (hoặc chọn trong dropdown) để chọn ghế.
   - Kéo học sinh để di chuyển (x/y theo % sân khấu 720×1280).
   - Gõ số X/Y/Rộng trong panel; chip theo y + 0,3 tự động.
   - Lưu localStorage ngay khi thả chuột / đổi số; nút Copy ra JSON
     đầy đủ 20 ghế để chép vào SEATS; nút Đặt lại xóa ghi đè. */
let editMode = false;
let selSeat = 0;
let drag = null;

function stagePct(clientX, clientY) {
  const st = document.getElementById('stage');
  if (!st) return null;
  const r = st.getBoundingClientRect();
  return {
    x: Math.max(0, Math.min(100, (clientX - r.left) / r.width * 100)),
    y: Math.max(0, Math.min(100, (clientY - r.top) / r.height * 100)),
  };
}
function editorEls() {
  return {
    panel: document.getElementById('seatEditor'),
    sel: document.getElementById('seSeat'),
    x: document.getElementById('seX'),
    y: document.getElementById('seY'),
    w: document.getElementById('seW'),
    msg: document.getElementById('seMsg'),
  };
}
function refreshEditor() {
  const e = editorEls();
  if (!e.panel || e.panel.style.display === 'none') return;
  const s = getSeat(selSeat);
  if (!s) return;
  e.sel.value = String(selSeat);
  e.x.value = (+s.x).toFixed(1);
  e.y.value = (+s.y).toFixed(1);
  e.w.value = String(Math.round(+s.w));
  people.forEach(p => p.el.classList.toggle('se-sel', p.seatIdx === selSeat && !p.onboard));
}
P._onSeatChange = function (si) { if (editMode && si === selSeat) refreshEditor(); };
function selectSeat(si) { selSeat = +si; refreshEditor(); }
function applyEditorPatch(patch) {
  const s = getSeat(selSeat);
  const y = patch.y != null ? +patch.y : s.y;
  P.setSeat(selSeat, Object.assign({}, patch, { chipY: +(y + 0.3).toFixed(1) }));
}
function onPointerMove(ev) {
  if (!drag) return;
  const pt = stagePct(ev.clientX, ev.clientY);
  if (!pt) return;
  if (Math.abs(ev.clientX - drag.sx) + Math.abs(ev.clientY - drag.sy) > 4) drag.moved = true;
  if (!drag.moved) return;
  // Giữ đúng điểm cầm: ghế neo ở ĐÁY hình (mép bàn), chuột thường cầm
  // giữa hình — cộng lại độ lệch lúc bắt đầu kéo để hình không nhảy.
  const x = Math.max(0, Math.min(100, pt.x + drag.ox / 720 * 100));
  const y = Math.max(0, Math.min(100, pt.y + drag.oy / 1280 * 100));
  P.setSeat(drag.si, { x: +x.toFixed(1), y: +y.toFixed(1), chipY: +(y + 0.3).toFixed(1) }, false);
}
function onPointerUp() {
  if (!drag) return;
  const p = people.get(drag.pid);
  if (p) p.el.classList.remove('dragging');
  if (drag.moved) { saveSeats(); refreshEditor(); }
  drag = null;
}
function onPointerDown(ev) {
  if (!editMode) return;
  const t = ev.target.closest ? ev.target.closest('.student') : null;
  if (!t || !t.dataset.id) return;
  const p = people.get(t.dataset.id);
  if (!p || p.onboard) return;
  ev.preventDefault();
  selectSeat(p.seatIdx);
  // Độ lệch giữa điểm neo ghế (đáy hình = mép bàn) và điểm chuột lúc
  // bắt đầu kéo — để hình đi theo tay đúng chỗ cầm, không nhảy.
  const s0 = getSeat(p.seatIdx);
  const pt0 = stagePct(ev.clientX, ev.clientY) || { x: s0.x, y: s0.y };
  drag = {
    pid: p.id, si: p.seatIdx, moved: false, sx: ev.clientX, sy: ev.clientY,
    ox: s0.x / 100 * 720 - pt0.x / 100 * 720,
    oy: s0.y / 100 * 1280 - pt0.y / 100 * 1280,
  };
  p.el.classList.add('dragging');
  try { p.el.setPointerCapture(ev.pointerId); } catch (_) {}
  p.el.addEventListener('pointermove', onPointerMove);
  p.el.addEventListener('pointerup', onPointerUp, { once: true });
  p.el.addEventListener('pointercancel', onPointerUp, { once: true });
}
P.setEditMode = function (on) {
  editMode = !!on;
  const e = editorEls();
  if (!e.panel) return;
  e.panel.style.display = editMode ? 'block' : 'none';
  if (!editMode) return;
  e.sel.innerHTML = '';
  for (let i = 0; i < 20; i++) {
    const o = document.createElement('option');
    o.value = String(i);
    o.textContent = 'Ghế ' + (i + 1) + ' — hàng ' + (Math.floor(i / 5) + 1);
    e.sel.appendChild(o);
  }
  e.sel.onchange = () => selectSeat(+e.sel.value);
  e.x.onchange = () => applyEditorPatch({ x: parseFloat(e.x.value) || 0 });
  e.y.onchange = () => applyEditorPatch({ y: parseFloat(e.y.value) || 0 });
  e.w.onchange = () => applyEditorPatch({ w: parseFloat(e.w.value) || 48 });
  document.getElementById('seCopy').onclick = () => {
    const json = JSON.stringify(P.getSeats().map(s => ({ x: +s.x, y: +s.y, w: +s.w, chipY: +s.chipY })));
    const done = () => { e.msg.textContent = 'Đã sao chép 20 ghế ✓'; setTimeout(() => { e.msg.textContent = ''; }, 2500); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(json).then(done, () => { e.msg.textContent = 'Không sao chép được'; });
    else e.msg.textContent = 'Trình duyệt không hỗ trợ sao chép';
  };
  document.getElementById('seReset').onclick = () => { P.resetSeats(); selectSeat(selSeat); e.msg.textContent = 'Đã về mặc định'; setTimeout(() => { e.msg.textContent = ''; }, 2500); };
  people.forEach(p => p.el.classList.add('editable'));
  if (!rootEl._editBound) { rootEl.addEventListener('pointerdown', onPointerDown); rootEl._editBound = true; }
  refreshEditor();
};

P.esc = esc;
})();
