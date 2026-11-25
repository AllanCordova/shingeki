import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui";
import { BarChartIcon, EyeIcon, UsersIcon } from "@/components/ui/icons";

export default function AdminPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Administração
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Gerencie acesso, auditoria de capturas e saúde da plataforma.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <EyeIcon className="h-4 w-4 text-primary" />
              <CardTitle>Capturas de navegador</CardTitle>
            </div>
            <CardDescription>
              Veja e exporte qual conta usou o navegador de sessão e quais URLs
              foram abertas.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              href="/admin/capturas"
              className="inline-flex h-8 items-center rounded-app border border-border bg-surface px-3 text-sm font-medium text-foreground hover:bg-surface-muted"
            >
              Abrir capturas
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <BarChartIcon className="h-4 w-4 text-primary" />
              <CardTitle>Observabilidade</CardTitle>
            </div>
            <CardDescription>
              Status dos workers, filas RabbitMQ e dados de uso recentes.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              href="/admin/observabilidade"
              className="inline-flex h-8 items-center rounded-app border border-border bg-surface px-3 text-sm font-medium text-foreground hover:bg-surface-muted"
            >
              Abrir observabilidade
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
