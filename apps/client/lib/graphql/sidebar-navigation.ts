import { gql } from "@apollo/client";
import type {
  SidebarNavItem,
  SidebarNavProject,
  SidebarNavigationMeta,
  SidebarNavigationResponse,
} from "@/lib/contracts";

export const SIDEBAR_NAVIGATION_QUERY = gql`
  query SidebarNavigation {
    sidebarNavigation {
      meta {
        projectsCount
        systemsCount
      }
      items {
        id
        type
        projectId
        projectName
        systemId
        name
        visible
        sortOrder
      }
      tree {
        id
        name
        sortOrder
        systems {
          id
          name
          sortOrder
        }
      }
    }
  }
`;

export const SYNC_SIDEBAR_NAVIGATION_MUTATION = gql`
  mutation SyncSidebarNavigation($items: [SidebarNavItemInput!]!) {
    syncSidebarNavigation(items: $items) {
      meta {
        projectsCount
        systemsCount
      }
      items {
        id
        type
        projectId
        projectName
        systemId
        name
        visible
        sortOrder
      }
      tree {
        id
        name
        sortOrder
        systems {
          id
          name
          sortOrder
        }
      }
    }
  }
`;

type GqlSidebarNavItem = {
  id?: string | null;
  type: "PROJECT" | "SYSTEM";
  projectId: string;
  projectName?: string | null;
  systemId?: string | null;
  name: string;
  visible: boolean;
  sortOrder: number;
};

type GqlSidebarNavProject = {
  id: string;
  name: string;
  sortOrder: number;
  systems: Array<{
    id: string;
    name: string;
    sortOrder: number;
  }>;
};

type GqlSidebarNavigation = {
  meta: {
    projectsCount: number;
    systemsCount: number;
  };
  items: GqlSidebarNavItem[];
  tree: GqlSidebarNavProject[];
};

function mapItem(item: GqlSidebarNavItem): SidebarNavItem {
  return {
    id: item.id,
    type: item.type === "PROJECT" ? "project" : "system",
    project_id: item.projectId,
    project_name: item.projectName ?? undefined,
    system_id: item.systemId ?? null,
    name: item.name,
    visible: item.visible,
    sort_order: item.sortOrder,
  };
}

function mapProject(project: GqlSidebarNavProject): SidebarNavProject {
  return {
    id: project.id,
    name: project.name,
    sort_order: project.sortOrder,
    systems: project.systems.map((system) => ({
      id: system.id,
      name: system.name,
      sort_order: system.sortOrder,
    })),
  };
}

function mapMeta(meta: GqlSidebarNavigation["meta"]): SidebarNavigationMeta {
  return {
    projects_count: meta.projectsCount,
    systems_count: meta.systemsCount,
  };
}

export function mapSidebarNavigation(
  data: GqlSidebarNavigation,
): SidebarNavigationResponse {
  return {
    meta: mapMeta(data.meta),
    sidebar: data.tree.map(mapProject),
    items: data.items.map(mapItem),
  };
}

export function toSidebarNavItemInputs(items: SidebarNavItem[]) {
  return items.map((item) => ({
    projectId: item.project_id,
    systemId: item.system_id,
    visible: item.visible,
    sortOrder: item.sort_order,
  }));
}
