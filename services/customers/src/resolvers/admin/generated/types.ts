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
  /** Calendar date in ISO 8601 YYYY-MM-DD form. */
  Date: { input: string; output: string; }
  DateTime: { input: string; output: string; }
  Email: { input: string; output: string; }
  JSON: { input: Record<string, unknown>; output: Record<string, unknown>; }
  _CustomersGeneratedFilterPlaceholder: { input: any; output: any; }
  _FieldSet: { input: any; output: any; }
};

export type BigIntFilter = {
  _between?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  _eq?: InputMaybe<Scalars['BigInt']['input']>;
  _gt?: InputMaybe<Scalars['BigInt']['input']>;
  _gte?: InputMaybe<Scalars['BigInt']['input']>;
  _in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  _is?: InputMaybe<Scalars['Boolean']['input']>;
  _isNot?: InputMaybe<Scalars['Boolean']['input']>;
  _lt?: InputMaybe<Scalars['BigInt']['input']>;
  _lte?: InputMaybe<Scalars['BigInt']['input']>;
  _neq?: InputMaybe<Scalars['BigInt']['input']>;
  _notIn?: InputMaybe<Array<Scalars['BigInt']['input']>>;
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

/** A store-scoped customer business profile owned by Customers. */
export type Customer = Node & {
  __typename?: 'Customer';
  accountStatus: CustomerAccountStatus;
  addresses: CustomerAddressConnection;
  companyName: Maybe<Scalars['String']['output']>;
  /** At most one current consent record per channel. */
  consents: Array<CustomerConsent>;
  createdAt: Scalars['DateTime']['output'];
  createdByUserId: Maybe<Scalars['String']['output']>;
  dateOfBirth: Maybe<Scalars['Date']['output']>;
  defaultBillingAddress: Maybe<CustomerAddress>;
  defaultShippingAddress: Maybe<CustomerAddress>;
  deletedAt: Maybe<Scalars['DateTime']['output']>;
  displayName: Scalars['String']['output'];
  email: Maybe<Scalars['Email']['output']>;
  emailVerified: Scalars['Boolean']['output'];
  firstName: Maybe<Scalars['String']['output']>;
  gender: Maybe<Scalars['String']['output']>;
  groupMemberships: CustomerGroupMembershipConnection;
  /** Opaque IAM principal identifier. Null for guests and imported profiles. */
  iamPrincipalId: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  jobTitle: Maybe<Scalars['String']['output']>;
  lastActivityAt: Maybe<Scalars['DateTime']['output']>;
  lastName: Maybe<Scalars['String']['output']>;
  lifecycleStatus: CustomerLifecycleStatus;
  mergedInto: Maybe<Customer>;
  middleName: Maybe<Scalars['String']['output']>;
  monetaryStatistics: CustomerMonetaryStatisticsConnection;
  note: Maybe<Scalars['String']['output']>;
  phoneE164: Maybe<Scalars['String']['output']>;
  phoneVerified: Scalars['Boolean']['output'];
  preferredLocale: Maybe<Scalars['String']['output']>;
  prefix: Maybe<Scalars['String']['output']>;
  redactedAt: Maybe<Scalars['DateTime']['output']>;
  revision: Scalars['Int']['output'];
  segmentMemberships: CustomerSegmentMembershipConnection;
  source: Scalars['String']['output'];
  statistics: Maybe<CustomerStatistics>;
  suffix: Maybe<Scalars['String']['output']>;
  tagAssignments: CustomerTagAssignmentConnection;
  taxExemptions: CustomerTaxExemptionConnection;
  taxIdentifiers: CustomerTaxIdentifierConnection;
  updatedAt: Scalars['DateTime']['output'];
};


/** A store-scoped customer business profile owned by Customers. */
export type CustomerAddressesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<CustomerAddressOrderByInput>>;
  where?: InputMaybe<CustomerAddressWhereInput>;
};


/** A store-scoped customer business profile owned by Customers. */
export type CustomerGroupMembershipsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<CustomerGroupMembershipOrderByInput>>;
  where?: InputMaybe<CustomerGroupMembershipWhereInput>;
};


/** A store-scoped customer business profile owned by Customers. */
export type CustomerMonetaryStatisticsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<CustomerMonetaryStatisticsOrderByInput>>;
  where?: InputMaybe<CustomerMonetaryStatisticsWhereInput>;
};


/** A store-scoped customer business profile owned by Customers. */
export type CustomerSegmentMembershipsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<CustomerSegmentMembershipOrderByInput>>;
  where?: InputMaybe<CustomerSegmentMembershipWhereInput>;
};


/** A store-scoped customer business profile owned by Customers. */
export type CustomerTagAssignmentsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<CustomerTagAssignmentOrderByInput>>;
  where?: InputMaybe<CustomerTagAssignmentWhereInput>;
};


/** A store-scoped customer business profile owned by Customers. */
export type CustomerTaxExemptionsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<CustomerTaxExemptionOrderByInput>>;
  where?: InputMaybe<CustomerTaxExemptionWhereInput>;
};


/** A store-scoped customer business profile owned by Customers. */
export type CustomerTaxIdentifiersArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<CustomerTaxIdentifierOrderByInput>>;
  where?: InputMaybe<CustomerTaxIdentifierWhereInput>;
};

export enum CustomerAccountStatus {
  Guest = 'GUEST',
  Invited = 'INVITED',
  Registered = 'REGISTERED'
}

export type CustomerAccountStatusFilter = {
  _eq?: InputMaybe<CustomerAccountStatus>;
  _in?: InputMaybe<Array<CustomerAccountStatus>>;
  _neq?: InputMaybe<CustomerAccountStatus>;
  _notIn?: InputMaybe<Array<CustomerAccountStatus>>;
};

export type CustomerAddress = Node & {
  __typename?: 'CustomerAddress';
  address1: Scalars['String']['output'];
  address2: Maybe<Scalars['String']['output']>;
  city: Scalars['String']['output'];
  companyName: Maybe<Scalars['String']['output']>;
  /** Uppercase ISO 3166-1 alpha-2 code. */
  countryCode: Scalars['String']['output'];
  createdAt: Scalars['DateTime']['output'];
  customer: Customer;
  deletedAt: Maybe<Scalars['DateTime']['output']>;
  firstName: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  isDefaultBilling: Scalars['Boolean']['output'];
  isDefaultShipping: Scalars['Boolean']['output'];
  label: Maybe<Scalars['String']['output']>;
  lastName: Maybe<Scalars['String']['output']>;
  latitude: Maybe<Scalars['Float']['output']>;
  longitude: Maybe<Scalars['Float']['output']>;
  middleName: Maybe<Scalars['String']['output']>;
  phoneE164: Maybe<Scalars['String']['output']>;
  postalCode: Maybe<Scalars['String']['output']>;
  prefix: Maybe<Scalars['String']['output']>;
  regionCode: Maybe<Scalars['String']['output']>;
  regionName: Maybe<Scalars['String']['output']>;
  suffix: Maybe<Scalars['String']['output']>;
  updatedAt: Scalars['DateTime']['output'];
  validatedAt: Maybe<Scalars['DateTime']['output']>;
  validationStatus: CustomerAddressValidationStatus;
};

export type CustomerAddressConnection = {
  __typename?: 'CustomerAddressConnection';
  edges: Array<CustomerAddressEdge>;
  pageInfo: PageInfo;
  totalCount: Scalars['Int']['output'];
};

export type CustomerAddressCreateInput = {
  address1: Scalars['String']['input'];
  address2?: InputMaybe<Scalars['String']['input']>;
  city: Scalars['String']['input'];
  companyName?: InputMaybe<Scalars['String']['input']>;
  countryCode: Scalars['String']['input'];
  customerId: Scalars['ID']['input'];
  firstName?: InputMaybe<Scalars['String']['input']>;
  isDefaultBilling?: InputMaybe<Scalars['Boolean']['input']>;
  isDefaultShipping?: InputMaybe<Scalars['Boolean']['input']>;
  label?: InputMaybe<Scalars['String']['input']>;
  lastName?: InputMaybe<Scalars['String']['input']>;
  latitude?: InputMaybe<Scalars['Float']['input']>;
  longitude?: InputMaybe<Scalars['Float']['input']>;
  middleName?: InputMaybe<Scalars['String']['input']>;
  phoneE164?: InputMaybe<Scalars['String']['input']>;
  postalCode?: InputMaybe<Scalars['String']['input']>;
  prefix?: InputMaybe<Scalars['String']['input']>;
  regionCode?: InputMaybe<Scalars['String']['input']>;
  regionName?: InputMaybe<Scalars['String']['input']>;
  suffix?: InputMaybe<Scalars['String']['input']>;
};

export type CustomerAddressCreatePayload = {
  __typename?: 'CustomerAddressCreatePayload';
  address: Maybe<CustomerAddress>;
  userErrors: Array<GenericUserError>;
};

/** Atomically replaces both defaults. Null clears a default. */
export type CustomerAddressDefaultsUpdateInput = {
  billingAddressId?: InputMaybe<Scalars['ID']['input']>;
  customerId: Scalars['ID']['input'];
  shippingAddressId?: InputMaybe<Scalars['ID']['input']>;
};

export type CustomerAddressDefaultsUpdatePayload = {
  __typename?: 'CustomerAddressDefaultsUpdatePayload';
  customer: Maybe<Customer>;
  userErrors: Array<GenericUserError>;
};

export type CustomerAddressDeleteInput = {
  id: Scalars['ID']['input'];
};

export type CustomerAddressDeletePayload = {
  __typename?: 'CustomerAddressDeletePayload';
  deletedAddressId: Maybe<Scalars['ID']['output']>;
  userErrors: Array<GenericUserError>;
};

export type CustomerAddressEdge = {
  __typename?: 'CustomerAddressEdge';
  cursor: Scalars['String']['output'];
  node: CustomerAddress;
};

export type CustomerAddressOrderByInput = {
  direction: SortDirection;
  field: CustomerAddressOrderField;
};

export enum CustomerAddressOrderField {
  City = 'city',
  CountryCode = 'countryCode',
  CreatedAt = 'createdAt',
  FirstName = 'firstName',
  Id = 'id',
  IsDefaultBilling = 'isDefaultBilling',
  IsDefaultShipping = 'isDefaultShipping',
  Label = 'label',
  LastName = 'lastName',
  PostalCode = 'postalCode',
  RegionCode = 'regionCode',
  UpdatedAt = 'updatedAt',
  ValidationStatus = 'validationStatus'
}

export type CustomerAddressUpdateInput = {
  address1?: InputMaybe<Scalars['String']['input']>;
  address2?: InputMaybe<Scalars['String']['input']>;
  city?: InputMaybe<Scalars['String']['input']>;
  companyName?: InputMaybe<Scalars['String']['input']>;
  countryCode?: InputMaybe<Scalars['String']['input']>;
  firstName?: InputMaybe<Scalars['String']['input']>;
  label?: InputMaybe<Scalars['String']['input']>;
  lastName?: InputMaybe<Scalars['String']['input']>;
  latitude?: InputMaybe<Scalars['Float']['input']>;
  longitude?: InputMaybe<Scalars['Float']['input']>;
  middleName?: InputMaybe<Scalars['String']['input']>;
  phoneE164?: InputMaybe<Scalars['String']['input']>;
  postalCode?: InputMaybe<Scalars['String']['input']>;
  prefix?: InputMaybe<Scalars['String']['input']>;
  regionCode?: InputMaybe<Scalars['String']['input']>;
  regionName?: InputMaybe<Scalars['String']['input']>;
  suffix?: InputMaybe<Scalars['String']['input']>;
};

export type CustomerAddressUpdatePayload = {
  __typename?: 'CustomerAddressUpdatePayload';
  address: Maybe<CustomerAddress>;
  operationResults: Array<CustomerOperationResult>;
  userErrors: Array<GenericUserError>;
};

export enum CustomerAddressValidationStatus {
  Invalid = 'INVALID',
  Unvalidated = 'UNVALIDATED',
  Valid = 'VALID'
}

export type CustomerAddressValidationStatusFilter = {
  _eq?: InputMaybe<CustomerAddressValidationStatus>;
  _in?: InputMaybe<Array<CustomerAddressValidationStatus>>;
  _neq?: InputMaybe<CustomerAddressValidationStatus>;
  _notIn?: InputMaybe<Array<CustomerAddressValidationStatus>>;
};

export type CustomerAddressWhereInput = {
  _and?: InputMaybe<Array<CustomerAddressWhereInput>>;
  _not?: InputMaybe<CustomerAddressWhereInput>;
  _or?: InputMaybe<Array<CustomerAddressWhereInput>>;
  city?: InputMaybe<StringFilter>;
  companyName?: InputMaybe<StringFilter>;
  countryCode?: InputMaybe<StringFilter>;
  createdAt?: InputMaybe<DateTimeFilter>;
  firstName?: InputMaybe<StringFilter>;
  id?: InputMaybe<IdFilter>;
  isDefaultBilling?: InputMaybe<BooleanFilter>;
  isDefaultShipping?: InputMaybe<BooleanFilter>;
  label?: InputMaybe<StringFilter>;
  lastName?: InputMaybe<StringFilter>;
  phoneE164?: InputMaybe<StringFilter>;
  postalCode?: InputMaybe<StringFilter>;
  regionCode?: InputMaybe<StringFilter>;
  updatedAt?: InputMaybe<DateTimeFilter>;
  validationStatus?: InputMaybe<CustomerAddressValidationStatusFilter>;
};

export enum CustomerAssignmentSource {
  Import = 'IMPORT',
  Manual = 'MANUAL',
  Rule = 'RULE',
  System = 'SYSTEM'
}

export type CustomerAssignmentSourceFilter = {
  _eq?: InputMaybe<CustomerAssignmentSource>;
  _in?: InputMaybe<Array<CustomerAssignmentSource>>;
  _neq?: InputMaybe<CustomerAssignmentSource>;
  _notIn?: InputMaybe<Array<CustomerAssignmentSource>>;
};

/** Company fields in the unified customer update. */
export type CustomerCompanyUpdateInput = {
  companyName?: InputMaybe<Scalars['String']['input']>;
  jobTitle?: InputMaybe<Scalars['String']['input']>;
};

export type CustomerConnection = {
  __typename?: 'CustomerConnection';
  edges: Array<CustomerEdge>;
  pageInfo: PageInfo;
  totalCount: Scalars['Int']['output'];
};

/** Current consent state for one customer and channel. */
export type CustomerConsent = Node & {
  __typename?: 'CustomerConsent';
  channel: CustomerConsentChannel;
  consentedAt: Maybe<Scalars['DateTime']['output']>;
  contactPoint: Scalars['String']['output'];
  createdAt: Scalars['DateTime']['output'];
  customer: Customer;
  events: CustomerConsentEventConnection;
  id: Scalars['ID']['output'];
  optInLevel: CustomerConsentOptInLevel;
  source: Scalars['String']['output'];
  sourceIp: Maybe<Scalars['String']['output']>;
  sourceLocationId: Maybe<Scalars['ID']['output']>;
  state: CustomerConsentState;
  updatedAt: Scalars['DateTime']['output'];
  userAgent: Maybe<Scalars['String']['output']>;
  withdrawnAt: Maybe<Scalars['DateTime']['output']>;
};


/** Current consent state for one customer and channel. */
export type CustomerConsentEventsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<CustomerConsentEventOrderByInput>>;
};

/** Consent states that a merchant administrator may set explicitly. */
export enum CustomerConsentAdminState {
  NotSubscribed = 'NOT_SUBSCRIBED',
  Pending = 'PENDING',
  Subscribed = 'SUBSCRIBED',
  Unsubscribed = 'UNSUBSCRIBED'
}

export enum CustomerConsentChannel {
  Email = 'EMAIL',
  Push = 'PUSH',
  Sms = 'SMS',
  Whatsapp = 'WHATSAPP'
}

/** Immutable evidence record for a consent transition. */
export type CustomerConsentEvent = Node & {
  __typename?: 'CustomerConsentEvent';
  actorId: Maybe<Scalars['String']['output']>;
  actorType: Scalars['String']['output'];
  channel: CustomerConsentChannel;
  consent: CustomerConsent;
  contactPoint: Scalars['String']['output'];
  customer: Customer;
  evidence: Scalars['JSON']['output'];
  id: Scalars['ID']['output'];
  idempotencyKey: Maybe<Scalars['String']['output']>;
  newState: CustomerConsentState;
  occurredAt: Scalars['DateTime']['output'];
  optInLevel: CustomerConsentOptInLevel;
  previousState: Maybe<CustomerConsentState>;
  requestId: Maybe<Scalars['String']['output']>;
  source: Scalars['String']['output'];
  sourceIp: Maybe<Scalars['String']['output']>;
  sourceLocationId: Maybe<Scalars['ID']['output']>;
  userAgent: Maybe<Scalars['String']['output']>;
};

export type CustomerConsentEventConnection = {
  __typename?: 'CustomerConsentEventConnection';
  edges: Array<CustomerConsentEventEdge>;
  pageInfo: PageInfo;
  totalCount: Scalars['Int']['output'];
};

export type CustomerConsentEventEdge = {
  __typename?: 'CustomerConsentEventEdge';
  cursor: Scalars['String']['output'];
  node: CustomerConsentEvent;
};

export type CustomerConsentEventOrderByInput = {
  direction: SortDirection;
  field: CustomerConsentEventOrderField;
};

export enum CustomerConsentEventOrderField {
  ActorType = 'actorType',
  Channel = 'channel',
  Id = 'id',
  NewState = 'newState',
  OccurredAt = 'occurredAt',
  Source = 'source'
}

export enum CustomerConsentOptInLevel {
  ConfirmedOptIn = 'CONFIRMED_OPT_IN',
  SingleOptIn = 'SINGLE_OPT_IN',
  Unknown = 'UNKNOWN'
}

export type CustomerConsentSetInput = {
  channel: CustomerConsentChannel;
  contactPoint: Scalars['String']['input'];
  customerId: Scalars['ID']['input'];
  evidence?: InputMaybe<Scalars['JSON']['input']>;
  /** Defaults to UNKNOWN when omitted. */
  optInLevel?: InputMaybe<CustomerConsentOptInLevel>;
  sourceLocationId?: InputMaybe<Scalars['ID']['input']>;
  state: CustomerConsentAdminState;
};

export type CustomerConsentSetPayload = {
  __typename?: 'CustomerConsentSetPayload';
  consent: Maybe<CustomerConsent>;
  event: Maybe<CustomerConsentEvent>;
  userErrors: Array<GenericUserError>;
};

export enum CustomerConsentState {
  Invalid = 'INVALID',
  NotSubscribed = 'NOT_SUBSCRIBED',
  Pending = 'PENDING',
  Redacted = 'REDACTED',
  Subscribed = 'SUBSCRIBED',
  Unsubscribed = 'UNSUBSCRIBED'
}

export type CustomerConsentStateFilter = {
  _eq?: InputMaybe<CustomerConsentState>;
  _in?: InputMaybe<Array<CustomerConsentState>>;
  _neq?: InputMaybe<CustomerConsentState>;
  _notIn?: InputMaybe<Array<CustomerConsentState>>;
};

/** Contact projections in the unified customer update. */
export type CustomerContactUpdateInput = {
  email?: InputMaybe<Scalars['Email']['input']>;
  phoneE164?: InputMaybe<Scalars['String']['input']>;
};

export type CustomerCreateInput = {
  companyName?: InputMaybe<Scalars['String']['input']>;
  dateOfBirth?: InputMaybe<Scalars['Date']['input']>;
  email?: InputMaybe<Scalars['Email']['input']>;
  firstName?: InputMaybe<Scalars['String']['input']>;
  gender?: InputMaybe<Scalars['String']['input']>;
  jobTitle?: InputMaybe<Scalars['String']['input']>;
  lastName?: InputMaybe<Scalars['String']['input']>;
  middleName?: InputMaybe<Scalars['String']['input']>;
  note?: InputMaybe<Scalars['String']['input']>;
  phoneE164?: InputMaybe<Scalars['String']['input']>;
  preferredLocale?: InputMaybe<Scalars['String']['input']>;
  prefix?: InputMaybe<Scalars['String']['input']>;
  suffix?: InputMaybe<Scalars['String']['input']>;
};

