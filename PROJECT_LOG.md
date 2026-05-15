# MindColor — Project Log

> File này được Claude ghi đè mỗi khi user yêu cầu "update log".
> Mục đích: lưu lại toàn bộ quyết định, kiến trúc, tiến độ để dễ tra cứu / onboard sau.

---

## Bối cảnh

User là non-coder, có ý tưởng web game viral đoán màu logo brand. Mục tiêu: **casual viral**, đánh mạnh thị trường brand Việt nhưng có cả brand global. Stack tối giản: chỉ Claude Code + GitHub.

## Phase 0 — Định hướng & chiến lược

- **Lựa chọn hướng:** Casual viral (Wordle-style), không phải pro designer tool
- **MVP scope:** Classic mode 10 brand random + Delay Daily Challenge cho phase 2
- **Brand viral chiến lược:** Daily Challenge với share grid emoji + Delta-E scoring (wow factor)
- **Pool brand mục tiêu:** 150-300 ở launch
- **Stack quyết định:** Vanilla HTML/CSS/JS + GitHub Pages, không framework, không backend. Lý do: load nhanh, dễ viral, không build step.
- **Domain:** chưa mua, dùng `<username>.github.io/MindColor` tạm

## Phase 1 — Plan kỹ thuật

Quyết định kiến trúc:
- Tách logic (game.js) khỏi UI (ui.js) — để swap UI Figma sau không phải viết lại core
- Schema brand đơn giản: `{id, name, color, logo, difficulty}`
- Daily Challenge static client-side (không cần backend)
- Anti-cheat tối thiểu: không lộ đáp án trong DOM

## Phase 2 — Build

### Session 1 — Scaffold
- Tạo `index.html`, `css/style.css`, `js/ui.js`, `README.md`
- Home screen + 2 nút (Classic, Daily disabled)
- Style: dark theme, gradient logo "MindColor", mobile-first
- Cấu trúc folder cho session sau: `js/`, `data/`, `lib/`

### Session 2 — Color picker + 1 round
- Tích hợp **iro.js** qua CDN (color picker)
- Tách `js/game.js` (state machine: `startClassic`, `submit`, `next`, `progress`)
- Round screen: brand name → picker → swatch preview → Submit → Reveal 2 swatch
- 20 brand seed (10 global + 10 Việt)

### Session 2.5 — SVG-driven brand system (rework lớn)

User muốn workflow đơn giản hơn: **chỉ drop SVG vào folder, không đụng JSON**.

Mình rework:
- **GitHub Action** (`.github/workflows/build-brands.yml`) auto-build khi push thay đổi `assets/logos/`
- **Script Node.js** (`scripts/build-brands.mjs`):
  - Quét folder logos
  - Đọc SVG, regex trích `fill="..."` → tìm màu dominant (bỏ qua đen/trắng/xám)
  - Suy ra display name từ filename (`coca-cola.svg` → "Coca-Cola")
  - Sinh `data/brands.json`
  - Hỗ trợ `_overrides.json` để override name/color/difficulty
- **`js/logo.js`**: load local SVG, mono mode dùng CSS filter `brightness(0) invert(1)` (hoạt động với mọi SVG)
- Picker đổi từ Wheel sang **Box + Hue slider** (chính xác hơn cho user)
- Picker rộng: `min(420px, viewport - 48px)`

### Brand seed
- Tự động download từ **Simple Icons CDN** (`cdn.simpleicons.org/<slug>`) — SVG có sẵn màu brand baked
- Lần 1: 50 brand → 39 OK (11 brand bị Simple Icons gỡ do brand license: MS, Amazon, Adobe, IBM, LinkedIn, Pepsi...)
- Bổ sung 20 brand thay thế
- **User chốt tiêu chí:** chỉ brand single-color, loại B&W và multi-color
- Dọn dẹp → **63 brand cuối** (tech, F&B, auto, finance, fashion)

### Session 3 — Delta-E scoring + HSL feedback
- **`js/scoring.js`**:
  - CIEDE2000 đầy đủ (~30 dòng math)
  - Pipeline: hex → RGB → XYZ → Lab → ΔE
  - Score curve: `100 * exp(-ΔE/35)` (ΔE=5 → 87%, ΔE=25 → 49%)
  - HSL diff: hue (circular, tên tông tiếng Việt), saturation, lightness
- **Feedback Việt hoá tone hài/suồng sã:** 24 câu reaction theo 6 mức điểm
- **UI reveal mới:**
  - Score 72px count-up animation 700ms
  - Progress bar gradient (đỏ→cam→vàng→xanh theo điểm)
  - Reaction in đậm
  - 2 swatch so sánh
  - Feedback list fade-in stagger 150ms

## Trạng thái hiện tại

