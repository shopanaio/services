import { CurrencyCode } from '@shopana/shared-references';
import { LocaleCode } from '@shopana/shared-references';
import { WeightUnit } from '@shopana/shared-references';
import { DimensionUnit } from '@shopana/shared-references';
import { GraphQLResolveInfo, GraphQLScalarType, GraphQLScalarTypeConfig } from 'graphql';
import { ServiceContext } from '../../../context/types.js';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
export type EnumResolverSignature<T, AllowedValues = any> = { [key in keyof T]?: AllowedValues };
export type RequireFields<T, K extends keyof T> = Omit<T, K> & { [P in K]-?: NonNullable<T[P]> };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  /** A CSS color represented as a hexadecimal string. */
  Color: { input: any; output: any; }
  /** An opaque cursor used for pagination. */
  Cursor: { input: any; output: any; }
  /** An ISO 8601-encoded date and time string. */
  DateTime: { input: any; output: any; }
  /** An arbitrary-precision signed decimal number. */
  Decimal: { input: any; output: any; }
  /** An email address. */
  Email: { input: any; output: any; }
  /** A string containing HTML code. */
  HTML: { input: any; output: any; }
  /** An ISO 8601-encoded date and time string. */
  ISO8601DateTime: { input: any; output: any; }
  /** A JSON-serializable value. */
  JSON: { input: any; output: any; }
  /** An RFC 3986 and RFC 3987 compliant URI string. */
  URL: { input: any; output: any; }
  /** An unsigned 64-bit integer serialized as a decimal string. */
  UnsignedInt64: { input: any; output: any; }
  _FieldSet: { input: any; output: any; }
};

/** Shared fields exposed by every Relay-style connection. */
export type Connection = {
  pageInfo: PageInfo;
  totalCount: Scalars['Int']['output'];
};

export type Country = {
  __typename?: 'Country';
  code: CountryCode;
  name: Scalars['String']['output'];
};

