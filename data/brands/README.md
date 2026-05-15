# Cách quản lý brand data

## Cấu trúc

Mỗi file `.json` trong folder này là **1 nhóm brand**. Game sẽ tự gộp tất cả lại khi load.

```
data/brands/
├── index.json          ← Danh sách file (PHẢI cập nhật khi thêm file mới)
├── global-tech.json
├── global-fnb.json
├── vn-banking.json
└── ...
```

## Thêm brand mới vào file có sẵn

Mở file (ví dụ `vn-fnb.json`), thêm 1 object vào array:

```json
{
  "id": "highlands",
  "name": "Highlands Coffee",
  "color": "#A8001E",
  "logo": null,
  "difficulty": 2
}
```

**Giải thích field:**

| Field | Bắt buộc | Ý nghĩa |
|-------|----------|---------|
| `id` | ✅ | ID duy nhất, viết liền không dấu, chữ thường (ví dụ: `highlandscoffee`) |
| `name` | ✅ | Tên hiển thị trên màn hình (có dấu, hoa thường tuỳ ý) |
| `color` | ✅ | Màu chủ đạo của brand, định dạng `#RRGGBB` |
| `logo` | ✅ | Slug Simple Icons (vd `"spotify"`) HOẶC `null` nếu không có |
| `difficulty` | ✅ | Độ khó 1-5 (1 = ai cũng đoán được, 5 = rất khó) |

## Tạo nhóm brand mới

1. Tạo file mới trong folder này, đặt tên `<region>-<category>.json` (ví dụ `vn-fashion.json`)
2. Nội dung file là 1 array JSON (xem các file khác làm mẫu)
3. **MỞ `index.json` và thêm tên file mới vào danh sách `files`**
4. Push lên GitHub, game tự load

## Logo

**Cách 1 — Simple Icons (ưu tiên):**
- Vào https://simpleicons.org/ → tìm brand → copy slug (vd `coca-cola` → `cocacola`)
- Gán vào field `logo`: `"logo": "cocacola"`
- Game sẽ tự load logo trắng đen → màu khi reveal

**Cách 2 — Logo local (cho brand Việt không có trên Simple Icons):**
- Để `"logo": null`
- Bỏ file SVG vào `assets/logos/<id>.svg` (cùng tên với field `id`)
- Game tự dùng file local

**Cách 3 — Không có logo:**
- Để `"logo": null` và KHÔNG có file local
- Game sẽ hiện chữ cái đầu của brand thay thế

## Lưu ý

- `id` phải duy nhất trên toàn bộ data (không trùng giữa các file)
- File JSON phải hợp lệ — kiểm tra bằng https://jsonlint.com/ trước khi push nếu không chắc
- Sau khi push, GitHub Pages cần ~1 phút để cập nhật
