# MindColor

Game đoán màu logo thương hiệu. Bạn nhớ màu brand giỏi tới đâu?

## Status

Phase 1 — MVP demo. Stack: vanilla HTML/CSS/JS, deploy GitHub Pages.

## Cấu trúc

```
mindcolor/
├── index.html          # Entry
├── css/style.css       # Demo styling (thay bằng Figma sau)
├── js/
│   ├── ui.js           # UI controller
│   ├── game.js         # (TBD) Game state
│   ├── scoring.js      # (TBD) Delta-E + HSL feedback
│   ├── share.js        # (TBD) Share grid + card
│   └── daily.js        # (TBD) Daily challenge
├── data/
│   ├── brands.json     # (TBD) Pool brand
│   └── daily.json      # (TBD) Lịch daily
└── lib/                # (TBD) iro.js color picker
```

## Roadmap

- [x] Session 1 — Scaffold + Home screen
- [ ] Session 2 — Color picker + 1 round
- [ ] Session 3 — Delta-E scoring + HSL feedback
- [ ] Session 4 — Classic 10 rounds + Final screen
- [ ] Session 5 — Share grid + Share card PNG
- [ ] Session 6 — Daily Challenge

## Deploy

GitHub Pages — bật trong Settings → Pages → branch `main` → folder `/`.
