'use strict';
/* TTS dùng chung cho NPC của mọi game (MC đám cưới, thầy chùa, ...).
   Chuyển từ engine đã chạy ổn trong ToolVoiceTikTok (repo riêng của chủ kênh):
   giọng Microsoft HoaiMy/NamMinh qua node-edge-tts, lỗi thì retry 1s/2s rồi
   rơi về giọng Google. Khác với voice khán giả (chỉ ở RAM, không lưu), câu NPC
   phần lớn là câu mẫu lặp lại + câu ghép tên — nên CACHE XUỐNG ĐĨA trong
   LiveBridge/voice-cache/: chuyển 1 lần, lần sau lấy ra phát ngay (prefetch
   lúc NPC sắp nói nên khi chữ hiện lên là tiếng đã sẵn sàng).

   Hàng đợi chuyển giọng NỐI TIẾP có ưu tiên: job NPC (prio cao) chen trước
   job thường — không bao giờ gọi 2 lần TTS cùng lúc (tránh bị giới hạn). */
const fs = require('fs');
const path = require('path');
const https = require('https');
const crypto = require('crypto');
const { normalizeText, splitSentences } = require('./chuan-hoa');

const PROXY = process.env.https_proxy || process.env.HTTPS_PROXY || process.env.http_proxy || process.env.HTTP_PROXY || '';
const VOICES = ['vi-VN-HoaiMyNeural', 'vi-VN-NamMinhNeural'];
const sleep = ms => new Promise(r => setTimeout(r, ms));

/* Làm sạch câu NPC trước khi đọc: bỏ emoji/ký hiệu trang trí (TTS đọc ra
   tiếng lạ), ❤/♥ -> "và", & -> "và", rồi chuẩn hoá số/ngày/tiền như tool cũ. */
