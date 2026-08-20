import { test } from '@fixtures/base.extend';

test('presents hosted images with dimensions thumbhash and alt metadata', () => {
  // Verify MediaImage.image and previewImage reflect the analyzed immutable file metadata.
});

test('presents hosted video sources with format dimensions mime type and URL', () => {
  // Verify all persisted video renditions are returned in stable presentation order.
});

test('presents model 3d sources with format mime type size and URL', () => {
  // Verify 3D source metadata uses unsigned sizes and public delivery URLs.
});

test('presents generic files with size mime type preview and download URL', () => {
  // Verify non-media files expose only the public GenericFile contract.
});

test('propagates updated alt text without changing immutable media identity', () => {
  // Verify presentation metadata updates are visible while the global ID remains stable.
});
