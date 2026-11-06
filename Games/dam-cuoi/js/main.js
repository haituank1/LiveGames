/* Đám Cưới Online – cục B (game). Nhận sự kiện từ LiveBridge.
   Luật chơi v2:
   - MỌI người xem đều có nhân vật ở khuôn viên tiệc (nửa dưới): vào phòng là xuất hiện, tự đi dạo qua lại,
     mặc đồ đời thường hài hước khi chưa kết duyên.
   - Bình luận tag @tên người thương -> hai người "lên đồ" cô dâu/chú rể, nắm tay nhau lên sân khấu,
     hết giờ lại nắm tay nhau xuống khuôn viên đi dạo tiếp.
   - Quà / bình luận "pháo hoa", "hoa rơi" -> pháo hoa, mưa hoa, giấy màu theo mốc xu.
   - Sảnh cưới nâng cấp theo TỔNG LƯỢT VIEW TÍCH LŨY (không cần cùng lúc): mỗi người xem mới tính 1 lượt,
     cộng dồn qua các phiên live, lưu trong trình duyệt.
   - Cặp đôi trên sân khấu nhận điểm hạnh phúc từ quà -> bảng "Cặp đôi được yêu thích", dẫn đầu đội vương miện. */
(function () {
'use strict';
const W = (window.Wedding = window.Wedding || {});
const FX = W.effects, A = W.audio, P = W.people;
const q = new URLSearchParams(location.search);
/* L1: ?demo=0 tat demo (truoc day q.has('demo') nen ?demo=0 van vao demo). */
const isDemo = q.has('demo') && q.get('demo') !== '0';
const $ = id => document.getElementById(id);
const rand = (a, b) => a + Math.random() * (b - a);
const stageEl = $('stage');
/* Dong trang thai "Dang cho ket noi LIVE..." tren dau da bo han (Nguyen chot
   2026-11-04: khong can de) — say() giu lai lam ham rong de cac cho goi cu
   (trang thai cau noi, demo) chay qua khong loi, khong hien gi len man hinh. */
const say = () => {};

/* ============ Mốc sảnh theo TỔNG lượt view tích lũy ============ */
/* M14b — MỘT NGUỒN SỰ THẬT: TIERS được xây từ cfg.bgRules (mapping config,
   admin sửa được) lúc nhận config — tên mốc + file nền + cờ royal lấy từ
   từng mục bgRules {viewers, file, label, royal}. TIERS_FALLBACK chỉ dùng
   khi chưa có config / bgRules thiếu/rỗng/không hợp lệ (demo + mở game
   riêng vẫn chạy như cũ). royal: 0 = thường, 1 = vàng (tia sáng beams),
   2 = hoàng gia (beams + phát sáng + pháo hoa định kỳ); pool đồ hoàng gia
   bật khi royal >= 1 (people.js setPool, qua P.setTierLevel). */
const TIERS_FALLBACK = [
  { at: 0,     name: 'Lễ Ấm Áp',            file: 'bg-full.webp', royal: 0 },
  { at: 10,    name: 'Hoa Khai',            file: 'bg-500.webp', royal: 0 },
  { at: 30,    name: 'Kim Tuyến',           file: 'bg-2000.webp', royal: 0 },
  { at: 50,    name: 'Lung Linh',           file: 'bg-5000.webp', royal: 0 },
  { at: 100,   name: 'Đại Tiệc Vàng',       file: 'bg-10000.webp', royal: 1 },
  { at: 200,   name: 'Đám Cưới Hoàng Gia',  file: 'bg-sanh-moi.webp', royal: 2 },
];
let TIERS = TIERS_FALLBACK;
/* Xây TIERS từ bgRules của config; trả null nếu không còn mục hợp lệ nào
   (thiếu/rỗng/toàn mục sai kiểu) để caller giữ TIERS hiện tại. Mục sai
   kiểu hoặc trùng mốc thì bỏ qua riêng mục đó, không giết cả danh sách.
   label/royal thiếu thì lấy theo mốc cùng số view trong TIERS_FALLBACK
   (để config cũ/demo chưa có 2 trường này vẫn ra đúng tên + hạng sảnh);
   royal chấp nhận cả boolean (true = 1, false = 0) lẫn số 0/1/2. Mốc 0
   (sảnh mặc định bg-full.webp) tự thêm vào đầu nếu bgRules không có. */
function buildTiersFromBgRules(rules) {
  if (!Array.isArray(rules) || !rules.length) return null;
  const byAt = new Map(TIERS_FALLBACK.map(t => [t.at, t]));
  const seen = new Set(), out = [];
  for (const r of rules) {
    if (!r) continue;
    const at = Number(r.viewers != null ? r.viewers : r.views);
    const file = typeof (r.file || r.bg) === 'string' ? (r.file || r.bg).trim() : '';
    if (!isFinite(at) || at < 0 || !file || seen.has(at)) continue;
    seen.add(at);
    const fb = byAt.get(at);
    const label = typeof r.label === 'string' ? r.label.trim().slice(0, 40) : '';
    let royal = r.royal === true ? 1 : r.royal === false ? 0 : Number(r.royal);
    if (!isFinite(royal)) royal = fb ? fb.royal : 0;
    royal = Math.max(0, Math.min(2, Math.round(royal)));
    out.push({ at, name: label || (fb ? fb.name : 'Mốc ' + at + ' lượt xem'), file, royal });
  }
  if (!out.length) return null;
  out.sort((a, b) => a.at - b.at);
  if (out[0].at > 0) out.unshift({ at: 0, name: 'Lễ Ấm Áp', file: 'bg-full.webp', royal: 0 });
  return out;
}
/* Điểm đứng trên sân khấu trong PHÒNG RỘNG (% chiều cao phòng), theo từng ảnh phông */
/* Góc máy theo từng nền (nền nào sân khấu nằm chỗ khác thì khung hình bám theo).
   Khung vị trí nhân vật (bàn/sàn/đường đứng) nằm ở people.js TABLE_FRAMES. */
const BG_VIEW = { 'bg-sanh-moi.webp': { home: [50, 40, 0.63], stage: [50, 41, 1.02] } };
let curView = null;
const tierOf = v => { let t = 0; TIERS.forEach((x, i) => { if (v >= x.at) t = i; }); return t; };

/* ============ PRELOAD TOÀN BỘ HÌNH NGAY KHI MỞ GAME (Nguyen yêu cầu
   2026-11-04 19:40, sau ảnh chụp: đang ở mốc Kim Tuyến mà sảnh TRỐNG ĐỎ
   — nền của mốc chỉ được tải khi đủ view mới chuyển, đúng lúc live đông
   request tranh nhau thì rớt/treo, CSS không có gì để hiện). Nay vừa mở
   game là tải TRƯỚC + giải mã sẵn: cả 6 nền của 6 mốc, 2 ảnh MC, toàn
   bộ sprite cô dâu/chú rể/khách và 20 avatar mẫu. Mỗi file được theo
   dõi trạng thái ok/lỗi (ghi vào hộp chẩn đoán __diag.assets), lỗi tự
   thử lại 2 lần kèm ?r=. setBackground gặp file đã preload ok thì hiện
   ngay từ bộ nhớ đệm — chuyển mốc giữa buổi live không còn phụ thuộc
   vào việc tải ảnh lúc đông người nữa. */
const ASSET_IMGS = [
  'img/mc.png', 'img/mc-nu.png',
  'img/bride.png', 'img/bride2.png', 'img/bride3.png', 'img/bride4.png', 'img/bride5.png',
  'img/groom.png', 'img/groom2.png', 'img/groom3.png', 'img/groom4.png', 'img/groom5.png',
  'img/royal-bride1.png', 'img/royal-bride2.png', 'img/royal-bride3.png', 'img/royal-bride4.png', 'img/royal-bride5.png', 'img/royal-bride6.png', 'img/royal-bride7.png', 'img/royal-groom1.png', 'img/royal-groom2.png', 'img/royal-groom3.png', 'img/royal-groom4.png', 'img/royal-groom5.png', 'img/royal-groom6.png', 'img/royal-groom7.png',
  'img/bride6.png', 'img/groom6.png', 'img/bride7.png', 'img/groom7.png', 'img/bride8.png', 'img/groom8.png', 'img/bride9.png', 'img/groom9.png',
  'img/guest-girl.png', 'img/guest-girl2.png', 'img/guest-girl3.png', 'img/guest-girl4.png', 'img/guest-girl5.png', 'img/guest-girl6.png', 'img/guest-girl7.png',
  'img/guest-boy.png', 'img/guest-boy2.png', 'img/guest-boy3.png', 'img/guest-boy4.png', 'img/guest-boy5.png', 'img/guest-boy6.png',
  ...Array.from({ length: 23 }, (_, i) => `img/avatars/av-f${i + 1}.webp`),
  ...Array.from({ length: 22 }, (_, i) => `img/avatars/av-m${i + 1}.webp`),
];
const assetState = {};    // file -> 'ok' | 'err'
const assetPromise = {};  // file -> Promise<boolean>
function preloadOne(file) {
  if (assetPromise[file]) return assetPromise[file];
  assetPromise[file] = new Promise(res => {
    let n = 0;
    const attempt = () => {
      const img = new Image();
      img.onload = () => {
        // "Tải xong" mà VẼ KHÔNG RA (file bị cắt cụt giữa chừng) cũng là hỏng -> đi ngả thử lại như lỗi
        if (P.imgPaintOk && !P.imgPaintOk(img)) { img.onerror(); return; }
        assetState[file] = 'ok';
        if (window.__diag) (window.__diag.assets = window.__diag.assets || {})[file] = 'ok';
        if (img.decode) img.decode().catch(() => {});   // giải mã sẵn để lúc áp CSS hiện ngay, không chớp trắng
        res(true);
      };
      img.onerror = () => {
        if (n < 2) { n++; setTimeout(attempt, 600); return; }
        assetState[file] = 'err';
        if (window.__diag) { (window.__diag.assets = window.__diag.assets || {})[file] = 'err'; window.__diag.errs.push('preload fail: ' + file); }
        res(false);
      };
      img.src = n ? file + '?r=' + n : file;
    };
    attempt();
  });
  return assetPromise[file];
}
function startPreload() { for (const f of [...TIERS.map(t => t.file), ...ASSET_IMGS]) preloadOne(f); }
startPreload();
/* V11 — BAO KHI NEN XONG (cho diem 5, nen truoc nhan vat sau): people.js
   cho tin nay roi moi tai + giai ma anh nhan vat, de 6 file nen khong bi
   xep sau hang doi anh nhan vat luc mo game (cache lanh). Qua 5s ma nen
   chua xong thi van bao de khong ket nhan vat. */
window.__bgReady = false;
Promise.race([
  Promise.all(TIERS.map(t => assetPromise[t.file] || Promise.resolve(null))),
  new Promise(r => setTimeout(() => r(null), 5000)),
]).then(() => { window.__bgReady = true; window.dispatchEvent(new Event('damcuoi:bgready')); });

const LS_TOTAL = isDemo ? 'damcuoi.totalviews.demo' : 'damcuoi.totalviews';
/* C5 — doc/ghi localStorage LUON co try/catch: trinh duyet chan storage
   (Safari Private, quota day) nem SecurityError/QuotaExceededError —
   truoc day 2 dong getItem o top-level khong co guard nen game chet
   trang ngay luc mo. Loi thi tra fallback / bo qua, game van chay. */
function lsGet(key, fallback) { try { const v = localStorage.getItem(key); return v == null ? fallback : v; } catch (e) { return fallback; } }
function lsSet(key, value) { try { localStorage.setItem(key, value); } catch (e) {} }
let totalBase = parseInt(lsGet(LS_TOTAL, '0') || '0', 10) || 0;
const counted = new Set();
let demoExtra = 0;
const totalViews = () => totalBase + counted.size + demoExtra;
let saveTimer = 0;
function persistTotal() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => lsSet(LS_TOTAL, String(totalBase + counted.size)), 1500);
}
function countView(user) {
  if (!user || !user.id || counted.has(user.id)) return;
  counted.add(user.id);
  persistTotal();
  refreshBg(false);
}

/* BỘ ĐẾM CẶP ĐÔI (học theo live đối thủ "CẶP ĐÔI #161" — Nguyen duyệt
   2026-11-04 18:08): đếm số LỄ THÀNH HÔN đã diễn ra — mỗi lần một cặp
   đặt chân lên sân khấu tính một lễ. Lưu bền qua các phiên như tổng
   lượt xem; nút Reset ở trang quản trị xoá cả số này. */
const LS_COUPLLES = isDemo ? 'damcuoi.couples.demo' : 'damcuoi.couples';
let couplesDone = parseInt(lsGet(LS_COUPLLES, '0') || '0', 10) || 0;
function renderCoupleCount() {
  const el = $('couplecount');
  if (!el) return;
  el.style.display = couplesDone > 0 ? '' : 'none';
  if (couplesDone > 0) el.textContent = `💒 CẶP ĐÔI THỨ ${fmtNum(couplesDone)}`;
}

/* SỔ MỪNG CƯỚI (học theo live đối thủ — Nguyen duyệt 2026-11-04 18:08):
   sổ chạy các món quà gần nhất, nằm dưới bảng cặp đôi được yêu thích —
   người tặng được ghi danh công khai thì càng muốn tặng tiếp. Chỉ giữ
   trong phiên live hiện tại, tối đa 5 dòng, mới nhất lên đầu. */
const giftLedger = [];
function addLedger(user, giftName, dia) {
  giftLedger.unshift({ ten: user ? user.nickname : 'Khách', gift: giftName || 'quà', dia: dia || 0 });
  if (giftLedger.length > 5) giftLedger.length = 5;
  const box = $('ledger');
  if (!box) return;
  box.style.display = '';
  box.querySelector('ul').innerHTML = giftLedger.map((g, i) =>
    `<li${i === 0 ? ' class="new"' : ''}><span>🎁 ${escapeHtml(g.ten)}</span><em>${escapeHtml(g.gift)}${g.dia > 0 ? ' · ' + fmtNum(g.dia) + ' xu' : ''}</em></li>`).join('');
}

/* ============ Trạng thái ============ */
let cfg = {};
/* H10b — CẤU HÌNH MẶC ĐỊNH khi không có LiveBridge: NPC LUÔN CHẠY khi
   game chạy — mở game riêng (thiếu file livebridge-client.js) hoặc
   LiveBridge quá 8s chưa trả config thì áp bộ này rồi chạy npcSync.
   Mirror đúng mapping defaults cho các key game cần để không crash
   (NPC, sân khấu, nền, âm thanh, hàng chờ). Config thật đến muộn vẫn ghi
   đè bình thường (applyConfig chạy lại, npcSync có guard NPC.started nên
   không spawn trùng NPC). Các câu MC thiếu thì applyConfig tự lấy câu
   mặc định trong code, không cần liệt kê hết ở đây. */
const DEFAULT_CFG = {
  mcName: 'MC Anh Tú', mcNameNu: 'MC Ngọc Trâm',
  npcVoiceOn: true, npcVoice: 'vi-VN-HoaiMyNeural', npcVoiceNam: 'vi-VN-NamMinhNeural', npcVoiceMinGapSec: 8, npcVoiceMaxPerMin: 6,
  coupleSec: 9, nhaCapTiepSauGiay: 6,
  phongToGoiTen: 1.32, coCapGiua: 1.22, phongVangDuoi: 15,
  zoomGoiTen: 1.18, zoomBamTheo: 1.08, lechCapGiua: 1.8,
  uuTienChoTrong: true, nguongDongNguoi: 70, phutImMatCho: 4, tyLeChoTrong: 0.45,
  mcMinSec: 18, mcMaxSec: 26,
  npcTuDong: true, npcNguongVang: 6, npcMoiBaoLauGiay: 25, npcNghiGiay: 60,
  npcDanhSach: ['Ngọc Linh', 'Tuấn Kiệt', 'Mỹ Duyên', 'Minh Đức', 'Hồng Nhung', 'Quốc Bảo', 'Thu Hằng', 'Hoàng Long', 'Phương Thảo', 'Tiến Dũng'],
  bgRules: [
    { viewers: 10, file: 'bg-500.webp', label: 'Hoa Khai', royal: 0 },
    { viewers: 30, file: 'bg-2000.webp', label: 'Kim Tuyến', royal: 0 },
    { viewers: 50, file: 'bg-5000.webp', label: 'Lung Linh', royal: 0 },
    { viewers: 100, file: 'bg-10000.webp', label: 'Đại Tiệc Vàng', royal: 1 },
    { viewers: 200, file: 'bg-sanh-moi.webp', label: 'Đám Cưới Hoàng Gia', royal: 2 },
  ],
  rulesLines: ['💌 Tag @tên người thương → cùng lên sân khấu', '🎁 Quà càng lớn, pháo hoa càng to', '👁 Tổng lượt xem càng cao → sảnh cưới càng xịn', '❤️ Cứ 10 tim → mưa hoa + pháo hoa + pháo giấy', '❤️ Thả tim tăng điểm cho cặp của bạn (tối đa 100 điểm)', '➕ Follow → vòng hoa vàng + tim bay chào mừng'],
  guideLines: ['💌 Gõ "@tên người thương" → 2 bạn lên sân khấu', '🎁 Tặng quà → pháo hoa cho cặp đôi tâm điểm', '👑 Cặp được tặng nhiều quà nhất sẽ đội vương miện', '👁 Kéo bạn bè vào xem → sảnh nâng cấp theo tổng lượt view', '👗 Gõ "nam" / "nữ" / "đổi đồ" → đổi nhân vật, trang phục'],
  musicOn: true, musicVolume: 35, sfxOn: true, sfxVolume: 55,
  choDoiLanThapGiay: 30, hangChoToiDa: 4, tuGhepDoiKhiRong: true, tuGhepDoiSauGiay: 5,
  /* TIM + FOLLOW (2026-11-06): mocTimHieuUng tim/nguoi thi no ca 3 hieu
     ung (lieu timHoaRoi/timPhaoHoa/timPhaoGiay — tim mien phi nen lieu
     nho hon qua tra tien) + cong diemMoiTim diem/tim vao cap cua nguoi
     tha, cap diemTimToiDa diem/nguoi/cap. */
  mocTimHieuUng: 10, diemMoiTim: 1, diemTimToiDa: 100, timHoaRoi: 50, timPhaoHoa: 3, timPhaoGiay: 50,
  rongKhungMc: 100, rongThongBao: 100, khungThongBaoX: 0, khungThongBaoY: 0,
  /* F6b (nv1, 2026-11-06): xoay man hinh qua config LiveBridge (user doi
     nut tu trang game sang config) — mac dinh TAT; bat thi game xoay 90
     do de xem ngang tren man laptop (chi de xem, live van quay game doc). */
  xoayManHinh: false,
};
const known = new Map();       // user.id -> user (để parse tag theo tên)
const nameFoldCache = new Map();   // M13: user.id -> { nick, uid } (ten da gap, xem foldedNames)
const greeted = new Set();
let lastGreet = -1e9;
const coupleByKey = new Map();
/* C4 — phuong an A: go dang ky cap. coupleByKey song trong IIFE cua
   main.js nen people.js khong xoa truc tiep duoc — expose qua P de
   dissolveCouple() goi ngay luc tan cap, ke ca cap THAT (truoc day chi
   npcDissolveRested() moi xoa, lai bo qua cap that). Xoa ca courtSince
   de NPC khong giu moc nghi cua cap da chet. */
P.unregisterCouple = key => { coupleByKey.delete(key); NPC.courtSince.delete(key); };
const LS = isDemo ? 'damcuoi.scores.demo' : 'damcuoi.scores';
let scores = {};
try { scores = JSON.parse(lsGet(LS, '{}') || '{}'); } catch (e) { scores = {}; }
/* Làm sạch điểm đã lưu từ các bản game đời đầu: có mục tên bị lưu dạng
   OBJECT (lên bảng thành "[object Object]") và điểm trống ("undefined").
   Chuẩn hoá ngay lúc nạp: tên là object thì lấy nickname, điểm ép số,
   mục nào không cứu được thì bỏ — bảng tự lành, khỏi xoá tay. */
for (const k of Object.keys(scores)) {
  const s = scores[k] || {};
  const ten = v => typeof v === 'string' ? v : (v && typeof v.nickname === 'string' ? v.nickname : '');
  s.a = ten(s.a); s.b = ten(s.b); s.score = Number(s.score) || 0;
  if (!s.a || !s.b) delete scores[k];
}
const saveScores = () => lsSet(LS, JSON.stringify(scores));
/* H3: key cap dan dau BXH (Top 1) — luu ben de sau reload khoi phuc vuong
   mien khi cap do duoc ghep lai (coupleByKey trong sau reload nen chi
   nho key thi khong du, phai doi cap that su co mat trong phong). */
const LS_LEADER = isDemo ? 'damcuoi.leader.demo' : 'damcuoi.leader';
let savedLeaderKey = lsGet(LS_LEADER, '') || '';

function register(user) {
  if (!user || !user.id) return null;
  const old = known.get(user.id);
  const u = old ? { ...old, ...user, avatar: user.avatar || old.avatar } : { ...user };
  known.set(user.id, u);
  /* M13: ten doi thi xoa cache ten gap cua nguoi do (foldedNames tinh lai lan sau). */
  if (old && (old.nickname !== u.nickname || old.uniqueId !== u.uniqueId)) nameFoldCache.delete(u.id);
  if (u.avatar) P.setAvatar(u.id, u.avatar);   // anh ve muon thi chip ten cap nhat sang anh that ngay
  return u;
}
function ensureGuest(user) {
  const u = register(user);
  if (!u) return null;
  if (!u.npc) countView(u);              // NPC gắn sẵn vào phòng KHÔNG tính lượt xem (mốc sảnh là của mắt xem thật)
  const moi = !P.get(u.id);   // lần đầu xuất hiện trong phòng?
  const p = P.spawn(u);
  if (p) { if (u.npc) p.npc = true; P.touch(u.id); }   // bất kỳ sự kiện nào cũng tính là còn tương tác -> giữ chỗ đẹp
  if (moi && p && !u.npc) maybeWelcomePan(p);          // NPC vào lặng lẽ: không giật cam chào, không câu chào MC
  return p;
}
/* Danh dau TUONG TAC that de tu ghep (Nguyen 2026-11-05): chi 4 loai
   tinh — tha tim (like), comment, tang qua (gift), chia se (share).
   Luu rieng o p.lastInteract, KHONG dung chung lastActive (lastActive
   con phuc vu nhuong cho — 'seen'/follow/join cung cham vao do, nguoi
   chi ngoi xem trong sanh chua chac con xem live). */
function markInteract(user) {
  const p = user && user.id ? P.get(user.id) : null;
  if (p) p.lastInteract = Date.now();
}
/* LIA CAM CHÀO KHÁCH MỚI (Nguyen yêu cầu 2026-11-04): chỉ khi KHÔNG có cặp
   nào đang làm lễ hay đang chờ tới lượt — có đám cưới thì tuyệt đối không
   giật cam khỏi sân khấu. Chống lia dồn dập khi khách vào ồ ạt (tối thiểu
   6s giữa 2 lần) và không chen khi camera đang bận việc khác. */
let lastWelcomePanAt = 0;
function maybeWelcomePan(p) {
  if (cfg.liaCamNguoiMoiKhiVang === false) return;
  if (P.stageBusy && P.stageBusy()) return;
  if (Cam.followC || Date.now() < Cam.busyUntil) return;
  const now = Date.now();
  if (now - lastWelcomePanAt < 6000) return;
  lastWelcomePanAt = now;
  const holdMs = (Number(cfg.liaCamNguoiMoiGiay) || 4) * 1000;
  Cam.busyUntil = now + holdMs + 1500;
  Cam.panTo(p.home.x, p.home.y - 2, 1.0);
  setTimeout(() => {
    if (!Cam.followC && Date.now() >= Cam.busyUntil - 100 && !(P.stageBusy && P.stageBusy())) Cam.home();
  }, holdMs + 1500);
}
function coupleScore(c, pts) {
  if (!c || pts <= 0 || c.a.npc || c.b.npc) return;   // cặp NPC không ghi điểm BXH — điểm là của khách thật
  coupleByKey.set(c.key, c);
  const s = scores[c.key] || (scores[c.key] = { a: c.a.user.nickname, b: c.b.user.nickname, score: 0 });
  s.a = c.a.user.nickname; s.b = c.b.user.nickname;
  s.score += pts;
  saveScores(); renderBoard();
}
/* RESET TOÀN BỘ từ trang quản trị (nút "Reset điểm" của LiveBridge gửi
   lệnh 'reset-scores'): với game đám cưới, reset = xoá CẢ bảng xếp hạng +
   điểm hạnh phúc + TỔNG LƯỢT XEM (Nguyen hỏi 2026-11-04 — trước đây game
   không hề nghe lệnh này nên bấm reset chẳng có tác dụng gì). Khách đang
   trong phòng giữ nguyên; số liệu tích luỹ về 0, sảnh quay lại mốc đầu. */
