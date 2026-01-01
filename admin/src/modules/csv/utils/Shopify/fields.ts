import { ApiFeatureGroup } from '@src/graphql';
import { centsFromDollars } from '@src/utils/price';

const ShopifyFields = {
  handle: 'handle',
  title: 'title',
  bodyHtml: 'bodyHtml',
  vendor: 'vendor',
  category: 'category',
  type: 'type',
  tags: 'tags',
  compareAtPriceInternational: 'compareAtPriceInternational',
  costPerItem: 'costPerItem',
  giftCard: 'giftCard',
  googleShoppingAdWordsGrouping: 'googleShoppingAdWordsGrouping',
  googleShoppingAdWordsLabels: 'googleShoppingAdWordsLabels',
  googleShoppingAgeGroup: 'googleShoppingAgeGroup',
  googleShoppingCondition: 'googleShoppingCondition',
  googleShoppingCustomLabel_0: 'googleShoppingCustomLabel_0',
  googleShoppingCustomLabel_1: 'googleShoppingCustomLabel_1',
  googleShoppingCustomLabel_2: 'googleShoppingCustomLabel_2',
  googleShoppingCustomLabel_3: 'googleShoppingCustomLabel_3',
  googleShoppingCustomLabel_4: 'googleShoppingCustomLabel_4',
  googleShoppingCustomProduct: 'googleShoppingCustomProduct',
  googleShoppingGender: 'googleShoppingGender',
  googleShoppingGoogleProductCategory: 'googleShoppingGoogleProductCategory',
  googleShoppingMPN: 'googleShoppingMPN',
  imageAltText: 'imageAltText',
  imagePosition: 'imagePosition',
  imageSrc: 'imageSrc',
  option1Name: 'option1Name',
  option1Value: 'option1Value',
  option2Name: 'option2Name',
  option2Value: 'option2Value',
  option3Name: 'option3Name',
  option3Value: 'option3Value',
  priceInternational: 'priceInternational',
  published: 'published',
  sEODescription: 'sEODescription',
  sEOTitle: 'sEOTitle',
  status: 'status',
  variantBarcode: 'variantBarcode',
  variantCompareAtPrice: 'variantCompareAtPrice',
  variantFulfillmentService: 'variantFulfillmentService',
  variantGrams: 'variantGrams',
  variantImage: 'variantImage',
  variantInventoryPolicy: 'variantInventoryPolicy',
  variantInventoryQty: 'variantInventoryQty',
  variantInventoryTracker: 'variantInventoryTracker',
  variantPrice: 'variantPrice',
  variantRequiresShipping: 'variantRequiresShipping',
  variantSku: 'variantSKU',
  variantTaxable: 'variantTaxable',
  variantTaxCode: 'variantTaxCode',
  variantWeightUnit: 'variantWeightUnit',
  collection: 'collection',
};

export type ShopifyField = keyof typeof ShopifyFields;

export type IShopifyRecord = Record<ShopifyField, any>;

export const transform = (data: string, header: string) => {
  if (!data) {
    return data;
  }

  data = data.trim();

  if (header === ShopifyFields.title) {
    return data || 'Untitled';
  }

  if (
    header === ShopifyFields.variantPrice ||
    header === ShopifyFields.priceInternational ||
    header === ShopifyFields.costPerItem ||
    header === ShopifyFields.variantCompareAtPrice ||
    header === ShopifyFields.compareAtPriceInternational
  ) {
    return centsFromDollars(parseFloat(data));
  }

  if (
    header === ShopifyFields.variantInventoryQty ||
    header === ShopifyFields.variantGrams ||
    header === ShopifyFields.imagePosition
  ) {
    const int = parseInt(data, 10);
    return int.toString() === 'NaN' ? 0 : int;
  }

  if (header === ShopifyFields.imageSrc) {
    return data.split(' ').map((src) => src.trim());
  }

  if (header === ShopifyFields.tags) {
    return data.split(',').map((tag) => tag.trim());
  }

  if (header === ShopifyFields.collection) {
    return data.split(',').map((tag) => tag.trim());
  }

  return data;
};

export const OptionValues = [
  'option1Value',
  'option2Value',
  'option3Value',
] as const;

export const OptionNames = [
  'option1Name',
  'option2Name',
  'option3Name',
] as const;

export const FeatureGroupsMapping: Record<string, ApiFeatureGroup> = {};

export { ShopifyFields };
