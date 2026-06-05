import { useCallback, useEffect, useState } from "react";
import { ArrowPathIcon, ShieldCheckIcon, CheckCircleIcon, ClockIcon } from "@heroicons/react/24/outline";
import dayjs from "dayjs";
import qcResultService, { type QCResultSummaryDto, type AuthorisationSummaryDto } from "@/services/qcResultService";

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
    try { await qcResultService.doctorAuthorise(r.id); await load(); }
    finally { setBusy(false); }
  };

  const batchAuthorise = async () => {
    if (selected.size === 0) return;
    setBusy(true);
    try {
      const res = await qcResultService.batchAuthorise([...selected]);
      await load();
      window.alert(res.data.message);
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
