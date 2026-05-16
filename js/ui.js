// MindColor — UI controller (Figma redesign)

(function () {
  // ---------- Scale-to-fit the 390x844 Figma frame on any viewport ----------
  function fitApp() {
    const probe = document.getElementById("safe-probe");
    const cs = probe ? getComputedStyle(probe) : null;
    const safeTop = cs ? parseFloat(cs.paddingTop) || 0 : 0;
    const safeBot = cs ? parseFloat(cs.paddingBottom) || 0 : 0;
    const vw = window.innerWidth;
    const vh = window.innerHeight - safeTop - safeBot;
    const scale = Math.min(vw / 390, vh / 844);
    document.documentElement.style.setProperty("--app-scale", scale);
  }
  fitApp();
  window.addEventListener("resize", fitApp);
  window.addEventListener("orientationchange", fitApp);
  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", fitApp);
  }

  const screens = document.querySelectorAll(".screen");
  let pickerBox = null;
  let pickerHue = null;
  let currentUserHex = "#ffffff";
  let currentBrand = null;
  let userHasPicked = false;

  function showScreen(id) {
    screens.forEach((s) => s.classList.toggle("active", s.id === id));
    window.scrollTo(0, 0);
  }

  function initPickers() {
    if (pickerBox && pickerHue) return;

    // Box picker (saturation/value) — fills 370x370 container
    pickerBox = new iro.ColorPicker("#color-picker", {
      width: 370,
      boxHeight: 370,
      color: "#ff6c02",
      borderWidth: 0,
      handleRadius: 11,
      layout: [{ component: iro.ui.Box }],
    });

    // Hue slider — fills 370x24 container
    pickerHue = new iro.ColorPicker("#hue-slider", {
      width: 370,
      color: pickerBox.color.hexString,
      borderWidth: 0,
      handleRadius: 11,
      sliderSize: 24,
      layout: [{ component: iro.ui.Slider, options: { sliderType: "hue" } }],
    });

    // Sync hue → box
    pickerHue.on("color:change", (color) => {
      pickerBox.color.hue = color.hue;
    });
    // Any change → update preview
    pickerBox.on("color:change", (color) => {
      currentUserHex = color.hexString;
      userHasPicked = true;
      if (currentBrand) {
        Logo.tint(document.getElementById("brand-logo"), currentUserHex);
      }
    });
  }

  function renderRound(brand) {
    currentBrand = brand;
    userHasPicked = false;
    currentUserHex = "#ffffff";

    document.getElementById("brand-name").textContent = brand.name;
    const p = Game.progress();
    document.getElementById("round-progress").textContent = `${p.current}/${p.total}`;

    // Idle: logo ghi
    Logo.render(document.getElementById("brand-logo"), brand, "idle");

    // Hiện picker, ẩn result
    document.getElementById("picker-stage").hidden = false;
    document.getElementById("result-stage").hidden = true;
  }

  function renderReveal(result) {
    // Logo lớn (header area) — tint theo user color để "trêu" trước khi xem đáp án
    Logo.tint(document.getElementById("brand-logo"), result.userColor);

    // Score
    const scoreEl = document.getElementById("score-big");
    const bar = document.getElementById("score-bar-fill");
    bar.style.width = "0%";
    scoreEl.textContent = "0%";
    animateScore(result.score, 700);
    bar.style.width = `${result.score}%`;

    // Reaction (1 dòng)
    document.getElementById("reaction").textContent = result.reaction;

    // 2 cards
    Logo.render(document.getElementById("reveal-user-logo"),  currentBrand, "user",  result.userColor);
    Logo.render(document.getElementById("reveal-brand-logo"), currentBrand, "color");
    document.getElementById("reveal-user-bar").style.background = result.userColor;
    document.getElementById("reveal-brand-bar").style.background = result.brandColor;
    document.getElementById("reveal-user-hex").textContent  = result.userColor.toUpperCase();
    document.getElementById("reveal-brand-hex").textContent = result.brandColor.toUpperCase();

    // Feedback (2 dòng max — lấy 2 dòng đầu từ detailLines)
    const fb = document.getElementById("feedback");
    fb.innerHTML = "";
    (result.detailLines || []).slice(0, 2).forEach((line) => {
      const p = document.createElement("p");
      p.textContent = line;
      fb.appendChild(p);
    });

    // Hide picker, show result
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
    document.getElementById("final-comment").textContent = summary.rank.comment;

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
      initPickers();
      renderRound(brand);
    } catch (e) {
      alert(
        "Chưa có brand nào để chơi!\n\n" +
        "Hãy drop file SVG vào assets/logos/ rồi push lên GitHub."
      );
      console.error(e);
    }
  }

  function handleSubmit() {
    // Nếu user chưa pick gì, vẫn cho submit với màu mặc định
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
