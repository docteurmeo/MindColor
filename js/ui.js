// MindColor — UI controller (viewport-native fluid layout)

(function () {
  let pickerBox = null;
  let pickerHue = null;
  let currentUserHex = "#ffffff";
  let currentBrand = null;
  let userHasPicked = false;

  function showScreen(id) {
    document.querySelectorAll(".screen, #screen-home").forEach((s) => {
      s.classList.toggle("active", s.id === id);
    });
    window.scrollTo(0, 0);
    // Defer picker resize until after layout settles
    if (id === "screen-round") {
      requestAnimationFrame(resizePickers);
    }
  }

  // ----- Picker sizing: square = min(available width, available height in #picker-stage) -----
  function computePickerSize() {
    const stage = document.getElementById("picker-stage");
    if (!stage) return 320;
    // stage already has padding 0 10px applied by CSS via parent — read clientWidth
    const w = stage.clientWidth;
    const h = stage.clientHeight;
    const hueH = 24;
    const submitH = 68;
    const gaps = 10 * 2; // gap between picker→hue and hue→submit (margin-top:auto eats one)
    const availH = h - hueH - submitH - gaps;
    const size = Math.max(180, Math.min(w, availH, 600));
    return Math.floor(size);
  }

  function initPickers() {
    if (pickerBox && pickerHue) return;
    const size = computePickerSize();

    pickerBox = new iro.ColorPicker("#color-picker", {
      width: size,
      boxHeight: size,
      color: "#ff6c02",
      borderWidth: 0,
      handleRadius: 11,
      layout: [{ component: iro.ui.Box }],
    });

    pickerHue = new iro.ColorPicker("#hue-slider", {
      width: document.getElementById("hue-slider").clientWidth || size,
      color: pickerBox.color.hexString,
      borderWidth: 0,
      handleRadius: 11,
      sliderSize: 24,
      layout: [{ component: iro.ui.Slider, options: { sliderType: "hue" } }],
    });

    pickerHue.on("color:change", (color) => {
      pickerBox.color.hue = color.hue;
    });
    pickerBox.on("color:change", (color) => {
      currentUserHex = color.hexString;
      userHasPicked = true;
      if (currentBrand) {
        Logo.tint(document.getElementById("brand-logo"), currentUserHex);
      }
    });
  }

  function resizePickers() {
    if (!pickerBox || !pickerHue) return;
    const size = computePickerSize();
    const hueW = document.getElementById("hue-slider").clientWidth || size;
    try {
      // iro v5 supports resize(width)
      pickerBox.resize(size);
      pickerHue.resize(hueW);
    } catch (e) {
      // Fallback: rebuild
      document.getElementById("color-picker").innerHTML = "";
      document.getElementById("hue-slider").innerHTML = "";
      pickerBox = null;
      pickerHue = null;
      initPickers();
    }
  }

  window.addEventListener("resize", resizePickers);
  window.addEventListener("orientationchange", () => requestAnimationFrame(resizePickers));
  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", resizePickers);
  }

  function renderRound(brand) {
    currentBrand = brand;
    userHasPicked = false;
    currentUserHex = "#ffffff";

    document.getElementById("brand-name").textContent = brand.name;
    const p = Game.progress();
    document.getElementById("round-progress").textContent = `${p.current}/${p.total}`;

    Logo.render(document.getElementById("brand-logo"), brand, "idle");

    document.getElementById("picker-stage").hidden = false;
    document.getElementById("result-stage").hidden = true;
  }

  function renderReveal(result) {
    Logo.tint(document.getElementById("brand-logo"), result.userColor);

    const scoreEl = document.getElementById("score-big");
    const bar = document.getElementById("score-bar-fill");
    bar.style.width = "0%";
    scoreEl.textContent = "0%";
    animateScore(result.score, 700);
    bar.style.width = `${result.score}%`;

    document.getElementById("reaction").textContent = result.reaction;

    Logo.render(document.getElementById("reveal-user-logo"),  currentBrand, "user",  result.userColor);
    Logo.render(document.getElementById("reveal-brand-logo"), currentBrand, "color");
    document.getElementById("reveal-user-bar").style.background  = result.userColor;
    document.getElementById("reveal-brand-bar").style.background = result.brandColor;
    document.getElementById("reveal-user-hex").textContent  = result.userColor.toUpperCase();
    document.getElementById("reveal-brand-hex").textContent = result.brandColor.toUpperCase();

    const fb = document.getElementById("feedback");
    fb.innerHTML = "";
    (result.detailLines || []).slice(0, 2).forEach((line) => {
      const p = document.createElement("p");
      p.textContent = line;
      fb.appendChild(p);
    });

    document.getElementById("picker-stage").hidden = true;
    document.getElementById("result-stage").hidden = false;
  }

  function animateScore(target, durationMs) {
    const el = document.getElementById("score-big");
    const start = performance.now();
    function tick(now) {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      el.textContent = `${Math.round(eased * target)}%`;
      if (t < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  function animateFinalScore(target, durationMs) {
    const el = document.getElementById("final-score");
    const start = performance.now();
    function tick(now) {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      el.textContent = `${Math.round(eased * target)}%`;
      if (t < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  function renderFinal() {
    const summary = Game.getFinalSummary();
    if (!summary) return;

    document.getElementById("final-score").textContent = "0%";
    animateFinalScore(summary.totalScore, 900);

    document.getElementById("final-rank-emoji").textContent = summary.rank.emoji;
    document.getElementById("final-rank-label").textContent = summary.rank.label;
    document.getElementById("final-comment").textContent    = summary.rank.comment;

    const recap = document.getElementById("recap");
    recap.innerHTML = "";
    summary.results.forEach((r) => {
      const li = document.createElement("li");
      li.className = "recap-row";
      li.innerHTML = `
        <span class="recap-left">
          <span class="recap-color-block" style="background:${scoreColor(r.score)}"></span>
          <span class="recap-brand-name">${r.brandName}</span>
        </span>
        <span class="recap-right">
          <span class="recap-swatch-pair">
            <span class="sw" style="background:${r.userColor}"></span>
            <span class="sw" style="background:${r.brandColor}"></span>
          </span>
          <span class="recap-score">${r.score}%</span>
        </span>
      `;
      recap.appendChild(li);
    });
  }

  function scoreColor(score) {
    if (score >= 85) return "#44dea8";
    if (score >= 60) return "#fbbf24";
    if (score >= 35) return "#fb923c";
    return "#f87171";
  }

  // ---------- Handlers ----------
  async function handlePlayClassic() {
    try {
      const brand = await Game.startClassic();
      showScreen("screen-round");
      // Initial picker init after screen becomes visible so clientWidth/Height are correct
      requestAnimationFrame(() => {
        initPickers();
        renderRound(brand);
      });
    } catch (e) {
      alert(
        "Chưa có brand nào để chơi!\n\n" +
        "Hãy drop file SVG vào assets/logos/ rồi push lên GitHub."
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
      renderFinal();
      showScreen("screen-final");
      return;
    }
    renderRound(nextBrand);
  }

  document.addEventListener("click", (e) => {
    const target = e.target.closest("[data-action]");
    if (!target) return;
    switch (target.dataset.action) {
      case "play-classic":  handlePlayClassic(); break;
      case "submit-color":  handleSubmit(); break;
      case "next-round":    handleNext(); break;
      case "back-home":     showScreen("screen-home"); break;
    }
  });
})();
