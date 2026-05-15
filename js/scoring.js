// MindColor — scoring (Delta-E CIEDE2000) + feedback Việt hoá

const Scoring = (() => {

  // ---------- Color conversions ----------

  function hexToRgb(hex) {
    const m = hex.replace('#', '').match(/.{2}/g);
    return m.map(x => parseInt(x, 16));
  }

  function rgbToXyz([r, g, b]) {
    const f = c => {
      c = c / 255;
      return c > 0.04045 ? Math.pow((c + 0.055) / 1.055, 2.4) : c / 12.92;
    };
    const R = f(r), G = f(g), B = f(b);
    return [
      (R * 0.4124564 + G * 0.3575761 + B * 0.1804375) * 100,
      (R * 0.2126729 + G * 0.7151522 + B * 0.0721750) * 100,
      (R * 0.0193339 + G * 0.1191920 + B * 0.9503041) * 100,
    ];
  }

  function xyzToLab([X, Y, Z]) {
    const Xn = 95.047, Yn = 100.0, Zn = 108.883;
    const f = t => t > 0.008856 ? Math.cbrt(t) : (7.787 * t + 16 / 116);
    const fx = f(X / Xn), fy = f(Y / Yn), fz = f(Z / Zn);
    return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
  }

  function hexToLab(hex) {
    return xyzToLab(rgbToXyz(hexToRgb(hex)));
  }

  function rgbToHsl([r, g, b]) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;
    if (max === min) { h = 0; s = 0; }
    else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h *= 60;
    }
    return [h, s * 100, l * 100];
  }

  // ---------- CIEDE2000 ----------

  function deltaE00(lab1, lab2) {
    const [L1, a1, b1] = lab1;
    const [L2, a2, b2] = lab2;
    const kL = 1, kC = 1, kH = 1;

    const C1 = Math.hypot(a1, b1);
    const C2 = Math.hypot(a2, b2);
    const Cb = (C1 + C2) / 2;

    const G = 0.5 * (1 - Math.sqrt(Math.pow(Cb, 7) / (Math.pow(Cb, 7) + Math.pow(25, 7))));
    const a1p = (1 + G) * a1;
    const a2p = (1 + G) * a2;

    const C1p = Math.hypot(a1p, b1);
    const C2p = Math.hypot(a2p, b2);

    const h1p = Math.atan2(b1, a1p) * 180 / Math.PI;
    const h2p = Math.atan2(b2, a2p) * 180 / Math.PI;
    const h1pp = h1p < 0 ? h1p + 360 : h1p;
    const h2pp = h2p < 0 ? h2p + 360 : h2p;

    const dLp = L2 - L1;
    const dCp = C2p - C1p;

    let dhp;
    if (C1p * C2p === 0) dhp = 0;
    else if (Math.abs(h2pp - h1pp) <= 180) dhp = h2pp - h1pp;
    else if (h2pp - h1pp > 180) dhp = h2pp - h1pp - 360;
    else dhp = h2pp - h1pp + 360;

    const dHp = 2 * Math.sqrt(C1p * C2p) * Math.sin((dhp * Math.PI / 180) / 2);

    const Lp = (L1 + L2) / 2;
    const Cp = (C1p + C2p) / 2;

    let hp;
    if (C1p * C2p === 0) hp = h1pp + h2pp;
    else if (Math.abs(h1pp - h2pp) <= 180) hp = (h1pp + h2pp) / 2;
    else if (h1pp + h2pp < 360) hp = (h1pp + h2pp + 360) / 2;
    else hp = (h1pp + h2pp - 360) / 2;

    const T = 1
      - 0.17 * Math.cos((hp - 30) * Math.PI / 180)
      + 0.24 * Math.cos((2 * hp) * Math.PI / 180)
      + 0.32 * Math.cos((3 * hp + 6) * Math.PI / 180)
      - 0.20 * Math.cos((4 * hp - 63) * Math.PI / 180);

    const dTheta = 30 * Math.exp(-Math.pow((hp - 275) / 25, 2));
    const Rc = 2 * Math.sqrt(Math.pow(Cp, 7) / (Math.pow(Cp, 7) + Math.pow(25, 7)));
    const Sl = 1 + (0.015 * Math.pow(Lp - 50, 2)) / Math.sqrt(20 + Math.pow(Lp - 50, 2));
    const Sc = 1 + 0.045 * Cp;
    const Sh = 1 + 0.015 * Cp * T;
    const Rt = -Math.sin(2 * dTheta * Math.PI / 180) * Rc;

    return Math.sqrt(
      Math.pow(dLp / (kL * Sl), 2) +
      Math.pow(dCp / (kC * Sc), 2) +
      Math.pow(dHp / (kH * Sh), 2) +
      Rt * (dCp / (kC * Sc)) * (dHp / (kH * Sh))
    );
  }

  // ---------- Score mapping ----------

  function scoreFromDeltaE(de) {
    // Exponential decay: ΔE=0→100, ΔE=5→87, ΔE=10→75, ΔE=25→49, ΔE=50→24
    return Math.max(0, Math.min(100, Math.round(100 * Math.exp(-de / 35))));
  }

  // ---------- HSL diff ----------

  function hueCircularDiff(h1, h2) {
    const d = Math.abs(h1 - h2) % 360;
    return d > 180 ? 360 - d : d;
  }

  function hueName(h) {
    h = ((h % 360) + 360) % 360;
    if (h < 15 || h >= 345) return "đỏ";
    if (h < 45)  return "cam";
    if (h < 70)  return "vàng";
    if (h < 165) return "xanh lá";
    if (h < 200) return "lục lam";
    if (h < 260) return "xanh dương";
    if (h < 290) return "tím";
    return "hồng";
  }

  // ---------- Feedback Việt hoá (tone hài, suồng sã) ----------

  const REACTIONS = {
    perfect: [
      "Đỉnh của chóp! 🏆",
      "Mắt designer chính hiệu!",
      "Lú gì đâu mà chuẩn dữ vậy!",
      "Trùm rồi nha bạn!",
    ],
    great: [
      "Ngon ngon, sát rồi!",
      "Gần như chuẩn luôn 👌",
      "Khá ổn áp đấy chứ!",
      "Cũng có nghề ghê!",
    ],
    good: [
      "Tạm chấp nhận được ha 😎",
      "Ổn nhưng chưa đỉnh",
      "Cũng được, không tệ",
      "Đoán đại mà trúng vậy hả? 😅",
    ],
    meh: [
      "Hên xui thôi nha bro 😅",
      "Cũng không quá tệ... cũng không quá tốt",
      "Đoán đại cho có ha",
      "Bình thường thôi má ơi",
    ],
    bad: [
      "Hơi sai rồi đó cha 😬",
      "Bạn ơi, brand này khác cơ",
      "Lệch rồi má ơi",
      "Sai mất tiêu rồi 🙃",
    ],
    awful: [
      "Sai banh nóc luôn 💀",
      "Trật lất rồi má ơi!",
      "Mù màu nhẹ hả bro? 😂",
      "Bay đi đâu vậy ta 🤷",
      "Cái này còn lú hơn mình nữa!",
    ],
  };

  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

  function reactionFor(score) {
    if (score >= 95) return pick(REACTIONS.perfect);
    if (score >= 85) return pick(REACTIONS.great);
    if (score >= 70) return pick(REACTIONS.good);
    if (score >= 50) return pick(REACTIONS.meh);
    if (score >= 25) return pick(REACTIONS.bad);
    return pick(REACTIONS.awful);
  }

  function buildDetails(userHex, brandHex) {
    const [uh, us, ul] = rgbToHsl(hexToRgb(userHex));
    const [bh, bs, bl] = rgbToHsl(hexToRgb(brandHex));
    const hueD = hueCircularDiff(uh, bh);
    const satD = us - bs;
    const lightD = ul - bl;

    const lines = [];

    // Hue
    if (hueD < 8) {
      lines.push("✓ Tông màu chuẩn ghê");
    } else if (hueD < 20) {
      lines.push(`Tông hơi lệch tí (~${Math.round(hueD)}°)`);
    } else if (hueD < 45) {
      lines.push(`Tông lệch rõ rồi nha, đáng ra phải gần ${hueName(bh)} hơn`);
    } else {
      lines.push(`Bay sang tông ${hueName(uh)} mất rồi, brand là ${hueName(bh)} cơ 🙃`);
    }

    // Saturation
    if (Math.abs(satD) >= 8) {
      const word = satD > 0 ? "rực hơn" : "nhạt hơn";
      lines.push(`Bạn chọn ${word} brand ${Math.abs(Math.round(satD))}%`);
    }

    // Lightness
    if (Math.abs(lightD) >= 8) {
      const word = lightD > 0 ? "sáng hơn" : "tối hơn";
      lines.push(`Và ${word} ${Math.abs(Math.round(lightD))}%`);
    }

    return { lines, hueD, satD, lightD };
  }

  // ---------- Public API ----------

  function evaluate(userHex, brandHex) {
    const lab1 = hexToLab(userHex);
    const lab2 = hexToLab(brandHex);
    const de = deltaE00(lab1, lab2);
    const score = scoreFromDeltaE(de);
    const reaction = reactionFor(score);
    const details = buildDetails(userHex, brandHex);

    return {
      score,
      deltaE: de,
      reaction,
      detailLines: details.lines,
      hueDiff: details.hueD,
      satDiff: details.satD,
      lightDiff: details.lightD,
    };
  }

  return { evaluate };
})();
