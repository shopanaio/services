import { useCallback, useState } from 'react';

/**
 * Check if all items are selected
 * @param mapping the mapping of ID to boolean which indicates the checked rows
 * @param itemsCount the number of items
 * @returns true if all items are selected, false otherwise
 */
const isCheckedEverything = (
  mapping: Record<number, number>,
  itemsCount: number,
) => {
  return itemsCount === Object.values(mapping).filter(Boolean).length;
};

const isCheckedNothing = (mapping: Record<number, number>) => {
  return Object.values(mapping).length === 0;
};

type TCheckboxStatus = 'checked' | 'indeterminate' | 'unchecked';

/**
 * Check if none of the items are selected
 * @param mapping the mapping of ID to boolean which indicates the checked rows
 * @returns true if none of the items are selected, false otherwise
 */
export interface ICheckedRowsProps {
  onChange: (id: number, checked: boolean) => void;
  checkAll: (ids: number[]) => void;
  clear: () => void;
  getIsChecked: (id: number) => boolean;
  getStatus: (count: number) => TCheckboxStatus;
  checkedRows: number[];
  onToggle: (id: number) => void;
}

/**
 * The hook that provides functionality to manage checked rows
 * @param itemsCount the number of items in the component
 * @param onCheck a handler function that is called each time a row is checked or unchecked
 * @returns an object containing several functions and properties related to managing checked rows
 */

export const useCheckedRows = (): ICheckedRowsProps => {
  const [state, setState] = useState<Record<number, number>>({});

  /**
   * Check all the rows with the specified IDs
   * @param ids the IDs of the rows to check
   */
  const checkAll = useCallback((ids: number[]) => {
    setState({ ...ids.reduce((acc, it) => ({ ...acc, [it]: it }), {}) });
  }, []);

  /**
   * Uncheck all rows
   */
  const clear = useCallback(() => {
    setState({});
  }, []);

  /**
   * Check if a row is selected
   * @param id the ID of the row to check
   * @returns true if the row is selected, false otherwise
   */
  const getIsChecked = useCallback(
    (id: number) => {
      return !!state?.[id];
    },
    [state],
  );

  /**
   * Handle a change in a row's selection status
   * @param id the ID of the row that was changed
   * @param checked the new selection status of the row
   */
  const onChange = useCallback((id: number, checked: boolean) => {
    setState((prev) => {
      const nextMapping = { ...prev };

      if (checked) {
        nextMapping[id] = id;
      } else {
        delete nextMapping[id];
      }

      return nextMapping;
    });
  }, []);

  const onToggle = useCallback((id: number) => {
    setState((prev) => {
      const nextMapping = { ...prev };

      if (nextMapping?.[id]) {
        delete nextMapping[id];
      } else {
        nextMapping[id] = id;
      }

      return nextMapping;
    });
  }, []);

  const getStatus = useCallback(
    (count: number) => {
      if (isCheckedEverything(state, count)) {
        return 'checked';
      } else if (isCheckedNothing(state)) {
        return 'unchecked';
      } else {
        return 'indeterminate';
      }
    },
    [state],
  );

  return {
    onChange,
    checkAll,
    clear,
    getIsChecked,
    getStatus,
    checkedRows: Object.values(state),
    onToggle,
  };
};
