import api from "@/utils/axios";
import type { PaginatedResult } from "./instrumentService";

export interface QCSampleDto {
  id: string;
  name: string;
  lotNumber: string;
  level: string;
  expiryDate: string;
  instrumentId: string;
  instrumentName: string;
  isExpired: boolean;
  expiresSoon: boolean;
  createdAt: string;
}

export interface QCSampleSummaryDto {
  id: string;
  name: string;
  lotNumber: string;
  level: string;
  expiryDate: string;
  instrumentName: string;
  isExpired: boolean;
  expiresSoon: boolean;
}

export interface QCSamplePayload {
  name: string;
  lotNumber: string;
  level: string;
  expiryDate: string;
  instrumentId: string;
}

const qcSampleService = {
  getAll: (params?: { search?: string; instrumentId?: string; page?: number; pageSize?: number }) =>
    api.get<{ data: PaginatedResult<QCSampleSummaryDto> }>("/api/qcsamples", { params }),

  getById: (id: string) =>
    api.get<{ data: QCSampleDto }>(`/api/qcsamples/${id}`),

  create: (payload: QCSamplePayload) =>
    api.post<{ data: QCSampleDto }>("/api/qcsamples", payload),

  update: (id: string, payload: QCSamplePayload) =>
    api.put<{ data: QCSampleDto }>(`/api/qcsamples/${id}`, { id, ...payload }),

  delete: (id: string) =>
    api.delete(`/api/qcsamples/${id}`),
};

export default qcSampleService;