/** Supported country codes. */
export enum CountryCode {
  Ac = 'AC',
  Ad = 'AD',
  Ae = 'AE',
  Af = 'AF',
  Ag = 'AG',
  Ai = 'AI',
  Al = 'AL',
  Am = 'AM',
  An = 'AN',
  Ao = 'AO',
  Ar = 'AR',
  At = 'AT',
  Au = 'AU',
  Aw = 'AW',
  Ax = 'AX',
  Az = 'AZ',
  Ba = 'BA',
  Bb = 'BB',
  Bd = 'BD',
  Be = 'BE',
  Bf = 'BF',
  Bg = 'BG',
  Bh = 'BH',
  Bi = 'BI',
  Bj = 'BJ',
  Bl = 'BL',
  Bm = 'BM',
  Bn = 'BN',
  Bo = 'BO',
  Bq = 'BQ',
  Br = 'BR',
  Bs = 'BS',
  Bt = 'BT',
  Bv = 'BV',
  Bw = 'BW',
  By = 'BY',
  Bz = 'BZ',
  Ca = 'CA',
  Cc = 'CC',
  Cd = 'CD',
  Cf = 'CF',
  Cg = 'CG',
  Ch = 'CH',
  Ci = 'CI',
  Ck = 'CK',
  Cl = 'CL',
  Cm = 'CM',
  Cn = 'CN',
  Co = 'CO',
  Cr = 'CR',
  Cu = 'CU',
  Cv = 'CV',
  Cw = 'CW',
  Cx = 'CX',
  Cy = 'CY',
  Cz = 'CZ',
  De = 'DE',
  Dj = 'DJ',
  Dk = 'DK',
  Dm = 'DM',
  Do = 'DO',
  Dz = 'DZ',
  Ec = 'EC',
  Ee = 'EE',
  Eg = 'EG',
  Eh = 'EH',
  Er = 'ER',
  Es = 'ES',
  Et = 'ET',
  Fi = 'FI',
  Fj = 'FJ',
  Fk = 'FK',
  Fm = 'FM',
  Fo = 'FO',
  Fr = 'FR',
  Ga = 'GA',
  Gb = 'GB',
  Gd = 'GD',
  Ge = 'GE',
  Gf = 'GF',
  Gg = 'GG',
  Gh = 'GH',
  Gi = 'GI',
  Gl = 'GL',
  Gm = 'GM',
  Gn = 'GN',
  Gp = 'GP',
  Gq = 'GQ',
  Gr = 'GR',
  Gs = 'GS',
  Gt = 'GT',
  Gw = 'GW',
  Gy = 'GY',
  Hk = 'HK',
  Hm = 'HM',
  Hn = 'HN',
  Hr = 'HR',
  Ht = 'HT',
  Hu = 'HU',
  Id = 'ID',
  Ie = 'IE',
  Il = 'IL',
  Im = 'IM',
  In = 'IN',
  Io = 'IO',
  Iq = 'IQ',
  Ir = 'IR',
  Is = 'IS',
  It = 'IT',
  Je = 'JE',
  Jm = 'JM',
  Jo = 'JO',
  Jp = 'JP',
  Ke = 'KE',
  Kg = 'KG',
  Kh = 'KH',
  Ki = 'KI',
  Km = 'KM',
  Kn = 'KN',
  Kp = 'KP',
  Kr = 'KR',
  Kw = 'KW',
  Ky = 'KY',
  Kz = 'KZ',
  La = 'LA',
  Lb = 'LB',
  Lc = 'LC',
  Li = 'LI',
  Lk = 'LK',
  Lr = 'LR',
  Ls = 'LS',
  Lt = 'LT',
  Lu = 'LU',
  Lv = 'LV',
  Ly = 'LY',
  Ma = 'MA',
  Mc = 'MC',
  Md = 'MD',
  Me = 'ME',
  Mf = 'MF',
  Mg = 'MG',
  Mh = 'MH',
  Mk = 'MK',
  Ml = 'ML',
  Mm = 'MM',
  Mn = 'MN',
  Mo = 'MO',
  Mq = 'MQ',
  Mr = 'MR',
  Ms = 'MS',
  Mt = 'MT',
  Mu = 'MU',
  Mv = 'MV',
  Mw = 'MW',
  Mx = 'MX',
  My = 'MY',
  Mz = 'MZ',
  Na = 'NA',
  Nc = 'NC',
  Ne = 'NE',
  Nf = 'NF',
  Ng = 'NG',
  Ni = 'NI',
  Nl = 'NL',
  No = 'NO',
  Np = 'NP',
  Nr = 'NR',
  Nu = 'NU',
  Nz = 'NZ',
  Om = 'OM',
  Pa = 'PA',
  Pe = 'PE',
  Pf = 'PF',
  Pg = 'PG',
  Ph = 'PH',
  Pk = 'PK',
  Pl = 'PL',
  Pm = 'PM',
  Pn = 'PN',
  Ps = 'PS',
  Pt = 'PT',
  Pw = 'PW',
  Py = 'PY',
  Qa = 'QA',
  Re = 'RE',
  Ro = 'RO',
  Rs = 'RS',
  Ru = 'RU',
  Rw = 'RW',
  Sa = 'SA',
  Sb = 'SB',
  Sc = 'SC',
  Sd = 'SD',
  Se = 'SE',
  Sg = 'SG',
  Sh = 'SH',
  Si = 'SI',
  Sj = 'SJ',
  Sk = 'SK',
  Sl = 'SL',
  Sm = 'SM',
  Sn = 'SN',
  So = 'SO',
  Sr = 'SR',
  Ss = 'SS',
  St = 'ST',
  Sv = 'SV',
  Sx = 'SX',
  Sy = 'SY',
  Sz = 'SZ',
  Ta = 'TA',
  Tc = 'TC',
  Td = 'TD',
  Tf = 'TF',
  Tg = 'TG',
  Th = 'TH',
  Tj = 'TJ',
  Tk = 'TK',
  Tl = 'TL',
  Tm = 'TM',
  Tn = 'TN',
  To = 'TO',
  Tr = 'TR',
  Tt = 'TT',
  Tv = 'TV',
  Tw = 'TW',
  Tz = 'TZ',
  Ua = 'UA',
  Ug = 'UG',
  Um = 'UM',
  Us = 'US',
  Uy = 'UY',
  Uz = 'UZ',
  Va = 'VA',
  Vc = 'VC',
  Ve = 'VE',
  Vg = 'VG',
  Vi = 'VI',
  Vn = 'VN',
  Vu = 'VU',
  Wf = 'WF',
  Ws = 'WS',
  Xk = 'XK',
  Ye = 'YE',
  Yt = 'YT',
  Za = 'ZA',
  Zm = 'ZM',
  Zw = 'ZW',
  Zz = 'ZZ'
}

export type Currency = {
  __typename?: 'Currency';
  code: CurrencyCode;
  name: Scalars['String']['output'];
  symbol: Scalars['String']['output'];
};

export { CurrencyCode };

export { DimensionUnit };

/** Physical dimensions expressed in a common length unit. */
export type Dimensions = {
  __typename?: 'Dimensions';
  height: Scalars['Float']['output'];
  length: Scalars['Float']['output'];
  unit: DimensionUnit;
  width: Scalars['Float']['output'];
};

/** Represents an error in the input of a mutation. */
export type DisplayableError = {
  field: Maybe<Array<Scalars['String']['output']>>;
  message: Scalars['String']['output'];
};

export type Language = {
  __typename?: 'Language';
  code: LocaleCode;
  name: Scalars['String']['output'];
};

export { LocaleCode };

export type Localization = {
  __typename?: 'Localization';
  availableCountries: Array<Country>;
  availableCurrencies: Array<Currency>;
  availableLanguages: Array<Language>;
  country: Country;
  currency: Currency;
  language: Language;
  market: Market;
  store: Store;
};

