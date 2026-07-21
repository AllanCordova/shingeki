"use client";

import { Controller, type Control, type FieldErrors } from "react-hook-form";
import type { UpdateProfileFormInput } from "@/lib/contracts";
import {
  useCoverUploads,
  useDeleteCoverUpload,
} from "@/lib/hooks/cover/use-cover-uploads";
import { CoverUpload, ErrorShow } from "@/components/ui";

interface AvatarFieldsProps {
  control: Control<UpdateProfileFormInput>;
  errors: FieldErrors<UpdateProfileFormInput>;
  currentAvatarPath?: string | null;
}

export function AvatarFields({
  control,
  errors,
  currentAvatarPath,
}: AvatarFieldsProps) {
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
        name="avatar"
        control={control}
        render={({ field: avatarField }) => (
          <Controller
            name="avatar_upload_id"
            control={control}
            render={({ field: libraryField }) => (
              <CoverUpload
                label="Foto de perfil"
                layout="avatar"
                tabs={["library", "file"]}
                value={avatarField.value ?? null}
                onChange={(file) => {
                  avatarField.onChange(file);
                  if (file) {
                    libraryField.onChange(undefined);
                  }
                }}
                selectedUploadId={libraryField.value ?? null}
                onSelectUpload={(id) => {
                  libraryField.onChange(id);
                  if (id) {
                    avatarField.onChange(undefined);
                  }
                }}
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
                currentCoverPath={currentAvatarPath}
                error={errors.avatar?.message}
                libraryError={errors.avatar_upload_id?.message}
              />
            )}
          />
        )}
      />
    </>
  );
}
