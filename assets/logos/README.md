# Cách thêm brand vào MindColor

## Quy trình (đơn giản nhất)

1. **Tìm logo SVG** của brand (Google "tên brand logo svg", hoặc seeklogo.com)
2. **Đổi tên file** theo quy ước: chữ thường, dấu gạch ngang, không khoảng trắng/dấu
   - `Coca-Cola` → `coca-cola.svg`
   - `Vietcombank` → `vietcombank.svg`
   - `Tiffany & Co.` → `tiffany-and-co.svg`
3. **Bỏ file** vào folder này (`assets/logos/`)
4. **Commit + push** lên GitHub
5. **Chờ ~2 phút** — GitHub Action tự chạy:
   - Quét folder
   - Trích màu chủ đạo từ SVG
   - Suy ra tên brand từ tên file (`coca-cola` → `Coca-Cola`)
   - Sinh `data/brands.json`
6. **Game tự cập nhật** — brand mới xuất hiện ngay

**Không cần đụng JSON. Không cần code.**

## Khi nào dùng override

Auto-detect có thể sai trong các trường hợp:
- Logo nhiều màu → script đoán màu sai
- Tên hiển thị muốn khác filename (vd: filename `x` nhưng muốn hiển thị `X (Twitter)`)
- Muốn set độ khó

Lúc đó tạo / sửa file **`_overrides.json`** trong folder này:

```json
{
  "x": {
    "name": "X (Twitter)",
    "color": "#000000",
    "difficulty": 2
  },
  "google": {
    "color": "#4285F4"
  }
}
```

Key là `id` (= tên file không có `.svg`). Chỉ cần ghi field nào muốn override.

## Yêu cầu file SVG

- **Định dạng:** SVG (không hỗ trợ PNG/JPG)
- **Tên file:** chữ thường + gạch ngang (không có khoảng trắng, dấu, ký tự đặc biệt)
- **Nội dung:** logo bất kỳ — multi-color cũng được (game dùng CSS filter để chuyển trắng đen)
- **Kích thước:** không giới hạn, game tự scale

## Lưu ý

- File `_overrides.json` và `README.md` được bỏ qua khi build
- File `data/brands.json` ở thư mục `data/` là **tự sinh** — KHÔNG sửa tay (sẽ bị ghi đè)
- Nếu Action build fail, vào tab Actions trên GitHub xem log
