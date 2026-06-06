import { useCallback, useEffect, useState } from "react";
import { PlusIcon, ArrowPathIcon, ChartBarIcon, CheckCircleIcon, XCircleIcon, ExclamationTriangleIcon, ClockIcon, ShieldCheckIcon, FunnelIcon, EyeIcon, EyeSlashIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import dayjs from "dayjs";
import qcResultService, { type QCResultSummaryDto, type QCStatus, type ValidationStatus, type AuthorisationStatus, type LeveyJenningsDto } from "@/services/qcResultService";
import qcSampleService, { type QCSampleSummaryDto, type WestgardRules } from "@/services/qcSampleService";
import instrumentService, { type InstrumentSummaryDto } from "@/services/instrumentService";
import testFileService, { type TestFileDto } from "@/services/testFileService";
import { useAuth } from "@/contexts/auth/context";
import { getErrorMessage } from "@/utils/apiError";
import LeveyJenningsChart from "@/pages/reports/LeveyJenningsChart";

// ── Westgard status ───────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<QCStatus, { label: string; icon: React.ElementType; color: string }> = {
  Pending:  { label: "Pending",  icon: ClockIcon,               color: "text-gray-400 dark:text-dark-400" },
  Accepted: { label: "Accepted", icon: CheckCircleIcon,         color: "text-emerald-600" },
  Warning:  { label: "Warning",  icon: ExclamationTriangleIcon, color: "text-amber-500" },
  Rejected: { label: "Rejected", icon: XCircleIcon,             color: "text-red-600" },
};

// Normalize numeric enum values from older backend responses
const STATUS_NUM: Record<string, QCStatus> = { "0":"Pending","1":"Accepted","2":"Warning","3":"Rejected" };
function normalizeStatus(s: any): QCStatus {
  if (s === null || s === undefined) return "Pending";
  const key = String(s);
  return STATUS_NUM[key] ?? (s as QCStatus);
}

function StatusBadge({ status }: { status: QCStatus }) {
  const cfg = STATUS_CONFIG[normalizeStatus(status)] ?? STATUS_CONFIG.Pending;
  const Icon = cfg.icon;
  return <span className={`flex items-center gap-1 text-xs font-medium ${cfg.color}`}><Icon className="size-3.5" />{cfg.label}</span>;
}

