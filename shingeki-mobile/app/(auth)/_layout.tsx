import { useEffect } from "react";
import { Stack, useRouter } from "expo-router";
import { Header } from "@/components/layout/header";
import { Screen } from "@/components/ui";
import { stackContentStyle } from "@/lib/css-vars";
import { hasToken } from "@/lib/api/auth-storage";

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
    <Screen>
      <Header />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: stackContentStyle,
        }}
      />
    </Screen>
  );
}
