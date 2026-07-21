"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  useOwnedSystem,
  useUpdateSystemDispatchSettings,
} from "@/lib/hooks/system/use-owned-systems";
import { notify } from "@/lib/notify";
import type { System } from "@/lib/contracts";
import {
  Button,
  ErrorShow,
  Field,
  Input,
  Loading,
} from "@/components/ui";

function DispatchSettingsForm({ system }: { system: System }) {
  const updateSettings = useUpdateSystemDispatchSettings(system.id);
  const [startPath, setStartPath] = useState(system.dast_start_path ?? "");
  const [maxRoutes, setMaxRoutes] = useState(
    system.dast_max_routes == null ? "" : String(system.dast_max_routes),
  );

  const handleSave = async () => {
    const trimmedRoutes = maxRoutes.trim();
    let routesValue: number | null = null;
    if (trimmedRoutes !== "") {
      const parsed = Number.parseInt(trimmedRoutes, 10);
      if (!Number.isFinite(parsed) || parsed < 1 || parsed > 500) {
        notify.error(
          "Informe um limite entre 1 e 500, ou deixe em branco para sem limite.",
        );
        return;
      }
      routesValue = parsed;
    }

    await notify.run(
      () =>
        updateSettings.updateDispatchSettings({
          dast_start_path: startPath.trim() === "" ? null : startPath.trim(),
          dast_max_routes: routesValue,
        }),
      { success: "Escopo do DAST salvo." },
    );
  };

  return (
    <div className="flex max-w-md flex-col gap-4 rounded-app border border-border bg-surface p-4">
      <p className="text-sm text-muted-foreground">
        Projeto:{" "}
        <span className="text-foreground">
          {system.project?.name ?? "—"}
        </span>
      </p>
      <Field
        label="Começar em"
        htmlFor="dast-start-path"
        hint="Caminho a partir do qual o scan inicia. Em branco, a descoberta começa pela raiz do alvo."
      >
        <Input
          id="dast-start-path"
          value={startPath}
          onChange={(event) => setStartPath(event.target.value)}
          placeholder="/app"
          autoComplete="off"
        />
      </Field>
      <Field
        label="Limite de páginas"
        htmlFor="dast-max-routes"
        hint="Quantidade máxima de páginas a explorar. Em branco, o scan segue até esgotar o que encontrar."
      >
        <Input
          id="dast-max-routes"
          type="number"
          min={1}
          max={500}
          value={maxRoutes}
          onChange={(event) => setMaxRoutes(event.target.value)}
          placeholder="Sem limite"
        />
      </Field>
      {updateSettings.error ? (
        <ErrorShow error={updateSettings.error} />
      ) : null}
      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="primary"
          isLoading={updateSettings.isLoading}
          onClick={() => void handleSave()}
        >
          Salvar
        </Button>
      </div>
    </div>
  );
}

export default function ConfiguraçõesSistemaDispatchPage() {
  const { systemId } = useParams<{ systemId: string }>();
  const { system, isLoading, isError, error, refetch } = useOwnedSystem(systemId);

  if (isLoading) return <Loading label="Carregando sistema..." />;
  if (isError || !system) {
    return <ErrorShow error={error} onRetry={() => void refetch()} />;
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-sm text-muted-foreground">
          <Link
            href="/configuracoes"
            className="hover:text-foreground hover:underline"
          >
            Configurações
          </Link>
          <span className="mx-1.5">/</span>
          <Link
            href="/configuracoes/sistemas"
            className="hover:text-foreground hover:underline"
          >
            Sistemas
          </Link>
          <span className="mx-1.5">/</span>
          <span className="text-foreground">{system.name}</span>
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
          Escopo do DAST
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Defina por onde o scan começa e até onde ele pode se expandir neste
          sistema.
        </p>
      </div>

      <DispatchSettingsForm
        key={`${system.id}:${system.updated_at ?? ""}`}
        system={system}
      />
    </div>
  );
}
