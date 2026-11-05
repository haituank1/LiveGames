'use strict';
/* cap-nhat.js — tool cập nhật TestGameAI cho người nhận (không cần git, không cần tải lại toàn bộ).
   Chạy bằng: cap-nhat.bat  (chỉ chạy khi LiveBridge đang TẮT)
   Mở giao diện nhỏ tại http://127.0.0.1:8790/ : hiện phiên bản đang dùng và phiên bản mới
   nhất trên GitHub, nếu có mới hơn thì hiện nút Cập nhật. Bấm nút là chỉ tải những
   file đã đổi (kèm file đã xóa), kiểm tra mã băm rồi mới chép đè.
   Chỉ dùng module có sẵn của Node.js (http/https/fs/crypto/net/path), không cần npm install.

   Cách dùng khi test: node tools/cap-nhat.js --root=<thư mục cần cập nhật> --port=8799
*/
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const net = require('net');
const { execFile } = require('child_process');

const REPO_OWNER = 'haituank1';
const REPO_NAME = 'LiveGames';
const BRANCH = 'main';
const DEFAULT_PORT = 8790;

/* File/thư mục KHÔNG bao giờ tải/xóa qua updater (cài đặt riêng, dữ liệu người dùng,
   file chạy, hoặc file chỉ dành cho người đóng gói). So khớp với dong-goi.ps1. */
const EXCLUDED_DIRS = ['.git/', 'dist/', 'runtime/', 'node_modules/', 'LiveBridge/voice-cache/'];
const EXCLUDED_FILES = new Set([
  'LiveBridge/config/settings.json', // tài khoản TikTok + cài đặt riêng của người nhận
  'LiveBridge/config/settings.json.tmp',
  'dong-goi.bat', 'HANDOFF.md', '.gitignore',
  'tools/dong-goi.ps1', 'tools/make-sfx.mjs',
]);
/* File của chính updater đang chạy: tải về nhưng chỉ chép đè SAU khi đã trả kết quả
   (tránh ghi đè file .bat/.js đang chạy trên Windows), rồi thoát để người dùng chạy lại. */
const SELF_FILES = new Set(['cap-nhat.bat', 'tools/cap-nhat.js']);

const args = process.argv.slice(2);
const argVal = name => {
  const a = args.find(x => x.startsWith(`--${name}=`));
  return a ? a.slice(name.length + 3) : null;
};
const ROOT = path.resolve(argVal('root') || path.join(__dirname, '..'));
/* Cổng LiveBridge cần kiểm tra (mặc định 8787; đổi bằng --live-port khi chạy LiveBridge
   ở cổng khác, vd. start-livebridge.bat với --port=8788). */
const LIVEBRIDGE_PORT = Number(argVal('live-port') || 8787);
const STAGING = path.join(ROOT, '.cap-nhat-tmp');
const UA = 'LiveGames-Updater (cap-nhat.js)';

/* ---------------- tiện ích ---------------- */
function fmtBytes(n) {
  if (n == null) return '—';
  if (n < 1024) return n + ' B';
  if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB';
  return (n / (1024 * 1024)).toFixed(1) + ' MB';
}
function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function isExcluded(p) {
  const norm = p.replace(/\\/g, '/');
  if (EXCLUDED_FILES.has(norm)) return true;
  return EXCLUDED_DIRS.some(d => norm === d.slice(0, -1) || norm.startsWith(d));
}
/* Chặn path traversal: file từ GitHub chỉ được nằm trong thư mục gốc. */
function safeJoin(rel) {
  const dest = path.resolve(ROOT, rel);
  if (dest !== ROOT && !dest.startsWith(ROOT + path.sep)) throw new Error('Đường dẫn không hợp lệ: ' + rel);
  return dest;
}
function gitBlobSha(buf) {
  return crypto.createHash('sha1')
    .update(Buffer.concat([Buffer.from(`blob ${buf.length}\0`, 'utf8'), buf]))
    .digest('hex');
}
function readJsonFile(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch (_) { return null; }
}
function localVersion() {
  const v = readJsonFile(path.join(ROOT, 'version.json'));
  if (v && v.commit) return { commit: v.commit, short: String(v.commit).slice(0, 7), date: v.date || '', message: v.message || '' };
  return null;
}
function localManifest() {
  const m = readJsonFile(path.join(ROOT, 'manifest.json'));
  if (m && Array.isArray(m.files)) return m;
  return null;
}

