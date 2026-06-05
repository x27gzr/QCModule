import { useEffect, useState } from "react";
import { CheckCircleIcon } from "@heroicons/react/24/outline";
import settingsService, {
  type LoginCustomization,
  BACKGROUND_PRESETS, CIRCLE_COLORS, LOGO_SIZES,
} from "@/services/settingsService";
import Logo from "@/assets/appLogo.svg?react";

const PRESET_LABELS: Record<string, string> = {
  "gradient-blue": "Blue", "gradient-purple": "Purple", "gradient-emerald": "Emerald", "gradient-slate": "Slate",
};

const inputCls = "dark:bg-dark-900 dark:text-dark-100 dark:border-dark-600 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50";

export default function SettingsPage() {
  const [form, setForm] = useState<LoginCustomization | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const load = () => {
    setLoading(true);
    settingsService.getLoginCustomization()
      .then(r => setForm(r.data.data))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const set = <K extends keyof LoginCustomization>(key: K, value: LoginCustomization[K]) => {
    setForm(f => f ? { ...f, [key]: value } : f);
    setSaved(false);
  };

  const save = async () => {
    if (!form) return;
    setSaving(true);
    try {
      await settingsService.updateLoginCustomization(form);
      setSaved(true);
    } finally { setSaving(false); }
  };

  const reset = async () => {
    setSaving(true);
    try {
      const r = await settingsService.resetLoginCustomization();
      setForm(r.data.data);
      setSaved(true);
    } finally { setSaving(false); }
  };

  if (loading || !form) {
    return <div className="flex h-64 items-center justify-center"><div className="border-primary-500 size-7 animate-spin rounded-full border-4 border-t-transparent" /></div>;
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* Editor */}
      <div className="dark:bg-dark-800 dark:border-dark-600 border-gray-150 space-y-5 rounded-xl border bg-white p-6 shadow-xs">
        <div>
          <h3 className="dark:text-dark-100 text-base font-semibold text-gray-800">Login Page Customization</h3>
          <p className="dark:text-dark-400 text-sm text-gray-500">Branding shown on the sign-in screen.</p>
        </div>

        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className="dark:text-dark-300 mb-1 block text-sm font-medium text-gray-600">App Title</label>
            <input value={form.appTitle} onChange={e => set("appTitle", e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="dark:text-dark-300 mb-1 block text-sm font-medium text-gray-600">App Subtitle</label>
            <input value={form.appSubtitle} onChange={e => set("appSubtitle", e.target.value)} className={inputCls} />
          </div>
        </div>

        {/* Background preset */}
        <div>
          <label className="dark:text-dark-300 mb-2 block text-sm font-medium text-gray-600">Background</label>
          <div className="grid grid-cols-4 gap-2">
            {Object.keys(BACKGROUND_PRESETS).map(p => (
              <button key={p} onClick={() => set("backgroundPreset", p)}
                className={`h-12 rounded-lg ${BACKGROUND_PRESETS[p]} ring-2 transition ${form.backgroundPreset === p ? "ring-primary-500" : "ring-transparent"}`}
                title={PRESET_LABELS[p]} />
            ))}
          </div>
        </div>

        {/* Circle */}
        <div className="flex items-center justify-between">
          <label className="dark:text-dark-300 text-sm font-medium text-gray-600">Show decorative circle</label>
          <button onClick={() => set("showCircle", !form.showCircle)}
            className={`relative h-6 w-11 rounded-full transition ${form.showCircle ? "bg-primary-600" : "bg-gray-300 dark:bg-dark-600"}`}>
            <span className={`absolute top-0.5 size-5 rounded-full bg-white transition ${form.showCircle ? "left-5.5" : "left-0.5"}`} style={{ left: form.showCircle ? "1.375rem" : "0.125rem" }} />
          </button>
        </div>

        {form.showCircle && (
          <div>
            <label className="dark:text-dark-300 mb-2 block text-sm font-medium text-gray-600">Circle color</label>
            <div className="flex gap-2">
              {Object.entries(CIRCLE_COLORS).map(([name, hex]) => (
                <button key={name} onClick={() => set("circleColor", name)}
                  className={`size-8 rounded-full ring-2 ring-offset-2 transition dark:ring-offset-dark-800 ${form.circleColor === name ? "ring-gray-400" : "ring-transparent"}`}
                  style={{ backgroundColor: hex }} title={name} />
              ))}
            </div>
          </div>
        )}

        {/* Logo size */}
        <div>
          <label className="dark:text-dark-300 mb-1 block text-sm font-medium text-gray-600">Logo size</label>
          <select value={form.logoSize} onChange={e => set("logoSize", e.target.value)} className={inputCls}>
            <option value="small">Small</option>
            <option value="medium">Medium</option>
            <option value="large">Large</option>
          </select>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button onClick={save} disabled={saving}
            className="bg-primary-600 hover:bg-primary-700 rounded-lg px-5 py-2 text-sm font-medium text-white disabled:opacity-60">
            {saving ? "Saving…" : "Save Changes"}
          </button>
          <button onClick={reset} disabled={saving}
            className="dark:text-dark-300 rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 dark:border-dark-600 hover:bg-gray-50 dark:hover:bg-dark-700">
            Reset to Default
          </button>
          {saved && <span className="flex items-center gap-1 text-sm text-emerald-600"><CheckCircleIcon className="size-4" />Saved</span>}
        </div>
      </div>

      {/* Live preview */}
      <div>
        <p className="dark:text-dark-400 mb-2 text-sm text-gray-500">Live preview</p>
        <div className="dark:border-dark-600 border-gray-150 flex h-80 overflow-hidden rounded-xl border shadow-xs">
          {/* Left branded panel */}
          <div className={`relative hidden flex-1 items-center justify-center sm:flex ${BACKGROUND_PRESETS[form.backgroundPreset]}`}>
            {form.showCircle && (
              <div className="absolute size-40 rounded-full opacity-30" style={{ backgroundColor: CIRCLE_COLORS[form.circleColor] }} />
            )}
            <div className="relative z-10 px-6 text-center text-white">
              <Logo className={`mx-auto ${LOGO_SIZES[form.logoSize]}`} />
              <h2 className="mt-4 text-xl font-bold">{form.appTitle || "App Title"}</h2>
              <p className="mt-1 text-sm text-white/80">{form.appSubtitle}</p>
            </div>
          </div>
          {/* Right form mock */}
          <div className="dark:bg-dark-800 flex w-full flex-col justify-center bg-white p-6 sm:max-w-[45%]">
            <p className="dark:text-dark-100 text-lg font-semibold text-gray-700">Welcome Back</p>
            <p className="dark:text-dark-400 mb-4 text-xs text-gray-400">Sign in to continue</p>
            <div className="space-y-2">
              <div className="bg-gray-150 dark:bg-dark-700 h-8 rounded-lg" />
              <div className="bg-gray-150 dark:bg-dark-700 h-8 rounded-lg" />
              <div className="bg-primary-600 h-8 rounded-lg" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
