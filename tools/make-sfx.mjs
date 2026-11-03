// Tạo file âm thanh hiệu ứng mặc định cho game Chùa 3D (WAV 44.1 kHz mono, không cần thư viện ngoài).
//   node tools/make-sfx.mjs            → tạo file còn thiếu trong Games/chua-3d/audio
//   node tools/make-sfx.mjs --force    → tạo lại tất cả (ghi đè)
// File tạo ra: chuong.wav, chuong-lon.wav, mo.wav, niem.wav
// niem.wav chỉ là tiếng tụng tạm (ngân theo nhịp "Nam-mô-A-Di-Đà-Phật", không có lời);
// thu giọng thật rồi ghi đè (niem.mp3 / niem.m4a ... cũng được, nhớ xoá niem.wav).
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const RATE = 44100;
const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'Games', 'chua-3d', 'audio');
const force = process.argv.includes('--force');

const buf = sec => new Float32Array(Math.ceil(sec * RATE));

// ---------- bộ lọc biquad (công thức RBJ) ----------
function biquad(type, freq, q) {
  const w = 2 * Math.PI * freq / RATE, a = Math.sin(w) / (2 * q), c = Math.cos(w);
  let b0, b1, b2;
  if (type === 'bandpass') { b0 = a; b1 = 0; b2 = -a; }
  else { b0 = (1 - c) / 2; b1 = 1 - c; b2 = (1 - c) / 2; }   // lowpass
  const a0 = 1 + a, a1 = -2 * c, a2 = 1 - a;
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  return x => {
    const y = (b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0;
    x2 = x1; x1 = x; y2 = y1; y1 = y;
    return y;
  };
}

// ---------- chuông chùa: hoạ âm không hài hoà, tắt dần ----------
function bell(out, at, freq, gain, decay) {
  const parts = [[1, 1, 1], [2.0, 0.55, 0.7], [2.76, 0.4, 0.5], [4.07, 0.22, 0.35], [5.4, 0.15, 0.25], [0.5, 0.25, 1.2]];
  const s0 = Math.floor(at * RATE);
  for (const [ratio, amp, dk] of parts) {
    const len = Math.min(out.length - s0, Math.floor(decay * dk * RATE));
    const f = freq * ratio, tau = decay * dk / 6.9;   // -60 dB sau decay*dk giây
    for (let i = 0; i < len; i++) {
      const t = i / RATE;
      const env = Math.min(1, t / 0.004) * Math.exp(-t / tau);
      // chút "đập" (beating) cho giống chuông đồng
      out[s0 + i] += gain * amp * env * Math.sin(2 * Math.PI * f * t) * (1 + 0.08 * Math.sin(2 * Math.PI * 2.3 * t));
    }
  }
}

// ---------- mõ gỗ: "cốc" ngắn, cao độ tụt nhanh + tiếng gõ ----------
function woodblock(out, at, gain = 0.9) {
  const s0 = Math.floor(at * RATE), len = Math.min(out.length - s0, Math.floor(0.25 * RATE));
  const bp = biquad('bandpass', 1500, 3);
  let phase = 0;
  for (let i = 0; i < len; i++) {
    const t = i / RATE;
    const f = 390 + 170 * Math.exp(-t / 0.025);
    phase += 2 * Math.PI * f / RATE;
    const body = Math.sin(phase) * Math.exp(-t / 0.045);
    const click = t < 0.03 ? bp(Math.random() * 2 - 1) * (1 - t / 0.03) * 1.5 : 0;
    out[s0 + i] += gain * (body + click);
  }
}

// ---------- tiếng tụng tạm: nguyên âm hát theo nhịp 6 âm ----------
const VOWELS = { a: [[800, 1], [1200, 0.5], [2600, 0.12]], o: [[500, 1], [900, 0.45], [2500, 0.08]], i: [[300, 1], [2300, 0.35], [3000, 0.1]] };
function chantSyllable(out, at, dur, vowel, pitch, gain) {
  const s0 = Math.floor(at * RATE), len = Math.min(out.length - s0, Math.floor(dur * RATE));
  const forms = VOWELS[vowel].map(([f, g]) => ({ f: biquad('bandpass', f, 6), g }));
  const lp = biquad('lowpass', 3500, 0.7);
  let phase = 0;
  for (let i = 0; i < len; i++) {
    const t = i / RATE;
    const vib = 1 + 0.012 * Math.sin(2 * Math.PI * 5 * t) * Math.min(1, t / 0.25);
    phase += pitch * vib / RATE;
    const saw = 2 * (phase % 1) - 1;                       // dây thanh (răng cưa)
    let v = 0;
    for (const fm of forms) v += fm.f(saw) * fm.g;         // khoang miệng (formant)
    const env = Math.min(1, t / 0.06) * Math.min(1, (dur - t) / 0.12);
    out[s0 + i] += gain * lp(v) * env * 3;
  }
}
function reverb(x, mix = 0.28) {   // vang nhẹ kiểu chánh điện: 4 comb song song
  const out = new Float32Array(x.length);
  for (const [d, fb] of [[1557, 0.82], [1617, 0.8], [1491, 0.81], [1422, 0.79]]) {
    const line = new Float32Array(d); let k = 0;
    for (let i = 0; i < x.length; i++) {
      const y = line[k]; line[k] = x[i] + y * fb; k = (k + 1) % d;
      out[i] += y * 0.25;
    }
  }
  for (let i = 0; i < x.length; i++) out[i] = x[i] + out[i] * mix;
  return out;
}

// ---------- ghi WAV 16-bit ----------
function normalize(x, peak = 0.9) {
  let m = 0; for (const v of x) m = Math.max(m, Math.abs(v));
  if (m > 0) for (let i = 0; i < x.length; i++) x[i] *= peak / m;
  return x;
}
function writeWav(name, x) {
  const file = path.join(OUT, name);
  const exists = fs.readdirSync(OUT).some(f => path.parse(f).name.toLowerCase() === path.parse(name).name);
  if (exists && !force) { console.log('  bỏ qua (đã có file):', path.parse(name).name + '.*'); return; }
  const data = Buffer.alloc(44 + x.length * 2);
  data.write('RIFF', 0); data.writeUInt32LE(36 + x.length * 2, 4); data.write('WAVE', 8);
  data.write('fmt ', 12); data.writeUInt32LE(16, 16); data.writeUInt16LE(1, 20); data.writeUInt16LE(1, 22);
  data.writeUInt32LE(RATE, 24); data.writeUInt32LE(RATE * 2, 28); data.writeUInt16LE(2, 32); data.writeUInt16LE(16, 34);
  data.write('data', 36); data.writeUInt32LE(x.length * 2, 40);
  for (let i = 0; i < x.length; i++) data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, x[i])) * 32767), 44 + i * 2);
  fs.writeFileSync(file, data);
  console.log('  đã tạo:', name, `(${(x.length / RATE).toFixed(1)}s)`);
}

