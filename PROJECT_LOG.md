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

### Session 5 — Figma redesign + responsive layout overhaul

User cung cấp Figma (https://www.figma.com/design/x1GZ94iyJBhKqKtNcJkzaR/MindColor) — phải re-implement pixel-perfect và đảm bảo fluid trên mọi thiết bị.

**5.1 — Figma extract + brand collection**
- Tổng hợp **113 brand tracking** (63 foreign + 50 VN) trong `BRANDS_TRACKING.csv` với status Done/Missing + nguồn manual
- Đối với brand VN: Simple Icons CDN chỉ có 3 (shopee, grab, zalo) → còn 47 brand cần download manual
- **`assets/logos/_overrides.json`**: bổ sung shopee, grab, zalo

**5.2 — Vector logo "MindColor" thay font Clash Display**
- Download 2 variants từ Figma:
  - `assets/mindcolor-logo.svg` — 2 dòng (frame 9:743, viewBox 421×214)
  - `assets/mindcolor-logo-desktop.svg` — 1 dòng (frame 12:749, viewBox 1440×178)
- Fix `preserveAspectRatio="none"` (Figma default) → `xMidYMid meet`

**5.3 — Light theme + typography swap**
- Đổi từ dark theme cũ sang **light theme** (theo Figma)
- Font: **Clash Display** (700) cho display + **Plus Jakarta Sans** (400/700) cho body — import qua Fontshare + Google Fonts CDN
- Design tokens mới: #e9e4e1, #f3efed, #ccc2bd, #bdb4ae, #a29a95, #77706b, #44dea8 (score green)

**5.4 — Layout rewrite: viewport-native fluid (không scale frame)**

Đã thử nghiệm và loại bỏ phương án "scale 390×844 Figma frame" vì sinh whitespace. Cuối cùng dùng **viewport-native flex** cho tất cả screen.

**Nguyên tắc layout:**
- Mọi screen `position: fixed; height: 100dvh` (fallback 100vh) → no scroll, không lệ thuộc URL bar iOS động
- Padding screen: top = `env(safe-area-inset-top)`, bottom = `safe-area-inset-bottom + 50px`, sides = 0
- Container con padding `0 10px` (header, picker-stage, result-stage, final-comment, recap, final-actions)
- Buttons pinned đáy bằng `justify-content: flex-end` (picker-stage) hoặc `margin-top: auto` (result/final)
- **Mobile**: tất cả container full-width đến padding 10px
- **Desktop/landscape** (`@media (min-aspect-ratio: 1/1)`): cap container max-width 500px, centered
- **Logo MindColor**: luôn `width: 100vw` trên MỌI viewport (không cap pixel), swap variant theo aspect-ratio (vuông trở lên = horizontal logo)

**5.5 — Color picker responsive (khó nhất)**

Bug history:
1. Init iro với `width=stage.clientWidth` (gồm padding 10px) > wrap thật (sau trừ padding) → picker render rộng hơn wrap → bị overflow:hidden clip 10px mỗi bên → visual rectangle thay vì square
2. `colorPicker.resize(width)` của iro v5 chỉ update width, KHÔNG update `boxHeight` → sau resize viewport, picker thành rectangle
3. Khi viewport thấp, picker `aspect-ratio: 1; width: 100%` cao = stage width = 580 → vượt quá space của picker-stage → tràn lên đè brand-logo

**Final solution:**
- **Brand logo fixed 150×150** (không responsive, để công thức tính picker chính xác)
- **CSS var `--picker-w`** trên `#picker-stage`:
  ```css
  --picker-w: min(100%, calc(100dvh - 372px - env(safe-area-inset-top) - env(safe-area-inset-bottom)));
  ```
  Trong đó 372 = header(40) + logo-block(170) + hue(24) + submit(68) + 2 gaps(20) + bottom-pad(50)
- **picker-wrap, hue-wrap, submit btn** đều dùng `width: var(--picker-w)` → đồng bộ width tuyệt đối
- **`.color-picker-wrap { aspect-ratio: 1 }`** khoá vuông
- **JS `computePickerSize()`** đọc `#color-picker.clientWidth` (wrap thật, không phải stage) → đúng size để pass vào iro
- **Rebuild picker on resize** (thay vì iro.resize) — preserve color state, suppress callback để tránh false-positive `userHasPicked`

**5.6 — Result/Final layout fluid**

- **Compare card** `aspect-ratio: 2/3` (height ≤ 1.5× width strict) — không giãn vô tội vạ
- **Logo trong card**: padding 10px nội bộ, logo `width: 100%; aspect-ratio: 1` (vuông full inner width)
- **Score %** dùng `flex: 1 1 0` + `font-size: clamp(64px, 22vh, 220px)` → hút space còn lại, fluid theo viewport
- **Feedback box** cap `max-height: 123px` (không giãn vô lý)
- **Recap rows** `flex: 1 1 0; min-height: 0` + font-size `clamp(10px, 1.7vh, 16px)` → 10 rows tự co theo viewport, không scroll
- **Hide brand-logo ở step 2 reveal** (`brand-logo.hidden = true`) — đã có pairing 2 card bên dưới

**5.7 — Dev server local**
- `server.js` + `serve.bat` — Node thuần (không cần dependency)
- Auto-open browser, hot port fallback

### Files thay đổi/thêm trong Session 5
- `index.html` — rewrite 3 screens, thêm 2 `<img>` logo variants
- `css/style.css` — rewrite hoàn toàn (light theme, viewport-native, responsive)
- `js/ui.js` — bỏ scale logic, thêm picker resize handler + state preservation
- `js/logo.js` — CSS mask-based tinting cho arbitrary colors
- `assets/mindcolor-logo.svg` + `mindcolor-logo-desktop.svg` — new
- `BRANDS_TRACKING.csv` — new
- `server.js` + `serve.bat` — new

### Session 6 — Brand expansion + Quip rewrite + Hologram FX

**6.1 — Brand pool mở rộng (66 → 86)**

User yêu cầu: ẩn brand chưa có logo, bổ sung 100 brand global/VN trải đều fashion / FMCG / entertainment / cosmetics. Loại logo đen-trắng-only.

- Tạo wishlist 100 brand, đối chiếu Simple Icons CDN
- **20 brand resolve được + có màu**: puma, new-balance, uniqlo, hm, hermes, unilever, red-bull, kfc, burger-king, paramount, playstation, google, meta, lg, oppo, vivo, bmw, audi, hyundai, yamaha
- **11 brand skip vì monochrome** (logic: HSL saturation < 10 + lightness < 8 hoặc > 95)
- **69 brand Pending** vì Simple Icons gỡ do IP (Nike, Adidas, Pepsi, Disney, Microsoft, Amazon, LinkedIn, …) → track trong `BRANDS_TRACKING.csv` với status Done/Skipped/Pending
- Filter UI: brand không có logo file → bỏ qua khỏi pool round random (logo.js fallback rỗng)

Bug đã fix: sau merge, 20 entry mới đều có `color: #888888` xám. Cause chưa xác định (có thể script merge ghi đè). Fix: chạy lại node fetch Simple Icons JSON, patch hex thật vào từng entry.

**6.2 — Quip rewrite (~112 câu)**

User feedback: comment chi tiết line-2 lặp pattern "nhớ" / "kiểu nhớ" quá nhiều, nhàm.

- Mở rộng `BRAND_CATEGORY` map thêm 20 brand mới → đúng industry
- Thêm 7 category vào `INDUSTRY_QUIPS`: fashion, cosmetics, fmcg, beverage, fastfood, entertainment, retail
- **Rewrite hết ~112 quip** xoá pattern "nhớ" lặp. Style mới đa dạng:
  - Quan sát trực diện ("Sắc này designer brand team cãi nhau cả tuần mới chốt")
  - Phản ứng giả định brand team / agency
  - Locale reference VN (vỉa hè quận 4, Bùi Viện, Nguyễn Huệ)
  - Hypothetical & technical metaphor có vibe (VS Code Dracula theme, Lightroom Pink Glow preset, baseband 480p, TN panel)
- Rewrite cả `GENERIC_QUIPS` để match tone
- `glow-pulse` keyframe đổi shadow sang trắng trung tính (không còn vàng) — phù hợp khi rank-high có holo rainbow

**6.3 — Hologram FX cho logo Home + Final score %**

User muốn thể hiện đúng tinh thần "color" của game: logo MindColor + số % final không còn đen, mà là **hologram CD/váng dầu** liên tục đổi sắc, lượn sóng nước.

Yêu cầu: 100% code, không asset, lightweight.

**Kỹ thuật chốt:**
- **`<defs>` SVG global trong `index.html`**: filter `#mc-water` = `feTurbulence` (fractalNoise) + `feDisplacementMap` scale=4. `<animate>` chạy `baseFrequency` và `seed` theo loop 10s → noise drift sống động.
- **Logo Home**: đổi từ `<img>` sang `<div class="holo-logo holo-logo--mobile/desktop">`. Dùng `mask-image: url("../assets/mindcolor-logo.svg")` + `aspect-ratio` từng variant → giữ silhouette logo, body là background hologram.
- **Final score `<div class="holo-text">`**: `background-clip: text` + `-webkit-text-fill-color: transparent` → text trở thành "window" cho gradient.
- **Palette**: 7-stop conic full-spectrum (pink → ngả vàng → ngả xanh lá → cyan → tím → hồng nhạt → pink) — vibe CD/oil-on-water.
- **Motion 2 lớp** (chốt sau khi user feedback "linear chạy phải→trái buồn"):
  - `@property --holo-angle` syntax `<angle>` → animatable. `holo-swirl` quay 360° / 11s.
  - `holo-drift` lay `background-position` qua 4 điểm path không đều / 9s ease-in-out → bề mặt trôi không tuyến tính.
  - Lớp sheen `linear-gradient` highlight trắng + `background-blend-mode: overlay` → ánh kim chạy ngang.
- **`filter: url(#mc-water)`** chỉ áp lên `.holo-logo` (silhouette hình mượt, không lo aliasing). KHÔNG dùng cho `.holo-text` vì SVG filter + `background-clip:text` gây resample edge mỗi frame → text răng cưa/rung. Thay vào đó: `transform: translateZ(0)` + `backface-visibility: hidden` + `text-rendering: geometricPrecision` + font-smoothing → GPU compositor layer, render ổn định.
- **Dark mode**: palette riêng (sáng hơn) + filter `brightness(1.1) saturate(1.15)` để giữ tươi trên nền tối.
- **Accessibility**: `@media (prefers-reduced-motion: reduce)` ngắt animation, giữ gradient tĩnh.
- **Rank-low/high final**: vẫn cộng dồn animation `shake` / `glow-pulse` với `holo-swirl + holo-drift` (rename từ `holo-shift` cũ).

### Files thay đổi/thêm trong Session 6
- `data/brands.json` — thêm 20 entry brand mới (66 → 86), color đúng theo Simple Icons
- `assets/logos/*.svg` — 20 SVG mới download từ Simple Icons CDN
- `BRANDS_TRACKING.csv` — update full status Done / Skipped / Pending
- `js/scoring.js` — rewrite toàn bộ `INDUSTRY_QUIPS` + `GENERIC_QUIPS` + mở rộng `BRAND_CATEGORY`; chỉnh `glow-pulse` shadow
- `index.html` — thêm `<defs>` filter `#mc-water`, đổi logo home sang `<div class="holo-logo">`, gắn `holo-text` cho `#final-score`
- `css/style.css` — block HOLOGRAM mới (conic + drift + sheen + @property --holo-angle), update `.final-rank-low/high .final-score` dùng `holo-swirl + holo-drift`

### Session 7 — Mobile layout polish + WebGL color field

**7.1 — Result screen (step 2 reveal) bị chật trên mobile + browser height co lại**

User report: số % bị overflow đè vào header, các card so sánh đẩy mọi thứ tràn xuống dưới. Root cause: `.compare-card { aspect-ratio: 2/3 }` ép card cao bằng 1.5× width — trên viewport thấp card chiếm ~350px, đẩy `.result-score` về 0px, font `22vh` của score tràn ra ngoài. Container query `cqh` thử nghiệm trước đó không cứu được vì container height = 0.

Hướng fix đúng: **không để bất cứ element nào "ăn theo" remaining space** trên màn hình này. Mọi thứ size cố định theo `dvh`:

| Element | Trước | Sau |
|---|---|---|
| `.result-score` | `flex: 1 1 0` + `clamp(64px, 22vh, 220px)` | `flex: 0 0 auto` + `clamp(48px, 17dvh, 180px)` |
| `.compare-card` | `aspect-ratio: 2/3` | `height: clamp(160px, 38dvh, 260px)` |
| `.compare-card .logo-wrap` | `aspect-ratio: 1` | `flex: 1 1 0; min-height: 0` |
| `.result-feedback` max-height | `200px` | `clamp(60px, 13dvh, 130px)` |
| `#result-stage` gap | `10px` cứng | `clamp(4px, 1dvh, 10px)` |
| `.screen` padding-bottom | `+50px` | `+20px` |
| `#screen-final` padding-bottom | `+50px` | `+20px` |

`dvh` (dynamic viewport height) tốt hơn `vh` trên mobile — trừ browser chrome (thanh address động).

**7.2 — Thay CSS hologram bằng WebGL color field**

User muốn hiệu ứng màu giống <https://codepen.io/MillerTime/pen/NWPPyrX> — full-spectrum animated color field smooth, không loop ngắn, không thấy stripe của conic gradient.

Source pen dùng **regl.js** (~25KB minified) + fragment shader GLSL ~30 dòng. Shader: 3 phương trình `sin/cos` trên position + time với rotation offsets quay 360° / 2min → R/G/B mỗi pixel tính độc lập, blend organic.

**Kiến trúc tích hợp:**
- **Logo Home**: `<canvas data-webgl-color>` trong wrapper, CSS `mask-image: url(logo.svg) center/contain` clip canvas thành silhouette logo. Canvas `position: absolute; inset: 0` để **không đóng góp** intrinsic 300×150 vào layout parent.
- **Final Score**: layer 3:
  1. `<canvas data-webgl-color>` (WebGL color field full-bleed)
  2. `<div class="webgl-score-overlay">` (var(--bg) đè lên, mask-image punch text-shape hole)
  3. `<span class="webgl-score-srlabel" id="final-score">82%</span>` (SR-only, JS update text)
- **Mask render**: SVG-as-mask không load được font Clash Display → dùng off-screen 2D canvas, vẽ text với `ctx.font = "700 Npx Clash Display"` (font đã load), composite `destination-out` để khoét text-shape hole, `toDataURL` set thành `mask-image`. Đợi `document.fonts.load("700 320px Clash Display")` resolve trước khi render lần đầu.
- **Performance**: DPR cap ở 2, mask chỉ rerender khi integer score đổi (~30 lần trong 900ms count-up, không phải 60). Resize debounce qua rAF.

**`js/webgl-color.js`** — module độc lập:
- Auto-attach mọi `canvas[data-webgl-color]` lúc `DOMContentLoaded`
- Share 1 rAF loop cho tất cả instances
- `prefers-reduced-motion`: render 1 frame static, không loop
- API: `MCWebGL.attach(canvas)`, `MCWebGL.detach(canvas)`, `MCWebGL.updateScoreMask(text)`

**Files đụng vào:**
- `js/webgl-color.js` — NEW
- `index.html` — thêm CDN `regl@2.1.0` qua jsdelivr, đổi `<div class="holo-logo">` → wrapper chứa `<canvas data-webgl-color>`, đổi `<div class="final-score holo-text">` → wrapper + canvas + overlay + sr-span
- `css/style.css` — XÓA toàn bộ block HOLOGRAM (conic, holo-swirl, holo-drift, `@property --holo-angle`, water filter rules). Thêm block WEBGL COLOR (`.webgl-logo`, `.webgl-logo--mobile/--desktop`, `.webgl-score`, `.webgl-score-overlay`, `.webgl-score-srlabel`). Update `.final-rank-low/high` bỏ holo-swirl/drift references.
- `js/ui.js` — `animateFinalScore` chỉ update text khi `Math.round(eased*target)` đổi (thay vì mỗi frame), gọi `MCWebGL.updateScoreMask` cùng lúc. `renderFinal` reset mask "0%" cùng textContent.

**7.3 — Bugs phát sinh & fix**

1. **Cả 2 logo (mobile + desktop) cùng hiện trên mọi viewport** — `.webgl-logo { display: block }` định nghĩa SAU `.home-logo-desktop { display: none }` → đè vì cùng specificity. Fix: bỏ `display: block` khỏi `.webgl-logo`.
2. **Logo desktop bị tụt giữa trang, đẩy buttons ra khỏi viewport** — canvas mặc định có intrinsic size 300×150, khi child `width: 100%; height: 100%` trên parent có `aspect-ratio` + `height: auto`, browser dùng canvas intrinsic để xác định parent height thay vì aspect-ratio. Fix:
   - Canvas `position: absolute; inset: 0` → không contribute layout
   - Thêm explicit `height: calc(100vw * ratio_h / ratio_w)` cho `.webgl-logo--mobile/--desktop` để chốt kích thước, không lệ thuộc aspect-ratio resolution

**7.4 — Project housekeeping**
- Tạo `.gitignore`: `.claude/worktrees/` (Claude Code worktree folder), `node_modules/`. Trước đó GitHub Desktop báo dirty vì folder worktree không track.

### Files thay đổi/thêm trong Session 7
- `js/webgl-color.js` — NEW (~150 dòng)
- `index.html` — regl CDN, restructure logo + final-score HTML, thêm script tag
- `css/style.css` — replace HOLOGRAM block (conic gradient/filter/keyframes) bằng WEBGL COLOR block; layout polish cho `#result-stage`, `.result-score`, `.compare-card`, `.compare-card .logo-wrap`, `.result-feedback`, `.screen`/`#screen-final` padding
- `js/ui.js` — `animateFinalScore` + `renderFinal` gọi `MCWebGL.updateScoreMask`
- `.gitignore` — NEW

### Session 8 — Brand pool expansion + multi-color audit + quip mass-market rewrite

**8.1 — BRANDS_TRACKING.csv encoding fix**

User mở CSV trong Excel → cột F (notes) bị mojibake. Excel mặc định Windows-1252, không tự detect UTF-8 nếu thiếu BOM. Quyết định chuyển toàn bộ notes sang English — bền hơn BOM hack, không cần dặn user import wizard.

**8.2 — Pilot batch (9 brand)**

User chốt pilot 10 brand trước khi scale: 5 global (Pepsi, Nintendo, Microsoft, Amazon, Disney) + 5 VN (Vietcombank, Viettel, MoMo, VinFast, Vinamilk).

- VectorLogoZone (`https://www.vectorlogo.zone/logos/<slug>/<slug>-icon.svg`) cover global brands phổ biến: Pepsi, Microsoft, Amazon, Disney
- Wikimedia Commons API cover VN brands: search `?action=query&list=search&srsearch=<brand>+filetype:svg&srnamespace=6` → lấy filename → query `imageinfo` để lấy direct URL
- Wikimedia rate limit nghiệt: file downloads từ `upload.wikimedia.org` cần delay ≥10s, không thì 429
- MoMo không có trên Wikimedia → swap sang Vietnam Airlines
- Microsoft skip vì 4-color squares (rule single-color)
- 9/10 thành công

Tạo **`scripts/normalize-svg.mjs`** xử lý SVG download xuống:
- Strip XML decl, comments, metadata, Inkscape/sodipodi namespaces
- Strip `<style>` blocks, CSS `fill:` trong style attr, per-element `fill` (giữ `fill="none"` cho cut-outs)
- Force `fill="<brandHex>"` trên root `<svg>` (cascade xuống mọi shape)
- Đặt `<title>` chuẩn
- Detect full-viewBox `<rect>` background (Nintendo case) → strip

**8.3 — Fix 20 brand `#888888` fallback (Session 6 dirt)**

Sau pilot, user chơi thử báo BMW/Paramount màu `#888888` (gray xám). Rà soát thấy 20 brand từ Session 6 expansion đều fallback `#888888`. Cause: Simple Icons CDN đổi behavior — giờ trả SVG **không có** `fill=` attribute (dùng `currentColor`). Build script không extract được màu → fallback.

Fix: re-fetch từ `cdn.simpleicons.org/<slug>` (giờ trả SVG có `fill="<brandHex>"` baked in). 6 slug không match đơn giản phải đoán lại:

| Brand | Slug Simple Icons thật |
|---|---|
| burger-king | `burgerking` |
| hm | `handm` |
| new-balance | `newbalance` |
| paramount | `paramountplus` |
| red-bull | `redbull` |
| yamaha | `yamahacorporation` |

**8.4 — Edge cases bắt được khi re-fetch**

- **Nintendo render thành hình chữ nhật**: SVG Wikimedia có `<rect>` full viewBox làm background. CSS mask dùng alpha → rect chiếm hết mask area. Fix: xoá rect element, chỉ giữ path chữ "Nintendo". Sync logic vào `normalize-svg.mjs` (full-viewBox shape detection).
- **Puma monochrome**: Simple Icons đổi `puma` sang `#242B2F` (gần đen). Re-download từ Wikimedia "Puma-logo-(text)", recolor `#DC0817` (Puma red chính thức).
- **Hermes wrong entity**: Simple Icons slug `hermes` → Hermes logistics/ERP brand (xanh `#0091CD`), không phải fashion Hermès (cam). Xoá khỏi pool, mark Pending — Wikimedia rate-limit nên không retry được trong session.
- **Title-case xấu**: build script dùng `deriveName` naive title-case → "Bmw" / "Hm" / "Kfc" / "Lg" / "Oppo" / "Playstation". Thêm `_overrides.json` entries: BMW / H&M / KFC / LG / OPPO / PlayStation.

**8.5 — Batch scale-up qua Wikimedia (37 brand mới)**

Tạo **`scripts/fetch-brands.mjs`** — pipeline tự động đầy đủ:
- Đọc manifest JSON: `[{id, name, search, color, file?}]`
- Search Commons API → score filename theo heuristic (require search keywords trong filename; +3 nếu "logo", +2 nếu "wordmark", +2 nếu year-stamped recent; −5 "old/former/historic"; −3 "outline/monochrome/black"; −5 "city/district/province"; −2 "seal/crest/flag")
- Disqualify match nếu không có keyword nào trong filename (Wikimedia full-text search trả false match khi brand name xuất hiện trong file description)
- Per-brand specify `"file": "Foo.svg"` để bypass search khi cần
- Download file với UA, retry 1 lần trên 429 sau 30s, throttle 12s giữa brands
- Inline normalize (cùng logic `normalize-svg.mjs`)

5 batches chạy (A–E):
- **A** global: marvel, pizza-hut, dominos, subway, heineken, xbox, dc, pixar (8/10; carlsberg/monster-energy không có file đúng entity trên Commons)
- **B** cosmetics/F&B: lotteria, clinique, nivea, dove, shiseido, lacoste, jollibee, lazada, realme (9/10; laneige không có)
- **C** VN banks: bidv, vpbank, acb, tpbank, vietjet (5/10; techcombank, mbbank, sacombank, vib, agribank không có — trademark restricted)
- **D** VN telco/tech: vinaphone, mobifone, vng, fpt (4/6; vnpt, tiki không có)
- **E** VN retail/F&B: vingroup, highlands-coffee (2/8; vincom, vinhomes, vinpearl, phuc-long, masan không có)

Bug bắt được trong batch flow:
- **Monster Energy** match nhầm "6 icon B (Hungary).svg" và "Logo Die Monster AG.svg" (company Đức) → cải tiến filter: require keyword trong filename
- **Carlsberg** match "Ny Carlsberg Glyptotek logo.svg" (bảo tàng) → cùng problem
- **Vietnam Airlines** initial pilot dùng "Vietnam Airlines 2015 wordmark.svg" — wordmark thuần text, không có symbol lotus. Acceptable cho game vì color matters.
- **Marvel** version 2000-2012 (search prioritize year), không phải logo hiện hành. Vẫn nhận diện được.

**8.6 — Multi-color audit (user-triggered cleanup)**

User test in-game báo: BIDV là logo cũ, Nivea không hiện chữ. Rà soát phát hiện:
- **Nivea**: SVG có `<circle r="250">` (= full 500×500 viewBox) làm background. CSS mask alpha → toàn vòng tròn opaque, nuốt path chữ "NIVEA" bên trong. Fix: xoá circle element. Cập nhật `normalize-svg.mjs` + `fetch-brands.mjs` detect full-viewBox `<rect>` / `<circle>` / `<ellipse>` (≥95% area cho rect; r ≥ 45% min dimension cho circle; rx/ry ≥ 45% viewBox cho ellipse).
- **BIDV**: Re-fetch "Logo Bidv mới.svg" (mới = new) → có 3 fills `#21409A` / `#ED1D24` / `#FFFFFF` (multi-color). Game không hỗ trợ → loại.
- **PayPal**: User chỉ thẳng "PayPal thực tế có 2 màu nên cũng phải loại". Đặt thành rule chung: rà soát toàn bộ pool, brand nào identity thực tế là multi-color → loại.

User confirm danh sách loại sau khi mình đề xuất 17 brand + 6 borderline:
- **Loại (11)**: paypal, google, bmw, audi, burger-king, bidv, pixar, subway, dominos, jollibee, lazada
- **Giữ (theo user explicit)**: visa, amazon, ford, whatsapp, snapchat, youtube, twitch, mcdonalds, honda, toyota, starbucks, tesla

CSV mark `Skipped` cho 11 brand bị loại với reason "Multi-color brand identity (real-life logo uses 2+ colors) — not suitable for single-color guessing game".

Pool: 122 → 111.

**8.7 — Fix flash final score**

User báo: khi vào final result, thấy "nháy" 1 container màu full trước khi WebGL nằm gọn trong số `%`.

Root cause: `pop-in` keyframes của `.final-score` dùng `opacity: 0 → 1` + scale. Trong khi opacity < 1, overlay div `background: var(--bg)` cũng semi-transparent → canvas WebGL bên dưới rò ra trước khi overlay đủ opaque để che (canvas chỉ hiện qua hole của mask khi overlay fully opaque).

Fix: tạo `@keyframes pop-in-scale` chỉ animate transform (không opacity), override cho `.final-score.webgl-score`. Overlay luôn 100% opaque ngay từ frame đầu → không leak canvas color. Animation entrance vẫn có hiệu ứng pop vì page-level `screen-enter` đã handle fade.

**8.8 — Quip mass-market rewrite**

User feedback: comment chi tiết một số brand chưa sát industry, một số quá khó hiểu với thị trường đại trà.

Audit + rewrite **hue analysis** (6 buckets × 3 variants) + **10 industry categories** trong `scoring.js`:

| Phần | Vấn đề | Sửa |
|---|---|---|
| Hue analysis | "JND (Just-Noticeable Difference)", "centroid hue", "complementary mismatch", "QA màu in" — color science jargon | Cụm phổ thông: "bánh xe màu", "warm/cool", "đem in", "trí nhớ thị giác" |
| finance | "FOMO bull market", "flash crash", "candle long" — crypto/trading | Thẻ ngân hàng, ATM, app banking 11h đêm |
| saas | "VS Code Dracula theme bật 14 tiếng", "47 tab Chrome", "Dark Reader", "userstyle" — dev-only | Văn phòng chung: dark mode laptop, Zalo share screenshot, extension đổi theme |
| creative | "Dribbble featured shot ngàn like", "Figma frame trắng", "moodboard 40% navy overlay" — designer-only | Sếp reply Zalo "xem lại tone", filter Instagram, slide nền trắng |
| stream-audio | "album cover Lana Del Rey", "lofi 24/7 livestream YouTube", "equalizer 2 tiếng võng mạc bias" — music-nerd | Tai nghe, Wrapped cuối năm, widget khoá màn nghe nhạc trên giường |
| stream-video | "LUT phim noir thập niên 70", "auto-brightness 20% rạp tối" — cinephile | Cày phim khuya, TV mode "Movie", bản tải lậu 480p |
| telco | "tổng đài tự động đọc câu nào nhanh câu nào chậm" — over-specific | Tổng đài CSKH, đại lý ngoài tỉnh phai nắng |
| travel | "áo đồng phục shipper sau ca giao 8 tiếng" — nhầm sang delivery | Tài xế, kính ô tô đối tác, app đặt xe 2h sáng |
| fastfood | KFC "ăn để hiểu cake nào hot, cake nào đáng tránh" — KFC không có cake | "Món nào ngon món nào pass" |
| gaming | "fanart trên DeviantArt thời 2012", "Nexus mod" — niche | "Fanart cộng đồng vẽ lại", "skin mod fan-made" |
| fashion | "Vinted", "lookbook golden hour Lisbon", "campaign Trung Đông" | "App secondhand", "giờ chiều ánh nghiêng", "thị trường nước ngoài chưa về VN" |
| cosmetics | "filter Lightroom preset Pink Glow" | "Beauty blogger chỉnh filter cho hồng hào" |
| os | "ROM modder XDA tự build", "wallpaper dark mode Always-On" | "ROM cộng đồng forum", "màn tự sáng nhẹ" |

Giữ nguyên (đã OK): food, ecommerce, beverage, social, retail, entertainment, fmcg.

Content vibe lock — note rule trong `README.md` để session sau không lùi về jargon/niche.

### Files thay đổi/thêm trong Session 8
- `BRANDS_TRACKING.csv` — translate all notes EN, status update từng brand (Done/Skipped/Pending với reason rõ)
- `scripts/normalize-svg.mjs` — NEW, reusable SVG cleaner
- `scripts/fetch-brands.mjs` — NEW, batch pipeline Wikimedia + normalize
- `scripts/brand-batch-{a,b,c,d,e}.json` — manifest cho 5 batch
- `scripts/update-csv.mjs` + `update-csv-removed.mjs` — helper bulk-update CSV
- `assets/logos/*.svg` — 37 brand mới + xoá 11 multi-color + 2 wrong-brand
- `assets/logos/_overrides.json` — thêm VinFast, Vietnam Airlines, BMW (sau xoá), H&M, KFC, LG, OPPO, PlayStation
- `data/brands.json` — auto-rebuild, 111 brand
- `css/style.css` — `@keyframes pop-in-scale` override cho `.final-score.webgl-score` (fix flash)
- `js/scoring.js` — rewrite hue analysis + 10 industry categories với tone mass-market

## Trạng thái hiện tại

**Đã có:**
- ✅ Home screen (mobile + desktop logo variants) — logo WebGL color field
- ✅ Classic mode 10 round
- ✅ **111 brand single-color** (sau audit multi-color identity của Session 8)
- ✅ WebGL color field FX (regl.js + GLSL fragment shader) — logo Home + số % Final
- ✅ Quip industry-specific mass-market vibe (rewrite Session 8, không jargon design/dev/cinephile)
- ✅ Color picker Box + Hue (responsive, square trên mọi viewport)
- ✅ Logo CSS-mask tinting (arbitrary colors)
- ✅ Delta-E CIEDE2000 scoring + feedback Việt suồng sã
- ✅ Final screen với rank + comment dân dã (hết flash WebGL leak khi pop-in)
- ✅ Share grid text (Wordle-style)
- ✅ Share card PNG (1200×630 OG image)
- ✅ Play again / Back home
- ✅ SVG-driven brand system + auto-build CI
- ✅ Pipeline batch-fetch brand từ Wikimedia (`fetch-brands.mjs`) + normalize (`normalize-svg.mjs`)
- ✅ Figma pixel-perfect light theme + dark mode
- ✅ Viewport-native responsive (mobile 320 → desktop 4K) — result screen dùng `dvh` cho fluid sizing
- ✅ Local dev server (Node)

**Chưa có:**
- ❌ Daily Challenge (5 brand cố định/ngày + lịch 365 ngày)
- ❌ ~30 brand VN/global còn `Pending` (trademark-restricted trên Wikimedia — cần download manual từ press kit)
- ❌ Hermes (fashion) — Wikimedia rate-limit khi retry, defer
- ❌ Domain riêng
- ❌ OG meta tags + favicon
- ❌ Analytics
- ❌ Share button trên Final (đang disabled, build sau)

## Cấu trúc dự án hiện tại

```
mindcolor/
├── index.html                       # Entry — Home + Round + Final
├── css/style.css                    # Light theme, viewport-native fluid
├── js/
│   ├── ui.js                        # UI controller + picker resize handler
│   ├── game.js                      # Game state + rank system + final summary
│   ├── logo.js                      # CSS-mask logo tinting (arbitrary colors)
│   ├── scoring.js                   # CIEDE2000 + feedback engine
│   ├── share.js                     # Share grid + Share card PNG
│   ├── theme.js                     # Light/Dark toggle bootstrap
│   ├── fx.js                        # Confetti + transition overlay
│   └── webgl-color.js               # regl.js color field + score text mask
├── data/
│   └── brands.json                  # Auto-generated, KHÔNG sửa tay
├── assets/
│   ├── mindcolor-logo.svg           # Logo 2-line (mobile/portrait)
│   ├── mindcolor-logo-desktop.svg   # Logo 1-line (desktop/landscape)
│   └── logos/                       # Drop SVG vào đây
│       ├── *.svg                    # 66 brand
│       ├── _overrides.json          # Override display name
│       └── README.md
├── scripts/
│   ├── build-brands.mjs             # Node script chạy bởi Action — sinh brands.json
│   ├── normalize-svg.mjs            # Clean SVG (viewBox + single fill + strip bg shape)
│   ├── fetch-brands.mjs             # Batch pipeline Wikimedia search + download + normalize
│   ├── brand-batch-{a..e}.json      # Manifest mẫu cho 5 batch đã chạy
│   └── update-csv*.mjs              # Bulk-update BRANDS_TRACKING.csv
├── .github/workflows/
│   └── build-brands.yml             # Auto-build on push to assets/logos/
├── server.js                        # Local dev server (Node thuần)
├── serve.bat                        # Windows launcher
├── BRANDS_TRACKING.csv              # Tracking 113 brand (63 foreign + 50 VN)
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

- **Session 9:** Share grid + Share card PNG — enable button trên Final, wire `share.js` lên UI
- **Session 10:** Daily Challenge — 5 brand cố định/ngày, lịch 365 ngày, share grid riêng "Daily #N"
- **Phase content:** ~30 brand `Pending` còn lại (trademark-restricted, cần download manual từ press kit từng brand)
- **Phase polish:** Domain, OG meta tags, favicon, SEO, analytics (Plausible / Umami)
- **Phase optional:** Sound effects, haptic feedback mobile

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
- **regl.js docs:** https://regl-project.github.io/regl/
- **WebGL color shader source:** https://codepen.io/MillerTime/pen/NWPPyrX
- **Simple Icons:** https://simpleicons.org/
- **CIEDE2000 reference:** http://www2.ece.rochester.edu/~gsharma/ciede2000/
- **GitHub Pages docs:** https://docs.github.com/en/pages
- **Canvas API:** https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API
- **OG image specs:** 1200×630, ratio 1.91:1
