import { useCallback, useEffect, useState } from "react";
import {
  PlusIcon, MagnifyingGlassIcon, PencilSquareIcon,
  TrashIcon, ArrowPathIcon, ClipboardDocumentListIcon,
  ExclamationTriangleIcon, AdjustmentsHorizontalIcon,
} from "@heroicons/react/24/outline";
import { toast } from "sonner";
import dayjs from "dayjs";
import qcSampleService, { type QCSampleSummaryDto, type QCSampleDto } from "@/services/qcSampleService";
import instrumentService, { type InstrumentSummaryDto } from "@/services/instrumentService";
import QCSampleFormModal from "./QCSampleFormModal";
import QCSampleTargetsModal from "./QCSampleTargetsModal";
import DeleteModal from "@/pages/users/DeleteModal";
import { useAuth } from "@/contexts/auth/context";
import { getErrorMessage } from "@/utils/apiError";

const LEVEL_COLORS: Record<string, string> = {
  "Level 1": "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  "Level 2": "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  "Level 3": "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400",
};

function ExpiryBadge({ item }: { item: QCSampleSummaryDto }) {
  const date = dayjs(item.expiryDate).format("DD MMM YYYY");
  if (item.isExpired)
    return <span className="flex items-center gap-1 text-xs font-medium text-red-600"><ExclamationTriangleIcon className="size-3.5" /> Expired · {date}</span>;
  if (item.expiresSoon)
    return <span className="flex items-center gap-1 text-xs font-medium text-amber-600"><ExclamationTriangleIcon className="size-3.5" /> Expires soon · {date}</span>;
  return <span className="text-xs text-gray-500 dark:text-dark-400">{date}</span>;
}

