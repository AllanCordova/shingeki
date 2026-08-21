import { NextRequest, NextResponse } from "next/server";
import { readJson, requireAuthenticated } from "@/lib/api/route-helpers";
import { MAX_COVER_BYTES } from "@/lib/contracts/cover/cover-file";

const ALLOWED_HOSTS = new Set(["images.pexels.com"]);
const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);

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

function imageContentType(raw: string | null): string | null {
  const type = (raw ?? "").split(";")[0]?.trim().toLowerCase();
  if (!type || !ALLOWED_IMAGE_TYPES.has(type)) {
    return null;
  }
  return type === "image/jpg" ? "image/jpeg" : type;
}

export async function POST(request: NextRequest) {
  const unauthorized = await requireAuthenticated();
  if (unauthorized) {
    return unauthorized;
  }

  const body = (await readJson(request)) as { url?: string; filename?: string };
  const url = body.url?.trim();

  if (!url || !isAllowedPexelsUrl(url)) {
    return NextResponse.json(
      { message: "URL de imagem inválida." },
      { status: 422 },
    );
  }

  let response: Response;
  try {
    response = await fetch(url, { redirect: "error" });
  } catch {
    return NextResponse.json(
      { message: "Não foi possível baixar a imagem selecionada." },
      { status: 502 },
    );
  }

  if (!response.ok) {
    return NextResponse.json(
      { message: "Não foi possível baixar a imagem selecionada." },
      { status: 502 },
    );
  }

  const contentType = imageContentType(response.headers.get("content-type"));
  if (!contentType) {
    return NextResponse.json(
      { message: "A imagem selecionada nao e um formato suportado." },
      { status: 422 },
    );
  }

  const declaredLength = Number(response.headers.get("content-length") ?? 0);
  if (declaredLength > MAX_COVER_BYTES) {
    return NextResponse.json(
      { message: "A imagem deve ter no maximo 5 MB." },
      { status: 422 },
    );
  }

  const buffer = await response.arrayBuffer();
  if (buffer.byteLength > MAX_COVER_BYTES) {
    return NextResponse.json(
      { message: "A imagem deve ter no maximo 5 MB." },
      { status: 422 },
    );
  }

  const filename = sanitizeFilename(body.filename);

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
