import { slugify } from '@components/forms/slug/slugify';
import {
  IShopifyRecord,
  OptionNames,
  FeatureGroupsMapping,
  OptionValues,
} from '@modules/csv/utils/Shopify/fields';
import { ID } from '@modules/csv/utils/idCache';
import { StockStatuses } from '@src/defs/constants';
import { ILocale } from '@src/entity/Locale/Locale';
import {
  ApiFile,
  ApiProductFeature,
  WeightUnit,
  FileDriver,
  ListingSort,
  ApiTranslation,
  ApiProduct,
  ApiVariant,
  FeatureStyleType,
  EntityStatus,
} from '@src/graphql';
import { getFileExtensionFromUrl, getFilenameFromUrl } from '@src/utils/utils';

export const getDraftDates = () => ({
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

export const createDraftFile = (url: string): ApiFile | null => {
  if (!url) {
    return null;
  }

  const name = getFilenameFromUrl(url);
  const ext = getFileExtensionFromUrl(url);

  return {
    id: ID.next(),
    ...getDraftDates(),
    driver: FileDriver.Url,
    ext,
    name,
    size: 0,
    url,
    key: '', // TODO: Remove this field
  };
};

const createDraftFiles = (urls: string[]): ApiFile[] => {
  return urls.map(createDraftFile).filter((f) => f) as ApiFile[];
};

export const createDraftGalleryFile = (file: ApiFile, idx: number) => ({
  file,
  id: ID.next(),
  sortIndex: idx,
});

export const createDraftContent = (
  content: {
    title: string;
    description?: string;
    excerpt?: string;
  },
  locales: ILocale[],
): ApiTranslation[] => {
  return locales.map((locale) => {
    return {
      id: ID.next(),
      locale: locale.code,
      title: content.title,
      description: content.description,
      excerpt: content.excerpt,
    };
  });
};

export const createDraftCategory = (category: string) => {
  return {
    title: category,
    slug: slugify(category || ''),
    status: EntityStatus.Draft,
    id: ID.next(),
    listingOrderBy: ListingSort.CreatedAtDesc,
    ...getDraftDates(),
    parent: null,
    children: [],
    products: [],
    cover: null,
    categoryType: null,
  };
};

export const createDraftTag = (tag: string) => {
  return {
    title: tag,
    slug: slugify(tag || ''),
    id: ID.next(),
    ...getDraftDates(),
  };
};

export const transformCsvRecordToApiProduct = (
  containerRecord: IShopifyRecord,
  variantRecords: IShopifyRecord[],
) => {
  const containerId = ID.next();

  const categories = (containerRecord.collection || []).map(
    (collection: string) => {
      return createDraftCategory(collection);
    },
  );

  const tags = (containerRecord.tags || []).map((tag: string) => {
    return createDraftCategory(tag);
  });

  const slug = slugify(containerRecord.title || '');
  const files = createDraftFiles(containerRecord.imageSrc || []);

  /**
   * Option name are only on the first record
   */
  const apiFeatureGroups: ApiFeatureGroup[] = OptionNames
    // 'Title' is a default name for single option product
    .filter((k) => containerRecord[k] && containerRecord[k] !== 'Title')
    .map((k) => {
      if (FeatureGroupsMapping[containerRecord[k]]) {
        return FeatureGroupsMapping[containerRecord[k]];
      }

      FeatureGroupsMapping[k] = {
        title: containerRecord[k] || 'unknown',
        features: [],
        // Internals
        id: ID.next(),
        type: FeatureStyleType.Radio,
        ...getDraftDates(),
      };

      return FeatureGroupsMapping[k];
    });

  /**
   * TODO: Filter variants because shopify csv allows to add records for images
   */
  const variants: ApiVariant[] = [containerRecord, ...variantRecords].map(
    (variant, variantSortIndex) => {
      const features: ApiProductFeature[] = [];
      let featureIndex = 0;

      OptionValues.forEach((k, idx) => {
        if (!apiFeatureGroups[idx]) {
          return;
        }

        const featureGroup = apiFeatureGroups[idx];
        let feature: ApiFeature = featureGroup.features.find(
          (f) => f.title === variant[k],
        )!;

        if (!feature) {
          feature = {
            title: variant[k] || 'unknown',
            group: featureGroup,
            // Internals
            color: null,
            sortIndex: idx,
            id: ID.next(),
            ...getDraftDates(),
          };

          featureGroup.features.push(feature);
        }

        features.push({
          attributeSortIndex: featureIndex,
          optionSortIndex: featureIndex,
          feature,
          isAttribute: true,
          isOption: true,
          ...getDraftDates(),
        });

        featureIndex += 1;
      });

      return {
        // TODO:
        weightUnit: WeightUnit.Gr,
        weight: 0,
        costPrice: 0, // TODO: Add cost price
        // Taxonomy
        tags,
        categories,
        // Title
        title: variant.title || containerRecord.title,
        slug: `${slug}_${features
          .map((f) => f.feature.title)
          .sort()
          .join('_')}`,
        // Media
        gallery: files,
        cover: variant.imageSrc.length
          ? createDraftFile(variant.imageSrc?.[0])
          : files[0] || null,
        oldPrice:
          variant.variantCompareAtPrice ||
          containerRecord.variantCompareAtPrice ||
          0,
        // Fields
        status: EntityStatus.Draft,
        price: variant.variantPrice || containerRecord.variantPrice || 0,
        qnt: variant.variantInventoryQty || containerRecord.variantInventoryQty,
        sku: variant.variantSku,
        // Features
        features: features,
        // Internals
        containerId,
        variantSortIndex,
        stockStatus: StockStatuses.IN_STOCK,
        id: ID.next(),
        ...getDraftDates(),
      };
    },
  );

  const apiProduct: ApiProduct = {
    id: containerId,
    title: containerRecord.title,
    description: containerRecord.bodyHtml,
    excerpt: '',
    slug,
    variants,
    requiresShipping: true,
    status: EntityStatus.Draft,
    groups: [],
    ...getDraftDates(),
  };

  return apiProduct;
};
