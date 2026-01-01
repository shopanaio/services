import { ApiProductFeature } from '@src/graphql';
import { centsFromDollars } from '@src/utils/price';

export enum CSVFeatureType {
  FEATURE_GROUP = 'FEATURE_GROUP',
  FEATURE_VALUE = 'FEATURE_VALUE',
}

export const TildaFields = {
  tildaUid: 'tildaUid',
  brand: 'brand',
  sku: 'sku',
  mark: 'mark',
  category: 'category',
  title: 'title',
  description: 'description',
  text: 'text',
  photo: 'photo',
  price: 'price',
  quantity: 'quantity',
  priceOld: 'priceOld',
  editions: 'editions',
  modifications: 'modifications',
  externalId: 'externalId',
  parentUid: 'parentUid',
  characteristics: 'characteristicsМатеріал',
  weight: 'weight',
  length: 'length',
  width: 'width',
  height: 'height',
  seoTitle: 'seoTitle',
  seoDescr: 'seoDescr',
  seoKeywords: 'seoKeywords',
  fbTitle: 'fbTitle',
  fbDescr: 'fbDescr',
  url: 'url',
};

export type TildaField = keyof typeof TildaFields;

export const transform = (data: string, header: string) => {
  if (!data) {
    return data;
  }

  if (header === TildaFields.title) {
    return data.trim() || 'Untitled';
  }

  if (header === TildaFields.price || header === TildaFields.priceOld) {
    return centsFromDollars(parseFloat(data));
  }

  if (header === TildaFields.quantity) {
    return parseInt(data, 10);
  }

  if (header === TildaFields.photo) {
    const t = data.split(' ').map((photo) => photo.trim());
    return t;
  }

  if (header === TildaFields.editions) {
    try {
      const trimmed = data.trim();

      // Product options
      // "product_options:[{"title":"Цвет","params":{"view":"radio","hasColor":false,"linkImage":true}}]"
      if (trimmed.startsWith('product_options:')) {
        const config = JSON.parse(trimmed.replace('product_options:', ''));

        if (!config?.[0]?.title) {
          return '';
        }

        return {
          type: CSVFeatureType.FEATURE_GROUP,
          group: config[0].title,
          value: null,
        };
      }

      // Other params
      // Цвет:Рожевий
      const [featureGroup, featureValue] = data.split(':');

      return {
        type: CSVFeatureType.FEATURE_VALUE,
        group: featureGroup,
        value: featureValue,
      };
    } catch (e) {
      return '';
    }
  }

  if (header === TildaFields.category) {
    return data.split(';').map((photo) => photo.trim());
  }

  return data;
};

export type ITildaRecord = Record<TildaField, any> & {
  features: ApiProductFeature[];
};

export type ITildaRecordWithVariants = ITildaRecord & {
  variants: ITildaRecord[];
};
