import { createSafeContext } from "@/utils/createSafeContext";
import type { AuthUser } from "@/@types/user";

export interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isInitializing: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const [AuthContext, useAuth] = createSafeContext<AuthContextValue>(
  "useAuth must be used within AuthProvider"
);
