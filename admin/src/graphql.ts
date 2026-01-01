export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  Any: { input: any; output: any; }
  FilterV2: { input: any; output: any; }
  JSON: { input: any; output: any; }
  Timestamp: { input: string; output: string; }
  Uint: { input: number; output: number; }
  Upload: { input: File; output: File; }
  Uuid: { input: string; output: string; }
};

export type ApiActor = ApiApiKey | ApiUser;

export type ApiAddCategoryProductsInput = {
  categoryId: Scalars['ID']['input'];
  productContainerIds: Array<Scalars['ID']['input']>;
};

export type ApiAddCommentInput = {
  comment: Scalars['String']['input'];
  id: Scalars['ID']['input'];
};

export type ApiAddress = {
  __typename?: 'Address';
  address1?: Maybe<Scalars['String']['output']>;
  address2?: Maybe<Scalars['String']['output']>;
  city?: Maybe<Scalars['String']['output']>;
  countryCode?: Maybe<Scalars['String']['output']>;
  email?: Maybe<Scalars['String']['output']>;
  firstName?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  lastName?: Maybe<Scalars['String']['output']>;
  latitude?: Maybe<Scalars['Int']['output']>;
  longitude?: Maybe<Scalars['Int']['output']>;
  meta?: Maybe<Scalars['String']['output']>;
  middleName?: Maybe<Scalars['String']['output']>;
  phone?: Maybe<Scalars['String']['output']>;
  postalCode?: Maybe<Scalars['String']['output']>;
  provinceCode?: Maybe<Scalars['String']['output']>;
};

export type ApiAddressInput = {
  address1?: InputMaybe<Scalars['String']['input']>;
  address2?: InputMaybe<Scalars['String']['input']>;
  city?: InputMaybe<Scalars['String']['input']>;
  countryCode?: InputMaybe<Scalars['String']['input']>;
  email?: InputMaybe<Scalars['String']['input']>;
  firstName?: InputMaybe<Scalars['String']['input']>;
  id?: InputMaybe<Scalars['ID']['input']>;
  lastName?: InputMaybe<Scalars['String']['input']>;
  latitude?: InputMaybe<Scalars['Int']['input']>;
  longitude?: InputMaybe<Scalars['Int']['input']>;
  meta?: InputMaybe<Scalars['String']['input']>;
  middleName?: InputMaybe<Scalars['String']['input']>;
  phone?: InputMaybe<Scalars['String']['input']>;
  postalCode?: InputMaybe<Scalars['String']['input']>;
  provinceCode?: InputMaybe<Scalars['String']['input']>;
};

export type ApiAddressWhereInput = {
  And?: InputMaybe<Array<ApiAddressWhereInput>>;
  Or?: InputMaybe<Array<ApiAddressWhereInput>>;
  address1?: InputMaybe<Scalars['FilterV2']['input']>;
  address2?: InputMaybe<Scalars['FilterV2']['input']>;
  city?: InputMaybe<Scalars['FilterV2']['input']>;
  countryCode?: InputMaybe<Scalars['FilterV2']['input']>;
  email?: InputMaybe<Scalars['FilterV2']['input']>;
  firstName?: InputMaybe<Scalars['FilterV2']['input']>;
  id?: InputMaybe<Scalars['FilterV2']['input']>;
  lastName?: InputMaybe<Scalars['FilterV2']['input']>;
  latitude?: InputMaybe<Scalars['FilterV2']['input']>;
  longitude?: InputMaybe<Scalars['FilterV2']['input']>;
  middleName?: InputMaybe<Scalars['FilterV2']['input']>;
  phoneNumber?: InputMaybe<Scalars['FilterV2']['input']>;
  postalCode?: InputMaybe<Scalars['FilterV2']['input']>;
  provinceCode?: InputMaybe<Scalars['FilterV2']['input']>;
};

export type ApiApiKey = {
  __typename?: 'ApiKey';
  createdAt: Scalars['Timestamp']['output'];
  createdBy: ApiUser;
  dueDate?: Maybe<Scalars['Timestamp']['output']>;
  id: Scalars['ID']['output'];
  isBanned: Scalars['Boolean']['output'];
  lastUsedAt?: Maybe<Scalars['Timestamp']['output']>;
  name: Scalars['String']['output'];
};

export type ApiApp = {
  __typename?: 'App';
  code: Scalars['String']['output'];
  meta?: Maybe<Scalars['JSON']['output']>;
  name: Scalars['String']['output'];
};

export type ApiApproveReviewInput = {
  id: Scalars['ID']['input'];
};

export type ApiAppsMutation = {
  __typename?: 'AppsMutation';
  /** Install app */
  install: Scalars['Boolean']['output'];
  /** Uninstall app */
  uninstall: Scalars['Boolean']['output'];
};


export type ApiAppsMutationInstallArgs = {
  code: Scalars['String']['input'];
};


export type ApiAppsMutationUninstallArgs = {
  code: Scalars['String']['input'];
};

export type ApiAppsQuery = {
  __typename?: 'AppsQuery';
  /** Get list of available apps for installation */
  apps: Array<ApiApp>;
  /** Get list of installed apps */
  installedApps: Array<ApiInstalledApp>;
};

export type ApiBulkDeleteInput = {
  entity: EntityType;
  ids: Array<Scalars['ID']['input']>;
};

export type ApiBulkMutation = {
  __typename?: 'BulkMutation';
  checkSlug: Scalars['Boolean']['output'];
  clear: Scalars['Boolean']['output'];
  delete: Scalars['Boolean']['output'];
  update: Scalars['Boolean']['output'];
};


export type ApiBulkMutationCheckSlugArgs = {
  input: ApiBulkUniqueSlugInput;
};


export type ApiBulkMutationDeleteArgs = {
  input: ApiBulkDeleteInput;
};


export type ApiBulkMutationUpdateArgs = {
  input: ApiBulkUpdateInput;
};

export type ApiBulkUniqueSlugInput = {
  entity: EntityType;
  slug: Scalars['String']['input'];
};

export type ApiBulkUpdateInput = {
  entity: EntityType;
  ids: Array<Scalars['ID']['input']>;
  status: Scalars['String']['input'];
};

export type ApiBulkUpdateStatusInput = {
  ids: Array<Scalars['ID']['input']>;
  status: Scalars['String']['input'];
};

export type ApiCancelOrderInput = {
  comment: Scalars['String']['input'];
  id: Scalars['ID']['input'];
  reason: CancelReasonEnum;
};

export enum CancelReasonEnum {
  Customer = 'CUSTOMER',
  Fraud = 'FRAUD',
  Inventory = 'INVENTORY',
  Other = 'OTHER',
  Staff = 'STAFF'
}

export type ApiCart = {
  __typename?: 'Cart';
  baseCurrencyCode?: Maybe<Scalars['String']['output']>;
  createdAt?: Maybe<Scalars['Timestamp']['output']>;
  discountTotalAmount?: Maybe<Scalars['Int']['output']>;
  displayCurrencyCode?: Maybe<Scalars['String']['output']>;
  displayExchangeRate?: Maybe<Scalars['Float']['output']>;
  grandTotalAmount?: Maybe<Scalars['Int']['output']>;
  id: Scalars['ID']['output'];
  items: Array<ApiCartItem>;
  shippingTotalAmount?: Maybe<Scalars['Int']['output']>;
  subtotalAmount?: Maybe<Scalars['Int']['output']>;
  taxTotalAmount?: Maybe<Scalars['Int']['output']>;
  totalQuantity?: Maybe<Scalars['Int']['output']>;
  updatedAt?: Maybe<Scalars['Timestamp']['output']>;
};

export type ApiCartItem = {
  __typename?: 'CartItem';
  children: Array<ApiCartItem>;
  compareAtUnitPrice?: Maybe<Scalars['Int']['output']>;
  createdAt: Scalars['Timestamp']['output'];
  discountAmount: Scalars['Int']['output'];
  id: Scalars['ID']['output'];
  purchasableId: Scalars['ID']['output'];
  purchasableSnapshot: ApiProductSnapshot;
  purchasableType: Scalars['String']['output'];
  quantity: Scalars['Int']['output'];
  subtotalAmount: Scalars['Int']['output'];
  taxAmount: Scalars['Int']['output'];
  totalAmount: Scalars['Int']['output'];
  unitPrice: Scalars['Int']['output'];
  updatedAt: Scalars['Timestamp']['output'];
};

export type ApiCartMutation = {
  __typename?: 'CartMutation';
  delete: Scalars['Boolean']['output'];
};


export type ApiCartMutationDeleteArgs = {
  id: Scalars['ID']['input'];
};

export type ApiCartQuery = {
  __typename?: 'CartQuery';
  findMany: ApiCartsOutput;
  findOne?: Maybe<ApiCart>;
};


export type ApiCartQueryFindManyArgs = {
  input?: InputMaybe<ApiCartsInput>;
};


export type ApiCartQueryFindOneArgs = {
  id: Scalars['ID']['input'];
};

export type ApiCartWhereInput = {
  And?: InputMaybe<Array<ApiCartWhereInput>>;
  Or?: InputMaybe<Array<ApiCartWhereInput>>;
  clientToken?: InputMaybe<Scalars['FilterV2']['input']>;
  customerId?: InputMaybe<Scalars['FilterV2']['input']>;
  id?: InputMaybe<Scalars['FilterV2']['input']>;
};

export type ApiCartsInput = {
  order?: InputMaybe<Scalars['String']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  pageSize?: InputMaybe<Scalars['Int']['input']>;
  where?: InputMaybe<ApiCartWhereInput>;
};

export type ApiCartsOutput = {
  __typename?: 'CartsOutput';
  data: Array<ApiCart>;
  meta: ApiCollectionMeta;
};

export type ApiCategoriesInput = {
  order?: InputMaybe<Scalars['String']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  pageSize?: InputMaybe<Scalars['Int']['input']>;
  where?: InputMaybe<ApiCategoriesWhereInput>;
};

export type ApiCategoriesOutput = {
  __typename?: 'CategoriesOutput';
  data: Array<ApiCategory>;
  meta: ApiCollectionMeta;
};

export type ApiCategoriesWhereInput = {
  And?: InputMaybe<Array<ApiCategoriesWhereInput>>;
  Or?: InputMaybe<Array<ApiCategoriesWhereInput>>;
  children?: InputMaybe<ApiCategoriesWhereInput>;
  createdAt?: InputMaybe<Scalars['FilterV2']['input']>;
  id?: InputMaybe<Scalars['FilterV2']['input']>;
  listingOrder?: InputMaybe<Scalars['FilterV2']['input']>;
  listingType?: InputMaybe<Scalars['FilterV2']['input']>;
  locale?: InputMaybe<Scalars['FilterV2']['input']>;
  parent?: InputMaybe<ApiCategoriesWhereInput>;
  products?: InputMaybe<ApiProductWhereInput>;
  slug?: InputMaybe<Scalars['FilterV2']['input']>;
  status?: InputMaybe<Scalars['FilterV2']['input']>;
  title?: InputMaybe<Scalars['FilterV2']['input']>;
  translationField?: InputMaybe<Scalars['FilterV2']['input']>;
  updatedAt?: InputMaybe<Scalars['FilterV2']['input']>;
};

export type ApiCategory = {
  __typename?: 'Category';
  children: Array<Maybe<ApiCategory>>;
  cover?: Maybe<ApiFile>;
  createdAt: Scalars['Timestamp']['output'];
  description?: Maybe<Scalars['String']['output']>;
  excerpt?: Maybe<Scalars['String']['output']>;
  gallery: Array<ApiFile>;
  id: Scalars['ID']['output'];
  includeChildrenProducts: Scalars['Boolean']['output'];
  labels: Array<ApiLabel>;
  listingFilters: Array<ApiCategoryListingFilter>;
  listingOrderBy: ListingSort;
  listingOrderByStatus: Scalars['Boolean']['output'];
  listingPlacement?: Maybe<Scalars['Int']['output']>;
  listingType: ListingType;
  parent?: Maybe<ApiCategory>;
  products: Array<ApiVariant>;
  seoDescription?: Maybe<Scalars['String']['output']>;
  seoTitle?: Maybe<Scalars['String']['output']>;
  slug: Scalars['String']['output'];
  status: Scalars['String']['output'];
  sublistingStep: Scalars['Int']['output'];
  tags: Array<ApiTag>;
  title: Scalars['String']['output'];
  updatedAt: Scalars['Timestamp']['output'];
};


export type ApiCategoryChildrenArgs = {
  input?: InputMaybe<ApiCategoriesInput>;
};

export type ApiCategoryFilterInput = {
  parent?: InputMaybe<ApiCategoryFilterInput>;
  slug?: InputMaybe<Scalars['String']['input']>;
};

export type ApiCategoryListingFilter = {
  __typename?: 'CategoryListingFilter';
  createdAt: Scalars['Timestamp']['output'];
  entry?: Maybe<ApiListingFilterEntry>;
  id: Scalars['ID']['output'];
  operator: Scalars['String']['output'];
  path: Scalars['String']['output'];
  type: FilterType;
  updatedAt: Scalars['Timestamp']['output'];
  value: Scalars['String']['output'];
};

export type ApiCategoryMutation = {
  __typename?: 'CategoryMutation';
  addProducts: Scalars['Boolean']['output'];
  archive: Scalars['Boolean']['output'];
  archiveMany: Scalars['Boolean']['output'];
  create: Scalars['ID']['output'];
  createMany: Array<ApiCategory>;
  delete: Scalars['Boolean']['output'];
  deleteMany: Scalars['Boolean']['output'];
  deleteProduct: Scalars['Boolean']['output'];
  update: Scalars['Boolean']['output'];
  updateProductRank: Scalars['Boolean']['output'];
};


export type ApiCategoryMutationAddProductsArgs = {
  input: ApiAddCategoryProductsInput;
};


export type ApiCategoryMutationArchiveArgs = {
  id: Scalars['ID']['input'];
};


export type ApiCategoryMutationArchiveManyArgs = {
  ids: Array<Scalars['ID']['input']>;
};


export type ApiCategoryMutationCreateArgs = {
  input: ApiCreateCategoryInput;
};


export type ApiCategoryMutationCreateManyArgs = {
  input: Array<ApiCreateCategoryInput>;
};


export type ApiCategoryMutationDeleteArgs = {
  id: Scalars['ID']['input'];
};


export type ApiCategoryMutationDeleteManyArgs = {
  ids: Array<Scalars['ID']['input']>;
};


export type ApiCategoryMutationDeleteProductArgs = {
  input: ApiDeleteCategoryProductInput;
};


export type ApiCategoryMutationUpdateArgs = {
  input: ApiUpdateCategoryInput;
};


export type ApiCategoryMutationUpdateProductRankArgs = {
  input: ApiUpdateCategoryProductInput;
};

export type ApiCategoryQuery = {
  __typename?: 'CategoryQuery';
  findMany: ApiCategoriesOutput;
  findOne?: Maybe<ApiCategory>;
};


export type ApiCategoryQueryFindManyArgs = {
  input?: InputMaybe<ApiCategoriesInput>;
};


export type ApiCategoryQueryFindOneArgs = {
  id: Scalars['ID']['input'];
};

export type ApiClientInfo = {
  __typename?: 'ClientInfo';
  ip?: Maybe<Scalars['String']['output']>;
  language?: Maybe<Scalars['String']['output']>;
  meta?: Maybe<Scalars['String']['output']>;
  userAgent?: Maybe<Scalars['String']['output']>;
};

export type ApiClientInfoInput = {
  language?: InputMaybe<Scalars['String']['input']>;
  meta?: InputMaybe<Scalars['String']['input']>;
  userAgent?: InputMaybe<Scalars['String']['input']>;
};

export type ApiCollectionMeta = {
  __typename?: 'CollectionMeta';
  count: Scalars['Int']['output'];
  page: Scalars['Int']['output'];
  pageCount: Scalars['Int']['output'];
  pageSize: Scalars['Int']['output'];
  total: Scalars['Int']['output'];
};

export type ApiCoreShippingMethod = {
  __typename?: 'CoreShippingMethod';
  code: Scalars['String']['output'];
  name: Scalars['String']['output'];
  service: ApiShippingService;
};

export type ApiCreateApiKeyInput = {
  dueDate?: InputMaybe<Scalars['Timestamp']['input']>;
  name: Scalars['String']['input'];
};

export type ApiCreateCategoryInput = {
  children?: InputMaybe<Array<InputMaybe<Scalars['ID']['input']>>>;
  coverId?: InputMaybe<Scalars['ID']['input']>;
  description?: InputMaybe<ApiDescriptionFieldsInput>;
  excerpt?: InputMaybe<Scalars['String']['input']>;
  gallery?: InputMaybe<Array<Scalars['ID']['input']>>;
  includeChildrenProducts: Scalars['Boolean']['input'];
  labels?: InputMaybe<Array<Scalars['ID']['input']>>;
  listingFilters?: InputMaybe<Array<ApiCreateListingFilterInput>>;
  listingOrderBy?: InputMaybe<ListingSort>;
  listingOrderByStatus: Scalars['Boolean']['input'];
  listingType: ListingType;
  parentId?: InputMaybe<Scalars['ID']['input']>;
  products?: InputMaybe<Array<Scalars['ID']['input']>>;
  seo?: InputMaybe<ApiSeoFieldsInput>;
  slug: Scalars['String']['input'];
  status: Scalars['String']['input'];
  title: Scalars['String']['input'];
};

