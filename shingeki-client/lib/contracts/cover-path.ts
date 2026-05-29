import { z } from "zod";

/**
 * cover_path na API e um texto livre (sem upload ainda).
 * Para exibir no client, use URL direta da imagem — nao pagina do Pexels/Unsplash.
 */
export const coverPathSchema = z
  .string()
  .min(1, "Informe a URL da imagem de capa.")
  .max(2048, "A URL e muito longa.")
  .superRefine((value, ctx) => {
    const trimmed = value.trim();

    if (/^https?:\/\//i.test(trimmed)) {
      if (
        /pexels\.com/i.test(trimmed) &&
        !/images\.pexels\.com/i.test(trimmed)
      ) {
        ctx.addIssue({
          code: "custom",
          message:
            "Esse link e a pagina da foto no Pexels. Clique com o botao direito na imagem e use 'Copiar endereco da imagem' (dominio images.pexels.com).",
        });
      }
      return;
    }

    if (trimmed.startsWith("/")) {
      return;
    }

    ctx.addIssue({
      code: "custom",
      message:
        "Use uma URL completa da imagem, por exemplo https://images.pexels.com/photos/.../foto.jpeg",
    });
  });
