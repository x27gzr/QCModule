import { Outlet, useLocation } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { NAV_ITEMS } from "./navigation";

function getPageTitle(pathname: string): string {
  const match = NAV_ITEMS.find((item) => item.path === pathname);
  return match?.label ?? "QC Module";
}

export default function AppLayout() {
  const { pathname } = useLocation();

  return (
    <div className="dark:bg-dark-900 flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar title={getPageTitle(pathname)} />
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