/* ---------------- gọi GitHub (https, có theo redirect, có timeout) ---------------- */
function fetchBuffer(url, timeoutMs = 30000) {
  return new Promise((resolve, reject) => {
    const doGet = (u, hops) => {
      if (hops > 5) return reject(new Error('Chuyển hướng quá nhiều lần'));
      const req = https.get(u, { headers: { 'User-Agent': UA, Accept: 'application/vnd.github+json' } }, res => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          res.resume();
          return doGet(res.headers.location, hops + 1);
        }
        if (res.statusCode !== 200) {
          let body = '';
          res.on('data', c => { body += c; });
          res.on('end', () => reject(new Error(`GitHub trả ${res.statusCode}: ${body.slice(0, 200)}`)));
          return;
        }
        const chunks = [];
        res.on('data', c => chunks.push(c));
        res.on('end', () => resolve(Buffer.concat(chunks)));
        res.on('error', reject);
      });
      req.setTimeout(timeoutMs, () => req.destroy(new Error('Hết thời gian chờ GitHub (' + timeoutMs / 1000 + 's)')));
      req.on('error', reject);
    };
    doGet(url, 0);
  });
}
async function fetchJson(url, timeoutMs = 15000) {
  const buf = await fetchBuffer(url, timeoutMs);
  return JSON.parse(buf.toString('utf8'));
}
const api = p => `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}${p}`;
const rawUrl = (sha, filePath) => 'https://raw.githubusercontent.com/'
  + `${REPO_OWNER}/${REPO_NAME}/${sha}/`
  + filePath.split('/').map(encodeURIComponent).join('/');

/* LiveBridge có đang chạy không? Thử nối tới cổng 8787 (chỉ nối, không gửi gì). */
function liveBridgeRunning() {
  return new Promise(resolve => {
    const sock = net.createConnection({ host: '127.0.0.1', port: LIVEBRIDGE_PORT, timeout: 700 });
    sock.once('connect', () => { sock.destroy(); resolve(true); });
    sock.once('timeout', () => { sock.destroy(); resolve(false); });
    sock.once('error', () => resolve(false));
  });
}

/* ---------------- kiểm tra bản mới ---------------- */
let lastCheck = null; // { at, result } — dùng lại cho bước cập nhật nếu còn mới (< 10 phút)
let progress = { state: 'idle', done: 0, total: 0, current: '', message: '', result: null };

/* So toàn bộ cây file của bản mới với file trên máy (dùng khi không biết bản local,
   hoặc khi GitHub cắt ngắn kết quả compare vì đổi quá 300 file). Chỉ thêm/sửa file
   đổi; file đã xóa chỉ xác định được khi có manifest.json local. */
async function diffViaTrees(remote) {
  const tree = await fetchJson(api(`/git/trees/${remote.commit}?recursive=1`));
  const changed = [];
  const removed = [];
  let note = '';
  for (const t of tree.tree || []) {
    if (t.type !== 'blob' || isExcluded(t.path)) continue;
    let same = false;
    try { same = gitBlobSha(fs.readFileSync(safeJoin(t.path))) === t.sha; } catch (_) { same = false; }
    if (!same) changed.push({ path: t.path, status: 'modified', sha: t.sha, size: t.size || 0 });
  }
  const manifest = localManifest();
  if (manifest) {
    const remotePaths = new Set((tree.tree || []).map(t => t.path));
    for (const f of manifest.files) {
      if (!isExcluded(f.path) && !remotePaths.has(f.path)) removed.push({ path: f.path, sha: f.sha });
    }
  } else {
    note = 'Bản đang dùng chưa có version.json nên không xác định được file nào đã bị xóa ở bản mới — updater chỉ thêm/sửa, không xóa file lạ (nhạc/ảnh của bạn được giữ nguyên).';
  }
  return { changed, removed, note };
}

