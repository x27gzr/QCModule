import api from "@/utils/axios";

export interface DashboardStats {
  pendingValidation: number;
  pendingAuthorise: number;
  authorisedToday: number;
  westgardViolations: number;
}

export interface RecentActivity {
  id: string;
  userName: string;
  action: "Authorised" | "Validated" | "Entered";
  parameterName: string;
  sampleName: string;
  value: number;
  flag: string | null;
  validationStatus: string;
  authorisationStatus: string;
  activityTime: string;
}

const dashboardService = {
  getStatistics: () =>
    api.get<{ data: DashboardStats }>("/api/dashboard/statistics"),

  getRecentActivities: (limit = 10) =>
    api.get<{ data: RecentActivity[] }>("/api/dashboard/recent-activities", { params: { limit } }),
};

export default dashboardService;
