import { IProductFeatureGroup } from '@src/entity/Product/ProductFeature';

export const getNextAttributes = (
  attributes: IProductFeatureGroup[],
  options: IProductFeatureGroup[],
) => {
  const optionGroups = options;

  const nextAttributes = (attributes || [])
    .filter((it: any) => {
      // When option is deleted then delete attribute which is related to it
      return (
        !it.isOption ||
        optionGroups.findIndex(
          (opt: IProductFeatureGroup) => opt.id === it.id,
        ) !== -1
      );
    })
    .map((attribute: IProductFeatureGroup) => {
      const idx = optionGroups.findIndex(
        (optionGroup: IProductFeatureGroup) => {
          return optionGroup.id === attribute.id;
        },
      );

      if (idx === -1) {
        return attribute;
      }

      /** Replace attributes with options when same feature set a attribute */
      return {
        ...attribute,
        isOption: true,
        features: optionGroups[idx].features,
        style: optionGroups[idx].style,
      };
    });

  optionGroups.forEach((optionGroup) => {
    const idx = nextAttributes.findIndex((attribute: IProductFeatureGroup) => {
      return attribute.id === optionGroup.id;
    });

    if (idx === -1) {
      nextAttributes.push({
        ...optionGroup,
        isOption: true,
        features: optionGroup.features,
      });
    }
  });

  return nextAttributes;
};
