import { StyleSheet, Text, View } from "react-native";

export default function Perfil() {
  return (
    <View style={styles.center}>
      <Text style={styles.title}>Perfil</Text>
      <Text style={styles.dim}>Proximamente</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 6 },
  title: { fontSize: 18, fontWeight: "600" },
  dim: { fontSize: 14, color: "#888" },
});
