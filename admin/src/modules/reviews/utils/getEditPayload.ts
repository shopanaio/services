import { IReviewFormValues } from '@modules/reviews/types';
import { IReview } from '@src/entity/Review/Review';
import { ApiUpdateReviewInput } from '@src/graphql';

import { FieldNamesMarkedBoolean } from 'react-hook-form';

export const getEditReviewPayload = ({
  data,
  review,
  dirtyFields,
}: {
  data: IReviewFormValues;
  review: IReview;
  dirtyFields: FieldNamesMarkedBoolean<IReviewFormValues>;
}) => {
  const payload = {
    id: review.id,
  } as ApiUpdateReviewInput;

  if (dirtyFields.title) {
    payload.title = data.title;
  }

  if (dirtyFields.message) {
    payload.message = data.message;
  }

  if (dirtyFields.pros) {
    payload.pros = data.pros;
  }

  if (dirtyFields.cons) {
    payload.cons = data.cons;
  }

  if (dirtyFields.rating) {
    payload.rating = data.rating;
  }

  if (dirtyFields.status) {
    payload.status = data.status;
  }

  if (dirtyFields.product) {
    payload.productId = data.product?.id;
  }

  if (dirtyFields.customer) {
    payload.customerId = data.customer?.id;
  }

  if (dirtyFields.displayName) {
    payload.displayName = data.displayName;
  }

  return payload;
};
