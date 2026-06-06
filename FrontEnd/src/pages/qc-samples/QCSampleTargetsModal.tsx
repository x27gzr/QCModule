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
  sdValue:       string;  // nilai dari assay sheet (mis. 2SD)
  sdMultiplier:  string;  // berapa kali SD (1/2/3)
  cv:            string;
  tea:           string;
  teaUnit:       string;
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
          // Reverse: stored sd is 1SD, default assume assay sheet had 2SD → sdValue = sd×2
          const sd1 = existing?.sd ?? 0;
          return {
            parameterId:   p.id,
            parameterName: p.parameterName,
            unit:          p.unit,
            testFileName:  tf.name,
            mean:          existing ? String(existing.mean) : "",
            sdValue:       existing ? String(sd1 * 2) : "",
            sdMultiplier:  "2",
            cv:            existing ? String(existing.cv)   : "",
            tea:           existing?.tea != null ? String(existing.tea) : "",
            teaUnit:       existing?.teaUnit ?? "%",
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

  const calc1SD = (sdValue: string, sdMultiplier: string) => {
    const v = parseFloat(sdValue);
    const m = parseFloat(sdMultiplier) || 1;
    return (v && m) ? v / m : NaN;
  };

  const update = (parameterId: string, field: "mean" | "sdValue" | "sdMultiplier" | "cv" | "tea" | "teaUnit", value: string) => {
    setRows(prev => prev.map(r => {
      if (r.parameterId !== parameterId) return r;
      const next = { ...r, [field]: value, saved: false, error: null };
      // Recalculate CV when mean, sdValue, or sdMultiplier changes
      if (field === "mean" || field === "sdValue" || field === "sdMultiplier") {
        const mean = parseFloat(field === "mean" ? value : r.mean);
        const sdVal = field === "sdValue"      ? value : r.sdValue;
        const sdMul = field === "sdMultiplier" ? value : r.sdMultiplier;
        const sd1   = calc1SD(sdVal, sdMul);
        if (mean && !isNaN(sd1) && mean !== 0) next.cv = ((sd1 / mean) * 100).toFixed(2);
      }
      return next;
    }));
  };

  const save = async (row: TargetRow) => {
    const mean = parseFloat(row.mean);
    const sd   = calc1SD(row.sdValue, row.sdMultiplier);
    const cv   = parseFloat(row.cv);

    if (!mean || isNaN(sd) || !cv || mean === 0 || sd <= 0 || cv <= 0) {
      setRows(prev => prev.map(r => r.parameterId === row.parameterId
        ? { ...r, error: "Mean, SD value, and CV must be valid numbers greater than zero." } : r));
      return;
    }

    setRows(prev => prev.map(r => r.parameterId === row.parameterId ? { ...r, saving: true, error: null } : r));
    const tea = row.tea !== "" ? parseFloat(row.tea) : undefined;

    try {
      await qcResultService.upsertTarget(qcSampleId, {
        testFileParameterId: row.parameterId,
        mean, sd, cv,  // sd sudah 1SD hasil perhitungan
        tea:     tea && !isNaN(tea) ? tea : undefined,
        teaUnit: row.teaUnit || "%",
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
      <div className="dark:bg-dark-800 flex w-full max-w-4xl flex-col rounded-xl bg-white shadow-xl" style={{ maxHeight: "85vh" }}>

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
                  <div className="mb-1 grid grid-cols-[2fr_1fr_2fr_1fr_1fr_4rem_3.5rem] gap-2 px-3 text-xs font-medium text-gray-400 dark:text-dark-500">
                    <span>Parameter</span>
                    <span>Mean</span>
                    <span>[x] × SD</span>
                    <span>CV (%)</span>
                    <span>TEA</span>
                    <span>Unit</span>
                    <span />
                  </div>

                  <div className="divide-y divide-gray-100 rounded-xl border border-gray-100 dark:divide-dark-600 dark:border-dark-600">
                    {groupRows.map(row => (
                      <div key={row.parameterId} className="grid grid-cols-[2fr_1fr_2fr_1fr_1fr_4rem_3.5rem] items-center gap-2 px-3 py-2.5">
                        {/* Parameter name */}
                        <div>
                          <p className="text-sm font-medium text-gray-800 dark:text-dark-100 flex items-center gap-1.5">
                            {row.hasTarget && <span className="inline-block size-1.5 rounded-full bg-emerald-500" title="Target set" />}
                            {row.parameterName}
                          </p>
                          {row.unit && <p className="text-xs text-gray-400 dark:text-dark-500">{row.unit}</p>}
                        </div>

                        {/* Mean */}
                        <input type="number" step="any" value={row.mean}
                          onChange={e => update(row.parameterId, "mean", e.target.value)}
                          placeholder="0.00"
                          className="dark:bg-dark-900 dark:text-dark-100 dark:border-dark-600 rounded-lg border border-gray-200 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50" />

                        {/* [multiplier] × [sd value] → 1SD otomatis */}
                        <div className="flex items-center gap-1">
                          <select value={row.sdMultiplier}
                            onChange={e => update(row.parameterId, "sdMultiplier", e.target.value)}
                            className="dark:bg-dark-900 dark:text-dark-100 dark:border-dark-600 w-12 shrink-0 rounded-lg border border-gray-200 px-1 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50">
                            <option value="1">1</option>
                            <option value="2">2</option>
                            <option value="3">3</option>
                          </select>
                          <span className="shrink-0 text-xs text-gray-400">×</span>
                          <input type="number" step="any" value={row.sdValue}
                            onChange={e => update(row.parameterId, "sdValue", e.target.value)}
                            placeholder="0.00"
                            className="dark:bg-dark-900 dark:text-dark-100 dark:border-dark-600 min-w-0 flex-1 rounded-lg border border-gray-200 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50" />
                        </div>

                        {/* CV */}
                        <input type="number" step="any" value={row.cv}
                          onChange={e => update(row.parameterId, "cv", e.target.value)}
                          placeholder="auto"
                          className="dark:bg-dark-900 dark:text-dark-100 dark:border-dark-600 rounded-lg border border-gray-200 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50" />

                        {/* TEA */}
                        <input type="number" step="any" value={row.tea}
                          onChange={e => update(row.parameterId, "tea", e.target.value)}
                          placeholder="e.g. 10"
                          className="dark:bg-dark-900 dark:text-dark-100 dark:border-dark-600 rounded-lg border border-gray-200 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50" />

                        {/* TEA Unit */}
                        <select value={row.teaUnit}
                          onChange={e => update(row.parameterId, "teaUnit", e.target.value)}
                          className="dark:bg-dark-900 dark:text-dark-100 dark:border-dark-600 rounded-lg border border-gray-200 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50">
                          <option value="%">%</option>
                          <option value="abs">abs</option>
                        </select>

                        {/* Save button */}
                        <div className="flex items-center justify-end">
                          {row.saved ? (
                            <CheckCircleIcon className="size-5 text-emerald-500" />
                          ) : (
                            <button onClick={() => save(row)}
                              disabled={row.saving || (!row.mean && !row.sd)}
                              className="rounded-lg bg-primary-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-primary-700 disabled:opacity-40">
                              {row.saving ? "…" : "Save"}
                            </button>
                          )}
                        </div>

                        {/* Error */}
                        {row.error && (
                          <p className="col-span-7 -mt-1 px-1 text-xs text-red-500">{row.error}</p>
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
            [x] × SD = nilai dari assay sheet (mis. 2×0.4 → 1SD=0.2). CV dihitung otomatis. TEA opsional. Klik <strong>Save</strong> per baris.
            <span className="ml-2 inline-flex items-center gap-1">
              <span className="inline-block size-1.5 rounded-full bg-emerald-500" /> = target already set
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
