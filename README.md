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
| Khách | Rê chuột, chạm hoặc dùng bàn phím chọn vùng. | Xem ảnh SGK và tóm tắt từng vùng trong cửa sổ thông tin. |
| Học sinh | Chọn khối khi đăng ký, nhập mã lớp nếu giáo viên cung cấp, rồi mở Góc học tập. | Xem học liệu của khối trong tài khoản. Luyện tối đa 10 câu mỗi lượt, xem điểm và đáp án sau khi nộp. |
| Học sinh thi thử | Chọn khối, mở Thi thử, trả lời và xem lại trước khi nộp. | Làm đề 45 phút. Điểm được lưu vào sổ học tập. Khi đang mở đề, giao diện tự nộp lúc hết giờ. |
| Học sinh ôn lại | Mở Sổ học tập sau một số lượt học. | Xem lịch sử và mở lại bài có tỉ lệ sai cao nhất trong các lượt đã nộp. |
| Giáo viên | Tạo lượt chơi theo đội hoặc cá nhân, chiếu QR. Học sinh quét hoặc nhập mã phòng và đặt tên. Giáo viên lần lượt mở 10 câu. | Mỗi phòng có cả ba mức biết, hiểu và vận dụng. Mỗi người gửi một đáp án cho mỗi câu. Bảng điểm cá nhân và tổng điểm đội cập nhật theo lượt. Cuối phòng có thống kê đúng, sai, bỏ qua và tỉ lệ đúng theo câu. |
| Giáo viên theo dõi ở nhà | Cấp mã lớp cho học sinh rồi mở Sổ học tập. | Xem số bài đã nộp, tổng điểm và bài làm gần nhất của từng học sinh đang liên kết với mình. |

## Thiết kế giao diện và nội dung

Bản đồ gồm sáu vùng theo cách chia trong SGK Địa lí 9. Các lớp SVG tạo chiều sâu và có thể chuyển sang góc nhìn phẳng. Mỗi vùng có màu, tên và nút chú giải. Khi rê chuột, chạm hoặc dùng bàn phím, cửa sổ nổi hiển thị ảnh và thông tin vùng. Danh mục Luyện tập nằm trong Góc học tập sau đăng nhập. Học sinh thấy khối đã đăng ký và giáo viên thấy cả hai khối.

Trang chủ đặt bản đồ nổi Việt Nam trên nền ảnh Vịnh Hạ Long. Rê chuột, chạm hoặc dùng bàn phím trên bản đồ để xem tên và ảnh SGK của từng vùng. Nút Khám phá bản đồ mở trang bản đồ riêng. Ba dải giới thiệu Bản đồ, Góc học tập và Phòng học có nền toàn chiều ngang. Trên màn hình rộng, ảnh chính hòa vào một lớp ảnh nền cùng tông để hạn chế phóng lớn. Nội dung hiện dần khi cuộn đến từng mục. Các biểu tượng trang trí trong ô tính năng được cắt hiển thị từ hai ảnh gốc trong `public/decor`. Ảnh Wikimedia Commons của các địa danh nằm trong `public/atlas/places`, kèm tên tác giả, nguồn và thông tin giấy phép trong `public/map-place-media.js`.

