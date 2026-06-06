import { useState } from "react";
import dayjs from "dayjs";
import type { LeveyJenningsDto, LeveyJenningsPoint, QCStatus } from "@/services/qcResultService";
import type { WestgardRules } from "@/services/qcSampleService";

// ── Z-score chart constants ───────────────────────────────────────────────────
const W    = 900;
const H    = 340;
const PAD  = { top: 28, right: 16, bottom: 36, left: 44 };
const PW   = W - PAD.left - PAD.right;
const PH   = H - PAD.top  - PAD.bottom;
const Y_MIN = -4;
const Y_MAX =  4;
const Y_SPAN = Y_MAX - Y_MIN;

const yOf = (z: number) => PAD.top + ((Y_MAX - z) / Y_SPAN) * PH;
const xOf = (i: number, n: number) =>
  n <= 1 ? PAD.left + PW / 2 : PAD.left + (i / (n - 1)) * PW;

// ── Westgard violation engine ─────────────────────────────────────────────────
interface Violation {
  pointIndices: number[];
  rule: string;
  type: "warning" | "rejection";
  msg: string;
}

function computeViolations(
  pts: LeveyJenningsPoint[],
  mean: number,
  sd: number,
  rules: WestgardRules,
): Violation[] {
  if (!sd || pts.length === 0) return [];
  const zs   = pts.map(p => (p.value - mean) / sd);
  const viols: Violation[] = [];
  const fmt  = (i: number) => dayjs(pts[i].resultDate).format("DD/MM");

  for (let i = 0; i < pts.length; i++) {
    const z = zs[i];
    if (rules.rule1_3s && Math.abs(z) > 3)
      viols.push({ pointIndices: [i], rule: "1:3s", type: "rejection",
        msg: `Titik ${i + 1} (${fmt(i)}): ${pts[i].value} melewati ±3SD` });
    else if (rules.rule1_2s && Math.abs(z) > 2)
      viols.push({ pointIndices: [i], rule: "1:2s", type: "warning",
        msg: `Titik ${i + 1} (${fmt(i)}): ${pts[i].value} melewati ±2SD` });

    if (i >= 1) {
      if (rules.rule2_2s && Math.abs(z) > 2 && Math.abs(zs[i-1]) > 2 && Math.sign(z) === Math.sign(zs[i-1]))
        viols.push({ pointIndices: [i-1,i], rule: "2:2s", type: "rejection",
          msg: `Titik ${i}–${i+1} (${fmt(i-1)}–${fmt(i)}): 2 berturut >±2SD sisi sama` });
      if (rules.ruleR_4s && Math.abs(z - zs[i-1]) > 4)
        viols.push({ pointIndices: [i-1,i], rule: "R:4s", type: "rejection",
          msg: `Titik ${i}–${i+1}: rentang >4SD` });
    }
    if (i >= 2 && rules.rule3_1s) {
      const seg = zs.slice(i-2, i+1);
      if (seg.every(v => v > 1) || seg.every(v => v < -1))
        viols.push({ pointIndices: [i-2,i-1,i], rule: "3:1s", type: "warning",
          msg: `Titik ${i-1}–${i+1}: 3 berturut >±1SD sisi sama` });
    }
    if (i >= 3 && rules.rule4_1s) {
      const seg = zs.slice(i-3, i+1);
      if (seg.every(v => v > 1) || seg.every(v => v < -1))
        viols.push({ pointIndices: [i-3,i-2,i-1,i], rule: "4:1s", type: "rejection",
          msg: `Titik ${i-2}–${i+1}: 4 berturut >±1SD sisi sama` });
    }
    if (i >= 8 && rules.rule9x) {
      const seg = zs.slice(i-8, i+1);
      if (seg.every(v => v > 0) || seg.every(v => v < 0))
        viols.push({ pointIndices: Array.from({length:9},(_,k)=>i-8+k), rule: "9x", type: "rejection",
          msg: `Titik ${i-7}–${i+1}: 9 berturut sisi yang sama` });
    }
    if (i >= 9 && rules.rule10x) {
      const seg = zs.slice(i-9, i+1);
      if (seg.every(v => v > 0) || seg.every(v => v < 0))
        viols.push({ pointIndices: Array.from({length:10},(_,k)=>i-9+k), rule: "10x", type: "rejection",
          msg: `Titik ${i-8}–${i+1}: 10 berturut sisi yang sama` });
    }
  }
  return viols;
}

// ── Dot colour ────────────────────────────────────────────────────────────────
const STATUS_COLOR: Record<QCStatus, string> = {
  Accepted: "#2563eb",  // blue — like HCLab
  Warning:  "#f59e0b",
  Rejected: "#ef4444",
  Pending:  "#9ca3af",
};