export default function QCSamplesPage() {
  const { user: me } = useAuth();
  const canManage = me?.role === "Admin" || me?.role === "Supervisor";

  const [items,       setItems]       = useState<QCSampleSummaryDto[]>([]);
  const [instruments, setInstruments] = useState<InstrumentSummaryDto[]>([]);
  const [total,       setTotal]       = useState(0);
  const [page,        setPage]        = useState(1);
  const [search,      setSearch]      = useState("");
  const [filterInstr,    setFilterInstr]    = useState("");
  const [filterIsActive, setFilterIsActive] = useState<"" | "true" | "false">("");
  const [loading,     setLoading]     = useState(true);

  const [modal,         setModal]         = useState<"create" | "edit" | "delete" | null>(null);
  const [target,        setTarget]        = useState<QCSampleSummaryDto | null>(null);
  const [detail,        setDetail]        = useState<QCSampleDto | null>(null);
  const [targetsSample, setTargetsSample] = useState<QCSampleSummaryDto | null>(null);

  const pageSize = 10;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await qcSampleService.getAll({
        search: search || undefined,
        instrumentId: filterInstr || undefined,
        isActive: filterIsActive === "" ? undefined : filterIsActive === "true",
        page, pageSize,
      });
      setItems(res.data.data.items);
      setTotal(res.data.data.totalCount);
    } finally { setLoading(false); }
  }, [search, filterInstr, filterIsActive, page]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    instrumentService.getInstruments({ pageSize: 100 })
      .then(res => setInstruments(res.data.data.items));
  }, []);

  const openEdit = async (item: QCSampleSummaryDto) => {
    const res = await qcSampleService.getById(item.id);
    setDetail(res.data.data); setTarget(item); setModal("edit");
  };

  const handleCreate = async (data: any) => { await qcSampleService.create(data); load(); };
  const handleEdit   = async (data: any) => { await qcSampleService.update(target!.id, data); load(); };
  const handleDelete = async () => {
    try {
      await qcSampleService.delete(target!.id);
      setModal(null);
      toast.success("QC Sample deleted.");
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
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search name, lot, level…"
              className="dark:bg-dark-800 dark:text-dark-100 dark:border-dark-600 w-60 rounded-lg border border-gray-200 py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50" />
          </div>
          <select value={filterInstr} onChange={e => { setFilterInstr(e.target.value); setPage(1); }}
            className="dark:bg-dark-800 dark:text-dark-100 dark:border-dark-600 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50">
            <option value="">All Instruments</option>
            {instruments.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
          </select>
          <select value={filterIsActive} onChange={e => { setFilterIsActive(e.target.value as any); setPage(1); }}
            className="dark:bg-dark-800 dark:text-dark-100 dark:border-dark-600 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50">
            <option value="">All Status</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="dark:text-dark-300 dark:hover:bg-dark-700 rounded-lg p-2 text-gray-500 hover:bg-gray-100">
            <ArrowPathIcon className="size-4" />
          </button>
          {canManage && (
            <button onClick={() => setModal("create")}
              className="bg-primary-600 hover:bg-primary-700 flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white">
              <PlusIcon className="size-4" /> Add QC Sample
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="dark:bg-dark-800 dark:border-dark-600 border-gray-150 overflow-hidden rounded-xl border bg-white shadow-xs">
        <table className="w-full text-sm">
          <thead>
            <tr className="dark:bg-dark-700 dark:text-dark-300 border-gray-150 dark:border-dark-600 border-b bg-gray-50 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
              <th className="px-4 py-3">Sample Name</th>
              <th className="px-4 py-3">Lot Number</th>
              <th className="px-4 py-3">Level</th>
              <th className="px-4 py-3">Instrument</th>
              <th className="px-4 py-3">Expiry Date</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-dark-600">
            {loading ? (
              <tr><td colSpan={7} className="dark:text-dark-400 py-12 text-center text-gray-400">Loading…</td></tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-16 text-center">
                  <ClipboardDocumentListIcon className="mx-auto mb-3 size-10 text-gray-300 dark:text-dark-500" />
                  <p className="dark:text-dark-400 text-sm text-gray-400">No QC samples found.</p>
                </td>
              </tr>
            ) : items.map(item => (
              <tr key={item.id} className={`dark:hover:bg-dark-700/50 hover:bg-gray-50 transition-colors ${item.isExpired ? "opacity-60" : ""}`}>
                <td className="dark:text-dark-100 px-4 py-3 font-medium text-gray-800">
                  <div className="flex items-center gap-3">
                    <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400">
                      <ClipboardDocumentListIcon className="size-4" />
                    </div>
                    {item.name}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className="rounded-md bg-gray-100 px-2 py-0.5 font-mono text-xs text-gray-600 dark:bg-dark-600 dark:text-dark-300">
                    {item.lotNumber}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${LEVEL_COLORS[item.level] ?? "bg-gray-100 text-gray-600"}`}>
                    {item.level}
                  </span>
                </td>
                <td className="dark:text-dark-300 px-4 py-3 text-gray-500">{item.instrumentName}</td>
                <td className="px-4 py-3"><ExpiryBadge item={item} /></td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    item.isActive
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400"
                      : "bg-gray-100 text-gray-500 dark:bg-dark-600 dark:text-dark-400"
                  }`}>
                    {item.isActive ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    {/* Targets button — visible to all roles */}
                    <button
                      onClick={() => setTargetsSample(item)}
                      title="Manage Targets (Mean/SD/CV)"
                      className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-900/20">
                      <AdjustmentsHorizontalIcon className="size-4" />
                      Targets
                    </button>
                    {canManage && (
                      <>
                        <button onClick={() => openEdit(item)}
                          className="dark:text-dark-300 dark:hover:bg-dark-600 rounded-lg p-1.5 text-gray-500 hover:bg-gray-100" title="Edit">
                          <PencilSquareIcon className="size-4" />
                        </button>
                        <button onClick={() => { setTarget(item); setModal("delete"); }}
                          className="dark:hover:bg-dark-600 rounded-lg p-1.5 hover:bg-gray-100" title="Delete">
                          <TrashIcon className="size-4 text-red-500" />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {totalPages > 1 && (
          <div className="dark:border-dark-600 border-gray-150 dark:text-dark-300 flex items-center justify-between border-t px-4 py-3 text-sm text-gray-500">
            <span>{total} samples total</span>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage(p => p - 1)} disabled={page === 1}
                className="rounded-lg px-3 py-1 hover:bg-gray-100 disabled:opacity-40 dark:hover:bg-dark-700">Prev</button>
              <span className="dark:text-dark-100 font-medium text-gray-700">{page} / {totalPages}</span>
              <button onClick={() => setPage(p => p + 1)} disabled={page === totalPages}
                className="rounded-lg px-3 py-1 hover:bg-gray-100 disabled:opacity-40 dark:hover:bg-dark-700">Next</button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {modal === "create" && (
        <QCSampleFormModal mode="create" instruments={instruments} onSave={handleCreate} onClose={() => setModal(null)} />
      )}
      {modal === "edit" && detail && (
        <QCSampleFormModal mode="edit" item={detail} instruments={instruments} onSave={handleEdit} onClose={() => { setModal(null); setDetail(null); }} />
      )}
      {modal === "delete" && target && (
        <DeleteModal name={target.name} onConfirm={handleDelete} onClose={() => setModal(null)} />
      )}
      {targetsSample && (
        <QCSampleTargetsModal
          qcSampleId={targetsSample.id}
          sampleName={`${targetsSample.name} — ${targetsSample.level}`}
          onClose={() => setTargetsSample(null)}
        />
      )}
    </div>
  );
}
