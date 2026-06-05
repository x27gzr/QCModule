import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate } from "react-router-dom";
import { LockClosedIcon, EnvelopeIcon } from "@heroicons/react/24/outline";

import { useAuth } from "@/contexts/auth/context";
import { APP_ROUTES } from "@/routes/common/routePaths";
import Logo from "@/assets/appLogo.svg?react";
import { Button, Input } from "@/components/ui";
import settingsService, {
  type LoginCustomization,
  BACKGROUND_PRESETS, CIRCLE_COLORS, LOGO_SIZES,
} from "@/services/settingsService";

const schema = z.object({
  email: z.string().min(1, "Email is required").email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

type FormValues = z.infer<typeof schema>;

const DEFAULT_BRANDING: LoginCustomization = {
  backgroundPreset: "gradient-blue",
  circleColor: "blue",
  showCircle: true,
  logoSize: "medium",
  appTitle: "QC Module",
  appSubtitle: "Laboratory Quality Control",
};

function SignIn() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [branding, setBranding] = useState<LoginCustomization>(DEFAULT_BRANDING);

  useEffect(() => {
    settingsService.getLoginCustomization()
      .then(r => setBranding(r.data.data))
      .catch(() => {/* keep defaults */});
  }, []);

  const {
    register, handleSubmit, setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    try {
      await login(values.email, values.password);
      navigate(APP_ROUTES.DASHBOARD, { replace: true });
    } catch (err: any) {
      setError("root", { message: err?.message ?? "Login failed. Please try again." });
    }
  };

  const bgClass   = BACKGROUND_PRESETS[branding.backgroundPreset] ?? BACKGROUND_PRESETS["gradient-blue"];
  const logoClass = LOGO_SIZES[branding.logoSize] ?? LOGO_SIZES["medium"];

  return (
    <main className="min-h-100vh flex">
      {/* Left — branded panel */}
      <div className={`relative hidden w-full place-items-center lg:grid ${bgClass}`}>
        {branding.showCircle && (
          <div className="absolute size-96 rounded-full opacity-20"
            style={{ backgroundColor: CIRCLE_COLORS[branding.circleColor] ?? CIRCLE_COLORS.blue }} />
        )}
        <div className="relative z-10 px-8 text-center text-white">
          <Logo className={`mx-auto ${logoClass}`} />
          <h1 className="mt-6 text-3xl font-bold">{branding.appTitle}</h1>
          <p className="mt-2 text-white/80">{branding.appSubtitle}</p>
        </div>
      </div>

      {/* Right — form */}
      <div className="border-gray-150 dark:bg-dark-700 flex w-full flex-col items-center bg-white lg:max-w-md ltr:border-l rtl:border-r dark:border-transparent">
        <div className="flex w-full max-w-sm grow flex-col justify-center p-5">
          <div className="text-center">
            <Logo className={`mx-auto ${logoClass} lg:hidden`} />
            <div className="mt-4 lg:mt-0">
              <h2 className="dark:text-dark-100 text-2xl font-semibold text-gray-600">Welcome Back</h2>
              <p className="dark:text-dark-300 text-gray-400">Sign in to your {branding.appTitle} account</p>
            </div>
          </div>

          <form className="mt-10 space-y-4" onSubmit={handleSubmit(onSubmit)}>
            <div>
              <Input
                unstyled type="email" placeholder="Email address" autoComplete="email"
                className="bg-gray-150 focus:ring-primary-500/50 dark:bg-dark-900 dark:placeholder:text-dark-200/70 w-full rounded-lg px-3 py-2 transition-colors placeholder:text-gray-400 focus:ring-3"
                prefix={<EnvelopeIcon className="size-5 transition-colors duration-200" strokeWidth="1" />}
                {...register("email")}
              />
              {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>}
            </div>

            <div>
              <Input
                unstyled type="password" placeholder="Password" autoComplete="current-password"
                className="bg-gray-150 focus:ring-primary-500/50 dark:bg-dark-900 dark:placeholder:text-dark-200/70 w-full rounded-lg px-3 py-2 transition-colors placeholder:text-gray-400 focus:ring-3"
                prefix={<LockClosedIcon className="size-5 transition-colors duration-200" strokeWidth="1" />}
                {...register("password")}
              />
              {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>}
            </div>

            {errors.root && (
              <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
                {errors.root.message}
              </div>
            )}

            <Button color="primary" type="submit" className="mt-6 h-10 w-full" disabled={isSubmitting}>
              {isSubmitting ? "Signing in…" : "Sign In"}
            </Button>
          </form>

          <div className="dark:text-dark-300 mt-10 mb-3 flex justify-center text-xs text-gray-400">
            <span>{branding.appTitle} &copy; {new Date().getFullYear()}</span>
          </div>
        </div>
      </div>
    </main>
  );
}

export default SignIn;
