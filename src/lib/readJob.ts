import {
  CATALOG,
  DEFAULT_CONTINGENCY,
  DEFAULT_MARKUP,
  OUT_OF_SCOPE,
  RISK_PHRASES,
  type CatalogEntry,
} from "./catalog";
import {
  emptyLabor,
  emptyMaterial,
  emptySqFt,
  materialQtyOrArea,
  type LaborLine,
  type MaterialLine,
  type SqFtLine,
} from "./estimate";

export const SAMPLE_JOB = `Guest bath remodel. About 48 sq ft of subway tile on the walls, new vanity, toilet, and faucet. Paint the walls — figure 2 gallons. Occupied home, they still need the hall bath. Possible hidden water damage behind the tub surround.`;

const TRADE_HINTS = [
  "kitchen",
  "bath",
  "bathroom",
  "remodel",
  "renovation",
  "tile",
  "roof",
  "fence",
  "drywall",
  "paint",
  "plumber",
  "plumbing",
  "electrical",
  "electrician",
  "floor",
  "flooring",
  "deck",
  "concrete",
  "framing",
  "cabinet",
  "vanity",
  "hvac",
  "siding",
  "insulation",
  "countertop",
  "backsplash",
  "toilet",
  "shingle",
  "carpenter",
];

const MATERIAL_TO_LABOR: Record<string, string> = {
  "subway-tile": "tile-setter",
  "porcelain-tile": "tile-setter",
  thinset: "tile-setter",
  drywall: "carpenter",
  "joint-compound": "carpenter",
  "lumber-2x4": "carpenter",
  plywood: "carpenter",
  "interior-paint": "painter",
  vanity: "plumber",
  toilet: "plumber",
  faucet: "plumber",
  "copper-pipe": "plumber",
  romex: "electrician",
  outlet: "electrician",
  "led-fixture": "electrician",
  hardwood: "flooring-installer",
  lvp: "flooring-installer",
  insulation: "laborer",
  shingles: "roofer",
  underlayment: "roofer",
  "fence-board": "carpenter",
  concrete: "concrete-finisher",
  countertop: "carpenter",
  cabinet: "carpenter",
};

const WORD_NUMBERS: Record<string, number> = {
  a: 1,
  an: 1,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  twelve: 12,
  fifteen: 15,
  twenty: 20,
  thirty: 30,
  forty: 40,
  fifty: 50,
};

export type ReadJobOk = {
  ok: true;
  materials: MaterialLine[];
  labor: LaborLine[];
  markupPct: number;
  contingencyPct: number;
  matched: string[];
  notes: string[];
};

export type ReadJobFail = {
  ok: false;
  reason: "empty" | "out_of_scope";
  message: string;
};

