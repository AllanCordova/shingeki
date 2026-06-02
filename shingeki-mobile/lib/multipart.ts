import { Platform } from "react-native";
import type { CoverImageAsset } from "@/lib/contracts/cover-asset";
import type { ProjectCreateInput, ProjectUpdateInput } from "@/lib/contracts/project";
import type { SystemCreateInput, SystemUpdateInput } from "@/lib/contracts/system";

type CoverPayload = {
  cover?: CoverImageAsset;
  cover_upload_id?: string;
};

function normalizeUploadUri(uri: string): string {
  if (Platform.OS === "ios") {
    return uri.replace("file://", "");
  }
  return uri;
}

function appendCoverFields(formData: FormData, cover: CoverPayload): void {
  if (cover.cover) {
    formData.append("cover", {
      uri: normalizeUploadUri(cover.cover.uri),
      name: cover.cover.name,
      type: cover.cover.type,
    } as unknown as Blob);
  }
  if (cover.cover_upload_id) {
    formData.append("cover_upload_id", cover.cover_upload_id);
  }
}

export function buildProjectCreateFormData(input: ProjectCreateInput): FormData {
  const formData = new FormData();
  formData.append("name", input.name);
  formData.append("description", input.description);
  appendCoverFields(formData, input);
  return formData;
}

export function buildProjectUpdateFormData(
  input: ProjectUpdateInput,
): FormData | null {
  const formData = new FormData();
  let hasField = false;

  if (input.name !== undefined) {
    formData.append("name", input.name);
    hasField = true;
  }

  if (input.description !== undefined) {
    formData.append("description", input.description);
    hasField = true;
  }

  if (input.cover || input.cover_upload_id) {
    appendCoverFields(formData, input);
    hasField = true;
  }

  return hasField ? formData : null;
}

export function buildSystemCreateFormData(input: SystemCreateInput): FormData {
  const formData = new FormData();
  formData.append("name", input.name);
  formData.append("target_url", input.target_url);
  formData.append("repository_url", input.repository_url);
  appendCoverFields(formData, input);
  return formData;
}

export function buildSystemUpdateFormData(
  input: SystemUpdateInput,
): FormData | null {
  const formData = new FormData();
  let hasField = false;

  if (input.name !== undefined) {
    formData.append("name", input.name);
    hasField = true;
  }

  if (input.target_url !== undefined) {
    formData.append("target_url", input.target_url);
    hasField = true;
  }

  if (input.repository_url !== undefined) {
    formData.append("repository_url", input.repository_url);
    hasField = true;
  }

  if (input.cover || input.cover_upload_id) {
    appendCoverFields(formData, input);
    hasField = true;
  }

  return hasField ? formData : null;
}
