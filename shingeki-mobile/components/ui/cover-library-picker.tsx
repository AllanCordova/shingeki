import { useState } from "react";
import {
  Image,
  Pressable,
  Text,
  View,
  type LayoutChangeEvent,
} from "react-native";
import { resolveCoverSrc } from "@/lib/cover-image";
import { MAX_COVER_UPLOADS } from "@/lib/cover-library";
import type { CoverUpload } from "@/lib/contracts/cover-upload";
import type { ApiError } from "@/lib/api/error-handler";
import { Button } from "./button";
import { ErrorShow } from "./error-show";
import { Modal } from "./modal";
import { Spinner } from "./spinner";

interface CoverLibraryPickerProps {
  uploads: CoverUpload[];
  count: number;
  limit?: number;
  atLimit: boolean;
  selectedId: string | null;
  onSelect: (upload: CoverUpload | null) => void;
  onRemove: (upload: CoverUpload) => Promise<void>;
  isRemoving?: boolean;
  removeError?: ApiError | null;
  disabled?: boolean;
}

export function CoverLibraryPicker({
  uploads,
  count,
  limit = MAX_COVER_UPLOADS,
  atLimit,
  selectedId,
  onSelect,
  onRemove,
  isRemoving = false,
  removeError = null,
  disabled = false,
}: CoverLibraryPickerProps) {
  const [uploadToRemove, setUploadToRemove] = useState<CoverUpload | null>(null);
  const [pendingRemoveId, setPendingRemoveId] = useState<string | null>(null);
  const [tileWidth, setTileWidth] = useState<number | null>(null);

  const closeRemoveModal = () => {
    if (!pendingRemoveId) setUploadToRemove(null);
  };

  const handleConfirmRemove = async () => {
    if (!uploadToRemove || pendingRemoveId) return;

    setPendingRemoveId(uploadToRemove.id);
    try {
      await onRemove(uploadToRemove);
      if (selectedId === uploadToRemove.id) {
        onSelect(null);
      }
      setUploadToRemove(null);
    } finally {
      setPendingRemoveId(null);
    }
  };

  const onGridLayout = (event: LayoutChangeEvent) => {
    const width = event.nativeEvent.layout.width;
    if (width > 0) {
      setTileWidth((width - 16) / 3);
    }
  };

  return (
    <>
      <View className="gap-2">
        <View className="flex-row items-center justify-between gap-2">
          <Text className="text-sm font-medium text-foreground">
            Biblioteca de capas
          </Text>
          <Text
            className={`text-xs ${atLimit ? "text-danger" : "text-muted-foreground"}`}
          >
            {count}/{limit} imagens
          </Text>
        </View>

        {atLimit ? (
          <Text className="text-xs text-danger">
            Limite de {limit} imagens atingido. Remova uma da biblioteca ou
            reutilize uma existente antes de enviar outra nova.
          </Text>
        ) : (
          <Text className="text-xs text-muted-foreground">
            Selecione uma imagem ja enviada ou envie uma nova abaixo.
          </Text>
        )}

        {uploads.length === 0 ? (
          <View className="rounded-app border border-dashed border-border px-3 py-4">
            <Text className="text-center text-sm text-muted-foreground">
              Nenhuma imagem na biblioteca ainda. Envie a primeira capa abaixo.
            </Text>
          </View>
        ) : (
          <View
            className="flex-row flex-wrap gap-2"
            onLayout={onGridLayout}
          >
            {uploads.map((upload) => {
              const src = resolveCoverSrc(upload.path);
              const isSelected = selectedId === upload.id;
              const isDeleting = pendingRemoveId === upload.id;

              return (
                <View
                  key={upload.id}
                  className={`relative overflow-hidden rounded-app border ${
                    isSelected ? "border-primary" : "border-border"
                  }`}
                  style={tileWidth ? { width: tileWidth, height: tileWidth } : { width: "31%", aspectRatio: 1 }}
                >
                  <Pressable
                    disabled={disabled || isRemoving}
                    onPress={() => onSelect(isSelected ? null : upload)}
                    className="h-full w-full bg-muted"
                  >
                    {src ? (
                      <Image
                        source={{ uri: src }}
                        className="h-full w-full"
                        resizeMode="cover"
                      />
                    ) : (
                      <View className="flex-1 items-center justify-center">
                        <Text className="text-xs text-muted-foreground">
                          Sem preview
                        </Text>
                      </View>
                    )}
                  </Pressable>

                  <Pressable
                    disabled={disabled || isRemoving || isDeleting}
                    onPress={() => setUploadToRemove(upload)}
                    className="absolute right-1 top-1 h-7 w-7 items-center justify-center rounded-md bg-foreground/75"
                    accessibilityLabel="Remover imagem da biblioteca"
                  >
                    {isDeleting ? (
                      <Spinner size="sm" />
                    ) : (
                      <Text className="text-xs font-bold text-surface">×</Text>
                    )}
                  </Pressable>
                </View>
              );
            })}
          </View>
        )}
      </View>

      <Modal
        open={uploadToRemove !== null}
        onClose={closeRemoveModal}
        title="Remover imagem da biblioteca"
        description="Esta acao nao pode ser desfeita."
        footer={
          <>
            <Button
              variant="ghost"
              onPress={closeRemoveModal}
              disabled={Boolean(pendingRemoveId)}
            >
              Cancelar
            </Button>
            <Button
              variant="danger"
              isLoading={Boolean(pendingRemoveId)}
              onPress={handleConfirmRemove}
            >
              Remover
            </Button>
          </>
        }
      >
        {removeError ? (
          <ErrorShow error={removeError} />
        ) : (
          <Text className="text-sm text-muted-foreground">
            Tem certeza que deseja remover esta imagem do seu historico? Projetos
            e sistemas que ainda a utilizam nao serao afetados.
          </Text>
        )}
      </Modal>
    </>
  );
}
