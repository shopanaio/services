import { GraphQLResolveInfo, GraphQLScalarType, GraphQLScalarTypeConfig } from 'graphql';
import { ServiceContext } from '../../../context/types.js';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
export type RequireFields<T, K extends keyof T> = Omit<T, K> & { [P in K]-?: NonNullable<T[P]> };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
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

export type GenericUserError = UserError & {
  __typename?: 'GenericUserError';
  code: Maybe<Scalars['String']['output']>;
  field: Maybe<Array<Scalars['String']['output']>>;
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
  notificationsMutation: NotificationsMutation;
};

export enum NotificationAudience {
  Customer = 'CUSTOMER',
  Staff = 'STAFF'
}

export enum NotificationChannel {
  Email = 'EMAIL',
  Sms = 'SMS',
  Webhook = 'WEBHOOK'
}

export type NotificationChannelSetEnabledPayload = {
  __typename?: 'NotificationChannelSetEnabledPayload';
  setting: Maybe<NotificationChannelSetting>;
  userErrors: Array<GenericUserError>;
};

export type NotificationChannelSetting = {
  __typename?: 'NotificationChannelSetting';
  channel: NotificationChannel;
  definitionKey: Scalars['String']['output'];
  enabled: Scalars['Boolean']['output'];
  replyTo: Maybe<Scalars['String']['output']>;
  senderEmail: Maybe<Scalars['String']['output']>;
  senderName: Maybe<Scalars['String']['output']>;
  updatedAt: Maybe<Scalars['DateTime']['output']>;
  version: Scalars['Int']['output'];
};

export type NotificationChannelSettingInput = {
  channel: NotificationChannel;
  enabled: Scalars['Boolean']['input'];
  expectedVersion: Scalars['Int']['input'];
  key: Scalars['String']['input'];
  replyTo?: InputMaybe<Scalars['String']['input']>;
  senderEmail?: InputMaybe<Scalars['String']['input']>;
  senderName?: InputMaybe<Scalars['String']['input']>;
};

export type NotificationDefinition = {
  __typename?: 'NotificationDefinition';
  activeChannels: Array<NotificationChannel>;
  allowedChannels: Array<NotificationChannel>;
  audience: NotificationAudience;
  defaultChannels: Array<NotificationChannel>;
  enabled: Scalars['Boolean']['output'];
  key: Scalars['String']['output'];
  optional: Scalars['Boolean']['output'];
  title: Scalars['String']['output'];
  variables: Array<NotificationTemplateVariable>;
  version: Scalars['Int']['output'];
};

export type NotificationDefinitionSetEnabledInput = {
  enabled: Scalars['Boolean']['input'];
  expectedVersion: Scalars['Int']['input'];
  key: Scalars['String']['input'];
};

export type NotificationDefinitionSetEnabledPayload = {
  __typename?: 'NotificationDefinitionSetEnabledPayload';
  setting: Maybe<NotificationDefinitionSetting>;
  userErrors: Array<GenericUserError>;
};

export type NotificationDefinitionSetting = {
  __typename?: 'NotificationDefinitionSetting';
  definitionKey: Scalars['String']['output'];
  enabled: Scalars['Boolean']['output'];
  updatedAt: Scalars['DateTime']['output'];
  version: Scalars['Int']['output'];
};

export type NotificationEffectiveTemplate = {
  __typename?: 'NotificationEffectiveTemplate';
  bodyTemplate: Scalars['String']['output'];
  channel: NotificationChannel;
  key: Scalars['String']['output'];
  locale: Scalars['String']['output'];
  plainTextTemplate: Maybe<Scalars['String']['output']>;
  pointerVersion: Maybe<Scalars['Int']['output']>;
  revision: Maybe<Scalars['Int']['output']>;
  revisionId: Maybe<Scalars['ID']['output']>;
  source: Scalars['String']['output'];
  sourceVersion: Maybe<Scalars['String']['output']>;
  subjectTemplate: Maybe<Scalars['String']['output']>;
};

export type NotificationPreview = {
  __typename?: 'NotificationPreview';
  html: Maybe<Scalars['String']['output']>;
  locale: Scalars['String']['output'];
  sms: Maybe<NotificationSmsMetrics>;
  subject: Maybe<Scalars['String']['output']>;
  text: Scalars['String']['output'];
  warnings: Array<Scalars['String']['output']>;
};

export type NotificationPreviewInput = {
  bodyTemplate?: InputMaybe<Scalars['String']['input']>;
  channel: NotificationChannel;
  data: Scalars['JSON']['input'];
  key: Scalars['String']['input'];
  locale?: InputMaybe<Scalars['String']['input']>;
  plainTextTemplate?: InputMaybe<Scalars['String']['input']>;
  subjectTemplate?: InputMaybe<Scalars['String']['input']>;
};

