#!/usr/bin/env node
/* Sinh voice tĩnh cho game Lớp học chữ (lop-hoc-chu).
   Bài học V11 game đám cưới: voice chỉ tổng hợp live qua /api/tts thì
   xóa source / mất cache là voice chết dần (TTS nối tiếp ~3s/câu, client
   chờ tối đa 4s rồi bỏ). Vì vậy TẤT CẢ câu cố định của cô giáo + MC đều
   sinh sẵn thành mp3 trong Games/lop-hoc-chu/voice-static/ và đi kèm
   index.json. Game đọc file tĩnh trước, chỉ tổng hợp live tên người chơi
   khi thật sự cần (xem js/audio.js).
   Key file = sha256(voice + '|' + rate + '|' + text sau cleanForSpeech),
   đúng quy ước của voice-static game đám cưới.
   Từ 2026-11-06: thêm 120 file đọc đề riêng cho từng câu hỏi
   (q-001-doc ... q-120-doc, giọng Cô Ngân): text = "Câu hỏi nè: {gợi ý}.
   Chữ đảo ở trên bảng rồi đó, cả lớp nhìn kỹ nha!" — chỉ đọc gợi ý,
   không đọc đáp án. Chạy: node tools/tao-giong-lop-hoc.js [--force]
   [--limit=N] (limit chỉ sinh N câu hỏi đầu, không ghi lại index.json).
   Chạy: node tools/tao-giong-lop-hoc.js [--force]   (mặc định bỏ qua file đã có)
   Giọng chuẩn (xem DemoVoices/HUONG-DAN.md, KHÔNG tự đổi giọng khác):
     GV02LemLinh avocado_v2:rumi  — cô giáo Cô Ngân
     GV01BongBong avocado_v2:lumi — MC / thông báo */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'voice-static');
const RATE = 0;
const TTS = '/opt/hatch/bin/tts';
const FORCE = process.argv.includes('--force');

/* Text đọc: viết như lời nói miệng, câu ngắn, từ đệm nè/nha/đó nha/liền
   luôn, số viết ra chữ, KHÔNG markdown/emoji/hashtag trong text đọc. */
