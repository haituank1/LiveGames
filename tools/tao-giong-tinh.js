'use strict';
/* Sinh file giong TINH cua MC dam cuoi de ship kem repo (V11).
   Chay (tu thu muc goc repo):  NODE_PATH=<cho chua node-edge-tts> node tools/tao-giong-tinh.js
   Tren may ao cua Muse:       NODE_PATH=/tmp/lb-deps/node_modules node tools/tao-giong-tinh.js
   Tren may user (dong-goi co san node_modules):  node tools/tao-giong-tinh.js

   Lam gi: doc 10 pool cau MC trong LiveBridge/config/mappings/dam-cuoi.json
   (map giong game: mcLines/mcFunny/mcCouple/mcThank/mcGreet/mcFollowLines/
   mcTagVang/mcTagDaCoDoi/mcMilestone/mcSapMoc), tach doan TINH bang dung
   logic splitTpl/staticSegmentsOf cua Games/dam-cuoi/js/main.js, roi tong
   hop moi doan x 2 giong (HoaiMy + NamMinh, rate 0) va ghi vao
   LiveBridge/voice-static/<key>.mp3 — key la sha256(voice|0|text-da-lam-
   sach) giong TtsEngine.key(), nen server tim thay ngay khong can tong hop.
   Doan nao da co file thi bo qua; file thua (doan khong con trong pool)
   thi xoa de repo sach. Doan tong hop loi thi chi canh bao, chay tiep
   (luc chay that se roi ve hang doi tong hop nhu cu, khong chet game).
   Chay lai moi khi sua cau MC trong mapping/admin. */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const MAPPING = path.join(ROOT, 'LiveBridge', 'config', 'mappings', 'dam-cuoi.json');
const STATIC_DIR = path.join(ROOT, 'LiveBridge', 'voice-static');
const CACHE_DIR = path.join(ROOT, 'LiveBridge', 'voice-cache');

const { TtsEngine, cleanForSpeech } = require(path.join(ROOT, 'LiveBridge', 'src', 'tts'));

/* Ban sao y logic tach doan cua Games/dam-cuoi/js/main.js (splitTpl +
   staticSegmentsOf) — giu 2 ban giong nhau de doan sinh ra trung khop
   voi doan game lam nong luc nhan config. */
function splitTpl(tpl) {
  const raw = String(tpl).split(/\{(\w+)\}/);
  const toks = [];
  for (let i = 0; i < raw.length; i++) toks.push(i % 2 ? { ph: raw[i] } : { tx: raw[i] });
  return toks;
}
const HAS_WORD = /[\p{L}\p{N}]/u;
function staticSegmentsOf(tpl) {
  const out = [];
  for (const t of splitTpl(tpl)) {
    if (t.tx == null) continue;
    const s = t.tx.trim();
    if (s && HAS_WORD.test(s)) out.push(s);
  }
  return out;
}

/* Cau mac dinh trong code khi mapping thieu pool (nguon that: applyConfig
   trong Games/dam-cuoi/js/main.js). Mapping hien tai co du ca 10 pool nen
   day chi la luoi an toan. */
const CODE_FALLBACK = {
  mcLines: ['Một đám cưới vui là khi khách mời cười nhiều hơn cô dâu chú rể.', 'Tình yêu không cần hoàn hảo, chỉ cần hai người cùng tag nhau lên sân khấu là đủ.', 'Cả nhà thả tim thật nhiều để chúc phúc cho các cặp đôi nhé!'],
  mcFunny: ['MC dặn nhỏ: tag người yêu cũ vào đây MC tính phí gấp đôi nhé!', 'Ai còn độc thân giơ tay, MC nhìn thấy hết đấy, đừng trốn sau hàng ghế nữa!', 'Đi ăn cưới online mà không mất tiền mừng, thời đại này sướng thật!'],
  mcTagDaCoDoi: ['ê {a}, {b} đã có đôi rồi, mình không nên phá hoại gia đình nhà người khác nhá!', '{a} à, {b} đã có gia đình rồi, bạn nên chọn người khác đi nhé!', '{b} là của {c} rồi {a} ơi, chen vào là MC không cứu được đâu!', 'Thôi {a} ơi, {b} với {c} đang hạnh phúc, mình đừng làm kỳ đà cản mũi nha!'],
  mcSapMoc: ['Cả nhà ơi, chỉ còn {con} lượt xem nữa là chạm mốc {moc} — sảnh {sanh} sắp mở rồi! Mọi người chia sẻ live giúp MC nhé!', 'Sắp rồi, sắp rồi! Còn đúng {con} lượt xem nữa là lên mốc {moc} — ai chưa vào thì vào nhanh nào!', 'Mốc {moc} lượt xem ở ngay trước mắt, chỉ thiếu {con} nữa thôi! Cả nhà thả tim và chia sẻ để mở sảnh {sanh} nhé!'],
};
const POOLS = ['mcLines', 'mcFunny', 'mcCouple', 'mcThank', 'mcGreet', 'mcFollowLines', 'mcTagVang', 'mcTagDaCoDoi', 'mcMilestone', 'mcSapMoc'];

