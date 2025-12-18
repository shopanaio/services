import { GraphQLResolveInfo, GraphQLScalarType, GraphQLScalarTypeConfig } from 'graphql';
import { User as CasdoorUser } from 'casdoor-nodejs-sdk/lib/cjs/user';
import { ServiceContext } from '../../../context/index.js';
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
  DateTime: { input: string; output: string; }
  Email: { input: string; output: string; }
  JSON: { input: Record<string, unknown>; output: Record<string, unknown>; }
  _FieldSet: { input: any; output: any; }
};

/** Authentication tokens. */
export type AuthToken = {
  __typename?: 'AuthToken';
  /** Access token for API requests. */
  accessToken: Scalars['String']['output'];
  /** Expiration time in seconds. */
  expiresIn: Scalars['Int']['output'];
  /** Refresh token for obtaining new access tokens. */
  refreshToken: Scalars['String']['output'];
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

/** A generic user error type for mutation responses. */
export type GenericUserError = UserError & {
  __typename?: 'GenericUserError';
  code?: Maybe<Scalars['String']['output']>;
  field?: Maybe<Array<Scalars['String']['output']>>;
  message: Scalars['String']['output'];
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
  userMutation: UserMutation;
};

export type Query = {
  __typename?: 'Query';
  userQuery: UserQuery;
};

/** Role assigned to a user. */
export type Role = {
  __typename?: 'Role';
  /** Role description. */
  description?: Maybe<Scalars['String']['output']>;
  /** Human-readable display name. */
  displayName?: Maybe<Scalars['String']['output']>;
  /** Whether the role is enabled. */
  isEnabled: Scalars['Boolean']['output'];
  /** Role name/identifier. */
  name: Scalars['String']['output'];
  /** Role owner (organization). */
  owner: Scalars['String']['output'];
};

/** User type representing admin users (CMS/backoffice). */
export type User = {
  __typename?: 'User';
  /** URL to user's avatar image. */
  avatar?: Maybe<Scalars['String']['output']>;
  /** The date and time when the user was created. */
  createdAt: Scalars['DateTime']['output'];
  /** User's email address. */
  email: Scalars['Email']['output'];
  /** Whether the email has been verified. */
  emailVerified: Scalars['Boolean']['output'];
  /** User's first name. */
  firstName?: Maybe<Scalars['String']['output']>;
  /** The globally unique ID of the user. */
  id: Scalars['ID']['output'];
  /** Whether the user has admin privileges. */
  isAdmin: Scalars['Boolean']['output'];
  /** Whether the user account is deleted. */
  isDeleted: Scalars['Boolean']['output'];
  /** Whether the user account is forbidden/banned. */
  isForbidden: Scalars['Boolean']['output'];
  /** User's last name. */
  lastName?: Maybe<Scalars['String']['output']>;
  /** User's locale/language preference. */
  locale?: Maybe<LocaleCode>;
  /** User's roles. */
  roles: Array<Role>;
  /** The date and time when the user was last updated. */
  updatedAt: Scalars['DateTime']['output'];
};

/** A generic user error interface for mutation responses. */
export type UserError = {
  /** An error code for programmatic handling. */
  code?: Maybe<Scalars['String']['output']>;
  /** The path to the input field that caused the error. */
  field?: Maybe<Array<Scalars['String']['output']>>;
  /** The error message. */
  message: Scalars['String']['output'];
};

export type UserMutation = {
  __typename?: 'UserMutation';
  signIn: UserSignInPayload;
  signOut: UserSignOutPayload;
  signUp: UserSignUpPayload;
  tokenRefresh: UserTokenRefreshPayload;
  userUpdateEmail: UserUpdateEmailPayload;
  userUpdatePassword: UserUpdatePasswordPayload;
  userUpdateProfile: UserUpdateProfilePayload;
};


export type UserMutationSignInArgs = {
  input: UserSignInInput;
};


export type UserMutationSignOutArgs = {
  input: UserSignOutInput;
};


export type UserMutationSignUpArgs = {
  input: UserSignUpInput;
};


export type UserMutationTokenRefreshArgs = {
  input: UserTokenRefreshInput;
};


export type UserMutationUserUpdateEmailArgs = {
  input: UserUpdateEmailInput;
};


export type UserMutationUserUpdatePasswordArgs = {
  input: UserUpdatePasswordInput;
};


export type UserMutationUserUpdateProfileArgs = {
  input: UserUpdateProfileInput;
};

export type UserQuery = {
  __typename?: 'UserQuery';
  /** Get current authenticated admin user */
  current?: Maybe<User>;
};

/** Input for admin user authentication. */
export type UserSignInInput = {
  /** Email address. */
  email: Scalars['Email']['input'];
  /** Password. */
  password: Scalars['String']['input'];
};

/** Payload for admin user sign in. */
export type UserSignInPayload = {
  __typename?: 'UserSignInPayload';
  /** Authentication tokens. */
  token?: Maybe<AuthToken>;
  /** The authenticated user. */
  user?: Maybe<User>;
  /** List of errors that occurred during the mutation. */
  userErrors: Array<GenericUserError>;
};

/** Input for admin user sign out. */
export type UserSignOutInput = {
  /** Sign out from all sessions. */
  allSessions?: InputMaybe<Scalars['Boolean']['input']>;
};

/** Payload for admin user sign out. */
export type UserSignOutPayload = {
  __typename?: 'UserSignOutPayload';
  /** Whether sign out was successful. */
  success: Scalars['Boolean']['output'];
  /** List of errors that occurred during the mutation. */
  userErrors: Array<GenericUserError>;
};

/** Input for admin user sign up. */
export type UserSignUpInput = {
  /** Email address. */
  email: Scalars['Email']['input'];
  /** Password. */
  password: Scalars['String']['input'];
};

/** Payload for admin user sign up. */
export type UserSignUpPayload = {
  __typename?: 'UserSignUpPayload';
  /** Authentication tokens. */
  token?: Maybe<AuthToken>;
  /** The created user. */
  user?: Maybe<User>;
  /** List of errors that occurred during the mutation. */
  userErrors: Array<GenericUserError>;
};

/** Input for refreshing admin user access token. */
export type UserTokenRefreshInput = {
  /** Refresh token to use for obtaining new access token. */
  refreshToken: Scalars['String']['input'];
};

/** Payload for admin user token refresh. */
export type UserTokenRefreshPayload = {
  __typename?: 'UserTokenRefreshPayload';
  /** New authentication tokens. */
  token?: Maybe<AuthToken>;
  /** List of errors that occurred during the mutation. */
  userErrors: Array<GenericUserError>;
};

/** Input for updating user email. */
export type UserUpdateEmailInput = {
  /** New email address. */
  newEmail: Scalars['Email']['input'];
};

/** Payload for user email update. */
export type UserUpdateEmailPayload = {
  __typename?: 'UserUpdateEmailPayload';
  /** The updated user. */
  user?: Maybe<User>;
  /** List of errors that occurred during the mutation. */
  userErrors: Array<GenericUserError>;
};

/** Input for updating user password. */
export type UserUpdatePasswordInput = {
  /** Current password. */
  currentPassword: Scalars['String']['input'];
  /** New password. */
  newPassword: Scalars['String']['input'];
};

/** Payload for user password update. */
export type UserUpdatePasswordPayload = {
  __typename?: 'UserUpdatePasswordPayload';
  /** Whether the password was changed successfully. */
  success: Scalars['Boolean']['output'];
  /** List of errors that occurred during the mutation. */
  userErrors: Array<GenericUserError>;
};

/** Input for updating user profile. */
export type UserUpdateProfileInput = {
  /** User's first name. */
  firstName?: InputMaybe<Scalars['String']['input']>;
  /** User's last name. */
  lastName?: InputMaybe<Scalars['String']['input']>;
  /** User's locale/language preference. */
  locale?: InputMaybe<LocaleCode>;
};

/** Payload for user profile update. */
export type UserUpdateProfilePayload = {
  __typename?: 'UserUpdateProfilePayload';
  /** The updated user. */
  user?: Maybe<User>;
  /** List of errors that occurred during the mutation. */
  userErrors: Array<GenericUserError>;
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
  UserError: ( GenericUserError );
}>;

/** Mapping between all available schema types and the resolvers types */
export type ResolversTypes = ResolversObject<{
  AuthToken: ResolverTypeWrapper<AuthToken>;
  String: ResolverTypeWrapper<Scalars['String']['output']>;
  Int: ResolverTypeWrapper<Scalars['Int']['output']>;
  CurrencyCode: CurrencyCode;
  DateTime: ResolverTypeWrapper<Scalars['DateTime']['output']>;
  DimensionUnit: DimensionUnit;
  Email: ResolverTypeWrapper<Scalars['Email']['output']>;
  GenericUserError: ResolverTypeWrapper<GenericUserError>;
  JSON: ResolverTypeWrapper<Scalars['JSON']['output']>;
  LocaleCode: LocaleCode;
  Mutation: ResolverTypeWrapper<{}>;
  Query: ResolverTypeWrapper<{}>;
  Role: ResolverTypeWrapper<Role>;
  Boolean: ResolverTypeWrapper<Scalars['Boolean']['output']>;
  User: ResolverTypeWrapper<CasdoorUser>;
  ID: ResolverTypeWrapper<Scalars['ID']['output']>;
  UserError: ResolverTypeWrapper<ResolversInterfaceTypes<ResolversTypes>['UserError']>;
  UserMutation: ResolverTypeWrapper<Omit<UserMutation, 'signIn' | 'signUp' | 'userUpdateEmail' | 'userUpdateProfile'> & { signIn: ResolversTypes['UserSignInPayload'], signUp: ResolversTypes['UserSignUpPayload'], userUpdateEmail: ResolversTypes['UserUpdateEmailPayload'], userUpdateProfile: ResolversTypes['UserUpdateProfilePayload'] }>;
  UserQuery: ResolverTypeWrapper<Omit<UserQuery, 'current'> & { current?: Maybe<ResolversTypes['User']> }>;
  UserSignInInput: UserSignInInput;
  UserSignInPayload: ResolverTypeWrapper<Omit<UserSignInPayload, 'user'> & { user?: Maybe<ResolversTypes['User']> }>;
  UserSignOutInput: UserSignOutInput;
  UserSignOutPayload: ResolverTypeWrapper<UserSignOutPayload>;
  UserSignUpInput: UserSignUpInput;
  UserSignUpPayload: ResolverTypeWrapper<Omit<UserSignUpPayload, 'user'> & { user?: Maybe<ResolversTypes['User']> }>;
  UserTokenRefreshInput: UserTokenRefreshInput;
  UserTokenRefreshPayload: ResolverTypeWrapper<UserTokenRefreshPayload>;
  UserUpdateEmailInput: UserUpdateEmailInput;
  UserUpdateEmailPayload: ResolverTypeWrapper<Omit<UserUpdateEmailPayload, 'user'> & { user?: Maybe<ResolversTypes['User']> }>;
  UserUpdatePasswordInput: UserUpdatePasswordInput;
  UserUpdatePasswordPayload: ResolverTypeWrapper<UserUpdatePasswordPayload>;
  UserUpdateProfileInput: UserUpdateProfileInput;
  UserUpdateProfilePayload: ResolverTypeWrapper<Omit<UserUpdateProfilePayload, 'user'> & { user?: Maybe<ResolversTypes['User']> }>;
  WeightUnit: WeightUnit;
}>;

/** Mapping between all available schema types and the resolvers parents */
export type ResolversParentTypes = ResolversObject<{
  AuthToken: AuthToken;
  String: Scalars['String']['output'];
  Int: Scalars['Int']['output'];
  DateTime: Scalars['DateTime']['output'];
  Email: Scalars['Email']['output'];
  GenericUserError: GenericUserError;
  JSON: Scalars['JSON']['output'];
  Mutation: {};
  Query: {};
  Role: Role;
  Boolean: Scalars['Boolean']['output'];
  User: CasdoorUser;
  ID: Scalars['ID']['output'];
  UserError: ResolversInterfaceTypes<ResolversParentTypes>['UserError'];
  UserMutation: Omit<UserMutation, 'signIn' | 'signUp' | 'userUpdateEmail' | 'userUpdateProfile'> & { signIn: ResolversParentTypes['UserSignInPayload'], signUp: ResolversParentTypes['UserSignUpPayload'], userUpdateEmail: ResolversParentTypes['UserUpdateEmailPayload'], userUpdateProfile: ResolversParentTypes['UserUpdateProfilePayload'] };
  UserQuery: Omit<UserQuery, 'current'> & { current?: Maybe<ResolversParentTypes['User']> };
  UserSignInInput: UserSignInInput;
  UserSignInPayload: Omit<UserSignInPayload, 'user'> & { user?: Maybe<ResolversParentTypes['User']> };
  UserSignOutInput: UserSignOutInput;
  UserSignOutPayload: UserSignOutPayload;
  UserSignUpInput: UserSignUpInput;
  UserSignUpPayload: Omit<UserSignUpPayload, 'user'> & { user?: Maybe<ResolversParentTypes['User']> };
  UserTokenRefreshInput: UserTokenRefreshInput;
  UserTokenRefreshPayload: UserTokenRefreshPayload;
  UserUpdateEmailInput: UserUpdateEmailInput;
  UserUpdateEmailPayload: Omit<UserUpdateEmailPayload, 'user'> & { user?: Maybe<ResolversParentTypes['User']> };
  UserUpdatePasswordInput: UserUpdatePasswordInput;
  UserUpdatePasswordPayload: UserUpdatePasswordPayload;
  UserUpdateProfileInput: UserUpdateProfileInput;
  UserUpdateProfilePayload: Omit<UserUpdateProfilePayload, 'user'> & { user?: Maybe<ResolversParentTypes['User']> };
}>;

export type AuthTokenResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['AuthToken'] = ResolversParentTypes['AuthToken']> = ResolversObject<{
  accessToken?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  expiresIn?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  refreshToken?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export interface DateTimeScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['DateTime'], any> {
  name: 'DateTime';
}

export interface EmailScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['Email'], any> {
  name: 'Email';
}

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
  userMutation?: Resolver<ResolversTypes['UserMutation'], ParentType, ContextType>;
}>;

export type QueryResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['Query'] = ResolversParentTypes['Query']> = ResolversObject<{
  userQuery?: Resolver<ResolversTypes['UserQuery'], ParentType, ContextType>;
}>;

export type RoleResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['Role'] = ResolversParentTypes['Role']> = ResolversObject<{
  description?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  displayName?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  isEnabled?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  owner?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type UserResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['User'] = ResolversParentTypes['User']> = ResolversObject<{
  __resolveReference?: ReferenceResolver<Maybe<ResolversTypes['User']>, { __typename: 'User' } & GraphQLRecursivePick<ParentType, {"id":true}>, ContextType>;
  avatar?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  email?: Resolver<ResolversTypes['Email'], ParentType, ContextType>;
  emailVerified?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  firstName?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  isAdmin?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  isDeleted?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  isForbidden?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  lastName?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  locale?: Resolver<Maybe<ResolversTypes['LocaleCode']>, ParentType, ContextType>;
  roles?: Resolver<Array<ResolversTypes['Role']>, ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type UserErrorResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['UserError'] = ResolversParentTypes['UserError']> = ResolversObject<{
  __resolveType: TypeResolveFn<'GenericUserError', ParentType, ContextType>;
  code?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  field?: Resolver<Maybe<Array<ResolversTypes['String']>>, ParentType, ContextType>;
  message?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
}>;

export type UserMutationResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['UserMutation'] = ResolversParentTypes['UserMutation']> = ResolversObject<{
  signIn?: Resolver<ResolversTypes['UserSignInPayload'], ParentType, ContextType, RequireFields<UserMutationSignInArgs, 'input'>>;
  signOut?: Resolver<ResolversTypes['UserSignOutPayload'], ParentType, ContextType, RequireFields<UserMutationSignOutArgs, 'input'>>;
  signUp?: Resolver<ResolversTypes['UserSignUpPayload'], ParentType, ContextType, RequireFields<UserMutationSignUpArgs, 'input'>>;
  tokenRefresh?: Resolver<ResolversTypes['UserTokenRefreshPayload'], ParentType, ContextType, RequireFields<UserMutationTokenRefreshArgs, 'input'>>;
  userUpdateEmail?: Resolver<ResolversTypes['UserUpdateEmailPayload'], ParentType, ContextType, RequireFields<UserMutationUserUpdateEmailArgs, 'input'>>;
  userUpdatePassword?: Resolver<ResolversTypes['UserUpdatePasswordPayload'], ParentType, ContextType, RequireFields<UserMutationUserUpdatePasswordArgs, 'input'>>;
  userUpdateProfile?: Resolver<ResolversTypes['UserUpdateProfilePayload'], ParentType, ContextType, RequireFields<UserMutationUserUpdateProfileArgs, 'input'>>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type UserQueryResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['UserQuery'] = ResolversParentTypes['UserQuery']> = ResolversObject<{
  current?: Resolver<Maybe<ResolversTypes['User']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type UserSignInPayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['UserSignInPayload'] = ResolversParentTypes['UserSignInPayload']> = ResolversObject<{
  token?: Resolver<Maybe<ResolversTypes['AuthToken']>, ParentType, ContextType>;
  user?: Resolver<Maybe<ResolversTypes['User']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type UserSignOutPayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['UserSignOutPayload'] = ResolversParentTypes['UserSignOutPayload']> = ResolversObject<{
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type UserSignUpPayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['UserSignUpPayload'] = ResolversParentTypes['UserSignUpPayload']> = ResolversObject<{
  token?: Resolver<Maybe<ResolversTypes['AuthToken']>, ParentType, ContextType>;
  user?: Resolver<Maybe<ResolversTypes['User']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type UserTokenRefreshPayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['UserTokenRefreshPayload'] = ResolversParentTypes['UserTokenRefreshPayload']> = ResolversObject<{
  token?: Resolver<Maybe<ResolversTypes['AuthToken']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type UserUpdateEmailPayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['UserUpdateEmailPayload'] = ResolversParentTypes['UserUpdateEmailPayload']> = ResolversObject<{
  user?: Resolver<Maybe<ResolversTypes['User']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type UserUpdatePasswordPayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['UserUpdatePasswordPayload'] = ResolversParentTypes['UserUpdatePasswordPayload']> = ResolversObject<{
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type UserUpdateProfilePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['UserUpdateProfilePayload'] = ResolversParentTypes['UserUpdateProfilePayload']> = ResolversObject<{
  user?: Resolver<Maybe<ResolversTypes['User']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type Resolvers<ContextType = ServiceContext> = ResolversObject<{
  AuthToken?: AuthTokenResolvers<ContextType>;
  DateTime?: GraphQLScalarType;
  Email?: GraphQLScalarType;
  GenericUserError?: GenericUserErrorResolvers<ContextType>;
  JSON?: GraphQLScalarType;
  Mutation?: MutationResolvers<ContextType>;
  Query?: QueryResolvers<ContextType>;
  Role?: RoleResolvers<ContextType>;
  User?: UserResolvers<ContextType>;
  UserError?: UserErrorResolvers<ContextType>;
  UserMutation?: UserMutationResolvers<ContextType>;
  UserQuery?: UserQueryResolvers<ContextType>;
  UserSignInPayload?: UserSignInPayloadResolvers<ContextType>;
  UserSignOutPayload?: UserSignOutPayloadResolvers<ContextType>;
  UserSignUpPayload?: UserSignUpPayloadResolvers<ContextType>;
  UserTokenRefreshPayload?: UserTokenRefreshPayloadResolvers<ContextType>;
  UserUpdateEmailPayload?: UserUpdateEmailPayloadResolvers<ContextType>;
  UserUpdatePasswordPayload?: UserUpdatePasswordPayloadResolvers<ContextType>;
  UserUpdateProfilePayload?: UserUpdateProfilePayloadResolvers<ContextType>;
}>;