fs.mkdirSync(OUT, { recursive: true });
console.log('Thư mục:', OUT);

{ const x = buf(3.6); bell(x, 0, 523.25, 0.5, 3.5); writeWav('chuong.wav', normalize(x, 0.8)); }
{ const x = buf(8.5); bell(x, 0, 130.81, 0.9, 8); bell(x, 0, 261.63, 0.35, 5); writeWav('chuong-lon.wav', normalize(reverb(x, 0.2), 0.9)); }
{ const x = buf(0.3); woodblock(x, 0); writeWav('mo.wav', normalize(x, 0.85)); }
{
  // "Nam - mô - A - Di - Đà - Phật": mõ ở đầu mỗi âm, âm cuối kéo dài, chuông ngân khi kết
  const syl = [['a', 0.42], ['o', 0.42], ['a', 0.42], ['i', 0.42], ['a', 0.42], ['a', 0.9]];
  const pitch = [146.8, 146.8, 164.8, 146.8, 130.8, 146.8];   // giọng tụng trầm, lên xuống nhẹ
  const x = buf(4.6);
  let t = 0.05;
  syl.forEach(([v, d], k) => { woodblock(x, t, 0.55); chantSyllable(x, t + 0.02, d - 0.04, v, pitch[k], 0.6); t += d; });
  bell(x, t + 0.05, 392, 0.35, 2.4);
  writeWav('niem.wav', normalize(reverb(x, 0.3), 0.9));
}
console.log('Xong. Muốn thay bằng tiếng thật: ghi đè file cùng tên (đuôi gì cũng được, xoá file .wav cũ).');
