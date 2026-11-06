/* Âm thanh Lớp học chữ.
   - Nhạc nền tự tạo bằng WebAudio (vòng hợp âm C–Am–F–G chậm, nhẹ) hoặc
     file trong audio/ nếu có (LiveBridge liệt kê qua /api/media).
   - SFX tự tạo: chuông lớp (bell), pháo giấy (sparkle), nổ (boom), reo (cheer).
   - VOICE TĨNH LÀ MẶC ĐỊNH (bài học V11 game đám cưới): mọi câu cố định
     của cô An / MC đều có sẵn file mp3 trong voice-static/ + index.json
     (sinh bằng tools/tao-giong-lop-hoc.js, key sha256 voice|rate|text).
     Game đọc file tĩnh TRƯỚC; chỉ tên người chơi (động) mới tổng hợp live
     qua NpcVoice, và câu tĩnh nào thiếu file thì im lặng hiện chữ — game
     không bao giờ kẹt vì chờ tiếng.
   - AudioContext chỉ mở sau gesture: OBS / LIVE Studio không bao giờ có
     gesture nên tự resume định kỳ mỗi giây + khi tab hiện lại (như dam-cuoi).
   - Prefetch lỗi thì xóa entry khỏi cache để lần sau thử lại (V11).
   - Warm-up câu tĩnh ở mức ưu tiên thấp, bơm từng đợt 2 file, câu thật
     chen trước (warm-up dừng ngay khi có câu thật cần phát). */
