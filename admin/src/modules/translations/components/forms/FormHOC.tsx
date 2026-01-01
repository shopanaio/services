import { notify } from '@components/feedback/notification';
import { Box } from '@components/utility/Box';
import { Flex } from '@components/utility/Flex';
import { css } from '@emotion/react';
import { useLocales } from '@modules/locales/hooks/useLocales';
import { $projects } from '@modules/projects/store/projects';
import { useUpdateTranslations } from '@modules/translations/hooks/useUpdateTranslations';
import {
  IGenericTranslationData,
  LocaleCode,
} from '@modules/translations/types';
import { useSelector } from '@reframework/qx';
import { ApiUpdateTranslationInput } from '@src/graphql';
import { DrawerLayout } from '@src/layouts/drawer/components/DrawerLayout';
import { LayoutSkeleton } from '@src/layouts/table/components/Skeleton';
import { partition } from 'lodash';
import {
  ComponentType,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { FieldValues } from 'react-hook-form';
import { LocaleColumn, LocaleFormApi } from './LocaleColumn';

export const createTranslateForm = <T extends FieldValues>({
  useFetchData,
  getPayload,
  component: Component,
}: {
  component: ComponentType<{
    data: IGenericTranslationData;
    defaultCode: string;
  }>;
  useFetchData: () => {
    fetchEntry: (id: ID) => Promise<IGenericTranslationData>;
  };
  getPayload: (props: {
    id: ID;
    data: any;
    dirtyFields: Record<string, boolean>;
    locale: LocaleCode;
  }) => ApiUpdateTranslationInput[];
}) => {
  const TranslateForm = ({
    id,
    forceClose,
  }: {
    id: ID;
    forceClose?: () => {};
  }) => {
    const { locale: defaultCode } = useSelector($projects.currentProject) || {};
    const { locales } = useLocales();

    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<IGenericTranslationData<T> | null>(null);
    const shouldClose = useRef(false);

    const { fetchEntry } = useFetchData();
    const { updateTranslations } = useUpdateTranslations();

    // Тикер, чтобы форсировать ререндер родителя при изменении isDirty в дочерних формах
    const [_dirtyTick, setDirtyTick] = useState(0);
    const notifyDirtyChange = useCallback(() => setDirtyTick((v) => v + 1), []);

    const [[defaultLocale], extraLocales] = partition(
      locales,
      (locale) => locale.code === defaultCode,
    );
    const orderedLocales = useMemo(
      () => [defaultLocale, ...extraLocales].filter(Boolean) as any,
      [defaultLocale, extraLocales],
    );

    // Реестр локальных форм
    const formsRegistry = useRef(new Map<string, LocaleFormApi<T>>());

    useEffect(() => {
      // eslint-disable-next-line react-hooks/exhaustive-deps
      fetchEntry(id)
        .then(setData)
        .finally(() => {
          setLoading(false);
        });
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleRegister = (code: string, api: LocaleFormApi<T>) => {
      formsRegistry.current.set(code, api);
    };

    const handleUnregister = (code: string) => {
      formsRegistry.current.delete(code);
    };

    if (loading) {
      return <LayoutSkeleton filters={false} />;
    }

    const hasAnyDirty = Array.from(formsRegistry.current.values()).some((api) =>
      api.isDirty(),
    );

    const onSubmitAll = async () => {
      try {
        setLoading(true);
        let input: ApiUpdateTranslationInput[] = [];
        orderedLocales.forEach((loc: any) => {
          const api = formsRegistry.current.get(loc.code);
          if (!api) {
            return;
          }
          const dirty = api.getDirtyFields();
          if (!dirty || Object.keys(dirty).length === 0) {
            return;
          }
          const values = api.getValues();
          input = input.concat(
            getPayload({
              id,
              data: values,
              dirtyFields: dirty,
              locale: loc.code as LocaleCode,
            }),
          );
        });

        if (input.length) {
          await updateTranslations(input);
          notify.success('Translations updated');
        }

        if (shouldClose.current) {
          forceClose?.();
          return;
        }

        const fresh = await fetchEntry(id);
        setData(fresh);
        orderedLocales.forEach((loc: any) => {
          const vals = (fresh.translations as any)[loc.code] as T;
          const api = formsRegistry.current.get(loc.code);
          api?.reset(vals);
        });
      } catch {
        notify.error('Failed to update translations');
        shouldClose.current = false;
      } finally {
        setLoading(false);
      }
    };

    return (
      <DrawerLayout
        errors={{}}
        name="translation"
        headerProps={{
          title: data?.title || 'Translate',
          submitButtonProps: {
            disabled: loading || !hasAnyDirty,
            onClick: onSubmitAll,
          },
          onSubmitAndExit() {
            shouldClose.current = true;
            onSubmitAll();
          },
        }}
        leftColumn={
          <Flex gap="4">
            {orderedLocales.map((loc: any) => (
              <LocaleColumn
                key={loc.code}
                localeCode={loc.code}
                localeTitle={loc.title}
                data={data as any}
                component={Component}
                defaultCode={defaultCode || ''}
                onRegister={handleRegister}
                onUnregister={handleUnregister}
                onDirtyChange={notifyDirtyChange}
              />
            ))}
          </Flex>
        }
      />
    );
  };

  return TranslateForm;
};
