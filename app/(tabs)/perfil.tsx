import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useAuth } from "../../context/AuthContext";

export default function Perfil() {
  const { user, logout } = useAuth();
  const router = useRouter();

  return (
    <View style={styles.center}>
      <Text style={styles.title}>{user?.username ?? "Perfil"}</Text>
      <Text style={styles.dim}>{user?.email}</Text>

      <Pressable
        style={styles.secondaryButton}
        onPress={() => router.push("/(onboarding)/plataformas")}
      >
        <Text style={styles.secondaryButtonText}>Editar mis plataformas</Text>
      </Pressable>

      <Pressable style={styles.button} onPress={logout}>
        <Text style={styles.buttonText}>Cerrar sesion</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 6 },
  title: { fontSize: 18, fontWeight: "600" },
  dim: { fontSize: 14, color: "#888" },
  secondaryButton: {
    marginTop: 24,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderWidth: 1,
    borderColor: "#111",
  },
  secondaryButtonText: { color: "#111", fontSize: 15, fontWeight: "600" },
  button: {
    marginTop: 12,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: "#111",
  },
  buttonText: { color: "#fff", fontSize: 15, fontWeight: "600" },
});
