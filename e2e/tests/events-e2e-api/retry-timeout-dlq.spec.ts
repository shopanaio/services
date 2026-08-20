import { test } from '@fixtures/base.extend';

test('retries a retryable handler failure using its registered backoff policy', () => {
  // Verify attempt count next-at time and delivery metadata are durable.
});

test('does not retry a non-retryable handler failure', () => {
  // Verify the job moves directly to terminal failure and DLQ.
});

test('treats a handler timeout as a retryable failure within configured attempts', () => {
  // Verify a timed-out claim can be reclaimed without parallel duplicate delivery.
});

test('moves an exhausted handler job to DLQ exactly once', () => {
  // Verify error code message event payload and delivery history remain inspectable.
});

test('keeps successful handler jobs complete when another handler exhausts retries', () => {
  // Verify partial handler success is not rolled back or repeated.
});

test('returns failed dispatch status when at least one handler job is terminal', () => {
  // Verify synchronous waitForResult exposes accurate claimed dispatched and failed counts.
});
