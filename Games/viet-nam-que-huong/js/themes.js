/* 20 giao dien cho game Que Huong Toi.
   Moi giao dien chi la bo mau + bo goc + kieu chu tieu de; bo cuc giu nguyen.
   Bang mau o day do toi chon lai (hex khac ban goc), dung qua bien CSS. */
(function () {
'use strict';
var W = (window.QueHuong = window.QueHuong || {});

function T(id, name, o) {
  return {
    id: id, name: name, bg1: o[0], bg2: o[1], dust: o[2], panel: o[3], line: o[4],
    accent: o[5], accent2: o[6], land: o[7], mapLine: o[8], pearl: o[9], copper: o[10],
    ink: o[11], muted: o[12], head1: o[13], head2: o[14], headInk: o[15],
    label: o[16], sea: o[17], serif: o[18], r: o[19],
    lit: o[20]
  };
}

var THEMES = [
  T('son-mai', 'Sơn mài', ['#170d08', '#26140d', 'rgba(228,184,90,.10)', 'rgba(23,13,8,.92)', '#966f36', '#e6b858', '#c22a1e', '#2c1c12', 'rgba(230,184,88,.5)', '#e2ebe6', '#cd7a3c', '#f6ecd6', '#bda98d', '#7a1410', '#b3271e', '#fff5de', '#fff9e8', 'rgba(230,184,88,.42)', true, 18, ['#e7b44e', '#d64a32', '#43a88c', '#e47e94', '#a2cac2', '#cd7a3c']]),
  T('lua-do', 'Lụa đỏ', ['#280506', '#470a0e', 'rgba(255,218,144,.10)', 'rgba(38,5,8,.9)', '#b47a3c', '#ffd67e', '#e5402f', '#3b0f12', 'rgba(255,214,132,.45)', '#ffecd8', '#f28e4e', '#fff4e6', '#dcae9e', '#5a090c', '#a6181c', '#ffebb2', '#fff8ea', 'rgba(255,214,132,.4)', true, 22, ['#ffd67e', '#ff8e60', '#f8c5a2', '#ffba4a', '#ec7392', '#fff2c4']]),
  T('bien-dem', 'Biển đêm', ['#031426', '#092b49', 'rgba(142,212,255,.10)', 'rgba(4,21,39,.9)', '#31709a', '#84d6ff', '#ff7263', '#102f4b', 'rgba(132,214,255,.45)', '#e6f6ff', '#ffb76d', '#eaf6ff', '#92b6cf', '#062b4b', '#0f4e7e', '#e6f6ff', '#ffffff', 'rgba(132,214,255,.4)', false, 14, ['#84d6ff', '#ffd36a', '#0ad8a2', '#ff7294', '#bcf4e8', '#ffb76d']]),
  T('ngoc-bich', 'Ngọc bích', ['#031710', '#0b2e20', 'rgba(152,242,192,.09)', 'rgba(4,25,17,.9)', '#3d8f66', '#a2f2c6', '#eba640', '#133b2a', 'rgba(162,242,198,.42)', '#edfff6', '#eba640', '#f0fff7', '#99c6b0', '#0b3b27', '#146241', '#edfff6', '#ffffff', 'rgba(162,242,198,.38)', true, 18, ['#a2f2c6', '#f4d26e', '#5ecaa2', '#f7a186', '#cafbe2', '#eba640']]),
  T('hoa-sen', 'Hoa sen', ['#1b0919', '#351130', 'rgba(255,182,222,.10)', 'rgba(29,9,27,.9)', '#a45382', '#ffb6d4', '#e3538c', '#3a1836', 'rgba(255,182,212,.45)', '#fff2f8', '#f7bc74', '#fff4fa', '#d6a4c0', '#4b1241', '#8c256a', '#ffe6f1', '#fffafc', 'rgba(255,182,212,.4)', true, 26, ['#ffb6d4', '#f7d970', '#9ee5ca', '#ff7dab', '#ccb9ff', '#f7bc74']]),
  T('thu-ha-noi', 'Thu Hà Nội', ['#1b1106', '#32200b', 'rgba(255,202,122,.10)', 'rgba(29,18,7,.9)', '#a67d3c', '#f6c36d', '#cb583f', '#3a2810', 'rgba(246,195,109,.45)', '#fdf1da', '#dc8f41', '#fdf3e1', '#c5aa82', '#4b2c0d', '#8c5619', '#fff2d2', '#fffaf0', 'rgba(246,195,109,.4)', true, 16, ['#f6c36d', '#dc8f41', '#aacc5a', '#cb583f', '#f4e6be', '#ecaa6e']]),
  T('tre-xanh', 'Tre xanh', ['#0b1a0b', '#19331a', 'rgba(202,242,152,.09)', 'rgba(11,26,11,.9)', '#61923c', '#cfee8e', '#f2b63e', '#1f3d1f', 'rgba(207,238,142,.42)', '#f4ffe8', '#f2b63e', '#f5fceb', '#abc792', '#1e4013', '#366d1f', '#f4ffe8', '#ffffff', 'rgba(207,238,142,.36)', false, 10, ['#cfee8e', '#f2b63e', '#7fc782', '#f4905c', '#eaf7ca', '#9dd4d7']]),
  T('gom-chu-dau', 'Gốm Chu Đậu', ['#f0eade', '#faf7ef', 'rgba(32,62,122,.08)', 'rgba(255,252,245,.94)', '#314f92', '#21408c', '#b3322c', '#e2dac9', 'rgba(33,64,140,.5)', '#21408c', '#ba6e2c', '#1c2540', '#5f6882', '#21408c', '#305dbb', '#ffffff', '#1c2540', 'rgba(33,64,140,.4)', true, 20, ['#305dbb', '#7095d8', '#b3322c', '#41928c', '#dca744', '#8dabe8']]),
  T('giay-do', 'Giấy dó', ['#ede4d0', '#f6f0e2', 'rgba(82,52,22,.08)', 'rgba(248,243,230,.94)', '#8c6c46', '#a6281f', '#a6281f', '#ded2b9', 'rgba(62,42,22,.5)', '#2c2219', '#8c5c2c', '#2c2219', '#705f4b', '#2c2219', '#4b3b2b', '#f7ebd2', '#2c2219', 'rgba(62,42,22,.35)', true, 6, ['#c23c2e', '#d6a23e', '#5e8f5c', '#3e7092', '#b86879', '#8c5c2c']]),
  T('hoang-hon', 'Hoàng hôn', ['#1a0a24', '#3a1138', 'rgba(255,172,122,.10)', 'rgba(29,9,35,.88)', '#b3637c', '#ffbc6e', '#ff617b', '#3a1a41', 'rgba(255,187,110,.45)', '#ffeae0', '#ff925c', '#fff2ec', '#d7a5bb', '#ff6d3f', '#b32c6d', '#fff5e2', '#fffaf4', 'rgba(255,187,110,.4)', false, 24, ['#ffbc6e', '#ff617b', '#ffd86e', '#ca80ff', '#ff925c', '#ffe2b7']]),
  T('co-do', 'Cờ đỏ sao vàng', ['#390505', '#680c0c', 'rgba(255,223,2,.10)', 'rgba(58,5,5,.9)', '#e2b202', '#ffe002', '#dc271f', '#581111', 'rgba(255,223,2,.5)', '#fff8ce', '#ffa21e', '#fffae2', '#e6b3a3', '#dc271f', '#b21710', '#ffe002', '#ffffff', 'rgba(255,223,2,.42)', false, 12, ['#ffe002', '#ffb202', '#fff5a2', '#ffa21e', '#ffe268', '#ffcb4f']]),
  T('dem-trang', 'Đêm trăng', ['#0a0f20', '#192241', 'rgba(222,232,255,.10)', 'rgba(11,15,33,.88)', '#6e7cab', '#e9efff', '#8da5ff', '#1e2749', 'rgba(233,239,255,.42)', '#ffffff', '#ccb57e', '#f0f4ff', '#9da9cb', '#1e2749', '#35417c', '#f4f7ff', '#ffffff', 'rgba(233,239,255,.35)', true, 30, ['#e9efff', '#8da5ff', '#ccb57e', '#82d4ca', '#bca9ff', '#ffd9a6']]),
  T('hoi-an', 'Phố cổ Hội An', ['#052321', '#0c3b36', 'rgba(255,202,82,.10)', 'rgba(5,33,30,.9)', '#ba8c30', '#ffcc4c', '#e7563f', '#124741', 'rgba(255,204,76,.45)', '#fff4ce', '#f48f2a', '#fff8e5', '#a2c4bb', '#aa341f', '#e7563f', '#ffeba8', '#fffcf2', 'rgba(255,204,76,.38)', true, 18, ['#ffcc4c', '#e7563f', '#f48f2a', '#ffe28c', '#ff7e6d', '#f8b56d']]),
  T('ruong-bac-thang', 'Ruộng bậc thang', ['#131709', '#292e11', 'rgba(242,222,122,.10)', 'rgba(21,24,9,.9)', '#9d9d3c', '#f4d46e', '#6dab51', '#343a17', 'rgba(244,212,110,.45)', '#f9f5db', '#dca442', '#f9f7e8', '#bbb88d', '#3e4b15', '#6c7f20', '#fff8c9', '#fffdea', 'rgba(244,212,110,.38)', false, 14, ['#f4d46e', '#9ecf68', '#dca442', '#c7e47c', '#e9bb5e', '#7fb644']]),
  T('tim-hue', 'Tím Huế', ['#160a26', '#2b1451', 'rgba(212,182,255,.10)', 'rgba(23,11,39,.9)', '#7f5db8', '#dcc5ff', '#f4bb4e', '#2f1c56', 'rgba(220,197,255,.45)', '#f8f1ff', '#f4bb4e', '#f8f2ff', '#ac9bcc', '#3c1b6c', '#5f2d9e', '#f8f1ff', '#ffffff', 'rgba(220,197,255,.38)', true, 22, ['#dcc5ff', '#f4bb4e', '#a27ded', '#f98ab6', '#ba97f6', '#fddb90']]),
  T('ca-phe-sua', 'Cà phê sữa', ['#191009', '#2d1e13', 'rgba(232,202,162,.09)', 'rgba(27,18,11,.9)', '#8c6c4b', '#eacba2', '#c66d3c', '#3a2a1c', 'rgba(234,203,162,.42)', '#f7ebdc', '#c66d3c', '#f7eee2', '#b69d83', '#3b2515', '#6d4629', '#f7e3c6', '#fffaef', 'rgba(234,203,162,.36)', false, 20, ['#eacba2', '#c66d3c', '#a97e54', '#f4bb82', '#dca268', '#f1e2ca']]),
  T('suong-som', 'Sương sớm', ['#e4ebf0', '#f4f7f9', 'rgba(42,72,102,.07)', 'rgba(255,255,255,.92)', '#7f9ab0', '#316892', '#d34c5e', '#d3dee6', 'rgba(49,104,146,.45)', '#316892', '#cb7d3f', '#1e2e3b', '#617586', '#316892', '#3c7ea7', '#ffffff', '#1e2e3b', 'rgba(49,104,146,.35)', false, 16, ['#3c7ea7', '#84c5d9', '#d34c5e', '#efb14b', '#68a484', '#9e74ac']]),
  T('neon-sai-gon', 'Neon Sài Gòn', ['#06050f', '#130e2a', 'rgba(0,255,242,.08)', 'rgba(9,7,21,.88)', '#ff32b5', '#32f5ff', '#ff32b5', '#17123b', 'rgba(49,245,255,.5)', '#ebfdff', '#ffd541', '#f2f8ff', '#9da3cb', '#ff32b5', '#6c1cff', '#ffffff', '#ffffff', 'rgba(49,245,255,.38)', false, 4, ['#32f5ff', '#ff32b5', '#ffd541', '#7eff6d', '#ab6dff', '#ff7d31']]),
  T('dong-co', 'Đồng cổ', ['#110c07', '#231910', 'rgba(207,142,72,.10)', 'rgba(21,15,9,.9)', '#9e6d3d', '#dca268', '#518c7c', '#2c1f13', 'rgba(219,162,104,.45)', '#f3e4d1', '#ba753b', '#f5eadc', '#b59977', '#3b2513', '#6d4421', '#f3d8b2', '#fff8ec', 'rgba(219,162,104,.38)', true, 8, ['#dca268', '#518c7c', '#ba753b', '#e5c28f', '#82b09e', '#cc8c52']]),
  T('muc-tau', 'Mực tàu', ['#131313', '#232323', 'rgba(255,255,255,.06)', 'rgba(19,19,19,.92)', '#8c8c8c', '#f4f4f4', '#ca112f', '#2b2b2b', 'rgba(244,244,244,.4)', '#f4f4f4', '#ca112f', '#f4f4f4', '#a2a2a2', '#ca112f', '#910c21', '#ffffff', '#ffffff', 'rgba(244,244,244,.3)', true, 2, ['#f4f4f4', '#ca112f', '#a0a0a0', '#dbdbdb', '#e25c6f', '#bfbfbf']])
];

var DEFAULT_THEME = THEMES[0];
function themeById(id) {
  for (var i = 0; i < THEMES.length; i++) if (THEMES[i].id === id) return THEMES[i];
  return DEFAULT_THEME;
}
function themeVars(t) {
  return {
    '--bg1': t.bg1, '--bg2': t.bg2, '--dust': t.dust, '--panel': t.panel, '--line': t.line,
    '--accent': t.accent, '--accent2': t.accent2, '--land': t.land, '--map-line': t.mapLine,
    '--pearl': t.pearl, '--copper': t.copper, '--ink': t.ink, '--muted': t.muted,
    '--head1': t.head1, '--head2': t.head2, '--head-ink': t.headInk, '--label': t.label,
    '--sea': t.sea, '--r': t.r + 'px',
    '--display': t.serif ? "'Playfair Display', Georgia, serif" : "'Be Vietnam Pro', system-ui, sans-serif"
  };
}

W.THEMES = THEMES;
W.DEFAULT_THEME = DEFAULT_THEME;
W.themeById = themeById;
W.themeVars = themeVars;
})();
