import type { UserRole } from "@/@types/user";
import { APP_ROUTES } from "@/routes/common/routePaths";

export interface NavItem {
  label: string;
  path: string;
  iconName: string;
  roles: UserRole[];
}

export const NAV_ITEMS: NavItem[] = [
  {
    label: "Dashboard",
    path: APP_ROUTES.DASHBOARD,
    iconName: "home",
    roles: ["Admin", "Supervisor", "Analyst", "Doctor"],
  },
  {
    label: "Users",
    path: APP_ROUTES.USERS,
    iconName: "users",
    roles: ["Admin"],
  },
  {
    label: "Instruments",
    path: APP_ROUTES.INSTRUMENTS,
    iconName: "beaker",
    roles: ["Admin", "Supervisor", "Analyst"],
  },
  {
    label: "QC Samples",
    path: APP_ROUTES.QC_SAMPLES,
    iconName: "clipboard",
    roles: ["Admin", "Supervisor", "Analyst"],
  },
  {
    label: "Test Files",
    path: APP_ROUTES.TEST_FILES,
    iconName: "document",
    roles: ["Admin", "Supervisor", "Analyst"],
  },
  {
    label: "QC Results",
    path: APP_ROUTES.QC_RESULTS,
    iconName: "chart-bar",
    roles: ["Admin", "Supervisor", "Analyst"],
  },
  {
    label: "Doctor Authorisation",
    path: APP_ROUTES.DOCTOR_AUTH,
    iconName: "shield",
    roles: ["Admin", "Doctor"],
  },
  {
    label: "Reports",
    path: APP_ROUTES.REPORTS,
    iconName: "document-chart",
    roles: ["Admin", "Supervisor", "Doctor"],
  },
  {
    label: "Activity Logs",
    path: APP_ROUTES.ACTIVITY_LOGS,
    iconName: "list",
    roles: ["Admin"],
  },
];

export const getNavForRole = (role: UserRole): NavItem[] =>
  NAV_ITEMS.filter((item) => item.roles.includes(role));
