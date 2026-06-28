import { createFileRoute, Link, Navigate, Outlet } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { PageHeader } from "./_authenticated";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminLayout,
});

const TABS = [
  { to: "/admin/users", label: "المستخدمون", permission: "manage_company_users" },
  { to: "/admin/permissions", label: "الصلاحيات", permission: "manage_permissions" },
  { to: "/admin/branches", label: "الفروع", permission: "manage_company_users" },
  { to: "/admin/activity", label: "السجل", permission: "manage_company_users" },
];

function AdminLayout() {
  const { hasAnyPermission, hasPermission } = useAuth();

  if (!hasAnyPermission(["manage_company_users", "manage_permissions"])) {
    return <Navigate to="/" />;
  }

  const visible = TABS.filter((t) => hasPermission(t.permission));

  return (
    <div>
      <PageHeader
        title="إدارة الشركة"
        subtitle="إدارة مستخدمي شركتك وصلاحياتهم وفروعها — أي تغيير هنا يُسجَّل في سجل المراجعة."
      />

      <div className="mb-6 flex flex-wrap gap-1 border-b border-border">
        {visible.map((t) => (
          <Link
            key={t.to}
            to={t.to}
            className="rounded-t-md border-b-2 border-transparent px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            activeProps={{
              className:
                "rounded-t-md border-b-2 border-primary px-4 py-2 text-sm font-semibold text-foreground",
            }}
          >
            {t.label}
          </Link>
        ))}
      </div>

      <Outlet />
    </div>
  );
}
