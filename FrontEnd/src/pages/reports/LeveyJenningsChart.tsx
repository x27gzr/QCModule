import { useState } from "react";
import dayjs from "dayjs";
import type { LeveyJenningsDto, LeveyJenningsPoint, QCStatus } from "@/services/qcResultService";
import type { WestgardRules } from "@/services/qcSampleService";

// ── colour palette ────────────────────────────────────────────────────────────
const STATUS_COLOR: Record<QCStatus, string> = {
  Accepted: "#10b981",
  Warning:  "#f59e0b",
  Rejected: "#ef4444",
  Pending:  "#9ca3af",
};

// ── SVG layout constants ──────────────────────────────────────────────────────
const W = 860;
const H = 420;
const PAD = { top: 24, right: 70, bottom: 48, left: 56 };
const PLOT_W = W - PAD.left - PAD.right;
const PLOT_H = H - PAD.top - PAD.bottom;

// ── Westgard violation types ──────────────────────────────────────────────────
interface Violation {
  pointIndices: number[];
  rule: string;
  type: "warning" | "rejection";
  msg: string;
}

function computeViolations(
  points: LeveyJenningsPoint[],
  mean: number,
  sd: number,
  rules: WestgardRules,
): Violation[] {
  if (!sd || points.length === 0) return [];

  const zs   = points.map(p => (p.value - mean) / sd);
  const viols: Violation[] = [];
  const fmt   = (i: number) => dayjs(points[i].resultDate).format("DD/MM");

  for (let i = 0; i < points.length; i++) {
    const z = zs[i];

    // 1:3s — single point beyond ±3SD → rejection
    if (rules.rule1_3s && Math.abs(z) > 3)
      viols.push({ pointIndices: [i], rule: "1:3s", type: "rejection",
        msg: `Point ${i + 1} (${fmt(i)}): value ${points[i].value} >${z > 0 ? "+" : ""}3SD` });

    // 1:2s — single point beyond ±2SD → warning
    else if (rules.rule1_2s && Math.abs(z) > 2)
      viols.push({ pointIndices: [i], rule: "1:2s", type: "warning",
        msg: `Point ${i + 1} (${fmt(i)}): value ${points[i].value} >${z > 0 ? "+" : ""}2SD` });

    if (i >= 1) {
      // 2:2s — two consecutive both beyond ±2SD same side → rejection
      if (rules.rule2_2s && Math.abs(z) > 2 && Math.abs(zs[i - 1]) > 2 &&
          Math.sign(z) === Math.sign(zs[i - 1]))
        viols.push({ pointIndices: [i - 1, i], rule: "2:2s", type: "rejection",
          msg: `Points ${i} & ${i + 1} (${fmt(i - 1)}–${fmt(i)}): 2 consecutive >±2SD same side` });

      // R:4s — two consecutive differ by >4SD → rejection
      if (rules.ruleR_4s && Math.abs(z - zs[i - 1]) > 4)
        viols.push({ pointIndices: [i - 1, i], rule: "R:4s", type: "rejection",
          msg: `Points ${i} & ${i + 1} (${fmt(i - 1)}–${fmt(i)}): range between values >4SD` });
    }

    if (i >= 2) {
      // 3:1s — 3 consecutive beyond ±1SD same side → warning
      if (rules.rule3_1s) {
        const seg = zs.slice(i - 2, i + 1);
        if (seg.every(z => z > 1) || seg.every(z => z < -1))
          viols.push({ pointIndices: [i - 2, i - 1, i], rule: "3:1s", type: "warning",
            msg: `Points ${i - 1}–${i + 1} (${fmt(i - 2)}–${fmt(i)}): 3 consecutive >±1SD same side` });
      }
    }

    if (i >= 3) {
      // 4:1s — 4 consecutive beyond ±1SD same side → rejection
      if (rules.rule4_1s) {
        const seg = zs.slice(i - 3, i + 1);
        if (seg.every(z => z > 1) || seg.every(z => z < -1))
          viols.push({ pointIndices: [i - 3, i - 2, i - 1, i], rule: "4:1s", type: "rejection",
            msg: `Points ${i - 2}–${i + 1} (${fmt(i - 3)}–${fmt(i)}): 4 consecutive >±1SD same side` });
      }
    }

    if (i >= 8) {
      // 9x — 9 consecutive same side of mean → rejection
      if (rules.rule9x) {
        const seg = zs.slice(i - 8, i + 1);
        if (seg.every(z => z > 0) || seg.every(z => z < 0))
          viols.push({ pointIndices: Array.from({ length: 9 }, (_, k) => i - 8 + k), rule: "9x", type: "rejection",
            msg: `Points ${i - 7}–${i + 1} (${fmt(i - 8)}–${fmt(i)}): 9 consecutive same side of mean` });
      }
    }

    if (i >= 9) {
      // 10x — 10 consecutive same side of mean → rejection
      if (rules.rule10x) {
        const seg = zs.slice(i - 9, i + 1);
        if (seg.every(z => z > 0) || seg.every(z => z < 0))
          viols.push({ pointIndices: Array.from({ length: 10 }, (_, k) => i - 9 + k), rule: "10x", type: "rejection",
            msg: `Points ${i - 8}–${i + 1} (${fmt(i - 9)}–${fmt(i)}): 10 consecutive same side of mean` });
      }
    }
  }

  return viols;
}

