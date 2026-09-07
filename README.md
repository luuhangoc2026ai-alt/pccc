# VPA Smart Audit Pro - Hệ Thống Quét Mã Vạch & Báo Cáo Kiểm Kê Kho

Hệ thống quản lý, kiểm kê kho và quét mã vạch VPA thông minh với giao diện chuyên nghiệp, thanh quét động nổi, thẻ KPI 3D nổi bật thể hiện chênh lệch giữa hệ thống và thực tế, cảnh báo chênh lệch thời gian thực, nhật ký ghi log chỉnh sửa TagID và báo cáo động linh hoạt.

## 🚀 Tính Năng Nổi Bật

1. **Giao Diện Chuyên Nghiệp (Enterprise UX/UI)**:
   - Thiết kế tinh gọn, hiện đại với hiệu ứng Glassmorphism, đổ bóng nổi 3D, tối ưu hóa cho màn hình cảm ứng kho và máy tính để bàn.
   - Hỗ trợ phản hồi âm thanh (Web Audio API: âm Bíp khi quét chuẩn, âm cảnh báo khi có sai lệch).

2. **Thanh Quét Động Nổi (Floating Dynamic Scanner Bar)**:
   - Thanh dock nổi luôn hiển thị cố định ở chân màn hình trên mọi tab, cho phép quét hoặc nhập nhanh TagID, số lượng, vị trí.
   - Nút phóng to / mở nhanh sang **Trạm Quét Nổi Toàn Màn Hình**.

3. **Giao Diện Máy Scan Nổi Trực Quan**:
   - Ô nhập TagID cỡ lớn, tự động lấy nét (Auto-focus), tối ưu hóa cho súng quét mã vạch không dây / USB (tự động lưu khi nhận phím Enter).
   - **Đối chiếu tức thời với 8,844 mã tồn kho**: Tự động hiển thị mã hàng, lô sản xuất, kho, bin, và số lượng sổ sách ngay khi vừa quét mã.
   - Nút chọn số lượng nhanh (+1, +5, +10, [Khớp với số lượng sổ sách]).

4. **Thẻ KPI Nổi Thể Hiện Chênh Lệch Thực Tế vs Hệ Thống**:
   - **Tồn kho hệ thống**: Tổng số mã tag (`8,844`) & ước tính số lượng tồn sổ sách.
   - **Thực tế scan**: Tổng số mã đã quét & tổng số lượng thực đếm.
   - **Chênh lệch số lượng (Δ)**: Hiển thị nổi bật số lượng thừa/thiếu (+ / -) đổi màu động (Xanh khi khớp, Vàng khi thừa, Đỏ khi thiếu).
   - **Cảnh báo cần chỉnh sửa**: Đếm số mã lệch số lượng, mã ngoài hệ thống, mã trùng lặp.
   - **Độ chính xác kiểm kê**: Tỷ lệ % khớp chuẩn và thanh tiến độ.

5. **Trung Tâm Cảnh Báo Chênh Lệch & Hiệu Chỉnh**:
   - Tự động phân loại cảnh báo: Lệch số lượng, Mã ngoài hệ thống, Mã quét trùng.
   - Thẻ so sánh trực quan hai cột: Sổ sách ERP vs Thực tế quét.
   - Nút **"Chỉnh sửa ngay"**: Mở modal điều chỉnh số lượng/vị trí trực tiếp, nhập lý do giải trình.

6. **Nhật Ký Kiểm Toán & Ghi Log Chỉnh Sửa TagID (Audit Logs)**:
   - Tự động ghi lại lịch sử mọi thao tác: Mã TagID, Giá trị cũ ➔ Giá trị mới, Độ chênh lệch, Lý do/Ghi chú, Thời gian, Người thực hiện.
   - Lưu trữ đa tầng: Đồng bộ Supabase (`scan_edit_logs`) và LocalStorage.
   - Tra cứu, tìm kiếm theo TagID, lọc theo hành động, xuất file Excel Nhật ký.

7. **Báo Cáo Dashboard Tự Động Linh Động**:
   - Biểu đồ phân bổ tiến độ đối chiếu (Khớp chuẩn 100%, Lệch SL, Ngoài HT).
   - Phân bổ sản lượng quét theo từng Vị trí (Bin) và Kho.
   - Cơ chế tự động làm mới linh động (15s, 30s, 60s hoặc thủ công).
   - Xuất file Excel Báo Cáo Kiểm Kê Tổng Hợp nhiều sheet (KPI, Cảnh báo, Đối chiếu, Nhật ký).

## 🛠️ Cài Đặt & Phát Triển

```bash
# Cài đặt thư viện
npm --prefix pccc-web install

# Chạy môi trường phát triển (Dev)
npm --prefix pccc-web run dev

# Kiểm tra mã nguồn (Lint)
npm --prefix pccc-web run lint

# Đóng gói sản phẩm (Build)
npm --prefix pccc-web run build
```

## 🌐 Triển Khai Web (Deployment)

Dự án được cấu hình tự động triển khai qua Vercel thông qua GitHub repository `luuhangoc2026ai-alt/pccc`:
- Cấu hình Vercel build command: `npm --prefix pccc-web run build`
- Cấu hình output directory: `pccc-web/dist`
- Mỗi khi push code lên nhánh `main`, Vercel sẽ tự động build và deploy phiên bản mới nhất.
