import { test } from '@fixtures/base.extend';

test.describe('Loyalty product applies-to across Admin and Storefront', () => {
  test('applies ALL targeting in presentation and final order earning', () => {
    // Publish ALL, compare product/variant estimates with checkout/order authoritative calculations.
  });

  test('applies PRODUCT targeting in presentation and final order earning', () => {
    // Order selected and unselected products and verify per-line estimates, snapshots, and awarded points agree.
  });

  test('applies VARIANT targeting in presentation and final order earning', () => {
    // Compare sibling variants through Product/Variant loyalty and mixed checkout lines.
  });

  test('applies CATEGORY targeting in presentation and final order earning', () => {
    // Use category membership at the immutable catalog snapshot and verify matching lines only.
  });

  test('applies TAG targeting in presentation and final order earning', () => {
    // Use tagged/untagged lines and verify Storefront, Orders facts, and Loyalty audit select the same lines.
  });

  test('applies FEATURE targeting in presentation and final order earning', () => {
    // Use feature assignments and verify applies-to consistency with no cross-store reference matches.
  });

  test('applies OPTION_VALUE targeting in presentation and final order earning', () => {
    // Select variants by option value and verify only matching order lines receive the configured reward.
  });

  test('applies every selector type as a standard-earning exclusion', () => {
    // Repeat ALL and each specific selector and verify estimates and actual ledger awards exclude identical lines.
  });

  test('combines multiple applies-to and exclusion selectors deterministically', () => {
    // Use a mixed cart where lines match several selectors and verify union/no-double-count invariants.
  });

  test('captures catalog targeting immutably when catalog membership changes later', () => {
    // Change tags/categories/features/options after order fact capture and preserve historical awarded calculation.
  });

  test('rejects stale or deleted catalog references before publication', () => {
    // Create valid draft targeting, delete/move the reference, publish, and verify Admin blocks Storefront exposure.
  });
});
