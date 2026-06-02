import { useEffect } from "react";
import { View } from "react-native";
import { Stack, useRouter } from "expo-router";
import { Header } from "@/components/layout/header";
import { Loading } from "@/components/ui";
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
      <View className="flex-1 bg-background">
        <Loading label="Carregando sessao..." />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <Header />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { paddingVertical: 24 },
        }}
      />
    </View>
  );
}
