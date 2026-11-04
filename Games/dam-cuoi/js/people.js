/* ============================================================
   Đám Cưới Online — nhân vật trong KHÔNG GIAN PHÒNG RỘNG (people.js)
   - Phòng cưới lớn hơn màn hình: mỗi người vào phòng nhận 1 vị trí
     trống NGẪU NHIÊN (ghế quanh bàn tiệc hoặc điểm đứng) và ở cố định đó.
   - Giới hạn 2000 nhân vật.
   - Ghép đôi: (main lia camera tới) → đổi trang phục cưới tại chỗ +
     phóng to + vòng sáng quanh 2 người → đi thảm đỏ lên sân khấu →
     hết giờ quay về vị trí của mình (ngồi cạnh nhau nếu còn chỗ).
   - Vai cô dâu/chú rể phân theo giới tính đoán từ TÊN tiếng Việt.
   ============================================================ */
'use strict';
const P = {};
(window.Wedding = window.Wedding || {}).people = P;
window.Wedding.peopleApi = P;

const MAX_PEOPLE = 2000;
let FLOOR_Y = 44;                // sàn tiệc bắt đầu từ đây (% chiều cao phòng) — THAY THEO KHUNG của từng file nền (P.setBgFile)
let SEAT_TOP = 43.5;             // ghế quanh bàn không vượt lên trên mức này (né bậc thang/sân khấu) — cũng theo khung nền
let Ww = 2700, Hw = 3840;        // kích thước phòng (px) — main cập nhật qua P.resize
let FH = 192;                    // chiều cao nhân vật gốc (px trong phòng)
let box = null, tablesBox = null;
let stageY = 17.3;               // điểm đứng trên sân khấu (% chiều cao phòng)

const people = new Map();        // id -> person
const couples = [];
const stageQueue = [];
const stageSlots = [null, null, null];
/* ================= KHUNG SÂN KHẤU / KHÁN ĐÀI CỐ ĐỊNH (xem BG-LAYOUT.md) =================
   Bục vẽ sẵn trong ảnh: mặt bục từ y≈32% (sát vòm hoa) tới y≈42% (mép trước).
   Cặp đôi CHỈ đứng trong vùng an toàn dưới đây — không đè lên bánh cưới
   (x 45–55, y≤35), không chạm 2 cột vòm hoa (x 26–33 & 67–74), bậc thang
   (x 40–60, y 42–46) chỉ đi qua, không đứng lại. */
const STAGE_FRAME = {
  zoneX: [34, 66],        // khoảng x được phép đứng trên bục
  zoneDropMax: 1.6,       // đứng thấp hơn đường lễ tối đa (vẫn trên mặt bục)
  spots: [50, 42, 58],    // tâm 3 vị trí cặp: giữa + 2 bên (khoảng trống giữa các cặp đã thu hẹp ~50%)
  pairOff: [1.8, 1.7, 1.7],   // nửa khoảng cách 2 người trong cặp: đứng SÁT nhau, âu yếm
  sideDrop: 0.55,         // cặp 2 bên đứng thấp hơn cặp giữa một chút
  groomDrop: 0.5,         // chú rể đứng hơi thấp hơn (trước) cô dâu
};
const SPOTS = STAGE_FRAME.spots.map(x => ({ x }));
const CARPETS = [22, 50, 78];    // 3 thảm đỏ (% chiều rộng phòng)

function rand(a, b) { return a + Math.random() * (b - a); }
function hash(s) { let h = 0; s = String(s || ''); for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h); }
function avatarColor(id) { const hues = [340, 262, 200, 158, 24, 288, 96, 0, 210, 45]; return `hsl(${hues[hash(id) % hues.length]} 65% 45%)`; }
function initials(name) { const w = String(name || '?').trim().split(/\s+/); return ((w[0] || '?')[0] + (w.length > 1 ? w[w.length - 1][0] : '')).toUpperCase(); }
function esc(s) { return String(s || '').replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch])); }

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
];
const SETS_ROYAL = [
  { name: 'Hoàng gia vàng', bride: 'img/royal-bride1.png', groom: 'img/royal-groom1.png' },
  { name: 'Hoàng gia phượng', bride: 'img/royal-bride2.png', groom: 'img/royal-groom2.png' },
];
const GUEST_GIRLS = ['img/guest-girl.png', 'img/guest-girl2.png', 'img/guest-girl3.png', 'img/guest-girl4.png'];
const GUEST_BOYS = ['img/guest-boy.png', 'img/guest-boy2.png', 'img/guest-boy3.png', 'img/guest-boy4.png'];
[...SETS_BASE, ...SETS_ROYAL].forEach(s => { for (const src of [s.bride, s.groom]) { const im = new Image(); im.src = src; } });
[...GUEST_GIRLS, ...GUEST_BOYS].forEach(src => { const im = new Image(); im.src = src; });
/* Bộ avatar nhỏ làm sẵn cho chip tên (cắt mặt từ chính các nhân vật của
   game, để ở img/avatars/): người chưa có ảnh TikTok thì lấy 1 mặt trong bộ
   này làm ảnh đại diện — theo giới của nhân vật, cố định theo id — thay cho
   hình bóng người trống trơn trước đây (Nguyen chot 2026-11-04). */
