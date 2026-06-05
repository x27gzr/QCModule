import { lazy } from "react";
import { AUTH_ROUTES, APP_ROUTES } from "./routePaths";

const SignIn      = lazy(() => import("@/pages/auth/SignIn"));
const Dashboard   = lazy(() => import("@/pages/dashboard"));
const Users       = lazy(() => import("@/pages/users"));
const Instruments = lazy(() => import("@/pages/instruments"));
const QCSamples   = lazy(() => import("@/pages/qc-samples"));

export const authRoutes = [
  { path: AUTH_ROUTES.SIGN_IN, element: <SignIn /> },
];

export const appRoutes = [
  { path: APP_ROUTES.DASHBOARD,   element: <Dashboard /> },
  { path: APP_ROUTES.USERS,       element: <Users /> },
  { path: APP_ROUTES.INSTRUMENTS, element: <Instruments /> },
  { path: APP_ROUTES.QC_SAMPLES,  element: <QCSamples /> },
  { path: APP_ROUTES.QC_RESULTS,  element: <PlaceholderPage title="QC Results" /> },
  { path: APP_ROUTES.REPORTS,     element: <PlaceholderPage title="Reports" /> },
];

function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="dark:bg-dark-800 dark:border-dark-600 border-gray-150 flex h-64 items-center justify-center rounded-xl border bg-white shadow-xs">
      <div className="text-center">
        <p className="dark:text-dark-100 text-lg font-semibold text-gray-600">{title}</p>
        <p className="dark:text-dark-400 mt-1 text-sm text-gray-400">This feature is coming soon.</p>
      </div>
    </div>
  );
}
