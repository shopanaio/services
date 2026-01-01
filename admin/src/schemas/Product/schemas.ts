import {
  SelectOptionSchema,
  getCreatableOptionSchema,
  getSelectOptionSchema,
} from '@src/schemas/shared';
import * as yup from 'yup';
import { ILocale } from '@src/entity/Locale/Locale';
import { WeightUnit, DimensionUnit } from '@src/graphql';
import { isRequired } from '../shared/utils';

export const getProductPricingSchema = () => {
  return {
    sale_enabled: yup.boolean(),
    price: yup
      .number()
      .integer('Price is required (integer)')
      .typeError('Price is required (type)'),
    oldPrice: yup
      .number()
      .integer('Old price is required (integer)')
      .typeError('Old price is required (type)'),
  };
};

export const getProductStockSchema = () => {
  return {
    sku: yup.string().typeError('Sku is of a wrong type'),
    stockStatus: yup
      .string()
      .nullable()
      .typeError('Stock status is required (type)'),
  };
};

export const getProductCategoriesSchema = () => {
  return {
    categories: yup.array().of(getSelectOptionSchema()),
  };
};

export const getProductTagsSchema = () => {
  return {
    tags: yup.array().of(getSelectOptionSchema()),
  };
};

export const getProductTypeSchema = () => {
  return {};
};

export const getProductAttributesSchema = (params: {
  locales: ILocale[];
  required?: boolean;
}) => {
  return {
    attributes: yup.array().of(
      getCreatableOptionSchema({
        entity: 'Attribute',
        locales: params.locales,
      }),
    ),
  };
};

export const getProductLinksSchema = () => {
  return {
    crossSellEnabled: yup.boolean(),
    crossSellProducts: yup.array().of(SelectOptionSchema),
    relatedEnabled: yup.boolean(),
    relatedProducts: yup.array().of(SelectOptionSchema),
    upsellEnabled: yup.boolean(),
    upsellProducts: yup.array().of(SelectOptionSchema),
  };
};

export const getProductMediaSchema = () => {
  return {
    covers: getSelectOptionSchema(),
    gallery: yup
      .array()
      .max(200, "Can't add more than 25 images")
      .of(getSelectOptionSchema()),
  };
};

export const getProductOptionsSchema = (props: {
  required?: boolean;
  locales: ILocale[];
}) => {
  const req = isRequired(!!props?.required);
  const cnt = props?.required ? 2 : 0;
  return {
    options: yup
      .array()
      .of(
        getCreatableOptionSchema({
          entity: 'Option',
          locales: props.locales,
        }),
      )
      .min(cnt, `At least 2 options are required`)
      [req]('Options are required'),
  };
};

export const getProductShippingSchema = () => {
  return {
    requiresShipping: yup.boolean(),
    weight: yup
      .number()
      .min(0, 'Weight must be a positive number')
      .typeError('Weight is required (type)'),
    weightUnit: yup
      .mixed<WeightUnit>()
      .oneOf(
        Object.values(WeightUnit) as WeightUnit[],
        'Weight unit is required',
      ),
    dimensionUnit: yup
      .mixed<DimensionUnit>()
      .oneOf(
        Object.values(DimensionUnit) as DimensionUnit[],
        'Dimension unit is required',
      ),
    length: yup
      .number()
      .min(0, 'Length must be a positive number')
      .typeError('Length is required (type)'),
    width: yup
      .number()
      .min(0, 'Width must be a positive number')
      .typeError('Width is required (type)'),
    height: yup
      .number()
      .min(0, 'Height must be a positive number')
      .typeError('Height is required (type)'),
  };
};
