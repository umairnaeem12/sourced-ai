const relative = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

const steps: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 365 * 24 * 3600],
  ["month", 30 * 24 * 3600],
  ["day", 24 * 3600],
  ["hour", 3600],
  ["minute", 60],
];

export function timeAgo(iso: string, now = Date.now()): string {
  const seconds = Math.round((new Date(iso).getTime() - now) / 1000);
  for (const [unit, size] of steps) {
    if (Math.abs(seconds) >= size) return relative.format(Math.round(seconds / size), unit);
  }
  return "just now";
}

export function fullDate(iso: string): string {
  return new Date(iso).toLocaleString("en", { dateStyle: "medium", timeStyle: "short" });
}

export function compactNumber(value: number): string {
  return new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

export function percent(part: number, whole: number): number | null {
  return whole > 0 ? Math.round((part / whole) * 100) : null;
}

// "45 min", "3 h 20 min", "2 d 4 h".
export function duration(minutes: number): string {
  if (minutes < 60) return `${Math.max(1, Math.round(minutes))} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    const rest = Math.round(minutes - hours * 60);
    return rest ? `${hours} h ${rest} min` : `${hours} h`;
  }
  const days = Math.floor(hours / 24);
  const restHours = hours - days * 24;
  return restHours ? `${days} d ${restHours} h` : `${days} d`;
}

export function shortDate(isoDate: string): string {
  // Dates from the API are store-local calendar days ("2026-10-19"), so read them as UTC.
  return new Date(`${isoDate}T00:00:00Z`).toLocaleDateString("en", { month: "short", day: "numeric", timeZone: "UTC" });
}

export function fileSize(chars: number): string {
  if (chars < 1000) return `${chars} chars`;
  return `${compactNumber(chars)} chars`;
}
