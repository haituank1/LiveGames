'use strict';
/* Cài đặt chỉnh từ trang quản trị, lưu ra config/settings.json (tự tạo, không cần sửa tay):
   tài khoản TikTok, danh sách chặn, cấu hình từng game (số nhân vật ảo, tối đa nhân vật, hiện bình luận...). */
const fs = require('fs');
const path = require('path');

const DEFAULTS = {
  tiktok: { username: '', signApiKey: '', autoConnect: false },
  blocked: [],          // [{ id, uniqueId, nickname }]
  games: {},            // { 'chua-3d': { npc, max, showChat } }
};
// mặc định = bộ config gốc ngày 01/11/2026 (bản lưu: LiveBridge/config/baseline/settings-games.json); câu chữ, vị trí đệm nằm ở `defaults` của file mapping
const GAME_DEFAULTS = {
  npc: 2, max: 600, showChat: true,     // khung bình luận trong game (tắt ở trang quản trị nếu thấy trùng với bình luận của TikTok)
  leaveMin: 20,                         // người xem không tương tác quá N phút thì nhân vật tự rời chùa (0 = không bao giờ)
  joinSeat: true, seatLikes: 10,        // vào phòng là có nhân vật? / thả đủ N tim (cộng dồn) thì được vào chùa ngồi (bình luận, quà... luôn được vào)
  pointsPerTick: 1, tickSec: 5, pointsPerDiamond: 50, pointsPerChat: 5,
  musicOn: true, musicVolume: 37, musicShuffle: true, sfxOn: true, sfxVolume: 11, chantOn: true,
  chantMinDiamonds: 1, chantGap: 6, duckPercent: 90,    // niệm khi quà từ N xu; mỗi lần niệm cách nhau ≥ N giây; nhạc nền còn N% lúc niệm
  monkOn: true, monkMinSec: 20, monkMaxSec: 25,         // thầy hiện lên nói: ngẫu nhiên mỗi monkMinSec..monkMaxSec giây
  monkGreetOn: true, monkGreetGap: 10,                  // thầy chào người mới vào / cảm ơn quà, follow theo tên; chào cách nhau ≥ N giây
  pointsPerFollow: 100,                                 // follow: + điểm (mỗi người 1 lần) và được đặt pháp danh
  guideOn: true,                                        // dòng "tặng gì – được gì" xoay vòng dưới khung luật
  safeTop: 9, safeSide: 2, uiScale: 120,                // chừa N% phía trên / mỗi bên cho giao diện TikTok trên điện thoại; cỡ chữ (%)
  nameScale: 100,                                       // cỡ tên dưới chân nhân vật (%)
  walkSpeed: 500, actSpeed: 400,                        // tốc độ nhân vật (%): đi lại / lạy, đứng, quỳ
  // bật / tắt từng loại thông báo (SHOW_KEYS), thiếu = bật; mặc định tắt các dòng trong khung bình luận (TikTok đã có)
  show: { feedChat: false, feedGift: false, feedJoin: false, feedFollow: false, feedLike: false, feedShare: false,
    bubbleChat: true, floatPoints: true, nameTags: true, rulesBox: true, boardTop10: true, toastTop: true, liveLabel: true,
    monkGreet: true, monkThank: true, monkFollow: true },
  // mốc & định kỳ (game làm hành động khi đủ thời gian / điểm); [] = tắt. Chi tiết ở Games/chua-3d/js/main.js (MILESTONE)
  timedRules: [{ sec: 20, action: 'bow', value: 3, count: 10 }],     // [{ sec, action, value, count }]: cứ sec giây thì count người ngẫu nhiên làm action
  personalEvery: [{ every: 100, action: 'petal', value: 1 }],        // [{ every, action, value }]: mỗi khi điểm một người vượt bội số của every thì người đó làm action
  globalEvery: [{ every: 1000, action: 'lotus', value: 1 }, { every: 1000, action: 'glow', value: 1 }],   // [{ every, action, value }]: mỗi khi tổng điểm cả chùa vượt bội số của every thì cả chùa làm action
  bgRules: [],                          // [{ views, bg }]: khi người xem đạt views thì đổi nền sang bg (file bg*.webp trong Games/<game>/)
};
// các loại thông báo bật / tắt được ở trang quản trị → "Hiện / ẩn thông báo" (game coi thiếu = bật)
const SHOW_KEYS = ['feedChat', 'feedGift', 'feedJoin', 'feedFollow', 'feedLike', 'feedShare',
  'bubbleChat', 'floatPoints', 'nameTags', 'rulesBox', 'boardTop10', 'toastTop', 'liveLabel', 'monkGreet', 'monkThank', 'monkFollow'];
