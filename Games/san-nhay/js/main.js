/* Sàn Nhảy Quẩy Max V4 – PHÒNG BAR 1 NỀN + CAMERA ĐẠO DIỄN THEO ƯU TIÊN.
   - Phòng: MỘT ảnh bg-bar.webp (BAR-LAYOUT.md), camera là cửa sổ 9:16 lia trong phòng bằng
     lò xo giảm chấn 60fps (port từ game đám cưới: damp + clampXY + culling mỗi ~220ms).
   - ĐẠO DIỄN CAMERA (ưu tiên cao nhất theo yêu cầu): hàng đợi có điểm ưu tiên —
     quà càng to điểm càng cao, lên LV ngang hàng quà lớn. Điểm: quà ≥1000: 120 · ≥299: 100 ·
     LÊN LV: 95 · quà ≥99: 85 · solo AU: 70 · quà ≥10: 65 · nhảy đôi: 60 · người mới rơi vào: 55 · tour: 10.
     Cảnh mới điểm cao hơn được CHÈN sau thời gian giữ tối thiểu của cảnh hiện tại (directorMinHoldSec).
   - Vào phòng = RƠI TỪ TRÊN CAO xuống ô cố định (js/dancers.js), camera bám theo cú rơi.
   - Lưu trữ localStorage theo id TikTok: GIỮ 7 NGÀY (quá hạn tự xoá), tiến trình TUẦN
     (điểm bảng vàng / quà tuần / XP tuần) RESET MỖI THỨ 6 (resetDay cấu hình được). LV tính từ XP tích lũy.
   - Trang phục/phụ kiện theo LV: để sau (Nguyen: "phần nhân vật tính sau") — đã có sẵn móc:
     huy hiệu LV + vòng hào quang theo bậc + vương miện LV10+ + cỡ người theo LV + lớp .acc trống. */
(function () {
'use strict';
const W = (window.Party = window.Party || {});
const FX = W.effects, A = W.audio, P = W.dancers;
const q = new URLSearchParams(location.search);
const isDemo = q.has('demo');
const $ = id => document.getElementById(id);
const rand = (a, b) => a + Math.random() * (b - a);
const stageEl = $('stage'), statusEl = $('status'), worldEl = $('world');
const say = (html, cls) => { statusEl.className = cls || ''; statusEl.innerHTML = html; };
const esc = s => String(s).replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
const fmtNum = n => n >= 10000 ? (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k' : String(Math.round(n));
const noAccent = s => String(s || '').toLocaleLowerCase('vi').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd');
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const nowMs = () => performance.now();

/* ============ Cấu hình: mặc định tại máy (khớp mapping) — LiveBridge config ghi đè ============ */
const DEFAULTS = {
  musicOn: true, musicShuffle: true, musicVolume: 40, sfxOn: true, sfxVolume: 70,
  soloSec: 20, pairSec: 20,
  camHomeZoom: 0.62, zoomEntry: 1.02, zoomEntryVip: 1.15, zoomGiftMid: 1.08, zoomGiftBig: 1.18,
  zoomGiftHuge: 1.32, zoomLevelup: 1.18, zoomSolo: 1.12, zoomPairMax: 1.1,
  durEntry: 3.6, durGiftMid: 5, durGiftBig: 7, durGiftHuge: 8.5, durLevelup: 6, directorMinHoldSec: 1.2,
  staffThreshold: 14, retentionDays: 7, resetDay: 5,
  xpPerComment: 2, xpPerGiftCoin: 2, xpPerFollow: 5, xpPer100Likes: 5, soloXpDiv: 15, pairXp: 15,
  levelXp: [0, 100, 250, 450, 700, 1000, 1400, 1900, 2500, 3200, 4000, 5000, 6200, 7600, 9200, 11000, 13000, 15500, 18500, 22000],
  lvScaleMax: 1.25, entryFlairLv: 5, entryFlairLv2: 10, dropHeight: 40, dropHeightVip: 48,
  lamMoKhiLia: true, doMoPhanConLai: 0.55, tocDoNhay: 'thuong', partyMaxNhanhHon: true,
  guideLines: [], funnyLines: [],
};
let cfg = { ...DEFAULTS };

/* ============ LƯU TRỮ NGƯỜI CHƠI: giữ 7 ngày · reset tuần mỗi thứ 6 ============ */
const LS_USERS = isDemo ? 'sannhay.users.v4.demo' : 'sannhay.users.v4';
function weekKeyOf(date, resetDay) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diff = (d.getDay() - resetDay + 7) % 7;         // lùi về ngày reset gần nhất (kể cả hôm nay)
  d.setDate(d.getDate() - diff);
  return d.toISOString().slice(0, 10);
}
function daysToReset(resetDay) {
  const today = new Date().getDay();
  return (resetDay - today + 7) % 7;
}
let users = {};
try { users = JSON.parse(localStorage.getItem(LS_USERS) || '{}'); } catch (e) { users = {}; }
let saveTimer = 0;
function saveUsers() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => { try { localStorage.setItem(LS_USERS, JSON.stringify(users)); } catch (e) { /* đầy bộ nhớ: bỏ qua */ } }, 600);
}
function storeInit() {
  const keepMs = (cfg.retentionDays || 7) * 864e5;
  const wk = weekKeyOf(new Date(), cfg.resetDay != null ? cfg.resetDay : 5);
  let changed = false;
  for (const id of Object.keys(users)) {
    const r = users[id];
    if (!r || !r.lastSeen || Date.now() - r.lastSeen > keepMs) { delete users[id]; changed = true; continue; }
    if (r.weekKey !== wk) { r.weekGifts = 0; r.weekScore = 0; r.weekXp = 0; r.weekKey = wk; changed = true; }
  }
  if (changed) saveUsers();
}
function recordOf(user) {
  if (!user || !user.id) return null;
  let r = users[user.id];
  const wk = weekKeyOf(new Date(), cfg.resetDay != null ? cfg.resetDay : 5);
  if (!r) {
    r = users[user.id] = { name: user.nickname || '', cls: null, xp: 0, gifts: 0, weekGifts: 0, weekScore: 0, weekXp: 0, likes: 0, lastSeen: Date.now(), weekKey: wk };
  }
  if (r.weekKey !== wk) { r.weekGifts = 0; r.weekScore = 0; r.weekXp = 0; r.weekKey = wk; }
  r.name = user.nickname || r.name;
  r.lastSeen = Date.now();
  return r;
}
function lvOf(xp) {
  const arr = cfg.levelXp || DEFAULTS.levelXp;
  let lv = 1;
  for (let i = 0; i < arr.length; i++) if (xp >= arr[i]) lv = i + 1;
  return Math.min(lv, arr.length);
}
function flairOf(lv) { return lv >= (cfg.entryFlairLv2 || 10) ? 2 : lv >= (cfg.entryFlairLv || 5) ? 1 : 0; }

/* ============ Trạng thái chung ============ */
const known = new Map();
let viewersNow = 0;
function register(user) {
  if (!user || !user.id) return null;
  const old = known.get(user.id);
  const u = old ? { ...old, ...user, avatar: user.avatar || old.avatar } : { ...user };
  known.set(user.id, u);
  return u;
}
function ensureDancer(user, opts = {}) {
  const isNewUser = user && !known.has(user.id);
  const u = register(user);
  if (!u) return null;
  const rec = recordOf(u);
  const existing = P.get(u.id);
  if (existing) { saveUsers(); return existing; }
  const lv = lvOf(rec.xp);
  const p = P.spawn(u, { cls: rec.cls || undefined, lv, flair: flairOf(lv), instant: !!opts.instant });
  if (p) {
    if (!rec.cls) { rec.cls = p.cls; }
    P.setLv(p, lv);
    if (!opts.instant && p.home) {
      Dir.request({
        kind: 'focus', p, prio: 55, dur: cfg.durEntry, expires: nowMs() + 7000,
        zoom: lv >= (cfg.entryFlairLv2 || 10) ? cfg.zoomEntryVip : cfg.zoomEntry, follow: true, vis: 'xung',
        reason: isNewUser ? '👋 NGƯỜI MỚI RƠI XUỐNG SÀN!' : '👋 TRỞ LẠI SÀN!', name: u.nickname,
      });
    }
    screenPush(`👋 ${u.nickname} rơi xuống sàn (ô ${p.home ? p.home.id : '?'})`);
  }
  saveUsers();
  return p;
}
function renderViewers() { $('viewers').textContent = fmtNum(viewersNow || P.realCount()); }

