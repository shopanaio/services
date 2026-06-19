import fs from 'fs';
import path from 'path';
import type { CategoryData, TagData, FeatureGroupData, ProductDataWithFeatures } from './seed-data';

export interface ReviewTemplate {
  rating: number;
  title: string;
  message: string;
  pros: string;
  cons: string;
}

const dataDir = path.resolve(process.cwd(), 'data', 'seed-json');

function readJsonFile<T = unknown>(filePath: string): T {
  const raw = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(raw) as T;
}

function readJsonDir<T>(subDir: string): T[] {
  const dirPath = path.join(dataDir, subDir);
  const files = fs.readdirSync(dirPath).filter((f) => f.endsWith('.json'));
  return files.map((file) => readJsonFile<T>(path.join(dirPath, file)));
}

export const CATEGORIES: CategoryData[] = readJsonDir('categories');
export const TAGS: TagData[] = readJsonDir('tags');
export const FEATURE_GROUPS: FeatureGroupData[] = readJsonDir('feature-groups');
export const PRODUCTS: ProductDataWithFeatures[] = readJsonDir('products');
export const REVIEW_TEMPLATES: ReviewTemplate[] = readJsonDir('review-templates');
