import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import type { QCSampleDto } from "@/services/qcSampleService";
import type { InstrumentSummaryDto } from "@/services/instrumentService";
import dayjs from "dayjs";
import { getErrorMessage } from "@/utils/apiError";

const schema = z.object({
  name:         z.string().min(1, "Name is required").max(100),
  lotNumber:    z.string().min(1, "Lot number is required").max(50),
  level:        z.string().min(1, "Level is required"),
  expiryDate:   z.string().min(1, "Expiry date is required"),
  instrumentId: z.string().min(1, "Instrument is required"),
});

type FormValues = z.infer<typeof schema>;

const LEVELS = ["Level 1", "Level 2", "Level 3"];

interface Props {
  mode:        "create" | "edit";
  item?:       QCSampleDto;
  instruments: InstrumentSummaryDto[];
  onSave:      (data: FormValues) => Promise<void>;
  onClose:     () => void;
}

const inputCls = "dark:bg-dark-900 dark:text-dark-100 dark:border-dark-600 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50";

const Field = ({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) => (
  <div>
    <label className="dark:text-dark-300 mb-1 block text-sm font-medium text-gray-600">{label}</label>
    {children}
    {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
  </div>
);

export default function QCSampleFormModal({ mode, item, instruments, onSave, onClose }: Props) {
  const isEdit = mode === "edit";

  const { register, handleSubmit, reset, setError, formState: { errors, isSubmitting } } =
    useForm<FormValues>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (isEdit && item) {
      reset({
        name:         item.name,
        lotNumber:    item.lotNumber,
        level:        item.level,
        expiryDate:   dayjs(item.expiryDate).format("YYYY-MM-DD"),
        instrumentId: item.instrumentId,
      });
    }
  }, [item, isEdit, reset]);

  const onSubmit = async (data: FormValues) => {
    try {
      await onSave(data);
      toast.success(isEdit ? "QC Sample updated." : "QC Sample created.");
      onClose();
    } catch (err) {
      const msg = getErrorMessage(err);
      setError("root", { message: msg });
      toast.error(msg);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="dark:bg-dark-800 w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
        <h2 className="dark:text-dark-100 mb-5 text-lg font-semibold text-gray-800">
          {isEdit ? "Edit QC Sample" : "Add QC Sample"}
        </h2>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Field label="Sample Name *" error={errors.name?.message}>
            <input {...register("name")} className={inputCls} placeholder="e.g. Assayed Chemistry Control" />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Lot Number *" error={errors.lotNumber?.message}>
              <input {...register("lotNumber")} className={inputCls} placeholder="e.g. LOT-2026-001" />
            </Field>
            <Field label="Level *" error={errors.level?.message}>
              <select {...register("level")} className={inputCls}>
                <option value="">Select level…</option>
                {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Expiry Date *" error={errors.expiryDate?.message}>
              <input {...register("expiryDate")} type="date" className={inputCls}
                min={dayjs().format("YYYY-MM-DD")} />
            </Field>
            <Field label="Instrument *" error={errors.instrumentId?.message}>
              <select {...register("instrumentId")} className={inputCls}>
                <option value="">Select instrument…</option>
                {instruments.filter(i => i.isActive).map(i =>
                  <option key={i.id} value={i.id}>{i.name} ({i.code})</option>)}
              </select>
            </Field>
          </div>

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
              {isSubmitting ? "Saving…" : isEdit ? "Save Changes" : "Add QC Sample"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
