import { notify } from '@components/feedback/notification';
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
import { DrawerPaper } from '@src/layouts/drawer/components/DrawerPaper';
import { DrawerPaperHeader } from '@src/layouts/drawer/components/PaperHeader';
import { NIL_UUID } from '@src/utils/synthetic-id';
import { equalsId } from '@src/utils/utils';
import { Button } from 'antd';
import { FormattedMessage } from 'react-intl';
import { t } from '@src/lang/messages';
import { useEffect, useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { MdAdd } from 'react-icons/md';

export const Listing = () => {
  const [processing, setProcessing] = useState(false);

  const form = useFormContext();
  const { setValue } = form;
  const [entries, setEntries] = useState<IProductVariant[]>([]);
  const [browsing, setBrowsing] = useState(false);

  const listingOrderBy = form.watch('listingOrderBy');
  const categorySlug = form.getValues('slug');
  const categoryId = form.getValues('id');

  const conditions: IFilter[] = form.watch('conditions');

  const { listing, loading, refetch, meta } = useListing({
    skip: false,
    slug: categorySlug,
    conditions,
    order: listingOrderBy,
    perPage: 1000,
  });

  useEffect(() => {
    setEntries(listing || []);
  }, [listing]);

  useEffect(() => {
    if (listingOrderBy === ListingSort.Custom) {
      setValue('listingOrderBy', ListingSort.CreatedAtDesc, {
        shouldDirty: true,
      });
    }
  }, [listingOrderBy, setValue]);

  const { addProducts } = useAddCategoryProducts();
  const { updateProductRank } = useUpdateProductRank();
  const { deleteProduct } = useDeleteCategoryProducts();

  const onAddProducts = async (nextEntries: IProductVariant[]) => {
    const containers = [...new Set(nextEntries.map((it) => it.containerId))];

    try {
      setProcessing(true);
      await addProducts({
        categoryId,
        productContainerIds: containers,
      });
      await refetch();
    } finally {
      setProcessing(false);
    }
  };

  const onDeleteEntry = async (entry: IProductVariant) => {
    try {
      setProcessing(true);
      await deleteProduct({
        categoryId,
        productId: entry.containerId!,
      });
      await refetch();
    } finally {
      setProcessing(false);
    }
  };

  const onReorderEntry = async (nextEntries: IProductVariant[], id: ID) => {
    setEntries(nextEntries);

    const idx = nextEntries.findIndex(equalsId(id));
    if (idx === -1) {
      notify.error('Error. Please try again.');
      return;
    }

    try {
      setProcessing(true);
      await updateProductRank(
        {
          categoryId,
          productId: id,
          afterId: nextEntries[idx - 1]?.id || NIL_UUID,
        },
        { onError: refetch },
      );
      // await refetch();
    } finally {
      setProcessing(false);
    }
  };

  return (
    <DrawerPaper>
      <DrawerPaperHeader
        title={<FormattedMessage id={t('category.listing.title')} />}
        badgeCount={meta.total}
        name="listing"
        extra={
          <>
            <Button
              data-testid="add-listing-product-button"
              icon={<MdAdd />}
              onClick={() => setBrowsing(true)}
            />
            <BrowseCategoriesProducts
              onChange={onAddProducts}
              value={entries}
              onClose={() => setBrowsing(false)}
              open={browsing}
            />
          </>
        }
      />

      <ListingTable
        loading={loading || processing}
        onDeleteEntry={onDeleteEntry}
        onReorderEntry={onReorderEntry}
        isDraggable={listing.length > 1}
        value={entries.map((it) => {
          return {
            ...it,
            deletable: true,
          };
        })}
      />
    </DrawerPaper>
  );
};
