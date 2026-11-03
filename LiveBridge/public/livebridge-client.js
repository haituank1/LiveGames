/* LiveBridge client cho trình duyệt – mọi game dùng chung file này.
   const bridge = new LiveBridgeClient({ url: 'ws://localhost:8787', game: 'chua-3d' })
     .on('event',  e => ...)   // { action, value, count, label, diamonds, user:{id,nickname,avatar}, source:{kind,giftName,...} }
     .on('status', s => ...)   // { tiktok: { state, username, message } }
     .on('hello',  h => ...)   // { game, mapping }
     .on('open'|'close', ...)
     .connect();
   Tự kết nối lại khi mất kết nối. */
(function (global) {
  'use strict';
  class LiveBridgeClient {
    constructor(opts = {}) {
      this.url = opts.url || 'ws://localhost:8787';
      this.game = opts.game || '';
      this.role = opts.role || 'game';
      this.handlers = {};
      this.retry = 0;
      this.ws = null;
      this.closed = false;
    }
    on(type, fn) { (this.handlers[type] = this.handlers[type] || []).push(fn); return this; }
    emit(type, data) {
      for (const fn of this.handlers[type] || []) { try { fn(data); } catch (e) { console.error('[LiveBridge]', e); } }
    }
    connect() {
      this.closed = false;
      const u = this.url + (this.url.includes('?') ? '&' : '?') + 'game=' + encodeURIComponent(this.game) + '&role=' + encodeURIComponent(this.role);
      let ws;
      try { ws = new WebSocket(u); } catch (e) { this.reconnect(); return this; }
      this.ws = ws;
      ws.onopen = () => { this.retry = 0; this.emit('open'); };
      ws.onmessage = e => {
        let m;
        try { m = JSON.parse(e.data); } catch (_) { return; }
        if (m && m.type) this.emit(m.type, m);
      };
      ws.onclose = () => { if (this.ws !== ws) return; this.emit('close'); if (!this.closed) this.reconnect(); };
      return this;
    }
    reconnect() {
      const delay = Math.min(10000, 500 * Math.pow(2, this.retry++));
      setTimeout(() => { if (!this.closed) this.connect(); }, delay);
    }
    send(obj) {
      if (this.ws && this.ws.readyState === 1) { this.ws.send(JSON.stringify(obj)); return true; }
      return false;
    }
    /* Gửi sự kiện giả (đi qua đúng bộ quy đổi như sự kiện thật) */
    simulate(event) { return this.send({ type: 'simulate', event }); }
    close() { this.closed = true; if (this.ws) this.ws.close(); }
  }
  global.LiveBridgeClient = LiveBridgeClient;
})(window);
