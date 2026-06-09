import api from "@/utils/axios";
import type { PaginatedResult } from "./instrumentService";

export interface WestgardRules {
  // Within-material rules (evaluated on this level's own time series)
  rule1_2s:     boolean;  // Warning: outside 2SD
  rule1_3s:     boolean;  // Reject: outside N SD
  rule2_2s:     boolean;  // Reject: 2 consecutive outside 2SD, same side
  rule2_2sDiff: boolean;  // Reject: 2 consecutive outside 2SD, different side (R:4s)
  rule4_1s:     boolean;  // Reject: 4 consecutive outside 1SD, same side
  rule10x:      boolean;  // Reject: N consecutive same side of mean
  rule7T:       boolean;  // Reject: 7 consecutive trend, same direction
  rejectSD:     number;   // SD multiplier for the 1:Ns reject rule (default 3)
  nxCount:      number;   // N for the "N consecutive same side" rule (default 10)
  // Legacy / Phase-2 (across-material) — not yet evaluated, kept for compatibility
  rule3_1s:     boolean;
  ruleR_4s:     boolean;
  rule9x:       boolean;
}

export const DEFAULT_WESTGARD_RULES: WestgardRules = {
  rule1_2s:     true,
  rule1_3s:     true,
  rule2_2s:     false,
  rule2_2sDiff: false,
  rule4_1s:     false,
  rule10x:      false,
  rule7T:       false,
  rejectSD:     3,
  nxCount:      10,
  rule3_1s:     false,
  ruleR_4s:     false,
  rule9x:       false,
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
