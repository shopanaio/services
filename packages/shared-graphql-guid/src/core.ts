import { Buffer } from "node:buffer";

const BASE64_PATTERN = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}(?:==)?|[A-Za-z0-9+/]{3}=?)?$/;
export const GLOBAL_ID_PATTERN = /^gid:\/\/([^/]+)\/([^/]+)\/([^/]+)$/;
const GLOBAL_ID_PREFIX = "gid://";

/**
 * Represents a parsed Relay global identifier.
 */
export interface GlobalId {
  /** Namespace corresponds to the application namespace (e.g., "shopana"). */
  namespace: string;
  /** TypeName is the GraphQL type name (e.g., "Product"). */
  typeName: string;
  /** Id is the raw entity identifier (UUID or database primary key). */
  id: string;
}

/**
 * Creates a Relay-compliant global identifier encoded in base64.
 */
export function composeGlobalId(namespace: string, typeName: string, id: string): string {
  const raw = `${GLOBAL_ID_PREFIX}${namespace}/${typeName}/${id}`;
  return Buffer.from(raw, "utf8").toString("base64");
}

/**
 * Alias for composeGlobalId to mirror naming found in other languages.
 */
export function encodeGlobalId(namespace: string, typeName: string, id: string): string {
  return composeGlobalId(namespace, typeName, id);
}

/**
 * Decodes and validates a Relay global identifier.
 */
export function parseGlobalId(globalId: string): GlobalId {
  const decoded = decodeBase64(globalId);
  const match = GLOBAL_ID_PATTERN.exec(decoded);

  if (!match) {
    throw new Error(`Invalid Global ID format: ${decoded}`);
  }

  return {
    namespace: match[1],
    typeName: match[2],
    id: match[3],
  };
}

/**
 * Alias for parseGlobalId to mirror naming found in other languages.
 */
export function decodeGlobalId(globalId: string): GlobalId {
  return parseGlobalId(globalId);
}

function decodeBase64(value: string): string {
  const trimmed = value.trim();

  if (trimmed.length === 0) {
    throw new Error("Global ID cannot be empty.");
  }

  if (!BASE64_PATTERN.test(trimmed)) {
    throw new Error("Global ID is not a valid base64 string.");
  }

  try {
    return Buffer.from(trimmed, "base64").toString("utf8");
  } catch (error) {
    throw new Error(`Failed to decode Global ID: ${(error as Error).message}`);
  }
}

/**
 * The namespace used for all Global IDs in the Shopana platform
 */
export const GLOBAL_ID_NAMESPACE = "shopana" as const;

/**
 * Enum defining all available Global ID entity types in the system
 */
