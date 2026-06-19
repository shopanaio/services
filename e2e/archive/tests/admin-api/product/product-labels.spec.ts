import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';

import { randomUUID } from 'node:crypto';
import * as yup from 'yup';

test.describe('Product Labels', () => {
  test('Create product with labels', async ({ api }) => {

    await api.session.setupUserAndProject();


    const labelInputs = [
      { name: 'Label Uno', slug: randomUUID(), colorHex: '#aaaaaa' },
      { name: 'Label Dos', slug: randomUUID(), colorHex: '#bbbbbb' },
    ];

    const labels = [] as { id: string; slug: string }[];

    for (const input of labelInputs) {
      const label = await api.admin.label.create({ input });
      labels.push({ id: label.id, slug: label.slug });
    }

    const labelIds = labels.map((l) => l.id);


    const product = await api.admin.product.create({
      input: {
        title: 'Product with Labels',
        status: 'DRAFT',
        labels: labelIds,
      },
    });


    expect(product.labels.length).toBe(2);


    product.labels.forEach((lbl) => {
      expect(lbl).toMatchSchema(
        yup.object({
          id: yup.string().oneOf(labelIds).required(),
          slug: yup.string().required(),
          name: yup.string().required(),
          colorHex: yup.string().nullable(),
        }),
      );
    });


    const fetchedProduct = await api.admin.product.findOne(product.id);

    const fetchedLabels = fetchedProduct.labels || [];
    expect(fetchedLabels.map((l) => l.id).sort()).toEqual(labelIds.sort());
  });
});
