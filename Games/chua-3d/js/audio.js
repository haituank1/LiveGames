/* Âm thanh game: nhạc nền + chuông / mõ / tiếng niệm khi tặng quà.
   - Nhạc nền: MỌI file nhạc trong thư mục audio/ (mp3, m4a, ogg, wav...) phát lần lượt, hết thì quay lại
     (LiveBridge liệt kê giúp qua /api/media). Phát trực tiếp từ file nên bài dài, file lớn vẫn nhẹ.
   - Hiệu ứng: niem / chuong / chuong-lon / mo (đuôi gì cũng được). Thiếu file nào thì tự tạo âm thanh thay thế.
   OBS / TikTok LIVE Studio thu luôn âm thanh của trang, không cần chỉnh gì thêm. */
(function () {
'use strict';
const T = window.Temple;
const A = (T.audio = {});

const GAME_ID = 'chua-3d';
// file mặc định (tạo bằng tools/make-sfx.mjs); chạy qua LiveBridge thì đuôi gì cũng nhận
const SFX_DEFAULT = { bell: 'chuong.wav', bigbell: 'chuong-lon.wav', mo: 'mo.wav', chant: 'niem.wav' };
const MIN_GAP = { bell: 1.2, mo: 0.5, bigbell: 5 };        // giây tối thiểu giữa 2 lần cùng loại (chống ồn khi quà dồn dập)
// chantGap: mỗi lần niệm cách nhau ít nhất N giây; duckPercent: nhạc nền còn bao nhiêu % trong lúc niệm
const cfg = { musicVolume: 37, sfxVolume: 11, musicOn: true, sfxOn: false, chantOn: true, musicShuffle: true, chantGap: 6, duckPercent: 90 };

let ctx = null, master, sfxBus;
const buffers = {};           // tiếng hiệu ứng đã giải mã
const last = {};
let chantBusyUntil = 0, chantEnd = 0;

/* nhạc nền */
let bgm = null, playlist = [], track = -1, failed = 0, bgmBlocked = false;
let duck = 1, duckTarget = 1, duckTimer = null;
let ambientBus = null, ambientTimer = null, drone = null;

/* ---------- Khởi tạo ---------- */
A.init = async function () {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (AC) {
    ctx = new AC();
    master = ctx.createGain(); master.connect(ctx.destination);
    sfxBus = ctx.createGain(); sfxBus.connect(master);
    ambientBus = ctx.createGain(); ambientBus.connect(master);
    ctx.onstatechange = notify;
  }
  // trình duyệt thường chặn tự phát tiếng cho tới khi người dùng bấm vào trang (OBS thì không chặn)
  const unlock = () => A.resume();
  addEventListener('pointerdown', unlock); addEventListener('keydown', unlock);

  let media = null;
  try { const r = await fetch('/api/media?game=' + GAME_ID); if (r.ok) media = await r.json(); } catch (_) { /* không chạy qua LiveBridge */ }
  const sfx = { ...SFX_DEFAULT };
  for (const [k, f] of Object.entries((media && media.sfx) || {})) sfx[k] = f;
  playlist = media ? media.music : ['music.mp3'];   // mở thẳng file / chế độ demo: thử audio/music.mp3
  if (ctx) await Promise.all(Object.entries(sfx).map(([k, f]) => load(k, 'audio/' + encodeURIComponent(f), !media || (media.sfx && media.sfx[k]))));
  applyVolumes();
  startMusic();
};

async function load(name, url, exists) {
  if (!exists) return;           // LiveBridge báo không có file: khỏi tải (tránh lỗi 404 trong console)
  try {
    const res = await fetch(url);
    if (res.ok) buffers[name] = await ctx.decodeAudioData(await res.arrayBuffer());
  } catch (_) { /* file hỏng / định dạng không hỗ trợ: dùng âm thanh tự tạo */ }
}

A.state = () => (ctx && ctx.state === 'suspended') || bgmBlocked ? 'suspended' : 'running';
A.resume = () => {
  if (ctx && ctx.state === 'suspended') ctx.resume();
  if (bgm && bgmBlocked && cfg.musicOn) bgm.play().then(() => { bgmBlocked = false; notify(); }).catch(() => {});
};
function notify() { if (A.onState) A.onState(A.state()); }
A.nowPlaying = () => (bgm && !bgm.paused && playlist[track]) || '';
A.music = () => bgm && { file: playlist[track], time: bgm.currentTime, duration: bgm.duration, volume: bgm.volume, paused: bgm.paused };

A.setConfig = function (c) {
  for (const k of Object.keys(cfg)) if (c[k] != null) cfg[k] = c[k];
  applyVolumes();
  if (!cfg.musicOn) stopMusic();
  else if (!bgm && !drone) startMusic();
  else if (bgm && bgm.paused && !bgmBlocked) bgm.play().catch(() => {});
};
function musicLevel() { return cfg.musicOn ? (cfg.musicVolume / 100) ** 2 * duck : 0; }
function applyVolumes() {
  if (bgm) bgm.volume = Math.min(1, musicLevel());
  if (!ctx) return;
  const t = ctx.currentTime;
  sfxBus.gain.setTargetAtTime(cfg.sfxOn ? (cfg.sfxVolume / 100) ** 1.5 : 0, t, 0.1);
  ambientBus.gain.setTargetAtTime(musicLevel(), t, 0.3);
}
/* nhạc nhỏ lại khi đang niệm rồi to lên dần */
function setDuck(target) {
  duckTarget = target;
  if (duckTimer) return;
  duckTimer = setInterval(() => {
    duck += (duckTarget - duck) * 0.15;
    if (Math.abs(duckTarget - duck) < 0.01) { duck = duckTarget; clearInterval(duckTimer); duckTimer = null; }
    applyVolumes();
  }, 50);
}

/* ---------- Nhạc nền từ file (danh sách phát) ---------- */
function startMusic() {
  if (!cfg.musicOn) return;
  if (!playlist.length) return ambientStart();
  if (!bgm) {
    bgm = new Audio();
    bgm.preload = 'auto';
    bgm.addEventListener('ended', nextTrack);
    bgm.addEventListener('playing', () => { failed = 0; if (A.onTrack) A.onTrack(playlist[track]); });
    bgm.addEventListener('error', () => {      // file không đọc được: sang bài khác; hỏng hết thì dùng nhạc tự tạo
      console.warn('[audio] không phát được', playlist[track]);
      if (++failed >= playlist.length) { bgm = null; playlist = []; ambientStart(); } else nextTrack();
    });
  }
  nextTrack();
}
function nextTrack() {
  if (!bgm || !playlist.length) return;
  if (cfg.musicShuffle && playlist.length > 1) {
    let n; do { n = Math.floor(Math.random() * playlist.length); } while (n === track);
    track = n;
  } else track = (track + 1) % playlist.length;
  bgm.loop = playlist.length === 1;
  bgm.src = 'audio/' + encodeURIComponent(playlist[track]);
  bgm.volume = Math.min(1, musicLevel());
  bgm.play().then(() => { bgmBlocked = false; notify(); })
    .catch(e => { if (e && e.name === 'NotAllowedError') { bgmBlocked = true; notify(); } });
}
function stopMusic() {
  if (bgm) bgm.pause();
  ambientStop();
}
A.skip = () => { if (bgm) nextTrack(); };

/* ---------- Nhạc nền tự tạo (khi thư mục audio/ chưa có bài nào) ----------
   nốt trầm ngân (Rê - La) + chuông gió ngũ cung thỉnh thoảng ngân lên */
function ambientStart() {
  if (!ctx || drone || !cfg.musicOn) return;
  const out = ctx.createGain(); out.gain.value = 0; out.connect(ambientBus);
  out.gain.setTargetAtTime(0.5, ctx.currentTime, 3);
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 700; lp.connect(out);
  const oscs = [[73.42, 'sine', 0.5], [110, 'sine', 0.35], [146.83, 'triangle', 0.12], [147.6, 'triangle', 0.1]].map(([f, type, g]) => {
    const o = ctx.createOscillator(); o.type = type; o.frequency.value = f;
    const gn = ctx.createGain(); gn.gain.value = g;
    o.connect(gn); gn.connect(lp); o.start();
    return o;
  });
  const lfo = ctx.createOscillator(); lfo.frequency.value = 0.07;      // thở chậm
  const lfoGain = ctx.createGain(); lfoGain.gain.value = 0.15;
  lfo.connect(lfoGain); lfoGain.connect(out.gain); lfo.start();
  drone = { out, oscs: [...oscs, lfo] };
  const PENTA = [293.66, 329.63, 369.99, 440, 493.88, 587.33, 659.25, 739.99];   // Rê ngũ cung
  const chime = () => {
    bell(PENTA[Math.floor(Math.random() * PENTA.length)], 0.18, 5, ambientBus);
    ambientTimer = setTimeout(chime, 5000 + Math.random() * 7000);
  };
  ambientTimer = setTimeout(chime, 2500);
}
function ambientStop() {
  clearTimeout(ambientTimer); ambientTimer = null;
  if (drone) {
    const d = drone; drone = null;
    d.out.gain.setTargetAtTime(0, ctx.currentTime, 0.5);
    setTimeout(() => d.oscs.forEach(o => { try { o.stop(); } catch (_) { /* đã dừng */ } }), 3000);
  }
}

/* ---------- Âm thanh tự tạo ---------- */
// chuông chùa: các hoạ âm không hài hoà, tắt dần theo hàm mũ
function bell(freq, gain, decay, dest = sfxBus, when = ctx.currentTime) {
  const parts = [[1, 1, 1], [2.0, 0.55, 0.7], [2.76, 0.4, 0.5], [4.07, 0.22, 0.35], [5.4, 0.15, 0.25]];
  for (const [ratio, amp, dk] of parts) {
    const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = freq * ratio;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, when);
    g.gain.exponentialRampToValueAtTime(gain * amp, when + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, when + decay * dk);
    o.connect(g); g.connect(dest);
    o.start(when); o.stop(when + decay * dk + 0.05);
  }
}
// mõ gỗ: tiếng "cốc" ngắn, cao độ tụt nhanh + chút tiếng gõ
function woodblock(when = ctx.currentTime, gain = 0.9) {
  const o = ctx.createOscillator(); o.type = 'sine';
  o.frequency.setValueAtTime(560, when); o.frequency.exponentialRampToValueAtTime(390, when + 0.08);
  const g = ctx.createGain();
  g.gain.setValueAtTime(gain, when); g.gain.exponentialRampToValueAtTime(0.001, when + 0.2);
  o.connect(g); g.connect(sfxBus); o.start(when); o.stop(when + 0.22);
  const n = ctx.createBufferSource();
  const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.03), ctx.sampleRate);
  const data = buf.getChannelData(0); for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  n.buffer = buf;
  const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1400; bp.Q.value = 3;
  const ng = ctx.createGain(); ng.gain.value = gain * 0.5;
  n.connect(bp); bp.connect(ng); ng.connect(sfxBus); n.start(when);
}
// thay cho tiếng niệm khi chưa có file: 3 tiếng mõ đều + tiếng ngân trầm "ôm"
function chantFallback(when) {
  for (let i = 0; i < 3; i++) woodblock(when + i * 0.55, 0.8);
  const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 110;
  const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 480; f.Q.value = 4;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, when + 1.5);
  g.gain.exponentialRampToValueAtTime(0.25, when + 1.9);
  g.gain.exponentialRampToValueAtTime(0.0001, when + 3.6);
  o.connect(f); f.connect(g); g.connect(sfxBus); o.start(when + 1.5); o.stop(when + 3.7);
  return 3.6;
}

