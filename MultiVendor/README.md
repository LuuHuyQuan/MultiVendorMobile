# Sellzy Mobile

Ứng dụng mua sắm đa nhà bán được xây dựng bằng React Native CLI 0.86 và tích hợp Expo Modules theo bare workflow, dựa trên giao diện tham khảo [Sellzy HTML](https://sellzy-html.vercel.app/).

## Tính năng

- Tải danh mục, danh mục con, cửa hàng, chi tiết sản phẩm, biến thể, giá theo số lượng và tồn kho từ API storefront. Có tìm kiếm, lọc và sắp xếp.
- Giỏ hàng và danh sách yêu thích đồng bộ với tài khoản qua API sau khi đăng nhập. Giỏ được đối chiếu với back-end trước khi đặt hàng.
- Đặt đơn COD hoặc thanh toán bằng ví qua API sau khi đăng nhập. Ứng dụng kiểm tra mã giảm giá, lấy báo giá gồm phí giao hàng và thuế, xác nhận lại giá/tồn kho, gửi mã chống đặt trùng và hỗ trợ mua lại.
- Lịch sử và trạng thái đơn thật đồng bộ từ API; có chi tiết đơn, hủy đơn đủ điều kiện và gửi yêu cầu đổi trả. Đơn mẫu vẫn lưu riêng trên thiết bị.
- Xem đánh giá thật của sản phẩm; người mua đã nhận hàng có thể gửi hoặc sửa đánh giá.
- Đăng ký, đăng nhập/đăng xuất qua API; access token được tự làm mới. Dữ liệu mua sắm được lưu riêng cho khách và từng email đăng nhập trên thiết bị.
- Ví cá nhân đồng bộ với back-end: số dư khả dụng/tạm giữ, liên kết tài khoản ngân hàng, nạp tiền, rút tiền, lịch sử thanh toán và hoàn tiền.
- Hồ sơ, nhiều địa chỉ giao hàng, đổi và khôi phục mật khẩu, thông báo, câu hỏi thường gặp và hỗ trợ khách hàng dùng API. Liên kết khôi phục mật khẩu được gửi qua email và mở trang web.
- Danh sách nhà bán và biểu mẫu gửi hồ sơ đăng ký nhà bán qua API; xem trạng thái duyệt và gửi lại hồ sơ bị từ chối.
- Kênh người bán cho tài khoản có cửa hàng đang hoạt động: tổng quan, gửi sản phẩm chờ duyệt, gửi lại sản phẩm bị từ chối và cập nhật tiến trình đơn hàng theo quyền API.
- Khi không kết nối được back-end, ứng dụng có thể hiển thị danh mục mẫu trên thiết bị; thao tác đặt đơn được chặn cho đến khi kết nối lại.

## Phạm vi bản demo

Ứng dụng dùng API của dự án `MultiVendorEcommercePlatform` cho các luồng khách hàng và nhà bán; mật khẩu và giấy tờ định danh không được lưu trên thiết bị. Lựa chọn giao diện như phương thức thanh toán ưu tiên được lưu cục bộ. Phần admin không nằm trong ứng dụng này. Thanh toán bằng ví cần ví hoạt động và đủ số dư; việc nạp/rút tiền phụ thuộc quy trình duyệt của back-end. Email khôi phục mật khẩu cần cấu hình SMTP ở back-end.

## Yêu cầu phát triển

- Node.js `>= 22.13.0` và npm.
- JDK 17.
- Android Studio cùng Android SDK để chạy Android.
- macOS cùng Xcode và CocoaPods để chạy iOS.

## Chạy ứng dụng

### Chạy đồng thời API, web và mobile

Trong thư mục này chạy:

```powershell
.\scripts\Start-All.ps1 -OpenBrowser
```

Lệnh gọi launcher của dự án `MultiVendorEcommercePlatform` bên cạnh, khởi động API, web ở cổng 5173 và giao diện mobile Expo web ở cổng 8081. Hai client dùng cùng API/CSDL. Launcher tự truyền API origin của máy chủ Expo cho native; không cần sửa IP trong `.env`. Khi chạy Expo riêng, ứng dụng có thể lấy origin từ dự án được quét bằng QR. QR được lưu trong `%LOCALAPPDATA%\MultiVendorEcommercePlatform\dev-runtime\expo-go-qr.png`. `-OpenBrowser` mở cả hai trong Microsoft Edge; `-LocalOnly` giới hạn truy cập trên PC. Dừng cả ba bằng `.\scripts\Stop-All.ps1` trước khi debug API bằng Visual Studio. Nếu API HTTPS đã chạy bằng F5, thêm `-UseRunningApi`.

Expo web gọi `/api` và `/uploads` qua proxy Metro trên chính địa chỉ web. `EXPO_PUBLIC_WEB_API_BASE_URL=/api` dành cho web; `EXPO_PUBLIC_API_BASE_URL` dành cho native. Đích proxy `API_PROXY_TARGET` chỉ được đọc bởi máy chủ Metro, mặc định `https://localhost:7226`, phù hợp API chạy bằng profile HTTPS trong Visual Studio. Khi triển khai bản web riêng, reverse proxy cũng phải chuyển `/api` và `/uploads` tới API, hoặc đặt `EXPO_PUBLIC_WEB_API_BASE_URL` thành URL API HTTPS và cấu hình CORS tương ứng.

### Expo Go dùng Wi-Fi khác hoặc 4G/5G

```powershell
.\scripts\Start-All.ps1 -Tunnel
# API đang chạy bằng Visual Studio:
.\scripts\Start-All.ps1 -Tunnel -UseRunningApi
```

Launcher tạo một Cloudflare Quick Tunnel tới Metro8081. Expo Go, API và ảnh upload dùng chung địa chỉ HTTPS được cấp. Mở địa chỉ `exps://...` được in trong Expo Go; giữ `EXPO_PUBLIC_API_BASE_URL` trống. Khi đổi mạng trên điện thoại, không phải sửa IP. Máy tính phải bật và giữ API, Metro, tunnel chạy; khởi động lại tunnel sẽ cấp địa chỉ mới.

Launcher tìm `cloudflared` trong PATH hoặc `%LOCALAPPDATA%\MultiVendorEcommercePlatform\dev-runtime\tools\cloudflared.exe`. [Tải cloudflared](https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/downloads/). Đây là chế độ thử nghiệm; địa chỉ ổn định cho bản phát hành cần API HTTPS trên server hoặc tunnel có tên miền. [Cloudflare Quick Tunnels](https://developers.cloudflare.com/tunnel/get-started/quick-tunnels/).

Bản Expo web dùng để xem giao diện React Native trên trình duyệt. Chạy APK Android cần SDK/emulator hoặc điện thoại thật, còn iOS cần macOS/Xcode.

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

Nếu PowerShell báo chặn `npm.ps1`, dùng `npm.cmd` thay cho `npm` trong các lệnh trên, ví dụ `npm.cmd run start:expo`.

### Kết nối back-end

Sao chép `.env.example` thành `.env`, sau đó đặt địa chỉ API phù hợp:

```powershell
Copy-Item .env.example .env
```

- Expo web: `EXPO_PUBLIC_WEB_API_BASE_URL=/api`; proxy Metro dùng `API_PROXY_TARGET=https://localhost:7226` ở phía máy chủ. Biến `EXPO_PUBLIC_API_BASE_URL` dành cho Android/iOS native.
- Expo Go (điện thoại/emulator): để `EXPO_PUBLIC_API_BASE_URL` trống, ứng dụng tự lấy địa chỉ Expo và ghép `/api`; hỗ trợ LAN và HTTPS tunnel.
- React Native CLI không có Expo manifest, Android emulator: `EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:5027/api`.
- Bản phát hành: đặt `EXPO_PUBLIC_API_BASE_URL` thành URL API HTTPS trên server.

Chỉ bản phát triển dùng Expo mới tự lấy địa chỉ từ manifest; URL HTTPS được đặt tường minh luôn có ưu tiên cao hơn. Khi thiếu cả URL lẫn Expo host, Android giữ địa chỉ emulator `10.0.2.2:5027`. Cần khởi động back-end ASP.NET trước khi dùng các chức năng trực tuyến. Sau khi đổi `.env` hoặc tạo lại tunnel, mở lại dự án trong Expo Go và tải lại ứng dụng. `npm run check:connection` kiểm tra cách chọn địa chỉ cho LAN, tunnel, web và URL cấu hình tường minh.

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
