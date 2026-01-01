import * as yup from 'yup';
import {
  getContentSchema,
  getSelectOptionSchema,
  getStatusSchema,
} from '@src/schemas/shared';

export const getCreateOrderItemSchema = () => {
  return yup.object({
    ...getContentSchema(['title'], {
      required: true,
    }),
    quantity: yup.number().required().min(1),
    price: yup.number().required().min(0),
  });
};

export const getOrderSchema = () => {
  return yup.object({
    customer: yup
      .array()
      .of(yup.object({ id: yup.string() }).required())
      .length(1, 'Customer is required'),

    items: yup
      .array()
      .of(getCreateOrderItemSchema())
      .min(1, 'Products are required'),
  });
};

export const getEditOrderSchema = () => {
  return yup.object({
    ...getContentSchema(['title']),
    ...getStatusSchema(),
    cover: yup.object({ id: yup.string() }).nullable(),
    topics: yup.array().of(getSelectOptionSchema()),
  });
};
