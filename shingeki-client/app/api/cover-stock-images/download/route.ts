import { NextRequest, NextResponse } from "next/server";
import { readJson, unauthorizedIfNoSession } from "@/lib/api/route-helpers";

const ALLOWED_HOSTS = new Set(["images.pexels.com"]);

function isAllowedPexelsUrl(raw: string): boolean {
  try {
    const url = new URL(raw);
    return url.protocol === "https:" && ALLOWED_HOSTS.has(url.hostname);
  } catch {
    return false;
  }
}

function safeDownloadFilename(raw: string | undefined): string {
  const fallback = "cover.jpg";
  if (!raw) return fallback;
  const base = raw.replace(/[^A-Za-z0-9._-]/g, "").slice(0, 80);
  return base.length > 0 ? base : fallback;
}

export async function POST(request: NextRequest) {
  const unauthorized = await unauthorizedIfNoSession();
  if (unauthorized) return unauthorized;

  const body = (await readJson(request)) as { url?: string; filename?: string };
  const url = body.url?.trim();

  if (!url || !isAllowedPexelsUrl(url)) {
    return NextResponse.json({ message: "URL de imagem invalida." }, { status: 422 });
  }

  const response = await fetch(url);
  if (!response.ok) {
    return NextResponse.json(
      { message: "Nao foi possivel baixar a imagem selecionada." },
      { status: 502 },
    );
  }

  const buffer = await response.arrayBuffer();
  const contentType = response.headers.get("content-type") ?? "image/jpeg";

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `inline; filename="${safeDownloadFilename(body.filename)}"`,
    },
  });
}
