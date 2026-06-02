import { useEffect, useState } from "react";
import { Image, Text, View } from "react-native";
import { resolveCoverSrc } from "@/lib/cover-image";
import { pickCoverImage } from "@/lib/cover-picker";
import type { CoverImageAsset } from "@/lib/contracts/cover-asset";
import type { CoverUpload } from "@/lib/contracts/cover-upload";
import type { ApiError } from "@/lib/api/error-handler";
import { CoverLibraryPicker } from "./cover-library-picker";
import { Field } from "./field";
import { Button } from "./button";

interface CoverUploadProps {
  label?: string;
  value: CoverImageAsset | null;
  onChange: (asset: CoverImageAsset | undefined) => void;
  selectedUploadId: string | null;
  onSelectUpload: (uploadId: string | undefined) => void;
  libraryUploads: CoverUpload[];
  libraryCount: number;
  libraryLimit: number;
  libraryAtLimit: boolean;
  onRemoveLibraryUpload: (upload: CoverUpload) => Promise<void>;
  isRemovingLibrary?: boolean;
  removeLibraryError?: ApiError | null;
  currentCoverPath?: string | null;
  error?: string;
  libraryError?: string;
  required?: boolean;
  hint?: string;
}

export function CoverUpload({
  label = "Capa",
  value,
  onChange,
  selectedUploadId,
  onSelectUpload,
  libraryUploads,
  libraryCount,
  libraryLimit,
  libraryAtLimit,
  onRemoveLibraryUpload,
  isRemovingLibrary = false,
  removeLibraryError = null,
  currentCoverPath,
  error,
  libraryError,
  required = false,
  hint = "PNG, JPG ou WebP. Maximo 5 MB.",
}: CoverUploadProps) {
  const [uploadBlockedMessage, setUploadBlockedMessage] = useState<string | null>(
    null,
  );
  const [pickError, setPickError] = useState<string | null>(null);

  const selectedUpload = libraryUploads.find((u) => u.id === selectedUploadId);
  const libraryPreviewSrc = selectedUpload
    ? resolveCoverSrc(selectedUpload.path)
    : null;

  const existingSrc =
    !value && !selectedUploadId ? resolveCoverSrc(currentCoverPath) : null;
  const displaySrc = value?.uri ?? libraryPreviewSrc ?? existingSrc;

  useEffect(() => {
    if (value) {
      onSelectUpload(undefined);
    }
  }, [value, onSelectUpload]);

  const handleSelectUpload = (upload: CoverUpload | null) => {
    if (upload) {
      onChange(undefined);
      setUploadBlockedMessage(null);
      setPickError(null);
      onSelectUpload(upload.id);
      return;
    }

    onSelectUpload(undefined);
  };

  const handlePickImage = async () => {
    if (libraryAtLimit && !value) {
      setUploadBlockedMessage(
        `Limite de ${libraryLimit} imagens na biblioteca. Remova uma imagem ou selecione uma existente.`,
      );
      return;
    }

    setUploadBlockedMessage(null);
    setPickError(null);

    try {
      const asset = await pickCoverImage();
      if (asset) {
        onChange(asset);
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Nao foi possivel selecionar a imagem.";
      setPickError(message);
    }
  };

  const displayError =
    error ?? libraryError ?? uploadBlockedMessage ?? pickError ?? undefined;

  return (
    <Field
      label={required ? `${label} *` : label}
      error={displayError}
      hint={hint}
    >
      <View className="gap-4">
        <CoverLibraryPicker
          uploads={libraryUploads}
          count={libraryCount}
          limit={libraryLimit}
          atLimit={libraryAtLimit}
          selectedId={selectedUploadId}
          onSelect={handleSelectUpload}
          onRemove={onRemoveLibraryUpload}
          isRemoving={isRemovingLibrary}
          removeError={removeLibraryError}
          disabled={Boolean(value)}
        />

        <View className="gap-3">
          <Text className="text-sm font-medium text-foreground">Nova imagem</Text>

          <View className="aspect-[16/9] w-full overflow-hidden rounded-app border border-border bg-muted">
            {displaySrc ? (
              <Image
                source={{ uri: displaySrc }}
                className="h-full w-full"
                resizeMode="cover"
                accessibilityLabel="Pre-visualizacao da capa"
              />
            ) : (
              <View className="flex-1 items-center justify-center px-4">
                <Text className="text-center text-sm text-muted-foreground">
                  Selecione da biblioteca ou envie uma nova imagem
                </Text>
              </View>
            )}
          </View>

          <View className="flex-row flex-wrap gap-2">
            <Button
              variant="outline"
              disabled={libraryAtLimit && !value}
              onPress={handlePickImage}
            >
              {value ? "Trocar imagem" : "Escolher da galeria"}
            </Button>
            {value ? (
              <Button variant="ghost" onPress={() => onChange(undefined)}>
                Remover arquivo
              </Button>
            ) : null}
          </View>

          {value ? (
            <Text className="text-xs text-muted-foreground">{value.name}</Text>
          ) : null}
        </View>
      </View>
    </Field>
  );
}
