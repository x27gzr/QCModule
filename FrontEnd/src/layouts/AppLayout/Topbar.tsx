import { ArrowRightStartOnRectangleIcon, BellIcon, SunIcon, MoonIcon } from "@heroicons/react/24/outline";
import { useAuth } from "@/contexts/auth/context";
import { useThemeContext } from "@/contexts/theme/context";
import { useNavigate } from "react-router-dom";
import { AUTH_ROUTES } from "@/routes/common/routePaths";

interface TopbarProps {
  title?: string;
}

export function Topbar({ title }: TopbarProps) {
  const { user, logout } = useAuth();
  const { isDark, setThemeMode } = useThemeContext();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate(AUTH_ROUTES.SIGN_IN, { replace: true });
  };

  const toggleDark = () => setThemeMode(isDark ? "light" : "dark");

  return (
    <header className="dark:bg-dark-800 dark:border-dark-600 border-gray-150 flex h-16 items-center justify-between border-b bg-white px-6">
      <h1 className="dark:text-dark-100 text-lg font-semibold text-gray-700">
        {title ?? "Dashboard"}
      </h1>

      <div className="flex items-center gap-2">
        {/* Dark mode toggle */}
        <button
          onClick={toggleDark}
          title={isDark ? "Switch to light mode" : "Switch to dark mode"}
          className="dark:text-dark-300 dark:hover:bg-dark-700 rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100"
        >
          {isDark ? <SunIcon className="size-5" /> : <MoonIcon className="size-5" />}
        </button>

        <button className="dark:text-dark-300 dark:hover:bg-dark-700 rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100">
          <BellIcon className="size-5" />
        </button>

        <div className="bg-gray-150 dark:bg-dark-600 mx-2 h-6 w-px" />

        <div className="dark:text-dark-300 hidden text-sm text-gray-600 sm:block">
          {user?.name}
        </div>

        <button
          onClick={handleLogout}
          title="Sign out"
          className="dark:text-dark-300 dark:hover:bg-dark-700 flex items-center gap-1.5 rounded-lg p-2 text-sm text-gray-500 transition-colors hover:bg-gray-100 hover:text-red-600 dark:hover:text-red-400"
        >
          <ArrowRightStartOnRectangleIcon className="size-5" />
          <span className="hidden sm:inline">Sign out</span>
        </button>
      </div>
    </header>
  );
}
