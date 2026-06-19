import { test } from '@fixtures/base.extend';

test.describe.skip('Admin product details media update UI', () => {
  test('adds, reorders, and removes product media from product details', async () => {
    /*
     * Combined case:
     * Covers the full product media lifecycle in one product details journey:
     * add media, reorder gallery, then remove media. All three operations are
     * backed by productUpdate.media.fileIds and should preserve file order.
     *
     * Setup:
     * - Create a user, organization, project, and product through fixtures/API.
     * - Sign in and open the product details modal.
     * - Use stable fixture images from e2e archive fixtures.
     *
     * Scenario 1: add media.
     * - Open the media section edit action.
     * - Upload at least three images.
     * - Save the edit-media modal.
     * - Assert ProductFindOne returns three media items with sequential
     *   sortIndex values.
     * - Assert the product details media section renders the uploaded images.
     *
     * Scenario 2: reorder media.
     * - Reopen Edit Media.
     * - Move the last image to the first featured position.
     * - Save.
     * - Assert ProductFindOne returns media file ids in the new order.
     * - Assert the products table thumbnail changes to the new first image.
     *
     * Scenario 3: remove media.
     * - Reopen Edit Media.
     * - Remove one image and save.
     * - Assert ProductFindOne returns only the remaining file ids.
     * - Reopen Edit Media, remove the remaining images, and save.
     * - Assert ProductFindOne returns an empty media array.
     * - Assert the product details media section returns to its empty state.
     */
  });
});
