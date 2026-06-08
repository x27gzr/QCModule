import { useEffect, useState, useCallback } from "react";
import { CheckCircleIcon, XMarkIcon } from "@heroicons/react/24/outline";
import qcResultService, { type QCSampleTargetDto } from "@/services/qcResultService";
import qcSampleService from "@/services/qcSampleService";
import instrumentService from "@/services/instrumentService";
import testFileService, { type TestFileDto, type TestFileParameterDto } from "@/services/testFileService";

interface TargetRow {
  parameterId:   string;
  parameterName: string;
  unit:          string | null;
  mean:          string;
  sdValue:       string;  // nilai SD dari assay sheet
  sdMultiplier:  string;  // nilai itu mewakili berapa SD (1/2/3)
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

const inputCls =
  "dark:bg-dark-900 dark:text-dark-100 dark:border-dark-600 w-full rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50";

export default function QCSampleTargetsModal({ qcSampleId, sampleName, onClose }: Props) {
  const [rows,     setRows]     = useState<TargetRow[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [testFile, setTestFile] = useState<string>("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // QC Sample → Instrument → its single Test File (scope parameters correctly)
      const sample     = (await qcSampleService.getById(qcSampleId)).data.data;
      const instrument = (await instrumentService.getById(sample.instrumentId)).data.data;
      const tf: TestFileDto = (await testFileService.getById(instrument.testFileId)).data.data;
      setTestFile(`${instrument.name} · ${tf.name}`);

      const targets: QCSampleTargetDto[] = (await qcResultService.getTargets(qcSampleId)).data.data;
      const targetMap = Object.fromEntries(targets.map(t => [t.testFileParameterId, t]));

      const built: TargetRow[] = tf.parameters.map((p: TestFileParameterDto) => {
        const existing = targetMap[p.id];
        return {
          parameterId:   p.id,
          parameterName: p.parameterName,
          unit:          p.unit,
          mean:          existing ? String(existing.mean)  : "",
          // stored SD is 1SD; show it back at ×1 so it round-trips cleanly
          sdValue:       existing ? String(existing.sd)    : "",
          sdMultiplier:  "1",
          tea:           existing?.tea != null ? String(existing.tea) : "",
          teaUnit:       existing?.teaUnit ?? "%",
          saved:         false,
          saving:        false,
          error:         null,
          hasTarget:     !!existing,
        };
      });
      setRows(built);
    } finally {
      setLoading(false);
    }
  }, [qcSampleId]);

  useEffect(() => { load(); }, [load]);

  // 1SD = entered value ÷ how many SD it represents
  const oneSD = (row: TargetRow) => {
    const v = parseFloat(row.sdValue);
    const m = parseFloat(row.sdMultiplier) || 1;
    return v > 0 && m > 0 ? v / m : NaN;
  };
  // CV% = SD/Mean × 100 — derived purely from the target Mean & SD.
  const cvOf = (row: TargetRow) => {
    const mean = parseFloat(row.mean);
    const sd1  = oneSD(row);
    return mean > 0 && !isNaN(sd1) ? (sd1 / mean) * 100 : NaN;
  };

  const update = (parameterId: string, field: "mean" | "sdValue" | "sdMultiplier" | "tea" | "teaUnit", value: string) => {
    setRows(prev => prev.map(r =>
      r.parameterId === parameterId ? { ...r, [field]: value, saved: false, error: null } : r));
  };

