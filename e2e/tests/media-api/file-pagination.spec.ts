import { randomUUID } from 'node:crypto';
import type { ApiFixtures } from '@fixtures/api/api';
import type { ApiFile, ApiMediaQuery } from '@codegen/admin-gql';
import { createConnectionPaginationTests } from '@utils/connectionPaginationBuilder';

// Helper to access media API data
const media = (data: unknown) => data as { mediaQuery: ApiMediaQuery };

// Test image URLs (small, stable Wikipedia commons images)
const TEST_IMAGES = [
  'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a7/Camponotus_flavomarginatus_ant.jpg/100px-Camponotus_flavomarginatus_ant.jpg',
  'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6d/Good_Food_Display_-_NCI_Visuals_Online.jpg/100px-Good_Food_Display_-_NCI_Visuals_Online.jpg',
  'https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/PNG_transparency_demonstration_1.png/100px-PNG_transparency_demonstration_1.png',
  'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b6/SIPI_Jelly_Beans_4.1.07.tiff/lossy-page1-100px-SIPI_Jelly_Beans_4.1.07.tiff.jpg',
  'https://upload.wikimedia.org/wikipedia/commons/thumb/f/ff/Solid_blue.svg/100px-Solid_blue.svg.png',
];

async function prepareFiles(api: ApiFixtures['api']) {
  const prefix = `FILE-PAG-${randomUUID().slice(0, 8)}`;
  const expectedItems: ApiFile[] = [];

  await api.session.setupUserAndStore();

  // Create 5 files with predictable data for sorting and filtering
  for (let i = 0; i < 5; i++) {
    const file = await api.admin.file.uploadFromUrl(
      TEST_IMAGES[i],
      `${prefix}-alt-${i}`,
    );

    // Fetch the full file data
    const { data } = await api.admin.query('media-api/FileFindOne', {
      variables: { id: file.id },
    });

    const fullFile = media(data).mediaQuery.file;
    if (fullFile) {
      expectedItems.push(fullFile);
    }

    // Small delay to ensure different createdAt timestamps
    await new Promise((resolve) => setTimeout(resolve, 100));
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
  sortCases: [
    {
      name: 'createdAt ASC',
      orderBy: [{ field: 'createdAt', direction: 'asc' }],
      sortExpected: (items) => [...items].sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    },
    {
      name: 'createdAt DESC',
      orderBy: [{ field: 'createdAt', direction: 'desc' }],
      sortExpected: (items) => [...items].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    },
    {
      name: 'updatedAt ASC',
      orderBy: [{ field: 'updatedAt', direction: 'asc' }],
      sortExpected: (items) => [...items].sort((a, b) => a.updatedAt.localeCompare(b.updatedAt)),
    },
    {
      name: 'updatedAt DESC',
      orderBy: [{ field: 'updatedAt', direction: 'desc' }],
      sortExpected: (items) => [...items].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    },
  ],
  filterCases: [
    {
      name: 'by provider S3',
      where: { provider: { _eq: 'S3' } },
      filterExpected: (items) => items.filter((i) => i.provider === 'S3'),
    },
    {
      name: 'by mimeType containing image',
      where: { mimeType: { _contains: 'image' } },
      filterExpected: (items) => items.filter((i) => i.mimeType?.includes('image')),
    },
    {
      name: 'by isProcessed false',
      where: { isProcessed: { _eq: false } },
      filterExpected: (items) => items.filter((i) => i.isProcessed === false),
    },
    {
      name: 'with _or condition (multiple alt texts)',
      where: {
        _or: [{ altText: { _endsWith: '-alt-0' } }, { altText: { _endsWith: '-alt-1' } }],
      },
      filterExpected: (items) =>
        items.filter((i) => i.altText?.endsWith('-alt-0') || i.altText?.endsWith('-alt-1')),
    },
  ],
  getConnection: (data) => media(data).mediaQuery.files,
  getNodeIdentifier: (node) => node.id,
  pageSize: 2,
  apiClient: 'admin',
});
