import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui";
import { UsersIcon } from "@/components/ui/icons";

export default function AdminPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Administração
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Gerencie acesso e permissões da plataforma.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <UsersIcon className="h-4 w-4 text-primary" />
              <CardTitle>Permissões</CardTitle>
            </div>
            <CardDescription>
              Defina quem é usuário, especialista ou administrador.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              href="/admin/users/permissoes"
              className="inline-flex h-8 items-center rounded-app border border-border bg-surface px-3 text-sm font-medium text-foreground hover:bg-surface-muted"
            >
              Gerenciar permissões
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
