"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  useOwnedSystem,
  useUpdateSystemDispatchSettings,
} from "@/lib/hooks/system/use-owned-systems";
import { useDispatchCatalog } from "@/lib/hooks/attack/use-attack";
import {
  DispatchCatalogPicker,
  persistedCatalogIds,
} from "@/components/attack/dispatch-catalog-picker";
import { notify } from "@/lib/notify";
import type { DispatchCatalogAttack } from "@/lib/contracts/attack/attack";
import type { System } from "@/lib/contracts";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  ErrorShow,
  Field,
  Input,
  Loading,
} from "@/components/ui";

function initialCatalogSelection(
  storedIds: string[] | null | undefined,
  attacks: DispatchCatalogAttack[],
): string[] {
  if (storedIds == null) {
    return attacks.map((attack) => attack.id);
  }

  const catalogIds = new Set(attacks.map((attack) => attack.id));
  return storedIds.filter((id) => catalogIds.has(id));
}

function DispatchSettingsForm({ system }: { system: System }) {
  const updateSettings = useUpdateSystemDispatchSettings(system.id);
  const [startPath, setStartPath] = useState(system.dast_start_path ?? "");
  const [maxRoutes, setMaxRoutes] = useState(
    system.dast_max_routes == null ? "" : String(system.dast_max_routes),
  );
  const [dastIds, setDastIds] = useState<string[]>([]);
  const [sastIds, setSastIds] = useState<string[]>([]);
  const [dastHydrated, setDastHydrated] = useState("");
  const [sastHydrated, setSastHydrated] = useState("");

  const dastCatalog = useDispatchCatalog(system.project_id, system.id, "dast");
  const sastCatalog = useDispatchCatalog(system.project_id, system.id, "sast");

  const dastKey = dastCatalog.attacks.map((attack) => attack.id).join(",");
  if (!dastCatalog.isLoading && dastHydrated !== dastKey) {
    setDastHydrated(dastKey);
    setDastIds(initialCatalogSelection(system.dast_attack_ids, dastCatalog.attacks));
  }

  const sastKey = sastCatalog.attacks.map((attack) => attack.id).join(",");
  if (!sastCatalog.isLoading && sastHydrated !== sastKey) {
    setSastHydrated(sastKey);
    setSastIds(initialCatalogSelection(system.sast_attack_ids, sastCatalog.attacks));
  }

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

    const persistedDast = persistedCatalogIds(dastIds, dastCatalog.attacks);
    const persistedSast = persistedCatalogIds(sastIds, sastCatalog.attacks);

    if (persistedDast?.length === 0) {
      notify.error("Selecione pelo menos um ataque DAST.");
      return;
    }
    if (persistedSast?.length === 0) {
      notify.error("Selecione pelo menos um ataque SAST.");
      return;
    }

    await notify.run(
      () =>
        updateSettings.updateDispatchSettings({
          dast_start_path: startPath.trim() === "" ? null : startPath.trim(),
          dast_max_routes: routesValue,
          dast_attack_ids: persistedDast,
          sast_attack_ids: persistedSast,
        }),
      { success: "Configurações de disparo salvas." },
    );
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="grid items-start gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Escopo do DAST</CardTitle>
            <CardDescription>
              Projeto: {system.project?.name ?? "—"}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ataques do catálogo</CardTitle>
            <CardDescription>
              Escolha quais ataques entram nos disparos deste sistema.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DispatchCatalogPicker
              attacks={[...dastCatalog.attacks, ...sastCatalog.attacks]}
              selectedIds={[...dastIds, ...sastIds]}
              onChange={(ids) => {
                const dastSet = new Set(
                  dastCatalog.attacks.map((attack) => attack.id),
                );
                const sastSet = new Set(
                  sastCatalog.attacks.map((attack) => attack.id),
                );
                setDastIds(ids.filter((id) => dastSet.has(id)));
                setSastIds(ids.filter((id) => sastSet.has(id)));
              }}
              isLoading={dastCatalog.isLoading || sastCatalog.isLoading}
              isError={dastCatalog.isError || sastCatalog.isError}
              error={dastCatalog.error ?? sastCatalog.error}
              onRetry={() => {
                void dastCatalog.refetch();
                void sastCatalog.refetch();
              }}
            />
          </CardContent>
        </Card>
      </div>

      {updateSettings.error ? <ErrorShow error={updateSettings.error} /> : null}
      <div className="flex justify-end">
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
          Disparo
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Defina o escopo do DAST e quais ataques do catálogo este sistema usa.
        </p>
      </div>

      <DispatchSettingsForm
        key={`${system.id}:${system.updated_at ?? ""}`}
        system={system}
      />
    </div>
  );
}