function resetAll() {
  scores = {}; saveScores(); renderBoard();
  couplesDone = 0;
  lsSet(LS_COUPLLES, '0');
  renderCoupleCount();
  totalBase = 0; counted.clear(); demoExtra = 0;
  clearTimeout(saveTimer);
  lsSet(LS_TOTAL, '0');
  refreshBg(false);
  showBanner('🔄 ĐÃ RESET TOÀN BỘ · Bảng xếp hạng, điểm hạnh phúc và tổng lượt xem đã về 0', 5200);
}
function renderBoard() {
  const top = Object.entries(scores).map(([key, s]) => ({ key, a: String((s && s.a) || ''), b: String((s && s.b) || ''), score: Number(s && s.score) || 0 })).filter(s => s.a && s.b).sort((x, y) => y.score - x.score).slice(0, 3);
  const board = $('board');
  /* Bang LUON hien: chua co cap nao ghi diem thi hien dong moi choi thay vi
     an han bang — truoc day an khi rong nen nhin nhu bang "bi mat" luc moi
     mo game/chua co cap len san khau (Nguyen bao 2026-11-04). */
  board.style.display = '';
  board.querySelector('ol').innerHTML = top.length
    ? top.map((s, i) =>
      `<li><span>${i === 0 ? '👑 ' : ''}${escapeHtml(s.a)} ❤ ${escapeHtml(s.b)}</span><em>${fmtNum(s.score)}</em></li>`).join('')
    : '<li><span>💌 Chưa có cặp nào — tag người thương để mở màn!</span></li>';
  /* H3 — MOT luat duy nhat: vuong mien theo cap dan dau BXH. Chi gan khi
     cap do con trong coupleByKey VA ca hai nguoi con trong phong (sau
     reload coupleByKey trong, gan cho undefined nhu cu se go het roi
     khong gan lai cho ai). */
  const leader = top.length ? coupleByKey.get(top[0].key) : null;
  if (leader && leader.a && leader.b && P.get(leader.a.user.id) && P.get(leader.b.user.id)) P.setCrown(leader);
  else P.setCrown(null);
  if (top.length && top[0].key !== lastLeaderKey) {
    const first = lastLeaderKey === null;
    lastLeaderKey = top[0].key;
    savedLeaderKey = top[0].key; lsSet(LS_LEADER, savedLeaderKey);   // H3: luu Top 1 de khoi phuc sau reload
    if (!first && Date.now() - lastLeaderAt > 25000) {
      lastLeaderAt = Date.now();
      showBanner(`👑 CẶP ĐÔI DẪN ĐẦU MỚI · ${top[0].a} ❤ ${top[0].b}`, 5000);
      FX.fireworks(2); FX.hearts(14);
    }
  } else if (!top.length && lastLeaderKey !== null) {
    lastLeaderKey = null; savedLeaderKey = ''; lsSet(LS_LEADER, '');
  }
}
let lastLeaderKey = null, lastLeaderAt = 0;
function fmtNum(n) { return n >= 10000 ? (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k' : String(n); }
function escapeHtml(s) { return String(s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch])); }

/* ============ MC ============ */
const MC = {
  name: 'MC',
  queue: [], busyUntil: 0, timer: null, lastLine: '',
  lines: [], funny: [], couple: [], thank: [], greet: [], follow: [], milestone: [], tagVang: [], tagDaCoDoi: [], sapMoc: [],
  personas: null, _lastPersona: -1, _streak: 0,   // 2 MC luân phiên (nam/nữ) — dựng trong applyConfig
};
function fill(tpl, vars) {
  return String(tpl).replace(/\{(\w+)\}/g, (m, k) => (vars[k] != null ? vars[k] : m));
}
/* ===== Voice theo ĐOẠN (Nguyen chot): câu mẫu tách thành đoạn TĨNH + đoạn
   TÊN riêng. Đoạn tĩnh tổng hợp 1 lần rồi cache mãi (làm nóng sẵn lúc nhận
   config); mỗi sự kiện chỉ tốn tổng hợp tiếng của cái tên ngắn, phát nối
   tiếp [tĩnh][tên][tĩnh]... thay vì tổng hợp cả câu dài không bao giờ
   trúng cache. Chữ hiển thị vẫn là câu đầy đủ như cũ. ===== */
function splitTpl(tpl) {
  const raw = String(tpl).split(/\{(\w+)\}/);
  const toks = [];
  for (let i = 0; i < raw.length; i++) toks.push(i % 2 ? { ph: raw[i] } : { tx: raw[i] });
  return toks;
}
const HAS_WORD = /[\p{L}\p{N}]/u;
function buildParts(tpl, vars) {
  if (!/\{(\w+)\}/.test(tpl)) return null;   // không placeholder -> đi đường speak() cả câu như cũ
  vars = vars || {};
  const parts = [];
  let buf = '';
  const flush = () => { const s = buf.trim(); buf = ''; if (s && HAS_WORD.test(s)) parts.push(s); };
  for (const t of splitTpl(tpl)) {
    if (t.tx != null) { buf += t.tx; continue; }
    const v = vars[t.ph];
    if (v == null || v === '') { buf += '{' + t.ph + '}'; continue; }   // thiếu biến: giữ nguyên token trong đoạn tĩnh
    flush();
    parts.push(String(v));
  }
  flush();
  return parts.length ? parts : null;
}
function staticSegmentsOf(tpl) {
  const out = [];
  for (const t of splitTpl(tpl)) {
    if (t.tx == null) continue;
    const s = t.tx.trim();
    if (s && HAS_WORD.test(s)) out.push(s);
  }
  return out;
}
function pick(arr, avoid) {
  if (!arr || !arr.length) return '';
  let s = arr[Math.floor(Math.random() * arr.length)], n = 0;
  while (s === avoid && arr.length > 1 && n++ < 6) s = arr[Math.floor(Math.random() * arr.length)];
  return s;
}
/* Chọn MC cho câu sắp nói: NGẪU NHIÊN nam/nữ (đúng ý chủ phòng — luân
   phiên kiểu random, không phải nam rồi nữ rồi nam cứng nhắc), chỉ tránh
   để 1 người nói 3 câu liên tiếp kẻo nhìn như chỉ có 1 MC. */
function pickPersona() {
  if (!MC.personas || !MC.personas.length) return null;
  if (MC.personas.length === 1) return MC.personas[0];
  let i = Math.random() < 0.5 ? 0 : 1;
  if (i === MC._lastPersona) { MC._streak++; if (MC._streak >= 3) { i = 1 - i; MC._streak = 1; } }
  else MC._streak = 1;
  MC._lastPersona = i;
  return MC.personas[i];
}
function mcSay(text, prio, kind, parts) {
  if (!text) return;
  const persona = pickPersona();   // chốt người nói NGAY khi câu vào hàng chờ — để chuyển giọng đúng giọng của người đó
  MC.queue.push({ text, prio: prio || 1, kind: kind || ((prio || 1) >= 2 ? 'event' : 'random'), at: performance.now(), parts: parts || null, persona });
  MC.queue.sort((a, b) => b.prio - a.prio);
  if (MC.queue.length > 4) MC.queue.length = 4;
  if (window.NpcVoice) {
    // chuyển giọng TRƯỚC ngay khi câu vào hàng chờ: có parts thì prefetch
    // từng đoạn (đoạn tĩnh thường đã nóng sẵn), không thì cả câu như cũ
    const pv = persona && persona.voice ? persona.voice : undefined;
    if (parts && parts.length >= 2) { for (const p of parts) NpcVoice.prefetch(p, pv); }
    else NpcVoice.prefetch(text, pv);
  }
  mcPump();
}
let mcSpeaking = false;
async function mcPump() {
  if (mcSpeaking) return;
  const now = performance.now();
  if (now < MC.busyUntil || !MC.queue.length) return;
  MC.queue = MC.queue.filter(m => now - m.at < 40000);
  const m = MC.queue.shift();
  if (!m) return;
  mcSpeaking = true;
  const el = $('mc');
  let shown = false, dur = Math.min(9000, Math.max(3400, m.text.length * 95));
  const show = voiceDurMs => {
    if (shown) return; shown = true;
    el.querySelector('.say b').textContent = m.persona ? m.persona.name : MC.name;
    const pic = el.querySelector('.pic img');
    if (pic && m.persona && m.persona.img && !pic.src.endsWith(m.persona.img)) pic.src = m.persona.img;
    el.querySelector('.say span').textContent = m.text;
    el.classList.add('on');
    placeBanner();   // MC vua hien: day banner xuong duoi bong MC neu dang trung
    if (voiceDurMs) dur = Math.min(14000, Math.max(dur, voiceDurMs + 700));
    MC.busyUntil = performance.now() + dur;
    setTimeout(() => { el.classList.remove('on'); mcSpeaking = false; setTimeout(mcPump, 350); }, dur);
  };
  let r = { played: false };
  if (window.NpcVoice && NpcVoice.enabled()) {
    // chữ chỉ hiện khi voice bắt đầu phát (onStart) — chữ và tiếng khớp nhau;
    // voice bị chặn tần suất / lỗi / chậm quá thì hiện chữ luôn, không kẹt game.
    // Câu có parts (>=2 đoạn) thì phát theo đoạn: tĩnh đã cache + tên riêng.
    try {
      const pv = m.persona && m.persona.voice ? m.persona.voice : undefined;   // MC nam đọc giọng nam, MC nữ giọng mặc định (nữ)
      const voiceP = (m.parts && m.parts.length >= 2 && NpcVoice.speakParts)
        ? NpcVoice.speakParts(m.parts, { kind: m.kind, voice: pv, onStart: ({ durationMs }) => show(durationMs) })
        : NpcVoice.speak(m.text, { kind: m.kind, voice: pv, onStart: ({ durationMs }) => show(durationMs) });
      /* H6: voice treo khong bao gio resolve -> MC ket vinh vien (mcSpeaking
         khong co gi dat lai). Race voi timeout 9s; het gio thi coi nhu
         khong phat duoc, hien chu nhu cu. */
      r = await Promise.race([voiceP, new Promise(res => setTimeout(() => res({ played: false }), 9000))]) || { played: false };
    } catch (_) { /* rơi xuống hiện chữ */ }
  }
  /* H6: voice bao played=true nhung onStart chua kip chay (show chua chay)
     thi cau thoai mat han — hien chu luon. show(0) tu hen gio an + dat
     lai mcSpeaking; chi khi show that su khong chay moi dat tay o day. */
  if (!shown) show(0);
}
function mcReact(prio, tplArr, vars) {
  const tpl = pick(tplArr);
  if (!tpl) return;
  vars = vars || {};
  mcSay(fill(tpl, vars), prio, undefined, buildParts(tpl, vars));
}
function mcRandomLoop(first) {
  const lo = (cfg.mcMinSec || 18) * 1000, hi = (cfg.mcMaxSec || 26) * 1000;
  setTimeout(() => {
    const funny = Math.random() < 0.45;
    const line = pick(funny ? MC.funny : MC.lines, MC.lastLine);
    MC.lastLine = line;
    if (line) mcSay(line, 1, 'random');
    mcRandomLoop(false);
  }, first ? 5000 : lo + Math.random() * Math.max(0, hi - lo));   // câu đầu sau ~5s: mở game là thấy MC ngay, khỏi tưởng MC bị lỗi khi phòng đang vắng
}

/* ============ Bảng hướng dẫn / luật chơi ============ */
let guideIdx = 0, guideTimer = null;
function startGuide() {
  /* H12: mcGuide (dòng MC hướng dẫn trong config) cũng xoay cùng luật
     + hướng dẫn — trùng y hệt dòng đã có thì chỉ hiện 1 lần. */
  let lines = [...new Set([...(cfg.rulesLines || []), ...(cfg.guideLines || []), ...(cfg.mcGuide || [])].filter(Boolean))];
  const el = $('guide');
  /* Cả luật lẫn hướng dẫn đều rỗng (config hỏng/trống) -> dùng 3 dòng mặc
     định trong code để khung trái không bao giờ nằm chết trống. */
  if (!lines.length) lines = ['💌 Comment tag tên người thương để ghép đôi lên sân khấu', '🎁 Tặng quà để cặp của bạn được ưu tiên lên sân khấu', '👗 Gõ "nam" / "nữ" / "đổi đồ" để đổi nhân vật, trang phục'];
  /* THỰC ĐƠN QUÀ (học theo live đối thủ — Nguyen duyệt 2026-11-04 18:08):
     3 dòng quà -> hiệu ứng theo mốc xu trong config (giftFx), khớp đúng
     cách tính điểm, để luôn có mặt trong vòng xoay dù danh sách hướng
     dẫn trong config có bị sửa thế nào. */
  lines.push('🎁 Tặng quà → mưa hoa, pháo hoa chúc phúc cặp đôi', '🎆 Quà từ 99 xu → pháo hoa lớn + banner mừng cưới', '💞 Quà cộng điểm cho cặp đang làm lễ — nhất bảng đội vương miện 👑');
  const show = () => { el.classList.remove('out'); el.textContent = lines[guideIdx++ % lines.length]; };
  show();
  clearInterval(guideTimer);
  guideTimer = setInterval(() => { el.classList.add('out'); setTimeout(show, 380); }, 4200);
}
function renderRules() { /* luật chơi đã gộp vào khung hướng dẫn xoay vòng cho gọn màn hình */ }

/* HIỆN TẤT CẢ KHUNG (hienTatCaKhung, Nguyen yêu cầu 2026-11-04): bật
   lên là mọi khung đều hiện — kể cả khung đang trống (hàng chờ chưa có
   ai, sổ chưa có quà, MC chưa nói...) — kèm nội dung MẪU, để chỉnh vị
   trí/cỡ chữ nhìn thấy hết một lượt. Tắt đi là game chạy như thường.
   CSS body.showall ép hiển thị; hàm này lo phần nội dung mẫu + banner
   mẫu + bong bóng MC mẫu. */
function applyShowAll() {
  const on = cfg.hienTatCaKhung === true;
  document.body.classList.toggle('showall', on);
  const banner = $('banner');
  if (!on) {
    if (banner) banner.classList.remove('on');
    /* Dọn nội dung MẪU đã điền lúc bật (chỉ dọn đúng phần mẫu, không
       đụng nội dung thật) để các khung về lại trạng thái trống như cũ. */
    const ul0 = document.querySelector('#ledger ul');
    if (ul0 && ul0.textContent.includes('Khách Mẫu')) ul0.innerHTML = '';
    const q0 = $('queue');
    if (q0 && q0.textContent.includes('🧪')) q0.innerHTML = '';
    const cc0 = $('couplecount');
    if (cc0 && cc0.textContent.includes('(mẫu)')) cc0.textContent = '';
    const gt0 = $('goaltext');
    if (gt0 && gt0.textContent.includes('Sảnh Mẫu')) gt0.textContent = '';
    const say0 = document.querySelector('#mc .say');
    if (say0 && say0.textContent.includes('kiểm tra vị trí')) say0.innerHTML = '';
    return;
  }
  const ul = document.querySelector('#ledger ul');
  if (ul && !ul.children.length) ul.innerHTML = '<li><span>Khách Mẫu</span><em>Hoa hồng · 10</em></li>';
  const q = $('queue');
  if (q && !q.textContent.trim()) q.innerHTML = '<div class="qrow">🧪 Sắp tới: <b>Mẫu ❤ Mẫu</b></div>';
  const cc = $('couplecount');
  if (cc && !cc.textContent.trim()) cc.textContent = '💒 CẶP ĐÔI THỨ 1 (mẫu)';
  const gt = $('goaltext');
  if (gt && !gt.textContent.trim()) gt.textContent = 'Sảnh Mẫu · tổng 100 lượt xem — còn 10 lượt nữa lên sảnh mới';
  const say = document.querySelector('#mc .say');
  if (say && !say.textContent.trim()) say.innerHTML = '<b>MC</b>Khung MC — kiểm tra vị trí';
  showBanner('🧪 BANNER — KIỂM TRA VỊ TRÍ', 60000);
}

/* BẢNG LỆNH CHAT (Nguyen yêu cầu 2026-11-04): khung tĩnh ở cột phải cho
   người chơi nhìn là biết gõ gì ra hiệu ứng gì — khớp đúng các lệnh hệ
   thống thật sự bắt (tag, đổi đồ, 3 lệnh hiệu ứng gần đúng, quà). Tắt
   bằng hienBangLenh; tắt lệnh hiệu ứng thì 3 dòng hiệu ứng cũng ẩn. */
function renderCmdBoard() {
  const el = $('cmdboard');
  if (!el) return;
  if (cfg.hienBangLenh === false) { el.style.display = 'none'; return; }
  const fxOff = cfg.hieuUngChat === false;
  el.innerHTML = '<h4>💬 Lệnh chat</h4><ul>'
    + (fxOff ? '' : '<li><span>🌸 "hoa rơi"</span><em>mưa hoa</em></li>'
      + '<li><span>🎆 "pháo hoa"</span><em>pháo hoa</em></li>'
      + '<li><span>🎉 "pháo giấy"</span><em>pháo giấy</em></li>')
    + '<li><span>💌 gõ tên người thương</span><em>lên sân khấu</em></li>'
    + '<li><span>👗 "đổi đồ"</span><em>đổi trang phục</em></li>'
    + '<li><span>🎁 tặng quà</span><em>pháo + điểm</em></li></ul>';
  el.style.display = '';
}

/* ============ Nền / mốc sảnh ============ */
const BG = { file: '', tier: -1 };
function applyTierFx(tier) {
  $('beams').classList.toggle('on', tier >= 2 || !!TIERS[tier].royal);
  $('royalglow').classList.toggle('on', TIERS[tier].royal === 2);
}
let bgToken = 0;
function setBackground(file) {
  P.setBgFile(file);   // nạp khung vị trí khớp với tranh của nền này
  curView = BG_VIEW[file] || null;
  const tk = ++bgToken;
  const el = $('bgfull');
  /* V11 — GIU NEN CU TOI KHI NEN MOI SAN SANG: truoc day doi
     backgroundImage NGAY roi moi cho preload (toi da 3s) — neu file
     chua tai xong thi khung hinh chi con mau nen sau (do dam) cho toi
     khi anh ve. Nay chi doi URL khi file da preload ok (da nam trong
     bo nho dem + da giai ma, hien ngay) hoac khi cho xong no bao ok;
     chua san sang thi nen cu van hien, khong de man hinh trong. */
  const apply = () => { if (tk === bgToken) el.style.backgroundImage = `url("${file}")`; };
  if (assetState[file] === 'ok') { apply(); return; }
  const ready = assetPromise[file] || Promise.resolve(null);
  Promise.race([ready, new Promise(r => setTimeout(() => r(null), 3000))]).then(ok => {
    if (tk !== bgToken) return;
    if (ok === true) { apply(); return; }
    bgRescue(file, tk, el);
  });
}
function bgRescue(file, tk, el) {
  const chain = [file, 'bg-full.webp', 'bg-500.webp'].filter((v, i, a) => a.indexOf(v) === i);
  let ci = 0;
  const probe = (f, n) => {
    if (tk !== bgToken) return;
    const url = n ? f + '?r=' + n : f;
    const img = new Image();
    img.onload = () => {
      if (tk !== bgToken) return;
      if (P.imgPaintOk && !P.imgPaintOk(img)) { img.onerror(); return; }   // nền cụt: báo xong mà vẽ không ra -> đi tiếp chuỗi cứu hộ
      el.style.backgroundImage = `url("${url}")`;
    };
    img.onerror = () => {
      if (tk !== bgToken) return;
      if (n < 2) { setTimeout(() => probe(f, n + 1), 700); return; }
      ci++;
      if (ci < chain.length) {
        if (window.__diag) { window.__diag.errs.push('bg fail: ' + f); window.__diag.uiErr = 'Không tải được nền ' + f + ' — đã lùi về ' + chain[ci]; }
        /* H5: file du phong da chot thi nap KHUNG cua no (P.setBgFile) TRUOC
           khi doi anh — khong thi anh hien la sanh cu ma khung vi tri van
           la sanh moi, cap dung sai cao do, ghe lech ban. */
        if (P.setBgFile) P.setBgFile(chain[ci]);
        if (window.__diag) window.__diag.errs.push('bg rescue: khung vi tri -> ' + chain[ci]);
        el.style.backgroundImage = `url("${chain[ci]}")`;
        probe(chain[ci], 0);
      } else if (window.__diag) { window.__diag.errs.push('bg fail tat ca'); window.__diag.uiErr = 'Không tải được bất kỳ nền nào — kiểm tra LiveBridge có đang chạy không'; }
    };
    img.src = url;
  };
  probe(file, 0);
}

/* ============ Camera lia trong phòng rộng ============ */
let SW = 0, SH = 0, WW = 0, WH = 0;
/* KHÓA TÂM ĐIỂM SÂN KHẤU (Nguyen chốt 2026-11-04 18:31): cặp đang diễn
   là ưu tiên tuyệt đối — phải để họ ĐỨNG ĐỦ 5-6 giây (đúng mốc
   nhaCapTiepSauGiay) camera mới được lia đi chỗ khác. Hàm này trả số
   giây khóa còn lại (0 = hết khóa / không có cặp nào đang diễn). */
function stageLockRemain() {
  if (!P.stageFreshSec) return 0;
  return Math.max(0, (P.releaseSec || 6) - P.stageFreshSec());
}
const Cam = {
  cx: 50, cy: 36, z: 0.63, tx: 50, ty: 36, tz: 0.63, busyUntil: 0,
  apply() {
    const world = $('world');
    if (!world || !WW) return;
    const px = SW / 2 - (this.cx / 100 * WW) * this.z;
    const py = SH / 2 - (this.cy / 100 * WH) * this.z;
    world.style.transform = `translate(${px.toFixed(1)}px,${py.toFixed(1)}px) scale(${this.z})`;
  },
  cullNow() {
    const mx = (SW / 2) / this.z / WW * 100 + 7, my = (SH / 2) / this.z / WH * 100 + 7;
    P.cull(this.cx - mx, this.cy - my, this.cx + mx, this.cy + my);
  },
  clampXY(cx, cy, z) {
    // Kẹp tâm camera để khung hình không lia ra ngoài phòng (tránh dải đen)
    const halfW = (SW / 2) / z / WW * 100, halfH = (SH / 2) / z / WH * 100;
    const mX = Math.min(halfW, 49), mY = Math.min(halfH, 49);
    return [Math.max(mX, Math.min(100 - mX, cx)), Math.max(mY, Math.min(100 - mY, cy))];
  },
  panTo(cx, cy, z) {
    const [x, y] = this.clampXY(cx, cy, z);
    this.tx = x; this.ty = y; this.tz = z;
  },
  snap() { this.cx = this.tx; this.cy = this.ty; this.z = this.tz; this.apply(); this.cullNow(); },
  followC: null, farPair: null, pendingFollow: null, _pendT: 0,
  follow(couple) {
    /* ƯU TIÊN CAMERA (Nguyen chốt 2026-11-04 18:31):
       (a) Cặp đang ĐI LÊN giữ camera trước cặp đang ĐI XUỐNG — không để
           cảnh đi về cướp khung hình của cặp đang lên sân khấu.
       (b) Cặp đang DIỄN chưa đứng đủ 5-6s (khóa tâm điểm còn) thì chưa
           bám cặp khác: cặp đang đi lên được GHI NHỚ, hết khóa sẽ tự
           bám nếu còn đang đi lên; cặp đang đi xuống thì BỎ QUA luôn,
           giữ nguyên camera ở sân khấu cho cặp đang diễn. */
    if (couple && this.followC && this.followC.state === 'toStage' && couple.state !== 'toStage') return;
    const remain = stageLockRemain();
    if (couple && couple.state !== 'stage' && remain > 0) {
      if (couple.state === 'toStage') {
        this.pendingFollow = couple;
        clearTimeout(this._pendT);
        this._pendT = setTimeout(() => {
          const c = this.pendingFollow; this.pendingFollow = null;
          if (c && c.state === 'toStage' && !this.followC) { this.followC = c; this.busyUntil = 0; }
        }, remain * 1000 + 120);
      }
      return;
    }
    this.pendingFollow = null;
    this.followC = couple; this.busyUntil = 0;
  },
  unfollow() { this.followC = null; this.farPair = null; this.pendingFollow = null; clearTimeout(this._pendT); },
  home() { const v = (curView && curView.home) || [50, 36, 0.63]; this.panTo(v[0], v[1], v[2]); },
  stage() { const v = (curView && curView.stage) || [50, 34, 1.02]; this.panTo(v[0], v[1], v[2]); },
  toScreen(x, y) {
    return { fx: 0.5 + (x - this.cx) / 100 * WW * this.z / SW, fy: 0.5 + (y - this.cy) / 100 * WH * this.z / SH };
  },
};
/* Zoom vừa đủ để CẢ HAI người lọt khung hình (dựa trên khoảng cách giữa họ) */
function fitZoom(a, b, padX, padY, zMax) {
  const zx = 31.25 / (Math.abs(a.x - b.x) + padX);
  const zy = 45.45 / (Math.abs(a.y - b.y) + padY);
  return Math.max(0.55, Math.min(zMax, zx, zy));
}
/* Vòng camera chạy theo rAF (60fps, khớp nhịp vẽ của trình duyệt).
   Dùng lò xo giảm chấn (smooth-damp): vận tốc bắt đầu từ 0, tăng tốc dần rồi
   chậm dần khi tới đích — như máy quay thật, không giật đầu/giật cuối. */
