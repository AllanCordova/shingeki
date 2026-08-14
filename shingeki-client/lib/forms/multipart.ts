import type { UpdateProfileFormInput } from "./contracts/auth";
import type { ProjectCreateInput, ProjectUpdateInput } from "./contracts/project";
import type { SystemCreateInput, SystemUpdateInput } from "./contracts/system";

type CoverPayload = {
  cover?: File;
  cover_upload_id?: string;
};

function appendCoverFields(formData: FormData, cover: CoverPayload): void {
  if (cover.cover) {
    formData.append("cover", cover.cover);
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
  input.stack_ids.forEach((stackId) => {
    formData.append("stack_ids[]", stackId);
  });
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

  if (input.stack_ids !== undefined) {
    input.stack_ids.forEach((stackId) => {
      formData.append("stack_ids[]", stackId);
    });
    hasField = true;
  }

  return hasField ? formData : null;
}

type AvatarPayload = {
  avatar?: File;
  avatar_upload_id?: string;
  remove_avatar?: boolean;
};

function appendAvatarFields(formData: FormData, avatar: AvatarPayload): void {
  if (avatar.avatar) {
    formData.append("avatar", avatar.avatar);
  }
  if (avatar.avatar_upload_id) {
    formData.append("avatar_upload_id", avatar.avatar_upload_id);
  }
  if (avatar.remove_avatar) {
    formData.append("remove_avatar", "1");
  }
}

export function buildProfileUpdateFormData(
  input: UpdateProfileFormInput,
): FormData {
  const formData = new FormData();
  formData.append("name", input.name);
  appendAvatarFields(formData, input);
  return formData;
}
