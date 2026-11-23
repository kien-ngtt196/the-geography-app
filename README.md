# Atlat Việt

Website tự học Địa lí THCS dành cho học sinh lớp 8, lớp 9 và giáo viên. Bản đồ Việt Nam là lối vào bài học. Máy chủ lưu kết quả và điều phối các lượt chơi trên lớp.

## Chạy ứng dụng

Dùng Node.js 24 trở lên. Từ thư mục dự án, chạy:

```sh
npm ci
npm start
```

Mở http://127.0.0.1:3000. Dùng `npm run dev` để máy chủ tự khởi động lại khi sửa mã. Chạy `npm test` để kiểm tra các luồng nghiệp vụ với cơ sở dữ liệu thử riêng.

Máy chủ tự tạo thư mục `.storage`, tệp cơ sở dữ liệu và mã đăng ký giáo viên trong `.storage/teacher-key.txt`. Có thể sao chép `.env.example` thành `.env` và đặt `TEACHER_KEY` riêng. Giáo viên dùng mã này **một lần khi đăng ký**. Trong mục Tài khoản, mỗi giáo viên có một **mã lớp** để đưa cho học sinh. Mỗi lượt chơi lại có một **mã phòng sáu chữ số**.

## Workflow học và dạy

| Người dùng | Thao tác | Kết quả |
| --- | --- | --- |
| Khách | Chọn khối, rê chuột, chạm hoặc dùng bàn phím chọn vùng. Mở một bài và bắt đầu học thử. | Đọc tóm tắt và làm ba câu mẫu cố định của khối. Có lời mời đăng ký sau khi xem đáp án. |
| Học sinh | Đăng ký, nhập mã lớp ngay hoặc trong mục Tài khoản. Chọn vùng, bài học và luyện tập. | Luyện tối đa 10 câu mỗi lượt trong bài đã chọn. Sau khi nộp, xem điểm, kết quả từng câu và đáp án. |
| Học sinh thi thử | Chọn khối, mở Thi thử, trả lời và xem lại trước khi nộp. | Làm đề 45 phút. Điểm được lưu vào sổ học tập. Khi đang mở đề, giao diện tự nộp lúc hết giờ. |
| Học sinh ôn lại | Mở Sổ học tập sau một số lượt học. | Xem lịch sử và mở lại bài có tỉ lệ sai cao nhất trong các lượt đã nộp. |
| Giáo viên | Tạo lượt chơi theo đội hoặc cá nhân, chiếu QR. Học sinh quét hoặc nhập mã phòng và đặt tên. Giáo viên lần lượt mở 10 câu. | Mỗi phòng có cả ba mức biết, hiểu và vận dụng. Mỗi người gửi một đáp án cho mỗi câu. Bảng điểm cá nhân và tổng điểm đội cập nhật theo lượt. Cuối phòng có thống kê đúng, sai, bỏ qua và tỉ lệ đúng theo câu. |
| Giáo viên theo dõi ở nhà | Cấp mã lớp cho học sinh rồi mở Sổ học tập. | Xem số bài đã nộp, tổng điểm và bài làm gần nhất của từng học sinh đang liên kết với mình. |

## Thiết kế giao diện và nội dung

Bản đồ SVG gồm sáu vùng theo cách chia trong SGK Địa lí 9 được cung cấp. Mỗi vùng có màu, tên và nút tương ứng trong chú giải. Thẻ bên cạnh bản đồ cập nhật ngay khi chọn vùng. Trên điện thoại, thẻ nằm dưới bản đồ. Lớp 8 liên kết địa phương với các chủ đề tự nhiên xuyên vùng như địa hình, khí hậu, đất và nước. Lớp 9 liên kết trực tiếp với bài về vùng và các ngành kinh tế liên quan. Danh mục Luyện tập cho phép mở cả những bài không gắn riêng với một vùng.

Giao diện kết hợp ba cách trình bày theo mục đích sử dụng: atlat minh hoạ để khám phá, thẻ bài học để tự ôn và màn hình phòng chơi để chiếu QR, câu hỏi và bảng điểm. Dữ liệu nền lược đồ lấy từ geoBoundaries và Natural Earth, có ghi nguồn trong mục Nguồn lược đồ. Ranh giới đã được giản lược phục vụ học theo vùng. Ảnh phong cảnh từ phiên bản trước của dự án dùng để minh hoạ thẻ vùng.

| Học liệu | Phạm vi |
| --- | --- |
| Địa lí 8 | 12 bài và 2 chủ đề chung, 340 câu |
| Địa lí 9 | 21 bài và 3 chủ đề chung, 355 câu |
| Tư liệu trực quan trích từ SGK | Hình 6.5 trang 124 lớp 8 về lưu vực sông Thu Bồn. Bảng 5.1 và hình 5.1 trang 131 lớp 9 về lương thực và nông nghiệp. |

