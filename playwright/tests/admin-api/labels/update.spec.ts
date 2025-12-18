import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import * as yup from 'yup';

test.describe('LabelUpdate', () => {
  test('Update', async ({ api }) => {
    await api.session.setupUserAndProject();

    const input = {
      name: 'Label 1',
      slug: randomUUID(),
      colorHex: '#ff0000',
    };

    const newInput = {
      name: 'New Label',
      slug: 'new-label',
      colorHex: '#0000ff',
    };

    const { id } = await api.admin.label.create({ input });
    await api.admin.mutation('admin/LabelUpdate', {
      variables: {
        input: {
          id,
          ...newInput,
        },
      },
    });

    expect(await api.admin.label.findOne(id)).toMatchSchema(
      yup.object({
        id: yup.string().equals([id]).required(),
        name: yup.string().equals([newInput.name]).required(),
        slug: yup.string().equals([newInput.slug]).required(),
        colorHex: yup.string().equals([newInput.colorHex]),
      }),
    );
  });
});
