/* Hiệu ứng Lớp học chữ trên canvas phủ: sao vàng, pháo giấy, tim bay,
   pháo hoa, lấp lánh ambient. Rút gọn từ js/effects.js game đám cưới:
   giữ cùng vòng lặp rAF + chốt tab ẩn (dừng hẳn khi tab ẩn để hạt không
   tích rồi nổ dồn khi quay lại) + giới hạn 1400 hạt.
   LH-V4 (nv4): tia nắng + Oẳn tù tì, đối chiếu ảnh mẫu Giờ ra chơi:
   - Hạt bụi CHỈ bay trong vệt nắng xiên từ cửa sổ trái (dải chéo đo từ
     nền v17), nhỏ + mờ + trôi xuôi theo tia — trước đây bụi rải khắp
     màn hình (cả lên bảng/panel/học sinh) thành lớp mờ chung.
   - Lấp lánh ambient tránh dải bảng (y 0.14-0.34) để không nhấp nháy
     lên chữ phấn; vệt nắng có shimmer rất nhẹ (alpha đỉnh 0.05).
   - Oẳn tù tì: tay ✊ lắc 3 nhịp bay từ tay cô ra giữa bảng rồi bung
     thành tay cô ra (✊/✌️/✋) + sao; mỗi phiếu gõ búa/kéo/bao nổ 1 tay
     nhỏ ở đúng cột đó. effects.js KHÔNG sửa main.js nên tự bám bảng
     bằng MutationObserver trên #board (xem installRpsObserver); API
     công khai E.rpsReveal/E.rpsVote để main.js gọi trực tiếp khi cần.
     Vị trí tay KHÔNG hardcode theo layout v17: cột + dòng "Cô ra"
     được ĐO THẬT từ .rps-choice / #qDashes lúc chạy (nv3 đổi layout
     bảng ở LH-V3: "Cô ra" dời từ #qHint xuống #qDashes, ô chọn thu
     còn 22% — đo thật nên gộp nhánh nào cũng đúng chỗ).
   - Vệt nắng CHÉO QUA BẢNG là nét vẽ sẵn trong img/lop-hoc-bg.png
     (nv2 sở hữu) — canvas phủ trên cả chữ (z 40 > bảng z 6) nên không
     thể làm mờ vệt nắng mà không mờ luôn chữ; phần này chỉ thu bụi +
     shimmer nhẹ, không thêm vệt sáng tĩnh mới lên bảng. BEAM đo từ
     nền v17 — nếu nền v18 vẽ lại đổi vị trí tia nắng thì đo lại. */
