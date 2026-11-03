'use strict';
/* Quy đổi sự kiện "raw" (quà, tim, bình luận...) thành hành động cho từng game,
   theo file config/mappings/<game>.json. File được đọc lại tự động khi sửa (không cần restart). */
const fs = require('fs');
const path = require('path');

const GAME_ID = /^[\w-]+$/;

/* Kiểm tra số / chữ khi lưu từ trang quản trị: sai thì báo lỗi, không ghi file */
const int = (v, min, max, def, name) => {
  if (v == null || v === '') { if (def === undefined) throw new Error(`${name} chưa điền`); return def; }
  const n = Math.round(Number(v));
  if (!Number.isFinite(n) || n < min || n > max) throw new Error(`${name} phải là số từ ${min} đến ${max}`);
  return n;
};
const str = (v, max) => String(v == null ? '' : v).trim().slice(0, max);

/* Phần "gói quà → hành động" để trang quản trị hiện và sửa (khớp với Mapper.save) */
function editable(m) {
  const chat = m.chat || {};
  return {
    actions: m.actions || {},
    join: m.join || {}, follow: m.follow || {}, share: m.share || {}, like: m.like || {},
    chat: { cooldownSec: chat.cooldownSec || 0, rules: (chat.rules || []).map(r => ({ match: r.match, action: r.action, value: r.value, label: r.label })) },
    gifts: m.gifts || [], giftTiers: m.giftTiers || [],
  };
}

class Mapper {
  constructor(dir) {
    this.dir = dir;
    this.cache = new Map();   // game -> { mtime, data }
    this.state = new Map();   // game -> { likes: Map, chat: Map }
  }

  get(game) {
    if (!game || !GAME_ID.test(game)) return null;
    const file = path.join(this.dir, game + '.json');
    let st;
    try { st = fs.statSync(file); } catch (_) { return null; }
    const cached = this.cache.get(game);
    if (cached && cached.mtime === st.mtimeMs) return cached.data;
    try {
      const data = JSON.parse(fs.readFileSync(file, 'utf8'));
      for (const r of (data.chat && data.chat.rules) || []) {
        Object.defineProperty(r, '_re', { value: new RegExp(r.match, 'iu') });
      }
      data.giftTiers = (data.giftTiers || []).slice().sort((a, b) => b.minDiamonds - a.minDiamonds);
      this.cache.set(game, { mtime: st.mtimeMs, data });
      console.log(`[mapper] đã nạp ${game}.json`);
      return data;
    } catch (e) {
      console.error(`[mapper] lỗi đọc ${game}.json:`, e.message);
      return cached ? cached.data : null;
    }
  }

  list() {
    let files = [];
    try { files = fs.readdirSync(this.dir).filter(f => f.endsWith('.json')); } catch (_) { /* thư mục trống */ }
    return files.map(f => {
      const game = f.slice(0, -5);
      const m = this.get(game);
      return { game, description: (m && m.description) || '' };
    });
  }

  /* Lưu phần "gói quà → hành động" từ trang quản trị vào file mapping. Kiểm tra hết trước khi ghi;
     các phần khác của file (defaults, actions, description...) giữ nguyên. */
  save(game, rules) {
    if (!game || !GAME_ID.test(game)) throw new Error('Tên game không hợp lệ');
    const file = path.join(this.dir, game + '.json');
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    const actions = data.actions || {};
    // o: các trường riêng của luật (khớp, tên quà...), thêm action / value / label nếu có hành động
    const rule = (r, o = {}) => {
      if (!r || !r.action) return o;   // "(không làm gì)" = luật tắt
      if (!actions[r.action]) throw new Error(`Hành động "${r.action}" không có trong "actions" của file`);
      o.action = r.action;
      o.value = int(r.value, 1, 99, 1, 'Giá trị');
      const label = str(r.label, 40);
      if (label) o.label = label;
      return o;
    };
    const next = {};
    for (const k of ['join', 'follow', 'share']) if (rules[k]) next[k] = rule(rules[k]);
    if (rules.like) next.like = rule(rules.like, { every: int(rules.like.every, 0, 10000, 0, 'Số tim') });
    if (rules.chat) {
      next.chat = {
        cooldownSec: int(rules.chat.cooldownSec, 0, 3600, 0, 'Chống spam (giây)'),
        rules: (rules.chat.rules || []).filter(r => str(r.match, 200)).map(r => {
          const match = str(r.match, 200);
          try { new RegExp(match, 'iu'); } catch (e) { throw new Error(`Câu "${match}" không phải biểu thức hợp lệ: ${e.message}`); }
          return rule(r, { match });
        }),
      };
    }
    if (Array.isArray(rules.gifts)) next.gifts = rules.gifts.map(g => {
      const name = str(g.name, 60);
      if (!name) throw new Error('Có dòng quà theo tên chưa điền tên quà');
      const o = rule(g, { name, diamonds: int(g.diamonds, 0, 100000, 1, 'Số xu của ' + name) });
      o.combo = int(g.combo, 1, 9999, 1, 'Combo của ' + name);
      return o;
    });
    if (Array.isArray(rules.giftTiers)) next.giftTiers = rules.giftTiers.map(t => {
      const o = rule(t, { minDiamonds: int(t.minDiamonds, 0, 100000, undefined, 'Quà từ (xu)') });
      o.combo = int(t.combo, 1, 9999, 1, 'Combo của mốc ' + t.minDiamonds + ' xu');
      return o;
    });
    Object.assign(data, next);
    const tmp = file + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
    fs.renameSync(tmp, file);
    this.cache.delete(game);
  }

