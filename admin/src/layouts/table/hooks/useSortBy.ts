import {
  ISortByProps,
  ISortByValue,
  SortDirection,
} from '@src/layouts/table/components/Navigation/SortBy';
import { IDropdownOption } from '@src/types';
import { useState } from 'react';

interface IUseSortByProps {
  defaultProperty: string;
  options: IDropdownOption[];
}

export const useSortBy = ({
  options,
  defaultProperty = '',
}: IUseSortByProps): ISortByProps => {
  const [value, setValue] = useState<ISortByValue>({
    direction: SortDirection.DESC,
    property: defaultProperty,
  });

  const onChangeProperty = (value: string) => {
    setValue({ property: value, direction: SortDirection.ASC });
  };

  const onChangeDirection = (value: SortDirection) => {
    setValue((prev) => ({ ...prev, direction: value }));
  };

  const onChange = (value: ISortByValue) => {
    setValue(value);
  };

  const reset = () => {
    setValue({
      direction: SortDirection.ASC,
      property: defaultProperty,
    });
  };

  return {
    options,
    onChangeDirection,
    onChangeProperty,
    value,
    onChange,
    reset,
  };
};
