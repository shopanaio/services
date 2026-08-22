import { GraphQLResolveInfo, GraphQLScalarType, GraphQLScalarTypeConfig } from 'graphql';
import { ServiceContext } from '../../../context/types.js';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
export type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;
export type RequireFields<T, K extends keyof T> = Omit<T, K> & { [P in K]-?: NonNullable<T[P]> };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  BigInt: { input: string; output: string; }
  DateTime: { input: string; output: string; }
  JSON: { input: Record<string, unknown>; output: Record<string, unknown>; }
  _FieldSet: { input: any; output: any; }
};

/** Filter operators for Boolean fields */
export type BooleanFilter = {
  /** Equals */
  _eq?: InputMaybe<Scalars['Boolean']['input']>;
  /** Is null */
  _is?: InputMaybe<Scalars['Boolean']['input']>;
  /** Is not null */
  _isNot?: InputMaybe<Scalars['Boolean']['input']>;
  /** Not equals */
  _neq?: InputMaybe<Scalars['Boolean']['input']>;
};

export type Collection = {
  __typename?: 'Collection';
  id: Scalars['ID']['output'];
  products: ListingConnection;
};


export type CollectionProductsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  currency?: InputMaybe<CurrencyCode>;
  facets?: InputMaybe<Array<ListingProductFilter>>;
  first?: InputMaybe<Scalars['Int']['input']>;
  locale?: InputMaybe<LocaleCode>;
  orderBy?: InputMaybe<ListingOrderByInput>;
  query?: InputMaybe<Scalars['String']['input']>;
};

/** Currency codes according to ISO 4217 */
export enum CurrencyCode {
  /** UAE Dirham (United Arab Emirates) - 2 decimals */
  Aed = 'AED',
  /** Afghan Afghani (Afghanistan) - 0 decimals */
  Afn = 'AFN',
  /** Albanian Lek (Albania) - 0 decimals */
  All = 'ALL',
  /** Armenian Dram (Armenia) - 2 decimals */
  Amd = 'AMD',
  /** Netherlands Antillean Guilder - 2 decimals */
  Ang = 'ANG',
  /** Angolan Kwanza (Angola) - 2 decimals */
  Aoa = 'AOA',
  /** Argentine Peso (Argentina) - 2 decimals */
  Ars = 'ARS',
  /** Australian Dollar (Australia) - 2 decimals */
  Aud = 'AUD',
  /** Aruban Florin (Aruba) - 2 decimals */
  Awg = 'AWG',
  /** Azerbaijani Manat (Azerbaijan) - 2 decimals */
  Azn = 'AZN',
  /** Bosnia-Herzegovina Convertible Mark - 2 decimals */
  Bam = 'BAM',
  /** Barbadian Dollar (Barbados) - 2 decimals */
  Bbd = 'BBD',
  /** Bangladeshi Taka (Bangladesh) - 2 decimals */
  Bdt = 'BDT',
  /** Bulgarian Lev (Bulgaria) - 2 decimals */
  Bgn = 'BGN',
  /** Bahraini Dinar (Bahrain) - 3 decimals */
  Bhd = 'BHD',
  /** Burundian Franc (Burundi) - 0 decimals */
  Bif = 'BIF',
  /** Bermudian Dollar (Bermuda) - 2 decimals */
  Bmd = 'BMD',
  /** Brunei Dollar (Brunei) - 2 decimals */
  Bnd = 'BND',
  /** Bolivian Boliviano (Bolivia) - 2 decimals */
  Bob = 'BOB',
  /** Brazilian Real (Brazil) - 2 decimals */
  Brl = 'BRL',
  /** Bahamian Dollar (Bahamas) - 2 decimals */
  Bsd = 'BSD',
  /** Bhutanese Ngultrum (Bhutan) - 2 decimals */
  Btn = 'BTN',
  /** Botswana Pula (Botswana) - 2 decimals */
  Bwp = 'BWP',
  /** Belarusian Ruble (Belarus) - 2 decimals */
  Byn = 'BYN',
  /** Belize Dollar (Belize) - 2 decimals */
  Bzd = 'BZD',
  /** Canadian Dollar (Canada) - 2 decimals */
  Cad = 'CAD',
  /** Congolese Franc (DR Congo) - 2 decimals */
  Cdf = 'CDF',
  /** Swiss Franc (Switzerland) - 2 decimals */
  Chf = 'CHF',
  /** Chilean Peso (Chile) - 0 decimals */
  Clp = 'CLP',
  /** Chinese Yuan (China) - 2 decimals */
  Cny = 'CNY',
  /** Colombian Peso (Colombia) - 2 decimals */
  Cop = 'COP',
  /** Costa Rican Colon (Costa Rica) - 2 decimals */
  Crc = 'CRC',
  /** Cuban Peso (Cuba) - 2 decimals */
  Cup = 'CUP',
  /** Cape Verdean Escudo (Cape Verde) - 2 decimals */
  Cve = 'CVE',
  /** Czech Koruna (Czech Republic) - 2 decimals */
  Czk = 'CZK',
  /** Djiboutian Franc (Djibouti) - 0 decimals */
  Djf = 'DJF',
  /** Danish Krone (Denmark) - 2 decimals */
  Dkk = 'DKK',
  /** Dominican Peso (Dominican Republic) - 2 decimals */
  Dop = 'DOP',
  /** Algerian Dinar (Algeria) - 2 decimals */
  Dzd = 'DZD',
  /** Egyptian Pound (Egypt) - 2 decimals */
  Egp = 'EGP',
  /** Eritrean Nakfa (Eritrea) - 2 decimals */
  Ern = 'ERN',
  /** Ethiopian Birr (Ethiopia) - 2 decimals */
  Etb = 'ETB',
  /** Euro (European Union) - 2 decimals */
  Eur = 'EUR',
  /** Fijian Dollar (Fiji) - 2 decimals */
  Fjd = 'FJD',
  /** Falkland Islands Pound - 2 decimals */
  Fkp = 'FKP',
  /** Faroese Króna (Faroe Islands) - 2 decimals */
  Fok = 'FOK',
  /** Pound Sterling (United Kingdom) - 2 decimals */
  Gbp = 'GBP',
  /** Georgian Lari (Georgia) - 2 decimals */
  Gel = 'GEL',
  /** Guernsey Pound (Guernsey) - 2 decimals */
  Ggp = 'GGP',
  /** Ghanaian Cedi (Ghana) - 2 decimals */
  Ghs = 'GHS',
  /** Gibraltar Pound (Gibraltar) - 2 decimals */
  Gip = 'GIP',
  /** Gambian Dalasi (Gambia) - 2 decimals */
  Gmd = 'GMD',
  /** Guinean Franc (Guinea) - 0 decimals */
  Gnf = 'GNF',
  /** Guatemalan Quetzal (Guatemala) - 2 decimals */
  Gtq = 'GTQ',
  /** Guyanese Dollar (Guyana) - 2 decimals */
  Gyd = 'GYD',
  /** Hong Kong Dollar (Hong Kong) - 2 decimals */
  Hkd = 'HKD',
  /** Honduran Lempira (Honduras) - 2 decimals */
  Hnl = 'HNL',
  /** Croatian Kuna (Croatia) - 2 decimals */
  Hrk = 'HRK',
  /** Haitian Gourde (Haiti) - 2 decimals */
  Htg = 'HTG',
  /** Hungarian Forint (Hungary) - 2 decimals */
  Huf = 'HUF',
  /** Indonesian Rupiah (Indonesia) - 0 decimals */
  Idr = 'IDR',
  /** Israeli New Shekel (Israel) - 2 decimals */
  Ils = 'ILS',
  /** Isle of Man Pound - 2 decimals */
  Imp = 'IMP',
  /** Indian Rupee (India) - 2 decimals */
  Inr = 'INR',
  /** Iraqi Dinar (Iraq) - 3 decimals */
  Iqd = 'IQD',
  /** Iranian Rial (Iran) - 2 decimals */
  Irr = 'IRR',
  /** Icelandic Króna (Iceland) - 0 decimals */
  Isk = 'ISK',
  /** Jersey Pound (Jersey) - 2 decimals */
  Jep = 'JEP',
  /** Jamaican Dollar (Jamaica) - 2 decimals */
  Jmd = 'JMD',
  /** Jordanian Dinar (Jordan) - 3 decimals */
  Jod = 'JOD',
  /** Japanese Yen (Japan) - 0 decimals */
  Jpy = 'JPY',
  /** Kenyan Shilling (Kenya) - 2 decimals */
  Kes = 'KES',
  /** Kyrgyzstani Som (Kyrgyzstan) - 2 decimals */
  Kgs = 'KGS',
  /** Cambodian Riel (Cambodia) - 2 decimals */
  Khr = 'KHR',
  /** Comorian Franc (Comoros) - 2 decimals */
  Kmf = 'KMF',
  /** North Korean Won (North Korea) - 2 decimals */
  Kpw = 'KPW',
  /** South Korean Won (South Korea) - 0 decimals */
  Krw = 'KRW',
  /** Kuwaiti Dinar (Kuwait) - 3 decimals */
  Kwd = 'KWD',
  /** Cayman Islands Dollar - 2 decimals */
  Kyd = 'KYD',
  /** Kazakhstani Tenge (Kazakhstan) - 2 decimals */
  Kzt = 'KZT',
  /** Lao Kip (Laos) - 2 decimals */
  Lak = 'LAK',
  /** Lebanese Pound (Lebanon) - 2 decimals */
  Lbp = 'LBP',
  /** Sri Lankan Rupee (Sri Lanka) - 2 decimals */
  Lkr = 'LKR',
  /** Liberian Dollar (Liberia) - 2 decimals */
  Lrd = 'LRD',
  /** Lesotho Loti (Lesotho) - 2 decimals */
  Lsl = 'LSL',
  /** Libyan Dinar (Libya) - 3 decimals */
  Lyd = 'LYD',
  /** Moroccan Dirham (Morocco) - 2 decimals */
  Mad = 'MAD',
  /** Moldovan Leu (Moldova) - 2 decimals */
  Mdl = 'MDL',
  /** Malagasy Ariary (Madagascar) - 2 decimals */
  Mga = 'MGA',
  /** Macedonian Denar (North Macedonia) - 2 decimals */
  Mkd = 'MKD',
  /** Burmese Kyat (Myanmar) - 2 decimals */
  Mmk = 'MMK',
  /** Mongolian Tögrög (Mongolia) - 2 decimals */
  Mnt = 'MNT',
  /** Macanese Pataca (Macau) - 2 decimals */
  Mop = 'MOP',
  /** Mauritanian Ouguiya (Mauritania) - 2 decimals */
  Mru = 'MRU',
  /** Mauritian Rupee (Mauritius) - 2 decimals */
  Mur = 'MUR',
  /** Maldivian Rufiyaa (Maldives) - 2 decimals */
  Mvr = 'MVR',
  /** Malawian Kwacha (Malawi) - 2 decimals */
  Mwk = 'MWK',
  /** Mexican Peso (Mexico) - 2 decimals */
  Mxn = 'MXN',
  /** Malaysian Ringgit (Malaysia) - 2 decimals */
  Myr = 'MYR',
  /** Mozambican Metical (Mozambique) - 2 decimals */
  Mzn = 'MZN',
  /** Namibian Dollar (Namibia) - 2 decimals */
  Nad = 'NAD',
  /** Nigerian Naira (Nigeria) - 2 decimals */
  Ngn = 'NGN',
  /** Nicaraguan Córdoba (Nicaragua) - 2 decimals */
  Nio = 'NIO',
  /** Norwegian Krone (Norway) - 2 decimals */
  Nok = 'NOK',
  /** Nepalese Rupee (Nepal) - 2 decimals */
  Npr = 'NPR',
  /** New Zealand Dollar (New Zealand) - 2 decimals */
  Nzd = 'NZD',
  /** Omani Rial (Oman) - 3 decimals */
  Omr = 'OMR',
  /** Panamanian Balboa (Panama) - 2 decimals */
  Pab = 'PAB',
  /** Peruvian Sol (Peru) - 2 decimals */
  Pen = 'PEN',
  /** Papua New Guinean Kina - 2 decimals */
  Pgk = 'PGK',
  /** Philippine Peso (Philippines) - 2 decimals */
  Php = 'PHP',
  /** Pakistani Rupee (Pakistan) - 2 decimals */
  Pkr = 'PKR',
  /** Polish Zloty (Poland) - 2 decimals */
  Pln = 'PLN',
  /** Paraguayan Guaraní (Paraguay) - 0 decimals */
  Pyg = 'PYG',
  /** Qatari Riyal (Qatar) - 2 decimals */
  Qar = 'QAR',
  /** Romanian Leu (Romania) - 2 decimals */
  Ron = 'RON',
  /** Serbian Dinar (Serbia) - 2 decimals */
  Rsd = 'RSD',
  /** Russian Ruble (Russia) - 2 decimals */
  Rub = 'RUB',
  /** Rwandan Franc (Rwanda) - 0 decimals */
  Rwf = 'RWF',
  /** Saudi Riyal (Saudi Arabia) - 2 decimals */
  Sar = 'SAR',
  /** Solomon Islands Dollar - 2 decimals */
  Sbd = 'SBD',
  /** Seychelles Rupee (Seychelles) - 2 decimals */
  Scr = 'SCR',
  /** Sudanese Pound (Sudan) - 2 decimals */
  Sdg = 'SDG',
  /** Swedish Krona (Sweden) - 2 decimals */
  Sek = 'SEK',
  /** Singapore Dollar (Singapore) - 2 decimals */
  Sgd = 'SGD',
  /** Saint Helena Pound - 2 decimals */
  Shp = 'SHP',
  /** Sierra Leonean Leone - 2 decimals */
  Sle = 'SLE',
  /** Somali Shilling (Somalia) - 2 decimals */
  Sos = 'SOS',
  /** Surinamese Dollar (Suriname) - 2 decimals */
  Srd = 'SRD',
  /** South Sudanese Pound - 2 decimals */
  Ssp = 'SSP',
  /** São Tomé and Príncipe Dobra - 2 decimals */
  Stn = 'STN',
  /** Salvadoran Colón (El Salvador) - 2 decimals */
  Svc = 'SVC',
  /** Syrian Pound (Syria) - 2 decimals */
  Syp = 'SYP',
  /** Eswatini Lilangeni (Eswatini) - 2 decimals */
  Szl = 'SZL',
  /** Thai Baht (Thailand) - 2 decimals */
  Thb = 'THB',
  /** Tajikistani Somoni (Tajikistan) - 2 decimals */
  Tjs = 'TJS',
  /** Turkmenistani Manat (Turkmenistan) - 2 decimals */
  Tmt = 'TMT',
  /** Tunisian Dinar (Tunisia) - 3 decimals */
  Tnd = 'TND',
  /** Tongan Paʻanga (Tonga) - 2 decimals */
  Top = 'TOP',
  /** Turkish Lira (Turkey) - 2 decimals */
  Try = 'TRY',
  /** Trinidad and Tobago Dollar - 2 decimals */
  Ttd = 'TTD',
  /** New Taiwan Dollar (Taiwan) - 2 decimals */
  Twd = 'TWD',
  /** Tanzanian Shilling (Tanzania) - 2 decimals */
  Tzs = 'TZS',
  /** Ukrainian Hryvnia (Ukraine) - 2 decimals */
  Uah = 'UAH',
  /** Ugandan Shilling (Uganda) - 0 decimals */
  Ugx = 'UGX',
  /** United States Dollar (USA) - 2 decimals */
  Usd = 'USD',
  /** Uruguayan Peso (Uruguay) - 2 decimals */
  Uyu = 'UYU',
  /** Uzbekistani Som (Uzbekistan) - 2 decimals */
  Uzs = 'UZS',
  /** Venezuelan Bolívar (Venezuela) - 2 decimals */
  Ves = 'VES',
  /** Vietnamese Dong (Vietnam) - 0 decimals */
  Vnd = 'VND',
  /** Vanuatu Vatu (Vanuatu) - 0 decimals */
  Vuv = 'VUV',
  /** Samoan Tala (Samoa) - 2 decimals */
  Wst = 'WST',
  /** Central African CFA Franc - 0 decimals */
  Xaf = 'XAF',
  /** East Caribbean Dollar - 2 decimals */
  Xcd = 'XCD',
  /** Special Drawing Rights (IMF) - 0 decimals */
  Xdr = 'XDR',
  /** West African CFA Franc - 0 decimals */
  Xof = 'XOF',
  /** CFP Franc - 0 decimals */
  Xpf = 'XPF',
  /** Yemeni Rial (Yemen) - 2 decimals */
  Yer = 'YER',
  /** South African Rand (South Africa) - 2 decimals */
  Zar = 'ZAR',
  /** Zambian Kwacha (Zambia) - 2 decimals */
  Zmw = 'ZMW',
  /** Zimbabwean Dollar (Zimbabwe) - 2 decimals */
  Zwl = 'ZWL'
}

/** Filter operators for DateTime fields */
export type DateTimeFilter = {
  /** Between range (inclusive) */
  _between?: InputMaybe<Array<Scalars['DateTime']['input']>>;
  /** Equals */
  _eq?: InputMaybe<Scalars['DateTime']['input']>;
  /** Greater than (after) */
  _gt?: InputMaybe<Scalars['DateTime']['input']>;
  /** Greater than or equal (on or after) */
  _gte?: InputMaybe<Scalars['DateTime']['input']>;
  /** In array */
  _in?: InputMaybe<Array<Scalars['DateTime']['input']>>;
  /** Is null */
  _is?: InputMaybe<Scalars['Boolean']['input']>;
  /** Is not null */
  _isNot?: InputMaybe<Scalars['Boolean']['input']>;
  /** Less than (before) */
  _lt?: InputMaybe<Scalars['DateTime']['input']>;
  /** Less than or equal (on or before) */
  _lte?: InputMaybe<Scalars['DateTime']['input']>;
  /** Not equals */
  _neq?: InputMaybe<Scalars['DateTime']['input']>;
  /** Not in array */
  _notIn?: InputMaybe<Array<Scalars['DateTime']['input']>>;
};

/** Dimension (length) measurement units */
export enum DimensionUnit {
  /** Centimeter */
  Cm = 'cm',
  /** Foot */
  Ft = 'ft',
  /** Inch */
  In = 'in',
  /** Meter */
  M = 'm',
  /** Millimeter */
  Mm = 'mm'
}

export type Facet = Node & {
  __typename?: 'Facet';
  facetType: FacetType;
  id: Scalars['ID']['output'];
  label: Scalars['String']['output'];
  lexoRank: Scalars['String']['output'];
  scopes: Array<FacetScopeType>;
  selectionMode: FacetSelectionMode;
  slug: Scalars['String']['output'];
  sources: Array<FacetSource>;
  uiType: FacetUiType;
  values: Array<FacetValue>;
};

export type FacetCreateInput = {
  facetType: FacetType;
  label: Scalars['String']['input'];
  /** Defaults to SEARCH, CATEGORY, and COLLECTION when omitted. */
  scopes?: InputMaybe<Array<FacetScopeType>>;
  selectionMode?: InputMaybe<FacetSelectionMode>;
  slug: Scalars['String']['input'];
  sources?: InputMaybe<Array<FacetCreateSourceInput>>;
  uiType?: InputMaybe<FacetUiType>;
  valueCandidates?: InputMaybe<Array<FacetCreateValueCandidateInput>>;
};

