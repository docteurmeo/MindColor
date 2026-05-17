// MindColor — game state & flow (logic only, không đụng DOM)

const Game = (() => {
  const ROUNDS_PER_GAME = 10;

  let state = null;
  let brandCache = null;

  async function loadBrands() {
    if (brandCache) return brandCache;
    try {
      const all = await fetch('data/brands.json').then(r => r.json());
      brandCache = Array.isArray(all) ? all : [];
    } catch (e) {
      console.error('Không load được data/brands.json', e);
      brandCache = [];
    }
    return brandCache;
  }

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  async function startClassic() {
    const all = await loadBrands();
    if (all.length === 0) {
      throw new Error('Chưa có brand nào. Hãy thêm file SVG vào assets/logos/');
    }
    const rounds = Math.min(ROUNDS_PER_GAME, all.length);
    const picked = shuffle(all).slice(0, rounds);
    state = {
      mode: 'classic',
      brands: picked,
      index: 0,
      results: [],
    };
    return currentBrand();
  }

  function currentBrand() {
    if (!state) return null;
    return state.brands[state.index];
  }

  function progress() {
    return { current: state.index + 1, total: state.brands.length };
  }

  function submit(userColor) {
    const brand = currentBrand();
    const evalResult = Scoring.evaluate(userColor, brand.color, brand);
    const result = {
      brandId: brand.id,
      brandName: brand.name,
      userColor,
      brandColor: brand.color,
      ...evalResult,
    };
    state.results.push(result);
    return result;
  }

  function next() {
    state.index++;
    if (state.index >= state.brands.length) return null;
    return currentBrand();
  }

  function isFinished() {
    return state && state.index >= state.brands.length;
  }

  function getResults() {
    return state ? state.results : [];
  }

  function getFinalSummary() {
    if (!state || state.results.length === 0) return null;
    const results = state.results;
    const totalScore = Math.round(
      results.reduce((sum, r) => sum + (r.score || 0), 0) / results.length
    );
    return {
      mode: state.mode,
      totalScore,
      rank: rankFor(totalScore),
      results,
      gameNumber: classicGameNumber(),
    };
  }

  const FINAL_COMMENTS = {
    S: [
      "Trời ơi, mắt bạn là máy đo Pantone hả? Trùm rồi nha!",
      "Cấp độ ám ảnh thị giác. Nhìn brand 1 lần là khắc sâu vào não rồi.",
      "Bạn có chắc không phải designer ẩn danh đi chơi cho vui không?",
      "Mắt như spectrometer. Có khi nhân loại nên tham khảo bạn để chuẩn hoá màu.",
      "Đỉnh kout. Bạn vừa unlock achievement 'Pantone whisperer' 🏆",
      "Skill này phải đi bán cho Adobe rồi. Phí tài năng quá!",
      "Tôi đầu hàng. Bạn ngồi nhớ logo cả đời hay sao mà chuẩn vậy?",
      "Đây là level của người đã từng vẽ tay 100 cái logo. Cúi đầu.",
      "Bạn có siêu năng lực màu sắc. Marvel nên cast bạn vào phần mới.",
      "Một designer khóc nức nở khi nhìn điểm số này. 🥲",
    ],
    A: [
      "Đỉnh quá đỉnh. Đi học design đi là vừa, phí tài năng!",
      "Top 5% người chơi. Branding agency nào nhặt bạn cũng đỡ tốn tiền training.",
      "Mắt nghệ sống đó nha. Đi đâu cũng nhớ logo thì quá xịn rồi.",
      "Bạn nhớ brand đúng kiểu fan thực thụ — không phải kiểu đoán đại.",
      "Ngon ngon. Cứ đà này dễ thành Art Director lắm đó.",
      "Có vibe của một người ngày nào cũng lượn Behance/Dribbble.",
      "Skill thật. Không phải hên xui. Kiểu này thi đấu được rồi.",
      "Brand team thấy bạn chắc muốn tuyển làm QA màu sắc.",
      "Trí nhớ thị giác cao cấp. Đi photoshop chắc nhẹ tựa lông hồng.",
    ],
    B: [
      "Khá đó nha bro, nhìn brand nào cũng nhớ kha khá rồi!",
      "Có nghề thật chứ không phải đùa. Còn cải thiện được nhiều nữa đó.",
      "Đủ điểm pass môn 'Trí nhớ thương hiệu 101'. Học bổng thì hơi xa.",
      "Bạn thuộc kiểu người nhìn logo 1 phát là note vào đầu được khoảng 70%.",
      "Mid-tier nhưng có tâm. Luyện thêm là lên class nhanh thôi.",
      "Không có gì đáng xấu hổ. Trên trung bình khá đó.",
      "Vibe của một marketer hay xem brand guideline. Tốt!",
      "Hồ sơ ổn áp. Đem đi xin việc copywriter cũng có cửa.",
      "Nhớ brand tốt vừa đủ để không bị bạn bè chê khi cãi nhau về logo.",
    ],
    C: [
      "Tà tà thôi, không quá tệ, nhưng cũng chưa có gì để khoe.",
      "50-50 vibe. Đoán đúng thì cũng đoán đại, sai thì cũng không quá xa.",
      "Mức 'người dùng internet bình thường'. Không thiếu, không thừa.",
      "Bạn nhớ brand kiểu nhớ tên đồng nghiệp cũ — loáng thoáng có hình dung.",
      "Đủ điểm tốt nghiệp phổ thông màu sắc. Đại học thì cần học thêm.",
      "Skill này đi gặp khách hàng thì hơi run. Nhưng tám với bạn thì OK.",
      "Một thường dân hiền lành trong vũ trụ thương hiệu.",
      "Não bạn lưu brand kiểu nén file thumbnail — đủ nhận diện chứ không đủ chi tiết.",
      "Có biết Coca-Cola màu đỏ chứ chưa chắc nhớ đúng sắc đỏ nào.",
    ],
    D: [
      "Hơi lú rồi đó cha. Chắc nhìn brand qua kính áp tròng à?",
      "Mắt đang trong chế độ tiết kiệm pin hả? Cần restart!",
      "Não bạn lưu brand bằng kiểu 'nó kiểu kiểu đó' — không chi tiết lắm.",
      "Có vẻ bạn ít để ý logo. Hoặc thường lướt qua chứ không nhìn kỹ.",
      "Kết quả này cần một cuộc trò chuyện với chuyên gia nhãn khoa.",
      "Bạn thuộc team 'logo nào cũng giống logo nào'. Không sao, cứ luyện đi!",
      "Có lẽ bạn nhớ brand bằng giọng quảng cáo chứ không phải bằng màu.",
      "Có khi nào bạn đang dùng chế độ dark mode 24/7 nên không nhớ màu thật?",
      "Não lưu brand ở dạng grayscale. Cần update sang RGB gấp.",
    ],
    F: [
      "Bạn ơi, đi khám mắt gấp đi. Hoặc chơi lại cho đỡ quê 😂",
      "Đây là điểm số của người vừa rebrand toàn bộ thế giới luôn rồi.",
      "Mỗi brand bạn chọn 1 màu mới — sáng tạo nhưng không đúng đề bài.",
      "Có thể bạn đang sống ở vũ trụ song song nơi logo có màu khác.",
      "Đề nghị reset não và chơi lại. Hoặc đổi sang chơi đoán âm thanh.",
      "Mắt bạn đang nghỉ phép dài hạn. Hoặc bạn đang chơi nhắm mắt.",
      "Designer team đọc kết quả này chắc xin nghỉ luôn 😭",
      "Bạn vừa hoàn thành thử thách 'sai mọi thứ có thể sai'. Chúc mừng!",
      "Có khi nào bạn nhầm app — đây là MindColor chứ không phải đoán random?",
      "Kiểu này phải đi học lại bảng màu lớp 1. Cẩn thận kẻo nhuộm tóc nhầm.",
    ],
  };

  function pickComment(tier) {
    const arr = FINAL_COMMENTS[tier];
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function rankFor(score) {
    if (score >= 95) return { tier: "S", label: "Trùm cuối màu sắc", emoji: "🏆", comment: pickComment("S") };
    if (score >= 85) return { tier: "A", label: "Mắt designer",      emoji: "🎨", comment: pickComment("A") };
    if (score >= 70) return { tier: "B", label: "Cũng có nghề",      emoji: "👀", comment: pickComment("B") };
    if (score >= 50) return { tier: "C", label: "Thường dân",        emoji: "😎", comment: pickComment("C") };
    if (score >= 30) return { tier: "D", label: "Mắt hơi yếu",       emoji: "😅", comment: pickComment("D") };
    return                  { tier: "F", label: "Mù màu nặng",       emoji: "🌫️", comment: pickComment("F") };
  }

  // Số game đã chơi (lưu localStorage cho vui)
  function classicGameNumber() {
    try {
      const key = "mindcolor:classic-count";
      const n = parseInt(localStorage.getItem(key) || "0", 10) + 1;
      localStorage.setItem(key, n);
      return n;
    } catch (e) {
      return 1;
    }
  }

  return {
    startClassic,
    currentBrand,
    progress,
    submit,
    next,
    isFinished,
    getResults,
    getFinalSummary,
  };
})();
