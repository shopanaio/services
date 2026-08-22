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

export type Customer = Node & {
  __typename?: 'Customer';
  id: Scalars['ID']['output'];
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

export type LoyaltyAccount = Node & {
  __typename?: 'LoyaltyAccount';
  balance: LoyaltyAccountBalance;
  closedAt: Maybe<Scalars['DateTime']['output']>;
  customer: Maybe<Customer>;
  customerId: Scalars['ID']['output'];
  expiringPoints: Array<LoyaltyExpiringPoints>;
  id: Scalars['ID']['output'];
  mergedIntoAccount: Maybe<LoyaltyAccount>;
  monetaryWallets: Array<LoyaltyMonetaryWallet>;
  openedAt: Scalars['DateTime']['output'];
  program: LoyaltyProgram;
  rewardEntitlements: LoyaltyRewardEntitlementConnection;
  status: LoyaltyAccountStatus;
  suspendedAt: Maybe<Scalars['DateTime']['output']>;
  suspendedReason: Maybe<Scalars['String']['output']>;
  tierMembership: Maybe<LoyaltyTierMembership>;
  tierMemberships: LoyaltyTierMembershipConnection;
  transactions: LoyaltyTransactionConnection;
  updatedAt: Scalars['DateTime']['output'];
};


export type LoyaltyAccountExpiringPointsArgs = {
  first?: InputMaybe<Scalars['Int']['input']>;
};


export type LoyaltyAccountRewardEntitlementsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<LoyaltyRewardEntitlementOrderByInput>>;
};


export type LoyaltyAccountTierMembershipsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<LoyaltyTierMembershipOrderByInput>>;
};


export type LoyaltyAccountTransactionsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<LoyaltyTransactionOrderByInput>>;
  where?: InputMaybe<LoyaltyTransactionWhereInput>;
};

export type LoyaltyAccountBalance = {
  __typename?: 'LoyaltyAccountBalance';
  availablePoints: Scalars['BigInt']['output'];
  debtPoints: Scalars['BigInt']['output'];
  lifetimeAdjustedPoints: Scalars['BigInt']['output'];
  lifetimeEarnedPoints: Scalars['BigInt']['output'];
  lifetimeExpiredPoints: Scalars['BigInt']['output'];
  lifetimeRedeemedPoints: Scalars['BigInt']['output'];
  pendingPoints: Scalars['BigInt']['output'];
  reservedPoints: Scalars['BigInt']['output'];
  updatedAt: Scalars['DateTime']['output'];
};

export type LoyaltyAccountBalanceRebuildInput = {
  accountId: Scalars['ID']['input'];
};

export type LoyaltyAccountBalanceRebuildPayload = {
  __typename?: 'LoyaltyAccountBalanceRebuildPayload';
  account: Maybe<LoyaltyAccount>;
  balance: Maybe<LoyaltyAccountBalance>;
  userErrors: Array<LoyaltyUserError>;
};

export type LoyaltyAccountConnection = {
  __typename?: 'LoyaltyAccountConnection';
  edges: Array<LoyaltyAccountEdge>;
  pageInfo: PageInfo;
  totalCount: Scalars['Int']['output'];
};

export type LoyaltyAccountEdge = {
  __typename?: 'LoyaltyAccountEdge';
  cursor: Scalars['String']['output'];
  node: LoyaltyAccount;
};

export type LoyaltyAccountOrderByInput = {
  direction: SortDirection;
  field: LoyaltyAccountOrderField;
};

export enum LoyaltyAccountOrderField {
  ClosedAt = 'closedAt',
  CustomerId = 'customerId',
  Id = 'id',
  OpenedAt = 'openedAt',
  Status = 'status',
  SuspendedAt = 'suspendedAt',
  UpdatedAt = 'updatedAt'
}

export enum LoyaltyAccountStatus {
  Active = 'ACTIVE',
  Closed = 'CLOSED',
  Merged = 'MERGED',
  Suspended = 'SUSPENDED'
}

export type LoyaltyAccountStatusOperationInput = {
  reason: Scalars['String']['input'];
  status: LoyaltyAccountStatus;
};

export type LoyaltyAccountStatusUpdateInput = {
  accountId: Scalars['ID']['input'];
  reason: Scalars['String']['input'];
  status: LoyaltyAccountStatus;
};

export type LoyaltyAccountStatusUpdatePayload = {
  __typename?: 'LoyaltyAccountStatusUpdatePayload';
  account: Maybe<LoyaltyAccount>;
  userErrors: Array<LoyaltyUserError>;
};

export type LoyaltyAccountUpdateInput = {
  monetaryConversions?: InputMaybe<Array<LoyaltyPointsToMonetaryOperationInput>>;
  pointAdjustments?: InputMaybe<Array<LoyaltyPointsAdjustmentOperationInput>>;
  rebuildBalance?: InputMaybe<Scalars['Boolean']['input']>;
  rewardEntitlements?: InputMaybe<Array<LoyaltyRewardEntitlementOperationInput>>;
  status?: InputMaybe<LoyaltyAccountStatusOperationInput>;
  tierMemberships?: InputMaybe<Array<LoyaltyTierMembershipOperationInput>>;
};

export type LoyaltyAccountUpdatePayload = {
  __typename?: 'LoyaltyAccountUpdatePayload';
  account: Maybe<LoyaltyAccount>;
  operationResults: Array<LoyaltyOperationResult>;
  userErrors: Array<LoyaltyUserError>;
};

export type LoyaltyAccountWhereInput = {
  customerIds?: InputMaybe<Array<Scalars['ID']['input']>>;
  hasDebt?: InputMaybe<Scalars['Boolean']['input']>;
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  minimumAvailablePoints?: InputMaybe<Scalars['BigInt']['input']>;
  programIds?: InputMaybe<Array<Scalars['ID']['input']>>;
  statuses?: InputMaybe<Array<LoyaltyAccountStatus>>;
  tierIds?: InputMaybe<Array<Scalars['ID']['input']>>;
};

export enum LoyaltyActorType {
  AdminUser = 'ADMIN_USER',
  Customer = 'CUSTOMER',
  Service = 'SERVICE',
  System = 'SYSTEM'
}

export enum LoyaltyBalanceBucket {
  Available = 'AVAILABLE',
  Debt = 'DEBT',
  Pending = 'PENDING',
  Reserved = 'RESERVED'
}

export type LoyaltyCatalogSelector = {
  __typename?: 'LoyaltyCatalogSelector';
  ids: Array<Scalars['ID']['output']>;
  type: LoyaltyCatalogSelectorType;
};

export type LoyaltyCatalogSelectorInput = {
  /** Must be empty for ALL and non-empty for every specific selector type. */
  ids: Array<Scalars['ID']['input']>;
  type: LoyaltyCatalogSelectorType;
};

export enum LoyaltyCatalogSelectorType {
  All = 'ALL',
  Category = 'CATEGORY',
  Feature = 'FEATURE',
  OptionValue = 'OPTION_VALUE',
  Product = 'PRODUCT',
  Tag = 'TAG',
  Variant = 'VARIANT'
}

export enum LoyaltyDebtPolicy {
  RejectReversal = 'REJECT_REVERSAL',
  TrackDebt = 'TRACK_DEBT'
}

export type LoyaltyDeletePayload = {
  __typename?: 'LoyaltyDeletePayload';
  deletedId: Maybe<Scalars['ID']['output']>;
  userErrors: Array<LoyaltyUserError>;
};

export enum LoyaltyEarningActionType {
  ApplyMultiplier = 'APPLY_MULTIPLIER',
  AwardCashback = 'AWARD_CASHBACK',
  AwardFixedPoints = 'AWARD_FIXED_POINTS',
  AwardSpendRatio = 'AWARD_SPEND_RATIO',
  IssueReward = 'ISSUE_REWARD'
}

export type LoyaltyEarningModifier = {
  __typename?: 'LoyaltyEarningModifier';
  endsAt: Maybe<Scalars['DateTime']['output']>;
  id: Scalars['ID']['output'];
  multiplierBps: Scalars['Int']['output'];
  priority: Scalars['Int']['output'];
  segmentIds: Array<Scalars['ID']['output']>;
  selector: LoyaltyCatalogSelector;
  startsAt: Maybe<Scalars['DateTime']['output']>;
  title: Scalars['String']['output'];
};

export type LoyaltyEarningModifierInput = {
  endsAt?: InputMaybe<Scalars['DateTime']['input']>;
  id: Scalars['ID']['input'];
  /** 10000 equals a 1x multiplier. */
  multiplierBps: Scalars['Int']['input'];
  priority: Scalars['Int']['input'];
  segmentIds: Array<Scalars['ID']['input']>;
  selector: LoyaltyCatalogSelectorInput;
  startsAt?: InputMaybe<Scalars['DateTime']['input']>;
  title: Scalars['String']['input'];
};

export type LoyaltyEarningRule = Node & {
  __typename?: 'LoyaltyEarningRule';
  action: Scalars['JSON']['output'];
  actionSchemaVersion: Scalars['Int']['output'];
  actionType: LoyaltyEarningActionType;
  code: Scalars['String']['output'];
  conditionSchemaVersion: Scalars['Int']['output'];
  conditions: Scalars['JSON']['output'];
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  limitSchemaVersion: Scalars['Int']['output'];
  limits: Scalars['JSON']['output'];
  name: Scalars['String']['output'];
  priority: Scalars['Int']['output'];
  programVersion: LoyaltyProgramVersion;
  stopProcessing: Scalars['Boolean']['output'];
  triggerConfig: Scalars['JSON']['output'];
  triggerSchemaVersion: Scalars['Int']['output'];
  triggerType: LoyaltyEarningTriggerType;
};

export type LoyaltyEarningRuleCreateInput = {
  action: Scalars['JSON']['input'];
  actionSchemaVersion?: InputMaybe<Scalars['Int']['input']>;
  actionType: LoyaltyEarningActionType;
  code: Scalars['String']['input'];
  conditionSchemaVersion?: InputMaybe<Scalars['Int']['input']>;
  conditions: Scalars['JSON']['input'];
  limitSchemaVersion?: InputMaybe<Scalars['Int']['input']>;
  limits?: Scalars['JSON']['input'];
  name: Scalars['String']['input'];
  priority?: InputMaybe<Scalars['Int']['input']>;
  programVersionId: Scalars['ID']['input'];
  stopProcessing?: InputMaybe<Scalars['Boolean']['input']>;
  triggerConfig?: Scalars['JSON']['input'];
  triggerSchemaVersion?: InputMaybe<Scalars['Int']['input']>;
  triggerType: LoyaltyEarningTriggerType;
};

export type LoyaltyEarningRuleDeleteInput = {
  earningRuleId: Scalars['ID']['input'];
};

export type LoyaltyEarningRuleInput = {
  action: Scalars['JSON']['input'];
  actionSchemaVersion?: InputMaybe<Scalars['Int']['input']>;
  actionType: LoyaltyEarningActionType;
  code: Scalars['String']['input'];
  conditionSchemaVersion?: InputMaybe<Scalars['Int']['input']>;
  conditions: Scalars['JSON']['input'];
  limitSchemaVersion?: InputMaybe<Scalars['Int']['input']>;
  limits?: Scalars['JSON']['input'];
  name: Scalars['String']['input'];
  priority?: InputMaybe<Scalars['Int']['input']>;
  stopProcessing?: InputMaybe<Scalars['Boolean']['input']>;
  triggerConfig?: Scalars['JSON']['input'];
  triggerSchemaVersion?: InputMaybe<Scalars['Int']['input']>;
  triggerType: LoyaltyEarningTriggerType;
};

export type LoyaltyEarningRuleOperationInput = {
  action: LoyaltyOwnedEntityOperationAction;
  create?: InputMaybe<LoyaltyEarningRuleInput>;
  earningRuleId?: InputMaybe<Scalars['ID']['input']>;
  update?: InputMaybe<LoyaltyEarningRuleUpdateOperationValuesInput>;
};

export type LoyaltyEarningRulePayload = {
  __typename?: 'LoyaltyEarningRulePayload';
  earningRule: Maybe<LoyaltyEarningRule>;
  userErrors: Array<LoyaltyUserError>;
};

export type LoyaltyEarningRuleUpdateInput = {
  action?: InputMaybe<Scalars['JSON']['input']>;
  actionSchemaVersion?: InputMaybe<Scalars['Int']['input']>;
  actionType?: InputMaybe<LoyaltyEarningActionType>;
  conditionSchemaVersion?: InputMaybe<Scalars['Int']['input']>;
  conditions?: InputMaybe<Scalars['JSON']['input']>;
  earningRuleId: Scalars['ID']['input'];
  limitSchemaVersion?: InputMaybe<Scalars['Int']['input']>;
  limits?: InputMaybe<Scalars['JSON']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  priority?: InputMaybe<Scalars['Int']['input']>;
  stopProcessing?: InputMaybe<Scalars['Boolean']['input']>;
  triggerConfig?: InputMaybe<Scalars['JSON']['input']>;
  triggerSchemaVersion?: InputMaybe<Scalars['Int']['input']>;
  triggerType?: InputMaybe<LoyaltyEarningTriggerType>;
};

export type LoyaltyEarningRuleUpdateOperationValuesInput = {
  action?: InputMaybe<Scalars['JSON']['input']>;
  actionSchemaVersion?: InputMaybe<Scalars['Int']['input']>;
  actionType?: InputMaybe<LoyaltyEarningActionType>;
  conditionSchemaVersion?: InputMaybe<Scalars['Int']['input']>;
  conditions?: InputMaybe<Scalars['JSON']['input']>;
  limitSchemaVersion?: InputMaybe<Scalars['Int']['input']>;
  limits?: InputMaybe<Scalars['JSON']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  priority?: InputMaybe<Scalars['Int']['input']>;
  stopProcessing?: InputMaybe<Scalars['Boolean']['input']>;
  triggerConfig?: InputMaybe<Scalars['JSON']['input']>;
  triggerSchemaVersion?: InputMaybe<Scalars['Int']['input']>;
  triggerType?: InputMaybe<LoyaltyEarningTriggerType>;
};

export type LoyaltyEarningRuleUsage = Node & {
  __typename?: 'LoyaltyEarningRuleUsage';
  earningRule: LoyaltyEarningRule;
  id: Scalars['ID']['output'];
  monetaryAmounts: Scalars['JSON']['output'];
  occurrenceCount: Scalars['BigInt']['output'];
  pointsAwarded: Scalars['BigInt']['output'];
  scopeKey: Scalars['String']['output'];
  updatedAt: Scalars['DateTime']['output'];
  windowEndedAt: Maybe<Scalars['DateTime']['output']>;
  windowStartedAt: Scalars['DateTime']['output'];
};

export type LoyaltyEarningRuleUsageConnection = {
  __typename?: 'LoyaltyEarningRuleUsageConnection';
  edges: Array<LoyaltyEarningRuleUsageEdge>;
  pageInfo: PageInfo;
  totalCount: Scalars['Int']['output'];
};

export type LoyaltyEarningRuleUsageEdge = {
  __typename?: 'LoyaltyEarningRuleUsageEdge';
  cursor: Scalars['String']['output'];
  node: LoyaltyEarningRuleUsage;
};

export type LoyaltyEarningRuleUsageOrderByInput = {
  direction: SortDirection;
  field: LoyaltyEarningRuleUsageOrderField;
};

export enum LoyaltyEarningRuleUsageOrderField {
  Id = 'id',
  OccurrenceCount = 'occurrenceCount',
  PointsAwarded = 'pointsAwarded',
  ScopeKey = 'scopeKey',
  UpdatedAt = 'updatedAt',
  WindowEndedAt = 'windowEndedAt',
  WindowStartedAt = 'windowStartedAt'
}

export type LoyaltyEarningRuleUsageWhereInput = {
  earningRuleId: Scalars['ID']['input'];
  effectiveAt?: InputMaybe<Scalars['DateTime']['input']>;
  scopeKey?: InputMaybe<Scalars['String']['input']>;
};

export enum LoyaltyEarningTriggerType {
  Anniversary = 'ANNIVERSARY',
  Birthday = 'BIRTHDAY',
  CustomEvent = 'CUSTOM_EVENT',
  Login = 'LOGIN',
  Order = 'ORDER',
  Referral = 'REFERRAL',
  Review = 'REVIEW',
  Signup = 'SIGNUP',
  SubscriptionRenewal = 'SUBSCRIPTION_RENEWAL'
}

export enum LoyaltyEligibleSpendBasis {
  AfterAllDiscounts = 'AFTER_ALL_DISCOUNTS',
  AfterProductDiscounts = 'AFTER_PRODUCT_DISCOUNTS'
}

export type LoyaltyEventEvaluation = Node & {
  __typename?: 'LoyaltyEventEvaluation';
  account: LoyaltyAccount;
  decision: LoyaltyEventEvaluationDecision;
  earningRule: LoyaltyEarningRule;
  evaluatedAt: Scalars['DateTime']['output'];
  eventFact: LoyaltyEventFact;
  id: Scalars['ID']['output'];
  monetaryAmount: Maybe<LoyaltyMoney>;
  pointsAwarded: Maybe<Scalars['BigInt']['output']>;
  reasonCode: Scalars['String']['output'];
  result: Scalars['JSON']['output'];
  resultSchemaVersion: Scalars['Int']['output'];
  transaction: Maybe<LoyaltyTransaction>;
};

export type LoyaltyEventEvaluationConnection = {
  __typename?: 'LoyaltyEventEvaluationConnection';
  edges: Array<LoyaltyEventEvaluationEdge>;
  pageInfo: PageInfo;
  totalCount: Scalars['Int']['output'];
};

export enum LoyaltyEventEvaluationDecision {
  Awarded = 'AWARDED',
  BudgetExhausted = 'BUDGET_EXHAUSTED',
  Ignored = 'IGNORED',
  Ineligible = 'INELIGIBLE',
  LimitReached = 'LIMIT_REACHED'
}

export type LoyaltyEventEvaluationEdge = {
  __typename?: 'LoyaltyEventEvaluationEdge';
  cursor: Scalars['String']['output'];
  node: LoyaltyEventEvaluation;
};

export type LoyaltyEventEvaluationOrderByInput = {
  direction: SortDirection;
  field: LoyaltyEventEvaluationOrderField;
};

export enum LoyaltyEventEvaluationOrderField {
  Decision = 'decision',
  EvaluatedAt = 'evaluatedAt',
  Id = 'id',
  PointsAwarded = 'pointsAwarded'
}

export type LoyaltyEventEvaluationWhereInput = {
  accountId?: InputMaybe<Scalars['ID']['input']>;
  decisions?: InputMaybe<Array<LoyaltyEventEvaluationDecision>>;
  earningRuleId?: InputMaybe<Scalars['ID']['input']>;
  eventFactId?: InputMaybe<Scalars['ID']['input']>;
};

export type LoyaltyEventFact = Node & {
  __typename?: 'LoyaltyEventFact';
  customerId: Maybe<Scalars['ID']['output']>;
  evaluations: Array<LoyaltyEventEvaluation>;
  eventType: Scalars['String']['output'];
  externalEventId: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  occurredAt: Scalars['DateTime']['output'];
  payload: Scalars['JSON']['output'];
  payloadHash: Scalars['String']['output'];
  payloadSchemaVersion: Scalars['Int']['output'];
  producer: Scalars['String']['output'];
  receivedAt: Scalars['DateTime']['output'];
  subjectId: Scalars['String']['output'];
  subjectType: Scalars['String']['output'];
};

export type LoyaltyEventFactConnection = {
  __typename?: 'LoyaltyEventFactConnection';
  edges: Array<LoyaltyEventFactEdge>;
  pageInfo: PageInfo;
  totalCount: Scalars['Int']['output'];
};

export type LoyaltyEventFactEdge = {
  __typename?: 'LoyaltyEventFactEdge';
  cursor: Scalars['String']['output'];
  node: LoyaltyEventFact;
};

export type LoyaltyEventFactOrderByInput = {
  direction: SortDirection;
  field: LoyaltyEventFactOrderField;
};

export enum LoyaltyEventFactOrderField {
  CustomerId = 'customerId',
  EventType = 'eventType',
  ExternalEventId = 'externalEventId',
  Id = 'id',
  OccurredAt = 'occurredAt',
  Producer = 'producer',
  ReceivedAt = 'receivedAt',
  SubjectId = 'subjectId',
  SubjectType = 'subjectType'
}

export type LoyaltyEventFactWhereInput = {
  customerIds?: InputMaybe<Array<Scalars['ID']['input']>>;
  eventTypes?: InputMaybe<Array<Scalars['String']['input']>>;
  occurredFrom?: InputMaybe<Scalars['DateTime']['input']>;
  occurredTo?: InputMaybe<Scalars['DateTime']['input']>;
  producers?: InputMaybe<Array<Scalars['String']['input']>>;
};

export type LoyaltyExpiringPoints = {
  __typename?: 'LoyaltyExpiringPoints';
  expiresAt: Scalars['DateTime']['output'];
  lotId: Scalars['ID']['output'];
  points: Scalars['BigInt']['output'];
};

export type LoyaltyLedgerEntry = Node & {
  __typename?: 'LoyaltyLedgerEntry';
  account: LoyaltyAccount;
  bucket: LoyaltyBalanceBucket;
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  pointsDelta: Scalars['BigInt']['output'];
  sequence: Scalars['Int']['output'];
  transaction: LoyaltyTransaction;
};

export type LoyaltyLotAllocation = Node & {
  __typename?: 'LoyaltyLotAllocation';
  allocationType: LoyaltyLotAllocationType;
  createdAt: Scalars['DateTime']['output'];
  debitEntry: LoyaltyLedgerEntry;
  id: Scalars['ID']['output'];
  lot: LoyaltyPointLot;
  points: Scalars['BigInt']['output'];
  transaction: LoyaltyTransaction;
};

export enum LoyaltyLotAllocationType {
  Expire = 'EXPIRE',
  Merge = 'MERGE',
  Redeem = 'REDEEM',
  Reverse = 'REVERSE'
}

export type LoyaltyMaintenanceResult = {
  __typename?: 'LoyaltyMaintenanceResult';
  activatedMonetaryLots: Scalars['Int']['output'];
  activatedPointLots: Scalars['Int']['output'];
  activatedProgramVersions: Scalars['Int']['output'];
  evaluatedTiers: Scalars['Int']['output'];
  expiredMonetaryLots: Scalars['Int']['output'];
  expiredPointLots: Scalars['Int']['output'];
  expiredReservations: Scalars['Int']['output'];
  expiredRewards: Scalars['Int']['output'];
  rebuiltBalances: Scalars['Int']['output'];
  reconciledProgramVersions: Scalars['Int']['output'];
  staleProgramVersions: Scalars['Int']['output'];
};

export type LoyaltyMaintenanceRunInput = {
  effectiveAt: Scalars['DateTime']['input'];
  limit?: InputMaybe<Scalars['Int']['input']>;
  rebuildBalances?: InputMaybe<Scalars['Boolean']['input']>;
};

export type LoyaltyMaintenanceRunPayload = {
  __typename?: 'LoyaltyMaintenanceRunPayload';
  result: Maybe<LoyaltyMaintenanceResult>;
  userErrors: Array<LoyaltyUserError>;
};

export enum LoyaltyModifierStackingMode {
  Add = 'ADD',
  Highest = 'HIGHEST',
  Multiply = 'MULTIPLY'
}

export enum LoyaltyMonetaryAdjustmentDirection {
  Credit = 'CREDIT',
  Debit = 'DEBIT'
}

export enum LoyaltyMonetaryBalanceBucket {
  Available = 'AVAILABLE',
  Debt = 'DEBT',
  Pending = 'PENDING',
  Reserved = 'RESERVED'
}

export type LoyaltyMonetaryCreditLot = Node & {
  __typename?: 'LoyaltyMonetaryCreditLot';
  activatedAt: Scalars['DateTime']['output'];
  allocations: Array<LoyaltyMonetaryLotAllocation>;
  amountIssued: LoyaltyMoney;
  createdAt: Scalars['DateTime']['output'];
  expiresAt: Maybe<Scalars['DateTime']['output']>;
  id: Scalars['ID']['output'];
  originEntry: LoyaltyMonetaryLedgerEntry;
  remainingAmount: LoyaltyMoney;
  wallet: LoyaltyMonetaryWallet;
};

export type LoyaltyMonetaryLedgerEntry = Node & {
  __typename?: 'LoyaltyMonetaryLedgerEntry';
  amount: LoyaltyMoney;
  bucket: LoyaltyMonetaryBalanceBucket;
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  sequence: Scalars['Int']['output'];
  transaction: LoyaltyMonetaryTransaction;
  wallet: LoyaltyMonetaryWallet;
};

export type LoyaltyMonetaryLotAllocation = Node & {
  __typename?: 'LoyaltyMonetaryLotAllocation';
  amount: LoyaltyMoney;
  createdAt: Scalars['DateTime']['output'];
  debitEntry: LoyaltyMonetaryLedgerEntry;
  id: Scalars['ID']['output'];
  lot: LoyaltyMonetaryCreditLot;
};

export type LoyaltyMonetaryTransaction = Node & {
  __typename?: 'LoyaltyMonetaryTransaction';
  actorId: Maybe<Scalars['ID']['output']>;
  actorType: LoyaltyActorType;
  createdAt: Scalars['DateTime']['output'];
  effectiveAt: Scalars['DateTime']['output'];
  entries: Array<LoyaltyMonetaryLedgerEntry>;
  id: Scalars['ID']['output'];
  kind: LoyaltyMonetaryTransactionKind;
  metadata: Scalars['JSON']['output'];
  occurredAt: Scalars['DateTime']['output'];
  program: LoyaltyProgram;
  programVersion: Maybe<LoyaltyProgramVersion>;
  reasonCode: Scalars['String']['output'];
  requestHash: Scalars['String']['output'];
  sourceId: Maybe<Scalars['String']['output']>;
  sourceRevision: Maybe<Scalars['String']['output']>;
  sourceType: Scalars['String']['output'];
  wallet: LoyaltyMonetaryWallet;
};

export type LoyaltyMonetaryTransactionConnection = {
  __typename?: 'LoyaltyMonetaryTransactionConnection';
  edges: Array<LoyaltyMonetaryTransactionEdge>;
  pageInfo: PageInfo;
  totalCount: Scalars['Int']['output'];
};

export type LoyaltyMonetaryTransactionEdge = {
  __typename?: 'LoyaltyMonetaryTransactionEdge';
  cursor: Scalars['String']['output'];
  node: LoyaltyMonetaryTransaction;
};

