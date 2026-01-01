import { sanitizeEntries } from '@src/entity/utils';
import { useCallback, useState } from 'react';

type IRecord = { id: ID };

export interface ISelectedRowsProps<T extends IRecord> {
  selectedRows: T[];
  clearSelectedRows: () => void;
  onChangeSelectedRows: (records: T[], record?: T, selected?: boolean) => void;
  onToggleSelectedRow: (record: T) => void;
  setSelectedRows: (rows: T[]) => void;
}

export const useSelectedRows = <T extends IRecord = any>({
  initialRows = [],
  multiple = true,
}: {
  initialRows?: T[];
  multiple?: boolean;
} = {}): ISelectedRowsProps<T> => {
  const [selectedRows, setSelectedRows] = useState<T[]>(initialRows);

  const clearSelectedRows = useCallback(() => {
    setSelectedRows([]);
  }, []);

  const onChangeSelectedRows = useCallback(
    (records: T[], record?: T, selected?: boolean) => {
      if (!multiple) {
        setSelectedRows(selected && record ? [record] : []);
        return;
      }

      setSelectedRows(sanitizeEntries([...records]));
    },
    [multiple],
  );

  const onToggleSelectedRow = useCallback(
    (record: T) => {
      const current = selectedRows.find((it) => it.id === record.id);

      if (!multiple) {
        setSelectedRows(current ? [] : [record]);
        return;
      }

      const newSelectedRows = current
        ? selectedRows.filter((row) => row.id !== record.id)
        : [...selectedRows, record];

      setSelectedRows(newSelectedRows);
    },
    [selectedRows, multiple],
  );

  return {
    onToggleSelectedRow,
    clearSelectedRows,
    onChangeSelectedRows,
    setSelectedRows,
    selectedRows,
  };
};