// các ô "mỗi dòng một câu": để trống = dùng câu mặc định (defaults trong file mapping)
const LINE_KEYS = ['monkLines', 'monkGreet', 'monkThank', 'monkFollowThanks', 'guideLines', 'rulesLines'];
const num = (v, min, max, def) => { const n = Number(v); return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : def; };

class Settings {
  constructor(file) {
    this.file = file;
    this.data = JSON.parse(JSON.stringify(DEFAULTS));
    try {
      const saved = JSON.parse(fs.readFileSync(file, 'utf8'));
      this.data.tiktok = { ...this.data.tiktok, ...saved.tiktok };
      this.data.blocked = Array.isArray(saved.blocked) ? saved.blocked : [];
      this.data.games = saved.games || {};
    } catch (_) { /* lần đầu chạy: chưa có file */ }
  }

  save() {
    const tmp = this.file + '.tmp';
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    fs.writeFileSync(tmp, JSON.stringify(this.data, null, 2));
    fs.renameSync(tmp, this.file);
  }

  /* cấu hình game: mặc định ← "defaults" trong file mapping ← đã chỉnh trên trang quản trị */
  game(id, mapping) {
    return { ...GAME_DEFAULTS, ...((mapping && mapping.defaults) || {}), ...(this.data.games[id] || {}) };
  }
  setGame(id, cfg) {
    const clean = {};
    if (cfg.npc != null) clean.npc = Math.max(0, Math.min(600, Math.round(Number(cfg.npc) || 0)));
    if (cfg.max != null) clean.max = Math.max(10, Math.min(600, Math.round(Number(cfg.max) || 500)));
    if (cfg.showChat != null) clean.showChat = !!cfg.showChat;
    if (cfg.leaveMin != null) clean.leaveMin = num(cfg.leaveMin, 0, 1440, 10);
    if (cfg.joinSeat != null) clean.joinSeat = !!cfg.joinSeat;
    if (cfg.seatLikes != null) clean.seatLikes = Math.round(num(cfg.seatLikes, 1, 100000, 30));
    // luật tính điểm (game nào có điểm thì dùng)
    if (cfg.pointsPerTick != null) clean.pointsPerTick = num(cfg.pointsPerTick, 0, 1000, 1);
    if (cfg.tickSec != null) clean.tickSec = num(cfg.tickSec, 1, 3600, 10);
    if (cfg.pointsPerDiamond != null) clean.pointsPerDiamond = num(cfg.pointsPerDiamond, 0, 100000, 10);
    if (cfg.pointsPerChat != null) clean.pointsPerChat = num(cfg.pointsPerChat, 0, 1000, 1);
    // âm thanh
    for (const k of ['musicOn', 'musicShuffle', 'sfxOn', 'chantOn']) if (cfg[k] != null) clean[k] = !!cfg[k];
    if (cfg.musicVolume != null) clean.musicVolume = num(cfg.musicVolume, 0, 100, 35);
    if (cfg.sfxVolume != null) clean.sfxVolume = num(cfg.sfxVolume, 0, 100, 60);
    if (cfg.chantMinDiamonds != null) clean.chantMinDiamonds = num(cfg.chantMinDiamonds, 0, 100000, 10);
    if (cfg.chantGap != null) clean.chantGap = num(cfg.chantGap, 0, 600, 6);
    if (cfg.duckPercent != null) clean.duckPercent = num(cfg.duckPercent, 0, 100, 70);
    // thầy hiện lên nói
    if (cfg.monkOn != null) clean.monkOn = !!cfg.monkOn;
    if (cfg.monkMinSec != null) clean.monkMinSec = num(cfg.monkMinSec, 15, 7200, 120);
    if (cfg.monkMaxSec != null) clean.monkMaxSec = num(cfg.monkMaxSec, 15, 7200, 240);
    if (clean.monkMinSec != null && clean.monkMaxSec != null && clean.monkMaxSec < clean.monkMinSec) clean.monkMaxSec = clean.monkMinSec;
    if (cfg.monkGreetOn != null) clean.monkGreetOn = !!cfg.monkGreetOn;
    if (cfg.monkGreetGap != null) clean.monkGreetGap = num(cfg.monkGreetGap, 0, 600, 20);
    if (cfg.pointsPerFollow != null) clean.pointsPerFollow = num(cfg.pointsPerFollow, 0, 100000, 100);
    if (cfg.guideOn != null) clean.guideOn = !!cfg.guideOn;
    if (cfg.safeTop != null) clean.safeTop = num(cfg.safeTop, 0, 40, 13);
    if (cfg.safeSide != null) clean.safeSide = num(cfg.safeSide, 0, 25, 9);
    if (cfg.uiScale != null) clean.uiScale = num(cfg.uiScale, 60, 200, 120);
    if (cfg.nameScale != null) clean.nameScale = num(cfg.nameScale, 50, 200, 100);
    if (cfg.walkSpeed != null) clean.walkSpeed = num(cfg.walkSpeed, 30, 500, 160);
    if (cfg.actSpeed != null) clean.actSpeed = num(cfg.actSpeed, 30, 400, 130);
    if (cfg.show && typeof cfg.show === 'object') {
      clean.show = { ...((this.data.games[id] || {}).show || {}) };
      for (const k of SHOW_KEYS) if (cfg.show[k] != null) clean.show[k] = !!cfg.show[k];
    }
    // mốc & định kỳ: dòng không có hành động bị bỏ; danh sách rỗng = tắt
    // ô trống hoặc sai thì dòng đó bị bỏ (không đoán giá trị)
    const need = (v, min, max) => (v !== '' && v != null && Number.isFinite(Number(v)) && Number(v) >= min ? Math.min(max, Math.round(Number(v))) : null);
    const actionOf = r => { const a = String((r && r.action) || '').trim(); return /^\w{1,20}$/.test(a) ? a : null; };
    const value = r => need(r.value, 1, 99) || 1;
    if (Array.isArray(cfg.timedRules)) clean.timedRules = cfg.timedRules.map(r => {
      const action = actionOf(r), sec = need(r.sec, 5, 86400);
      return action && sec ? { sec, action, value: value(r), count: need(r.count, 1, 600) || 5 } : null;
    }).filter(Boolean).slice(0, 50);
    // mỗi X điểm (cá nhân) / mỗi Y điểm (cả chùa) thì làm hành động
    if (Array.isArray(cfg.personalEvery)) clean.personalEvery = cfg.personalEvery.map(r => {
      const action = actionOf(r), every = need(r.every, 1, 1e9);
      return action && every ? { every, action, value: value(r) } : null;
    }).filter(Boolean).slice(0, 50);
    if (Array.isArray(cfg.globalEvery)) clean.globalEvery = cfg.globalEvery.map(r => {
      const action = actionOf(r), every = need(r.every, 1, 1e9);
      return action && every ? { every, action, value: value(r) } : null;
    }).filter(Boolean).slice(0, 50);
    const drop = [];
    // vị trí 10 đệm (theo hạng), miệng lư hương, chỗ quỳ thắp nhang: "x, y" theo % khung game; để trống / sai thì dùng mặc định (defaults trong file mapping)
    const point = v => {
      const a = (Array.isArray(v) ? v : String(v).split(/[,;\s]+/).filter(Boolean)).map(Number);
      return a.length === 2 && a.every(n => Number.isFinite(n) && n >= 0 && n <= 100) ? a.map(n => Math.round(n * 10) / 10) : null;
    };
    if (cfg.cushions != null) {
      const list = (Array.isArray(cfg.cushions) ? cfg.cushions : String(cfg.cushions).split(/\r?\n/))
        .filter(l => String(l).trim()).map(point);
      if (list.length === 10 && list.every(Boolean)) clean.cushions = list; else drop.push('cushions');
    }
    for (const k of ['burner', 'incense']) {   // miệng lư hương (trên màn hình), chỗ quỳ thắp nhang (trên sàn)
      if (cfg[k] == null) continue;
      const b = String(cfg[k]).trim() ? point(cfg[k]) : null;
      if (b) clean[k] = b; else drop.push(k);
    }
    // câu thầy nói: câu nhắc follow (để trống = không nhắc) + các danh sách câu (mỗi dòng một câu, để trống = dùng câu mặc định)
    if (cfg.monkFollow != null) clean.monkFollow = String(cfg.monkFollow).trim().slice(0, 200);
    for (const k of LINE_KEYS) {
      if (cfg[k] == null) continue;
      const lines = (Array.isArray(cfg[k]) ? cfg[k] : String(cfg[k]).split(/\r?\n/))
        .map(l => String(l).trim().slice(0, 200)).filter(Boolean).slice(0, 100);
      if (lines.length) clean[k] = lines; else drop.push(k);
    }
    // đổi nền theo số người xem: [{ views, bg }], bg phải là tên file bg*.webp
    if (Array.isArray(cfg.bgRules)) clean.bgRules = cfg.bgRules.map(r => {
      const bg = String((r && r.bg) || '').trim(), views = need(r && r.views, 0, 1e9);
      return /^bg[\w.-]*\.webp$/i.test(bg) && views != null ? { views, bg } : null;
    }).filter(Boolean).slice(0, 50);
    const cur = { ...(this.data.games[id] || {}), ...clean };
    for (const k of drop) delete cur[k];
    this.data.games[id] = cur;
    this.save();
    // các ô gửi lên mà không lưu được (ô lạ) – trang quản trị báo cho người dùng thay vì mất âm thầm
    return Object.keys(cfg).filter(k => !(k in clean) && !drop.includes(k));
  }

