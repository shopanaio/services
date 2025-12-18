import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import * as yup from 'yup';

test.describe('TagFindOne', () => {
  test('FindOne', async ({   api }) => {
    await api.session.setupUserAndProject();

    const input = {
      title: 'Tag 1',
      slug: randomUUID(),
      color: "#ff0000",
    };

    const tag = await api.admin.tag.create({ input });
    expect(tag).toMatchSchema(
      yup.object({
        id: yup.string().required(),
        title: yup.string().equals([input.title]).required(),
        slug: yup.string().equals([input.slug]).required(),
        color: yup.string().equals([input.color]),
      }),
    );
  });
});
