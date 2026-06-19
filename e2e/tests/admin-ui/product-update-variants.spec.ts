import { test } from '@fixtures/base.extend';

test.describe.skip('Admin product details variant update UI', () => {
  test('updates pricing, inventory, and physical fields for variants', async () => {
    /*
     * Combined case:
     * Covers the main variant update lifecycle from product details in one file.
     * Keep skipped until EditVariantsModal and InventorySection save handlers are
     * wired to productUpdate.variants.
     *
     * Current implementation notes:
     * - Product details Edit Variants currently shows
     *   "Variant bulk edits are not API-backed yet".
     * - InventorySection currently shows
     *   "Variant inventory updates are not API-backed yet".
     *
     * Setup:
     * - Create a user, organization, project, and a product with more than ten
     *   variants through the admin API.
     * - Create or reuse a warehouse required by inventory update API payloads.
     * - Sign in and open the product details modal.
     *
     * Scenario 1: one variant pricing update.
     * - Open the Variants section edit action.
     * - Edit price and compare-at price for one variant.
     * - Save.
     * - Assert ProductFindOne returns updated variant.price fields.
     * - Assert the variants table shows updated price and discount state.
     *
     * Scenario 2: bulk variant pricing update.
     * - Reopen Edit Variants.
     * - Change prices for two or more variant rows.
     * - Save once.
     * - Assert all changed variants are persisted and unchanged variants retain
     *   their original prices.
     *
     * Scenario 3: inventory update.
     * - Open Inventory actions and choose "Edit inventory".
     * - Change SKU, on-hand quantity, and unavailable quantity for one row.
     * - Save.
     * - Assert ProductFindOne returns updated inventoryItem.sku and stock.
     *
     * Scenario 4: invalid inventory value.
     * - Reopen the inventory editor.
     * - Enter an invalid quantity combination, such as unavailable greater than
     *   on-hand.
     * - Assert the UI shows validation feedback and ProductFindOne confirms
     *   inventory values did not change.
     *
     * Scenario 5: weight and dimensions.
     * - Reopen Edit Variants.
     * - Change weight, length, width, and height for one variant.
     * - Save.
     * - Assert ProductFindOne returns updated inventoryItem.weight and
     *   inventoryItem.dimensions.
     *
     * Scenario 6: paginated variants.
     * - Navigate to the next variants page in the product details table.
     * - Edit a variant that was not on the first page.
     * - Save.
     * - Assert the changed variant persists and first-page variants remain
     *   unchanged.
     */
  });
});
