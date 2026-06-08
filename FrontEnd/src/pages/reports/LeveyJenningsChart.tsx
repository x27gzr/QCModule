import { useState } from "react";
import dayjs from "dayjs";
import type { LeveyJenningsDto, LeveyJenningsPoint, QCStatus } from "@/services/qcResultService";
import type { WestgardRules } from "@/services/qcSampleService";

// ── Chart layout constants ────────────────────────────────────────────────────
const W   = 900;
const H   = 300;
const PAD = { top: 24, right: 56, bottom: 34, left: 56 };
const PW  = W - PAD.left - PAD.right;
const PH  = H - PAD.top  - PAD.bottom;

// ── Westgard violation engine (operates on in-trend points only) ──────────────
interface Violation {
  pointIndices: number[];   // indices into the `active` array
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
      if (s.every(x=>x>1)||s.every(x=>x<-1))
        v.push({pointIndices:[i-2,i-1,i],rule:"3:1s",type:"warning",msg:`Titik ${i-1}-${i+1}: 3 berturut >±1SD`});
    }
    if (i>=3 && rules.rule4_1s) {
      const s=zs.slice(i-3,i+1);
      if (s.every(x=>x>1)||s.every(x=>x<-1))
        v.push({pointIndices:[i-3,i-2,i-1,i],rule:"4:1s",type:"rejection",msg:`Titik ${i-2}-${i+1}: 4 berturut >±1SD`});
    }
    if (i>=8 && rules.rule9x) {
      const s=zs.slice(i-8,i+1);
      if (s.every(x=>x>0)||s.every(x=>x<0))
        v.push({pointIndices:Array.from({length:9},(_,k)=>i-8+k),rule:"9x",type:"rejection",msg:`Titik ${i-7}-${i+1}: 9 berturut sisi sama`});
    }
    if (i>=9 && rules.rule10x) {
      const s=zs.slice(i-9,i+1);
      if (s.every(x=>x>0)||s.every(x=>x<0))
        v.push({pointIndices:Array.from({length:10},(_,k)=>i-9+k),rule:"10x",type:"rejection",msg:`Titik ${i-8}-${i+1}: 10 berturut sisi sama`});
    }
  }
  return v;
}

// ── Colours ───────────────────────────────────────────────────────────────────
const STATUS_COLOR: Record<QCStatus, string> = {
  Accepted: "#2563eb",
  Warning:  "#f59e0b",
  Rejected: "#ef4444",
  Pending:  "#9ca3af",
};

// A point is "excluded" (out of range, re-controlled) when the analyst rejected it.
const isExcluded = (p: LeveyJenningsPoint) => p.validationStatus === "Rejected";

// Strip the "Analyst: " prefix the backend prepends to rejection notes.
function rejectionReason(p: LeveyJenningsPoint): string {
  const parts: string[] = [];
  if (p.westgardFlags) parts.push(p.westgardFlags);
  if (p.comment) {
    const note = p.comment.replace(/^Analyst:\s*/i, "").split("\n")[0].trim();
    if (note) parts.push(note);
  }
  return parts.length ? parts.join(" · ") : "Out of range";
}

// ── Props ─────────────────────────────────────────────────────────────────────
interface Props {
  data: LeveyJenningsDto;
  westgardRules?: WestgardRules;
  showViolations?: boolean;
  fillHeight?: boolean;
  rangeFrom?: string;   // YYYY-MM-DD — draw full period width (e.g. whole month)
  rangeTo?: string;
  /** Doctor mode: show an authorisation checkbox strip under each day column. */
  onAuthorise?: (resultId: string) => void;
}

// Every calendar day in [from, to] inclusive.
function calendarDays(from: string, to: string): string[] {
  const days: string[] = [];
  let cur = dayjs(from);
  const end = dayjs(to);
  while (!cur.isAfter(end, "day")) { days.push(cur.format("YYYY-MM-DD")); cur = cur.add(1, "day"); }
  return days;
}

