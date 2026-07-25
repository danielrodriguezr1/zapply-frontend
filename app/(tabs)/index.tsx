import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useAuth } from "../../context/AuthContext";
import {
  ApiError,
  getDiscover,
  getPlatforms,
  getUserPlatforms,
  platformLogoUrl,
  posterUrl,
  type DiscoverItem,
  type DiscoverParams,
  type Platform,
  type QuickFilter,
} from "../../lib/api";
import { MOVIE_GENRES, TV_GENRES } from "../../lib/genres";

type MediaType = "movie" | "tv";

const RATING_OPTIONS: { label: string; value?: number }[] = [
  { label: "Cualquiera", value: undefined },
  { label: "5+", value: 5 },
  { label: "6+", value: 6 },
  { label: "7+", value: 7 },
  { label: "8+", value: 8 },
  { label: "9+", value: 9 },
];

// Unificado: "ordenar por" y los filtros rapidos son el mismo concepto (como se ordena
// el resultado), asi que viven en una unica lista dentro de la hoja de filtros en vez de
// duplicarse entre una fila aparte arriba y una seccion dentro del panel.
type OrderOption =
  | { kind: "sort"; label: string; sortBy?: "votes" }
  | { kind: "quick"; label: string; quickFilter: QuickFilter };

const ORDER_OPTIONS: OrderOption[] = [
  { kind: "sort", label: "Popularidad", sortBy: undefined },
  { kind: "sort", label: "Número de votos", sortBy: "votes" },
  { kind: "quick", label: "Mejor valoradas", quickFilter: "top_rated" },
  { kind: "quick", label: "En tendencia", quickFilter: "trending" },
  { kind: "quick", label: "En estreno", quickFilter: "new_releases" },
];

type RangePreset = { label: string; min?: number; max?: number };

const YEAR_PRESETS: RangePreset[] = [
  { label: "2020s", min: 2020, max: 2029 },
  { label: "2010s", min: 2010, max: 2019 },
  { label: "2000s", min: 2000, max: 2009 },
  { label: "90s", min: 1990, max: 1999 },
  { label: "80s", min: 1980, max: 1989 },
  { label: "Antes de 1980", max: 1979 },
];

const MOVIE_RUNTIME_PRESETS: RangePreset[] = [
  { label: "< 90 min", max: 89 },
  { label: "90-105 min", min: 90, max: 105 },
  { label: "105-120 min", min: 105, max: 120 },
  { label: "> 120 min", min: 121 },
];

// Duracion de series = media por episodio (asi la devuelve with_runtime en TMDB),
// escala muy distinta a la de peliculas (20-60 min habitual, no 90-180).
const TV_RUNTIME_PRESETS: RangePreset[] = [
  { label: "< 30 min", max: 29 },
  { label: "30-45 min", min: 30, max: 45 },
  { label: "45-60 min", min: 46, max: 60 },
  { label: "> 60 min", min: 61 },
];

function matchesPreset(min: number | undefined, max: number | undefined, presets: RangePreset[]): boolean {
  return presets.some((p) => p.min === min && p.max === max);
}

type PlatformMode = "any" | "mine" | "custom";

type SheetFilters = {
  includedGenres: number[];
  excludedGenres: number[];
  ratingMin?: number;
  yearMin?: number;
  yearMax?: number;
  runtimeMin?: number;
  runtimeMax?: number;
  sortBy?: "votes";
  quickFilter?: QuickFilter;
  platformMode: PlatformMode;
  customPlatformIds: number[];
};

const EMPTY_SHEET_FILTERS: SheetFilters = {
  includedGenres: [],
  excludedGenres: [],
  platformMode: "any",
  customPlatformIds: [],
};

