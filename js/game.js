// MindColor — game state & flow (logic only, không đụng DOM)

const Game = (() => {
  const ROUNDS_PER_GAME = 10;

  let state = null;

  async function loadBrands() {
    const res = await fetch("data/brands.json");
    return res.json();
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
    const picked = shuffle(all).slice(0, ROUNDS_PER_GAME);
    state = {
      mode: "classic",
      brands: picked,
      index: 0,
      results: [], // {brandId, userColor, brandColor, score}
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

  // Phase 2: chưa có scoring thật. Trả về null cho score, sẽ thêm Session 3.
  function submit(userColor) {
    const brand = currentBrand();
    const result = {
      brandId: brand.id,
      brandName: brand.name,
      userColor,
      brandColor: brand.color,
      score: null, // TBD Session 3
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
