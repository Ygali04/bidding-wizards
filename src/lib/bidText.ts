import type { JobInfo } from "./draft";
import { breakdown, isSqFtLine, laborTotal, materialTotal, sqFtArea, type EstimateInput } from "./estimate";
import { money, pct } from "./money";

/** Plain-text bid for pasting into an email or text message. Same math as the sheet. */
export function bidText(job: JobInfo, input: EstimateInput): string {
  const b = breakdown(input);
  const lines: string[] = [`BID: ${job.name || "Untitled job"}`];
  if (job.address) lines.push(`Address: ${job.address}`);
  if (job.date) lines.push(`Date: ${job.date}`);
  lines.push("");

  for (const m of input.materials) {
    if (!m.item && materialTotal(m) === 0) continue;
    const detail = isSqFtLine(m)
      ? `${m.length} x ${m.width} = ${sqFtArea(m)} sq ft @ ${money(m.pricePerSqFt)}`
      : `${m.quantity} ${m.unit} @ ${money(m.unitCost)}`;
    lines.push(`- ${m.item || "Material"}: ${detail} = ${money(materialTotal(m))}`);
  }
  for (const l of input.labor) {
    if (!l.role && laborTotal(l) === 0) continue;
    lines.push(`- ${l.role || "Labor"}: ${l.hours} hrs @ ${money(l.rate)} = ${money(laborTotal(l))}`);
  }

  lines.push("");
  lines.push(`Materials: ${money(b.materials)}`);
  lines.push(`Labor: ${money(b.labor)}`);
  lines.push(`Contingency (${pct(input.contingencyPct)}): ${money(b.contingency)}`);
  lines.push(`Markup (${pct(input.markupPct)}): ${money(b.markup)}`);
  lines.push(`BID TOTAL (ex GST): ${money(b.bidTotal)}`);
  if (b.gst > 0) {
    lines.push(`GST (${pct(input.gstPct ?? 0)}): ${money(b.gst)}`);
    lines.push(`TOTAL INC GST: ${money(b.totalIncGst)}`);
  }
  lines.push(`Profit: ${money(b.profit)} | Margin: ${pct(b.marginPct)}`);
  lines.push("");
  lines.push("Bidding Wizards");
  return lines.join("\n");
}
