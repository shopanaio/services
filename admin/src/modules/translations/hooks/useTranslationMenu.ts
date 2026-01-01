import { gql, useLazyQuery } from '@apollo/client';
import { notify } from '@components/feedback/notification';
import { useLocales } from '@modules/locales/hooks/useLocales';
import { useFetchTranslations } from '@modules/translations/hooks/useTranslations';
import {
  IConnectionTranslationItem,
  LocaleCode,
} from '@modules/translations/types';
import { getConnectionTranslationRecord } from '@modules/translations/utils/utils';
import { ApiQuery, TranslationField as Tf } from '@src/graphql';
import { mapEntryId } from '@src/utils/utils';
import { uniq } from 'lodash';

export type MenuTranslationValues = {
  title: string;
  links: IConnectionTranslationItem[];
};

export type ITranslationMenuFormValues = {
  title: string;
  translations: Record<LocaleCode, MenuTranslationValues>;
};

const MenuForTranslationQuery = gql`
  query FindMenuForTranslation($id: ID!) {
    menuQuery {
      findOne(id: $id) {
        id
        title
        items {
          id
          title
          sortIndex
        }
      }
    }
  }
`;

export const useTranslationMenu = () => {
  const { locales } = useLocales();

  const [query] = useLazyQuery<ApiQuery>(MenuForTranslationQuery, {
    fetchPolicy: 'no-cache',
  });

  const { fetchTranslations } = useFetchTranslations();

  const fetchEntry = async (
    id: string,
  ): Promise<ITranslationMenuFormValues> => {
    try {
      const { data } = await query({ variables: { id } });
      if (!data?.menuQuery?.findOne) {
        throw new Error('Menu not found');
      }

      const { title, items } = data.menuQuery.findOne;

      const connectionTranslations = await fetchTranslations(
        uniq([id, ...items.map(mapEntryId)]),
        [Tf.Title],
      );

      const connectionsRecord = getConnectionTranslationRecord(
        connectionTranslations,
      );

      const translations = locales.reduce(
        (acc, it) => {
          const conn = connectionsRecord[it.code];

          const item = {
            title: conn?.[id]?.[Tf.Title] || '',
            links: items.map((it) => ({
              id: it.id,
              label: it.title,
              translation: conn?.[it.id]?.[Tf.Title] || '',
            })),
          };

          return {
            ...acc,
            [it.code]: item,
          };
        },
        {} as ITranslationMenuFormValues['translations'],
      );

      return {
        title,
        translations,
      };
    } catch {
      notify.error('Menu not found');
      return {
        title: '',
        translations: {},
      } as ITranslationMenuFormValues;
    }
  };

  return {
    fetchEntry,
  };
};
