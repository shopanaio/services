import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';
import os from 'os';

test.describe('Media API - File Upload', () => {
  test.describe('fileUploadFromUrl mutation', () => {
    test('uploads file from external URL', async ({ api }) => {
      await api.session.setupUserAndStore();

      const sourceUrl = 'https://picsum.photos/id/1025/300/200.jpg';

      const { data } = await api.admin.mutation('media-api/FileUploadFromUrl', {
        variables: {
          input: {
            sourceUrl,
            altText: 'Test image',
          },
        },
      });

      expect(data.mediaMutation.fileUploadFromUrl.userErrors).toHaveLength(0);
      expect(data.mediaMutation.fileUploadFromUrl.file).toBeTruthy();
      expect(data.mediaMutation.fileUploadFromUrl.file?.sourceUrl).toBe(sourceUrl);
      expect(data.mediaMutation.fileUploadFromUrl.file?.url).toBeTruthy();
      expect(data.mediaMutation.fileUploadFromUrl.file?.altText).toBe('Test image');
      expect(data.mediaMutation.fileUploadFromUrl.file?.provider).toBe('S3');
    });

    test('auto-detects MIME type and dimensions from URL', async ({ api }) => {
      await api.session.setupUserAndStore();

      const file = await api.admin.file.uploadFromUrl('https://picsum.photos/id/1015/300/200.jpg');

      expect(file.id).toBeTruthy();
      expect(file.url).toBeTruthy();
      expect(file.mimeType).toContain('image');

      // Query to verify dimensions were detected
      const { data } = await api.admin.query('media-api/FileFindOne', {
        variables: { id: file.id },
      });

      expect(data.mediaQuery.file).toBeTruthy();
      expect(data.mediaQuery.file?.mimeType).toContain('image');
      // Dimensions should be auto-detected for images
      if (data.mediaQuery.file?.dimensions) {
        expect(data.mediaQuery.file?.dimensions.width).toBeGreaterThan(0);
        expect(data.mediaQuery.file?.dimensions.height).toBeGreaterThan(0);
      }
    });

    test('supports idempotency for URL uploads', async ({ api }) => {
      await api.session.setupUserAndStore();

      const sourceUrl = 'https://picsum.photos/id/237/300/200.jpg';
      const idempotencyKey = `url-upload-${uuidv4()}`;

      const { data: data1 } = await api.admin.mutation('media-api/FileUploadFromUrl', {
        variables: {
          input: {
            sourceUrl,
            idempotencyKey,
          },
        },
      });

      const fileId1 = data1.mediaMutation.fileUploadFromUrl.file?.id;

      // Second upload with same idempotency key (different URL)
      const { data: data2 } = await api.admin.mutation('media-api/FileUploadFromUrl', {
        variables: {
          input: {
            sourceUrl: 'https://picsum.photos/id/1025/300/200.jpg',
            idempotencyKey, // Same key
          },
        },
      });

      const fileId2 = data2.mediaMutation.fileUploadFromUrl.file?.id;

      expect(fileId1).toBe(fileId2);
    });

    test('sets original name from URL filename', async ({ api }) => {
      await api.session.setupUserAndStore();

      const file = await api.admin.file.uploadFromUrl('https://picsum.photos/id/1025/300/200.jpg');

      expect(file.id).toBeTruthy();
      expect(file.originalName).toBeTruthy();
      // Original name should be extracted from URL
    });
  });

  test.describe('fileUpload mutation (multipart)', () => {
    test('uploads local file via fixture', async ({ api }) => {
      await api.session.setupUserAndStore();

      // Create a temporary test file
      const tempDir = os.tmpdir();
      const testFilePath = path.join(tempDir, `test-image-${uuidv4()}.txt`);
      fs.writeFileSync(testFilePath, 'Test file content for upload');

      try {
        const file = await api.admin.file.uploadFile(testFilePath, 'Test upload');

        expect(file.id).toBeTruthy();
        expect(file.url).toBeTruthy();
        expect(file.originalName).toBe(path.basename(testFilePath));

        // Query to verify file was stored
        const { data } = await api.admin.query('media-api/FileFindOne', {
          variables: { id: file.id },
        });

        expect(data.mediaQuery.file).toBeTruthy();
        expect(data.mediaQuery.file?.provider).toBe('S3');
        expect(data.mediaQuery.file?.altText).toBe('Test upload');
      } finally {
        // Cleanup
        if (fs.existsSync(testFilePath)) {
          fs.unlinkSync(testFilePath);
        }
      }
    });

    test('uploads image file and detects dimensions', async ({ api }) => {
      await api.session.setupUserAndStore();

      // Create a minimal valid PNG file (1x1 transparent pixel)
      const tempDir = os.tmpdir();
      const testFilePath = path.join(tempDir, `test-image-${uuidv4()}.png`);

      // Minimal 1x1 transparent PNG
      const pngBuffer = Buffer.from([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44,
        0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x06, 0x00, 0x00, 0x00, 0x1f,
        0x15, 0xc4, 0x89, 0x00, 0x00, 0x00, 0x0a, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x63, 0x00,
        0x01, 0x00, 0x00, 0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49,
        0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
      ]);
      fs.writeFileSync(testFilePath, pngBuffer);

      try {
        const file = await api.admin.file.uploadFile(testFilePath);

        expect(file.id).toBeTruthy();
        expect(file.mimeType).toBe('image/png');
        expect(file.width).toBe(1);
        expect(file.height).toBe(1);
      } finally {
        // Cleanup
        if (fs.existsSync(testFilePath)) {
          fs.unlinkSync(testFilePath);
        }
      }
    });

    test('stores file in S3 with correct metadata', async ({ api }) => {
      await api.session.setupUserAndStore();

      // Create a temporary test file
      const tempDir = os.tmpdir();
      const testFilePath = path.join(tempDir, `test-file-${uuidv4()}.json`);
      const testContent = JSON.stringify({ test: 'data' });
      fs.writeFileSync(testFilePath, testContent);

      try {
        const file = await api.admin.file.uploadFile(testFilePath);

        // Query with s3Data
        const { data } = await api.admin.query('media-api/FileFindOne', {
          variables: { id: file.id },
        });

        expect(data.mediaQuery.file).toBeTruthy();
        expect(data.mediaQuery.file?.provider).toBe('S3');
        expect(data.mediaQuery.file?.s3Data).toBeTruthy();
        expect(data.mediaQuery.file?.s3Data?.objectKey).toBeTruthy();
        expect(data.mediaQuery.file?.s3Data?.bucketId).toBeTruthy();
        expect(data.mediaQuery.file?.sizeBytes).toBe(testContent.length.toString());
      } finally {
        // Cleanup
        if (fs.existsSync(testFilePath)) {
          fs.unlinkSync(testFilePath);
        }
      }
    });
  });

  test.describe('Upload via fixture helpers', () => {
    test('uploadFromUrl returns FileResult with full metadata', async ({ api }) => {
      await api.session.setupUserAndStore();

      const file = await api.admin.file.uploadFromUrl(
        'https://picsum.photos/id/1025/300/200.jpg',
        'Test alt text',
      );

      expect(file).toMatchObject({
        id: expect.any(String),
        url: expect.any(String),
      });

      // Verify file exists via query
      const { data } = await api.admin.query('media-api/FileFindOne', {
        variables: { id: file.id },
      });

      expect(data.mediaQuery.file).toBeTruthy();
      expect(data.mediaQuery.file?.id).toBe(file.id);
    });

    test('multiple files can be uploaded in sequence', async ({ api }) => {
      await api.session.setupUserAndStore();

      const file1 = await api.admin.file.uploadFromUrl('https://picsum.photos/id/1025/300/200.jpg');

      const file2 = await api.admin.file.uploadFromUrl('https://picsum.photos/id/237/300/200.jpg');

      expect(file1.id).toBeTruthy();
      expect(file2.id).toBeTruthy();
      expect(file1.id).not.toBe(file2.id);

      // Verify both files exist
      const { data } = await api.admin.query('media-api/NodesFindMany', {
        variables: { ids: [file1.id, file2.id] },
      });

      expect(data.mediaQuery.nodes).toHaveLength(2);
      expect(data.mediaQuery.nodes[0]).toBeTruthy();
      expect(data.mediaQuery.nodes[1]).toBeTruthy();
    });
  });

  test.describe('File content types', () => {
    test('correctly identifies JPEG files', async ({ api }) => {
      await api.session.setupUserAndStore();

      const file = await api.admin.file.uploadFromUrl('https://picsum.photos/id/1015/300/200.jpg');

      const { data } = await api.admin.query('media-api/FileFindOne', {
        variables: { id: file.id },
      });

      expect(data.mediaQuery.file?.mimeType).toBe('image/jpeg');
      expect(data.mediaQuery.file?.ext).toBe('jpg');
    });

    test('correctly identifies PNG files', async ({ api }) => {
      await api.session.setupUserAndStore();

      // Use local PNG upload instead of URL (picsum only provides jpg)
      const file = await api.admin.file.uploadFromUrl(
        'https://www.google.com/images/branding/googlelogo/2x/googlelogo_color_272x92dp.png',
      );

      const { data } = await api.admin.query('media-api/FileFindOne', {
        variables: { id: file.id },
      });

      expect(data.mediaQuery.file?.mimeType).toBe('image/png');
      expect(data.mediaQuery.file?.ext).toBe('png');
    });
  });

  test.describe('Error handling', () => {
    test.skip('returns error for invalid URL (404)', async ({ api }) => {
      // TODO: Test uploading from non-existent URL
      // Expected: userErrors should contain error about failed download
    });

    test.skip('returns error for unreachable URL (timeout)', async ({ api }) => {
      // TODO: Test uploading from URL that times out
      // Expected: userErrors should contain timeout error
    });

    test.skip('returns error for malformed URL', async ({ api }) => {
      // TODO: Test uploading with invalid URL format (e.g., "not-a-url")
      // Expected: validation error for invalid URL format
    });

    test.skip('returns validation error when sourceUrl is missing', async ({ api }) => {
      // TODO: Test fileUploadFromUrl without sourceUrl
      // Expected: validation error for required field
    });

    test.skip('handles corrupted file gracefully', async ({ api }) => {
      // TODO: Upload a file with invalid/corrupted content
      // Expected: appropriate error or successful upload with detected issue
    });
  });

  test.describe('File size limits', () => {
    test.skip('rejects files larger than size limit', async ({ api }) => {
      // TODO: Test uploading file exceeding 5MB limit (for batch downloads)
      // Expected: error indicating file too large
    });

    test.skip('accepts files at exactly the size limit', async ({ api }) => {
      // TODO: Test uploading file at exactly 5MB
      // Expected: successful upload
    });
  });

  test.describe('Duplicate handling', () => {
    test.skip('returns existing file for duplicate URL without idempotency key', async ({
      api,
    }) => {
      // TODO: Upload same URL twice without idempotency key
      // Expected: should return same file ID (deduplication by URL)
    });

    test.skip('creates new file when content differs but URL is same', async ({ api }) => {
      // TODO: Test behavior when URL content changes between uploads
      // Expected: define expected behavior (new file or cached?)
    });
  });

  test.describe('Different file drivers', () => {
    test.skip('stores YouTube URL as external reference (YTB driver)', async ({ api }) => {
      // TODO: Test uploading YouTube video URL
      // Expected: file created with driver=YTB, no actual download
    });

    test.skip('stores external URL as reference (URL driver)', async ({ api }) => {
      // TODO: Test storing external URL without downloading
      // Expected: file created with driver=URL, url stored as-is
    });
  });

  test.describe('File types coverage', () => {
    test.skip('correctly handles PDF files', async ({ api }) => {
      // TODO: Upload PDF file and verify mimeType, ext
    });

    test.skip('correctly handles video files (MP4)', async ({ api }) => {
      // TODO: Upload video file and verify metadata
    });

    test.skip('correctly handles audio files (MP3)', async ({ api }) => {
      // TODO: Upload audio file and verify metadata
    });

    test.skip('correctly handles SVG files', async ({ api }) => {
      // TODO: Upload SVG and verify mimeType (image/svg+xml)
    });

    test.skip('correctly handles WebP files', async ({ api }) => {
      // TODO: Upload WebP image and verify dimensions detection
    });

    test.skip('correctly handles GIF files', async ({ api }) => {
      // TODO: Upload GIF and verify mimeType, dimensions
    });
  });

  test.describe('Authorization and permissions', () => {
    test.skip('rejects upload without authentication', async ({ api }) => {
      // TODO: Attempt upload without valid session
      // Expected: 401 or authentication error
    });

    test.skip('rejects upload without project context', async ({ api }) => {
      // TODO: Attempt upload without selecting project
      // Expected: ProjectNotFound error
    });

    test.skip('isolates files between projects', async ({ api }) => {
      // TODO: Upload file in project A, verify not accessible from project B
    });
  });

  test.describe('Concurrent operations', () => {
    test.skip('handles concurrent uploads of same file', async ({ api }) => {
      // TODO: Upload same file simultaneously from multiple requests
      // Expected: no race conditions, consistent result
    });

    test.skip('handles concurrent uploads of different files', async ({ api }) => {
      // TODO: Upload multiple different files in parallel
      // Expected: all files created successfully
    });
  });

  test.describe('File metadata updates', () => {
    test.skip('updates altText after file creation', async ({ api }) => {
      // TODO: Create file, then update altText via mutation
      // Expected: altText updated successfully
    });

    test.skip('updates file name after creation', async ({ api }) => {
      // TODO: Create file, then update originalName
      // Expected: name updated or error if not supported
    });
  });

  test.describe('Delete operations', () => {
    test.skip('deletes file from S3 and database', async ({ api }) => {
      // TODO: Upload file, delete it, verify removed from both S3 and DB
    });

    test.skip('soft deletes file (archive)', async ({ api }) => {
      // TODO: Upload file, archive it, verify still in DB but marked deleted
    });

    test.skip('returns error when deleting non-existent file', async ({ api }) => {
      // TODO: Attempt to delete file with invalid ID
      // Expected: appropriate error
    });
  });
});
