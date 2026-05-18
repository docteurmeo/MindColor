import { readFileSync, writeFileSync } from "node:fs";

const ok = [
  ["marvel", "Wikimedia Commons (Marvel logo 2000-2012 #ED1D24)"],
  ["pizza-hut", "Wikimedia Commons (Pizza Hut 2025 #EE3424)"],
  ["dominos", "Wikimedia Commons (Dominos pizza logo #E31837)"],
  ["subway", "Wikimedia Commons (Subway 2016 logo #008C15)"],
  ["heineken", "Wikimedia Commons (Heineken Logo #006A36)"],
  ["xbox", "Wikimedia Commons (Xbox logo 2019 #107C10)"],
  ["dc", "Wikimedia Commons (DC Comics logo #0067B1)"],
  ["pixar", "Wikimedia Commons (Pixar logo cropped #0090D5)"],
  ["lotteria", "Wikimedia Commons (Lotteria logo 2024 #EC1C24)"],
  ["clinique", "Wikimedia Commons (Clinique logo #01A6D1)"],
  ["nivea", "Wikimedia Commons (NIVEA logo 2021 #003E7E)"],
  ["dove", "Wikimedia Commons (Dove dove #0073C6)"],
  ["shiseido", "Wikimedia Commons (Shiseido logo #E60012)"],
  ["lacoste", "Wikimedia Commons (Lacoste wordmark 2011 #1C8740)"],
  ["jollibee", "Wikimedia Commons (Jollibee Foods Corporation #E11932)"],
  ["lazada", "Wikimedia Commons (Lazada 2019 #0E1A8B)"],
  ["realme", "Wikimedia Commons (Realme 7 logo #FFC900)"],
  ["bidv", "Wikimedia Commons (Logo BIDV #008C44)"],
  ["vpbank", "Wikimedia Commons (VPBank logo #009A4E)"],
  ["acb", "Wikimedia Commons (Asia Commercial Bank #001689)"],
  ["tpbank", "Wikimedia Commons (Logo TPBank #5E308E)"],
  ["vietjet", "Wikimedia Commons (VietJet Air Cargo logo #EE2A36)"],
  ["vinaphone", "Wikimedia Commons (Logo Vinaphone before 2015 #005EA6)"],
  ["mobifone", "Wikimedia Commons (MobiFone logo #E2231A)"],
  ["vng", "Wikimedia Commons (VNG Corp logo #005CAA)"],
  ["fpt", "Wikimedia Commons (FPT logo 2010 #EE7423)"],
  ["vingroup", "Wikimedia Commons (Vingroup logo #E50019)"],
  ["highlands-coffee", "Wikimedia Commons (Highlands Coffee 5G #A11F1F)"],
];
const notFound = [
  "carlsberg","monster-energy","laneige","techcombank","mbbank","sacombank",
  "vib","agribank","vnpt","tiki","vincom","vinhomes","vinpearl","phuc-long","masan",
];

let csv = readFileSync("BRANDS_TRACKING.csv", "utf8");

function escapeId(id) { return id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }

for (const [id, note] of ok) {
  const re = new RegExp(`^(${escapeId(id)},[^,]+,[^,]+,[^,]+,)[^,]+,.*$`, "m");
  if (!re.test(csv)) { console.log("NO LINE:", id); continue; }
  csv = csv.replace(re, `$1Done,${note}`);
}
for (const id of notFound) {
  const re = new RegExp(`^(${escapeId(id)},[^,]+,[^,]+,[^,]+,)[^,]+,.*$`, "m");
  if (!re.test(csv)) { console.log("NO LINE:", id); continue; }
  csv = csv.replace(re, `$1Pending,Not on Wikimedia (trademark/restricted) — try official press kit`);
}
writeFileSync("BRANDS_TRACKING.csv", csv);
console.log("CSV updated. Done:", ok.length, "Pending:", notFound.length);
