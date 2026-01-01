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

export type ITranslationCategoryFormValues = {
  title: string;
  translations: Record<LocaleCode, InformationTranslationValues>;
};

const CategoryForTranslationQuery = gql`
  query FindCategoryForTranslation($id: ID!) {
    categoryQuery {
      findOne(id: $id) {
        slug
        title
      }
    }
  }
`;

export const useTranslationCategory = () => {
  const { locales } = useLocales();
  const [query] = useLazyQuery<ApiQuery>(CategoryForTranslationQuery, {
    fetchPolicy: 'no-cache',
  });

  const { fetchTranslations } = useFetchTranslations();

  const fetchEntry = async (
    id: string,
  ): Promise<ITranslationCategoryFormValues> => {
    try {
      const { data } = await query({ variables: { id } });
      if (!data?.categoryQuery?.findOne) {
        throw new Error('Category not found');
      }

      const { title } = data.categoryQuery.findOne;
      const categoryTranslations = await fetchTranslations(
        [id],
        allInformationFieldNames,
      );

      const categoryRecord = getEntryTranslationRecord(categoryTranslations);
      const translations = locales.reduce(
        (acc, it) => {
          const rec = categoryRecord[it.code];
          const item = {
            title: rec?.[Tf.Title] || '',
            description: rec?.[Tf.DescriptionJson] || getDescriptionFields(''),
            excerpt: rec?.[Tf.ExcerptText] || '',
            seoTitle: rec?.[Tf.SeoTitle],
            seoDescription: rec?.[Tf.SeoDescription],
          };
          return { ...acc, [it.code]: item };
        },
        {} as ITranslationCategoryFormValues['translations'],
      );

      return { title, translations };
    } catch {
      return {} as ITranslationCategoryFormValues;
    }
  };

  return {
    fetchEntry,
  };
};
