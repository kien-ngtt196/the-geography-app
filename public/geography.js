export const regions = [
  {name:'Trung du và miền núi phía Bắc',short:'Miền núi phía Bắc',color:'#5e9367',light:'#adca6b',side:'#3c6951',photo:'north',summary:'Từ thung lũng tới núi cao, địa hình tạo nên nhiều đai khí hậu. Khám phá mối liên hệ giữa độ cao, cây trồng và tiềm năng thuỷ điện.'},
  {name:'Đồng bằng sông Hồng',short:'Đồng bằng sông Hồng',color:'#b8ba54',light:'#e2dc7e',side:'#797940',photo:'red-river',summary:'Phù sa sông Hồng bồi đắp đồng bằng. Dân cư đông đúc, hệ thống đê và nghề trồng lúa gắn bó với nhau như thế nào?'},
  {name:'Bắc Trung Bộ',short:'Bắc Trung Bộ',color:'#ddaa52',light:'#f1d78a',side:'#9c6934',photo:'north-central',summary:'Từ Trường Sơn ra biển là một dải đất hẹp ngang. Theo dấu gió phơn, dòng sông ngắn và mùa lũ để hiểu cách người dân thích ứng.'},
  {name:'Duyên hải Nam Trung Bộ và Tây Nguyên',short:'Nam Trung Bộ và Tây Nguyên',color:'#cf8460',light:'#e8ac6f',side:'#904e3e',photo:'highlands',summary:'Các cao nguyên đất badan nối với dải duyên hải qua nhiều tuyến giao thông. Cùng tìm hiểu cây công nghiệp, cảng biển và nguồn nước mùa khô.'},
  {name:'Đông Nam Bộ',short:'Đông Nam Bộ',color:'#a47da7',light:'#d6acc9',side:'#694f78',photo:'southeast',summary:'Đất badan, đất xám và mạng lưới đô thị tạo nên những vùng cây công nghiệp, trung tâm sản xuất và đầu mối giao thương.'},
  {name:'Đồng bằng sông Cửu Long',short:'Đồng bằng sông Cửu Long',color:'#5fa49c',light:'#a2caba',side:'#367770',photo:'mekong',summary:'Mạng lưới kênh rạch đưa nước và phù sa tới ruộng lúa, vườn cây. Quan sát cách vùng châu thổ thích ứng với mùa nước nổi và xâm nhập mặn.'}
];
const svgNS='http://www.w3.org/2000/svg';
export function svg(tag,attrs,text){
  const el=document.createElementNS(svgNS,tag);
  for(const [k,v] of Object.entries(attrs)) el.setAttribute(k,v);
  if(text)el.textContent=text;
  return el;
}
