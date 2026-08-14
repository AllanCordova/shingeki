import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui";
import { FolderIcon, LayoutTemplateIcon } from "@/components/ui/icons";

export default function ConfiguraçõesPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Configurações
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Personalize preferências do aplicativo.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <LayoutTemplateIcon className="h-4 w-4 text-primary" />
              <CardTitle>Navegação</CardTitle>
            </div>
            <CardDescription>
              Escolha quais projetos e sistemas aparecem na sidebar e a ordem
              deles.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              href="/configuracoes/navegacao"
              className="inline-flex h-8 items-center rounded-app border border-border bg-surface px-3 text-sm font-medium text-foreground hover:bg-surface-muted"
            >
              Abrir navegação
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <FolderIcon className="h-4 w-4 text-primary" />
              <CardTitle>Sistemas</CardTitle>
            </div>
            <CardDescription>
              Ajuste o escopo dos scans DAST de cada sistema.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              href="/configuracoes/sistemas"
              className="inline-flex h-8 items-center rounded-app border border-border bg-surface px-3 text-sm font-medium text-foreground hover:bg-surface-muted"
            >
              Gerenciar sistemas
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
