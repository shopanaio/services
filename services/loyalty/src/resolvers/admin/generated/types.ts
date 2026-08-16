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
  openedAt: Scalars['DateTime']['output'];
  program: LoyaltyProgram;
  revision: Scalars['Int']['output'];
  status: LoyaltyAccountStatus;
  suspendedAt: Maybe<Scalars['DateTime']['output']>;
  suspendedReason: Maybe<Scalars['String']['output']>;
  tierMembership: Maybe<LoyaltyTierMembership>;
  transactions: LoyaltyTransactionConnection;
  updatedAt: Scalars['DateTime']['output'];
};


export type LoyaltyAccountExpiringPointsArgs = {
  first?: InputMaybe<Scalars['Int']['input']>;
};


export type LoyaltyAccountTransactionsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
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
  revision: Scalars['Int']['output'];
  updatedAt: Scalars['DateTime']['output'];
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

export enum LoyaltyAccountStatus {
  Active = 'ACTIVE',
  Closed = 'CLOSED',
  Merged = 'MERGED',
  Suspended = 'SUSPENDED'
}

export type LoyaltyAccountStatusUpdateInput = {
  accountId: Scalars['ID']['input'];
  expectedRevision: Scalars['Int']['input'];
  idempotencyKey: Scalars['String']['input'];
  reason: Scalars['String']['input'];
  status: LoyaltyAccountStatus;
};

export type LoyaltyAccountStatusUpdatePayload = {
  __typename?: 'LoyaltyAccountStatusUpdatePayload';
  account: Maybe<LoyaltyAccount>;
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

export enum LoyaltyModifierStackingMode {
  Add = 'ADD',
  Highest = 'HIGHEST',
  Multiply = 'MULTIPLY'
}

export type LoyaltyMoney = {
  __typename?: 'LoyaltyMoney';
  amountMinor: Scalars['BigInt']['output'];
  currencyCode: CurrencyCode;
};

export type LoyaltyMutation = {
  __typename?: 'LoyaltyMutation';
  accountStatusUpdate: LoyaltyAccountStatusUpdatePayload;
  pointsAdjust: LoyaltyPointsAdjustPayload;
  programCreate: LoyaltyProgramCreatePayload;
  programUpdate: LoyaltyProgramUpdatePayload;
  programVersionCreate: LoyaltyProgramVersionCreatePayload;
  programVersionPublish: LoyaltyProgramVersionPublishPayload;
  reservationRelease: LoyaltyReservationReleasePayload;
};


export type LoyaltyMutationAccountStatusUpdateArgs = {
  input: LoyaltyAccountStatusUpdateInput;
};


export type LoyaltyMutationPointsAdjustArgs = {
  input: LoyaltyPointsAdjustInput;
};


export type LoyaltyMutationProgramCreateArgs = {
  input: LoyaltyProgramCreateInput;
};


export type LoyaltyMutationProgramUpdateArgs = {
  input: LoyaltyProgramUpdateInput;
};


export type LoyaltyMutationProgramVersionCreateArgs = {
  input: LoyaltyProgramVersionCreateInput;
};


export type LoyaltyMutationProgramVersionPublishArgs = {
  input: LoyaltyProgramVersionPublishInput;
};


export type LoyaltyMutationReservationReleaseArgs = {
  input: LoyaltyReservationReleaseInput;
};

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
  expectedBalanceRevision: Scalars['Int']['input'];
  expiresAt?: InputMaybe<Scalars['DateTime']['input']>;
  idempotencyKey: Scalars['String']['input'];
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
  revision: Scalars['Int']['output'];
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
  idempotencyKey: Scalars['String']['input'];
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
  expectedRevision: Scalars['Int']['input'];
  idempotencyKey: Scalars['String']['input'];
  isDefault?: InputMaybe<Scalars['Boolean']['input']>;
  metadata?: InputMaybe<Scalars['JSON']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  programId: Scalars['ID']['input'];
  status?: InputMaybe<LoyaltyProgramStatus>;
};