export type NotificationPreviewPayload = {
  __typename?: 'NotificationPreviewPayload';
  preview: Maybe<NotificationPreview>;
  userErrors: Array<GenericUserError>;
};

export type NotificationSendTestPayload = {
  __typename?: 'NotificationSendTestPayload';
  userErrors: Array<GenericUserError>;
  workflow: Maybe<NotificationWorkflowPayload>;
};

export type NotificationSmsMetrics = {
  __typename?: 'NotificationSmsMetrics';
  encoding: Scalars['String']['output'];
  length: Scalars['Int']['output'];
  segmentCount: Scalars['Int']['output'];
};

export type NotificationTemplateUpdateInput = {
  bodyTemplate: Scalars['String']['input'];
  channel: NotificationChannel;
  expectedVersion: Scalars['Int']['input'];
  key: Scalars['String']['input'];
  locale: Scalars['String']['input'];
  plainTextTemplate?: InputMaybe<Scalars['String']['input']>;
  subjectTemplate?: InputMaybe<Scalars['String']['input']>;
};

export type NotificationTemplateUpdatePayload = {
  __typename?: 'NotificationTemplateUpdatePayload';
  template: Maybe<NotificationEffectiveTemplate>;
  userErrors: Array<GenericUserError>;
};

export type NotificationTemplateVariable = {
  __typename?: 'NotificationTemplateVariable';
  children: Maybe<Array<NotificationTemplateVariable>>;
  description: Scalars['String']['output'];
  path: Scalars['String']['output'];
  required: Scalars['Boolean']['output'];
  type: Scalars['String']['output'];
};

export type NotificationTestMessageInput = {
  channel: NotificationChannel;
  customerId?: InputMaybe<Scalars['ID']['input']>;
  data: Scalars['JSON']['input'];
  email?: InputMaybe<Scalars['String']['input']>;
  idempotencyKey: Scalars['String']['input'];
  key: Scalars['String']['input'];
  locale?: InputMaybe<Scalars['String']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  phone?: InputMaybe<Scalars['String']['input']>;
  recipientId?: InputMaybe<Scalars['ID']['input']>;
  userId?: InputMaybe<Scalars['ID']['input']>;
};

export enum NotificationWebhookApiStability {
  Deprecated = 'DEPRECATED',
  Stable = 'STABLE',
  Unstable = 'UNSTABLE'
}

export type NotificationWebhookApiVersion = {
  __typename?: 'NotificationWebhookApiVersion';
  isDefault: Scalars['Boolean']['output'];
  stability: NotificationWebhookApiStability;
  version: Scalars['String']['output'];
};

export type NotificationWebhookCapabilities = {
  __typename?: 'NotificationWebhookCapabilities';
  apiVersions: Array<NotificationWebhookApiVersion>;
  events: Array<NotificationWebhookEvent>;
};

export type NotificationWebhookCreateInput = {
  apiVersion: Scalars['String']['input'];
  eventType: Scalars['String']['input'];
  format: NotificationWebhookFormat;
  url: Scalars['String']['input'];
};

export type NotificationWebhookCreatePayload = {
  __typename?: 'NotificationWebhookCreatePayload';
  userErrors: Array<GenericUserError>;
  webhook: Maybe<NotificationWebhookSubscription>;
};

export type NotificationWebhookDeleteInput = {
  id: Scalars['ID']['input'];
};

export type NotificationWebhookDeletePayload = {
  __typename?: 'NotificationWebhookDeletePayload';
  deletedWebhookId: Maybe<Scalars['ID']['output']>;
  userErrors: Array<GenericUserError>;
};

export type NotificationWebhookEvent = {
  __typename?: 'NotificationWebhookEvent';
  eventType: Scalars['String']['output'];
  title: Scalars['String']['output'];
};

export enum NotificationWebhookFormat {
  Json = 'JSON',
  Xml = 'XML'
}

export type NotificationWebhookSecretPayload = {
  __typename?: 'NotificationWebhookSecretPayload';
  secret: Maybe<Scalars['String']['output']>;
  userErrors: Array<GenericUserError>;
};

export enum NotificationWebhookStatus {
  Active = 'ACTIVE',
  Disabled = 'DISABLED'
}

