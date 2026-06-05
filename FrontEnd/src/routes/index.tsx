import { Suspense } from "react";
import { Route, Routes } from "react-router-dom";
import { authRoutes, appRoutes } from "./common/routes";
import ProtectedRoute from "./ProtectedRoute";
import BaseLayout from "@/layouts/BaseLayout";
import AppLayout from "@/layouts/AppLayout";

const Spinner = () => (
  <div className="flex h-screen items-center justify-center">
    <div className="border-primary-500 size-8 animate-spin rounded-full border-4 border-t-transparent" />
  </div>
);

export default function AppRoutes() {
  return (
    <Suspense fallback={<Spinner />}>
      <Routes>
        {/* Public routes */}
        <Route element={<BaseLayout />}>
          {authRoutes.map((r) => (
            <Route key={r.path} path={r.path} element={r.element} />
          ))}
        </Route>

        {/* Protected routes */}
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            {appRoutes.map((r) => (
              <Route key={r.path} path={r.path} element={r.element} />
            ))}
          </Route>
        </Route>
      </Routes>
    </Suspense>
  );
}
