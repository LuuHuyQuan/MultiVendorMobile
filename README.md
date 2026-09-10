# Sellzy Mobile

Ứng dụng mua sắm đa nhà bán được xây dựng bằng React Native 0.87, dựa trên giao diện tham khảo [Sellzy HTML](https://sellzy-html.vercel.app/).

## Tính năng

- Trang chủ, danh mục sản phẩm, tìm kiếm, lọc và sắp xếp.
- Chi tiết sản phẩm, sản phẩm yêu thích và giỏ hàng có kiểm tra tồn kho.
- Mã ưu đãi `SELLZY10` giảm 10% giá trị sản phẩm.
- Checkout 3 bước (giao hàng, thanh toán, kiểm tra đơn), có form thẻ demo không lưu dữ liệu thẻ; lưu đơn hàng cục bộ và hỗ trợ thêm lại sản phẩm từ đơn cũ.
- Hồ sơ khách hàng, danh sách nhà bán và bản nháp đăng ký nhà bán.
- Dữ liệu giỏ hàng, yêu thích, hồ sơ, đơn hàng và bản nháp được lưu bằng AsyncStorage.

## Phạm vi bản demo

Đây là ứng dụng demo chạy cục bộ. Danh mục được đóng gói trong ứng dụng; chưa có máy chủ, đăng nhập thật, cổng thanh toán, vận chuyển, thông báo đẩy, hỗ trợ trực tuyến hoặc quy trình duyệt nhà bán. Thao tác **Place Demo Order** chỉ lưu đơn trên thiết bị, không thu tiền và không tạo vận đơn.

## Yêu cầu phát triển

- Node.js `>= 22.11.0` và npm.
- JDK 17.
- Android Studio cùng Android SDK; dự án hiện biên dịch với SDK Platform 37, Build Tools 37.0.0 và NDK 27.1.12297006.
- Một Android Emulator đang chạy hoặc thiết bị Android đã bật USB debugging.

Thiết lập `ANDROID_HOME`/`ANDROID_SDK_ROOT`, hoặc tạo `android/local.properties` với đường dẫn SDK của máy. Không sao chép Android SDK vào repository.

## Chạy ứng dụng

```powershell
npm ci
npm start
```

Mở terminal thứ hai trong thư mục dự án:

```powershell
npm run android
```

## Kiểm tra

```powershell
npm test -- --runInBand
npm run lint
npx tsc --noEmit
```

## Tạo APK Android

APK debug, dùng cho thử nghiệm cùng Metro:

```powershell
cd android
.\gradlew.bat :app:assembleDebug
```

Kết quả: `android/app/build/outputs/apk/debug/app-debug.apk`.

Bản release cục bộ có JavaScript bundle sẵn:

```powershell
cd android
.\gradlew.bat :app:assembleRelease
```

Kết quả: `android/app/build/outputs/apk/release/app-release.apk`. Cấu hình hiện tại ký bản release bằng debug keystore, vì vậy APK này chỉ dành cho xem thử; cần keystore riêng và cấu hình phát hành an toàn trước khi đưa lên cửa hàng.

## Nguồn tham khảo

Thiết kế và các ảnh sản phẩm demo được tham khảo từ trang [Sellzy HTML](https://sellzy-html.vercel.app/). Dự án này không tuyên bố liên kết chính thức với Sellzy; hãy xác minh quyền sử dụng thương hiệu và hình ảnh trước khi phát hành thương mại.
