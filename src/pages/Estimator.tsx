import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { DEFAULT_CONTINGENCY, DEFAULT_MARKUP } from "../lib/catalog";
import {
  breakdown,
  emptyLabor,
  emptyMaterial,
  emptySqFt,
  isSqFtLine,
  laborTotal,
  materialTotal,
  sqFtArea,
  type LaborLine,
  type MaterialLine,
  type QtyMaterialLine,
  type SqFtLine,
} from "../lib/estimate";
import { money, parseNumber, pct } from "../lib/money";
import { SAMPLE_JOB, readJob } from "../lib/readJob";

type Status = { kind: "idle" } | { kind: "ok"; text: string } | { kind: "err"; text: string };

export function Estimator() {
  const [notes, setNotes] = useState("");
  const [materials, setMaterials] = useState<MaterialLine[]>([emptyMaterial()]);
  const [labor, setLabor] = useState<LaborLine[]>([emptyLabor()]);
  const [markupPct, setMarkupPct] = useState(DEFAULT_MARKUP);
  const [contingencyPct, setContingencyPct] = useState(DEFAULT_CONTINGENCY);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [reading, setReading] = useState(false);

  const totals = useMemo(
    () => breakdown({ materials, labor, markupPct, contingencyPct }),
    [materials, labor, markupPct, contingencyPct],
  );

  function applyRead(text: string) {
    setReading(true);
    // Keep the button snappy: n-gram reader is sync; yield so the spinner paints.
    window.setTimeout(() => {
      const result = readJob(text);
      setReading(false);
      if (!result.ok) {
        setStatus({ kind: "err", text: result.message });
        return;
      }
      setMaterials(result.materials.length ? result.materials : [emptyMaterial()]);
      setLabor(result.labor.length ? result.labor : [emptyLabor()]);
      setMarkupPct(result.markupPct);
      setContingencyPct(result.contingencyPct);
      const extra = result.notes.length ? ` ${result.notes.join(" ")}` : "";
      setStatus({
        kind: "ok",
        text: `Matched ${result.matched.join(", ") || "nothing yet"}.${extra} Totals stay in the sheet — edit any line.`,
      });
    }, 40);
  }

  function loadSample() {
    setNotes(SAMPLE_JOB);
    applyRead(SAMPLE_JOB);
  }

  return (
    <div className="playful-root min-h-screen bg-[#FAFAFA] text-neutral-900">
      <header className="no-print flex items-center justify-between border-b border-neutral-200/70 px-4 py-3 sm:px-8">
        <Link to="/" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FACC15] text-sm font-black text-neutral-950">
            W
          </span>
          <span className="text-sm font-bold tracking-tight">Wizbid</span>
        </Link>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadSample}
            className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs font-semibold text-neutral-800 hover:bg-neutral-50"
          >
            Sample job
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="rounded-lg bg-[#FACC15] px-3 py-2 text-xs font-bold text-neutral-950 hover:bg-[#EAB308]"
          >
            Print bid
          </button>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-6 px-4 py-6 sm:px-8 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="space-y-6">
          <section className="no-print rounded-2xl border border-neutral-200/80 bg-white p-4 shadow-sm sm:p-5">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h1 className="text-lg font-black tracking-tight">Read this job</h1>
                <p className="mt-1 max-w-xl text-sm text-neutral-500">
                  Paste the work in your own words. The on-device catalog fills the sheet. You own the numbers after that.
                </p>
              </div>
              <button
                type="button"
                disabled={reading}
                onClick={() => applyRead(notes)}
                className="rounded-xl bg-[#FACC15] px-4 py-2.5 text-sm font-bold text-neutral-950 shadow-sm hover:bg-[#EAB308] disabled:opacity-60"
              >
                {reading ? "Reading…" : "Read this job"}
              </button>
            </div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={5}
              placeholder="e.g. 12x14 room, 800 sq ft flooring, guest bath 48 sq ft subway tile, new vanity…"
              className="mt-4 w-full resize-y rounded-xl border border-neutral-200 bg-[#FAFAFA] px-3 py-2.5 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/10"
            />
            {status.kind !== "idle" && (
              <p
                className={`mt-3 text-sm ${status.kind === "err" ? "font-medium text-red-600" : "text-neutral-600"}`}
                role="status"
              >
                {status.text}
              </p>
            )}
          </section>

          <section className="print-break rounded-2xl border border-neutral-200/80 bg-white p-4 shadow-sm sm:p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-bold">Materials</h2>
                <p className="text-[11px] text-neutral-400">Qty lines and square-footage lines share this bid.</p>
              </div>
              <div className="no-print flex gap-3">
                <button
                  type="button"
                  className="text-xs font-semibold text-neutral-700 hover:text-black"
                  onClick={() => setMaterials((rows) => [...rows, emptyMaterial()])}
                >
                  + Add item
                </button>
                <button
                  type="button"
                  className="text-xs font-semibold text-neutral-700 hover:text-black"
                  onClick={() => setMaterials((rows) => [...rows, emptySqFt()])}
                >
                  + Add sq ft
                </button>
              </div>
            </div>
            <div className="space-y-2 overflow-x-auto">
              {materials.map((row, i) =>
                isSqFtLine(row) ? (
                  <SqFtRow
                    key={row.id}
                    row={row}
                    onChange={(next) => setMaterials((rows) => rows.map((r, idx) => (idx === i ? next : r)))}
                    onRemove={() =>
                      setMaterials((rows) => (rows.length === 1 ? [emptyMaterial()] : rows.filter((_, idx) => idx !== i)))
                    }
                  />
                ) : (
                  <QtyRow
                    key={row.id}
                    row={row}
                    onChange={(next) => setMaterials((rows) => rows.map((r, idx) => (idx === i ? next : r)))}
                    onRemove={() =>
                      setMaterials((rows) => (rows.length === 1 ? [emptyMaterial()] : rows.filter((_, idx) => idx !== i)))
                    }
                  />
                ),
              )}
            </div>
          </section>

          <section className="print-break rounded-2xl border border-neutral-200/80 bg-white p-4 shadow-sm sm:p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-bold">Labor</h2>
              <button
                type="button"
                className="no-print text-xs font-semibold text-neutral-700 hover:text-black"
                onClick={() => setLabor((rows) => [...rows, emptyLabor()])}
              >
                + Add crew
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead className="text-[11px] uppercase tracking-wide text-neutral-400">
                  <tr>
                    <th className="pb-2 font-semibold">Role</th>
                    <th className="pb-2 font-semibold">Hours</th>
                    <th className="pb-2 font-semibold">Rate</th>
                    <th className="pb-2 text-right font-semibold">Line</th>
                    <th className="no-print w-10 pb-2" />
                  </tr>
                </thead>
                <tbody>
                  {labor.map((row, i) => (
                    <tr key={row.id} className="border-t border-neutral-100">
                      <td className="py-1.5 pr-2">
                        <input
                          value={row.role}
                          onChange={(e) =>
                            setLabor((rows) => rows.map((r, idx) => (idx === i ? { ...r, role: e.target.value } : r)))
                          }
                          className="w-full rounded-lg border border-transparent bg-transparent px-2 py-1.5 hover:border-neutral-200 focus:border-neutral-900 focus:outline-none"
                          placeholder="Role"
                        />
                      </td>
                      <td className="py-1.5 pr-2">
                        <input
                          type="number"
                          min={0}
                          step="any"
                          value={row.hours}
                          onChange={(e) =>
                            setLabor((rows) =>
                              rows.map((r, idx) => (idx === i ? { ...r, hours: parseNumber(e.target.value) } : r)),
                            )
                          }
                          className="w-24 rounded-lg border border-transparent bg-transparent px-2 py-1.5 hover:border-neutral-200 focus:border-neutral-900 focus:outline-none"
                        />
                      </td>
                      <td className="py-1.5 pr-2">
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          value={row.rate}
                          onChange={(e) =>
                            setLabor((rows) =>
                              rows.map((r, idx) => (idx === i ? { ...r, rate: parseNumber(e.target.value) } : r)),
                            )
                          }
                          className="w-24 rounded-lg border border-transparent bg-transparent px-2 py-1.5 hover:border-neutral-200 focus:border-neutral-900 focus:outline-none"
                        />
                      </td>
                      <td className="py-1.5 text-right font-medium tabular-nums">{money(laborTotal(row))}</td>
                      <td className="no-print py-1.5 pl-2 text-right">
                        <button
                          type="button"
                          className="text-neutral-400 hover:text-red-600"
                          onClick={() =>
                            setLabor((rows) => (rows.length === 1 ? [emptyLabor()] : rows.filter((_, idx) => idx !== i)))
                          }
                          aria-label="Remove labor"
                        >
                          ×
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="no-print grid gap-3 rounded-2xl border border-neutral-200/80 bg-white p-4 shadow-sm sm:grid-cols-2 sm:p-5">
            <label className="text-sm">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-neutral-400">
                Contingency % of direct
              </span>
              <input
                type="number"
                min={0}
                step="0.1"
                value={contingencyPct}
                onChange={(e) => setContingencyPct(parseNumber(e.target.value))}
                className="w-full rounded-xl border border-neutral-200 bg-[#FAFAFA] px-3 py-2 focus:border-neutral-900 focus:outline-none"
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-neutral-400">
                Markup % of cost-to-complete
              </span>
              <input
                type="number"
                min={0}
                step="0.1"
                value={markupPct}
                onChange={(e) => setMarkupPct(parseNumber(e.target.value))}
                className="w-full rounded-xl border border-neutral-200 bg-[#FAFAFA] px-3 py-2 focus:border-neutral-900 focus:outline-none"
              />
            </label>
          </section>
        </div>

        <aside className="print-break h-fit rounded-2xl border border-neutral-200/80 bg-white p-5 shadow-sm lg:sticky lg:top-4">
          <h2 className="text-sm font-bold">Bid breakdown</h2>
          <p className="mt-1 text-[11px] text-neutral-400">Plain arithmetic. Not a model.</p>
          <dl className="mt-4 space-y-2 text-sm">
            <Row label="Materials" value={money(totals.materials)} />
            <Row label="Labor" value={money(totals.labor)} />
            <Row label="Contingency" value={money(totals.contingency)} hint={`${pct(contingencyPct)} of direct`} />
            <Row label="Markup" value={money(totals.markup)} hint={`${pct(markupPct)} of cost`} />
            <div className="border-t border-neutral-200 pt-2">
              <Row label="Bid total" value={money(totals.bidTotal)} strong />
            </div>
            <Row label="Profit" value={money(totals.profit)} />
            <Row label="Margin" value={pct(totals.marginPct)} hint="profit ÷ bid" />
          </dl>
        </aside>
      </main>

      <footer className="border-t border-neutral-200/70 px-4 py-5 text-center text-xs text-neutral-400 sm:px-8">
        Bidding Wizards
      </footer>
    </div>
  );
}

const fieldClass =
  "w-full rounded-lg border border-transparent bg-transparent px-2 py-1.5 hover:border-neutral-200 focus:border-neutral-900 focus:outline-none";

function QtyRow({
  row,
  onChange,
  onRemove,
}: {
  row: QtyMaterialLine;
  onChange: (next: QtyMaterialLine) => void;
  onRemove: () => void;
}) {
  return (
    <div className="grid grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(4.5rem,0.5fr))_minmax(5rem,0.6fr)_auto] items-center gap-1 rounded-xl border border-neutral-100 px-2 py-1 text-sm">
      <input
        value={row.item}
        onChange={(e) => onChange({ ...row, item: e.target.value })}
        className={fieldClass}
        placeholder="Item"
        aria-label="Material item"
      />
      <label className="flex flex-col">
        <span className="text-[10px] uppercase tracking-wide text-neutral-400">Qty</span>
        <input
          type="number"
          min={0}
          step="any"
          value={row.quantity}
          onChange={(e) => onChange({ ...row, quantity: parseNumber(e.target.value) })}
          className={fieldClass}
        />
      </label>
      <label className="flex flex-col">
        <span className="text-[10px] uppercase tracking-wide text-neutral-400">Unit</span>
        <input
          value={row.unit}
          onChange={(e) => onChange({ ...row, unit: e.target.value })}
          className={fieldClass}
        />
      </label>
      <label className="flex flex-col">
        <span className="text-[10px] uppercase tracking-wide text-neutral-400">Unit cost</span>
        <input
          type="number"
          min={0}
          step="0.01"
          value={row.unitCost}
          onChange={(e) => onChange({ ...row, unitCost: parseNumber(e.target.value) })}
          className={fieldClass}
        />
      </label>
      <div className="text-right">
        <div className="text-[10px] uppercase tracking-wide text-neutral-400">Line</div>
        <div className="font-medium tabular-nums">{money(materialTotal(row))}</div>
      </div>
      <button
        type="button"
        className="no-print px-1 text-neutral-400 hover:text-red-600"
        onClick={onRemove}
        aria-label="Remove material"
      >
        ×
      </button>
    </div>
  );
}

function SqFtRow({
  row,
  onChange,
  onRemove,
}: {
  row: SqFtLine;
  onChange: (next: SqFtLine) => void;
  onRemove: () => void;
}) {
  const area = sqFtArea(row);
  return (
    <div className="grid grid-cols-[minmax(0,1.3fr)_repeat(3,minmax(4.5rem,0.45fr))_minmax(5rem,0.5fr)_minmax(5rem,0.55fr)_auto] items-center gap-1 rounded-xl border border-amber-200/80 bg-amber-50/40 px-2 py-1 text-sm">
      <label className="flex min-w-0 flex-col">
        <span className="text-[10px] uppercase tracking-wide text-amber-800/70">Sq ft item</span>
        <input
          value={row.item}
          onChange={(e) => onChange({ ...row, item: e.target.value })}
          className={fieldClass}
          placeholder="Room / flooring"
          aria-label="Square-footage item"
        />
      </label>
      <label className="flex flex-col">
        <span className="text-[10px] uppercase tracking-wide text-neutral-400">Length</span>
        <input
          type="number"
          min={0}
          step="any"
          value={row.length}
          onChange={(e) => onChange({ ...row, length: parseNumber(e.target.value) })}
          className={fieldClass}
        />
      </label>
      <label className="flex flex-col">
        <span className="text-[10px] uppercase tracking-wide text-neutral-400">Width</span>
        <input
          type="number"
          min={0}
          step="any"
          value={row.width}
          onChange={(e) => onChange({ ...row, width: parseNumber(e.target.value) })}
          className={fieldClass}
        />
      </label>
      <div className="flex flex-col">
        <span className="text-[10px] uppercase tracking-wide text-neutral-400">Area</span>
        <span className="px-2 py-1.5 tabular-nums text-neutral-800">{area.toLocaleString()} sf</span>
      </div>
      <label className="flex flex-col">
        <span className="text-[10px] uppercase tracking-wide text-neutral-400">$/sf</span>
        <input
          type="number"
          min={0}
          step="0.01"
          value={row.pricePerSqFt}
          onChange={(e) => onChange({ ...row, pricePerSqFt: parseNumber(e.target.value) })}
          className={fieldClass}
        />
      </label>
      <div className="text-right">
        <div className="text-[10px] uppercase tracking-wide text-neutral-400">Dollars</div>
        <div className="font-medium tabular-nums">{money(materialTotal(row))}</div>
      </div>
      <button
        type="button"
        className="no-print px-1 text-neutral-400 hover:text-red-600"
        onClick={onRemove}
        aria-label="Remove square-footage line"
      >
        ×
      </button>
    </div>
  );
}

function Row({
  label,
  value,
  hint,
  strong,
}: {
  label: string;
  value: string;
  hint?: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-neutral-500">
        {label}
        {hint ? <span className="ml-1 text-[10px] text-neutral-400">{hint}</span> : null}
      </dt>
      <dd className={`tabular-nums ${strong ? "text-base font-black" : "font-semibold"}`}>{value}</dd>
    </div>
  );
}