export type Market = Node & {
  __typename?: 'Market';
  countries: Array<Country>;
  currencies: Array<Currency>;
  defaultCountry: Maybe<Country>;
  defaultCurrency: Currency;
  defaultLanguage: Language;
  handle: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  languages: Array<Language>;
  name: Scalars['String']['output'];
  taxIncluded: Scalars['Boolean']['output'];
  timezone: Scalars['String']['output'];
};

export type MarketConnection = Connection & {
  __typename?: 'MarketConnection';
  edges: Array<MarketEdge>;
  nodes: Array<Market>;
  pageInfo: PageInfo;
  totalCount: Scalars['Int']['output'];
};

export type MarketEdge = {
  __typename?: 'MarketEdge';
  cursor: Scalars['Cursor']['output'];
  node: Market;
};

export type MediaImage = {
  __typename?: 'MediaImage';
  id: Scalars['ID']['output'];
};

/** A precise monetary value with its associated currency. */
export type Money = {
  __typename?: 'Money';
  amount: Scalars['Decimal']['output'];
  currencyCode: CurrencyCode;
};

/** Enables global object identification following the Relay specification. */
export type Node = {
  id: Scalars['ID']['output'];
};

/** Returns information about pagination in a connection. */
export type PageInfo = {
  __typename?: 'PageInfo';
  endCursor: Maybe<Scalars['Cursor']['output']>;
  hasNextPage: Scalars['Boolean']['output'];
  hasPreviousPage: Scalars['Boolean']['output'];
  startCursor: Maybe<Scalars['Cursor']['output']>;
};

export type Query = {
  __typename?: 'Query';
  /** Localization resolved for the current storefront request. */
  localization: Localization;
  /** An active storefront market by its stable handle. */
  market: Maybe<Market>;
  /** The store selected by the trusted storefront request context. */
  store: Store;
};


export type QueryMarketArgs = {
  handle: Scalars['String']['input'];
};

/** Localized rich text in plain text, HTML, and structured JSON formats. */
export type RichText = {
  __typename?: 'RichText';
  html: Scalars['HTML']['output'];
  json: Scalars['JSON']['output'];
  text: Scalars['String']['output'];
};

export type Store = Node & {
  __typename?: 'Store';
  address: Maybe<StoreAddress>;
  brand: StoreBrand;
  contact: Maybe<StoreContact>;
  defaultCurrency: CurrencyCode;
  defaultLocale: LocaleCode;
  description: Maybe<Scalars['String']['output']>;
  email: Maybe<Scalars['String']['output']>;
  handle: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  markets: MarketConnection;
  name: Scalars['String']['output'];
  timezone: Scalars['String']['output'];
};


export type StoreMarketsArgs = {
  after?: InputMaybe<Scalars['Cursor']['input']>;
  before?: InputMaybe<Scalars['Cursor']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};

export type StoreAddress = {
  __typename?: 'StoreAddress';
  address1: Maybe<Scalars['String']['output']>;
  address2: Maybe<Scalars['String']['output']>;
  city: Maybe<Scalars['String']['output']>;
  companyName: Maybe<Scalars['String']['output']>;
  countryCode: CountryCode;
  postalCode: Maybe<Scalars['String']['output']>;
  province: Maybe<Scalars['String']['output']>;
};

export type StoreBrand = {
  __typename?: 'StoreBrand';
  coverImage: Maybe<MediaImage>;
  logo: Maybe<MediaImage>;
  primaryColor: Scalars['Color']['output'];
  secondaryColor: Scalars['Color']['output'];
  shortDescription: Maybe<Scalars['String']['output']>;
  slogan: Maybe<Scalars['String']['output']>;
  socialLinks: Array<StoreSocialLink>;
  squareLogo: Maybe<MediaImage>;
};

export type StoreContact = {
  __typename?: 'StoreContact';
  email: Maybe<Scalars['String']['output']>;
  name: Scalars['String']['output'];
  phoneNumbers: Array<Scalars['String']['output']>;
};

export type StoreSocialLink = {
  __typename?: 'StoreSocialLink';
  platform: Scalars['String']['output'];
  url: Scalars['URL']['output'];
};

/** Represents a generic error in the input of a mutation. */
export type UserError = DisplayableError & {
  __typename?: 'UserError';
  field: Maybe<Array<Scalars['String']['output']>>;
  message: Scalars['String']['output'];
};

/** A weight measurement expressed in a supported unit. */
export type Weight = {
  __typename?: 'Weight';
  unit: WeightUnit;
  value: Scalars['Float']['output'];
};

export { WeightUnit };

export type WithIndex<TObject> = TObject & Record<string, any>;
export type ResolversObject<TObject> = WithIndex<TObject>;

export type ResolverTypeWrapper<T> = Promise<T> | T;