async function checkForUpdate() {
  const live = await liveBridgeRunning();
  const local = localVersion();
  const remoteCommit = await fetchJson(api('/commits/' + BRANCH));
  const remote = {
    commit: remoteCommit.sha,
    short: String(remoteCommit.sha).slice(0, 7),
    date: (remoteCommit.commit && remoteCommit.commit.committer && remoteCommit.commit.committer.date) || '',
    message: ((remoteCommit.commit && remoteCommit.commit.message) || '').split('\n')[0],
  };
  let changed = [];
  let removed = [];
  let note = '';

  if (local && local.commit === remote.commit) {
    // Đã là bản mới nhất: không cần gọi thêm API.
  } else if (local && local.commit) {
    // Biết bản đang dùng -> hỏi GitHub đúng những file đổi giữa 2 commit.
    const cmp = await fetchJson(api(`/compare/${local.commit}...${remote.commit}`));
    if (cmp.truncated) {
      // Đổi quá 300 file, GitHub cắt ngắn danh sách -> so toàn bộ cây file cho chắc.
      ({ changed, removed, note } = await diffViaTrees(remote));
    } else {
      const tree = await fetchJson(api(`/git/trees/${remote.commit}?recursive=1`));
      const sizeByPath = new Map();
      for (const t of tree.tree || []) if (t.type === 'blob') sizeByPath.set(t.path, t.size || 0);
      for (const f of cmp.files || []) {
        if (isExcluded(f.filename)) continue;
        if (f.status === 'removed') removed.push({ path: f.filename, sha: f.sha });
        else changed.push({ path: f.filename, status: f.status, sha: f.sha, size: sizeByPath.get(f.filename) ?? null });
      }
    }
  } else {
    // Bản cũ chưa có version.json (zip gửi trước khi có updater) -> so toàn bộ cây file.
    ({ changed, removed, note } = await diffViaTrees(remote));
  }

  const totalBytes = changed.reduce((s, f) => s + (f.size || 0), 0);
  const result = {
    liveBridgeRunning: live, local, remote,
    upToDate: !!local && local.commit === remote.commit,
    changed, removed, totalBytes, note,
    checkedAt: new Date().toISOString(),
  };
  lastCheck = { at: Date.now(), result };
  return result;
}

/* ---------------- cập nhật ---------------- */
function cleanStaging() {
  try { fs.rmSync(STAGING, { recursive: true, force: true }); } catch (_) { /* bỏ qua */ }
}