const VOICE_LINES = [
  // Cô giáo Cô Ngân — GV02LemLinh (avocado_v2:rumi)
  { id: 'hello-1', voice: 'avocado_v2:rumi', text: 'Chào cả lớp nè, cô Ngân đây, hôm nay mình cùng đảo chữ cho vui nha!' },
  { id: 'hello-2', voice: 'avocado_v2:rumi', text: 'Cả lớp ơi, vào lớp hết chưa nè, cô điểm danh rồi mình chơi liền luôn!' },
  { id: 'hello-3', voice: 'avocado_v2:rumi', text: 'Chào các bạn mới vào lớp nha, ngồi xuống đi, câu đố sắp ra rồi đó!' },
  { id: 'hello-4', voice: 'avocado_v2:rumi', text: 'Lớp mình hôm nay đông vui quá, cô Ngân mừng lắm luôn nè!' },
  { id: 'ask-1', voice: 'avocado_v2:rumi', text: 'Câu mới đây nè, các bạn nhìn bảng rồi đảo chữ nhanh tay lên nha!' },
  { id: 'ask-2', voice: 'avocado_v2:rumi', text: 'Đảo chữ này hơi khó đó, ai nhanh tay thì lên top liền luôn!' },
  { id: 'ask-3', voice: 'avocado_v2:rumi', text: 'Cô ra câu mới rồi nè, gõ đáp án vào khung chat nhanh lên nha!' },
  { id: 'ask-4', voice: 'avocado_v2:rumi', text: 'Câu này dễ lắm luôn, cả lớp cùng đoán đi nè!' },
  { id: 'ask-5', voice: 'avocado_v2:rumi', text: 'Chữ trên bảng đang lộn xộn quá, ai xếp lại đúng giúp cô nào!' },
  { id: 'ask-6', voice: 'avocado_v2:rumi', text: 'Tập trung nè, câu đố mới ra rồi, thời gian đang chạy đó nha!' },
  { id: 'hint-1', voice: 'avocado_v2:rumi', text: 'Gợi ý nè, đáp án liên quan tới bài mình vừa học đó!' },
  { id: 'hint-2', voice: 'avocado_v2:rumi', text: 'Cô nhắc nhẹ nha, đáp án có hai chữ thôi, đoán tiếp đi!' },
  { id: 'hint-3', voice: 'avocado_v2:rumi', text: 'Gợi ý cuối nè, nghĩ tới món ăn quen thuộc là ra liền luôn!' },
  { id: 'correct-1', voice: 'avocado_v2:rumi', text: 'Đúng rồi, giỏi quá đi, cả lớp vỗ tay nào!' },
  { id: 'correct-2', voice: 'avocado_v2:rumi', text: 'Chính xác luôn nè, bạn này nhanh tay thiệt đó nha!' },
  { id: 'correct-3', voice: 'avocado_v2:rumi', text: 'Đúng rồi đó, cô Ngân thưởng sao vàng liền luôn!' },
  { id: 'correct-4', voice: 'avocado_v2:rumi', text: 'Hay quá, đáp án đúng rồi, cả lớp cùng chúc mừng nha!' },
  { id: 'wrong-1', voice: 'avocado_v2:rumi', text: 'Chưa đúng rồi, đừng buồn nha, đoán lại đi nè!' },
  { id: 'wrong-2', voice: 'avocado_v2:rumi', text: 'Gần đúng rồi đó, thử đảo chữ lại một lần nữa xem nào!' },
  { id: 'wrong-3', voice: 'avocado_v2:rumi', text: 'Sai rồi nè, không sao đâu, câu sau mình gỡ lại nha!' },
  { id: 'reveal-1', voice: 'avocado_v2:rumi', text: 'Hết giờ rồi, đáp án đúng là đây nè, cả lớp nhìn bảng nha!' },
  { id: 'reveal-2', voice: 'avocado_v2:rumi', text: 'Công bố đáp án nè, ai đoán đúng thì chuẩn bị nhận điểm nha!' },
  { id: 'top-1', voice: 'avocado_v2:rumi', text: 'Top năm bạn nhanh nhất đây rồi, chúc mừng các bạn giỏi nhất lớp nha!' },
  { id: 'top-2', voice: 'avocado_v2:rumi', text: 'Bảng điểm mới cập nhật rồi nè, ai đang dẫn đầu vậy ta!' },
  { id: 'top-3', voice: 'avocado_v2:rumi', text: 'Cô đọc tên top lớp đây, các bạn nghe có tên mình không nè!' },
  { id: 'attend-1', voice: 'avocado_v2:rumi', text: 'Điểm danh nè, gõ chữ có mặt là được cộng năm mươi điểm liền luôn!' },
  { id: 'attend-2', voice: 'avocado_v2:rumi', text: 'Ai chưa điểm danh thì nhanh tay lên nha, sắp hết giờ rồi đó!' },
  { id: 'gift-1', voice: 'avocado_v2:rumi', text: 'Cảm ơn bạn đã tặng quà cho lớp nè, cô Ngân ghi tên vào sổ vàng liền luôn!' },
  { id: 'gift-2', voice: 'avocado_v2:rumi', text: 'Quà tới rồi, cả lớp cùng cảm ơn bạn thật nhiều nha!' },
  { id: 'gift-3', voice: 'avocado_v2:rumi', text: 'Bạn tặng quà to quá, mời bạn lên bảng nhận pháo giấy liền luôn!' },
  { id: 'gift-4', voice: 'avocado_v2:rumi', text: 'Cảm ơn quà của bạn nè, lớp mình vui hẳn lên luôn đó!' },
  { id: 'end-1', voice: 'avocado_v2:rumi', text: 'Hết tiết rồi nè, cảm ơn cả lớp đã chơi cùng cô Ngân nha!' },
  { id: 'end-2', voice: 'avocado_v2:rumi', text: 'Tiết học hôm nay vui quá, hẹn cả lớp tiết sau nha!' },
  { id: 'end-3', voice: 'avocado_v2:rumi', text: 'Cô Ngân chào cả lớp, nhớ follow lớp để mai mình gặp lại nè!' },
  // M5 — Giờ ra chơi Oẳn tù tì (thêm 2026-11-06 tối; 5 câu).
  { id: 'break-1', voice: 'avocado_v2:rumi', text: 'Giờ ra chơi rồi nè, mình chơi Oẳn tù tì với cô nha! Gõ búa, kéo hay bao vào chat liền luôn!' },
  { id: 'break-bua', voice: 'avocado_v2:rumi', text: 'Cô ra búa nè! Ai ra bao thì thắng cô, được cộng năm mươi điểm liền luôn!' },
  { id: 'break-keo', voice: 'avocado_v2:rumi', text: 'Cô ra kéo nè! Ai ra búa thì thắng cô, được cộng năm mươi điểm liền luôn!' },
  { id: 'break-bao', voice: 'avocado_v2:rumi', text: 'Cô ra bao nè! Ai ra kéo thì thắng cô, được cộng năm mươi điểm liền luôn!' },
  { id: 'break-3', voice: 'avocado_v2:rumi', text: 'Hết giờ ra chơi rồi, vào tiết mới thôi nào, cả lớp tập trung nè!' },
  // MC / thông báo — GV01BongBong (avocado_v2:lumi)
  { id: 'mc-1', voice: 'avocado_v2:lumi', text: 'Thông báo nè, mục tiêu follow của lớp sắp đạt rồi, cả nhà cùng đẩy lên nha!' },
  { id: 'mc-2', voice: 'avocado_v2:lumi', text: 'Sự kiện trong lớp sắp bắt đầu rồi, mọi người chuẩn bị tinh thần nha!' },
  { id: 'mc-3', voice: 'avocado_v2:lumi', text: 'Chúc mừng bạn vừa follow lớp nè, chào mừng bạn vào lớp luôn!' },
];