export type FacetCreatePayload = {
  __typename?: 'FacetCreatePayload';
  facet: Maybe<Facet>;
  userErrors: Array<GenericUserError>;
};

export type FacetCreateSourceInput = {
  handle: Scalars['String']['input'];
  name: Scalars['String']['input'];
};

export type FacetCreateValueCandidateInput = {
  handle: Scalars['String']['input'];
  label: Scalars['String']['input'];
  sourceHandle: Scalars['String']['input'];
};

export type FacetDeletePayload = {
  __typename?: 'FacetDeletePayload';
  deletedFacetId: Maybe<Scalars['ID']['output']>;
  userErrors: Array<GenericUserError>;
};

export type FacetFieldsInput = {
  label?: InputMaybe<Scalars['String']['input']>;
  /** Replaces the current scopes when provided. The list cannot be empty. */
  scopes?: InputMaybe<Array<FacetScopeType>>;
  selectionMode?: InputMaybe<FacetSelectionMode>;
  slug?: InputMaybe<Scalars['String']['input']>;
  uiType?: InputMaybe<FacetUiType>;
};

export type FacetOperationResult = {
  __typename?: 'FacetOperationResult';
  applied: Scalars['Boolean']['output'];
  entityId: Maybe<Scalars['ID']['output']>;
  errors: Array<GenericUserError>;
  type: FacetOperationType;
};

export enum FacetOperationType {
  FieldsUpdate = 'FIELDS_UPDATE',
  Move = 'MOVE',
  ValueCreate = 'VALUE_CREATE',
  ValueDelete = 'VALUE_DELETE',
  ValueMerge = 'VALUE_MERGE',
  ValueUnmerge = 'VALUE_UNMERGE',
  ValueUpdate = 'VALUE_UPDATE'
}

export type FacetPositionInput = {
  afterFacetId?: InputMaybe<Scalars['ID']['input']>;
  beforeFacetId?: InputMaybe<Scalars['ID']['input']>;
};

export type FacetRebalancePayload = {
  __typename?: 'FacetRebalancePayload';
  facets: Array<Facet>;
  userErrors: Array<GenericUserError>;
};

/**
 * Listing contexts where a facet is available.
 *
 * SEARCH applies to listing requests without a category context.
 * CATEGORY applies to every category-scoped listing request.
 * COLLECTION applies to every collection-scoped listing request.
 */
export enum FacetScopeType {
  Category = 'CATEGORY',
  Collection = 'COLLECTION',
  Search = 'SEARCH'
}

export type FacetScopesUpdateInput = {
  updates: Array<FacetScopesUpdateItemInput>;
};

/**
 * One item of the store-wide facet-scope replacement command. It deliberately
 * addresses several independent facet aggregates atomically.
 */
export type FacetScopesUpdateItemInput = {
  id: Scalars['ID']['input'];
  scopes: Array<FacetScopeType>;
};

export type FacetScopesUpdatePayload = {
  __typename?: 'FacetScopesUpdatePayload';
  facets: Array<Facet>;
  userErrors: Array<GenericUserError>;
};

export enum FacetSelectionMode {
  Multi = 'MULTI',
  Single = 'SINGLE'
}

export type FacetSource = {
  __typename?: 'FacetSource';
  handle: Scalars['String']['output'];
  name: Scalars['String']['output'];
};

export type FacetSourceCandidate = {
  __typename?: 'FacetSourceCandidate';
  facetType: FacetType;
  handle: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  locale: Scalars['String']['output'];
  name: Maybe<Scalars['String']['output']>;
};

export type FacetSourceCandidateConnection = {
  __typename?: 'FacetSourceCandidateConnection';
  edges: Array<FacetSourceCandidateEdge>;
  pageInfo: PageInfo;
  totalCount: Scalars['Int']['output'];
};

export type FacetSourceCandidateEdge = {
  __typename?: 'FacetSourceCandidateEdge';
  cursor: Scalars['String']['output'];
  node: FacetSourceCandidate;
};

/** Ordering configuration for FacetSourceCandidate. */
export type FacetSourceCandidateOrderByInput = {
  /** Sort direction. */
  direction: SortDirection;
  /** Field to order by. */
  field: FacetSourceCandidateOrderField;
};

/** Fields available for sorting FacetSourceCandidate. */
export enum FacetSourceCandidateOrderField {
  /** Sort by facetType. */
  FacetType = 'facetType',
  /** Sort by handle. */
  Handle = 'handle',
  /** Sort by id. */
  Id = 'id',
  /** Sort by name. */
  Name = 'name',
  /** Sort by sortName. */
  SortName = 'sortName',
  /** Sort by sourceSortBucket. */
  SourceSortBucket = 'sourceSortBucket'
}

/** Filter conditions for FacetSourceCandidate. */
export type FacetSourceCandidateWhereInput = {
  /** Logical AND of multiple conditions. */
  _and?: InputMaybe<Array<FacetSourceCandidateWhereInput>>;
  /** Negate the condition. */
  _not?: InputMaybe<FacetSourceCandidateWhereInput>;
  /** Logical OR of multiple conditions. */
  _or?: InputMaybe<Array<FacetSourceCandidateWhereInput>>;
  /** Filter by facetType. */
  facetType?: InputMaybe<StringFilter>;
  /** Filter by handle. */
  handle?: InputMaybe<StringFilter>;
  /** Filter by id. */
  id?: InputMaybe<IdFilter>;
  /** Filter by name. */
  name?: InputMaybe<StringFilter>;
  /** Filter by sortName. */
  sortName?: InputMaybe<StringFilter>;
  /** Filter by sourceSortBucket. */
  sourceSortBucket?: InputMaybe<IntFilter>;
};

export type FacetSwatch = Node & {
  __typename?: 'FacetSwatch';
  colorOne: Maybe<Scalars['String']['output']>;
  colorTwo: Maybe<Scalars['String']['output']>;
  file: Maybe<File>;
  id: Scalars['ID']['output'];
  metadata: Maybe<Scalars['JSON']['output']>;
  swatchType: SwatchType;
};

export type FacetSwatchCreateInput = {
  colorOne?: InputMaybe<Scalars['String']['input']>;
  colorTwo?: InputMaybe<Scalars['String']['input']>;
  fileId?: InputMaybe<Scalars['ID']['input']>;
  metadata?: InputMaybe<Scalars['JSON']['input']>;
  swatchType: SwatchType;
};

export type FacetSwatchCreatePayload = {
  __typename?: 'FacetSwatchCreatePayload';
  facetSwatch: Maybe<FacetSwatch>;
  userErrors: Array<GenericUserError>;
};

export type FacetSwatchDeletePayload = {
  __typename?: 'FacetSwatchDeletePayload';
  deletedFacetSwatchId: Maybe<Scalars['ID']['output']>;
  userErrors: Array<GenericUserError>;
};

export type FacetSwatchFieldsInput = {
  colorOne?: InputMaybe<Scalars['String']['input']>;
  colorTwo?: InputMaybe<Scalars['String']['input']>;
  fileId?: InputMaybe<Scalars['ID']['input']>;
  metadata?: InputMaybe<Scalars['JSON']['input']>;
  swatchType?: InputMaybe<SwatchType>;
};

export type FacetSwatchOperationResult = {
  __typename?: 'FacetSwatchOperationResult';
  applied: Scalars['Boolean']['output'];
  entityId: Maybe<Scalars['ID']['output']>;
  errors: Array<GenericUserError>;
  type: FacetSwatchOperationType;
};

export enum FacetSwatchOperationType {
  FieldsUpdate = 'FIELDS_UPDATE'
}

export type FacetSwatchUpdateInput = {
  fields?: InputMaybe<FacetSwatchFieldsInput>;
};

export type FacetSwatchUpdatePayload = {
  __typename?: 'FacetSwatchUpdatePayload';
  facetSwatch: Maybe<FacetSwatch>;
  operationResults: Array<FacetSwatchOperationResult>;
  userErrors: Array<GenericUserError>;
};

export enum FacetType {
  Feature = 'FEATURE',
  InStock = 'IN_STOCK',
  Option = 'OPTION',
  Price = 'PRICE',
  Tag = 'TAG'
}

export enum FacetUiType {
  Boolean = 'BOOLEAN',
  Checkbox = 'CHECKBOX',
  Dropdown = 'DROPDOWN',
  Radio = 'RADIO',
  Range = 'RANGE'
}

export type FacetUpdateInput = {
  fields?: InputMaybe<FacetFieldsInput>;
  position?: InputMaybe<FacetPositionInput>;
  values?: InputMaybe<Array<FacetValueOperationInput>>;
};

export type FacetUpdatePayload = {
  __typename?: 'FacetUpdatePayload';
  facet: Maybe<Facet>;
  operationResults: Array<FacetOperationResult>;
  userErrors: Array<GenericUserError>;
};

export type FacetValue = Node & {
  __typename?: 'FacetValue';
  enabled: Scalars['Boolean']['output'];
  facet: Facet;
  handle: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  kind: FacetValueKind;
  label: Scalars['String']['output'];
  parent: Maybe<FacetValue>;
  sortIndex: Scalars['Int']['output'];
  sourceValues: Array<FacetValue>;
  swatch: Maybe<FacetSwatch>;
};

export type FacetValueCandidate = {
  __typename?: 'FacetValueCandidate';
  facetType: FacetType;
  handle: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  label: Scalars['String']['output'];
  sourceHandle: Scalars['String']['output'];
};

export type FacetValueCandidateConnection = {
  __typename?: 'FacetValueCandidateConnection';
  edges: Array<FacetValueCandidateEdge>;
  pageInfo: PageInfo;
  totalCount: Scalars['Int']['output'];
};

export type FacetValueCandidateEdge = {
  __typename?: 'FacetValueCandidateEdge';
  cursor: Scalars['String']['output'];
  node: FacetValueCandidate;
};

/** Ordering configuration for FacetValueCandidate. */
export type FacetValueCandidateOrderByInput = {
  /** Sort direction. */
  direction: SortDirection;
  /** Field to order by. */
  field: FacetValueCandidateOrderField;
};

/** Fields available for sorting FacetValueCandidate. */
export enum FacetValueCandidateOrderField {
  /** Sort by handle. */
  Handle = 'handle',
  /** Sort by id. */
  Id = 'id',
  /** Sort by label. */
  Label = 'label'
}

export enum FacetValueCandidateType {
  Feature = 'FEATURE',
  Option = 'OPTION',
  Tag = 'TAG'
}

/** Filter conditions for FacetValueCandidate. */
export type FacetValueCandidateWhereInput = {
  /** Logical AND of multiple conditions. */
  _and?: InputMaybe<Array<FacetValueCandidateWhereInput>>;
  /** Negate the condition. */
  _not?: InputMaybe<FacetValueCandidateWhereInput>;
  /** Logical OR of multiple conditions. */
  _or?: InputMaybe<Array<FacetValueCandidateWhereInput>>;
  /** Filter by handle. */
  handle?: InputMaybe<StringFilter>;
  /** Filter by id. */
  id?: InputMaybe<IdFilter>;
  /** Filter by label. */
  label?: InputMaybe<StringFilter>;
};

export type FacetValueCandidatesMetaInput = {
  candidateType: FacetValueCandidateType;
  facetId?: InputMaybe<Scalars['ID']['input']>;
  sourceHandles?: InputMaybe<Array<Scalars['String']['input']>>;
};

export enum FacetValueKind {
  Group = 'GROUP',
  Source = 'SOURCE'
}

export type FacetValueMergeValuesInput = {
  sourceValueIds?: InputMaybe<Array<Scalars['ID']['input']>>;
  targetGroupValueId?: InputMaybe<Scalars['ID']['input']>;
  targetHandle?: InputMaybe<Scalars['String']['input']>;
  targetLabel?: InputMaybe<Scalars['String']['input']>;
};

export enum FacetValueOperationAction {
  Create = 'CREATE',
  Delete = 'DELETE',
  Merge = 'MERGE',
  Unmerge = 'UNMERGE',
  Update = 'UPDATE'
}

export type FacetValueOperationInput = {
  action: FacetValueOperationAction;
  facetValueId?: InputMaybe<Scalars['ID']['input']>;
  merge?: InputMaybe<FacetValueMergeValuesInput>;
  values?: InputMaybe<FacetValueValuesInput>;
};

export type FacetValueValuesInput = {
  enabled?: InputMaybe<Scalars['Boolean']['input']>;
  handle?: InputMaybe<Scalars['String']['input']>;
  kind?: InputMaybe<FacetValueKind>;
  label?: InputMaybe<Scalars['String']['input']>;
  sortIndex?: InputMaybe<Scalars['Int']['input']>;
  /**
   * Source values to attach when this operation creates a group value.
   * Ignored for UPDATE; use MERGE to attach values to an existing group.
   */
  sourceValueIds?: InputMaybe<Array<Scalars['ID']['input']>>;
  swatchId?: InputMaybe<Scalars['ID']['input']>;
};

export type File = {
  __typename?: 'File';
  id: Scalars['ID']['output'];
};

/** Filter operators for Float fields */
export type FloatFilter = {
  /** Between range (inclusive) */
  _between?: InputMaybe<Array<Scalars['Float']['input']>>;
  /** Equals */
  _eq?: InputMaybe<Scalars['Float']['input']>;
  /** Greater than */
  _gt?: InputMaybe<Scalars['Float']['input']>;
  /** Greater than or equal */
  _gte?: InputMaybe<Scalars['Float']['input']>;
  /** In array */
  _in?: InputMaybe<Array<Scalars['Float']['input']>>;
  /** Is null */
  _is?: InputMaybe<Scalars['Boolean']['input']>;
  /** Is not null */
  _isNot?: InputMaybe<Scalars['Boolean']['input']>;
  /** Less than */
  _lt?: InputMaybe<Scalars['Float']['input']>;
  /** Less than or equal */
  _lte?: InputMaybe<Scalars['Float']['input']>;
  /** Not equals */
  _neq?: InputMaybe<Scalars['Float']['input']>;
  /** Not in array */
  _notIn?: InputMaybe<Array<Scalars['Float']['input']>>;
};

/** A generic user error type for mutation responses. */
export type GenericUserError = UserError & {
  __typename?: 'GenericUserError';
  code: Maybe<Scalars['String']['output']>;
  field: Maybe<Array<Scalars['String']['output']>>;
  message: Scalars['String']['output'];
};

/** Filter operators for ID fields */
export type IdFilter = {
  /** Equals */
  _eq?: InputMaybe<Scalars['ID']['input']>;
  /** In array */
  _in?: InputMaybe<Array<Scalars['ID']['input']>>;
  /** Is null */
  _is?: InputMaybe<Scalars['Boolean']['input']>;
  /** Is not null */
  _isNot?: InputMaybe<Scalars['Boolean']['input']>;
  /** Not equals */
  _neq?: InputMaybe<Scalars['ID']['input']>;
  /** Not in array */
  _notIn?: InputMaybe<Array<Scalars['ID']['input']>>;
};

/** Filter operators for Int fields */
export type IntFilter = {
  /** Between range (inclusive) */
  _between?: InputMaybe<Array<Scalars['Int']['input']>>;
  /** Equals */
  _eq?: InputMaybe<Scalars['Int']['input']>;
  /** Greater than */
  _gt?: InputMaybe<Scalars['Int']['input']>;
  /** Greater than or equal */
  _gte?: InputMaybe<Scalars['Int']['input']>;
  /** In array */
  _in?: InputMaybe<Array<Scalars['Int']['input']>>;
  /** Is null */
  _is?: InputMaybe<Scalars['Boolean']['input']>;
  /** Is not null */
  _isNot?: InputMaybe<Scalars['Boolean']['input']>;
  /** Less than */
  _lt?: InputMaybe<Scalars['Int']['input']>;
  /** Less than or equal */
  _lte?: InputMaybe<Scalars['Int']['input']>;
  /** Not equals */
  _neq?: InputMaybe<Scalars['Int']['input']>;
  /** Not in array */
  _notIn?: InputMaybe<Array<Scalars['Int']['input']>>;
};

export type Listing = {
  /** The global ID of the catalog listing item. */
  id: Scalars['ID']['output'];
};

/** A connection to catalog products. */
export type ListingConnection = {
  __typename?: 'ListingConnection';
  /** A list of edges. */
  edges: Array<ListingEdge>;
  /** Ordered facet items available for the current listing result. */
  facets: Array<ListingFacet>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
  /** The total number of matched sellable items. */
  totalCount: Scalars['Int']['output'];
};

/** An edge in a Listing connection. */
export type ListingEdge = {
  __typename?: 'ListingEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String']['output'];
  /** The item at the end of the edge. */
  node: Listing;
};

export type ListingFacet = {
  __typename?: 'ListingFacet';
  /** Stable listing facet ID. */
  id: Scalars['String']['output'];
  /** Human-readable facet label. */
  label: Scalars['String']['output'];
  /** Facet presentation/selection type. */
  type: ListingFacetType;
  /** Facet UI type. */
  uiType: FacetUiType;
  /** Ordered values for this facet in listing UI order. */
  values: Array<ListingFacetValue>;
};

export enum ListingFacetType {
  Boolean = 'BOOLEAN',
  List = 'LIST',
  PriceRange = 'PRICE_RANGE'
}

export type ListingFacetValue = {
  __typename?: 'ListingFacetValue';
  /** Number of matched sellable items for this value. */
  count: Scalars['Int']['output'];
  /** Stable listing facet value ID. */
  id: Scalars['String']['output'];
  /**
   * JSON object compatible with ListingProductFilter.
   * This keeps product, vendor, price and availability facets on one contract.
   */
  input: Scalars['JSON']['output'];
  /** Human-readable value label. */
  label: Scalars['String']['output'];
  /** Whether this value was selected in the current request. */
  selected: Scalars['Boolean']['output'];
  /** Swatch metadata for facet values that have one. */
  swatch: Maybe<FacetSwatch>;
};

export type ListingFacetValueFilter = {
  /** Facet stable identifier. */
  facet: Scalars['String']['input'];
  /** Facet value stable identifier. */
  value: Scalars['String']['input'];
};

export type ListingMutation = {
  __typename?: 'ListingMutation';
  /** Create a new facet. */
  facetCreate: FacetCreatePayload;
  /** Delete a facet. */
  facetDelete: FacetDeletePayload;
  /** Repair the store-wide facet rank sequence without changing visible order. */
  facetRebalance: FacetRebalancePayload;
  /**
   * Atomically replace scopes for several facets.
   *
   * This is a store-wide configuration command rather than a write to one facet
   * aggregate; see the Listing facets architecture decision.
   */
  facetScopesUpdate: FacetScopesUpdatePayload;
  /** Create a new facet swatch. */
  facetSwatchCreate: FacetSwatchCreatePayload;
  /** Delete a facet swatch. */
  facetSwatchDelete: FacetSwatchDeletePayload;
  /** Update an existing facet swatch. */
  facetSwatchUpdate: FacetSwatchUpdatePayload;
  /** Update an existing facet. */
  facetUpdate: FacetUpdatePayload;
  manualProductRecommendationCreate: ManualProductRecommendationCreatePayload;
  manualProductRecommendationDelete: ManualProductRecommendationDeletePayload;
  manualProductRecommendationUpdate: ManualProductRecommendationUpdatePayload;
  recommendationPlacementPolicyCreate: RecommendationPlacementPolicyCreatePayload;
  recommendationPlacementPolicyUpdate: RecommendationPlacementPolicyUpdatePayload;
  /** Search configuration mutation namespace. */
  search: ListingSearchMutation;
};