async function main() {
  const mapping = JSON.parse(fs.readFileSync(MAPPING, 'utf8'));
  const d = mapping.defaults || {};
  const voices = [d.npcVoice || 'vi-VN-HoaiMyNeural', d.npcVoiceNam || 'vi-VN-NamMinhNeural'];
  const segs = new Set();
  for (const p of POOLS) {
    const pool = (Array.isArray(d[p]) && d[p].length) ? d[p] : (CODE_FALLBACK[p] || []);
    for (const tpl of pool) for (const s of staticSegmentsOf(tpl)) {
      const c = cleanForSpeech(s);
      if (c && c.length <= 300) segs.add(c);
    }
  }
  const segList = [...segs].sort();
  console.log(`doan tinh: ${segList.length} doan x ${voices.length} giong = ${segList.length * voices.length} file`);
  fs.mkdirSync(STATIC_DIR, { recursive: true });
  const tts = new TtsEngine(CACHE_DIR, STATIC_DIR);
  const idxFile = path.join(STATIC_DIR, 'index.json');
  let idx = {};
  try { idx = JSON.parse(fs.readFileSync(idxFile, 'utf8')); } catch (_) { idx = {}; }
  const want = new Set();
  let made = 0, skipped = 0, failed = 0;
  for (const seg of segList) {
    for (const voice of voices) {
      const key = tts.key(seg, voice, 0);
      want.add(key + '.mp3');
      const f = path.join(STATIC_DIR, key + '.mp3');
      if (fs.existsSync(f) && fs.statSync(f).size > 500) { skipped++; continue; }
      try {
        const r = await tts.prepare(seg, { voice, rate: 0, prio: 2 });
        const buf = tts.audio(r.id);
        if (!buf || buf.length <= 500) throw new Error('audio rong');
        fs.writeFileSync(f, buf);
        idx[key] = { text: seg, voice, rate: 0, savedAt: new Date().toISOString() };
        made++;
        if (made % 20 === 0) console.log(`  ...da sinh ${made} file`);
      } catch (e) {
        failed++;
        console.log(`  LOI (bo qua, se tong hop luc chay): [${voice}] ${seg.slice(0, 50)} — ${e.message}`);
      }
    }
  }
  let removed = 0;
  for (const f of fs.readdirSync(STATIC_DIR)) {
    if (f.endsWith('.mp3') && !want.has(f)) {
      fs.unlinkSync(path.join(STATIC_DIR, f));
      const k = f.slice(0, -4);
      if (idx[k]) delete idx[k];
      removed++;
    }
  }
  fs.writeFileSync(idxFile, JSON.stringify(idx, null, 1));
  console.log(`xong: tong hop moi ${made}, co san ${skipped}, loi ${failed}, xoa thua ${removed}, tong file trong voice-static: ${want.size}`);
  console.log('server stats:', JSON.stringify(tts.stats));
  if (failed) console.log('CANH BAO: co doan loi — chay lai script sau, hoac de server tong hop luc chay (chi cham lan dau).');
}

main().catch(e => { console.error('tao-giong-tinh loi:', e); process.exit(1); });
