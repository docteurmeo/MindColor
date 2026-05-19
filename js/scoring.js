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
        "Hai chỉ số khớp — chắc setup phòng bạn có ít nhất 3 món gắn LED ăn theo hệ {brand}.",
        "Chroma + value bám sát — level cày game {brand} từ ngày ra mắt không cần đọc patch note hỏi bạn bè.",
      ],
      satOff: [
        "Chroma {sDir} brand {absSat}% — đây là {brand} dưới ánh LED RGB phòng gaming chứ không phải press kit chuẩn.",
        "Độ rực lệch {absSat}% — vibe {brand} trong stream của creator chỉnh saturation lên cho lung linh.",
      ],
      lightOff: [
        "Value lệch {absLight}% ({lDir}) — phiên bản {brand} ở cảnh boss fight phòng tối, không phải splash screen sáng.",
        "Độ sáng off {absLight}% — đây là {brand} sau 6 tiếng cày game khuya, mắt đã bị ám tone phòng tối.",
      ],
      bothOff: [
        "Lệch kép {sDir} {absSat}% / {lDir} {absLight}% — mood {mood}, đây là skin mod fan-made chứ không phải IP chính chủ.",
        "Trượt cả 2 trục — phiên bản này nhìn như fanart cộng đồng vẽ lại {brand}, không phải art chính thức.",
      ],
    },
    "stream-video": {
      match: [
        "Hai chỉ số khớp — bạn thuộc dạng cuối ngày mở {brand} lên là phản xạ, không cần đắn đo coi gì.",
        "Chroma + value bám brand — chắc tài khoản {brand} bạn xem đủ phim để 'because you watched' luôn đúng gu.",
      ],
      satOff: [
        "Chroma {sDir} brand {absSat}% — phiên bản {brand} qua banner autoplay sau khi xem xong cả series 10 tập liền.",
        "Độ rực lệch {absSat}% — đây là {brand} trên TV bật chế độ 'Movie' hoặc 'Vivid' chứ không phải mặc định.",
      ],
      lightOff: [
        "Value lệch {absLight}% ({lDir}) — vibe {brand} trên laptop bật night light gần 100% lúc cày phim khuya.",
        "Độ sáng off {absLight}% — kiểu mở {brand} lúc tắt đèn phòng, ánh sáng từ TV hắt lên tường nhuộm tone.",
      ],
      bothOff: [
        "Lệch kép {sDir} {absSat}% / {lDir} {absLight}% — mood {mood}, intro {brand} qua bản phim tải lậu chất lượng 480p.",
        "Trượt cả 2 trục — đây là {brand} bản người xem ngủ gật 4 tiếng, mở mắt ra tone ám hết.",
      ],
    },
    "stream-audio": {
      match: [
        "Hai chỉ số khớp — bạn mở {brand} đầu tiên ngay khi vừa cắm tai nghe lên xe.",
        "Chroma + value bám sát — chắc Wrapped cuối năm của bạn đứng top fan của vài nghệ sĩ trên {brand}.",
      ],
      satOff: [
        "Chroma {sDir} brand {absSat}% — vibe {brand} bị nhuộm theo cover album bạn đang nghe lúc đó.",
        "Độ rực lệch {absSat}% — đây là {brand} ở chế độ phát toàn màn hình, gradient lan ra ám hết.",
      ],
      lightOff: [
        "Value lệch {absLight}% ({lDir}) — đây là {brand} qua màn điện thoại chế độ ban đêm, mọi thứ chùng xuống.",
        "Độ sáng off {absLight}% — vibe {brand} mở trong widget khóa màn hình lúc nghe nhạc trên giường.",
      ],
      bothOff: [
        "Lệch kép {sDir} {absSat}% / {lDir} {absLight}% — mood {mood}, {brand} bản share trên story bị Instagram nén tone.",
        "Trượt cả 2 trục — phiên bản này nhìn như icon app reup ở store giả lập hơn là app chính chủ.",
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
        "Hai chỉ số khớp — bạn mở {brand} mỗi ngày đủ để biết icon nằm chính giữa hay lệch phải trên thanh tab.",
        "Chroma + value bám sát — level dân văn phòng thật sự, mở {brand} là phản xạ chứ không cần nghĩ.",
      ],
      satOff: [
        "Chroma {sDir} brand {absSat}% — đây là {brand} thu nhỏ thành favicon tab trình duyệt lúc bạn mở cả chục tab.",
        "Độ rực lệch {absSat}% — vibe {brand} qua ảnh chụp màn hình share team Zalo đã nén bitrate.",
      ],
      lightOff: [
        "Value lệch {absLight}% ({lDir}) — phiên bản {brand} qua màn hình laptop chế độ dark mode lúc làm muộn.",
        "Độ sáng off {absLight}% — đây là {brand} trên màn dim 30% khi bạn họp xong tắt đèn nghỉ giải lao.",
      ],
      bothOff: [
        "Lệch kép {sDir} {absSat}% / {lDir} {absLight}% — mood {mood}, {brand} qua một bản tutorial cũ chụp 4 năm trước.",
        "Trượt cả 2 trục — phiên bản này giống một extension bên thứ ba đổi theme hơn là giao diện chính chủ {brand}.",
      ],
    },
    creative: {
      match: [
        "Hai chỉ số khớp — designer thứ thiệt, hoặc ít nhất là người mở {brand} mỗi ngày để xem inspiration.",
        "Chroma + value bám brand — level người đã từng up portfolio lên {brand} và biết feed home hôm nay đang hot tone gì.",
      ],
      satOff: [
        "Chroma {sDir} brand {absSat}% — kiểu này sếp sẽ reply \"em xem lại tone giúp anh nhé\" trên Zalo.",
        "Độ rực lệch {absSat}% — đây là {brand} sau khi bạn pass qua một filter Instagram trước khi đăng story.",
      ],
      lightOff: [
        "Value lệch {absLight}% ({lDir}) — phiên bản {brand} qua màn Macbook chỉnh độ sáng 40% trong phòng tối.",
        "Độ sáng off {absLight}% — vibe {brand} chụp screenshot trong dark mode rồi paste lên slide nền trắng.",
      ],
      bothOff: [
        "Lệch kép {sDir} {absSat}% / {lDir} {absLight}% — mood {mood}, một bản rebrand nháp của fresher chưa qua review của sếp.",
        "Trượt cả 2 trục — phiên bản này nhìn như bài tập trên trường, chưa đạt chuẩn brand thật.",
      ],
    },
    finance: {
      match: [
        "Hai chỉ số khớp — bạn thuộc dạng nhớ rõ thẻ {brand} của mình mặt trước in màu gì.",
        "Chroma + value bám sát — chắc bạn quẹt {brand} đủ nhiều để nhớ luôn cả font số trên thẻ.",
      ],
      satOff: [
        "Chroma {sDir} brand {absSat}% — vibe {brand} qua banner quảng cáo ở quầy ATM nắng chiếu xiên.",
        "Độ rực lệch {absSat}% — đây là {brand} qua biển hiệu chi nhánh ngân hàng đã treo 5 năm chưa thay.",
      ],
      lightOff: [
        "Value lệch {absLight}% ({lDir}) — phiên bản {brand} ở chế độ dark mode app ngân hàng lúc 11h đêm.",
        "Độ sáng off {absLight}% — đây là {brand} qua màn điện thoại bật night light lúc check số dư.",
      ],
      bothOff: [
        "Lệch kép {sDir} {absSat}% / {lDir} {absLight}% — mood {mood}, {brand} qua ảnh chụp thẻ úp lên bàn ánh đèn vàng.",
        "Trượt cả 2 trục — phiên bản {brand} của bạn giống một app scam clone hơn là brand thật.",
      ],
    },
    telco: {
      match: [
        "Hai chỉ số khớp — bạn xài SIM {brand} đủ lâu để thuộc luôn cả số tổng đài chăm sóc khách hàng.",
        "Chroma + value bám sát — level người đã đóng cước {brand} liên tục 5 năm, status khách hàng VIP.",
      ],
      satOff: [
        "Chroma {sDir} brand {absSat}% — đây là {brand} qua tem dán SIM cũ đi theo bạn qua 3 đời điện thoại.",
        "Độ rực lệch {absSat}% — vibe {brand} qua biển hiệu cửa hàng đại lý ngoài tỉnh đã phai nắng.",
      ],
      lightOff: [
        "Value lệch {absLight}% ({lDir}) — phiên bản {brand} dưới biển hiệu bật đèn LED trắng quá tay buổi tối.",
        "Độ sáng off {absLight}% — đây là {brand} qua tờ rơi gói cước in giấy mỏng đã phai mực.",
      ],
      bothOff: [
        "Lệch kép {sDir} {absSat}% / {lDir} {absLight}% — mood {mood}, {brand} bản tỉnh lẻ chưa kịp cập nhật brand mới.",
        "Trượt cả 2 trục — phiên bản này nhìn như quầy bán SIM trong nhà chờ xe khách, không phải store {brand} chuẩn.",
      ],
    },
    travel: {
      match: [
        "Hai chỉ số khớp — bạn đặt {brand} đủ nhiều để hệ thống tự upgrade VIP mà chưa cần đăng ký gì.",
        "Chroma + value bám sát — chắc bạn để lại review 5 sao kèm 4 ảnh cho gần như mọi chuyến qua {brand}.",
      ],
      satOff: [
        "Chroma {sDir} brand {absSat}% — đây là {brand} qua áo đồng phục tài xế sau ca chạy 10 tiếng nắng gắt.",
        "Độ rực lệch {absSat}% — vibe {brand} của sticker dán trên kính ô tô đối tác đã phai sau 2 mùa mưa.",
      ],
      lightOff: [
        "Value lệch {absLight}% ({lDir}) — phiên bản {brand} qua biển hiệu cửa hàng đối tác buổi tối ánh đèn vàng.",
        "Độ sáng off {absLight}% — đây là {brand} ở chế độ trong app khi bạn đặt xe lúc 2h sáng về nhà.",
      ],
      bothOff: [
        "Lệch kép {sDir} {absSat}% / {lDir} {absLight}% — mood {mood}, chi nhánh {brand} tỉnh lẻ chưa kịp brand refresh.",
        "Trượt cả 2 trục — phiên bản {brand} của bạn giống nhớ lại chuyến đi từ 5 năm trước, tone đã mờ đi.",
      ],
    },
    fashion: {
      match: [
        "Hai chỉ số khớp — bạn thuộc dạng thử áo {brand} đủ size để biết hãng này lên đồ chuẩn hơn hay hụt size.",
        "Chroma + value bám brand — level người đã so giá {brand} giữa outlet, store chính và app secondhand.",
      ],
      satOff: [
        "Chroma {sDir} brand {absSat}% — đây là {brand} qua áo bán sale đã giặt 30 lần, không phải đồ runway nguyên seal.",
        "Độ rực lệch {absSat}% — vibe {brand} của một capsule chỉ chạy thị trường nước ngoài, chưa về Việt Nam.",
      ],
      lightOff: [
        "Value lệch {absLight}% ({lDir}) — phiên bản {brand} qua biển hiệu store buổi tối ánh đèn vàng warm.",
        "Độ sáng off {absLight}% — đây là {brand} qua lookbook chụp giờ chiều ánh mặt trời nghiêng, tone đã ám.",
      ],
      bothOff: [
        "Lệch kép {sDir} {absSat}% / {lDir} {absLight}% — mood {mood}, đây là {brand} bản chợ Bến Thành, font giống mà tone bay xa.",
        "Trượt cả 2 trục — phiên bản này hợp với một streetwear no-name copy form hơn là {brand} chính chủ.",
      ],
    },
    cosmetics: {
      match: [
        "Hai chỉ số khớp — bạn đứng trước counter {brand} đủ lâu để được nhân viên gọi tên dòng quen.",
        "Chroma + value bám brand — level người đã sưu tầm đủ travel-size {brand} qua mỗi chuyến đi xa.",
      ],
      satOff: [
        "Chroma {sDir} brand {absSat}% — đây là {brand} qua video review của beauty blogger đã chỉnh filter cho hồng hào hơn.",
        "Độ rực lệch {absSat}% — vibe {brand} của hộp đã nằm trên kệ tủ kính 6 tháng dưới đèn LED.",
      ],
      lightOff: [
        "Value lệch {absLight}% ({lDir}) — phiên bản {brand} qua TVC studio ánh sáng trắng pure cho da căng bóng.",
        "Độ sáng off {absLight}% — đây là {brand} ở hộp đã bóc xài, bao bì hơi nhăn so với vỏ nguyên seal.",
      ],
      bothOff: [
        "Lệch kép {sDir} {absSat}% / {lDir} {absLight}% — mood {mood}, đây là {brand} dupe livestream Shopee 199k freeship.",
        "Trượt cả 2 trục — phiên bản này nhìn như {brand} fake scan vỏ thật rồi in lại không đúng giấy.",
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
        "Hai chỉ số khớp — bạn thuộc menu {brand} đến mức nhân viên chưa hỏi xong là bạn đọc đúng combo luôn.",
        "Chroma + value bám brand — level người ăn {brand} đủ để biết món nào ngon món nào pass.",
      ],
      satOff: [
        "Chroma {sDir} brand {absSat}% — đây là {brand} qua biển hiệu mặt tiền đường lớn đã phơi nắng 5 mùa hè.",
        "Độ rực lệch {absSat}% — vibe {brand} của hộp giấy gói đồ ăn về đã ngấm dầu thấm sang lớp ngoài.",
      ],
      lightOff: [
        "Value lệch {absLight}% ({lDir}) — phiên bản {brand} qua biển bật đèn neon 11h đêm sau giờ tan ca về muộn.",
        "Độ sáng off {absLight}% — đây là {brand} trong app đặt đồ ăn ở chế độ dark, tone trầm hơn nửa nấc.",
      ],
      bothOff: [
        "Lệch kép {sDir} {absSat}% / {lDir} {absLight}% — mood {mood}, một quán nhượng quyền ở tỉnh chưa được audit brand năm nay.",
        "Trượt cả 2 trục — phiên bản này nhìn như quán đặt tên na ná {brand}, font ăn theo nhưng tone bay xa.",
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
        "Hai chỉ số khớp — bạn cầm điện thoại {brand} đủ lâu để mò ra cả setting ẩn mà tutorial không nhắc.",
        "Chroma + value bám brand — power user thực thụ, thuộc luôn màu boot screen và animation mở khoá.",
      ],
      satOff: [
        "Chroma {sDir} brand {absSat}% — đây là {brand} qua icon launcher tự cài theme từ store, không còn vibe mặc định.",
        "Độ rực lệch {absSat}% — vibe {brand} của version cũ 2 đời, trước khi hãng refresh bộ icon.",
      ],
      lightOff: [
        "Value lệch {absLight}% ({lDir}) — phiên bản {brand} qua wallpaper dark mode mặc định lúc màn hình tự sáng nhẹ.",
        "Độ sáng off {absLight}% — đây là {brand} trên màn điện thoại bị auto-giảm còn 20% giữa rạp chiếu phim tối.",
      ],
      bothOff: [
        "Lệch kép {sDir} {absSat}% / {lDir} {absLight}% — mood {mood}, một bản ROM cộng đồng tự build chia sẻ trên forum.",
        "Trượt cả 2 trục — phiên bản này nhìn như một bản chế cộng đồng chứ không phải bản chính chủ hãng release.",
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
        `Tông trúng gần như tuyệt đối — sai chỉ ${hueD.toFixed(1)}° trên bánh xe màu 360°. Mắt thường không phân biệt nổi mức này.`,
        `Bạn neo đúng tông ${bName} của brand, lệch dưới 5°. Não bạn đã ghi đúng vị trí màu này.`,
        `Hue khớp gần như hoàn hảo (${hueD.toFixed(1)}°) — kiểu nhìn logo cái là não bật ngay đúng màu.`,
      );
    } else if (hueD < 12) {
      const dirText = shift.dir === "cw" ? `ngả nhẹ phía ${neighborHue(bh, "cw")}` : `ngả nhẹ phía ${neighborHue(bh, "ccw")}`;
      hueLines.push(
        `Hue lệch ~${Math.round(hueD)}° — bạn ${dirText} so với ${bName} chuẩn. Sai nhẹ thôi, mắt người thường khó bắt.`,
        `Cùng họ ${bName} với brand nhưng kéo ${dirText} một chút. Vẫn trong khoảng chấp nhận được.`,
        `Bạn chọn đúng nhánh ${bName}, chỉ dịch ${Math.round(hueD)}° (${dirText}). Designer khó tính mới phát hiện, còn user thường thì không.`,
      );
    } else if (hueD < 25) {
      const dirText = shift.dir === "cw" ? neighborHue(bh, "cw") : neighborHue(bh, "ccw");
      hueLines.push(
        `Tông bị "drift" ${Math.round(hueD)}° sang ${dirText} — đây là lỗi phổ biến khi não nhớ màu theo cảm giác (warm/cool) thay vì hue chính xác.`,
        `Bạn pick ${uName} pha chút ${dirText}, brand thì là ${bName} thuần. Lệch ${Math.round(hueD)}° — mắt người vẫn bắt được khác biệt.`,
        `Cùng họ ${bName} với brand nhưng lệch ${Math.round(hueD)}°. Cảm giác như nhớ đúng vibe nhưng sai một chút sắc độ.`,
      );
    } else if (hueD < 50) {
      hueLines.push(
        `Hue lệch ${Math.round(hueD)}° — bạn rẽ sang ${uName}, brand là ${bName}. Như nhầm "đỏ-cam" với "vàng" trên bánh xe màu vậy.`,
        `Lệch ${Math.round(hueD)}° là khá xa — có thể bạn đang nhớ logo qua một campaign cũ hoặc lẫn với một brand khác.`,
        `Cách brand ${Math.round(hueD)}° trên bánh xe màu: brand neo ở ${bName}, bạn pick ở ${uName}. Đủ để bị bắt lỗi nếu đem in.`,
      );
    } else if (hueD < 90) {
      hueLines.push(
        `Hue lệch tới ${Math.round(hueD)}° — bạn chọn ${uName}, brand là ${bName}. Hai bên đối lập nhau trên bánh xe, cảm giác hoàn toàn khác.`,
        `Lệch ${Math.round(hueD)}° là rất xa — khả năng cao bạn đang lẫn brand này với một brand khác có màu na ná.`,
        `Bạn rời hẳn vùng ${bName} sang ${uName}. Cỡ này là trí nhớ chỉ giữ được "mood" chứ không nhớ màu cụ thể nữa.`,
      );
    } else {
      hueLines.push(
        `Hue lệch ${Math.round(hueD)}° — gần như đối nghịch trên bánh xe màu. Bạn pick ${uName} (${uTemp}), brand thì ${bName} (${bTemp}).`,
        `Cách brand tới ${Math.round(hueD)}° — không phải nhớ sai, đây là lẫn hoàn toàn với brand khác rồi.`,
        `Bạn pick phía ${uTemp} của bánh xe, brand ở phía ${bTemp} — như trả lời "đỏ" khi đáp án là "xanh dương" vậy.`,
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
