// Capa de acceso al backend. El frontend NUNCA llama a TMDB directamente: todo pasa por aqui.

import { clearTokens, getTokens, saveTokens } from "./secureStorage";

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:8080";
const API_V1 = `${BASE_URL}/api/v1`;

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

// El backend serializa en snake_case (misma convencion que usa para TMDB).
export type AuthUser = {
  id: string;
  username: string;
  email: string;
  display_name: string | null;
  // null = todavia no ha elegido plataformas (hace falta el onboarding).
  region: string | null;
};

export type AuthResponse = {
  access_token: string;
  refresh_token: string;
  user: AuthUser;
};

async function parseErrorMessage(res: Response): Promise<string> {
  try {
    const body = await res.json();
    return body.error ?? `El backend respondio ${res.status}`;
  } catch {
    return `El backend respondio ${res.status}`;
  }
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_V1}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new ApiError(res.status, await parseErrorMessage(res));
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export function register(username: string, email: string, password: string): Promise<AuthResponse> {
  return postJson<AuthResponse>("/auth/register", { username, email, password });
}

export function login(email: string, password: string): Promise<AuthResponse> {
  return postJson<AuthResponse>("/auth/login", { email, password });
}

export function refreshTokens(refreshToken: string): Promise<AuthResponse> {
  return postJson<AuthResponse>("/auth/refresh", { refresh_token: refreshToken });
}

export function logoutRequest(refreshToken: string): Promise<void> {
  return postJson<void>("/auth/logout", { refresh_token: refreshToken });
}

export function getMe(accessToken: string): Promise<AuthUser> {
  return fetch(`${API_V1}/users/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  }).then(async (res) => {
    if (!res.ok) throw new ApiError(res.status, await parseErrorMessage(res));
    return res.json();
  });
}

// Se avisa a AuthContext cuando ni el access token ni el refresh sirven, para que
// limpie la sesion y la app vuelva a Login. Se registra una unica vez al arrancar.
let onSessionExpired: (() => void) | null = null;
export function setSessionExpiredHandler(handler: () => void) {
  onSessionExpired = handler;
}

// fetch autenticado: adjunta el access token y, si la respuesta es 401,
// intenta refrescar una vez con el refresh token guardado y repite la llamada.
export async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const tokens = await getTokens();
  const withAuth = (accessToken: string): RequestInit => ({
    ...options,
    headers: { ...(options.headers ?? {}), Authorization: `Bearer ${accessToken}` },
  });

  if (!tokens) {
    onSessionExpired?.();
    throw new ApiError(401, "No hay sesion iniciada");
  }

  let res = await fetch(`${API_V1}${path}`, withAuth(tokens.accessToken));

  if (res.status === 401) {
    try {
      const refreshed = await refreshTokens(tokens.refreshToken);
      await saveTokens({ accessToken: refreshed.access_token, refreshToken: refreshed.refresh_token });
      res = await fetch(`${API_V1}${path}`, withAuth(refreshed.access_token));
    } catch {
      await clearTokens();
      onSessionExpired?.();
      throw new ApiError(401, "Sesion expirada");
    }
  }

  return res;
}

async function apiFetchJson<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await apiFetch(path, options);
  if (!res.ok) {
    throw new ApiError(res.status, await parseErrorMessage(res));
  }
  return res.json();
}

export type Platform = {
  id: number;
  name: string;
  logo_path: string | null;
};

export type UserPlatforms = {
  region: string | null;
  platforms: Platform[];
};

export function getPlatforms(region: string): Promise<Platform[]> {
  return apiFetchJson<Platform[]>(`/platforms?region=${encodeURIComponent(region)}`);
}

export function getUserPlatforms(): Promise<UserPlatforms> {
  return apiFetchJson<UserPlatforms>("/users/me/platforms");
}

export function setUserPlatforms(region: string, platformIds: number[]): Promise<UserPlatforms> {
  return apiFetchJson<UserPlatforms>("/users/me/platforms", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ region, platform_ids: platformIds }),
  });
}

// URL de los logos de plataforma (misma CDN de imagenes que TMDB usa para posters).
export function platformLogoUrl(path: string | null): string | undefined {
  return path ? `https://image.tmdb.org/t/p/w154${path}` : undefined;
}

export type TmdbTitle = {
  id: number;
  title?: string; // peliculas
  name?: string; // series
  overview?: string;
  poster_path?: string;
  vote_average?: number;
  media_type?: string;
};

export type TmdbPage = {
  page: number;
  results: TmdbTitle[];
  total_pages: number;
  total_results: number;
};

export async function getTrending(): Promise<TmdbPage> {
  const res = await fetch(`${API_V1}/trending`);
  if (!res.ok) {
    throw new Error(`El backend respondio ${res.status}`);
  }
  return res.json();
}

// URL base de las imagenes de TMDB (los posters vienen como rutas relativas).
export function posterUrl(path?: string): string | undefined {
  return path ? `https://image.tmdb.org/t/p/w342${path}` : undefined;
}
