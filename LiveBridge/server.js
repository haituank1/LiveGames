'use strict';
/* LiveBridge – cục A
   TikTok LIVE ──► chuẩn hoá (src/tiktok.js) ──► lọc người bị chặn ──► quy đổi theo gói từng game (src/mapper.js) ──► WebSocket ──► game

   Chạy:  npm start          rồi mở http://localhost:8787/ (trang quản trị)
   Game kết nối:  ws://localhost:8787/?game=chua-3d
*/
const http = require('http');
const path = require('path');
const fs = require('fs');
const { WebSocketServer } = require('ws');
const { TikTokSource } = require('./src/tiktok');
const { Mapper, editable } = require('./src/mapper');
const { Settings } = require('./src/settings');
const { serveStatic, listMedia, listBackgrounds } = require('./src/static');

const ROOT = path.resolve(__dirname, '..');                 // C:\TestGameAI
const GAMES_DIR = path.join(ROOT, 'Games');
const config = loadConfig();
const settings = new Settings(path.join(__dirname, 'config', 'settings.json'));
const mapper = new Mapper(path.join(__dirname, 'config', 'mappings'));
const tiktok = new TikTokSource(config.tiktok);
const clients = new Set();                                   // { ws, game, role: 'game'|'monitor'|'admin' }
const viewers = new Map();                                   // user.id → { user, diamonds, comments, likes, gifts, last }
let room = { viewers: 0 };
let seq = 0;

function loadConfig() {
  const cfg = JSON.parse(fs.readFileSync(path.join(__dirname, 'config', 'default.json'), 'utf8'));
  const arg = name => { const a = process.argv.find(x => x.startsWith(`--${name}=`)); return a && a.slice(name.length + 3); };
  cfg.cliUser = (arg('user') || process.env.TIKTOK_USER || '').replace(/^@/, '');
  if (arg('port')) cfg.port = Number(arg('port'));
  if (arg('host')) cfg.host = arg('host');
  return cfg;
}

/* ---------------- Gửi tin ---------------- */
function send(c, msg) { if (c.ws.readyState === 1) c.ws.send(JSON.stringify(msg)); }
function broadcast(msg, filter = () => true) { for (const c of clients) if (filter(c)) send(c, msg); }
const toGames = msg => broadcast(msg, c => !!c.game && c.role !== 'admin');
const toAdmins = msg => broadcast(msg, c => c.role === 'admin' || c.role === 'monitor');

/* ---------------- Người xem gần đây (để quản trị chặn) ---------------- */
function trackViewer(raw) {
  const u = raw.user;
  let v = viewers.get(u.id);
  if (!v) { v = { user: u, diamonds: 0, comments: 0, likes: 0, gifts: 0, last: 0 }; viewers.set(u.id, v); }
  v.user = u; v.last = Date.now();
  if (raw.kind === 'gift') { v.gifts += raw.count || 1; v.diamonds += (raw.diamonds || 0) * (raw.count || 1); }
  if (raw.kind === 'chat') v.comments++;
  if (raw.kind === 'like') v.likes += raw.count || 1;
  if (viewers.size > 600) {   // giữ 500 người gần nhất
    const old = [...viewers.values()].sort((a, b) => a.last - b.last).slice(0, viewers.size - 500);
    for (const o of old) viewers.delete(o.user.id);
  }
  viewersDirty = true;
}
let viewersDirty = false;
setInterval(() => {
  if (!viewersDirty) return;
  viewersDirty = false;
  toAdmins({ type: 'viewers', list: viewerList() });
}, 1000);
const viewerList = () => [...viewers.values()].sort((a, b) => b.last - a.last).slice(0, 200)
  .map(v => ({ ...v, blocked: settings.isBlocked(v.user) }));

/* ---------------- Phân phối sự kiện ---------------- */
function dispatch(raw) {
  if (!raw || !raw.user || !raw.user.id) return;
  const blocked = settings.isBlocked(raw.user);
  if (config.logEvents) {
    const u = raw.user.nickname;
    const extra = raw.kind === 'gift' ? ` ${raw.giftName} (${raw.diamonds}💎) x${raw.count}` : raw.kind === 'chat' ? `: ${raw.text}` : raw.kind === 'like' ? ` x${raw.count}` : '';
    console.log(`[${raw.simulated ? 'sim' : 'live'}]${blocked ? '[CHẶN]' : ''} ${raw.kind} – ${u}${extra}`);
  }
  trackViewer(raw);
  toAdmins({ type: 'raw', event: raw, blocked });
  if (blocked) return;

  // bình luận luôn chuyển cho game để hiện lên (kể cả khi không khớp lệnh nào)
  if (raw.kind === 'chat' && raw.text) toGames({ type: 'chat', user: raw.user, text: String(raw.text).slice(0, 200), ts: Date.now() });
  // thả tim chưa đủ mốc thì không thành hành động, nhưng vẫn báo game là người này còn trong live (để tính điểm thời gian)
  // kèm số tim của lần này: game đếm dồn để cho người đủ N tim (seatLikes) vào chùa ngồi
  if (raw.kind === 'like') toGames({ type: 'seen', user: raw.user, count: raw.count || 1 });

  // quy đổi 1 lần cho mỗi game (bộ đếm tim/bình luận nằm trong mapper)
  const byGame = new Map();
  for (const c of clients) {
    if (!c.game || c.role === 'admin') continue;
    if (!byGame.has(c.game)) byGame.set(c.game, mapper.map(c.game, raw).map(e => ({ ...e, id: ++seq })));
    for (const e of byGame.get(c.game)) send(c, e);
  }
}

