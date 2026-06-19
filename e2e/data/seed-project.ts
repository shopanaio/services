/* eslint-disable @typescript-eslint/no-explicit-any */
import type {
  ApiProduct } from '@codegen/admin-gql';
import {
  DimensionUnit,
  EntityStatus,
  ListingSort,
  ListingType,
  ReviewStatus,
  WeightUnit,
} from '@codegen/admin-gql';
import type { TenantApiFixture } from '@fixtures/admin/api';
import type { CategoryData, TagData, ProductDataWithFeatures } from './seed-data';
import { slugify } from '@utils/transliterate';
import path from 'path';
import fs from 'fs';

export interface ReviewTemplate {
  rating: number;
  title: string;
  message: string;
  pros: string;
  cons: string;
}

/**
 * Upload images from images directory recursively.
 * Returns a map of image filename to file ID.
 */
export async function uploadImages(api: TenantApiFixture, dataDir: string): Promise<Record<string, string>> {
  console.log('🖼️  Starting to upload images...');
  const imageMap: Record<string, string> = {};

  const imagesDir = path.join(dataDir, 'images');

  if (!fs.existsSync(imagesDir)) {
    console.log('⚠️  Images directory not found, skipping image upload');
    return imageMap;
  }

  // Recursively find all image files
  const findImages = (dir: string): string[] => {
    const results: string[] = [];
    const files = fs.readdirSync(dir);

    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);

      if (stat.isDirectory()) {
        results.push(...findImages(filePath));
      } else {
        const ext = path.extname(file).toLowerCase();
        if (['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext)) {
          results.push(filePath);
        }
      }
    }

    return results;
  };

  const imageFiles = findImages(imagesDir);
  console.log(`Found ${imageFiles.length} images to upload`);

  for (const filePath of imageFiles) {
    try {
      const fileId = await api.file.createFromFile(filePath);

      // Store by filename without extension (to match with product slugs)
      const fileName = path.basename(filePath);
      const baseName = path.basename(fileName, path.extname(fileName));
      imageMap[baseName] = fileId;

      console.log(`✓ Uploaded image: ${fileName} -> ${fileId}`);
    } catch (error: any) {
      console.log(`Failed to upload image ${path.basename(filePath)}, continuing...`, error.message);
      continue;
    }
  }

  console.log(`🖼️  Finished uploading images. Uploaded: ${Object.keys(imageMap).length}`);
  return imageMap;
}

export async function seedCategories(api: TenantApiFixture, categories: CategoryData[]): Promise<Record<string, string>> {
  console.log('🏷️ Starting to seed categories...');
  const categoryMap: Record<string, string> = {};

  for (const categoryData of categories) {
    try {
      const category = await api.category.create({
        input: {
          title: categoryData.title,
          slug: categoryData.slug,
          description: {
            html: `<p>${categoryData.description}</p>`,
            json: JSON.stringify({ content: categoryData.description }),
            text: categoryData.description,
          },
          status: EntityStatus.Published,
          listingType: ListingType.Manual,
          includeChildrenProducts: false,
          listingOrderByStatus: false,
          listingFilters: [],
          listingOrderBy: ListingSort.Custom,
        },
      });

      categoryMap[categoryData.slug] = category.id;
      console.log(`✓ Created category: ${categoryData.title} (${categoryData.slug})`);
    } catch (error: any) {
      console.log(`Failed to create category ${categoryData.slug}, continuing...`, error);
      continue;
    }

    if (categoryData.children && categoryMap[categoryData.slug]) {
      for (const childTitle of categoryData.children) {
        const childSlug = `${categoryData.slug}-${slugify(childTitle)}`;
        try {
          const childCategory = await api.category.create({
            input: {
              title: childTitle,
              slug: childSlug,
              parentId: categoryMap[categoryData.slug],
              status: EntityStatus.Published,
              listingType: ListingType.Manual,
              includeChildrenProducts: false,
              listingOrderByStatus: false,
              listingFilters: [],
              listingOrderBy: ListingSort.Custom,
            },
          });

          categoryMap[childSlug] = childCategory.id;
          console.log(`✓ Created child category: ${childTitle} (${childSlug})`);
        } catch (error: any) {
          console.log(`Failed to create child category ${childSlug}, continuing...`, error);
          continue;
        }
      }
    }
  }

  console.log(`🏷️ Finished seeding categories. Created: ${Object.keys(categoryMap).length}`);
  return categoryMap;
}

