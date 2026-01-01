import { IShopifyRecord } from '@modules/csv/utils/Shopify/fields';
import { transformCsvRecordToApiProduct } from '@modules/csv/utils/utils';
import { IProduct, Product } from '@src/entity/Product/Product';
import { groupBy } from 'lodash';

export const parseShopifyRecords = (records: IShopifyRecord[]) => {
  const groups = groupBy(records, (record) => record.handle);

  const result = [] as IProduct[];

  for (const key in groups) {
    const group = groups[key];

    if (group.length === 1) {
      const apiProduct = transformCsvRecordToApiProduct(group[0], []);
      const product = Product.create(apiProduct);
      if (product) {
        result.push(product);
      }

      continue;
    }

    const rootIdx = group.findIndex((record) => record.option1Name);
    if (rootIdx === -1) {
      continue;
    }

    const [root] = group.splice(rootIdx, 1);
    const apiProduct = transformCsvRecordToApiProduct(root, group);
    const product = Product.create(apiProduct);
    if (product) {
      result.push(product);
    }
  }

  return result;
};
