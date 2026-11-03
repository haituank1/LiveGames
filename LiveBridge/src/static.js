'use strict';
/* Phục vụ file tĩnh, chỉ trong các thư mục được phép (Games/ và LiveBridge/public/).
   Hỗ trợ HTTP Range để nhạc / video lớn phát trực tiếp và tua được, không phải tải hết file. */
const fs = require('fs');
const path = require('path');

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.txt': 'text/plain; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.svg': 'image/svg+xml',
  '.mp3': 'audio/mpeg', '.m4a': 'audio/mp4', '.aac': 'audio/aac', '.ogg': 'audio/ogg', '.oga': 'audio/ogg', '.opus': 'audio/ogg',
  '.wav': 'audio/wav', '.flac': 'audio/flac', '.weba': 'audio/webm', '.webm': 'video/webm', '.mp4': 'video/mp4',
  '.glb': 'model/gltf-binary', '.gltf': 'model/gltf+json',
};

function notFound(res) { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); res.end('Không tìm thấy'); }

function serveStatic(root, allowed, pathname, res, req) {
  let p;
  try { p = decodeURIComponent(pathname); } catch (_) { return notFound(res); }
  if (!allowed.some(a => p.startsWith(a))) return notFound(res);
  const file = path.normalize(path.join(root, p));
  if (!file.startsWith(root + path.sep)) return notFound(res);
  fs.stat(file, (err, st) => {
    if (err) return notFound(res);
    if (st.isDirectory()) {
      if (!pathname.endsWith('/')) { res.writeHead(301, { Location: pathname + '/' }); return res.end(); }
      return serveStatic(root, allowed, pathname + 'index.html', res, req);
    }
    const headers = {
      'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-cache',
      'Accept-Ranges': 'bytes',
    };
    const m = req && /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || '');
    if (m && (m[1] || m[2])) {
      let start = m[1] ? Number(m[1]) : Math.max(0, st.size - Number(m[2]));
      let end = m[1] && m[2] ? Math.min(Number(m[2]), st.size - 1) : st.size - 1;
      if (start >= st.size || start > end) {
        res.writeHead(416, { 'Content-Range': `bytes */${st.size}` });
        return res.end();
      }
      res.writeHead(206, { ...headers, 'Content-Range': `bytes ${start}-${end}/${st.size}`, 'Content-Length': end - start + 1 });
      return fs.createReadStream(file, { start, end }).pipe(res);
    }
    res.writeHead(200, { ...headers, 'Content-Length': st.size });
    fs.createReadStream(file).pipe(res);
  });
}

/* File âm thanh trong Games/<game>/audio: nhạc nền (mọi file) + tiếng hiệu ứng (theo tên cố định, đuôi gì cũng được) */
const AUDIO_EXT = new Set(['.mp3', '.m4a', '.aac', '.ogg', '.oga', '.opus', '.wav', '.flac', '.weba']);
const SFX_NAMES = { niem: 'chant', chuong: 'bell', 'chuong-lon': 'bigbell', mo: 'mo' };
function listMedia(gamesDir, game) {
  const out = { music: [], sfx: {} };
  if (!/^[\w-]+$/.test(game || '')) return out;
  let files = [];
  try { files = fs.readdirSync(path.join(gamesDir, game, 'audio')); } catch (_) { return out; }
  for (const f of files.sort((a, b) => a.localeCompare(b, 'vi'))) {
    const ext = path.extname(f).toLowerCase();
    if (!AUDIO_EXT.has(ext)) continue;
    const base = path.basename(f, ext).toLowerCase();
    if (SFX_NAMES[base]) out.sfx[SFX_NAMES[base]] = f;
    else out.music.push(f);
  }
  return out;
}

module.exports = { serveStatic, listMedia, listBackgrounds };

/* ảnh nền của game: mọi file bg*.webp trong Games/<game>/ (thêm file là hiện ở trang quản trị ngay lần làm mới sau) */
function listBackgrounds(gamesDir, game) {
  if (!/^[\w-]+$/.test(game || '')) return [];
  let files = [];
  try { files = fs.readdirSync(path.join(gamesDir, game)); } catch (_) { return []; }
  return files.filter(f => /^bg.*\.webp$/i.test(f)).sort((a, b) => a.localeCompare(b, 'en', { numeric: true }));
}
