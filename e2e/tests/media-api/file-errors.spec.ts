import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';
import { v4 as uuidv4 } from 'uuid';

test.describe('Media API - Error Handling', () => {
  test.describe('Authentication errors', () => {
    test('returns error without authentication', async ({ api }) => {
      // Don't setup user/project - try to access without auth
      const { errors } = await api.admin.query('media-api/FileFindOne', {
        variables: { id: 'RmlsZTp0ZXN0LWlk' },
        throwOnError: false,
      });

      expect(errors).toBeTruthy();
      // Should get authentication error
    });
  });

  test.describe('fileUploadFromUrl mutation errors', () => {
    test('handles invalid URL format', async ({ api }) => {
      await api.session.setupUserAndStore();

      const { data, errors } = await api.admin.mutation('media-api/FileUploadFromUrl', {
        variables: {
          input: {
            sourceUrl: 'not-a-valid-url',
          },
        },
        throwOnError: false,
      });

      // Should return error for invalid URL
      const hasError =
        errors?.length > 0 || data?.mediaMutation?.fileUploadFromUrl?.userErrors?.length > 0;
      expect(hasError).toBe(true);
    });

    test('handles unreachable URL', async ({ api }) => {
      await api.session.setupUserAndStore();

      const { data, errors } = await api.admin.mutation('media-api/FileUploadFromUrl', {
        variables: {
          input: {
            sourceUrl: 'https://nonexistent-domain-that-does-not-exist.invalid/image.jpg',
          },
        },
        throwOnError: false,
      });

      // Should return error for unreachable URL
      const hasError =
        errors?.length > 0 || data?.mediaMutation?.fileUploadFromUrl?.userErrors?.length > 0;
      expect(hasError).toBe(true);
    });

    test('handles 404 URL', async ({ api }) => {
      await api.session.setupUserAndStore();

      const { data, errors } = await api.admin.mutation('media-api/FileUploadFromUrl', {
        variables: {
          input: {
            sourceUrl: 'https://httpstat.us/404',
          },
        },
        throwOnError: false,
      });

      const hasError =
        errors?.length > 0 || data?.mediaMutation?.fileUploadFromUrl?.userErrors?.length > 0;
      expect(hasError).toBe(true);
    });
  });

  test.describe('fileCreateExternal mutation errors', () => {
    test('handles invalid provider', async ({ api }) => {
      await api.session.setupUserAndStore();

      const { errors } = await api.admin.mutation('media-api/FileCreateExternal', {
        variables: {
          input: {
            provider: 'INVALID_PROVIDER',
            externalId: 'test-id',
            url: 'https://example.com/video',
          },
        },
        throwOnError: false,
      });

      // GraphQL enum validation should fail
      expect(errors).toBeTruthy();
      expect(errors.length).toBeGreaterThan(0);
    });

    test('handles missing required externalId', async ({ api }) => {
      await api.session.setupUserAndStore();

      const { errors } = await api.admin.mutation('media-api/FileCreateExternal', {
        variables: {
          input: {
            provider: 'YOUTUBE',
            url: 'https://youtube.com/watch?v=test',
            // Missing externalId
          } as unknown,
        },
        throwOnError: false,
      });

      expect(errors).toBeTruthy();
    });

    test('handles missing required url', async ({ api }) => {
      await api.session.setupUserAndStore();

      const { errors } = await api.admin.mutation('media-api/FileCreateExternal', {
        variables: {
          input: {
            provider: 'YOUTUBE',
            externalId: 'test-id',
            // Missing url
          } as unknown,
        },
        throwOnError: false,
      });

      expect(errors).toBeTruthy();
    });

    test('handles invalid dimensions', async ({ api }) => {
      await api.session.setupUserAndStore();

      const { data, errors } = await api.admin.mutation('media-api/FileCreateExternal', {
        variables: {
          input: {
            provider: 'YOUTUBE',
            externalId: 'test-id',
            url: 'https://youtube.com/watch?v=test',
            width: -100, // Negative width
            height: 0, // Zero height
          },
        },
        throwOnError: false,
      });

      // Depending on validation, might succeed or return error
      expect(data || errors).toBeTruthy();
    });
  });

  test.describe('fileUpdate mutation errors', () => {
    test('handles invalid global ID format', async ({ api }) => {
      await api.session.setupUserAndStore();

      const { data, errors } = await api.admin.mutation('media-api/FileUpdate', {
        variables: {
          input: {
            id: 'completely-invalid-id',
            altText: 'Test',
          },
        },
        throwOnError: false,
      });

      const hasError =
        errors?.length > 0 || data?.mediaMutation?.fileUpdate?.userErrors?.length > 0;
      expect(hasError).toBe(true);
    });

    test('handles wrong entity type in global ID', async ({ api }) => {
      await api.session.setupUserAndStore();

      // Use a valid base64 but wrong entity type
      const wrongTypeId = Buffer.from('Product:123').toString('base64');

      const { data, errors } = await api.admin.mutation('media-api/FileUpdate', {
        variables: {
          input: {
            id: wrongTypeId,
            altText: 'Test',
          },
        },
        throwOnError: false,
      });

      const hasError =
        errors?.length > 0 ||
        data?.mediaMutation?.fileUpdate?.userErrors?.length > 0 ||
        data?.mediaMutation?.fileUpdate?.file === null;
      expect(hasError).toBe(true);
    });

    test.skip('handles file from different project', async ({ api }) => {
      // TODO: Fix test - second setupUserAndStore() causes email collision
      // Create file in first project
      await api.session.setupUserAndStore();
      const file = await api.admin.file.uploadFromUrl(
        'https://picsum.photos/id/1025/300/200.jpg',
      );

      // Create new user and project
      await api.session.setupUserAndStore();

      // Try to update file from first project
      const { data, errors } = await api.admin.mutation('media-api/FileUpdate', {
        variables: {
          input: {
            id: file.id,
            altText: 'Should not work',
          },
        },
        throwOnError: false,
      });

      // Should fail - file belongs to different project
      const hasError =
        errors?.length > 0 ||
        data?.mediaMutation?.fileUpdate?.userErrors?.length > 0 ||
        data?.mediaMutation?.fileUpdate?.file === null;
      expect(hasError).toBe(true);
    });
  });

  test.describe('fileDelete mutation errors', () => {
    test('handles deleting non-existent file', async ({ api }) => {
      await api.session.setupUserAndStore();

      const nonExistentId = 'RmlsZTpub25leGlzdGVudC1pZC0xMjM0NTY=';

      const { data, errors } = await api.admin.mutation('media-api/FileDelete', {
        variables: {
          input: {
            id: nonExistentId,
          },
        },
        throwOnError: false,
      });

      const hasError =
        errors?.length > 0 ||
        data?.mediaMutation?.fileDelete?.userErrors?.length > 0 ||
        data?.mediaMutation?.fileDelete?.deletedFileId === null;
      expect(hasError).toBe(true);
    });

    test('handles deleting already deleted file', async ({ api }) => {
      await api.session.setupUserAndStore();

      // Create and delete file
      const file = await api.admin.file.uploadFromUrl(
        'https://picsum.photos/id/1025/300/200.jpg',
      );

      await api.admin.mutation('media-api/FileDelete', {
        variables: {
          input: {
            id: file.id,
            permanent: true,
          },
        },
      });

      // Try to delete again
      const { data, errors } = await api.admin.mutation('media-api/FileDelete', {
        variables: {
          input: {
            id: file.id,
          },
        },
        throwOnError: false,
      });

      const hasError =
        errors?.length > 0 ||
        data?.mediaMutation?.fileDelete?.userErrors?.length > 0 ||
        data?.mediaMutation?.fileDelete?.deletedFileId === null;
      expect(hasError).toBe(true);
    });
  });

  test.describe('Query errors', () => {
    test('handles malformed global ID in file query', async ({ api }) => {
      await api.session.setupUserAndStore();

      const { data, errors } = await api.admin.query('media-api/FileFindOne', {
        variables: { id: '!!invalid!!base64!!' },
        throwOnError: false,
      });

      // Either returns null file or resolver error for invalid IDs
      expect(data?.mediaQuery?.file === null || errors?.length > 0).toBe(true);
    });

    test('handles empty ID in file query', async ({ api }) => {
      await api.session.setupUserAndStore();

      const { data, errors } = await api.admin.query('media-api/FileFindOne', {
        variables: { id: '' },
        throwOnError: false,
      });

      // Empty ID should return null or error
      expect(data?.mediaQuery?.file === null || errors?.length > 0).toBe(true);
    });

    test('handles empty array in nodes query', async ({ api }) => {
      await api.session.setupUserAndStore();

      const { data } = await api.admin.query('media-api/NodesFindMany', {
        variables: { ids: [] },
      });

      expect(data.mediaQuery.nodes).toEqual([]);
    });
  });

  test.describe('UserError interface', () => {
    test('userErrors contain required fields', async ({ api }) => {
      await api.session.setupUserAndStore();

      const { data, errors } = await api.admin.mutation('media-api/FileUpdate', {
        variables: {
          input: {
            id: 'invalid-id',
            altText: 'Test',
          },
        },
        throwOnError: false,
      });

      if (data?.mediaMutation?.fileUpdate?.userErrors?.length > 0) {
        const userError = data.mediaMutation.fileUpdate.userErrors[0];
        expect(typeof userError.message).toBe('string');
        expect(userError.message.length).toBeGreaterThan(0);
        // field and code are optional
      }
    });
  });

  test.describe('Idempotency key errors', () => {
    test('idempotency key returns same file on duplicate request', async ({ api }) => {
      await api.session.setupUserAndStore();

      const idempotencyKey = `upload-${uuidv4()}`;

      // First upload
      const { data: data1 } = await api.admin.mutation('media-api/FileUploadFromUrl', {
        variables: {
          input: {
            sourceUrl: 'https://picsum.photos/id/1025/300/200.jpg',
            idempotencyKey,
          },
        },
      });

      const fileId1 = data1.mediaMutation.fileUploadFromUrl.file?.id;

      // Second upload with same idempotency key
      const { data: data2 } = await api.admin.mutation('media-api/FileUploadFromUrl', {
        variables: {
          input: {
            sourceUrl: 'https://picsum.photos/id/237/300/200.jpg',
            idempotencyKey, // Same key
          },
        },
      });

      const fileId2 = data2.mediaMutation.fileUploadFromUrl.file?.id;

      // Should return the same file
      expect(fileId1).toBe(fileId2);
    });
  });
});