function dotColor(i: number, viols: Violation[], status: QCStatus): string {
  if (viols.some(v => v.pointIndices.includes(i) && v.type === "rejection")) return "#ef4444";
  if (viols.some(v => v.pointIndices.includes(i) && v.type === "warning"))   return "#f59e0b";
  return STATUS_COLOR[status];
}

// ── Props ─────────────────────────────────────────────────────────────────────
interface Props {
  data: LeveyJenningsDto;
  westgardRules?: WestgardRules;
  maxPoints?: number;
  /** Show full chart with violations panel (Reports page) */
  showViolations?: boolean;
}

export default function LeveyJenningsChart({ data, westgardRules, maxPoints, showViolations = true }: Props) {
  const [hover, setHover] = useState<number | null>(null);

  const { mean, sd } = data;
  const pts = maxPoints ? data.points.slice(-maxPoints) : data.points;
  const n   = pts.length;

  const viols = westgardRules ? computeViolations(pts, mean, sd, westgardRules) : [];

  // Z-scores (use stored zScore OR recompute from mean/sd)
  const zs = pts.map(p => sd > 0 ? (p.value - mean) / sd : p.zScore);

  // Build polyline
  const polylinePoints = pts.map((_, i) =>
    `${xOf(i, n).toFixed(1)},${yOf(zs[i]).toFixed(1)}`
  ).join(" ");

  // SD levels to draw
  const sdLines = [-3, -2, -1, 0, 1, 2, 3];

  return (
    <div className="w-full space-y-3">
      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ minWidth: 560 }}>

          {/* Background */}
          <rect x={PAD.left} y={PAD.top} width={PW} height={PH} fill="none" />

          {/* Vertical column grid (one per data point) */}
          {pts.map((_, i) => (
            <line key={`vg-${i}`}
              x1={xOf(i,n)} y1={PAD.top} x2={xOf(i,n)} y2={PAD.top+PH}
              stroke="#e2e8f0" strokeWidth="0.7" className="dark:stroke-dark-600/50" />
          ))}

          {/* Horizontal SD lines */}
          {sdLines.map(sd_ => {
            const y     = yOf(sd_);
            const isMean = sd_ === 0;
            const is3s   = Math.abs(sd_) === 3;
            const is2s   = Math.abs(sd_) === 2;
            const color  = isMean ? "#3b82f6"
                         : is3s   ? "#ef4444"
                         : is2s   ? "#f59e0b"
                         :          "#94a3b8";
            return (
              <g key={`hl-${sd_}`}>
                <line x1={PAD.left} y1={y} x2={PAD.left+PW} y2={y}
                  stroke={color}
                  strokeWidth={isMean ? 1.5 : 0.8}
                  strokeDasharray={isMean ? "" : is3s ? "4 3" : is2s ? "4 3" : "2 3"} />
                <text x={PAD.left - 6} y={y + 3.5} textAnchor="end" fontSize="10" fill={color} fontWeight={isMean ? "600" : "400"}>
                  {sd_ > 0 ? `+${sd_}` : sd_}
                </text>
              </g>
            );
          })}

          {/* Outer boundary lines at ±4 */}
          {([-4, 4] as const).map(v => (
            <line key={`b${v}`} x1={PAD.left} y1={yOf(v)} x2={PAD.left+PW} y2={yOf(v)}
              stroke="#cbd5e1" strokeWidth="0.5" className="dark:stroke-dark-600" />
          ))}

          {/* Connecting polyline */}
          {n > 1 && (
            <polyline points={polylinePoints}
              fill="none" stroke="#3b82f6" strokeWidth="1.5" opacity="0.8" />
          )}

          {/* Data points */}
          {pts.map((p, i) => {
            const y       = yOf(zs[i]);
            const color   = dotColor(i, viols, p.status);
            const isHover = hover === i;
            const hasViol = viols.some(v => v.pointIndices.includes(i));
            return (
              <g key={p.resultId}
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
                style={{ cursor: "pointer" }}>
                <circle cx={xOf(i,n)} cy={y} r="10" fill="transparent" />
                {hasViol && (
                  <circle cx={xOf(i,n)} cy={y} r={isHover ? 8 : 7}
                    fill="none" stroke={color} strokeWidth="1" opacity="0.35" />
                )}
                <circle cx={xOf(i,n)} cy={y} r={isHover ? 5.5 : 4}
                  fill={color} stroke="#fff" strokeWidth="1.5" />
              </g>
            );
          })}

          {/* X-axis: sequential numbers */}
          {pts.map((p, i) => {
            const step = Math.max(1, Math.ceil(n / 20));
            if (i % step !== 0 && i !== n - 1) return null;
            return (
              <text key={`xl-${i}`} x={xOf(i,n)} y={H - PAD.bottom + 14}
                textAnchor="middle" fontSize="9" fill="#94a3b8">
                {dayjs(p.resultDate).format("DD/MM")}
              </text>
            );
          })}

          {/* Tooltip */}
          {hover !== null && (() => {
            const p    = pts[hover];
            const z    = zs[hover];
            const x    = xOf(hover, n);
            const y    = yOf(z);
            const tx   = Math.min(Math.max(x - 72, PAD.left), PAD.left + PW - 148);
            const ty   = Math.max(y - 72, PAD.top + 2);
            const pvs  = viols.filter(v => v.pointIndices.includes(hover));
            const boxH = 62 + pvs.length * 14;
            return (
              <g pointerEvents="none">
                <rect x={tx} y={ty} width={148} height={boxH} rx="5" fill="#0f172a" opacity="0.93" />
                <text x={tx+8} y={ty+15} fontSize="10" fill="#f1f5f9" fontWeight="600">
                  {dayjs(p.resultDate).format("DD MMM YYYY HH:mm")}
                </text>
                <text x={tx+8} y={ty+29} fontSize="10" fill="#94a3b8">
                  Nilai: {p.value}  ·  Z: {z >= 0 ? "+" : ""}{z.toFixed(2)}
                </text>
                <text x={tx+8} y={ty+43} fontSize="10" fill={dotColor(hover, viols, p.status)} fontWeight="500">
                  {p.status}{p.westgardFlags ? ` (${p.westgardFlags})` : ""}
                </text>
                {pvs.map((v, k) => (
                  <text key={k} x={tx+8} y={ty+57+k*14} fontSize="9"
                    fill={v.type === "rejection" ? "#fca5a5" : "#fcd34d"}>
                    ▲ {v.rule}: {v.msg.split(":")[0]}
                  </text>
                ))}
              </g>
            );
          })()}
        </svg>
      </div>

      {/* Violations panel — only on Reports page */}
      {showViolations && westgardRules && (
        <div className="space-y-2">
          {violations_panel(viols, westgardRules)}
        </div>
      )}
    </div>
  );
}