(function () {
'use strict';
const W = (window.Classroom = window.Classroom || {});
const A = (W.audio = {});
const GAME_ID = 'lop-hoc-chu';
const cfg = { musicVolume: 30, sfxVolume: 55, musicOn: true, sfxOn: true, musicShuffle: true, voiceOn: true, voiceVolume: 90 };
let ctx = null, master, sfxBus, musicBus;
const last = {};
let bgm = null, playlist = [], track = -1, failed = 0, bgmBlocked = false;
let ambientTimer = null, ambientOn = false;

A.init = async function () {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (AC) {
    ctx = new AC();
    master = ctx.createGain(); master.connect(ctx.destination);
    sfxBus = ctx.createGain(); sfxBus.connect(master);
    musicBus = ctx.createGain(); musicBus.connect(master);
    ctx.onstatechange = notify;
    applyVolumes();
  }
  const unlock = () => A.resume();
  addEventListener('pointerdown', unlock); addEventListener('keydown', unlock);
  setInterval(() => A.resume(), 1000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) A.resume(); });
  let media = null;
  // Chỉ hỏi /api/media khi đang chạy qua LiveBridge (cổng 8787) — chạy
  // bằng python http.server thì endpoint này không có, khỏi sinh 404.
  if (location.port === '8787') {
    try { const r = await fetch('/api/media?game=' + GAME_ID); if (r.ok) media = await r.json(); } catch (_) { /* không chạy qua LiveBridge */ }
  }
  playlist = (media && media.music) || [];
  startMusic();
  loadVoiceIndex();
};
A.state = () => (ctx && ctx.state === 'suspended') || bgmBlocked ? 'suspended' : 'running';
A.resume = function () {
  if (ctx && ctx.state === 'suspended') ctx.resume();
  if (bgm && bgmBlocked && cfg.musicOn) bgm.play().then(() => { bgmBlocked = false; notify(); }).catch(() => {});
  if (!bgm && cfg.musicOn && !playlist.length) ambientStart();
};
function notify() { if (A.onState) A.onState(A.state()); }
A.setConfig = function (c) {
  if (!c) return;
  for (const k of Object.keys(cfg)) if (c[k] != null) cfg[k] = c[k];
  for (const k of ['musicVolume', 'sfxVolume', 'voiceVolume']) if (cfg[k] > 0 && cfg[k] <= 1) cfg[k] = cfg[k] * 100;
  applyVolumes();
  if (!cfg.musicOn) { if (bgm) bgm.pause(); ambientStop(); }
  else startMusic();
};
let npcDuck = 1;
addEventListener('npcvoice:start', () => { npcDuck = 0.22; applyVolumes(); });
addEventListener('npcvoice:end', () => { npcDuck = 1; applyVolumes(); });
function applyVolumes() {
  if (bgm) bgm.volume = Math.min(1, (cfg.musicVolume / 100) ** 2 * npcDuck);
  if (!ctx) return;
  const t = ctx.currentTime;
  sfxBus.gain.setTargetAtTime(cfg.sfxOn ? (cfg.sfxVolume / 100) ** 1.5 : 0, t, 0.1);
  musicBus.gain.setTargetAtTime(cfg.musicOn ? (cfg.musicVolume / 100) ** 2 * 0.9 * npcDuck : 0, t, 0.3);
}
function startMusic() {
  if (!cfg.musicOn) return;
  if (!playlist.length) return ambientStart();
  if (!bgm) {
    bgm = new Audio(); bgm.preload = 'auto';
    bgm.addEventListener('ended', nextTrack);
    bgm.addEventListener('error', () => { if (++failed >= playlist.length) { bgm = null; playlist = []; ambientStart(); } else nextTrack(); });
  }
  if (bgm.paused) nextTrack();
}
function nextTrack() {
  if (!bgm || !playlist.length) return;
  if (cfg.musicShuffle && playlist.length > 1) { let n; do { n = Math.floor(Math.random() * playlist.length); } while (n === track); track = n; }
  else track = (track + 1) % playlist.length;
  bgm.loop = playlist.length === 1;
  bgm.src = 'audio/' + encodeURIComponent(playlist[track]);
  bgm.volume = Math.min(1, (cfg.musicVolume / 100) ** 2 * npcDuck);
  bgm.play().then(() => { bgmBlocked = false; notify(); }).catch(e => { if (e && e.name === 'NotAllowedError') { bgmBlocked = true; notify(); } });
}
const CHORDS = [
  { bass: 130.81, notes: [261.63, 329.63, 392.00] },
  { bass: 110.00, notes: [220.00, 261.63, 329.63] },
  { bass: 87.31, notes: [174.61, 220.00, 349.23] },
  { bass: 98.00, notes: [196.00, 246.94, 392.00] },
];
function pluck(freq, when, gain, decay) {
  const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = freq;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, when); g.gain.exponentialRampToValueAtTime(gain, when + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, when + decay);
  o.connect(g); g.connect(musicBus); o.start(when); o.stop(when + decay + 0.1);
}
function ambientStart() {
  if (!ctx || ambientOn || !cfg.musicOn) return;
  ambientOn = true;
  let step = 0;
  const bar = () => {
    if (!ambientOn) return;
    if (!ctx || ctx.state !== 'running') { ambientTimer = setTimeout(bar, 1000); return; }
    const c = CHORDS[step % CHORDS.length], t = ctx.currentTime + 0.05;
    pluck(c.bass, t, 0.16, 3.6);
    c.notes.forEach((f, i) => pluck(f, t + i * 0.5, 0.10, 3));
    step++;
    ambientTimer = setTimeout(bar, 4200);
  };
  bar();
}
function ambientStop() { ambientOn = false; clearTimeout(ambientTimer); }

/* ---------- SFX tự tạo ---------- */
function bell(freq, gain, decay, when) {
  const t0 = when || ctx.currentTime;
  for (const [ratio, amp, dk] of [[1, 1, 1], [2.0, 0.5, 0.7], [2.76, 0.35, 0.5]]) {
    const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = freq * ratio;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(gain * amp, t0 + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + decay * dk);
    o.connect(g); g.connect(sfxBus); o.start(t0); o.stop(t0 + decay * dk + 0.05);
  }
}
const ready = (name, gap) => {
  if (!ctx || !cfg.sfxOn || ctx.state !== 'running') return false;
  const now = ctx.currentTime;
  if (now - (last[name] || -1e9) < gap) return false;
  last[name] = now; return true;
};
A.bell = function (times) {
  if (!ready('bell', 1.2)) return;
  const n = Math.max(1, Math.min(3, Math.floor(times) || 1));
  const t0 = ctx.currentTime;
  for (let i = 0; i < n; i++) bell(1046.5, 0.22, 2.2, t0 + i * 0.9);
};
A.boom = function () {
  if (!ready('boom', 0.35)) return;
  const t = ctx.currentTime;
  const o = ctx.createOscillator(); o.type = 'sine';
  o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(38, t + 0.5);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.4, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.55);
  o.connect(g); g.connect(sfxBus); o.start(t); o.stop(t + 0.6);
};
A.sparkle = function () { if (ready('sparkle', 0.8)) [1318.5, 1568, 2093].forEach((f, i) => bell(f, 0.06, 0.9, ctx.currentTime + i * 0.07)); };
A.cheer = function () {
  if (!ready('cheer', 1)) return;
  const t = ctx.currentTime;
  [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => bell(f, 0.12, 2.2, t + i * 0.09));
};

