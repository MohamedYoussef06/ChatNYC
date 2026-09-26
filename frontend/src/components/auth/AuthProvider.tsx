"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

export type UserMode = "authenticated" | "guest" | null;

type AuthContextValue = {
  userMode: UserMode;
  setUserMode: (mode: UserMode) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [userMode, setUserMode] = useState<UserMode>(null);
  const value = useMemo(() => ({ userMode, setUserMode }), [userMode]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthMode() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuthMode must be used within AuthProvider");
  return context;
}
