// MindColor — UI controller

(function () {
  const screens = document.querySelectorAll(".screen");
  let picker = null;
  let currentUserHex = "#ffffff";
  let currentBrand = null;

  function showScreen(id) {
    screens.forEach((s) => s.classList.toggle("active", s.id === id));
  }

  function initPicker() {
    if (picker) return;
    // Picker rộng tối đa, layout Box (saturation/value 2D) + Hue slider.
    const maxWidth = Math.min(420, window.innerWidth - 48);
    picker = new iro.ColorPicker("#color-picker", {
      width: maxWidth,
      boxHeight: maxWidth,
      color: "#ffffff",
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.1)",
      handleRadius: 10,
      layout: [
        { component: iro.ui.Box },
        { component: iro.ui.Slider, options: { sliderType: "hue" } },
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
    currentBrand = brand;
    document.getElementById("brand-name").textContent = brand.name;
    Logo.render(document.getElementById("brand-logo"), brand, "mono");

    const p = Game.progress();
    document.getElementById("round-progress").textContent = `${p.current} / ${p.total}`;
    document.getElementById("reveal").hidden = true;
    document.getElementById("picker-wrap").hidden = false;
    document.getElementById("submit-btn").hidden = false;
  }

  function renderReveal(result) {
    document.getElementById("picker-wrap").hidden = true;
    document.getElementById("submit-btn").hidden = true;

    // Đổi logo sang full màu
    Logo.render(document.getElementById("brand-logo"), currentBrand, "color");

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
