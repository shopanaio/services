import { UiFilter } from '@src/entity/UiFilter';
import { useState } from 'react';

interface IUseUiFiltersProps {
  filters: UiFilter.IUiFilter[];
}

export const useUiFilters = ({ filters }: IUseUiFiltersProps) => {
  const [value, setValue] = useState<UiFilter.IUiFilterValue[]>([]);

  const onChange = (value: UiFilter.IUiFilterValue[]) => {
    setValue(value);
  };

  const reset = () => {
    setValue([]);
  };

  return {
    options: filters,
    onChange,
    value,
    reset,
  };
};
