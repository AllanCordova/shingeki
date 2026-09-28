export type StackKind = "language" | "framework" | "generic";

export interface Stack {
  id: string;
  slug: string;
  name: string;
  kind?: StackKind;
  languages?: string[];
  is_primary?: boolean;
}

export interface StacksResponse {
  stacks: Stack[];
}