export async function seedTags(api: TenantApiFixture, tags: TagData[]): Promise<Record<string, string>> {
  console.log('🏷️ Starting to seed tags...');
  const tagMap: Record<string, string> = {};

  for (const tagData of tags) {
    try {
      const tag = await api.tag.create({
        input: {
          title: tagData.title,
          slug: tagData.slug,
        },
      });

      tagMap[tagData.slug] = tag.id;
      console.log(`✓ Created tag: ${tagData.title} (${tagData.slug})`);
    } catch (error: any) {
      console.log(`Failed to create tag ${tagData.slug}, continuing...`, error);
      continue;
    }
  }

  console.log(`🏷️ Finished seeding tags. Created: ${Object.keys(tagMap).length}`);
  return tagMap;
}

export async function seedProducts(
  api: TenantApiFixture,
  categoryMap: Record<string, string>,
  tagMap: Record<string, string>,
  imageMap: Record<string, string>,
  products: ProductDataWithFeatures[],
): Promise<Record<string, ApiProduct>> {
  console.log('📦 Starting to seed products...');
  const productMap: Record<string, ApiProduct> = {};

  // Convert imageMap to array for random selection
  const availableImageIds = Object.values(imageMap);
  let imageIndex = 0;

  // Helper to get next image ID
  const getNextImageId = (): string | null => {
    if (availableImageIds.length === 0) return null;
    const imageId = availableImageIds[imageIndex % availableImageIds.length];
    imageIndex++;
    return imageId;
  };

  // Helper to get random images for gallery (cover + 4 random images)
  const getGalleryImages = (coverId: string | null): string[] => {
    if (!coverId || availableImageIds.length === 0) return [];

    const gallery = [coverId];
    const remainingImages = availableImageIds.filter((id) => id !== coverId);

    // Add up to 4 random images
    const shuffled = [...remainingImages].sort(() => Math.random() - 0.5);
    const additionalImages = shuffled.slice(0, Math.min(4, shuffled.length));

    return [...gallery, ...additionalImages];
  };

  for (const productData of products) {
    const tagIds = (productData.tags ?? []).map((tagSlug) => tagMap[tagSlug]).filter(Boolean);
    const basePriceCents = Math.round((productData.price || 0) * 100);
    const categoryId = categoryMap[productData.category];
    const categoriesForVariant = categoryId ? [categoryId] : [];

    // Try to find image by product slug, otherwise use next available image
    let coverId: string | null = null;
    const slugBasedImageId = imageMap[productData.slug];
    if (slugBasedImageId) {
      coverId = slugBasedImageId;
    } else {
      coverId = getNextImageId();
    }

    let product: ApiProduct;

    try {
      if (productData.featureGroups && productData.featureGroups.length > 0) {
        // Продукт с опциями - используем новый API
        const options = productData.featureGroups.map((fg) => ({
          title: fg.slug.charAt(0).toUpperCase() + fg.slug.slice(1), // capitalize first letter
          slug: fg.slug,
          values: fg.values,
        }));

        product = await api.product.createWithOptions({
          title: productData.title,
          slug: productData.slug,
          status: EntityStatus.Published,
          price: basePriceCents,
          options: options,
        });

        // Добавляем категории и изображения к вариантам
        const hasCategories = categoriesForVariant.length > 0;
        const hasImages = coverId !== null;

        if (hasCategories || hasImages) {
          await api.product.update({
            input: {
              id: product.id,
              variants: {
                update: product.variants.map((variant, index) => {
                  // Для первого варианта используем основное изображение, для остальных - следующие
                  const variantCoverId = index === 0 ? coverId : getNextImageId();

                  return {
                    id: variant.id,
                    ...(hasCategories ? { categories: categoriesForVariant } : {}),
                    ...(variantCoverId ? {
                      coverId: variantCoverId,
                      gallery: getGalleryImages(variantCoverId),
                    } : {}),
                  };
                }),
              },
            },
          });

          // Обновляем локальный объект продукта
          const updatedProduct = await api.product.findOne(product.id);
          product = updatedProduct;
        }
      } else {
        // Простой продукт без опций
        product = await api.product.create({
          input: {
            title: productData.title,
            slug: productData.slug,
            status: EntityStatus.Published,
            requiresShipping: true,
            description: {
              html: `<p>${productData.description}</p>`,
              json: JSON.stringify({
                data: {
                  type: 'doc',
                  content: [
                    {
                      type: 'paragraph',
                      attrs: {
                        nodeIndent: null,
                        nodeTextAlignment: null,
                        nodeLineHeight: null,
                        style: '',
                      },
                      content: [
                        {
                          type: 'text',
                          text: productData.description,
                        },
                      ],
                    },
                  ],
                },
              }),
              text: productData.description,
            },

            excerpt: {
              html: '',
              json: { blocks: [] },
              text: '',
            },
            groups: [],
            tags: tagIds,
            variants: {
              create: [
                {
                  title: productData.title,
                  slug: productData.slug,
                  price: basePriceCents,
                  oldPrice: 0,
                  costPrice: 0,
                  sku: productData.slug,
                  stockStatus: 'IN_STOCK',
                  categories: categoriesForVariant,
                  inListing: true,
                  variantSortIndex: 0,
                  weight: 0,
                  weightUnit: WeightUnit.Gr,
                  width: 0,
                  height: 0,
                  length: 0,
                  dimensionUnit: DimensionUnit.Cm,
                  gallery: getGalleryImages(coverId),
                  coverId: coverId,
                },
              ],
            },
          },
        });
      }

      productMap[product.slug] = product;
      console.log(`✓ Created product: ${product.title} (${product.slug}) with ${product.variants.length} variants`);
    } catch (error: any) {
      console.log(`Failed to create product ${productData.slug}, continuing...`, error);
      continue;
    }
  }

  for (const productData of products) {
    if (!productData.groups || productData.groups.length === 0) {
      continue;
    }

    const mainProduct = productMap[productData.slug];
    if (!mainProduct) {
      continue;
    }

    const groupsToCreate = productData.groups.map((group) => {
      const items = group.items
        .map((item) => {
          const componentProduct = productMap[item.productSlug];
          if (!componentProduct) {
            return null;
          }

          let variant;

          const itemWithFeatures = item as any;
          if (itemWithFeatures.featureValues && itemWithFeatures.featureValues.length > 0) {
            // Найти вариант по заголовку, который содержит все значения фич
            const targetTitle = itemWithFeatures.featureValues.join(' ');
            variant = componentProduct.variants.find(
              (v) =>
                v.title.includes(targetTitle) ||
                itemWithFeatures.featureValues.every((value: string) => v.title.includes(value)),
            );

            if (!variant) {
              return null;
            }
          } else {
            const variantSlug = itemWithFeatures.variantSlug ?? item.productSlug;
            variant = componentProduct.variants.find((v) => v.slug === variantSlug);

            if (!variant) {
              return null;
            }
          }

          return {
            variantId: variant.id,
            sortIndex: item.sortIndex,
            priceType: item.priceType,
            priceAmountValue: item.priceAmountValue,
            pricePercentageValue: item.pricePercentageValue,
          };
        })
        .filter((item): item is NonNullable<typeof item> => item !== null);

      return {
        ...group,
        items,
      };
    });

    if (groupsToCreate.some((g) => g.items.length > 0)) {
      await api.product.update({
        input: {
          id: mainProduct.id,
          groups: {
            create: groupsToCreate,
          },
        },
      });
    }
  }

  console.log(`📦 Finished seeding products. Created: ${Object.keys(productMap).length}`);
  return productMap;
}

