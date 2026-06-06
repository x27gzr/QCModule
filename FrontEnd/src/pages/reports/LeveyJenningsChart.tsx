import { useState } from "react";
import dayjs from "dayjs";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import type { LeveyJenningsDto, LeveyJenningsPoint, QCStatus } from "@/services/qcResultService";
import type { WestgardRules } from "@/services/qcSampleService";

dayjs.extend(isSameOrBefore);

// ── Chart layout constants ────────────────────────────────────────────────────
const W   = 900;
const H   = 260;
const PAD = { top: 24, right: 60, bottom: 32, left: 60 };
const PW  = W - PAD.left - PAD.right;
const PH  = H - PAD.top  - PAD.bottom;

// ── Westgard violation engine ─────────────────────────────────────────────────
interface Violation {
  pointIndices: number[];   // indices into the filtered pts array (non-null slots)
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
  const zs  = pts.map(p => (p.value - mean) / sd);
  const fmt = (i: number) => dayjs(pts[i].resultDate).format("DD/MM");
  const v: Violation[] = [];

  for (let i = 0; i < pts.length; i++) {
    const z = zs[i];
    if (rules.rule1_3s && Math.abs(z) > 3)
      v.push({ pointIndices:[i], rule:"1:3s", type:"rejection",
        msg:`Titik ${i+1} (${fmt(i)}): ${pts[i].value} > ±3SD` });
    else if (rules.rule1_2s && Math.abs(z) > 2)
      v.push({ pointIndices:[i], rule:"1:2s", type:"warning",
        msg:`Titik ${i+1} (${fmt(i)}): ${pts[i].value} > ±2SD` });
    if (i >= 1) {
      if (rules.rule2_2s && Math.abs(z)>2 && Math.abs(zs[i-1])>2 && Math.sign(z)===Math.sign(zs[i-1]))
        v.push({ pointIndices:[i-1,i], rule:"2:2s", type:"rejection",
          msg:`Titik ${i}-${i+1}: 2 berturut >±2SD sisi sama` });
      if (rules.ruleR_4s && Math.abs(z - zs[i-1]) > 4)
        v.push({ pointIndices:[i-1,i], rule:"R:4s", type:"rejection",
          msg:`Titik ${i}-${i+1}: rentang >4SD` });
    }
    if (i>=2 && rules.rule3_1s) {
      const s=zs.slice(i-2,i+1);
      if (s.every(v=>v>1)||s.every(v=>v<-1))
        v.push({pointIndices:[i-2,i-1,i],rule:"3:1s",type:"warning",msg:`Titik ${i-1}-${i+1}: 3 berturut >±1SD`});
    }
    if (i>=3 && rules.rule4_1s) {
      const s=zs.slice(i-3,i+1);
      if (s.every(v=>v>1)||s.every(v=>v<-1))
        v.push({pointIndices:[i-3,i-2,i-1,i],rule:"4:1s",type:"rejection",msg:`Titik ${i-2}-${i+1}: 4 berturut >±1SD`});
    }
    if (i>=8 && rules.rule9x) {
      const s=zs.slice(i-8,i+1);
      if (s.every(v=>v>0)||s.every(v=>v<0))
        v.push({pointIndices:Array.from({length:9},(_,k)=>i-8+k),rule:"9x",type:"rejection",msg:`Titik ${i-7}-${i+1}: 9 berturut sisi sama`});
    }
    if (i>=9 && rules.rule10x) {
      const s=zs.slice(i-9,i+1);
      if (s.every(v=>v>0)||s.every(v=>v<0))
        v.push({pointIndices:Array.from({length:10},(_,k)=>i-9+k),rule:"10x",type:"rejection",msg:`Titik ${i-8}-${i+1}: 10 berturut sisi sama`});
    }
  }
  return v;
}

// ── Dot colour ────────────────────────────────────────────────────────────────
const STATUS_COLOR: Record<QCStatus, string> = {
  Accepted: "#2563eb",
  Warning:  "#f59e0b",
  Rejected: "#ef4444",
  Pending:  "#9ca3af",
};

