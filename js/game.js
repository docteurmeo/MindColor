// MindColor — game state & flow (logic only, không đụng DOM)

const Game = (() => {
  const ROUNDS_PER_GAME = 10;

  let state = null;
  let brandCache = null;

  async function loadBrands() {
    if (brandCache) return brandCache;
    const manifest = await fetch("data/brands/index.json").then((r) => r.json());
    const all = [];
    for (const file of manifest.files) {
      try {
        const list = await fetch(`data/brands/${file}`).then((r) => r.json());
        for (const b of list) {
          all.push({ ...b, _source: file });
        }
      } catch (e) {
        console.warn(`Không load được ${file}`, e);
      }
    }
    brandCache = all;
    return all;
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
    const result = {
      brandId: brand.id,
      brandName: brand.name,
      logo: brand.logo,
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
