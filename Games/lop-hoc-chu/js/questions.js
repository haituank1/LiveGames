/* Ngân hàng câu đảo chữ — Lớp học chữ.
   Sinh bằng tools/tao-giong-lop-hoc.js? Không — sinh bằng /tmp/gen-lop-hoc-questions.js
   (xáo trộn có seed theo chỉ số câu, đã kiểm tra: đảo chữ là hoán vị đúng
   của đáp án, khác đáp án gốc; gợi ý không chứa đáp án).
   Trường: a = đáp án, s = đảo chữ, h = gợi ý, d = độ khó 1-3, c = chủ đề
   (lich-su / doi-song / do-an / dia-ly / toan / tieng-viet / khoa-hoc / tieng-anh / do-vui).
   100 câu mới (121-220, 5 chủ đề x 20) sinh bằng /tmp/gen-lop-hoc-moi.js
   (xáo có seed theo chỉ số câu, đã kiểm tra như trên + không trùng đáp án cũ). */
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
    "h": "Mũ truyền thống của người Việt, che nắng che mưa",
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
  },
  {
    "a": "MƯỜI HAI",
    "s": "MIƯỜ IAH",
    "h": "Bảy cộng năm bằng bao nhiêu?",
    "d": 1,
    "c": "toan"
  },
  {
    "a": "MƯỜI LĂM",
    "s": "IỜƯM MLĂ",
    "h": "Chín cộng sáu bằng bao nhiêu?",
    "d": 1,
    "c": "toan"
  },
  {
    "a": "HAI MƯƠI",
    "s": "IAH ƯƠMI",
    "h": "Mười cộng mười bằng bao nhiêu?",
    "d": 1,
    "c": "toan"
  },
  {
    "a": "MƯỜI TÁM",
    "s": "ỜMIƯ TÁM",
    "h": "Chín nhân hai bằng bao nhiêu?",
    "d": 2,
    "c": "toan"
  },
  {
    "a": "BA MƯƠI",
    "s": "BA IMƯƠ",
    "h": "Sáu nhân năm bằng bao nhiêu?",
    "d": 2,
    "c": "toan"
  },
  {
    "a": "MỘT TRĂM",
    "s": "ỘMT TRMĂ",
    "h": "Mười nhân mười bằng bao nhiêu?",
    "d": 2,
    "c": "toan"
  },
  {
    "a": "BỐN MƯƠI",
    "s": "ỐNB ƠIƯM",
    "h": "Tám nhân năm bằng bao nhiêu?",
    "d": 2,
    "c": "toan"
  },
  {
    "a": "NĂM MƯƠI",
    "s": "ĂNM MIƠƯ",
    "h": "Bảy mươi trừ hai mươi bằng bao nhiêu?",
    "d": 2,
    "c": "toan"
  },
  {
    "a": "HAI MƯƠI LĂM",
    "s": "HIA ƯMIƠ LĂM",
    "h": "Năm nhân năm bằng bao nhiêu?",
    "d": 2,
    "c": "toan"
  },
  {
    "a": "MƯỜI CHÍN",
    "s": "ỜƯIM CHÍN",
    "h": "Hai mươi trừ một bằng bao nhiêu?",
    "d": 1,
    "c": "toan"
  },
  {
    "a": "PHÉP CỘNG",
    "s": "PPHÉ NỘGC",
    "h": "Phép tính lấy tổng của hai số",
    "d": 1,
    "c": "toan"
  },
  {
    "a": "PHÉP TRỪ",
    "s": "ÉPPH ỪRT",
    "h": "Phép tính lấy hiệu của hai số",
    "d": 1,
    "c": "toan"
  },
  {
    "a": "PHÉP NHÂN",
    "s": "HÉPP ÂNHN",
    "h": "Phép tính lấy tích của hai số",
    "d": 2,
    "c": "toan"
  },
  {
    "a": "PHÉP CHIA",
    "s": "PPÉH HAIC",
    "h": "Phép tính lấy thương của hai số",
    "d": 2,
    "c": "toan"
  },
  {
    "a": "HÌNH VUÔNG",
    "s": "NHHÌ NUÔVG",
    "h": "Hình có bốn cạnh bằng nhau, bốn góc vuông",
    "d": 1,
    "c": "toan"
  },
  {
    "a": "HÌNH TRÒN",
    "s": "HHÌN TÒNR",
    "h": "Hình không có cạnh, không có góc",
    "d": 1,
    "c": "toan"
  },
  {
    "a": "HÌNH TAM GIÁC",
    "s": "HNHÌ TAM GIÁC",
    "h": "Hình có ba cạnh, ba góc",
    "d": 2,
    "c": "toan"
  },
  {
    "a": "SỐ CHẴN",
    "s": "SỐ NẴHC",
    "h": "Số chia hết cho hai, ví dụ số bốn",
    "d": 2,
    "c": "toan"
  },
  {
    "a": "SỐ LẺ",
    "s": "ỐS LẺ",
    "h": "Số chia cho hai còn dư một, ví dụ số ba",
    "d": 2,
    "c": "toan"
  },
  {
    "a": "GÓC VUÔNG",
    "s": "GÓC UGNVÔ",
    "h": "Góc bằng chín mươi độ, như góc của quyển vở",
    "d": 2,
    "c": "toan"
  },
  {
    "a": "DANH TỪ",
    "s": "NDAH TỪ",
    "h": "Từ chỉ người, vật, hiện tượng, ví dụ từ bàn ghế",
    "d": 2,
    "c": "tieng-viet"
  },
  {
    "a": "ĐỘNG TỪ",
    "s": "ĐGNỘ TỪ",
    "h": "Từ chỉ hoạt động, ví dụ từ chạy nhảy",
    "d": 2,
    "c": "tieng-viet"
  },
  {
    "a": "TÍNH TỪ",
    "s": "HNÍT ỪT",
    "h": "Từ chỉ đặc điểm, ví dụ từ xinh đẹp",
    "d": 2,
    "c": "tieng-viet"
  },
  {
    "a": "CHỦ NGỮ",
    "s": "HỦC NGỮ",
    "h": "Thành phần chính của câu, trả lời câu hỏi ai, cái gì",
    "d": 3,
    "c": "tieng-viet"
  },
  {
    "a": "VỊ NGỮ",
    "s": "VỊ NỮG",
    "h": "Thành phần chính của câu, trả lời câu hỏi làm gì, thế nào",
    "d": 3,
    "c": "tieng-viet"
  },
  {
    "a": "CÂU KỂ",
    "s": "CÂU ỂK",
    "h": "Câu dùng để kể, tả hoặc giới thiệu sự việc",
    "d": 1,
    "c": "tieng-viet"
  },
  {
    "a": "CÂU HỎI",
    "s": "ÂUC IỎH",
    "h": "Câu dùng để hỏi, cuối câu có dấu chấm hỏi",
    "d": 1,
    "c": "tieng-viet"
  },
  {
    "a": "DẤU CHẤM",
    "s": "DẤU ẤMCH",
    "h": "Dấu kết thúc câu kể, đặt ở cuối câu",
    "d": 1,
    "c": "tieng-viet"
  },
  {
    "a": "DẤU PHẨY",
    "s": "ẤUD HYẨP",
    "h": "Dấu ngăn cách các bộ phận trong câu",
    "d": 1,
    "c": "tieng-viet"
  },
  {
    "a": "THÀNH NGỮ",
    "s": "TNHHÀ GỮN",
    "h": "Cụm từ cố định, ví dụ như gần mực thì đen",
    "d": 3,
    "c": "tieng-viet"
  },
  {
    "a": "TỤC NGỮ",
    "s": "TCỤ NỮG",
    "h": "Câu nói ngắn gọn của dân gian, ví dụ có công mài sắt",
    "d": 3,
    "c": "tieng-viet"
  },
  {
    "a": "CA DAO",
    "s": "CA OAD",
    "h": "Thơ dân gian truyền miệng, ví dụ công cha như núi Thái Sơn",
    "d": 2,
    "c": "tieng-viet"
  },
  {
    "a": "TRUYỆN CỔ TÍCH",
    "s": "YRỆUNT CỔ CTHÍ",
    "h": "Truyện dân gian có yếu tố thần kì, ví dụ Tấm Cám",
    "d": 2,
    "c": "tieng-viet"
  },
  {
    "a": "THƠ LỤC BÁT",
    "s": "ƠHT ỤLC ÁTB",
    "h": "Thể thơ sáu tám, câu sáu chữ rồi câu tám chữ",
    "d": 3,
    "c": "tieng-viet"
  },
  {
    "a": "NGUYÊN ÂM",
    "s": "NUNYGÊ MÂ",
    "h": "Âm mà khi phát ra luồng hơi thoát tự do, ví dụ a, e, i",
    "d": 3,
    "c": "tieng-viet"
  },
  {
    "a": "PHỤ ÂM",
    "s": "PỤH ÂM",
    "h": "Âm mà khi phát ra luồng hơi bị cản lại, ví dụ b, c, d",
    "d": 3,
    "c": "tieng-viet"
  },
  {
    "a": "ÂM TIẾT",
    "s": "ÂM TTIẾ",
    "h": "Đơn vị phát âm nhỏ nhất của tiếng Việt",
    "d": 2,
    "c": "tieng-viet"
  },
  {
    "a": "DẤU HỎI",
    "s": "DUẤ IHỎ",
    "h": "Dấu đặt cuối câu dùng để hỏi",
    "d": 1,
    "c": "tieng-viet"
  },
  {
    "a": "DẤU THAN",
    "s": "ẤDU THAN",
    "h": "Dấu đặt cuối câu cảm thán, thể hiện cảm xúc",
    "d": 2,
    "c": "tieng-viet"
  },
  {
    "a": "CÂU CẢM",
    "s": "ÂUC CMẢ",
    "h": "Câu bộc lộ cảm xúc, cuối câu có dấu chấm than",
    "d": 2,
    "c": "tieng-viet"
  },
  {
    "a": "MẶT TRỜI",
    "s": "TMẶ TRỜI",
    "h": "Ngôi sao chiếu sáng ban ngày cho Trái Đất",
    "d": 1,
    "c": "khoa-hoc"
  },
  {
    "a": "MẶT TRĂNG",
    "s": "TẶM NRTGĂ",
    "h": "Vệ tinh tự nhiên duy nhất của Trái Đất",
    "d": 2,
    "c": "khoa-hoc"
  },
  {
    "a": "TRÁI ĐẤT",
    "s": "ÁRIT ẤTĐ",
    "h": "Hành tinh thứ ba tính từ Mặt Trời, nơi chúng ta sống",
    "d": 1,
    "c": "khoa-hoc"
  },
  {
    "a": "NGÔI SAO",
    "s": "NÔGI AOS",
    "h": "Thiên thể tự phát sáng trên bầu trời đêm",
    "d": 1,
    "c": "khoa-hoc"
  },
  {
    "a": "QUANG HỢP",
    "s": "UAGQN HỢP",
    "h": "Quá trình cây xanh dùng ánh sáng tạo chất dinh dưỡng",
    "d": 3,
    "c": "khoa-hoc"
  },
  {
    "a": "CÂY XANH",
    "s": "ÂYC ANXH",
    "h": "Sinh vật tạo ra khí ô xi nhờ ánh sáng mặt trời",
    "d": 1,
    "c": "khoa-hoc"
  },
  {
    "a": "KHÔNG KHÍ",
    "s": "GHNKÔ KHÍ",
    "h": "Hỗn hợp khí bao quanh Trái Đất, con người hít thở mỗi ngày",
    "d": 1,
    "c": "khoa-hoc"
  },
  {
    "a": "NƯỚC BIỂN",
    "s": "CỚNƯ NIỂB",
    "h": "Nước mặn ở đại dương, chiếm phần lớn bề mặt Trái Đất",
    "d": 2,
    "c": "khoa-hoc"
  },
  {
    "a": "ĐỘNG VẬT",
    "s": "GNỘĐ TVẬ",
    "h": "Sinh vật có thể di chuyển, ví dụ chó mèo chim cá",
    "d": 1,
    "c": "khoa-hoc"
  },
  {
    "a": "THỰC VẬT",
    "s": "CTỰH ẬTV",
    "h": "Sinh vật không di chuyển, ví dụ cây cỏ hoa lá",
    "d": 2,
    "c": "khoa-hoc"
  },
  {
    "a": "CÔN TRÙNG",
    "s": "CNÔ RGÙTN",
    "h": "Loài vật nhỏ có sáu chân, ví dụ kiến ong bướm",
    "d": 2,
    "c": "khoa-hoc"
  },
  {
    "a": "CÁ VOI",
    "s": "ÁC VOI",
    "h": "Loài vật lớn nhất sống dưới biển, thở bằng phổi",
    "d": 2,
    "c": "khoa-hoc"
  },
  {
    "a": "CHIM CÁNH CỤT",
    "s": "MCIH ÁNHC ỤTC",
    "h": "Loài chim không biết bay, sống ở vùng Nam Cực lạnh giá",
    "d": 3,
    "c": "khoa-hoc"
  },
  {
    "a": "NÚI LỬA",
    "s": "NIÚ AỬL",
    "h": "Núi có thể phun ra dung nham nóng chảy",
    "d": 2,
    "c": "khoa-hoc"
  },
  {
    "a": "CẦU VỒNG",
    "s": "CẦU GVNỒ",
    "h": "Dải màu cong xuất hiện trên trời sau cơn mưa",
    "d": 1,
    "c": "khoa-hoc"
  },
  {
    "a": "SẤM SÉT",
    "s": "SẤM TSÉ",
    "h": "Tiếng nổ và tia sáng trong cơn giông",
    "d": 1,
    "c": "khoa-hoc"
  },
  {
    "a": "TRỌNG LỰC",
    "s": "ỌRGNT ỰCL",
    "h": "Lực hút kéo mọi vật rơi xuống mặt đất",
    "d": 3,
    "c": "khoa-hoc"
  },
  {
    "a": "MƯA ĐÁ",
    "s": "ƯAM ĐÁ",
    "h": "Hạt băng rơi từ trên trời xuống khi trời giông",
    "d": 2,
    "c": "khoa-hoc"
  },
  {
    "a": "ONG MẬT",
    "s": "GON ẬMT",
    "h": "Loài côn trùng làm ra mật ngọt",
    "d": 1,
    "c": "khoa-hoc"
  },
  {
    "a": "BƯỚM",
    "s": "ƯỚMB",
    "h": "Côn trùng có đôi cánh sặc sỡ, bay lượn trên hoa",
    "d": 1,
    "c": "khoa-hoc"
  },
  {
    "a": "APPLE",
    "s": "PAELP",
    "h": "Quả táo trong tiếng Anh",
    "d": 1,
    "c": "tieng-anh"
  },
  {
    "a": "BANANA",
    "s": "NABANA",
    "h": "Quả chuối trong tiếng Anh",
    "d": 1,
    "c": "tieng-anh"
  },
  {
    "a": "SCHOOL",
    "s": "SOLOCH",
    "h": "Trường học trong tiếng Anh",
    "d": 1,
    "c": "tieng-anh"
  },
  {
    "a": "TEACHER",
    "s": "RCHTEEA",
    "h": "Cô giáo trong tiếng Anh",
    "d": 1,
    "c": "tieng-anh"
  },
  {
    "a": "FRIEND",
    "s": "DRNIEF",
    "h": "Bạn bè trong tiếng Anh",
    "d": 1,
    "c": "tieng-anh"
  },
  {
    "a": "FAMILY",
    "s": "YFMIAL",
    "h": "Gia đình trong tiếng Anh",
    "d": 2,
    "c": "tieng-anh"
  },
  {
    "a": "SUNDAY",
    "s": "YASNUD",
    "h": "Ngày chủ nhật trong tiếng Anh",
    "d": 2,
    "c": "tieng-anh"
  },
  {
    "a": "MONDAY",
    "s": "YOANDM",
    "h": "Ngày thứ hai trong tiếng Anh",
    "d": 2,
    "c": "tieng-anh"
  },
  {
    "a": "FLOWER",
    "s": "REFWLO",
    "h": "Bông hoa trong tiếng Anh",
    "d": 1,
    "c": "tieng-anh"
  },
  {
    "a": "GARDEN",
    "s": "DERANG",
    "h": "Khu vườn trong tiếng Anh",
    "d": 2,
    "c": "tieng-anh"
  },
  {
    "a": "WINDOW",
    "s": "WNIOWD",
    "h": "Cửa sổ trong tiếng Anh",
    "d": 2,
    "c": "tieng-anh"
  },
  {
    "a": "PENCIL",
    "s": "NIECLP",
    "h": "Cây bút chì trong tiếng Anh",
    "d": 1,
    "c": "tieng-anh"
  },
  {
    "a": "ORANGE",
    "s": "ENAOGR",
    "h": "Quả cam trong tiếng Anh",
    "d": 1,
    "c": "tieng-anh"
  },
  {
    "a": "YELLOW",
    "s": "LYOEWL",
    "h": "Màu vàng trong tiếng Anh",
    "d": 2,
    "c": "tieng-anh"
  },
  {
    "a": "PURPLE",
    "s": "LPEPUR",
    "h": "Màu tím trong tiếng Anh",
    "d": 3,
    "c": "tieng-anh"
  },
  {
    "a": "HAPPY",
    "s": "PAHYP",
    "h": "Vui vẻ trong tiếng Anh",
    "d": 2,
    "c": "tieng-anh"
  },
  {
    "a": "WATER",
    "s": "EWRAT",
    "h": "Nước uống trong tiếng Anh",
    "d": 1,
    "c": "tieng-anh"
  },
  {
    "a": "TABLE",
    "s": "BLATE",
    "h": "Cái bàn trong tiếng Anh",
    "d": 1,
    "c": "tieng-anh"
  },
  {
    "a": "CHAIR",
    "s": "HRIAC",
    "h": "Cái ghế trong tiếng Anh",
    "d": 1,
    "c": "tieng-anh"
  },
  {
    "a": "BOOK",
    "s": "OBKO",
    "h": "Quyển sách trong tiếng Anh",
    "d": 1,
    "c": "tieng-anh"
  },
  {
    "a": "CÁI LƯỢC",
    "s": "CIÁ LƯỢC",
    "h": "Cái gì có răng mà không cắn được ai?",
    "d": 1,
    "c": "do-vui"
  },
  {
    "a": "NƯỚC",
    "s": "ƯNCỚ",
    "h": "Cái gì càng giặt càng bẩn?",
    "d": 1,
    "c": "do-vui"
  },
  {
    "a": "TRÁI TIM",
    "s": "ÁTRI IMT",
    "h": "Cái gì đập thì sống, không đập thì chết?",
    "d": 2,
    "c": "do-vui"
  },
  {
    "a": "CÂY KIM",
    "s": "CÂY MKI",
    "h": "Cái gì có đầu mà không có tóc?",
    "d": 2,
    "c": "do-vui"
  },
  {
    "a": "BÀN CHÂN",
    "s": "NBÀ HCÂN",
    "h": "Cái gì đi thì nằm, đứng thì nằm, nằm thì đứng?",
    "d": 3,
    "c": "do-vui"
  },
  {
    "a": "CÁI CHAI",
    "s": "CIÁ AHCI",
    "h": "Cái gì có cổ mà không có đầu?",
    "d": 2,
    "c": "do-vui"
  },
  {
    "a": "CÁI BÓNG",
    "s": "IÁC ÓGBN",
    "h": "Cái gì đi theo bạn cả ngày mà không bao giờ nói chuyện?",
    "d": 2,
    "c": "do-vui"
  },
  {
    "a": "CÁI QUẠT",
    "s": "ÁIC UẠQT",
    "h": "Cái gì quay tròn mà không đi đâu, giúp cả nhà mát mẻ?",
    "d": 1,
    "c": "do-vui"
  },
  {
    "a": "CÁI BÁT",
    "s": "CIÁ BÁT",
    "h": "Cái gì có miệng mà không ăn được?",
    "d": 1,
    "c": "do-vui"
  },
  {
    "a": "CÁI KÉO",
    "s": "ÁCI ÉKO",
    "h": "Dụng cụ có hai lưỡi, dùng để cắt giấy",
    "d": 1,
    "c": "do-vui"
  },
  {
    "a": "CÁI ẤM",
    "s": "CIÁ ẤM",
    "h": "Đồ dùng đun nước, có quai mà không nghe được",
    "d": 2,
    "c": "do-vui"
  },
  {
    "a": "CẦU THANG",
    "s": "UCẦ NGATH",
    "h": "Cái gì đi lên đi xuống mà không nhúc nhích?",
    "d": 2,
    "c": "do-vui"
  },
  {
    "a": "CÁI TRỐNG",
    "s": "IÁC NGTỐR",
    "h": "Cái gì đánh thì kêu, không đánh thì im?",
    "d": 1,
    "c": "do-vui"
  },
  {
    "a": "CÂY BÚT",
    "s": "CYÂ ÚBT",
    "h": "Cái gì vừa đi vừa khóc?",
    "d": 2,
    "c": "do-vui"
  },
  {
    "a": "CÁI GƯƠNG",
    "s": "ÁIC ƯNGGƠ",
    "h": "Cái gì soi thấy mình mà không phải là người?",
    "d": 1,
    "c": "do-vui"
  },
  {
    "a": "CÁI CHÌA KHÓA",
    "s": "ÁIC ÌCAH AÓKH",
    "h": "Cái gì nhỏ xíu mà mở được cửa lớn?",
    "d": 2,
    "c": "do-vui"
  },
  {
    "a": "CÁI ĐÀI",
    "s": "ÁIC IĐÀ",
    "h": "Cái gì có sóng mà không có biển?",
    "d": 3,
    "c": "do-vui"
  },
  {
    "a": "ĐÁM MÂY",
    "s": "MÁĐ MÂY",
    "h": "Cái gì không cánh mà bay trên trời?",
    "d": 1,
    "c": "do-vui"
  },
  {
    "a": "CÁI NẾN",
    "s": "ICÁ NNẾ",
    "h": "Cái gì càng cháy càng ngắn lại?",
    "d": 1,
    "c": "do-vui"
  },
  {
    "a": "CON MÈO",
    "s": "NOC MOÈ",
    "h": "Con gì kêu meo meo, bắt chuột rất giỏi?",
    "d": 1,
    "c": "do-vui"
  }
];
})();
