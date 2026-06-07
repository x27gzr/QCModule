import api from "@/utils/axios";
import type { PaginatedResult } from "./instrumentService";

export type QCStatus = "Pending" | "Accepted" | "Warning" | "Rejected";
export type ValidationStatus = "Pending" | "Validated" | "Rejected";
export type AuthorisationStatus = "Pending" | "Authorised" | "Rejected";

export interface QCResultSummaryDto {
  id: string;
  qcSampleId: string;
  testFileParameterId: string;
  qcSampleName: string;
  level: string;
  parameterName: string;
  unit: string | null;
  enteredByName: string | null;
  resultDate: string;
  value: number;
  zScore: number;
  status: QCStatus;
  westgardFlags: string | null;
  validationStatus: ValidationStatus;
  validatedByName: string | null;
  validatedAt: string | null;
  authorisationStatus: AuthorisationStatus;
  authorisedByName: string | null;
  authorisedAt: string | null;
  isDeleted: boolean;
  deletedReason: string | null;
}

export interface AuthorisationSummaryDto {
  total: number;
  authorised: number;
  pending: number;
  percentage: number;
  lastAuthoriserName: string | null;
  lastAuthorisedAt: string | null;
  lastParameterName: string | null;
}

export interface QCResultDto extends QCResultSummaryDto {
  comment: string | null;
}

export interface QCSampleTargetDto {
  id: string;
  qcSampleId: string;
  testFileParameterId: string;
  parameterName: string;
  unit: string | null;
  mean: number;
  sd: number;
  cv: number;
  tea: number | null;
  teaUnit: string | null;
}

export interface LeveyJenningsPoint {
  resultId: string;
  resultDate: string;
  value: number;
  zScore: number;
  status: QCStatus;
  westgardFlags: string | null;
  validationStatus: ValidationStatus;
  validatedByName: string | null;
  validatedAt: string | null;
  comment: string | null;
}

export interface LeveyJenningsDto {
  qcSampleId: string;
  qcSampleName: string;
  level: string;
  testFileParameterId: string;
  parameterName: string;
  unit: string | null;
  hasTarget: boolean;
  mean: number;
  sd: number;
  cv: number;
  plus1SD: number;
  plus2SD: number;
  plus3SD: number;
  minus1SD: number;
  minus2SD: number;
  minus3SD: number;
  totalCount: number;
  acceptedCount: number;
  warningCount: number;
  rejectedCount: number;
  calculatedMean: number;
  calculatedSD: number;
  calculatedCV: number;
  displayCount: number;
  points: LeveyJenningsPoint[];
}

const qcResultService = {
  getAll: (params?: {
    qcSampleId?: string;
    testFileParameterId?: string;
    instrumentId?: string;
    status?: QCStatus;
    validationStatus?: ValidationStatus;
    authorisationStatus?: AuthorisationStatus;
    dateFrom?: string;
    dateTo?: string;
    includeDeleted?: boolean;
    page?: number;
    pageSize?: number;
  }) => api.get<{ data: PaginatedResult<QCResultSummaryDto> }>("/api/qcresults", { params }),

  create: (payload: {
    qcSampleId: string;
    testFileParameterId: string;
    resultDate: string;
    value: number;
    comment?: string;
  }) => api.post<{ data: QCResultDto; message: string }>("/api/qcresults", payload),

  update: (id: string, payload: { resultDate: string; value: number; comment?: string }) =>
    api.put<{ data: QCResultDto }>(`/api/qcresults/${id}`, payload),

  delete: (id: string, reason: string) =>
    api.delete<{ data: boolean; message: string }>(`/api/qcresults/${id}`, { data: { reason } }),

  restore: (id: string) =>
    api.post<{ data: boolean; message: string }>(`/api/qcresults/${id}/restore`),

  // Stage 1 — analyst
  validate: (id: string, payload: { reject: boolean; note?: string }) =>
    api.post(`/api/qcresults/${id}/validate`, payload),

  batchValidate: (payload: { resultIds?: string[]; qcSampleId?: string; testFileParameterId?: string }) =>
    api.post<{ data: { validatedCount: number; skippedCount: number }; message: string }>(
      "/api/qcresults/batch-validate", payload),

  cancelValidation: (id: string, reason: string) =>
    api.post(`/api/qcresults/${id}/cancel-validation`, { reason }),

  // Stage 2 — doctor
  doctorAuthorise: (id: string, note?: string) =>
    api.post(`/api/qcresults/${id}/doctor-authorise`, { note }),

  doctorCancelAuthorisation: (id: string, reason: string) =>
    api.post(`/api/qcresults/${id}/doctor-cancel-authorisation`, { reason }),

  batchAuthorise: (resultIds: string[], note?: string) =>
    api.post<{ data: { authorisedCount: number; failedIds: string[] }; message: string }>(
      "/api/qcresults/batch-doctor-authorise", { resultIds, note }),

  getPendingAuthorisation: (params?: { qcSampleId?: string; dateFrom?: string; dateTo?: string; page?: number; pageSize?: number }) =>
    api.get<{ data: PaginatedResult<QCResultSummaryDto> }>("/api/qcresults/pending-doctor-authorisation", { params }),

  getAuthorisationSummary: (params?: { dateFrom?: string; dateTo?: string }) =>
    api.get<{ data: AuthorisationSummaryDto }>("/api/qcresults/doctor-authorisation-summary", { params }),

  getTargets: (qcSampleId: string) =>
    api.get<{ data: QCSampleTargetDto[] }>(`/api/qcsamples/${qcSampleId}/targets`),

  upsertTarget: (qcSampleId: string, payload: { testFileParameterId: string; mean: number; sd: number; cv: number; tea?: number; teaUnit?: string }) =>
    api.put<{ data: QCSampleTargetDto }>(`/api/qcsamples/${qcSampleId}/targets`, payload),

  getLeveyJennings: (params: {
    qcSampleId: string;
    testFileParameterId: string;
    dateFrom?: string;
    dateTo?: string;
  }) => api.get<{ data: LeveyJenningsDto }>("/api/qcresults/levey-jennings", { params }),
};

export default qcResultService;
