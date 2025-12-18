import { expect } from '@playwright/test';
import { ProductReviewSort } from '@codegen/client-gql';
import type { ApiFixtures } from '@fixtures/api/api';
import { createCursorPaginationTests } from '@utils/cursorPaginationBuilder';
import { GraphQLFileName } from '@queries/filenames';
import { generateUser } from '@utils/user';

// ---------------------------------------------------------------------------
// Helper mappings and sort definitions
// ---------------------------------------------------------------------------

const sortToFieldOrder: Record<ProductReviewSort, { field: string; order: 'ASC' | 'DESC' }> = {
  [ProductReviewSort.CreatedAtAsc]: { field: 'created_at', order: 'ASC' },
  [ProductReviewSort.CreatedAtDesc]: { field: 'created_at', order: 'DESC' },
  [ProductReviewSort.RatingDesc]: { field: 'rating', order: 'DESC' },
  [ProductReviewSort.HelpfulYesDesc]: { field: 'helpful_yes', order: 'DESC' },
};

const sortsArray: ProductReviewSort[] = [
  ProductReviewSort.CreatedAtAsc,
  ProductReviewSort.CreatedAtDesc,
  ProductReviewSort.RatingDesc,
  ProductReviewSort.HelpfulYesDesc,
];

const getExpectedBySort = (titles: string[], sort: ProductReviewSort) => {
  switch (sort) {
    case ProductReviewSort.CreatedAtDesc:
    case ProductReviewSort.RatingDesc:
    case ProductReviewSort.HelpfulYesDesc:
      return [...titles].reverse();
    default:
      return [...titles];
  }
};

// ---------------------------------------------------------------------------
// Test data preparation
// ---------------------------------------------------------------------------

async function prepareProductReviews(api: ApiFixtures['api']) {
  await api.session.setupUserAndProject();

  
  const {
    variants: [{ slug: handle }],
  } = await api.admin.product.create();

  
  await api.session.setupApiKey();
  await api.session.setupCustomer();

  const product = await api.client.product.get(handle);

  const expectedTitles: string[] = [];
  const reviewIds: { global: string; internal: string }[] = [];

  
  for (let i = 0; i < 5; i++) {
    api.session.customer.data = generateUser();
    await api.session.setupCustomer();

    const title = `Review ${i}`;
    const { id: reviewId, iid } = await api.client.review.create({
      title,
      rating: i + 1, 
      message: `Message ${i}`,
      productId: product.id,
    });

    expectedTitles.push(title);
    reviewIds.push({
      global: reviewId,
      internal: iid,
    });
  }

  
  api.session.setTenantScope();
  for (const { internal: iid } of reviewIds) {
    const ok = await api.admin.review.approve(iid);
    expect(ok).toBe(true);
  }

  
  await api.session.setCustomerScope();

  for (let i = 0; i < reviewIds.length; i++) {
    const { global: reviewId } = reviewIds[i];
    for (let v = 0; v < i; v++) {
      if (v > 0) {
        
        api.session.customer.data = generateUser();
        await api.session.setupCustomer();
      }
      const ok = await api.client.review.voteHelpful({ reviewId, helpful: true });
      expect(ok).toBe(true);
    }
  }

  
  return {
    expectedTitles,
    baseVariables: { handle },
  } as const;
}

// ---------------------------------------------------------------------------
// Register cursor pagination test suite
// ---------------------------------------------------------------------------

createCursorPaginationTests<ProductReviewSort>({
  queryName: 'client/ProductReviews' as GraphQLFileName,
  suiteName: 'product reviews cursor pagination',
  prepare: prepareProductReviews,
  sorts: sortsArray,
  sortToFieldOrder,
  getExpectedBySort,
  getConnection: (data) => data.product.reviews,
  pageSize: 2,
  getSeekValue: {
    rating: (node) => node.rating,
    helpfulYes: (node) => node.helpfulYes,
  },
});
