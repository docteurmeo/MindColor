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

  function animateScore(targetScore, durationMs) {
    const el = document.getElementById("score-big");
    const bar = document.getElementById("score-bar-fill");
    const start = performance.now();
    function tick(now) {
      const t = Math.min(1, (now - start) / durationMs);
      // ease-out
      const eased = 1 - Math.pow(1 - t, 3);
      const val = Math.round(eased * targetScore);
      el.firstChild.nodeValue = val;
      bar.style.width = `${eased * targetScore}%`;
      if (t < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  function renderReveal(result) {
    document.getElementById("picker-wrap").hidden = true;
    document.getElementById("submit-btn").hidden = true;

    // Logo full color
    Logo.render(document.getElementById("brand-logo"), currentBrand, "color");

    // Swatches
    document.getElementById("reveal-user").style.background = result.userColor;
    document.getElementById("reveal-user-hex").textContent = result.userColor.toUpperCase();
    document.getElementById("reveal-brand").style.background = result.brandColor;
    document.getElementById("reveal-brand-hex").textContent = result.brandColor.toUpperCase();

    // Reaction + feedback
    document.getElementById("reaction").textContent = result.reaction;
    const fbList = document.getElementById("feedback");
    fbList.innerHTML = "";
    result.detailLines.forEach((line, i) => {
      const li = document.createElement("li");
      li.textContent = line;
      li.style.animationDelay = `${300 + i * 150}ms`;
      fbList.appendChild(li);
    });

    // Color the score bar fill based on score
    const fill = document.getElementById("score-bar-fill");
    fill.style.background = scoreBarColor(result.score);

    // Reset score display
    document.getElementById("score-big").firstChild.nodeValue = "0";
    fill.style.width = "0%";

    document.getElementById("reveal").hidden = false;
    // animate
    animateScore(result.score, 700);
  }

  function scoreBarColor(score) {
    // Red → yellow → green gradient point
    if (score >= 85) return "linear-gradient(90deg, #34d399, #10b981)";
    if (score >= 60) return "linear-gradient(90deg, #fbbf24, #f59e0b)";
    if (score >= 35) return "linear-gradient(90deg, #fb923c, #f97316)";
    return "linear-gradient(90deg, #f87171, #ef4444)";
  }

  async function handlePlayClassic() {
    try {
      const brand = await Game.startClassic();
      showScreen("screen-round");
      initPicker();
      renderRound(brand);
    } catch (e) {
      alert(
        "Chưa có brand nào để chơi!\n\n" +
        "Hãy drop file SVG vào assets/logos/ rồi push lên GitHub. " +
        "Sau ~2 phút GitHub Action sẽ tự build data."
      );
      console.error(e);
    }
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
