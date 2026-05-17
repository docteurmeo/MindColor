// MindColor — FX module (confetti + page-blur transitions + result quality FX)

const FX = (() => {
  const reduced = () =>
    window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ---------- Confetti (subtle, ~12 particles) ----------
  function confetti(count = 12, opts = {}) {
    if (reduced()) return;
    const host = document.getElementById("fx-confetti");
    if (!host) return;
    const colors = opts.colors || ["#44dea8", "#fbbf24", "#fb923c", "#60a5fa", "#a78bfa", "#f472b6"];
    for (let i = 0; i < count; i++) {
      const p = document.createElement("span");
      p.className = "confetti-particle";
      const startX = 30 + Math.random() * 40;            // 30%..70% of viewport width
      const dx = (Math.random() * 60 - 30) + "vw";       // horizontal drift
      const rot = (Math.random() * 720 - 360) + "deg";
      const delay = Math.random() * 180;
      const dur = 1500 + Math.random() * 700;
      p.style.left = startX + "vw";
      p.style.background = colors[i % colors.length];
      p.style.setProperty("--dx", dx);
      p.style.setProperty("--rot", rot);
      p.style.animationDelay = delay + "ms";
      p.style.animationDuration = dur + "ms";
      host.appendChild(p);
      window.setTimeout(() => p.remove(), dur + delay + 200);
    }
  }

  // ---------- Page-blur transition between screens ----------
  // Apple-style: fade-in a blurred scrim → swap screen → fade-out
  function transitionTo(switchFn) {
    if (reduced()) { switchFn(); return Promise.resolve(); }
    const scrim = document.getElementById("fx-transition");
    return new Promise((resolve) => {
      if (!scrim) { switchFn(); resolve(); return; }
      scrim.classList.add("active");
      window.setTimeout(() => {
        switchFn();
        // Settle one frame, then fade scrim out
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            scrim.classList.remove("active");
            window.setTimeout(resolve, 340);
          });
        });
      }, 280);
    });
  }

  // ---------- Result quality FX ----------
  // Apply class to #result-stage based on score band
  function applyResultBand(stage, score) {
    stage.classList.remove("result-stage-high", "result-stage-mid", "result-stage-low");
    if (score >= 85) {
      stage.classList.add("result-stage-high");
      confetti(12);
    } else if (score >= 35) {
      stage.classList.add("result-stage-mid");
    } else {
      stage.classList.add("result-stage-low");
    }
  }

  // ---------- Final rank FX ----------
  function applyFinalBand(root, score) {
    root.classList.remove("final-rank-high", "final-rank-low");
    if (score >= 85) {
      root.classList.add("final-rank-high");
      window.setTimeout(() => confetti(20), 400);
    } else if (score < 30) {
      root.classList.add("final-rank-low");
    }
  }

  return { confetti, transitionTo, applyResultBand, applyFinalBand };
})();
