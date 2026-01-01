import { useQuery } from '@apollo/client';
import { GetLocalesQuery } from '@modules/locales/graphql/getLocales';
import { $locales } from '@modules/locales/store';
import { ILocale, Locale } from '@src/entity/Locale/Locale';
import { ApiQuery } from '@src/graphql';
import { useEffect } from 'react';

export const useFetchLocales = () => {
  const { data } = useQuery<ApiQuery>(GetLocalesQuery);

  useEffect(() => {
    if (!data?.projectQuery.locales) {
      return;
    }

    const locales = data.projectQuery.locales
      .map(Locale.create)
      .filter(Boolean) as ILocale[];

    if (locales.length !== data?.projectQuery.locales.length) {
      console.warn('Some locales failed to construct');
      return;
    }

    $locales.setLocales(locales);
  }, [data]);
};
