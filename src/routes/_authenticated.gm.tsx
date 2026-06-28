import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { PageHeader } from "./_authenticated";

export const Route = createFileRoute("/_authenticated/gm")({
  component: GmHome,
});

function GmHome() {
  const { user } = useAuth();
  return (
    <div>
      <PageHeader
        title={`مرحباً ${user?.full_name ?? ""}`}
        subtitle="لوحة المدير العام."
      />
      <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">
        سيتم تفعيل تقارير الأقسام والصلاحيات المرتبطة بدورك في المرحلة الثانية.
      </div>
    </div>
  );
}