export type ApiCreateCustomerInput = {
  email: Scalars['String']['input'];
  firstName: Scalars['String']['input'];
  isVerified: Scalars['Boolean']['input'];
  language: Scalars['String']['input'];
  lastName: Scalars['String']['input'];
  password?: InputMaybe<Scalars['String']['input']>;
  phone?: InputMaybe<Scalars['String']['input']>;
};

export type ApiCreateEmailProfilesInput = {
  host: Scalars['String']['input'];
  password: Scalars['String']['input'];
  port: Scalars['Int']['input'];
  sortIndex: Scalars['Int']['input'];
  username: Scalars['String']['input'];
};

export type ApiCreateEmailSettingsInput = {
  from: Scalars['String']['input'];
  replyTo: Scalars['String']['input'];
};

export type ApiCreateEmailTemplateInput = {
  subject: Scalars['String']['input'];
  template: Scalars['String']['input'];
  type: EmailTypeEnum;
};

export type ApiCreateFilterInput = {
  isActive: Scalars['Boolean']['input'];
  sortIndex: Scalars['Int']['input'];
  title: Scalars['String']['input'];
  type: FilterType;
};

export type ApiCreateLabelInput = {
  colorHex?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
  slug: Scalars['String']['input'];
};

export type ApiCreateLinkInput = {
  entryId?: InputMaybe<Scalars['ID']['input']>;
  menuId: Scalars['ID']['input'];
  parentId?: InputMaybe<Scalars['ID']['input']>;
  slug?: InputMaybe<Scalars['String']['input']>;
  sortIndex: Scalars['Int']['input'];
  title: Scalars['String']['input'];
  type: MenuNodeType;
};

export type ApiCreateListingFilterInput = {
  entryID?: InputMaybe<Scalars['ID']['input']>;
  operator: Scalars['String']['input'];
  path: Scalars['String']['input'];
  type: FilterType;
  value: Scalars['String']['input'];
};

export type ApiCreateLocaleInput = {
  code: Scalars['String']['input'];
  isActive: Scalars['Boolean']['input'];
};

export type ApiCreateMenuInput = {
  items: Array<ApiCreateLinkInput>;
  slug: Scalars['String']['input'];
  status: EntityStatus;
  title: Scalars['String']['input'];
};

export type ApiCreateOrderInput = {
  clientInfo: ApiClientInfoInput;
  currency?: InputMaybe<ApiOrderCurrencyInput>;
  customerId?: InputMaybe<Scalars['ID']['input']>;
  externalSystemId?: InputMaybe<Scalars['String']['input']>;
  items?: InputMaybe<Array<ApiCreateOrderItemInput>>;
  payment?: InputMaybe<ApiOrderPaymentInfoInput>;
  shipping?: InputMaybe<ApiOrderShippingInfoInput>;
  tags?: InputMaybe<Array<Scalars['ID']['input']>>;
};

export type ApiCreateOrderItemInput = {
  orderId: Scalars['ID']['input'];
  productId: Scalars['ID']['input'];
  quantity?: InputMaybe<Scalars['Int']['input']>;
};

export type ApiCreatePageInput = {
  coverId?: InputMaybe<Scalars['ID']['input']>;
  description?: InputMaybe<ApiDescriptionFieldsInput>;
  excerpt?: InputMaybe<Scalars['String']['input']>;
  gallery?: InputMaybe<Array<Scalars['ID']['input']>>;
  labels?: InputMaybe<Array<Scalars['ID']['input']>>;
  seo?: InputMaybe<ApiSeoFieldsInput>;
  slug: Scalars['String']['input'];
  status: Scalars['String']['input'];
  title: Scalars['String']['input'];
};

export type ApiCreatePaymentMethodInput = {
  code: Scalars['String']['input'];
  name: Scalars['String']['input'];
  serviceId: Scalars['String']['input'];
};

export type ApiCreatePaymentServiceInput = {
  code: Scalars['String']['input'];
  coverId?: InputMaybe<Scalars['ID']['input']>;
  name: Scalars['String']['input'];
};

export type ApiCreateProductGroupInput = {
  isMultiple: Scalars['Boolean']['input'];
  isRequired: Scalars['Boolean']['input'];
  items: Array<ApiCreateProductGroupItemInput>;
  sortIndex: Scalars['Int']['input'];
  title: Scalars['String']['input'];
};

export type ApiCreateProductGroupItemInput = {
  maxQuantity?: InputMaybe<Scalars['Int']['input']>;
  priceAmountValue?: InputMaybe<Scalars['Int']['input']>;
  pricePercentageValue?: InputMaybe<Scalars['Float']['input']>;
  priceType?: InputMaybe<ProductGroupPriceType>;
  sortIndex: Scalars['Int']['input'];
  variantId: Scalars['ID']['input'];
};

export type ApiCreateProductInput = {
  description?: InputMaybe<ApiDescriptionFieldsInput>;
  excerpt?: InputMaybe<Scalars['String']['input']>;
  groups: Array<ApiCreateProductGroupInput>;
  labels?: InputMaybe<Array<Scalars['ID']['input']>>;
  primaryCategory?: InputMaybe<Scalars['ID']['input']>;
  requiresShipping: Scalars['Boolean']['input'];
  seo?: InputMaybe<ApiSeoFieldsInput>;
  slug?: InputMaybe<Scalars['String']['input']>;
  status: EntityStatus;
  tags: Array<Scalars['ID']['input']>;
  title: Scalars['String']['input'];
  variants: ApiProductVariantsInput;
};

export type ApiCreateProductVariantInput = {
  barcode?: InputMaybe<Scalars['String']['input']>;
  categories: Array<Scalars['ID']['input']>;
  costPrice?: InputMaybe<Scalars['Int']['input']>;
  coverId?: InputMaybe<Scalars['ID']['input']>;
  dimensionUnit: DimensionUnit;
  features?: InputMaybe<Array<ApiProductFeatureInput>>;
  gallery?: InputMaybe<Array<Scalars['ID']['input']>>;
  height: Scalars['Float']['input'];
  inListing: Scalars['Boolean']['input'];
  length: Scalars['Float']['input'];
  oldPrice?: InputMaybe<Scalars['Int']['input']>;
  price: Scalars['Int']['input'];
  sku?: InputMaybe<Scalars['String']['input']>;
  slug?: InputMaybe<Scalars['String']['input']>;
  stockStatus: Scalars['String']['input'];
  title: Scalars['String']['input'];
  variantSortIndex: Scalars['Int']['input'];
  weight: Scalars['Float']['input'];
  weightUnit: WeightUnit;
  width: Scalars['Float']['input'];
};

export type ApiCreateProfileInput = {
  firstName: Scalars['String']['input'];
  language: Scalars['String']['input'];
  lastName: Scalars['String']['input'];
  timezone: Scalars['String']['input'];
};

export type ApiCreateProjectInput = {
  country: Scalars['String']['input'];
  currency: Scalars['String']['input'];
  email?: InputMaybe<Scalars['String']['input']>;
  locales: Array<Scalars['String']['input']>;
  name: Scalars['String']['input'];
  phoneNumber?: InputMaybe<Scalars['String']['input']>;
  status: ProjectStatus;
  timezone: Scalars['String']['input'];
};

export type ApiCreateReviewInput = {
  cons?: InputMaybe<Scalars['String']['input']>;
  customerId?: InputMaybe<Scalars['ID']['input']>;
  displayName: Scalars['String']['input'];
  images?: InputMaybe<Array<Scalars['ID']['input']>>;
  locale?: InputMaybe<Scalars['String']['input']>;
  message?: InputMaybe<Scalars['String']['input']>;
  productId?: InputMaybe<Scalars['ID']['input']>;
  pros?: InputMaybe<Scalars['String']['input']>;
  rating: Scalars['Float']['input'];
  status?: InputMaybe<ReviewStatus>;
  title: Scalars['String']['input'];
};

export type ApiCreateShippingItemInput = {
  estimatedDeliveryAt?: InputMaybe<Scalars['Timestamp']['input']>;
  fulfillmentId: Scalars['ID']['input'];
  notificationsEnabled?: InputMaybe<Scalars['Boolean']['input']>;
  shippingMethodId?: InputMaybe<Scalars['String']['input']>;
  shippingPrice?: InputMaybe<Scalars['Int']['input']>;
  trackingCode?: InputMaybe<Scalars['String']['input']>;
  trackingEnabled?: InputMaybe<Scalars['Boolean']['input']>;
  trackingUrl?: InputMaybe<Scalars['String']['input']>;
};

export type ApiCreateShippingMethodInput = {
  code: Scalars['String']['input'];
  name: Scalars['String']['input'];
  serviceId: Scalars['String']['input'];
};

export type ApiCreateShippingServiceInput = {
  code: Scalars['String']['input'];
  coverId?: InputMaybe<Scalars['ID']['input']>;
  name: Scalars['String']['input'];
};

export type ApiCreateStockStatusInput = {
  code: Scalars['String']['input'];
  isAvailable: Scalars['Boolean']['input'];
  title: Scalars['String']['input'];
};

export type ApiCreateTagInput = {
  color?: InputMaybe<Scalars['String']['input']>;
  slug: Scalars['String']['input'];
  title: Scalars['String']['input'];
};

export type ApiCreateTranslationInput = {
  fieldName: TranslationField;
  fieldValue: Scalars['String']['input'];
  locale: Scalars['String']['input'];
  sourceId: Scalars['ID']['input'];
  sourceType: EntityType;
};

export type ApiCrmAppendTicketInput = {
  columnId: Scalars['ID']['input'];
  orderID: Scalars['ID']['input'];
};

export type ApiCrmColumn = {
  __typename?: 'CrmColumn';
  ID: Scalars['ID']['output'];
  slug: Scalars['String']['output'];
  sortIndex: Scalars['Int']['output'];
  tickets: Array<ApiOrder>;
  title: Scalars['String']['output'];
};

export type ApiCrmCreateColumnInput = {
  slug: Scalars['String']['input'];
  sortIndex: Scalars['Int']['input'];
  title: Scalars['String']['input'];
};

export type ApiCrmMoveTicketInput = {
  afterOrderId: Scalars['ID']['input'];
  columnId: Scalars['ID']['input'];
  orderId: Scalars['ID']['input'];
};

export type ApiCrmMutation = {
  __typename?: 'CrmMutation';
  columnCreateOne: Scalars['Boolean']['output'];
  columnDeleteOne: Scalars['Boolean']['output'];
  columnUpdateMany: Scalars['Boolean']['output'];
  columnUpdateOne: Scalars['Boolean']['output'];
  ticketAppend: Scalars['Boolean']['output'];
  ticketMove: Scalars['Boolean']['output'];
};


export type ApiCrmMutationColumnCreateOneArgs = {
  input: ApiCrmCreateColumnInput;
};


export type ApiCrmMutationColumnDeleteOneArgs = {
  id: Scalars['ID']['input'];
};


export type ApiCrmMutationColumnUpdateManyArgs = {
  input: Array<ApiCrmUpdateColumnInput>;
};


export type ApiCrmMutationColumnUpdateOneArgs = {
  input: ApiCrmUpdateColumnInput;
};


export type ApiCrmMutationTicketAppendArgs = {
  input: ApiCrmAppendTicketInput;
};


export type ApiCrmMutationTicketMoveArgs = {
  input: ApiCrmMoveTicketInput;
};

export type ApiCrmQuery = {
  __typename?: 'CrmQuery';
  getColumns: Array<ApiCrmColumn>;
  getTickets: Array<ApiCrmTicketsQueryColumnOutput>;
};


export type ApiCrmQueryGetTicketsArgs = {
  input: ApiCrmTicketsQueryInput;
};

export type ApiCrmTicketsQueryColumnOutput = {
  __typename?: 'CrmTicketsQueryColumnOutput';
  data: ApiCrmColumn;
  hasNextPage: Scalars['Boolean']['output'];
};

export type ApiCrmTicketsQueryInput = {
  columns: Array<Scalars['ID']['input']>;
  limit: Scalars['Int']['input'];
  offset?: InputMaybe<Scalars['Int']['input']>;
  where?: InputMaybe<ApiOrderWhereInput>;
};

export type ApiCrmUpdateColumnInput = {
  id: Scalars['ID']['input'];
  slug?: InputMaybe<Scalars['String']['input']>;
  sortIndex?: InputMaybe<Scalars['Int']['input']>;
  title?: InputMaybe<Scalars['String']['input']>;
};

export type ApiCurrency = {
  __typename?: 'Currency';
  code: Scalars['String']['output'];
  decimalPlaces: Scalars['Int']['output'];
  decimalSeparator: Scalars['String']['output'];
  exchangeRate: Scalars['Float']['output'];
  isActive: Scalars['Boolean']['output'];
  symbolLeft: Scalars['String']['output'];
  symbolRight: Scalars['String']['output'];
  thousandsSeparator: Scalars['String']['output'];
  title: Scalars['String']['output'];
};

export type ApiCustomer = {
  __typename?: 'Customer';
  createdAt: Scalars['Timestamp']['output'];
  email: Scalars['String']['output'];
  firstName: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  isBlocked?: Maybe<Scalars['Boolean']['output']>;
  isVerified: Scalars['Boolean']['output'];
  language?: Maybe<Scalars['String']['output']>;
  lastName: Scalars['String']['output'];
  orders: Array<ApiOrder>;
  phone?: Maybe<Scalars['String']['output']>;
  updatedAt: Scalars['Timestamp']['output'];
};

export type ApiCustomerMutation = {
  __typename?: 'CustomerMutation';
  archive: Scalars['Boolean']['output'];
  archiveMany: Array<Scalars['Boolean']['output']>;
  create: Scalars['ID']['output'];
  delete: Scalars['Boolean']['output'];
  deleteMany: Array<Scalars['Boolean']['output']>;
  update: Scalars['Boolean']['output'];
};


export type ApiCustomerMutationArchiveArgs = {
  id: Scalars['ID']['input'];
};


export type ApiCustomerMutationArchiveManyArgs = {
  ids: Array<Scalars['ID']['input']>;
};


export type ApiCustomerMutationCreateArgs = {
  input: ApiCreateCustomerInput;
};


export type ApiCustomerMutationDeleteArgs = {
  id: Scalars['ID']['input'];
};


export type ApiCustomerMutationDeleteManyArgs = {
  ids: Array<Scalars['ID']['input']>;
};


export type ApiCustomerMutationUpdateArgs = {
  input: ApiUpdateCustomerInput;
};

export type ApiCustomerQuery = {
  __typename?: 'CustomerQuery';
  findMany: ApiCustomersOutput;
  findOne?: Maybe<ApiCustomer>;
};


export type ApiCustomerQueryFindManyArgs = {
  input?: InputMaybe<ApiCustomersInput>;
};


export type ApiCustomerQueryFindOneArgs = {
  id: Scalars['ID']['input'];
};

export type ApiCustomersInput = {
  page: Scalars['Int']['input'];
  pageSize: Scalars['Int']['input'];
  search?: InputMaybe<Scalars['String']['input']>;
  sortField?: InputMaybe<Scalars['String']['input']>;
  sortOrder?: InputMaybe<Scalars['String']['input']>;
};

export type ApiCustomersOutput = {
  __typename?: 'CustomersOutput';
  data: Array<ApiCustomer>;
  meta: ApiCollectionMeta;
};

export type ApiDeleteCategoryProductInput = {
  categoryId: Scalars['ID']['input'];
  productId: Scalars['ID']['input'];
};

export type ApiDescriptionFieldsInput = {
  html: Scalars['String']['input'];
  json: Scalars['String']['input'];
  text: Scalars['String']['input'];
};

export enum DimensionUnit {
  Cm = 'CM',
  In = 'IN',
  M = 'M',
  Mm = 'MM'
}

export type ApiEmailProfiles = {
  __typename?: 'EmailProfiles';
  createdAt: Scalars['Timestamp']['output'];
  host: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  port: Scalars['Int']['output'];
  sortIndex: Scalars['Int']['output'];
  updatedAt: Scalars['Timestamp']['output'];
  username: Scalars['String']['output'];
};

export type ApiEmailProfilesMutation = {
  __typename?: 'EmailProfilesMutation';
  create: ApiEmailProfiles;
  update: ApiEmailProfiles;
};


export type ApiEmailProfilesMutationCreateArgs = {
  input: ApiCreateEmailProfilesInput;
};


export type ApiEmailProfilesMutationUpdateArgs = {
  input: ApiUpdateEmailProfilesInput;
};

