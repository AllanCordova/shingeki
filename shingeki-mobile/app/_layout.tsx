import "../global.css";
import { useEffect } from "react";
import { View } from "react-native";
import { Stack, useRouter } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";
import { AppProviders } from "@/components/providers/app-providers";
import { appBackgroundColor, appRootVars, stackContentStyle } from "@/lib/css-vars";
import { setUnauthorizedHandler } from "@/lib/api/client";

export { ErrorBoundary } from "expo-router";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const router = useRouter();

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
    <View style={[appRootVars, { flex: 1, backgroundColor: appBackgroundColor }]}>
      <AppProviders>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: stackContentStyle,
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(app)" />
          <Stack.Screen name="+not-found" />
        </Stack>
      </AppProviders>
    </View>
  );
}
