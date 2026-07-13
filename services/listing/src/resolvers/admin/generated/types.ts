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
  Email: { input: string; output: string; }
  JSON: { input: Record<string, unknown>; output: Record<string, unknown>; }
  _FieldSet: { input: any; output: any; }
};

export type Bundle = Listing & Node & {
  __typename?: 'Bundle';
  /** The Bundle global ID owned by Catalog. */
  id: Scalars['ID']['output'];
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
  selectionMode: FacetSelectionMode;
  slug: Scalars['String']['output'];
  sources: Array<FacetSource>;
  uiType: FacetUiType;
  values: Array<FacetValue>;
};

export type FacetCreateInput = {
  facetType: FacetType;
  label: Scalars['String']['input'];
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

export type FacetDeleteInput = {
  id: Scalars['ID']['input'];
};

export type FacetDeletePayload = {
  __typename?: 'FacetDeletePayload';
  deletedFacetId: Maybe<Scalars['ID']['output']>;
  userErrors: Array<GenericUserError>;
};

export type FacetMoveInput = {
  afterFacetId?: InputMaybe<Scalars['ID']['input']>;
  beforeFacetId?: InputMaybe<Scalars['ID']['input']>;
  id: Scalars['ID']['input'];
};

export type FacetMovePayload = {
  __typename?: 'FacetMovePayload';
  facet: Maybe<Facet>;
  userErrors: Array<GenericUserError>;
};

export type FacetRebalanceInput = {
  confirm?: InputMaybe<Scalars['Boolean']['input']>;
};

export type FacetRebalancePayload = {
  __typename?: 'FacetRebalancePayload';
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

export type FacetSwatchDeleteInput = {
  id: Scalars['ID']['input'];
};

export type FacetSwatchDeletePayload = {
  __typename?: 'FacetSwatchDeletePayload';
  deletedFacetSwatchId: Maybe<Scalars['ID']['output']>;
  userErrors: Array<GenericUserError>;
};

export type FacetSwatchUpdateInput = {
  colorOne?: InputMaybe<Scalars['String']['input']>;
  colorTwo?: InputMaybe<Scalars['String']['input']>;
  fileId?: InputMaybe<Scalars['ID']['input']>;
  id: Scalars['ID']['input'];
  metadata?: InputMaybe<Scalars['JSON']['input']>;
  swatchType?: InputMaybe<SwatchType>;
};

export type FacetSwatchUpdatePayload = {
  __typename?: 'FacetSwatchUpdatePayload';
  facetSwatch: Maybe<FacetSwatch>;
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
  id: Scalars['ID']['input'];
  label?: InputMaybe<Scalars['String']['input']>;
  selectionMode?: InputMaybe<FacetSelectionMode>;
  slug?: InputMaybe<Scalars['String']['input']>;
  uiType?: InputMaybe<FacetUiType>;
};

export type FacetUpdatePayload = {
  __typename?: 'FacetUpdatePayload';
  facet: Maybe<Facet>;
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

export type FacetValueCreateInput = {
  enabled?: InputMaybe<Scalars['Boolean']['input']>;
  facetId: Scalars['ID']['input'];
  handle: Scalars['String']['input'];
  kind?: InputMaybe<FacetValueKind>;
  label: Scalars['String']['input'];
  sortIndex?: InputMaybe<Scalars['Int']['input']>;
  sourceValueIds?: InputMaybe<Array<Scalars['ID']['input']>>;
  swatchId?: InputMaybe<Scalars['ID']['input']>;
};

export type FacetValueCreatePayload = {
  __typename?: 'FacetValueCreatePayload';
  facetValue: Maybe<FacetValue>;
  userErrors: Array<GenericUserError>;
};

export type FacetValueDeleteInput = {
  id: Scalars['ID']['input'];
};

export type FacetValueDeletePayload = {
  __typename?: 'FacetValueDeletePayload';
  deletedFacetValueId: Maybe<Scalars['ID']['output']>;
  userErrors: Array<GenericUserError>;
};

export enum FacetValueKind {
  Group = 'GROUP',
  Source = 'SOURCE'
}

export type FacetValueMergeInput = {
  facetId: Scalars['ID']['input'];
  sourceValueIds: Array<Scalars['ID']['input']>;
  targetGroupValueId?: InputMaybe<Scalars['ID']['input']>;
  targetHandle?: InputMaybe<Scalars['String']['input']>;
  targetLabel?: InputMaybe<Scalars['String']['input']>;
};

export type FacetValueMergePayload = {
  __typename?: 'FacetValueMergePayload';
  facetValue: Maybe<FacetValue>;
  sourceValues: Array<FacetValue>;
  userErrors: Array<GenericUserError>;
};

export type FacetValueUnmergeInput = {
  sourceValueIds: Array<Scalars['ID']['input']>;
};

export type FacetValueUnmergePayload = {
  __typename?: 'FacetValueUnmergePayload';
  affectedGroupValues: Array<FacetValue>;
  sourceValues: Array<FacetValue>;
  userErrors: Array<GenericUserError>;
};

export type FacetValueUpdateInput = {
  enabled?: InputMaybe<Scalars['Boolean']['input']>;
  handle?: InputMaybe<Scalars['String']['input']>;
  id: Scalars['ID']['input'];
  label?: InputMaybe<Scalars['String']['input']>;
  sortIndex?: InputMaybe<Scalars['Int']['input']>;
  swatchId?: InputMaybe<Scalars['ID']['input']>;
};

export type FacetValueUpdatePayload = {
  __typename?: 'FacetValueUpdatePayload';
  facetValue: Maybe<FacetValue>;
  userErrors: Array<GenericUserError>;
};

export type File = {
  __typename?: 'File';
  id: Scalars['ID']['output'];
};

/** A generic user error type for mutation responses. */
export type GenericUserError = UserError & {
  __typename?: 'GenericUserError';
  code: Maybe<Scalars['String']['output']>;
  field: Maybe<Array<Scalars['String']['output']>>;
  message: Scalars['String']['output'];
};

/** Filter operators for ID fields. */
export type IdFilter = {
  /** Equals. */
  _eq?: InputMaybe<Scalars['ID']['input']>;
  /** In array. */
  _in?: InputMaybe<Array<Scalars['ID']['input']>>;
  /** Is null. */
  _is?: InputMaybe<Scalars['Boolean']['input']>;
  /** Is not null. */
  _isNot?: InputMaybe<Scalars['Boolean']['input']>;
  /** Not equals. */
  _neq?: InputMaybe<Scalars['ID']['input']>;
  /** Not in array. */
  _notIn?: InputMaybe<Array<Scalars['ID']['input']>>;
};

/** Filter operators for Int fields. */
export type IntFilter = {
  /** Between range (inclusive). */
  _between?: InputMaybe<Array<Scalars['Int']['input']>>;
  /** Equals. */
  _eq?: InputMaybe<Scalars['Int']['input']>;
  /** Greater than. */
  _gt?: InputMaybe<Scalars['Int']['input']>;
  /** Greater than or equal. */
  _gte?: InputMaybe<Scalars['Int']['input']>;
  /** In array. */
  _in?: InputMaybe<Array<Scalars['Int']['input']>>;
  /** Is null. */
  _is?: InputMaybe<Scalars['Boolean']['input']>;
  /** Is not null. */
  _isNot?: InputMaybe<Scalars['Boolean']['input']>;
  /** Less than. */
  _lt?: InputMaybe<Scalars['Int']['input']>;
  /** Less than or equal. */
  _lte?: InputMaybe<Scalars['Int']['input']>;
  /** Not equals. */
  _neq?: InputMaybe<Scalars['Int']['input']>;
  /** Not in array. */
  _notIn?: InputMaybe<Array<Scalars['Int']['input']>>;
};

export type Listing = {
  /** The global ID of the catalog listing item. */
  id: Scalars['ID']['output'];
};

/** A connection to a mixed list of catalog listing items. */
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
  /** Move a facet before or after another facet. */
  facetMove: FacetMovePayload;
  /** Rebalance facet lexo ranks. */
  facetRebalance: FacetRebalancePayload;
  /** Create a new facet swatch. */
  facetSwatchCreate: FacetSwatchCreatePayload;
  /** Delete a facet swatch. */
  facetSwatchDelete: FacetSwatchDeletePayload;
  /** Update an existing facet swatch. */
  facetSwatchUpdate: FacetSwatchUpdatePayload;
  /** Update an existing facet. */
  facetUpdate: FacetUpdatePayload;
  /** Create a new facet value. */
  facetValueCreate: FacetValueCreatePayload;
  /** Delete a facet value. */
  facetValueDelete: FacetValueDeletePayload;
  /**
   * Attach source facet values to an existing or newly-created group value.
   * This is the only mutation that merges source values into a group value.
   */
  facetValueMerge: FacetValueMergePayload;
  /**
   * Detach source facet values from their group value and make them root values.
   * This is the only mutation that unmerges source values.
   */
  facetValueUnmerge: FacetValueUnmergePayload;
  /** Update an existing facet value. */
  facetValueUpdate: FacetValueUpdatePayload;
  /** Search configuration mutation namespace. */
  search: ListingSearchMutation;
};


export type ListingMutationFacetCreateArgs = {
  input: FacetCreateInput;
};


export type ListingMutationFacetDeleteArgs = {
  input: FacetDeleteInput;
};


export type ListingMutationFacetMoveArgs = {
  input: FacetMoveInput;
};


export type ListingMutationFacetRebalanceArgs = {
  input: FacetRebalanceInput;
};


export type ListingMutationFacetSwatchCreateArgs = {
  input: FacetSwatchCreateInput;
};


export type ListingMutationFacetSwatchDeleteArgs = {
  input: FacetSwatchDeleteInput;
};


export type ListingMutationFacetSwatchUpdateArgs = {
  input: FacetSwatchUpdateInput;
};


export type ListingMutationFacetUpdateArgs = {
  input: FacetUpdateInput;
};


export type ListingMutationFacetValueCreateArgs = {
  input: FacetValueCreateInput;
};


export type ListingMutationFacetValueDeleteArgs = {
  input: FacetValueDeleteInput;
};


export type ListingMutationFacetValueMergeArgs = {
  input: FacetValueMergeInput;
};


export type ListingMutationFacetValueUnmergeArgs = {
  input: FacetValueUnmergeInput;
};


export type ListingMutationFacetValueUpdateArgs = {
  input: FacetValueUpdateInput;
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
  /** Filter by product tag. */
  tag?: InputMaybe<Scalars['String']['input']>;
  /** Filter by variant-level listing facet value. */
  variantFacet?: InputMaybe<ListingFacetValueFilter>;
  /** Filter by variant option. */
  variantOption?: InputMaybe<ListingVariantOptionFilter>;
};

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
  /** Get a node by its global ID. */
  node: Maybe<Node>;
  /** Get multiple nodes by their global IDs. */
  nodes: Array<Maybe<Node>>;
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


export type ListingQueryNodeArgs = {
  id: Scalars['ID']['input'];
};


export type ListingQueryNodesArgs = {
  ids: Array<Scalars['ID']['input']>;
};

export type ListingScopeInput = {
  /** Category global ID. Required when kind is CATEGORY. */
  categoryId?: InputMaybe<Scalars['ID']['input']>;
  /** Scope kind for the listing request. */
  kind: ListingScopeKind;
};

export enum ListingScopeKind {
  Category = 'CATEGORY',
  Search = 'SEARCH'
}

export type ListingSearchMutation = {
  __typename?: 'ListingSearchMutation';
  /** Unified update of the complete search configuration. */
  settingsUpdate: SearchSettingsUpdatePayload;
};


export type ListingSearchMutationSettingsUpdateArgs = {
  expectedVersion: Scalars['Int']['input'];
  operations: SearchSettingsOperationsInput;
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
  limit?: InputMaybe<Scalars['Int']['input']>;
  locale?: InputMaybe<LocaleCode>;
  offset?: InputMaybe<Scalars['Int']['input']>;
};


export type ListingSearchQuerySynonymGroupArgs = {
  id: Scalars['ID']['input'];
};


export type ListingSearchQuerySynonymGroupsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  locale?: InputMaybe<LocaleCode>;
  offset?: InputMaybe<Scalars['Int']['input']>;
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

export type Product = Listing & Node & {
  __typename?: 'Product';
  /** The Product global ID owned by Catalog. */
  id: Scalars['ID']['output'];
};

export type Query = {
  __typename?: 'Query';
  /** Listing query namespace. */
  listingQuery: ListingQuery;
};

export enum SearchConfigurationOperationAction {
  Create = 'CREATE',
  Delete = 'DELETE',
  Update = 'UPDATE'
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
  normalizationProfileRevision: Scalars['String']['output'];
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
  version: Scalars['Int']['output'];
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

export type SearchProductBoost = {
  __typename?: 'SearchProductBoost';
  createdAt: Scalars['DateTime']['output'];
  enabled: Scalars['Boolean']['output'];
  id: Scalars['ID']['output'];
  locale: LocaleCode;
  name: Scalars['String']['output'];
  phrases: Array<SearchProductBoostPhrase>;
  productIds: Array<Scalars['ID']['output']>;
  updatedAt: Scalars['DateTime']['output'];
  version: Scalars['Int']['output'];
};

export type SearchProductBoostConnection = {
  __typename?: 'SearchProductBoostConnection';
  nodes: Array<SearchProductBoost>;
  totalCount: Scalars['Int']['output'];
};

export type SearchProductBoostOperationInput = {
  action: SearchConfigurationOperationAction;
  clientMutationId?: InputMaybe<Scalars['String']['input']>;
  enabled?: InputMaybe<Scalars['Boolean']['input']>;
  id?: InputMaybe<Scalars['ID']['input']>;
  locale?: InputMaybe<LocaleCode>;
  name?: InputMaybe<Scalars['String']['input']>;
  phrases?: InputMaybe<Array<Scalars['String']['input']>>;
  productIds?: InputMaybe<Array<Scalars['ID']['input']>>;
};

export type SearchProductBoostPhrase = {
  __typename?: 'SearchProductBoostPhrase';
  phrase: Scalars['String']['output'];
  position: Scalars['Int']['output'];
};

export type SearchSettings = {
  __typename?: 'SearchSettings';
  fields: Array<SearchFieldConfiguration>;
  outOfStockPolicy: SearchOutOfStockPolicy;
  typoToleranceEnabled: Scalars['Boolean']['output'];
  updatedAt: Scalars['DateTime']['output'];
  updatedById: Scalars['ID']['output'];
  version: Scalars['Int']['output'];
};

export type SearchSettingsOperationResult = {
  __typename?: 'SearchSettingsOperationResult';
  applied: Scalars['Boolean']['output'];
  clientMutationId: Maybe<Scalars['String']['output']>;
  entityId: Maybe<Scalars['ID']['output']>;
  errors: Array<GenericUserError>;
  type: SearchSettingsOperationType;
};

export enum SearchSettingsOperationType {
  ProductBoostCreate = 'PRODUCT_BOOST_CREATE',
  ProductBoostDelete = 'PRODUCT_BOOST_DELETE',
  ProductBoostUpdate = 'PRODUCT_BOOST_UPDATE',
  SettingsUpdate = 'SETTINGS_UPDATE',
  SynonymGroupCreate = 'SYNONYM_GROUP_CREATE',
  SynonymGroupDelete = 'SYNONYM_GROUP_DELETE',
  SynonymGroupUpdate = 'SYNONYM_GROUP_UPDATE'
}

export type SearchSettingsOperationsInput = {
  /** Product boost operations. */
  productBoosts?: InputMaybe<Array<SearchProductBoostOperationInput>>;
  /** Main search settings replacement. */
  settings?: InputMaybe<SearchSettingsValuesInput>;
  /** Synonym group operations. */
  synonymGroups?: InputMaybe<Array<SearchSynonymGroupOperationInput>>;
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

export type SearchSynonymGroup = {
  __typename?: 'SearchSynonymGroup';
  createdAt: Scalars['DateTime']['output'];
  enabled: Scalars['Boolean']['output'];
  id: Scalars['ID']['output'];
  locale: LocaleCode;
  name: Scalars['String']['output'];
  updatedAt: Scalars['DateTime']['output'];
  values: Array<SearchSynonymValue>;
  version: Scalars['Int']['output'];
};

export type SearchSynonymGroupConnection = {
  __typename?: 'SearchSynonymGroupConnection';
  nodes: Array<SearchSynonymGroup>;
  totalCount: Scalars['Int']['output'];
};

export type SearchSynonymGroupOperationInput = {
  action: SearchConfigurationOperationAction;
  clientMutationId?: InputMaybe<Scalars['String']['input']>;
  enabled?: InputMaybe<Scalars['Boolean']['input']>;
  id?: InputMaybe<Scalars['ID']['input']>;
  locale?: InputMaybe<LocaleCode>;
  name?: InputMaybe<Scalars['String']['input']>;
  values?: InputMaybe<Array<Scalars['String']['input']>>;
};

export type SearchSynonymValue = {
  __typename?: 'SearchSynonymValue';
  position: Scalars['Int']['output'];
  value: Scalars['String']['output'];
};

/** Sort direction. */
export enum SortDirection {
  Asc = 'asc',
  Desc = 'desc'
}

/** Filter operators for String fields. */
export type StringFilter = {
  /** Contains substring (case-sensitive). */
  _contains?: InputMaybe<Scalars['String']['input']>;
  /** Contains substring (case-insensitive). */
  _containsi?: InputMaybe<Scalars['String']['input']>;
  /** Ends with (case-sensitive). */
  _endsWith?: InputMaybe<Scalars['String']['input']>;
  /** Ends with (case-insensitive). */
  _endsWithi?: InputMaybe<Scalars['String']['input']>;
  /** Equals. */
  _eq?: InputMaybe<Scalars['String']['input']>;
  /** In array. */
  _in?: InputMaybe<Array<Scalars['String']['input']>>;
  /** Is null. */
  _is?: InputMaybe<Scalars['Boolean']['input']>;
  /** Is not null. */
  _isNot?: InputMaybe<Scalars['Boolean']['input']>;
  /** Not equals. */
  _neq?: InputMaybe<Scalars['String']['input']>;
  /** Does not contain substring (case-sensitive). */
  _notContains?: InputMaybe<Scalars['String']['input']>;
  /** Does not contain substring (case-insensitive). */
  _notContainsi?: InputMaybe<Scalars['String']['input']>;
  /** Not in array. */
  _notIn?: InputMaybe<Array<Scalars['String']['input']>>;
  /** Starts with (case-sensitive). */
  _startsWith?: InputMaybe<Scalars['String']['input']>;
  /** Starts with (case-insensitive). */
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
  Listing: ( Bundle ) | ( Product );
  Node: ( Bundle ) | ( Facet ) | ( FacetSwatch ) | ( FacetValue ) | ( Product );
  UserError: ( GenericUserError );
}>;

/** Mapping between all available schema types and the resolvers types */
export type ResolversTypes = ResolversObject<{
  BigInt: ResolverTypeWrapper<Scalars['BigInt']['output']>;
  Bundle: ResolverTypeWrapper<Bundle>;
  ID: ResolverTypeWrapper<Scalars['ID']['output']>;
  CurrencyCode: CurrencyCode;
  DateTime: ResolverTypeWrapper<Scalars['DateTime']['output']>;
  DimensionUnit: DimensionUnit;
  Email: ResolverTypeWrapper<Scalars['Email']['output']>;
  Facet: ResolverTypeWrapper<Facet>;
  String: ResolverTypeWrapper<Scalars['String']['output']>;
  FacetCreateInput: FacetCreateInput;
  FacetCreatePayload: ResolverTypeWrapper<FacetCreatePayload>;
  FacetCreateSourceInput: FacetCreateSourceInput;
  FacetCreateValueCandidateInput: FacetCreateValueCandidateInput;
  FacetDeleteInput: FacetDeleteInput;
  FacetDeletePayload: ResolverTypeWrapper<FacetDeletePayload>;
  FacetMoveInput: FacetMoveInput;
  FacetMovePayload: ResolverTypeWrapper<FacetMovePayload>;
  FacetRebalanceInput: FacetRebalanceInput;
  Boolean: ResolverTypeWrapper<Scalars['Boolean']['output']>;
  FacetRebalancePayload: ResolverTypeWrapper<FacetRebalancePayload>;
  FacetSelectionMode: FacetSelectionMode;
  FacetSource: ResolverTypeWrapper<FacetSource>;
  FacetSourceCandidate: ResolverTypeWrapper<FacetSourceCandidate>;
  FacetSourceCandidateConnection: ResolverTypeWrapper<FacetSourceCandidateConnection>;
  Int: ResolverTypeWrapper<Scalars['Int']['output']>;
  FacetSourceCandidateEdge: ResolverTypeWrapper<FacetSourceCandidateEdge>;
  FacetSourceCandidateOrderByInput: FacetSourceCandidateOrderByInput;
  FacetSourceCandidateOrderField: FacetSourceCandidateOrderField;
  FacetSourceCandidateWhereInput: FacetSourceCandidateWhereInput;
  FacetSwatch: ResolverTypeWrapper<FacetSwatch>;
  FacetSwatchCreateInput: FacetSwatchCreateInput;
  FacetSwatchCreatePayload: ResolverTypeWrapper<FacetSwatchCreatePayload>;
  FacetSwatchDeleteInput: FacetSwatchDeleteInput;
  FacetSwatchDeletePayload: ResolverTypeWrapper<FacetSwatchDeletePayload>;
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
  FacetValueCreateInput: FacetValueCreateInput;
  FacetValueCreatePayload: ResolverTypeWrapper<FacetValueCreatePayload>;
  FacetValueDeleteInput: FacetValueDeleteInput;
  FacetValueDeletePayload: ResolverTypeWrapper<FacetValueDeletePayload>;
  FacetValueKind: FacetValueKind;
  FacetValueMergeInput: FacetValueMergeInput;
  FacetValueMergePayload: ResolverTypeWrapper<FacetValueMergePayload>;
  FacetValueUnmergeInput: FacetValueUnmergeInput;
  FacetValueUnmergePayload: ResolverTypeWrapper<FacetValueUnmergePayload>;
  FacetValueUpdateInput: FacetValueUpdateInput;
  FacetValueUpdatePayload: ResolverTypeWrapper<FacetValueUpdatePayload>;
  File: ResolverTypeWrapper<File>;
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
  ListingQuery: ResolverTypeWrapper<Omit<ListingQuery, 'listing' | 'node' | 'nodes'> & { listing: ResolversTypes['ListingConnection'], node?: Maybe<ResolversTypes['Node']>, nodes: Array<Maybe<ResolversTypes['Node']>> }>;
  ListingScopeInput: ListingScopeInput;
  ListingScopeKind: ListingScopeKind;
  ListingSearchMutation: ResolverTypeWrapper<ListingSearchMutation>;
  ListingSearchQuery: ResolverTypeWrapper<ListingSearchQuery>;
  ListingSortBy: ListingSortBy;
  ListingSortDirection: ListingSortDirection;
  ListingVariantOptionFilter: ListingVariantOptionFilter;
  LocaleCode: LocaleCode;
  Mutation: ResolverTypeWrapper<{}>;
  Node: ResolverTypeWrapper<ResolversInterfaceTypes<ResolversTypes>['Node']>;
  PageInfo: ResolverTypeWrapper<PageInfo>;
  Product: ResolverTypeWrapper<Product>;
  Query: ResolverTypeWrapper<{}>;
  SearchConfigurationOperationAction: SearchConfigurationOperationAction;
  SearchExecutionMode: SearchExecutionMode;
  SearchExplain: ResolverTypeWrapper<SearchExplain>;
  SearchExplainClause: ResolverTypeWrapper<SearchExplainClause>;
  SearchExplainClauseKind: SearchExplainClauseKind;
  SearchExplainFieldWeight: ResolverTypeWrapper<SearchExplainFieldWeight>;
  Float: ResolverTypeWrapper<Scalars['Float']['output']>;
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
  SearchProductBoostOperationInput: SearchProductBoostOperationInput;
  SearchProductBoostPhrase: ResolverTypeWrapper<SearchProductBoostPhrase>;
  SearchSettings: ResolverTypeWrapper<SearchSettings>;
  SearchSettingsOperationResult: ResolverTypeWrapper<SearchSettingsOperationResult>;
  SearchSettingsOperationType: SearchSettingsOperationType;
  SearchSettingsOperationsInput: SearchSettingsOperationsInput;
  SearchSettingsUpdatePayload: ResolverTypeWrapper<SearchSettingsUpdatePayload>;
  SearchSettingsValuesInput: SearchSettingsValuesInput;
  SearchSynonymGroup: ResolverTypeWrapper<SearchSynonymGroup>;
  SearchSynonymGroupConnection: ResolverTypeWrapper<SearchSynonymGroupConnection>;
  SearchSynonymGroupOperationInput: SearchSynonymGroupOperationInput;
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
  Bundle: Bundle;
  ID: Scalars['ID']['output'];
  DateTime: Scalars['DateTime']['output'];
  Email: Scalars['Email']['output'];
  Facet: Facet;
  String: Scalars['String']['output'];
  FacetCreateInput: FacetCreateInput;
  FacetCreatePayload: FacetCreatePayload;
  FacetCreateSourceInput: FacetCreateSourceInput;
  FacetCreateValueCandidateInput: FacetCreateValueCandidateInput;
  FacetDeleteInput: FacetDeleteInput;
  FacetDeletePayload: FacetDeletePayload;
  FacetMoveInput: FacetMoveInput;
  FacetMovePayload: FacetMovePayload;
  FacetRebalanceInput: FacetRebalanceInput;
  Boolean: Scalars['Boolean']['output'];
  FacetRebalancePayload: FacetRebalancePayload;
  FacetSource: FacetSource;
  FacetSourceCandidate: FacetSourceCandidate;
  FacetSourceCandidateConnection: FacetSourceCandidateConnection;
  Int: Scalars['Int']['output'];
  FacetSourceCandidateEdge: FacetSourceCandidateEdge;
  FacetSourceCandidateOrderByInput: FacetSourceCandidateOrderByInput;
  FacetSourceCandidateWhereInput: FacetSourceCandidateWhereInput;
  FacetSwatch: FacetSwatch;
  FacetSwatchCreateInput: FacetSwatchCreateInput;
  FacetSwatchCreatePayload: FacetSwatchCreatePayload;
  FacetSwatchDeleteInput: FacetSwatchDeleteInput;
  FacetSwatchDeletePayload: FacetSwatchDeletePayload;
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
  FacetValueCreateInput: FacetValueCreateInput;
  FacetValueCreatePayload: FacetValueCreatePayload;
  FacetValueDeleteInput: FacetValueDeleteInput;
  FacetValueDeletePayload: FacetValueDeletePayload;
  FacetValueMergeInput: FacetValueMergeInput;
  FacetValueMergePayload: FacetValueMergePayload;
  FacetValueUnmergeInput: FacetValueUnmergeInput;
  FacetValueUnmergePayload: FacetValueUnmergePayload;
  FacetValueUpdateInput: FacetValueUpdateInput;
  FacetValueUpdatePayload: FacetValueUpdatePayload;
  File: File;
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
  Mutation: {};
  Node: ResolversInterfaceTypes<ResolversParentTypes>['Node'];
  PageInfo: PageInfo;
  Product: Product;
  Query: {};
  SearchExplain: SearchExplain;
  SearchExplainClause: SearchExplainClause;
  SearchExplainFieldWeight: SearchExplainFieldWeight;
  Float: Scalars['Float']['output'];
  SearchExplainSettings: SearchExplainSettings;
  SearchExplainTypoAlternative: SearchExplainTypoAlternative;
  SearchExplainUnit: SearchExplainUnit;
  SearchFieldConfiguration: SearchFieldConfiguration;
  SearchFieldConfigurationInput: SearchFieldConfigurationInput;
  SearchProductBoost: SearchProductBoost;
  SearchProductBoostConnection: SearchProductBoostConnection;
  SearchProductBoostOperationInput: SearchProductBoostOperationInput;
  SearchProductBoostPhrase: SearchProductBoostPhrase;
  SearchSettings: SearchSettings;
  SearchSettingsOperationResult: SearchSettingsOperationResult;
  SearchSettingsOperationsInput: SearchSettingsOperationsInput;
  SearchSettingsUpdatePayload: SearchSettingsUpdatePayload;
  SearchSettingsValuesInput: SearchSettingsValuesInput;
  SearchSynonymGroup: SearchSynonymGroup;
  SearchSynonymGroupConnection: SearchSynonymGroupConnection;
  SearchSynonymGroupOperationInput: SearchSynonymGroupOperationInput;
  SearchSynonymValue: SearchSynonymValue;
  StringFilter: StringFilter;
  UserError: ResolversInterfaceTypes<ResolversParentTypes>['UserError'];
}>;

export interface BigIntScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['BigInt'], any> {
  name: 'BigInt';
}

export type BundleResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['Bundle'] = ResolversParentTypes['Bundle']> = ResolversObject<{
  __resolveReference?: ReferenceResolver<Maybe<ResolversTypes['Bundle']>, ParentType, ContextType>;

  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export interface DateTimeScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['DateTime'], any> {
  name: 'DateTime';
}

export interface EmailScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['Email'], any> {
  name: 'Email';
}

export type FacetResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['Facet'] = ResolversParentTypes['Facet']> = ResolversObject<{
  facetType?: Resolver<ResolversTypes['FacetType'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  label?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  lexoRank?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
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

export type FacetMovePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['FacetMovePayload'] = ResolversParentTypes['FacetMovePayload']> = ResolversObject<{
  facet?: Resolver<Maybe<ResolversTypes['Facet']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type FacetRebalancePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['FacetRebalancePayload'] = ResolversParentTypes['FacetRebalancePayload']> = ResolversObject<{
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

export type FacetSwatchUpdatePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['FacetSwatchUpdatePayload'] = ResolversParentTypes['FacetSwatchUpdatePayload']> = ResolversObject<{
  facetSwatch?: Resolver<Maybe<ResolversTypes['FacetSwatch']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type FacetUpdatePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['FacetUpdatePayload'] = ResolversParentTypes['FacetUpdatePayload']> = ResolversObject<{
  facet?: Resolver<Maybe<ResolversTypes['Facet']>, ParentType, ContextType>;
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

export type FacetValueCreatePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['FacetValueCreatePayload'] = ResolversParentTypes['FacetValueCreatePayload']> = ResolversObject<{
  facetValue?: Resolver<Maybe<ResolversTypes['FacetValue']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type FacetValueDeletePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['FacetValueDeletePayload'] = ResolversParentTypes['FacetValueDeletePayload']> = ResolversObject<{
  deletedFacetValueId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type FacetValueMergePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['FacetValueMergePayload'] = ResolversParentTypes['FacetValueMergePayload']> = ResolversObject<{
  facetValue?: Resolver<Maybe<ResolversTypes['FacetValue']>, ParentType, ContextType>;
  sourceValues?: Resolver<Array<ResolversTypes['FacetValue']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type FacetValueUnmergePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['FacetValueUnmergePayload'] = ResolversParentTypes['FacetValueUnmergePayload']> = ResolversObject<{
  affectedGroupValues?: Resolver<Array<ResolversTypes['FacetValue']>, ParentType, ContextType>;
  sourceValues?: Resolver<Array<ResolversTypes['FacetValue']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type FacetValueUpdatePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['FacetValueUpdatePayload'] = ResolversParentTypes['FacetValueUpdatePayload']> = ResolversObject<{
  facetValue?: Resolver<Maybe<ResolversTypes['FacetValue']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
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
  __resolveType: TypeResolveFn<'Bundle' | 'Product', ParentType, ContextType>;
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
  facetDelete?: Resolver<ResolversTypes['FacetDeletePayload'], ParentType, ContextType, RequireFields<ListingMutationFacetDeleteArgs, 'input'>>;
  facetMove?: Resolver<ResolversTypes['FacetMovePayload'], ParentType, ContextType, RequireFields<ListingMutationFacetMoveArgs, 'input'>>;
  facetRebalance?: Resolver<ResolversTypes['FacetRebalancePayload'], ParentType, ContextType, RequireFields<ListingMutationFacetRebalanceArgs, 'input'>>;
  facetSwatchCreate?: Resolver<ResolversTypes['FacetSwatchCreatePayload'], ParentType, ContextType, RequireFields<ListingMutationFacetSwatchCreateArgs, 'input'>>;
  facetSwatchDelete?: Resolver<ResolversTypes['FacetSwatchDeletePayload'], ParentType, ContextType, RequireFields<ListingMutationFacetSwatchDeleteArgs, 'input'>>;
  facetSwatchUpdate?: Resolver<ResolversTypes['FacetSwatchUpdatePayload'], ParentType, ContextType, RequireFields<ListingMutationFacetSwatchUpdateArgs, 'input'>>;
  facetUpdate?: Resolver<ResolversTypes['FacetUpdatePayload'], ParentType, ContextType, RequireFields<ListingMutationFacetUpdateArgs, 'input'>>;
  facetValueCreate?: Resolver<ResolversTypes['FacetValueCreatePayload'], ParentType, ContextType, RequireFields<ListingMutationFacetValueCreateArgs, 'input'>>;
  facetValueDelete?: Resolver<ResolversTypes['FacetValueDeletePayload'], ParentType, ContextType, RequireFields<ListingMutationFacetValueDeleteArgs, 'input'>>;
  facetValueMerge?: Resolver<ResolversTypes['FacetValueMergePayload'], ParentType, ContextType, RequireFields<ListingMutationFacetValueMergeArgs, 'input'>>;
  facetValueUnmerge?: Resolver<ResolversTypes['FacetValueUnmergePayload'], ParentType, ContextType, RequireFields<ListingMutationFacetValueUnmergeArgs, 'input'>>;
  facetValueUpdate?: Resolver<ResolversTypes['FacetValueUpdatePayload'], ParentType, ContextType, RequireFields<ListingMutationFacetValueUpdateArgs, 'input'>>;
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
  node?: Resolver<Maybe<ResolversTypes['Node']>, ParentType, ContextType, RequireFields<ListingQueryNodeArgs, 'id'>>;
  nodes?: Resolver<Array<Maybe<ResolversTypes['Node']>>, ParentType, ContextType, RequireFields<ListingQueryNodesArgs, 'ids'>>;
  search?: Resolver<ResolversTypes['ListingSearchQuery'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ListingSearchMutationResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ListingSearchMutation'] = ResolversParentTypes['ListingSearchMutation']> = ResolversObject<{
  settingsUpdate?: Resolver<ResolversTypes['SearchSettingsUpdatePayload'], ParentType, ContextType, RequireFields<ListingSearchMutationSettingsUpdateArgs, 'expectedVersion' | 'operations'>>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ListingSearchQueryResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ListingSearchQuery'] = ResolversParentTypes['ListingSearchQuery']> = ResolversObject<{
  explain?: Resolver<ResolversTypes['SearchExplain'], ParentType, ContextType, RequireFields<ListingSearchQueryExplainArgs, 'locale' | 'query'>>;
  productBoost?: Resolver<Maybe<ResolversTypes['SearchProductBoost']>, ParentType, ContextType, RequireFields<ListingSearchQueryProductBoostArgs, 'id'>>;
  productBoosts?: Resolver<ResolversTypes['SearchProductBoostConnection'], ParentType, ContextType, RequireFields<ListingSearchQueryProductBoostsArgs, 'limit' | 'offset'>>;
  settings?: Resolver<Maybe<ResolversTypes['SearchSettings']>, ParentType, ContextType>;
  synonymGroup?: Resolver<Maybe<ResolversTypes['SearchSynonymGroup']>, ParentType, ContextType, RequireFields<ListingSearchQuerySynonymGroupArgs, 'id'>>;
  synonymGroups?: Resolver<ResolversTypes['SearchSynonymGroupConnection'], ParentType, ContextType, RequireFields<ListingSearchQuerySynonymGroupsArgs, 'limit' | 'offset'>>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type MutationResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['Mutation'] = ResolversParentTypes['Mutation']> = ResolversObject<{
  listingMutation?: Resolver<ResolversTypes['ListingMutation'], ParentType, ContextType>;
}>;

export type NodeResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['Node'] = ResolversParentTypes['Node']> = ResolversObject<{
  __resolveType: TypeResolveFn<'Bundle' | 'Facet' | 'FacetSwatch' | 'FacetValue' | 'Product', ParentType, ContextType>;
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

export type SearchExplainResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['SearchExplain'] = ResolversParentTypes['SearchExplain']> = ResolversObject<{
  applicableProductBoostIds?: Resolver<Array<ResolversTypes['ID']>, ParentType, ContextType>;
  boostOnlyCandidateCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  candidateCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  locale?: Resolver<ResolversTypes['LocaleCode'], ParentType, ContextType>;
  matchedSynonymGroupIds?: Resolver<Array<ResolversTypes['ID']>, ParentType, ContextType>;
  membershipSerializedBytes?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  mode?: Resolver<ResolversTypes['SearchExecutionMode'], ParentType, ContextType>;
  normalizationContractVersion?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  normalizationProfileRevision?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
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
  version?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
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
  productIds?: Resolver<Array<ResolversTypes['ID']>, ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  version?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type SearchProductBoostConnectionResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['SearchProductBoostConnection'] = ResolversParentTypes['SearchProductBoostConnection']> = ResolversObject<{
  nodes?: Resolver<Array<ResolversTypes['SearchProductBoost']>, ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type SearchProductBoostPhraseResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['SearchProductBoostPhrase'] = ResolversParentTypes['SearchProductBoostPhrase']> = ResolversObject<{
  phrase?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  position?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type SearchSettingsResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['SearchSettings'] = ResolversParentTypes['SearchSettings']> = ResolversObject<{
  fields?: Resolver<Array<ResolversTypes['SearchFieldConfiguration']>, ParentType, ContextType>;
  outOfStockPolicy?: Resolver<ResolversTypes['SearchOutOfStockPolicy'], ParentType, ContextType>;
  typoToleranceEnabled?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  updatedById?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  version?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type SearchSettingsOperationResultResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['SearchSettingsOperationResult'] = ResolversParentTypes['SearchSettingsOperationResult']> = ResolversObject<{
  applied?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  clientMutationId?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
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
  version?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type SearchSynonymGroupConnectionResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['SearchSynonymGroupConnection'] = ResolversParentTypes['SearchSynonymGroupConnection']> = ResolversObject<{
  nodes?: Resolver<Array<ResolversTypes['SearchSynonymGroup']>, ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
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
  Bundle?: BundleResolvers<ContextType>;
  DateTime?: GraphQLScalarType;
  Email?: GraphQLScalarType;
  Facet?: FacetResolvers<ContextType>;
  FacetCreatePayload?: FacetCreatePayloadResolvers<ContextType>;
  FacetDeletePayload?: FacetDeletePayloadResolvers<ContextType>;
  FacetMovePayload?: FacetMovePayloadResolvers<ContextType>;
  FacetRebalancePayload?: FacetRebalancePayloadResolvers<ContextType>;
  FacetSource?: FacetSourceResolvers<ContextType>;
  FacetSourceCandidate?: FacetSourceCandidateResolvers<ContextType>;
  FacetSourceCandidateConnection?: FacetSourceCandidateConnectionResolvers<ContextType>;
  FacetSourceCandidateEdge?: FacetSourceCandidateEdgeResolvers<ContextType>;
  FacetSwatch?: FacetSwatchResolvers<ContextType>;
  FacetSwatchCreatePayload?: FacetSwatchCreatePayloadResolvers<ContextType>;
  FacetSwatchDeletePayload?: FacetSwatchDeletePayloadResolvers<ContextType>;
  FacetSwatchUpdatePayload?: FacetSwatchUpdatePayloadResolvers<ContextType>;
  FacetUpdatePayload?: FacetUpdatePayloadResolvers<ContextType>;
  FacetValue?: FacetValueResolvers<ContextType>;
  FacetValueCandidate?: FacetValueCandidateResolvers<ContextType>;
  FacetValueCandidateConnection?: FacetValueCandidateConnectionResolvers<ContextType>;
  FacetValueCandidateEdge?: FacetValueCandidateEdgeResolvers<ContextType>;
  FacetValueCreatePayload?: FacetValueCreatePayloadResolvers<ContextType>;
  FacetValueDeletePayload?: FacetValueDeletePayloadResolvers<ContextType>;
  FacetValueMergePayload?: FacetValueMergePayloadResolvers<ContextType>;
  FacetValueUnmergePayload?: FacetValueUnmergePayloadResolvers<ContextType>;
  FacetValueUpdatePayload?: FacetValueUpdatePayloadResolvers<ContextType>;
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
  Mutation?: MutationResolvers<ContextType>;
  Node?: NodeResolvers<ContextType>;
  PageInfo?: PageInfoResolvers<ContextType>;
  Product?: ProductResolvers<ContextType>;
  Query?: QueryResolvers<ContextType>;
  SearchExplain?: SearchExplainResolvers<ContextType>;
  SearchExplainClause?: SearchExplainClauseResolvers<ContextType>;
  SearchExplainFieldWeight?: SearchExplainFieldWeightResolvers<ContextType>;
  SearchExplainSettings?: SearchExplainSettingsResolvers<ContextType>;
  SearchExplainTypoAlternative?: SearchExplainTypoAlternativeResolvers<ContextType>;
  SearchExplainUnit?: SearchExplainUnitResolvers<ContextType>;
  SearchFieldConfiguration?: SearchFieldConfigurationResolvers<ContextType>;
  SearchProductBoost?: SearchProductBoostResolvers<ContextType>;
  SearchProductBoostConnection?: SearchProductBoostConnectionResolvers<ContextType>;
  SearchProductBoostPhrase?: SearchProductBoostPhraseResolvers<ContextType>;
  SearchSettings?: SearchSettingsResolvers<ContextType>;
  SearchSettingsOperationResult?: SearchSettingsOperationResultResolvers<ContextType>;
  SearchSettingsUpdatePayload?: SearchSettingsUpdatePayloadResolvers<ContextType>;
  SearchSynonymGroup?: SearchSynonymGroupResolvers<ContextType>;
  SearchSynonymGroupConnection?: SearchSynonymGroupConnectionResolvers<ContextType>;
  SearchSynonymValue?: SearchSynonymValueResolvers<ContextType>;
  UserError?: UserErrorResolvers<ContextType>;
}>;

