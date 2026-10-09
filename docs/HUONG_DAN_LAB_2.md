# Lab 2 - Hướng dẫn chạy, kiểm tra và nộp bài

## 1. Chuẩn bị dự án riêng

Lab 2 nằm trong `vku-room-booking`, tách khỏi `vku-field-survey` của Lab 1. Database: `vku_room_booking`; backend: **8081**; Metro/web: **8082**. Giữ cấu hình Lab 1 nguyên trạng.

Giải nén gói mã nguồn để có thư mục `C:\Users\nddhu\vku-room-booking` (bên trong có `backend`, `mobile`, `docs`). Nếu lưu ở nơi khác, thay đường dẫn `cd` trong các lệnh dưới đây. Có thể clone repository theo hướng dẫn cuối tài liệu thay cho giải nén.

Kiểm tra:

```powershell
node --version
npm --version
java -version
git --version
```

Yêu cầu Node >=22.13 (Node 24 phù hợp), JDK 21, PostgreSQL 16+, pgAdmin, Expo Go **SDK 57** trên điện thoại Android. Nếu Expo Go trên Play Store báo không tương thích, vào https://expo.dev/go chọn SDK 57 và Android; không tự nâng/hạ dependency để chữa lỗi. iPhone cần Expo Go/build tương thích; không bảo đảm bản Expo Go App Store hỗ trợ SDK mới. Nếu điện thoại không chạy được SDK 57, dùng development build hoặc APK ở mục 8.

## 2. Tạo tài khoản và database PostgreSQL

Trong pgAdmin, đăng nhập máy chủ `localhost:5432` bằng tài khoản quản trị `postgres`. Mở Query Tool của database **postgres**, bật Auto-commit. Trước hết kiểm tra:

```sql
SELECT rolname FROM pg_roles WHERE rolname = 'vku_booking';
SELECT datname FROM pg_database WHERE datname = 'vku_room_booking';
```

Nếu role chưa tồn tại, chạy:

```sql
CREATE ROLE vku_booking WITH LOGIN PASSWORD 'MAT_KHAU_LOCAL_BAN_CHON';
```

Nếu role đã tồn tại và bạn muốn dùng mật khẩu mới, chạy `ALTER ROLE vku_booking WITH LOGIN PASSWORD 'MAT_KHAU_LOCAL_BAN_CHON';` thay cho CREATE ROLE.

Nếu database chưa tồn tại, chọn và chạy **riêng** câu sau:

```sql
CREATE DATABASE vku_room_booking OWNER vku_booking;
```

Không chạy CREATE DATABASE trong transaction hoặc kèm các câu khác. Nếu đã có database lab này, dùng lại; không xóa database để xử lý lỗi. Chuột phải Databases -> Refresh. Các bảng và 12 phòng mẫu do Flyway tạo khi backend chạy lần đầu.

Nếu máy chủ thực tế dùng cổng khác, sửa DB_URL ở mục 3 theo cổng trong Properties -> Connection của pgAdmin. Mật khẩu phải thuộc role `vku_booking`, không tự dùng mật khẩu của `postgres` nếu hai role có mật khẩu khác nhau.

## 3. Chạy backend

PowerShell thứ nhất:

```powershell
cd C:\Users\nddhu\vku-room-booking\backend
$env:DB_URL = "jdbc:postgresql://localhost:5432/vku_room_booking"
$env:DB_USERNAME = "vku_booking"
$env:DB_PASSWORD = "MAT_KHAU_LOCAL_BAN_CHON"
$env:SERVER_PORT = "8081"
.\mvnw.cmd spring-boot:run
```

Thay mật khẩu bằng đúng giá trị đã đặt. Đặt biến và chạy Maven trong cùng terminal; biến không tự chuyển sang cửa sổ khác. File mvnw.cmd chỉ chạy được khi ở đúng thư mục backend.

Chờ `Started BookingApplication`, rồi mở http://localhost:8081/api/health. JSON có `status: UP`, `database: PostgreSQL` và `serverTime`.

Có thể lưu cấu hình để chạy lại: sao chép `backend/.env.example` thành `backend/.env`, điền thông tin, rồi chạy từ thư mục dự án:

