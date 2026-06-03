export interface CoverStockImage {
  id: number;
  alt: string;
  photographer: string;
  previewUrl: string;
  srcUrl: string;
}

export interface CoverStockImagesResponse {
  images: CoverStockImage[];
  page: number;
  per_page: number;
  query: string | null;
}