export type CustomerCreatePayload = {
  __typename?: 'CustomerCreatePayload';
  customer: Maybe<Customer>;
  userErrors: Array<GenericUserError>;
};

/** Auditable privacy access, export, correction or erasure workflow. */
export type CustomerDataRequest = Node & {
  __typename?: 'CustomerDataRequest';
  customer: Customer;
  dueAt: Maybe<Scalars['DateTime']['output']>;
  finishedAt: Maybe<Scalars['DateTime']['output']>;
  id: Scalars['ID']['output'];
  idempotencyKey: Scalars['String']['output'];
  legalBasis: Maybe<Scalars['String']['output']>;
  rejectionReason: Maybe<Scalars['String']['output']>;
  requestMetadata: Scalars['JSON']['output'];
  requestedAt: Scalars['DateTime']['output'];
  requestedById: Maybe<Scalars['String']['output']>;
  requestedByType: Scalars['String']['output'];
  resultFile: Maybe<File>;
  resultFileId: Maybe<Scalars['ID']['output']>;
  startedAt: Maybe<Scalars['DateTime']['output']>;
  status: CustomerDataRequestStatus;
  type: CustomerDataRequestType;
  updatedAt: Scalars['DateTime']['output'];
};

export type CustomerDataRequestCancelInput = {
  id: Scalars['ID']['input'];
  reason?: InputMaybe<Scalars['String']['input']>;
};

export type CustomerDataRequestCancelPayload = {
  __typename?: 'CustomerDataRequestCancelPayload';
  dataRequest: Maybe<CustomerDataRequest>;
  userErrors: Array<GenericUserError>;
};

export type CustomerDataRequestConnection = {
  __typename?: 'CustomerDataRequestConnection';
  edges: Array<CustomerDataRequestEdge>;
  pageInfo: PageInfo;
  totalCount: Scalars['Int']['output'];
};

export type CustomerDataRequestCreateInput = {
  customerId: Scalars['ID']['input'];
  dueAt?: InputMaybe<Scalars['DateTime']['input']>;
  legalBasis?: InputMaybe<Scalars['String']['input']>;
  requestMetadata?: InputMaybe<Scalars['JSON']['input']>;
  type: CustomerDataRequestType;
};

export type CustomerDataRequestCreatePayload = {
  __typename?: 'CustomerDataRequestCreatePayload';
  dataRequest: Maybe<CustomerDataRequest>;
  userErrors: Array<GenericUserError>;
};

export type CustomerDataRequestEdge = {
  __typename?: 'CustomerDataRequestEdge';
  cursor: Scalars['String']['output'];
  node: CustomerDataRequest;
};

export type CustomerDataRequestOrderByInput = {
  direction: SortDirection;
  field: CustomerDataRequestOrderField;
};

export enum CustomerDataRequestOrderField {
  DueAt = 'dueAt',
  FinishedAt = 'finishedAt',
  Id = 'id',
  RequestedAt = 'requestedAt',
  StartedAt = 'startedAt',
  Status = 'status',
  Type = 'type',
  UpdatedAt = 'updatedAt'
}

export enum CustomerDataRequestStatus {
  Cancelled = 'CANCELLED',
  Completed = 'COMPLETED',
  Pending = 'PENDING',
  Processing = 'PROCESSING',
  Rejected = 'REJECTED'
}

export type CustomerDataRequestStatusFilter = {
  _eq?: InputMaybe<CustomerDataRequestStatus>;
  _in?: InputMaybe<Array<CustomerDataRequestStatus>>;
  _neq?: InputMaybe<CustomerDataRequestStatus>;
  _notIn?: InputMaybe<Array<CustomerDataRequestStatus>>;
};

export enum CustomerDataRequestType {
  Access = 'ACCESS',
  Correction = 'CORRECTION',
  Erasure = 'ERASURE',
  Export = 'EXPORT'
}

export type CustomerDataRequestTypeFilter = {
  _eq?: InputMaybe<CustomerDataRequestType>;
  _in?: InputMaybe<Array<CustomerDataRequestType>>;
  _neq?: InputMaybe<CustomerDataRequestType>;
  _notIn?: InputMaybe<Array<CustomerDataRequestType>>;
};

export type CustomerDataRequestWhereInput = {
  _and?: InputMaybe<Array<CustomerDataRequestWhereInput>>;
  _not?: InputMaybe<CustomerDataRequestWhereInput>;
  _or?: InputMaybe<Array<CustomerDataRequestWhereInput>>;
  customerId?: InputMaybe<IdFilter>;
  dueAt?: InputMaybe<DateTimeFilter>;
  finishedAt?: InputMaybe<DateTimeFilter>;
  id?: InputMaybe<IdFilter>;
  legalBasis?: InputMaybe<StringFilter>;
  requestedAt?: InputMaybe<DateTimeFilter>;
  requestedById?: InputMaybe<StringFilter>;
  requestedByType?: InputMaybe<StringFilter>;
  startedAt?: InputMaybe<DateTimeFilter>;
  status?: InputMaybe<CustomerDataRequestStatusFilter>;
  type?: InputMaybe<CustomerDataRequestTypeFilter>;
  updatedAt?: InputMaybe<DateTimeFilter>;
};

export type CustomerEdge = {
  __typename?: 'CustomerEdge';
  cursor: Scalars['String']['output'];
  node: Customer;
};

export type CustomerGroup = Node & {
  __typename?: 'CustomerGroup';
  code: Scalars['String']['output'];
  createdAt: Scalars['DateTime']['output'];
  customerMemberships: CustomerGroupMembershipConnection;
  customersCount: Scalars['Int']['output'];
  deletedAt: Maybe<Scalars['DateTime']['output']>;
  description: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  isActive: Scalars['Boolean']['output'];
  isDefault: Scalars['Boolean']['output'];
  name: Scalars['String']['output'];
  updatedAt: Scalars['DateTime']['output'];
};


export type CustomerGroupCustomerMembershipsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<CustomerGroupMembershipOrderByInput>>;
  where?: InputMaybe<CustomerGroupMembershipWhereInput>;
};

export type CustomerGroupConnection = {
  __typename?: 'CustomerGroupConnection';
  edges: Array<CustomerGroupEdge>;
  pageInfo: PageInfo;
  totalCount: Scalars['Int']['output'];
};

export type CustomerGroupCreateInput = {
  code: Scalars['String']['input'];
  description?: InputMaybe<Scalars['String']['input']>;
  isActive?: InputMaybe<Scalars['Boolean']['input']>;
  isDefault?: InputMaybe<Scalars['Boolean']['input']>;
  name: Scalars['String']['input'];
};

export type CustomerGroupCreatePayload = {
  __typename?: 'CustomerGroupCreatePayload';
  group: Maybe<CustomerGroup>;
  userErrors: Array<GenericUserError>;
};

export type CustomerGroupDeleteInput = {
  id: Scalars['ID']['input'];
};

export type CustomerGroupDeletePayload = {
  __typename?: 'CustomerGroupDeletePayload';
  deletedGroupId: Maybe<Scalars['ID']['output']>;
  userErrors: Array<GenericUserError>;
};

export type CustomerGroupEdge = {
  __typename?: 'CustomerGroupEdge';
  cursor: Scalars['String']['output'];
  node: CustomerGroup;
};

export type CustomerGroupMembership = Node & {
  __typename?: 'CustomerGroupMembership';
  assignedAt: Scalars['DateTime']['output'];
  assignedById: Maybe<Scalars['String']['output']>;
  customer: Customer;
  expiresAt: Maybe<Scalars['DateTime']['output']>;
  group: CustomerGroup;
  id: Scalars['ID']['output'];
  isActive: Scalars['Boolean']['output'];
  isPrimary: Scalars['Boolean']['output'];
  source: CustomerAssignmentSource;
};

export type CustomerGroupMembershipConnection = {
  __typename?: 'CustomerGroupMembershipConnection';
  edges: Array<CustomerGroupMembershipEdge>;
  pageInfo: PageInfo;
  totalCount: Scalars['Int']['output'];
};

export type CustomerGroupMembershipDeleteInput = {
  customerId: Scalars['ID']['input'];
  groupId: Scalars['ID']['input'];
};

export type CustomerGroupMembershipDeletePayload = {
  __typename?: 'CustomerGroupMembershipDeletePayload';
  deletedMembershipId: Maybe<Scalars['ID']['output']>;
  userErrors: Array<GenericUserError>;
};

export type CustomerGroupMembershipEdge = {
  __typename?: 'CustomerGroupMembershipEdge';
  cursor: Scalars['String']['output'];
  node: CustomerGroupMembership;
};

export type CustomerGroupMembershipOrderByInput = {
  direction: SortDirection;
  field: CustomerGroupMembershipOrderField;
};

export enum CustomerGroupMembershipOrderField {
  AssignedAt = 'assignedAt',
  ExpiresAt = 'expiresAt',
  Id = 'id',
  IsPrimary = 'isPrimary',
  Source = 'source'
}

/** Create or update a customer's membership in a group. */
export type CustomerGroupMembershipSetInput = {
  customerId: Scalars['ID']['input'];
  expiresAt?: InputMaybe<Scalars['DateTime']['input']>;
  groupId: Scalars['ID']['input'];
  isPrimary?: InputMaybe<Scalars['Boolean']['input']>;
};

export type CustomerGroupMembershipSetPayload = {
  __typename?: 'CustomerGroupMembershipSetPayload';
  membership: Maybe<CustomerGroupMembership>;
  userErrors: Array<GenericUserError>;
};

export type CustomerGroupMembershipWhereInput = {
  _and?: InputMaybe<Array<CustomerGroupMembershipWhereInput>>;
  _not?: InputMaybe<CustomerGroupMembershipWhereInput>;
  _or?: InputMaybe<Array<CustomerGroupMembershipWhereInput>>;
  assignedAt?: InputMaybe<DateTimeFilter>;
  customerId?: InputMaybe<IdFilter>;
  expiresAt?: InputMaybe<DateTimeFilter>;
  groupId?: InputMaybe<IdFilter>;
  id?: InputMaybe<IdFilter>;
  isPrimary?: InputMaybe<BooleanFilter>;
  source?: InputMaybe<CustomerAssignmentSourceFilter>;
};

export type CustomerGroupOrderByInput = {
  direction: SortDirection;
  field: CustomerGroupOrderField;
};

export enum CustomerGroupOrderField {
  Code = 'code',
  CreatedAt = 'createdAt',
  Id = 'id',
  IsActive = 'isActive',
  IsDefault = 'isDefault',
  Name = 'name',
  UpdatedAt = 'updatedAt'
}

export type CustomerGroupUpdateInput = {
  code?: InputMaybe<Scalars['String']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  isActive?: InputMaybe<Scalars['Boolean']['input']>;
  isDefault?: InputMaybe<Scalars['Boolean']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
};

export type CustomerGroupUpdatePayload = {
  __typename?: 'CustomerGroupUpdatePayload';
  group: Maybe<CustomerGroup>;
  operationResults: Array<CustomerOperationResult>;
  userErrors: Array<GenericUserError>;
};

export type CustomerGroupWhereInput = {
  _and?: InputMaybe<Array<CustomerGroupWhereInput>>;
  _not?: InputMaybe<CustomerGroupWhereInput>;
  _or?: InputMaybe<Array<CustomerGroupWhereInput>>;
  code?: InputMaybe<StringFilter>;
  createdAt?: InputMaybe<DateTimeFilter>;
  id?: InputMaybe<IdFilter>;
  isActive?: InputMaybe<BooleanFilter>;
  isDefault?: InputMaybe<BooleanFilter>;
  name?: InputMaybe<StringFilter>;
  updatedAt?: InputMaybe<DateTimeFilter>;
};

export enum CustomerLifecycleStatus {
  Active = 'ACTIVE',
  Disabled = 'DISABLED',
  Merged = 'MERGED',
  Redacted = 'REDACTED'
}

export type CustomerLifecycleStatusFilter = {
  _eq?: InputMaybe<CustomerLifecycleStatus>;
  _in?: InputMaybe<Array<CustomerLifecycleStatus>>;
  _neq?: InputMaybe<CustomerLifecycleStatus>;
  _notIn?: InputMaybe<Array<CustomerLifecycleStatus>>;
};

/** Idempotent workflow that merges one customer profile into another. */
export type CustomerMerge = Node & {
  __typename?: 'CustomerMerge';
  errorCode: Maybe<Scalars['String']['output']>;
  errorMessage: Maybe<Scalars['String']['output']>;
  finishedAt: Maybe<Scalars['DateTime']['output']>;
  id: Scalars['ID']['output'];
  idempotencyKey: Scalars['String']['output'];
  reason: Maybe<Scalars['String']['output']>;
  requestedAt: Scalars['DateTime']['output'];
  requestedById: Maybe<Scalars['String']['output']>;
  requestedByType: Scalars['String']['output'];
  resolution: Scalars['JSON']['output'];
  sourceCustomer: Customer;
  startedAt: Maybe<Scalars['DateTime']['output']>;
  status: CustomerMergeStatus;
  targetCustomer: Customer;
  updatedAt: Scalars['DateTime']['output'];
};

export type CustomerMergeConnection = {
  __typename?: 'CustomerMergeConnection';
  edges: Array<CustomerMergeEdge>;
  pageInfo: PageInfo;
  totalCount: Scalars['Int']['output'];
};

export type CustomerMergeEdge = {
  __typename?: 'CustomerMergeEdge';
  cursor: Scalars['String']['output'];
  node: CustomerMerge;
};

export type CustomerMergeOrderByInput = {
  direction: SortDirection;
  field: CustomerMergeOrderField;
};

export enum CustomerMergeOrderField {
  FinishedAt = 'finishedAt',
  Id = 'id',
  RequestedAt = 'requestedAt',
  StartedAt = 'startedAt',
  Status = 'status',
  UpdatedAt = 'updatedAt'
}

export type CustomerMergeRequestInput = {
  reason?: InputMaybe<Scalars['String']['input']>;
  sourceCustomerId: Scalars['ID']['input'];
  targetCustomerId: Scalars['ID']['input'];
};

export type CustomerMergeRequestPayload = {
  __typename?: 'CustomerMergeRequestPayload';
  merge: Maybe<CustomerMerge>;
  userErrors: Array<GenericUserError>;
};

export enum CustomerMergeStatus {
  Completed = 'COMPLETED',
  Failed = 'FAILED',
  InProgress = 'IN_PROGRESS',
  Requested = 'REQUESTED'
}

export type CustomerMergeStatusFilter = {
  _eq?: InputMaybe<CustomerMergeStatus>;
  _in?: InputMaybe<Array<CustomerMergeStatus>>;
  _neq?: InputMaybe<CustomerMergeStatus>;
  _notIn?: InputMaybe<Array<CustomerMergeStatus>>;
};

export type CustomerMergeWhereInput = {
  _and?: InputMaybe<Array<CustomerMergeWhereInput>>;
  _not?: InputMaybe<CustomerMergeWhereInput>;
  _or?: InputMaybe<Array<CustomerMergeWhereInput>>;
  errorCode?: InputMaybe<StringFilter>;
  finishedAt?: InputMaybe<DateTimeFilter>;
  id?: InputMaybe<IdFilter>;
  idempotencyKey?: InputMaybe<StringFilter>;
  requestedAt?: InputMaybe<DateTimeFilter>;
  requestedById?: InputMaybe<StringFilter>;
  requestedByType?: InputMaybe<StringFilter>;
  sourceCustomerId?: InputMaybe<IdFilter>;
  startedAt?: InputMaybe<DateTimeFilter>;
  status?: InputMaybe<CustomerMergeStatusFilter>;
  targetCustomerId?: InputMaybe<IdFilter>;
  updatedAt?: InputMaybe<DateTimeFilter>;
};

/** Rebuildable monetary customer projection for one ISO 4217 currency. */
export type CustomerMonetaryStatistics = Node & {
  __typename?: 'CustomerMonetaryStatistics';
  averageOrderValueMinor: Scalars['BigInt']['output'];
  currencyCode: CurrencyCode;
  customer: Customer;
  id: Scalars['ID']['output'];
  netSpentMinor: Scalars['BigInt']['output'];
  ordersCount: Scalars['Int']['output'];
  totalRefundedMinor: Scalars['BigInt']['output'];
  totalSpentMinor: Scalars['BigInt']['output'];
  updatedAt: Scalars['DateTime']['output'];
};

export type CustomerMonetaryStatisticsConnection = {
  __typename?: 'CustomerMonetaryStatisticsConnection';
  edges: Array<CustomerMonetaryStatisticsEdge>;
  pageInfo: PageInfo;
  totalCount: Scalars['Int']['output'];
};

export type CustomerMonetaryStatisticsEdge = {
  __typename?: 'CustomerMonetaryStatisticsEdge';
  cursor: Scalars['String']['output'];
  node: CustomerMonetaryStatistics;
};

export type CustomerMonetaryStatisticsOrderByInput = {
  direction: SortDirection;
  field: CustomerMonetaryStatisticsOrderField;
};

export enum CustomerMonetaryStatisticsOrderField {
  AverageOrderValueMinor = 'averageOrderValueMinor',
  CurrencyCode = 'currencyCode',
  Id = 'id',
  NetSpentMinor = 'netSpentMinor',
  OrdersCount = 'ordersCount',
  TotalRefundedMinor = 'totalRefundedMinor',
  TotalSpentMinor = 'totalSpentMinor',
  UpdatedAt = 'updatedAt'
}

export type CustomerMonetaryStatisticsWhereInput = {
  _and?: InputMaybe<Array<CustomerMonetaryStatisticsWhereInput>>;
  _not?: InputMaybe<CustomerMonetaryStatisticsWhereInput>;
  _or?: InputMaybe<Array<CustomerMonetaryStatisticsWhereInput>>;
  averageOrderValueMinor?: InputMaybe<BigIntFilter>;
  currencyCode?: InputMaybe<StringFilter>;
  id?: InputMaybe<IdFilter>;
  netSpentMinor?: InputMaybe<BigIntFilter>;
  ordersCount?: InputMaybe<IntFilter>;
  totalRefundedMinor?: InputMaybe<BigIntFilter>;
  totalSpentMinor?: InputMaybe<BigIntFilter>;
  updatedAt?: InputMaybe<DateTimeFilter>;
};

/** Merchant note in the unified customer update. */
export type CustomerNoteUpdateInput = {
  note?: InputMaybe<Scalars['String']['input']>;
};

/** Result of one section in the unified customer update. */
export type CustomerOperationResult = {
  __typename?: 'CustomerOperationResult';
  applied: Scalars['Boolean']['output'];
  errors: Array<GenericUserError>;
  type: CustomerOperationType;
};

export enum CustomerOperationType {
  AddressUpdate = 'ADDRESS_UPDATE',
  CompanyUpdate = 'COMPANY_UPDATE',
  ContactUpdate = 'CONTACT_UPDATE',
  GroupUpdate = 'GROUP_UPDATE',
  NoteUpdate = 'NOTE_UPDATE',
  ProfileUpdate = 'PROFILE_UPDATE',
  SegmentUpdate = 'SEGMENT_UPDATE',
  StatusUpdate = 'STATUS_UPDATE',
  TagUpdate = 'TAG_UPDATE',
  TaxExemptionUpdate = 'TAX_EXEMPTION_UPDATE',
  TaxIdentifierUpdate = 'TAX_IDENTIFIER_UPDATE'
}

export type CustomerOrderByInput = {
  direction: SortDirection;
  field: CustomerOrderField;
};

export enum CustomerOrderField {
  AccountStatus = 'accountStatus',
  CompanyName = 'companyName',
  CreatedAt = 'createdAt',
  DateOfBirth = 'dateOfBirth',
  DisplayName = 'displayName',
  Email = 'email',
  FirstName = 'firstName',
  Id = 'id',
  LastActivityAt = 'lastActivityAt',
  LastName = 'lastName',
  LastOrderAt = 'lastOrderAt',
  LifecycleStatus = 'lifecycleStatus',
  OrdersCount = 'ordersCount',
  PhoneE164 = 'phoneE164',
  TotalSpentMinor = 'totalSpentMinor',
  UpdatedAt = 'updatedAt'
}