export type NotificationWebhookSubscription = {
  __typename?: 'NotificationWebhookSubscription';
  apiVersion: Scalars['String']['output'];
  createdAt: Scalars['DateTime']['output'];
  eventType: Scalars['String']['output'];
  format: NotificationWebhookFormat;
  id: Scalars['ID']['output'];
  status: NotificationWebhookStatus;
  updatedAt: Scalars['DateTime']['output'];
  url: Scalars['String']['output'];
  version: Scalars['Int']['output'];
};

export type NotificationWebhookUpdateInput = {
  apiVersion?: InputMaybe<Scalars['String']['input']>;
  eventType?: InputMaybe<Scalars['String']['input']>;
  expectedVersion: Scalars['Int']['input'];
  format?: InputMaybe<NotificationWebhookFormat>;
  id: Scalars['ID']['input'];
  status?: InputMaybe<NotificationWebhookStatus>;
  url?: InputMaybe<Scalars['String']['input']>;
};

export type NotificationWebhookUpdatePayload = {
  __typename?: 'NotificationWebhookUpdatePayload';
  userErrors: Array<GenericUserError>;
  webhook: Maybe<NotificationWebhookSubscription>;
};

export type NotificationWorkflowPayload = {
  __typename?: 'NotificationWorkflowPayload';
  accepted: Scalars['Boolean']['output'];
  workflowId: Scalars['String']['output'];
};

export type NotificationsMutation = {
  __typename?: 'NotificationsMutation';
  createWebhook: NotificationWebhookCreatePayload;
  deleteStaffRecipient: StaffRecipientDeletePayload;
  deleteWebhook: NotificationWebhookDeletePayload;
  preview: NotificationPreviewPayload;
  revealWebhookSecret: NotificationWebhookSecretPayload;
  sendTest: NotificationSendTestPayload;
  setChannelEnabled: NotificationChannelSetEnabledPayload;
  setDefinitionEnabled: NotificationDefinitionSetEnabledPayload;
  updateTemplate: NotificationTemplateUpdatePayload;
  updateWebhook: NotificationWebhookUpdatePayload;
  upsertStaffRecipient: StaffRecipientUpsertPayload;
};


export type NotificationsMutationCreateWebhookArgs = {
  input: NotificationWebhookCreateInput;
};


export type NotificationsMutationDeleteStaffRecipientArgs = {
  input: StaffRecipientDeleteInput;
};


export type NotificationsMutationDeleteWebhookArgs = {
  input: NotificationWebhookDeleteInput;
};


export type NotificationsMutationPreviewArgs = {
  input: NotificationPreviewInput;
};


export type NotificationsMutationSendTestArgs = {
  input: NotificationTestMessageInput;
};


export type NotificationsMutationSetChannelEnabledArgs = {
  input: NotificationChannelSettingInput;
};


export type NotificationsMutationSetDefinitionEnabledArgs = {
  input: NotificationDefinitionSetEnabledInput;
};


export type NotificationsMutationUpdateTemplateArgs = {
  input: NotificationTemplateUpdateInput;
};


export type NotificationsMutationUpdateWebhookArgs = {
  input: NotificationWebhookUpdateInput;
};


export type NotificationsMutationUpsertStaffRecipientArgs = {
  input: StaffNotificationRecipientInput;
};

export type NotificationsQuery = {
  __typename?: 'NotificationsQuery';
  channelSettings: Array<NotificationChannelSetting>;
  definitions: Array<NotificationDefinition>;
  staffRecipients: Array<StaffNotificationRecipient>;
  template: NotificationEffectiveTemplate;
  webhookCapabilities: NotificationWebhookCapabilities;
  webhookSubscriptions: Array<NotificationWebhookSubscription>;
};


export type NotificationsQueryChannelSettingsArgs = {
  key: Scalars['String']['input'];
};


export type NotificationsQueryTemplateArgs = {
  channel: NotificationChannel;
  key: Scalars['String']['input'];
  locale: Scalars['String']['input'];
};

export type Query = {
  __typename?: 'Query';
  notificationsQuery: NotificationsQuery;
};

export type StaffNotificationRecipient = {
  __typename?: 'StaffNotificationRecipient';
  createdAt: Scalars['DateTime']['output'];
  email: Scalars['String']['output'];
  enabled: Scalars['Boolean']['output'];
  eventKeys: Array<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  locale: Scalars['String']['output'];
  name: Scalars['String']['output'];
  scope: Scalars['String']['output'];
  timezone: Scalars['String']['output'];
  updatedAt: Scalars['DateTime']['output'];
  userId: Maybe<Scalars['ID']['output']>;
};

