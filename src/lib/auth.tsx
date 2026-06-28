import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { api, tokenStore, ApiError } from "./api";

export type UserRole =
  | "owner"
  | "gm"
  | "manager"
  | "auditor"
  | "admin"
  | "appowner";

export interface CurrentUser {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  company_id: string;
  branch_id: string | null;
  permissions: string[]; // effective permission codes
}

interface LoginResponse {
  access_token: string;
  refresh_token?: string;
  user: CurrentUser;
}

interface AuthState {
  user: CurrentUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<CurrentUser>;
  logout: () => void;
  refreshMe: () => Promise<void>;
  hasPermission: (code: string) => boolean;
  hasAnyPermission: (codes: string[]) => boolean;
  hasRole: (...roles: UserRole[]) => boolean;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshMe = useCallback(async () => {
    if (!tokenStore.access) {
      setUser(null);
      return;
    }
    try {
      const me = await api.get<CurrentUser>("/auth/me");
      setUser(me);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        tokenStore.clear();
      }
      setUser(null);
    }
  }, []);

  useEffect(() => {
    (async () => {
      await refreshMe();
      setLoading(false);
    })();
  }, [refreshMe]);

  const login = useCallback(async (email: string, password: string) => {
    const data = await api.post<LoginResponse>("/auth/login", { email, password });
    tokenStore.set(data.access_token, data.refresh_token);
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(() => {
    tokenStore.clear();
    setUser(null);
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      user,
      loading,
      login,
      logout,
      refreshMe,
      hasPermission: (code) => !!user?.permissions.includes(code),
      hasAnyPermission: (codes) => !!user && codes.some((c) => user.permissions.includes(c)),
      hasRole: (...roles) => !!user && roles.includes(user.role),
    }),
    [user, loading, login, logout, refreshMe],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}

export function roleHomePath(role: UserRole): string {
  switch (role) {
    case "owner":
      return "/owner";
    case "gm":
      return "/gm";
    case "manager":
      return "/manager";
    case "auditor":
      return "/auditor";
    case "admin":
      return "/admin/users";
    case "appowner":
      return "/owner"; // App Owner lands on its own area; placeholder for Phase 4
  }
}

export function roleLabelAr(role: UserRole): string {
  switch (role) {
    case "owner":
      return "صاحب الشركة";
    case "gm":
      return "المدير العام";
    case "manager":
      return "مدير القسم";
    case "auditor":
      return "المدقق";
    case "admin":
      return "مسؤول النظام (العميل)";
    case "appowner":
      return "مالك التطبيق";
  }
}