// ── Props ─────────────────────────────────────────────────────────────────────
interface Props {
  data: LeveyJenningsDto;
  westgardRules?: WestgardRules;
}

// ── Main component ────────────────────────────────────────────────────────────
export default function LeveyJenningsChart({ data, westgardRules }: Props) {
  const [hover, setHover] = useState<number | null>(null);

  const { mean, sd, points } = data;

  // Violations (computed from active rules)
  const violations = westgardRules
    ? computeViolations(points, mean, sd, westgardRules)
    : [];

  // Per-point violation severity (for colouring)
  const pointViolType = points.map((_, i) => {
    const viol = violations.filter(v => v.pointIndices.includes(i));
    if (viol.some(v => v.type === "rejection")) return "rejection";
    if (viol.some(v => v.type === "warning"))   return "warning";
    return null;
  });

  // Y domain
  const values  = points.map(p => p.value);
  const dataMin = values.length ? Math.min(...values) : data.minus3SD;
  const dataMax = values.length ? Math.max(...values) : data.plus3SD;
  const yMin    = Math.min(data.minus3SD, dataMin) - sd * 0.4;
  const yMax    = Math.max(data.plus3SD, dataMax)  + sd * 0.4;
  const ySpan   = yMax - yMin || 1;

  const yOf = (v: number) => PAD.top + ((yMax - v) / ySpan) * PLOT_H;
  const xOf = (i: number) =>
    points.length <= 1
      ? PAD.left + PLOT_W / 2
      : PAD.left + (i / (points.length - 1)) * PLOT_W;

  const limits = [
    { v: data.plus3SD,  label: "+3SD", color: "#ef4444", dash: "4 3" },
    { v: data.plus2SD,  label: "+2SD", color: "#f59e0b", dash: "4 3" },
    { v: data.plus1SD,  label: "+1SD", color: "#94a3b8", dash: "2 3" },
    { v: mean,          label: "Mean", color: "#3b82f6", dash: "" },
    { v: data.minus1SD, label: "-1SD", color: "#94a3b8", dash: "2 3" },
    { v: data.minus2SD, label: "-2SD", color: "#f59e0b", dash: "4 3" },
    { v: data.minus3SD, label: "-3SD", color: "#ef4444", dash: "4 3" },
  ];

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

  const labelStep = Math.max(1, Math.ceil(points.length / 8));

  // Determine dot colour: violations override stored status
  const dotColor = (i: number): string => {
    if (pointViolType[i] === "rejection") return "#ef4444";
    if (pointViolType[i] === "warning")   return "#f59e0b";
    return STATUS_COLOR[points[i].status];
  };

  // Active rules badge list
  const RULE_LABELS: { key: keyof WestgardRules; label: string; type: "warning" | "rejection" }[] = [
    { key: "rule1_2s",  label: "1:2s",  type: "warning"   },
    { key: "rule1_3s",  label: "1:3s",  type: "rejection" },
    { key: "rule2_2s",  label: "2:2s",  type: "rejection" },
    { key: "ruleR_4s",  label: "R:4s",  type: "rejection" },
    { key: "rule3_1s",  label: "3:1s",  type: "warning"   },
    { key: "rule4_1s",  label: "4:1s",  type: "rejection" },
    { key: "rule9x",    label: "9x",    type: "rejection" },
    { key: "rule10x",   label: "10x",   type: "rejection" },
  ];

  return (
    <div className="w-full space-y-4">
      {/* Chart */}
      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ minWidth: 480 }}>
          {sd > 0 && bands.map((b, i) => (
            <rect key={i} x={PAD.left} y={yOf(b.to)} width={PLOT_W}
              height={Math.max(0, yOf(b.from) - yOf(b.to))} fill={b.fill} opacity={b.opacity} />
          ))}

          {sd > 0 && limits.map(l => (
            <g key={l.label}>
              <line x1={PAD.left} y1={yOf(l.v)} x2={PAD.left + PLOT_W} y2={yOf(l.v)}
                stroke={l.color} strokeWidth={l.label === "Mean" ? 1.5 : 1}
                strokeDasharray={l.dash} />
              <text x={PAD.left + PLOT_W + 6} y={yOf(l.v) + 3} fontSize="11"
                fill={l.color} fontWeight="500">{l.label}</text>
              <text x={PAD.left - 8} y={yOf(l.v) + 3} fontSize="10" textAnchor="end"
                fill="#94a3b8">{l.v.toFixed(2)}</text>
            </g>
          ))}

          {points.length > 1 && (
            <path d={linePath} fill="none" stroke="#64748b" strokeWidth="1.5" opacity="0.6" />
          )}

          {points.map((p, i) => {
            const isHover = hover === i;
            const color   = dotColor(i);
            const hasViol = pointViolType[i] !== null;
            return (
              <g key={p.resultId} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}
                style={{ cursor: "pointer" }}>
                <circle cx={xOf(i)} cy={yOf(p.value)} r="12" fill="transparent" />
                {/* Pulse ring for violations */}
                {hasViol && (
                  <circle cx={xOf(i)} cy={yOf(p.value)} r={isHover ? 9 : 8}
                    fill="none" stroke={color} strokeWidth="1" opacity="0.4" />
                )}
                <circle cx={xOf(i)} cy={yOf(p.value)} r={isHover ? 6 : 4}
                  fill={color} stroke="#fff" strokeWidth="1.5" />
              </g>
            );
          })}

          {points.map((p, i) =>
            i % labelStep === 0 ? (
              <text key={p.resultId} x={xOf(i)} y={H - PAD.bottom + 18} fontSize="10"
                textAnchor="middle" fill="#94a3b8">
                {dayjs(p.resultDate).format("DD/MM")}
              </text>
            ) : null
          )}

          {/* Tooltip */}
          {hover !== null && (() => {
            const p  = points[hover];
            const z  = sd > 0 ? ((p.value - mean) / sd) : 0;
            const tx = Math.min(Math.max(xOf(hover) - 70, PAD.left), PAD.left + PLOT_W - 148);
            const ty = Math.max(yOf(p.value) - 86, 4);
            const viols = violations.filter(v => v.pointIndices.includes(hover));
            const boxH  = 68 + (viols.length > 0 ? 16 * viols.length + 4 : 0);
            return (
              <g pointerEvents="none">
                <rect x={tx} y={ty} width="148" height={boxH} rx="6" fill="#1e293b" opacity="0.96" />
                <text x={tx + 10} y={ty + 18} fontSize="11" fill="#fff" fontWeight="600">
                  {dayjs(p.resultDate).format("DD MMM YYYY HH:mm")}
                </text>
                <text x={tx + 10} y={ty + 34} fontSize="11" fill="#cbd5e1">
                  Value: {p.value}  ·  Z: {z.toFixed(2)}
                </text>
                <text x={tx + 10} y={ty + 50} fontSize="11" fill={dotColor(hover)} fontWeight="500">
                  {p.status}{p.westgardFlags ? ` · ${p.westgardFlags}` : ""}
                </text>
                {viols.map((v, k) => (
                  <text key={k} x={tx + 10} y={ty + 66 + k * 16} fontSize="10"
                    fill={v.type === "rejection" ? "#fca5a5" : "#fcd34d"}>
                    ▲ {v.rule}
                  </text>
                ))}
              </g>
            );
          })()}
        </svg>
      </div>

      {/* Active rules + violations panel */}
      {westgardRules && (
        <div className="space-y-3">
          {/* Active rules badges */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-gray-500 dark:text-dark-400">Active rules:</span>
            {RULE_LABELS.map(r =>
              westgardRules[r.key] ? (
                <span key={r.key}
                  className={`rounded px-2 py-0.5 text-xs font-mono font-medium
                    ${r.type === "rejection"
                      ? "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400"
                      : "bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400"}`}>
                  {r.label}
                </span>
              ) : null
            )}
          </div>

          {/* Violations list */}
          {violations.length === 0 ? (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/10 dark:text-emerald-400">
              ✓ All values within control limits — no rule violations detected
            </div>
          ) : (
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-gray-600 dark:text-dark-300">
                {violations.length} violation{violations.length !== 1 ? "s" : ""} detected
              </p>
              {violations.map((v, i) => (
                <div key={i}
                  className={`flex items-start gap-3 rounded-lg border-l-4 px-3 py-2 text-sm
                    ${v.type === "rejection"
                      ? "border-red-500 bg-red-50 text-red-800 dark:bg-red-900/10 dark:text-red-300"
                      : "border-amber-400 bg-amber-50 text-amber-800 dark:bg-amber-900/10 dark:text-amber-300"}`}>
                  <span className="mt-0.5 shrink-0 rounded px-1.5 py-0.5 font-mono text-xs font-bold
                    bg-white/60 dark:bg-black/20">
                    {v.rule}
                  </span>
                  <span>{v.msg}</span>
                  <span className={`ml-auto shrink-0 text-xs font-medium ${v.type === "rejection" ? "text-red-600 dark:text-red-400" : "text-amber-600 dark:text-amber-400"}`}>
                    {v.type === "rejection" ? "Reject" : "Warning"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
