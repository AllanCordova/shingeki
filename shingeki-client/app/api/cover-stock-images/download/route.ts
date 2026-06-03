import { NextRequest, NextResponse } from "next/server";

const ALLOWED_HOSTS = new Set(["images.pexels.com"]);

function isAllowedPexelsUrl(raw: string): boolean {
  try {
    const url = new URL(raw);
    return url.protocol === "https:" && ALLOWED_HOSTS.has(url.hostname);
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as { url?: string; filename?: string };
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
      "Content-Disposition": `inline; filename="${body.filename ?? "cover.jpg"}"`,
    },
  });
}