async function doUpdate() {
  if (progress.state === 'updating') throw new Error('Đang cập nhật rồi, chờ xong đã.');
  const live = await liveBridgeRunning();
  if (live) {
    const e = new Error('LiveBridge đang chạy — tắt cửa sổ đen của LiveBridge rồi bấm Cập nhật lại.');
    e.code = 'LIVE_RUNNING';
    throw e;
  }
  let check = lastCheck && Date.now() - lastCheck.at < 10 * 60 * 1000 ? lastCheck.result : null;
  if (!check) check = await checkForUpdate();
  if (check.liveBridgeRunning) {
    const e = new Error('LiveBridge đang chạy — tắt cửa sổ đen của LiveBridge rồi bấm Cập nhật lại.');
    e.code = 'LIVE_RUNNING';
    throw e;
  }
  if (check.upToDate) return { already: true, updated: [], removed: [], bytes: 0, remote: check.remote };

  const normal = check.changed.filter(f => !SELF_FILES.has(f.path));
  const selfFiles = check.changed.filter(f => SELF_FILES.has(f.path));
  const removed = check.removed;
  progress = { state: 'updating', done: 0, total: normal.length + selfFiles.length + removed.length, current: '', message: 'Đang tải file đã đổi…', result: null };

  cleanStaging();
  fs.mkdirSync(STAGING, { recursive: true });
  let bytes = 0;
  try {
    // 1) Tải TẤT CẢ về thư mục tạm + kiểm tra mã băm trước khi động vào file thật.
    const all = [...normal, ...selfFiles];
    for (let i = 0; i < all.length; i++) {
      const f = all[i];
      progress.current = f.path;
      progress.message = `Đang tải ${i + 1}/${all.length}: ${f.path}`;
      const buf = await fetchBuffer(rawUrl(check.remote.commit, f.path), 60000);
      if (gitBlobSha(buf) !== f.sha) throw new Error(`File ${f.path} tải về không khớp mã băm — dừng lại, chưa đổi file nào.`);
      const dest = path.join(STAGING, f.path);
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.writeFileSync(dest, buf);
      bytes += buf.length;
      progress.done = i + 1;
    }
    // 2) Tải xong + kiểm tra xong mới chép đè file thật.
    for (const f of normal) {
      const dest = safeJoin(f.path);
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.renameSync(path.join(STAGING, f.path), dest);
    }
    for (const r of removed) {
      try { fs.rmSync(safeJoin(r.path), { force: true }); } catch (_) { /* file đã không còn: bỏ qua */ }
      progress.done += 1;
    }
    // 3) Ghi phiên bản + manifest mới (dùng cây file từ GitHub để lần sau biết file nào đã xóa).
    const tree = await fetchJson(api(`/git/trees/${check.remote.commit}?recursive=1`));
    const files = (tree.tree || [])
      .filter(t => t.type === 'blob')
      .map(t => ({ path: t.path, sha: t.sha, size: t.size || 0 }))
      .sort((a, b) => (a.path < b.path ? -1 : 1));
    fs.writeFileSync(path.join(ROOT, 'version.json'),
      JSON.stringify({ commit: check.remote.commit, short: check.remote.short, date: check.remote.date, message: check.remote.message, updatedAt: new Date().toISOString() }, null, 2) + '\n', 'utf8');
    fs.writeFileSync(path.join(ROOT, 'manifest.json'),
      JSON.stringify({ commit: check.remote.commit, short: check.remote.short, generatedAt: new Date().toISOString(), files }, null, 2) + '\n', 'utf8');
    lastCheck = null; // bản local đã đổi -> lần kiểm tra sau phải đọc lại
  } catch (e) {
    cleanStaging();
    progress = { state: 'error', done: 0, total: 0, current: '', message: e.message || String(e), result: null };
    throw e;
  }
  cleanStaging();
  const result = {
    already: false,
    updated: normal.map(f => f.path),
    removed: removed.map(r => r.path),
    bytes, remote: check.remote,
    selfPending: selfFiles.map(f => f.path),
  };
  progress = { state: 'done', done: progress.total, total: progress.total, current: '', message: 'Xong.', result };

  // File của chính updater có bản mới: chép đè sau khi đã trả kết quả rồi thoát,
  // để lần chạy sau dùng bản updater mới. Ghi đè thất bại (vd. Windows khóa file .bat
  // đang chạy) thì updater cũ vẫn dùng được, chỉ báo cho người dùng biết.
  if (selfFiles.length) {
    setTimeout(() => {
      try {
        for (const f of selfFiles) {
          const staged = path.join(STAGING, f.path);
          if (!fs.existsSync(staged)) continue;
          const dest = safeJoin(f.path);
          fs.mkdirSync(path.dirname(dest), { recursive: true });
          fs.renameSync(staged, dest);
        }
        console.log('[cap-nhat] Da cap nhat file updater, chay lai cap-nhat.bat de dung ban moi.');
      } catch (e) {
        console.log('[cap-nhat] Khong ghi de duoc file updater dang chay (' + e.message + ') — updater cu van dung duoc.');
      }
      try { fs.rmSync(STAGING, { recursive: true, force: true }); } catch (_) { /* bỏ qua */ }
      process.exit(0);
    }, 600);
  }
  return result;
}

