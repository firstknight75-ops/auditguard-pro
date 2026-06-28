import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";

export const Route = createFileRoute("/_authenticated/admin/activity")({
  component: ActivityTab,
});

interface LedgerEntry {
  id: string;
  table_name: string;
  record_id: string;
  action: "insert" | "update" | "delete" | "reverse";
  reason: string | null;
  created_by_name: string;
  created_at: string;
  old_value: unknown;
  new_value: unknown;
}

const ACTION_LABEL: Record<LedgerEntry["action"], { label: string; cls: string }> = {
  insert: { label: "إنشاء", cls: "bg-success/15 text-success" },
  update: { label: "تعديل", cls: "bg-warning/15 text-warning-foreground" },
  delete: { label: "حذف", cls: "bg-destructive/15 text-destructive" },
  reverse: { label: "عكس", cls: "bg-muted text-muted-foreground" },
};

const TABLE_LABEL: Record<string, string> = {
  user: "مستخدم",
  user_permission_override: "صلاحية استثنائية",
};

function ActivityTab() {
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await api.get<LedgerEntry[]>("/admin/company/activity");
        setEntries(data);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "تعذّر تحميل السجل");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <div className="text-sm text-muted-foreground">جاري التحميل...</div>;
  if (error) return <div className="text-sm text-destructive">{error}</div>;

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        سجل غير قابل للتعديل لجميع التغييرات في المستخدمين والصلاحيات داخل الشركة.
      </p>
      {entries.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
          لا توجد عمليات بعد.
        </div>
      ) : (
        <ul className="space-y-2">
          {entries.map((e) => {
            const a = ACTION_LABEL[e.action];
            return (
              <li
                key={e.id}
                className="rounded-xl border border-border bg-card p-4 text-sm shadow-sm"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${a.cls}`}>
                    {a.label}
                  </span>
                  <span className="text-foreground">
                    {TABLE_LABEL[e.table_name] ?? e.table_name}
                  </span>
                  <span className="text-muted-foreground">— بواسطة {e.created_by_name}</span>
                  <span className="ms-auto text-xs text-muted-foreground" data-ltr>
                    {new Date(e.created_at).toLocaleString("ar")}
                  </span>
                </div>
                {e.reason && (
                  <div className="mt-2 text-sm text-muted-foreground">السبب: {e.reason}</div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