function injectRaw(raw) {
  const kinds = ['gift', 'like', 'chat', 'join', 'follow', 'share'];
  if (!raw || !kinds.includes(raw.kind)) throw new Error('kind phải là một trong: ' + kinds.join(', '));
  const u = raw.user || {};
  const id = String(u.id || u.uniqueId || u.nickname || 'sim');
  dispatch({
    ...raw,
    simulated: true,
    count: Number(raw.count || 1),
    diamonds: Number(raw.diamonds || 0),
    // sim: game biết đây là người giả lập, không lưu điểm của họ vào bảng xếp hạng thật
    user: { id, uniqueId: String(u.uniqueId || id), nickname: String(u.nickname || id), avatar: String(u.avatar || ''), sim: true },
  });
}

tiktok.on('event', dispatch);
tiktok.on('status', s => {
  console.log('[tiktok]', s.state, s.username || '', s.message || '');
  if (s.state !== 'connected') room = { viewers: 0 };
  broadcast({ type: 'status', tiktok: s, room });
});
tiktok.on('room', r => { room = r; broadcast({ type: 'room', room }); });

/* ---------------- Quản trị ---------------- */
function listGames() {
  let dirs = [];
  try { dirs = fs.readdirSync(GAMES_DIR, { withFileTypes: true }).filter(d => d.isDirectory()).map(d => d.name); } catch (_) { /* chưa có game */ }
  return dirs.map(id => {
    const m = mapper.get(id);
    return {
      id, description: (m && m.description) || '', hasMapping: !!m,
      config: settings.game(id, m),
      rules: m ? editable(m) : null,   // gói quà → hành động, trang quản trị sửa rồi gửi "mapping.save"
      connected: [...clients].filter(c => c.game === id && c.role === 'game').length,
      media: listMedia(GAMES_DIR, id),
      backgrounds: listBackgrounds(GAMES_DIR, id),   // ảnh nền bg*.webp để chọn cho "Đổi nền theo số người xem"
    };
  });
}
function adminState() {
  const t = settings.data.tiktok;
  return {
    type: 'state',
    tiktok: { status: tiktok.status, username: t.username, autoConnect: t.autoConnect, hasSignKey: !!t.signApiKey },
    room, games: listGames(), blocked: settings.data.blocked, viewers: viewerList(),
  };
}
const pushAdminState = () => toAdmins(adminState());

function onAdmin(c, m) {
  switch (m.type) {
    case 'admin.state': send(c, adminState()); break;
    case 'tiktok.connect': {
      settings.setTiktok({ username: m.username, autoConnect: m.autoConnect, signApiKey: m.signApiKey || undefined });
      const t = settings.data.tiktok;
      if (t.username) tiktok.start(t.username, t.signApiKey);
      pushAdminState();
      break;
    }
    case 'tiktok.disconnect': tiktok.stop(); pushAdminState(); break;
    case 'tiktok.settings': settings.setTiktok(m); pushAdminState(); break;
    case 'block':
      settings.block(m.user);
      toGames({ type: 'block', user: m.user });   // game cho nhân vật người này rời đi
      viewersDirty = true; pushAdminState();
      break;
    case 'unblock': settings.unblock(m.key, m.uniqueId); viewersDirty = true; pushAdminState(); break;
    case 'game.config': {
      if (!/^[\w-]+$/.test(m.game || '')) return;
      const ignored = settings.setGame(m.game, m.config || {});
      // "Lưu làm mặc định": ghi cấu hình vừa lưu vào "defaults" của file mapping (game dùng làm gốc từ nay)
      if (m.asDefault) {
        try { mapper.saveDefaults(m.game, settings.data.games[m.game]); }
        catch (e) { send(c, { type: 'game.saved', game: m.game, ignored, asDefault: true, error: e.message }); break; }
      }
      const cfg = settings.game(m.game, mapper.get(m.game));
      broadcast({ type: 'config', config: cfg }, x => x.game === m.game && x.role === 'game');
      send(c, { type: 'game.saved', game: m.game, ignored, asDefault: !!m.asDefault });   // báo lại cho trang quản trị: đã lưu vào settings.json
      pushAdminState();
      break;
    }
    case 'mapping.save': {      // lưu gói quà vào config/mappings/<game>.json; game và giả lập nhận luật mới ngay
      if (!/^[\w-]+$/.test(m.game || '')) return;
      try {
        mapper.save(m.game, m.rules || {});
        broadcast({ type: 'mapping', game: m.game, mapping: mapper.get(m.game) }, x => x.game === m.game && x.role !== 'admin');
        send(c, { type: 'mapping.saved', game: m.game });
      } catch (e) {
        send(c, { type: 'mapping.saved', game: m.game, error: e.message });
      }
      pushAdminState();
      break;
    }
    case 'game.reset-scores':   // xoá bảng điểm (game tự lưu điểm trong trình duyệt)
      if (!/^[\w-]+$/.test(m.game || '')) return;
      broadcast({ type: 'reset-scores' }, x => x.game === m.game && x.role === 'game');
      break;
  }
}

