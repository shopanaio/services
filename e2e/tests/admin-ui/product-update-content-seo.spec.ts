import { test } from '@fixtures/base.extend';

test.describe.skip('Admin product details content and SEO update UI', () => {
  test('updates all API-backed content and SEO fields from product details', async () => {
    /*
     * Combined case:
     * Covers one product details editing journey for content + SEO because both
     * flows save product-level metadata through productUpdate and should be
     * validated together against the same product revision lifecycle.
     *
     * Setup:
     * - Create a user, organization, and project through the session fixture.
     * - Create a product through the admin API with initial title, handle,
     *   description, excerpt, and empty or known SEO fields.
     * - Sign in through the admin UI and open the product details modal from
     *   the products table.
     *
     * Scenario 1: description + excerpt.
     * - Open the content actions menu in ProductContentTabs.
     * - Choose "Edit content".
     * - Update the Description editor.
     * - Switch to the Excerpt tab and update the Excerpt editor.
     * - Submit the edit-description modal.
     * - Assert that the modal closes and ProductFindOne returns updated
     *   description.text/html/json and excerpt.text/html/json.
     *
     * Scenario 2: SEO metadata.
     * - Open "Edit SEO".
     * - Fill Meta Title and Meta Description.
     * - Fill OG Title and OG Description.
     * - Submit the edit-seo modal.
     * - Assert that ProductFindOne returns seo.seoTitle, seo.seoDescription,
     *   seo.ogTitle, and seo.ogDescription.
     *
     * Scenario 3: OG image.
     * - Reopen "Edit SEO".
     * - Upload or select a stable fixture image in the OG Image field.
     * - Submit the edit-seo modal.
     * - Assert that ProductFindOne returns seo.ogImage with the uploaded file.
     * - Reopen the SEO modal and assert that the saved OG image is preloaded.
     */
  });
});
