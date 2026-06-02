import { API_BASE_URL } from "@/lib/api/client";
import { getToken } from "./auth-storage";
import { ApiError } from "./error-handler";

type LaravelErrorBody = {
  message?: string;
  errors?: Record<string, string[]>;
};

function apiErrorFromResponse(status: number, body: LaravelErrorBody): ApiError {
  const fieldErrors: Record<string, string> = {};
  if (body.errors) {
    for (const [field, messages] of Object.entries(body.errors)) {
      const first = Array.isArray(messages) ? messages[0] : String(messages);
      if (first) fieldErrors[field] = first;
    }
  }

  const message =
    status === 422
      ? "Dados invalidos. Verifique os campos destacados."
      : body.message ?? "Ocorreu um erro na requisicao.";

  return new ApiError({ status, message, fieldErrors });
}

/**
 * React Native envia multipart de forma confiavel com fetch; axios costuma
 * falhar com "erro de conexao" (status 0) ao serializar FormData.
 */
export async function requestMultipart<T>(
  method: "POST" | "PUT",
  path: string,
  formData: FormData,
): Promise<T> {
  const token = await getToken();
  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: formData,
    });
  } catch (error) {
    const detail =
      error instanceof Error && error.message ? ` (${error.message})` : "";
    throw new ApiError({
      status: 0,
      message: `Nao foi possivel enviar os dados.${detail}`,
      fieldErrors: {},
    });
  }

  const text = await response.text();
  let body: LaravelErrorBody = {};
  if (text) {
    try {
      body = JSON.parse(text) as LaravelErrorBody;
    } catch {
      throw new ApiError({
        status: response.status,
        message: "Resposta invalida do servidor.",
        fieldErrors: {},
      });
    }
  }

  if (!response.ok) {
    throw apiErrorFromResponse(response.status, body);
  }

  return body as T;
}
