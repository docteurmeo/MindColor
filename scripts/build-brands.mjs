// Build data/brands.json from assets/logos/*.svg
// Chạy tự động bởi GitHub Action mỗi khi có thay đổi trong assets/logos/.

import fs from 'fs';
import path from 'path';

const LOGOS_DIR = 'assets/logos';
const OVERRIDES = path.join(LOGOS_DIR, '_overrides.json');
const OUTPUT = 'data/brands.json';

// ---------- helpers ----------

function deriveId(filename) {
  return filename.replace(/\.svg$/i, '').toLowerCase();
}

function deriveName(filename) {
  // "coca-cola.svg" -> "Coca-Cola"
  // "tiffany-and-co.svg" -> "Tiffany And Co"
  const base = filename.replace(/\.svg$/i, '');
  return base
    .split(/[-_]+/)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function normalizeHex(hex) {
  if (!hex) return null;
  hex = hex.trim().toLowerCase();
  if (hex.startsWith('rgb')) {
    const nums = hex.match(/\d+/g);
    if (!nums || nums.length < 3) return null;
    return '#' + nums.slice(0, 3).map(n => Number(n).toString(16).padStart(2, '0')).join('').toUpperCase();
  }
  if (!hex.startsWith('#')) return null;
  if (hex.length === 4) {
    return ('#' + hex.slice(1).split('').map(c => c + c).join('')).toUpperCase();
  }
  if (hex.length === 7) return hex.toUpperCase();
  if (hex.length === 9) return hex.slice(0, 7).toUpperCase(); // drop alpha
  return null;
}

function isNeutral(hex) {
  // bỏ qua trắng, đen, xám trung tính
  if (!hex) return true;
  const m = hex.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  if (!m) return true;
  const [r, g, b] = [m[1], m[2], m[3]].map(x => parseInt(x, 16));
  // gần trắng
  if (r > 240 && g > 240 && b > 240) return true;
  // gần đen
  if (r < 15 && g < 15 && b < 15) return true;
  // gần xám (sat thấp)
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max - min < 15) return true;
  return false;
}

function extractColor(svg) {
  // Lấy tất cả màu fill / stop-color / style fill
  const candidates = [];

  const fillAttr = [...svg.matchAll(/\bfill\s*=\s*["']?(#[0-9a-fA-F]{3,8}|rgb\([^)]+\))/g)];
  for (const m of fillAttr) candidates.push(normalizeHex(m[1]));

  const stopColor = [...svg.matchAll(/stop-color\s*[:=]\s*["']?(#[0-9a-fA-F]{3,8}|rgb\([^)]+\))/g)];
  for (const m of stopColor) candidates.push(normalizeHex(m[1]));

  const styleFill = [...svg.matchAll(/fill\s*:\s*(#[0-9a-fA-F]{3,8}|rgb\([^)]+\))/g)];
  for (const m of styleFill) candidates.push(normalizeHex(m[1]));

  // Đếm tần suất, ưu tiên màu không neutral
  const count = {};
  for (const c of candidates) {
    if (!c || isNeutral(c)) continue;
    count[c] = (count[c] || 0) + 1;
  }

  const sorted = Object.entries(count).sort((a, b) => b[1] - a[1]);
  if (sorted.length > 0) return sorted[0][0];

  // Fallback: nếu chỉ có neutral, lấy neutral đầu tiên
  for (const c of candidates) {
    if (c) return c;
  }

  return '#888888';
}

// ---------- main ----------

if (!fs.existsSync(LOGOS_DIR)) {
  console.log(`Folder ${LOGOS_DIR} chưa tồn tại — bỏ qua.`);
  fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
  fs.writeFileSync(OUTPUT, '[]');
  process.exit(0);
}

let overrides = {};
if (fs.existsSync(OVERRIDES)) {
  try {
    overrides = JSON.parse(fs.readFileSync(OVERRIDES, 'utf8'));
  } catch (e) {
    console.warn('_overrides.json không hợp lệ — bỏ qua.', e.message);
  }
}

const files = fs.readdirSync(LOGOS_DIR)
  .filter(f => f.toLowerCase().endsWith('.svg'))
  .sort();

const brands = files.map(filename => {
  const id = deriveId(filename);
  const content = fs.readFileSync(path.join(LOGOS_DIR, filename), 'utf8');

  const auto = {
    id,
    name: deriveName(filename),
    color: extractColor(content),
  };

  // Apply override nếu có
  const ov = overrides[id] || {};
  return {
    id: auto.id,
    name: ov.name || auto.name,
    color: ov.color ? normalizeHex(ov.color) || auto.color : auto.color,
    difficulty: ov.difficulty || 2,
  };
});

fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
fs.writeFileSync(OUTPUT, JSON.stringify(brands, null, 2) + '\n');
console.log(`✓ Built ${brands.length} brand(s) → ${OUTPUT}`);
brands.forEach(b => console.log(`  - ${b.id} (${b.color}) — ${b.name}`));
