import { useEffect } from "react";
import { View } from "react-native";
import { Stack, useRouter } from "expo-router";
import { Header } from "@/components/layout/header";
import { Loading, Screen } from "@/components/ui";
import { stackContentStyle } from "@/lib/css-vars";
import { hasToken } from "@/lib/api/auth-storage";
import { useMe } from "@/lib/hooks/use-auth";

export default function AppLayout() {
  const router = useRouter();
  const { isLoading, isError } = useMe();

  useEffect(() => {
    (async () => {
      const token = await hasToken();
      if (!token) {
        router.replace("/login");
      }
    })();
  }, [router]);

  useEffect(() => {
    if (isError) {
      router.replace("/login");
    }
  }, [isError, router]);

  if (isLoading) {
    return (
      <Screen>
        <Loading label="Carregando sessao..." />
      </Screen>
    );
  }

  return (
    <Screen>
      <Header />
      <View style={{ flex: 1 }}>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: {
              ...stackContentStyle,
              paddingVertical: 24,
            },
          }}
        />
      </View>
    </Screen>
  );
}
