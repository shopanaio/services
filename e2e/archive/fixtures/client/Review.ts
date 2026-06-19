import type { ApiProductReview, ApiCreateReviewInput, ApiUpdateReviewInput, ApiVoteReviewHelpfulInput } from '@codegen/client-gql';

import type { ClientApiFixture } from '@fixtures/client/api';
import _ from 'lodash';
import type { DeepPartial } from 'types';

export class Review {
  constructor(private api: ClientApiFixture) {}

  /**
   * Create a new product review on behalf of the current customer.
   * Returns the created ProductReview object.
   */
  async create(input: DeepPartial<ApiCreateReviewInput>): Promise<ApiProductReview> {
    const { data } = await this.api.mutation('client/ReviewCreate', {
      variables: {
        input: _.merge(
          {
            locale: 'en',
            displayName: 'John Doe',
          },
          input,
        ),
      },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data as any).createReview as ApiProductReview;
  }

  /**
   * Update an existing review authored by the current customer.
   */
  async update(input: ApiUpdateReviewInput): Promise<ApiProductReview> {
    const { data } = await this.api.mutation('client/ReviewUpdate', {
      variables: { input },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data as any).updateReview as ApiProductReview;
  }

  /**
   * Delete an own review. Returns true on success.
   */
  async delete(id: string): Promise<boolean> {
    const { data } = await this.api.mutation('client/ReviewDelete', {
      variables: { id },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data as any).deleteReview as boolean;
  }

  /**
   * Vote whether a review is helpful (yes/no).
   */
  async voteHelpful(input: ApiVoteReviewHelpfulInput): Promise<boolean> {
    const { data } = await this.api.mutation('client/ReviewVoteHelpful', {
      variables: { input },
    });
    return data.voteReviewHelpful;
  }

  async findOne(id: string, throwOnError = true): Promise<ApiProductReview | null> {
    const { data, errors } = await this.api.query('client/ReviewFindOne', {
      variables: { id },
      throwOnError,
    });
    if (errors && errors.length) {
      return null;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data as any)?.node as ApiProductReview;
  }
}
