"use client";

import { useState } from "react";
import {
  ATTACK_TARGET_LOCATIONS,
  buildManualProxyPayload,
  manualProxyMethods,
  manualProxySendSchema,
  routeMapToSendInput,
  type ManualProxySendInput,
  type ManualProxySendResponse,
  type ManualRouteMap,
} from "@/lib/contracts";
import {
  useDeleteManualRouteMap,
  useManualRouteMaps,
  useSaveManualRouteMap,
  useSendManualProxy,
} from "@/lib/hooks/use-manual-proxy";
import { notify } from "@/lib/notify";
import {
  Badge,
  Button,
  EmptyState,
  ErrorShow,
  Field,
  Input,
  Label,
  Loading,
  Select,
  Textarea,
  Checkbox,
} from "@/components/ui";

const DEFAULT_FORM: ManualProxySendInput = {
  method: "GET",
  path: "/",
  query_json: "{}",
  headers_json: "{}",
  body: "",
  content_type: "",
  use_target_session: true,
  apply_payload: false,
  payload_target_location: "QUERY_PARAMETER",
  payload_field: "",
  payload_value: "",
};

export function ManualProxyPanel({
  projectId,
  systemId,
}: {
  projectId: string;
  systemId: string;
}) {
  const [form, setForm] = useState<ManualProxySendInput>(DEFAULT_FORM);
  const [response, setResponse] = useState<ManualProxySendResponse | null>(null);
  const [routeName, setRouteName] = useState("");
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);

  const { data: routes, isLoading: routesLoading } = useManualRouteMaps(
    projectId,
    systemId,
  );
  const { sendRequest, isLoading, error, reset } = useSendManualProxy(
    projectId,
    systemId,
  );
  const saveRoute = useSaveManualRouteMap(projectId, systemId);
  const deleteRoute = useDeleteManualRouteMap(projectId, systemId);

  const updateField = <K extends keyof ManualProxySendInput>(
    key: K,
    value: ManualProxySendInput[K],
  ) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleSend = async () => {
    const parsed = manualProxySendSchema.safeParse(form);
    if (!parsed.success) {
      notify.error(parsed.error.issues[0]?.message ?? "Revise os campos do request.");
      return;
    }

    try {
      reset();
      const result = await sendRequest(buildManualProxyPayload(parsed.data));
      setResponse(result);
      notify.success(`Resposta ${result.status_code} em ${result.duration_ms} ms.`);
    } catch (err) {
      notify.fromApiError(err, "Nao foi possivel enviar o request manual.");
    }
  };

  const handleSaveRoute = async () => {
    if (!routeName.trim()) {
      notify.error("Informe um nome para salvar a rota.");
      return;
    }

    const parsed = manualProxySendSchema.safeParse(form);
    if (!parsed.success) {
      notify.error(parsed.error.issues[0]?.message ?? "Revise os campos antes de salvar.");
      return;
    }

    try {
      await saveRoute.saveRoute({
        routeId: selectedRouteId ?? undefined,
        name: routeName.trim(),
        method: parsed.data.method,
        path: parsed.data.path,
        query_json: parsed.data.query_json,
        headers_json: parsed.data.headers_json,
        body: parsed.data.body,
        content_type: parsed.data.content_type,
      });
      notify.success(selectedRouteId ? "Rota atualizada." : "Rota salva no mapa.");
    } catch (err) {
      notify.fromApiError(err, "Nao foi possivel salvar a rota.");
    }
  };

  const loadRoute = (route: ManualRouteMap) => {
    setForm(routeMapToSendInput(route));
    setRouteName(route.name);
    setSelectedRouteId(route.id);
    setResponse(null);
  };

  const handleDeleteRoute = async (routeId: string) => {
    try {
      await deleteRoute.deleteRoute(routeId);
      if (selectedRouteId === routeId) {
        setSelectedRouteId(null);
        setRouteName("");
      }
      notify.success("Rota removida.");
    } catch (err) {
      notify.fromApiError(err, "Nao foi possivel remover a rota.");
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {error && !error.hasFieldErrors ? <ErrorShow error={error} /> : null}

      <ManualProxyExample />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Field label="Metodo">
          <Select
            value={form.method}
            onChange={(event) =>
              updateField("method", event.target.value as ManualProxySendInput["method"])
            }
          >
            {manualProxyMethods.map((method) => (
              <option key={method} value={method}>
                {method}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Caminho">
          <Input
            value={form.path}
            onChange={(event) => updateField("path", event.target.value)}
            placeholder="/login.php"
          />
        </Field>
      </div>

      <Field label="Query JSON">
        <Textarea
          value={form.query_json}
          onChange={(event) => updateField("query_json", event.target.value)}
          rows={3}
          className="font-mono text-xs"
        />
      </Field>

      <Field label="Headers JSON">
        <Textarea
          value={form.headers_json}
          onChange={(event) => updateField("headers_json", event.target.value)}
          rows={4}
          className="font-mono text-xs"
        />
      </Field>

      <Field label="Body">
        <Textarea
          value={form.body}
          onChange={(event) => updateField("body", event.target.value)}
          rows={5}
          className="font-mono text-xs"
        />
      </Field>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Field label="Content-Type">
          <Input
            value={form.content_type ?? ""}
            onChange={(event) => updateField("content_type", event.target.value)}
            placeholder="application/json"
          />
        </Field>

        <div className="flex flex-col justify-center gap-4">
          <Checkbox
            checked={form.use_target_session}
            onChange={(event) =>
              updateField("use_target_session", event.target.checked)
            }
            label="Usar sessao conectada do alvo"
            description="Envia Cookie ou Bearer da sessao conectada acima."
          />

          <Checkbox
            checked={form.apply_payload}
            onChange={(event) => updateField("apply_payload", event.target.checked)}
            label="Aplicar payload de ataque"
            description="Injeta o valor no campo conforme o target location do catalogo."
          />
        </div>
      </div>

      {form.apply_payload ? (
        <div className="flex flex-col gap-3 rounded-app border border-border p-3">
          <Field label="Target location">
            <Select
              value={form.payload_target_location ?? "QUERY_PARAMETER"}
              onChange={(event) =>
                updateField(
                  "payload_target_location",
                  event.target.value as ManualProxySendInput["payload_target_location"],
                )
              }
            >
              {ATTACK_TARGET_LOCATIONS.map((location) => (
                <option key={location} value={location}>
                  {location}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Campo">
            <Input
              value={form.payload_field ?? ""}
              onChange={(event) => updateField("payload_field", event.target.value)}
            />
          </Field>
          <Field label="Valor">
            <Textarea
              value={form.payload_value ?? ""}
              onChange={(event) => updateField("payload_value", event.target.value)}
              rows={3}
              className="font-mono text-xs"
            />
          </Field>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button type="button" isLoading={isLoading} onClick={() => void handleSend()}>
          Enviar request
        </Button>
        <Button type="button" variant="outline" onClick={() => setForm(DEFAULT_FORM)}>
          Limpar
        </Button>
      </div>

      <div className="flex flex-col gap-3 rounded-app border border-border p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="flex-1">
            <Field label="Nome da rota">
              <Input
                value={routeName}
                onChange={(event) => setRouteName(event.target.value)}
                placeholder="Login POST"
              />
            </Field>
          </div>
          <Button
            type="button"
            variant="outline"
            isLoading={saveRoute.isLoading}
            onClick={() => void handleSaveRoute()}
          >
            {selectedRouteId ? "Atualizar rota" : "Salvar no mapa"}
          </Button>
        </div>

        {routesLoading ? (
          <Loading label="Carregando rotas..." />
        ) : !routes?.length ? (
          <EmptyState
            title="Nenhuma rota mapeada"
            description="Salve requests frequentes para reutilizar nos testes manuais."
          />
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {routes.map((route) => (
              <li
                key={route.id}
                className="flex flex-col gap-3 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex flex-col gap-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-foreground">{route.name}</span>
                    <Badge tone="neutral">{route.method}</Badge>
                  </div>
                  <code className="text-xs text-muted-foreground">{route.path}</code>
                </div>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={() => loadRoute(route)}>
                    Carregar
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    isLoading={deleteRoute.isLoading}
                    onClick={() => void handleDeleteRoute(route.id)}
                  >
                    Remover
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {response ? (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <Label>Resposta</Label>
            <Badge tone={response.status_code >= 400 ? "danger" : "success"}>
              {response.status_code}
            </Badge>
            <span className="text-sm text-muted-foreground">
              {response.duration_ms} ms
            </span>
          </div>

          <DumpBlock label="Request" value={response.request_dump} />
          <DumpBlock
            label="Response body"
            value={
              response.response_body_truncated
                ? `${response.response_body}\n\n[truncado]`
                : response.response_body
            }
          />
        </div>
      ) : null}
    </div>
  );
}

function ManualProxyExample() {
  return (
    <div className="rounded-app border border-border bg-surface-muted/60 p-4 text-sm">
      <p className="font-medium text-foreground">Exemplo (lab 8090 — SQL injection no login)</p>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
        <li>
          <strong className="text-foreground">Metodo:</strong> POST ·{" "}
          <strong className="text-foreground">Caminho:</strong> /login.php
        </li>
        <li>
          <strong className="text-foreground">Query JSON:</strong>{" "}
          <code className="rounded bg-surface px-1 py-0.5 font-mono text-xs">{`{}`}</code>
        </li>
        <li>
          <strong className="text-foreground">Headers JSON:</strong>{" "}
          <code className="rounded bg-surface px-1 py-0.5 font-mono text-xs">
            {`{"Accept": "text/html"}`}
          </code>
        </li>
        <li>
          <strong className="text-foreground">Body:</strong>{" "}
          <code className="rounded bg-surface px-1 py-0.5 font-mono text-xs">
            username=admin&amp;password=test
          </code>
        </li>
        <li>
          <strong className="text-foreground">Content-Type:</strong>{" "}
          application/x-www-form-urlencoded
        </li>
        <li>
          Marque <strong className="text-foreground">Aplicar payload</strong> · Target location:{" "}
          FORM · Campo: <code className="font-mono text-xs">username</code> · Valor:{" "}
          <code className="font-mono text-xs">admin&apos; OR &apos;1&apos;=&apos;1</code>
        </li>
      </ul>
      <p className="mt-3 text-xs text-muted-foreground">
        Conecte a sessao do alvo acima se a rota exigir login. Salve como rota{" "}
        <strong className="text-foreground">Login SQLi</strong> para reutilizar.
      </p>
    </div>
  );
}

function DumpBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <pre className="max-h-80 overflow-auto whitespace-pre-wrap break-words rounded-app bg-surface-muted p-3 font-mono text-xs text-foreground">
        {value}
      </pre>
    </div>
  );
}
