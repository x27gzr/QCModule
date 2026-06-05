import api from "@/utils/axios";

export interface LoginCustomization {
  backgroundPreset: string;
  circleColor: string;
  showCircle: boolean;
  logoSize: string;
  appTitle: string;
  appSubtitle: string;
}

// Shared visual mappings used by both the Settings editor and the SignIn page.
export const BACKGROUND_PRESETS: Record<string, string> = {
  "gradient-blue":    "bg-gradient-to-br from-blue-500 to-indigo-600",
  "gradient-purple":  "bg-gradient-to-br from-purple-500 to-fuchsia-600",
  "gradient-emerald": "bg-gradient-to-br from-emerald-500 to-teal-600",
  "gradient-slate":   "bg-gradient-to-br from-slate-700 to-slate-900",
};

export const CIRCLE_COLORS: Record<string, string> = {
  blue:   "#3b82f6",
  purple: "#a855f7",
  green:  "#22c55e",
  red:    "#ef4444",
  orange: "#f97316",
  teal:   "#14b8a6",
};

export const LOGO_SIZES: Record<string, string> = {
  small:  "size-12",
  medium: "size-16",
  large:  "size-24",
};

const settingsService = {
  getLoginCustomization: () =>
    api.get<{ data: LoginCustomization }>("/api/settings/login-customization"),

  updateLoginCustomization: (payload: LoginCustomization) =>
    api.put<{ data: LoginCustomization }>("/api/settings/login-customization", payload),

  resetLoginCustomization: () =>
    api.post<{ data: LoginCustomization }>("/api/settings/login-customization/reset"),
};

export default settingsService;