function ValidationBadge({ status, by }: { status: ValidationStatus; by: string | null }) {
  const map: Record<ValidationStatus, string> = {
    Pending:   "bg-gray-100 text-gray-500 dark:bg-dark-600 dark:text-dark-300",
    Validated: "bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400",
    Rejected:  "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400",
  };
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${map[status]}`} title={by ? `by ${by}` : undefined}>
      {status}
    </span>
  );
}

function AuthBadge({ status }: { status: AuthorisationStatus }) {
  if (status === "Authorised")
    return <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400"><ShieldCheckIcon className="size-3" />Authorised</span>;
  return <span className="inline-block rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-400 dark:bg-dark-600 dark:text-dark-400">—</span>;
}

function ZScoreBadge({ z }: { z: number }) {
  const abs = Math.abs(z);
  const color = abs > 3 ? "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400"
              : abs > 2 ? "bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400"
              : "bg-gray-100 text-gray-600 dark:bg-dark-600 dark:text-dark-300";
  return <span className={`rounded px-1.5 py-0.5 font-mono text-xs font-medium ${color}`}>{z > 0 ? "+" : ""}{z.toFixed(2)}</span>;
}

const inputCls = "dark:bg-dark-900 dark:text-dark-100 dark:border-dark-600 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50";

// ── Entry modal ───────────────────────────────────────────────────────────────
const entrySchema = z.object({
  qcSampleId:          z.string().min(1, "QC Sample required"),
  testFileParameterId: z.string().min(1, "Parameter required"),
  resultDate:          z.string().min(1, "Date required"),
  value:               z.preprocess(v => Number(v), z.number({ invalid_type_error: "Enter a number" })),
  comment:             z.string().optional(),
});
type EntryForm = z.infer<typeof entrySchema>;

function EntryModal({ onSave, onClose, defaultSampleId }: {
  onSave: (data: EntryForm) => Promise<string>;
  onClose: () => void;
  defaultSampleId?: string;
}) {
  const [samples,    setSamples]    = useState<QCSampleSummaryDto[]>([]);
  const [params,     setParams]     = useState<{ id: string; label: string }[]>([]);
  const [selectedSample, setSelectedSample] = useState(defaultSampleId ?? "");
  const [savedMsg,   setSavedMsg]   = useState<string | null>(null);

  const { register, handleSubmit, setValue, setError, formState: { errors, isSubmitting } } = useForm<EntryForm>({
    resolver: zodResolver(entrySchema),
    defaultValues: { resultDate: dayjs().format("YYYY-MM-DDTHH:mm"), qcSampleId: defaultSampleId ?? "" },
  });

  useEffect(() => {
    qcSampleService.getAll({ isActive: true, pageSize: 200 }).then(r => setSamples(r.data.data.items));
  }, []);

  // Load parameters from targets when sample changes
  useEffect(() => {
    if (selectedSample) {
      qcResultService.getTargets(selectedSample).then(r =>
        setParams(r.data.data.map(t => ({ id: t.testFileParameterId, label: t.parameterName }))));
    } else {
      setParams([]);
    }
    setValue("testFileParameterId", "");
  }, [selectedSample, setValue]);

  const onSubmit = async (data: EntryForm) => {
    try {
      const msg = await onSave({ ...data, resultDate: dayjs(data.resultDate).toISOString() });
      setSavedMsg(msg);
    } catch (err) {
      const msg = getErrorMessage(err);
      setError("root", { message: msg });
      toast.error(msg);
    }
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
            <select {...register("qcSampleId")} className={inputCls}
              onChange={e => { setValue("qcSampleId", e.target.value); setSelectedSample(e.target.value); }}>
              <option value="">Select QC sample…</option>
              {samples.map(s => <option key={s.id} value={s.id}>{s.name} — {s.level} (Lot: {s.lotNumber})</option>)}
            </select>
            {errors.qcSampleId && <p className="mt-1 text-xs text-red-500">{errors.qcSampleId.message}</p>}
          </div>
          <div>
            <label className="dark:text-dark-300 mb-1 block text-sm font-medium text-gray-600">Parameter *</label>
            <select {...register("testFileParameterId")} className={inputCls} disabled={!selectedSample}>
              <option value="">{selectedSample ? "Select parameter…" : "Select QC sample first"}</option>
              {params.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
            </select>
            {errors.testFileParameterId && <p className="mt-1 text-xs text-red-500">{errors.testFileParameterId.message}</p>}
            {selectedSample && params.length === 0 && <p className="mt-1 text-xs text-amber-500">No targets set for this sample. Set targets first.</p>}
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

// ── Delete modal ──────────────────────────────────────────────────────────────
function DeleteResultModal({ result, onConfirm, onClose }: {
  result: QCResultSummaryDto;
  onConfirm: (reason: string) => Promise<void>;
  onClose: () => void;
}) {
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const handle = async () => {
    if (!reason.trim()) { toast.error("Reason is required."); return; }
    setLoading(true);
    try { await onConfirm(reason); toast.success("Result deleted."); onClose(); }
    catch (err) { toast.error(getErrorMessage(err)); }
    finally { setLoading(false); }
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="dark:bg-dark-800 w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <h2 className="dark:text-dark-100 mb-2 text-lg font-semibold text-red-600">Delete QC Result</h2>
        <div className="dark:bg-dark-700 mb-4 rounded-lg bg-gray-50 px-3 py-2 text-sm">
          <p className="dark:text-dark-200 font-medium">{result.qcSampleName} — {result.parameterName}</p>
          <p className="dark:text-dark-400 text-gray-500">Value: {result.value} · {dayjs(result.resultDate).format("DD MMM YYYY")}</p>
        </div>
        <label className="dark:text-dark-300 mb-1 block text-sm font-medium text-gray-600">Reason for deletion *</label>
        <textarea value={reason} onChange={e => setReason(e.target.value)} rows={3}
          className="dark:bg-dark-900 dark:text-dark-100 dark:border-dark-600 mb-4 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/50"
          placeholder="Enter reason…" />
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="dark:text-dark-300 rounded-lg px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 dark:hover:bg-dark-700">Cancel</button>
          <button onClick={handle} disabled={loading || !reason.trim()}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60">
            {loading ? "Deleting…" : "Confirm Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Edit modal ────────────────────────────────────────────────────────────────
const editSchema = z.object({
  resultDate: z.string().min(1, "Date required"),
  value:      z.preprocess(v => Number(v), z.number({ invalid_type_error: "Enter a number" }).min(0)),
  comment:    z.string().optional(),
});
type EditForm = z.infer<typeof editSchema>;

function EditModal({ result, onSave, onClose }: {
  result: QCResultSummaryDto;
  onSave: (data: EditForm) => Promise<void>;
  onClose: () => void;
}) {
  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm<EditForm>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      resultDate: dayjs(result.resultDate).format("YYYY-MM-DDTHH:mm"),
      value:      result.value,
      comment:    "",
    },
  });
  const onSubmit = async (data: EditForm) => {
    try {
      await onSave({ ...data, resultDate: dayjs(data.resultDate).toISOString() });
      toast.success("Result updated.");
      onClose();
    } catch (err) {
      const msg = getErrorMessage(err);
      setError("root", { message: msg });
      toast.error(msg);
    }
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="dark:bg-dark-800 w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <h2 className="dark:text-dark-100 mb-4 text-lg font-semibold">Edit QC Result</h2>
        <div className="dark:bg-dark-700 mb-4 rounded-lg bg-gray-50 px-3 py-2 text-sm">
          <p className="dark:text-dark-200 font-medium">{result.qcSampleName} — {result.parameterName}</p>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="dark:text-dark-300 mb-1 block text-sm font-medium text-gray-600">Date & Time *</label>
              <input {...register("resultDate")} type="datetime-local" className={inputCls} />
              {errors.resultDate && <p className="mt-1 text-xs text-red-500">{errors.resultDate.message}</p>}
            </div>
            <div>
              <label className="dark:text-dark-300 mb-1 block text-sm font-medium text-gray-600">Value *</label>
              <input {...register("value")} type="number" step="any" className={inputCls} />
              {errors.value && <p className="mt-1 text-xs text-red-500">{errors.value.message}</p>}
            </div>
          </div>
          <div>
            <label className="dark:text-dark-300 mb-1 block text-sm font-medium text-gray-600">Comment</label>
            <input {...register("comment")} className={inputCls} placeholder="Optional comment" />
          </div>
          {errors.root && <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">{errors.root.message}</div>}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="dark:text-dark-300 rounded-lg px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 dark:hover:bg-dark-700">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="bg-primary-600 hover:bg-primary-700 rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-60">{isSubmitting ? "Saving…" : "Save"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Cancel validation modal ───────────────────────────────────────────────────
function CancelValidationModal({ result, onConfirm, onClose }: {
  result: QCResultSummaryDto;
  onConfirm: (reason: string) => Promise<void>;
  onClose: () => void;
}) {
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const handle = async () => {
    if (!reason.trim()) { toast.error("Reason is required."); return; }
    setLoading(true);
    try { await onConfirm(reason); }
    catch (err) { toast.error(getErrorMessage(err)); }
    finally { setLoading(false); }
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="dark:bg-dark-800 w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <h2 className="dark:text-dark-100 mb-2 text-lg font-semibold">Cancel Validation</h2>
        <div className="dark:bg-dark-700 mb-4 rounded-lg bg-gray-50 px-3 py-2 text-sm">
          <p className="dark:text-dark-200 font-medium">{result.qcSampleName} — {result.parameterName}</p>
          <p className="dark:text-dark-400 text-gray-500">Value: {result.value}</p>
        </div>
        <label className="dark:text-dark-300 mb-1 block text-sm font-medium text-gray-600">Reason *</label>
        <textarea value={reason} onChange={e => setReason(e.target.value)} rows={3}
          className="dark:bg-dark-900 dark:text-dark-100 dark:border-dark-600 mb-4 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50"
          placeholder="Enter reason for cancellation…" />
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="dark:text-dark-300 rounded-lg px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 dark:hover:bg-dark-700">Cancel</button>
          <button onClick={handle} disabled={loading || !reason.trim()}
            className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-60">
            {loading ? "Cancelling…" : "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Analyst validation modal ──────────────────────────────────────────────────
function ValidateModal({ result, onValidate, onClose }: {
  result: QCResultSummaryDto;
  onValidate: (reject: boolean, note?: string) => Promise<void>;
  onClose: () => void;
}) {
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const handle = async (reject: boolean) => {
    setLoading(true);
    try {
      await onValidate(reject, note || undefined);
      toast.success(reject ? "Result rejected." : "Result validated.");
      onClose();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally { setLoading(false); }
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="dark:bg-dark-800 w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <h2 className="dark:text-dark-100 mb-2 text-lg font-semibold">Analyst Validation</h2>
        <div className="dark:bg-dark-700 mb-4 rounded-lg bg-gray-50 p-3 text-sm">
          <p className="dark:text-dark-200 font-medium text-gray-800">{result.qcSampleName} — {result.parameterName}</p>
          <p className="dark:text-dark-400 text-gray-500">Value: {result.value} · Z-score: {result.zScore.toFixed(3)} · Westgard: {result.status}{result.westgardFlags ? ` (${result.westgardFlags})` : ""}</p>
        </div>
        <textarea value={note} onChange={e => setNote(e.target.value)}
          className="dark:bg-dark-900 dark:text-dark-100 dark:border-dark-600 mb-4 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
          rows={2} placeholder="Note (optional)" />
        <div className="flex gap-3">
          <button onClick={onClose} className="dark:text-dark-300 flex-1 rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 dark:border-dark-600 hover:bg-gray-50 dark:hover:bg-dark-700">Cancel</button>
          <button onClick={() => handle(true)} disabled={loading} className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60">Reject</button>
          <button onClick={() => handle(false)} disabled={loading} className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60">Validate</button>
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function QCResultsPage() {
  const { user: me } = useAuth();
  const canValidate = me?.role === "Admin" || me?.role === "Supervisor" || me?.role === "Analyst";

  const [results,     setResults]     = useState<QCResultSummaryDto[]>([]);
  const [total,       setTotal]       = useState(0);
  const [page,        setPage]        = useState(1);
  const [loading,     setLoading]     = useState(true);
  const [showEntry,   setShowEntry]   = useState(false);
  const [editing,     setEditing]     = useState<QCResultSummaryDto | null>(null);
  const [deleting,    setDeleting]    = useState<QCResultSummaryDto | null>(null);
  const [validating,  setValidating]  = useState<QCResultSummaryDto | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  // LJ Chart panel (driven by clicking row in table)
  const [ljSampleId,  setLjSampleId]   = useState("");
  const [ljParamId,   setLjParamId]    = useState("");
  const [ljData,      setLjData]       = useState<LeveyJenningsDto | null>(null);
  const [ljRules,     setLjRules]      = useState<WestgardRules | null>(null);
  const [ljSample,    setLjSample]     = useState<import("@/services/qcSampleService").QCSampleDto | null>(null);
  const [ljLoading,   setLjLoading]    = useState(false);

  // Filter state
  const [instruments,  setInstruments]  = useState<InstrumentSummaryDto[]>([]);
  const [allSamples,   setAllSamples]   = useState<QCSampleSummaryDto[]>([]);
  const [filtSamples,  setFiltSamples]  = useState<QCSampleSummaryDto[]>([]);
  const [parameters,   setParameters]   = useState<{ id: string; label: string }[]>([]);

  const [fInstrument, setFInstrument]  = useState("");
  const [fSample,     setFSample]      = useState("");
  const [fParam,      setFParam]       = useState("");
  const [fDateFrom,   setFDateFrom]    = useState("");
  const [fDateTo,     setFDateTo]      = useState("");
  const [fValStatus,  setFValStatus]   = useState<ValidationStatus | "">("");
  const [fDeleted,    setFDeleted]     = useState(false);

  const pageSize = 20;

  // Load instruments + samples once
  useEffect(() => {
    instrumentService.getInstruments({ pageSize: 100 }).then(r => setInstruments(r.data.data.items));
    qcSampleService.getAll({ pageSize: 200 }).then(r => {
      setAllSamples(r.data.data.items);
      setFiltSamples(r.data.data.items);
    });
  }, []);

  // Filter samples by instrument
  useEffect(() => {
    if (fInstrument) {
      const filtered = allSamples.filter(s => {
        const instr = instruments.find(i => i.id === fInstrument);
        return instr && s.instrumentName === instr.name;
      });
      setFiltSamples(filtered);
    } else {
      setFiltSamples(allSamples);
    }
    setFSample("");
    setFParam("");
    setParameters([]);
  }, [fInstrument, allSamples, instruments]);

  // Load parameters when sample changes
  useEffect(() => {
    if (fSample) {
      qcResultService.getTargets(fSample).then(r =>
        setParameters(r.data.data.map(t => ({ id: t.testFileParameterId, label: t.parameterName }))));
    } else {
      setParameters([]);
    }
    setFParam("");
  }, [fSample]);

  const clearFilters = () => {
    setFInstrument(""); setFSample(""); setFParam("");
    setFDateFrom(""); setFDateTo(""); setFValStatus(""); setFDeleted(false);
    setPage(1);
  };

  const hasActiveFilters = fInstrument || fSample || fParam || fDateFrom || fDateTo || fValStatus || fDeleted;

  const loadChart = async (sampleId: string, paramId: string) => {
    setLjSampleId(sampleId);
    setLjParamId(paramId);
    setLjLoading(true);
    setLjData(null);
    try {
      const [ljRes, sampleRes] = await Promise.all([
        qcResultService.getLeveyJennings({ qcSampleId: sampleId, testFileParameterId: paramId }),
        qcSampleService.getById(sampleId),
      ]);
      setLjData(ljRes.data.data);
      setLjRules(sampleRes.data.data.westgardRules);
      setLjSample(sampleRes.data.data);
    } finally { setLjLoading(false); }
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await qcResultService.getAll({
        instrumentId:        fInstrument  || undefined,
        qcSampleId:          fSample      || undefined,
        testFileParameterId: fParam       || undefined,
        dateFrom:            fDateFrom    || undefined,
        dateTo:              fDateTo      || undefined,
        validationStatus:    fValStatus   || undefined,
        includeDeleted:      fDeleted     || undefined,
        page, pageSize,
      });
      setResults(res.data.data.items); setTotal(res.data.data.totalCount);
    } finally { setLoading(false); }
  }, [fInstrument, fSample, fParam, fDateFrom, fDateTo, fValStatus, fDeleted, page]);

  useEffect(() => { load(); }, [load]);

  const handleEntry = async (data: any) => {
    const res = await qcResultService.create(data);
    load();
    return res.data.message ?? "Result saved.";
  };

  const handleEdit = async (data: any) => {
    await qcResultService.update(editing!.id, data);
    load();
  };

  const handleDelete = async (reason: string) => {
    await qcResultService.delete(deleting!.id, reason);
    load();
  };

  const handleRestore = async (r: QCResultSummaryDto) => {
    try {
      await qcResultService.restore(r.id);
      toast.success("Result restored.");
      load();
    } catch (err) { toast.error(getErrorMessage(err)); }
  };

  const handleValidate = async (reject: boolean, note?: string) => {
    await qcResultService.validate(validating!.id, { reject, note });
    load();
  };

  const [cancelling, setCancelling] = useState<QCResultSummaryDto | null>(null);
  const handleCancelValidation = async (reason: string) => {
    try {
      await qcResultService.cancelValidation(cancelling!.id, reason);
      toast.success("Validation cancelled.");
      setCancelling(null);
      load();
    } catch (err) { toast.error(getErrorMessage(err)); }
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    // -m-6 offsets main's p-6, h-[calc(100vh-4rem)] fills exactly topbar-subtracted viewport
    <div className="-m-6 flex h-[calc(100vh-4rem)] flex-col overflow-hidden">

      {/* ── Scrollable top (toolbar + filters + table) ────────────────── */}
      <div className="min-h-0 flex-1 overflow-y-auto p-6">
      <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button onClick={() => setShowFilters(v => !v)}
            className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${showFilters || hasActiveFilters ? "border-primary-400 bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-400 dark:border-primary-600" : "border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-dark-600 dark:text-dark-300 dark:hover:bg-dark-700"}`}>
            <FunnelIcon className="size-4" />
            Filters
            {hasActiveFilters && <span className="ml-1 rounded-full bg-primary-600 px-1.5 py-0.5 text-xs text-white">ON</span>}
          </button>
          {hasActiveFilters && (
            <button onClick={clearFilters} className="text-xs text-gray-400 hover:text-gray-600 dark:text-dark-400 dark:hover:text-dark-200">
              Clear all
            </button>
          )}
        </div>
        <div className="flex gap-2">
          {/* no toolbar LJ button needed — use per-row icon */}
          <button onClick={load} className="dark:text-dark-300 dark:hover:bg-dark-700 rounded-lg p-2 text-gray-500 hover:bg-gray-100"><ArrowPathIcon className="size-4" /></button>
          <button onClick={() => setShowEntry(true)} className="bg-primary-600 hover:bg-primary-700 flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white"><PlusIcon className="size-4" />Enter Result</button>
        </div>
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div className="dark:bg-dark-800 dark:border-dark-600 rounded-xl border border-gray-200 bg-white p-4 shadow-xs">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {/* Instrument */}
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-dark-400">Instrument</label>
              <select value={fInstrument} onChange={e => { setFInstrument(e.target.value); setPage(1); }}
                className="dark:bg-dark-900 dark:text-dark-100 dark:border-dark-600 w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50">
                <option value="">All</option>
                {instruments.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
              </select>
            </div>
            {/* QC Sample */}
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-dark-400">QC Sample</label>
              <select value={fSample} onChange={e => { setFSample(e.target.value); setPage(1); }}
                className="dark:bg-dark-900 dark:text-dark-100 dark:border-dark-600 w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50">
                <option value="">All</option>
                {filtSamples.map(s => <option key={s.id} value={s.id}>{s.lotNumber} – {s.level}</option>)}
              </select>
            </div>
            {/* Parameter */}
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-dark-400">Parameter</label>
              <select value={fParam} onChange={e => { setFParam(e.target.value); setPage(1); }}
                disabled={!fSample}
                className="dark:bg-dark-900 dark:text-dark-100 dark:border-dark-600 w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50 disabled:opacity-50">
                <option value="">{fSample ? "All" : "Select sample first"}</option>
                {parameters.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
              </select>
            </div>
            {/* Date From */}
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-dark-400">Date From</label>
              <input type="date" value={fDateFrom} onChange={e => { setFDateFrom(e.target.value); setPage(1); }}
                className="dark:bg-dark-900 dark:text-dark-100 dark:border-dark-600 w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50" />
            </div>
            {/* Date To */}
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-dark-400">Date To</label>
              <input type="date" value={fDateTo} onChange={e => { setFDateTo(e.target.value); setPage(1); }}
                className="dark:bg-dark-900 dark:text-dark-100 dark:border-dark-600 w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50" />
            </div>
            {/* Validation status */}
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-dark-400">Status</label>
              <select value={fValStatus} onChange={e => { setFValStatus(e.target.value as any); setPage(1); }}
                className="dark:bg-dark-900 dark:text-dark-100 dark:border-dark-600 w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50">
                <option value="">All</option>
                <option value="Pending">Pending</option>
                <option value="Validated">Validated</option>
                <option value="Rejected">Rejected</option>
              </select>
            </div>
          </div>
          {/* Show deleted toggle */}
          <div className="mt-3 flex items-center gap-2">
            <button onClick={() => { setFDeleted(v => !v); setPage(1); }}
              className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium ${fDeleted ? "border-red-300 bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400 dark:border-red-700" : "border-gray-200 text-gray-500 hover:bg-gray-50 dark:border-dark-600 dark:text-dark-400 dark:hover:bg-dark-700"}`}>
              {fDeleted ? <EyeIcon className="size-3.5" /> : <EyeSlashIcon className="size-3.5" />}
              {fDeleted ? "Showing deleted" : "Show deleted"}
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="dark:bg-dark-800 dark:border-dark-600 border-gray-150 overflow-x-auto rounded-xl border bg-white shadow-xs">
        <table className="w-full text-sm">
          <thead>
            <tr className="dark:bg-dark-700 dark:text-dark-300 border-gray-150 dark:border-dark-600 border-b bg-gray-50 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
              <th className="px-4 py-3">Sample / Parameter</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Value</th>
              <th className="px-4 py-3">Westgard</th>
              <th className="px-4 py-3">Validation</th>
              <th className="px-4 py-3">Authorisation</th>
              {canValidate && <th className="px-4 py-3 text-right">Action</th>}
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
              <tr key={r.id} className={`dark:hover:bg-dark-700/50 hover:bg-gray-50 transition-colors ${r.isDeleted ? "opacity-50 bg-red-50/40 dark:bg-red-900/10" : r.status === "Rejected" ? "bg-red-50/30 dark:bg-red-900/5" : r.status === "Warning" ? "bg-amber-50/30 dark:bg-amber-900/5" : ""}`}>
                <td className="px-4 py-3">
                  <div className="flex items-start gap-2">
                    <div>
                      <p className="text-sm font-medium text-gray-800 dark:text-dark-100">{r.parameterName}{r.unit ? ` (${r.unit})` : ""}</p>
                      <p className="text-xs text-gray-400 dark:text-dark-400">{r.qcSampleName} · {r.level}</p>
                    </div>
                    <button
                      title="View LJ Chart"
                      onClick={() => { setLjSampleId(r.qcSampleId); loadChart(r.qcSampleId, r.testFileParameterId); }}
                      className={`ml-auto shrink-0 rounded p-1 transition-colors
                        ${ljParamId === r.testFileParameterId && ljSampleId === r.qcSampleId
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                          : "text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-900/20"}`}>
                      <ChartBarIcon className="size-3.5" />
                    </button>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <p className="text-xs text-gray-500 dark:text-dark-400">{dayjs(r.resultDate).format("DD MMM YYYY HH:mm")}</p>
                  {r.enteredByName
                    ? <p className="text-xs text-gray-400 dark:text-dark-500">{r.enteredByName}</p>
                    : <span className="inline-block rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium text-blue-600 dark:bg-blue-900/20 dark:text-blue-400">Auto Import</span>
                  }
                </td>
                <td className="px-4 py-3">
                  <span className="font-mono text-sm font-medium text-gray-800 dark:text-dark-100">{r.value}</span>
                  {r.zScore !== 0 && <span className="ml-2"><ZScoreBadge z={r.zScore} /></span>}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={r.status} />
                  {r.westgardFlags && <span className="ml-1 rounded bg-red-100 px-1 py-0.5 font-mono text-[10px] text-red-700 dark:bg-red-900/20 dark:text-red-400">{r.westgardFlags}</span>}
                </td>
                <td className="px-4 py-3"><ValidationBadge status={r.validationStatus} by={r.validatedByName} /></td>
                <td className="px-4 py-3"><AuthBadge status={r.authorisationStatus} /></td>
                {canValidate && (
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {r.isDeleted ? (
                        <button onClick={() => handleRestore(r)}
                          className="rounded-lg px-2 py-1 text-xs font-medium text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-900/20">Restore</button>
                      ) : (
                        <>
                          {r.validationStatus === "Pending" && (
                            <>
                              <button onClick={() => setEditing(r)}
                                className="rounded-lg px-2 py-1 text-xs font-medium text-gray-500 hover:bg-gray-100 dark:text-dark-300 dark:hover:bg-dark-600">Edit</button>
                              <button onClick={() => setValidating(r)}
                                className="rounded-lg px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20">Validate</button>
                            </>
                          )}
                          {r.validationStatus !== "Pending" && r.authorisationStatus !== "Authorised" && (
                            <button onClick={() => setCancelling(r)}
                              className="rounded-lg px-2 py-1 text-xs font-medium text-gray-500 hover:bg-gray-100 dark:text-dark-300 dark:hover:bg-dark-600">Cancel</button>
                          )}
                          {r.authorisationStatus === "Authorised" ? (
                            <span className="text-xs text-gray-300 dark:text-dark-500">Locked</span>
                          ) : (
                            <button onClick={() => setDeleting(r)}
                              className="rounded-lg px-2 py-1 text-xs font-medium text-red-500 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20">Delete</button>
                          )}
                        </>
                      )}
                    </div>
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

      {showEntry  && <EntryModal onSave={handleEntry} defaultSampleId={fSample || undefined} onClose={() => { setShowEntry(false); load(); }} />}
      {editing    && <EditModal result={editing} onSave={handleEdit} onClose={() => setEditing(null)} />}
      {deleting   && <DeleteResultModal result={deleting} onConfirm={handleDelete} onClose={() => setDeleting(null)} />}
      {cancelling && <CancelValidationModal result={cancelling} onConfirm={handleCancelValidation} onClose={() => setCancelling(null)} />}
      {validating && <ValidateModal result={validating} onValidate={handleValidate} onClose={() => setValidating(null)} />}

      </div>
      </div>

      {/* ── LJ Panel — FIXED di bawah, tidak ikut scroll ─────────────── */}
      <div className="dark:bg-dark-800 dark:border-dark-600 flex h-[330px] shrink-0 flex-col overflow-hidden border-t border-gray-200 bg-white shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
        {!ljParamId ? (
          /* Placeholder */
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
            <ChartBarIcon className="size-8 text-gray-200 dark:text-dark-600" />
            <p className="text-sm text-gray-400 dark:text-dark-500">
              Klik icon <ChartBarIcon className="inline size-3.5 text-emerald-500" /> pada baris hasil di atas untuk menampilkan Levey-Jennings Chart
            </p>
          </div>
        ) : ljLoading ? (
          <div className="flex h-full items-center justify-center">
            <div className="border-primary-500 size-7 animate-spin rounded-full border-4 border-t-transparent" />
          </div>
        ) : ljData && (
          <>
            {/* Chart title bar */}
            <div className="dark:border-dark-600 shrink-0 border-b border-gray-100 px-5 py-2 text-center">
              <span className="dark:text-dark-100 text-sm font-semibold text-gray-700">
                {ljData.parameterName}{ljData.unit ? ` (${ljData.unit})` : ""} — {ljData.level}
              </span>
            </div>

            {/* Split: info kiri + chart kanan — fills remaining height */}
            <div className="flex min-h-0 flex-1 overflow-hidden">
              {/* ── Kiri: info panel ────────────────────────────────────── */}
              <div className="dark:border-dark-600 dark:text-dark-300 w-44 shrink-0 overflow-y-auto border-r border-gray-100 p-3 text-xs text-gray-600">
                <div className="space-y-1">
                  <div><span className="text-gray-400">Lot No</span><span className="float-right font-medium">{ljSample?.lotNumber ?? "—"}</span></div>
                  <div><span className="text-gray-400">Exp Date</span><span className="float-right font-medium">{ljSample ? dayjs(ljSample.expiryDate).format("DD-MM-YYYY") : "—"}</span></div>
                  <div><span className="text-gray-400">N Result</span><span className="float-right font-medium">{ljData.displayCount}</span></div>
                </div>

                <div className="mt-3">
                  <div className="mb-1 grid grid-cols-3 gap-1 text-[10px] text-gray-400">
                    <span></span><span className="text-center">Quoted</span><span className="text-center">Calc</span>
                  </div>
                  {[
                    { label: "Mean", q: ljData.mean.toFixed(2),          c: ljData.calculatedMean.toFixed(2) },
                    { label: "SD",   q: ljData.sd.toFixed(2),            c: ljData.calculatedSD.toFixed(2) },
                    { label: "CV",   q: `${ljData.cv.toFixed(2)}%`,      c: `${ljData.calculatedCV.toFixed(2)}%` },
                  ].map(r => (
                    <div key={r.label} className="grid grid-cols-3 gap-1 border-b border-gray-50 py-0.5 dark:border-dark-700">
                      <span className="text-gray-400">{r.label}</span>
                      <span className="text-center font-medium text-blue-600 dark:text-blue-400">{r.q}</span>
                      <span className="text-center font-medium text-gray-700 dark:text-dark-200">{r.c}</span>
                    </div>
                  ))}
                </div>

                {/* Status counts */}
                <div className="mt-3 space-y-0.5">
                  <div className="flex justify-between"><span className="text-gray-400">Accepted</span><span className="font-medium text-emerald-600">{ljData.acceptedCount}</span></div>
                  <div className="flex justify-between"><span className="text-gray-400">Warning</span><span className="font-medium text-amber-500">{ljData.warningCount}</span></div>
                  <div className="flex justify-between"><span className="text-gray-400">Rejected</span><span className="font-medium text-red-600">{ljData.rejectedCount}</span></div>
                </div>

                {/* Active rules */}
                {ljRules && (
                  <div className="mt-3">
                    <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-gray-400">Rules Aktif</p>
                    <div className="space-y-0.5">
                      {([
                        { key: "rule1_2s" as const,  label: "Warning: outside 2SD",   w: true  },
                        { key: "rule1_3s" as const,  label: "Rejection: outside 3SD", w: false },
                        { key: "rule2_2s" as const,  label: "2x outside 2SD",         w: false },
                        { key: "ruleR_4s" as const,  label: "2x different > 4SD",     w: false },
                        { key: "rule3_1s" as const,  label: "3x outside 1SD",         w: true  },
                        { key: "rule4_1s" as const,  label: "4x outside 1SD",         w: false },
                        { key: "rule9x"   as const,  label: "9x same side of mean",   w: false },
                        { key: "rule10x"  as const,  label: "10x same side of mean",  w: false },
                      ] as const).filter(r => ljRules[r.key]).map(r => (
                        <p key={r.key} className={r.w ? "text-amber-600 dark:text-amber-400" : "text-gray-600 dark:text-dark-300"}>
                          — {r.label}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* ── Kanan: Z-score chart ─────────────────────────────── */}
              <div className="min-w-0 flex-1 overflow-hidden px-2 py-1">
                {!ljData.hasTarget ? (
                  <div className="flex h-full flex-col items-center justify-center text-center">
                    <ExclamationTriangleIcon className="mb-2 size-8 text-amber-400" />
                    <p className="text-sm text-gray-500 dark:text-dark-400">Belum ada target (Mean/SD)</p>
                  </div>
                ) : ljData.points.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center">
                    <p className="text-sm text-gray-400 dark:text-dark-500">Belum ada data QC</p>
                  </div>
                ) : (
                  <LeveyJenningsChart
                    data={ljData}
                    westgardRules={ljRules ?? undefined}
                    maxPoints={20}
                    showViolations={false}
                    fillHeight={true}
                  />
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
