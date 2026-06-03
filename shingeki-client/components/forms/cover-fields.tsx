"use client";

import { Controller, type Control, type FieldErrors } from "react-hook-form";
import {
  useCoverUploads,
  useDeleteCoverUpload,
} from "@/lib/hooks/use-cover-uploads";
import { CoverUpload, ErrorShow } from "@/components/ui";

export type CoverFieldValues = {
  cover?: File;
  cover_upload_id?: string;
};

interface CoverFieldsProps {
  control: Control<CoverFieldValues>;
  errors: FieldErrors<CoverFieldValues>;
  currentCoverPath?: string | null;
  isEdit?: boolean;
}

export function CoverFields({
  control,
  errors,
  currentCoverPath,
  isEdit = false,
}: CoverFieldsProps) {
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
