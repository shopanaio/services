import * as yup from 'yup';
import {
  getDescriptionSchema,
  getSelectOptionSchema,
  getSlugSchema,
  getStatusSchema,
} from '@src/schemas/shared';
import { ClientProductSortOptions } from '@modules/products/defs';

export const getCreateCategorySchema = () => {
  return yup.object({
    title: yup.string().required('Title is required'),
    description: getDescriptionSchema(),
    seoTitle: yup.string().nullable(),
    seoDescription: yup.string().nullable(),
    ...getSlugSchema(),
    ...getStatusSchema({ required: true }),
    cover: yup.object({ id: yup.string() }).nullable(),
    conditionsType: yup.string().required(),
    conditions: yup.array().of(
      yup.object({
        valueType: yup.string().nullable(),
        value: yup.mixed().required("Condition value can't be empty"),
        type: yup.string().required('Condition type is required'),
        operator: yup
          .object({
            label: yup.string().required(),
            value: yup.string().required(),
          })
          .required('Condition operator is required'),
      }),
    ),
    listingOrderBy: yup
      .string()
      .oneOf(Object.keys(ClientProductSortOptions))
      .required(),
    parents: yup.array().of(getSelectOptionSchema()).max(1),
    children: yup.array().of(getSelectOptionSchema()),
    categoryType: yup.string(),
  });
};

export const getEditCategorySchema = () => {
  return yup.object({
    title: yup.string(),
    description: getDescriptionSchema(),
    seoTitle: yup.string().nullable(),
    seoDescription: yup.string().nullable(),
    ...getSlugSchema(),
    ...getStatusSchema(),
    cover: yup.object({ id: yup.string() }).nullable(),
    conditionsType: yup.string(),
    conditions: yup.array().of(
      yup.object({
        valueType: yup.string().nullable(),
        value: yup.mixed().required("Condition value can't be empty"),
        type: yup.string().required('Condition type is required'),
        operator: yup
          .object({
            label: yup.string().required(),
            value: yup.string().required(),
          })
          .required('Condition operator is required'),
      }),
    ),
    listingOrderBy: yup.string().oneOf(Object.keys(ClientProductSortOptions)),
    parents: yup.array().of(getSelectOptionSchema()).max(1),
    children: yup.array().of(getSelectOptionSchema()),
    categoryType: yup.string(),
  });
};