export type ListingMutationFacetCreateArgs = {
  input: FacetCreateInput;
};


export type ListingMutationFacetDeleteArgs = {
  facetId: Scalars['ID']['input'];
};


export type ListingMutationFacetRebalanceArgs = {
  confirm?: InputMaybe<Scalars['Boolean']['input']>;
};


export type ListingMutationFacetScopesUpdateArgs = {
  input: FacetScopesUpdateInput;
};


export type ListingMutationFacetSwatchCreateArgs = {
  input: FacetSwatchCreateInput;
};


export type ListingMutationFacetSwatchDeleteArgs = {
  facetSwatchId: Scalars['ID']['input'];
};


export type ListingMutationFacetSwatchUpdateArgs = {
  facetSwatchId: Scalars['ID']['input'];
  operations: FacetSwatchUpdateInput;
};


export type ListingMutationFacetUpdateArgs = {
  facetId: Scalars['ID']['input'];
  operations: FacetUpdateInput;
};


export type ListingMutationManualProductRecommendationCreateArgs = {
  input: ManualProductRecommendationCreateInput;
};


export type ListingMutationManualProductRecommendationDeleteArgs = {
  manualProductRecommendationId: Scalars['ID']['input'];
};


export type ListingMutationManualProductRecommendationUpdateArgs = {
  manualProductRecommendationId: Scalars['ID']['input'];
  operations: ManualProductRecommendationUpdateInput;
};


export type ListingMutationRecommendationPlacementPolicyCreateArgs = {
  input: RecommendationPlacementPolicyCreateInput;
};


export type ListingMutationRecommendationPlacementPolicyUpdateArgs = {
  operations: RecommendationPlacementPolicyUpdateInput;
  recommendationPlacementPolicyId: Scalars['ID']['input'];
};

export type ListingOrderByInput = {
  /** Sort key for the listing request. */
  by: ListingSortBy;
  /** Sort direction. Ignored for MANUAL and RELEVANCE. */
  direction?: InputMaybe<ListingSortDirection>;
};

export type ListingPriceRangeFilter = {
  /** Maximum price amount in minor units. */
  max?: InputMaybe<Scalars['BigInt']['input']>;
  /** Minimum price amount in minor units. */
  min?: InputMaybe<Scalars['BigInt']['input']>;
};

export type ListingProductFilter = {
  /** Filter on if the listing item is available. */
  available?: InputMaybe<Scalars['Boolean']['input']>;
  /** Filter by product price range. */
  price?: InputMaybe<ListingPriceRangeFilter>;
  /** Filter by product-level listing facet value. */
  productFacet?: InputMaybe<ListingFacetValueFilter>;
  /** Filter by product vendor. */
  productVendor?: InputMaybe<Scalars['String']['input']>;
  /** Filter by indexed product status. */
  statuses?: InputMaybe<Array<ListingProductStatus>>;
  /** Filter by product tag. */
  tag?: InputMaybe<Scalars['String']['input']>;
  /** Filter by variant-level listing facet value. */
  variantFacet?: InputMaybe<ListingFacetValueFilter>;
  /** Filter by variant option. */
  variantOption?: InputMaybe<ListingVariantOptionFilter>;
};

export enum ListingProductStatus {
  Draft = 'DRAFT',
  Published = 'PUBLISHED'
}

export type ListingQuery = {
  __typename?: 'ListingQuery';
  /** Get a facet by ID. */
  facet: Maybe<Facet>;
  /** Get available facet source candidates for create flow. */
  facetSourceCandidates: FacetSourceCandidateConnection;
  /** Get a facet swatch by ID. */
  facetSwatch: Maybe<FacetSwatch>;
  /** Get all facet swatches. */
  facetSwatches: Array<FacetSwatch>;
  /** Get a facet value by ID. */
  facetValue: Maybe<FacetValue>;
  /** Get available facet source value candidates for create and edit flows. */
  facetValueCandidates: FacetValueCandidateConnection;
  /** Get all facet values for a specific facet. */
  facetValues: Array<FacetValue>;
  /** Get all facets. */
  facets: Array<Facet>;
  /**
   * Get ordered listing structure for Admin.
   *
   * Listing service returns listing-owned order, pagination, counts, aggregates,
   * and canonical entity references only. Entity details are resolved by owning
   * subgraphs through federation.
   */
  listing: ListingConnection;
  manualProductRecommendations: ManualProductRecommendationConnection;
  /** Get a node by its global ID. */
  node: Maybe<Node>;
  /** Get multiple nodes by their global IDs. */
  nodes: Array<Maybe<Node>>;
  recommendationPlacementPolicies: Array<RecommendationPlacementPolicy>;
  recommendationPlacementPolicy: Maybe<RecommendationPlacementPolicy>;
  recommendationSnapshotPreview: RecommendationSnapshotPreviewPayload;
  /** Search configuration and diagnostics namespace. */
  search: ListingSearchQuery;
};


export type ListingQueryFacetArgs = {
  id: Scalars['ID']['input'];
};


export type ListingQueryFacetSourceCandidatesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<FacetSourceCandidateOrderByInput>>;
  where?: InputMaybe<FacetSourceCandidateWhereInput>;
};


export type ListingQueryFacetSwatchArgs = {
  id: Scalars['ID']['input'];
};


export type ListingQueryFacetValueArgs = {
  id: Scalars['ID']['input'];
};


export type ListingQueryFacetValueCandidatesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  meta: FacetValueCandidatesMetaInput;
  orderBy?: InputMaybe<Array<FacetValueCandidateOrderByInput>>;
  where?: InputMaybe<FacetValueCandidateWhereInput>;
};


export type ListingQueryFacetValuesArgs = {
  facetId: Scalars['ID']['input'];
};


export type ListingQueryListingArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  currency?: InputMaybe<CurrencyCode>;
  facets?: InputMaybe<Array<ListingProductFilter>>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  locale?: InputMaybe<LocaleCode>;
  orderBy?: InputMaybe<ListingOrderByInput>;
  query?: InputMaybe<Scalars['String']['input']>;
  scope?: InputMaybe<ListingScopeInput>;
};


export type ListingQueryManualProductRecommendationsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  anchorProductId: Scalars['ID']['input'];
  first?: InputMaybe<Scalars['Int']['input']>;
  placement: RecommendationPlacement;
};


export type ListingQueryNodeArgs = {
  id: Scalars['ID']['input'];
};


export type ListingQueryNodesArgs = {
  ids: Array<Scalars['ID']['input']>;
};


export type ListingQueryRecommendationPlacementPolicyArgs = {
  placement: RecommendationPlacement;
};


export type ListingQueryRecommendationSnapshotPreviewArgs = {
  input: RecommendationSnapshotPreviewInput;
};

export type ListingScopeInput = {
  /** Category global ID. Required for CATEGORY and forbidden for GLOBAL. */
  categoryId?: InputMaybe<Scalars['ID']['input']>;
  /** Collection global ID. Required for COLLECTION. */
  collectionId?: InputMaybe<Scalars['ID']['input']>;
  /** Scope kind for the listing request. */
  kind: ListingScopeKind;
};

export enum ListingScopeKind {
  Category = 'CATEGORY',
  Collection = 'COLLECTION',
  Global = 'GLOBAL'
}

export type ListingSearchMutation = {
  __typename?: 'ListingSearchMutation';
  productBoostCreate: SearchProductBoostCreatePayload;
  productBoostDelete: SearchProductBoostDeletePayload;
  productBoostUpdate: SearchProductBoostUpdatePayload;
  /** Update the store-level search settings. */
  settingsUpdate: SearchSettingsUpdatePayload;
  synonymGroupCreate: SearchSynonymGroupCreatePayload;
  synonymGroupDelete: SearchSynonymGroupDeletePayload;
  synonymGroupUpdate: SearchSynonymGroupUpdatePayload;
};


export type ListingSearchMutationProductBoostCreateArgs = {
  input: SearchProductBoostCreateInput;
};


export type ListingSearchMutationProductBoostDeleteArgs = {
  productBoostId: Scalars['ID']['input'];
};


export type ListingSearchMutationProductBoostUpdateArgs = {
  operations: SearchProductBoostUpdateInput;
  productBoostId: Scalars['ID']['input'];
};


export type ListingSearchMutationSettingsUpdateArgs = {
  operations: SearchSettingsOperationsInput;
  searchSettingsId: Scalars['ID']['input'];
};


export type ListingSearchMutationSynonymGroupCreateArgs = {
  input: SearchSynonymGroupCreateInput;
};


export type ListingSearchMutationSynonymGroupDeleteArgs = {
  synonymGroupId: Scalars['ID']['input'];
};


export type ListingSearchMutationSynonymGroupUpdateArgs = {
  operations: SearchSynonymGroupUpdateInput;
  synonymGroupId: Scalars['ID']['input'];
};

export type ListingSearchQuery = {
  __typename?: 'ListingSearchQuery';
  /** Explain the canonical request-level search plan and its candidate membership. */
  explain: SearchExplain;
  productBoost: Maybe<SearchProductBoost>;
  productBoosts: SearchProductBoostConnection;
  /** Current search settings for the selected store, if initialized. */
  settings: Maybe<SearchSettings>;
  synonymGroup: Maybe<SearchSynonymGroup>;
  synonymGroups: SearchSynonymGroupConnection;
};


export type ListingSearchQueryExplainArgs = {
  locale: LocaleCode;
  query: Scalars['String']['input'];
};


export type ListingSearchQueryProductBoostArgs = {
  id: Scalars['ID']['input'];
};


export type ListingSearchQueryProductBoostsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  meta?: InputMaybe<SearchProductBoostsMetaInput>;
  orderBy?: InputMaybe<Array<SearchProductBoostOrderByInput>>;
  where?: InputMaybe<SearchProductBoostWhereInput>;
};


export type ListingSearchQuerySynonymGroupArgs = {
  id: Scalars['ID']['input'];
};


export type ListingSearchQuerySynonymGroupsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<SearchSynonymGroupOrderByInput>>;
  where?: InputMaybe<SearchSynonymGroupWhereInput>;
};

export enum ListingSortBy {
  Created = 'CREATED',
  Manual = 'MANUAL',
  Name = 'NAME',
  Newest = 'NEWEST',
  Price = 'PRICE',
  Relevance = 'RELEVANCE'
}

export enum ListingSortDirection {
  Asc = 'asc',
  Desc = 'desc'
}

export type ListingVariantOptionFilter = {
  /** Variant option name. */
  name: Scalars['String']['input'];
  /** Variant option value. */
  value: Scalars['String']['input'];
};

/** Language/Locale codes based on ISO 639-1 and BCP 47 */
export enum LocaleCode {
  /** Akan */
  Ak = 'ak',
  /** Amharic */
  Am = 'am',
  /** Arabic */
  Ar = 'ar',
  /** Assamese */
  As = 'as',
  /** Azerbaijani */
  Az = 'az',
  /** Belarusian */
  Be = 'be',
  /** Bulgarian */
  Bg = 'bg',
  /** Bambara */
  Bm = 'bm',
  /** Bangla */
  Bn = 'bn',
  /** Tibetan */
  Bo = 'bo',
  /** Breton */
  Br = 'br',
  /** Bosnian */
  Bs = 'bs',
  /** Catalan */
  Ca = 'ca',
  /** Chechen */
  Ce = 'ce',
  /** Central Kurdish */
  Ckb = 'ckb',
  /** Czech */
  Cs = 'cs',
  /** Welsh */
  Cy = 'cy',
  /** Danish */
  Da = 'da',
  /** German */
  De = 'de',
  /** Dzongkha */
  Dz = 'dz',
  /** Ewe */
  Ee = 'ee',
  /** Greek */
  El = 'el',
  /** English */
  En = 'en',
  /** Esperanto */
  Eo = 'eo',
  /** Spanish */
  Es = 'es',
  /** Estonian */
  Et = 'et',
  /** Basque */
  Eu = 'eu',
  /** Persian */
  Fa = 'fa',
  /** Fulah */
  Ff = 'ff',
  /** Finnish */
  Fi = 'fi',
  /** Filipino */
  Fil = 'fil',
  /** Faroese */
  Fo = 'fo',
  /** French */
  Fr = 'fr',
  /** Western Frisian */
  Fy = 'fy',
  /** Irish */
  Ga = 'ga',
  /** Scottish Gaelic */
  Gd = 'gd',
  /** Galician */
  Gl = 'gl',
  /** Gujarati */
  Gu = 'gu',
  /** Manx */
  Gv = 'gv',
  /** Hausa */
  Ha = 'ha',
  /** Hebrew */
  He = 'he',
  /** Hindi */
  Hi = 'hi',
  /** Croatian */
  Hr = 'hr',
  /** Hungarian */
  Hu = 'hu',
  /** Armenian */
  Hy = 'hy',
  /** Interlingua */
  Ia = 'ia',
  /** Indonesian */
  Id = 'id',
  /** Igbo */
  Ig = 'ig',
  /** Sichuan Yi */
  Ii = 'ii',
  /** Icelandic */
  Is = 'is',
  /** Italian */
  It = 'it',
  /** Japanese */
  Ja = 'ja',
  /** Javanese */
  Jv = 'jv',
  /** Georgian */
  Ka = 'ka',
  /** Kikuyu */
  Ki = 'ki',
  /** Kazakh */
  Kk = 'kk',
  /** Kalaallisut */
  Kl = 'kl',
  /** Khmer */
  Km = 'km',
  /** Kannada */
  Kn = 'kn',
  /** Korean */
  Ko = 'ko',
  /** Kashmiri */
  Ks = 'ks',
  /** Kurdish */
  Ku = 'ku',
  /** Cornish */
  Kw = 'kw',
  /** Kyrgyz */
  Ky = 'ky',
  /** Luxembourgish */
  Lb = 'lb',
  /** Ganda */
  Lg = 'lg',
  /** Lingala */
  Ln = 'ln',
  /** Lao */
  Lo = 'lo',
  /** Lithuanian */
  Lt = 'lt',
  /** Luba-Katanga */
  Lu = 'lu',
  /** Latvian */
  Lv = 'lv',
  /** Malagasy */
  Mg = 'mg',
  /** Māori */
  Mi = 'mi',
  /** Macedonian */
  Mk = 'mk',
  /** Malayalam */
  Ml = 'ml',
  /** Mongolian */
  Mn = 'mn',
  /** Marathi */
  Mr = 'mr',
  /** Malay */
  Ms = 'ms',
  /** Maltese */
  Mt = 'mt',
  /** Burmese */
  My = 'my',
  /** Norwegian Bokmål */
  Nb = 'nb',
  /** North Ndebele */
  Nd = 'nd',
  /** Nepali */
  Ne = 'ne',
  /** Dutch */
  Nl = 'nl',
  /** Norwegian Nynorsk */
  Nn = 'nn',
  /** Norwegian */
  No = 'no',
  /** Oromo */
  Om = 'om',
  /** Odia */
  Or = 'or',
  /** Ossetic */
  Os = 'os',
  /** Punjabi */
  Pa = 'pa',
  /** Polish */
  Pl = 'pl',
  /** Pashto */
  Ps = 'ps',
  /** Portuguese (Brazil) */
  PtBr = 'pt_BR',
  /** Portuguese (Portugal) */
  PtPt = 'pt_PT',
  /** Quechua */
  Qu = 'qu',
  /** Romansh */
  Rm = 'rm',
  /** Rundi */
  Rn = 'rn',
  /** Romanian */
  Ro = 'ro',
  /** Russian */
  Ru = 'ru',
  /** Kinyarwanda */
  Rw = 'rw',
  /** Sanskrit */
  Sa = 'sa',
  /** Sardinian */
  Sc = 'sc',
  /** Sindhi */
  Sd = 'sd',
  /** Northern Sami */
  Se = 'se',
  /** Sango */
  Sg = 'sg',
  /** Sinhala */
  Si = 'si',
  /** Slovak */
  Sk = 'sk',
  /** Slovenian */
  Sl = 'sl',
  /** Shona */
  Sn = 'sn',
  /** Somali */
  So = 'so',
  /** Albanian */
  Sq = 'sq',
  /** Serbian */
  Sr = 'sr',
  /** Sundanese */
  Su = 'su',
  /** Swedish */
  Sv = 'sv',
  /** Swahili */
  Sw = 'sw',
  /** Tamil */
  Ta = 'ta',
  /** Telugu */
  Te = 'te',
  /** Tajik */
  Tg = 'tg',
  /** Thai */
  Th = 'th',
  /** Tigrinya */
  Ti = 'ti',
  /** Turkmen */
  Tk = 'tk',
  /** Tongan */
  To = 'to',
  /** Turkish */
  Tr = 'tr',
  /** Tatar */
  Tt = 'tt',
  /** Uyghur */
  Ug = 'ug',
  /** Ukrainian */
  Uk = 'uk',
  /** Urdu */
  Ur = 'ur',
  /** Uzbek */
  Uz = 'uz',
  /** Vietnamese */
  Vi = 'vi',
  /** Wolof */
  Wo = 'wo',
  /** Xhosa */
  Xh = 'xh',
  /** Yiddish */
  Yi = 'yi',
  /** Yoruba */
  Yo = 'yo',
  /** Chinese (Simplified) */
  ZhCn = 'zh_CN',
  /** Chinese (Traditional) */
  ZhTw = 'zh_TW',
  /** Zulu */
  Zu = 'zu'
}

export type ManualProductRecommendation = Node & {
  __typename?: 'ManualProductRecommendation';
  action: ManualRecommendationAction;
  anchorProduct: Product;
  anchorReferenceStatus: RecommendationReferenceStatus;
  boost: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['DateTime']['output'];
  enabled: Scalars['Boolean']['output'];
  endsAt: Maybe<Scalars['DateTime']['output']>;
  id: Scalars['ID']['output'];
  placement: RecommendationPlacement;
  position: Maybe<Scalars['Int']['output']>;
  startsAt: Maybe<Scalars['DateTime']['output']>;
  targetProduct: Product;
  targetReferenceStatus: RecommendationReferenceStatus;
  updatedAt: Scalars['DateTime']['output'];
};

export type ManualProductRecommendationConnection = {
  __typename?: 'ManualProductRecommendationConnection';
  edges: Array<ManualProductRecommendationEdge>;
  pageInfo: PageInfo;
  totalCount: Scalars['Int']['output'];
};

