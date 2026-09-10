# Sellzy Mobile

Ứng dụng mua sắm đa nhà bán được xây dựng bằng React Native CLI 0.87, dựa trên giao diện tham khảo [Sellzy HTML](https://sellzy-html.vercel.app/).

## Tính năng

- Trang chủ, danh mục sản phẩm, tìm kiếm, lọc và sắp xếp.
- Chi tiết sản phẩm, sản phẩm yêu thích và giỏ hàng có kiểm tra tồn kho.
- Mã ưu đãi `SELLZY10` giảm 10% giá trị sản phẩm.
- Checkout 3 bước (giao hàng, thanh toán, kiểm tra đơn), có form thẻ demo không lưu dữ liệu thẻ; lưu đơn hàng cục bộ và hỗ trợ thêm lại sản phẩm từ đơn cũ.
- Đăng nhập/đăng xuất tùy chọn trên thiết bị; người dùng vẫn có thể mua hàng ngay ở chế độ khách.
- Hồ sơ khách hàng, danh sách nhà bán và bản nháp đăng ký nhà bán.
- Dữ liệu giỏ hàng, yêu thích, hồ sơ, đơn hàng và bản nháp được lưu bằng AsyncStorage.

## Phạm vi bản demo

Đây là ứng dụng demo chạy cục bộ. Danh mục được đóng gói trong ứng dụng; chưa có máy chủ, xác thực tài khoản thật, cổng thanh toán, vận chuyển, thông báo đẩy, hỗ trợ trực tuyến hoặc quy trình duyệt nhà bán. Đăng nhập hiện là mô phỏng cục bộ và không lưu mật khẩu. Thao tác **Place Demo Order** chỉ lưu đơn trên thiết bị, không thu tiền và không tạo vận đơn.

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
