import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { InstrumentDto } from "@/services/instrumentService";
import testFileService, { type TestFileSummaryDto } from "@/services/testFileService";

const schema = z.object({
  name:       z.string().min(1, "Name is required").max(100),
  code:       z.string().min(1, "Code is required").max(50),
  testFileId: z.string().uuid("Test File is required"),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  mode:    "create" | "edit";
  item?:   InstrumentDto;
  onSave:  (data: FormValues) => Promise<void>;
  onClose: () => void;
}

const Field = ({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) => (
  <div>
    <label className="dark:text-dark-300 mb-1 block text-sm font-medium text-gray-600">{label}</label>
    {children}
    {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
  </div>
);

const inputCls = "dark:bg-dark-900 dark:text-dark-100 dark:border-dark-600 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50";

export default function InstrumentFormModal({ mode, item, onSave, onClose }: Props) {
  const isEdit = mode === "edit";

  const [testFiles, setTestFiles] = useState<TestFileSummaryDto[]>([]);

  const { register, handleSubmit, reset, setError, formState: { errors, isSubmitting } } =
    useForm<FormValues>({ resolver: zodResolver(schema) });

  useEffect(() => {
    testFileService.getAll({ isActive: true, pageSize: 200 }).then(res => {
      setTestFiles(res.data.data.items);
    });
  }, []);

  useEffect(() => {
    if (isEdit && item) {
      reset({
        name:       item.name,
        code:       item.code,
        testFileId: item.testFileId,
      });
    }
  }, [item, isEdit, reset]);

  const onSubmit = async (data: FormValues) => {
    try {
      await onSave(data);
      onClose();
    } catch (err: any) {
      setError("root", { message: err?.message ?? "An error occurred." });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="dark:bg-dark-800 w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
        <h2 className="dark:text-dark-100 mb-5 text-lg font-semibold text-gray-800">
          {isEdit ? "Edit Instrument" : "Add Instrument"}
        </h2>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Instrument Name *" error={errors.name?.message}>
              <input {...register("name")} className={inputCls} placeholder="e.g. Cobas 8000" />
            </Field>
            <Field label="Code *" error={errors.code?.message}>
              <input {...register("code")} className={inputCls} placeholder="e.g. COBAS-8000" />
            </Field>
          </div>

          <Field label="Test File *" error={errors.testFileId?.message}>
            <select {...register("testFileId")} className={inputCls}>
              <option value="">— Select Test File —</option>
              {testFiles.map(tf => (
                <option key={tf.id} value={tf.id}>
                  {tf.name} ({tf.code})
                </option>
              ))}
            </select>
          </Field>

          {errors.root && (
            <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
              {errors.root.message}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="dark:text-dark-300 rounded-lg px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 dark:hover:bg-dark-700">
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting}
              className="bg-primary-600 hover:bg-primary-700 rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-60">
              {isSubmitting ? "Saving…" : isEdit ? "Save Changes" : "Add Instrument"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
