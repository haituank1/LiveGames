'use strict';
/* Kết nối TikTok LIVE qua thư viện tiktok-live-connector (không chính thức).
   Chuẩn hoá mọi sự kiện về dạng "raw" chung để mapper xử lý:
     { kind: 'gift'|'like'|'chat'|'join'|'follow'|'share', user: {id, uniqueId, nickname, avatar}, ... }
   và sự kiện phòng: 'room' { viewers }.
   Hỗ trợ cả API v2 (TikTokLiveConnection) lẫn v1 (WebcastPushConnection). */
const { EventEmitter } = require('events');

const firstUrl = v => {
  if (!v) return '';
  if (typeof v === 'string') return v;
  if (Array.isArray(v)) return firstUrl(v[0]);
  return firstUrl(v.url || v.urls || v.urlList || v.url_list);
};

/* v3 (tiktok-live-connector 2.5): user.id, user.displayId (= @username), user.avatarThumb.urlList
   v1/v2 cũ: user.userId, user.uniqueId, user.profilePicture(Url) */
function normUser(d) {
  const u = d.user || d;
  const uniqueId = u.uniqueId || u.displayId || d.uniqueId || '';
  return {
    id: String(u.userId || u.id || u.idStr || d.userId || uniqueId || ''),
    uniqueId,
    nickname: u.nickname || d.nickname || uniqueId || 'Ẩn danh',
    avatar: firstUrl(u.profilePictureUrl) || firstUrl(u.profilePicture) || firstUrl(u.avatarThumb)
      || firstUrl(u.avatarMedium) || firstUrl(d.profilePictureUrl) || '',
  };
}

class TikTokSource extends EventEmitter {
  /* opts: { autoReconnect, reconnectDelaySec, connectionOptions, debugRaw } */
  constructor(opts = {}) {
    super();
    this.opts = opts;
    this.conn = null;
    this.username = '';
    this.signApiKey = '';
    this.wanted = false;
    this.timer = null;
    this.dumped = new Set();
    this.status = { state: 'idle', username: '' };
  }

  setStatus(state, extra = {}) {
    this.status = { state, username: this.username, ...extra };
    this.emit('status', this.status);
  }

  start(username, signApiKey = '') {
    username = String(username || '').trim().replace(/^@/, '');
    if (!username) return;
    this.stop();
    this.username = username;
    this.signApiKey = signApiKey;
    this.wanted = true;
    this.connect();
  }

  stop() {
    this.wanted = false;
    clearTimeout(this.timer);
    const c = this.conn;
    this.conn = null;
    if (c) { try { c.disconnect(); } catch (_) { /* bỏ qua */ } }
    if (this.status.state !== 'idle') this.setStatus('idle');
  }

  async connect() {
    if (this.conn) { try { this.conn.disconnect(); } catch (_) { /* bỏ qua */ } this.conn = null; }
    let lib;
    try {
      lib = await import('tiktok-live-connector');
    } catch (e) {
      this.setStatus('error', { message: 'Chưa cài tiktok-live-connector – chạy "npm install" trong thư mục LiveBridge' });
      return;
    }
    const L = (lib.TikTokLiveConnection || lib.WebcastPushConnection) ? lib : (lib.default || lib);
    const Conn = L.TikTokLiveConnection || L.WebcastPushConnection;
    if (!Conn) { this.setStatus('error', { message: 'Phiên bản tiktok-live-connector không được hỗ trợ' }); return; }

    const options = { ...(this.opts.connectionOptions || {}) };
    if (this.signApiKey) options.signApiKey = this.signApiKey;
    // Không bật enableExtendedGiftInfo: nó gọi API danh sách quà cần gói Euler Business (trả phí).
    // Tên + giá quà đã có sẵn trong mỗi sự kiện quà (gift.name, gift.diamondCount).

    let conn;
    try { conn = new Conn(this.username, options); }
    catch (e) { this.setStatus('error', { message: String((e && e.message) || e) }); return; }
    this.conn = conn;
    this.attach(conn);
    this.setStatus('connecting');
    try {
      const state = await conn.connect();
      if (this.conn !== conn) return;
      this.setStatus('connected', { roomId: state && (state.roomId || (state.roomInfo && state.roomInfo.id)) });
    } catch (e) {
      if (this.conn !== conn) return;
      const msg = String((e && (e.message || e.info)) || e);
      const offline = /offline|not live|isn't online|LIVE has ended|user_not_found/i.test(msg);
      this.setStatus('error', { message: offline ? 'Tài khoản này đang không LIVE (hoặc sai username)' : msg });
      this.scheduleReconnect();
    }
  }

