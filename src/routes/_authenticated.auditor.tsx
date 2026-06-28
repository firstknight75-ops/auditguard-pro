import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { useDropzone, type FileRejection } from "react-dropzone";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { PageHeader } from "./_authenticated";

export const Route = createFileRoute("/_authenticated/auditor")({
  component: AuditorHome,
});

const CATEGORIES: { value: string; label: string }[] = [
  { value: "invoice", label: "فاتورة" },
  { value: "bank_statement", label: "كشف حساب بنكي" },
  { value: "contract", label: "عقد" },
  { value: "inventory_report", label: "تقرير جرد" },
  { value: "accounting_encrypted", label: "تقرير محاسبي مشفر" },
  { value: "other", label: "أخرى" },
];

const ACCEPTED: Record<string, string[]> = {
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
  "text/csv": [".csv"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/tiff": [".tiff"],
  "application/pdf": [".pdf"],
  "application/json": [".json"],
};

const MAX_SIZE = 50 * 1024 * 1024;

interface UploadedDoc {
  id: string;
  original_filename: string;
  file_type: string;
  doc_category: string;
  status: string;
  created_at: string;
}

interface UploadItem {
  id: string;
  file: File;
  category: string;
  progress: number;
  status: "queued" | "uploading" | "done" | "error";
  error?: string;
}

function AuditorHome() {
  const { user } = useAuth();
  const [queue, setQueue] = useState<UploadItem[]>([]);
  const [defaultCategory, setDefaultCategory] = useState("invoice");
  const [myUploads, setMyUploads] = useState<UploadedDoc[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  const refreshUploads = useCallback(async () => {
    setLoadingList(true);
    setListError(null);
    try {
      const data = await api.get<UploadedDoc[]>("/documents/my-uploads");
      setMyUploads(data);
    } catch (err) {
      setListError(err instanceof ApiError ? err.message : "تعذّر تحميل قائمة المرفوعات");
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => {
    refreshUploads();
  }, [refreshUploads]);

  const onDrop = useCallback(
    (accepted: File[], rejections: FileRejection[]) => {
      const newItems: UploadItem[] = accepted.map((f) => ({
        id: crypto.randomUUID(),
        file: f,
        category: defaultCategory,
        progress: 0,
        status: "queued",
      }));
      const rejectedItems: UploadItem[] = rejections.map((r) => ({
        id: crypto.randomUUID(),
        file: r.file,
        category: defaultCategory,
        progress: 0,
        status: "error",
        error: r.errors[0]?.code === "file-too-large"
          ? "حجم الملف يتجاوز 50 ميجابايت"
          : "نوع الملف غير مدعوم",
      }));
      setQueue((q) => [...rejectedItems, ...newItems, ...q]);
    },
    [defaultCategory],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED,
    maxSize: MAX_SIZE,
    multiple: true,
  });

  async function uploadItem(item: UploadItem) {
    setQueue((q) =>
      q.map((x) => (x.id === item.id ? { ...x, status: "uploading", progress: 0 } : x)),
    );
    const fd = new FormData();
    fd.append("file", item.file);
    fd.append("doc_category", item.category);
    try {
      await api.upload<UploadedDoc>("/documents/upload", fd, {
        onUploadProgress: (loaded, total) => {
          const pct = Math.round((loaded / total) * 100);
          setQueue((q) => q.map((x) => (x.id === item.id ? { ...x, progress: pct } : x)));
        },
      });
      setQueue((q) =>
        q.map((x) => (x.id === item.id ? { ...x, status: "done", progress: 100 } : x)),
      );
      refreshUploads();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "فشل رفع الملف";
      setQueue((q) =>
        q.map((x) => (x.id === item.id ? { ...x, status: "error", error: msg } : x)),
      );
    }
  }

  async function uploadAll() {
    const pending = queue.filter((q) => q.status === "queued");
    for (const item of pending) {
      // sequential to keep progress UI clear; could be parallelized
      // eslint-disable-next-line no-await-in-loop
      await uploadItem(item);
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title={`مرحباً ${user?.full_name ?? ""}`}
        subtitle="ارفع المستندات المسؤول عنها. لن تظهر لك أي مخرجات تحليلية — هذا قيد معماري في النظام."
      />

      <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-foreground">رفع مستندات جديدة</h2>
          <div className="flex items-center gap-2">
            <label className="text-sm text-muted-foreground">التصنيف الافتراضي</label>
            <select
              value={defaultCategory}
              onChange={(e) => setDefaultCategory(e.target.value)}
              className="rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div
          {...getRootProps()}
          className={`rounded-xl border-2 border-dashed p-10 text-center transition-colors ${
            isDragActive
              ? "border-primary bg-primary/5"
              : "border-border bg-muted/30 hover:bg-muted/60"
          }`}
        >
          <input {...getInputProps()} />
          <div className="text-sm font-medium text-foreground">
            {isDragActive ? "أفلت الملفات هنا..." : "اسحب الملفات وأفلتها هنا، أو انقر للاختيار"}
          </div>
          <div className="mt-2 text-xs text-muted-foreground">
            الأنواع المدعومة: xlsx, csv, docx, jpg, png, tiff, pdf, json — بحد أقصى 50 ميجابايت
          </div>
        </div>

        {queue.length > 0 && (
          <div className="mt-6 space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium text-foreground">قائمة الرفع</div>
              <div className="flex gap-2">
                <button
                  onClick={() => setQueue([])}
                  className="rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground hover:bg-secondary"
                >
                  تفريغ
                </button>
                <button
                  onClick={uploadAll}
                  disabled={!queue.some((q) => q.status === "queued")}
                  className="rounded-md bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  رفع الكل
                </button>
              </div>
            </div>
            <ul className="space-y-2">
              {queue.map((item) => (
                <li
                  key={item.id}
                  className="rounded-lg border border-border bg-background p-3 text-sm"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium text-foreground">
                        {item.file.name}
                      </div>
                      <div className="mt-0.5 text-xs text-muted-foreground">
                        {(item.file.size / 1024 / 1024).toFixed(2)} م.ب —{" "}
                        {CATEGORIES.find((c) => c.value === item.category)?.label}
                      </div>
                    </div>
                    <StatusPill status={item.status} />
                  </div>
                  {item.status === "uploading" && (
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full bg-primary transition-all"
                        style={{ width: `${item.progress}%` }}
                      />
                    </div>
                  )}
                  {item.status === "error" && item.error && (
                    <div className="mt-2 text-xs text-destructive">{item.error}</div>
                  )}
                  {item.status === "done" && (
                    <div className="mt-2 text-xs text-success">تم الرفع بنجاح</div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <h2 className="mb-4 text-base font-semibold text-foreground">المرفوعات السابقة</h2>
        {loadingList && <div className="text-sm text-muted-foreground">جاري التحميل...</div>}
        {listError && <div className="text-sm text-destructive">{listError}</div>}
        {!loadingList && !listError && myUploads.length === 0 && (
          <div className="text-sm text-muted-foreground">لا توجد مرفوعات بعد.</div>
        )}
        {!loadingList && myUploads.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-xs text-muted-foreground">
                <tr className="border-b border-border">
                  <th className="px-3 py-2 text-start font-medium">اسم الملف</th>
                  <th className="px-3 py-2 text-start font-medium">النوع</th>
                  <th className="px-3 py-2 text-start font-medium">التصنيف</th>
                  <th className="px-3 py-2 text-start font-medium">الحالة</th>
                  <th className="px-3 py-2 text-start font-medium">تاريخ الرفع</th>
                </tr>
              </thead>
              <tbody>
                {myUploads.map((d) => (
                  <tr key={d.id} className="border-b border-border last:border-0">
                    <td className="px-3 py-2 text-foreground">{d.original_filename}</td>
                    <td className="px-3 py-2 text-muted-foreground">{d.file_type}</td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {CATEGORIES.find((c) => c.value === d.doc_category)?.label ?? d.doc_category}
                    </td>
                    <td className="px-3 py-2"><StatusPill status={d.status as UploadItem["status"]} /></td>
                    <td className="px-3 py-2 text-muted-foreground" data-ltr>
                      {new Date(d.created_at).toLocaleString("ar")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    queued: { label: "بالانتظار", cls: "bg-muted text-muted-foreground" },
    uploading: { label: "يرفع...", cls: "bg-warning/15 text-warning-foreground" },
    done: { label: "تم", cls: "bg-success/15 text-success" },
    error: { label: "خطأ", cls: "bg-destructive/15 text-destructive" },
    pending: { label: "بالانتظار", cls: "bg-muted text-muted-foreground" },
    ocr_processing: { label: "قيد المعالجة", cls: "bg-warning/15 text-warning-foreground" },
    certified: { label: "موثّق", cls: "bg-success/15 text-success" },
  };
  const v = map[status] ?? { label: status, cls: "bg-muted text-muted-foreground" };
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${v.cls}`}>
      {v.label}
    </span>
  );
}
