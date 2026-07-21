import { NextRequest, NextResponse } from "next/server";
import { forwardToApi } from "@/lib/api/server";

const PEXELS_API = "https://api.pexels.com/v1";
const DEFAULT_QUERY = "technology abstract";

type PexelsPhoto = {
  id: number;
  alt: string;
  photographer: string;
  src: {
    medium: string;
    large2x: string;
  };
};

type PexelsSearchResponse = {
  photos: PexelsPhoto[];
  page: number;
  per_page: number;
  total_results?: number;
};

function mapPhoto(photo: PexelsPhoto) {
  return {
    id: photo.id,
    alt: photo.alt || "Imagem de capa",
    photographer: photo.photographer,
    previewUrl: photo.src.medium,
    srcUrl: photo.src.large2x,
  };
}

export async function GET(request: NextRequest) {
  const me = await forwardToApi("get", "/auth/me");
  if (me.status !== 200) {
    return NextResponse.json({ message: "Unauthenticated." }, { status: 401 });
  }

  const apiKey = process.env.PEXELS_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json(
      {
        message:
          "Busca de imagens indisponível no momento. Tente mais tarde ou contate o suporte.",
      },
      { status: 503 },
    );
  }

  const { searchParams } = request.nextUrl;
  const query = searchParams.get("query")?.trim() || DEFAULT_QUERY;
  const perPage = Math.min(
    30,
    Math.max(1, Number(searchParams.get("per_page") ?? "12") || 12),
  );
  const page = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);

  const url = new URL(`${PEXELS_API}/search`);
  url.searchParams.set("query", query);
  url.searchParams.set("per_page", String(perPage));
  url.searchParams.set("page", String(page));
  url.searchParams.set("orientation", "landscape");

  const response = await fetch(url, {
    headers: { Authorization: apiKey },
    next: { revalidate: 300 },
  });

  if (!response.ok) {
    return NextResponse.json(
      { message: "Não foi possível buscar imagens no momento." },
      { status: response.status === 401 ? 503 : 502 },
    );
  }

  const payload = (await response.json()) as PexelsSearchResponse;

  return NextResponse.json({
    images: payload.photos.map(mapPhoto),
    page: payload.page,
    per_page: payload.per_page,
    query,
  });
}
