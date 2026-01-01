import { ISearchProps } from '@src/layouts/table/hooks/useSearch';

export const getStatusWhereInput = (value: string[], qnt = 3) => {
  return value?.length > 0 && value?.length < qnt
    ? { status: { In: value } }
    : {};
};

export const getSearchWhereInput = ({
  derivedValue,
  properties,
}: ISearchProps) => {
  return properties.reduce((acc, key) => {
    // @ts-expect-error - TS doesn't know that key is a string
    acc[key] = { ILike: derivedValue };

    return acc;
  }, {});
};