  setTiktok(t) {
    const cur = this.data.tiktok;
    if (t.username != null) cur.username = String(t.username).trim().replace(/^@/, '');
    if (t.signApiKey != null) cur.signApiKey = String(t.signApiKey).trim();
    if (t.autoConnect != null) cur.autoConnect = !!t.autoConnect;
    this.save();
  }

  isBlocked(user) {
    if (!user) return false;
    const uid = String(user.uniqueId || '').toLowerCase();
    return this.data.blocked.some(b => (b.id && b.id === user.id) || (b.uniqueId && uid && b.uniqueId.toLowerCase() === uid));
  }
  block(user) {
    if (!user || (!user.id && !user.uniqueId) || this.isBlocked(user)) return;
    this.data.blocked.push({ id: user.id || '', uniqueId: String(user.uniqueId || '').replace(/^@/, ''), nickname: user.nickname || user.uniqueId || '' });
    this.save();
  }
  /* bỏ chặn theo id hoặc username (người chặn tay bằng @username chỉ có username) */
  unblock(key, uniqueId) {
    const uid = String(uniqueId || '').toLowerCase();
    this.data.blocked = this.data.blocked.filter(b =>
      !((key && (b.id === key || b.uniqueId === key)) || (uid && String(b.uniqueId).toLowerCase() === uid)));
    this.save();
  }
}

module.exports = { Settings, SHOW_KEYS };