function resolveDotColor(ptIdx: number, viols: Violation[], status: QCStatus): string {
  if (viols.some(v => v.pointIndices.includes(ptIdx) && v.type==="rejection")) return "#ef4444";
  if (viols.some(v => v.pointIndices.includes(ptIdx) && v.type==="warning"))   return "#f59e0b";
  return STATUS_COLOR[status];
}

// ── Date-range helpers ────────────────────────────────────────────────────────
function generateDateRange(from: string, to: string): string[] {
  const dates: string[] = [];
  let cur = dayjs(from);
  const end = dayjs(to);
  while (cur.isSameOrBefore(end, "day")) {
    dates.push(cur.format("YYYY-MM-DD"));
    cur = cur.add(1, "day");
  }
  return dates;
}

// ── Props ─────────────────────────────────────────────────────────────────────
interface Props {
  data: LeveyJenningsDto;
  westgardRules?: WestgardRules;
  showViolations?: boolean;
  fillHeight?: boolean;
  dateFrom?: string;
  dateTo?: string;
}

// ── Main chart ────────────────────────────────────────────────────────────────
export default function LeveyJenningsChart({
  data, westgardRules, showViolations = true, fillHeight = false,
  dateFrom, dateTo,
}: Props) {
  const [hover, setHover] = useState<number | null>(null); // index into allDates

  const { mean, sd, points } = data;

  // Build date slots
  const from = dateFrom ?? (points.length ? dayjs(points[0].resultDate).format("YYYY-MM-DD") : dayjs().subtract(20,"day").format("YYYY-MM-DD"));
  const to   = dateTo   ?? (points.length ? dayjs(points[points.length-1].resultDate).format("YYYY-MM-DD") : dayjs().format("YYYY-MM-DD"));
  const allDates = generateDateRange(from, to);
  const n = allDates.length;

  // One result per day (take first if multiple same day)
  const dateMap = new Map<string, LeveyJenningsPoint>();
  points.forEach(p => {
    const d = dayjs(p.resultDate).format("YYYY-MM-DD");
    if (!dateMap.has(d)) dateMap.set(d, p);
  });
  const slots: (LeveyJenningsPoint | null)[] = allDates.map(d => dateMap.get(d) ?? null);

  // Filtered non-null pts for violation engine (preserving order)
  const filledPts = slots.filter((s): s is LeveyJenningsPoint => s !== null);
  // Map slot index → filledPts index
  const slotToPt: (number | null)[] = (() => {
    let idx = 0;
    return slots.map(s => s ? idx++ : null);
  })();

  const violations = westgardRules ? computeViolations(filledPts, mean, sd, westgardRules) : [];

  // Y-axis: actual values ±3.5SD
  const yPad  = sd > 0 ? 3.5 * sd : 1;
  const yMin  = mean - yPad;
  const yMax  = mean + yPad;
  const ySpan = yMax - yMin;

  const yOf = (v: number) => PAD.top + ((yMax - v) / ySpan) * PH;
  const xOf = (i: number) => n <= 1 ? PAD.left + PW/2 : PAD.left + (i / (n-1)) * PW;

  // SD horizontal lines
  const sdLines = [
    { mult: 3,  color:"#ef4444", dash:"4 3", label:"+3SD" },
    { mult: 2,  color:"#f59e0b", dash:"4 3", label:"+2SD" },
    { mult: 1,  color:"#94a3b8", dash:"2 3", label:"+1SD" },
    { mult: 0,  color:"#3b82f6", dash:"",    label:"Mean" },
    { mult:-1,  color:"#94a3b8", dash:"2 3", label:"-1SD" },
    { mult:-2,  color:"#f59e0b", dash:"4 3", label:"-2SD" },
    { mult:-3,  color:"#ef4444", dash:"4 3", label:"-3SD" },
  ];

  // Build polyline segments (break at null slots)
  const polylineSegments: string[] = (() => {
    const segs: string[] = [];
    let cur: string[] = [];
    slots.forEach((s, i) => {
      if (s !== null) {
        cur.push(`${xOf(i).toFixed(1)},${yOf(s.value).toFixed(1)}`);
      } else {
        if (cur.length > 1) segs.push(cur.join(" "));
        else if (cur.length === 1) cur = []; // single isolated point, no line needed
        cur = [];
      }
    });
    if (cur.length > 1) segs.push(cur.join(" "));
    return segs;
  })();

  // X-axis label step (max ~12 labels)
  const labelEvery = Math.max(1, Math.ceil(n / 12));

  // Tooltip state
  const hoverSlot = hover !== null ? slots[hover] : null;
  const hoverPtIdx = hover !== null ? slotToPt[hover] : null;

  const svgStyle = fillHeight
    ? { width: "100%", height: "100%", display: "block" }
    : { minWidth: 480 };
  const svgClass = fillHeight ? "" : "w-full";
  const svgPAR   = fillHeight ? "none" : "xMidYMid meet";

  return (
    <div className={fillHeight ? "h-full w-full" : "w-full space-y-3"}>
      <div className={fillHeight ? "h-full overflow-hidden" : "overflow-x-auto"}>
        <svg viewBox={`0 0 ${W} ${H}`} style={svgStyle} className={svgClass}
          preserveAspectRatio={svgPAR}>

          {/* Vertical day grid */}
          {allDates.map((_, i) => (
            <line key={`vg-${i}`}
              x1={xOf(i)} y1={PAD.top} x2={xOf(i)} y2={PAD.top+PH}
              stroke="#e2e8f0" strokeWidth="0.6" />
          ))}

          {/* SD horizontal lines + left labels */}
          {sd > 0 && sdLines.map(l => {
            const y     = yOf(mean + l.mult * sd);
            const isMn  = l.mult === 0;
            const val   = (mean + l.mult * sd).toFixed(2);
            return (
              <g key={l.label}>
                <line x1={PAD.left} y1={y} x2={PAD.left+PW} y2={y}
                  stroke={l.color} strokeWidth={isMn ? 1.5 : 0.9}
                  strokeDasharray={l.dash} />
                {/* Left: value */}
                <text x={PAD.left-6} y={y+3.5} textAnchor="end" fontSize="9" fill={l.color}>
                  {val}
                </text>
                {/* Right: SD label */}
                <text x={PAD.left+PW+4} y={y+3.5} textAnchor="start" fontSize="9" fill={l.color} fontWeight={isMn?"600":"400"}>
                  {l.label}
                </text>
              </g>
            );
          })}

          {/* Polyline segments (gaps = null days) */}
          {polylineSegments.map((pts_, i) => (
            <polyline key={`seg-${i}`} points={pts_}
              fill="none" stroke="#3b82f6" strokeWidth="1.5" opacity="0.75" />
          ))}

          {/* Data points */}
          {slots.map((slot, i) => {
            if (!slot) return null;
            const ptIdx = slotToPt[i]!;
            const color  = resolveDotColor(ptIdx, violations, slot.status);
            const isHov  = hover === i;
            const hasViol = violations.some(v => v.pointIndices.includes(ptIdx));
            return (
              <g key={`pt-${i}`}
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
                style={{ cursor: "pointer" }}>
                <circle cx={xOf(i)} cy={yOf(slot.value)} r="10" fill="transparent" />
                {hasViol && (
                  <circle cx={xOf(i)} cy={yOf(slot.value)} r={isHov?8:7}
                    fill="none" stroke={color} strokeWidth="1" opacity="0.35" />
                )}
                <circle cx={xOf(i)} cy={yOf(slot.value)} r={isHov?5.5:4}
                  fill={color} stroke="#fff" strokeWidth="1.5" />
                {/* Value label on hover */}
                {isHov && (
                  <text x={xOf(i)} y={yOf(slot.value)-9} textAnchor="middle"
                    fontSize="9" fontWeight="600" fill={color}>
                    {slot.value}
                  </text>
                )}
              </g>
            );
          })}

          {/* X-axis date labels */}
          {allDates.map((d, i) => {
            if (i % labelEvery !== 0 && i !== n-1) return null;
            const hasData = slots[i] !== null;
            return (
              <text key={`xl-${i}`} x={xOf(i)} y={H-PAD.bottom+14}
                textAnchor="middle" fontSize="8.5"
                fill={hasData ? "#374151" : "#d1d5db"}
                className="dark:fill-dark-300 dark:fill-dark-600">
                {dayjs(d).format("DD/MM")}
              </text>
            );
          })}

          {/* Tooltip */}
          {hover !== null && hoverSlot && (() => {
            const z     = sd > 0 ? ((hoverSlot.value - mean) / sd) : 0;
            const cx    = xOf(hover);
            const cy    = yOf(hoverSlot.value);
            const tx    = Math.min(Math.max(cx - 72, PAD.left), PAD.left + PW - 148);
            const ty    = Math.max(cy - 72, PAD.top + 2);
            const pvs   = hoverPtIdx !== null ? violations.filter(v => v.pointIndices.includes(hoverPtIdx)) : [];
            const bH    = 60 + pvs.length * 13;
            const color = resolveDotColor(hoverPtIdx!, violations, hoverSlot.status);
            return (
              <g pointerEvents="none">
                <rect x={tx} y={ty} width={148} height={bH} rx="5" fill="#0f172a" opacity="0.94" />
                <text x={tx+7} y={ty+14} fontSize="10" fill="#f1f5f9" fontWeight="600">
                  {dayjs(hoverSlot.resultDate).format("DD MMM YYYY")}
                </text>
                <text x={tx+7} y={ty+27} fontSize="10" fill="#94a3b8">
                  Nilai: {hoverSlot.value}
                </text>
                <text x={tx+7} y={ty+40} fontSize="10" fill="#94a3b8">
                  Z-score: {z>=0?"+":""}{z.toFixed(2)}
                </text>
                <text x={tx+7} y={ty+53} fontSize="10" fill={color} fontWeight="500">
                  {hoverSlot.status}{hoverSlot.westgardFlags?` (${hoverSlot.westgardFlags})`:""}
                </text>
                {pvs.map((viol, k) => (
                  <text key={k} x={tx+7} y={ty+66+k*13} fontSize="9"
                    fill={viol.type==="rejection"?"#fca5a5":"#fcd34d"}>
                    ▲ {viol.rule}
                  </text>
                ))}
              </g>
            );
          })()}
        </svg>
      </div>

      {/* Violations panel — Reports page only */}
      {showViolations && westgardRules && (
        <div className="space-y-2">
          {violationsPanel(violations, westgardRules)}
        </div>
      )}
    </div>
  );
}

