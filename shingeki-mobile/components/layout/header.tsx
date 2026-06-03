import { Pressable, Text, View } from "react-native";
import { Link, useRouter, useSegments } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Button } from "@/components/ui/button";
import { useLogout, useMe } from "@/lib/hooks/use-auth";
import { appForegroundColor } from "@/lib/css-vars";
import { notify } from "@/lib/notify";

export function Header() {
  const router = useRouter();
  const segments = useSegments();
  const inApp = segments[0] === "(app)";
  const { user } = useMe(inApp);
  const { logout, isLoading } = useLogout();

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
        <Link href={user ? "/projetos" : "/login"} asChild>
          <Pressable>
            <Text className="text-lg font-semibold tracking-tight text-foreground">
              shingeki
            </Text>
          </Pressable>
        </Link>

        <View className="flex-row items-center gap-2">
          {user ? (
            <>
              <Text className="hidden max-w-[120px] truncate text-sm text-muted-foreground sm:flex">
                {user.name}
              </Text>
              <Link href="/perfil" asChild>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Abrir perfil"
                  className="h-8 w-8 items-center justify-center rounded-app active:bg-surface-muted"
                >
                  <Ionicons
                    name="settings-outline"
                    size={20}
                    color={appForegroundColor}
                  />
                </Pressable>
              </Link>
              <Button
                variant="outline"
                size="sm"
                onPress={handleLogout}
                isLoading={isLoading}
              >
                Sair
              </Button>
            </>
          ) : (
            <>
              <Link href="/login" asChild>
                <Button variant="ghost" size="sm">
                  Entrar
                </Button>
              </Link>
              <Link href="/registro" asChild>
                <Button variant="outline" size="sm">
                  Criar conta
                </Button>
              </Link>
            </>
          )}
        </View>
      </View>
    </View>
  );
}
