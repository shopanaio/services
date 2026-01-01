import { uniqBy } from 'lodash';

import { IMediaFile } from '@src/entity/MediaFile/MediaFile';
import { getCreateProductPayload } from '@modules/products/utils/getCreateProductPayload';
import { getProductFormValues } from '@modules/products/utils/getProductFormValues';
import { getCategoryFormValues } from '@modules/categories/utils/getCategoryFormValues';
import { getCreateCategoryPayload } from '@modules/categories/utils/getCreateCategoryPayload';
import { ICategory } from '@src/entity/Category/Category';
import { $csv, CsvUploadStatus } from '@modules/products/store/csv';
import { useCreateCategories } from '@modules/categories/hooks/useCreateCategory';
import { useMutation } from '@apollo/client';
import {
  ApiProductMutationCreateManyResponse,
  CreateProductsMutation,
} from '@modules/products/graphql/createProduct';
import {
  ApiCreateProductInput,
  EntityStatus,
  FeatureStyleType,
} from '@src/graphql';
import { IProduct } from '@src/entity/Product/Product';
import { ITag } from '@src/entity/Tag/Tag';
import { mapEntryId, sleep } from '@src/utils/utils';
import { useUploadFileByUrl } from '@modules/media/hooks/useUploadFile';

const fileUrlToId: Record<string, ID> = {};
const categorySlugToId: Record<string, ID> = {};
const tagSlugToId: Record<string, ID> = {};
const featureGroupsMapping: Record<
  string,
  { id: ID; features: Record<string, ID> }
> = {};

const setStatus = (id: any, status: CsvUploadStatus) => {
  $csv.setItemsStatus([{ id, status }]);
};

const useUploadFeatures = () => {
  // const { createFeatureGroup } = useCreateFeatureGroup();
  // const { updateFeatureGroup } = useUpdateFeatureGroup();

  return async (products: IProduct[]) => {
    const payloads = {} as Record<ID, ApiCreateFeatureGroupInput>;

    products.forEach((p) =>
      p.attributes.forEach((attribute) => {
        payloads[attribute.id] = {
          features: uniqBy(
            [
              ...(payloads[attribute.id]?.features || []),
              ...attribute.features.map((it, sortIndex) => ({
                title: it.title,
                sortIndex,
              })),
            ],
            'title',
          ),
          title: attribute.title,
          type: FeatureStyleType.Radio,
        };
      }),
    );

    for (const payload of Object.values(payloads)) {
      if (featureGroupsMapping[payload.title]) {
        const featureGroup = featureGroupsMapping[payload.title];

        const create = payload.features.filter(
          (it) => !featureGroup.features[it.title],
        );

        if (!create.length) {
          continue;
        }

        const response = await updateFeatureGroup({
          id: featureGroup.id,
          features: {
            create,
          },
        });

        if (response?.data?.featureGroupMutation?.update.features) {
          featureGroupsMapping[payload.title] = {
            id: response.data.featureGroupMutation.update.id,
            features: response.data.featureGroupMutation.update.features.reduce<
              Record<string, ID>
            >((acc, it) => ({ ...acc, [it.title]: it.id }), {}),
          };
        }

        continue;
      }

      const response = await createFeatureGroup(payload);

      if (response?.data?.featureGroupMutation?.create) {
        featureGroupsMapping[payload.title] = {
          id: response.data.featureGroupMutation.create.id,
          features: response.data.featureGroupMutation.create.features.reduce<
            Record<string, ID>
          >((acc, it) => ({ ...acc, [it.title]: it.id }), {}),
        };
      }
    }
  };
};

const useUploadCategories = () => {
  const { createCategories } = useCreateCategories();

  return async (products: IProduct[]) => {
    const allCategories = products.flatMap((product) => {
      return product.categories.map((category) => {
        return getCreateCategoryPayload({
          data: getCategoryFormValues(category),
        });
      });
    });

    if (allCategories.length) {
      const categoriesResponse = await createCategories(
        uniqBy(allCategories, 'slug'),
      );

      if (categoriesResponse?.data?.categoryMutation?.createMany?.length) {
        categoriesResponse.data.categoryMutation.createMany.forEach((it) => {
          categorySlugToId[it.slug] = it.id;
        });
      }
    }
  };
};

