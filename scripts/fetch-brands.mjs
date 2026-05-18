// MindColor — batch-fetch brand SVGs from Wikimedia Commons.
//
// Reads a JSON manifest of brand specs, searches Commons, downloads the
// best-matching SVG, normalizes (single fill color, strips background rect,
// strips metadata), writes to assets/logos/.
//
// Manifest format (scripts/brand-batch.json):
//   [
//     { "id": "marvel", "search": "Marvel Logo", "color": "#ED1D24" },
//     ...
//   ]
//
// Usage:
//   node scripts/fetch-brands.mjs scripts/brand-batch.json
//
// Behavior:
//   - 12s delay between file downloads (avoids Wikimedia 429)
//   - Auto-retries 429 once after 30s
//   - Prefers filename containing "logo" / "wordmark"; avoids "old", "blank", "outline"
//   - Skips brands whose SVG already exists in assets/logos/

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const TMP_DIR = join(ROOT, "tmp-svg");
const DST_DIR = join(ROOT, "assets", "logos");
const UA = "MindColor-Research/1.0 (research project)";

if (!existsSync(TMP_DIR)) mkdirSync(TMP_DIR, { recursive: true });

const FILE_DOWNLOAD_DELAY = 12000;   // 12s between upload.wikimedia.org fetches
const RETRY_DELAY = 30000;            // 30s on 429

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function wmFetch(url, { isFile = false } = {}) {
  for (let attempt = 0; attempt < 2; attempt++) {
    const r = await fetch(url, { headers: { "User-Agent": UA } });
    if (r.status === 429) {
      console.log(`  [429] ${url} — wait ${RETRY_DELAY/1000}s`);
      await sleep(RETRY_DELAY);
      continue;
    }
    if (!r.ok) throw new Error(`${r.status} ${url}`);
    return isFile ? await r.arrayBuffer() : await r.json();
  }
  throw new Error(`Persistent 429 on ${url}`);
}

// Search Commons for SVG files matching the brand. Require search keywords
// to appear in the FILENAME (not just in indexed content) — Wikimedia's full-text
// search returns false matches otherwise.
async function findBestFile(searchQ) {
  const url = `https://commons.wikimedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(searchQ + " filetype:svg")}&srnamespace=6&format=json&srlimit=10`;
  const j = await wmFetch(url);
  const hits = (j?.query?.search || []).map(h => h.title);
  if (hits.length === 0) return null;

  // Extract main keywords (length ≥ 3, drop generic words)
  const generic = new Set(["logo", "wordmark", "icon", "the", "and", "svg", "file"]);
  const keywords = searchQ.toLowerCase().split(/\s+/).filter(w => w.length >= 3 && !generic.has(w));

  const scored = hits.map(title => {
    const lc = title.toLowerCase().replace(/^file:/, "");
    let score = 0;
    // Require at least one main keyword in filename — else disqualify.
    const keywordMatch = keywords.some(k => lc.includes(k));
    if (!keywordMatch && keywords.length > 0) return { title, score: -100 };

    if (lc.includes("logo")) score += 3;
    if (lc.includes("wordmark")) score += 2;
    if (lc.match(/\b20[12]\d\b/)) score += 2;            // recent year-stamped
    if (lc.match(/\b(19\d{2}|200[0-9])\b/)) score -= 2;  // older year
    if (lc.includes("old") || lc.includes("former") || lc.includes("historic")) score -= 5;
    if (lc.includes("outline") || lc.includes("monochrome") || lc.includes("black")) score -= 3;
    if (lc.includes("seal") || lc.includes("crest") || lc.includes("flag")) score -= 2;
    if (lc.includes("3d") || lc.includes("banner")) score -= 1;
    if (lc.includes("simple") || lc.includes("flat")) score += 1;
    // Penalize hits about unrelated entities (city, district, religious, etc.)
    if (lc.match(/\b(city|district|province|county|state|municipal)\b/)) score -= 5;
    // Bonus if all keywords appear
    const allMatch = keywords.every(k => lc.includes(k));
    if (allMatch) score += 5;
    return { title, score };
  });
  scored.sort((a, b) => b.score - a.score);
  if (scored[0].score < 0) return null;          // no acceptable match
  return scored[0].title;
}

async function fileUrl(title) {
  const url = `https://commons.wikimedia.org/w/api.php?action=query&titles=${encodeURIComponent(title)}&prop=imageinfo&iiprop=url&format=json`;
  const j = await wmFetch(url);
  const pages = j?.query?.pages || {};
  const page = Object.values(pages)[0];
  return page?.imageinfo?.[0]?.url?.replace(/\?.*$/, "") || null;
}

async function download(url, dst) {
  const buf = await wmFetch(url, { isFile: true });
  writeFileSync(dst, Buffer.from(buf));
}

