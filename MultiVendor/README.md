# Sellzy Mobile

Ứng dụng mua sắm đa nhà bán được xây dựng bằng React Native CLI 0.86 và tích hợp Expo Modules theo bare workflow, dựa trên giao diện tham khảo [Sellzy HTML](https://sellzy-html.vercel.app/).

## Tính năng

- Tải danh mục, danh mục con, cửa hàng, chi tiết sản phẩm, biến thể, giá theo số lượng và tồn kho từ API storefront. Có tìm kiếm, lọc và sắp xếp.
- Sản phẩm yêu thích và giỏ hàng lưu trên thiết bị; giỏ được đối chiếu với back-end trước khi đặt hàng.
- Đặt đơn COD qua API sau khi đăng nhập. Ứng dụng xác nhận lại giá và tồn kho, lưu mã đơn cùng tóm tắt trên thiết bị và hỗ trợ mua lại.
- Đăng ký, đăng nhập/đăng xuất qua API; access token được tự làm mới. Dữ liệu mua sắm được lưu riêng cho khách và từng email đăng nhập trên thiết bị.
- Ví cá nhân đồng bộ với back-end: số dư khả dụng/tạm giữ, liên kết tài khoản ngân hàng, nạp tiền, rút tiền và lịch sử giao dịch.
- Hồ sơ khách hàng, danh sách nhà bán và bản nháp đăng ký nhà bán.
- Kênh người bán cho tài khoản có cửa hàng đang hoạt động: tổng quan, gửi sản phẩm chờ duyệt, gửi lại sản phẩm bị từ chối và cập nhật tiến trình đơn hàng theo quyền API.
- Khi không kết nối được back-end, ứng dụng hiển thị danh mục mẫu trên thiết bị, mã `SELLZY10`, thanh toán mô phỏng và đơn hàng mẫu. Chế độ này được đánh dấu rõ trong ứng dụng.

## Phạm vi bản demo

Ứng dụng dùng API của dự án `MultiVendorEcommercePlatform` cho danh mục, xác thực, COD, ví và kênh người bán; mật khẩu không được lưu trên thiết bị. Back-end hiện chưa có API lịch sử đơn dành cho khách, vì vậy danh sách đơn thật trong ứng dụng là bản tóm tắt lưu trên thiết bị và trạng thái không tự đồng bộ. Back-end cũng chưa có API để khách gửi hồ sơ đăng ký cửa hàng; biểu mẫu này chỉ lưu bản nháp. Chỉ đơn COD được gửi đến back-end; thanh toán thẻ và `SELLZY10` chỉ có trong chế độ mẫu. Phần admin không nằm trong ứng dụng này.

## Yêu cầu phát triển

- Node.js `>= 22.13.0` và npm.
- JDK 17.
- Android Studio cùng Android SDK để chạy Android.
- macOS cùng Xcode và CocoaPods để chạy iOS.

## Chạy ứng dụng

```powershell
cd MultiVendor
npm ci
npm start
```

Mở terminal thứ hai trong thư mục `MultiVendor` để chạy Android:

```powershell
npm run android
```

Trên macOS, chạy iOS bằng lệnh `npm run ios`.

Expo được tích hợp bổ sung theo bare workflow, không thay thế các dự án native.
Có thể khởi động trực tiếp bản web bằng Expo CLI:

```powershell
npm run start:expo
```

### Kết nối back-end

Sao chép `.env.example` thành `.env`, sau đó đặt địa chỉ API phù hợp:

```powershell
Copy-Item .env.example .env
```

- Expo web trên cùng máy: `EXPO_PUBLIC_API_BASE_URL=https://localhost:7226/api`.
- Android emulator: `EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:5027/api`.
- Thiết bị thật: dùng địa chỉ IP LAN của máy chạy back-end, ví dụ `http://192.168.1.10:5027/api`.

Nếu không tạo `.env`, ứng dụng tự dùng HTTPS localhost cho web và địa chỉ emulator cho Android. Cần khởi động back-end ASP.NET của dự án `MultiVendorEcommercePlatform` trước khi đăng nhập hoặc mở ví. Sau khi đổi `.env`, hãy khởi động lại Expo.

Để mở Expo CLI cho Android/iOS, dùng `npm run start:expo:native`.

Để biên dịch bằng Expo CLI nhưng vẫn dùng trực tiếp thư mục `android`/`ios`, dùng
`npm run android:expo` hoặc `npm run ios:expo`.

## Tạo APK Android

```powershell
cd android
.\gradlew.bat :app:assembleDebug
```

APK debug được tạo tại `android/app/build/outputs/apk/debug/app-debug.apk`.

## Nguồn tham khảo

Thiết kế và các ảnh sản phẩm demo được tham khảo từ trang [Sellzy HTML](https://sellzy-html.vercel.app/). Dự án này không tuyên bố liên kết chính thức với Sellzy; hãy xác minh quyền sử dụng thương hiệu và hình ảnh trước khi phát hành thương mại.