export type ApiEmailProfilesQuery = {
  __typename?: 'EmailProfilesQuery';
  findOne?: Maybe<ApiEmailProfiles>;
};

export type ApiEmailSettings = {
  __typename?: 'EmailSettings';
  createdAt: Scalars['Timestamp']['output'];
  from: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  replyTo: Scalars['String']['output'];
  updatedAt: Scalars['Timestamp']['output'];
};

export type ApiEmailSettingsMutation = {
  __typename?: 'EmailSettingsMutation';
  create: ApiEmailSettings;
  update: ApiEmailSettings;
};


export type ApiEmailSettingsMutationCreateArgs = {
  input: ApiCreateEmailSettingsInput;
};


export type ApiEmailSettingsMutationUpdateArgs = {
  input: ApiUpdateEmailSettingsInput;
};

export type ApiEmailSettingsQuery = {
  __typename?: 'EmailSettingsQuery';
  findOne?: Maybe<ApiEmailSettings>;
};

export type ApiEmailTemplate = {
  __typename?: 'EmailTemplate';
  createdAt: Scalars['Timestamp']['output'];
  id: Scalars['ID']['output'];
  subject: Scalars['String']['output'];
  template: Scalars['String']['output'];
  type: EmailTypeEnum;
  updatedAt: Scalars['Timestamp']['output'];
};

export type ApiEmailTemplateMutation = {
  __typename?: 'EmailTemplateMutation';
  create: ApiEmailTemplate;
  sendTestEmail: Scalars['Boolean']['output'];
  update: ApiEmailTemplate;
};


export type ApiEmailTemplateMutationCreateArgs = {
  input: ApiCreateEmailTemplateInput;
};


export type ApiEmailTemplateMutationSendTestEmailArgs = {
  input: ApiSendTestEmailInput;
};


export type ApiEmailTemplateMutationUpdateArgs = {
  input: ApiUpdateEmailTemplateInput;
};

export type ApiEmailTemplateQuery = {
  __typename?: 'EmailTemplateQuery';
  findMany: Array<ApiEmailTemplate>;
  findOne?: Maybe<ApiEmailTemplate>;
};


export type ApiEmailTemplateQueryFindManyArgs = {
  input: ApiEmailTemplatesInput;
};


export type ApiEmailTemplateQueryFindOneArgs = {
  input: ApiEmailTemplatesInput;
};

export type ApiEmailTemplatesInput = {
  where?: InputMaybe<ApiEmailTemplatesWhereInput>;
};

export type ApiEmailTemplatesWhereInput = {
  And?: InputMaybe<Array<ApiEmailTemplatesWhereInput>>;
  Or?: InputMaybe<Array<ApiEmailTemplatesWhereInput>>;
  id?: InputMaybe<Scalars['FilterV2']['input']>;
  type?: InputMaybe<Scalars['FilterV2']['input']>;
};

export enum EmailTypeEnum {
  CustomerInvitation = 'CUSTOMER_INVITATION',
  CustomerOrderCancelled = 'CUSTOMER_ORDER_CANCELLED',
  CustomerOrderCreated = 'CUSTOMER_ORDER_CREATED',
  CustomerOrderDelivered = 'CUSTOMER_ORDER_DELIVERED',
  CustomerOrderShipped = 'CUSTOMER_ORDER_SHIPPED',
  CustomerResetPassword = 'CUSTOMER_RESET_PASSWORD',
  CustomerSignUp = 'CUSTOMER_SIGN_UP',
  TenantInvitation = 'TENANT_INVITATION',
  TenantResetPassword = 'TENANT_RESET_PASSWORD',
  TenantSignUp = 'TENANT_SIGN_UP'
}

export enum EntityStatus {
  Archived = 'ARCHIVED',
  Draft = 'DRAFT',
  Published = 'PUBLISHED'
}

export enum EntityType {
  Board = 'BOARD',
  BoardCol = 'BOARD_COL',
  Bundle = 'BUNDLE',
  Category = 'CATEGORY',
  Customer = 'CUSTOMER',
  EmailTpl = 'EMAIL_TPL',
  File = 'FILE',
  Filter = 'FILTER',
  Fulfillment = 'FULFILLMENT',
  Link = 'LINK',
  Menu = 'MENU',
  Order = 'ORDER',
  OrderItem = 'ORDER_ITEM',
  Page = 'PAGE',
  PayItem = 'PAY_ITEM',
  PayMethod = 'PAY_METHOD',
  ProdContainer = 'PROD_CONTAINER',
  ProdFeat = 'PROD_FEAT',
  ProdFeatGroup = 'PROD_FEAT_GROUP',
  ProdGroup = 'PROD_GROUP',
  ProdVariant = 'PROD_VARIANT',
  Review = 'REVIEW',
  ShipItem = 'SHIP_ITEM',
  ShipMethod = 'SHIP_METHOD',
  ShipService = 'SHIP_SERVICE',
  StockStatus = 'STOCK_STATUS',
  Tag = 'TAG'
}

export enum FeatureStyleType {
  ApparelSize = 'APPAREL_SIZE',
  Dropdown = 'DROPDOWN',
  DropdownVariantCover = 'DROPDOWN_VARIANT_COVER',
  Radio = 'RADIO',
  Swatch = 'SWATCH',
  VariantCover = 'VARIANT_COVER'
}

export type ApiFeatureSwatch = {
  __typename?: 'FeatureSwatch';
  color1?: Maybe<Scalars['String']['output']>;
  color2?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  image?: Maybe<ApiFile>;
  type: FeatureSwatchType;
};

export type ApiFeatureSwatchInput = {
  color1?: InputMaybe<Scalars['String']['input']>;
  color2?: InputMaybe<Scalars['String']['input']>;
  id?: InputMaybe<Scalars['ID']['input']>;
  imageId?: InputMaybe<Scalars['ID']['input']>;
  type: FeatureSwatchType;
};

export enum FeatureSwatchType {
  Color = 'COLOR',
  ColorDuo = 'COLOR_DUO',
  Image = 'IMAGE'
}

export type ApiFile = {
  __typename?: 'File';
  createdAt: Scalars['Timestamp']['output'];
  driver: FileDriver;
  ext: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  key: Scalars['String']['output'];
  name: Scalars['String']['output'];
  size: Scalars['Int']['output'];
  updatedAt: Scalars['Timestamp']['output'];
  url: Scalars['String']['output'];
};

export enum FileDriver {
  Local = 'LOCAL',
  S3 = 'S3',
  Url = 'URL',
  Ytb = 'YTB'
}

export type ApiFileMutation = {
  __typename?: 'FileMutation';
  archiveMany: Scalars['Boolean']['output'];
  archiveOne: Scalars['Boolean']['output'];
  deleteMany: Scalars['Boolean']['output'];
  deleteOne: Scalars['Boolean']['output'];
  updateMany: Array<ApiFile>;
  updateOne: ApiFile;
};


export type ApiFileMutationArchiveManyArgs = {
  ids: Array<Scalars['ID']['input']>;
};


export type ApiFileMutationArchiveOneArgs = {
  id: Scalars['ID']['input'];
};


export type ApiFileMutationDeleteManyArgs = {
  ids: Array<Scalars['ID']['input']>;
};


export type ApiFileMutationDeleteOneArgs = {
  id: Scalars['ID']['input'];
};


export type ApiFileMutationUpdateManyArgs = {
  input: Array<ApiUpdateFileInput>;
};


export type ApiFileMutationUpdateOneArgs = {
  input: ApiUpdateFileInput;
};

export type ApiFileQuery = {
  __typename?: 'FileQuery';
  findMany: ApiFilesOutput;
  findOne?: Maybe<ApiFile>;
};


export type ApiFileQueryFindManyArgs = {
  input?: InputMaybe<ApiFilesInput>;
};


export type ApiFileQueryFindOneArgs = {
  id: Scalars['ID']['input'];
};

export type ApiFilesInput = {
  order?: InputMaybe<Scalars['String']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  pageSize?: InputMaybe<Scalars['Int']['input']>;
  where?: InputMaybe<ApiFilesWhereInput>;
};

export type ApiFilesOutput = {
  __typename?: 'FilesOutput';
  data: Array<ApiFile>;
  meta: ApiCollectionMeta;
};

export type ApiFilesWhereInput = {
  And?: InputMaybe<Array<ApiFilesWhereInput>>;
  Or?: InputMaybe<Array<ApiFilesWhereInput>>;
  category?: InputMaybe<Scalars['FilterV2']['input']>;
  createdAt?: InputMaybe<Scalars['FilterV2']['input']>;
  ext?: InputMaybe<Scalars['FilterV2']['input']>;
  id?: InputMaybe<Scalars['FilterV2']['input']>;
  name?: InputMaybe<Scalars['FilterV2']['input']>;
  page?: InputMaybe<Scalars['FilterV2']['input']>;
  post?: InputMaybe<Scalars['FilterV2']['input']>;
  product?: InputMaybe<Scalars['FilterV2']['input']>;
  size?: InputMaybe<Scalars['FilterV2']['input']>;
  updatedAt?: InputMaybe<Scalars['FilterV2']['input']>;
  url?: InputMaybe<Scalars['FilterV2']['input']>;
};

export type ApiFilter = {
  __typename?: 'Filter';
  createdAt: Scalars['Timestamp']['output'];
  id: Scalars['ID']['output'];
  isActive: Scalars['Boolean']['output'];
  sortIndex: Scalars['Int']['output'];
  title: Scalars['String']['output'];
  type: FilterType;
  updatedAt: Scalars['Timestamp']['output'];
};

export type ApiFilterInput = {
  Eq?: InputMaybe<Scalars['Any']['input']>;
  Gt?: InputMaybe<Scalars['Any']['input']>;
  Gte?: InputMaybe<Scalars['Any']['input']>;
  ILike?: InputMaybe<Scalars['Any']['input']>;
  In?: InputMaybe<Scalars['Any']['input']>;
  Is?: InputMaybe<Scalars['Any']['input']>;
  IsNot?: InputMaybe<Scalars['Any']['input']>;
  Like?: InputMaybe<Scalars['Any']['input']>;
  Lt?: InputMaybe<Scalars['Any']['input']>;
  Lte?: InputMaybe<Scalars['Any']['input']>;
  NotEq?: InputMaybe<Scalars['Any']['input']>;
  NotILike?: InputMaybe<Scalars['Any']['input']>;
  NotIn?: InputMaybe<Scalars['Any']['input']>;
  NotLike?: InputMaybe<Scalars['Any']['input']>;
};

export type ApiFilterMutation = {
  __typename?: 'FilterMutation';
  create: ApiFilter;
  createMany: Scalars['Boolean']['output'];
  update: ApiFilter;
  updateMany: Scalars['Boolean']['output'];
};


export type ApiFilterMutationCreateArgs = {
  input: ApiCreateFilterInput;
};


export type ApiFilterMutationCreateManyArgs = {
  input: Array<ApiCreateFilterInput>;
};


export type ApiFilterMutationUpdateArgs = {
  input: ApiUpdateFilterInput;
};


export type ApiFilterMutationUpdateManyArgs = {
  input: Array<ApiUpdateFilterInput>;
};

export type ApiFilterQuery = {
  __typename?: 'FilterQuery';
  findMany: Array<ApiFilter>;
  findOne?: Maybe<ApiFilter>;
};


export type ApiFilterQueryFindManyArgs = {
  input?: InputMaybe<ApiProductFilterV2>;
};


export type ApiFilterQueryFindOneArgs = {
  id: Scalars['ID']['input'];
};

export enum FilterType {
  Availability = 'AVAILABILITY',
  Category = 'CATEGORY',
  Feature = 'FEATURE',
  Price = 'PRICE',
  Tag = 'TAG'
}

export type ApiFiltersWhereInput = {
  And?: InputMaybe<Array<ApiFiltersWhereInput>>;
  Or?: InputMaybe<Array<ApiFiltersWhereInput>>;
  id?: InputMaybe<Scalars['FilterV2']['input']>;
};

export type ApiForgotPasswordInput = {
  email: Scalars['String']['input'];
};

export type ApiFulfillment = {
  __typename?: 'Fulfillment';
  createdAt: Scalars['Timestamp']['output'];
  id: Scalars['ID']['output'];
  items: Array<ApiFulfillmentItem>;
  parentId?: Maybe<Scalars['ID']['output']>;
  shippingItem?: Maybe<ApiShippingItem>;
  status: FulfillmentStatusEnum;
};

export type ApiFulfillmentItem = {
  __typename?: 'FulfillmentItem';
  orderItemId: Scalars['ID']['output'];
  quantity: Scalars['Int']['output'];
};

export enum FulfillmentStatusEnum {
  Cancelled = 'CANCELLED',
  Delivered = 'DELIVERED',
  Fulfilled = 'FULFILLED',
  OnHold = 'ON_HOLD',
  Pending = 'PENDING',
  Processing = 'PROCESSING',
  Returned = 'RETURNED',
  Shipped = 'SHIPPED'
}

export type ApiFulfillmentWhereInput = {
  And?: InputMaybe<Array<ApiFulfillmentWhereInput>>;
  Or?: InputMaybe<Array<ApiFulfillmentWhereInput>>;
  id?: InputMaybe<Scalars['FilterV2']['input']>;
  orderId?: InputMaybe<Scalars['FilterV2']['input']>;
  status?: InputMaybe<Scalars['FilterV2']['input']>;
};

export type ApiGroupProductLinkInput = {
  groupId: Scalars['ID']['input'];
  productId: Scalars['ID']['input'];
};

export type ApiInstalledApp = {
  __typename?: 'InstalledApp';
  appCode: Scalars['String']['output'];
  baseURL: Scalars['String']['output'];
  domain: Scalars['String']['output'];
  enabled: Scalars['Boolean']['output'];
  id: Scalars['String']['output'];
  meta?: Maybe<Scalars['JSON']['output']>;
  projectID: Scalars['String']['output'];
};

export type ApiInviteInput = {
  email: Scalars['String']['input'];
};

export type ApiKeywordCreateInput = {
  groupId: Scalars['ID']['input'];
  keyword: Scalars['String']['input'];
  localeCode: Scalars['String']['input'];
};

export type ApiKeywordDeleteInput = {
  groupId: Scalars['ID']['input'];
  keyword: Scalars['String']['input'];
  localeCode: Scalars['String']['input'];
};

export type ApiKeywordGroupCreateInput = {
  title: Scalars['String']['input'];
};

export type ApiKeywordGroupDeleteInput = {
  id: Scalars['ID']['input'];
};

export type ApiKeywordGroupUpdateInput = {
  id: Scalars['ID']['input'];
  title: Scalars['String']['input'];
};

export type ApiLabel = {
  __typename?: 'Label';
  colorHex?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  slug: Scalars['String']['output'];
};

export type ApiLabelMutation = {
  __typename?: 'LabelMutation';
  create: Scalars['ID']['output'];
  update: Scalars['Boolean']['output'];
};


export type ApiLabelMutationCreateArgs = {
  input: ApiCreateLabelInput;
};


export type ApiLabelMutationUpdateArgs = {
  input: ApiUpdateLabelInput;
};

export type ApiLabelQuery = {
  __typename?: 'LabelQuery';
  findMany: ApiLabelsOutput;
  findOne?: Maybe<ApiLabel>;
};


export type ApiLabelQueryFindManyArgs = {
  input?: InputMaybe<ApiLabelsInput>;
};


export type ApiLabelQueryFindOneArgs = {
  id: Scalars['ID']['input'];
};

export type ApiLabelWhereInput = {
  And?: InputMaybe<Array<ApiLabelWhereInput>>;
  Or?: InputMaybe<Array<ApiLabelWhereInput>>;
  id?: InputMaybe<Scalars['FilterV2']['input']>;
  slug?: InputMaybe<Scalars['FilterV2']['input']>;
};

export type ApiLabelsInput = {
  order?: InputMaybe<Scalars['String']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  pageSize?: InputMaybe<Scalars['Int']['input']>;
  where?: InputMaybe<ApiLabelWhereInput>;
};

export type ApiLabelsOutput = {
  __typename?: 'LabelsOutput';
  data: Array<ApiLabel>;
  meta: ApiCollectionMeta;
};

export type ApiLanguageConfigInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  localeCode: Scalars['String']['input'];
  tsConfig: Scalars['String']['input'];
};

export type ApiLink = {
  __typename?: 'Link';
  createdAt: Scalars['Timestamp']['output'];
  entry?: Maybe<ApiLinkEntry>;
  id: Scalars['ID']['output'];
  parentId?: Maybe<Scalars['ID']['output']>;
  slug?: Maybe<Scalars['String']['output']>;
  sortIndex: Scalars['Int']['output'];
  title: Scalars['String']['output'];
  type: MenuNodeType;
  updatedAt: Scalars['Timestamp']['output'];
};

export type ApiLinkEntry = ApiCategory | ApiPage | ApiVariant;