export enum LoyaltyMonetaryTransactionKind {
  Activate = 'ACTIVATE',
  AdjustCredit = 'ADJUST_CREDIT',
  AdjustDebit = 'ADJUST_DEBIT',
  DebtRecovery = 'DEBT_RECOVERY',
  EarnPending = 'EARN_PENDING',
  Expire = 'EXPIRE',
  MergeTransfer = 'MERGE_TRANSFER',
  Release = 'RELEASE',
  Reserve = 'RESERVE',
  RestoreSpend = 'RESTORE_SPEND',
  ReverseEarn = 'REVERSE_EARN',
  Spend = 'SPEND'
}

export type LoyaltyMonetaryTransactionOrderByInput = {
  direction: SortDirection;
  field: LoyaltyMonetaryTransactionOrderField;
};

export enum LoyaltyMonetaryTransactionOrderField {
  CreatedAt = 'createdAt',
  EffectiveAt = 'effectiveAt',
  Id = 'id',
  Kind = 'kind',
  OccurredAt = 'occurredAt',
  SourceType = 'sourceType'
}

export type LoyaltyMonetaryWallet = Node & {
  __typename?: 'LoyaltyMonetaryWallet';
  account: LoyaltyAccount;
  balance: LoyaltyMonetaryWalletBalance;
  closedAt: Maybe<Scalars['DateTime']['output']>;
  creditLots: Array<LoyaltyMonetaryCreditLot>;
  currencyCode: CurrencyCode;
  id: Scalars['ID']['output'];
  mergedIntoWallet: Maybe<LoyaltyMonetaryWallet>;
  openedAt: Scalars['DateTime']['output'];
  program: LoyaltyProgram;
  status: LoyaltyMonetaryWalletStatus;
  transactions: LoyaltyMonetaryTransactionConnection;
  updatedAt: Scalars['DateTime']['output'];
  walletType: LoyaltyMonetaryWalletType;
};


export type LoyaltyMonetaryWalletTransactionsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<LoyaltyMonetaryTransactionOrderByInput>>;
};

export type LoyaltyMonetaryWalletAdjustInput = {
  amountMinor: Scalars['BigInt']['input'];
  direction: LoyaltyMonetaryAdjustmentDirection;
  expiresAt?: InputMaybe<Scalars['DateTime']['input']>;
  metadata?: InputMaybe<Scalars['JSON']['input']>;
  occurredAt?: InputMaybe<Scalars['DateTime']['input']>;
  reasonCode: Scalars['String']['input'];
  walletId: Scalars['ID']['input'];
};

export type LoyaltyMonetaryWalletAdjustmentOperationInput = {
  amountMinor: Scalars['BigInt']['input'];
  direction: LoyaltyMonetaryAdjustmentDirection;
  expiresAt?: InputMaybe<Scalars['DateTime']['input']>;
  metadata?: InputMaybe<Scalars['JSON']['input']>;
  occurredAt?: InputMaybe<Scalars['DateTime']['input']>;
  reasonCode: Scalars['String']['input'];
};

export type LoyaltyMonetaryWalletBalance = {
  __typename?: 'LoyaltyMonetaryWalletBalance';
  available: LoyaltyMoney;
  debt: LoyaltyMoney;
  lastTransaction: Maybe<LoyaltyMonetaryTransaction>;
  pending: LoyaltyMoney;
  reserved: LoyaltyMoney;
  updatedAt: Scalars['DateTime']['output'];
};

export type LoyaltyMonetaryWalletBalanceRebuildInput = {
  walletId: Scalars['ID']['input'];
};

export type LoyaltyMonetaryWalletConnection = {
  __typename?: 'LoyaltyMonetaryWalletConnection';
  edges: Array<LoyaltyMonetaryWalletEdge>;
  pageInfo: PageInfo;
  totalCount: Scalars['Int']['output'];
};

export type LoyaltyMonetaryWalletEdge = {
  __typename?: 'LoyaltyMonetaryWalletEdge';
  cursor: Scalars['String']['output'];
  node: LoyaltyMonetaryWallet;
};

export type LoyaltyMonetaryWalletOperationPayload = {
  __typename?: 'LoyaltyMonetaryWalletOperationPayload';
  monetaryWallet: Maybe<LoyaltyMonetaryWallet>;
  transaction: Maybe<LoyaltyMonetaryTransaction>;
  userErrors: Array<LoyaltyUserError>;
};

export type LoyaltyMonetaryWalletOrderByInput = {
  direction: SortDirection;
  field: LoyaltyMonetaryWalletOrderField;
};

export enum LoyaltyMonetaryWalletOrderField {
  ClosedAt = 'closedAt',
  CurrencyCode = 'currencyCode',
  Id = 'id',
  OpenedAt = 'openedAt',
  Status = 'status',
  UpdatedAt = 'updatedAt',
  WalletType = 'walletType'
}

export type LoyaltyMonetaryWalletPayload = {
  __typename?: 'LoyaltyMonetaryWalletPayload';
  monetaryWallet: Maybe<LoyaltyMonetaryWallet>;
  userErrors: Array<LoyaltyUserError>;
};

export enum LoyaltyMonetaryWalletStatus {
  Active = 'ACTIVE',
  Closed = 'CLOSED',
  Merged = 'MERGED',
  Suspended = 'SUSPENDED'
}

export type LoyaltyMonetaryWalletStatusOperationInput = {
  reasonCode: Scalars['String']['input'];
  status: LoyaltyMonetaryWalletStatus;
};

export type LoyaltyMonetaryWalletStatusUpdateInput = {
  reasonCode: Scalars['String']['input'];
  status: LoyaltyMonetaryWalletStatus;
  walletId: Scalars['ID']['input'];
};

export enum LoyaltyMonetaryWalletType {
  Cashback = 'CASHBACK',
  StoreCredit = 'STORE_CREDIT'
}

export type LoyaltyMonetaryWalletUpdateInput = {
  adjustments?: InputMaybe<Array<LoyaltyMonetaryWalletAdjustmentOperationInput>>;
  rebuildBalance?: InputMaybe<Scalars['Boolean']['input']>;
  status?: InputMaybe<LoyaltyMonetaryWalletStatusOperationInput>;
};

export type LoyaltyMonetaryWalletUpdatePayload = {
  __typename?: 'LoyaltyMonetaryWalletUpdatePayload';
  monetaryWallet: Maybe<LoyaltyMonetaryWallet>;
  operationResults: Array<LoyaltyOperationResult>;
  userErrors: Array<LoyaltyUserError>;
};

export type LoyaltyMonetaryWalletWhereInput = {
  accountIds?: InputMaybe<Array<Scalars['ID']['input']>>;
  currencyCodes?: InputMaybe<Array<CurrencyCode>>;
  statuses?: InputMaybe<Array<LoyaltyMonetaryWalletStatus>>;
  walletTypes?: InputMaybe<Array<LoyaltyMonetaryWalletType>>;
};

export type LoyaltyMoney = {
  __typename?: 'LoyaltyMoney';
  amountMinor: Scalars['BigInt']['output'];
  currencyCode: CurrencyCode;
};

export type LoyaltyMutation = {
  __typename?: 'LoyaltyMutation';
  accountUpdate: LoyaltyAccountUpdatePayload;
  maintenanceRun: LoyaltyMaintenanceRunPayload;
  monetaryWalletUpdate: LoyaltyMonetaryWalletUpdatePayload;
  programCreate: LoyaltyProgramCreatePayload;
  programUpdate: LoyaltyProgramUpdatePayload;
  reservationUpdate: LoyaltyReservationUpdatePayload;
};


export type LoyaltyMutationAccountUpdateArgs = {
  accountId: Scalars['ID']['input'];
  operations: LoyaltyAccountUpdateInput;
};


export type LoyaltyMutationMaintenanceRunArgs = {
  input: LoyaltyMaintenanceRunInput;
};


export type LoyaltyMutationMonetaryWalletUpdateArgs = {
  monetaryWalletId: Scalars['ID']['input'];
  operations: LoyaltyMonetaryWalletUpdateInput;
};


export type LoyaltyMutationProgramCreateArgs = {
  input: LoyaltyProgramCreateInput;
};


export type LoyaltyMutationProgramUpdateArgs = {
  operations: LoyaltyProgramUpdateInput;
  programId: Scalars['ID']['input'];
};


export type LoyaltyMutationReservationUpdateArgs = {
  operations: LoyaltyReservationUpdateInput;
  reservationId: Scalars['ID']['input'];
};

export type LoyaltyOperationResult = {
  __typename?: 'LoyaltyOperationResult';
  account: Maybe<LoyaltyAccount>;
  amount: Maybe<LoyaltyMoney>;
  applied: Scalars['Boolean']['output'];
  entityId: Maybe<Scalars['ID']['output']>;
  errors: Array<LoyaltyUserError>;
  monetaryTransaction: Maybe<LoyaltyMonetaryTransaction>;
  monetaryWallet: Maybe<LoyaltyMonetaryWallet>;
  pointsTransaction: Maybe<LoyaltyTransaction>;
  reservation: Maybe<LoyaltyReservation>;
  rewardEntitlement: Maybe<LoyaltyRewardEntitlement>;
  tierMembership: Maybe<LoyaltyTierMembership>;
  transaction: Maybe<LoyaltyTransaction>;
  type: LoyaltyOperationType;
};

export enum LoyaltyOperationType {
  AccountBalanceRebuild = 'ACCOUNT_BALANCE_REBUILD',
  AccountStatusUpdate = 'ACCOUNT_STATUS_UPDATE',
  EarningRuleCreate = 'EARNING_RULE_CREATE',
  EarningRuleDelete = 'EARNING_RULE_DELETE',
  EarningRuleUpdate = 'EARNING_RULE_UPDATE',
  MonetaryWalletAdjust = 'MONETARY_WALLET_ADJUST',
  MonetaryWalletBalanceRebuild = 'MONETARY_WALLET_BALANCE_REBUILD',
  MonetaryWalletStatusUpdate = 'MONETARY_WALLET_STATUS_UPDATE',
  PointsAdjust = 'POINTS_ADJUST',
  PointsConvertToMonetary = 'POINTS_CONVERT_TO_MONETARY',
  ProgramFieldsUpdate = 'PROGRAM_FIELDS_UPDATE',
  ProgramVersionCreate = 'PROGRAM_VERSION_CREATE',
  ProgramVersionDelete = 'PROGRAM_VERSION_DELETE',
  ProgramVersionPublish = 'PROGRAM_VERSION_PUBLISH',
  ProgramVersionUpdate = 'PROGRAM_VERSION_UPDATE',
  ReservationRelease = 'RESERVATION_RELEASE',
  RewardDefinitionCreate = 'REWARD_DEFINITION_CREATE',
  RewardDefinitionDelete = 'REWARD_DEFINITION_DELETE',
  RewardDefinitionUpdate = 'REWARD_DEFINITION_UPDATE',
  RewardEntitlementIssue = 'REWARD_ENTITLEMENT_ISSUE',
  RewardEntitlementRelease = 'REWARD_ENTITLEMENT_RELEASE',
  RewardEntitlementRevoke = 'REWARD_ENTITLEMENT_REVOKE',
  TierCreate = 'TIER_CREATE',
  TierDelete = 'TIER_DELETE',
  TierEvaluate = 'TIER_EVALUATE',
  TierMembershipRevoke = 'TIER_MEMBERSHIP_REVOKE',
  TierPolicyDelete = 'TIER_POLICY_DELETE',
  TierPolicyUpsert = 'TIER_POLICY_UPSERT',
  TierRewardBenefitCreate = 'TIER_REWARD_BENEFIT_CREATE',
  TierRewardBenefitDelete = 'TIER_REWARD_BENEFIT_DELETE',
  TierUpdate = 'TIER_UPDATE'
}

export enum LoyaltyOwnedEntityOperationAction {
  Create = 'CREATE',
  Delete = 'DELETE',
  Update = 'UPDATE'
}

export type LoyaltyPointLot = Node & {
  __typename?: 'LoyaltyPointLot';
  account: LoyaltyAccount;
  activatedAt: Scalars['DateTime']['output'];
  allocations: Array<LoyaltyLotAllocation>;
  createdAt: Scalars['DateTime']['output'];
  expiresAt: Maybe<Scalars['DateTime']['output']>;
  id: Scalars['ID']['output'];
  originEntry: LoyaltyLedgerEntry;
  pointsIssued: Scalars['BigInt']['output'];
  program: LoyaltyProgram;
  remainingPoints: Scalars['BigInt']['output'];
};

export type LoyaltyPointsAdjustInput = {
  accountId: Scalars['ID']['input'];
  description: Scalars['String']['input'];
  direction: LoyaltyPointsAdjustmentDirection;
  expiresAt?: InputMaybe<Scalars['DateTime']['input']>;
  metadata?: InputMaybe<Scalars['JSON']['input']>;
  points: Scalars['BigInt']['input'];
  reasonCode: Scalars['String']['input'];
};

export type LoyaltyPointsAdjustPayload = {
  __typename?: 'LoyaltyPointsAdjustPayload';
  account: Maybe<LoyaltyAccount>;
  transaction: Maybe<LoyaltyTransaction>;
  userErrors: Array<LoyaltyUserError>;
};

export enum LoyaltyPointsAdjustmentDirection {
  Credit = 'CREDIT',
  Debit = 'DEBIT'
}

export type LoyaltyPointsAdjustmentOperationInput = {
  description: Scalars['String']['input'];
  direction: LoyaltyPointsAdjustmentDirection;
  expiresAt?: InputMaybe<Scalars['DateTime']['input']>;
  metadata?: InputMaybe<Scalars['JSON']['input']>;
  points: Scalars['BigInt']['input'];
  reasonCode: Scalars['String']['input'];
};

export type LoyaltyPointsConvertToMonetaryInput = {
  accountId: Scalars['ID']['input'];
  currencyCode: CurrencyCode;
  occurredAt?: InputMaybe<Scalars['DateTime']['input']>;
  points: Scalars['BigInt']['input'];
  programVersionId: Scalars['ID']['input'];
  walletType: LoyaltyMonetaryWalletType;
};

export type LoyaltyPointsConvertToMonetaryPayload = {
  __typename?: 'LoyaltyPointsConvertToMonetaryPayload';
  account: Maybe<LoyaltyAccount>;
  amount: Maybe<LoyaltyMoney>;
  monetaryTransaction: Maybe<LoyaltyMonetaryTransaction>;
  monetaryWallet: Maybe<LoyaltyMonetaryWallet>;
  pointsTransaction: Maybe<LoyaltyTransaction>;
  userErrors: Array<LoyaltyUserError>;
};

export type LoyaltyPointsToMonetaryOperationInput = {
  currencyCode: CurrencyCode;
  occurredAt?: InputMaybe<Scalars['DateTime']['input']>;
  points: Scalars['BigInt']['input'];
  programVersionId: Scalars['ID']['input'];
  walletType: LoyaltyMonetaryWalletType;
};

export type LoyaltyProgram = Node & {
  __typename?: 'LoyaltyProgram';
  activeVersion: Maybe<LoyaltyProgramVersion>;
  archivedAt: Maybe<Scalars['DateTime']['output']>;
  code: Scalars['String']['output'];
  createdAt: Scalars['DateTime']['output'];
  defaultCurrencyCode: CurrencyCode;
  id: Scalars['ID']['output'];
  isDefault: Scalars['Boolean']['output'];
  metadata: Scalars['JSON']['output'];
  name: Scalars['String']['output'];
  status: LoyaltyProgramStatus;
  updatedAt: Scalars['DateTime']['output'];
  versions: Array<LoyaltyProgramVersion>;
};

export type LoyaltyProgramConnection = {
  __typename?: 'LoyaltyProgramConnection';
  edges: Array<LoyaltyProgramEdge>;
  pageInfo: PageInfo;
  totalCount: Scalars['Int']['output'];
};

export type LoyaltyProgramCreateInput = {
  code: Scalars['String']['input'];
  defaultCurrencyCode: CurrencyCode;
  isDefault?: InputMaybe<Scalars['Boolean']['input']>;
  metadata?: InputMaybe<Scalars['JSON']['input']>;
  name: Scalars['String']['input'];
};

export type LoyaltyProgramCreatePayload = {
  __typename?: 'LoyaltyProgramCreatePayload';
  program: Maybe<LoyaltyProgram>;
  userErrors: Array<LoyaltyUserError>;
};

export type LoyaltyProgramEarningRules = {
  __typename?: 'LoyaltyProgramEarningRules';
  eligibleSpendBasis: LoyaltyEligibleSpendBasis;
  excludedSelectors: Array<LoyaltyCatalogSelector>;
  modifierStackingMode: LoyaltyModifierStackingMode;
  modifiers: Array<LoyaltyEarningModifier>;
};

export type LoyaltyProgramEarningRulesInput = {
  eligibleSpendBasis: LoyaltyEligibleSpendBasis;
  excludedSelectors: Array<LoyaltyCatalogSelectorInput>;
  modifierStackingMode?: InputMaybe<LoyaltyModifierStackingMode>;
  modifiers: Array<LoyaltyEarningModifierInput>;
};

export type LoyaltyProgramEdge = {
  __typename?: 'LoyaltyProgramEdge';
  cursor: Scalars['String']['output'];
  node: LoyaltyProgram;
};

export type LoyaltyProgramEligibility = {
  __typename?: 'LoyaltyProgramEligibility';
  channelCodes: Array<Scalars['String']['output']>;
  excludedSegmentIds: Array<Scalars['ID']['output']>;
  segmentIds: Array<Scalars['ID']['output']>;
  /** Present only for SEGMENTS eligibility. */
  segmentMatchMode: Maybe<LoyaltySegmentMatchMode>;
  type: LoyaltyProgramEligibilityType;
};

export type LoyaltyProgramEligibilityInput = {
  channelCodes: Array<Scalars['String']['input']>;
  excludedSegmentIds?: Array<Scalars['ID']['input']>;
  /** Must be empty for ALL and non-empty for SEGMENTS. */
  segmentIds?: Array<Scalars['ID']['input']>;
  /** Required for SEGMENTS and forbidden for ALL. */
  segmentMatchMode?: InputMaybe<LoyaltySegmentMatchMode>;
  type: LoyaltyProgramEligibilityType;
};

export enum LoyaltyProgramEligibilityType {
  All = 'ALL',
  Segments = 'SEGMENTS'
}

export type LoyaltyProgramFieldsInput = {
  isDefault?: InputMaybe<Scalars['Boolean']['input']>;
  metadata?: InputMaybe<Scalars['JSON']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<LoyaltyProgramStatus>;
};

export type LoyaltyProgramOrderByInput = {
  direction: SortDirection;
  field: LoyaltyProgramOrderField;
};

export enum LoyaltyProgramOrderField {
  ArchivedAt = 'archivedAt',
  Code = 'code',
  CreatedAt = 'createdAt',
  Id = 'id',
  IsDefault = 'isDefault',
  Name = 'name',
  Status = 'status',
  UpdatedAt = 'updatedAt'
}

export type LoyaltyProgramRules = {
  __typename?: 'LoyaltyProgramRules';
  earning: LoyaltyProgramEarningRules;
  eligibility: LoyaltyProgramEligibility;
  schemaVersion: Scalars['Int']['output'];
};

export type LoyaltyProgramRulesInput = {
  earning: LoyaltyProgramEarningRulesInput;
  eligibility: LoyaltyProgramEligibilityInput;
  schemaVersion?: InputMaybe<Scalars['Int']['input']>;
};

export enum LoyaltyProgramStatus {
  Active = 'ACTIVE',
  Archived = 'ARCHIVED',
  Draft = 'DRAFT',
  Paused = 'PAUSED'
}

export type LoyaltyProgramUpdateInput = {
  fields?: InputMaybe<LoyaltyProgramFieldsInput>;
  versions?: InputMaybe<Array<LoyaltyProgramVersionOperationInput>>;
};

export type LoyaltyProgramUpdatePayload = {
  __typename?: 'LoyaltyProgramUpdatePayload';
  operationResults: Array<LoyaltyOperationResult>;
  program: Maybe<LoyaltyProgram>;
  userErrors: Array<LoyaltyUserError>;
};

export type LoyaltyProgramVersion = Node & {
  __typename?: 'LoyaltyProgramVersion';
  activationDelaySeconds: Scalars['Int']['output'];
  createdAt: Scalars['DateTime']['output'];
  createdById: Maybe<Scalars['ID']['output']>;
  debtPolicy: LoyaltyDebtPolicy;
  earnAmountMinor: Scalars['BigInt']['output'];
  earnPoints: Scalars['BigInt']['output'];
  earningEnabled: Scalars['Boolean']['output'];
  earningRules: Array<LoyaltyEarningRule>;
  effectiveFrom: Maybe<Scalars['DateTime']['output']>;
  effectiveTo: Maybe<Scalars['DateTime']['output']>;
  id: Scalars['ID']['output'];
  maximumOrderPercentageBps: Scalars['Int']['output'];
  maximumRedeemPointsPerOrder: Maybe<Scalars['BigInt']['output']>;
  minimumEligibleAmountMinor: Scalars['BigInt']['output'];
  minimumRedeemPoints: Scalars['BigInt']['output'];
  pointsExpiryDays: Maybe<Scalars['Int']['output']>;
  program: LoyaltyProgram;
  publishedAt: Maybe<Scalars['DateTime']['output']>;
  publishedById: Maybe<Scalars['ID']['output']>;
  redeemAmountMinor: Scalars['BigInt']['output'];
  redeemPoints: Scalars['BigInt']['output'];
  redemptionEnabled: Scalars['Boolean']['output'];
  referenceReconciliationCheckedAt: Maybe<Scalars['DateTime']['output']>;
  referenceReconciliationStatus: LoyaltyReferenceReconciliationStatus;
  refundPolicy: LoyaltyRefundPolicy;
  restoredPointsExpiryPolicy: LoyaltyRestoredPointsExpiryPolicy;
  rewardDefinitions: Array<LoyaltyRewardDefinition>;
  roundingMode: LoyaltyRoundingMode;
  rules: LoyaltyProgramRules;
  rulesSchemaVersion: Scalars['Int']['output'];
  status: LoyaltyProgramVersionStatus;
  tierPolicy: Maybe<LoyaltyTierPolicy>;
  tiers: Array<LoyaltyTier>;
  version: Scalars['Int']['output'];
};

export type LoyaltyProgramVersionCreateInput = {
  activationDelaySeconds?: InputMaybe<Scalars['Int']['input']>;
  debtPolicy?: InputMaybe<LoyaltyDebtPolicy>;
  earnAmountMinor: Scalars['BigInt']['input'];
  earnPoints: Scalars['BigInt']['input'];
  earningEnabled?: InputMaybe<Scalars['Boolean']['input']>;
  earningRules?: Array<LoyaltyEarningRuleInput>;
  effectiveFrom?: InputMaybe<Scalars['DateTime']['input']>;
  effectiveTo?: InputMaybe<Scalars['DateTime']['input']>;
  maximumOrderPercentageBps?: InputMaybe<Scalars['Int']['input']>;
  maximumRedeemPointsPerOrder?: InputMaybe<Scalars['BigInt']['input']>;
  minimumEligibleAmountMinor?: InputMaybe<Scalars['BigInt']['input']>;
  minimumRedeemPoints?: InputMaybe<Scalars['BigInt']['input']>;
  pointsExpiryDays?: InputMaybe<Scalars['Int']['input']>;
  programId: Scalars['ID']['input'];
  redeemAmountMinor: Scalars['BigInt']['input'];
  redeemPoints: Scalars['BigInt']['input'];
  redemptionEnabled?: InputMaybe<Scalars['Boolean']['input']>;
  refundPolicy?: InputMaybe<LoyaltyRefundPolicy>;
  restoredPointsExpiryPolicy?: InputMaybe<LoyaltyRestoredPointsExpiryPolicy>;
  rewardDefinitions?: Array<LoyaltyRewardDefinitionInput>;
  roundingMode?: InputMaybe<LoyaltyRoundingMode>;
  rules: LoyaltyProgramRulesInput;
  rulesSchemaVersion?: InputMaybe<Scalars['Int']['input']>;
  tierPolicy?: InputMaybe<LoyaltyTierPolicyInput>;
  tiers?: InputMaybe<Array<LoyaltyTierInput>>;
};

export type LoyaltyProgramVersionCreateOperationValuesInput = {
  activationDelaySeconds?: InputMaybe<Scalars['Int']['input']>;
  debtPolicy?: InputMaybe<LoyaltyDebtPolicy>;
  earnAmountMinor: Scalars['BigInt']['input'];
  earnPoints: Scalars['BigInt']['input'];
  earningEnabled?: InputMaybe<Scalars['Boolean']['input']>;
  earningRules?: Array<LoyaltyEarningRuleInput>;
  effectiveFrom?: InputMaybe<Scalars['DateTime']['input']>;
  effectiveTo?: InputMaybe<Scalars['DateTime']['input']>;
  maximumOrderPercentageBps?: InputMaybe<Scalars['Int']['input']>;
  maximumRedeemPointsPerOrder?: InputMaybe<Scalars['BigInt']['input']>;
  minimumEligibleAmountMinor?: InputMaybe<Scalars['BigInt']['input']>;
  minimumRedeemPoints?: InputMaybe<Scalars['BigInt']['input']>;
  pointsExpiryDays?: InputMaybe<Scalars['Int']['input']>;
  redeemAmountMinor: Scalars['BigInt']['input'];
  redeemPoints: Scalars['BigInt']['input'];
  redemptionEnabled?: InputMaybe<Scalars['Boolean']['input']>;
  refundPolicy?: InputMaybe<LoyaltyRefundPolicy>;
  restoredPointsExpiryPolicy?: InputMaybe<LoyaltyRestoredPointsExpiryPolicy>;
  rewardDefinitions?: Array<LoyaltyRewardDefinitionInput>;
  roundingMode?: InputMaybe<LoyaltyRoundingMode>;
  rules: LoyaltyProgramRulesInput;
  rulesSchemaVersion?: InputMaybe<Scalars['Int']['input']>;
  tierPolicy?: InputMaybe<LoyaltyTierPolicyInput>;
  tiers?: InputMaybe<Array<LoyaltyTierInput>>;
};

export type LoyaltyProgramVersionCreatePayload = {
  __typename?: 'LoyaltyProgramVersionCreatePayload';
  programVersion: Maybe<LoyaltyProgramVersion>;
  userErrors: Array<LoyaltyUserError>;
};

export type LoyaltyProgramVersionDeleteInput = {
  programVersionId: Scalars['ID']['input'];
};

