'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { AuthUser } from "@/lib/types";
import { ensureCsrfToken, withCsrf } from "@/lib/client/csrf";

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<{ ok: boolean; message?: string }>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

async function parseJson(res: Response) {
  try {
    return await res.json();
  } catch {
    return {};
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/me", { cache: "no-store" });
      if (!res.ok) {
        setUser(null);
        return;
      }
      const body = await res.json();
      setUser(body.user ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load session");
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void ensureCsrfToken().catch(() => {});
    void refresh();
  }, [refresh]);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const res = await fetch(
        "/api/auth/login",
        await withCsrf({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        }),
      );
      const body = await parseJson(res);
      if (!res.ok) {
        return { ok: false, message: body?.error?.message ?? "Login failed" };
      }
      setUser(body.user);
      return { ok: true };
    } catch (err) {
      return { ok: false, message: err instanceof Error ? err.message : "Login failed" };
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", await withCsrf({ method: "POST" }));
    } finally {
      setUser(null);
    }
  }, []);

  const value: AuthContextValue = useMemo(
    () => ({ user, loading, error, login, logout, refresh }),
    [user, loading, error, login, logout, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}


