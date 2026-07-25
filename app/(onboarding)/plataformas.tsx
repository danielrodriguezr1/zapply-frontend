import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useAuth } from "../../context/AuthContext";
import {
  ApiError,
  getPlatforms,
  getUserPlatforms,
  platformLogoUrl,
  setUserPlatforms,
  type Platform,
} from "../../lib/api";
import { DEFAULT_REGION, REGIONS } from "../../lib/regions";

export default function Plataformas() {
  const { user, setUserRegion } = useAuth();
  const router = useRouter();
  // Se fija en el primer render: si el usuario ya tenia region, esto es una edicion
  // desde el perfil; si no, es el onboarding obligatorio de la primera vez.
  const cameFromOnboarding = useRef(user?.region == null).current;

  const [region, setRegion] = useState(DEFAULT_REGION);
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [loadingPlatforms, setLoadingPlatforms] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Carga lo que el usuario ya tenia guardado (si algo) para precargar el formulario.
  useEffect(() => {
    (async () => {
      try {
        const current = await getUserPlatforms();
        if (current.region) {
          setRegion(current.region);
          setSelectedIds(new Set(current.platforms.map((p) => p.id)));
        }
      } catch (e) {
        setError(e instanceof ApiError ? e.message : "No se pudo conectar con el backend");
      } finally {
        setLoadingInitial(false);
      }
    })();
  }, []);

  // Cada vez que cambia la region, recarga las plataformas disponibles en ella.
  useEffect(() => {
    if (loadingInitial) return;
    setLoadingPlatforms(true);
    getPlatforms(region)
      .then(setPlatforms)
      .catch((e) => setError(e instanceof ApiError ? e.message : "No se pudo conectar con el backend"))
      .finally(() => setLoadingPlatforms(false));
  }, [region, loadingInitial]);

  const selectedRegionName = useMemo(
    () => REGIONS.find((r) => r.code === region)?.name ?? region,
    [region]
  );

  function toggle(id: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function onSave() {
    setError(null);
    setSaving(true);
    try {
      await setUserPlatforms(region, [...selectedIds]);
      setUserRegion(region);
      if (cameFromOnboarding) {
        router.replace("/(tabs)");
      } else {
        router.back();
      }
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "No se pudo conectar con el backend");
    } finally {
      setSaving(false);
    }
  }

  if (loadingInitial) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Tus plataformas</Text>
      <Text style={styles.subtitle}>
        Elige tu región y en qué plataformas estás suscrito. Podrás cambiarlo cuando quieras desde tu perfil.
      </Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.regionRow}>
        {REGIONS.map((r) => (
          <Pressable
            key={r.code}
            style={[styles.chip, region === r.code && styles.chipSelected]}
            onPress={() => setRegion(r.code)}
          >
            <Text style={[styles.chipText, region === r.code && styles.chipTextSelected]}>{r.name}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {loadingPlatforms ? (
        <View style={styles.center}>
          <ActivityIndicator />
        </View>
      ) : (
        <FlatList
          data={platforms}
          keyExtractor={(item) => String(item.id)}
          numColumns={3}
          contentContainerStyle={styles.grid}
          ListEmptyComponent={
            <Text style={styles.dim}>No hay plataformas disponibles en {selectedRegionName}.</Text>
          }
          renderItem={({ item }) => {
            const selected = selectedIds.has(item.id);
            const uri = platformLogoUrl(item.logo_path);
            return (
              <Pressable style={styles.platformCard} onPress={() => toggle(item.id)}>
                <View style={[styles.logoWrap, selected && styles.logoWrapSelected]}>
                  {uri ? (
                    <Image source={{ uri }} style={styles.logo} resizeMode="cover" />
                  ) : (
                    <View style={[styles.logo, styles.center]} />
                  )}
                  {selected ? (
                    <View style={styles.checkBadge}>
                      <Ionicons name="checkmark-circle" size={18} color="#111" />
                    </View>
                  ) : null}
                </View>
                <Text numberOfLines={2} style={styles.platformName}>
                  {item.name}
                </Text>
              </Pressable>
            );
          }}
        />
      )}

      <Pressable style={styles.saveButton} onPress={onSave} disabled={saving}>
        {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveButtonText}>Guardar y continuar</Text>}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, paddingTop: 56, gap: 12 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 22, fontWeight: "700" },
  subtitle: { fontSize: 14, color: "#666" },
  error: { color: "#c0392b", fontSize: 14 },
  dim: { fontSize: 14, color: "#888", padding: 16 },
  regionRow: { flexGrow: 0, marginTop: 4 },
  chip: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginRight: 8,
  },
  chipSelected: { backgroundColor: "#111", borderColor: "#111" },
  chipText: { fontSize: 14, color: "#333" },
  chipTextSelected: { color: "#fff", fontWeight: "600" },
  grid: { paddingVertical: 8, gap: 4 },
  platformCard: { flex: 1 / 3, alignItems: "center", padding: 8, gap: 6 },
  logoWrap: {
    width: 72,
    height: 72,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "transparent",
    overflow: "hidden",
  },
  logoWrapSelected: { borderColor: "#111" },
  logo: { width: "100%", height: "100%", backgroundColor: "#e5e5e5" },
  checkBadge: {
    position: "absolute",
    top: 2,
    right: 2,
    backgroundColor: "#fff",
    borderRadius: 10,
  },
  platformName: { fontSize: 12, textAlign: "center", color: "#333" },
  saveButton: { backgroundColor: "#111", borderRadius: 10, paddingVertical: 14, alignItems: "center" },
  saveButtonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
