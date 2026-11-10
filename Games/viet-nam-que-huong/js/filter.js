/* Loc noi dung + ten nguoi choi + loi cau chuc.
   Nguyen tac: MC KHONG BAO GIO doc nguyen van comment; ten bay thi doc
   "ban", hien "Nguoi xem"; comment bay thi che *** khi hien len man hinh. */
(function () {
'use strict';
var W = (window.QueHuong = window.QueHuong || {});

var BANNED_TOKENS = new Set([
  'lồn', 'lìn', 'cặc', 'buồi', 'đéo', 'địt', 'đụ', 'đĩ', 'cứt', 'đm', 'đmm', 'đcm', 'đkm',
  'dm', 'dmm', 'dcm', 'dkm', 'vcl', 'vkl', 'vcc', 'clgt', 'loz', 'dit', 'ditme', 'dume', 'cmm',
  'vl', 'cl', 'clm', 'ml', 'djt', 'đjt', 'chịch', 'nứng', 'phò', 'lol', 'buoi', 'kặc', 'cak',
  'fuck', 'fck', 'fuk', 'shit', 'bitch', 'dick', 'pussy', 'sex', 'sexy', 'porn', 'nude', 'xxx', 'cave',
  'giết', 'chém', 'casino', 'scam'
]);
var BANNED_PHRASES = [
  'địt mẹ', 'đụ má', 'đù má', 'đéo mẹ', 'con đĩ', 'dit me', 'du ma', 'vãi lồn', 'óc chó', 'súc vật', 'mẹ mày', 'bố mày',
  'ma túy', 'ma tuý', 'thuốc lắc', 'cần sa', 'cá độ', 'lô đề', 'cờ bạc', 'chuyển khoản', 'lừa đảo'
];
function normText(t) { return String(t || '').normalize('NFC').toLowerCase().replace(/\s+/g, ' '); }
function tokensOf(text) { return normText(text).split(/[^\p{L}\p{M}\p{N}]+/u).filter(Boolean); }
function containsBanned(text) {
  if (!text) return false;
  var tokens = tokensOf(text);
  if (tokens.some(function (t) { return BANNED_TOKENS.has(t); })) return true;
  var joined = ' ' + tokens.join(' ') + ' ';
  return BANNED_PHRASES.some(function (p) { return joined.indexOf(' ' + p + ' ') >= 0; });
}

/* Kiem tra gat cho TEN: bo dau, doi so/ky hieu lach (l0n, d.j.t), gop chu lap. */
var RUDE_PLAIN = new Set([
  'lon', 'loz', 'lol', 'cak', 'kac', 'buoi', 'deo', 'dit', 'djt', 'dm', 'dmm', 'dcm', 'dkm', 'dume', 'duma',
  'ditme', 'vcl', 'vkl', 'vl', 'cl', 'clm', 'ml', 'cmm', 'cc', 'chich', 'nung', 'cave', 'sex', 'sexy', 'fuck', 'fck',
  'shit', 'bitch', 'dick', 'porn', 'xxx', 'nude'
]);
var RUDE_SQUASHED = ['concac', 'ditme', 'ditcon', 'dume', 'duma', 'dumay', 'memay', 'bomay', 'sucvat', 'occho', 'oclon', 'vailon', 'lonme', 'buoime', 'clgt'];
var LEET = { '0': 'o', '1': 'i', '!': 'i', '|': 'i', '3': 'e', '4': 'a', '@': 'a', '$': 's', '5': 's', '7': 't', 'j': 'i' };
function plainRude(text) {
  return String(text || '')
    .normalize('NFKD').replace(/\p{M}/gu, '')
    .replace(/[đĐ]/g, 'd').toLowerCase()
    .replace(/[01!|3@$457j]/g, function (c) { return LEET[c] || c; })
    .replace(/([a-z])\1+/g, '$1');
}
function isRudeName(text) {
  if (!text) return false;
  if (containsBanned(text)) return true;
  var p = plainRude(text);
  var words = p.split(/[^a-z]+/).filter(Boolean);
  if (words.some(function (w) { return RUDE_PLAIN.has(w); })) return true;
  var singles = p.split(/[^a-z]+/).map(function (w) { return w.length === 1 ? w : ' '; }).join('').split(' ');
  if (singles.some(function (w) { return w.length > 1 && RUDE_PLAIN.has(w); })) return true;
  var squashed = p.replace(/[^a-z]/g, '');
  return RUDE_SQUASHED.some(function (r) { return squashed.indexOf(r) >= 0; });
}
function maskBanned(text) {
  if (!containsBanned(text)) return text;
  var out = String(text).replace(/[\p{L}\p{M}\p{N}]+/gu, function (w) {
    return BANNED_TOKENS.has(w.normalize('NFC').toLowerCase()) ? '***' : w;
  });
  BANNED_PHRASES.forEach(function (p) {
    out = out.replace(new RegExp(p.replace(/ /g, '\\s+'), 'giu'), '***');
  });
  return out;
}

/* ---------- Ten de doc ---------- */
var DIGITS = { '0': 'không', '1': 'một', '2': 'hai', '3': 'ba', '4': 'bốn', '5': 'năm', '6': 'sáu', '7': 'bảy', '8': 'tám', '9': 'chín' };
var NAME_STARTS = ['hoang', 'tuyet', 'thanh', 'trung', 'quang', 'minh', 'ngoc', 'phuc', 'xuan', 'quoc', 'viet', 'tien', 'tuan', 'hong', 'duy', 'van', 'kim', 'hai', 'nam'];
function speakableName(nickname) {
  if (!nickname) return 'bạn';
  var clean = String(nickname)
    .normalize('NFKC')
    .replace(/[\uFE00-\uFE0F\u200D\u20E3]/gu, '')
    .replace(/[^\p{L}\p{M}\p{N}\s._-]/gu, ' ')
    .normalize('NFC').replace(/\s+/g, ' ').trim();
  if (!clean || isRudeName(clean) || isRudeName(nickname)) return 'bạn';
  clean = clean
    .replace(/(\p{Ll})(\p{Lu})/gu, '$1 $2')
    .replace(/(\p{L})(\d)/gu, '$1 $2')
    .replace(/(\d)(\p{L})/gu, '$1 $2')
    .replace(/[._-]+/g, ' ');
  var out = [];
  clean.split(/\s+/).filter(Boolean).forEach(function (w) {
    if (/^\d+$/.test(w)) {
      if (w.length <= 4) out.push(w.split('').map(function (d) { return DIGITS[d]; }).join(' '));
      return;
    }
    var start = /^[a-z]+$/.test(w) ? null : undefined;
    if (/^[a-z]+$/.test(w)) {
      for (var i = 0; i < NAME_STARTS.length; i++) {
        if (w.indexOf(NAME_STARTS[i]) === 0 && w.length - NAME_STARTS[i].length >= 2) { start = NAME_STARTS[i]; break; }
      }
    }
    if (start) { out.push(start, w.slice(start.length)); } else out.push(w);
  });
  var spoken = out.slice(0, 5).join(' ').trim();
  return spoken || 'bạn';
}

/* ---------- Loi cau chuc trong comment (chi nhan chu de, khong doc nguyen van) ---------- */
function plain(text) {
  return ' ' + String(text || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim() + ' ';
}
var WISH_WORDS = [' mong ', ' cau ', ' xin ', ' nguyen ', ' uoc ', ' muon ', ' chuc ', ' phu ho ', ' gia ho '];
var TOPICS = [
  ['exam', [' thi ', ' diem ', ' dau dai hoc ', ' do dai hoc ', ' tot nghiep ', ' kiem tra ', ' hoc gioi ', ' hoc tot ', ' ielts ', ' bang lai ']],
  ['health', [' suc khoe ', ' khoe ', ' khoe manh ', ' khoi benh ', ' benh ', ' om ', ' phau thuat ', ' nam vien ', ' het dau ', ' binh phuc ']],
  ['love', [' nguoi yeu ', ' tinh duyen ', ' ny ', ' crush ', ' lay chong ', ' lay vo ', ' cuoi ', ' quay lai ', ' nguoi thuong ', ' duyen ']],
  ['family', [' gia dinh ', ' gia dao ', ' con cai ', ' bo me ', ' cha me ', ' em be ', ' sinh con ', ' mang thai ', ' co con ', ' vo chong ']],
  ['work', [' viec ', ' phong van ', ' thang chuc ', ' tang luong ', ' di lam ']],
  ['wealth', [' tien ', ' tai loc ', ' lam an ', ' buon ban ', ' kinh doanh ', ' giau ', ' tra no ', ' het no ', ' trung so ', ' tai chinh ', ' ban hang ', ' don hang ']],
  ['peace', [' binh an ', ' an lanh ', ' tai qua ', ' qua nan ', ' het xui ', ' giai han ', ' thuan loi ', ' may man ']]
];
function detectWish(comment) {
  var t = plain(comment);
  if (!WISH_WORDS.some(function (w) { return t.indexOf(w) >= 0; })) return null;
  for (var i = 0; i < TOPICS.length; i++) {
    var words = TOPICS[i][1];
    for (var j = 0; j < words.length; j++) if (t.indexOf(words[j]) >= 0) return TOPICS[i][0];
  }
  return null;
}

/* ---------- Lop chong spam nho ---------- */
function GiftThanker(cooldownMs, bigCoins, maxWaiting) {
  this.last = new Map();
  this.cooldownMs = cooldownMs || 30000;
  this.bigCoins = bigCoins == null ? 30 : bigCoins;
  this.maxWaiting = maxWaiting || 6;
}
GiftThanker.prototype.shouldThank = function (username, coins, giftLinesWaiting, now) {
  now = now || Date.now();
  var key = String(username || '').toLowerCase();
  var big = coins >= this.bigCoins;
  if (!big && now - (this.last.get(key) == null ? -Infinity : this.last.get(key)) < this.cooldownMs) return false;
  if (!big && giftLinesWaiting >= this.maxWaiting) return false;
  this.last.set(key, now);
  return true;
};
GiftThanker.prototype.reset = function () { this.last.clear(); };

function OncePerPerson() { this.seen = new Set(); }
OncePerPerson.prototype.first = function (username) {
  var key = String(username || '').toLowerCase();
  if (this.seen.has(key)) return false;
  this.seen.add(key);
  return true;
};
OncePerPerson.prototype.reset = function () { this.seen.clear(); };

function RecentPeople() { this.at = new Map(); }
RecentPeople.prototype.note = function (username, name, now) {
  now = now || Date.now();
  this.at.delete(username);
  this.at.set(username, { name: name, at: now });
  if (this.at.size > 200) this.at.delete(this.at.keys().next().value);
};
RecentPeople.prototype.latest = function (n, withinMs, now) {
  now = now || Date.now();
  var out = [];
  var arr = Array.from(this.at.values()).filter(function (p) { return now - p.at <= withinMs; }).reverse();
  for (var i = 0; i < Math.min(n, arr.length); i++) out.push(arr[i].name);
  return out;
};
RecentPeople.prototype.reset = function () { this.at.clear(); };

function WishLimiter(perUserMs, globalMs) {
  this.byUser = new Map();
  this.lastAny = -Infinity;
  this.perUserMs = perUserMs || 600000;
  this.globalMs = globalMs || 20000;
}
WishLimiter.prototype.allow = function (username, now) {
  now = now || Date.now();
  var key = String(username || '').toLowerCase();
  if (now - this.lastAny < this.globalMs) return false;
  if (now - (this.byUser.get(key) == null ? -Infinity : this.byUser.get(key)) < this.perUserMs) return false;
  this.lastAny = now;
  this.byUser.set(key, now);
  return true;
};
WishLimiter.prototype.reset = function () { this.byUser.clear(); this.lastAny = -Infinity; };

/* Chon ngau nhien, khong lap lai cau vua doc. */
function makePicker() {
  var lastIndex = new Map();
  return function (list) {
    if (!list || !list.length) return undefined;
    var i = Math.floor(Math.random() * list.length);
    if (list.length > 1 && i === lastIndex.get(list)) i = (i + 1) % list.length;
    lastIndex.set(list, i);
    return list[i];
  };
}

W.containsBanned = containsBanned;
W.isRudeName = isRudeName;
W.maskBanned = maskBanned;
W.speakableName = speakableName;
W.detectWish = detectWish;
W.GiftThanker = GiftThanker;
W.OncePerPerson = OncePerPerson;
W.RecentPeople = RecentPeople;
W.WishLimiter = WishLimiter;
W.makePicker = makePicker;
})();
