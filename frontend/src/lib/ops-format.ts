// Formatting shared by the /ops server components and its client charts.

export const NO_DATA = "No data";

export function formatPercent(value: number | null): string {
  return value === null ? NO_DATA : `${Math.round(value * 100)}%`;
}

export function formatSeconds(milliseconds: number | null): string {
  return milliseconds === null ? NO_DATA : `${(milliseconds / 1000).toFixed(1)} s`;
}

export function formatNumber(value: number | null, digits = 2): string {
  return value === null ? NO_DATA : value.toFixed(digits);
}

// UTC and a fixed shape, so the server-rendered text never depends on the server's locale.
export function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return `${date.toISOString().slice(0, 16).replace("T", " ")} UTC`;
}

export function formatAge(iso: string, now: Date): string {
  const seconds = Math.max(0, (now.getTime() - new Date(iso).getTime()) / 1000);
  if (Number.isNaN(seconds)) return "";
  if (seconds < 3600) return `${Math.max(1, Math.round(seconds / 60))} min ago`;
  if (seconds < 86_400) return `${Math.round(seconds / 3600)} h ago`;
  return `${Math.round(seconds / 86_400)} days ago`;
}

export type TargetDirection = "at-least" | "at-most";

// null means the target can't be judged, which is different from missing it.
export function meetsTarget(
  value: number | null,
  target: number,
  direction: TargetDirection,
): boolean | null {
  if (value === null) return null;
  return direction === "at-least" ? value >= target : value <= target;
}
