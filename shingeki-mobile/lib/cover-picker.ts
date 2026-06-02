import * as ImagePicker from "expo-image-picker";
import type { CoverImageAsset } from "@/lib/contracts/cover-asset";

export async function pickCoverImage(): Promise<CoverImageAsset | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    throw new Error("Permissao negada para acessar a galeria de fotos.");
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    allowsEditing: true,
    aspect: [16, 9],
    quality: 0.85,
  });

  if (result.canceled || !result.assets[0]) {
    return null;
  }

  return imagePickerAssetToCover(result.assets[0]);
}

export function imagePickerAssetToCover(
  asset: ImagePicker.ImagePickerAsset,
): CoverImageAsset {
  const extension = asset.uri.split(".").pop()?.split("?")[0] ?? "jpg";
  const name = asset.fileName ?? `cover.${extension}`;
  const type = asset.mimeType ?? "image/jpeg";

  return {
    uri: asset.uri,
    name,
    type,
    size: asset.fileSize,
  };
}
