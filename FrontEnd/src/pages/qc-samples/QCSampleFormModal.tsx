import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import type { QCSampleDto } from "@/services/qcSampleService";
import { DEFAULT_WESTGARD_RULES } from "@/services/qcSampleService";
import type { InstrumentSummaryDto } from "@/services/instrumentService";
import dayjs from "dayjs";
import { getErrorMessage } from "@/utils/apiError";

const schema = z.object({
  name:         z.string().min(1, "Name is required").max(100),
  lotNumber:    z.string().min(1, "Lot number is required").max(50),
  level:        z.string().min(1, "Level is required"),
  expiryDate:   z.string().min(1, "Expiry date is required"),
  instrumentId: z.string().min(1, "Instrument is required"),
  isActive:     z.boolean(),
  // Westgard rules (within-material)
  rule1_2s:     z.boolean(),
  rule1_3s:     z.boolean(),
  rule2_2s:     z.boolean(),
  rule2_2sDiff: z.boolean(),
  rule4_1s:     z.boolean(),
  rule10x:      z.boolean(),
  rule7T:       z.boolean(),
  rejectSD:     z.coerce.number().min(2, "2–6").max(6, "2–6"),
  nxCount:      z.coerce.number().int().min(2, "2–20").max(20, "2–20"),
});

type FormValues = z.infer<typeof schema>;

const LEVELS = ["Level 1", "Level 2", "Level 3"];

interface Props {
  mode:        "create" | "edit";
  item?:       QCSampleDto;
  instruments: InstrumentSummaryDto[];
  onSave:      (data: any) => Promise<void>;
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
    useForm<FormValues>({
      resolver: zodResolver(schema),
      defaultValues: {
        isActive: true,
        ...DEFAULT_WESTGARD_RULES,
      },
    });

  useEffect(() => {
    if (isEdit && item) {
      const r = item.westgardRules;
      reset({
        name:         item.name,
        lotNumber:    item.lotNumber,
        level:        item.level,
        expiryDate:   dayjs(item.expiryDate).format("YYYY-MM-DD"),
        instrumentId: item.instrumentId,
        isActive:     item.isActive,
        rule1_2s:     r.rule1_2s,
        rule1_3s:     r.rule1_3s,
        rule2_2s:     r.rule2_2s,
        rule2_2sDiff: r.rule2_2sDiff,
        rule4_1s:     r.rule4_1s,
        rule10x:      r.rule10x,
        rule7T:       r.rule7T,
        rejectSD:     r.rejectSD || 3,
        nxCount:      r.nxCount  || 10,
      });
    }
  }, [item, isEdit, reset]);