/* ---------------- giao diện web ---------------- */
const PAGE = `<!doctype html>
<html lang="vi"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Cập nhật TestGameAI</title>
<style>
body{margin:0;background:#16110d;color:#f3e6d3;font:15px/1.55 system-ui,"Segoe UI",sans-serif}
main{max-width:680px;margin:0 auto;padding:20px 16px 40px}
h1{font-size:20px;color:#e0a63c;margin:0 0 4px}.muted{color:#a8927a;font-size:13px}
.card{background:#211913;border:1px solid #3a2d22;border-radius:12px;padding:14px;margin-top:12px}
.warn{background:#4a1d18;border-color:#8a1f1f}
.ok{background:#17301f;border-color:#2e9d55}
.row{display:flex;gap:10px;flex-wrap:wrap;margin-top:12px}
button{background:#3a2a1e;color:#f3e6d3;border:1px solid #5a4330;border-radius:8px;padding:10px 16px;cursor:pointer;font:inherit}
button:hover{border-color:#e0a63c}
button.pri{background:#d2342c;border-color:#ef6a60}
button:disabled{opacity:.45;cursor:not-allowed}
.ver{font-size:13px}.ver b{color:#e0a63c}
ul.files{max-height:220px;overflow:auto;margin:8px 0 0;padding-left:20px;font-size:13px}
ul.files li{padding:2px 0;word-break:break-all}
.bar{height:10px;background:#120d0a;border:1px solid #3a2d22;border-radius:6px;overflow:hidden;margin-top:8px}
.bar i{display:block;height:100%;background:#e0a63c;width:0%}
#log{white-space:pre-wrap;font-size:13px;color:#e8d6be;margin-top:8px}
.tag{display:inline-block;font-size:12px;padding:2px 10px;border-radius:999px;background:#3a3a3a}
.tag.ok{background:#2e9d55}.tag.warn{background:#8a6514}.tag.err{background:#8a1f1f}
</style></head><body><main>
<h1>🔄 Cập nhật TestGameAI</h1>
<div class="muted">Chỉ chạy file này khi <b>LiveBridge đang TẮT</b> (đã đóng cửa sổ đen). Cập nhật xong thì bấm đúp <b>start-livebridge.bat</b> để chạy bản mới.</div>
<div id="liveBox"></div>
<div class="card"><div class="row" style="margin-top:0">
<div class="ver" style="flex:1"><div class="muted">Bản đang dùng</div><b id="localVer">—</b><div id="localMsg" class="muted"></div></div>
<div class="ver" style="flex:1"><div class="muted">Bản mới nhất trên GitHub</div><b id="remoteVer">—</b><div id="remoteMsg" class="muted"></div></div>
</div><div id="status" style="margin-top:10px"></div><div id="fileBox"></div>
<div class="row"><button id="btnCheck">🔍 Kiểm tra cập nhật</button>
<button id="btnUpdate" class="pri" disabled>Cập nhật ngay</button></div>
<div class="bar" id="barWrap" hidden><i id="bar"></i></div><div id="log"></div></div>
<div class="card muted">Giữ nguyên cài đặt riêng của bạn (tài khoản TikTok, danh sách chặn trong <span style="font-family:monospace">settings.json</span>), nhạc/ảnh bạn tự thêm, <span style="font-family:monospace">runtime/</span> và <span style="font-family:monospace">node_modules/</span>. Chỉ tải những file đã đổi, kiểm tra mã băm rồi mới chép đè.</div>
</main>
<script>
const $=id=>document.getElementById(id);
const fmt=n=>n<1024?n+' B':n<1048576?(n/1024).toFixed(1)+' KB':(n/1048576).toFixed(1)+' MB';
let check=null, timer=null;
function setLog(t){$('log').textContent=t;}
async function doCheck(){
  $('btnCheck').disabled=true; setLog('Đang kiểm tra bản mới trên GitHub…');
  try{
    const r=await fetch('/api/check'); const d=await r.json();
    if(!r.ok) throw new Error(d.error||('Lỗi '+r.status));
    check=d; render();
    setLog(d.upToDate?'Đã là bản mới nhất.':('Có bản mới: '+d.changed.length+' file đổi, '+d.removed.length+' file xóa, khoảng '+fmt(d.totalBytes)+'.'));
  }catch(e){ setLog('Không kiểm tra được: '+e.message+' — kiểm tra mạng rồi bấm Kiểm tra lại.'); }
  $('btnCheck').disabled=false;
}
function render(){
  $('localVer').textContent=check.local?check.local.short+' ('+(check.local.date||'').slice(0,10)+')':'không rõ (bản zip cũ, chưa có version.json)';
  $('localMsg').textContent=check.local?check.local.message:'';
  $('remoteVer').textContent=check.remote.short+' ('+(check.remote.date||'').slice(0,10)+')';
  $('remoteMsg').textContent=check.remote.message;
  const lb=$('liveBox');
  if(check.liveBridgeRunning){
    lb.innerHTML=''; const d=document.createElement('div'); d.className='card warn';
    d.textContent='⚠ LiveBridge ĐANG CHẠY — tắt cửa sổ đen của LiveBridge rồi bấm Kiểm tra lại. Không cập nhật khi LiveBridge đang chạy.'; lb.append(d);
  } else lb.innerHTML='';
  const st=$('status');
  if(check.upToDate){ st.innerHTML='<span class="tag ok">Đã là bản mới nhất ✓</span>'; $('fileBox').innerHTML=''; }
  else{
    st.innerHTML='<span class="tag warn">Có bản mới</span> '+check.changed.length+' file đổi · '+check.removed.length+' file xóa · khoảng '+fmt(check.totalBytes);
    const box=$('fileBox'); box.innerHTML='';
    const ul=document.createElement('ul'); ul.className='files';
    for(const f of check.changed){ const li=document.createElement('li'); li.textContent='✎ '+f.path+(f.size?' ('+fmt(f.size)+')':''); ul.append(li); }
    for(const f of check.removed){ const li=document.createElement('li'); li.textContent='✕ '+f.path+' (xóa)'; ul.append(li); }
    box.append(ul);
    if(check.note){ const p=document.createElement('div'); p.className='muted'; p.textContent=check.note; box.append(p); }
  }
  $('btnUpdate').disabled=check.upToDate||check.liveBridgeRunning||!check.changed.length&&!check.removed.length;
}
async function doUpdate(){
  if(!check) return;
  $('btnUpdate').disabled=true; $('btnCheck').disabled=true;
  $('barWrap').hidden=false; $('bar').style.width='0%';
  setLog('Đang cập nhật… đừng tắt cửa sổ này.');
  timer=setInterval(async()=>{
    try{ const p=await (await fetch('/api/progress')).json();
      if(p.total>0) $('bar').style.width=Math.round(100*p.done/p.total)+'%';
      if(p.current) setLog('Đang tải: '+p.current);
      if(p.state==='done'||p.state==='error'){ clearInterval(timer); showDone(p); }
    }catch(e){/* chờ lần sau */}
  },500);
  try{
    const r=await fetch('/api/update',{method:'POST'}); const d=await r.json();
    if(!r.ok) throw new Error(d.error||('Lỗi '+r.status));
    clearInterval(timer);
    showDone({state:'done',result:d});
  }catch(e){ clearInterval(timer); setLog('Cập nhật lỗi: '+e.message+' — file cũ vẫn nguyên, bấm Cập nhật lại để thử tiếp.'); $('btnCheck').disabled=false; }
}
function showDone(p){
  $('btnCheck').disabled=false;
  if(p.state==='error'){ setLog('Cập nhật lỗi: '+p.message); return; }
  const d=p.result||{};
  if(d.already){ setLog('Đã là bản mới nhất.'); return; }
  let t='✅ Cập nhật xong!\n• Đã đổi: '+d.updated.length+' file'+(d.bytes?' ('+fmt(d.bytes)+')':'')+'\n• Đã xóa: '+d.removed.length+' file\n• Bản mới: '+(d.remote?d.remote.short:'');
  if(d.selfPending&&d.selfPending.length) t+='\n• File updater cũng có bản mới — đóng cửa sổ này rồi chạy lại cap-nhat.bat để dùng bản mới.';
  t+='\n\nTắt cửa sổ này, bấm đúp start-livebridge.bat để chạy bản mới.';
  setLog(t); $('bar').style.width='100%';
  check=null; $('btnUpdate').disabled=true; $('fileBox').innerHTML=''; $('status').innerHTML='<span class="tag ok">Đã cập nhật ✓</span>';
}
$('btnCheck').onclick=doCheck; $('btnUpdate').onclick=doUpdate;
doCheck();
</script></body></html>`;

