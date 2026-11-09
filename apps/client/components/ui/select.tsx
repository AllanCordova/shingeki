"use client";

import {
  Children,
  isValidElement,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FocusEvent,
  type KeyboardEvent,
  type ReactElement,
  type ReactNode,
  type Ref,
  type SelectHTMLAttributes,
} from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { ChevronDownIcon } from "./icons";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  hasError?: boolean;
  ref?: Ref<HTMLSelectElement>;
}

interface SelectOption {
  value: string;
  label: string;
  disabled: boolean;
}

interface MenuPosition {
  left: number;
  width: number;
  maxHeight: number;
  top?: number;
  bottom?: number;
}

const MENU_GAP = 4;
const MENU_MAX_HEIGHT = 240;

export function Select({ multiple, ...props }: SelectProps) {
  if (multiple) {
    return <NativeSelect multiple {...props} />;
  }

  return <ListboxSelect {...props} />;
}

function NativeSelect({ className, hasError, ref, children, ...props }: SelectProps) {
  return (
    <select
      ref={ref}
      className={cn(
        "h-10 w-full rounded-app border bg-surface px-3 text-sm text-foreground",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        "disabled:cursor-not-allowed disabled:opacity-50",
        hasError ? "border-danger" : "border-input",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}

function ListboxSelect({
  className,
  hasError,
  ref,
  children,
  value,
  defaultValue,
  onChange,
  onBlur,
  disabled,
  id,
  name,
  required,
  autoFocus,
  "aria-label": ariaLabel,
  title,
  ...props
}: SelectProps) {
  const uid = useId();
  const listboxId = `${uid}-listbox`;
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const selectRef = useRef<HTMLSelectElement>(null);
  const typeBuffer = useRef("");
  const typeTimer = useRef<number | null>(null);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [position, setPosition] = useState<MenuPosition | null>(null);
  const [uncontrolledValue, setUncontrolledValue] = useState(() =>
    scalarValue(defaultValue),
  );

  const options = collectOptions(children);
  const currentValue = value !== undefined ? scalarValue(value) : uncontrolledValue;
  const selected = options.find((option) => option.value === currentValue);
  const isPlaceholder = currentValue === "";

  const assignRef = (node: HTMLSelectElement | null) => {
    selectRef.current = node;

    if (node && node.dataset.valueHooked !== "true") {
      node.focus = () => {
        triggerRef.current?.focus();
      };

      const descriptor = Object.getOwnPropertyDescriptor(
        HTMLSelectElement.prototype,
        "value",
      );
      if (descriptor?.get && descriptor.set) {
        Object.defineProperty(node, "value", {
          configurable: true,
          get() {
            return descriptor.get?.call(this);
          },
          set(next: string) {
            descriptor.set?.call(this, next);
            setUncontrolledValue(String(next));
          },
        });
      }

      node.dataset.valueHooked = "true";
    }

    if (typeof ref === "function") {
      ref(node);
    } else if (ref) {
      ref.current = node;
    }
  };

  useEffect(() => {
    if (value !== undefined) return;

    const sync = () => {
      const element = selectRef.current;
      if (!element) return;
      setUncontrolledValue(element.value);
    };

    sync();
    const frame = requestAnimationFrame(sync);
    return () => cancelAnimationFrame(frame);
  }, [value, children]);

  useEffect(() => {
    if (value === undefined || !selectRef.current) return;
    const next = scalarValue(value);
    if (selectRef.current.value !== next) {
      selectRef.current.value = next;
    }
  }, [value]);

  useIsomorphicLayoutEffect(() => {
    if (!open) {
      setPosition(null);
      return;
    }

    const update = () => {
      const trigger = triggerRef.current;
      if (!trigger) return;
      setPosition(measureMenu(trigger));
    };

    update();

    const onScroll = (event: Event) => {
      if (menuRef.current?.contains(event.target as Node)) return;
      update();
    };

    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", update);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (rootRef.current?.contains(target) || menuRef.current?.contains(target)) {
        return;
      }
      setOpen(false);
    };

    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  useEffect(() => {
    if (!open || activeIndex < 0) return;
    document.getElementById(optionId(uid, activeIndex))?.scrollIntoView({
      block: "nearest",
    });
  }, [open, activeIndex, uid]);

  useEffect(() => {
    const timer = typeTimer;
    return () => {
      if (timer.current !== null) {
        window.clearTimeout(timer.current);
      }
    };
  }, []);

  const commit = (next: string) => {
    const element = selectRef.current;
    if (element) {
      element.value = next;
    }

    if (value === undefined) {
      setUncontrolledValue(next);
    }

    const target = element ?? ({ value: next, name: name ?? "" } as HTMLSelectElement);
    onChange?.({
      target,
      currentTarget: target,
    } as ChangeEvent<HTMLSelectElement>);
    setOpen(false);
  };

  const openMenu = () => {
    if (disabled) return;

    const resolved =
      value !== undefined
        ? scalarValue(value)
        : (selectRef.current?.value ?? uncontrolledValue);

    if (value === undefined && selectRef.current) {
      setUncontrolledValue(selectRef.current.value);
    }

    setActiveIndex(initialActiveIndex(options, resolved));
    setOpen(true);
  };

  const selectActive = () => {
    const option = options[activeIndex];
    if (!option || option.disabled) return;
    commit(option.value);
  };

  const onTriggerKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;

    if (event.key === "Escape") {
      if (!open) return;
      event.preventDefault();
      event.stopPropagation();
      setOpen(false);
      return;
    }

    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) {
        openMenu();
        return;
      }
      const direction = event.key === "ArrowDown" ? 1 : -1;
      setActiveIndex((current) => nextEnabled(options, current, direction));
      return;
    }

    if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      if (!open) openMenu();
      const index =
        event.key === "Home"
          ? options.findIndex((option) => !option.disabled)
          : findLastEnabled(options);
      if (index >= 0) setActiveIndex(index);
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (!open) {
        openMenu();
        return;
      }
      selectActive();
      return;
    }

    if (
      open &&
      event.key.length === 1 &&
      !event.altKey &&
      !event.ctrlKey &&
      !event.metaKey
    ) {
      event.preventDefault();
      const match = matchTypeahead(options, activeIndex, event.key, typeBuffer, typeTimer);
      if (match >= 0) setActiveIndex(match);
    }
  };

  const onTriggerBlur = (event: FocusEvent<HTMLButtonElement>) => {
    const next = event.relatedTarget;
    if (next instanceof Node && menuRef.current?.contains(next)) return;
    setOpen(false);
    onBlur?.(event as unknown as FocusEvent<HTMLSelectElement>);
  };

  const menu =
    open && position
      ? createPortal(
          <div
            ref={menuRef}
            id={listboxId}
            role="listbox"
            aria-labelledby={id}
            style={{
              left: position.left,
              width: position.width,
              maxHeight: position.maxHeight,
              top: position.top,
              bottom: position.bottom,
            }}
            className="fixed z-[70] overflow-auto overscroll-contain rounded-app border border-border bg-surface p-1 shadow-lg"
          >
            {options.length === 0 ? (
              <p className="px-2.5 py-2 text-sm text-muted-foreground">Nenhuma opção</p>
            ) : (
              options.map((option, index) => {
                const isSelected = option.value === currentValue;
                const isActive = index === activeIndex;

                return (
                  <div
                    key={`${option.value}-${index}`}
                    id={optionId(uid, index)}
                    role="option"
                    aria-selected={isSelected}
                    aria-disabled={option.disabled || undefined}
                    title={option.label}
                    className={cn(
                      "flex cursor-pointer items-center justify-between gap-2 rounded-app px-2.5 py-2 text-sm",
                      option.disabled && "cursor-not-allowed opacity-50",
                      isSelected
                        ? "bg-primary text-primary-foreground"
                        : isActive
                          ? "bg-surface-muted text-foreground"
                          : "text-foreground hover:bg-surface-muted",
                    )}
                    onMouseEnter={() => {
                      if (!option.disabled) setActiveIndex(index);
                    }}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => {
                      if (option.disabled) return;
                      commit(option.value);
                    }}
                  >
                    <span className="truncate">{option.label}</span>
                    {isSelected ? <CheckIcon /> : null}
                  </div>
                );
              })
            )}
          </div>,
          document.body,
        )
      : null;

  return (
    <div ref={rootRef} className={cn("relative w-full", className)}>
      <button
        ref={triggerRef}
        id={id}
        type="button"
        role="combobox"
        disabled={disabled}
        autoFocus={autoFocus}
        title={title}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-invalid={hasError || undefined}
        aria-activedescendant={open ? optionId(uid, activeIndex) : undefined}
        className={cn(
          "flex h-10 w-full items-center justify-between gap-2 rounded-app border bg-surface px-3 text-left text-sm",
          "cursor-pointer select-none",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          "disabled:cursor-not-allowed disabled:opacity-50",
          hasError ? "border-danger" : "border-input",
          open && "ring-2 ring-ring",
        )}
        onClick={() => {
          if (open) {
            setOpen(false);
            return;
          }
          openMenu();
        }}
        onKeyDown={onTriggerKeyDown}
        onBlur={onTriggerBlur}
      >
        <span
          className={cn(
            "min-w-0 flex-1 truncate",
            isPlaceholder || !selected ? "text-muted-foreground" : "text-foreground",
          )}
        >
          {selected?.label || "Selecione"}
        </span>
        <ChevronDownIcon
          className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
        />
      </button>

      <select
        {...props}
        ref={assignRef}
        name={name}
        required={required}
        disabled={disabled}
        defaultValue={defaultValue}
        tabIndex={-1}
        aria-hidden
        hidden
        onChange={(event) => {
          if (value === undefined) {
            setUncontrolledValue(event.target.value);
          }
        }}
      >
        {children}
      </select>

      {menu}
    </div>
  );
}

function CheckIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4 shrink-0"
      aria-hidden
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

const useIsomorphicLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

function optionId(uid: string, index: number): string {
  return `${uid}-option-${index}`;
}

function scalarValue(value: SelectProps["value"] | SelectProps["defaultValue"]): string {
  if (value === undefined || value === null) return "";
  if (Array.isArray(value)) return value[0] !== undefined ? String(value[0]) : "";
  return String(value);
}

function collectOptions(children: ReactNode): SelectOption[] {
  const options: SelectOption[] = [];

  const visit = (nodes: ReactNode) => {
    Children.forEach(nodes, (child) => {
      if (!isValidElement(child)) return;

      if (child.type === "optgroup") {
        visit((child.props as { children?: ReactNode }).children);
        return;
      }

      if (child.type !== "option") return;

      const props = child.props as {
        value?: string | number;
        disabled?: boolean;
        children?: ReactNode;
      };
      const label = nodeText(props.children).trim();
      const value = props.value !== undefined ? String(props.value) : label;

      options.push({
        value,
        label: label || value,
        disabled: Boolean(props.disabled),
      });
    });
  };

  visit(children);
  return options;
}

function nodeText(node: ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(nodeText).join("");
  if (isValidElement(node)) {
    return nodeText((node as ReactElement<{ children?: ReactNode }>).props.children);
  }
  return "";
}

