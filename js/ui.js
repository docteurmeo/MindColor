// MindColor — UI controller (viewport-native fluid layout)

(function () {
  let pickerBox = null;
  let pickerHue = null;
  let currentUserHex = "#ffffff";
  let currentBrand = null;
  let userHasPicked = false;
  let suppressColorChange = false;

  function showScreen(id) {
    const swap = () => {
      document.querySelectorAll(".screen, #screen-home").forEach((s) => {
        // remove active first so re-entering same screen replays animation
        s.classList.remove("active");
        // force reflow on the target so animations restart
        if (s.id === id) void s.offsetWidth;
      });
      document.querySelectorAll(".screen, #screen-home").forEach((s) => {
        s.classList.toggle("active", s.id === id);
      });
      window.scrollTo(0, 0);
    };
    if (window.FX) return FX.transitionTo(swap);
    swap();
    return Promise.resolve();
  }

  // ----- Picker sizing: square = wrap's actual content width.
  //       Doc tu chinh wrap (#color-picker), khong phai stage,
  //       vi stage co padding 10px khien clientWidth lon hon thuc te.
  function computePickerSize() {
    const wrap = document.getElementById("color-picker");
    if (!wrap) return 320;
    return Math.max(180, Math.floor(wrap.clientWidth));
  }

  function initPickers(initialColor) {
    if (pickerBox && pickerHue) return;
    const size = computePickerSize();
    const hueW = document.getElementById("hue-slider").clientWidth || size;
    const startColor = initialColor || "#ff6c02";

    pickerBox = new iro.ColorPicker("#color-picker", {
      width: size,
      boxHeight: size,            // explicit square
      color: startColor,
      borderWidth: 0,
      handleRadius: 11,
      layout: [{ component: iro.ui.Box }],
    });

    pickerHue = new iro.ColorPicker("#hue-slider", {
      width: hueW,
      color: startColor,
      borderWidth: 0,
      handleRadius: 11,
      sliderSize: 24,
      layout: [{ component: iro.ui.Slider, options: { sliderType: "hue" } }],
    });

    pickerHue.on("color:change", (color) => {
      if (suppressColorChange) return;
      pickerBox.color.hue = color.hue;
    });
    pickerBox.on("color:change", (color) => {
      if (suppressColorChange) return;
      currentUserHex = color.hexString;
      userHasPicked = true;
      if (currentBrand && !document.getElementById("brand-logo").hidden) {
        Logo.tint(document.getElementById("brand-logo"), currentUserHex);
      }
    });
  }

  // Rebuild picker on resize — iro.resize() doesn't update boxHeight,
  // causing the box to become rectangular when viewport changes.
  function resizePickers() {
    if (!pickerBox || !pickerHue) return;
    const wrapBox = document.getElementById("color-picker");
    const wrapHue = document.getElementById("hue-slider");
    // Bail neu screen-round dang an (display:none → clientWidth=0)
    // De khong rebuild voi size 0/180 (min) gay layout vo gia tri.
    if (!wrapBox || wrapBox.clientWidth < 100) return;

    const savedColor = pickerBox.color.hexString;
    const savedPicked = userHasPicked;
    suppressColorChange = true;
    wrapBox.innerHTML = "";
    wrapHue.innerHTML = "";
    // Iro co the set inline style tren wrap → clear de CSS gianh lai control
    wrapBox.removeAttribute("style");
    wrapHue.removeAttribute("style");
    pickerBox = null;
    pickerHue = null;
    initPickers(savedColor);
    userHasPicked = savedPicked;
    currentUserHex = savedColor;
    // Release suppression after the init's initial color:change events fire
    requestAnimationFrame(() => { suppressColorChange = false; });
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

    const brandLogo = document.getElementById("brand-logo");
    brandLogo.hidden = false;                            // hiện lại preview ô lớn
    Logo.render(brandLogo, brand, "idle");

    document.getElementById("picker-stage").hidden = false;
    document.getElementById("result-stage").hidden = true;
  }

  function renderReveal(result) {
    // Step 2: ẩn ô preview lớn — đã có pairing 2 card bên dưới
    document.getElementById("brand-logo").hidden = true;

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
    const stage = document.getElementById("result-stage");
    stage.hidden = false;
    // Restart entry animations on subsequent rounds
    stage.style.animation = "none";
    void stage.offsetWidth;
    stage.style.animation = "";
    if (window.FX) FX.applyResultBand(stage, result.score);
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
    let lastValue = -1;
    function tick(now) {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      const v = Math.round(eased * target);
      if (v !== lastValue) {
        const txt = `${v}%`;
        el.textContent = txt;
        if (window.MCWebGL && MCWebGL.updateScoreMask) MCWebGL.updateScoreMask(txt);
        lastValue = v;
      }
      if (t < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  function renderFinal() {
    const summary = Game.getFinalSummary();
    if (!summary) return;

    document.getElementById("final-score").textContent = "0%";
    if (window.MCWebGL && MCWebGL.updateScoreMask) MCWebGL.updateScoreMask("0%");
    animateFinalScore(summary.totalScore, 900);

    const finalScreen = document.getElementById("screen-final");
    if (window.FX) FX.applyFinalBand(finalScreen, summary.totalScore);

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
      await showScreen("screen-round");
      // Double rAF: ensure layout has been computed after display:flex applied.
      requestAnimationFrame(() => requestAnimationFrame(() => {
        // Force layout flush in case rAF runs before layout
        const wrap = document.getElementById("color-picker");
        if (wrap) void wrap.offsetWidth;

        if (!pickerBox || !pickerHue) {
          initPickers();
        } else {
          // Lan choi thu 2 tro di — rebuild voi size cua viewport hien tai
          // (de fix bug picker stale tu lan resize khi screen-round an)
          resizePickers();
        }
        renderRound(brand);
      }));
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
