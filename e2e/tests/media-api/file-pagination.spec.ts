import { randomUUID } from 'node:crypto';
import type { ApiFixtures } from '@fixtures/api/api';
import type { ApiFile, ApiMediaQuery } from '@codegen/admin-gql';
import { createConnectionPaginationTests } from '@utils/connectionPaginationBuilder';

// Helper to access media API data
const media = (data: unknown) => data as { mediaQuery: ApiMediaQuery };

// Number of files to create for pagination testing
// 7 files with pageSize 2 = 4 pages (enough for comprehensive testing)
const FILE_COUNT = 7;

async function prepareFiles(api: ApiFixtures['api']) {
  const prefix = `FILE-PAG-${randomUUID().slice(0, 8)}`;
  const expectedItems: ApiFile[] = [];

  await api.session.setupUserAndStore();

  // Create 20 external files (YouTube) for comprehensive pagination testing
  for (let i = 0; i < FILE_COUNT; i++) {
    const videoId = `test-video-${prefix}-${i.toString().padStart(2, '0')}`;

    const file = await api.admin.file.createExternal({
      provider: 'YOUTUBE',
      externalId: videoId,
      url: `https://www.youtube.com/watch?v=${videoId}`,
      thumbnailUrl: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
      originalName: `Video ${i.toString().padStart(2, '0')}`,
      altText: `${prefix}-alt-${i.toString().padStart(2, '0')}`,
      width: 1920,
      height: 1080,
      durationMs: 60000 + i * 1000,
    });

    // Fetch the full file data
    const { data } = await api.admin.query('media-api/FileFindOne', {
      variables: { id: file.id },
    });

    const fullFile = media(data).mediaQuery.file;
    if (fullFile) {
      expectedItems.push(fullFile);
    }
  }

  return {
    expectedItems,
    whereFilter: { altText: { _startsWith: prefix } },
  };
}

createConnectionPaginationTests<ApiFile>({
  queryName: 'media-api/FileFindMany',
  suiteName: 'File cursor pagination',
  prepare: prepareFiles,
  // NOTE: createdAt sorting is not tested because PostgreSQL timestamps have
  // microsecond precision but JS Date only has millisecond precision. This causes
  // cursor pagination to fail when timestamps differ by less than 1ms.
  sortCases: [
    {
      name: 'originalName ASC',
      orderBy: [{ field: 'originalName', direction: 'asc' }],
      sortExpected: (items) =>
        [...items].sort((a, b) => (a.originalName ?? '').localeCompare(b.originalName ?? '')),
    },
    {
      name: 'originalName DESC',
      orderBy: [{ field: 'originalName', direction: 'desc' }],
      sortExpected: (items) =>
        [...items].sort((a, b) => (b.originalName ?? '').localeCompare(a.originalName ?? '')),
    },
  ],
  filterCases: [
    {
      name: 'by provider YOUTUBE',
      where: { provider: { _eq: 'YOUTUBE' } },
      filterExpected: (items) => items.filter((i) => i.provider === 'YOUTUBE'),
    },
    {
      name: 'by originalName containing 0',
      where: { originalName: { _contains: '0' } },
      filterExpected: (items) => items.filter((i) => i.originalName?.includes('0')),
    },
    {
      name: 'by isProcessed false',
      where: { isProcessed: { _eq: false } },
      filterExpected: (items) => items.filter((i) => i.isProcessed === false),
    },
    {
      name: 'with _or condition (first and last original names)',
      where: {
        _or: [{ originalName: { _eq: 'Video 00' } }, { originalName: { _eq: 'Video 06' } }],
      },
      filterExpected: (items) =>
        items.filter((i) => i.originalName === 'Video 00' || i.originalName === 'Video 06'),
    },
    {
      name: 'with _not condition (exclude first 3)',
      where: {
        _not: { originalName: { _in: ['Video 00', 'Video 01', 'Video 02'] } },
      },
      filterExpected: (items) =>
        items.filter((i) => !['Video 00', 'Video 01', 'Video 02'].includes(i.originalName ?? '')),
    },
  ],
  getConnection: (data) => media(data).mediaQuery.files,
  getNodeIdentifier: (node) => node.id,
  // Global ID format: base64("gid://shopana/File/{uuid}") -> extract uuid
  getRawId: (node) => {
    const decoded = Buffer.from(node.id, 'base64').toString('utf8');
    const match = decoded.match(/^gid:\/\/[^/]+\/[^/]+\/(.+)$/);
    return match ? match[1] : node.id;
  },
  pageSize: 2,
  apiClient: 'admin',
});
