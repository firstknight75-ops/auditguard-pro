import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";

export const Route = createFileRoute("/_authenticated/admin/branches")({
  component: BranchesTab,
});

interface Branch {
  id: string;
  name: string;
  location: string | null;
  user_count: number;
}

function BranchesTab() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [newLocation, setNewLocation] = useState("");
  const [creating, setCreating] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const data = await api.get<Branch[]>("/admin/company/branches");
      setBranches(data);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "تعذّر التحميل");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function createBranch(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    try {
      await api.post("/admin/company/branches", { name: newName, location: newLocation });
      setNewName("");
      setNewLocation("");
      load();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "فشل الإنشاء");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="space-y-6">
      <form
        onSubmit={createBranch}
        className="flex flex-wrap items-end gap-3 rounded-2xl border border-border bg-card p-4"
      >
        <div className="flex-1 min-w-[180px]">
          <label className="mb-1 block text-sm font-medium">اسم الفرع</label>
          <input
            required
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </div>
        <div className="flex-1 min-w-[180px]">
          <label className="mb-1 block text-sm font-medium">الموقع</label>
          <input
            value={newLocation}
            onChange={(e) => setNewLocation(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </div>
        <button
          type="submit"
          disabled={creating}
          className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
        >
          + إضافة فرع
        </button>
      </form>

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
              <th className="px-4 py-3 text-start font-medium">الموقع</th>
              <th className="px-4 py-3 text-start font-medium">عدد المستخدمين</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-sm text-muted-foreground">
                  جاري التحميل...
                </td>
              </tr>
            ) : branches.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-sm text-muted-foreground">
                  لا توجد فروع بعد.
                </td>
              </tr>
            ) : (
              branches.map((b) => (
                <tr key={b.id} className="border-t border-border">
                  <td className="px-4 py-3 text-foreground">{b.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{b.location ?? "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{b.user_count}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