/* ============ XP / LÊN CẤP / ĐIỂM BẢNG VÀNG ============ */
const chatXpAt = new Map();
function addXP(user, pts) {
  if (!user || !user.id || !pts) return;
  const rec = recordOf(user);
  const before = lvOf(rec.xp);
  rec.xp += pts; rec.weekXp += pts;
  const after = lvOf(rec.xp);
  saveUsers();
  if (after > before) levelUp(user, rec, after);
}
function addScore(user, pts) {
  if (!user || !user.id || pts <= 0) return;
  const rec = recordOf(user);
  rec.weekScore += pts;
  saveUsers();
  renderBoard();
}
function levelUp(user, rec, lv) {
  const p = P.get(user.id);
  showBanner(`⭐ LÊN CẤP ${lv} · ${user.nickname}!`, 4200);
  screenPush(`⭐ ${user.nickname} LÊN CẤP ${lv}`);
  toast(`⭐ ${user.nickname} vừa lên cấp ${lv}!`, true);
  A.fanfare();
  if (p) {
    P.setLv(p, lv);
    p.spotUntil = nowMs() + 4000;                        // đỉnh lên cấp: GIF spotlight-dai 4 giây
    refreshVis(p);
    FX.ring(p.x / 100, p.y / 100, '#ffd76a');
    FX.burstAt(p.x / 100, (p.y - 6) / 100, '#ffd76a', 36);
    FX.hearts(8, p.x / 100, (p.y - 12) / 100);
    P.sayBubble(p, `Mình lên cấp ${lv} rồi nè!`);
    Dir.request({
      kind: 'focus', p, prio: 95, dur: cfg.durLevelup, zoom: cfg.zoomLevelup, follow: true, vis: 'spot',
      reason: `⬆ LÊN CẤP ${lv}`, name: user.nickname,
    });
  }
}

/* ============ Bảng vàng tuần ============ */
const TITLES = ['Chủ Tịch', 'Phó Chủ Tịch', 'Thư Ký'];
function topScores(n) {
  return Object.entries(users)
    .filter(([, r]) => r.weekScore > 0)
    .map(([id, r]) => ({ id, nickname: r.name, score: r.weekScore, cls: r.cls }))
    .sort((a, b) => b.score - a.score).slice(0, n);
}
let stageIds = [];
function renderBoard() {
  const top = topScores(5);
  $('gbslots').innerHTML = [0, 1, 2].map(i => {
    const s = top[i];
    if (!s) return `<div class="gbslot"><div class="gb-ph">?</div><div class="gb-info"><div class="gb-ttl">${TITLES[i]}</div><div class="gb-name">Chưa có</div><div class="gb-dia">💎 0</div></div></div>`;
    const img = P.charImg(s.cls || undefined);
    return `<div class="gbslot${i === 0 ? ' first' : ''}"><img class="gb-av" src="${img}" alt=""><div class="gb-info"><div class="gb-ttl">${i === 0 ? '👑 ' : ''}${TITLES[i]}</div><div class="gb-name">${esc(s.nickname)}</div><div class="gb-dia">💎 ${fmtNum(s.score)}</div></div></div>`;
  }).join('');
  $('gbrest').textContent = top.slice(3).map((s, i) => `#${i + 4} ${s.nickname} · 💎${fmtNum(s.score)}`).join('   ');
  const d = daysToReset(cfg.resetDay != null ? cfg.resetDay : 5);
  $('gbreset').textContent = d === 0 ? 'Reset hôm nay (T6)' : `Reset thứ 6 · còn ${d} ngày`;
  P.setLeader(top.length ? top[0].id : null);
  refreshStage(top.slice(0, 3).map(s => s.id));
}
function refreshStage(ids) {
  if (ids.join() === stageIds.join()) return;
  const old = stageIds;
  stageIds = ids;
  for (const id of old) {
    if (ids.includes(id)) continue;
    const p = P.get(id);
    if (p && p.onStage) P.offStage(p);
  }
  ids.forEach((id, i) => {
    const p = P.get(id);
    if (p && !P.busy(p)) P.toStage(p, i);
  });
}
function settleStage(p) {   // dancer rảnh lại -> nếu thuộc top 3 thì về bục
  if (!p || p.staff) return;
  const i = stageIds.indexOf(p.user.id);
  if (i >= 0 && !P.busy(p)) P.toStage(p, i);
}

/* ============ Banner / toast / hướng dẫn ============ */
let bannerTimer = 0;
function showBanner(text, ms = 4600) {
  const el = $('banner');
  el.textContent = text;
  el.classList.add('on');
  clearTimeout(bannerTimer);
  bannerTimer = setTimeout(() => el.classList.remove('on'), ms);
}
function toast(text, vip) {
  const box = $('toasts');
  const t = document.createElement('div');
  t.className = 'toast' + (vip ? ' vip' : '');
  t.textContent = text;
  box.prepend(t);
  while (box.children.length > 2) box.lastChild.remove();
  setTimeout(() => t.classList.add('out'), 5500);
  setTimeout(() => t.remove(), 6100);
}
let guideIdx = 0, guideTimer = null;
function startGuide() {
  const lines = (cfg.guideLines || []).filter(Boolean);
  const el = $('guide');
  if (!lines.length) { el.textContent = ''; return; }
  const show = () => { el.classList.remove('out'); el.textContent = lines[guideIdx++ % lines.length]; };
  show();
  clearInterval(guideTimer);
  guideTimer = setInterval(() => { el.classList.add('out'); setTimeout(show, 380); }, 4200);
}

/* ================================================================
   CAMERA – port kiến trúc game đám cưới: 1 vòng rAF, lò xo giảm chấn
   ================================================================ */