const useUploadProductMedia = () => {
  const { uploadFileByUrl } = useUploadFileByUrl();

  return async (products: IProduct[]) => {
    const allFiles = uniqBy(
      [
        ...products.flatMap((p) => p.gallery.map((it) => it.url)),
        ...products.flatMap((p) =>
          p.variants.flatMap((it) => it.cover?.url || ''),
        ),
      ]
        .filter(Boolean)
        .map((url) => ({
          url,
        })),
      'url',
    );

    for (const { url } of allFiles) {
      if (fileUrlToId[url]) {
        continue;
      }

      const fileResponse = await uploadFileByUrl(url);
      if (fileResponse) {
        fileUrlToId[url] = fileResponse.id;
      }
    }
  };
};

export const useUploadCsvProducts = () => {
  const [mutation] = useMutation<ApiProductMutationCreateManyResponse>(
    CreateProductsMutation,
  );

  const uploadProducts = async (input: ApiCreateProductInput[], ids: ID[]) => {
    ids.forEach(async (i, idx) => {
      await sleep(200 * idx);
      setStatus(i, CsvUploadStatus.PENDING);
    });

    try {
      const { data } = await mutation({ variables: { input } });
      if (!data) {
        throw new Error('No data');
      }

      for (const [idx, result] of data.productMutation.createMany.entries()) {
        setStatus(
          ids[idx],
          result ? CsvUploadStatus.SUCCESS : CsvUploadStatus.ERROR,
        );
        await sleep(200);
      }
    } catch {
      ids.forEach((i) => {
        setStatus(i, CsvUploadStatus.ERROR);
      });
    }
  };

  const uploadFeatures = useUploadFeatures();
  const uploadCategories = useUploadCategories();
  const uploadProductMedia = useUploadProductMedia();

  return async (products: IProduct[]) => {
    await uploadCategories(products);

    const processItems = async (csvProducts: IProduct[]) => {
      await uploadProductMedia(csvProducts);

      await uploadFeatures(csvProducts);

      const payloads = csvProducts.map((csvProduct) => {
        const product: IProduct = {
          ...csvProduct,
          status: EntityStatus.Draft,
        };

        // categories
        product.categories = product.categories
          .filter((it) => categorySlugToId[it.slug])
          .map((it) => ({ id: categorySlugToId[it.slug] })) as ICategory[];

        // tags;
        product.tags = product.tags
          .filter((it) => tagSlugToId[it.slug])
          .map((it) => ({ id: tagSlugToId[it.slug] })) as ITag[];

        // gallery
        product.gallery = product.gallery
          .filter((it) => fileUrlToId[it.url])
          .map((it) => ({ id: fileUrlToId[it.url] })) as IMediaFile[];

        product.attributes = product.attributes.map((attribute) => {
          return {
            ...attribute,
            id: featureGroupsMapping[attribute.title].id,
            features: attribute.features.map((feature) => ({
              ...feature,
              id: featureGroupsMapping[attribute.title].features[feature.title],
            })),
          };
        });

        // cover
        product.cover = product.gallery[0] || null;
        product.variants = product.variants.map((variant) => {
          let cover: IMediaFile | null = null;

          if (variant?.cover?.url) {
            const coverId = fileUrlToId[variant.cover.url];
            cover = coverId ? ({ id: coverId } as IMediaFile) : null;
          }

          return {
            ...variant,
            categories: product.categories,
            tags: product.tags,
            gallery: product.gallery,
            cover,
            options: variant.options.map(({ group, title, ...option }) => ({
              ...option,
              title,
              id: featureGroupsMapping[group.title].features[title],
              group: {
                ...group,
                id: featureGroupsMapping[group.title].id,
              },
            })),
          };
        });

        return getCreateProductPayload({
          data: getProductFormValues(product),
        });
      });

      await uploadProducts(payloads, csvProducts.map(mapEntryId));
    };

    const chunkSize = 5;
    let idx = 0;

    while (idx < products.length) {
      const max = idx + chunkSize;
      const chunk = products.slice(idx, max);

      await processItems(chunk);
      idx += chunkSize;
    }
  };
};
