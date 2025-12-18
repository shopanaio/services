import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import * as yup from 'yup';



test.describe('TagUpdate', () => {
  test('Update', async ({ api }) => {
    await api.session.setupUserAndProject();

    const input = {
      title: 'Tag 1',
      slug: randomUUID(),
      color: "#ff0000",
    };

    const newInput = {
      title: 'New Tag',
      slug: 'new-tag',
      color: "#0000ff",
    };

    const { id } = await api.admin.tag.create({ input });

    await api.admin.mutation('admin/TagUpdate', {
      variables: {
        input: {
          id,
          ...newInput,
        },
      },
    });

    const updatedTag = await api.admin.tag.findOne(id);

    expect(updatedTag).toMatchSchema(
      yup.object({
        id: yup.string().equals([id]).required(),
        title: yup.string().equals([newInput.title]).required(),
        slug: yup.string().equals([newInput.slug]).required(),
        color: yup.string().equals([newInput.color]),
      }),
    );
  });
});
