import { NavLink } from "react-router-dom";
import {
  HomeIcon,
  UsersIcon,
  BeakerIcon,
  ClipboardDocumentListIcon,
  ChartBarIcon,
  DocumentChartBarIcon,
} from "@heroicons/react/24/outline";
import {
  HomeIcon as HomeSolid,
  UsersIcon as UsersSolid,
  BeakerIcon as BeakerSolid,
  ClipboardDocumentListIcon as ClipboardSolid,
  ChartBarIcon as ChartSolid,
  DocumentChartBarIcon as DocChartSolid,
} from "@heroicons/react/24/solid";
import Logo from "@/assets/appLogo.svg?react";
import { useAuth } from "@/contexts/auth/context";
import { getNavForRole } from "./navigation";

const ICONS: Record<string, { outline: React.ElementType; solid: React.ElementType }> = {
  home:          { outline: HomeIcon,                    solid: HomeSolid },
  users:         { outline: UsersIcon,                   solid: UsersSolid },
  beaker:        { outline: BeakerIcon,                  solid: BeakerSolid },
  clipboard:     { outline: ClipboardDocumentListIcon,   solid: ClipboardSolid },
  "chart-bar":   { outline: ChartBarIcon,                solid: ChartSolid },
  "document-chart": { outline: DocumentChartBarIcon,     solid: DocChartSolid },
};

export function Sidebar() {
  const { user } = useAuth();
  const navItems = user ? getNavForRole(user.role) : [];

  return (
    <aside className="dark:bg-dark-800 flex h-full w-64 flex-col bg-white shadow-sm">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 px-6">
        <Logo className="size-9" />
        <span className="dark:text-dark-100 text-base font-bold tracking-wide text-gray-700 uppercase">
          QC Module
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const icons = ICONS[item.iconName];
            return (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  className={({ isActive }) =>
                    [
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-400"
                        : "text-gray-600 hover:bg-gray-100 dark:text-dark-300 dark:hover:bg-dark-700",
                    ].join(" ")
                  }
                >
                  {({ isActive }) => {
                    const Icon = isActive ? icons.solid : icons.outline;
                    return (
                      <>
                        <Icon className="size-5 shrink-0" />
                        <span>{item.label}</span>
                      </>
                    );
                  }}
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User info at bottom */}
      {user && (
        <div className="border-gray-150 dark:border-dark-600 border-t px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400 flex size-9 items-center justify-center rounded-full text-sm font-semibold">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="dark:text-dark-100 truncate text-sm font-medium text-gray-800">
                {user.name}
              </p>
              <p className="dark:text-dark-400 truncate text-xs text-gray-500">{user.role}</p>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