function damp(cur, target, vel, smoothTime, dt) {
  const omega = 2 / smoothTime;
  const x = omega * dt;
  const e = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);
  const change = cur - target;
  const temp = (vel + omega * change) * dt;
  let v = (vel - omega * temp) * e;
  let out = target + (change + temp) * e;
  if ((target - cur > 0) === (out > target)) { out = target; v = 0; }  // chống vọt qua đích
  return [out, v];
}
let camLastT = 0, camCullT = 0;
function camLoop(t) {
  requestAnimationFrame(camLoop);
  if (!WW) return;
  const dt = Math.min(0.05, camLastT ? (t - camLastT) / 1000 : 0.016);
  camLastT = t;
  const c = Cam.followC;
  if (c && c.a && c.b) {
    Cam.tz = fitZoom(c.a, c.b, 16, 14, cfg.zoomBamTheo || 1.08);
    const mx = (c.a.x + c.b.x) / 2, my = (c.a.y + c.b.y) / 2 - 2.5;
    const [x, y] = Cam.clampXY(mx, my, Cam.tz);
    Cam.tx = x; Cam.ty = y;
  }
  [Cam.cx, Cam.vx] = damp(Cam.cx, Cam.tx, Cam.vx || 0, 0.55, dt);
  [Cam.cy, Cam.vy] = damp(Cam.cy, Cam.ty, Cam.vy || 0, 0.55, dt);
  [Cam.z, Cam.vz] = damp(Cam.z, Cam.tz, Cam.vz || 0, 0.75, dt);
  Cam.apply();
  if (t - camCullT > 220) { camCullT = t; Cam.cullNow(); }
}
requestAnimationFrame(camLoop);
/* onPairFocus: VAN DUOC GOI — requestCouple (nhanh wasPair) lia cam toi cap
   cu khi tag lai va cap van con o hang cho 'queue' sau requeue (cap moi
   ghep lan dau thi khong lia — camera chi bam luc len san khau). Comment cu
   ghi "khong con cho nao goi" la sai (M8). */
P.onPairFocus = function (c) {
  Cam.unfollow();
  Cam.busyUntil = Date.now() + 11000;
  const zFit = fitZoom(c.a, c.b, 17, 15, cfg.zoomGoiTen || 1.18);
  if (zFit >= 0.62) {
    // Đủ gần nhau: 1 cú lia tới điểm giữa, zoom vừa đủ thấy cả hai
    Cam.panTo((c.a.x + c.b.x) / 2, (c.a.y + c.b.y) / 2 - 2, zFit);
  } else {
    // Ở quá xa nhau: lia cận cảnh người A trước, lát đổi đồ xong lia sang người B
    Cam.farPair = c;
    Cam.panTo(c.a.x, c.a.y - 2, cfg.zoomGoiTen || 1.18);
  }
};
P.onPairWalk = function (c) { Cam.follow(c); };       // bám theo lúc đi thảm đỏ lên sân khấu
P.onPairReturn = function (c) { Cam.follow(c); syncStageSpotlight(); };   // bám theo lúc đi về chỗ; cặp vừa xuống -> tắt spotlight/tên cặp (V3)
P.onPairHome = function (c) {                          // về tới nơi: nhả camera, quay về toàn cảnh
  if (Cam.followC === c) { Cam.unfollow(); Cam.home(); }
};

P.onPairReveal = function (c) {
  const far = Cam.farPair === c;
  const fp = far ? c.a : { x: (c.a.x + c.b.x) / 2, y: (c.a.y + c.b.y) / 2 };
  const mid = Cam.toScreen(fp.x, fp.y);
  if (FX.ringHearts) FX.ringHearts(mid.fx, mid.fy - 0.05);
  if (FX.petalBurst) FX.petalBurst(mid.fx, mid.fy);
  if (FX.stageSparkle) FX.stageSparkle(mid.fx, mid.fy - 0.04);
  FX.hearts(12, mid.fx, mid.fy);
  if (c.tagVangTen && MC.tagVang && MC.tagVang.length) {
    // Cặp "ghép tạm" vì người thương vắng mặt: MC tranh thủ rủ người thương vào live
    mcReact(2.6, MC.tagVang, { a: c.a.user.nickname, b: c.b.user.nickname, ten: c.tagVangTen });
  } else {
    mcReact(2.5, MC.couple, { a: c.a.user.nickname, b: c.b.user.nickname });
  }
  if (far) {
    // Cặp ở xa nhau: vừa đổi đồ cho A xong thì lia sang B cho khán giả thấy B lên đồ
    Cam.farPair = null;
    setTimeout(() => { if (!Cam.followC) Cam.panTo(c.b.x, c.b.y - 2, cfg.zoomGoiTen || 1.18); }, 350);
  }
};
function bgFileFor(total) {
  /* M14b: nền lấy từ TIERS (đã xây từ cfg.bgRules) — cùng một nguồn sự
     thật với tierOf/tên mốc; admin đổi bgRules thì nền đổi theo, không
     lệch như trước (bgFileFor đọc bgRules, TIERS hardcode riêng). */
  const t = TIERS[tierOf(total)];
  return t ? t.file : 'bg-full.webp';
}
function refreshBg(announce) {
  const total = totalViews();
  const tier = tierOf(total);
  const file = bgFileFor(total);
  /* M14: file nền không có trong TIERS -> cảnh báo vào __diag (chỉ báo
     1 lần/file). Từ M14b bgFileFor đã lấy từ TIERS nên cảnh báo này chỉ
     còn là lưới an toàn nếu sau này có đường khác đổi nền trực tiếp. */
  if (!TIERS.some(t => t.file === file) && !warnedBgFiles.has(file)) {
    warnedBgFiles.add(file);
    if (window.__diag) { (window.__diag.errs = window.__diag.errs || []).push('bgRules file khong co trong TIERS: ' + file); }
  }
  if (file !== BG.file) { BG.file = file; setBackground(file); }
  if (tier !== BG.tier) {
    const old = BG.tier;
    BG.tier = tier;
    FX.setTier(tier);
    P.setTierLevel(tier, TIERS[tier].royal);
    applyTierFx(tier);
    if (announce && old >= 0) {
      showBanner(`🎉 SẢNH CƯỚI NÂNG CẤP · ${TIERS[tier].name}`, 6000);
      mcReact(4, MC.milestone, { moc: TIERS[tier].name });
      FX.fireworks(8); FX.petals(180); A.bell(3);
      if (FX.cannon) FX.cannon();
      if (FX.envelopes) FX.envelopes(60);
      if (FX.glitter) FX.glitter(140);
      if (FX.bokeh) FX.bokeh(14);
      const fl = $('flash'); fl.classList.remove('on'); void fl.offsetWidth; fl.classList.add('on');
    }
  }
  const cur = TIERS[tier], next = TIERS[tier + 1];
  const goal = $('goal');
  goal.style.display = '';
  if (next) {
    const pct = Math.max(0, Math.min(100, (total - cur.at) / (next.at - cur.at) * 100));
    $('goaltext').innerHTML = `🎉 <span class="tiername">${cur.name}</span> · 👁 tổng ${fmtNum(total)} lượt xem — còn ${fmtNum(next.at - total)} lượt nữa lên ${next.name}`;
    $('goalbar').style.width = pct + '%';
  } else {
    $('goaltext').innerHTML = `👑 <span class="tiername">${cur.name}</span> · 👁 tổng ${fmtNum(total)} lượt xem — cảm ơn cả nhà!`;
    $('goalbar').style.width = '100%';
  }
  /* SẮP ĐẠT MỐC (Nguyen yêu cầu 2026-11-04): còn cách mốc kế tiếp không xa
     (<= mcSapMocConLai lượt, mặc định 20) thì MC hô hào cả phòng chia sẻ /
     rủ thêm người vào xem để mở sảnh mới — mỗi mốc chỉ hô 1 lần trong phiên.
     Biến: {moc} = mốc sắp đạt, {con} = số lượt còn thiếu, {sanh} = tên sảnh mới. */
  if (next && MC.sapMoc && MC.sapMoc.length) {
    const conLai = next.at - total, nguong = Number(cfg.mcSapMocConLai) || 20;
    if (conLai > 0 && conLai <= nguong && !sapMocDaBao.has(next.at)) {
      sapMocDaBao.add(next.at);
      mcReact(2.4, MC.sapMoc, { moc: String(next.at), con: String(conLai), sanh: next.name });
    }
  }
}
const sapMocDaBao = new Set();
const warnedBgFiles = new Set();   // M14: file bgRules la da canh bao (chi bao 1 lan/file)

/* ============ Banner nghi thức giữa sân khấu ============ */
let bannerTimer = 0;
function showBanner(text, ms = 4600) {
  const el = $('banner');
  if (!el) return;
  el.textContent = text;
  el.classList.add('on');
  placeBanner();
  clearTimeout(bannerTimer);
  bannerTimer = setTimeout(() => { if (!cfg.hienTatCaKhung) el.classList.remove('on'); syncStageSpotlight(); }, ms);   // V3: banner tat -> hien lai ten cap (neu van dang dien)
  syncStageSpotlight();   // V3: banner vua hien -> an ten cap, tranh chong o
}
/* Can vi tri banner cho vua ca hai phia (Nguyen chot 2026-11-04): mac dinh o
   bannerY (30%) — nhung khi bong MC dang hien thi phai dat banner NGAY DUOI
   bong MC, vi bong MC cao/thap theo do dai cau noi va z-index cua MC nam
   tren banner nen de co dinh se bi che chu. Van kep tran 36% de day banner
   khong vuot xuong che dau cap doi tren san khau (dau o ~39%). */
function placeBanner() {
  const el = $('banner');
  if (!el || !el.classList.contains('on')) { syncStageSpotlight(); return; }   // V3: MC vua hien/an thi can lai ca ten cap (chung o banner)
  let center = cfg.bannerY != null ? cfg.bannerY : 30;
  const mc = $('mc');
  if (mc && mc.classList.contains('on')) {
    const stg = stageEl.getBoundingClientRect();
    const mcBottom = (mc.getBoundingClientRect().bottom - stg.top) / stg.height * 100;
    center = Math.min(Math.max(center, mcBottom + 2.3), 36);
  }
  el.style.top = center + '%';
  syncStageSpotlight();   // V3: banner doi vi tri -> can lai ten cap theo
}

/* ============ Ghép đôi ============ */
/* Gấp tên về dạng so khớp: thường + bỏ dấu + chỉ giữ chữ/số liền nhau
   ("Ngọc Linh" -> "ngoclinh"). foldCmd đã có sẵn ở dưới (khai báo hàm
   được hoist nên gọi từ đây vô tư). */
function foldName(s) { return foldCmd(s).replace(/[^a-z0-9]+/g, ''); }
/* M13: cache ten gap theo user — scanLooseTag/findNamedInText chay tren
   moi chat, truoc day gap lai ten cua CA PHONG moi lan (foldCmd chay
   normalize). Cache o day (toi da 500 muc qua mapSetCapped), lam moi khi
   register thay ten (xem register). */
