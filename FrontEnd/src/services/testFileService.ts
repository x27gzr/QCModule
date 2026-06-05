import api from "@/utils/axios";
import type { PaginatedResult } from "./instrumentService";

export interface TestFileParameterDto {
  id: string;
  parameterName: string;
  unit: string | null;
  lowerLimit: number | null;
  upperLimit: number | null;
}

export interface TestFileDto {
  id: string;
  name: string;
  code: string;
  unit: string | null;
  category: string | null;
  isActive: boolean;
  parameters: TestFileParameterDto[];
  createdAt: string;
}

export interface TestFileSummaryDto {
  id: string;
  name: string;
  code: string;
  category: string | null;
  isActive: boolean;
  parameterCount: number;
}

const testFileService = {
  getAll: (params?: { search?: string; isActive?: boolean; page?: number; pageSize?: number }) =>
    api.get<{ data: PaginatedResult<TestFileSummaryDto> }>("/api/testfiles", { params }),

  getById: (id: string) =>
    api.get<{ data: TestFileDto }>(`/api/testfiles/${id}`),

  create: (payload: { name: string; code: string; unit?: string; category?: string }) =>
    api.post<{ data: TestFileDto }>("/api/testfiles", payload),

  update: (id: string, payload: { name: string; code: string; unit?: string; category?: string }) =>
    api.put<{ data: TestFileDto }>(`/api/testfiles/${id}`, { id, ...payload }),

  delete: (id: string) =>
    api.delete(`/api/testfiles/${id}`),

  addParameter: (testFileId: string, payload: { parameterName: string; unit?: string; lowerLimit?: number; upperLimit?: number }) =>
    api.post<{ data: TestFileParameterDto }>(`/api/testfiles/${testFileId}/parameters`, payload),

  updateParameter: (testFileId: string, parameterId: string, payload: { parameterName: string; unit?: string; lowerLimit?: number; upperLimit?: number }) =>
    api.put<{ data: TestFileParameterDto }>(`/api/testfiles/${testFileId}/parameters/${parameterId}`, payload),

  deleteParameter: (testFileId: string, parameterId: string) =>
    api.delete(`/api/testfiles/${testFileId}/parameters/${parameterId}`),
};

export default testFileService;
