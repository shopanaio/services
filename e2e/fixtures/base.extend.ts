import type { ApiFixtures } from '@fixtures/api/api';
import { test as base } from '@fixtures/api/api';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface Fixtures extends ApiFixtures {}

export const test = base.extend<Fixtures>({});