export type ManualProductRecommendationCreateInput = {
  action: ManualRecommendationAction;
  anchorProductId: Scalars['ID']['input'];
  boost?: InputMaybe<Scalars['String']['input']>;
  enabled: Scalars['Boolean']['input'];
  endsAt?: InputMaybe<Scalars['DateTime']['input']>;
  placement: RecommendationPlacement;
  position?: InputMaybe<Scalars['Int']['input']>;
  startsAt?: InputMaybe<Scalars['DateTime']['input']>;
  targetProductId: Scalars['ID']['input'];
};

export type ManualProductRecommendationCreatePayload = {
  __typename?: 'ManualProductRecommendationCreatePayload';
  recommendation: Maybe<ManualProductRecommendation>;
  userErrors: Array<GenericUserError>;
};

export type ManualProductRecommendationDeletePayload = {
  __typename?: 'ManualProductRecommendationDeletePayload';
  deletedId: Maybe<Scalars['ID']['output']>;
  userErrors: Array<GenericUserError>;
};

export type ManualProductRecommendationEdge = {
  __typename?: 'ManualProductRecommendationEdge';
  cursor: Scalars['String']['output'];
  node: ManualProductRecommendation;
};

export type ManualProductRecommendationOperationResult = {
  __typename?: 'ManualProductRecommendationOperationResult';
  applied: Scalars['Boolean']['output'];
  entityId: Maybe<Scalars['ID']['output']>;
  errors: Array<GenericUserError>;
  type: ManualProductRecommendationOperationType;
};

export enum ManualProductRecommendationOperationType {
  FieldsUpdate = 'FIELDS_UPDATE'
}

export type ManualProductRecommendationUpdateInput = {
  action?: InputMaybe<ManualRecommendationAction>;
  boost?: InputMaybe<Scalars['String']['input']>;
  enabled?: InputMaybe<Scalars['Boolean']['input']>;
  endsAt?: InputMaybe<Scalars['DateTime']['input']>;
  position?: InputMaybe<Scalars['Int']['input']>;
  startsAt?: InputMaybe<Scalars['DateTime']['input']>;
  targetProductId?: InputMaybe<Scalars['ID']['input']>;
};

export type ManualProductRecommendationUpdatePayload = {
  __typename?: 'ManualProductRecommendationUpdatePayload';
  operationResults: Array<ManualProductRecommendationOperationResult>;
  recommendation: Maybe<ManualProductRecommendation>;
  userErrors: Array<GenericUserError>;
};

export enum ManualRecommendationAction {
  Boost = 'BOOST',
  Exclude = 'EXCLUDE',
  Pin = 'PIN'
}

export type ManualRecommendationDraftChangeInput = {
  create?: InputMaybe<ManualRecommendationDraftCreateInput>;
  delete?: InputMaybe<ManualRecommendationDraftDeleteInput>;
  update?: InputMaybe<ManualRecommendationDraftUpdateInput>;
};

export type ManualRecommendationDraftCreateInput = {
  action: ManualRecommendationAction;
  boost?: InputMaybe<Scalars['String']['input']>;
  enabled: Scalars['Boolean']['input'];
  endsAt?: InputMaybe<Scalars['DateTime']['input']>;
  position?: InputMaybe<Scalars['Int']['input']>;
  startsAt?: InputMaybe<Scalars['DateTime']['input']>;
  targetProductId: Scalars['ID']['input'];
};

export type ManualRecommendationDraftDeleteInput = {
  id: Scalars['ID']['input'];
};

export type ManualRecommendationDraftUpdateInput = {
  action?: InputMaybe<ManualRecommendationAction>;
  boost?: InputMaybe<Scalars['String']['input']>;
  enabled?: InputMaybe<Scalars['Boolean']['input']>;
  endsAt?: InputMaybe<Scalars['DateTime']['input']>;
  id: Scalars['ID']['input'];
  position?: InputMaybe<Scalars['Int']['input']>;
  startsAt?: InputMaybe<Scalars['DateTime']['input']>;
  targetProductId?: InputMaybe<Scalars['ID']['input']>;
};

export type Mutation = {
  __typename?: 'Mutation';
  /** Listing mutation namespace. */
  listingMutation: ListingMutation;
};

/** The Node interface is implemented by all types that have a globally unique ID. */
export type Node = {
  /** The globally unique ID of the object. */
  id: Scalars['ID']['output'];
};

/** Information about pagination in a connection. */
export type PageInfo = {
  __typename?: 'PageInfo';
  /** When paginating forwards, the cursor to continue. */
  endCursor: Maybe<Scalars['String']['output']>;
  /** When paginating forwards, are there more items? */
  hasNextPage: Scalars['Boolean']['output'];
  /** When paginating backwards, are there more items? */
  hasPreviousPage: Scalars['Boolean']['output'];
  /** When paginating backwards, the cursor to continue. */
  startCursor: Maybe<Scalars['String']['output']>;
};

/** Direction in which a price adjustment changes the base price. */
export enum PriceAdjustmentOperation {
  /** Subtract the calculated value from the base price. */
  Decrease = 'DECREASE',
  /** Add the calculated value to the base price. */
  Increase = 'INCREASE'
}

/** Representation used to calculate a price adjustment. */
export enum PriceAdjustmentValueType {
  /** Use a monetary value expressed in minor currency units. */
  FixedAmount = 'FIXED_AMOUNT',
  /** Calculate the value from basis points where 10000 equals 100%. */
  Percentage = 'PERCENTAGE'
}

export type Product = Listing & Node & {
  __typename?: 'Product';
  /** The Product global ID owned by Catalog. */
  id: Scalars['ID']['output'];
};

export enum ProductRecommendationSource {
  ContentSimilarity = 'CONTENT_SIMILARITY',
  Fallback = 'FALLBACK',
  FrequentlyBoughtTogether = 'FREQUENTLY_BOUGHT_TOGETHER',
  Manual = 'MANUAL',
  Popularity = 'POPULARITY'
}

export type Query = {
  __typename?: 'Query';
  /** Listing query namespace. */
  listingQuery: ListingQuery;
};

export enum RecommendationPlacement {
  FrequentlyBoughtTogether = 'FREQUENTLY_BOUGHT_TOGETHER',
  ProductRelated = 'PRODUCT_RELATED'
}

export type RecommendationPlacementPolicy = Node & {
  __typename?: 'RecommendationPlacementPolicy';
  createdAt: Scalars['DateTime']['output'];
  enabled: Scalars['Boolean']['output'];
  fallbackChain: Array<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  maximumResults: Scalars['Int']['output'];
  minimumResults: Scalars['Int']['output'];
  placement: RecommendationPlacement;
  strategy: RecommendationStrategy;
  updatedAt: Scalars['DateTime']['output'];
};

export type RecommendationPlacementPolicyCreateInput = {
  fallbackChain: Array<Scalars['String']['input']>;
  maximumResults: Scalars['Int']['input'];
  minimumResults: Scalars['Int']['input'];
  placement: RecommendationPlacement;
  strategy: RecommendationStrategy;
};

export type RecommendationPlacementPolicyCreatePayload = {
  __typename?: 'RecommendationPlacementPolicyCreatePayload';
  policy: Maybe<RecommendationPlacementPolicy>;
  userErrors: Array<GenericUserError>;
};

export type RecommendationPlacementPolicyDraftInput = {
  enabled: Scalars['Boolean']['input'];
  fallbackChain: Array<Scalars['String']['input']>;
  maximumResults: Scalars['Int']['input'];
  minimumResults: Scalars['Int']['input'];
  strategy: RecommendationStrategy;
};

export type RecommendationPlacementPolicyOperationResult = {
  __typename?: 'RecommendationPlacementPolicyOperationResult';
  applied: Scalars['Boolean']['output'];
  entityId: Maybe<Scalars['ID']['output']>;
  errors: Array<GenericUserError>;
  type: RecommendationPlacementPolicyOperationType;
};

export enum RecommendationPlacementPolicyOperationType {
  FieldsUpdate = 'FIELDS_UPDATE'
}

export type RecommendationPlacementPolicyUpdateInput = {
  enabled?: InputMaybe<Scalars['Boolean']['input']>;
  fallbackChain?: InputMaybe<Array<Scalars['String']['input']>>;
  maximumResults?: InputMaybe<Scalars['Int']['input']>;
  minimumResults?: InputMaybe<Scalars['Int']['input']>;
  strategy?: InputMaybe<RecommendationStrategy>;
};

export type RecommendationPlacementPolicyUpdatePayload = {
  __typename?: 'RecommendationPlacementPolicyUpdatePayload';
  operationResults: Array<RecommendationPlacementPolicyOperationResult>;
  policy: Maybe<RecommendationPlacementPolicy>;
  userErrors: Array<GenericUserError>;
};

export type RecommendationPreviewCandidate = {
  __typename?: 'RecommendationPreviewCandidate';
  product: Product;
  rank: Scalars['Int']['output'];
  score: Scalars['String']['output'];
  source: ProductRecommendationSource;
  sourceBreakdown: RecommendationPreviewSourceBreakdown;
};

export type RecommendationPreviewExcludedCandidate = {
  __typename?: 'RecommendationPreviewExcludedCandidate';
  product: Product;
  reason: RecommendationPreviewExcludedReason;
};

export enum RecommendationPreviewExcludedReason {
  Excluded = 'EXCLUDED',
  InsufficientSupport = 'INSUFFICIENT_SUPPORT',
  LimitExceeded = 'LIMIT_EXCEEDED',
  Stale = 'STALE',
  Unavailable = 'UNAVAILABLE',
  Unpublished = 'UNPUBLISHED'
}

export type RecommendationPreviewResult = {
  __typename?: 'RecommendationPreviewResult';
  asOf: Scalars['DateTime']['output'];
  candidates: Array<RecommendationPreviewCandidate>;
  excluded: Array<RecommendationPreviewExcludedCandidate>;
  modelVersion: Scalars['String']['output'];
};

export type RecommendationPreviewSourceBreakdown = {
  __typename?: 'RecommendationPreviewSourceBreakdown';
  categoryPopularityScore: Maybe<Scalars['String']['output']>;
  fbtRunId: Maybe<Scalars['ID']['output']>;
  fbtSourceScore: Maybe<Scalars['String']['output']>;
  manualAction: Maybe<ManualRecommendationAction>;
  manualBoost: Maybe<Scalars['String']['output']>;
  manualPosition: Maybe<Scalars['Int']['output']>;
  storePopularityScore: Maybe<Scalars['String']['output']>;
};

export enum RecommendationReferenceStatus {
  Stale = 'STALE',
  Valid = 'VALID'
}

export type RecommendationSnapshotPreviewInput = {
  anchorProductId: Scalars['ID']['input'];
  manualChanges: Array<ManualRecommendationDraftChangeInput>;
  placement: RecommendationPlacement;
  policy?: InputMaybe<RecommendationPlacementPolicyDraftInput>;
};

export type RecommendationSnapshotPreviewPayload = {
  __typename?: 'RecommendationSnapshotPreviewPayload';
  active: Maybe<RecommendationPreviewResult>;
  draft: Maybe<RecommendationPreviewResult>;
  userErrors: Array<GenericUserError>;
};

export enum RecommendationStrategy {
  AutomatedOnly = 'AUTOMATED_ONLY',
  Blended = 'BLENDED',
  CuratedFirst = 'CURATED_FIRST',
  CuratedOnly = 'CURATED_ONLY'
}

export enum SearchExecutionMode {
  Fuzzy = 'FUZZY',
  Primary = 'PRIMARY'
}

export type SearchExplain = {
  __typename?: 'SearchExplain';
  applicableProductBoostIds: Array<Scalars['ID']['output']>;
  boostOnlyCandidateCount: Scalars['Int']['output'];
  candidateCount: Scalars['Int']['output'];
  locale: LocaleCode;
  matchedSynonymGroupIds: Array<Scalars['ID']['output']>;
  membershipSerializedBytes: Scalars['Int']['output'];
  mode: SearchExecutionMode;
  normalizationContractVersion: Scalars['String']['output'];
  normalizationProfileHash: Scalars['String']['output'];
  normalizedQuery: Scalars['String']['output'];
  originalQuery: Scalars['String']['output'];
  planFingerprint: Scalars['String']['output'];
  reasons: Array<SearchExplainReason>;
  settings: SearchExplainSettings;
  units: Array<SearchExplainUnit>;
  wholeQueryClauses: Array<SearchExplainClause>;
};

export type SearchExplainClause = {
  __typename?: 'SearchExplainClause';
  alternatives: Array<SearchExplainClause>;
  fields: Array<SearchField>;
  kind: SearchExplainClauseKind;
  lexemes: Array<Scalars['String']['output']>;
  requireSameElement: Scalars['Boolean']['output'];
  synonymGroupId: Maybe<Scalars['ID']['output']>;
  value: Maybe<Scalars['String']['output']>;
};

export enum SearchExplainClauseKind {
  FtsPhrase = 'FTS_PHRASE',
  FtsTerms = 'FTS_TERMS',
  IdentifierExact = 'IDENTIFIER_EXACT',
  IdentifierPrefix = 'IDENTIFIER_PREFIX',
  Synonym = 'SYNONYM'
}

export type SearchExplainFieldWeight = {
  __typename?: 'SearchExplainFieldWeight';
  field: SearchField;
  weight: Scalars['Float']['output'];
};

export enum SearchExplainReason {
  BoostOnlyCandidate = 'BOOST_ONLY_CANDIDATE',
  FuzzyFallback = 'FUZZY_FALLBACK',
  IdentifierExpansion = 'IDENTIFIER_EXPANSION',
  ProductBoost = 'PRODUCT_BOOST',
  StopwordRemoval = 'STOPWORD_REMOVAL',
  SynonymExpansion = 'SYNONYM_EXPANSION',
  TypoExpansion = 'TYPO_EXPANSION'
}

export type SearchExplainSettings = {
  __typename?: 'SearchExplainSettings';
  enabledFields: Array<SearchField>;
  fieldWeights: Array<SearchExplainFieldWeight>;
  outOfStockPolicy: SearchOutOfStockPolicy;
  typoToleranceEnabled: Scalars['Boolean']['output'];
};

export type SearchExplainTypoAlternative = {
  __typename?: 'SearchExplainTypoAlternative';
  editDistance: Scalars['Int']['output'];
  lexemes: Array<Scalars['String']['output']>;
  trigramSimilarity: Scalars['Float']['output'];
  value: Scalars['String']['output'];
};

export type SearchExplainUnit = {
  __typename?: 'SearchExplainUnit';
  /** Executed clauses; emitted once on the first token of a grouped plan unit. */
  clauses: Array<SearchExplainClause>;
  kind: SearchLexicalUnitKind;
  lexemes: Array<Scalars['String']['output']>;
  normalized: Scalars['String']['output'];
  /** Required plan unit containing this token, or null for a removed stopword. */
  planUnitIndex: Maybe<Scalars['Int']['output']>;
  removedAsStopword: Scalars['Boolean']['output'];
  source: Scalars['String']['output'];
  typoAlternatives: Array<SearchExplainTypoAlternative>;
};

export enum SearchField {
  CategoryName = 'CATEGORY_NAME',
  ProductTitle = 'PRODUCT_TITLE',
  VariantTitle = 'VARIANT_TITLE',
  VendorName = 'VENDOR_NAME'
}

export type SearchFieldConfiguration = {
  __typename?: 'SearchFieldConfiguration';
  field: SearchField;
  weight: Scalars['Float']['output'];
};

export type SearchFieldConfigurationInput = {
  field: SearchField;
  weight: Scalars['Float']['input'];
};

export enum SearchLexicalUnitKind {
  Code = 'CODE',
  Foreign = 'FOREIGN',
  MixedScript = 'MIXED_SCRIPT',
  Number = 'NUMBER',
  Stopword = 'STOPWORD',
  Text = 'TEXT'
}

export enum SearchOutOfStockPolicy {
  Hide = 'HIDE',
  PlaceLast = 'PLACE_LAST',
  Show = 'SHOW'
}

export type SearchProductBoost = Node & {
  __typename?: 'SearchProductBoost';
  createdAt: Scalars['DateTime']['output'];
  enabled: Scalars['Boolean']['output'];
  id: Scalars['ID']['output'];
  locale: LocaleCode;
  name: Scalars['String']['output'];
  phrases: Array<SearchProductBoostPhrase>;
  phrasesCount: Scalars['Int']['output'];
  products: Array<Product>;
  productsCount: Scalars['Int']['output'];
  updatedAt: Scalars['DateTime']['output'];
};

export type SearchProductBoostConnection = {
  __typename?: 'SearchProductBoostConnection';
  edges: Array<SearchProductBoostEdge>;
  pageInfo: PageInfo;
  totalCount: Scalars['Int']['output'];
};

export type SearchProductBoostCreateInput = {
  enabled: Scalars['Boolean']['input'];
  locale: LocaleCode;
  name: Scalars['String']['input'];
  phrases: Array<Scalars['String']['input']>;
  productIds: Array<Scalars['ID']['input']>;
};

export type SearchProductBoostCreatePayload = {
  __typename?: 'SearchProductBoostCreatePayload';
  productBoost: Maybe<SearchProductBoost>;
  userErrors: Array<GenericUserError>;
};

export type SearchProductBoostDeletePayload = {
  __typename?: 'SearchProductBoostDeletePayload';
  deletedProductBoostId: Maybe<Scalars['ID']['output']>;
  userErrors: Array<GenericUserError>;
};

export type SearchProductBoostEdge = {
  __typename?: 'SearchProductBoostEdge';
  cursor: Scalars['String']['output'];
  node: SearchProductBoost;
};

export type SearchProductBoostOperationResult = {
  __typename?: 'SearchProductBoostOperationResult';
  applied: Scalars['Boolean']['output'];
  entityId: Maybe<Scalars['ID']['output']>;
  errors: Array<GenericUserError>;
  type: SearchProductBoostOperationType;
};

export enum SearchProductBoostOperationType {
  FieldsUpdate = 'FIELDS_UPDATE'
}

/** Ordering configuration for SearchProductBoost */
export type SearchProductBoostOrderByInput = {
  /** Sort direction */
  direction: SortDirection;
  /** Field to order by */
  field: SearchProductBoostOrderField;
};

/** Fields available for sorting SearchProductBoost */
export enum SearchProductBoostOrderField {
  /** Sort by createdAt */
  CreatedAt = 'createdAt',
  /** Sort by enabled */
  Enabled = 'enabled',
  /** Sort by id */
  Id = 'id',
  /** Sort by locale */
  Locale = 'locale',
  /** Sort by name */
  Name = 'name',
  /** Sort by phrasesCount */
  PhrasesCount = 'phrasesCount',
  /** Sort by productsCount */
  ProductsCount = 'productsCount',
  /** Sort by updatedAt */
  UpdatedAt = 'updatedAt'
}

export type SearchProductBoostPhrase = {
  __typename?: 'SearchProductBoostPhrase';
  phrase: Scalars['String']['output'];
  position: Scalars['Int']['output'];
};

export type SearchProductBoostUpdateInput = {
  enabled: Scalars['Boolean']['input'];
  locale: LocaleCode;
  name: Scalars['String']['input'];
  phrases: Array<Scalars['String']['input']>;
  productIds: Array<Scalars['ID']['input']>;
};