  /* Lưu cấu hình game làm mặc định: ghi vào "defaults" của file mapping (game nào không có chỉnh riêng thì dùng cái này).
     Danh sách rỗng bị bỏ để dùng mặc định trong code (xem GAME_DEFAULTS ở settings.js). */
  saveDefaults(game, values) {
    if (!game || !GAME_ID.test(game)) throw new Error('Tên game không hợp lệ');
    const file = path.join(this.dir, game + '.json');
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    const defaults = { ...(data.defaults || {}) };
    for (const [k, v] of Object.entries(values || {})) {
      if (Array.isArray(v) && !v.length) delete defaults[k];
      else defaults[k] = v;
    }
    data.defaults = defaults;
    const tmp = file + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
    fs.renameSync(tmp, file);
    this.cache.delete(game);
  }

  stateFor(game) {
    let s = this.state.get(game);
    if (!s) this.state.set(game, (s = { likes: new Map(), chat: new Map() }));
    if (s.likes.size > 20000) s.likes.clear();
    if (s.chat.size > 20000) s.chat.clear();
    return s;
  }

  giftRule(m, raw) {
    const name = String(raw.giftName || '').toLowerCase();
    const byGift = (m.gifts || []).find(g =>
      (g.id != null && String(g.id) === String(raw.giftId)) || (g.name && g.name.toLowerCase() === name));
    if (byGift) return byGift;
    return m.giftTiers.find(t => (raw.diamonds || 0) >= t.minDiamonds) || null;
  }

  /* Trả về mảng sự kiện game (0 hoặc 1 phần tử) */
  map(game, raw) {
    const m = this.get(game);
    if (!m || !raw || !raw.user) return [];
    const st = this.stateFor(game);
    const uid = raw.user.id;
    let rule = null;
    let count = raw.count || 1;
    let diamonds = 0;

    switch (raw.kind) {
      case 'gift':
        rule = this.giftRule(m, raw);
        diamonds = (raw.diamonds || 0) * count;
        break;
      case 'like': {
        const every = (m.like && m.like.every) || 0;
        if (!every) return [];
        const total = (st.likes.get(uid) || 0) + (raw.count || 1);
        count = Math.floor(total / every);
        st.likes.set(uid, total % every);
        if (!count) return [];
        rule = m.like;
        break;
      }
      case 'chat': {
        const ch = m.chat;
        if (!ch) return [];
        const now = Date.now();
        if (now - (st.chat.get(uid) || 0) < (ch.cooldownSec || 0) * 1000) return [];
        rule = (ch.rules || []).find(r => r._re.test(raw.text || '')) || null;
        if (rule) st.chat.set(uid, now);
        count = 1;
        break;
      }
      case 'join': case 'follow': case 'share':
        rule = m[raw.kind] || null;
        count = 1;
        break;
    }
    if (!rule || !rule.action) return [];

    return [{
      type: 'event',
      game,
      action: rule.action,
      value: rule.value != null ? rule.value : 1,
      count,
      label: rule.label || '',
      diamonds,
      user: raw.user,
      source: {
        kind: raw.kind,
        giftId: raw.giftId,
        giftName: raw.giftName,
        diamonds: raw.diamonds,
        text: raw.text,
        simulated: !!raw.simulated,
      },
      ts: Date.now(),
    }];
  }
}

module.exports = { Mapper, editable };