  const save = async (row: TargetRow) => {
    const mean = parseFloat(row.mean);
    const sd   = oneSD(row);
    const cv   = cvOf(row);

    if (!(mean > 0) || !(sd > 0)) {
      setRows(prev => prev.map(r => r.parameterId === row.parameterId
        ? { ...r, error: "Mean dan SD harus angka > 0." } : r));
      return;
    }

    setRows(prev => prev.map(r => r.parameterId === row.parameterId ? { ...r, saving: true, error: null } : r));
    const tea = row.tea !== "" ? parseFloat(row.tea) : undefined;

    try {
      await qcResultService.upsertTarget(qcSampleId, {
        testFileParameterId: row.parameterId,
        mean, sd, cv: +cv.toFixed(2),
        tea:     tea != null && !isNaN(tea) ? tea : undefined,
        teaUnit: row.teaUnit || "%",
      });
      setRows(prev => prev.map(r => r.parameterId === row.parameterId
        ? { ...r, saving: false, saved: true, hasTarget: true } : r));
    } catch (e: any) {
      setRows(prev => prev.map(r => r.parameterId === row.parameterId
        ? { ...r, saving: false, error: e?.message ?? "Gagal menyimpan." } : r));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="dark:bg-dark-800 flex w-full max-w-3xl flex-col rounded-xl bg-white shadow-xl" style={{ maxHeight: "85vh" }}>

        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 dark:border-dark-600">
          <div>
            <h2 className="dark:text-dark-100 text-lg font-semibold text-gray-800">Target QC Sample</h2>
            <p className="dark:text-dark-400 mt-0.5 text-sm text-gray-500">
              {sampleName}{testFile && <span className="text-gray-400 dark:text-dark-500"> · {testFile}</span>}
            </p>
          </div>
          <button onClick={onClose} className="dark:text-dark-300 rounded-lg p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-700">
            <XMarkIcon className="size-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="py-12 text-center text-sm text-gray-400 dark:text-dark-400">Memuat parameter…</div>
          ) : rows.length === 0 ? (
            <div className="py-12 text-center text-sm text-gray-400 dark:text-dark-400">
              Test file untuk instrument ini belum punya parameter. Tambahkan dulu di halaman <span className="font-medium">Test Files</span>.
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-gray-150 dark:border-dark-600">
              {/* Column headers */}
              <div className="dark:bg-dark-700 dark:text-dark-400 grid grid-cols-[1.7fr_1fr_1.5fr_4.5rem_1.4fr_3rem] items-center gap-3 bg-gray-50 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-gray-500">
                <span>Parameter</span>
                <span>Mean</span>
                <span>SD (assay)</span>
                <span className="text-center">CV %</span>
                <span>TEA</span>
                <span />
              </div>

              <div className="divide-y divide-gray-100 dark:divide-dark-600">
                {rows.map(row => {
                  const sd1 = oneSD(row);
                  const cv  = cvOf(row);
                  return (
                    <div key={row.parameterId} className="px-4 py-2.5">
                      <div className="grid grid-cols-[1.7fr_1fr_1.5fr_4.5rem_1.4fr_3rem] items-center gap-3">
                        {/* Parameter */}
                        <div className="min-w-0">
                          <p className="flex items-center gap-1.5 truncate text-sm font-medium text-gray-800 dark:text-dark-100">
                            {row.hasTarget && <span className="inline-block size-1.5 shrink-0 rounded-full bg-emerald-500" title="Target sudah diisi" />}
                            {row.parameterName}
                          </p>
                          {row.unit && <p className="truncate text-xs text-gray-400 dark:text-dark-500">{row.unit}</p>}
                        </div>

                        {/* Mean */}
                        <input type="number" step="any" value={row.mean} placeholder="0.00"
                          onChange={e => update(row.parameterId, "mean", e.target.value)} className={inputCls} />

                        {/* SD value + (= n SD) */}
                        <div className="flex items-center gap-1.5">
                          <input type="number" step="any" value={row.sdValue} placeholder="0.00"
                            onChange={e => update(row.parameterId, "sdValue", e.target.value)}
                            className={`${inputCls} min-w-0 flex-1`} />
                          <select value={row.sdMultiplier}
                            onChange={e => update(row.parameterId, "sdMultiplier", e.target.value)}
                            title="Nilai SD di atas mewakili berapa SD?"
                            className="dark:bg-dark-900 dark:text-dark-100 dark:border-dark-600 shrink-0 rounded-lg border border-gray-200 py-1.5 pl-1.5 pr-0.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary-500/50">
                            <option value="1">=1SD</option>
                            <option value="2">=2SD</option>
                            <option value="3">=3SD</option>
                          </select>
                        </div>

                        {/* CV — auto, read-only */}
                        <div className="dark:bg-dark-700 dark:text-dark-200 flex h-[34px] items-center justify-center rounded-lg bg-gray-100 px-1 text-sm font-medium text-gray-600"
                          title="CV = SD ÷ Mean × 100 (otomatis)">
                          {!isNaN(cv) ? cv.toFixed(2) : "—"}
                        </div>

                        {/* TEA + unit */}
                        <div className="flex items-center gap-1.5">
                          <input type="number" step="any" value={row.tea} placeholder="opsional"
                            onChange={e => update(row.parameterId, "tea", e.target.value)}
                            className={`${inputCls} min-w-0 flex-1`} />
                          <select value={row.teaUnit}
                            onChange={e => update(row.parameterId, "teaUnit", e.target.value)}
                            className="dark:bg-dark-900 dark:text-dark-100 dark:border-dark-600 shrink-0 rounded-lg border border-gray-200 py-1.5 pl-1.5 pr-0.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary-500/50">
                            <option value="%">%</option>
                            <option value="abs">abs</option>
                          </select>
                        </div>

                        {/* Save */}
                        <div className="flex items-center justify-end">
                          {row.saved ? (
                            <CheckCircleIcon className="size-5 text-emerald-500" />
                          ) : (
                            <button onClick={() => save(row)}
                              disabled={row.saving || !row.mean || !row.sdValue}
                              className="rounded-lg bg-primary-600 px-3 py-1 text-xs font-medium text-white hover:bg-primary-700 disabled:opacity-40">
                              {row.saving ? "…" : "Save"}
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Helper / error line */}
                      {row.error ? (
                        <p className="mt-1 text-xs text-red-500">{row.error}</p>
                      ) : !isNaN(sd1) && (
                        <p className="mt-1 text-[11px] text-gray-400 dark:text-dark-500">
                          1SD = <span className="font-medium text-gray-500 dark:text-dark-300">{sd1.toFixed(3)}</span>
                          {!isNaN(cv) && <> · CV <span className="font-medium text-gray-500 dark:text-dark-300">{cv.toFixed(2)}%</span></>}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-100 px-6 py-3 dark:border-dark-600">
          <p className="dark:text-dark-400 text-xs text-gray-400">
            <strong>CV otomatis</strong> dari Mean &amp; SD (CV = SD ÷ Mean × 100). Pilih <strong>=1SD/=2SD/=3SD</strong> sesuai assay sheet —
            kalau insert menulis "2SD = 0,4", isi 0,4 lalu pilih =2SD. TEA opsional. Klik <strong>Save</strong> per baris.
            <span className="ml-2 inline-flex items-center gap-1"><span className="inline-block size-1.5 rounded-full bg-emerald-500" /> = target sudah diisi</span>
          </p>
        </div>
      </div>
    </div>
  );
}