export type SearchProductBoostUpdatePayload = {
  __typename?: 'SearchProductBoostUpdatePayload';
  operationResults: Array<SearchProductBoostOperationResult>;
  productBoost: Maybe<SearchProductBoost>;
  userErrors: Array<GenericUserError>;
};

/** Filter conditions for SearchProductBoost */
export type SearchProductBoostWhereInput = {
  /** Logical AND of multiple conditions */
  _and?: InputMaybe<Array<SearchProductBoostWhereInput>>;
  /** Negate the condition */
  _not?: InputMaybe<SearchProductBoostWhereInput>;
  /** Logical OR of multiple conditions */
  _or?: InputMaybe<Array<SearchProductBoostWhereInput>>;
  /** Filter by createdAt */
  createdAt?: InputMaybe<DateTimeFilter>;
  /** Filter by enabled */
  enabled?: InputMaybe<BooleanFilter>;
  /** Filter by id */
  id?: InputMaybe<IdFilter>;
  /** Filter by locale */
  locale?: InputMaybe<StringFilter>;
  /** Filter by name */
  name?: InputMaybe<StringFilter>;
  /** Filter by phrases */
  phrases?: InputMaybe<StringFilter>;
  /** Filter by phrasesCount */
  phrasesCount?: InputMaybe<IntFilter>;
  /** Filter by productsCount */
  productsCount?: InputMaybe<IntFilter>;
  /** Filter by updatedAt */
  updatedAt?: InputMaybe<DateTimeFilter>;
};

export type SearchProductBoostsMetaInput = {
  /** Match boosts containing any selected Product global ID. */
  productIds: Array<Scalars['ID']['input']>;
};

export type SearchSettings = {
  __typename?: 'SearchSettings';
  fields: Array<SearchFieldConfiguration>;
  id: Scalars['ID']['output'];
  outOfStockPolicy: SearchOutOfStockPolicy;
  typoToleranceEnabled: Scalars['Boolean']['output'];
  updatedAt: Scalars['DateTime']['output'];
};

export type SearchSettingsOperationResult = {
  __typename?: 'SearchSettingsOperationResult';
  applied: Scalars['Boolean']['output'];
  entityId: Maybe<Scalars['ID']['output']>;
  errors: Array<GenericUserError>;
  type: SearchSettingsOperationType;
};

export enum SearchSettingsOperationType {
  SettingsUpdate = 'SETTINGS_UPDATE'
}

export type SearchSettingsOperationsInput = {
  /** Main search settings replacement. */
  settings: SearchSettingsValuesInput;
};

export type SearchSettingsUpdatePayload = {
  __typename?: 'SearchSettingsUpdatePayload';
  operationResults: Array<SearchSettingsOperationResult>;
  settings: Maybe<SearchSettings>;
  userErrors: Array<GenericUserError>;
};

export type SearchSettingsValuesInput = {
  fields: Array<SearchFieldConfigurationInput>;
  outOfStockPolicy: SearchOutOfStockPolicy;
  typoToleranceEnabled: Scalars['Boolean']['input'];
};

export type SearchSynonymGroup = Node & {
  __typename?: 'SearchSynonymGroup';
  createdAt: Scalars['DateTime']['output'];
  enabled: Scalars['Boolean']['output'];
  id: Scalars['ID']['output'];
  locale: LocaleCode;
  name: Scalars['String']['output'];
  updatedAt: Scalars['DateTime']['output'];
  values: Array<SearchSynonymValue>;
  valuesCount: Scalars['Int']['output'];
};

export type SearchSynonymGroupConnection = {
  __typename?: 'SearchSynonymGroupConnection';
  edges: Array<SearchSynonymGroupEdge>;
  pageInfo: PageInfo;
  totalCount: Scalars['Int']['output'];
};

export type SearchSynonymGroupCreateInput = {
  enabled: Scalars['Boolean']['input'];
  locale: LocaleCode;
  name: Scalars['String']['input'];
  values: Array<Scalars['String']['input']>;
};

export type SearchSynonymGroupCreatePayload = {
  __typename?: 'SearchSynonymGroupCreatePayload';
  synonymGroup: Maybe<SearchSynonymGroup>;
  userErrors: Array<GenericUserError>;
};

export type SearchSynonymGroupDeletePayload = {
  __typename?: 'SearchSynonymGroupDeletePayload';
  deletedSynonymGroupId: Maybe<Scalars['ID']['output']>;
  userErrors: Array<GenericUserError>;
};

export type SearchSynonymGroupEdge = {
  __typename?: 'SearchSynonymGroupEdge';
  cursor: Scalars['String']['output'];
  node: SearchSynonymGroup;
};

export type SearchSynonymGroupOperationResult = {
  __typename?: 'SearchSynonymGroupOperationResult';
  applied: Scalars['Boolean']['output'];
  entityId: Maybe<Scalars['ID']['output']>;
  errors: Array<GenericUserError>;
  type: SearchSynonymGroupOperationType;
};

export enum SearchSynonymGroupOperationType {
  FieldsUpdate = 'FIELDS_UPDATE'
}

/** Ordering configuration for SearchSynonymGroup */
export type SearchSynonymGroupOrderByInput = {
  /** Sort direction */
  direction: SortDirection;
  /** Field to order by */
  field: SearchSynonymGroupOrderField;
};

/** Fields available for sorting SearchSynonymGroup */
export enum SearchSynonymGroupOrderField {
  /** Sort by createdAt */
  CreatedAt = 'createdAt',
  /** Sort by enabled */
  Enabled = 'enabled',
  /** Sort by id */
  Id = 'id',
  /** Sort by locale */
  Locale = 'locale',
  /** Sort by name */
  Name = 'name',
  /** Sort by updatedAt */
  UpdatedAt = 'updatedAt',
  /** Sort by valuesCount */
  ValuesCount = 'valuesCount'
}

export type SearchSynonymGroupUpdateInput = {
  enabled: Scalars['Boolean']['input'];
  locale: LocaleCode;
  name: Scalars['String']['input'];
  values: Array<Scalars['String']['input']>;
};

export type SearchSynonymGroupUpdatePayload = {
  __typename?: 'SearchSynonymGroupUpdatePayload';
  operationResults: Array<SearchSynonymGroupOperationResult>;
  synonymGroup: Maybe<SearchSynonymGroup>;
  userErrors: Array<GenericUserError>;
};

/** Filter conditions for SearchSynonymGroup */
export type SearchSynonymGroupWhereInput = {
  /** Logical AND of multiple conditions */
  _and?: InputMaybe<Array<SearchSynonymGroupWhereInput>>;
  /** Negate the condition */
  _not?: InputMaybe<SearchSynonymGroupWhereInput>;
  /** Logical OR of multiple conditions */
  _or?: InputMaybe<Array<SearchSynonymGroupWhereInput>>;
  /** Filter by createdAt */
  createdAt?: InputMaybe<DateTimeFilter>;
  /** Filter by enabled */
  enabled?: InputMaybe<BooleanFilter>;
  /** Filter by id */
  id?: InputMaybe<IdFilter>;
  /** Filter by locale */
  locale?: InputMaybe<StringFilter>;
  /** Filter by name */
  name?: InputMaybe<StringFilter>;
  /** Filter by terms */
  terms?: InputMaybe<StringFilter>;
  /** Filter by updatedAt */
  updatedAt?: InputMaybe<DateTimeFilter>;
  /** Filter by valuesCount */
  valuesCount?: InputMaybe<IntFilter>;
};

export type SearchSynonymValue = {
  __typename?: 'SearchSynonymValue';
  position: Scalars['Int']['output'];
  value: Scalars['String']['output'];
};

/** Sort direction */
export enum SortDirection {
  Asc = 'asc',
  Desc = 'desc'
}

/** Filter operators for String fields */
export type StringFilter = {
  /** Contains substring (case-sensitive) */
  _contains?: InputMaybe<Scalars['String']['input']>;
  /** Contains substring (case-insensitive) */
  _containsi?: InputMaybe<Scalars['String']['input']>;
  /** Ends with (case-sensitive) */
  _endsWith?: InputMaybe<Scalars['String']['input']>;
  /** Ends with (case-insensitive) */
  _endsWithi?: InputMaybe<Scalars['String']['input']>;
  /** Equals */
  _eq?: InputMaybe<Scalars['String']['input']>;
  /** In array */
  _in?: InputMaybe<Array<Scalars['String']['input']>>;
  /** Is null */
  _is?: InputMaybe<Scalars['Boolean']['input']>;
  /** Is not null */
  _isNot?: InputMaybe<Scalars['Boolean']['input']>;
  /** Not equals */
  _neq?: InputMaybe<Scalars['String']['input']>;
  /** Does not contain substring (case-sensitive) */
  _notContains?: InputMaybe<Scalars['String']['input']>;
  /** Does not contain substring (case-insensitive) */
  _notContainsi?: InputMaybe<Scalars['String']['input']>;
  /** Not in array */
  _notIn?: InputMaybe<Array<Scalars['String']['input']>>;
  /** Starts with (case-sensitive) */
  _startsWith?: InputMaybe<Scalars['String']['input']>;
  /** Starts with (case-insensitive) */
  _startsWithi?: InputMaybe<Scalars['String']['input']>;
};

/** Type of visual swatch for facet values. */
export enum SwatchType {
  Color = 'COLOR',
  Gradient = 'GRADIENT',
  Image = 'IMAGE'
}

/** A generic user error interface for mutation responses. */
export type UserError = {
  /** An error code for programmatic handling. */
  code: Maybe<Scalars['String']['output']>;
  /** The path to the input field that caused the error. */
  field: Maybe<Array<Scalars['String']['output']>>;
  /** The error message. */
  message: Scalars['String']['output'];
};

/** Weight measurement units */
export enum WeightUnit {
  /** Gram */
  G = 'g',
  /** Kilogram */
  Kg = 'kg',
  /** Pound */
  Lb = 'lb',
  /** Ounce */
  Oz = 'oz'
}

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
  Listing: ( Product );
  Node: ( Facet ) | ( FacetSwatch ) | ( FacetValue ) | ( ManualProductRecommendation ) | ( Product ) | ( RecommendationPlacementPolicy ) | ( SearchProductBoost ) | ( SearchSynonymGroup );
  UserError: ( GenericUserError );
}>;

/** Mapping between all available schema types and the resolvers types */
export type ResolversTypes = ResolversObject<{
  BigInt: ResolverTypeWrapper<Scalars['BigInt']['output']>;
  BooleanFilter: BooleanFilter;
  Boolean: ResolverTypeWrapper<Scalars['Boolean']['output']>;
  Collection: ResolverTypeWrapper<Omit<Collection, 'products'> & { products: ResolversTypes['ListingConnection'] }>;
  ID: ResolverTypeWrapper<Scalars['ID']['output']>;
  String: ResolverTypeWrapper<Scalars['String']['output']>;
  Int: ResolverTypeWrapper<Scalars['Int']['output']>;
  CurrencyCode: CurrencyCode;
  DateTime: ResolverTypeWrapper<Scalars['DateTime']['output']>;
  DateTimeFilter: DateTimeFilter;
  DimensionUnit: DimensionUnit;
  Facet: ResolverTypeWrapper<Facet>;
  FacetCreateInput: FacetCreateInput;
  FacetCreatePayload: ResolverTypeWrapper<FacetCreatePayload>;
  FacetCreateSourceInput: FacetCreateSourceInput;
  FacetCreateValueCandidateInput: FacetCreateValueCandidateInput;
  FacetDeletePayload: ResolverTypeWrapper<FacetDeletePayload>;
  FacetFieldsInput: FacetFieldsInput;
  FacetOperationResult: ResolverTypeWrapper<FacetOperationResult>;
  FacetOperationType: FacetOperationType;
  FacetPositionInput: FacetPositionInput;
  FacetRebalancePayload: ResolverTypeWrapper<FacetRebalancePayload>;
  FacetScopeType: FacetScopeType;
  FacetScopesUpdateInput: FacetScopesUpdateInput;
  FacetScopesUpdateItemInput: FacetScopesUpdateItemInput;
  FacetScopesUpdatePayload: ResolverTypeWrapper<FacetScopesUpdatePayload>;
  FacetSelectionMode: FacetSelectionMode;
  FacetSource: ResolverTypeWrapper<FacetSource>;
  FacetSourceCandidate: ResolverTypeWrapper<FacetSourceCandidate>;
  FacetSourceCandidateConnection: ResolverTypeWrapper<FacetSourceCandidateConnection>;
  FacetSourceCandidateEdge: ResolverTypeWrapper<FacetSourceCandidateEdge>;
  FacetSourceCandidateOrderByInput: FacetSourceCandidateOrderByInput;
  FacetSourceCandidateOrderField: FacetSourceCandidateOrderField;
  FacetSourceCandidateWhereInput: FacetSourceCandidateWhereInput;
  FacetSwatch: ResolverTypeWrapper<FacetSwatch>;
  FacetSwatchCreateInput: FacetSwatchCreateInput;
  FacetSwatchCreatePayload: ResolverTypeWrapper<FacetSwatchCreatePayload>;
  FacetSwatchDeletePayload: ResolverTypeWrapper<FacetSwatchDeletePayload>;
  FacetSwatchFieldsInput: FacetSwatchFieldsInput;
  FacetSwatchOperationResult: ResolverTypeWrapper<FacetSwatchOperationResult>;
  FacetSwatchOperationType: FacetSwatchOperationType;
  FacetSwatchUpdateInput: FacetSwatchUpdateInput;
  FacetSwatchUpdatePayload: ResolverTypeWrapper<FacetSwatchUpdatePayload>;
  FacetType: FacetType;
  FacetUIType: FacetUiType;
  FacetUpdateInput: FacetUpdateInput;
  FacetUpdatePayload: ResolverTypeWrapper<FacetUpdatePayload>;
  FacetValue: ResolverTypeWrapper<FacetValue>;
  FacetValueCandidate: ResolverTypeWrapper<FacetValueCandidate>;
  FacetValueCandidateConnection: ResolverTypeWrapper<FacetValueCandidateConnection>;
  FacetValueCandidateEdge: ResolverTypeWrapper<FacetValueCandidateEdge>;
  FacetValueCandidateOrderByInput: FacetValueCandidateOrderByInput;
  FacetValueCandidateOrderField: FacetValueCandidateOrderField;
  FacetValueCandidateType: FacetValueCandidateType;
  FacetValueCandidateWhereInput: FacetValueCandidateWhereInput;
  FacetValueCandidatesMetaInput: FacetValueCandidatesMetaInput;
  FacetValueKind: FacetValueKind;
  FacetValueMergeValuesInput: FacetValueMergeValuesInput;
  FacetValueOperationAction: FacetValueOperationAction;
  FacetValueOperationInput: FacetValueOperationInput;
  FacetValueValuesInput: FacetValueValuesInput;
  File: ResolverTypeWrapper<File>;
  FloatFilter: FloatFilter;
  Float: ResolverTypeWrapper<Scalars['Float']['output']>;
  GenericUserError: ResolverTypeWrapper<GenericUserError>;
  IDFilter: IdFilter;
  IntFilter: IntFilter;
  JSON: ResolverTypeWrapper<Scalars['JSON']['output']>;
  Listing: ResolverTypeWrapper<ResolversInterfaceTypes<ResolversTypes>['Listing']>;
  ListingConnection: ResolverTypeWrapper<Omit<ListingConnection, 'edges'> & { edges: Array<ResolversTypes['ListingEdge']> }>;
  ListingEdge: ResolverTypeWrapper<Omit<ListingEdge, 'node'> & { node: ResolversTypes['Listing'] }>;
  ListingFacet: ResolverTypeWrapper<ListingFacet>;
  ListingFacetType: ListingFacetType;
  ListingFacetValue: ResolverTypeWrapper<ListingFacetValue>;
  ListingFacetValueFilter: ListingFacetValueFilter;
  ListingMutation: ResolverTypeWrapper<ListingMutation>;
  ListingOrderByInput: ListingOrderByInput;
  ListingPriceRangeFilter: ListingPriceRangeFilter;
  ListingProductFilter: ListingProductFilter;
  ListingProductStatus: ListingProductStatus;
  ListingQuery: ResolverTypeWrapper<Omit<ListingQuery, 'listing' | 'node' | 'nodes'> & { listing: ResolversTypes['ListingConnection'], node?: Maybe<ResolversTypes['Node']>, nodes: Array<Maybe<ResolversTypes['Node']>> }>;
  ListingScopeInput: ListingScopeInput;
  ListingScopeKind: ListingScopeKind;
  ListingSearchMutation: ResolverTypeWrapper<ListingSearchMutation>;
  ListingSearchQuery: ResolverTypeWrapper<ListingSearchQuery>;
  ListingSortBy: ListingSortBy;
  ListingSortDirection: ListingSortDirection;
  ListingVariantOptionFilter: ListingVariantOptionFilter;
  LocaleCode: LocaleCode;
  ManualProductRecommendation: ResolverTypeWrapper<ManualProductRecommendation>;
  ManualProductRecommendationConnection: ResolverTypeWrapper<ManualProductRecommendationConnection>;
  ManualProductRecommendationCreateInput: ManualProductRecommendationCreateInput;
  ManualProductRecommendationCreatePayload: ResolverTypeWrapper<ManualProductRecommendationCreatePayload>;
  ManualProductRecommendationDeletePayload: ResolverTypeWrapper<ManualProductRecommendationDeletePayload>;
  ManualProductRecommendationEdge: ResolverTypeWrapper<ManualProductRecommendationEdge>;
  ManualProductRecommendationOperationResult: ResolverTypeWrapper<ManualProductRecommendationOperationResult>;
  ManualProductRecommendationOperationType: ManualProductRecommendationOperationType;
  ManualProductRecommendationUpdateInput: ManualProductRecommendationUpdateInput;
  ManualProductRecommendationUpdatePayload: ResolverTypeWrapper<ManualProductRecommendationUpdatePayload>;
  ManualRecommendationAction: ManualRecommendationAction;
  ManualRecommendationDraftChangeInput: ManualRecommendationDraftChangeInput;
  ManualRecommendationDraftCreateInput: ManualRecommendationDraftCreateInput;
  ManualRecommendationDraftDeleteInput: ManualRecommendationDraftDeleteInput;
  ManualRecommendationDraftUpdateInput: ManualRecommendationDraftUpdateInput;
  Mutation: ResolverTypeWrapper<{}>;
  Node: ResolverTypeWrapper<ResolversInterfaceTypes<ResolversTypes>['Node']>;
  PageInfo: ResolverTypeWrapper<PageInfo>;
  PriceAdjustmentOperation: PriceAdjustmentOperation;
  PriceAdjustmentValueType: PriceAdjustmentValueType;
  Product: ResolverTypeWrapper<Product>;
  ProductRecommendationSource: ProductRecommendationSource;
  Query: ResolverTypeWrapper<{}>;
  RecommendationPlacement: RecommendationPlacement;
  RecommendationPlacementPolicy: ResolverTypeWrapper<RecommendationPlacementPolicy>;
  RecommendationPlacementPolicyCreateInput: RecommendationPlacementPolicyCreateInput;
  RecommendationPlacementPolicyCreatePayload: ResolverTypeWrapper<RecommendationPlacementPolicyCreatePayload>;
  RecommendationPlacementPolicyDraftInput: RecommendationPlacementPolicyDraftInput;
  RecommendationPlacementPolicyOperationResult: ResolverTypeWrapper<RecommendationPlacementPolicyOperationResult>;
  RecommendationPlacementPolicyOperationType: RecommendationPlacementPolicyOperationType;
  RecommendationPlacementPolicyUpdateInput: RecommendationPlacementPolicyUpdateInput;
  RecommendationPlacementPolicyUpdatePayload: ResolverTypeWrapper<RecommendationPlacementPolicyUpdatePayload>;
  RecommendationPreviewCandidate: ResolverTypeWrapper<RecommendationPreviewCandidate>;
  RecommendationPreviewExcludedCandidate: ResolverTypeWrapper<RecommendationPreviewExcludedCandidate>;
  RecommendationPreviewExcludedReason: RecommendationPreviewExcludedReason;
  RecommendationPreviewResult: ResolverTypeWrapper<RecommendationPreviewResult>;
  RecommendationPreviewSourceBreakdown: ResolverTypeWrapper<RecommendationPreviewSourceBreakdown>;
  RecommendationReferenceStatus: RecommendationReferenceStatus;
  RecommendationSnapshotPreviewInput: RecommendationSnapshotPreviewInput;
  RecommendationSnapshotPreviewPayload: ResolverTypeWrapper<RecommendationSnapshotPreviewPayload>;
  RecommendationStrategy: RecommendationStrategy;
  SearchExecutionMode: SearchExecutionMode;
  SearchExplain: ResolverTypeWrapper<SearchExplain>;
  SearchExplainClause: ResolverTypeWrapper<SearchExplainClause>;
  SearchExplainClauseKind: SearchExplainClauseKind;
  SearchExplainFieldWeight: ResolverTypeWrapper<SearchExplainFieldWeight>;
  SearchExplainReason: SearchExplainReason;
  SearchExplainSettings: ResolverTypeWrapper<SearchExplainSettings>;
  SearchExplainTypoAlternative: ResolverTypeWrapper<SearchExplainTypoAlternative>;
  SearchExplainUnit: ResolverTypeWrapper<SearchExplainUnit>;
  SearchField: SearchField;
  SearchFieldConfiguration: ResolverTypeWrapper<SearchFieldConfiguration>;
  SearchFieldConfigurationInput: SearchFieldConfigurationInput;
  SearchLexicalUnitKind: SearchLexicalUnitKind;
  SearchOutOfStockPolicy: SearchOutOfStockPolicy;
  SearchProductBoost: ResolverTypeWrapper<SearchProductBoost>;
  SearchProductBoostConnection: ResolverTypeWrapper<SearchProductBoostConnection>;
  SearchProductBoostCreateInput: SearchProductBoostCreateInput;
  SearchProductBoostCreatePayload: ResolverTypeWrapper<SearchProductBoostCreatePayload>;
  SearchProductBoostDeletePayload: ResolverTypeWrapper<SearchProductBoostDeletePayload>;
  SearchProductBoostEdge: ResolverTypeWrapper<SearchProductBoostEdge>;
  SearchProductBoostOperationResult: ResolverTypeWrapper<SearchProductBoostOperationResult>;
  SearchProductBoostOperationType: SearchProductBoostOperationType;
  SearchProductBoostOrderByInput: SearchProductBoostOrderByInput;
  SearchProductBoostOrderField: SearchProductBoostOrderField;
  SearchProductBoostPhrase: ResolverTypeWrapper<SearchProductBoostPhrase>;
  SearchProductBoostUpdateInput: SearchProductBoostUpdateInput;
  SearchProductBoostUpdatePayload: ResolverTypeWrapper<SearchProductBoostUpdatePayload>;
  SearchProductBoostWhereInput: SearchProductBoostWhereInput;
  SearchProductBoostsMetaInput: SearchProductBoostsMetaInput;
  SearchSettings: ResolverTypeWrapper<SearchSettings>;
  SearchSettingsOperationResult: ResolverTypeWrapper<SearchSettingsOperationResult>;
  SearchSettingsOperationType: SearchSettingsOperationType;
  SearchSettingsOperationsInput: SearchSettingsOperationsInput;
  SearchSettingsUpdatePayload: ResolverTypeWrapper<SearchSettingsUpdatePayload>;
  SearchSettingsValuesInput: SearchSettingsValuesInput;
  SearchSynonymGroup: ResolverTypeWrapper<SearchSynonymGroup>;
  SearchSynonymGroupConnection: ResolverTypeWrapper<SearchSynonymGroupConnection>;
  SearchSynonymGroupCreateInput: SearchSynonymGroupCreateInput;
  SearchSynonymGroupCreatePayload: ResolverTypeWrapper<SearchSynonymGroupCreatePayload>;
  SearchSynonymGroupDeletePayload: ResolverTypeWrapper<SearchSynonymGroupDeletePayload>;
  SearchSynonymGroupEdge: ResolverTypeWrapper<SearchSynonymGroupEdge>;
  SearchSynonymGroupOperationResult: ResolverTypeWrapper<SearchSynonymGroupOperationResult>;
  SearchSynonymGroupOperationType: SearchSynonymGroupOperationType;
  SearchSynonymGroupOrderByInput: SearchSynonymGroupOrderByInput;
  SearchSynonymGroupOrderField: SearchSynonymGroupOrderField;
  SearchSynonymGroupUpdateInput: SearchSynonymGroupUpdateInput;
  SearchSynonymGroupUpdatePayload: ResolverTypeWrapper<SearchSynonymGroupUpdatePayload>;
  SearchSynonymGroupWhereInput: SearchSynonymGroupWhereInput;
  SearchSynonymValue: ResolverTypeWrapper<SearchSynonymValue>;
  SortDirection: SortDirection;
  StringFilter: StringFilter;
  SwatchType: SwatchType;
  UserError: ResolverTypeWrapper<ResolversInterfaceTypes<ResolversTypes>['UserError']>;
  WeightUnit: WeightUnit;
}>;

