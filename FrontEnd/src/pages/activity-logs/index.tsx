import { useCallback, useEffect, useState } from "react";
import { ArrowPathIcon, ClipboardDocumentListIcon } from "@heroicons/react/24/outline";
import dayjs from "dayjs";
import activityLogService, { type ActivityLogDto, type ActivityLogStats } from "@/services/activityLogService";

const ACTION_STYLE: Record<string, string> = {
  Create:    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400",
  Update:    "bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400",
  Delete:    "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400",
  Validate:  "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-400",
  Authorise: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400",
  Login:     "bg-violet-100 text-violet-700 dark:bg-violet-900/20 dark:text-violet-400",
  Logout:    "bg-gray-100 text-gray-600 dark:bg-dark-600 dark:text-dark-300",
};
const actionClass = (a: string) => ACTION_STYLE[a] ?? "bg-gray-100 text-gray-600 dark:bg-dark-600 dark:text-dark-300";

const inputCls = "dark:bg-dark-800 dark:text-dark-100 dark:border-dark-600 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50";

export default function ActivityLogsPage() {
  const [logs,    setLogs]    = useState<ActivityLogDto[]>([]);
  const [stats,   setStats]   = useState<ActivityLogStats | null>(null);
  const [total,   setTotal]   = useState(0);
  const [page,    setPage]    = useState(1);
  const [action,  setAction]  = useState("");
  const [module,  setModule]  = useState("");
  const [loading, setLoading] = useState(true);

  const pageSize = 20;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [logsRes, statsRes] = await Promise.all([
        activityLogService.getAll({ action: action || undefined, module: module || undefined, page, pageSize }),
        activityLogService.getStatistics(),
      ]);
      setLogs(logsRes.data.data.items);
      setTotal(logsRes.data.data.totalCount);
      setStats(statsRes.data.data);
    } finally { setLoading(false); }
  }, [action, module, page]);

  useEffect(() => { load(); }, [load]);

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="dark:bg-dark-800 dark:border-dark-600 border-gray-150 rounded-xl border bg-white px-4 py-3 shadow-xs">
          <p className="dark:text-dark-400 text-xs text-gray-500">Total (this month)</p>
          <p className="dark:text-dark-100 mt-0.5 text-xl font-bold text-gray-800">{stats?.total ?? "—"}</p>
        </div>
        <div className="dark:bg-dark-800 dark:border-dark-600 border-gray-150 rounded-xl border bg-white px-4 py-3 shadow-xs sm:col-span-3">
          <p className="dark:text-dark-400 mb-1 text-xs text-gray-500">Top actions</p>
          <div className="flex flex-wrap gap-1.5">
            {stats?.byAction.slice(0, 6).map(a => (
              <span key={a.key} className={`rounded-full px-2 py-0.5 text-xs font-medium ${actionClass(a.key)}`}>{a.key} · {a.count}</span>
            )) ?? <span className="text-xs text-gray-400">—</span>}
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <select value={action} onChange={e => { setAction(e.target.value); setPage(1); }} className={inputCls}>
            <option value="">All Actions</option>
            {stats?.byAction.map(a => <option key={a.key} value={a.key}>{a.key}</option>)}
          </select>
          <select value={module} onChange={e => { setModule(e.target.value); setPage(1); }} className={inputCls}>
            <option value="">All Modules</option>
            {stats?.byModule.map(m => <option key={m.key} value={m.key}>{m.key}</option>)}
          </select>
        </div>
        <button onClick={load} className="dark:text-dark-300 dark:hover:bg-dark-700 rounded-lg p-2 text-gray-500 hover:bg-gray-100"><ArrowPathIcon className="size-4" /></button>
      </div>

      {/* Table */}
      <div className="dark:bg-dark-800 dark:border-dark-600 border-gray-150 overflow-x-auto rounded-xl border bg-white shadow-xs">
        <table className="w-full text-sm">
          <thead>
            <tr className="dark:bg-dark-700 dark:text-dark-300 border-gray-150 dark:border-dark-600 border-b bg-gray-50 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
              <th className="px-4 py-3">Time</th>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">Module</th>
              <th className="px-4 py-3">Description</th>
              <th className="px-4 py-3">IP</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-dark-600">
            {loading ? (
              <tr><td colSpan={6} className="py-12 text-center text-sm text-gray-400 dark:text-dark-400">Loading…</td></tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-16 text-center">
                  <ClipboardDocumentListIcon className="mx-auto mb-3 size-10 text-gray-300 dark:text-dark-500" />
                  <p className="text-sm text-gray-400 dark:text-dark-400">No activity logs found.</p>
                </td>
              </tr>
            ) : logs.map(l => (
              <tr key={l.id} className="dark:hover:bg-dark-700/50 hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-500 dark:text-dark-400">{dayjs(l.createdAt).format("DD MMM YYYY HH:mm:ss")}</td>
                <td className="px-4 py-3 text-sm font-medium text-gray-800 dark:text-dark-100">{l.userName}</td>
                <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-xs font-medium ${actionClass(l.action)}`}>{l.action}</span></td>
                <td className="px-4 py-3 text-sm text-gray-600 dark:text-dark-300">{l.module}</td>
                <td className="px-4 py-3 text-xs text-gray-500 dark:text-dark-400">{l.description ?? "—"}</td>
                <td className="px-4 py-3 font-mono text-xs text-gray-400 dark:text-dark-500">{l.ipAddress ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {totalPages > 1 && (
          <div className="dark:border-dark-600 border-gray-150 dark:text-dark-300 flex items-center justify-between border-t px-4 py-3 text-sm text-gray-500">
            <span>{total} logs total</span>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => p - 1)} disabled={page === 1} className="rounded-lg px-3 py-1 hover:bg-gray-100 disabled:opacity-40 dark:hover:bg-dark-700">Prev</button>
              <span className="font-medium text-gray-700 dark:text-dark-100">{page} / {totalPages}</span>
              <button onClick={() => setPage(p => p + 1)} disabled={page === totalPages} className="rounded-lg px-3 py-1 hover:bg-gray-100 disabled:opacity-40 dark:hover:bg-dark-700">Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
