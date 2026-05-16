# MindColor — Project Log

> File này được Claude ghi đè mỗi khi user yêu cầu "update log".
> Mục đích: lưu lại toàn bộ quyết định, kiến trúc, tiến độ để dễ tra cứu / onboard sau.

---

## Bối cảnh

User là non-coder, có ý tưởng web game viral đoán màu logo brand. Mục tiêu: **casual viral**, đánh mạnh thị trường brand Việt nhưng có cả brand global. Stack tối giản: chỉ Claude Code + GitHub.

## Phase 0 — Định hướng & chiến lược

- **Lựa chọn hướng:** Casual viral (Wordle-style), không phải pro designer tool
- **MVP scope:** Classic mode 10 brand random + Daily Challenge cho phase sau
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

### Session 4 — Final screen + Share (grid + card)

- **`Game.getFinalSummary()`** tính tổng:
  - `totalScore` = trung bình điểm 10 round
  - `rank` = 1 trong 6 tier dựa vào totalScore
  - `gameNumber` = đếm số lần chơi Classic (lưu localStorage)
- **Rank tier system (6 mức):**
  - 95-100: 🏆 Trùm cuối màu sắc — "Trời ơi, mắt bạn là máy đo Pantone hả? Trùm rồi nha!"
  - 85-94: 🎨 Mắt designer — "Đỉnh quá đỉnh. Đi học design đi là vừa, phí tài năng!"
  - 70-84: 👀 Cũng có nghề — "Khá đó nha bro, nhìn brand nào cũng nhớ kha khá rồi!"
  - 50-69: 😎 Thường dân — "Tà tà thôi, không quá tệ, nhưng cũng chưa có gì để khoe."
  - 30-49: 😅 Mắt hơi yếu — "Hơi lú rồi đó cha. Chắc nhìn brand qua kính áp tròng à?"
  - <30: 🌫️ Mù màu nặng — "Bạn ơi, đi khám mắt gấp đi. Hoặc chơi lại cho đỡ quê 😂"
- **`js/share.js`** module mới:
  - `buildShareGrid(summary)` → text Wordle-style (header + 10 emoji + URL)
  - `copyShareGrid(summary)` → clipboard API + fallback
  - `buildShareCard(summary)` → Canvas 1200×630 PNG (OG image format)
  - `downloadShareCard(summary)` → trigger download `mindcolor-<score>.png`
- **Emoji ngưỡng share grid:** 🟩 ≥85, 🟨 60-84, 🟧 35-59, 🟥 <35
- **Final screen UI:**
  - Score 96px count-up animation 900ms với gradient text
  - Rank pill (emoji + label)
  - Comment dân dã max 360px
  - Recap list: 10 row (emoji | brand name | 2 mini swatch | %)
  - Share grid block (pre, mono font)
  - 2 button grid 50/50: Copy text / Tải ảnh
  - 2 CTA stack: Chơi lại / Về Home
- Button "Copy text" feedback: đổi label "✓ Đã copy!" 1.8s rồi reset

## Trạng thái hiện tại

**Đã có:**
- ✅ Home screen
- ✅ Classic mode 10 round
- ✅ 63 brand single-color (mostly global)
- ✅ Color picker Box + Hue
- ✅ Logo mono → color reveal
- ✅ Delta-E CIEDE2000 scoring + feedback Việt suồng sã
- ✅ Final screen với rank + comment dân dã
- ✅ Share grid text (Wordle-style)
- ✅ Share card PNG (1200×630 OG image)
- ✅ Play again / Back home
- ✅ SVG-driven brand system + auto-build CI

**Chưa có:**
- ❌ Daily Challenge (5 brand cố định/ngày + lịch 365 ngày)
- ❌ Brand Việt (kế hoạch sau khi UI ổn)
- ❌ Domain riêng
- ❌ Figma final UI (đang chờ user design)
- ❌ OG meta tags + favicon
- ❌ Analytics

## Cấu trúc dự án hiện tại