/** Mapping between all available schema types and the resolvers parents */
export type ResolversParentTypes = ResolversObject<{
  BigInt: Scalars['BigInt']['output'];
  BooleanFilter: BooleanFilter;
  Boolean: Scalars['Boolean']['output'];
  Collection: Omit<Collection, 'products'> & { products: ResolversParentTypes['ListingConnection'] };
  ID: Scalars['ID']['output'];
  String: Scalars['String']['output'];
  Int: Scalars['Int']['output'];
  DateTime: Scalars['DateTime']['output'];
  DateTimeFilter: DateTimeFilter;
  Facet: Facet;
  FacetCreateInput: FacetCreateInput;
  FacetCreatePayload: FacetCreatePayload;
  FacetCreateSourceInput: FacetCreateSourceInput;
  FacetCreateValueCandidateInput: FacetCreateValueCandidateInput;
  FacetDeletePayload: FacetDeletePayload;
  FacetFieldsInput: FacetFieldsInput;
  FacetOperationResult: FacetOperationResult;
  FacetPositionInput: FacetPositionInput;
  FacetRebalancePayload: FacetRebalancePayload;
  FacetScopesUpdateInput: FacetScopesUpdateInput;
  FacetScopesUpdateItemInput: FacetScopesUpdateItemInput;
  FacetScopesUpdatePayload: FacetScopesUpdatePayload;
  FacetSource: FacetSource;
  FacetSourceCandidate: FacetSourceCandidate;
  FacetSourceCandidateConnection: FacetSourceCandidateConnection;
  FacetSourceCandidateEdge: FacetSourceCandidateEdge;
  FacetSourceCandidateOrderByInput: FacetSourceCandidateOrderByInput;
  FacetSourceCandidateWhereInput: FacetSourceCandidateWhereInput;
  FacetSwatch: FacetSwatch;
  FacetSwatchCreateInput: FacetSwatchCreateInput;
  FacetSwatchCreatePayload: FacetSwatchCreatePayload;
  FacetSwatchDeletePayload: FacetSwatchDeletePayload;
  FacetSwatchFieldsInput: FacetSwatchFieldsInput;
  FacetSwatchOperationResult: FacetSwatchOperationResult;
  FacetSwatchUpdateInput: FacetSwatchUpdateInput;
  FacetSwatchUpdatePayload: FacetSwatchUpdatePayload;
  FacetUpdateInput: FacetUpdateInput;
  FacetUpdatePayload: FacetUpdatePayload;
  FacetValue: FacetValue;
  FacetValueCandidate: FacetValueCandidate;
  FacetValueCandidateConnection: FacetValueCandidateConnection;
  FacetValueCandidateEdge: FacetValueCandidateEdge;
  FacetValueCandidateOrderByInput: FacetValueCandidateOrderByInput;
  FacetValueCandidateWhereInput: FacetValueCandidateWhereInput;
  FacetValueCandidatesMetaInput: FacetValueCandidatesMetaInput;
  FacetValueMergeValuesInput: FacetValueMergeValuesInput;
  FacetValueOperationInput: FacetValueOperationInput;
  FacetValueValuesInput: FacetValueValuesInput;
  File: File;
  FloatFilter: FloatFilter;
  Float: Scalars['Float']['output'];
  GenericUserError: GenericUserError;
  IDFilter: IdFilter;
  IntFilter: IntFilter;
  JSON: Scalars['JSON']['output'];
  Listing: ResolversInterfaceTypes<ResolversParentTypes>['Listing'];
  ListingConnection: Omit<ListingConnection, 'edges'> & { edges: Array<ResolversParentTypes['ListingEdge']> };
  ListingEdge: Omit<ListingEdge, 'node'> & { node: ResolversParentTypes['Listing'] };
  ListingFacet: ListingFacet;
  ListingFacetValue: ListingFacetValue;
  ListingFacetValueFilter: ListingFacetValueFilter;
  ListingMutation: ListingMutation;
  ListingOrderByInput: ListingOrderByInput;
  ListingPriceRangeFilter: ListingPriceRangeFilter;
  ListingProductFilter: ListingProductFilter;
  ListingQuery: Omit<ListingQuery, 'listing' | 'node' | 'nodes'> & { listing: ResolversParentTypes['ListingConnection'], node?: Maybe<ResolversParentTypes['Node']>, nodes: Array<Maybe<ResolversParentTypes['Node']>> };
  ListingScopeInput: ListingScopeInput;
  ListingSearchMutation: ListingSearchMutation;
  ListingSearchQuery: ListingSearchQuery;
  ListingVariantOptionFilter: ListingVariantOptionFilter;
  ManualProductRecommendation: ManualProductRecommendation;
  ManualProductRecommendationConnection: ManualProductRecommendationConnection;
  ManualProductRecommendationCreateInput: ManualProductRecommendationCreateInput;
  ManualProductRecommendationCreatePayload: ManualProductRecommendationCreatePayload;
  ManualProductRecommendationDeletePayload: ManualProductRecommendationDeletePayload;
  ManualProductRecommendationEdge: ManualProductRecommendationEdge;
  ManualProductRecommendationOperationResult: ManualProductRecommendationOperationResult;
  ManualProductRecommendationUpdateInput: ManualProductRecommendationUpdateInput;
  ManualProductRecommendationUpdatePayload: ManualProductRecommendationUpdatePayload;
  ManualRecommendationDraftChangeInput: ManualRecommendationDraftChangeInput;
  ManualRecommendationDraftCreateInput: ManualRecommendationDraftCreateInput;
  ManualRecommendationDraftDeleteInput: ManualRecommendationDraftDeleteInput;
  ManualRecommendationDraftUpdateInput: ManualRecommendationDraftUpdateInput;
  Mutation: {};
  Node: ResolversInterfaceTypes<ResolversParentTypes>['Node'];
  PageInfo: PageInfo;
  Product: Product;
  Query: {};
  RecommendationPlacementPolicy: RecommendationPlacementPolicy;
  RecommendationPlacementPolicyCreateInput: RecommendationPlacementPolicyCreateInput;
  RecommendationPlacementPolicyCreatePayload: RecommendationPlacementPolicyCreatePayload;
  RecommendationPlacementPolicyDraftInput: RecommendationPlacementPolicyDraftInput;
  RecommendationPlacementPolicyOperationResult: RecommendationPlacementPolicyOperationResult;
  RecommendationPlacementPolicyUpdateInput: RecommendationPlacementPolicyUpdateInput;
  RecommendationPlacementPolicyUpdatePayload: RecommendationPlacementPolicyUpdatePayload;
  RecommendationPreviewCandidate: RecommendationPreviewCandidate;
  RecommendationPreviewExcludedCandidate: RecommendationPreviewExcludedCandidate;
  RecommendationPreviewResult: RecommendationPreviewResult;
  RecommendationPreviewSourceBreakdown: RecommendationPreviewSourceBreakdown;
  RecommendationSnapshotPreviewInput: RecommendationSnapshotPreviewInput;
  RecommendationSnapshotPreviewPayload: RecommendationSnapshotPreviewPayload;
  SearchExplain: SearchExplain;
  SearchExplainClause: SearchExplainClause;
  SearchExplainFieldWeight: SearchExplainFieldWeight;
  SearchExplainSettings: SearchExplainSettings;
  SearchExplainTypoAlternative: SearchExplainTypoAlternative;
  SearchExplainUnit: SearchExplainUnit;
  SearchFieldConfiguration: SearchFieldConfiguration;
  SearchFieldConfigurationInput: SearchFieldConfigurationInput;
  SearchProductBoost: SearchProductBoost;
  SearchProductBoostConnection: SearchProductBoostConnection;
  SearchProductBoostCreateInput: SearchProductBoostCreateInput;
  SearchProductBoostCreatePayload: SearchProductBoostCreatePayload;
  SearchProductBoostDeletePayload: SearchProductBoostDeletePayload;
  SearchProductBoostEdge: SearchProductBoostEdge;
  SearchProductBoostOperationResult: SearchProductBoostOperationResult;
  SearchProductBoostOrderByInput: SearchProductBoostOrderByInput;
  SearchProductBoostPhrase: SearchProductBoostPhrase;
  SearchProductBoostUpdateInput: SearchProductBoostUpdateInput;
  SearchProductBoostUpdatePayload: SearchProductBoostUpdatePayload;
  SearchProductBoostWhereInput: SearchProductBoostWhereInput;
  SearchProductBoostsMetaInput: SearchProductBoostsMetaInput;
  SearchSettings: SearchSettings;
  SearchSettingsOperationResult: SearchSettingsOperationResult;
  SearchSettingsOperationsInput: SearchSettingsOperationsInput;
  SearchSettingsUpdatePayload: SearchSettingsUpdatePayload;
  SearchSettingsValuesInput: SearchSettingsValuesInput;
  SearchSynonymGroup: SearchSynonymGroup;
  SearchSynonymGroupConnection: SearchSynonymGroupConnection;
  SearchSynonymGroupCreateInput: SearchSynonymGroupCreateInput;
  SearchSynonymGroupCreatePayload: SearchSynonymGroupCreatePayload;
  SearchSynonymGroupDeletePayload: SearchSynonymGroupDeletePayload;
  SearchSynonymGroupEdge: SearchSynonymGroupEdge;
  SearchSynonymGroupOperationResult: SearchSynonymGroupOperationResult;
  SearchSynonymGroupOrderByInput: SearchSynonymGroupOrderByInput;
  SearchSynonymGroupUpdateInput: SearchSynonymGroupUpdateInput;
  SearchSynonymGroupUpdatePayload: SearchSynonymGroupUpdatePayload;
  SearchSynonymGroupWhereInput: SearchSynonymGroupWhereInput;
  SearchSynonymValue: SearchSynonymValue;
  StringFilter: StringFilter;
  UserError: ResolversInterfaceTypes<ResolversParentTypes>['UserError'];
}>;

export interface BigIntScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['BigInt'], any> {
  name: 'BigInt';
}

