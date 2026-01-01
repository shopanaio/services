import { ISwatch } from '@src/entity/Feature/Swatch';
import { IProductVariantOption } from '@src/entity/Product/Variant';
import { FeatureStyleType } from '@src/graphql';

// Product feature item

export interface IProductFeature {
  id: ID;
  slug: string;
  title: string;
  swatch: ISwatch | null;
  style: FeatureStyleType;
  group: IProductFeatureGroup;
}

export interface IProductFeatureGroup {
  // Feature group properties
  id: ID;
  slug: string;
  title: string;
  features: IProductFeature[];
  style: FeatureStyleType;
  // Attribute fields
  isOption?: boolean;
  isActive?: boolean;
  // Field just for the form
  isEditing?: boolean;
}

export class ProductFeature {
  static flattenFeatures(
    features: IProductFeatureGroup[],
  ): IProductVariantOption[] {
    if (!Array.isArray(features)) {
      return [];
    }

    return (features || []).flatMap((group: IProductFeatureGroup) => {
      return group.features.map((feature) => ({
        ...feature,
        group,
      }));
    });
  }
}
