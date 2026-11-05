/* ============================================================
   Đám Cưới Online — nhân vật trong KHÔNG GIAN PHÒNG RỘNG (people.js)
   - Phòng cưới lớn hơn màn hình: mỗi người vào phòng nhận 1 vị trí
     trống NGẪU NHIÊN (ghế quanh bàn tiệc hoặc điểm đứng) và ở cố định đó.
   - Giới hạn theo pool vị trí thật (~400 chỗ — xem MAX_PEOPLE, H2).
   - Ghép đôi: (main lia camera tới) → đổi trang phục cưới tại chỗ +
     phóng to + vòng sáng quanh 2 người → đi thảm đỏ lên sân khấu →
     hết giờ quay về vị trí của mình (ngồi cạnh nhau nếu còn chỗ).
   - Vai cô dâu/chú rể phân theo giới tính đoán từ TÊN tiếng Việt.
   ============================================================ */
'use strict';
const P = {};
(window.Wedding = window.Wedding || {}).people = P;
window.Wedding.peopleApi = P;

/* H2: gioi han that = kich thuoc pool vi tri (gan sau khi dung pool xong
   o buildPositions) — pool chi ~400 cho nen phong day o ~400 nguoi chu
   khong phai 2000; spawn vuot qua thi tra null + ghi chan doan. */
let MAX_PEOPLE = 2000;
let poolFullLogged = false;   // chi ghi chan doan phong day 1 lan cho toi khi co cho trong lai
let FLOOR_Y = 44;                // sàn tiệc bắt đầu từ đây (% chiều cao phòng) — THAY THEO KHUNG của từng file nền (P.setBgFile)
let SEAT_TOP = 43.5;             // ghế quanh bàn không vượt lên trên mức này (né bậc thang/sân khấu) — cũng theo khung nền
let Ww = 2700, Hw = 3840;        // kích thước phòng (px) — main cập nhật qua P.resize
let FH = 192;                    // chiều cao nhân vật gốc (px trong phòng)
let box = null;
let stageY = 17.3;               // điểm đứng trên sân khấu (% chiều cao phòng)

const people = new Map();        // id -> person
const couples = [];
/* HANG CHO SAN KHAU CHIA 4 LAN UU TIEN (Nguyen chot 2026-11-05):
   boc len san khau theo thu tu lan 1 -> 2 -> 3 -> 4, lan tren rong moi
   boc lan duoi:
   1 'gift'   — cap co nguoi TANG QUA: trong lan thi xep theo MUC QUA
                CAO NHAT giam dan (Nguyen 2026-11-05) — ai tang cao nhat
                len dau, it nhat xuong cuoi; cung muc thi ai vao hang
                truoc len truoc. Muc qua = mon qua lon nhat (1 lan tang)
                cua cap, ghi o c.giftBest khi bump.
   2 'tag'    — TAG TEN bang @ (va goi ten khong @: cung la chi dinh
                dung nguoi cu the, khong phai ngau nhien)
   3 'random' — BAT CAP NGAU NHIEN tu nguoi choi: lenh chat "ghep doi /
                cuoi" ghep dai, follow MC se duyen, tu ghep khi vang
   4 'npc'    — bat cap NPC (thap nhat, chi de lap cho trong)
   Ghep TU DONG xu ly RIENG o lan 3/4 va chi duoc tao khi ca 4 lan deu
   rong (dieu kien o main.js) — khong bao gio chen ngang lan 1/2. */
const LANE_ORDER = ['gift', 'tag', 'random', 'npc'];
const stageQueues = { gift: [], tag: [], random: [], npc: [] };
function laneOf(c) {
  if (!c) return 'random';
  if (c.giftPriority || c.origin === 'gift') return 'gift';
  if (c.origin === 'tag' || c.origin === 'manual') return 'tag';
  if (c.origin === 'npc') return 'npc';
  if (c.origin === 'autopair') return (c.a.npc || c.b.npc) ? 'npc' : 'random';
  return 'random';   // 'random' / 'follow' / khong ro nguon
}
function queueLen() { let n = 0; for (const l of LANE_ORDER) n += stageQueues[l].length; return n; }
function queueIncludes(c) { return LANE_ORDER.some(l => stageQueues[l].includes(c)); }
function queueRemove(c) {
  for (const l of LANE_ORDER) { const i = stageQueues[l].indexOf(c); if (i >= 0) { stageQueues[l].splice(i, 1); return true; } }
  return false;
}
function queuePush(c, front) {
  queueRemove(c);
  const lane = laneOf(c);
  /* N5 — chong doi: ghi moc vao hang de queueShiftNext biet cap nao
     cho lau (chi ghi lan dau, giu nguyen khi cap duoc day len dau
     hang / xep lai). */
  if (c.enqueuedAt == null) c.enqueuedAt = Date.now();
  if (front || c.giftPriority) stageQueues[lane].unshift(c); else stageQueues[lane].push(c);
  /* Lan qua xep theo muc qua CAO NHAT giam dan (Nguyen 2026-11-05):
     ai tang cao nhat len dau, it nhat xuong cuoi; cung muc thi ai vao
     hang truoc len truoc (sort on dinh). */
  if (lane === 'gift') stageQueues.gift.sort(giftLaneCmp);
  c.lane = lane;
}
/* So sanh 2 cap trong lan qua: muc qua cao nhat (c.giftBest, xu cua
   mon qua lon nhat 1 lan tang) giam dan, cung muc thi vao hang truoc
   thang. */
function giftLaneCmp(a, b) {
  const d = (b.giftBest || 0) - (a.giftBest || 0);
  if (d) return d;
  return (a.enqueuedAt || 0) - (b.enqueuedAt || 0);
}
function queueShiftNext() {
  /* N5 — chong doi: cap o lan thap (random / npc) cho qua nguong aging
     (P.tune.agingMs, mac dinh 30s — config choDoiLanThapGiay, 0 = tat)
     duoc boc TRUOC, ke ca khi lan tren (gift / tag) dang co cap cho — khong
     thi luong qua don dap se cho lan thap doi vinh vien. Lay cap cho lau
     nhat trong 2 lan thap. */
  const now = Date.now();
  let old = null;
  const agingMs = P.tune.agingMs || 0;
  if (agingMs > 0) for (const l of ['random', 'npc']) for (const c of stageQueues[l]) {
    if (now - (c.enqueuedAt || now) > agingMs && (!old || (c.enqueuedAt || 0) < (old.enqueuedAt || 0))) old = c;
  }
  if (old) { queueRemove(old); return old; }
  for (const l of LANE_ORDER) if (stageQueues[l].length) return stageQueues[l].shift();
  return null;
}
function queueOrdered() { const out = []; for (const l of LANE_ORDER) out.push(...stageQueues[l]); return out; }
P.queueSnapshot = function () { const o = {}; for (const l of LANE_ORDER) o[l] = stageQueues[l].map(c => c.key); return o; };
/* M8: CHI 1 VI TRI SAN KHAU (giua) — co che 3 vi tri da chet: chi
   stageSlots[0] bao gio duoc gan, slotPose chi goi voi i=0, SPOTS /
   CARPETS khong cho nao dung. Da grep xac nhan truoc khi xoa. */
const stageSlots = [null];
/* ================= KHUNG SÂN KHẤU / KHÁN ĐÀI CỐ ĐỊNH (xem BG-LAYOUT.md) =================
   Bục vẽ sẵn trong ảnh: mặt bục từ y≈32% (sát vòm hoa) tới y≈42% (mép trước).
   Cặp đôi CHỈ đứng trong vùng an toàn dưới đây — không đè lên bánh cưới
   (x 45–55, y≤35), không chạm 2 cột vòm hoa (x 26–33 & 67–74), bậc thang
   (x 40–60, y 42–46) chỉ đi qua, không đứng lại. */
const STAGE_FRAME = {
  zoneX: [34, 66],        // khoảng x được phép đứng trên bục
  zoneDropMax: 1.6,       // đứng thấp hơn đường lễ tối đa (vẫn trên mặt bục)
  spot: 50,               // M8: tam vi tri cap DUY NHAT: giua san khau (spots[1,2] da xoa)
  pairOff: 1.8,           // M8: nua khoang cach 2 nguoi trong cap (pairOff[1,2] da xoa)
  groomDrop: 0.5,         // chú rể đứng hơi thấp hơn (trước) cô dâu
};
/* M8: SPOTS (3 tam cap) va CARPETS (3 tham do) da xoa — khong cho nao
   dung; tham do giua duy nhat van duoc ve san trong anh nen. */

