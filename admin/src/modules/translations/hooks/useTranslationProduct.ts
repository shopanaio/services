import { gql, useLazyQuery } from '@apollo/client';
import { useLocales } from '@modules/locales/hooks/useLocales';
// Removed unused and non-existent import
import { allInformationFieldNames } from '@modules/translations/defs';
import { useFetchTranslations } from '@modules/translations/hooks/useTranslations';
import {
  IConnectionTranslationItem,
  IInformationTranslationValues,
  LocaleCode,
} from '@modules/translations/types';
import {
  getConnectionTranslationRecord,
  getEntryTranslationRecord,
} from '@modules/translations/utils/utils';
import { getDescriptionFields } from '@src/entity/Content/description';
import {
  ApiProductFeature,
  ApiQuery,
  TranslationField as Tf,
} from '@src/graphql';
import { cropString, mapEntryId } from '@src/utils/utils';
import { uniq } from 'lodash';

export type ProductTranslationValues = IInformationTranslationValues & {
  groups: IConnectionTranslationItem[];
  variants: IConnectionTranslationItem[];
};

export type ITranslationProductFormValues = {
  title: string;
  translations: Record<LocaleCode, ProductTranslationValues>;
  hasVariants: boolean;
};

const ProductForTranslationQuery = gql`
  query FindProductForTranslation($id: ID!) {
    productQuery {
      findOne(id: $id) {
        slug
        title
        variants {
          id
          title
          variantSortIndex
          features {
            title
            slug
            featureId
            attributeSortIndex
            optionSortIndex
            isAttribute
            isOption
            group {
              id
              title
              slug
            }
          }
        }
        groups {
          id
          title
          sortIndex
        }
      }
    }
  }
`;

export const useTranslationProduct = () => {
  const { locales } = useLocales();

  const [query] = useLazyQuery<ApiQuery>(ProductForTranslationQuery, {
    fetchPolicy: 'no-cache',
  });

  const { fetchTranslations } = useFetchTranslations();

  const fetchEntry = async (
    id: string,
  ): Promise<ITranslationProductFormValues> => {
    try {
      const { data } = await query({ variables: { id } });
      if (!data?.productQuery?.findOne) {
        throw new Error('Product not found');
      }

      const { variants, groups, title } = data.productQuery.findOne;

      const productTranslations = await fetchTranslations(
        [id],
        allInformationFieldNames,
      );

      const connIds = uniq([
        ...variants.flatMap((v) =>
          v.features.flatMap((f) => [f.featureId, f.group.id]),
        ),
        ...groups.map(mapEntryId),
        ...variants.map(mapEntryId),
      ]);

      const connectionTranslations = connIds?.length
        ? await fetchTranslations(connIds, [Tf.Title])
        : [];

      const productRecord = getEntryTranslationRecord(productTranslations);
      const connectionsRecord = getConnectionTranslationRecord(
        connectionTranslations,
      );

      const translations = locales.reduce(
        (acc, it) => {
          const rec = productRecord[it.code];
          const conn = connectionsRecord[it.code];
          const item = {
            title: rec?.[Tf.Title] || '',
            description: rec?.[Tf.DescriptionJson] || getDescriptionFields(''),
            excerpt: rec?.[Tf.ExcerptText] || '',
            seoTitle: rec?.[Tf.SeoTitle] || '',
            seoDescription: rec?.[Tf.SeoDescription] || '',
            features: (() => {
              const seenFeatureIds = new Set<ID>();
              const grouped: Record<
                ID,
                {
                  group: IConnectionTranslationItem;
                  items: IConnectionTranslationItem[];
                }
              > = {};

              variants
                .flatMap((v) => v.features)
                .forEach((f) => {
                  const groupId = f.group.id as ID;
                  if (!groupId) {
                    return;
                  }

                  if (!grouped[groupId]) {
                    grouped[groupId] = {
                      group: {
                        id: groupId,
                        label: f.group.title,
                        translation: conn?.[groupId]?.[Tf.Title] || '',
                        isGroup: true,
                      },
                      items: [],
                    };
                  }

                  if (seenFeatureIds.has(f.featureId as ID)) {
                    return;
                  }
                  seenFeatureIds.add(f.featureId as ID);
                  grouped[groupId].items.push({
                    id: f.featureId,
                    label: f.title,
                    translation: conn?.[f.featureId]?.[Tf.Title] || '',
                  });
                });

              return Object.values(grouped).flatMap(({ group, items }) => [
                group,
                ...items,
              ]);
            })(),
            variants: variants
              .sort((a, b) => a.variantSortIndex - b.variantSortIndex)
              .map((v) => ({
                id: v.id,
                label: v.features
                  ?.filter((it) => it.isOption)
                  ?.filter((it: ApiProductFeature) => {
                    return it?.group?.title && it?.title;
                  })
                  .map((it: any) => cropString(it.title, 15))
                  .join(' ▸ '),

                translation: conn?.[v.id]?.[Tf.Title] || '',
              })),
            groups: groups.map((g) => ({
              id: g.id,
              label: g.title,
              translation: conn?.[g.id]?.[Tf.Title] || '',
            })),
          };
          return {
            ...acc,
            [it.code]: item,
          };
        },
        {} as ITranslationProductFormValues['translations'],
      );

      return {
        title,
        translations,
        hasVariants:
          variants?.length > 0 && variants?.[0]?.features?.length > 0,
      };
    } catch {
      return {} as ITranslationProductFormValues;
    }
  };

  return {
    fetchEntry,
  };
};