// ── Violations panel (Reports page) ──────────────────────────────────────────
function violationsPanel(viols: Violation[], rules: WestgardRules) {
  const RULE_LABELS = [
    { key:"rule1_2s" as const, label:"1:2s",  warn:true  },
    { key:"rule1_3s" as const, label:"1:3s",  warn:false },
    { key:"rule2_2s" as const, label:"2:2s",  warn:false },
    { key:"ruleR_4s" as const, label:"R:4s",  warn:false },
    { key:"rule3_1s" as const, label:"3:1s",  warn:true  },
    { key:"rule4_1s" as const, label:"4:1s",  warn:false },
    { key:"rule9x"   as const, label:"9x",    warn:false },
    { key:"rule10x"  as const, label:"10x",   warn:false },
  ];
  return (
    <>
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="self-center text-xs text-gray-400 dark:text-dark-500">Rules aktif:</span>
        {RULE_LABELS.filter(r => rules[r.key]).map(r => (
          <span key={r.key} className={`rounded px-1.5 py-0.5 font-mono text-xs font-medium
            ${r.warn?"bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400"
                    :"bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400"}`}>
            {r.label}
          </span>
        ))}
      </div>
      {viols.length === 0 ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs
          text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/10 dark:text-emerald-400">
          ✓ Semua nilai dalam batas kontrol
        </div>
      ) : viols.map((v, i) => (
        <div key={i} className={`flex items-start gap-2 rounded border-l-4 px-2.5 py-1.5 text-xs
          ${v.type==="rejection"
            ?"border-red-500 bg-red-50 text-red-800 dark:bg-red-900/10 dark:text-red-300"
            :"border-amber-400 bg-amber-50 text-amber-800 dark:bg-amber-900/10 dark:text-amber-300"}`}>
          <span className="shrink-0 rounded bg-white/60 px-1 font-mono font-bold dark:bg-black/20">{v.rule}</span>
          <span>{v.msg}</span>
          <span className="ml-auto shrink-0 font-medium">{v.type==="rejection"?"Reject":"Warning"}</span>
        </div>
      ))}
    </>
  );
}
