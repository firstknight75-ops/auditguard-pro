import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useAuth, roleHomePath } from "@/lib/auth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AuditCore — تسجيل الدخول" },
      { name: "description", content: "منصة AuditCore للتدقيق الذكي." },
    ],
  }),
  component: Index,
});

function Index() {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-sm text-muted-foreground">جاري التحميل...</div>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" />;
  return <Navigate to={roleHomePath(user.role)} />;
}
