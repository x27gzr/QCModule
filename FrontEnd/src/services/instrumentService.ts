import api from "@/utils/axios";

export interface InstrumentDto {
  id: string;
  name: string;
  code: string;
  manufacturer: string | null;
  model: string | null;
  serialNumber: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface InstrumentSummaryDto {
  id: string;
  name: string;
  code: string;
  manufacturer: string | null;
  isActive: boolean;
}

export interface PaginatedResult<T> {
  items: T[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface InstrumentPayload {
  name: string;
  code: string;
  manufacturer?: string;
  model?: string;
  serialNumber?: string;
}

const instrumentService = {
  getInstruments: (params?: { search?: string; isActive?: boolean; page?: number; pageSize?: number }) =>
    api.get<{ data: PaginatedResult<InstrumentSummaryDto> }>("/api/instruments", { params }),

  getById: (id: string) =>
    api.get<{ data: InstrumentDto }>(`/api/instruments/${id}`),

  create: (payload: InstrumentPayload) =>
    api.post<{ data: InstrumentDto }>("/api/instruments", payload),

  update: (id: string, payload: InstrumentPayload) =>
    api.put<{ data: InstrumentDto }>(`/api/instruments/${id}`, { id, ...payload }),

  delete: (id: string) =>
    api.delete(`/api/instruments/${id}`),

  toggleActive: (id: string) =>
    api.patch<{ data: boolean; message: string }>(`/api/instruments/${id}/active`),
};

export default instrumentService;
