import { gql, useLazyQuery } from '@apollo/client';
import { useLocales } from '@modules/locales/hooks/useLocales';
import { allInformationFieldNames } from '@modules/translations/defs';
import { useFetchTranslations } from '@modules/translations/hooks/useTranslations';
import {
  InformationTranslationValues,
  LocaleCode,
} from '@modules/translations/types';
import { getEntryTranslationRecord } from '@modules/translations/utils/utils';
import { getDescriptionFields } from '@src/entity/Content/description';
import { ApiQuery, TranslationField as Tf } from '@src/graphql';

export type ITranslationPageFormValues = {
  title: string;
  translations: Record<LocaleCode, InformationTranslationValues>;
};

const PageForTranslationQuery = gql`
  query FindPageForTranslation($id: ID!) {
    pageQuery {
      findOne(id: $id) {
        slug
        title
      }
    }
  }
`;

export const useTranslationPage = () => {
  const { locales } = useLocales();
  const [query] = useLazyQuery<ApiQuery>(PageForTranslationQuery, {
    fetchPolicy: 'no-cache',
  });

  const { fetchTranslations } = useFetchTranslations();

  const fetchEntry = async (
    id: string,
  ): Promise<ITranslationPageFormValues> => {
    try {
      const { data } = await query({ variables: { id } });
      if (!data?.pageQuery?.findOne) {
        throw new Error('Page not found');
      }

      const { title } = data.pageQuery.findOne;
      const pageTranslations = await fetchTranslations(
        [id],
        allInformationFieldNames,
      );

      const pageRecord = getEntryTranslationRecord(pageTranslations);
      const translations = locales.reduce(
        (acc, it) => {
          const rec = pageRecord[it.code];
          const item = {
            title: rec?.[Tf.Title] || '',
            description: rec?.[Tf.DescriptionJson] || getDescriptionFields(''),
            excerpt: rec?.[Tf.ExcerptText] || '',
            seoTitle: rec?.[Tf.SeoTitle],
            seoDescription: rec?.[Tf.SeoDescription],
          };
          return { ...acc, [it.code]: item };
        },
        {} as ITranslationPageFormValues['translations'],
      );

      return { title, translations };
    } catch {
      return {} as ITranslationPageFormValues;
    }
  };

  return {
    fetchEntry,
  };
};