let SW = 0, SH = 0, WW = 0, WH = 0;
const Cam = {
  cx: 50, cy: 43, z: 0.62, tx: 50, ty: 43, tz: 0.62,
  apply() {
    if (!WW) return;
    const px = SW / 2 - (this.cx / 100 * WW) * this.z;
    const py = SH / 2 - (this.cy / 100 * WH) * this.z;
    worldEl.style.transform = `translate(${px.toFixed(1)}px,${py.toFixed(1)}px) scale(${this.z})`;
  },
  clampXY(cx, cy, z) {
    const halfW = (SW / 2) / z / WW * 100, halfH = (SH / 2) / z / WH * 100;
    const mX = Math.min(halfW, 49), mY = Math.min(halfH, 49);
    return [Math.max(mX, Math.min(100 - mX, cx)), Math.max(mY, Math.min(100 - mY, cy))];
  },
  panTo(cx, cy, z) {
    const [x, y] = this.clampXY(cx, cy, z);
    this.tx = x; this.ty = y; this.tz = z;
  },
  home() { this.panTo(50, 43, cfg.camHomeZoom || 0.62); },
  overview() { this.panTo(50, 52, Math.max(0.4, SW / WW)); },
  cullNow() {
    const mx = (SW / 2) / this.z / WW * 100 + 7, my = (SH / 2) / this.z / WH * 100 + 7;
    P.cull(this.cx - mx, this.cy - my, this.cx + mx, this.cy + my);
  },
};
function fitZoom(a, b, padX, padY, zMax) {   // zoom vừa đủ để CẢ HAI người lọt khung (theo tỉ lệ thế giới V4)
  const zx = 38.1 / (Math.abs(a.x - b.x) + padX);
  const zy = 33.9 / (Math.abs(a.y - b.y) + padY);
  return clamp(Math.min(zx, zy), 0.5, zMax);
}
function damp(cur, target, vel, smoothTime, dt) {
  const omega = 2 / smoothTime;
  const x = omega * dt;
  const e = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);
  const change = cur - target;
  const temp = (vel + omega * change) * dt;
  let v = (vel - omega * temp) * e;
  let out = target + (change + temp) * e;
  if ((target - cur > 0) === (out > target)) { out = target; v = 0; }
  return [out, v];
}
let camLastT = 0, camCullT = 0;
function camLoop(t) {
  requestAnimationFrame(camLoop);
  if (!WW) return;
  const dt = Math.min(0.05, camLastT ? (t - camLastT) / 1000 : 0.016);
  camLastT = t;
  const cur = Dir.cur;
  if (cur && cur.follow) {
    if (cur.kind === 'focus' && cur.p) {
      const [x, y] = Cam.clampXY(cur.p.x, cur.p.y - 4, cur.zoom);
      Cam.tx = x; Cam.ty = y; Cam.tz = cur.zoom;
    } else if (cur.kind === 'pair' && cur.pair) {
      const [a, b] = cur.pair;
      Cam.tz = fitZoom(a, b, 24, 18, cur.zoom);
      const [x, y] = Cam.clampXY((a.x + b.x) / 2, (a.y + b.y) / 2 - 3, Cam.tz);
      Cam.tx = x; Cam.ty = y;
    }
  }
  [Cam.cx, Cam.vx] = damp(Cam.cx, Cam.tx, Cam.vx || 0, 0.55, dt);
  [Cam.cy, Cam.vy] = damp(Cam.cy, Cam.ty, Cam.vy || 0, 0.55, dt);
  [Cam.z, Cam.vz] = damp(Cam.z, Cam.tz, Cam.vz || 0, 0.75, dt);
  Cam.apply();
  if (t - camCullT > 220) { camCullT = t; Cam.cullNow(); }
}
requestAnimationFrame(camLoop);

/* ================================================================
   ĐẠO DIỄN CAMERA – hàng đợi ưu tiên (quà to > lên LV > quà vừa > solo > đôi > vào phòng > tour)
   ================================================================ */
const Dir = {
  cur: null, queue: [], locked: false, lastEndAt: 0,
  request(item) {
    if (camLockMode) return;
    if (this.locked) return;                                   // Party Max đang giữ toàn cảnh
    item.startedAt = 0; item.endAt = 0;
    if (!this.cur) { this.start(item); return; }
    const held = nowMs() - this.cur.startedAt;
    if (item.prio > this.cur.prio && held >= (cfg.directorMinHoldSec || 1.2) * 1000) {
      this.end(this.cur);
      this.start(item);
      return;
    }
    // xếp hàng: bỏ cảnh trùng người + trùng loại, giữ tối đa 6 cảnh điểm cao nhất
    this.queue = this.queue.filter(x => !(x.p && item.p && x.p === item.p && x.prio === item.prio));
    this.queue.push(item);
    this.queue.sort((a, b) => b.prio - a.prio);
    if (this.queue.length > 6) this.queue.length = 6;
  },
  start(item) {
    item.startedAt = nowMs();
    item.endAt = item.startedAt + (item.dur || 6) * 1000;
    this.cur = item;
    if (item.kind === 'overview') { Cam.overview(); }
    else if (item.kind === 'stage') { Cam.panTo(50, 47, 0.85); }
    else if (item.kind === 'pair' && item.pair) {
      const [a, b] = item.pair;
      Cam.tz = fitZoom(a, b, 24, 18, item.zoom);
      Cam.panTo((a.x + b.x) / 2, (a.y + b.y) / 2 - 3, Cam.tz);
    } else if (item.p) {
      Cam.panTo(item.p.x, item.p.y - 4, item.zoom || 1.2);
    }
    if (item.p) P.setFocus(item.p, true);
    if (item.pair) item.pair.forEach(p => P.setFocus(p, true));
    for (const p of itemDancers(item)) refreshVis(p);
    if (item.kind === 'focus' || item.kind === 'pair') {
      const imgP = item.p || (item.pair && item.pair[0]);
      if (imgP) screenShowFocus({ img: P.sped(P.charOf(imgP).xung || P.charOf(imgP).crowd), name: item.name || imgP.user.nickname, sub: item.reason || '' });
    }
    if (item.name || item.reason) showCamtab(item);
    syncDim();
  },
  end(item) {
    if (item.p) P.setFocus(item.p, false);
    if (item.pair) item.pair.forEach(p => P.setFocus(p, false));
    for (const p of itemDancers(item)) { refreshVis(p); settleStage(p); }
    if (this.cur === item) this.cur = null;
    this.lastEndAt = nowMs();
    hideCamtab();
    screenShowDJ();
    syncDim();
  },
  tick() {
    if (camLockMode || this.locked) return;
    const t = nowMs();
    // cảnh điểm cao trong hàng đợi được chèn khi cảnh hiện tại đã giữ đủ lâu
    if (this.cur && this.queue.length) {
      const head = this.queue[0];
      if (head.prio > this.cur.prio && t - this.cur.startedAt >= (cfg.directorMinHoldSec || 1.2) * 1000) {
        this.queue.shift();
        if (!head.expires || t < head.expires) { this.end(this.cur); this.start(head); return; }
      }
    }
    if (this.cur && t >= this.cur.endAt) this.end(this.cur);
    if (!this.cur) {
      while (this.queue.length) {
        const s = this.queue.shift();
        if (s.expires && t > s.expires) continue;
        if (s.p && !P.get(s.p.user.id)) continue;
        this.start(s);
        return;
      }
      if (t - this.lastEndAt > 7000) idleTour();
    }
  },
};
function itemDancers(item) {
  if (!item) return [];
  if (item.pair) return item.pair;
  return item.p ? [item.p] : [];
}
setInterval(() => Dir.tick(), 200);
/* ===== LÀM MỜ PHẦN CÒN LẠI KHI CAMERA LIA (config: lamMoKhiLia / doMoPhanConLai) =====
   Khi đạo diễn giữ 1 cảnh cận cảnh (quà / lên LV / solo / nhảy đôi / người mới rơi xuống),
   #world mang lớp .focusing → mọi dancer bị giảm sáng theo --dimB (CSS), trừ dancer của
   cảnh đó mang .is-focus (cặp đôi: cả 2 cùng sáng). Party Max / toàn cảnh / tour ngắm sàn
   (cảnh gắn noDim) = KHÔNG làm mờ. Gọi ở cuối Dir.start / Dir.end để luôn khớp trạng thái. */
let dimSet = new Set();
function syncDim() {
  const item = (cfg.lamMoKhiLia && !Dir.locked && Dir.cur && !Dir.cur.noDim) ? Dir.cur : null;
  const targets = item ? itemDancers(item) : [];
  worldEl.classList.toggle('focusing', targets.length > 0);
  const next = new Set(targets);
  for (const p of dimSet) if (!next.has(p)) p.el.classList.remove('is-focus');
  for (const p of next) if (!dimSet.has(p)) p.el.classList.add('is-focus');
  dimSet = next;
}
let camtabTimer = 0;
function showCamtab(item) {
  const el = $('camtab');
  el.innerHTML = `<small>${esc(item.reason || '📹 CAMERA')}</small>${esc(item.name || '')}`;
  el.classList.add('on');
  clearTimeout(camtabTimer);
  camtabTimer = setTimeout(() => el.classList.remove('on'), Math.max(2500, (item.dur || 6) * 1000 - 400));
}
function hideCamtab() { $('camtab').classList.remove('on'); }
function idleTour() {
  const free = P.all().filter(p => !P.busy(p));
  if (free.length && Math.random() < 0.7) {
    const p = free[Math.floor(Math.random() * free.length)];
    Dir.request({
      kind: 'focus', p, prio: 10, dur: 6, zoom: 1.05, follow: false, vis: 'xung', noDim: true,
      reason: p.staff ? '🎧 NHÂN VIÊN QUÁN ĐANG QUẨY' : '📹 NGẮM SÀN', name: p.user.nickname,
    });
  } else Cam.home();
  Dir.lastEndAt = nowMs();
}

