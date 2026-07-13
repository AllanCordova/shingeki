export interface SidebarNavItem {
  id?: string | null;
  type: "project" | "system";
  project_id: string;
  project_name?: string;
  system_id: string | null;
  name: string;
  visible: boolean;
  sort_order: number;
}

export interface SidebarNavProject {
  id: string;
  name: string;
  sort_order: number;
  systems: Array<{
    id: string;
    name: string;
    sort_order: number;
  }>;
}

export interface SidebarNavigationMeta {
  projects_count: number;
  systems_count: number;
}

export interface SidebarNavigationResponse {
  meta: SidebarNavigationMeta;
  sidebar: SidebarNavProject[];
  items: SidebarNavItem[];
}
