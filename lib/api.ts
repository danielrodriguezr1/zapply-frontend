// Capa de acceso al backend. El frontend NUNCA llama a TMDB directamente: todo pasa por aqui.

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:8080";

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
  const res = await fetch(`${BASE_URL}/api/v1/trending`);
  if (!res.ok) {
    throw new Error(`El backend respondio ${res.status}`);
  }
  return res.json();
}

// URL base de las imagenes de TMDB (los posters vienen como rutas relativas).
export function posterUrl(path?: string): string | undefined {
  return path ? `https://image.tmdb.org/t/p/w342${path}` : undefined;
}