// Normalize SVG (same logic as normalize-svg.mjs, inlined for self-contained script)
function normalize(raw, brandColor, brandName) {
  let s = raw;
  s = s.replace(/<\?xml[^?]*\?>/g, "");
  s = s.replace(/<!--[\s\S]*?-->/g, "");
  s = s.replace(/<!DOCTYPE[^>]*>/g, "");
  s = s.replace(/<metadata[\s\S]*?<\/metadata>/gi, "");
  s = s.replace(/<sodipodi:[^>]*\/>/gi, "");
  s = s.replace(/\s(inkscape|sodipodi|rdf|cc|dc):[a-zA-Z-]+="[^"]*"/g, "");
  s = s.replace(/\sxmlns:(inkscape|sodipodi|rdf|cc|dc)="[^"]*"/g, "");
  s = s.replace(/<title>[\s\S]*?<\/title>/gi, "");

  const svgOpenMatch = s.match(/<svg\b[^>]*>/);
  if (!svgOpenMatch) throw new Error("No <svg> tag");
  let svgOpen = svgOpenMatch[0];
  if (!/viewBox=/i.test(svgOpen)) {
    const w = svgOpen.match(/\bwidth="([0-9.]+)/);
    const h = svgOpen.match(/\bheight="([0-9.]+)/);
    if (w && h) svgOpen = svgOpen.replace(/<svg\b/, `<svg viewBox="0 0 ${w[1]} ${h[1]}"`);
    else throw new Error("No viewBox and no width/height");
  }
  svgOpen = svgOpen.replace(/\s(width|height)="[^"]*"/g, "");
  svgOpen = svgOpen.replace(/\sfill="[^"]*"/gi, "");
  s = s.replace(/<svg\b[^>]*>/, svgOpen);

  // Strip full-viewBox <rect> backgrounds (Nintendo bug).
  const vbMatch = s.match(/viewBox="([\d.\-]+)\s+([\d.\-]+)\s+([\d.\-]+)\s+([\d.\-]+)"/);
  if (vbMatch) {
    const vbW = parseFloat(vbMatch[3]);
    const vbH = parseFloat(vbMatch[4]);
    s = s.replace(/<rect\b[^>]*?\/>/gi, (m) => {
      const w = m.match(/\bwidth="([\d.]+)"/);
      const h = m.match(/\bheight="([\d.]+)"/);
      if (w && h) {
        const rw = parseFloat(w[1]);
        const rh = parseFloat(h[1]);
        if (rw >= vbW * 0.95 && rh >= vbH * 0.95) return "";
      }
      return m;
    });
  }

  s = s.replace(/\sfill="(?!none)[^"]*"/gi, "");
  s = s.replace(/style="([^"]*)"/g, (m, css) => {
    const cleaned = css.replace(/(^|;)\s*fill\s*:\s*[^;]+/gi, "$1").replace(/;{2,}/g, ";").replace(/^;|;$/g, "").trim();
    return cleaned ? `style="${cleaned}"` : "";
  });
  s = s.replace(/<style[\s\S]*?<\/style>/gi, "");
  s = s.replace(/<svg\b/, `<svg fill="${brandColor}"`);
  s = s.replace(/(<svg\b[^>]*>)/, `$1<title>${brandName}</title>`);
  s = s.replace(/>\s+</g, "><").trim();
  return s;
}

function titleCase(id) {
  return id.split("-").map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(" ");
}

// ---------- main ----------

const manifestPath = process.argv[2];
if (!manifestPath) {
  console.error("Usage: node scripts/fetch-brands.mjs <manifest.json>");
  process.exit(1);
}
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));

const results = { ok: [], skip: [], fail: [] };

for (const spec of manifest) {
  const { id, search, color, force, file } = spec;
  const dstSvg = join(DST_DIR, `${id}.svg`);
  if (existsSync(dstSvg) && !force) {
    console.log(`[skip] ${id} already exists`);
    results.skip.push(id);
    continue;
  }
  console.log(`[fetch] ${id} (${file ? `file: ${file}` : `search: "${search}"`})`);
  try {
    // If a specific filename is provided, use it directly (bypass search).
    const title = file ? (file.startsWith("File:") ? file : `File:${file}`)
                       : await findBestFile(search);
    if (!title) { console.log(`  NO MATCH for "${search}"`); results.fail.push({ id, reason: "no match" }); continue; }
    console.log(`  ${file ? "file" : "found"}: ${title}`);
    const url = await fileUrl(title);
    if (!url) { console.log(`  no URL`); results.fail.push({ id, reason: "no URL" }); continue; }
    console.log(`  url: ${url}`);
    const tmp = join(TMP_DIR, `${id}.svg`);
    await download(url, tmp);
    const raw = readFileSync(tmp, "utf8");
    const out = normalize(raw, color, spec.name || titleCase(id));
    writeFileSync(dstSvg, out, "utf8");
    console.log(`  ✓ ${id} → ${dstSvg} (${out.length} bytes, fill=${color})`);
    results.ok.push(id);
  } catch (e) {
    console.log(`  FAIL ${id}: ${e.message}`);
    results.fail.push({ id, reason: e.message });
  }
  // throttle between brands
  await sleep(FILE_DOWNLOAD_DELAY);
}

console.log("\n=== Summary ===");
console.log(`OK   (${results.ok.length}): ${results.ok.join(", ")}`);
console.log(`Skip (${results.skip.length}): ${results.skip.join(", ")}`);
console.log(`Fail (${results.fail.length}):`);
results.fail.forEach(f => console.log(`  - ${f.id}: ${f.reason}`));
