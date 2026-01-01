import { useSearch as useS } from '@src/hooks/useSearch';
import { useCallback } from 'react';

export interface ISearchProps {
  onChangeSearchValue: (value: string) => void;
  searchValue: string;
  derivedValue: string;
  reset: () => void;
  properties: string[];
}

export const useSearch = (): ISearchProps => {
  const { onSearch, searchValue, derivedValue } = useS();

  const onChangeSearchValue = useCallback(
    (value: string) => {
      onSearch(value);
    },
    [onSearch],
  );

  const reset = () => {
    onSearch('');
  };

  return {
    onChangeSearchValue,
    searchValue,
    derivedValue,
    reset,
  };
};
