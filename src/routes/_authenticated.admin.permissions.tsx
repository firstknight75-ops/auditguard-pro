import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { roleLabelAr, type UserRole } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/admin/permissions")({
  component: PermissionsTab,
});

interface PermissionDef {
  id: string;
  code: string;
  description: string;
  category: "dashboard" | "export" | "admin" | "app_owner";
}

interface MatrixUser {
  id: string;
  full_name: string;
  role: UserRole;
}

// matrix[user_id][permission_code] = effective state for that pair
type CellState = "default_grant" | "default_revoke" | "override_grant" | "override_revoke";

interface MatrixResponse {
  users: MatrixUser[];
  permissions: PermissionDef[];
  matrix: Record<string, Record<string, CellState>>;
}

const CATEGORY_LABEL: Record<PermissionDef["category"], string> = {
  dashboard: "اللوحات",
  export: "التصدير",
  admin: "الإدارة",
  app_owner: "مالك التطبيق",
};

function PermissionsTab() {
  const [data, setData] = useState<MatrixResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<{
    user: MatrixUser;
    permission: PermissionDef;
    current: CellState;
  } | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<MatrixResponse>("/admin/company/permissions-matrix");
      setData(res);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "تعذّر تحميل المصفوفة");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  if (loading) return <div className="text-sm text-muted-foreground">جاري التحميل...</div>;
  if (error) return <div className="text-sm text-destructive">{error}</div>;
  if (!data) return null;

  // group permissions by category, hide app_owner (Company Admin cannot grant it)
  const grouped = data.permissions
    .filter((p) => p.category !== "app_owner")
    .reduce<Record<string, PermissionDef[]>>((acc, p) => {
      (acc[p.category] ||= []).push(p);
      return acc;
    }, {});

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-warning/40 bg-warning/5 p-3 text-xs text-foreground">
        صلاحيات فئة "مالك التطبيق" غير متاحة من هذه اللوحة — تُدار حصراً من جهة مزوّد النظام.
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="bg-muted/50 text-xs text-muted-foreground">
            <tr>
              <th className="sticky start-0 z-10 bg-muted/50 px-4 py-3 text-start font-medium">
                الصلاحية
              </th>
              {data.users.map((u) => (
                <th key={u.id} className="px-3 py-3 text-center font-medium">
                  <div className="text-foreground">{u.full_name}</div>
                  <div className="text-[10px] text-muted-foreground">{roleLabelAr(u.role)}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Object.entries(grouped).map(([cat, perms]) => (
              <>
                <tr key={`cat-${cat}`} className="bg-secondary/40">
                  <td
                    colSpan={data.users.length + 1}
                    className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-foreground"
                  >
                    {CATEGORY_LABEL[cat as PermissionDef["category"]]}
                  </td>
                </tr>
                {perms.map((p) => (
                  <tr key={p.id} className="border-t border-border">
                    <td className="sticky start-0 z-10 bg-card px-4 py-2">
                      <div className="font-mono text-xs text-foreground" data-ltr>
                        {p.code}
                      </div>
                      <div className="text-xs text-muted-foreground">{p.description}</div>
                    </td>
                    {data.users.map((u) => {
                      const state = data.matrix[u.id]?.[p.code] ?? "default_revoke";
                      return (
                        <td key={u.id} className="px-3 py-2 text-center">
                          <Cell
                            state={state}
                            onClick={() => setEditing({ user: u, permission: p, current: state })}
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </>
            ))}
          </tbody>
        </table>
      </div>

      <Legend />

      {editing && (
        <GrantRevokeDialog
          user={editing.user}
          permission={editing.permission}
          current={editing.current}
          onClose={() => setEditing(null)}
          onDone={() => {
            setEditing(null);
            load();
          }}
        />
      )}
    </div>
  );
}

function Cell({ state, onClick }: { state: CellState; onClick: () => void }) {
  const map: Record<CellState, { icon: string; cls: string; title: string }> = {
    default_grant: {
      icon: "✓",
      cls: "bg-muted text-muted-foreground",
      title: "ممنوحة افتراضياً (من الدور)",
    },
    default_revoke: {
      icon: "—",
      cls: "bg-muted/50 text-muted-foreground/60",
      title: "غير ممنوحة افتراضياً",
    },
    override_grant: {
      icon: "✓",
      cls: "bg-success/15 text-success ring-1 ring-success/40",
      title: "ممنوحة باستثناء (override)",
    },
    override_revoke: {
      icon: "✕",
      cls: "bg-destructive/15 text-destructive ring-1 ring-destructive/40",
      title: "ممنوعة باستثناء (override)",
    },
  };
  const v = map[state];
  return (
    <button
      onClick={onClick}
      title={v.title}
      className={`inline-flex h-7 w-7 items-center justify-center rounded-md text-sm font-bold transition-transform hover:scale-110 ${v.cls}`}
    >
      {v.icon}
    </button>
  );
}

function Legend() {
  return (
    <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
      <span className="inline-flex items-center gap-1.5">
        <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-muted text-foreground">
          ✓
        </span>
        افتراضي من الدور
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-success/15 text-success ring-1 ring-success/40">
          ✓
        </span>
        منح استثنائي
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-destructive/15 text-destructive ring-1 ring-destructive/40">
          ✕
        </span>
        إلغاء استثنائي
      </span>
    </div>
  );
}

function GrantRevokeDialog({
  user,
  permission,
  current,
  onClose,
  onDone,
}: {
  user: MatrixUser;
  permission: PermissionDef;
  current: CellState;
  onClose: () => void;
  onDone: () => void;
}) {
  const hasOverride = current === "override_grant" || current === "override_revoke";
  const defaultEffect: "grant" | "revoke" =
    current === "default_grant" ? "revoke" : "grant";
  const [effect, setEffect] = useState<"grant" | "revoke">(defaultEffect);
  const [reason, setReason] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const endpoint =
        effect === "grant"
          ? "/admin/company/permissions/grant"
          : "/admin/company/permissions/revoke";
      await api.post(endpoint, {
        user_id: user.id,
        permission_code: permission.code,
        reason,
        expires_at: expiresAt || null,
      });
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "فشلت العملية");
    } finally {
      setSubmitting(false);
    }
  }

  async function clearOverride() {
    setSubmitting(true);
    setError(null);
    try {
      await api.post("/admin/company/permissions/clear-override", {
        user_id: user.id,
        permission_code: permission.code,
        reason: reason || "إزالة الاستثناء",
      });
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "فشلت العملية");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4">
      <form
        onSubmit={submit}
        className="w-full max-w-md space-y-4 rounded-2xl border border-border bg-card p-6 shadow-lg"
      >
        <div>
          <h3 className="text-base font-semibold text-foreground">
            تعديل صلاحية: <span className="font-mono text-sm" data-ltr>{permission.code}</span>
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            للمستخدم: {user.full_name} — {roleLabelAr(user.role)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            الحالة الحالية:{" "}
            {{
              default_grant: "ممنوحة افتراضياً",
              default_revoke: "غير ممنوحة افتراضياً",
              override_grant: "منح استثنائي قائم",
              override_revoke: "إلغاء استثنائي قائم",
            }[current]}
          </p>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setEffect("grant")}
            className={`flex-1 rounded-md border px-3 py-2 text-sm ${
              effect === "grant"
                ? "border-success bg-success/10 text-success"
                : "border-input bg-background text-foreground"
            }`}
          >
            منح
          </button>
          <button
            type="button"
            onClick={() => setEffect("revoke")}
            className={`flex-1 rounded-md border px-3 py-2 text-sm ${
              effect === "revoke"
                ? "border-destructive bg-destructive/10 text-destructive"
                : "border-input bg-background text-foreground"
            }`}
          >
            منع
          </button>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">
            السبب <span className="text-destructive">*</span>
          </label>
          <textarea
            required
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="مثال: صلاحية مؤقتة لمراجعة خريطة الهدر — طلب صاحب الشركة"
            rows={3}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">
            تاريخ انتهاء الصلاحية (اختياري)
          </label>
          <input
            type="date"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            data-ltr
          />
          <p className="mt-1 text-xs text-muted-foreground">
            عند انتهاء التاريخ، يعود المستخدم تلقائياً إلى صلاحيات دوره.
          </p>
        </div>

        {error && <div className="text-sm text-destructive">{error}</div>}

        <div className="flex flex-wrap justify-end gap-2">
          {hasOverride && (
            <button
              type="button"
              onClick={clearOverride}
              disabled={submitting}
              className="me-auto rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground hover:bg-secondary"
            >
              إزالة الاستثناء
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm hover:bg-secondary"
          >
            إلغاء
          </button>
          <button
            type="submit"
            disabled={submitting || !reason.trim()}
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
          >
            {submitting ? "جاري الحفظ..." : "حفظ"}
          </button>
        </div>
      </form>
    </div>
  );
}
