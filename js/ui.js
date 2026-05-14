// MindColor — UI controller

(function () {
  const screens = document.querySelectorAll(".screen");
  let picker = null;
  let currentUserHex = "#ffffff";

  function showScreen(id) {
    screens.forEach((s) => s.classList.toggle("active", s.id === id));
  }

  function initPicker() {
    if (picker) return;
    picker = new iro.ColorPicker("#color-picker", {
      width: Math.min(260, window.innerWidth - 80),
      color: "#ffffff",
      layout: [
        { component: iro.ui.Wheel },
        { component: iro.ui.Slider, options: { sliderType: "value" } },
      ],
    });
    picker.on("color:change", (color) => {
      currentUserHex = color.hexString;
      document.getElementById("user-swatch").style.background = currentUserHex;
      document.getElementById("user-hex").textContent = currentUserHex.toUpperCase();
    });
    document.getElementById("user-swatch").style.background = currentUserHex;
    document.getElementById("user-hex").textContent = currentUserHex.toUpperCase();
  }

  function renderRound(brand) {
    document.getElementById("brand-name").textContent = brand.name;
    const p = Game.progress();
    document.getElementById("round-progress").textContent = `${p.current} / ${p.total}`;
    document.getElementById("reveal").hidden = true;
    document.getElementById("picker-wrap").hidden = false;
    document.getElementById("submit-btn").hidden = false;
  }

  function renderReveal(result) {
    document.getElementById("picker-wrap").hidden = true;
    document.getElementById("submit-btn").hidden = true;

    const revealEl = document.getElementById("reveal");
    document.getElementById("reveal-user").style.background = result.userColor;
    document.getElementById("reveal-user-hex").textContent = result.userColor.toUpperCase();
    document.getElementById("reveal-brand").style.background = result.brandColor;
    document.getElementById("reveal-brand-hex").textContent = result.brandColor.toUpperCase();
    revealEl.hidden = false;
  }

  async function handlePlayClassic() {
    const brand = await Game.startClassic();
    showScreen("screen-round");
    initPicker();
    renderRound(brand);
  }

  function handleSubmit() {
    const result = Game.submit(currentUserHex);
    renderReveal(result);
  }

  function handleNext() {
    const nextBrand = Game.next();
    if (!nextBrand) {
      showScreen("screen-final");
      return;
    }
    renderRound(nextBrand);
  }

  document.addEventListener("click", (e) => {
    const target = e.target.closest("[data-action]");
    if (!target) return;
    const action = target.dataset.action;

    switch (action) {
      case "play-classic":
        handlePlayClassic();
        break;
      case "play-daily":
        break;
      case "submit-color":
        handleSubmit();
        break;
      case "next-round":
        handleNext();
        break;
      case "back-home":
        showScreen("screen-home");
        break;
    }
  });
})();
