import { useEffect } from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import { hasToken } from "@/lib/api/auth-storage";
import { Loading } from "@/components/ui";

export default function Index() {
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const loggedIn = await hasToken();
      router.replace(loggedIn ? "/projetos" : "/login");
    })();
  }, [router]);

  return (
    <View className="flex-1 bg-background">
      <Loading label="Carregando..." />
    </View>
  );
}
