import * as yup from 'yup';
import {
  getSelectOptionSchema,
  getSlugSchema,
  getStatusSchema,
} from '@src/schemas/shared';

export const getCreateTopicSchema = () => {
  return yup.object({
    title: yup.string().required('Title is required'),
    ...getSlugSchema(),
    ...getStatusSchema({ required: true }),
    cover: yup.object({ id: yup.string() }).nullable(),
    posts: yup.array().of(getSelectOptionSchema()),
  });
};

export const getEditTopicSchema = () => {
  return yup.object({
    title: yup.string(),
    ...getSlugSchema(),
    ...getStatusSchema(),
    cover: yup.object({ id: yup.string() }).nullable(),
    topics: yup.array().of(getSelectOptionSchema()),
  });
};
