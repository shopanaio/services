import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';
import { ReviewStatus } from '@codegen/admin-gql';

// e2e test: approve and reject review

test.describe('ReviewApproveReject', () => {
  test('approve and reject flow', async ({ api }) => {
    await api.session.setupUserAndProject();

    const product = await api.admin.product.create();
    const variantId = product.variants[0].id;

    // Approve
    const { id: customerApproveId } = await api.admin.customer.create();

    const approveId = await api.admin.review.create({
      rating: 3,
      title: 'Approve me',
      message: 'Approve text',
      displayName: 'John Doe',
    });

    const pendingApprove = await api.admin.review.findOne(approveId);
    expect(pendingApprove?.status).toBe(ReviewStatus.Pending);

    await api.admin.review.update({
      input: {
        id: approveId,
        customerId: customerApproveId,
        productId: variantId,
      },
    });

    const okApprove = await api.admin.review.approve(approveId);
    expect(okApprove).toBe(true);
    const approved = await api.admin.review.findOne(approveId);
    expect(approved?.status).toBe(ReviewStatus.Approved);

    const { id: customerRejectId } = await api.admin.customer.create();

    const rejectId = await api.admin.review.create({
      rating: 1,
      title: 'Reject me',
      message: 'Reject text',
      displayName: 'John Doe',
    });

    const pendingReject = await api.admin.review.findOne(rejectId);
    expect(pendingReject?.status).toBe(ReviewStatus.Pending);

    await api.admin.review.update({
      input: {
        id: rejectId,
        customerId: customerRejectId,
        productId: variantId,
      },
    });

    const okReject = await api.admin.review.reject(rejectId, 'bad');
    expect(okReject).toBe(true);
    const rejected = await api.admin.review.findOne(rejectId);
    expect(rejected?.status).toBe(ReviewStatus.Rejected);
  });
});
