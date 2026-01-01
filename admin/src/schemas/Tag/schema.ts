import * as yup from 'yup';
import { getSlugSchema } from '@src/schemas/shared';

export const getCreateTagSchema = () => {
  return yup.object({
    title: yup.string().required('Title is required'),
    ...getSlugSchema(),
  });
};

export const getEditTagSchema = () => {
  return yup.object({
    title: yup.string(),
    slug: yup.string(),
  });
};
