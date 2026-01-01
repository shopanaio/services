import { getSlugSchema } from '@src/schemas/shared';
import * as yup from 'yup';

export const getCreateFeatureGroupSchema = () => {
  return yup.object({
    title: yup.string().required('Title is required'),
    ...getSlugSchema(),
  });
};

export const getEditAttributeGroupSchema = () => {
  return yup.object({
    title: yup.string(),
    ...getSlugSchema(),
  });
};
