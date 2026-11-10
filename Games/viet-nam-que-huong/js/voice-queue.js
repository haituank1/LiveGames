/* Hang doi giong MC cho game Que Huong Toi.
   - 2 muc uu tien: cau thuong (cho toi da 30s) va cau uu tien
     (qua, tong ket: cho toi da 60s, chen len dau).
   - Giong live: HoaiMy (nu, mac dinh) / NamMinh (nam), qua NpcVoice
     cua LiveBridge (POST /api/tts o trong LiveBridge, co cache).
     Game KHONG tu goi /api/tts, KHONG dung msedge-tts hay Google TTS.
   - Cau co tu cam thi bo ca cau, tha im con hon doc bay.
   - Voice loi/cham thi chi hien chu, game khong bao gio ket vi cho tieng.
   - Ky hieu "|" (tach doan) va "^" (ho to) duoc loc truoc khi gui TTS. */
(function () {
'use strict';
var W = (window.QueHuong = window.QueHuong || {});
var V = (W.voice = {});

var VOICES = { F: 'vi-VN-HoaiMyNeural', M: 'vi-VN-NamMinhNeural' };
var normal = [], priority = [];
var playing = false, lastSpokeAt = Date.now(), processing = false;
var MAX_QUEUE = 30, MAX_WAIT_NORMAL = 30000, MAX_WAIT_PRIORITY = 60000;
var who = 'F';

function clean(text) {
  return String(text || '')
    .replace(/\^+/g, '')
    .split('|').map(function (s) { return s.trim(); }).filter(Boolean).join(' ');
}
function estMs(text) {
  var n = String(text || '').length;
  return Math.max(1500, Math.min(12000, n * 75));
}

V.setWho = function (w) {
  who = (w === 'M') ? 'M' : 'F';
  if (window.NpcVoice && NpcVoice.setConfig) {
    try { NpcVoice.setConfig({ npcVoice: VOICES[who] }); } catch (_) {}
  }
};
V.getWho = function () { return who; };
V.voiceId = function () { return VOICES[who]; };

V.prefetch = function (text) {
  var t = clean(text);
  if (!t || !window.NpcVoice || !NpcVoice.prefetch) return;
  try { NpcVoice.prefetch(t); } catch (_) {}
};

V.say = function (text, isPriority, kind) {
  var t = clean(text);
  if (!t) return;
  if (W.containsBanned && W.containsBanned(t)) return; /* lop chan cuoi: bo ca cau */
  var q = isPriority ? priority : normal;
  q.push({ text: t, at: Date.now(), kind: kind || 'event' });
  if (q.length > MAX_QUEUE) q.shift();
  if (isPriority) V.prefetch(t);
  process();
};
V.stop = function () {
  normal.length = 0; priority.length = 0;
  playing = false;
};
Object.defineProperty(V, 'busy', { get: function () { return playing || normal.length + priority.length > 0; } });
Object.defineProperty(V, 'waiting', { get: function () { return normal.length; } });
V.quietForMs = function (now) {
  now = now || Date.now();
  return V.busy ? 0 : now - lastSpokeAt;
};

function takeNext() {
  var now = Date.now(), line;
  while ((line = priority.shift())) { if (now - line.at < MAX_WAIT_PRIORITY) return line; }
  while ((line = normal.shift())) { if (now - line.at < MAX_WAIT_NORMAL) return line; }
  return undefined;
}
async function process() {
  if (processing) return;
  processing = true;
  try {
    var line;
    while ((line = takeNext())) {
      playing = true;
      try {
        if (window.NpcVoice && NpcVoice.speak) {
          /* Prefetch cau ke de doc xong la noi lien. */
          var up = priority[0] || normal[0];
          if (up) V.prefetch(up.text);
          var r = await NpcVoice.speak(line.text, { kind: line.kind || 'event' });
          if (!r || !r.played) {
            /* Khong co tieng (chua qua LiveBridge / loi / vuong tan suat):
               chi hien chu, cho chut roi doc cau sau. */
            await new Promise(function (res) { setTimeout(res, 350); });
          }
        } else {
          /* Chay demo khong qua LiveBridge: khong co tieng, khong cho. */
          await new Promise(function (res) { setTimeout(res, 250); });
        }
      } catch (_) {
        /* Loi gi cung bo qua, game chay tiep. */
      } finally {
        playing = false;
        lastSpokeAt = Date.now();
      }
    }
  } finally {
    processing = false;
  }
}
})();
