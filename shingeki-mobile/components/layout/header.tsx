import { Text, View } from "react-native";
import { Link, useRouter } from "expo-router";
import { Button } from "@/components/ui/button";
import { useLogout, useMe } from "@/lib/hooks/use-auth";
import { notify } from "@/lib/notify";
import { ThemeToggle } from "./theme-toggle";

export function Header() {
  const { user } = useMe();
  const { logout, isLoading } = useLogout();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await logout();
      notify.success("Sessao encerrada.");
    } catch (err) {
      notify.fromApiError(err, "Nao foi possivel sair.");
    } finally {
      router.replace("/login");
    }
  };

  return (
    <View className="border-b border-border bg-surface px-4 py-3">
      <View className="flex-row items-center justify-between">
        <Link href="/projetos" asChild>
          <Text className="text-lg font-semibold tracking-tight text-foreground">
            shingeki
          </Text>
        </Link>
        <View className="flex-row items-center gap-2">
          {user ? (
            <Text className="hidden text-sm text-muted-foreground sm:flex">
              {user.name}
            </Text>
          ) : null}
          <ThemeToggle />
          <Button variant="outline" size="sm" onPress={handleLogout} isLoading={isLoading}>
            Sair
          </Button>
        </View>
      </View>
    </View>
  );
}
