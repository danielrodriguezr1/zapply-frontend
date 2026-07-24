import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { AuthProvider, useAuth } from "../context/AuthContext";

function RootNavigation() {
  const { user, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    const inAuthGroup = segments[0] === "(auth)";
    const inOnboardingGroup = segments[0] === "(onboarding)";

    if (!user) {
      if (!inAuthGroup) router.replace("/(auth)/bienvenida");
      return;
    }

    if (user.region == null) {
      // Onboarding obligatorio: aun no ha elegido plataformas.
      if (!inOnboardingGroup) router.replace("/(onboarding)/plataformas");
      return;
    }

    if (inAuthGroup) {
      router.replace("/(tabs)");
    }
    // Si ya tiene region pero esta en (onboarding), es una edicion voluntaria desde
    // el perfil: no se le fuerza a salir.
  }, [user, isLoading, segments]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootNavigation />
    </AuthProvider>
  );
}
