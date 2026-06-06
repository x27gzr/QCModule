import api from "@/utils/axios";
import type { PaginatedResult } from "./instrumentService";

export const TEST_FILE_TYPES = ["Numerical", "Non Numerical"] as const;
export type TestFileType = typeof TEST_FILE_TYPES[number];

export interface TestFileParameterDto {
  id: string;
  parameterName: string;
  testCode: string | null;
  outputMask: string | null;
  sequence: number;
  unit: string | null;
  lowerLimit: number | null;
  upperLimit: number | null;
}

export interface TestFileDto {
  id: string;
  name: string;
  code: string;
  type: TestFileType;
  unit: string | null;
  isActive: boolean;
  parameters: TestFileParameterDto[];
  createdAt: string;
}

export interface TestFileSummaryDto {
  id: string;
  name: string;
  code: string;
  type: TestFileType;
  isActive: boolean;
  parameterCount: number;
}

export interface ParameterPayload {
  parameterName: string;
  testCode?: string;
  outputMask?: string;
  sequence: number;
  unit?: string;
  lowerLimit?: number;
  upperLimit?: number;
}

const testFileService = {
  getAll: (params?: { search?: string; isActive?: boolean; page?: number; pageSize?: number }) =>
    api.get<{ data: PaginatedResult<TestFileSummaryDto> }>("/api/testfiles", { params }),

  getById: (id: string) =>
    api.get<{ data: TestFileDto }>(`/api/testfiles/${id}`),

  create: (payload: { name: string; code: string; type: TestFileType; unit?: string }) =>
    api.post<{ data: TestFileDto }>("/api/testfiles", payload),

  update: (id: string, payload: { name: string; code: string; type: TestFileType; unit?: string }) =>
    api.put<{ data: TestFileDto }>(`/api/testfiles/${id}`, { id, ...payload }),

  delete: (id: string) =>
    api.delete(`/api/testfiles/${id}`),

  addParameter: (testFileId: string, payload: ParameterPayload) =>
    api.post<{ data: TestFileParameterDto }>(`/api/testfiles/${testFileId}/parameters`, payload),

  updateParameter: (testFileId: string, parameterId: string, payload: ParameterPayload) =>
    api.put<{ data: TestFileParameterDto }>(`/api/testfiles/${testFileId}/parameters/${parameterId}`, payload),

  deleteParameter: (testFileId: string, parameterId: string) =>
    api.delete(`/api/testfiles/${testFileId}/parameters/${parameterId}`),
};

export default testFileService;
