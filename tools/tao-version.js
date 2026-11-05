'use strict';
/* tao-version.js — sinh version.json + manifest.json từ git cho bản đóng gói / bản push.
   Chạy:  node tools/tao-version.js            (từ thư mục gốc của repo)
   - version.json:  { commit, short, date, message } — bản hiện tại là commit nào.
   - manifest.json: { commit, files: [{ path, sha, size }] } — sha là git blob SHA-1
     của từng file đã commit (dùng để updater biết file nào đã bị xóa ở bản mới).
   Hai file này được commit lên git để máy người nhận so được với bản trên GitHub.
   Không cần mạng, chỉ cần git. */
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

function git(...args) {
  return execFileSync('git', ['-C', ROOT, ...args], { encoding: 'utf8' }).trim();
}

function main() {
  const commit = git('rev-parse', 'HEAD');
  const short = commit.slice(0, 7);
  // %cI = ngày commit (ISO), %s = tiêu đề commit; tách bằng \0 để tiêu đề có dấu vẫn an toàn.
  const log = execFileSync('git', ['-C', ROOT, 'log', '-1', '--format=%cI%x00%s'], { encoding: 'utf8' });
  const sep = log.indexOf('\0');
  const date = log.slice(0, sep).trim();
  const message = log.slice(sep + 1).trim().split('\n')[0];

  const version = { commit, short, date, message, generatedAt: new Date().toISOString() };
  fs.writeFileSync(path.join(ROOT, 'version.json'), JSON.stringify(version, null, 2) + '\n', 'utf8');

  // git ls-tree: mỗi dòng "100644 blob <sha>\t<path>" — lấy đúng blob SHA của bản commit.
  const tree = git('ls-tree', '-r', 'HEAD');
  const files = [];
  for (const line of tree.split('\n')) {
    if (!line.trim()) continue;
    const tab = line.indexOf('\t');
    const meta = line.slice(0, tab).split(' ');
    const sha = meta[2];
    const filePath = line.slice(tab + 1);
    let size = 0;
    try { size = fs.statSync(path.join(ROOT, filePath)).size; } catch (_) { /* file chưa checkout: giữ 0 */ }
    files.push({ path: filePath, sha, size });
  }
  files.sort((a, b) => (a.path < b.path ? -1 : 1));
  const manifest = { commit, short, generatedAt: version.generatedAt, files };
  fs.writeFileSync(path.join(ROOT, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n', 'utf8');

  console.log(`version.json + manifest.json: ${short} (${date}) — ${files.length} file, "${message}"`);
}

try {
  main();
} catch (e) {
  console.error('tao-version.js lỗi: ' + (e.message || e));
  process.exit(1);
}
