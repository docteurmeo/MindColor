// MindColor — Share grid (text) + Share card (PNG via Canvas)

const Share = (() => {
  const SITE_URL = "mindcolor.xyz"; // sẽ đổi thành domain thật sau

  // ---------- Share grid (text emoji) ----------

  function scoreToEmoji(score) {
    if (score >= 85) return "🟩";
    if (score >= 60) return "🟨";
    if (score >= 35) return "🟧";
    return "🟥";
  }

  function buildShareGrid(summary) {
    const grid = summary.results.map(r => scoreToEmoji(r.score)).join("");
    const header = summary.mode === "daily"
      ? `MindColor Daily #${summary.gameNumber}`
      : `MindColor Classic #${summary.gameNumber}`;
    return `${header} — ${summary.totalScore}% ${summary.rank.emoji}\n${grid}\n${SITE_URL}`;
  }

  async function copyShareGrid(summary) {
    const text = buildShareGrid(summary);
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (e) {
      // fallback (older browsers)
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      return true;
    }
  }

  // ---------- Share card (PNG) ----------

  function buildShareCard(summary) {
    const W = 1200, H = 630;
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");

    // Background
    ctx.fillStyle = "#0f0f12";
    ctx.fillRect(0, 0, W, H);

    // Subtle gradient corner
    const grad = ctx.createLinearGradient(0, 0, W, H);
    grad.addColorStop(0, "rgba(96,165,250,0.08)");
    grad.addColorStop(1, "rgba(192,132,252,0.08)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // MindColor logo top-left
    ctx.fillStyle = "#f5f5f7";
    ctx.font = "800 44px -apple-system, Segoe UI, Roboto, sans-serif";
    ctx.textBaseline = "top";
    ctx.fillText("MindColor", 60, 50);

    ctx.fillStyle = "#a1a1aa";
    ctx.font = "500 20px -apple-system, Segoe UI, Roboto, sans-serif";
    ctx.fillText("Bạn nhớ màu brand giỏi tới đâu?", 60, 105);

    // Big score
    ctx.fillStyle = "#f5f5f7";
    ctx.font = "900 200px -apple-system, Segoe UI, Roboto, sans-serif";
    ctx.textBaseline = "middle";
    const scoreText = `${summary.totalScore}`;
    const scoreW = ctx.measureText(scoreText).width;
    const scoreX = (W - scoreW) / 2 - 30;
    const scoreY = 280;
    ctx.fillText(scoreText, scoreX, scoreY);

    ctx.fillStyle = "#a1a1aa";
    ctx.font = "700 80px -apple-system, Segoe UI, Roboto, sans-serif";
    ctx.fillText("%", scoreX + scoreW + 10, scoreY + 30);

    // Rank
    ctx.fillStyle = "#f5f5f7";
    ctx.font = "700 36px -apple-system, Segoe UI, Roboto, sans-serif";
    const rankText = `${summary.rank.emoji}  ${summary.rank.label}`;
    const rankW = ctx.measureText(rankText).width;
    ctx.fillText(rankText, (W - rankW) / 2, 420);

    // 10 swatch pairs (user vs brand)
    const totalCount = summary.results.length;
    const cellW = 80;
    const cellGap = 16;
    const totalRowW = totalCount * cellW + (totalCount - 1) * cellGap;
    const startX = (W - totalRowW) / 2;
    const rowY = 490;

    summary.results.forEach((r, i) => {
      const x = startX + i * (cellW + cellGap);
      // user (top half)
      ctx.fillStyle = r.userColor;
      ctx.fillRect(x, rowY, cellW, 32);
      // brand (bottom half)
      ctx.fillStyle = r.brandColor;
      ctx.fillRect(x, rowY + 32, cellW, 32);
      // score emoji below
      ctx.fillStyle = "#a1a1aa";
      ctx.font = "600 18px -apple-system, Segoe UI, Roboto, sans-serif";
      ctx.textBaseline = "top";
      const label = scoreToEmoji(r.score);
      const labelW = ctx.measureText(label).width;
      ctx.fillText(label, x + (cellW - labelW) / 2, rowY + 72);
    });

    // URL footer
    ctx.fillStyle = "#71717a";
    ctx.font = "500 22px -apple-system, Segoe UI, Roboto, sans-serif";
    ctx.textBaseline = "bottom";
    const url = SITE_URL;
    const urlW = ctx.measureText(url).width;
    ctx.fillText(url, (W - urlW) / 2, H - 30);

    return canvas;
  }

  function downloadShareCard(summary) {
    const canvas = buildShareCard(summary);
    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = `mindcolor-${summary.totalScore}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  return {
    buildShareGrid,
    copyShareGrid,
    buildShareCard,
    downloadShareCard,
    scoreToEmoji,
  };
})();
