import { useEffect } from "react";
import { useRouter } from "expo-router";
import { hasToken } from "@/lib/api/auth-storage";
import { Loading, Screen } from "@/components/ui";

export default function Index() {
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const loggedIn = await hasToken();
      router.replace(loggedIn ? "/projetos" : "/login");
    })();
  }, [router]);

  return (
    <Screen>
      <Loading label="Carregando..." />
    </Screen>
  );
}
