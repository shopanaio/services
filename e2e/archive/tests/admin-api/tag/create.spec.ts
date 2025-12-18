import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import * as yup from 'yup';

test.describe('TagCreate API', () => {
  test('Create', async ({ api }) => {
    await api.session.setupUserAndProject();

    const input = {
      title: 'Tag 1',
      slug: randomUUID(),
      color: "#000000",
    };

    expect(await api.admin.tag.create({ input })).toMatchSchema(
      yup.object({
        id: yup.string().required(),
        title: yup.string().equals([input.title]).required(),
        slug: yup.string().equals([input.slug]).required(),
        color: yup.string().equals([input.color]),
      }),
    );
  });
});
