# Sellzy Mobile

Ứng dụng mua sắm đa nhà bán được xây dựng bằng React Native CLI 0.86 và tích hợp Expo Modules theo bare workflow, dựa trên giao diện tham khảo [Sellzy HTML](https://sellzy-html.vercel.app/).

## Tính năng

- Trang chủ, danh mục sản phẩm, tìm kiếm, lọc và sắp xếp.
- Chi tiết sản phẩm, sản phẩm yêu thích và giỏ hàng có kiểm tra tồn kho.
- Mã ưu đãi `SELLZY10` giảm 10% giá trị sản phẩm.
- Checkout 3 bước (giao hàng, thanh toán, kiểm tra đơn), có form thẻ demo không lưu dữ liệu thẻ; lưu đơn hàng cục bộ và hỗ trợ thêm lại sản phẩm từ đơn cũ.
- Đăng ký, đăng nhập/đăng xuất tùy chọn qua API; access token được tự làm mới và người dùng vẫn có thể mua hàng ngay ở chế độ khách.
- Ví cá nhân đồng bộ với back-end: số dư khả dụng/tạm giữ, liên kết tài khoản ngân hàng, nạp tiền, rút tiền và lịch sử giao dịch.
- Hồ sơ khách hàng, danh sách nhà bán và bản nháp đăng ký nhà bán.
- Dữ liệu giỏ hàng, yêu thích, hồ sơ, đơn hàng và bản nháp được lưu bằng AsyncStorage.

## Phạm vi bản demo

Danh mục, giỏ hàng và checkout hiện vẫn là dữ liệu demo cục bộ. Xác thực và ví cá nhân dùng API của dự án `MultiVendorEcommercePlatform`; mật khẩu không được lưu trên thiết bị. Thao tác **Place Demo Order** chỉ lưu đơn trên thiết bị, không thu tiền và không tạo vận đơn. Các yêu cầu nạp/rút tiền được gửi tới back-end và tuân theo trạng thái xử lý của hệ thống.

## Yêu cầu phát triển

- Node.js `>= 22.11.0` và npm.
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

## Kiểm tra

```powershell
npm test -- --runInBand
npm run lint
npx tsc --noEmit
```

## Tạo APK Android

```powershell
cd android
.\gradlew.bat :app:assembleDebug
```

APK debug được tạo tại `android/app/build/outputs/apk/debug/app-debug.apk`.

## Nguồn tham khảo

Thiết kế và các ảnh sản phẩm demo được tham khảo từ trang [Sellzy HTML](https://sellzy-html.vercel.app/). Dự án này không tuyên bố liên kết chính thức với Sellzy; hãy xác minh quyền sử dụng thương hiệu và hình ảnh trước khi phát hành thương mại.
