import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate } from "react-router-dom";
import type { CSSProperties } from "react";
import { LockClosedIcon, EnvelopeIcon } from "@heroicons/react/24/outline";

import { useThemeContext } from "@/contexts/theme/context";
import { useAuth } from "@/contexts/auth/context";
import { APP_ROUTES } from "@/routes/common/routePaths";
import Logo from "@/assets/appLogo.svg?react";
import DashboardCheck from "@/assets/illustrations/dashboard-check.svg?react";
import { Button, Input } from "@/components/ui";

const schema = z.object({
  email: z.string().min(1, "Email is required").email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

type FormValues = z.infer<typeof schema>;

function SignIn() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { primaryColorScheme: primary, lightColorScheme: light, darkColorScheme: dark, isDark } =
    useThemeContext();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    try {
      await login(values.email, values.password);
      navigate(APP_ROUTES.DASHBOARD, { replace: true });
    } catch (err: any) {
      const message = err?.message ?? "Login failed. Please try again.";
      setError("root", { message });
    }
  };

  return (
    <main className="min-h-100vh flex">
      {/* Left panel — illustration */}
      <div className="fixed top-0 hidden p-6 lg:block lg:px-12">
        <div className="flex items-center gap-2">
          <Logo className="size-12" />
          <p className="dark:text-dark-100 text-xl font-semibold text-gray-800 uppercase">
            QC Module
          </p>
        </div>
      </div>
      <div className="hidden w-full place-items-center lg:grid">
        <div className="w-full max-w-lg p-6">
          <DashboardCheck
            style={
              {
                "--primary": primary[500],
                "--dark-500": isDark ? dark[500] : light[200],
                "--dark-600": isDark ? dark[600] : light[100],
                "--dark-700": isDark ? dark[700] : light[300],
                "--dark-450": isDark ? dark[450] : light[400],
                "--dark-800": isDark ? dark[800] : light[400],
              } as CSSProperties
            }
            className="w-full"
          />
          <div className="mt-8 text-center">
            <h1 className="dark:text-dark-100 text-2xl font-bold text-gray-700">
              Laboratory Quality Control
            </h1>
            <p className="dark:text-dark-300 mt-2 text-gray-500">
              Monitor and manage your lab QC data with Westgard Rules
            </p>
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="border-gray-150 dark:bg-dark-700 flex w-full flex-col items-center bg-white lg:max-w-md ltr:border-l rtl:border-r dark:border-transparent">
        <div className="flex w-full max-w-sm grow flex-col justify-center p-5">
          <div className="text-center">
            <Logo className="mx-auto size-16 lg:hidden" />
            <div className="mt-4 lg:mt-0">
              <h2 className="dark:text-dark-100 text-2xl font-semibold text-gray-600">
                Welcome Back
              </h2>
              <p className="dark:text-dark-300 text-gray-400">
                Sign in to your QC Module account
              </p>
            </div>
          </div>

          <form className="mt-10 space-y-4" onSubmit={handleSubmit(onSubmit)}>
            <div>
              <Input
                unstyled
                type="email"
                placeholder="Email address"
                autoComplete="email"
                className="bg-gray-150 focus:ring-primary-500/50 dark:bg-dark-900 dark:placeholder:text-dark-200/70 w-full rounded-lg px-3 py-2 transition-colors placeholder:text-gray-400 focus:ring-3"
                prefix={
                  <EnvelopeIcon className="size-5 transition-colors duration-200" strokeWidth="1" />
                }
                {...register("email")}
              />
              {errors.email && (
                <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>
              )}
            </div>

            <div>
              <Input
                unstyled
                type="password"
                placeholder="Password"
                autoComplete="current-password"
                className="bg-gray-150 focus:ring-primary-500/50 dark:bg-dark-900 dark:placeholder:text-dark-200/70 w-full rounded-lg px-3 py-2 transition-colors placeholder:text-gray-400 focus:ring-3"
                prefix={
                  <LockClosedIcon className="size-5 transition-colors duration-200" strokeWidth="1" />
                }
                {...register("password")}
              />
              {errors.password && (
                <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>
              )}
            </div>

            {errors.root && (
              <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
                {errors.root.message}
              </div>
            )}

            <Button
              color="primary"
              type="submit"
              className="mt-6 h-10 w-full"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Signing in…" : "Sign In"}
            </Button>
          </form>

          <div className="dark:text-dark-300 mt-10 mb-3 flex justify-center text-xs text-gray-400">
            <span>QC Module &copy; {new Date().getFullYear()}</span>
          </div>
        </div>
      </div>
    </main>
  );
}

export default SignIn;
