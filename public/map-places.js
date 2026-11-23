import { placeMedia } from './map-place-media.js';
import { placePositions } from './map-place-positions.js';

const tourism = 'https://vietnam.travel/';
const destinations = 'https://vietnam.travel/place-to-go/';
const heritage = tourism+'things-to-do/5-must-see-heritage-sites-vietnam/';
const atlasImages = {
  'Đỉnh Fansipan':['fansipan','Ảnh bạn cung cấp'],
  'Vịnh Hạ Long':['ha-long','Ảnh bạn cung cấp',heritage],
  'Tràng An':['trang-an','Ảnh bạn cung cấp',heritage],
  'Phong Nha – Kẻ Bàng':['phong-nha','Ảnh bạn cung cấp',tourism+'things-to-do/complete-guide-phong-nha/'],
  'Đà Lạt':['da-lat','Ảnh bạn cung cấp',tourism+'things-to-do/10-incredible-places-visit-vietnam-summer/'],
  'Đà Nẵng':['da-nang','Ảnh bạn cung cấp',tourism+'place-to-go/south-central-coast-central-highlands/da-nang/'],
  'Côn Đảo':['con-dao','Ảnh bạn cung cấp',tourism+'things-to-do/10-incredible-places-visit-vietnam-summer/'],
  'Đảo Phú Quốc':['phu-quoc','Ảnh bạn cung cấp',tourism+'things-to-do/10-incredible-places-visit-vietnam-summer/'],
  'Thác Bản Giốc':['ban-gioc','Mike Williams (Ajarnmike) · CC BY-SA 2.5 · thu nhỏ, đổi sang WebP','https://commons.wikimedia.org/wiki/File:Th%C3%A1c_B%E1%BA%A3n_Gi%E1%BB%91c.jpg','https://creativecommons.org/licenses/by-sa/2.5/'],
  'Phố cổ Hội An':['hoi-an','Steffen Schmitz (Carschten) · CC BY-SA 4.0 · thu nhỏ, đổi sang WebP','https://commons.wikimedia.org/wiki/File:H%E1%BB%99i_An,_Ancient_Town,_2020-01_CN-01.jpg','https://creativecommons.org/licenses/by-sa/4.0/'],
  'Hồ Tơ Nưng':['ho-to-nung','SGK Địa lí 8, hình 6.8, tr. 126'],
  'Vùng đồi Long Cốc':['long-coc','SGK Địa lí 9, tr. 116'],
  'Khu lọc hoá dầu Dung Quất':['dung-quat','SGK Địa lí 9, tr. 116'],
  'Cảng Cát Lái':['cat-lai','SGK Địa lí 9, tr. 116'],
  'Bãi biển Mỹ Khê':['my-khe','SGK Địa lí 8, hình 12.1, tr. 154'],
  'Mỏ Bạch Hổ':['bach-ho','SGK Địa lí 8, hình 12.2, tr. 154']
};
const textbookImages = {
  'Thuỷ điện Sơn La':['thuy-dien-son-la','Đập thuỷ điện Sơn La · SGK Địa lí 8, hình 7.5, tr. 131'],
  'Đắk Lắk':['ca-phe-dak-lak','Vườn cà phê ở Krông Búk · SGK Địa lí 8, hình 9.2, tr. 137'],
  'Sông Sê San':['thuy-dien-ialy','Nhà máy thuỷ điện Ialy trên sông Sê San · SGK Địa lí 9, hình 16.4, tr. 191'],
  'Bạc Liêu':['dien-gio-bac-lieu','Nhà máy điện gió Bạc Liêu · SGK Địa lí 9, hình 19.3, tr. 211'],
  'Cao nguyên Lâm Viên':['cao-nguyen-lam-vien','Một phần cao nguyên Lâm Viên · SGK Địa lí 8, hình 2.5, tr. 103']
};
const placeNotes = {
  'Đỉnh Fansipan':'Đỉnh cao nhất dãy Hoàng Liên Sơn, tiêu biểu cho địa hình núi cao ở Tây Bắc.',
  'Thác Bản Giốc':'Thác trên sông Quây Sơn, giữa cảnh quan núi đá vôi ở Cao Bằng.',
  'Vịnh Hạ Long':'Các đảo và hang động đá vôi minh hoạ cảnh quan karst ngập nước.',
  'Tràng An':'Núi đá vôi, hang xuyên thuỷ và thung lũng ngập nước tạo thành cảnh quan đặc trưng ở Ninh Bình.',
  'Phong Nha – Kẻ Bàng':'Vùng núi đá vôi có nhiều hang động và sông ngầm, là ví dụ tiêu biểu về địa hình karst.',
  'Đà Lạt':'Nằm trên cao nguyên Lâm Viên, Đà Lạt có khí hậu mát và phát triển nông nghiệp, du lịch.',
  'Đà Nẵng':'Thành phố ven biển, là đầu mối giao thông và dịch vụ của miền Trung.',
  'Phố cổ Hội An':'Đô thị cảng cổ gắn với sông Thu Bồn, minh hoạ vai trò của đường thuỷ trong giao thương.',
  'Côn Đảo':'Quần đảo ở Đông Nam Bộ có các hệ sinh thái biển như rạn san hô và thảm cỏ biển.',
  'Đảo Phú Quốc':'Đảo trong vịnh Thái Lan, có cảnh quan rừng và biển, phát triển du lịch và dịch vụ.',
  'Hồ Tơ Nưng':'Còn gọi là Biển Hồ, có cảnh quan đẹp và giá trị về sinh thái, du lịch.',
  'Vùng đồi Long Cốc':'Khu vực trồng chè ở Phú Thọ minh hoạ việc sử dụng đất đồi trong nông nghiệp.',
  'Khu lọc hoá dầu Dung Quất':'Cơ sở lọc hoá dầu ở Quảng Ngãi, minh hoạ ngành công nghiệp chế biến dầu mỏ.',
  'Cảng Cát Lái':'Bến cảng container của Thành phố Hồ Chí Minh, minh hoạ vai trò của vận tải biển trong giao thương.',
  'Bãi biển Mỹ Khê':'Bãi biển ở Đà Nẵng, là ví dụ về tài nguyên du lịch ven biển.',
  'Mỏ Bạch Hổ':'Giàn khoan trong ảnh minh hoạ hoạt động khai thác dầu khí ở thềm lục địa Việt Nam.'
};
const records = [
  [0,'Đỉnh Fansipan',103.78,22.30,'Dãy Hoàng Liên Sơn'],
  [0,'Dãy Hoàng Liên Sơn',103.71,22.16,'Tây Bắc'],
  [0,'Thác Bản Giốc',106.72,22.85,'Cao Bằng'],
  [0,'Cao nguyên đá Đồng Văn',105.33,23.23,'Hà Giang trong SGK'],
  [0,'Cao nguyên Mộc Châu',104.66,20.85,'Sơn La'],
  [0,'Điện Biên Phủ',103.02,21.39,'Điện Biên'],
  [0,'Lào Cai',103.96,22.48],
  [0,'Lai Châu',103.46,22.40],
  [0,'Sơn La',103.91,21.33],
  [0,'Thái Nguyên',105.84,21.58],
  [0,'Lạng Sơn',106.76,21.85],
  [0,'Hồ Ba Bể',105.61,22.41,'Bắc Kạn trong SGK'],
  [0,'Hồ Thác Bà',105.02,21.87,'Lưu vực sông Chảy'],
  [0,'Thuỷ điện Sơn La',104.03,21.50,'Sông Đà'],
  [0,'Thuỷ điện Hoà Bình',105.32,20.80,'Sông Đà'],
  [0,'Tuyên Quang',105.21,21.82],
  [0,'Phú Thọ',105.23,21.31],
  [0,'Vườn quốc gia Hoàng Liên',103.79,22.29,'Lào Cai'],
  [0,'Vùng đồi Long Cốc',null,null,'Phú Thọ'],
  [1,'Vịnh Hạ Long',107.06,20.88,'Quảng Ninh'],
  [1,'Tràng An',105.92,20.26,'Ninh Bình'],
  [1,'Cát Bà',107.04,20.78,'Hải Phòng'],
  [1,'Vườn quốc gia Cúc Phương',105.60,20.34],
  [1,'Hải Phòng',106.69,20.85],
  [1,'Bắc Ninh',106.08,21.18],
  [1,'Hưng Yên',106.05,20.65],
  [1,'Ninh Bình',105.98,20.25],
  [1,'Đảo Cô Tô',107.78,20.99,'Quảng Ninh'],
  [1,'Sông Hồng',105.87,21.04,'Vị trí đánh dấu tại Hà Nội'],
  [1,'Sông Thái Bình',106.40,20.94],
  [1,'Sân bay Nội Bài',105.81,21.22,'Hà Nội'],
  [1,'Sân bay Cát Bi',106.72,20.82,'Hải Phòng'],
  [1,'Sân bay Vân Đồn',107.42,21.12,'Quảng Ninh'],
  [2,'Phong Nha – Kẻ Bàng',106.26,17.59,'Quảng Bình trong SGK'],
  [2,'Huế',107.58,16.47,'Sông Hương'],
  [2,'Sông Hương',107.58,16.48,'Huế'],
  [2,'Thanh Hoá',105.79,19.81],
  [2,'Nghệ An',105.68,18.68],
  [2,'Hà Tĩnh',105.91,18.34],
  [2,'Quảng Trị',107.19,16.75],
  [2,'Đồng Hới',106.62,17.48],
  [2,'Sông Mã',105.83,19.84],
  [2,'Sông Cả',105.59,18.63,'Sông Lam'],
  [2,'Đảo Cồn Cỏ',107.34,17.16],
  [2,'Khu kinh tế Nghi Sơn',105.80,19.32,'Thanh Hoá'],
  [2,'Vũng Áng',106.39,18.09,'Hà Tĩnh'],
  [2,'Vịnh Chân Mây',108.02,16.33,'Huế'],
  [3,'Đà Lạt',108.44,11.94,'Lâm Đồng'],
  [3,'Đà Nẵng',108.21,16.06],
  [3,'Bãi biển Mỹ Khê',108.25,16.06,'Đà Nẵng'],
  [3,'Phố cổ Hội An',108.33,15.88,'Sông Thu Bồn'],
  [3,'Sông Thu Bồn',108.26,15.87],
  [3,'Quảng Ngãi',108.80,15.12],
  [3,'Măng Đen',108.20,14.60,'Cao nguyên Kon Plông'],
  [3,'Đảo Lý Sơn',109.10,15.38],
  [3,'Gia Lai',108.00,13.98],
  [3,'Hồ Tơ Nưng',108.00,14.06,'Gia Lai · Biển Hồ'],
  [3,'Quy Nhơn',109.23,13.78],
  [3,'Đắk Lắk',108.05,12.67,'Buôn Ma Thuột'],
  [3,'Khánh Hoà',109.19,12.25,'Nha Trang'],
  [3,'Vịnh Cam Ranh',109.17,11.91],
  [3,'Phan Thiết',108.10,10.93,'Bình Thuận trong SGK'],
  [3,'Cao nguyên Lâm Viên',108.47,12.00,'Đà Lạt'],
  [3,'Vườn quốc gia Yok Đôn',107.74,12.90],
  [3,'Khu lọc hoá dầu Dung Quất',108.78,15.40,'Quảng Ngãi'],
  [3,'Quần đảo Hoàng Sa',111.90,16.50],
  [3,'Quần đảo Trường Sa',113.50,10.40],
  [4,'Thành phố Hồ Chí Minh',106.70,10.78,'Sài Gòn'],
  [4,'Côn Đảo',106.61,8.69],
  [4,'Tây Ninh',106.10,11.31],
  [4,'Đồng Nai',106.82,10.95,'Biên Hoà'],
  [4,'Vũng Tàu',107.08,10.35],
  [4,'Hồ Dầu Tiếng',106.35,11.32,'Sông Sài Gòn'],
  [4,'Hồ Trị An',107.15,11.12,'Sông Đồng Nai'],
  [4,'Sông Đồng Nai',106.88,10.91],
  [4,'Vườn quốc gia Cát Tiên',107.34,11.45],
  [4,'Sân bay Tân Sơn Nhất',106.65,10.82,'Thành phố Hồ Chí Minh'],
  [4,'Sân bay Long Thành',107.09,10.77,'Đồng Nai'],
  [4,'Cảng Cát Lái',106.79,10.76,'Thành phố Hồ Chí Minh'],
  [4,'Mỏ Bạch Hổ',null,null,'Thềm lục địa phía Nam'],
  [5,'Cần Thơ',105.78,10.04],
  [5,'Đảo Phú Quốc',103.97,10.23,'Kiên Giang trong SGK'],
  [5,'An Giang',105.43,10.39,'Long Xuyên'],
  [5,'Đồng Tháp',105.63,10.46,'Cao Lãnh'],
  [5,'Vĩnh Long',105.96,10.25],
  [5,'Cà Mau',105.15,9.18],
  [5,'Mũi Cà Mau',104.82,8.61],
  [5,'Đồng Tháp Mười',105.76,10.66],
  [5,'Tứ giác Long Xuyên',105.16,10.36],
  [5,'Vườn quốc gia Tràm Chim',105.52,10.72],
  [5,'Vườn quốc gia U Minh Thượng',105.09,9.55],
  [5,'Sông Tiền',105.76,10.47,'Hệ thống sông Mê Công'],
  [5,'Sông Hậu',105.80,10.06,'Hệ thống sông Mê Công'],
  [5,'Kiên Hải',104.62,9.82,'Hòn Tre, Hòn Sơn và Nam Du'],
  [5,'Đảo Thổ Châu',103.48,9.31,'Quần đảo Thổ Châu'],
];