export type LoyaltyProgramVersionDeletePayload = {
  __typename?: 'LoyaltyProgramVersionDeletePayload';
  deletedProgramVersionId: Maybe<Scalars['ID']['output']>;
  userErrors: Array<LoyaltyUserError>;
};

export enum LoyaltyProgramVersionOperationAction {
  Create = 'CREATE',
  Delete = 'DELETE',
  Publish = 'PUBLISH',
  Update = 'UPDATE'
}

export type LoyaltyProgramVersionOperationInput = {
  action: LoyaltyProgramVersionOperationAction;
  create?: InputMaybe<LoyaltyProgramVersionCreateOperationValuesInput>;
  programVersionId?: InputMaybe<Scalars['ID']['input']>;
  publish?: InputMaybe<LoyaltyProgramVersionPublishOperationValuesInput>;
  update?: InputMaybe<LoyaltyProgramVersionUpdateOperationValuesInput>;
};

export type LoyaltyProgramVersionPublishInput = {
  effectiveFrom: Scalars['DateTime']['input'];
  effectiveTo?: InputMaybe<Scalars['DateTime']['input']>;
  programVersionId: Scalars['ID']['input'];
};

export type LoyaltyProgramVersionPublishOperationValuesInput = {
  effectiveFrom: Scalars['DateTime']['input'];
  effectiveTo?: InputMaybe<Scalars['DateTime']['input']>;
};

export type LoyaltyProgramVersionPublishPayload = {
  __typename?: 'LoyaltyProgramVersionPublishPayload';
  programVersion: Maybe<LoyaltyProgramVersion>;
  userErrors: Array<LoyaltyUserError>;
};

export enum LoyaltyProgramVersionStatus {
  Active = 'ACTIVE',
  Draft = 'DRAFT',
  Retired = 'RETIRED',
  Scheduled = 'SCHEDULED'
}

export type LoyaltyProgramVersionUpdateInput = {
  activationDelaySeconds?: InputMaybe<Scalars['Int']['input']>;
  clearEffectiveTo?: InputMaybe<Scalars['Boolean']['input']>;
  clearMaximumRedeemPointsPerOrder?: InputMaybe<Scalars['Boolean']['input']>;
  clearPointsExpiryDays?: InputMaybe<Scalars['Boolean']['input']>;
  debtPolicy?: InputMaybe<LoyaltyDebtPolicy>;
  earnAmountMinor?: InputMaybe<Scalars['BigInt']['input']>;
  earnPoints?: InputMaybe<Scalars['BigInt']['input']>;
  earningEnabled?: InputMaybe<Scalars['Boolean']['input']>;
  effectiveFrom?: InputMaybe<Scalars['DateTime']['input']>;
  effectiveTo?: InputMaybe<Scalars['DateTime']['input']>;
  maximumOrderPercentageBps?: InputMaybe<Scalars['Int']['input']>;
  maximumRedeemPointsPerOrder?: InputMaybe<Scalars['BigInt']['input']>;
  minimumEligibleAmountMinor?: InputMaybe<Scalars['BigInt']['input']>;
  minimumRedeemPoints?: InputMaybe<Scalars['BigInt']['input']>;
  pointsExpiryDays?: InputMaybe<Scalars['Int']['input']>;
  programVersionId: Scalars['ID']['input'];
  redeemAmountMinor?: InputMaybe<Scalars['BigInt']['input']>;
  redeemPoints?: InputMaybe<Scalars['BigInt']['input']>;
  redemptionEnabled?: InputMaybe<Scalars['Boolean']['input']>;
  refundPolicy?: InputMaybe<LoyaltyRefundPolicy>;
  restoredPointsExpiryPolicy?: InputMaybe<LoyaltyRestoredPointsExpiryPolicy>;
  roundingMode?: InputMaybe<LoyaltyRoundingMode>;
  rules?: InputMaybe<LoyaltyProgramRulesInput>;
};

export type LoyaltyProgramVersionUpdateOperationValuesInput = {
  activationDelaySeconds?: InputMaybe<Scalars['Int']['input']>;
  clearEffectiveTo?: InputMaybe<Scalars['Boolean']['input']>;
  clearMaximumRedeemPointsPerOrder?: InputMaybe<Scalars['Boolean']['input']>;
  clearPointsExpiryDays?: InputMaybe<Scalars['Boolean']['input']>;
  debtPolicy?: InputMaybe<LoyaltyDebtPolicy>;
  earnAmountMinor?: InputMaybe<Scalars['BigInt']['input']>;
  earnPoints?: InputMaybe<Scalars['BigInt']['input']>;
  earningEnabled?: InputMaybe<Scalars['Boolean']['input']>;
  earningRules?: InputMaybe<Array<LoyaltyEarningRuleOperationInput>>;
  effectiveFrom?: InputMaybe<Scalars['DateTime']['input']>;
  effectiveTo?: InputMaybe<Scalars['DateTime']['input']>;
  maximumOrderPercentageBps?: InputMaybe<Scalars['Int']['input']>;
  maximumRedeemPointsPerOrder?: InputMaybe<Scalars['BigInt']['input']>;
  minimumEligibleAmountMinor?: InputMaybe<Scalars['BigInt']['input']>;
  minimumRedeemPoints?: InputMaybe<Scalars['BigInt']['input']>;
  pointsExpiryDays?: InputMaybe<Scalars['Int']['input']>;
  redeemAmountMinor?: InputMaybe<Scalars['BigInt']['input']>;
  redeemPoints?: InputMaybe<Scalars['BigInt']['input']>;
  redemptionEnabled?: InputMaybe<Scalars['Boolean']['input']>;
  refundPolicy?: InputMaybe<LoyaltyRefundPolicy>;
  restoredPointsExpiryPolicy?: InputMaybe<LoyaltyRestoredPointsExpiryPolicy>;
  rewardDefinitions?: InputMaybe<Array<LoyaltyRewardDefinitionOperationInput>>;
  roundingMode?: InputMaybe<LoyaltyRoundingMode>;
  rules?: InputMaybe<LoyaltyProgramRulesInput>;
  tierPolicy?: InputMaybe<LoyaltyTierPolicyOperationInput>;
  tiers?: InputMaybe<Array<LoyaltyTierOperationInput>>;
};

export type LoyaltyProgramVersionUpdatePayload = {
  __typename?: 'LoyaltyProgramVersionUpdatePayload';
  programVersion: Maybe<LoyaltyProgramVersion>;
  userErrors: Array<LoyaltyUserError>;
};

export type LoyaltyProgramWhereInput = {
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  isDefault?: InputMaybe<Scalars['Boolean']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  statuses?: InputMaybe<Array<LoyaltyProgramStatus>>;
};

export type LoyaltyQuery = {
  __typename?: 'LoyaltyQuery';
  account: Maybe<LoyaltyAccount>;
  accounts: LoyaltyAccountConnection;
  customerAccount: Maybe<LoyaltyAccount>;
  earningRule: Maybe<LoyaltyEarningRule>;
  earningRuleUsages: LoyaltyEarningRuleUsageConnection;
  eventEvaluation: Maybe<LoyaltyEventEvaluation>;
  eventEvaluations: LoyaltyEventEvaluationConnection;
  eventFact: Maybe<LoyaltyEventFact>;
  eventFacts: LoyaltyEventFactConnection;
  monetaryTransaction: Maybe<LoyaltyMonetaryTransaction>;
  monetaryTransactions: LoyaltyMonetaryTransactionConnection;
  monetaryWallet: Maybe<LoyaltyMonetaryWallet>;
  monetaryWallets: LoyaltyMonetaryWalletConnection;
  node: Maybe<Node>;
  nodes: Array<Maybe<Node>>;
  program: Maybe<LoyaltyProgram>;
  programVersion: Maybe<LoyaltyProgramVersion>;
  programs: LoyaltyProgramConnection;
  reservation: Maybe<LoyaltyReservation>;
  reservations: LoyaltyReservationConnection;
  rewardDefinition: Maybe<LoyaltyRewardDefinition>;
  rewardEntitlement: Maybe<LoyaltyRewardEntitlement>;
  rewardEntitlements: LoyaltyRewardEntitlementConnection;
  tier: Maybe<LoyaltyTier>;
  tierMembership: Maybe<LoyaltyTierMembership>;
  tierMemberships: LoyaltyTierMembershipConnection;
  tierPolicy: Maybe<LoyaltyTierPolicy>;
  transaction: Maybe<LoyaltyTransaction>;
  transactions: LoyaltyTransactionConnection;
};


export type LoyaltyQueryAccountArgs = {
  id: Scalars['ID']['input'];
};


export type LoyaltyQueryAccountsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<LoyaltyAccountOrderByInput>>;
  where?: InputMaybe<LoyaltyAccountWhereInput>;
};


export type LoyaltyQueryCustomerAccountArgs = {
  customerId: Scalars['ID']['input'];
  programId?: InputMaybe<Scalars['ID']['input']>;
};


export type LoyaltyQueryEarningRuleArgs = {
  id: Scalars['ID']['input'];
};


export type LoyaltyQueryEarningRuleUsagesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<LoyaltyEarningRuleUsageOrderByInput>>;
  where: LoyaltyEarningRuleUsageWhereInput;
};


export type LoyaltyQueryEventEvaluationArgs = {
  id: Scalars['ID']['input'];
};


export type LoyaltyQueryEventEvaluationsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<LoyaltyEventEvaluationOrderByInput>>;
  where: LoyaltyEventEvaluationWhereInput;
};


export type LoyaltyQueryEventFactArgs = {
  id: Scalars['ID']['input'];
};


export type LoyaltyQueryEventFactsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<LoyaltyEventFactOrderByInput>>;
  where?: InputMaybe<LoyaltyEventFactWhereInput>;
};


export type LoyaltyQueryMonetaryTransactionArgs = {
  id: Scalars['ID']['input'];
};


export type LoyaltyQueryMonetaryTransactionsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<LoyaltyMonetaryTransactionOrderByInput>>;
  walletId: Scalars['ID']['input'];
};


export type LoyaltyQueryMonetaryWalletArgs = {
  id: Scalars['ID']['input'];
};


export type LoyaltyQueryMonetaryWalletsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<LoyaltyMonetaryWalletOrderByInput>>;
  where: LoyaltyMonetaryWalletWhereInput;
};


export type LoyaltyQueryNodeArgs = {
  id: Scalars['ID']['input'];
};


export type LoyaltyQueryNodesArgs = {
  ids: Array<Scalars['ID']['input']>;
};


export type LoyaltyQueryProgramArgs = {
  id: Scalars['ID']['input'];
};


export type LoyaltyQueryProgramVersionArgs = {
  id: Scalars['ID']['input'];
};


export type LoyaltyQueryProgramsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<LoyaltyProgramOrderByInput>>;
  where?: InputMaybe<LoyaltyProgramWhereInput>;
};


export type LoyaltyQueryReservationArgs = {
  id: Scalars['ID']['input'];
};


export type LoyaltyQueryReservationsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<LoyaltyReservationOrderByInput>>;
  where?: InputMaybe<LoyaltyReservationWhereInput>;
};


export type LoyaltyQueryRewardDefinitionArgs = {
  id: Scalars['ID']['input'];
};


export type LoyaltyQueryRewardEntitlementArgs = {
  id: Scalars['ID']['input'];
};


export type LoyaltyQueryRewardEntitlementsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<LoyaltyRewardEntitlementOrderByInput>>;
  where: LoyaltyRewardEntitlementWhereInput;
};


export type LoyaltyQueryTierArgs = {
  id: Scalars['ID']['input'];
};


export type LoyaltyQueryTierMembershipArgs = {
  id: Scalars['ID']['input'];
};


export type LoyaltyQueryTierMembershipsArgs = {
  accountId: Scalars['ID']['input'];
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<LoyaltyTierMembershipOrderByInput>>;
};


export type LoyaltyQueryTierPolicyArgs = {
  id: Scalars['ID']['input'];
};


export type LoyaltyQueryTransactionArgs = {
  id: Scalars['ID']['input'];
};


export type LoyaltyQueryTransactionsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<LoyaltyTransactionOrderByInput>>;
  where?: InputMaybe<LoyaltyTransactionWhereInput>;
};

/**
 * Whether cross-service references (segments, catalog selectors, Pricing
 * discounts) carried by a published program version's rules were still
 * resolvable the last time reconciliation ran. Mutable operational metadata,
 * separate from the immutable rules snapshot.
 */
export enum LoyaltyReferenceReconciliationStatus {
  Stale = 'STALE',
  Valid = 'VALID'
}

export enum LoyaltyRefundPolicy {
  FullReversal = 'FULL_REVERSAL',
  Proportional = 'PROPORTIONAL'
}

export type LoyaltyReservation = Node & {
  __typename?: 'LoyaltyReservation';
  account: LoyaltyAccount;
  checkoutId: Scalars['ID']['output'];
  committedAt: Maybe<Scalars['DateTime']['output']>;
  createdAt: Scalars['DateTime']['output'];
  discount: LoyaltyMoney;
  events: Array<LoyaltyReservationEvent>;
  expiredAt: Maybe<Scalars['DateTime']['output']>;
  expiresAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  orderId: Maybe<Scalars['ID']['output']>;
  orderRevision: Maybe<Scalars['Int']['output']>;
  points: Scalars['BigInt']['output'];
  program: LoyaltyProgram;
  programVersion: LoyaltyProgramVersion;
  quoteId: Scalars['ID']['output'];
  quoteRevision: Scalars['String']['output'];
  releasedAt: Maybe<Scalars['DateTime']['output']>;
  requestHash: Scalars['String']['output'];
  reversedAt: Maybe<Scalars['DateTime']['output']>;
  status: LoyaltyReservationStatus;
  updatedAt: Scalars['DateTime']['output'];
};

export type LoyaltyReservationConnection = {
  __typename?: 'LoyaltyReservationConnection';
  edges: Array<LoyaltyReservationEdge>;
  pageInfo: PageInfo;
  totalCount: Scalars['Int']['output'];
};

export type LoyaltyReservationEdge = {
  __typename?: 'LoyaltyReservationEdge';
  cursor: Scalars['String']['output'];
  node: LoyaltyReservation;
};

export type LoyaltyReservationEvent = Node & {
  __typename?: 'LoyaltyReservationEvent';
  actorId: Maybe<Scalars['ID']['output']>;
  actorType: LoyaltyActorType;
  createdAt: Scalars['DateTime']['output'];
  eventId: Maybe<Scalars['String']['output']>;
  eventType: LoyaltyReservationEventType;
  id: Scalars['ID']['output'];
  metadata: Scalars['JSON']['output'];
  occurredAt: Scalars['DateTime']['output'];
  previousStatus: Maybe<LoyaltyReservationStatus>;
  reasonCode: Scalars['String']['output'];
  reservation: LoyaltyReservation;
  status: LoyaltyReservationStatus;
  transaction: LoyaltyTransaction;
};

export enum LoyaltyReservationEventType {
  Committed = 'COMMITTED',
  Created = 'CREATED',
  Expired = 'EXPIRED',
  Released = 'RELEASED',
  Reversed = 'REVERSED'
}

export enum LoyaltyReservationOperationAction {
  Release = 'RELEASE'
}

export type LoyaltyReservationOrderByInput = {
  direction: SortDirection;
  field: LoyaltyReservationOrderField;
};

export enum LoyaltyReservationOrderField {
  CommittedAt = 'committedAt',
  CreatedAt = 'createdAt',
  ExpiresAt = 'expiresAt',
  Id = 'id',
  ReleasedAt = 'releasedAt',
  Status = 'status',
  UpdatedAt = 'updatedAt'
}

export type LoyaltyReservationReleaseOperationInput = {
  action: LoyaltyReservationOperationAction;
  reasonCode: Scalars['String']['input'];
};

export enum LoyaltyReservationStatus {
  Active = 'ACTIVE',
  Committed = 'COMMITTED',
  Expired = 'EXPIRED',
  Released = 'RELEASED',
  Reversed = 'REVERSED'
}

export type LoyaltyReservationUpdateInput = {
  releases?: InputMaybe<Array<LoyaltyReservationReleaseOperationInput>>;
};

export type LoyaltyReservationUpdatePayload = {
  __typename?: 'LoyaltyReservationUpdatePayload';
  operationResults: Array<LoyaltyOperationResult>;
  reservation: Maybe<LoyaltyReservation>;
  userErrors: Array<LoyaltyUserError>;
};

export type LoyaltyReservationWhereInput = {
  accountIds?: InputMaybe<Array<Scalars['ID']['input']>>;
  checkoutId?: InputMaybe<Scalars['ID']['input']>;
  createdFrom?: InputMaybe<Scalars['DateTime']['input']>;
  createdTo?: InputMaybe<Scalars['DateTime']['input']>;
  expiresBefore?: InputMaybe<Scalars['DateTime']['input']>;
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  orderId?: InputMaybe<Scalars['ID']['input']>;
  programIds?: InputMaybe<Array<Scalars['ID']['input']>>;
  statuses?: InputMaybe<Array<LoyaltyReservationStatus>>;
};

export enum LoyaltyRestoredPointsExpiryPolicy {
  OriginalExpiry = 'ORIGINAL_EXPIRY',
  ResetFromRestore = 'RESET_FROM_RESTORE'
}

export type LoyaltyRewardDefinition = Node & {
  __typename?: 'LoyaltyRewardDefinition';
  code: Scalars['String']['output'];
  configuration: Scalars['JSON']['output'];
  configurationSchemaVersion: Scalars['Int']['output'];
  createdAt: Scalars['DateTime']['output'];
  endsAt: Maybe<Scalars['DateTime']['output']>;
  id: Scalars['ID']['output'];
  issuanceLimit: Maybe<Scalars['BigInt']['output']>;
  issuedQuantity: Scalars['BigInt']['output'];
  name: Scalars['String']['output'];
  perAccountLimit: Maybe<Scalars['BigInt']['output']>;
  programVersion: LoyaltyProgramVersion;
  rewardType: LoyaltyRewardType;
  startsAt: Maybe<Scalars['DateTime']['output']>;
  validityDays: Maybe<Scalars['Int']['output']>;
};

export type LoyaltyRewardDefinitionCreateInput = {
  code: Scalars['String']['input'];
  configuration: Scalars['JSON']['input'];
  configurationSchemaVersion?: InputMaybe<Scalars['Int']['input']>;
  endsAt?: InputMaybe<Scalars['DateTime']['input']>;
  issuanceLimit?: InputMaybe<Scalars['BigInt']['input']>;
  name: Scalars['String']['input'];
  perAccountLimit?: InputMaybe<Scalars['BigInt']['input']>;
  programVersionId: Scalars['ID']['input'];
  rewardType: LoyaltyRewardType;
  startsAt?: InputMaybe<Scalars['DateTime']['input']>;
  validityDays?: InputMaybe<Scalars['Int']['input']>;
};

export type LoyaltyRewardDefinitionDeleteInput = {
  rewardDefinitionId: Scalars['ID']['input'];
};

export type LoyaltyRewardDefinitionInput = {
  code: Scalars['String']['input'];
  configuration: Scalars['JSON']['input'];
  configurationSchemaVersion?: InputMaybe<Scalars['Int']['input']>;
  endsAt?: InputMaybe<Scalars['DateTime']['input']>;
  issuanceLimit?: InputMaybe<Scalars['BigInt']['input']>;
  name: Scalars['String']['input'];
  perAccountLimit?: InputMaybe<Scalars['BigInt']['input']>;
  rewardType: LoyaltyRewardType;
  startsAt?: InputMaybe<Scalars['DateTime']['input']>;
  validityDays?: InputMaybe<Scalars['Int']['input']>;
};

export type LoyaltyRewardDefinitionOperationInput = {
  action: LoyaltyOwnedEntityOperationAction;
  create?: InputMaybe<LoyaltyRewardDefinitionInput>;
  rewardDefinitionId?: InputMaybe<Scalars['ID']['input']>;
  update?: InputMaybe<LoyaltyRewardDefinitionUpdateOperationValuesInput>;
};

export type LoyaltyRewardDefinitionPayload = {
  __typename?: 'LoyaltyRewardDefinitionPayload';
  rewardDefinition: Maybe<LoyaltyRewardDefinition>;
  userErrors: Array<LoyaltyUserError>;
};

export type LoyaltyRewardDefinitionUpdateInput = {
  clearEndsAt?: InputMaybe<Scalars['Boolean']['input']>;
  clearIssuanceLimit?: InputMaybe<Scalars['Boolean']['input']>;
  clearPerAccountLimit?: InputMaybe<Scalars['Boolean']['input']>;
  clearStartsAt?: InputMaybe<Scalars['Boolean']['input']>;
  clearValidityDays?: InputMaybe<Scalars['Boolean']['input']>;
  configuration?: InputMaybe<Scalars['JSON']['input']>;
  configurationSchemaVersion?: InputMaybe<Scalars['Int']['input']>;
  endsAt?: InputMaybe<Scalars['DateTime']['input']>;
  issuanceLimit?: InputMaybe<Scalars['BigInt']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  perAccountLimit?: InputMaybe<Scalars['BigInt']['input']>;
  rewardDefinitionId: Scalars['ID']['input'];
  rewardType?: InputMaybe<LoyaltyRewardType>;
  startsAt?: InputMaybe<Scalars['DateTime']['input']>;
  validityDays?: InputMaybe<Scalars['Int']['input']>;
};

export type LoyaltyRewardDefinitionUpdateOperationValuesInput = {
  clearEndsAt?: InputMaybe<Scalars['Boolean']['input']>;
  clearIssuanceLimit?: InputMaybe<Scalars['Boolean']['input']>;
  clearPerAccountLimit?: InputMaybe<Scalars['Boolean']['input']>;
  clearStartsAt?: InputMaybe<Scalars['Boolean']['input']>;
  clearValidityDays?: InputMaybe<Scalars['Boolean']['input']>;
  configuration?: InputMaybe<Scalars['JSON']['input']>;
  configurationSchemaVersion?: InputMaybe<Scalars['Int']['input']>;
  endsAt?: InputMaybe<Scalars['DateTime']['input']>;
  issuanceLimit?: InputMaybe<Scalars['BigInt']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  perAccountLimit?: InputMaybe<Scalars['BigInt']['input']>;
  rewardType?: InputMaybe<LoyaltyRewardType>;
  startsAt?: InputMaybe<Scalars['DateTime']['input']>;
  validityDays?: InputMaybe<Scalars['Int']['input']>;
};

export type LoyaltyRewardEntitlement = Node & {
  __typename?: 'LoyaltyRewardEntitlement';
  account: LoyaltyAccount;
  configurationSchemaVersion: Scalars['Int']['output'];
  configurationSnapshot: Scalars['JSON']['output'];
  definition: LoyaltyRewardDefinition;
  events: Array<LoyaltyRewardEntitlementEvent>;
  expiredAt: Maybe<Scalars['DateTime']['output']>;
  externalReference: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  issuanceTransaction: Maybe<LoyaltyTransaction>;
  issuedAt: Scalars['DateTime']['output'];
  monetaryTransaction: Maybe<LoyaltyMonetaryTransaction>;
  quantity: Scalars['BigInt']['output'];
  redeemedAt: Maybe<Scalars['DateTime']['output']>;
  redeemedOrderId: Maybe<Scalars['ID']['output']>;
  reservedAt: Maybe<Scalars['DateTime']['output']>;
  reservedForCheckoutId: Maybe<Scalars['ID']['output']>;
  revokedAt: Maybe<Scalars['DateTime']['output']>;
  sourceEventFact: Maybe<LoyaltyEventFact>;
  status: LoyaltyRewardEntitlementStatus;
  updatedAt: Scalars['DateTime']['output'];
  validFrom: Scalars['DateTime']['output'];
  validTo: Maybe<Scalars['DateTime']['output']>;
};

export type LoyaltyRewardEntitlementConnection = {
  __typename?: 'LoyaltyRewardEntitlementConnection';
  edges: Array<LoyaltyRewardEntitlementEdge>;
  pageInfo: PageInfo;
  totalCount: Scalars['Int']['output'];
};

export type LoyaltyRewardEntitlementEdge = {
  __typename?: 'LoyaltyRewardEntitlementEdge';
  cursor: Scalars['String']['output'];
  node: LoyaltyRewardEntitlement;
};

export type LoyaltyRewardEntitlementEvent = Node & {
  __typename?: 'LoyaltyRewardEntitlementEvent';
  actorId: Maybe<Scalars['ID']['output']>;
  actorType: LoyaltyActorType;
  createdAt: Scalars['DateTime']['output'];
  entitlement: LoyaltyRewardEntitlement;
  eventType: LoyaltyRewardEntitlementEventType;
  id: Scalars['ID']['output'];
  metadata: Scalars['JSON']['output'];
  occurredAt: Scalars['DateTime']['output'];
  previousStatus: Maybe<LoyaltyRewardEntitlementStatus>;
  reasonCode: Scalars['String']['output'];
  status: LoyaltyRewardEntitlementStatus;
};

export enum LoyaltyRewardEntitlementEventType {
  Expired = 'EXPIRED',
  Issued = 'ISSUED',
  Redeemed = 'REDEEMED',
  Released = 'RELEASED',
  Reserved = 'RESERVED',
  Revoked = 'REVOKED'
}

export type LoyaltyRewardEntitlementIssueInput = {
  accountId: Scalars['ID']['input'];
  externalReference?: InputMaybe<Scalars['String']['input']>;
  occurredAt?: InputMaybe<Scalars['DateTime']['input']>;
  quantity?: InputMaybe<Scalars['BigInt']['input']>;
  rewardDefinitionId: Scalars['ID']['input'];
};

export enum LoyaltyRewardEntitlementOperationAction {
  Issue = 'ISSUE',
  Release = 'RELEASE',
  Revoke = 'REVOKE'
}

export type LoyaltyRewardEntitlementOperationInput = {
  action: LoyaltyRewardEntitlementOperationAction;
  externalReference?: InputMaybe<Scalars['String']['input']>;
  occurredAt?: InputMaybe<Scalars['DateTime']['input']>;
  quantity?: InputMaybe<Scalars['BigInt']['input']>;
  reasonCode?: InputMaybe<Scalars['String']['input']>;
  rewardDefinitionId?: InputMaybe<Scalars['ID']['input']>;
  rewardEntitlementId?: InputMaybe<Scalars['ID']['input']>;
};

export type LoyaltyRewardEntitlementOrderByInput = {
  direction: SortDirection;
  field: LoyaltyRewardEntitlementOrderField;
};