function foldedCand(src) {
  const cf = foldName(src || '');
  const parts = foldCmd(src || '').split(' ').filter(Boolean);
  return { src: src || '', cf, given: parts.length ? foldName(parts[parts.length - 1]) : '' };
}
function foldedNames(u) {
  let f = nameFoldCache.get(u.id);
  if (!f || f.nick.src !== (u.nickname || '') || f.uid.src !== (u.uniqueId || '')) {
    f = { nick: foldedCand(u.nickname), uid: foldedCand(u.uniqueId) };
    mapSetCapped(nameFoldCache, u.id, f);
  }
  return f;
}
function levRatio(a, b) {
  if (!a || !b) return 0;
  if (a === b) return 1;
  const mm = a.length, nn = b.length;
  if (Math.abs(mm - nn) > 4) return 0;
  let prev = []; for (let j = 0; j <= nn; j++) prev[j] = j;
  for (let i = 1; i <= mm; i++) {
    const cur = [i];
    for (let j = 1; j <= nn; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return 1 - prev[nn] / Math.max(mm, nn);
}
function tagSimilarity(typed, cand) {
  if (!typed || !cand) return 0;
  let s = levRatio(typed, cand);
  if (typed.length >= 4 && (cand.includes(typed) || typed.includes(cand))) s = Math.max(s, 0.86);   // chứa nhau = rất giống
  return s;
}
function parseTag(text, self) {
  if (!text || !text.includes('@')) return null;
  /* TAG THÔNG MINH (Nguyen yêu cầu 2026-11-04 22:45): không phân biệt
     hoa thường, BỎ DẤU, dính liền hay cách chữ đều nhận ("@ngoclinh",
     "@NGOC LINH", "@Ngọc Linh" cùng về một người); gõ gần đúng
     ("@hehee", "@ngoc lynh") thì lấy người GIỐNG NHẤT đang có mặt
     trong phòng. Hợp đồng cũ giữ nguyên: khớp người quen -> trả user;
     không khớp ai -> trả "bóng ma" tag:... cho luồng tag người vắng. */
  const folded = foldCmd(text);
  // Lớp 1: khớp chính xác trên bản đã gấp (giữ khoảng trắng) — dài nhất thắng
  let best = null, bestLen = 0;
  for (const u of known.values()) {
    if (self && u.id === self.id) continue;
    for (const cand of [u.nickname, u.uniqueId]) {
      if (!cand) continue;
      const c = foldCmd(cand);
      if (c.length >= 2 && folded.includes('@' + c) && (c.length > bestLen || (c.length === bestLen && best && best.npc && !u.npc))) { best = u; bestLen = c.length; }
    }
  }
  if (best) return best;
  // Lớp 2: khớp dính liền — phần sau @ (gấp + bỏ khoảng trắng) bắt đầu bằng tên gấp liền
  const afterAt = folded.slice(folded.indexOf('@') + 1).replace(/[^a-z0-9]+/g, '');
  if (afterAt.length >= 3) {
    let b2 = null, l2 = 0;
    for (const u of known.values()) {
      if (self && u.id === self.id) continue;
      for (const cand of [u.nickname, u.uniqueId]) {
        if (!cand) continue;
        const cs = foldName(cand);
        if (cs.length >= 3 && afterAt.startsWith(cs) && (cs.length > l2 || (cs.length === l2 && b2 && b2.npc && !u.npc))) { b2 = u; l2 = cs.length; }
      }
    }
    if (b2) return b2;
  }
  // Trích tên người chơi gõ sau @ (tối đa 3 từ, bỏ từ đệm ở đuôi) — cho lớp 3 + bóng ma
  const m = text.match(/@([^\s@,;:!?]+(?: [^\s@,;:!?]+){0,2})/);
  let typedName = '';
  if (m) {
    const STOP = ['cưới', 'ơi', 'ơi!', 'yêu', 'nhé', 'nha', 'nè', 'đi', 'à', 'ạ', 'quá', 'lắm', 'luôn', 'không', 'ko', 'hông', 'với', 'và', 'của', 'làm', 'cho', 'em', 'anh', 'chị', 'mình', 'tớ', 'tao', 'mày'];
    const words = m[1].split(/\s+/).filter(Boolean);
    while (words.length && (STOP.includes(words[words.length - 1].toLocaleLowerCase('vi')) || words[words.length - 1].length === 1)) words.pop();
    typedName = words.join(' ').trim();
  }
  const typedF = foldName(typedName);
  // Lớp 3a: tên gấp trùng khít một người quen (kể cả chưa vào phòng) — khớp chắc chắn thắng gần đúng
  if (typedF.length >= 2) {
    for (const wantNpc of [false, true]) {   // trùng tên khít: khách thật thắng NPC (dàn NPC có tên phổ biến, khách thật trùng tên là chuyện thường)
      for (const u of known.values()) {
        if (self && u.id === self.id) continue;
        if (!!u.npc !== wantNpc) continue;
        if (foldName(u.nickname) === typedF || foldName(u.uniqueId || '') === typedF) return u;
      }
    }
  }
  // Lớp 3b: gần đúng — chỉ tìm trong số người ĐANG CÓ MẶT trong phòng, phải thắng rõ người thứ hai
  if (typedF.length >= 3) {
    let bU = null, bS = 0, s2 = 0;
    for (const u of known.values()) {
      if (self && u.id === self.id) continue;
      if (!P.get(u.id)) continue;
      let sc = 0;
      for (const cand of [u.nickname, u.uniqueId]) {
        if (!cand) continue;
        sc = Math.max(sc, tagSimilarity(typedF, foldName(cand)));
      }
      if (u.npc) sc -= 0.08;   // suýt soát thì ưu tiên khách thật hơn NPC
      if (sc > bS) { s2 = bS; bS = sc; bU = u; } else if (sc > s2) s2 = sc;
    }
    if (bU && bS >= 0.72 && (bS - s2 >= 0.06 || bS >= 0.9)) return bU;
  }
  if (!typedName || typedName.length < 2) return null;
  return { id: 'tag:' + typedName.toLocaleLowerCase('vi').replace(/\s+/g, '-'), nickname: typedName, avatar: '' };
}
/* ===== Bong chat + san loc comment =====
   Nguyen chot cach loc (2026-11-04): tu cam thi CHE bang dau * (giu nguyen do
   dai, cau van hien — vi du "vui vl chung may a" -> "vui ** chung may a");
   comment chua QUA NHIEU tu cam (config bongChatAnKhiTuCamQua) thi AN HAN;
   text qua dai thi cat bot + "...". Danh sach tu cam sua trong config
   (tuCamComment), tat ca deu co config rieng.
   Cach khop tu (tranh che nham tu vo toi): tu CO DAU chi khop nguyen van voi
   danh sach (nen "lon" trong "sanh lon" khong bi che); tu KHONG DAU (go nhanh
   khong dau) khop theo dang bo dau — danh sach tu an toan (tuAnToanComment,
   dang bo dau) duoc mien tru, vd "cac" trong "cac ban". */
const FOLD_GROUPS = { a: 'àáảãạăằắẳẵặâầấẩẫậ', e: 'èéẻẽẹêềếểễệ', i: 'ìíỉĩị', o: 'òóỏõọôồốổỗộơờớởỡợ', u: 'ùúủũụưừứửữự', y: 'ỳýỷỹỵ', d: 'đ' };
const FOLD_MAP = {};
for (const base in FOLD_GROUPS) for (const ch of FOLD_GROUPS[base]) FOLD_MAP[ch] = base;
function foldWord(s) {
  return String(s).toLowerCase().split('').map(ch => FOLD_MAP[ch] || ch).join('').replace(/(.)\1+/g, '$1');
}
let banExact = new Set(), banFold = new Set(), safeFold = new Set(['cac']);
/* Danh sách trong config PHẢI là mảng — nhưng settings.json trên máy người
   dùng có thể lưu dạng CHUỖI thô (bản admin cũ ghi text thẳng vào file) và
   cầu nối trộn nguyên xi vào config gửi cho game. Ép kiểu tại đây: mảng thì
   giữ, chuỗi thì tách theo dấu phẩy/xuống dòng. Thiếu bước này, 1 key dạng
   chuỗi làm .map() văng TypeError GIỮA applyConfig -> mọi thứ sau nó (bảng,
   hướng dẫn, nền...) chết theo mà sự kiện vẫn chạy — đúng lỗi Nguyen gặp
   2026-11-04 (màn hình đỏ #430b18, mất hết khung). */
function asList(v) {
  return Array.isArray(v) ? v : (typeof v === 'string' ? v.split(/[\n,;]+/).map(s => s.trim()).filter(Boolean) : []);
}
function buildBanSets() {
  banExact = new Set(); banFold = new Set();
  for (const w of asList(cfg.tuCamComment)) {
    const t = String(w).trim().toLowerCase();
    if (!t) continue;
    banExact.add(t); banFold.add(foldWord(t));
  }
  safeFold = new Set((cfg.tuAnToanComment == null ? ['cac'] : asList(cfg.tuAnToanComment)).map(w => foldWord(String(w).trim())));
}
function chatFilter(raw) {
  const text = String(raw || '').trim().replace(/\s+/g, ' ');
  if (!text) return null;
  let hits = 0;
  const shown = text.split(' ').map(tok => {
    const m = tok.match(/^([^\p{L}\p{N}]*)([\p{L}\p{N}]+)([^\p{L}\p{N}]*)$/u);
    if (!m) return tok;
    const core = m[2], low = core.toLowerCase();
    let bad = /[^\x00-\x7F]/.test(core) ? banExact.has(low) : (banFold.has(foldWord(core)) && !safeFold.has(foldWord(core)));
    if (!bad) return tok;
    hits++;
    return m[1] + '*'.repeat(Math.min(core.length, 12)) + m[3];
  }).join(' ');
  if (hits > (cfg.bongChatAnKhiTuCamQua != null ? cfg.bongChatAnKhiTuCamQua : 2)) return null; // nhieu tu cam qua -> an han
  const max = cfg.bongChatMaxKyTu || 60;
  return shown.length > max ? shown.slice(0, max - 1).trimEnd() + '…' : shown;
}
/* Uu tien len san khau cho NGUOI TANG QUA (Nguyen chot 2026-11-04, doi
   2026-11-05): cap cua ho duoc dua vao LAN QUA, xep theo muc qua cao
   nhat giam dan (xem bumpCouple) — khong chen ngang cap dang dien. Ho
   con doc than thi CHI cam on (hieu ung + MC o handle), KHONG tu ghep
   doi nua — muon co doi thi tag ten, go "ghep doi", follow MC hoac cho
   he tu ghep khi hang cho trong. Tat bang config uuTienQuaTang: false. */
function giftPriority(user, dia) {
  if (!user) return;
  const c = P.coupleOf(user.id);
  if (c) {
    if (P.bumpCouple(c, dia)) toast(`🎁 ${user.nickname} tặng quà — cặp của bạn được ưu tiên trong hàng chờ quà!`, true);
  }
}
function showBubble(user, text) {
  if (cfg.hienBongChat === false) return;
  const shown = chatFilter(text);
  if (shown) P.say(user.id, shown, cfg.bongChatGiay || 4);
}
function randomSingle(except) {
  const singles = [];
  for (const u of known.values()) {
    if (except && u.id === except.id) continue;
    const p = P.get(u.id);
    if (p && !p.couple) singles.push(u);
  }
  return singles.length ? singles[Math.floor(Math.random() * singles.length)] : null;
}
/* Người độc thân KHÁC GIỚI đang có mặt trong phòng (phục vụ ghép tạm khi tag
   người thương vắng mặt): ưu tiên người đoán giới tính ngược hẳn với người tag;
   không có thì lấy người chưa đoán được giới tính; tuyệt không ghép cùng giới
   khi đã đoán được giới tính của cả hai. */
function randomSingleOpp(except) {
  const g = (P.get(except.id) || {}).genderFixed || P.guessGender(except.nickname || '');
  const strict = [], loose = [];
  for (const u of known.values()) {
    if (u.id === except.id) continue;
    const p = P.get(u.id);
    if (!p || p.couple) continue;
    const gu = p.genderFixed || P.guessGender(u.nickname || '');
    if (g !== '?' && gu !== '?' && gu === g) continue;   // cùng giới rõ ràng -> bỏ qua
    (gu !== '?' && g !== '?' ? strict : loose).push(u);
  }
  const pool = strict.length ? strict : loose;
  return pool.length ? pool[Math.floor(Math.random() * pool.length)] : null;
}
/* ===== Chong spam len san khau: so giay nghi TU DONG (Nguyen chot) =====
   Cong thuc (moi tham so deu o config): giay nghi = co ban
   + (so cap dang cho x congMoiCapCho) + (so cap ghep thua trong 3 phut
   x congMoiCapGhep), roi nhan he so theo TONG LUOT XEM (vang nguoi < nguong
   -> giam, dong > nguong -> tang) va kep trong [min, max]. Phong vang thi
   nghi ngan (cap len lai nhanh cho co khong khi), phong dong thi nghi dai
   (chia san khau deu cho moi nguoi). Tat tu dong bang choTuDong: false thi
   dung co dinh choLenSanKhauCoBan giay. */
const coupleFormTimes = [];
let lastQueueLen = 0;
function computeStageCooldown() {
  const base = cfg.choLenSanKhauCoBan != null ? cfg.choLenSanKhauCoBan : 90;
  if (cfg.choTuDong === false) return base;
  const now = Date.now();
  while (coupleFormTimes.length && now - coupleFormTimes[0] > 180000) coupleFormTimes.shift();
  const extra = Math.max(0, coupleFormTimes.length - (cfg.choMienGhep != null ? cfg.choMienGhep : 2));
  let sec = base
    + lastQueueLen * (cfg.choCongMoiCapCho != null ? cfg.choCongMoiCapCho : 15)
    + extra * (cfg.choCongMoiCapGhep != null ? cfg.choCongMoiCapGhep : 8);
  const views = totalBase + counted.size;
  if (views < (cfg.choNguongVang != null ? cfg.choNguongVang : 300)) sec *= (cfg.choHeSoVang != null ? cfg.choHeSoVang : 0.6);
  else if (views > (cfg.choNguongDong != null ? cfg.choNguongDong : 1500)) sec *= (cfg.choHeSoDong != null ? cfg.choHeSoDong : 1.3);
  const min = cfg.choLenSanKhauMin != null ? cfg.choLenSanKhauMin : 20;
  const max = cfg.choLenSanKhauMax != null ? cfg.choLenSanKhauMax : 600;
  return Math.round(Math.min(max, Math.max(min, sec)));
}
/* Cooldown THEO NGUOI ngan (config choNguoiGiay, mac dinh 30): chi de
   1 nguoi khong chiem san khau lien tuc khi doi ban dien lien tuc;
   cooldown THEO CAP (cong thuc dong tren) moi la chang chinh. */
function personCdSec() { const v = Number(cfg.choNguoiGiay); return isFinite(v) && v >= 0 ? v : 30; }
setInterval(() => { P.setStageCooldowns(computeStageCooldown(), personCdSec()); }, 5000);
/* ===== Hieu ung NGAU NHIEN giu sanh luon song (Nguyen chot 2026-11-04) =====
   Nguoi xem nhieu khi chi chat / tha tim chu khong tang qua — neu chi cho
   qua moi co hieu ung thi sanh trong chet. Cu moi mot khoang ngau nhien
   [hieuUngNgauNhienTuGiay, hieuUngNgauNhienDenGiay] giay game tu ban 1 hieu
   ung bat ky (hoa roi, kim tuyen, phao hoa, tim bay...) — moc sanh cang cao
   lua chon cang phong phu. Tat bang hieuUngNgauNhien: false. */
let nextRandomFxAt = 0;
function fireRandomFx() {
  /* Kênh "gia vị" ngẫu nhiên: CHỈ còn kim tuyến / tim bay / bokeh /
     đèn lồng. Hoa rơi + pháo hoa + pháo giấy đã tách ra kênh ĐỊNH KỲ
     riêng bên dưới (mỗi loại một nhịp giây do Nguyen đặt) để không
     giành nhịp của nhau. */
  const tier = BG.tier;
  const pool = ['glitter', 'hearts'];
  if (tier >= 2) pool.push('bokeh', 'glitter');
  if (tier >= 3) pool.push('lanterns');
  const pick = pool[Math.floor(Math.random() * pool.length)];
  const R = (a, b) => a + Math.random() * (b - a);
  if (pick === 'petals') FX.petals(Math.round(R(45, 95)));
  else if (pick === 'glitter') FX.glitter(Math.round(R(45, 85)));
  else if (pick === 'confetti') FX.confetti(Math.round(R(30, 60)));
  else if (pick === 'fireworks') FX.fireworksShow(Math.round(R(1, 3.4)), 320);
  else if (pick === 'bokeh') FX.bokeh(Math.round(R(5, 9)));
  else if (pick === 'lanterns') FX.lanterns(Math.round(R(3, 5)));
  else if (pick === 'hearts') {
    const feat = P.featured();
    if (feat) { const sp = Cam.toScreen(feat.a.x, feat.a.y); FX.ringHearts(sp.fx, sp.fy - 0.05); }
    else FX.hearts(Math.round(R(8, 14)));
  }
  const feat2 = P.featured();
  if (feat2 && Math.random() < 0.35 && FX.stageSparkle) {
    const sp2 = Cam.toScreen(feat2.a.x, feat2.a.y);
    FX.stageSparkle(sp2.fx, sp2.fy - 0.05);
  }
}
/* ===== Hiệu ứng ĐỊNH KỲ theo từng loại (Nguyen yêu cầu 2026-11-05,
   tham khảo nhịp hiệu ứng bên game chùa: "mỗi X giây làm một hành
   động") — mỗi loại một đồng hồ riêng, tới giờ là bắn, số lượng giữ
   như mức ngẫu nhiên cũ cho khỏi khác hình. Đặt 0 = tắt riêng loại
   đó; tắt hieuUngNgauNhien là tắt tất cả. ===== */
const fxDue = { petals: 0, fireworks: 0, confetti: 0 };
function fireTimedFx(kind) {
  const R = (a, b) => a + Math.random() * (b - a);
  if (kind === 'petals') FX.petals(Math.round(R(45, 95)));
  else if (kind === 'fireworks') FX.fireworksShow(Math.round(R(1, 3.4)), 320);
  else if (kind === 'confetti') FX.confetti(Math.round(R(30, 60)));
}
setInterval(() => {
  if (cfg.hieuUngNgauNhien === false) return;
  const now = performance.now();
  const timed = [
    ['petals', cfg.fxHoaRoiMoiGiay != null ? cfg.fxHoaRoiMoiGiay : 10],
    ['fireworks', cfg.fxPhaoHoaMoiGiay != null ? cfg.fxPhaoHoaMoiGiay : 20],
    ['confetti', cfg.fxPhaoGiayMoiGiay != null ? cfg.fxPhaoGiayMoiGiay : 20],
  ];
  for (const [kind, sec] of timed) {
    if (!(sec > 0)) { fxDue[kind] = 0; continue; }
    if (!fxDue[kind]) { fxDue[kind] = now + sec * 1000; continue; }
    if (now >= fxDue[kind]) { fxDue[kind] = now + sec * 1000; fireTimedFx(kind); }
  }
  const lo = (cfg.hieuUngNgauNhienTuGiay != null ? cfg.hieuUngNgauNhienTuGiay : 12) * 1000;
  const hi = Math.max(lo, (cfg.hieuUngNgauNhienDenGiay != null ? cfg.hieuUngNgauNhienDenGiay : 25) * 1000);
  if (!nextRandomFxAt) { nextRandomFxAt = now + lo + Math.random() * (hi - lo); return; }
  if (now < nextRandomFxAt) return;
  nextRandomFxAt = now + lo + Math.random() * (hi - lo);
  fireRandomFx();
}, 1000);
P.onStageSkipped = function (c) {
  toast(`⏳ ${c.a.user.nickname} ❤ ${c.b.user.nickname} vừa làm lễ xong — ${P.stageCooldownRemain(c)}s nữa mới lên lại được`, false);
};
/* N1: cap MOI ghep nhung dinh cooldown nghi sau lan len truoc — bao dung
   su that (cap CHUA lam le, chi dang cho het gio nghi) va se TU len lai
   khi het gio (timer o makeCouple). Khong dung onStageSkipped o day vi
   cau do chi dung cho cap DA lam le xong (nhanh wasPair). */
P.onCooldownWait = function (c, remain) {
  toast(`⏳ ${c.a.user.nickname} ❤ ${c.b.user.nickname} đang chờ hết giờ nghỉ — ${remain}s nữa sẽ tự lên sân khấu`, false);
};
/* ===== MC chế giễu khi tag trúng người ĐÃ CÓ ĐÔI (Nguyen chot) =====
   Trước đây tag hụt kiểu này chỉ có 1 câu cứng không tên tuổi. Nay dùng
   pool mcTagDaCoDoi trong config (nhiều biến thể hài, chèn tên {a} người
   tag, {b} người bị tag, {c} bạn đời hiện tại của phía đã có đôi) +
   cooldown theo người tag (mcCheGheuChoGiay) và tối thiểu 6s toàn cục. */
const cheGheuCd = new Map();
let lastCheGheuAt = -1e9;
function cheGheuTag(ua, ub) {
  const pool = MC.tagDaCoDoi || [];
  if (!pool.length) return;
  const now = performance.now();
  const cdMs = (cfg.mcCheGheuChoGiay != null ? cfg.mcCheGheuChoGiay : 20) * 1000;
  if (now - (cheGheuCd.get(ua.id) || -1e9) < cdMs) return;
  if (now - lastCheGheuAt < 6000) return;
  let partner = null;
  const cplB = P.coupleOf(ub.id);
  if (cplB && cplB.a.user.id !== ua.id && cplB.b.user.id !== ua.id) {
    partner = cplB.a.user.id === ub.id ? cplB.b.user : cplB.a.user;   // B đã có đôi với người khác
  } else {
    const cplA = P.coupleOf(ua.id);
    if (cplA && cplA.a.user.id !== ub.id && cplA.b.user.id !== ub.id) {
      partner = cplA.a.user.id === ua.id ? cplA.b.user : cplA.a.user; // ngược lại: A đã có đôi với người khác
    }
  }
  if (!partner) return;
  mapSetCapped(cheGheuCd, ua.id, now);
  lastCheGheuAt = now;
  mcReact(2.2, pool, { a: ua.nickname, b: ub.nickname, c: partner.nickname });
}
/* Phan hoi khi ghep doi bi chan (truoc day nhieu nhanh chan IM LANG —
   khach thay nhu game hong). Toast nay co tiet che theo nguoi (6s/lan)
   de khong thanh spam khi co nguoi go lien tuc. */
/* N9: map theo nguoi chi giu toi da 500 muc — vuot thi xoa muc cu nhat
   (Map giu thu tu chen, key dau tien la cu nhat). */
function mapSetCapped(m, k, v) { m.set(k, v); if (m.size > 500) m.delete(m.keys().next().value); }
const blockToastAt = new Map();
function blockedToast(ua, ub) {
  const now = performance.now();
  if (now - (blockToastAt.get(ua.id) || -1e9) < 6000) return;
  mapSetCapped(blockToastAt, ua.id, now);
  const cb = P.coupleOf(ub.id), ca = P.coupleOf(ua.id);
  if (cb && cb !== ca) toast(`⏳ ${ub.nickname} đang ở trong một cặp khác — chờ cặp đó xong thì tag lại nhé`, false);
  else if (ca) toast(`⏳ ${ua.nickname} đang ở trong một cặp khác rồi — chờ cặp hiện tại xong nhé`, false);
}
/* via/origin: 'manual' (khach tu tag / go lenh ghep doi), 'npc' /
   'autopair' (he thong tu sinh), 'follow' / 'gift' (su kien cua khach).
   KHONG con cooldown tag 20s: ban cu khoa ca lan tag THAT BAI (doi tac
   dang ban) lan lan tag do he thong tu sinh nhan danh khach — goc cua
   loi "tag mai khong an". Chong spam da co san: moi nguoi chi o trong
   1 cap tai 1 thoi diem + cooldown san khau rieng. */
function requestCouple(a, b, via) {
  const origin = typeof via === 'string' ? via : (via === false ? 'follow' : 'manual');
  /* H8: 'tag:...' la bong ma (nguoi duoc tag chua he vao phong), khong phai
     nguoi that — khong de lot vao P.makeCouple vi P.spawn se tao nhan vat
     that cho no (co ghe, di dao, bi ghep tiep). Ghost chi duoc giu lam co
     tagVangTen o tryPairWith, khong bao gio thanh mot nua cap. */
  if (a && String(a.id).startsWith('tag:')) return null;
  if (b && String(b.id).startsWith('tag:')) return null;
  const ua = register(a), ub = register(b);
  if (!ua || !ub || ua.id === ub.id) return null;
  const before = P.coupleOf(ua.id);
  const wasPair = !!(before && ((before.a.user.id === ua.id && before.b.user.id === ub.id) || (before.a.user.id === ub.id && before.b.user.id === ua.id)));
  const c = P.makeCouple(ua, ub, origin);
  if (!c) {
    /* M4: phan biet "dang lam le" voi "da co doi khac". Doi phuong dang o
       focus/queue/toStage/stage chua hold (quy trinh lam le 3.6s + hang
       cho) thi KHONG che gheu — chi toast cho khach cho, tra null. Chi
       che gheu khi doi phuong da yen vi o cap khac (court/stage+hold)
       ma van khong ghep duoc. */
    const inCeremony = cp => !!cp && (cp.state === 'focus' || cp.state === 'queue' || cp.state === 'toStage' || (cp.state === 'stage' && !cp.hold));
    const cb = P.coupleOf(ub.id), ca = P.coupleOf(ua.id);
    if (inCeremony(cb) || inCeremony(ca)) {
      const busyName = inCeremony(cb) ? ub.nickname : ua.nickname;
      toast(`⏳ ${busyName} đang làm lễ — chờ chút nhé`, false);
      return null;
    }
    cheGheuTag(ua, ub);   // một trong hai đã có đôi khác -> MC chế giễu có tên tuổi theo pool config
    blockedToast(ua, ub);   // kem toast ly do ro rang (tiet che 6s/nguoi) — khong con chan im lang
    return null;
  }
  coupleByKey.set(c.key, c);
  /* H3: cap dan dau BXH cu (luu truoc reload) vua duoc ghep lai -> tra
     vuong mien cho cap do ngay, khong doi toi lan ghi diem tiep theo. */
  if (savedLeaderKey && c.key === savedLeaderKey && P.setCrown) P.setCrown(c);
  if (wasPair) {
    /* Cap da ton tai: dang trong quy trinh len san khau (gioi thieu / hang
       cho / dang dien) thi bo qua — comment them KHONG them trung vao danh
       sach cho. Da lam le xong va o nha thi xet dem nguoc de len LAN NUA. */
    if (c.state === 'court') {
      /* Khong doi ca hai phai ve toi nha: walkPath thay duong di + callback
         cu nen ke ca dang di ve cung re len san khau sach se duoc. */
      const remain = P.stageCooldownRemain(c);
      if (remain > 0) {
        toast(`⏳ ${ua.nickname} ❤ ${ub.nickname} vừa làm lễ xong — ${remain}s nữa mới lên lại được`, false);
        return c;
      }
      if (P.requeueCouple(c)) {
        coupleFormTimes.push(Date.now());
        /* NGOẠI LỆ cho cặp ĐÃ làm lễ được tag lại (Nguyen chot 2026-11-04):
           thay sang BỘ ĐỒ CƯỚI KHÁC + lia cam tới như cặp mới cho đẹp.
           (Cặp ghép lần đầu vẫn: không lia cam, chờ tới lượt mới thay đồ.) */
        P.cycleOutfit(c.a.user.id);
        c.a.el.classList.add('pairfx'); c.b.el.classList.add('pairfx');
        /* N8: chi lia cam khi cap VAN CON O HANG CHO sau requeue — neu
           san khau trong, promoteStage (trong requeueCouple) da dua cap
           di toStage ngay va onPairWalk da lia cam theo; goi them
           onPairFocus se lia chong 2 lan trong cung 1 tick. */
        if (c.state === 'queue' && P.onPairFocus) P.onPairFocus(c);
        toast(`${ua.nickname} ❤ ${ub.nickname} — lên sân khấu lần nữa!`, false);
      }
    }
    return c;
  }
  coupleFormTimes.push(Date.now());
  toast(`${ua.nickname} ❤ ${ub.nickname} — đang lên sân khấu!`, false);
  return c;
}
/* V3 (nv3): dong bo trang thai "cap dang dien" — 1 cho duy nhat bat/tat
   spotlight manh + vignette + ten cap to (class couple-on tren #stage).
   Bat: onCoupleStage (cap vua toi san khau). Tat: onPairReturn (cap vua
   xuong) + vong 3s (tan cap / truong hop le). Ten lay tu P.featured()
   (cap o o giua duy nhat) — dung textContent vi nickname la input nguoi
   dung, khong innerHTML. Ten cap dung chung o voi banner (tren dau cap,
   duoi bong MC) va CHI hien khi banner tat — banner hien thi ten an
   (class banner-on), banner tat thi ten hien den het buoi le. */
function syncStageSpotlight() {
  const c = P.featured && P.featured();
  const on = !!(c && c.state === 'stage');
  stageEl.classList.toggle('couple-on', on);
  const bannerEl = $('banner');
  stageEl.classList.toggle('banner-on', !!(bannerEl && bannerEl.classList.contains('on')));
  const nameEl = $('coupleName');
  if (nameEl) {
    nameEl.textContent = on ? `💍 ${c.a.user.nickname} ❤ ${c.b.user.nickname}` : '';
    if (on) {
      /* Can ten cap vao dung o banner — cung cong thuc nhu placeBanner
         nhung kep tran 34% (pill ten cao hon banner nen can tran thap
         hon de khong cham dau cap o ~39%). */
      let center = cfg.bannerY != null ? cfg.bannerY : 30;
      const mc = $('mc');
      if (mc && mc.classList.contains('on')) {
        const stg = stageEl.getBoundingClientRect();
        const mcBottom = (mc.getBoundingClientRect().bottom - stg.top) / stg.height * 100;
        center = Math.min(Math.max(center, mcBottom + 2.3), 34);
      }
      nameEl.style.top = center + '%';
    }
  }
  return on;
}
P.onCoupleStage = function (c) {
  const npc = !!(c.a.npc || c.b.npc);   // cặp NPC diễn cho phòng vui: KHÔNG đếm lễ, KHÔNG ghi điểm
  if (!npc) {
    couplesDone++;
    lsSet(LS_COUPLLES, String(couplesDone));
    renderCoupleCount();
    coupleScore(c, 30);
  }
  /* H3: cap dang dien KHONG cuop vuong mien — vuong mien chi theo cap dan
     dau BXH (xem renderBoard); dong P.setCrown(c) cu o day da bo. */
  Cam.unfollow();
  Cam.busyUntil = Date.now() + 9000;
  Cam.stage();
  showBanner(npc ? `💍 LỄ THÀNH HÔN · ${c.a.user.nickname} ❤ ${c.b.user.nickname}` : `💍 LỄ THÀNH HÔN #${couplesDone} · ${c.a.user.nickname} ❤ ${c.b.user.nickname}`);
  const sp = Cam.toScreen(c.a.x, c.a.y);
  if (FX.cannon) FX.cannon();
  if (FX.butterflies) FX.butterflies(2);   // bướm phát sáng bay ra mừng lễ thành hôn
  FX.petals(60);
  if (A.cheer) A.cheer();   // L8: hợp âm chúc mừng khi cặp đôi lên sân khấu (khác tiếng chuông bell)
  if (FX.petalBurst) FX.petalBurst(sp.fx, sp.fy);
  if (FX.ringHearts) FX.ringHearts(sp.fx, sp.fy - 0.09);
  if (FX.stageSparkle) FX.stageSparkle(sp.fx, sp.fy - 0.06);
  const spot = $('spot'); if (spot) spot.classList.add('on');
  /* V3: cap vua toi san khau — bat ngay spotlight manh (ten cap hien
     sau khi banner "LE THANH HON" tat, chung o banner — xem
     syncStageSpotlight), them 1 dot lap lanh phu sau 0.9s neu cap van
     dang dien (guard featured === c de timeout cu khong sang nham cap sau). */
  syncStageSpotlight();
  if (FX.glitter) FX.glitter(60);
  setTimeout(() => {
    const f = P.featured && P.featured();
    if (f === c && FX.stageSparkle) {
      const mid2 = Cam.toScreen((c.a.x + c.b.x) / 2, (c.a.y + c.b.y) / 2);
      FX.stageSparkle(mid2.fx, mid2.fy - 0.06);
    }
  }, 900);
};
P.onQueueChange = function (names) {
  lastQueueLen = names.length;
  const el = $('queue');
  if (!names.length) { el.innerHTML = ''; return; }
  /* Chi hien toi da hangChoToiDa cap (mac dinh 4) cho gon khung hinh —
     phan con lai gom thanh 1 dong tong (Nguyen chot 2026-11-04). */
  const cap = Math.max(1, cfg.hangChoToiDa || 4);
  const rows = names.slice(0, cap).map(n => `<div class="qrow">💞 ${escapeHtml(n)}</div>`).join('');
  const more = names.length > cap ? `<div class="qrow" style="opacity:.75">➕ ${names.length - cap} cặp đang chờ nữa</div>` : '';
  el.innerHTML = `<b>💌 Cặp chờ lên sân khấu:</b>` + rows + more;
};

/* ============ Toast ============ */
function toast(text, vip) {
  const box = $('toasts');
  const t = document.createElement('div');
  t.className = 'toast' + (vip ? ' vip' : '');
  t.textContent = text;
  box.prepend(t);
  while (box.children.length > 2) box.lastChild.remove();
  setTimeout(() => t.classList.add('out'), 6000);
  setTimeout(() => t.remove(), 6600);
}

/* ============ Hiệu ứng theo quà (C1) ============
   Đơn vị hiệu ứng — 1 "hiệu ứng" là lượng hạt/quả CỨNG trong 1 lần bắn:
   hoa rơi = cfg.donViHoaRoi cánh (mặc định 100), pháo hoa =
   cfg.donViPhaoHoa quả (5), pháo giấy = cfg.donViPhaoGiay mảnh (100).
   Số hiệu ứng chỉ theo MỐC XU (config được, mặc định): >= quaTangMocLon
   (299) -> quaTangHieuUngLon (10), >= quaTangMocVua (99) ->
   quaTangHieuUngVua (5), còn lại -> quaTangHieuUngNho (1). Mốc lấy
   theo mệnh giá quà thật của TikTok (99 / 299 — không có quà 100 hay
   300 xu) để quà 99 xu được đúng 5 hiệu ứng, quà 299 xu được đúng 10.
   Cả 3 loại LUÔN bắn cùng lúc, kể cả quà nhỏ — quà nào cũng là tiền. */
function giftNum(k, fallback) { const v = Number(cfg[k]); return Number.isFinite(v) ? v : fallback; }
function giftFxCount(dia) {
  if (dia >= giftNum('quaTangMocLon', 299)) return giftNum('quaTangHieuUngLon', 10);
  if (dia >= giftNum('quaTangMocVua', 99)) return giftNum('quaTangHieuUngVua', 5);
  return giftNum('quaTangHieuUngNho', 1);
}
function giftFx(diamonds) {
  const n = giftFxCount(diamonds);
  FX.petals(n * giftNum('donViHoaRoi', 100));
  FX.fireworks(n * giftNum('donViPhaoHoa', 5));
  FX.confetti(n * giftNum('donViPhaoGiay', 100));
  if (diamonds >= 10 && FX.glitter) FX.glitter(Math.min(120, 20 + diamonds));
  if (diamonds >= 30 && FX.envelopes) FX.envelopes(diamonds >= 99 ? 90 : 40);
  if (diamonds >= 99) {
    if (FX.cannon) FX.cannon();
    if (FX.bokeh) FX.bokeh(10);
    const fl = $('flash'); fl.classList.remove('on'); void fl.offsetWidth; fl.classList.add('on');
  }
}
/* Ưu tiên VOICE cho người tặng quà (Nguyen yêu cầu 2026-11-04): hàng chờ
   MC vốn đã sắp xếp theo prio giảm dần và chen lên trước được — nên chỉ
   cần cho câu cảm ơn quà một prio TĂNG THEO GIÁ TRỊ QUÀ: quà càng lớn
   càng nói trước; quà nhỏ nhất (3.0) vẫn trên follow (2.9); mốc sảnh
   nâng cấp giữ 4.0, chỉ quà ≥299 mới vượt qua. */
function giftVoicePrio(dia) {
  if (dia >= 1000) return 4.8;
  if (dia >= 299) return 4.4;
  if (dia >= 99) return 4.0;
  if (dia >= 30) return 3.6;
  if (dia >= 10) return 3.3;
  return 3.0;
}
/* ============ Nhận sự kiện ============ */
/* ===== Lệnh chat tương tác: tự khai giới tính + đổi trang phục (Nguyen chot) =====
   Tên người dùng rất khó đoán nam/nữ (nickname lạ, không dấu, tên nước ngoài)
   — thay vì đoán mò, cho họ TỰ KHAI: gõ "nam" / "nữ" (hoặc "tôi là nam",
   "là nữ", "con trai", "con gái") là nhân vật đổi sang đúng giới tính, đang
   có đôi thì đảo vai cô dâu/chú rể cho đúng. Gõ "đổi đồ" là thay trang phục
   (có đôi thì cả cặp đổi bộ phối sẵn). Vừa sửa được nhận dạng sai, vừa thêm
   lý do để khách comment tương tác và có cảm giác trải nghiệm. */
const outfitCd = new Map();
function foldCmd(s) {
  return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/\s+/g, ' ').trim();
}
/* Tra ve TRUE khi comment DA LA mot lenh he thong (khai gioi tinh /
   doi do) — pipeline onChat dung o do, khong chay tiep sang ghep doi /
   hieu ung. Sua goc loi "doi do" bi lenh ghep doi cuop (tu khoa 'doi')
   va loi go "nam" bi quet ten nguoi ten Nam cuop thanh ghep doi. */
function handleChatCommands(user, text) {
  const p = P.get(user.id);
  if (!p) return false;
  const f = foldCmd(text);
  if (cfg.lenhDoiGioiTinh !== false) {
    let g = null;
    if (/\b(la nu|la gai|con gai)\b/.test(f) || /^(nu|gai)[ !.~]*$/.test(f)) g = 'F';
    else if (/\b(la nam|la trai|con trai)\b/.test(f) || /^(nam|trai)[ !.~]*$/.test(f)) g = 'M';
    if (g) {
      const r = P.declareGender(user.id, g);
      const sp = Cam.toScreen(p.x, p.y);
      FX.hearts(6, sp.fx, sp.fy - 0.03);
      toast(g === 'F'
        ? `✅ ${user.nickname} là nữ — đã đổi sang nhân vật nữ${r && r.roleSwapped ? ' + đảo vai cô dâu cho đúng' : ''}!`
        : `✅ ${user.nickname} là nam — đã đổi sang nhân vật nam${r && r.roleSwapped ? ' + đảo vai chú rể cho đúng' : ''}!`, false);
      return true;
    }
  }
  if (cfg.lenhDoiTrangPhuc !== false && /\b(doi do|doi trang phuc|thay do|thay trang phuc)\b/.test(f)) {
    const now = performance.now();
    const cdMs = (cfg.doiTrangPhucChoGiay != null ? cfg.doiTrangPhucChoGiay : 5) * 1000;
    if (now - (outfitCd.get(user.id) || -1e9) >= cdMs) {
      mapSetCapped(outfitCd, user.id, now);
      const r = P.cycleOutfit(user.id);
      const sp = Cam.toScreen(p.x, p.y);
      FX.hearts(6, sp.fx, sp.fy - 0.03);
      if (r && r.couple) toast(`👗 ${p.couple.a.user.nickname} ❤ ${p.couple.b.user.nickname} đổi bộ đồ cưới "${r.setName}"!`, false);
      else toast(`👗 ${user.nickname} vừa đổi trang phục mới!`, false);
    }
    return true;   // dung la lenh doi do (ke ca dang trong cooldown doi do) — khong chay tiep
  }
  return false;
}
/* Tim ten nguoi choi trong cau chat — ban NOI LONG cua scanLooseTag,
   dung rieng cho pairCommand ("ghep doi" + ten): scanLooseTag chay
   truoc pairCommand nhung bo qua ten goi < 3 ky tu (vd "An", "My",
   "Tu") va chi quet nguoi dang co mat — nen "ghep doi voi An" khong
   ghep dung nguoi. Ban nay chap ten goi >= 2 ky tu va ten day du >= 2
   ky tu; chi khop chac (ten day du hoac ten goi dung nguyen, hoac gan
   dung rat cao) va thang ro nguoi thu hai — trung ten thi tra null de
   pairCommand ghep ngau nhien, khong doan mo. */
function findNamedInText(text, self) {
  const tokens = foldCmd(text).split(' ').filter(Boolean);
  if (!tokens.length) return null;
  const wins = [];
  for (let n = 1; n <= 3; n++) for (let i = 0; i + n <= tokens.length; i++) wins.push(tokens.slice(i, i + n).join(''));
  let best = null, bS = 0, s2 = 0;
  for (const u of known.values()) {
    if (self && u.id === self.id) continue;
    if (!P.get(u.id)) continue;
    let sc = 0;
    const fn = foldedNames(u);   // M13: ten gap lay tu cache theo user
    for (const fc of [fn.nick, fn.uid]) {
      const cf = fc.cf;
      if (cf.length < 2) continue;
      const given = fc.given;
      for (const w of wins) {
        if (w === cf) { sc = 1; break; }
        if (given.length >= 2 && w === given) sc = Math.max(sc, 0.95);
        /* Gan dung chi cho ten dai (cf >= 4): ten ngan (vd "An") ma
           cho chay fuzzy thi cua so "tuankiet" chua "an" cung cho 0.86,
           pha vo luat thang ro nguoi thu hai o duoi. */
        else if (cf.length >= 4 && w.length >= 4) sc = Math.max(sc, tagSimilarity(w, cf));
      }
      if (sc === 1) break;
    }
    if (u.npc) sc -= 0.08;
    if (sc > bS) { s2 = bS; bS = sc; best = u; } else if (sc > s2) s2 = sc;
  }
  if (best && (bS === 1 || (bS >= 0.95 && bS - s2 >= 0.04) || (bS >= 0.9 && bS - s2 >= 0.08))) return best;
  return null;
}
/* LENH "GHEP DOI" (Nguyen yeu cau 2026-11-05 12:20): nguoi doc than go
   tu khoa trong o config tuKhoaGhepDoi (mac dinh "ghep doi, cuoi, yeu,
   ket hon" - sua duoc trong admin, cach nhau dau phay) la tu ghep voi 1 nguoi doc
   than ngau nhien (uu tien khac gioi), giong co che follow. Khop khong
   dau qua stemHit nhu lenh hieu ung. Chi chay khi comment khong tag
   duoc ai - tag cu the van uu tien truoc. Tat bang lenhGhepDoi.
   Ghep + ten nguoi choi khac (vd "ghep doi voi Linh"): ghep dung nguoi
   do neu ho chua co doi dang xep hang / dang dien (xem findNamedInText
   ben duoi); neu ho dang co doi trong hang cho thi ghep ngau nhien nhu
   cu. BO luat cu "tu khoa don chi kich hoat khi cau <= 3 token" theo
   yeu cau user 2026-11-05 — ten nguoi co khi dai (vd "Nguyen Thi Thu
   Hang") lam cau dai ra, luat cu chan oan. Moi nguoi 20s moi goi lenh
   1 lan. */
const pairCmdAt = new Map();   // N6 + N9: cooldown rieng cho lenh ghep doi, 20s/nguoi
const followPairAt = new Map();   // M3: cooldown rieng cho follow ghep doi, 20s/nguoi (nhu pairCmdAt)
function pairCommand(user, text, origin) {
  if (cfg.lenhGhepDoi === false) return false;
  const kws = stemList(cfg.tuKhoaGhepDoi);
  if (!kws.length) return false;
  const tokens = foldCmd(text).split(' ').filter(Boolean);
  if (!tokens.length) return false;
  const hit = kws.find(kw => stemHit(tokens, kw, true));
  if (!hit) return false;
  /* N6: 1 cau dua khong duoc ghep lai lien tuc — moi nguoi 20s moi goi
     lenh ghep doi 1 lan (tinh ca lan het nguoi doc than). */
  const now = Date.now();
  if (now - (pairCmdAt.get(user.id) || 0) < 20000) return false;
  mapSetCapped(pairCmdAt, user.id, now);
  /* Ghep + ten: cau chat co ten 1 nguoi choi khac thi ghep DUNG nguoi
     do (uu tien hon ghep ngau nhien) — mien la ho chua co doi dang xep
     hang / dang dien. Ho dang co doi trong hang cho thi roi xuong ghep
     ngau nhien ben duoi, khong cuop doi cua nguoi khac. */
  const named = findNamedInText(text, user);
  if (named) {
    const ec = P.coupleOf(named.id);
    const busy = ec && (ec.state === 'focus' || ec.state === 'queue' || ec.state === 'toStage' || ec.state === 'stage');
    if (!busy) { requestCouple(user, named, origin || 'random'); return true; }
  }
  const partner = randomSingleOpp(user) || randomSingle(user);
  if (!partner) {
    FX.hearts(10, 0.5, 0.55);
    toast(`💘 ${user.nickname} muốn ghép đôi — chưa có ai độc thân khác trong sảnh`, false);
    return true;
  }
  requestCouple(user, partner, origin || 'random');
  return true;
}
/* Ghep voi nguoi duoc tag — kem nhanh "ghep tam" khi nguoi duoc tag
   CHUA HE co mat trong game (parseTag tra ve "bong ma" tag:...): thay
   vi ghep voi bong ma, ghep TAM voi 1 nguoi doc than khac gioi dang co
   mat + MC doc cau ru nguoi thuong vao live. Het nguoi phu hop thi moi
   quay ve ghep bong ma nhu cu. */
function tryPairWith(user, partner, origin) {
  if (String(partner.id).startsWith('tag:')) {
    if (cfg.ghepDoiNgauNhien !== false) {
      const alt = randomSingleOpp(user);
      if (alt) {
        const c = requestCouple(user, alt, origin);
        if (c) { c.tagVangTen = partner.nickname; return c; }
      }
    }
    /* H8: het nguoi doc than de ghep tam — KHONG ghep voi bong ma nua
       (truoc day requestCouple(user, ghost) tao nhan vat that cho
       'tag:...' qua P.spawn). Bao khach ru nguoi thuong vao live. */
    toast(`💌 ${partner.nickname} chưa vào phòng — chưa có ai độc thân để ghép tạm, rủ họ vào live nhé`, false);
    return null;
  }
  return requestCouple(user, partner, origin);
}
const tagFailAt = new Map();
function tagFailToast(user) {
  const now = performance.now();
  if (now - (tagFailAt.get(user.id) || -1e9) < 6000) return;
  mapSetCapped(tagFailAt, user.id, now);
  toast(`🔍 ${user.nickname} ơi, chưa thấy tên người thương sau @ — gõ đúng tên của họ nhé`, false);
}
/* ===== PIPELINE BOC TACH COMMENT (Nguyen chot 2026-11-05) =====
   Moi comment chi chay DUNG MOT nhanh, theo thu tu uu tien co dinh —
   trung nhanh nao la DUNG o do, khong chay tiep sang nhanh khac (goc
   cua moi loi chong cheo truoc day: 1 cau vua doi do vua ghep doi,
   vua goi ten vua no hieu ung...):
   1) Bat dau bang @      -> GHEP DOI voi nguoi duoc tag (ke ca ten
      go gan dung / nguoi vang mat thi ghep tam), dung. (Nguyen chi
      rieng: cau @ thi check ghep doi truoc tien.)
   2) Lenh he thong       -> khai gioi tinh ("nam"/"nu") / "doi do", dung.
   3) Lenh hieu ung       -> hoa roi / phao hoa / phao giay, dung.
      (Phai truoc buoc goi ten: tu khoa hieu ung la TU DON rat loang —
      vd "hoa roi" trung ca TEN GOI "Hoa" cua 1 khach trong sanh;
      neu quet ten truoc, cau goi hieu ung bi cuop thanh ghep doi.
      Nguyen da noi ro: cau thuoc case hieu ung thi tha hieu ung va
      khong check them.)
   4) Goi ten khong @     -> ghep doi voi dung nguoi do (scanLooseTag), dung.
   5) Lenh ghep doi       -> tu khoa config (ghep doi/cuoi/...) ghep
      ngau nhien 1 nguoi doc than, dung.
   6) Chat thuong         -> chi hien bong bong.
   opts.origin: nguon sinh comment ('manual' mac dinh; 'npc' /
   'autopair' khi he thong tu sinh comment gia lap) — truyen xuong
   requestCouple/makeCouple de cap ghi nguon va de tag tay duoc gianh
   cap tu dong dang xep hang. */
function onChat(m, opts) {
  if (!m.user) return;
  ensureGuest(m.user);
  markInteract(m.user);   // comment tinh la tuong tac (xem markInteract)
  const text = String(m.text || '');
  const origin = (opts && opts.origin) || 'manual';
  /* Nguon o muc LAN (people.js xep hang cho theo nguon): comment cua
     khach that tag ten -> 'tag' (lan 2); lenh ghep doi go tu khoa ->
     'random' (lan 3); comment do he thong tu sinh giu nguyen nguon cua
     no ('npc' lan 4 / 'autopair' lan 3-4) de xu ly rieng o lan thap. */
  const tagOrigin = origin === 'manual' ? 'tag' : origin;
  const pairOrigin = origin === 'manual' ? 'random' : origin;
  showBubble(m.user, text);
  if (text.trim().startsWith('@')) {
    const partner = parseTag(text, m.user);
    /* Tag CHINH MINH: parseTag loai nguoi tag khoi danh sach khop nen
       ten cua chinh minh tro thanh "nguoi vang mat" (bong ma) — khong
       ghep tam voi nguoi la, bao lai cho khach biet. */
    const selfTag = partner && String(partner.id).startsWith('tag:') && foldName(partner.nickname) === foldName(m.user.nickname || '');
    if (selfTag) { tagFailToast(m.user); return; }
    if (partner) { tryPairWith(m.user, partner, tagOrigin); return; }
    tagFailToast(m.user);
    /* N7: @ khong khop ai thi KHONG return ngay — roi xuong cac buoc
       duoi (lenh he thong / hieu ung / goi ten / lenh ghep doi) de cau
       vd "@ai do phao hoa" van no phao hoa thay vi chi hien toast. */
  }
  if (handleChatCommands(m.user, text)) return;
  if (chatFx(m.user, text)) return;
  const loose = scanLooseTag(text, m.user);
  if (loose) { requestCouple(m.user, loose, tagOrigin); return; }
  if (pairCommand(m.user, text, pairOrigin)) return;
}

/* TAG KHÔNG CẦN @ (Nguyen yêu cầu 2026-11-04 22:51): quét cả câu comment
   tìm tên người chơi đang có mặt — gõ mỗi tên trong câu chat cũng ghép
   được. Ngưỡng phải CHẶT hơn tag có @ (câu chat thường không được ghép
   nhầm): ăn khi (1) nguyên tên đã gấp xuất hiện trong câu (dính liền,
   bỏ dấu), hoặc (2) gõ đúng TÊN GỌI (từ cuối của tên, >= 3 ký tự), hoặc
   (3) gần đúng rất cao (>= 0.9) và thắng rõ người thứ hai. Tên gấp
   ngắn hơn 4 ký tự thì bỏ qua (dễ nhầm từ thường — vẫn tag bằng @
   được). Khách thật được ưu tiên hơn NPC khi suýt soát. */
function scanLooseTag(text, self) {
  const tokens = foldCmd(text).split(' ').filter(Boolean);
  if (!tokens.length) return null;
  const wins = [];
  for (let n = 1; n <= 3; n++) for (let i = 0; i + n <= tokens.length; i++) wins.push(tokens.slice(i, i + n).join(''));
  /* M13: fuzzy (levRatio) chi khi cau ngan (<= 6 tu) hoac co tu dai
     (>= 6 ky tu, dang la ten go gan dung); cau dai toan tu ngan thi chi
     khop chinh xac ten day du / ten goi — tranh quet fuzzy ca phong cho
     moi chat thuong. */
  const allowFuzzy = tokens.length <= 6 || tokens.some(t => t.length >= 6);
  let best = null, bS = 0, s2 = 0;
  for (const u of known.values()) {
    if (self && u.id === self.id) continue;
    if (!P.get(u.id)) continue;
    let sc = 0;
    const fn = foldedNames(u);   // M13: ten gap lay tu cache theo user
    for (const fc of [fn.nick, fn.uid]) {
      const cf = fc.cf;
      if (cf.length < 4) continue;
      const given = fc.given;
      for (const w of wins) {
        if (w === cf) { sc = 1; break; }
        if (given.length >= 3 && w === given) sc = Math.max(sc, 0.95);
        else if (allowFuzzy && w.length >= 4) sc = Math.max(sc, tagSimilarity(w, cf));
      }
      if (sc === 1) break;
    }
    if (u.npc) sc -= 0.08;
    if (sc > bS) { s2 = bS; bS = sc; best = u; } else if (sc > s2) s2 = sc;
  }
  if (best && (bS === 1 || (bS >= 0.95 && bS - s2 >= 0.04) || (bS >= 0.9 && bS - s2 >= 0.08))) return best;
  return null;
}

/* ===== LỆNH CHAT HIỆU ỨNG — bắt LỎNG tối đa (Nguyen chốt 2026-11-04
   23:09: "thứ mình cần là không khí... cho dù vô tình nhập trúng từ khóa
   cũng kích hoạt luôn") =====
   Từ khóa nhập trong admin dạng MỘT Ô chữ, các từ cách nhau dấu phẩy
   (mặc định hoa rơi: "hoa, roi, tung"; pháo hoa: "phao"; pháo giấy:
   "giay"). Comment được gấp không dấu (không phân biệt hoa thường/có
   dấu) rồi so TỪNG TỪ: câu chứa đúng 1 từ khóa bất kỳ là ăn (từ khóa
   dài >= 4 ký tự thì lệch nhẹ, giống >= 75%, vẫn ăn) — gõ tắt, gõ
   thiếu dấu, vô tình trúng cũng nổ hiệu ứng cho sảnh sôi động. Ưu
   tiên: pháo giấy > pháo hoa > hoa rơi. Hàng rào duy nhất còn giữ:
   mỗi người 1 lần mỗi lenhHieuUngChoGiay giây để một người không
   spam liên tục (người khác gọi vẫn nổ bình thường). */
const fxCmdAt = new Map();
function stemList(v) {
  const out = [];
  const push = s => { for (const p of String(s).split(/[,;\n]+/)) { const w = p.trim(); if (w) out.push(w); } };
  if (Array.isArray(v)) v.forEach(push); else if (v != null) push(v);
  return out;
}
function stemHit(tokens, stem, fuzzy) {
  const st = foldCmd(stem).split(' ').filter(Boolean);
  if (!st.length) return false;
  return st.every(w => tokens.some(tk => tk === w || (fuzzy && w.length >= 4 && levRatio(tk, w) >= 0.8)));
}
/* Tra ve TRUE khi comment THUOC case hieu ung VA hieu ung DA BAN that —
   pipeline dung o do. FALSE khi khong phai cau hieu ung, hoac hieu ung
   dang bi cooldown chan (N2: de onChat chay tiep sang scanLooseTag /
   pairCommand thay vi nuot mat ghep doi). */
function chatFx(user, text) {
  if (cfg.hieuUngChat === false) return false;
  const tokens = foldCmd(text).split(' ').filter(Boolean);
  if (!tokens.length) return false;
  const rules = [
    { list: cfg.lenhPhaoGiay, go: () => { FX.confetti(giftNum('donViPhaoGiay', 100)); toast('🎉 ' + user.nickname + ' bắn pháo giấy!', false); } },
    { list: cfg.lenhPhaoHoa, go: () => { FX.fireworks(giftNum('donViPhaoHoa', 5)); toast('🎆 ' + user.nickname + ' bắn pháo hoa!', false); } },
    { list: cfg.lenhHoaRoi, go: () => { FX.petals(giftNum('donViHoaRoi', 100)); toast('🌸 ' + user.nickname + ' gọi hoa rơi!', false); } },
  ];
  /* Hai vòng: vòng 1 khớp ĐÚNG từ — ý định rõ ràng thắng mọi suy đoán
     (vd "chúc mừng": pháo hoa có từ đúng 'chuc'/'mung' phải thắng pháo
     giấy dù 'chuc' gần giống 'phuc'); vòng 2 mới tới gần đúng (giống
     >= 80%) cho lỗi gõ như 'phaoo', 'giaay'. Nhờ vậy "xin chào" cũng
     không bị nhận nhầm thành 'phao' (giống 75%). */
  for (const fuzzy of [false, true]) {
    for (const r of rules) {
      if (stemList(r.list).some(st => stemHit(tokens, st, fuzzy))) {
        const now = Date.now();
        if (now - (fxCmdAt.get(user.id) || 0) >= (Number(cfg.lenhHieuUngChoGiay) || 8) * 1000) { mapSetCapped(fxCmdAt, user.id, now); r.go(); return true; }
        /* N2: hieu ung khop nhung dang bi cooldown chan -> KHONG chan
           pipeline: tra false de onChat chay tiep sang scanLooseTag /
           pairCommand thay vi nuot mat ghep doi. */
        return false;
      }
    }
  }
  return false;
}
function greet(user) {
  const now = performance.now();
  if (!user || greeted.has(user.id) || now - lastGreet < 8000) return;
  greeted.add(user.id); lastGreet = now;
  mcReact(1, MC.greet, { ten: user.nickname });
}
/* ================= NPC TỰ ĐỘNG KHI VẮNG KHÁCH (Nguyen yêu cầu 2026-11-04) =================
   Phòng vắng mà sân khấu đứng yên thì buổi live chết: gắn sẵn một dàn
   NPC (config npcDanhSach, mặc định 10 người) vào phòng như khách
   thường. Khi khách THẬT còn ít (<= npcNguongVang) và sân khấu đang
   rảnh, game tự cho một NPC "chat tag" một NPC độc thân khác — đi
   đúng đường onChat -> requestCouple như khách thật: MC giới thiệu,
   biến hình thảm đỏ, lên làm lễ đủ bài. Khác khách thật ở 4 điểm:
   (1) NPC vào phòng KHÔNG tính lượt xem, không lia cam chào, không
   câu chào MC; (2) cặp NPC KHÔNG ghi điểm BXH và KHÔNG đếm vào bộ
   đếm cặp đôi — số liệu để dành cho khách thật; (3) cặp NPC diễn
   xong, ngồi nghỉ npcNghiGiay thì TỰ TAN (cặp thường không bao giờ
   tan) để các lần sau xoay vòng sang cặp khác; (4) phòng đông lên quá
   ngưỡng thì ngừng rủ cặp mới. Sửa danh sách/ngưỡng trong admin,
   áp dụng khi tải lại trang game. */
const NPC = { started: false, users: [], lastTagAt: 0, courtSince: new Map() };
function npcRoster() {
  return asList(cfg.npcDanhSach).map(x => String(x).trim()).filter(Boolean).slice(0, 30)
    .map((name, i) => ({ id: 'npc-' + (i + 1), nickname: name, uniqueId: 'npc' + (i + 1), avatar: '', npc: true }));
}
function npcSync() {
  if (NPC.started || cfg.npcTuDong === false) return;
  const list = npcRoster();
  if (!list.length) return;
  NPC.started = true; NPC.users = list;
  list.forEach((u, i) => setTimeout(() => { if (cfg.npcTuDong !== false) ensureGuest(u); }, 1500 + i * 1500));
  setInterval(npcTick, 4000);
}
function npcRealCount() {
  let n = 0;
  for (const u of known.values()) if (!u.npc && P.get(u.id)) n++;
  return n;
}
function npcStageBusy() {
  if (lastQueueLen > 0) return true;
  for (const c of coupleByKey.values()) if (c && c.a.couple === c && (c.state === 'queue' || c.state === 'toStage' || (c.state === 'focus' && !c.coolTimer))) return true;   // c.a.couple === c: bo qua muc thua cua cap da tan con sot trong so coupleByKey; cap focus dang cho het gio nghi (co coolTimer) khong chan NPC — nhu autoPairTick
  const f = P.featured();
  // Cap that dang dien thi phai cho xong. NGOAI LE: cap NPC dang "giu san
  // khau" (hold = het gio dien ma chua co cap ke nen tam dung lai) thi
  // KHONG chan — tag cap NPC moi chinh la cach game xoay vong: cap cu se
  // tu xuong khi cap moi di toi san khau. Cap that dang hold thi de yen.
  if (f && !(f.hold && (f.a.npc || f.b.npc))) return true;
  return false;
}
function npcDissolveRested() {
  const restMs = (Number(cfg.npcNghiGiay) || 60) * 1000;
  const now = Date.now();
  for (const c of [...coupleByKey.values()]) {
    if (!c || !(c.a.npc || c.b.npc)) continue;
    if (c.a.couple !== c || c.b.couple !== c) {   // cặp đã tan bằng đường khác (khách thật ghép lại) -> chỉ dọn sổ, không đụng vào người
      NPC.courtSince.delete(c.key); coupleByKey.delete(c.key); continue;
    }
    if (c.state !== 'court') { NPC.courtSince.delete(c.key); continue; }
    if (!NPC.courtSince.has(c.key)) { NPC.courtSince.set(c.key, now); continue; }
    if (now - NPC.courtSince.get(c.key) >= restMs) {
      NPC.courtSince.delete(c.key);
      coupleByKey.delete(c.key);
      P.dissolveCoupleFull(c);
    }
  }
}
function npcTick() {
  if (!NPC.started || cfg.npcTuDong === false) return;
  npcDissolveRested();
  if (npcRealCount() > (Number(cfg.npcNguongVang) || 6)) return;
  if (Date.now() - NPC.lastTagAt < (Number(cfg.npcMoiBaoLauGiay) || 25) * 1000) return;
  if (npcStageBusy()) return;
  const singles = NPC.users.filter(u => { const p = P.get(u.id); return p && !p.couple && p.state === 'home'; });
  if (singles.length < 2) return;
  const shuffled = singles.slice().sort(() => Math.random() - 0.5);
  const a = shuffled[0];
  const aGirl = P.isGirl(a.id);
  const b = shuffled.find(u => u !== a && P.isGirl(u.id) !== aGirl) || shuffled.find(u => u !== a);
  if (!b) return;
  NPC.lastTagAt = Date.now();
  /* H8: NPC ghep thang NPC qua requestCouple, khong di vong onChat('@ten')
     nua — parseTag co the khop nham sang khach that trung ten voi NPC.
     Toast + loi MC gioi thieu cap moi van giu nguyen: toast o requestCouple,
     MC o P.onPairReveal khi cap len san khau. */
  requestCouple(a, b, 'npc');
}

/* TU GHEP DOI KHI HANG CHO TRONG (Nguyen yeu cau 2026-11-05 12:36):
   hang cho san khau trong lien tuc qua tuGhepDoiSauGiay giay (mac dinh
   5) va khong cap nao dang tren duong len thi tu ghep 1 cap tu khach
   DOC THAN dang co mat trong sanh (uu tien khac gioi), di dung duong
   onChat -> requestCouple nhu khach tu tag nhau (MC gioi thieu, len
   san khau nhu thuong). Tat bang tuGhepDoiKhiRong.
   Boc tham trong nhom TUONG TAC GAN NHAT (Nguyen 2026-11-05): nguoi
   trong sanh chua chac con xem live; nguoi vua tha tim/comment/tang
   qua/chia se (co lastInteract moi nhat — xem markInteract) thi chac
   chan con xem, len san khau la thay minh ngay. Lay 5 nguoi doc than
   tuong tac gan nhat lam nhom boc tham; chua co 2 nguoi tuong tac thi
   boc trong ca sanh nhu cu.
   NPC KHONG nam trong danh sach nay: NPC co duong ghep rieng (npcTick,
   chi chay khi phong vang) — hai he tu dong khong de len nhau, tranh
   NPC bi ghep ca khi phong dang dong khach that. */
let queueEmptySince = Date.now();
function autoPairTick() {
  if (cfg.tuGhepDoiKhiRong === false) { queueEmptySince = Date.now(); return; }
  let transit = false;
  /* Cap 'focus' dang CHO HET GIO NGHI (co coolTimer — cho toi 300s)
     KHONG tinh la transit: no khong sap vao hang, neu tinh thi tu ghep
     bi chan ca buoi trong khi san khau trong. Chi 'toStage' va 'focus'
     gioi thieu 3.6s (chua co coolTimer) moi chan tu ghep. */
  for (const c of coupleByKey.values()) if (c && c.a.couple === c && (c.state === 'toStage' || (c.state === 'focus' && !c.coolTimer))) { transit = true; break; }   // c.a.couple === c: chi tinh cap con song, bo qua muc thua cua cap da tan con sot trong so
  if (lastQueueLen > 0 || transit) { queueEmptySince = Date.now(); return; }
  if (Date.now() - queueEmptySince < (Number(cfg.tuGhepDoiSauGiay) || 5) * 1000) return;
  const singles = [];
  for (const u of known.values()) { const p = P.get(u.id); if (p && !p.npc && !p.couple && (p.state === 'home' || p.state === 'walk')) singles.push(u); }
  if (singles.length < 2) { queueEmptySince = Date.now(); return; }
  /* Nhom boc tham = 5 nguoi doc than tuong tac GAN NHAT (lastInteract
     moi nhat — chi tinh like/comment/tang qua/chia se, xem markInteract);
     chua co 2 nguoi tuong tac thi boc trong ca sanh nhu cu. */
  const interacted = singles.filter(u => (((P.get(u.id) || {}).lastInteract || 0) > 0));
  const pool = interacted.slice().sort((x, y) => (((P.get(y.id) || {}).lastInteract || 0) - ((P.get(x.id) || {}).lastInteract || 0))).slice(0, 5);
  const pickFrom = pool.length >= 2 ? pool : singles;
  const a = pickFrom[Math.floor(Math.random() * pickFrom.length)];
  const aGirl = P.isGirl(a.id);
  const b = pickFrom.find(u => u !== a && P.isGirl(u.id) !== aGirl) || pickFrom.find(u => u !== a);
  if (!b) { queueEmptySince = Date.now(); return; }
  queueEmptySince = Date.now();
  /* H8: ghep thang qua requestCouple nhu npcTick (khong di vong onChat
     '@ten' de tranh parseTag khop nham ten); toast + MC gioi thieu van
     nhu cu (xem npcTick). */
  requestCouple(a, b, 'autopair');
}
setInterval(autoPairTick, 1000);

/* THA TIM (Nguyen yeu cau 2026-11-05 12:18): moi su kien tha tim - ke
   ca chi 1 tim - no 1 hieu ung NGAU NHIEN (hoa roi / phao hoa / phao
   giay, luong vua phai). Chong spam lag: moi nguoi toi thieu
   timHieuUngChoGiay giay (mac dinh 2) moi kich hoat lai; tat bang
   hieuUngThaTim. Moc 50 tim/nguoi van nhay chuc mung nhu luat cu
   (truoc day mapper every=50 -> dance; nay mapper every=1 -> action
   'like' va game tu dem moc). Nguoi chi tha tim VAN hien nhan vat trong
   sanh (qua handler 'seen' — tha tim tinh la khach den du); comment cu
   ghi "KHONG hien" la sai (H9). */
const likeFxAt = new Map();
const likeTotals = new Map();
const likePtsGiven = new Map();   // TIM (2026-11-06): `${userId}::${coupleKey}` -> diem tim da cong (cap diemTimToiDa/nguoi/cap)
function onLike(ev) {
  const u = ev.user; if (!u || !u.id) return;
  const n = Math.max(1, Number(ev.count) || 1);
  const tot = (likeTotals.get(u.id) || 0) + n;
  mapSetCapped(likeTotals, u.id, tot);
  if (Math.floor(tot / 50) > Math.floor((tot - n) / 50)) P.danceAll(5);
  /* TIM MOC 10 (2026-11-06): cu moi mocTimHieuUng tim/nguoi thi no ca 3
     hieu ung nhu qua (mua hoa + phao hoa + phao giay) voi lieu nho hon
     qua tra tien (tim mien phi, nhieu nguoi cung tha) + cong diem vao
     cap cua chinh nguoi tha qua dung duong coupleScore nhu diem qua de
     BXH cap nhat; cap diemTimToiDa diem/nguoi/cap. Chua co doi thi cong
     cho cap dang dien tren san khau; khong co cap nao tren san khau thi
     khong cong diem (hieu ung van no). Diem cong bat ke hieuUngThaTim
     (diem la luat choi, khong phai hieu ung hinh); chi dot no hinh moi
     ton trong hieuUngThaTim. 1 su kien tha nhieu tim vuot 2 moc thi cong
     du diem ca 2 moc nhung chi no 1 dot (chong spam FX). */
  const step = Math.max(1, Math.round(giftNum('mocTimHieuUng', 10)));
  const crossed = Math.floor(tot / step) - Math.floor((tot - n) / step);
  if (crossed > 0) {
    const target = P.coupleOf(u.id) || P.featured();
    const want = crossed * step * Math.max(0, giftNum('diemMoiTim', 1));
    if (target && !(target.a.npc || target.b.npc) && want > 0) {
      const key = u.id + '::' + target.key;
      const given = likePtsGiven.get(key) || 0;
      const add = Math.min(want, Math.max(0, Math.round(giftNum('diemTimToiDa', 100)) - given));
      if (add > 0) { mapSetCapped(likePtsGiven, key, given + add); coupleScore(target, add); }
    }
    if (cfg.hieuUngThaTim !== false) {
      FX.petals(giftNum('timHoaRoi', 50));
      FX.fireworks(giftNum('timPhaoHoa', 3));
      FX.confetti(giftNum('timPhaoGiay', 50));
    }
  }
  if (cfg.hieuUngThaTim === false) return;
  const now = performance.now();
  const cdMs = (cfg.timHieuUngChoGiay != null ? cfg.timHieuUngChoGiay : 2) * 1000;
  if (now - (likeFxAt.get(u.id) || -1e9) < cdMs) return;
  mapSetCapped(likeFxAt, u.id, now);
  const r = Math.random();
  if (r < 1 / 3) FX.petals(55);
  else if (r < 2 / 3) FX.fireworks(1);
  else FX.confetti(45);
}
/* FOLLOW — VONG HOA + TIM BAY (2026-11-06, user chot): vong hoa vang
   tren dau nguoi follow 6 giay (theo nguoi khi di chuyen, nhu vuong
   mien Top 1 — nam tren dau, khong che mat) + vong tim no quanh chinh
   nguoi do (dung lai FX co san de huong luat an toan mat V4:
   ringHearts/hearts co x,y -> noteCoupleAnchor). Re: 24 tim canvas +
   1 vong DOM — follow mien phi nen khong dung dot no lon nhu qua.
   Nguoi chua co nhan vat (phong thu) thi no tim giua san nhu cu. */
function followCelebrate(user) {
  if (!user || !user.id) return;
  P.setWreath(user.id, 6);
  const p = P.get(user.id);
  if (p && FX.ringHearts) {
    const sp = Cam.toScreen(p.x, p.y);
    FX.ringHearts(sp.fx, sp.fy - 0.05);
    if (FX.hearts) FX.hearts(10, sp.fx, sp.fy - 0.05);
  } else if (FX.hearts) {
    FX.hearts(12, 0.5, 0.6);
  }
}
function handle(ev) {
  const src = ev.source || {};
  /* H9: 'like' khong spawn truc tiep o day — nhung nguoi tha tim VAN vao
     sanh qua handler 'seen' (xem .on('seen') o khoi dong: tha tim tinh
     la khach den du), nhat quan voi quyet dinh tha tim tinh la tuong tac. */
  if (ev.user && ev.action !== 'like') ensureGuest(ev.user);
  if (ev.action === 'join' && ev.user) greet(ev.user);
  if (ev.action === 'couple') {
    const tagged = src.text && parseTag(src.text, ev.user);
    const partner = tagged || randomSingle(ev.user);
    if (ev.user && partner) requestCouple(ev.user, partner, tagged ? 'tag' : 'random');
  } else if (ev.action === 'spotlight') {           // follow
    if (!ev.user) return;
    /* M3: follow ghep doi nhu pairCommand — uu tien khac gioi, co
       cooldown rieng 20s/nguoi (truoc day randomSingle + khong
       cooldown nen spam follow tan/ghep lai cap court lien tuc). */
    const nowF = Date.now();
    if (nowF - (followPairAt.get(ev.user.id) || 0) >= 20000) {
      mapSetCapped(followPairAt, ev.user.id, nowF);
      const partner = randomSingleOpp(ev.user) || randomSingle(ev.user);
      if (partner) requestCouple(ev.user, partner, 'follow');
      /* FOLLOW (2026-11-06, user chot: vong hoa + tim bay): chi chay
         trong nhanh qua cooldown 20s nen moi follow chi no 1 lan, du
         ghep duoc hay khong. */
      followCelebrate(ev.user);
    }
    mcReact(2.9, MC.follow, { ten: ev.user.nickname });   // follow xếp SAU mọi câu cảm ơn quà (Nguyen yêu cầu 2026-11-04)
  } else if (ev.action === 'dance') {
    P.danceAll(5);
  } else if (ev.action === 'like') {
    markInteract(ev.user);   // tha tim tinh la tuong tac (xem markInteract)
    onLike(ev);
  } else if (ev.action === 'fireworks') {
    /* C1 — mot nguon duy nhat ban FX: event mapper chi ban khi KHONG phai
       qua (giftFx o khoi gift duoi day da ban) va KHONG phai chat
       (onChat/chatFx da ban) — khong thi 1 qua/chat bi ban 2 dot. */
    if (src.kind !== 'gift' && src.kind !== 'chat') FX.fireworks(Math.max(1, Math.min(6, ev.value || 1)));
  } else if (ev.action === 'petals') {
    if (src.kind !== 'gift' && src.kind !== 'chat') FX.petals(60 + (ev.value || 1) * 40);
  } else if (ev.action === 'confetti') {
    if (src.kind === 'share') markInteract(ev.user);   // chia se tinh la tuong tac (xem markInteract)
    if (src.kind !== 'gift' && src.kind !== 'chat') FX.confetti(50 + (ev.value || 1) * 25);
  }

  if (src.kind === 'gift') {
    markInteract(ev.user);   // tang qua tinh la tuong tac (xem markInteract)
    /* H7: diamonds khong phai so ("abc") -> Number = NaN, Math.max(0, NaN)
       = NaN, guard pts <= 0 khong chan duoc (NaN <= 0 la false) -> diem
       nhiem NaN vinh vien (luu luon vao localStorage). Ep ve 0 + chi
       cong diem khi dia huu han va > 0. */
    const dia = Number(ev.diamonds || ev.value || 1) || 0;
    /* M2: diem ve cap cua CHINH NGUOI TANG truoc, khong co moi toi cap
       tam diem (truoc day featured uu tien tuyet doi nen cap cua nguoi
       tang khong bao gio nhan diem khi da co cap tren san khau). */
    const featured = P.coupleOf(ev.user && ev.user.id) || P.featured();
    if (featured && isFinite(dia) && dia > 0) coupleScore(featured, dia * 50);
    giftFx(dia);
    if (dia >= 99) showBanner(`🎁 ${ev.user ? ev.user.nickname : 'Khách quý'} VỪA MỪNG CƯỚI LỚN!`, 5200);
    A.bell(dia >= 30 ? 3 : 1);
    mcReact(giftVoicePrio(dia), MC.thank, { ten: ev.user ? ev.user.nickname : 'Bạn' });
    toast(`🎁 ${ev.user ? ev.user.nickname : 'Khách'} tặng ${src.giftName || 'quà'}${dia >= 99 ? ' — pháo hoa rực trời!' : ''}`, dia >= 30);
    addLedger(ev.user, src.giftName, dia);
    if (cfg.uuTienQuaTang !== false) giftPriority(ev.user, dia);
  }
  refreshBg(false);
}
/* L16 — server gui block dang {type:'block', user:{id,uniqueId}} (xem
   LiveBridge/server.js), khong phai {userId,uniqueId} o top-level nhu
   code cu doc — nen truoc day khong bao gio xoa duoc ai. Doc ca hai
   dang de tuong thich. */
function onBlock(m) {
  const u = (m && m.user) || {};
  for (const raw of [m && m.userId, m && m.uniqueId, u.id, u.uniqueId]) {
    if (!raw) continue;
    for (const [id] of known) {
      if (id === raw) { P.removeUser(id); known.delete(id); }
    }
  }
}

/* Vi tri cac KHUNG UI theo config (Nguyen chot 2026-11-04): khi live qua
   TikTok, nhieu vung bi giao dien TikTok che — moi khung chinh duoc dich
   bang 2 so % cua khung hinh: X duong = dich sang phai, Y duong = dich
   xuong. Ap vao cac bien CSS offset ma index.html da cong vao vi tri
   neo cua tung khung (khung ben phai neo theo canh phai nen tru nguoc). */
function applyPanelPos() {
  const root = document.documentElement.style;
  const px = (v, base) => ((Number(v) || 0) / 100 * (base || 0)) + 'px';
  root.setProperty('--plx', px(cfg.khungTraiX, SW)); root.setProperty('--ply', px(cfg.khungTraiY, SH));
  root.setProperty('--mcx', px(cfg.khungMcX, SW)); root.setProperty('--mcy', px(cfg.khungMcY, SH));
  /* Vị trí + cỡ chữ TỪNG KHUNG (Nguyen yêu cầu 2026-11-04 23:41): mỗi
     khung một cặp lệch X/Y riêng (% khung hình, áp qua thuộc tính CSS
     translate để không phá hiệu ứng riêng của khung) + một hệ số cỡ
     chữ riêng (config là %, 100 = như cũ) cho chữ khỏi nhỏ khó đọc. */
  root.setProperty('--gdx', px(cfg.khungHuongDanX, SW)); root.setProperty('--gdy', px(cfg.khungHuongDanY, SH));
  root.setProperty('--gox', px(cfg.khungMucTieuX, SW)); root.setProperty('--goy', px(cfg.khungMucTieuY, SH));
  root.setProperty('--ccx', px(cfg.khungDemCapX, SW)); root.setProperty('--ccy', px(cfg.khungDemCapY, SH));
  /* TOẠ ĐỘ TỪ GỐC 0,0 (Nguyen chốt 2026-11-05): vị trí từng khung
     tính thẳng từ góc khung hình (%), không còn lệch theo vị trí chảy
     trong cột. Khung phải/sổ/bảng lệnh tính X từ mép PHẢI, hàng chờ/
     bảng lệnh tính Y từ mép DƯỚI (góc nhà của chúng). Lệch nhóm
     khungPhai cộng dồn vào các khung bên phải; thông báo (toasts)
     bám dưới nhóm phải. Hàng chờ + bảng lệnh: X/Y là khoảng cách %
     từ góc dưới của chúng. */
  const pct = (a, b) => String((Number(a) || 0) + (Number(b) || 0));
  root.setProperty('--bx', pct(cfg.khungBxhX, cfg.khungPhaiX)); root.setProperty('--byy', pct(cfg.khungBxhY, cfg.khungPhaiY));
  root.setProperty('--ldx', pct(cfg.khungSoMungX, cfg.khungPhaiX)); root.setProperty('--ldy', pct(cfg.khungSoMungY, cfg.khungPhaiY));
  root.setProperty('--cbx', String(Number(cfg.khungBangLenhX) || 0)); root.setProperty('--cby', String(Number(cfg.khungBangLenhY) || 0));
  root.setProperty('--tox', pct(pct(1, cfg.khungThongBaoX), cfg.khungPhaiX)); root.setProperty('--toy', pct(pct(11.5, cfg.khungThongBaoY), cfg.khungPhaiY));
  root.setProperty('--qx2', String(Number(cfg.khungHangChoX) || 0)); root.setProperty('--qy2', String(Number(cfg.khungHangChoY) || 0));
  const fv = v => String((Number(v) || 100) / 100);
  root.setProperty('--f-guide', fv(cfg.coChuHuongDan)); root.setProperty('--f-goal', fv(cfg.coChuMucTieu));
  root.setProperty('--f-count', fv(cfg.coChuDemCap)); root.setProperty('--f-board', fv(cfg.coChuBxh));
  root.setProperty('--f-ledger', fv(cfg.coChuSoMung)); root.setProperty('--f-cmd', fv(cfg.coChuBangLenh));
  root.setProperty('--f-queue', fv(cfg.coChuHangCho)); root.setProperty('--f-mc', fv(cfg.coChuMc));
  /* Rong 2 popup (Nguyen yeu cau 2026-11-05): khung MC rong gan full man
     hinh nen che mat thong bao ben phai; rong = % so voi nhu cu (100 = nhu
     cu). Toast: rong tuong tu + lech X/Y rieng cong don vao lech nhom
     phai (truoc day doi toast phai doi ca nhom phai). */
  root.setProperty('--mcw', fv(cfg.rongKhungMc)); root.setProperty('--tow', fv(cfg.rongThongBao));
  /* Banner "LE THANH HON" (va banner moc/qua lon): cao bao nhieu % tinh tu
     mep tren — dua len cao de khong che mat nhan vat tren san khau (mac dinh
     30%, truoc day co dinh 44% nen che ngang cap doi). */
  root.setProperty('--by', String(cfg.bannerY != null ? cfg.bannerY : 30));
}
/* ============ Cấu hình ============ */
/* F6b (nv1, 2026-11-06): XOAY MAN HINH qua config LiveBridge — user doi
   nut tu trang game (F6, nut noi) sang config (checkbox o trang quan tri
   LiveBridge). Chi xoay container NGOAI (#stage) bang transform, KHONG
   dung layout / vi tri / logic ben trong game. Cong thuc (doc viewport
   TRUOC khi xoay): stage goc la doc (sw x sh, resize() dat); xoay 90 do
   thi khung hien thi thanh sh x sw; scale vua viewport, giu ti le:
   S = min(vw / sh, vh / sw). Vi du 1920x1080, stage 607.5x1080:
   S = min(1920/1080, 1080/607.5) = 1.78 -> khung xoay 1920x1080, vua
   dung viewport, can giua. applyConfig dat co rotateOn theo
   cfg.xoayManHinh roi goi applyRotate(); resize() goi lai applyRotate()
   de tinh lai scale khi cua so doi kich thuoc luc dang xoay.
   LUU Y: day la cai dat TOAN CUC cua game (ai mo game cung thay xoay)
   — chi bat khi xem tren laptop, NHO TAT khi live (live van quay
   game doc). Chu van nghieng theo khi xoay (MC, bang lenh, BXH...). */
let rotateOn = false;
function applyRotate() {
  if (!stageEl) return;
  if (!rotateOn) { stageEl.style.transform = ''; return; }
  const vw = window.innerWidth, vh = window.innerHeight;
  const sw = stageEl.offsetWidth, sh = stageEl.offsetHeight;
  if (!sw || !sh || !vw || !vh) return;
  const s = Math.min(vw / sh, vh / sw);
  stageEl.style.transform = 'translate(-50%,-50%) rotate(90deg) scale(' + s + ')';
}
function applyConfig(c) {
  cfg = c || {};
  /* Chuẩn hoá MỌI key danh sách ngay đầu vào, VÔ ĐIỀU KIỆN: settings.json
     trên máy người dùng có thể lưu key dạng chuỗi thô, object hoặc số (di
     chứng các bản admin cũ) — asList ép hết về mảng chuỗi sạch. 1 key sai
     kiểu không được phép giết cả quá trình áp config/UI (lỗi 2026-11-04:
     màn hình mất hết khung/BXH/MC dù sự kiện vẫn chạy). */
  for (const k of ['mcLines', 'mcFunny', 'mcCouple', 'mcThank', 'mcGreet', 'mcFollowLines', 'mcMilestone', 'mcTagVang', 'mcTagDaCoDoi', 'mcSapMoc', 'mcGuide', 'rulesLines', 'guideLines', 'npcDanhSach']) {
    cfg[k] = asList(cfg[k]).filter(x => typeof x === 'string');
  }
  /* M14b: xây TIERS từ cfg.bgRules (một nguồn sự thật); bgRules thiếu/
     rỗng/không còn mục hợp lệ thì giữ TIERS hiện tại (fallback hardcode).
     Preload nền của mốc mới (admin thêm mốc thì file chưa có trong đợt
     preload lúc mở game); đặt lại BG.tier để refreshBg áp lại đúng
     FX/vương miện/pool đồ theo TIERS mới thay vì giữ trạng thái cũ. */
  const built = buildTiersFromBgRules(cfg.bgRules);
  if (built) {
    TIERS = built;
    BG.tier = -1;
    for (const t of TIERS) preloadOne(t.file);
  }
  if (cfg.mcName) MC.name = cfg.mcName;
  /* HAI MC LUÂN PHIÊN (Nguyen yêu cầu 2026-11-04): 1 nam + 1 nữ, hiện lên
     kiểu NGẪU NHIÊN (không phải nam-nữ-nam cứng nhắc — chỉ tránh 1 người
     nói 3 câu liên tiếp). MC nữ dùng giọng mặc định của game (ô "Giọng
     NPC" trong admin, mặc định Hoài My); MC nam dùng npcVoiceNam (mặc
     định Nam Minh). Nhân vật được chốt ngay khi câu vào hàng chờ để khâu
     chuyển giọng chuẩn bị đúng giọng của người sắp nói. */
  MC.personas = [
    { name: cfg.mcName || 'MC Anh Tú', img: 'img/mc.png', voice: cfg.npcVoiceNam || 'vi-VN-NamMinhNeural' },
    { name: cfg.mcNameNu || 'MC Ngọc Trâm', img: 'img/mc-nu.png', voice: null },
  ];
  MC.lines = (cfg.mcLines && cfg.mcLines.length) ? cfg.mcLines : ['Một đám cưới vui là khi khách mời cười nhiều hơn cô dâu chú rể.', 'Tình yêu không cần hoàn hảo, chỉ cần hai người cùng tag nhau lên sân khấu là đủ.', 'Cả nhà thả tim thật nhiều để chúc phúc cho các cặp đôi nhé!'];
  MC.funny = (cfg.mcFunny && cfg.mcFunny.length) ? cfg.mcFunny : ['MC dặn nhỏ: tag người yêu cũ vào đây MC tính phí gấp đôi nhé!', 'Ai còn độc thân giơ tay, MC nhìn thấy hết đấy, đừng trốn sau hàng ghế nữa!', 'Đi ăn cưới online mà không mất tiền mừng, thời đại này sướng thật!'];
  MC.couple = cfg.mcCouple || [];
  MC.thank = cfg.mcThank || []; MC.greet = cfg.mcGreet || []; MC.follow = cfg.mcFollowLines || [];
  MC.tagVang = cfg.mcTagVang || [];
  MC.tagDaCoDoi = (cfg.mcTagDaCoDoi && cfg.mcTagDaCoDoi.length) ? cfg.mcTagDaCoDoi : ['ê {a}, {b} đã có đôi rồi, mình không nên phá hoại gia đình nhà người khác nhá!', '{a} à, {b} đã có gia đình rồi, bạn nên chọn người khác đi nhé!', '{b} là của {c} rồi {a} ơi, chen vào là MC không cứu được đâu!', 'Thôi {a} ơi, {b} với {c} đang hạnh phúc, mình đừng làm kỳ đà cản mũi nha!'];
  try {
  buildBanSets();
  P.setStageCooldowns(computeStageCooldown(), personCdSec());
  MC.milestone = cfg.mcMilestone || [];
  MC.sapMoc = (cfg.mcSapMoc && cfg.mcSapMoc.length) ? cfg.mcSapMoc : ['Cả nhà ơi, chỉ còn {con} lượt xem nữa là chạm mốc {moc} — sảnh {sanh} sắp mở rồi! Mọi người chia sẻ live giúp MC nhé!', 'Sắp rồi, sắp rồi! Còn đúng {con} lượt xem nữa là lên mốc {moc} — ai chưa vào thì vào nhanh nào!', 'Mốc {moc} lượt xem ở ngay trước mắt, chỉ thiếu {con} nữa thôi! Cả nhà thả tim và chia sẻ để mở sảnh {sanh} nhé!'];
  if (window.NpcVoice) NpcVoice.setConfig(cfg);
  if (window.NpcVoice && NpcVoice.enabled()) {
    /* LÀM NÓNG voice — nhưng PHẢI NHƯỜNG ĐƯỜNG lúc mới mở game: bản cũ
       bắn ~260 request tổng hợp CÙNG LÚC (2 giọng × ~130 đoạn tĩnh) ngay
       khi nhận config; Chrome chỉ cho ~6 kết nối/host và bridge tổng hợp
       TUẦN TỰ, nên ảnh nền/ảnh nhân vật bị kẹt sau hàng chờ voice cả
       phút — sảnh trống đỏ khi mới mở game (Nguyen chụp 2026-11-04
       16:18). Nay: chờ 2.5s cho nền và khung ổn định, rồi bơm NHỎ GIỌT
       2 đoạn (×2 giọng) mỗi 300ms; voice vẫn nóng dần trong ~1 phút đầu
       mà không nghẽn mạng. Câu nào cần nói trước khi nóng kịp thì khâu
       prefetch lúc vào hàng chờ vẫn lo như cũ.
       V11 — ƯU TIÊN THẤP + BACKPRESSURE: bơm làm nóng gửi prio 0 (server
       xếp sau câu thật prio 2) và CHỜ đợt vừa bơm xong (tối đa 2s) mới bơm
       đợt tiếp — lúc cache ấm mỗi đợt xong trong ~0,1s nên nóng vẫn nhanh;
       lúc cache lạnh thì bơm tự chậm theo tốc độ tổng hợp của server, số
       việc đang chờ không bao giờ vượt quá 1 đợt (4 việc), câu thật không
       còn phải xếp sau cả trăm việc làm nóng. */
    const jobs = [];
    const seenSeg = new Set();
    for (const pool of [MC.lines, MC.funny, MC.greet, MC.follow, MC.thank, MC.milestone, MC.tagVang, MC.tagDaCoDoi, MC.sapMoc, MC.couple]) {
      for (const tpl of pool || []) for (const seg of staticSegmentsOf(tpl)) {
        if (!seenSeg.has(seg)) { seenSeg.add(seg); jobs.push(seg); }
      }
    }
    const mv = MC.personas && MC.personas[0] && MC.personas[0].voice;
    if (MC._warmTimer) clearTimeout(MC._warmTimer);
    let ji = 0;
    const pumpWarm = async () => {
      const batch = [];
      for (let n = 0; n < 2 && ji < jobs.length; n++) {
        const seg = jobs[ji++];
        batch.push(NpcVoice.prefetch(seg, undefined, 0));          // giọng mặc định (MC nữ), prio thấp
        if (mv) batch.push(NpcVoice.prefetch(seg, mv, 0));   // cả giọng MC nam, prio thấp
      }
      if (batch.length) await Promise.race([Promise.all(batch.map(p => p || Promise.resolve(null))), new Promise(r => setTimeout(() => r(null), 2000))]);
      if (ji < jobs.length) MC._warmTimer = setTimeout(pumpWarm, 300);
    };
    MC._warmTimer = setTimeout(pumpWarm, 2500);
  }
  if (cfg.coupleSec) P.coupleSec = cfg.coupleSec;
  if (cfg.nhaCapTiepSauGiay) P.releaseSec = cfg.nhaCapTiepSauGiay;
  P.setTune({ boost: cfg.phongToGoiTen, scaleC: cfg.coCapGiua, pairOffC: cfg.lechCapGiua, priorityOn: cfg.uuTienChoTrong !== false, crowdMin: cfg.nguongDongNguoi, staleMin: cfg.phutImMatCho, innerRatio: cfg.tyLeChoTrong, quietMax: cfg.phongVangDuoi, agingMs: cfg.choDoiLanThapGiay != null ? cfg.choDoiLanThapGiay * 1000 : undefined });
  FX.setTier(BG.tier < 0 ? 0 : BG.tier);
  applyPanelPos();
  try { applyShowAll(); } catch (e) { console.warn('[dam-cuoi] showall:', e.message); }
  A.setConfig(cfg);
  } catch (e) { console.error('[dam-cuoi] applyConfig loi o phan cau hinh:', e); }
  /* F6b: ap cai dat xoay man hinh tu config (rieng try/catch de loi xoay
     khong giet applyConfig). Config moi tu LiveBridge (admin doi checkbox)
     chay lai applyConfig nen bat/tat xoay co hieu luc ngay, khong can tai
     lai trang. */
  try { rotateOn = cfg.xoayManHinh === true; applyRotate(); } catch (e) { console.warn('[dam-cuoi] xoay man hinh:', e.message); }
  /* Hàng UI chạy SAU và TỪNG BƯỚC RIÊNG: dù bất kỳ bước cấu hình nào ở trên
     còn vấp, các khung luật/hướng dẫn/BXH/nền VẪN phải hiện — test giả lập
     hay live thật đều thấy UI như nhau. */
  for (const fn of [renderRules, startGuide, renderBoard, renderCoupleCount, renderCmdBoard, () => refreshBg(false)]) {
    try { fn(); } catch (e) { console.error('[dam-cuoi] loi ve UI:', e); if (window.__diag) window.__diag.uiErr = String((e && e.message) || e); }
  }
  if (window.__diag) window.__diag.stage = 'config-ok';   // mốc cho hộp tự chẩn đoán ở index.html
  try { npcSync(); } catch (e) { console.error('[dam-cuoi] npcSync loi:', e); }
}

/* ============ Khung hình 9:16 ============ */
let lastLayoutKey = '';
function resize() {
  const Wpx = innerWidth, Hpx = innerHeight;
  const narrow = Math.min(Wpx / Hpx, 9 / 16);
  const sw = narrow * Hpx, sh = Hpx;
  const key = [Wpx, Hpx, document.fullscreenElement ? 1 : 0].join('|');
  if (key === lastLayoutKey) return;
  lastLayoutKey = key;
  const u0 = sw / 100;
  const root = document.documentElement.style;
  root.setProperty('--u0', u0 + 'px');
  const compact = navigator.webdriver || /live|obs/i.test(navigator.userAgent) || q.has('compact') ? 0 : 1;
  stageEl.style.width = sw + 'px'; stageEl.style.height = sh + 'px';
  if (compact) {
    /* L7: nguong cu (u0 < 2.8, tuc be ngang san khau < 280px) gan nhu khong
       bao gio cham tren dien thoai that (360px tro len) nen nhanh tang co
       chu compact chet — sua theo be ngang thuc: man hinh doc <= 400px
       (dien thoai 360-390px) thi phong chu 1.55. */
    root.setProperty('--k', sw < 400 && Hpx > Wpx ? '1.55' : '1');
  } else {
    root.setProperty('--k', '1.2');
  }
  /* --side LUÔN = 0: các khung nằm TRONG #stage nên chỉ được bám mép sân
     khấu. Trước đây nhánh compact gán --side = fitW (khoảng trống NGOÀI sân
     khấu khi cửa sổ trình duyệt rộng hơn 9:16) — trên Chrome desktop cửa sổ
     landscape, fitW vài trăm px cộng vào left/right của khung làm khung bị
     đẩy văng hẳn khỏi sân khấu (và max-width của #left âm -> co còn ~18px):
     game chạy đúng hết (DOM/config/BXH đều sẵn) mà không thấy khung nào.
     LIVE Studio và bản test tự động vừa khung 9:16 (fitW = 0) nên không lộ.
     Đã tái hiện bằng cửa sổ 1600x900 giả lập Chrome thật: khung trái x=1099
     trong khi sân khấu chỉ tới 1053, BXH bị đẩy sang trái khỏi sân khấu. */
  root.setProperty('--side', '0px');
  FX.resize(sw, sh, Math.min(2, window.devicePixelRatio || 1));
  SW = sw; SH = sh; WW = Math.round(sw * 3.2); WH = Math.round(sh * 2.2);
  applyPanelPos();
  const world = $('world');
  world.style.width = WW + 'px'; world.style.height = WH + 'px';
  P.resize(WW, WH);
  Cam.apply(false);
  applyRotate();   // F6b: cua so doi kich thuoc luc dang xoay -> tinh lai scale theo viewport moi
}
addEventListener('resize', resize);
document.addEventListener('fullscreenchange', () => { lastLayoutKey = ''; resize(); });
setInterval(resize, 2000);
setInterval(() => { const sp = $('spot'); if (sp && !P.featured()) sp.classList.remove('on'); syncStageSpotlight(); }, 3000);   // V3: tat spotlight/ten cap neu san khau trong (tan cap / truong hop le)

/* Hiệu ứng ÂU YẾM riêng cho từng cặp đang trên bục — mỗi vị trí 1 kiểu khác nhau:
   cặp giữa: suối tim + vòng tim · cặp trái: mưa cánh hoa · cặp phải: vòng tim + hoa xen kẽ */
let loveTick = 0;
setInterval(() => {
  if (!P.staged) return;
  loveTick++;
  for (const s of P.staged()) {
    const c = s.couple;
    if (c.state !== 'stage') continue;
    const mid = Cam.toScreen((c.a.x + c.b.x) / 2, (c.a.y + c.b.y) / 2);
    if (s.spot === 0) {
      FX.hearts(9, mid.fx, mid.fy - 0.04);
      if (loveTick % 2 === 0 && FX.ringHearts) FX.ringHearts(mid.fx, mid.fy - 0.05);
    } else if (s.spot === 1) {
      if (FX.petalBurst) FX.petalBurst(mid.fx, mid.fy);
      FX.hearts(4, mid.fx, mid.fy - 0.03);
    } else {
      if (loveTick % 2 === 0) { if (FX.ringHearts) FX.ringHearts(mid.fx, mid.fy - 0.05); }
      else if (FX.petalBurst) FX.petalBurst(mid.fx, mid.fy);
      FX.hearts(5, mid.fx, mid.fy - 0.03);
    }
  }
}, 2400);

/* ============ Âm thanh: theo config, KHÔNG còn nút bấm (Nguyen chot 2026-11-04) ============
   Nút "Bấm để bật âm thanh" đã bỏ hẳn: tiếng đi theo config trong setting
   (mặc định tắt). audio.js tự mở khóa âm thanh ở lần chạm/phím đầu tiên trên
   trang (pointerdown/keydown) nên nếu bật nhạc trong config thì click đầu
   tiên vào trang là có tiếng — không cần nút riêng che khung hình nữa. */
let audioInited = false;
function initAudio() {
  if (audioInited) return;
  audioInited = true;
  /* C2: noi trang thai am thanh vao hop chan doan __diag (co san o
     index.html) de streamer biet game dang cam hay co tieng — chi ghi
     vao object __diag, khong them field hien thi moi. */
  A.onState = st => { try { if (window.__diag) window.__diag.audio = st; } catch (e) {} };
  A.init();
}

/* ============ Khởi động ============ */
FX.init($('fx'));
P.init($('people'));
resize();
Cam.home();
refreshBg(false);
/* Rảnh rỗi lâu thì camera tự lia đi ngắm khách một vòng rồi về sân khấu */
setInterval(() => {
  if (Date.now() < Cam.busyUntil || P.featured() || Cam.followC || stageLockRemain() > 0) return;
  const t = P.tourTarget && P.tourTarget();
  if (t && Math.random() < 0.75) {
    Cam.busyUntil = Date.now() + 13000;
    Cam.panTo(t.x, t.y - 2, 0.95);
    setTimeout(() => { if (Date.now() >= Cam.busyUntil - 100) Cam.home(); }, 7000);
  }
}, 20000);
setInterval(() => { if (TIERS[BG.tier] && TIERS[BG.tier].royal === 2) FX.fireworks(2); }, 25000);

if (isDemo) {
  say('<span style="color:#ffd76a">● CHẾ ĐỘ DEMO</span> — xem thử, không cần LIVE thật', 'demo');
  applyConfig({
    mcName: 'MC Anh Tú',
    mcNameNu: 'MC Ngọc Trâm',
    npcVoiceOn: true, npcVoice: 'vi-VN-HoaiMyNeural', npcVoiceNam: 'vi-VN-NamMinhNeural', npcVoiceMinGapSec: 8, npcVoiceMaxPerMin: 6,
    coupleSec: 9, nhaCapTiepSauGiay: 6,
    phongToGoiTen: 1.32, coCapGiua: 1.22,
    phongVangDuoi: 15, liaCamNguoiMoiKhiVang: true, liaCamNguoiMoiGiay: 4,
    zoomGoiTen: 1.18, zoomBamTheo: 1.08, lechCapGiua: 1.8,
    uuTienChoTrong: true, nguongDongNguoi: 70, phutImMatCho: 4, tyLeChoTrong: 0.45,
    mcMinSec: 16, mcMaxSec: 24,
    npcTuDong: true, npcNguongVang: 6, npcMoiBaoLauGiay: 25, npcNghiGiay: 60,
    npcDanhSach: ['Ngọc Linh', 'Tuấn Kiệt', 'Mỹ Duyên', 'Minh Đức', 'Hồng Nhung', 'Quốc Bảo', 'Thu Hằng', 'Hoàng Long', 'Phương Thảo', 'Tiến Dũng'],
    hieuUngChat: true, hienBangLenh: true, lenhHieuUngChoGiay: 8,
    lenhHoaRoi: 'hoa,roi,tung,vui', lenhGhepDoi: true, tuKhoaGhepDoi: 'ghép đôi, ghep doi, cưới, cuoi, yêu, yeu, kết hôn, ket hon', lenhPhaoHoa: 'phao,chuc,mung', lenhPhaoGiay: 'giay,hanh,phuc,ve',
    quaTangMocLon: 299, quaTangMocVua: 99, quaTangHieuUngLon: 10, quaTangHieuUngVua: 5, quaTangHieuUngNho: 1, donViHoaRoi: 100, donViPhaoHoa: 5, donViPhaoGiay: 100,
    khungHuongDanX: 0, khungHuongDanY: 0, khungMucTieuX: 0, khungMucTieuY: 0, khungDemCapX: 0, khungDemCapY: 0,
    khungBxhX: 1, khungBxhY: 0, khungSoMungX: 1, khungSoMungY: 5.8, khungBangLenhX: 1, khungBangLenhY: 1,
    coChuHuongDan: 110, coChuMucTieu: 100, coChuDemCap: 110, coChuBxh: 110, coChuSoMung: 110, coChuBangLenh: 130, coChuHangCho: 110, coChuMc: 100,
    hienTatCaKhung: false,
    bgRules: [
      { viewers: 10, file: 'bg-500.webp' }, { viewers: 30, file: 'bg-2000.webp' },
      { viewers: 50, file: 'bg-5000.webp' }, { viewers: 100, file: 'bg-10000.webp' }, { viewers: 200, file: 'bg-sanh-moi.webp' },
    ],
    rulesLines: ['💌 Tag @tên người thương → cùng lên sân khấu', '🎁 Quà càng lớn, pháo hoa càng to', '👁 Tổng lượt xem càng cao → sảnh cưới càng xịn', '❤️ Cứ 10 tim → mưa hoa + pháo hoa + pháo giấy', '❤️ Thả tim tăng điểm cho cặp của bạn (tối đa 100 điểm)', '➕ Follow → vòng hoa vàng + tim bay chào mừng'],
    guideLines: ['💌 Gõ "@tên người thương" → 2 bạn lên sân khấu', '🎁 Tặng quà → pháo hoa cho cặp đôi tâm điểm', '👑 Cặp được tặng nhiều quà nhất sẽ đội vương miện', '👗 Gõ "nam" / "nữ" / "đổi đồ" → đổi nhân vật, trang phục', '👁 Kéo bạn bè vào xem → sảnh nâng cấp theo tổng lượt view'],
    mcLines: ['Một đám cưới vui là khi khách mời cười nhiều hơn cô dâu chú rể.', 'Tình yêu không cần hoàn hảo, chỉ cần hai người cùng tag nhau lên sân khấu là đủ.', 'Cả nhà thả tim thật nhiều để chúc phúc cho các cặp đôi nhé!', 'Đám cưới online mà vui như offline — chỉ thiếu mỗi phong bao của bạn thôi đó!', 'Ai chưa tag người thương thì tag lẹ đi, sân khấu đang trống nè!', 'Sảnh cưới hôm nay rộn ràng quá — MC dẫn mà cũng muốn cưới theo luôn!', 'Cả nhà nhớ thả tim đều tay nhé, tim càng nhiều cặp đôi càng hạnh phúc!', 'Ai đang thầm thương ai thì cứ tag thẳng lên đây; sân khấu này sinh ra để biến lời thầm thương thành lễ cưới.', 'Thả tim đều tay nào cả nhà! Tim bay càng nhiều, hoa rơi càng đẹp, cặp đôi càng có thêm vía hạnh phúc.', 'Muốn xem hoa rơi thì bình luận đúng câu thần chú nhé; muốn lên sân khấu thì tag ngay người làm bạn cười nhiều nhất.', 'Phòng đang yên không có nghĩa là hết vui; chỉ cần một cú tag đúng người là cả sảnh lại rộn ràng ngay.', 'Follow phòng để lần sau vào không lạc đường, còn hôm nay cứ ở lại xem hết lễ rồi hãy về nhé cả nhà.', 'Cặp nào đang chờ lượt thì cứ yên tâm, MC nhớ hết. Khách mới cứ thả tim, tag bạn bè vào chung vui trước đã.', 'Một bình luận dễ thương, một lượt thả tim, một cái tên được tag — ba thứ nhỏ mà làm nên một đám cưới rất vui.', 'Sảnh cưới còn nhiều ghế đẹp và sân khấu còn nhiều lượt trống. Ai chưa có đôi thì mạnh dạn gọi tên người thương đi nào.'],
    mcFunny: ['MC dặn nhỏ: tag người yêu cũ vào đây MC tính phí gấp đôi nhé!', 'Ai còn độc thân giơ tay, MC nhìn thấy hết đấy, đừng trốn sau hàng ghế nữa!', 'Đi ăn cưới online mà không mất tiền mừng, thời đại này sướng thật!', 'Luật của sảnh: vào đây là phải vui, ai buồn MC cho lên sân khấu cưới luôn!', 'MC đếm rồi: phòng mình còn nhiều người độc thân lắm — tag nhau đi kẻo MC mai mối đại đó!', 'Ăn cưới online sướng nhất là không phải rửa chén — cứ ngồi xem và thả tim thôi!', 'Ai tag trúng người yêu cũ thì MC không chịu trách nhiệm đâu nha, MC chỉ se duyên thôi!', 'Đi ăn cưới online có một lợi thế lớn: nghe MC nói nhiều mà vẫn được ngồi nhà ăn thêm chén cơm.', 'Người ta ế lâu gọi là kén chọn; ế mà vào sảnh này thì gọi là đang chờ MC phát người thương.', 'Tình yêu thời nay không cần sóng khỏe, chỉ cần đúng người và đúng lúc người ta cũng đang cầm điện thoại.', 'Cưới xong mới hiểu: lãng mạn là hoa hồng, còn bền lâu là nhớ hỏi nhau hôm nay ăn gì.', 'Nhẫn cưới bé xíu mà uy lực lớn lắm; đeo vào là tự nhiên biết nhường nhịn và biết đường về nhà sớm.', 'MC giữ mic lâu vậy không phải tham nói, mà vì chưa thấy ai dám lên giành cô dâu chú rể về đội mình.', 'Thả thính mà đối phương không hiểu thì gọi là thơ; thả đúng vào sảnh cưới thì gọi là chuẩn bị làm lễ.', 'Có người nói chờ đúng người rất lâu. MC thấy không lâu đâu, lâu là chờ người ta trả lời tin nhắn sau khi đã xem.', 'Đám cưới là ngày hai người cười rất nhiều, khách thì thả tim rất nhiều, còn MC thì khát nước cũng rất nhiều.', 'Độc thân không đáng sợ; đáng sợ là bạn bè đều tag người thương, còn mình chỉ tag nhầm… chính mình!'],
    mcCouple: ['Xin giới thiệu cặp đôi {a} ❤ {b}! Mời hai bạn lên sân khấu làm lễ nào!', 'Cả nhà ơi, cặp đôi {a} và {b} sắp lên sân khấu! Chuẩn bị pháo tay nào!', 'MC xin được se duyên cho {a} ❤ {b}. Chúc hai bạn trăm năm hạnh phúc, đầu bạc răng long!', 'Trân trọng giới thiệu: {a} và {b} — cặp đôi tiếp theo của sảnh cưới chúng ta!', 'Đến lượt {a} ❤ {b} rồi! Hai bạn nắm tay nhau bước lên sân khấu nhé!', 'Một tràng pháo tay cho {a} và {b} nào cả nhà! Cặp đôi này dễ thương quá đi!', 'MC gọi tên {a} ❤ {b}! Mời hai bạn lên nhận lời chúc phúc của cả sảnh!', 'Duyên trời sắp đặt: {a} và {b} đã thành một cặp! Mời hai bạn lên sân khấu!', 'Xin mời cặp đôi {a} ❤ {b} tiến lên sân khấu — nhạc đâu, hoa đâu, lên nào!', 'Cặp đôi vàng của giờ này: {a} và {b}! Chúc hai bạn sớm về chung một nhà!', 'Xin mời {a} và {b} bước lên thảm đỏ! Từ giây này, hai bạn là nhân vật chính của sảnh cưới.', 'Cả nhà chú ý: {a} ❤ {b} đã tìm thấy nhau giữa bao nhiêu khách mời. Mời hai bạn tiến lên làm lễ!', 'Dây tơ hồng đã buộc chặt {a} với {b} rồi! Xin mời cặp đôi lên sân khấu nhận muôn lời chúc phúc.', 'Mời {a} nắm tay {b} thật chắc, bước lên bục lễ nào! Hôm nay không ai được lẻ bóng nữa đâu.', 'Cặp đôi tiếp theo xin gọi tên {a} và {b}. Hai nụ cười này đứng cạnh nhau là sáng cả sân khấu!', 'Đến phần được chờ nhất: {a} ❤ {b} lên làm lễ! Cả nhà thả tim thật đều cho hai bạn lấy vía hạnh phúc nhé.', 'MC trân trọng kính mời {a} cùng {b} bước lên. Chúc hai bạn một lễ cưới online mà nhớ mãi không quên!', 'Xin chúc mừng {a} và {b}! Hai bạn cứ yên tâm đứng giữa sân khấu, việc cổ vũ cứ để cả phòng lo.'],
    mcThank: ['Cảm ơn {ten} đã tặng quà mừng cưới! Phong bao này MC ghi sổ vàng rồi nhé!', 'Ôi, {ten} tặng quà nè! Cả sảnh cưới cảm ơn bạn — hậu tạ này nồng ấm quá!', 'Quà của {ten} tới rồi! MC thay mặt cô dâu chú rể cảm ơn bạn nhiều lắm!', '{ten} hào phóng quá! Quà này làm sảnh cưới sáng rực luôn — cảm ơn bạn!', 'Nhận được quà của {ten} rồi! Chúc bạn ví luôn đầy như phong bao bạn tặng nhé!', 'Cảm ơn {ten}! Quà mừng cưới này MC sẽ đọc to cho cả sảnh cùng vui!', 'Ui, {ten} tặng quà xịn quá! Cô dâu chú rể mà biết là cảm động lắm đó!', '{ten} ơi, quà tới tay rồi! MC cảm ơn tấm lòng vàng của bạn nhé!', 'Một món quà từ {ten} — sảnh cưới rộn ràng hẳn lên! Cảm ơn bạn rất nhiều!', 'Cảm ơn {ten} đã mừng cưới! Chúc bạn tặng quà xong là lộc lá đầy nhà luôn!', 'Quà mừng của {ten} vừa tới, MC nghe như pháo nổ đầu ngõ! Cảm ơn bạn đã góp vui cho lễ cưới.', '{ten} gửi quà là gửi cả lời chúc tốt lành. Cô dâu chú rể nhận lộc này chắc cười cả buổi!', 'Phong bao từ {ten} làm bàn tiệc thêm rôm rả. MC chúc bạn làm ăn thuận lợi, tiền vào như khách dự cưới!', 'Cảm ơn {ten} đã mừng cưới thật nhiệt tình! Món quà này MC sẽ giữ như một kỷ niệm đẹp của buổi live.', '{ten} tặng quà có tâm quá! Chúc bạn gặp đúng người, đúng lúc, và ví tiền cũng luôn đúng ý.', 'Quà của {ten} tới đúng lúc cao trào luôn! Cả nhà cho bạn một tràng tim thay lời cảm ơn nào.', 'Nhận quà của {ten} mà MC thấy buổi lễ thêm phần long trọng. Chúc bạn tháng này lộc lá gõ cửa liên tục!', '{ten} đã góp một phần rực rỡ cho sảnh cưới rồi. Cảm ơn bạn, chúc bạn vui như đang đi ăn cưới người mình thương!'],
    mcGreet: ['Chào {ten} đã ghé sảnh cưới! Tìm chỗ ngồi đẹp, chuẩn bị tag người thương nhé!', 'Hoan nghênh {ten}! Vào rồi thì ở lại dự tiệc, đừng về sớm đó nha!', 'A, {ten} tới rồi! Sảnh cưới hôm nay đông vui quá — chào mừng bạn!', 'Chào mừng {ten} đến với đám cưới online! Cứ tự nhiên như ở nhà nhé!', '{ten} ơi, vào phòng là có duyên rồi — kiếm người thương tag lên sân khấu đi nè!', 'MC chào {ten}! Hôm nay bạn muốn dự tiệc hay muốn lên làm nhân vật chính đây?', 'Hoan hô, {ten} đã vào phòng! Ngồi xuống, thả tim, chuẩn bị xem lễ cưới nào!', 'Chào {ten}! Sảnh cưới đang vui lắm, bạn vào đúng lúc rồi đó!', 'Nghe tiếng bước chân là MC biết có khách quý! Chào {ten}, mời vào bàn tiệc và chọn góc đẹp ngắm lễ nhé!', '{ten} vừa bước vào là sảnh sáng hẳn lên! Ngồi xuống nghỉ chân, lát nữa biết đâu lại được gọi tên lên sân khấu.', 'Chào mừng {ten} đến dự cưới! Hôm nay cứ ăn mừng bằng tim, cười bằng mắt và se duyên bằng một cú tag nhé!', 'Khách mới tới rồi! {ten} ơi, MC giữ sẵn một chỗ gần sân khấu, chỉ chờ bạn tag đúng người trong lòng.', '{ten} vào phòng đúng giờ đẹp luôn! Biết đâu người thương của bạn cũng đang ngồi đâu đây chờ được gọi tên.', 'Hoan nghênh {ten}! Vào sảnh cưới là phải vui, phải thả tim và mạnh dạn rủ người thương lên làm lễ.', 'MC bắt gặp một vị khách rất có duyên: {ten}! Mời bạn vào tiệc, hôm nay sân khấu còn nhiều lượt lắm.', '{ten} tới là có lộc rồi! Ngồi chơi thật lâu, xem cặp nào hợp mắt thì cổ vũ thật nhiệt tình nhé!'],
    mcFollowLines: ['Cảm ơn {ten} đã follow! Từ nay bạn là khách VIP của sảnh cưới này nhé!', 'Hoan hô! {ten} vừa follow phòng — MC ghi tên vào sổ khách quý rồi đó!', 'Cảm ơn {ten} đã theo dõi! Có bạn là sảnh cưới vui thêm hẳn luôn!', 'A, {ten} follow rồi nè! Từ nay đám cưới nào vui là có mặt bạn hết nhé!', 'MC cảm ơn {ten} đã follow. Tặng bạn một tràng pháo tay của cả sảnh cưới!', '{ten} ơi, follow là có duyên với sảnh cưới này rồi đó — ở lại chơi lâu nhé!', 'Tuyệt vời! {ten} đã follow — từ nay bạn là người nhà của MC rồi!', 'Cảm ơn {ten} đã nhấn theo dõi! Chuẩn bị tinh thần, sắp có cặp đôi dễ thương lên sân khấu đó!', 'Một lượt follow từ {ten}! MC cảm ơn bạn — khách quý như bạn là sảnh cưới đông vui hẳn!', '{ten} follow rồi! MC chúc bạn sớm tìm được người thương để tag lên sân khấu nhé!', '{ten} vừa follow là thành khách thân thiết của sảnh rồi đó! Lần sau vào là MC nhận ra liền.', 'Một cái nhấn follow của {ten} mà MC vui như nhận được thiệp mời vàng. Cảm ơn bạn đã ở lại với phòng!', 'Từ giờ {ten} có thẻ thành viên không cần đóng phí: vào là được chào, ra là được nhớ. Cảm ơn bạn đã follow!', '{ten} follow rồi, duyên với sảnh cưới coi như đã đóng dấu. Chúc bạn sớm có tên trong một lễ thành hôn thật đẹp!', 'MC vừa kết nạp {ten} vào hội bạn thân của sảnh cưới rồi nhé! Cảm ơn bạn đã theo dõi những đám cưới vui này.', 'Cảm ơn {ten} đã follow! Mỗi lượt theo dõi là thêm một vị khách ở lại ăn cưới tới cuối buổi.', '{ten} ơi, follow xong nhớ ghé thường xuyên nhé; sảnh này ngày nào cũng có duyên mới chờ bạn chứng kiến.', 'Nút follow của {ten} nhỏ xíu mà làm cả phòng ấm lên. MC cảm ơn và chúc bạn sớm được tag lên sân khấu!'],
    ghepDoiNgauNhien: true,
    uuTienQuaTang: true,
    choLenSanKhauCoBan: 90, choTuDong: true, choLenSanKhauMin: 20, choLenSanKhauMax: 300, choNguoiGiay: 30,
    choCongMoiCapCho: 15, choCongMoiCapGhep: 8, choMienGhep: 2,
    choNguongVang: 300, choHeSoVang: 0.6, choNguongDong: 1500, choHeSoDong: 1.3,
    hieuUngNgauNhien: true, hieuUngNgauNhienTuGiay: 12, hieuUngNgauNhienDenGiay: 25,
    fxHoaRoiMoiGiay: 10, fxPhaoHoaMoiGiay: 20, fxPhaoGiayMoiGiay: 20, hieuUngThaTim: true, timHieuUngChoGiay: 2, tuGhepDoiKhiRong: true, tuGhepDoiSauGiay: 5, xoayManHinh: false,
    mocTimHieuUng: 10, diemMoiTim: 1, diemTimToiDa: 100, timHoaRoi: 50, timPhaoHoa: 3, timPhaoGiay: 50,
    lenhDoiGioiTinh: true, lenhDoiTrangPhuc: true, doiTrangPhucChoGiay: 5,
    hangChoToiDa: 4, choDoiLanThapGiay: 30,
    bannerY: 30,
    khungTraiX: 0, khungTraiY: 2, khungPhaiX: 0, khungPhaiY: 2, khungHangChoX: 1, khungHangChoY: 1, khungMcX: 0, khungMcY: -6, rongKhungMc: 100, rongThongBao: 100, khungThongBaoX: 0, khungThongBaoY: 0,
    hienBongChat: true, bongChatGiay: 4, bongChatMaxKyTu: 60, bongChatAnKhiTuCamQua: 2,
    tuCamComment: ['vl', 'vcl', 'vkl', 'vãi', 'địt', 'đụ', 'đéo', 'cặc', 'lồn', 'buồi', 'đĩ', 'đm', 'dm', 'đmm', 'dcm', 'đcm', 'cave', 'loz'],
    tuAnToanComment: ['cac'],
    mcTagVang: ['{a} gọi {ten} mà {ten} chưa có trong phòng — MC ghép tạm {a} với {b} cho đỡ trống nhé! {ten} ơi, vào nhanh để làm lễ cùng {a} nào!', '{ten} ơi, {a} đang gọi bạn kìa! MC giữ chỗ sẵn rồi — vào nhanh để thành đôi với {a} nhé!', '{a} tag {ten} nhưng {ten} chưa tới — tạm thời MC se duyên {a} với {b}, {ten} xuất hiện là MC đổi lại ngay!', 'Alo {ten}, có {a} đang chờ bạn ở sảnh cưới! Trong lúc chờ, {a} đứng cặp tạm với {b} nhé!', '{a} nhớ {ten} quá nên MC đành ghép tạm {a} với {b} — {ten} mà vào là có lễ cưới liền đó!', '{ten} chưa vào phòng nên MC mượn tạm {b} đứng cặp với {a} — {ten} ơi, vào nhanh kẻo mất lượt!', '{a} gọi {ten} mà {ten} chưa vào phòng. MC ghép tạm {a} với {b}; {ten} tới là MC trả {a} về đúng người thương ngay!', '{ten} ơi, {a} đang đứng chờ bạn đến mỏi chân rồi! Tạm thời {b} làm bạn đồng hành của {a}; bạn vào nhanh để buổi lễ gọi đúng tên nhé.', 'MC thông báo tìm người: {a} tag {ten} nhưng chưa thấy {ten}. Trong lúc chờ, {a} ghép tạm với {b}; {ten} vào là lên cặp chính thức liền!', '{a} hướng mắt ra cửa chờ {ten} mãi chưa thấy. MC xếp {b} đứng cạnh {a} cho đỡ lẻ; {ten} ơi, vào nhanh kẻo người ta chờ lâu lại đổi ý!'],
    mcMilestone: ['🎉 Sảnh cưới vừa nâng cấp lên {moc}! Càng đông càng đẹp — cảm ơn cả nhà đã tới chung vui!', 'Không khí quá tuyệt vời! Chúng ta đã chạm mốc {moc} rồi mọi người ơi!', 'Đẳng cấp mới rồi cả nhà ơi — sảnh {moc} chính thức mở cửa! Đẹp chưa, đẹp chưa?', 'Nhờ cả nhà chung tay, sảnh cưới đã lên {moc}! MC tự hào về phòng mình quá!', 'Khoảnh khắc này phải ghi nhớ: sảnh cưới đạt mốc {moc}! Cảm ơn từng lượt xem của mọi người!', 'Lên đời rồi! Sảnh {moc} lung linh hơn hẳn — cả nhà ở lại ngắm cho đã nhé!', 'Cánh cửa {moc} đã chính thức mở ra! Cả nhà mình vừa cùng nhau nâng tầm buổi tiệc rồi đó!', '{moc} chào đón tất cả mọi người! Sảnh mới đẹp hơn, sáng hơn, đúng công sức cả phòng cùng chung vui.', 'Khoảnh khắc đổi sảnh tới rồi: {moc} rực rỡ quá! Cảm ơn mỗi vị khách đã góp một lượt xem quý giá.', 'Từ giây này, tiệc cưới diễn ra tại {moc}. Cả nhà ở lại chiêm ngưỡng và rước thêm nhiều cặp đôi lên nhé!'],
    mcSapMoc: [
      'Cả nhà ơi, chỉ còn {con} lượt xem nữa là chạm mốc {moc} — sảnh {sanh} sắp mở rồi! Mọi người chia sẻ live giúp MC nhé!',
      'Sắp rồi, sắp rồi! Còn đúng {con} lượt xem nữa là lên mốc {moc}, sảnh mới sắp xuất hiện — ai chưa vào thì vào nhanh nào!',
      'Mốc {moc} lượt xem ở ngay trước mắt rồi, chỉ thiếu {con} nữa thôi! Cả nhà thả tim và chia sẻ để mở sảnh {sanh} nhé!',
      'Nghe MC nói này: thêm {con} lượt xem nữa là đám cưới mình được lên sảnh {sanh} đó! Rủ bạn bè vào xem chung cho vui nào!',
      'Chuẩn bị đếm ngược nào cả nhà — còn {con} lượt xem nữa là đạt mốc {moc}! Chia sẻ ngay kẻo lỡ khoảnh khắc đổi sảnh nhé!',
      'Sảnh {sanh} đang chờ mở khóa, chỉ còn cách {con} lượt xem nữa thôi! Mỗi người một lượt chia sẻ là tới nơi luôn đó!',
      'Tin vui đây: nhà mình sắp chạm mốc {moc} lượt xem rồi, còn đúng {con} nữa! Người xem càng đông, sảnh càng đẹp — rủ thêm bạn vào nhé!',
      'Còn {con} lượt xem nữa thôi là bùng nổ mốc {moc} — lên sảnh {sanh} lộng lẫy hơn hẳn! Cả nhà cùng đẩy view nào!',
    , 'Đồng hồ view đang chạy thật nhanh: còn {con} lượt nữa là chạm mốc {moc} và mở {sanh}. Cả nhà gọi thêm bạn vào cho kịp khoảnh khắc này!', 'Chỉ thiếu {con} lượt xem nữa thôi! Đạt mốc {moc} là cả phòng được chuyển sang {sanh}; mỗi lượt chia sẻ lúc này đều quý như vàng.', '{sanh} đã thấp thoáng ở cuối thảm đỏ rồi, chỉ còn cách {con} lượt xem. Cùng đẩy tới mốc {moc} nào cả nhà ơi!', 'Nghe rõ chưa cả nhà: còn {con} lượt nữa là nổ mốc {moc} và lên {sanh}. Ai đang xem đừng lặng lẽ, thả tim và chia sẻ ngay nhé!'],
    mcSapMocConLai: 20,
    mcCheGheuChoGiay: 20,
    mcTagDaCoDoi: [
      'ê {a}, {b} đã có đôi rồi, mình không nên phá hoại gia đình nhà người khác nhá!',
      '{a} à, {b} đã có gia đình rồi, bạn nên chọn người khác đi nhé!',
      '{b} là của {c} rồi {a} ơi, chen vào là MC không cứu được đâu!',
      'Ối {a} ơi, {b} đang tay trong tay với {c} kìa, mình chậm chân mất rồi!',
      '{a} dũng cảm thật, dám tag cả {b} — mà {b} là hoa đã có chủ {c} rồi nhé!',
      'Thôi {a} ơi, {b} với {c} đang hạnh phúc, mình đừng làm kỳ đà cản mũi nha!',
      '{a} ơi là {a}, {b} đã yên bề gia thất với {c} rồi, đổi mục tiêu đi nè!',
      'MC nhắc nhẹ {a} nè: chuyện của {b} và {c} đang đẹp, mình đừng chen ngang nha!',
      'Hụt rồi {a} ơi! {b} đã về chung một nhà với {c} rồi, cả nhà tag người khác cho {a} đi!',
      '{a} tag {b} là có gu đấy, tiếc là {b} thuộc về {c} mất rồi!',
      'Ê {a}, {c} đang nhìn kìa! Còn tag {b} nữa là tối nay có người ngủ sofa đó!',
      '{b} đã có đôi rồi, {a} đừng buồn — sảnh cưới còn bao nhiêu người độc thân đang chờ {a} kìa!',
    , '{a} ơi, bước này hơi sai nhạc rồi: {b} đang là một nửa của {c}. Mình quay xe tìm người còn độc thân nhé!', 'MC xin phép nhắc khéo {a}: {b} và {c} đã khóa tim nhau rồi. Đừng gõ cửa nhà có chủ, sảnh còn nhiều cửa đang mở!', '{a} nhanh tay thật, nhưng {b} đã sánh đôi cùng {c}. Thôi thì chúc phúc cho họ rồi mình đi tìm duyên của riêng mình!', 'Tình huống khó xử quá: {a} tag {b}, còn {c} thì là bạn đời của {b} trong sảnh này. {a} đổi mục tiêu đi, MC cổ vũ!', '{b} đã có {c} kề bên rồi, {a} chen vào là thành vai phụ bất đắc dĩ đó. Ngoài kia còn nhiều người đang chờ được tag mà!', 'Thôi {a} đừng buồn, {b} thuộc về {c} là duyên của họ. Biết đâu người hợp với {a} đang đọc bình luận và chờ bạn gọi tên!'],
    musicOn: true, musicVolume: 35, sfxOn: true, sfxVolume: 55,
  });
  initAudio();
  startDemo();
} else if (typeof LiveBridgeClient === 'undefined') {
  /* H10/H10b: mo game khong qua dung goc LiveBridge (copy rieng thu muc
     game, file client 404) -> LiveBridgeClient la undefined, new o duoi
     se nem ReferenceError giua khoi dong (mcRandomLoop/W.handle/__diag/
     initAudio khong chay). Bao ro ly do, ap cau hinh mac dinh tich hop
     san roi mo audio — NPC chay binh thuong qua npcSync trong applyConfig
     (khong can cho config tu LiveBridge). */
  if (window.__diag) window.__diag.uiErr = 'thiếu file livebridge-client.js — chạy bằng cấu hình mặc định';
  applyConfig({ ...DEFAULT_CFG });
  initAudio();
} else {
  // LiveBridgeClient dùng API .on('event'|'chat'|'hello'|'config'|'status'|'block'|'seen')
  // — bản cũ truyền onConfig/onEvent qua opts nên client BỎ QUA hết: live thật sẽ
  // không nhận được config lẫn sự kiện TikTok. URL lấy theo đúng cổng đang mở game.
  const bridgeUrl = 'ws://' + location.hostname + ':' + (location.port || '8787');
  /* H10b: co theo doi config that — qua 8s chua thay thi ap cau hinh
     mac dinh de NPC chay (xem timer sau .connect()). */
  let gotRealConfig = false, fallbackTimer = null;
  const bridge = new LiveBridgeClient({ url: bridgeUrl, game: 'dam-cuoi' });
  if (window.NpcVoice) NpcVoice.attach(bridge);   // MC nói -> báo LiveBridge để voice khán giả tự tắt tiếng
  bridge
    .on('event', handle)
    .on('chat', onChat)
    .on('block', onBlock)
    .on('config', m => { gotRealConfig = true; if (fallbackTimer) clearTimeout(fallbackTimer); applyConfig(m.config); })
    .on('hello', h => { if (h && h.config) { gotRealConfig = true; if (fallbackTimer) clearTimeout(fallbackTimer); applyConfig(h.config); } })
    .on('open', () => { if (window.__diag && window.__diag.stage !== 'config-ok') window.__diag.stage = 'ws-ok'; })
    .on('seen', m => { if (m && m.user) ensureGuest(m.user); })   // thả tim cũng tính là khách đến dự
    .on('reset-scores', resetAll)   // nút "Reset điểm" ở trang quản trị LiveBridge
    .on('status', m => {
      const st = (m && m.tiktok) || {};
      if (st.state === 'live') { say('● LIVE — ' + (st.username ? '@' + st.username : ''), 'ok'); refreshBg(false); }
      else if (st.state === 'error') say('⚠ ' + (st.message || 'Lỗi kết nối TikTok'), 'err');
      else say('Đang chờ kết nối LIVE…', '');
    })
    .connect();
  /* H10b: LiveBridge co nhung 8s van chua tra config (server cham/khong
     tra) -> ap cau hinh mac dinh, NPC chay; config that den muon thi
     applyConfig chay lai va ghi de, npcSync co guard NPC.started nen
     khong spawn trung NPC. */
  fallbackTimer = setTimeout(() => { if (!gotRealConfig) applyConfig({ ...DEFAULT_CFG }); }, 8000);
  setTimeout(initAudio, 300);
}
mcRandomLoop(true);

/* ============ Demo ============ */
function startDemo() {
  const names = ['Xuân Mai', 'Minh Tuấn', 'Thu Hằng', 'Văn Đức', 'Ngọc Anh', 'Hoàng Nam', 'Khánh Linh', 'Tuấn Anh', 'Mỹ Linh', 'Đức Huy', 'Phương Thảo', 'Hải Yến', 'Quốc Bảo', 'Thanh Tùng', 'Bảo Trâm', 'Văn Hải'];
  const users = names.map((n, i) => ({ id: 'demo' + i, nickname: n, avatar: '' }));
  users.forEach((u, i) => setTimeout(() => { ensureGuest(u); greet(u); }, 400 + i * 550));
  const chats = [
    u => ({ user: u, text: '@' + users[(users.indexOf(u) + 3) % users.length].nickname + ' cưới nhau đi' }),
    u => ({ user: u, text: '@' + users[(users.indexOf(u) + 5) % users.length].nickname + ' ơi yêu quá' }),
    () => ({ user: users[Math.floor(Math.random() * users.length)], text: 'pháo hoa đẹp quá' }),
    () => null,
  ];
  let k = 0;
  setInterval(() => {
    const u = users[Math.floor(Math.random() * users.length)];
    const r = Math.random();
    k++;
    if (r < 0.42) { const c = chats[k % chats.length](u); if (c) onChat(c); }
    else if (r < 0.62) handle({ action: 'like', value: 1, count: 1, user: u, source: { kind: 'like' } });
    else if (r < 0.8) handle({ action: 'couple', value: 1, count: 1, user: u, diamonds: [1, 5, 10, 39, 99][Math.floor(Math.random() * 5)], source: { kind: 'gift', giftName: 'Rose' } });
    else handle({ action: 'spotlight', value: 1, count: 1, user: u, source: { kind: 'follow' } });
    demoExtra += Math.floor(rand(6, 18));
    refreshBg(false);
  }, 2600);
  setInterval(() => { demoExtra += Math.floor(rand(30, 90)); refreshBg(false); }, 5000);
}

W.handle = handle; W.chat = onChat; W.parseTag = parseTag; W.peopleApi = P;
if (window.__diag && window.__diag.stage === 'html') window.__diag.stage = 'main-ok';
})();
