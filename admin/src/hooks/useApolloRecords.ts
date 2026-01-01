import { useEffect, useState } from 'react';

export const useApolloRecords = <R>(props: {
  // useCallback
  dataFn: () => R;
  loading: boolean;
  initialData: R;
}): R => {
  const { dataFn, loading, initialData } = props;
  const [records, setRecords] = useState<R>(initialData);

  useEffect(() => {
    if (!loading) {
      setRecords(dataFn());
    }
  }, [loading, dataFn]);

  return records;
};
