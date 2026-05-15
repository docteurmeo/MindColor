// MindColor — logo loader
// Brand có `logo` field:
//   - "<slug>"  → dùng Simple Icons CDN (https://cdn.simpleicons.org/<slug>/<hex>)
//   - null      → fallback: thử dùng file local assets/logos/<id>.svg (mono),
//                            nếu không có thì hiện chữ initials
//
// Mode:
//   - "mono"  → trắng (#ffffff) cho phase trước khi submit
//   - "color" → màu gốc brand cho phase reveal

const Logo = (() => {
  function simpleIconsUrl(slug, hex) {
    // hex: không có dấu # cho Simple Icons. "color" mode = bỏ trống để dùng brand color gốc.
    const cleanHex = hex ? hex.replace("#", "") : "";
    return cleanHex
      ? `https://cdn.simpleicons.org/${slug}/${cleanHex}`
      : `https://cdn.simpleicons.org/${slug}`;
  }

  function localUrl(id) {
    return `assets/logos/${id}.svg`;
  }

  // Render <img> vào container. Tự fallback nếu lỗi.
  function render(container, brand, mode) {
    container.innerHTML = "";
    container.classList.toggle("logo-mono", mode === "mono");

    const img = document.createElement("img");
    img.alt = brand.name;
    img.className = "brand-logo-img";

    if (brand.logo) {
      // Simple Icons
      img.src = mode === "mono"
        ? simpleIconsUrl(brand.logo, "ffffff")
        : simpleIconsUrl(brand.logo, null);
    } else {
      // Local fallback
      img.src = localUrl(brand.id);
    }

    img.onerror = () => {
      // Fallback cuối: hiện initials
      container.innerHTML = "";
      const fallback = document.createElement("div");
      fallback.className = "brand-logo-fallback";
      fallback.textContent = brand.name.charAt(0).toUpperCase();
      if (mode === "color") fallback.style.background = brand.color;
      container.appendChild(fallback);
    };

    container.appendChild(img);
  }

  return { render };
})();