function cleanForSpeech(text) {
  let t = String(text || '');
  t = t.replace(/[❤♥💍🎉🙏✨👑💐🎁🔥⭐]/g, ' và ');
  t = t.replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{200D}]/gu, ' ');
  t = t.replace(/&/g, ' và ').replace(/[#*_~`•·|/\\<>@]/g, ' ');
  t = t.replace(/\s+/g, ' ').trim();
  return normalizeText(t);
}

/* Việc trong hàng đợi tổng hợp mà phải CHỜ quá lâu thì coi là THỪA: trang
   game đã F5/khởi động lại (đúng tình huống Nguyen nêu 2026-11-04) thì
   không còn ai nghe các câu đó nữa — giữ lại chỉ tổ nghẽn hàng đợi cho
   yêu cầu mới. Mặc định 5 phút; biến môi trường TTS_STALE_MS chỉ để test. */
const STALE_MS = Number(process.env.TTS_STALE_MS) > 0 ? Number(process.env.TTS_STALE_MS) : 5 * 60 * 1000;

class TtsEngine {
  constructor(cacheDir) {
    this.cacheDir = cacheDir;
    this.ram = new Map();          // key -> Buffer (tối đa ~80 câu gần nhất)
    this.pending = new Map();       // key -> Promise<Buffer|null>
    this.queue = [];                // [{ key, text, voice, rate, prio, at, resolve }]
    this.busy = false;
    this.stats = { synth: 0, cacheHit: 0, errors: 0, stale: 0 };
    try { fs.mkdirSync(cacheDir, { recursive: true }); } catch (_) { /* không ghi được thì chỉ dùng RAM */ }
    // Tự quét định kỳ để hàng đợi không bao giờ chứa việc quá hạn,
    // kể cả khi không có yêu cầu mới nào tới để kích hoạt vòng pump.
    this._sweepTimer = setInterval(() => this.sweepStale(), 30000);
    if (this._sweepTimer.unref) this._sweepTimer.unref();
  }

  /* Xoá các việc ĐANG CHỜ đã quá hạn (mặc định 5 phút): trả lời null cho
     phía đang chờ để POST kết thúc êm (game coi như chuyển giọng hụt 1
     lần, hiện chữ thay thế — đúng đường lỗi sẵn có). Việc đang tổng hợp
     dở KHÔNG bị đụng (chỉ vài giây là xong). LƯU Ý: cache file trên đĩa
     không xoá — đó là thư viện đoạn đã tổng hợp để dùng lại mãi, xoá đi
     là mỗi câu phải tổng hợp lại từ đầu, còn nghẽn hơn. */
  sweepStale(maxAgeMs = STALE_MS) {
    if (!this.queue.length) return 0;
    const now = Date.now();
    let dropped = 0;
    this.queue = this.queue.filter(job => {
      if (now - (job.at || now) > maxAgeMs) { dropped++; this.stats.stale++; job.resolve(null); return false; }
      return true;
    });
    return dropped;
  }

  key(text, voice, rate) {
    return crypto.createHash('sha256').update(`${voice}|${rate}|${text}`).digest('hex').slice(0, 32);
  }

  _diskGet(key) {
    try {
      const f = path.join(this.cacheDir, key + '.mp3');
      if (fs.existsSync(f)) { const b = fs.readFileSync(f); if (b.length > 500) return b; }
    } catch (_) { /* file hỏng -> coi như chưa có */ }
    return null;
  }
  _diskPut(key, buf, meta) {
    try {
      fs.writeFileSync(path.join(this.cacheDir, key + '.mp3'), buf);
      const idxFile = path.join(this.cacheDir, 'index.json');
      let idx = {};
      try { idx = JSON.parse(fs.readFileSync(idxFile, 'utf8')); } catch (_) { idx = {}; }
      idx[key] = { ...meta, savedAt: new Date().toISOString() };
      fs.writeFileSync(idxFile, JSON.stringify(idx, null, 1));
    } catch (_) { /* không lưu được cũng không sao, RAM vẫn giữ */ }
  }
  _ramPut(key, buf) {
    this.ram.set(key, buf);
    if (this.ram.size > 80) this.ram.delete(this.ram.keys().next().value);
  }

  /* Chuẩn bị voice cho 1 câu: có cache thì trả ngay, chưa có thì xếp hàng
     chuyển (prio: NPC sự kiện > NPC ngẫu nhiên > thường). Trả { id, cached }
     — id dùng để lấy audio qua GET /api/tts/audio/<id>.mp3 */
  async prepare(rawText, opts = {}) {
    const text = cleanForSpeech(rawText);
    if (!text) throw new Error('Câu trống');
    if (text.length > 300) throw new Error('Câu quá dài (tối đa 300 ký tự)');
    const voice = VOICES.includes(opts.voice) ? opts.voice : VOICES[0];
    const rate = Math.max(-50, Math.min(50, parseInt(opts.rate ?? 0) || 0));
    const key = this.key(text, voice, rate);
    if (this.ram.has(key)) { this.stats.cacheHit++; return { id: key, cached: true }; }
    const disk = this._diskGet(key);
    if (disk) { this._ramPut(key, disk); this.stats.cacheHit++; return { id: key, cached: true }; }
    if (!this.pending.has(key)) {
      const p = new Promise(resolve => {
        this.queue.push({ key, text, voice, rate, prio: Number(opts.prio) || 1, at: Date.now(), resolve });
        this.queue.sort((a, b) => b.prio - a.prio);
        this._pump();
      });
      this.pending.set(key, p);
      p.then(() => this.pending.delete(key));
    }
    const buf = await this.pending.get(key);
    if (!buf) throw new Error('Chuyển giọng thất bại (cả Microsoft lẫn Google)');
    return { id: key, cached: false };
  }

  async _pump() {
    if (this.busy) return;
    this.busy = true;
    while (this.queue.length) {
      this.sweepStale();   // dọn việc quá hạn trước mỗi lượt — việc ở đầu hàng mà đã chờ quá 5 phút thì bỏ luôn, khỏi tốn lượt tổng hợp
      if (!this.queue.length) break;
      const job = this.queue.shift();
      try {
        const buf = await this._synthesize(job.text, job.voice, job.rate);
        if (buf && buf.length) {
          this._ramPut(job.key, buf);
          this._diskPut(job.key, buf, { text: job.text, voice: job.voice, rate: job.rate });
          this.stats.synth++;
          job.resolve(buf);
        } else { this.stats.errors++; job.resolve(null); }
      } catch (e) { this.stats.errors++; job.resolve(null); }
    }
    this.busy = false;
  }

  audio(id) {
    if (!/^[a-f0-9]{32}$/.test(String(id))) return null;
    if (this.ram.has(id)) return this.ram.get(id);
    const disk = this._diskGet(id);
    if (disk) this._ramPut(id, disk);
    return disk;
  }

  /* ---- engine gốc của ToolVoiceTikTok: Edge (retry 1s, 2s) -> Google ---- */
  async _synthesize(text, voice, rate) {
    let lastErr = null;
    for (const wait of [0, 1000, 2000]) {
      if (wait) await sleep(wait);
      try {
        const buf = await this._edge(text, voice, rate);
        if (buf && buf.length) return buf;
        lastErr = 'Edge TTS trả về rỗng';
      } catch (e) { lastErr = String((e && e.message) || e); }
    }
    try {
      const buf = await this._google(text);
      if (buf && buf.length) { console.log('[tts] dùng giọng Google dự phòng (Microsoft lỗi: ' + (lastErr || '?') + ')'); return buf; }
    } catch (e) { console.error('[tts] Google cũng lỗi:', String((e && e.message) || e)); }
    return null;
  }

  async _edge(text, voice, rate) {
    const { EdgeTTS } = require('node-edge-tts');
    const tts = new EdgeTTS({
      voice, lang: 'vi-VN',
      rate: rate === 0 ? 'default' : (rate > 0 ? `+${rate}%` : `${rate}%`),
      proxy: PROXY || undefined, timeout: 45000,
    });
    const bufs = [];
    for await (const chunk of tts.streamAudio(text)) if (Buffer.isBuffer(chunk)) bufs.push(chunk);
    return Buffer.concat(bufs);
  }

  _googleChunk(chunk) {
    const url = 'https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=vi&q=' + encodeURIComponent(chunk);
    return new Promise((resolve, reject) => {
      const req = https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }, timeout: 30000 }, res => {
        if (res.statusCode !== 200) { res.resume(); return reject(new Error('Google TTS HTTP ' + res.statusCode)); }
        const bufs = [];
        res.on('data', d => bufs.push(d));
        res.on('end', () => resolve(Buffer.concat(bufs)));
      });
      req.on('timeout', () => req.destroy(new Error('Google TTS quá thời gian chờ')));
      req.on('error', reject);
    });
  }
  async _google(text) {
    const parts = [];
    for (const chunk of splitSentences(text, 180)) parts.push(await this._googleChunk(chunk));
    return Buffer.concat(parts);
  }
}

module.exports = { TtsEngine, VOICES, cleanForSpeech };