(function () {
'use strict';
const W = (window.Classroom = window.Classroom || {});
const E = (W.effects = {});
let cv, ctx, w = 1, h = 1;
let rafId = 0, fxHidden = document.hidden, fwTimers = [];
/* Vệt nắng v17 (đo từ img/lop-hoc-bg.png 720x1280, theo % sân khấu):
   dải chéo từ mép trái y 0.12-0.30, nghiêng xuống phải, tới x 0.62 thì
   hết (bên phải bảng xanh trơn). yTop/yBot tính theo x (phần của w). */
const BEAM = { x1: 0.62, yTop0: 0.12, yBot0: 0.30, slope: 0.30 };
const beamTopY = (xf) => BEAM.yTop0 + BEAM.slope * xf;
const beamBotY = (xf) => BEAM.yBot0 + BEAM.slope * xf;
/* Hướng trôi xuôi tia nắng, theo px: dx 1 thì dy = slope * h/w. */
const beamSlopePx = () => BEAM.slope * h / w;
let reduceMotion = false;
function startLoop() { if (!rafId) { lastT = 0; rafId = requestAnimationFrame(loop); } }
function stopLoop() { if (rafId) { cancelAnimationFrame(rafId); rafId = 0; } }
document.addEventListener('visibilitychange', () => {
  fxHidden = document.hidden;
  if (fxHidden) {
    stopLoop();
    for (const t of fwTimers) clearTimeout(t);
    fwTimers.length = 0;
  } else startLoop();
});
const P = [];
let tier = 0, sparkleAcc = 0, lastT = 0, dustAcc = 0;
const rand = (a, b) => a + Math.random() * (b - a);
const FW_COLORS = ['#ffd76a', '#ff7eb0', '#7ed6ff', '#b8f26d', '#ffffff', '#c3a6ff'];
const CONFETTI = ['#ffd76a', '#ff7eb0', '#7ed6ff', '#b8f26d', '#ffffff', '#c3a6ff'];
const HEARTS = ['#ff5c7a', '#ff9db8', '#ffb7cd'];

E.init = function (canvas) {
  cv = canvas; ctx = cv.getContext('2d');
  try { reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { reduceMotion = false; }
  installRpsObserver();
  startLoop();
};
E.resize = function (w2, h2, dpr) {
  if (!cv) return;
  w = w2; h = h2;
  cv.width = Math.round(w2 * dpr); cv.height = Math.round(h2 * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
};
E.setTier = function (t) { tier = t; };
function add(p) { if (fxHidden) return; if (P.length < 1400) P.push(p); }

/* Sao vàng bay lên từ một điểm (thưởng trả lời đúng / điểm danh). */
E.stars = function (n, x, y) {
  for (let i = 0; i < (n || 12); i++) {
    const a = rand(0, 6.283), sp = rand(40, 170);
    add({ kind: 'star', x: (x != null ? x * w : w * 0.5) + rand(-20, 20), y: (y != null ? y * h : h * 0.5) + rand(-10, 10),
      vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 70, life: 0, max: rand(1.2, 2), size: rand(4, 8),
      color: '#ffd76a', grav: 60, drag: 1.2, rot: rand(0, 6.3), vr: rand(-3, 3) });
  }
  if (W.audio) W.audio.sparkle();
};
/* Pháo giấy từ hai góc dưới bắn chéo lên (quà lớn / lên bảng). */
E.cannon = function () {
  for (const fromLeft of [true, false]) {
    for (let i = 0; i < 70; i++) {
      add({ kind: 'confetti', x: fromLeft ? rand(0, w * 0.06) : rand(w * 0.94, w), y: h + rand(0, 14),
        vx: (fromLeft ? 1 : -1) * rand(60, 300), vy: -rand(330, 620),
        life: 0, max: rand(1.6, 2.8), size: rand(5, 10), rot: rand(0, 6.3), vr: rand(-6, 6),
        color: CONFETTI[Math.floor(Math.random() * CONFETTI.length)], grav: 300, drag: 0.7 });
    }
  }
  if (W.audio) W.audio.sparkle();
};
E.confetti = function (n) {
  for (let i = 0; i < (n || 50); i++) {
    add({ kind: 'confetti', x: rand(0, w), y: rand(-h * 0.25, -10), vx: rand(-14, 14), vy: rand(26, 62),
      life: 0, max: rand(6, 10), size: rand(5, 10), rot: rand(0, 6.3), vr: rand(-2.4, 2.4),
      color: CONFETTI[Math.floor(Math.random() * CONFETTI.length)], grav: 0, drag: 0, sway: rand(0, 6.3) });
  }
};
E.hearts = function (n, x, y) {
  for (let i = 0; i < (n || 10); i++) {
    add({ kind: 'heart', x: (x != null ? x * w : rand(w * 0.3, w * 0.7)) + rand(-30, 30),
      y: (y != null ? y * h : h * 0.62) + rand(-8, 8), vx: rand(-12, 12), vy: rand(-66, -38),
      life: 0, max: rand(1.6, 2.6), size: rand(8, 15), color: HEARTS[Math.floor(Math.random() * HEARTS.length)],
      grav: -6, drag: 0, sway: rand(0, 6.3) });
  }
};
function spark(cx, cy, vx, vy, col, opt) {
  add(Object.assign({ kind: 'spark', x: cx, y: cy, vx, vy, life: 0, max: rand(0.7, 1.3),
    size: rand(1.6, 3.1), color: col, grav: 60, drag: 1.6 }, opt || {}));
}
function explode(cx, cy, col) {
  const S = h / 800;
  add({ kind: 'flash', x: cx, y: cy, vx: 0, vy: 0, life: 0, max: 0.35, size: rand(26, 42), color: col, grav: 0, drag: 0 });
  if (W.audio) W.audio.boom();
  const n = 48;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * 6.283 + rand(-0.08, 0.08), sp = rand(90, 250) * S;
    spark(cx, cy, Math.cos(a) * sp, Math.sin(a) * sp, col, { tw: Math.random() < 0.45 ? 1 : 0 });
  }
}
E.firework = function (x, y, color) {
  const tx = x != null ? x * w : rand(w * 0.15, w * 0.85);
  const ty = y != null ? y * h : rand(h * 0.12, h * 0.36);
  const col = color || FW_COLORS[Math.floor(Math.random() * FW_COLORS.length)];
  const sx = Math.max(8, Math.min(w - 8, tx + rand(-30, 30)));
  add({ kind: 'rocket', x: sx, y: h + 6, tx, ty, sx, vx: 0, vy: 0, life: 0, max: rand(0.65, 0.9), size: 2.6, color: col, grav: 0, drag: 0 });
};
E.fireworks = function (count, gap) {
  const n = count || 3, g = gap || 260;
  for (let i = 0; i < n; i++) {
    const id = setTimeout(() => { const k = fwTimers.indexOf(id); if (k >= 0) fwTimers.splice(k, 1); E.firework(); }, i * g + rand(0, 120));
    fwTimers.push(id);
  }
};
E.fireworksShow = E.fireworks;

/* ---------- Oẳn tù tì (LH-V4) ---------- */
const RPS_EMOJI = { bua: '✊', keo: '✌️', bao: '✋' };
/* Tâm 3 cột búa/kéo/bao trên bảng v17: bảng x 12-88%, mỗi ô 30% chiều
   rộng bảng → tâm cột ≈ 24.7% / 50% / 75.3% sân khấu, y ≈ 24% (dòng
   .rps-choice trong #qScrambled). CHỈ LÀ FALLBACK — lúc chạy, observer
   đo thật vị trí .rps-choice / #qDashes nên layout đổi vẫn đúng chỗ. */
const RPS_COL_X = { bua: 0.247, keo: 0.5, bao: 0.753 };
const RPS_ROW_Y = 0.24;
let lastRevealAt = 0, lastVoteAt = {};
/* Đo tâm 1 phần tử theo % sân khấu (để đặt hiệu ứng đúng chỗ dù layout
   bảng đổi). Trả null khi không đo được → dùng fallback. */
function stageFrac(el) {
  try {
    const stage = document.getElementById('stage');
    if (!el || !stage || !el.getBoundingClientRect || !stage.getBoundingClientRect) return null;
    const r = el.getBoundingClientRect(), s = stage.getBoundingClientRect();
    if (!s.width || !s.height) return null;
    return { x: (r.left + r.width / 2 - s.left) / s.width, y: (r.top + r.height / 2 - s.top) / s.height };
  } catch (e) { return null; }
}
/* Tay cô ra: lắc nắm đấm 0.9s bay từ tay cô (x 0.20, y 0.22 — tay phải
   cô Ngân giơ cờ) ra giữa bảng (mặc định 0.50, 0.24; observer truyền
   tâm dòng "Cô ra" đo thật), bung to thành tay đã ra + nổ sao. */
E.rpsReveal = function (choice, xf, yf) {
  if (!RPS_EMOJI[choice]) return;
  const now = Date.now();
  if (now - lastRevealAt < 5000) return;
  lastRevealAt = now;
  const tx = (xf != null ? xf : 0.5) * w, ty = (yf != null ? yf : RPS_ROW_Y) * h;
  add({ kind: 'rps', emoji: RPS_EMOJI[choice], x0: w * 0.20, y0: h * 0.22, tx, ty,
    x: w * 0.20, y: h * 0.22, vx: 0, vy: 0, life: 0, max: 2.2, size: 46, rot: 0, grav: 0, drag: 0 });
};
/* 1 phiếu búa/kéo/bao: tay nhỏ bay lên ở đúng cột đó (xf đo thật từ
   .rps-choice; không có thì dùng RPS_COL_X). Giới hạn 350ms/cột để
   demo/đợt vote dồn không nổ liên tục. */
E.rpsVote = function (kind, xf) {
  if (RPS_COL_X[kind] == null) return;
  const now = Date.now();
  if (now - (lastVoteAt[kind] || 0) < 350) return;
  lastVoteAt[kind] = now;
  const cx = (xf != null ? xf : RPS_COL_X[kind]) * w;
  for (let i = 0; i < 4; i++) {
    add({ kind: 'rpsMini', emoji: RPS_EMOJI[kind], x: cx + rand(-16, 16), y: h * RPS_ROW_Y + rand(-6, 10),
      vx: rand(-14, 14), vy: rand(-58, -34), life: 0, max: rand(0.7, 0.9), size: 26, rot: rand(-0.3, 0.3), vr: rand(-1, 1), grav: 0, drag: 0 });
  }
};
/* Bám bảng để hiệu ứng khớp nhịp mà không sửa main.js: quét text toàn
   bảng tìm "Cô ra: ..." thì ra tay; số .rps-count tăng thì nổ tay ở
   cột đó (tọa độ đo thật). Không bám #qCat hay #qHint riêng — LH-V3
   đã dời "Cô ra" từ #qHint xuống #qDashes và ẩn pill chủ đề, nên bám
   1 phần tử cố định sẽ gãy khi gộp. Nếu nv3 đổi hẳn câu chữ "Cô ra",
   main.js gọi thẳng FX.rpsReveal(choice) trong revealBreak. */
let rpsInstalled = false, lastRevealSig = '', lastCounts = { bua: 0, keo: 0, bao: 0 };
function installRpsObserver() {
  if (rpsInstalled || typeof MutationObserver === 'undefined') return;
  const board = document.getElementById('board');
  if (!board) return;
  rpsInstalled = true;
  const check = () => {
    const counts = document.querySelectorAll('#qScrambled .rps-count');
    const inBreak = counts.length === 3 || (board.classList && board.classList.contains('board-break'));
    if (!inBreak) { lastCounts = { bua: 0, keo: 0, bao: 0 }; lastRevealSig = ''; return; }
    const text = board.textContent || '';
    const m = text.match(/Cô ra:\s*(✊|✌️|✋)?\s*([A-Za-zÀ-ỹ]+)/);
    const sig = m ? m[0] : '';
    if (sig && sig !== lastRevealSig) {
      lastRevealSig = sig;
      const byEmoji = { '✊': 'bua', '✌️': 'keo', '✋': 'bao' };
      const byLabel = { 'Búa': 'bua', 'Kéo': 'keo', 'Bao': 'bao' };
      const choice = byEmoji[m[1]] || byLabel[m[2]];
      if (choice) {
        let xf = 0.5, yf = RPS_ROW_Y;
        const dEl = document.getElementById('qDashes');
        if (dEl && dEl.textContent && dEl.textContent.indexOf('Cô ra:') >= 0) {
          const f = stageFrac(dEl);
          if (f) { xf = f.x; yf = f.y; }
        }
        E.rpsReveal(choice, xf, yf);
      }
    }
    ['bua', 'keo', 'bao'].forEach((k, i) => {
      const el = counts[i];
      if (!el) return;
      const n = parseInt(el.textContent, 10) || 0;
      if (n > lastCounts[k]) {
        let xf = null;
        const col = el.parentElement;
        if (col) { const f = stageFrac(col); if (f) xf = f.x; }
        E.rpsVote(k, xf);
      }
      lastCounts[k] = n;
    });
  };
  new MutationObserver(check).observe(board, { childList: true, characterData: true, subtree: true });
  check();
}
/* Shimmer rất nhẹ trong vệt nắng (alpha đỉnh 0.05): nắng sống động mà
   không thêm vệt sáng tĩnh lên bảng. Bỏ qua khi giảm chuyển động. */
function drawBeamShimmer(t) {
  if (reduceMotion) return;
  const x1 = BEAM.x1 * w;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(0, beamTopY(0) * h);
  ctx.lineTo(x1, beamTopY(BEAM.x1) * h);
  ctx.lineTo(x1, beamBotY(BEAM.x1) * h);
  ctx.lineTo(0, beamBotY(0) * h);
  ctx.closePath();
  ctx.clip();
  const g = ctx.createLinearGradient(0, beamTopY(0) * h, 0, beamBotY(0) * h);
  const a = 0.05 * (0.75 + 0.25 * Math.sin(t / 2400));
  g.addColorStop(0, 'rgba(255,236,170,0)');
  g.addColorStop(0.5, 'rgba(255,236,170,' + a.toFixed(3) + ')');
  g.addColorStop(1, 'rgba(255,236,170,0)');
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, x1, h);
  ctx.restore();
}
/* Chẩn đoán cho nv6/BOSS kiểm chứng: số hạt theo loại + hộp bao bụi +
   số hạt bụi / lấp lánh lạc khỏi vùng cho phép (bụi ngoài vệt nắng,
   lấp lánh trong dải bảng y 0.14-0.34 — cả hai phải = 0). */
E._diag = function () {
  const byKind = {}, dust = { x0: 1, x1: 0, y0: 1, y1: 0, n: 0, out: 0 }, twInBoard = { n: 0, out: 0 };
  for (const p of P) {
    byKind[p.kind] = (byKind[p.kind] || 0) + 1;
    if (p.kind === 'dust') {
      dust.n++;
      const xf = p.x / w, yf = p.y / h;
      dust.x0 = Math.min(dust.x0, xf); dust.x1 = Math.max(dust.x1, xf);
      dust.y0 = Math.min(dust.y0, yf); dust.y1 = Math.max(dust.y1, yf);
      if (yf < beamTopY(xf) - 0.01 || yf > beamBotY(xf) + 0.01) dust.out++;
    }
    if (p.kind === 'twinkle') {
      twInBoard.n++;
      const yf = p.y / h;
      if (yf >= 0.14 && yf <= 0.34) twInBoard.out++;
    }
  }
  return { n: P.length, byKind, dust: dust.n ? dust : null, twInBoard, rpsInstalled };
};

function drawHeart(x, y, s, color, alpha) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s / 10, s / 10); ctx.globalAlpha = alpha;
  ctx.fillStyle = color; ctx.beginPath();
  ctx.moveTo(0, 3);
  ctx.bezierCurveTo(-6, -3, -3, -9, 0, -4.5);
  ctx.bezierCurveTo(3, -9, 6, -3, 0, 3);
  ctx.fill(); ctx.restore();
}
function drawStar(x, y, s, color, alpha, rot) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot || 0); ctx.globalAlpha = alpha;
  ctx.fillStyle = color; ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? s : s * 0.45, a = (i / 10) * 6.283 - 1.5708;
    const px = Math.cos(a) * r, py = Math.sin(a) * r;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath(); ctx.fill(); ctx.restore();
}
function loop(t) {
  rafId = requestAnimationFrame(loop);
  const dt = Math.min(0.05, lastT ? (t - lastT) / 1000 : 0.016); lastT = t;
  ctx.clearRect(0, 0, w, h);
  drawBeamShimmer(t);
  sparkleAcc += dt * (1.1 + tier * 0.85);
  while (sparkleAcc >= 1) {
    sparkleAcc--;
    /* Tránh dải bảng y 0.14-0.34: lấp lánh không nhấp nháy lên chữ phấn. */
    const twY = Math.random() < 0.3 ? rand(h * 0.04, h * 0.13) : rand(h * 0.36, h * 0.55);
    add({ kind: 'twinkle', x: rand(0, w), y: twY, vx: 0, vy: rand(-4, 2),
      life: 0, max: rand(1.2, 2.4), size: rand(1.4, 3.2), color: '#ffe9a8', grav: 0, drag: 0 });
  }
  /* Hạt bụi CHỈ trong vệt nắng: điểm ngẫu nhiên trong dải chéo, nhỏ
     (1.5-3.5px), trôi chậm xuôi tia (vx +, vy = vx * slope), không còn
     rải khắp màn hình. Tỉ lệ ~1.6/s → ~13 hạt sống cùng lúc trong tia. */
  dustAcc += dt * (reduceMotion ? 0 : 1.6 + tier * 0.4);
  while (dustAcc >= 1) {
    dustAcc--;
    const xf = rand(0, BEAM.x1);
    const yf = rand(beamTopY(xf), beamBotY(xf));
    const vx = rand(4, 9);
    add({ kind: 'dust', x: xf * w, y: yf * h, vx, vy: vx * beamSlopePx(),
      life: 0, max: rand(6, 11), size: rand(1.5, 3.5), color: '#fff6c9', grav: 0, drag: 0, sway: rand(0, 6.3) });
  }
  for (let i = P.length - 1; i >= 0; i--) {
    const p = P[i];
    p.life += dt;
    if (p.life >= p.max || p.y > h + 30) {
      if (p.kind === 'rocket') explode(p.tx, p.ty, p.color);
      P[i] = P[P.length - 1]; P.pop(); continue;
    }
    if (p.kind === 'rocket') {
      const f = Math.min(1, p.life / p.max), e = 1 - Math.pow(1 - f, 1.6);
      p.x = p.sx + (p.tx - p.sx) * e + Math.sin(f * 9 + p.tx) * 3;
      p.y = (h + 6) + (p.ty - h - 6) * e;
    } else if (p.kind === 'rps') {
      /* Bay từ tay cô ra giữa bảng, lắc nắm đấm; tới 0.9s thì bung tay. */
      const fly = Math.min(1, p.life / 0.9), e = 1 - Math.pow(1 - fly, 2);
      p.x = p.x0 + (p.tx - p.x0) * e;
      p.y = p.y0 + (p.ty - p.y0) * e + (fly < 1 ? Math.sin(p.life * 44) * 9 * (1 - fly) : 0);
      p.rot = fly < 1 ? Math.sin(p.life * 44) * 0.18 : 0;
      if (!p.burstDone && p.life >= 0.9) { p.burstDone = true; E.stars(12, p.tx / w, p.ty / h); }
    } else {
      const dragK = p.drag ? Math.max(0, 1 - p.drag * dt) : 1;
      p.vx *= dragK; p.vy = p.vy * dragK + (p.grav || 0) * dt;
      p.x += p.vx * dt + (p.sway != null ? Math.sin(t / 480 + p.sway) * 18 * dt : 0);
      p.y += p.vy * dt;
      if (p.rot != null) p.rot += (p.vr || 0) * dt;
      /* Bụi trôi hết vệt nắng (x > 0.62) thì mờ dần rồi tắt, không bay
         tiếp lên phần bảng xanh trơn bên phải. */
      if (p.kind === 'dust' && p.x > BEAM.x1 * w) p.life = Math.max(p.life, p.max - 0.7);
    }
    const fade = p.life > p.max - 0.7 ? (p.max - p.life) / 0.7 : 1;
    if (p.kind === 'spark') {
      let a = Math.max(0, fade);
      if (p.tw) a *= 0.35 + 0.65 * Math.abs(Math.sin(t / 90 + p.x * 0.7 + p.y));
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = a;
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size * fade + 0.4, 0, 6.3); ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
    } else if (p.kind === 'rocket') {
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.95; ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size * 0.8, 0, 6.3); ctx.fill();
      ctx.globalAlpha = 0.55; ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size * 1.7, 0, 6.3); ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
    } else if (p.kind === 'flash') {
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 2.2);
      g.addColorStop(0, 'rgba(255,255,255,.85)'); g.addColorStop(0.35, p.color); g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.globalAlpha = Math.max(0, fade) * 0.7; ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size * 2.2, 0, 6.3); ctx.fill();
    } else if (p.kind === 'twinkle' || p.kind === 'star') {
      if (p.kind === 'twinkle') {
        ctx.globalAlpha = Math.sin((p.life / p.max) * Math.PI) * 0.9;
        ctx.fillStyle = p.color;
        const s = p.size;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y - s * 2); ctx.lineTo(p.x + s * 0.6, p.y - s * 0.6); ctx.lineTo(p.x + s * 2, p.y);
        ctx.lineTo(p.x + s * 0.6, p.y + s * 0.6); ctx.lineTo(p.x, p.y + s * 2); ctx.lineTo(p.x - s * 0.6, p.y + s * 0.6);
        ctx.lineTo(p.x - s * 2, p.y); ctx.lineTo(p.x - s * 0.6, p.y - s * 0.6);
        ctx.fill();
      } else drawStar(p.x, p.y, p.size, p.color, Math.max(0, fade), p.rot);
    } else if (p.kind === 'dust') {
      /* Chấm bụi nhỏ, mờ dần hai đầu vòng đời — không còn quầng mờ to. */
      ctx.globalAlpha = Math.sin((p.life / p.max) * Math.PI) * 0.32;
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, 6.3); ctx.fill();
    } else if (p.kind === 'rps' || p.kind === 'rpsMini') {
      const isBig = p.kind === 'rps';
      let size = isBig ? 46 : p.size, emoji = p.emoji;
      if (isBig) {
        if (p.life < 0.9) emoji = '✊';
        else if (p.life < 1.1) { const g = (p.life - 0.9) / 0.2; size = 46 + (88 - 46) * (1 - Math.pow(1 - g, 3)); }
        else size = 88;
      }
      ctx.save();
      ctx.globalAlpha = Math.max(0, fade);
      ctx.font = size + 'px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.translate(p.x, p.y); ctx.rotate(p.rot || 0);
      ctx.fillText(emoji, 0, 0);
      ctx.restore();
    } else if (p.kind === 'confetti') {
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot || 0); ctx.globalAlpha = Math.max(0, fade);
      const fl2 = 0.2 + 0.8 * Math.abs(Math.sin((p.rot || 0) * 1.7));
      ctx.scale(1, fl2);
      ctx.fillStyle = p.color; ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2); ctx.restore();
    } else if (p.kind === 'heart') {
      drawHeart(p.x, p.y, p.size, p.color, Math.max(0, fade));
    }
  }
  ctx.globalAlpha = 1;
}
})();
