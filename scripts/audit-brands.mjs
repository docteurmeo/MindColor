import fs from "node:fs";
import path from "node:path";

const brands = JSON.parse(fs.readFileSync("data/brands.json", "utf8"));
const logosDir = path.join("assets", "logos");

function normalizeHex(value) {
  if (!value) return null;
  const raw = value.trim();
  if (/^rgb/i.test(raw)) {
    const nums = raw.match(/\d+/g);
    if (!nums || nums.length < 3) return null;
    return `#${nums
      .slice(0, 3)
      .map((n) => Number(n).toString(16).padStart(2, "0"))
      .join("")
      .toUpperCase()}`;
  }
  if (!raw.startsWith("#")) return null;
  if (raw.length === 4) {
    return `#${raw
      .slice(1)
      .split("")
      .map((c) => c + c)
      .join("")
      .toUpperCase()}`;
  }
  if (raw.length >= 7) return raw.slice(0, 7).toUpperCase();
  return null;
}

function countTag(svg, tagName) {
  return (svg.match(new RegExp(`<${tagName}\\b`, "gi")) || []).length;
}

const rows = brands.map((brand) => {
  const file = path.join(logosDir, `${brand.id}.svg`);
  const exists = fs.existsSync(file);
  const svg = exists ? fs.readFileSync(file, "utf8") : "";
  const rootFill = (svg.match(/<svg\b[^>]*\bfill=["']([^"']+)/i) || [])[1] || "";
  const colors = [
    ...new Set(
      (svg.match(/#(?:[0-9a-fA-F]{3,8})\b|rgb\([^)]*\)/g) || [])
        .map(normalizeHex)
        .filter(Boolean),
    ),
  ];
  const fills = [
    ...new Set(
      [...svg.matchAll(/\bfill=["']([^"']+)/gi)]
        .map((m) => m[1])
        .filter((value) => value !== "none"),
    ),
  ];
  const tags = {
    path: countTag(svg, "path"),
    rect: countTag(svg, "rect"),
    circle: countTag(svg, "circle"),
    ellipse: countTag(svg, "ellipse"),
    polygon: countTag(svg, "polygon"),
    polyline: countTag(svg, "polyline"),
    text: countTag(svg, "text"),
    image: countTag(svg, "image"),
    use: countTag(svg, "use"),
    style: countTag(svg, "style"),
  };
  const shapeTags = Object.entries(tags)
    .filter(([tag]) => tag !== "style")
    .reduce((sum, [, count]) => sum + count, 0);
  const viewBox = (svg.match(/viewBox=["']([^"']+)/i) || [])[1] || "";
  const viewBoxParts = viewBox
    .trim()
    .split(/[ ,]+/)
    .map(Number);
  const aspectRatio =
    viewBoxParts.length >= 4 && viewBoxParts.every((part) => Number.isFinite(part))
      ? Math.abs(viewBoxParts[2] / viewBoxParts[3])
      : null;
  const flags = [];

  if (!exists) flags.push("missing-file");
  if (!svg.includes("<svg")) flags.push("no-svg");
  if (!viewBox) flags.push("no-viewBox");
  if (shapeTags === 0) flags.push("no-shape-tags");
  if (tags.text) flags.push("text-element");
  if (tags.image) flags.push("raster-image");
  if (tags.style) flags.push("style-block");
  if (colors.length > 1) flags.push("multi-hex-in-file");
  if (rootFill && normalizeHex(rootFill) !== brand.color.toUpperCase()) flags.push("root-fill-vs-json");
  if (fills.length > 1) flags.push("multiple-fill-attrs");

  return {
    id: brand.id,
    name: brand.name,
    jsonColor: brand.color,
    rootFill,
    colors: colors.join(" "),
    fills: fills.join(" "),
    viewBox,
    aspectRatio,
    bytes: svg.length,
    tags,
    flags: flags.join(","),
  };
});

const flagged = rows.filter((row) => row.flags);
console.log(JSON.stringify({ total: rows.length, flaggedCount: flagged.length, flagged, rows }, null, 2));