```powershell
cd C:\Users\nddhu\vku-room-booking
powershell -ExecutionPolicy Bypass -File .\scripts\run-backend.ps1
```

Spring Boot không tự đọc file .env; script trên nạp file vào môi trường tiến trình. File này được bỏ qua bởi Git. Giữ terminal mở.

## 4. Đưa API ra HTTPS

Cloudflared đã cài từ Lab 1. Mở PowerShell thứ hai:

```powershell
cloudflared --version
cloudflared tunnel --url http://localhost:8081
```

Đây là **tunnel cho cổng 8081**, không dùng URL tunnel Lab 1 đang trỏ đến 8080. Sao chép URL `https://...trycloudflare.com`; giữ terminal mở. Mở `<URL>/api/health` trên điện thoại và xác nhận JSON UP.

Nếu không nhận lệnh cloudflared sau khi cài, mở PowerShell mới từ Start. Nếu tunnel báo 502, kiểm tra backend 8081 đang chạy. Khi tunnel khởi động lại, URL có thể đổi; nhập lại API trong app. App giữ phiên nếu URL mới vẫn trỏ đến cùng backend và token được nhận; nếu là backend khác, cần tạo phiên mới. Không đặt mật khẩu PostgreSQL trong EXPO_PUBLIC_*.

## 5. Cài thư viện và mở Expo trên điện thoại

PowerShell thứ ba:

```powershell
cd C:\Users\nddhu\vku-room-booking\mobile
npm ci
npm start -- --port 8082
```

Laptop và điện thoại cùng Wi-Fi. Trong Expo Go Android -> Scan QR code, quét QR ở terminal. Đây là QR mở ứng dụng, khác QR đặt phòng bên trong app. Lần đầu cần mạng để tải bundle.

Nếu điện thoại không tải được bundle:

1. Kiểm tra phiên bản Expo Go hỗ trợ SDK 57.
2. Cho phép Node.js qua Windows Firewall trên mạng Private; không tắt toàn bộ firewall.
3. Không dùng Wi-Fi có client isolation. Nếu cần tunnel Metro, dừng Metro bằng Ctrl+C, chạy:

```powershell
npm install --global @expo/ngrok
npm start -- --port 8082 --tunnel
```

Tunnel Metro phục vụ bundle Expo; tunnel Cloudflare phục vụ API. Cần duy trì cả hai nếu dùng chế độ này. URL/QR Expo từ terminal chỉ hoạt động khi Metro còn chạy; không xem đó là link demo vĩnh viễn.

Trong app:

1. Cài đặt -> URL gốc API -> nhập URL Cloudflare **không thêm /api**.
2. Lưu địa chỉ -> Kiểm tra kết nối.
3. Tạo phiên demo bằng họ tên và MSSV.
4. Khám phá -> chọn phòng -> chọn ngày tương lai -> khung giờ -> số người -> Xác nhận.
5. Cấp quyền thông báo khi được hỏi. Khi thành công xuất hiện QR và mã đặt chỗ; lịch nằm trong Lịch của tôi.

Thông tin phiên demo chỉ phục vụ bài lab; không phải đăng nhập VKU. Đừng thoát phiên/xóa dữ liệu Expo Go khi còn lịch cần hủy, vì phiên mới nhập cùng MSSV không có quyền truy cập lịch cũ. Dữ liệu cache không thay thế trạng thái máy chủ.

## 6. Kiểm thử đúng yêu cầu

### Lọc và chọn lịch

- Tòa A/B/C/V, số chỗ tối thiểu từ 2 đến 20; thiết bị được kết hợp theo AND (phòng có đủ thiết bị đã chọn).
- Chọn hôm nay và 6 ngày kế tiếp, giờ Việt Nam.
- Khung đã bắt đầu hoặc đã đặt bị khóa. `Available Now` là trạng thái hiện tại, không khẳng định phòng trống ở mọi khung ngày mai.
- Số người từ 2 đến sức chứa phòng. Chọn phòng 6 chỗ rồi nhập 7: phải bị từ chối.

### Hai thiết bị và chống đặt trùng

