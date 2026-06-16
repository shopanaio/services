import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';
import { v4 as uuidv4 } from 'uuid';

test.describe('Media API - External Media', () => {
  test.describe('YouTube videos', () => {
    test('creates YouTube video file via fixture', async ({ api }) => {
      await api.session.setupUserAndStore();

      const file = await api.admin.file.createYouTubeVideo('dQw4w9WgXcQ', {
        title: 'Never Gonna Give You Up',
        altText: 'Rick Astley music video',
      });

      expect(file.id).toBeTruthy();
      expect(file.url).toContain('youtube');

      // Query to verify
      const { data } = await api.admin.query('media-api/FileFindOne', {
        variables: { id: file.id },
      });

      expect(data.mediaQuery.file).toBeTruthy();
      expect(data.mediaQuery.file?.provider).toBe('YOUTUBE');
      expect(data.mediaQuery.file?.externalData?.externalId).toBe('dQw4w9WgXcQ');
    });

    test('creates YouTube video with full metadata via mutation', async ({ api }) => {
      await api.session.setupUserAndStore();

      const { data } = await api.admin.mutation('media-api/FileCreateExternal', {
        variables: {
          input: {
            provider: 'YOUTUBE',
            externalId: 'dQw4w9WgXcQ',
            url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            thumbnailUrl: 'https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg',
            originalName: 'Never Gonna Give You Up',
            width: 1920,
            height: 1080,
            durationMs: 212000,
            altText: 'Rick Astley music video',
          },
        },
      });

      expect(data.mediaMutation.fileCreateExternal.userErrors).toHaveLength(0);
      expect(data.mediaMutation.fileCreateExternal.file).toBeTruthy();
      expect(data.mediaMutation.fileCreateExternal.file?.provider).toBe('YOUTUBE');
      expect(data.mediaMutation.fileCreateExternal.file?.url).toContain('youtube');
      expect(data.mediaMutation.fileCreateExternal.file?.originalName).toBe('Never Gonna Give You Up');
      expect(data.mediaMutation.fileCreateExternal.file?.dimensions).toEqual({ width: 1920, height: 1080 });
      expect(data.mediaMutation.fileCreateExternal.file?.durationMs).toBe(212000);
      expect(data.mediaMutation.fileCreateExternal.file?.altText).toBe('Rick Astley music video');
      expect(data.mediaMutation.fileCreateExternal.file?.externalData).toBeTruthy();
      expect(data.mediaMutation.fileCreateExternal.file?.externalData?.externalId).toBe('dQw4w9WgXcQ');
    });

    test('creates YouTube video with provider metadata', async ({ api }) => {
      await api.session.setupUserAndStore();

      const providerMeta = {
        channelId: 'UCrDkAvwZum-UTjHmzDI2iIw',
        channelTitle: 'Psy Official',
        viewCount: 4500000000,
        likeCount: 20000000,
      };

      const { data } = await api.admin.mutation('media-api/FileCreateExternal', {
        variables: {
          input: {
            provider: 'YOUTUBE',
            externalId: '9bZkp7q19f0',
            url: 'https://www.youtube.com/watch?v=9bZkp7q19f0',
            thumbnailUrl: 'https://img.youtube.com/vi/9bZkp7q19f0/maxresdefault.jpg',
            originalName: 'Gangnam Style',
            providerMeta,
          },
        },
      });

      expect(data.mediaMutation.fileCreateExternal.file).toBeTruthy();
      // providerMeta may include additional fields like thumbnailUrl depending on server behavior
      expect(data.mediaMutation.fileCreateExternal.file?.externalData?.providerMeta).toMatchObject(providerMeta);
    });

    test('supports idempotency for YouTube videos', async ({ api }) => {
      await api.session.setupUserAndStore();

      const idempotencyKey = `youtube-${uuidv4()}`;

      const { data: data1 } = await api.admin.mutation('media-api/FileCreateExternal', {
        variables: {
          input: {
            provider: 'YOUTUBE',
            externalId: 'L_jWHffIx5E',
            url: 'https://www.youtube.com/watch?v=L_jWHffIx5E',
            originalName: 'Smash Mouth - All Star',
            idempotencyKey,
          },
        },
      });

      const fileId1 = data1.mediaMutation.fileCreateExternal.file?.id;

      // Second creation with same idempotency key
      const { data: data2 } = await api.admin.mutation('media-api/FileCreateExternal', {
        variables: {
          input: {
            provider: 'YOUTUBE',
            externalId: 'different-video-id',
            url: 'https://www.youtube.com/watch?v=different',
            originalName: 'Different Video',
            idempotencyKey, // Same key
          },
        },
      });

      const fileId2 = data2.mediaMutation.fileCreateExternal.file?.id;

      expect(fileId1).toBe(fileId2);
    });
  });

  test.describe('Vimeo videos', () => {
    test('creates Vimeo video file via fixture', async ({ api }) => {
      await api.session.setupUserAndStore();

      const file = await api.admin.file.createVimeoVideo('76979871', {
        title: 'The Mountain',
        altText: 'Timelapse of night sky and mountains',
      });

      expect(file.id).toBeTruthy();
      expect(file.url).toContain('vimeo');

      // Query to verify
      const { data } = await api.admin.query('media-api/FileFindOne', {
        variables: { id: file.id },
      });

      expect(data.mediaQuery.file).toBeTruthy();
      expect(data.mediaQuery.file?.provider).toBe('VIMEO');
      expect(data.mediaQuery.file?.externalData?.externalId).toBe('76979871');
    });

    test('creates Vimeo video with full metadata via mutation', async ({ api }) => {
      await api.session.setupUserAndStore();

      const { data } = await api.admin.mutation('media-api/FileCreateExternal', {
        variables: {
          input: {
            provider: 'VIMEO',
            externalId: '76979871',
            url: 'https://vimeo.com/76979871',
            thumbnailUrl: 'https://i.vimeocdn.com/video/452001751_640.jpg',
            originalName: 'The Mountain',
            width: 1920,
            height: 800,
            durationMs: 181000,
            altText: 'Timelapse of night sky and mountains',
          },
        },
      });

      expect(data.mediaMutation.fileCreateExternal.userErrors).toHaveLength(0);
      expect(data.mediaMutation.fileCreateExternal.file).toBeTruthy();
      expect(data.mediaMutation.fileCreateExternal.file?.provider).toBe('VIMEO');
      expect(data.mediaMutation.fileCreateExternal.file?.url).toContain('vimeo');
      expect(data.mediaMutation.fileCreateExternal.file?.externalData?.externalId).toBe('76979871');
    });

    test('creates Vimeo video with provider metadata', async ({ api }) => {
      await api.session.setupUserAndStore();

      const providerMeta = {
        userId: '12345',
        userName: 'Test User',
        privacy: 'public',
      };

      const { data } = await api.admin.mutation('media-api/FileCreateExternal', {
        variables: {
          input: {
            provider: 'VIMEO',
            externalId: '123456789',
            url: 'https://vimeo.com/123456789',
            thumbnailUrl: 'https://i.vimeocdn.com/video/example.jpg',
            originalName: 'Test Vimeo Video',
            providerMeta,
          },
        },
      });

      expect(data.mediaMutation.fileCreateExternal.file).toBeTruthy();
      // providerMeta may include additional fields like thumbnailUrl depending on server behavior
      expect(data.mediaMutation.fileCreateExternal.file?.externalData?.providerMeta).toMatchObject(providerMeta);
    });
  });

  test.describe('External URL files', () => {
    test('creates external URL file via fixture', async ({ api }) => {
      await api.session.setupUserAndStore();

      const file = await api.admin.file.createExternal({
        provider: 'URL',
        externalId: 'external-video-123',
        url: 'https://example.com/videos/product-demo.mp4',
        thumbnailUrl: 'https://example.com/videos/product-demo-thumb.jpg',
        originalName: 'Product Demo Video',
        width: 1280,
        height: 720,
        durationMs: 120000,
        altText: 'Product demonstration video',
      });

      expect(file.id).toBeTruthy();
      expect(file.url).toBe('https://example.com/videos/product-demo.mp4');
    });

    test('creates external URL file via mutation', async ({ api }) => {
      await api.session.setupUserAndStore();

      const { data } = await api.admin.mutation('media-api/FileCreateExternal', {
        variables: {
          input: {
            provider: 'URL',
            externalId: 'external-video-456',
            url: 'https://example.com/videos/product-demo.mp4',
            thumbnailUrl: 'https://example.com/videos/product-demo-thumb.jpg',
            originalName: 'Product Demo Video',
            width: 1280,
            height: 720,
            durationMs: 120000,
            altText: 'Product demonstration video',
          },
        },
      });

      expect(data.mediaMutation.fileCreateExternal.userErrors).toHaveLength(0);
      expect(data.mediaMutation.fileCreateExternal.file).toBeTruthy();
      expect(data.mediaMutation.fileCreateExternal.file?.provider).toBe('URL');
      expect(data.mediaMutation.fileCreateExternal.file?.url).toBe('https://example.com/videos/product-demo.mp4');
      expect(data.mediaMutation.fileCreateExternal.file?.externalData?.externalId).toBe('external-video-456');
    });

    test('creates URL file without optional fields', async ({ api }) => {
      await api.session.setupUserAndStore();

      const { data } = await api.admin.mutation('media-api/FileCreateExternal', {
        variables: {
          input: {
            provider: 'URL',
            externalId: 'minimal-external',
            url: 'https://example.com/file.pdf',
          },
        },
      });

      expect(data.mediaMutation.fileCreateExternal.userErrors).toHaveLength(0);
      expect(data.mediaMutation.fileCreateExternal.file).toBeTruthy();
      expect(data.mediaMutation.fileCreateExternal.file?.provider).toBe('URL');
      expect(data.mediaMutation.fileCreateExternal.file?.dimensions).toBeNull();
      expect(data.mediaMutation.fileCreateExternal.file?.durationMs).toBeNull();
    });
  });

  test.describe('External media operations', () => {
    test('updates external media altText', async ({ api }) => {
      await api.session.setupUserAndStore();

      // Create external file using fixture
      const file = await api.admin.file.createYouTubeVideo('kJQP7kiw5Fk', {
        title: 'Despacito',
      });

      // Update
      const { data: updateData } = await api.admin.mutation('media-api/FileUpdate', {
        variables: {
          input: {
            id: file.id,
            altText: 'Despacito music video by Luis Fonsi',
          },
        },
      });

      expect(updateData.mediaMutation.fileUpdate.file?.altText).toBe('Despacito music video by Luis Fonsi');
      expect(updateData.mediaMutation.fileUpdate.file?.provider).toBe('YOUTUBE');
    });

    test('deletes external media file', async ({ api }) => {
      await api.session.setupUserAndStore();

      // Create external file using fixture
      const file = await api.admin.file.createVimeoVideo('to-delete-123', {
        title: 'To Be Deleted',
      });

      // Delete
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
      const { data: verifyData, errors } = await api.admin.query('media-api/FileFindOne', {
        variables: { id: file.id },
        throwOnError: false,
      });
      // After permanent delete, either file is null or an error is returned
      expect(verifyData?.mediaQuery?.file === null || errors?.length > 0).toBe(true);
    });

    test('retrieves external data after creation', async ({ api }) => {
      await api.session.setupUserAndStore();

      const file = await api.admin.file.createExternal({
        provider: 'YOUTUBE',
        externalId: 'test-video-id',
        url: 'https://www.youtube.com/watch?v=test-video-id',
        originalName: 'Test Video',
        providerMeta: {
          description: 'This is a test video',
          tags: ['test', 'demo'],
        },
      });

      // Query file and verify externalData
      const { data } = await api.admin.query('media-api/FileFindOne', {
        variables: { id: file.id },
      });

      expect(data.mediaQuery.file).toBeTruthy();
      expect(data.mediaQuery.file?.provider).toBe('YOUTUBE');
      expect(data.mediaQuery.file?.externalData).toBeTruthy();
      expect(data.mediaQuery.file?.externalData?.externalId).toBe('test-video-id');
      expect(data.mediaQuery.file?.externalData?.providerMeta).toEqual({
        description: 'This is a test video',
        tags: ['test', 'demo'],
      });
    });
  });
});
