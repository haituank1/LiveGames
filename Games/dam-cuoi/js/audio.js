/* Âm thanh đám cưới:
   - Nhạc nền: nếu thư mục audio/ có file nhạc thì phát lần lượt (LiveBridge liệt kê qua /api/media);
     chưa có thì tự tạo nhạc nền lãng mạn bằng WebAudio (hợp âm piano mềm C–Am–F–G + chuông gió).
   - Hiệu ứng tự tạo: chuông cưới (bell), pháo hoa (boom), lấp lánh (sparkle), hợp âm chúc mừng (cheer).
   OBS / LIVE Studio thu luôn tiếng của trang. */
(function () {
'use strict';
const W = (window.Wedding = window.Wedding || {});
const A = (W.audio = {});
const GAME_ID = 'dam-cuoi';
const cfg = { musicVolume: 35, sfxVolume: 55, musicOn: true, sfxOn: true, musicShuffle: true };
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
  let media = null;
  try { const r = await fetch('/api/media?game=' + GAME_ID); if (r.ok) media = await r.json(); } catch (_) { /* không chạy qua LiveBridge */ }
  playlist = media ? media.music : [];
  startMusic();
};
A.state = () => (ctx && ctx.state === 'suspended') || bgmBlocked ? 'suspended' : 'running';
A.resume = function () {
  if (ctx && ctx.state === 'suspended') ctx.resume();
  if (bgm && bgmBlocked && cfg.musicOn) bgm.play().then(() => { bgmBlocked = false; notify(); }).catch(() => {});
  if (!bgm && cfg.musicOn && !playlist.length) ambientStart();
};
function notify() { if (A.onState) A.onState(A.state()); }
A.setConfig = function (c) {
  for (const k of Object.keys(cfg)) if (c[k] != null) cfg[k] = c[k];
  applyVolumes();
  if (!cfg.musicOn) { if (bgm) bgm.pause(); ambientStop(); }
  else startMusic();
};
let npcDuck = 1;   // NPC (MC) đang nói -> nhạc nền chỉ còn 22%
addEventListener('npcvoice:start', () => { npcDuck = 0.22; applyVolumes(); });
addEventListener('npcvoice:end', () => { npcDuck = 1; applyVolumes(); });
function applyVolumes() {
  if (bgm) bgm.volume = Math.min(1, (cfg.musicVolume / 100) ** 2 * npcDuck);
  if (!ctx) return;
  const t = ctx.currentTime;
  sfxBus.gain.setTargetAtTime(cfg.sfxOn ? (cfg.sfxVolume / 100) ** 1.5 : 0, t, 0.1);
  musicBus.gain.setTargetAtTime(cfg.musicOn ? (cfg.musicVolume / 100) ** 2 * 0.9 * npcDuck : 0, t, 0.3);
}

/* ---------- Nhạc nền từ file ---------- */
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

/* ---------- Nhạc nền tự tạo: vòng hợp âm lãng mạn ---------- */
const CHORDS = [   // C – Am – F – G (tần số nốt nền + hợp âm)
  { bass: 130.81, notes: [261.63, 329.63, 392.00] },
  { bass: 110.00, notes: [220.00, 261.63, 329.63] },
  { bass: 87.31, notes: [174.61, 220.00, 349.23] },
  { bass: 98.00, notes: [196.00, 246.94, 392.00] },
];
function pluck(freq, when, gain = 0.16, decay = 2.6) {
  const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = freq;
  const o2 = ctx.createOscillator(); o2.type = 'sine'; o2.frequency.value = freq * 2;
  const g = ctx.createGain(), g2 = ctx.createGain();
  g.gain.setValueAtTime(0.0001, when); g.gain.exponentialRampToValueAtTime(gain, when + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, when + decay);
  g2.gain.setValueAtTime(0.0001, when); g2.gain.exponentialRampToValueAtTime(gain * 0.25, when + 0.02);
  g2.gain.exponentialRampToValueAtTime(0.0001, when + decay * 0.6);
  o.connect(g); g.connect(musicBus); o2.connect(g2); g2.connect(musicBus);
  o.start(when); o.stop(when + decay + 0.1); o2.start(when); o2.stop(when + decay);
}
function ambientStart() {
  if (!ctx || ambientOn || !cfg.musicOn) return;
  ambientOn = true;
  let step = 0;
  const bar = () => {
    if (!ambientOn) return;
    const c = CHORDS[step % CHORDS.length], t = ctx.currentTime + 0.05;
    pluck(c.bass, t, 0.20, 3.6);
    c.notes.forEach((f, i) => pluck(f, t + i * 0.42, 0.13, 3));
    if (step % 2 === 1) pluck(c.notes[1] * 2, t + 1.7, 0.06, 2);   // điểm xuyết nốt cao
    step++;
    ambientTimer = setTimeout(bar, 3400);
  };
  bar();
}
function ambientStop() { ambientOn = false; clearTimeout(ambientTimer); }

/* ---------- Hiệu ứng tự tạo ---------- */
function bell(freq, gain, decay, when = ctx.currentTime) {
  for (const [ratio, amp, dk] of [[1, 1, 1], [2.0, 0.5, 0.7], [2.76, 0.35, 0.5], [4.07, 0.18, 0.3]]) {
    const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = freq * ratio;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, when); g.gain.exponentialRampToValueAtTime(gain * amp, when + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, when + decay * dk);
    o.connect(g); g.connect(sfxBus); o.start(when); o.stop(when + decay * dk + 0.05);
  }
}
const ready = (name, gap) => {
  if (!ctx || !cfg.sfxOn || ctx.state !== 'running') return false;
  const now = ctx.currentTime;
  if (now - (last[name] || -1e9) < gap) return false;
  last[name] = now; return true;
};
A.bell = function () { if (ready('bell', 1.2)) { bell(659.25, 0.30, 3.2); bell(987.77, 0.16, 2.4, ctx.currentTime + 0.14); } };
A.boom = function () {
  if (!ready('boom', 0.35)) return;
  const t = ctx.currentTime;
  const o = ctx.createOscillator(); o.type = 'sine';
  o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(38, t + 0.5);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.5, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.55);
  o.connect(g); g.connect(sfxBus); o.start(t); o.stop(t + 0.6);
  const len = Math.floor(ctx.sampleRate * 0.3), buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 2;
  const n = ctx.createBufferSource(); n.buffer = buf;
  const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 900;
  const ng = ctx.createGain(); ng.gain.value = 0.35;
  n.connect(f); f.connect(ng); ng.connect(sfxBus); n.start(t);
};
A.sparkle = function () { if (ready('sparkle', 0.8)) [1318.5, 1568, 2093].forEach((f, i) => bell(f, 0.07, 0.9, ctx.currentTime + i * 0.07)); };
A.cheer = function () {   // hợp âm chúc mừng khi cặp đôi lên sân khấu
  if (!ready('cheer', 1)) return;
  const t = ctx.currentTime;
  [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => bell(f, 0.14, 2.2, t + i * 0.09));
};
})();
