/* Nhac nen + SFX tu soan bang Web Audio, khong dung file.
   Nhac: ngu cung Do (C-D-E-G-A), 100 nhip/phut, giai dieu 4 o nhip
   tu viet, bass + trong nhe. MC noi thi nhac nho con 35%.
   AudioContext chi mo sau khi co tuong tac; OBS khong co gesture nen
   tu resume dinh ky moi giay + khi tab hien lai. */
(function () {
'use strict';
var W = (window.QueHuong = window.QueHuong || {});
var A = (W.audio = {});

var BPM = 100;
var STEP = 60 / BPM / 2; /* 1 buoc = not moc don */
var SCALE = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25, 587.33, 659.25]; /* C4 D4 E4 G4 A4 C5 D5 E5 */
/* 4 o nhip x 8 moc don, -1 = nghi. Giai dieu tu viet. */
var MELODY = [4, -1, 5, 4, 2, -1, 3, 2, 0, 1, 2, -1, 4, 3, 2, -1, 4, -1, 6, 5, 4, 3, 2, -1, 1, 2, 3, 4, 5, -1, 4, -1];
var BASS = [65.41, 87.31, 98.00, 65.41]; /* C2 F2 G2 C2, moi o nhip 1 not goc */

var ctx = null, master = null, musicBus = null, sfxBus = null, noiseBuf = null;
var timer = 0, step = 0, nextAt = 0, volume = 0.3;
var cfg = { musicOn: true, musicVolume: 30, sfxOn: true, sfxVolume: 55 };
var duck = 1, started = false;

function ensureCtx() {
  if (ctx) return ctx;
  var AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  master = ctx.createGain(); master.connect(ctx.destination);
  musicBus = ctx.createGain(); musicBus.connect(master);
  sfxBus = ctx.createGain(); sfxBus.connect(master);
  noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  var d = noiseBuf.getChannelData(0);
  for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  applyVolumes();
  return ctx;
}
function applyVolumes() {
  if (!ctx) return;
  var t = ctx.currentTime;
  if (musicBus) musicBus.gain.setTargetAtTime(cfg.musicOn ? Math.pow(cfg.musicVolume / 100, 2) * 0.9 * duck : 0, t, 0.3);
  if (sfxBus) sfxBus.gain.setTargetAtTime(cfg.sfxOn ? Math.pow(cfg.sfxVolume / 100, 1.5) : 0, t, 0.1);
}
function env(out, at, dur, peak) {
  var g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(peak, at + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  g.connect(out);
  return g;
}
function osc(out, type, f, at, dur, peak, toF) {
  var o = ctx.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(f, at);
  if (toF) o.frequency.exponentialRampToValueAtTime(toF, at + dur);
  o.connect(env(out, at, dur, peak));
  o.start(at);
  o.stop(at + dur + 0.02);
}
function hit(out, at, dur, peak, type, f) {
  var s = ctx.createBufferSource();
  s.buffer = noiseBuf;
  var flt = ctx.createBiquadFilter();
  flt.type = type; flt.frequency.value = f;
  s.connect(flt); flt.connect(env(out, at, dur, peak));
  s.start(at);
  s.stop(at + dur + 0.02);
}
function schedule() {
  if (!ctx || !musicBus) return;
  master.gain.setTargetAtTime(volume * 0.5, ctx.currentTime, 0.25);
  while (nextAt < ctx.currentTime + 0.15) {
    var t = nextAt;
    var s = step % 32;
    var bar = Math.floor(s / 8);
    var n = MELODY[s];
    if (n >= 0) osc(musicBus, 'triangle', SCALE[n], t, STEP * 1.8, 0.16);
    if (s % 8 === 0) osc(musicBus, 'sine', BASS[bar], t, STEP * 7, 0.22);
    if (s % 2 === 0) hit(musicBus, t, 0.05, 0.05, 'highpass', 6000); /* hat nhe */
    if (s % 8 === 4) hit(musicBus, t, 0.12, 0.18, 'lowpass', 220); /* trong */
    step++;
    nextAt += STEP;
  }
}
function startMusic() {
  if (!ensureCtx() || started) return;
  started = true;
  nextAt = ctx.currentTime + 0.1;
  step = 0;
  timer = setInterval(schedule, 60);
}
function stopMusic() {
  if (timer) { clearInterval(timer); timer = 0; }
  started = false;
}

A.init = function () {
  ensureCtx();
  var unlock = function () { A.resume(); };
  addEventListener('pointerdown', unlock);
  addEventListener('keydown', unlock);
  setInterval(function () { A.resume(); }, 1000);
  document.addEventListener('visibilitychange', function () { if (!document.hidden) A.resume(); });
  if (cfg.musicOn) startMusic();
};
A.resume = function () {
  if (ctx && ctx.state === 'suspended') { try { ctx.resume(); } catch (_) {} }
  if (!started && cfg.musicOn) startMusic();
};
A.setConfig = function (c) {
  if (!c) return;
  ['musicOn', 'musicVolume', 'sfxOn', 'sfxVolume'].forEach(function (k) { if (c[k] != null) cfg[k] = c[k]; });
  if (cfg.musicVolume > 0 && cfg.musicVolume <= 1) cfg.musicVolume *= 100;
  if (cfg.sfxVolume > 0 && cfg.sfxVolume <= 1) cfg.sfxVolume *= 100;
  applyVolumes();
  if (cfg.musicOn) { if (!started) startMusic(); } else stopMusic();
};
A.setVolume = function (v) { volume = Math.max(0, Math.min(1, v)); };
/* MC bat dau / xong noi: nhac nho con 35%. */
addEventListener('npcvoice:start', function () { duck = 0.35; applyVolumes(); });
addEventListener('npcvoice:end', function () { duck = 1; applyVolumes(); });

function tone(freq, at, dur, type, peak, toFreq) {
  if (!ensureCtx()) return;
  osc(sfxBus, type, freq, at, dur, peak, toFreq);
}
/* Tieng dom sang bay: 2 not cao leng keng. */
A.spark = function () {
  if (!cfg.sfxOn || !ensureCtx()) return;
  var t = ctx.currentTime + 0.02;
  tone(1568, t, 0.18, 'sine', 0.12);
  tone(2093, t + 0.09, 0.22, 'sine', 0.1);
  tone(1568, t + 0.05, 0.1, 'triangle', 0.05, 2600);
};
/* Tieng xu leng keng + chuong nho khi tinh sang. */
A.chime = function () {
  if (!cfg.sfxOn || !ensureCtx()) return;
  var t = ctx.currentTime + 0.02;
  tone(2093, t, 0.3, 'sine', 0.12);
  tone(2637, t + 0.12, 0.35, 'sine', 0.1);
  for (var i = 0; i < 2; i++) tone(3200 + Math.random() * 800, t + 0.2 + i * 0.08, 0.1, 'square', 0.03);
};
/* Am thanh qua theo tier 2..5: xu -> ken ngan -> phao no. */
A.gift = function (tier) {
  if (!cfg.sfxOn || tier < 2 || !ensureCtx()) return;
  var t = ctx.currentTime + 0.05;
  var coins = [0, 0, 6, 10, 14, 20][tier];
  for (var i = 0; i < coins; i++) tone(2300 + Math.random() * 1700, t + i * 0.07 + Math.random() * 0.04, 0.12, 'square', 0.04);
  if (tier >= 3) {
    var notes = tier === 5 ? [523.25, 659.25, 784, 1046.5, 1318.5, 1568] : [523.25, 659.25, 784, 1046.5];
    notes.forEach(function (f, i) { tone(f, t + 0.1 + i * 0.12, i === notes.length - 1 ? 0.9 : 0.2, 'sawtooth', 0.07); });
  }
  var pops = [0, 0, 0, 0, 3, 8][tier];
  for (var j = 0; j < pops; j++) {
    var at = t + 0.3 + j * (tier === 5 ? 0.45 : 0.35);
    tone(880, at - 0.25, 0.25, 'sine', 0.05, 2300);
    tone(120, at, 0.35, 'sine', 0.4, 40);
  }
};
/* Nhac mung khi ca nuoc sang: arp len 5 not. */
A.celebrate = function () {
  if (!cfg.sfxOn || !ensureCtx()) return;
  var t = ctx.currentTime + 0.02;
  [523.25, 659.25, 784, 1046.5, 1318.5].forEach(function (f, i) { tone(f, t + i * 0.1, 0.5, 'triangle', 0.12); });
};
})();