export type ReferenceResolver<TResult, TReference, TContext> = (
      reference: TReference,
      context: TContext,
      info: GraphQLResolveInfo
    ) => Promise<TResult> | TResult;

      type ScalarCheck<T, S> = S extends true ? T : NullableCheck<T, S>;
      type NullableCheck<T, S> = Maybe<T> extends T ? Maybe<ListCheck<NonNullable<T>, S>> : ListCheck<T, S>;
      type ListCheck<T, S> = T extends (infer U)[] ? NullableCheck<U, S>[] : GraphQLRecursivePick<T, S>;
      export type GraphQLRecursivePick<T, S> = { [K in keyof T & keyof S]: ScalarCheck<T[K], S[K]> };
    

export type ResolverWithResolve<TResult, TParent, TContext, TArgs> = {
  resolve: ResolverFn<TResult, TParent, TContext, TArgs>;
};
export type Resolver<TResult, TParent = {}, TContext = {}, TArgs = {}> = ResolverFn<TResult, TParent, TContext, TArgs> | ResolverWithResolve<TResult, TParent, TContext, TArgs>;

export type ResolverFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => Promise<TResult> | TResult;

export type SubscriptionSubscribeFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => AsyncIterable<TResult> | Promise<AsyncIterable<TResult>>;

export type SubscriptionResolveFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => TResult | Promise<TResult>;

export interface SubscriptionSubscriberObject<TResult, TKey extends string, TParent, TContext, TArgs> {
  subscribe: SubscriptionSubscribeFn<{ [key in TKey]: TResult }, TParent, TContext, TArgs>;
  resolve?: SubscriptionResolveFn<TResult, { [key in TKey]: TResult }, TContext, TArgs>;
}

export interface SubscriptionResolverObject<TResult, TParent, TContext, TArgs> {
  subscribe: SubscriptionSubscribeFn<any, TParent, TContext, TArgs>;
  resolve: SubscriptionResolveFn<TResult, any, TContext, TArgs>;
}

export type SubscriptionObject<TResult, TKey extends string, TParent, TContext, TArgs> =
  | SubscriptionSubscriberObject<TResult, TKey, TParent, TContext, TArgs>
  | SubscriptionResolverObject<TResult, TParent, TContext, TArgs>;

export type SubscriptionResolver<TResult, TKey extends string, TParent = {}, TContext = {}, TArgs = {}> =
  | ((...args: any[]) => SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>)
  | SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>;

export type TypeResolveFn<TTypes, TParent = {}, TContext = {}> = (
  parent: TParent,
  context: TContext,
  info: GraphQLResolveInfo
) => Maybe<TTypes> | Promise<Maybe<TTypes>>;

export type IsTypeOfResolverFn<T = {}, TContext = {}> = (obj: T, context: TContext, info: GraphQLResolveInfo) => boolean | Promise<boolean>;

export type NextResolverFn<T> = () => Promise<T>;

