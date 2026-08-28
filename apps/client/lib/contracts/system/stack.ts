export interface Stack {
  id: string;
  slug: string;
  name: string;
  languages?: string[];
  is_primary?: boolean;
}

export interface StacksResponse {
  stacks: Stack[];
}
