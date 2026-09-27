"use client";

import { Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { Point } from "@/lib/ops";
import { formatNumber, formatPercent, NO_DATA } from "@/lib/ops-format";

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
      return `${(value / 1000).toFixed(1)} s`;
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

function latestValue(points: Point[]): number | null {
  for (let index = points.length - 1; index >= 0; index -= 1) {
    const value = points[index][1];
    if (value !== null) return value;
  }
  return null;
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
                    dot={false}
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