export type StaffNotificationRecipientInput = {
  email: Scalars['String']['input'];
  enabled: Scalars['Boolean']['input'];
  eventKeys: Array<Scalars['String']['input']>;
  id?: InputMaybe<Scalars['ID']['input']>;
  locale: Scalars['String']['input'];
  name: Scalars['String']['input'];
  timezone: Scalars['String']['input'];
  userId?: InputMaybe<Scalars['ID']['input']>;
};

export type StaffRecipientDeleteInput = {
  id: Scalars['ID']['input'];
};

export type StaffRecipientDeletePayload = {
  __typename?: 'StaffRecipientDeletePayload';
  deletedStaffRecipientId: Maybe<Scalars['ID']['output']>;
  userErrors: Array<GenericUserError>;
};

export type StaffRecipientUpsertPayload = {
  __typename?: 'StaffRecipientUpsertPayload';
  recipient: Maybe<StaffNotificationRecipient>;
  userErrors: Array<GenericUserError>;
};

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
  CurrencyCode: CurrencyCode;
  DateTime: ResolverTypeWrapper<Scalars['DateTime']['output']>;
  DimensionUnit: DimensionUnit;
  GenericUserError: ResolverTypeWrapper<GenericUserError>;
  String: ResolverTypeWrapper<Scalars['String']['output']>;
  JSON: ResolverTypeWrapper<Scalars['JSON']['output']>;
  LocaleCode: LocaleCode;
  Mutation: ResolverTypeWrapper<{}>;
  NotificationAudience: NotificationAudience;
  NotificationChannel: NotificationChannel;
  NotificationChannelSetEnabledPayload: ResolverTypeWrapper<NotificationChannelSetEnabledPayload>;
  NotificationChannelSetting: ResolverTypeWrapper<NotificationChannelSetting>;
  Boolean: ResolverTypeWrapper<Scalars['Boolean']['output']>;
  Int: ResolverTypeWrapper<Scalars['Int']['output']>;
  NotificationChannelSettingInput: NotificationChannelSettingInput;
  NotificationDefinition: ResolverTypeWrapper<NotificationDefinition>;
  NotificationDefinitionSetEnabledInput: NotificationDefinitionSetEnabledInput;
  NotificationDefinitionSetEnabledPayload: ResolverTypeWrapper<NotificationDefinitionSetEnabledPayload>;
  NotificationDefinitionSetting: ResolverTypeWrapper<NotificationDefinitionSetting>;
  NotificationEffectiveTemplate: ResolverTypeWrapper<NotificationEffectiveTemplate>;
  ID: ResolverTypeWrapper<Scalars['ID']['output']>;
  NotificationPreview: ResolverTypeWrapper<NotificationPreview>;
  NotificationPreviewInput: NotificationPreviewInput;
  NotificationPreviewPayload: ResolverTypeWrapper<NotificationPreviewPayload>;
  NotificationSendTestPayload: ResolverTypeWrapper<NotificationSendTestPayload>;
  NotificationSmsMetrics: ResolverTypeWrapper<NotificationSmsMetrics>;
  NotificationTemplateUpdateInput: NotificationTemplateUpdateInput;
  NotificationTemplateUpdatePayload: ResolverTypeWrapper<NotificationTemplateUpdatePayload>;
  NotificationTemplateVariable: ResolverTypeWrapper<NotificationTemplateVariable>;
  NotificationTestMessageInput: NotificationTestMessageInput;
  NotificationWebhookApiStability: NotificationWebhookApiStability;
  NotificationWebhookApiVersion: ResolverTypeWrapper<NotificationWebhookApiVersion>;
  NotificationWebhookCapabilities: ResolverTypeWrapper<NotificationWebhookCapabilities>;
  NotificationWebhookCreateInput: NotificationWebhookCreateInput;
  NotificationWebhookCreatePayload: ResolverTypeWrapper<NotificationWebhookCreatePayload>;
  NotificationWebhookDeleteInput: NotificationWebhookDeleteInput;
  NotificationWebhookDeletePayload: ResolverTypeWrapper<NotificationWebhookDeletePayload>;
  NotificationWebhookEvent: ResolverTypeWrapper<NotificationWebhookEvent>;
  NotificationWebhookFormat: NotificationWebhookFormat;
  NotificationWebhookSecretPayload: ResolverTypeWrapper<NotificationWebhookSecretPayload>;
  NotificationWebhookStatus: NotificationWebhookStatus;
  NotificationWebhookSubscription: ResolverTypeWrapper<NotificationWebhookSubscription>;
  NotificationWebhookUpdateInput: NotificationWebhookUpdateInput;
  NotificationWebhookUpdatePayload: ResolverTypeWrapper<NotificationWebhookUpdatePayload>;
  NotificationWorkflowPayload: ResolverTypeWrapper<NotificationWorkflowPayload>;
  NotificationsMutation: ResolverTypeWrapper<NotificationsMutation>;
  NotificationsQuery: ResolverTypeWrapper<NotificationsQuery>;
  Query: ResolverTypeWrapper<{}>;
  StaffNotificationRecipient: ResolverTypeWrapper<StaffNotificationRecipient>;
  StaffNotificationRecipientInput: StaffNotificationRecipientInput;
  StaffRecipientDeleteInput: StaffRecipientDeleteInput;
  StaffRecipientDeletePayload: ResolverTypeWrapper<StaffRecipientDeletePayload>;
  StaffRecipientUpsertPayload: ResolverTypeWrapper<StaffRecipientUpsertPayload>;
  UserError: ResolverTypeWrapper<ResolversInterfaceTypes<ResolversTypes>['UserError']>;
  WeightUnit: WeightUnit;
}>;

