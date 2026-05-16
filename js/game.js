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
    const evalResult = Scoring.evaluate(userColor, brand.color);
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

  function rankFor(score) {
    if (score >= 95) return { tier: "S",  label: "Trùm cuối màu sắc",  emoji: "🏆", comment: "Trời ơi, mắt bạn là máy đo Pantone hả? Trùm rồi nha!" };
    if (score >= 85) return { tier: "A",  label: "Mắt designer",        emoji: "🎨", comment: "Đỉnh quá đỉnh. Đi học design đi là vừa, phí tài năng!" };
    if (score >= 70) return { tier: "B",  label: "Cũng có nghề",        emoji: "👀", comment: "Khá đó nha bro, nhìn brand nào cũng nhớ kha khá rồi!" };
    if (score >= 50) return { tier: "C",  label: "Thường dân",          emoji: "😎", comment: "Tà tà thôi, không quá tệ, nhưng cũng chưa có gì để khoe." };
    if (score >= 30) return { tier: "D",  label: "Mắt hơi yếu",         emoji: "😅", comment: "Hơi lú rồi đó cha. Chắc nhìn brand qua kính áp tròng à?" };
    return                  { tier: "F",  label: "Mù màu nặng",         emoji: "🌫️", comment: "Bạn ơi, đi khám mắt gấp đi. Hoặc chơi lại cho đỡ quê 😂" };
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
