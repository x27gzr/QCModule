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
    roles: ["Admin", "Supervisor", "Analyst"],
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
    label: "Reports",
    path: APP_ROUTES.REPORTS,
    iconName: "document-chart",
    roles: ["Admin", "Supervisor"],
  },
];

export const getNavForRole = (role: UserRole): NavItem[] =>
  NAV_ITEMS.filter((item) => item.roles.includes(role));
