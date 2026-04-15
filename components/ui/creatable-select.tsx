import * as React from 'react';
import CreatableSelectBase from 'react-select/creatable';
import type { GroupBase, Props as SelectProps } from 'react-select';
import { cn } from '@/lib/utils';

// Shadcn-styled wrapper around react-select's Creatable. Uses classNames API so
// it respects our CSS variables and dark mode without runtime theme juggling.
export function CreatableSelect<
  Option = unknown,
  IsMulti extends boolean = false,
  Group extends GroupBase<Option> = GroupBase<Option>,
>(props: SelectProps<Option, IsMulti, Group> & { className?: string }) {
  return (
    <CreatableSelectBase<Option, IsMulti, Group>
      unstyled
      classNamePrefix="shadcn-select"
      className={props.className}
      classNames={{
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
          'mt-1 overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md',
        menuList: () => 'p-1',
        option: ({ isFocused, isSelected }) =>
          cn(
            'rounded-sm px-2 py-1.5 text-sm cursor-pointer',
            isFocused && 'bg-accent text-accent-foreground',
            isSelected && 'bg-primary text-primary-foreground',
          ),
        noOptionsMessage: () => 'p-2 text-sm text-muted-foreground',
        loadingMessage: () => 'p-2 text-sm text-muted-foreground',
        groupHeading: () => 'px-2 py-1 text-xs font-semibold text-muted-foreground',
      }}
      {...props}
    />
  );
}
