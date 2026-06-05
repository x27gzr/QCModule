import { useCallback, useEffect, useState } from "react";
import { PlusIcon, MagnifyingGlassIcon, ArrowPathIcon, ChartBarIcon, CheckCircleIcon, XCircleIcon, ExclamationTriangleIcon, ClockIcon } from "@heroicons/react/24/outline";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import dayjs from "dayjs";
import qcResultService, { type QCResultSummaryDto, type QCStatus } from "@/services/qcResultService";
import qcSampleService, { type QCSampleSummaryDto } from "@/services/qcSampleService";
import testFileService, { type TestFileDto } from "@/services/testFileService";
import { useAuth } from "@/contexts/auth/context";

// ── Status display helpers ────────────────────────────────────────────────────
const STATUS_CONFIG: Record<QCStatus, { label: string; icon: React.ElementType; color: string }> = {
  Pending:  { label: "Pending",  icon: ClockIcon,               color: "text-gray-400 dark:text-dark-400" },
  Accepted: { label: "Accepted", icon: CheckCircleIcon,         color: "text-emerald-600" },
  Warning:  { label: "Warning",  icon: ExclamationTriangleIcon, color: "text-amber-500" },
  Rejected: { label: "Rejected", icon: XCircleIcon,             color: "text-red-600" },
};

function StatusBadge({ status }: { status: QCStatus }) {
  const cfg = STATUS_CONFIG[status];
  const Icon = cfg.icon;
  return <span className={`flex items-center gap-1 text-xs font-medium ${cfg.color}`}><Icon className="size-3.5" />{cfg.label}</span>;
}

function ZScoreBadge({ z }: { z: number }) {
  const abs = Math.abs(z);
  const color = abs > 3 ? "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400"
              : abs > 2 ? "bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400"
              : "bg-gray-100 text-gray-600 dark:bg-dark-600 dark:text-dark-300";
  return <span className={`rounded px-1.5 py-0.5 font-mono text-xs font-medium ${color}`}>{z > 0 ? "+" : ""}{z.toFixed(2)}</span>;
}

// ── Entry modal ───────────────────────────────────────────────────────────────
const entrySchema = z.object({
  qcSampleId:          z.string().min(1, "QC Sample required"),
  testFileParameterId: z.string().min(1, "Parameter required"),
  resultDate:          z.string().min(1, "Date required"),
  value:               z.preprocess(v => Number(v), z.number({ invalid_type_error: "Enter a number" })),
  comment:             z.string().optional(),
});
type EntryForm = z.infer<typeof entrySchema>;

const inputCls = "dark:bg-dark-900 dark:text-dark-100 dark:border-dark-600 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50";

