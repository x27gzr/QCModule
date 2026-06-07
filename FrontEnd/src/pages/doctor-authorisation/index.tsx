import { useCallback, useEffect, useState } from "react";
import { ArrowPathIcon, ShieldCheckIcon, CheckCircleIcon, ClockIcon, ChartBarIcon } from "@heroicons/react/24/outline";
import { toast } from "sonner";
import dayjs from "dayjs";
import qcResultService, { type QCResultSummaryDto, type AuthorisationSummaryDto, type LeveyJenningsDto } from "@/services/qcResultService";
import qcSampleService, { type QCSampleSummaryDto, type WestgardRules } from "@/services/qcSampleService";
import LeveyJenningsChart from "@/pages/reports/LeveyJenningsChart";
import { getErrorMessage } from "@/utils/apiError";

function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div className="dark:bg-dark-800 dark:border-dark-600 border-gray-150 rounded-xl border bg-white px-4 py-3 shadow-xs">
      <p className="dark:text-dark-400 text-xs text-gray-500">{label}</p>
      <p className={`mt-0.5 text-xl font-bold ${color ?? "text-gray-800 dark:text-dark-100"}`}>{value}</p>
      {sub && <p className="dark:text-dark-500 mt-0.5 text-xs text-gray-400">{sub}</p>}
    </div>
  );
}

function ZScoreBadge({ z }: { z: number }) {
  const abs = Math.abs(z);
  const color = abs > 3 ? "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400"
              : abs > 2 ? "bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400"
              : "bg-gray-100 text-gray-600 dark:bg-dark-600 dark:text-dark-300";
  return <span className={`rounded px-1.5 py-0.5 font-mono text-xs font-medium ${color}`}>{z > 0 ? "+" : ""}{z.toFixed(2)}</span>;
}