  scheduleReconnect() {
    if (!this.wanted || this.opts.autoReconnect === false) return;
    clearTimeout(this.timer);
    this.timer = setTimeout(() => { if (this.wanted) this.connect(); }, (this.opts.reconnectDelaySec || 15) * 1000);
  }

  attach(conn) {
    const on = (name, fn) => conn.on(name, d => {
      if (this.conn !== conn) return;
      if (this.opts.debugRaw && !this.dumped.has(name)) {   // in mẫu dữ liệu thô mỗi loại 1 lần để đối chiếu
        this.dumped.add(name);
        try { console.log(`[tiktok raw:${name}]`, JSON.stringify(d, null, 1).slice(0, 3000)); } catch (_) { /* bỏ qua */ }
      }
      try { fn(d || {}); } catch (e) { console.error('[tiktok]', name, e); }
    });
    const emit = ev => this.emit('event', ev);

    on('gift', d => {
      const g = d.gift || d.giftDetails || {};     // v3: d.gift { name, diamondCount, type, image }
      const x = d.extendedGiftInfo || {};
      const giftType = d.giftType != null ? d.giftType : (g.type != null ? g.type : g.giftType);
      // quà "combo" bắn nhiều sự kiện trong lúc đang nhấn; chỉ lấy sự kiện cuối (repeatEnd)
      if ((giftType === 1 || g.combo === true) && !d.repeatEnd) return;
      emit({
        kind: 'gift',
        user: normUser(d),
        giftId: d.giftId != null ? d.giftId : (g.id != null ? g.id : g.giftId),
        giftName: d.giftName || g.giftName || g.name || x.name || '',
        giftImage: firstUrl(d.giftPictureUrl) || firstUrl(g.image) || firstUrl(g.giftImage) || firstUrl(g.icon) || firstUrl(x.image) || '',
        diamonds: Number(d.diamondCount != null ? d.diamondCount : (g.diamondCount || x.diamond_count || 0)),
        count: Number(d.repeatCount || 1),
      });
    });
    on('chat', d => emit({ kind: 'chat', user: normUser(d), text: String(d.comment != null ? d.comment : (d.content || '')) }));
    on('like', d => emit({ kind: 'like', user: normUser(d), count: Number(d.likeCount || d.count || 1) }));
    on('member', d => emit({ kind: 'join', user: normUser(d) }));
    on('follow', d => emit({ kind: 'follow', user: normUser(d) }));
    on('share', d => emit({ kind: 'share', user: normUser(d) }));
    // TikTok không báo khi ai rời phòng; ranks (v3) / topViewers (v1-2) là danh sách người xem top ĐANG ở trong phòng,
    // gửi id cho game để họ vẫn được tính điểm thời gian dù không tương tác
    on('roomUser', d => {
      const list = d.ranks || d.topViewers || d.ranksList || [];
      const present = list.map(r => normUser(r.user || r).id).filter(Boolean);
      this.emit('room', { viewers: Number(d.viewerCount || d.total || d.totalUser || 0), present });
    });
    on('streamEnd', () => { this.setStatus('ended', { message: 'Buổi LIVE đã kết thúc' }); this.scheduleReconnect(); });
    on('disconnected', () => { this.setStatus('disconnected'); this.scheduleReconnect(); });
    on('error', e => console.error('[tiktok] lỗi:', (e && (e.info || e.message)) || e));
  }
}

module.exports = { TikTokSource, normUser };
