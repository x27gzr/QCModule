import api from "@/utils/axios";
import type { PaginatedResult } from "./instrumentService";

export interface ActivityLogDto {
  id: string;
  userId: string | null;
  userName: string;
  action: string;
  module: string;
  entityId: string | null;
  description: string | null;
  ipAddress: string | null;
  createdAt: string;
}

export interface CountByKey {
  key: string;
  count: number;
}

export interface ActivityLogStats {
  total: number;
  byAction: CountByKey[];
  byModule: CountByKey[];
  byUser: CountByKey[];
}

const activityLogService = {
  getAll: (params?: {
    userId?: string;
    action?: string;
    module?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    pageSize?: number;
  }) => api.get<{ data: PaginatedResult<ActivityLogDto> }>("/api/activity-logs", { params }),

  getStatistics: (params?: { dateFrom?: string; dateTo?: string }) =>
    api.get<{ data: ActivityLogStats }>("/api/activity-logs/statistics", { params }),
};

export default activityLogService;
