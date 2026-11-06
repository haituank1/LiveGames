/* Ngân hàng câu đảo chữ — Lớp học chữ.
   Sinh bằng tools/tao-giong-lop-hoc.js? Không — sinh bằng /tmp/gen-lop-hoc-questions.js
   (xáo trộn có seed theo chỉ số câu, đã kiểm tra: đảo chữ là hoán vị đúng
   của đáp án, khác đáp án gốc; gợi ý không chứa đáp án).
   Trường: a = đáp án, s = đảo chữ, h = gợi ý, d = độ khó 1-3, c = chủ đề
   (lich-su / doi-song / do-an / dia-ly). */
(function () {
'use strict';
const W = (window.Classroom = window.Classroom || {});
W.QUESTIONS = [
  {
    "a": "GIA LONG",
    "s": "AGI GNOL",
    "h": "Vị vua đầu tiên của nhà Nguyễn",
    "d": 2,
    "c": "lich-su"
  },
  {
    "a": "QUANG TRUNG",
    "s": "QUNAG UTGRN",
    "h": "Vua áo vải đánh thắng quân Thanh ở Đống Đa",
    "d": 2,
    "c": "lich-su"
  },
  {
    "a": "HAI BÀ TRƯNG",
    "s": "AIH ÀB GRNTƯ",
    "h": "Hai chị em khởi nghĩa chống quân Hán",
    "d": 2,
    "c": "lich-su"
  },
  {
    "a": "TRẦN HƯNG ĐẠO",
    "s": "ẦRNT NHGƯ ĐOẠ",
    "h": "Vị tướng ba lần đánh thắng quân Nguyên Mông",
    "d": 3,
    "c": "lich-su"
  },
  {
    "a": "LÊ LỢI",
    "s": "ÊL ỢLI",
    "h": "Vị vua khởi nghĩa Lam Sơn, trả gươm Hồ Gươm",
    "d": 2,
    "c": "lich-su"
  },
  {
    "a": "NGUYỄN TRÃI",
    "s": "YNNỄUG RÃIT",
    "h": "Tác giả Bình Ngô đại cáo",
    "d": 3,
    "c": "lich-su"
  },
  {
    "a": "ĐINH BỘ LĨNH",
    "s": "NIĐH ỘB ĨNLH",
    "h": "Vua dẹp loạn mười hai sứ quân",
    "d": 3,
    "c": "lich-su"
  },
  {
    "a": "LÝ THÁI TỔ",
    "s": "ÝL TÁHI ỔT",
    "h": "Vua dời đô về Thăng Long",
    "d": 2,
    "c": "lich-su"
  },
  {
    "a": "HỒ CHÍ MINH",
    "s": "ỒH ÍHC IHNM",
    "h": "Vị lãnh tụ vĩ đại của dân tộc Việt Nam",
    "d": 1,
    "c": "lich-su"
  },
  {
    "a": "VÕ NGUYÊN GIÁP",
    "s": "ÕV NNUYÊG IGÁP",
    "h": "Vị đại tướng của chiến dịch Điện Biên Phủ",
    "d": 2,
    "c": "lich-su"
  },
  {
    "a": "PHẠM NGŨ LÃO",
    "s": "ẠHPM ŨGN OÃL",
    "h": "Vị tướng đan sọt mà đọc binh thư",
    "d": 3,
    "c": "lich-su"
  },
  {
    "a": "TRẦN QUỐC TUẤN",
    "s": "ẦRNT CQUỐ UTẤN",
    "h": "Tên thật của Hưng Đạo Vương",
    "d": 3,
    "c": "lich-su"
  },
  {
    "a": "NGUYỄN HUỆ",
    "s": "ỄUGNNY HỆU",
    "h": "Tên thật của vua Quang Trung",
    "d": 2,
    "c": "lich-su"
  },
  {
    "a": "BẠCH ĐẰNG",
    "s": "HẠBC ẰĐNG",
    "h": "Dòng sông gắn với trận cọc gỗ của Ngô Quyền",
    "d": 2,
    "c": "lich-su"
  },
  {
    "a": "ĐIỆN BIÊN PHỦ",
    "s": "NIỆĐ BÊNI HPỦ",
    "h": "Chiến thắng lừng lẫy năm một chín năm tư",
    "d": 2,
    "c": "lich-su"
  },
  {
    "a": "CHI LĂNG",
    "s": "CIH ĂNLG",
    "h": "Ải quan nơi Liễu Thăng tử trận",
    "d": 3,
    "c": "lich-su"
  },
  {
    "a": "NGỌC HỒI",
    "s": "ỌCGN ỒIH",
    "h": "Trận đánh mở màn đại phá quân Thanh",
    "d": 3,
    "c": "lich-su"
  },
  {
    "a": "ĐỐNG ĐA",
    "s": "ĐỐGN AĐ",
    "h": "Gò gắn với chiến thắng mùng năm Tết",
    "d": 2,
    "c": "lich-su"
  },
  {
    "a": "RẠCH GẦM",
    "s": "ẠCRH ẦGM",
    "h": "Trận thủy chiến của Nguyễn Huệ ở miền Tây",
    "d": 3,
    "c": "lich-su"
  },
  {
    "a": "XOÀI MÚT",
    "s": "XÀIO MTÚ",
    "h": "Trận đánh cùng cặp với Rạch Gầm",
    "d": 3,
    "c": "lich-su"
  },
  {
    "a": "THĂNG LONG",
    "s": "NHĂGT GOLN",
    "h": "Tên cũ của Hà Nội, nghĩa là rồng bay lên",
    "d": 1,
    "c": "lich-su"
  },
  {
    "a": "HOÀNG SA",
    "s": "HÀOGN AS",
    "h": "Quần đảo của Việt Nam ở Biển Đông",
    "d": 1,
    "c": "lich-su"
  },
  {
    "a": "TRƯỜNG SA",
    "s": "RƯTNGỜ AS",
    "h": "Quần đảo lớn nhất của Việt Nam ở Biển Đông",
    "d": 1,
    "c": "lich-su"
  },
  {
    "a": "CỔ LOA",
    "s": "ỔC AOL",
    "h": "Thành cổ hình ốc của An Dương Vương",
    "d": 2,
    "c": "lich-su"
  },
  {
    "a": "AN DƯƠNG VƯƠNG",
    "s": "NA DNƯƠG GƯNƠV",
    "h": "Vua xây thành Cổ Loa, có nỏ thần",
    "d": 2,
    "c": "lich-su"
  },
  {
    "a": "HÙNG VƯƠNG",
    "s": "HNÙG ƯƠGNV",
    "h": "Vị vua đầu tiên của nước Văn Lang",
    "d": 1,
    "c": "lich-su"
  },
  {
    "a": "LÊ THÁNH TÔNG",
    "s": "ÊL HTHNÁ TGÔN",
    "h": "Vua thời Hồng Đức, nổi tiếng trị nước giỏi",
    "d": 3,
    "c": "lich-su"
  },
  {
    "a": "NGUYỄN ÁNH",
    "s": "UNỄNGY ÁHN",
    "h": "Tên vua Gia Long trước khi lên ngôi",
    "d": 3,
    "c": "lich-su"
  },
  {
    "a": "MINH MẠNG",
    "s": "MHNI ẠNGM",
    "h": "Vua nhà Nguyễn nổi tiếng nghiêm khắc",
    "d": 3,
    "c": "lich-su"
  },
  {
    "a": "TỰ ĐỨC",
    "s": "ỰT ĐCỨ",
    "h": "Vị vua nhà Nguyễn làm thơ rất hay",
    "d": 3,
    "c": "lich-su"
  },
  {
    "a": "COMPA",
    "s": "OAMCP",
    "h": "Dụng cụ vẽ hình tròn trong hộp bút",
    "d": 1,
    "c": "doi-song"
  },
  {
    "a": "THƯỚC KẺ",
    "s": "ỚƯTHC ẺK",
    "h": "Dụng cụ kẻ đường thẳng",
    "d": 1,
    "c": "doi-song"
  },
  {
    "a": "BÀN PHÍM",
    "s": "ÀNB ÍMHP",
    "h": "Gõ chữ trên máy tính bằng thứ này",
    "d": 1,
    "c": "doi-song"
  },
  {
    "a": "CÁI BÀN",
    "s": "CIÁ NÀB",
    "h": "Đồ dùng để ngồi học, có bốn chân",
    "d": 1,
    "c": "doi-song"
  },
  {
    "a": "CÁI GHẾ",
    "s": "ICÁ ẾGH",
    "h": "Ngồi học phải có thứ này",
    "d": 1,
    "c": "doi-song"
  },
  {
    "a": "ĐÈN HỌC",
    "s": "NÈĐ ỌHC",
    "h": "Bật lên khi học bài buổi tối",
    "d": 1,
    "c": "doi-song"
  },
  {
    "a": "CẶP SÁCH",
    "s": "PCẶ HCSÁ",
    "h": "Đeo sau lưng đi học mỗi ngày",
    "d": 1,
    "c": "doi-song"
  },
  {
    "a": "BÚT CHÌ",
    "s": "TBÚ ÌCH",
    "h": "Viết được, tẩy được",
    "d": 1,
    "c": "doi-song"
  },
  {
    "a": "BÚT MỰC",
    "s": "BTÚ ỰCM",
    "h": "Viết ra mực xanh, mực tím",
    "d": 1,
    "c": "doi-song"
  },
  {
    "a": "CỤC TẨY",
    "s": "CCỤ YTẨ",
    "h": "Cục nhỏ dùng để tẩy chữ bút chì",
    "d": 1,
    "c": "doi-song"
  },
  {
    "a": "VỞ GHI",
    "s": "ỞV HIG",
    "h": "Quyển để ghi chép bài học",
    "d": 1,
    "c": "doi-song"
  },
  {
    "a": "BẢNG ĐEN",
    "s": "BNGẢ ĐNE",
    "h": "Cô giáo viết bài lên đây",
    "d": 1,
    "c": "doi-song"
  },
  {
    "a": "PHẤN TRẮNG",
    "s": "NẤPH NẮRTG",
    "h": "Viên trắng viết lên bảng đen",
    "d": 1,
    "c": "doi-song"
  },
  {
    "a": "KỆ SÁCH",
    "s": "ỆK CHÁS",
    "h": "Giá để sách ngay ngắn trên bàn",
    "d": 2,
    "c": "doi-song"
  },
  {
    "a": "ĐỒNG HỒ",
    "s": "GNỒĐ ỒH",
    "h": "Xem giờ bằng thứ này",
    "d": 1,
    "c": "doi-song"
  },
  {
    "a": "QUẠT ĐIỆN",
    "s": "TQẠU ĐỆIN",
    "h": "Bật lên cho mát khi trời nóng",
    "d": 1,
    "c": "doi-song"
  },
  {
    "a": "ĐÈN BÀN",
    "s": "ĐNÈ BNÀ",
    "h": "Đèn nhỏ đặt trên bàn học",
    "d": 1,
    "c": "doi-song"
  },
  {
    "a": "GHẾ XOAY",
    "s": "GẾH AXOY",
    "h": "Ghế ngồi có bánh xe, xoay được",
    "d": 2,
    "c": "doi-song"
  },
  {
    "a": "TỦ SÁCH",
    "s": "ỦT SHCÁ",
    "h": "Tủ đựng sách trong lớp học",
    "d": 1,
    "c": "doi-song"
  },
  {
    "a": "HỘP BÚT",
    "s": "PHỘ ÚTB",
    "h": "Hộp đựng bút chì, bút mực",
    "d": 1,
    "c": "doi-song"
  },
  {
    "a": "THƯỚC ĐO",
    "s": "CƯHTỚ OĐ",
    "h": "Dụng cụ đo độ dài có vạch chia",
    "d": 2,
    "c": "doi-song"
  },
  {
    "a": "MÁY TÍNH",
    "s": "ÁYM TÍHN",
    "h": "Máy để gõ văn bản, chơi game",
    "d": 1,
    "c": "doi-song"
  },
  {
    "a": "ĐIỆN THOẠI",
    "s": "ỆĐIN HOTẠI",
    "h": "Gọi điện, nhắn tin bằng thứ này",
    "d": 1,
    "c": "doi-song"
  },
  {
    "a": "XE ĐẠP",
    "s": "EX PĐẠ",
    "h": "Hai bánh, đạp bằng chân",
    "d": 1,
    "c": "doi-song"
  },
  {
    "a": "XE MÁY",
    "s": "EX YMÁ",
    "h": "Hai bánh, chạy bằng xăng",
    "d": 1,
    "c": "doi-song"
  },
  {
    "a": "ÁO DÀI",
    "s": "OÁ ÀID",
    "h": "Trang phục truyền thống của Việt Nam",
    "d": 1,
    "c": "doi-song"
  },
  {
    "a": "KHĂN QUÀNG",
    "s": "KĂHN NQGUÀ",
    "h": "Đồ đội viên đeo ở cổ, màu đỏ",
    "d": 2,
    "c": "doi-song"
  },
  {
    "a": "NÓN LÁ",
    "s": "ÓNN ÁL",
    "h": "Mũ hình nón làm bằng lá",
    "d": 1,
    "c": "doi-song"
  },
  {
    "a": "GUỐC MỘC",
    "s": "ỐCGU ỘCM",
    "h": "Dép gỗ truyền thống ngày xưa",
    "d": 2,
    "c": "doi-song"
  },
  {
    "a": "CHIẾU TRE",
    "s": "ẾIHCU RTE",
    "h": "Chiếu đan bằng tre, trải ra ngồi",
    "d": 2,
    "c": "doi-song"
  },
  {
    "a": "BÁNH MÌ",
    "s": "HÁNB ÌM",
    "h": "Món ăn kẹp thịt, pate nổi tiếng Việt Nam",
    "d": 1,
    "c": "do-an"
  },
  {
    "a": "PHỞ BÒ",
    "s": "HỞP ÒB",
    "h": "Món nước có bánh phở và thịt bò",
    "d": 1,
    "c": "do-an"
  },
  {
    "a": "BÚN CHẢ",
    "s": "ÚBN CẢH",
    "h": "Món Hà Nội có bún và chả nướng",
    "d": 1,
    "c": "do-an"
  },
  {
    "a": "CƠM TẤM",
    "s": "MCƠ ẤTM",
    "h": "Cơm với sườn nướng, bì, chả trứng",
    "d": 2,
    "c": "do-an"
  },
  {
    "a": "BÁNH CHƯNG",
    "s": "ÁNHB NCHƯG",
    "h": "Bánh vuông gói lá dong ngày Tết",
    "d": 1,
    "c": "do-an"
  },
  {
    "a": "BÁNH XÈO",
    "s": "ÁBNH OÈX",
    "h": "Bánh vàng giòn, cuốn rau chấm nước mắm",
    "d": 2,
    "c": "do-an"
  },
  {
    "a": "GỎI CUỐN",
    "s": "IGỎ ỐCUN",
    "h": "Cuốn tôm thịt trong bánh tráng mỏng",
    "d": 1,
    "c": "do-an"
  },
  {
    "a": "NEM RÁN",
    "s": "ENM RNÁ",
    "h": "Món chiên giòn, còn gọi là chả giò",
    "d": 2,
    "c": "do-an"
  },
  {
    "a": "CHÈ BA MÀU",
    "s": "HÈC AB ÀMU",
    "h": "Chè có ba màu xanh đỏ vàng",
    "d": 2,
    "c": "do-an"
  },
  {
    "a": "TRÀ SỮA",
    "s": "RTÀ ASỮ",
    "h": "Thức uống có trân châu đen",
    "d": 1,
    "c": "do-an"
  },
  {
    "a": "CÀ PHÊ",
    "s": "ÀC HPÊ",
    "h": "Thức uống đắng, buổi sáng hay uống",
    "d": 1,
    "c": "do-an"
  },
  {
    "a": "SINH TỐ",
    "s": "IHSN ỐT",
    "h": "Trái cây xay với đá và sữa",
    "d": 1,
    "c": "do-an"
  },
  {
    "a": "BÁNH FLAN",
    "s": "NHBÁ FANL",
    "h": "Bánh mềm mịn làm từ trứng và sữa",
    "d": 2,
    "c": "do-an"
  },
  {
    "a": "KEM DỪA",
    "s": "MKE AỪD",
    "h": "Kem mát lạnh vị dừa",
    "d": 1,
    "c": "do-an"
  },
  {
    "a": "XÔI GẤC",
    "s": "IÔX CẤG",
    "h": "Xôi màu đỏ cam, ăn ngày Tết",
    "d": 2,
    "c": "do-an"
  },
  {
    "a": "MÌ QUẢNG",
    "s": "ÌM UQNGẢ",
    "h": "Món mì đặc sản xứ Quảng, có tôm thịt và đậu phộng",
    "d": 2,
    "c": "do-an"
  },
  {
    "a": "CAO LẦU",
    "s": "OAC ẦLU",
    "h": "Món mì đặc sản của Hội An",
    "d": 3,
    "c": "do-an"
  },
  {
    "a": "BÚN BÒ",
    "s": "NBÚ ÒB",
    "h": "Món bún xứ Huế có giò heo",
    "d": 2,
    "c": "do-an"
  },
  {
    "a": "HỦ TIẾU",
    "s": "ỦH ITUẾ",
    "h": "Món nước miền Nam có sợi dai",
    "d": 2,
    "c": "do-an"
  },
  {
    "a": "CHÁO GÀ",
    "s": "HÁCO ÀG",
    "h": "Cháo nấu với thịt gà, ăn khi ốm",
    "d": 1,
    "c": "do-an"
  },
  {
    "a": "GÀ RÁN",
    "s": "ÀG NRÁ",
    "h": "Gà chiên giòn, trẻ con rất thích",
    "d": 1,
    "c": "do-an"
  },
  {
    "a": "KHOAI TÂY",
    "s": "KIHAO YÂT",
    "h": "Củ chiên giòn, ăn kèm tương cà",
    "d": 1,
    "c": "do-an"
  },
  {
    "a": "BIM BIM",
    "s": "BMI BMI",
    "h": "Gói snack giòn tan, trẻ con mê",
    "d": 1,
    "c": "do-an"
  },
  {
    "a": "KẸO MÚT",
    "s": "ẸKO TÚM",
    "h": "Kẹo ngậm ngọt, hay có vào Tết",
    "d": 1,
    "c": "do-an"
  },
  {
    "a": "BÁNH QUY",
    "s": "HBNÁ YUQ",
    "h": "Bánh giòn hình tròn, chấm sữa rất ngon",
    "d": 1,
    "c": "do-an"
  },
  {
    "a": "TRÀ ĐÀO",
    "s": "ÀRT OĐÀ",
    "h": "Trà có đào ngâm, uống mát lạnh",
    "d": 2,
    "c": "do-an"
  },
  {
    "a": "NƯỚC MÍA",
    "s": "NỚCƯ ÍMA",
    "h": "Nước ép từ cây mía, uống mùa hè",
    "d": 1,
    "c": "do-an"
  },
  {
    "a": "SỮA CHUA",
    "s": "ỮSA CAUH",
    "h": "Sữa lên men, chua chua ngọt ngọt",
    "d": 1,
    "c": "do-an"
  },
  {
    "a": "TRỨNG CÚT",
    "s": "ỨRNTG ÚTC",
    "h": "Trứng nhỏ luộc, ăn với muối tiêu",
    "d": 2,
    "c": "do-an"
  },
  {
    "a": "ỐC LUỘC",
    "s": "CỐ ỘULC",
    "h": "Món ốc chấm nước mắm gừng, ăn nóng mới ngon",
    "d": 2,
    "c": "do-an"
  },
  {
    "a": "HÀ NỘI",
    "s": "ÀH ỘNI",
    "h": "Thủ đô của Việt Nam",
    "d": 1,
    "c": "dia-ly"
  },
  {
    "a": "SÀI GÒN",
    "s": "ISÀ ÒNG",
    "h": "Tên cũ của Thành phố Hồ Chí Minh",
    "d": 1,
    "c": "dia-ly"
  },
  {
    "a": "ĐÀ NẴNG",
    "s": "ÀĐ NẴGN",
    "h": "Thành phố có cầu Rồng",
    "d": 1,
    "c": "dia-ly"
  },
  {
    "a": "HUẾ",
    "s": "ẾHU",
    "h": "Cố đô, có sông Hương và kinh thành",
    "d": 1,
    "c": "dia-ly"
  },
  {
    "a": "HỘI AN",
    "s": "IHỘ NA",
    "h": "Phố cổ có đèn lồng rất đẹp",
    "d": 1,
    "c": "dia-ly"
  },
  {
    "a": "NHA TRANG",
    "s": "ANH RANTG",
    "h": "Thành phố biển có vịnh rất đẹp",
    "d": 1,
    "c": "dia-ly"
  },
  {
    "a": "ĐÀ LẠT",
    "s": "ÀĐ ẠLT",
    "h": "Thành phố ngàn hoa, khí hậu mát lạnh",
    "d": 1,
    "c": "dia-ly"
  },
  {
    "a": "SAPA",
    "s": "AASP",
    "h": "Nơi có ruộng bậc thang và đỉnh Fansipan",
    "d": 2,
    "c": "dia-ly"
  },
  {
    "a": "HẠ LONG",
    "s": "ẠH OLNG",
    "h": "Vịnh có hàng nghìn đảo đá vôi",
    "d": 1,
    "c": "dia-ly"
  },
  {
    "a": "PHÚ QUỐC",
    "s": "PÚH QỐCU",
    "h": "Đảo ngọc, có nước mắm nổi tiếng",
    "d": 2,
    "c": "dia-ly"
  },
  {
    "a": "CẦN THƠ",
    "s": "NCẦ TƠH",
    "h": "Thành phố có chợ nổi Cái Răng",
    "d": 2,
    "c": "dia-ly"
  },
  {
    "a": "HẢI PHÒNG",
    "s": "IẢH HPGÒN",
    "h": "Thành phố hoa phượng đỏ",
    "d": 1,
    "c": "dia-ly"
  },
  {
    "a": "VINH",
    "s": "NVHI",
    "h": "Thành phố lớn nhất tỉnh Nghệ An",
    "d": 2,
    "c": "dia-ly"
  },
  {
    "a": "QUY NHƠN",
    "s": "YQU NHNƠ",
    "h": "Thành phố biển của Bình Định",
    "d": 2,
    "c": "dia-ly"
  },
  {
    "a": "PLEIKU",
    "s": "EIPLUK",
    "h": "Thành phố cao nguyên Gia Lai",
    "d": 3,
    "c": "dia-ly"
  },
  {
    "a": "BUÔN MA THUỘT",
    "s": "ÔNUB AM UTHTỘ",
    "h": "Thủ phủ cà phê của Việt Nam",
    "d": 2,
    "c": "dia-ly"
  },
  {
    "a": "ĐỒNG NAI",
    "s": "NGĐỒ INA",
    "h": "Tỉnh có thành phố Biên Hòa",
    "d": 3,
    "c": "dia-ly"
  },
  {
    "a": "VŨNG TÀU",
    "s": "ŨVGN TUÀ",
    "h": "Thành phố biển gần Sài Gòn",
    "d": 1,
    "c": "dia-ly"
  },
  {
    "a": "MỸ THO",
    "s": "ỸM OHT",
    "h": "Thành phố của tỉnh Tiền Giang",
    "d": 2,
    "c": "dia-ly"
  },
  {
    "a": "LONG XUYÊN",
    "s": "GOLN ÊNUYX",
    "h": "Thành phố của tỉnh An Giang",
    "d": 3,
    "c": "dia-ly"
  },
  {
    "a": "CÀ MAU",
    "s": "ÀC AUM",
    "h": "Tỉnh ở cực Nam của đất nước",
    "d": 1,
    "c": "dia-ly"
  },
  {
    "a": "SƠN LA",
    "s": "NƠS AL",
    "h": "Tỉnh miền núi có hồ thủy điện lớn",
    "d": 3,
    "c": "dia-ly"
  },
  {
    "a": "ĐIỆN BIÊN",
    "s": "INỆĐ IÊBN",
    "h": "Tỉnh có chiến trường lừng lẫy năm một chín năm tư",
    "d": 2,
    "c": "dia-ly"
  },
  {
    "a": "LAI CHÂU",
    "s": "ALI ÂHUC",
    "h": "Tỉnh biên giới Tây Bắc",
    "d": 3,
    "c": "dia-ly"
  },
  {
    "a": "HÀ GIANG",
    "s": "ÀH AGIGN",
    "h": "Tỉnh có cột cờ Lũng Cú",
    "d": 2,
    "c": "dia-ly"
  },
  {
    "a": "CAO BẰNG",
    "s": "ACO ẰGBN",
    "h": "Tỉnh có thác Bản Giốc",
    "d": 2,
    "c": "dia-ly"
  },
  {
    "a": "LẠNG SƠN",
    "s": "NLẠG ƠSN",
    "h": "Tỉnh có cửa khẩu Hữu Nghị",
    "d": 2,
    "c": "dia-ly"
  },
  {
    "a": "THANH HÓA",
    "s": "AHHNT AÓH",
    "h": "Tỉnh có bãi biển Sầm Sơn",
    "d": 2,
    "c": "dia-ly"
  },
  {
    "a": "NGHỆ AN",
    "s": "HNỆG NA",
    "h": "Quê hương của Bác Hồ",
    "d": 1,
    "c": "dia-ly"
  },
  {
    "a": "QUẢNG BÌNH",
    "s": "ẢQGNU ÌBHN",
    "h": "Tỉnh có hang Sơn Đoòng",
    "d": 2,
    "c": "dia-ly"
  }
];
})();
