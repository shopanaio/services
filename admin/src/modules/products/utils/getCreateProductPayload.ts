import { mapEntryId } from '@src/utils/utils';
import { IProductFormValues } from '@modules/products/types';
import { ApiCreateProductInput, DimensionUnit, WeightUnit } from '@src/graphql';
import { getFeaturesPayload } from '@modules/products/utils/getFeaturesPayload';
import { mapApiCreatedVariant } from '@modules/products/utils/mapApiCreatedVariant';
import { getApiRichTextJSON } from '@src/entity/Content/description';

export const getCreateProductPayload = (props: {
  data: IProductFormValues;
}): ApiCreateProductInput => {
  const { data } = props;
  const { variants } = data;

  const containerPayload = {
    title: data.title,
    slug: data.slug || null,
    description: getApiRichTextJSON(data.description),
    excerpt: data.excerpt,
    tags: data.tags.map(mapEntryId),
    requiresShipping: data.requiresShipping,
    groups: [], // todo
    variants: [],
    status: data.status,
  } as ApiCreateProductInput;

  if (!variants.length) {
    containerPayload.variants = {
      create: [
        {
          categories: data.categories.map(mapEntryId),
          variantSortIndex: 0,
          inListing: true,
          title: data.title,
          price: data.price,
          slug: data.slug || null,
          stockStatus: data.stockStatus,
          // barcode: data.barcode,
          costPrice: data.costPrice,
          coverId: mapEntryId(data.cover),
          gallery: data.gallery.map(mapEntryId),
          oldPrice: data.oldPrice,
          sku: data.sku,
          ...(data.requiresShipping
            ? {
                weight: data.weight,
                weightUnit: data.weightUnit,
                dimensionUnit: data.dimensionUnit,
                length: data.length,
                width: data.width,
                height: data.height,
              }
            : {
                length: 0,
                width: 0,
                height: 0,
                weight: 0,
                weightUnit: WeightUnit.Gr,
                dimensionUnit: DimensionUnit.Mm,
              }),
          features: getFeaturesPayload(
            data.attributes,
            data.options.flatMap((it) => it.features),
          ),
        },
      ],
    };
  } else {
    containerPayload.variants = {
      create: variants.map((variantData) =>
        mapApiCreatedVariant(
          data,
          variantData as Required<IProductFormValues['variants'][number]>,
        ),
      ),
    };
  }

  return containerPayload;
};