/* Câu hỏi đọc đề: 1 file riêng cho mỗi câu trong js/questions.js.
   questions.js là file browser (IIFE gán window.Classroom) nên load
   bằng Function với stub window, không require trực tiếp. */
function loadQuestions() {
  const qPath = path.join(ROOT, 'js', 'questions.js');
  const code = fs.readFileSync(qPath, 'utf8');
  const fn = new Function('window', code + '\nreturn window.Classroom;');
  const cls = fn({});
  return (cls && cls.QUESTIONS) || [];
}
function docText(hint) {
  let h = String(hint || '').trim();
  if (h && !/[.!?…]$/.test(h)) h += '.';
  return 'Câu hỏi nè: ' + h + ' Chữ đảo ở trên bảng rồi đó, cả lớp nhìn kỹ nha!';
}
const QUESTION_LINES = loadQuestions().map((qq, i) => ({
  id: 'q-' + String(i + 1).padStart(3, '0') + '-doc',
  voice: 'avocado_v2:rumi',
  text: docText(qq.h),
}));
const ALL_LINES = VOICE_LINES.concat(QUESTION_LINES);
const LIMIT = (() => {
  const m = process.argv.find(a => a.startsWith('--limit='));
  return m ? parseInt(m.slice(8), 10) : 0;
})();

function cleanForSpeech(text) {
  return String(text || '').replace(/[*#_~`>|[\]()]/g, '').replace(/\s+/g, ' ').trim();
}

function voiceKey(voice, rate, text) {
  return crypto.createHash('sha256').update(voice + '|' + rate + '|' + cleanForSpeech(text)).digest('hex');
}

function probeDuration(file) {
  try {
    const r = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file], { encoding: 'utf8', timeout: 15000 });
    const d = parseFloat((r.stdout || '').trim());
    return Number.isFinite(d) ? Math.round(d * 10) / 10 : 0;
  } catch (_) { return 0; }
}

function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const lines = LIMIT > 0 ? VOICE_LINES.concat(QUESTION_LINES.slice(0, LIMIT)) : ALL_LINES;
  const index = [];
  let made = 0, skipped = 0, failed = 0;
  for (const line of lines) {
    const key = voiceKey(line.voice, RATE, line.text);
    const file = key.slice(0, 24) + '.mp3';
    const outPath = path.join(OUT_DIR, file);
    const entry = { id: line.id, key, voice: line.voice, rate: RATE, text: cleanForSpeech(line.text), file };
    index.push(entry);
    if (!FORCE && fs.existsSync(outPath) && fs.statSync(outPath).size > 0) { skipped++; }
    else {
      const r = spawnSync(TTS, ['speak', '--output', outPath, '--voice', line.voice, '--language', 'vi', '--speed', '100', '--text-stdin'],
        { input: cleanForSpeech(line.text), encoding: 'utf8', timeout: 120000 });
      if (r.status === 0 && fs.existsSync(outPath) && fs.statSync(outPath).size > 0) { made++; }
      else { failed++; console.error('FAILED', line.id, (r.stderr || '').slice(0, 300)); }
    }
    // Thời lượng file (để game biết voice đọc đề dài bao nhiêu).
    entry.durationSec = probeDuration(outPath);
  }
  if (LIMIT > 0) {
    console.log('limit mode: index.json NOT rewritten (made=' + made + ' skipped=' + skipped + ' failed=' + failed + ')');
    for (const e of index) if (e.id.startsWith('q-')) console.log(e.id, e.file, e.durationSec + 's', e.text);
  } else {
    fs.writeFileSync(path.join(OUT_DIR, 'index.json'), JSON.stringify({ voice: 'static', rate: RATE, lines: index }, null, 2) + '\n');
    console.log('voice-static: made=' + made + ' skipped=' + skipped + ' failed=' + failed + ' total=' + index.length);
  }
  if (failed > 0) process.exit(1);
}

if (require.main === module) main();
module.exports = { VOICE_LINES, cleanForSpeech, voiceKey };