export type CollectionResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['Collection'] = ResolversParentTypes['Collection']> = ResolversObject<{
  __resolveReference?: ReferenceResolver<Maybe<ResolversTypes['Collection']>, { __typename: 'Collection' } & GraphQLRecursivePick<ParentType, {"id":true}>, ContextType>;

  products?: Resolver<ResolversTypes['ListingConnection'], { __typename: 'Collection' } & GraphQLRecursivePick<ParentType, {"id":true}>, ContextType, Partial<CollectionProductsArgs>>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export interface DateTimeScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['DateTime'], any> {
  name: 'DateTime';
}

export type FacetResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['Facet'] = ResolversParentTypes['Facet']> = ResolversObject<{
  facetType?: Resolver<ResolversTypes['FacetType'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  label?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  lexoRank?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  scopes?: Resolver<Array<ResolversTypes['FacetScopeType']>, ParentType, ContextType>;
  selectionMode?: Resolver<ResolversTypes['FacetSelectionMode'], ParentType, ContextType>;
  slug?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  sources?: Resolver<Array<ResolversTypes['FacetSource']>, ParentType, ContextType>;
  uiType?: Resolver<ResolversTypes['FacetUIType'], ParentType, ContextType>;
  values?: Resolver<Array<ResolversTypes['FacetValue']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type FacetCreatePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['FacetCreatePayload'] = ResolversParentTypes['FacetCreatePayload']> = ResolversObject<{
  facet?: Resolver<Maybe<ResolversTypes['Facet']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type FacetDeletePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['FacetDeletePayload'] = ResolversParentTypes['FacetDeletePayload']> = ResolversObject<{
  deletedFacetId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type FacetOperationResultResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['FacetOperationResult'] = ResolversParentTypes['FacetOperationResult']> = ResolversObject<{
  applied?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  entityId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  errors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  type?: Resolver<ResolversTypes['FacetOperationType'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type FacetRebalancePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['FacetRebalancePayload'] = ResolversParentTypes['FacetRebalancePayload']> = ResolversObject<{
  facets?: Resolver<Array<ResolversTypes['Facet']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type FacetScopesUpdatePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['FacetScopesUpdatePayload'] = ResolversParentTypes['FacetScopesUpdatePayload']> = ResolversObject<{
  facets?: Resolver<Array<ResolversTypes['Facet']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type FacetSourceResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['FacetSource'] = ResolversParentTypes['FacetSource']> = ResolversObject<{
  handle?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type FacetSourceCandidateResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['FacetSourceCandidate'] = ResolversParentTypes['FacetSourceCandidate']> = ResolversObject<{
  facetType?: Resolver<ResolversTypes['FacetType'], ParentType, ContextType>;
  handle?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  locale?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  name?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type FacetSourceCandidateConnectionResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['FacetSourceCandidateConnection'] = ResolversParentTypes['FacetSourceCandidateConnection']> = ResolversObject<{
  edges?: Resolver<Array<ResolversTypes['FacetSourceCandidateEdge']>, ParentType, ContextType>;
  pageInfo?: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type FacetSourceCandidateEdgeResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['FacetSourceCandidateEdge'] = ResolversParentTypes['FacetSourceCandidateEdge']> = ResolversObject<{
  cursor?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  node?: Resolver<ResolversTypes['FacetSourceCandidate'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type FacetSwatchResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['FacetSwatch'] = ResolversParentTypes['FacetSwatch']> = ResolversObject<{
  __resolveReference?: ReferenceResolver<Maybe<ResolversTypes['FacetSwatch']>, { __typename: 'FacetSwatch' } & GraphQLRecursivePick<ParentType, {"id":true}>, ContextType>;
  colorOne?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  colorTwo?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  file?: Resolver<Maybe<ResolversTypes['File']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  metadata?: Resolver<Maybe<ResolversTypes['JSON']>, ParentType, ContextType>;
  swatchType?: Resolver<ResolversTypes['SwatchType'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type FacetSwatchCreatePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['FacetSwatchCreatePayload'] = ResolversParentTypes['FacetSwatchCreatePayload']> = ResolversObject<{
  facetSwatch?: Resolver<Maybe<ResolversTypes['FacetSwatch']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type FacetSwatchDeletePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['FacetSwatchDeletePayload'] = ResolversParentTypes['FacetSwatchDeletePayload']> = ResolversObject<{
  deletedFacetSwatchId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type FacetSwatchOperationResultResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['FacetSwatchOperationResult'] = ResolversParentTypes['FacetSwatchOperationResult']> = ResolversObject<{
  applied?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  entityId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  errors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  type?: Resolver<ResolversTypes['FacetSwatchOperationType'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type FacetSwatchUpdatePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['FacetSwatchUpdatePayload'] = ResolversParentTypes['FacetSwatchUpdatePayload']> = ResolversObject<{
  facetSwatch?: Resolver<Maybe<ResolversTypes['FacetSwatch']>, ParentType, ContextType>;
  operationResults?: Resolver<Array<ResolversTypes['FacetSwatchOperationResult']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type FacetUpdatePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['FacetUpdatePayload'] = ResolversParentTypes['FacetUpdatePayload']> = ResolversObject<{
  facet?: Resolver<Maybe<ResolversTypes['Facet']>, ParentType, ContextType>;
  operationResults?: Resolver<Array<ResolversTypes['FacetOperationResult']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type FacetValueResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['FacetValue'] = ResolversParentTypes['FacetValue']> = ResolversObject<{
  enabled?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  facet?: Resolver<ResolversTypes['Facet'], ParentType, ContextType>;
  handle?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  kind?: Resolver<ResolversTypes['FacetValueKind'], ParentType, ContextType>;
  label?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  parent?: Resolver<Maybe<ResolversTypes['FacetValue']>, ParentType, ContextType>;
  sortIndex?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  sourceValues?: Resolver<Array<ResolversTypes['FacetValue']>, ParentType, ContextType>;
  swatch?: Resolver<Maybe<ResolversTypes['FacetSwatch']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type FacetValueCandidateResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['FacetValueCandidate'] = ResolversParentTypes['FacetValueCandidate']> = ResolversObject<{
  facetType?: Resolver<ResolversTypes['FacetType'], ParentType, ContextType>;
  handle?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  label?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  sourceHandle?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type FacetValueCandidateConnectionResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['FacetValueCandidateConnection'] = ResolversParentTypes['FacetValueCandidateConnection']> = ResolversObject<{
  edges?: Resolver<Array<ResolversTypes['FacetValueCandidateEdge']>, ParentType, ContextType>;
  pageInfo?: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type FacetValueCandidateEdgeResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['FacetValueCandidateEdge'] = ResolversParentTypes['FacetValueCandidateEdge']> = ResolversObject<{
  cursor?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  node?: Resolver<ResolversTypes['FacetValueCandidate'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type FileResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['File'] = ResolversParentTypes['File']> = ResolversObject<{
  __resolveReference?: ReferenceResolver<Maybe<ResolversTypes['File']>, ParentType, ContextType>;

  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type GenericUserErrorResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['GenericUserError'] = ResolversParentTypes['GenericUserError']> = ResolversObject<{
  code?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  field?: Resolver<Maybe<Array<ResolversTypes['String']>>, ParentType, ContextType>;
  message?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export interface JsonScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['JSON'], any> {
  name: 'JSON';
}

export type ListingResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['Listing'] = ResolversParentTypes['Listing']> = ResolversObject<{
  __resolveType: TypeResolveFn<'Product', ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
}>;

export type ListingConnectionResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ListingConnection'] = ResolversParentTypes['ListingConnection']> = ResolversObject<{
  edges?: Resolver<Array<ResolversTypes['ListingEdge']>, ParentType, ContextType>;
  facets?: Resolver<Array<ResolversTypes['ListingFacet']>, ParentType, ContextType>;
  pageInfo?: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ListingEdgeResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ListingEdge'] = ResolversParentTypes['ListingEdge']> = ResolversObject<{
  cursor?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  node?: Resolver<ResolversTypes['Listing'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ListingFacetResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ListingFacet'] = ResolversParentTypes['ListingFacet']> = ResolversObject<{
  id?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  label?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  type?: Resolver<ResolversTypes['ListingFacetType'], ParentType, ContextType>;
  uiType?: Resolver<ResolversTypes['FacetUIType'], ParentType, ContextType>;
  values?: Resolver<Array<ResolversTypes['ListingFacetValue']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ListingFacetValueResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ListingFacetValue'] = ResolversParentTypes['ListingFacetValue']> = ResolversObject<{
  count?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  input?: Resolver<ResolversTypes['JSON'], ParentType, ContextType>;
  label?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  selected?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  swatch?: Resolver<Maybe<ResolversTypes['FacetSwatch']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ListingMutationResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ListingMutation'] = ResolversParentTypes['ListingMutation']> = ResolversObject<{
  facetCreate?: Resolver<ResolversTypes['FacetCreatePayload'], ParentType, ContextType, RequireFields<ListingMutationFacetCreateArgs, 'input'>>;
  facetDelete?: Resolver<ResolversTypes['FacetDeletePayload'], ParentType, ContextType, RequireFields<ListingMutationFacetDeleteArgs, 'facetId'>>;
  facetRebalance?: Resolver<ResolversTypes['FacetRebalancePayload'], ParentType, ContextType, RequireFields<ListingMutationFacetRebalanceArgs, 'confirm'>>;
  facetScopesUpdate?: Resolver<ResolversTypes['FacetScopesUpdatePayload'], ParentType, ContextType, RequireFields<ListingMutationFacetScopesUpdateArgs, 'input'>>;
  facetSwatchCreate?: Resolver<ResolversTypes['FacetSwatchCreatePayload'], ParentType, ContextType, RequireFields<ListingMutationFacetSwatchCreateArgs, 'input'>>;
  facetSwatchDelete?: Resolver<ResolversTypes['FacetSwatchDeletePayload'], ParentType, ContextType, RequireFields<ListingMutationFacetSwatchDeleteArgs, 'facetSwatchId'>>;
  facetSwatchUpdate?: Resolver<ResolversTypes['FacetSwatchUpdatePayload'], ParentType, ContextType, RequireFields<ListingMutationFacetSwatchUpdateArgs, 'facetSwatchId' | 'operations'>>;
  facetUpdate?: Resolver<ResolversTypes['FacetUpdatePayload'], ParentType, ContextType, RequireFields<ListingMutationFacetUpdateArgs, 'facetId' | 'operations'>>;
  manualProductRecommendationCreate?: Resolver<ResolversTypes['ManualProductRecommendationCreatePayload'], ParentType, ContextType, RequireFields<ListingMutationManualProductRecommendationCreateArgs, 'input'>>;
  manualProductRecommendationDelete?: Resolver<ResolversTypes['ManualProductRecommendationDeletePayload'], ParentType, ContextType, RequireFields<ListingMutationManualProductRecommendationDeleteArgs, 'manualProductRecommendationId'>>;
  manualProductRecommendationUpdate?: Resolver<ResolversTypes['ManualProductRecommendationUpdatePayload'], ParentType, ContextType, RequireFields<ListingMutationManualProductRecommendationUpdateArgs, 'manualProductRecommendationId' | 'operations'>>;
  recommendationPlacementPolicyCreate?: Resolver<ResolversTypes['RecommendationPlacementPolicyCreatePayload'], ParentType, ContextType, RequireFields<ListingMutationRecommendationPlacementPolicyCreateArgs, 'input'>>;
  recommendationPlacementPolicyUpdate?: Resolver<ResolversTypes['RecommendationPlacementPolicyUpdatePayload'], ParentType, ContextType, RequireFields<ListingMutationRecommendationPlacementPolicyUpdateArgs, 'operations' | 'recommendationPlacementPolicyId'>>;
  search?: Resolver<ResolversTypes['ListingSearchMutation'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ListingQueryResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ListingQuery'] = ResolversParentTypes['ListingQuery']> = ResolversObject<{
  facet?: Resolver<Maybe<ResolversTypes['Facet']>, ParentType, ContextType, RequireFields<ListingQueryFacetArgs, 'id'>>;
  facetSourceCandidates?: Resolver<ResolversTypes['FacetSourceCandidateConnection'], ParentType, ContextType, Partial<ListingQueryFacetSourceCandidatesArgs>>;
  facetSwatch?: Resolver<Maybe<ResolversTypes['FacetSwatch']>, ParentType, ContextType, RequireFields<ListingQueryFacetSwatchArgs, 'id'>>;
  facetSwatches?: Resolver<Array<ResolversTypes['FacetSwatch']>, ParentType, ContextType>;
  facetValue?: Resolver<Maybe<ResolversTypes['FacetValue']>, ParentType, ContextType, RequireFields<ListingQueryFacetValueArgs, 'id'>>;
  facetValueCandidates?: Resolver<ResolversTypes['FacetValueCandidateConnection'], ParentType, ContextType, RequireFields<ListingQueryFacetValueCandidatesArgs, 'meta'>>;
  facetValues?: Resolver<Array<ResolversTypes['FacetValue']>, ParentType, ContextType, RequireFields<ListingQueryFacetValuesArgs, 'facetId'>>;
  facets?: Resolver<Array<ResolversTypes['Facet']>, ParentType, ContextType>;
  listing?: Resolver<ResolversTypes['ListingConnection'], ParentType, ContextType, Partial<ListingQueryListingArgs>>;
  manualProductRecommendations?: Resolver<ResolversTypes['ManualProductRecommendationConnection'], ParentType, ContextType, RequireFields<ListingQueryManualProductRecommendationsArgs, 'anchorProductId' | 'first' | 'placement'>>;
  node?: Resolver<Maybe<ResolversTypes['Node']>, ParentType, ContextType, RequireFields<ListingQueryNodeArgs, 'id'>>;
  nodes?: Resolver<Array<Maybe<ResolversTypes['Node']>>, ParentType, ContextType, RequireFields<ListingQueryNodesArgs, 'ids'>>;
  recommendationPlacementPolicies?: Resolver<Array<ResolversTypes['RecommendationPlacementPolicy']>, ParentType, ContextType>;
  recommendationPlacementPolicy?: Resolver<Maybe<ResolversTypes['RecommendationPlacementPolicy']>, ParentType, ContextType, RequireFields<ListingQueryRecommendationPlacementPolicyArgs, 'placement'>>;
  recommendationSnapshotPreview?: Resolver<ResolversTypes['RecommendationSnapshotPreviewPayload'], ParentType, ContextType, RequireFields<ListingQueryRecommendationSnapshotPreviewArgs, 'input'>>;
  search?: Resolver<ResolversTypes['ListingSearchQuery'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ListingSearchMutationResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ListingSearchMutation'] = ResolversParentTypes['ListingSearchMutation']> = ResolversObject<{
  productBoostCreate?: Resolver<ResolversTypes['SearchProductBoostCreatePayload'], ParentType, ContextType, RequireFields<ListingSearchMutationProductBoostCreateArgs, 'input'>>;
  productBoostDelete?: Resolver<ResolversTypes['SearchProductBoostDeletePayload'], ParentType, ContextType, RequireFields<ListingSearchMutationProductBoostDeleteArgs, 'productBoostId'>>;
  productBoostUpdate?: Resolver<ResolversTypes['SearchProductBoostUpdatePayload'], ParentType, ContextType, RequireFields<ListingSearchMutationProductBoostUpdateArgs, 'operations' | 'productBoostId'>>;
  settingsUpdate?: Resolver<ResolversTypes['SearchSettingsUpdatePayload'], ParentType, ContextType, RequireFields<ListingSearchMutationSettingsUpdateArgs, 'operations' | 'searchSettingsId'>>;
  synonymGroupCreate?: Resolver<ResolversTypes['SearchSynonymGroupCreatePayload'], ParentType, ContextType, RequireFields<ListingSearchMutationSynonymGroupCreateArgs, 'input'>>;
  synonymGroupDelete?: Resolver<ResolversTypes['SearchSynonymGroupDeletePayload'], ParentType, ContextType, RequireFields<ListingSearchMutationSynonymGroupDeleteArgs, 'synonymGroupId'>>;
  synonymGroupUpdate?: Resolver<ResolversTypes['SearchSynonymGroupUpdatePayload'], ParentType, ContextType, RequireFields<ListingSearchMutationSynonymGroupUpdateArgs, 'operations' | 'synonymGroupId'>>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ListingSearchQueryResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ListingSearchQuery'] = ResolversParentTypes['ListingSearchQuery']> = ResolversObject<{
  explain?: Resolver<ResolversTypes['SearchExplain'], ParentType, ContextType, RequireFields<ListingSearchQueryExplainArgs, 'locale' | 'query'>>;
  productBoost?: Resolver<Maybe<ResolversTypes['SearchProductBoost']>, ParentType, ContextType, RequireFields<ListingSearchQueryProductBoostArgs, 'id'>>;
  productBoosts?: Resolver<ResolversTypes['SearchProductBoostConnection'], ParentType, ContextType, Partial<ListingSearchQueryProductBoostsArgs>>;
  settings?: Resolver<Maybe<ResolversTypes['SearchSettings']>, ParentType, ContextType>;
  synonymGroup?: Resolver<Maybe<ResolversTypes['SearchSynonymGroup']>, ParentType, ContextType, RequireFields<ListingSearchQuerySynonymGroupArgs, 'id'>>;
  synonymGroups?: Resolver<ResolversTypes['SearchSynonymGroupConnection'], ParentType, ContextType, Partial<ListingSearchQuerySynonymGroupsArgs>>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ManualProductRecommendationResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ManualProductRecommendation'] = ResolversParentTypes['ManualProductRecommendation']> = ResolversObject<{
  action?: Resolver<ResolversTypes['ManualRecommendationAction'], ParentType, ContextType>;
  anchorProduct?: Resolver<ResolversTypes['Product'], ParentType, ContextType>;
  anchorReferenceStatus?: Resolver<ResolversTypes['RecommendationReferenceStatus'], ParentType, ContextType>;
  boost?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  enabled?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  endsAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  placement?: Resolver<ResolversTypes['RecommendationPlacement'], ParentType, ContextType>;
  position?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  startsAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  targetProduct?: Resolver<ResolversTypes['Product'], ParentType, ContextType>;
  targetReferenceStatus?: Resolver<ResolversTypes['RecommendationReferenceStatus'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ManualProductRecommendationConnectionResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ManualProductRecommendationConnection'] = ResolversParentTypes['ManualProductRecommendationConnection']> = ResolversObject<{
  edges?: Resolver<Array<ResolversTypes['ManualProductRecommendationEdge']>, ParentType, ContextType>;
  pageInfo?: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ManualProductRecommendationCreatePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ManualProductRecommendationCreatePayload'] = ResolversParentTypes['ManualProductRecommendationCreatePayload']> = ResolversObject<{
  recommendation?: Resolver<Maybe<ResolversTypes['ManualProductRecommendation']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ManualProductRecommendationDeletePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ManualProductRecommendationDeletePayload'] = ResolversParentTypes['ManualProductRecommendationDeletePayload']> = ResolversObject<{
  deletedId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ManualProductRecommendationEdgeResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ManualProductRecommendationEdge'] = ResolversParentTypes['ManualProductRecommendationEdge']> = ResolversObject<{
  cursor?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  node?: Resolver<ResolversTypes['ManualProductRecommendation'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ManualProductRecommendationOperationResultResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ManualProductRecommendationOperationResult'] = ResolversParentTypes['ManualProductRecommendationOperationResult']> = ResolversObject<{
  applied?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  entityId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  errors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  type?: Resolver<ResolversTypes['ManualProductRecommendationOperationType'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ManualProductRecommendationUpdatePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ManualProductRecommendationUpdatePayload'] = ResolversParentTypes['ManualProductRecommendationUpdatePayload']> = ResolversObject<{
  operationResults?: Resolver<Array<ResolversTypes['ManualProductRecommendationOperationResult']>, ParentType, ContextType>;
  recommendation?: Resolver<Maybe<ResolversTypes['ManualProductRecommendation']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type MutationResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['Mutation'] = ResolversParentTypes['Mutation']> = ResolversObject<{
  listingMutation?: Resolver<ResolversTypes['ListingMutation'], ParentType, ContextType>;
}>;

export type NodeResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['Node'] = ResolversParentTypes['Node']> = ResolversObject<{
  __resolveType: TypeResolveFn<'Facet' | 'FacetSwatch' | 'FacetValue' | 'ManualProductRecommendation' | 'Product' | 'RecommendationPlacementPolicy' | 'SearchProductBoost' | 'SearchSynonymGroup', ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
}>;

export type PageInfoResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['PageInfo'] = ResolversParentTypes['PageInfo']> = ResolversObject<{
  endCursor?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  hasNextPage?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  hasPreviousPage?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  startCursor?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ProductResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['Product'] = ResolversParentTypes['Product']> = ResolversObject<{
  __resolveReference?: ReferenceResolver<Maybe<ResolversTypes['Product']>, ParentType, ContextType>;

  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type QueryResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['Query'] = ResolversParentTypes['Query']> = ResolversObject<{
  listingQuery?: Resolver<ResolversTypes['ListingQuery'], ParentType, ContextType>;
}>;

export type RecommendationPlacementPolicyResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['RecommendationPlacementPolicy'] = ResolversParentTypes['RecommendationPlacementPolicy']> = ResolversObject<{
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  enabled?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  fallbackChain?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  maximumResults?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  minimumResults?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  placement?: Resolver<ResolversTypes['RecommendationPlacement'], ParentType, ContextType>;
  strategy?: Resolver<ResolversTypes['RecommendationStrategy'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type RecommendationPlacementPolicyCreatePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['RecommendationPlacementPolicyCreatePayload'] = ResolversParentTypes['RecommendationPlacementPolicyCreatePayload']> = ResolversObject<{
  policy?: Resolver<Maybe<ResolversTypes['RecommendationPlacementPolicy']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type RecommendationPlacementPolicyOperationResultResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['RecommendationPlacementPolicyOperationResult'] = ResolversParentTypes['RecommendationPlacementPolicyOperationResult']> = ResolversObject<{
  applied?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  entityId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  errors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  type?: Resolver<ResolversTypes['RecommendationPlacementPolicyOperationType'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type RecommendationPlacementPolicyUpdatePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['RecommendationPlacementPolicyUpdatePayload'] = ResolversParentTypes['RecommendationPlacementPolicyUpdatePayload']> = ResolversObject<{
  operationResults?: Resolver<Array<ResolversTypes['RecommendationPlacementPolicyOperationResult']>, ParentType, ContextType>;
  policy?: Resolver<Maybe<ResolversTypes['RecommendationPlacementPolicy']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type RecommendationPreviewCandidateResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['RecommendationPreviewCandidate'] = ResolversParentTypes['RecommendationPreviewCandidate']> = ResolversObject<{
  product?: Resolver<ResolversTypes['Product'], ParentType, ContextType>;
  rank?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  score?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  source?: Resolver<ResolversTypes['ProductRecommendationSource'], ParentType, ContextType>;
  sourceBreakdown?: Resolver<ResolversTypes['RecommendationPreviewSourceBreakdown'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type RecommendationPreviewExcludedCandidateResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['RecommendationPreviewExcludedCandidate'] = ResolversParentTypes['RecommendationPreviewExcludedCandidate']> = ResolversObject<{
  product?: Resolver<ResolversTypes['Product'], ParentType, ContextType>;
  reason?: Resolver<ResolversTypes['RecommendationPreviewExcludedReason'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type RecommendationPreviewResultResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['RecommendationPreviewResult'] = ResolversParentTypes['RecommendationPreviewResult']> = ResolversObject<{
  asOf?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  candidates?: Resolver<Array<ResolversTypes['RecommendationPreviewCandidate']>, ParentType, ContextType>;
  excluded?: Resolver<Array<ResolversTypes['RecommendationPreviewExcludedCandidate']>, ParentType, ContextType>;
  modelVersion?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type RecommendationPreviewSourceBreakdownResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['RecommendationPreviewSourceBreakdown'] = ResolversParentTypes['RecommendationPreviewSourceBreakdown']> = ResolversObject<{
  categoryPopularityScore?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  fbtRunId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  fbtSourceScore?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  manualAction?: Resolver<Maybe<ResolversTypes['ManualRecommendationAction']>, ParentType, ContextType>;
  manualBoost?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  manualPosition?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  storePopularityScore?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type RecommendationSnapshotPreviewPayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['RecommendationSnapshotPreviewPayload'] = ResolversParentTypes['RecommendationSnapshotPreviewPayload']> = ResolversObject<{
  active?: Resolver<Maybe<ResolversTypes['RecommendationPreviewResult']>, ParentType, ContextType>;
  draft?: Resolver<Maybe<ResolversTypes['RecommendationPreviewResult']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type SearchExplainResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['SearchExplain'] = ResolversParentTypes['SearchExplain']> = ResolversObject<{
  applicableProductBoostIds?: Resolver<Array<ResolversTypes['ID']>, ParentType, ContextType>;
  boostOnlyCandidateCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  candidateCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  locale?: Resolver<ResolversTypes['LocaleCode'], ParentType, ContextType>;
  matchedSynonymGroupIds?: Resolver<Array<ResolversTypes['ID']>, ParentType, ContextType>;
  membershipSerializedBytes?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  mode?: Resolver<ResolversTypes['SearchExecutionMode'], ParentType, ContextType>;
  normalizationContractVersion?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  normalizationProfileHash?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  normalizedQuery?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  originalQuery?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  planFingerprint?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  reasons?: Resolver<Array<ResolversTypes['SearchExplainReason']>, ParentType, ContextType>;
  settings?: Resolver<ResolversTypes['SearchExplainSettings'], ParentType, ContextType>;
  units?: Resolver<Array<ResolversTypes['SearchExplainUnit']>, ParentType, ContextType>;
  wholeQueryClauses?: Resolver<Array<ResolversTypes['SearchExplainClause']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type SearchExplainClauseResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['SearchExplainClause'] = ResolversParentTypes['SearchExplainClause']> = ResolversObject<{
  alternatives?: Resolver<Array<ResolversTypes['SearchExplainClause']>, ParentType, ContextType>;
  fields?: Resolver<Array<ResolversTypes['SearchField']>, ParentType, ContextType>;
  kind?: Resolver<ResolversTypes['SearchExplainClauseKind'], ParentType, ContextType>;
  lexemes?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  requireSameElement?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  synonymGroupId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  value?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type SearchExplainFieldWeightResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['SearchExplainFieldWeight'] = ResolversParentTypes['SearchExplainFieldWeight']> = ResolversObject<{
  field?: Resolver<ResolversTypes['SearchField'], ParentType, ContextType>;
  weight?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type SearchExplainSettingsResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['SearchExplainSettings'] = ResolversParentTypes['SearchExplainSettings']> = ResolversObject<{
  enabledFields?: Resolver<Array<ResolversTypes['SearchField']>, ParentType, ContextType>;
  fieldWeights?: Resolver<Array<ResolversTypes['SearchExplainFieldWeight']>, ParentType, ContextType>;
  outOfStockPolicy?: Resolver<ResolversTypes['SearchOutOfStockPolicy'], ParentType, ContextType>;
  typoToleranceEnabled?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type SearchExplainTypoAlternativeResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['SearchExplainTypoAlternative'] = ResolversParentTypes['SearchExplainTypoAlternative']> = ResolversObject<{
  editDistance?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  lexemes?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  trigramSimilarity?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  value?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type SearchExplainUnitResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['SearchExplainUnit'] = ResolversParentTypes['SearchExplainUnit']> = ResolversObject<{
  clauses?: Resolver<Array<ResolversTypes['SearchExplainClause']>, ParentType, ContextType>;
  kind?: Resolver<ResolversTypes['SearchLexicalUnitKind'], ParentType, ContextType>;
  lexemes?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  normalized?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  planUnitIndex?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  removedAsStopword?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  source?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  typoAlternatives?: Resolver<Array<ResolversTypes['SearchExplainTypoAlternative']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type SearchFieldConfigurationResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['SearchFieldConfiguration'] = ResolversParentTypes['SearchFieldConfiguration']> = ResolversObject<{
  field?: Resolver<ResolversTypes['SearchField'], ParentType, ContextType>;
  weight?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type SearchProductBoostResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['SearchProductBoost'] = ResolversParentTypes['SearchProductBoost']> = ResolversObject<{
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  enabled?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  locale?: Resolver<ResolversTypes['LocaleCode'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  phrases?: Resolver<Array<ResolversTypes['SearchProductBoostPhrase']>, ParentType, ContextType>;
  phrasesCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  products?: Resolver<Array<ResolversTypes['Product']>, ParentType, ContextType>;
  productsCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type SearchProductBoostConnectionResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['SearchProductBoostConnection'] = ResolversParentTypes['SearchProductBoostConnection']> = ResolversObject<{
  edges?: Resolver<Array<ResolversTypes['SearchProductBoostEdge']>, ParentType, ContextType>;
  pageInfo?: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type SearchProductBoostCreatePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['SearchProductBoostCreatePayload'] = ResolversParentTypes['SearchProductBoostCreatePayload']> = ResolversObject<{
  productBoost?: Resolver<Maybe<ResolversTypes['SearchProductBoost']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type SearchProductBoostDeletePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['SearchProductBoostDeletePayload'] = ResolversParentTypes['SearchProductBoostDeletePayload']> = ResolversObject<{
  deletedProductBoostId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type SearchProductBoostEdgeResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['SearchProductBoostEdge'] = ResolversParentTypes['SearchProductBoostEdge']> = ResolversObject<{
  cursor?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  node?: Resolver<ResolversTypes['SearchProductBoost'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type SearchProductBoostOperationResultResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['SearchProductBoostOperationResult'] = ResolversParentTypes['SearchProductBoostOperationResult']> = ResolversObject<{
  applied?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  entityId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  errors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  type?: Resolver<ResolversTypes['SearchProductBoostOperationType'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type SearchProductBoostPhraseResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['SearchProductBoostPhrase'] = ResolversParentTypes['SearchProductBoostPhrase']> = ResolversObject<{
  phrase?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  position?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type SearchProductBoostUpdatePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['SearchProductBoostUpdatePayload'] = ResolversParentTypes['SearchProductBoostUpdatePayload']> = ResolversObject<{
  operationResults?: Resolver<Array<ResolversTypes['SearchProductBoostOperationResult']>, ParentType, ContextType>;
  productBoost?: Resolver<Maybe<ResolversTypes['SearchProductBoost']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type SearchSettingsResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['SearchSettings'] = ResolversParentTypes['SearchSettings']> = ResolversObject<{
  fields?: Resolver<Array<ResolversTypes['SearchFieldConfiguration']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  outOfStockPolicy?: Resolver<ResolversTypes['SearchOutOfStockPolicy'], ParentType, ContextType>;
  typoToleranceEnabled?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type SearchSettingsOperationResultResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['SearchSettingsOperationResult'] = ResolversParentTypes['SearchSettingsOperationResult']> = ResolversObject<{
  applied?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  entityId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  errors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  type?: Resolver<ResolversTypes['SearchSettingsOperationType'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type SearchSettingsUpdatePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['SearchSettingsUpdatePayload'] = ResolversParentTypes['SearchSettingsUpdatePayload']> = ResolversObject<{
  operationResults?: Resolver<Array<ResolversTypes['SearchSettingsOperationResult']>, ParentType, ContextType>;
  settings?: Resolver<Maybe<ResolversTypes['SearchSettings']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type SearchSynonymGroupResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['SearchSynonymGroup'] = ResolversParentTypes['SearchSynonymGroup']> = ResolversObject<{
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  enabled?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  locale?: Resolver<ResolversTypes['LocaleCode'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  values?: Resolver<Array<ResolversTypes['SearchSynonymValue']>, ParentType, ContextType>;
  valuesCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type SearchSynonymGroupConnectionResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['SearchSynonymGroupConnection'] = ResolversParentTypes['SearchSynonymGroupConnection']> = ResolversObject<{
  edges?: Resolver<Array<ResolversTypes['SearchSynonymGroupEdge']>, ParentType, ContextType>;
  pageInfo?: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type SearchSynonymGroupCreatePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['SearchSynonymGroupCreatePayload'] = ResolversParentTypes['SearchSynonymGroupCreatePayload']> = ResolversObject<{
  synonymGroup?: Resolver<Maybe<ResolversTypes['SearchSynonymGroup']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type SearchSynonymGroupDeletePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['SearchSynonymGroupDeletePayload'] = ResolversParentTypes['SearchSynonymGroupDeletePayload']> = ResolversObject<{
  deletedSynonymGroupId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type SearchSynonymGroupEdgeResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['SearchSynonymGroupEdge'] = ResolversParentTypes['SearchSynonymGroupEdge']> = ResolversObject<{
  cursor?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  node?: Resolver<ResolversTypes['SearchSynonymGroup'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type SearchSynonymGroupOperationResultResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['SearchSynonymGroupOperationResult'] = ResolversParentTypes['SearchSynonymGroupOperationResult']> = ResolversObject<{
  applied?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  entityId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  errors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  type?: Resolver<ResolversTypes['SearchSynonymGroupOperationType'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type SearchSynonymGroupUpdatePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['SearchSynonymGroupUpdatePayload'] = ResolversParentTypes['SearchSynonymGroupUpdatePayload']> = ResolversObject<{
  operationResults?: Resolver<Array<ResolversTypes['SearchSynonymGroupOperationResult']>, ParentType, ContextType>;
  synonymGroup?: Resolver<Maybe<ResolversTypes['SearchSynonymGroup']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type SearchSynonymValueResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['SearchSynonymValue'] = ResolversParentTypes['SearchSynonymValue']> = ResolversObject<{
  position?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  value?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type UserErrorResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['UserError'] = ResolversParentTypes['UserError']> = ResolversObject<{
  __resolveType: TypeResolveFn<'GenericUserError', ParentType, ContextType>;
  code?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  field?: Resolver<Maybe<Array<ResolversTypes['String']>>, ParentType, ContextType>;
  message?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
}>;

export type Resolvers<ContextType = ServiceContext> = ResolversObject<{
  BigInt?: GraphQLScalarType;
  Collection?: CollectionResolvers<ContextType>;
  DateTime?: GraphQLScalarType;
  Facet?: FacetResolvers<ContextType>;
  FacetCreatePayload?: FacetCreatePayloadResolvers<ContextType>;
  FacetDeletePayload?: FacetDeletePayloadResolvers<ContextType>;
  FacetOperationResult?: FacetOperationResultResolvers<ContextType>;
  FacetRebalancePayload?: FacetRebalancePayloadResolvers<ContextType>;
  FacetScopesUpdatePayload?: FacetScopesUpdatePayloadResolvers<ContextType>;
  FacetSource?: FacetSourceResolvers<ContextType>;
  FacetSourceCandidate?: FacetSourceCandidateResolvers<ContextType>;
  FacetSourceCandidateConnection?: FacetSourceCandidateConnectionResolvers<ContextType>;
  FacetSourceCandidateEdge?: FacetSourceCandidateEdgeResolvers<ContextType>;
  FacetSwatch?: FacetSwatchResolvers<ContextType>;
  FacetSwatchCreatePayload?: FacetSwatchCreatePayloadResolvers<ContextType>;
  FacetSwatchDeletePayload?: FacetSwatchDeletePayloadResolvers<ContextType>;
  FacetSwatchOperationResult?: FacetSwatchOperationResultResolvers<ContextType>;
  FacetSwatchUpdatePayload?: FacetSwatchUpdatePayloadResolvers<ContextType>;
  FacetUpdatePayload?: FacetUpdatePayloadResolvers<ContextType>;
  FacetValue?: FacetValueResolvers<ContextType>;
  FacetValueCandidate?: FacetValueCandidateResolvers<ContextType>;
  FacetValueCandidateConnection?: FacetValueCandidateConnectionResolvers<ContextType>;
  FacetValueCandidateEdge?: FacetValueCandidateEdgeResolvers<ContextType>;
  File?: FileResolvers<ContextType>;
  GenericUserError?: GenericUserErrorResolvers<ContextType>;
  JSON?: GraphQLScalarType;
  Listing?: ListingResolvers<ContextType>;
  ListingConnection?: ListingConnectionResolvers<ContextType>;
  ListingEdge?: ListingEdgeResolvers<ContextType>;
  ListingFacet?: ListingFacetResolvers<ContextType>;
  ListingFacetValue?: ListingFacetValueResolvers<ContextType>;
  ListingMutation?: ListingMutationResolvers<ContextType>;
  ListingQuery?: ListingQueryResolvers<ContextType>;
  ListingSearchMutation?: ListingSearchMutationResolvers<ContextType>;
  ListingSearchQuery?: ListingSearchQueryResolvers<ContextType>;
  ManualProductRecommendation?: ManualProductRecommendationResolvers<ContextType>;
  ManualProductRecommendationConnection?: ManualProductRecommendationConnectionResolvers<ContextType>;
  ManualProductRecommendationCreatePayload?: ManualProductRecommendationCreatePayloadResolvers<ContextType>;
  ManualProductRecommendationDeletePayload?: ManualProductRecommendationDeletePayloadResolvers<ContextType>;
  ManualProductRecommendationEdge?: ManualProductRecommendationEdgeResolvers<ContextType>;
  ManualProductRecommendationOperationResult?: ManualProductRecommendationOperationResultResolvers<ContextType>;
  ManualProductRecommendationUpdatePayload?: ManualProductRecommendationUpdatePayloadResolvers<ContextType>;
  Mutation?: MutationResolvers<ContextType>;
  Node?: NodeResolvers<ContextType>;
  PageInfo?: PageInfoResolvers<ContextType>;
  Product?: ProductResolvers<ContextType>;
  Query?: QueryResolvers<ContextType>;
  RecommendationPlacementPolicy?: RecommendationPlacementPolicyResolvers<ContextType>;
  RecommendationPlacementPolicyCreatePayload?: RecommendationPlacementPolicyCreatePayloadResolvers<ContextType>;
  RecommendationPlacementPolicyOperationResult?: RecommendationPlacementPolicyOperationResultResolvers<ContextType>;
  RecommendationPlacementPolicyUpdatePayload?: RecommendationPlacementPolicyUpdatePayloadResolvers<ContextType>;
  RecommendationPreviewCandidate?: RecommendationPreviewCandidateResolvers<ContextType>;
  RecommendationPreviewExcludedCandidate?: RecommendationPreviewExcludedCandidateResolvers<ContextType>;
  RecommendationPreviewResult?: RecommendationPreviewResultResolvers<ContextType>;
  RecommendationPreviewSourceBreakdown?: RecommendationPreviewSourceBreakdownResolvers<ContextType>;
  RecommendationSnapshotPreviewPayload?: RecommendationSnapshotPreviewPayloadResolvers<ContextType>;
  SearchExplain?: SearchExplainResolvers<ContextType>;
  SearchExplainClause?: SearchExplainClauseResolvers<ContextType>;
  SearchExplainFieldWeight?: SearchExplainFieldWeightResolvers<ContextType>;
  SearchExplainSettings?: SearchExplainSettingsResolvers<ContextType>;
  SearchExplainTypoAlternative?: SearchExplainTypoAlternativeResolvers<ContextType>;
  SearchExplainUnit?: SearchExplainUnitResolvers<ContextType>;
  SearchFieldConfiguration?: SearchFieldConfigurationResolvers<ContextType>;
  SearchProductBoost?: SearchProductBoostResolvers<ContextType>;
  SearchProductBoostConnection?: SearchProductBoostConnectionResolvers<ContextType>;
  SearchProductBoostCreatePayload?: SearchProductBoostCreatePayloadResolvers<ContextType>;
  SearchProductBoostDeletePayload?: SearchProductBoostDeletePayloadResolvers<ContextType>;
  SearchProductBoostEdge?: SearchProductBoostEdgeResolvers<ContextType>;
  SearchProductBoostOperationResult?: SearchProductBoostOperationResultResolvers<ContextType>;
  SearchProductBoostPhrase?: SearchProductBoostPhraseResolvers<ContextType>;
  SearchProductBoostUpdatePayload?: SearchProductBoostUpdatePayloadResolvers<ContextType>;
  SearchSettings?: SearchSettingsResolvers<ContextType>;
  SearchSettingsOperationResult?: SearchSettingsOperationResultResolvers<ContextType>;
  SearchSettingsUpdatePayload?: SearchSettingsUpdatePayloadResolvers<ContextType>;
  SearchSynonymGroup?: SearchSynonymGroupResolvers<ContextType>;
  SearchSynonymGroupConnection?: SearchSynonymGroupConnectionResolvers<ContextType>;
  SearchSynonymGroupCreatePayload?: SearchSynonymGroupCreatePayloadResolvers<ContextType>;
  SearchSynonymGroupDeletePayload?: SearchSynonymGroupDeletePayloadResolvers<ContextType>;
  SearchSynonymGroupEdge?: SearchSynonymGroupEdgeResolvers<ContextType>;
  SearchSynonymGroupOperationResult?: SearchSynonymGroupOperationResultResolvers<ContextType>;
  SearchSynonymGroupUpdatePayload?: SearchSynonymGroupUpdatePayloadResolvers<ContextType>;
  SearchSynonymValue?: SearchSynonymValueResolvers<ContextType>;
  UserError?: UserErrorResolvers<ContextType>;
}>;

