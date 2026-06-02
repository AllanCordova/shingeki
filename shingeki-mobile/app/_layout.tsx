import "../global.css";
import { useEffect } from "react";
import { Stack, useRouter } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";
import { AppProviders } from "@/components/providers/app-providers";
import { setUnauthorizedHandler } from "@/lib/api/client";
import { useThemeStore } from "@/lib/stores/theme-store";

export { ErrorBoundary } from "expo-router";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const router = useRouter();
  const theme = useThemeStore((state) => state.theme);

  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      router.replace("/login");
    });
    return () => setUnauthorizedHandler(null);
  }, [router]);

  return (
    <AppProviders>
      <StatusBar style={theme === "dark" ? "light" : "dark"} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(app)" />
        <Stack.Screen name="+not-found" />
      </Stack>
    </AppProviders>
  );
}
