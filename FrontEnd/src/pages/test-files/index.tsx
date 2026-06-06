import { useCallback, useEffect, useState } from "react";
import { PlusIcon, MagnifyingGlassIcon, PencilSquareIcon, TrashIcon, ArrowPathIcon, DocumentIcon, ChevronDownIcon, ChevronUpIcon } from "@heroicons/react/24/outline";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import testFileService, {
  TEST_FILE_TYPES,
  type TestFileSummaryDto,
  type TestFileDto,
  type TestFileParameterDto,
  type ParameterPayload,
} from "@/services/testFileService";
import DeleteModal from "@/pages/users/DeleteModal";
import { useAuth } from "@/contexts/auth/context";
import { getErrorMessage } from "@/utils/apiError";

// ── Schemas ──────────────────────────────────────────────────────────────────

const fileSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  code: z.string().min(1, "Code is required").max(50),
  type: z.enum(["Numerical", "Non Numerical"] as const),
  unit: z.string().optional(),
});

const paramSchema = z.object({
  parameterName: z.string().min(1, "Name required"),
  testCode:      z.string().optional(),
  outputMask:    z.string().optional(),
  sequence:      z.preprocess(v => Number(v), z.number().int().min(0)),
  unit:          z.string().optional(),
  lowerLimit:    z.preprocess(v => v === "" ? undefined : Number(v), z.number().optional()),
  upperLimit:    z.preprocess(v => v === "" ? undefined : Number(v), z.number().optional()),
});

type FileForm  = z.infer<typeof fileSchema>;
type ParamForm = z.infer<typeof paramSchema>;

// ── Shared styles ─────────────────────────────────────────────────────────────

const inputCls = "dark:bg-dark-900 dark:text-dark-100 dark:border-dark-600 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50";
const inlineCls = "rounded border border-gray-200 px-2 py-1 text-sm dark:bg-dark-800 dark:border-dark-600 dark:text-dark-100";

// ── FileFormModal ─────────────────────────────────────────────────────────────