export enum GlobalIdEntity {
  // Checkout
  Checkout = "Checkout",
  CheckoutLine = "CheckoutLine",
  CheckoutDeliveryGroup = "CheckoutDeliveryGroup",
  CheckoutDeliveryAddress = "CheckoutDeliveryAddress",
  CheckoutTag = "CheckoutTag",
  CheckoutNotification = "CheckoutNotification",
  // Orders
  Order = "Order",
  OrderLine = "OrderLine",
  OrderDeliveryAddress = "OrderDeliveryAddress",
  // IAM
  User = "User",
  Customer = "Customer",
  Organization = "Organization",
  Application = "Application",
  ApplicationOAuthClient = "ApplicationOAuthClient",
  ApplicationUser = "ApplicationUser",
  ApplicationUserLinkedAccount = "ApplicationUserLinkedAccount",
  Role = "Role",
  Member = "Member",
  ApiKey = "ApiKey",
  Session = "Session",
  // Customers
  CustomerAddress = "CustomerAddress",
  CustomerTaxIdentifier = "CustomerTaxIdentifier",
  CustomerTaxExemption = "CustomerTaxExemption",
  CustomerConsent = "CustomerConsent",
  CustomerConsentEvent = "CustomerConsentEvent",
  CustomerGroup = "CustomerGroup",
  CustomerGroupMembership = "CustomerGroupMembership",
  CustomerTag = "CustomerTag",
  CustomerTagAssignment = "CustomerTagAssignment",
  CustomerSegment = "CustomerSegment",
  CustomerSegmentMembership = "CustomerSegmentMembership",
  CustomerMonetaryStatistics = "CustomerMonetaryStatistics",
  CustomerMerge = "CustomerMerge",
  CustomerDataRequest = "CustomerDataRequest",
  CustomerWishlist = "CustomerWishlist",
  CustomerWishlistItem = "CustomerWishlistItem",
  // Catalog
  Product = "Product",
  ProductVariant = "ProductVariant",
  Variant = "Variant",
  Vendor = "Vendor",
  Category = "Category",
  Tag = "Tag",
  Collection = "Collection",
  Facet = "Facet",
  FacetValue = "FacetValue",
  FacetSwatch = "FacetSwatch",
  SearchSynonymGroup = "SearchSynonymGroup",
  SearchProductBoost = "SearchProductBoost",
  Option = "Option",
  OptionCategory = "OptionCategory",
  OptionValue = "OptionValue",
  Feature = "Feature",
  FeatureValue = "FeatureValue",
  BulkUpdateItem = "BulkUpdateItem",
  ProductBulkUpdateJob = "ProductBulkUpdateJob",
  VariantPrice = "VariantPrice",
  SellingPlan = "SellingPlan",
  // Product components
  ProductComponentConfiguration = "ProductComponentConfiguration",
  ProductComponentGroup = "ProductComponentGroup",
  ProductComponentItem = "ProductComponentItem",
  ProductComponentItemOptionSelection = "ProductComponentItemOptionSelection",
  ProductComponentItemOptionValueSelection = "ProductComponentItemOptionValueSelection",
  ProductComponentPriceRule = "ProductComponentPriceRule",
  ProductComponentPricingTemplate = "ProductComponentPricingTemplate",
  ProductComponentDependencyRule = "ProductComponentDependencyRule",
  ProductComponentConditionGroup = "ProductComponentConditionGroup",
  ProductComponentCondition = "ProductComponentCondition",
  ProductComponentDependencyAction = "ProductComponentDependencyAction",
  // Inventory
  InventoryItem = "InventoryItem",
  Warehouse = "Warehouse",
  WarehouseStock = "WarehouseStock",
  // Pricing
  Discount = "Discount",
  DiscountCode = "DiscountCode",
  DiscountUsageReservation = "DiscountUsageReservation",
  DiscountRedemption = "DiscountRedemption",
  DiscountRedemptionAllocation = "DiscountRedemptionAllocation",
  DiscountExternalReference = "DiscountExternalReference",
  DiscountFunctionBinding = "DiscountFunctionBinding",
  // Loyalty
  LoyaltyProgram = "LoyaltyProgram",
  LoyaltyProgramVersion = "LoyaltyProgramVersion",
  LoyaltyTier = "LoyaltyTier",
  LoyaltyAccount = "LoyaltyAccount",
  LoyaltyTierMembership = "LoyaltyTierMembership",
  LoyaltyTierMembershipEvent = "LoyaltyTierMembershipEvent",
  LoyaltyTransaction = "LoyaltyTransaction",
  LoyaltyLedgerEntry = "LoyaltyLedgerEntry",
  LoyaltyPointLot = "LoyaltyPointLot",
  LoyaltyLotAllocation = "LoyaltyLotAllocation",
  LoyaltyReservation = "LoyaltyReservation",
  LoyaltyReservationEvent = "LoyaltyReservationEvent",
  // Media
  File = "File",
  MediaAssetGroup = "MediaAssetGroup",
  Bucket = "Bucket",
  CdnConfiguration = "CdnConfiguration",
  CdnRoutingRule = "CdnRoutingRule",
  // Reviews
  ReviewStoreConfiguration = "ReviewStoreConfiguration",
  ReviewRatingCriterion = "ReviewRatingCriterion",
  ReviewRatingCriterionAssignment = "ReviewRatingCriterionAssignment",
  Review = "Review",
  ReviewMedia = "ReviewMedia",
  ReviewReply = "ReviewReply",
  ReviewRequest = "ReviewRequest",
  ReviewRequestEvent = "ReviewRequestEvent",
  ProductQuestion = "ProductQuestion",
  ProductQuestionAnswer = "ProductQuestionAnswer",
  ProductQuestionSubscription = "ProductQuestionSubscription",
  ReviewContentTranslation = "ReviewContentTranslation",
  ReviewContentPublication = "ReviewContentPublication",
  ReviewContentVote = "ReviewContentVote",
  ReviewContentReport = "ReviewContentReport",
  ReviewModerationCase = "ReviewModerationCase",
  ReviewModerationEvent = "ReviewModerationEvent",
  ReviewContentRevision = "ReviewContentRevision",
  ReviewModerationSignal = "ReviewModerationSignal",
  ReviewContentExternalReference = "ReviewContentExternalReference",
  // Apps
  AppInstallation = "AppInstallation",
  AppCapabilityBinding = "AppCapabilityBinding",
  AppLifecycleOperation = "AppLifecycleOperation",
  AppManifestSnapshot = "AppManifestSnapshot",
  HeadlessStorefrontConnection = "HeadlessStorefrontConnection",
  StorefrontCredential = "StorefrontCredential",
  SmtpConnection = "SmtpConnection",
  OnlineStorePage = "OnlineStorePage",
  OnlineStoreNavigationMenu = "OnlineStoreNavigationMenu",
  OnlineStoreNavigationMenuItem = "OnlineStoreNavigationMenuItem",
  // Project
  Store = "Store",
  Market = "Market",
}

/**
 * Type representing any valid Global ID entity type
 */
export type GlobalIdType = (typeof GlobalIdEntity)[keyof typeof GlobalIdEntity];