export type ReadJobResult = ReadJobOk | ReadJobFail;

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[’']/g, "'")
    .replace(/[^a-z0-9./%\- ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokens(text: string): string[] {
  return normalize(text).split(" ").filter(Boolean);
}

function phraseHits(haystack: string, phrase: string): boolean {
  const needle = normalize(phrase);
  if (!needle) return false;
  const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
  return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`).test(haystack);
}

function overlapScore(haystackTokens: string[], phrase: string): number {
  const words = tokens(phrase);
  if (words.length === 0) return 0;
  let hit = 0;
  for (const w of words) {
    if (w.length < 3) continue;
    if (haystackTokens.includes(w)) hit += 1;
  }
  return hit / Math.max(1, words.filter((w) => w.length >= 3).length);
}

function extractQty(haystack: string, phrase: string, entry: CatalogEntry): number {
  const idx = haystack.indexOf(normalize(phrase));
  const windowStart = idx >= 0 ? Math.max(0, idx - 48) : 0;
  const window = haystack.slice(windowStart, idx >= 0 ? idx + phrase.length + 24 : haystack.length);

  const unitish =
    /(\d+(?:\.\d+)?)\s*(sq\s*ft|sqft|sf|squares?|sq\b|ft|lf|hours?|hrs?|gal(?:lons?)?|sheets?|ea|each|cu\s*yd|yards?)/i;
  const m = window.match(unitish);
  if (m?.[1]) {
    const n = Number.parseFloat(m[1]);
    if (Number.isFinite(n) && n > 0) {
      if (entry.kind === "labor" && /days?/i.test(window)) return n * 8;
      return n;
    }
  }

  const leading = window.match(/(\d+(?:\.\d+)?)\s+(?:of\s+)?$/);
  if (leading?.[1]) {
    const n = Number.parseFloat(leading[1]);
    if (Number.isFinite(n) && n > 0) return n;
  }

  const words = window.split(/\s+/);
  for (let i = words.length - 1; i >= 0; i--) {
    const w = words[i];
    if (w && w in WORD_NUMBERS) {
      const n = WORD_NUMBERS[w] ?? 0;
      if (entry.kind === "labor" && words.join(" ").includes("day")) return n * 8;
      return n;
    }
  }

  if (entry.kind === "labor") {
    const hours = haystack.match(/(\d+(?:\.\d+)?)\s*(hours?|hrs?)/);
    if (hours?.[1]) return Number.parseFloat(hours[1]);
    const days = haystack.match(/(\d+(?:\.\d+)?)\s*days?/);
    if (days?.[1]) return Number.parseFloat(days[1]) * 8;
    return 8;
  }

  switch (entry.unit) {
    case "sq ft":
      return 40;
    case "gal":
      return 2;
    case "sheet":
      return 8;
    case "ft":
      return 25;
    case "lf":
      return 12;
    case "sq":
      return 15;
    case "cu yd":
      return 1;
    default:
      return 1;
  }
}

function laborHoursFor(entry: CatalogEntry, materials: MaterialLine[]): number {
  const related = materials.filter((line) => {
    const cat = CATALOG.find((c) => c.name === line.item);
    return cat ? MATERIAL_TO_LABOR[cat.id] === entry.id : false;
  });
  if (related.length === 0) return 8;
  const qty = related.reduce((s, l) => s + materialQtyOrArea(l), 0);
  if (entry.id === "tile-setter") return Math.max(8, Math.round(qty / 12));
  if (entry.id === "painter") return Math.max(6, Math.round(qty * 2));
  if (entry.id === "plumber") return Math.max(4, related.length * 3);
  if (entry.id === "electrician") return Math.max(4, Math.round(qty / 8) + 4);
  if (entry.id === "roofer") return Math.max(8, Math.round(qty * 1.5));
  if (entry.id === "flooring-installer") return Math.max(6, Math.round(qty / 20));
  return Math.max(6, Math.round(qty / 10));
}

function isOutOfScope(text: string): boolean {
  const t = tokens(text);
  const tradeHits = TRADE_HINTS.filter((h) => phraseHits(text, h)).length;
  let scopeHits = 0;
  for (const cluster of OUT_OF_SCOPE) {
    if (overlapScore(t, cluster) >= 0.4) scopeHits += 1;
  }
  if (scopeHits === 0) return false;
  return tradeHits === 0 || scopeHits > tradeHits;
}

const AREA_UNIT = String.raw`(?:sq\.?\s*ft|sqft|square\s*feet|square\s*foot|\bsf\b)`;

const LOCATION_WORDS =
  /room|bedroom|bath|kitchen|garage|deck|patio|office|closet|hall|dining|living|floor|area|space|shed|shop|basement|attic|porch|foyer|laundry|mudroom|entry/;

const LUMBER_CONTEXT = /stud|lumber|joist|beam|post|plywood|osb|sheet|board|dimensional|fencing/;

const LABEL_STOP = /^(?:and|with|plus|then|also|new|a|an|the|to|for|in|on|at|of|into|from)$/;

export type ParsedSqFtPhrase = {
  item: string;
  length: number;
  width: number;
  start: number;
  end: number;
};

function titleCase(s: string): string {
  return s
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => (w.length ? w[0]!.toUpperCase() + w.slice(1) : w))
    .join(" ");
}

function cleanLabel(raw: string): string {
  return raw
    .replace(/\b(?:about|approx(?:imately)?|around|roughly)\b/g, " ")
    .replace(/[^a-z0-9+\-\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter((w) => w && !LABEL_STOP.test(w))
    .slice(0, 6)
    .join(" ");
}

function looksLikeLumber(length: number, width: number, context: string): boolean {
  if (LUMBER_CONTEXT.test(context)) return true;
  const a = Math.min(length, width);
  const b = Math.max(length, width);
  if (a <= 2 && b <= 12) return true;
  if (a === 4 && (b === 4 || b === 6 || b === 8) && !LOCATION_WORDS.test(context)) return true;
  return false;
}

function overlaps(used: Array<[number, number]>, start: number, end: number): boolean {
  return used.some(([a, b]) => start < b && end > a);
}

/**
 * Pull L×W rooms and “N sq ft covering” phrases from a free-text brief.
 * Area-only phrases become length = N, width = 1 so dollars still equal N × $/sf.
 */
export function parseSqFtPhrases(raw: string): ParsedSqFtPhrase[] {
  const text = normalize(raw);
  const used: Array<[number, number]> = [];
  const results: ParsedSqFtPhrase[] = [];

  const dimRe =
    /\b(\d+(?:\.\d+)?)\s*(?:'|ft|feet)?\s*(?:x|×|by)\s*(\d+(?:\.\d+)?)\s*(?:'|ft|feet)?/gi;
  let m: RegExpExecArray | null;
  while ((m = dimRe.exec(text))) {
    const start = m.index;
    const end = start + m[0].length;
    const length = Number.parseFloat(m[1] ?? "0");
    const width = Number.parseFloat(m[2] ?? "0");
    if (!Number.isFinite(length) || !Number.isFinite(width) || length <= 0 || width <= 0) continue;
    const ctx = text.slice(Math.max(0, start - 16), Math.min(text.length, end + 28));
    if (looksLikeLumber(length, width, ctx)) continue;
    if (overlaps(used, start, end)) continue;
    used.push([start, end]);
    const after = text.slice(end, end + 40).replace(/^[\s,.:;-]+/, "");
    const labelMatch = after.match(/^([a-z][a-z0-9+\-\s]{0,36}?)(?=\s+(?:\d|and|with|plus|,|;|\.|$)|$)/);
    const label = labelMatch ? cleanLabel(labelMatch[1] ?? "") : "";
    results.push({
      item: titleCase(label) || "Room",
      length,
      width,
      start,
      end,
    });
  }

  const areaAfter = new RegExp(
    String.raw`\b(\d+(?:\.\d+)?)\s*${AREA_UNIT}(?:\s+of)?(?:\s+([a-z]+(?:[ \-][a-z]+){0,2}))?`,
    "gi",
  );
  while ((m = areaAfter.exec(text))) {
    const start = m.index;
    const end = start + m[0].length;
    if (overlaps(used, start, end)) continue;
    const area = Number.parseFloat(m[1] ?? "0");
    if (!Number.isFinite(area) || area <= 0) continue;
    used.push([start, end]);
    const label = cleanLabel(m[2] ?? "");
    results.push({
      item: titleCase(label) || "Sq ft work",
      length: area,
      width: 1,
      start,
      end,
    });
  }

  const areaBefore = new RegExp(String.raw`\b([a-z][a-z0-9+\-\s]{2,40}?)\s+(\d+(?:\.\d+)?)\s*${AREA_UNIT}`, "gi");
  while ((m = areaBefore.exec(text))) {
    const start = m.index;
    const end = start + m[0].length;
    if (overlaps(used, start, end)) continue;
    const area = Number.parseFloat(m[2] ?? "0");
    if (!Number.isFinite(area) || area <= 0) continue;
    const label = cleanLabel(m[1] ?? "");
    if (!label || TRADE_HINTS.every((h) => !label.includes(h) && !LOCATION_WORDS.test(label))) {
      // Keep generic coverings like "flooring" even if not in TRADE_HINTS as a whole token.
      if (!/(floor|tile|carpet|hardwood|vinyl|lvp|deck|patio|paint|drywall|insulation|sod|roof)/.test(label)) {
        continue;
      }
    }
    used.push([start, end]);
    results.push({
      item: titleCase(label) || "Sq ft work",
      length: area,
      width: 1,
      start,
      end,
    });
  }

  return results;
}

function maskSpans(text: string, spans: Array<{ start: number; end: number }>): string {
  if (spans.length === 0) return text;
  const chars = [...text];
  for (const { start, end } of spans) {
    for (let i = start; i < end && i < chars.length; i++) chars[i] = " ";
  }
  return chars.join("").replace(/\s+/g, " ").trim();
}

function catalogForSqFtItem(item: string): CatalogEntry | undefined {
  const n = item.toLowerCase();
  const aliases: Record<string, string> = {
    flooring: "hardwood",
    floor: "hardwood",
    floors: "hardwood",
    tile: "subway-tile",
    "wall tile": "subway-tile",
    lvp: "lvp",
    "vinyl plank": "lvp",
    hardwood: "hardwood",
    insulation: "insulation",
    quartz: "countertop",
    countertop: "countertop",
    countertops: "countertop",
  };
  const aliasId = Object.keys(aliases).find((k) => n === k || n.includes(k));
  if (aliasId) {
    const hit = CATALOG.find((c) => c.id === aliases[aliasId]);
    if (hit) return hit;
  }
  let best: CatalogEntry | undefined;
  let bestScore = 0;
  for (const entry of CATALOG) {
    if (entry.kind !== "material" || entry.unit !== "sq ft") continue;
    for (const phrase of [...entry.phrases, entry.name.toLowerCase()]) {
      const p = phrase.toLowerCase();
      if (n.includes(p) || p.includes(n)) {
        const score = p.length;
        if (score > bestScore) {
          best = entry;
          bestScore = score;
        }
      }
    }
  }
  return best;
}

function sqFtCoversCatalog(entry: CatalogEntry, sqft: SqFtLine[]): boolean {
  if (sqft.length === 0) return false;
  const blob = sqft.map((s) => s.item.toLowerCase()).join(" | ");
  const names = [entry.name, ...entry.phrases].map((s) => s.toLowerCase());
  if (names.some((n) => blob.includes(n))) return true;
  if (entry.unit === "sq ft" && names.some((n) => n.split(/\s+/).every((w) => w.length < 4 || blob.includes(w)))) {
    return blob.length > 0 && names.some((n) => overlapScore(tokens(blob), n) >= 0.5);
  }
  return false;
}

/**
 * On-device catalog reader. Totals are never computed here — only line items
 * and percents. N-gram / phrase match against the trade catalog. MiniLM rerank
 * is optional and not loaded on this first cut so "Read this job" stays fast.
 */
export function readJob(raw: string): ReadJobResult {
  const text = raw.trim();
  if (!text) {
    return { ok: false, reason: "empty", message: "Paste a job brief first." };
  }

  const haystackFull = normalize(text);
  const sqftParsed = parseSqFtPhrases(haystackFull);
  const haystack = maskSpans(haystackFull, sqftParsed);

  if (isOutOfScope(haystackFull)) {
    return {
      ok: false,
      reason: "out_of_scope",
      message:
        "This reads like it isn't a trades job (software, legal, catering, medical, tax…). Bidding Wizards only estimates construction work.",
    };
  }

  const sqftLines = sqftParsed.map((parsed) => {
    const line = emptySqFt();
    const cat = catalogForSqFtItem(parsed.item);
    line.item = cat?.name ?? parsed.item;
    line.length = parsed.length;
    line.width = parsed.width;
    line.pricePerSqFt = cat?.defaultCost ?? 0;
    return line;
  });
  const materials: MaterialLine[] = [...sqftLines];
  const labor: LaborLine[] = [];
  const matched: string[] = sqftLines.map((l) => l.item);
  const usedIds = new Set<string>();
  for (const line of sqftLines) {
    const cat = CATALOG.find((c) => c.name === line.item);
    if (cat) usedIds.add(cat.id);
  }

  const ranked = CATALOG.map((entry) => {
    let best = 0;
    let bestPhrase = entry.phrases[0] ?? entry.name;
    for (const phrase of [...entry.phrases, entry.name]) {
      if (phraseHits(haystack, phrase)) {
        const score = tokens(phrase).length * 3 + phrase.length / 20;
        if (score > best) {
          best = score;
          bestPhrase = phrase;
        }
      }
    }
    return { entry, best, bestPhrase };
  })
    .filter((row) => row.best > 0)
    .sort((a, b) => b.best - a.best);

  for (const row of ranked) {
    if (usedIds.has(row.entry.id)) continue;
    if (sqFtCoversCatalog(row.entry, sqftLines)) continue;
    usedIds.add(row.entry.id);
    matched.push(row.entry.name);
    const qty = extractQty(haystack, row.bestPhrase, row.entry);
    if (row.entry.kind === "material") {
      const line = emptyMaterial();
      line.item = row.entry.name;
      line.unit = row.entry.unit;
      line.unitCost = row.entry.defaultCost;
      line.quantity = qty;
      materials.push(line);
    } else {
      const line = emptyLabor();
      line.role = row.entry.name;
      line.rate = row.entry.defaultCost;
      line.hours = qty;
      labor.push(line);
    }
  }

  for (const mat of [...materials]) {
    const cat = CATALOG.find((c) => c.name === mat.item);
    if (!cat) continue;
    const laborId = MATERIAL_TO_LABOR[cat.id];
    if (!laborId || usedIds.has(laborId)) continue;
    const laborCat = CATALOG.find((c) => c.id === laborId);
    if (!laborCat) continue;
    usedIds.add(laborId);
    matched.push(laborCat.name);
    const line = emptyLabor();
    line.role = laborCat.name;
    line.rate = laborCat.defaultCost;
    line.hours = laborHoursFor(laborCat, materials);
    labor.push(line);
  }

  if (materials.length === 0 && labor.length === 0) {
    const tradeHits = TRADE_HINTS.filter((h) => phraseHits(haystack, h)).length;
    if (tradeHits === 0) {
      return {
        ok: false,
        reason: "out_of_scope",
        message:
          "Couldn't find trade materials or labor in that brief. Try naming the work (tile, paint, roof, fence…) and quantities.",
      };
    }
  }

  let markupPct = DEFAULT_MARKUP;
  let contingencyPct = DEFAULT_CONTINGENCY;
  const notes: string[] = [];
  const t = tokens(haystack);
  for (const risk of RISK_PHRASES) {
    if (overlapScore(t, risk.phrase) >= 0.35) {
      markupPct += risk.markupBump;
      contingencyPct += risk.contingencyBump;
      notes.push(`Risk bump from: “${risk.phrase.split(" ").slice(0, 4).join(" ")}…”`);
    }
  }

  if (materials.length === 0) {
    notes.push("No catalog materials matched — add lines by hand.");
  }
  if (sqftLines.length) {
    notes.push("Square-footage lines are on the bid (L×W×$/sf) — edit length, width, or price.");
  }
  if (labor.length === 0) {
    notes.push("No labor matched — add crew hours by hand.");
  }

  return {
    ok: true,
    materials,
    labor,
    markupPct,
    contingencyPct,
    matched,
    notes,
  };
}

export function catalogByName(name: string): CatalogEntry | undefined {
  return CATALOG.find((c) => c.name.toLowerCase() === name.toLowerCase());
}