export type LoyaltyProgramUpdatePayload = {
  __typename?: 'LoyaltyProgramUpdatePayload';
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
  refundPolicy: LoyaltyRefundPolicy;
  restoredPointsExpiryPolicy: LoyaltyRestoredPointsExpiryPolicy;
  revision: Scalars['Int']['output'];
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
  expectedProgramRevision: Scalars['Int']['input'];
  idempotencyKey: Scalars['String']['input'];
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

export type LoyaltyProgramVersionCreatePayload = {
  __typename?: 'LoyaltyProgramVersionCreatePayload';
  programVersion: Maybe<LoyaltyProgramVersion>;
  userErrors: Array<LoyaltyUserError>;
};

export type LoyaltyProgramVersionPublishInput = {
  effectiveFrom: Scalars['DateTime']['input'];
  effectiveTo?: InputMaybe<Scalars['DateTime']['input']>;
  expectedRevision: Scalars['Int']['input'];
  idempotencyKey: Scalars['String']['input'];
  programVersionId: Scalars['ID']['input'];
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
  node: Maybe<Node>;
  nodes: Array<Maybe<Node>>;
  program: Maybe<LoyaltyProgram>;
  programs: LoyaltyProgramConnection;
  reservation: Maybe<LoyaltyReservation>;
  reservations: LoyaltyReservationConnection;
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
  where?: InputMaybe<LoyaltyAccountWhereInput>;
};


export type LoyaltyQueryCustomerAccountArgs = {
  customerId: Scalars['ID']['input'];
  programId?: InputMaybe<Scalars['ID']['input']>;
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


export type LoyaltyQueryProgramsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
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
  where?: InputMaybe<LoyaltyReservationWhereInput>;
};


export type LoyaltyQueryTransactionArgs = {
  id: Scalars['ID']['input'];
};


export type LoyaltyQueryTransactionsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  where?: InputMaybe<LoyaltyTransactionWhereInput>;
};

export enum LoyaltyRefundPolicy {
  FullReversal = 'FULL_REVERSAL',
  Proportional = 'PROPORTIONAL'
}

export type LoyaltyReservation = Node & {
  __typename?: 'LoyaltyReservation';
  account: LoyaltyAccount;
  checkoutId: Scalars['ID']['output'];
  checkoutVersion: Scalars['Int']['output'];
  committedAt: Maybe<Scalars['DateTime']['output']>;
  createdAt: Scalars['DateTime']['output'];
  discount: LoyaltyMoney;
  events: Array<LoyaltyReservationEvent>;
  expiredAt: Maybe<Scalars['DateTime']['output']>;
  expiresAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  idempotencyKey: Scalars['String']['output'];
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
  revision: Scalars['Int']['output'];
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
  idempotencyKey: Scalars['String']['output'];
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

export type LoyaltyReservationReleaseInput = {
  expectedRevision: Scalars['Int']['input'];
  idempotencyKey: Scalars['String']['input'];
  reasonCode: Scalars['String']['input'];
  reservationId: Scalars['ID']['input'];
};

export type LoyaltyReservationReleasePayload = {
  __typename?: 'LoyaltyReservationReleasePayload';
  reservation: Maybe<LoyaltyReservation>;
  transaction: Maybe<LoyaltyTransaction>;
  userErrors: Array<LoyaltyUserError>;
};

export enum LoyaltyReservationStatus {
  Active = 'ACTIVE',
  Committed = 'COMMITTED',
  Expired = 'EXPIRED',
  Released = 'RELEASED',
  Reversed = 'REVERSED'
}

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
  name: Scalars['String']['output'];
  perAccountLimit: Maybe<Scalars['BigInt']['output']>;
  programVersion: LoyaltyProgramVersion;
  rewardType: LoyaltyRewardType;
  startsAt: Maybe<Scalars['DateTime']['output']>;
  validityDays: Maybe<Scalars['Int']['output']>;
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
};

export enum LoyaltyTierCalendarPeriod {
  Month = 'MONTH',
  ProgramYear = 'PROGRAM_YEAR',
  Quarter = 'QUARTER',
  Year = 'YEAR'
}

export enum LoyaltyTierDowngradePolicy {
  EndOfMembership = 'END_OF_MEMBERSHIP',
  GracePeriod = 'GRACE_PERIOD',
  Immediate = 'IMMEDIATE'
}

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
  revision: Scalars['Int']['output'];
  status: LoyaltyTierMembershipStatus;
  tier: LoyaltyTier;
  updatedAt: Scalars['DateTime']['output'];
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

