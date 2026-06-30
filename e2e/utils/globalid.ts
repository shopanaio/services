export interface GlobalID {
  namespace: string;
  typeName: string;
  id: string;
}

/**
 * ComposeGlobalID creates a Relay-compliant Global ID by encoding
 * a Shopify-like URL "gid://<namespace>/<typeName>/<id>" in base64.
 * @param namespace
 * @param typeName
 * @param id
 */
export function composeGlobalId(typeName: string, id: string): string {
  const raw = `gid://shopana/${typeName}/${id}`;
  return Buffer.from(raw).toString('base64');
}

/**
 * ParseGlobalID decodes a Relay Global ID and returns a GlobalID struct.
 * @param globalId
 */
export function parseGlobalId(globalId: string): GlobalID {
  const decoded = Buffer.from(globalId, 'base64').toString('ascii');
  const globalIdRegex = /^gid:\/\/([^/]+)\/([^/]+)\/([^/]+)$/;
  const matches = decoded.match(globalIdRegex);

  if (!matches || matches.length !== 4) {
    throw new Error(`Invalid Global ID format: ${decoded}`);
  }

  return {
    namespace: matches[1],
    typeName: matches[2],
    id: matches[3],
  };
}

export const encodeGlobalId = composeGlobalId;
export const decodeGlobalId = parseGlobalId;

export const TypeName = {
  Address: 'Address',
  ApiKey: 'ApiKey',
  Article: 'Article',
  AvailabilityFacet: 'AvailabilityFacet',
  Cart: 'Cart',
  CartLine: 'CartLine',
  Category: 'Category',
  CategoryListingFilter: 'CategoryListingFilter',
  Collection: 'Collection',
  Currency: 'Currency',
  Customer: 'Customer',
  Feature: 'Feature',
  FeatureGroup: 'FeatureGroup',
  File: 'File',
  Filter: 'Filter',
  Link: 'Link',
  ListingFilterEntry: 'ListingFilterEntry',
  Media: 'Media',
  Menu: 'Menu',
  MenuItem: 'MenuItem',
  Order: 'Order',
  Page: 'Page',
  Payment: 'Payment',
  PaymentMethod: 'PaymentMethod',
  PriceFacet: 'PriceFacet',
  Product: 'Product',
  ProductVariant: 'ProductVariant',
  ProductGroup: 'ProductGroup',
  Project: 'Project',
  Review: 'Review',
  ShippingMethod: 'ShippingMethod',
  StockStatus: 'StockStatus',
  Store: 'Store',
  Tag: 'Tag',
  Tenant: 'Tenant',
  User: 'User',
  Variant: 'Variant',
  WarehouseStock: 'WarehouseStock',
} as const;