Các lớp nền bổ sung dùng ảnh Đà Lạt từ bộ ảnh được cung cấp, bản đồ lịch sử trong *Scottish Geographical Magazine* (1886) và ảnh lớp học của Thúy Quỳnh Ngô. [Bản đồ lịch sử](https://commons.wikimedia.org/wiki/File:Indochina_map_1886.jpg) · [Ảnh lớp học](https://www.pexels.com/photo/empty-classroom-with-sunlight-streaming-through-windows-30105084/) · [Giấy phép Pexels](https://www.pexels.com/license/)

Trong trang bản đồ, danh mục bên trái hỗ trợ tìm theo tên vùng hoặc địa danh có dấu và không dấu. Rê chuột để xem trước và bấm để ghim thông tin, ảnh và nguồn ở khung bên cạnh. Khi ghim một địa danh, bản đồ chỉ hiển thị điểm của địa danh đó nếu có toạ độ. Người dùng có thể bật tắt các điểm gợi ý khi xem tổng quan, thu phóng và đọc thông tin tự nhiên, dân cư, kinh tế của từng vùng. Các số liệu ghi năm và nguồn SGK. Các màn hình dùng Be Vietnam Pro cho chữ nội dung và Lora cho tiêu đề. Chuyển động được tắt khi thiết bị yêu cầu giảm chuyển động. Nguồn bản đồ được ghi trong mục Nguồn lược đồ. Thư mục `design/references` lưu ảnh thiết kế tham khảo đã gửi.

Câu trả lời ngắn hiển thị đơn vị cạnh ô nhập. Với vĩ độ, học sinh điền số độ và số phút vào hai ô. Máy chủ chấp nhận dấu phẩy hoặc dấu chấm thập phân.

| Học liệu | Phạm vi |
| --- | --- |
| Địa lí 8 | 12 bài và 2 chủ đề chung, 341 câu luyện tập |
| Địa lí 9 | 21 bài và 3 chủ đề chung, 465 câu luyện tập và 12 câu đề giữa kì I |
| Tư liệu gắn vào câu hỏi | Hình 6.5 trang 124 lớp 8 về lưu vực sông Thu Bồn. Bảng 5.1 và hình 5.1 trang 131 lớp 9 về lương thực và nông nghiệp. Hình 21.1 trang 214 lớp 9 về các vùng biển. |

Ngân hàng luyện tập gồm 800 câu từ hai bộ DOCX, được đối chiếu theo bài, phần, số câu và khóa đáp án. Mỗi câu dẫn lại vị trí trong DOCX. Có 171 câu kèm bảng dữ liệu HTML. Hai câu cuối của chủ đề châu thổ lớp 9 thiếu khóa trong DOCX. Đáp án được tính từ số liệu đề bài và có lời giải. Sáu câu do dự án biên soạn dành cho bài bổ sung và đọc tư liệu SGK. Một số bài bổ sung hiện có một câu. Đợt đối chiếu kiểm tra nội dung nhập từ DOCX và xử lý các điểm lệch được phát hiện, còn việc xác nhận từng dữ kiện trong khóa DOCX với SGK là một mức rà soát riêng.

**Quy ước thi thử.** Lớp 9 có lựa chọn giữa kì I theo phần khách quan của đề mẫu và đề ôn tổng hợp cả năm. Lớp 8 có đề ôn tổng hợp. Mỗi đề gồm 8 câu nhiều lựa chọn, 2 câu đúng sai mỗi câu 4 ý và 2 câu trả lời ngắn. Điểm lần lượt là 0,5 điểm mỗi câu nhiều lựa chọn, 0,25 điểm mỗi ý đúng sai và 0,5 điểm mỗi câu trả lời ngắn. Kết quả hiển thị điểm khách quan trên 7 và điểm quy đổi trên 10. Đề gốc còn 3 điểm tự luận.

  - Câu I.2 ghi rõ giai đoạn 1999–2024 theo SGK 9 trang 119.
  - Câu I.6 chấm D theo nội dung ứng dụng công nghệ cao trong SGK 9 trang 131. Khóa PDF ghi B.
  - Câu III.2 có kết quả tính được là 18,9601%, làm tròn thành 19,0%. Website cũng chấp nhận 18,9% theo hướng dẫn chấm của đề mẫu.

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

Trong phòng chờ của giáo viên, mã QR nằm cạnh mã phòng. Học sinh quét mã để mở thẳng màn hình nhập tên tham gia. Mã phòng vẫn có thể nhập bằng tay.

Để chơi qua Wi-Fi lớp học, cấu hình `HOST=0.0.0.0` và `PUBLIC_ORIGIN=http://<IP-máy-giáo-viên>:3000` trong `.env`, khởi động lại rồi mở chính địa chỉ mạng LAN đó trên máy chiếu. Điện thoại cần truy cập được cùng địa chỉ. Địa chỉ 127.0.0.1 trên điện thoại chỉ về bản thân điện thoại.

Để học ở nhà, chạy ứng dụng trên một máy chủ Node với thư mục lưu trữ bền vững, cấu hình tên miền HTTPS và đặt `PUBLIC_ORIGIN` thành địa chỉ đó. Có thể đổi `DATA_DIR`, `HOST` và `PORT` theo môi trường. Khi sao lưu bằng cách sao chép tệp, dừng ứng dụng trước rồi sao lưu cả thư mục dữ liệu. GitHub lưu mã nguồn. GitHub Pages chỉ phục vụ tệp tĩnh nên luồng đăng nhập, chấm bài và phòng chơi cần một dịch vụ chạy Node riêng.

## Triển khai trên Render

1. Tạo một **Web Service** từ kho `kien-ngtt196/the-geography-app`. Chọn nhánh `main`, môi trường Node và giữ thư mục gốc mặc định.
2. Đặt **Build Command** là `npm ci` và **Start Command** là `npm start`. Chọn gói hỗ trợ đĩa lưu trữ bền vững. Gắn đĩa tại `/var/data` trong phần **Advanced**.
3. Thêm các biến môi trường dưới đây. Render cấp `PORT` cho dịch vụ. Sau khi biết địa chỉ HTTPS thực tế, cập nhật `PUBLIC_ORIGIN` theo địa chỉ đó, bỏ dấu gạch chéo cuối và triển khai lại.

| Biến môi trường | Giá trị |
| --- | --- |
| `NODE_VERSION` | `24.22.1` |
| `HOST` | `0.0.0.0` |
| `DATA_DIR` | `/var/data` |
| `PUBLIC_ORIGIN` | Địa chỉ HTTPS thực của dịch vụ |
| `TEACHER_KEY` | Mã bí mật do bạn đặt để đăng ký giáo viên |

Ứng dụng tự tạo `/var/data/atlas.sqlite` và các bảng trong lần khởi động đầu tiên. Tài khoản thử trên máy phát triển nằm trong cơ sở dữ liệu cục bộ. Trên bản triển khai mới, đăng ký giáo viên bằng `TEACHER_KEY`, tạo phòng và quét QR bằng điện thoại để kiểm tra địa chỉ đã cấu hình. [Web Services](https://render.com/docs/web-services) · [Persistent Disks](https://render.com/docs/disks) · [Node.js trên Render](https://render.com/docs/node-version)

## Triển khai trên Vercel với Neon

1. Import kho `kien-ngtt196/the-geography-app` từ GitHub vào Vercel. Trong **Settings → Environments → Production → Branch Tracking**, chọn `main`. Dự án dùng Node.js 24 và cấu hình có sẵn trong `vercel.json`.
2. Tạo một cơ sở dữ liệu Neon riêng cho Atlat Việt. Kết nối qua [Neon Marketplace](https://vercel.com/marketplace/neon) hoặc đặt chuỗi kết nối **pooled** vào biến `DATABASE_URL` của môi trường Production. Ứng dụng cũng đọc `POSTGRES_URL` nếu tích hợp cung cấp biến này.
3. Thêm `TEACHER_KEY` với giá trị bí mật tự chọn. Nếu dùng một tên miền cố định cho QR, đặt `PUBLIC_ORIGIN` thành địa chỉ HTTPS của tên miền đó, bỏ dấu `/` cuối. Khi không đặt biến này, QR dùng địa chỉ HTTPS đang truy cập trên Vercel.
4. Triển khai lại rồi mở `/api/health`. Kết quả `{"ok":true}` xác nhận backend truy cập được cơ sở dữ liệu. Lần gọi đầu tiên tự tạo các bảng. Đăng ký tài khoản giáo viên, tạo phòng rồi quét QR để kiểm tra.

Neon lưu tài khoản, tiến độ và phòng chơi riêng của Atlat Việt. Các tài khoản và điểm trong SQLite cục bộ không tự chuyển sang Neon. Ở máy phát triển, chạy `npm start` với `DATABASE_URL` trống để tiếp tục dùng SQLite. Có thể chạy bộ kiểm tra với một PostgreSQL thử nghiệm độc lập bằng `ATLAS_TEST_DATABASE_URL`. [Nhánh production trên Vercel](https://vercel.com/docs/git#production-branch) · [Postgres trên Vercel](https://vercel.com/docs/postgres)

## Kiểm tra trước khi thử với lớp

Kiểm thử tự động tạo tài khoản giả, đăng nhập lại, đối chiếu đáp án, quyền xem kết quả, gợi ý học, QR và một lượt chơi 10 câu. Giáo viên có thể nghiệm thu trên lớp bằng cách cho hai điện thoại vào cùng phòng, trả lời khác nhau rồi so bảng điểm và thống kê từng câu. Bản thử đã được kiểm tra trên máy phát triển. Việc quét mã trên điện thoại thật và tải đồng thời của cả lớp cần kiểm tra trên mạng sẽ dùng khi dạy.
