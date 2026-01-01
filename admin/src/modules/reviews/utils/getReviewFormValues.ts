import { IReview } from '@src/entity/Review/Review';
import { IReviewFormValues } from '@modules/reviews/types';
import { defaultFormValues } from '@modules/reviews/defs';

export const getReviewFormValues = (review: IReview): IReviewFormValues => {
  return {
    title: review.title || defaultFormValues.title,
    rating: review.rating || defaultFormValues.rating,
    message: review.message || defaultFormValues.message,
    pros: review.pros || defaultFormValues.pros,
    cons: review.cons || defaultFormValues.cons,
    status: review.status || defaultFormValues.status,
    // Customer
    customer: review.customer || defaultFormValues.customer,
    displayName: review.displayName || defaultFormValues.displayName,
    // Product
    product: review.product || defaultFormValues.product,
  };
};
