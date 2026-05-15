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

  return {
    startClassic,
    currentBrand,
    progress,
    submit,
    next,
    isFinished,
    getResults,
  };
})();
