import { gql, useLazyQuery } from '@apollo/client';
import { notify } from '@components/feedback/notification';
import { useLocales } from '@modules/locales/hooks/useLocales';
import { useFetchTranslations } from '@modules/translations/hooks/useTranslations';
import { LocaleCode } from '@modules/translations/types';
import { getConnectionTranslationRecord } from '@modules/translations/utils/utils';
import { ApiQuery, TranslationField as Tf } from '@src/graphql';
import { uniq } from 'lodash';

export type TagTranslationValues = {
  title: string;
};

export type ITranslationTagFormValues = {
  title: string;
  translations: Record<LocaleCode, TagTranslationValues>;
};

const TagForTranslationQuery = gql`
  query FindTagForTranslation($id: ID!) {
    tagQuery {
      findOne(id: $id) {
        id
        title
      }
    }
  }
`;

export const useTranslationTag = () => {
  const { locales } = useLocales();

  const [query] = useLazyQuery<ApiQuery>(TagForTranslationQuery, {
    fetchPolicy: 'no-cache',
  });

  const { fetchTranslations } = useFetchTranslations();

  const fetchEntry = async (id: string): Promise<ITranslationTagFormValues> => {
    try {
      const { data } = await query({ variables: { id } });
      if (!data?.tagQuery?.findOne) {
        throw new Error('Tag not found');
      }

      const { title } = data.tagQuery.findOne;
      const connectionTranslations = await fetchTranslations(uniq([id]), [
        Tf.Title,
      ]);

      const connectionsRecord = getConnectionTranslationRecord(
        connectionTranslations,
      );

      const translations = locales.reduce(
        (acc, it) => {
          const conn = connectionsRecord[it.code];
          const item = {
            title: conn?.[id]?.[Tf.Title] || '',
          };

          return {
            ...acc,
            [it.code]: item,
          };
        },
        {} as ITranslationTagFormValues['translations'],
      );

      return {
        title,
        translations,
      };
    } catch {
      notify.error('Tag not found');
      return {
        title: '',
        translations: {},
      } as ITranslationTagFormValues;
    }
  };

  return {
    fetchEntry,
  };
};
