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
- Logo hợp lệ nhưng màu chính cần override theo brand guideline
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
- **Nội dung:** single-color brand asset only. Brand identity thực tế nhiều màu (Pepsi, Google, BMW, TPBank, FPT...) không đưa vào pool.
- **Ưu tiên symbol-only:** nếu brand có cả symbol và wordmark, dùng symbol/icon. Nếu chưa tìm được SVG symbol-only sạch thì để `Pending` trong `BRANDS_TRACKING.csv`, không dùng lockup/wordmark tạm.
- **Fill:** root `<svg>` phải có `fill="#RRGGBB"` là màu chính thức dùng để đố trong game. Không để nhiều `fill`, `stroke`, gradient, style block, embedded raster image.
- **Kích thước:** không giới hạn, game tự scale

## Audit trước khi commit

Chạy:

```bash
node scripts/build-brands.mjs
node scripts/audit-brands.mjs
```

Kết quả hợp lệ: `flaggedCount: 0`. Nếu có flag như `missing-file`, `multi-hex-in-file`, `raster-image`, `style-block`, `root-fill-vs-json` thì sửa hoặc loại brand khỏi pool.

## Lưu ý

- File `_overrides.json` và `README.md` được bỏ qua khi build
- File `data/brands.json` ở thư mục `data/` là **tự sinh** — KHÔNG sửa tay (sẽ bị ghi đè)
- Nếu Action build fail, vào tab Actions trên GitHub xem log