/* ---------- Voice tĩnh (voice-static/) ---------- */
const voiceById = new Map();       // id -> { file, voice, text }
const voiceByText = new Map();     // voice|text -> file
const voiceCache = new Map();      // file -> Audio (đã nạp)
let voiceIndexLoaded = false;
let voiceIndexPromise = null;
let warmUpTimer = null, warmUpQueue = [], warmUpActive = false;
async function loadVoiceIndex() {
  if (voiceIndexPromise) return voiceIndexPromise;
  voiceIndexPromise = (async () => {
    try {
      const r = await fetch('voice-static/index.json');
      if (!r.ok) return;
      const j = await r.json();
      for (const line of j.lines || []) {
        voiceById.set(line.id, line);
        voiceByText.set(line.voice + '|' + line.text, line.file);
      }
      voiceIndexLoaded = true;
      startWarmUp();
    } catch (_) { /* chưa có voice tĩnh: game vẫn chạy, chỉ hiện chữ */ }
  })();
  return voiceIndexPromise;
}
/* Promise chờ index voice tĩnh tải xong — startRound dùng để câu đầu
   tiên cũng đọc đề được (trước đây fetch index chạy đua với startRound
   nên câu đầu im lặng, fallback cũng chưa có gì để fallback). */
A.whenIndexReady = function () { return voiceIndexPromise || Promise.resolve(); };
/* Promise chờ khi không còn câu nào đang phát (tối đa ~6s) — dùng khi
   1 câu mới cần phát ngay sau 1 câu khác (vd: hết giờ ra chơi, câu
   break-3 vừa phát thì câu đầu tiết mới đã tới; không chờ thì câu đó
   im lặng vì speakLine trả 'busy'). */
A.whenFree = function () {
  return new Promise(res => {
    let n = 0;
    const chk = () => { if (!voicePlaying || ++n > 24) return res(); setTimeout(chk, 250); };
    chk();
  });
};
function warmUpFile(file) {
  if (voiceCache.has(file)) return;
  const a = new Audio('voice-static/' + encodeURIComponent(file));
  a.preload = 'auto';
  a.addEventListener('error', () => voiceCache.delete(file));   // lỗi thì xóa để thử lại lần sau
  voiceCache.set(file, a);
  try { a.load(); } catch (_) { voiceCache.delete(file); }
}
function startWarmUp() {
  // Bơm từng đợt 2 file, cách nhau 400ms — câu thật chen trước: playVoice()
  // dừng warm-up ngay khi cần phát (xem stopWarmUp).
  if (warmUpActive || !voiceById.size) return;
  warmUpActive = true;
  warmUpQueue = [...voiceById.values()].map(l => l.file);
  const pump = () => {
    let n = 0;
    while (warmUpQueue.length && n < 2) { warmUpFile(warmUpQueue.shift()); n++; }
    if (warmUpQueue.length) warmUpTimer = setTimeout(pump, 400);
    else warmUpActive = false;
  };
  warmUpTimer = setTimeout(pump, 800);
}
function stopWarmUp() { if (warmUpTimer) clearTimeout(warmUpTimer); warmUpActive = false; }
let voicePlaying = false;
function playAudioFile(file) {
  return new Promise(res => {
    const a = voiceCache.get(file) || new Audio('voice-static/' + encodeURIComponent(file));
    if (!voiceCache.has(file)) {
      voiceCache.set(file, a);
      a.addEventListener('error', () => voiceCache.delete(file));
    }
    a.volume = Math.max(0, Math.min(1, cfg.voiceVolume / 100));
    try { a.currentTime = 0; } catch (_) {}
    a.onended = () => res(true);
    a.onerror = () => { voiceCache.delete(file); res(false); };
    a.play().then(() => {
      try { window.dispatchEvent(new CustomEvent('npcvoice:start', { detail: { text: file } })); } catch (_) {}
    }).catch(() => res(false));
    setTimeout(() => res(true), 15000);   // chốt an toàn, không kẹt game
  });
}
/* Phát 1 câu tĩnh theo id trong voice-static/index.json.
   Trả { played } — false thì main.js chỉ hiện chữ như cũ. */
