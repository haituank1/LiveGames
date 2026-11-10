/* Chuyen MC ke khi ban do ghe tung tinh: mon ngon, noi nen ghe, loi khen
   ba con o do. Cau van o day do toi viet lai hoan toan; ten mon an va
   dia danh la du kien thuc te ai cung biet. Moi luot chi doc 1 mon +
   1 noi, thi thoang moi them 1 cau khen, de giong khong bi dai. */
(function () {
'use strict';
var W = (window.QueHuong = window.QueHuong || {});

var TALK = {
  'an-giang': { foods: ['bún cá Châu Đốc', 'mắm Châu Đốc', 'gỏi cá trích', 'nước mắm Phú Quốc'], places: ['núi Sam', 'rừng tràm Trà Sư', 'đảo Phú Quốc', 'chợ nổi Châu Đốc'], people: ['Bà con An Giang sống chân thành, khách tới nhà là mời cơm ngay.', 'Miền sông nước này ai tới rồi cũng nhớ cái tình của người ta.'] },
  'bac-ninh': { foods: ['bánh phu thê Đình Bảng', 'nem Bùi', 'vải thiều Lục Ngạn', 'mì Chũ'], places: ['chùa Dâu', 'chùa Phật Tích', 'đền Đô', 'Tây Yên Tử'], people: ['Xứ Kinh Bắc người ta ăn nói nhẹ nhàng, nghe câu quan họ là thấy thương.', 'Đất quan họ giữ nếp xưa, khách tới là mời trầu mời nước đủ lễ.'] },
  'ca-mau': { foods: ['cua Cà Mau', 'ba khía', 'bánh tằm Bạc Liêu', 'tôm khô Rạch Gốc'], places: ['Mũi Cà Mau', 'rừng U Minh Hạ', 'nhà Công tử Bạc Liêu', 'cánh đồng quạt gió Bạc Liêu'], people: ['Người đất Mũi nói chuyện thẳng thắn, chơi với bạn là hết lòng.', 'Bà con Cà Mau mê đờn ca, sống phóng khoáng mà nghĩa tình.'] },
  'can-tho': { foods: ['bánh pía Sóc Trăng', 'bún nước lèo', 'lẩu mắm', 'bánh cống'], places: ['chợ nổi Cái Răng', 'bến Ninh Kiều', 'chùa Dơi', 'chợ nổi Ngã Bảy'], people: ['Người Cần Thơ đón khách như đón người nhà, giọng ngọt như nước sông Hậu.', 'Miền Tây là vậy đó, ai ghé qua cũng được tiếp đãi tử tế.'] },
  'cao-bang': { foods: ['bánh cuốn Cao Bằng', 'hạt dẻ Trùng Khánh', 'lạp sườn hun khói'], places: ['thác Bản Giốc', 'hang Pác Bó', 'động Ngườm Ngao'], people: ['Bà con Cao Bằng thật thà, mến khách, ở rồi là chẳng muốn về.', 'Người vùng cao ở đây hiền lắm, gặp khách là cười trước đã.'] },
  'da-nang': { foods: ['mì Quảng', 'bánh tráng cuốn thịt heo', 'cao lầu Hội An', 'gà Tam Kỳ'], places: ['Bà Nà', 'cầu Rồng', 'Ngũ Hành Sơn', 'phố cổ Hội An', 'thánh địa Mỹ Sơn'], people: ['Người xứ Quảng thẳng tính, thương ai là thương thật lòng.', 'Đà Nẵng được khen là thành phố đáng sống, cũng vì người ở đây sống tử tế.'] },
  'dak-lak': { foods: ['cà phê Buôn Ma Thuột', 'bơ Đắk Lắk', 'bánh canh hẹ', 'mắt cá ngừ đại dương'], places: ['hồ Lắk', 'thác Dray Nur', 'Gành Đá Đĩa', 'Mũi Điện'], people: ['Bà con Tây Nguyên hồn hậu, uống chung ly cà phê là thành anh em.', 'Người Phú Yên hiền lành, chân thật như biển quê mình.'] },
  'dien-bien': { foods: ['gạo Điện Biên', 'xôi nếp nương', 'thịt trâu gác bếp'], places: ['đồi A1', 'hầm Đờ Cát', 'cánh đồng Mường Thanh', 'Mường Phăng'], people: ['Người Điện Biên kiên cường mà hiền hậu, tiếp khách bằng cả tấm lòng.', 'Mảnh đất lịch sử này, con người ở đây đáng nể lắm.'] },
  'dong-nai': { foods: ['bưởi Tân Triều', 'hạt điều Bình Phước', 'chôm chôm Long Khánh'], places: ['Vườn quốc gia Cát Tiên', 'thác Giang Điền', 'Văn miếu Trấn Biên', 'núi Bà Rá'], people: ['Bà con Đồng Nai, Bình Phước cần cù, sống chân tình với nhau.', 'Người ở đây chịu khó làm ăn, mà sống rất có nghĩa.'] },
  'dong-thap': { foods: ['hủ tiếu Sa Đéc', 'nem Lai Vung', 'hủ tiếu Mỹ Tho', 'vú sữa Lò Rèn'], places: ['làng hoa Sa Đéc', 'đồng sen Tháp Mười', 'Tràm Chim', 'cù lao Thới Sơn'], people: ['Đất sen hồng, người Đồng Tháp hiền như hoa sen vậy.', 'Bà con Tiền Giang, Đồng Tháp sống hiền hòa, mến khách lắm.'] },
  'gia-lai': { foods: ['phở khô Gia Lai', 'bánh xèo tôm nhảy', 'nem chợ Huyện', 'bánh hỏi cháo lòng'], places: ['Biển Hồ Pleiku', 'núi lửa Chư Đăng Ya', 'Kỳ Co Eo Gió', 'tháp Đôi'], people: ['Đất võ Bình Định, người ta trọng nghĩa khí, nói là làm.', 'Bà con Gia Lai chân thành, ấm áp như bếp lửa nhà sàn.'] },
  'ha-noi': { foods: ['phở', 'bún chả', 'chả cá Lã Vọng', 'cốm làng Vòng'], places: ['hồ Gươm', 'Văn Miếu', 'phố cổ', 'chùa Một Cột'], people: ['Người Tràng An thanh lịch, nói năng nhẹ nhàng, nghe là quý.', 'Thủ đô ngàn năm văn hiến, người Hà Nội sâu sắc và tinh tế.'] },
  'ha-tinh': { foods: ['kẹo cu đơ', 'cam bù Hương Sơn', 'ram bánh mướt'], places: ['biển Thiên Cầm', 'Ngã ba Đồng Lộc', 'chùa Hương Tích', 'khu lưu niệm Nguyễn Du'], people: ['Người Hà Tĩnh hiếu học, chịu thương chịu khó, câu ví giặm nghe mặn mà.', 'Đất Hồng Lam, người cần cù, sống tình nghĩa với nhau.'] },
  'hai-phong': { foods: ['bánh đa cua', 'nem cua bể', 'bánh đậu xanh Hải Dương', 'vải thiều Thanh Hà'], places: ['Cát Bà', 'Đồ Sơn', 'Côn Sơn Kiếp Bạc'], people: ['Người Hải Phòng thẳng thắn, hào sảng, chơi là chơi hết mình.', 'Đất Cảng, người thật thà, nói một là một.'] },
  'hue': { foods: ['bún bò Huế', 'cơm hến', 'bánh bèo', 'chè Huế'], places: ['Đại Nội', 'chùa Thiên Mụ', 'sông Hương', 'lăng Khải Định'], people: ['Người Huế nhẹ nhàng, nết na, giọng nói nghe là nhớ.', 'Cố đô trầm mặc, con người ở đây chu đáo và tinh tế.'] },
  'hung-yen': { foods: ['nhãn lồng Hưng Yên', 'gà Đông Tảo', 'bánh cáy Thái Bình', 'canh cá Quỳnh Côi'], places: ['Phố Hiến', 'đền Mẫu', 'chùa Keo'], people: ['Người Hưng Yên, Thái Bình cần cù, quý người, chăm làm.', 'Đất lúa quê lụa, người ở đây chân chất, thật lòng.'] },
  'khanh-hoa': { foods: ['yến sào', 'bún cá Nha Trang', 'nem Ninh Hòa', 'nho Ninh Thuận'], places: ['vịnh Nha Trang', 'tháp Bà Ponagar', 'vịnh Vĩnh Hy', 'quần đảo Trường Sa'], people: ['Người Khánh Hòa hiền hòa, mến khách, như biển xanh ở đó.', 'Bà con Ninh Thuận nắng gió mà vẫn tươi tắn, chịu thương chịu khó.'] },
  'lai-chau': { foods: ['chè Tam Đường', 'thịt trâu gác bếp', 'cơm lam'], places: ['đèo Ô Quy Hồ', 'cao nguyên Sìn Hồ', 'đỉnh Pu Ta Leng'], people: ['Bà con các dân tộc Lai Châu chân chất, hiền lành, hiếu khách.', 'Người vùng cao sống thật, đãi khách bằng cả tấm lòng.'] },
  'lam-dong': { foods: ['dâu tây Đà Lạt', 'atiso', 'bánh tráng nướng', 'thanh long Bình Thuận', 'nước mắm Phan Thiết'], places: ['hồ Xuân Hương', 'đồi cát Mũi Né', 'công viên địa chất Đắk Nông', 'thác Đray Sáp'], people: ['Người Đà Lạt nhẹ nhàng, dễ thương như sương sớm.', 'Bà con Lâm Đồng hiền hòa, mến khách, ai lên chơi cũng thấy ấm.'] },
  'lang-son': { foods: ['vịt quay Lạng Sơn', 'phở chua', 'khâu nhục', 'bánh cuốn trứng'], places: ['động Tam Thanh', 'núi Mẫu Sơn', 'thành nhà Mạc', 'ải Chi Lăng'], people: ['Người xứ Lạng hiền hậu, nghĩa tình với khách.', 'Bà con Lạng Sơn mến khách, mời ly rượu là thành bạn.'] },
  'lao-cai': { foods: ['thắng cố', 'cá hồi Sa Pa', 'xôi ngũ sắc', 'xôi nếp Tú Lệ'], places: ['Sa Pa', 'đỉnh Fansipan', 'ruộng bậc thang Mù Cang Chải', 'hồ Thác Bà'], people: ['Bà con vùng cao Lào Cai, Yên Bái chân thành, chịu khó.', 'Người miền núi sống thật, cười là cười hết lòng.'] },
  'nghe-an': { foods: ['cháo lươn', 'nhút Thanh Chương', 'bánh mướt', 'cam Vinh'], places: ['quê Bác ở Kim Liên', 'biển Cửa Lò', 'Vườn quốc gia Pù Mát'], people: ['Người xứ Nghệ chịu thương chịu khó, hiếu học, thương nhau thật lòng.', 'Giọng Nghệ nghe mộc mà ấm, người Nghệ sống nghĩa tình.'] },
  'ninh-binh': { foods: ['dê núi', 'cơm cháy Ninh Bình', 'phở bò Nam Định', 'cá kho làng Vũ Đại'], places: ['Tràng An', 'Tam Cốc', 'chùa Bái Đính', 'Tam Chúc', 'phủ Dầy'], people: ['Người Ninh Bình, Nam Định, Hà Nam hiếu học, cần cù.', 'Đất cố đô Hoa Lư, người ở đây hiền và giữ nếp nhà lắm.'] },
  'phu-tho': { foods: ['bánh chưng bánh giầy', 'thịt chua Thanh Sơn', 'cơm lam Hòa Bình'], places: ['Đền Hùng', 'Tam Đảo', 'Mai Châu', 'hồ thủy điện Hòa Bình'], people: ['Đất Tổ là nơi người Việt mình nhớ về cội nguồn.', 'Người Phú Thọ, Vĩnh Phúc, Hòa Bình hiền hậu, quý khách.'] },
  'quang-ngai': { foods: ['đường phèn', 'cá bống sông Trà', 'tỏi Lý Sơn', 'gỏi lá Kon Tum'], places: ['đảo Lý Sơn', 'Măng Đen', 'nhà thờ gỗ Kon Tum'], people: ['Người Quảng Ngãi chịu thương chịu khó, sống thẳng thắn.', 'Bà con Kon Tum hiền lành, chân thật như núi rừng.'] },
  'quang-ninh': { foods: ['chả mực Hạ Long', 'sá sùng', 'bánh cuốn chả mực'], places: ['vịnh Hạ Long', 'Yên Tử', 'đảo Cô Tô', 'Bãi Cháy'], people: ['Người vùng mỏ kiên cường, kỷ luật mà trọng đồng đội.', 'Người Quảng Ninh hào sảng, tiếp khách nhiệt tình.'] },
  'quang-tri': { foods: ['cháo vạt giường', 'bánh bột lọc Quảng Bình', 'khoai deo'], places: ['Phong Nha Kẻ Bàng', 'hang Sơn Đoòng', 'thành cổ Quảng Trị', 'cầu Hiền Lương'], people: ['Người Quảng Trị, Quảng Bình kiên cường, sống nghĩa tình.', 'Đất nắng gió mà người ở đây hiền và rất kiên nhẫn.'] },
  'son-la': { foods: ['thịt trâu gác bếp', 'mận hậu Mộc Châu', 'sữa Mộc Châu', 'cá nướng pa pỉnh tộp'], places: ['cao nguyên Mộc Châu', 'đồi chè trái tim', 'nhà tù Sơn La'], people: ['Bà con Sơn La thật thà, mến khách, xòe hoa là kéo cả bản cùng vui.', 'Người Tây Bắc sống chân thành, đãi khách hết lòng.'] },
  'tay-ninh': { foods: ['bánh tráng phơi sương Trảng Bàng', 'muối tôm Tây Ninh', 'dưa hấu Long An'], places: ['núi Bà Đen', 'Tòa Thánh Cao Đài', 'làng nổi Tân Lập'], people: ['Người Tây Ninh, Long An hiền hòa, chân chất.', 'Bà con ở đây làm lụng giỏi mà sống rất tình cảm.'] },
  'thai-nguyen': { foods: ['chè Tân Cương', 'bánh chưng Bờ Đậu', 'hồng không hạt Bắc Kạn'], places: ['hồ Núi Cốc', 'ATK Định Hóa', 'hồ Ba Bể'], people: ['Người Thái Nguyên chân thành, mời chén trà là thấy ấm lòng.', 'Bà con Bắc Kạn hiền lành, mến khách.'] },
  'thanh-hoa': { foods: ['nem chua', 'bánh gai Tứ Trụ', 'chè lam Phủ Quảng'], places: ['biển Sầm Sơn', 'thành nhà Hồ', 'Pù Luông', 'suối cá thần Cẩm Lương'], people: ['Người xứ Thanh ân tình, nói là làm.', 'Bà con Thanh Hóa chịu khó, đi đâu cũng nhớ quê.'] },
  'tp-ho-chi-minh': { foods: ['cơm tấm', 'bánh mì Sài Gòn', 'hủ tiếu', 'bánh khọt Vũng Tàu'], places: ['chợ Bến Thành', 'Nhà thờ Đức Bà', 'biển Vũng Tàu', 'Côn Đảo', 'chùa Bà Thiên Hậu Bình Dương'], people: ['Người Sài Gòn phóng khoáng, thấy ai khó là giúp liền.', 'Thành phố nghĩa tình, ai tới cũng có chỗ làm ăn, có bạn bè.'] },
  'tuyen-quang': { foods: ['cam sành Hàm Yên', 'thắng dền Hà Giang', 'bánh cuốn trứng Hà Giang', 'mèn mén'], places: ['Tân Trào', 'cột cờ Lũng Cú', 'đèo Mã Pì Lèng', 'cao nguyên đá Đồng Văn'], people: ['Bà con Hà Giang, Tuyên Quang chân chất, hiếu khách.', 'Người vùng cao ở đây giữ đất, giữ biên cương, đáng quý lắm.'] },
  'vinh-long': { foods: ['kẹo dừa Bến Tre', 'bưởi Năm Roi', 'bún nước lèo Trà Vinh'], places: ['cù lao An Bình', 'ao Bà Om', 'Cồn Phụng'], people: ['Người Vĩnh Long, Bến Tre, Trà Vinh hiền như mạch nước dừa.', 'Bà con miền Tây ở đây thật lòng, mời khách là mời cho no.'] }
};

/* Thi thoang khen chung nguoi Viet minh. */
var VIET_PRAISE = [
  'Người Việt mình đi đâu cũng thương nhau, nhắc tới quê là thấy ấm lòng.',
  'Đất nước mình đẹp, mà đẹp nhất vẫn là con người.',
  'Người Việt mình hiếu khách, chịu khó, và rất nghĩa tình.',
  'Ba miền một nhà, nghe ai gọi tên quê cũng thấy thương.'
];

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

/* Ngan gon: 1 mon + 1 noi, 1/5 luot them 1 cau khen. */
function talkAbout(pid, prov) {
  var t = TALK[pid];
  if (!t) return '';
  var food = pick(t.foods);
  var place = pick(t.places);
  var r = Math.random();
  var line;
  if (r < 0.35) line = 'Nhắc tới ' + prov + ' là nhớ ngay ' + food + '.';
  else if (r < 0.6) line = 'Về ' + prov + ' nhớ ghé ' + place + ' một lần nha.';
  else line = prov + ' có ' + food + ', lại có ' + place + ' nữa.';
  if (Math.random() < 0.2) line += ' ' + (Math.random() < 0.3 ? pick(VIET_PRAISE) : pick(t.people));
  return line;
}

W.PROVINCE_TALK = TALK;
W.VIET_PRAISE = VIET_PRAISE;
W.talkAbout = talkAbout;
})();
