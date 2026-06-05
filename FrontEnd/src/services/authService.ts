import api from "@/utils/axios";
import type { AuthResponse } from "@/@types/user";

interface ApiResult<T> {
  succeeded: boolean;
  data: T;
  message?: string;
}

const authService = {
  login: (email: string, password: string) =>
    api.post<ApiResult<AuthResponse>>("/api/auth/login", { email, password }),

  refresh: () =>
    api.post<ApiResult<AuthResponse>>("/api/auth/refresh"),

  logout: () =>
    api.post("/api/auth/logout"),
};

export default authService;
