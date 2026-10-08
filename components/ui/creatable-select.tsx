'use client';

import * as React from 'react';
import SelectBase, { components } from 'react-select';
import CreatableSelectBase, { type CreatableProps } from 'react-select/creatable';
import type {
  ClassNamesConfig,
  GroupBase,
  MenuListProps,
  Props as SelectProps,
  StylesConfig,
} from 'react-select';
import { cn } from '@/lib/utils';

// Shadcn styling for react-select. Uses the classNames API so it respects our
// CSS variables and dark mode without runtime theme juggling. Shared by both
// exports below so the creatable and pick-only variants can't drift apart.
const classNames: ClassNamesConfig<never, boolean, GroupBase<never>> = {
  container: () => 'relative',
  control: ({ isFocused }) =>
    cn(
      'flex min-h-10 w-full rounded-md border border-input bg-background px-2 py-1 text-sm ring-offset-background',
      isFocused && 'ring-2 ring-ring ring-offset-2',
    ),
  valueContainer: () => 'gap-1 flex-wrap',
  placeholder: () => 'text-muted-foreground text-sm',
  singleValue: () => 'text-foreground',
  input: () => 'text-foreground',
  multiValue: () => 'rounded-sm bg-secondary text-secondary-foreground',
  multiValueLabel: () => 'px-2 py-0.5 text-xs',
  multiValueRemove: () => 'px-1 rounded-r-sm hover:bg-destructive hover:text-destructive-foreground',
  indicatorsContainer: () => 'gap-1',
  dropdownIndicator: () => 'text-muted-foreground p-1 hover:text-foreground',
  clearIndicator: () => 'text-muted-foreground p-1 hover:text-foreground',
  indicatorSeparator: () => 'bg-border',
  menu: () =>
    'overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md',
  menuList: () => 'max-h-[18rem] overflow-y-auto overscroll-contain p-1',
  option: ({ isFocused, isSelected, isDisabled }) =>
    cn(
      'rounded-sm px-2 py-1.5 text-sm cursor-pointer',
      isFocused && 'bg-accent text-accent-foreground',
      isSelected && 'bg-primary text-primary-foreground',
      isDisabled && 'cursor-not-allowed opacity-50',
    ),
  noOptionsMessage: () => 'p-2 text-sm text-muted-foreground',
  loadingMessage: () => 'p-2 text-sm text-muted-foreground',
  groupHeading: () => 'px-2 py-1 text-xs font-semibold text-muted-foreground',
};

// The config above never touches the option type, but react-select's generics
// insist it does — hence the one cast, kept here rather than at each call site.
// `unstyled` strips react-select's own positioning along with its colours, so
// the menu has to be placed by hand — otherwise opening one grows the page
// instead of floating over it. It goes in a portal on `document.body` rather
// than inside the control: the pickers live in an inventory table and in
// dialogs, both of which scroll behind `overflow`, and an in-flow menu is
// clipped the moment it reaches the edge of one. `menuPortal` rebuilds the
// offsets react-select would have applied itself.
const portalStyles: StylesConfig<never, boolean, GroupBase<never>> = {
  menuPortal: (base, { rect, offset, position }) => ({
    ...base,
    position,
    top: offset,
    left: rect.left,
    width: rect.width,
    // Above the dialog (z-1100), which is where several of these live.
    zIndex: 1200,
    // A modal Dialog puts `pointer-events: none` on <body>, and the portal
    // inherits it — the wheel then went to whatever lay underneath the menu.
    pointerEvents: 'auto',
  }),
};

// The portal's second cost inside a Dialog (the first is `pointerEvents` above):
// Radix locks scrolling with a `document` listener that cancels every
// wheel/touchmove outside the dialog, and a menu on `document.body` is outside
// it — so a long list (kategoriat, sijainnit) couldn't be scrolled at all.
// Stopping those events at the menu list keeps them from bubbling up to that
// listener; the list then scrolls natively. It has to be a native listener on
// the list itself: the App Router mounts React on `document`, so a React
// `onWheel` fires on the very node the lock listens on and can't stop it.
// One shared function, so re-attaching on every render is a no-op.
const stopScrollLock = (event: Event) => event.stopPropagation();

function MenuList<Option, IsMulti extends boolean, Group extends GroupBase<Option>>(
  props: MenuListProps<Option, IsMulti, Group>,
) {
  const { innerRef } = props;
  return (
    <components.MenuList
      {...props}
      innerRef={(node: HTMLDivElement | null) => {
        // react-select hands MenuList a callback ref (its scroll manager's).
        if (typeof innerRef === 'function') innerRef(node);
        node?.addEventListener('wheel', stopScrollLock, { passive: true });
        node?.addEventListener('touchmove', stopScrollLock, { passive: true });
      }}
    />
  );
}

function styledProps<Option, IsMulti extends boolean, Group extends GroupBase<Option>>(
  instanceId: string,
) {
  return {
    menuPortalTarget: typeof document === 'undefined' ? undefined : document.body,
    components: { MenuList: MenuList<Option, IsMulti, Group> },
    styles: portalStyles as unknown as StylesConfig<Option, IsMulti, Group>,
    // react-select numbers its instances from a module counter, which counts
    // differently on the server than in the browser — the ids it puts on the
    // input and the live region then mismatch on hydration. A `useId` is stable
    // across both.
    instanceId,
    unstyled: true as const,
    // Flip the menu up when there's no room below it.
    menuPlacement: 'auto' as const,
    classNamePrefix: 'shadcn-select',
    classNames: classNames as unknown as ClassNamesConfig<Option, IsMulti, Group>,
  };
}

/** Picker that can mint new options on the fly (categories, locations). */
export function CreatableSelect<
  Option = unknown,
  IsMulti extends boolean = false,
  Group extends GroupBase<Option> = GroupBase<Option>,
>(props: CreatableProps<Option, IsMulti, Group> & { className?: string }) {
  const instanceId = React.useId();
  return (
    <CreatableSelectBase<Option, IsMulti, Group>
      {...styledProps<Option, IsMulti, Group>(instanceId)}
      className={props.className}
      {...props}
    />
  );
}

/** Same look, but pick-from-the-list only. */
export function Select<
  Option = unknown,
  IsMulti extends boolean = false,
  Group extends GroupBase<Option> = GroupBase<Option>,
>(props: SelectProps<Option, IsMulti, Group> & { className?: string }) {
  const instanceId = React.useId();
  return (
    <SelectBase<Option, IsMulti, Group>
      {...styledProps<Option, IsMulti, Group>(instanceId)}
      className={props.className}
      {...props}
    />
  );
}
