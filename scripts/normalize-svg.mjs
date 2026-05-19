// MindColor — normalize downloaded brand SVGs to a consistent format.
//
// Input:  raw SVGs in a directory (varied formats — Wikimedia, VLZ, etc.)
// Output: cleaned SVGs in assets/logos/ with:
//   - Proper viewBox (computed from width/height if missing)
//   - Single brand-color fill on the <svg> element (overrides per-element fills)
//   - No <metadata>, <title>, comments, XML decl, Inkscape namespaces
//   - clipPath/mask defs preserved (Vietcombank etc. need them)
//
// Usage:
//   node scripts/normalize-svg.mjs <id>=<colorHex> [<id>=<colorHex>...]
//   e.g. node scripts/normalize-svg.mjs pepsi=#004B93 nintendo=#E60012
//
// Reads from: tmp-svg/<id>.svg
// Writes to:  assets/logos/<id>.svg

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const SRC_DIR = join(ROOT, "tmp-svg");
const DST_DIR = join(ROOT, "assets", "logos");

function normalize(raw, brandColor, brandName) {
  let s = raw;
  // Strip XML declaration + comments + DOCTYPE
  s = s.replace(/<\?xml[^?]*\?>/g, "");
  s = s.replace(/<!--[\s\S]*?-->/g, "");
  s = s.replace(/<!DOCTYPE[^>]*>/g, "");
  // Strip metadata blocks (Inkscape, RDF)
  s = s.replace(/<metadata[\s\S]*?<\/metadata>/gi, "");
  s = s.replace(/<sodipodi:[^>]*\/>/gi, "");
  s = s.replace(/<defs>\s*<\/defs>/gi, "");
  // Drop Inkscape/sodipodi attributes (whitespace-only after = ignored)
  s = s.replace(/\s(inkscape|sodipodi|rdf|cc|dc):[a-zA-Z-]+="[^"]*"/g, "");
  s = s.replace(/\sxmlns:(inkscape|sodipodi|rdf|cc|dc)="[^"]*"/g, "");
  // Drop existing <title> (we'll re-add)
  s = s.replace(/<title>[\s\S]*?<\/title>/gi, "");

  // Find the <svg ...> opening tag
  const svgOpenMatch = s.match(/<svg\b[^>]*>/);
  if (!svgOpenMatch) throw new Error("No <svg> tag");
  let svgOpen = svgOpenMatch[0];

  // Ensure viewBox: if missing, derive from width/height
  if (!/viewBox=/i.test(svgOpen)) {
    const w = svgOpen.match(/\bwidth="([0-9.]+)/);
    const h = svgOpen.match(/\bheight="([0-9.]+)/);
    if (w && h) {
      svgOpen = svgOpen.replace(/<svg\b/, `<svg viewBox="0 0 ${w[1]} ${h[1]}"`);
    } else {
      throw new Error("No viewBox and no width/height");
    }
  }

  // Drop width/height attrs from <svg> (let CSS size it)
  svgOpen = svgOpen.replace(/\s(width|height)="[^"]*"/g, "");
  // Drop existing fill on <svg> tag
  svgOpen = svgOpen.replace(/\sfill="[^"]*"/gi, "");
  s = s.replace(/<svg\b[^>]*>/, svgOpen);

  // Strip full-viewBox background shapes (rect/circle/ellipse). Nintendo had
  // rect, Nivea had circle. Anything covering ≥95% of viewBox swallows the
  // logo silhouette when used as mask.
  const vbMatch = s.match(/viewBox="([\d.\-]+)\s+([\d.\-]+)\s+([\d.\-]+)\s+([\d.\-]+)"/);
  if (vbMatch) {
    const vbW = parseFloat(vbMatch[3]);
    const vbH = parseFloat(vbMatch[4]);
    s = s.replace(/<rect\b[^>]*?\/>/gi, (m) => {
      const w = m.match(/\bwidth="([\d.]+)"/);
      const h = m.match(/\bheight="([\d.]+)"/);
      if (w && h && parseFloat(w[1]) >= vbW * 0.95 && parseFloat(h[1]) >= vbH * 0.95) return "";
      return m;
    });
    s = s.replace(/<circle\b[^>]*?\/>/gi, (m) => {
      const r = m.match(/\br="([\d.]+)"/);
      if (r && parseFloat(r[1]) >= Math.min(vbW, vbH) * 0.45) return "";
      return m;
    });
    s = s.replace(/<ellipse\b[^>]*?\/>/gi, (m) => {
      const rx = m.match(/\brx="([\d.]+)"/);
      const ry = m.match(/\bry="([\d.]+)"/);
      if (rx && ry && parseFloat(rx[1]) >= vbW * 0.45 && parseFloat(ry[1]) >= vbH * 0.45) return "";
      return m;
    });
  }

  // Strip per-element fill attributes so root fill cascades.
  // Keep "none" fills (those mark cut-outs / non-filled regions).
  s = s.replace(/\sfill="(?!none)[^"]*"/gi, "");
  // Strip CSS `fill:` inside style="..." (would override root). Conservative
  // — only remove the property, keep rest of style.
  s = s.replace(/style="([^"]*)"/g, (m, css) => {
    const cleaned = css.replace(/(^|;)\s*fill\s*:\s*[^;]+/gi, "$1").replace(/;{2,}/g, ";").replace(/^;|;$/g, "").trim();
    return cleaned ? `style="${cleaned}"` : "";
  });
  // Strip <style> blocks that define .stN { fill:... } — they cascade unpredictably
  s = s.replace(/<style[\s\S]*?<\/style>/gi, "");

  // NOW inject brand fill on root (after all strip passes so it survives)
  s = s.replace(/<svg\b/, `<svg fill="${brandColor}"`);

  // Insert <title> right after opening svg tag
  s = s.replace(/(<svg\b[^>]*>)/, `$1<title>${brandName}</title>`);

  // Collapse whitespace between tags + outer whitespace
  s = s.replace(/>\s+</g, "><").trim();
  return s;
}

function titleCase(id) {
  return id.split("-").map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(" ");
}

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error("Usage: node normalize-svg.mjs <id>=<colorHex> [...]");
  process.exit(1);
}

for (const arg of args) {
  const [id, hex] = arg.split("=");
  if (!id || !hex) { console.error(`Bad arg: ${arg}`); continue; }
  const src = join(SRC_DIR, `${id}.svg`);
  const dst = join(DST_DIR, `${id}.svg`);
  if (!existsSync(src)) { console.error(`MISS source: ${src}`); continue; }
  try {
    const raw = readFileSync(src, "utf8");
    const out = normalize(raw, hex, titleCase(id));
    writeFileSync(dst, out, "utf8");
    console.log(`OK ${id} (${raw.length} → ${out.length} bytes, fill=${hex})`);
  } catch (e) {
    console.error(`FAIL ${id}: ${e.message}`);
  }
}
