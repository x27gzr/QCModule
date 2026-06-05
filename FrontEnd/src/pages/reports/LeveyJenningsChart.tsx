import { useState } from "react";
import dayjs from "dayjs";
import type { LeveyJenningsDto, QCStatus } from "@/services/qcResultService";

const STATUS_COLOR: Record<QCStatus, string> = {
  Accepted: "#10b981",
  Warning:  "#f59e0b",
  Rejected: "#ef4444",
  Pending:  "#9ca3af",
};

// Fixed coordinate system; SVG scales responsively via viewBox.
const W = 860;
const H = 420;
const PAD = { top: 24, right: 70, bottom: 48, left: 56 };
const PLOT_W = W - PAD.left - PAD.right;
const PLOT_H = H - PAD.top - PAD.bottom;

interface Props {
  data: LeveyJenningsDto;
}

export default function LeveyJenningsChart({ data }: Props) {
  const [hover, setHover] = useState<number | null>(null);

  const { mean, sd, points } = data;

  // Y domain: span ±3SD plus padding, but always include any out-of-range points.
  const values   = points.map(p => p.value);
  const dataMin  = values.length ? Math.min(...values) : data.minus3SD;
  const dataMax  = values.length ? Math.max(...values) : data.plus3SD;
  const yMin     = Math.min(data.minus3SD, dataMin) - sd * 0.4;
  const yMax     = Math.max(data.plus3SD, dataMax) + sd * 0.4;
  const ySpan    = yMax - yMin || 1;

  const yOf = (v: number) => PAD.top + ((yMax - v) / ySpan) * PLOT_H;
  const xOf = (i: number) =>
    points.length <= 1
      ? PAD.left + PLOT_W / 2
      : PAD.left + (i / (points.length - 1)) * PLOT_W;

  // Control limit lines (value, label, color, dashed)
  const limits = [
    { v: data.plus3SD,  label: "+3SD", color: "#ef4444", dash: "4 3" },
    { v: data.plus2SD,  label: "+2SD", color: "#f59e0b", dash: "4 3" },
    { v: data.plus1SD,  label: "+1SD", color: "#94a3b8", dash: "2 3" },
    { v: mean,          label: "Mean", color: "#3b82f6", dash: "" },
    { v: data.minus1SD, label: "-1SD", color: "#94a3b8", dash: "2 3" },
    { v: data.minus2SD, label: "-2SD", color: "#f59e0b", dash: "4 3" },
    { v: data.minus3SD, label: "-3SD", color: "#ef4444", dash: "4 3" },
  ];

  // SD zone background bands (subtle)
  const bands = [
    { from: data.plus2SD,  to: data.plus3SD,  fill: "#ef4444", opacity: 0.05 },
    { from: data.plus1SD,  to: data.plus2SD,  fill: "#f59e0b", opacity: 0.05 },
    { from: data.minus1SD, to: data.plus1SD,  fill: "#10b981", opacity: 0.05 },
    { from: data.minus2SD, to: data.minus1SD, fill: "#f59e0b", opacity: 0.05 },
    { from: data.minus3SD, to: data.minus2SD, fill: "#ef4444", opacity: 0.05 },
  ];

  const linePath = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${xOf(i).toFixed(1)} ${yOf(p.value).toFixed(1)}`)
    .join(" ");

  // X-axis labels: show at most ~8 evenly spaced dates to avoid crowding.
  const labelStep = Math.max(1, Math.ceil(points.length / 8));

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ minWidth: 480 }}>
        {/* SD zone bands */}
        {sd > 0 && bands.map((b, i) => (
          <rect key={i} x={PAD.left} y={yOf(b.to)} width={PLOT_W}
            height={Math.max(0, yOf(b.from) - yOf(b.to))} fill={b.fill} opacity={b.opacity} />
        ))}

        {/* Control limit lines + right-side labels */}
        {sd > 0 && limits.map((l) => (
          <g key={l.label}>
            <line x1={PAD.left} y1={yOf(l.v)} x2={PAD.left + PLOT_W} y2={yOf(l.v)}
              stroke={l.color} strokeWidth={l.label === "Mean" ? 1.5 : 1}
              strokeDasharray={l.dash} />
            <text x={PAD.left + PLOT_W + 6} y={yOf(l.v) + 3} fontSize="11"
              fill={l.color} className="font-medium">{l.label}</text>
            <text x={PAD.left - 8} y={yOf(l.v) + 3} fontSize="10" textAnchor="end"
              className="fill-gray-400 dark:fill-dark-400">{l.v.toFixed(2)}</text>
          </g>
        ))}

        {/* Connecting line */}
        {points.length > 1 && (
          <path d={linePath} fill="none" stroke="#64748b" strokeWidth="1.5" opacity="0.6" />
        )}

        {/* Data points */}
        {points.map((p, i) => {
          const isHover = hover === i;
          return (
            <g key={p.resultId}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              style={{ cursor: "pointer" }}>
              {/* Larger invisible hit area */}
              <circle cx={xOf(i)} cy={yOf(p.value)} r="12" fill="transparent" />
              <circle cx={xOf(i)} cy={yOf(p.value)} r={isHover ? 6 : 4}
                fill={STATUS_COLOR[p.status]} stroke="#fff" strokeWidth="1.5" />
            </g>
          );
        })}

        {/* X-axis date labels */}
        {points.map((p, i) =>
          i % labelStep === 0 ? (
            <text key={p.resultId} x={xOf(i)} y={H - PAD.bottom + 18} fontSize="10"
              textAnchor="middle" className="fill-gray-400 dark:fill-dark-400">
              {dayjs(p.resultDate).format("DD/MM")}
            </text>
          ) : null
        )}

        {/* Tooltip */}
        {hover !== null && (() => {
          const p  = points[hover];
          const tx = Math.min(Math.max(xOf(hover) - 70, PAD.left), PAD.left + PLOT_W - 140);
          const ty = Math.max(yOf(p.value) - 78, 4);
          return (
            <g pointerEvents="none">
              <rect x={tx} y={ty} width="140" height="68" rx="6"
                fill="#1e293b" opacity="0.96" />
              <text x={tx + 10} y={ty + 18} fontSize="11" fill="#fff" className="font-semibold">
                {dayjs(p.resultDate).format("DD MMM YYYY HH:mm")}
              </text>
              <text x={tx + 10} y={ty + 34} fontSize="11" fill="#cbd5e1">
                Value: {p.value}  ·  Z: {p.zScore.toFixed(2)}
              </text>
              <text x={tx + 10} y={ty + 50} fontSize="11" fill={STATUS_COLOR[p.status]} className="font-medium">
                {p.status}{p.westgardFlags ? ` · ${p.westgardFlags}` : ""}
              </text>
            </g>
          );
        })()}
      </svg>
    </div>
  );
}