/* Trạng thái hình ảnh của dancer: spot (chiếm sóng) > xung (được chú ý) > crowd (tại ô) */
let partyUntil = 0;
function refreshVis(p) {
  if (!p) return;
  let vis = 'crowd';
  if (nowMs() < partyUntil) vis = (stageIds[0] === p.user.id) ? 'spot' : 'xung';
  if (p.spotUntil && nowMs() < p.spotUntil) vis = 'spot';
  else if (Dir.cur && itemDancers(Dir.cur).includes(p)) vis = Dir.cur.vis || 'xung';
  else if (solo && solo.p === p) vis = 'xung';
  else if (pair && pair.includes(p)) vis = 'xung';
  P.setVis(p, vis);
}
setInterval(() => { for (const p of P.all()) refreshVis(p); }, 600);

/* ============ Màn LED trên sân khấu ============ */
const screenEvents = ['🎧 DJ đang quẩy nhạc sàn 116 BPM'];
function screenPush(txt) {
  screenEvents.unshift(txt);
  if (screenEvents.length > 6) screenEvents.pop();
  const t = screenEvents.join('   •   ') + '   •   ';
  $('tk1').textContent = t; $('tk2').textContent = t;
}
let screenFocusName = '';
function screenShowDJ() { $('screenFocus').classList.remove('on'); screenFocusName = ''; }
function screenShowFocus(f) {
  $('sfImg').src = f.img;
  $('sfName').textContent = f.name;
  $('sfSub').textContent = f.sub || '';
  $('screenFocus').classList.add('on');
  screenFocusName = f.name;
}
function screenUpdateSub(txt) { if (screenFocusName) $('sfSub').textContent = txt; }

/* ============ Party Energy / PARTY MAX ============ */
let energy = 12, partyFxTimer = null;
function renderEnergy() {
  $('energypct').textContent = Math.round(energy) + '%';
  $('energybar').style.width = Math.min(100, energy) + '%';
}
function addEnergy(n) {
  if (nowMs() < partyUntil) return;
  energy = Math.min(100, energy + n);
  renderEnergy();
  if (energy >= 100) partyMax();
}
function partyMax() {
  energy = 100; renderEnergy();
  partyUntil = nowMs() + 10000;
  Dir.locked = true;
  if (cfg.partyMaxNhanhHon && (cfg.tocDoNhay || 'thuong') !== 'nhanh') { speedOverride = 'nhanh'; applySpeed(); }
  if (Dir.cur) Dir.end(Dir.cur);
  Dir.queue.length = 0;
  Cam.overview();
  stageEl.classList.add('partymax');
  $('beams').classList.add('on');
  FX.setDisco(true);
  const bt = $('bigtext');
  bt.textContent = '🎉 CẢ SÀN CÙNG QUẨY 🎉';
  bt.classList.remove('on'); void bt.offsetWidth; bt.classList.add('on');
  showBanner('⚡ PARTY MAX — CẢ SÀN CÙNG QUẨY! ⚡', 6000);
  screenPush('⚡ PARTY MAX — cả sàn cùng quẩy!');
  A.cheer();
  FX.moneyRain(170); FX.confetti(130); FX.fireworks(3);
  for (const p of P.all()) refreshVis(p);
  clearInterval(partyFxTimer);
  partyFxTimer = setInterval(() => { FX.moneyRain(90); FX.confetti(60); }, 2200);
  setTimeout(() => {
    stageEl.classList.remove('partymax');
    $('beams').classList.remove('on');
    FX.setDisco(false);
    clearInterval(partyFxTimer);
    if (speedOverride) { speedOverride = null; applySpeed(); }
    Dir.locked = false;
    energy = 30; renderEnergy();
    for (const p of P.all()) refreshVis(p);
    Cam.home();
  }, 10000);
}
W.onBeat = function () {
  if (nowMs() < partyUntil || solo) {
    stageEl.classList.add('beat');
    setTimeout(() => stageEl.classList.remove('beat'), 130);
  }
};

/* ============ Lượt solo AU – diễn NGAY TẠI Ô của dancer ============ */
const ARROWS = [
  { s: '←', w: 'trai' }, { s: '↑', w: 'len' }, { s: '↓', w: 'xuong' }, { s: '→', w: 'phai' },
];
const JUDGE_PTS = { PERFECT: 300, GREAT: 200, COOL: 100, BAD: 50, MISS: 0 };
const JUDGES = ['PERFECT', 'GREAT', 'COOL', 'BAD', 'MISS'];
function renderTally() {
  $('tally').style.display = solo ? '' : 'none';
  if (solo) for (const j of JUDGES) $('t-' + j).textContent = solo.tally[j] || 0;
}
let solo = null, soloTimer = null, nextSoloAt = 0, joinOrder = [];
const soloQueue = [];
function renderAU() {
  const who = $('auwho'), steps = $('austeps'), combo = $('aucombo');
  if (!solo) {
    who.textContent = '🎤 Chờ dancer lên sàn…';
    steps.innerHTML = ''; combo.textContent = '';
    renderTally();
    return;
  }
  who.textContent = `🎤 SOLO: ${solo.p.user.nickname} · ${P.charOf(solo.p).name} · Ô ${solo.p.home ? solo.p.home.id : '?'}`;
  combo.textContent = `COMBO x${solo.combo} · ${fmtNum(solo.score)} đ`;
  steps.innerHTML = solo.seq.map((a, i) =>
    `<span class="step${i === solo.idx ? ' cur' : ''}${solo.marks[i] ? (solo.marks[i] === 'MISS' ? ' missed' : ' ok') : ''}">${ARROWS[a].s}</span>`).join('');
  renderTally();
  if (screenFocusName === solo.p.user.nickname) screenUpdateSub(`🎤 SOLO · ${fmtNum(solo.score)} đ · Combo x${solo.combo}`);
}
function showJudge(res) {
  const el = $('judge');
  el.textContent = res + (res !== 'MISS' && solo && solo.combo > 1 ? ` · x${solo.combo}` : '');
  el.className = '';
  void el.offsetWidth;
  el.className = 'pop ' + res.toLowerCase();
}
function judge(res) {
  if (!solo || solo.judged) return;
  solo.judged = true;
  solo.marks[solo.idx] = res;
  solo.tally[res] = (solo.tally[res] || 0) + 1;
  solo.score += JUDGE_PTS[res];
  if (res === 'MISS') { solo.combo = 0; A.bad(); }
  else if (res === 'BAD') { A.bad(); }
  else { solo.combo++; solo.best = Math.max(solo.best, solo.combo); A.good(); }
  showJudge(res);
  renderAU();
}
function advanceStep() {
  if (!solo) return;
  solo.idx++;
  solo.judged = false;
  if (solo.idx >= solo.seq.length) { endSolo(); return; }
  renderAU();
}
function autoJudge() {
  const r = Math.random();
  if (isDemo) return r < 0.30 ? 'PERFECT' : r < 0.58 ? 'GREAT' : r < 0.82 ? 'COOL' : r < 0.92 ? 'BAD' : 'MISS';
  return r < 0.5 ? 'COOL' : r < 0.72 ? 'BAD' : 'MISS';
}
function startSolo(p) {
  if (!p || solo || p.paired || p.staff) return;
  const len = 12;
  solo = { p, seq: Array.from({ length: len }, () => Math.floor(Math.random() * 4)), marks: {}, tally: {}, idx: 0, score: 0, combo: 0, best: 0, judged: false };
  P.setFocus(p, true);
  refreshVis(p);
  P.sayBubble(p, 'Tới lượt mình quẩy nè!');
  for (const nb of P.neighbours(p).slice(0, 7)) {
    FX.hearts(2, nb.x / 100, (nb.y - 10) / 100);
    if (Math.random() < 0.4) P.sayBubble(nb, ['Cố lên!', 'Quẩy đi bạn ơi!', 'Đỉnh quá!'][Math.floor(Math.random() * 3)]);
  }
  Dir.request({
    kind: 'focus', p, prio: 70, dur: (cfg.soloSec || 20) + 4, zoom: cfg.zoomSolo, follow: true, vis: 'xung',
    reason: '🎤 SOLO AU', name: p.user.nickname,
  });
  screenPush(`🎤 ${p.user.nickname} solo tại ô ${p.home ? p.home.id : '?'}`);
  renderAU();
  A.cheer();
  const mySolo = solo;
  soloTimer = setInterval(() => {
    if (!solo) return;
    if (!solo.judged) judge(autoJudge());
    setTimeout(advanceStep, 240);
  }, 980);
  setTimeout(() => { if (solo === mySolo) endSolo(); }, (cfg.soloSec || 20) * 1000 + 4000);
}
function endSolo() {
  if (!solo) return;
  clearInterval(soloTimer); soloTimer = null;
  const { p, score, best, tally } = solo;
  solo = null;
  P.setFocus(p, false);
  refreshVis(p);
  renderAU();
  const t = j => tally[j] || 0;
  showBanner(`🏁 FINISH · ${p.user.nickname} — ${fmtNum(score)} điểm · Combo x${best} · P${t('PERFECT')} G${t('GREAT')} C${t('COOL')} B${t('BAD')} M${t('MISS')}`, 5600);
  if (score >= 2400) { FX.fireworks(3); A.fanfare(); } else A.cheer();
  addScore(p.user, Math.round(score / 10));
  addXP(p.user, Math.round(score / (cfg.soloXpDiv || 15)));
  settleStage(p);
  nextSoloAt = nowMs() + 3200;
}
function pickNextSolo() {
  while (soloQueue.length) {
    const p = P.get(soloQueue.shift());
    if (p && !p.staff && !P.busy(p)) return p;
  }
  const all = P.all().filter(p => !p.staff && !P.busy(p));
  if (!all.length) return null;
  joinOrder = joinOrder.filter(id => P.get(id));
  const id = joinOrder.find(x => { const p = P.get(x); return p && !p.staff && !P.busy(p); });
  if (id) { joinOrder = joinOrder.filter(x => x !== id); joinOrder.push(id); return P.get(id); }
  return all[Math.floor(Math.random() * all.length)];
}
setInterval(() => {
  if (!solo && nowMs() >= nextSoloAt && P.realCount() >= 1) {
    const p = pickNextSolo();
    if (p) startSolo(p);
  }
}, 1500);

