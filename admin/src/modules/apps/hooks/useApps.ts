import { useMemo } from 'react';
import { useQuery } from '@apollo/client';
import { AppsQueryFindMany } from '@modules/apps/graphql/findMany';
import { ApiQuery } from '@src/graphql';

export interface IAvailableApp {
  code: string;
  name: string;
  logoUrl?: string;
  meta?: any;
  installed?: boolean;
  installedId?: string;
}

export const useApps = () => {
  const { data, loading, previousData } = useQuery<ApiQuery>(
    AppsQueryFindMany,
    {
      fetchPolicy: 'no-cache',
    },
  );

  const result = loading ? previousData : data;

  const { apps, installedApps } = result?.appsQuery || {};

  const list: IAvailableApp[] = useMemo(() => {
    if (!apps?.length) {
      return [];
    }

    const installedMap = new Map<string, { id: string }>();
    (installedApps || []).forEach((it) =>
      installedMap.set(it.appCode, { id: it.id }),
    );

    return apps.map((a) => {
      const installed = installedMap.get(a.code);
      const logoUrl = (a.meta && (a.meta as any)?.logoUrl) || undefined;
      return {
        code: a.code,
        name: a.name,
        meta: a.meta,
        logoUrl,
        installed: Boolean(installed),
        installedId: installed?.id,
      } as IAvailableApp;
    });
  }, [apps, installedApps]);

  return {
    apps: list,
    loading: Boolean(loading && !previousData),
  };
};