export enum LoyaltyTierMembershipStatus {
  Active = 'ACTIVE',
  Expired = 'EXPIRED',
  Revoked = 'REVOKED'
}

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

export enum LoyaltyTierRequalificationPolicy {
  Automatic = 'AUTOMATIC',
  Manual = 'MANUAL'
}

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
  idempotencyKey: Scalars['String']['output'];
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
  Node: ( Customer ) | ( LoyaltyAccount ) | ( LoyaltyEarningRule ) | ( LoyaltyLedgerEntry ) | ( LoyaltyLotAllocation ) | ( LoyaltyPointLot ) | ( LoyaltyProgram ) | ( LoyaltyProgramVersion ) | ( LoyaltyReservation ) | ( LoyaltyReservationEvent ) | ( LoyaltyRewardDefinition ) | ( LoyaltyTier ) | ( LoyaltyTierMembership ) | ( LoyaltyTierMembershipEvent ) | ( LoyaltyTierPolicy ) | ( LoyaltyTransaction );
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
  LoyaltyAccountConnection: ResolverTypeWrapper<LoyaltyAccountConnection>;
  LoyaltyAccountEdge: ResolverTypeWrapper<LoyaltyAccountEdge>;
  LoyaltyAccountStatus: LoyaltyAccountStatus;
  LoyaltyAccountStatusUpdateInput: LoyaltyAccountStatusUpdateInput;
  LoyaltyAccountStatusUpdatePayload: ResolverTypeWrapper<LoyaltyAccountStatusUpdatePayload>;
  LoyaltyAccountWhereInput: LoyaltyAccountWhereInput;
  Boolean: ResolverTypeWrapper<Scalars['Boolean']['output']>;
  LoyaltyActorType: LoyaltyActorType;
  LoyaltyBalanceBucket: LoyaltyBalanceBucket;
  LoyaltyCatalogSelector: ResolverTypeWrapper<LoyaltyCatalogSelector>;
  LoyaltyCatalogSelectorInput: LoyaltyCatalogSelectorInput;
  LoyaltyCatalogSelectorType: LoyaltyCatalogSelectorType;
  LoyaltyDebtPolicy: LoyaltyDebtPolicy;
  LoyaltyEarningActionType: LoyaltyEarningActionType;
  LoyaltyEarningModifier: ResolverTypeWrapper<LoyaltyEarningModifier>;
  LoyaltyEarningModifierInput: LoyaltyEarningModifierInput;
  LoyaltyEarningRule: ResolverTypeWrapper<LoyaltyEarningRule>;
  LoyaltyEarningRuleInput: LoyaltyEarningRuleInput;
  LoyaltyEarningTriggerType: LoyaltyEarningTriggerType;
  LoyaltyEligibleSpendBasis: LoyaltyEligibleSpendBasis;
  LoyaltyExpiringPoints: ResolverTypeWrapper<LoyaltyExpiringPoints>;
  LoyaltyLedgerEntry: ResolverTypeWrapper<LoyaltyLedgerEntry>;
  LoyaltyLotAllocation: ResolverTypeWrapper<LoyaltyLotAllocation>;
  LoyaltyLotAllocationType: LoyaltyLotAllocationType;
  LoyaltyModifierStackingMode: LoyaltyModifierStackingMode;
  LoyaltyMoney: ResolverTypeWrapper<LoyaltyMoney>;
  LoyaltyMutation: ResolverTypeWrapper<LoyaltyMutation>;
  LoyaltyPointLot: ResolverTypeWrapper<LoyaltyPointLot>;
  LoyaltyPointsAdjustInput: LoyaltyPointsAdjustInput;
  LoyaltyPointsAdjustPayload: ResolverTypeWrapper<LoyaltyPointsAdjustPayload>;
  LoyaltyPointsAdjustmentDirection: LoyaltyPointsAdjustmentDirection;
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
  LoyaltyProgramRules: ResolverTypeWrapper<LoyaltyProgramRules>;
  LoyaltyProgramRulesInput: LoyaltyProgramRulesInput;
  LoyaltyProgramStatus: LoyaltyProgramStatus;
  LoyaltyProgramUpdateInput: LoyaltyProgramUpdateInput;
  LoyaltyProgramUpdatePayload: ResolverTypeWrapper<LoyaltyProgramUpdatePayload>;
  LoyaltyProgramVersion: ResolverTypeWrapper<LoyaltyProgramVersion>;
  LoyaltyProgramVersionCreateInput: LoyaltyProgramVersionCreateInput;
  LoyaltyProgramVersionCreatePayload: ResolverTypeWrapper<LoyaltyProgramVersionCreatePayload>;
  LoyaltyProgramVersionPublishInput: LoyaltyProgramVersionPublishInput;
  LoyaltyProgramVersionPublishPayload: ResolverTypeWrapper<LoyaltyProgramVersionPublishPayload>;
  LoyaltyProgramVersionStatus: LoyaltyProgramVersionStatus;
  LoyaltyProgramWhereInput: LoyaltyProgramWhereInput;
  LoyaltyQuery: ResolverTypeWrapper<Omit<LoyaltyQuery, 'node' | 'nodes'> & { node?: Maybe<ResolversTypes['Node']>, nodes: Array<Maybe<ResolversTypes['Node']>> }>;
  LoyaltyRefundPolicy: LoyaltyRefundPolicy;
  LoyaltyReservation: ResolverTypeWrapper<LoyaltyReservation>;
  LoyaltyReservationConnection: ResolverTypeWrapper<LoyaltyReservationConnection>;
  LoyaltyReservationEdge: ResolverTypeWrapper<LoyaltyReservationEdge>;
  LoyaltyReservationEvent: ResolverTypeWrapper<LoyaltyReservationEvent>;
  LoyaltyReservationEventType: LoyaltyReservationEventType;
  LoyaltyReservationReleaseInput: LoyaltyReservationReleaseInput;
  LoyaltyReservationReleasePayload: ResolverTypeWrapper<LoyaltyReservationReleasePayload>;
  LoyaltyReservationStatus: LoyaltyReservationStatus;
  LoyaltyReservationWhereInput: LoyaltyReservationWhereInput;
  LoyaltyRestoredPointsExpiryPolicy: LoyaltyRestoredPointsExpiryPolicy;
  LoyaltyRewardDefinition: ResolverTypeWrapper<LoyaltyRewardDefinition>;
  LoyaltyRewardDefinitionInput: LoyaltyRewardDefinitionInput;
  LoyaltyRewardType: LoyaltyRewardType;
  LoyaltyRoundingMode: LoyaltyRoundingMode;
  LoyaltySegmentMatchMode: LoyaltySegmentMatchMode;
  LoyaltyTier: ResolverTypeWrapper<LoyaltyTier>;
  LoyaltyTierCalendarPeriod: LoyaltyTierCalendarPeriod;
  LoyaltyTierDowngradePolicy: LoyaltyTierDowngradePolicy;
  LoyaltyTierEvaluationWindowType: LoyaltyTierEvaluationWindowType;
  LoyaltyTierInput: LoyaltyTierInput;
  LoyaltyTierMembership: ResolverTypeWrapper<LoyaltyTierMembership>;
  LoyaltyTierMembershipEvent: ResolverTypeWrapper<LoyaltyTierMembershipEvent>;
  LoyaltyTierMembershipEventType: LoyaltyTierMembershipEventType;
  LoyaltyTierMembershipStatus: LoyaltyTierMembershipStatus;
  LoyaltyTierPolicy: ResolverTypeWrapper<LoyaltyTierPolicy>;
  LoyaltyTierPolicyInput: LoyaltyTierPolicyInput;
  LoyaltyTierRequalificationPolicy: LoyaltyTierRequalificationPolicy;
  LoyaltyTransaction: ResolverTypeWrapper<LoyaltyTransaction>;
  LoyaltyTransactionConnection: ResolverTypeWrapper<LoyaltyTransactionConnection>;
  LoyaltyTransactionEdge: ResolverTypeWrapper<LoyaltyTransactionEdge>;
  LoyaltyTransactionKind: LoyaltyTransactionKind;
  LoyaltyTransactionSource: LoyaltyTransactionSource;
  LoyaltyTransactionWhereInput: LoyaltyTransactionWhereInput;
  LoyaltyUserError: ResolverTypeWrapper<LoyaltyUserError>;
  Mutation: ResolverTypeWrapper<{}>;
  Node: ResolverTypeWrapper<ResolversInterfaceTypes<ResolversTypes>['Node']>;
  PageInfo: ResolverTypeWrapper<PageInfo>;
  PriceAdjustmentOperation: PriceAdjustmentOperation;
  PriceAdjustmentValueType: PriceAdjustmentValueType;
  Query: ResolverTypeWrapper<{}>;
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
  LoyaltyAccountConnection: LoyaltyAccountConnection;
  LoyaltyAccountEdge: LoyaltyAccountEdge;
  LoyaltyAccountStatusUpdateInput: LoyaltyAccountStatusUpdateInput;
  LoyaltyAccountStatusUpdatePayload: LoyaltyAccountStatusUpdatePayload;
  LoyaltyAccountWhereInput: LoyaltyAccountWhereInput;
  Boolean: Scalars['Boolean']['output'];
  LoyaltyCatalogSelector: LoyaltyCatalogSelector;
  LoyaltyCatalogSelectorInput: LoyaltyCatalogSelectorInput;
  LoyaltyEarningModifier: LoyaltyEarningModifier;
  LoyaltyEarningModifierInput: LoyaltyEarningModifierInput;
  LoyaltyEarningRule: LoyaltyEarningRule;
  LoyaltyEarningRuleInput: LoyaltyEarningRuleInput;
  LoyaltyExpiringPoints: LoyaltyExpiringPoints;
  LoyaltyLedgerEntry: LoyaltyLedgerEntry;
  LoyaltyLotAllocation: LoyaltyLotAllocation;
  LoyaltyMoney: LoyaltyMoney;
  LoyaltyMutation: LoyaltyMutation;
  LoyaltyPointLot: LoyaltyPointLot;
  LoyaltyPointsAdjustInput: LoyaltyPointsAdjustInput;
  LoyaltyPointsAdjustPayload: LoyaltyPointsAdjustPayload;
  LoyaltyProgram: LoyaltyProgram;
  LoyaltyProgramConnection: LoyaltyProgramConnection;
  LoyaltyProgramCreateInput: LoyaltyProgramCreateInput;
  LoyaltyProgramCreatePayload: LoyaltyProgramCreatePayload;
  LoyaltyProgramEarningRules: LoyaltyProgramEarningRules;
  LoyaltyProgramEarningRulesInput: LoyaltyProgramEarningRulesInput;
  LoyaltyProgramEdge: LoyaltyProgramEdge;
  LoyaltyProgramEligibility: LoyaltyProgramEligibility;
  LoyaltyProgramEligibilityInput: LoyaltyProgramEligibilityInput;
  LoyaltyProgramRules: LoyaltyProgramRules;
  LoyaltyProgramRulesInput: LoyaltyProgramRulesInput;
  LoyaltyProgramUpdateInput: LoyaltyProgramUpdateInput;
  LoyaltyProgramUpdatePayload: LoyaltyProgramUpdatePayload;
  LoyaltyProgramVersion: LoyaltyProgramVersion;
  LoyaltyProgramVersionCreateInput: LoyaltyProgramVersionCreateInput;
  LoyaltyProgramVersionCreatePayload: LoyaltyProgramVersionCreatePayload;
  LoyaltyProgramVersionPublishInput: LoyaltyProgramVersionPublishInput;
  LoyaltyProgramVersionPublishPayload: LoyaltyProgramVersionPublishPayload;
  LoyaltyProgramWhereInput: LoyaltyProgramWhereInput;
  LoyaltyQuery: Omit<LoyaltyQuery, 'node' | 'nodes'> & { node?: Maybe<ResolversParentTypes['Node']>, nodes: Array<Maybe<ResolversParentTypes['Node']>> };
  LoyaltyReservation: LoyaltyReservation;
  LoyaltyReservationConnection: LoyaltyReservationConnection;
  LoyaltyReservationEdge: LoyaltyReservationEdge;
  LoyaltyReservationEvent: LoyaltyReservationEvent;
  LoyaltyReservationReleaseInput: LoyaltyReservationReleaseInput;
  LoyaltyReservationReleasePayload: LoyaltyReservationReleasePayload;
  LoyaltyReservationWhereInput: LoyaltyReservationWhereInput;
  LoyaltyRewardDefinition: LoyaltyRewardDefinition;
  LoyaltyRewardDefinitionInput: LoyaltyRewardDefinitionInput;
  LoyaltyTier: LoyaltyTier;
  LoyaltyTierInput: LoyaltyTierInput;
  LoyaltyTierMembership: LoyaltyTierMembership;
  LoyaltyTierMembershipEvent: LoyaltyTierMembershipEvent;
  LoyaltyTierPolicy: LoyaltyTierPolicy;
  LoyaltyTierPolicyInput: LoyaltyTierPolicyInput;
  LoyaltyTransaction: LoyaltyTransaction;
  LoyaltyTransactionConnection: LoyaltyTransactionConnection;
  LoyaltyTransactionEdge: LoyaltyTransactionEdge;
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
  openedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  program?: Resolver<ResolversTypes['LoyaltyProgram'], ParentType, ContextType>;
  revision?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  status?: Resolver<ResolversTypes['LoyaltyAccountStatus'], ParentType, ContextType>;
  suspendedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  suspendedReason?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  tierMembership?: Resolver<Maybe<ResolversTypes['LoyaltyTierMembership']>, ParentType, ContextType>;
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
  revision?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
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

export type LoyaltyCatalogSelectorResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['LoyaltyCatalogSelector'] = ResolversParentTypes['LoyaltyCatalogSelector']> = ResolversObject<{
  ids?: Resolver<Array<ResolversTypes['ID']>, ParentType, ContextType>;
  type?: Resolver<ResolversTypes['LoyaltyCatalogSelectorType'], ParentType, ContextType>;
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

export type LoyaltyMoneyResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['LoyaltyMoney'] = ResolversParentTypes['LoyaltyMoney']> = ResolversObject<{
  amountMinor?: Resolver<ResolversTypes['BigInt'], ParentType, ContextType>;
  currencyCode?: Resolver<ResolversTypes['CurrencyCode'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type LoyaltyMutationResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['LoyaltyMutation'] = ResolversParentTypes['LoyaltyMutation']> = ResolversObject<{
  accountStatusUpdate?: Resolver<ResolversTypes['LoyaltyAccountStatusUpdatePayload'], ParentType, ContextType, RequireFields<LoyaltyMutationAccountStatusUpdateArgs, 'input'>>;
  pointsAdjust?: Resolver<ResolversTypes['LoyaltyPointsAdjustPayload'], ParentType, ContextType, RequireFields<LoyaltyMutationPointsAdjustArgs, 'input'>>;
  programCreate?: Resolver<ResolversTypes['LoyaltyProgramCreatePayload'], ParentType, ContextType, RequireFields<LoyaltyMutationProgramCreateArgs, 'input'>>;
  programUpdate?: Resolver<ResolversTypes['LoyaltyProgramUpdatePayload'], ParentType, ContextType, RequireFields<LoyaltyMutationProgramUpdateArgs, 'input'>>;
  programVersionCreate?: Resolver<ResolversTypes['LoyaltyProgramVersionCreatePayload'], ParentType, ContextType, RequireFields<LoyaltyMutationProgramVersionCreateArgs, 'input'>>;
  programVersionPublish?: Resolver<ResolversTypes['LoyaltyProgramVersionPublishPayload'], ParentType, ContextType, RequireFields<LoyaltyMutationProgramVersionPublishArgs, 'input'>>;
  reservationRelease?: Resolver<ResolversTypes['LoyaltyReservationReleasePayload'], ParentType, ContextType, RequireFields<LoyaltyMutationReservationReleaseArgs, 'input'>>;
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
  revision?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
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
  refundPolicy?: Resolver<ResolversTypes['LoyaltyRefundPolicy'], ParentType, ContextType>;
  restoredPointsExpiryPolicy?: Resolver<ResolversTypes['LoyaltyRestoredPointsExpiryPolicy'], ParentType, ContextType>;
  revision?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
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

export type LoyaltyProgramVersionPublishPayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['LoyaltyProgramVersionPublishPayload'] = ResolversParentTypes['LoyaltyProgramVersionPublishPayload']> = ResolversObject<{
  programVersion?: Resolver<Maybe<ResolversTypes['LoyaltyProgramVersion']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['LoyaltyUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type LoyaltyQueryResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['LoyaltyQuery'] = ResolversParentTypes['LoyaltyQuery']> = ResolversObject<{
  account?: Resolver<Maybe<ResolversTypes['LoyaltyAccount']>, ParentType, ContextType, RequireFields<LoyaltyQueryAccountArgs, 'id'>>;
  accounts?: Resolver<ResolversTypes['LoyaltyAccountConnection'], ParentType, ContextType, Partial<LoyaltyQueryAccountsArgs>>;
  customerAccount?: Resolver<Maybe<ResolversTypes['LoyaltyAccount']>, ParentType, ContextType, RequireFields<LoyaltyQueryCustomerAccountArgs, 'customerId'>>;
  node?: Resolver<Maybe<ResolversTypes['Node']>, ParentType, ContextType, RequireFields<LoyaltyQueryNodeArgs, 'id'>>;
  nodes?: Resolver<Array<Maybe<ResolversTypes['Node']>>, ParentType, ContextType, RequireFields<LoyaltyQueryNodesArgs, 'ids'>>;
  program?: Resolver<Maybe<ResolversTypes['LoyaltyProgram']>, ParentType, ContextType, RequireFields<LoyaltyQueryProgramArgs, 'id'>>;
  programs?: Resolver<ResolversTypes['LoyaltyProgramConnection'], ParentType, ContextType, Partial<LoyaltyQueryProgramsArgs>>;
  reservation?: Resolver<Maybe<ResolversTypes['LoyaltyReservation']>, ParentType, ContextType, RequireFields<LoyaltyQueryReservationArgs, 'id'>>;
  reservations?: Resolver<ResolversTypes['LoyaltyReservationConnection'], ParentType, ContextType, Partial<LoyaltyQueryReservationsArgs>>;
  transaction?: Resolver<Maybe<ResolversTypes['LoyaltyTransaction']>, ParentType, ContextType, RequireFields<LoyaltyQueryTransactionArgs, 'id'>>;
  transactions?: Resolver<ResolversTypes['LoyaltyTransactionConnection'], ParentType, ContextType, Partial<LoyaltyQueryTransactionsArgs>>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type LoyaltyReservationResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['LoyaltyReservation'] = ResolversParentTypes['LoyaltyReservation']> = ResolversObject<{
  __resolveReference?: ReferenceResolver<Maybe<ResolversTypes['LoyaltyReservation']>, { __typename: 'LoyaltyReservation' } & GraphQLRecursivePick<ParentType, {"id":true}>, ContextType>;
  account?: Resolver<ResolversTypes['LoyaltyAccount'], ParentType, ContextType>;
  checkoutId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  checkoutVersion?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  committedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  discount?: Resolver<ResolversTypes['LoyaltyMoney'], ParentType, ContextType>;
  events?: Resolver<Array<ResolversTypes['LoyaltyReservationEvent']>, ParentType, ContextType>;
  expiredAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  expiresAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  idempotencyKey?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
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
  revision?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
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
  idempotencyKey?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  metadata?: Resolver<ResolversTypes['JSON'], ParentType, ContextType>;
  occurredAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  previousStatus?: Resolver<Maybe<ResolversTypes['LoyaltyReservationStatus']>, ParentType, ContextType>;
  reasonCode?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  reservation?: Resolver<ResolversTypes['LoyaltyReservation'], ParentType, ContextType>;
  status?: Resolver<ResolversTypes['LoyaltyReservationStatus'], ParentType, ContextType>;
  transaction?: Resolver<ResolversTypes['LoyaltyTransaction'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type LoyaltyReservationReleasePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['LoyaltyReservationReleasePayload'] = ResolversParentTypes['LoyaltyReservationReleasePayload']> = ResolversObject<{
  reservation?: Resolver<Maybe<ResolversTypes['LoyaltyReservation']>, ParentType, ContextType>;
  transaction?: Resolver<Maybe<ResolversTypes['LoyaltyTransaction']>, ParentType, ContextType>;
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
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  perAccountLimit?: Resolver<Maybe<ResolversTypes['BigInt']>, ParentType, ContextType>;
  programVersion?: Resolver<ResolversTypes['LoyaltyProgramVersion'], ParentType, ContextType>;
  rewardType?: Resolver<ResolversTypes['LoyaltyRewardType'], ParentType, ContextType>;
  startsAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  validityDays?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
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
  revision?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  status?: Resolver<ResolversTypes['LoyaltyTierMembershipStatus'], ParentType, ContextType>;
  tier?: Resolver<ResolversTypes['LoyaltyTier'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
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
  idempotencyKey?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
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
  __resolveType: TypeResolveFn<'Customer' | 'LoyaltyAccount' | 'LoyaltyEarningRule' | 'LoyaltyLedgerEntry' | 'LoyaltyLotAllocation' | 'LoyaltyPointLot' | 'LoyaltyProgram' | 'LoyaltyProgramVersion' | 'LoyaltyReservation' | 'LoyaltyReservationEvent' | 'LoyaltyRewardDefinition' | 'LoyaltyTier' | 'LoyaltyTierMembership' | 'LoyaltyTierMembershipEvent' | 'LoyaltyTierPolicy' | 'LoyaltyTransaction', ParentType, ContextType>;
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
  LoyaltyAccountConnection?: LoyaltyAccountConnectionResolvers<ContextType>;
  LoyaltyAccountEdge?: LoyaltyAccountEdgeResolvers<ContextType>;
  LoyaltyAccountStatusUpdatePayload?: LoyaltyAccountStatusUpdatePayloadResolvers<ContextType>;
  LoyaltyCatalogSelector?: LoyaltyCatalogSelectorResolvers<ContextType>;
  LoyaltyEarningModifier?: LoyaltyEarningModifierResolvers<ContextType>;
  LoyaltyEarningRule?: LoyaltyEarningRuleResolvers<ContextType>;
  LoyaltyExpiringPoints?: LoyaltyExpiringPointsResolvers<ContextType>;
  LoyaltyLedgerEntry?: LoyaltyLedgerEntryResolvers<ContextType>;
  LoyaltyLotAllocation?: LoyaltyLotAllocationResolvers<ContextType>;
  LoyaltyMoney?: LoyaltyMoneyResolvers<ContextType>;
  LoyaltyMutation?: LoyaltyMutationResolvers<ContextType>;
  LoyaltyPointLot?: LoyaltyPointLotResolvers<ContextType>;
  LoyaltyPointsAdjustPayload?: LoyaltyPointsAdjustPayloadResolvers<ContextType>;
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
  LoyaltyProgramVersionPublishPayload?: LoyaltyProgramVersionPublishPayloadResolvers<ContextType>;
  LoyaltyQuery?: LoyaltyQueryResolvers<ContextType>;
  LoyaltyReservation?: LoyaltyReservationResolvers<ContextType>;
  LoyaltyReservationConnection?: LoyaltyReservationConnectionResolvers<ContextType>;
  LoyaltyReservationEdge?: LoyaltyReservationEdgeResolvers<ContextType>;
  LoyaltyReservationEvent?: LoyaltyReservationEventResolvers<ContextType>;
  LoyaltyReservationReleasePayload?: LoyaltyReservationReleasePayloadResolvers<ContextType>;
  LoyaltyRewardDefinition?: LoyaltyRewardDefinitionResolvers<ContextType>;
  LoyaltyTier?: LoyaltyTierResolvers<ContextType>;
  LoyaltyTierMembership?: LoyaltyTierMembershipResolvers<ContextType>;
  LoyaltyTierMembershipEvent?: LoyaltyTierMembershipEventResolvers<ContextType>;
  LoyaltyTierPolicy?: LoyaltyTierPolicyResolvers<ContextType>;
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

