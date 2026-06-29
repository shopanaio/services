/* eslint-disable @typescript-eslint/no-explicit-any */
import type { ApiProduct, ApiRichTextInput, ApiVariant } from '@codegen/admin-gql';
import type { AdminApiFixture } from '@fixtures/admin/api';
import { slugify } from '@utils/transliterate';
import path from 'path';
import fs from 'fs';
import type { CategoryData, ProductDataWithFeatures, TagData } from './seed-data';

type SeedApiFixture = AdminApiFixture;

export interface ReviewTemplate {
  rating: number;
  title: string;
  message: string;
  pros: string;
  cons: string;
}

function richText(text: string): ApiRichTextInput {
  return {
    html: text ? `<p>${text}</p>` : '',
    json: {
      data: {
        type: 'doc',
        content: text
          ? [
              {
                type: 'paragraph',
                attrs: {
                  nodeIndent: null,
                  nodeTextAlignment: null,
                  nodeLineHeight: null,
                  style: '',
                },
                content: [{ type: 'text', text }],
              },
            ]
          : [],
      },
    },
    text,
  };
}

function productVariants(product: ApiProduct): ApiVariant[] {
  return product.variants.edges.map((edge) => edge.node);
}

/**
 * Upload images from images directory recursively.
 * Returns a map of image filename to file ID.
 */
export async function uploadImages(api: SeedApiFixture, dataDir: string): Promise<Record<string, string>> {
  console.log('🖼️  Starting to upload images...');
  const imageMap: Record<string, string> = {};
  const imagesDir = path.join(dataDir, 'images');

  if (!fs.existsSync(imagesDir)) {
    console.log('⚠️  Images directory not found, skipping image upload');
    return imageMap;
  }

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
      const fileName = path.basename(filePath);
      const baseName = path.basename(fileName, path.extname(fileName));
      imageMap[baseName] = fileId;

      console.log(`✓ Uploaded image: ${fileName} -> ${fileId}`);
    } catch (error: any) {
      console.log(`Failed to upload image ${path.basename(filePath)}, continuing...`, error.message);
    }
  }

  console.log(`🖼️  Finished uploading images. Uploaded: ${Object.keys(imageMap).length}`);
  return imageMap;
}

export async function seedCategories(api: SeedApiFixture, categories: CategoryData[]): Promise<Record<string, string>> {
  console.log('🏷️ Starting to seed categories...');
  const categoryMap: Record<string, string> = {};

  for (const categoryData of categories) {
    try {
      const category = await api.category.create({
        handle: categoryData.slug,
        name: categoryData.title,
        description: richText(categoryData.description),
        publish: true,
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
            handle: childSlug,
            name: childTitle,
            parentId: categoryMap[categoryData.slug],
            publish: true,
          });

          categoryMap[childSlug] = childCategory.id;
          console.log(`✓ Created child category: ${childTitle} (${childSlug})`);
        } catch (error: any) {
          console.log(`Failed to create child category ${childSlug}, continuing...`, error);
        }
      }
    }
  }

  console.log(`🏷️ Finished seeding categories. Created: ${Object.keys(categoryMap).length}`);
  return categoryMap;
}

export async function seedTags(api: SeedApiFixture, tags: TagData[]): Promise<Record<string, string>> {
  console.log('🏷️ Starting to seed tags...');
  const tagMap: Record<string, string> = {};

  for (const tagData of tags) {
    try {
      const tag = await api.tag.create({
        handle: tagData.slug,
        name: tagData.title,
      });

      tagMap[tagData.slug] = tag.id;
      console.log(`✓ Created tag: ${tagData.title} (${tagData.slug})`);
    } catch (error: any) {
      console.log(`Failed to create tag ${tagData.slug}, continuing...`, error);
    }
  }

  console.log(`🏷️ Finished seeding tags. Created: ${Object.keys(tagMap).length}`);
  return tagMap;
}