function rand(a, b) { return a + Math.random() * (b - a); }
function hash(s) { let h = 0; s = String(s || ''); for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h); }
function avatarColor(id) { const hues = [340, 262, 200, 158, 24, 288, 96, 0, 210, 45]; return `hsl(${hues[hash(id) % hues.length]} 65% 45%)`; }
function initials(name) { const w = String(name || '?').trim().split(/\s+/); return ((w[0] || '?')[0] + (w.length > 1 ? w[w.length - 1][0] : '')).toUpperCase(); }
function esc(s) { return String(s || '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch])); }   // L9: them ' -> &#39; cho khop escapeHtml day du

/* ---------- Ảnh chibi: BỘ ĐỒ CƯỚI PHỐI SẴN theo phong cách ----------
   Cô dâu & chú rể của 1 cặp LUÔN mặc cùng 1 BỘ (cùng phong cách) — không bao
   giờ lệch kiểu (cổ/truyền thống phải đi với truyền thống, hiện đại với hiện đại).
   Mỗi khung cảnh (mốc) có 1 danh sách bộ riêng để random, và các cặp đang lên
   sân khấu cùng lúc sẽ tránh trùng bộ với nhau khi còn bộ khác. */
const SETS_BASE = [
  { name: 'Hoàng gia trắng', bride: 'img/bride.png', groom: 'img/groom.png' },
  { name: 'Truyền thống áo dài', bride: 'img/bride2.png', groom: 'img/groom4.png' },
  { name: 'Hồng hiện đại', bride: 'img/bride3.png', groom: 'img/groom3.png' },
  { name: 'Công chúa vàng', bride: 'img/bride4.png', groom: 'img/groom2.png' },
  { name: 'Sapphire đêm', bride: 'img/bride5.png', groom: 'img/groom5.png' },
  { name: 'Tím lavender', bride: 'img/bride6.png', groom: 'img/groom6.png' },
  { name: 'Xanh biển', bride: 'img/bride7.png', groom: 'img/groom7.png' },
  { name: 'Hồng đào', bride: 'img/bride8.png', groom: 'img/groom8.png' },
  { name: 'Xanh mint', bride: 'img/bride9.png', groom: 'img/groom9.png' },
];
const SETS_ROYAL = [
  { name: 'Hoàng gia vàng', bride: 'img/royal-bride1.png', groom: 'img/royal-groom1.png' },
  { name: 'Hoàng gia phượng', bride: 'img/royal-bride2.png', groom: 'img/royal-groom2.png' },
  { name: 'Hoàng gia đỏ vàng', bride: 'img/royal-bride3.png', groom: 'img/royal-groom3.png' },
  { name: 'Hoàng gia bạch kim', bride: 'img/royal-bride4.png', groom: 'img/royal-groom4.png' },
  { name: 'Hoàng gia lục bảo', bride: 'img/royal-bride5.png', groom: 'img/royal-groom5.png' },
  { name: 'Hoàng gia tím', bride: 'img/royal-bride6.png', groom: 'img/royal-groom6.png' },
  { name: 'Hoàng gia hồng vàng', bride: 'img/royal-bride7.png', groom: 'img/royal-groom7.png' },
];
const GUEST_GIRLS = ['img/guest-girl.png', 'img/guest-girl2.png', 'img/guest-girl3.png', 'img/guest-girl4.png', 'img/guest-girl5.png', 'img/guest-girl6.png', 'img/guest-girl7.png'];
const GUEST_BOYS = ['img/guest-boy.png', 'img/guest-boy2.png', 'img/guest-boy3.png', 'img/guest-boy4.png', 'img/guest-boy5.png', 'img/guest-boy6.png'];
[...SETS_BASE, ...SETS_ROYAL].forEach(s => { for (const src of [s.bride, s.groom]) { const im = new Image(); im.src = src; } });
[...GUEST_GIRLS, ...GUEST_BOYS].forEach(src => { const im = new Image(); im.src = src; });
/* Bộ avatar nhỏ làm sẵn cho chip tên (cắt mặt từ chính các nhân vật của
   game, để ở img/avatars/): người chưa có ảnh TikTok thì lấy 1 mặt trong bộ
   này làm ảnh đại diện — theo giới của nhân vật, cố định theo id — thay cho
   hình bóng người trống trơn trước đây (Nguyen chot 2026-11-04). */
const AV_GIRLS = Array.from({ length: 23 }, (_, i) => `img/avatars/av-f${i + 1}.webp`);
const AV_BOYS = Array.from({ length: 22 }, (_, i) => `img/avatars/av-m${i + 1}.webp`);
[...AV_GIRLS, ...AV_BOYS].forEach(src => { const im = new Image(); im.src = src; });
function isGirlFigure(p) {
  if (p.outfit === 'bride') return true;
  if (p.outfit === 'groom') return false;
  if (p.genderFixed) return p.genderFixed === 'F';
  return genderScore(p.user.nickname) > 0 || (genderScore(p.user.nickname) === 0 && hash(p.user.id || p.user.nickname) % 2 === 1);
}
function defAvatarOf(p) {
  const pool = isGirlFigure(p) ? AV_GIRLS : AV_BOYS;
  return pool[hash(p.user.id || p.user.nickname) % pool.length];
}
function defAvatarForUser(user) {
  const gs = genderScore(user.nickname);
  const girl = gs > 0 || (gs === 0 && hash(user.id || user.nickname) % 2 === 1);
  const pool = girl ? AV_GIRLS : AV_BOYS;
  return pool[hash(user.id || user.nickname) % pool.length];
}
/* M14b: pool đồ hoàng gia bật theo CỜ ROYAL của mốc hiện tại (royal >= 1),
   không theo số thứ tự tier nữa — admin thêm/bớt/đổi thứ tự mốc thì mốc
   vàng/hoàng gia vẫn đúng. setTierLevel nhận royal từ main.js (TIERS[tier].royal). */
let tierLevel = 0, tierRoyal = 0;
P.setTierLevel = function (n, royal) { tierLevel = n | 0; tierRoyal = royal | 0; };
function setPool() {
  // Mốc có cờ royal (mốc 100/200 view mặc định): chỉ dùng bộ hoàng gia + bộ trắng chủ lực
  return tierRoyal >= 1 ? [...SETS_ROYAL, SETS_BASE[0]] : SETS_BASE;
}
function pickSet(c) {
  const pool = setPool();
  const used = new Set();
  for (const o of couples) if (o !== c && o.set) used.add(o.set);
  const free = pool.filter(s => !used.has(s));
  const list = free.length ? free : pool;
  return list[Math.abs(hash(c.key)) % list.length];
}

/* ---------- Đoán giới tính theo tên tiếng Việt ----------
   Điểm > 0: nữ · < 0: nam · = 0: không rõ. Tên đệm Thị (nữ) / Văn (nam) mạnh nhất,
   sau đó là tên chính (từ cuối) trong danh sách tên phổ biến. */
const FEMALE_GIVEN = new Set(('thao huong hang trang linh phuong ngoc hong lan hoa mai dao cuc truc quynh chi hanh dung nhung tuyet nguyet thu ha hien hue kieu lien lieu ly my nga ngan nhi nhien oanh quyen sen thuy thuong tien tram trinh tuyen uyen van yen dieu diem bich chau gam').split(' '));
const MALE_GIVEN = new Set(('tuan dung hung cuong manh quan hoang duc hai nam phong son tung kien trung hieu thang vinh long dat tien viet quang huy khoa dang loc phat tai tri khang minh duy trong nghia binh lam vu sang thai thinh toan truong').split(' '));
function normName(s) {
  return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd')
    .replace(/[^a-z\s]/g, ' ').replace(/\s+/g, ' ').trim();
}
function genderScore(name) {
  const w = normName(name).split(' ').filter(Boolean);
  if (!w.length) return 0;
  const given = w[w.length - 1];
  let s = 0;
  /* M1: 'Van' du la ten dem (Van Duc) hay ten chinh (Nguyen Van) thi
     van la dau hieu NAM (-3) — nhan cu 'given === van -> +2 (nu)' nguoc
     ca chu thich 'Van (nam) manh nhat'. Chi tru khi co 'Thi' (nu manh
     hon, vd ten co ca Thi lan Van). */
  if (w.includes('van') && !w.includes('thi')) s -= 3;
  if (w.includes('thi')) s += 3;
  if (FEMALE_GIVEN.has(given)) s += 2;
  if (MALE_GIVEN.has(given)) s -= 2;
  return s;
}
P.guessGender = name => { const s = genderScore(name); return s > 0 ? 'F' : s < 0 ? 'M' : '?'; };

/* ===== Người xem TỰ KHAI giới tính + lệnh đổi trang phục (Nguyen chot) =====
   Nickname lạ/không dấu thì đoán theo tên sai là chuyện thường — người xem gõ
   "nam"/"nữ" là chuẩn nhất: ghi genderFixed (áp đảo điểm đoán tên ở mọi chỗ:
   hình khách, phân vai cô dâu/chú rể, ghép tạm khác giới). Đang có đôi mà
   vai hiện tại ngược với lời khai thì ĐẢO VAI cho cả cặp (trừ khi bạn đời đã
   khai cùng giới — giữ nguyên vai, tránh phá cặp). */
P.declareGender = function (id, g) {
  const p = people.get(id); if (!p) return null;
  p.genderFixed = g;
  let roleSwapped = false;
  if (p.couple) {
    const c = p.couple, isBride = c.bride === p;
    if ((g === 'F') !== isBride) {
      const other = isBride ? c.groom : c.bride;
      if (!other.genderFixed || other.genderFixed !== g) {
        c.bride = g === 'F' ? p : other;
        c.groom = g === 'F' ? other : p;
        roleSwapped = true;
        if (p.outfit === 'bride' || p.outfit === 'groom') {
          setOutfit(p, g === 'F' ? 'bride' : 'groom');
          setOutfit(other, g === 'F' ? 'groom' : 'bride');
        }
      }
    }
  }
  if (p.outfit === 'casual') setOutfit(p, 'casual');   // vẽ lại hình khách theo giới vừa khai
  return { roleSwapped };
};
/* Đổi trang phục: khách độc thân xoay vòng 4 biến thể của giới mình; người có
   đôi thì CẢ CẶP đổi sang bộ đồ cưới phối sẵn khác (luôn khớp nhau, né bộ các
   cặp khác đang mặc) — không bao giờ lẻ bộ/trái phong cách. */
P.cycleOutfit = function (id) {
  const p = people.get(id); if (!p) return null;
  if (p.couple) {
    const c = p.couple, pool = setPool();
    const used = new Set();
    for (const o of couples) if (o !== c && o.set) used.add(o.set);
    const cur = pool.indexOf(c.set);
    let next = null;
    for (let k = 1; k <= pool.length; k++) { const cand = pool[(cur + k) % pool.length]; if (!used.has(cand)) { next = cand; break; } }
    if (!next) next = pool[(cur + 1) % pool.length];
    c.set = next; c.bride.set = next; c.groom.set = next;
    if (c.bride.outfit === 'bride') setOutfit(c.bride, 'bride');
    if (c.groom.outfit === 'groom') setOutfit(c.groom, 'groom');
    return { couple: true, setName: next.name };
  }
  p.guestShift = (p.guestShift || 0) + 1;
  setOutfit(p, 'casual');
  return { couple: false };
};

function figHTML(p) {
  const seed = hash(p.user.id || p.user.nickname);
  let file;
  if (p.outfit === 'bride') file = (p.set || SETS_BASE[seed % SETS_BASE.length]).bride;
  else if (p.outfit === 'groom') file = (p.set || SETS_BASE[seed % SETS_BASE.length]).groom;
  else {
    const pool = isGirlFigure(p) ? GUEST_GIRLS : GUEST_BOYS;
    file = pool[((seed >> 4) + (p.guestShift || 0)) % pool.length];
  }
  return `<img class="chibi" src="${file}" alt="">`;
}
/* Đặt hình cho nhân vật + CANH HỎNG HÌNH: nếu ảnh chibi nạp về mà hỏng
   (naturalWidth = 0 — ví dụ bản lưu đệm trong trình duyệt bị cắt cụt từ
   một lần tải dở lúc mạng/bridge đang nghẽn, nhân vật chỉ còn cái tên mà
   không thấy người, đúng lỗi Nguyen chụp 2026-11-04 16:44) thì tự tải
   lại kèm ?r= để né bản hỏng, tối đa 2 lần; vẫn hỏng thì ghi vào hộp
   chẩn đoán để lần sau nhìn là biết đích danh file nào chết. Ảnh chỉ
   chậm (chưa nạp xong) thì chờ thêm, không tải lại oan. */
function setFigure(p) {
  const fw = p.el.querySelector('.figwrap');
  fw.innerHTML = figHTML(p);
  watchFigure(fw.querySelector('img.chibi'), p);
}
/* KIỂM TRA HÌNH CÓ THẬT SỰ VẼ RA ĐƯỢC KHÔNG — gốc của lỗi "cặp lên sân
   khấu chỉ thấy chip tên + vương miện, không thấy người" (Nguyen chụp
   2026-11-04 19:58, tái hiện trúng phóc trong test): một file PNG bị
   CẮT CỤT giữa chừng lúc tải (bridge/mạng nghẽn giữa buổi live, sprite
   cô dâu/chú rể lại là file nặng nhất 350-630KB) vẫn còn header nguyên
   vẹn nên trình duyệt báo complete + naturalWidth > 0 — cách kiểm tra
   cũ tưởng hình ổn nên KHÔNG BAO GIỜ chữa, nhân vật tàng hình cả buổi
   lễ dù file thử lại là có. Nay vẽ thử hình lên canvas nhỏ rồi soi
   điểm ảnh nửa dưới: hình nguyên vẹn thì nửa dưới luôn có điểm đặc
   (váy/thân/chân); hình cụt chỉ giải mã được vài dòng trên cùng, nửa
   dưới trong suốt -> lộ ngay. main.js dùng chung hàm này qua
   P.imgPaintOk cho preload + dò nền. */
const _paintCv = document.createElement('canvas');
function imgPaintOk(img) {
  try {
    if (!img.naturalWidth || !img.naturalHeight) return false;
    const w = 48, h = Math.max(8, Math.round(48 * img.naturalHeight / img.naturalWidth));
    _paintCv.width = w; _paintCv.height = h;
    const ctx = _paintCv.getContext('2d', { willReadFrequently: true });
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);
    const d = ctx.getImageData(0, (h / 2) | 0, w, h - ((h / 2) | 0)).data;
    for (let i = 3; i < d.length; i += 4) if (d[i] > 12) return true;
    return false;
  } catch (e) { return true; }   // chính khâu kiểm tra mà lỗi -> đừng kết tội hình đang tốt
}
P.imgPaintOk = imgPaintOk;
/* Canh hỏng hình 2.0: ngoài lỗi hẳn (naturalWidth 0) còn bắt cả hình
   CẮT CỤT (vẽ không ra) nhờ imgPaintOk. Chữa theo nấc: tải lại kèm
   ?r= tối đa 2 lần -> vẫn hỏng thì ĐỔI SANG FILE DỰ PHÒNG (cô dâu/chú
   rể dùng bộ flagship SETS_BASE[0] — hai người cùng lùi về một bộ nên
   vẫn khớp nhau; khách dùng file khách khác) -> file dự phòng cũng
   hỏng nốt mới ghi hộp chẩn đoán. Mục tiêu: nhân vật LUÔN có người,
   thà mặc bộ dự phòng còn hơn tàng hình. */
function watchFigure(img, p) {
  if (!img) return;
  const file = img.getAttribute('src');
  let cur = file, busts = 0, waits = 0, swapped = false;
  const fallbackFile = () => {
    if (!p) return null;
    if (p.outfit === 'bride') return SETS_BASE[0].bride;
    if (p.outfit === 'groom') return SETS_BASE[0].groom;
    const pool = isGirlFigure(p) ? GUEST_GIRLS : GUEST_BOYS;
    return pool.find(f => f !== cur) || null;
  };
  const heal = () => {
    if (busts < 2) { busts++; waits = 0; img.src = cur + (cur.includes('?') ? '&' : '?') + 'r=' + busts; setTimeout(check, 1500); return; }
    const fb = fallbackFile();
    if (!swapped && fb && fb !== cur) {
      swapped = true; busts = 0; cur = fb;
      if (window.__diag) window.__diag.errs.push('mat hinh ' + file + ' -> doi du phong ' + fb);
      img.src = fb; setTimeout(check, 1500); return;
    }
    if (window.__diag) { window.__diag.errs.push('mat hinh: ' + file); window.__diag.uiErr = 'Nhân vật mất hình (' + file + ') — thử Ctrl+F5'; }
  };
  const check = () => {
    if (!img.isConnected) return;                        // đã thay hình khác
    if (img.complete) {
      if (img.naturalWidth > 0 && imgPaintOk(img)) return;   // hình ổn THẬT (vẽ ra được, không chỉ có header)
      heal();                                                // complete nhưng hỏng hẳn hoặc bị cắt cụt
    } else if (waits >= 3) heal();
    else { waits++; setTimeout(check, 1800); }
  };
  img.onerror = () => { waits = 3; setTimeout(check, 250); };
  setTimeout(check, 1200);
}
function setOutfit(p, outfit) {
  p.outfit = outfit;
  if (outfit === 'casual') p.set = null;
  setFigure(p);
  p.el.classList.toggle('wedding', outfit !== 'casual');
  p.dirty = true;
  // chưa có ảnh thật thì ảnh đại diện mặc định cũng theo vai/giới hiện tại
  if (!p.user.avatar) {
    const avImg = p.el.querySelector('.chip .av img');
    if (avImg) { const d = defAvatarOf(p); if (!avImg.src.endsWith(d)) avImg.src = d; }
  }
}

/* ---------- Vị trí trong phòng: ghế quanh bàn + điểm đứng ---------- */
const positions = [];            // {x, y, kind, taken}
let freePool = [];
/* ================= KHUNG BÀN CỐ ĐỊNH (chuẩn cho mọi bg sau này) =================
   Bàn tiệc ĐÃ VẼ SẴN trong ảnh toàn cảnh. Mỗi bàn = 1 ellipse (tâm x/y + bán kính
   rx/ry theo % ảnh, lớn dần về cuối phòng theo phối cảnh) — xem BG-LAYOUT.md.
   QUY TẮC CỨNG: nhân vật CHỈ đứng NGOÀI ellipse mặt bàn (ghế quanh bàn đặt chân
   ngoài mép bàn + lề an toàn; lưới điểm đứng cũng né ellipse phồng to) —
   TUYỆT ĐỐI không để chân nhân vật rơi lên mặt bàn. */
/* ============ KHUNG THEO TỪNG FILE NỀN (đo trực tiếp trên tranh bằng lưới %) ============
   Mỗi nền có khung riêng: đường đứng sân khấu (stageY), mép sàn (floorY), mức
   trần của ghế (seatTop) và bảng bàn. Đổi nền -> P.setBgFile nạp khung tương ứng
   -> vị trí/đường đi tự khớp tranh, không lỗi đứng trên bàn vì lệch khung.
   - 'mac-dinh': 6 nền cũ (bg-full + 5 bản recolor) DÙNG CHUNG 1 khung 42 bàn/8
     hàng (đã kiểm: hình học lệch nhau không quá ±0.5%). Khung ước lượng 54 bàn
     trước đó có bàn "ma" + lệch tâm ~3% — gốc của lỗi đứng trên bàn.
   - 'bg-sanh-moi.webp': sảnh mới (bàn vàng lớn, thưa hơn): 28 bàn/7 hàng, sân
     khấu tròn thấp hơn, sàn bắt đầu dưới bậc thang y=50. */
const TABLE_FRAMES = {
  'mac-dinh': {
    stageY: 37.2, floorY: 44, seatTop: 43.5, stripW: 12,
    keepClear: [{ x: 50, y: 44, rx: 11, ry: 2.6 }],   // bậc thang giữa: chỉ đi qua, không đứng
    aisle: { y0: 43, hw: 7.5, slope: 0.13 },   // THẢM ĐỎ GIỮA: dải cấm đứng, mở rộng dần xuống dưới (phối cảnh) — Nguyen yêu cầu 2026-11-04: không ai đứng giữa thảm, chỉ đứng hai bên
    rows: [
      { y: 42.8, rx: 2.6, ry: 1.4, xs: [16.5, 23.5, 30.5, 35.5, 64.5, 69.5, 76.5, 83.5] },
      { y: 46.3, rx: 3.0, ry: 1.6, xs: [12.3, 20.5, 28.5, 71.5, 79.5, 87.7] },
      { y: 50.3, rx: 3.5, ry: 1.9, xs: [9.3, 18.8, 28.3, 71.7, 81.2, 90.7] },
      { y: 54.5, rx: 4.0, ry: 2.2, xs: [4.8, 15.8, 26.3, 73.7, 84.2, 95.2] },
      { y: 59.8, rx: 4.6, ry: 2.6, xs: [0.8, 11.8, 24.3, 75.7, 88.2, 99.2] },
      { y: 67.8, rx: 5.3, ry: 3.0, xs: [5.8, 21, 79, 94.2] },
      { y: 78, rx: 6.1, ry: 3.5, xs: [1.5, 16.5, 83.5, 98.5] },
      { y: 92.3, rx: 7.0, ry: 4.0, xs: [8.3, 91.7] },
    ],
  },
  'bg-sanh-moi.webp': {
    stageY: 42.6, floorY: 50, seatTop: 47.5, stripW: 11,
    keepClear: [{ x: 50, y: 44, rx: 40, ry: 6.5 }],   // toàn bộ vòng bậc thang của bục tròn + thang đỏ giữa: chỉ đi qua, không đứng
    aisle: { y0: 46, hw: 8.5, slope: 0.10 },   // THẢM ĐỎ GIỮA của sảnh hoàng gia: cấm đứng, chỉ đứng hai bên thảm
    rows: [
      { y: 48.5, rx: 3.6, ry: 1.6, xs: [2.5, 13, 76, 87, 97.5] },
      { y: 50.3, rx: 3.7, ry: 1.7, xs: [24, 32.5, 67.5] },
      { y: 53, rx: 4.3, ry: 1.9, xs: [6, 17.5, 28, 72, 82.5, 94] },
      { y: 61.5, rx: 5.0, ry: 2.2, xs: [3, 15, 26.5, 73.5, 85, 97] },
      { y: 69.5, rx: 5.5, ry: 2.6, xs: [11, 24, 76, 89] },
      { y: 78, rx: 6.4, ry: 3.0, xs: [8, 92] },
      { y: 90, rx: 7.5, ry: 3.5, xs: [11, 89] },
    ],
  },
};
let frameId = 'mac-dinh';
let PAINTED_TABLES = [];
let KEEP_CLEAR = [];
let AISLE = null;
function applyFrameTables() {
  PAINTED_TABLES = [];
  for (const r of TABLE_FRAMES[frameId].rows) for (const x of r.xs) PAINTED_TABLES.push({ x, y: r.y, rx: r.rx, ry: r.ry });
  KEEP_CLEAR = TABLE_FRAMES[frameId].keepClear || [];
  AISLE = TABLE_FRAMES[frameId].aisle || null;
}
/* Nửa bề rộng thảm đỏ giữa ở độ cao y (mở rộng dần khi xuống thấp — phối cảnh) */
function aisleHW(y) { return AISLE ? AISLE.hw + Math.max(0, y - AISLE.y0) * AISLE.slope : 0; }
/* (x,y) có nằm TRÊN thảm đỏ giữa không — vùng này chỉ để đi qua/làm lối lên
   sân khấu, tuyệt đối không cấp chỗ đứng (Nguyen vẽ 2 vòng đen ở hai dải thảm
   bên và yêu cầu ưu tiên đứng ở đó, thảm giữa để trống). */
function inAisle(x, y) {
  if (!AISLE || y < AISLE.y0) return false;
  return Math.abs(x - 50) < aisleHW(y);
}
applyFrameTables();
/* Vùng cấm đứng (bậc thang / vòng bậc của bục): nhân vật chỉ ĐI QUA, không
   được cấp vị trí đứng ở đó — chủ phòng không muốn ai đứng gần bậc thang */
function inKeepClear(x, y) {
  for (const z of KEEP_CLEAR) {
    const dx = (x - z.x) / z.rx, dy = (y - z.y) / z.ry;
    if (dx * dx + dy * dy < 1) return true;
  }
  return false;
}
/* Điểm (x,y) có rơi vào ellipse của bàn nào không (phồng thêm mx/my %)? self = bàn được bỏ qua */
function inTable(x, y, mx, my, self) {
  for (const t of PAINTED_TABLES) {
    if (t === self) continue;
    const dx = (x - t.x) / (t.rx + mx), dy = (y - t.y) / (t.ry + my);
    if (dx * dx + dy * dy < 1) return true;
  }
  return false;
}

function buildPositions() {
  positions.length = 0;
  const tables = PAINTED_TABLES;
  // Lọc chống đè: 1 vị trí chỉ được nhận nếu không quá sát vị trí đã nhận trước
  // đó — ghế của 2 hàng bàn kề nhau (hoặc 2 bàn kề nhau) trước đây có điểm gần
  // như trùng hẳn, người ngồi sau bị người trước che khuất hoàn toàn.
  const farEnough = (x, y) => {
    for (const q of positions) if (Math.abs(q.x - x) < 2.0 && Math.abs(q.y - y) < 1.5) return false;
    return true;
  };
  for (const t of tables) {
    for (let k = 0; k < 6; k++) {
      const a = k / 6 * Math.PI * 2 + 0.26;
      // Ghế: chân đứng NGOÀI mép bàn + lề an toàn (1.7% ngang, 1.3% dọc)
      const sx = t.x + Math.cos(a) * (t.rx + 1.7);
      const sy = Math.max(SEAT_TOP, t.y + Math.sin(a) * (t.ry + 1.3));
      if (sx < 1 || sx > 99) continue;   // H1: ghe ngoai phong (x<1 hoac x>99) thi bo, nhu da kep sy bang SEAT_TOP — truoc day ghe kieu nay dung ngoai khung/mat nguoi
      const ownX = (sx - t.x) / (t.rx + 0.9), ownY = (sy - t.y) / (t.ry + 0.7);
      if (ownX * ownX + ownY * ownY < 1) continue;   // SEAT_TOP kéo ghế lọt vào chính bàn của nó -> bỏ
      if (inTable(sx, sy, 0.9, 0.7, t)) continue;   // ghế này lại chui vào bàn bên cạnh -> bỏ
      if (inKeepClear(sx, sy)) continue;            // ghế rơi vào vùng bậc thang -> bỏ
      if (inAisle(sx, sy)) continue;                // ghế rơi lên thảm đỏ giữa -> bỏ (thảm giữa để trống)
      if (!farEnough(sx, sy)) continue;             // ghế này đè lên ghế đã nhận -> bỏ
      positions.push({ x: sx, y: sy, kind: 'seat', taken: null, frame: frameId });
    }
  }
  // Lưới điểm đứng: hàng LẺ xô ngang nửa bước (so le như gạch) để người hàng sau
  // không bị người hàng trước che khuất hẳn; bước lưới rộng hơn trước và điểm
  // đứng quá sát ghế quanh bàn cũng bỏ — giảm hẳn cảnh nhân vật đè lên nhau.
  let grow = 0;
  for (let gy = FLOOR_Y + 2.4; gy <= 98.4; gy += 2.1, grow++)
    for (let gx = 3.6 + (grow % 2 ? 1.3 : 0); gx <= 96.5; gx += 2.55) {
      const x = gx + rand(-0.5, 0.5), y = gy + rand(-0.35, 0.35);
      if (inTable(x, y, 1.8, 1.4, null)) continue;   // điểm đứng cũng né mặt bàn + lề
      if (inKeepClear(x, y)) continue;              // điểm đứng cũng né vùng bậc thang
      if (inAisle(x, y)) continue;                  // điểm đứng cũng né thảm đỏ giữa — chỉ đi qua
      if (!farEnough(x, y)) continue;               // quá sát ghế/điểm đã nhận -> bỏ
      positions.push({ x, y, kind: 'stand', taken: null, frame: frameId });
    }
  // Ưu tiên THEO Ý CHỦ PHÒNG (2026-11-04): gần SÂN KHẤU/SẢNH nhất trước —
  // vùng trọng tâm là hai dải hai bên thảm đỏ giữa (chỗ Nguyen khoanh vòng
  // đen), khách mới đứng ở TRÊN cho khỏi lia cam xa; chỉ khi phòng đông,
  // hết chỗ gần mới tràn xuống dưới và ra xa. Trước đây ghế quanh bàn được
  // ưu tiên tuyệt đối (+0/+1000) cộng jitter lớn (0..14) nên khách bị rải
  // xuống tận bàn cuối phòng dù phía trên còn trống. Nay: khoảng cách tới
  // điểm ngay dưới sân khấu là chính (trọng số dọc 1.5), ghế chỉ hơn điểm
  // đứng tự do một chút (+5), jitter nhỏ (0..3) cho thứ tự khỏi méo.
  /* DẢI ƯU TIÊN HAI BÊN THẢM (Nguyen vẽ khung đen trên ảnh 2026-11-04
     19:36): hai dải sàn ôm sát thảm đỏ giữa, từ dưới sân khấu xuống tận
     cuối sảnh, là khu vực khách đứng được ƯU TIÊN số 1. Cách điền vòng
     tròn quanh sân khấu + rải đều toàn sảnh trước đây làm hai dải này
     bị "trên đông, dưới lẻ tẻ, GIỮA TRỐNG QUẮC" (chữ của chủ phòng).
     Nay: vị trí trong dải được lấy TRƯỚC mọi vị trí khác, theo thứ tự
     CHIA ĐÔI KHOẢNG DỌC lớn nhất (điểm giữa dải trước, rồi điểm giữa
     các nửa...) và xen kẽ trái/phải — ở bất kỳ số khách nào, người
     cũng trải đều suốt chiều dài hai dải, đoạn giữa không bao giờ
     trống. stripW = bề rộng dải tính từ mép thảm ra ngoài (%). */
  const stripW = (TABLE_FRAMES[frameId] && TABLE_FRAMES[frameId].stripW) || 12;
  for (const p of positions) {
    const dEdge = Math.abs(p.x - 50) - aisleHW(p.y);
    p.strip = p.y >= FLOOR_Y + 1 && p.y <= 98.6 && dEdge > 0.5 && dEdge <= stripW;
  }
  const sideSeq = [0, 1].map(side => {
    const arr = positions.filter(q => q.strip && (side === 0 ? q.x < 50 : q.x >= 50)).sort((a, b) => a.y - b.y || a.x - b.x);
    const seq = [], ranges = [[0, arr.length - 1]];
    while (ranges.length) {
      const [lo, hi] = ranges.shift();
      if (lo > hi) continue;
      const mid = (lo + hi) >> 1;
      seq.push(arr[mid]); ranges.push([lo, mid - 1], [mid + 1, hi]);
    }
    return seq;
  });
  const stripOrder = new Map();
  for (let i = 0, n = Math.max(sideSeq[0].length, sideSeq[1].length); i < n; i++) {
    if (sideSeq[0][i]) stripOrder.set(sideSeq[0][i], stripOrder.size);
    if (sideSeq[1][i]) stripOrder.set(sideSeq[1][i], stripOrder.size);
  }
  const fillKey = p => Math.hypot(p.x - 50, (p.y - (FLOOR_Y + 1)) * 1.5) + (p.kind === 'seat' ? 0 : 5) + rand(0, 3);
  for (const p of positions) p.key = p.strip ? stripOrder.get(p) : 1000 + fillKey(p);
  freePool = positions.slice().sort((p1, p2) => p1.key - p2.key);
  freePool.forEach((p, i) => { p.rank = i; });   // rank 0 = chỗ đẹp nhất (trong cùng, gần sân khấu)
  MAX_PEOPLE = positions.length;   // H2: gioi han that = pool vua dung xong (mac-dinh ~405, sanh-moi ~361), khong phai 2000
  return tables;
}
/* RẢI ĐỀU KHI ĐÔNG NGƯỜI (Nguyen yêu cầu 2026-11-04 17:53): từ SPREAD_MIN
   khách trở đi, chỗ mới không lấy sát sân khấu nữa mà lấy chỗ CÁCH XA các
   chỗ đã có người nhất — hết cảnh khách dính trùm một khu, khu khác trống. */
const SPREAD_MIN = 26;   // số khách bắt đầu rải đều
const SPREAD_CAP = 16;   // bán kính cách ly tính điểm tối đa (% bề ngang sảnh) — xa hơn nữa coi như bằng nhau
function takePosition() {
  while (freePool.length && freePool[0].taken) freePool.shift();   // dọn chỗ đã bị lấy còn sót ở đầu pool
  if (!freePool.length) return null;
  if (people.size >= SPREAD_MIN) {
    /* Điểm của 1 chỗ trống = khoảng cách tới chỗ CÓ NGƯỜI gần nhất (càng xa
       càng tốt, chững ở SPREAD_CAP) trừ ưu thế gần sân khấu theo key. Chỗ
       thắng cuộc vừa rải đều vừa hơi thiên về phía sân khấu. */
    /* M13a: lay danh sach cho DA CO NGUOI 1 lan truoc vong lap — truoc
       day moi slot trong lai quet het positions (O(n^2)); diem so giong
       het (khoang cach toi cho co nguoi gan nhat). */
    const taken = positions.filter(q => q.taken);
    let best = null, bestScore = -Infinity;
    const stripFree = freePool.some(q => !q.taken && q.strip);   // dải ưu tiên còn chỗ -> rải đều CHỈ trong dải
    for (const pos of freePool) {
      if (pos.taken) continue;
      if (stripFree && !pos.strip) continue;
      let md = Infinity;
      for (const q of taken) {
        const dx = pos.x - q.x, dy = (pos.y - q.y) * 1.3;
        const d = dx * dx + dy * dy;
        if (d < md) md = d;
      }
      const score = Math.min(md, SPREAD_CAP * SPREAD_CAP) - pos.key * 0.5;
      if (score > bestScore) { bestScore = score; best = pos; }
    }
    if (best) { freePool.splice(freePool.indexOf(best), 1); return best; }
  }
  return freePool.shift();   // phòng còn vắng: lấy từ GẦN sân khấu trước (đầu mảng đã sắp xếp)
}
/* PHÒNG VẮNG: chỗ trống GẦN TÂM KHUNG HÌNH MẶC ĐỊNH NHẤT (giữa phòng, ngay
   trước sân khấu — đúng vùng camera nhà đang ngắm) để khách mới vào là thấy
   ngay trên hình, thay vì lấy theo thứ tự gần-sân-khấu có thể lệch sang hai
   bên cánh. Chỉ dùng khi tổng số khách < tune.quietMax. */
function takeCentralPosition() {
  const fy = (typeof FLOOR_Y === 'number' ? FLOOR_Y : 44) + 4;
  // Tâm ưu tiên KHÔNG nằm trên thảm đỏ giữa (đã cấm đứng) mà là 2 điểm hai
  // bên thảm, ngay dưới sân khấu — đúng vùng trọng tâm chủ phòng khoanh.
  const off = aisleHW(fy) + 5;
  const fxs = [50 - off, 50 + off];
  let bi = -1, bd = Infinity;
  for (let i = 0; i < freePool.length; i++) {
    const pos = freePool[i];
    if (pos.taken) continue;
    const d = Math.min((pos.x - fxs[0]) * (pos.x - fxs[0]), (pos.x - fxs[1]) * (pos.x - fxs[1])) + (pos.y - fy) * (pos.y - fy);
    if (d < bd) { bd = d; bi = i; }
  }
  return bi < 0 ? null : freePool.splice(bi, 1)[0];
}
/* Có cặp nào đang trong hành trình làm lễ không (ghép xong chờ / đang chờ
   lên / đang đi lên / đang trên sân khấu) — main.js dùng để biết lúc nào
   KHÔNG được lia cam đi ngắm khách mới. */
P.stageBusy = function () {
  for (const c of couples) {
    if (c.state === 'focus' || c.state === 'queue' || c.state === 'toStage' || c.state === 'stage') return true;
  }
  return false;
};
/* Cặp đang diễn "non" nhất đã đứng được bao nhiêu giây (Infinity nếu
   không có cặp nào trên sân khấu) — main.js dùng để KHÓA TÂM ĐIỂM
   camera: chưa đứng đủ 5-6s thì camera không được rời sân khấu. Cặp
   đang "đứng chờ" (hold, timer = 0) tính như đã đứng đủ lâu. */
P.stageFreshSec = function () {
  let m = Infinity;
  for (const c of couples) {
    if (c.state !== 'stage') continue;
    const performed = c.hold ? 1e9 : (P.coupleSec || 25) - Math.max(0, c.timer != null ? c.timer : 0);
    if (performed < m) m = performed;
  }
  return m;
};
/* Trả chỗ về pool theo ĐÚNG thứ tự ưu tiên (chèn nhị phân theo key) — chỗ trong
   vừa trống ra phải được khách tới sau lấy trước, không chìm xuống cuối hàng. */
function freePosition(pos) {
  if (!pos || !pos.taken) return;
  pos.taken = null;
  if (pos.frame !== frameId) return;   // chỗ thuộc khung nền cũ -> bỏ hẳn, không cho tái sử dụng ở nền mới
  let lo = 0, hi = freePool.length;
  while (lo < hi) { const mid = (lo + hi) >> 1; if (freePool[mid].key < pos.key) lo = mid + 1; else hi = mid; }
  freePool.splice(lo, 0, pos);
}
/* "Khu vực bên trong" = phần đầu của thứ tự ưu tiên (gần sân khấu nhất) */
function isInner(pos) { return !!pos && pos.rank != null && pos.rank < positions.length * (P.tune && P.tune.innerRatio || 0.45); }

/* ---------- Tìm đường vòng quanh bàn (lưới ô + BFS) ----------
   Đoạn thẳng bị bàn chắn thì rẽ qua các ô trống (hành lang thảm đỏ x 43–57 luôn
   thông). Chỉ tính 1 lần khi bắt đầu đi, không tính mỗi khung hình. */
const GRID = { x0: 1.2, y0: 43.2, dx: 1.23, dy: 1.24, nx: 80, ny: 46 };
function buildBlocked() {
  const s = new Set();
  for (let cy = 0; cy < GRID.ny; cy++) for (let cx = 0; cx < GRID.nx; cx++)
    if (inTable(GRID.x0 + cx * GRID.dx, GRID.y0 + cy * GRID.dy, 0.85, 0.6, null)) s.add(cx + ',' + cy);
  return s;
}
let BLOCKED = buildBlocked();
function segClear(x1, y1, x2, y2) {
  const d = Math.hypot(x2 - x1, y2 - y1), steps = Math.max(1, Math.ceil(d / 0.8));
  for (let i = 1; i < steps; i++) { const t = i / steps; if (inTable(x1 + (x2 - x1) * t, y1 + (y2 - y1) * t, 0.85, 0.6, null)) return false; }
  return true;
}
function nearestCell(x, y) {
  let cx = Math.max(0, Math.min(GRID.nx - 1, Math.round((x - GRID.x0) / GRID.dx)));
  let cy = Math.max(0, Math.min(GRID.ny - 1, Math.round((y - GRID.y0) / GRID.dy)));
  if (!BLOCKED.has(cx + ',' + cy)) return [cx, cy];
  for (let r = 1; r < 8; r++) for (let ax = cx - r; ax <= cx + r; ax++) for (let ay = cy - r; ay <= cy + r; ay++)
    if (ax >= 0 && ay >= 0 && ax < GRID.nx && ay < GRID.ny && !BLOCKED.has(ax + ',' + ay)) return [ax, ay];
  return [cx, cy];
}
function routeAround(x1, y1, x2, y2) {
  if (segClear(x1, y1, x2, y2)) return [];
  const [sx, sy] = nearestCell(x1, y1), [tx, ty] = nearestCell(x2, y2);
  const key = (x, y) => x + ',' + y;
  const prev = new Map([[key(sx, sy), null]]); const q = [[sx, sy]]; let qi = 0;   // M13b: con tro index thay q.shift() (shift tren mang dai la O(n) moi lan)
  while (qi < q.length) {
    const [cx, cy] = q[qi++];
    if (cx === tx && cy === ty) break;
    for (const [ax, ay] of [[cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]]) {
      if (ax < 0 || ay < 0 || ax >= GRID.nx || ay >= GRID.ny) continue;
      const k = key(ax, ay); if (prev.has(k) || BLOCKED.has(k)) continue;
      prev.set(k, [cx, cy]); q.push([ax, ay]);
    }
  }
  if (!prev.has(key(tx, ty))) return [];
  const cells = []; let cur = [tx, ty];
  while (cur) { cells.push(cur); cur = prev.get(key(cur[0], cur[1])); }
  cells.reverse();
  const cellPt = c => ({ x: GRID.x0 + c[0] * GRID.dx, y: GRID.y0 + c[1] * GRID.dy });
  const pts = []; let from = { x: x1, y: y1 }, i = 0;
  while (i < cells.length) {
    let j = cells.length - 1;
    while (j > i && !segClear(from.x, from.y, cellPt(cells[j]).x, cellPt(cells[j]).y)) j--;
    if (j === cells.length - 1 && segClear(from.x, from.y, x2, y2)) break;   // nhìn thẳng tới đích được rồi
    pts.push(cellPt(cells[j])); from = cellPt(cells[j]); i = j + 1;
  }
  return pts;
}

/* ---------- Di chuyển (tính theo px trong phòng, tốc độ theo quãng đường) ---------- */
function walkPath(p, points, state, done) {
  const routed = [];
  let px = p.x, py = p.y;
  for (const q of points) {
    if (py > SEAT_TOP - 2 && q.y > SEAT_TOP - 2) routed.push(...routeAround(px, py, q.x, q.y));
    routed.push(q); px = q.x; py = q.y;
  }
  p.path = routed.slice(); p.state = state || 'walk'; p.done = done || null;
  p.target = p.path[0] || null;
  let total = 0; px = p.x; py = p.y;
  for (const q of routed) { total += Math.hypot((q.x - px) / 100 * Ww, (q.y - py) / 100 * Hw); px = q.x; py = q.y; }
  p.speedPx = Math.max(170, Math.min(780, total / 4.2));
  if (p.target) p.faceLeft = p.target.x < p.x;
  p.dirty = true;
}
function walkTo(p, pt, state, done) { walkPath(p, [pt], state, done); }
function stepPerson(p, dt) {
  if (!p.target) return;
  const dxPx = (p.target.x - p.x) / 100 * Ww, dyPx = (p.target.y - p.y) / 100 * Hw;
  const dist = Math.hypot(dxPx, dyPx);
  if (dist < 6) {
    p.x = p.target.x; p.y = p.target.y;
    p.path.shift();
    if (p.path.length) { p.target = p.path[0]; p.dirty = true; return; }
    p.target = null;
    const done = p.done; p.done = null;
    if (p.state !== 'stage') p.state = p.couple ? p.state : 'home';
    p.idleFor = rand(5, 14);
    p.dirty = true;
    if (done) done();
    /* M5: callback 've toi nha' cua leaveStage nam rieng o p.homeDone,
       KHONG nam trong p.done — walkPath/walkTo/makeCouple co ghi de
       p.done bao nhieu lan thi no van con; chi chay khi nguoi that su
       ve toi dung home cua minh (di len san khau/di cho khac khong
       chay). */
    const homeDone = p.homeDone;
    if (homeDone && p.home && Math.abs(p.x - p.home.x) < 0.01 && Math.abs(p.y - p.home.y) < 0.01) { p.homeDone = null; homeDone(); }
    return;
  }
  const step = Math.min(dist, p.speedPx * dt);
  let nx = p.x + dxPx / dist * step / Ww * 100;
  let ny = p.y + dyPx / dist * step / Hw * 100;
  /* Lớp bảo hiểm mỏng: không bao giờ để chân lọt vào mặt bàn thật (lề chỉ 0.1).
     Việc né bàn chủ yếu do TÌM ĐƯỜNG trong walkPath đảm nhiệm — lớp đẩy lề to
     trước đây tự tạo bẫy: 2 bàn kề nhau phồng lề chồng lên nhau bịt kín lối đi,
     nhân vật bị đẩy qua lại và kẹt thành đống ở khe bàn. */
  if (ny > FLOOR_Y - 2) {
    for (const t of PAINTED_TABLES) {
      const ex = t.rx + 0.12, ey = t.ry + 0.1;
      const qx = (nx - t.x) / ex, qy = (ny - t.y) / ey;
      const q = qx * qx + qy * qy;
      if (q < 1 && q > 1e-6) { const s = 1 / Math.sqrt(q); nx = t.x + qx * s * ex; ny = t.y + qy * s * ey; }
    }
  }
  p.x = nx; p.y = ny;
  p.faceLeft = dxPx < -4 ? true : dxPx > 4 ? false : p.faceLeft;
  p.dirty = true;
}

function render(p) {
  const X = p.x / 100 * Ww, Y = p.y / 100 * Hw;
  const depth = 0.8 + Math.max(0, Math.min(1, (p.y - FLOOR_Y) / 62)) * 0.38;
  const stMul = (p.state === 'stage' || p.state === 'toStage') ? (p.spotScale || 1.18) : 1;
  if (p.boostCur == null) p.boostCur = p.boost || 1;
  p.boostCur += ((p.boost || 1) - p.boostCur) * 0.13;   // phóng to/thu nhỏ cũng phải mượt, không nhảy cóc
  if (Math.abs((p.boost || 1) - p.boostCur) > 0.01) p.dirty = true;
  const fh = FH * depth * stMul * p.boostCur;
  p.el.style.transform = `translate(${X.toFixed(1)}px,${Y.toFixed(1)}px) translate(-50%,-100%)`;
  // z theo chiều sâu + zSeed cố định của từng người: hai người ngang tầm sâu không
  // đổi lớp qua lại từng khung hình (hiện tượng chớp ẩn/hiện khi đứng sát nhau)
  p.el.style.zIndex = Math.round(Y) * 8 + (p.zSeed || 0) + (p.boost > 1 ? 60000 : 0);
  p.el.style.setProperty('--fh', fh.toFixed(0) + 'px');
  p.el.classList.toggle('flip', !!p.faceLeft);
  p.el.classList.toggle('walking', !!p.target);
  p.dirty = false;
}

/* ---------- Vòng lặp chính ---------- */
let lastT = 0;
function loop(t) {
  requestAnimationFrame(loop);
  const dt = Math.min(0.05, lastT ? (t - lastT) / 1000 : 0.016); lastT = t;
  for (const p of people.values()) {
    if (p.target) stepPerson(p, dt);
    else if (p.state === 'home' && !p.couple) {
      p.idleFor -= dt;
      if (p.idleFor <= 0) {
        p.idleFor = rand(6, 15);
        if (Math.random() < 0.13) {           // thỉnh thoảng đổi sang vị trí trống gần đó
          const np = positions.find(q => !q.taken && Math.abs(q.x - p.x) < 11 && Math.abs(q.y - p.y) < 7 && q !== p.home);
          if (np) { freePosition(p.home); np.taken = p; p.home = np; walkTo(p, { x: np.x, y: np.y }, 'walk'); }
        }
      }
    }
    if (p.dirty || p.target) render(p);
  }
  for (const c of couples) {
    if (c.state !== 'stage' || c.hold) continue;
    const total = P.coupleSec || 25;
    const perfBefore = total - Math.max(0, c.timer);
    c.timer -= dt;
    /* Vừa chạm mốc đứng đủ releaseSec -> gọi promoteStage NGAY trong
       nhịp đồng hồ game. Trước đây chỉ trông vào setTimeout ở
       arriveStage (chạy theo giờ tường): khi máy bận, dt của game bị
       kẹp nên đồng hồ game chậm hơn giờ tường, hẹn giờ gọi tới mà cặp
       đang diễn mới đứng được <6s theo giờ game -> bị cổng nhịp chặn,
       và không còn ai gọi lại cho tới lúc cặp đó xuống hẳn (bắt gặp ở
       testpacing: cặp sau phải chờ đủ 15s thay vì được nhả ở 6s). */
    if (perfBefore < (P.releaseSec || 6) && total - Math.max(0, c.timer) >= (P.releaseSec || 6)) promoteStage();
    if (c.timer <= 0) {
      /* Hết giờ đứng (coupleSec) nhưng phòng đang TRỐNG LỊCH — không cặp
         nào đang chờ, cũng không cặp nào đang đi lên: cho cặp này ĐỨNG
         TIẾP trên sân khấu thay vì bắt xuống (Nguyen chốt 2026-11-04
         18:31) — sân khấu không bị bỏ trống vô ích; họ chỉ đi xuống khi
         có cặp khác LÊN TỚI NƠI (xem arriveStage). */
      const anyWaiting = queueLen() > 0 || couples.some(o => o !== c && o.state === 'toStage');
      if (anyWaiting) leaveStage(c);
      else { c.hold = true; c.timer = 0; }
    }
  }
}

/* ---------- Sinh nhân vật ---------- */
function makeEl(user) {
  const el = document.createElement('div');
  el.className = 'person';
  /* Avatar canh ten: uu tien ANH THAT cua nguoi choi (URL TikTok). Chua co
     anh that thi lay 1 mat trong BO AVATAR LAM SAN cua game (cat tu nhan vat
     cua game, theo gioi + co dinh theo id) — khong de vong tron trong/bong
     nguoi nua. Anh that tai loi thi cung tu lui ve avatar mac dinh nay. */
  const av = user.avatar
    ? `<span class="av" style="background-color:${avatarColor(user.id)}"><img src="${esc(user.avatar)}" alt="" onerror="this.onerror=null;this.src='${defAvatarForUser(user)}'"></span>`
    : `<span class="av" style="background-color:${avatarColor(user.id)}"><img src="${defAvatarForUser(user)}" alt=""></span>`;
  el.innerHTML = `<div class="figwrap"></div><div class="chip">${av}<span class="nm">${esc(user.nickname)}</span></div>`;
  return el;
}
/* Cap nhat ANH THAT vao chip ten bat cu luc nao anh ve duoc: nhieu nguoi
   duoc spawn boi mot su kien chua kem anh (hoac anh chi xuat hien o su kien
   sau), truoc day chip giu nguyen dang mac dinh mai mai du cac su kien sau
   da co anh. main.js register() goi ham nay sau moi lan gop thong tin. */
P.setAvatar = function (id, url) {
  const p = people.get(id);
  if (!p || !url || p.user.avatar === url) return;
  p.user.avatar = url;
  const chip = p.el.querySelector('.chip');
  if (!chip) return;
  const span = document.createElement('span');
  span.className = 'av';
  span.style.backgroundColor = avatarColor(id);
  span.innerHTML = `<img src="${esc(url)}" alt="" onerror="this.onerror=null;this.src='${defAvatarOf(p)}'">`;
  const old = chip.querySelector('.av');
  if (old) old.replaceWith(span); else chip.prepend(span);
};
/* Bong chat tren dau nhan vat: main.js da loc noi dung truoc khi goi.
   Comment moi ghi de comment cu va dem lai thoi gian an. */
P.say = function (id, text, sec) {
  const p = people.get(id);
  if (!p || !p.el || !text) return;
  if (!p.bubbleEl) {
    p.bubbleEl = document.createElement('div');
    p.bubbleEl.className = 'bubble';
    p.el.appendChild(p.bubbleEl);
  }
  p.bubbleEl.textContent = text;
  p.bubbleEl.classList.add('on');
  clearTimeout(p.bubbleT);
  p.bubbleT = setTimeout(() => { if (p.bubbleEl) p.bubbleEl.classList.remove('on'); }, (sec || 4) * 1000);
};
P.spawn = function (user) {
  if (!user || !user.id) return null;
  const old = people.get(user.id);
  if (old) return old;
  if (people.size >= MAX_PEOPLE) {   // H2: pool can — bao ro thay vi tra null lang le (chi ghi 1 lan toi khi co cho trong lai)
    if (!poolFullLogged) { poolFullLogged = true; diagErr('phong day: het cho dung (' + people.size + '/' + MAX_PEOPLE + ') — khach ' + (user.nickname || user.id) + ' vao khong co cho'); }
    return null;
  }
  poolFullLogged = false;
  /* Phòng vắng (dưới ngưỡng quietMax): ưu tiên chỗ TRỌNG TÂM cho khách mới */
  let home = null;
  if ((P.tune.quietMax || 0) > 0 && people.size < P.tune.quietMax) home = takeCentralPosition();
  if (!home) home = takePosition();
  if (!home) {   // H2: pool can (khong con slot trong) — bao ro thay vi tra null lang le
    if (!poolFullLogged) { poolFullLogged = true; diagErr('phong day: het cho dung (pool can, ' + people.size + '/' + MAX_PEOPLE + ') — khach ' + (user.nickname || user.id) + ' vao khong co cho'); }
    return null;
  }
  /* ƯU TIÊN KHÁCH MỚI KHI ĐÔNG NGƯỜI (yêu cầu của chủ phòng): khách vừa tới mà
     chỉ còn chỗ ngoài, trong khi khách im lặng rất lâu (kiểu đã out mà live
     không bắt được sự kiện rời đi) đang giữ chỗ trong -> ĐỔI CHỖ: khách mới
     vào thẳng chỗ trong, khách im lặng lùi ra chỗ ngoài làm nền phụ hoạ. */
  if (P.tune.priorityOn && people.size >= (P.tune.crowdMin || 70) && !isInner(home)) {
    const stale = findStaleInner();
    if (stale) {
      const inner = stale.home;
      stale.home = home; home.taken = stale;
      walkTo(stale, { x: home.x, y: home.y }, 'walk', () => { stale.state = 'home'; });
      home = inner;
    }
  }
  const p = {
    user, npc: !!user.npc,   // M16: co NPC phai set NGAY tai spawn — coupleScore dua hoan toan vao p.npc, truoc day chi ensureGuest (main.js) set nen duong spawn NPC moi la diem/BXH bi nhiem
    el: makeEl(user), x: home.x + rand(-2.4, 2.4), y: 99.4, home, outfit: 'casual',
    state: 'walk', target: null, path: [], done: null, faceLeft: false,
    couple: null, idleFor: rand(2, 9), boost: 1, spotScale: 1, dirty: true, speedPx: 200,
    zSeed: Math.abs(hash(user.id || user.nickname || '')) % 8,   // phá hoà z-index ổn định, chống chớp lớp
    lastActive: Date.now(),   // mốc tương tác gần nhất — căn cứ nhường chỗ trong
  };
  home.taken = p;
  people.set(user.id, p);
  setFigure(p);
  box.appendChild(p.el);
  render(p);
  walkTo(p, { x: home.x, y: home.y }, 'walk', () => { p.state = 'home'; });
  return p;
};
P.removeUser = function (id) {
  const p = people.get(id);
  if (!p) return;
  if (p.couple) dissolveCouple(p.couple, p);
  freePosition(p.home);
  p.el.remove();
  people.delete(id);
};
P.count = () => people.size;
P.get = id => people.get(id) || null;
P.isGirl = function (id) { const p = people.get(id); return p ? isGirlFigure(p) : false; };
/* Mọi sự kiện của 1 người (vào phòng, chat, thả tim, tặng quà, follow...) đều
   qua đây để làm mới mốc hoạt động — người còn tương tác thì giữ chỗ đẹp. */
P.touch = function (id) { const p = people.get(id); if (p) p.lastActive = Date.now(); };
/* Khách ở khu TRONG nhưng đã im lặng quá lâu (ứng viên nhường chỗ) */
function findStaleInner() {
  const now = Date.now(), staleMs = (P.tune.staleMin || 4) * 60000;
  let best = null;
  for (const q of people.values()) {
    if (q.couple || q.state !== 'home' || !isInner(q.home)) continue;
    if (now - (q.lastActive || 0) < staleMs) continue;
    if (!best || q.home.rank < best.home.rank) best = q;
  }
  return best;
}
/* Quét định kỳ khi ĐÔNG người: khách im lặng lâu ở khu trong tự lùi ra vị trí
   trống ở khu ngoài (phụ hoạ không gian), nhả chỗ trong cho khách sắp tới.
   Ít người hơn ngưỡng thì KHÔNG quét — ai cũng đứng yên bình thường. */
setInterval(() => {
  if (!P.tune.priorityOn || people.size < (P.tune.crowdMin || 70)) return;
  let moved = 0;
  for (const q of [...people.values()]) {
    if (moved >= 3) break;   // mỗi đợt tối đa 3 người di chuyển, tránh cả sảnh xáo động
    if (q.couple || q.state !== 'home' || !isInner(q.home)) continue;
    if (Date.now() - (q.lastActive || 0) < (P.tune.staleMin || 4) * 60000) continue;
    let oi = -1;
    for (let i = freePool.length - 1; i >= 0; i--) if (!isInner(freePool[i])) { oi = i; break; }
    if (oi < 0) return;
    const np = freePool.splice(oi, 1)[0];
    freePosition(q.home); np.taken = q; q.home = np;
    walkTo(q, { x: np.x, y: np.y }, 'walk', () => { q.state = 'home'; });
    moved++;
  }
}, 20000);
P.tourTarget = function () {
  const arr = [...people.values()].filter(p => !p.couple && p.state === 'home');
  if (!arr.length) return null;
  const p = arr[Math.floor(Math.random() * arr.length)];
  return { x: p.x, y: p.y };
};

/* ---------- Ghép đôi: lia cam → đổi đồ cưới → lên sân khấu ---------- */
function notifyQueue() { if (P.onQueueChange) P.onQueueChange(queueOrdered().map(c => `${c.giftPriority ? '🎁 ' : ''}${c.a.user.nickname} ❤ ${c.b.user.nickname}`)); }
/* Uu tien hang cho cho cap cua NGUOI TANG QUA (yeu cau Nguyen 2026-11-04,
   sua 2026-11-05): cap dang cho -> dua vao LAN QUA, xep theo MUC QUA
   CAO NHAT giam dan (ai tang cao nhat len dau, it nhat xuong cuoi —
   xem giftLaneCmp o queuePush); cap con dang o phan gioi thieu chua vao
   hang -> danh dau de khi vao hang thi vao lan qua. Tra ve true neu da
   uu tien. dia = so xu cua mon qua vua tang (ghi vao c.giftBest). */
P.bumpCouple = function (c, dia) {
  if (!c) return false;
  /* Chi ghi muc qua khi cap that su duoc uu tien (dang cho / dang gioi
     thieu) — cap dang dien hay da ve nha thi qua do khong tinh vao
     luot xep hang sau. */
  const best = (dia != null) ? Math.max(c.giftBest || 0, Number(dia) || 0) : (c.giftBest || 0);
  if (queueIncludes(c)) {
    c.giftBest = best;
    c.giftPriority = true;
    queuePush(c, true);
    notifyQueue();
    return true;
  }
  if (c.state === 'focus') { c.giftBest = best; c.giftPriority = true; return true; }
  return false;
};
function effGenderScore(p) {
  return p.genderFixed === 'F' ? 99 : p.genderFixed === 'M' ? -99 : genderScore(p.user.nickname);
}
function rolesFor(a, b) {
  const sa = effGenderScore(a), sb = effGenderScore(b);
  const bride = sa > sb ? a : b;
  return { bride, groom: bride === a ? b : a };
}
P.makeCouple = function (userA, userB, origin) {
  const a = P.spawn(userA), b = P.spawn(userB);
  if (!a || !b || a === b) return null;
  /* GHÉP LẠI THOẢI MÁI (Nguyen chốt 2026-11-04 22:13): một người đã có
     đôi vẫn ghép cặp MỚI được — cặp cũ tự tan, người bị bỏ lại thành
     độc thân về chỗ ngồi. Chỉ chặn khi cặp cũ đang trong dòng sân khấu
     (focus/queue/toStage/đang diễn) — xem coupleReleasable. Kiểm tra
     KHẢ THI của cả hai phía trước, đạt hết mới thả thật, để một lần từ
     chối không làm tan oan cặp của phía còn lại.
     origin = nguồn tạo cặp MỚI ('manual' = khách tự tag/gõ lệnh, 'npc' /
     'autopair' = hệ thống tự tạo, 'follow' / 'gift' = sự kiện của khách):
     cặp ghi lại nguồn của mình (c.origin) để lượt sau biết cặp nào là
     cặp TỰ ĐỘNG — tag tay được giành cặp tự động đang XẾP HÀNG. */
  const ca = (a.couple && a.couple !== b.couple) ? a.couple : null;
  const cb = (b.couple && b.couple !== a.couple && b.couple !== ca) ? b.couple : null;
  if (ca && !coupleReleasable(ca, origin)) return null;
  if (cb && !coupleReleasable(cb, origin)) return null;
  if (ca) releaseOldCouple(ca);
  if (cb) releaseOldCouple(cb);
  if (a.couple) return a.couple;
  const { bride, groom } = rolesFor(a, b);
  a.lastActive = Date.now(); b.lastActive = Date.now();   // được ghép đôi = đang tương tác, không bị nhường chỗ
  const c = { key: [a.user.id, b.user.id].sort().join('|'), a, b, bride, groom, state: 'focus', spot: -1, timer: 0, origin: origin || 'manual' };
  c.set = pickSet(c);   // cả cặp mặc CHUNG 1 bộ phối sẵn cùng phong cách
  a.couple = c; b.couple = c;
  couples.push(c);
  for (const p of [a, b]) { p.target = null; p.path = []; p.done = null; p.state = 'focus'; p.dirty = true; }  // đứng yên tại chỗ cho camera lia tới
  /* KHÔNG lia camera lúc ghép đôi (Nguyen chot 2026-11-04): camera chỉ di
     chuyển khi tới lượt cặp thay đồ lên sân khấu (onPairWalk ở promoteStage). */
  setTimeout(() => {                                      // camera tới nơi: chỉ phóng to gây chú ý — CHƯA thay đồ
    if (!couples.includes(c)) return;
    a.boost = b.boost = P.tune.boost; a.dirty = b.dirty = true;
    /* Hiệu ứng THAY ĐỒ CƯỚI dời sang promoteStage (Nguyen chot 2026-11-04):
       tới lượt lên sân khấu mới thay đồ + vòng sáng; cặp còn đang chờ trong
       hàng thì vẫn mặc đồ thường, không hiệu ứng gì. */
  }, 1500);
  setTimeout(() => {                                      // rồi nắm tay nhau ra thảm đỏ lên sân khấu
    if (!couples.includes(c)) return;
    a.boost = b.boost = 1; a.dirty = b.dirty = true;
    if (P.stageCooldownRemain(c) > 0) {
      /* N1: mot trong hai con dang nghi sau lan len truoc -> KHONG day
         ve 'court' nua (ve do la mo coi: khong timer nao goi len lai,
         npcTick/autoPairTick deu loai nguoi da co cap). Giu cap o trang
         thai cho ('focus') + hen gio thu lai khi het cooldown; het gio
         thi tu vao hang cho. Cap van chua lam le — toast phai noi dung
         su that do (xem P.onCooldownWait o main.js), khong dung
         onStageSkipped (chi danh cho cap DA lam le xong). */
      c.state = 'focus';
      if (P.onCooldownWait) P.onCooldownWait(c, P.stageCooldownRemain(c));
      /* Kiem tra lai moi toi da 5s thay vi hen 1 phat het gio nghi:
         neu giua chung hang cho can sach (san khau trong) thi
         stageCooldownRemain duoc MIEN ve 0 — cap vao hang ngay thay vi
         ngoi cho het 300s trong khi san khau bo trong. */
      const retry = () => {
        if (!couples.includes(c)) return;
        const remain = P.stageCooldownRemain(c);
        if (remain > 0) { c.coolTimer = setTimeout(retry, Math.min(remain, 5) * 1000); return; }
        c.coolTimer = null;
        c.state = 'queue';
        queuePush(c);
        notifyQueue();
        promoteStage();
      };
      c.coolTimer = setTimeout(retry, Math.min(P.stageCooldownRemain(c), 5) * 1000);
      return;
    }
    c.state = 'queue';
    queuePush(c);
    notifyQueue();
    promoteStage();
  }, 3600);
  return c;
};

/* Điểm hẹn GIỮA THẢM ĐỎ (Nguyen chốt 2026-11-04 17:41): cặp tới lượt
   không thay đồ tại chỗ ngồi nữa — hai người mặc đồ thường đi ra giữa
   thảm (nam x=47, nữ x=53, y=REVEAL_Y), đứng cạnh nhau rồi mới cùng
   biến hình, để camera bắt trọn khoảnh khắc đổi đồ cô dâu chú rể. */
const REVEAL_Y = 68;

/* Tư thế đứng của 1 cặp ở ô sân khấu DUY NHẤT (giữa): nam trái – nữ
   phải. Đích được kẹp vào đúng vùng an toàn trên bục (khung cố định).
   M8: bo tham so i (chi goi voi i=0) + nhanh cap ben (sideDrop). */
function slotPose(c) {
  const y = stageY;
  const off = STAGE_FRAME.pairOff;
  const leftP = c.groom;
  const rightP = c.bride;
  const yL = y + (leftP === c.groom ? STAGE_FRAME.groomDrop : 0);
  const yR = y + (rightP === c.groom ? STAGE_FRAME.groomDrop : 0);
  const clampX = v => Math.max(STAGE_FRAME.zoneX[0], Math.min(STAGE_FRAME.zoneX[1], v));
  const yMax = stageY + STAGE_FRAME.zoneDropMax;
  return { leftP, rightP, l: { x: clampX(STAGE_FRAME.spot - off), y: Math.min(yMax, yL) }, r: { x: clampX(STAGE_FRAME.spot + off), y: Math.min(yMax, yR) } };
}
/* Dat cap ve dung tu the slotPose HIEN TAI (theo stageY/khung cua nen
   dang chay): dung khi nen doi khung giua chung hoac cap toi noi sau
   khi khung da doi — chan phai cham dung mat buc cua nen do. */
function snapToSlotPose(c) {
  const pose = slotPose(c);
  for (const p of [c.a, c.b]) {
    const t = p === pose.leftP ? pose.l : pose.r;
    p.x = t.x; p.y = t.y; p.dirty = true;
  }
}
/* Độ dài đường đi còn lại của 1 người (px) theo path hiện tại */
function pairPathLen(p) {
  let t = 0, px = p.x, py = p.y;
  for (const q of p.path || []) { t += Math.hypot((q.x - px) / 100 * Ww, (q.y - py) / 100 * Hw); px = q.x; py = q.y; }
  return t;
}
/* Căn tốc độ 2 bạn đời để ĐI HẾT đường trong cùng một khoảng thời gian:
   người đường ngắn hơn đi nhanh hơn tương ứng (giới hạn mềm 170–1100px/s).
   Nhờ vậy hai người luôn tới nơi CÙNG LÚC thay vì người trước người sau. */
function syncPairSpeed(a, b) {
  const la = pairPathLen(a), lb = pairPathLen(b);
  if (la < 1 || lb < 1 || !a.speedPx || !b.speedPx) return;
  const T = Math.min(la / a.speedPx, lb / b.speedPx);
  if (!(T > 0)) return;
  a.speedPx = Math.max(170, Math.min(1100, la / T));
  b.speedPx = Math.max(170, Math.min(1100, lb / T));
}
function promoteStage() {
  /* MOT TAM DIEM DUY NHAT O GIUA SAN KHAU (Nguyen chot lai 2026-11-04
     19:00 — thay han co che o ben + nhuong giua): cap nao len cung
     duoc DUNG GIUA (spot 0), khong con cap nao phai dien o o ben.
     Cap truoc dien o giua; cap sau duoc nha di len trong luc cap
     truoc con dien va vao giua ngay khi cap truoc xuong dung han
     coupleSec (nay 9 giay). Cap dang tren duong len CHUA giu o giua
     (spot = -1) — o giua chi chuyen chu khi cap sau TOI NOI
     (arriveStage), va cap nao con dang dung luc do (thuong la cap
     giu san khau vi phong vang) phai xuong nhuong ngay.
     CONG NHIP (chot 18:46, giu nguyen): cap sau chi BAT DAU DI
     CHUYEN khi (a) khong co hanh trinh nao dang chay va (b) moi cap
     dang dien da dung du releaseSec (mac dinh 6 — config
     nhaCapTiepSauGiay). Chua toi nhip thi DUNG o day; nhip game o
     vong lap nguoi + hen gio arriveStage se goi lai dung moc. */
  if (!queueLen()) return;
  let journeying = false, freshPerforming = false;
  for (const c of couples) {
    if (c.state === 'toStage') journeying = true;
    else if (c.state === 'stage' && !c.hold) {
      /* Cap dang GIU san khau (hold) = DA dien xong (timer dung 0) —
         khong duoc tinh la "dang dien non": neu coupleSec < releaseSec
         thi performed khong bao gio cham releaseSec, cong dong vinh
         vien va khong cap nao (tag tay / tu ghep / follow) len duoc
         nua — ket cung san khau (phat hien 2026-11-05 khi test HOLD +
         tu ghep doi voi coupleSec = 5 < nhaCapTiepSauGiay = 6). */
      const performed = (P.coupleSec || 25) - Math.max(0, c.timer != null ? c.timer : 0);
      if (performed < (P.releaseSec || 6)) freshPerforming = true;
    }
  }
  if (journeying || freshPerforming) return;
  const c = queueShiftNext(); if (!c) return; c.giftPriority = false; c.giftBest = 0; notifyQueue();   // het luot uu tien theo qua — luot sau (neu len lai) tinh muc qua lai tu dau; boc theo thu tu lan: gift -> tag -> random -> npc
  c.state = 'toStage'; c.spot = -1;
  c.a.spotScale = c.b.spotScale = P.tune.scaleC;
  /* TOI LUOT cap nay — nhung CHUA thay do voi: hai nguoi mac do
     thuong di ra diem hen giua tham truoc, dung canh nhau roi moi
     cung bien hinh o do (xem onGather duoi day). Cap con cho trong
     hang van do thuong — xem makeCouple. */
  /* HANH TRINH LEN SAN KHAU — 3 chang (gop 2 chot cua Nguyen
     2026-11-04 17:19 + 17:41): CHANG 1 hai nguoi mac do thuong di ra
     DIEM HEN GIUA THAM DO va DOI nhau; CHANG 2 ca hai dung canh nhau
     o giua tham moi cung BIEN HINH (o onGather); CHANG 3 nam tay di
     len san khau vao DUNG VI TRI GIUA, toc do can khop de toi noi
     cung luc, buoi le chi bat dau khi ca hai da vao vi tri
     (arriveStage cho du 2 nguoi). */
  c.journeyAt = Date.now(); c._heals = 0;
  startLeg1(c);
  if (P.onPairWalk) { try { P.onPairWalk(c); } catch (e) { diagErr('onPairWalk: ' + e.message); } }   // camera bam theo khi di tham do
}
/* Loi hook ben ngoai (camera/hieu ung/MC cua main.js) khong bao gio duoc
   lam chet chuoi hanh trinh: bat loi tai cho, ghi vao hop chan doan. */
function diagErr(m) { try { if (window.__diag) window.__diag.errs.push(m); } catch (e) {} }
/* CHANG 1: hai nguoi mac do thuong di ra DIEM HEN giua tham va doi nhau.
   Tach thanh ham rieng de watchdog ben duoi LAI LAI duoc khi hanh trinh
   bi ket (mat callback, loi hook...) — truoc day chuoi nay chet la chet
   han, ca hang cho dung im theo (Nguyen bao 2026-11-04 19:24: hang cho
   dung im hon 2 phut khong cap nao len duoc nua). */
function startLeg1(c) {
  c._gather = 0;
  const onGather = () => {
    if (++c._gather !== 2 || !couples.includes(c) || c.state !== 'toStage') return;
    journeyReveal(c);
  };
  walkPath(c.groom, [{ x: 47, y: REVEAL_Y }], 'toStage', onGather);
  walkPath(c.bride, [{ x: 53, y: REVEAL_Y }], 'toStage', onGather);
}
/* CHANG 2: ca hai da dung canh nhau o giua tham — BIEN HINH (thay do
   cuoi + vong sang + onPairReveal), giu ~1.4s roi di tiep chang cuoi. */
function journeyReveal(c) {
  c.groom.set = c.set; c.bride.set = c.set;
  setOutfit(c.groom, 'groom'); setOutfit(c.bride, 'bride');
  c.a.el.classList.add('pairfx'); c.b.el.classList.add('pairfx');
  if (P.onPairReveal) { try { P.onPairReveal(c); } catch (e) { diagErr('onPairReveal: ' + e.message); } }
  setTimeout(() => driveLeg3(c), 1400);
}
/* CHANG 3: nam tay nhau len san khau vao dung vi tri giua, toc do can
   khop de toi noi cung luc; buoi le chi bat dau khi du 2 nguoi. */
function driveLeg3(c) {
  if (!couples.includes(c) || c.state !== 'toStage') return;
  /* Cap moi bat dau chang len cuoi = da "len gan toi": cap nao dang
     dung dien tren san khau phai DI CHUYEN XUONG LIEN de nhuong giua
     (Nguyen chot 2026-11-04 19:14) — khong doi het gio coupleSec,
     cung khong doi cap moi toi noi han. Camera khong bi cuop theo
     cap xuong: khoa tam diem dang bao ve hanh trinh cua cap moi. */
  for (const o of couples) if (o !== c && o.state === 'stage') leaveStage(o);
  const pose = slotPose(c);
  const tgt = p => (p === pose.leftP ? pose.l : pose.r);
  c._arrive = 0;
  const onArr = () => { if (++c._arrive === 2 && couples.includes(c) && c.state === 'toStage') arriveStage(c); };
  walkPath(c.groom, [{ x: 47, y: stageY + 7 }, tgt(c.groom)], 'toStage', onArr);
  walkPath(c.bride, [{ x: 53, y: stageY + 7 }, tgt(c.bride)], 'toStage', onArr);
  syncPairSpeed(c.groom, c.bride);
}
/* WATCHDOG SAN KHAU (chot sau su co hang cho dung im 2026-11-04):
   chay bang setInterval (doc lap vong lap ve) — moi 4 giay kiem tra:
   (a) cap 'toStage' qua 30 giay chua xong (hanh trinh binh thuong chi
       ~12 giay) -> chan doan dang ket o chang nao roi LAI LAI chang
       do; da dung sat san khau thi ep vao le luon; lai 3 lan khong
       xong thi cho cap do xuong ngoi (court) de pipeline chay tiep.
   (b) hang cho con nguoi ma san khau trong + khong ai dang di -> goi
       lai promoteStage (phong khi mat trigger).
   Nho lop nay, bat ky loi le nao lam dut chuoi cung chi lam tre 1
   cap vai chuc giay, khong con dong bang ca buoi live. */
setInterval(() => {
  const now = Date.now();
  for (const c of [...couples]) {
    if (c.state !== 'toStage' || !c.journeyAt) continue;
    const age = (now - c.journeyAt) / 1000;
    if (age < 30) continue;
    diagErr('watchdog: toStage ket ' + Math.round(age) + 's — ' + c.a.user.nickname + ' ❤ ' + c.b.user.nickname + ' (lan chua ' + ((c._heals || 0) + 1) + ')');
    const nearStage = c.a.y <= stageY + 12 && c.b.y <= stageY + 12;
    const transformed = c.groom.outfit === 'groom' && c.bride.outfit === 'bride';
    if (nearStage) {
      const pose = slotPose(c);
      for (const [pp, tt] of [[pose.leftP, pose.l], [pose.rightP, pose.r]]) { pp.x = tt.x; pp.y = tt.y; pp.target = null; pp.path = []; pp.done = null; pp.dirty = true; }
      arriveStage(c);
    } else if ((c._heals || 0) >= 3) {
      c.state = 'court'; c.spot = -1; c.journeyAt = 0;
      for (const p of [c.a, c.b]) { p.target = null; p.path = []; p.done = null; walkTo(p, { x: p.home.x, y: p.home.y }, 'walk', () => { p.state = 'home'; }); }
      diagErr('watchdog: bo cuoc hanh trinh — ' + c.key);
    } else if (transformed) driveLeg3(c);
    else startLeg1(c);
    if (c.state === 'toStage') { c.journeyAt = now; c._heals = (c._heals || 0) + 1; }
    promoteStage();
  }
  if (queueLen() && !couples.some(c => c.state === 'stage' || c.state === 'toStage')) promoteStage();
}, 4000);
function arriveStage(c) {
  if (c.state !== 'toStage') return;
  c.state = 'stage';
  c.spot = 0;
  stageSlots[0] = c;
  c.hold = false;
  c.timer = P.coupleSec || 25;
  c.a.state = 'stage'; c.b.state = 'stage';
  c.a.el.classList.remove('pairfx'); c.b.el.classList.remove('pairfx');
  c.journeyAt = 0; c._heals = 0;
  snapToSlotPose(c);   // V8-lo-lung: khung co the da doi trong luc cap di len (37.2 -> 42.6) — chot lai dung vi tri cua nen hien tai truoc khi bat dau le, neu khong cap se lo lung het buoi le
  if (P.onCoupleStage) { try { P.onCoupleStage(c); } catch (e) { diagErr('onCoupleStage: ' + e.message); } }
  /* Hẹn giờ NHẢ cặp tiếp theo đúng mốc đứng đủ releaseSec (nhịp lia
     cam ở promoteStage): tới giờ gọi lại promoteStage, cổng nhịp ở đó
     tự quyết có nhả hay chưa (hàng chờ có thể đã đổi khác lúc đó). */
  setTimeout(() => promoteStage(), (P.releaseSec || 6) * 1000);
  /* NHUONG GIUA: cap nao khac con dang dung dien thi xuong ngay de
     nhuong tam diem cho cap vua toi noi — binh thuong la cap dang
     "dung cho" (het gio nhung phong vang nen dung tiep); cung bao
     truong hop coupleSec duoc chinh dai hon ca hanh trinh: cap truoc
     chua het gio cung xuong nhuong, cap moi luon la tam diem duy
     nhat o giua. */
  for (const o of couples) if (o !== c && o.state === 'stage') leaveStage(o);
}
/* ===== Chong spam len san khau (Nguyen chot 2026-11-04) =====
   Moi nguoi xuong san khau xong la bat dau DEM NGUOC (stageCdUntil): trong
   thoi gian nghi, cap khong duoc vao lai hang cho. So giay nghi do main.js
   tinh va day xuong qua P.setStageCooldown (co che tu dong theo luot xem /
   hang cho / tan suat ghep cap nam o main.js, tat bang config choTuDong). */
P.stageCooldownSec = 90;   // cooldown THEO CAP (cung doi moi duoc len lai) — cong thuc dong o main.js
P.personCdSec = 30;        // cooldown THEO NGUOI (doi ban dien khac cung phai cho chut, ngan hon nhieu)
const pairCdUntil = new Map();   // key cap -> moc duoc len lai (chi cho DUNG doi do)
P.setStageCooldown = function (sec) { P.stageCooldownSec = Math.max(0, Math.round(Number(sec) || 0)); };
P.setStageCooldowns = function (pairSec, personSec) {
  P.stageCooldownSec = Math.max(0, Math.round(Number(pairSec) || 0));
  P.personCdSec = Math.max(0, Math.round(Number(personSec) || 0));
};
/* So giay cap c con phai cho moi duoc VAO HANG cho san khau:
   = max(cooldown theo cap cua dung doi nay, cooldown theo nguoi cua 2
   nguoi) — NHUNG duoc MIEN TOAN BO khi khong co cap nao dang XEP HANG
   va khong co cap nao dang DI LEN: luc san khau dang trong, cam len
   lai chi lam phong chet chu khong bao ve duoc ai (dung triet ly cua
   che do hold). Day la sua goc cua loi "ghep duoc mot luc roi nhap ten
   khong ghep duoc nua" (Nguyen bao 2026-11-05): truoc day cooldown
   tinh theo tung nguoi, dai 54-600s, ai da len san khau 1 lan la bi
   khoa moi lan ghep sau du ghep voi nguoi moi. */
P.stageCooldownRemain = function (c) {
  if (!c) return 0;
  const busy = queueLen() > 0 || couples.some(o => o !== c && o.state === 'toStage');
  if (!busy) return 0;
  const now = Date.now();
  const pair = (pairCdUntil.get(c.key) || 0) - now;
  const pers = Math.max((c.a.stageCdUntil || 0) - now, (c.b.stageCdUntil || 0) - now);
  return Math.max(0, Math.ceil(Math.max(pair, pers) / 1000));
};
/* Danh dau cooldown khi 1 cap vua xuong san khau: nguoi nghi ngan,
   dung doi do nghi dai (so giay do main.js tinh theo cong thuc dong). */
function stampStageCooldown(c) {
  const now = Date.now();
  const pUntil = now + (P.personCdSec || 0) * 1000;
  c.a.stageCdUntil = pUntil; c.b.stageCdUntil = pUntil;
  pairCdUntil.set(c.key, now + (P.stageCooldownSec || 0) * 1000);
}
/* Dua 1 cap DA LAM LE XONG (dang o nha) vao lai hang cho san khau */
P.requeueCouple = function (c) {
  if (!c || c.state !== 'court') return false;
  c.state = 'queue';
  queuePush(c);
  notifyQueue();
  promoteStage();
  return true;
};
function leaveStage(c) {
  c.hold = false;
  stampStageCooldown(c);   // xuong san khau -> bat dau dem nguoc (nguoi ngan / cap dai)
  if (c.spot >= 0 && stageSlots[c.spot] === c) stageSlots[c.spot] = null;
  c.spot = -1; c.state = 'court';
  c.a.spotScale = c.b.spotScale = 1;
  // người về sau: nếu còn vị trí trống sát cạnh vị trí của bạn đời thì chuyển sang ngồi cạnh
  const mover = c.b, anchor = c.a;
  const near = positions.find(q => !q.taken && q !== mover.home && Math.abs(q.x - anchor.home.x) < 4.6 && Math.abs(q.y - anchor.home.y) < 3.4);
  if (near) { freePosition(mover.home); near.taken = mover; mover.home = near; }
  let back = 0;
  for (const p of [c.a, c.b]) {
    p.el.classList.remove('pairfx');
    /* M5: dem ve nha dang ky qua p.homeDone (xem stepPerson) thay vi
       done cua walkPath — ghep lai / dissolve / doi khung ghi de
       p.done thi bo dem nay van chay khi nguoi ve toi home; chi khi
       ca 2 ve du moi doi do thuong + goi onPairHome (nha camera). */
    p.homeDone = () => {
      p.state = 'home';
      if (++back === 2) {
        /* Về tới bàn thì thay lại đồ thường: trên sân khấu lúc nào
           cũng chỉ có ĐÚNG 1 cặp mặc đồ cưới (cặp đang làm lễ), các
           cặp đã cưới ngồi ở bàn trong đồ thường như khách — tránh
           cảnh mấy cặp đồ cưới đứng quanh sân khấu gây nhầm. */
        setOutfit(c.a, 'casual'); setOutfit(c.b, 'casual');
        if (P.onPairHome) P.onPairHome(c);
      }
    };
    // Xuống LIỀN và thoát hẳn khỏi tâm điểm (Nguyen chê 2026-11-04
    // 19:14: cặp trên lề mề, nhìn như vẫn đứng trái phải trên sân
    // khấu): bước CHÉO RA HAI BÊN rồi vòng xuống dưới bục — không còn
    // dồn về điểm giữa 47/53 ngay trước sân khấu như trước — và đi
    // nhanh hơn ~1.5 lần để kịp nhường giữa cho cặp đang lên gần tới.
    walkPath(p, [{ x: p.x < 50 ? 40 : 60, y: stageY + 7 }, { x: p.home.x, y: p.home.y }], 'walk');
    if (p.speedPx) p.speedPx = Math.min(1250, Math.round(p.speedPx * 1.55));
  }
  if (P.onPairReturn) { try { P.onPairReturn(c); } catch (e) { diagErr('onPairReturn: ' + e.message); } }   // camera bám theo khi đi về chỗ
  promoteStage();
}
function dissolveCouple(c, leaving) {
  if (!c) return;
  const i = couples.indexOf(c); if (i >= 0) couples.splice(i, 1);
  if (queueRemove(c)) notifyQueue();
  if (c.spot >= 0 && stageSlots[c.spot] === c) stageSlots[c.spot] = null;
  c.state = 'dead';   // cap da tan: khong con la focus/queue/toStage/stage — cac cho doc trang thai khong tuong la cap con song
  if (c.coolTimer) { clearTimeout(c.coolTimer); c.coolTimer = null; }   // N1: huy hen len lai cua cap nay
  pairCdUntil.delete(c.key);   // N9: khong giu moc cooldown cua cap da chet
  if (P.unregisterCouple) P.unregisterCouple(c.key);   // C4 (phuong an A): xoa khoi so coupleByKey + courtSince ngay luc tan
  promoteStage();
  /* C4/N4: giai phong CA HAI phia (truoc day chi 'other', 'leaving' van
     giu c.couple = c nen guard c.a.couple === c tuong cap con song —
     goc cua loi block user giua hang cho lam chet NPC/tu ghep). Nguoi
     nao da bi xoa khoi phong (removeUser) thi bo qua — chi giai phong
     nguoi van con trong phong. */
  for (const p of [c.a, c.b]) {
    if (!p || people.get(p.user.id) !== p) continue;
    p.couple = null; p.boost = 1;
    p.el.classList.remove('pairfx');
    setOutfit(p, 'casual');
    walkTo(p, { x: p.home.x, y: p.home.y }, 'walk', () => { p.state = 'home'; });
  }
  /* M6: tan cap (ke ca block user giua hang cho / dang dien) thi nha
     camera ngay qua onPairHome — truoc day Cam.followC chi duoc xoa o
     onPairHome (khi ca 2 ve toi nha) va unfollow nen camera bam mai
     theo cap ma. Guard vi hook do main.js gan. */
  if (P.onPairHome) P.onPairHome(c);
}
/* Tan ca cap + giai phong CA HAI nguoi — dissolveCouple nay da giai
   phong ca hai phia nen chi can goi thang no (truoc day phai them khoi
   giai phong 'a' rieng vi dissolveCouple chi giai phong 'other'). */
function dissolveFull(c) {
  if (!c) return;
  dissolveCouple(c, c.a);
}
P.dissolveCoupleFull = dissolveFull;

/* Cap cu co THA duoc de ghep cap moi khong: chi khi da yen vi —
   'court' (lam le xong, dang ngoi o ban) hoac dang HOLD tren san khau
   (dien xong, dung giu san khau vi chua co cap ke). Dang focus / trong
   hang cho / dang di len / dang dien thi khong tha.
   NGOAI LE (Nguyen chot 2026-11-05, sau phan tich chong cheo): TAG TAY
   cua khach that (newOrigin = 'manual' / 'tag') duoc GIANH mot cap THUAN TU
   DONG (origin 'npc' / 'autopair') dang nam trong HANG CHO — cap tu
   dong chi de lap cho trong luc vang, khong duoc chan y muon that cua
   khach. Cap tu dong dang DI LEN / dang DIEN van khong gianh (hong
   chuoi hanh trinh); cap cua khach that/follow/qua dang cho van duoc
   bao ve nhu cu. 'random' (go tu khoa ghep doi / event couple khong
   tag) KHONG duoc gianh — neu khong 1 cau dua 'dam cuoi vui qua' cung
   pha duoc cap tu dong dang cho (N6). */
function coupleReleasable(c, newOrigin) {
  if (!c) return false;
  if (c.state === 'court' || (c.state === 'stage' && c.hold)) return true;
  const manualReq = newOrigin === 'manual' || newOrigin === 'tag';
  if (manualReq && (c.origin === 'npc' || c.origin === 'autopair') && c.state === 'queue') return true;
  return false;
}
function releaseOldCouple(c) {
  if (c.state === 'court') { dissolveFull(c); return; }
  if (c.state === 'queue') { dissolveFull(c); return; }   // cap tu dong bi tag tay gianh khoi hang cho: tan sach, ca hai ve doc than
  // stage + hold: cho ca hai xuong theo dung duong thoat cua leaveStage
  // (cheo ra 40/60 o stageY+7 roi ve cho) + danh dau cho len san khau
  // nhu mot lan xuong binh thuong, roi moi go dang ky cap.
  stampStageCooldown(c);
  const i = couples.indexOf(c); if (i >= 0) couples.splice(i, 1);
  if (queueRemove(c)) notifyQueue();
  if (c.spot >= 0 && stageSlots[c.spot] === c) stageSlots[c.spot] = null;
  c.spot = -1; c.hold = false; c.state = 'dead';
  if (c.coolTimer) { clearTimeout(c.coolTimer); c.coolTimer = null; }
  /* C4: nhanh nay khong qua dissolveCouple nen go dang ky truc tiep —
     khong xoa pairCdUntil vi stampStageCooldown vua dat moc nghi cho
     cap nay (nghi xong moi duoc len lai). */
  if (P.unregisterCouple) P.unregisterCouple(c.key);
  for (const p of [c.a, c.b]) {
    if (people.get(p.user.id) !== p) continue;
    p.couple = null; p.boost = 1; p.spotScale = 1;
    p.el.classList.remove('pairfx');
    setOutfit(p, 'casual');
    walkPath(p, [{ x: p.x < 50 ? 40 : 60, y: stageY + 7 }, { x: p.home.x, y: p.home.y }], 'walk', () => { p.state = 'home'; });
    if (p.speedPx) p.speedPx = Math.min(1250, Math.round(p.speedPx * 1.55));
  }
  promoteStage();
}
P.featured = () => stageSlots[0];
P.staged = () => stageSlots.map((c, i) => c ? { couple: c, spot: i } : null).filter(Boolean);
/* Thông số tinh chỉnh — main.js nạp từ config (mapping) qua setTune */
P.tune = { boost: 1.32, scaleC: 1.22, priorityOn: true, crowdMin: 70, staleMin: 4, innerRatio: 0.45, quietMax: 15, agingMs: 30000 };
P.setTune = function (t) {
  if (!t) return;
  for (const k of ['boost', 'scaleC']) {
    const v = Number(t[k]);
    if (isFinite(v) && v > 0) P.tune[k] = v;
  }
  // Cơ chế ưu tiên chỗ trong cho khách mới (khi đông người) + ngưỡng phòng vắng
  for (const k of ['crowdMin', 'staleMin', 'quietMax']) {
    const v = Number(t[k]);
    if (isFinite(v) && v > 0) P.tune[k] = v;
  }
  /* N5 — ngưỡng aging của hàng chờ (ms): cặp làn thấp chờ quá ngưỡng thì
     được bóc trước cặp quà. 0 = tắt aging. main.js truyền từ config
     choDoiLanThapGiay (giây); config không có key thì giữ giá trị cũ. */
  const ag = Number(t.agingMs);
  if (isFinite(ag) && ag >= 0) P.tune.agingMs = ag;
  const ir = Number(t.innerRatio);
  if (isFinite(ir) && ir > 0.1 && ir < 0.9) P.tune.innerRatio = ir;
  if (typeof t.priorityOn === 'boolean') P.tune.priorityOn = t.priorityOn;
  // Khoảng cách đội hình trên bục cũng chỉnh được từ config — M8: chi
  // giu lechCapGiua (cap giua duy nhat); lechCapBen/tamCapBen da chet
  // theo 2 o ben (main.js van truyen xuong, cu bo qua tai day).
  const offC = Number(t.pairOffC);
  if (isFinite(offC) && offC > 0) STAGE_FRAME.pairOff = offC;
};
P.coupleOf = function (uid) { const p = people.get(uid); return p ? p.couple : null; };
P.danceAll = function (sec = 5) {
  /* M13d: 1 setTimeout duy nhat cho ca phong thay vi 1 timeout/nguoi. */
  const els = [];
  for (const p of people.values()) { p.el.classList.add('dance'); els.push(p.el); }
  setTimeout(() => { for (const el of els) el.classList.remove('dance'); }, sec * 1000);
};
/* M13c: chi go vuong mien cu DA BIET (luu tham chieu) thay vi quet toan
   DOM moi lan doi diem — querySelectorAll('.person .crown') cu chay
   tren ca tram node moi lan. */
let crownEls = [];
P.setCrown = function (couple) {
  for (const e of crownEls) e.remove();
  crownEls = [];
  if (!couple) return;
  /* C4 — phong thu: cap da tan (2 nguoi khong con tro ve cap nay) thi
     khong doi vuong mien, ke ca khi so coupleByKey con sot muc cu. */
  if (couple.a.couple !== couple || couple.b.couple !== couple) return;
  for (const p of [couple.a, couple.b]) {
    if (!p || !p.el) continue;
    const s = document.createElement('span');
    s.className = 'crown'; s.textContent = '👑';
    p.el.appendChild(s);
    crownEls.push(s);
  }
};
/* Tắt hoạt ảnh nhân vật ngoài khung camera cho nhẹ máy — có TRỄ 2 ngưỡng:
   đang hiện thì phải ra xa viền thêm 4.5% mới tắt, đang tắt thì phải vào sâu
   hơn viền 1.5% mới bật lại; không còn cảnh nhân vật sát viền chớp tắt/bật
   hoạt ảnh liên tục khi camera lia chậm. */
P.cull = function (x0, y0, x1, y1) {
  for (const p of people.values()) {
    const m = p.inside ? 4.5 : -1.5;
    const inside = p.x > x0 - m && p.x < x1 + m && p.y > y0 - m && p.y < y1 + m;
    if (inside !== p.inside) { p.inside = inside; p.el.classList.toggle('far', !inside); }
  }
};

/* ---------- Khởi tạo ---------- */
/* L2: bo code debug ban chet dung tablesBox — index.html khong co
   id="tables" nen tablesBox luon null, lop phu nay khong bao gio ve.
   Tham so tablesEl cung bo (main.js van truyen thua, JS bo qua). */
P.init = function (container) {
  box = container;
  buildPositions();
  requestAnimationFrame(loop);
};
P.resize = function (w, h) { Ww = w; Hw = h; FH = h * 0.05; for (const p of people.values()) p.dirty = true; };
P.setStageY = function (y) { stageY = y; };
/* Nạp KHUNG theo file nền: đường đứng sân khấu + mép sàn + bảng bàn + lưới tìm
   đường + pool vị trí đều khớp với tranh của nền đó. */
P.setBgFile = function (file) {
  const fid = TABLE_FRAMES[file] ? file : 'mac-dinh';
  const fr = TABLE_FRAMES[fid];
  P.setStageY(fr.stageY);
  if (fid === frameId) return;
  frameId = fid;
  FLOOR_Y = fr.floorY; SEAT_TOP = fr.seatTop;
  applyFrameTables();
  BLOCKED = buildBlocked();
  buildPositions();
  /* H4: pool moi dung lai tu dau (moi slot taken=null) nen phai gan lai
     home cua MOI nguoi vao slot moi + danh dau taken, neu khong slot
     moi trung toa do voi nguoi dang dung van con trong — khach moi se
     duoc cap dung cho do -> 2 nguoi chong nhau. Slot cu chi duoc tha
     qua freePosition (khong gan truc tiep taken=null): slot khung cu
     khong duoc cho vao lai pool moi (freePosition tu chan theo frame).
     Slot moi nao cung hop le san (buildPositions da loc ban / tham /
     bac) nen chi can chon slot trong GAN home cu nhat. */
  for (const p of people.values()) {
    const old = p.home;
    if (!old) continue;
    let best = null, bd = Infinity;
    for (const q of positions) {
      if (q.taken) continue;
      const dx = q.x - old.x, dy = (q.y - old.y) * 1.3;
      const d = dx * dx + dy * dy;
      if (d < bd) { bd = d; best = q; }
    }
    if (!best) continue;   // pool moi het cho: giu home cu, dung yen tai cho
    freePosition(old);
    best.taken = p; p.home = best;
    const fi = freePool.indexOf(best);
    if (fi >= 0) freePool.splice(fi, 1);
    if (p.couple) continue;   // dang co doi (tren san khau / di len / di ve): chi doi home, luc ve se di ve home moi
    if (p.state === 'home' && bd <= 2.25) { p.x = best.x; p.y = best.y; p.dirty = true; continue; }   // lech <=1.5%: chot toa do ve dung slot moi, khong di chuyen
    walkTo(p, { x: best.x, y: best.y }, 'walk', () => { p.state = 'home'; });   // ca nguoi dang di (walk) cung duoc doi huong ve home moi
  }
  /* V8-lo-lung: cap DANG DIEN tren san khau (state 'stage') phai dung
     theo khung cua NEN DANG CHAY — doi nen doi khung (37.2 -> 42.6)
     ma cap van giu toa do cu (vong lap tren bo qua nguoi co doi) thi
     chan lo lung tren buc (do duoc: chan cach mat buc 180-195px o
     khung 1280). Snap ngay ve slotPose moi — cap dang dung yen
     (khong target) nen snap an toan, lai trung luc nen doi nen
     khong thay giat. Cap dang di len (toStage) thi arriveStage snap
     khi toi noi. */
  for (const c of couples) {
    if (c.state !== 'stage') continue;
    snapToSlotPose(c);
  }
};
P.coupleSec = 25;
P.releaseSec = 6;    // nhịp lia cam: cặp đang diễn ĐỨNG ĐỦ từng này giây mới bắt đầu cặp tiếp theo (config nhaCapTiepSauGiay)
