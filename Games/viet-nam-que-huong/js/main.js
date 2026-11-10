/* Viet Nam - Que Huong Toi. Game tinh chay qua LiveBridge.
   TikTok LIVE -> LiveBridge (port 8787) -> WebSocket -> game nay.
   Game KHONG tu noi TikTok, KHONG co server rieng, KHONG co build.
   Diem luu o trinh duyet chay game; chi hien chu, tieng chi la them.
   Cau MC o day do toi viet lai; ten mon an / dia danh la du kien that. */
(function () {
'use strict';
var W = window.QueHuong;
var V = W.voice;
var pick = W.makePicker();
var q = new URLSearchParams(location.search);
var isDemo = q.has('demo') && q.get('demo') !== '0';
var $ = function (id) { return document.getElementById(id); };
var stageEl = $('stage');
var MAP_TOP = 210; /* map-box top trong khung 720x1280 */
var SPARK_MS = 750;

function lsGet(key, fallback) { try { var v = localStorage.getItem(key); return v == null ? fallback : v; } catch (_) { return fallback; } }
function lsSet(key, value) { try { localStorage.setItem(key, value); } catch (_) {} }
function clampNum(v, lo, hi, fb) { var n = Number(v); return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : fb; }
function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
function fmtNum(n) { return Number(n || 0).toLocaleString('vi-VN'); }

/* ---------- Cau hinh mac dinh (moi so/cau chinh duoc deu o day + mapping defaults) ---------- */
var DEFAULT_CFG = {
  channelName: 'kênh mình',
  mcName: 'MC Quê Hương',
  voice: 'F', /* F = HoaiMy nu, M = NamMinh nam */
  voiceRate: 1.1,
  theme: 'son-mai',
  soundOn: true,
  giftFx: true,
  musicOn: true, musicVolume: 30, sfxOn: true, sfxVolume: 55,
  npcVoiceOn: true, npcVoiceMinGapSec: 8, npcVoiceMaxPerMin: 6, npcVoiceWaitMs: 4000, npcVoiceVolume: 90,
  roundSec: 150, /* 2 phut 30, tinh ca 15s mo man; doi qua config, kep 60-600 */
  openMs: 15000, summaryMs: 15000,
  pointsPerComment: 1, commentCooldownMs: 10000,
  likesPerPoint: 15, heartGoal: 2026, heartLightMs: 5000,
  priorityGiftCoins: 30, revisitMs: 30000, maxQueue: 6, dwellMs: 3000, homeAfterMs: 2500,
  giftTierDwellMs: [0, 3000, 3500, 4500, 6000, 8000],
  talkWhenQueueBelow: 3,
  greetEveryMs: 6000, namesPerGreeting: 3,
  wishPerUserMs: 600000, wishGlobalMs: 20000,
  shareReminderEveryMs: 300000, idleAfterMs: 60000,
  labels: {
    title1: 'Việt Nam', title2: 'Quê hương tôi',
    subtitle: 'Gõ tên quê bạn, bản đồ sẽ ghé thăm',
    called: 'Mới gọi quê', gifts: 'Quà về quê', champ: 'Người thắp lửa quê',
    podium: 'Top quê hương', visiting: 'Đang ghé quê', fans: 'Đồng hương mọi buổi'
  },
  giftTable: [
    ['1 – 4 xu', '+3'], ['5 – 29 xu', '+30'], ['30 – 99 xu', '+100'],
    ['100 – 999 xu', '+500'], ['Từ 1.000 xu', '+3.000'],
    ['Thả 15 tim', '+1'], ['Gọi tên quê', '+1']
  ],
  calledLines: [
    function (name, place) { return place + ' ơi! Bạn ' + name + ' vừa gọi tên quê mình đó.'; },
    function (name, place) { return 'Bản đồ đang ghé ' + place + ', quê của bạn ' + name + '.'; },
    function (name, place) { return 'Bạn ' + name + ' gọi ' + place + ', mình tới liền nè.'; }
  ],
  calledWithOthers: function (name, place, others) { return 'Bạn ' + name + ' cùng ' + others + ' bạn nữa đang gọi ' + place + '.'; },
  spotCityLine: function (spot, provUnit) { return spot + ' thuộc ' + provUnit + ' đó cả nhà.'; },
  spotIslandLine: function (spot, provUnit) { return 'Đảo ' + spot + ' của ' + provUnit + ', biển ở đây xanh đẹp lắm.'; },
  farSpotLine: function (spot, provUnit) { return spot + ' thuộc ' + provUnit + '. Gửi lời thương tới các anh đang giữ đảo, cả nước luôn nhớ các anh.'; },
  soldierLines: [
    'Ai đang đi nghĩa vụ ngoài đảo thì giữ sức khỏe nha, ở nhà ai cũng nhớ.',
    'Gửi lời thương tới các bạn đang giữ đảo, xa nhà mà vẫn vững vàng.'
  ],
  giftLine: function (name, gift, prov, pts) { return 'Cảm ơn bạn ' + name + ' đã tặng ' + gift + ' cho ' + prov + '. ' + prov + ' được cộng thêm ' + pts + ' điểm.'; },
  giftNoHome: function (name, gift) { return 'Cảm ơn bạn ' + name + ' đã tặng ' + gift + '. Bạn gõ tên quê mình để quà được cộng điểm cho quê nha.'; },
  roundStart: function (no) { return 'Vòng ' + no + ' bắt đầu rồi! Cả nhà gõ tên tỉnh, thành quê mình để bản đồ ghé thăm nha.'; },
  tenSecondsLeft: 'Còn mười giây nữa thôi! Gọi tên quê mình nhanh lên nào!',
  summaryEmpty: function (no) { return 'Hết giờ vòng ' + no + '. Vòng này chưa có quê nào lên tiếng, vòng sau cả nhà gõ tên quê mình nha.'; },
  summaryLine: function (no, top, champion) {
    var s = 'Hết giờ vòng ' + no + '.';
    if (top.length) {
      s += ' Quê đứng đầu là ' + top[0].name + ' với ' + top[0].pts + ' điểm';
      if (top[1]) s += ', nhì là ' + top[1].name;
      if (top[2]) s += ', ba là ' + top[2].name;
      s += '.';
    }
    if (champion) s += ' Người thắp lửa quê vòng này là bạn ' + champion + '.';
    return s;
  },
  greeting: function (names, kenh, more) {
    return more > 0
      ? kenh + ' chào ' + names + ' và ' + more + ' bạn nữa vừa vào live. Gõ tên quê mình để bản đồ ghé thăm nha.'
      : kenh + ' chào ' + names + '. Gõ tên quê mình để bản đồ ghé thăm nha.';
  },
  thankFollow: function (name, kenh) { return kenh + ' cảm ơn bạn ' + name + ' đã theo dõi kênh nha.'; },
  wishReplies: {
    exam: [function (n) { return 'Chúc bạn ' + n + ' học đâu nhớ đó, thi đâu đậu đó.'; }],
    health: [function (n) { return 'Chúc bạn ' + n + ' với người nhà mau khỏe, ăn ngon ngủ yên.'; }],
    love: [function (n) { return 'Chúc bạn ' + n + ' sớm gặp người thương mình thật lòng.'; }],
    family: [function (n) { return 'Chúc nhà bạn ' + n + ' luôn êm ấm, cha mẹ khỏe, con cái ngoan.'; }],
    work: [function (n) { return 'Chúc bạn ' + n + ' công việc thuận lợi, sớm được như ý.'; }],
    wealth: [function (n) { return 'Chúc bạn ' + n + ' làm ăn phát đạt, buôn may bán đắt.'; }],
    peace: [function (n) { return 'Chúc bạn ' + n + ' mọi chuyện bình an, thuận lợi.'; }]
  },
  shareWithNames: function (names, kenh) { return kenh + ' cảm ơn ' + names + ' đã ghé chơi. Mọi người bấm chia sẻ live cho người cùng quê vào gọi tên quê mình nha.'; },
  shareLines: [
    'Rủ thêm người cùng quê vào đây đi cả nhà, bấm chia sẻ live là được.',
    'Quê mình muốn lên top thì chia sẻ live cho bạn bè cùng quê vào gọi tên nha.'
  ],
  idleLines: [
    'Ai mới vào thì gõ tên tỉnh, thành quê mình, bản đồ sẽ bay tới tận nơi.',
    'Quê mình đang đứng thứ mấy rồi? Cả nhà gõ tên quê để kéo lên top nha.'
  ],
  guideLines: [
    'Gõ tên tỉnh, thành quê bạn vào chat là bản đồ ghé thăm',
    'Thả 15 tim là quê được cộng 1 điểm',
    'Tặng quà là quê sáng rực lên, quà càng to hiệu ứng càng lớn',
    'Vòng nào cũng có bục top 3, quê nào sẽ đứng đầu?'
  ]
};
var cfg = {};
var cfgApplied = false;

function giftPoints(xu) {
  return xu >= 1000 ? 3000 : xu >= 100 ? 500 : xu >= 30 ? 100 : xu >= 5 ? 30 : xu >= 1 ? 3 : 0;
}
function giftTier(xu) {
  return xu >= 1000 ? 5 : xu >= 100 ? 4 : xu >= 30 ? 3 : xu >= 5 ? 2 : 1;
}
function labelsOf() {
  var out = Object.assign({}, DEFAULT_CFG.labels);
  Object.keys(out).forEach(function (k) {
    var v = cfg['label_' + k];
    if (typeof v === 'string' && v.trim()) out[k] = v.trim();
  });
  return out;
}

/* ---------- Trang thai ---------- */
var seq = 0;
var G = {
  kenh: DEFAULT_CFG.channelName,
  round: 1, phase: 'open', warned: false,
  scores: new Map(), next: new Map(),
  players: new Map(), known: new Map(),
  queue: [], lastVisit: new Map(),
  visiting: null, called: null, pin: null,
  feed: [], hearts: 0, lightUntil: 0, lightId: 0,
  summary: null, fans: new Map(),
  drawTimer: 0, saveTimer: 0,
  greeter: { list: [], timer: 0 },
  gifts: new W.GiftThanker(30000, 30, 6),
  follows: new W.OncePerPerson(),
  wishes: new W.WishLimiter(600000, 20000),
  recent: new W.RecentPeople(),
  giftStripIdx: 0, guideIdx: 0
};
var roundMs = DEFAULT_CFG.roundSec * 1000;
var CYCLE = roundMs + DEFAULT_CFG.summaryMs;
var clockOffset = 0;
function roundClock(now) {
  now = now || Date.now();
  var t = (((now + clockOffset) % CYCLE) + CYCLE) % CYCLE;
  var phase = t < DEFAULT_CFG.openMs ? 'open' : t < roundMs ? 'play' : 'summary';
  return { phase: phase, remainMs: phase === 'summary' ? 0 : roundMs - t };
}
function setRoundMs(ms, restart) {
  if (ms === roundMs) return;
  roundMs = ms;
  CYCLE = roundMs + DEFAULT_CFG.summaryMs;
  if (restart) newRound();
}
function newRound() {
  var t = (((Date.now() + clockOffset) % CYCLE) + CYCLE) % CYCLE;
  clockOffset += CYCLE - t;
}
function skipPhase() {
  var t = (((Date.now() + clockOffset) % CYCLE) + CYCLE) % CYCLE;
  var next = t < DEFAULT_CFG.openMs ? DEFAULT_CFG.openMs : t < roundMs ? roundMs : CYCLE;
  clockOffset += next - t + 1;
}

/* ---------- Dong huong (localStorage, validate ky) ---------- */
var FANS_KEY = isDemo ? 'qh:fans.demo' : 'qh:fans';
function loadFans() {
  var m = new Map();
  try {
    var raw = JSON.parse(lsGet(FANS_KEY, '{}') || '{}');
    if (raw && typeof raw === 'object') {
      Object.keys(raw).forEach(function (k) {
        if (!W.PROVINCE_BY_ID[k] || !Array.isArray(raw[k])) return;
        var set = new Set();
        raw[k].forEach(function (u) { if (typeof u === 'string' && set.size < 20000) set.add(u); });
        if (set.size) m.set(k, set);
      });
    }
  } catch (_) { /* luu hong thi bat dau tu 0 */ }
  return m;
}
G.fans = loadFans();
function saveFansSoon() {
  clearTimeout(G.saveTimer);
  G.saveTimer = setTimeout(function () {
    try {
      var obj = {};
      G.fans.forEach(function (v, k) { obj[k] = Array.from(v); });
      lsSet(FANS_KEY, JSON.stringify(obj));
    } catch (_) {}
  }, 2000);
}

/* ---------- Nguoi choi / diem ---------- */
/* LiveBridge chi gui {id, uniqueId, nickname, avatar} (khong co username).
   Lop hoc chuan theo user.id; game nay cung vay: khoa nguoi choi =
   id || uniqueId || username (demo). Phai chuan hoa ngay o dau moi
   handler, khong thi moi nguoi don thanh 1 nguoi (key undefined). */
function normUser(u) {
  u = u || {};
  var key = String(u.id || u.uniqueId || u.username || '');
  return { id: key, username: key, nickname: u.nickname || '', avatar: u.avatar || '', sim: !!u.sim };
}
function safeName(nickname, username) {
  if (!W.isRudeName(nickname)) return nickname;
  if (!W.isRudeName(username)) return username;
  return 'Người xem';
}
function avatarURL(u) {
  if (!u || typeof u !== 'string' || u.indexOf('https://') !== 0) return '';
  try {
    var h = new URL(u).hostname.toLowerCase();
    if (h === 'tiktokcdn.com' || h.endsWith('.tiktokcdn.com') || h === 'tiktok.com' || h.endsWith('.tiktok.com')) return u;
  } catch (_) {}
  return '';
}
function makeAvatar(user, size, cls) {
  var wrap = document.createElement('div');
  wrap.className = 'av ' + (cls || '');
  wrap.style.width = size + 'px';
  wrap.style.height = size + 'px';
  var initial = (user && user.name ? String(user.name).trim().charAt(0) : '?') || '?';
  initial = initial.toUpperCase();
  var url = avatarURL(user && user.avatar);
  if (url) {
    var img = document.createElement('img');
    img.src = url; img.alt = '';
    img.onerror = function () {
      if (img.parentNode) img.parentNode.removeChild(img);
      var d = document.createElement('div');
      d.className = 'av-fallback'; d.textContent = initial;
      wrap.appendChild(d);
    };
    wrap.appendChild(img);
  } else {
    var d2 = document.createElement('div');
    d2.className = 'av-fallback'; d2.textContent = initial;
    wrap.appendChild(d2);
  }
  return wrap;
}
function ensureGuest(u) {
  if (!u || !u.id) return null;
  if (!G.known.has(u.id)) G.known.set(u.id, u);
  return G.known.get(u.id);
}
function playerOf(e, name) {
  var p = G.players.get(e.username);
  if (!p) {
    p = { username: e.username, name: name, avatar: e.avatar || '', home: null, pts: 0, likes: 0, pendingXu: 0, last: {} };
    G.players.set(e.username, p);
  }
  p.name = name;
  if (e.avatar) p.avatar = e.avatar;
  return p;
}
function addPoints(pid, n, pl, sim) {
  if (!n || sim) return;
  var map = G.phase === 'summary' ? G.next : G.scores;
  var s = map.get(pid) || { pts: 0, at: 0 };
  s.pts += n;
  s.at = Date.now();
  map.set(pid, s);
  if (G.phase !== 'summary') pl.pts += n;
  draw();
}
function addFan(pid, username, sim) {
  if (sim) return;
  var set = G.fans.get(pid);
  if (!set) { set = new Set(); G.fans.set(pid, set); }
  if (set.has(username)) return;
  set.add(username);
  saveFansSoon();
}
function pushFeed(item) {
  G.feed.push(Object.assign({ id: ++seq }, item));
  if (G.feed.length > 12) G.feed.shift();
  draw();
}
function enqueue(v) {
  if (v.pri) {
    var i = -1;
    for (var k = 0; k < G.queue.length; k++) { if (!G.queue[k].pri) { i = k; break; } }
    G.queue.splice(i < 0 ? G.queue.length : i, 0, v);
    draw();
    return;
  }
  if (v.kind === 'comment') {
    for (var j = 0; j < G.queue.length; j++) {
      if (G.queue[j].kind === 'comment' && G.queue[j].pid === v.pid) { G.queue[j].others++; draw(); return; }
    }
    if (G.visiting && G.visiting.pid === v.pid) return;
    if (v.pid && Date.now() - (G.lastVisit.get(v.pid) || 0) < (cfg.revisitMs || 30000)) return;
  }
  var normalCount = G.queue.filter(function (qq) { return !qq.pri; }).length;
  if (normalCount >= (cfg.maxQueue || 6)) return; /* dong qua: van co diem, chi khong len hinh */
  G.queue.push(v);
  draw();
}
function ranking() {
  var arr = [];
  G.scores.forEach(function (s, id) {
    var p = W.PROVINCE_BY_ID[id];
    if (p) arr.push({ id: id, name: p.name, pts: s.pts, at: s.at });
  });
  arr.sort(function (a, b) { return b.pts - a.pts || a.at - b.at; });
  return arr;
}
function champion() {
  var best = null;
  G.players.forEach(function (p) { if (p.pts > 0 && (!best || p.pts > best.pts)) best = p; });
  if (!best) return null;
  return { username: best.username, name: best.name, avatar: best.avatar, pts: best.pts, home: best.home && W.PROVINCE_BY_ID[best.home] ? W.PROVINCE_BY_ID[best.home].name : null };
}
function resetRound() {
  G.queue = G.queue.filter(function (qq) { return qq.kind === 'gift'; });
  G.visiting = null;
  G.pin = null;
  G.players.forEach(function (p) { p.home = null; p.pts = 0; p.likes = 0; });
  G.lastVisit.clear();
  G.warned = false;
}

/* ---------- Ten de doc / cau MC ---------- */
var CITIES = new Set(['ha-noi', 'hai-phong', 'hue', 'da-nang', 'can-tho', 'tp-ho-chi-minh']);
function spokenProv(pid) {
  var n = W.PROVINCE_BY_ID[pid] ? W.PROVINCE_BY_ID[pid].name : '';
  return n.replace(/^TP\.\s*/, 'Thành phố ');
}
function provUnit(pid) {
  var n = spokenProv(pid);
  return n.indexOf('Thành phố') === 0 ? n : (CITIES.has(pid) ? 'thành phố ' : 'tỉnh ') + n;
}
function joinNames(names, commasOnly) {
  var spoken = names.map(function (n) { return n === 'bạn' ? n : 'bạn ' + n; });
  if (commasOnly) return spoken.join(', ');
  return spoken.length > 1 ? spoken.slice(0, -1).join(', ') + ' và ' + spoken[spoken.length - 1] : (spoken[0] || '');
}
function safeGiftName(g) {
  var s = String(g || '').trim();
  if (!s || s.length > 30 || !/^[\p{L}\p{M}\p{N} ]+$/u.test(s)) return 'quà';
  return s;
}
function lineFor(v, waiting) {
  var name = W.speakableName(v.user.name);
  var prov = v.pid ? spokenProv(v.pid) : '';
  if (v.kind === 'gift') {
    return v.pid ? cfg.giftLine(name, safeGiftName(v.gift), prov, v.pts) : cfg.giftNoHome(name, safeGiftName(v.gift));
  }
  var place = v.spot ? v.spot.name : prov;
  var call = v.others > 0
    ? cfg.calledWithOthers(name, place, v.others)
    : pick(cfg.calledLines)(name, place);
  var quiet = !v.pid || waiting >= (cfg.talkWhenQueueBelow || 3);
  var s = v.spot;
  var talk = '';
  if (s && s.far) talk = cfg.farSpotLine(s.name, provUnit(v.pid));
  else if (!quiet && s) {
    talk = s.city ? cfg.spotCityLine(s.name, provUnit(v.pid)) : cfg.spotIslandLine(s.name, provUnit(v.pid));
    if (!s.city && Math.random() < 0.5) talk += ' ' + pick(cfg.soldierLines);
  } else if (!quiet && v.pid) {
    talk = W.talkAbout(v.pid, prov);
  }
  return talk ? call + ' ' + talk : call;
}

/* ---------- Su kien tu LiveBridge / demo ---------- */
function onChatEvent(m) {
  var e = normUser(m.user);
  var text = String(m.text || '');
  var name = safeName(e.nickname || '', e.username || '');
  var sim = !!(e.sim || m.sim);
  G.recent.note(e.username, W.speakableName(name));
  pushFeed({ name: name, avatar: e.avatar || '', text: W.maskBanned(text).slice(0, 60), gift: false });
  var topic = (W.containsBanned(text) || W.isRudeName(text)) ? null : W.detectWish(text);
  if (topic) {
    var reply = pick(cfg.wishReplies[topic] || []);
    if (reply && G.wishes.allow(e.username)) V.say(reply(W.speakableName(name)), false, 'random');
  }
  var prov = W.findProvince(text);
  if (!prov) return;
  var pl = playerOf(e, name);
  pl.home = prov.id;
  var now = Date.now();
  if (now - (pl.last[prov.id] || 0) >= (cfg.commentCooldownMs || 10000)) {
    pl.last[prov.id] = now;
    addPoints(prov.id, cfg.pointsPerComment || 1, pl, sim);
  }
  if (pl.pendingXu) {
    addPoints(prov.id, giftPoints(pl.pendingXu), pl, sim);
    pl.pendingXu = 0;
  }
  addFan(prov.id, e.username, sim);
  var spot = W.findSpot(text);
  enqueue({
    pid: prov.id,
    user: { username: e.username, name: name, avatar: pl.avatar },
    kind: 'comment', xu: 0, pts: 0, gift: '', others: 0, pri: false, id: ++seq,
    spot: spot && spot.pid === prov.id ? spot : null
  });
}
function onGiftEvent(ev) {
  var e = normUser(ev.user);
  var src = ev.source || {};
  var name = safeName(e.nickname || '', e.username || '');
  var sim = !!(e.sim || ev.sim);
  var coins = ev.diamonds || ((src.diamonds || 1) * (ev.count || 1));
  coins = Math.max(0, Math.floor(coins));
  var giftName = safeGiftName(src.giftName || ev.label || 'quà');
  var pl = playerOf(e, name);
  G.recent.note(e.username, W.speakableName(name));
  pushFeed({ name: name, avatar: e.avatar || '', text: 'tặng ' + giftName, gift: true });
  var pts = pl.home ? giftPoints(coins) : 0;
  if (pl.home) addPoints(pl.home, pts, pl, sim);
  else pl.pendingXu += coins;
  var priCount = G.queue.filter(function (qq) { return qq.pri; }).length;
  if (G.gifts.shouldThank(e.username, coins, priCount)) {
    enqueue({
      pid: pl.home || null,
      user: { username: e.username, name: name, avatar: pl.avatar },
      kind: 'gift', xu: coins, pts: pts, gift: giftName, others: 0,
      pri: coins >= (cfg.priorityGiftCoins || 30), id: ++seq
    });
  }
}
function onLikeEvent(m) {
  var e = normUser(m.user);
  var n = Math.max(0, Math.floor(m.likeCount || m.count || 1));
  if (!n) return;
  var sim = !!e.sim;
  var pl = playerOf(e, W.speakableName(safeName(e.nickname || '', e.username || '')));
  G.hearts += n;
  if (G.hearts >= (cfg.heartGoal || 2026)) {
    G.hearts %= (cfg.heartGoal || 2026);
    G.lightUntil = Date.now() + (cfg.heartLightMs || 5000);
    G.lightId++;
    setTimeout(draw, (cfg.heartLightMs || 5000) + 50);
  }
  draw();
  pl.likes += n;
  var add = Math.floor(pl.likes / (cfg.likesPerPoint || 15));
  if (add && pl.home) {
    pl.likes -= add * (cfg.likesPerPoint || 15);
    addPoints(pl.home, add, pl, sim);
  }
}
function onJoin(rawUser) {
  var user = normUser(rawUser);
  if (!user || !user.username) return;
  ensureGuest(user);
  var spoken = W.speakableName(safeName(user.nickname || '', user.username));
  if (spoken === 'bạn') return;
  G.greeter.list.push({ username: user.username, name: spoken });
  if (G.greeter.list.length > 50) G.greeter.list.splice(0, G.greeter.list.length - 50);
}
function flushGreeter() {
  if (!G.greeter.list.length) return;
  /* Co qua lon dang cho thi cam on qua truoc, de chao sau. */
  if (V.waiting >= 2 || G.queue.some(function (qq) { return qq.pri; })) return;
  var batch = G.greeter.list.splice(0, 3);
  var more = G.greeter.list.length;
  G.greeter.list.length = 0;
  var names = batch.map(function (b) { return b.name; });
  V.say(cfg.greeting(joinNames(names, more > 0), G.kenh, more), false, 'random');
}
function onFollowEvent(rawUser) {
  var user = normUser(rawUser);
  if (!user || !user.username) return;
  ensureGuest(user);
  if (G.follows.first(user.username)) {
    V.say(cfg.thankFollow(W.speakableName(safeName(user.nickname || '', user.username)), G.kenh), false, 'event');
  }
}
function handle(ev) {
  if (!ev || !ev.action) return;
  var src = ev.source || {};
  if (src.kind === 'gift') {
    onGiftEvent(ev);
    if (ev.action === 'fireworks') W.effects.fireworks(2, 360, 520);
    else if (ev.action === 'confetti') W.effects.confetti(50);
    else if (ev.action === 'petals') W.effects.hearts(10, 360, 520);
    return;
  }
  switch (ev.action) {
    case 'join': onJoin(ev.user); break;
    case 'like': onLikeEvent({ user: ev.user, likeCount: (ev.value || 1) * (ev.count || 1) }); break;
    case 'spotlight': onFollowEvent(ev.user); break;
    case 'share': W.effects.confetti(40); break;
    case 'fireworks': W.effects.fireworks(2, 360, 520); break;
    case 'petals': W.effects.hearts(10, 360, 520); break;
    case 'confetti': W.effects.confetti(50); break;
    case 'gift': onGiftEvent(ev); break;
    default: break;
  }
}

/* ---------- Ve lai (textContent, khong innerHTML) ---------- */
function draw() {
  if (G.drawTimer) return;
  G.drawTimer = setTimeout(function () { G.drawTimer = 0; render(); }, 120);
}
function setText(id, s) { var e = $(id); if (e) e.textContent = s; }
function render() {
  var L = labelsOf();
  var c = roundClock();
  var secs = Math.ceil(c.remainMs / 1000);
  setText('roundNo', 'Vòng ' + G.round);
  setText('clock', String(Math.floor(secs / 60)).padStart(2, '0') + ':' + String(secs % 60).padStart(2, '0'));
  var clockEl = $('clock');
  if (clockEl) clockEl.classList.toggle('hot', c.phase === 'play' && secs <= 10);
  setText('phaseChip', { open: 'Mở màn vòng', play: 'Vòng gặp gỡ', summary: 'Tổng kết vòng' }[c.phase] || '');
  var rank = ranking();
  setText('litCount', 'Đã sáng ' + rank.length + '/34');
  var visitingId = G.visiting ? G.visiting.pid : null;
  setText('visitingName', visitingId ? W.PROVINCE_BY_ID[visitingId].name : 'Cả nước');
  var fansHere = visitingId ? (G.fans.get(visitingId) ? G.fans.get(visitingId).size : 0)
    : Array.from(G.fans.values()).reduce(function (a, s) { return a + s.size; }, 0);
  setText('visitingFans', L.fans + ': ' + fmtNum(fansHere) + ' người');
  /* Sap ghe: ten dia danh / tinh trong hang cho, khong trung, toi da 4. */
  var up = [];
  G.queue.forEach(function (qq) {
    if (!qq.pid) return;
    var nm = qq.spot ? qq.spot.name : W.PROVINCE_BY_ID[qq.pid].name;
    if (up.indexOf(nm) < 0) up.push(nm);
  });
  var upEl = $('upcomingList');
  if (upEl) {
    while (upEl.firstChild) upEl.removeChild(upEl.firstChild);
    if (!up.length) {
      var em = document.createElement('span');
      em.className = 'up-empty'; em.textContent = 'gõ tên quê để xếp hàng';
      upEl.appendChild(em);
    } else {
      up.slice(0, 4).forEach(function (nm) {
        var s = document.createElement('span');
        s.className = 'up-name'; s.textContent = nm;
        upEl.appendChild(s);
      });
    }
  }
  /* Thanh tim. */
  var goal = cfg.heartGoal || 2026;
  var lit = Date.now() < G.lightUntil;
  var hbFill = $('heartFill');
  if (hbFill) hbFill.style.width = (lit ? 100 : Math.min(100, G.hearts / goal * 100)) + '%';
  setText('heartNum', (lit ? fmtNum(goal) : fmtNum(G.hearts)) + ' / ' + fmtNum(goal));
  var hb = $('heartBar');
  if (hb) hb.classList.toggle('full', lit);
  var allLitEl = $('allLit');
  if (allLitEl) allLitEl.style.display = lit ? '' : 'none';
  /* Dong chay: 4 muc moi nhat. */
  var tk = $('ticker');
  if (tk) {
    while (tk.firstChild) tk.removeChild(tk.firstChild);
    G.feed.slice(-4).reverse().forEach(function (f) {
      var row = document.createElement('div');
      row.className = 'tk' + (f.gift ? ' gift' : '');
      row.appendChild(makeAvatar({ name: f.name, avatar: f.avatar }, 44));
      var sp = document.createElement('span');
      var b = document.createElement('b'); b.textContent = f.name;
      sp.appendChild(b);
      sp.appendChild(document.createTextNode(' ' + f.text));
      row.appendChild(sp);
      tk.appendChild(row);
    });
  }
  /* Bang qua xoay vong 2,5s. */
  var gs = $('giftStripRow');
  if (gs && cfg.giftTable) {
    var row = cfg.giftTable[G.giftStripIdx % cfg.giftTable.length];
    while (gs.firstChild) gs.removeChild(gs.firstChild);
    gs.appendChild(document.createTextNode(row[0] + ' '));
    var b2 = document.createElement('b'); b2.textContent = row[1];
    gs.appendChild(b2);
  }
  /* Buc top 3 dang cot 2-1-3. */
  var pod = $('podiumCols');
  if (pod) {
    while (pod.firstChild) pod.removeChild(pod.firstChild);
    var top3 = rank.slice(0, 3);
    var max = (top3[0] && top3[0].pts) || 1;
    [1, 0, 2].forEach(function (i) {
      var r = top3[i];
      var col = document.createElement('div');
      col.className = 'col r' + (i + 1);
      var nm = document.createElement('div'); nm.className = 'p-name';
      nm.textContent = r ? r.name.replace(/^TP\.\s*/, '') : '…';
      var pts = document.createElement('div'); pts.className = 'p-pts';
      pts.textContent = r ? fmtNum(r.pts) : '';
      var bar = document.createElement('div'); bar.className = 'p-bar';
      bar.style.height = (r ? 46 + 104 * Math.sqrt(r.pts / max) : 30) + 'px';
      bar.textContent = String(i + 1);
      col.appendChild(nm); col.appendChild(pts); col.appendChild(bar);
      pod.appendChild(col);
    });
    var podEmpty = $('podiumEmpty');
    if (podEmpty) podEmpty.style.display = top3.length ? 'none' : '';
  }
  /* Nguoi thap lua que. */
  var ch = champion();
  var champBody = $('champBody');
  if (champBody) {
    while (champBody.firstChild) champBody.removeChild(champBody.firstChild);
    if (ch) {
      champBody.appendChild(makeAvatar(ch, 84, 'champ-av'));
      var tx = document.createElement('div'); tx.className = 'champ-txt';
      var cn = document.createElement('div'); cn.className = 'c-name'; cn.textContent = ch.name;
      var cs = document.createElement('div'); cs.className = 'c-sub'; cs.textContent = 'góp ' + fmtNum(ch.pts) + ' điểm';
      tx.appendChild(cn); tx.appendChild(cs);
      champBody.appendChild(tx);
    } else {
      var em2 = document.createElement('div'); em2.className = 'empty';
      em2.textContent = 'Góp nhiều điểm nhất cho quê là lên đây';
      champBody.appendChild(em2);
    }
  }
  /* Khung moi goi que. */
  var calledAv = $('calledAv');
  if (calledAv) {
    while (calledAv.firstChild) calledAv.removeChild(calledAv.firstChild);
    if (G.called) calledAv.appendChild(makeAvatar(G.called.user, 120, 'called-av'));
  }
  setText('calledName', G.called ? G.called.user.name : '');
  setText('calledSub', G.called ? (G.called.pid ? 'gọi tên ' + (G.called.spot ? G.called.spot.name : W.PROVINCE_BY_ID[G.called.pid].name) : 'tặng ' + G.called.xu + ' xu, chưa chọn quê') : '');
  var calledEmpty = $('calledEmpty');
  if (calledEmpty) calledEmpty.style.display = G.called ? 'none' : '';
  var calledBody = $('calledBody');
  if (calledBody) calledBody.style.display = G.called ? '' : 'none';
  /* Ghim tren ban do. */
  renderPin();
  /* Ghi chu mo phong: chi hien luc nhin ca nuoc. */
  var note = $('mapNote');
  if (note) note.style.opacity = visitingId ? '0' : '1';
  /* Banner mo man / tong ket. */
  renderBanner(c);
  /* Dem nguoc 10s cuoi. */
  var fin = $('finalCount');
  if (fin) {
    var on = c.phase === 'play' && secs <= 10 && secs > 0;
    fin.style.display = on ? '' : 'none';
    if (on) { setText('finalNum', String(secs)); setText('finalSecs', String(secs)); }
  }
  /* Huong dan xoay vong. */
  var gl = $('guideLine');
  if (gl && cfg.guideLines && cfg.guideLines.length) {
    gl.textContent = cfg.guideLines[G.guideIdx % cfg.guideLines.length];
  }
  /* Ban do: mau tinh theo diem. */
  if (window.QueHuong.QHMap) {
    var heat = {};
    rank.forEach(function (r) { heat[r.id] = Math.sqrt(r.pts / (rank[0] ? rank[0].pts : 1)); });
    W.QHMap.applyState({
      lit: new Set(rank.map(function (r) { return r.id; })),
      heat: heat, visitingId: visitingId, allLit: lit
    });
  }
}
function renderPin() {
  var pinEl = $('pin');
  if (!pinEl) return;
  while (pinEl.firstChild) pinEl.removeChild(pinEl.firstChild);
  var pin = G.pin;
  if (!pin || !pin.at || !pin.v) { pinEl.style.display = 'none'; return; }
  var v = pin.v;
  pinEl.style.display = '';
  /* Kep ghim trong khung: ghim cao ~230px va moc tu duoi len (translate
     -50%,-100%) nen top < 240 se cat mat ten tinh o dinh; ten dai
     (TP. Ho Chi Minh) can ~150px moi ben nen left < 150 hoac > 570
     se cat mep phai/trai. Kep lai thi chan ghim lech khoi tinh mot
     chut nhung chu khong bao gio mat — ten tinh con co vien big-prov
     o tren cung dam bao hien du. */
  pinEl.style.left = Math.min(Math.max(pin.at[0], 150), 570) + 'px';
  pinEl.style.top = Math.min(Math.max(pin.at[1], 240), 940) + 'px';
  var gained = v.kind === 'gift' ? v.pts : (v.others + 1) * (cfg.pointsPerComment || 1);
  if (gained > 0) {
    var pp = document.createElement('div'); pp.className = 'pin-points';
    pp.textContent = '+' + fmtNum(gained) + ' điểm';
    pinEl.appendChild(pp);
  }
  var pv = document.createElement('div'); pv.className = 'pin-prov';
  pv.textContent = v.spot ? v.spot.name : (v.pid ? W.PROVINCE_BY_ID[v.pid].name : '');
  pinEl.appendChild(pv);
  if (v.spot && v.pid) {
    var ps = document.createElement('div'); ps.className = 'pin-sub';
    ps.textContent = 'thuộc ' + W.PROVINCE_BY_ID[v.pid].name;
    pinEl.appendChild(ps);
  }
  pinEl.appendChild(makeAvatar(v.user, 96, 'pin-av'));
  var pn = document.createElement('div'); pn.className = 'pin-name'; pn.textContent = v.user.name;
  pinEl.appendChild(pn);
  if (v.kind === 'gift') {
    var pg = document.createElement('div'); pg.className = 'pin-gift';
    pg.textContent = v.gift + ' · +' + fmtNum(v.pts) + ' điểm';
    pinEl.appendChild(pg);
  } else if (v.others > 0) {
    var pm = document.createElement('div'); pm.className = 'pin-more';
    pm.textContent = 'và ' + v.others + ' người nữa';
    pinEl.appendChild(pm);
  }
  var stem = document.createElement('div'); stem.className = 'pin-stem';
  pinEl.appendChild(stem);
}
var bannerOpenUntil = 0;
function renderBanner(c) {
  var b = $('banner');
  if (!b) return;
  var L = labelsOf();
  if (c.phase === 'open') {
    if (!bannerOpenUntil) bannerOpenUntil = Date.now() + 3500;
    if (Date.now() > bannerOpenUntil) { b.style.display = 'none'; return; }
    b.style.display = '';
    setText('bannerTitle', 'Vòng ' + G.round);
    setText('bannerSub', L.subtitle);
    var rows = $('bannerRows'); if (rows) while (rows.firstChild) rows.removeChild(rows.firstChild);
    var mvp = $('bannerMvp'); if (mvp) while (mvp.firstChild) mvp.removeChild(mvp.firstChild);
    return;
  }
  bannerOpenUntil = 0;
  var s = G.summary;
  if (c.phase !== 'summary' || !s) { b.style.display = 'none'; return; }
  b.style.display = '';
  setText('bannerTitle', 'Tổng kết vòng ' + s.no);
  setText('bannerSub', 'Cảm ơn cả nhà đã gọi tên quê mình');
  var rows2 = $('bannerRows');
  if (rows2) {
    while (rows2.firstChild) rows2.removeChild(rows2.firstChild);
    if (!s.top.length) {
      var d = document.createElement('div'); d.className = 'row';
      d.textContent = 'Vòng này chưa quê nào lên tiếng';
      rows2.appendChild(d);
    } else {
      var colors = ['var(--accent)', 'var(--pearl)', 'var(--copper)'];
      s.top.forEach(function (r, i) {
        var row = document.createElement('div'); row.className = 'row';
        var rk = document.createElement('span'); rk.className = 'rk';
        rk.style.background = colors[i]; rk.textContent = String(i + 1);
        var rn = document.createElement('span'); rn.className = 'rn'; rn.textContent = r.name;
        var rp = document.createElement('span'); rp.className = 'rp'; rp.textContent = fmtNum(r.pts) + ' điểm';
        row.appendChild(rk); row.appendChild(rn); row.appendChild(rp);
        rows2.appendChild(row);
      });
    }
  }
  var mvp2 = $('bannerMvp');
  if (mvp2) {
    while (mvp2.firstChild) mvp2.removeChild(mvp2.firstChild);
    if (s.champion) {
      mvp2.appendChild(makeAvatar(s.champion, 84));
      var tx = document.createElement('div');
      tx.appendChild(document.createTextNode(L.champ + ': '));
      var bb = document.createElement('b'); bb.textContent = s.champion.name;
      tx.appendChild(bb);
      tx.appendChild(document.createElement('br'));
      tx.appendChild(document.createTextNode('góp ' + fmtNum(s.champion.pts) + ' điểm cho quê'));
      mvp2.appendChild(tx);
    }
  }
}

/* ---------- Vong choi ---------- */
function roundTick() {
  var c = roundClock();
  if (c.phase === 'play' && c.remainMs <= 10000 && !G.warned && G.scores.size) {
    G.warned = true;
    V.say(cfg.tenSecondsLeft, true, 'event');
  }
  if (c.phase === G.phase) { draw(); return; }
  if (c.phase === 'summary') {
    var top = ranking().slice(0, 3);
    var champ = champion();
    G.summary = { no: G.round, top: top, champion: champ };
    G.queue = G.queue.filter(function (qq) { return qq.kind === 'gift'; });
    G.visiting = null;
    G.pin = null;
    V.say(top.length ? cfg.summaryLine(G.round, top, champ ? W.speakableName(champ.name) : null) : cfg.summaryEmpty(G.round), true, 'event');
  } else if (c.phase === 'open' || G.phase === 'summary') {
    G.round++;
    G.scores = G.next;
    G.next = new Map();
    G.summary = null;
    resetRound();
    V.say(cfg.roundStart(G.round), true, 'event');
  }
  G.phase = c.phase;
  draw();
}

/* ---------- Luot ghe tham ---------- */
function calledAvatarCenter() {
  var s = stageEl.getBoundingClientRect();
  var el = $('calledAv');
  if (!el || !el.firstChild) return [110, 660];
  var r = el.firstChild.getBoundingClientRect();
  var k = s.width / 720 || 1;
  return [(r.left + r.width / 2 - s.left) / k, (r.top + r.height / 2 - s.top) / k];
}
async function visitLoop() {
  var idleSince = Date.now();
  for (;;) {
    if (G.phase === 'summary') { await sleep(150); continue; }
    var v = G.queue.shift();
    if (!v) {
      if (G.visiting && Date.now() - idleSince > (cfg.homeAfterMs || 2500)) {
        G.visiting = null;
        G.pin = null;
        W.QHMap.setArrived(null);
        W.QHMap.clearBurst();
        W.QHMap.goHome();
        draw();
      }
      await sleep(150);
      continue;
    }
    G.called = v;
    if (v.pid) {
      G.visiting = v;
      G.lastVisit.set(v.pid, Date.now());
    }
    draw();
    V.prefetch(lineFor(v, G.queue.length));
    var anchor = null;
    try { anchor = await W.QHMap.focus(v); } catch (_) { anchor = null; }
    if (v.pid && anchor) {
      var to = [anchor[0], anchor[1] + MAP_TOP];
      var from = calledAvatarCenter();
      W.audio.spark();
      W.effects.spark(from, to, SPARK_MS);
      await sleep(SPARK_MS);
      W.QHMap.setArrived(v.pid);
      W.QHMap.showBurst(anchor[0], anchor[1]);
      G.pin = { v: v, at: anchor };
      draw();
      showBigProv(v.spot ? v.spot.name : W.PROVINCE_BY_ID[v.pid].name);
      W.audio.chime();
      if (v.kind === 'gift' && cfg.giftFx !== false) {
        W.effects.giftFx(giftTier(v.xu), to[0], to[1]);
        showGiftBanner(v);
      }
    }
    V.say(lineFor(v, G.queue.length), true, 'event');
    var start = Date.now();
    var dwell = v.kind === 'gift'
      ? Math.max(cfg.dwellMs || 3000, (cfg.giftTierDwellMs || DEFAULT_CFG.giftTierDwellMs)[giftTier(v.xu)])
      : (cfg.dwellMs || 3000);
    await sleep(dwell);
    while (V.busy && Date.now() - start < 15000) await sleep(150);
    G.pin = null;
    hideGiftBanner();
    W.QHMap.clearBurst();
    W.QHMap.setArrived(null);
    draw();
    idleSince = Date.now();
  }
}
function showBigProv(name) {
  var b = $('bigProv');
  if (!b) return;
  b.textContent = name;
  /* Vien thuoc rong toi da 460px (can trong vung ban do trong, khong de
     len cot phai): ten dai nhat ~350px o co 32px nen vua, ten dai hon
     tu xuong dong trong vien thay vi tran mep. */
  b.style.fontSize = Math.min(48, Math.floor(560 / Math.max(1, name.length))) + 'px';
  b.classList.remove('show');
  void b.offsetWidth; /* khoi dong lai animation */
  b.classList.add('show');
}
function showGiftBanner(v) {
  var b = $('giftBanner');
  if (!b) return;
  while (b.firstChild) b.removeChild(b.firstChild);
  b.appendChild(makeAvatar(v.user, 84));
  var tx = document.createElement('div');
  var n = document.createElement('div'); n.className = 'gb-name'; n.textContent = v.user.name;
  var t = document.createElement('div'); t.className = 'gb-text';
  t.textContent = 'tặng ' + v.gift + ' cho ' + (v.pid ? W.PROVINCE_BY_ID[v.pid].name : 'quê hương');
  var p = document.createElement('div'); p.className = 'gb-pts';
  p.textContent = '+' + fmtNum(v.pts) + ' điểm';
  tx.appendChild(n); tx.appendChild(t); tx.appendChild(p);
  b.appendChild(tx);
  b.style.display = '';
  if (giftTier(v.xu) >= 5) b.classList.add('big'); else b.classList.remove('big');
}
function hideGiftBanner() {
  var b = $('giftBanner');
  if (b) b.style.display = 'none';
}

/* ---------- Cau hinh ---------- */
function applyTheme() {
  var t = W.themeById(cfg.theme);
  var vars = W.themeVars(t);
  Object.keys(vars).forEach(function (k) { stageEl.style.setProperty(k, vars[k]); });
  if (W.QHMap) W.QHMap.setPalette(t.lit);
  setText('themeName', t.name);
}
function applyLabels() {
  var L = labelsOf();
  setText('title1', L.title1);
  setText('title2', L.title2);
  setText('subtitle', L.subtitle);
  setText('calledTitle', L.called);
  setText('giftStripTitle', L.gifts);
  setText('champTitle', L.champ);
  setText('podiumTitle', L.podium);
  setText('visitingLabel', L.visiting);
}
function applyConfig(c) {
  if (!c) return;
  if (c.config) c = c.config;
  var first = !cfgApplied;
  cfgApplied = true;
  cfg = Object.assign({}, DEFAULT_CFG, c);
  cfg.roundSec = clampNum(cfg.roundSec, 60, 600, 150);
  setRoundMs(cfg.roundSec * 1000, !first);
  G.kenh = typeof cfg.channelName === 'string' && cfg.channelName.trim() ? cfg.channelName.trim() : DEFAULT_CFG.channelName;
  V.setWho(cfg.voice === 'M' ? 'M' : 'F');
  if (window.NpcVoice && NpcVoice.setConfig) {
    try {
      NpcVoice.setConfig({
        npcVoiceOn: cfg.npcVoiceOn !== false && cfg.soundOn !== false,
        npcVoice: V.voiceId(),
        npcVoiceMinGapSec: cfg.npcVoiceMinGapSec,
        npcVoiceMaxPerMin: cfg.npcVoiceMaxPerMin,
        npcVoiceWaitMs: cfg.npcVoiceWaitMs,
        npcVoiceVolume: cfg.soundOn === false ? 0 : cfg.npcVoiceVolume
      });
    } catch (_) {}
  }
  W.audio.setConfig({
    musicOn: cfg.musicOn !== false && cfg.soundOn !== false,
    musicVolume: cfg.musicVolume, sfxOn: cfg.sfxOn !== false && cfg.soundOn !== false, sfxVolume: cfg.sfxVolume
  });
  applyTheme();
  applyLabels();
  draw();
}

/* ---------- Ket noi LiveBridge ---------- */
var bridge = null;
function connect() {
  if (typeof LiveBridgeClient === 'undefined') {
    applyConfig(DEFAULT_CFG);
    setText('liveStatus', 'Không thấy livebridge-client.js — chạy demo nội bộ');
    return;
  }
  /* Lay host/port hien tai (nhu dam-cuoi): mo game qua LiveBridge cong nao
     thi WS noi cong do; mo bang file:// thi mac dinh localhost:8787. */
  var wsHost = location.host || 'localhost:8787';
  bridge = new LiveBridgeClient({ url: 'ws://' + wsHost, game: 'viet-nam-que-huong' });
  if (window.NpcVoice && NpcVoice.attach) {
    try { NpcVoice.attach(bridge); } catch (_) {}
  }
  bridge.on('event', handle);
  bridge.on('chat', function (m) { if (m) onChatEvent(m); });
  bridge.on('hello', function (h) {
    if (h && h.config) { applyConfig(h.config); }
    else applyConfig(DEFAULT_CFG);
    setText('liveStatus', 'Đã nối LiveBridge');
  });
  bridge.on('config', function (m) { applyConfig(m); });
  bridge.on('seen', function (m) { if (m && m.user) ensureGuest(m.user); });
  bridge.on('block', function (m) {
    if (m && m.user && m.user.id) G.known.delete(m.user.id);
  });
  bridge.on('reset-scores', function () {
    G.scores.clear(); G.next.clear(); G.feed = []; G.called = null; G.queue = [];
    G.visiting = null; G.pin = null;
    V.stop();
    draw();
  });
  bridge.on('status', function (m) {
    if (m && m.tiktok) setText('liveStatus', 'TikTok: ' + m.tiktok.state + (m.tiktok.username ? ' • @' + m.tiktok.username : ''));
  });
  bridge.connect();
  /* Sau 8s chua thay config that thi giu DEFAULT_CFG (da ap luc khoi dong). */
  setTimeout(function () { if (!cfgApplied) applyConfig(DEFAULT_CFG); }, 8000);
}

/* ---------- Demo (?demo=1) ---------- */
var DEMO_USERS = [
  { username: 'demo0', nickname: 'Lan Anh' }, { username: 'demo1', nickname: 'Minh Tuấn' },
  { username: 'demo2', nickname: 'Thu Hà' }, { username: 'demo3', nickname: 'Quốc Bảo' },
  { username: 'demo4', nickname: 'Ngọc Mai' }, { username: 'demo5', nickname: 'Hoàng Long' },
  { username: 'demo6', nickname: 'Bích Trâm' }, { username: 'demo7', nickname: 'Đức Anh' }
];
var demoTimer = 0, demoStarted = false;
function demoComment() {
  var u = DEMO_USERS[Math.floor(Math.random() * DEMO_USERS.length)];
  var p = W.PROVINCES[Math.floor(Math.random() * W.PROVINCES.length)];
  var texts = [p.name, 'quê mình ' + p.name + ' nè', p.name + ' ơi', 'mình ở ' + p.name];
  onChatEvent({ user: { id: u.username, username: u.username, nickname: u.nickname, avatar: '' }, text: texts[Math.floor(Math.random() * texts.length)] });
  var r = Math.random();
  if (r < 0.22) {
    var coins = [1, 5, 30, 100, 1000][Math.floor(Math.random() * 5)];
    setTimeout(function () {
      onGiftEvent({ user: { id: u.username, username: u.username, nickname: u.nickname, avatar: '' }, diamonds: coins, count: 1, label: 'Hoa hồng', source: { kind: 'gift', giftName: 'Hoa hồng', diamonds: coins } });
    }, 700);
  } else if (r < 0.35) {
    onLikeEvent({ user: { id: u.username, username: u.username, nickname: u.nickname, avatar: '' }, likeCount: 15 + Math.floor(Math.random() * 30) });
  }
}
function demoSetup() {
  var bar = $('demoBar');
  if (bar) bar.style.display = '';
  setText('liveStatus', 'Demo nội bộ — không cần TikTok');
  var startBtn = $('btnStart');
  if (startBtn) startBtn.addEventListener('click', function () {
    if (demoStarted) return;
    demoStarted = true;
    W.audio.init();
    W.audio.resume();
    startBtn.textContent = 'Đang chạy demo…';
    startBtn.disabled = true;
    demoTimer = setInterval(demoComment, 2600);
    demoComment();
  });
  var skipBtn = $('btnSkip');
  if (skipBtn) skipBtn.addEventListener('click', function () { skipPhase(); draw(); });
  var newBtn = $('btnNewRound');
  if (newBtn) newBtn.addEventListener('click', function () { newRound(); draw(); });
  var fansBtn = $('btnResetFans');
  if (fansBtn) fansBtn.addEventListener('click', function () {
    G.fans.clear();
    try { localStorage.removeItem(FANS_KEY); } catch (_) {}
    draw();
  });
}

/* ---------- Khoi dong ---------- */
function boot() {
  G.phase = roundClock().phase;
  applyConfig(DEFAULT_CFG);
  W.audio.init();
  W.effects.init($('fxCanvas'));
  W.QHMap.load('vn34.json').catch(function (err) {
    var e = $('mapError');
    if (e) { e.style.display = ''; e.textContent = 'Không tải được bản đồ: ' + (err && err.message ? err.message : err); }
    window.__diag = window.__diag || {};
    window.__diag.mapError = String(err && err.message ? err.message : err);
  });
  setInterval(roundTick, 250);
  setInterval(function () { G.greeter.timer = 0; flushGreeter(); }, cfg.greetEveryMs || 6000);
  setInterval(function () {
    var names = G.recent.latest(3, cfg.shareReminderEveryMs || 300000);
    var line = names.length ? cfg.shareWithNames(joinNames(names), G.kenh) : pick(cfg.shareLines);
    if (line) V.say(line, false, 'random');
  }, cfg.shareReminderEveryMs || 300000);
  setInterval(function () {
    if (V.quietForMs() < (cfg.idleAfterMs || 60000)) return;
    var line = pick(cfg.idleLines);
    if (line) V.say(line, false, 'random');
  }, 15000);
  setInterval(function () {
    G.giftStripIdx++;
    G.guideIdx++;
    draw();
  }, 2500);
  visitLoop();
  if (isDemo) demoSetup();
  else connect();
  draw();
  window.__diag = window.__diag || {};
  window.__diag.game = 'viet-nam-que-huong';
  window.__diag.demo = isDemo;
}
boot();
})();
