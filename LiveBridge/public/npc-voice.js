/* Voice NPC dùng chung cho mọi game — MC đám cưới, thầy chùa, ...
   Cách hoạt động (đúng yêu cầu của chủ kênh):
   1. CHUẨN BỊ TRƯỚC: game gọi NpcVoice.prefetch(câu) ngay khi câu được xếp
      vào hàng chờ nói — LiveBridge chuyển giọng sẵn + cache, tới lượt hiện
      chữ thì tiếng đã sẵn sàng, chữ hiện lên là NPC nói LUÔN, không trễ.
   2. ƯU TIÊN TUYỆT ĐỐI: lúc NPC bắt đầu nói, lib này (a) hạ nhạc nền/SFX
      của game qua sự kiện window 'npcvoice:start'/'npcvoice:end', và
      (b) báo LiveBridge {type:'npc-voice'} — LiveBridge phát cho MỌI client
      đang nối, gồm ToolVoiceTikTok: tool đó tự tắt tiếng voice khán giả
      đang phát + giữ hàng chờ, NPC nói xong mới phát tiếp.
   3. TẦN SUẤT: minGapSec (giây tối thiểu giữa 2 câu NPC có tiếng) +
      maxPerMin (số câu có tiếng tối đa mỗi phút). Câu ngẫu nhiên (kind
      'random') vướng tần suất thì chỉ hiện chữ, không phát tiếng; câu sự
      kiện (kind 'event': giới thiệu cặp đôi, cảm ơn quà, mốc...) được ưu
      tiên — chỉ vướng minGap rút gọn. Tắt tiếng câu ngẫu nhiên riêng bằng
      randomOn=false (chữ vẫn hiện).
   4. Voice lỗi/chậm quá waitMs thì hiện chữ luôn, game không bao giờ kẹt
      vì chờ tiếng.

   Dùng:
     <script src="../../LiveBridge/public/npc-voice.js"></script>
     NpcVoice.setConfig(cfg);            // từ config game (npcVoice*)
     NpcVoice.attach(bridgeClient);      // để báo ưu tiên qua LiveBridge
     NpcVoice.prefetch(text);            // khi câu vào hàng chờ
     const r = await NpcVoice.speak(text, { kind:'event',
        onStart({durationMs}) { ...hiện chữ... } });
     // r.played=false + chưa onStart => tự hiện chữ theo cách cũ
     // Phát theo ĐOẠN (tối ưu TTS): speakParts(['Đoạn tĩnh', 'Tên', 'đoạn tĩnh 2'])
     // — đoạn tĩnh tổng hợp 1 lần cache mãi, mỗi lần chỉ tốn tổng hợp đoạn tên.
*/
(function (global) {
  'use strict';
  const DEF = { on: false, voice: 'vi-VN-HoaiMyNeural', rate: 0, volume: 90, minGapSec: 8, maxPerMin: 6, randomOn: true, waitMs: 4000 };
  const NV = {
    cfg: { ...DEF },
    _send: null,
    _cache: new Map(),        // text|voice|rate -> { url, promise }
    _playing: false,
    _lastStart: 0,
    _starts: [],              // mốc bắt đầu trong 60s gần nhất
    _audio: null,

    setConfig(c) {
      if (!c) return;
      const m = { on: 'npcVoiceOn', voice: 'npcVoice', rate: 'npcVoiceRate', volume: 'npcVoiceVolume', minGapSec: 'npcVoiceMinGapSec', maxPerMin: 'npcVoiceMaxPerMin', randomOn: 'npcVoiceRandomOn', waitMs: 'npcVoiceWaitMs' };
      for (const [k, ck] of Object.entries(m)) {
        if (c[ck] != null) this.cfg[k] = c[ck];
        if (c[k] != null) this.cfg[k] = c[k];
      }
    },
    enabled() { return !!this.cfg.on; },
    attach(client) { if (client && client.send) this._send = m => client.send(m); },
    attachSend(fn) { this._send = fn; },

    _key(text) { return this.cfg.voice + '|' + this.cfg.rate + '|' + text; },

    /* Chuyển giọng trước, không phát — gọi ngay khi câu vào hàng chờ. */
    prefetch(text) {
      if (!this.cfg.on || !text) return null;
      const key = this._key(text);
      const hit = this._cache.get(key);
      if (hit) return hit.promise;
      const entry = { url: null, promise: null };
      entry.promise = (async () => {
        try {
          const r = await fetch('/api/tts', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text, voice: this.cfg.voice, rate: this.cfg.rate, prio: 2 }),
          });
          const j = await r.json();
          if (j && j.ok && j.url) { entry.url = j.url; return entry; }
        } catch (_) { /* không qua LiveBridge / mạng lỗi -> speak() sẽ fallback hiện chữ */ }
        return null;
      })();
      this._cache.set(key, entry);
      if (this._cache.size > 240) this._cache.delete(this._cache.keys().next().value);   // 240: đủ giữ toàn bộ đoạn tĩnh đã làm nóng lúc setup (đám cưới ~89 đoạn) + tên khách trong buổi, khỏi bị đẩy ra rồi phải xin lại
      return entry.promise;
    },

    _gate(kind) {
      const now = Date.now();
      this._starts = this._starts.filter(t => now - t < 60000);
      if (kind === 'random' && !this.cfg.randomOn) return 'random-off';
      const gap = kind === 'random' ? this.cfg.minGapSec * 1000 : Math.min(2000, this.cfg.minGapSec * 1000);
      if (now - this._lastStart < gap) return 'gap';
      if (this._starts.length >= this.cfg.maxPerMin) return 'per-min';
      return null;
    },

    /* Phát 1 câu. onStart gọi đúng khoảnh khắc tiếng bắt đầu (game hiện chữ
       ở đó). Trả { played, durationMs?, reason? } */
    async speak(text, opts = {}) {
      if (!this.cfg.on || !text) return { played: false, reason: 'off' };
      const kind = opts.kind || 'event';
      // nối tiếp tuyệt đối: câu trước đang phát thì chờ nó xong (game đã có
      // hàng chờ riêng, đây chỉ là chốt an toàn chống chồng tiếng)
      for (let i = 0; this._playing && i < 100; i++) await new Promise(r => setTimeout(r, 120));
      const blocked = this._gate(kind);
      if (blocked) return { played: false, reason: blocked };
      const ready = await Promise.race([
        this.prefetch(text),
        new Promise(r => setTimeout(() => r(null), this.cfg.waitMs)),
      ]);
      if (!ready || !ready.url) return { played: false, reason: 'not-ready' };
      const audio = new Audio(ready.url);
      audio.volume = Math.max(0, Math.min(1, this.cfg.volume / 100));
      audio.preload = 'auto';
      const durMs = await new Promise(res => {
        const to = setTimeout(() => res(0), 1200);
        audio.addEventListener('loadedmetadata', () => { clearTimeout(to); res(isFinite(audio.duration) ? audio.duration * 1000 : 0); }, { once: true });
        audio.addEventListener('error', () => { clearTimeout(to); res(0); }, { once: true });
      });
      this._playing = true;
      this._lastStart = Date.now();
      this._starts.push(this._lastStart);
      this._audio = audio;
      this._notify('start', text);
      try { if (opts.onStart) opts.onStart({ durationMs: durMs }); } catch (e) { console.error('[NpcVoice]', e); }
      try { await audio.play(); } catch (_) { this._playing = false; this._notify('end', text); return { played: false, reason: 'autoplay' }; }
      await new Promise(res => {
        audio.addEventListener('ended', res, { once: true });
        audio.addEventListener('error', res, { once: true });
        setTimeout(res, (durMs || 15000) + 8000);   // chốt an toàn
      });
      this._playing = false;
      this._audio = null;
      this._notify('end', text);
      return { played: true, durationMs: durMs };
    },

    /* Phát 1 câu gồm NHIỀU ĐOẠN nối tiếp (tối ưu TTS cho câu mẫu có sẵn):
       các đoạn tĩnh được tổng hợp 1 lần rồi cache mãi, mỗi sự kiện chỉ tốn
       tổng hợp đoạn TÊN ngắn — thay vì tổng hợp cả câu dài chứa tên (không
       bao giờ trúng cache). Ngữ nghĩa như speak(): cổng tần suất tính 1 lần
       cho cả câu, chờ MỌI đoạn sẵn sàng tối đa waitMs (đoạn nào lỗi/chậm
       quá hạn -> { played:false } để game hiện chữ như cũ), onStart gọi 1
       lần khi đoạn đầu bắt đầu với durationMs = TỔNG thời lượng các đoạn,
       báo start/end đúng 1 lần (text = các đoạn nối bằng khoảng trắng).
       Đoạn giữa chừng lỗi lúc phát -> bỏ qua đoạn đó, phát tiếp đoạn sau. */
    async speakParts(parts, opts = {}) {
      const list = (parts || []).map(s => String(s == null ? '' : s).trim()).filter(Boolean);
      if (!this.cfg.on || list.length < 2) return { played: false, reason: 'off' };
      const kind = opts.kind || 'event';
      const text = list.join(' ');
      for (let i = 0; this._playing && i < 100; i++) await new Promise(r => setTimeout(r, 120));
      const blocked = this._gate(kind);
      if (blocked) return { played: false, reason: blocked };
      const readies = await Promise.race([
        Promise.all(list.map(p => this.prefetch(p))),
        new Promise(r => setTimeout(() => r(null), this.cfg.waitMs)),
      ]);
      if (!readies || readies.some(e => !e || !e.url)) return { played: false, reason: 'not-ready' };
      const clips = [];
      let totalMs = 0;
      for (const e of readies) {
        const audio = new Audio(e.url);
        audio.volume = Math.max(0, Math.min(1, this.cfg.volume / 100));
        audio.preload = 'auto';
        const d = await new Promise(res => {
          const to = setTimeout(() => res(0), 1200);
          audio.addEventListener('loadedmetadata', () => { clearTimeout(to); res(isFinite(audio.duration) ? audio.duration * 1000 : 0); }, { once: true });
          audio.addEventListener('error', () => { clearTimeout(to); res(0); }, { once: true });
        });
        clips.push({ audio, durMs: d });
        totalMs += d;
      }
      this._playing = true;
      this._lastStart = Date.now();
      this._starts.push(this._lastStart);
      this._notify('start', text);
      try { if (opts.onStart) opts.onStart({ durationMs: totalMs }); } catch (e) { console.error('[NpcVoice]', e); }
      let anyPlayed = false;
      for (const clip of clips) {
        this._audio = clip.audio;
        try { await clip.audio.play(); } catch (_) { continue; }   // đoạn lỗi -> bỏ qua, phát đoạn sau
        anyPlayed = true;
        await new Promise(res => {
          clip.audio.addEventListener('ended', res, { once: true });
          clip.audio.addEventListener('error', res, { once: true });
          setTimeout(res, (clip.durMs || 15000) + 8000);   // chốt an toàn
        });
      }
      this._playing = false;
      this._audio = null;
      this._notify('end', text);
      if (!anyPlayed) return { played: false, reason: 'autoplay' };
      return { played: true, durationMs: totalMs };
    },

    _notify(state, text) {
      try { if (this._send) this._send({ type: 'npc-voice', state, text: String(text || '').slice(0, 200) }); } catch (_) {}
      try { global.dispatchEvent(new CustomEvent('npcvoice:' + state, { detail: { text } })); } catch (_) {}
    },
  };
  global.NpcVoice = NV;
})(window);
