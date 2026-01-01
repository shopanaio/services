import { slugify } from '@components/forms/slug/slugify';
import { ISwatch } from '@src/entity/Feature/Swatch';
import {
  IProductFeatureGroup,
  IProductFeature,
} from '@src/entity/Product/ProductFeature';
import {
  ApiFeatureSwatchInput,
  ApiProductFeatureInput,
  FeatureStyleType,
  FeatureSwatchType,
} from '@src/graphql';
import { isSyntheticId, NIL_UUID } from '@src/utils/synthetic-id';
import { equalsId } from '@src/utils/utils';

export const getFeaturesPayload = (
  /**
   * Each variant has all attributes
   * and all variants have the same attributes
   */
  attributes: IProductFeatureGroup[],
  /**
   * Flat options from a variant, or from a parent which have all options when no variants added (which is not possible)
   */
  flattenOptions: IProductFeature[],
): ApiProductFeatureInput[] => {
  const getOptionIndex = (id: ID) => {
    return (flattenOptions || []).findIndex(equalsId(id));
  };

  const flattenAttributes = attributes.flatMap(
    ({ features, isOption, isActive, ...group }) => {
      return features
        .filter(({ id }) => {
          if (isOption) {
            // Check that this feature exists in options
            if (getOptionIndex(id) === -1) {
              return false;
            }
          }

          return true;
        })
        .map((it): ApiProductFeatureInput => {
          console.log({ group }, 'it');
          const isAttribute = !isOption || !!isActive; // Is Active mean use option as attribute
          return {
            featureId: it.id,
            isAttribute,
            isOption: Boolean(isOption),
            title: it.title || '',
            slug: slugify(it.title || ''),
            group: {
              id: isSyntheticId(group.id) ? null : group.id,
              featureStyleType: group.style || FeatureStyleType.Radio,
              title: group.title || '',
              slug: slugify(group.title || ''),
            },
            swatch: it.swatch ? getSwatchPayload(it.swatch) : null,
          };
        });
    },
  );

  /**
   * No feature group Id because this features already have this relation
   */
  return flattenAttributes.map((it, idx) => ({
    ...it,
    attributeSortIndex: idx,
    // Keeping synthetic id for option sort index
    optionSortIndex: it.isOption ? getOptionIndex(it.featureId!) : 0,
    // Removing synthetic id for feature id
    featureId: isSyntheticId(it.featureId) ? null : it.featureId,
  }));
};

const getSwatchPayload = (swatch: ISwatch) => {
  let payload = {
    id: !isSyntheticId(swatch.id) ? swatch.id : null,
    type: swatch.type,
  } as ApiFeatureSwatchInput;

  switch (swatch.type) {
    case FeatureSwatchType.Color:
      payload = {
        ...payload,
        color1: swatch.color1,
        color2: null,
        imageId: NIL_UUID,
      };
      break;
    case FeatureSwatchType.ColorDuo:
      payload = {
        ...payload,
        color1: swatch.color1,
        color2: swatch.color2,
        imageId: NIL_UUID,
      };
      break;
    case FeatureSwatchType.Image:
      payload = {
        ...payload,
        color1: null,
        color2: null,
        ...(swatch.image?.id ? { imageId: swatch.image.id } : {}),
      };
      break;
  }

  return payload;
};