1. Mở cùng app trên hai điện thoại hoặc điện thoại và web (mục 9), cùng backend.
2. Tạo hai phiên demo khác nhau; vào cùng phòng, ngày mai, cùng khung giờ.
3. Thiết bị 1 đặt trước: thiết bị 2 thấy khung đổi sang Đã đặt qua WebSocket. Nếu hai thiết bị xác nhận cùng lúc, một thành công, một nhận xung đột.
4. Thiết bị 1 hủy lịch còn ở tương lai: thiết bị 2 thấy khung trống lại.
5. Không cố tạo minh chứng xung đột bằng sửa trực tiếp database. Ràng buộc partial unique index đảm bảo tại database, ngoài khóa giao diện.

### Xác nhận PostgreSQL

Trong Query Tool của `vku_room_booking`:

```sql
SELECT b.id, r.name, b.booking_date, b.slot, b.party_size,
       b.status, b.code, b.starts_at, b.ends_at
FROM bookings b JOIN rooms r ON r.id = b.room_id
ORDER BY b.created_at DESC;
```

Đối chiếu code và UUID. Một khung có thể có nhiều lịch đã hủy, nhưng chỉ tối đa một lịch CONFIRMED/CHECKED_IN. Timestamps lưu timestamptz; giao diện hiển thị UTC+7.

### QR và check-in

Mở mã QR từ Lịch của tôi. Nội dung là `vku-booking:<code>`. Nút check-in gửi đúng mã đến backend và chỉ hoạt động từ 15 phút trước giờ bắt đầu đến trước giờ kết thúc. Không có thao tác quét camera trong phạm vi phiên bản này. Lịch đã check-in không được hủy.

### Thông báo local

1. Cài đặt -> Cấp quyền & cập nhật nhắc lịch.
2. Thử thông báo sau 10 giây -> đưa app về nền; phải hiện **Thông báo thử**, không ghi nhầm là nhắc đặt phòng thật.
3. Để kiểm tra yêu cầu 15 phút: ví dụ trước 09:15, đặt khung 09:30-11:30 hôm nay; đến 09:15 thông báo nhận phòng xuất hiện. Các mốc khác: 07:15, 12:45, 14:45.
4. Hủy lịch trước mốc nhắc để kiểm tra không còn thông báo cho lịch hủy.
5. Nếu đặt khi đã qua mốc nhắc, app không lập lịch về quá khứ. Quyền bị từ chối không làm mất đặt chỗ; cấp quyền lại trong cài đặt điện thoại rồi cập nhật nhắc lịch trong app.

Không chỉnh giờ điện thoại hoặc đổi thời gian backend để ghi báo cáo như kiểm thử thật. Thiết bị đặt lịch là thiết bị nhận nhắc; bản web không có nhắc native. Trong Expo Go, quyền/cài đặt hệ điều hành thuộc Expo Go. Nếu force-stop ứng dụng hoặc OS giới hạn hoạt động, việc nhận thông báo có thể bị ảnh hưởng.

### Local và hiệu năng

- Đặt một lịch, đóng/mở app: phiên, bộ lọc và lịch được phục hồi từ AsyncStorage.
- Tắt mạng khi app đã mở: vẫn xem dữ liệu cache, nhưng đặt/hủy không được báo thành công. Expo Go lần đầu hoặc khi cần tải lại bundle vẫn cần Metro và kết nối; đây không phải PWA App Shell của Lab 1.
- Cuộn danh sách trên điện thoại; ghi tên máy và kết quả. Nếu đo FPS, dùng công cụ profiler/monitor phù hợp, ghi điều kiện đo; không suy ra 60 FPS từ việc dùng React.memo. Với Expo Go/dev build, overhead phát triển khác release.

## 7. Chạy kiểm thử tự động

Frontend:

```powershell
cd C:\Users\nddhu\vku-room-booking\mobile
npm run typecheck
npm test
npx expo-doctor@latest
npm run build:web
npm run build:android
```

Backend: tạo database **riêng** bằng Query Tool của postgres, chạy riêng:

```sql
CREATE DATABASE vku_room_booking_test OWNER vku_booking;
```

Trong terminal backend:

