import { z } from "zod";
import { coverFileSchema } from "./cover-file";

const coverUploadIdSchema = z
  .string()
  .uuid("Selecione uma imagem valida da biblioteca.");

function withCoverSelection<T extends z.ZodRawShape>(shape: T) {
  return z.object(shape).superRefine((data, ctx) => {
    const record = data as {
      cover?: File;
      cover_upload_id?: string;
    };

    const hasFile = record.cover instanceof File;
    const hasLibrary = Boolean(record.cover_upload_id);

    if (hasFile && hasLibrary) {
      ctx.addIssue({
        code: "custom",
        message: "Escolha apenas um: enviar arquivo novo ou imagem da biblioteca.",
        path: ["cover"],
      });
    }
  });
}

export const coverCreateFields = {
  cover: coverFileSchema.optional(),
  cover_upload_id: coverUploadIdSchema.optional(),
};

export const coverUpdateFields = {
  cover: coverFileSchema.optional(),
  cover_upload_id: coverUploadIdSchema.optional(),
};

export function createWithCoverSchema<T extends z.ZodRawShape>(base: T) {
  return withCoverSelection({ ...base, ...coverCreateFields }).superRefine(
    (data, ctx) => {
      const record = data as { cover?: File; cover_upload_id?: string };
      if (!record.cover && !record.cover_upload_id) {
        ctx.addIssue({
          code: "custom",
          message: "Envie uma imagem ou selecione uma da biblioteca.",
          path: ["cover"],
        });
      }
    },
  );
}

export function updateWithCoverSchema<T extends z.ZodRawShape>(base: T) {
  return withCoverSelection({ ...base, ...coverUpdateFields });
}

export const coverUpdateOnlySchema = withCoverSelection(
  coverUpdateFields,
).superRefine((data, ctx) => {
  if (!data.cover && !data.cover_upload_id) {
    ctx.addIssue({
      code: "custom",
      message: "Envie uma imagem ou selecione uma da biblioteca.",
      path: ["cover"],
    });
  }
});

export type CoverUpdateOnlyInput = z.infer<typeof coverUpdateOnlySchema>;
