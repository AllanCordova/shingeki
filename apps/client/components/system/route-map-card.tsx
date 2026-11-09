"use client";

import { useRef, useState } from "react";
import { RouteMapPreviewList, useRouteMapPreview } from "@/components/attack/route-map-preview";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui";
import {
  DAST_ROUTE_MAP_TEMPLATE,
  parseDastRouteMap,
} from "@/lib/contracts/attack/route-map";

export function RouteMapCard() {
  const { replaceRoutes } = useRouteMapPreview();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  const loadRouteMapFile = async (file: File | undefined) => {
    if (!file) return;
    const parsed = parseDastRouteMap(await file.text());
    if ("error" in parsed) {
      setError(parsed.error);
      return;
    }
    replaceRoutes(parsed.routes);
    setError(null);
  };

  const loadTemplate = () => {
    const parsed = parseDastRouteMap(DAST_ROUTE_MAP_TEMPLATE);
    if ("error" in parsed) {
      setError(parsed.error);
      return;
    }
    replaceRoutes(parsed.routes);
    setError(null);
  };

  const downloadTemplate = () => {
    const blob = new Blob([DAST_ROUTE_MAP_TEMPLATE], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "dast-mapa-de-rotas.json";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Mapa de rotas</CardTitle>
        <CardDescription>
          Carregue o JSON da API uma vez. A prévia fica neste navegador e pode
          ser usada no disparo DAST.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={downloadTemplate}>
              Baixar template
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
            >
              Carregar arquivo
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={loadTemplate}>
              Usar template
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                void loadRouteMapFile(file);
              }}
            />
          </div>
          {error ? <p className="text-xs text-danger">{error}</p> : null}
          <RouteMapPreviewList />
        </div>
      </CardContent>
    </Card>
  );
}
