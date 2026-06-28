import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { PageHeader } from "./_authenticated";

export const Route = createFileRoute("/_authenticated/manager")({
  component: ManagerHome,
});

function ManagerHome() {
  const { user } = useAuth();
  return (
    <div>
      <PageHeader
        title={`مرحباً ${user?.full_name ?? ""}`}
        subtitle="لوحة مدير القسم."
      />
      <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">
        لوحة القسم ستعرض المؤشرات المسموح بها لدورك أو وفق الصلاحيات الاستثنائية الممنوحة لك.
      </div>
    </div>
  );
}