export default function Descubrir() {
  const { user } = useAuth();

  const [mediaType, setMediaType] = useState<MediaType>("movie");

  const [appliedFilters, setAppliedFilters] = useState<SheetFilters>(EMPTY_SHEET_FILTERS);
  const [draftFilters, setDraftFilters] = useState<SheetFilters>(EMPTY_SHEET_FILTERS);
  const [filtersVisible, setFiltersVisible] = useState(false);
  const [yearCustomOpen, setYearCustomOpen] = useState(false);
  const [runtimeCustomOpen, setRuntimeCustomOpen] = useState(false);

  const [myPlatformIds, setMyPlatformIds] = useState<number[]>([]);
  const [availablePlatforms, setAvailablePlatforms] = useState<Platform[]>([]);

  const [items, setItems] = useState<DiscoverItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const genres = mediaType === "movie" ? MOVIE_GENRES : TV_GENRES;
  const runtimePresets = mediaType === "movie" ? MOVIE_RUNTIME_PRESETS : TV_RUNTIME_PRESETS;
  const runtimeSectionLabel = mediaType === "movie" ? "Duración" : "Duración por episodio";

  // Los filtros arrancan vacios (incluido plataformas: "Cualquiera" por defecto). Se cargan
  // las plataformas guardadas del usuario solo para tenerlas listas como atajo ("Mis
  // plataformas"/"Personalizado"), no se aplican solas.
  useEffect(() => {
    getUserPlatforms()
      .then((result) => setMyPlatformIds(result.platforms.map((p) => p.id)))
      .catch(() => {
        // sin plataformas guardadas (o fallo puntual): el atajo "Mis plataformas" no aparecera
      });
  }, []);

  useEffect(() => {
    if (!user?.region) return;
    getPlatforms(user.region).then(setAvailablePlatforms).catch(() => setAvailablePlatforms([]));
  }, [user?.region]);

  const buildParams = useCallback(
    (pageNum: number): DiscoverParams => ({
      mediaType,
      genres: appliedFilters.includedGenres,
      excludeGenres: appliedFilters.excludedGenres,
      ratingMin: appliedFilters.ratingMin,
      yearMin: appliedFilters.yearMin,
      yearMax: appliedFilters.yearMax,
      runtimeMin: appliedFilters.runtimeMin,
      runtimeMax: appliedFilters.runtimeMax,
      sortBy: appliedFilters.sortBy,
      platforms:
        appliedFilters.platformMode === "mine"
          ? myPlatformIds
          : appliedFilters.platformMode === "custom"
            ? appliedFilters.customPlatformIds
            : undefined,
      quickFilter: appliedFilters.quickFilter,
      page: pageNum,
    }),
    [mediaType, appliedFilters, myPlatformIds]
  );

  useEffect(() => {
    setLoading(true);
    setError(null);
    getDiscover(buildParams(1))
      .then((result) => {
        setItems(result.results);
        setPage(result.page);
        setTotalPages(result.total_pages);
      })
      .catch((e) => setError(e instanceof ApiError ? e.message : "No se pudo conectar con el backend"))
      .finally(() => setLoading(false));
  }, [buildParams]);

  function onChangeMediaType(next: MediaType) {
    if (next === mediaType) return;
    setMediaType(next);
    // Los generos no coinciden siempre entre peliculas y series, y la duracion tiene
    // una escala completamente distinta (episodio vs. pelicula entera): se resetean
    // al cambiar de pestana para no arrastrar un filtro que ya no tiene sentido
    // (era justo lo que provocaba que Series devolviera casi 0 resultados).
    const reset = { includedGenres: [], excludedGenres: [], runtimeMin: undefined, runtimeMax: undefined };
    setAppliedFilters((prev) => ({ ...prev, ...reset }));
    setDraftFilters((prev) => ({ ...prev, ...reset }));
    setRuntimeCustomOpen(false);
  }

  function openFilters() {
    setDraftFilters(appliedFilters);
    setYearCustomOpen(
      !!(appliedFilters.yearMin || appliedFilters.yearMax) &&
        !matchesPreset(appliedFilters.yearMin, appliedFilters.yearMax, YEAR_PRESETS)
    );
    setRuntimeCustomOpen(
      !!(appliedFilters.runtimeMin || appliedFilters.runtimeMax) &&
        !matchesPreset(appliedFilters.runtimeMin, appliedFilters.runtimeMax, runtimePresets)
    );
    setFiltersVisible(true);
  }

  function selectYearPreset(preset: RangePreset) {
    setYearCustomOpen(false);
    setDraftFilters((prev) => ({ ...prev, yearMin: preset.min, yearMax: preset.max }));
  }

  function selectRuntimePreset(preset: RangePreset) {
    setRuntimeCustomOpen(false);
    setDraftFilters((prev) => ({ ...prev, runtimeMin: preset.min, runtimeMax: preset.max }));
  }

  function applyFilters() {
    setAppliedFilters(draftFilters);
    setFiltersVisible(false);
  }

  function selectOrder(option: OrderOption) {
    setDraftFilters((prev) => ({
      ...prev,
      sortBy: option.kind === "sort" ? option.sortBy : undefined,
      quickFilter: option.kind === "quick" ? option.quickFilter : undefined,
    }));
  }

  function toggleGenre(id: number) {
    setDraftFilters((prev) => {
      if (prev.includedGenres.includes(id)) {
        return { ...prev, includedGenres: prev.includedGenres.filter((g) => g !== id), excludedGenres: [...prev.excludedGenres, id] };
      }
      if (prev.excludedGenres.includes(id)) {
        return { ...prev, excludedGenres: prev.excludedGenres.filter((g) => g !== id) };
      }
      return { ...prev, includedGenres: [...prev.includedGenres, id] };
    });
  }

  function togglePlatform(id: number) {
    setDraftFilters((prev) => ({
      ...prev,
      customPlatformIds: prev.customPlatformIds.includes(id)
        ? prev.customPlatformIds.filter((p) => p !== id)
        : [...prev.customPlatformIds, id],
    }));
  }

  function loadMore() {
    if (loading || loadingMore || page >= totalPages) return;
    setLoadingMore(true);
    getDiscover(buildParams(page + 1))
      .then((result) => {
        setItems((prev) => [...prev, ...result.results]);
        setPage(result.page);
        setTotalPages(result.total_pages);
      })
      .catch(() => {
        // fallo al paginar: se deja lo ya cargado, sin bloquear la pantalla
      })
      .finally(() => setLoadingMore(false));
  }

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (appliedFilters.includedGenres.length || appliedFilters.excludedGenres.length) count++;
    if (appliedFilters.ratingMin) count++;
    if (appliedFilters.yearMin || appliedFilters.yearMax) count++;
    if (appliedFilters.runtimeMin || appliedFilters.runtimeMax) count++;
    if (appliedFilters.sortBy || appliedFilters.quickFilter) count++;
    if (appliedFilters.platformMode === "mine" || (appliedFilters.platformMode === "custom" && appliedFilters.customPlatformIds.length)) {
      count++;
    }
    return count;
  }, [appliedFilters]);

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <View style={styles.tabs}>
          <Pressable
            style={[styles.tab, mediaType === "movie" && styles.tabActive]}
            onPress={() => onChangeMediaType("movie")}
          >
            <Text style={[styles.tabText, mediaType === "movie" && styles.tabTextActive]}>Películas</Text>
          </Pressable>
          <Pressable
            style={[styles.tab, mediaType === "tv" && styles.tabActive]}
            onPress={() => onChangeMediaType("tv")}
          >
            <Text style={[styles.tabText, mediaType === "tv" && styles.tabTextActive]}>Series</Text>
          </Pressable>
        </View>

        <Pressable style={styles.filterButton} onPress={openFilters}>
          <Ionicons name="options-outline" size={18} color="#111" />
          <Text style={styles.filterButtonText}>Filtros{activeFilterCount ? ` (${activeFilterCount})` : ""}</Text>
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.title}>No se pudo conectar con el backend</Text>
          <Text style={styles.dim}>{error}</Text>
        </View>
      ) : (
        <FlatList
          key="grid-3-cols"
          data={items}
          keyExtractor={(item) => `${item.media_type}-${item.id}`}
          numColumns={3}
          contentContainerStyle={styles.list}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.dim}>
                {appliedFilters.quickFilter === "trending"
                  ? "No hay títulos del último año disponibles con estos filtros. Prueba a quitar el filtro de plataformas o cambia a \"Mejor valoradas\"."
                  : "No hay resultados con estos filtros."}
              </Text>
            </View>
          }
          ListFooterComponent={loadingMore ? <ActivityIndicator style={styles.footerLoader} /> : null}
          renderItem={({ item }) => <TitleCard item={item} />}
        />
      )}

      {filtersVisible ? (
        <View style={styles.overlayContainer}>
          <Pressable style={styles.overlayBackdrop} onPress={() => setFiltersVisible(false)} />
          <View style={styles.sheet}>
            <ScrollView>
              <Text style={styles.sheetTitle}>Filtros</Text>

              <Text style={styles.sectionLabel}>Género (toca para incluir, otra vez para excluir)</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
                {genres.map((g) => {
                  const included = draftFilters.includedGenres.includes(g.id);
                  const excluded = draftFilters.excludedGenres.includes(g.id);
                  return (
                    <Pressable
                      key={g.id}
                      style={[styles.chip, included && styles.chipIncluded, excluded && styles.chipExcluded]}
                      onPress={() => toggleGenre(g.id)}
                    >
                      <Text style={[styles.chipText, included && styles.chipTextIncluded, excluded && styles.chipTextExcluded]}>
                        {excluded ? "✕ " : ""}
                        {g.name}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>

              <Text style={styles.sectionLabel}>Año</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
                {YEAR_PRESETS.map((preset) => {
                  const selected = !yearCustomOpen && draftFilters.yearMin === preset.min && draftFilters.yearMax === preset.max;
                  return (
                    <Pressable
                      key={preset.label}
                      style={[styles.chip, selected && styles.chipSelected]}
                      onPress={() => selectYearPreset(preset)}
                    >
                      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{preset.label}</Text>
                    </Pressable>
                  );
                })}
                <Pressable
                  style={[styles.chip, yearCustomOpen && styles.chipSelected]}
                  onPress={() => setYearCustomOpen(true)}
                >
                  <Text style={[styles.chipText, yearCustomOpen && styles.chipTextSelected]}>Personalizado</Text>
                </Pressable>
              </ScrollView>
              {yearCustomOpen ? (
                <View style={styles.rangeRow}>
                  <TextInput
                    style={styles.rangeInput}
                    placeholder="Desde"
                    keyboardType="number-pad"
                    value={draftFilters.yearMin ? String(draftFilters.yearMin) : ""}
                    onChangeText={(v) =>
                      setDraftFilters((prev) => ({ ...prev, yearMin: v ? Number(v) : undefined }))
                    }
                  />
                  <Text style={styles.dim}>—</Text>
                  <TextInput
                    style={styles.rangeInput}
                    placeholder="Hasta"
                    keyboardType="number-pad"
                    value={draftFilters.yearMax ? String(draftFilters.yearMax) : ""}
                    onChangeText={(v) =>
                      setDraftFilters((prev) => ({ ...prev, yearMax: v ? Number(v) : undefined }))
                    }
                  />
                </View>
              ) : null}

              <Text style={styles.sectionLabel}>{runtimeSectionLabel}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
                {runtimePresets.map((preset) => {
                  const selected = !runtimeCustomOpen && draftFilters.runtimeMin === preset.min && draftFilters.runtimeMax === preset.max;
                  return (
                    <Pressable
                      key={preset.label}
                      style={[styles.chip, selected && styles.chipSelected]}
                      onPress={() => selectRuntimePreset(preset)}
                    >
                      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{preset.label}</Text>
                    </Pressable>
                  );
                })}
                <Pressable
                  style={[styles.chip, runtimeCustomOpen && styles.chipSelected]}
                  onPress={() => setRuntimeCustomOpen(true)}
                >
                  <Text style={[styles.chipText, runtimeCustomOpen && styles.chipTextSelected]}>Personalizado</Text>
                </Pressable>
              </ScrollView>
              {runtimeCustomOpen ? (
                <View style={styles.rangeRow}>
                  <TextInput
                    style={styles.rangeInput}
                    placeholder="Mín. (min)"
                    keyboardType="number-pad"
                    value={draftFilters.runtimeMin ? String(draftFilters.runtimeMin) : ""}
                    onChangeText={(v) =>
                      setDraftFilters((prev) => ({ ...prev, runtimeMin: v ? Number(v) : undefined }))
                    }
                  />
                  <Text style={styles.dim}>—</Text>
                  <TextInput
                    style={styles.rangeInput}
                    placeholder="Máx. (min)"
                    keyboardType="number-pad"
                    value={draftFilters.runtimeMax ? String(draftFilters.runtimeMax) : ""}
                    onChangeText={(v) =>
                      setDraftFilters((prev) => ({ ...prev, runtimeMax: v ? Number(v) : undefined }))
                    }
                  />
                </View>
              ) : null}

              <Text style={styles.sectionLabel}>Valoración mínima (nota TMDB, 0-10)</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
                {RATING_OPTIONS.map((opt) => {
                  const selected = draftFilters.ratingMin === opt.value;
                  return (
                    <Pressable
                      key={opt.label}
                      style={[styles.chip, selected && styles.chipSelected]}
                      onPress={() => setDraftFilters((prev) => ({ ...prev, ratingMin: opt.value }))}
                    >
                      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{opt.label}</Text>
                    </Pressable>
                  );
                })}
              </ScrollView>

              <Text style={styles.sectionLabel}>Ordenar por</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
                {ORDER_OPTIONS.map((opt) => {
                  const selected =
                    opt.kind === "sort"
                      ? !draftFilters.quickFilter && draftFilters.sortBy === opt.sortBy
                      : draftFilters.quickFilter === opt.quickFilter;
                  return (
                    <Pressable
                      key={opt.label}
                      style={[styles.chip, selected && styles.chipSelected]}
                      onPress={() => selectOrder(opt)}
                    >
                      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{opt.label}</Text>
                    </Pressable>
                  );
                })}
              </ScrollView>

              <Text style={styles.sectionLabel}>Plataformas</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
                {(
                  [
                    { mode: "any" as PlatformMode, label: "Cualquiera" },
                    { mode: "mine" as PlatformMode, label: "Mis plataformas" },
                    { mode: "custom" as PlatformMode, label: "Personalizado" },
                  ]
                ).map((opt) => {
                  const selected = draftFilters.platformMode === opt.mode;
                  return (
                    <Pressable
                      key={opt.mode}
                      style={[styles.chip, selected && styles.chipSelected]}
                      onPress={() => setDraftFilters((prev) => ({ ...prev, platformMode: opt.mode }))}
                    >
                      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{opt.label}</Text>
                    </Pressable>
                  );
                })}
              </ScrollView>

              {draftFilters.platformMode === "custom" ? (
                <>
                  <View style={styles.platformActionsRow}>
                    <Pressable
                      style={styles.miniButton}
                      onPress={() => setDraftFilters((prev) => ({ ...prev, customPlatformIds: myPlatformIds }))}
                    >
                      <Text style={styles.miniButtonText}>Mis plataformas</Text>
                    </Pressable>
                    <Pressable
                      style={styles.miniButton}
                      onPress={() =>
                        setDraftFilters((prev) => ({ ...prev, customPlatformIds: availablePlatforms.map((p) => p.id) }))
                      }
                    >
                      <Text style={styles.miniButtonText}>Marcar todas</Text>
                    </Pressable>
                    <Pressable
                      style={styles.miniButton}
                      onPress={() => setDraftFilters((prev) => ({ ...prev, customPlatformIds: [] }))}
                    >
                      <Text style={styles.miniButtonText}>Restablecer</Text>
                    </Pressable>
                  </View>
                  <View style={styles.platformGrid}>
                    {availablePlatforms.map((p) => {
                      const selected = draftFilters.customPlatformIds.includes(p.id);
                      const logo = platformLogoUrl(p.logo_path);
                      return (
                        <Pressable key={p.id} style={styles.platformCard} onPress={() => togglePlatform(p.id)}>
                          <View style={[styles.platformLogoWrap, selected && styles.platformLogoWrapSelected]}>
                            {logo ? <Image source={{ uri: logo }} style={styles.platformLogo} resizeMode="cover" /> : null}
                          </View>
                          <Text numberOfLines={1} style={styles.platformName}>
                            {p.name}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </>
              ) : null}

              <Pressable style={styles.applyButton} onPress={applyFilters}>
                <Text style={styles.applyButtonText}>Aplicar</Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      ) : null}
    </View>
  );
}

function TitleCard({ item }: { item: DiscoverItem }) {
  const uri = posterUrl(item.poster_path ?? undefined);
  return (
    <View style={styles.card}>
      <View style={styles.posterWrap}>
        {uri ? (
          <Image source={{ uri }} style={styles.poster} resizeMode="cover" />
        ) : (
          <View style={[styles.poster, styles.center]}>
            <Text style={styles.dim}>Sin imagen</Text>
          </View>
        )}
        {item.vote_average ? (
          <View style={styles.ratingBadge}>
            <Ionicons name="star" size={9} color="#fff" />
            <Text style={styles.ratingBadgeText}>{item.vote_average.toFixed(1)}</Text>
          </View>
        ) : null}
        <View style={styles.watchlistBadge}>
          <Ionicons name={item.in_watchlist ? "bookmark" : "bookmark-outline"} size={13} color="#fff" />
        </View>
      </View>
      <Text numberOfLines={1} style={styles.cardTitle}>
        {item.title}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, position: "relative" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 6, padding: 24 },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 4,
    gap: 8,
  },
  tabs: { flexDirection: "row", backgroundColor: "#f0f0f0", borderRadius: 10, padding: 3 },
  tab: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8 },
  tabActive: { backgroundColor: "#111" },
  tabText: { fontSize: 14, fontWeight: "600", color: "#333" },
  tabTextActive: { color: "#fff" },
  filterButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  filterButtonText: { fontSize: 13, fontWeight: "600", color: "#111" },
  list: { padding: 6 },
  card: { flex: 1 / 3, padding: 6 },
  posterWrap: { position: "relative" },
  poster: { width: "100%", aspectRatio: 2 / 3, borderRadius: 6, backgroundColor: "#e5e5e5" },
  ratingBadge: {
    position: "absolute",
    left: 4,
    bottom: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    backgroundColor: "rgba(0,0,0,0.65)",
    borderRadius: 5,
    paddingVertical: 1,
    paddingHorizontal: 4,
  },
  ratingBadgeText: { color: "#fff", fontSize: 10, fontWeight: "600" },
  watchlistBadge: {
    position: "absolute",
    right: 4,
    top: 4,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 10,
    padding: 3,
  },
  cardTitle: { marginTop: 4, fontSize: 11, fontWeight: "500" },
  title: { fontSize: 16, fontWeight: "600" },
  dim: { fontSize: 13, color: "#888", textAlign: "center" },
  footerLoader: { paddingVertical: 16 },
  overlayContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "flex-end",
  },
  overlayBackdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: "80%",
  },
  sheetTitle: { fontSize: 18, fontWeight: "700", marginBottom: 4 },
  sectionLabel: { fontSize: 14, fontWeight: "600", color: "#333", marginTop: 12 },
  chipRow: { flexGrow: 0, marginTop: 8 },
  rangeRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 8 },
  rangeInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    padding: 10,
    fontSize: 14,
  },
  chip: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 14,
    marginRight: 8,
  },
  chipSelected: { backgroundColor: "#111", borderColor: "#111" },
  chipIncluded: { backgroundColor: "#e6f4ea", borderColor: "#1e7e34" },
  chipExcluded: { backgroundColor: "#fdecea", borderColor: "#c0392b" },
  chipText: { fontSize: 13, color: "#333" },
  chipTextSelected: { color: "#fff", fontWeight: "600" },
  chipTextIncluded: { color: "#1e7e34", fontWeight: "600" },
  chipTextExcluded: { color: "#c0392b", fontWeight: "600" },
  platformActionsRow: { flexDirection: "row", gap: 8, marginTop: 10 },
  miniButton: { borderWidth: 1, borderColor: "#111", borderRadius: 16, paddingVertical: 4, paddingHorizontal: 10 },
  miniButtonText: { fontSize: 12, fontWeight: "600", color: "#111" },
  platformGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 10 },
  platformCard: { width: 64, alignItems: "center", gap: 4 },
  platformLogoWrap: {
    width: 56,
    height: 56,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "transparent",
    overflow: "hidden",
    backgroundColor: "#e5e5e5",
  },
  platformLogoWrapSelected: { borderColor: "#111" },
  platformLogo: { width: "100%", height: "100%" },
  platformName: { fontSize: 10, textAlign: "center", color: "#333" },
  applyButton: { backgroundColor: "#111", borderRadius: 10, paddingVertical: 14, alignItems: "center", marginTop: 20, marginBottom: 8 },
  applyButtonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