function EntryModal({ onSave, onClose }: { onSave: (data: EntryForm) => Promise<string>; onClose: () => void }) {
  const [samples, setSamples]     = useState<QCSampleSummaryDto[]>([]);
  const [testFiles, setTestFiles] = useState<TestFileDto[]>([]);
  const [savedMsg, setSavedMsg]   = useState<string | null>(null);
  const [selectedSample, setSelectedSample] = useState("");

  const { register, handleSubmit, watch, setError, formState: { errors, isSubmitting } } = useForm<EntryForm>({
    resolver: zodResolver(entrySchema),
    defaultValues: { resultDate: dayjs().format("YYYY-MM-DDTHH:mm") },
  });

  useEffect(() => {
    qcSampleService.getAll({ pageSize: 100 }).then(r => setSamples(r.data.data.items));
    testFileService.getAll({ isActive: true, pageSize: 100 }).then(r =>
      Promise.all(r.data.data.items.map(tf => testFileService.getById(tf.id).then(x => x.data.data)))
        .then(setTestFiles));
  }, []);

  const watchedSample = watch("qcSampleId");
  const availableParams = testFiles.flatMap(tf =>
    tf.parameters.map(p => ({ id: p.id, label: `${p.parameterName}${p.unit ? ` (${p.unit})` : ""}`, testFile: tf.name })));

  const onSubmit = async (data: EntryForm) => {
    try {
      const msg = await onSave({ ...data, resultDate: dayjs(data.resultDate).toISOString() });
      setSavedMsg(msg);
    } catch (e: any) { setError("root", { message: e?.message }); }
  };

  if (savedMsg) return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="dark:bg-dark-800 w-full max-w-sm rounded-xl bg-white p-6 text-center shadow-xl">
        <CheckCircleIcon className="mx-auto mb-3 size-12 text-emerald-500" />
        <p className="dark:text-dark-100 font-semibold text-gray-800">Result Saved</p>
        <p className="dark:text-dark-400 mt-1 text-sm text-gray-500">{savedMsg}</p>
        <button onClick={onClose} className="bg-primary-600 hover:bg-primary-700 mt-4 w-full rounded-lg px-4 py-2 text-sm font-medium text-white">Close</button>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="dark:bg-dark-800 w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
        <h2 className="dark:text-dark-100 mb-5 text-lg font-semibold text-gray-800">Enter QC Result</h2>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="dark:text-dark-300 mb-1 block text-sm font-medium text-gray-600">QC Sample *</label>
            <select {...register("qcSampleId")} className={inputCls} onChange={e => setSelectedSample(e.target.value)}>
              <option value="">Select QC sample…</option>
              {samples.map(s => <option key={s.id} value={s.id}>{s.name} — {s.level} (Lot: {s.lotNumber})</option>)}
            </select>
            {errors.qcSampleId && <p className="mt-1 text-xs text-red-500">{errors.qcSampleId.message}</p>}
          </div>
          <div>
            <label className="dark:text-dark-300 mb-1 block text-sm font-medium text-gray-600">Parameter / Analyte *</label>
            <select {...register("testFileParameterId")} className={inputCls}>
              <option value="">Select parameter…</option>
              {availableParams.map(p => <option key={p.id} value={p.id}>{p.label} [{p.testFile}]</option>)}
            </select>
            {errors.testFileParameterId && <p className="mt-1 text-xs text-red-500">{errors.testFileParameterId.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="dark:text-dark-300 mb-1 block text-sm font-medium text-gray-600">Value *</label>
              <input {...register("value")} type="number" step="any" className={inputCls} placeholder="Measured value" />
              {errors.value && <p className="mt-1 text-xs text-red-500">{errors.value.message}</p>}
            </div>
            <div>
              <label className="dark:text-dark-300 mb-1 block text-sm font-medium text-gray-600">Date & Time *</label>
              <input {...register("resultDate")} type="datetime-local" className={inputCls} />
              {errors.resultDate && <p className="mt-1 text-xs text-red-500">{errors.resultDate.message}</p>}
            </div>
          </div>
          <div>
            <label className="dark:text-dark-300 mb-1 block text-sm font-medium text-gray-600">Comment</label>
            <input {...register("comment")} className={inputCls} placeholder="Optional comment" />
          </div>
          {errors.root && <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">{errors.root.message}</div>}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="dark:text-dark-300 rounded-lg px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 dark:hover:bg-dark-700">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="bg-primary-600 hover:bg-primary-700 rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-60">{isSubmitting ? "Saving…" : "Save Result"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Review modal ──────────────────────────────────────────────────────────────
function ReviewModal({ result, onSave, onClose }: { result: QCResultSummaryDto; onSave: (status: number, comment?: string) => Promise<void>; onClose: () => void }) {
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const handle = async (status: number) => {
    setLoading(true);
    try { await onSave(status, comment || undefined); onClose(); }
    finally { setLoading(false); }
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="dark:bg-dark-800 w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <h2 className="dark:text-dark-100 mb-2 text-lg font-semibold">Review Result</h2>
        <div className="dark:bg-dark-700 mb-4 rounded-lg bg-gray-50 p-3 text-sm">
          <p className="dark:text-dark-200 font-medium text-gray-800">{result.qcSampleName} — {result.parameterName}</p>
          <p className="dark:text-dark-400 text-gray-500">Value: {result.value} · Z-score: {result.zScore.toFixed(3)} · Flags: {result.westgardFlags || "None"}</p>
        </div>
        <textarea value={comment} onChange={e => setComment(e.target.value)}
          className="dark:bg-dark-900 dark:text-dark-100 dark:border-dark-600 mb-4 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
          rows={2} placeholder="Review comment (optional)" />
        <div className="flex gap-3">
          <button onClick={onClose} className="dark:text-dark-300 flex-1 rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 dark:border-dark-600 hover:bg-gray-50 dark:hover:bg-dark-700">Cancel</button>
          <button onClick={() => handle(3)} disabled={loading} className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60">Reject</button>
          <button onClick={() => handle(1)} disabled={loading} className="flex-1 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60">Accept</button>
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function QCResultsPage() {
  const { user: me } = useAuth();
  const canReview = me?.role === "Admin" || me?.role === "Supervisor";

  const [results, setResults] = useState<QCResultSummaryDto[]>([]);
  const [total,   setTotal]   = useState(0);
  const [page,    setPage]    = useState(1);
  const [status,  setStatus]  = useState<QCStatus | "">("");
  const [loading, setLoading] = useState(true);
  const [showEntry,  setShowEntry]  = useState(false);
  const [reviewing,  setReviewing]  = useState<QCResultSummaryDto | null>(null);

  const pageSize = 20;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await qcResultService.getAll({ status: status || undefined, page, pageSize });
      setResults(res.data.data.items); setTotal(res.data.data.totalCount);
    } finally { setLoading(false); }
  }, [status, page]);

  useEffect(() => { load(); }, [load]);

  const handleEntry = async (data: any) => {
    const res = await qcResultService.create(data);
    load();
    return res.data.message ?? "Result saved.";
  };

  const handleReview = async (status: number, comment?: string) => {
    await qcResultService.review(reviewing!.id, { newStatus: status, comment });
    load();
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <select value={status} onChange={e => { setStatus(e.target.value as any); setPage(1); }}
            className="dark:bg-dark-800 dark:text-dark-100 dark:border-dark-600 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none">
            <option value="">All Status</option>
            <option value="Pending">Pending</option>
            <option value="Accepted">Accepted</option>
            <option value="Warning">Warning</option>
            <option value="Rejected">Rejected</option>
          </select>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="dark:text-dark-300 dark:hover:bg-dark-700 rounded-lg p-2 text-gray-500 hover:bg-gray-100"><ArrowPathIcon className="size-4" /></button>
          <button onClick={() => setShowEntry(true)} className="bg-primary-600 hover:bg-primary-700 flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white"><PlusIcon className="size-4" />Enter Result</button>
        </div>
      </div>

      {/* Table */}
      <div className="dark:bg-dark-800 dark:border-dark-600 border-gray-150 overflow-hidden rounded-xl border bg-white shadow-xs">
        <table className="w-full text-sm">
          <thead>
            <tr className="dark:bg-dark-700 dark:text-dark-300 border-gray-150 dark:border-dark-600 border-b bg-gray-50 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
              <th className="px-4 py-3">Sample / Parameter</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Value</th>
              <th className="px-4 py-3">Z-Score</th>
              <th className="px-4 py-3">Flags</th>
              <th className="px-4 py-3">Status</th>
              {canReview && <th className="px-4 py-3 text-right">Action</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-dark-600">
            {loading ? (
              <tr><td colSpan={7} className="py-12 text-center text-sm text-gray-400 dark:text-dark-400">Loading…</td></tr>
            ) : results.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-16 text-center">
                  <ChartBarIcon className="mx-auto mb-3 size-10 text-gray-300 dark:text-dark-500" />
                  <p className="text-sm text-gray-400 dark:text-dark-400">No QC results found.</p>
                  <button onClick={() => setShowEntry(true)} className="text-primary-600 dark:text-primary-400 mt-2 text-sm hover:underline">Enter first result</button>
                </td>
              </tr>
            ) : results.map(r => (
              <tr key={r.id} className={`dark:hover:bg-dark-700/50 hover:bg-gray-50 transition-colors ${r.status === "Rejected" ? "bg-red-50/30 dark:bg-red-900/5" : r.status === "Warning" ? "bg-amber-50/30 dark:bg-amber-900/5" : ""}`}>
                <td className="px-4 py-3">
                  <p className="text-sm font-medium text-gray-800 dark:text-dark-100">{r.parameterName}{r.unit ? ` (${r.unit})` : ""}</p>
                  <p className="text-xs text-gray-400 dark:text-dark-400">{r.qcSampleName} · {r.level}</p>
                </td>
                <td className="px-4 py-3 text-xs text-gray-500 dark:text-dark-400">{dayjs(r.resultDate).format("DD MMM YYYY HH:mm")}</td>
                <td className="px-4 py-3 font-mono text-sm font-medium text-gray-800 dark:text-dark-100">{r.value}</td>
                <td className="px-4 py-3">{r.zScore !== 0 ? <ZScoreBadge z={r.zScore} /> : <span className="text-xs text-gray-300 dark:text-dark-500">—</span>}</td>
                <td className="px-4 py-3">{r.westgardFlags ? <span className="rounded bg-red-100 px-1.5 py-0.5 font-mono text-xs text-red-700 dark:bg-red-900/20 dark:text-red-400">{r.westgardFlags}</span> : <span className="text-xs text-gray-300 dark:text-dark-500">—</span>}</td>
                <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                {canReview && (
                  <td className="px-4 py-3 text-right">
                    {(r.status === "Pending" || r.status === "Warning") && (
                      <button onClick={() => setReviewing(r)} className="rounded-lg px-2 py-1 text-xs font-medium text-primary-600 hover:bg-primary-50 dark:text-primary-400 dark:hover:bg-primary-900/20">Review</button>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>

        {totalPages > 1 && (
          <div className="dark:border-dark-600 border-gray-150 dark:text-dark-300 flex items-center justify-between border-t px-4 py-3 text-sm text-gray-500">
            <span>{total} results total</span>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => p - 1)} disabled={page === 1} className="rounded-lg px-3 py-1 hover:bg-gray-100 disabled:opacity-40 dark:hover:bg-dark-700">Prev</button>
              <span className="font-medium text-gray-700 dark:text-dark-100">{page} / {totalPages}</span>
              <button onClick={() => setPage(p => p + 1)} disabled={page === totalPages} className="rounded-lg px-3 py-1 hover:bg-gray-100 disabled:opacity-40 dark:hover:bg-dark-700">Next</button>
            </div>
          </div>
        )}
      </div>

      {showEntry  && <EntryModal onSave={handleEntry} onClose={() => { setShowEntry(false); load(); }} />}
      {reviewing  && <ReviewModal result={reviewing} onSave={handleReview} onClose={() => setReviewing(null)} />}
    </div>
  );
}
