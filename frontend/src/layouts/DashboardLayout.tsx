import {
  Bell,
  Boxes,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  FileChartColumn,
  FileText,
  Home,
  KeyRound,
  LogOut,
  MapPinned,
  Package,
  ReceiptText,
  Search,
  Settings,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth-context";
import { supabase } from "../lib/supabase";

const navSections = [
  {
    label: "General",
    items: [
      { to: "/", label: "Dashboard", icon: Home },
      { to: "/clients", label: "Clients", icon: Users },
      { to: "/projects", label: "Projects", icon: Building2 },
      { to: "/quotes", label: "Quotes", icon: FileText },
      { to: "/invoices", label: "Invoices", icon: ReceiptText },
    ],
  },
  {
    label: "Tools",
    items: [
      { to: "/team", label: "Team", icon: BriefcaseBusiness },
      { to: "/planning", label: "Planning", icon: CalendarDays },
      { to: "/equipment", label: "Equipment", icon: Boxes },
      { to: "/tracking", label: "Tracking", icon: MapPinned },
      { to: "/stock", label: "Stock", icon: Package },
      { to: "/tasks", label: "Tasks", icon: ClipboardList },
      { to: "/reports", label: "Reports", icon: FileChartColumn },
    ],
  },
  {
    label: "Settings",
    items: [
      { to: "/settings", label: "Company settings", icon: Settings },
      { to: "/account-settings", label: "Account settings", icon: Users },
      { to: "/api-settings", label: "APIs", icon: KeyRound },
    ],
  },
];

const navItems = navSections.flatMap((section) => section.items);

export function DashboardLayout() {
  const { session, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [maintenanceCount, setMaintenanceCount] = useState(0);

  const currentModule =
    navItems.find((item) => item.to === location.pathname)?.label ??
    navItems.find(
      (item) => item.to !== "/" && location.pathname.startsWith(item.to)
    )?.label ??
    "Dashboard";

  const currentModuleIndex = Math.max(
    0,
    navItems.findIndex((item) =>
      item.to === "/"
        ? location.pathname === "/"
        : location.pathname.startsWith(item.to)
    )
  );

  const userInitial = (session?.user?.email?.[0] ?? "U").toUpperCase();
  const userEmail = session?.user?.email ?? "";

  function navigateToAdjacentModule(direction: "previous" | "next") {
    const offset = direction === "previous" ? -1 : 1;
    const nextIndex =
      (currentModuleIndex + offset + navItems.length) % navItems.length;
    navigate(navItems[nextIndex].to);
  }

  useEffect(() => {
    async function loadMaintenanceCount() {
      const { count, error } = await supabase
        .from("inventory_tools")
        .select("id", { count: "exact", head: true })
        .eq("status", "maintenance");

      if (!error) {
        setMaintenanceCount(count ?? 0);
      }
    }

    void loadMaintenanceCount();
  }, []);

  async function handleSignOut() {
    await signOut();
    navigate("/login", { replace: true });
  }

  return (
    <div className={isSidebarCollapsed ? "app-shell sidebar-collapsed" : "app-shell"}>
      <aside className="sidebar">
        <div className="sidebar-top">
          <div className="brand">
            <div className="brand-mark" aria-hidden="true">B</div>
            <span>btp360</span>
          </div>
          <button
            aria-label={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="sidebar-toggle"
            onClick={() => setIsSidebarCollapsed((v) => !v)}
            type="button"
          >
            {isSidebarCollapsed ? (
              <ChevronRight aria-hidden="true" size={16} />
            ) : (
              <ChevronLeft aria-hidden="true" size={16} />
            )}
          </button>
        </div>

        <nav className="nav-list" aria-label="Primary navigation">
          {navSections.map((section) => (
            <div className="nav-section" key={section.label}>
              <span className="nav-section-label">{section.label}</span>
              {section.items.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    className={({ isActive }) =>
                      isActive ? "nav-link nav-link-active" : "nav-link"
                    }
                    key={item.to}
                    to={item.to}
                    title={item.label}
                  >
                    <Icon aria-hidden="true" size={17} />
                    <span>{item.label}</span>
                    {item.to === "/equipment" && maintenanceCount > 0 ? (
                      <em className="nav-count-danger">{maintenanceCount}</em>
                    ) : null}
                  </NavLink>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="sidebar-user">
            <div className="sidebar-user-avatar">{userInitial}</div>
            <div className="sidebar-user-info">
              <strong>{userInitial}</strong>
              <span>{userEmail}</span>
            </div>
          </div>
          <button className="sidebar-logout" onClick={handleSignOut} type="button">
            <LogOut aria-hidden="true" size={16} />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      <main className="main-content">
        <header className="top-bar">
          <div className="top-left">
            <div className="top-arrows">
              <button
                className="icon-button"
                onClick={() => navigateToAdjacentModule("previous")}
                title="Previous module"
                type="button"
              >
                <ChevronLeft aria-hidden="true" size={16} />
              </button>
              <button
                className="icon-button"
                onClick={() => navigateToAdjacentModule("next")}
                title="Next module"
                type="button"
              >
                <ChevronRight aria-hidden="true" size={16} />
              </button>
            </div>
            <div className="top-breadcrumb">
              <span>Pages / {currentModule}</span>
              <strong>{currentModule}</strong>
            </div>
          </div>

          <div className="top-search">
            <Search aria-hidden="true" size={14} />
            <input aria-label="Search anywhere" placeholder="Search anywhere…" />
          </div>

          <div className="top-actions">
            <button className="icon-button" title="Notifications" type="button">
              <Bell aria-hidden="true" size={17} />
            </button>
            <button className="avatar-button" title={userEmail} type="button">
              {userInitial}
            </button>
          </div>
        </header>
        <Outlet />
      </main>
    </div>
  );
}
