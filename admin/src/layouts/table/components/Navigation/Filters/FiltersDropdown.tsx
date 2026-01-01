import { IFiltersProps } from '@src/layouts/table/components/Navigation/Filters/Filters';
import { Dropdown } from 'antd';
import { ReactNode } from 'react';

interface IFiltersDropdownProps extends IFiltersProps {
  children: ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  disabled?: boolean;
  options: any[];
  value: any[];
  onChange: (value: any[]) => void;
}

export const FiltersDropdown = ({
  options = [],
  children,
  open,
  onOpenChange,
  disabled,
  value = [],
  onChange,
}: IFiltersDropdownProps) => {
  return (
    <Dropdown
      disabled={disabled || !options.length}
      trigger={['click']}
      menu={{
        items: options.map((it) => ({
          key: it.type,
          label: it.label,
          onClick: () => onChange([...value, it]),
        })),
        style: { minWidth: 150 },
      }}
      open={open}
      onOpenChange={onOpenChange}
    >
      {children}
    </Dropdown>
  );
};