/** Mapping between all available schema types and the resolvers parents */
export type ResolversParentTypes = ResolversObject<{
  DateTime: Scalars['DateTime']['output'];
  GenericUserError: GenericUserError;
  String: Scalars['String']['output'];
  JSON: Scalars['JSON']['output'];
  Mutation: {};
  NotificationChannelSetEnabledPayload: NotificationChannelSetEnabledPayload;
  NotificationChannelSetting: NotificationChannelSetting;
  Boolean: Scalars['Boolean']['output'];
  Int: Scalars['Int']['output'];
  NotificationChannelSettingInput: NotificationChannelSettingInput;
  NotificationDefinition: NotificationDefinition;
  NotificationDefinitionSetEnabledInput: NotificationDefinitionSetEnabledInput;
  NotificationDefinitionSetEnabledPayload: NotificationDefinitionSetEnabledPayload;
  NotificationDefinitionSetting: NotificationDefinitionSetting;
  NotificationEffectiveTemplate: NotificationEffectiveTemplate;
  ID: Scalars['ID']['output'];
  NotificationPreview: NotificationPreview;
  NotificationPreviewInput: NotificationPreviewInput;
  NotificationPreviewPayload: NotificationPreviewPayload;
  NotificationSendTestPayload: NotificationSendTestPayload;
  NotificationSmsMetrics: NotificationSmsMetrics;
  NotificationTemplateUpdateInput: NotificationTemplateUpdateInput;
  NotificationTemplateUpdatePayload: NotificationTemplateUpdatePayload;
  NotificationTemplateVariable: NotificationTemplateVariable;
  NotificationTestMessageInput: NotificationTestMessageInput;
  NotificationWebhookApiVersion: NotificationWebhookApiVersion;
  NotificationWebhookCapabilities: NotificationWebhookCapabilities;
  NotificationWebhookCreateInput: NotificationWebhookCreateInput;
  NotificationWebhookCreatePayload: NotificationWebhookCreatePayload;
  NotificationWebhookDeleteInput: NotificationWebhookDeleteInput;
  NotificationWebhookDeletePayload: NotificationWebhookDeletePayload;
  NotificationWebhookEvent: NotificationWebhookEvent;
  NotificationWebhookSecretPayload: NotificationWebhookSecretPayload;
  NotificationWebhookSubscription: NotificationWebhookSubscription;
  NotificationWebhookUpdateInput: NotificationWebhookUpdateInput;
  NotificationWebhookUpdatePayload: NotificationWebhookUpdatePayload;
  NotificationWorkflowPayload: NotificationWorkflowPayload;
  NotificationsMutation: NotificationsMutation;
  NotificationsQuery: NotificationsQuery;
  Query: {};
  StaffNotificationRecipient: StaffNotificationRecipient;
  StaffNotificationRecipientInput: StaffNotificationRecipientInput;
  StaffRecipientDeleteInput: StaffRecipientDeleteInput;
  StaffRecipientDeletePayload: StaffRecipientDeletePayload;
  StaffRecipientUpsertPayload: StaffRecipientUpsertPayload;
  UserError: ResolversInterfaceTypes<ResolversParentTypes>['UserError'];
}>;

export interface DateTimeScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['DateTime'], any> {
  name: 'DateTime';
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
  notificationsMutation?: Resolver<ResolversTypes['NotificationsMutation'], ParentType, ContextType>;
}>;

export type NotificationChannelSetEnabledPayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['NotificationChannelSetEnabledPayload'] = ResolversParentTypes['NotificationChannelSetEnabledPayload']> = ResolversObject<{
  setting?: Resolver<Maybe<ResolversTypes['NotificationChannelSetting']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type NotificationChannelSettingResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['NotificationChannelSetting'] = ResolversParentTypes['NotificationChannelSetting']> = ResolversObject<{
  channel?: Resolver<ResolversTypes['NotificationChannel'], ParentType, ContextType>;
  definitionKey?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  enabled?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  replyTo?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  senderEmail?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  senderName?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  updatedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  version?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type NotificationDefinitionResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['NotificationDefinition'] = ResolversParentTypes['NotificationDefinition']> = ResolversObject<{
  activeChannels?: Resolver<Array<ResolversTypes['NotificationChannel']>, ParentType, ContextType>;
  allowedChannels?: Resolver<Array<ResolversTypes['NotificationChannel']>, ParentType, ContextType>;
  audience?: Resolver<ResolversTypes['NotificationAudience'], ParentType, ContextType>;
  defaultChannels?: Resolver<Array<ResolversTypes['NotificationChannel']>, ParentType, ContextType>;
  enabled?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  key?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  optional?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  title?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  variables?: Resolver<Array<ResolversTypes['NotificationTemplateVariable']>, ParentType, ContextType>;
  version?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type NotificationDefinitionSetEnabledPayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['NotificationDefinitionSetEnabledPayload'] = ResolversParentTypes['NotificationDefinitionSetEnabledPayload']> = ResolversObject<{
  setting?: Resolver<Maybe<ResolversTypes['NotificationDefinitionSetting']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type NotificationDefinitionSettingResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['NotificationDefinitionSetting'] = ResolversParentTypes['NotificationDefinitionSetting']> = ResolversObject<{
  definitionKey?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  enabled?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  version?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type NotificationEffectiveTemplateResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['NotificationEffectiveTemplate'] = ResolversParentTypes['NotificationEffectiveTemplate']> = ResolversObject<{
  bodyTemplate?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  channel?: Resolver<ResolversTypes['NotificationChannel'], ParentType, ContextType>;
  key?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  locale?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  plainTextTemplate?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  pointerVersion?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  revision?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  revisionId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  source?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  sourceVersion?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  subjectTemplate?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type NotificationPreviewResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['NotificationPreview'] = ResolversParentTypes['NotificationPreview']> = ResolversObject<{
  html?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  locale?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  sms?: Resolver<Maybe<ResolversTypes['NotificationSmsMetrics']>, ParentType, ContextType>;
  subject?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  text?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  warnings?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type NotificationPreviewPayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['NotificationPreviewPayload'] = ResolversParentTypes['NotificationPreviewPayload']> = ResolversObject<{
  preview?: Resolver<Maybe<ResolversTypes['NotificationPreview']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type NotificationSendTestPayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['NotificationSendTestPayload'] = ResolversParentTypes['NotificationSendTestPayload']> = ResolversObject<{
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  workflow?: Resolver<Maybe<ResolversTypes['NotificationWorkflowPayload']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type NotificationSmsMetricsResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['NotificationSmsMetrics'] = ResolversParentTypes['NotificationSmsMetrics']> = ResolversObject<{
  encoding?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  length?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  segmentCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type NotificationTemplateUpdatePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['NotificationTemplateUpdatePayload'] = ResolversParentTypes['NotificationTemplateUpdatePayload']> = ResolversObject<{
  template?: Resolver<Maybe<ResolversTypes['NotificationEffectiveTemplate']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type NotificationTemplateVariableResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['NotificationTemplateVariable'] = ResolversParentTypes['NotificationTemplateVariable']> = ResolversObject<{
  children?: Resolver<Maybe<Array<ResolversTypes['NotificationTemplateVariable']>>, ParentType, ContextType>;
  description?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  path?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  required?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  type?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type NotificationWebhookApiVersionResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['NotificationWebhookApiVersion'] = ResolversParentTypes['NotificationWebhookApiVersion']> = ResolversObject<{
  isDefault?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  stability?: Resolver<ResolversTypes['NotificationWebhookApiStability'], ParentType, ContextType>;
  version?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type NotificationWebhookCapabilitiesResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['NotificationWebhookCapabilities'] = ResolversParentTypes['NotificationWebhookCapabilities']> = ResolversObject<{
  apiVersions?: Resolver<Array<ResolversTypes['NotificationWebhookApiVersion']>, ParentType, ContextType>;
  events?: Resolver<Array<ResolversTypes['NotificationWebhookEvent']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type NotificationWebhookCreatePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['NotificationWebhookCreatePayload'] = ResolversParentTypes['NotificationWebhookCreatePayload']> = ResolversObject<{
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  webhook?: Resolver<Maybe<ResolversTypes['NotificationWebhookSubscription']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type NotificationWebhookDeletePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['NotificationWebhookDeletePayload'] = ResolversParentTypes['NotificationWebhookDeletePayload']> = ResolversObject<{
  deletedWebhookId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type NotificationWebhookEventResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['NotificationWebhookEvent'] = ResolversParentTypes['NotificationWebhookEvent']> = ResolversObject<{
  eventType?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  title?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type NotificationWebhookSecretPayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['NotificationWebhookSecretPayload'] = ResolversParentTypes['NotificationWebhookSecretPayload']> = ResolversObject<{
  secret?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type NotificationWebhookSubscriptionResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['NotificationWebhookSubscription'] = ResolversParentTypes['NotificationWebhookSubscription']> = ResolversObject<{
  apiVersion?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  eventType?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  format?: Resolver<ResolversTypes['NotificationWebhookFormat'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  status?: Resolver<ResolversTypes['NotificationWebhookStatus'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  url?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  version?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type NotificationWebhookUpdatePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['NotificationWebhookUpdatePayload'] = ResolversParentTypes['NotificationWebhookUpdatePayload']> = ResolversObject<{
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  webhook?: Resolver<Maybe<ResolversTypes['NotificationWebhookSubscription']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type NotificationWorkflowPayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['NotificationWorkflowPayload'] = ResolversParentTypes['NotificationWorkflowPayload']> = ResolversObject<{
  accepted?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  workflowId?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type NotificationsMutationResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['NotificationsMutation'] = ResolversParentTypes['NotificationsMutation']> = ResolversObject<{
  createWebhook?: Resolver<ResolversTypes['NotificationWebhookCreatePayload'], ParentType, ContextType, RequireFields<NotificationsMutationCreateWebhookArgs, 'input'>>;
  deleteStaffRecipient?: Resolver<ResolversTypes['StaffRecipientDeletePayload'], ParentType, ContextType, RequireFields<NotificationsMutationDeleteStaffRecipientArgs, 'input'>>;
  deleteWebhook?: Resolver<ResolversTypes['NotificationWebhookDeletePayload'], ParentType, ContextType, RequireFields<NotificationsMutationDeleteWebhookArgs, 'input'>>;
  preview?: Resolver<ResolversTypes['NotificationPreviewPayload'], ParentType, ContextType, RequireFields<NotificationsMutationPreviewArgs, 'input'>>;
  revealWebhookSecret?: Resolver<ResolversTypes['NotificationWebhookSecretPayload'], ParentType, ContextType>;
  sendTest?: Resolver<ResolversTypes['NotificationSendTestPayload'], ParentType, ContextType, RequireFields<NotificationsMutationSendTestArgs, 'input'>>;
  setChannelEnabled?: Resolver<ResolversTypes['NotificationChannelSetEnabledPayload'], ParentType, ContextType, RequireFields<NotificationsMutationSetChannelEnabledArgs, 'input'>>;
  setDefinitionEnabled?: Resolver<ResolversTypes['NotificationDefinitionSetEnabledPayload'], ParentType, ContextType, RequireFields<NotificationsMutationSetDefinitionEnabledArgs, 'input'>>;
  updateTemplate?: Resolver<ResolversTypes['NotificationTemplateUpdatePayload'], ParentType, ContextType, RequireFields<NotificationsMutationUpdateTemplateArgs, 'input'>>;
  updateWebhook?: Resolver<ResolversTypes['NotificationWebhookUpdatePayload'], ParentType, ContextType, RequireFields<NotificationsMutationUpdateWebhookArgs, 'input'>>;
  upsertStaffRecipient?: Resolver<ResolversTypes['StaffRecipientUpsertPayload'], ParentType, ContextType, RequireFields<NotificationsMutationUpsertStaffRecipientArgs, 'input'>>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type NotificationsQueryResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['NotificationsQuery'] = ResolversParentTypes['NotificationsQuery']> = ResolversObject<{
  channelSettings?: Resolver<Array<ResolversTypes['NotificationChannelSetting']>, ParentType, ContextType, RequireFields<NotificationsQueryChannelSettingsArgs, 'key'>>;
  definitions?: Resolver<Array<ResolversTypes['NotificationDefinition']>, ParentType, ContextType>;
  staffRecipients?: Resolver<Array<ResolversTypes['StaffNotificationRecipient']>, ParentType, ContextType>;
  template?: Resolver<ResolversTypes['NotificationEffectiveTemplate'], ParentType, ContextType, RequireFields<NotificationsQueryTemplateArgs, 'channel' | 'key' | 'locale'>>;
  webhookCapabilities?: Resolver<ResolversTypes['NotificationWebhookCapabilities'], ParentType, ContextType>;
  webhookSubscriptions?: Resolver<Array<ResolversTypes['NotificationWebhookSubscription']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type QueryResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['Query'] = ResolversParentTypes['Query']> = ResolversObject<{
  notificationsQuery?: Resolver<ResolversTypes['NotificationsQuery'], ParentType, ContextType>;
}>;

export type StaffNotificationRecipientResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['StaffNotificationRecipient'] = ResolversParentTypes['StaffNotificationRecipient']> = ResolversObject<{
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  email?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  enabled?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  eventKeys?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  locale?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  scope?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  timezone?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  userId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type StaffRecipientDeletePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['StaffRecipientDeletePayload'] = ResolversParentTypes['StaffRecipientDeletePayload']> = ResolversObject<{
  deletedStaffRecipientId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type StaffRecipientUpsertPayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['StaffRecipientUpsertPayload'] = ResolversParentTypes['StaffRecipientUpsertPayload']> = ResolversObject<{
  recipient?: Resolver<Maybe<ResolversTypes['StaffNotificationRecipient']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type UserErrorResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['UserError'] = ResolversParentTypes['UserError']> = ResolversObject<{
  __resolveType: TypeResolveFn<'GenericUserError', ParentType, ContextType>;
  code?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  field?: Resolver<Maybe<Array<ResolversTypes['String']>>, ParentType, ContextType>;
  message?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
}>;

export type Resolvers<ContextType = ServiceContext> = ResolversObject<{
  DateTime?: GraphQLScalarType;
  GenericUserError?: GenericUserErrorResolvers<ContextType>;
  JSON?: GraphQLScalarType;
  Mutation?: MutationResolvers<ContextType>;
  NotificationChannelSetEnabledPayload?: NotificationChannelSetEnabledPayloadResolvers<ContextType>;
  NotificationChannelSetting?: NotificationChannelSettingResolvers<ContextType>;
  NotificationDefinition?: NotificationDefinitionResolvers<ContextType>;
  NotificationDefinitionSetEnabledPayload?: NotificationDefinitionSetEnabledPayloadResolvers<ContextType>;
  NotificationDefinitionSetting?: NotificationDefinitionSettingResolvers<ContextType>;
  NotificationEffectiveTemplate?: NotificationEffectiveTemplateResolvers<ContextType>;
  NotificationPreview?: NotificationPreviewResolvers<ContextType>;
  NotificationPreviewPayload?: NotificationPreviewPayloadResolvers<ContextType>;
  NotificationSendTestPayload?: NotificationSendTestPayloadResolvers<ContextType>;
  NotificationSmsMetrics?: NotificationSmsMetricsResolvers<ContextType>;
  NotificationTemplateUpdatePayload?: NotificationTemplateUpdatePayloadResolvers<ContextType>;
  NotificationTemplateVariable?: NotificationTemplateVariableResolvers<ContextType>;
  NotificationWebhookApiVersion?: NotificationWebhookApiVersionResolvers<ContextType>;
  NotificationWebhookCapabilities?: NotificationWebhookCapabilitiesResolvers<ContextType>;
  NotificationWebhookCreatePayload?: NotificationWebhookCreatePayloadResolvers<ContextType>;
  NotificationWebhookDeletePayload?: NotificationWebhookDeletePayloadResolvers<ContextType>;
  NotificationWebhookEvent?: NotificationWebhookEventResolvers<ContextType>;
  NotificationWebhookSecretPayload?: NotificationWebhookSecretPayloadResolvers<ContextType>;
  NotificationWebhookSubscription?: NotificationWebhookSubscriptionResolvers<ContextType>;
  NotificationWebhookUpdatePayload?: NotificationWebhookUpdatePayloadResolvers<ContextType>;
  NotificationWorkflowPayload?: NotificationWorkflowPayloadResolvers<ContextType>;
  NotificationsMutation?: NotificationsMutationResolvers<ContextType>;
  NotificationsQuery?: NotificationsQueryResolvers<ContextType>;
  Query?: QueryResolvers<ContextType>;
  StaffNotificationRecipient?: StaffNotificationRecipientResolvers<ContextType>;
  StaffRecipientDeletePayload?: StaffRecipientDeletePayloadResolvers<ContextType>;
  StaffRecipientUpsertPayload?: StaffRecipientUpsertPayloadResolvers<ContextType>;
  UserError?: UserErrorResolvers<ContextType>;
}>;