  const onSubmit = async (data: FormValues) => {
    try {
      await onSave({
        name:         data.name,
        lotNumber:    data.lotNumber,
        level:        data.level,
        expiryDate:   data.expiryDate,
        instrumentId: data.instrumentId,
        isActive:     data.isActive,
        westgardRules: {
          rule1_2s:     data.rule1_2s,
          rule1_3s:     data.rule1_3s,
          rule2_2s:     data.rule2_2s,
          rule2_2sDiff: data.rule2_2sDiff,
          rule4_1s:     data.rule4_1s,
          rule10x:      data.rule10x,
          rule7T:       data.rule7T,
          rejectSD:     data.rejectSD,
          nxCount:      data.nxCount,
          // legacy across-material (Phase 2) — preserve existing, default off
          rule3_1s: item?.westgardRules.rule3_1s ?? false,
          ruleR_4s: item?.westgardRules.ruleR_4s ?? false,
          rule9x:   item?.westgardRules.rule9x   ?? false,
        },
      });
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
      <div className="dark:bg-dark-800 flex max-h-[90vh] w-full max-w-2xl flex-col rounded-xl bg-white shadow-xl">

        {/* Header */}
        <div className="border-b border-gray-100 px-6 py-4 dark:border-dark-600">
          <h2 className="dark:text-dark-100 text-lg font-semibold text-gray-800">
            {isEdit ? "Edit QC Sample" : "Add QC Sample"}
          </h2>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-1 flex-col overflow-hidden">
          <div className="space-y-4 overflow-y-auto px-6 py-4">

            {/* Basic fields */}
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
                <input {...register("expiryDate")} type="date" className={inputCls} />
              </Field>
              <Field label="Instrument *" error={errors.instrumentId?.message}>
                <select {...register("instrumentId")} className={inputCls}>
                  <option value="">Select instrument…</option>
                  {instruments.filter(i => i.isActive).map(i =>
                    <option key={i.id} value={i.id}>{i.name} ({i.code})</option>)}
                </select>
              </Field>
            </div>

            {/* Status */}
            <div className="flex items-center gap-3">
              <input {...register("isActive")} type="checkbox" id="isActive"
                className="size-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
              <label htmlFor="isActive" className="dark:text-dark-200 text-sm font-medium text-gray-700">
                Active
              </label>
            </div>

            {/* Westgard Rules — Within Material */}
            <div className="border-t border-gray-100 pt-4 dark:border-dark-600">
              <p className="mb-1 text-sm font-semibold text-gray-700 dark:text-dark-200">Westgard Flagging</p>
              <p className="mb-3 text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-dark-400">Within Material</p>

              <div className="space-y-1">
                {/* 1:2s — Warning */}
                <label className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 hover:bg-gray-50 dark:hover:bg-dark-700">
                  <input {...register("rule1_2s")} type="checkbox"
                    className="size-4 rounded border-gray-300 text-amber-500 focus:ring-amber-400" />
                  <span className="text-sm text-amber-600 dark:text-amber-400">Warning: Outside 2 SD <span className="text-gray-400">(1:2s)</span></span>
                </label>

                {/* 1:Ns — Reject, configurable SD */}
                <label className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 hover:bg-gray-50 dark:hover:bg-dark-700">
                  <input {...register("rule1_3s")} type="checkbox"
                    className="size-4 rounded border-gray-300 text-red-500 focus:ring-red-400" />
                  <span className="flex items-center gap-1.5 text-sm text-red-600 dark:text-red-400">
                    Reject: Outside
                    <input {...register("rejectSD")} type="number" step="0.5" min={2} max={6}
                      className="w-14 rounded border border-gray-200 px-1.5 py-0.5 text-center text-xs text-gray-800 dark:border-dark-600 dark:bg-dark-900 dark:text-dark-100" />
                    SD
                  </span>
                </label>
                {errors.rejectSD && <p className="px-2 text-xs text-red-500">SD must be {errors.rejectSD.message}</p>}

                {/* 2:2s same side */}
                <label className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 hover:bg-gray-50 dark:hover:bg-dark-700">
                  <input {...register("rule2_2s")} type="checkbox"
                    className="size-4 rounded border-gray-300 text-red-500 focus:ring-red-400" />
                  <span className="text-sm text-red-600 dark:text-red-400">Reject: 2 consecutive outside 2 SD at same side of mean <span className="text-gray-400">(2:2s)</span></span>
                </label>

                {/* R:4s — 2 consecutive outside 2SD different side */}
                <label className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 hover:bg-gray-50 dark:hover:bg-dark-700">
                  <input {...register("rule2_2sDiff")} type="checkbox"
                    className="size-4 rounded border-gray-300 text-red-500 focus:ring-red-400" />
                  <span className="text-sm text-red-600 dark:text-red-400">Reject: 2 consecutive outside 2 SD at different side of mean <span className="text-gray-400">(R:4s)</span></span>
                </label>

                {/* 4:1s */}
                <label className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 hover:bg-gray-50 dark:hover:bg-dark-700">
                  <input {...register("rule4_1s")} type="checkbox"
                    className="size-4 rounded border-gray-300 text-red-500 focus:ring-red-400" />
                  <span className="text-sm text-red-600 dark:text-red-400">Reject: 4 consecutive outside 1 SD at same side of mean <span className="text-gray-400">(4:1s)</span></span>
                </label>

                {/* N:x — configurable count */}
                <label className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 hover:bg-gray-50 dark:hover:bg-dark-700">
                  <input {...register("rule10x")} type="checkbox"
                    className="size-4 rounded border-gray-300 text-red-500 focus:ring-red-400" />
                  <span className="flex items-center gap-1.5 text-sm text-red-600 dark:text-red-400">
                    Reject:
                    <input {...register("nxCount")} type="number" step="1" min={2} max={20}
                      className="w-14 rounded border border-gray-200 px-1.5 py-0.5 text-center text-xs text-gray-800 dark:border-dark-600 dark:bg-dark-900 dark:text-dark-100" />
                    consecutive same side of mean
                  </span>
                </label>
                {errors.nxCount && <p className="px-2 text-xs text-red-500">N must be {errors.nxCount.message}</p>}

                {/* 7T — trend */}
                <label className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 hover:bg-gray-50 dark:hover:bg-dark-700">
                  <input {...register("rule7T")} type="checkbox"
                    className="size-4 rounded border-gray-300 text-red-500 focus:ring-red-400" />
                  <span className="text-sm text-red-600 dark:text-red-400">Reject: 7 consecutive trend in same direction <span className="text-gray-400">(7T)</span></span>
                </label>
              </div>
            </div>

            {errors.root && (
              <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
                {errors.root.message}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 border-t border-gray-100 px-6 py-4 dark:border-dark-600">
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