/* ============ Bong bóng thoại hài ============ */
setInterval(() => {
  const all = P.all();
  if (!all.length || !(cfg.funnyLines || []).length) return;
  const p = all[Math.floor(Math.random() * all.length)];
  if (!p.staff) P.sayBubble(p, cfg.funnyLines[Math.floor(Math.random() * cfg.funnyLines.length)]);
}, 4600);

/* ============ Hiệu ứng ambient theo nhân vật ============ */
let ambCursor = 0;
setInterval(() => {
  if (!P.count()) return;
  const emitters = [];
  const push = p => { if (p && !emitters.includes(p)) emitters.push(p); };
  if (solo) push(solo.p);
  for (const id of stageIds) push(P.get(id));
  if (pair) { push(pair[0]); push(pair[1]); }
  if (Dir.cur) itemDancers(Dir.cur).forEach(push);
  const all = P.all();
  for (let i = 0; i < 6 && all.length; i++) push(all[(ambCursor + i) % all.length]);
  ambCursor += 3;
  for (const p of emitters) FX.ambient(P.charOf(p).fx, p.x / 100, p.y / 100);
}, 950);

/* ============ Nhảy đôi ============ */
let pair = null, pairTimer = null, pairFxTimer = null;
function startPair(pa, pb) {
  if (!pa || !pb || pa === pb || pair) return false;
  if (P.busy(pa) || P.busy(pb)) return false;
  if (solo && (solo.p === pa || solo.p === pb)) return false;
  pair = [pa, pb];
  P.toPair(pa, 0); P.toPair(pb, 1);
  $('pairglow').classList.add('on');
  showBanner(`💃 NHẢY ĐÔI · ${pa.user.nickname} ❤ ${pb.user.nickname}`, 4200);
  toast(`💞 Cặp nhảy đôi mới: ${pa.user.nickname} + ${pb.user.nickname}`);
  screenPush(`💞 Nhảy đôi: ${pa.user.nickname} + ${pb.user.nickname}`);
  P.sayBubble(pa, 'Nhảy đôi với mình nè!');
  P.sayBubble(pb, 'Quẩy cùng nhau thôi!');
  const c = P.pairCenter();
  FX.hearts(10, c.x / 100, (c.y - 10) / 100);
  Dir.request({
    kind: 'pair', pair: [pa, pb], prio: 60, dur: 12, zoom: cfg.zoomPairMax, follow: true, vis: 'xung',
    reason: '💞 NHẢY ĐÔI', name: `${pa.user.nickname} ❤ ${pb.user.nickname}`,
  });
  refreshVis(pa); refreshVis(pb);
  addEnergy(8);
  pairFxTimer = setInterval(() => FX.hearts(4, (c.x + rand(-4, 4)) / 100, (c.y - rand(8, 14)) / 100), 1400);
  const mine = pair;
  pairTimer = setTimeout(() => { if (pair === mine) endPair(); }, (cfg.pairSec || 20) * 1000);
  return true;
}
function endPair() {
  if (!pair) return;
  clearTimeout(pairTimer); clearInterval(pairFxTimer);
  const [pa, pb] = pair;
  pair = null;
  $('pairglow').classList.remove('on');
  for (const p of [pa, pb]) {
    P.offPair(p);
    if (!p.staff) addXP(p.user, cfg.pairXp || 15);
    refreshVis(p);
    settleStage(p);
  }
}
function findPartnerFor(p, text) {
  const norm = noAccent(text || '');
  let best = null, bl = 0;
  for (const o of P.all()) {
    if (o === p || o.staff) continue;
    const nn = noAccent(o.user.nickname || '');
    if (nn && norm.includes(nn) && nn.length > bl) { best = o; bl = nn.length; }
  }
  if (best && !P.busy(best)) return best;
  const free = P.all().filter(o => o !== p && !o.staff && !P.busy(o) && !(solo && solo.p === o));
  return free.length ? free[Math.floor(Math.random() * free.length)] : null;
}
function requestPair(user, text) {
  const p = user && P.get(user.id);
  if (!p || p.staff || pair || P.busy(p)) return;
  const partner = findPartnerFor(p, text);
  if (partner) startPair(p, partner);
}

