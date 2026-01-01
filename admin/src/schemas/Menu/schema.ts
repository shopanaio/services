import * as yup from 'yup';
import { getSlugSchema, getStatusSchema } from '@src/schemas/shared';

export const getCreateMenuSchema = () => {
  return yup.object({
    title: yup.string().required('Title is required'),
    ...getSlugSchema(),
    ...getStatusSchema({ required: true }),
  });
};

export const getEditMenuSchema = () => {
  return yup.object({
    title: yup.string(),
    ...getSlugSchema(),
    ...getStatusSchema(),
  });
};
