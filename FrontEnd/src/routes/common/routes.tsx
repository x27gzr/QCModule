import { AUTH_ROUTES, APP_ROUTES } from "./routePaths";
import { lazy } from "react";

const SignIn      = lazy(() => import("@/pages/auth/SignIn"));
const Dashboard   = lazy(() => import("@/pages/dashboard"));
const Users       = lazy(() => import("@/pages/users"));
const Instruments = lazy(() => import("@/pages/instruments"));
const QCSamples   = lazy(() => import("@/pages/qc-samples"));
const TestFiles   = lazy(() => import("@/pages/test-files"));
const QCResults   = lazy(() => import("@/pages/qc-results"));
const DoctorAuth  = lazy(() => import("@/pages/doctor-authorisation"));
const Reports     = lazy(() => import("@/pages/reports"));
const ActivityLogs = lazy(() => import("@/pages/activity-logs"));
const Settings     = lazy(() => import("@/pages/settings"));

export const authRoutes = [
  { path: AUTH_ROUTES.SIGN_IN, element: <SignIn /> },
];

export const appRoutes = [
  { path: APP_ROUTES.DASHBOARD,   element: <Dashboard /> },
  { path: APP_ROUTES.USERS,       element: <Users /> },
  { path: APP_ROUTES.INSTRUMENTS, element: <Instruments /> },
  { path: APP_ROUTES.QC_SAMPLES,  element: <QCSamples /> },
  { path: APP_ROUTES.TEST_FILES,  element: <TestFiles /> },
  { path: APP_ROUTES.QC_RESULTS,  element: <QCResults /> },
  { path: APP_ROUTES.DOCTOR_AUTH, element: <DoctorAuth /> },
  { path: APP_ROUTES.REPORTS,     element: <Reports /> },
  { path: APP_ROUTES.ACTIVITY_LOGS, element: <ActivityLogs /> },
  { path: APP_ROUTES.SETTINGS,      element: <Settings /> },
];