A.speakLine = async function (id, opts) {
  if (!cfg.voiceOn || !id) return { played: false, reason: 'off' };
  if (voicePlaying) return { played: false, reason: 'busy' };
  const line = voiceById.get(id);
  if (!line) return { played: false, reason: 'no-static' };
  stopWarmUp();
  voicePlaying = true;
  try {
    const ok = await playAudioFile(line.file);
    return { played: ok, reason: ok ? '' : 'play-failed', durationSec: line.durationSec || 0 };
  } finally {
    voicePlaying = false;
    try { window.dispatchEvent(new CustomEvent('npcvoice:end', { detail: { text: line.text } })); } catch (_) {}
    if (voiceIndexLoaded) startWarmUp();
  }
};
/* Đọc đề của 1 câu hỏi: file tĩnh riêng q-NNN-doc (giọng Cô Ngân).
   Phát CÙNG LÚC với lúc hiện đề, không đợi — đồng hồ chạy ngay.
   File thiếu thì fallback 1 câu chung ask-* để cô vẫn có tiếng. */
A.speakQuestion = async function (qIdx) {
  const id = 'q-' + String((qIdx | 0) + 1).padStart(3, '0') + '-doc';
  if (voiceById.has(id)) return A.speakLine(id);
  const asks = ['ask-1', 'ask-2', 'ask-3', 'ask-4', 'ask-5', 'ask-6'];
  return A.speakLine(asks[Math.floor(Math.random() * asks.length)]);
};
/* Nạp trước 1 file tĩnh theo id (voice câu tiếp theo). */
A.prefetchById = function (id) {
  const line = voiceById.get(id);
  if (line) warmUpFile(line.file);
};
/* Phát câu gồm đoạn tĩnh + tên động: [ {id:'top-3'}, {name:'Mai Xuân Chính'} ].
   Đoạn tên tổng hợp live qua NpcVoice (nếu có); đoạn tên lỗi thì bỏ qua,
   các đoạn tĩnh còn lại vẫn phát. */
A.speakSequence = async function (parts, voice) {
  if (!cfg.voiceOn || !parts || !parts.length) return { played: false, reason: 'off' };
  if (voicePlaying) return { played: false, reason: 'busy' };
  voicePlaying = true;
  let anyPlayed = false;
  try {
    for (const part of parts) {
      if (part.id) {
        const line = voiceById.get(part.id);
        if (line) { stopWarmUp(); anyPlayed = (await playAudioFile(line.file)) || anyPlayed; }
      } else if (part.name && window.NpcVoice && NpcVoice.enabled && NpcVoice.enabled()) {
        try {
          const r = await NpcVoice.speak(String(part.name), { kind: 'event', voice: voice || 'avocado_v2:rumi' });
          anyPlayed = (r && r.played) || anyPlayed;
        } catch (_) { /* tên lỗi -> bỏ qua, phát tiếp đoạn sau */ }
      }
    }
  } finally {
    voicePlaying = false;
    if (voiceIndexLoaded) startWarmUp();
  }
  return { played: anyPlayed };
};
A.voiceReady = () => voiceIndexLoaded && voiceById.size > 0;
A.voiceCount = () => voiceById.size;
})();