function initialActiveIndex(options: SelectOption[], currentValue: string): number {
  const selected = options.findIndex(
    (option) => option.value === currentValue && !option.disabled,
  );
  if (selected >= 0) return selected;
  const first = options.findIndex((option) => !option.disabled);
  return first >= 0 ? first : 0;
}

function findLastEnabled(options: SelectOption[]): number {
  for (let index = options.length - 1; index >= 0; index -= 1) {
    if (!options[index]?.disabled) return index;
  }
  return -1;
}

function nextEnabled(options: SelectOption[], from: number, direction: 1 | -1): number {
  if (options.length === 0) return 0;

  let index = from;
  for (let step = 0; step < options.length; step += 1) {
    index = (index + direction + options.length) % options.length;
    if (!options[index]?.disabled) return index;
  }

  return from < 0 ? 0 : from;
}

function matchTypeahead(
  options: SelectOption[],
  activeIndex: number,
  key: string,
  buffer: { current: string },
  timer: { current: number | null },
): number {
  if (timer.current !== null) {
    window.clearTimeout(timer.current);
  }

  buffer.current += key.toLowerCase();
  timer.current = window.setTimeout(() => {
    buffer.current = "";
  }, 500);

  const query = buffer.current;
  const order = [
    ...options.keys().filter((index) => index > activeIndex),
    ...options.keys().filter((index) => index <= activeIndex),
  ];

  return (
    order.find((index) => {
      const option = options[index];
      return (
        option !== undefined &&
        !option.disabled &&
        option.label.trim().toLowerCase().startsWith(query)
      );
    }) ?? -1
  );
}

function measureMenu(trigger: HTMLElement): MenuPosition {
  const rect = trigger.getBoundingClientRect();
  const spaceBelow = window.innerHeight - rect.bottom - MENU_GAP;
  const spaceAbove = rect.top - MENU_GAP;
  const openAbove = spaceBelow < 160 && spaceAbove > spaceBelow;
  const available = openAbove ? spaceAbove : spaceBelow;

  return {
    left: rect.left,
    width: rect.width,
    maxHeight: Math.min(MENU_MAX_HEIGHT, Math.max(available, 96)),
    top: openAbove ? undefined : rect.bottom + MENU_GAP,
    bottom: openAbove ? window.innerHeight - rect.top + MENU_GAP : undefined,
  };
}