function json(res, data, code = 200) {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(data));
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://127.0.0.1');
    if (url.pathname === '/') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(PAGE);
    }
    if (url.pathname === '/api/check' && req.method === 'GET') {
      try {
        const result = await checkForUpdate();
        return json(res, result);
      } catch (e) {
        return json(res, { error: e.message || String(e) }, 502);
      }
    }
    if (url.pathname === '/api/progress' && req.method === 'GET') return json(res, progress);
    if (url.pathname === '/api/update' && req.method === 'POST') {
      try {
        const result = await doUpdate();
        return json(res, result);
      } catch (e) {
        return json(res, { error: e.message || String(e) }, e.code === 'LIVE_RUNNING' ? 409 : 500);
      }
    }
    return json(res, { error: 'Không có trang này' }, 404);
  } catch (e) {
    if (!res.headersSent) json(res, { error: 'Lỗi máy chủ' }, 500);
  }
});

cleanStaging();
let port = Number(argVal('port') || DEFAULT_PORT);
function listen(p) {
  server.listen(p, '127.0.0.1', () => {
    const url = `http://127.0.0.1:${p}/`;
    console.log('Cap nhat TestGameAI: ' + url);
    console.log('  Chi chay khi LiveBridge dang TAT. Cap nhat xong thi dong cua so nay, mo start-livebridge.bat.');
    if (process.platform === 'win32') {
      execFile('cmd', ['/c', 'start', '', url], () => { /* trình duyệt đã mở (hoặc người dùng tự mở link trên) */ });
    }
  });
  server.once('error', err => {
    if (err.code === 'EADDRINUSE' && p < DEFAULT_PORT + 10) {
      console.log(`Cong ${p} da co nguoi dung, thu cong ${p + 1}...`);
      listen(p + 1);
    } else {
      console.error('Khong mo duoc cong: ' + err.message);
      process.exit(1);
    }
  });
}
listen(port);
