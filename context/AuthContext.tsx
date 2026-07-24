import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from "react";
import {
  AuthUser,
  getMe,
  login as loginRequest,
  logoutRequest,
  refreshTokens,
  register as registerRequest,
  setSessionExpiredHandler,
} from "../lib/api";
import { clearTokens, getTokens, saveTokens } from "../lib/secureStorage";

type AuthContextValue = {
  user: AuthUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setUserRegion: (region: string) => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Si apiFetch no consigue refrescar la sesion en ningun otro sitio de la app,
  // avisa aqui para que el estado global se limpie y la navegacion vuelva a Login.
  useEffect(() => {
    setSessionExpiredHandler(() => setUser(null));
  }, []);

  // Al arrancar: si hay tokens guardados, valida la sesion. El access token dura poco
  // (15 min), asi que si ya caduco se intenta refrescar antes de rendirse.
  useEffect(() => {
    (async () => {
      const tokens = await getTokens();
      if (!tokens) {
        setIsLoading(false);
        return;
      }
      try {
        const me = await getMe(tokens.accessToken);
        setUser(me);
      } catch {
        try {
          const refreshed = await refreshTokens(tokens.refreshToken);
          await saveTokens({ accessToken: refreshed.access_token, refreshToken: refreshed.refresh_token });
          setUser(refreshed.user);
        } catch {
          await clearTokens();
          setUser(null);
        }
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const response = await loginRequest(email, password);
    await saveTokens({ accessToken: response.access_token, refreshToken: response.refresh_token });
    setUser(response.user);
  }, []);

  const register = useCallback(async (username: string, email: string, password: string) => {
    const response = await registerRequest(username, email, password);
    await saveTokens({ accessToken: response.access_token, refreshToken: response.refresh_token });
    setUser(response.user);
  }, []);

  const logout = useCallback(async () => {
    const tokens = await getTokens();
    if (tokens) {
      try {
        await logoutRequest(tokens.refreshToken);
      } catch {
        // aunque el backend no responda, la sesion se cierra igualmente en el dispositivo
      }
    }
    await clearTokens();
    setUser(null);
  }, []);

  // Tras guardar plataformas en el onboarding/perfil, refleja la region al instante
  // (sin esperar a otra llamada) para que el guard de navegacion reaccione ya.
  const setUserRegion = useCallback((region: string) => {
    setUser((prev) => (prev ? { ...prev, region } : prev));
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout, setUserRegion }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return ctx;
}