export async function seedProducts(
  api: SeedApiFixture,
  categoryMap: Record<string, string>,
  tagMap: Record<string, string>,
  imageMap: Record<string, string>,
  products: ProductDataWithFeatures[],
): Promise<Record<string, ApiProduct>> {
  console.log('📦 Starting to seed products...');
  const productMap: Record<string, ApiProduct> = {};
  const availableImageIds = Object.values(imageMap);
  let imageIndex = 0;

  const getNextImageId = (): string | null => {
    if (availableImageIds.length === 0) return null;
    const imageId = availableImageIds[imageIndex % availableImageIds.length];
    imageIndex++;
    return imageId;
  };

  const getGalleryImages = (coverId: string | null): string[] => {
    if (!coverId || availableImageIds.length === 0) return [];

    const gallery = [coverId];
    const remainingImages = availableImageIds.filter((id) => id !== coverId);
    const shuffled = [...remainingImages].sort(() => Math.random() - 0.5);
    const additionalImages = shuffled.slice(0, Math.min(4, shuffled.length));

    return [...gallery, ...additionalImages];
  };

  for (const productData of products) {
    const tagIds = (productData.tags ?? []).map((tagSlug) => tagMap[tagSlug]).filter(Boolean);
    const basePriceCents = Math.round((productData.price || 0) * 100);
    const categoryId = categoryMap[productData.category];
    const slugBasedImageId = imageMap[productData.slug];
    const coverId = slugBasedImageId ?? getNextImageId();

    try {
      let product: ApiProduct;

      if (productData.featureGroups && productData.featureGroups.length > 0) {
        const options = productData.featureGroups.map((featureGroup) => ({
          title: featureGroup.slug.charAt(0).toUpperCase() + featureGroup.slug.slice(1),
          slug: featureGroup.slug,
          values: featureGroup.values,
        }));

        product = await api.product.createWithOptions({
          title: productData.title,
          handle: productData.slug,
          status: 'PUBLISHED',
          price: basePriceCents,
          mediaFileIds: getGalleryImages(coverId),
          description: richText(productData.description),
          excerpt: richText(''),
          options,
        });

        const variants = productVariants(product);
        const variantMediaUpdates = variants
          .map((variant, index) => {
            const variantCoverId = index === 0 ? coverId : getNextImageId();
            const fileIds = getGalleryImages(variantCoverId);

            if (fileIds.length === 0) {
              return null;
            }

            return {
              action: 'UPDATE' as const,
              variantId: variant.id,
              media: { fileIds },
            };
          })
          .filter((item): item is NonNullable<typeof item> => item !== null);

        const categoryOperations = categoryId ? [{ action: 'ADD' as const, categoryId }] : [];
        const tagOperations = tagIds.map((tagId) => ({ action: 'ADD' as const, tagId }));

        if (categoryOperations.length > 0 || tagOperations.length > 0 || variantMediaUpdates.length > 0) {
          product = await api.product.update({
            productId: product.id,
            expectedRevision: product.revision,
            operations: {
              ...(categoryOperations.length > 0 ? { categories: categoryOperations } : {}),
              ...(tagOperations.length > 0 ? { tags: tagOperations } : {}),
              ...(variantMediaUpdates.length > 0 ? { variants: variantMediaUpdates } : {}),
            },
          });
        }
      } else {
        const mediaFileIds = getGalleryImages(coverId);

        product = await api.product.create({
          input: {
            title: productData.title,
            handle: productData.slug,
            description: richText(productData.description),
            excerpt: richText(''),
            mediaFileIds,
            inventoryItem: {
              tracked: true,
              sku: productData.slug,
            },
          },
        });

        const categoryOperations = categoryId ? [{ action: 'ADD' as const, categoryId }] : [];
        const tagOperations = tagIds.map((tagId) => ({ action: 'ADD' as const, tagId }));
        const variantOperations = productVariants(product).map((variant) => ({
          action: 'UPDATE' as const,
          variantId: variant.id,
          pricing: {
            amountMinor: basePriceCents,
            currency: 'USD' as const,
          },
          ...(mediaFileIds.length > 0 ? { media: { fileIds: mediaFileIds } } : {}),
        }));

        product = await api.product.update({
          productId: product.id,
          expectedRevision: product.revision,
          operations: {
            status: 'PUBLISHED',
            ...(categoryOperations.length > 0 ? { categories: categoryOperations } : {}),
            ...(tagOperations.length > 0 ? { tags: tagOperations } : {}),
            variants: variantOperations,
          },
        });
      }

      productMap[product.handle] = product;
      console.log(`✓ Created product: ${product.title} (${product.handle}) with ${productVariants(product).length} variants`);
    } catch (error: any) {
      console.log(`Failed to create product ${productData.slug}, continuing...`, error);
    }
  }

  const productsWithLegacyGroups = products.filter((productData) => productData.groups && productData.groups.length > 0);
  if (productsWithLegacyGroups.length > 0) {
    console.log(
      `Skipping legacy product groups for ${productsWithLegacyGroups.length} products: current catalog API uses bundle mutations instead of product.groups`,
    );
  }

  console.log(`📦 Finished seeding products. Created: ${Object.keys(productMap).length}`);
  return productMap;
}

