"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  useRevokeTargetSession,
  useStoreTargetSession,
  useTargetSession,
} from "@/lib/hooks/use-target-session";
import { notify } from "@/lib/notify";
import {
  Badge,
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
  Textarea,
} from "@/components/ui";

const targetSessionSchema = z.object({
  auth_type: z.enum(["cookie", "bearer"]),
  credential: z.string().min(1, "Informe o cookie ou token de acesso."),
});

type TargetSessionFormInput = z.infer<typeof targetSessionSchema>;

export function TargetSessionPanel({
  projectId,
  systemId,
}: {
  projectId: string;
  systemId: string;
}) {
  const { session, isLoading, error, refetch } = useTargetSession(
    projectId,
    systemId,
  );
  const storeSession = useStoreTargetSession(projectId, systemId);
  const revokeSession = useRevokeTargetSession(projectId, systemId);
  const [showForm, setShowForm] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<TargetSessionFormInput>({
    resolver: zodResolver(targetSessionSchema),
    defaultValues: {
      auth_type: "cookie",
      credential: "",
    },
  });

  const authType = watch("auth_type");

  const onSubmit = handleSubmit(async (values) => {
    try {
      await storeSession.storeSession(values);
      reset({ auth_type: values.auth_type, credential: "" });
      setShowForm(false);
      notify.success("Sessao do alvo importada para os testes DAST.");
    } catch (err) {
      notify.fromApiError(err, "Nao foi possivel importar a sessao do alvo.");
    }
  });

  const handleRevoke = async () => {
    try {
      await revokeSession.revokeSession();
      setShowForm(false);
      notify.success("Sessao do alvo removida.");
    } catch (err) {
      notify.fromApiError(err, "Nao foi possivel remover a sessao do alvo.");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sessao do alvo</CardTitle>
        <CardDescription>
          Importe cookie ou token apos login no alvo para o DAST acessar rotas
          autenticadas. OAuth completo sera adicionado em uma fase posterior.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {error ? <ErrorShow error={error} onRetry={() => refetch()} /> : null}
        {storeSession.error ? <ErrorShow error={storeSession.error} /> : null}

        {isLoading ? (
          <Loading label="Carregando sessao..." />
        ) : session?.connected ? (
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="success">Conectada</Badge>
              <Badge tone="neutral">{session.auth_type}</Badge>
              {session.header_names?.map((name) => (
                <Badge key={name} tone="neutral">
                  {name}
                </Badge>
              ))}
            </div>
            <p className="text-sm text-muted-foreground">
              O proximo disparo DAST enviara estes headers ao worker.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowForm((value) => !value)}
              >
                Atualizar sessao
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="text-danger hover:bg-danger-surface hover:text-danger"
                isLoading={revokeSession.isLoading}
                onClick={() => void handleRevoke()}
              >
                Remover sessao
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">
              Faca login no alvo, copie o header Cookie ou Authorization do
              DevTools e cole abaixo.
            </p>
            <Button type="button" onClick={() => setShowForm(true)}>
              Importar sessao
            </Button>
          </div>
        )}

        {showForm ? (
          <form className="flex flex-col gap-4 border-t border-border pt-4" noValidate>
            <Field label="Tipo" htmlFor="auth_type">
              <select
                id="auth_type"
                className="w-full rounded-app border border-border bg-surface px-3 py-2 text-sm"
                {...register("auth_type")}
              >
                <option value="cookie">Cookie</option>
                <option value="bearer">Bearer token</option>
              </select>
            </Field>

            <Field
              label={authType === "cookie" ? "Valor do Cookie" : "Token Bearer"}
              htmlFor="credential"
              error={errors.credential?.message}
              hint={
                authType === "cookie"
                  ? "Ex.: laravel_session=...; XSRF-TOKEN=..."
                  : "Cole o token com ou sem o prefixo Bearer."
              }
            >
              {authType === "cookie" ? (
                <Textarea
                  id="credential"
                  rows={4}
                  className="font-mono text-xs"
                  hasError={Boolean(errors.credential)}
                  {...register("credential")}
                />
              ) : (
                <Input
                  id="credential"
                  className="font-mono"
                  hasError={Boolean(errors.credential)}
                  {...register("credential")}
                />
              )}
            </Field>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                isLoading={storeSession.isLoading}
                onClick={() => void onSubmit()}
              >
                Salvar sessao
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setShowForm(false);
                  reset();
                }}
              >
                Cancelar
              </Button>
            </div>
          </form>
        ) : null}
      </CardContent>
    </Card>
  );
}
