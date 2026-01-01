import { slugify } from '@components/forms/slug/slugify';
import { useCallback, useEffect, useState } from 'react';
import { useFormContext } from 'react-hook-form';

export interface IUseSlugProps {
  /**
   *  reference name is usually like `content::${defaultLocale.id}::title`
   */
  referenceName: string;
  /**
   *  slugName is usually `slug`
   */
  slugName: string;
  sync?: boolean;
}

export const useSlug = ({ referenceName, slugName, sync }: IUseSlugProps) => {
  const [isSyncOn, setIsSyncOn] = useState(sync);
  const [valueBeforeUnlock, setValueBeforeUnlock] = useState('');

  const { watch, setValue } = useFormContext();

  const reference = watch(referenceName);

  const setSlug = useCallback(
    (value: string) =>
      setValue(slugName, value, {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: false,
      }),
    [setValue, slugName],
  );

  const onUnlock = (value: string) => {
    if (isSyncOn) {
      setValue(slugName, valueBeforeUnlock);
      setIsSyncOn(false);
      return;
    }

    setValueBeforeUnlock(value);
    setIsSyncOn(true);
  };

  useEffect(() => {
    if (!isSyncOn) {
      return;
    }

    if (typeof reference !== 'string') {
      return;
    }

    setSlug(slugify(reference));
  }, [reference, setSlug, isSyncOn]);

  return { isSyncOn, onUnlock };
};
