import { useCallback, useEffect, useState } from "react";
import { XMarkIcon, CalculatorIcon, ArrowRightIcon } from "@heroicons/react/24/outline";
import { toast } from "sonner";
import dayjs from "dayjs";
import qcSampleService, { type EstablishPreviewDto } from "@/services/qcSampleService";
import { getErrorMessage } from "@/utils/apiError";

interface Props {
  qcSampleId: string;
  sampleName: string;
  onClose: () => void;
  onApplied?: () => void;
}

const dateCls =
  "dark:bg-dark-900 dark:text-dark-100 dark:border-dark-600 rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50";

export default function QCSampleEstablishModal({ qcSampleId, sampleName, onClose, onApplied }: Props) {
  const [from,     setFrom]     = useState(dayjs().subtract(29, "day").format("YYYY-MM-DD"));
  const [to,       setTo]       = useState(dayjs().format("YYYY-MM-DD"));
  const [rows,     setRows]     = useState<EstablishPreviewDto[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading,  setLoading]  = useState(false);
  const [applying, setApplying] = useState(false);

  const canEstablish = (r: EstablishPreviewDto) => r.n >= 2 && r.calcMean != null && r.calcSD != null;

  const loadPreview = useCallback(async () => {
    setLoading(true);
    try {
      const res = await qcSampleService.getEstablishPreview(qcSampleId, {
        dateFrom: from ? dayjs(from).toISOString() : undefined,
        dateTo:   to   ? dayjs(to).endOf("day").toISOString() : undefined,
      });
      const data = res.data.data;
      setRows(data);
      // auto-select all that have enough data
      setSelected(new Set(data.filter(r => r.n >= 2 && r.calcMean != null && r.calcSD != null).map(r => r.testFileParameterId)));
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally { setLoading(false); }
  }, [qcSampleId, from, to]);

  useEffect(() => { loadPreview(); }, [loadPreview]);

  const toggle = (id: string) => setSelected(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const selectable = rows.filter(canEstablish);
  const allSelected = selectable.length > 0 && selectable.every(r => selected.has(r.testFileParameterId));
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(selectable.map(r => r.testFileParameterId)));

  const apply = async () => {
    if (selected.size === 0) return;
    setApplying(true);
    try {
      const res = await qcSampleService.establishMean(qcSampleId, {
        dateFrom: from ? dayjs(from).toISOString() : undefined,
        dateTo:   to   ? dayjs(to).endOf("day").toISOString() : undefined,
        testFileParameterIds: [...selected],
      });
      toast.success(res.data.message ?? "Mean ditetapkan.");
      onApplied?.();
      onClose();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally { setApplying(false); }
  };

  const num = (v: number | null, d = 2) => v == null ? "—" : v.toFixed(d);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="dark:bg-dark-800 flex w-full max-w-3xl flex-col rounded-xl bg-white shadow-xl" style={{ maxHeight: "88vh" }}>

        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 dark:border-dark-600">
          <div>
            <h2 className="dark:text-dark-100 flex items-center gap-2 text-lg font-semibold text-gray-800">
              <CalculatorIcon className="size-5 text-primary-600 dark:text-primary-400" />
              Establish Mean
            </h2>
            <p className="dark:text-dark-400 mt-0.5 text-sm text-gray-500">{sampleName}</p>
          </div>
          <button onClick={onClose} className="dark:text-dark-300 rounded-lg p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-700">
            <XMarkIcon className="size-5" />
          </button>
        </div>

        {/* Date range */}
        <div className="dark:border-dark-600 flex flex-wrap items-end gap-3 border-b border-gray-100 px-6 py-3">
          <div>
            <label className="dark:text-dark-400 mb-1 block text-xs font-medium text-gray-500">Dari tanggal</label>
            <input type="date" value={from} onChange={e => setFrom(e.target.value)} className={dateCls} />
          </div>
          <div>
            <label className="dark:text-dark-400 mb-1 block text-xs font-medium text-gray-500">Sampai tanggal</label>
            <input type="date" value={to} onChange={e => setTo(e.target.value)} className={dateCls} />
          </div>
          <div className="flex items-center gap-1.5">
            {[{ l: "20 hari", d: 19 }, { l: "30 hari", d: 29 }].map(p => (
              <button key={p.l} onClick={() => { setFrom(dayjs().subtract(p.d, "day").format("YYYY-MM-DD")); setTo(dayjs().format("YYYY-MM-DD")); }}
                className="dark:bg-dark-700 dark:text-dark-300 rounded-lg bg-gray-100 px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-200 dark:hover:bg-dark-600">
                {p.l}
              </button>
            ))}
            <button onClick={() => { setFrom(dayjs().startOf("month").format("YYYY-MM-DD")); setTo(dayjs().endOf("month").format("YYYY-MM-DD")); }}
              className="dark:bg-dark-700 dark:text-dark-300 rounded-lg bg-gray-100 px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-200 dark:hover:bg-dark-600">
              Bulan ini
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="py-12 text-center text-sm text-gray-400 dark:text-dark-400">Menghitung dari data…</div>
          ) : rows.length === 0 ? (
            <div className="py-12 text-center text-sm text-gray-400 dark:text-dark-400">Tidak ada parameter.</div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-gray-150 dark:border-dark-600">
              {/* header */}
              <div className="dark:bg-dark-700 dark:text-dark-400 grid grid-cols-[1.6rem_1.7fr_2.2rem_1.4fr_0.6rem_1.4fr] items-center gap-2 bg-gray-50 px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-gray-500">
                <input type="checkbox" checked={allSelected} onChange={toggleAll} className="rounded border-gray-300 dark:border-dark-500" />
                <span>Parameter</span>
                <span className="text-center" title="Jumlah data in-control di rentang">N</span>
                <span>Target sekarang</span>
                <span />
                <span>Hasil hitung (baru)</span>
              </div>

              <div className="divide-y divide-gray-100 dark:divide-dark-600">
                {rows.map(r => {
                  const ok = canEstablish(r);
                  return (
                    <div key={r.testFileParameterId}
                      className={`grid grid-cols-[1.6rem_1.7fr_2.2rem_1.4fr_0.6rem_1.4fr] items-center gap-2 px-3 py-2.5 text-sm ${ok ? "" : "opacity-50"}`}>
                      <input type="checkbox" disabled={!ok}
                        checked={selected.has(r.testFileParameterId)} onChange={() => toggle(r.testFileParameterId)}
                        className="rounded border-gray-300 dark:border-dark-500" />
                      <div className="min-w-0">
                        <p className="truncate font-medium text-gray-800 dark:text-dark-100">{r.parameterName}</p>
                        {r.unit && <p className="truncate text-xs text-gray-400 dark:text-dark-500">{r.unit}</p>}
                      </div>
                      <span className={`text-center text-xs font-medium ${r.n >= 2 ? "text-gray-600 dark:text-dark-300" : "text-amber-500"}`}>{r.n}</span>
                      {/* current */}
                      <div className="text-xs text-gray-500 dark:text-dark-400">
                        {r.hasTarget
                          ? <>M {num(r.currentMean)} · SD {num(r.currentSD)} · CV {num(r.currentCV)}%</>
                          : <span className="italic text-gray-400">belum ada</span>}
                      </div>
                      <ArrowRightIcon className={`size-3.5 ${ok ? "text-primary-500" : "text-gray-300 dark:text-dark-600"}`} />
                      {/* calculated */}
                      <div className="text-xs">
                        {ok
                          ? <span className="font-medium text-gray-800 dark:text-dark-100">M {num(r.calcMean)} · SD {num(r.calcSD)} · CV {num(r.calcCV)}%</span>
                          : <span className="text-amber-500">data &lt; 2 titik</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="dark:border-dark-600 flex items-center justify-between border-t border-gray-100 px-6 py-3">
          <p className="dark:text-dark-400 text-xs text-gray-400">
            Data <strong>out-of-control</strong> (ditolak analis) otomatis tidak dihitung. Hanya parameter ≥ 2 titik yang bisa di-establish.
          </p>
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="dark:text-dark-300 rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 dark:border-dark-600 dark:hover:bg-dark-700">
              Batal
            </button>
            <button onClick={apply} disabled={applying || selected.size === 0}
              className="bg-primary-600 hover:bg-primary-700 rounded-lg px-5 py-2 text-sm font-medium text-white disabled:opacity-40">
              {applying ? "Menerapkan…" : `Terapkan ke ${selected.size} parameter`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