// ── Violations panel ──────────────────────────────────────────────────────────
function violations_panel(viols: Violation[], rules: WestgardRules) {
  const RULE_LABELS: { key: keyof WestgardRules; label: string; type: "warning"|"rejection" }[] = [
    { key: "rule1_2s", label: "1:2s",  type: "warning"   },
    { key: "rule1_3s", label: "1:3s",  type: "rejection" },
    { key: "rule2_2s", label: "2:2s",  type: "rejection" },
    { key: "ruleR_4s", label: "R:4s",  type: "rejection" },
    { key: "rule3_1s", label: "3:1s",  type: "warning"   },
    { key: "rule4_1s", label: "4:1s",  type: "rejection" },
    { key: "rule9x",   label: "9x",    type: "rejection" },
    { key: "rule10x",  label: "10x",   type: "rejection" },
  ];

  return (
    <>
      <div className="flex flex-wrap gap-1.5">
        <span className="text-xs text-gray-400 dark:text-dark-500 self-center">Rules aktif:</span>
        {RULE_LABELS.filter(r => rules[r.key]).map(r => (
          <span key={r.key} className={`rounded px-1.5 py-0.5 font-mono text-xs font-medium
            ${r.type==="rejection"
              ? "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400"
              : "bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400"}`}>
            {r.label}
          </span>
        ))}
      </div>
      {viols.length === 0 ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700
          dark:border-emerald-800 dark:bg-emerald-900/10 dark:text-emerald-400">
          ✓ Semua nilai dalam batas kontrol
        </div>
      ) : (
        <div className="space-y-1">
          {viols.map((v, i) => (
            <div key={i} className={`flex items-start gap-2 rounded border-l-4 px-2.5 py-1.5 text-xs
              ${v.type==="rejection"
                ? "border-red-500 bg-red-50 text-red-800 dark:bg-red-900/10 dark:text-red-300"
                : "border-amber-400 bg-amber-50 text-amber-800 dark:bg-amber-900/10 dark:text-amber-300"}`}>
              <span className="shrink-0 rounded bg-white/60 px-1 font-mono font-bold dark:bg-black/20">{v.rule}</span>
              <span>{v.msg}</span>
              <span className="ml-auto shrink-0 font-medium">{v.type === "rejection" ? "Reject" : "Warning"}</span>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