/** Personal profile fields in the unified customer update. */
export type CustomerProfileUpdateInput = {
  dateOfBirth?: InputMaybe<Scalars['Date']['input']>;
  firstName?: InputMaybe<Scalars['String']['input']>;
  gender?: InputMaybe<Scalars['String']['input']>;
  lastName?: InputMaybe<Scalars['String']['input']>;
  middleName?: InputMaybe<Scalars['String']['input']>;
  preferredLocale?: InputMaybe<Scalars['String']['input']>;
  prefix?: InputMaybe<Scalars['String']['input']>;
  suffix?: InputMaybe<Scalars['String']['input']>;
};

export type CustomerSegment = Node & {
  __typename?: 'CustomerSegment';
  createdAt: Scalars['DateTime']['output'];
  createdById: Maybe<Scalars['String']['output']>;
  customerMemberships: CustomerSegmentMembershipConnection;
  customersCount: Scalars['Int']['output'];
  definition: Scalars['JSON']['output'];
  deletedAt: Maybe<Scalars['DateTime']['output']>;
  description: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  query: Maybe<Scalars['String']['output']>;
  status: CustomerSegmentStatus;
  type: CustomerSegmentType;
  updatedAt: Scalars['DateTime']['output'];
};


export type CustomerSegmentCustomerMembershipsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<CustomerSegmentMembershipOrderByInput>>;
  where?: InputMaybe<CustomerSegmentMembershipWhereInput>;
};

export type CustomerSegmentConnection = {
  __typename?: 'CustomerSegmentConnection';
  edges: Array<CustomerSegmentEdge>;
  pageInfo: PageInfo;
  totalCount: Scalars['Int']['output'];
};

export type CustomerSegmentCreateInput = {
  definition?: InputMaybe<Scalars['JSON']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
  query?: InputMaybe<Scalars['String']['input']>;
  /** Defaults to DRAFT when omitted. */
  status?: InputMaybe<CustomerSegmentStatus>;
  type: CustomerSegmentType;
};

export type CustomerSegmentCreatePayload = {
  __typename?: 'CustomerSegmentCreatePayload';
  segment: Maybe<CustomerSegment>;
  userErrors: Array<GenericUserError>;
};

/** Add customers to a manual segment. */
export type CustomerSegmentCustomersAddInput = {
  customerIds: Array<Scalars['ID']['input']>;
  segmentId: Scalars['ID']['input'];
};

export type CustomerSegmentCustomersAddPayload = {
  __typename?: 'CustomerSegmentCustomersAddPayload';
  customers: Array<Customer>;
  segment: Maybe<CustomerSegment>;
  userErrors: Array<GenericUserError>;
};

/** Remove customers from a manual segment. */
export type CustomerSegmentCustomersRemoveInput = {
  customerIds: Array<Scalars['ID']['input']>;
  segmentId: Scalars['ID']['input'];
};

export type CustomerSegmentCustomersRemovePayload = {
  __typename?: 'CustomerSegmentCustomersRemovePayload';
  removedCustomerIds: Array<Scalars['ID']['output']>;
  segment: Maybe<CustomerSegment>;
  userErrors: Array<GenericUserError>;
};

export type CustomerSegmentDeleteInput = {
  id: Scalars['ID']['input'];
};

export type CustomerSegmentDeletePayload = {
  __typename?: 'CustomerSegmentDeletePayload';
  deletedSegmentId: Maybe<Scalars['ID']['output']>;
  userErrors: Array<GenericUserError>;
};

export type CustomerSegmentEdge = {
  __typename?: 'CustomerSegmentEdge';
  cursor: Scalars['String']['output'];
  node: CustomerSegment;
};

export type CustomerSegmentMembership = Node & {
  __typename?: 'CustomerSegmentMembership';
  customer: Customer;
  evaluatedAt: Scalars['DateTime']['output'];
  expiresAt: Maybe<Scalars['DateTime']['output']>;
  id: Scalars['ID']['output'];
  isActive: Scalars['Boolean']['output'];
  segment: CustomerSegment;
  source: CustomerAssignmentSource;
};

export type CustomerSegmentMembershipConnection = {
  __typename?: 'CustomerSegmentMembershipConnection';
  edges: Array<CustomerSegmentMembershipEdge>;
  pageInfo: PageInfo;
  totalCount: Scalars['Int']['output'];
};

export type CustomerSegmentMembershipEdge = {
  __typename?: 'CustomerSegmentMembershipEdge';
  cursor: Scalars['String']['output'];
  node: CustomerSegmentMembership;
};

export type CustomerSegmentMembershipOrderByInput = {
  direction: SortDirection;
  field: CustomerSegmentMembershipOrderField;
};

export enum CustomerSegmentMembershipOrderField {
  EvaluatedAt = 'evaluatedAt',
  ExpiresAt = 'expiresAt',
  Id = 'id',
  Source = 'source'
}

export type CustomerSegmentMembershipWhereInput = {
  _and?: InputMaybe<Array<CustomerSegmentMembershipWhereInput>>;
  _not?: InputMaybe<CustomerSegmentMembershipWhereInput>;
  _or?: InputMaybe<Array<CustomerSegmentMembershipWhereInput>>;
  customerId?: InputMaybe<IdFilter>;
  evaluatedAt?: InputMaybe<DateTimeFilter>;
  expiresAt?: InputMaybe<DateTimeFilter>;
  id?: InputMaybe<IdFilter>;
  segmentId?: InputMaybe<IdFilter>;
  source?: InputMaybe<CustomerAssignmentSourceFilter>;
};

export type CustomerSegmentOrderByInput = {
  direction: SortDirection;
  field: CustomerSegmentOrderField;
};

export enum CustomerSegmentOrderField {
  CreatedAt = 'createdAt',
  CustomersCount = 'customersCount',
  Id = 'id',
  Name = 'name',
  Status = 'status',
  Type = 'type',
  UpdatedAt = 'updatedAt'
}

export enum CustomerSegmentStatus {
  Active = 'ACTIVE',
  Archived = 'ARCHIVED',
  Draft = 'DRAFT'
}

export type CustomerSegmentStatusFilter = {
  _eq?: InputMaybe<CustomerSegmentStatus>;
  _in?: InputMaybe<Array<CustomerSegmentStatus>>;
  _neq?: InputMaybe<CustomerSegmentStatus>;
  _notIn?: InputMaybe<Array<CustomerSegmentStatus>>;
};

export enum CustomerSegmentType {
  Dynamic = 'DYNAMIC',
  Manual = 'MANUAL'
}

export type CustomerSegmentTypeFilter = {
  _eq?: InputMaybe<CustomerSegmentType>;
  _in?: InputMaybe<Array<CustomerSegmentType>>;
  _neq?: InputMaybe<CustomerSegmentType>;
  _notIn?: InputMaybe<Array<CustomerSegmentType>>;
};

export type CustomerSegmentUpdateInput = {
  definition?: InputMaybe<Scalars['JSON']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  query?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<CustomerSegmentStatus>;
  type?: InputMaybe<CustomerSegmentType>;
};

export type CustomerSegmentUpdatePayload = {
  __typename?: 'CustomerSegmentUpdatePayload';
  operationResults: Array<CustomerOperationResult>;
  segment: Maybe<CustomerSegment>;
  userErrors: Array<GenericUserError>;
};

export type CustomerSegmentWhereInput = {
  _and?: InputMaybe<Array<CustomerSegmentWhereInput>>;
  _not?: InputMaybe<CustomerSegmentWhereInput>;
  _or?: InputMaybe<Array<CustomerSegmentWhereInput>>;
  createdAt?: InputMaybe<DateTimeFilter>;
  createdById?: InputMaybe<StringFilter>;
  customersCount?: InputMaybe<IntFilter>;
  description?: InputMaybe<StringFilter>;
  id?: InputMaybe<IdFilter>;
  name?: InputMaybe<StringFilter>;
  status?: InputMaybe<CustomerSegmentStatusFilter>;
  type?: InputMaybe<CustomerSegmentTypeFilter>;
  updatedAt?: InputMaybe<DateTimeFilter>;
};

/** Rebuildable, currency-independent customer activity projection. */
export type CustomerStatistics = {
  __typename?: 'CustomerStatistics';
  cancelledOrdersCount: Scalars['Int']['output'];
  completedOrdersCount: Scalars['Int']['output'];
  customer: Customer;
  firstOrderAt: Maybe<Scalars['DateTime']['output']>;
  /** Raw Orders service UUID; Orders Admin type is not a federation entity. */
  firstOrderId: Maybe<Scalars['ID']['output']>;
  lastCheckoutAt: Maybe<Scalars['DateTime']['output']>;
  lastOrderAt: Maybe<Scalars['DateTime']['output']>;
  lastOrderId: Maybe<Scalars['ID']['output']>;
  ordersCount: Scalars['Int']['output'];
  returnsCount: Scalars['Int']['output'];
  updatedAt: Scalars['DateTime']['output'];
};

/**
 * Lifecycle fields available to Admin. Merge and redaction remain dedicated
 * workflows and cannot be selected here.
 */
export type CustomerStatusUpdateInput = {
  disabled: Scalars['Boolean']['input'];
};

export type CustomerTag = Node & {
  __typename?: 'CustomerTag';
  createdAt: Scalars['DateTime']['output'];
  customerAssignments: CustomerTagAssignmentConnection;
  customersCount: Scalars['Int']['output'];
  deletedAt: Maybe<Scalars['DateTime']['output']>;
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  normalizedName: Scalars['String']['output'];
  updatedAt: Scalars['DateTime']['output'];
};


export type CustomerTagCustomerAssignmentsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<CustomerTagAssignmentOrderByInput>>;
  where?: InputMaybe<CustomerTagAssignmentWhereInput>;
};

export type CustomerTagAssignInput = {
  customerId: Scalars['ID']['input'];
  tagId: Scalars['ID']['input'];
};

export type CustomerTagAssignPayload = {
  __typename?: 'CustomerTagAssignPayload';
  assignment: Maybe<CustomerTagAssignment>;
  userErrors: Array<GenericUserError>;
};

export type CustomerTagAssignment = Node & {
  __typename?: 'CustomerTagAssignment';
  assignedAt: Scalars['DateTime']['output'];
  assignedById: Maybe<Scalars['String']['output']>;
  customer: Customer;
  id: Scalars['ID']['output'];
  tag: CustomerTag;
};

export type CustomerTagAssignmentConnection = {
  __typename?: 'CustomerTagAssignmentConnection';
  edges: Array<CustomerTagAssignmentEdge>;
  pageInfo: PageInfo;
  totalCount: Scalars['Int']['output'];
};

export type CustomerTagAssignmentEdge = {
  __typename?: 'CustomerTagAssignmentEdge';
  cursor: Scalars['String']['output'];
  node: CustomerTagAssignment;
};

export type CustomerTagAssignmentOrderByInput = {
  direction: SortDirection;
  field: CustomerTagAssignmentOrderField;
};

export enum CustomerTagAssignmentOrderField {
  AssignedAt = 'assignedAt',
  Id = 'id'
}

export type CustomerTagAssignmentWhereInput = {
  _and?: InputMaybe<Array<CustomerTagAssignmentWhereInput>>;
  _not?: InputMaybe<CustomerTagAssignmentWhereInput>;
  _or?: InputMaybe<Array<CustomerTagAssignmentWhereInput>>;
  assignedAt?: InputMaybe<DateTimeFilter>;
  assignedById?: InputMaybe<StringFilter>;
  customerId?: InputMaybe<IdFilter>;
  id?: InputMaybe<IdFilter>;
  tagId?: InputMaybe<IdFilter>;
};

export type CustomerTagConnection = {
  __typename?: 'CustomerTagConnection';
  edges: Array<CustomerTagEdge>;
  pageInfo: PageInfo;
  totalCount: Scalars['Int']['output'];
};

export type CustomerTagCreateInput = {
  name: Scalars['String']['input'];
};

export type CustomerTagCreatePayload = {
  __typename?: 'CustomerTagCreatePayload';
  tag: Maybe<CustomerTag>;
  userErrors: Array<GenericUserError>;
};

export type CustomerTagDeleteInput = {
  id: Scalars['ID']['input'];
};

export type CustomerTagDeletePayload = {
  __typename?: 'CustomerTagDeletePayload';
  deletedTagId: Maybe<Scalars['ID']['output']>;
  userErrors: Array<GenericUserError>;
};

export type CustomerTagEdge = {
  __typename?: 'CustomerTagEdge';
  cursor: Scalars['String']['output'];
  node: CustomerTag;
};

export type CustomerTagOrderByInput = {
  direction: SortDirection;
  field: CustomerTagOrderField;
};

export enum CustomerTagOrderField {
  CreatedAt = 'createdAt',
  Id = 'id',
  Name = 'name',
  NormalizedName = 'normalizedName',
  UpdatedAt = 'updatedAt'
}

export type CustomerTagUnassignInput = {
  customerId: Scalars['ID']['input'];
  tagId: Scalars['ID']['input'];
};

export type CustomerTagUnassignPayload = {
  __typename?: 'CustomerTagUnassignPayload';
  deletedAssignmentId: Maybe<Scalars['ID']['output']>;
  userErrors: Array<GenericUserError>;
};

export type CustomerTagUpdateInput = {
  name?: InputMaybe<Scalars['String']['input']>;
};

export type CustomerTagUpdatePayload = {
  __typename?: 'CustomerTagUpdatePayload';
  operationResults: Array<CustomerOperationResult>;
  tag: Maybe<CustomerTag>;
  userErrors: Array<GenericUserError>;
};

export type CustomerTagWhereInput = {
  _and?: InputMaybe<Array<CustomerTagWhereInput>>;
  _not?: InputMaybe<CustomerTagWhereInput>;
  _or?: InputMaybe<Array<CustomerTagWhereInput>>;
  createdAt?: InputMaybe<DateTimeFilter>;
  id?: InputMaybe<IdFilter>;
  name?: InputMaybe<StringFilter>;
  normalizedName?: InputMaybe<StringFilter>;
  updatedAt?: InputMaybe<DateTimeFilter>;
};

export type CustomerTaxExemption = Node & {
  __typename?: 'CustomerTaxExemption';
  certificateFile: Maybe<File>;
  certificateFileId: Maybe<Scalars['ID']['output']>;
  code: Scalars['String']['output'];
  countryCode: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['DateTime']['output'];
  customer: Customer;
  deletedAt: Maybe<Scalars['DateTime']['output']>;
  id: Scalars['ID']['output'];
  reason: Maybe<Scalars['String']['output']>;
  regionCode: Maybe<Scalars['String']['output']>;
  status: CustomerTaxExemptionStatus;
  updatedAt: Scalars['DateTime']['output'];
  validFrom: Maybe<Scalars['Date']['output']>;
  validTo: Maybe<Scalars['Date']['output']>;
};

export type CustomerTaxExemptionConnection = {
  __typename?: 'CustomerTaxExemptionConnection';
  edges: Array<CustomerTaxExemptionEdge>;
  pageInfo: PageInfo;
  totalCount: Scalars['Int']['output'];
};

export type CustomerTaxExemptionCreateInput = {
  certificateFileId?: InputMaybe<Scalars['ID']['input']>;
  code: Scalars['String']['input'];
  countryCode?: InputMaybe<Scalars['String']['input']>;
  customerId: Scalars['ID']['input'];
  reason?: InputMaybe<Scalars['String']['input']>;
  regionCode?: InputMaybe<Scalars['String']['input']>;
  /** Defaults to ACTIVE when omitted. */
  status?: InputMaybe<CustomerTaxExemptionStatus>;
  validFrom?: InputMaybe<Scalars['Date']['input']>;
  validTo?: InputMaybe<Scalars['Date']['input']>;
};

export type CustomerTaxExemptionCreatePayload = {
  __typename?: 'CustomerTaxExemptionCreatePayload';
  taxExemption: Maybe<CustomerTaxExemption>;
  userErrors: Array<GenericUserError>;
};

export type CustomerTaxExemptionDeleteInput = {
  id: Scalars['ID']['input'];
};

export type CustomerTaxExemptionDeletePayload = {
  __typename?: 'CustomerTaxExemptionDeletePayload';
  deletedTaxExemptionId: Maybe<Scalars['ID']['output']>;
  userErrors: Array<GenericUserError>;
};

export type CustomerTaxExemptionEdge = {
  __typename?: 'CustomerTaxExemptionEdge';
  cursor: Scalars['String']['output'];
  node: CustomerTaxExemption;
};

export type CustomerTaxExemptionOrderByInput = {
  direction: SortDirection;
  field: CustomerTaxExemptionOrderField;
};

export enum CustomerTaxExemptionOrderField {
  Code = 'code',
  CountryCode = 'countryCode',
  CreatedAt = 'createdAt',
  Id = 'id',
  RegionCode = 'regionCode',
  Status = 'status',
  UpdatedAt = 'updatedAt',
  ValidFrom = 'validFrom',
  ValidTo = 'validTo'
}

export enum CustomerTaxExemptionStatus {
  Active = 'ACTIVE',
  Expired = 'EXPIRED',
  Revoked = 'REVOKED'
}

export type CustomerTaxExemptionStatusFilter = {
  _eq?: InputMaybe<CustomerTaxExemptionStatus>;
  _in?: InputMaybe<Array<CustomerTaxExemptionStatus>>;
  _neq?: InputMaybe<CustomerTaxExemptionStatus>;
  _notIn?: InputMaybe<Array<CustomerTaxExemptionStatus>>;
};

export type CustomerTaxExemptionUpdateInput = {
  certificateFileId?: InputMaybe<Scalars['ID']['input']>;
  code?: InputMaybe<Scalars['String']['input']>;
  countryCode?: InputMaybe<Scalars['String']['input']>;
  reason?: InputMaybe<Scalars['String']['input']>;
  regionCode?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<CustomerTaxExemptionStatus>;
  validFrom?: InputMaybe<Scalars['Date']['input']>;
  validTo?: InputMaybe<Scalars['Date']['input']>;
};

export type CustomerTaxExemptionUpdatePayload = {
  __typename?: 'CustomerTaxExemptionUpdatePayload';
  operationResults: Array<CustomerOperationResult>;
  taxExemption: Maybe<CustomerTaxExemption>;
  userErrors: Array<GenericUserError>;
};

export type CustomerTaxExemptionWhereInput = {
  _and?: InputMaybe<Array<CustomerTaxExemptionWhereInput>>;
  _not?: InputMaybe<CustomerTaxExemptionWhereInput>;
  _or?: InputMaybe<Array<CustomerTaxExemptionWhereInput>>;
  code?: InputMaybe<StringFilter>;
  countryCode?: InputMaybe<StringFilter>;
  createdAt?: InputMaybe<DateTimeFilter>;
  id?: InputMaybe<IdFilter>;
  regionCode?: InputMaybe<StringFilter>;
  status?: InputMaybe<CustomerTaxExemptionStatusFilter>;
  updatedAt?: InputMaybe<DateTimeFilter>;
  validFrom?: InputMaybe<DateFilter>;
  validTo?: InputMaybe<DateFilter>;
};

export type CustomerTaxIdentifier = Node & {
  __typename?: 'CustomerTaxIdentifier';
  countryCode: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['DateTime']['output'];
  customer: Customer;
  deletedAt: Maybe<Scalars['DateTime']['output']>;
  id: Scalars['ID']['output'];
  identifierType: Scalars['String']['output'];
  isPrimary: Scalars['Boolean']['output'];
  normalizedValue: Scalars['String']['output'];
  status: CustomerTaxIdentifierStatus;
  updatedAt: Scalars['DateTime']['output'];
  validFrom: Maybe<Scalars['Date']['output']>;
  validTo: Maybe<Scalars['Date']['output']>;
  value: Scalars['String']['output'];
  verifiedAt: Maybe<Scalars['DateTime']['output']>;
};

export type CustomerTaxIdentifierConnection = {
  __typename?: 'CustomerTaxIdentifierConnection';
  edges: Array<CustomerTaxIdentifierEdge>;
  pageInfo: PageInfo;
  totalCount: Scalars['Int']['output'];
};

