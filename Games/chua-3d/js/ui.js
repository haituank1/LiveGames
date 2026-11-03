/* Giao diện 2D phủ trên game: tên + avatar trên đầu, popup quà, banner, bảng công đức, trạng thái kết nối.
   Tên người xem đến từ TikTok nên luôn dùng textContent, không dùng innerHTML. */
(function () {
'use strict';
const T = window.Temple, C = T.crowd;
const U = (T.ui = {});
const $ = id => document.getElementById(id);
let tagCv, tg, fxCv, fc, W = 1, H = 1, DPR = 1;   // tg: tên (dưới lớp người), fc: bong bóng chat, "+điểm" (trên cùng)
let K = 1.2, SAFE = 13;   // cỡ chữ (1 = 100%), % phía trên chừa cho giao diện TikTok – chỉnh ở trang quản trị
let SIDE = 9;             // % mỗi bên bị cắt trên điện thoại (màn hình 19.5:9 cắt khoảng 9% mỗi bên khung 9:16)
let NK = 1;               // cỡ tên dưới chân nhân vật (1 = 100%)
U.pdOf = () => '';        // pháp danh theo user.id (main.js gán lại)

const hue = s => { let h = 0; for (const ch of String(s)) h = (h * 31 + ch.codePointAt(0)) % 360; return h; };
const initial = u => (Array.from(String(u.nickname || '?').trim())[0] || '?').toUpperCase();

/* ảnh avatar dùng cho canvas tên */
const avatars = new Map();
function avatarImg(url) {
  if (!url) return null;
  let a = avatars.get(url);
  if (!a) {
    a = { img: new Image(), ok: false };
    a.img.referrerPolicy = 'no-referrer';
    a.img.onload = () => { a.ok = true; };
    a.img.src = url;
    avatars.set(url, a);
    if (avatars.size > 1500) avatars.delete(avatars.keys().next().value);
  }
  return a.ok ? a.img : null;
}
function avatarEl(user) {
  const d = document.createElement('div');
  d.className = 'av';
  d.style.background = `hsl(${hue(user.id)},55%,48%)`;
  d.textContent = initial(user);
  if (user.avatar) {
    const im = document.createElement('img');
    im.referrerPolicy = 'no-referrer';
    im.onload = () => { d.textContent = ''; d.appendChild(im); };
    im.src = user.avatar;
  }
  return d;
}

U.init = function () {
  tagCv = $('tags'); tg = tagCv.getContext('2d');
  fxCv = $('fx'); fc = fxCv.getContext('2d');
};
U.resize = function (w, h, dpr) {
  W = w; H = h; DPR = dpr;
  tagCv.width = fxCv.width = Math.round(w * dpr); tagCv.height = fxCv.height = Math.round(h * dpr);
  document.documentElement.style.setProperty('--u0', (w / 100) + 'px');
  applyLayout();
};
/* cỡ chữ (%), phần trên cùng chừa cho TikTok (% chiều cao khung), cỡ tên nhân vật (%), phần hai bên bị cắt (% bề ngang) */
U.layout = function (uiScale, safeTop, nameScale, safeSide) {
  if (uiScale != null) K = Math.max(0.6, Math.min(2, uiScale / 100));
  if (safeTop != null) SAFE = Math.max(0, Math.min(40, safeTop));
  if (nameScale != null) NK = Math.max(0.5, Math.min(2, nameScale / 100));
  if (safeSide != null) SIDE = Math.max(0, Math.min(25, safeSide));
  applyLayout();
};
function applyLayout() {
  const st = document.documentElement.style;
  st.setProperty('--k', K);
  st.setProperty('--safe', Math.round(H * SAFE / 100) + 'px');
  st.setProperty('--side', Math.round(W * SIDE / 100) + 'px');
}

/* Bật / tắt từng loại thông báo (main.js truyền cấu hình "show" từ trang quản trị; thiếu = bật):
   rulesBox (khung luật), boardTop10 (bảng top 10), toastTop (thông báo lên đệm), nameTags (tên dưới chân), bubbleChat (bong bóng) */
let SHOW = {};
const on = k => SHOW[k] !== false;
let lastTop = [];
U.setShow = function (s) {
  SHOW = s || {};
  $('rules').style.display = on('rulesBox') ? '' : 'none';
  U.board(lastTop);
  if (!on('toastTop')) while (toasts.length) dropToast(toasts[0]);
};

/* ---------- Thông báo dưới bảng Top 10 (gộp combo giống TikTok) ----------
   kind: 'gift' (tặng quà, hồng tím) | 'vip' (lên đệm top, vàng) */
const toasts = [];
U.toast = function (user, text, count, kind = 'gift') {
  const key = user.id + '|' + text;
  let t = toasts.find(x => x.key === key);
  if (t) {
    t.count += count || 0;
    t.x.textContent = t.count > 1 ? 'x' + t.count : '';
    t.el.classList.remove('bump'); void t.el.offsetWidth; t.el.classList.add('bump');
  } else {
    const el = document.createElement('div'); el.className = 'toast ' + kind;
    const tx = document.createElement('div'); tx.className = 'tx';
    const b = document.createElement('b'); b.textContent = user.nickname;
    const sp = document.createElement('span'); sp.textContent = text;
    tx.append(b, sp);
    const x = document.createElement('i'); x.className = 'x';
    t = { key, el, x, count: count || 0 };
    x.textContent = t.count > 1 ? 'x' + t.count : '';
    el.append(avatarEl(user), tx, x);
    $('toasts').appendChild(el);
    toasts.push(t);
    while (toasts.length > 4) dropToast(toasts[0]);
  }
  clearTimeout(t.timer);
  t.timer = setTimeout(() => dropToast(t), 4000);
};
function dropToast(t) {
  const i = toasts.indexOf(t);
  if (i >= 0) toasts.splice(i, 1);
  clearTimeout(t.timer);
  t.el.classList.add('out');
  setTimeout(() => t.el.remove(), 300);
}

/* ---------- Banner trên cùng (quà lớn) ---------- */
const bannerQ = [];
let bannerBusy = false;
U.banner = function (user, text) {
  bannerQ.push({ user, text });
  if (bannerQ.length > 10) bannerQ.shift();
  if (!bannerBusy) nextBanner();
};
function nextBanner() {
  const b = bannerQ.shift(), el = $('banner');
  if (!b) { bannerBusy = false; el.classList.remove('on'); return; }
  bannerBusy = true;
  el.textContent = '';
  const name = document.createElement('b'); name.textContent = b.user.nickname;
  el.append('✨ ', name, ' ' + b.text);
  el.classList.add('on');
  setTimeout(() => { el.classList.remove('on'); setTimeout(nextBanner, 400); }, 4500);
}

/* ---------- Bảng công đức: top [{ user, total }] đã sắp xếp ---------- */
U.board = function (top) {
  lastTop = top || [];
  const ol = $('board').querySelector('ol');
  ol.textContent = '';
  for (const s of top) {
    const li = document.createElement('li');
    const n = document.createElement('span'); n.textContent = (U.pdOf(s.user.id) ? '🪷' : '') + s.user.nickname;
    const v = document.createElement('em'); v.textContent = s.total.toLocaleString('vi-VN');
    li.append(n, v);
    ol.appendChild(li);
  }
  $('board').style.display = top.length && on('boardTop10') ? '' : 'none';
};

/* Luật tính điểm hiện ở khung góc trên trái, để người xem biết cách lên top.
   Câu chữ sửa ở trang quản trị (rulesLines, mỗi dòng một câu); đây chỉ là bản dự phòng cho ?demo=1.
   {giay} {diem}: ở lại mỗi bao nhiêu giây được bao nhiêu · {binhluan} · {xu}: mỗi 1 xu · {follow} · {tim}: số tim để vào chùa ngồi.
   Dòng nào có số bằng 0 (vd. tắt điểm bình luận) thì tự ẩn. */
const RULES = ['🙏 Bình luận / {tim} tim → vào chùa ngồi', '⏱ Mỗi {giay} giây: +{diem} công đức', '💬 Bình luận: +{binhluan} công đức', '🎁 1 xu: +{xu} công đức',
  '➕ Follow: +{follow} công đức', '🏆 Top 10 được lên đệm'];
let rulesLines = RULES;
U.rules = function (P, lines) {
  if (Array.isArray(lines) && lines.length) rulesLines = lines;
  const val = { giay: P.tickSec, diem: P.tick, binhluan: P.chat, xu: P.perDiamond, follow: P.follow, tim: P.seatLikes };
  const el = $('rules');
  el.textContent = '';
  for (const t of rulesLines) {
    let zero = false;
    const text = t.replace(/\{(\w+)\}/g, (m, k) => { if (!(k in val)) return m; if (!val[k]) zero = true; return val[k]; });
    if (zero) continue;
    const d = document.createElement('div'); d.textContent = text; el.appendChild(d);
  }
};

/* ---------- "Tặng gì – được gì": mỗi 4 giây đổi một dòng ---------- */
let guideLines = [], guideIdx = 0, guideTimer = 0;
U.guide = function (lines, on) {
  const next = on === false ? [] : (lines || []).filter(Boolean);
  if (next.join('\n') === guideLines.join('\n')) return;   // cấu hình khác đổi thì không chạy lại từ đầu
  guideLines = next;
  clearInterval(guideTimer);
  const el = $('guide');
  if (!guideLines.length) { el.textContent = ''; return; }
  guideIdx %= guideLines.length;
  el.textContent = guideLines[guideIdx];
  guideTimer = setInterval(() => {
    el.classList.add('out');
    setTimeout(() => {
      guideIdx = (guideIdx + 1) % guideLines.length;
      el.textContent = guideLines[guideIdx];
      el.classList.remove('out');
    }, 350);
  }, 4000);
};

/* "+N" bay lên trên đầu nhân vật khi được cộng điểm */
U.float = function (p, text) {
  (p.floats || (p.floats = [])).push({ text, t: performance.now() });
  if (p.floats.length > 4) p.floats.shift();
};

/* ---------- Khung bình luận (giống TikTok: dòng mới ở dưới, dòng cũ mờ dần) ---------- */
let chatOn = false;   // TikTok tự hiện bình luận; bật lại ở trang quản trị nếu cần
U.showChat = function (on) { chatOn = on; $('chat').style.display = on ? '' : 'none'; };
// kind: 'chat' (bình luận), 'gift' (tặng quà), 'sys' (vào phòng, follow...)
function feedLine(user, text, kind) {
  if (!chatOn) return;
  const row = document.createElement('div'); row.className = 'ln ' + kind;
  const body = document.createElement('div'); body.className = 'bd';
  const name = document.createElement('b'); name.textContent = user.nickname;
  const msg = document.createElement('span'); msg.textContent = text;
  body.append(name, msg);
  row.append(avatarEl(user), body);
  const box = $('chat');
  box.appendChild(row);
  while (box.childNodes.length > 8) box.firstChild.remove();
}
U.chat = (user, text) => feedLine(user, text, 'chat');
U.feed = (user, text, kind = 'sys') => feedLine(user, text, kind);

/* ---------- Thầy hiện lên nói một câu rồi lui vào ----------
   Có file thay.png / thay.webp trong thư mục game thì dùng ảnh đó thay cho hình vẽ sẵn */
(function loadMonkPic() {
  const tryLoad = names => {
    if (!names.length) return;
    const img = new Image();
    img.onload = () => { const pic = document.querySelector('#monk .pic'); pic.textContent = ''; pic.appendChild(img); };
    img.onerror = () => tryLoad(names.slice(1));
    img.src = names[0];
  };
  tryLoad(['thay.png', 'thay.webp']);
})();
let monkTimer = 0;
U.monk = function (text, name = 'Thầy', sec = 8) {
  const el = $('monk'), L = $('left');
  el.style.top = (L.offsetTop + L.offsetHeight) + 'px';   // ngay dưới khung luật điểm + dòng hướng dẫn
  el.querySelector('.say b').textContent = name;
  el.querySelector('.say span').textContent = text;
  el.classList.add('on');
  clearTimeout(monkTimer);
  monkTimer = setTimeout(() => el.classList.remove('on'), sec * 1000);
};

U.status = function (text, kind) {   // text rỗng = ẩn hẳn
  const el = $('status');
  el.textContent = text || '';
  el.className = kind || '';
  el.style.display = text ? '' : 'none';
};
U.flash = function () {
  const el = $('flash');
  el.classList.remove('on'); void el.offsetWidth; el.classList.add('on');
};

/* ---------- Tên + avatar dưới chân người chơi (một canvas 2D cho tất cả, nằm DƯỚI lớp nhân vật 3D:
   người đè lên đoạn nào thì đoạn đó bị che, ưu tiên thấy người) ---------- */
const order = [], pt = { x: 0, y: 0 }, hp = { x: 0, y: 0 };
let lastFont = '';
function fitText(ctx, s, maxW) {
  if (ctx.measureText(s).width <= maxW) return s;
  const ch = Array.from(s);
  while (ch.length > 1 && ctx.measureText(ch.join('') + '…').width > maxW) ch.pop();
  return ch.join('') + '…';
}
U.drawTags = function () {
  tg.setTransform(1, 0, 0, 1, 0, 0);
  tg.clearRect(0, 0, tagCv.width, tagCv.height);
  fc.setTransform(1, 0, 0, 1, 0, 0);
  fc.clearRect(0, 0, fxCv.width, fxCv.height);
  const now = performance.now();
  order.length = 0;
  for (const p of C.people) if (p.user) order.push(p);
  // xa vẽ trước, gần vẽ đè lên; tên top 10 vẽ sau cùng để không bị tên đám đông che
  order.sort((a, b) => ((a.vipRank >= 0) - (b.vipRank >= 0)) || a.z - b.z);
  tg.setTransform(DPR, 0, 0, DPR, 0, 0);
  fc.setTransform(DPR, 0, 0, DPR, 0, 0);
  // tên nhỏ, nằm dưới chân nhân vật; bong bóng chat, "+điểm" ở trên đầu
  const fs = Math.max(8, W * 0.016 * NK), r = fs * 0.72, h = r * 2 + 3;
  const font = `600 ${fs}px system-ui,-apple-system,"Segoe UI",sans-serif`;
  tg.font = font;
  if (font !== lastFont) { lastFont = font; for (const p of order) p.tagMax = -1; }   // đổi cỡ chữ thì đo lại tên
  tg.textBaseline = 'middle';
  for (const p of order) {
    C.project(p, W, H, hp);                      // đỉnh đầu: bong bóng chat, "+điểm"
    if (p.say && now < p.sayUntil && on('bubbleChat')) bubbles.push(p, hp.x, hp.y);
    if (p.floats && p.floats.length) floats.push(p, hp.x, hp.y);
    if (!on('nameTags')) continue;
    C.projectPoint(p.x, 0, p.z, W, H, pt);       // chân: tên
    // người trên đệm ngồi sát nhau nên tên được cắt ngắn hơn
    const maxW = W * (p.vipRank >= 0 ? 0.08 : 0.15) * NK;
    // đã follow (có pháp danh): thêm "🪷 pháp danh" màu vàng sau tên (trên đệm chỉ thêm 🪷 cho gọn)
    const pd = U.pdOf(p.user.id);
    const src = p.user.nickname + '|' + pd;
    if (p.tagSrc !== src || p.tagMax !== maxW) {
      p.tagSrc = src; p.tagMax = maxW;
      p.tagPd = pd ? (p.vipRank >= 0 ? ' 🪷' : ' 🪷' + pd) : '';
      p.tagPdW = p.tagPd ? tg.measureText(p.tagPd).width : 0;
      p.tagName = fitText(tg, p.user.nickname, Math.max(W * 0.05, maxW - p.tagPdW));
      p.tagW = tg.measureText(p.tagName).width + p.tagPdW;
    }
    const w = p.tagW + h + 6, left = pt.x - w / 2, top = pt.y + 1;
    const hl = p.hl > 0;
    tg.fillStyle = hl ? 'rgba(200,140,20,.85)' : 'rgba(0,0,0,.45)';
    tg.beginPath();
    if (tg.roundRect) tg.roundRect(left, top, w, h, h / 2); else tg.rect(left, top, w, h);
    tg.fill();
    if (pd) { tg.strokeStyle = 'rgba(255,210,110,.95)'; tg.lineWidth = 1.5; tg.stroke(); }
    const cx = left + h / 2, cy = top + h / 2;
    const img = avatarImg(p.user.avatar);
    if (img) {
      tg.save(); tg.beginPath(); tg.arc(cx, cy, r, 0, Math.PI * 2); tg.clip();
      tg.drawImage(img, cx - r, cy - r, r * 2, r * 2);
      tg.restore();
    } else {
      tg.fillStyle = `hsl(${hue(p.user.id)},55%,50%)`;
      tg.beginPath(); tg.arc(cx, cy, r, 0, Math.PI * 2); tg.fill();
    }
    tg.fillStyle = '#fff';
    tg.fillText(p.tagName, left + h + 2, cy + 0.5);
    if (p.tagPd) { tg.fillStyle = '#ffd27a'; tg.fillText(p.tagPd, left + h + 2 + p.tagW - p.tagPdW, cy + 0.5); }
    if (p.vipRank >= 0) {   // huy hiệu hạng bên trái tên (hạng thật `topRank`, không phải số đệm `vipRank`)
      const tr = p.topRank >= 0 ? p.topRank : p.vipRank, bx = left - r * 0.6, rank = String(tr + 1);
      tg.fillStyle = tr < 3 ? '#f2b632' : '#c9ccd4';
      tg.beginPath(); tg.arc(bx, cy, r * 0.85, 0, Math.PI * 2); tg.fill();
      tg.fillStyle = '#3a1f00'; tg.textAlign = 'center';
      tg.fillText(rank, bx, cy + 0.5);
      tg.textAlign = 'start';
    }
  }
  // bong bóng chat, "+điểm" theo cỡ chữ chung (to hơn tên cho dễ đọc)
  const bfs = Math.max(9, W * 0.022 * K);
  drawBubbles(bfs, bfs * 1.5 + 4);
  drawFloats(bfs);
};

/* chữ "+N" vàng bay lên rồi mờ dần trong 1.6 giây */
const floats = [];
function drawFloats(fs) {
  const now = performance.now();
  fc.font = `800 ${fs * 1.3}px system-ui,-apple-system,"Segoe UI",sans-serif`;
  fc.textAlign = 'center'; fc.lineWidth = 3; fc.strokeStyle = 'rgba(60,25,0,.85)'; fc.fillStyle = '#ffd34d';
  for (let i = 0; i < floats.length; i += 3) {
    const p = floats[i], x = floats[i + 1], top = floats[i + 2];
    p.floats = p.floats.filter(f => now - f.t < 1600);
    p.floats.forEach((f, k) => {
      const a = (now - f.t) / 1600;
      const y = top - fs * 0.9 - a * fs * 2.2 - k * fs * 0.2;
      fc.globalAlpha = 1 - a * a;
      fc.strokeText(f.text, x, y); fc.fillText(f.text, x, y);
    });
  }
  fc.globalAlpha = 1; fc.textAlign = 'start';
  floats.length = 0;
}

/* Bong bóng bình luận trên đầu người vừa chat (vẽ sau cùng để không bị tên khác che) */
const bubbles = [];
function drawBubbles(fs, h) {
  const now = performance.now();
  fc.textBaseline = 'middle';
  fc.font = `600 ${fs}px system-ui,-apple-system,"Segoe UI",sans-serif`;
  // chat dồn dập: chỉ giữ 6 bong bóng mới nhất cho đỡ che người
  if (bubbles.length > 18) {
    const keep = [];
    for (let i = 0; i < bubbles.length; i += 3) keep.push(bubbles.slice(i, i + 3));
    keep.sort((a, b) => b[0].sayUntil - a[0].sayUntil);
    bubbles.length = 0;
    for (const k of keep.slice(0, 6)) bubbles.push(...k);
  }
  for (let i = 0; i < bubbles.length; i += 3) {
    const p = bubbles[i], x = bubbles[i + 1], headY = bubbles[i + 2];
    if (p.saySrc !== p.say || p.sayFs !== fs) { p.saySrc = p.say; p.sayFs = fs; p.sayFit = fitText(fc, p.say, W * 0.42); p.sayW = fc.measureText(p.sayFit).width; }
    const w = p.sayW + 14, bh = h + 2, left = Math.max(2, Math.min(W - w - 2, x - w / 2)), top = headY - bh - 7;
    fc.globalAlpha = Math.min(1, (p.sayUntil - now) / 400);
    fc.fillStyle = 'rgba(255,255,255,.94)';
    fc.beginPath();
    if (fc.roundRect) fc.roundRect(left, top, w, bh, 8); else fc.rect(left, top, w, bh);
    fc.moveTo(x - 5, top + bh); fc.lineTo(x, top + bh + 6); fc.lineTo(x + 5, top + bh);
    fc.fill();
    fc.fillStyle = '#2a1a10';
    fc.fillText(p.sayFit, left + 7, top + bh / 2 + 0.5);
    fc.globalAlpha = 1;
  }
  bubbles.length = 0;
}
})();
