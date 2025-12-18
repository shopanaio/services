import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';

test.describe('Media API - File Query', () => {
  test.describe('file resolver', () => {
    test('returns file by ID after uploading from URL', async ({ api }) => {
      await api.session.setupUserAndProject();

      // Upload a file from URL using the fixture
      const file = await api.admin.file.uploadFromUrl(
        'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a7/Camponotus_flavomarginatus_ant.jpg/320px-Camponotus_flavomarginatus_ant.jpg',
      );

      const { data } = await api.admin.query('media/FileFindOne', {
        variables: { id: file.id },
      });

      expect(data).toBeTruthy();
      expect(data.mediaQuery).toBeTruthy();
      expect(data.mediaQuery.file).toBeTruthy();
      expect(data.mediaQuery.file.id).toBe(file.id);
      expect(data.mediaQuery.file.provider).toBe('S3');
      expect(data.mediaQuery.file.url).toBeTruthy();
      expect(typeof data.mediaQuery.file.isProcessed).toBe('boolean');
    });

    test('returns null for non-existent file', async ({ api }) => {
      await api.session.setupUserAndProject();

      const { data, errors } = await api.admin.query('media/FileFindOne', {
        variables: { id: 'RmlsZTpub25leGlzdGVudC1pZA==' }, // Base64 encoded "File:nonexistent-id"
        throwOnError: false,
      });

      expect(errors).toBeFalsy();
      expect(data.mediaQuery.file).toBeNull();
    });

    test('returns file with dimensions when available', async ({ api }) => {
      await api.session.setupUserAndProject();

      // Upload an image file (should have dimensions detected)
      const file = await api.admin.file.uploadFromUrl(
        'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6d/Good_Food_Display_-_NCI_Visuals_Online.jpg/320px-Good_Food_Display_-_NCI_Visuals_Online.jpg',
      );

      const { data } = await api.admin.query('media/FileFindOne', {
        variables: { id: file.id },
      });

      expect(data.mediaQuery.file).toBeTruthy();
      expect(data.mediaQuery.file.mimeType).toContain('image');
      // Dimensions should be auto-detected for images
      if (file.width && file.height) {
        expect(data.mediaQuery.file.dimensions).toEqual({
          width: file.width,
          height: file.height,
        });
      }
    });
  });

  test.describe('node resolver (Relay interface)', () => {
    test('returns file via node query', async ({ api }) => {
      await api.session.setupUserAndProject();

      const file = await api.admin.file.uploadFromUrl(
        'https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/PNG_transparency_demonstration_1.png/280px-PNG_transparency_demonstration_1.png',
      );

      const { data } = await api.admin.query('media/NodeFindOne', {
        variables: { id: file.id },
      });

      expect(data.mediaQuery.node).toBeTruthy();
      expect(data.mediaQuery.node.id).toBe(file.id);
      expect(data.mediaQuery.node.provider).toBeTruthy();
    });

    test('returns null for invalid global ID', async ({ api }) => {
      await api.session.setupUserAndProject();

      const { data, errors } = await api.admin.query('media/NodeFindOne', {
        variables: { id: 'invalid-global-id' },
        throwOnError: false,
      });

      expect(errors).toBeFalsy();
      expect(data.mediaQuery.node).toBeNull();
    });
  });

  test.describe('nodes resolver (batch)', () => {
    test('returns multiple files by IDs', async ({ api }) => {
      await api.session.setupUserAndProject();

      // Upload multiple files
      const file1 = await api.admin.file.uploadFromUrl(
        'https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/PNG_transparency_demonstration_1.png/280px-PNG_transparency_demonstration_1.png',
      );
      const file2 = await api.admin.file.uploadFromUrl(
        'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6d/Good_Food_Display_-_NCI_Visuals_Online.jpg/320px-Good_Food_Display_-_NCI_Visuals_Online.jpg',
      );

      const { data } = await api.admin.query('media/NodesFindMany', {
        variables: { ids: [file1.id, file2.id] },
      });

      expect(data.mediaQuery.nodes).toHaveLength(2);
      expect(data.mediaQuery.nodes[0].id).toBe(file1.id);
      expect(data.mediaQuery.nodes[1].id).toBe(file2.id);
    });

    test('preserves order and returns null for missing IDs', async ({ api }) => {
      await api.session.setupUserAndProject();

      const file = await api.admin.file.uploadFromUrl(
        'https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/PNG_transparency_demonstration_1.png/280px-PNG_transparency_demonstration_1.png',
      );
      const nonExistentId = 'RmlsZTpub25leGlzdGVudC1pZA==';

      const { data } = await api.admin.query('media/NodesFindMany', {
        variables: { ids: [nonExistentId, file.id] },
      });

      expect(data.mediaQuery.nodes).toHaveLength(2);
      expect(data.mediaQuery.nodes[0]).toBeNull();
      expect(data.mediaQuery.nodes[1].id).toBe(file.id);
    });
  });
});
