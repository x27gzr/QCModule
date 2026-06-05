import { useEffect, useState } from "react";
import {
  ClipboardDocumentCheckIcon,
  ShieldCheckIcon,
  CheckBadgeIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";
import dayjs from "dayjs";
import { useAuth } from "@/contexts/auth/context";
import dashboardService, { type DashboardStats, type RecentActivity } from "@/services/dashboardService";

interface StatDef {
  key: keyof DashboardStats;
  label: string;
  sub: string;
  icon: React.ElementType;
  color: string;
}

const STAT_DEFS: StatDef[] = [
  { key: "pendingValidation",  label: "Pending Validation", sub: "Awaiting analyst",  icon: ClipboardDocumentCheckIcon, color: "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400" },
  { key: "pendingAuthorise",   label: "Pending Authorise",  sub: "Awaiting doctor",   icon: ShieldCheckIcon,            color: "bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400" },
  { key: "authorisedToday",    label: "Authorised Today",   sub: "Signed off today",  icon: CheckBadgeIcon,             color: "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400" },
  { key: "westgardViolations", label: "Westgard Flags",     sub: "Last 7 days",       icon: ExclamationTriangleIcon,    color: "bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400" },
];

const ACTION_STYLE: Record<RecentActivity["action"], string> = {
  Authorised: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400",
  Validated:  "bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400",
  Entered:    "bg-gray-100 text-gray-600 dark:bg-dark-600 dark:text-dark-300",
};

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activities, setActivities] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    Promise.all([
      dashboardService.getStatistics(),
      dashboardService.getRecentActivities(10),
    ]).then(([s, a]) => {
      setStats(s.data.data);
      setActivities(a.data.data);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="dark:text-dark-100 text-2xl font-bold text-gray-800">Good day, {user?.name} 👋</h2>
          <p className="dark:text-dark-400 mt-1 text-sm text-gray-500">Here's an overview of your lab quality control status.</p>
        </div>
        <button onClick={load} className="dark:text-dark-300 dark:hover:bg-dark-700 rounded-lg p-2 text-gray-500 hover:bg-gray-100">
          <ArrowPathIcon className={`size-5 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {STAT_DEFS.map((def) => (
          <div key={def.key} className="dark:bg-dark-800 dark:border-dark-600 border-gray-150 flex items-start gap-4 rounded-xl border bg-white p-5 shadow-xs">
            <div className={`flex size-11 items-center justify-center rounded-lg ${def.color}`}>
              <def.icon className="size-6" />
            </div>
            <div>
              <p className="dark:text-dark-400 text-xs text-gray-500">{def.label}</p>
              <p className="dark:text-dark-100 mt-0.5 text-2xl font-bold text-gray-800">
                {loading || !stats ? "…" : stats[def.key]}
              </p>
              <p className="dark:text-dark-400 mt-0.5 text-xs text-gray-400">{def.sub}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* Recent Activities */}
        <div className="dark:bg-dark-800 dark:border-dark-600 border-gray-150 rounded-xl border bg-white p-5 shadow-xs lg:col-span-3">
          <h3 className="dark:text-dark-100 mb-4 text-base font-semibold text-gray-700">Recent Activity</h3>
          {loading ? (
            <p className="dark:text-dark-400 py-8 text-center text-sm text-gray-400">Loading…</p>
          ) : activities.length === 0 ? (
            <p className="dark:text-dark-400 py-8 text-center text-sm text-gray-400">No activity yet.</p>
          ) : (
            <ul className="divide-y divide-gray-100 dark:divide-dark-600">
              {activities.map((a) => (
                <li key={a.id} className="flex items-center gap-3 py-2.5">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${ACTION_STYLE[a.action]}`}>{a.action}</span>
                  <div className="min-w-0 flex-1">
                    <p className="dark:text-dark-200 truncate text-sm text-gray-700">
                      <span className="font-medium">{a.parameterName}</span>
                      <span className="text-gray-400 dark:text-dark-400"> = {a.value}</span>
                      {a.flag && <span className="ml-1 rounded bg-red-100 px-1 py-0.5 font-mono text-[10px] text-red-700 dark:bg-red-900/20 dark:text-red-400">{a.flag}</span>}
                    </p>
                    <p className="dark:text-dark-500 truncate text-xs text-gray-400">{a.sampleName} · by {a.userName}</p>
                  </div>
                  <span className="dark:text-dark-500 shrink-0 text-xs text-gray-400">{dayjs(a.activityTime).format("DD/MM HH:mm")}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* QC Workflow guide */}
        <div className="dark:bg-dark-800 dark:border-dark-600 border-gray-150 rounded-xl border bg-white p-5 shadow-xs lg:col-span-2">
          <h3 className="dark:text-dark-100 mb-4 text-base font-semibold text-gray-700">QC Workflow</h3>
          <ol className="space-y-2.5">
            {[
              { step: "1", title: "Setup Instruments & Test Files" },
              { step: "2", title: "Register QC Samples + Targets (Mean/SD/CV)" },
              { step: "3", title: "Enter QC Results (auto Westgard)" },
              { step: "4", title: "Analyst validates results" },
              { step: "5", title: "Doctor authorises validated results" },
              { step: "6", title: "Review Levey-Jennings reports" },
            ].map((item) => (
              <li key={item.step} className="flex items-start gap-3">
                <span className="bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400 flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold">{item.step}</span>
                <p className="dark:text-dark-200 text-sm text-gray-700">{item.title}</p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}
