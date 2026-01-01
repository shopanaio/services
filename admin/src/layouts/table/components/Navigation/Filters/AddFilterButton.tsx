import { css } from '@emotion/react';
import { IFiltersProps } from '@src/layouts/table/components/Navigation/Filters/Filters';
import { FiltersDropdown } from '@src/layouts/table/components/Navigation/Filters/FiltersDropdown';
import { Button } from 'antd';
import { useState } from 'react';
import { MdAdd } from 'react-icons/md';

const iconProps = {
  size: 14,
  css: css`
    transform: translateY(2px);
  `,
};

export const AddFilterButton = ({
  options,
  onChange,
  ...props
}: IFiltersProps) => {
  const [open, setOpen] = useState(false);

  return (
    <FiltersDropdown
      options={options}
      open={open}
      onOpenChange={setOpen}
      disabled={!options.length}
      onChange={onChange}
      {...props}
    >
      <Button
        size="small"
        icon={<MdAdd   />}
        onClick={() => setOpen(true)}
      >
        Add filter
      </Button>
    </FiltersDropdown>
  );
};