export async function seedCustomers(api: TenantApiFixture): Promise<string[]> {
  console.log('👥 Starting to seed customers...');
  const customerIds: string[] = [];

  const customers = [
    { firstName: 'Иван', lastName: 'Петров', email: 'ivan.petrov@example.com' },
    { firstName: 'Мария', lastName: 'Сидорова', email: 'maria.sidorova@example.com' },
    { firstName: 'Алексей', lastName: 'Козлов', email: 'alex.kozlov@example.com' },
    { firstName: 'Елена', lastName: 'Новикова', email: 'elena.novikova@example.com' },
    { firstName: 'Дмитрий', lastName: 'Смирнов', email: 'dmitry.smirnov@example.com' },
    { firstName: 'Ольга', lastName: 'Иванова', email: 'olga.ivanova@example.com' },
    { firstName: 'Андрей', lastName: 'Кузнецов', email: 'andrey.kuznetsov@example.com' },
    { firstName: 'Татьяна', lastName: 'Васильева', email: 'tatiana.vasileva@example.com' },
    { firstName: 'Сергей', lastName: 'Михайлов', email: 'sergey.mihajlov@example.com' },
    { firstName: 'Екатерина', lastName: 'Попова', email: 'ekaterina.popova@example.com' },
    { firstName: 'Павел', lastName: 'Федоров', email: 'pavel.fedorov@example.com' },
    { firstName: 'Наталья', lastName: 'Николаева', email: 'natalya.nikolaeva@example.com' },
    { firstName: 'Владимир', lastName: 'Смирнов', email: 'vladimir.smirnov@example.com' },
    { firstName: 'Евгения', lastName: 'Кузнецова', email: 'evgenia.kuznetsova@example.com' },
    { firstName: 'Дмитрий', lastName: 'Васильев', email: 'dmitry.vasilev@example.com' },
  ];

  for (const customerData of customers) {
    try {
      const customer = await api.customer.create({
        ...customerData,
        password: 'Test123!',
        isVerified: true,
        language: 'ru',
      });

      customerIds.push(customer.id);
      console.log(`✓ Created customer: ${customerData.firstName} ${customerData.lastName} (${customerData.email})`);
    } catch (error: any) {
      console.log(`Failed to create customer ${customerData.email}, continuing...`, error);
      continue;
    }
  }

  console.log(`👥 Finished seeding customers. Created: ${customerIds.length}`);
  return customerIds;
}

