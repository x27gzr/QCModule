import axios, { AxiosError } from "axios";

const api = axios.create({ baseURL: "/" });

// Module-level token — updated by AuthProvider on login/refresh/logout.
let _token: string | null = null;

export const setToken = (token: string | null) => {
  _token = token;
};

// Attach access token to every request.
api.interceptors.request.use((config) => {
  if (_token) config.headers.Authorization = `Bearer ${_token}`;
  return config;
});

// On 401: attempt a silent refresh, then retry the original request once.
// A separate plain axios instance is used for the refresh call to avoid loops.
api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as typeof error.config & { _retry?: boolean };

    if (error.response?.status === 401 && !original?._retry) {
      original!._retry = true;
      try {
        const { data } = await axios.post<{ data: { accessToken: string } }>(
          "/api/auth/refresh"
        );
        const newToken = data.data.accessToken;
        setToken(newToken);
        original!.headers!.Authorization = `Bearer ${newToken}`;
        return api(original!);
      } catch {
        // Refresh failed — clear token and let callers handle the 401.
        setToken(null);
      }
    }

    return Promise.reject((error.response?.data as any) ?? error);
  }
);

export default api;
