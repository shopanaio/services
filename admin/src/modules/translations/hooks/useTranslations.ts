import { useLazyQuery, useQuery } from '@apollo/client';
import { FindTranslations } from '@modules/translations/graphql/translation';
import {
  ApiQuery,
  ApiTranslation,
  ApiTranslationQueryFindManyArgs,
  TranslationField,
} from '@src/graphql';

export const useTranslations = (
  sourceIds: ID[],
  fields: { fields: TranslationField[] }[] = [],
) => {
  const { data, loading } = useQuery<ApiQuery, ApiTranslationQueryFindManyArgs>(
    FindTranslations,
    {
      fetchPolicy: 'no-cache',
      variables: {
        where: {
          sourceId: {
            In: sourceIds,
          },
          ...(fields.length
            ? {
                fieldName: { In: fields.flatMap((f) => f.fields) },
              }
            : {}),
        },
      },
    },
  );

  return {
    data: data?.translationQuery?.findMany || empty,
    loading,
  };
};

const empty = [] as ApiTranslation[];

export const useFetchTranslations = () => {
  const [query] = useLazyQuery<ApiQuery, ApiTranslationQueryFindManyArgs>(
    FindTranslations,
    {
      fetchPolicy: 'no-cache',
    },
  );

  const fetchTranslations = async (
    sourceIds: ID[],
    fieldsNames: TranslationField[],
  ) => {
    try {
      const { data } = await query({
        variables: {
          where: {
            sourceId: {
              In: sourceIds,
            },
            fieldName: {
              In: fieldsNames,
            },
          },
        },
      });

      return data?.translationQuery?.findMany || empty;
    } catch {
      return empty;
    }
  };

  return {
    fetchTranslations,
  };
};
