import { NextRequest, NextResponse } from "next/server";
import { unauthorizedIfNoSession } from "@/lib/api/route-helpers";

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
  const unauthorized = await unauthorizedIfNoSession();
  if (unauthorized) return unauthorized;

  const apiKey = process.env.PEXELS_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json(
      {
        message:
          "Busca de imagens indisponivel. Configure PEXELS_API_KEY no ambiente do client.",
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
      { message: "Nao foi possivel buscar imagens no momento." },
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
