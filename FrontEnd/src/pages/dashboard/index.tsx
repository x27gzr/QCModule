import {
  BeakerIcon,
  ClipboardDocumentListIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import { useAuth } from "@/contexts/auth/context";

interface StatCard {
  label: string;
  value: string;
  sub: string;
  icon: React.ElementType;
  color: string;
}

const STATS: StatCard[] = [
  {
    label: "Instruments",
    value: "—",
    sub: "Active instruments",
    icon: BeakerIcon,
    color: "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400",
  },
  {
    label: "QC Samples",
    value: "—",
    sub: "Registered samples",
    icon: ClipboardDocumentListIcon,
    color: "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400",
  },
  {
    label: "Results Today",
    value: "—",
    sub: "QC entries today",
    icon: ChartBarIcon,
    color: "bg-violet-50 text-violet-600 dark:bg-violet-900/20 dark:text-violet-400",
  },
  {
    label: "Westgard Flags",
    value: "—",
    sub: "Active violations",
    icon: ExclamationTriangleIcon,
    color: "bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400",
  },
];

export default function Dashboard() {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div>
        <h2 className="dark:text-dark-100 text-2xl font-bold text-gray-800">
          Good day, {user?.name} 👋
        </h2>
        <p className="dark:text-dark-400 mt-1 text-sm text-gray-500">
          Here's an overview of your lab quality control status.
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {STATS.map((stat) => (
          <div
            key={stat.label}
            className="dark:bg-dark-800 dark:border-dark-600 border-gray-150 flex items-start gap-4 rounded-xl border bg-white p-5 shadow-xs"
          >
            <div className={`flex size-11 items-center justify-center rounded-lg ${stat.color}`}>
              <stat.icon className="size-6" />
            </div>
            <div>
              <p className="dark:text-dark-400 text-xs text-gray-500">{stat.label}</p>
              <p className="dark:text-dark-100 mt-0.5 text-2xl font-bold text-gray-800">
                {stat.value}
              </p>
              <p className="dark:text-dark-400 mt-0.5 text-xs text-gray-400">{stat.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Business flow reminder */}
      <div className="dark:bg-dark-800 dark:border-dark-600 border-gray-150 rounded-xl border bg-white p-6 shadow-xs">
        <h3 className="dark:text-dark-100 mb-4 text-base font-semibold text-gray-700">
          QC Workflow
        </h3>
        <ol className="space-y-3">
          {[
            { step: "1", title: "Setup Instruments", desc: "Register analysers and equipment used in your lab." },
            { step: "2", title: "Register QC Samples", desc: "Add control materials with lot numbers and target ranges (Mean, SD, CV)." },
            { step: "3", title: "Set QC Sample Targets", desc: "Define acceptable ranges per analyte per instrument." },
            { step: "4", title: "Upload Test Files", desc: "Import or define the analytes/parameters being tested." },
            { step: "5", title: "Enter QC Results", desc: "Analysts input daily QC values. System auto-applies Westgard Rules." },
            { step: "6", title: "Review & Approve", desc: "Supervisors review flagged results and approve or reject QC runs." },
            { step: "7", title: "Generate Reports", desc: "Export Levey-Jennings charts and summary reports." },
          ].map((item) => (
            <li key={item.step} className="flex items-start gap-4">
              <span className="bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400 flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold">
                {item.step}
              </span>
              <div>
                <p className="dark:text-dark-200 text-sm font-medium text-gray-700">{item.title}</p>
                <p className="dark:text-dark-400 text-xs text-gray-500">{item.desc}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