function playBuffer(name, when = ctx.currentTime) {
  const s = ctx.createBufferSource(); s.buffer = buffers[name]; s.connect(sfxBus); s.start(when);
  return buffers[name].duration;
}

/* ---------- Phát theo sự kiện ---------- */
A.play = function (name) {
  if (!ctx || !cfg.sfxOn || ctx.state !== 'running') return;
  const now = ctx.currentTime;
  if (now - (last[name] || -1e9) < (MIN_GAP[name] || 0)) return;
  if (name !== 'bigbell' && now < chantEnd) return;   // đang niệm thì không chen chuông nhỏ / mõ vào cho đỡ nhiễu
  last[name] = now;
  if (buffers[name]) return playBuffer(name);
  if (name === 'bell') bell(523.25, 0.35, 3.5);
  else if (name === 'bigbell') { bell(130.81, 0.8, 8); bell(261.63, 0.3, 5); }
  else if (name === 'mo') woodblock();
};

/* Tiếng niệm "Nam mô A Di Đà Phật": không xếp hàng, không chồng tiếng – đang niệm hoặc chưa đủ chantGap giây
   kể từ lần trước thì bỏ qua. Trong lúc niệm nhạc nền chỉ nhỏ lại nhẹ (duckPercent), không tắt. */
A.chant = function () {
  if (!ctx || !cfg.sfxOn || !cfg.chantOn || ctx.state !== 'running') return false;
  const now = ctx.currentTime;
  if (now < chantBusyUntil) return false;
  const dur = buffers.chant ? playBuffer('chant', now) : chantFallback(now);
  chantEnd = now + dur;
  chantBusyUntil = now + Math.max(dur + 0.8, cfg.chantGap);
  setDuck(cfg.duckPercent / 100);
  setTimeout(() => setDuck(1), dur * 1000);
  return true;
};
/* Thầy (NPC) đang nói thành tiếng -> nhạc nền nhỏ hẳn xuống, nói xong to lại */
addEventListener('npcvoice:start', () => setDuck(0.15));
addEventListener('npcvoice:end', () => setDuck(1));
})();
