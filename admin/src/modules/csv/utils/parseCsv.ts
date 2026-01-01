import Papa from 'papaparse';
import { camelCase } from 'change-case';

export const parseCsv = <T>({
  file,
  onComplete,
  transform,
}: {
  file: File;
  onComplete: (records: T[]) => void;
  transform: (data: string, header: string) => any;
}) => {
  Papa.parse(file as any, {
    // worker: true,
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => camelCase(h),
    transform,
    complete: ({ data }) => onComplete(data as any[]),
    error: function (error) {
      console.error(error);
    },
  });
};
