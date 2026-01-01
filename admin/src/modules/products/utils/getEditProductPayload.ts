import { IProductGroupFormValues } from '@modules/products/components/groups/schema';
import {
  IProductFormValues,
  IProductFormVariantValues,
} from '@modules/products/types';
import { getFeaturesPayload } from '@modules/products/utils/getFeaturesPayload';
import { getGroupsPayload } from '@modules/products/utils/getGroupsPayload';
import { getDirtyVariantFields } from '@modules/products/utils/getVariantDirtyFields';
import { mapApiCreatedVariant } from '@modules/products/utils/mapApiCreatedVariant';
import {
  getEmbedVariantPayload,
  mapApiUpdatedVariant,
} from '@modules/products/utils/mapApiUpdatedVariant';
import { getApiRichTextJSON } from '@src/entity/Content/description';
import { IProduct } from '@src/entity/Product/Product';
import { IProductVariant } from '@src/entity/Product/Variant';
import { ApiSeoFieldsInput, ApiUpdateProductInput } from '@src/graphql';
import { NIL_UUID } from '@src/utils/synthetic-id';
import { equalsId, mapEntryId } from '@src/utils/utils';
import { FieldNamesMarkedBoolean } from 'react-hook-form';

export const getEditProductPayload = ({
  data,
  product,
  dirtyFields,
}: {
  data: IProductFormValues;
  product: IProduct;
  dirtyFields: FieldNamesMarkedBoolean<IProductFormValues>;
}) => {
  const payload = {
    id: product.id,
  } as ApiUpdateProductInput;

  const { variants } = data;

  if (dirtyFields.title) {
    payload.title = data.title;
  }

  if (dirtyFields.description) {
    payload.description = getApiRichTextJSON(data.description);
  }

  if (dirtyFields.seoTitle) {
    payload.seo = payload.seo || ({} as ApiSeoFieldsInput);
    payload.seo.title = data.seoTitle;
  }

  if (dirtyFields.seoDescription) {
    payload.seo = payload.seo || ({} as ApiSeoFieldsInput);
    payload.seo.description = data.seoDescription;
  }

  if (dirtyFields.excerpt) {
    payload.excerpt = data.excerpt;
  }

  if (dirtyFields.slug) {
    payload.slug = data.slug;
  }

  if (dirtyFields.status) {
    payload.status = data.status;
  }

  if (dirtyFields.tags) {
    payload.tags = data.tags.map(mapEntryId);
  }

  if (dirtyFields.requiresShipping) {
    payload.requiresShipping = data.requiresShipping;
  }

  if (dirtyFields.groups) {
    payload.groups = getGroupsPayload(data.groups, product.groups);
  }

  if (dirtyFields.primaryCategoryId) {
    payload.primaryCategory = data.primaryCategoryId || NIL_UUID;
  }

  if (product.embedVariant && !variants?.length) {
    const embedVariant = getEmbedVariantPayload({
      data,
      dirtyFields,
      variant: product.embedVariant,
    });

    payload.variants = {
      create: [],
      delete: [],
      update: [embedVariant],
    };
  }

  // ===============================
  // Variants
  // Only updated variants could be submitted on the form.
  // ===============================

  const dirtyUpdated = variants
    .map((it) => {
      const initial = product.variants.find(equalsId(it.id));
      return (
        initial && [it, getDirtyVariantFields(initial, it as IProductVariant)]
      );
    })
    .filter(Boolean) as any[];

  const updateVariants = dirtyUpdated.map(
    mapApiUpdatedVariant({
      data,
      dirtyFields,
      product,
    }),
  );

  if (updateVariants.length) {
    payload.variants = {
      create: [],
      delete: [],
      update: updateVariants,
    };
  }

  return payload;
};

// Form values should container attributes field which are all features/attributes of the product
export const getUpdateVariantsPayload = ({
  variants,
  product,
  formValues,
}: {
  variants: {
    create: IProductFormVariantValues[];
    update: IProductFormVariantValues[];
    delete: IProductFormVariantValues[];
  };
  product: IProduct;
  formValues: IProductFormValues;
}) => {
  const payload = {
    id: product.id,
    variants: {
      create: variants.create.map((it) =>
        mapApiCreatedVariant(formValues, it, product),
      ),
      update: variants.update.map((it) => ({
        id: it.id,
        variantSortIndex: it.variantSortIndex,
        features: getFeaturesPayload(formValues.attributes, it.options),
      })),
      delete: variants.delete.map(mapEntryId),
    },
  } as ApiUpdateProductInput;

  return payload;
};

export const getUpdateGroupsPayload = ({
  groups,
  product,
}: {
  groups: IProductGroupFormValues[];
  product: IProduct;
}) => {
  return {
    id: product.id,
    groups: getGroupsPayload(groups, product.groups),
  } as ApiUpdateProductInput;
};