export type DirectiveResolverFn<TResult = {}, TParent = {}, TContext = {}, TArgs = {}> = (
  next: NextResolverFn<TResult>,
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => TResult | Promise<TResult>;


/** Mapping of interface types */
export type ResolversInterfaceTypes<_RefType extends Record<string, unknown>> = ResolversObject<{
  Connection: ( MarketConnection );
  DisplayableError: ( UserError );
  Node: ( Market ) | ( Store );
}>;

/** Mapping between all available schema types and the resolvers types */
export type ResolversTypes = ResolversObject<{
  Color: ResolverTypeWrapper<Scalars['Color']['output']>;
  Connection: ResolverTypeWrapper<ResolversInterfaceTypes<ResolversTypes>['Connection']>;
  Int: ResolverTypeWrapper<Scalars['Int']['output']>;
  Country: ResolverTypeWrapper<Country>;
  String: ResolverTypeWrapper<Scalars['String']['output']>;
  CountryCode: CountryCode;
  Currency: ResolverTypeWrapper<Currency>;
  CurrencyCode: CurrencyCode;
  Cursor: ResolverTypeWrapper<Scalars['Cursor']['output']>;
  DateTime: ResolverTypeWrapper<Scalars['DateTime']['output']>;
  Decimal: ResolverTypeWrapper<Scalars['Decimal']['output']>;
  DimensionUnit: DimensionUnit;
  Dimensions: ResolverTypeWrapper<Dimensions>;
  Float: ResolverTypeWrapper<Scalars['Float']['output']>;
  DisplayableError: ResolverTypeWrapper<ResolversInterfaceTypes<ResolversTypes>['DisplayableError']>;
  Email: ResolverTypeWrapper<Scalars['Email']['output']>;
  HTML: ResolverTypeWrapper<Scalars['HTML']['output']>;
  ISO8601DateTime: ResolverTypeWrapper<Scalars['ISO8601DateTime']['output']>;
  JSON: ResolverTypeWrapper<Scalars['JSON']['output']>;
  Language: ResolverTypeWrapper<Language>;
  LocaleCode: LocaleCode;
  Localization: ResolverTypeWrapper<Localization>;
  Market: ResolverTypeWrapper<Market>;
  ID: ResolverTypeWrapper<Scalars['ID']['output']>;
  Boolean: ResolverTypeWrapper<Scalars['Boolean']['output']>;
  MarketConnection: ResolverTypeWrapper<MarketConnection>;
  MarketEdge: ResolverTypeWrapper<MarketEdge>;
  MediaImage: ResolverTypeWrapper<MediaImage>;
  Money: ResolverTypeWrapper<Money>;
  Node: ResolverTypeWrapper<ResolversInterfaceTypes<ResolversTypes>['Node']>;
  PageInfo: ResolverTypeWrapper<PageInfo>;
  Query: ResolverTypeWrapper<{}>;
  RichText: ResolverTypeWrapper<RichText>;
  Store: ResolverTypeWrapper<Store>;
  StoreAddress: ResolverTypeWrapper<StoreAddress>;
  StoreBrand: ResolverTypeWrapper<StoreBrand>;
  StoreContact: ResolverTypeWrapper<StoreContact>;
  StoreSocialLink: ResolverTypeWrapper<StoreSocialLink>;
  URL: ResolverTypeWrapper<Scalars['URL']['output']>;
  UnsignedInt64: ResolverTypeWrapper<Scalars['UnsignedInt64']['output']>;
  UserError: ResolverTypeWrapper<UserError>;
  Weight: ResolverTypeWrapper<Weight>;
  WeightUnit: WeightUnit;
}>;

/** Mapping between all available schema types and the resolvers parents */
export type ResolversParentTypes = ResolversObject<{
  Color: Scalars['Color']['output'];
  Connection: ResolversInterfaceTypes<ResolversParentTypes>['Connection'];
  Int: Scalars['Int']['output'];
  Country: Country;
  String: Scalars['String']['output'];
  Currency: Currency;
  Cursor: Scalars['Cursor']['output'];
  DateTime: Scalars['DateTime']['output'];
  Decimal: Scalars['Decimal']['output'];
  Dimensions: Dimensions;
  Float: Scalars['Float']['output'];
  DisplayableError: ResolversInterfaceTypes<ResolversParentTypes>['DisplayableError'];
  Email: Scalars['Email']['output'];
  HTML: Scalars['HTML']['output'];
  ISO8601DateTime: Scalars['ISO8601DateTime']['output'];
  JSON: Scalars['JSON']['output'];
  Language: Language;
  Localization: Localization;
  Market: Market;
  ID: Scalars['ID']['output'];
  Boolean: Scalars['Boolean']['output'];
  MarketConnection: MarketConnection;
  MarketEdge: MarketEdge;
  MediaImage: MediaImage;
  Money: Money;
  Node: ResolversInterfaceTypes<ResolversParentTypes>['Node'];
  PageInfo: PageInfo;
  Query: {};
  RichText: RichText;
  Store: Store;
  StoreAddress: StoreAddress;
  StoreBrand: StoreBrand;
  StoreContact: StoreContact;
  StoreSocialLink: StoreSocialLink;
  URL: Scalars['URL']['output'];
  UnsignedInt64: Scalars['UnsignedInt64']['output'];
  UserError: UserError;
  Weight: Weight;
}>;

export interface ColorScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['Color'], any> {
  name: 'Color';
}

export type ConnectionResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['Connection'] = ResolversParentTypes['Connection']> = ResolversObject<{
  __resolveType: TypeResolveFn<'MarketConnection', ParentType, ContextType>;
  pageInfo?: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
}>;

export type CountryResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['Country'] = ResolversParentTypes['Country']> = ResolversObject<{
  code?: Resolver<ResolversTypes['CountryCode'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CurrencyResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['Currency'] = ResolversParentTypes['Currency']> = ResolversObject<{
  code?: Resolver<ResolversTypes['CurrencyCode'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  symbol?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CurrencyCodeResolvers = EnumResolverSignature<{ AED?: any, AFN?: any, ALL?: any, AMD?: any, ANG?: any, AOA?: any, ARS?: any, AUD?: any, AWG?: any, AZN?: any, BAM?: any, BBD?: any, BDT?: any, BGN?: any, BHD?: any, BIF?: any, BMD?: any, BND?: any, BOB?: any, BRL?: any, BSD?: any, BTN?: any, BWP?: any, BYN?: any, BZD?: any, CAD?: any, CDF?: any, CHF?: any, CLP?: any, CNY?: any, COP?: any, CRC?: any, CUP?: any, CVE?: any, CZK?: any, DJF?: any, DKK?: any, DOP?: any, DZD?: any, EGP?: any, ERN?: any, ETB?: any, EUR?: any, FJD?: any, FKP?: any, FOK?: any, GBP?: any, GEL?: any, GGP?: any, GHS?: any, GIP?: any, GMD?: any, GNF?: any, GTQ?: any, GYD?: any, HKD?: any, HNL?: any, HRK?: any, HTG?: any, HUF?: any, IDR?: any, ILS?: any, IMP?: any, INR?: any, IQD?: any, IRR?: any, ISK?: any, JEP?: any, JMD?: any, JOD?: any, JPY?: any, KES?: any, KGS?: any, KHR?: any, KMF?: any, KPW?: any, KRW?: any, KWD?: any, KYD?: any, KZT?: any, LAK?: any, LBP?: any, LKR?: any, LRD?: any, LSL?: any, LYD?: any, MAD?: any, MDL?: any, MGA?: any, MKD?: any, MMK?: any, MNT?: any, MOP?: any, MRU?: any, MUR?: any, MVR?: any, MWK?: any, MXN?: any, MYR?: any, MZN?: any, NAD?: any, NGN?: any, NIO?: any, NOK?: any, NPR?: any, NZD?: any, OMR?: any, PAB?: any, PEN?: any, PGK?: any, PHP?: any, PKR?: any, PLN?: any, PYG?: any, QAR?: any, RON?: any, RSD?: any, RUB?: any, RWF?: any, SAR?: any, SBD?: any, SCR?: any, SDG?: any, SEK?: any, SGD?: any, SHP?: any, SLE?: any, SOS?: any, SRD?: any, SSP?: any, STN?: any, SVC?: any, SYP?: any, SZL?: any, THB?: any, TJS?: any, TMT?: any, TND?: any, TOP?: any, TRY?: any, TTD?: any, TWD?: any, TZS?: any, UAH?: any, UGX?: any, USD?: any, UYU?: any, UZS?: any, VES?: any, VND?: any, VUV?: any, WST?: any, XAF?: any, XCD?: any, XDR?: any, XOF?: any, XPF?: any, YER?: any, ZAR?: any, ZMW?: any, ZWL?: any }, ResolversTypes['CurrencyCode']>;

export interface CursorScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['Cursor'], any> {
  name: 'Cursor';
}

export interface DateTimeScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['DateTime'], any> {
  name: 'DateTime';
}

export interface DecimalScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['Decimal'], any> {
  name: 'Decimal';
}

export type DimensionUnitResolvers = EnumResolverSignature<{ cm?: any, ft?: any, in?: any, m?: any, mm?: any }, ResolversTypes['DimensionUnit']>;

export type DimensionsResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['Dimensions'] = ResolversParentTypes['Dimensions']> = ResolversObject<{
  height?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  length?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  unit?: Resolver<ResolversTypes['DimensionUnit'], ParentType, ContextType>;
  width?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type DisplayableErrorResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['DisplayableError'] = ResolversParentTypes['DisplayableError']> = ResolversObject<{
  __resolveType: TypeResolveFn<'UserError', ParentType, ContextType>;
  field?: Resolver<Maybe<Array<ResolversTypes['String']>>, ParentType, ContextType>;
  message?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
}>;

export interface EmailScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['Email'], any> {
  name: 'Email';
}

export interface HtmlScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['HTML'], any> {
  name: 'HTML';
}

export interface Iso8601DateTimeScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['ISO8601DateTime'], any> {
  name: 'ISO8601DateTime';
}

export interface JsonScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['JSON'], any> {
  name: 'JSON';
}

export type LanguageResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['Language'] = ResolversParentTypes['Language']> = ResolversObject<{
  code?: Resolver<ResolversTypes['LocaleCode'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type LocaleCodeResolvers = EnumResolverSignature<{ ak?: any, am?: any, ar?: any, as?: any, az?: any, be?: any, bg?: any, bm?: any, bn?: any, bo?: any, br?: any, bs?: any, ca?: any, ce?: any, ckb?: any, cs?: any, cy?: any, da?: any, de?: any, dz?: any, ee?: any, el?: any, en?: any, eo?: any, es?: any, et?: any, eu?: any, fa?: any, ff?: any, fi?: any, fil?: any, fo?: any, fr?: any, fy?: any, ga?: any, gd?: any, gl?: any, gu?: any, gv?: any, ha?: any, he?: any, hi?: any, hr?: any, hu?: any, hy?: any, ia?: any, id?: any, ig?: any, ii?: any, is?: any, it?: any, ja?: any, jv?: any, ka?: any, ki?: any, kk?: any, kl?: any, km?: any, kn?: any, ko?: any, ks?: any, ku?: any, kw?: any, ky?: any, lb?: any, lg?: any, ln?: any, lo?: any, lt?: any, lu?: any, lv?: any, mg?: any, mi?: any, mk?: any, ml?: any, mn?: any, mr?: any, ms?: any, mt?: any, my?: any, nb?: any, nd?: any, ne?: any, nl?: any, nn?: any, no?: any, om?: any, or?: any, os?: any, pa?: any, pl?: any, ps?: any, pt_BR?: any, pt_PT?: any, qu?: any, rm?: any, rn?: any, ro?: any, ru?: any, rw?: any, sa?: any, sc?: any, sd?: any, se?: any, sg?: any, si?: any, sk?: any, sl?: any, sn?: any, so?: any, sq?: any, sr?: any, su?: any, sv?: any, sw?: any, ta?: any, te?: any, tg?: any, th?: any, ti?: any, tk?: any, to?: any, tr?: any, tt?: any, ug?: any, uk?: any, ur?: any, uz?: any, vi?: any, wo?: any, xh?: any, yi?: any, yo?: any, zh_CN?: any, zh_TW?: any, zu?: any }, ResolversTypes['LocaleCode']>;

export type LocalizationResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['Localization'] = ResolversParentTypes['Localization']> = ResolversObject<{
  availableCountries?: Resolver<Array<ResolversTypes['Country']>, ParentType, ContextType>;
  availableCurrencies?: Resolver<Array<ResolversTypes['Currency']>, ParentType, ContextType>;
  availableLanguages?: Resolver<Array<ResolversTypes['Language']>, ParentType, ContextType>;
  country?: Resolver<ResolversTypes['Country'], ParentType, ContextType>;
  currency?: Resolver<ResolversTypes['Currency'], ParentType, ContextType>;
  language?: Resolver<ResolversTypes['Language'], ParentType, ContextType>;
  market?: Resolver<ResolversTypes['Market'], ParentType, ContextType>;
  store?: Resolver<ResolversTypes['Store'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type MarketResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['Market'] = ResolversParentTypes['Market']> = ResolversObject<{
  __resolveReference?: ReferenceResolver<Maybe<ResolversTypes['Market']>, { __typename: 'Market' } & GraphQLRecursivePick<ParentType, {"id":true}>, ContextType>;
  countries?: Resolver<Array<ResolversTypes['Country']>, ParentType, ContextType>;
  currencies?: Resolver<Array<ResolversTypes['Currency']>, ParentType, ContextType>;
  defaultCountry?: Resolver<Maybe<ResolversTypes['Country']>, ParentType, ContextType>;
  defaultCurrency?: Resolver<ResolversTypes['Currency'], ParentType, ContextType>;
  defaultLanguage?: Resolver<ResolversTypes['Language'], ParentType, ContextType>;
  handle?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  languages?: Resolver<Array<ResolversTypes['Language']>, ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  taxIncluded?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  timezone?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type MarketConnectionResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['MarketConnection'] = ResolversParentTypes['MarketConnection']> = ResolversObject<{
  edges?: Resolver<Array<ResolversTypes['MarketEdge']>, ParentType, ContextType>;
  nodes?: Resolver<Array<ResolversTypes['Market']>, ParentType, ContextType>;
  pageInfo?: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type MarketEdgeResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['MarketEdge'] = ResolversParentTypes['MarketEdge']> = ResolversObject<{
  cursor?: Resolver<ResolversTypes['Cursor'], ParentType, ContextType>;
  node?: Resolver<ResolversTypes['Market'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type MediaImageResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['MediaImage'] = ResolversParentTypes['MediaImage']> = ResolversObject<{
  __resolveReference?: ReferenceResolver<Maybe<ResolversTypes['MediaImage']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type MoneyResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['Money'] = ResolversParentTypes['Money']> = ResolversObject<{
  amount?: Resolver<ResolversTypes['Decimal'], ParentType, ContextType>;
  currencyCode?: Resolver<ResolversTypes['CurrencyCode'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type NodeResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['Node'] = ResolversParentTypes['Node']> = ResolversObject<{
  __resolveType: TypeResolveFn<'Market' | 'Store', ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
}>;

export type PageInfoResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['PageInfo'] = ResolversParentTypes['PageInfo']> = ResolversObject<{
  endCursor?: Resolver<Maybe<ResolversTypes['Cursor']>, ParentType, ContextType>;
  hasNextPage?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  hasPreviousPage?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  startCursor?: Resolver<Maybe<ResolversTypes['Cursor']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type QueryResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['Query'] = ResolversParentTypes['Query']> = ResolversObject<{
  localization?: Resolver<ResolversTypes['Localization'], ParentType, ContextType>;
  market?: Resolver<Maybe<ResolversTypes['Market']>, ParentType, ContextType, RequireFields<QueryMarketArgs, 'handle'>>;
  store?: Resolver<ResolversTypes['Store'], ParentType, ContextType>;
}>;

export type RichTextResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['RichText'] = ResolversParentTypes['RichText']> = ResolversObject<{
  html?: Resolver<ResolversTypes['HTML'], ParentType, ContextType>;
  json?: Resolver<ResolversTypes['JSON'], ParentType, ContextType>;
  text?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type StoreResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['Store'] = ResolversParentTypes['Store']> = ResolversObject<{
  __resolveReference?: ReferenceResolver<Maybe<ResolversTypes['Store']>, { __typename: 'Store' } & GraphQLRecursivePick<ParentType, {"id":true}>, ContextType>;
  address?: Resolver<Maybe<ResolversTypes['StoreAddress']>, ParentType, ContextType>;
  brand?: Resolver<ResolversTypes['StoreBrand'], ParentType, ContextType>;
  contact?: Resolver<Maybe<ResolversTypes['StoreContact']>, ParentType, ContextType>;
  defaultCurrency?: Resolver<ResolversTypes['CurrencyCode'], ParentType, ContextType>;
  defaultLocale?: Resolver<ResolversTypes['LocaleCode'], ParentType, ContextType>;
  description?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  email?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  handle?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  markets?: Resolver<ResolversTypes['MarketConnection'], ParentType, ContextType, RequireFields<StoreMarketsArgs, 'first'>>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  timezone?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type StoreAddressResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['StoreAddress'] = ResolversParentTypes['StoreAddress']> = ResolversObject<{
  address1?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  address2?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  city?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  companyName?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  countryCode?: Resolver<ResolversTypes['CountryCode'], ParentType, ContextType>;
  postalCode?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  province?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type StoreBrandResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['StoreBrand'] = ResolversParentTypes['StoreBrand']> = ResolversObject<{
  coverImage?: Resolver<Maybe<ResolversTypes['MediaImage']>, ParentType, ContextType>;
  logo?: Resolver<Maybe<ResolversTypes['MediaImage']>, ParentType, ContextType>;
  primaryColor?: Resolver<ResolversTypes['Color'], ParentType, ContextType>;
  secondaryColor?: Resolver<ResolversTypes['Color'], ParentType, ContextType>;
  shortDescription?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  slogan?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  socialLinks?: Resolver<Array<ResolversTypes['StoreSocialLink']>, ParentType, ContextType>;
  squareLogo?: Resolver<Maybe<ResolversTypes['MediaImage']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type StoreContactResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['StoreContact'] = ResolversParentTypes['StoreContact']> = ResolversObject<{
  email?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  phoneNumbers?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type StoreSocialLinkResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['StoreSocialLink'] = ResolversParentTypes['StoreSocialLink']> = ResolversObject<{
  platform?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  url?: Resolver<ResolversTypes['URL'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export interface UrlScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['URL'], any> {
  name: 'URL';
}

export interface UnsignedInt64ScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['UnsignedInt64'], any> {
  name: 'UnsignedInt64';
}

export type UserErrorResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['UserError'] = ResolversParentTypes['UserError']> = ResolversObject<{
  field?: Resolver<Maybe<Array<ResolversTypes['String']>>, ParentType, ContextType>;
  message?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type WeightResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['Weight'] = ResolversParentTypes['Weight']> = ResolversObject<{
  unit?: Resolver<ResolversTypes['WeightUnit'], ParentType, ContextType>;
  value?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type WeightUnitResolvers = EnumResolverSignature<{ g?: any, kg?: any, lb?: any, oz?: any }, ResolversTypes['WeightUnit']>;

export type Resolvers<ContextType = ServiceContext> = ResolversObject<{
  Color?: GraphQLScalarType;
  Connection?: ConnectionResolvers<ContextType>;
  Country?: CountryResolvers<ContextType>;
  Currency?: CurrencyResolvers<ContextType>;
  CurrencyCode?: CurrencyCodeResolvers;
  Cursor?: GraphQLScalarType;
  DateTime?: GraphQLScalarType;
  Decimal?: GraphQLScalarType;
  DimensionUnit?: DimensionUnitResolvers;
  Dimensions?: DimensionsResolvers<ContextType>;
  DisplayableError?: DisplayableErrorResolvers<ContextType>;
  Email?: GraphQLScalarType;
  HTML?: GraphQLScalarType;
  ISO8601DateTime?: GraphQLScalarType;
  JSON?: GraphQLScalarType;
  Language?: LanguageResolvers<ContextType>;
  LocaleCode?: LocaleCodeResolvers;
  Localization?: LocalizationResolvers<ContextType>;
  Market?: MarketResolvers<ContextType>;
  MarketConnection?: MarketConnectionResolvers<ContextType>;
  MarketEdge?: MarketEdgeResolvers<ContextType>;
  MediaImage?: MediaImageResolvers<ContextType>;
  Money?: MoneyResolvers<ContextType>;
  Node?: NodeResolvers<ContextType>;
  PageInfo?: PageInfoResolvers<ContextType>;
  Query?: QueryResolvers<ContextType>;
  RichText?: RichTextResolvers<ContextType>;
  Store?: StoreResolvers<ContextType>;
  StoreAddress?: StoreAddressResolvers<ContextType>;
  StoreBrand?: StoreBrandResolvers<ContextType>;
  StoreContact?: StoreContactResolvers<ContextType>;
  StoreSocialLink?: StoreSocialLinkResolvers<ContextType>;
  URL?: GraphQLScalarType;
  UnsignedInt64?: GraphQLScalarType;
  UserError?: UserErrorResolvers<ContextType>;
  Weight?: WeightResolvers<ContextType>;
  WeightUnit?: WeightUnitResolvers;
}>;

