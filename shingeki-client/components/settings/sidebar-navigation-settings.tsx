"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  type DragEndEvent,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { SidebarNavItem } from "@/lib/contracts";
import {
  useSidebarNavigation,
  useUpdateSidebarNavigation,
} from "@/lib/hooks/settings/use-sidebar-navigation";
import { notify } from "@/lib/ui/notify";
import { cn } from "@/lib/utils";
import {
  Button,
  Checkbox,
  ErrorShow,
  Loading,
} from "@/components/ui";
import { ChevronDownIcon, ChevronUpIcon, GripVerticalIcon } from "@/components/ui/icons";

interface ProjectGroup {
  project: SidebarNavItem;
  systems: SidebarNavItem[];
}

function projectSortId(projectId: string) {
  return `project-${projectId}`;
}

function systemSortId(systemId: string) {
  return `system-${systemId}`;
}

function groupItems(items: SidebarNavItem[]): ProjectGroup[] {
  const projects = items
    .filter((item) => item.type === "project")
    .sort((left, right) => left.sort_order - right.sort_order);

  return projects.map((project) => ({
    project,
    systems: items
      .filter(
        (item) => item.type === "system" && item.project_id === project.project_id,
      )
      .sort((left, right) => left.sort_order - right.sort_order),
  }));
}

function flattenGroups(groups: ProjectGroup[]): SidebarNavItem[] {
  const flat: SidebarNavItem[] = [];
  let order = 0;

  for (const group of groups) {
    flat.push({ ...group.project, sort_order: order++ });
    for (const system of group.systems) {
      flat.push({ ...system, sort_order: order++ });
    }
  }

  return flat;
}

function moveProject(groups: ProjectGroup[], projectId: string, direction: -1 | 1) {
  const index = groups.findIndex((group) => group.project.project_id === projectId);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= groups.length) return groups;

  return arrayMove(groups, index, target);
}

function moveSystem(
  groups: ProjectGroup[],
  projectId: string,
  systemId: string,
  direction: -1 | 1,
) {
  return groups.map((group) => {
    if (group.project.project_id !== projectId) return group;

    const index = group.systems.findIndex((system) => system.system_id === systemId);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= group.systems.length) return group;

    return { ...group, systems: arrayMove(group.systems, index, target) };
  });
}

function toggleProjectVisibility(groups: ProjectGroup[], projectId: string, visible: boolean) {
  return groups.map((group) => {
    if (group.project.project_id !== projectId) return group;
    return { ...group, project: { ...group.project, visible } };
  });
}

function toggleSystemVisibility(
  groups: ProjectGroup[],
  projectId: string,
  systemId: string,
  visible: boolean,
) {
  return groups.map((group) => {
    if (group.project.project_id !== projectId) return group;

    return {
      ...group,
      systems: group.systems.map((system) =>
        system.system_id === systemId ? { ...system, visible } : system,
      ),
    };
  });
}