export default function LeveyJenningsChart({
  data, westgardRules, showViolations = true, fillHeight = false, rangeFrom, rangeTo, onAuthorise,
}: Props) {
  const [hover, setHover] = useState<number | null>(null); // original point index

  const { mean, sd } = data;
  const pts = data.points;       // chronological, already filtered by date range

  // In-trend points (exclude analyst-rejected) keep their original index.
  const active = pts.map((p, i) => ({ p, i })).filter(({ p }) => !isExcluded(p));

  // Westgard evaluation runs on in-trend points only.
  const violations = westgardRules ? computeViolations(active.map(a => a.p), mean, sd, westgardRules) : [];

  // Map original index → violation severity (for colouring trend points).
  const sevByOrig = new Map<number, "warning" | "rejection">();
  violations.forEach(v => v.pointIndices.forEach(ai => {
    const oi = active[ai].i;
    if (v.type === "rejection" || sevByOrig.get(oi) !== "rejection") sevByOrig.set(oi, v.type);
  }));

  // ── Y domain: actual values, ±3.5SD expanded to include any outliers ────────
  const vals    = pts.map(p => p.value);
  const dataMin = vals.length ? Math.min(...vals) : mean - sd;
  const dataMax = vals.length ? Math.max(...vals) : mean + sd;
  const yMin    = Math.min(mean - 3.5 * sd, dataMin - 0.3 * sd);
  const yMax    = Math.max(mean + 3.5 * sd, dataMax + 0.3 * sd);
  const ySpan   = (yMax - yMin) || 1;

  const yOf = (v: number) => PAD.top + ((yMax - v) / ySpan) * PH;

  // ── X-axis by calendar DAY: same-day results share one column ───────────────
  // With a period range → draw every day of the period (full month width etc.);
  // otherwise fall back to only days that have data.
  const dayKeyOf   = (p: LeveyJenningsPoint) => dayjs(p.resultDate).format("YYYY-MM-DD");
  const uniqueDays = (rangeFrom && rangeTo)
    ? calendarDays(rangeFrom, rangeTo)
    : Array.from(new Set(pts.map(dayKeyOf)));
  const D          = uniqueDays.length;
  const dayCol     = new Map(uniqueDays.map((d, c) => [d, c]));
  const xOfCol     = (c: number) => D <= 1 ? PAD.left + PW / 2 : PAD.left + (c / (D - 1)) * PW;
  const xOf        = (i: number) => xOfCol(dayCol.get(dayKeyOf(pts[i])) ?? 0);

  // SD reference lines
  const sdLines = [
    { mult: 3,  color:"#ef4444", dash:"4 3", label:"+3SD" },
    { mult: 2,  color:"#f59e0b", dash:"4 3", label:"+2SD" },
    { mult: 1,  color:"#94a3b8", dash:"2 3", label:"+1SD" },
    { mult: 0,  color:"#3b82f6", dash:"",    label:"Mean" },
    { mult:-1,  color:"#94a3b8", dash:"2 3", label:"-1SD" },
    { mult:-2,  color:"#f59e0b", dash:"4 3", label:"-2SD" },
    { mult:-3,  color:"#ef4444", dash:"4 3", label:"-3SD" },
  ];

  // Trend line connects in-trend points, spanning ACROSS excluded ones.
  const trendPoints = active.map(a => `${xOf(a.i).toFixed(1)},${yOf(a.p.value).toFixed(1)}`).join(" ");

  // Dot colour for an in-trend point
  const trendColor = (oi: number, status: QCStatus) => {
    const sev = sevByOrig.get(oi);
    if (sev === "rejection") return "#ef4444";
    if (sev === "warning")   return "#f59e0b";
    return STATUS_COLOR[status];
  };

  const labelEvery = Math.max(1, Math.ceil(D / 14));

  // ── Doctor authorisation strip: one representative result per day ───────────
  const STRIP = onAuthorise ? 30 : 0;
  const VBH   = H + STRIP;
  // For each day, pick the in-trend (non-excluded) result to authorise.
  const dayRep = new Map<string, LeveyJenningsPoint>();
  if (onAuthorise) {
    pts.forEach(p => {
      if (isExcluded(p)) return;
      dayRep.set(dayKeyOf(p), p); // keep latest of the day (pts chronological)
    });
  }

  const svgStyle = fillHeight ? { width: "100%", height: "100%", display: "block" } : { minWidth: 480 };
  const svgClass = fillHeight ? "" : "w-full";
  const svgPAR   = fillHeight ? "none" : "xMidYMid meet";

  const hovered = hover !== null ? pts[hover] : null;

  return (
    <div className={fillHeight ? "h-full w-full" : "w-full space-y-3"}>
      <div className={fillHeight ? "h-full overflow-hidden" : "overflow-x-auto"}>
        <svg viewBox={`0 0 ${W} ${VBH}`} style={svgStyle} className={svgClass} preserveAspectRatio={svgPAR}>

          {/* Vertical grid — one column per day */}
          {uniqueDays.map((d, c) => (
            <line key={`vg-${d}`} x1={xOfCol(c)} y1={PAD.top} x2={xOfCol(c)} y2={PAD.top+PH}
              stroke="#e2e8f0" strokeWidth="0.6" />
          ))}

          {/* SD lines + labels */}
          {sd > 0 && sdLines.map(l => {
            const y    = yOf(mean + l.mult * sd);
            const isMn = l.mult === 0;
            return (
              <g key={l.label}>
                <line x1={PAD.left} y1={y} x2={PAD.left+PW} y2={y}
                  stroke={l.color} strokeWidth={isMn?1.5:0.9} strokeDasharray={l.dash} />
                <text x={PAD.left-6} y={y+3.5} textAnchor="end" fontSize="9" fill={l.color}>
                  {(mean + l.mult*sd).toFixed(2)}
                </text>
                <text x={PAD.left+PW+4} y={y+3.5} textAnchor="start" fontSize="9" fill={l.color} fontWeight={isMn?"600":"400"}>
                  {l.label}
                </text>
              </g>
            );
          })}

          {/* Trend line (in-trend points only) */}
          {active.length > 1 && (
            <polyline points={trendPoints} fill="none" stroke="#3b82f6" strokeWidth="1.5" opacity="0.75" />
          )}

          {/* Points */}
          {pts.map((p, i) => {
            const cx = xOf(i);
            const cy = yOf(p.value);
            const isHov = hover === i;
            const excluded = isExcluded(p);

            if (excluded) {
              // Floating excluded marker — red filled circle with white ×
              const r = isHov ? 6.5 : 5.5;
              return (
                <g key={`pt-${i}`} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} style={{ cursor:"pointer" }}>
                  <circle cx={cx} cy={cy} r="11" fill="transparent" />
                  <circle cx={cx} cy={cy} r={r} fill="#ef4444" stroke="#fff" strokeWidth="1.5" />
                  <line x1={cx-2.6} y1={cy-2.6} x2={cx+2.6} y2={cy+2.6} stroke="#fff" strokeWidth="1.5" strokeLinecap="round" />
                  <line x1={cx-2.6} y1={cy+2.6} x2={cx+2.6} y2={cy-2.6} stroke="#fff" strokeWidth="1.5" strokeLinecap="round" />
                  <text x={cx} y={cy-9} textAnchor="middle" fontSize="7.5" fontWeight="600" fill="#ef4444" opacity="0.85">
                    {p.value}
                  </text>
                </g>
              );
            }

            const color   = trendColor(i, p.status);
            const hasViol = sevByOrig.has(i);
            return (
              <g key={`pt-${i}`} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} style={{ cursor:"pointer" }}>
                <circle cx={cx} cy={cy} r="11" fill="transparent" />
                {hasViol && <circle cx={cx} cy={cy} r={isHov?8:7} fill="none" stroke={color} strokeWidth="1" opacity="0.35" />}
                <circle cx={cx} cy={cy} r={isHov?5.5:4} fill={color} stroke="#fff" strokeWidth="1.5" />
                <text x={cx} y={cy-7} textAnchor="middle" fontSize="7.5" fontWeight="600" fill={color} opacity="0.9">
                  {p.value}
                </text>
              </g>
            );
          })}

          {/* X-axis date labels — one per day column */}
          {uniqueDays.map((d, c) => {
            if (c % labelEvery !== 0 && c !== D-1) return null;
            const dayHasExcluded = pts.some(p => dayKeyOf(p) === d && isExcluded(p));
            return (
              <text key={`xl-${d}`} x={xOfCol(c)} y={H-PAD.bottom+14} textAnchor="middle" fontSize="8.5"
                fill={dayHasExcluded ? "#ef4444" : "#94a3b8"}>
                {dayjs(d).format("DD/MM")}
              </text>
            );
          })}

          {/* Doctor authorisation checkbox strip */}
          {onAuthorise && uniqueDays.map((d, c) => {
            const rep = dayRep.get(d);
            const cx  = xOfCol(c);
            const cy  = H + 14;
            const s   = 13;                          // checkbox side
            const x0  = cx - s/2, y0 = cy - s/2;

            // States
            const authorised = rep?.authorisationStatus === "Authorised";
            const canAuth    = rep && rep.validationStatus === "Validated" && !authorised;

            const fill   = authorised ? "#d1fae5" : canAuth ? "#fff" : "#f3f4f6";
            const stroke = authorised ? "#10b981" : canAuth ? "#3b82f6" : "#d1d5db";
            const title  = !rep ? `${dayjs(d).format("DD/MM")}: tidak ada data / belum tervalidasi`
                         : authorised ? `${dayjs(d).format("DD/MM")}: Authorised oleh ${rep.authorisedByName ?? "-"}`
                         : canAuth ? `${dayjs(d).format("DD/MM")}: klik untuk authorise (validasi: ${rep.validatedByName ?? "-"})`
                         : `${dayjs(d).format("DD/MM")}: menunggu validasi analis`;

            return (
              <g key={`auth-${d}`}
                style={{ cursor: canAuth ? "pointer" : "default" }}
                onClick={() => { if (canAuth && rep) onAuthorise(rep.resultId); }}>
                <title>{title}</title>
                <rect x={x0} y={y0} width={s} height={s} rx="2.5"
                  fill={fill} stroke={stroke} strokeWidth="1.5" opacity={rep ? 1 : 0.5} />
                {authorised && (
                  <path d={`M ${x0+3} ${cy} L ${x0+5.5} ${cy+3} L ${x0+s-3} ${y0+3.5}`}
                    fill="none" stroke="#059669" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                )}
              </g>
            );
          })}

          {/* Tooltip */}
          {hover !== null && hovered && (() => {
            const z      = sd > 0 ? ((hovered.value - mean) / sd) : 0;
            const cx     = xOf(hover);
            const cy     = yOf(hovered.value);
            const tx     = Math.min(Math.max(cx - 84, PAD.left), PAD.left + PW - 176);
            const excluded = isExcluded(hovered);
            const pvs    = excluded ? [] : violations.filter(v => v.pointIndices.some(ai => active[ai].i === hover));
            const lines  = excluded ? 4 : (4 + (hovered.validatedByName ? 1 : 0) + pvs.length);
            const bH     = lines * 14 + 12;
            const ty     = Math.max(cy - bH - 10, PAD.top + 2);
            const color  = excluded ? "#f87171" : trendColor(hover, hovered.status);
            return (
              <g pointerEvents="none">
                <rect x={tx} y={ty} width={176} height={bH} rx="5" fill="#0f172a" opacity="0.95" />
                <text x={tx+8} y={ty+15} fontSize="10" fill="#f1f5f9" fontWeight="600">
                  {dayjs(hovered.resultDate).format("DD MMM YYYY HH:mm")}
                </text>
                <text x={tx+8} y={ty+29} fontSize="10" fill="#94a3b8">
                  Nilai: <tspan fill={color} fontWeight="700">{hovered.value}</tspan>  ·  Z: {z>=0?"+":""}{z.toFixed(2)}
                </text>
                {excluded ? (
                  <>
                    <text x={tx+8} y={ty+43} fontSize="10" fill="#f87171" fontWeight="600">
                      ✗ Rejected — Out of Range
                    </text>
                    <text x={tx+8} y={ty+57} fontSize="9.5" fill="#fca5a5">
                      Alasan: {rejectionReason(hovered)}
                    </text>
                  </>
                ) : (
                  <>
                    <text x={tx+8} y={ty+43} fontSize="10" fill={color} fontWeight="500">
                      {hovered.status}{hovered.westgardFlags?` · ${hovered.westgardFlags}`:""}
                    </text>
                    <text x={tx+8} y={ty+57} fontSize="10" fill={hovered.validationStatus==="Validated"?"#34d399":"#94a3b8"}>
                      {hovered.validationStatus==="Validated"?"✓":"⏳"} {hovered.validationStatus}
                    </text>
                    {hovered.validatedByName && (
                      <text x={tx+8} y={ty+71} fontSize="10" fill="#60a5fa">
                        Analis: {hovered.validatedByName}
                      </text>
                    )}
                    {pvs.map((v, k) => (
                      <text key={k} x={tx+8} y={ty+71+(hovered.validatedByName?14:0)+k*13} fontSize="9"
                        fill={v.type==="rejection"?"#fca5a5":"#fcd34d"}>▲ {v.rule}</text>
                    ))}
                  </>
                )}
              </g>
            );
          })()}
        </svg>
      </div>

      {/* Violations panel — Reports page only */}
      {showViolations && westgardRules && (
        <div className="space-y-2">{violationsPanel(violations, westgardRules)}</div>
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
