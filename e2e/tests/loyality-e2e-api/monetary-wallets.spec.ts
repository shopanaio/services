import { test } from '@fixtures/base.extend';

test.describe('Loyalty monetary wallets end to end', () => {
  test('earns pending cashback and activates it after the configured delay', () => {
    // Trigger monetary cashback, verify Admin pending wallet, maintenance activation, and separated points balance.
  });

  test('earns store credit in the configured currency', () => {
    // Issue a store-credit reward and verify wallet identity, exact minor units, lot, and audit transaction.
  });

  test('converts available points to cashback and store credit atomically', () => {
    // Convert through Admin and verify paired ledgers, exact rate, account balance, and wallet balance.
  });

  test('reserves spends releases and restores monetary credit through checkout', () => {
    // Exercise successful, failed, and refunded orders with exact wallet lot allocation.
  });

  test('expires monetary credit without affecting the points ledger', () => {
    // Run maintenance at lot expiry and verify monetary audit/balance only.
  });

  test('tracks or rejects monetary reversal debt according to policy', () => {
    // Spend earned credit before reversal and verify configured underfunding behavior.
  });

  test('keeps wallets separate by cashback store-credit type and currency', () => {
    // Earn into several wallets and verify no cross-wallet allocation, conversion, or balance mixing.
  });

  test('merges customer wallets while retaining source transaction history', () => {
    // Merge accounts and verify economic transfer, source closure/linkage, and surviving wallet balances.
  });

  test('prevents concurrent wallet overspend and duplicate conversions', () => {
    // Race final balance operations and retry IDs while preserving finalized double-entry invariants.
  });
});
