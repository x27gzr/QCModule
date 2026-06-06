import { useEffect, useState } from "react";
import { ChartBarIcon, DocumentChartBarIcon, ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import dayjs from "dayjs";
import qcSampleService, { type QCSampleSummaryDto, type WestgardRules } from "@/services/qcSampleService";
import qcResultService, { type QCSampleTargetDto, type LeveyJenningsDto } from "@/services/qcResultService";
import LeveyJenningsChart from "./LeveyJenningsChart";

const selectCls = "dark:bg-dark-800 dark:text-dark-100 dark:border-dark-600 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50";

function StatCard({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div className="dark:bg-dark-800 dark:border-dark-600 border-gray-150 rounded-xl border bg-white px-4 py-3 shadow-xs">
      <p className="dark:text-dark-400 text-xs text-gray-500">{label}</p>
      <p className={`mt-0.5 text-xl font-bold ${color ?? "text-gray-800 dark:text-dark-100"}`}>{value}</p>
    </div>
  );
}

export default function ReportsPage() {
  const [samples,   setSamples]   = useState<QCSampleSummaryDto[]>([]);
  const [targets,   setTargets]   = useState<QCSampleTargetDto[]>([]);
  const [sampleId,  setSampleId]  = useState("");
  const [paramId,   setParamId]   = useState("");
  const [dateFrom,  setDateFrom]  = useState("");
  const [dateTo,    setDateTo]    = useState("");

  const [chart,      setChart]      = useState<LeveyJenningsDto | null>(null);
  const [sampleRules, setSampleRules] = useState<WestgardRules | null>(null);
  const [loading,    setLoading]    = useState(false);

  // Load QC samples once
  useEffect(() => {
    qcSampleService.getAll({ pageSize: 100 }).then(r => setSamples(r.data.data.items));
  }, []);

  // When sample changes, load its targets + rules
  useEffect(() => {
    setParamId("");
    setChart(null);
    setSampleRules(null);
    if (!sampleId) { setTargets([]); return; }
    qcResultService.getTargets(sampleId).then(r => setTargets(r.data.data));
    qcSampleService.getById(sampleId).then(r => setSampleRules(r.data.data.westgardRules));
  }, [sampleId]);

  // Load chart when sample + parameter selected (or filters change)
  useEffect(() => {
    if (!sampleId || !paramId) { setChart(null); return; }
    setLoading(true);
    qcResultService.getLeveyJennings({
      qcSampleId: sampleId,
      testFileParameterId: paramId,
      dateFrom: dateFrom ? dayjs(dateFrom).toISOString() : undefined,
      dateTo:   dateTo   ? dayjs(dateTo).endOf("day").toISOString() : undefined,
    })
      .then(r => setChart(r.data.data))
      .finally(() => setLoading(false));
  }, [sampleId, paramId, dateFrom, dateTo]);

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="dark:bg-dark-800 dark:border-dark-600 border-gray-150 flex flex-wrap items-end gap-3 rounded-xl border bg-white p-4 shadow-xs">
        <div>
          <label className="dark:text-dark-300 mb-1 block text-xs font-medium text-gray-600">QC Sample</label>
          <select value={sampleId} onChange={e => setSampleId(e.target.value)} className={`${selectCls} w-56`}>
            <option value="">Select QC sample…</option>
            {samples.map(s => <option key={s.id} value={s.id}>{s.name} — {s.level}</option>)}
          </select>
        </div>
        <div>
          <label className="dark:text-dark-300 mb-1 block text-xs font-medium text-gray-600">Parameter</label>
          <select value={paramId} onChange={e => setParamId(e.target.value)} disabled={!sampleId} className={`${selectCls} w-56 disabled:opacity-50`}>
            <option value="">{targets.length ? "Select parameter…" : "No targets set"}</option>
            {targets.map(t => <option key={t.testFileParameterId} value={t.testFileParameterId}>{t.parameterName}{t.unit ? ` (${t.unit})` : ""}</option>)}
          </select>
        </div>
        <div>
          <label className="dark:text-dark-300 mb-1 block text-xs font-medium text-gray-600">From</label>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className={selectCls} />
        </div>
        <div>
          <label className="dark:text-dark-300 mb-1 block text-xs font-medium text-gray-600">To</label>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className={selectCls} />
        </div>
        {(dateFrom || dateTo) && (
          <button onClick={() => { setDateFrom(""); setDateTo(""); }}
            className="dark:text-dark-300 rounded-lg px-3 py-2 text-sm text-gray-500 hover:bg-gray-100 dark:hover:bg-dark-700">
            Clear dates
          </button>
        )}
      </div>

      {/* Empty / guidance state */}
      {!sampleId || !paramId ? (
        <div className="dark:bg-dark-800 dark:border-dark-600 border-gray-150 flex h-80 flex-col items-center justify-center rounded-xl border bg-white shadow-xs">
          <DocumentChartBarIcon className="mb-3 size-12 text-gray-300 dark:text-dark-500" />
          <p className="dark:text-dark-300 text-sm font-medium text-gray-600">Levey-Jennings Chart</p>
          <p className="dark:text-dark-400 mt-1 text-sm text-gray-400">
            {!sampleId ? "Select a QC sample to begin." : targets.length === 0 ? "This sample has no targets. Set Mean/SD in QC Samples → Targets first." : "Select a parameter to view the chart."}
          </p>
        </div>
      ) : loading ? (
        <div className="dark:bg-dark-800 dark:border-dark-600 border-gray-150 flex h-80 items-center justify-center rounded-xl border bg-white shadow-xs">
          <div className="border-primary-500 size-7 animate-spin rounded-full border-4 border-t-transparent" />
        </div>
      ) : chart ? (
        <>
          {/* Header + stats */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <StatCard label="Total Points" value={chart.totalCount} />
            <StatCard label="Accepted"  value={chart.acceptedCount} color="text-emerald-600" />
            <StatCard label="Warning"   value={chart.warningCount}  color="text-amber-500" />
            <StatCard label="Rejected"  value={chart.rejectedCount} color="text-red-600" />
            <StatCard label="Mean"      value={chart.hasTarget ? chart.mean.toFixed(2) : "—"} />
            <StatCard label="CV (%)"    value={chart.hasTarget ? chart.cv.toFixed(2) : "—"} />
          </div>

          {/* Chart card */}
          <div className="dark:bg-dark-800 dark:border-dark-600 border-gray-150 rounded-xl border bg-white p-5 shadow-xs">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="dark:text-dark-100 text-base font-semibold text-gray-800">
                  {chart.parameterName}{chart.unit ? ` (${chart.unit})` : ""}
                </h3>
                <p className="dark:text-dark-400 text-sm text-gray-500">
                  {chart.qcSampleName} · {chart.level}
                  {chart.hasTarget && ` · Mean ${chart.mean.toFixed(2)} · SD ${chart.sd.toFixed(2)}`}
                </p>
              </div>
              {/* Legend */}
              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1"><span className="size-2.5 rounded-full bg-emerald-500" /> Accepted</span>
                <span className="flex items-center gap-1"><span className="size-2.5 rounded-full bg-amber-500" /> Warning</span>
                <span className="flex items-center gap-1"><span className="size-2.5 rounded-full bg-red-500" /> Rejected</span>
              </div>
            </div>

            {!chart.hasTarget ? (
              <div className="flex h-64 flex-col items-center justify-center text-center">
                <ExclamationTriangleIcon className="mb-2 size-9 text-amber-400" />
                <p className="dark:text-dark-300 text-sm font-medium text-gray-600">No target set for this parameter</p>
                <p className="dark:text-dark-400 mt-1 text-sm text-gray-400">Control limit lines cannot be drawn. Set Mean/SD in QC Samples → Targets.</p>
              </div>
            ) : chart.points.length === 0 ? (
              <div className="flex h-64 flex-col items-center justify-center text-center">
                <ChartBarIcon className="mb-2 size-9 text-gray-300 dark:text-dark-500" />
                <p className="dark:text-dark-400 text-sm text-gray-400">No QC results in the selected range.</p>
              </div>
            ) : (
              <LeveyJenningsChart data={chart} westgardRules={sampleRules ?? undefined} />
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}
