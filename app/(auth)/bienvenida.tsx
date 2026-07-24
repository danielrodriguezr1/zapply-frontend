import { Link } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

export default function Bienvenida() {
  return (
    <View style={styles.container}>
      <View style={styles.center}>
        <Text style={styles.logo}>Zapply</Text>
        <Text style={styles.tagline}>Descubre que ver en tus plataformas de streaming.</Text>
      </View>

      <View style={styles.actions}>
        <Link href="/(auth)/registro" asChild>
          <Pressable style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Crear cuenta</Text>
          </Pressable>
        </Link>
        <Link href="/(auth)/login" asChild>
          <Pressable style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>Ya tengo cuenta</Text>
          </Pressable>
        </Link>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "space-between", padding: 24, paddingVertical: 64 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  logo: { fontSize: 40, fontWeight: "700" },
  tagline: { fontSize: 15, color: "#666", textAlign: "center", maxWidth: 280 },
  actions: { gap: 12 },
  primaryButton: { backgroundColor: "#111", borderRadius: 10, paddingVertical: 14, alignItems: "center" },
  primaryButtonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  secondaryButton: { borderRadius: 10, paddingVertical: 14, alignItems: "center" },
  secondaryButtonText: { color: "#111", fontSize: 16, fontWeight: "600" },
});