export type ApiLinkMutation = {
  __typename?: 'LinkMutation';
  create: ApiLink;
  update: Scalars['Boolean']['output'];
};


export type ApiLinkMutationCreateArgs = {
  input: ApiCreateLinkInput;
};


export type ApiLinkMutationUpdateArgs = {
  input: ApiUpdateLinkInput;
};

export type ApiLinkQuery = {
  __typename?: 'LinkQuery';
  findMany: ApiLinksOutput;
  findOne?: Maybe<ApiLink>;
};


export type ApiLinkQueryFindManyArgs = {
  input?: InputMaybe<ApiLinksInput>;
};


export type ApiLinkQueryFindOneArgs = {
  id: Scalars['ID']['input'];
};

export type ApiLinksInput = {
  order?: InputMaybe<Scalars['String']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  pageSize?: InputMaybe<Scalars['Int']['input']>;
  where?: InputMaybe<ApiLinksWhereInput>;
};

export type ApiLinksOutput = {
  __typename?: 'LinksOutput';
  data: Array<ApiLink>;
  meta: ApiCollectionMeta;
};

export type ApiLinksWhereInput = {
  And?: InputMaybe<Array<ApiLinksWhereInput>>;
  Or?: InputMaybe<Array<ApiLinksWhereInput>>;
  createdAt?: InputMaybe<Scalars['FilterV2']['input']>;
  entryId?: InputMaybe<Scalars['FilterV2']['input']>;
  id?: InputMaybe<Scalars['FilterV2']['input']>;
  slug?: InputMaybe<Scalars['FilterV2']['input']>;
  title?: InputMaybe<Scalars['FilterV2']['input']>;
  type?: InputMaybe<Scalars['FilterV2']['input']>;
  updatedAt?: InputMaybe<Scalars['FilterV2']['input']>;
};

export type ApiListingFilter = {
  __typename?: 'ListingFilter';
  type: Scalars['String']['output'];
  values: Array<Scalars['Any']['output']>;
};

export type ApiListingFilterEntry = ApiCategory | ApiTag;

export type ApiListingFilterInput = {
  type: FilterType;
  values: Array<Scalars['Any']['input']>;
};

export type ApiListingInput = {
  category: ApiCategoryFilterInput;
  filters?: InputMaybe<Array<ApiListingFilterInput>>;
  listingType: ListingType;
  page?: Scalars['Int']['input'];
  perPage?: Scalars['Int']['input'];
  settings?: InputMaybe<ApiListingInputSettings>;
  sort?: InputMaybe<ListingSort>;
};

export type ApiListingInputSettings = {
  availableFirst?: InputMaybe<Scalars['Boolean']['input']>;
  types?: InputMaybe<Array<ListingNodeType>>;
};

export type ApiListingMeta = {
  __typename?: 'ListingMeta';
  filters: Array<ApiListingFilter>;
  sort: ListingSort;
};

export enum ListingNodeType {
  Product = 'PRODUCT'
}

export type ApiListingOutputV1 = {
  __typename?: 'ListingOutputV1';
  data: Array<ApiVariant>;
  meta: ApiCollectionMeta;
};

export type ApiListingQuery = {
  __typename?: 'ListingQuery';
  listingV1: ApiListingOutputV1;
};


export type ApiListingQueryListingV1Args = {
  input: ApiListingInput;
};

export enum ListingSort {
  CreatedAtAsc = 'CREATED_AT_ASC',
  CreatedAtDesc = 'CREATED_AT_DESC',
  Custom = 'CUSTOM',
  PriceAsc = 'PRICE_ASC',
  PriceDesc = 'PRICE_DESC',
  TitleAsc = 'TITLE_ASC',
  TitleDesc = 'TITLE_DESC'
}

export enum ListingType {
  Auto = 'AUTO',
  Composite = 'COMPOSITE',
  Manual = 'MANUAL'
}

export type ApiLocale = {
  __typename?: 'Locale';
  code: Scalars['String']['output'];
  isActive: Scalars['Boolean']['output'];
  title: Scalars['String']['output'];
};

export type ApiLocaleWhereInput = {
  code?: InputMaybe<Scalars['FilterV2']['input']>;
  isActive?: InputMaybe<Scalars['FilterV2']['input']>;
  isDefault?: InputMaybe<Scalars['FilterV2']['input']>;
  title?: InputMaybe<Scalars['FilterV2']['input']>;
};

export type ApiMenu = {
  __typename?: 'Menu';
  createdAt: Scalars['Timestamp']['output'];
  id: Scalars['ID']['output'];
  items: Array<ApiLink>;
  slug: Scalars['String']['output'];
  status: EntityStatus;
  title: Scalars['String']['output'];
  updatedAt: Scalars['Timestamp']['output'];
};

export type ApiMenuMutation = {
  __typename?: 'MenuMutation';
  create: Scalars['ID']['output'];
  delete: Scalars['Boolean']['output'];
  deleteMany: Scalars['Boolean']['output'];
  update: Scalars['Boolean']['output'];
};


export type ApiMenuMutationCreateArgs = {
  input: ApiCreateMenuInput;
};


export type ApiMenuMutationDeleteArgs = {
  id: Scalars['ID']['input'];
};


export type ApiMenuMutationDeleteManyArgs = {
  ids: Array<Scalars['ID']['input']>;
};


export type ApiMenuMutationUpdateArgs = {
  input: ApiUpdateMenuInput;
};

export enum MenuNodeType {
  Category = 'CATEGORY',
  Link = 'LINK',
  Menu = 'MENU',
  Page = 'PAGE',
  Product = 'PRODUCT',
  Text = 'TEXT'
}

export type ApiMenuQuery = {
  __typename?: 'MenuQuery';
  findMany: ApiMenusOutput;
  findOne?: Maybe<ApiMenu>;
};


export type ApiMenuQueryFindManyArgs = {
  input?: InputMaybe<ApiMenusInput>;
};


export type ApiMenuQueryFindOneArgs = {
  id: Scalars['ID']['input'];
};

export type ApiMenusInput = {
  order?: InputMaybe<Scalars['String']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  pageSize?: InputMaybe<Scalars['Int']['input']>;
  where?: InputMaybe<ApiMenusWhereInput>;
};

export type ApiMenusOutput = {
  __typename?: 'MenusOutput';
  data: Array<ApiMenu>;
  meta: ApiCollectionMeta;
};

export type ApiMenusWhereInput = {
  And?: InputMaybe<Array<ApiMenusWhereInput>>;
  Or?: InputMaybe<Array<ApiMenusWhereInput>>;
  createdAt?: InputMaybe<Scalars['FilterV2']['input']>;
  id?: InputMaybe<Scalars['FilterV2']['input']>;
  locale?: InputMaybe<Scalars['FilterV2']['input']>;
  slug?: InputMaybe<Scalars['FilterV2']['input']>;
  status?: InputMaybe<Scalars['FilterV2']['input']>;
  title?: InputMaybe<Scalars['FilterV2']['input']>;
  translationField?: InputMaybe<Scalars['FilterV2']['input']>;
  updatedAt?: InputMaybe<Scalars['FilterV2']['input']>;
};

export type ApiMutation = {
  __typename?: 'Mutation';
  appsMutation: ApiAppsMutation;
  bulkMutation: ApiBulkMutation;
  cartMutation: ApiCartMutation;
  categoryMutation: ApiCategoryMutation;
  crmMutation: ApiCrmMutation;
  customerMutation: ApiCustomerMutation;
  emailProfilesMutation: ApiEmailProfilesMutation;
  emailSettingsMutation: ApiEmailSettingsMutation;
  emailTemplateMutation: ApiEmailTemplateMutation;
  fileMutation: ApiFileMutation;
  filterMutation: ApiFilterMutation;
  labelMutation: ApiLabelMutation;
  linkMutation: ApiLinkMutation;
  menuMutation: ApiMenuMutation;
  orderMutation: ApiOrderMutation;
  pageMutation: ApiPageMutation;
  paymentMethodMutation: ApiPaymentMethodMutation;
  paymentServiceMutation: ApiPaymentServiceMutation;
  productMutation: ApiProductMutation;
  projectMutation: ApiProjectMutation;
  reviewMutation: ApiReviewMutation;
  searchMutation: ApiSearchMutation;
  shippingMethodMutation: ApiShippingMethodMutation;
  shippingServiceMutation: ApiShippingServiceMutation;
  stockStatusMutation: ApiStockStatusMutation;
  tagMutation: ApiTagMutation;
  translationMutation: ApiTranslationMutation;
  userMutation: ApiUserMutation;
};

export type ApiOrder = {
  __typename?: 'Order';
  adminNote?: Maybe<Scalars['String']['output']>;
  billingAddress?: Maybe<ApiAddress>;
  clientInfo?: Maybe<ApiClientInfo>;
  createdAt: Scalars['Timestamp']['output'];
  createdBy: ApiActor;
  currencyCode: Scalars['String']['output'];
  customer?: Maybe<ApiCustomer>;
  customerEmail?: Maybe<Scalars['String']['output']>;
  customerFirstName?: Maybe<Scalars['String']['output']>;
  customerLastName?: Maybe<Scalars['String']['output']>;
  customerMeta?: Maybe<Scalars['String']['output']>;
  customerMiddleName?: Maybe<Scalars['String']['output']>;
  customerNote?: Maybe<Scalars['String']['output']>;
  customerPhone?: Maybe<Scalars['String']['output']>;
  customerStatistic?: Maybe<ApiOrderCustomerStatistic>;
  displayCurrencyCode?: Maybe<Scalars['String']['output']>;
  displayExchangeRate?: Maybe<Scalars['Float']['output']>;
  events: Array<ApiOrderEvent>;
  externalSystemId?: Maybe<Scalars['String']['output']>;
  fulfillments: Array<ApiFulfillment>;
  id: Scalars['ID']['output'];
  idempotencyKey: Scalars['ID']['output'];
  labels: Array<ApiLabel>;
  orderItems: Array<ApiOrderItem>;
  orderNumber: Scalars['Int']['output'];
  payment?: Maybe<ApiPaymentItem>;
  paymentMethod?: Maybe<ApiPaymentMethod>;
  productsInfo: Array<ApiOrderItemProductInfo>;
  shippingAddress?: Maybe<ApiAddress>;
  shippingMethod?: Maybe<ApiCoreShippingMethod>;
  status: OrderStatusEnum;
  subtotalAmount: Scalars['Int']['output'];
  tags: Array<ApiTag>;
  totalAmount: Scalars['Int']['output'];
  totalDiscountAmount?: Maybe<Scalars['Int']['output']>;
  totalRefundedAmount?: Maybe<Scalars['Int']['output']>;
  totalShippingAmount?: Maybe<Scalars['Int']['output']>;
  totalTaxAmount?: Maybe<Scalars['Int']['output']>;
  updatedAt: Scalars['Timestamp']['output'];
};

export type ApiOrderCurrencyInput = {
  currencyCode: Scalars['String']['input'];
  displayCurrencyCode?: InputMaybe<Scalars['String']['input']>;
  displayExchangeRate?: InputMaybe<Scalars['Float']['input']>;
};

export type ApiOrderCustomerStatistic = {
  __typename?: 'OrderCustomerStatistic';
  totalAuthorizedOrders: Scalars['Int']['output'];
  totalGuestOrders: Scalars['Int']['output'];
  totalRevenue: Scalars['Int']['output'];
};

export type ApiOrderEvent = {
  __typename?: 'OrderEvent';
  createdAt: Scalars['Timestamp']['output'];
  createdBy: ApiActor;
  eventData?: Maybe<Scalars['String']['output']>;
  eventType: OrderEventTypeEnum;
  id: Scalars['ID']['output'];
};

export enum OrderEventTypeEnum {
  CommentCreated = 'COMMENT_CREATED',
  ContactInfoUpdated = 'CONTACT_INFO_UPDATED',
  CustomerAssigned = 'CUSTOMER_ASSIGNED',
  CustomerUnassigned = 'CUSTOMER_UNASSIGNED',
  FulfillmentSplit = 'FULFILLMENT_SPLIT',
  FulfillmentStatusUpdated = 'FULFILLMENT_STATUS_UPDATED',
  FulfillmentUnsplit = 'FULFILLMENT_UNSPLIT',
  NotificationSent = 'NOTIFICATION_SENT',
  OrderCreated = 'ORDER_CREATED',
  OrderItemCreated = 'ORDER_ITEM_CREATED',
  OrderItemDeleted = 'ORDER_ITEM_DELETED',
  OrderItemUpdated = 'ORDER_ITEM_UPDATED',
  OrderNoteUpdated = 'ORDER_NOTE_UPDATED',
  OrderStatusUpdated = 'ORDER_STATUS_UPDATED',
  OrderTagsUpdated = 'ORDER_TAGS_UPDATED',
  PaymentDetailsUpdated = 'PAYMENT_DETAILS_UPDATED',
  PaymentStatusUpdated = 'PAYMENT_STATUS_UPDATED',
  ShippingDetailsUpdated = 'SHIPPING_DETAILS_UPDATED',
  ShippingProfileCreated = 'SHIPPING_PROFILE_CREATED',
  ShippingProfileDeleted = 'SHIPPING_PROFILE_DELETED',
  ShippingProfileUpdated = 'SHIPPING_PROFILE_UPDATED'
}

export type ApiOrderItem = {
  __typename?: 'OrderItem';
  createdAt: Scalars['Timestamp']['output'];
  discountAmount: Scalars['Int']['output'];
  id: Scalars['ID']['output'];
  originalQuantity: Scalars['Int']['output'];
  price: Scalars['Int']['output'];
  product?: Maybe<ApiVariant>;
  productCostPrice?: Maybe<Scalars['Int']['output']>;
  productInfo: ApiOrderItemProductInfo;
  quantity: Scalars['Int']['output'];
  subtotalAmount: Scalars['Int']['output'];
  taxAmount?: Maybe<Scalars['Int']['output']>;
  totalAmount: Scalars['Int']['output'];
  weight?: Maybe<ApiWeight>;
};

export type ApiOrderItemProductInfo = {
  __typename?: 'OrderItemProductInfo';
  id: Scalars['ID']['output'];
  snapshot: ApiProductSnapshot;
  variantId?: Maybe<Scalars['ID']['output']>;
};

export type ApiOrderItemWhereInput = {
  And?: InputMaybe<Array<ApiOrderItemWhereInput>>;
  Or?: InputMaybe<Array<ApiOrderItemWhereInput>>;
  createdAt?: InputMaybe<Scalars['FilterV2']['input']>;
  discount?: InputMaybe<Scalars['FilterV2']['input']>;
  discountAmount?: InputMaybe<Scalars['FilterV2']['input']>;
  fulfillmentId?: InputMaybe<Scalars['FilterV2']['input']>;
  id?: InputMaybe<Scalars['FilterV2']['input']>;
  orderId?: InputMaybe<Scalars['FilterV2']['input']>;
  originalQuantity?: InputMaybe<Scalars['FilterV2']['input']>;
  price?: InputMaybe<Scalars['FilterV2']['input']>;
  product?: InputMaybe<ApiProductWhereInput>;
  productCostPrice?: InputMaybe<Scalars['FilterV2']['input']>;
  productId?: InputMaybe<Scalars['FilterV2']['input']>;
  quantity?: InputMaybe<Scalars['FilterV2']['input']>;
  subtotalAmount?: InputMaybe<Scalars['FilterV2']['input']>;
  taxAmount?: InputMaybe<Scalars['FilterV2']['input']>;
  totalAmount?: InputMaybe<Scalars['FilterV2']['input']>;
  updatedAt?: InputMaybe<Scalars['FilterV2']['input']>;
  weight?: InputMaybe<Scalars['FilterV2']['input']>;
  weightUnit?: InputMaybe<Scalars['FilterV2']['input']>;
};

export type ApiOrderMutation = {
  __typename?: 'OrderMutation';
  addComment: Scalars['Boolean']['output'];
  cancel: Scalars['Boolean']['output'];
  create: Scalars['ID']['output'];
  createOrderItem: Scalars['Boolean']['output'];
  createShippingItem: Scalars['Boolean']['output'];
  deleteCustomer: Scalars['Boolean']['output'];
  deleteOrderItem: Scalars['Boolean']['output'];
  splitFulfillment: Scalars['Boolean']['output'];
  undoSplitFulfillment: Scalars['Boolean']['output'];
  update: Scalars['Boolean']['output'];
  updateAdminNote: Scalars['Boolean']['output'];
  updateCustomer: Scalars['Boolean']['output'];
  updateFulfillmentStatus: Scalars['Boolean']['output'];
  updateLabels: Scalars['Boolean']['output'];
  updateOrderItem: Scalars['Boolean']['output'];
  updatePaymentStatus: Scalars['Boolean']['output'];
  updateShippingItem: Scalars['Boolean']['output'];
  updateStatus: Scalars['Boolean']['output'];
  updateTags: Scalars['Boolean']['output'];
};


