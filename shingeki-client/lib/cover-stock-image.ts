import { apiClient } from "@/lib/api/client";
import type { CoverStockImage } from "@/lib/contracts/cover-stock-image";

export async function coverStockImageToFile(image: CoverStockImage): Promise<File> {
  const { data } = await apiClient.post<Blob>(
    "/cover-stock-images/download",
    {
      url: image.srcUrl,
      filename: `pexels-${image.id}.jpg`,
    },
    { responseType: "blob" },
  );

  const type = data.type || "image/jpeg";
  return new File([data], `pexels-${image.id}.jpg`, { type });
}