export enum LoyaltyRewardEntitlementOrderField {
  ExpiredAt = 'expiredAt',
  Id = 'id',
  IssuedAt = 'issuedAt',
  Quantity = 'quantity',
  RedeemedAt = 'redeemedAt',
  RevokedAt = 'revokedAt',
  Status = 'status',
  UpdatedAt = 'updatedAt',
  ValidFrom = 'validFrom',
  ValidTo = 'validTo'
}

export type LoyaltyRewardEntitlementPayload = {
  __typename?: 'LoyaltyRewardEntitlementPayload';
  rewardEntitlement: Maybe<LoyaltyRewardEntitlement>;
  userErrors: Array<LoyaltyUserError>;
};

export enum LoyaltyRewardEntitlementStatus {
  Expired = 'EXPIRED',
  Issued = 'ISSUED',
  Redeemed = 'REDEEMED',
  Reserved = 'RESERVED',
  Revoked = 'REVOKED'
}

export type LoyaltyRewardEntitlementTransitionInput = {
  entitlementId: Scalars['ID']['input'];
  occurredAt?: InputMaybe<Scalars['DateTime']['input']>;
  reasonCode: Scalars['String']['input'];
};

export type LoyaltyRewardEntitlementWhereInput = {
  accountIds?: InputMaybe<Array<Scalars['ID']['input']>>;
  rewardDefinitionIds?: InputMaybe<Array<Scalars['ID']['input']>>;
  statuses?: InputMaybe<Array<LoyaltyRewardEntitlementStatus>>;
  validAt?: InputMaybe<Scalars['DateTime']['input']>;
};

export enum LoyaltyRewardType {
  FixedDiscount = 'FIXED_DISCOUNT',
  FreeProduct = 'FREE_PRODUCT',
  FreeShipping = 'FREE_SHIPPING',
  MemberBenefit = 'MEMBER_BENEFIT',
  MonetaryCredit = 'MONETARY_CREDIT',
  PercentageDiscount = 'PERCENTAGE_DISCOUNT',
  Points = 'POINTS',
  Voucher = 'VOUCHER'
}

export enum LoyaltyRoundingMode {
  Down = 'DOWN',
  Nearest = 'NEAREST',
  Up = 'UP'
}

export enum LoyaltySegmentMatchMode {
  All = 'ALL',
  Any = 'ANY'
}

export type LoyaltyTier = Node & {
  __typename?: 'LoyaltyTier';
  code: Scalars['String']['output'];
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  maintenance: Maybe<Scalars['JSON']['output']>;
  name: Scalars['String']['output'];
  programVersion: LoyaltyProgramVersion;
  qualification: Scalars['JSON']['output'];
  qualificationSchemaVersion: Scalars['Int']['output'];
  rank: Scalars['Int']['output'];
  rewardBenefits: Array<LoyaltyTierRewardBenefit>;
};

export enum LoyaltyTierCalendarPeriod {
  Month = 'MONTH',
  ProgramYear = 'PROGRAM_YEAR',
  Quarter = 'QUARTER',
  Year = 'YEAR'
}

export type LoyaltyTierCreateInput = {
  code: Scalars['String']['input'];
  maintenance?: InputMaybe<Scalars['JSON']['input']>;
  name: Scalars['String']['input'];
  programVersionId: Scalars['ID']['input'];
  qualification: Scalars['JSON']['input'];
  qualificationSchemaVersion?: InputMaybe<Scalars['Int']['input']>;
  rank: Scalars['Int']['input'];
};

export type LoyaltyTierDeleteInput = {
  tierId: Scalars['ID']['input'];
};

export enum LoyaltyTierDowngradePolicy {
  EndOfMembership = 'END_OF_MEMBERSHIP',
  GracePeriod = 'GRACE_PERIOD',
  Immediate = 'IMMEDIATE'
}

export type LoyaltyTierEvaluateInput = {
  accountId: Scalars['ID']['input'];
  effectiveAt?: InputMaybe<Scalars['DateTime']['input']>;
  forceRequalification?: InputMaybe<Scalars['Boolean']['input']>;
  programVersionId?: InputMaybe<Scalars['ID']['input']>;
  reasonCode: Scalars['String']['input'];
};

export type LoyaltyTierEvaluatePayload = {
  __typename?: 'LoyaltyTierEvaluatePayload';
  tierMembership: Maybe<LoyaltyTierMembership>;
  userErrors: Array<LoyaltyUserError>;
};

export enum LoyaltyTierEvaluationWindowType {
  Calendar = 'CALENDAR',
  Lifetime = 'LIFETIME',
  Rolling = 'ROLLING'
}

export type LoyaltyTierInput = {
  code: Scalars['String']['input'];
  maintenance?: InputMaybe<Scalars['JSON']['input']>;
  name: Scalars['String']['input'];
  qualification: Scalars['JSON']['input'];
  qualificationSchemaVersion?: InputMaybe<Scalars['Int']['input']>;
  rank: Scalars['Int']['input'];
};

export type LoyaltyTierMembership = Node & {
  __typename?: 'LoyaltyTierMembership';
  account: LoyaltyAccount;
  createdAt: Scalars['DateTime']['output'];
  effectiveFrom: Scalars['DateTime']['output'];
  effectiveTo: Maybe<Scalars['DateTime']['output']>;
  evaluationPeriodEndedAt: Scalars['DateTime']['output'];
  evaluationPeriodStartedAt: Scalars['DateTime']['output'];
  events: Array<LoyaltyTierMembershipEvent>;
  id: Scalars['ID']['output'];
  qualifiedAt: Scalars['DateTime']['output'];
  status: LoyaltyTierMembershipStatus;
  tier: LoyaltyTier;
  updatedAt: Scalars['DateTime']['output'];
};

export type LoyaltyTierMembershipConnection = {
  __typename?: 'LoyaltyTierMembershipConnection';
  edges: Array<LoyaltyTierMembershipEdge>;
  pageInfo: PageInfo;
  totalCount: Scalars['Int']['output'];
};

export type LoyaltyTierMembershipEdge = {
  __typename?: 'LoyaltyTierMembershipEdge';
  cursor: Scalars['String']['output'];
  node: LoyaltyTierMembership;
};

export type LoyaltyTierMembershipEvent = Node & {
  __typename?: 'LoyaltyTierMembershipEvent';
  account: LoyaltyAccount;
  createdAt: Scalars['DateTime']['output'];
  evaluationRevision: Scalars['String']['output'];
  eventType: LoyaltyTierMembershipEventType;
  id: Scalars['ID']['output'];
  membership: LoyaltyTierMembership;
  metadata: Scalars['JSON']['output'];
  occurredAt: Scalars['DateTime']['output'];
  previousTier: Maybe<LoyaltyTier>;
  reasonCode: Scalars['String']['output'];
  tier: LoyaltyTier;
};

export enum LoyaltyTierMembershipEventType {
  Downgraded = 'DOWNGRADED',
  Expired = 'EXPIRED',
  Qualified = 'QUALIFIED',
  Renewed = 'RENEWED',
  Revoked = 'REVOKED',
  Upgraded = 'UPGRADED'
}

export enum LoyaltyTierMembershipOperationAction {
  Evaluate = 'EVALUATE',
  Revoke = 'REVOKE'
}

export type LoyaltyTierMembershipOperationInput = {
  action: LoyaltyTierMembershipOperationAction;
  effectiveAt?: InputMaybe<Scalars['DateTime']['input']>;
  forceRequalification?: InputMaybe<Scalars['Boolean']['input']>;
  programVersionId?: InputMaybe<Scalars['ID']['input']>;
  reasonCode: Scalars['String']['input'];
  tierMembershipId?: InputMaybe<Scalars['ID']['input']>;
};

export type LoyaltyTierMembershipOrderByInput = {
  direction: SortDirection;
  field: LoyaltyTierMembershipOrderField;
};

export enum LoyaltyTierMembershipOrderField {
  CreatedAt = 'createdAt',
  EffectiveFrom = 'effectiveFrom',
  EffectiveTo = 'effectiveTo',
  Id = 'id',
  QualifiedAt = 'qualifiedAt',
  Status = 'status',
  UpdatedAt = 'updatedAt'
}

export type LoyaltyTierMembershipRevokeInput = {
  effectiveAt?: InputMaybe<Scalars['DateTime']['input']>;
  membershipId: Scalars['ID']['input'];
  reasonCode: Scalars['String']['input'];
};

export enum LoyaltyTierMembershipStatus {
  Active = 'ACTIVE',
  Expired = 'EXPIRED',
  Revoked = 'REVOKED'
}

export type LoyaltyTierOperationInput = {
  action: LoyaltyOwnedEntityOperationAction;
  create?: InputMaybe<LoyaltyTierInput>;
  tierId?: InputMaybe<Scalars['ID']['input']>;
  update?: InputMaybe<LoyaltyTierUpdateOperationValuesInput>;
};

export type LoyaltyTierPayload = {
  __typename?: 'LoyaltyTierPayload';
  tier: Maybe<LoyaltyTier>;
  userErrors: Array<LoyaltyUserError>;
};

export type LoyaltyTierPolicy = Node & {
  __typename?: 'LoyaltyTierPolicy';
  calendarPeriod: Maybe<LoyaltyTierCalendarPeriod>;
  createdAt: Scalars['DateTime']['output'];
  downgradePolicy: LoyaltyTierDowngradePolicy;
  gracePeriodDays: Scalars['Int']['output'];
  id: Scalars['ID']['output'];
  membershipDurationDays: Maybe<Scalars['Int']['output']>;
  metricSchemaVersion: Scalars['Int']['output'];
  programVersion: LoyaltyProgramVersion;
  programYearStartsMonth: Maybe<Scalars['Int']['output']>;
  requalificationPolicy: LoyaltyTierRequalificationPolicy;
  rollingWindowDays: Maybe<Scalars['Int']['output']>;
  windowType: LoyaltyTierEvaluationWindowType;
};

export type LoyaltyTierPolicyDeleteInput = {
  programVersionId: Scalars['ID']['input'];
};

export type LoyaltyTierPolicyInput = {
  calendarPeriod?: InputMaybe<LoyaltyTierCalendarPeriod>;
  downgradePolicy?: InputMaybe<LoyaltyTierDowngradePolicy>;
  gracePeriodDays?: InputMaybe<Scalars['Int']['input']>;
  membershipDurationDays?: InputMaybe<Scalars['Int']['input']>;
  metricSchemaVersion?: InputMaybe<Scalars['Int']['input']>;
  programYearStartsMonth?: InputMaybe<Scalars['Int']['input']>;
  requalificationPolicy?: InputMaybe<LoyaltyTierRequalificationPolicy>;
  rollingWindowDays?: InputMaybe<Scalars['Int']['input']>;
  windowType: LoyaltyTierEvaluationWindowType;
};

export enum LoyaltyTierPolicyOperationAction {
  Delete = 'DELETE',
  Upsert = 'UPSERT'
}

export type LoyaltyTierPolicyOperationInput = {
  action: LoyaltyTierPolicyOperationAction;
  values?: InputMaybe<LoyaltyTierPolicyInput>;
};

export type LoyaltyTierPolicyPayload = {
  __typename?: 'LoyaltyTierPolicyPayload';
  tierPolicy: Maybe<LoyaltyTierPolicy>;
  userErrors: Array<LoyaltyUserError>;
};

export type LoyaltyTierPolicyUpsertInput = {
  calendarPeriod?: InputMaybe<LoyaltyTierCalendarPeriod>;
  downgradePolicy?: InputMaybe<LoyaltyTierDowngradePolicy>;
  gracePeriodDays?: InputMaybe<Scalars['Int']['input']>;
  membershipDurationDays?: InputMaybe<Scalars['Int']['input']>;
  metricSchemaVersion?: InputMaybe<Scalars['Int']['input']>;
  programVersionId: Scalars['ID']['input'];
  programYearStartsMonth?: InputMaybe<Scalars['Int']['input']>;
  requalificationPolicy?: InputMaybe<LoyaltyTierRequalificationPolicy>;
  rollingWindowDays?: InputMaybe<Scalars['Int']['input']>;
  windowType: LoyaltyTierEvaluationWindowType;
};

export enum LoyaltyTierRequalificationPolicy {
  Automatic = 'AUTOMATIC',
  Manual = 'MANUAL'
}

export type LoyaltyTierRewardBenefit = Node & {
  __typename?: 'LoyaltyTierRewardBenefit';
  createdAt: Scalars['DateTime']['output'];
  grantPolicy: Scalars['JSON']['output'];
  grantPolicySchemaVersion: Scalars['Int']['output'];
  id: Scalars['ID']['output'];
  rewardDefinition: LoyaltyRewardDefinition;
  tier: LoyaltyTier;
};

export type LoyaltyTierRewardBenefitCreateInput = {
  grantPolicy?: Scalars['JSON']['input'];
  grantPolicySchemaVersion?: InputMaybe<Scalars['Int']['input']>;
  rewardDefinitionId: Scalars['ID']['input'];
  tierId: Scalars['ID']['input'];
};

export type LoyaltyTierRewardBenefitCreateOperationValuesInput = {
  grantPolicy?: Scalars['JSON']['input'];
  grantPolicySchemaVersion?: InputMaybe<Scalars['Int']['input']>;
  rewardDefinitionId: Scalars['ID']['input'];
};

export type LoyaltyTierRewardBenefitDeleteInput = {
  tierRewardBenefitId: Scalars['ID']['input'];
};

export enum LoyaltyTierRewardBenefitOperationAction {
  Create = 'CREATE',
  Delete = 'DELETE'
}

export type LoyaltyTierRewardBenefitOperationInput = {
  action: LoyaltyTierRewardBenefitOperationAction;
  create?: InputMaybe<LoyaltyTierRewardBenefitCreateOperationValuesInput>;
  tierRewardBenefitId?: InputMaybe<Scalars['ID']['input']>;
};

export type LoyaltyTierRewardBenefitPayload = {
  __typename?: 'LoyaltyTierRewardBenefitPayload';
  tierRewardBenefit: Maybe<LoyaltyTierRewardBenefit>;
  userErrors: Array<LoyaltyUserError>;
};

export type LoyaltyTierUpdateInput = {
  clearMaintenance?: InputMaybe<Scalars['Boolean']['input']>;
  maintenance?: InputMaybe<Scalars['JSON']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  qualification?: InputMaybe<Scalars['JSON']['input']>;
  qualificationSchemaVersion?: InputMaybe<Scalars['Int']['input']>;
  rank?: InputMaybe<Scalars['Int']['input']>;
  tierId: Scalars['ID']['input'];
};

export type LoyaltyTierUpdateOperationValuesInput = {
  clearMaintenance?: InputMaybe<Scalars['Boolean']['input']>;
  maintenance?: InputMaybe<Scalars['JSON']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  qualification?: InputMaybe<Scalars['JSON']['input']>;
  qualificationSchemaVersion?: InputMaybe<Scalars['Int']['input']>;
  rank?: InputMaybe<Scalars['Int']['input']>;
  rewardBenefits?: InputMaybe<Array<LoyaltyTierRewardBenefitOperationInput>>;
};

export type LoyaltyTransaction = Node & {
  __typename?: 'LoyaltyTransaction';
  account: LoyaltyAccount;
  actorId: Maybe<Scalars['ID']['output']>;
  actorType: LoyaltyActorType;
  causationId: Maybe<Scalars['String']['output']>;
  correlationId: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['DateTime']['output'];
  description: Maybe<Scalars['String']['output']>;
  effectiveAt: Scalars['DateTime']['output'];
  entries: Array<LoyaltyLedgerEntry>;
  eventId: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  kind: LoyaltyTransactionKind;
  lotAllocations: Array<LoyaltyLotAllocation>;
  metadata: Scalars['JSON']['output'];
  occurredAt: Scalars['DateTime']['output'];
  program: LoyaltyProgram;
  programVersion: Maybe<LoyaltyProgramVersion>;
  reasonCode: Scalars['String']['output'];
  requestHash: Scalars['String']['output'];
  source: LoyaltyTransactionSource;
  sourceId: Maybe<Scalars['String']['output']>;
  sourceRevision: Maybe<Scalars['String']['output']>;
  workflowId: Maybe<Scalars['String']['output']>;
};

export type LoyaltyTransactionConnection = {
  __typename?: 'LoyaltyTransactionConnection';
  edges: Array<LoyaltyTransactionEdge>;
  pageInfo: PageInfo;
  totalCount: Scalars['Int']['output'];
};

export type LoyaltyTransactionEdge = {
  __typename?: 'LoyaltyTransactionEdge';
  cursor: Scalars['String']['output'];
  node: LoyaltyTransaction;
};

export enum LoyaltyTransactionKind {
  Activate = 'ACTIVATE',
  AdjustCredit = 'ADJUST_CREDIT',
  AdjustDebit = 'ADJUST_DEBIT',
  DebtRecovery = 'DEBT_RECOVERY',
  EarnPending = 'EARN_PENDING',
  Expire = 'EXPIRE',
  MergeTransfer = 'MERGE_TRANSFER',
  Redeem = 'REDEEM',
  Release = 'RELEASE',
  Reserve = 'RESERVE',
  RestoreRedeem = 'RESTORE_REDEEM',
  ReverseEarn = 'REVERSE_EARN'
}

export type LoyaltyTransactionOrderByInput = {
  direction: SortDirection;
  field: LoyaltyTransactionOrderField;
};

export enum LoyaltyTransactionOrderField {
  CreatedAt = 'createdAt',
  EffectiveAt = 'effectiveAt',
  Id = 'id',
  Kind = 'kind',
  OccurredAt = 'occurredAt',
  Source = 'source'
}

export enum LoyaltyTransactionSource {
  Admin = 'ADMIN',
  Checkout = 'CHECKOUT',
  Expiration = 'EXPIRATION',
  Import = 'IMPORT',
  Merge = 'MERGE',
  Order = 'ORDER',
  Refund = 'REFUND',
  System = 'SYSTEM'
}

export type LoyaltyTransactionWhereInput = {
  accountIds?: InputMaybe<Array<Scalars['ID']['input']>>;
  checkoutId?: InputMaybe<Scalars['ID']['input']>;
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  kinds?: InputMaybe<Array<LoyaltyTransactionKind>>;
  occurredFrom?: InputMaybe<Scalars['DateTime']['input']>;
  occurredTo?: InputMaybe<Scalars['DateTime']['input']>;
  orderId?: InputMaybe<Scalars['ID']['input']>;
  programIds?: InputMaybe<Array<Scalars['ID']['input']>>;
  sourceId?: InputMaybe<Scalars['String']['input']>;
  sources?: InputMaybe<Array<LoyaltyTransactionSource>>;
};

export type LoyaltyUserError = UserError & {
  __typename?: 'LoyaltyUserError';
  code: Maybe<Scalars['String']['output']>;
  field: Maybe<Array<Scalars['String']['output']>>;
  message: Scalars['String']['output'];
  retryable: Scalars['Boolean']['output'];
};

export type Mutation = {
  __typename?: 'Mutation';
  /** Loyalty Admin mutation namespace. */
  loyaltyMutation: LoyaltyMutation;
};

/** A globally identifiable Loyalty entity. */
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

export type Query = {
  __typename?: 'Query';
  /** Loyalty Admin query namespace. */
  loyaltyQuery: LoyaltyQuery;
};

export enum SortDirection {
  Asc = 'asc',
  Desc = 'desc'
}

/** A user-facing validation, authorization, or business error. */
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
  Node: ( Customer ) | ( LoyaltyAccount ) | ( LoyaltyEarningRule ) | ( LoyaltyEarningRuleUsage ) | ( LoyaltyEventEvaluation ) | ( LoyaltyEventFact ) | ( LoyaltyLedgerEntry ) | ( LoyaltyLotAllocation ) | ( LoyaltyMonetaryCreditLot ) | ( LoyaltyMonetaryLedgerEntry ) | ( LoyaltyMonetaryLotAllocation ) | ( LoyaltyMonetaryTransaction ) | ( LoyaltyMonetaryWallet ) | ( LoyaltyPointLot ) | ( LoyaltyProgram ) | ( LoyaltyProgramVersion ) | ( LoyaltyReservation ) | ( LoyaltyReservationEvent ) | ( LoyaltyRewardDefinition ) | ( LoyaltyRewardEntitlement ) | ( LoyaltyRewardEntitlementEvent ) | ( LoyaltyTier ) | ( LoyaltyTierMembership ) | ( LoyaltyTierMembershipEvent ) | ( LoyaltyTierPolicy ) | ( LoyaltyTierRewardBenefit ) | ( LoyaltyTransaction );
  UserError: ( LoyaltyUserError );
}>;

