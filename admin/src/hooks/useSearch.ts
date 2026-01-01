import { useCallback, useEffect, useState } from 'react';
import { debounce } from 'lodash';

/**
 * Custom hook that provides a search function with debounce feature
 * @returns An object with a searchValue and onSearch function
 */
export const useSearch = () => {
  const [value, setValue] = useState('');
  const [derivedValue, setDerivedValue] = useState('');

  /**
   * Debounced search function that sets the search value
   * @param searchValue The new search value to set
   */
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const onSearch = useCallback(
    debounce(
      (searchValue: string) => {
        setDerivedValue(searchValue);
      },
      300,
      { leading: true },
    ),
    [],
  );

  useEffect(() => {
    onSearch(value);
  }, [value, onSearch]);

  return { searchValue: value, onSearch: setValue, derivedValue };
};