function ReorderButtons({
  label,
  canMoveUp,
  canMoveDown,
  onMoveUp,
  onMoveDown,
}: {
  label: string;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  return (
    <div className="flex items-center gap-0.5">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-10 w-10 p-0"
        disabled={!canMoveUp}
        aria-label={`Subir ${label}`}
        onClick={onMoveUp}
      >
        <ChevronUpIcon className="h-6 w-6 shrink-0 stroke-[2.5]" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-10 w-10 p-0"
        disabled={!canMoveDown}
        aria-label={`Descer ${label}`}
        onClick={onMoveDown}
      >
        <ChevronDownIcon className="h-6 w-6 shrink-0 stroke-[2.5]" />
      </Button>
    </div>
  );
}

function DragHandle({
  label,
  listeners,
  attributes,
  setActivatorNodeRef,
}: {
  label: string;
  listeners: ReturnType<typeof useSortable>["listeners"];
  attributes: ReturnType<typeof useSortable>["attributes"];
  setActivatorNodeRef: ReturnType<typeof useSortable>["setActivatorNodeRef"];
}) {
  return (
    <button
      type="button"
      ref={setActivatorNodeRef}
      className="inline-flex h-10 w-10 shrink-0 cursor-grab items-center justify-center rounded-app text-muted-foreground transition-colors hover:bg-muted hover:text-foreground active:cursor-grabbing"
      aria-label={`Arrastar ${label}`}
      title="Arrastar para reordenar"
      {...attributes}
      {...listeners}
    >
      <GripVerticalIcon className="h-5 w-5 shrink-0" />
    </button>
  );
}

function SortableRow({
  id,
  children,
}: {
  id: string;
  children: (props: {
    setNodeRef: (element: HTMLElement | null) => void;
    style: React.CSSProperties;
    isDragging: boolean;
    attributes: ReturnType<typeof useSortable>["attributes"];
    listeners: ReturnType<typeof useSortable>["listeners"];
    setActivatorNodeRef: ReturnType<typeof useSortable>["setActivatorNodeRef"];
  }) => ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <>
      {children({
        setNodeRef,
        style,
        isDragging,
        attributes,
        listeners,
        setActivatorNodeRef,
      })}
    </>
  );
}

export function SidebarNavigationSettings() {
  const { items, isLoading, isError, error, refetch } = useSidebarNavigation();
  const { updateSidebar, isLoading: isSaving, error: saveError } =
    useUpdateSidebarNavigation();
  const initialGroups = useMemo(() => groupItems(items), [items]);
  const [groups, setGroups] = useState(initialGroups);
  const [dirty, setDirty] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  useEffect(() => {
    setGroups(initialGroups);
    setDirty(false);
  }, [initialGroups]);

  const markDirty = () => setDirty(true);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    if (activeId.startsWith("project-")) {
      if (!overId.startsWith("project-")) return;

      const activeProjectId = activeId.replace("project-", "");
      const overProjectId = overId.replace("project-", "");

      setGroups((current) => {
        const oldIndex = current.findIndex(
          (group) => group.project.project_id === activeProjectId,
        );
        const newIndex = current.findIndex(
          (group) => group.project.project_id === overProjectId,
        );
        if (oldIndex < 0 || newIndex < 0) return current;
        return arrayMove(current, oldIndex, newIndex);
      });
      markDirty();
      return;
    }

    if (activeId.startsWith("system-")) {
      if (!overId.startsWith("system-")) return;

      const activeSystemId = activeId.replace("system-", "");
      const overSystemId = overId.replace("system-", "");

      setGroups((current) =>
        current.map((group) => {
          const oldIndex = group.systems.findIndex(
            (system) => system.system_id === activeSystemId,
          );
          const newIndex = group.systems.findIndex(
            (system) => system.system_id === overSystemId,
          );
          if (oldIndex < 0 || newIndex < 0) return group;
          return { ...group, systems: arrayMove(group.systems, oldIndex, newIndex) };
        }),
      );
      markDirty();
    }
  };

  const handleSave = async () => {
    const payload = flattenGroups(groups);
    await notify.run(() => updateSidebar(payload), {
      success: "Navegacao da sidebar atualizada.",
    });
    setDirty(false);
  };

  if (isLoading) return <Loading label="Carregando preferencias..." />;
  if (isError) return <ErrorShow error={error} onRetry={() => refetch()} />;

  if (groups.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Crie um projeto para configurar a sidebar.
      </p>
    );
  }

  const projectSortIds = groups.map((group) => projectSortId(group.project.project_id));

  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-muted-foreground">
        Escolha quais projetos e sistemas aparecem na sidebar. Arraste pelo icone
        de alca ou use as setas para definir a ordem.
      </p>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={projectSortIds} strategy={verticalListSortingStrategy}>
          <div className="flex flex-col gap-4">
            {groups.map((group, projectIndex) => {
              const projectId = group.project.project_id;
              const systemSortIds = group.systems
                .map((system) => system.system_id)
                .filter((id): id is string => Boolean(id))
                .map(systemSortId);

              return (
                <SortableRow key={projectId} id={projectSortId(projectId)}>
                  {({
                    setNodeRef,
                    style,
                    isDragging,
                    attributes,
                    listeners,
                    setActivatorNodeRef,
                  }) => (
                    <div
                      ref={setNodeRef}
                      style={style}
                      className={cn(
                        "rounded-app border border-border bg-surface",
                        isDragging && "z-10 opacity-80 shadow-md",
                      )}
                    >
                      <div className="flex items-center gap-2 border-b border-border px-3 py-2">
                        <DragHandle
                          label={group.project.name}
                          attributes={attributes}
                          listeners={listeners}
                          setActivatorNodeRef={setActivatorNodeRef}
                        />
                        <Checkbox
                          checked={group.project.visible}
                          onChange={(event) => {
                            setGroups((current) =>
                              toggleProjectVisibility(
                                current,
                                projectId,
                                event.target.checked,
                              ),
                            );
                            markDirty();
                          }}
                          label={group.project.name}
                        />
                        <div className="ml-auto">
                          <ReorderButtons
                            label={group.project.name}
                            canMoveUp={projectIndex > 0}
                            canMoveDown={projectIndex < groups.length - 1}
                            onMoveUp={() => {
                              setGroups((current) => moveProject(current, projectId, -1));
                              markDirty();
                            }}
                            onMoveDown={() => {
                              setGroups((current) => moveProject(current, projectId, 1));
                              markDirty();
                            }}
                          />
                        </div>
                      </div>

                      {group.systems.length > 0 ? (
                        <SortableContext
                          items={systemSortIds}
                          strategy={verticalListSortingStrategy}
                        >
                          <ul className="flex flex-col divide-y divide-border">
                            {group.systems.map((system, systemIndex) => {
                              const systemId = system.system_id;
                              if (!systemId) return null;

                              return (
                                <SortableRow key={systemId} id={systemSortId(systemId)}>
                                  {({
                                    setNodeRef: setSystemRef,
                                    style: systemStyle,
                                    isDragging: isSystemDragging,
                                    attributes: systemAttributes,
                                    listeners: systemListeners,
                                    setActivatorNodeRef: setSystemActivatorRef,
                                  }) => (
                                    <li
                                      ref={setSystemRef}
                                      style={systemStyle}
                                      className={cn(
                                        "flex items-center gap-2 px-3 py-2 pl-4",
                                        isSystemDragging && "z-10 bg-muted/40 opacity-80",
                                      )}
                                    >
                                      <DragHandle
                                        label={system.name}
                                        attributes={systemAttributes}
                                        listeners={systemListeners}
                                        setActivatorNodeRef={setSystemActivatorRef}
                                      />
                                      <Checkbox
                                        checked={system.visible}
                                        onChange={(event) => {
                                          setGroups((current) =>
                                            toggleSystemVisibility(
                                              current,
                                              projectId,
                                              systemId,
                                              event.target.checked,
                                            ),
                                          );
                                          markDirty();
                                        }}
                                        label={system.name}
                                      />
                                      <div className="ml-auto">
                                        <ReorderButtons
                                          label={system.name}
                                          canMoveUp={systemIndex > 0}
                                          canMoveDown={systemIndex < group.systems.length - 1}
                                          onMoveUp={() => {
                                            setGroups((current) =>
                                              moveSystem(current, projectId, systemId, -1),
                                            );
                                            markDirty();
                                          }}
                                          onMoveDown={() => {
                                            setGroups((current) =>
                                              moveSystem(current, projectId, systemId, 1),
                                            );
                                            markDirty();
                                          }}
                                        />
                                      </div>
                                    </li>
                                  )}
                                </SortableRow>
                              );
                            })}
                          </ul>
                        </SortableContext>
                      ) : (
                        <p className="px-4 py-3 pl-14 text-sm text-muted-foreground">
                          Nenhum sistema neste projeto.
                        </p>
                      )}
                    </div>
                  )}
                </SortableRow>
              );
            })}
          </div>
        </SortableContext>
      </DndContext>

      {saveError ? <ErrorShow error={saveError} /> : null}

      <div className="flex justify-end">
        <Button
          type="button"
          onClick={handleSave}
          isLoading={isSaving}
          disabled={!dirty || isSaving}
        >
          Salvar navegacao
        </Button>
      </div>
    </div>
  );
}
