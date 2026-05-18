// MindColor — WebGL animated color field
// Shader adapted from https://codepen.io/MillerTime/pen/NWPPyrX (regl.js + GLSL).
//
// Auto-attaches to any <canvas data-webgl-color> on DOM ready. Shares one rAF
// loop across all canvases. Capped at DPR 2 to keep mobile GPU happy.

(function () {
  const VERT = `
    precision highp float;
    attribute vec2 position;
    varying vec2 v_position;
    void main() {
      gl_Position = vec4(position, 0, 1);
      v_position = (position + 1.0) * 0.5;
    }
  `;

  const FRAG = `
    precision highp float;
    uniform float u_time;
    uniform vec3 u_rotXOffset;
    uniform vec3 u_rotYOffset;
    uniform float u_g1FreqMult;
    varying vec2 v_position;
    const float TAU = 6.2831853072;
    void main() {
      vec3 xRot = u_rotXOffset * v_position.x;
      vec3 yRot = u_rotYOffset * v_position.y;
      vec3 r = vec3(
        cos((xRot[0] + yRot[0] * u_rotXOffset[2] * 2.0 + u_time / 8000.0) * TAU),
        cos((xRot[2] + yRot[2] * u_rotXOffset[2] + u_time / 8000.0) * TAU),
        sin((v_position.x * 0.4 - u_time / 16000.0) * TAU)
      );
      vec3 g = vec3(
        -cos(((xRot[0] + yRot[0]) * (u_g1FreqMult + 2.0) + u_time / 4000.0) * TAU),
        -cos((xRot[1] + yRot[1] * 0.8 - u_time / 4400.0) * TAU),
        sin((v_position.x * 0.5 + u_time / 20000.0) * TAU)
      );
      vec3 b = vec3(
        -cos((v_position.x * u_rotXOffset[0] * 1.65 - u_time / 2000.0) * TAU),
        -cos((v_position.x * 0.8 + u_time / 4000.0) * TAU),
        sin((v_position.y * 0.4 + u_time / 24000.0 + 0.75) * TAU)
      );
      r = (r + 1.0) / 2.0;
      g = (g + 1.0) / 2.0;
      b = (b + 1.0) / 2.0;
      gl_FragColor = vec4(
        (r[0] * 0.6 + r[1]) / 1.6 * (r[2] * 0.5 + 0.5),
        (g[0] * 0.6 + g[1]) / 1.6 * (g[2] * 0.5 + 0.5),
        (b[0] * 0.6 + b[1]) / 1.6 * (b[2] * 0.5 + 0.5),
        1.0
      );
    }
  `;

  const PREFERS_REDUCED = !!(window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches);

  const instances = new Map();
  const baseTime = performance.now();
  const startOffset = Math.random() * 60000;
  let rafId = null;

  function tickAll() {
    const trueTime = PREFERS_REDUCED
      ? 30000
      : (performance.now() - baseTime + startOffset);

    const a1 = trueTime / 120000 * Math.PI * 2;
    const a2 = a1 + 0.5;
    const a3 = a1 + Math.PI / 2;
    const u_rotXOffset = [Math.sin(a1), Math.sin(a2), Math.sin(a3)];
    const u_rotYOffset = [Math.cos(a1), Math.cos(a2), Math.cos(a3)];
    const u_g1FreqMult = Math.sin(trueTime / 24000 * Math.PI * 2);

    instances.forEach((inst) => {
      try {
        inst.draw({ u_time: trueTime, u_rotXOffset, u_rotYOffset, u_g1FreqMult });
      } catch (e) { /* canvas removed mid-frame */ }
    });

    rafId = PREFERS_REDUCED ? null : requestAnimationFrame(tickAll);
  }

  function startLoop() {
    if (rafId == null && instances.size > 0) {
      rafId = requestAnimationFrame(tickAll);
    }
  }

  function resizeCanvas(canvas) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = canvas.getBoundingClientRect();
    const w = Math.max(1, Math.round(rect.width  * dpr));
    const h = Math.max(1, Math.round(rect.height * dpr));
    if (canvas.width  !== w) canvas.width  = w;
    if (canvas.height !== h) canvas.height = h;
  }

  function attach(canvas) {
    if (instances.has(canvas)) return;
    if (typeof createREGL === "undefined") {
      console.warn("[MCWebGL] regl.js not loaded — animation disabled");
      return;
    }
    resizeCanvas(canvas);

    let regl;
    try {
      regl = createREGL({
        canvas,
        attributes: { preserveDrawingBuffer: false, antialias: false, alpha: true }
      });
    } catch (e) {
      console.warn("[MCWebGL] regl init failed", e);
      return;
    }

    const draw = regl({
      vert: VERT,
      frag: FRAG,
      attributes: {
        position: regl.buffer([
          [-1,  1], [ 1,  1], [-1, -1],
          [ 1, -1], [-1, -1], [ 1,  1]
        ])
      },
      uniforms: {
        u_time:        regl.prop("u_time"),
        u_rotXOffset:  regl.prop("u_rotXOffset"),
        u_rotYOffset:  regl.prop("u_rotYOffset"),
        u_g1FreqMult:  regl.prop("u_g1FreqMult")
      },
      count: 6
    });

    let ro = null;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(() => { resizeCanvas(canvas); regl.poll(); });
      ro.observe(canvas);
    }

    instances.set(canvas, { regl, draw, ro });
    if (PREFERS_REDUCED) tickAll();
    else startLoop();
  }

  function detach(canvas) {
    const inst = instances.get(canvas);
    if (!inst) return;
    try { inst.ro && inst.ro.disconnect(); } catch (e) {}
    try { inst.regl.destroy(); } catch (e) {}
    instances.delete(canvas);
    if (instances.size === 0 && rafId != null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  }

  function autoAttach() {
    document.querySelectorAll("canvas[data-webgl-color]").forEach(attach);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", autoAttach);
  } else {
    autoAttach();
  }

  // ---------- Score text mask ----------
  // Renders text into an off-screen 2D canvas using the page's loaded
  // Clash Display font, then sets it as mask-image on #final-score-overlay.
  // Mask canvas resizes to match the overlay → no aspect distortion.

  let fontReady = false;
  if (document.fonts && document.fonts.load) {
    document.fonts.load('700 320px "Clash Display"').then(
      () => { fontReady = true; },
      () => { fontReady = true; }   // fall back to system font on failure
    );
    // Safety: don't block forever if font promise never resolves.
    setTimeout(() => { fontReady = true; }, 3000);
  } else {
    fontReady = true;
  }

  let maskCanvas = null;
  let lastMaskText = null;

  function updateScoreMask(text) {
    const overlay = document.getElementById("final-score-overlay");
    if (!overlay) return;
    if (!fontReady) { setTimeout(() => updateScoreMask(text), 60); return; }

    const rect = overlay.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {
      // Overlay not visible yet (final screen hidden) — retry shortly.
      setTimeout(() => updateScoreMask(text), 80);
      return;
    }

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (!maskCanvas) maskCanvas = document.createElement("canvas");
    maskCanvas.width  = Math.max(1, Math.round(rect.width  * dpr));
    maskCanvas.height = Math.max(1, Math.round(rect.height * dpr));

    const ctx = maskCanvas.getContext("2d");
    ctx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
    // Opaque white everywhere → overlay fully visible by default.
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, maskCanvas.width, maskCanvas.height);
    // Punch transparent holes in shape of text → canvas shows through.
    ctx.globalCompositeOperation = "destination-out";
    ctx.fillStyle = "black";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const fontSize = maskCanvas.height * 0.78;
    ctx.font = '700 ' + fontSize + 'px "Clash Display", sans-serif';
    ctx.fillText(text, maskCanvas.width / 2, maskCanvas.height / 2);
    ctx.globalCompositeOperation = "source-over";

    const url = maskCanvas.toDataURL("image/png");
    overlay.style.webkitMaskImage = "url(" + url + ")";
    overlay.style.maskImage       = "url(" + url + ")";
    lastMaskText = text;
  }

  // Re-render mask on viewport resize so digits stay crisp.
  let resizeRaf = null;
  window.addEventListener("resize", () => {
    if (lastMaskText == null) return;
    if (resizeRaf) cancelAnimationFrame(resizeRaf);
    resizeRaf = requestAnimationFrame(() => {
      resizeRaf = null;
      updateScoreMask(lastMaskText);
    });
  });

  window.MCWebGL = { attach, detach, updateScoreMask };
})();
