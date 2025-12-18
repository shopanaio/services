import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import * as yup from 'yup';

test.describe('LabelFindOne', () => {
  test('FindOne', async ({ api }) => {
    await api.session.setupUserAndProject();

    const input = {
      name: 'Label 1',
      slug: randomUUID(),
      colorHex: '#00ff00',
    };

    const { id } = await api.admin.label.create({ input });

    expect(await api.admin.label.findOne(id)).toMatchSchema(
      yup.object({
        id: yup.string().equals([id]).required(),
        name: yup.string().equals([input.name]).required(),
        slug: yup.string().equals([input.slug]).required(),
        colorHex: yup.string().equals([input.colorHex]),
      }),
    );
  });
});
