# MindColor

Game đoán màu logo thương hiệu. Bạn nhớ màu brand giỏi tới đâu?

## Cách thêm brand

→ Đọc [`assets/logos/README.md`](assets/logos/README.md)

TL;DR: drop file `<brand-name>.svg` vào `assets/logos/`, push, GitHub Action tự build phần còn lại.

### Rule chốt cho brand pool

- **Single-color only.** Logo phải có 1 màu chủ đạo. Multi-color (Google, BMW roundel, Pepsi 3-tone, Microsoft 4-square…) → loại. Game đoán *một* màu, không thể đoán palette.
- **Symbol/icon hơn wordmark.** Khi logo có cả symbol và text, ưu tiên symbol-only (mảnh dễ nhớ về màu).
- **SVG là CSS mask** — chỉ alpha channel quan trọng. Fill trong SVG phải là màu brand chính thức (build script extract từ `fill=...`).

## Content vibe (rất quan trọng — đừng phá)

Game này thắng/thua ở **giọng kể**. Mass-market VN, casual viral, vibe Wordle phối với meme group VN.

**Tone tiếng Việt:**
- Suồng sã có chừng, hài tự nhiên, không cringe
- Reference đời thường VN: vỉa hè quận 4, ngã tư, biển hiệu neon, app Zalo, ATM, shopee 9.9, KOC livestream
- Mix English/Vietnamese tự nhiên kiểu Gen Z (pixel-perfect, level, vibe, mood)
- Không gọi người chơi là "designer" / "user" / "khách hàng" — dùng "bạn", "bro", "má ơi"

**Không được:**
- ❌ Jargon design (JND, centroid hue, complementary mismatch, QA màu in)
- ❌ Niche dev refs (Dracula theme, Dark Reader, userstyle, Nexus mod, XDA forum, 47 tabs)
- ❌ Inside jokes cộng đồng nhỏ (DeviantArt 2012, Vinted, Lisbon golden hour, Lana Del Rey album)
- ❌ Crypto/trading specific (FOMO bull, flash crash, candle long) cho brand finance đại trà
- ❌ Cinephile refs (LUT phim noir 70s)

**Được:**
- ✅ Reference phổ quát: tan ca về muộn, KOC livestream Shopee, app đặt xe 2h sáng, TVC giờ vàng VTV3, billboard phai nắng, hàng fake livestream 199k freeship
- ✅ Industry-grounded nhưng không obscure: F&B → menu/biển hiệu/hộp giấy gói; Banking → thẻ/ATM/app banking; Telco → SIM/tổng đài CSKH/đại lý tỉnh

**Comment chi tiết** (`scoring.js` → `buildDetails`): 2 dòng/round. Dòng 1 phân tích hue (cùng họ / drift / rẽ nhánh / đối nghịch), dòng 2 quip theo industry. Mỗi industry có 4 bucket (match / satOff / lightOff / bothOff), mỗi bucket ≥2 variants. Khi thêm/sửa: giữ độ dài 12–20 từ/câu, tránh metaphor 3 tầng.

**Reactions** (`scoring.js` → `REACTIONS`): 1 câu ngắn dưới số %. 14 variants/band × 6 band. Khi thêm: giữ tone hài VN, max 8 từ.

**Rank tier comments** (`game.js` → `RANKS`): mỗi tier 1 câu motto của tier. Ví dụ: "🏆 Trùm cuối màu sắc — Pantone mắt máy" (95–100), "🌫️ Mù màu nặng — đi khám gấp đi 😂" (<30).

## Cấu trúc

```
mindcolor/
├── index.html
├── css/style.css                # Light + dark theme, viewport-native fluid
├── js/
│   ├── ui.js                    # UI controller + picker resize handler
│   ├── game.js                  # Game state + rank system + final summary
│   ├── logo.js                  # CSS-mask logo tinting (arbitrary colors)
│   ├── scoring.js               # CIEDE2000 + feedback engine (CONTENT VIBE — xem section trên)
│   ├── share.js                 # Share grid + Share card PNG
│   ├── theme.js                 # Light/Dark toggle bootstrap
│   ├── fx.js                    # Confetti + transition overlay
│   └── webgl-color.js           # regl.js color field + score text mask
├── data/
│   └── brands.json              # AUTO-GENERATED từ assets/logos/ — đừng sửa tay
├── assets/logos/                # Drop SVG vào đây
│   ├── *.svg
│   ├── _overrides.json          # Override display name / color cho brand cụ thể
│   └── README.md
├── scripts/
│   ├── build-brands.mjs         # Sinh data/brands.json từ folder logos
│   ├── normalize-svg.mjs        # Clean SVG (viewBox + single fill + strip bg shape)
│   ├── fetch-brands.mjs         # Batch fetch + normalize từ Wikimedia Commons
│   └── update-csv.mjs           # Helper cập nhật BRANDS_TRACKING.csv
├── BRANDS_TRACKING.csv          # Trạng thái từng brand (Done/Skipped/Pending/Missing)
└── .github/workflows/
    └── build-brands.yml         # Auto-build on push to assets/logos/
```

## Roadmap

- [x] Session 1 — Scaffold + Home screen
- [x] Session 2 — Color picker + 1 round
- [x] Session 2.5 — SVG-driven brand system + auto-build
- [x] Session 3 — Delta-E scoring + HSL feedback
- [x] Session 4 — Classic 10 rounds + Final screen
- [x] Session 5 — Figma redesign + viewport-native responsive
- [x] Session 6 — Brand expansion (86) + quip rewrite + Hologram FX
- [x] Session 7 — Mobile layout polish + WebGL color field (thay CSS hologram)
- [x] Session 8 — Brand pool expansion (Wikimedia) + audit multi-color + quip mass-market rewrite (pool: 111)
- [ ] Session 9 — Share grid + Share card PNG (button đang disabled)
- [ ] Session 10 — Daily Challenge

## Deploy

GitHub Pages — Settings → Pages → branch `main` → folder `/`.