/* ============ Quà theo tầng ============ */
function grandArrival(user) {   // quà ≥99: đổ bộ ngay tại ô — cánh + hào quang, camera cận cảnh
  const p = ensureDancer(user);
  if (!p) return;
  P.grandEntrance(p, 7);
  showBanner(`👑 ${user.nickname} ĐỔ BỘ SÀN NHẢY!`, 5600);
  screenPush(`👑 ${user.nickname} đổ bộ sàn nhảy!`);
  Dir.request({
    kind: 'focus', p, prio: 85, dur: cfg.durGiftBig, zoom: cfg.zoomGiftBig, follow: true, vis: 'xung',
    reason: '🎁 QUÀ LỚN · ĐỔ BỘ', name: user.nickname,
  });
  FX.fireworks(4); FX.moneyRain(70); FX.confetti(80);
  FX.burstAt(p.x / 100, (p.y - 10) / 100, '#ffd76a', 34);
  A.fanfare();
}
let vipBusy = false;
function vipArrival(user) {   // quà ≥299: trực thăng bay ngang, camera toàn cảnh xem trọn, rồi cận cảnh spotlight
  const p = ensureDancer(user);
  if (!p || vipBusy) { if (p) grandArrival(user); return; }
  vipBusy = true;
  showBanner(`🚁 VIP ${user.nickname} ĐANG ĐÁP XUỐNG SÀN NHẢY!`, 5000);
  toast(`🚁 VIP ${user.nickname} tới bằng trực thăng!`, true);
  screenPush(`🚁 VIP ${user.nickname} đáp trực thăng xuống sàn!`);
  Dir.request({ kind: 'overview', prio: 100, dur: 3.4, reason: '🚁 VIP ĐÁP TRỰC THĂNG', name: user.nickname });
  const heli = $('heli');
  heli.classList.remove('fly'); void heli.offsetWidth; heli.classList.add('fly');
  A.fanfare();
  setTimeout(() => {
    vipBusy = false;
    p.spotUntil = nowMs() + 5000;
    refreshVis(p);
    P.grandEntrance(p, 7);
    Dir.request({
      kind: 'focus', p, prio: 100, dur: cfg.durGiftBig, zoom: cfg.zoomGiftBig, follow: true, vis: 'spot',
      reason: '🎁 VIP · SPOTLIGHT', name: user.nickname,
    });
    FX.fireworks(5); FX.moneyRain(90);
  }, 3400);
}
function hugeCelebration(user) {   // quà ≥1000: ăn mừng toàn sàn + focus spotlight dài nhất
  const p = ensureDancer(user);
  if (!p) return;
  showBanner(`💎 ${user.nickname} TẶNG QUÀ KHỦNG — CẢ SÀN NỔ TUNG!`, 6500);
  toast(`💎 QUÀ KHỦNG từ ${user.nickname}!`, true);
  screenPush(`💎 ${user.nickname} tặng QUÀ KHỦNG!`);
  $('beams').classList.add('on');
  setTimeout(() => { if (nowMs() >= partyUntil) $('beams').classList.remove('on'); }, 9000);
  const heli = $('heli');
  heli.classList.remove('fly'); void heli.offsetWidth; heli.classList.add('fly');
  FX.fireworks(8); FX.moneyRain(200); FX.confetti(150);
  A.fanfare(); A.cheer();
  p.spotUntil = nowMs() + (cfg.durGiftHuge || 8.5) * 1000;
  refreshVis(p);
  P.grandEntrance(p, 8);
  Dir.request({
    kind: 'focus', p, prio: 120, dur: cfg.durGiftHuge, zoom: cfg.zoomGiftHuge, follow: true, vis: 'spot',
    reason: '💎 QUÀ KHỦNG ≥1000 XU', name: user.nickname,
  });
}
function giftFx(user, dia, giftName) {
  const p = user ? P.get(user.id) : null;
  const x = p ? p.x / 100 : 0.5, y = p ? (p.y - 10) / 100 : 0.6;
  if (user) {
    const rec = recordOf(user);
    rec.gifts += dia; rec.weekGifts += dia;
    addScore(user, dia * 10);
    addXP(user, dia * (cfg.xpPerGiftCoin || 2));
  }
  addEnergy(Math.min(30, 4 + dia * 0.5));
  screenPush(`🎁 ${user ? user.nickname : 'Khách'} tặng ${giftName || 'quà'} (${fmtNum(dia)} xu)`);
  if (!p) { if (dia >= 10) FX.potBurst(x, y); return; }   // quà không rõ người tặng: chỉ hiệu ứng giữa sàn
  if (dia >= 1000) { hugeCelebration(user); return; }
  if (dia >= 299) { vipArrival(user); return; }
  if (dia >= 99) { grandArrival(user); return; }
  if (dia >= 10) {
    FX.potBurst(x, y);
    FX.moneyRain(24);
    toast(`💰 ${user ? user.nickname : 'Khách'} làm NỔ HŨ VÀNG!`, true);
    if (p) Dir.request({
      kind: 'focus', p, prio: 65, dur: cfg.durGiftMid, zoom: cfg.zoomGiftMid, follow: true, vis: 'xung',
      reason: '💰 NỔ HŨ VÀNG', name: user.nickname,
    });
    return;
  }
  if (p) FX.burstAt(x, y, P.charOf(p).color, 18);
  FX.confetti(26);
  if (p) FX.hearts(5, x, y);
}

/* ============ Nhân viên quán lấp sàn khi vắng khách ============ */
const staffState = { spawned: [] };
setInterval(() => {
  const real = P.realCount();
  const target = clamp((cfg.staffThreshold || 14) - real, 0, P.STAFF.length);
  const cur = staffState.spawned.filter(id => P.get(id));
  staffState.spawned = cur;
  if (cur.length < target) {
    const next = P.STAFF.find(s => !P.get('staff-' + s.id));
    if (next) {
      const u = { id: 'staff-' + next.id, nickname: next.name, avatar: '' };
      const p = P.spawn(u, { staff: true, staffCls: next.id, lv: 1, flair: 0 });
      if (p) staffState.spawned.push(u.id);
    }
  } else if (cur.length > target) {
    const id = cur[cur.length - 1];
    staffState.spawned.pop();
    P.removeUser(id, true);
  }
}, 2500);

/* ============ Nhận sự kiện ============ */
function onChat(m) {
  if (!m.user) return;
  const p = ensureDancer(m.user);
  const text = String(m.text || '');
  // XP bình luận (chống spam: tối đa 1 lần / 10 giây / người)
  const lastXp = chatXpAt.get(m.user.id) || 0;
  if (nowMs() - lastXp > 10000) { chatXpAt.set(m.user.id, nowMs()); addXP(m.user, cfg.xpPerComment || 2); }
  if (solo && !solo.judged) {
    const norm = noAccent(text);
    let arrow = -1;
    ARROWS.forEach((a, i) => { if (norm.includes(a.w) || text.includes(a.s)) arrow = i; });
    const fromFeatured = solo.p.user.id === m.user.id;
    if (arrow >= 0 || fromFeatured) {
      judge(arrow === solo.seq[solo.idx] ? (Math.random() < 0.6 ? 'PERFECT' : 'GREAT') : fromFeatured && arrow < 0 ? 'GREAT' : (Math.random() < 0.5 ? 'BAD' : 'COOL'));
      setTimeout(advanceStep, 260);
      return;
    }
  }
  {
    const norm0 = noAccent(text);
    if (/nhay doi|chon ban nhay/.test(norm0) || (/@/.test(text) && /nhay|doi|cap/.test(norm0))) { requestPair(m.user, text); addEnergy(3); return; }
  }
  if (p && text.trim()) P.sayBubble(p, text.trim().slice(0, 42));
  if (isDemo) {
    const norm = noAccent(text);
    if (/phao hoa/.test(norm)) FX.fireworks(3);
    else if (/mua tien|no hu/.test(norm)) { const pp = P.get(m.user.id); FX.potBurst(pp ? pp.x / 100 : 0.5, pp ? (pp.y - 10) / 100 : 0.55); }
    else if (/quay/.test(norm)) { FX.confetti(40); addEnergy(6); }
  }
  addEnergy(1.5);
}
function handle(ev) {
  const src = ev.source || {};
  if (ev.user) ensureDancer(ev.user);
  switch (ev.action) {
    case 'join':
      if (ev.user) { const p = P.get(ev.user.id); if (p) joinOrder.push(ev.user.id); }
      break;
    case 'dance':
      FX.confetti(36); addEnergy(5);
      break;
    case 'solo':
      if (ev.user && !soloQueue.includes(ev.user.id)) soloQueue.push(ev.user.id);
      break;
    case 'pair':
      if (ev.user) requestPair(ev.user, '');
      break;
    case 'confetti': FX.confetti(50 + (ev.value || 1) * 20); break;
    case 'fireworks': FX.fireworks(Math.max(1, Math.min(6, ev.value || 2))); break;
    case 'hearts': {
      const p = ev.user && P.get(ev.user.id);
      FX.hearts(10, p ? p.x / 100 : 0.5, p ? (p.y - 10) / 100 : 0.6);
      break;
    }
    case 'pot': {
      const p = ev.user && P.get(ev.user.id);
      FX.potBurst(p ? p.x / 100 : 0.5, p ? (p.y - 10) / 100 : 0.55);
      break;
    }
    case 'spotlight':
      if (src.kind === 'gift') break;
      if (ev.user) grandArrival(ev.user);
      break;
    case 'cheer':
      if (ev.user) {
        const p = P.get(ev.user.id);
        if (p) { P.sayBubble(p, 'Cảm ơn cả nhà đã follow!'); FX.hearts(8, p.x / 100, (p.y - 10) / 100); }
        addXP(ev.user, cfg.xpPerFollow || 5);
      }
      addEnergy(4);
      break;
  }
  if (src.kind === 'gift') {
    const dia = Math.max(1, Number(ev.diamonds || 1));
    giftFx(ev.user, dia, src.giftName);
    if (dia >= 10 && dia < 99) A.coin();
    toast(`🎁 ${ev.user ? ev.user.nickname : 'Khách'} tặng ${src.giftName || 'quà'} (${fmtNum(dia)} xu)`, dia >= 30);
  }
  if (src.kind === 'like') addEnergy(0.4 * (ev.count || 1));
  renderViewers();
}
function onBlock(m) {
  for (const raw of [m && m.userId, m && m.uniqueId, m && m.user && m.user.id]) {
    if (!raw) continue;
    for (const [id] of known) if (id === raw) { P.removeUser(id); known.delete(id); delete users[id]; }
  }
  saveUsers();
}
function resetScores() {   // nút reset của LiveBridge: xoá tiến trình tuần của mọi người
  for (const r of Object.values(users)) { r.weekScore = 0; r.weekGifts = 0; r.weekXp = 0; }
  saveUsers();
  renderBoard();
}