export type ApiOrderMutationAddCommentArgs = {
  input: ApiAddCommentInput;
};


export type ApiOrderMutationCancelArgs = {
  input: ApiCancelOrderInput;
};


export type ApiOrderMutationCreateArgs = {
  input: ApiCreateOrderInput;
};


export type ApiOrderMutationCreateOrderItemArgs = {
  input: ApiCreateOrderItemInput;
};


export type ApiOrderMutationCreateShippingItemArgs = {
  input: ApiCreateShippingItemInput;
};


export type ApiOrderMutationDeleteCustomerArgs = {
  id: Scalars['ID']['input'];
};


export type ApiOrderMutationDeleteOrderItemArgs = {
  id: Scalars['ID']['input'];
};


export type ApiOrderMutationSplitFulfillmentArgs = {
  input: ApiSplitFulfillmentInput;
};


export type ApiOrderMutationUndoSplitFulfillmentArgs = {
  id: Scalars['ID']['input'];
};


export type ApiOrderMutationUpdateArgs = {
  input: ApiUpdateOrderInput;
};


export type ApiOrderMutationUpdateAdminNoteArgs = {
  input: ApiUpdateAdminNoteInput;
};


export type ApiOrderMutationUpdateCustomerArgs = {
  input: ApiUpdateOrderCustomerInput;
};


export type ApiOrderMutationUpdateFulfillmentStatusArgs = {
  input: ApiUpdateFulfillmentStatusInput;
};


export type ApiOrderMutationUpdateLabelsArgs = {
  input: ApiUpdateOrderLabelsInput;
};


export type ApiOrderMutationUpdateOrderItemArgs = {
  input: ApiUpdateOrderItemInput;
};


export type ApiOrderMutationUpdatePaymentStatusArgs = {
  input: ApiUpdatePaymentStatusInput;
};


export type ApiOrderMutationUpdateShippingItemArgs = {
  input: ApiUpdateShippingItemInput;
};


export type ApiOrderMutationUpdateStatusArgs = {
  input: ApiUpdateOrderStatusInput;
};


export type ApiOrderMutationUpdateTagsArgs = {
  input: ApiUpdateOrderTagsInput;
};

export type ApiOrderPaymentInfoInput = {
  billingAddress?: InputMaybe<ApiAddressInput>;
  paymentMethodId?: InputMaybe<Scalars['String']['input']>;
};

export type ApiOrderQuery = {
  __typename?: 'OrderQuery';
  findMany: ApiOrdersOutput;
  findOne?: Maybe<ApiOrder>;
};


export type ApiOrderQueryFindManyArgs = {
  input?: InputMaybe<ApiOrdersInput>;
};


export type ApiOrderQueryFindOneArgs = {
  id: Scalars['ID']['input'];
};

export type ApiOrderShippingInfoInput = {
  shippingAddress?: InputMaybe<ApiAddressInput>;
  shippingMethodId?: InputMaybe<Scalars['String']['input']>;
};

export enum OrderStatusEnum {
  Active = 'ACTIVE',
  Archived = 'ARCHIVED',
  Cancelled = 'CANCELLED',
  Completed = 'COMPLETED',
  Draft = 'DRAFT'
}

export type ApiOrderTagsWhereInput = {
  And?: InputMaybe<Array<ApiOrderTagsWhereInput>>;
  Or?: InputMaybe<Array<ApiOrderTagsWhereInput>>;
  tagId?: InputMaybe<Scalars['FilterV2']['input']>;
};

export type ApiOrderWhereInput = {
  And?: InputMaybe<Array<ApiOrderWhereInput>>;
  Or?: InputMaybe<Array<ApiOrderWhereInput>>;
  adminNote?: InputMaybe<Scalars['FilterV2']['input']>;
  billingAddress?: InputMaybe<ApiAddressWhereInput>;
  createdAt?: InputMaybe<Scalars['FilterV2']['input']>;
  createdByApiToken?: InputMaybe<Scalars['FilterV2']['input']>;
  createdByUserId?: InputMaybe<Scalars['FilterV2']['input']>;
  crmTicketColumnId?: InputMaybe<Scalars['FilterV2']['input']>;
  currencyCode?: InputMaybe<Scalars['FilterV2']['input']>;
  customerEmail?: InputMaybe<Scalars['FilterV2']['input']>;
  customerFirstName?: InputMaybe<Scalars['FilterV2']['input']>;
  customerId?: InputMaybe<Scalars['FilterV2']['input']>;
  customerLastName?: InputMaybe<Scalars['FilterV2']['input']>;
  customerMiddleName?: InputMaybe<Scalars['FilterV2']['input']>;
  customerPhone?: InputMaybe<Scalars['FilterV2']['input']>;
  displayCurrencyCode?: InputMaybe<Scalars['FilterV2']['input']>;
  fulfillment?: InputMaybe<ApiFulfillmentWhereInput>;
  id?: InputMaybe<Scalars['FilterV2']['input']>;
  items?: InputMaybe<ApiOrderItemWhereInput>;
  orderNumber?: InputMaybe<Scalars['FilterV2']['input']>;
  paymentLine?: InputMaybe<ApiPaymentItemWhereInput>;
  paymentMethodId?: InputMaybe<Scalars['FilterV2']['input']>;
  shippingAddress?: InputMaybe<ApiAddressWhereInput>;
  shippingLine?: InputMaybe<ApiShippingItemWhereInput>;
  shippingMethodId?: InputMaybe<Scalars['FilterV2']['input']>;
  status?: InputMaybe<Scalars['FilterV2']['input']>;
  subtotalAmount?: InputMaybe<Scalars['FilterV2']['input']>;
  tags?: InputMaybe<ApiOrderTagsWhereInput>;
  totalAmount?: InputMaybe<Scalars['FilterV2']['input']>;
  totalDiscountAmount?: InputMaybe<Scalars['FilterV2']['input']>;
  totalRefundedAmount?: InputMaybe<Scalars['FilterV2']['input']>;
  totalShippingAmount?: InputMaybe<Scalars['FilterV2']['input']>;
  totalTaxAmount?: InputMaybe<Scalars['FilterV2']['input']>;
};

export type ApiOrdersInput = {
  order?: InputMaybe<Scalars['String']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  pageSize?: InputMaybe<Scalars['Int']['input']>;
  where?: InputMaybe<ApiOrderWhereInput>;
};

export type ApiOrdersOutput = {
  __typename?: 'OrdersOutput';
  data: Array<ApiOrder>;
  meta: ApiCollectionMeta;
};

export type ApiPage = {
  __typename?: 'Page';
  cover?: Maybe<ApiFile>;
  createdAt: Scalars['Timestamp']['output'];
  description?: Maybe<Scalars['String']['output']>;
  excerpt?: Maybe<Scalars['String']['output']>;
  gallery: Array<ApiFile>;
  id: Scalars['ID']['output'];
  labels: Array<ApiLabel>;
  seoDescription?: Maybe<Scalars['String']['output']>;
  seoTitle?: Maybe<Scalars['String']['output']>;
  slug: Scalars['String']['output'];
  status: Scalars['String']['output'];
  title: Scalars['String']['output'];
  updatedAt: Scalars['Timestamp']['output'];
};

export type ApiPageMutation = {
  __typename?: 'PageMutation';
  create: Scalars['ID']['output'];
  delete: Scalars['Boolean']['output'];
  deleteMany: Scalars['Boolean']['output'];
  update: Scalars['Boolean']['output'];
};


export type ApiPageMutationCreateArgs = {
  input: ApiCreatePageInput;
};


export type ApiPageMutationDeleteArgs = {
  id: Scalars['ID']['input'];
};


export type ApiPageMutationDeleteManyArgs = {
  ids: Array<Scalars['ID']['input']>;
};


export type ApiPageMutationUpdateArgs = {
  input: ApiUpdatePageInput;
};

export type ApiPageQuery = {
  __typename?: 'PageQuery';
  findMany: ApiPagesOutput;
  findOne?: Maybe<ApiPage>;
};


export type ApiPageQueryFindManyArgs = {
  input?: InputMaybe<ApiPagesInput>;
};


export type ApiPageQueryFindOneArgs = {
  id: Scalars['ID']['input'];
};

export type ApiPagesInput = {
  order?: InputMaybe<Scalars['String']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  pageSize?: InputMaybe<Scalars['Int']['input']>;
  where?: InputMaybe<ApiPagesWhereInput>;
};

export type ApiPagesOutput = {
  __typename?: 'PagesOutput';
  data: Array<ApiPage>;
  meta: ApiCollectionMeta;
};

export type ApiPagesWhereInput = {
  And?: InputMaybe<Array<ApiPagesWhereInput>>;
  Or?: InputMaybe<Array<ApiPagesWhereInput>>;
  createdAt?: InputMaybe<Scalars['FilterV2']['input']>;
  id?: InputMaybe<Scalars['FilterV2']['input']>;
  slug?: InputMaybe<Scalars['FilterV2']['input']>;
  status?: InputMaybe<Scalars['FilterV2']['input']>;
  title?: InputMaybe<Scalars['FilterV2']['input']>;
  translationField?: InputMaybe<Scalars['FilterV2']['input']>;
  updatedAt?: InputMaybe<Scalars['FilterV2']['input']>;
};

export type ApiPaginationInfo = {
  __typename?: 'PaginationInfo';
  count: Scalars['Int']['output'];
  hasNextPage: Scalars['Boolean']['output'];
  hasPrevPage: Scalars['Boolean']['output'];
  page: Scalars['Int']['output'];
  perPage: Scalars['Int']['output'];
  total: Scalars['Int']['output'];
  totalPages: Scalars['Int']['output'];
};

export type ApiPaymentItem = {
  __typename?: 'PaymentItem';
  amount: Scalars['Int']['output'];
  createdAt: Scalars['Timestamp']['output'];
  id: Scalars['ID']['output'];
  meta?: Maybe<Scalars['String']['output']>;
  paymentMethod?: Maybe<ApiPaymentMethod>;
  status: PaymentStatusEnum;
};

export type ApiPaymentItemWhereInput = {
  And?: InputMaybe<Array<ApiPaymentItemWhereInput>>;
  Or?: InputMaybe<Array<ApiPaymentItemWhereInput>>;
  amount?: InputMaybe<Scalars['FilterV2']['input']>;
  createdAt?: InputMaybe<Scalars['FilterV2']['input']>;
  id?: InputMaybe<Scalars['FilterV2']['input']>;
  orderId?: InputMaybe<Scalars['FilterV2']['input']>;
  paymentMethodId?: InputMaybe<Scalars['FilterV2']['input']>;
  status?: InputMaybe<Scalars['FilterV2']['input']>;
};

export type ApiPaymentMethod = {
  __typename?: 'PaymentMethod';
  code: Scalars['String']['output'];
  name: Scalars['String']['output'];
  service: ApiPaymentService;
};

export type ApiPaymentMethodMutation = {
  __typename?: 'PaymentMethodMutation';
  create: Scalars['String']['output'];
  delete: Scalars['Boolean']['output'];
};


export type ApiPaymentMethodMutationCreateArgs = {
  input: ApiCreatePaymentMethodInput;
};


export type ApiPaymentMethodMutationDeleteArgs = {
  id: Scalars['String']['input'];
};

export type ApiPaymentMethodQuery = {
  __typename?: 'PaymentMethodQuery';
  findMany: Array<ApiPaymentMethod>;
  findOne?: Maybe<ApiPaymentMethod>;
};


export type ApiPaymentMethodQueryFindOneArgs = {
  id: Scalars['String']['input'];
};

export type ApiPaymentMethodWhereInput = {
  And?: InputMaybe<Array<ApiPaymentMethodWhereInput>>;
  Or?: InputMaybe<Array<ApiPaymentMethodWhereInput>>;
  code?: InputMaybe<Scalars['FilterV2']['input']>;
  name?: InputMaybe<Scalars['FilterV2']['input']>;
  serviceId?: InputMaybe<Scalars['FilterV2']['input']>;
};

export type ApiPaymentService = {
  __typename?: 'PaymentService';
  code: Scalars['String']['output'];
  cover?: Maybe<ApiFile>;
  methods: Array<ApiPaymentMethod>;
  name: Scalars['String']['output'];
};

export type ApiPaymentServiceMutation = {
  __typename?: 'PaymentServiceMutation';
  create: Scalars['String']['output'];
  delete: Scalars['Boolean']['output'];
};


export type ApiPaymentServiceMutationCreateArgs = {
  input: ApiCreatePaymentServiceInput;
};


export type ApiPaymentServiceMutationDeleteArgs = {
  id: Scalars['String']['input'];
};

export type ApiPaymentServiceQuery = {
  __typename?: 'PaymentServiceQuery';
  findMany: Array<ApiPaymentService>;
  findOne?: Maybe<ApiPaymentService>;
};


export type ApiPaymentServiceQueryFindOneArgs = {
  id: Scalars['String']['input'];
};

export enum PaymentStatusEnum {
  Authorized = 'AUTHORIZED',
  Cancelled = 'CANCELLED',
  Captured = 'CAPTURED',
  Failed = 'FAILED',
  Paid = 'PAID',
  PartiallyPaid = 'PARTIALLY_PAID',
  PartiallyRefunded = 'PARTIALLY_REFUNDED',
  Pending = 'PENDING',
  Refunded = 'REFUNDED',
  Voided = 'VOIDED'
}

export type ApiProduct = {
  __typename?: 'Product';
  createdAt: Scalars['Timestamp']['output'];
  description?: Maybe<Scalars['String']['output']>;
  excerpt?: Maybe<Scalars['String']['output']>;
  featuresV2: Array<ApiProductFeatureV2>;
  groups: Array<ApiProductGroup>;
  id: Scalars['ID']['output'];
  labels: Array<ApiLabel>;
  optionsV2: Array<ApiProductFeatureV2>;
  primaryCategory?: Maybe<ApiCategory>;
  requiresShipping?: Maybe<Scalars['Boolean']['output']>;
  seoDescription?: Maybe<Scalars['String']['output']>;
  seoTitle?: Maybe<Scalars['String']['output']>;
  slug: Scalars['String']['output'];
  status: EntityStatus;
  tags: Array<ApiTag>;
  title: Scalars['String']['output'];
  updatedAt: Scalars['Timestamp']['output'];
  variants: Array<ApiVariant>;
};

export type ApiProductCategoriesWhereInput = {
  And?: InputMaybe<Array<ApiProductCategoriesWhereInput>>;
  Or?: InputMaybe<Array<ApiProductCategoriesWhereInput>>;
  categoryId?: InputMaybe<Scalars['FilterV2']['input']>;
};

export type ApiProductFeature = {
  __typename?: 'ProductFeature';
  attributeSortIndex?: Maybe<Scalars['Int']['output']>;
  featureId: Scalars['ID']['output'];
  group: ApiProductFeatureGroup;
  isAttribute: Scalars['Boolean']['output'];
  isOption: Scalars['Boolean']['output'];
  optionSortIndex?: Maybe<Scalars['Int']['output']>;
  slug: Scalars['String']['output'];
  swatch?: Maybe<ApiFeatureSwatch>;
  title: Scalars['String']['output'];
};

export type ApiProductFeatureGroup = {
  __typename?: 'ProductFeatureGroup';
  featureStyleType: FeatureStyleType;
  id: Scalars['ID']['output'];
  slug: Scalars['String']['output'];
  title: Scalars['String']['output'];
};

export type ApiProductFeatureGroupInput = {
  featureStyleType?: InputMaybe<FeatureStyleType>;
  id?: InputMaybe<Scalars['ID']['input']>;
  slug?: InputMaybe<Scalars['String']['input']>;
  title?: InputMaybe<Scalars['String']['input']>;
};

/**
 * ProductFeatureGroupV2 - ДУБЛИКАТ entity.ProductFeatureGroup
 * В V2 это создается из ProductFeature/ProductOption (не отдельная таблица!)
 */
export type ApiProductFeatureGroupV2 = {
  __typename?: 'ProductFeatureGroupV2';
  featureStyleType?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  slug: Scalars['String']['output'];
  title: Scalars['String']['output'];
};

export type ApiProductFeatureInput = {
  attributeSortIndex?: InputMaybe<Scalars['Int']['input']>;
  featureId?: InputMaybe<Scalars['ID']['input']>;
  group?: InputMaybe<ApiProductFeatureGroupInput>;
  isAttribute?: InputMaybe<Scalars['Boolean']['input']>;
  isOption?: InputMaybe<Scalars['Boolean']['input']>;
  optionSortIndex?: InputMaybe<Scalars['Int']['input']>;
  slug?: InputMaybe<Scalars['String']['input']>;
  swatch?: InputMaybe<ApiFeatureSwatchInput>;
  title?: InputMaybe<Scalars['String']['input']>;
};

/** ProductFeatureSwatchV2 - ДУБЛИКАТ entity.FeatureSwatch */
export type ApiProductFeatureSwatchV2 = {
  __typename?: 'ProductFeatureSwatchV2';
  color1?: Maybe<Scalars['String']['output']>;
  color2?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  type: Scalars['String']['output'];
};

