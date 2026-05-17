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

  // ---------- Feedback Việt hoá ----------
  // REACTIONS: short punchline dưới % (12-16 variants/band → giảm lặp).

  const REACTIONS = {
    perfect: [
      "Đỉnh của chóp! 🏆", "Mắt designer chính hiệu!", "Lú gì đâu mà chuẩn dữ vậy!",
      "Trùm rồi nha bạn!", "Pantone sống hả? 👀", "Pixel-perfect đó nha!",
      "Chuẩn từng nanomet 🔬", "Cái này phải gọi là ám ảnh thị giác!",
      "Designer thứ thiệt rồi!", "Mắt như máy đo màu 🎯",
      "Chuyên gia màu sắc đây rồi!", "Khoẻ vậy bro, sát rạt luôn!",
      "Đo bằng spectrometer cũng vậy thôi!", "Tay nghề Master rồi!",
    ],
    great: [
      "Ngon ngon, sát rồi!", "Gần như chuẩn luôn 👌", "Khá ổn áp đấy chứ!",
      "Cũng có nghề ghê!", "Sát nút rồi nha bạn!", "Một chút nữa là perfect rồi!",
      "Mắt thẩm nhạy thật!", "Chỉ trượt sợi tóc thôi 🪡",
      "Ăn chắc top 10% rồi đó!", "Cao thủ ẩn mình hả? 🥷",
      "Suýt soát thôi, kiểu này dễ gây nghiện!", "Bao designer khóc trong nhà vệ sinh 😭",
      "Mắt nghệ rồi đó!", "Gần lắm gần lắm!",
    ],
    good: [
      "Tạm chấp nhận được ha 😎", "Ổn nhưng chưa đỉnh", "Cũng được, không tệ",
      "Đoán đại mà trúng vậy hả? 😅", "Cũng có chút cảm nhận đó!",
      "Tàm tạm, dạng có thể đào tạo được 📚", "Cơ bản là không sai brand",
      "Hên xui nhưng đúng hướng!", "Pass môn nhưng không học bổng 🎓",
      "Đi đúng hệ nhưng chưa đúng tông", "Nửa mùa thôi nha bạn!",
      "Có khiếu nhưng cần luyện thêm", "Junior level đó 💼",
      "Trúng tướng nhưng không trúng skin",
    ],
    meh: [
      "Hên xui thôi nha bro 😅", "Cũng không quá tệ... cũng không quá tốt",
      "Đoán đại cho có ha", "Bình thường thôi má ơi", "50-50 rồi đó!",
      "Tung đồng xu cũng ra kết quả tương tự 🪙", "Cảm giác như đang đoán bừa",
      "Đúng hệ sai dòng", "Có vẻ mơ hồ ghê 🌫️", "Đoán theo trí nhớ mờ ảo!",
      "Coin flip moment 🎲", "Đúng tinh thần nhưng sai sắc",
      "Tạm bợ cho qua chuyện!", "Mơ hồ kiểu sáng dậy không nhớ tên brand",
    ],
    bad: [
      "Hơi sai rồi đó cha 😬", "Bạn ơi, brand này khác cơ", "Lệch rồi má ơi",
      "Sai mất tiêu rồi 🙃", "Brand này không phải vậy đâu!",
      "Có vẻ confuse với brand khác hả?", "Nhớ nhầm rồi đó 🧠",
      "Đi lạc khá xa rồi nha!", "Sai nhánh rồi bạn ơi!",
      "Phải xem lại logo cũ thôi 🔍", "Đoán theo mood chứ không theo brand!",
      "Bạn chắc đang nghĩ tới brand đối thủ?", "Hơi xa rồi đó, không thể bào chữa nữa!",
    ],
    awful: [
      "Sai banh nóc luôn 💀", "Trật lất rồi má ơi!", "Mù màu nhẹ hả bro? 😂",
      "Bay đi đâu vậy ta 🤷", "Cái này còn lú hơn mình nữa!",
      "Brand nào vậy trời?? 😱", "Đây là sáng tạo lại logo hả?",
      "Tự custom brand mới luôn 🎨💥", "Cách nhau cả vũ trụ rồi!",
      "Mắt đi nghỉ phép rồi à?", "Designer team chắc đang khóc 😢",
      "Đây là chống đối brand luôn rồi!", "Logo này ai cũng nhớ mà ta!",
      "Re-brand luôn cho chắc 🆘",
    ],
  };

  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  function pickN(arr, n) {
    const copy = arr.slice();
    const out = [];
    while (copy.length && out.length < n) {
      out.push(copy.splice(Math.floor(Math.random() * copy.length), 1)[0]);
    }
    return out;
  }

  function reactionFor(score) {
    if (score >= 95) return pick(REACTIONS.perfect);
    if (score >= 85) return pick(REACTIONS.great);
    if (score >= 70) return pick(REACTIONS.good);
    if (score >= 50) return pick(REACTIONS.meh);
    if (score >= 25) return pick(REACTIONS.bad);
    return pick(REACTIONS.awful);
  }

  // ---------- Color theory helpers ----------

  // Hướng lệch hue: cw (clockwise) hoặc ccw — để mô tả "ngả về phía X"
  function hueShiftDirection(uh, bh) {
    let d = (uh - bh + 540) % 360 - 180;  // [-180, 180]
    if (Math.abs(d) < 0.5) return { dir: "none", deg: 0 };
    return { dir: d > 0 ? "cw" : "ccw", deg: Math.abs(d) };
  }

  // Tên hue lân cận trên wheel để mô tả "ngả về phía vàng"
  function neighborHue(h, direction) {
    const offset = direction === "cw" ? 25 : -25;
    return hueName(h + offset);
  }

  // Temperature (warm/cool/neutral) dựa trên hue
  function tempLabel(h) {
    h = ((h % 360) + 360) % 360;
    if (h >= 0   && h < 70)  return "ấm";
    if (h >= 70  && h < 165) return "trung tính (ngả lạnh)";
    if (h >= 165 && h < 260) return "lạnh";
    if (h >= 260 && h < 320) return "trung tính (ngả ấm)";
    return "ấm";
  }

  // Chroma category — màu pastel / mid / vivid
  function chromaTier(s) {
    if (s < 20) return "gần xám";
    if (s < 45) return "pastel/dịu";
    if (s < 70) return "vừa phải";
    if (s < 88) return "rực";
    return "bão hoà tối đa";
  }

  // Value category — màu sáng/tối
  function valueTier(l) {
    if (l < 18) return "rất tối";
    if (l < 35) return "tối";
    if (l < 55) return "mid-tone";
    if (l < 75) return "sáng";
    return "rất sáng";
  }

  // ---------- Feedback xây dựng theo phân tích chuyên môn ----------
  // Mục tiêu: 2 câu/round, mỗi câu là 1 phân tích cụ thể (hue, chroma, value, temperature)
  // dài 15-30 từ, đa biến thể để tránh lặp.

  // ---------- Brand → Industry category ----------
  const BRAND_CATEGORY = {
    "acer": "tech", "dell": "tech", "huawei": "tech", "intel": "tech",
    "lenovo": "tech", "nvidia": "tech", "samsung": "tech", "xiaomi": "tech",

    "ford": "auto", "honda": "auto", "tesla": "auto", "toyota": "auto", "volkswagen": "auto",

    "razer": "gaming", "riot-games": "gaming", "sega": "gaming",

    "netflix": "stream-video", "youtube": "stream-video", "vimeo": "stream-video", "twitch": "stream-video",

    "spotify": "stream-audio", "soundcloud": "stream-audio",

    "facebook": "social", "snapchat": "social", "telegram": "social",
    "whatsapp": "social", "zalo": "social", "reddit": "social",
    "pinterest": "social", "tumblr": "social", "discord": "social",

    "shopee": "ecommerce", "etsy": "ecommerce", "target": "ecommerce",
    "shopify": "ecommerce", "kickstarter": "ecommerce",

    "coca-cola": "food", "mcdonalds": "food", "starbucks": "food",

    "atlassian": "saas", "cloudflare": "saas", "digitalocean": "saas",
    "dropbox": "saas", "hubspot": "saas", "jira": "saas", "mailchimp": "saas",
    "mozilla": "saas", "netlify": "saas", "stack-overflow": "saas",
    "trello": "saas", "wordpress": "saas", "zoom": "saas",

    "behance": "creative", "dribbble": "creative",

    "binance": "finance", "bitcoin": "finance", "coinbase": "finance",
    "paypal": "finance", "stripe": "finance", "visa": "finance",

    "verizon": "telco", "vodafone": "telco",

    "grab": "travel", "airbnb": "travel", "yelp": "travel",

    "android": "os",

    // --- Mở rộng đợt 2 ---
    "puma": "fashion", "new-balance": "fashion", "uniqlo": "fashion",
    "hm": "fashion", "hermes": "fashion",

    "unilever": "fmcg",

    "red-bull": "beverage",

    "kfc": "fastfood", "burger-king": "fastfood",

    "paramount": "entertainment",

    "google": "tech", "lg": "tech", "oppo": "tech", "vivo": "tech",

    "meta": "social",

    "playstation": "gaming",

    "bmw": "auto", "audi": "auto", "hyundai": "auto", "yamaha": "auto",
  };

  // ---------- Industry quips ----------
  // Mỗi category có 4 bucket: match, satOff, lightOff, bothOff. Template dùng placeholder:
  //   {brand} {absSat} {absLight} {sDir} {lDir} {mood}
  const INDUSTRY_QUIPS = {
    tech: {
      match: [
        "Hai chỉ số bám sát brand như case máy {brand} mới khui hộp — bóc seal xong là vào pixel-perfect ngay.",
        "Chroma + value khớp gần như tuyệt đối — kiểu này thì product team {brand} chắc muốn gửi bạn 1 cái invite Beta.",
      ],
      satOff: [
        "Chroma {sDir} {absSat}% — màn hình mà bạn nhìn {brand} chắc chưa được calibrate, hoặc đang bật chế độ \"vivid\" của TV điện máy xanh.",
        "Độ rực lệch {absSat}% — đây là tone {brand} sau khi đi qua một lớp filter quảng cáo lazada flash sale.",
      ],
      lightOff: [
        "Độ sáng {lDir} brand {absLight}% — vibe {brand} chạy trên HDR max chói, hoặc trên cái màn cũ độ nhá đã mệt mỏi.",
        "Lệch {absLight}% ở trục value — kiểu {brand} hiện ra trên một cái màn TN panel góc nhìn lệch.",
      ],
      bothOff: [
        "Bộ đôi lệch {sDir} {absSat}% / {lDir} {absLight}% — mood {mood}, nhìn như {brand} bị chụp screenshot xong qua 3 lần Zalo nén ảnh.",
        "Trượt cả 2 trục — phiên bản {brand} bạn đưa ra giống bản OEM cho thị trường ngách, không phải logo công ty đăng ký bản quyền.",
      ],
    },
    auto: {
      match: [
        "Hai chỉ số khớp như khi đứng trước grille xe {brand} ở showroom điều hoà 22 độ.",
        "Cả chroma lẫn value đều bám brand — fan {brand} chính hiệu, kiểu thuộc đến từng model year.",
      ],
      satOff: [
        "Chroma {sDir} brand {absSat}% — đây là {brand} sau một mùa phơi nắng Sài Gòn, hoặc một lần đi rửa xe ẩu.",
        "Độ rực sai {absSat}% — vibe {brand} của một chiếc xe đã qua 3 chủ và 2 lần sơn dặm.",
      ],
      lightOff: [
        "Trục value lệch {absLight}% ({lDir}) — đây là {brand} dưới đèn pha xe ngược chiều, không phải ban ngày trời quang.",
        "Độ sáng off {absLight}% — kiểu bạn ngó {brand} qua kính phim 90% giữa trưa nắng.",
      ],
      bothOff: [
        "Lệch kép {sDir} {absSat}% và {lDir} {absLight}% — mood {mood}, một chiếc {brand} độ lại theo gu chợ trời quận 5.",
        "Trượt cả 2 trục — đây là {brand} bản refresh chưa kịp duyệt, hoặc một chiếc taxi chạy {brand} 10 năm chưa thay decal.",
      ],
    },
    gaming: {
      match: [
        "Hai chỉ số khớp — chắc setup phòng bạn có ít nhất 3 món gắn LED hệ {brand}.",
        "Chroma + value bám sát — đây là level đã từng cài game của {brand} trong launch day không cần đọc patch note.",
      ],
      satOff: [
        "Chroma {sDir} brand {absSat}% — đây là {brand} dưới ánh LED RGB phòng gaming chứ không phải official press kit.",
        "Độ rực lệch {absSat}% — vibe {brand} đang chạy trong stream của một creator chỉnh saturation +50.",
      ],
      lightOff: [
        "Value lệch {absLight}% ({lDir}) — phiên bản {brand} của bạn xuất hiện ở cảnh boss fight phòng tối, không phải splash screen.",
        "Độ sáng off {absLight}% — đây là {brand} sau 6 tiếng cày game, võng mạc đã bị ám tone phòng tối.",
      ],
      bothOff: [
        "Lệch kép {sDir} {absSat}% / {lDir} {absLight}% — mood {mood}, đây là skin custom mod của một fan trên Nexus chứ không phải IP chính chủ.",
        "Trượt cả 2 trục — phiên bản này nhìn như fanart của {brand} trên DeviantArt thời 2012.",
      ],
    },
    "stream-video": {
      match: [
        "Hai chỉ số khớp — chắc bạn đã pause intro {brand} đủ chậm để đếm cả số khung hình rồi.",
        "Chroma + value bám brand — kiểu người mở app {brand} ngay khi vừa rửa mặt buổi tối.",
      ],
      satOff: [
        "Chroma {sDir} brand {absSat}% — phiên bản {brand} của bạn giống banner autoplay sau khi xem xong 1 series 10 tập.",
        "Độ rực lệch {absSat}% — đây là {brand} trên TV đang bật chế độ \"Movie\" thay vì \"Standard\".",
      ],
      lightOff: [
        "Value lệch {absLight}% ({lDir}) — vibe {brand} trên màn laptop bật night light gần 100%.",
        "Độ sáng off {absLight}% — kiểu mở {brand} lúc tắt đèn, ánh sáng từ TV nhuộm cả tường.",
      ],
      bothOff: [
        "Lệch kép {sDir} {absSat}% / {lDir} {absLight}% — mood {mood}, intro {brand} bị áp nhầm LUT của một phim noir thập niên 70.",
        "Trượt cả 2 trục — đây là {brand} bản người xem ngủ gật 4 tiếng, mở mắt ra ám tone hết.",
      ],
    },
    "stream-audio": {
      match: [
        "Hai chỉ số khớp — Spotify Wrapped của bạn chắc top 0.1% listener của {brand}.",
        "Chroma + value bám sát — kiểu mở app {brand} đầu tiên ngay khi cắm tai nghe.",
      ],
      satOff: [
        "Chroma {sDir} brand {absSat}% — vibe {brand} bị nhuộm theo album cover Lana Del Rey bạn đang nghe.",
        "Độ rực lệch {absSat}% — đây là {brand} ở chế độ Now Playing fullscreen, gradient lan ra tất cả.",
      ],
      lightOff: [
        "Value lệch {absLight}% ({lDir}) — đây là {brand} sau khi bạn nhìn equalizer 2 tiếng, võng mạc đã bị bias.",
        "Độ sáng off {absLight}% — vibe {brand} mở trong chế độ ban đêm, mọi thứ chùng xuống nửa tông.",
      ],
      bothOff: [
        "Lệch kép {sDir} {absSat}% / {lDir} {absLight}% — mood {mood}, {brand} bản remix lofi 24/7 livestream YouTube.",
        "Trượt cả 2 trục — phiên bản này giống cover một podcast indie hơn là app gốc của {brand}.",
      ],
    },
    social: {
      match: [
        "Hai chỉ số khớp — bạn thuộc dạng cầm điện thoại lên là ngón tay tự bay vào icon {brand}.",
        "Chroma + value bám brand — kiểu screen time {brand} của bạn đủ làm hệ điều hành cảnh báo hàng tuần.",
      ],
      satOff: [
        "Chroma {sDir} brand {absSat}% — đây là {brand} qua icon notification chứ không phải splash screen brand book.",
        "Độ rực lệch {absSat}% — vibe {brand} của một video reup nén qua 3 lần upload.",
      ],
      lightOff: [
        "Value lệch {absLight}% ({lDir}) — đây là {brand} ở status bar điện thoại giữa nắng trưa đường Nguyễn Huệ.",
        "Độ sáng off {absLight}% — vibe {brand} bật dark mode 2 tuần liên tục, não quen tone rồi.",
      ],
      bothOff: [
        "Lệch kép {sDir} {absSat}% / {lDir} {absLight}% — mood {mood}, kiểu rebrand leak trên Twitter trước khi PR official.",
        "Trượt cả 2 trục — phiên bản này hợp với một story TikTok 3 giây hơn là logo chính chủ {brand}.",
      ],
    },
    ecommerce: {
      match: [
        "Hai chỉ số khớp — bạn thuộc tệp khách đã thả vào giỏ hàng {brand} đủ một căn hộ đầy đồ.",
        "Chroma + value bám sát — level người không bỏ sót một đêm 9.9 nào của {brand} suốt 5 năm.",
      ],
      satOff: [
        "Chroma {sDir} brand {absSat}% — đây là {brand} qua banner flash sale lúc 0h, gradient lập loè mời mọc.",
        "Độ rực lệch {absSat}% — vibe {brand} dưới ring light KOC livestream review combo 9 món.",
      ],
      lightOff: [
        "Value lệch {absLight}% ({lDir}) — phiên bản {brand} trong kho hàng buổi sáng sớm khi mới bật một bóng đèn vàng.",
        "Độ sáng off {absLight}% — đây là {brand} qua pop-up giảm giá nhấp nháy giữa lúc bạn đang định thoát app.",
      ],
      bothOff: [
        "Lệch kép {sDir} {absSat}% / {lDir} {absLight}% — mood {mood}, banner Tết {brand} làm vội bởi shop nhỏ chứ không phải team brand.",
        "Trượt cả 2 trục — đây là {brand} phiên bản shop fake bán hàng Quảng Châu, logo có mà font sai hết.",
      ],
    },
    food: {
      match: [
        "Hai chỉ số khớp — bạn thuộc menu {brand} đến mức nhân viên còn chưa kịp hỏi đã biết bạn order gì.",
        "Chroma + value bám brand — level người vẫn còn nhớ giá combo {brand} 10 năm trước.",
      ],
      satOff: [
        "Chroma {sDir} brand {absSat}% — phiên bản {brand} qua billboard ngoài trời phơi qua 3 mùa mưa nắng.",
        "Độ rực lệch {absSat}% — vibe {brand} của một flyer phát ngã tư ngấm mồ hôi.",
      ],
      lightOff: [
        "Value lệch {absLight}% ({lDir}) — đây là {brand} qua biển hiệu cửa hàng bật neon lúc 11h khuya.",
        "Độ sáng off {absLight}% — vibe {brand} trên thực đơn ép plastic đã bị ố vàng.",
      ],
      bothOff: [
        "Lệch kép {sDir} {absSat}% / {lDir} {absLight}% — mood {mood}, một chi nhánh {brand} ở tỉnh chưa kịp brand-check năm nay.",
        "Trượt cả 2 trục — đây là {brand} bản giống một quán đặt tên gần giống bán đồ na ná ở chợ đêm.",
      ],
    },
    saas: {
      match: [
        "Hai chỉ số khớp — bạn mở {brand} mỗi ngày như uống nước, đến mức favicon in vào võng mạc rồi.",
        "Chroma + value bám brand — level đã từng tự custom theme {brand} bằng userstyle.",
      ],
      satOff: [
        "Chroma {sDir} brand {absSat}% — đây là {brand} thu nhỏ thành favicon tab Chrome lúc bạn mở 47 tab.",
        "Độ rực lệch {absSat}% — vibe {brand} của một dashboard chế độ compact, mọi thứ teo lại 60%.",
      ],
      lightOff: [
        "Value lệch {absLight}% ({lDir}) — phiên bản {brand} qua VS Code theme Dracula bật 14 tiếng/ngày.",
        "Độ sáng off {absLight}% — đây là {brand} trên màn coding lúc 2h sáng deadline.",
      ],
      bothOff: [
        "Lệch kép {sDir} {absSat}% / {lDir} {absLight}% — mood {mood}, {brand} sau khi user cài Dark Reader rồi nhớ nhầm bản gốc.",
        "Trượt cả 2 trục — phiên bản {brand} bạn vừa render giống một skin Stylus tự custom hơn là UI official.",
      ],
    },
    creative: {
      match: [
        "Hai chỉ số khớp — designer thứ thiệt, hoặc ít nhất là người check {brand} trước cả khi check inbox.",
        "Chroma + value bám brand — level người đã từng upload portfolio lên {brand} và bị từ chối phần \"work history\".",
      ],
      satOff: [
        "Chroma {sDir} brand {absSat}% — kiểu này client của bạn sẽ reply email \"em xem lại tone giúp anh nhé\".",
        "Độ rực lệch {absSat}% — đây là {brand} dưới một gradient overlay style featured shot ngàn like.",
      ],
      lightOff: [
        "Value lệch {absLight}% ({lDir}) — phiên bản {brand} qua moodboard có overlay 40% navy ở trên cùng.",
        "Độ sáng off {absLight}% — vibe {brand} chụp screenshot trong dark mode rồi paste vào Figma frame trắng.",
      ],
      bothOff: [
        "Lệch kép {sDir} {absSat}% / {lDir} {absLight}% — mood {mood}, một \"unofficial rebrand\" trên Dribbble tag #conceptual.",
        "Trượt cả 2 trục — phiên bản này nhìn như một bài kiểm tra tốt nghiệp ngành Graphic Design, không phải brand thật.",
      ],
    },
    finance: {
      match: [
        "Hai chỉ số khớp — bạn thuộc tệp người mở app {brand} trước cả khi chải răng buổi sáng.",
        "Chroma + value bám sát — level người đã chụp screenshot portfolio {brand} khoe story Instagram.",
      ],
      satOff: [
        "Chroma {sDir} brand {absSat}% — vibe {brand} của một ngày market đỏ rực toàn candle long.",
        "Độ rực lệch {absSat}% — đây là {brand} sau một tuần FOMO, võng mạc bạn đã bị ám tone bull market.",
      ],
      lightOff: [
        "Value lệch {absLight}% ({lDir}) — phiên bản {brand} của bạn ở chế độ dark mode app banking lúc 3h sáng check tỉ giá.",
        "Độ sáng off {absLight}% — đây là {brand} qua màn hình điện thoại lúc trader đang trade trên giường, một mí mắt đã sụp.",
      ],
      bothOff: [
        "Lệch kép {sDir} {absSat}% / {lDir} {absLight}% — mood {mood}, {brand} sau một đêm flash crash, ai cũng ám tone hết.",
        "Trượt cả 2 trục — phiên bản {brand} của bạn giống screenshot một app scam được share trên Telegram group hơn là brand thật.",
      ],
    },
    telco: {
      match: [
        "Hai chỉ số khớp — bạn xài SIM {brand} đủ lâu để biết tổng đài tự động đọc câu nào nhanh câu nào chậm.",
        "Chroma + value bám sát — level đã trả hoá đơn {brand} đủ 60 tháng liên tục, status loyal.",
      ],
      satOff: [
        "Chroma {sDir} brand {absSat}% — đây là {brand} qua tem dán SIM card đã đi qua 3 lần đổi máy.",
        "Độ rực lệch {absSat}% — vibe {brand} của một biển hiệu cửa hàng đại lý cấp 3 ngoài tỉnh.",
      ],
      lightOff: [
        "Value lệch {absLight}% ({lDir}) — phiên bản {brand} dưới biển hiệu bật đèn LED trắng quá tay.",
        "Độ sáng off {absLight}% — đây là {brand} qua tờ rơi gói cước in trên máy đời cũ, mực đã hơi nhạt.",
      ],
      bothOff: [
        "Lệch kép {sDir} {absSat}% / {lDir} {absLight}% — mood {mood}, {brand} bản tỉnh chưa kịp cập nhật brand guideline 2 phiên bản.",
        "Trượt cả 2 trục — phiên bản này nhìn như một quầy bán SIM trong nhà chờ xe khách, không phải store {brand} chuẩn.",
      ],
    },
    travel: {
      match: [
        "Hai chỉ số khớp — bạn book {brand} đủ chuyến để được hệ thống tự upgrade VIP mà không cần đăng ký.",
        "Chroma + value bám sát — level người để lại review 5 sao kèm 4 ảnh cho mỗi tài xế {brand}.",
      ],
      satOff: [
        "Chroma {sDir} brand {absSat}% — đây là {brand} qua áo đồng phục shipper sau ca giao 8 tiếng nắng gắt.",
        "Độ rực lệch {absSat}% — vibe {brand} của sticker dán trên xe đối tác chạy app, không phải app icon official.",
      ],
      lightOff: [
        "Value lệch {absLight}% ({lDir}) — phiên bản {brand} qua đèn báo trước cửa hàng đối tác buổi tối.",
        "Độ sáng off {absLight}% — đây là {brand} ở chế độ in-app khi bạn đặt xe đêm 2h sáng về nhà.",
      ],
      bothOff: [
        "Lệch kép {sDir} {absSat}% / {lDir} {absLight}% — mood {mood}, một chi nhánh {brand} ở tỉnh lẻ chưa được brand refresh từ hồi mới ra mắt.",
        "Trượt cả 2 trục — phiên bản {brand} của bạn giống giấc mơ về chuyến đi bạn book nháp xong huỷ.",
      ],
    },
    fashion: {
      match: [
        "Hai chỉ số khớp — bạn thuộc dạng đã thử áo {brand} đủ size để biết size nào đẹp khi mặc cao ngang đầu gối.",
        "Chroma + value bám brand — level người đã so giá {brand} giữa outlet, store chính, và Vinted.",
      ],
      satOff: [
        "Chroma {sDir} brand {absSat}% — đây là {brand} qua áo seasonal sale đã giặt 30 lần, không phải look runway.",
        "Độ rực lệch {absSat}% — vibe {brand} của một campaign capsule chỉ chạy ở Trung Đông, không có ở Việt Nam.",
      ],
      lightOff: [
        "Value lệch {absLight}% ({lDir}) — phiên bản {brand} qua biển hiệu store buổi tối ánh đèn warm 2700K.",
        "Độ sáng off {absLight}% — đây là {brand} qua một lookbook chụp golden hour ở Lisbon, lệch hết bias.",
      ],
      bothOff: [
        "Lệch kép {sDir} {absSat}% / {lDir} {absLight}% — mood {mood}, đây là {brand} bản chợ Bến Thành, font giống mà tone bay xa.",
        "Trượt cả 2 trục — phiên bản này hợp với một streetwear no-name copy lại form hơn là {brand} chính chủ.",
      ],
    },
    cosmetics: {
      match: [
        "Hai chỉ số khớp — bạn thuộc dạng đứng trước counter {brand} đủ lâu để được SA hỏi \"chị làm da lâu chưa\".",
        "Chroma + value bám brand — level người đã collect đủ travel-size {brand} qua các chuyến công tác.",
      ],
      satOff: [
        "Chroma {sDir} brand {absSat}% — đây là {brand} qua một video review của beauty blogger filter Lightroom preset Pink Glow.",
        "Độ rực lệch {absSat}% — vibe {brand} của hộp packaging đã ở trên kệ counter dưới đèn LED 6 tháng.",
      ],
      lightOff: [
        "Value lệch {absLight}% ({lDir}) — phiên bản {brand} qua một TVC quay studio ánh sáng beauty trắng pure.",
        "Độ sáng off {absLight}% — đây là {brand} ở hộp đã bóc xài dở, bao bì hơi nhăn so với vỏ chưa khui.",
      ],
      bothOff: [
        "Lệch kép {sDir} {absSat}% / {lDir} {absLight}% — mood {mood}, đây là {brand} dupe Trung Quốc bán livestream Shopee 199k freeship.",
        "Trượt cả 2 trục — phiên bản này nhìn như {brand} bị fake bằng cách scan vỏ thật rồi in lại không đúng giấy.",
      ],
    },
    fmcg: {
      match: [
        "Hai chỉ số khớp — bạn đẩy xe siêu thị quẹo đúng kệ {brand} mà không cần ngẩng đầu nhìn bảng hướng dẫn.",
        "Chroma + value bám brand — level người thuộc luôn cả mã barcode {brand} sau 10 năm đi chợ.",
      ],
      satOff: [
        "Chroma {sDir} brand {absSat}% — đây là {brand} qua bao bì để gần cửa sổ nhà bếp phai nắng 2 mùa.",
        "Độ rực lệch {absSat}% — vibe {brand} của TVC chiếu giờ vàng VTV3 nén bitrate xuống còn 480p.",
      ],
      lightOff: [
        "Value lệch {absLight}% ({lDir}) — phiên bản {brand} dưới ánh đèn vàng siêu thị mini lúc 21h.",
        "Độ sáng off {absLight}% — đây là {brand} qua poster dán cửa tạp hoá ngoài nắng đường nội đô.",
      ],
      bothOff: [
        "Lệch kép {sDir} {absSat}% / {lDir} {absLight}% — mood {mood}, một bản OEM gia công cho thị trường ngách, logo có mà tone trật bài.",
        "Trượt cả 2 trục — phiên bản này nhìn như hàng cận date dồn vào rổ \"đại hạ giá\" cuối kệ.",
      ],
    },
    beverage: {
      match: [
        "Hai chỉ số khớp — bạn đã cụng lon {brand} đủ nhiều để mở mắt khuya là biết tone đỏ/xanh trên thân lon.",
        "Chroma + value bám brand — level người thuộc đủ flavor mở rộng của {brand}, kể cả bản limited Tết.",
      ],
      satOff: [
        "Chroma {sDir} brand {absSat}% — đây là {brand} qua lon trên bàn nhậu vỉa hè quận 4 giữa trưa nắng.",
        "Độ rực lệch {absSat}% — vibe {brand} dưới ánh đèn vàng tủ lạnh tạp hoá, mọi thứ ám sang một tông.",
      ],
      lightOff: [
        "Value lệch {absLight}% ({lDir}) — phiên bản {brand} qua billboard bật đèn nền buổi tối phố Bùi Viện.",
        "Độ sáng off {absLight}% — đây là {brand} chiết ra ly bia trên bàn nhậu, không còn nguyên packaging lon.",
      ],
      bothOff: [
        "Lệch kép {sDir} {absSat}% / {lDir} {absLight}% — mood {mood}, {brand} bản đặc biệt cho thị trường tỉnh, mọi thứ đậm hơn cho hợp gu địa phương.",
        "Trượt cả 2 trục — phiên bản này nhìn như nhãn bia hơi vỉa hè in lại bằng máy mực đời cũ, không phải brand quốc tế.",
      ],
    },
    fastfood: {
      match: [
        "Hai chỉ số khớp — bạn thuộc menu {brand} hơn thuộc lịch họp công ty, order khỏi cần app.",
        "Chroma + value bám brand — level người đã ăn {brand} đủ để hiểu cake nào hot, cake nào đáng tránh.",
      ],
      satOff: [
        "Chroma {sDir} brand {absSat}% — đây là {brand} qua biển hiệu cửa hàng đã phơi nắng 5 mùa hè ở mặt tiền quận 1.",
        "Độ rực lệch {absSat}% — vibe {brand} của bao bì hộp burger đã ngấm dầu cheese sốt salsa.",
      ],
      lightOff: [
        "Value lệch {absLight}% ({lDir}) — phiên bản {brand} qua biển bật đèn neon 11h đêm sau giờ làm về muộn.",
        "Độ sáng off {absLight}% — đây là {brand} trong app order ở chế độ dark, mọi thứ trầm hơn nửa tông.",
      ],
      bothOff: [
        "Lệch kép {sDir} {absSat}% / {lDir} {absLight}% — mood {mood}, một quán nhượng quyền cấp 3 ở tỉnh chưa được audit brand năm nay.",
        "Trượt cả 2 trục — phiên bản này nhìn như một quán đặt tên na ná {brand}, font ăn theo nhưng tone không vượt qua được vòng QC.",
      ],
    },
    entertainment: {
      match: [
        "Hai chỉ số khớp — bạn thuộc intro studio {brand} kèm cả nốt nhạc opening, level true fan.",
        "Chroma + value bám brand — level người đã ngồi đợi hết credit chỉ để bắt post-credit scene của {brand}.",
      ],
      satOff: [
        "Chroma {sDir} brand {absSat}% — đây là {brand} qua poster phim treo rạp đã 3 mùa chưa thay khung.",
        "Độ rực lệch {absSat}% — vibe {brand} ở bản chiếu HBO/Netflix bị nén bitrate xuống còn 720p mid-night.",
      ],
      lightOff: [
        "Value lệch {absLight}% ({lDir}) — phiên bản {brand} ở intro phim chiếu trong rạp tối đen lúc đèn vừa tắt.",
        "Độ sáng off {absLight}% — đây là {brand} ở poster bị ám đèn vàng hành lang rạp, không còn đúng tone press kit.",
      ],
      bothOff: [
        "Lệch kép {sDir} {absSat}% / {lDir} {absLight}% — mood {mood}, {brand} bản re-issue DVD bán chợ trời 50k 3 đĩa.",
        "Trượt cả 2 trục — phiên bản này hợp với poster fan-made bootleg trên Etsy hơn là asset official của {brand}.",
      ],
    },
    retail: {
      match: [
        "Hai chỉ số khớp — bạn ghé {brand} đủ nhiều để biết quầy nào hay xếp hàng, quầy nào trống chiều thứ ba.",
        "Chroma + value bám brand — level người thuộc layout từng kệ {brand} hơn cả nhân viên mới onboard.",
      ],
      satOff: [
        "Chroma {sDir} brand {absSat}% — đây là {brand} qua túi nilon đem về xài đi xài lại đến lần thứ 5.",
        "Độ rực lệch {absSat}% — vibe {brand} qua poster quảng cáo trong nhà chờ xe buýt giữa trưa nắng.",
      ],
      lightOff: [
        "Value lệch {absLight}% ({lDir}) — phiên bản {brand} qua biển hiệu bật đèn neon buổi tối ngã tư.",
        "Độ sáng off {absLight}% — đây là {brand} ở bill in giấy nhiệt đã bay màu nằm dưới đáy ví 6 tháng.",
      ],
      bothOff: [
        "Lệch kép {sDir} {absSat}% / {lDir} {absLight}% — mood {mood}, {brand} chi nhánh tỉnh chưa được refresh brand identity từ hồi khai trương.",
        "Trượt cả 2 trục — phiên bản này nhìn như một cửa hàng nhái treo biển gần giống, khác font khác tone nhưng vẫn lừa được khách vãng lai.",
      ],
    },
    os: {
      match: [
        "Hai chỉ số khớp — bạn cầm điện thoại {brand} đủ lâu để mò ra cả setting ẩn không có trong tutorial.",
        "Chroma + value bám brand — power user thực thụ, thuộc cả màu của boot screen lẫn animation fingerprint.",
      ],
      satOff: [
        "Chroma {sDir} brand {absSat}% — đây là {brand} qua icon launcher tự custom theme \"Neon\" trên Play Store.",
        "Độ rực lệch {absSat}% — vibe {brand} của một version cũ 2 đời, trước khi hãng refresh palette.",
      ],
      lightOff: [
        "Value lệch {absLight}% ({lDir}) — phiên bản {brand} qua wallpaper dark mode mặc định lúc Always-On.",
        "Độ sáng off {absLight}% — đây là {brand} trên màn điện thoại bị auto-brightness giảm còn 20% giữa rạp tối.",
      ],
      bothOff: [
        "Lệch kép {sDir} {absSat}% / {lDir} {absLight}% — mood {mood}, một bản custom ROM cộng đồng modder XDA tự build.",
        "Trượt cả 2 trục — phiên bản này nhìn như một fork community của {brand} chứ không phải bản gốc do team hãng release.",
      ],
    },
  };

  // Generic fallback nếu brand không có category
  const GENERIC_QUIPS = {
    match: [
      "Chroma + value khớp gần như tuyệt đối — bạn pick trọn gói, không sót trục nào.",
      "Cả độ rực lẫn độ sáng đều bám brand — bonus point cho memory trọn vẹn.",
      "Hai chỉ số chỉ chênh vài % — kiểu này thì designer khó tính cũng phải gật đầu.",
    ],
    satOff: [
      "Value OK, mỗi tội chroma {sDir} {absSat}% — kiểu đúng tông nhưng đẩy slider rực/nhạt quá tay.",
      "Sai mỗi trục chroma {absSat}% ({sDir}) — phần còn lại ngon, gần như chỉ thiếu một tép \"saturate\".",
      "Độ sáng đạt, chroma off {absSat}% — bạn đi đúng nhánh hue, chỉ là volume hơi sai.",
    ],
    lightOff: [
      "Chroma chuẩn, value bạn pick {lDir} brand {absLight}% — có vẻ bối cảnh ánh sáng trong đầu khác bối cảnh brand book.",
      "Sai mỗi trục value ({lDir} {absLight}%) — vibe đúng, chỉ là một mí mắt thiếu/thừa ánh sáng.",
      "Trục chroma chính xác, value lệch {absLight}% — kiểu pick đúng nhưng đèn studio khác hôm chụp brand.",
    ],
    bothOff: [
      "Lệch kép {sDir} {absSat}% / {lDir} {absLight}% — mood {mood}, không còn đúng khí chất brand gốc.",
      "Trượt cả 2 trục: {sDir} {absSat}%, {lDir} {absLight}% — màu bạn pick cho mood {mood}, brand thì không như vậy.",
      "Hai trục đều off — phiên bản này hợp với mood {mood} hơn là tinh thần brand thật.",
    ],
  };

  function fillTemplate(tpl, vars) {
    return tpl.replace(/\{(\w+)\}/g, (_, k) => (k in vars ? vars[k] : "{" + k + "}"));
  }

  function buildDetails(userHex, brandHex, brand) {
    const [uh, us, ul] = rgbToHsl(hexToRgb(userHex));
    const [bh, bs, bl] = rgbToHsl(hexToRgb(brandHex));
    const hueD = hueCircularDiff(uh, bh);
    const satD = us - bs;
    const lightD = ul - bl;
    const shift = hueShiftDirection(uh, bh);

    const uName = hueName(uh), bName = hueName(bh);
    const uChroma = chromaTier(us), bChroma = chromaTier(bs);
    const uValue = valueTier(ul), bValue = valueTier(bl);
    const uTemp = tempLabel(uh), bTemp = tempLabel(bh);

    // -------- Câu 1: HUE analysis --------
    const hueLines = [];

    if (hueD < 5) {
      hueLines.push(
        `Hue gần như khớp tuyệt đối — sai số chỉ ${hueD.toFixed(1)}° trên vòng hue 360°, mức mà ngay cả các tool calibrate màu chuyên dụng cũng coi là "match".`,
        `Tông màu rơi đúng vào dải ${bName} của brand với độ lệch dưới 5° — tức là ở khoảng mà mắt người bình thường gần như không phân biệt được khác biệt.`,
        `Bạn neo đúng centroid hue của brand (chênh ${hueD.toFixed(1)}°), cho thấy não đã ghi nhớ vị trí chính xác của màu này trên color wheel.`,
      );
    } else if (hueD < 12) {
      const dirText = shift.dir === "cw" ? `ngả nhẹ về phía ${neighborHue(bh, "cw")}` : `ngả nhẹ về phía ${neighborHue(bh, "ccw")}`;
      hueLines.push(
        `Hue lệch ~${Math.round(hueD)}° — bạn đang ${dirText} so với ${bName} chuẩn của brand. Đây là sai số rất nhỏ, gần ngưỡng JND (Just-Noticeable Difference) khoảng 10° trên hue wheel.`,
        `Tông nằm cùng họ ${bName} nhưng bị kéo ${dirText} một chút. Trong workflow thực tế, sai số ${Math.round(hueD)}° vẫn nằm trong dung sai của hầu hết spec brand guideline.`,
        `Bạn chọn cùng nhánh ${bName} với brand, nhưng dịch ${Math.round(hueD)}° (${dirText}) — đủ để designer khó tính nhận ra trên monitor calibrate, nhưng người dùng đại trà sẽ không phân biệt.`,
      );
    } else if (hueD < 25) {
      const dirText = shift.dir === "cw" ? neighborHue(bh, "cw") : neighborHue(bh, "ccw");
      hueLines.push(
        `Hue lệch ${Math.round(hueD)}° về phía ${dirText} — đã vượt ngưỡng JND, mắt thường có thể nhận ra hai màu thuộc hai "tâm" khác nhau dù vẫn cùng họ.`,
        `Bạn chọn một biến thể ${uName} pha ${dirText}, trong khi brand neo ở ${bName} thuần. Độ lệch ${Math.round(hueD)}° thường bị bắt lỗi trong quy trình QA màu in.`,
        `Tông bị "drift" ${Math.round(hueD)}° sang ${dirText} — đây là lỗi phổ biến khi não nhớ màu theo cảm giác (warm/cool) thay vì hue chính xác.`,
      );
    } else if (hueD < 50) {
      hueLines.push(
        `Hue lệch ${Math.round(hueD)}° — bạn đã chuyển sang nhánh ${uName}, trong khi brand thuộc nhánh ${bName}. Khoảng cách này tương đương việc nhầm "đỏ-cam" với "vàng" trên color wheel.`,
        `Bạn rẽ hướng sang ${uName} (chênh ${Math.round(hueD)}° so với ${bName} của brand) — đây là sai số đủ lớn để branding team yêu cầu chỉnh sửa nếu xuất hiện trong asset chính thức.`,
        `Cách brand color tới ${Math.round(hueD)}° trên hue wheel: brand neo ở ${bName}, bạn pick ở vùng ${uName}. Có thể bạn nhớ logo qua màu của campaign cũ thay vì palette hiện tại.`,
      );
    } else if (hueD < 90) {
      hueLines.push(
        `Hue lệch tới ${Math.round(hueD)}° — bạn chọn ${uName}, brand là ${bName}. Hai màu này thuộc hai phía khác nhau của color wheel và cho cảm giác hoàn toàn khác về temperature.`,
        `Khoảng cách hue ${Math.round(hueD)}° là rất lớn — gần với mức "complementary mismatch" (~120°). Khả năng cao bạn đang lẫn brand này với một brand khác có palette gần giống.`,
        `Bạn rời hẳn vùng ${bName} của brand sang vùng ${uName}. Lệch ${Math.round(hueD)}° thường xảy ra khi trí nhớ thị giác mã hoá màu theo "mood" thay vì hue cụ thể.`,
      );
    } else {
      hueLines.push(
        `Hue lệch ${Math.round(hueD)}° — gần như đối nghịch trên color wheel. Bạn chọn ${uName} (temperature: ${uTemp}), brand thuộc ${bName} (temperature: ${bTemp}).`,
        `Cách brand ${Math.round(hueD)}° là khoảng tương đương đối lập màu (complementary range). Đây không phải sai số nhớ — đây là confuse hoàn toàn với brand khác.`,
        `Bạn pick ở phía ${uTemp} của wheel, brand neo ở phía ${bTemp} — lệch ${Math.round(hueD)}°, tương đương việc trả lời "đỏ" khi đáp án là "xanh dương".`,
      );
    }

    // -------- Câu 2: Quip theo INDUSTRY của brand --------
    const absSat = Math.abs(satD), absLight = Math.abs(lightD);
    const sDir = satD > 0 ? "rực hơn" : "nhạt hơn";
    const lDir = lightD > 0 ? "sáng hơn" : "tối hơn";
    const mood = describeMood(us, ul, bs, bl);

    let bucket;
    if (absSat < 6 && absLight < 6) bucket = "match";
    else if (absSat < 6)            bucket = "lightOff";
    else if (absLight < 6)          bucket = "satOff";
    else                             bucket = "bothOff";

    const cat = brand && brand.id ? BRAND_CATEGORY[brand.id] : null;
    const pool = (cat && INDUSTRY_QUIPS[cat] && INDUSTRY_QUIPS[cat][bucket]) || GENERIC_QUIPS[bucket];

    const vars = {
      brand: (brand && brand.name) || "brand",
      absSat: Math.round(absSat),
      absLight: Math.round(absLight),
      sDir, lDir, mood,
    };
    const line2 = fillTemplate(pick(pool), vars);
    const line1 = pick(hueLines);

    return { lines: [line1, line2], hueD, satD, lightD };
  }

  function describeMood(us, ul, bs, bl) {
    const satD = us - bs, lightD = ul - bl;
    if (satD > 0 && lightD > 0)  return "neon party — vibe quảng cáo nước tăng lực";
    if (satD > 0 && lightD < 0)  return "đậm và ngầu — vibe poster rock thập niên 80";
    if (satD < 0 && lightD > 0)  return "pastel nhẹ — vibe quán cà phê wellness";
    if (satD < 0 && lightD < 0)  return "trầm và xỉn — vibe vintage hơi buồn ngủ";
    if (satD > 0)                return "đậm hơn brand";
    if (satD < 0)                return "nhạt hơn brand";
    if (lightD > 0)              return "sáng hơn brand";
    return "tối hơn brand";
  }

  // ---------- Public API ----------

  function evaluate(userHex, brandHex, brand) {
    const lab1 = hexToLab(userHex);
    const lab2 = hexToLab(brandHex);
    const de = deltaE00(lab1, lab2);
    const score = scoreFromDeltaE(de);
    const reaction = reactionFor(score);
    const details = buildDetails(userHex, brandHex, brand);

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
