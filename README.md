# MindColor

Game đoán màu logo thương hiệu. Bạn nhớ màu brand giỏi tới đâu?

## Cách thêm brand

→ Đọc [`assets/logos/README.md`](assets/logos/README.md)

TL;DR: drop file `<brand-name>.svg` vào `assets/logos/`, push, GitHub Action tự build phần còn lại.

## Cấu trúc

```
mindcolor/
├── index.html
├── css/style.css
├── js/
│   ├── ui.js           # UI controller
│   ├── game.js         # Game state
│   ├── logo.js         # Logo renderer
│   ├── scoring.js      # (TBD) Delta-E + HSL feedback
│   ├── share.js        # (TBD) Share grid + card
│   └── daily.js        # (TBD) Daily challenge
├── data/
│   └── brands.json     # AUTO-GENERATED — đừng sửa tay
├── assets/logos/       # Drop SVG vào đây
├── scripts/
│   └── build-brands.mjs   # Script build chạy bởi Action
└── .github/workflows/
    └── build-brands.yml   # Auto-build on push
```

## Roadmap

- [x] Session 1 — Scaffold + Home screen
- [x] Session 2 — Color picker + 1 round
- [x] Session 2.5 — SVG-driven brand system + auto-build
- [x] Session 3 — Delta-E scoring + HSL feedback
- [x] Session 4 — Classic 10 rounds + Final screen
- [x] Session 5 — Figma redesign + viewport-native responsive
- [x] Session 6 — Brand expansion (86) + quip rewrite + Hologram FX
- [ ] Session 7 — Share grid + Share card PNG (button đang disabled)
- [ ] Session 8 — Daily Challenge

## Deploy

GitHub Pages — Settings → Pages → branch `main` → folder `/`.
