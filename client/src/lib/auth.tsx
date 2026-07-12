import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import {
  apiPost,
  apiGet,
  getToken,
  setToken,
  clearToken,
  registerUnauthorizedHandler,
} from "./apiClient";
import { useRouter } from "./router";
import type { User, Role } from "./types";

interface AuthState {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  hasRole: (...roles: Role[]) => boolean;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { navigate } = useRouter();

  const logout = useCallback(() => {
    clearToken();
    setUser(null);
  }, []);

  registerUnauthorizedHandler(logout);

  const refreshUser = useCallback(async () => {
    if (!getToken()) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const res = await apiGet<{ user: User }>("/auth/me");
      setUser(res.user);
    } catch {
      clearToken();
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await apiPost<{ user: User; token: string }>("/auth/login", {
        email,
        password,
      });
      setToken(res.token);
      setUser(res.user);
      // Explicitly land on the dashboard after a successful login,
      // regardless of whatever route the hash was sitting on before
      // (e.g. left on #/notifications from a prior expired session).
      // The role-based permission guard in App.tsx only redirects when
      // the current route is DISALLOWED for the user's role — it won't
      // catch this case since 'notifications' is allowed for every role.
      navigate("dashboard");
    },
    [navigate],
  );

  const signup = useCallback(
    async (name: string, email: string, password: string) => {
      const res = await apiPost<{ user: User; token: string }>("/auth/signup", {
        name,
        email,
        password,
      });
      setToken(res.token);
      setUser(res.user);
      navigate("dashboard");
    },
    [navigate],
  );

  const hasRole = useCallback(
    (...roles: Role[]) => (user ? roles.includes(user.role) : false),
    [user],
  );

  return (
    <AuthContext.Provider
      value={{ user, loading, login, signup, logout, hasRole, refreshUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