/**
 * ProductFeatureV2 - ДУБЛИКАТ entity.ProductFeature (плоская структура V1)
 * V2 storage имеет иерархию (Feature → Values), но GraphQL возвращает плоскую структуру
 */
export type ApiProductFeatureV2 = {
  __typename?: 'ProductFeatureV2';
  attributeSortIndex?: Maybe<Scalars['Int']['output']>;
  featureId: Scalars['ID']['output'];
  group: ApiProductFeatureGroupV2;
  isAttribute: Scalars['Boolean']['output'];
  isOption: Scalars['Boolean']['output'];
  optionSortIndex?: Maybe<Scalars['Int']['output']>;
  slug: Scalars['String']['output'];
  styleType?: Maybe<Scalars['String']['output']>;
  swatch?: Maybe<ApiProductFeatureSwatchV2>;
  title: Scalars['String']['output'];
};

export type ApiProductFeaturesWhereInput = {
  And?: InputMaybe<Array<ApiProductFeaturesWhereInput>>;
  Or?: InputMaybe<Array<ApiProductFeaturesWhereInput>>;
  groupId?: InputMaybe<Scalars['FilterV2']['input']>;
  id?: InputMaybe<Scalars['FilterV2']['input']>;
  isAttribute?: InputMaybe<Scalars['FilterV2']['input']>;
  isOption?: InputMaybe<Scalars['FilterV2']['input']>;
};

export type ApiProductFilterV2 = {
  order?: InputMaybe<Scalars['String']['input']>;
  where?: InputMaybe<ApiFiltersWhereInput>;
};

export type ApiProductGroup = {
  __typename?: 'ProductGroup';
  id: Scalars['ID']['output'];
  isMultiple: Scalars['Boolean']['output'];
  isRequired: Scalars['Boolean']['output'];
  items: Array<ApiProductGroupItem>;
  sortIndex: Scalars['Int']['output'];
  title: Scalars['String']['output'];
};

export type ApiProductGroupItem = {
  __typename?: 'ProductGroupItem';
  id: Scalars['ID']['output'];
  maxQuantity?: Maybe<Scalars['Int']['output']>;
  priceAmountValue?: Maybe<Scalars['Int']['output']>;
  pricePercentageValue?: Maybe<Scalars['Float']['output']>;
  priceType: ProductGroupPriceType;
  sortIndex: Scalars['Int']['output'];
  variant: ApiVariant;
};

export enum ProductGroupPriceType {
  Base = 'BASE',
  BaseAdjustAmount = 'BASE_ADJUST_AMOUNT',
  BaseAdjustPercent = 'BASE_ADJUST_PERCENT',
  BaseOverride = 'BASE_OVERRIDE',
  Free = 'FREE'
}

export type ApiProductMutation = {
  __typename?: 'ProductMutation';
  archive: Scalars['Boolean']['output'];
  archiveMany: Scalars['Boolean']['output'];
  create: ApiProduct;
  createMany: Array<Scalars['Boolean']['output']>;
  delete: Scalars['Boolean']['output'];
  deleteMany: Scalars['Boolean']['output'];
  update: ApiProduct;
};


export type ApiProductMutationArchiveArgs = {
  id: Scalars['ID']['input'];
};


export type ApiProductMutationArchiveManyArgs = {
  ids: Array<Scalars['ID']['input']>;
};


export type ApiProductMutationCreateArgs = {
  input: ApiCreateProductInput;
};


export type ApiProductMutationCreateManyArgs = {
  input: Array<ApiCreateProductInput>;
};


export type ApiProductMutationDeleteArgs = {
  id: Scalars['ID']['input'];
};


export type ApiProductMutationDeleteManyArgs = {
  ids: Array<Scalars['ID']['input']>;
};


export type ApiProductMutationUpdateArgs = {
  input: ApiUpdateProductInput;
};

export type ApiProductQuery = {
  __typename?: 'ProductQuery';
  findByListingFilters: Array<ApiVariant>;
  findMany: ApiProductsOutput;
  findManyVariants: ApiVariantsOutput;
  findOne?: Maybe<ApiProduct>;
};


export type ApiProductQueryFindByListingFiltersArgs = {
  filters: Array<ApiCreateListingFilterInput>;
  order: Scalars['String']['input'];
};


export type ApiProductQueryFindManyArgs = {
  input?: InputMaybe<ApiProductsInput>;
};


export type ApiProductQueryFindManyVariantsArgs = {
  input?: InputMaybe<ApiVariantsInput>;
};


export type ApiProductQueryFindOneArgs = {
  id: Scalars['ID']['input'];
};

export type ApiProductSnapshot = {
  __typename?: 'ProductSnapshot';
  attributes: Array<ApiProductSnapshotAttribute>;
  barcode?: Maybe<Scalars['String']['output']>;
  containerId: Scalars['ID']['output'];
  containerTitle: Scalars['String']['output'];
  costPrice?: Maybe<Scalars['Int']['output']>;
  cover?: Maybe<ApiFile>;
  createdAt: Scalars['Timestamp']['output'];
  currencyCode: Scalars['String']['output'];
  dimensionUnit?: Maybe<DimensionUnit>;
  gallery: Array<ApiFile>;
  groups: Array<ApiProductSnapshotGroup>;
  height?: Maybe<Scalars['Float']['output']>;
  length?: Maybe<Scalars['Float']['output']>;
  oldPrice?: Maybe<Scalars['Int']['output']>;
  options: Array<ApiProductSnapshotOption>;
  price: Scalars['Int']['output'];
  productId: Scalars['ID']['output'];
  requiresShipping: Scalars['Boolean']['output'];
  schemaVersion: Scalars['Int']['output'];
  sku?: Maybe<Scalars['String']['output']>;
  slug: Scalars['String']['output'];
  title: Scalars['String']['output'];
  variantId: Scalars['ID']['output'];
  weight?: Maybe<Scalars['Float']['output']>;
  weightUnit?: Maybe<WeightUnit>;
  width?: Maybe<Scalars['Float']['output']>;
};

export type ApiProductSnapshotAttribute = {
  __typename?: 'ProductSnapshotAttribute';
  featureId: Scalars['ID']['output'];
  groupId: Scalars['ID']['output'];
  groupTitle: Scalars['String']['output'];
  sortIndex: Scalars['Int']['output'];
  title: Scalars['String']['output'];
};

export type ApiProductSnapshotGroup = {
  __typename?: 'ProductSnapshotGroup';
  id: Scalars['ID']['output'];
  isMultiple: Scalars['Boolean']['output'];
  isRequired: Scalars['Boolean']['output'];
  items: Array<ApiProductSnapshotGroupItem>;
  sortIndex: Scalars['Int']['output'];
  title: Scalars['String']['output'];
};

export type ApiProductSnapshotGroupItem = {
  __typename?: 'ProductSnapshotGroupItem';
  id: Scalars['ID']['output'];
  maxQuantity?: Maybe<Scalars['Int']['output']>;
  price: Scalars['Int']['output'];
  priceType: Scalars['String']['output'];
  quantity: Scalars['Int']['output'];
  sku?: Maybe<Scalars['String']['output']>;
  sortIndex: Scalars['Int']['output'];
  title: Scalars['String']['output'];
  variantId: Scalars['ID']['output'];
};

export type ApiProductSnapshotOption = {
  __typename?: 'ProductSnapshotOption';
  featureId: Scalars['ID']['output'];
  groupId: Scalars['ID']['output'];
  groupTitle: Scalars['String']['output'];
  sortIndex: Scalars['Int']['output'];
  swatch?: Maybe<ApiProductSnapshotSwatch>;
  title: Scalars['String']['output'];
};

export type ApiProductSnapshotSwatch = {
  __typename?: 'ProductSnapshotSwatch';
  color1?: Maybe<Scalars['String']['output']>;
  color2?: Maybe<Scalars['String']['output']>;
  image?: Maybe<ApiFile>;
  type: Scalars['String']['output'];
};

export type ApiProductTagsWhereInput = {
  And?: InputMaybe<Array<ApiProductTagsWhereInput>>;
  Or?: InputMaybe<Array<ApiProductTagsWhereInput>>;
  tagId?: InputMaybe<Scalars['FilterV2']['input']>;
};

export type ApiProductVariantsInput = {
  create?: InputMaybe<Array<ApiCreateProductVariantInput>>;
  delete?: InputMaybe<Array<Scalars['ID']['input']>>;
  update?: InputMaybe<Array<ApiUpdateProductVariantInput>>;
};

export type ApiProductWhereInput = {
  And?: InputMaybe<Array<ApiProductWhereInput>>;
  Or?: InputMaybe<Array<ApiProductWhereInput>>;
  categories?: InputMaybe<ApiProductCategoriesWhereInput>;
  createdAt?: InputMaybe<Scalars['FilterV2']['input']>;
  id?: InputMaybe<Scalars['FilterV2']['input']>;
  locale?: InputMaybe<Scalars['FilterV2']['input']>;
  status?: InputMaybe<Scalars['FilterV2']['input']>;
  tags?: InputMaybe<ApiProductTagsWhereInput>;
  title?: InputMaybe<Scalars['FilterV2']['input']>;
  trackQuantity?: InputMaybe<Scalars['FilterV2']['input']>;
  translationField?: InputMaybe<Scalars['FilterV2']['input']>;
  updatedAt?: InputMaybe<Scalars['FilterV2']['input']>;
  variants?: InputMaybe<ApiVariantWhereInput>;
};

export type ApiProductsInput = {
  order?: InputMaybe<Scalars['String']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  pageSize?: InputMaybe<Scalars['Int']['input']>;
  where?: InputMaybe<ApiProductWhereInput>;
};

export type ApiProductsOutput = {
  __typename?: 'ProductsOutput';
  data: Array<ApiProduct>;
  meta: ApiCollectionMeta;
};

export type ApiProject = {
  __typename?: 'Project';
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  slug: Scalars['String']['output'];
  status: ProjectStatus;
};

export type ApiProjectInfo = {
  __typename?: 'ProjectInfo';
  country: Scalars['String']['output'];
  currency: Scalars['String']['output'];
  email: Scalars['String']['output'];
  locale: Scalars['String']['output'];
  name: Scalars['String']['output'];
  phoneNumber: Scalars['String']['output'];
  timezone: Scalars['String']['output'];
};

export type ApiProjectMutation = {
  __typename?: 'ProjectMutation';
  create: ApiProject;
  createApiKey: Scalars['String']['output'];
  delete: Scalars['Boolean']['output'];
  deleteApiKey: Scalars['Boolean']['output'];
  revokeApiKey: Scalars['Boolean']['output'];
  update: Scalars['Boolean']['output'];
  updateCurrencyFormat: Scalars['Boolean']['output'];
  updateDefaultCurrency: Scalars['Boolean']['output'];
  updateDefaultLocale: Scalars['Boolean']['output'];
  updateLocales: Scalars['Boolean']['output'];
};


export type ApiProjectMutationCreateArgs = {
  input: ApiCreateProjectInput;
};


export type ApiProjectMutationCreateApiKeyArgs = {
  input: ApiCreateApiKeyInput;
};


export type ApiProjectMutationDeleteArgs = {
  id: Scalars['ID']['input'];
};


export type ApiProjectMutationDeleteApiKeyArgs = {
  input: Scalars['ID']['input'];
};


export type ApiProjectMutationRevokeApiKeyArgs = {
  input: Scalars['ID']['input'];
};


export type ApiProjectMutationUpdateArgs = {
  input: ApiUpdateProjectInput;
};


export type ApiProjectMutationUpdateCurrencyFormatArgs = {
  input: ApiUpdateCurrencyFormatInput;
};


export type ApiProjectMutationUpdateDefaultCurrencyArgs = {
  input: Scalars['String']['input'];
};


export type ApiProjectMutationUpdateDefaultLocaleArgs = {
  input: Scalars['String']['input'];
};


export type ApiProjectMutationUpdateLocalesArgs = {
  input: ApiUpdateLocalesInput;
};

export type ApiProjectQuery = {
  __typename?: 'ProjectQuery';
  apiKeys: Array<ApiApiKey>;
  currencies: Array<ApiCurrency>;
  current: ApiProjectInfo;
  findMany: Array<Maybe<ApiProject>>;
  findOne?: Maybe<ApiProject>;
  locales: Array<ApiLocale>;
};


export type ApiProjectQueryFindOneArgs = {
  slug: Scalars['String']['input'];
};

export enum ProjectStatus {
  Active = 'ACTIVE',
  Inactive = 'INACTIVE'
}

export type ApiQuery = {
  __typename?: 'Query';
  appsQuery: ApiAppsQuery;
  cartQuery: ApiCartQuery;
  categoryQuery: ApiCategoryQuery;
  crmQuery: ApiCrmQuery;
  customerQuery: ApiCustomerQuery;
  emailProfilesQuery: ApiEmailProfilesQuery;
  emailSettingsQuery: ApiEmailSettingsQuery;
  emailTemplateQuery: ApiEmailTemplateQuery;
  fileQuery: ApiFileQuery;
  filterQuery: ApiFilterQuery;
  labelQuery: ApiLabelQuery;
  linkQuery: ApiLinkQuery;
  listingQuery: ApiListingQuery;
  menuQuery: ApiMenuQuery;
  orderQuery: ApiOrderQuery;
  pageQuery: ApiPageQuery;
  paymentMethodQuery: ApiPaymentMethodQuery;
  paymentServiceQuery: ApiPaymentServiceQuery;
  productQuery: ApiProductQuery;
  projectQuery: ApiProjectQuery;
  reviewQuery: ApiReviewQuery;
  shippingMethodQuery: ApiShippingMethodQuery;
  shippingServiceQuery: ApiShippingServiceQuery;
  stockStatusQuery: ApiStockStatusQuery;
  tagQuery: ApiTagQuery;
  translationQuery: ApiTranslationQuery;
  userQuery: ApiUserQuery;
};

export type ApiRejectReviewInput = {
  id: Scalars['ID']['input'];
  reason: Scalars['String']['input'];
};

export type ApiReplyToReviewInput = {
  reviewId: Scalars['ID']['input'];
  text: Scalars['String']['input'];
};

export type ApiResetPasswordInput = {
  email: Scalars['String']['input'];
  password: Scalars['String']['input'];
  token: Scalars['String']['input'];
};

export type ApiReview = {
  __typename?: 'Review';
  cons?: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['Timestamp']['output'];
  customer?: Maybe<ApiCustomer>;
  displayName: Scalars['String']['output'];
  helpfulNo: Scalars['Int']['output'];
  helpfulYes: Scalars['Int']['output'];
  id: Scalars['ID']['output'];
  languageCode?: Maybe<Scalars['String']['output']>;
  message: Scalars['String']['output'];
  product?: Maybe<ApiVariant>;
  pros?: Maybe<Scalars['String']['output']>;
  rating: Scalars['Float']['output'];
  status: ReviewStatus;
  title: Scalars['String']['output'];
  updatedAt: Scalars['Timestamp']['output'];
  verifiedPurchase?: Maybe<Scalars['Boolean']['output']>;
};

export type ApiReviewMutation = {
  __typename?: 'ReviewMutation';
  approve: Scalars['Boolean']['output'];
  bulkUpdateStatus: Scalars['Boolean']['output'];
  create: Scalars['ID']['output'];
  delete: Scalars['Boolean']['output'];
  edit: Scalars['Boolean']['output'];
  reject: Scalars['Boolean']['output'];
  replyToReview: Scalars['Boolean']['output'];
};


export type ApiReviewMutationApproveArgs = {
  input: ApiApproveReviewInput;
};


export type ApiReviewMutationBulkUpdateStatusArgs = {
  input: ApiBulkUpdateStatusInput;
};


export type ApiReviewMutationCreateArgs = {
  input: ApiCreateReviewInput;
};


export type ApiReviewMutationDeleteArgs = {
  input: Scalars['ID']['input'];
};


export type ApiReviewMutationEditArgs = {
  input: ApiUpdateReviewInput;
};


export type ApiReviewMutationRejectArgs = {
  input: ApiRejectReviewInput;
};


export type ApiReviewMutationReplyToReviewArgs = {
  input: ApiReplyToReviewInput;
};

export type ApiReviewQuery = {
  __typename?: 'ReviewQuery';
  findMany: ApiReviewsOutput;
  findOne?: Maybe<ApiReview>;
};


export type ApiReviewQueryFindManyArgs = {
  input?: InputMaybe<ApiReviewsInput>;
};


export type ApiReviewQueryFindOneArgs = {
  id: Scalars['ID']['input'];
};

export enum ReviewStatus {
  Approved = 'APPROVED',
  Pending = 'PENDING',
  Rejected = 'REJECTED'
}

export type ApiReviewsInput = {
  order?: InputMaybe<Scalars['String']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  pageSize?: InputMaybe<Scalars['Int']['input']>;
  where?: InputMaybe<ApiReviewsWhereInput>;
};

