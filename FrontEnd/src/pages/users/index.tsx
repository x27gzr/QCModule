import { useCallback, useEffect, useState } from "react";
import {
  PlusIcon, MagnifyingGlassIcon, PencilSquareIcon,
  TrashIcon, ArrowPathIcon, CheckCircleIcon, XCircleIcon
} from "@heroicons/react/24/outline";
import userService, { type UserSummaryDto } from "@/services/userService";
import roleService, { type RoleDto } from "@/services/roleService";
import UserFormModal from "./UserFormModal";
import DeleteModal from "./DeleteModal";
import { useAuth } from "@/contexts/auth/context";

const ROLE_COLORS: Record<string, string> = {
  Admin:      "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400",
  Supervisor: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  Analyst:    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
};

export default function UsersPage() {
  const { user: me } = useAuth();
  const isAdmin = me?.role === "Admin";

  const [users,   setUsers]   = useState<UserSummaryDto[]>([]);
  const [roles,   setRoles]   = useState<RoleDto[]>([]);
  const [total,   setTotal]   = useState(0);
  const [page,    setPage]    = useState(1);
  const [search,  setSearch]  = useState("");
  const [loading, setLoading] = useState(true);

  const [modal,  setModal]  = useState<"create" | "edit" | "delete" | null>(null);
  const [target, setTarget] = useState<UserSummaryDto | null>(null);

  const pageSize = 10;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await userService.getUsers({ search: search || undefined, page, pageSize });
      setUsers(res.data.data.items);
      setTotal(res.data.data.totalCount);
    } finally {
      setLoading(false);
    }
  }, [search, page]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    roleService.getRoles().then(res => setRoles(res.data.data));
  }, []);

  const handleCreate = async (data: any) => {
    await userService.createUser(data);
    load();
  };

  const handleEdit = async (data: any) => {
    await userService.updateUser(target!.id, data);
    load();
  };

  const handleDelete = async () => {
    await userService.deleteUser(target!.id);
    setModal(null);
    load();
  };

  const handleToggle = async (u: UserSummaryDto) => {
    await userService.toggleActive(u.id);
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
            placeholder="Search name or email…"
            className="dark:bg-dark-800 dark:text-dark-100 dark:border-dark-600 w-64 rounded-lg border border-gray-200 py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50"
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
              Add User
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="dark:bg-dark-800 dark:border-dark-600 border-gray-150 overflow-hidden rounded-xl border bg-white shadow-xs">
        <table className="w-full text-sm">
          <thead>
            <tr className="dark:bg-dark-700 dark:text-dark-300 border-gray-150 dark:border-dark-600 border-b bg-gray-50 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Status</th>
              {isAdmin && <th className="px-4 py-3 text-right">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-dark-600">
            {loading ? (
              <tr><td colSpan={5} className="dark:text-dark-400 py-12 text-center text-gray-400">Loading…</td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={5} className="dark:text-dark-400 py-12 text-center text-gray-400">No users found.</td></tr>
            ) : users.map(u => (
              <tr key={u.id} className="dark:hover:bg-dark-700/50 hover:bg-gray-50 transition-colors">
                <td className="dark:text-dark-100 px-4 py-3 font-medium text-gray-800">
                  <div className="flex items-center gap-3">
                    <div className="bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400 flex size-8 items-center justify-center rounded-full text-xs font-bold">
                      {u.name.charAt(0).toUpperCase()}
                    </div>
                    {u.name}
                  </div>
                </td>
                <td className="dark:text-dark-300 px-4 py-3 text-gray-500">{u.email}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${ROLE_COLORS[u.role] ?? "bg-gray-100 text-gray-600"}`}>
                    {u.role}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {u.isActive
                    ? <span className="flex items-center gap-1 text-xs font-medium text-emerald-600"><CheckCircleIcon className="size-4" /> Active</span>
                    : <span className="flex items-center gap-1 text-xs font-medium text-gray-400"><XCircleIcon className="size-4" /> Inactive</span>}
                </td>
                {isAdmin && (
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => { setTarget(u); setModal("edit"); }}
                        className="dark:text-dark-300 dark:hover:bg-dark-600 rounded-lg p-1.5 text-gray-500 hover:bg-gray-100"
                        title="Edit">
                        <PencilSquareIcon className="size-4" />
                      </button>
                      <button onClick={() => handleToggle(u)}
                        className="dark:text-dark-300 dark:hover:bg-dark-600 rounded-lg p-1.5 text-gray-500 hover:bg-gray-100"
                        title={u.isActive ? "Deactivate" : "Activate"}>
                        {u.isActive ? <XCircleIcon className="size-4 text-amber-500" /> : <CheckCircleIcon className="size-4 text-emerald-500" />}
                      </button>
                      <button onClick={() => { setTarget(u); setModal("delete"); }}
                        className="dark:hover:bg-dark-600 rounded-lg p-1.5 text-gray-500 hover:bg-gray-100"
                        title="Delete">
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
            <span>{total} users total</span>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage(p => p - 1)} disabled={page === 1}
                className="rounded-lg px-3 py-1 hover:bg-gray-100 disabled:opacity-40 dark:hover:bg-dark-700">
                Prev
              </button>
              <span className="dark:text-dark-100 font-medium text-gray-700">{page} / {totalPages}</span>
              <button onClick={() => setPage(p => p + 1)} disabled={page === totalPages}
                className="rounded-lg px-3 py-1 hover:bg-gray-100 disabled:opacity-40 dark:hover:bg-dark-700">
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {modal === "create" && (
        <UserFormModal mode="create" roles={roles} onSave={handleCreate} onClose={() => setModal(null)} />
      )}
      {modal === "edit" && target && (
        <UserFormModal mode="edit" user={{ ...target, lastLoginAt: null, createdAt: "" }} roles={roles} onSave={handleEdit} onClose={() => setModal(null)} />
      )}
      {modal === "delete" && target && (
        <DeleteModal name={target.name} onConfirm={handleDelete} onClose={() => setModal(null)} />
      )}
    </div>
  );
}