const AV_GIRLS = Array.from({ length: 10 }, (_, i) => `img/avatars/av-f${i + 1}.webp`);
const AV_BOYS = Array.from({ length: 10 }, (_, i) => `img/avatars/av-m${i + 1}.webp`);
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
let tierLevel = 0;
P.setTierLevel = function (n) { tierLevel = n | 0; };
function setPool() {
  // Mốc Hoàng Gia (10.000+): chỉ dùng bộ hoàng gia + bộ trắng chủ lực
  return tierLevel >= 4 ? [...SETS_ROYAL, SETS_BASE[0]] : SETS_BASE;
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
  if (given === 'van') s += 2;
  else if (w.includes('van')) s -= 3;
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
  watchFigure(fw.querySelector('img.chibi'));
}
function watchFigure(img) {
  if (!img) return;
  const file = img.getAttribute('src');
  let busts = 0, waits = 0;
  const check = () => {
    if (!img.isConnected) return;                        // đã thay hình khác
    if (img.complete && img.naturalWidth > 0) return;    // hình ổn
    const broken = img.complete && img.naturalWidth === 0;
    if (broken || waits >= 3) {
      if (busts < 2) { busts++; waits = 0; img.src = file + (file.includes('?') ? '&' : '?') + 'r=' + busts; setTimeout(check, 1500); }
      else if (window.__diag) { window.__diag.errs.push('mat hinh: ' + file); window.__diag.uiErr = 'Nhân vật mất hình (' + file + ') — thử Ctrl+F5'; }
    } else { waits++; setTimeout(check, 1800); }
  };
  img.onerror = () => { waits = 3; setTimeout(check, 250); };
  setTimeout(check, 1800);
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
    stageY: 37.2, floorY: 44, seatTop: 43.5,
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
    stageY: 42.6, floorY: 50, seatTop: 47.5,
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
  const fillKey = p => Math.hypot(p.x - 50, (p.y - (FLOOR_Y + 1)) * 1.5) + (p.kind === 'seat' ? 0 : 5) + rand(0, 3);
  for (const p of positions) p.key = fillKey(p);
  freePool = positions.slice().sort((p1, p2) => p1.key - p2.key);
  freePool.forEach((p, i) => { p.rank = i; });   // rank 0 = chỗ đẹp nhất (trong cùng, gần sân khấu)
  return tables;
}
function takePosition() {
  while (freePool.length) { const pos = freePool.shift(); if (!pos.taken) return pos; }   // lấy từ GẦN sân khấu trước (đầu mảng đã sắp xếp)
  return null;
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
  const prev = new Map([[key(sx, sy), null]]); const q = [[sx, sy]];
  while (q.length) {
    const [cx, cy] = q.shift();
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
    if (c.state === 'stage') {
      c.timer -= dt;
      if (c.timer <= 0) leaveStage(c);
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
  if (people.size >= MAX_PEOPLE) return null;
  /* Phòng vắng (dưới ngưỡng quietMax): ưu tiên chỗ TRỌNG TÂM cho khách mới */
  let home = null;
  if ((P.tune.quietMax || 0) > 0 && people.size < P.tune.quietMax) home = takeCentralPosition();
  if (!home) home = takePosition();
  if (!home) return null;
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
    user, el: makeEl(user), x: home.x + rand(-2.4, 2.4), y: 99.4, home, outfit: 'casual',
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
function notifyQueue() { if (P.onQueueChange) P.onQueueChange(stageQueue.map(c => `${c.giftPriority ? '🎁 ' : ''}${c.a.user.nickname} ❤ ${c.b.user.nickname}`)); }
/* Uu tien hang cho cho cap cua NGUOI TANG QUA (yeu cau Nguyen 2026-11-04):
   cap dang cho -> dua len DAU hang (se la cap KE TIEP len san khau, khong chen
   ngang cap dang dien); cap con dang o phan gioi thieu chua vao hang -> danh
   dau de khi vao hang thi vao thang dau hang. Tra ve true neu da uu tien. */
P.bumpCouple = function (c) {
  if (!c) return false;
  const qi = stageQueue.indexOf(c);
  if (qi >= 0) {
    if (qi > 0) { stageQueue.splice(qi, 1); stageQueue.unshift(c); }
    c.giftPriority = true; notifyQueue();
    return true;
  }
  if (c.state === 'focus') { c.giftPriority = true; return true; }
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
P.makeCouple = function (userA, userB) {
  const a = P.spawn(userA), b = P.spawn(userB);
  if (!a || !b || a === b) return null;
  if (a.couple && a.couple !== b.couple) return null;
  if (b.couple && b.couple !== a.couple) return null;
  if (a.couple) return a.couple;
  const { bride, groom } = rolesFor(a, b);
  a.lastActive = Date.now(); b.lastActive = Date.now();   // được ghép đôi = đang tương tác, không bị nhường chỗ
  const c = { key: [a.user.id, b.user.id].sort().join('|'), a, b, bride, groom, state: 'focus', spot: -1, timer: 0 };
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
    if (P.stageCooldownRemain(c) > 0) {                   // một trong hai còn đang nghỉ sau lần lên trước -> KHÔNG vào hàng chờ
      c.state = 'court';
      for (const p of [a, b]) {
        p.el.classList.remove('pairfx');
        walkTo(p, { x: p.home.x, y: p.home.y }, 'walk', () => { p.state = 'home'; });
      }
      if (P.onStageSkipped) P.onStageSkipped(c);
      return;
    }
    c.state = 'queue';
    if (c.giftPriority) stageQueue.unshift(c); else stageQueue.push(c);
    notifyQueue();
    promoteStage();
  }, 3600);
  return c;
};

function promoteStage() {
  /* Số cặp lên cùng lúc: vắng thì 1 cặp; có hàng chờ thì mở thêm tới tối đa
     (config soCapToiDa) — sức chứa = tổng số cặp đang có mặt, kẹp ở mức tối đa */
  const staged = stageSlots.filter(Boolean).length;
  const cap = Math.max(1, Math.min(P.tune.maxStage || 3, staged + stageQueue.length));
  let onStage = staged;
  for (let i = 0; i < 3; i++) {
    if (stageSlots[i] || !stageQueue.length || onStage >= cap) continue;
    const c = stageQueue.shift(); c.giftPriority = false; notifyQueue();
    c.state = 'toStage'; c.spot = i;
    stageSlots[i] = c;
    onStage++;
    c.a.spotScale = c.b.spotScale = i === 0 ? P.tune.scaleC : P.tune.scaleS;
    /* TỚI LƯỢT cặp này: giờ mới THAY ĐỒ CƯỚI + vòng sáng + ăn mừng, rồi mới
       nắm tay nhau đi thảm đỏ (cặp còn chờ vẫn đồ thường — xem makeCouple) */
    c.groom.set = c.set; c.bride.set = c.set;
    setOutfit(c.groom, 'groom'); setOutfit(c.bride, 'bride');
    c.a.el.classList.add('pairfx'); c.b.el.classList.add('pairfx');
    if (P.onPairReveal) P.onPairReveal(c);
    const y = stageY + (i ? STAGE_FRAME.sideDrop : 0);
    const off = STAGE_FRAME.pairOff[i];
    /* Xếp NỮ KỀ NỮ, NAM KỀ NAM ở đường giáp giữa các cặp:
       cặp giữa: nam trái – nữ phải; cặp 2 bên: nữ trái – nam phải */
    const leftP = i === 0 ? c.groom : c.bride;
    const rightP = i === 0 ? c.bride : c.groom;
    const yL = y + (leftP === c.groom ? STAGE_FRAME.groomDrop : 0);
    const yR = y + (rightP === c.groom ? STAGE_FRAME.groomDrop : 0);
    // Kẹp điểm đứng cuối vào đúng vùng an toàn trên bục (khung cố định)
    const clampX = v => Math.max(STAGE_FRAME.zoneX[0], Math.min(STAGE_FRAME.zoneX[1], v));
    const yMax = stageY + STAGE_FRAME.zoneDropMax;
    walkPath(leftP, [{ x: 47, y: 90 }, { x: 47, y: stageY + 7 }, { x: clampX(STAGE_FRAME.spots[i] - off), y: Math.min(yMax, yL) }], 'toStage');
    walkPath(rightP, [{ x: 53, y: 90 }, { x: 53, y: stageY + 7 }, { x: clampX(STAGE_FRAME.spots[i] + off), y: Math.min(yMax, yR) }], 'toStage', () => arriveStage(c));
    if (P.onPairWalk) P.onPairWalk(c);   // camera bám theo khi đi thảm đỏ
  }
}
function arriveStage(c) {
  if (c.state !== 'toStage') return;
  c.state = 'stage';
  c.timer = P.coupleSec || 25;
  c.a.state = 'stage'; c.b.state = 'stage';
  c.a.el.classList.remove('pairfx'); c.b.el.classList.remove('pairfx');
  if (P.onCoupleStage) P.onCoupleStage(c);
}
/* ===== Chong spam len san khau (Nguyen chot 2026-11-04) =====
   Moi nguoi xuong san khau xong la bat dau DEM NGUOC (stageCdUntil): trong
   thoi gian nghi, cap khong duoc vao lai hang cho. So giay nghi do main.js
   tinh va day xuong qua P.setStageCooldown (co che tu dong theo luot xem /
   hang cho / tan suat ghep cap nam o main.js, tat bang config choTuDong). */
P.stageCooldownSec = 90;
P.setStageCooldown = function (sec) { P.stageCooldownSec = Math.max(0, Math.round(Number(sec) || 0)); };
P.stageCooldownRemain = function (c) {
  if (!c) return 0;
  const now = Date.now();
  return Math.max(0, Math.ceil(Math.max((c.a.stageCdUntil || 0) - now, (c.b.stageCdUntil || 0) - now) / 1000));
};
/* Dua 1 cap DA LAM LE XONG (dang o nha) vao lai hang cho san khau */
P.requeueCouple = function (c) {
  if (!c || c.state !== 'court') return false;
  c.state = 'queue';
  if (c.giftPriority) stageQueue.unshift(c); else stageQueue.push(c);
  notifyQueue();
  promoteStage();
  return true;
};
function leaveStage(c) {
  const cdUntil = Date.now() + (P.stageCooldownSec || 0) * 1000;
  c.a.stageCdUntil = cdUntil; c.b.stageCdUntil = cdUntil;   // xuong san khau -> bat dau dem nguoc
  if (c.spot >= 0) stageSlots[c.spot] = null;
  c.spot = -1; c.state = 'court';
  c.a.spotScale = c.b.spotScale = 1;
  // người về sau: nếu còn vị trí trống sát cạnh vị trí của bạn đời thì chuyển sang ngồi cạnh
  const mover = c.b, anchor = c.a;
  const near = positions.find(q => !q.taken && q !== mover.home && Math.abs(q.x - anchor.home.x) < 4.6 && Math.abs(q.y - anchor.home.y) < 3.4);
  if (near) { freePosition(mover.home); near.taken = mover; mover.home = near; }
  let back = 0;
  for (const p of [c.a, c.b]) {
    p.el.classList.remove('pairfx');
    // Xuống bậc thang (điểm ngay dưới bục) rồi về THẲNG vị trí của mình — trước đây
    // đường về vòng xuống tận y=90 cuối phòng rồi mới quay lên, rất vô lý.
    walkPath(p, [{ x: p.home.x < 50 ? 47 : 53, y: stageY + 7 }, { x: p.home.x, y: p.home.y }], 'walk', () => { p.state = 'home'; if (++back === 2 && P.onPairHome) P.onPairHome(c); });
  }
  if (P.onPairReturn) P.onPairReturn(c);   // camera bám theo khi đi về chỗ
  promoteStage();
}
function dissolveCouple(c, leaving) {
  const i = couples.indexOf(c); if (i >= 0) couples.splice(i, 1);
  const qi = stageQueue.indexOf(c); if (qi >= 0) { stageQueue.splice(qi, 1); notifyQueue(); }
  if (c.spot >= 0) { stageSlots[c.spot] = null; promoteStage(); }
  const other = leaving === c.a ? c.b : c.a;
  if (other && people.get(other.user.id) === other) {
    other.couple = null; other.boost = 1;
    other.el.classList.remove('pairfx');
    setOutfit(other, 'casual');
    walkTo(other, { x: other.home.x, y: other.home.y }, 'walk', () => { other.state = 'home'; });
  }
}
P.featured = () => stageSlots[0];
P.staged = () => stageSlots.map((c, i) => c ? { couple: c, spot: i } : null).filter(Boolean);
/* Thông số tinh chỉnh — main.js nạp từ config (mapping) qua setTune */
P.tune = { boost: 1.32, scaleC: 1.22, scaleS: 1.22, maxStage: 3, priorityOn: true, crowdMin: 70, staleMin: 4, innerRatio: 0.45, quietMax: 15 };
P.setTune = function (t) {
  if (!t) return;
  for (const k of ['boost', 'scaleC', 'scaleS', 'maxStage']) {
    const v = Number(t[k]);
    if (isFinite(v) && v > 0) P.tune[k] = v;
  }
  // Cơ chế ưu tiên chỗ trong cho khách mới (khi đông người) + ngưỡng phòng vắng
  for (const k of ['crowdMin', 'staleMin', 'quietMax']) {
    const v = Number(t[k]);
    if (isFinite(v) && v > 0) P.tune[k] = v;
  }
  const ir = Number(t.innerRatio);
  if (isFinite(ir) && ir > 0.1 && ir < 0.9) P.tune.innerRatio = ir;
  if (typeof t.priorityOn === 'boolean') P.tune.priorityOn = t.priorityOn;
  // Khoảng cách đội hình trên bục cũng chỉnh được từ config
  const offC = Number(t.pairOffC), offS = Number(t.pairOffS), side = Number(t.spotSide);
  if (isFinite(offC) && offC > 0) STAGE_FRAME.pairOff[0] = offC;
  if (isFinite(offS) && offS > 0) { STAGE_FRAME.pairOff[1] = offS; STAGE_FRAME.pairOff[2] = offS; }
  if (isFinite(side) && side > 20 && side < 50) { STAGE_FRAME.spots[1] = side; STAGE_FRAME.spots[2] = 100 - side; }
};
P.coupleOf = function (uid) { const p = people.get(uid); return p ? p.couple : null; };
P.danceAll = function (sec = 5) {
  for (const p of people.values()) { p.el.classList.add('dance'); setTimeout(() => p.el.classList.remove('dance'), sec * 1000); }
};
P.setCrown = function (couple) {
  document.querySelectorAll('.person .crown').forEach(e => e.remove());
  if (!couple) return;
  for (const p of [couple.a, couple.b]) {
    if (!p || !p.el) continue;
    const s = document.createElement('span');
    s.className = 'crown'; s.textContent = '👑';
    p.el.appendChild(s);
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
P.init = function (container, tablesEl) {
  box = container; tablesBox = tablesEl || null;
  const tables = buildPositions();
  if (tablesBox) {
    tablesBox.innerHTML = '';
    for (const t of tables) {
      const d = document.createElement('div');
      d.className = 'wtable';
      d.style.left = t.x + '%'; d.style.top = t.y + '%';
      tablesBox.appendChild(d);
    }
  }
  requestAnimationFrame(loop);
};
P.resize = function (w, h) { Ww = w; Hw = h; FH = h * 0.05; for (const p of people.values()) p.dirty = true; };
P.setStageY = function (y) { stageY = y; };
/* Nạp KHUNG theo file nền: đường đứng sân khấu + mép sàn + bảng bàn + lưới tìm
   đường + pool vị trí đều khớp với tranh của nền đó. Người đang đứng mà vị trí
   cũ lọt vào bàn theo khung mới thì được dời sang vị trí an toàn gần nhất. */
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
  for (const p of people.values()) {
    if (p.couple || p.state !== 'home') continue;
    if (inTable(p.home.x, p.home.y, 0.2, 0.15, null) || inKeepClear(p.home.x, p.home.y) || inAisle(p.home.x, p.home.y)) {
      const np = takePosition();
      if (np) { p.home.taken = null; np.taken = p; p.home = np; walkTo(p, { x: np.x, y: np.y }, 'walk', () => { p.state = 'home'; }); }
    }
  }
};
P.coupleSec = 25;
