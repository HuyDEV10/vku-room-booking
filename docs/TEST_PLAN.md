# Kết quả và kế hoạch kiểm thử Lab 2

## Kiểm thử tự động

| Nhóm               | Phạm vi                                                                                                                                                                                                        |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Domain TypeScript  | Ngày UTC+7 qua biên ngày/tháng, 7 ngày, lọc kết hợp, nhắc 15 phút, biên check-in, QR và URL API                                                                                                                |
| Backend PostgreSQL | Retry không trùng, 4 yêu cầu đồng thời một winner, cùng UUID đồng thời, hủy giải phóng khung, quyền phiên, ngày/sức chứa, check-in, trạng thái hiện tại, thay payload UUID, validation HTTP, CORS và WebSocket |
| E2E Expo web       | Hai browser context, cấu hình API, tạo phiên, lọc, chọn lịch, QR, cập nhật WebSocket, phục hồi local, hủy và cache khi mất mạng                                                                                |

Mọi thao tác tự động backend dùng database kết thúc `_test`. Test xóa dữ liệu bookings/demo_sessions của database test trước mỗi ca. E2E tạo dữ liệu thử trên API đang chạy; người chạy phải chọn đúng database test.

## Kiểm thử trên điện thoại cần thực hiện trước nộp

| Ca  | Thao tác                    | Tiêu chí đạt                                                      | Minh chứng                    |
| --- | --------------------------- | ----------------------------------------------------------------- | ----------------------------- |
| N01 | Expo Go tương thích mở QR   | App không lỗi native/runtime                                      | Ảnh thiết bị, SDK/OS          |
| N02 | Cuộn và lọc phòng           | Kết quả AND đúng, cuộn mượt                                       | Video; profiler nếu đo FPS    |
| N03 | Chọn ngày/slot              | 7 ngày; giờ qua/đã đặt khóa                                       | Ảnh chi tiết                  |
| N04 | Hai thiết bị đặt cùng slot  | Một lịch còn hiệu lực, người còn lại nhận xung đột hoặc slot khóa | Video và SELECT database      |
| N05 | Hủy lịch tương lai          | Khung giải phóng, thông báo lịch bị hủy                           | Ảnh/video                     |
| N06 | Đóng/mở, mạng ngắt          | Phiên/cache còn; không xác nhận đặt offline                       | Video                         |
| N07 | QR và check-in              | Đúng mã/phiên/cửa sổ thời gian                                    | Ảnh mã, trạng thái CHECKED_IN |
| N08 | Nhắc lịch thật              | Xuất hiện trước giờ bắt đầu 15 phút                               | Ảnh thông báo và giờ lịch     |
| N09 | Quyền bị từ chối            | Đặt vẫn thành công, hướng dẫn cấp quyền                           | Video/ghi kết quả             |
| N10 | Đổi URL tunnel cùng backend | Token/lịch được giữ sau kiểm tra API                              | Ghi kết quả                   |

Ảnh trong screenshots là Expo web tại viewport mobile. Chúng không chứng minh app đã chạy trên Android/iOS. Chưa có kết quả đo 60 FPS, nhận thông báo native, APK cài thật hoặc video thiết bị trong gói ban đầu.
