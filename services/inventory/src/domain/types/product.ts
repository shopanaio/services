/**
 * Product domain types - matches GraphQL schema
 */

import type { Timestamps, SoftDeletable } from "./common.js";
import type { Variant } from "./variant.js";
import type { Option } from "./options.js";
import type { Feature } from "./features.js";

/**
 * Product description in multiple formats
 */
export interface Description {
  /** Plain text description */
  text: string;
  /** HTML description */
  html: string;
  /** EditorJS JSON description */
  json: unknown;
}

/**
 * A product represents an item that can be sold
 */
export interface Product extends Timestamps, SoftDeletable {
  /** UUID of the product */
  id: string;
  /** The URL-friendly handle for the product */
  handle: string | null;
  /** The date and time when the product was published, or null if unpublished */
  publishedAt: Date | null;
  /** Whether the product is currently published */
  isPublished: boolean;

  /** Product title */
  title: string;
  /** Product description */
  description: Description | null;
  /** Short excerpt */
  excerpt: string | null;
  /** SEO title */
  seoTitle: string | null;
  /** SEO description */
  seoDescription: string | null;

  /** The variants of this product */
  variants: Variant[];
  /** The options available for this product */
  options: Option[];
  /** The features of this product */
  features: Feature[];
}
