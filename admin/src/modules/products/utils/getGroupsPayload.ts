import { IProductGroupFormValues } from '@modules/products/components/groups/schema';
import { IProductGroup } from '@src/entity/ProductGroup/ProductGroup';
import {
  ApiUpdateProductGroupInput,
  ApiUpdateProductGroupsInput,
  ProductGroupPriceType,
} from '@src/graphql';
import { isSyntheticRecord } from '@src/utils/synthetic-id';
import { equalsId, mapEntryId } from '@src/utils/utils';

import { isEqual, partition } from 'lodash';

const createIndexMapping = (records: { id: ID }[]) =>
  records.reduce(
    (acc, record, index) => ({ ...acc, [record.id]: index }),
    {} as Record<string, number>,
  );

export const getGroupsPayload = (
  groups: IProductGroupFormValues[],
  initialGroups: IProductGroup[],
): ApiUpdateProductGroupsInput => {
  const indexMapping = createIndexMapping(groups);

  const [newGroups, updatedGroups] = partition(groups, isSyntheticRecord);

  const deletedGroups = initialGroups.filter(
    (group) => !updatedGroups.some(equalsId(group.id)),
  );

  return {
    create: newGroups.map((group) => ({
      title: group.title,
      isMultiple: group.isMultiple,
      isRequired: group.isRequired,
      items: group.items.map((item, idx) => ({
        variantId: item.product.id,
        priceType: item.priceType ?? ProductGroupPriceType.Base,
        priceAmountValue: item.priceAmountValue ?? undefined,
        pricePercentageValue: item.pricePercentageValue ?? undefined,
        sortIndex: idx,
      })),
      sortIndex: indexMapping[group.id],
    })),
    update: updatedGroups.map((group) => {
      const initialIdx = initialGroups.findIndex(equalsId(group.id));
      if (initialIdx === -1) {
        throw new Error('Group not found. Invalid index');
      }

      const initialGroup = initialGroups[initialIdx]!;
      const dirtyFields = getGroupsDirtyFields(group, initialGroup);

      const { items } = group;
      const itemsIndexMapping = createIndexMapping(items);

      const payload = {
        id: group.id,
      } as ApiUpdateProductGroupInput;

      if (dirtyFields.title) {
        payload.title = group.title;
      }

      if (dirtyFields.isMultiple) {
        payload.isMultiple = group.isMultiple;
      }

      if (dirtyFields.isRequired) {
        payload.isRequired = group.isRequired;
      }

      if (indexMapping[group.id] !== initialIdx) {
        payload.sortIndex = indexMapping[group.id];
      }

      if (dirtyFields.items) {
        const [newItems, updatedItems] = partition(items, isSyntheticRecord);
        const deletedItems = initialGroup.items.filter(
          (item) => !updatedItems.some(equalsId(item.id)),
        );

        payload.items = {
          create: newItems.map(
            ({
              id,
              product,
              priceType,
              priceAmountValue,
              pricePercentageValue,
            }) => ({
              variantId: product.id,
              sortIndex: itemsIndexMapping[id],
              priceType: priceType ?? ProductGroupPriceType.Base,
              priceAmountValue: priceAmountValue ?? undefined,
              pricePercentageValue: pricePercentageValue ?? undefined,
            }),
          ),
          update: updatedItems.map(
            ({ id, priceType, priceAmountValue, pricePercentageValue }) => ({
              id,
              sortIndex: itemsIndexMapping[id],
              priceType: priceType ?? undefined,
              priceAmountValue: priceAmountValue ?? undefined,
              pricePercentageValue: pricePercentageValue ?? undefined,
            }),
          ),
          delete: deletedItems.map(mapEntryId),
        };
      }

      return payload;
    }),
    delete: deletedGroups.map(mapEntryId),
  };
};

const getGroupsDirtyFields = (
  group: IProductGroupFormValues,
  initialGroup: IProductGroup,
) => {
  return {
    title: !isEqual(group.title, initialGroup.title),
    isMultiple: !isEqual(group.isMultiple, initialGroup.isMultiple),
    isRequired: !isEqual(group.isRequired, initialGroup.isRequired),
    items: !isEqual(group.items, initialGroup.items),
  };
};