/* ============ TỐC ĐỘ NHẢY THEO CONFIG (tocDoNhay: 'cham' | 'thuong' | 'nhanh') ============
   GIF không đổi được tốc độ lúc chạy nên mỗi GIF có sẵn 3 bộ file: img/ (thường) ·
   img/cham/ (0.8x) · img/nhanh/ (1.3x) — đổi tốc độ = trỏ sang thư mục khác qua
   Party.dancers (sped/setSpeedDir/refreshImgs). Biến CSS --spd nhân thời lượng các
   animation hào quang / bob quanh dancer: chậm 1.25 · thường 1 · nhanh 0.77.
   Party Max tạm ép 'nhanh' nếu partyMaxNhanhHon = true (speedOverride). */
const SPEED_DIR = { cham: 'cham/', thuong: '', nhanh: 'nhanh/' };
const SPEED_SPD = { cham: 1.25, thuong: 1, nhanh: 0.77 };
let speedOverride = null;
function applySpeed() {
  const want = speedOverride || cfg.tocDoNhay || 'thuong';
  P.setSpeedDir(SPEED_DIR[want] != null ? SPEED_DIR[want] : '');
  P.refreshImgs();
  document.documentElement.style.setProperty('--spd', SPEED_SPD[want] || 1);
  $('screenDJimg').src = P.sped('img/nv03-dj-headspin.gif');
}

/* ============ Cấu hình ============ */
function applyConfig(c) {
  cfg = { ...DEFAULTS, ...(c || {}) };
  A.setConfig(cfg);
  P.setTune({ lvScaleMax: cfg.lvScaleMax, dropHeight: cfg.dropHeight, dropHeightVip: cfg.dropHeightVip });
  worldEl.style.setProperty('--dimB', clamp(cfg.doMoPhanConLai != null ? cfg.doMoPhanConLai : 0.55, 0.3, 1));
  applySpeed();
  syncDim();
  storeInit();
  startGuide();
  renderBoard();
}

/* ============ Khung hình 9:16 + kích thước thế giới ============ */
let lastLayoutKey = '';
function resize() {
  const Wpx = innerWidth, Hpx = innerHeight;
  const narrow = Math.min(Wpx / Hpx, 9 / 16);
  const sw = narrow * Hpx, sh = Hpx;
  const key = [Wpx, Hpx, document.fullscreenElement ? 1 : 0].join('|');
  if (key === lastLayoutKey) return;
  lastLayoutKey = key;
  SW = sw; SH = sh;
  const u0 = sw / 100;
  const root = document.documentElement.style;
  root.setProperty('--u0', u0 + 'px');
  const compact = navigator.webdriver || /live|obs/i.test(navigator.userAgent) || q.has('compact') ? 0 : 1;
  stageEl.style.width = sw + 'px'; stageEl.style.height = sh + 'px';
  if (compact) {
    const fitW = Math.max(0, (Wpx - sw) / 2), top = Math.max(0, innerHeight * 0.10);
    root.setProperty('--k', u0 < 2.8 && Hpx > Wpx ? '1.55' : '1');
    root.setProperty('--safe', top + 'px');
    root.setProperty('--side', fitW + 'px');
  } else {
    root.setProperty('--k', '1.2'); root.setProperty('--safe', '0px'); root.setProperty('--side', '0px');
  }
  WW = Math.round(sh * 1.15); WH = Math.round(sh * 2.3);   // tỉ lệ thế giới = tỉ lệ ảnh 0.5
  worldEl.style.width = WW + 'px'; worldEl.style.height = WH + 'px';
  FX.resize(WW, WH, Math.min(2, window.devicePixelRatio || 1));
  P.resize(WW, WH);
  Cam.apply();
}
addEventListener('resize', resize);
document.addEventListener('fullscreenchange', () => { lastLayoutKey = ''; resize(); });
setInterval(resize, 2000);

/* ============ Âm thanh ============ */
function setupSoundBtn() {
  const btn = $('sound');
  A.init();
  const upd = () => { btn.style.display = A.state() === 'running' ? 'none' : ''; };
  setTimeout(upd, 1200);
  btn.addEventListener('click', () => { A.resume(); setTimeout(upd, 300); });
}

/* ============ Chạm đất: chào người mới ============ */
P.onLand = function (p) {
  if (p.staff) return;
  settleStage(p);
  if (!p.greeted) {
    p.greeted = true;
    P.sayBubble(p, 'Chào cả nhà, mình tới quẩy nè!');
  }
};

/* ============ Khởi động ============ */
const camLockMode = q.get('cam');
FX.init($('fx'));
P.init($('people'), $('trails'), $('fallcone'));
storeInit();
resize();
renderEnergy();
renderBoard();
renderViewers();
renderAU();
screenPush('🎧 DJ đang quẩy nhạc sàn 116 BPM');
Cam.home();
if (camLockMode === 'overview') { Cam.overview(); }

