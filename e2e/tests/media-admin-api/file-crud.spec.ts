import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';

test.describe('Media API - File CRUD Operations', () => {
  test.describe('fileUpdate mutation', () => {
    test('updates file altText', async ({ api }) => {
      await api.session.setupUserAndStore();

      // Create a file using the fixture
      const file = await api.admin.file.uploadFromUrl(
        'https://picsum.photos/id/1025/300/200.jpg',
      );

      // Update altText
      const { data } = await api.admin.mutation('media-api/FileUpdate', {
        variables: {
          input: {
            id: file.id,
            altText: 'Updated alt text description',
          },
        },
      });

      expect(data.mediaMutation.fileUpdate.userErrors).toHaveLength(0);
      expect(data.mediaMutation.fileUpdate.file).toBeTruthy();
      expect(data.mediaMutation.fileUpdate.file?.id).toBe(file.id);
      expect(data.mediaMutation.fileUpdate.file?.altText).toBe('Updated alt text description');
    });

    test('updates file originalName', async ({ api }) => {
      await api.session.setupUserAndStore();

      const file = await api.admin.file.uploadFromUrl(
        'https://picsum.photos/id/237/300/200.jpg',
      );

      const { data } = await api.admin.mutation('media-api/FileUpdate', {
        variables: {
          input: {
            id: file.id,
            originalName: 'new-filename.jpg',
          },
        },
      });

      expect(data.mediaMutation.fileUpdate.userErrors).toHaveLength(0);
      expect(data.mediaMutation.fileUpdate.file?.originalName).toBe('new-filename.jpg');
    });

    test('updates file meta (JSON)', async ({ api }) => {
      await api.session.setupUserAndStore();

      const file = await api.admin.file.uploadFromUrl(
        'https://picsum.photos/id/1025/300/200.jpg',
      );

      const customMeta = {
        tags: ['nature', 'food'],
        category: 'product-images',
        priority: 1,
      };

      const { data } = await api.admin.mutation('media-api/FileUpdate', {
        variables: {
          input: {
            id: file.id,
            meta: customMeta,
          },
        },
      });

      expect(data.mediaMutation.fileUpdate.userErrors).toHaveLength(0);
      expect(data.mediaMutation.fileUpdate.file?.meta).toEqual(customMeta);
    });

    test('updates multiple fields at once', async ({ api }) => {
      await api.session.setupUserAndStore();

      const file = await api.admin.file.uploadFromUrl(
        'https://picsum.photos/id/1015/300/200.jpg',
      );

      const { data } = await api.admin.mutation('media-api/FileUpdate', {
        variables: {
          input: {
            id: file.id,
            altText: 'Ant photograph',
            originalName: 'ant-photo.jpg',
            meta: { photographer: 'Wiki Commons' },
          },
        },
      });

      expect(data.mediaMutation.fileUpdate.userErrors).toHaveLength(0);
      expect(data.mediaMutation.fileUpdate.file?.altText).toBe('Ant photograph');
      expect(data.mediaMutation.fileUpdate.file?.originalName).toBe('ant-photo.jpg');
      expect(data.mediaMutation.fileUpdate.file?.meta).toEqual({ photographer: 'Wiki Commons' });
    });

    test('returns error for invalid file ID', async ({ api }) => {
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

      // Depending on implementation, either userErrors or GraphQL errors
      const hasError =
        data?.mediaMutation?.fileUpdate?.userErrors?.length > 0 || (errors && errors.length > 0);
      expect(hasError).toBe(true);
    });

    test('returns error for non-existent file', async ({ api }) => {
      await api.session.setupUserAndStore();

      const { data, errors } = await api.admin.mutation('media-api/FileUpdate', {
        variables: {
          input: {
            id: 'RmlsZTpub25leGlzdGVudC1pZA==', // Valid format but non-existent
            altText: 'Test',
          },
        },
        throwOnError: false,
      });

      // Should return error or null file
      const hasError =
        data?.mediaMutation?.fileUpdate?.userErrors?.length > 0 ||
        data?.mediaMutation?.fileUpdate?.file === null ||
        (errors && errors.length > 0);
      expect(hasError).toBe(true);
    });
  });

  test.describe('fileDelete mutation', () => {
    test('soft deletes file (default behavior)', async ({ api }) => {
      await api.session.setupUserAndStore();

      const file = await api.admin.file.uploadFromUrl(
        'https://picsum.photos/id/1025/300/200.jpg',
      );

      // Verify file exists
      const { data: beforeDelete } = await api.admin.query('media-api/FileFindOne', {
        variables: { id: file.id },
      });
      expect(beforeDelete.mediaQuery.file).toBeTruthy();
      expect(beforeDelete.mediaQuery.file?.deletedAt).toBeNull();

      // Delete file
      const { data } = await api.admin.mutation('media-api/FileDelete', {
        variables: {
          input: {
            id: file.id,
          },
        },
      });

      expect(data.mediaMutation.fileDelete.userErrors).toHaveLength(0);
      expect(data.mediaMutation.fileDelete.deletedFileId).toBe(file.id);
    });

    test('permanently deletes file when permanent=true', async ({ api }) => {
      await api.session.setupUserAndStore();

      const file = await api.admin.file.uploadFromUrl(
        'https://picsum.photos/id/237/300/200.jpg',
      );

      // Delete file permanently
      const { data } = await api.admin.mutation('media-api/FileDelete', {
        variables: {
          input: {
            id: file.id,
            permanent: true,
          },
        },
      });

      expect(data.mediaMutation.fileDelete.userErrors).toHaveLength(0);
      expect(data.mediaMutation.fileDelete.deletedFileId).toBe(file.id);

      // Verify file no longer exists
      const { data: afterDelete, errors } = await api.admin.query('media-api/FileFindOne', {
        variables: { id: file.id },
        throwOnError: false,
      });
      // After permanent delete, either file is null or an error is returned
      expect(afterDelete?.mediaQuery?.file === null || errors?.length > 0).toBe(true);
    });

    test('returns error for invalid file ID', async ({ api }) => {
      await api.session.setupUserAndStore();

      const { data, errors } = await api.admin.mutation('media-api/FileDelete', {
        variables: {
          input: {
            id: 'invalid-id',
          },
        },
        throwOnError: false,
      });

      const hasError =
        data?.mediaMutation?.fileDelete?.userErrors?.length > 0 || (errors && errors.length > 0);
      expect(hasError).toBe(true);
    });

    test('returns error for non-existent file', async ({ api }) => {
      await api.session.setupUserAndStore();

      const { data, errors } = await api.admin.mutation('media-api/FileDelete', {
        variables: {
          input: {
            id: 'RmlsZTpub25leGlzdGVudC1pZA==',
          },
        },
        throwOnError: false,
      });

      const hasError =
        data?.mediaMutation?.fileDelete?.userErrors?.length > 0 ||
        data?.mediaMutation?.fileDelete?.deletedFileId === null ||
        (errors && errors.length > 0);
      expect(hasError).toBe(true);
    });
  });

  test.describe('File lifecycle', () => {
    test('create -> update -> delete workflow', async ({ api }) => {
      await api.session.setupUserAndStore();

      // Create
      const file = await api.admin.file.uploadFromUrl(
        'https://picsum.photos/id/1015/300/200.jpg',
      );

      // Read
      const { data: readData } = await api.admin.query('media-api/FileFindOne', {
        variables: { id: file.id },
      });
      expect(readData.mediaQuery.file).toBeTruthy();
      expect(readData.mediaQuery.file?.altText).toBeNull();

      // Update
      const { data: updateData } = await api.admin.mutation('media-api/FileUpdate', {
        variables: {
          input: {
            id: file.id,
            altText: 'Ant macro photo',
          },
        },
      });
      expect(updateData.mediaMutation.fileUpdate.file?.altText).toBe('Ant macro photo');

      // Verify update persisted
      const { data: verifyData } = await api.admin.query('media-api/FileFindOne', {
        variables: { id: file.id },
      });
      expect(verifyData.mediaQuery.file?.altText).toBe('Ant macro photo');

      // Delete (permanently)
      const { data: deleteData } = await api.admin.mutation('media-api/FileDelete', {
        variables: {
          input: {
            id: file.id,
            permanent: true,
          },
        },
      });
      expect(deleteData.mediaMutation.fileDelete.deletedFileId).toBe(file.id);

      // Verify deleted
      const { data: afterDelete, errors } = await api.admin.query('media-api/FileFindOne', {
        variables: { id: file.id },
        throwOnError: false,
      });
      // After permanent delete, either file is null or an error is returned
      expect(afterDelete?.mediaQuery?.file === null || errors?.length > 0).toBe(true);
    });
  });
});