/* ---------------- HTTP ---------------- */
function json(res, data, code = 200) {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(data));
}
function readBody(req, limit = 64 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on('data', c => { size += c.length; if (size > limit) { reject(new Error('Body quá lớn')); req.destroy(); } else chunks.push(c); });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  try {
    if (url.pathname === '/') { res.writeHead(302, { Location: '/LiveBridge/public/admin.html' }); return res.end(); }
    if (url.pathname === '/api/games') return json(res, mapper.list());
    if (url.pathname === '/api/status') return json(res, { tiktok: tiktok.status, room, clients: clients.size });
    if (url.pathname === '/api/simulate' && req.method === 'POST') {
      try { injectRaw(JSON.parse(await readBody(req))); return json(res, { ok: true }); }
      catch (e) { return json(res, { ok: false, error: e.message }, 400); }
    }
    if (url.pathname === '/api/media') return json(res, listMedia(GAMES_DIR, url.searchParams.get('game')));
    serveStatic(ROOT, ['/Games/', '/LiveBridge/public/'], url.pathname, res, req);
  } catch (e) {
    console.error(e);
    if (!res.headersSent) json(res, { ok: false, error: 'Lỗi máy chủ' }, 500);
  }
});

/* ---------------- WebSocket ---------------- */
const wss = new WebSocketServer({ server, maxPayload: 64 * 1024 });
wss.on('connection', (ws, req) => {
  const url = new URL(req.url, 'http://localhost');
  const c = { ws, game: url.searchParams.get('game') || null, role: url.searchParams.get('role') || 'game' };
  clients.add(c);
  console.log(`[ws] + ${c.role} ${c.game || ''} (tổng ${clients.size})`);
  if (c.game && c.role !== 'admin') sendHello(c);
  send(c, { type: 'status', tiktok: tiktok.status, room });
  if (c.role === 'admin') send(c, adminState());
  else pushAdminState();

  ws.on('message', buf => {
    let m;
    try { m = JSON.parse(buf); } catch (_) { return; }
    if (m.type === 'hello') { c.game = m.game || c.game; c.role = m.role || c.role; sendHello(c); return; }
    if (m.type === 'simulate') { try { injectRaw(m.event); } catch (e) { send(c, { type: 'error', message: e.message }); } return; }
    if (c.role === 'admin' || c.role === 'monitor') onAdmin(c, m);
  });
  ws.on('close', () => {
    clients.delete(c);
    console.log(`[ws] - ${c.role} ${c.game || ''} (tổng ${clients.size})`);
    pushAdminState();
  });
});

function sendHello(c) {
  const mapping = mapper.get(c.game);
  if (!mapping) console.warn(`[ws] game "${c.game}" chưa có file config/mappings/${c.game}.json`);
  send(c, { type: 'hello', game: c.game, mapping, config: settings.game(c.game, mapping), blocked: settings.data.blocked });
}

server.listen(config.port, config.host, () => {
  const base = `http://${config.host === '0.0.0.0' ? 'localhost' : config.host}:${config.port}`;
  console.log(`LiveBridge chạy tại ${base}`);
  console.log(`  Trang quản trị:   ${base}/`);
  console.log(`  Giả lập tặng quà: ${base}/LiveBridge/public/simulator.html`);
  const t = settings.data.tiktok;
  const user = config.cliUser || (t.autoConnect ? t.username : '');
  if (user) tiktok.start(user, t.signApiKey);
  else console.log('  Mở trang quản trị để nhập tài khoản TikTok đang LIVE và bấm Kết nối.');
});
