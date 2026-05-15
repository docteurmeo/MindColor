// MindColor — logo loader (chỉ dùng SVG local)
//
// Brand id → file assets/logos/<id>.svg
//
// Mode:
//   - "mono"  → silhouette trắng (CSS filter brightness(0) invert(1))
//   - "color" → màu gốc SVG

const Logo = (() => {
  function localUrl(id) {
    return `assets/logos/${id}.svg`;
  }

  function render(container, brand, mode) {
    container.innerHTML = '';
    container.classList.toggle('logo-mono', mode === 'mono');
    container.classList.toggle('logo-color', mode === 'color');

    const img = document.createElement('img');
    img.alt = brand.name;
    img.className = 'brand-logo-img';
    img.src = localUrl(brand.id);

    img.onerror = () => {
      container.innerHTML = '';
      const fallback = document.createElement('div');
      fallback.className = 'brand-logo-fallback';
      fallback.textContent = brand.name.charAt(0).toUpperCase();
      if (mode === 'color') fallback.style.background = brand.color;
      container.appendChild(fallback);
    };

    container.appendChild(img);
  }

  return { render };
})();
