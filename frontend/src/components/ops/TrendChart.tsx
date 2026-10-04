"use client";

import {
  type DotItemDotProps,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Point } from "@/lib/ops";
import { formatNumber, formatPercent, formatSeconds, NO_DATA } from "@/lib/ops-format";

export type TrendFormat = "reqps" | "percent" | "ms" | "per-minute";

export interface TrendSeries {
  name: string;
  points: Point[];
}

interface TrendChartProps {
  title: string;
  unit: string;
  format: TrendFormat;
  series: TrendSeries[];
}

// Ink first, then graphite, then dashed variants: the palette has no third neutral.
const STROKES = [
  { stroke: "var(--color-ink)", dash: undefined },
  { stroke: "var(--color-graphite)", dash: undefined },
  { stroke: "var(--color-ink)", dash: "4 4" },
  { stroke: "var(--color-graphite)", dash: "4 4" },
];

function formatValue(value: number | null, format: TrendFormat): string {
  if (value === null) return NO_DATA;
  switch (format) {
    case "percent":
      return formatPercent(value);
    case "ms":
      return formatSeconds(value);
    case "reqps":
      return `${formatNumber(value, 3)} req/s`;
    case "per-minute":
      return `${formatNumber(value, 1)} /min`;
  }
}

// Axis ticks drop the unit (the caption names it) so they stay short enough not to wrap.
function formatTick(value: number, format: TrendFormat): string {
  switch (format) {
    case "percent":
      return formatPercent(value);
    case "ms":
      return `${(value / 1000).toFixed(0)} s`;
    case "reqps":
      return formatNumber(value, 3);
    case "per-minute":
      return formatNumber(value, 1);
  }
}

function formatTime(seconds: number): string {
  return new Date(seconds * 1000).toISOString().slice(11, 16);
}

// The newest point only: falling back to an older one would label a stale value "Latest".
function latestValue(points: Point[]): number | null {
  return points.at(-1)?.[1] ?? null;
}

type Row = { t: number } & Record<string, number | null>;

// One row per timestamp; a series without a value there stays undefined, drawn as a gap.
function toRows(series: TrendSeries[]): Row[] {
  const rows = new Map<number, Row>();
  for (const { name, points } of series) {
    for (const [timestamp, value] of points) {
      const row = rows.get(timestamp) ?? ({ t: timestamp } as Row);
      row[name] = value;
      rows.set(timestamp, row);
    }
  }
  return [...rows.values()].sort((a, b) => a.t - b.t);
}

// Lines otherwise draw no dots, so a value with a gap on both sides (a ratio is 0/0, and so
// empty, in every step without requests) would have no segment and stay invisible.
function isolatedDotRenderer(rows: Row[], name: string, stroke: string) {
  const hasValue = (row: Row | undefined) => typeof row?.[name] === "number";
  return function IsolatedDot({ index, cx, cy }: DotItemDotProps) {
    const isolated =
      hasValue(rows[index]) && !hasValue(rows[index - 1]) && !hasValue(rows[index + 1]);
    if (!isolated || cx === undefined || cy === undefined) return null;
    return <circle cx={cx} cy={cy} r={3} fill={stroke} />;
  };
}

export function TrendChart({ title, unit, format, series }: TrendChartProps) {
  const rows = toRows(series);
  const summary =
    series.length === 0
      ? NO_DATA
      : series
          .map(({ name, points }) => {
            const latest = formatValue(latestValue(points), format);
            return series.length > 1 ? `${name}: ${latest}` : latest;
          })
          .join(", ");

  return (
    <figure className="flex min-w-0 flex-col gap-3 rounded-3xl border border-ink p-5">
      <figcaption className="flex flex-col gap-1">
        <span className="font-medium">
          {title} <span className="text-sm text-graphite">({unit})</span>
        </span>
        <span className="text-sm break-words text-graphite">Latest: {summary}</span>
      </figcaption>
      {/* The Latest line carries the numbers for screen readers; the drawing adds nothing to read. */}
      <div aria-hidden className="h-56 w-full">
        {rows.length === 0 ? (
          <p className="flex h-full items-center justify-center text-sm text-graphite">
            No data in this window
          </p>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <XAxis
                dataKey="t"
                type="number"
                domain={["dataMin", "dataMax"]}
                tickFormatter={formatTime}
                stroke="var(--color-graphite)"
                fontSize={12}
              />
              <YAxis
                tickFormatter={(value: number) => formatTick(value, format)}
                stroke="var(--color-graphite)"
                fontSize={12}
                width={48}
              />
              <Tooltip
                labelFormatter={(label) => `${formatTime(Number(label))} UTC`}
                formatter={(value) =>
                  formatValue(typeof value === "number" ? value : null, format)
                }
              />
              {series.length > 1 && <Legend iconType="plainline" />}
              {series.map(({ name }, index) => {
                const { stroke, dash } = STROKES[index % STROKES.length];
                return (
                  <Line
                    key={name}
                    dataKey={name}
                    name={name}
                    stroke={stroke}
                    strokeDasharray={dash}
                    strokeWidth={2}
                    dot={isolatedDotRenderer(rows, name, stroke)}
                    isAnimationActive={false}
                  />
                );
              })}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </figure>
  );
}