Hai ngân hàng DOCX và hai SGK trong `documents` trùng nội dung tệp đầu vào của phiên bản trước theo mã băm Git. Bộ dữ liệu hiện tại kế thừa 689 câu đã chuẩn hoá trong nhánh cũ, bổ sung sáu câu, trong đó có ba câu đọc tư liệu SGK. Một số bài bổ sung hiện có một câu. Tệp đầy đủ của SGK, đề có chữ ký và dữ liệu học sinh được giữ ngoài thư mục web. Tóm tắt và các câu bổ sung là nội dung biên soạn của bản dùng thử, cần giáo viên duyệt trước khi dùng để đánh giá chính thức.

**Quy ước thi thử.** Đề giữa kỳ lớp 9 có 8 câu nhiều lựa chọn, 2 câu đúng sai mỗi câu 4 ý, 2 câu trả lời ngắn và phần tự luận. Website thực hiện ba dạng khách quan theo yêu cầu trong Google Docs. Điểm ba phần có trọng số 4, 2, 1 theo đề mẫu, sau đó quy đổi tổng 7 điểm sang thang 10. Mỗi ý đúng trong một câu đúng sai được tính riêng. Cả hai khối dùng quy ước này cho bản thử. Đề chọn ngẫu nhiên trong khối, còn luyện tập cho phép giới hạn theo bài.

## Backend và cơ sở dữ liệu

Máy chủ Node.js phục vụ giao diện và API cùng nguồn. Đáp án nằm trong ngân hàng JSON phía máy chủ. Khi tạo lượt học, máy chủ lưu bản chụp bộ câu hỏi. Khi nộp, máy chủ kiểm tra quyền sở hữu và thời hạn rồi chấm điểm. Nộp lại cùng lượt trả về kết quả đã lưu. API phòng chơi trao đổi trạng thái qua HTTP khoảng mỗi 1,4 giây. Câu trả lời gắn với mã câu hiện hành để lượt gửi muộn không bị tính vào câu sau.

SQLite phù hợp với một máy chủ thử nghiệm cho trường vì có giao dịch, lưu được lịch sử qua các lần khởi động và triển khai cùng ứng dụng. Học liệu dùng JSON để dễ duyệt thay đổi trong Git. Dữ liệu phát sinh nằm trong các bảng sau.

| Bảng | Trách nhiệm |
| --- | --- |
| `users`, `sessions` | Tài khoản học sinh và giáo viên, quan hệ lớp, phiên đăng nhập có hạn. Mật khẩu dùng scrypt với salt riêng. Cookie phiên là HttpOnly. |
| `attempts` | Khối, chế độ, bài, đề, thời hạn và kết quả từng lượt. Dùng để lập báo cáo và gợi ý ôn lại. |
| `rooms`, `players`, `responses` | Phòng, người chơi, đội và đáp án theo câu. Ràng buộc duy nhất ngăn tính điểm trùng. |

Điểm vào chính là `server.js`. `rooms.js` điều phối lớp học, `learning.js` lấy đề và chấm điểm, `storage.js` khởi tạo SQLite. Hai tệp `content/grade8.json` và `content/grade9.json` chứa bài học và câu hỏi. `public/` chứa giao diện cùng tư liệu trình duyệt được phép tải.

## Dùng QR với điện thoại và đưa lên máy chủ

Để chơi qua Wi-Fi lớp học, cấu hình `HOST=0.0.0.0` và `PUBLIC_ORIGIN=http://<IP-máy-giáo-viên>:3000` trong `.env`, khởi động lại rồi mở chính địa chỉ mạng LAN đó trên máy chiếu. Điện thoại cần truy cập được cùng địa chỉ. Địa chỉ 127.0.0.1 trên điện thoại chỉ về bản thân điện thoại.

Để học ở nhà, chạy ứng dụng trên một máy chủ Node với thư mục lưu trữ bền vững, cấu hình tên miền HTTPS và đặt `PUBLIC_ORIGIN` thành địa chỉ đó. Có thể đổi `DATA_DIR`, `HOST` và `PORT` theo môi trường. Khi sao lưu bằng cách sao chép tệp, dừng ứng dụng trước rồi sao lưu cả thư mục dữ liệu. GitHub lưu mã nguồn. GitHub Pages chỉ phục vụ tệp tĩnh nên luồng đăng nhập, chấm bài và phòng chơi cần một dịch vụ chạy Node riêng.

## Kiểm tra trước khi thử với lớp

Kiểm thử tự động tạo tài khoản giả, đăng nhập lại, đối chiếu đáp án, quyền xem kết quả, gợi ý học, QR và một lượt chơi 10 câu. Giáo viên có thể nghiệm thu trên lớp bằng cách cho hai điện thoại vào cùng phòng, trả lời khác nhau rồi so bảng điểm và thống kê từng câu. Bản thử đã được kiểm tra trên máy phát triển. Việc quét mã trên điện thoại thật và tải đồng thời của cả lớp cần kiểm tra trên mạng sẽ dùng khi dạy.