export default function DoctorAuthorisationPage() {
  const [pending, setPending] = useState<QCResultSummaryDto[]>([]);
  const [summary, setSummary] = useState<AuthorisationSummaryDto | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  // ── Chart authorisation view ──────────────────────────────────────────────
  const [samples,   setSamples]   = useState<QCSampleSummaryDto[]>([]);
  const [chSample,  setChSample]  = useState("");
  const [chParams,  setChParams]  = useState<{ id: string; label: string }[]>([]);
  const [chParam,   setChParam]   = useState("");
  const [chPeriod,  setChPeriod]  = useState<"20days"|"month">("20days");
  const [chData,    setChData]    = useState<LeveyJenningsDto | null>(null);
  const [chRules,   setChRules]   = useState<WestgardRules | null>(null);
  const [chLoading, setChLoading] = useState(false);

  const chRange = () => chPeriod === "month"
    ? { from: dayjs().startOf("month").format("YYYY-MM-DD"), to: dayjs().endOf("month").format("YYYY-MM-DD") }
    : { from: dayjs().subtract(19,"day").format("YYYY-MM-DD"), to: dayjs().format("YYYY-MM-DD") };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [pendingRes, summaryRes] = await Promise.all([
        qcResultService.getPendingAuthorisation({ pageSize: 100 }),
        qcResultService.getAuthorisationSummary(),
      ]);
      setPending(pendingRes.data.data.items);
      setSummary(summaryRes.data.data);
      setSelected(new Set());
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Load QC samples once for the chart selector
  useEffect(() => {
    qcSampleService.getAll({ pageSize: 200 }).then(r => setSamples(r.data.data.items));
  }, []);

  // Load parameters when chart sample changes
  useEffect(() => {
    setChParam(""); setChData(null);
    if (!chSample) { setChParams([]); return; }
    qcResultService.getTargets(chSample).then(r =>
      setChParams(r.data.data.map(t => ({ id: t.testFileParameterId, label: t.parameterName }))));
    qcSampleService.getById(chSample).then(r => setChRules(r.data.data.westgardRules));
  }, [chSample]);

  const loadChart = useCallback(async () => {
    if (!chSample || !chParam) { setChData(null); return; }
    setChLoading(true);
    const range = chRange();
    try {
      const res = await qcResultService.getLeveyJennings({
        qcSampleId: chSample, testFileParameterId: chParam,
        dateFrom: dayjs(range.from).toISOString(),
        dateTo:   dayjs(range.to).endOf("day").toISOString(),
      });
      setChData(res.data.data);
    } finally { setChLoading(false); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chSample, chParam, chPeriod]);

  useEffect(() => { loadChart(); }, [loadChart]);

  const authoriseFromChart = async (resultId: string) => {
    try {
      await qcResultService.doctorAuthorise(resultId);
      toast.success("Hasil diotorisasi.");
      await Promise.all([loadChart(), load()]);
    } catch (err) { toast.error(getErrorMessage(err)); }
  };

  const toggle = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    setSelected(prev => prev.size === pending.length ? new Set() : new Set(pending.map(p => p.id)));
  };

  const authoriseOne = async (r: QCResultSummaryDto) => {
    setBusy(true);
    try {
      await qcResultService.doctorAuthorise(r.id);
      toast.success("Result authorised.");
      await load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally { setBusy(false); }
  };

  const batchAuthorise = async () => {
    if (selected.size === 0) return;
    setBusy(true);
    try {
      const res = await qcResultService.batchAuthorise([...selected]);
      toast.success(res.data.message ?? `${selected.size} results authorised.`);
      await load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally { setBusy(false); }
  };

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Validated (total)" value={summary?.total ?? "—"} />
        <StatCard label="Authorised" value={summary?.authorised ?? "—"} color="text-emerald-600" />
        <StatCard label="Pending" value={summary?.pending ?? "—"} color="text-amber-500" />
        <StatCard label="Completion" value={summary ? `${summary.percentage}%` : "—"}
          sub={summary?.lastAuthoriserName ? `Last: ${summary.lastAuthoriserName}` : undefined} />
      </div>

      {/* ── Chart authorisation (klik checkbox di bawah chart) ──────────── */}
      <div className="dark:bg-dark-800 dark:border-dark-600 border-gray-150 overflow-hidden rounded-xl border bg-white shadow-xs">
        <div className="dark:border-dark-600 flex flex-wrap items-center gap-3 border-b border-gray-100 px-4 py-2.5">
          <ChartBarIcon className="size-4 shrink-0 text-primary-600 dark:text-primary-400" />
          <span className="dark:text-dark-300 text-xs font-medium text-gray-500">Otorisasi via Chart</span>
          <select value={chSample} onChange={e => setChSample(e.target.value)}
            className="dark:bg-dark-700 dark:text-dark-100 dark:border-dark-500 rounded-lg border border-gray-200 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary-500">
            <option value="">Pilih QC Sample…</option>
            {samples.map(s => <option key={s.id} value={s.id}>{s.name} — {s.level} (Lot: {s.lotNumber})</option>)}
          </select>
          <select value={chParam} onChange={e => setChParam(e.target.value)} disabled={!chSample}
            className="dark:bg-dark-700 dark:text-dark-100 dark:border-dark-500 rounded-lg border border-gray-200 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary-500 disabled:opacity-50">
            <option value="">{chParams.length ? "Pilih parameter…" : "—"}</option>
            {chParams.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
          <div className="ml-auto flex items-center gap-1.5">
            {(["20days","month"] as const).map(p => (
              <button key={p} onClick={() => setChPeriod(p)}
                className={`rounded px-2 py-0.5 text-xs font-medium ${chPeriod===p?"bg-primary-600 text-white":"bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-dark-600 dark:text-dark-300"}`}>
                {p==="20days"?"20 Hari":"Bulan Ini"}
              </button>
            ))}
          </div>
        </div>

        <div className="p-4">
          {!chSample || !chParam ? (
            <div className="flex h-40 flex-col items-center justify-center text-center">
              <ChartBarIcon className="mb-2 size-9 text-gray-200 dark:text-dark-600" />
              <p className="text-sm text-gray-400 dark:text-dark-500">Pilih QC Sample &amp; parameter untuk menampilkan chart</p>
            </div>
          ) : chLoading ? (
            <div className="flex h-40 items-center justify-center">
              <div className="border-primary-500 size-7 animate-spin rounded-full border-4 border-t-transparent" />
            </div>
          ) : chData && chData.points.length > 0 ? (
            <>
              <LeveyJenningsChart
                data={chData}
                westgardRules={chRules ?? undefined}
                showViolations={false}
                rangeFrom={chRange().from}
                rangeTo={chRange().to}
                onAuthorise={authoriseFromChart}
              />
              {/* Legend untuk checkbox */}
              <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-gray-500 dark:text-dark-400">
                <span className="font-medium">Checkbox otorisasi:</span>
                <span className="flex items-center gap-1.5"><span className="inline-block size-3 rounded-sm border-2 border-emerald-500 bg-emerald-100" /> Authorised</span>
                <span className="flex items-center gap-1.5"><span className="inline-block size-3 rounded-sm border-2 border-blue-500 bg-white" /> Pending (klik untuk authorise)</span>
                <span className="flex items-center gap-1.5"><span className="inline-block size-3 rounded-sm border-2 border-gray-300 bg-gray-100" /> Belum tervalidasi / tidak ada data</span>
              </div>
            </>
          ) : (
            <div className="flex h-40 flex-col items-center justify-center text-center">
              <p className="text-sm text-gray-400 dark:text-dark-500">Tidak ada data QC pada periode ini</p>
            </div>
          )}
        </div>
      </div>

      {/* Action bar */}
      <div className="flex items-center justify-between">
        <div className="dark:text-dark-300 flex items-center gap-2 text-sm text-gray-600">
          <ClockIcon className="size-4" />
          {pending.length} result(s) awaiting doctor authorisation
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="dark:text-dark-300 dark:hover:bg-dark-700 rounded-lg p-2 text-gray-500 hover:bg-gray-100"><ArrowPathIcon className="size-4" /></button>
          <button onClick={batchAuthorise} disabled={selected.size === 0 || busy}
            className="bg-primary-600 hover:bg-primary-700 flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-40">
            <ShieldCheckIcon className="size-4" />
            Authorise Selected ({selected.size})
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="dark:bg-dark-800 dark:border-dark-600 border-gray-150 overflow-x-auto rounded-xl border bg-white shadow-xs">
        <table className="w-full text-sm">
          <thead>
            <tr className="dark:bg-dark-700 dark:text-dark-300 border-gray-150 dark:border-dark-600 border-b bg-gray-50 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
              <th className="px-4 py-3 w-10">
                <input type="checkbox" checked={pending.length > 0 && selected.size === pending.length} onChange={toggleAll}
                  className="rounded border-gray-300 dark:border-dark-500" />
              </th>
              <th className="px-4 py-3">Sample / Parameter</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Value</th>
              <th className="px-4 py-3">Westgard</th>
              <th className="px-4 py-3">Validated By</th>
              <th className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-dark-600">
            {loading ? (
              <tr><td colSpan={7} className="py-12 text-center text-sm text-gray-400 dark:text-dark-400">Loading…</td></tr>
            ) : pending.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-16 text-center">
                  <CheckCircleIcon className="mx-auto mb-3 size-10 text-emerald-300 dark:text-emerald-800" />
                  <p className="text-sm text-gray-400 dark:text-dark-400">All caught up — nothing pending authorisation.</p>
                </td>
              </tr>
            ) : pending.map(r => (
              <tr key={r.id} className="dark:hover:bg-dark-700/50 hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3">
                  <input type="checkbox" checked={selected.has(r.id)} onChange={() => toggle(r.id)}
                    className="rounded border-gray-300 dark:border-dark-500" />
                </td>
                <td className="px-4 py-3">
                  <p className="text-sm font-medium text-gray-800 dark:text-dark-100">{r.parameterName}{r.unit ? ` (${r.unit})` : ""}</p>
                  <p className="text-xs text-gray-400 dark:text-dark-400">{r.qcSampleName} · {r.level}</p>
                </td>
                <td className="px-4 py-3 text-xs text-gray-500 dark:text-dark-400">{dayjs(r.resultDate).format("DD MMM YYYY HH:mm")}</td>
                <td className="px-4 py-3">
                  <span className="font-mono text-sm font-medium text-gray-800 dark:text-dark-100">{r.value}</span>
                  {r.zScore !== 0 && <span className="ml-2"><ZScoreBadge z={r.zScore} /></span>}
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-medium ${r.status === "Rejected" ? "text-red-600" : r.status === "Warning" ? "text-amber-500" : "text-emerald-600"}`}>{r.status}</span>
                  {r.westgardFlags && <span className="ml-1 rounded bg-red-100 px-1 py-0.5 font-mono text-[10px] text-red-700 dark:bg-red-900/20 dark:text-red-400">{r.westgardFlags}</span>}
                </td>
                <td className="px-4 py-3 text-xs text-gray-500 dark:text-dark-400">
                  {r.validatedByName ?? "—"}
                  {r.validatedAt && <span className="block text-[10px] text-gray-400 dark:text-dark-500">{dayjs(r.validatedAt).format("DD/MM HH:mm")}</span>}
                </td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => authoriseOne(r)} disabled={busy}
                    className="rounded-lg px-2.5 py-1 text-xs font-medium text-emerald-600 hover:bg-emerald-50 disabled:opacity-40 dark:text-emerald-400 dark:hover:bg-emerald-900/20">
                    Authorise
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