export async function seedReviews(
  adminApi: TenantApiFixture,
  productIds: string[],
  customerIds: string[],
  reviewTemplates: ReviewTemplate[],
): Promise<void> {
  console.log(`⭐ Starting to seed reviews. Products: ${productIds.length}, Customers: ${customerIds.length}`);

  if (productIds.length === 0) {
    console.log('No products found, skipping reviews');
    return;
  }

  if (customerIds.length === 0) {
    console.log('No customers found, skipping reviews');
    return;
  }
  const reviewerNames = [
    'Александр К.',
    'Ольга М.',
    'Сергей П.',
    'Наталья В.',
    'Виктор Д.',
    'Елена С.',
    'Дмитрий В.',
    'Мария С.',
    'Алексей К.',
    'Елена Н.',
    'Дмитрий С.',
    'Ольга И.',
    'Андрей К.',
    'Татьяна В.',
    'Сергей М.',
  ];

  for (let i = 0; i < productIds.length; i++) {
    const productId = productIds[i];
    console.log(`Creating reviews for product ${i + 1}/${productIds.length}: ${productId}`);

    try {
      const product = await adminApi.product.findOne(productId);

      const variantId = product.variants[0]?.id;
      if (!variantId) {
        console.log(`No variants found for product ${productId}, skipping`);
        continue;
      }

    const reviewCount = reviewTemplates.length;

    for (let j = 0; j < reviewCount; j++) {
      const customerId = customerIds[j];
      const reviewerName = reviewerNames[j];
      const reviewTemplate = reviewTemplates[j];

      try {
        const id = await adminApi.review.create({
          productId: variantId,
          customerId: customerId,
          rating: reviewTemplate.rating,
          title: reviewTemplate.title,
          message: reviewTemplate.message,
          pros: reviewTemplate.pros,
          cons: reviewTemplate.cons,
          locale: 'ru',
          displayName: reviewerName,
        });

        await adminApi.review.update({
          input: {
            id,
            productId: variantId,
            customerId: customerId,
            displayName: reviewerName,
            status: ReviewStatus.Approved,
          },
        });
        console.log(`✓ Created review: ${reviewTemplate.title} (${reviewTemplate.rating}/5) by ${reviewerName}`);
        } catch (error: any) {
          console.log(`Failed to create review for product ${variantId } from ${reviewerName}, continuing...`, error);
          continue;
        }
      }
    } catch (error: any) {
      console.log(`Failed to find product ${productId}, continuing...`, error);
      continue;
    }
  }
  console.log(`⭐ Finished seeding reviews`);
}

