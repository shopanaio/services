import { IColumnsProps } from '@src/layouts/table/components/Navigation/Columns';
import { useState } from 'react';

export interface IColumnOption {
  key: string;
  label: string;
  isFixed?: boolean;
  width?: number;
  active?: boolean;
}

export type IColumnOptions = Record<string, IColumnOption>;
interface IUseColumnsProps {
  options: IColumnOptions;
  storageKey?: string;
}

export const useColumns = ({
  options,
  storageKey,
}: IUseColumnsProps): IColumnsProps => {
  const getDefaultValue = () =>
    Object.values(options).map((it) => ({
      value: it.key,
      active: !!it.active,
    }));

  const getInitialValue = () => {
    if (!storageKey) {
      return getDefaultValue();
    }

    try {
      const raw =
        typeof window !== 'undefined'
          ? window.localStorage.getItem(storageKey)
          : null;
      if (!raw) {
        return getDefaultValue();
      }

      const parsed = JSON.parse(raw) as { value: string; active: boolean }[];
      const activeByKey = new Map(
        parsed.map((it) => [it.value, !!it.active] as const),
      );

      return Object.values(options).map((it) => ({
        value: it.key,
        active: it.isFixed
          ? true
          : activeByKey.has(it.key)
          ? (activeByKey.get(it.key) as boolean)
          : !!it.active,
      }));
    } catch (_e) {
      return getDefaultValue();
    }
  };

  const [value, setValue] = useState<
    {
      value: string;
      active: boolean;
    }[]
  >(() => getInitialValue());

  const onChange = (
    value: {
      value: string;
      active: boolean;
    }[],
  ) => {
    setValue(value);
    if (storageKey && typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(storageKey, JSON.stringify(value));
      } catch (_e) {
        // noop
      }
    }
  };

  const reset = () => {
    const defaults = Object.values(options).map((it) => ({
      value: it.key,
      active: true,
    }));
    setValue(defaults);
    if (storageKey && typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(storageKey, JSON.stringify(defaults));
      } catch (_e) {
        // noop
      }
    }
  };

  const optionsList = Object.values(options).map((it) => ({
    label: it.label,
    key: it.key,
    value: it.key,
    disabled: !!it.isFixed,
  }));

  return {
    options: optionsList,
    onChange,
    value,
    reset,
  };
};