export type ApiReviewsOutput = {
  __typename?: 'ReviewsOutput';
  data: Array<ApiReview>;
  meta: ApiCollectionMeta;
};

export type ApiReviewsWhereInput = {
  And?: InputMaybe<Array<ApiReviewsWhereInput>>;
  Or?: InputMaybe<Array<ApiReviewsWhereInput>>;
  createdAt?: InputMaybe<Scalars['FilterV2']['input']>;
  id?: InputMaybe<Scalars['FilterV2']['input']>;
  status?: InputMaybe<Scalars['FilterV2']['input']>;
  updatedAt?: InputMaybe<Scalars['FilterV2']['input']>;
};

export type ApiSearchMutation = {
  __typename?: 'SearchMutation';
  keywordCreate: Scalars['Boolean']['output'];
  keywordDelete: Scalars['Boolean']['output'];
  keywordGroupCreate: Scalars['ID']['output'];
  keywordGroupDelete: Scalars['Boolean']['output'];
  keywordGroupUpdate: Scalars['Boolean']['output'];
  languageConfigUpsert: Scalars['Boolean']['output'];
  linkGroupToProduct: Scalars['Boolean']['output'];
  stopWordSet: Scalars['Boolean']['output'];
  synonymDelete: Scalars['Boolean']['output'];
  synonymUpsert: Scalars['Boolean']['output'];
  unlinkGroupFromProduct: Scalars['Boolean']['output'];
};


export type ApiSearchMutationKeywordCreateArgs = {
  input: ApiKeywordCreateInput;
};


export type ApiSearchMutationKeywordDeleteArgs = {
  input: ApiKeywordDeleteInput;
};


export type ApiSearchMutationKeywordGroupCreateArgs = {
  input: ApiKeywordGroupCreateInput;
};


export type ApiSearchMutationKeywordGroupDeleteArgs = {
  input: ApiKeywordGroupDeleteInput;
};


export type ApiSearchMutationKeywordGroupUpdateArgs = {
  input: ApiKeywordGroupUpdateInput;
};


export type ApiSearchMutationLanguageConfigUpsertArgs = {
  input: ApiLanguageConfigInput;
};


export type ApiSearchMutationLinkGroupToProductArgs = {
  input: ApiGroupProductLinkInput;
};


export type ApiSearchMutationStopWordSetArgs = {
  input: ApiStopWordSetInput;
};


export type ApiSearchMutationSynonymDeleteArgs = {
  input: ApiSynonymDeleteInput;
};


export type ApiSearchMutationSynonymUpsertArgs = {
  input: ApiSynonymUpsertInput;
};


export type ApiSearchMutationUnlinkGroupFromProductArgs = {
  input: ApiGroupProductLinkInput;
};

export type ApiSendTestEmailInput = {
  to: Scalars['String']['input'];
  type: EmailTypeEnum;
};

export type ApiSeoFieldsInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  title?: InputMaybe<Scalars['String']['input']>;
};

export type ApiSession = {
  __typename?: 'Session';
  jwt: Scalars['String']['output'];
  user: ApiUser;
};

export type ApiShippingItem = {
  __typename?: 'ShippingItem';
  createdAt: Scalars['Timestamp']['output'];
  estimatedDeliveryAt?: Maybe<Scalars['Timestamp']['output']>;
  id: Scalars['ID']['output'];
  notificationsEnabled?: Maybe<Scalars['Boolean']['output']>;
  shippingMethod?: Maybe<ApiCoreShippingMethod>;
  shippingPrice: Scalars['Int']['output'];
  shippingService?: Maybe<ApiShippingService>;
  trackingCode?: Maybe<Scalars['String']['output']>;
  trackingData?: Maybe<Scalars['String']['output']>;
  trackingEnabled: Scalars['Boolean']['output'];
  trackingUrl?: Maybe<Scalars['String']['output']>;
};

export type ApiShippingItemWhereInput = {
  And?: InputMaybe<Array<ApiShippingItemWhereInput>>;
  Or?: InputMaybe<Array<ApiShippingItemWhereInput>>;
  createdAt?: InputMaybe<Scalars['FilterV2']['input']>;
  estimatedDeliveryAt?: InputMaybe<Scalars['FilterV2']['input']>;
  fulfillmentId?: InputMaybe<Scalars['FilterV2']['input']>;
  id?: InputMaybe<Scalars['FilterV2']['input']>;
  notificationsEnabled?: InputMaybe<Scalars['FilterV2']['input']>;
  orderId?: InputMaybe<Scalars['FilterV2']['input']>;
  shippingMethodId?: InputMaybe<Scalars['FilterV2']['input']>;
  shippingServiceId?: InputMaybe<Scalars['FilterV2']['input']>;
  trackingCode?: InputMaybe<Scalars['FilterV2']['input']>;
  trackingEnabled?: InputMaybe<Scalars['FilterV2']['input']>;
  trackingUrl?: InputMaybe<Scalars['FilterV2']['input']>;
};

export type ApiShippingMethodMutation = {
  __typename?: 'ShippingMethodMutation';
  create: Scalars['String']['output'];
  delete: Scalars['Boolean']['output'];
};


export type ApiShippingMethodMutationCreateArgs = {
  input: ApiCreateShippingMethodInput;
};


export type ApiShippingMethodMutationDeleteArgs = {
  id: Scalars['String']['input'];
};

export type ApiShippingMethodQuery = {
  __typename?: 'ShippingMethodQuery';
  findMany: Array<ApiCoreShippingMethod>;
  findOne?: Maybe<ApiCoreShippingMethod>;
};


export type ApiShippingMethodQueryFindOneArgs = {
  id: Scalars['String']['input'];
};

export type ApiShippingMethodWhereInput = {
  And?: InputMaybe<Array<ApiShippingMethodWhereInput>>;
  Or?: InputMaybe<Array<ApiShippingMethodWhereInput>>;
  code?: InputMaybe<Scalars['FilterV2']['input']>;
  name?: InputMaybe<Scalars['FilterV2']['input']>;
  serviceId?: InputMaybe<Scalars['FilterV2']['input']>;
};

export type ApiShippingService = {
  __typename?: 'ShippingService';
  code: Scalars['String']['output'];
  cover?: Maybe<ApiFile>;
  methods: Array<ApiCoreShippingMethod>;
  name: Scalars['String']['output'];
};

export type ApiShippingServiceMutation = {
  __typename?: 'ShippingServiceMutation';
  create: Scalars['String']['output'];
  delete: Scalars['Boolean']['output'];
};


export type ApiShippingServiceMutationCreateArgs = {
  input: ApiCreateShippingServiceInput;
};


export type ApiShippingServiceMutationDeleteArgs = {
  id: Scalars['String']['input'];
};

export type ApiShippingServiceQuery = {
  __typename?: 'ShippingServiceQuery';
  findMany: Array<ApiShippingService>;
  findOne?: Maybe<ApiShippingService>;
};


export type ApiShippingServiceQueryFindOneArgs = {
  id: Scalars['String']['input'];
};

export type ApiSignInInput = {
  email: Scalars['String']['input'];
  password: Scalars['String']['input'];
};

export type ApiSignUpInput = {
  email: Scalars['String']['input'];
  firstName: Scalars['String']['input'];
  language: Scalars['String']['input'];
  lastName: Scalars['String']['input'];
  password: Scalars['String']['input'];
  timezone: Scalars['String']['input'];
};

export type ApiSortRankInput = {
  next: Scalars['String']['input'];
  prev: Scalars['String']['input'];
};

export type ApiSplitFulfillmentInput = {
  id: Scalars['ID']['input'];
  items: Array<ApiSplitFulfillmentItemInput>;
};

export type ApiSplitFulfillmentItemInput = {
  orderItemId: Scalars['ID']['input'];
  quantity: Scalars['Int']['input'];
};

export type ApiStockStatus = {
  __typename?: 'StockStatus';
  code: Scalars['String']['output'];
  title: Scalars['String']['output'];
};

export type ApiStockStatusMutation = {
  __typename?: 'StockStatusMutation';
  create: ApiStockStatus;
  delete: Scalars['Boolean']['output'];
  update: ApiStockStatus;
};


export type ApiStockStatusMutationCreateArgs = {
  input: ApiCreateStockStatusInput;
};


export type ApiStockStatusMutationDeleteArgs = {
  code: Scalars['String']['input'];
};


export type ApiStockStatusMutationUpdateArgs = {
  input: ApiUpdateStockStatusInput;
};

export type ApiStockStatusQuery = {
  __typename?: 'StockStatusQuery';
  findMany: Array<ApiStockStatus>;
  findOne?: Maybe<ApiStockStatus>;
};


export type ApiStockStatusQueryFindOneArgs = {
  code: Scalars['String']['input'];
};

export type ApiStopWordSetInput = {
  isActive: Scalars['Boolean']['input'];
  localeCode: Scalars['String']['input'];
  word: Scalars['String']['input'];
};

export type ApiSynonymDeleteInput = {
  localeCode: Scalars['String']['input'];
  synonym: Scalars['String']['input'];
  term: Scalars['String']['input'];
};

export type ApiSynonymUpsertInput = {
  localeCode: Scalars['String']['input'];
  synonym: Scalars['String']['input'];
  term: Scalars['String']['input'];
  weight: Scalars['Float']['input'];
};

export type ApiTag = {
  __typename?: 'Tag';
  color?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  slug: Scalars['String']['output'];
  title: Scalars['String']['output'];
};

export type ApiTagMutation = {
  __typename?: 'TagMutation';
  create: Scalars['ID']['output'];
  update: Scalars['Boolean']['output'];
};


export type ApiTagMutationCreateArgs = {
  input: ApiCreateTagInput;
};


export type ApiTagMutationUpdateArgs = {
  input: ApiUpdateTagInput;
};

export type ApiTagQuery = {
  __typename?: 'TagQuery';
  findMany: ApiTagsOutput;
  findOne?: Maybe<ApiTag>;
};


export type ApiTagQueryFindManyArgs = {
  input?: InputMaybe<ApiTagsInput>;
};


export type ApiTagQueryFindOneArgs = {
  id: Scalars['ID']['input'];
};

export type ApiTagWhereInput = {
  And?: InputMaybe<Array<ApiTagWhereInput>>;
  Or?: InputMaybe<Array<ApiTagWhereInput>>;
  id?: InputMaybe<Scalars['FilterV2']['input']>;
  slug?: InputMaybe<Scalars['FilterV2']['input']>;
};

export type ApiTagsInput = {
  order?: InputMaybe<Scalars['String']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  pageSize?: InputMaybe<Scalars['Int']['input']>;
  where?: InputMaybe<ApiTagWhereInput>;
};

export type ApiTagsOutput = {
  __typename?: 'TagsOutput';
  data: Array<ApiTag>;
  meta: ApiCollectionMeta;
};

export type ApiTranslation = {
  __typename?: 'Translation';
  fieldName: TranslationField;
  fieldValue: Scalars['String']['output'];
  locale: Scalars['String']['output'];
  sourceId: Scalars['ID']['output'];
  sourceType: EntityType;
};

export enum TranslationField {
  DescriptionHtml = 'DESCRIPTION_HTML',
  DescriptionJson = 'DESCRIPTION_JSON',
  DescriptionText = 'DESCRIPTION_TEXT',
  ExcerptText = 'EXCERPT_TEXT',
  SeoDescription = 'SEO_DESCRIPTION',
  SeoTitle = 'SEO_TITLE',
  Title = 'TITLE'
}

export type ApiTranslationMutation = {
  __typename?: 'TranslationMutation';
  create: ApiTranslation;
  update: ApiTranslation;
  updateMany: Scalars['Boolean']['output'];
};


export type ApiTranslationMutationCreateArgs = {
  input: ApiCreateTranslationInput;
};


export type ApiTranslationMutationUpdateArgs = {
  input: ApiUpdateTranslationInput;
};


export type ApiTranslationMutationUpdateManyArgs = {
  input: Array<ApiUpdateTranslationInput>;
};

export type ApiTranslationQuery = {
  __typename?: 'TranslationQuery';
  findMany: Array<ApiTranslation>;
};


export type ApiTranslationQueryFindManyArgs = {
  where: ApiTranslationWhereInput;
};

export type ApiTranslationWhereInput = {
  And?: InputMaybe<Array<ApiTranslationWhereInput>>;
  Or?: InputMaybe<Array<ApiTranslationWhereInput>>;
  fieldName?: InputMaybe<Scalars['FilterV2']['input']>;
  fieldValue?: InputMaybe<Scalars['FilterV2']['input']>;
  locale?: InputMaybe<Scalars['FilterV2']['input']>;
  sourceId?: InputMaybe<Scalars['FilterV2']['input']>;
  sourceType?: InputMaybe<Scalars['FilterV2']['input']>;
};

export enum UnitSystem {
  Imperial = 'IMPERIAL',
  Metric = 'METRIC'
}

export type ApiUpdateAdminNoteInput = {
  adminNote?: InputMaybe<Scalars['String']['input']>;
  id: Scalars['ID']['input'];
};

export type ApiUpdateCategoryInput = {
  children?: InputMaybe<Array<InputMaybe<Scalars['ID']['input']>>>;
  coverId?: InputMaybe<Scalars['ID']['input']>;
  description?: InputMaybe<ApiDescriptionFieldsInput>;
  excerpt?: InputMaybe<Scalars['String']['input']>;
  gallery?: InputMaybe<Array<Scalars['ID']['input']>>;
  id: Scalars['ID']['input'];
  includeChildrenProducts?: InputMaybe<Scalars['Boolean']['input']>;
  labels?: InputMaybe<Array<Scalars['ID']['input']>>;
  listingFilters?: InputMaybe<Array<ApiCreateListingFilterInput>>;
  listingOrderBy?: InputMaybe<ListingSort>;
  listingOrderByStatus?: InputMaybe<Scalars['Boolean']['input']>;
  listingType?: InputMaybe<ListingType>;
  parentId?: InputMaybe<Scalars['ID']['input']>;
  products?: InputMaybe<Array<Scalars['ID']['input']>>;
  seo?: InputMaybe<ApiSeoFieldsInput>;
  slug?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<Scalars['String']['input']>;
  tags?: InputMaybe<Array<Scalars['ID']['input']>>;
  title?: InputMaybe<Scalars['String']['input']>;
};

export type ApiUpdateCategoryProductInput = {
  afterId?: InputMaybe<Scalars['ID']['input']>;
  categoryId: Scalars['ID']['input'];
  productId: Scalars['ID']['input'];
};

export type ApiUpdateCurrencyFormatInput = {
  code: Scalars['String']['input'];
  decimalPlaces?: InputMaybe<Scalars['Int']['input']>;
  decimalSeparator?: InputMaybe<Scalars['String']['input']>;
  symbolLeft?: InputMaybe<Scalars['String']['input']>;
  symbolRight?: InputMaybe<Scalars['String']['input']>;
  thousandSeparator?: InputMaybe<Scalars['String']['input']>;
};

export type ApiUpdateCustomerInput = {
  email?: InputMaybe<Scalars['String']['input']>;
  firstName?: InputMaybe<Scalars['String']['input']>;
  id: Scalars['ID']['input'];
  isVerified?: InputMaybe<Scalars['Boolean']['input']>;
  language?: InputMaybe<Scalars['String']['input']>;
  lastName?: InputMaybe<Scalars['String']['input']>;
  password?: InputMaybe<Scalars['String']['input']>;
  phone?: InputMaybe<Scalars['String']['input']>;
};

export type ApiUpdateEmailInput = {
  email: Scalars['String']['input'];
};

export type ApiUpdateEmailProfilesInput = {
  host?: InputMaybe<Scalars['String']['input']>;
  password?: InputMaybe<Scalars['String']['input']>;
  port?: InputMaybe<Scalars['Int']['input']>;
  sortIndex?: InputMaybe<Scalars['Int']['input']>;
  username?: InputMaybe<Scalars['String']['input']>;
};

export type ApiUpdateEmailSettingsInput = {
  from?: InputMaybe<Scalars['String']['input']>;
  replyTo?: InputMaybe<Scalars['String']['input']>;
};

export type ApiUpdateEmailTemplateInput = {
  id: Scalars['ID']['input'];
  subject?: InputMaybe<Scalars['String']['input']>;
  template?: InputMaybe<Scalars['String']['input']>;
};

export type ApiUpdateFileInput = {
  driver: FileDriver;
  file: Scalars['Upload']['input'];
  id: Scalars['ID']['input'];
  name: Scalars['String']['input'];
  url?: InputMaybe<Scalars['String']['input']>;
};

export type ApiUpdateFilterInput = {
  id: Scalars['ID']['input'];
  isActive?: InputMaybe<Scalars['Boolean']['input']>;
  sortIndex?: InputMaybe<Scalars['Int']['input']>;
  title?: InputMaybe<Scalars['String']['input']>;
  type?: InputMaybe<FilterType>;
};

