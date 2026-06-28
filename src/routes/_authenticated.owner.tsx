import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { PageHeader } from "./_authenticated";

export const Route = createFileRoute("/_authenticated/owner")({
  component: OwnerHome,
});

function OwnerHome() {
  const { user } = useAuth();
  return (
    <div>
      <PageHeader
        title={`مرحباً ${user?.full_name ?? ""}`}
        subtitle="لوحة صاحب الشركة — ستظهر المؤشرات التحليلية في المرحلة الثانية."
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <PlaceholderCard title="مؤشر الثقة" hint="يفعّل في المرحلة 2" />
        <PlaceholderCard title="خريطة الهدر" hint="يفعّل في المرحلة 2" />
        <PlaceholderCard title="تنبيهات المخاطر" hint="يفعّل في المرحلة 2" />
      </div>
    </div>
  );
}

function PlaceholderCard({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
      <div className="text-sm font-semibold text-foreground">{title}</div>
      <div className="mt-2 text-xs text-muted-foreground">{hint}</div>
      <div className="mt-6 h-20 rounded-md bg-muted" />
    </div>
  );
}
