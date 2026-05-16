// MindColor — logo renderer (CSS mask để tint logo theo bất kỳ màu nào)
//
// Modes:
//   - "idle"    → silhouette ghi #ccc2bd (chưa pick màu)
//   - "preview" → silhouette theo customColor (user đang pick)
//   - "color"   → silhouette theo brand.color (đáp án)
//   - "user"    → silhouette theo customColor (kết quả: màu user chọn)

const Logo = (() => {
  function localUrl(id) {
    return `assets/logos/${id}.svg`;
  }

  function colorFor(brand, mode, customColor) {
    if (mode === "idle")    return "#ccc2bd";
    if (mode === "preview") return customColor || "#ccc2bd";
    if (mode === "user")    return customColor || "#000";
    if (mode === "color")   return brand.color;
    return "#000";
  }

  function render(container, brand, mode, customColor) {
    container.innerHTML = "";

    const mask = document.createElement("div");
    mask.className = "logo-mask";
    const url = localUrl(brand.id);
    mask.style.webkitMaskImage = `url("${url}")`;
    mask.style.maskImage = `url("${url}")`;
    mask.style.backgroundColor = colorFor(brand, mode, customColor);
    container.appendChild(mask);

    // Validate SVG exists (fallback to letter)
    const probe = new Image();
    probe.onerror = () => {
      container.innerHTML = "";
      const fb = document.createElement("div");
      fb.className = "logo-fallback";
      fb.textContent = (brand.name || "?").charAt(0).toUpperCase();
      fb.style.background = colorFor(brand, mode, customColor);
      container.appendChild(fb);
    };
    probe.src = url;
  }

  // Cập nhật màu mà không tạo lại DOM (cho live preview khi kéo picker)
  function tint(container, color) {
    const mask = container.querySelector(".logo-mask");
    if (mask) mask.style.backgroundColor = color;
    const fb = container.querySelector(".logo-fallback");
    if (fb) fb.style.background = color;
  }

  return { render, tint };
})();