export type CustomerTaxIdentifierCreateInput = {
  countryCode?: InputMaybe<Scalars['String']['input']>;
  customerId: Scalars['ID']['input'];
  identifierType: Scalars['String']['input'];
  isPrimary?: InputMaybe<Scalars['Boolean']['input']>;
  /** Defaults to UNVERIFIED when omitted. */
  status?: InputMaybe<CustomerTaxIdentifierStatus>;
  validFrom?: InputMaybe<Scalars['Date']['input']>;
  validTo?: InputMaybe<Scalars['Date']['input']>;
  value: Scalars['String']['input'];
};

export type CustomerTaxIdentifierCreatePayload = {
  __typename?: 'CustomerTaxIdentifierCreatePayload';
  taxIdentifier: Maybe<CustomerTaxIdentifier>;
  userErrors: Array<GenericUserError>;
};

export type CustomerTaxIdentifierDeleteInput = {
  id: Scalars['ID']['input'];
};

export type CustomerTaxIdentifierDeletePayload = {
  __typename?: 'CustomerTaxIdentifierDeletePayload';
  deletedTaxIdentifierId: Maybe<Scalars['ID']['output']>;
  userErrors: Array<GenericUserError>;
};

export type CustomerTaxIdentifierEdge = {
  __typename?: 'CustomerTaxIdentifierEdge';
  cursor: Scalars['String']['output'];
  node: CustomerTaxIdentifier;
};

export type CustomerTaxIdentifierOrderByInput = {
  direction: SortDirection;
  field: CustomerTaxIdentifierOrderField;
};

export enum CustomerTaxIdentifierOrderField {
  CountryCode = 'countryCode',
  CreatedAt = 'createdAt',
  Id = 'id',
  IdentifierType = 'identifierType',
  IsPrimary = 'isPrimary',
  Status = 'status',
  UpdatedAt = 'updatedAt',
  ValidFrom = 'validFrom',
  ValidTo = 'validTo'
}

export enum CustomerTaxIdentifierStatus {
  Expired = 'EXPIRED',
  Rejected = 'REJECTED',
  Unverified = 'UNVERIFIED',
  Verified = 'VERIFIED'
}

export type CustomerTaxIdentifierStatusFilter = {
  _eq?: InputMaybe<CustomerTaxIdentifierStatus>;
  _in?: InputMaybe<Array<CustomerTaxIdentifierStatus>>;
  _neq?: InputMaybe<CustomerTaxIdentifierStatus>;
  _notIn?: InputMaybe<Array<CustomerTaxIdentifierStatus>>;
};

export type CustomerTaxIdentifierUpdateInput = {
  countryCode?: InputMaybe<Scalars['String']['input']>;
  identifierType?: InputMaybe<Scalars['String']['input']>;
  isPrimary?: InputMaybe<Scalars['Boolean']['input']>;
  status?: InputMaybe<CustomerTaxIdentifierStatus>;
  validFrom?: InputMaybe<Scalars['Date']['input']>;
  validTo?: InputMaybe<Scalars['Date']['input']>;
  value?: InputMaybe<Scalars['String']['input']>;
};

export type CustomerTaxIdentifierUpdatePayload = {
  __typename?: 'CustomerTaxIdentifierUpdatePayload';
  operationResults: Array<CustomerOperationResult>;
  taxIdentifier: Maybe<CustomerTaxIdentifier>;
  userErrors: Array<GenericUserError>;
};

export type CustomerTaxIdentifierWhereInput = {
  _and?: InputMaybe<Array<CustomerTaxIdentifierWhereInput>>;
  _not?: InputMaybe<CustomerTaxIdentifierWhereInput>;
  _or?: InputMaybe<Array<CustomerTaxIdentifierWhereInput>>;
  countryCode?: InputMaybe<StringFilter>;
  createdAt?: InputMaybe<DateTimeFilter>;
  id?: InputMaybe<IdFilter>;
  identifierType?: InputMaybe<StringFilter>;
  isPrimary?: InputMaybe<BooleanFilter>;
  status?: InputMaybe<CustomerTaxIdentifierStatusFilter>;
  updatedAt?: InputMaybe<DateTimeFilter>;
  validFrom?: InputMaybe<DateFilter>;
  validTo?: InputMaybe<DateFilter>;
  value?: InputMaybe<StringFilter>;
};

/** Customer-level operations applied atomically by customerUpdate. */
export type CustomerUpdateInput = {
  company?: InputMaybe<CustomerCompanyUpdateInput>;
  contact?: InputMaybe<CustomerContactUpdateInput>;
  note?: InputMaybe<CustomerNoteUpdateInput>;
  profile?: InputMaybe<CustomerProfileUpdateInput>;
  status?: InputMaybe<CustomerStatusUpdateInput>;
};

export type CustomerUpdatePayload = {
  __typename?: 'CustomerUpdatePayload';
  customer: Maybe<Customer>;
  operationResults: Array<CustomerOperationResult>;
  userErrors: Array<GenericUserError>;
};

export type CustomerWhereInput = {
  _and?: InputMaybe<Array<CustomerWhereInput>>;
  _not?: InputMaybe<CustomerWhereInput>;
  _or?: InputMaybe<Array<CustomerWhereInput>>;
  accountStatus?: InputMaybe<CustomerAccountStatusFilter>;
  companyName?: InputMaybe<StringFilter>;
  createdAt?: InputMaybe<DateTimeFilter>;
  dateOfBirth?: InputMaybe<DateFilter>;
  defaultShippingCity?: InputMaybe<StringFilter>;
  defaultShippingCountryCode?: InputMaybe<StringFilter>;
  defaultShippingRegionCode?: InputMaybe<StringFilter>;
  displayName?: InputMaybe<StringFilter>;
  email?: InputMaybe<StringFilter>;
  emailMarketingState?: InputMaybe<CustomerConsentStateFilter>;
  emailVerified?: InputMaybe<BooleanFilter>;
  firstName?: InputMaybe<StringFilter>;
  iamPrincipalId?: InputMaybe<StringFilter>;
  id?: InputMaybe<IdFilter>;
  lastActivityAt?: InputMaybe<DateTimeFilter>;
  lastName?: InputMaybe<StringFilter>;
  lastOrderAt?: InputMaybe<DateTimeFilter>;
  lifecycleStatus?: InputMaybe<CustomerLifecycleStatusFilter>;
  ordersCount?: InputMaybe<IntFilter>;
  phoneE164?: InputMaybe<StringFilter>;
  phoneVerified?: InputMaybe<BooleanFilter>;
  preferredLocale?: InputMaybe<StringFilter>;
  source?: InputMaybe<StringFilter>;
  totalSpentMinor?: InputMaybe<BigIntFilter>;
  updatedAt?: InputMaybe<DateTimeFilter>;
};

/** Store-scoped customer commands. */
export type CustomersMutation = {
  __typename?: 'CustomersMutation';
  customerAddressCreate: CustomerAddressCreatePayload;
  customerAddressDefaultsUpdate: CustomerAddressDefaultsUpdatePayload;
  customerAddressDelete: CustomerAddressDeletePayload;
  customerAddressUpdate: CustomerAddressUpdatePayload;
  /** Change current consent state and append an immutable evidence event. */
  customerConsentSet: CustomerConsentSetPayload;
  customerCreate: CustomerCreatePayload;
  customerDataRequestCancel: CustomerDataRequestCancelPayload;
  customerDataRequestCreate: CustomerDataRequestCreatePayload;
  customerGroupCreate: CustomerGroupCreatePayload;
  customerGroupDelete: CustomerGroupDeletePayload;
  customerGroupMembershipDelete: CustomerGroupMembershipDeletePayload;
  customerGroupMembershipSet: CustomerGroupMembershipSetPayload;
  customerGroupUpdate: CustomerGroupUpdatePayload;
  customerMergeRequest: CustomerMergeRequestPayload;
  customerSegmentCreate: CustomerSegmentCreatePayload;
  customerSegmentCustomersAdd: CustomerSegmentCustomersAddPayload;
  customerSegmentCustomersRemove: CustomerSegmentCustomersRemovePayload;
  customerSegmentDelete: CustomerSegmentDeletePayload;
  customerSegmentUpdate: CustomerSegmentUpdatePayload;
  customerTagAssign: CustomerTagAssignPayload;
  customerTagCreate: CustomerTagCreatePayload;
  customerTagDelete: CustomerTagDeletePayload;
  customerTagUnassign: CustomerTagUnassignPayload;
  customerTagUpdate: CustomerTagUpdatePayload;
  customerTaxExemptionCreate: CustomerTaxExemptionCreatePayload;
  customerTaxExemptionDelete: CustomerTaxExemptionDeletePayload;
  customerTaxExemptionUpdate: CustomerTaxExemptionUpdatePayload;
  customerTaxIdentifierCreate: CustomerTaxIdentifierCreatePayload;
  customerTaxIdentifierDelete: CustomerTaxIdentifierDeletePayload;
  customerTaxIdentifierUpdate: CustomerTaxIdentifierUpdatePayload;
  /** Unified customer profile update with optimistic locking. */
  customerUpdate: CustomerUpdatePayload;
};


/** Store-scoped customer commands. */
export type CustomersMutationCustomerAddressCreateArgs = {
  input: CustomerAddressCreateInput;
};


/** Store-scoped customer commands. */
export type CustomersMutationCustomerAddressDefaultsUpdateArgs = {
  input: CustomerAddressDefaultsUpdateInput;
};


/** Store-scoped customer commands. */
export type CustomersMutationCustomerAddressDeleteArgs = {
  input: CustomerAddressDeleteInput;
};


/** Store-scoped customer commands. */
export type CustomersMutationCustomerAddressUpdateArgs = {
  addressId: Scalars['ID']['input'];
  operations?: InputMaybe<CustomerAddressUpdateInput>;
};


/** Store-scoped customer commands. */
export type CustomersMutationCustomerConsentSetArgs = {
  input: CustomerConsentSetInput;
};


/** Store-scoped customer commands. */
export type CustomersMutationCustomerCreateArgs = {
  input: CustomerCreateInput;
};


/** Store-scoped customer commands. */
export type CustomersMutationCustomerDataRequestCancelArgs = {
  input: CustomerDataRequestCancelInput;
};


/** Store-scoped customer commands. */
export type CustomersMutationCustomerDataRequestCreateArgs = {
  input: CustomerDataRequestCreateInput;
};


/** Store-scoped customer commands. */
export type CustomersMutationCustomerGroupCreateArgs = {
  input: CustomerGroupCreateInput;
};


/** Store-scoped customer commands. */
export type CustomersMutationCustomerGroupDeleteArgs = {
  input: CustomerGroupDeleteInput;
};


/** Store-scoped customer commands. */
export type CustomersMutationCustomerGroupMembershipDeleteArgs = {
  input: CustomerGroupMembershipDeleteInput;
};


/** Store-scoped customer commands. */
export type CustomersMutationCustomerGroupMembershipSetArgs = {
  input: CustomerGroupMembershipSetInput;
};


/** Store-scoped customer commands. */
export type CustomersMutationCustomerGroupUpdateArgs = {
  groupId: Scalars['ID']['input'];
  operations?: InputMaybe<CustomerGroupUpdateInput>;
};


/** Store-scoped customer commands. */
export type CustomersMutationCustomerMergeRequestArgs = {
  input: CustomerMergeRequestInput;
};


/** Store-scoped customer commands. */
export type CustomersMutationCustomerSegmentCreateArgs = {
  input: CustomerSegmentCreateInput;
};


/** Store-scoped customer commands. */
export type CustomersMutationCustomerSegmentCustomersAddArgs = {
  input: CustomerSegmentCustomersAddInput;
};


/** Store-scoped customer commands. */
export type CustomersMutationCustomerSegmentCustomersRemoveArgs = {
  input: CustomerSegmentCustomersRemoveInput;
};


/** Store-scoped customer commands. */
export type CustomersMutationCustomerSegmentDeleteArgs = {
  input: CustomerSegmentDeleteInput;
};


/** Store-scoped customer commands. */
export type CustomersMutationCustomerSegmentUpdateArgs = {
  operations?: InputMaybe<CustomerSegmentUpdateInput>;
  segmentId: Scalars['ID']['input'];
};


/** Store-scoped customer commands. */
export type CustomersMutationCustomerTagAssignArgs = {
  input: CustomerTagAssignInput;
};


/** Store-scoped customer commands. */
export type CustomersMutationCustomerTagCreateArgs = {
  input: CustomerTagCreateInput;
};


/** Store-scoped customer commands. */
export type CustomersMutationCustomerTagDeleteArgs = {
  input: CustomerTagDeleteInput;
};


/** Store-scoped customer commands. */
export type CustomersMutationCustomerTagUnassignArgs = {
  input: CustomerTagUnassignInput;
};


/** Store-scoped customer commands. */
export type CustomersMutationCustomerTagUpdateArgs = {
  operations?: InputMaybe<CustomerTagUpdateInput>;
  tagId: Scalars['ID']['input'];
};


/** Store-scoped customer commands. */
export type CustomersMutationCustomerTaxExemptionCreateArgs = {
  input: CustomerTaxExemptionCreateInput;
};


/** Store-scoped customer commands. */
export type CustomersMutationCustomerTaxExemptionDeleteArgs = {
  input: CustomerTaxExemptionDeleteInput;
};


/** Store-scoped customer commands. */
export type CustomersMutationCustomerTaxExemptionUpdateArgs = {
  operations?: InputMaybe<CustomerTaxExemptionUpdateInput>;
  taxExemptionId: Scalars['ID']['input'];
};


/** Store-scoped customer commands. */
export type CustomersMutationCustomerTaxIdentifierCreateArgs = {
  input: CustomerTaxIdentifierCreateInput;
};


/** Store-scoped customer commands. */
export type CustomersMutationCustomerTaxIdentifierDeleteArgs = {
  input: CustomerTaxIdentifierDeleteInput;
};


/** Store-scoped customer commands. */
export type CustomersMutationCustomerTaxIdentifierUpdateArgs = {
  operations?: InputMaybe<CustomerTaxIdentifierUpdateInput>;
  taxIdentifierId: Scalars['ID']['input'];
};


/** Store-scoped customer commands. */
export type CustomersMutationCustomerUpdateArgs = {
  customerId: Scalars['ID']['input'];
  expectedRevision?: InputMaybe<Scalars['Int']['input']>;
  operations?: InputMaybe<CustomerUpdateInput>;
};

/** Store-scoped customer reads. The current Store is taken from trusted context. */
export type CustomersQuery = {
  __typename?: 'CustomersQuery';
  customer: Maybe<Customer>;
  customerAddress: Maybe<CustomerAddress>;
  customerByEmail: Maybe<Customer>;
  customerConsent: Maybe<CustomerConsent>;
  customerDataRequest: Maybe<CustomerDataRequest>;
  customerDataRequests: CustomerDataRequestConnection;
  customerGroup: Maybe<CustomerGroup>;
  customerGroups: CustomerGroupConnection;
  customerMerge: Maybe<CustomerMerge>;
  customerMerges: CustomerMergeConnection;
  customerSegment: Maybe<CustomerSegment>;
  customerSegments: CustomerSegmentConnection;
  customerTag: Maybe<CustomerTag>;
  customerTags: CustomerTagConnection;
  customerTaxExemption: Maybe<CustomerTaxExemption>;
  customerTaxIdentifier: Maybe<CustomerTaxIdentifier>;
  customers: CustomerConnection;
  /** Resolve a customer-owned Relay node by global ID. */
  node: Maybe<Node>;
  /** Resolve customer-owned Relay nodes while preserving input order. */
  nodes: Array<Maybe<Node>>;
};


/** Store-scoped customer reads. The current Store is taken from trusted context. */
export type CustomersQueryCustomerArgs = {
  id: Scalars['ID']['input'];
};


/** Store-scoped customer reads. The current Store is taken from trusted context. */
export type CustomersQueryCustomerAddressArgs = {
  id: Scalars['ID']['input'];
};


/** Store-scoped customer reads. The current Store is taken from trusted context. */
export type CustomersQueryCustomerByEmailArgs = {
  email: Scalars['Email']['input'];
};


/** Store-scoped customer reads. The current Store is taken from trusted context. */
export type CustomersQueryCustomerConsentArgs = {
  id: Scalars['ID']['input'];
};


/** Store-scoped customer reads. The current Store is taken from trusted context. */
export type CustomersQueryCustomerDataRequestArgs = {
  id: Scalars['ID']['input'];
};


/** Store-scoped customer reads. The current Store is taken from trusted context. */
export type CustomersQueryCustomerDataRequestsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<CustomerDataRequestOrderByInput>>;
  where?: InputMaybe<CustomerDataRequestWhereInput>;
};


/** Store-scoped customer reads. The current Store is taken from trusted context. */
export type CustomersQueryCustomerGroupArgs = {
  id: Scalars['ID']['input'];
};


/** Store-scoped customer reads. The current Store is taken from trusted context. */
export type CustomersQueryCustomerGroupsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<CustomerGroupOrderByInput>>;
  where?: InputMaybe<CustomerGroupWhereInput>;
};


/** Store-scoped customer reads. The current Store is taken from trusted context. */
export type CustomersQueryCustomerMergeArgs = {
  id: Scalars['ID']['input'];
};


/** Store-scoped customer reads. The current Store is taken from trusted context. */
export type CustomersQueryCustomerMergesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<CustomerMergeOrderByInput>>;
  where?: InputMaybe<CustomerMergeWhereInput>;
};


/** Store-scoped customer reads. The current Store is taken from trusted context. */
export type CustomersQueryCustomerSegmentArgs = {
  id: Scalars['ID']['input'];
};


/** Store-scoped customer reads. The current Store is taken from trusted context. */
export type CustomersQueryCustomerSegmentsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<CustomerSegmentOrderByInput>>;
  where?: InputMaybe<CustomerSegmentWhereInput>;
};


/** Store-scoped customer reads. The current Store is taken from trusted context. */
export type CustomersQueryCustomerTagArgs = {
  id: Scalars['ID']['input'];
};


/** Store-scoped customer reads. The current Store is taken from trusted context. */
export type CustomersQueryCustomerTagsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<CustomerTagOrderByInput>>;
  where?: InputMaybe<CustomerTagWhereInput>;
};


/** Store-scoped customer reads. The current Store is taken from trusted context. */
export type CustomersQueryCustomerTaxExemptionArgs = {
  id: Scalars['ID']['input'];
};


/** Store-scoped customer reads. The current Store is taken from trusted context. */
export type CustomersQueryCustomerTaxIdentifierArgs = {
  id: Scalars['ID']['input'];
};


/** Store-scoped customer reads. The current Store is taken from trusted context. */
export type CustomersQueryCustomersArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<CustomerOrderByInput>>;
  where?: InputMaybe<CustomerWhereInput>;
};


/** Store-scoped customer reads. The current Store is taken from trusted context. */
export type CustomersQueryNodeArgs = {
  id: Scalars['ID']['input'];
};


/** Store-scoped customer reads. The current Store is taken from trusted context. */
export type CustomersQueryNodesArgs = {
  ids: Array<Scalars['ID']['input']>;
};

export type DateFilter = {
  _between?: InputMaybe<Array<Scalars['Date']['input']>>;
  _eq?: InputMaybe<Scalars['Date']['input']>;
  _gt?: InputMaybe<Scalars['Date']['input']>;
  _gte?: InputMaybe<Scalars['Date']['input']>;
  _in?: InputMaybe<Array<Scalars['Date']['input']>>;
  _is?: InputMaybe<Scalars['Boolean']['input']>;
  _isNot?: InputMaybe<Scalars['Boolean']['input']>;
  _lt?: InputMaybe<Scalars['Date']['input']>;
  _lte?: InputMaybe<Scalars['Date']['input']>;
  _neq?: InputMaybe<Scalars['Date']['input']>;
  _notIn?: InputMaybe<Array<Scalars['Date']['input']>>;
};

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
  /** Customers Admin mutation namespace. */
  customersMutation: CustomersMutation;
};

/** The Node interface is implemented by globally identifiable entities. */
export type Node = {
  id: Scalars['ID']['output'];
};

