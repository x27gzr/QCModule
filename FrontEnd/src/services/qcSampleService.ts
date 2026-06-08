import api from "@/utils/axios";
import type { PaginatedResult } from "./instrumentService";

export interface WestgardRules {
  rule1_2s: boolean;
  rule1_3s: boolean;
  rule3_1s: boolean;
  rule2_2s: boolean;
  ruleR_4s: boolean;
  rule4_1s: boolean;
  rule9x:   boolean;
  rule10x:  boolean;
}

export const DEFAULT_WESTGARD_RULES: WestgardRules = {
  rule1_2s: true,
  rule1_3s: true,
  rule3_1s: false,
  rule2_2s: false,
  ruleR_4s: false,
  rule4_1s: false,
  rule9x:   false,
  rule10x:  false,
};

export interface QCSampleDto {
  id: string;
  name: string;
  lotNumber: string;
  level: string;
  expiryDate: string;
  instrumentId: string;
  instrumentName: string;
  isActive: boolean;
  isExpired: boolean;
  expiresSoon: boolean;
  westgardRules: WestgardRules;
  createdAt: string;
}

export interface QCSampleSummaryDto {
  id: string;
  name: string;
  lotNumber: string;
  level: string;
  expiryDate: string;
  instrumentName: string;
  isActive: boolean;
  isExpired: boolean;
  expiresSoon: boolean;
}

export interface QCSamplePayload {
  name: string;
  lotNumber: string;
  level: string;
  expiryDate: string;
  instrumentId: string;
  isActive: boolean;
  westgardRules: WestgardRules;
}

const qcSampleService = {
  getAll: (params?: { search?: string; instrumentId?: string; isActive?: boolean; page?: number; pageSize?: number }) =>
    api.get<{ data: PaginatedResult<QCSampleSummaryDto> }>("/api/qcsamples", { params }),

  getById: (id: string) =>
    api.get<{ data: QCSampleDto }>(`/api/qcsamples/${id}`),

  create: (payload: QCSamplePayload) =>
    api.post<{ data: QCSampleDto }>("/api/qcsamples", payload),

  update: (id: string, payload: QCSamplePayload) =>
    api.put<{ data: QCSampleDto }>(`/api/qcsamples/${id}`, { id, ...payload }),

  delete: (id: string) =>
    api.delete(`/api/qcsamples/${id}`),

  // ── Establish Mean ──────────────────────────────────────────────────────────
  getEstablishPreview: (id: string, params: { dateFrom?: string; dateTo?: string }) =>
    api.get<{ data: EstablishPreviewDto[] }>(`/api/qcsamples/${id}/establish-preview`, { params }),

  establishMean: (id: string, payload: { dateFrom?: string; dateTo?: string; testFileParameterIds: string[] }) =>
    api.post<{ data: { applied: number; skipped: number }; message: string }>(`/api/qcsamples/${id}/establish`, payload),
};

export interface EstablishPreviewDto {
  testFileParameterId: string;
  parameterName: string;
  unit: string | null;
  hasTarget: boolean;
  currentMean: number | null;
  currentSD: number | null;
  currentCV: number | null;
  n: number;
  calcMean: number | null;
  calcSD: number | null;
  calcCV: number | null;
}

export default qcSampleService;
