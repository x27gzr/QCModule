import { useEffect, useState, useCallback } from "react";
import { CheckCircleIcon, XMarkIcon } from "@heroicons/react/24/outline";
import qcResultService, { type QCSampleTargetDto } from "@/services/qcResultService";
import testFileService, { type TestFileDto, type TestFileParameterDto } from "@/services/testFileService";

interface TargetRow {
  parameterId:   string;
  parameterName: string;
  unit:          string | null;
  testFileName:  string;
  mean:          string;
  sd:            string;
  cv:            string;
  saved:         boolean;
  saving:        boolean;
  error:         string | null;
  hasTarget:     boolean;
}

interface Props {
  qcSampleId:   string;
  sampleName:   string;
  onClose:      () => void;
}

export default function QCSampleTargetsModal({ qcSampleId, sampleName, onClose }: Props) {
  const [rows,    setRows]    = useState<TargetRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // Load existing targets + all test file parameters in parallel
      const [targetsRes, filesRes] = await Promise.all([
        qcResultService.getTargets(qcSampleId),
        testFileService.getAll({ isActive: true, pageSize: 100 }),
      ]);

      const targets: QCSampleTargetDto[] = targetsRes.data.data;
      const targetMap = Object.fromEntries(targets.map(t => [t.testFileParameterId, t]));

      // Fetch full test files (with parameters) in parallel
      const testFiles: TestFileDto[] = await Promise.all(
        filesRes.data.data.items.map(tf => testFileService.getById(tf.id).then(r => r.data.data))
      );

      const built: TargetRow[] = testFiles.flatMap(tf =>
        tf.parameters.map((p: TestFileParameterDto) => {
          const existing = targetMap[p.id];
          return {
            parameterId:   p.id,
            parameterName: p.parameterName,
            unit:          p.unit,
            testFileName:  tf.name,
            mean:          existing ? String(existing.mean) : "",
            sd:            existing ? String(existing.sd)   : "",
            cv:            existing ? String(existing.cv)   : "",
            saved:         false,
            saving:        false,
            error:         null,
            hasTarget:     !!existing,
          };
        })
      );

      setRows(built);
    } finally {
      setLoading(false);
    }
  }, [qcSampleId]);

  useEffect(() => { load(); }, [load]);

  const update = (parameterId: string, field: "mean" | "sd" | "cv", value: string) => {
    setRows(prev => prev.map(r => {
      if (r.parameterId !== parameterId) return r;
      const next = { ...r, [field]: value, saved: false, error: null };
      // Auto-calculate CV when mean or sd changes
      if ((field === "mean" || field === "sd")) {
        const m = parseFloat(field === "mean" ? value : r.mean);
        const s = parseFloat(field === "sd"   ? value : r.sd);
        if (m && s && m !== 0) next.cv = ((s / m) * 100).toFixed(2);
      }
      return next;
    }));
  };

  const save = async (row: TargetRow) => {
    const mean = parseFloat(row.mean);
    const sd   = parseFloat(row.sd);
    const cv   = parseFloat(row.cv);

    if (!mean || !sd || !cv || mean === 0 || sd <= 0 || cv <= 0) {
      setRows(prev => prev.map(r => r.parameterId === row.parameterId
        ? { ...r, error: "Mean, SD and CV must be valid numbers greater than zero." } : r));
      return;
    }

    setRows(prev => prev.map(r => r.parameterId === row.parameterId ? { ...r, saving: true, error: null } : r));
    try {
      await qcResultService.upsertTarget(qcSampleId, {
        testFileParameterId: row.parameterId,
        mean, sd, cv,
      });
      setRows(prev => prev.map(r => r.parameterId === row.parameterId
        ? { ...r, saving: false, saved: true, hasTarget: true } : r));
    } catch (e: any) {
      setRows(prev => prev.map(r => r.parameterId === row.parameterId
        ? { ...r, saving: false, error: e?.message ?? "Save failed." } : r));
    }
  };

  // Group rows by test file name
  const grouped = rows.reduce<Record<string, TargetRow[]>>((acc, row) => {
    (acc[row.testFileName] ??= []).push(row);
    return acc;
  }, {});

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="dark:bg-dark-800 flex w-full max-w-3xl flex-col rounded-xl bg-white shadow-xl" style={{ maxHeight: "85vh" }}>

        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 dark:border-dark-600">
          <div>
            <h2 className="dark:text-dark-100 text-lg font-semibold text-gray-800">QC Sample Targets</h2>
            <p className="dark:text-dark-400 mt-0.5 text-sm text-gray-500">{sampleName}</p>
          </div>
          <button onClick={onClose} className="dark:text-dark-300 rounded-lg p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-700">
            <XMarkIcon className="size-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="py-12 text-center text-sm text-gray-400 dark:text-dark-400">Loading parameters…</div>
          ) : rows.length === 0 ? (
            <div className="py-12 text-center text-sm text-gray-400 dark:text-dark-400">
              No test file parameters found. Add parameters in the <span className="font-medium">Test Files</span> page first.
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(grouped).map(([testFileName, groupRows]) => (
                <div key={testFileName}>
                  {/* Test file header */}
                  <h3 className="dark:text-dark-300 mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
                    {testFileName}
                  </h3>

                  {/* Column headers */}
                  <div className="mb-1 grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-2 px-3 text-xs font-medium text-gray-400 dark:text-dark-500">
                    <span>Parameter</span>
                    <span>Mean</span>
                    <span>SD</span>
                    <span>CV (%)</span>
                    <span className="w-16" />
                  </div>

                  <div className="divide-y divide-gray-100 rounded-xl border border-gray-100 dark:divide-dark-600 dark:border-dark-600">
                    {groupRows.map(row => (
                      <div key={row.parameterId} className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] items-center gap-2 px-3 py-2.5">
                        {/* Parameter name */}
                        <div>
                          <p className="text-sm font-medium text-gray-800 dark:text-dark-100 flex items-center gap-1.5">
                            {row.hasTarget && <span className="inline-block size-1.5 rounded-full bg-emerald-500" title="Target set" />}
                            {row.parameterName}
                          </p>
                          {row.unit && <p className="text-xs text-gray-400 dark:text-dark-500">{row.unit}</p>}
                        </div>

                        {/* Mean */}
                        <input
                          type="number" step="any" value={row.mean}
                          onChange={e => update(row.parameterId, "mean", e.target.value)}
                          placeholder="0.00"
                          className="dark:bg-dark-900 dark:text-dark-100 dark:border-dark-600 rounded-lg border border-gray-200 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                        />

                        {/* SD */}
                        <input
                          type="number" step="any" value={row.sd}
                          onChange={e => update(row.parameterId, "sd", e.target.value)}
                          placeholder="0.00"
                          className="dark:bg-dark-900 dark:text-dark-100 dark:border-dark-600 rounded-lg border border-gray-200 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                        />

                        {/* CV */}
                        <input
                          type="number" step="any" value={row.cv}
                          onChange={e => update(row.parameterId, "cv", e.target.value)}
                          placeholder="auto"
                          className="dark:bg-dark-900 dark:text-dark-100 dark:border-dark-600 rounded-lg border border-gray-200 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                        />

                        {/* Save button */}
                        <div className="flex w-16 items-center justify-end">
                          {row.saved ? (
                            <CheckCircleIcon className="size-5 text-emerald-500" />
                          ) : (
                            <button
                              onClick={() => save(row)}
                              disabled={row.saving || (!row.mean && !row.sd)}
                              className="rounded-lg bg-primary-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-primary-700 disabled:opacity-40"
                            >
                              {row.saving ? "…" : "Save"}
                            </button>
                          )}
                        </div>

                        {/* Error */}
                        {row.error && (
                          <p className="col-span-5 -mt-1 px-1 text-xs text-red-500">{row.error}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-100 px-6 py-3 dark:border-dark-600">
          <p className="dark:text-dark-400 text-xs text-gray-400">
            CV is auto-calculated from Mean and SD. Click <strong>Save</strong> per row to update.
            <span className="ml-2 inline-flex items-center gap-1">
              <span className="inline-block size-1.5 rounded-full bg-emerald-500" /> = target already set
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
