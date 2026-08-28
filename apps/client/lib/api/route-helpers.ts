import "server-only";

import { NextResponse } from "next/server";
import { createServerApi, forwardToApi } from "@/lib/api/server";

export function respond(result: { status: number; data: unknown }): NextResponse {
  return NextResponse.json(result.data, { status: result.status });
}

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

export async function requireAuthenticated(): Promise<NextResponse | null> {
  const me = await forwardToApi("get", "/auth/me");
  if (me.status === 200) {
    return null;
  }

  return NextResponse.json({ message: "Unauthenticated." }, { status: 401 });
}

export async function forwardGetWithQuery(request: Request, apiPath: string) {
  const query = new URL(request.url).searchParams.toString();
  const path = apiPath + (query ? `?${query}` : "");
  return respond(await forwardToApi("get", path));
}

async function forwardBinaryDownload(
  apiPath: string,
  fallbackFilename: string,
  contentType: string,
  fallbackErrorMessage: string,
) {
  const api = await createServerApi();
  const response = await api.get(apiPath, { responseType: "arraybuffer" });

  if (response.status >= 400) {
    try {
      const text = new TextDecoder().decode(response.data as ArrayBuffer);
      return NextResponse.json(JSON.parse(text), { status: response.status });
    } catch {
      return NextResponse.json(
        { message: fallbackErrorMessage },
        { status: response.status },
      );
    }
  }

  return new NextResponse(response.data, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Content-Disposition":
        response.headers["content-disposition"] ??
        `attachment; filename="${fallbackFilename}"`,
    },
  });
}

export async function forwardCsvTemplate(apiPath: string, fallbackFilename: string) {
  return forwardBinaryDownload(
    apiPath,
    fallbackFilename,
    "text/csv; charset=UTF-8",
    "Nao foi possivel baixar o template.",
  );
}

export async function forwardPdfDownload(apiPath: string, fallbackFilename: string) {
  return forwardBinaryDownload(
    apiPath,
    fallbackFilename,
    "application/pdf",
    "Nao foi possivel exportar o relatorio.",
  );
}
