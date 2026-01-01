import { IProductGroup } from '@src/entity/ProductGroup/ProductGroup';
import { IProductGroupItem } from '@src/entity/ProductGroup/ProductGroupItem';
import { REAL_ID_LENGTH, SYNTHETIC_ID_LENGTH } from '@src/utils/synthetic-id';
import * as Yup from 'yup';
import { ProductGroupPriceType } from '@src/graphql';

export interface InternalProductGroup extends IProductGroup {
  isEditing?: boolean;
  isNew?: boolean;
}

export interface IProductGroupFormValues {
  id: ID;
  title: string;
  isRequired: boolean;
  isMultiple: boolean;
  items: IProductGroupItem[];
}

export const getGroupFormSchema = () =>
  Yup.object().shape({
    title: Yup.string().min(1).max(255).required('Required'),
    isRequired: Yup.boolean().required('Required'),
    isMultiple: Yup.boolean().required('Required'),
    items: Yup.array()
      .of(
        Yup.object().shape({
          id: Yup.string()
            .min(SYNTHETIC_ID_LENGTH, 'Invalid id')
            .required('Required'),
          product: Yup.object().shape({
            id: Yup.string()
              .length(REAL_ID_LENGTH)
              .required('Product is required'),
          }),
          priceType: Yup.mixed<ProductGroupPriceType>()
            .oneOf(
              Object.values(ProductGroupPriceType),
              'Please select price type',
            )
            .required('Please select price type'),

          priceAmountValue: Yup.number()
            .transform((value, originalValue) => {
              return originalValue === '' || originalValue === undefined
                ? undefined
                : value;
            })
            .nullable()
            .when('priceType', {
              is: (pt: ProductGroupPriceType) =>
                [
                  ProductGroupPriceType.BaseAdjustAmount,
                  ProductGroupPriceType.BaseOverride,
                ].includes(pt as ProductGroupPriceType),
              then: (schema) =>
                (schema as Yup.NumberSchema<number | undefined>)
                  .required('Enter amount')
                  .min(0, 'Amount cannot be negative'),
              otherwise: (schema) => (schema as any).strip(),
            }),

          pricePercentageValue: Yup.number()
            .transform((value, originalValue) => {
              return originalValue === '' || originalValue === undefined
                ? undefined
                : value;
            })
            .nullable()
            .when('priceType', {
              is: (pt: ProductGroupPriceType) =>
                pt === ProductGroupPriceType.BaseAdjustPercent,
              then: (schema) =>
                (schema as Yup.NumberSchema<number | undefined>)
                  .required('Enter percent (0–100)')
                  .min(0, 'Percent cannot be less than 0')
                  .max(100, 'Percent cannot be greater than 100'),
              otherwise: (schema) => (schema as any).strip(),
            }),
        }),
      )
      .min(1, 'At least one item is required'),
  });

export const defaultValues: IProductGroupFormValues = {
  id: '',
  title: '',
  isRequired: true,
  isMultiple: false,
  items: [],
};
