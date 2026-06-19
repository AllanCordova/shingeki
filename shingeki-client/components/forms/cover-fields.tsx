"use client";

import { useState } from "react";
import { Controller, type Control, type FieldErrors } from "react-hook-form";
import {
  useCoverUploads,
  useDeleteCoverUpload,
} from "@/lib/hooks/use-cover-uploads";
import { Button, CoverUpload, ErrorShow } from "@/components/ui";
import { EyeIcon, EyeOffIcon } from "@/components/ui/icons";

export type CoverFieldValues = {
  cover?: File;
  cover_upload_id?: string;
};

interface CoverFieldsProps {
  control: Control<CoverFieldValues>;
  errors: FieldErrors<CoverFieldValues>;
  currentCoverPath?: string | null;
  isEdit?: boolean;
  /** Oculta a secao por padrao; exibe controle com icone de olho. */
  collapsible?: boolean;
}

function CoverFieldsContent({
  control,
  errors,
  currentCoverPath,
  isEdit,
}: Omit<CoverFieldsProps, "collapsible">) {
  const {
    uploads,
    count,
    limit,
    atLimit,
    error: libraryQueryError,
  } = useCoverUploads();
  const {
    deleteCoverUpload,
    isLoading: isRemovingLibrary,
    error: removeLibraryError,
    reset: resetRemoveLibrary,
  } = useDeleteCoverUpload();

  return (
    <>
      {libraryQueryError ? <ErrorShow error={libraryQueryError} /> : null}

      <Controller
        name="cover"
        control={control}
        render={({ field: coverField }) => (
          <Controller
            name="cover_upload_id"
            control={control}
            render={({ field: libraryField }) => (
              <CoverUpload
                value={coverField.value ?? null}
                onChange={(file) => coverField.onChange(file)}
                selectedUploadId={libraryField.value ?? null}
                onSelectUpload={(id) => libraryField.onChange(id)}
                libraryUploads={uploads}
                libraryCount={count}
                libraryLimit={limit}
                libraryAtLimit={atLimit}
                onRemoveLibraryUpload={async (upload) => {
                  resetRemoveLibrary();
                  await deleteCoverUpload(upload.id);
                }}
                isRemovingLibrary={isRemovingLibrary}
                removeLibraryError={removeLibraryError}
                currentCoverPath={currentCoverPath}
                error={errors.cover?.message}
                libraryError={errors.cover_upload_id?.message}
                required={!isEdit}
                hint={undefined}
              />
            )}
          />
        )}
      />
    </>
  );
}

export function CoverFields({
  control,
  errors,
  currentCoverPath,
  isEdit = false,
  collapsible = false,
}: CoverFieldsProps) {
  const [expanded, setExpanded] = useState(false);

  const coverError = errors.cover?.message ?? errors.cover_upload_id?.message;
  const isCoverVisible = !collapsible || expanded || Boolean(coverError);

  if (!collapsible) {
    return (
      <CoverFieldsContent
        control={control}
        errors={errors}
        currentCoverPath={currentCoverPath}
        isEdit={isEdit}
      />
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2 rounded-app border border-border bg-surface-muted px-3 py-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground">
            Capa{isEdit ? "" : " *"}
          </p>
          <p className="text-xs text-muted-foreground">
            {isCoverVisible
              ? "Escolha uma origem abaixo."
              : isEdit
                ? "Opcional. Clique no olho para alterar a capa."
                : "Obrigatoria na criacao. Clique no olho para definir."}
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="shrink-0 px-2.5"
          onClick={() => setExpanded((current) => !current)}
          aria-label={expanded ? "Ocultar capa" : "Mostrar capa"}
          aria-expanded={isCoverVisible}
          title={isCoverVisible ? "Ocultar capa" : "Mostrar capa"}
        >
          {isCoverVisible ? <EyeOffIcon /> : <EyeIcon />}
        </Button>
      </div>

      {coverError && !isCoverVisible ? (
        <p className="text-xs text-danger">{coverError}</p>
      ) : null}

      {isCoverVisible ? (
        <CoverFieldsContent
          control={control}
          errors={errors}
          currentCoverPath={currentCoverPath}
          isEdit={isEdit}
        />
      ) : null}
    </div>
  );
}
