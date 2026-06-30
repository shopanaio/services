import { test } from '@fixtures/base.extend';

test.describe.skip('Admin product details update error handling UI', () => {
  test('validates required fields and handles stale product revisions', async () => {
    /*
     * Combined case:
     * Covers product update failure paths that should keep the active modal open
     * instead of presenting a false successful save.
     *
     * Setup:
     * - Create a user, organization, project, and product through fixtures/API.
     * - Sign in and open the product details modal.
     *
     * Scenario 1: required identity fields.
     * - Open the title actions menu.
     * - Choose "Edit title".
     * - Clear Title and submit.
     * - Assert the modal remains open and "Title is required" is shown.
     * - Restore Title, clear Handle, and submit.
     * - Assert the modal remains open and "Handle is required" is shown.
     * - Assert ProductFindOne still returns the original title and handle.
     *
     * Scenario 2: revision conflict.
     * - Close/reopen product details or continue from the loaded product state.
     * - Update the same product through the admin API to bump its revision.
     * - Submit an API-backed UI edit using the stale revision, preferably title
     *   or SEO because both pass expectedRevision to productUpdate.
     * - Assert the active edit modal remains open.
     * - Assert the UI surfaces the REVISION_CONFLICT user error message.
     * - Assert ProductFindOne returns the API-side update, not the stale UI edit.
     */
  });
});
