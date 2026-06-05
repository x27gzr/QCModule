import { useCallback, useEffect, useState } from "react";
import {
  PlusIcon, MagnifyingGlassIcon, PencilSquareIcon,
  TrashIcon, ArrowPathIcon, CheckCircleIcon, XCircleIcon,
  BeakerIcon,
} from "@heroicons/react/24/outline";
import instrumentService, { type InstrumentSummaryDto, type InstrumentDto } from "@/services/instrumentService";
import InstrumentFormModal from "./InstrumentFormModal";
import DeleteModal from "@/pages/users/DeleteModal";
import { useAuth } from "@/contexts/auth/context";

export default function InstrumentsPage() {
  const { user: me } = useAuth();
  const isAdmin = me?.role === "Admin";

  const [items,   setItems]   = useState<InstrumentSummaryDto[]>([]);
  const [total,   setTotal]   = useState(0);
  const [page,    setPage]    = useState(1);
  const [search,  setSearch]  = useState("");
  const [loading, setLoading] = useState(true);

  const [modal,  setModal]  = useState<"create" | "edit" | "delete" | null>(null);
  const [target, setTarget] = useState<InstrumentSummaryDto | null>(null);
  const [detail, setDetail] = useState<InstrumentDto | null>(null);

  const pageSize = 10;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await instrumentService.getInstruments({ search: search || undefined, page, pageSize });
      setItems(res.data.data.items);
      setTotal(res.data.data.totalCount);
    } finally {
      setLoading(false);
    }
  }, [search, page]);

  useEffect(() => { load(); }, [load]);

  const openEdit = async (item: InstrumentSummaryDto) => {
    const res = await instrumentService.getById(item.id);
    setDetail(res.data.data);
    setTarget(item);
    setModal("edit");
  };

  const handleCreate = async (data: any) => {
    await instrumentService.create(data);
    load();
  };

  const handleEdit = async (data: any) => {
    await instrumentService.update(target!.id, data);
    load();
  };

  const handleDelete = async () => {
    await instrumentService.delete(target!.id);
    setModal(null);
    load();
  };

  const handleToggle = async (item: InstrumentSummaryDto) => {
    await instrumentService.toggleActive(item.id);
    load();
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search name, code, manufacturer…"
            className="dark:bg-dark-800 dark:text-dark-100 dark:border-dark-600 w-72 rounded-lg border border-gray-200 py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50"
          />
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load}
            className="dark:text-dark-300 dark:hover:bg-dark-700 rounded-lg p-2 text-gray-500 hover:bg-gray-100">
            <ArrowPathIcon className="size-4" />
          </button>
          {isAdmin && (
            <button onClick={() => setModal("create")}
              className="bg-primary-600 hover:bg-primary-700 flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white">
              <PlusIcon className="size-4" />
              Add Instrument
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="dark:bg-dark-800 dark:border-dark-600 border-gray-150 overflow-hidden rounded-xl border bg-white shadow-xs">
        <table className="w-full text-sm">
          <thead>
            <tr className="dark:bg-dark-700 dark:text-dark-300 border-gray-150 dark:border-dark-600 border-b bg-gray-50 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
              <th className="px-4 py-3">Instrument</th>
              <th className="px-4 py-3">Code</th>
              <th className="px-4 py-3">Manufacturer</th>
              <th className="px-4 py-3">Status</th>
              {isAdmin && <th className="px-4 py-3 text-right">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-dark-600">
            {loading ? (
              <tr><td colSpan={5} className="dark:text-dark-400 py-12 text-center text-gray-400">Loading…</td></tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-16 text-center">
                  <BeakerIcon className="mx-auto mb-3 size-10 text-gray-300 dark:text-dark-500" />
                  <p className="dark:text-dark-400 text-sm text-gray-400">No instruments found.</p>
                  {isAdmin && (
                    <button onClick={() => setModal("create")}
                      className="text-primary-600 dark:text-primary-400 mt-2 text-sm hover:underline">
                      Add your first instrument
                    </button>
                  )}
                </td>
              </tr>
            ) : items.map(item => (
              <tr key={item.id} className="dark:hover:bg-dark-700/50 hover:bg-gray-50 transition-colors">
                <td className="dark:text-dark-100 px-4 py-3 font-medium text-gray-800">
                  <div className="flex items-center gap-3">
                    <div className="flex size-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400">
                      <BeakerIcon className="size-4" />
                    </div>
                    {item.name}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className="rounded-md bg-gray-100 px-2 py-0.5 font-mono text-xs text-gray-600 dark:bg-dark-600 dark:text-dark-300">
                    {item.code}
                  </span>
                </td>
                <td className="dark:text-dark-300 px-4 py-3 text-gray-500">
                  {item.manufacturer ?? <span className="italic text-gray-300 dark:text-dark-500">—</span>}
                </td>
                <td className="px-4 py-3">
                  {item.isActive
                    ? <span className="flex items-center gap-1 text-xs font-medium text-emerald-600"><CheckCircleIcon className="size-4" /> Active</span>
                    : <span className="flex items-center gap-1 text-xs font-medium text-gray-400"><XCircleIcon className="size-4" /> Inactive</span>}
                </td>
                {isAdmin && (
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => openEdit(item)}
                        className="dark:text-dark-300 dark:hover:bg-dark-600 rounded-lg p-1.5 text-gray-500 hover:bg-gray-100" title="Edit">
                        <PencilSquareIcon className="size-4" />
                      </button>
                      <button onClick={() => handleToggle(item)}
                        className="dark:hover:bg-dark-600 rounded-lg p-1.5 text-gray-500 hover:bg-gray-100"
                        title={item.isActive ? "Deactivate" : "Activate"}>
                        {item.isActive
                          ? <XCircleIcon className="size-4 text-amber-500" />
                          : <CheckCircleIcon className="size-4 text-emerald-500" />}
                      </button>
                      <button onClick={() => { setTarget(item); setModal("delete"); }}
                        className="dark:hover:bg-dark-600 rounded-lg p-1.5 hover:bg-gray-100" title="Delete">
                        <TrashIcon className="size-4 text-red-500" />
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="dark:border-dark-600 border-gray-150 dark:text-dark-300 flex items-center justify-between border-t px-4 py-3 text-sm text-gray-500">
            <span>{total} instruments total</span>
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
        <InstrumentFormModal mode="create" onSave={handleCreate} onClose={() => setModal(null)} />
      )}
      {modal === "edit" && detail && (
        <InstrumentFormModal mode="edit" item={detail} onSave={handleEdit} onClose={() => { setModal(null); setDetail(null); }} />
      )}
      {modal === "delete" && target && (
        <DeleteModal name={target.name} onConfirm={handleDelete} onClose={() => setModal(null)} />
      )}
    </div>
  );
}
