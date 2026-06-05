import { ReactNode, useCallback, useEffect, useState } from "react";
import { AuthContext } from "./context";
import type { AuthUser } from "@/@types/user";
import { setToken } from "@/utils/axios";
import authService from "@/services/authService";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  // On mount: silently restore session using the HttpOnly refresh token cookie.
  useEffect(() => {
    authService
      .refresh()
      .then(({ data }) => {
        const r = data.data;
        setToken(r.accessToken);
        setUser({ userId: r.userId, name: r.name, email: r.email, role: r.role });
      })
      .catch(() => {
        setToken(null);
        setUser(null);
      })
      .finally(() => setIsInitializing(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { data } = await authService.login(email, password);
    const r = data.data;
    setToken(r.accessToken);
    setUser({ userId: r.userId, name: r.name, email: r.email, role: r.role });
  }, []);

  const logout = useCallback(async () => {
    await authService.logout().catch(() => {});
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext
      value={{
        user,
        isAuthenticated: !!user,
        isInitializing,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext>
  );
}