```powershell
cd C:\Users\nddhu\vku-room-booking\backend
$env:TEST_DB_URL = "jdbc:postgresql://localhost:5432/vku_room_booking_test"
$env:DB_USERNAME = "vku_booking"
$env:DB_PASSWORD = "MAT_KHAU_LOCAL_BAN_CHON"
.\mvnw.cmd test
```

Test xóa dữ liệu bookings/demo_sessions trong DB test trước mỗi ca và kiểm tra tên DB kết thúc `_test` trước khi xóa. Không dùng DB thật. Test dùng clock riêng cố định, không sửa giờ PostgreSQL hay giờ máy.

E2E web dùng backend đã khởi động với `DB_URL` trỏ DB test. Trong mobile, chạy `npm run build:web`; dùng một terminal chạy `npx serve dist -l 8082`. Terminal mobile khác:

```powershell
npx playwright install chromium
npm run test:e2e
```

Không chạy Metro và serve cùng cổng 8082. E2E mặc định API localhost:8081; có thể đặt API_URL, WEB_URL để đổi. E2E tạo dữ liệu thử và lưu ảnh web vào docs/screenshots; không thay minh chứng điện thoại.

## 8. Tạo APK hoặc development build (tùy chọn)

Bundle Android export không phải APK. Với EAS cần tài khoản Expo và đăng nhập từ laptop; chưa có APK được tạo sẵn trong gói này.

```powershell
cd C:\Users\nddhu\vku-room-booking\mobile
npx eas-cli@latest login
npx eas-cli@latest build:configure
npx eas-cli@latest build --platform android --profile preview
```

Cho EAS liên kết/tạo project trong tài khoản của bạn. Cấu hình preview trong eas.json tạo APK cài thử. Sau build, tải APK từ link EAS, cài trên Android, mở Cài đặt nhập API HTTPS rồi kiểm tra lại. Không đặt token hay mật khẩu database trong app.json/eas.json. EAS có thể yêu cầu chờ hàng đợi hoặc giới hạn theo tài khoản; không cần mua gói để kiểm thử bằng Expo Go.

## 9. Bản web/Vercel bổ sung

Có thể dùng `npm run web -- --port 8082` để mở bản web, hoặc deploy Vercel với Root Directory `mobile`, Framework Other, Install `npm ci`, Build `npm run build:web`, Output `dist`, Node 24. Biến `EXPO_PUBLIC_API_URL` là URL gốc HTTPS backend. Dùng web để minh họa tìm/đặt/hủy và kiểm tra hai phiên; không dùng nó để chứng minh thông báo native.

Nếu deploy Vercel, thêm đúng domain vào CORS rồi khởi động lại backend _*trong terminal có DB_* đúng_*:

```powershell
cd C:\Users\nddhu\vku-room-booking\backend
$env:CORS_ORIGINS = "http://localhost:8082,http://localhost:19006,https://DOMAIN_LAB2.vercel.app"
.\mvnw.cmd spring-boot:run
```

Domain không có dấu / ở cuối. Nếu chạy bằng run-backend.ps1, cập nhật CORS_ORIGINS trong backend/.env vì script ưu tiên file này. Preview Vercel có origin khác production, phải thêm riêng khi sử dụng. Native Expo không cần thêm origin exp:// vào CORS.

## 10. Chuẩn bị bài nộp

| Thành phần | Cần thực hiện                                                                                      |
| ---------- | -------------------------------------------------------------------------------------------------- |
| GitHub     | Repository Lab 2 riêng, public, README và code; kiểm tra bằng cửa sổ ẩn danh                       |
| Demo       | QR/URL Expo Go trong buổi demo; bổ sung link APK nếu build, hoặc link web phù hợp                  |
| Video      | Quay điện thoại thực tế 2-3 phút theo VIDEO_DEMO.md; dùng link xem được không cần quyền riêng      |
| Báo cáo    | PDF 2-4 trang đúng 5 mục template, bổ sung URL, ngày nộp, thiết bị, 3-4 ảnh native và kết quả thật |

File Mini-Project-2-Report.md/PDF là bản kỹ thuật có kết quả đã kiểm thử; các mục thiết bị, demo và video chưa có phải hoàn thiện trước khi nộp. Mẫu được dùng là template chung Mini-Project 1/2/3 đã cung cấp; nếu giảng viên có mẫu riêng Lab 2, đối chiếu trước nộp.

