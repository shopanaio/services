import { IStatusProps } from '@src/layouts/table/components/Navigation/Status';
import { IDropdownOption } from '@src/types';
import { useState } from 'react';

interface IUseStatusProps {
  options: IDropdownOption[];
  defaultStatuses: string[];
}

export const useStatus = ({
  options = [],
  defaultStatuses = [],
}: IUseStatusProps): IStatusProps => {
  const [value, setValue] = useState<string[]>(defaultStatuses);

  const onChange = (value: string[]) => {
    setValue(value);
  };

  const reset = () => {
    setValue(defaultStatuses);
  };

  return {
    options,
    onChange,
    reset,
    value,
  };
};
