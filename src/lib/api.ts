// HTTP client for the on-prem FastAPI backend.
// Backend base URL is configured via VITE_API_BASE_URL.
// JWT (access + refresh) is held in localStorage; access token is sent as Bearer.
// All Arabic error messages from the backend are surfaced verbatim.

const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, "") ||
  "http://localhost:8000";

const ACCESS_KEY = "auditcore.access_token";
const REFRESH_KEY = "auditcore.refresh_token";

export const tokenStore = {
  get access() {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(ACCESS_KEY);
  },
  get refresh() {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(REFRESH_KEY);
  },
  set(access: string, refresh?: string) {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(ACCESS_KEY, access);
    if (refresh) window.localStorage.setItem(REFRESH_KEY, refresh);
  },
  clear() {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(ACCESS_KEY);
    window.localStorage.removeItem(REFRESH_KEY);
  },
};

export class ApiError extends Error {
  status: number;
  detail: unknown;
  constructor(status: number, detail: unknown, message: string) {
    super(message);
    this.status = status;
    this.detail = detail;
  }
}

type RequestOptions = {
  method?: string;
  body?: unknown;
  formData?: FormData;
  headers?: Record<string, string>;
  signal?: AbortSignal;
  // when true, do NOT attempt token refresh on 401 (used by refresh itself)
  skipRefresh?: boolean;
  onUploadProgress?: (loaded: number, total: number) => void;
};

async function refreshAccessToken(): Promise<boolean> {
  const refresh = tokenStore.refresh;
  if (!refresh) return false;
  try {
    const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refresh }),
    });
    if (!res.ok) return false;
    const data = (await res.json()) as { access_token: string; refresh_token?: string };
    tokenStore.set(data.access_token, data.refresh_token);
    return true;
  } catch {
    return false;
  }
}

async function rawRequest<T>(path: string, opts: RequestOptions): Promise<T> {
  const url = `${API_BASE_URL}${path}`;
  const headers: Record<string, string> = { ...(opts.headers ?? {}) };
  const access = tokenStore.access;
  if (access) headers["Authorization"] = `Bearer ${access}`;

  let body: BodyInit | undefined;
  if (opts.formData) {
    body = opts.formData;
    // browser sets Content-Type with boundary; do not override
  } else if (opts.body !== undefined) {
    body = JSON.stringify(opts.body);
    headers["Content-Type"] = headers["Content-Type"] ?? "application/json";
  }

  const res = await fetch(url, {
    method: opts.method ?? "GET",
    headers,
    body,
    signal: opts.signal,
  });

  if (res.status === 204) return undefined as T;

  const text = await res.text();
  let parsed: unknown = null;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = text;
    }
  }

  if (!res.ok) {
    // Try a one-shot refresh on 401, then retry once.
    if (res.status === 401 && !opts.skipRefresh) {
      const refreshed = await refreshAccessToken();
      if (refreshed) {
        return rawRequest<T>(path, { ...opts, skipRefresh: true });
      }
      tokenStore.clear();
    }
    const detail =
      (parsed as { detail?: unknown } | null)?.detail ?? parsed ?? res.statusText;
    const message =
      typeof detail === "string" ? detail : "حدث خطأ أثناء الاتصال بالخادم";
    throw new ApiError(res.status, detail, message);
  }

  return parsed as T;
}

export const api = {
  get: <T>(path: string, opts?: Omit<RequestOptions, "method" | "body" | "formData">) =>
    rawRequest<T>(path, { ...opts, method: "GET" }),
  post: <T>(path: string, body?: unknown, opts?: Omit<RequestOptions, "method" | "body">) =>
    rawRequest<T>(path, { ...opts, method: "POST", body }),
  patch: <T>(path: string, body?: unknown, opts?: Omit<RequestOptions, "method" | "body">) =>
    rawRequest<T>(path, { ...opts, method: "PATCH", body }),
  delete: <T>(path: string, opts?: Omit<RequestOptions, "method">) =>
    rawRequest<T>(path, { ...opts, method: "DELETE" }),
  upload: <T>(
    path: string,
    formData: FormData,
    opts?: { onUploadProgress?: (loaded: number, total: number) => void; signal?: AbortSignal },
  ): Promise<T> => {
    // Use XHR for upload progress events (fetch lacks them without streams).
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", `${API_BASE_URL}${path}`);
      const access = tokenStore.access;
      if (access) xhr.setRequestHeader("Authorization", `Bearer ${access}`);
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable && opts?.onUploadProgress) {
          opts.onUploadProgress(e.loaded, e.total);
        }
      };
      xhr.onload = () => {
        const text = xhr.responseText;
        let parsed: unknown = null;
        if (text) {
          try {
            parsed = JSON.parse(text);
          } catch {
            parsed = text;
          }
        }
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(parsed as T);
        } else {
          const detail =
            (parsed as { detail?: unknown } | null)?.detail ?? parsed ?? xhr.statusText;
          const message =
            typeof detail === "string" ? detail : "فشل رفع الملف";
          reject(new ApiError(xhr.status, detail, message));
        }
      };
      xhr.onerror = () =>
        reject(new ApiError(0, null, "تعذّر الاتصال بالخادم"));
      if (opts?.signal) {
        opts.signal.addEventListener("abort", () => xhr.abort());
      }
      xhr.send(formData);
    });
  },
};

export { API_BASE_URL };
