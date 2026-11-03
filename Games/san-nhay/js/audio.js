/* Âm thanh sàn nhảy:
   - Nhạc nền: nếu thư mục audio/ có file nhạc thì phát lần lượt (LiveBridge liệt kê qua /api/media);
     chưa có thì tự tạo nhịp disco bằng WebAudio (kick + hat + bass, 116 BPM).
   - Hiệu ứng tự tạo: đúng nhịp (good), trượt nhịp (bad), nổ hũ (coin), pháo hoa (boom), ăn mừng (cheer), đại gia đổ bộ (fanfare).
   OBS / LIVE Studio thu luôn tiếng của trang. */
(function () {
'use strict';
const W = (window.Party = window.Party || {});
const A = (W.audio = {});
const GAME_ID = 'san-nhay';
const cfg = { musicVolume: 35, sfxVolume: 55, musicOn: true, sfxOn: true, musicShuffle: true };
let ctx = null, master, sfxBus, musicBus;
const last = {};
let bgm = null, playlist = [], track = -1, failed = 0, bgmBlocked = false;
let beatTimer = null, beatOn = false, beatStep = 0;

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
  let media = null;
  try { const r = await fetch('/api/media?game=' + GAME_ID); if (r.ok) media = await r.json(); } catch (_) { /* không chạy qua LiveBridge */ }
  playlist = media ? media.music : [];
  startMusic();
};
A.state = () => (ctx && ctx.state === 'suspended') || bgmBlocked ? 'suspended' : 'running';
A.resume = function () {
  if (ctx && ctx.state === 'suspended') ctx.resume();
  if (bgm && bgmBlocked && cfg.musicOn) bgm.play().then(() => { bgmBlocked = false; notify(); }).catch(() => {});
  if (!bgm && cfg.musicOn && !playlist.length) beatStart();
};
function notify() { if (A.onState) A.onState(A.state()); }
A.setConfig = function (c) {
  for (const k of Object.keys(cfg)) if (c[k] != null) cfg[k] = c[k];
  applyVolumes();
  if (!cfg.musicOn) { if (bgm) bgm.pause(); beatStop(); }
  else startMusic();
};
function applyVolumes() {
  if (bgm) bgm.volume = Math.min(1, (cfg.musicVolume / 100) ** 2);
  if (!ctx) return;
  const t = ctx.currentTime;
  sfxBus.gain.setTargetAtTime(cfg.sfxOn ? (cfg.sfxVolume / 100) ** 1.5 : 0, t, 0.1);
  musicBus.gain.setTargetAtTime(cfg.musicOn ? (cfg.musicVolume / 100) ** 2 * 0.9 : 0, t, 0.3);
}

/* ---------- Nhạc nền từ file ---------- */
function startMusic() {
  if (!cfg.musicOn) return;
  if (!playlist.length) return beatStart();
  if (!bgm) {
    bgm = new Audio(); bgm.preload = 'auto';
    bgm.addEventListener('ended', nextTrack);
    bgm.addEventListener('error', () => { if (++failed >= playlist.length) { bgm = null; playlist = []; beatStart(); } else nextTrack(); });
  }
  if (bgm.paused) nextTrack();
}
function nextTrack() {
  if (!bgm || !playlist.length) return;
  if (cfg.musicShuffle && playlist.length > 1) { let n; do { n = Math.floor(Math.random() * playlist.length); } while (n === track); track = n; }
  else track = (track + 1) % playlist.length;
  bgm.loop = playlist.length === 1;
  bgm.src = 'audio/' + encodeURIComponent(playlist[track]);
  bgm.volume = Math.min(1, (cfg.musicVolume / 100) ** 2);
  bgm.play().then(() => { bgmBlocked = false; notify(); }).catch(e => { if (e && e.name === 'NotAllowedError') { bgmBlocked = true; notify(); } });
}

/* ---------- Nhạc nền tự tạo: nhịp disco 116 BPM ---------- */
const BASS = [65.41, 65.41, 98.0, 65.41, 82.41, 65.41, 110.0, 98.0];   // C2 G2 E2 A2...
function kick(t) {
  const o = ctx.createOscillator(); o.type = 'sine';
  o.frequency.setValueAtTime(130, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.55, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
  o.connect(g); g.connect(musicBus); o.start(t); o.stop(t + 0.18);
}
function hat(t, open) {
  const len = Math.floor(ctx.sampleRate * (open ? 0.14 : 0.05));
  const buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const n = ctx.createBufferSource(); n.buffer = buf;
  const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 7000;
  const g = ctx.createGain(); g.gain.value = open ? 0.13 : 0.09;
  n.connect(f); f.connect(g); g.connect(musicBus); n.start(t);
}
function bassNote(freq, t) {
  const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = freq;
  const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 500;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.14, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
  o.connect(f); f.connect(g); g.connect(musicBus); o.start(t); o.stop(t + 0.24);
}
function beatStart() {
  if (!ctx || beatOn || !cfg.musicOn) return;
  beatOn = true;
  const spb = 60 / 116 / 2;   // nhịp 8
  const tick = () => {
    if (!beatOn) return;
    const t = ctx.currentTime + 0.04, s = beatStep++;
    if (s % 2 === 0) kick(t);
    else hat(t, s % 8 === 7);
    if (s % 2 === 0) bassNote(BASS[(s >> 1) % BASS.length], t);
    beatTimer = setTimeout(tick, spb * 1000);
  };
  tick();
}
function beatStop() { beatOn = false; clearTimeout(beatTimer); }

/* ---------- Hiệu ứng tự tạo ---------- */
function tone(freq, gain, decay, when = ctx.currentTime, type = 'sine') {
  const o = ctx.createOscillator(); o.type = type; o.frequency.value = freq;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, when); g.gain.exponentialRampToValueAtTime(gain, when + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, when + decay);
  o.connect(g); g.connect(sfxBus); o.start(when); o.stop(when + decay + 0.05);
}
const ready = (name, gap) => {
  if (!ctx || !cfg.sfxOn || ctx.state !== 'running') return false;
  const now = ctx.currentTime;
  if (now - (last[name] || -1e9) < gap) return false;
  last[name] = now; return true;
};
A.good = function () { if (ready('good', 0.12)) { tone(880, 0.16, 0.18); tone(1318.5, 0.12, 0.24, ctx.currentTime + 0.05); } };
A.bad = function () { if (ready('bad', 0.25)) tone(160, 0.14, 0.22, ctx.currentTime, 'square'); };
A.coin = function () { if (ready('coin', 0.5)) for (let i = 0; i < 6; i++) tone(1568 + (i % 2) * 400, 0.1, 0.16, ctx.currentTime + i * 0.055); };
A.boom = function () {
  if (!ready('boom', 0.35)) return;
  const t = ctx.currentTime;
  const o = ctx.createOscillator(); o.type = 'sine';
  o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(38, t + 0.5);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.45, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.55);
  o.connect(g); g.connect(sfxBus); o.start(t); o.stop(t + 0.6);
};
A.cheer = function () {
  if (!ready('cheer', 1)) return;
  [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(f, 0.13, 0.7, ctx.currentTime + i * 0.09, 'triangle'));
};
A.fanfare = function () {
  if (!ready('fanfare', 1.5)) return;
  [392, 523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) => tone(f, 0.14, 0.8, ctx.currentTime + i * 0.1, 'triangle'));
};
})();
