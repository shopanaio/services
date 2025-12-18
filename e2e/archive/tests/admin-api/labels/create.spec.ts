import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import * as yup from 'yup';

test.describe('LabelCreate API', () => {
  test('Create', async ({ api }) => {
    await api.session.setupUserAndProject();

    const input = {
      name: 'Label 1',
      slug: randomUUID(),
      colorHex: '#ff0000',
    };

    expect(await api.admin.label.create({ input })).toMatchSchema(
      yup.object({
        id: yup.string().required(),
        name: yup.string().equals([input.name]).required(),
        slug: yup.string().equals([input.slug]).required(),
        colorHex: yup.string().equals([input.colorHex]),
      }),
    );
  });
});
