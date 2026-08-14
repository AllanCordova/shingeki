import { NextRequest, NextResponse } from "next/server";
import { forwardToApi } from "@/lib/api/server";

const ALLOWED_HOSTS = new Set(["images.pexels.com"]);

function isAllowedPexelsUrl(raw: string): boolean {
  try {
    const url = new URL(raw);
    return url.protocol === "https:" && ALLOWED_HOSTS.has(url.hostname);
  } catch {
    return false;
  }
}

function sanitizeFilename(name: string | undefined): string {
  const cleaned = (name ?? "cover.jpg")
    .replace(/[^\w.\-]+/g, "_")
    .replace(/^\.+/, "")
    .slice(0, 120);
  return cleaned || "cover.jpg";
}

export async function POST(request: NextRequest) {
  const me = await forwardToApi("get", "/auth/me");
  if (me.status !== 200) {
    return NextResponse.json({ message: "Unauthenticated." }, { status: 401 });
  }

  const body = (await request.json()) as { url?: string; filename?: string };
  const url = body.url?.trim();

  if (!url || !isAllowedPexelsUrl(url)) {
    return NextResponse.json(
      { message: "URL de imagem inválida." },
      { status: 422 },
    );
  }

  const response = await fetch(url);
  if (!response.ok) {
    return NextResponse.json(
      { message: "Não foi possível baixar a imagem selecionada." },
      { status: 502 },
    );
  }

  const buffer = await response.arrayBuffer();
  const contentType = response.headers.get("content-type") ?? "image/jpeg";
  const filename = sanitizeFilename(body.filename);

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `inline; filename="${filename}"`,
    },
  });
}
