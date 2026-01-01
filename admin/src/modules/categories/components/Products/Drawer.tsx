import { notify } from '@components/feedback/notification';
import { getRefetchQueries } from '@modules/app/components/Apollo';
import { BrowseCategoriesProducts } from '@modules/categories/components/Products/BrowseProducts';
import { ListingTable } from '@modules/categories/components/Products/ListingTable';
import { useListing } from '@modules/categories/hooks/useListing';
import {
  useAddCategoryProducts,
  useDeleteCategoryProducts,
  useUpdateProductRank,
} from '@modules/categories/hooks/useUpdateCategory';

import { IFilter } from '@src/entity/Filter/types';
import { IProductVariant } from '@src/entity/Product/Variant';
import { ListingSort } from '@src/graphql';
import { DrawerLayout } from '@src/layouts/drawer/components/DrawerLayout';
import { useEntityDrawer } from '@src/layouts/drawers/hooks/useEntityDrawer';
import { $drawers } from '@src/layouts/drawers/store/drawers';
import { App, Button } from 'antd';
import { useEffect, useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { MdAdd } from 'react-icons/md';

enum EntryType {
  Product = 'Product',
  Category = 'Category',
}

export const ManageProducts = () => {
  const {
    uuid,
    close,
    meta: { form },
  } = useEntityDrawer();

  const [processing, setProcessing] = useState(false);
  const lock = (time: number) => {
    setProcessing(true);
    setTimeout(() => {
      setProcessing(false);
    }, time);
  };

  const [entries, setEntries] = useState<IProductVariant[]>([]);
  const [browsingType, setBrowsingType] = useState<EntryType | null>(null);

  const listingOrderBy = form.watch('listingOrderBy');

  const methods = useForm({
    defaultValues: {},
  });

  const { errors, isDirty } = methods.formState;

  const categorySlug = form.getValues('slug');
  const categoryId = form.getValues('id');

  const conditions: IFilter[] = form.watch('conditions');

  const isDirtyConditions = form.formState.dirtyFields['conditions'];

  const { listing, loading } = useListing({
    skip: false,
    slug: categorySlug,
    conditions,
    order: listingOrderBy,
    // perPage: 5,
  });

  useEffect(() => {
    setEntries(listing || []);
  }, [listing]);

  const { addProducts } = useAddCategoryProducts();
  const { updateProductRank } = useUpdateProductRank();
  const { deleteProduct } = useDeleteCategoryProducts();

  const onAddProducts = (nextEntries: IProductVariant[]) => {
    const containers = [...new Set(nextEntries.map((it) => it.containerId))];

    addProducts(
      {
        categoryId,
        productContainerIds: containers,
      },
      {
        refetchQueries: getRefetchQueries(),
        onCompleted: () => {},
        onError: () => {
          notify.error('Error adding products');
        },
      },
    );
  };

  const onDeleteEntry = (entry: IProductVariant) => {
    deleteProduct(
      {
        categoryId,
        productId: entry.containerId!,
      },
      {
        refetchQueries: getRefetchQueries(),
        onError: () => {
          notify.error('Error deleting product');
        },
      },
    );
  };

  const onReorderEntry = async (nextEntries: IProductVariant[], id: ID) => {
    const prevEntries = [...entries];
    setEntries(nextEntries);

    const idx = nextEntries.findIndex((it) => it.id === id);
    if (idx === -1) {
      return;
    }

    if (!nextEntries[idx] || !prevEntries[idx]) {
      console.error('Invalid entry');
      return;
    }

    const prevRank = nextEntries[idx - 1]?.listingSortIndex || '';
    const nextRank = nextEntries[idx + 1]?.listingSortIndex || '';

    //
    lock(1000);
    updateProductRank(
      {
        categoryId,
        productId: nextEntries[idx].id,
        rank: {
          prev: prevRank,
          next: nextRank,
        },
      },
      {
        refetchQueries: getRefetchQueries(),
        onCompleted: () => {
          notify.success('Success');
        },
        onError: () => {
          setEntries(prevEntries);
          notify.error('Error updating listing order');
        },
      },
    );
  };

  useEffect(() => {
    $drawers.setDirty({ uuid, isDirty });
  }, [isDirty, uuid]);

  return (
    <FormProvider {...methods}>
      <DrawerLayout
        name="listing"
        errors={errors}
        rightColumn={null}
        headerProps={{
          title: 'Listing',
          onClose: close,
          statusSelectProps: null,
          submitButtonProps: null,
          badgeCount: entries.length,
          extra: (
            <>
              <Button
                type="primary"
                data-testid="add-listing-product-button"
                icon={<MdAdd />}
                onClick={() => {
                  setBrowsingType(EntryType.Product);
                }}
              >
                Add product
              </Button>

              <BrowseCategoriesProducts
                onChange={onAddProducts}
                value={entries}
                onClose={() => setBrowsingType(null)}
                open={browsingType === EntryType.Product}
              />
            </>
          ),
        }}
        leftColumn={
          <ListingTable
            loading={loading || processing}
            onDeleteEntry={onDeleteEntry}
            onReorderEntry={onReorderEntry}
            isDraggable={listingOrderBy === ListingSort.Custom}
            value={entries.map((it) => {
              if (isDirtyConditions) {
                return {
                  ...it,
                  dragDisabled: true,
                  deletable: false,
                };
              }

              return {
                ...it,
                deletable: true,
                dragDisabled: listingOrderBy !== ListingSort.Custom,
              };
            })}
          />
        }
      />
    </FormProvider>
  );
};