```
mindcolor/
├── index.html                       # Entry — Home + Round + Final
├── css/style.css                    # Demo styling (sẽ thay bằng Figma)
├── js/
│   ├── ui.js                        # UI controller, swap được khi đổi design
│   ├── game.js                      # Game state + rank system + final summary
│   ├── logo.js                      # Logo render (mono/color)
│   ├── scoring.js                   # CIEDE2000 + feedback engine
│   └── share.js                     # Share grid + Share card PNG
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
| Share card via Canvas API (không server-render) | Free, instant, không cần backend |
| Tiếng Việt only ở phase demo | Tránh i18n phức tạp |
| Dark theme | Hợp game feel, ít công |
| Mobile-first | 80% traffic viral là mobile |
| Rank 6 tier (không 5) | Spread đẹp hơn, mức D cho user trung bình kém |
| Game number lưu localStorage | Không cần backend, gimmick "lần thứ N chơi" |

## Roadmap còn lại

- **Session 5:** Daily Challenge — 5 brand cố định/ngày, lịch 365 ngày, share grid riêng "Daily #N"
- **Phase Figma:** Apply UI final từ Figma user cung cấp (đang chờ)
- **Phase content:** Bạn gom brand Việt theo batch, mình verify
- **Phase polish:** Domain, OG meta tags, favicon, SEO, analytics (Plausible / Umami)
- **Phase optional:** Sound effects, haptic feedback mobile, dark/light toggle

## Lưu ý khi thiết kế Figma (cho phase tiếp theo)

### Screens cần thiết kế
1. **Home** — title + 2 nút Classic / Daily
2. **Round state-1 (chọn màu)** — progress, logo mono, brand name, picker, swatch preview, Submit
3. **Round state-2 (reveal)** — logo color, score%, progress bar, reaction, 2 swatch, feedback list, Next
4. **Final** — score giant, rank pill, comment, recap 10 row, share grid, share buttons, Play again
5. **Error/Empty state** — khi chưa có brand
6. **Share card 1200×630** (asset PNG riêng) — cho social preview

### Constraints kỹ thuật
- **Mobile-first portrait 375×812.** Desktop chỉ center trong max-width 560px
- **Đừng thiết kế lại color picker** — iro.js render canvas runtime, chỉ tuỳ chỉnh size + handle được
- **Logo container** dùng placeholder 240×80 trong Figma (game random brand)
- **Share card PNG** render bằng Canvas — không hỗ trợ filter/effect phức tạp như Figma (gradient/shadow/image OK; masking/blend mode/custom font cần work-around)

### Animation đã có
- Score reveal count-up 700ms (ease-out cubic)
- Score bar fill cùng 700ms
- Feedback list fade-in stagger 150ms từ 300ms
- Logo mono→color transition 400ms
- Final score count-up 900ms

### Design tokens cần có trong Figma
- **Colors:** background (#0f0f12), surface (#18181b), text-primary (#f5f5f7), text-muted (#a1a1aa), text-dim (#71717a)
- **Spacing scale:** 4, 8, 12, 16, 20, 24, 28, 32, 48
- **Border radius:** 8 (swatch), 10 (recap row), 12 (card), 14 (button), 999 (pill/bar)
- **Type scale:** 11/13/14/15/16/18/20/22/28/32/72/96 (size), 400/500/600/700/800/900 (weight)
- **Font:** system font hiện tại — nếu đổi nên dùng Google Fonts (Inter / Manrope / Plus Jakarta Sans). Tránh Adobe Fonts.

### Recommend
- Chỉ dark mode ở phase này
- Share Figma chế độ view là đủ — Claude inspect lấy values + download SVG/PNG tự

## Reference nhanh

- **iro.js docs:** https://iro.js.org/
- **Simple Icons:** https://simpleicons.org/
- **CIEDE2000 reference:** http://www2.ece.rochester.edu/~gsharma/ciede2000/
- **GitHub Pages docs:** https://docs.github.com/en/pages
- **Canvas API:** https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API
- **OG image specs:** 1200×630, ratio 1.91:1
