import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { roleLabelAr, type UserRole } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/admin/users")({
  component: UsersTab,
});

interface CompanyUser {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  branch_id: string | null;
  branch_name: string | null;
  is_active: boolean;
  last_login_at: string | null;
}

interface Branch {
  id: string;
  name: string;
}

function UsersTab() {
  const [users, setUsers] = useState<CompanyUser[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [u, b] = await Promise.all([
        api.get<CompanyUser[]>("/admin/company/users"),
        api.get<Branch[]>("/admin/company/branches"),
      ]);
      setUsers(u);
      setBranches(b);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "تعذّر تحميل البيانات");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function toggleActive(u: CompanyUser) {
    try {
      await api.patch(`/admin/company/users/${u.id}`, { is_active: !u.is_active });
      load();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "فشل التحديث");
    }
  }

  async function resetPassword(u: CompanyUser) {
    if (!confirm(`إرسال رابط إعادة تعيين كلمة المرور إلى ${u.email}؟`)) return;
    try {
      await api.post(`/admin/company/users/${u.id}/password-reset`);
      alert("تم إرسال رابط إعادة التعيين");
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "فشل الإرسال");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {loading ? "جاري التحميل..." : `${users.length} مستخدم`}
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
        >
          + إضافة مستخدم
        </button>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="bg-muted/50 text-xs text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-start font-medium">الاسم</th>
              <th className="px-4 py-3 text-start font-medium">البريد</th>
              <th className="px-4 py-3 text-start font-medium">الدور</th>
              <th className="px-4 py-3 text-start font-medium">الفرع</th>
              <th className="px-4 py-3 text-start font-medium">الحالة</th>
              <th className="px-4 py-3 text-start font-medium">آخر دخول</th>
              <th className="px-4 py-3 text-start font-medium">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t border-border">
                <td className="px-4 py-3 text-foreground">{u.full_name}</td>
                <td className="px-4 py-3 text-muted-foreground" data-ltr>
                  {u.email}
                </td>
                <td className="px-4 py-3 text-muted-foreground">{roleLabelAr(u.role)}</td>
                <td className="px-4 py-3 text-muted-foreground">{u.branch_name ?? "—"}</td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      u.is_active
                        ? "bg-success/15 text-success"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {u.is_active ? "نشط" : "موقوف"}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground" data-ltr>
                  {u.last_login_at ? new Date(u.last_login_at).toLocaleString("ar") : "—"}
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button
                      onClick={() => toggleActive(u)}
                      className="rounded-md border border-input bg-background px-2 py-1 text-xs hover:bg-secondary"
                    >
                      {u.is_active ? "إيقاف" : "تفعيل"}
                    </button>
                    <button
                      onClick={() => resetPassword(u)}
                      className="rounded-md border border-input bg-background px-2 py-1 text-xs hover:bg-secondary"
                    >
                      إعادة تعيين كلمة المرور
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!loading && users.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-sm text-muted-foreground">
                  لا يوجد مستخدمون.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showCreate && (
        <CreateUserDialog
          branches={branches}
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false);
            load();
          }}
        />
      )}
    </div>
  );
}

const CREATABLE_ROLES: UserRole[] = ["owner", "gm", "manager", "auditor", "admin"];

function CreateUserDialog({
  branches,
  onClose,
  onCreated,
}: {
  branches: Branch[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [full_name, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<UserRole>("auditor");
  const [branch_id, setBranchId] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await api.post("/admin/company/users", {
        full_name,
        email,
        role,
        branch_id: branch_id || null,
      });
      onCreated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "فشل الإنشاء");
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
        <h3 className="text-base font-semibold text-foreground">إضافة مستخدم جديد</h3>
        <p className="text-xs text-muted-foreground">
          سيتم تعيين صلاحيات الدور تلقائياً. كلمة المرور يضبطها المستخدم عبر رابط الإعداد.
        </p>

        <div>
          <label className="mb-1 block text-sm font-medium">الاسم الكامل</label>
          <input
            required
            value={full_name}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">البريد الإلكتروني</label>
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
            data-ltr
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium">الدور</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {CREATABLE_ROLES.map((r) => (
                <option key={r} value={r}>
                  {roleLabelAr(r)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">الفرع</label>
            <select
              value={branch_id}
              onChange={(e) => setBranchId(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">—</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {error && <div className="text-sm text-destructive">{error}</div>}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm hover:bg-secondary"
          >
            إلغاء
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
          >
            {submitting ? "جاري الحفظ..." : "حفظ"}
          </button>
        </div>
      </form>
    </div>
  );
}
