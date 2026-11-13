export function money(n: number): string {
  const value = Number.isFinite(n) ? n : 0;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

export function pct(n: number): string {
  const value = Number.isFinite(n) ? n : 0;
  return `${value.toFixed(1)}%`;
}

export function parseNumber(raw: string): number {
  const n = Number.parseFloat(raw.replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
}
