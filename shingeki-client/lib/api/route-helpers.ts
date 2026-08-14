import "server-only";

import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createServerApi, forwardToApi } from "@/lib/api/server";
import { AUTH_COOKIE } from "@/lib/config";

/** 401 se o cookie de sessao nao existir. Rotas BFF que nao passam pela Laravel. */
export async function unauthorizedIfNoSession(): Promise<NextResponse | null> {
  const token = (await cookies()).get(AUTH_COOKIE)?.value?.trim();
  if (!token) {
    return NextResponse.json({ message: "Nao autenticado." }, { status: 401 });
  }
  return null;
}

/** Converte o resultado de forwardToApi em uma resposta JSON do Next. */
export function respond(result: { status: number; data: unknown }): NextResponse {
  return NextResponse.json(result.data, { status: result.status });
}

/** Le o corpo JSON da requisicao com seguranca (retorna {} se vazio/invalido). */
export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

export function isMultipartRequest(request: Request): boolean {
  const contentType = request.headers.get("content-type") ?? "";
  return contentType.includes("multipart/form-data");
}

/** Encaminha GET com query string para a API Laravel. */
export async function forwardGetWithQuery(request: Request, apiPath: string) {
  const query = new URL(request.url).searchParams.toString();
  const path = apiPath + (query ? `?${query}` : "");
  return respond(await forwardToApi("get", path));
}

/** Encaminha download de template CSV da API Laravel. */
export async function forwardCsvTemplate(apiPath: string, fallbackFilename: string) {
  const api = await createServerApi();
  const response = await api.get(apiPath, { responseType: "arraybuffer" });

  if (response.status >= 400) {
    return NextResponse.json(response.data, { status: response.status });
  }

  return new NextResponse(response.data, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=UTF-8",
      "Content-Disposition":
        response.headers["content-disposition"] ??
        `attachment; filename="${fallbackFilename}"`,
    },
  });
}

/** Encaminha download de PDF da API Laravel. */
export async function forwardPdfDownload(apiPath: string, fallbackFilename: string) {
  const api = await createServerApi();
  const response = await api.get(apiPath, { responseType: "arraybuffer" });

  if (response.status >= 400) {
    try {
      const text = new TextDecoder().decode(response.data as ArrayBuffer);
      return NextResponse.json(JSON.parse(text), { status: response.status });
    } catch {
      return NextResponse.json(
        { message: "Nao foi possivel exportar o relatorio." },
        { status: response.status },
      );
    }
  }

  return new NextResponse(response.data, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition":
        response.headers["content-disposition"] ??
        `attachment; filename="${fallbackFilename}"`,
    },
  });
}
