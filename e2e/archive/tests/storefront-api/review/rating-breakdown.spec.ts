import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';
import { EntityStatus } from '@codegen/admin-gql';
import { GraphQLFileName } from '@queries/filenames';
import { generateUser } from '@utils/user';



test.describe('StorefrontProductRatingBreakdown', () => {
  test('product rating breakdown is calculated correctly', async ({ api }) => {
    await api.session.setupUserAndProject();

    
    const container = await api.admin.product.createWithOptions({
      title: 'Rating Breakdown Test Product',
      options: [
        {
          title: 'Size',
          values: ['One'],
        },
      ],
      status: EntityStatus.Published,
      price: 1500,
    });

    await api.session.setupApiKey();
    await api.session.setupCustomer();

    
    
    
    const ratings = [5, 4.9, 4.2, 4, 3.8, 3.5, 3.2, 2.9, 2.5, 1.9, 1.2];
    const reviewIds: string[] = [];

    
    const { slug: variantHandle } = container.variants[0];

    for (let i = 0; i < ratings.length; i++) {
      if (i > 0) {
        
        const user = generateUser();
        const { data } = await api.client.auth.passwordSignUp({
          email: user.email,
          password: user.password,
        });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const token = (data as any)?.passwordSignUp?.session?.accessToken as string;
        api.session.customer.data = user;
        api.session.customer.accessToken = token;
      }

      const product = await api.client.product.get(variantHandle);
      const review = await api.client.review.create({
        productId: product.id,
        rating: ratings[i],
        title: `Review ${i}`,
        message: 'text',
      });
      reviewIds.push(review.iid);
    }

    
    api.session.setTenantScope();
    for (const id of reviewIds) {
      const ok = await api.admin.review.approve(id);
      expect(ok).toBe(true);
    }

    
    await api.session.setCustomerScope();

    
    const expectedCounts: Record<number, number> = {};
    for (const r of ratings) {
      const star = Math.floor(r);
      expectedCounts[star] = (expectedCounts[star] ?? 0) + 1;
    }
    const totalReviews = ratings.length;

    
    const { data } = await api.client.query('client/ProductRatingBreakdown' as unknown as GraphQLFileName, {
      variables: { handle: variantHandle },
    });

    const breakdown =
      (data?.product?.rating?.breakdown as { star: number; count: number; percentage: number }[]) ?? [];

    
    expect(breakdown.length).toBe(Object.keys(expectedCounts).length);

    for (const [starStr, count] of Object.entries(expectedCounts)) {
      const star = Number(starStr);
      const item = breakdown.find((b) => b.star === star);
      expect(item).toBeTruthy();
      if (item) {
        expect(item.count).toBe(count);
        const expectedPerc = (count / totalReviews) * 100;
        expect(item.percentage).toBeCloseTo(expectedPerc, 1);
      }
    }

    
    const expectedBreakdown = [
      { star: 5, count: 1, percentage: 9.1 },
      { star: 4, count: 3, percentage: 27.3 },
      { star: 3, count: 3, percentage: 27.3 },
      { star: 2, count: 2, percentage: 18.2 },
      { star: 1, count: 2, percentage: 18.2 },
    ];

    expect(breakdown).toEqual(expect.arrayContaining(expectedBreakdown));
  });

  test('product rating breakdown with skewed low ratings', async ({ api }) => {
    await api.session.setupUserAndProject();

    const container = await api.admin.product.createWithOptions({
      title: 'Rating Breakdown Test Product 2',
      options: [
        {
          title: 'Size',
          values: ['One'],
        },
      ],
      status: EntityStatus.Published,
      price: 1500,
    });

    await api.session.setupApiKey();
    await api.session.setupCustomer();

    
    const ratings = [5, 4.1, 3.7, 3.3, 2.6, 2.4, 1.9, 1.8, 1.5, 1.3, 1];
    const reviewIds: string[] = [];

    const { slug: variantHandle } = container.variants[0];

    for (let i = 0; i < ratings.length; i++) {
      if (i > 0) {
        const user = generateUser();
        const { data } = await api.client.auth.passwordSignUp({
          email: user.email,
          password: user.password,
        });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const token = (data as any)?.passwordSignUp?.session?.accessToken as string;
        api.session.customer.data = user;
        api.session.customer.accessToken = token;
      }

      const product = await api.client.product.get(variantHandle);
      const review = await api.client.review.create({
        productId: product.id,
        rating: ratings[i],
        title: `Review2 ${i}`,
        message: 'text',
      });
      reviewIds.push(review.iid);
    }

    api.session.setTenantScope();
    for (const id of reviewIds) {
      const ok = await api.admin.review.approve(id);
      expect(ok).toBe(true);
    }

    await api.session.setCustomerScope();

    const expectedCounts: Record<number, number> = {};
    for (const r of ratings) {
      const star = Math.floor(r);
      expectedCounts[star] = (expectedCounts[star] ?? 0) + 1;
    }
    const totalReviews = ratings.length;

    const { data } = await api.client.query('client/ProductRatingBreakdown' as unknown as GraphQLFileName, {
      variables: { handle: variantHandle },
    });

    const breakdown =
      (data?.product?.rating?.breakdown as { star: number; count: number; percentage: number }[]) ?? [];

    expect(breakdown.length).toBe(Object.keys(expectedCounts).length);

    for (const [starStr, count] of Object.entries(expectedCounts)) {
      const star = Number(starStr);
      const item = breakdown.find((b) => b.star === star);
      expect(item).toBeTruthy();
      if (item) {
        expect(item.count).toBe(count);
        const expectedPerc = (count / totalReviews) * 100;
        expect(item.percentage).toBeCloseTo(expectedPerc, 1);
      }
    }

    
    const expectedBreakdown = [
      { star: 5, count: 1, percentage: 9.1 },
      { star: 4, count: 1, percentage: 9.1 },
      { star: 3, count: 2, percentage: 18.2 },
      { star: 2, count: 2, percentage: 18.2 },
      { star: 1, count: 5, percentage: 45.5 },
    ];

    expect(breakdown).toEqual(expect.arrayContaining(expectedBreakdown));
  });
});