**Đã có:**
- ✅ Home screen
- ✅ Classic mode 10 round
- ✅ 63 brand single-color (mostly global)
- ✅ Color picker Box + Hue
- ✅ Logo mono → color reveal
- ✅ Delta-E CIEDE2000 scoring
- ✅ Feedback Việt suồng sã
- ✅ SVG-driven brand system + auto-build CI

**Chưa có:**
- ❌ Final screen (tổng 10 round + rank + comment)
- ❌ Share grid + Share card PNG
- ❌ Daily Challenge
- ❌ Brand Việt (kế hoạch sau khi UI ổn)
- ❌ Domain riêng
- ❌ Figma final UI

## Cấu trúc dự án hiện tại

```
mindcolor/
├── index.html                       # Entry — Home + Round + Final placeholder
├── css/style.css                    # Demo styling (sẽ thay bằng Figma)
├── js/
│   ├── ui.js                        # UI controller, swap được khi đổi design
│   ├── game.js                      # Game state machine
│   ├── logo.js                      # Logo render (mono/color)
│   └── scoring.js                   # CIEDE2000 + feedback engine
├── data/
│   └── brands.json                  # Auto-generated, KHÔNG sửa tay
├── assets/logos/                    # Drop SVG vào đây
│   ├── *.svg                        # 63 brand
│   ├── _overrides.json              # Override display name
│   └── README.md
├── scripts/
│   └── build-brands.mjs             # Node script chạy bởi Action
├── .github/workflows/
│   └── build-brands.yml             # Auto-build on push to assets/logos/
├── PROJECT_LOG.md                   # File này
└── README.md
```

## Quyết định kiến trúc quan trọng đã chốt

| Quyết định | Lý do |
|---|---|
| Vanilla JS, không framework | Load nhanh, đơn giản, không build step |
| GitHub Pages, không backend | Free, đủ dùng cho phase 1 viral |
| Tách logic / UI | Để Figma redesign không phá game logic |
| Delta-E CIEDE2000 (không Delta-E 76) | Chuẩn ngành, perceptual accurate |
| Score % (không 1000-point) | Trực quan, mass-market |
| Logo via SVG local (không Simple Icons runtime) | Full control, không lệ thuộc CDN ngoài |
| Auto-build qua GitHub Action | User non-coder chỉ cần drop SVG |
| Daily Challenge static (không backend) | Wordle pattern, không cần server |
| Tiếng Việt only ở phase demo | Tránh i18n phức tạp |
| Dark theme | Hợp game feel, ít công |
| Mobile-first | 80% traffic viral là mobile |

## Roadmap còn lại

- **Session 4:** Final screen — total score (trung bình %), rank tier (Pantone Soul / Eagle Eye / Sharp Memory / Average Joe / Color Fog), comment Việt hoá, list 10 round
- **Session 5:** Share grid emoji + Share card PNG (Canvas API)
- **Session 6:** Daily Challenge — 5 brand cố định/ngày, lịch 365 ngày
- **Phase Figma:** Apply UI final từ Figma user cung cấp
- **Phase content:** Bạn gom brand Việt theo batch, mình verify
- **Phase polish:** Domain, OG meta tags, SEO, analytics

## Lưu ý khi thiết kế Figma (cho phase tiếp theo)

1. **Screens cần thiết kế:** Home, Round state-1 (chọn màu), Round state-2 (reveal), Final, Error/Empty
2. **Mobile-first portrait 375×812.** Desktop chỉ center trong max-width 560px
3. **Đừng thiết kế lại color picker** — iro.js render canvas runtime, chỉ tuỳ chỉnh size + handle được
4. **Logo container:** dùng placeholder 240×80 trong Figma, không vẽ logo cụ thể (game random)
5. **Animation đã có:** score count-up 700ms, bar fill cùng 700ms, feedback fade-in stagger 150ms, logo mono→color transition 400ms
6. **Design tokens cần có:** colors, spacing scale (4/8/12/16/20/24/32/48), radius (8/12/14/999), type scale (11/13/14/16/18/20/28/32/72)
7. **Font:** tránh Adobe Fonts (license). Inter / Manrope / Plus Jakarta Sans là OK qua Google Fonts
8. **Share card 1200×630** (OG ratio) cho Final screen — render PNG bằng Canvas
9. **Recommend chỉ dark mode** ở phase này
10. **Share Figma chế độ view** là đủ — Claude sẽ inspect lấy values + download SVG/PNG

## Reference nhanh

- **iro.js docs:** https://iro.js.org/
- **Simple Icons:** https://simpleicons.org/
- **CIEDE2000 reference:** http://www2.ece.rochester.edu/~gsharma/ciede2000/
- **GitHub Pages docs:** https://docs.github.com/en/pages
