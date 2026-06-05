import api from "@/utils/axios";
import type { PaginatedResult } from "./instrumentService";

export type QCStatus = "Pending" | "Accepted" | "Warning" | "Rejected";

export interface QCResultSummaryDto {
  id: string;
  qcSampleName: string;
  level: string;
  parameterName: string;
  unit: string | null;
  resultDate: string;
  value: number;
  zScore: number;
  status: QCStatus;
  westgardFlags: string | null;
}

export interface QCResultDto extends QCResultSummaryDto {
  qcSampleId: string;
  testFileParameterId: string;
  enteredByName: string;
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
}

export interface LeveyJenningsPoint {
  resultId: string;
  resultDate: string;
  value: number;
  zScore: number;
  status: QCStatus;
  westgardFlags: string | null;
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
  points: LeveyJenningsPoint[];
}

const qcResultService = {
  getAll: (params?: {
    qcSampleId?: string;
    testFileParameterId?: string;
    status?: QCStatus;
    dateFrom?: string;
    dateTo?: string;
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

  review: (id: string, payload: { newStatus: number; comment?: string }) =>
    api.patch(`/api/qcresults/${id}/review`, payload),

  getTargets: (qcSampleId: string) =>
    api.get<{ data: QCSampleTargetDto[] }>(`/api/qcsamples/${qcSampleId}/targets`),

  upsertTarget: (qcSampleId: string, payload: { testFileParameterId: string; mean: number; sd: number; cv: number }) =>
    api.put<{ data: QCSampleTargetDto }>(`/api/qcsamples/${qcSampleId}/targets`, payload),

  getLeveyJennings: (params: {
    qcSampleId: string;
    testFileParameterId: string;
    dateFrom?: string;
    dateTo?: string;
  }) => api.get<{ data: LeveyJenningsDto }>("/api/qcresults/levey-jennings", { params }),
};

export default qcResultService;
