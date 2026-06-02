import { useEffect } from "react";
import { View } from "react-native";
import { Stack, useRouter } from "expo-router";
import { hasToken } from "@/lib/api/auth-storage";
import { ThemeToggle } from "@/components/layout/theme-toggle";

export default function AuthLayout() {
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const loggedIn = await hasToken();
      if (loggedIn) {
        router.replace("/projetos");
      }
    })();
  }, [router]);

  return (
    <View className="flex-1 bg-background">
      <View className="items-end p-4">
        <ThemeToggle />
      </View>
      <View className="flex-1 justify-center px-4 pb-16">
        <Stack screenOptions={{ headerShown: false }} />
      </View>
    </View>
  );
}
