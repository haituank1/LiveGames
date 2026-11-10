/* Viet Nam - Que Huong Toi: du lieu tinh/thanh + dia danh.
   34 tinh, thanh theo sap nhap 2025. Alias gom ten cu, viet tat,
   ten thanh pho quen goi. Toa do dia danh la so gan dung de camera
   bay toi, khong phai toa do do dac chinh thuc. */
(function () {
'use strict';
var W = (window.QueHuong = window.QueHuong || {});

/* id, ten hien thi, cac cach goi (khong dau, chu thuong) */
var PROVINCES = [
  ['an-giang', 'An Giang', 'an giang, kien giang, phu quoc, chau doc, rach gia, long xuyen, nam du, tho chu'],
  ['bac-ninh', 'Bắc Ninh', 'bac ninh, bac giang'],
  ['ca-mau', 'Cà Mau', 'ca mau, bac lieu'],
  ['can-tho', 'Cần Thơ', 'can tho, soc trang, hau giang'],
  ['cao-bang', 'Cao Bằng', 'cao bang'],
  ['da-nang', 'Đà Nẵng', 'da nang, quang nam, hoi an, tam ky, hoang sa, cu lao cham'],
  ['dak-lak', 'Đắk Lắk', 'dak lak, daklak, dac lac, dak lac, phu yen, buon ma thuot, buon me thuot, bmt, tuy hoa'],
  ['dien-bien', 'Điện Biên', 'dien bien'],
  ['dong-nai', 'Đồng Nai', 'dong nai, binh phuoc, bien hoa'],
  ['dong-thap', 'Đồng Tháp', 'dong thap, tien giang, my tho, cao lanh, sa dec'],
  ['gia-lai', 'Gia Lai', 'gia lai, binh dinh, quy nhon, pleiku'],
  ['ha-noi', 'Hà Nội', 'ha noi, hanoi, hn, thu do'],
  ['ha-tinh', 'Hà Tĩnh', 'ha tinh'],
  ['hai-phong', 'Hải Phòng', 'hai phong, hai duong, cat ba, bach long vi'],
  ['hue', 'Huế', 'hue, thua thien hue, tt hue'],
  ['hung-yen', 'Hưng Yên', 'hung yen, thai binh'],
  ['khanh-hoa', 'Khánh Hòa', 'khanh hoa, ninh thuan, nha trang, phan rang, cam ranh, truong sa'],
  ['lai-chau', 'Lai Châu', 'lai chau'],
  ['lam-dong', 'Lâm Đồng', 'lam dong, dak nong, binh thuan, da lat, dalat, phan thiet, bao loc, phu quy'],
  ['lang-son', 'Lạng Sơn', 'lang son'],
  ['lao-cai', 'Lào Cai', 'lao cai, yen bai, sa pa, sapa'],
  ['nghe-an', 'Nghệ An', 'nghe an, xu nghe'],
  ['ninh-binh', 'Ninh Bình', 'ninh binh, ha nam, nam dinh'],
  ['phu-tho', 'Phú Thọ', 'phu tho, vinh phuc, hoa binh, viet tri'],
  ['quang-ngai', 'Quảng Ngãi', 'quang ngai, kon tum, kontum, ly son'],
  ['quang-ninh', 'Quảng Ninh', 'quang ninh, ha long, mong cai, cam pha, co to, van don'],
  ['quang-tri', 'Quảng Trị', 'quang tri, quang binh, dong hoi'],
  ['son-la', 'Sơn La', 'son la'],
  ['tay-ninh', 'Tây Ninh', 'tay ninh, long an'],
  ['thai-nguyen', 'Thái Nguyên', 'thai nguyen, bac kan, bac can'],
  ['thanh-hoa', 'Thanh Hóa', 'thanh hoa, xu thanh'],
  ['tp-ho-chi-minh', 'TP. Hồ Chí Minh', 'ho chi minh, tp hcm, tphcm, hcm, hcmc, sai gon, saigon, sg, binh duong, ba ria vung tau, ba ria, vung tau, brvt, con dao, con son, thu duc'],
  ['tuyen-quang', 'Tuyên Quang', 'tuyen quang, ha giang'],
  ['vinh-long', 'Vĩnh Long', 'vinh long, ben tre, tra vinh']
].map(function (row) {
  return { id: row[0], name: row[1], aliases: row[2].split(',').map(function (s) { return s.trim(); }) };
});

var PROVINCE_BY_ID = {};
PROVINCES.forEach(function (p) { PROVINCE_BY_ID[p.id] = p; });

/* Dia danh: thanh pho thuoc tinh (city), dao gan (island), dao xa (far).
   name: ten hien thi; pid: tinh chu; lon/lat: tam gan dung; span: co khung nhin (do). */
function city(name, pid, lon, lat, aliases) {
  return { name: name, pid: pid, lon: lon, lat: lat, span: 0.7, aliases: aliases, city: true };
}
function island(name, pid, lon, lat, span, aliases, far) {
  return { name: name, pid: pid, lon: lon, lat: lat, span: span, aliases: aliases, far: !!far };
}
var SPOTS = [
  city('Hạ Long', 'quang-ninh', 107.08, 20.95, ['ha long']),
  city('Móng Cái', 'quang-ninh', 107.97, 21.53, ['mong cai']),
  city('Nha Trang', 'khanh-hoa', 109.19, 12.24, ['nha trang']),
  city('Cam Ranh', 'khanh-hoa', 109.16, 11.92, ['cam ranh']),
  city('Phan Rang', 'khanh-hoa', 108.99, 11.57, ['phan rang']),
  city('Đà Lạt', 'lam-dong', 108.44, 11.94, ['da lat', 'dalat']),
  city('Phan Thiết', 'lam-dong', 108.10, 10.93, ['phan thiet']),
  city('Bảo Lộc', 'lam-dong', 107.81, 11.55, ['bao loc']),
  city('Vũng Tàu', 'tp-ho-chi-minh', 107.08, 10.35, ['vung tau']),
  city('Biên Hòa', 'dong-nai', 106.82, 10.95, ['bien hoa']),
  city('Sa Pa', 'lao-cai', 103.84, 22.34, ['sa pa', 'sapa']),
  city('Hội An', 'da-nang', 108.33, 15.88, ['hoi an']),
  city('Tam Kỳ', 'da-nang', 108.48, 15.57, ['tam ky']),
  city('Quy Nhơn', 'gia-lai', 109.22, 13.78, ['quy nhon']),
  city('Pleiku', 'gia-lai', 108.00, 13.98, ['pleiku']),
  city('Buôn Ma Thuột', 'dak-lak', 108.04, 12.67, ['buon ma thuot', 'buon me thuot', 'bmt']),
  city('Tuy Hòa', 'dak-lak', 109.32, 13.09, ['tuy hoa']),
  city('Châu Đốc', 'an-giang', 105.12, 10.70, ['chau doc']),
  city('Rạch Giá', 'an-giang', 105.09, 10.01, ['rach gia']),
  city('Long Xuyên', 'an-giang', 105.43, 10.39, ['long xuyen']),
  city('Mỹ Tho', 'dong-thap', 106.36, 10.36, ['my tho']),
  city('Cao Lãnh', 'dong-thap', 105.63, 10.46, ['cao lanh']),
  city('Sa Đéc', 'dong-thap', 105.76, 10.29, ['sa dec']),
  city('Việt Trì', 'phu-tho', 105.40, 21.32, ['viet tri']),
  city('Đồng Hới', 'quang-tri', 106.62, 17.47, ['dong hoi']),
  island('Phú Quốc', 'an-giang', 103.97, 10.23, 0.9, ['phu quoc']),
  island('Nam Du', 'an-giang', 104.35, 9.68, 0.4, ['nam du']),
  island('Thổ Chu', 'an-giang', 103.47, 9.30, 0.4, ['tho chu']),
  island('Côn Đảo', 'tp-ho-chi-minh', 106.61, 8.69, 0.5, ['con dao', 'con son']),
  island('Cát Bà', 'hai-phong', 107.04, 20.79, 0.45, ['cat ba']),
  island('Bạch Long Vĩ', 'hai-phong', 107.72, 20.13, 0.35, ['bach long vi']),
  island('Cô Tô', 'quang-ninh', 107.77, 20.98, 0.4, ['co to']),
  island('Vân Đồn', 'quang-ninh', 107.45, 21.07, 0.5, ['van don']),
  island('Lý Sơn', 'quang-ngai', 109.12, 15.38, 0.35, ['ly son']),
  island('Cù Lao Chàm', 'da-nang', 108.51, 15.95, 0.35, ['cu lao cham']),
  island('Cồn Cỏ', 'quang-tri', 107.34, 17.16, 0.35, ['dao con co']),
  island('Phú Quý', 'lam-dong', 108.94, 10.52, 0.35, ['phu quy']),
  island('Hòn Khoai', 'ca-mau', 104.83, 8.43, 0.3, ['hon khoai']),
  island('Hòn Chuối', 'ca-mau', 104.33, 8.95, 0.3, ['hon chuoi']),
  island('Hòn Sơn', 'an-giang', 104.63, 9.80, 0.3, ['dao hon son']),
  island('Hải Tặc', 'an-giang', 104.40, 10.26, 0.3, ['dao hai tac']),
  island('Hòn Mê', 'thanh-hoa', 105.92, 19.38, 0.3, ['dao hon me']),
  island('Hòn Ngư', 'nghe-an', 105.77, 18.80, 0.3, ['dao hon ngu']),
  island('Hòn La', 'quang-tri', 106.52, 17.93, 0.3, ['dao hon la']),
  island('Cù Lao Xanh', 'gia-lai', 109.35, 13.62, 0.3, ['cu lao xanh']),
  island('Cù Lao Câu', 'lam-dong', 108.47, 11.22, 0.3, ['cu lao cau']),
  island('Hòn Tre', 'khanh-hoa', 109.23, 12.21, 0.3, ['dao hon tre']),
  island('Bình Ba', 'khanh-hoa', 109.24, 11.84, 0.3, ['dao binh ba']),
  island('Bình Hưng', 'khanh-hoa', 109.25, 11.71, 0.3, ['dao binh hung']),
  island('Quan Lạn', 'quang-ninh', 107.53, 21.02, 0.3, ['quan lan']),
  island('Minh Châu', 'quang-ninh', 107.60, 20.98, 0.3, ['dao minh chau']),
  island('Ngọc Vừng', 'quang-ninh', 107.43, 20.86, 0.3, ['ngoc vung']),
  island('đảo Trần', 'quang-ninh', 108.01, 21.20, 0.3, ['dao tran']),
  island('Cái Chiên', 'quang-ninh', 107.75, 21.33, 0.3, ['cai chien']),
  island('Vĩnh Thực', 'quang-ninh', 108.03, 21.45, 0.3, ['vinh thuc']),
  island('Long Châu', 'hai-phong', 107.12, 20.62, 0.3, ['dao long chau']),
  island('Hòn Dấu', 'hai-phong', 106.80, 20.67, 0.3, ['dao hon dau']),
  island('Quần đảo Hoàng Sa', 'da-nang', 112.00, 16.40, 0.3, ['quan dao hoang sa', 'hoang sa'], true),
  island('Phú Lâm', 'da-nang', 112.33, 16.83, 0.3, ['dao phu lam'], true),
  island('Tri Tôn', 'da-nang', 111.20, 15.78, 0.3, ['dao tri ton'], true),
  island('Linh Côn', 'da-nang', 112.73, 16.67, 0.3, ['dao linh con'], true),
  island('Quần đảo Trường Sa', 'khanh-hoa', 113.50, 9.80, 0.3, ['quan dao truong sa', 'truong sa'], true),
  island('Trường Sa Lớn', 'khanh-hoa', 111.92, 8.64, 0.3, ['truong sa lon'], true),
  island('Song Tử Tây', 'khanh-hoa', 114.33, 11.43, 0.3, ['song tu tay'], true),
  island('Sinh Tồn', 'khanh-hoa', 114.33, 9.88, 0.3, ['dao sinh ton'], true),
  island('Nam Yết', 'khanh-hoa', 114.36, 10.18, 0.3, ['nam yet'], true),
  island('Sơn Ca', 'khanh-hoa', 114.48, 10.38, 0.3, ['dao son ca'], true),
  island('An Bang', 'khanh-hoa', 112.92, 7.89, 0.3, ['dao an bang'], true),
  island('Phan Vinh', 'khanh-hoa', 113.70, 8.95, 0.3, ['dao phan vinh'], true),
  island('Đá Tây', 'khanh-hoa', 112.25, 8.85, 0.3, ['dao da tay'], true),
  island('Len Đao', 'khanh-hoa', 114.27, 9.78, 0.3, ['dao len dao'], true)
];

/* ---------- Chuan hoa chu ---------- */
/* Bo dau, ve chu thuong, chi giu a-z0-9, 1 khoang trang. */
function norm(s) {
  return String(s || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd').toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ').trim();
}
function slug(name) { return norm(name).replace(/ /g, '-'); }

/* Xet dau TRUOC khi bo dau de tranh bat nham chu thuong:
   "chi Hue" khong phai Hue, "hon la" khong phai Hon La,
   "con co" khong phai Con Co, "len dao" khong phai Len Dao.
   Go co dau "Hon La", "Con Co", "Len Dao" thi coi nhu da ghi "dao". */
var FALSE_WORDS = /(^|[^\p{L}])(huệ|hơn|còn|hôn)(?=$|[^\p{L}])/gu;
function prep(text) {
  return String(text || '')
    .normalize('NFC').toLowerCase()
    .replace(FALSE_WORDS, '$1 ')
    .replace(/sơn là/g, 'sơn ')
    .replace(/hòn |cồn cỏ|len đao/g, function (m) { return 'đảo ' + m; });
}

/* Go dinh lien: "thanhhoa", "danang", "halong" van nhan. */
function withJoined(list) {
  var out = list.slice();
  list.forEach(function (a) {
    if (a.indexOf(' ') >= 0 && a.length >= 7 && a.indexOf('dao ') !== 0) out.push(a.replace(/ /g, ''));
  });
  return out;
}

/* Bang tra cuu: cach goi dai xet truoc. */
function buildIndex(entries) {
  var idx = [];
  entries.forEach(function (e) {
    withJoined(e.aliases).forEach(function (a) { idx.push({ a: ' ' + a + ' ', v: e.v }); });
  });
  idx.sort(function (x, y) { return y.a.length - x.a.length; });
  return idx;
}
var SPOT_INDEX = buildIndex(SPOTS.map(function (s) { return { aliases: s.aliases, v: s }; }));
var PROV_INDEX = buildIndex(
  PROVINCES.map(function (p) { return { aliases: p.aliases, v: p }; })
    .concat(SPOTS.map(function (s) { return { aliases: s.aliases, v: PROVINCE_BY_ID[s.pid] }; }))
);

function findSpot(text) {
  var t = ' ' + norm(prep(text)) + ' ';
  for (var i = 0; i < SPOT_INDEX.length; i++) {
    if (t.indexOf(SPOT_INDEX[i].a) >= 0) return SPOT_INDEX[i].v;
  }
  return null;
}

/* Tinh nhac toi dau tien trong comment; trung vi tri thi lay cach goi dai hon. */
function findProvince(text) {
  var t = ' ' + norm(prep(text)) + ' ';
  var best = null;
  for (var i = 0; i < PROV_INDEX.length; i++) {
    var a = PROV_INDEX[i].a;
    var at = t.indexOf(a);
    if (at >= 0 && (!best || at < best.i || (at === best.i && a.length > best.len))) {
      best = { i: at, len: a.length, p: PROVINCE_BY_ID[PROV_INDEX[i].v.id] };
    }
  }
  return best ? best.p : null;
}

W.PROVINCES = PROVINCES;
W.PROVINCE_BY_ID = PROVINCE_BY_ID;
W.SPOTS = SPOTS;
W.norm = norm;
W.slug = slug;
W.findProvince = findProvince;
W.findSpot = findSpot;
})();
