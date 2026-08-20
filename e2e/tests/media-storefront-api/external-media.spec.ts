import { test } from '@fixtures/base.extend';

test('presents supported YouTube and Vimeo media with canonical host and origin URL', () => {
  // Verify provider detection and normalized origin identity.
});

test('returns a safe embed URL only when the external source supplied one', () => {
  // Verify arbitrary HTML and unsupported embed schemes are never exposed.
});

test('presents an analyzed external preview through the Image contract', () => {
  // Verify preview dimensions, URL transformation, and alt metadata are usable storefront-side.
});

test('does not resolve blocked private redirecting or unsupported external sources', () => {
  // Verify SSRF and URL-fetch policy failures never publish a Storefront media entity.
});

test('keeps an existing external media record stable when its provider is unavailable', () => {
  // Verify storefront reads use persisted safe metadata and do not fetch the origin synchronously.
});