/**
 * Load data from specified directory
 */
function loadSeedData(dataDir: string) {
  const readJsonFile = <T = unknown>(filePath: string): T => {
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw) as T;
  };

  const readJsonDir = <T>(subDir: string): T[] => {
    const dirPath = path.join(dataDir, subDir);
    if (!fs.existsSync(dirPath)) {
      return [];
    }
    const files = fs.readdirSync(dirPath).filter((f) => f.endsWith('.json'));
    return files.map((file) => readJsonFile<T>(path.join(dirPath, file)));
  };

  const categories = readJsonDir<CategoryData>('categories');
  const tags = readJsonDir<TagData>('tags');
  const products = readJsonDir<ProductDataWithFeatures>('products');
  const reviewTemplates = readJsonDir<ReviewTemplate>('review-templates');

  return { categories, tags, products, reviewTemplates };
}

export async function seedProject(
  adminApi: TenantApiFixture,
  dataDir: string,
  options: { seedReviews?: boolean; seedCustomers?: boolean } = {},
): Promise<void> {
  const { seedReviews: shouldSeedReviews = true, seedCustomers: shouldSeedCustomers = true } = options;

  console.log(`\n📂 Loading data from: ${dataDir}`);
  const { categories, tags, products, reviewTemplates } = loadSeedData(dataDir);
  console.log(`   Categories: ${categories.length}, Tags: ${tags.length}, Products: ${products.length}`);

  let categoryMap: Record<string, string> = {};
  let tagMap: Record<string, string> = {};
  let imageMap: Record<string, string> = {};
  let productMap: Record<string, ApiProduct> = {};
  let productIds: string[] = [];
  let customerIds: string[] = [];

  try {
    imageMap = await uploadImages(adminApi, dataDir);
  } catch (error) {
    console.log('Error uploading images, continuing...', error);
  }

  try {
    categoryMap = await seedCategories(adminApi, categories);
  } catch (error) {
    console.log('Error seeding categories, continuing...', error);
  }

  try {
    tagMap = await seedTags(adminApi, tags);
  } catch (error) {
    console.log('Error seeding tags, continuing...', error);
  }

  try {
    productMap = await seedProducts(adminApi, categoryMap, tagMap, imageMap, products);
    productIds = Object.values(productMap).map((p) => p.id);
    console.log(`Created ${productIds.length} products`);
  } catch (error) {
    console.log('Error seeding products, continuing...', error);
  }

  if (shouldSeedCustomers) {
    try {
      customerIds = await seedCustomers(adminApi);
      console.log(`Created ${customerIds.length} customers`);
    } catch (error) {
      console.log('Error seeding customers, continuing...', error);
    }
  }

  if (shouldSeedReviews && reviewTemplates.length > 0 && productIds.length > 0 && customerIds.length > 0) {
    try {
      await seedReviews(adminApi, productIds, customerIds, reviewTemplates);
    } catch (error) {
      console.log('Error seeding reviews, continuing...', error);
    }
  }
}
