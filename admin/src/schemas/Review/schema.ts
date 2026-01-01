import * as yup from 'yup';
import { ReviewStatus } from '@src/graphql';

export const getCreateReviewSchema = () => {
  return yup.object({
    productId: yup.string().required('Product is required'),
    customerId: yup.string().required('Customer is required'),
    message: yup.string().required('Message is required'),
    title: yup.string().required('Title is required'),
    pros: yup.string(),
    cons: yup.string(),
    rating: yup
      .number()
      .min(0, 'Rating must be at least 0')
      .max(5, 'Rating must be at most 5')
      .required('Rating is required'),
    status: yup.mixed<ReviewStatus>().oneOf(Object.values(ReviewStatus)),
    displayName: yup.string(),
  });
};

export const getEditReviewSchema = () => {
  return yup.object({
    product: yup.object().shape({
      id: yup.string().required('Product is required'),
    }),
    customer: yup.object().shape({
      id: yup.string().required('Customer is required'),
    }),
    message: yup.string(),
    title: yup.string(),
    pros: yup.string(),
    cons: yup.string(),
    rating: yup
      .number()
      .min(0, 'Rating must be at least 0')
      .max(5, 'Rating must be at most 5'),
    status: yup.mixed<ReviewStatus>().oneOf(Object.values(ReviewStatus)),
    displayName: yup.string().required('Display name is required'),
  });
};
