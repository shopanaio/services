import * as yup from 'yup';
import {
  getDescriptionSchema,
  getSelectOptionSchema,
  getSlugSchema,
  getStatusSchema,
} from '@src/schemas/shared';

export const getCreatePageSchema = () => {
  return yup.object({
    title: yup.string().required('Title is required'),
    description: getDescriptionSchema(),
    seoTitle: yup.string().nullable(),
    seoDescription: yup.string().nullable(),
    ...getSlugSchema(),
    ...getStatusSchema({ required: true }),
    cover: yup.object({ id: yup.string() }).nullable(),
    topics: yup.array().of(getSelectOptionSchema()),
  });
};

export const getEditPageSchema = () => {
  return yup.object({
    title: yup.string(),
    description: getDescriptionSchema(),
    seoTitle: yup.string().nullable(),
    seoDescription: yup.string().nullable(),
    ...getSlugSchema(),
    ...getStatusSchema(),
    cover: yup.object({ id: yup.string() }).nullable(),
    topics: yup.array().of(getSelectOptionSchema()),
  });
};