## 11. Xử lý lỗi thường gặp

### Xuất lại báo cáo khi đã bổ sung minh chứng

Chỉnh `docs/Mini-Project-2-Report.md`, cập nhật ngày nộp/link/kết quả thật. Thay ảnh trong `docs/screenshots` và cập nhật lời chú thích để đúng nguồn ảnh. Script hiện dàn trang bốn ảnh theo đúng tên tệp trong thư mục này.

```powershell
cd C:\Users\nddhu\vku-room-booking
python -m pip install reportlab
python .\scripts\build-report.py
```

Script dùng Arial trên Windows hoặc DejaVu Sans trên Linux. Sau khi thay nội dung, mở PDF kiểm tra không bị tràn trang; giữ báo cáo từ 2 đến 4 trang. Nếu dùng ảnh native, sửa cả câu mô tả nguồn ảnh trong Markdown. Cập nhật lại PDF sau mỗi lần chỉnh báo cáo.

### Tải mã nguồn từ GitHub và cập nhật bài làm

Repository public riêng của Lab 2: https://github.com/HuyDEV10/vku-room-booking.

Nếu chưa có thư mục dự án trên máy, chạy:

```powershell
cd C:\Users\nddhu
git clone https://github.com/HuyDEV10/vku-room-booking.git
cd .\vku-room-booking
```

Nếu đã giải nén thành thư mục cùng tên, không clone đè. Có thể giữ thư mục giải nén làm bản sao, đổi tên nó rồi clone vào thư mục mới. Không chạy git init và push một lịch sử mới lên repository đã có mã nguồn.

Sau khi kiểm thử điện thoại và bổ sung minh chứng, cập nhật báo cáo Markdown, xuất lại PDF, kiểm tra nội dung trước khi commit:

```powershell
cd C:\Users\nddhu\vku-room-booking
git status
git add docs
git diff --cached --check
git diff --cached
git commit -m "Bổ sung minh chứng kiểm thử và báo cáo Lab 2"
git push origin main
```

Chỉ dùng nội dung commit trên khi đã bổ sung minh chứng thực tế. Đăng nhập GitHub qua Git Credential Manager khi được yêu cầu; không ghi token trong code hay README. Không force-push. Các file .env, node_modules, build và dữ liệu test được bỏ qua bởi .gitignore.

### Bảng xử lý lỗi

| Lỗi                               | Cách xử lý                                                                                         |
| --------------------------------- | -------------------------------------------------------------------------------------------------- |
| mvnw.cmd không nhận               | cd vào backend, kiểm tra `Test-Path .\mvnw.cmd`                                                    |
| password authentication failed    | Đặt cùng mật khẩu cho role vku_booking và DB_PASSWORD, đúng server/cổng                            |
| database does not exist           | Tạo vku_room_booking trên đúng server/cổng, OWNER vku_booking                                      |
| Permission denied for schema      | Kiểm tra DB mới do vku_booking sở hữu; không dùng nhầm database khác                               |
| Port 8081 already in use          | Dừng tiến trình backend Lab 2 cũ; nếu đổi SERVER_PORT phải đổi tunnel và API                       |
| Expo Go incompatible              | Cài Expo Go SDK 57 đúng nền tảng hoặc dùng development build/APK                                   |
| Điện thoại gọi localhost lỗi      | Dùng URL HTTPS tunnel cổng 8081                                                                    |
| Vercel API/CORS lỗi               | Kiểm tra health từ điện thoại; origin CORS chính xác; restart backend đúng môi trường              |
| Có Wi-Fi nhưng lịch không tải     | Kiểm tra PostgreSQL, backend, tunnel; Wi-Fi không đảm bảo API hoạt động                            |
| Không thấy lịch sau tạo phiên mới | Lịch thuộc token phiên cũ, không truy hồi bằng tên/MSSV; tránh thoát/xóa app khi còn lịch cần dùng |
| Khung hôm nay đều khóa            | Các giờ đã qua hoặc đã đặt; chọn ngày mai                                                          |
| Không có thông báo                | Kiểm tra quyền Expo Go/app, mốc nhắc còn tương lai, Android channel và hạn chế pin/force-stop      |
