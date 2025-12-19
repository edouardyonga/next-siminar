export function formatDate(value?: string | Date | null, opts?: Intl.DateTimeFormatOptions) {
  if (!value) return "—";
  try {
    const date = typeof value === "string" ? new Date(value) : value;
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      ...opts,
    }).format(date);
  } catch {
    return "—";
  }
}

export function formatDateRange(start?: string, end?: string) {
  if (!start || !end) return "—";
  return `${formatDate(start)} → ${formatDate(end)}`;
}

export function formatMoney(value?: number | null, currency = "EUR") {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(Number(value));
}

export function formatPercent(value?: number | null) {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return `${value.toFixed(0)}%`;
}


