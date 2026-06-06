import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import type { RoleDto } from "@/services/roleService";
import type { UserDto } from "@/services/userService";
import { getErrorMessage } from "@/utils/apiError";

const createSchema = z.object({
  name:     z.string().min(1, "Name is required"),
  nickname: z.string().optional(),
  email:    z.string().min(1, "Email is required").email("Invalid email"),
  password: z.string().min(8, "Min 8 characters").regex(/[A-Z]/, "Need uppercase").regex(/[0-9]/, "Need number"),
  roleId:   z.string().min(1, "Role is required"),
});

const editSchema = z.object({
  name:     z.string().min(1, "Name is required"),
  nickname: z.string().optional(),
  email:    z.string().min(1, "Email is required").email("Invalid email"),
  roleId:   z.string().min(1, "Role is required"),
});

type CreateValues = z.infer<typeof createSchema>;
type EditValues   = z.infer<typeof editSchema>;

interface Props {
  mode:     "create" | "edit";
  user?:    UserDto;
  roles:    RoleDto[];
  onSave:   (data: any) => Promise<void>;
  onClose:  () => void;
}

export default function UserFormModal({ mode, user, roles, onSave, onClose }: Props) {
  const isEdit   = mode === "edit";
  const resolver = isEdit ? zodResolver(editSchema) : zodResolver(createSchema);

  const { register, handleSubmit, reset, setError, formState: { errors, isSubmitting } } =
    useForm<any>({ resolver });

  useEffect(() => {
    if (isEdit && user) {
      reset({ name: user.name, nickname: user.nickname ?? "", email: user.email, roleId: roles.find(r => r.name === user.role)?.id ?? "" });
    }
  }, [user, isEdit, roles, reset]);

  const onSubmit = async (data: CreateValues | EditValues) => {
    try {
      await onSave(data);
      toast.success(isEdit ? "User updated." : "User created.");
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
        <h2 className="dark:text-dark-100 mb-5 text-lg font-semibold text-gray-800">
          {isEdit ? "Edit User" : "Create User"}
        </h2>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Name */}
          <div>
            <label className="dark:text-dark-300 mb-1 block text-sm font-medium text-gray-600">Name</label>
            <input {...register("name")}
              className="dark:bg-dark-900 dark:text-dark-100 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50 dark:border-dark-600"
              placeholder="Full name" />
            {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name.message as string}</p>}
          </div>

          {/* Nickname */}
          <div>
            <label className="dark:text-dark-300 mb-1 block text-sm font-medium text-gray-600">Nickname <span className="text-gray-400">(optional)</span></label>
            <input {...register("nickname")}
              className="dark:bg-dark-900 dark:text-dark-100 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50 dark:border-dark-600"
              placeholder="Short display name (e.g. for activity log)" />
          </div>

          {/* Email */}
          <div>
            <label className="dark:text-dark-300 mb-1 block text-sm font-medium text-gray-600">Email</label>
            <input {...register("email")} type="email"
              className="dark:bg-dark-900 dark:text-dark-100 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50 dark:border-dark-600"
              placeholder="email@example.com" />
            {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email.message as string}</p>}
          </div>

          {/* Password — create only */}
          {!isEdit && (
            <div>
              <label className="dark:text-dark-300 mb-1 block text-sm font-medium text-gray-600">Password</label>
              <input {...register("password")} type="password"
                className="dark:bg-dark-900 dark:text-dark-100 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50 dark:border-dark-600"
                placeholder="Min 8 chars, uppercase, number" />
              {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password.message as string}</p>}
            </div>
          )}

          {/* Role */}
          <div>
            <label className="dark:text-dark-300 mb-1 block text-sm font-medium text-gray-600">Role</label>
            <select {...register("roleId")}
              className="dark:bg-dark-900 dark:text-dark-100 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50 dark:border-dark-600">
              <option value="">Select role...</option>
              {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
            {errors.roleId && <p className="mt-1 text-xs text-red-500">{errors.roleId.message as string}</p>}
          </div>

          {errors.root && (
            <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
              {errors.root.message as string}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="dark:text-dark-300 rounded-lg px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 dark:hover:bg-dark-700">
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting}
              className="bg-primary-600 hover:bg-primary-700 rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-60">
              {isSubmitting ? "Saving…" : isEdit ? "Save Changes" : "Create User"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
