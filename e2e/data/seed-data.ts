import type { ProductGroupPriceType } from '@codegen/admin-gql';

export interface CategoryData {
  title: string;
  slug: string;
  description: string;
  children?: string[];
}

export interface TagData {
  title: string;
  slug: string;
}

export interface FeatureGroupData {
  title: string;
  slug: string;
  values: string[];
}

export interface ProductDataWithFeatures {
  title: string;
  slug: string;
  category: string;
  tags: string[];
  price: number;
  description: string;
  featureGroups?: {
    slug: string;
    values: string[];
  }[];
  groups?: ProductGroupData[];
}

export interface ProductGroupItemData {
  productSlug: string;
  variantSlug?: string;
  sortIndex: number;
  priceType: ProductGroupPriceType;
  priceAmountValue?: number;
  pricePercentageValue?: number;
}

export interface ProductGroupData {
  title: string;
  isMultiple: boolean;
  isRequired: boolean;
  sortIndex: number;
  items: ProductGroupItemData[];
}