if (isDemo) {
  say('<span style="color:#ffd76a">● CHẾ ĐỘ DEMO</span> — xem thử, không cần LIVE thật', 'demo');
  applyConfig({
    guideLines: [
      '👋 Vào phòng là RƠI TỪ TRÊN CAO xuống 1 ô cố định trên sàn!',
      '📹 Camera tự lia: quà càng to càng được ưu tiên cận cảnh',
      '🎤 Gõ trái / lên / xuống / phải giúp dancer solo ăn điểm',
      '💃 Gõ "nhảy đôi" + tag tên bạn nhảy',
      '🎁 Quà 99 xu+ đổ bộ · 299 xu+ trực thăng VIP · 1000 xu+ quà khủng spotlight',
      '⬆ Cày XP lên LV: vòng hào quang đổi bậc, LV10+ đội vương miện',
      '👑 Top quà tuần đứng podium — reset mỗi thứ 6',
    ],
    funnyLines: [
      'Sàn này vui quá trời luôn!', 'Cho xin bài vinahouse đi!', 'Quẩy tới sáng luôn nè!',
      'Nhạc hay quá, chân mình tự nhảy!', 'Ai solo yếu là mình cười đó nha!', 'Đông quá, chen nhau quẩy luôn!',
      'Chủ tịch sàn ngầu quá đi!', 'Combo x10 rồi kìa, đỉnh!', 'Mình nhảy vì đam mê thôi!',
    ],
  });
  setupSoundBtn();
  startDemo();
} else {
  const bridgeUrl = q.get('bridge') || undefined;
  new LiveBridgeClient({ url: bridgeUrl, game: 'san-nhay' })
    .on('event', handle)
    .on('chat', onChat)
    .on('block', onBlock)
    .on('config', m => applyConfig(m.config))
    .on('reset-scores', resetScores)
    .on('hello', h => { if (h.config) applyConfig(h.config); })
    .on('status', s => {
      const t = (s && s.tiktok) || {};
      if (s && s.room) { viewersNow = s.room.viewers || 0; renderViewers(); }
      if (t.state === 'connected') say('● LIVE', 'ok');
      else if (q.has('debug')) say('LiveBridge: ' + (t.state || 'đang nối…'), t.state === 'error' ? 'err' : '');
    })
    .on('room', m => { if (m.room) { viewersNow = m.room.viewers || 0; renderViewers(); } })
    .on('seen', m => {
      if (m.user) {
        ensureDancer(m.user);
        addEnergy(0.15 * (m.count || 1));
        const rec = recordOf(m.user);          // XP từ tim: mỗi 100 tim +xpPer100Likes
        rec.likes += (m.count || 1);
        while (rec.likes >= 100) { rec.likes -= 100; addXP(m.user, cfg.xpPer100Likes || 5); }
        saveUsers();
      }
    })
    .connect();
  setTimeout(setupSoundBtn, 300);
}

/* ============ Demo ============ */
function startDemo() {
  const names = ['Xuân Mai', 'Minh Tuấn', 'Thu Hằng', 'Văn Đức', 'Ngọc Anh', 'Hoàng Nam', 'Khánh Linh', 'Tuấn Anh', 'Mỹ Linh', 'Đức Huy', 'Phương Thảo', 'Hải Yến', 'Quốc Bảo', 'Thanh Tùng', 'Bảo Trâm', 'Văn Hải'];
  const usersDemo = names.map((n, i) => ({ id: 'demo' + i, nickname: n, avatar: '' }));
  // gieo sẵn XP cho 2 người để LÊN CẤP xảy ra ngay trong demo (1 người sắp LV2, 1 người sắp LV4)
  const seedXp = (idx, xp) => { const r = recordOf(usersDemo[idx]); r.xp = xp; r.cls = r.cls || null; saveUsers(); };
  seedXp(3, (cfg.levelXp[1] || 100) - 6);
  seedXp(7, (cfg.levelXp[3] || 450) - 12);
  usersDemo.forEach((u, i) => setTimeout(() => { ensureDancer(u); joinOrder.push(u.id); renderViewers(); }, 400 + i * 650));
  const chatLines = ['quẩy lên cả nhà ơi', 'nhạc hay quá', 'pháo hoa', 'mưa tiền đi chủ tịch', 'sàn đông vui quá', 'combo cao lên nào'];
  const arrowWords = { trai: 'trái', len: 'lên', xuong: 'xuống', phai: 'phải' };
  setInterval(() => {
    const joined = usersDemo.filter(u => P.get(u.id));
    if (!joined.length) return;
    const u = joined[Math.floor(Math.random() * joined.length)];
    const r = Math.random();
    if (solo && r < 0.45) {
      const correct = Math.random() < 0.62;
      const w = correct ? ARROWS[solo.seq[solo.idx]].w : ['trai', 'len', 'xuong', 'phai'][Math.floor(Math.random() * 4)];
      onChat({ user: u, text: arrowWords[w] });
    } else if (r < 0.60) {
      onChat({ user: u, text: chatLines[Math.floor(Math.random() * chatLines.length)] });
    } else if (r < 0.74) {
      addEnergy(2.5);
      const p = P.get(u.id); if (p) FX.hearts(3, p.x / 100, (p.y - 10) / 100);
    } else if (r < 0.88) {
      const dia = [1, 5, 10, 39][Math.floor(Math.random() * 4)];
      handle({ action: dia >= 10 ? 'pot' : 'hearts', value: 1, count: 1, user: u, diamonds: dia, source: { kind: 'gift', giftName: dia >= 10 ? 'Hũ vàng' : 'Rose', diamonds: dia } });
    } else if (r < 0.94) {
      handle({ action: 'spotlight', value: 1, count: 1, user: usersDemo[3], diamonds: 99, source: { kind: 'gift', giftName: 'Siêu xe', diamonds: 99 } });
    } else if (r < 0.98) {
      handle({ action: 'spotlight', value: 1, count: 1, user: usersDemo[7], diamonds: 299, source: { kind: 'gift', giftName: 'Trực thăng VIP', diamonds: 299 } });
    } else {
      handle({ action: 'spotlight', value: 1, count: 1, user: usersDemo[5], diamonds: 1000, source: { kind: 'gift', giftName: 'Siêu quà khủng', diamonds: 1000 } });
    }
    viewersNow = 140 + joined.length * 11 + Math.floor(rand(0, 60));
    renderViewers();
  }, 2300);
  // nhảy đôi tự động mỗi ~26s
  setInterval(() => {
    if (pair) return;
    const free = P.all().filter(p => !p.staff && !P.busy(p) && !(solo && solo.p === p));
    if (free.length >= 2) startPair(free[Math.floor(Math.random() * free.length)], free[Math.floor(Math.random() * free.length)]);
  }, 26000);
  // bảo đảm Party Max xuất hiện trong demo
  setTimeout(() => { if (nowMs() > partyUntil) addEnergy(100); }, 75000);
}

W.handle = handle; W.chat = onChat;
W.energy = { add: addEnergy, party: partyMax, get: () => energy };
W.dir = { state: () => ({ cur: Dir.cur ? { prio: Dir.cur.prio, kind: Dir.cur.kind, name: Dir.cur.name } : null, queue: Dir.queue.length, locked: Dir.locked }) };
W.test = {   // móc kiểm chứng / chụp ảnh demo
  gift: (dia, idx) => { const all = P.all().filter(p => !p.staff); const p = all[idx || 0]; if (p) giftFx(p.user, dia, 'Quà test'); },
  lvup: () => { const all = P.all().filter(p => !p.staff); if (!all.length) return; const u = all[0].user; const rec = recordOf(u); const cur = lvOf(rec.xp); addXP(u, (cfg.levelXp[cur] || 1e9) - rec.xp + 1); },
  soloNow: () => { const f = P.all().filter(p => !p.staff && !P.busy(p)); if (f.length) startSolo(f[0]); },
  pairNow: () => { const f = P.all().filter(p => !p.staff && !P.busy(p)); return f.length >= 2 ? startPair(f[0], f[1]) : false; },
  party: () => partyMax(),
  clearFloor: () => { for (const p of P.all().filter(p => !p.staff)) P.removeUser(p.user.id); },
  fall: name => ensureDancer({ id: 'test-' + Date.now(), nickname: name || 'Khách Mới', avatar: '' }),
  state: () => ({ dancers: P.count(), real: P.realCount(), staff: P.all().filter(p => p.staff).length, stage: stageIds, pair: !!pair, solo: !!solo, dir: W.dir.state(), dim: worldEl.classList.contains('focusing'), spd: document.documentElement.style.getPropertyValue('--spd') }),
};
})();