function makePlace(region,name,longitude,latitude,locality = '') {
  const overview = Boolean(atlasImages[name]);
  const localPhoto = atlasImages[name] || textbookImages[name];
  const commonsPhoto = !localPhoto && placeMedia[name];
  const [file,credit,source,license] = localPhoto || commonsPhoto || [];
  const image = file && (commonsPhoto ? '/atlas/places/' : '/scenery/')+file+'.webp';
  return {region,name,coordinates:longitude === null ? placePositions[name] : [longitude,latitude],locality,note:placeNotes[name],
    image,credit,source:source || (name==='Huế' ? heritage : undefined),license,photoSource:Boolean(commonsPhoto),overview};
}

export const extraPlaces = records.map(record=>makePlace(...record));

export const tourismIndex = destinations;

const namesInMaterials = [
  [0,'Tây Bắc','Đông Bắc','Cánh cung Sông Gâm','Cánh cung Ngân Sơn','Cánh cung Bắc Sơn','Cánh cung Đông Triều','Dãy Con Voi','Dãy Pu Đen Đinh','Sông Đà','Sông Lô','Sông Gâm','Sông Chảy','Sông Năng','Sông Kỳ Cùng','Lũng Cú','A Pa Chải','Mường Nhé','Hà Giang','Yên Bái','Hoà Bình','Bắc Kạn','Cao Bằng','Bắc Giang'],
  [1,'Quảng Ninh','Nam Định','Thái Bình','Hải Dương','Hà Nam','Vĩnh Phúc','Sông Đáy','Sông Cầu','Sông Như Nguyệt','Vân Đồn','Cảng Vân Đồn','Bạch Đằng','Cửa Lạch Huyện','Hoa Lư','Đảo Bạch Long Vĩ','Vườn quốc gia Xuân Thuỷ','Vịnh Bắc Bộ'],
  [2,'Quảng Bình','Dãy Bạch Mã','Trường Sơn Bắc','Đỉnh Pu Xai Lai Leng','Dãy Tam Điệp','Đồng bằng Thanh Hoá','Động Phong Nha','Hang Sơn Đoòng','Cửa Lò','Sầm Sơn','Đèo Hải Vân','Sông Gianh','Sông Bến Hải','Sông Nhật Lệ','Vườn quốc gia Pù Mát'],
  [3,'Trường Sơn Nam','Đỉnh Ngọc Linh','Đầm Thị Nại','Sông Ba','Sông Sê San','Sông Srê Pôk','Sông Trà Khúc','Núi Chúa','Cao nguyên Kon Tum','Cao nguyên Pleiku','Cao nguyên Đắk Lắk','Cao nguyên Mơ Nông','Cao nguyên Di Linh','Kon Tum','Quảng Nam','Phú Yên','Bình Định','Bình Thuận','Ninh Thuận','Đắk Nông','Lâm Đồng','Nha Trang','Mũi Né','Vịnh Vân Phong','Vịnh Nha Trang','Cù Lao Chàm','Bán đảo Sơn Trà','Thánh địa Mỹ Sơn','Buôn Ma Thuột'],
  [4,'Bình Phước','Bình Dương','Bà Rịa – Vũng Tàu','Biên Hoà','Cái Mép – Thị Vải','Sông Sài Gòn','Núi Bà Đen','Phú Mỹ'],
  [5,'Bán đảo Cà Mau','Kiên Giang','Hậu Giang','Sóc Trăng','Bạc Liêu','Bến Tre','Trà Vinh','Tiền Giang','Long An','Hà Tiên','Rạch Giá','Long Xuyên','Châu Đốc','Cao Lãnh','Sa Đéc','Mỹ Tho','Rừng tràm Trà Sư','U Minh Hạ','Sông Cửu Long','Sông Vàm Cỏ','Sông Mê Công','Vịnh Thái Lan'],
  [null,'Biển Đông','Bán đảo Đông Dương','Đảo Hải Nam','Hồ Tôn-lê Sáp','Đảo Thanh Lam','Đảo Ba Bình','Đảo Song Tử Tây','Đảo Sinh Tồn','Đảo Trường Sa','Đảo Tri Tôn','Đảo Phú Lâm']
];

for (const [region,...names] of namesInMaterials) {
  for (const name of names) extraPlaces.push(makePlace(region,name,null,null,'Địa danh trong học liệu'));
}
