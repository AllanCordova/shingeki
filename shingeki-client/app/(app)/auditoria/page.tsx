import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui";
import { PillIcon, ShieldAlertIcon } from "@/components/ui/icons";

export default function AuditoriaPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Auditoria
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Mantenha o catálogo global de ataques e medicações atualizado para toda
          a plataforma.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <ShieldAlertIcon className="h-4 w-4 text-primary" />
              <CardTitle>Ataques</CardTitle>
            </div>
            <CardDescription>
              Cadastre e revise vetores usados nos disparos de teste da
              plataforma.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              href="/auditoria/ataques"
              className="inline-flex h-8 items-center rounded-app border border-border bg-surface px-3 text-sm font-medium text-foreground hover:bg-surface-muted"
            >
              Abrir catálogo de ataques
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <PillIcon className="h-4 w-4 text-primary" />
              <CardTitle>Medicações</CardTitle>
            </div>
            <CardDescription>
              Organize scripts e soluções globais para orientar a remediação dos
              achados.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              href="/auditoria/medicacoes"
              className="inline-flex h-8 items-center rounded-app border border-border bg-surface px-3 text-sm font-medium text-foreground hover:bg-surface-muted"
            >
              Abrir catálogo de medicações
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
