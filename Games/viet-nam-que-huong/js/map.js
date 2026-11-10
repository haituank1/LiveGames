/* Ban do Viet Nam ve tay, khong dung d3 hay CDN.
   - Chieu Mercator tu viet tu GeoJSON (vn34.json).
   - Hoang Sa / Truong Sa ve thu gon ngoai khoi Da Nang / Khanh Hoa
     (ve dung vi tri that thi ca nuoc phai thu nho lai).
   - Camera zoom/pan bang transform + requestAnimationFrame, easing rieng.
   - Duong path dung fill-rule evenodd nen khong can sua chieu vong. */
(function () {
'use strict';
var W = (window.QueHuong = window.QueHuong || {});

var MAP_W = 720, MAP_H = 980;
var FOCUS_X = 337, FOCUS_W = 280;
var HOME = { cx: FOCUS_X, cy: MAP_H / 2, size: MAP_H };

var ALLOWED = {};
['an-giang', 'bac-ninh', 'ca-mau', 'can-tho', 'cao-bang', 'da-nang', 'dak-lak', 'dien-bien', 'dong-nai', 'dong-thap', 'gia-lai', 'ha-noi', 'ha-tinh', 'hai-phong', 'hue', 'hung-yen', 'khanh-hoa', 'lai-chau', 'lam-dong', 'lang-son', 'lao-cai', 'nghe-an', 'ninh-binh', 'phu-tho', 'quang-ngai', 'quang-ninh', 'quang-tri', 'son-la', 'tay-ninh', 'thai-nguyen', 'thanh-hoa', 'tp-ho-chi-minh', 'tuyen-quang', 'vinh-long', 'hoang-sa', 'truong-sa'].forEach(function (id) { ALLOWED[id] = true; });

var svgEl = null, worldEl = null;
var provs = [], byId = {};
var islands = {}; /* id -> { parts:[{d,c}], box, at(lon,lat) } */
var view = { cx: HOME.cx, cy: HOME.cy, size: HOME.size };
var rafId = 0;
var palette = ['#e7b44e', '#d64a32', '#43a88c', '#e47e94', '#a2cac2', '#cd7a3c'];
var arrivedId = null, burstEl = null;

function mercRaw(lon, lat) {
  var la = lat * Math.PI / 180;
  return [(lon + 180) / 360, 0.5 - Math.log(Math.tan(Math.PI / 4 + la / 2)) / (2 * Math.PI)];
}
function el(tag, attrs) {
  var e = document.createElementNS('http://www.w3.org/2000/svg', tag);
  if (attrs) for (var k in attrs) e.setAttribute(k, attrs[k]);
  return e;
}
function fmt(n) { return Math.round(n * 10) / 10; }

/* Dien tich co dau + tam cua 1 vong (shoelace). */
function ringMetrics(ring) {
  var a = 0, cx = 0, cy = 0;
  for (var i = 0; i < ring.length - 1; i++) {
    var x0 = ring[i][0], y0 = ring[i][1], x1 = ring[i + 1][0], y1 = ring[i + 1][1];
    var cr = x0 * y1 - x1 * y0;
    a += cr; cx += (x0 + x1) * cr; cy += (y0 + y1) * cr;
  }
  a /= 2;
  if (Math.abs(a) < 1e-9) return { area: 0, c: [ring[0][0], ring[0][1]] };
  return { area: a, c: [cx / (6 * a), cy / (6 * a)] };
}

function validate(fc) {
  if (!fc || fc.type !== 'FeatureCollection' || !Array.isArray(fc.features)) {
    throw new Error('vn34.json khong phai FeatureCollection');
  }
  var ids = {};
  fc.features.forEach(function (f) {
    if (!f.properties || typeof f.properties.id !== 'string' || !ALLOWED[f.properties.id]) {
      throw new Error('vn34.json co tinh la: ' + JSON.stringify(f.properties));
    }
    if (!f.geometry || f.geometry.type !== 'MultiPolygon' || !Array.isArray(f.geometry.coordinates)) {
      throw new Error('vn34.json: hinh cua ' + f.properties.id + ' khong phai MultiPolygon');
    }
    ids[f.properties.id] = true;
  });
  var need = Object.keys(ALLOWED);
  var missing = need.filter(function (id) { return !ids[id]; });
  if (missing.length) throw new Error('vn34.json thieu: ' + missing.join(', '));
}

function build(fc) {
  var main = fc.features.filter(function (f) { return !f.properties.island; });
  /* Fit dat lien vao khung [16,464] x [16,964]. */
  var minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  var raw = [];
  main.forEach(function (f) {
    var polys = f.geometry.coordinates.map(function (poly) {
      return poly.map(function (ring) {
        return ring.map(function (pt) {
          var r = mercRaw(pt[0], pt[1]);
          if (r[0] < minX) minX = r[0];
          if (r[0] > maxX) maxX = r[0];
          if (r[1] < minY) minY = r[1];
          if (r[1] > maxY) maxY = r[1];
          return r;
        });
      });
    });
    raw.push({ f: f, polys: polys });
  });
  var scale = Math.min((464 - 16) / (maxX - minX), (964 - 16) / (maxY - minY));
  var ox = 16 - minX * scale, oy = 16 - minY * scale;
  function P(r) { return [r[0] * scale + ox, r[1] * scale + oy]; }
  function at(lon, lat) { var r = mercRaw(lon, lat); return [r[0] * scale + ox, r[1] * scale + oy]; }

  provs = [];
  byId = {};
  raw.forEach(function (item) {
    var f = item.f;
    var d = '';
    var best = null, bestArea = -1, bestBounds = null;
    item.polys.forEach(function (poly) {
      poly.forEach(function (ring) {
        var pts = ring.map(P);
        d += 'M' + pts.map(function (p) { return fmt(p[0]) + ' ' + fmt(p[1]); }).join('L') + 'Z';
      });
      var outer = poly[0].map(P);
      var m = ringMetrics(outer);
      var area = Math.abs(m.area);
      if (area > bestArea) {
        bestArea = area; best = m.c;
        var xs = outer.map(function (p) { return p[0]; }), ys = outer.map(function (p) { return p[1]; });
        bestBounds = [[Math.min.apply(null, xs), Math.min.apply(null, ys)], [Math.max.apply(null, xs), Math.max.apply(null, ys)]];
      }
    });
    var p = { id: f.properties.id, name: f.properties.name, d: d, color: (f.properties.color || 0), c: best, b: bestBounds };
    provs.push(p);
    byId[p.id] = p;
  });

  /* Cum dao thu gon: fit rieng vao hop gan bo bien. */
  islands = {};
  fc.features.filter(function (f) { return f.properties.island; }).forEach(function (f) {
    var id = f.properties.id;
    var anchor = id === 'hoang-sa' ? at(108.25, 16.05) : at(109.25, 12.25);
    var box = id === 'hoang-sa'
      ? [[anchor[0] + 30, anchor[1] - 40], [Math.min(anchor[0] + 127, 470), anchor[1] + 17]]
      : [[anchor[0] + 27, anchor[1] + 33], [anchor[0] + 167, anchor[1] + 140]];
    var xs = [], ys = [];
    f.geometry.coordinates.forEach(function (poly) {
      poly.forEach(function (ring) {
        ring.forEach(function (pt) { var r = mercRaw(pt[0], pt[1]); xs.push(r[0]); ys.push(r[1]); });
      });
    });
    var s2 = Math.min((box[1][0] - box[0][0]) / (Math.max.apply(null, xs) - Math.min.apply(null, xs)), (box[1][1] - box[0][1]) / (Math.max.apply(null, ys) - Math.min.apply(null, ys)));
    var ox2 = box[0][0] - Math.min.apply(null, xs) * s2, oy2 = box[0][1] - Math.min.apply(null, ys) * s2;
    function Q(lon, lat) { var r = mercRaw(lon, lat); return [r[0] * s2 + ox2, r[1] * s2 + oy2]; }
    var parts = [];
    f.geometry.coordinates.forEach(function (poly) {
      poly.forEach(function (ring) {
        var pts = ring.map(function (pt) { return Q(pt[0], pt[1]); });
        var dd = 'M' + pts.map(function (p) { return fmt(p[0]) + ' ' + fmt(p[1]); }).join('L') + 'Z';
        var m = ringMetrics(pts);
        parts.push({ d: dd, c: m.c });
      });
    });
    islands[id] = {
      parts: parts,
      box: box, /* hop fit goc: dung cho camera + nhan */
      at: Q
    };
  });
  return { at: at };
}

var seaPts = null;
function render() {
  svgEl = document.getElementById('mapSvg');
  if (!svgEl) return;
  svgEl.setAttribute('viewBox', '0 0 ' + MAP_W + ' ' + MAP_H);
  while (svgEl.firstChild) svgEl.removeChild(svgEl.firstChild);
  worldEl = el('g', { id: 'mapWorld' });
  svgEl.appendChild(worldEl);
  var sea = seaPts;
  worldEl.appendChild(el('text', { 'class': 'sea-lbl', x: sea.bienDong[0], y: sea.bienDong[1] })).textContent = 'Biển Đông';
  var g1 = el('text', { 'class': 'sea-lbl sm', x: sea.vinhBB[0], y: sea.vinhBB[1] }); g1.textContent = 'Vịnh Bắc Bộ'; worldEl.appendChild(g1);
  var g2 = el('text', { 'class': 'sea-lbl sm', x: sea.vinhTL[0], y: sea.vinhTL[1], style: 'text-anchor:start' }); g2.textContent = 'Vịnh Thái Lan'; worldEl.appendChild(g2);
  provs.forEach(function (p) {
    var path = el('path', { 'class': 'prov', d: p.d, 'fill-rule': 'evenodd', 'data-id': p.id });
    worldEl.appendChild(path);
    p.el = path;
    var lbl = el('text', { 'class': 'prov-lbl', x: p.c[0], y: p.c[1], 'data-id': p.id });
    lbl.textContent = p.name;
    worldEl.appendChild(lbl);
    p.lbl = lbl;
  });
  [['hoang-sa', 'da-nang', 'QĐ. Hoàng Sa'], ['truong-sa', 'khanh-hoa', 'QĐ. Trường Sa']].forEach(function (row) {
    var g = el('g', { 'class': 'isl-main', 'data-parent': row[1] });
    var isl = islands[row[0]];
    isl.parts.forEach(function (s) {
      g.appendChild(el('path', { d: s.d, 'fill-rule': 'evenodd' }));
      g.appendChild(el('circle', { cx: s.c[0], cy: s.c[1], r: 2.4 }));
    });
    var t = el('text', { 'class': 'isl-lbl', x: row[0] === 'hoang-sa' ? isl.box[1][0] : (isl.box[0][0] + isl.box[1][0]) / 2, y: row[0] === 'hoang-sa' ? isl.box[0][1] - 12 : isl.box[1][1] + 26 });
    if (row[0] === 'hoang-sa') t.setAttribute('style', 'text-anchor:end');
    t.textContent = row[2];
    g.appendChild(t);
    worldEl.appendChild(g);
    isl.el = g;
  });
  burstEl = el('circle', { 'class': 'burst', r: 10, style: 'display:none' });
  worldEl.appendChild(burstEl);
  applyCamera(view);
}

function applyCamera(v) {
  view = v;
  var k = MAP_H / v.size;
  if (worldEl) worldEl.setAttribute('transform', 'translate(' + fmt(FOCUS_X - v.cx * k) + ',' + fmt(MAP_H / 2 - v.cy * k) + ') scale(' + k.toFixed(4) + ')');
  if (svgEl) svgEl.style.setProperty('--k', String(k));
}
function easeInOut(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }

/* Bay camera toi 1 luot ghe. Tra ve toa do man hinh (trong map-box) cua diem ghim. */
function focus(visit) {
  return new Promise(function (resolve) {
    if (!provs.length) { resolve(null); return; }
    var p = visit && visit.pid ? byId[visit.pid] : null;
    var spot = visit ? visit.spot : null;
    var to = HOME, anchor = p ? p.c : null;
    if (p && spot && spot.far) {
      var g = islands[spot.pid === 'da-nang' ? 'hoang-sa' : 'truong-sa'];
      var box = g.box;
      var whole = spot.name.indexOf('Quần đảo') === 0;
      var s = whole ? [(box[0][0] + box[1][0]) / 2, (box[0][1] + box[1][1]) / 2] : g.at(spot.lon, spot.lat);
      var x = Math.min(box[1][0], Math.max(box[0][0], s[0]));
      var y = Math.min(box[1][1], Math.max(box[0][1], s[1]));
      var size = Math.max(box[1][1] - box[0][1], (box[1][0] - box[0][0]) * MAP_H / FOCUS_W) * 2.4;
      to = { cx: whole ? (box[0][0] + box[1][0]) / 2 : x, cy: (whole ? (box[0][1] + box[1][1]) / 2 : y) - 90 * size / MAP_H, size: size };
      anchor = [x, y];
    } else if (p && spot) {
      var atPt = window.QueHuong.__mapAt(spot.lon, spot.lat);
      var at2 = window.QueHuong.__mapAt(spot.lon, spot.lat - spot.span / 2);
      var at3 = window.QueHuong.__mapAt(spot.lon, spot.lat + spot.span / 2);
      var h = Math.abs(at2[1] - at3[1]);
      var size2 = Math.max(h * 1.6, MAP_H / 14);
      to = { cx: atPt[0], cy: atPt[1] - 90 * size2 / MAP_H, size: size2 };
      anchor = atPt;
    } else if (p) {
      var b = p.b;
      var size3 = Math.max(b[1][1] - b[0][1], (b[1][0] - b[0][0]) * MAP_H / FOCUS_W) * 1.55;
      to = { cx: (b[0][0] + b[1][0]) / 2, cy: (b[0][1] + b[1][1]) / 2 + size3 * 0.06, size: Math.max(size3, MAP_H / 11) };
    }
    var from = { cx: view.cx, cy: view.cy, size: view.size };
    var dist = Math.hypot(to.cx - from.cx, to.cy - from.cy) + Math.abs(to.size - from.size);
    var ms = Math.min(1400, Math.max(650, 500 + dist * 0.6));
    if (rafId) cancelAnimationFrame(rafId);
    var t0 = performance.now();
    function step(now) {
      var t = Math.min(1, (now - t0) / ms);
      var e = easeInOut(t);
      applyCamera({
        cx: from.cx + (to.cx - from.cx) * e,
        cy: from.cy + (to.cy - from.cy) * e,
        size: from.size + (to.size - from.size) * e
      });
      if (t < 1) { rafId = requestAnimationFrame(step); return; }
      rafId = 0;
      if (!anchor) { resolve(null); return; }
      var k = MAP_H / view.size;
      resolve([anchor[0] * k + (FOCUS_X - view.cx * k), anchor[1] * k + (MAP_H / 2 - view.cy * k)]);
    }
    rafId = requestAnimationFrame(step);
  });
}
function goHome() {
  if (rafId) cancelAnimationFrame(rafId);
  var from = { cx: view.cx, cy: view.cy, size: view.size };
  var t0 = performance.now(), ms = 800;
  function step(now) {
    var t = Math.min(1, (now - t0) / ms), e = easeInOut(t);
    applyCamera({ cx: from.cx + (HOME.cx - from.cx) * e, cy: from.cy + (HOME.cy - from.cy) * e, size: from.size + (HOME.size - from.size) * e });
    if (t < 1) rafId = requestAnimationFrame(step); else rafId = 0;
  }
  rafId = requestAnimationFrame(step);
}

/* Cap nhat mau tinh theo diem: lit = tap id da co diem (tru tinh dang cho),
   heat = do dam 0..1, arrivedId = tinh vua toi (sang han), allLit = sang ca nuoc. */
function applyState(st) {
  if (!provs.length) return;
  var litSet = st.lit || new Set();
  provs.forEach(function (p) {
    var on = st.allLit || (litSet.has(p.id) && p.id !== st.visitingId) || arrivedId === p.id;
    p.el.setAttribute('class', 'prov' + (on ? ' on' : '') + (arrivedId === p.id ? ' visit' : ''));
    if (on) {
      p.el.style.fill = palette[p.color % palette.length];
      p.el.style.fillOpacity = st.allLit ? '1' : String(0.5 + 0.5 * (arrivedId === p.id ? 1 : (st.heat[p.id] || 0)));
      p.el.style.transitionDelay = st.allLit ? (p.c[1] / MAP_H * 1.2).toFixed(2) + 's' : '';
    } else {
      p.el.style.fill = '';
      p.el.style.fillOpacity = '';
      p.el.style.transitionDelay = '';
    }
    /* Dang ghe 1 tinh (zoom sau): chi hien nhan cua tinh do, an het nhan
       tinh khac de khoi chong nhau khi phong to. Luc nhin ca nuoc thi
       hien lai nhan cua moi tinh da sang nhu cu. */
    var showLbl = on && arrivedId !== p.id && (!st.visitingId || p.id === st.visitingId);
    p.lbl.setAttribute('class', 'prov-lbl' + (showLbl ? ' show' : ''));
  });
  ['hoang-sa', 'truong-sa'].forEach(function (id, i) {
    var parent = i === 0 ? 'da-nang' : 'khanh-hoa';
    if (islands[id] && islands[id].el) {
      islands[id].el.setAttribute('class', 'isl-main' + ((st.allLit || litSet.has(parent)) ? ' on' : ''));
    }
  });
}
function setArrived(id) { arrivedId = id || null; }
function showBurst(x, y) {
  if (!burstEl) return;
  burstEl.setAttribute('cx', x);
  burstEl.setAttribute('cy', y);
  burstEl.style.display = '';
  burstEl.setAttribute('class', 'burst go');
}
function clearBurst() { if (burstEl) burstEl.style.display = 'none'; }
function setPalette(p) { if (Array.isArray(p) && p.length >= 6) palette = p; }

var M = {
  MAP_W: MAP_W, MAP_H: MAP_H,
  load: function (url) {
    return fetch(url).then(function (r) {
      if (!r.ok) throw new Error('khong tai duoc vn34.json (HTTP ' + r.status + ')');
      return r.json();
    }).then(function (fc) {
      validate(fc);
      var built = build(fc);
      seaPts = {
        bienDong: built.at(109.7, 8.9),
        vinhBB: built.at(107.75, 19.9),
        vinhTL: built.at(102.5, 8.7)
      };
      W.__mapAt = built.at;
      render();
      applyCamera(HOME);
      return true;
    });
  },
  focus: focus,
  goHome: goHome,
  applyState: applyState,
  setArrived: setArrived,
  showBurst: showBurst,
  clearBurst: clearBurst,
  setPalette: setPalette,
  project: function (lon, lat) { return W.__mapAt ? W.__mapAt(lon, lat) : [0, 0]; },
  provinceById: function (id) { return byId[id] || null; }
};
W.QHMap = M;
})();
