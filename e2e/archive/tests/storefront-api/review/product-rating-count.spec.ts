import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';
import { EntityStatus } from '@codegen/admin-gql';
import { generateUser } from '@utils/user';



test.describe('StorefrontProductRatingAndCount', () => {
  test('product variants reflect correct rating and reviewCount', async ({ api }) => {
    await api.session.setupUserAndProject();

    
    const container = await api.admin.product.createWithOptions({
      title: 'Rating Test Product',
      options: [
        {
          title: 'Size',
          values: ['XS', 'S', 'M', 'L'],
        },
      ],
      status: EntityStatus.Published,
      price: 1000,
    });

    await api.session.setupApiKey();
    await api.session.setupCustomer();

    const ratings = [5, 4.5, 4, 3.5, 3, 5, 4, 4, 4.5, 5, 5, 4, 2, 3, 3.5]; 
    const reviewIds: string[] = [];

    for (let i = 0; i < ratings.length; i++) {
      if (i > 0) {
        
        const user = generateUser();
        const { data } = await api.client.auth.passwordSignUp({
          email: user.email,
          password: user.password,
        });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const token = (data as any)?.passwordSignUp?.session?.accessToken as string;
        expect(token).toBeTruthy();
        api.session.customer.data = user;
        api.session.customer.accessToken = token;
      }
      const variant = await api.client.product.get(container.variants[0].slug);
      const review = await api.client.review.create({
        productId: variant.id, 
        rating: ratings[i],
        title: `Review ${i}`,
        message: 'text',
      });
      reviewIds.push(review.iid);
    }

    
    api.session.setTenantScope();

    
    for (let i = 0; i < 12; i++) {
      const ok = await api.admin.review.approve(reviewIds[i]);
      expect(ok).toBe(true);
    }

    await api.session.setCustomerScope();

    const approvedRatings = ratings.slice(0, 12);
    const expectedAvg = approvedRatings.reduce((acc, r) => acc + r, 0) / approvedRatings.length;

    for (const variant of container.variants) {
      const product = await api.client.product.get(variant.slug);
      expect(product?.rating.count).toBe(12);
      expect(product?.rating.rating).toBeCloseTo(expectedAvg, 2);
    }
  });
});