/** Mapping between all available schema types and the resolvers types */
export type ResolversTypes = ResolversObject<{
  BigInt: ResolverTypeWrapper<Scalars['BigInt']['output']>;
  CurrencyCode: CurrencyCode;
  Customer: ResolverTypeWrapper<Customer>;
  ID: ResolverTypeWrapper<Scalars['ID']['output']>;
  DateTime: ResolverTypeWrapper<Scalars['DateTime']['output']>;
  DimensionUnit: DimensionUnit;
  JSON: ResolverTypeWrapper<Scalars['JSON']['output']>;
  LocaleCode: LocaleCode;
  LoyaltyAccount: ResolverTypeWrapper<LoyaltyAccount>;
  Int: ResolverTypeWrapper<Scalars['Int']['output']>;
  String: ResolverTypeWrapper<Scalars['String']['output']>;
  LoyaltyAccountBalance: ResolverTypeWrapper<LoyaltyAccountBalance>;
  LoyaltyAccountBalanceRebuildInput: LoyaltyAccountBalanceRebuildInput;
  LoyaltyAccountBalanceRebuildPayload: ResolverTypeWrapper<LoyaltyAccountBalanceRebuildPayload>;
  LoyaltyAccountConnection: ResolverTypeWrapper<LoyaltyAccountConnection>;
  LoyaltyAccountEdge: ResolverTypeWrapper<LoyaltyAccountEdge>;
  LoyaltyAccountOrderByInput: LoyaltyAccountOrderByInput;
  LoyaltyAccountOrderField: LoyaltyAccountOrderField;
  LoyaltyAccountStatus: LoyaltyAccountStatus;
  LoyaltyAccountStatusOperationInput: LoyaltyAccountStatusOperationInput;
  LoyaltyAccountStatusUpdateInput: LoyaltyAccountStatusUpdateInput;
  LoyaltyAccountStatusUpdatePayload: ResolverTypeWrapper<LoyaltyAccountStatusUpdatePayload>;
  LoyaltyAccountUpdateInput: LoyaltyAccountUpdateInput;
  Boolean: ResolverTypeWrapper<Scalars['Boolean']['output']>;
  LoyaltyAccountUpdatePayload: ResolverTypeWrapper<LoyaltyAccountUpdatePayload>;
  LoyaltyAccountWhereInput: LoyaltyAccountWhereInput;
  LoyaltyActorType: LoyaltyActorType;
  LoyaltyBalanceBucket: LoyaltyBalanceBucket;
  LoyaltyCatalogSelector: ResolverTypeWrapper<LoyaltyCatalogSelector>;
  LoyaltyCatalogSelectorInput: LoyaltyCatalogSelectorInput;
  LoyaltyCatalogSelectorType: LoyaltyCatalogSelectorType;
  LoyaltyDebtPolicy: LoyaltyDebtPolicy;
  LoyaltyDeletePayload: ResolverTypeWrapper<LoyaltyDeletePayload>;
  LoyaltyEarningActionType: LoyaltyEarningActionType;
  LoyaltyEarningModifier: ResolverTypeWrapper<LoyaltyEarningModifier>;
  LoyaltyEarningModifierInput: LoyaltyEarningModifierInput;
  LoyaltyEarningRule: ResolverTypeWrapper<LoyaltyEarningRule>;
  LoyaltyEarningRuleCreateInput: LoyaltyEarningRuleCreateInput;
  LoyaltyEarningRuleDeleteInput: LoyaltyEarningRuleDeleteInput;
  LoyaltyEarningRuleInput: LoyaltyEarningRuleInput;
  LoyaltyEarningRuleOperationInput: LoyaltyEarningRuleOperationInput;
  LoyaltyEarningRulePayload: ResolverTypeWrapper<LoyaltyEarningRulePayload>;
  LoyaltyEarningRuleUpdateInput: LoyaltyEarningRuleUpdateInput;
  LoyaltyEarningRuleUpdateOperationValuesInput: LoyaltyEarningRuleUpdateOperationValuesInput;
  LoyaltyEarningRuleUsage: ResolverTypeWrapper<LoyaltyEarningRuleUsage>;
  LoyaltyEarningRuleUsageConnection: ResolverTypeWrapper<LoyaltyEarningRuleUsageConnection>;
  LoyaltyEarningRuleUsageEdge: ResolverTypeWrapper<LoyaltyEarningRuleUsageEdge>;
  LoyaltyEarningRuleUsageOrderByInput: LoyaltyEarningRuleUsageOrderByInput;
  LoyaltyEarningRuleUsageOrderField: LoyaltyEarningRuleUsageOrderField;
  LoyaltyEarningRuleUsageWhereInput: LoyaltyEarningRuleUsageWhereInput;
  LoyaltyEarningTriggerType: LoyaltyEarningTriggerType;
  LoyaltyEligibleSpendBasis: LoyaltyEligibleSpendBasis;
  LoyaltyEventEvaluation: ResolverTypeWrapper<LoyaltyEventEvaluation>;
  LoyaltyEventEvaluationConnection: ResolverTypeWrapper<LoyaltyEventEvaluationConnection>;
  LoyaltyEventEvaluationDecision: LoyaltyEventEvaluationDecision;
  LoyaltyEventEvaluationEdge: ResolverTypeWrapper<LoyaltyEventEvaluationEdge>;
  LoyaltyEventEvaluationOrderByInput: LoyaltyEventEvaluationOrderByInput;
  LoyaltyEventEvaluationOrderField: LoyaltyEventEvaluationOrderField;
  LoyaltyEventEvaluationWhereInput: LoyaltyEventEvaluationWhereInput;
  LoyaltyEventFact: ResolverTypeWrapper<LoyaltyEventFact>;
  LoyaltyEventFactConnection: ResolverTypeWrapper<LoyaltyEventFactConnection>;
  LoyaltyEventFactEdge: ResolverTypeWrapper<LoyaltyEventFactEdge>;
  LoyaltyEventFactOrderByInput: LoyaltyEventFactOrderByInput;
  LoyaltyEventFactOrderField: LoyaltyEventFactOrderField;
  LoyaltyEventFactWhereInput: LoyaltyEventFactWhereInput;
  LoyaltyExpiringPoints: ResolverTypeWrapper<LoyaltyExpiringPoints>;
  LoyaltyLedgerEntry: ResolverTypeWrapper<LoyaltyLedgerEntry>;
  LoyaltyLotAllocation: ResolverTypeWrapper<LoyaltyLotAllocation>;
  LoyaltyLotAllocationType: LoyaltyLotAllocationType;
  LoyaltyMaintenanceResult: ResolverTypeWrapper<LoyaltyMaintenanceResult>;
  LoyaltyMaintenanceRunInput: LoyaltyMaintenanceRunInput;
  LoyaltyMaintenanceRunPayload: ResolverTypeWrapper<LoyaltyMaintenanceRunPayload>;
  LoyaltyModifierStackingMode: LoyaltyModifierStackingMode;
  LoyaltyMonetaryAdjustmentDirection: LoyaltyMonetaryAdjustmentDirection;
  LoyaltyMonetaryBalanceBucket: LoyaltyMonetaryBalanceBucket;
  LoyaltyMonetaryCreditLot: ResolverTypeWrapper<LoyaltyMonetaryCreditLot>;
  LoyaltyMonetaryLedgerEntry: ResolverTypeWrapper<LoyaltyMonetaryLedgerEntry>;
  LoyaltyMonetaryLotAllocation: ResolverTypeWrapper<LoyaltyMonetaryLotAllocation>;
  LoyaltyMonetaryTransaction: ResolverTypeWrapper<LoyaltyMonetaryTransaction>;
  LoyaltyMonetaryTransactionConnection: ResolverTypeWrapper<LoyaltyMonetaryTransactionConnection>;
  LoyaltyMonetaryTransactionEdge: ResolverTypeWrapper<LoyaltyMonetaryTransactionEdge>;
  LoyaltyMonetaryTransactionKind: LoyaltyMonetaryTransactionKind;
  LoyaltyMonetaryTransactionOrderByInput: LoyaltyMonetaryTransactionOrderByInput;
  LoyaltyMonetaryTransactionOrderField: LoyaltyMonetaryTransactionOrderField;
  LoyaltyMonetaryWallet: ResolverTypeWrapper<LoyaltyMonetaryWallet>;
  LoyaltyMonetaryWalletAdjustInput: LoyaltyMonetaryWalletAdjustInput;
  LoyaltyMonetaryWalletAdjustmentOperationInput: LoyaltyMonetaryWalletAdjustmentOperationInput;
  LoyaltyMonetaryWalletBalance: ResolverTypeWrapper<LoyaltyMonetaryWalletBalance>;
  LoyaltyMonetaryWalletBalanceRebuildInput: LoyaltyMonetaryWalletBalanceRebuildInput;
  LoyaltyMonetaryWalletConnection: ResolverTypeWrapper<LoyaltyMonetaryWalletConnection>;
  LoyaltyMonetaryWalletEdge: ResolverTypeWrapper<LoyaltyMonetaryWalletEdge>;
  LoyaltyMonetaryWalletOperationPayload: ResolverTypeWrapper<LoyaltyMonetaryWalletOperationPayload>;
  LoyaltyMonetaryWalletOrderByInput: LoyaltyMonetaryWalletOrderByInput;
  LoyaltyMonetaryWalletOrderField: LoyaltyMonetaryWalletOrderField;
  LoyaltyMonetaryWalletPayload: ResolverTypeWrapper<LoyaltyMonetaryWalletPayload>;
  LoyaltyMonetaryWalletStatus: LoyaltyMonetaryWalletStatus;
  LoyaltyMonetaryWalletStatusOperationInput: LoyaltyMonetaryWalletStatusOperationInput;
  LoyaltyMonetaryWalletStatusUpdateInput: LoyaltyMonetaryWalletStatusUpdateInput;
  LoyaltyMonetaryWalletType: LoyaltyMonetaryWalletType;
  LoyaltyMonetaryWalletUpdateInput: LoyaltyMonetaryWalletUpdateInput;
  LoyaltyMonetaryWalletUpdatePayload: ResolverTypeWrapper<LoyaltyMonetaryWalletUpdatePayload>;
  LoyaltyMonetaryWalletWhereInput: LoyaltyMonetaryWalletWhereInput;
  LoyaltyMoney: ResolverTypeWrapper<LoyaltyMoney>;
  LoyaltyMutation: ResolverTypeWrapper<LoyaltyMutation>;
  LoyaltyOperationResult: ResolverTypeWrapper<LoyaltyOperationResult>;
  LoyaltyOperationType: LoyaltyOperationType;
  LoyaltyOwnedEntityOperationAction: LoyaltyOwnedEntityOperationAction;
  LoyaltyPointLot: ResolverTypeWrapper<LoyaltyPointLot>;
  LoyaltyPointsAdjustInput: LoyaltyPointsAdjustInput;
  LoyaltyPointsAdjustPayload: ResolverTypeWrapper<LoyaltyPointsAdjustPayload>;
  LoyaltyPointsAdjustmentDirection: LoyaltyPointsAdjustmentDirection;
  LoyaltyPointsAdjustmentOperationInput: LoyaltyPointsAdjustmentOperationInput;
  LoyaltyPointsConvertToMonetaryInput: LoyaltyPointsConvertToMonetaryInput;
  LoyaltyPointsConvertToMonetaryPayload: ResolverTypeWrapper<LoyaltyPointsConvertToMonetaryPayload>;
  LoyaltyPointsToMonetaryOperationInput: LoyaltyPointsToMonetaryOperationInput;
  LoyaltyProgram: ResolverTypeWrapper<LoyaltyProgram>;
  LoyaltyProgramConnection: ResolverTypeWrapper<LoyaltyProgramConnection>;
  LoyaltyProgramCreateInput: LoyaltyProgramCreateInput;
  LoyaltyProgramCreatePayload: ResolverTypeWrapper<LoyaltyProgramCreatePayload>;
  LoyaltyProgramEarningRules: ResolverTypeWrapper<LoyaltyProgramEarningRules>;
  LoyaltyProgramEarningRulesInput: LoyaltyProgramEarningRulesInput;
  LoyaltyProgramEdge: ResolverTypeWrapper<LoyaltyProgramEdge>;
  LoyaltyProgramEligibility: ResolverTypeWrapper<LoyaltyProgramEligibility>;
  LoyaltyProgramEligibilityInput: LoyaltyProgramEligibilityInput;
  LoyaltyProgramEligibilityType: LoyaltyProgramEligibilityType;
  LoyaltyProgramFieldsInput: LoyaltyProgramFieldsInput;
  LoyaltyProgramOrderByInput: LoyaltyProgramOrderByInput;
  LoyaltyProgramOrderField: LoyaltyProgramOrderField;
  LoyaltyProgramRules: ResolverTypeWrapper<LoyaltyProgramRules>;
  LoyaltyProgramRulesInput: LoyaltyProgramRulesInput;
  LoyaltyProgramStatus: LoyaltyProgramStatus;
  LoyaltyProgramUpdateInput: LoyaltyProgramUpdateInput;
  LoyaltyProgramUpdatePayload: ResolverTypeWrapper<LoyaltyProgramUpdatePayload>;
  LoyaltyProgramVersion: ResolverTypeWrapper<LoyaltyProgramVersion>;
  LoyaltyProgramVersionCreateInput: LoyaltyProgramVersionCreateInput;
  LoyaltyProgramVersionCreateOperationValuesInput: LoyaltyProgramVersionCreateOperationValuesInput;
  LoyaltyProgramVersionCreatePayload: ResolverTypeWrapper<LoyaltyProgramVersionCreatePayload>;
  LoyaltyProgramVersionDeleteInput: LoyaltyProgramVersionDeleteInput;
  LoyaltyProgramVersionDeletePayload: ResolverTypeWrapper<LoyaltyProgramVersionDeletePayload>;
  LoyaltyProgramVersionOperationAction: LoyaltyProgramVersionOperationAction;
  LoyaltyProgramVersionOperationInput: LoyaltyProgramVersionOperationInput;
  LoyaltyProgramVersionPublishInput: LoyaltyProgramVersionPublishInput;
  LoyaltyProgramVersionPublishOperationValuesInput: LoyaltyProgramVersionPublishOperationValuesInput;
  LoyaltyProgramVersionPublishPayload: ResolverTypeWrapper<LoyaltyProgramVersionPublishPayload>;
  LoyaltyProgramVersionStatus: LoyaltyProgramVersionStatus;
  LoyaltyProgramVersionUpdateInput: LoyaltyProgramVersionUpdateInput;
  LoyaltyProgramVersionUpdateOperationValuesInput: LoyaltyProgramVersionUpdateOperationValuesInput;
  LoyaltyProgramVersionUpdatePayload: ResolverTypeWrapper<LoyaltyProgramVersionUpdatePayload>;
  LoyaltyProgramWhereInput: LoyaltyProgramWhereInput;
  LoyaltyQuery: ResolverTypeWrapper<Omit<LoyaltyQuery, 'node' | 'nodes'> & { node?: Maybe<ResolversTypes['Node']>, nodes: Array<Maybe<ResolversTypes['Node']>> }>;
  LoyaltyReferenceReconciliationStatus: LoyaltyReferenceReconciliationStatus;
  LoyaltyRefundPolicy: LoyaltyRefundPolicy;
  LoyaltyReservation: ResolverTypeWrapper<LoyaltyReservation>;
  LoyaltyReservationConnection: ResolverTypeWrapper<LoyaltyReservationConnection>;
  LoyaltyReservationEdge: ResolverTypeWrapper<LoyaltyReservationEdge>;
  LoyaltyReservationEvent: ResolverTypeWrapper<LoyaltyReservationEvent>;
  LoyaltyReservationEventType: LoyaltyReservationEventType;
  LoyaltyReservationOperationAction: LoyaltyReservationOperationAction;
  LoyaltyReservationOrderByInput: LoyaltyReservationOrderByInput;
  LoyaltyReservationOrderField: LoyaltyReservationOrderField;
  LoyaltyReservationReleaseOperationInput: LoyaltyReservationReleaseOperationInput;
  LoyaltyReservationStatus: LoyaltyReservationStatus;
  LoyaltyReservationUpdateInput: LoyaltyReservationUpdateInput;
  LoyaltyReservationUpdatePayload: ResolverTypeWrapper<LoyaltyReservationUpdatePayload>;
  LoyaltyReservationWhereInput: LoyaltyReservationWhereInput;
  LoyaltyRestoredPointsExpiryPolicy: LoyaltyRestoredPointsExpiryPolicy;
  LoyaltyRewardDefinition: ResolverTypeWrapper<LoyaltyRewardDefinition>;
  LoyaltyRewardDefinitionCreateInput: LoyaltyRewardDefinitionCreateInput;
  LoyaltyRewardDefinitionDeleteInput: LoyaltyRewardDefinitionDeleteInput;
  LoyaltyRewardDefinitionInput: LoyaltyRewardDefinitionInput;
  LoyaltyRewardDefinitionOperationInput: LoyaltyRewardDefinitionOperationInput;
  LoyaltyRewardDefinitionPayload: ResolverTypeWrapper<LoyaltyRewardDefinitionPayload>;
  LoyaltyRewardDefinitionUpdateInput: LoyaltyRewardDefinitionUpdateInput;
  LoyaltyRewardDefinitionUpdateOperationValuesInput: LoyaltyRewardDefinitionUpdateOperationValuesInput;
  LoyaltyRewardEntitlement: ResolverTypeWrapper<LoyaltyRewardEntitlement>;
  LoyaltyRewardEntitlementConnection: ResolverTypeWrapper<LoyaltyRewardEntitlementConnection>;
  LoyaltyRewardEntitlementEdge: ResolverTypeWrapper<LoyaltyRewardEntitlementEdge>;
  LoyaltyRewardEntitlementEvent: ResolverTypeWrapper<LoyaltyRewardEntitlementEvent>;
  LoyaltyRewardEntitlementEventType: LoyaltyRewardEntitlementEventType;
  LoyaltyRewardEntitlementIssueInput: LoyaltyRewardEntitlementIssueInput;
  LoyaltyRewardEntitlementOperationAction: LoyaltyRewardEntitlementOperationAction;
  LoyaltyRewardEntitlementOperationInput: LoyaltyRewardEntitlementOperationInput;
  LoyaltyRewardEntitlementOrderByInput: LoyaltyRewardEntitlementOrderByInput;
  LoyaltyRewardEntitlementOrderField: LoyaltyRewardEntitlementOrderField;
  LoyaltyRewardEntitlementPayload: ResolverTypeWrapper<LoyaltyRewardEntitlementPayload>;
  LoyaltyRewardEntitlementStatus: LoyaltyRewardEntitlementStatus;
  LoyaltyRewardEntitlementTransitionInput: LoyaltyRewardEntitlementTransitionInput;
  LoyaltyRewardEntitlementWhereInput: LoyaltyRewardEntitlementWhereInput;
  LoyaltyRewardType: LoyaltyRewardType;
  LoyaltyRoundingMode: LoyaltyRoundingMode;
  LoyaltySegmentMatchMode: LoyaltySegmentMatchMode;
  LoyaltyTier: ResolverTypeWrapper<LoyaltyTier>;
  LoyaltyTierCalendarPeriod: LoyaltyTierCalendarPeriod;
  LoyaltyTierCreateInput: LoyaltyTierCreateInput;
  LoyaltyTierDeleteInput: LoyaltyTierDeleteInput;
  LoyaltyTierDowngradePolicy: LoyaltyTierDowngradePolicy;
  LoyaltyTierEvaluateInput: LoyaltyTierEvaluateInput;
  LoyaltyTierEvaluatePayload: ResolverTypeWrapper<LoyaltyTierEvaluatePayload>;
  LoyaltyTierEvaluationWindowType: LoyaltyTierEvaluationWindowType;
  LoyaltyTierInput: LoyaltyTierInput;
  LoyaltyTierMembership: ResolverTypeWrapper<LoyaltyTierMembership>;
  LoyaltyTierMembershipConnection: ResolverTypeWrapper<LoyaltyTierMembershipConnection>;
  LoyaltyTierMembershipEdge: ResolverTypeWrapper<LoyaltyTierMembershipEdge>;
  LoyaltyTierMembershipEvent: ResolverTypeWrapper<LoyaltyTierMembershipEvent>;
  LoyaltyTierMembershipEventType: LoyaltyTierMembershipEventType;
  LoyaltyTierMembershipOperationAction: LoyaltyTierMembershipOperationAction;
  LoyaltyTierMembershipOperationInput: LoyaltyTierMembershipOperationInput;
  LoyaltyTierMembershipOrderByInput: LoyaltyTierMembershipOrderByInput;
  LoyaltyTierMembershipOrderField: LoyaltyTierMembershipOrderField;
  LoyaltyTierMembershipRevokeInput: LoyaltyTierMembershipRevokeInput;
  LoyaltyTierMembershipStatus: LoyaltyTierMembershipStatus;
  LoyaltyTierOperationInput: LoyaltyTierOperationInput;
  LoyaltyTierPayload: ResolverTypeWrapper<LoyaltyTierPayload>;
  LoyaltyTierPolicy: ResolverTypeWrapper<LoyaltyTierPolicy>;
  LoyaltyTierPolicyDeleteInput: LoyaltyTierPolicyDeleteInput;
  LoyaltyTierPolicyInput: LoyaltyTierPolicyInput;
  LoyaltyTierPolicyOperationAction: LoyaltyTierPolicyOperationAction;
  LoyaltyTierPolicyOperationInput: LoyaltyTierPolicyOperationInput;
  LoyaltyTierPolicyPayload: ResolverTypeWrapper<LoyaltyTierPolicyPayload>;
  LoyaltyTierPolicyUpsertInput: LoyaltyTierPolicyUpsertInput;
  LoyaltyTierRequalificationPolicy: LoyaltyTierRequalificationPolicy;
  LoyaltyTierRewardBenefit: ResolverTypeWrapper<LoyaltyTierRewardBenefit>;
  LoyaltyTierRewardBenefitCreateInput: LoyaltyTierRewardBenefitCreateInput;
  LoyaltyTierRewardBenefitCreateOperationValuesInput: LoyaltyTierRewardBenefitCreateOperationValuesInput;
  LoyaltyTierRewardBenefitDeleteInput: LoyaltyTierRewardBenefitDeleteInput;
  LoyaltyTierRewardBenefitOperationAction: LoyaltyTierRewardBenefitOperationAction;
  LoyaltyTierRewardBenefitOperationInput: LoyaltyTierRewardBenefitOperationInput;
  LoyaltyTierRewardBenefitPayload: ResolverTypeWrapper<LoyaltyTierRewardBenefitPayload>;
  LoyaltyTierUpdateInput: LoyaltyTierUpdateInput;
  LoyaltyTierUpdateOperationValuesInput: LoyaltyTierUpdateOperationValuesInput;
  LoyaltyTransaction: ResolverTypeWrapper<LoyaltyTransaction>;
  LoyaltyTransactionConnection: ResolverTypeWrapper<LoyaltyTransactionConnection>;
  LoyaltyTransactionEdge: ResolverTypeWrapper<LoyaltyTransactionEdge>;
  LoyaltyTransactionKind: LoyaltyTransactionKind;
  LoyaltyTransactionOrderByInput: LoyaltyTransactionOrderByInput;
  LoyaltyTransactionOrderField: LoyaltyTransactionOrderField;
  LoyaltyTransactionSource: LoyaltyTransactionSource;
  LoyaltyTransactionWhereInput: LoyaltyTransactionWhereInput;
  LoyaltyUserError: ResolverTypeWrapper<LoyaltyUserError>;
  Mutation: ResolverTypeWrapper<{}>;
  Node: ResolverTypeWrapper<ResolversInterfaceTypes<ResolversTypes>['Node']>;
  PageInfo: ResolverTypeWrapper<PageInfo>;
  PriceAdjustmentOperation: PriceAdjustmentOperation;
  PriceAdjustmentValueType: PriceAdjustmentValueType;
  Query: ResolverTypeWrapper<{}>;
  SortDirection: SortDirection;
  UserError: ResolverTypeWrapper<ResolversInterfaceTypes<ResolversTypes>['UserError']>;
  WeightUnit: WeightUnit;
}>;

/** Mapping between all available schema types and the resolvers parents */
export type ResolversParentTypes = ResolversObject<{
  BigInt: Scalars['BigInt']['output'];
  Customer: Customer;
  ID: Scalars['ID']['output'];
  DateTime: Scalars['DateTime']['output'];
  JSON: Scalars['JSON']['output'];
  LoyaltyAccount: LoyaltyAccount;
  Int: Scalars['Int']['output'];
  String: Scalars['String']['output'];
  LoyaltyAccountBalance: LoyaltyAccountBalance;
  LoyaltyAccountBalanceRebuildInput: LoyaltyAccountBalanceRebuildInput;
  LoyaltyAccountBalanceRebuildPayload: LoyaltyAccountBalanceRebuildPayload;
  LoyaltyAccountConnection: LoyaltyAccountConnection;
  LoyaltyAccountEdge: LoyaltyAccountEdge;
  LoyaltyAccountOrderByInput: LoyaltyAccountOrderByInput;
  LoyaltyAccountStatusOperationInput: LoyaltyAccountStatusOperationInput;
  LoyaltyAccountStatusUpdateInput: LoyaltyAccountStatusUpdateInput;
  LoyaltyAccountStatusUpdatePayload: LoyaltyAccountStatusUpdatePayload;
  LoyaltyAccountUpdateInput: LoyaltyAccountUpdateInput;
  Boolean: Scalars['Boolean']['output'];
  LoyaltyAccountUpdatePayload: LoyaltyAccountUpdatePayload;
  LoyaltyAccountWhereInput: LoyaltyAccountWhereInput;
  LoyaltyCatalogSelector: LoyaltyCatalogSelector;
  LoyaltyCatalogSelectorInput: LoyaltyCatalogSelectorInput;
  LoyaltyDeletePayload: LoyaltyDeletePayload;
  LoyaltyEarningModifier: LoyaltyEarningModifier;
  LoyaltyEarningModifierInput: LoyaltyEarningModifierInput;
  LoyaltyEarningRule: LoyaltyEarningRule;
  LoyaltyEarningRuleCreateInput: LoyaltyEarningRuleCreateInput;
  LoyaltyEarningRuleDeleteInput: LoyaltyEarningRuleDeleteInput;
  LoyaltyEarningRuleInput: LoyaltyEarningRuleInput;
  LoyaltyEarningRuleOperationInput: LoyaltyEarningRuleOperationInput;
  LoyaltyEarningRulePayload: LoyaltyEarningRulePayload;
  LoyaltyEarningRuleUpdateInput: LoyaltyEarningRuleUpdateInput;
  LoyaltyEarningRuleUpdateOperationValuesInput: LoyaltyEarningRuleUpdateOperationValuesInput;
  LoyaltyEarningRuleUsage: LoyaltyEarningRuleUsage;
  LoyaltyEarningRuleUsageConnection: LoyaltyEarningRuleUsageConnection;
  LoyaltyEarningRuleUsageEdge: LoyaltyEarningRuleUsageEdge;
  LoyaltyEarningRuleUsageOrderByInput: LoyaltyEarningRuleUsageOrderByInput;
  LoyaltyEarningRuleUsageWhereInput: LoyaltyEarningRuleUsageWhereInput;
  LoyaltyEventEvaluation: LoyaltyEventEvaluation;
  LoyaltyEventEvaluationConnection: LoyaltyEventEvaluationConnection;
  LoyaltyEventEvaluationEdge: LoyaltyEventEvaluationEdge;
  LoyaltyEventEvaluationOrderByInput: LoyaltyEventEvaluationOrderByInput;
  LoyaltyEventEvaluationWhereInput: LoyaltyEventEvaluationWhereInput;
  LoyaltyEventFact: LoyaltyEventFact;
  LoyaltyEventFactConnection: LoyaltyEventFactConnection;
  LoyaltyEventFactEdge: LoyaltyEventFactEdge;
  LoyaltyEventFactOrderByInput: LoyaltyEventFactOrderByInput;
  LoyaltyEventFactWhereInput: LoyaltyEventFactWhereInput;
  LoyaltyExpiringPoints: LoyaltyExpiringPoints;
  LoyaltyLedgerEntry: LoyaltyLedgerEntry;
  LoyaltyLotAllocation: LoyaltyLotAllocation;
  LoyaltyMaintenanceResult: LoyaltyMaintenanceResult;
  LoyaltyMaintenanceRunInput: LoyaltyMaintenanceRunInput;
  LoyaltyMaintenanceRunPayload: LoyaltyMaintenanceRunPayload;
  LoyaltyMonetaryCreditLot: LoyaltyMonetaryCreditLot;
  LoyaltyMonetaryLedgerEntry: LoyaltyMonetaryLedgerEntry;
  LoyaltyMonetaryLotAllocation: LoyaltyMonetaryLotAllocation;
  LoyaltyMonetaryTransaction: LoyaltyMonetaryTransaction;
  LoyaltyMonetaryTransactionConnection: LoyaltyMonetaryTransactionConnection;
  LoyaltyMonetaryTransactionEdge: LoyaltyMonetaryTransactionEdge;
  LoyaltyMonetaryTransactionOrderByInput: LoyaltyMonetaryTransactionOrderByInput;
  LoyaltyMonetaryWallet: LoyaltyMonetaryWallet;
  LoyaltyMonetaryWalletAdjustInput: LoyaltyMonetaryWalletAdjustInput;
  LoyaltyMonetaryWalletAdjustmentOperationInput: LoyaltyMonetaryWalletAdjustmentOperationInput;
  LoyaltyMonetaryWalletBalance: LoyaltyMonetaryWalletBalance;
  LoyaltyMonetaryWalletBalanceRebuildInput: LoyaltyMonetaryWalletBalanceRebuildInput;
  LoyaltyMonetaryWalletConnection: LoyaltyMonetaryWalletConnection;
  LoyaltyMonetaryWalletEdge: LoyaltyMonetaryWalletEdge;
  LoyaltyMonetaryWalletOperationPayload: LoyaltyMonetaryWalletOperationPayload;
  LoyaltyMonetaryWalletOrderByInput: LoyaltyMonetaryWalletOrderByInput;
  LoyaltyMonetaryWalletPayload: LoyaltyMonetaryWalletPayload;
  LoyaltyMonetaryWalletStatusOperationInput: LoyaltyMonetaryWalletStatusOperationInput;
  LoyaltyMonetaryWalletStatusUpdateInput: LoyaltyMonetaryWalletStatusUpdateInput;
  LoyaltyMonetaryWalletUpdateInput: LoyaltyMonetaryWalletUpdateInput;
  LoyaltyMonetaryWalletUpdatePayload: LoyaltyMonetaryWalletUpdatePayload;
  LoyaltyMonetaryWalletWhereInput: LoyaltyMonetaryWalletWhereInput;
  LoyaltyMoney: LoyaltyMoney;
  LoyaltyMutation: LoyaltyMutation;
  LoyaltyOperationResult: LoyaltyOperationResult;
  LoyaltyPointLot: LoyaltyPointLot;
  LoyaltyPointsAdjustInput: LoyaltyPointsAdjustInput;
  LoyaltyPointsAdjustPayload: LoyaltyPointsAdjustPayload;
  LoyaltyPointsAdjustmentOperationInput: LoyaltyPointsAdjustmentOperationInput;
  LoyaltyPointsConvertToMonetaryInput: LoyaltyPointsConvertToMonetaryInput;
  LoyaltyPointsConvertToMonetaryPayload: LoyaltyPointsConvertToMonetaryPayload;
  LoyaltyPointsToMonetaryOperationInput: LoyaltyPointsToMonetaryOperationInput;
  LoyaltyProgram: LoyaltyProgram;
  LoyaltyProgramConnection: LoyaltyProgramConnection;
  LoyaltyProgramCreateInput: LoyaltyProgramCreateInput;
  LoyaltyProgramCreatePayload: LoyaltyProgramCreatePayload;
  LoyaltyProgramEarningRules: LoyaltyProgramEarningRules;
  LoyaltyProgramEarningRulesInput: LoyaltyProgramEarningRulesInput;
  LoyaltyProgramEdge: LoyaltyProgramEdge;
  LoyaltyProgramEligibility: LoyaltyProgramEligibility;
  LoyaltyProgramEligibilityInput: LoyaltyProgramEligibilityInput;
  LoyaltyProgramFieldsInput: LoyaltyProgramFieldsInput;
  LoyaltyProgramOrderByInput: LoyaltyProgramOrderByInput;
  LoyaltyProgramRules: LoyaltyProgramRules;
  LoyaltyProgramRulesInput: LoyaltyProgramRulesInput;
  LoyaltyProgramUpdateInput: LoyaltyProgramUpdateInput;
  LoyaltyProgramUpdatePayload: LoyaltyProgramUpdatePayload;
  LoyaltyProgramVersion: LoyaltyProgramVersion;
  LoyaltyProgramVersionCreateInput: LoyaltyProgramVersionCreateInput;
  LoyaltyProgramVersionCreateOperationValuesInput: LoyaltyProgramVersionCreateOperationValuesInput;
  LoyaltyProgramVersionCreatePayload: LoyaltyProgramVersionCreatePayload;
  LoyaltyProgramVersionDeleteInput: LoyaltyProgramVersionDeleteInput;
  LoyaltyProgramVersionDeletePayload: LoyaltyProgramVersionDeletePayload;
  LoyaltyProgramVersionOperationInput: LoyaltyProgramVersionOperationInput;
  LoyaltyProgramVersionPublishInput: LoyaltyProgramVersionPublishInput;
  LoyaltyProgramVersionPublishOperationValuesInput: LoyaltyProgramVersionPublishOperationValuesInput;
  LoyaltyProgramVersionPublishPayload: LoyaltyProgramVersionPublishPayload;
  LoyaltyProgramVersionUpdateInput: LoyaltyProgramVersionUpdateInput;
  LoyaltyProgramVersionUpdateOperationValuesInput: LoyaltyProgramVersionUpdateOperationValuesInput;
  LoyaltyProgramVersionUpdatePayload: LoyaltyProgramVersionUpdatePayload;
  LoyaltyProgramWhereInput: LoyaltyProgramWhereInput;
  LoyaltyQuery: Omit<LoyaltyQuery, 'node' | 'nodes'> & { node?: Maybe<ResolversParentTypes['Node']>, nodes: Array<Maybe<ResolversParentTypes['Node']>> };
  LoyaltyReservation: LoyaltyReservation;
  LoyaltyReservationConnection: LoyaltyReservationConnection;
  LoyaltyReservationEdge: LoyaltyReservationEdge;
  LoyaltyReservationEvent: LoyaltyReservationEvent;
  LoyaltyReservationOrderByInput: LoyaltyReservationOrderByInput;
  LoyaltyReservationReleaseOperationInput: LoyaltyReservationReleaseOperationInput;
  LoyaltyReservationUpdateInput: LoyaltyReservationUpdateInput;
  LoyaltyReservationUpdatePayload: LoyaltyReservationUpdatePayload;
  LoyaltyReservationWhereInput: LoyaltyReservationWhereInput;
  LoyaltyRewardDefinition: LoyaltyRewardDefinition;
  LoyaltyRewardDefinitionCreateInput: LoyaltyRewardDefinitionCreateInput;
  LoyaltyRewardDefinitionDeleteInput: LoyaltyRewardDefinitionDeleteInput;
  LoyaltyRewardDefinitionInput: LoyaltyRewardDefinitionInput;
  LoyaltyRewardDefinitionOperationInput: LoyaltyRewardDefinitionOperationInput;
  LoyaltyRewardDefinitionPayload: LoyaltyRewardDefinitionPayload;
  LoyaltyRewardDefinitionUpdateInput: LoyaltyRewardDefinitionUpdateInput;
  LoyaltyRewardDefinitionUpdateOperationValuesInput: LoyaltyRewardDefinitionUpdateOperationValuesInput;
  LoyaltyRewardEntitlement: LoyaltyRewardEntitlement;
  LoyaltyRewardEntitlementConnection: LoyaltyRewardEntitlementConnection;
  LoyaltyRewardEntitlementEdge: LoyaltyRewardEntitlementEdge;
  LoyaltyRewardEntitlementEvent: LoyaltyRewardEntitlementEvent;
  LoyaltyRewardEntitlementIssueInput: LoyaltyRewardEntitlementIssueInput;
  LoyaltyRewardEntitlementOperationInput: LoyaltyRewardEntitlementOperationInput;
  LoyaltyRewardEntitlementOrderByInput: LoyaltyRewardEntitlementOrderByInput;
  LoyaltyRewardEntitlementPayload: LoyaltyRewardEntitlementPayload;
  LoyaltyRewardEntitlementTransitionInput: LoyaltyRewardEntitlementTransitionInput;
  LoyaltyRewardEntitlementWhereInput: LoyaltyRewardEntitlementWhereInput;
  LoyaltyTier: LoyaltyTier;
  LoyaltyTierCreateInput: LoyaltyTierCreateInput;
  LoyaltyTierDeleteInput: LoyaltyTierDeleteInput;
  LoyaltyTierEvaluateInput: LoyaltyTierEvaluateInput;
  LoyaltyTierEvaluatePayload: LoyaltyTierEvaluatePayload;
  LoyaltyTierInput: LoyaltyTierInput;
  LoyaltyTierMembership: LoyaltyTierMembership;
  LoyaltyTierMembershipConnection: LoyaltyTierMembershipConnection;
  LoyaltyTierMembershipEdge: LoyaltyTierMembershipEdge;
  LoyaltyTierMembershipEvent: LoyaltyTierMembershipEvent;
  LoyaltyTierMembershipOperationInput: LoyaltyTierMembershipOperationInput;
  LoyaltyTierMembershipOrderByInput: LoyaltyTierMembershipOrderByInput;
  LoyaltyTierMembershipRevokeInput: LoyaltyTierMembershipRevokeInput;
  LoyaltyTierOperationInput: LoyaltyTierOperationInput;
  LoyaltyTierPayload: LoyaltyTierPayload;
  LoyaltyTierPolicy: LoyaltyTierPolicy;
  LoyaltyTierPolicyDeleteInput: LoyaltyTierPolicyDeleteInput;
  LoyaltyTierPolicyInput: LoyaltyTierPolicyInput;
  LoyaltyTierPolicyOperationInput: LoyaltyTierPolicyOperationInput;
  LoyaltyTierPolicyPayload: LoyaltyTierPolicyPayload;
  LoyaltyTierPolicyUpsertInput: LoyaltyTierPolicyUpsertInput;
  LoyaltyTierRewardBenefit: LoyaltyTierRewardBenefit;
  LoyaltyTierRewardBenefitCreateInput: LoyaltyTierRewardBenefitCreateInput;
  LoyaltyTierRewardBenefitCreateOperationValuesInput: LoyaltyTierRewardBenefitCreateOperationValuesInput;
  LoyaltyTierRewardBenefitDeleteInput: LoyaltyTierRewardBenefitDeleteInput;
  LoyaltyTierRewardBenefitOperationInput: LoyaltyTierRewardBenefitOperationInput;
  LoyaltyTierRewardBenefitPayload: LoyaltyTierRewardBenefitPayload;
  LoyaltyTierUpdateInput: LoyaltyTierUpdateInput;
  LoyaltyTierUpdateOperationValuesInput: LoyaltyTierUpdateOperationValuesInput;
  LoyaltyTransaction: LoyaltyTransaction;
  LoyaltyTransactionConnection: LoyaltyTransactionConnection;
  LoyaltyTransactionEdge: LoyaltyTransactionEdge;
  LoyaltyTransactionOrderByInput: LoyaltyTransactionOrderByInput;
  LoyaltyTransactionWhereInput: LoyaltyTransactionWhereInput;
  LoyaltyUserError: LoyaltyUserError;
  Mutation: {};
  Node: ResolversInterfaceTypes<ResolversParentTypes>['Node'];
  PageInfo: PageInfo;
  Query: {};
  UserError: ResolversInterfaceTypes<ResolversParentTypes>['UserError'];
}>;

