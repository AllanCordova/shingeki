/**
 * Tipos comuns das respostas da API Shingeki.
 * Mantemos como tipos TypeScript (e nao schemas Zod) porque sao apenas
 * o formato de saida — a validacao com Zod fica nos formularios (entrada).
 */

export interface ApiMessage {
  message: string;
}

export type Timestamps = {
  created_at: string | null;
  updated_at: string | null;
};
