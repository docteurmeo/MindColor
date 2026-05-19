import { readFileSync, writeFileSync } from "node:fs";

const removed = [
  "paypal", "google", "bmw", "audi", "burger-king",
  "bidv", "pixar", "subway", "dominos", "jollibee", "lazada",
];

let csv = readFileSync("BRANDS_TRACKING.csv", "utf8");
function escapeId(id) { return id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }

for (const id of removed) {
  const re = new RegExp(`^(${escapeId(id)},[^,]+,[^,]+,[^,]+,)[^,]+,.*$`, "m");
  if (!re.test(csv)) { console.log("NO LINE:", id); continue; }
  csv = csv.replace(re, `$1Skipped,Multi-color brand identity (real-life logo uses 2+ colors) — not suitable for single-color guessing game`);
}
writeFileSync("BRANDS_TRACKING.csv", csv);
console.log("Marked Skipped:", removed.length);