/** Relay pagination metadata. */
export type PageInfo = {
  __typename?: 'PageInfo';
  endCursor: Maybe<Scalars['String']['output']>;
  hasNextPage: Scalars['Boolean']['output'];
  hasPreviousPage: Scalars['Boolean']['output'];
  startCursor: Maybe<Scalars['String']['output']>;
};

export type Query = {
  __typename?: 'Query';
  /** Customers Admin query namespace. */
  customersQuery: CustomersQuery;
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

/** A user-facing mutation error. */
export type UserError = {
  code: Maybe<Scalars['String']['output']>;
  field: Maybe<Array<Scalars['String']['output']>>;
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
  Node: ( Customer ) | ( CustomerAddress ) | ( CustomerConsent ) | ( CustomerConsentEvent ) | ( CustomerDataRequest ) | ( CustomerGroup ) | ( CustomerGroupMembership ) | ( CustomerMerge ) | ( CustomerMonetaryStatistics ) | ( CustomerSegment ) | ( CustomerSegmentMembership ) | ( CustomerTag ) | ( CustomerTagAssignment ) | ( CustomerTaxExemption ) | ( CustomerTaxIdentifier );
  UserError: ( GenericUserError );
}>;

/** Mapping between all available schema types and the resolvers types */
export type ResolversTypes = ResolversObject<{
  BigInt: ResolverTypeWrapper<Scalars['BigInt']['output']>;
  BigIntFilter: BigIntFilter;
  Boolean: ResolverTypeWrapper<Scalars['Boolean']['output']>;
  BooleanFilter: BooleanFilter;
  CurrencyCode: CurrencyCode;
  Customer: ResolverTypeWrapper<Customer>;
  String: ResolverTypeWrapper<Scalars['String']['output']>;
  Int: ResolverTypeWrapper<Scalars['Int']['output']>;
  ID: ResolverTypeWrapper<Scalars['ID']['output']>;
  CustomerAccountStatus: CustomerAccountStatus;
  CustomerAccountStatusFilter: CustomerAccountStatusFilter;
  CustomerAddress: ResolverTypeWrapper<CustomerAddress>;
  Float: ResolverTypeWrapper<Scalars['Float']['output']>;
  CustomerAddressConnection: ResolverTypeWrapper<CustomerAddressConnection>;
  CustomerAddressCreateInput: CustomerAddressCreateInput;
  CustomerAddressCreatePayload: ResolverTypeWrapper<CustomerAddressCreatePayload>;
  CustomerAddressDefaultsUpdateInput: CustomerAddressDefaultsUpdateInput;
  CustomerAddressDefaultsUpdatePayload: ResolverTypeWrapper<CustomerAddressDefaultsUpdatePayload>;
  CustomerAddressDeleteInput: CustomerAddressDeleteInput;
  CustomerAddressDeletePayload: ResolverTypeWrapper<CustomerAddressDeletePayload>;
  CustomerAddressEdge: ResolverTypeWrapper<CustomerAddressEdge>;
  CustomerAddressOrderByInput: CustomerAddressOrderByInput;
  CustomerAddressOrderField: CustomerAddressOrderField;
  CustomerAddressUpdateInput: CustomerAddressUpdateInput;
  CustomerAddressUpdatePayload: ResolverTypeWrapper<CustomerAddressUpdatePayload>;
  CustomerAddressValidationStatus: CustomerAddressValidationStatus;
  CustomerAddressValidationStatusFilter: CustomerAddressValidationStatusFilter;
  CustomerAddressWhereInput: CustomerAddressWhereInput;
  CustomerAssignmentSource: CustomerAssignmentSource;
  CustomerAssignmentSourceFilter: CustomerAssignmentSourceFilter;
  CustomerCompanyUpdateInput: CustomerCompanyUpdateInput;
  CustomerConnection: ResolverTypeWrapper<CustomerConnection>;
  CustomerConsent: ResolverTypeWrapper<CustomerConsent>;
  CustomerConsentAdminState: CustomerConsentAdminState;
  CustomerConsentChannel: CustomerConsentChannel;
  CustomerConsentEvent: ResolverTypeWrapper<CustomerConsentEvent>;
  CustomerConsentEventConnection: ResolverTypeWrapper<CustomerConsentEventConnection>;
  CustomerConsentEventEdge: ResolverTypeWrapper<CustomerConsentEventEdge>;
  CustomerConsentEventOrderByInput: CustomerConsentEventOrderByInput;
  CustomerConsentEventOrderField: CustomerConsentEventOrderField;
  CustomerConsentOptInLevel: CustomerConsentOptInLevel;
  CustomerConsentSetInput: CustomerConsentSetInput;
  CustomerConsentSetPayload: ResolverTypeWrapper<CustomerConsentSetPayload>;
  CustomerConsentState: CustomerConsentState;
  CustomerConsentStateFilter: CustomerConsentStateFilter;
  CustomerContactUpdateInput: CustomerContactUpdateInput;
  CustomerCreateInput: CustomerCreateInput;
  CustomerCreatePayload: ResolverTypeWrapper<CustomerCreatePayload>;
  CustomerDataRequest: ResolverTypeWrapper<CustomerDataRequest>;
  CustomerDataRequestCancelInput: CustomerDataRequestCancelInput;
  CustomerDataRequestCancelPayload: ResolverTypeWrapper<CustomerDataRequestCancelPayload>;
  CustomerDataRequestConnection: ResolverTypeWrapper<CustomerDataRequestConnection>;
  CustomerDataRequestCreateInput: CustomerDataRequestCreateInput;
  CustomerDataRequestCreatePayload: ResolverTypeWrapper<CustomerDataRequestCreatePayload>;
  CustomerDataRequestEdge: ResolverTypeWrapper<CustomerDataRequestEdge>;
  CustomerDataRequestOrderByInput: CustomerDataRequestOrderByInput;
  CustomerDataRequestOrderField: CustomerDataRequestOrderField;
  CustomerDataRequestStatus: CustomerDataRequestStatus;
  CustomerDataRequestStatusFilter: CustomerDataRequestStatusFilter;
  CustomerDataRequestType: CustomerDataRequestType;
  CustomerDataRequestTypeFilter: CustomerDataRequestTypeFilter;
  CustomerDataRequestWhereInput: CustomerDataRequestWhereInput;
  CustomerEdge: ResolverTypeWrapper<CustomerEdge>;
  CustomerGroup: ResolverTypeWrapper<CustomerGroup>;
  CustomerGroupConnection: ResolverTypeWrapper<CustomerGroupConnection>;
  CustomerGroupCreateInput: CustomerGroupCreateInput;
  CustomerGroupCreatePayload: ResolverTypeWrapper<CustomerGroupCreatePayload>;
  CustomerGroupDeleteInput: CustomerGroupDeleteInput;
  CustomerGroupDeletePayload: ResolverTypeWrapper<CustomerGroupDeletePayload>;
  CustomerGroupEdge: ResolverTypeWrapper<CustomerGroupEdge>;
  CustomerGroupMembership: ResolverTypeWrapper<CustomerGroupMembership>;
  CustomerGroupMembershipConnection: ResolverTypeWrapper<CustomerGroupMembershipConnection>;
  CustomerGroupMembershipDeleteInput: CustomerGroupMembershipDeleteInput;
  CustomerGroupMembershipDeletePayload: ResolverTypeWrapper<CustomerGroupMembershipDeletePayload>;
  CustomerGroupMembershipEdge: ResolverTypeWrapper<CustomerGroupMembershipEdge>;
  CustomerGroupMembershipOrderByInput: CustomerGroupMembershipOrderByInput;
  CustomerGroupMembershipOrderField: CustomerGroupMembershipOrderField;
  CustomerGroupMembershipSetInput: CustomerGroupMembershipSetInput;
  CustomerGroupMembershipSetPayload: ResolverTypeWrapper<CustomerGroupMembershipSetPayload>;
  CustomerGroupMembershipWhereInput: CustomerGroupMembershipWhereInput;
  CustomerGroupOrderByInput: CustomerGroupOrderByInput;
  CustomerGroupOrderField: CustomerGroupOrderField;
  CustomerGroupUpdateInput: CustomerGroupUpdateInput;
  CustomerGroupUpdatePayload: ResolverTypeWrapper<CustomerGroupUpdatePayload>;
  CustomerGroupWhereInput: CustomerGroupWhereInput;
  CustomerLifecycleStatus: CustomerLifecycleStatus;
  CustomerLifecycleStatusFilter: CustomerLifecycleStatusFilter;
  CustomerMerge: ResolverTypeWrapper<CustomerMerge>;
  CustomerMergeConnection: ResolverTypeWrapper<CustomerMergeConnection>;
  CustomerMergeEdge: ResolverTypeWrapper<CustomerMergeEdge>;
  CustomerMergeOrderByInput: CustomerMergeOrderByInput;
  CustomerMergeOrderField: CustomerMergeOrderField;
  CustomerMergeRequestInput: CustomerMergeRequestInput;
  CustomerMergeRequestPayload: ResolverTypeWrapper<CustomerMergeRequestPayload>;
  CustomerMergeStatus: CustomerMergeStatus;
  CustomerMergeStatusFilter: CustomerMergeStatusFilter;
  CustomerMergeWhereInput: CustomerMergeWhereInput;
  CustomerMonetaryStatistics: ResolverTypeWrapper<CustomerMonetaryStatistics>;
  CustomerMonetaryStatisticsConnection: ResolverTypeWrapper<CustomerMonetaryStatisticsConnection>;
  CustomerMonetaryStatisticsEdge: ResolverTypeWrapper<CustomerMonetaryStatisticsEdge>;
  CustomerMonetaryStatisticsOrderByInput: CustomerMonetaryStatisticsOrderByInput;
  CustomerMonetaryStatisticsOrderField: CustomerMonetaryStatisticsOrderField;
  CustomerMonetaryStatisticsWhereInput: CustomerMonetaryStatisticsWhereInput;
  CustomerNoteUpdateInput: CustomerNoteUpdateInput;
  CustomerOperationResult: ResolverTypeWrapper<CustomerOperationResult>;
  CustomerOperationType: CustomerOperationType;
  CustomerOrderByInput: CustomerOrderByInput;
  CustomerOrderField: CustomerOrderField;
  CustomerProfileUpdateInput: CustomerProfileUpdateInput;
  CustomerSegment: ResolverTypeWrapper<CustomerSegment>;
  CustomerSegmentConnection: ResolverTypeWrapper<CustomerSegmentConnection>;
  CustomerSegmentCreateInput: CustomerSegmentCreateInput;
  CustomerSegmentCreatePayload: ResolverTypeWrapper<CustomerSegmentCreatePayload>;
  CustomerSegmentCustomersAddInput: CustomerSegmentCustomersAddInput;
  CustomerSegmentCustomersAddPayload: ResolverTypeWrapper<CustomerSegmentCustomersAddPayload>;
  CustomerSegmentCustomersRemoveInput: CustomerSegmentCustomersRemoveInput;
  CustomerSegmentCustomersRemovePayload: ResolverTypeWrapper<CustomerSegmentCustomersRemovePayload>;
  CustomerSegmentDeleteInput: CustomerSegmentDeleteInput;
  CustomerSegmentDeletePayload: ResolverTypeWrapper<CustomerSegmentDeletePayload>;
  CustomerSegmentEdge: ResolverTypeWrapper<CustomerSegmentEdge>;
  CustomerSegmentMembership: ResolverTypeWrapper<CustomerSegmentMembership>;
  CustomerSegmentMembershipConnection: ResolverTypeWrapper<CustomerSegmentMembershipConnection>;
  CustomerSegmentMembershipEdge: ResolverTypeWrapper<CustomerSegmentMembershipEdge>;
  CustomerSegmentMembershipOrderByInput: CustomerSegmentMembershipOrderByInput;
  CustomerSegmentMembershipOrderField: CustomerSegmentMembershipOrderField;
  CustomerSegmentMembershipWhereInput: CustomerSegmentMembershipWhereInput;
  CustomerSegmentOrderByInput: CustomerSegmentOrderByInput;
  CustomerSegmentOrderField: CustomerSegmentOrderField;
  CustomerSegmentStatus: CustomerSegmentStatus;
  CustomerSegmentStatusFilter: CustomerSegmentStatusFilter;
  CustomerSegmentType: CustomerSegmentType;
  CustomerSegmentTypeFilter: CustomerSegmentTypeFilter;
  CustomerSegmentUpdateInput: CustomerSegmentUpdateInput;
  CustomerSegmentUpdatePayload: ResolverTypeWrapper<CustomerSegmentUpdatePayload>;
  CustomerSegmentWhereInput: CustomerSegmentWhereInput;
  CustomerStatistics: ResolverTypeWrapper<CustomerStatistics>;
  CustomerStatusUpdateInput: CustomerStatusUpdateInput;
  CustomerTag: ResolverTypeWrapper<CustomerTag>;
  CustomerTagAssignInput: CustomerTagAssignInput;
  CustomerTagAssignPayload: ResolverTypeWrapper<CustomerTagAssignPayload>;
  CustomerTagAssignment: ResolverTypeWrapper<CustomerTagAssignment>;
  CustomerTagAssignmentConnection: ResolverTypeWrapper<CustomerTagAssignmentConnection>;
  CustomerTagAssignmentEdge: ResolverTypeWrapper<CustomerTagAssignmentEdge>;
  CustomerTagAssignmentOrderByInput: CustomerTagAssignmentOrderByInput;
  CustomerTagAssignmentOrderField: CustomerTagAssignmentOrderField;
  CustomerTagAssignmentWhereInput: CustomerTagAssignmentWhereInput;
  CustomerTagConnection: ResolverTypeWrapper<CustomerTagConnection>;
  CustomerTagCreateInput: CustomerTagCreateInput;
  CustomerTagCreatePayload: ResolverTypeWrapper<CustomerTagCreatePayload>;
  CustomerTagDeleteInput: CustomerTagDeleteInput;
  CustomerTagDeletePayload: ResolverTypeWrapper<CustomerTagDeletePayload>;
  CustomerTagEdge: ResolverTypeWrapper<CustomerTagEdge>;
  CustomerTagOrderByInput: CustomerTagOrderByInput;
  CustomerTagOrderField: CustomerTagOrderField;
  CustomerTagUnassignInput: CustomerTagUnassignInput;
  CustomerTagUnassignPayload: ResolverTypeWrapper<CustomerTagUnassignPayload>;
  CustomerTagUpdateInput: CustomerTagUpdateInput;
  CustomerTagUpdatePayload: ResolverTypeWrapper<CustomerTagUpdatePayload>;
  CustomerTagWhereInput: CustomerTagWhereInput;
  CustomerTaxExemption: ResolverTypeWrapper<CustomerTaxExemption>;
  CustomerTaxExemptionConnection: ResolverTypeWrapper<CustomerTaxExemptionConnection>;
  CustomerTaxExemptionCreateInput: CustomerTaxExemptionCreateInput;
  CustomerTaxExemptionCreatePayload: ResolverTypeWrapper<CustomerTaxExemptionCreatePayload>;
  CustomerTaxExemptionDeleteInput: CustomerTaxExemptionDeleteInput;
  CustomerTaxExemptionDeletePayload: ResolverTypeWrapper<CustomerTaxExemptionDeletePayload>;
  CustomerTaxExemptionEdge: ResolverTypeWrapper<CustomerTaxExemptionEdge>;
  CustomerTaxExemptionOrderByInput: CustomerTaxExemptionOrderByInput;
  CustomerTaxExemptionOrderField: CustomerTaxExemptionOrderField;
  CustomerTaxExemptionStatus: CustomerTaxExemptionStatus;
  CustomerTaxExemptionStatusFilter: CustomerTaxExemptionStatusFilter;
  CustomerTaxExemptionUpdateInput: CustomerTaxExemptionUpdateInput;
  CustomerTaxExemptionUpdatePayload: ResolverTypeWrapper<CustomerTaxExemptionUpdatePayload>;
  CustomerTaxExemptionWhereInput: CustomerTaxExemptionWhereInput;
  CustomerTaxIdentifier: ResolverTypeWrapper<CustomerTaxIdentifier>;
  CustomerTaxIdentifierConnection: ResolverTypeWrapper<CustomerTaxIdentifierConnection>;
  CustomerTaxIdentifierCreateInput: CustomerTaxIdentifierCreateInput;
  CustomerTaxIdentifierCreatePayload: ResolverTypeWrapper<CustomerTaxIdentifierCreatePayload>;
  CustomerTaxIdentifierDeleteInput: CustomerTaxIdentifierDeleteInput;
  CustomerTaxIdentifierDeletePayload: ResolverTypeWrapper<CustomerTaxIdentifierDeletePayload>;
  CustomerTaxIdentifierEdge: ResolverTypeWrapper<CustomerTaxIdentifierEdge>;
  CustomerTaxIdentifierOrderByInput: CustomerTaxIdentifierOrderByInput;
  CustomerTaxIdentifierOrderField: CustomerTaxIdentifierOrderField;
  CustomerTaxIdentifierStatus: CustomerTaxIdentifierStatus;
  CustomerTaxIdentifierStatusFilter: CustomerTaxIdentifierStatusFilter;
  CustomerTaxIdentifierUpdateInput: CustomerTaxIdentifierUpdateInput;
  CustomerTaxIdentifierUpdatePayload: ResolverTypeWrapper<CustomerTaxIdentifierUpdatePayload>;
  CustomerTaxIdentifierWhereInput: CustomerTaxIdentifierWhereInput;
  CustomerUpdateInput: CustomerUpdateInput;
  CustomerUpdatePayload: ResolverTypeWrapper<CustomerUpdatePayload>;
  CustomerWhereInput: CustomerWhereInput;
  CustomersMutation: ResolverTypeWrapper<CustomersMutation>;
  CustomersQuery: ResolverTypeWrapper<Omit<CustomersQuery, 'node' | 'nodes'> & { node?: Maybe<ResolversTypes['Node']>, nodes: Array<Maybe<ResolversTypes['Node']>> }>;
  Date: ResolverTypeWrapper<Scalars['Date']['output']>;
  DateFilter: DateFilter;
  DateTime: ResolverTypeWrapper<Scalars['DateTime']['output']>;
  DateTimeFilter: DateTimeFilter;
  DimensionUnit: DimensionUnit;
  Email: ResolverTypeWrapper<Scalars['Email']['output']>;
  File: ResolverTypeWrapper<File>;
  FloatFilter: FloatFilter;
  GenericUserError: ResolverTypeWrapper<GenericUserError>;
  IDFilter: IdFilter;
  IntFilter: IntFilter;
  JSON: ResolverTypeWrapper<Scalars['JSON']['output']>;
  LocaleCode: LocaleCode;
  Mutation: ResolverTypeWrapper<{}>;
  Node: ResolverTypeWrapper<ResolversInterfaceTypes<ResolversTypes>['Node']>;
  PageInfo: ResolverTypeWrapper<PageInfo>;
  Query: ResolverTypeWrapper<{}>;
  SortDirection: SortDirection;
  StringFilter: StringFilter;
  UserError: ResolverTypeWrapper<ResolversInterfaceTypes<ResolversTypes>['UserError']>;
  WeightUnit: WeightUnit;
  _CustomersGeneratedFilterPlaceholder: ResolverTypeWrapper<Scalars['_CustomersGeneratedFilterPlaceholder']['output']>;
}>;

/** Mapping between all available schema types and the resolvers parents */
export type ResolversParentTypes = ResolversObject<{
  BigInt: Scalars['BigInt']['output'];
  BigIntFilter: BigIntFilter;
  Boolean: Scalars['Boolean']['output'];
  BooleanFilter: BooleanFilter;
  Customer: Customer;
  String: Scalars['String']['output'];
  Int: Scalars['Int']['output'];
  ID: Scalars['ID']['output'];
  CustomerAccountStatusFilter: CustomerAccountStatusFilter;
  CustomerAddress: CustomerAddress;
  Float: Scalars['Float']['output'];
  CustomerAddressConnection: CustomerAddressConnection;
  CustomerAddressCreateInput: CustomerAddressCreateInput;
  CustomerAddressCreatePayload: CustomerAddressCreatePayload;
  CustomerAddressDefaultsUpdateInput: CustomerAddressDefaultsUpdateInput;
  CustomerAddressDefaultsUpdatePayload: CustomerAddressDefaultsUpdatePayload;
  CustomerAddressDeleteInput: CustomerAddressDeleteInput;
  CustomerAddressDeletePayload: CustomerAddressDeletePayload;
  CustomerAddressEdge: CustomerAddressEdge;
  CustomerAddressOrderByInput: CustomerAddressOrderByInput;
  CustomerAddressUpdateInput: CustomerAddressUpdateInput;
  CustomerAddressUpdatePayload: CustomerAddressUpdatePayload;
  CustomerAddressValidationStatusFilter: CustomerAddressValidationStatusFilter;
  CustomerAddressWhereInput: CustomerAddressWhereInput;
  CustomerAssignmentSourceFilter: CustomerAssignmentSourceFilter;
  CustomerCompanyUpdateInput: CustomerCompanyUpdateInput;
  CustomerConnection: CustomerConnection;
  CustomerConsent: CustomerConsent;
  CustomerConsentEvent: CustomerConsentEvent;
  CustomerConsentEventConnection: CustomerConsentEventConnection;
  CustomerConsentEventEdge: CustomerConsentEventEdge;
  CustomerConsentEventOrderByInput: CustomerConsentEventOrderByInput;
  CustomerConsentSetInput: CustomerConsentSetInput;
  CustomerConsentSetPayload: CustomerConsentSetPayload;
  CustomerConsentStateFilter: CustomerConsentStateFilter;
  CustomerContactUpdateInput: CustomerContactUpdateInput;
  CustomerCreateInput: CustomerCreateInput;
  CustomerCreatePayload: CustomerCreatePayload;
  CustomerDataRequest: CustomerDataRequest;
  CustomerDataRequestCancelInput: CustomerDataRequestCancelInput;
  CustomerDataRequestCancelPayload: CustomerDataRequestCancelPayload;
  CustomerDataRequestConnection: CustomerDataRequestConnection;
  CustomerDataRequestCreateInput: CustomerDataRequestCreateInput;
  CustomerDataRequestCreatePayload: CustomerDataRequestCreatePayload;
  CustomerDataRequestEdge: CustomerDataRequestEdge;
  CustomerDataRequestOrderByInput: CustomerDataRequestOrderByInput;
  CustomerDataRequestStatusFilter: CustomerDataRequestStatusFilter;
  CustomerDataRequestTypeFilter: CustomerDataRequestTypeFilter;
  CustomerDataRequestWhereInput: CustomerDataRequestWhereInput;
  CustomerEdge: CustomerEdge;
  CustomerGroup: CustomerGroup;
  CustomerGroupConnection: CustomerGroupConnection;
  CustomerGroupCreateInput: CustomerGroupCreateInput;
  CustomerGroupCreatePayload: CustomerGroupCreatePayload;
  CustomerGroupDeleteInput: CustomerGroupDeleteInput;
  CustomerGroupDeletePayload: CustomerGroupDeletePayload;
  CustomerGroupEdge: CustomerGroupEdge;
  CustomerGroupMembership: CustomerGroupMembership;
  CustomerGroupMembershipConnection: CustomerGroupMembershipConnection;
  CustomerGroupMembershipDeleteInput: CustomerGroupMembershipDeleteInput;
  CustomerGroupMembershipDeletePayload: CustomerGroupMembershipDeletePayload;
  CustomerGroupMembershipEdge: CustomerGroupMembershipEdge;
  CustomerGroupMembershipOrderByInput: CustomerGroupMembershipOrderByInput;
  CustomerGroupMembershipSetInput: CustomerGroupMembershipSetInput;
  CustomerGroupMembershipSetPayload: CustomerGroupMembershipSetPayload;
  CustomerGroupMembershipWhereInput: CustomerGroupMembershipWhereInput;
  CustomerGroupOrderByInput: CustomerGroupOrderByInput;
  CustomerGroupUpdateInput: CustomerGroupUpdateInput;
  CustomerGroupUpdatePayload: CustomerGroupUpdatePayload;
  CustomerGroupWhereInput: CustomerGroupWhereInput;
  CustomerLifecycleStatusFilter: CustomerLifecycleStatusFilter;
  CustomerMerge: CustomerMerge;
  CustomerMergeConnection: CustomerMergeConnection;
  CustomerMergeEdge: CustomerMergeEdge;
  CustomerMergeOrderByInput: CustomerMergeOrderByInput;
  CustomerMergeRequestInput: CustomerMergeRequestInput;
  CustomerMergeRequestPayload: CustomerMergeRequestPayload;
  CustomerMergeStatusFilter: CustomerMergeStatusFilter;
  CustomerMergeWhereInput: CustomerMergeWhereInput;
  CustomerMonetaryStatistics: CustomerMonetaryStatistics;
  CustomerMonetaryStatisticsConnection: CustomerMonetaryStatisticsConnection;
  CustomerMonetaryStatisticsEdge: CustomerMonetaryStatisticsEdge;
  CustomerMonetaryStatisticsOrderByInput: CustomerMonetaryStatisticsOrderByInput;
  CustomerMonetaryStatisticsWhereInput: CustomerMonetaryStatisticsWhereInput;
  CustomerNoteUpdateInput: CustomerNoteUpdateInput;
  CustomerOperationResult: CustomerOperationResult;
  CustomerOrderByInput: CustomerOrderByInput;
  CustomerProfileUpdateInput: CustomerProfileUpdateInput;
  CustomerSegment: CustomerSegment;
  CustomerSegmentConnection: CustomerSegmentConnection;
  CustomerSegmentCreateInput: CustomerSegmentCreateInput;
  CustomerSegmentCreatePayload: CustomerSegmentCreatePayload;
  CustomerSegmentCustomersAddInput: CustomerSegmentCustomersAddInput;
  CustomerSegmentCustomersAddPayload: CustomerSegmentCustomersAddPayload;
  CustomerSegmentCustomersRemoveInput: CustomerSegmentCustomersRemoveInput;
  CustomerSegmentCustomersRemovePayload: CustomerSegmentCustomersRemovePayload;
  CustomerSegmentDeleteInput: CustomerSegmentDeleteInput;
  CustomerSegmentDeletePayload: CustomerSegmentDeletePayload;
  CustomerSegmentEdge: CustomerSegmentEdge;
  CustomerSegmentMembership: CustomerSegmentMembership;
  CustomerSegmentMembershipConnection: CustomerSegmentMembershipConnection;
  CustomerSegmentMembershipEdge: CustomerSegmentMembershipEdge;
  CustomerSegmentMembershipOrderByInput: CustomerSegmentMembershipOrderByInput;
  CustomerSegmentMembershipWhereInput: CustomerSegmentMembershipWhereInput;
  CustomerSegmentOrderByInput: CustomerSegmentOrderByInput;
  CustomerSegmentStatusFilter: CustomerSegmentStatusFilter;
  CustomerSegmentTypeFilter: CustomerSegmentTypeFilter;
  CustomerSegmentUpdateInput: CustomerSegmentUpdateInput;
  CustomerSegmentUpdatePayload: CustomerSegmentUpdatePayload;
  CustomerSegmentWhereInput: CustomerSegmentWhereInput;
  CustomerStatistics: CustomerStatistics;
  CustomerStatusUpdateInput: CustomerStatusUpdateInput;
  CustomerTag: CustomerTag;
  CustomerTagAssignInput: CustomerTagAssignInput;
  CustomerTagAssignPayload: CustomerTagAssignPayload;
  CustomerTagAssignment: CustomerTagAssignment;
  CustomerTagAssignmentConnection: CustomerTagAssignmentConnection;
  CustomerTagAssignmentEdge: CustomerTagAssignmentEdge;
  CustomerTagAssignmentOrderByInput: CustomerTagAssignmentOrderByInput;
  CustomerTagAssignmentWhereInput: CustomerTagAssignmentWhereInput;
  CustomerTagConnection: CustomerTagConnection;
  CustomerTagCreateInput: CustomerTagCreateInput;
  CustomerTagCreatePayload: CustomerTagCreatePayload;
  CustomerTagDeleteInput: CustomerTagDeleteInput;
  CustomerTagDeletePayload: CustomerTagDeletePayload;
  CustomerTagEdge: CustomerTagEdge;
  CustomerTagOrderByInput: CustomerTagOrderByInput;
  CustomerTagUnassignInput: CustomerTagUnassignInput;
  CustomerTagUnassignPayload: CustomerTagUnassignPayload;
  CustomerTagUpdateInput: CustomerTagUpdateInput;
  CustomerTagUpdatePayload: CustomerTagUpdatePayload;
  CustomerTagWhereInput: CustomerTagWhereInput;
  CustomerTaxExemption: CustomerTaxExemption;
  CustomerTaxExemptionConnection: CustomerTaxExemptionConnection;
  CustomerTaxExemptionCreateInput: CustomerTaxExemptionCreateInput;
  CustomerTaxExemptionCreatePayload: CustomerTaxExemptionCreatePayload;
  CustomerTaxExemptionDeleteInput: CustomerTaxExemptionDeleteInput;
  CustomerTaxExemptionDeletePayload: CustomerTaxExemptionDeletePayload;
  CustomerTaxExemptionEdge: CustomerTaxExemptionEdge;
  CustomerTaxExemptionOrderByInput: CustomerTaxExemptionOrderByInput;
  CustomerTaxExemptionStatusFilter: CustomerTaxExemptionStatusFilter;
  CustomerTaxExemptionUpdateInput: CustomerTaxExemptionUpdateInput;
  CustomerTaxExemptionUpdatePayload: CustomerTaxExemptionUpdatePayload;
  CustomerTaxExemptionWhereInput: CustomerTaxExemptionWhereInput;
  CustomerTaxIdentifier: CustomerTaxIdentifier;
  CustomerTaxIdentifierConnection: CustomerTaxIdentifierConnection;
  CustomerTaxIdentifierCreateInput: CustomerTaxIdentifierCreateInput;
  CustomerTaxIdentifierCreatePayload: CustomerTaxIdentifierCreatePayload;
  CustomerTaxIdentifierDeleteInput: CustomerTaxIdentifierDeleteInput;
  CustomerTaxIdentifierDeletePayload: CustomerTaxIdentifierDeletePayload;
  CustomerTaxIdentifierEdge: CustomerTaxIdentifierEdge;
  CustomerTaxIdentifierOrderByInput: CustomerTaxIdentifierOrderByInput;
  CustomerTaxIdentifierStatusFilter: CustomerTaxIdentifierStatusFilter;
  CustomerTaxIdentifierUpdateInput: CustomerTaxIdentifierUpdateInput;
  CustomerTaxIdentifierUpdatePayload: CustomerTaxIdentifierUpdatePayload;
  CustomerTaxIdentifierWhereInput: CustomerTaxIdentifierWhereInput;
  CustomerUpdateInput: CustomerUpdateInput;
  CustomerUpdatePayload: CustomerUpdatePayload;
  CustomerWhereInput: CustomerWhereInput;
  CustomersMutation: CustomersMutation;
  CustomersQuery: Omit<CustomersQuery, 'node' | 'nodes'> & { node?: Maybe<ResolversParentTypes['Node']>, nodes: Array<Maybe<ResolversParentTypes['Node']>> };
  Date: Scalars['Date']['output'];
  DateFilter: DateFilter;
  DateTime: Scalars['DateTime']['output'];
  DateTimeFilter: DateTimeFilter;
  Email: Scalars['Email']['output'];
  File: File;
  FloatFilter: FloatFilter;
  GenericUserError: GenericUserError;
  IDFilter: IdFilter;
  IntFilter: IntFilter;
  JSON: Scalars['JSON']['output'];
  Mutation: {};
  Node: ResolversInterfaceTypes<ResolversParentTypes>['Node'];
  PageInfo: PageInfo;
  Query: {};
  StringFilter: StringFilter;
  UserError: ResolversInterfaceTypes<ResolversParentTypes>['UserError'];
  _CustomersGeneratedFilterPlaceholder: Scalars['_CustomersGeneratedFilterPlaceholder']['output'];
}>;

export interface BigIntScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['BigInt'], any> {
  name: 'BigInt';
}

export type CustomerResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['Customer'] = ResolversParentTypes['Customer']> = ResolversObject<{
  __resolveReference?: ReferenceResolver<Maybe<ResolversTypes['Customer']>, { __typename: 'Customer' } & GraphQLRecursivePick<ParentType, {"id":true}>, ContextType>;
  accountStatus?: Resolver<ResolversTypes['CustomerAccountStatus'], ParentType, ContextType>;
  addresses?: Resolver<ResolversTypes['CustomerAddressConnection'], ParentType, ContextType, Partial<CustomerAddressesArgs>>;
  companyName?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  consents?: Resolver<Array<ResolversTypes['CustomerConsent']>, ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  createdByUserId?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  dateOfBirth?: Resolver<Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  defaultBillingAddress?: Resolver<Maybe<ResolversTypes['CustomerAddress']>, ParentType, ContextType>;
  defaultShippingAddress?: Resolver<Maybe<ResolversTypes['CustomerAddress']>, ParentType, ContextType>;
  deletedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  displayName?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  email?: Resolver<Maybe<ResolversTypes['Email']>, ParentType, ContextType>;
  emailVerified?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  firstName?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  gender?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  groupMemberships?: Resolver<ResolversTypes['CustomerGroupMembershipConnection'], ParentType, ContextType, Partial<CustomerGroupMembershipsArgs>>;
  iamPrincipalId?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  jobTitle?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  lastActivityAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  lastName?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  lifecycleStatus?: Resolver<ResolversTypes['CustomerLifecycleStatus'], ParentType, ContextType>;
  mergedInto?: Resolver<Maybe<ResolversTypes['Customer']>, ParentType, ContextType>;
  middleName?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  monetaryStatistics?: Resolver<ResolversTypes['CustomerMonetaryStatisticsConnection'], ParentType, ContextType, Partial<CustomerMonetaryStatisticsArgs>>;
  note?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  phoneE164?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  phoneVerified?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  preferredLocale?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  prefix?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  redactedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  revision?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  segmentMemberships?: Resolver<ResolversTypes['CustomerSegmentMembershipConnection'], ParentType, ContextType, Partial<CustomerSegmentMembershipsArgs>>;
  source?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  statistics?: Resolver<Maybe<ResolversTypes['CustomerStatistics']>, ParentType, ContextType>;
  suffix?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  tagAssignments?: Resolver<ResolversTypes['CustomerTagAssignmentConnection'], ParentType, ContextType, Partial<CustomerTagAssignmentsArgs>>;
  taxExemptions?: Resolver<ResolversTypes['CustomerTaxExemptionConnection'], ParentType, ContextType, Partial<CustomerTaxExemptionsArgs>>;
  taxIdentifiers?: Resolver<ResolversTypes['CustomerTaxIdentifierConnection'], ParentType, ContextType, Partial<CustomerTaxIdentifiersArgs>>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CustomerAddressResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CustomerAddress'] = ResolversParentTypes['CustomerAddress']> = ResolversObject<{
  address1?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  address2?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  city?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  companyName?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  countryCode?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  customer?: Resolver<ResolversTypes['Customer'], ParentType, ContextType>;
  deletedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  firstName?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  isDefaultBilling?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  isDefaultShipping?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  label?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  lastName?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  latitude?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>;
  longitude?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>;
  middleName?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  phoneE164?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  postalCode?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  prefix?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  regionCode?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  regionName?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  suffix?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  validatedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  validationStatus?: Resolver<ResolversTypes['CustomerAddressValidationStatus'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CustomerAddressConnectionResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CustomerAddressConnection'] = ResolversParentTypes['CustomerAddressConnection']> = ResolversObject<{
  edges?: Resolver<Array<ResolversTypes['CustomerAddressEdge']>, ParentType, ContextType>;
  pageInfo?: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CustomerAddressCreatePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CustomerAddressCreatePayload'] = ResolversParentTypes['CustomerAddressCreatePayload']> = ResolversObject<{
  address?: Resolver<Maybe<ResolversTypes['CustomerAddress']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CustomerAddressDefaultsUpdatePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CustomerAddressDefaultsUpdatePayload'] = ResolversParentTypes['CustomerAddressDefaultsUpdatePayload']> = ResolversObject<{
  customer?: Resolver<Maybe<ResolversTypes['Customer']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CustomerAddressDeletePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CustomerAddressDeletePayload'] = ResolversParentTypes['CustomerAddressDeletePayload']> = ResolversObject<{
  deletedAddressId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CustomerAddressEdgeResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CustomerAddressEdge'] = ResolversParentTypes['CustomerAddressEdge']> = ResolversObject<{
  cursor?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  node?: Resolver<ResolversTypes['CustomerAddress'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CustomerAddressUpdatePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CustomerAddressUpdatePayload'] = ResolversParentTypes['CustomerAddressUpdatePayload']> = ResolversObject<{
  address?: Resolver<Maybe<ResolversTypes['CustomerAddress']>, ParentType, ContextType>;
  operationResults?: Resolver<Array<ResolversTypes['CustomerOperationResult']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CustomerConnectionResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CustomerConnection'] = ResolversParentTypes['CustomerConnection']> = ResolversObject<{
  edges?: Resolver<Array<ResolversTypes['CustomerEdge']>, ParentType, ContextType>;
  pageInfo?: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CustomerConsentResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CustomerConsent'] = ResolversParentTypes['CustomerConsent']> = ResolversObject<{
  channel?: Resolver<ResolversTypes['CustomerConsentChannel'], ParentType, ContextType>;
  consentedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  contactPoint?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  customer?: Resolver<ResolversTypes['Customer'], ParentType, ContextType>;
  events?: Resolver<ResolversTypes['CustomerConsentEventConnection'], ParentType, ContextType, Partial<CustomerConsentEventsArgs>>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  optInLevel?: Resolver<ResolversTypes['CustomerConsentOptInLevel'], ParentType, ContextType>;
  source?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  sourceIp?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  sourceLocationId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  state?: Resolver<ResolversTypes['CustomerConsentState'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  userAgent?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  withdrawnAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CustomerConsentEventResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CustomerConsentEvent'] = ResolversParentTypes['CustomerConsentEvent']> = ResolversObject<{
  actorId?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  actorType?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  channel?: Resolver<ResolversTypes['CustomerConsentChannel'], ParentType, ContextType>;
  consent?: Resolver<ResolversTypes['CustomerConsent'], ParentType, ContextType>;
  contactPoint?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  customer?: Resolver<ResolversTypes['Customer'], ParentType, ContextType>;
  evidence?: Resolver<ResolversTypes['JSON'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  idempotencyKey?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  newState?: Resolver<ResolversTypes['CustomerConsentState'], ParentType, ContextType>;
  occurredAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  optInLevel?: Resolver<ResolversTypes['CustomerConsentOptInLevel'], ParentType, ContextType>;
  previousState?: Resolver<Maybe<ResolversTypes['CustomerConsentState']>, ParentType, ContextType>;
  requestId?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  source?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  sourceIp?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  sourceLocationId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  userAgent?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CustomerConsentEventConnectionResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CustomerConsentEventConnection'] = ResolversParentTypes['CustomerConsentEventConnection']> = ResolversObject<{
  edges?: Resolver<Array<ResolversTypes['CustomerConsentEventEdge']>, ParentType, ContextType>;
  pageInfo?: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CustomerConsentEventEdgeResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CustomerConsentEventEdge'] = ResolversParentTypes['CustomerConsentEventEdge']> = ResolversObject<{
  cursor?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  node?: Resolver<ResolversTypes['CustomerConsentEvent'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CustomerConsentSetPayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CustomerConsentSetPayload'] = ResolversParentTypes['CustomerConsentSetPayload']> = ResolversObject<{
  consent?: Resolver<Maybe<ResolversTypes['CustomerConsent']>, ParentType, ContextType>;
  event?: Resolver<Maybe<ResolversTypes['CustomerConsentEvent']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CustomerCreatePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CustomerCreatePayload'] = ResolversParentTypes['CustomerCreatePayload']> = ResolversObject<{
  customer?: Resolver<Maybe<ResolversTypes['Customer']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CustomerDataRequestResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CustomerDataRequest'] = ResolversParentTypes['CustomerDataRequest']> = ResolversObject<{
  customer?: Resolver<ResolversTypes['Customer'], ParentType, ContextType>;
  dueAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  finishedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  idempotencyKey?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  legalBasis?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  rejectionReason?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  requestMetadata?: Resolver<ResolversTypes['JSON'], ParentType, ContextType>;
  requestedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  requestedById?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  requestedByType?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  resultFile?: Resolver<Maybe<ResolversTypes['File']>, ParentType, ContextType>;
  resultFileId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  startedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  status?: Resolver<ResolversTypes['CustomerDataRequestStatus'], ParentType, ContextType>;
  type?: Resolver<ResolversTypes['CustomerDataRequestType'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CustomerDataRequestCancelPayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CustomerDataRequestCancelPayload'] = ResolversParentTypes['CustomerDataRequestCancelPayload']> = ResolversObject<{
  dataRequest?: Resolver<Maybe<ResolversTypes['CustomerDataRequest']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CustomerDataRequestConnectionResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CustomerDataRequestConnection'] = ResolversParentTypes['CustomerDataRequestConnection']> = ResolversObject<{
  edges?: Resolver<Array<ResolversTypes['CustomerDataRequestEdge']>, ParentType, ContextType>;
  pageInfo?: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CustomerDataRequestCreatePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CustomerDataRequestCreatePayload'] = ResolversParentTypes['CustomerDataRequestCreatePayload']> = ResolversObject<{
  dataRequest?: Resolver<Maybe<ResolversTypes['CustomerDataRequest']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CustomerDataRequestEdgeResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CustomerDataRequestEdge'] = ResolversParentTypes['CustomerDataRequestEdge']> = ResolversObject<{
  cursor?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  node?: Resolver<ResolversTypes['CustomerDataRequest'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CustomerEdgeResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CustomerEdge'] = ResolversParentTypes['CustomerEdge']> = ResolversObject<{
  cursor?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  node?: Resolver<ResolversTypes['Customer'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CustomerGroupResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CustomerGroup'] = ResolversParentTypes['CustomerGroup']> = ResolversObject<{
  code?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  customerMemberships?: Resolver<ResolversTypes['CustomerGroupMembershipConnection'], ParentType, ContextType, Partial<CustomerGroupCustomerMembershipsArgs>>;
  customersCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  deletedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  description?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  isActive?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  isDefault?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CustomerGroupConnectionResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CustomerGroupConnection'] = ResolversParentTypes['CustomerGroupConnection']> = ResolversObject<{
  edges?: Resolver<Array<ResolversTypes['CustomerGroupEdge']>, ParentType, ContextType>;
  pageInfo?: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CustomerGroupCreatePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CustomerGroupCreatePayload'] = ResolversParentTypes['CustomerGroupCreatePayload']> = ResolversObject<{
  group?: Resolver<Maybe<ResolversTypes['CustomerGroup']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CustomerGroupDeletePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CustomerGroupDeletePayload'] = ResolversParentTypes['CustomerGroupDeletePayload']> = ResolversObject<{
  deletedGroupId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CustomerGroupEdgeResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CustomerGroupEdge'] = ResolversParentTypes['CustomerGroupEdge']> = ResolversObject<{
  cursor?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  node?: Resolver<ResolversTypes['CustomerGroup'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CustomerGroupMembershipResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CustomerGroupMembership'] = ResolversParentTypes['CustomerGroupMembership']> = ResolversObject<{
  assignedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  assignedById?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  customer?: Resolver<ResolversTypes['Customer'], ParentType, ContextType>;
  expiresAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  group?: Resolver<ResolversTypes['CustomerGroup'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  isActive?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  isPrimary?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  source?: Resolver<ResolversTypes['CustomerAssignmentSource'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CustomerGroupMembershipConnectionResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CustomerGroupMembershipConnection'] = ResolversParentTypes['CustomerGroupMembershipConnection']> = ResolversObject<{
  edges?: Resolver<Array<ResolversTypes['CustomerGroupMembershipEdge']>, ParentType, ContextType>;
  pageInfo?: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CustomerGroupMembershipDeletePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CustomerGroupMembershipDeletePayload'] = ResolversParentTypes['CustomerGroupMembershipDeletePayload']> = ResolversObject<{
  deletedMembershipId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CustomerGroupMembershipEdgeResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CustomerGroupMembershipEdge'] = ResolversParentTypes['CustomerGroupMembershipEdge']> = ResolversObject<{
  cursor?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  node?: Resolver<ResolversTypes['CustomerGroupMembership'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CustomerGroupMembershipSetPayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CustomerGroupMembershipSetPayload'] = ResolversParentTypes['CustomerGroupMembershipSetPayload']> = ResolversObject<{
  membership?: Resolver<Maybe<ResolversTypes['CustomerGroupMembership']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CustomerGroupUpdatePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CustomerGroupUpdatePayload'] = ResolversParentTypes['CustomerGroupUpdatePayload']> = ResolversObject<{
  group?: Resolver<Maybe<ResolversTypes['CustomerGroup']>, ParentType, ContextType>;
  operationResults?: Resolver<Array<ResolversTypes['CustomerOperationResult']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CustomerMergeResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CustomerMerge'] = ResolversParentTypes['CustomerMerge']> = ResolversObject<{
  errorCode?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  errorMessage?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  finishedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  idempotencyKey?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  reason?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  requestedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  requestedById?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  requestedByType?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  resolution?: Resolver<ResolversTypes['JSON'], ParentType, ContextType>;
  sourceCustomer?: Resolver<ResolversTypes['Customer'], ParentType, ContextType>;
  startedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  status?: Resolver<ResolversTypes['CustomerMergeStatus'], ParentType, ContextType>;
  targetCustomer?: Resolver<ResolversTypes['Customer'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CustomerMergeConnectionResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CustomerMergeConnection'] = ResolversParentTypes['CustomerMergeConnection']> = ResolversObject<{
  edges?: Resolver<Array<ResolversTypes['CustomerMergeEdge']>, ParentType, ContextType>;
  pageInfo?: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CustomerMergeEdgeResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CustomerMergeEdge'] = ResolversParentTypes['CustomerMergeEdge']> = ResolversObject<{
  cursor?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  node?: Resolver<ResolversTypes['CustomerMerge'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CustomerMergeRequestPayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CustomerMergeRequestPayload'] = ResolversParentTypes['CustomerMergeRequestPayload']> = ResolversObject<{
  merge?: Resolver<Maybe<ResolversTypes['CustomerMerge']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CustomerMonetaryStatisticsResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CustomerMonetaryStatistics'] = ResolversParentTypes['CustomerMonetaryStatistics']> = ResolversObject<{
  averageOrderValueMinor?: Resolver<ResolversTypes['BigInt'], ParentType, ContextType>;
  currencyCode?: Resolver<ResolversTypes['CurrencyCode'], ParentType, ContextType>;
  customer?: Resolver<ResolversTypes['Customer'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  netSpentMinor?: Resolver<ResolversTypes['BigInt'], ParentType, ContextType>;
  ordersCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  totalRefundedMinor?: Resolver<ResolversTypes['BigInt'], ParentType, ContextType>;
  totalSpentMinor?: Resolver<ResolversTypes['BigInt'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CustomerMonetaryStatisticsConnectionResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CustomerMonetaryStatisticsConnection'] = ResolversParentTypes['CustomerMonetaryStatisticsConnection']> = ResolversObject<{
  edges?: Resolver<Array<ResolversTypes['CustomerMonetaryStatisticsEdge']>, ParentType, ContextType>;
  pageInfo?: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CustomerMonetaryStatisticsEdgeResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CustomerMonetaryStatisticsEdge'] = ResolversParentTypes['CustomerMonetaryStatisticsEdge']> = ResolversObject<{
  cursor?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  node?: Resolver<ResolversTypes['CustomerMonetaryStatistics'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CustomerOperationResultResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CustomerOperationResult'] = ResolversParentTypes['CustomerOperationResult']> = ResolversObject<{
  applied?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  errors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  type?: Resolver<ResolversTypes['CustomerOperationType'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CustomerSegmentResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CustomerSegment'] = ResolversParentTypes['CustomerSegment']> = ResolversObject<{
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  createdById?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  customerMemberships?: Resolver<ResolversTypes['CustomerSegmentMembershipConnection'], ParentType, ContextType, Partial<CustomerSegmentCustomerMembershipsArgs>>;
  customersCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  definition?: Resolver<ResolversTypes['JSON'], ParentType, ContextType>;
  deletedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  description?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  query?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  status?: Resolver<ResolversTypes['CustomerSegmentStatus'], ParentType, ContextType>;
  type?: Resolver<ResolversTypes['CustomerSegmentType'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CustomerSegmentConnectionResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CustomerSegmentConnection'] = ResolversParentTypes['CustomerSegmentConnection']> = ResolversObject<{
  edges?: Resolver<Array<ResolversTypes['CustomerSegmentEdge']>, ParentType, ContextType>;
  pageInfo?: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CustomerSegmentCreatePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CustomerSegmentCreatePayload'] = ResolversParentTypes['CustomerSegmentCreatePayload']> = ResolversObject<{
  segment?: Resolver<Maybe<ResolversTypes['CustomerSegment']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CustomerSegmentCustomersAddPayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CustomerSegmentCustomersAddPayload'] = ResolversParentTypes['CustomerSegmentCustomersAddPayload']> = ResolversObject<{
  customers?: Resolver<Array<ResolversTypes['Customer']>, ParentType, ContextType>;
  segment?: Resolver<Maybe<ResolversTypes['CustomerSegment']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CustomerSegmentCustomersRemovePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CustomerSegmentCustomersRemovePayload'] = ResolversParentTypes['CustomerSegmentCustomersRemovePayload']> = ResolversObject<{
  removedCustomerIds?: Resolver<Array<ResolversTypes['ID']>, ParentType, ContextType>;
  segment?: Resolver<Maybe<ResolversTypes['CustomerSegment']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CustomerSegmentDeletePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CustomerSegmentDeletePayload'] = ResolversParentTypes['CustomerSegmentDeletePayload']> = ResolversObject<{
  deletedSegmentId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CustomerSegmentEdgeResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CustomerSegmentEdge'] = ResolversParentTypes['CustomerSegmentEdge']> = ResolversObject<{
  cursor?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  node?: Resolver<ResolversTypes['CustomerSegment'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CustomerSegmentMembershipResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CustomerSegmentMembership'] = ResolversParentTypes['CustomerSegmentMembership']> = ResolversObject<{
  customer?: Resolver<ResolversTypes['Customer'], ParentType, ContextType>;
  evaluatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  expiresAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  isActive?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  segment?: Resolver<ResolversTypes['CustomerSegment'], ParentType, ContextType>;
  source?: Resolver<ResolversTypes['CustomerAssignmentSource'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CustomerSegmentMembershipConnectionResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CustomerSegmentMembershipConnection'] = ResolversParentTypes['CustomerSegmentMembershipConnection']> = ResolversObject<{
  edges?: Resolver<Array<ResolversTypes['CustomerSegmentMembershipEdge']>, ParentType, ContextType>;
  pageInfo?: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CustomerSegmentMembershipEdgeResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CustomerSegmentMembershipEdge'] = ResolversParentTypes['CustomerSegmentMembershipEdge']> = ResolversObject<{
  cursor?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  node?: Resolver<ResolversTypes['CustomerSegmentMembership'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CustomerSegmentUpdatePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CustomerSegmentUpdatePayload'] = ResolversParentTypes['CustomerSegmentUpdatePayload']> = ResolversObject<{
  operationResults?: Resolver<Array<ResolversTypes['CustomerOperationResult']>, ParentType, ContextType>;
  segment?: Resolver<Maybe<ResolversTypes['CustomerSegment']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CustomerStatisticsResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CustomerStatistics'] = ResolversParentTypes['CustomerStatistics']> = ResolversObject<{
  cancelledOrdersCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  completedOrdersCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  customer?: Resolver<ResolversTypes['Customer'], ParentType, ContextType>;
  firstOrderAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  firstOrderId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  lastCheckoutAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  lastOrderAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  lastOrderId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  ordersCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  returnsCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CustomerTagResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CustomerTag'] = ResolversParentTypes['CustomerTag']> = ResolversObject<{
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  customerAssignments?: Resolver<ResolversTypes['CustomerTagAssignmentConnection'], ParentType, ContextType, Partial<CustomerTagCustomerAssignmentsArgs>>;
  customersCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  deletedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  normalizedName?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CustomerTagAssignPayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CustomerTagAssignPayload'] = ResolversParentTypes['CustomerTagAssignPayload']> = ResolversObject<{
  assignment?: Resolver<Maybe<ResolversTypes['CustomerTagAssignment']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CustomerTagAssignmentResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CustomerTagAssignment'] = ResolversParentTypes['CustomerTagAssignment']> = ResolversObject<{
  assignedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  assignedById?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  customer?: Resolver<ResolversTypes['Customer'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  tag?: Resolver<ResolversTypes['CustomerTag'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CustomerTagAssignmentConnectionResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CustomerTagAssignmentConnection'] = ResolversParentTypes['CustomerTagAssignmentConnection']> = ResolversObject<{
  edges?: Resolver<Array<ResolversTypes['CustomerTagAssignmentEdge']>, ParentType, ContextType>;
  pageInfo?: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CustomerTagAssignmentEdgeResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CustomerTagAssignmentEdge'] = ResolversParentTypes['CustomerTagAssignmentEdge']> = ResolversObject<{
  cursor?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  node?: Resolver<ResolversTypes['CustomerTagAssignment'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CustomerTagConnectionResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CustomerTagConnection'] = ResolversParentTypes['CustomerTagConnection']> = ResolversObject<{
  edges?: Resolver<Array<ResolversTypes['CustomerTagEdge']>, ParentType, ContextType>;
  pageInfo?: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CustomerTagCreatePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CustomerTagCreatePayload'] = ResolversParentTypes['CustomerTagCreatePayload']> = ResolversObject<{
  tag?: Resolver<Maybe<ResolversTypes['CustomerTag']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CustomerTagDeletePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CustomerTagDeletePayload'] = ResolversParentTypes['CustomerTagDeletePayload']> = ResolversObject<{
  deletedTagId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CustomerTagEdgeResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CustomerTagEdge'] = ResolversParentTypes['CustomerTagEdge']> = ResolversObject<{
  cursor?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  node?: Resolver<ResolversTypes['CustomerTag'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CustomerTagUnassignPayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CustomerTagUnassignPayload'] = ResolversParentTypes['CustomerTagUnassignPayload']> = ResolversObject<{
  deletedAssignmentId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CustomerTagUpdatePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CustomerTagUpdatePayload'] = ResolversParentTypes['CustomerTagUpdatePayload']> = ResolversObject<{
  operationResults?: Resolver<Array<ResolversTypes['CustomerOperationResult']>, ParentType, ContextType>;
  tag?: Resolver<Maybe<ResolversTypes['CustomerTag']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CustomerTaxExemptionResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CustomerTaxExemption'] = ResolversParentTypes['CustomerTaxExemption']> = ResolversObject<{
  certificateFile?: Resolver<Maybe<ResolversTypes['File']>, ParentType, ContextType>;
  certificateFileId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  code?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  countryCode?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  customer?: Resolver<ResolversTypes['Customer'], ParentType, ContextType>;
  deletedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  reason?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  regionCode?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  status?: Resolver<ResolversTypes['CustomerTaxExemptionStatus'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  validFrom?: Resolver<Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  validTo?: Resolver<Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CustomerTaxExemptionConnectionResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CustomerTaxExemptionConnection'] = ResolversParentTypes['CustomerTaxExemptionConnection']> = ResolversObject<{
  edges?: Resolver<Array<ResolversTypes['CustomerTaxExemptionEdge']>, ParentType, ContextType>;
  pageInfo?: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CustomerTaxExemptionCreatePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CustomerTaxExemptionCreatePayload'] = ResolversParentTypes['CustomerTaxExemptionCreatePayload']> = ResolversObject<{
  taxExemption?: Resolver<Maybe<ResolversTypes['CustomerTaxExemption']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CustomerTaxExemptionDeletePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CustomerTaxExemptionDeletePayload'] = ResolversParentTypes['CustomerTaxExemptionDeletePayload']> = ResolversObject<{
  deletedTaxExemptionId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CustomerTaxExemptionEdgeResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CustomerTaxExemptionEdge'] = ResolversParentTypes['CustomerTaxExemptionEdge']> = ResolversObject<{
  cursor?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  node?: Resolver<ResolversTypes['CustomerTaxExemption'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CustomerTaxExemptionUpdatePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CustomerTaxExemptionUpdatePayload'] = ResolversParentTypes['CustomerTaxExemptionUpdatePayload']> = ResolversObject<{
  operationResults?: Resolver<Array<ResolversTypes['CustomerOperationResult']>, ParentType, ContextType>;
  taxExemption?: Resolver<Maybe<ResolversTypes['CustomerTaxExemption']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CustomerTaxIdentifierResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CustomerTaxIdentifier'] = ResolversParentTypes['CustomerTaxIdentifier']> = ResolversObject<{
  countryCode?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  customer?: Resolver<ResolversTypes['Customer'], ParentType, ContextType>;
  deletedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  identifierType?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  isPrimary?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  normalizedValue?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  status?: Resolver<ResolversTypes['CustomerTaxIdentifierStatus'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  validFrom?: Resolver<Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  validTo?: Resolver<Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  value?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  verifiedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CustomerTaxIdentifierConnectionResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CustomerTaxIdentifierConnection'] = ResolversParentTypes['CustomerTaxIdentifierConnection']> = ResolversObject<{
  edges?: Resolver<Array<ResolversTypes['CustomerTaxIdentifierEdge']>, ParentType, ContextType>;
  pageInfo?: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CustomerTaxIdentifierCreatePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CustomerTaxIdentifierCreatePayload'] = ResolversParentTypes['CustomerTaxIdentifierCreatePayload']> = ResolversObject<{
  taxIdentifier?: Resolver<Maybe<ResolversTypes['CustomerTaxIdentifier']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CustomerTaxIdentifierDeletePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CustomerTaxIdentifierDeletePayload'] = ResolversParentTypes['CustomerTaxIdentifierDeletePayload']> = ResolversObject<{
  deletedTaxIdentifierId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CustomerTaxIdentifierEdgeResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CustomerTaxIdentifierEdge'] = ResolversParentTypes['CustomerTaxIdentifierEdge']> = ResolversObject<{
  cursor?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  node?: Resolver<ResolversTypes['CustomerTaxIdentifier'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CustomerTaxIdentifierUpdatePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CustomerTaxIdentifierUpdatePayload'] = ResolversParentTypes['CustomerTaxIdentifierUpdatePayload']> = ResolversObject<{
  operationResults?: Resolver<Array<ResolversTypes['CustomerOperationResult']>, ParentType, ContextType>;
  taxIdentifier?: Resolver<Maybe<ResolversTypes['CustomerTaxIdentifier']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CustomerUpdatePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CustomerUpdatePayload'] = ResolversParentTypes['CustomerUpdatePayload']> = ResolversObject<{
  customer?: Resolver<Maybe<ResolversTypes['Customer']>, ParentType, ContextType>;
  operationResults?: Resolver<Array<ResolversTypes['CustomerOperationResult']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CustomersMutationResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CustomersMutation'] = ResolversParentTypes['CustomersMutation']> = ResolversObject<{
  customerAddressCreate?: Resolver<ResolversTypes['CustomerAddressCreatePayload'], ParentType, ContextType, RequireFields<CustomersMutationCustomerAddressCreateArgs, 'input'>>;
  customerAddressDefaultsUpdate?: Resolver<ResolversTypes['CustomerAddressDefaultsUpdatePayload'], ParentType, ContextType, RequireFields<CustomersMutationCustomerAddressDefaultsUpdateArgs, 'input'>>;
  customerAddressDelete?: Resolver<ResolversTypes['CustomerAddressDeletePayload'], ParentType, ContextType, RequireFields<CustomersMutationCustomerAddressDeleteArgs, 'input'>>;
  customerAddressUpdate?: Resolver<ResolversTypes['CustomerAddressUpdatePayload'], ParentType, ContextType, RequireFields<CustomersMutationCustomerAddressUpdateArgs, 'addressId'>>;
  customerConsentSet?: Resolver<ResolversTypes['CustomerConsentSetPayload'], ParentType, ContextType, RequireFields<CustomersMutationCustomerConsentSetArgs, 'input'>>;
  customerCreate?: Resolver<ResolversTypes['CustomerCreatePayload'], ParentType, ContextType, RequireFields<CustomersMutationCustomerCreateArgs, 'input'>>;
  customerDataRequestCancel?: Resolver<ResolversTypes['CustomerDataRequestCancelPayload'], ParentType, ContextType, RequireFields<CustomersMutationCustomerDataRequestCancelArgs, 'input'>>;
  customerDataRequestCreate?: Resolver<ResolversTypes['CustomerDataRequestCreatePayload'], ParentType, ContextType, RequireFields<CustomersMutationCustomerDataRequestCreateArgs, 'input'>>;
  customerGroupCreate?: Resolver<ResolversTypes['CustomerGroupCreatePayload'], ParentType, ContextType, RequireFields<CustomersMutationCustomerGroupCreateArgs, 'input'>>;
  customerGroupDelete?: Resolver<ResolversTypes['CustomerGroupDeletePayload'], ParentType, ContextType, RequireFields<CustomersMutationCustomerGroupDeleteArgs, 'input'>>;
  customerGroupMembershipDelete?: Resolver<ResolversTypes['CustomerGroupMembershipDeletePayload'], ParentType, ContextType, RequireFields<CustomersMutationCustomerGroupMembershipDeleteArgs, 'input'>>;
  customerGroupMembershipSet?: Resolver<ResolversTypes['CustomerGroupMembershipSetPayload'], ParentType, ContextType, RequireFields<CustomersMutationCustomerGroupMembershipSetArgs, 'input'>>;
  customerGroupUpdate?: Resolver<ResolversTypes['CustomerGroupUpdatePayload'], ParentType, ContextType, RequireFields<CustomersMutationCustomerGroupUpdateArgs, 'groupId'>>;
  customerMergeRequest?: Resolver<ResolversTypes['CustomerMergeRequestPayload'], ParentType, ContextType, RequireFields<CustomersMutationCustomerMergeRequestArgs, 'input'>>;
  customerSegmentCreate?: Resolver<ResolversTypes['CustomerSegmentCreatePayload'], ParentType, ContextType, RequireFields<CustomersMutationCustomerSegmentCreateArgs, 'input'>>;
  customerSegmentCustomersAdd?: Resolver<ResolversTypes['CustomerSegmentCustomersAddPayload'], ParentType, ContextType, RequireFields<CustomersMutationCustomerSegmentCustomersAddArgs, 'input'>>;
  customerSegmentCustomersRemove?: Resolver<ResolversTypes['CustomerSegmentCustomersRemovePayload'], ParentType, ContextType, RequireFields<CustomersMutationCustomerSegmentCustomersRemoveArgs, 'input'>>;
  customerSegmentDelete?: Resolver<ResolversTypes['CustomerSegmentDeletePayload'], ParentType, ContextType, RequireFields<CustomersMutationCustomerSegmentDeleteArgs, 'input'>>;
  customerSegmentUpdate?: Resolver<ResolversTypes['CustomerSegmentUpdatePayload'], ParentType, ContextType, RequireFields<CustomersMutationCustomerSegmentUpdateArgs, 'segmentId'>>;
  customerTagAssign?: Resolver<ResolversTypes['CustomerTagAssignPayload'], ParentType, ContextType, RequireFields<CustomersMutationCustomerTagAssignArgs, 'input'>>;
  customerTagCreate?: Resolver<ResolversTypes['CustomerTagCreatePayload'], ParentType, ContextType, RequireFields<CustomersMutationCustomerTagCreateArgs, 'input'>>;
  customerTagDelete?: Resolver<ResolversTypes['CustomerTagDeletePayload'], ParentType, ContextType, RequireFields<CustomersMutationCustomerTagDeleteArgs, 'input'>>;
  customerTagUnassign?: Resolver<ResolversTypes['CustomerTagUnassignPayload'], ParentType, ContextType, RequireFields<CustomersMutationCustomerTagUnassignArgs, 'input'>>;
  customerTagUpdate?: Resolver<ResolversTypes['CustomerTagUpdatePayload'], ParentType, ContextType, RequireFields<CustomersMutationCustomerTagUpdateArgs, 'tagId'>>;
  customerTaxExemptionCreate?: Resolver<ResolversTypes['CustomerTaxExemptionCreatePayload'], ParentType, ContextType, RequireFields<CustomersMutationCustomerTaxExemptionCreateArgs, 'input'>>;
  customerTaxExemptionDelete?: Resolver<ResolversTypes['CustomerTaxExemptionDeletePayload'], ParentType, ContextType, RequireFields<CustomersMutationCustomerTaxExemptionDeleteArgs, 'input'>>;
  customerTaxExemptionUpdate?: Resolver<ResolversTypes['CustomerTaxExemptionUpdatePayload'], ParentType, ContextType, RequireFields<CustomersMutationCustomerTaxExemptionUpdateArgs, 'taxExemptionId'>>;
  customerTaxIdentifierCreate?: Resolver<ResolversTypes['CustomerTaxIdentifierCreatePayload'], ParentType, ContextType, RequireFields<CustomersMutationCustomerTaxIdentifierCreateArgs, 'input'>>;
  customerTaxIdentifierDelete?: Resolver<ResolversTypes['CustomerTaxIdentifierDeletePayload'], ParentType, ContextType, RequireFields<CustomersMutationCustomerTaxIdentifierDeleteArgs, 'input'>>;
  customerTaxIdentifierUpdate?: Resolver<ResolversTypes['CustomerTaxIdentifierUpdatePayload'], ParentType, ContextType, RequireFields<CustomersMutationCustomerTaxIdentifierUpdateArgs, 'taxIdentifierId'>>;
  customerUpdate?: Resolver<ResolversTypes['CustomerUpdatePayload'], ParentType, ContextType, RequireFields<CustomersMutationCustomerUpdateArgs, 'customerId'>>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CustomersQueryResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CustomersQuery'] = ResolversParentTypes['CustomersQuery']> = ResolversObject<{
  customer?: Resolver<Maybe<ResolversTypes['Customer']>, ParentType, ContextType, RequireFields<CustomersQueryCustomerArgs, 'id'>>;
  customerAddress?: Resolver<Maybe<ResolversTypes['CustomerAddress']>, ParentType, ContextType, RequireFields<CustomersQueryCustomerAddressArgs, 'id'>>;
  customerByEmail?: Resolver<Maybe<ResolversTypes['Customer']>, ParentType, ContextType, RequireFields<CustomersQueryCustomerByEmailArgs, 'email'>>;
  customerConsent?: Resolver<Maybe<ResolversTypes['CustomerConsent']>, ParentType, ContextType, RequireFields<CustomersQueryCustomerConsentArgs, 'id'>>;
  customerDataRequest?: Resolver<Maybe<ResolversTypes['CustomerDataRequest']>, ParentType, ContextType, RequireFields<CustomersQueryCustomerDataRequestArgs, 'id'>>;
  customerDataRequests?: Resolver<ResolversTypes['CustomerDataRequestConnection'], ParentType, ContextType, Partial<CustomersQueryCustomerDataRequestsArgs>>;
  customerGroup?: Resolver<Maybe<ResolversTypes['CustomerGroup']>, ParentType, ContextType, RequireFields<CustomersQueryCustomerGroupArgs, 'id'>>;
  customerGroups?: Resolver<ResolversTypes['CustomerGroupConnection'], ParentType, ContextType, Partial<CustomersQueryCustomerGroupsArgs>>;
  customerMerge?: Resolver<Maybe<ResolversTypes['CustomerMerge']>, ParentType, ContextType, RequireFields<CustomersQueryCustomerMergeArgs, 'id'>>;
  customerMerges?: Resolver<ResolversTypes['CustomerMergeConnection'], ParentType, ContextType, Partial<CustomersQueryCustomerMergesArgs>>;
  customerSegment?: Resolver<Maybe<ResolversTypes['CustomerSegment']>, ParentType, ContextType, RequireFields<CustomersQueryCustomerSegmentArgs, 'id'>>;
  customerSegments?: Resolver<ResolversTypes['CustomerSegmentConnection'], ParentType, ContextType, Partial<CustomersQueryCustomerSegmentsArgs>>;
  customerTag?: Resolver<Maybe<ResolversTypes['CustomerTag']>, ParentType, ContextType, RequireFields<CustomersQueryCustomerTagArgs, 'id'>>;
  customerTags?: Resolver<ResolversTypes['CustomerTagConnection'], ParentType, ContextType, Partial<CustomersQueryCustomerTagsArgs>>;
  customerTaxExemption?: Resolver<Maybe<ResolversTypes['CustomerTaxExemption']>, ParentType, ContextType, RequireFields<CustomersQueryCustomerTaxExemptionArgs, 'id'>>;
  customerTaxIdentifier?: Resolver<Maybe<ResolversTypes['CustomerTaxIdentifier']>, ParentType, ContextType, RequireFields<CustomersQueryCustomerTaxIdentifierArgs, 'id'>>;
  customers?: Resolver<ResolversTypes['CustomerConnection'], ParentType, ContextType, Partial<CustomersQueryCustomersArgs>>;
  node?: Resolver<Maybe<ResolversTypes['Node']>, ParentType, ContextType, RequireFields<CustomersQueryNodeArgs, 'id'>>;
  nodes?: Resolver<Array<Maybe<ResolversTypes['Node']>>, ParentType, ContextType, RequireFields<CustomersQueryNodesArgs, 'ids'>>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export interface DateScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['Date'], any> {
  name: 'Date';
}

export interface DateTimeScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['DateTime'], any> {
  name: 'DateTime';
}

export interface EmailScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['Email'], any> {
  name: 'Email';
}

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

export type MutationResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['Mutation'] = ResolversParentTypes['Mutation']> = ResolversObject<{
  customersMutation?: Resolver<ResolversTypes['CustomersMutation'], ParentType, ContextType>;
}>;

export type NodeResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['Node'] = ResolversParentTypes['Node']> = ResolversObject<{
  __resolveType: TypeResolveFn<'Customer' | 'CustomerAddress' | 'CustomerConsent' | 'CustomerConsentEvent' | 'CustomerDataRequest' | 'CustomerGroup' | 'CustomerGroupMembership' | 'CustomerMerge' | 'CustomerMonetaryStatistics' | 'CustomerSegment' | 'CustomerSegmentMembership' | 'CustomerTag' | 'CustomerTagAssignment' | 'CustomerTaxExemption' | 'CustomerTaxIdentifier', ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
}>;

export type PageInfoResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['PageInfo'] = ResolversParentTypes['PageInfo']> = ResolversObject<{
  endCursor?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  hasNextPage?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  hasPreviousPage?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  startCursor?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type QueryResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['Query'] = ResolversParentTypes['Query']> = ResolversObject<{
  customersQuery?: Resolver<ResolversTypes['CustomersQuery'], ParentType, ContextType>;
}>;

export type UserErrorResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['UserError'] = ResolversParentTypes['UserError']> = ResolversObject<{
  __resolveType: TypeResolveFn<'GenericUserError', ParentType, ContextType>;
  code?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  field?: Resolver<Maybe<Array<ResolversTypes['String']>>, ParentType, ContextType>;
  message?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
}>;

export interface _CustomersGeneratedFilterPlaceholderScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['_CustomersGeneratedFilterPlaceholder'], any> {
  name: '_CustomersGeneratedFilterPlaceholder';
}

export type Resolvers<ContextType = ServiceContext> = ResolversObject<{
  BigInt?: GraphQLScalarType;
  Customer?: CustomerResolvers<ContextType>;
  CustomerAddress?: CustomerAddressResolvers<ContextType>;
  CustomerAddressConnection?: CustomerAddressConnectionResolvers<ContextType>;
  CustomerAddressCreatePayload?: CustomerAddressCreatePayloadResolvers<ContextType>;
  CustomerAddressDefaultsUpdatePayload?: CustomerAddressDefaultsUpdatePayloadResolvers<ContextType>;
  CustomerAddressDeletePayload?: CustomerAddressDeletePayloadResolvers<ContextType>;
  CustomerAddressEdge?: CustomerAddressEdgeResolvers<ContextType>;
  CustomerAddressUpdatePayload?: CustomerAddressUpdatePayloadResolvers<ContextType>;
  CustomerConnection?: CustomerConnectionResolvers<ContextType>;
  CustomerConsent?: CustomerConsentResolvers<ContextType>;
  CustomerConsentEvent?: CustomerConsentEventResolvers<ContextType>;
  CustomerConsentEventConnection?: CustomerConsentEventConnectionResolvers<ContextType>;
  CustomerConsentEventEdge?: CustomerConsentEventEdgeResolvers<ContextType>;
  CustomerConsentSetPayload?: CustomerConsentSetPayloadResolvers<ContextType>;
  CustomerCreatePayload?: CustomerCreatePayloadResolvers<ContextType>;
  CustomerDataRequest?: CustomerDataRequestResolvers<ContextType>;
  CustomerDataRequestCancelPayload?: CustomerDataRequestCancelPayloadResolvers<ContextType>;
  CustomerDataRequestConnection?: CustomerDataRequestConnectionResolvers<ContextType>;
  CustomerDataRequestCreatePayload?: CustomerDataRequestCreatePayloadResolvers<ContextType>;
  CustomerDataRequestEdge?: CustomerDataRequestEdgeResolvers<ContextType>;
  CustomerEdge?: CustomerEdgeResolvers<ContextType>;
  CustomerGroup?: CustomerGroupResolvers<ContextType>;
  CustomerGroupConnection?: CustomerGroupConnectionResolvers<ContextType>;
  CustomerGroupCreatePayload?: CustomerGroupCreatePayloadResolvers<ContextType>;
  CustomerGroupDeletePayload?: CustomerGroupDeletePayloadResolvers<ContextType>;
  CustomerGroupEdge?: CustomerGroupEdgeResolvers<ContextType>;
  CustomerGroupMembership?: CustomerGroupMembershipResolvers<ContextType>;
  CustomerGroupMembershipConnection?: CustomerGroupMembershipConnectionResolvers<ContextType>;
  CustomerGroupMembershipDeletePayload?: CustomerGroupMembershipDeletePayloadResolvers<ContextType>;
  CustomerGroupMembershipEdge?: CustomerGroupMembershipEdgeResolvers<ContextType>;
  CustomerGroupMembershipSetPayload?: CustomerGroupMembershipSetPayloadResolvers<ContextType>;
  CustomerGroupUpdatePayload?: CustomerGroupUpdatePayloadResolvers<ContextType>;
  CustomerMerge?: CustomerMergeResolvers<ContextType>;
  CustomerMergeConnection?: CustomerMergeConnectionResolvers<ContextType>;
  CustomerMergeEdge?: CustomerMergeEdgeResolvers<ContextType>;
  CustomerMergeRequestPayload?: CustomerMergeRequestPayloadResolvers<ContextType>;
  CustomerMonetaryStatistics?: CustomerMonetaryStatisticsResolvers<ContextType>;
  CustomerMonetaryStatisticsConnection?: CustomerMonetaryStatisticsConnectionResolvers<ContextType>;
  CustomerMonetaryStatisticsEdge?: CustomerMonetaryStatisticsEdgeResolvers<ContextType>;
  CustomerOperationResult?: CustomerOperationResultResolvers<ContextType>;
  CustomerSegment?: CustomerSegmentResolvers<ContextType>;
  CustomerSegmentConnection?: CustomerSegmentConnectionResolvers<ContextType>;
  CustomerSegmentCreatePayload?: CustomerSegmentCreatePayloadResolvers<ContextType>;
  CustomerSegmentCustomersAddPayload?: CustomerSegmentCustomersAddPayloadResolvers<ContextType>;
  CustomerSegmentCustomersRemovePayload?: CustomerSegmentCustomersRemovePayloadResolvers<ContextType>;
  CustomerSegmentDeletePayload?: CustomerSegmentDeletePayloadResolvers<ContextType>;
  CustomerSegmentEdge?: CustomerSegmentEdgeResolvers<ContextType>;
  CustomerSegmentMembership?: CustomerSegmentMembershipResolvers<ContextType>;
  CustomerSegmentMembershipConnection?: CustomerSegmentMembershipConnectionResolvers<ContextType>;
  CustomerSegmentMembershipEdge?: CustomerSegmentMembershipEdgeResolvers<ContextType>;
  CustomerSegmentUpdatePayload?: CustomerSegmentUpdatePayloadResolvers<ContextType>;
  CustomerStatistics?: CustomerStatisticsResolvers<ContextType>;
  CustomerTag?: CustomerTagResolvers<ContextType>;
  CustomerTagAssignPayload?: CustomerTagAssignPayloadResolvers<ContextType>;
  CustomerTagAssignment?: CustomerTagAssignmentResolvers<ContextType>;
  CustomerTagAssignmentConnection?: CustomerTagAssignmentConnectionResolvers<ContextType>;
  CustomerTagAssignmentEdge?: CustomerTagAssignmentEdgeResolvers<ContextType>;
  CustomerTagConnection?: CustomerTagConnectionResolvers<ContextType>;
  CustomerTagCreatePayload?: CustomerTagCreatePayloadResolvers<ContextType>;
  CustomerTagDeletePayload?: CustomerTagDeletePayloadResolvers<ContextType>;
  CustomerTagEdge?: CustomerTagEdgeResolvers<ContextType>;
  CustomerTagUnassignPayload?: CustomerTagUnassignPayloadResolvers<ContextType>;
  CustomerTagUpdatePayload?: CustomerTagUpdatePayloadResolvers<ContextType>;
  CustomerTaxExemption?: CustomerTaxExemptionResolvers<ContextType>;
  CustomerTaxExemptionConnection?: CustomerTaxExemptionConnectionResolvers<ContextType>;
  CustomerTaxExemptionCreatePayload?: CustomerTaxExemptionCreatePayloadResolvers<ContextType>;
  CustomerTaxExemptionDeletePayload?: CustomerTaxExemptionDeletePayloadResolvers<ContextType>;
  CustomerTaxExemptionEdge?: CustomerTaxExemptionEdgeResolvers<ContextType>;
  CustomerTaxExemptionUpdatePayload?: CustomerTaxExemptionUpdatePayloadResolvers<ContextType>;
  CustomerTaxIdentifier?: CustomerTaxIdentifierResolvers<ContextType>;
  CustomerTaxIdentifierConnection?: CustomerTaxIdentifierConnectionResolvers<ContextType>;
  CustomerTaxIdentifierCreatePayload?: CustomerTaxIdentifierCreatePayloadResolvers<ContextType>;
  CustomerTaxIdentifierDeletePayload?: CustomerTaxIdentifierDeletePayloadResolvers<ContextType>;
  CustomerTaxIdentifierEdge?: CustomerTaxIdentifierEdgeResolvers<ContextType>;
  CustomerTaxIdentifierUpdatePayload?: CustomerTaxIdentifierUpdatePayloadResolvers<ContextType>;
  CustomerUpdatePayload?: CustomerUpdatePayloadResolvers<ContextType>;
  CustomersMutation?: CustomersMutationResolvers<ContextType>;
  CustomersQuery?: CustomersQueryResolvers<ContextType>;
  Date?: GraphQLScalarType;
  DateTime?: GraphQLScalarType;
  Email?: GraphQLScalarType;
  File?: FileResolvers<ContextType>;
  GenericUserError?: GenericUserErrorResolvers<ContextType>;
  JSON?: GraphQLScalarType;
  Mutation?: MutationResolvers<ContextType>;
  Node?: NodeResolvers<ContextType>;
  PageInfo?: PageInfoResolvers<ContextType>;
  Query?: QueryResolvers<ContextType>;
  UserError?: UserErrorResolvers<ContextType>;
  _CustomersGeneratedFilterPlaceholder?: GraphQLScalarType;
}>;