function FileFormModal({ item, onSave, onClose }: {
  item?: TestFileDto;
  onSave: (d: FileForm) => Promise<void>;
  onClose: () => void;
}) {
  const { register, handleSubmit, reset, setError, formState: { errors, isSubmitting } } =
    useForm<FileForm>({ resolver: zodResolver(fileSchema), defaultValues: { type: "Numerical" } });

  useEffect(() => {
    if (item) reset({ name: item.name, code: item.code, type: item.type, unit: item.unit ?? "" });
  }, [item, reset]);

  const onSubmit = async (d: FileForm) => {
    try {
      await onSave(d);
      toast.success(item ? "Test file updated." : "Test file created.");
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
        <h2 className="dark:text-dark-100 mb-4 text-lg font-semibold">
          {item ? "Edit Test File" : "Add Test File"}
        </h2>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="dark:text-dark-300 mb-1 block text-xs font-medium text-gray-600">Name *</label>
              <input {...register("name")} className={inputCls} placeholder="e.g. Sysmex XN 330" />
              {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>}
            </div>
            <div>
              <label className="dark:text-dark-300 mb-1 block text-xs font-medium text-gray-600">Code *</label>
              <input {...register("code")} className={inputCls} placeholder="e.g. XNL330" />
              {errors.code && <p className="mt-1 text-xs text-red-500">{errors.code.message}</p>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="dark:text-dark-300 mb-1 block text-xs font-medium text-gray-600">Type *</label>
              <select {...register("type")} className={inputCls}>
                {TEST_FILE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              {errors.type && <p className="mt-1 text-xs text-red-500">{errors.type.message}</p>}
            </div>
            <div>
              <label className="dark:text-dark-300 mb-1 block text-xs font-medium text-gray-600">Unit</label>
              <input {...register("unit")} className={inputCls} placeholder="e.g. mg/dL" />
            </div>
          </div>
          {errors.root && <p className="text-xs text-red-500">{errors.root.message}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose}
              className="dark:text-dark-300 rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 dark:hover:bg-dark-700">
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting}
              className="bg-primary-600 hover:bg-primary-700 rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-60">
              {isSubmitting ? "Saving…" : item ? "Save" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── ParameterRow ──────────────────────────────────────────────────────────────

function ParameterRow({ testFileId, param, onDelete }: {
  testFileId: string;
  param: TestFileParameterDto;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm<ParamForm>({
    resolver: zodResolver(paramSchema),
    defaultValues: {
      parameterName: param.parameterName,
      testCode:      param.testCode ?? "",
      outputMask:    param.outputMask ?? "",
      sequence:      param.sequence,
      unit:          param.unit ?? "",
      lowerLimit:    param.lowerLimit ?? undefined,
      upperLimit:    param.upperLimit ?? undefined,
    },
  });

  const save = async (d: ParamForm) => {
    try {
      await testFileService.updateParameter(testFileId, param.id, d as ParameterPayload);
      toast.success("Parameter updated.");
      setEditing(false);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  if (editing) return (
    <form onSubmit={handleSubmit(save)} className="grid grid-cols-12 gap-1 items-center rounded-lg bg-gray-50 px-3 py-2 dark:bg-dark-700">
      <input {...register("sequence")}      type="number" className={`col-span-1 ${inlineCls}`} placeholder="Seq" />
      <input {...register("testCode")}      className={`col-span-2 ${inlineCls}`} placeholder="Test Code" />
      <input {...register("parameterName")} className={`col-span-3 ${inlineCls}`} placeholder="Name" />
      <input {...register("outputMask")}    className={`col-span-2 ${inlineCls}`} placeholder="Output Mask" />
      <input {...register("unit")}          className={`col-span-1 ${inlineCls}`} placeholder="Unit" />
      <input {...register("lowerLimit")}    type="number" step="any" className={`col-span-1 ${inlineCls}`} placeholder="Low" />
      <input {...register("upperLimit")}    type="number" step="any" className={`col-span-1 ${inlineCls}`} placeholder="High" />
      <div className="col-span-1 flex gap-1">
        <button type="submit" disabled={isSubmitting} className="bg-primary-600 rounded px-2 py-1 text-xs text-white">Save</button>
        <button type="button" onClick={() => { setEditing(false); reset(); }} className="dark:text-dark-300 rounded px-1 py-1 text-xs text-gray-500">✕</button>
      </div>
    </form>
  );

  return (
    <div className="grid grid-cols-12 gap-1 items-center rounded-lg px-3 py-2 hover:bg-gray-50 dark:hover:bg-dark-700">
      <span className="col-span-1 text-xs text-gray-400 dark:text-dark-400 font-mono">{param.sequence}</span>
      <span className="col-span-2 text-xs text-gray-500 dark:text-dark-400 font-mono">{param.testCode ?? "—"}</span>
      <span className="col-span-3 text-sm dark:text-dark-200">{param.parameterName}</span>
      <span className="col-span-2 text-xs text-gray-400 dark:text-dark-400 font-mono">{param.outputMask ?? "—"}</span>
      <span className="col-span-1 text-xs text-gray-400 dark:text-dark-400">{param.unit ?? "—"}</span>
      <span className="col-span-1 text-xs text-gray-400 dark:text-dark-400">{param.lowerLimit ?? "—"}</span>
      <span className="col-span-1 text-xs text-gray-400 dark:text-dark-400">{param.upperLimit ?? "—"}</span>
      <div className="col-span-1 flex gap-1">
        <button onClick={() => setEditing(true)} className="rounded p-1 text-gray-400 hover:text-gray-700 dark:hover:text-dark-200">
          <PencilSquareIcon className="size-3.5" />
        </button>
        <button onClick={onDelete} className="rounded p-1 text-red-400 hover:text-red-600">
          <TrashIcon className="size-3.5" />
        </button>
      </div>
    </div>
  );
}

// ── ParameterSection ──────────────────────────────────────────────────────────

function ParameterSection({ file, onRefresh }: { file: TestFileDto; onRefresh: () => void }) {
  const [params, setParams] = useState<TestFileParameterDto[]>(file.parameters);

  const nextSequence = params.length > 0
    ? Math.max(...params.map(p => p.sequence)) + 10
    : 10;

  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm<ParamForm>({
    resolver: zodResolver(paramSchema),
    defaultValues: { sequence: nextSequence, outputMask: "999990.9" },
  });

  const addParam = async (d: ParamForm) => {
    try {
      const res = await testFileService.addParameter(file.id, d as ParameterPayload);
      setParams(p => [...p, res.data.data].sort((a, b) => a.sequence - b.sequence));
      toast.success("Parameter added.");
      reset({ sequence: nextSequence + 10, outputMask: "999990.9" });
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const deleteParam = async (paramId: string) => {
    try {
      await testFileService.deleteParameter(file.id, paramId);
      setParams(p => p.filter(x => x.id !== paramId));
      toast.success("Parameter deleted.");
      onRefresh();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <div className="mt-3 space-y-1">
      {/* Column headers */}
      <div className="grid grid-cols-12 gap-1 border-b border-gray-100 pb-1 dark:border-dark-600 text-xs font-medium text-gray-400 uppercase tracking-wide px-3">
        <span className="col-span-1">Seq</span>
        <span className="col-span-2">Test Code</span>
        <span className="col-span-3">Parameter Name</span>
        <span className="col-span-2">Output Mask</span>
        <span className="col-span-1">Unit</span>
        <span className="col-span-1">Low</span>
        <span className="col-span-1">High</span>
        <span className="col-span-1" />
      </div>

      {params.map(p => (
        <ParameterRow key={p.id} testFileId={file.id} param={p} onDelete={() => deleteParam(p.id)} />
      ))}

      {/* Add row */}
      <form onSubmit={handleSubmit(addParam)} className="grid grid-cols-12 gap-1 items-center px-3 pt-2">
        <input {...register("sequence")}      type="number" className={`col-span-1 rounded-lg border border-dashed border-gray-300 px-2 py-1 text-sm dark:bg-dark-800 dark:border-dark-500 dark:text-dark-100`} placeholder="Seq" />
        <input {...register("testCode")}      className={`col-span-2 rounded-lg border border-dashed border-gray-300 px-2 py-1 text-sm dark:bg-dark-800 dark:border-dark-500 dark:text-dark-100`} placeholder="Test Code" />
        <input {...register("parameterName")} className={`col-span-3 rounded-lg border border-dashed border-gray-300 px-2 py-1 text-sm dark:bg-dark-800 dark:border-dark-500 dark:text-dark-100`} placeholder="+ Parameter name" />
        <input {...register("outputMask")}    className={`col-span-2 rounded-lg border border-dashed border-gray-300 px-2 py-1 text-sm dark:bg-dark-800 dark:border-dark-500 dark:text-dark-100`} placeholder="999990.9" />
        <input {...register("unit")}          className={`col-span-1 rounded-lg border border-dashed border-gray-300 px-2 py-1 text-sm dark:bg-dark-800 dark:border-dark-500 dark:text-dark-100`} placeholder="Unit" />
        <input {...register("lowerLimit")}    type="number" step="any" className={`col-span-1 rounded-lg border border-dashed border-gray-300 px-2 py-1 text-sm dark:bg-dark-800 dark:border-dark-500 dark:text-dark-100`} placeholder="Low" />
        <input {...register("upperLimit")}    type="number" step="any" className={`col-span-1 rounded-lg border border-dashed border-gray-300 px-2 py-1 text-sm dark:bg-dark-800 dark:border-dark-500 dark:text-dark-100`} placeholder="High" />
        <button type="submit" disabled={isSubmitting}
          className="col-span-1 bg-primary-600 hover:bg-primary-700 flex items-center justify-center gap-1 rounded-lg px-2 py-1 text-xs text-white">
          <PlusIcon className="size-3" />Add
        </button>
      </form>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function TestFilesPage() {
  const { user: me } = useAuth();
  const isAdmin = me?.role === "Admin";

  const [items,    setItems]    = useState<TestFileSummaryDto[]>([]);
  const [total,    setTotal]    = useState(0);
  const [page,     setPage]     = useState(1);
  const [search,   setSearch]   = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | "true" | "false">("");
  const [loading,  setLoading]  = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [expandedData, setExpandedData] = useState<Record<string, TestFileDto>>({});

  const [modal,  setModal]  = useState<"create" | "edit" | "delete" | null>(null);
  const [target, setTarget] = useState<TestFileSummaryDto | null>(null);
  const [detail, setDetail] = useState<TestFileDto | null>(null);

  const pageSize = 10;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const isActive = statusFilter === "" ? undefined : statusFilter === "true";
      const res = await testFileService.getAll({ search: search || undefined, isActive, page, pageSize });
      setItems(res.data.data.items);
      setTotal(res.data.data.totalCount);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, page]);

  useEffect(() => { load(); }, [load]);

  const toggleExpand = async (id: string) => {
    if (expanded === id) { setExpanded(null); return; }
    if (!expandedData[id]) {
      const res = await testFileService.getById(id);
      setExpandedData(d => ({ ...d, [id]: res.data.data }));
    }
    setExpanded(id);
  };

  const openEdit = async (item: TestFileSummaryDto) => {
    const res = await testFileService.getById(item.id);
    setDetail(res.data.data);
    setTarget(item);
    setModal("edit");
  };

  const handleCreate = async (d: any) => { await testFileService.create(d); load(); };
  const handleEdit   = async (d: any) => { await testFileService.update(target!.id, d); load(); };
  const handleDelete = async () => {
    try {
      await testFileService.delete(target!.id);
      setModal(null);
      toast.success("Test file deleted.");
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search by name or code…"
              className="dark:bg-dark-800 dark:text-dark-100 dark:border-dark-600 w-56 rounded-lg border border-gray-200 py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50" />
          </div>
          <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value as any); setPage(1); }}
            className="dark:bg-dark-800 dark:text-dark-100 dark:border-dark-600 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50">
            <option value="">All Status</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="dark:text-dark-300 dark:hover:bg-dark-700 rounded-lg p-2 text-gray-500 hover:bg-gray-100">
            <ArrowPathIcon className="size-4" />
          </button>
          {isAdmin && (
            <button onClick={() => setModal("create")}
              className="bg-primary-600 hover:bg-primary-700 flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white">
              <PlusIcon className="size-4" />Add Test File
            </button>
          )}
        </div>
      </div>

      {/* List */}
      <div className="dark:bg-dark-800 dark:border-dark-600 border-gray-150 overflow-hidden rounded-xl border bg-white shadow-xs">
        {loading ? (
          <div className="py-12 text-center text-sm text-gray-400 dark:text-dark-400">Loading…</div>
        ) : items.length === 0 ? (
          <div className="py-16 text-center">
            <DocumentIcon className="mx-auto mb-3 size-10 text-gray-300 dark:text-dark-500" />
            <p className="text-sm text-gray-400 dark:text-dark-400">No test files found.</p>
          </div>
        ) : items.map(item => (
          <div key={item.id} className="border-b border-gray-100 dark:border-dark-600 last:border-0">
            <div className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-dark-700/50">
              <button onClick={() => toggleExpand(item.id)} className="text-gray-400 dark:text-dark-400">
                {expanded === item.id ? <ChevronUpIcon className="size-4" /> : <ChevronDownIcon className="size-4" />}
              </button>
              <div className="flex size-8 items-center justify-center rounded-lg bg-violet-50 text-violet-600 dark:bg-violet-900/20 dark:text-violet-400">
                <DocumentIcon className="size-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 dark:text-dark-100">{item.name}</p>
                <p className="text-xs text-gray-400 dark:text-dark-400">
                  {item.code} · {item.type} · {item.parameterCount} parameters
                </p>
              </div>
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                item.isActive
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400"
                  : "bg-gray-100 text-gray-500 dark:bg-dark-600 dark:text-dark-400"
              }`}>
                {item.isActive ? "Active" : "Inactive"}
              </span>
              {isAdmin && (
                <div className="flex gap-1">
                  <button onClick={() => openEdit(item)}
                    className="dark:text-dark-300 rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-dark-600">
                    <PencilSquareIcon className="size-4" />
                  </button>
                  <button onClick={() => { setTarget(item); setModal("delete"); }}
                    className="rounded-lg p-1.5 hover:bg-gray-100 dark:hover:bg-dark-600">
                    <TrashIcon className="size-4 text-red-500" />
                  </button>
                </div>
              )}
            </div>
            {expanded === item.id && expandedData[item.id] && (
              <div className="border-t border-gray-100 bg-gray-50/50 pb-3 dark:border-dark-600 dark:bg-dark-900/30">
                <ParameterSection file={expandedData[item.id]} onRefresh={load} />
              </div>
            )}
          </div>
        ))}

        {totalPages > 1 && (
          <div className="dark:border-dark-600 border-gray-150 dark:text-dark-300 flex items-center justify-between border-t px-4 py-3 text-sm text-gray-500">
            <span>{total} test files total</span>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => p - 1)} disabled={page === 1}
                className="rounded-lg px-3 py-1 hover:bg-gray-100 disabled:opacity-40 dark:hover:bg-dark-700">Prev</button>
              <span className="font-medium text-gray-700 dark:text-dark-100">{page} / {totalPages}</span>
              <button onClick={() => setPage(p => p + 1)} disabled={page === totalPages}
                className="rounded-lg px-3 py-1 hover:bg-gray-100 disabled:opacity-40 dark:hover:bg-dark-700">Next</button>
            </div>
          </div>
        )}
      </div>

      {modal === "create" && <FileFormModal onSave={handleCreate} onClose={() => setModal(null)} />}
      {modal === "edit" && detail && <FileFormModal item={detail} onSave={handleEdit} onClose={() => { setModal(null); setDetail(null); }} />}
      {modal === "delete" && target && <DeleteModal name={target.name} onConfirm={handleDelete} onClose={() => setModal(null)} />}
    </div>
  );
}
