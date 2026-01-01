import { ICustomer } from '@src/entity/Customer/Customer';
import { IProductVariant } from '@src/entity/Product/Variant';
import { ReviewStatus } from '@src/graphql';

export interface IReviewFormValues {
  product: IProductVariant | null;
  customer: ICustomer | null;
  message: string;
  rating: number;
  status: ReviewStatus;
  pros: string;
  cons: string;
  title: string;
  displayName: string;
}
