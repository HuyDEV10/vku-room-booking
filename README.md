# VKU Room Booking - Lab 2

Ứng dụng React Native và Expo hỗ trợ tìm phòng học, đặt khung giờ, xem mã QR, hủy lịch và nhận thông báo local trước giờ bắt đầu 15 phút.

**Sinh viên:** Nguyễn Đăng Đức Huy - 23IT101 - 23JIT.

## Chức năng

- FlatList hiển thị ảnh minh họa, tòa A/B/C/V, tầng, sức chứa và trạng thái hiện tại.
- Tìm kiếm tên phòng; lọc kết hợp tòa nhà, số chỗ tối thiểu 2-20 và thiết bị.
- Chọn hôm nay và 6 ngày tiếp theo; 4 khung giờ 2 tiếng: 07:30-09:30, 09:30-11:30, 13:00-15:00, 15:00-17:00.
- Khung đã đặt hoặc đã bắt đầu bị khóa. PostgreSQL ngăn hai lịch còn hiệu lực chiếm cùng khung.
- Mã đặt chỗ duy nhất, modal QR, check-in từ 15 phút trước giờ bắt đầu đến trước giờ kết thúc.
- Phiên demo, bộ lọc và dữ liệu cache lưu bằng Zustand persist + AsyncStorage.
- WebSocket cập nhật lịch sau đặt/hủy/check-in; tải lại khi trở về foreground và mỗi 30 giây để cập nhật biên thời gian.
- Expo Notifications lập lịch nhắc local, hủy nhắc khi hủy phòng; có nút thử thông báo riêng.

## Công nghệ

Expo SDK 57, React Native 0.86, TypeScript, React Navigation 7, Zustand 5, AsyncStorage; Spring Boot 3.5.7, Java 21, PostgreSQL 16+.

Node.js >=22.13; Node 24 dùng được. Phiên bản thư viện được khóa trong `mobile/package-lock.json`. Expo Go phải hỗ trợ SDK 57; trên Android có thể tải đúng bản từ https://expo.dev/go.

## Cấu trúc

| Thư mục                 | Nội dung                                                |
| ----------------------- | ------------------------------------------------------- |
| `mobile/src/screens`    | Khám phá, chi tiết phòng, lịch đặt, phiên demo, cài đặt |
| `mobile/src/components` | Thẻ phòng memoized, modal QR, thành phần giao diện      |
| `mobile/src/store`      | `useBookingStore`, persist, thao tác đặt/hủy/check-in   |
| `mobile/src/services`   | REST client và đối chiếu thông báo local                |
| `mobile/src/hooks`      | WebSocket, reconnect và foreground refresh              |
| `backend`               | REST API, WebSocket, Flyway và kiểm thử PostgreSQL      |
| `docs`                  | Hướng dẫn Windows, kiểm thử, video và báo cáo           |

## Chạy dự án

Hướng dẫn đầy đủ: [docs/HUONG_DAN_LAB_2.md](docs/HUONG_DAN_LAB_2.md).

1. Tạo role `vku_booking` và database `vku_room_booking` trong PostgreSQL; database thuộc role này.
2. Trong terminal **thư mục backend**, đặt `DB_URL`, `DB_USERNAME`, `DB_PASSWORD`, rồi chạy `./mvnw spring-boot:run` hoặc `.\mvnw.cmd spring-boot:run` trên Windows. API mặc định ở cổng **8081**.
3. Kiểm tra `http://localhost:8081/api/health`.
4. Mở terminal khác: `cloudflared tunnel --url http://localhost:8081`; giữ backend và tunnel chạy.
5. Trong thư mục `mobile`: `npm ci`, rồi `npm start -- --port 8082`. Quét QR bằng Expo Go tương thích.
6. Trong app, mở Cài đặt và nhập URL gốc HTTPS của backend; kiểm tra kết nối rồi tạo phiên demo.

Lab 1 dùng dự án/database riêng; không sửa cấu hình hay dữ liệu Lab 1 để chạy Lab 2. Không cần tự tạo bảng vì Flyway tạo và seed 12 phòng mẫu.

## Kiểm thử

```powershell
# Terminal trong mobile
npm run typecheck
npm test
npm run build:web
npm run build:android
```

Backend dùng database riêng có tên kết thúc `_test`; xem hướng dẫn trước khi chạy `.\mvnw.cmd test`. Test sẽ xóa lịch và phiên trong database kiểm thử, không dùng database dữ liệu thật.

E2E cần backend và bản web đang chạy: `npx playwright install chromium`, `npm run test:e2e` trong `mobile`. E2E tạo phiên/lịch thử trên backend được cấu hình, vì vậy hãy chạy backend với database test. Kết quả và kịch bản thiết bị: [docs/TEST_PLAN.md](docs/TEST_PLAN.md).

`build:android` xuất bundle Android/Hermes, **không tạo APK**. APK được tạo bằng EAS Build theo hướng dẫn. Chạy trên iOS cần Expo Go tương thích hoặc development build; không suy ra kết quả iOS từ kiểm thử web.

## Phạm vi demo

Danh mục 12 phòng và ảnh là dữ liệu minh họa, không phải danh mục chính thức của VKU. Nhập tên/MSSV tạo phiên demo với token riêng; không xác thực tài khoản trường. Chỉ phiên tạo lịch được xem, hủy và check-in lịch đó. Xóa dữ liệu ứng dụng/thoát phiên không hủy lịch trên máy chủ và không khôi phục được phiên chỉ bằng MSSV.

Khi mất mạng, app giữ dữ liệu cache nhưng không xác nhận đặt/hủy offline. Đồng bộ trạng thái cần API hoạt động. Thông báo được lập trên thiết bị đặt phòng, cần quyền thông báo và còn phụ thuộc chính sách hệ điều hành. Bản web không có thông báo local native.

## Tài liệu và bài nộp

- [Hướng dẫn thao tác local và triển khai](docs/HUONG_DAN_LAB_2.md)
- [Kịch bản kiểm thử](docs/TEST_PLAN.md)
- [Kịch bản video 2-3 phút](docs/VIDEO_DEMO.md)
- [Báo cáo có thể chỉnh sửa](docs/Mini-Project-2-Report.md)
- [Báo cáo PDF](docs/Mini-Project-2-Report.pdf)

Link demo và video chỉ điền sau khi chạy trên thiết bị. Ảnh trong `docs/screenshots` là ảnh kiểm thử Expo web ở viewport mobile; khi nộp cần bổ sung ảnh thiết bị/giả lập đúng yêu cầu đề.

## Nguồn tham khảo

- https://docs.expo.dev/versions/v57.0.0/sdk/notifications/
- https://docs.expo.dev/troubleshooting/expo-go-version-mismatch/
- https://reactnative.dev/docs/optimizing-flatlist-configuration
- https://zustand.docs.pmnd.rs/reference/integrations/persisting-store-data
- https://www.postgresql.org/docs/current/indexes-partial.html

Ảnh minh họa tải từ Unsplash, dùng cho danh mục demo: `photo-1497366216548-37526070297c`, `photo-1497366811353-6870744d04b2`, `photo-1524758631624-e2822e304c36` (https://images.unsplash.com/). Các ảnh không chứng minh phòng học thực tế tại VKU.
