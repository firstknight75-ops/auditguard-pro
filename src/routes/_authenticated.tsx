import { createFileRoute, Link, Navigate, Outlet, useNavigate } from "@tanstack/react-router";
import { useAuth, roleLabelAr, type UserRole } from "@/lib/auth";
import type { ReactNode } from "react";

export const Route = createFileRoute("/_authenticated")({
  component: AuthenticatedLayout,
});

interface NavItem {
  to: string;
  label: string;
  roles?: UserRole[];
  permission?: string;
}

const NAV: NavItem[] = [
  { to: "/owner", label: "لوحة المالك", roles: ["owner"] },
  { to: "/gm", label: "المدير العام", roles: ["gm"] },
  { to: "/manager", label: "مدير القسم", roles: ["manager"] },
  { to: "/auditor", label: "رفع المستندات", roles: ["auditor"] },
  { to: "/admin/users", label: "إدارة الشركة", permission: "manage_company_users" },
];

function AuthenticatedLayout() {
  const { user, loading, logout, hasPermission } = useAuth();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-sm text-muted-foreground">جاري التحميل...</div>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" />;

  const visibleNav = NAV.filter((n) => {
    if (n.permission) return hasPermission(n.permission);
    if (n.roles) return n.roles.includes(user.role);
    return true;
  });

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold">
              A
            </div>
            <div>
              <div className="text-sm font-bold text-foreground">AuditCore</div>
              <div className="text-xs text-muted-foreground">منصة محلية</div>
            </div>
          </div>

          <nav className="hidden flex-1 items-center justify-center gap-1 md:flex">
            {visibleNav.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                activeProps={{
                  className:
                    "rounded-md px-3 py-2 text-sm font-medium bg-secondary text-foreground",
                }}
              >
                {n.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <div className="hidden text-end sm:block">
              <div className="text-sm font-semibold text-foreground">{user.full_name}</div>
              <div className="text-xs text-muted-foreground">{roleLabelAr(user.role)}</div>
            </div>
            <button
              onClick={() => {
                logout();
                navigate({ to: "/login", replace: true });
              }}
              className="rounded-md border border-input bg-background px-3 py-2 text-sm font-medium text-foreground hover:bg-secondary"
            >
              تسجيل الخروج
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-8">
        <Outlet />
      </main>

      <footer className="border-t border-border bg-card">
        <div className="mx-auto max-w-7xl px-6 py-4 text-center text-xs text-muted-foreground">
          البيانات لا تغادر مكتب الشركة — جميع العمليات تتم محلياً على خوادمكم.
        </div>
      </footer>
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {actions}
    </div>
  );
}
