import { Customer, ICustomer } from '@src/entity/Customer/Customer';
import { IProduct } from '@src/entity/Product/Product';
import { IProductVariant, ProductVariant } from '@src/entity/Product/Variant';
import { ApiReview, ReviewStatus } from '@src/graphql';

export interface IReview {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  customer: ICustomer | null;
  message: string | null;
  rating: number;
  status: ReviewStatus;
  pros: string | null;
  cons: string | null;
  title: string | null;
  displayName: string | null;
  product: IProductVariant | null;
  helpfulYes: number;
  helpfulNo: number;
}

// TODO: Create a small snapshot of the product for a review

export class Review {
  static create(data: ApiReview): IReview {
    try {
      return {
        customer: data.customer ? Customer.create(data.customer) : null,
        product: data.product ? ProductVariant.create(data.product) : null,
        id: data.id,
        message: data.message || null,
        rating: data.rating,
        status: data.status,
        pros: data.pros || null,
        cons: data.cons || null,
        title: data.title || null,
        displayName: data.displayName || null,
        helpfulYes: data.helpfulYes || 0,
        helpfulNo: data.helpfulNo || 0,
        createdAt: new Date(data.createdAt),
        updatedAt: new Date(data.updatedAt),
      };
    } catch (error) {
      console.error('Review.create', error);
      throw error;
    }
  }
}