export interface BigIntScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['BigInt'], any> {
  name: 'BigInt';
}

export type CustomerResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['Customer'] = ResolversParentTypes['Customer']> = ResolversObject<{
  __resolveReference?: ReferenceResolver<Maybe<ResolversTypes['Customer']>, ParentType, ContextType>;

  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export interface DateTimeScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['DateTime'], any> {
  name: 'DateTime';
}

export interface JsonScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['JSON'], any> {
  name: 'JSON';
}

export type LoyaltyAccountResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['LoyaltyAccount'] = ResolversParentTypes['LoyaltyAccount']> = ResolversObject<{
  __resolveReference?: ReferenceResolver<Maybe<ResolversTypes['LoyaltyAccount']>, { __typename: 'LoyaltyAccount' } & GraphQLRecursivePick<ParentType, {"id":true}>, ContextType>;
  balance?: Resolver<ResolversTypes['LoyaltyAccountBalance'], ParentType, ContextType>;
  closedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  customer?: Resolver<Maybe<ResolversTypes['Customer']>, ParentType, ContextType>;
  customerId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  expiringPoints?: Resolver<Array<ResolversTypes['LoyaltyExpiringPoints']>, ParentType, ContextType, RequireFields<LoyaltyAccountExpiringPointsArgs, 'first'>>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  mergedIntoAccount?: Resolver<Maybe<ResolversTypes['LoyaltyAccount']>, ParentType, ContextType>;
  monetaryWallets?: Resolver<Array<ResolversTypes['LoyaltyMonetaryWallet']>, ParentType, ContextType>;
  openedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  program?: Resolver<ResolversTypes['LoyaltyProgram'], ParentType, ContextType>;
  rewardEntitlements?: Resolver<ResolversTypes['LoyaltyRewardEntitlementConnection'], ParentType, ContextType, Partial<LoyaltyAccountRewardEntitlementsArgs>>;
  status?: Resolver<ResolversTypes['LoyaltyAccountStatus'], ParentType, ContextType>;
  suspendedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  suspendedReason?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  tierMembership?: Resolver<Maybe<ResolversTypes['LoyaltyTierMembership']>, ParentType, ContextType>;
  tierMemberships?: Resolver<ResolversTypes['LoyaltyTierMembershipConnection'], ParentType, ContextType, Partial<LoyaltyAccountTierMembershipsArgs>>;
  transactions?: Resolver<ResolversTypes['LoyaltyTransactionConnection'], ParentType, ContextType, Partial<LoyaltyAccountTransactionsArgs>>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type LoyaltyAccountBalanceResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['LoyaltyAccountBalance'] = ResolversParentTypes['LoyaltyAccountBalance']> = ResolversObject<{
  availablePoints?: Resolver<ResolversTypes['BigInt'], ParentType, ContextType>;
  debtPoints?: Resolver<ResolversTypes['BigInt'], ParentType, ContextType>;
  lifetimeAdjustedPoints?: Resolver<ResolversTypes['BigInt'], ParentType, ContextType>;
  lifetimeEarnedPoints?: Resolver<ResolversTypes['BigInt'], ParentType, ContextType>;
  lifetimeExpiredPoints?: Resolver<ResolversTypes['BigInt'], ParentType, ContextType>;
  lifetimeRedeemedPoints?: Resolver<ResolversTypes['BigInt'], ParentType, ContextType>;
  pendingPoints?: Resolver<ResolversTypes['BigInt'], ParentType, ContextType>;
  reservedPoints?: Resolver<ResolversTypes['BigInt'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type LoyaltyAccountBalanceRebuildPayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['LoyaltyAccountBalanceRebuildPayload'] = ResolversParentTypes['LoyaltyAccountBalanceRebuildPayload']> = ResolversObject<{
  account?: Resolver<Maybe<ResolversTypes['LoyaltyAccount']>, ParentType, ContextType>;
  balance?: Resolver<Maybe<ResolversTypes['LoyaltyAccountBalance']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['LoyaltyUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type LoyaltyAccountConnectionResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['LoyaltyAccountConnection'] = ResolversParentTypes['LoyaltyAccountConnection']> = ResolversObject<{
  edges?: Resolver<Array<ResolversTypes['LoyaltyAccountEdge']>, ParentType, ContextType>;
  pageInfo?: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type LoyaltyAccountEdgeResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['LoyaltyAccountEdge'] = ResolversParentTypes['LoyaltyAccountEdge']> = ResolversObject<{
  cursor?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  node?: Resolver<ResolversTypes['LoyaltyAccount'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type LoyaltyAccountStatusUpdatePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['LoyaltyAccountStatusUpdatePayload'] = ResolversParentTypes['LoyaltyAccountStatusUpdatePayload']> = ResolversObject<{
  account?: Resolver<Maybe<ResolversTypes['LoyaltyAccount']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['LoyaltyUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type LoyaltyAccountUpdatePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['LoyaltyAccountUpdatePayload'] = ResolversParentTypes['LoyaltyAccountUpdatePayload']> = ResolversObject<{
  account?: Resolver<Maybe<ResolversTypes['LoyaltyAccount']>, ParentType, ContextType>;
  operationResults?: Resolver<Array<ResolversTypes['LoyaltyOperationResult']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['LoyaltyUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type LoyaltyCatalogSelectorResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['LoyaltyCatalogSelector'] = ResolversParentTypes['LoyaltyCatalogSelector']> = ResolversObject<{
  ids?: Resolver<Array<ResolversTypes['ID']>, ParentType, ContextType>;
  type?: Resolver<ResolversTypes['LoyaltyCatalogSelectorType'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type LoyaltyDeletePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['LoyaltyDeletePayload'] = ResolversParentTypes['LoyaltyDeletePayload']> = ResolversObject<{
  deletedId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['LoyaltyUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type LoyaltyEarningModifierResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['LoyaltyEarningModifier'] = ResolversParentTypes['LoyaltyEarningModifier']> = ResolversObject<{
  endsAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  multiplierBps?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  priority?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  segmentIds?: Resolver<Array<ResolversTypes['ID']>, ParentType, ContextType>;
  selector?: Resolver<ResolversTypes['LoyaltyCatalogSelector'], ParentType, ContextType>;
  startsAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  title?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type LoyaltyEarningRuleResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['LoyaltyEarningRule'] = ResolversParentTypes['LoyaltyEarningRule']> = ResolversObject<{
  __resolveReference?: ReferenceResolver<Maybe<ResolversTypes['LoyaltyEarningRule']>, { __typename: 'LoyaltyEarningRule' } & GraphQLRecursivePick<ParentType, {"id":true}>, ContextType>;
  action?: Resolver<ResolversTypes['JSON'], ParentType, ContextType>;
  actionSchemaVersion?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  actionType?: Resolver<ResolversTypes['LoyaltyEarningActionType'], ParentType, ContextType>;
  code?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  conditionSchemaVersion?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  conditions?: Resolver<ResolversTypes['JSON'], ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  limitSchemaVersion?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  limits?: Resolver<ResolversTypes['JSON'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  priority?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  programVersion?: Resolver<ResolversTypes['LoyaltyProgramVersion'], ParentType, ContextType>;
  stopProcessing?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  triggerConfig?: Resolver<ResolversTypes['JSON'], ParentType, ContextType>;
  triggerSchemaVersion?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  triggerType?: Resolver<ResolversTypes['LoyaltyEarningTriggerType'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type LoyaltyEarningRulePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['LoyaltyEarningRulePayload'] = ResolversParentTypes['LoyaltyEarningRulePayload']> = ResolversObject<{
  earningRule?: Resolver<Maybe<ResolversTypes['LoyaltyEarningRule']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['LoyaltyUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type LoyaltyEarningRuleUsageResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['LoyaltyEarningRuleUsage'] = ResolversParentTypes['LoyaltyEarningRuleUsage']> = ResolversObject<{
  __resolveReference?: ReferenceResolver<Maybe<ResolversTypes['LoyaltyEarningRuleUsage']>, { __typename: 'LoyaltyEarningRuleUsage' } & GraphQLRecursivePick<ParentType, {"id":true}>, ContextType>;
  earningRule?: Resolver<ResolversTypes['LoyaltyEarningRule'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  monetaryAmounts?: Resolver<ResolversTypes['JSON'], ParentType, ContextType>;
  occurrenceCount?: Resolver<ResolversTypes['BigInt'], ParentType, ContextType>;
  pointsAwarded?: Resolver<ResolversTypes['BigInt'], ParentType, ContextType>;
  scopeKey?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  windowEndedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  windowStartedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type LoyaltyEarningRuleUsageConnectionResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['LoyaltyEarningRuleUsageConnection'] = ResolversParentTypes['LoyaltyEarningRuleUsageConnection']> = ResolversObject<{
  edges?: Resolver<Array<ResolversTypes['LoyaltyEarningRuleUsageEdge']>, ParentType, ContextType>;
  pageInfo?: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type LoyaltyEarningRuleUsageEdgeResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['LoyaltyEarningRuleUsageEdge'] = ResolversParentTypes['LoyaltyEarningRuleUsageEdge']> = ResolversObject<{
  cursor?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  node?: Resolver<ResolversTypes['LoyaltyEarningRuleUsage'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type LoyaltyEventEvaluationResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['LoyaltyEventEvaluation'] = ResolversParentTypes['LoyaltyEventEvaluation']> = ResolversObject<{
  __resolveReference?: ReferenceResolver<Maybe<ResolversTypes['LoyaltyEventEvaluation']>, { __typename: 'LoyaltyEventEvaluation' } & GraphQLRecursivePick<ParentType, {"id":true}>, ContextType>;
  account?: Resolver<ResolversTypes['LoyaltyAccount'], ParentType, ContextType>;
  decision?: Resolver<ResolversTypes['LoyaltyEventEvaluationDecision'], ParentType, ContextType>;
  earningRule?: Resolver<ResolversTypes['LoyaltyEarningRule'], ParentType, ContextType>;
  evaluatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  eventFact?: Resolver<ResolversTypes['LoyaltyEventFact'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  monetaryAmount?: Resolver<Maybe<ResolversTypes['LoyaltyMoney']>, ParentType, ContextType>;
  pointsAwarded?: Resolver<Maybe<ResolversTypes['BigInt']>, ParentType, ContextType>;
  reasonCode?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  result?: Resolver<ResolversTypes['JSON'], ParentType, ContextType>;
  resultSchemaVersion?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  transaction?: Resolver<Maybe<ResolversTypes['LoyaltyTransaction']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type LoyaltyEventEvaluationConnectionResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['LoyaltyEventEvaluationConnection'] = ResolversParentTypes['LoyaltyEventEvaluationConnection']> = ResolversObject<{
  edges?: Resolver<Array<ResolversTypes['LoyaltyEventEvaluationEdge']>, ParentType, ContextType>;
  pageInfo?: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type LoyaltyEventEvaluationEdgeResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['LoyaltyEventEvaluationEdge'] = ResolversParentTypes['LoyaltyEventEvaluationEdge']> = ResolversObject<{
  cursor?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  node?: Resolver<ResolversTypes['LoyaltyEventEvaluation'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type LoyaltyEventFactResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['LoyaltyEventFact'] = ResolversParentTypes['LoyaltyEventFact']> = ResolversObject<{
  __resolveReference?: ReferenceResolver<Maybe<ResolversTypes['LoyaltyEventFact']>, { __typename: 'LoyaltyEventFact' } & GraphQLRecursivePick<ParentType, {"id":true}>, ContextType>;
  customerId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  evaluations?: Resolver<Array<ResolversTypes['LoyaltyEventEvaluation']>, ParentType, ContextType>;
  eventType?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  externalEventId?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  occurredAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  payload?: Resolver<ResolversTypes['JSON'], ParentType, ContextType>;
  payloadHash?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  payloadSchemaVersion?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  producer?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  receivedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  subjectId?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  subjectType?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type LoyaltyEventFactConnectionResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['LoyaltyEventFactConnection'] = ResolversParentTypes['LoyaltyEventFactConnection']> = ResolversObject<{
  edges?: Resolver<Array<ResolversTypes['LoyaltyEventFactEdge']>, ParentType, ContextType>;
  pageInfo?: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type LoyaltyEventFactEdgeResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['LoyaltyEventFactEdge'] = ResolversParentTypes['LoyaltyEventFactEdge']> = ResolversObject<{
  cursor?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  node?: Resolver<ResolversTypes['LoyaltyEventFact'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type LoyaltyExpiringPointsResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['LoyaltyExpiringPoints'] = ResolversParentTypes['LoyaltyExpiringPoints']> = ResolversObject<{
  expiresAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  lotId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  points?: Resolver<ResolversTypes['BigInt'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type LoyaltyLedgerEntryResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['LoyaltyLedgerEntry'] = ResolversParentTypes['LoyaltyLedgerEntry']> = ResolversObject<{
  __resolveReference?: ReferenceResolver<Maybe<ResolversTypes['LoyaltyLedgerEntry']>, { __typename: 'LoyaltyLedgerEntry' } & GraphQLRecursivePick<ParentType, {"id":true}>, ContextType>;
  account?: Resolver<ResolversTypes['LoyaltyAccount'], ParentType, ContextType>;
  bucket?: Resolver<ResolversTypes['LoyaltyBalanceBucket'], ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  pointsDelta?: Resolver<ResolversTypes['BigInt'], ParentType, ContextType>;
  sequence?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  transaction?: Resolver<ResolversTypes['LoyaltyTransaction'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type LoyaltyLotAllocationResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['LoyaltyLotAllocation'] = ResolversParentTypes['LoyaltyLotAllocation']> = ResolversObject<{
  __resolveReference?: ReferenceResolver<Maybe<ResolversTypes['LoyaltyLotAllocation']>, { __typename: 'LoyaltyLotAllocation' } & GraphQLRecursivePick<ParentType, {"id":true}>, ContextType>;
  allocationType?: Resolver<ResolversTypes['LoyaltyLotAllocationType'], ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  debitEntry?: Resolver<ResolversTypes['LoyaltyLedgerEntry'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  lot?: Resolver<ResolversTypes['LoyaltyPointLot'], ParentType, ContextType>;
  points?: Resolver<ResolversTypes['BigInt'], ParentType, ContextType>;
  transaction?: Resolver<ResolversTypes['LoyaltyTransaction'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type LoyaltyMaintenanceResultResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['LoyaltyMaintenanceResult'] = ResolversParentTypes['LoyaltyMaintenanceResult']> = ResolversObject<{
  activatedMonetaryLots?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  activatedPointLots?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  activatedProgramVersions?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  evaluatedTiers?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  expiredMonetaryLots?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  expiredPointLots?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  expiredReservations?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  expiredRewards?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  rebuiltBalances?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  reconciledProgramVersions?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  staleProgramVersions?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type LoyaltyMaintenanceRunPayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['LoyaltyMaintenanceRunPayload'] = ResolversParentTypes['LoyaltyMaintenanceRunPayload']> = ResolversObject<{
  result?: Resolver<Maybe<ResolversTypes['LoyaltyMaintenanceResult']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['LoyaltyUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type LoyaltyMonetaryCreditLotResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['LoyaltyMonetaryCreditLot'] = ResolversParentTypes['LoyaltyMonetaryCreditLot']> = ResolversObject<{
  __resolveReference?: ReferenceResolver<Maybe<ResolversTypes['LoyaltyMonetaryCreditLot']>, { __typename: 'LoyaltyMonetaryCreditLot' } & GraphQLRecursivePick<ParentType, {"id":true}>, ContextType>;
  activatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  allocations?: Resolver<Array<ResolversTypes['LoyaltyMonetaryLotAllocation']>, ParentType, ContextType>;
  amountIssued?: Resolver<ResolversTypes['LoyaltyMoney'], ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  expiresAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  originEntry?: Resolver<ResolversTypes['LoyaltyMonetaryLedgerEntry'], ParentType, ContextType>;
  remainingAmount?: Resolver<ResolversTypes['LoyaltyMoney'], ParentType, ContextType>;
  wallet?: Resolver<ResolversTypes['LoyaltyMonetaryWallet'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type LoyaltyMonetaryLedgerEntryResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['LoyaltyMonetaryLedgerEntry'] = ResolversParentTypes['LoyaltyMonetaryLedgerEntry']> = ResolversObject<{
  __resolveReference?: ReferenceResolver<Maybe<ResolversTypes['LoyaltyMonetaryLedgerEntry']>, { __typename: 'LoyaltyMonetaryLedgerEntry' } & GraphQLRecursivePick<ParentType, {"id":true}>, ContextType>;
  amount?: Resolver<ResolversTypes['LoyaltyMoney'], ParentType, ContextType>;
  bucket?: Resolver<ResolversTypes['LoyaltyMonetaryBalanceBucket'], ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  sequence?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  transaction?: Resolver<ResolversTypes['LoyaltyMonetaryTransaction'], ParentType, ContextType>;
  wallet?: Resolver<ResolversTypes['LoyaltyMonetaryWallet'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type LoyaltyMonetaryLotAllocationResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['LoyaltyMonetaryLotAllocation'] = ResolversParentTypes['LoyaltyMonetaryLotAllocation']> = ResolversObject<{
  __resolveReference?: ReferenceResolver<Maybe<ResolversTypes['LoyaltyMonetaryLotAllocation']>, { __typename: 'LoyaltyMonetaryLotAllocation' } & GraphQLRecursivePick<ParentType, {"id":true}>, ContextType>;
  amount?: Resolver<ResolversTypes['LoyaltyMoney'], ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  debitEntry?: Resolver<ResolversTypes['LoyaltyMonetaryLedgerEntry'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  lot?: Resolver<ResolversTypes['LoyaltyMonetaryCreditLot'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type LoyaltyMonetaryTransactionResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['LoyaltyMonetaryTransaction'] = ResolversParentTypes['LoyaltyMonetaryTransaction']> = ResolversObject<{
  __resolveReference?: ReferenceResolver<Maybe<ResolversTypes['LoyaltyMonetaryTransaction']>, { __typename: 'LoyaltyMonetaryTransaction' } & GraphQLRecursivePick<ParentType, {"id":true}>, ContextType>;
  actorId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  actorType?: Resolver<ResolversTypes['LoyaltyActorType'], ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  effectiveAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  entries?: Resolver<Array<ResolversTypes['LoyaltyMonetaryLedgerEntry']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  kind?: Resolver<ResolversTypes['LoyaltyMonetaryTransactionKind'], ParentType, ContextType>;
  metadata?: Resolver<ResolversTypes['JSON'], ParentType, ContextType>;
  occurredAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  program?: Resolver<ResolversTypes['LoyaltyProgram'], ParentType, ContextType>;
  programVersion?: Resolver<Maybe<ResolversTypes['LoyaltyProgramVersion']>, ParentType, ContextType>;
  reasonCode?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  requestHash?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  sourceId?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  sourceRevision?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  sourceType?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  wallet?: Resolver<ResolversTypes['LoyaltyMonetaryWallet'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type LoyaltyMonetaryTransactionConnectionResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['LoyaltyMonetaryTransactionConnection'] = ResolversParentTypes['LoyaltyMonetaryTransactionConnection']> = ResolversObject<{
  edges?: Resolver<Array<ResolversTypes['LoyaltyMonetaryTransactionEdge']>, ParentType, ContextType>;
  pageInfo?: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type LoyaltyMonetaryTransactionEdgeResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['LoyaltyMonetaryTransactionEdge'] = ResolversParentTypes['LoyaltyMonetaryTransactionEdge']> = ResolversObject<{
  cursor?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  node?: Resolver<ResolversTypes['LoyaltyMonetaryTransaction'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type LoyaltyMonetaryWalletResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['LoyaltyMonetaryWallet'] = ResolversParentTypes['LoyaltyMonetaryWallet']> = ResolversObject<{
  __resolveReference?: ReferenceResolver<Maybe<ResolversTypes['LoyaltyMonetaryWallet']>, { __typename: 'LoyaltyMonetaryWallet' } & GraphQLRecursivePick<ParentType, {"id":true}>, ContextType>;
  account?: Resolver<ResolversTypes['LoyaltyAccount'], ParentType, ContextType>;
  balance?: Resolver<ResolversTypes['LoyaltyMonetaryWalletBalance'], ParentType, ContextType>;
  closedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  creditLots?: Resolver<Array<ResolversTypes['LoyaltyMonetaryCreditLot']>, ParentType, ContextType>;
  currencyCode?: Resolver<ResolversTypes['CurrencyCode'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  mergedIntoWallet?: Resolver<Maybe<ResolversTypes['LoyaltyMonetaryWallet']>, ParentType, ContextType>;
  openedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  program?: Resolver<ResolversTypes['LoyaltyProgram'], ParentType, ContextType>;
  status?: Resolver<ResolversTypes['LoyaltyMonetaryWalletStatus'], ParentType, ContextType>;
  transactions?: Resolver<ResolversTypes['LoyaltyMonetaryTransactionConnection'], ParentType, ContextType, Partial<LoyaltyMonetaryWalletTransactionsArgs>>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  walletType?: Resolver<ResolversTypes['LoyaltyMonetaryWalletType'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type LoyaltyMonetaryWalletBalanceResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['LoyaltyMonetaryWalletBalance'] = ResolversParentTypes['LoyaltyMonetaryWalletBalance']> = ResolversObject<{
  available?: Resolver<ResolversTypes['LoyaltyMoney'], ParentType, ContextType>;
  debt?: Resolver<ResolversTypes['LoyaltyMoney'], ParentType, ContextType>;
  lastTransaction?: Resolver<Maybe<ResolversTypes['LoyaltyMonetaryTransaction']>, ParentType, ContextType>;
  pending?: Resolver<ResolversTypes['LoyaltyMoney'], ParentType, ContextType>;
  reserved?: Resolver<ResolversTypes['LoyaltyMoney'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type LoyaltyMonetaryWalletConnectionResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['LoyaltyMonetaryWalletConnection'] = ResolversParentTypes['LoyaltyMonetaryWalletConnection']> = ResolversObject<{
  edges?: Resolver<Array<ResolversTypes['LoyaltyMonetaryWalletEdge']>, ParentType, ContextType>;
  pageInfo?: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type LoyaltyMonetaryWalletEdgeResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['LoyaltyMonetaryWalletEdge'] = ResolversParentTypes['LoyaltyMonetaryWalletEdge']> = ResolversObject<{
  cursor?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  node?: Resolver<ResolversTypes['LoyaltyMonetaryWallet'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type LoyaltyMonetaryWalletOperationPayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['LoyaltyMonetaryWalletOperationPayload'] = ResolversParentTypes['LoyaltyMonetaryWalletOperationPayload']> = ResolversObject<{
  monetaryWallet?: Resolver<Maybe<ResolversTypes['LoyaltyMonetaryWallet']>, ParentType, ContextType>;
  transaction?: Resolver<Maybe<ResolversTypes['LoyaltyMonetaryTransaction']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['LoyaltyUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type LoyaltyMonetaryWalletPayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['LoyaltyMonetaryWalletPayload'] = ResolversParentTypes['LoyaltyMonetaryWalletPayload']> = ResolversObject<{
  monetaryWallet?: Resolver<Maybe<ResolversTypes['LoyaltyMonetaryWallet']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['LoyaltyUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type LoyaltyMonetaryWalletUpdatePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['LoyaltyMonetaryWalletUpdatePayload'] = ResolversParentTypes['LoyaltyMonetaryWalletUpdatePayload']> = ResolversObject<{
  monetaryWallet?: Resolver<Maybe<ResolversTypes['LoyaltyMonetaryWallet']>, ParentType, ContextType>;
  operationResults?: Resolver<Array<ResolversTypes['LoyaltyOperationResult']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['LoyaltyUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type LoyaltyMoneyResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['LoyaltyMoney'] = ResolversParentTypes['LoyaltyMoney']> = ResolversObject<{
  amountMinor?: Resolver<ResolversTypes['BigInt'], ParentType, ContextType>;
  currencyCode?: Resolver<ResolversTypes['CurrencyCode'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type LoyaltyMutationResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['LoyaltyMutation'] = ResolversParentTypes['LoyaltyMutation']> = ResolversObject<{
  accountUpdate?: Resolver<ResolversTypes['LoyaltyAccountUpdatePayload'], ParentType, ContextType, RequireFields<LoyaltyMutationAccountUpdateArgs, 'accountId' | 'operations'>>;
  maintenanceRun?: Resolver<ResolversTypes['LoyaltyMaintenanceRunPayload'], ParentType, ContextType, RequireFields<LoyaltyMutationMaintenanceRunArgs, 'input'>>;
  monetaryWalletUpdate?: Resolver<ResolversTypes['LoyaltyMonetaryWalletUpdatePayload'], ParentType, ContextType, RequireFields<LoyaltyMutationMonetaryWalletUpdateArgs, 'monetaryWalletId' | 'operations'>>;
  programCreate?: Resolver<ResolversTypes['LoyaltyProgramCreatePayload'], ParentType, ContextType, RequireFields<LoyaltyMutationProgramCreateArgs, 'input'>>;
  programUpdate?: Resolver<ResolversTypes['LoyaltyProgramUpdatePayload'], ParentType, ContextType, RequireFields<LoyaltyMutationProgramUpdateArgs, 'operations' | 'programId'>>;
  reservationUpdate?: Resolver<ResolversTypes['LoyaltyReservationUpdatePayload'], ParentType, ContextType, RequireFields<LoyaltyMutationReservationUpdateArgs, 'operations' | 'reservationId'>>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type LoyaltyOperationResultResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['LoyaltyOperationResult'] = ResolversParentTypes['LoyaltyOperationResult']> = ResolversObject<{
  account?: Resolver<Maybe<ResolversTypes['LoyaltyAccount']>, ParentType, ContextType>;
  amount?: Resolver<Maybe<ResolversTypes['LoyaltyMoney']>, ParentType, ContextType>;
  applied?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  entityId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  errors?: Resolver<Array<ResolversTypes['LoyaltyUserError']>, ParentType, ContextType>;
  monetaryTransaction?: Resolver<Maybe<ResolversTypes['LoyaltyMonetaryTransaction']>, ParentType, ContextType>;
  monetaryWallet?: Resolver<Maybe<ResolversTypes['LoyaltyMonetaryWallet']>, ParentType, ContextType>;
  pointsTransaction?: Resolver<Maybe<ResolversTypes['LoyaltyTransaction']>, ParentType, ContextType>;
  reservation?: Resolver<Maybe<ResolversTypes['LoyaltyReservation']>, ParentType, ContextType>;
  rewardEntitlement?: Resolver<Maybe<ResolversTypes['LoyaltyRewardEntitlement']>, ParentType, ContextType>;
  tierMembership?: Resolver<Maybe<ResolversTypes['LoyaltyTierMembership']>, ParentType, ContextType>;
  transaction?: Resolver<Maybe<ResolversTypes['LoyaltyTransaction']>, ParentType, ContextType>;
  type?: Resolver<ResolversTypes['LoyaltyOperationType'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type LoyaltyPointLotResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['LoyaltyPointLot'] = ResolversParentTypes['LoyaltyPointLot']> = ResolversObject<{
  __resolveReference?: ReferenceResolver<Maybe<ResolversTypes['LoyaltyPointLot']>, { __typename: 'LoyaltyPointLot' } & GraphQLRecursivePick<ParentType, {"id":true}>, ContextType>;
  account?: Resolver<ResolversTypes['LoyaltyAccount'], ParentType, ContextType>;
  activatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  allocations?: Resolver<Array<ResolversTypes['LoyaltyLotAllocation']>, ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  expiresAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  originEntry?: Resolver<ResolversTypes['LoyaltyLedgerEntry'], ParentType, ContextType>;
  pointsIssued?: Resolver<ResolversTypes['BigInt'], ParentType, ContextType>;
  program?: Resolver<ResolversTypes['LoyaltyProgram'], ParentType, ContextType>;
  remainingPoints?: Resolver<ResolversTypes['BigInt'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type LoyaltyPointsAdjustPayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['LoyaltyPointsAdjustPayload'] = ResolversParentTypes['LoyaltyPointsAdjustPayload']> = ResolversObject<{
  account?: Resolver<Maybe<ResolversTypes['LoyaltyAccount']>, ParentType, ContextType>;
  transaction?: Resolver<Maybe<ResolversTypes['LoyaltyTransaction']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['LoyaltyUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type LoyaltyPointsConvertToMonetaryPayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['LoyaltyPointsConvertToMonetaryPayload'] = ResolversParentTypes['LoyaltyPointsConvertToMonetaryPayload']> = ResolversObject<{
  account?: Resolver<Maybe<ResolversTypes['LoyaltyAccount']>, ParentType, ContextType>;
  amount?: Resolver<Maybe<ResolversTypes['LoyaltyMoney']>, ParentType, ContextType>;
  monetaryTransaction?: Resolver<Maybe<ResolversTypes['LoyaltyMonetaryTransaction']>, ParentType, ContextType>;
  monetaryWallet?: Resolver<Maybe<ResolversTypes['LoyaltyMonetaryWallet']>, ParentType, ContextType>;
  pointsTransaction?: Resolver<Maybe<ResolversTypes['LoyaltyTransaction']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['LoyaltyUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type LoyaltyProgramResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['LoyaltyProgram'] = ResolversParentTypes['LoyaltyProgram']> = ResolversObject<{
  __resolveReference?: ReferenceResolver<Maybe<ResolversTypes['LoyaltyProgram']>, { __typename: 'LoyaltyProgram' } & GraphQLRecursivePick<ParentType, {"id":true}>, ContextType>;
  activeVersion?: Resolver<Maybe<ResolversTypes['LoyaltyProgramVersion']>, ParentType, ContextType>;
  archivedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  code?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  defaultCurrencyCode?: Resolver<ResolversTypes['CurrencyCode'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  isDefault?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  metadata?: Resolver<ResolversTypes['JSON'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  status?: Resolver<ResolversTypes['LoyaltyProgramStatus'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  versions?: Resolver<Array<ResolversTypes['LoyaltyProgramVersion']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type LoyaltyProgramConnectionResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['LoyaltyProgramConnection'] = ResolversParentTypes['LoyaltyProgramConnection']> = ResolversObject<{
  edges?: Resolver<Array<ResolversTypes['LoyaltyProgramEdge']>, ParentType, ContextType>;
  pageInfo?: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type LoyaltyProgramCreatePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['LoyaltyProgramCreatePayload'] = ResolversParentTypes['LoyaltyProgramCreatePayload']> = ResolversObject<{
  program?: Resolver<Maybe<ResolversTypes['LoyaltyProgram']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['LoyaltyUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type LoyaltyProgramEarningRulesResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['LoyaltyProgramEarningRules'] = ResolversParentTypes['LoyaltyProgramEarningRules']> = ResolversObject<{
  eligibleSpendBasis?: Resolver<ResolversTypes['LoyaltyEligibleSpendBasis'], ParentType, ContextType>;
  excludedSelectors?: Resolver<Array<ResolversTypes['LoyaltyCatalogSelector']>, ParentType, ContextType>;
  modifierStackingMode?: Resolver<ResolversTypes['LoyaltyModifierStackingMode'], ParentType, ContextType>;
  modifiers?: Resolver<Array<ResolversTypes['LoyaltyEarningModifier']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type LoyaltyProgramEdgeResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['LoyaltyProgramEdge'] = ResolversParentTypes['LoyaltyProgramEdge']> = ResolversObject<{
  cursor?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  node?: Resolver<ResolversTypes['LoyaltyProgram'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type LoyaltyProgramEligibilityResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['LoyaltyProgramEligibility'] = ResolversParentTypes['LoyaltyProgramEligibility']> = ResolversObject<{
  channelCodes?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  excludedSegmentIds?: Resolver<Array<ResolversTypes['ID']>, ParentType, ContextType>;
  segmentIds?: Resolver<Array<ResolversTypes['ID']>, ParentType, ContextType>;
  segmentMatchMode?: Resolver<Maybe<ResolversTypes['LoyaltySegmentMatchMode']>, ParentType, ContextType>;
  type?: Resolver<ResolversTypes['LoyaltyProgramEligibilityType'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type LoyaltyProgramRulesResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['LoyaltyProgramRules'] = ResolversParentTypes['LoyaltyProgramRules']> = ResolversObject<{
  earning?: Resolver<ResolversTypes['LoyaltyProgramEarningRules'], ParentType, ContextType>;
  eligibility?: Resolver<ResolversTypes['LoyaltyProgramEligibility'], ParentType, ContextType>;
  schemaVersion?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type LoyaltyProgramUpdatePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['LoyaltyProgramUpdatePayload'] = ResolversParentTypes['LoyaltyProgramUpdatePayload']> = ResolversObject<{
  operationResults?: Resolver<Array<ResolversTypes['LoyaltyOperationResult']>, ParentType, ContextType>;
  program?: Resolver<Maybe<ResolversTypes['LoyaltyProgram']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['LoyaltyUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type LoyaltyProgramVersionResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['LoyaltyProgramVersion'] = ResolversParentTypes['LoyaltyProgramVersion']> = ResolversObject<{
  __resolveReference?: ReferenceResolver<Maybe<ResolversTypes['LoyaltyProgramVersion']>, { __typename: 'LoyaltyProgramVersion' } & GraphQLRecursivePick<ParentType, {"id":true}>, ContextType>;
  activationDelaySeconds?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  createdById?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  debtPolicy?: Resolver<ResolversTypes['LoyaltyDebtPolicy'], ParentType, ContextType>;
  earnAmountMinor?: Resolver<ResolversTypes['BigInt'], ParentType, ContextType>;
  earnPoints?: Resolver<ResolversTypes['BigInt'], ParentType, ContextType>;
  earningEnabled?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  earningRules?: Resolver<Array<ResolversTypes['LoyaltyEarningRule']>, ParentType, ContextType>;
  effectiveFrom?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  effectiveTo?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  maximumOrderPercentageBps?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  maximumRedeemPointsPerOrder?: Resolver<Maybe<ResolversTypes['BigInt']>, ParentType, ContextType>;
  minimumEligibleAmountMinor?: Resolver<ResolversTypes['BigInt'], ParentType, ContextType>;
  minimumRedeemPoints?: Resolver<ResolversTypes['BigInt'], ParentType, ContextType>;
  pointsExpiryDays?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  program?: Resolver<ResolversTypes['LoyaltyProgram'], ParentType, ContextType>;
  publishedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  publishedById?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  redeemAmountMinor?: Resolver<ResolversTypes['BigInt'], ParentType, ContextType>;
  redeemPoints?: Resolver<ResolversTypes['BigInt'], ParentType, ContextType>;
  redemptionEnabled?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  referenceReconciliationCheckedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  referenceReconciliationStatus?: Resolver<ResolversTypes['LoyaltyReferenceReconciliationStatus'], ParentType, ContextType>;
  refundPolicy?: Resolver<ResolversTypes['LoyaltyRefundPolicy'], ParentType, ContextType>;
  restoredPointsExpiryPolicy?: Resolver<ResolversTypes['LoyaltyRestoredPointsExpiryPolicy'], ParentType, ContextType>;
  rewardDefinitions?: Resolver<Array<ResolversTypes['LoyaltyRewardDefinition']>, ParentType, ContextType>;
  roundingMode?: Resolver<ResolversTypes['LoyaltyRoundingMode'], ParentType, ContextType>;
  rules?: Resolver<ResolversTypes['LoyaltyProgramRules'], ParentType, ContextType>;
  rulesSchemaVersion?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  status?: Resolver<ResolversTypes['LoyaltyProgramVersionStatus'], ParentType, ContextType>;
  tierPolicy?: Resolver<Maybe<ResolversTypes['LoyaltyTierPolicy']>, ParentType, ContextType>;
  tiers?: Resolver<Array<ResolversTypes['LoyaltyTier']>, ParentType, ContextType>;
  version?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type LoyaltyProgramVersionCreatePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['LoyaltyProgramVersionCreatePayload'] = ResolversParentTypes['LoyaltyProgramVersionCreatePayload']> = ResolversObject<{
  programVersion?: Resolver<Maybe<ResolversTypes['LoyaltyProgramVersion']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['LoyaltyUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type LoyaltyProgramVersionDeletePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['LoyaltyProgramVersionDeletePayload'] = ResolversParentTypes['LoyaltyProgramVersionDeletePayload']> = ResolversObject<{
  deletedProgramVersionId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['LoyaltyUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type LoyaltyProgramVersionPublishPayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['LoyaltyProgramVersionPublishPayload'] = ResolversParentTypes['LoyaltyProgramVersionPublishPayload']> = ResolversObject<{
  programVersion?: Resolver<Maybe<ResolversTypes['LoyaltyProgramVersion']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['LoyaltyUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type LoyaltyProgramVersionUpdatePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['LoyaltyProgramVersionUpdatePayload'] = ResolversParentTypes['LoyaltyProgramVersionUpdatePayload']> = ResolversObject<{
  programVersion?: Resolver<Maybe<ResolversTypes['LoyaltyProgramVersion']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['LoyaltyUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type LoyaltyQueryResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['LoyaltyQuery'] = ResolversParentTypes['LoyaltyQuery']> = ResolversObject<{
  account?: Resolver<Maybe<ResolversTypes['LoyaltyAccount']>, ParentType, ContextType, RequireFields<LoyaltyQueryAccountArgs, 'id'>>;
  accounts?: Resolver<ResolversTypes['LoyaltyAccountConnection'], ParentType, ContextType, Partial<LoyaltyQueryAccountsArgs>>;
  customerAccount?: Resolver<Maybe<ResolversTypes['LoyaltyAccount']>, ParentType, ContextType, RequireFields<LoyaltyQueryCustomerAccountArgs, 'customerId'>>;
  earningRule?: Resolver<Maybe<ResolversTypes['LoyaltyEarningRule']>, ParentType, ContextType, RequireFields<LoyaltyQueryEarningRuleArgs, 'id'>>;
  earningRuleUsages?: Resolver<ResolversTypes['LoyaltyEarningRuleUsageConnection'], ParentType, ContextType, RequireFields<LoyaltyQueryEarningRuleUsagesArgs, 'where'>>;
  eventEvaluation?: Resolver<Maybe<ResolversTypes['LoyaltyEventEvaluation']>, ParentType, ContextType, RequireFields<LoyaltyQueryEventEvaluationArgs, 'id'>>;
  eventEvaluations?: Resolver<ResolversTypes['LoyaltyEventEvaluationConnection'], ParentType, ContextType, RequireFields<LoyaltyQueryEventEvaluationsArgs, 'where'>>;
  eventFact?: Resolver<Maybe<ResolversTypes['LoyaltyEventFact']>, ParentType, ContextType, RequireFields<LoyaltyQueryEventFactArgs, 'id'>>;
  eventFacts?: Resolver<ResolversTypes['LoyaltyEventFactConnection'], ParentType, ContextType, Partial<LoyaltyQueryEventFactsArgs>>;
  monetaryTransaction?: Resolver<Maybe<ResolversTypes['LoyaltyMonetaryTransaction']>, ParentType, ContextType, RequireFields<LoyaltyQueryMonetaryTransactionArgs, 'id'>>;
  monetaryTransactions?: Resolver<ResolversTypes['LoyaltyMonetaryTransactionConnection'], ParentType, ContextType, RequireFields<LoyaltyQueryMonetaryTransactionsArgs, 'walletId'>>;
  monetaryWallet?: Resolver<Maybe<ResolversTypes['LoyaltyMonetaryWallet']>, ParentType, ContextType, RequireFields<LoyaltyQueryMonetaryWalletArgs, 'id'>>;
  monetaryWallets?: Resolver<ResolversTypes['LoyaltyMonetaryWalletConnection'], ParentType, ContextType, RequireFields<LoyaltyQueryMonetaryWalletsArgs, 'where'>>;
  node?: Resolver<Maybe<ResolversTypes['Node']>, ParentType, ContextType, RequireFields<LoyaltyQueryNodeArgs, 'id'>>;
  nodes?: Resolver<Array<Maybe<ResolversTypes['Node']>>, ParentType, ContextType, RequireFields<LoyaltyQueryNodesArgs, 'ids'>>;
  program?: Resolver<Maybe<ResolversTypes['LoyaltyProgram']>, ParentType, ContextType, RequireFields<LoyaltyQueryProgramArgs, 'id'>>;
  programVersion?: Resolver<Maybe<ResolversTypes['LoyaltyProgramVersion']>, ParentType, ContextType, RequireFields<LoyaltyQueryProgramVersionArgs, 'id'>>;
  programs?: Resolver<ResolversTypes['LoyaltyProgramConnection'], ParentType, ContextType, Partial<LoyaltyQueryProgramsArgs>>;
  reservation?: Resolver<Maybe<ResolversTypes['LoyaltyReservation']>, ParentType, ContextType, RequireFields<LoyaltyQueryReservationArgs, 'id'>>;
  reservations?: Resolver<ResolversTypes['LoyaltyReservationConnection'], ParentType, ContextType, Partial<LoyaltyQueryReservationsArgs>>;
  rewardDefinition?: Resolver<Maybe<ResolversTypes['LoyaltyRewardDefinition']>, ParentType, ContextType, RequireFields<LoyaltyQueryRewardDefinitionArgs, 'id'>>;
  rewardEntitlement?: Resolver<Maybe<ResolversTypes['LoyaltyRewardEntitlement']>, ParentType, ContextType, RequireFields<LoyaltyQueryRewardEntitlementArgs, 'id'>>;
  rewardEntitlements?: Resolver<ResolversTypes['LoyaltyRewardEntitlementConnection'], ParentType, ContextType, RequireFields<LoyaltyQueryRewardEntitlementsArgs, 'where'>>;
  tier?: Resolver<Maybe<ResolversTypes['LoyaltyTier']>, ParentType, ContextType, RequireFields<LoyaltyQueryTierArgs, 'id'>>;
  tierMembership?: Resolver<Maybe<ResolversTypes['LoyaltyTierMembership']>, ParentType, ContextType, RequireFields<LoyaltyQueryTierMembershipArgs, 'id'>>;
  tierMemberships?: Resolver<ResolversTypes['LoyaltyTierMembershipConnection'], ParentType, ContextType, RequireFields<LoyaltyQueryTierMembershipsArgs, 'accountId'>>;
  tierPolicy?: Resolver<Maybe<ResolversTypes['LoyaltyTierPolicy']>, ParentType, ContextType, RequireFields<LoyaltyQueryTierPolicyArgs, 'id'>>;
  transaction?: Resolver<Maybe<ResolversTypes['LoyaltyTransaction']>, ParentType, ContextType, RequireFields<LoyaltyQueryTransactionArgs, 'id'>>;
  transactions?: Resolver<ResolversTypes['LoyaltyTransactionConnection'], ParentType, ContextType, Partial<LoyaltyQueryTransactionsArgs>>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type LoyaltyReservationResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['LoyaltyReservation'] = ResolversParentTypes['LoyaltyReservation']> = ResolversObject<{
  __resolveReference?: ReferenceResolver<Maybe<ResolversTypes['LoyaltyReservation']>, { __typename: 'LoyaltyReservation' } & GraphQLRecursivePick<ParentType, {"id":true}>, ContextType>;
  account?: Resolver<ResolversTypes['LoyaltyAccount'], ParentType, ContextType>;
  checkoutId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  committedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  discount?: Resolver<ResolversTypes['LoyaltyMoney'], ParentType, ContextType>;
  events?: Resolver<Array<ResolversTypes['LoyaltyReservationEvent']>, ParentType, ContextType>;
  expiredAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  expiresAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  orderId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  orderRevision?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  points?: Resolver<ResolversTypes['BigInt'], ParentType, ContextType>;
  program?: Resolver<ResolversTypes['LoyaltyProgram'], ParentType, ContextType>;
  programVersion?: Resolver<ResolversTypes['LoyaltyProgramVersion'], ParentType, ContextType>;
  quoteId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  quoteRevision?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  releasedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  requestHash?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  reversedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  status?: Resolver<ResolversTypes['LoyaltyReservationStatus'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type LoyaltyReservationConnectionResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['LoyaltyReservationConnection'] = ResolversParentTypes['LoyaltyReservationConnection']> = ResolversObject<{
  edges?: Resolver<Array<ResolversTypes['LoyaltyReservationEdge']>, ParentType, ContextType>;
  pageInfo?: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type LoyaltyReservationEdgeResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['LoyaltyReservationEdge'] = ResolversParentTypes['LoyaltyReservationEdge']> = ResolversObject<{
  cursor?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  node?: Resolver<ResolversTypes['LoyaltyReservation'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type LoyaltyReservationEventResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['LoyaltyReservationEvent'] = ResolversParentTypes['LoyaltyReservationEvent']> = ResolversObject<{
  __resolveReference?: ReferenceResolver<Maybe<ResolversTypes['LoyaltyReservationEvent']>, { __typename: 'LoyaltyReservationEvent' } & GraphQLRecursivePick<ParentType, {"id":true}>, ContextType>;
  actorId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  actorType?: Resolver<ResolversTypes['LoyaltyActorType'], ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  eventId?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  eventType?: Resolver<ResolversTypes['LoyaltyReservationEventType'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  metadata?: Resolver<ResolversTypes['JSON'], ParentType, ContextType>;
  occurredAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  previousStatus?: Resolver<Maybe<ResolversTypes['LoyaltyReservationStatus']>, ParentType, ContextType>;
  reasonCode?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  reservation?: Resolver<ResolversTypes['LoyaltyReservation'], ParentType, ContextType>;
  status?: Resolver<ResolversTypes['LoyaltyReservationStatus'], ParentType, ContextType>;
  transaction?: Resolver<ResolversTypes['LoyaltyTransaction'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type LoyaltyReservationUpdatePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['LoyaltyReservationUpdatePayload'] = ResolversParentTypes['LoyaltyReservationUpdatePayload']> = ResolversObject<{
  operationResults?: Resolver<Array<ResolversTypes['LoyaltyOperationResult']>, ParentType, ContextType>;
  reservation?: Resolver<Maybe<ResolversTypes['LoyaltyReservation']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['LoyaltyUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type LoyaltyRewardDefinitionResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['LoyaltyRewardDefinition'] = ResolversParentTypes['LoyaltyRewardDefinition']> = ResolversObject<{
  __resolveReference?: ReferenceResolver<Maybe<ResolversTypes['LoyaltyRewardDefinition']>, { __typename: 'LoyaltyRewardDefinition' } & GraphQLRecursivePick<ParentType, {"id":true}>, ContextType>;
  code?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  configuration?: Resolver<ResolversTypes['JSON'], ParentType, ContextType>;
  configurationSchemaVersion?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  endsAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  issuanceLimit?: Resolver<Maybe<ResolversTypes['BigInt']>, ParentType, ContextType>;
  issuedQuantity?: Resolver<ResolversTypes['BigInt'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  perAccountLimit?: Resolver<Maybe<ResolversTypes['BigInt']>, ParentType, ContextType>;
  programVersion?: Resolver<ResolversTypes['LoyaltyProgramVersion'], ParentType, ContextType>;
  rewardType?: Resolver<ResolversTypes['LoyaltyRewardType'], ParentType, ContextType>;
  startsAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  validityDays?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type LoyaltyRewardDefinitionPayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['LoyaltyRewardDefinitionPayload'] = ResolversParentTypes['LoyaltyRewardDefinitionPayload']> = ResolversObject<{
  rewardDefinition?: Resolver<Maybe<ResolversTypes['LoyaltyRewardDefinition']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['LoyaltyUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type LoyaltyRewardEntitlementResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['LoyaltyRewardEntitlement'] = ResolversParentTypes['LoyaltyRewardEntitlement']> = ResolversObject<{
  __resolveReference?: ReferenceResolver<Maybe<ResolversTypes['LoyaltyRewardEntitlement']>, { __typename: 'LoyaltyRewardEntitlement' } & GraphQLRecursivePick<ParentType, {"id":true}>, ContextType>;
  account?: Resolver<ResolversTypes['LoyaltyAccount'], ParentType, ContextType>;
  configurationSchemaVersion?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  configurationSnapshot?: Resolver<ResolversTypes['JSON'], ParentType, ContextType>;
  definition?: Resolver<ResolversTypes['LoyaltyRewardDefinition'], ParentType, ContextType>;
  events?: Resolver<Array<ResolversTypes['LoyaltyRewardEntitlementEvent']>, ParentType, ContextType>;
  expiredAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  externalReference?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  issuanceTransaction?: Resolver<Maybe<ResolversTypes['LoyaltyTransaction']>, ParentType, ContextType>;
  issuedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  monetaryTransaction?: Resolver<Maybe<ResolversTypes['LoyaltyMonetaryTransaction']>, ParentType, ContextType>;
  quantity?: Resolver<ResolversTypes['BigInt'], ParentType, ContextType>;
  redeemedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  redeemedOrderId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  reservedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  reservedForCheckoutId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  revokedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  sourceEventFact?: Resolver<Maybe<ResolversTypes['LoyaltyEventFact']>, ParentType, ContextType>;
  status?: Resolver<ResolversTypes['LoyaltyRewardEntitlementStatus'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  validFrom?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  validTo?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type LoyaltyRewardEntitlementConnectionResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['LoyaltyRewardEntitlementConnection'] = ResolversParentTypes['LoyaltyRewardEntitlementConnection']> = ResolversObject<{
  edges?: Resolver<Array<ResolversTypes['LoyaltyRewardEntitlementEdge']>, ParentType, ContextType>;
  pageInfo?: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type LoyaltyRewardEntitlementEdgeResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['LoyaltyRewardEntitlementEdge'] = ResolversParentTypes['LoyaltyRewardEntitlementEdge']> = ResolversObject<{
  cursor?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  node?: Resolver<ResolversTypes['LoyaltyRewardEntitlement'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type LoyaltyRewardEntitlementEventResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['LoyaltyRewardEntitlementEvent'] = ResolversParentTypes['LoyaltyRewardEntitlementEvent']> = ResolversObject<{
  __resolveReference?: ReferenceResolver<Maybe<ResolversTypes['LoyaltyRewardEntitlementEvent']>, { __typename: 'LoyaltyRewardEntitlementEvent' } & GraphQLRecursivePick<ParentType, {"id":true}>, ContextType>;
  actorId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  actorType?: Resolver<ResolversTypes['LoyaltyActorType'], ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  entitlement?: Resolver<ResolversTypes['LoyaltyRewardEntitlement'], ParentType, ContextType>;
  eventType?: Resolver<ResolversTypes['LoyaltyRewardEntitlementEventType'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  metadata?: Resolver<ResolversTypes['JSON'], ParentType, ContextType>;
  occurredAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  previousStatus?: Resolver<Maybe<ResolversTypes['LoyaltyRewardEntitlementStatus']>, ParentType, ContextType>;
  reasonCode?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  status?: Resolver<ResolversTypes['LoyaltyRewardEntitlementStatus'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type LoyaltyRewardEntitlementPayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['LoyaltyRewardEntitlementPayload'] = ResolversParentTypes['LoyaltyRewardEntitlementPayload']> = ResolversObject<{
  rewardEntitlement?: Resolver<Maybe<ResolversTypes['LoyaltyRewardEntitlement']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['LoyaltyUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type LoyaltyTierResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['LoyaltyTier'] = ResolversParentTypes['LoyaltyTier']> = ResolversObject<{
  __resolveReference?: ReferenceResolver<Maybe<ResolversTypes['LoyaltyTier']>, { __typename: 'LoyaltyTier' } & GraphQLRecursivePick<ParentType, {"id":true}>, ContextType>;
  code?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  maintenance?: Resolver<Maybe<ResolversTypes['JSON']>, ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  programVersion?: Resolver<ResolversTypes['LoyaltyProgramVersion'], ParentType, ContextType>;
  qualification?: Resolver<ResolversTypes['JSON'], ParentType, ContextType>;
  qualificationSchemaVersion?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  rank?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  rewardBenefits?: Resolver<Array<ResolversTypes['LoyaltyTierRewardBenefit']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type LoyaltyTierEvaluatePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['LoyaltyTierEvaluatePayload'] = ResolversParentTypes['LoyaltyTierEvaluatePayload']> = ResolversObject<{
  tierMembership?: Resolver<Maybe<ResolversTypes['LoyaltyTierMembership']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['LoyaltyUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type LoyaltyTierMembershipResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['LoyaltyTierMembership'] = ResolversParentTypes['LoyaltyTierMembership']> = ResolversObject<{
  __resolveReference?: ReferenceResolver<Maybe<ResolversTypes['LoyaltyTierMembership']>, { __typename: 'LoyaltyTierMembership' } & GraphQLRecursivePick<ParentType, {"id":true}>, ContextType>;
  account?: Resolver<ResolversTypes['LoyaltyAccount'], ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  effectiveFrom?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  effectiveTo?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  evaluationPeriodEndedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  evaluationPeriodStartedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  events?: Resolver<Array<ResolversTypes['LoyaltyTierMembershipEvent']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  qualifiedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  status?: Resolver<ResolversTypes['LoyaltyTierMembershipStatus'], ParentType, ContextType>;
  tier?: Resolver<ResolversTypes['LoyaltyTier'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type LoyaltyTierMembershipConnectionResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['LoyaltyTierMembershipConnection'] = ResolversParentTypes['LoyaltyTierMembershipConnection']> = ResolversObject<{
  edges?: Resolver<Array<ResolversTypes['LoyaltyTierMembershipEdge']>, ParentType, ContextType>;
  pageInfo?: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type LoyaltyTierMembershipEdgeResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['LoyaltyTierMembershipEdge'] = ResolversParentTypes['LoyaltyTierMembershipEdge']> = ResolversObject<{
  cursor?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  node?: Resolver<ResolversTypes['LoyaltyTierMembership'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type LoyaltyTierMembershipEventResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['LoyaltyTierMembershipEvent'] = ResolversParentTypes['LoyaltyTierMembershipEvent']> = ResolversObject<{
  __resolveReference?: ReferenceResolver<Maybe<ResolversTypes['LoyaltyTierMembershipEvent']>, { __typename: 'LoyaltyTierMembershipEvent' } & GraphQLRecursivePick<ParentType, {"id":true}>, ContextType>;
  account?: Resolver<ResolversTypes['LoyaltyAccount'], ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  evaluationRevision?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  eventType?: Resolver<ResolversTypes['LoyaltyTierMembershipEventType'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  membership?: Resolver<ResolversTypes['LoyaltyTierMembership'], ParentType, ContextType>;
  metadata?: Resolver<ResolversTypes['JSON'], ParentType, ContextType>;
  occurredAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  previousTier?: Resolver<Maybe<ResolversTypes['LoyaltyTier']>, ParentType, ContextType>;
  reasonCode?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  tier?: Resolver<ResolversTypes['LoyaltyTier'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type LoyaltyTierPayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['LoyaltyTierPayload'] = ResolversParentTypes['LoyaltyTierPayload']> = ResolversObject<{
  tier?: Resolver<Maybe<ResolversTypes['LoyaltyTier']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['LoyaltyUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type LoyaltyTierPolicyResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['LoyaltyTierPolicy'] = ResolversParentTypes['LoyaltyTierPolicy']> = ResolversObject<{
  __resolveReference?: ReferenceResolver<Maybe<ResolversTypes['LoyaltyTierPolicy']>, { __typename: 'LoyaltyTierPolicy' } & GraphQLRecursivePick<ParentType, {"id":true}>, ContextType>;
  calendarPeriod?: Resolver<Maybe<ResolversTypes['LoyaltyTierCalendarPeriod']>, ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  downgradePolicy?: Resolver<ResolversTypes['LoyaltyTierDowngradePolicy'], ParentType, ContextType>;
  gracePeriodDays?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  membershipDurationDays?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  metricSchemaVersion?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  programVersion?: Resolver<ResolversTypes['LoyaltyProgramVersion'], ParentType, ContextType>;
  programYearStartsMonth?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  requalificationPolicy?: Resolver<ResolversTypes['LoyaltyTierRequalificationPolicy'], ParentType, ContextType>;
  rollingWindowDays?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  windowType?: Resolver<ResolversTypes['LoyaltyTierEvaluationWindowType'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type LoyaltyTierPolicyPayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['LoyaltyTierPolicyPayload'] = ResolversParentTypes['LoyaltyTierPolicyPayload']> = ResolversObject<{
  tierPolicy?: Resolver<Maybe<ResolversTypes['LoyaltyTierPolicy']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['LoyaltyUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type LoyaltyTierRewardBenefitResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['LoyaltyTierRewardBenefit'] = ResolversParentTypes['LoyaltyTierRewardBenefit']> = ResolversObject<{
  __resolveReference?: ReferenceResolver<Maybe<ResolversTypes['LoyaltyTierRewardBenefit']>, { __typename: 'LoyaltyTierRewardBenefit' } & GraphQLRecursivePick<ParentType, {"id":true}>, ContextType>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  grantPolicy?: Resolver<ResolversTypes['JSON'], ParentType, ContextType>;
  grantPolicySchemaVersion?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  rewardDefinition?: Resolver<ResolversTypes['LoyaltyRewardDefinition'], ParentType, ContextType>;
  tier?: Resolver<ResolversTypes['LoyaltyTier'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type LoyaltyTierRewardBenefitPayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['LoyaltyTierRewardBenefitPayload'] = ResolversParentTypes['LoyaltyTierRewardBenefitPayload']> = ResolversObject<{
  tierRewardBenefit?: Resolver<Maybe<ResolversTypes['LoyaltyTierRewardBenefit']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['LoyaltyUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type LoyaltyTransactionResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['LoyaltyTransaction'] = ResolversParentTypes['LoyaltyTransaction']> = ResolversObject<{
  __resolveReference?: ReferenceResolver<Maybe<ResolversTypes['LoyaltyTransaction']>, { __typename: 'LoyaltyTransaction' } & GraphQLRecursivePick<ParentType, {"id":true}>, ContextType>;
  account?: Resolver<ResolversTypes['LoyaltyAccount'], ParentType, ContextType>;
  actorId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  actorType?: Resolver<ResolversTypes['LoyaltyActorType'], ParentType, ContextType>;
  causationId?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  correlationId?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  description?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  effectiveAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  entries?: Resolver<Array<ResolversTypes['LoyaltyLedgerEntry']>, ParentType, ContextType>;
  eventId?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  kind?: Resolver<ResolversTypes['LoyaltyTransactionKind'], ParentType, ContextType>;
  lotAllocations?: Resolver<Array<ResolversTypes['LoyaltyLotAllocation']>, ParentType, ContextType>;
  metadata?: Resolver<ResolversTypes['JSON'], ParentType, ContextType>;
  occurredAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  program?: Resolver<ResolversTypes['LoyaltyProgram'], ParentType, ContextType>;
  programVersion?: Resolver<Maybe<ResolversTypes['LoyaltyProgramVersion']>, ParentType, ContextType>;
  reasonCode?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  requestHash?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  source?: Resolver<ResolversTypes['LoyaltyTransactionSource'], ParentType, ContextType>;
  sourceId?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  sourceRevision?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  workflowId?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type LoyaltyTransactionConnectionResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['LoyaltyTransactionConnection'] = ResolversParentTypes['LoyaltyTransactionConnection']> = ResolversObject<{
  edges?: Resolver<Array<ResolversTypes['LoyaltyTransactionEdge']>, ParentType, ContextType>;
  pageInfo?: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type LoyaltyTransactionEdgeResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['LoyaltyTransactionEdge'] = ResolversParentTypes['LoyaltyTransactionEdge']> = ResolversObject<{
  cursor?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  node?: Resolver<ResolversTypes['LoyaltyTransaction'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type LoyaltyUserErrorResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['LoyaltyUserError'] = ResolversParentTypes['LoyaltyUserError']> = ResolversObject<{
  code?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  field?: Resolver<Maybe<Array<ResolversTypes['String']>>, ParentType, ContextType>;
  message?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  retryable?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type MutationResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['Mutation'] = ResolversParentTypes['Mutation']> = ResolversObject<{
  loyaltyMutation?: Resolver<ResolversTypes['LoyaltyMutation'], ParentType, ContextType>;
}>;

export type NodeResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['Node'] = ResolversParentTypes['Node']> = ResolversObject<{
  __resolveType: TypeResolveFn<'Customer' | 'LoyaltyAccount' | 'LoyaltyEarningRule' | 'LoyaltyEarningRuleUsage' | 'LoyaltyEventEvaluation' | 'LoyaltyEventFact' | 'LoyaltyLedgerEntry' | 'LoyaltyLotAllocation' | 'LoyaltyMonetaryCreditLot' | 'LoyaltyMonetaryLedgerEntry' | 'LoyaltyMonetaryLotAllocation' | 'LoyaltyMonetaryTransaction' | 'LoyaltyMonetaryWallet' | 'LoyaltyPointLot' | 'LoyaltyProgram' | 'LoyaltyProgramVersion' | 'LoyaltyReservation' | 'LoyaltyReservationEvent' | 'LoyaltyRewardDefinition' | 'LoyaltyRewardEntitlement' | 'LoyaltyRewardEntitlementEvent' | 'LoyaltyTier' | 'LoyaltyTierMembership' | 'LoyaltyTierMembershipEvent' | 'LoyaltyTierPolicy' | 'LoyaltyTierRewardBenefit' | 'LoyaltyTransaction', ParentType, ContextType>;
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
  loyaltyQuery?: Resolver<ResolversTypes['LoyaltyQuery'], ParentType, ContextType>;
}>;

export type UserErrorResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['UserError'] = ResolversParentTypes['UserError']> = ResolversObject<{
  __resolveType: TypeResolveFn<'LoyaltyUserError', ParentType, ContextType>;
  code?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  field?: Resolver<Maybe<Array<ResolversTypes['String']>>, ParentType, ContextType>;
  message?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
}>;

export type Resolvers<ContextType = ServiceContext> = ResolversObject<{
  BigInt?: GraphQLScalarType;
  Customer?: CustomerResolvers<ContextType>;
  DateTime?: GraphQLScalarType;
  JSON?: GraphQLScalarType;
  LoyaltyAccount?: LoyaltyAccountResolvers<ContextType>;
  LoyaltyAccountBalance?: LoyaltyAccountBalanceResolvers<ContextType>;
  LoyaltyAccountBalanceRebuildPayload?: LoyaltyAccountBalanceRebuildPayloadResolvers<ContextType>;
  LoyaltyAccountConnection?: LoyaltyAccountConnectionResolvers<ContextType>;
  LoyaltyAccountEdge?: LoyaltyAccountEdgeResolvers<ContextType>;
  LoyaltyAccountStatusUpdatePayload?: LoyaltyAccountStatusUpdatePayloadResolvers<ContextType>;
  LoyaltyAccountUpdatePayload?: LoyaltyAccountUpdatePayloadResolvers<ContextType>;
  LoyaltyCatalogSelector?: LoyaltyCatalogSelectorResolvers<ContextType>;
  LoyaltyDeletePayload?: LoyaltyDeletePayloadResolvers<ContextType>;
  LoyaltyEarningModifier?: LoyaltyEarningModifierResolvers<ContextType>;
  LoyaltyEarningRule?: LoyaltyEarningRuleResolvers<ContextType>;
  LoyaltyEarningRulePayload?: LoyaltyEarningRulePayloadResolvers<ContextType>;
  LoyaltyEarningRuleUsage?: LoyaltyEarningRuleUsageResolvers<ContextType>;
  LoyaltyEarningRuleUsageConnection?: LoyaltyEarningRuleUsageConnectionResolvers<ContextType>;
  LoyaltyEarningRuleUsageEdge?: LoyaltyEarningRuleUsageEdgeResolvers<ContextType>;
  LoyaltyEventEvaluation?: LoyaltyEventEvaluationResolvers<ContextType>;
  LoyaltyEventEvaluationConnection?: LoyaltyEventEvaluationConnectionResolvers<ContextType>;
  LoyaltyEventEvaluationEdge?: LoyaltyEventEvaluationEdgeResolvers<ContextType>;
  LoyaltyEventFact?: LoyaltyEventFactResolvers<ContextType>;
  LoyaltyEventFactConnection?: LoyaltyEventFactConnectionResolvers<ContextType>;
  LoyaltyEventFactEdge?: LoyaltyEventFactEdgeResolvers<ContextType>;
  LoyaltyExpiringPoints?: LoyaltyExpiringPointsResolvers<ContextType>;
  LoyaltyLedgerEntry?: LoyaltyLedgerEntryResolvers<ContextType>;
  LoyaltyLotAllocation?: LoyaltyLotAllocationResolvers<ContextType>;
  LoyaltyMaintenanceResult?: LoyaltyMaintenanceResultResolvers<ContextType>;
  LoyaltyMaintenanceRunPayload?: LoyaltyMaintenanceRunPayloadResolvers<ContextType>;
  LoyaltyMonetaryCreditLot?: LoyaltyMonetaryCreditLotResolvers<ContextType>;
  LoyaltyMonetaryLedgerEntry?: LoyaltyMonetaryLedgerEntryResolvers<ContextType>;
  LoyaltyMonetaryLotAllocation?: LoyaltyMonetaryLotAllocationResolvers<ContextType>;
  LoyaltyMonetaryTransaction?: LoyaltyMonetaryTransactionResolvers<ContextType>;
  LoyaltyMonetaryTransactionConnection?: LoyaltyMonetaryTransactionConnectionResolvers<ContextType>;
  LoyaltyMonetaryTransactionEdge?: LoyaltyMonetaryTransactionEdgeResolvers<ContextType>;
  LoyaltyMonetaryWallet?: LoyaltyMonetaryWalletResolvers<ContextType>;
  LoyaltyMonetaryWalletBalance?: LoyaltyMonetaryWalletBalanceResolvers<ContextType>;
  LoyaltyMonetaryWalletConnection?: LoyaltyMonetaryWalletConnectionResolvers<ContextType>;
  LoyaltyMonetaryWalletEdge?: LoyaltyMonetaryWalletEdgeResolvers<ContextType>;
  LoyaltyMonetaryWalletOperationPayload?: LoyaltyMonetaryWalletOperationPayloadResolvers<ContextType>;
  LoyaltyMonetaryWalletPayload?: LoyaltyMonetaryWalletPayloadResolvers<ContextType>;
  LoyaltyMonetaryWalletUpdatePayload?: LoyaltyMonetaryWalletUpdatePayloadResolvers<ContextType>;
  LoyaltyMoney?: LoyaltyMoneyResolvers<ContextType>;
  LoyaltyMutation?: LoyaltyMutationResolvers<ContextType>;
  LoyaltyOperationResult?: LoyaltyOperationResultResolvers<ContextType>;
  LoyaltyPointLot?: LoyaltyPointLotResolvers<ContextType>;
  LoyaltyPointsAdjustPayload?: LoyaltyPointsAdjustPayloadResolvers<ContextType>;
  LoyaltyPointsConvertToMonetaryPayload?: LoyaltyPointsConvertToMonetaryPayloadResolvers<ContextType>;
  LoyaltyProgram?: LoyaltyProgramResolvers<ContextType>;
  LoyaltyProgramConnection?: LoyaltyProgramConnectionResolvers<ContextType>;
  LoyaltyProgramCreatePayload?: LoyaltyProgramCreatePayloadResolvers<ContextType>;
  LoyaltyProgramEarningRules?: LoyaltyProgramEarningRulesResolvers<ContextType>;
  LoyaltyProgramEdge?: LoyaltyProgramEdgeResolvers<ContextType>;
  LoyaltyProgramEligibility?: LoyaltyProgramEligibilityResolvers<ContextType>;
  LoyaltyProgramRules?: LoyaltyProgramRulesResolvers<ContextType>;
  LoyaltyProgramUpdatePayload?: LoyaltyProgramUpdatePayloadResolvers<ContextType>;
  LoyaltyProgramVersion?: LoyaltyProgramVersionResolvers<ContextType>;
  LoyaltyProgramVersionCreatePayload?: LoyaltyProgramVersionCreatePayloadResolvers<ContextType>;
  LoyaltyProgramVersionDeletePayload?: LoyaltyProgramVersionDeletePayloadResolvers<ContextType>;
  LoyaltyProgramVersionPublishPayload?: LoyaltyProgramVersionPublishPayloadResolvers<ContextType>;
  LoyaltyProgramVersionUpdatePayload?: LoyaltyProgramVersionUpdatePayloadResolvers<ContextType>;
  LoyaltyQuery?: LoyaltyQueryResolvers<ContextType>;
  LoyaltyReservation?: LoyaltyReservationResolvers<ContextType>;
  LoyaltyReservationConnection?: LoyaltyReservationConnectionResolvers<ContextType>;
  LoyaltyReservationEdge?: LoyaltyReservationEdgeResolvers<ContextType>;
  LoyaltyReservationEvent?: LoyaltyReservationEventResolvers<ContextType>;
  LoyaltyReservationUpdatePayload?: LoyaltyReservationUpdatePayloadResolvers<ContextType>;
  LoyaltyRewardDefinition?: LoyaltyRewardDefinitionResolvers<ContextType>;
  LoyaltyRewardDefinitionPayload?: LoyaltyRewardDefinitionPayloadResolvers<ContextType>;
  LoyaltyRewardEntitlement?: LoyaltyRewardEntitlementResolvers<ContextType>;
  LoyaltyRewardEntitlementConnection?: LoyaltyRewardEntitlementConnectionResolvers<ContextType>;
  LoyaltyRewardEntitlementEdge?: LoyaltyRewardEntitlementEdgeResolvers<ContextType>;
  LoyaltyRewardEntitlementEvent?: LoyaltyRewardEntitlementEventResolvers<ContextType>;
  LoyaltyRewardEntitlementPayload?: LoyaltyRewardEntitlementPayloadResolvers<ContextType>;
  LoyaltyTier?: LoyaltyTierResolvers<ContextType>;
  LoyaltyTierEvaluatePayload?: LoyaltyTierEvaluatePayloadResolvers<ContextType>;
  LoyaltyTierMembership?: LoyaltyTierMembershipResolvers<ContextType>;
  LoyaltyTierMembershipConnection?: LoyaltyTierMembershipConnectionResolvers<ContextType>;
  LoyaltyTierMembershipEdge?: LoyaltyTierMembershipEdgeResolvers<ContextType>;
  LoyaltyTierMembershipEvent?: LoyaltyTierMembershipEventResolvers<ContextType>;
  LoyaltyTierPayload?: LoyaltyTierPayloadResolvers<ContextType>;
  LoyaltyTierPolicy?: LoyaltyTierPolicyResolvers<ContextType>;
  LoyaltyTierPolicyPayload?: LoyaltyTierPolicyPayloadResolvers<ContextType>;
  LoyaltyTierRewardBenefit?: LoyaltyTierRewardBenefitResolvers<ContextType>;
  LoyaltyTierRewardBenefitPayload?: LoyaltyTierRewardBenefitPayloadResolvers<ContextType>;
  LoyaltyTransaction?: LoyaltyTransactionResolvers<ContextType>;
  LoyaltyTransactionConnection?: LoyaltyTransactionConnectionResolvers<ContextType>;
  LoyaltyTransactionEdge?: LoyaltyTransactionEdgeResolvers<ContextType>;
  LoyaltyUserError?: LoyaltyUserErrorResolvers<ContextType>;
  Mutation?: MutationResolvers<ContextType>;
  Node?: NodeResolvers<ContextType>;
  PageInfo?: PageInfoResolvers<ContextType>;
  Query?: QueryResolvers<ContextType>;
  UserError?: UserErrorResolvers<ContextType>;
}>;

