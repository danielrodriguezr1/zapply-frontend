import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { getTrending, posterUrl, type TmdbTitle } from "../../lib/api";

export default function Descubrir() {
  const [items, setItems] = useState<TmdbTitle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getTrending()
      .then((page) => setItems(page.results ?? []))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>No se pudo conectar con el backend</Text>
        <Text style={styles.dim}>{error}</Text>
        <Text style={styles.dim}>
          Revisa que el backend este arrancado y que EXPO_PUBLIC_API_URL apunte a el.
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={items}
      keyExtractor={(item) => String(item.id)}
      numColumns={2}
      contentContainerStyle={styles.list}
      renderItem={({ item }) => {
        const uri = posterUrl(item.poster_path);
        return (
          <View style={styles.card}>
            {uri ? (
              <Image source={{ uri }} style={styles.poster} />
            ) : (
              <View style={[styles.poster, styles.center]}>
                <Text style={styles.dim}>Sin imagen</Text>
              </View>
            )}
            <Text numberOfLines={1} style={styles.cardTitle}>
              {item.title ?? item.name}
            </Text>
          </View>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 6, padding: 24 },
  list: { padding: 8 },
  card: { flex: 1 / 2, padding: 8 },
  poster: { width: "100%", aspectRatio: 2 / 3, borderRadius: 8, backgroundColor: "#e5e5e5" },
  cardTitle: { marginTop: 6, fontSize: 13, fontWeight: "500" },
  title: { fontSize: 16, fontWeight: "600" },
  dim: { fontSize: 13, color: "#888", textAlign: "center" },
});
