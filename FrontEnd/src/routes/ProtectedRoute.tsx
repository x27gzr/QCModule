import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/contexts/auth/context";
import { AUTH_ROUTES } from "./common/routePaths";

export default function ProtectedRoute() {
  const { isAuthenticated, isInitializing } = useAuth();

  if (isInitializing) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="border-primary-500 size-8 animate-spin rounded-full border-4 border-t-transparent" />
      </div>
    );
  }

  return isAuthenticated ? <Outlet /> : <Navigate to={AUTH_ROUTES.SIGN_IN} replace />;
}