export async function seedCustomers(api: SeedApiFixture): Promise<string[]> {
  console.log('👥 Starting to seed customers...');
  if (!('customer' in api)) {
    console.log('Customer fixture is not available in the current admin API, skipping customers');
    return [];
  }

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
      const customer = await (api as any).customer.create({
        ...customerData,
        password: 'Test123!',
        isVerified: true,
        language: 'ru',
      });

      customerIds.push(customer.id);
      console.log(`✓ Created customer: ${customerData.firstName} ${customerData.lastName} (${customerData.email})`);
    } catch (error: any) {
      console.log(`Failed to create customer ${customerData.email}, continuing...`, error);
    }
  }

  console.log(`👥 Finished seeding customers. Created: ${customerIds.length}`);
  return customerIds;
}

export async function seedReviews(
  adminApi: SeedApiFixture,
  productIds: string[],
  customerIds: string[],
  reviewTemplates: ReviewTemplate[],
): Promise<void> {
  console.log(`⭐ Starting to seed reviews. Products: ${productIds.length}, Customers: ${customerIds.length}`);
  if (!('review' in adminApi)) {
    console.log('Review fixture is not available in the current admin API, skipping reviews');
    return;
  }

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
      const variantId = productVariants(product)[0]?.id;
      if (!variantId) {
        console.log(`No variants found for product ${productId}, skipping`);
        continue;
      }

      const reviewCount = Math.min(reviewTemplates.length, customerIds.length, reviewerNames.length);

      for (let j = 0; j < reviewCount; j++) {
        const customerId = customerIds[j];
        const reviewerName = reviewerNames[j];
        const reviewTemplate = reviewTemplates[j];

        try {
          const id = await (adminApi as any).review.create({
            productId: variantId,
            customerId,
            rating: reviewTemplate.rating,
            title: reviewTemplate.title,
            message: reviewTemplate.message,
            pros: reviewTemplate.pros,
            cons: reviewTemplate.cons,
            locale: 'ru',
            displayName: reviewerName,
          });

          await (adminApi as any).review.update({
            input: {
              id,
              productId: variantId,
              customerId,
              displayName: reviewerName,
              status: 'APPROVED',
            },
          });
          console.log(`✓ Created review: ${reviewTemplate.title} (${reviewTemplate.rating}/5) by ${reviewerName}`);
        } catch (error: any) {
          console.log(`Failed to create review for product ${variantId} from ${reviewerName}, continuing...`, error);
        }
      }
    } catch (error: any) {
      console.log(`Failed to find product ${productId}, continuing...`, error);
    }
  }
  console.log('⭐ Finished seeding reviews');
}

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
  adminApi: SeedApiFixture,
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
    productIds = Object.values(productMap).map((product) => product.id);
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