export type ApiUpdateFulfillmentStatusInput = {
  comment?: InputMaybe<Scalars['String']['input']>;
  id: Scalars['ID']['input'];
  status: FulfillmentStatusEnum;
};

export type ApiUpdateImageInput = {
  image: Scalars['ID']['input'];
};

export type ApiUpdateLabelInput = {
  colorHex?: InputMaybe<Scalars['String']['input']>;
  id: Scalars['ID']['input'];
  name?: InputMaybe<Scalars['String']['input']>;
  slug?: InputMaybe<Scalars['String']['input']>;
};

export type ApiUpdateLinkInput = {
  entryId?: InputMaybe<Scalars['ID']['input']>;
  id: Scalars['ID']['input'];
  parentId?: InputMaybe<Scalars['ID']['input']>;
  slug?: InputMaybe<Scalars['String']['input']>;
  sortIndex?: InputMaybe<Scalars['Int']['input']>;
  title?: InputMaybe<Scalars['String']['input']>;
  type?: InputMaybe<MenuNodeType>;
};

export type ApiUpdateLocaleInput = {
  code: Scalars['String']['input'];
  isActive: Scalars['Boolean']['input'];
};

export type ApiUpdateLocalesInput = {
  create: Array<ApiCreateLocaleInput>;
  delete: Array<Scalars['String']['input']>;
  update: Array<ApiUpdateLocaleInput>;
};

export type ApiUpdateMenuInput = {
  id: Scalars['ID']['input'];
  items?: InputMaybe<Array<ApiUpdateLinkInput>>;
  slug?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<EntityStatus>;
  title?: InputMaybe<Scalars['String']['input']>;
};

export type ApiUpdateOrderCurrencyInput = {
  currency: ApiOrderCurrencyInput;
  id: Scalars['ID']['input'];
};

export type ApiUpdateOrderCustomerInput = {
  customerId: Scalars['ID']['input'];
  id: Scalars['ID']['input'];
};

export type ApiUpdateOrderInput = {
  id: Scalars['ID']['input'];
  payment?: InputMaybe<ApiOrderPaymentInfoInput>;
  shipping?: InputMaybe<ApiOrderShippingInfoInput>;
};

export type ApiUpdateOrderItemInput = {
  id: Scalars['ID']['input'];
  productCostPrice?: InputMaybe<Scalars['Int']['input']>;
  quantity?: InputMaybe<Scalars['Int']['input']>;
  weight?: InputMaybe<ApiWeightInput>;
};

export type ApiUpdateOrderLabelsInput = {
  id: Scalars['ID']['input'];
  labels?: InputMaybe<Array<Scalars['ID']['input']>>;
};

export type ApiUpdateOrderStatusInput = {
  comment?: InputMaybe<Scalars['String']['input']>;
  id: Scalars['ID']['input'];
  status: OrderStatusEnum;
};

export type ApiUpdateOrderTagsInput = {
  id: Scalars['ID']['input'];
  labels?: InputMaybe<Array<Scalars['ID']['input']>>;
  tags?: InputMaybe<Array<Scalars['ID']['input']>>;
};

export type ApiUpdatePageInput = {
  coverId?: InputMaybe<Scalars['ID']['input']>;
  description?: InputMaybe<ApiDescriptionFieldsInput>;
  excerpt?: InputMaybe<Scalars['String']['input']>;
  gallery?: InputMaybe<Array<Scalars['ID']['input']>>;
  id: Scalars['ID']['input'];
  labels?: InputMaybe<Array<Scalars['ID']['input']>>;
  seo?: InputMaybe<ApiSeoFieldsInput>;
  slug?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<Scalars['String']['input']>;
  title?: InputMaybe<Scalars['String']['input']>;
};

export type ApiUpdatePasswordInput = {
  password: Scalars['String']['input'];
};

export type ApiUpdatePaymentStatusInput = {
  comment?: InputMaybe<Scalars['String']['input']>;
  id: Scalars['ID']['input'];
  status: PaymentStatusEnum;
};

export type ApiUpdatePhoneNumberInput = {
  phoneNumber: Scalars['String']['input'];
};

export type ApiUpdateProductGroupInput = {
  id: Scalars['ID']['input'];
  isMultiple?: InputMaybe<Scalars['Boolean']['input']>;
  isRequired?: InputMaybe<Scalars['Boolean']['input']>;
  items?: InputMaybe<ApiUpdateProductGroupItemsInput>;
  sortIndex?: InputMaybe<Scalars['Int']['input']>;
  title?: InputMaybe<Scalars['String']['input']>;
};

export type ApiUpdateProductGroupItemInput = {
  id: Scalars['ID']['input'];
  maxQuantity?: InputMaybe<Scalars['Int']['input']>;
  priceAmountValue?: InputMaybe<Scalars['Int']['input']>;
  pricePercentageValue?: InputMaybe<Scalars['Float']['input']>;
  priceType?: InputMaybe<ProductGroupPriceType>;
  sortIndex?: InputMaybe<Scalars['Int']['input']>;
};

export type ApiUpdateProductGroupItemsInput = {
  create?: InputMaybe<Array<ApiCreateProductGroupItemInput>>;
  delete?: InputMaybe<Array<Scalars['ID']['input']>>;
  update?: InputMaybe<Array<ApiUpdateProductGroupItemInput>>;
};

export type ApiUpdateProductGroupsInput = {
  create?: InputMaybe<Array<ApiCreateProductGroupInput>>;
  delete?: InputMaybe<Array<Scalars['ID']['input']>>;
  update?: InputMaybe<Array<ApiUpdateProductGroupInput>>;
};

export type ApiUpdateProductInput = {
  description?: InputMaybe<ApiDescriptionFieldsInput>;
  excerpt?: InputMaybe<Scalars['String']['input']>;
  groups?: InputMaybe<ApiUpdateProductGroupsInput>;
  id: Scalars['ID']['input'];
  labels?: InputMaybe<Array<Scalars['ID']['input']>>;
  primaryCategory?: InputMaybe<Scalars['ID']['input']>;
  requiresShipping?: InputMaybe<Scalars['Boolean']['input']>;
  seo?: InputMaybe<ApiSeoFieldsInput>;
  slug?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<EntityStatus>;
  tags?: InputMaybe<Array<Scalars['ID']['input']>>;
  title?: InputMaybe<Scalars['String']['input']>;
  variants?: InputMaybe<ApiProductVariantsInput>;
};

export type ApiUpdateProductVariantInput = {
  barcode?: InputMaybe<Scalars['String']['input']>;
  categories?: InputMaybe<Array<Scalars['ID']['input']>>;
  costPrice?: InputMaybe<Scalars['Int']['input']>;
  coverId?: InputMaybe<Scalars['ID']['input']>;
  dimensionUnit?: InputMaybe<DimensionUnit>;
  features?: InputMaybe<Array<ApiProductFeatureInput>>;
  gallery?: InputMaybe<Array<Scalars['ID']['input']>>;
  height?: InputMaybe<Scalars['Float']['input']>;
  id: Scalars['ID']['input'];
  inListing?: InputMaybe<Scalars['Boolean']['input']>;
  length?: InputMaybe<Scalars['Float']['input']>;
  oldPrice?: InputMaybe<Scalars['Int']['input']>;
  price?: InputMaybe<Scalars['Int']['input']>;
  sku?: InputMaybe<Scalars['String']['input']>;
  slug?: InputMaybe<Scalars['String']['input']>;
  stockStatus?: InputMaybe<Scalars['String']['input']>;
  title?: InputMaybe<Scalars['String']['input']>;
  variantSortIndex?: InputMaybe<Scalars['Int']['input']>;
  weight?: InputMaybe<Scalars['Float']['input']>;
  weightUnit?: InputMaybe<WeightUnit>;
  width?: InputMaybe<Scalars['Float']['input']>;
};

export type ApiUpdateProfileInput = {
  firstName?: InputMaybe<Scalars['String']['input']>;
  language?: InputMaybe<Scalars['String']['input']>;
  lastName?: InputMaybe<Scalars['String']['input']>;
  timezone?: InputMaybe<Scalars['String']['input']>;
};

export type ApiUpdateProjectInput = {
  country?: InputMaybe<Scalars['String']['input']>;
  email?: InputMaybe<Scalars['String']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  phoneNumber?: InputMaybe<Scalars['String']['input']>;
  timezone?: InputMaybe<Scalars['String']['input']>;
  unitSystem?: InputMaybe<UnitSystem>;
  weightUnit?: InputMaybe<WeightUnit>;
};

export type ApiUpdateReviewInput = {
  cons?: InputMaybe<Scalars['String']['input']>;
  customerId?: InputMaybe<Scalars['ID']['input']>;
  displayName?: InputMaybe<Scalars['String']['input']>;
  id: Scalars['ID']['input'];
  images?: InputMaybe<Array<Scalars['ID']['input']>>;
  message?: InputMaybe<Scalars['String']['input']>;
  productId?: InputMaybe<Scalars['ID']['input']>;
  pros?: InputMaybe<Scalars['String']['input']>;
  rating?: InputMaybe<Scalars['Float']['input']>;
  status?: InputMaybe<ReviewStatus>;
  title?: InputMaybe<Scalars['String']['input']>;
};

export type ApiUpdateShippingItemInput = {
  estimatedDeliveryAt?: InputMaybe<Scalars['Timestamp']['input']>;
  id: Scalars['ID']['input'];
  notificationsEnabled?: InputMaybe<Scalars['Boolean']['input']>;
  shippingMethodId?: InputMaybe<Scalars['String']['input']>;
  shippingPrice?: InputMaybe<Scalars['Int']['input']>;
  trackingCode?: InputMaybe<Scalars['String']['input']>;
  trackingData?: InputMaybe<Scalars['String']['input']>;
  trackingEnabled?: InputMaybe<Scalars['Boolean']['input']>;
  trackingUrl?: InputMaybe<Scalars['String']['input']>;
};

export type ApiUpdateStockStatusInput = {
  code?: InputMaybe<Scalars['String']['input']>;
  id: Scalars['ID']['input'];
  isAvailable?: InputMaybe<Scalars['Boolean']['input']>;
  title?: InputMaybe<Scalars['String']['input']>;
};

export type ApiUpdateTagInput = {
  color?: InputMaybe<Scalars['String']['input']>;
  id: Scalars['ID']['input'];
  slug?: InputMaybe<Scalars['String']['input']>;
  title?: InputMaybe<Scalars['String']['input']>;
};

export type ApiUpdateTranslationInput = {
  fieldName: TranslationField;
  fieldValue: Scalars['String']['input'];
  locale: Scalars['String']['input'];
  sourceId: Scalars['ID']['input'];
  sourceType: EntityType;
};

export type ApiUser = {
  __typename?: 'User';
  createdAt: Scalars['Timestamp']['output'];
  email: Scalars['String']['output'];
  firstName: Scalars['String']['output'];
  id: Scalars['String']['output'];
  isReady: Scalars['Boolean']['output'];
  isVerified: Scalars['Boolean']['output'];
  language: Scalars['String']['output'];
  lastName: Scalars['String']['output'];
  phoneNumber?: Maybe<Scalars['String']['output']>;
  tenantId: Scalars['ID']['output'];
  timezone: Scalars['String']['output'];
  updatedAt: Scalars['Timestamp']['output'];
};

export type ApiUserMutation = {
  __typename?: 'UserMutation';
  createProfile: Scalars['Boolean']['output'];
  delete: Scalars['Boolean']['output'];
  forgotPassword: Scalars['Boolean']['output'];
  googleSignIn: ApiSession;
  invite?: Maybe<Scalars['Boolean']['output']>;
  resetPassword: Scalars['Boolean']['output'];
  signIn: ApiSession;
  signUp: ApiSession;
  updateEmail: Scalars['Boolean']['output'];
  updateImage: Scalars['Boolean']['output'];
  updatePassword: Scalars['Boolean']['output'];
  updatePhoneNumber: Scalars['Boolean']['output'];
  updateProfile: Scalars['Boolean']['output'];
  verifyEmail: Scalars['Boolean']['output'];
};


export type ApiUserMutationCreateProfileArgs = {
  input: ApiCreateProfileInput;
};


export type ApiUserMutationForgotPasswordArgs = {
  input: ApiForgotPasswordInput;
};


export type ApiUserMutationGoogleSignInArgs = {
  token: Scalars['String']['input'];
};


export type ApiUserMutationInviteArgs = {
  input: ApiInviteInput;
};


export type ApiUserMutationResetPasswordArgs = {
  input: ApiResetPasswordInput;
};


export type ApiUserMutationSignInArgs = {
  input: ApiSignInInput;
};


export type ApiUserMutationSignUpArgs = {
  input: ApiSignUpInput;
};


export type ApiUserMutationUpdateEmailArgs = {
  input: ApiUpdateEmailInput;
};


export type ApiUserMutationUpdateImageArgs = {
  input: ApiUpdateImageInput;
};


export type ApiUserMutationUpdatePasswordArgs = {
  input: ApiUpdatePasswordInput;
};


export type ApiUserMutationUpdatePhoneNumberArgs = {
  input: ApiUpdatePhoneNumberInput;
};


export type ApiUserMutationUpdateProfileArgs = {
  input: ApiUpdateProfileInput;
};


export type ApiUserMutationVerifyEmailArgs = {
  input: ApiVerifyEmailInput;
};

export type ApiUserQuery = {
  __typename?: 'UserQuery';
  me: ApiUser;
};

export type ApiVariant = {
  __typename?: 'Variant';
  barcode?: Maybe<Scalars['String']['output']>;
  categories: Array<ApiCategory>;
  containerId: Scalars['ID']['output'];
  containerTitle: Scalars['String']['output'];
  costPrice?: Maybe<Scalars['Int']['output']>;
  cover?: Maybe<ApiFile>;
  createdAt: Scalars['Timestamp']['output'];
  dimensionUnit?: Maybe<DimensionUnit>;
  features: Array<ApiProductFeature>;
  featuresV2: Array<ApiProductFeatureV2>;
  gallery: Array<ApiFile>;
  height?: Maybe<Scalars['Float']['output']>;
  id: Scalars['ID']['output'];
  inListing?: Maybe<Scalars['Boolean']['output']>;
  length?: Maybe<Scalars['Float']['output']>;
  listingSortIndex?: Maybe<Scalars['String']['output']>;
  oldPrice?: Maybe<Scalars['Int']['output']>;
  price: Scalars['Int']['output'];
  sku?: Maybe<Scalars['String']['output']>;
  slug: Scalars['String']['output'];
  stockStatus: Scalars['String']['output'];
  title: Scalars['String']['output'];
  updatedAt: Scalars['Timestamp']['output'];
  variantSortIndex: Scalars['Int']['output'];
  weight?: Maybe<Scalars['Float']['output']>;
  weightUnit?: Maybe<WeightUnit>;
  width?: Maybe<Scalars['Float']['output']>;
};

export type ApiVariantWhereInput = {
  And?: InputMaybe<Array<ApiVariantWhereInput>>;
  Or?: InputMaybe<Array<ApiVariantWhereInput>>;
  categoryId?: InputMaybe<Scalars['FilterV2']['input']>;
  container?: InputMaybe<ApiProductWhereInput>;
  containerId?: InputMaybe<Scalars['FilterV2']['input']>;
  createdAt?: InputMaybe<Scalars['FilterV2']['input']>;
  features?: InputMaybe<ApiProductFeaturesWhereInput>;
  id?: InputMaybe<Scalars['FilterV2']['input']>;
  oldPrice?: InputMaybe<Scalars['FilterV2']['input']>;
  price?: InputMaybe<Scalars['FilterV2']['input']>;
  qnt?: InputMaybe<Scalars['FilterV2']['input']>;
  sku?: InputMaybe<Scalars['FilterV2']['input']>;
  slug?: InputMaybe<Scalars['FilterV2']['input']>;
  stockStatus?: InputMaybe<Scalars['FilterV2']['input']>;
  title?: InputMaybe<Scalars['FilterV2']['input']>;
  updatedAt?: InputMaybe<Scalars['FilterV2']['input']>;
};

export type ApiVariantsInput = {
  order?: InputMaybe<Scalars['String']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  pageSize?: InputMaybe<Scalars['Int']['input']>;
  where?: InputMaybe<ApiVariantWhereInput>;
};

export type ApiVariantsOutput = {
  __typename?: 'VariantsOutput';
  data: Array<ApiVariant>;
  meta: ApiCollectionMeta;
};

export type ApiVerifyEmailInput = {
  email: Scalars['String']['input'];
  token: Scalars['String']['input'];
};

export type ApiWeight = {
  __typename?: 'Weight';
  unit: WeightUnit;
  weight: Scalars['Float']['output'];
};

export type ApiWeightInput = {
  unit: WeightUnit;
  weight: Scalars['Float']['input'];
};

export enum WeightUnit {
  Gr = 'GR',
  Kg = 'KG',
  Lb = 'LB',
  Oz = 'OZ'
}
