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

export type Category = Node & {
  __typename?: 'Category';
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

export type Customer = Node & {
  __typename?: 'Customer';
  id: Scalars['ID']['output'];
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

export type File = Node & {
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
  /** Admin-only Reviews mutation namespace. */
  reviewsMutation: ReviewsMutation;
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

export type Product = Node & {
  __typename?: 'Product';
  id: Scalars['ID']['output'];
};

export type ProductQuestion = Node & ReviewContent & {
  __typename?: 'ProductQuestion';
  answerState: ProductQuestionAnswerState;
  answers: ProductQuestionAnswerConnection;
  author: ReviewContentAuthor;
  body: Scalars['String']['output'];
  createdAt: Scalars['DateTime']['output'];
  deletedAt: Maybe<Scalars['DateTime']['output']>;
  externalReferences: ReviewContentExternalReferenceConnection;
  id: Scalars['ID']['output'];
  idempotencyKey: Maybe<Scalars['String']['output']>;
  kind: ReviewContentKind;
  locale: Scalars['String']['output'];
  metrics: ReviewContentMetrics;
  moderatedAt: Maybe<Scalars['DateTime']['output']>;
  moderatedByPrincipalId: Maybe<Scalars['String']['output']>;
  moderationCases: ReviewModerationCaseConnection;
  moderationEvents: ReviewModerationEventConnection;
  moderationNote: Maybe<Scalars['String']['output']>;
  moderationSignals: ReviewModerationSignalConnection;
  product: Product;
  publications: Array<ReviewContentPublication>;
  publishedAt: Maybe<Scalars['DateTime']['output']>;
  redactedAt: Maybe<Scalars['DateTime']['output']>;
  reports: ReviewContentReportConnection;
  revision: Scalars['Int']['output'];
  revisions: ReviewContentRevisionConnection;
  sourceChannel: Scalars['String']['output'];
  sourceMetadata: Scalars['JSON']['output'];
  status: ReviewContentStatus;
  subscriptions: ProductQuestionSubscriptionConnection;
  title: Maybe<Scalars['String']['output']>;
  translations: Array<ReviewContentTranslation>;
  unpublishedAt: Maybe<Scalars['DateTime']['output']>;
  updatedAt: Scalars['DateTime']['output'];
  variant: Maybe<Variant>;
  votes: ReviewContentVoteConnection;
};


export type ProductQuestionAnswersArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  meta?: InputMaybe<ReviewContentConnectionMetaInput>;
  orderBy?: InputMaybe<Array<ProductQuestionAnswerOrderByInput>>;
  where?: InputMaybe<ProductQuestionAnswerWhereInput>;
};


export type ProductQuestionExternalReferencesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


export type ProductQuestionModerationCasesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


export type ProductQuestionModerationEventsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


export type ProductQuestionModerationSignalsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


export type ProductQuestionReportsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


export type ProductQuestionRevisionsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


export type ProductQuestionSubscriptionsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


export type ProductQuestionVotesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};

export type ProductQuestionAnswer = Node & ReviewContent & {
  __typename?: 'ProductQuestionAnswer';
  author: ReviewContentAuthor;
  body: Scalars['String']['output'];
  createdAt: Scalars['DateTime']['output'];
  deletedAt: Maybe<Scalars['DateTime']['output']>;
  externalReferences: ReviewContentExternalReferenceConnection;
  id: Scalars['ID']['output'];
  idempotencyKey: Maybe<Scalars['String']['output']>;
  isAccepted: Scalars['Boolean']['output'];
  isOfficial: Scalars['Boolean']['output'];
  kind: ReviewContentKind;
  locale: Scalars['String']['output'];
  metrics: ReviewContentMetrics;
  moderatedAt: Maybe<Scalars['DateTime']['output']>;
  moderatedByPrincipalId: Maybe<Scalars['String']['output']>;
  moderationCases: ReviewModerationCaseConnection;
  moderationEvents: ReviewModerationEventConnection;
  moderationNote: Maybe<Scalars['String']['output']>;
  moderationSignals: ReviewModerationSignalConnection;
  publications: Array<ReviewContentPublication>;
  publishedAt: Maybe<Scalars['DateTime']['output']>;
  question: ProductQuestion;
  redactedAt: Maybe<Scalars['DateTime']['output']>;
  reports: ReviewContentReportConnection;
  revision: Scalars['Int']['output'];
  revisions: ReviewContentRevisionConnection;
  sortIndex: Scalars['Int']['output'];
  sourceChannel: Scalars['String']['output'];
  sourceMetadata: Scalars['JSON']['output'];
  status: ReviewContentStatus;
  title: Maybe<Scalars['String']['output']>;
  translations: Array<ReviewContentTranslation>;
  unpublishedAt: Maybe<Scalars['DateTime']['output']>;
  updatedAt: Scalars['DateTime']['output'];
  votes: ReviewContentVoteConnection;
};


export type ProductQuestionAnswerExternalReferencesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


export type ProductQuestionAnswerModerationCasesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


export type ProductQuestionAnswerModerationEventsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


export type ProductQuestionAnswerModerationSignalsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


export type ProductQuestionAnswerReportsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


export type ProductQuestionAnswerRevisionsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


export type ProductQuestionAnswerVotesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};

export type ProductQuestionAnswerConnection = {
  __typename?: 'ProductQuestionAnswerConnection';
  edges: Array<ProductQuestionAnswerEdge>;
  pageInfo: PageInfo;
  totalCount: Scalars['Int']['output'];
};

export type ProductQuestionAnswerCreateOperationInput = {
  /** Client-provided correlation key returned in the operation result. */
  clientMutationId?: InputMaybe<Scalars['String']['input']>;
  content: ReviewContentCreateInput;
  isAccepted?: InputMaybe<Scalars['Boolean']['input']>;
  isOfficial?: InputMaybe<Scalars['Boolean']['input']>;
  sortIndex?: InputMaybe<Scalars['Int']['input']>;
};

export type ProductQuestionAnswerDeleteOperationInput = {
  answerId: Scalars['ID']['input'];
  expectedRevision: Scalars['Int']['input'];
  /** Hard deletion is reserved for explicit privacy or retention workflows. */
  permanent?: InputMaybe<Scalars['Boolean']['input']>;
};

export type ProductQuestionAnswerEdge = {
  __typename?: 'ProductQuestionAnswerEdge';
  cursor: Scalars['String']['output'];
  node: ProductQuestionAnswer;
};

/** Ordering configuration for ProductQuestionAnswer */
export type ProductQuestionAnswerOrderByInput = {
  /** Sort direction */
  direction: SortDirection;
  /** Field to order by */
  field: ProductQuestionAnswerOrderField;
};

/** Fields available for sorting ProductQuestionAnswer */
export enum ProductQuestionAnswerOrderField {
  /** Sort by authorType */
  AuthorType = 'authorType',
  /** Sort by createdAt */
  CreatedAt = 'createdAt',
  /** Sort by deletedAt */
  DeletedAt = 'deletedAt',
  /** Sort by id */
  Id = 'id',
  /** Sort by isAccepted */
  IsAccepted = 'isAccepted',
  /** Sort by isOfficial */
  IsOfficial = 'isOfficial',
  /** Sort by locale */
  Locale = 'locale',
  /** Sort by questionId */
  QuestionId = 'questionId',
  /** Sort by revision */
  Revision = 'revision',
  /** Sort by sortIndex */
  SortIndex = 'sortIndex',
  /** Sort by status */
  Status = 'status',
  /** Sort by updatedAt */
  UpdatedAt = 'updatedAt'
}

export type ProductQuestionAnswerPropertiesUpdateInput = {
  isAccepted?: InputMaybe<Scalars['Boolean']['input']>;
  isOfficial?: InputMaybe<Scalars['Boolean']['input']>;
  sortIndex?: InputMaybe<Scalars['Int']['input']>;
};

export enum ProductQuestionAnswerState {
  Answered = 'ANSWERED',
  Unanswered = 'UNANSWERED'
}

export type ProductQuestionAnswerUpdateInput = {
  /** Text, author, source, moderation, translations, and publications. */
  content?: InputMaybe<ReviewContentUpdateInput>;
  properties?: InputMaybe<ProductQuestionAnswerPropertiesUpdateInput>;
};

export type ProductQuestionAnswerUpdateOperationInput = {
  answerId: Scalars['ID']['input'];
  expectedRevision: Scalars['Int']['input'];
  operations: ProductQuestionAnswerUpdateInput;
};

/** Filter conditions for ProductQuestionAnswer */
export type ProductQuestionAnswerWhereInput = {
  /** Logical AND of multiple conditions */
  _and?: InputMaybe<Array<ProductQuestionAnswerWhereInput>>;
  /** Negate the condition */
  _not?: InputMaybe<ProductQuestionAnswerWhereInput>;
  /** Logical OR of multiple conditions */
  _or?: InputMaybe<Array<ProductQuestionAnswerWhereInput>>;
  /** Filter by authorCustomerId */
  authorCustomerId?: InputMaybe<IdFilter>;
  /** Filter by authorType */
  authorType?: InputMaybe<StringFilter>;
  /** Filter by body */
  body?: InputMaybe<StringFilter>;
  /** Filter by createdAt */
  createdAt?: InputMaybe<DateTimeFilter>;
  /** Filter by deletedAt */
  deletedAt?: InputMaybe<DateTimeFilter>;
  /** Filter by id */
  id?: InputMaybe<IdFilter>;
  /** Filter by isAccepted */
  isAccepted?: InputMaybe<BooleanFilter>;
  /** Filter by isOfficial */
  isOfficial?: InputMaybe<BooleanFilter>;
  /** Filter by locale */
  locale?: InputMaybe<StringFilter>;
  /** Filter by questionId */
  questionId?: InputMaybe<IdFilter>;
  /** Filter by revision */
  revision?: InputMaybe<IntFilter>;
  /** Filter by sortIndex */
  sortIndex?: InputMaybe<IntFilter>;
  /** Filter by status */
  status?: InputMaybe<StringFilter>;
  /** Filter by updatedAt */
  updatedAt?: InputMaybe<DateTimeFilter>;
};

export type ProductQuestionAnswersUpdateInput = {
  create?: InputMaybe<Array<ProductQuestionAnswerCreateOperationInput>>;
  delete?: InputMaybe<Array<ProductQuestionAnswerDeleteOperationInput>>;
  update?: InputMaybe<Array<ProductQuestionAnswerUpdateOperationInput>>;
};

export type ProductQuestionConnection = {
  __typename?: 'ProductQuestionConnection';
  edges: Array<ProductQuestionEdge>;
  pageInfo: PageInfo;
  totalCount: Scalars['Int']['output'];
};

export type ProductQuestionCreateInput = {
  content: ReviewContentCreateInput;
  productId: Scalars['ID']['input'];
  variantId?: InputMaybe<Scalars['ID']['input']>;
};

export type ProductQuestionCreatePayload = {
  __typename?: 'ProductQuestionCreatePayload';
  productQuestion: Maybe<ProductQuestion>;
  userErrors: Array<GenericUserError>;
};

export type ProductQuestionDeletePayload = {
  __typename?: 'ProductQuestionDeletePayload';
  deletedProductQuestionId: Maybe<Scalars['ID']['output']>;
  userErrors: Array<GenericUserError>;
};

export type ProductQuestionEdge = {
  __typename?: 'ProductQuestionEdge';
  cursor: Scalars['String']['output'];
  node: ProductQuestion;
};

/** Ordering configuration for ProductQuestion */
export type ProductQuestionOrderByInput = {
  /** Sort direction */
  direction: SortDirection;
  /** Field to order by */
  field: ProductQuestionOrderField;
};

/** Fields available for sorting ProductQuestion */
export enum ProductQuestionOrderField {
  /** Sort by acceptedAnswerCount */
  AcceptedAnswerCount = 'acceptedAnswerCount',
  /** Sort by answerCount */
  AnswerCount = 'answerCount',
  /** Sort by answerState */
  AnswerState = 'answerState',
  /** Sort by authorDisplayName */
  AuthorDisplayName = 'authorDisplayName',
  /** Sort by authorType */
  AuthorType = 'authorType',
  /** Sort by createdAt */
  CreatedAt = 'createdAt',
  /** Sort by deletedAt */
  DeletedAt = 'deletedAt',
  /** Sort by id */
  Id = 'id',
  /** Sort by locale */
  Locale = 'locale',
  /** Sort by officialAnswerCount */
  OfficialAnswerCount = 'officialAnswerCount',
  /** Sort by productId */
  ProductId = 'productId',
  /** Sort by publishedAt */
  PublishedAt = 'publishedAt',
  /** Sort by reportCount */
  ReportCount = 'reportCount',
  /** Sort by revision */
  Revision = 'revision',
  /** Sort by sourceChannel */
  SourceChannel = 'sourceChannel',
  /** Sort by status */
  Status = 'status',
  /** Sort by updatedAt */
  UpdatedAt = 'updatedAt',
  /** Sort by variantId */
  VariantId = 'variantId'
}

export type ProductQuestionSubjectUpdateInput = {
  productId?: InputMaybe<Scalars['ID']['input']>;
  variantId?: InputMaybe<Scalars['ID']['input']>;
};

export type ProductQuestionSubscription = Node & {
  __typename?: 'ProductQuestionSubscription';
  channel: ReviewNotificationChannel;
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  lastNotifiedAt: Maybe<Scalars['DateTime']['output']>;
  locale: Scalars['String']['output'];
  question: ProductQuestion;
  status: ProductQuestionSubscriptionStatus;
  subscriberCustomer: Maybe<Customer>;
  updatedAt: Scalars['DateTime']['output'];
};

export type ProductQuestionSubscriptionConnection = {
  __typename?: 'ProductQuestionSubscriptionConnection';
  edges: Array<ProductQuestionSubscriptionEdge>;
  pageInfo: PageInfo;
  totalCount: Scalars['Int']['output'];
};

export type ProductQuestionSubscriptionEdge = {
  __typename?: 'ProductQuestionSubscriptionEdge';
  cursor: Scalars['String']['output'];
  node: ProductQuestionSubscription;
};

export enum ProductQuestionSubscriptionStatus {
  Active = 'ACTIVE',
  Paused = 'PAUSED',
  Unsubscribed = 'UNSUBSCRIBED'
}

export type ProductQuestionSubscriptionUpdateInput = {
  channel?: InputMaybe<ReviewNotificationChannel>;
  locale?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<ProductQuestionSubscriptionStatus>;
};

export type ProductQuestionSubscriptionUpdatePayload = {
  __typename?: 'ProductQuestionSubscriptionUpdatePayload';
  operationResults: Array<ReviewsOperationResult>;
  subscription: Maybe<ProductQuestionSubscription>;
  userErrors: Array<GenericUserError>;
};

/** Read-only projection over currently published product questions and answers. */
export type ProductQuestionSummary = {
  __typename?: 'ProductQuestionSummary';
  answerCount: Scalars['Int']['output'];
  answeredQuestionCount: Scalars['Int']['output'];
  lastAnsweredAt: Maybe<Scalars['DateTime']['output']>;
  lastQuestionAt: Maybe<Scalars['DateTime']['output']>;
  officialAnswerCount: Scalars['Int']['output'];
  product: Product;
  questionCount: Scalars['Int']['output'];
  unansweredQuestionCount: Scalars['Int']['output'];
  updatedAt: Scalars['DateTime']['output'];
};

export type ProductQuestionUpdateInput = {
  /** Create, update, or delete answers owned by this question. */
  answers?: InputMaybe<ProductQuestionAnswersUpdateInput>;
  /** Text, author, source, moderation, translations, and publications. */
  content?: InputMaybe<ReviewContentUpdateInput>;
  subject?: InputMaybe<ProductQuestionSubjectUpdateInput>;
};

export type ProductQuestionUpdatePayload = {
  __typename?: 'ProductQuestionUpdatePayload';
  operationResults: Array<ReviewsOperationResult>;
  productQuestion: Maybe<ProductQuestion>;
  userErrors: Array<GenericUserError>;
};

/** Filter conditions for ProductQuestion */
export type ProductQuestionWhereInput = {
  /** Logical AND of multiple conditions */
  _and?: InputMaybe<Array<ProductQuestionWhereInput>>;
  /** Negate the condition */
  _not?: InputMaybe<ProductQuestionWhereInput>;
  /** Logical OR of multiple conditions */
  _or?: InputMaybe<Array<ProductQuestionWhereInput>>;
  /** Filter by acceptedAnswerCount */
  acceptedAnswerCount?: InputMaybe<IntFilter>;
  /** Filter by answerCount */
  answerCount?: InputMaybe<IntFilter>;
  /** Filter by answerState */
  answerState?: InputMaybe<StringFilter>;
  /** Filter by authorCustomerId */
  authorCustomerId?: InputMaybe<IdFilter>;
  /** Filter by authorDisplayName */
  authorDisplayName?: InputMaybe<StringFilter>;
  /** Filter by authorType */
  authorType?: InputMaybe<StringFilter>;
  /** Filter by body */
  body?: InputMaybe<StringFilter>;
  /** Filter by createdAt */
  createdAt?: InputMaybe<DateTimeFilter>;
  /** Filter by deletedAt */
  deletedAt?: InputMaybe<DateTimeFilter>;
  /** Filter by id */
  id?: InputMaybe<IdFilter>;
  /** Filter by locale */
  locale?: InputMaybe<StringFilter>;
  /** Filter by officialAnswerCount */
  officialAnswerCount?: InputMaybe<IntFilter>;
  /** Filter by productId */
  productId?: InputMaybe<IdFilter>;
  /** Filter by publishedAt */
  publishedAt?: InputMaybe<DateTimeFilter>;
  /** Filter by reportCount */
  reportCount?: InputMaybe<IntFilter>;
  /** Filter by revision */
  revision?: InputMaybe<IntFilter>;
  /** Filter by sourceChannel */
  sourceChannel?: InputMaybe<StringFilter>;
  /** Filter by status */
  status?: InputMaybe<StringFilter>;
  /** Filter by updatedAt */
  updatedAt?: InputMaybe<DateTimeFilter>;
  /** Filter by variantId */
  variantId?: InputMaybe<IdFilter>;
};

export type ProductRatingCriterionSummary = {
  __typename?: 'ProductRatingCriterionSummary';
  averageRating: Scalars['Float']['output'];
  criterion: ReviewRatingCriterion;
  ratingBreakdown: ReviewRatingBreakdown;
  ratingSum: Scalars['BigInt']['output'];
  reviewCount: Scalars['Int']['output'];
  updatedAt: Scalars['DateTime']['output'];
};

/** Read-only projection over currently published, non-deleted product reviews. */
export type ProductReviewSummary = {
  __typename?: 'ProductReviewSummary';
  averageRating: Scalars['Float']['output'];
  criteria: Array<ProductRatingCriterionSummary>;
  lastReviewedAt: Maybe<Scalars['DateTime']['output']>;
  mediaReviewCount: Scalars['Int']['output'];
  product: Product;
  ratingBreakdown: ReviewRatingBreakdown;
  ratingSum: Scalars['BigInt']['output'];
  reviewCount: Scalars['Int']['output'];
  updatedAt: Scalars['DateTime']['output'];
  verifiedReviewCount: Scalars['Int']['output'];
};

/** Aggregated Reviews data used by product management widgets. */
export type ProductReviewsWidget = {
  __typename?: 'ProductReviewsWidget';
  /** Published question and answer aggregates for the product. */
  questionSummary: Maybe<ProductQuestionSummary>;
  /** Published review aggregates for the product. */
  reviewSummary: Maybe<ProductReviewSummary>;
};

export type Query = {
  __typename?: 'Query';
  /** Admin-only Reviews query namespace. */
  reviewsQuery: ReviewsQuery;
  /** Shared query namespace for product widgets. */
  widgetQuery: WidgetQuery;
};

export type Review = Node & ReviewContent & {
  __typename?: 'Review';
  author: ReviewContentAuthor;
  body: Scalars['String']['output'];
  createdAt: Scalars['DateTime']['output'];
  deletedAt: Maybe<Scalars['DateTime']['output']>;
  externalReferences: ReviewContentExternalReferenceConnection;
  id: Scalars['ID']['output'];
  idempotencyKey: Maybe<Scalars['String']['output']>;
  incentiveDisclosure: Maybe<Scalars['String']['output']>;
  isIncentivized: Scalars['Boolean']['output'];
  isVerifiedPurchase: Scalars['Boolean']['output'];
  kind: ReviewContentKind;
  locale: Scalars['String']['output'];
  media: Array<ReviewMedia>;
  metrics: ReviewContentMetrics;
  moderatedAt: Maybe<Scalars['DateTime']['output']>;
  moderatedByPrincipalId: Maybe<Scalars['String']['output']>;
  moderationCases: ReviewModerationCaseConnection;
  moderationEvents: ReviewModerationEventConnection;
  moderationNote: Maybe<Scalars['String']['output']>;
  moderationSignals: ReviewModerationSignalConnection;
  /** Orders is not yet an admin federation entity, so evidence remains a global ID contract. */
  orderId: Maybe<Scalars['ID']['output']>;
  orderLineId: Maybe<Scalars['ID']['output']>;
  product: Product;
  publications: Array<ReviewContentPublication>;
  publishedAt: Maybe<Scalars['DateTime']['output']>;
  rating: Scalars['Int']['output'];
  ratings: Array<ReviewRating>;
  redactedAt: Maybe<Scalars['DateTime']['output']>;
  replies: ReviewReplyConnection;
  reports: ReviewContentReportConnection;
  revision: Scalars['Int']['output'];
  revisions: ReviewContentRevisionConnection;
  sourceChannel: Scalars['String']['output'];
  sourceMetadata: Scalars['JSON']['output'];
  status: ReviewContentStatus;
  title: Maybe<Scalars['String']['output']>;
  translations: Array<ReviewContentTranslation>;
  unpublishedAt: Maybe<Scalars['DateTime']['output']>;
  updatedAt: Scalars['DateTime']['output'];
  variant: Maybe<Variant>;
  verificationMethod: Maybe<Scalars['String']['output']>;
  verificationStatus: ReviewVerificationStatus;
  verifiedAt: Maybe<Scalars['DateTime']['output']>;
  votes: ReviewContentVoteConnection;
};


export type ReviewExternalReferencesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


export type ReviewModerationCasesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


export type ReviewModerationEventsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


export type ReviewModerationSignalsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


export type ReviewRepliesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  meta?: InputMaybe<ReviewContentConnectionMetaInput>;
  orderBy?: InputMaybe<Array<ReviewReplyOrderByInput>>;
  where?: InputMaybe<ReviewReplyWhereInput>;
};


export type ReviewReportsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


export type ReviewRevisionsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


export type ReviewVotesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};

export type ReviewConnection = {
  __typename?: 'ReviewConnection';
  edges: Array<ReviewEdge>;
  pageInfo: PageInfo;
  totalCount: Scalars['Int']['output'];
};

/** Shared contract implemented by every moderated Reviews content aggregate. */
export type ReviewContent = {
  author: ReviewContentAuthor;
  body: Scalars['String']['output'];
  createdAt: Scalars['DateTime']['output'];
  deletedAt: Maybe<Scalars['DateTime']['output']>;
  externalReferences: ReviewContentExternalReferenceConnection;
  id: Scalars['ID']['output'];
  idempotencyKey: Maybe<Scalars['String']['output']>;
  kind: ReviewContentKind;
  locale: Scalars['String']['output'];
  metrics: ReviewContentMetrics;
  moderatedAt: Maybe<Scalars['DateTime']['output']>;
  moderatedByPrincipalId: Maybe<Scalars['String']['output']>;
  moderationCases: ReviewModerationCaseConnection;
  moderationEvents: ReviewModerationEventConnection;
  moderationNote: Maybe<Scalars['String']['output']>;
  moderationSignals: ReviewModerationSignalConnection;
  publications: Array<ReviewContentPublication>;
  publishedAt: Maybe<Scalars['DateTime']['output']>;
  redactedAt: Maybe<Scalars['DateTime']['output']>;
  reports: ReviewContentReportConnection;
  revision: Scalars['Int']['output'];
  revisions: ReviewContentRevisionConnection;
  sourceChannel: Scalars['String']['output'];
  sourceMetadata: Scalars['JSON']['output'];
  status: ReviewContentStatus;
  title: Maybe<Scalars['String']['output']>;
  translations: Array<ReviewContentTranslation>;
  unpublishedAt: Maybe<Scalars['DateTime']['output']>;
  updatedAt: Scalars['DateTime']['output'];
  votes: ReviewContentVoteConnection;
};


/** Shared contract implemented by every moderated Reviews content aggregate. */
export type ReviewContentExternalReferencesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


/** Shared contract implemented by every moderated Reviews content aggregate. */
export type ReviewContentModerationCasesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


/** Shared contract implemented by every moderated Reviews content aggregate. */
export type ReviewContentModerationEventsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


/** Shared contract implemented by every moderated Reviews content aggregate. */
export type ReviewContentModerationSignalsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


/** Shared contract implemented by every moderated Reviews content aggregate. */
export type ReviewContentReportsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


/** Shared contract implemented by every moderated Reviews content aggregate. */
export type ReviewContentRevisionsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


/** Shared contract implemented by every moderated Reviews content aggregate. */
export type ReviewContentVotesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};

export type ReviewContentAuthor = {
  __typename?: 'ReviewContentAuthor';
  customer: Maybe<Customer>;
  displayName: Scalars['String']['output'];
  /** Snapshot email; null after privacy redaction or when not collected. */
  email: Maybe<Scalars['Email']['output']>;
  principalId: Maybe<Scalars['String']['output']>;
  type: ReviewContentAuthorType;
};

export type ReviewContentAuthorCreateInput = {
  customerId?: InputMaybe<Scalars['ID']['input']>;
  displayName: Scalars['String']['input'];
  email?: InputMaybe<Scalars['Email']['input']>;
  principalId?: InputMaybe<Scalars['String']['input']>;
  type: ReviewContentAuthorType;
};

export enum ReviewContentAuthorType {
  Customer = 'CUSTOMER',
  External = 'EXTERNAL',
  Guest = 'GUEST',
  Seller = 'SELLER',
  Staff = 'STAFF',
  System = 'SYSTEM'
}

export type ReviewContentAuthorUpdateInput = {
  /** Pass null to remove the customer link when the resulting author type allows it. */
  customerId?: InputMaybe<Scalars['ID']['input']>;
  displayName?: InputMaybe<Scalars['String']['input']>;
  email?: InputMaybe<Scalars['Email']['input']>;
  principalId?: InputMaybe<Scalars['String']['input']>;
  type?: InputMaybe<ReviewContentAuthorType>;
};

export type ReviewContentConnection = {
  __typename?: 'ReviewContentConnection';
  edges: Array<ReviewContentEdge>;
  pageInfo: PageInfo;
  totalCount: Scalars['Int']['output'];
};

/** Repository-enforced visibility controls for moderated content lists. */
export type ReviewContentConnectionMetaInput = {
  /** Include soft-deleted content; false by default. */
  includeDeleted?: InputMaybe<Scalars['Boolean']['input']>;
  /** Include privacy-redacted content; true by default for audit workflows. */
  includeRedacted?: InputMaybe<Scalars['Boolean']['input']>;
};

export type ReviewContentCreateInput = {
  author: ReviewContentAuthorCreateInput;
  body: Scalars['String']['input'];
  locale: Scalars['String']['input'];
  moderationNote?: InputMaybe<Scalars['String']['input']>;
  source?: InputMaybe<ReviewContentSourceCreateInput>;
  /** Admin imports may set an initial status; PENDING is the default. */
  status?: InputMaybe<ReviewContentStatus>;
  title?: InputMaybe<Scalars['String']['input']>;
};

export type ReviewContentDeleteInput = {
  expectedRevision: Scalars['Int']['input'];
  id: Scalars['ID']['input'];
  /** Hard deletion is reserved for explicit privacy or retention workflows. */
  permanent?: InputMaybe<Scalars['Boolean']['input']>;
};

export type ReviewContentEdge = {
  __typename?: 'ReviewContentEdge';
  cursor: Scalars['String']['output'];
  node: ReviewContent;
};

export type ReviewContentExternalReference = Node & {
  __typename?: 'ReviewContentExternalReference';
  content: ReviewContent;
  contentChecksum: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['DateTime']['output'];
  deletedAt: Maybe<Scalars['DateTime']['output']>;
  direction: ReviewExternalSyncDirection;
  etag: Maybe<Scalars['String']['output']>;
  externalId: Scalars['String']['output'];
  externalSystem: Scalars['String']['output'];
  externalType: Scalars['String']['output'];
  externalUrl: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  lastError: Maybe<Scalars['String']['output']>;
  lastSyncedAt: Maybe<Scalars['DateTime']['output']>;
  metadata: Scalars['JSON']['output'];
  syncStatus: ReviewExternalSyncStatus;
  updatedAt: Scalars['DateTime']['output'];
};

export type ReviewContentExternalReferenceConnection = {
  __typename?: 'ReviewContentExternalReferenceConnection';
  edges: Array<ReviewContentExternalReferenceEdge>;
  pageInfo: PageInfo;
  totalCount: Scalars['Int']['output'];
};

export type ReviewContentExternalReferenceCreateInput = {
  contentId: Scalars['ID']['input'];
  direction: ReviewExternalSyncDirection;
  externalId: Scalars['String']['input'];
  externalSystem: Scalars['String']['input'];
  externalType: Scalars['String']['input'];
  externalUrl?: InputMaybe<Scalars['String']['input']>;
  metadata?: InputMaybe<Scalars['JSON']['input']>;
};

export type ReviewContentExternalReferenceCreatePayload = {
  __typename?: 'ReviewContentExternalReferenceCreatePayload';
  externalReference: Maybe<ReviewContentExternalReference>;
  userErrors: Array<GenericUserError>;
};

export type ReviewContentExternalReferenceDeleteInput = {
  expectedUpdatedAt: Scalars['DateTime']['input'];
  id: Scalars['ID']['input'];
  permanent?: InputMaybe<Scalars['Boolean']['input']>;
};

export type ReviewContentExternalReferenceDeletePayload = {
  __typename?: 'ReviewContentExternalReferenceDeletePayload';
  deletedExternalReferenceId: Maybe<Scalars['ID']['output']>;
  userErrors: Array<GenericUserError>;
};

export type ReviewContentExternalReferenceEdge = {
  __typename?: 'ReviewContentExternalReferenceEdge';
  cursor: Scalars['String']['output'];
  node: ReviewContentExternalReference;
};

export type ReviewContentExternalReferenceIdentityInput = {
  externalId?: InputMaybe<Scalars['String']['input']>;
  externalSystem?: InputMaybe<Scalars['String']['input']>;
  externalType?: InputMaybe<Scalars['String']['input']>;
  externalUrl?: InputMaybe<Scalars['String']['input']>;
};

/** Ordering configuration for ReviewContentExternalReference */
export type ReviewContentExternalReferenceOrderByInput = {
  /** Sort direction */
  direction: SortDirection;
  /** Field to order by */
  field: ReviewContentExternalReferenceOrderField;
};

/** Fields available for sorting ReviewContentExternalReference */
export enum ReviewContentExternalReferenceOrderField {
  /** Sort by contentId */
  ContentId = 'contentId',
  /** Sort by createdAt */
  CreatedAt = 'createdAt',
  /** Sort by deletedAt */
  DeletedAt = 'deletedAt',
  /** Sort by direction */
  Direction = 'direction',
  /** Sort by externalId */
  ExternalId = 'externalId',
  /** Sort by externalSystem */
  ExternalSystem = 'externalSystem',
  /** Sort by externalType */
  ExternalType = 'externalType',
  /** Sort by id */
  Id = 'id',
  /** Sort by lastSyncedAt */
  LastSyncedAt = 'lastSyncedAt',
  /** Sort by syncStatus */
  SyncStatus = 'syncStatus',
  /** Sort by updatedAt */
  UpdatedAt = 'updatedAt'
}

export type ReviewContentExternalReferenceSyncInput = {
  contentChecksum?: InputMaybe<Scalars['String']['input']>;
  direction?: InputMaybe<ReviewExternalSyncDirection>;
  etag?: InputMaybe<Scalars['String']['input']>;
  metadata?: InputMaybe<Scalars['JSON']['input']>;
  status?: InputMaybe<ReviewExternalSyncStatus>;
};

export type ReviewContentExternalReferenceUpdateInput = {
  identity?: InputMaybe<ReviewContentExternalReferenceIdentityInput>;
  sync?: InputMaybe<ReviewContentExternalReferenceSyncInput>;
};

export type ReviewContentExternalReferenceUpdatePayload = {
  __typename?: 'ReviewContentExternalReferenceUpdatePayload';
  externalReference: Maybe<ReviewContentExternalReference>;
  operationResults: Array<ReviewsOperationResult>;
  userErrors: Array<GenericUserError>;
};

/** Filter conditions for ReviewContentExternalReference */
export type ReviewContentExternalReferenceWhereInput = {
  /** Logical AND of multiple conditions */
  _and?: InputMaybe<Array<ReviewContentExternalReferenceWhereInput>>;
  /** Negate the condition */
  _not?: InputMaybe<ReviewContentExternalReferenceWhereInput>;
  /** Logical OR of multiple conditions */
  _or?: InputMaybe<Array<ReviewContentExternalReferenceWhereInput>>;
  /** Filter by contentId */
  contentId?: InputMaybe<IdFilter>;
  /** Filter by createdAt */
  createdAt?: InputMaybe<DateTimeFilter>;
  /** Filter by deletedAt */
  deletedAt?: InputMaybe<DateTimeFilter>;
  /** Filter by direction */
  direction?: InputMaybe<StringFilter>;
  /** Filter by externalId */
  externalId?: InputMaybe<StringFilter>;
  /** Filter by externalSystem */
  externalSystem?: InputMaybe<StringFilter>;
  /** Filter by externalType */
  externalType?: InputMaybe<StringFilter>;
  /** Filter by id */
  id?: InputMaybe<IdFilter>;
  /** Filter by lastSyncedAt */
  lastSyncedAt?: InputMaybe<DateTimeFilter>;
  /** Filter by syncStatus */
  syncStatus?: InputMaybe<StringFilter>;
  /** Filter by updatedAt */
  updatedAt?: InputMaybe<DateTimeFilter>;
};

export enum ReviewContentKind {
  ProductQuestion = 'PRODUCT_QUESTION',
  QuestionAnswer = 'QUESTION_ANSWER',
  Review = 'REVIEW',
  ReviewReply = 'REVIEW_REPLY'
}

/** Transactionally maintained counters used by admin filtering and sorting. */
export type ReviewContentMetrics = {
  __typename?: 'ReviewContentMetrics';
  acceptedChildCount: Scalars['Int']['output'];
  childCount: Scalars['Int']['output'];
  dislikeCount: Scalars['Int']['output'];
  lastChildAt: Maybe<Scalars['DateTime']['output']>;
  likeCount: Scalars['Int']['output'];
  mediaCount: Scalars['Int']['output'];
  officialChildCount: Scalars['Int']['output'];
  openReportCount: Scalars['Int']['output'];
  reportCount: Scalars['Int']['output'];
  updatedAt: Scalars['DateTime']['output'];
};

export type ReviewContentModerationInput = {
  moderationNote?: InputMaybe<Scalars['String']['input']>;
  status: ReviewContentStatus;
};

/** Ordering configuration for ReviewContent */
export type ReviewContentOrderByInput = {
  /** Sort direction */
  direction: SortDirection;
  /** Field to order by */
  field: ReviewContentOrderField;
};

/** Fields available for sorting ReviewContent */
export enum ReviewContentOrderField {
  /** Sort by authorDisplayName */
  AuthorDisplayName = 'authorDisplayName',
  /** Sort by authorType */
  AuthorType = 'authorType',
  /** Sort by childCount */
  ChildCount = 'childCount',
  /** Sort by createdAt */
  CreatedAt = 'createdAt',
  /** Sort by deletedAt */
  DeletedAt = 'deletedAt',
  /** Sort by dislikeCount */
  DislikeCount = 'dislikeCount',
  /** Sort by id */
  Id = 'id',
  /** Sort by kind */
  Kind = 'kind',
  /** Sort by likeCount */
  LikeCount = 'likeCount',
  /** Sort by locale */
  Locale = 'locale',
  /** Sort by mediaCount */
  MediaCount = 'mediaCount',
  /** Sort by openReportCount */
  OpenReportCount = 'openReportCount',
  /** Sort by publishedAt */
  PublishedAt = 'publishedAt',
  /** Sort by redactedAt */
  RedactedAt = 'redactedAt',
  /** Sort by reportCount */
  ReportCount = 'reportCount',
  /** Sort by revision */
  Revision = 'revision',
  /** Sort by sourceChannel */
  SourceChannel = 'sourceChannel',
  /** Sort by status */
  Status = 'status',
  /** Sort by title */
  Title = 'title',
  /** Sort by updatedAt */
  UpdatedAt = 'updatedAt'
}

export type ReviewContentPublication = Node & {
  __typename?: 'ReviewContentPublication';
  channel: Scalars['String']['output'];
  content: ReviewContent;
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  lastError: Maybe<Scalars['String']['output']>;
  locale: Maybe<Scalars['String']['output']>;
  publishedAt: Maybe<Scalars['DateTime']['output']>;
  scheduledAt: Maybe<Scalars['DateTime']['output']>;
  status: ReviewPublicationStatus;
  unpublishedAt: Maybe<Scalars['DateTime']['output']>;
  updatedAt: Scalars['DateTime']['output'];
};

export type ReviewContentPublicationSyncInput = {
  channel: Scalars['String']['input'];
  locale?: InputMaybe<Scalars['String']['input']>;
  scheduledAt?: InputMaybe<Scalars['DateTime']['input']>;
  status: ReviewPublicationStatus;
};

export type ReviewContentReport = Node & {
  __typename?: 'ReviewContentReport';
  assignedToPrincipalId: Maybe<Scalars['String']['output']>;
  content: ReviewContent;
  createdAt: Scalars['DateTime']['output'];
  details: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  reason: ReviewContentReportReason;
  reporterCustomer: Maybe<Customer>;
  resolutionNote: Maybe<Scalars['String']['output']>;
  resolvedAt: Maybe<Scalars['DateTime']['output']>;
  resolvedByPrincipalId: Maybe<Scalars['String']['output']>;
  status: ReviewContentReportStatus;
  updatedAt: Scalars['DateTime']['output'];
};

export type ReviewContentReportAssignmentInput = {
  assignedToPrincipalId?: InputMaybe<Scalars['String']['input']>;
};

export type ReviewContentReportConnection = {
  __typename?: 'ReviewContentReportConnection';
  edges: Array<ReviewContentReportEdge>;
  pageInfo: PageInfo;
  totalCount: Scalars['Int']['output'];
};

export type ReviewContentReportEdge = {
  __typename?: 'ReviewContentReportEdge';
  cursor: Scalars['String']['output'];
  node: ReviewContentReport;
};

/** Ordering configuration for ReviewContentReport */
export type ReviewContentReportOrderByInput = {
  /** Sort direction */
  direction: SortDirection;
  /** Field to order by */
  field: ReviewContentReportOrderField;
};

/** Fields available for sorting ReviewContentReport */
export enum ReviewContentReportOrderField {
  /** Sort by assignedToPrincipalId */
  AssignedToPrincipalId = 'assignedToPrincipalId',
  /** Sort by contentId */
  ContentId = 'contentId',
  /** Sort by createdAt */
  CreatedAt = 'createdAt',
  /** Sort by id */
  Id = 'id',
  /** Sort by reason */
  Reason = 'reason',
  /** Sort by reporterCustomerId */
  ReporterCustomerId = 'reporterCustomerId',
  /** Sort by resolvedAt */
  ResolvedAt = 'resolvedAt',
  /** Sort by resolvedByPrincipalId */
  ResolvedByPrincipalId = 'resolvedByPrincipalId',
  /** Sort by status */
  Status = 'status',
  /** Sort by updatedAt */
  UpdatedAt = 'updatedAt'
}

export enum ReviewContentReportReason {
  ConflictOfInterest = 'CONFLICT_OF_INTEREST',
  FraudOrScam = 'FRAUD_OR_SCAM',
  Harassment = 'HARASSMENT',
  HateSpeech = 'HATE_SPEECH',
  IllegalContent = 'ILLEGAL_CONTENT',
  IntellectualProperty = 'INTELLECTUAL_PROPERTY',
  NotRelevant = 'NOT_RELEVANT',
  Offensive = 'OFFENSIVE',
  Other = 'OTHER',
  PersonalInformation = 'PERSONAL_INFORMATION',
  Spam = 'SPAM'
}

export type ReviewContentReportResolutionInput = {
  note?: InputMaybe<Scalars['String']['input']>;
  /** Must be ACTIONED or DISMISSED. */
  status: ReviewContentReportStatus;
};

export enum ReviewContentReportStatus {
  Actioned = 'ACTIONED',
  Dismissed = 'DISMISSED',
  Open = 'OPEN',
  UnderReview = 'UNDER_REVIEW'
}

export type ReviewContentReportUpdateInput = {
  assignment?: InputMaybe<ReviewContentReportAssignmentInput>;
  resolution?: InputMaybe<ReviewContentReportResolutionInput>;
};

export type ReviewContentReportUpdatePayload = {
  __typename?: 'ReviewContentReportUpdatePayload';
  contentReport: Maybe<ReviewContentReport>;
  operationResults: Array<ReviewsOperationResult>;
  userErrors: Array<GenericUserError>;
};

/** Filter conditions for ReviewContentReport */
export type ReviewContentReportWhereInput = {
  /** Logical AND of multiple conditions */
  _and?: InputMaybe<Array<ReviewContentReportWhereInput>>;
  /** Negate the condition */
  _not?: InputMaybe<ReviewContentReportWhereInput>;
  /** Logical OR of multiple conditions */
  _or?: InputMaybe<Array<ReviewContentReportWhereInput>>;
  /** Filter by assignedToPrincipalId */
  assignedToPrincipalId?: InputMaybe<StringFilter>;
  /** Filter by contentId */
  contentId?: InputMaybe<IdFilter>;
  /** Filter by createdAt */
  createdAt?: InputMaybe<DateTimeFilter>;
  /** Filter by id */
  id?: InputMaybe<IdFilter>;
  /** Filter by reason */
  reason?: InputMaybe<StringFilter>;
  /** Filter by reporterCustomerId */
  reporterCustomerId?: InputMaybe<IdFilter>;
  /** Filter by resolvedAt */
  resolvedAt?: InputMaybe<DateTimeFilter>;
  /** Filter by resolvedByPrincipalId */
  resolvedByPrincipalId?: InputMaybe<StringFilter>;
  /** Filter by status */
  status?: InputMaybe<StringFilter>;
  /** Filter by updatedAt */
  updatedAt?: InputMaybe<DateTimeFilter>;
};

/** Immutable aggregate snapshot used for audit and restore workflows. */
export type ReviewContentRevision = Node & {
  __typename?: 'ReviewContentRevision';
  changeReason: Maybe<Scalars['String']['output']>;
  changedById: Maybe<Scalars['String']['output']>;
  changedByType: Scalars['String']['output'];
  content: ReviewContent;
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  revision: Scalars['Int']['output'];
  snapshot: Scalars['JSON']['output'];
};

export type ReviewContentRevisionConnection = {
  __typename?: 'ReviewContentRevisionConnection';
  edges: Array<ReviewContentRevisionEdge>;
  pageInfo: PageInfo;
  totalCount: Scalars['Int']['output'];
};

export type ReviewContentRevisionEdge = {
  __typename?: 'ReviewContentRevisionEdge';
  cursor: Scalars['String']['output'];
  node: ReviewContentRevision;
};

export type ReviewContentSourceCreateInput = {
  channel?: InputMaybe<Scalars['String']['input']>;
  idempotencyKey?: InputMaybe<Scalars['String']['input']>;
  metadata?: InputMaybe<Scalars['JSON']['input']>;
};

export type ReviewContentSourceUpdateInput = {
  channel?: InputMaybe<Scalars['String']['input']>;
  idempotencyKey?: InputMaybe<Scalars['String']['input']>;
  metadata?: InputMaybe<Scalars['JSON']['input']>;
};

export enum ReviewContentStatus {
  Pending = 'PENDING',
  Published = 'PUBLISHED',
  Rejected = 'REJECTED'
}

export type ReviewContentTextUpdateInput = {
  body?: InputMaybe<Scalars['String']['input']>;
  locale?: InputMaybe<Scalars['String']['input']>;
  title?: InputMaybe<Scalars['String']['input']>;
};

export type ReviewContentTranslation = Node & {
  __typename?: 'ReviewContentTranslation';
  body: Scalars['String']['output'];
  content: ReviewContent;
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  locale: Scalars['String']['output'];
  reviewedAt: Maybe<Scalars['DateTime']['output']>;
  reviewedByPrincipalId: Maybe<Scalars['String']['output']>;
  revision: Scalars['Int']['output'];
  source: ReviewTranslationSource;
  status: ReviewContentStatus;
  title: Maybe<Scalars['String']['output']>;
  updatedAt: Scalars['DateTime']['output'];
};

export type ReviewContentTranslationSyncInput = {
  body: Scalars['String']['input'];
  locale: Scalars['String']['input'];
  source: ReviewTranslationSource;
  status?: InputMaybe<ReviewContentStatus>;
  title?: InputMaybe<Scalars['String']['input']>;
};

/** Common section operations reused by all content aggregate updates. */
export type ReviewContentUpdateInput = {
  author?: InputMaybe<ReviewContentAuthorUpdateInput>;
  moderation?: InputMaybe<ReviewContentModerationInput>;
  /** Complete publication destination replacement when supplied. */
  publications?: InputMaybe<Array<ReviewContentPublicationSyncInput>>;
  source?: InputMaybe<ReviewContentSourceUpdateInput>;
  text?: InputMaybe<ReviewContentTextUpdateInput>;
  /** Complete translation replacement when supplied. Empty removes all translations. */
  translations?: InputMaybe<Array<ReviewContentTranslationSyncInput>>;
};

export type ReviewContentUpdatePayload = {
  __typename?: 'ReviewContentUpdatePayload';
  content: Maybe<ReviewContent>;
  operationResults: Array<ReviewsOperationResult>;
  userErrors: Array<GenericUserError>;
};

/** Read-only admin view of a storefront reaction. */
export type ReviewContentVote = Node & {
  __typename?: 'ReviewContentVote';
  content: ReviewContent;
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  type: ReviewContentVoteType;
  updatedAt: Scalars['DateTime']['output'];
  voterCustomer: Maybe<Customer>;
};

export type ReviewContentVoteConnection = {
  __typename?: 'ReviewContentVoteConnection';
  edges: Array<ReviewContentVoteEdge>;
  pageInfo: PageInfo;
  totalCount: Scalars['Int']['output'];
};

export type ReviewContentVoteEdge = {
  __typename?: 'ReviewContentVoteEdge';
  cursor: Scalars['String']['output'];
  node: ReviewContentVote;
};

export enum ReviewContentVoteType {
  Dislike = 'DISLIKE',
  Like = 'LIKE'
}

/** Filter conditions for ReviewContent */
export type ReviewContentWhereInput = {
  /** Logical AND of multiple conditions */
  _and?: InputMaybe<Array<ReviewContentWhereInput>>;
  /** Negate the condition */
  _not?: InputMaybe<ReviewContentWhereInput>;
  /** Logical OR of multiple conditions */
  _or?: InputMaybe<Array<ReviewContentWhereInput>>;
  /** Filter by authorCustomerId */
  authorCustomerId?: InputMaybe<IdFilter>;
  /** Filter by authorDisplayName */
  authorDisplayName?: InputMaybe<StringFilter>;
  /** Filter by authorType */
  authorType?: InputMaybe<StringFilter>;
  /** Filter by body */
  body?: InputMaybe<StringFilter>;
  /** Filter by childCount */
  childCount?: InputMaybe<IntFilter>;
  /** Filter by createdAt */
  createdAt?: InputMaybe<DateTimeFilter>;
  /** Filter by deletedAt */
  deletedAt?: InputMaybe<DateTimeFilter>;
  /** Filter by dislikeCount */
  dislikeCount?: InputMaybe<IntFilter>;
  /** Filter by id */
  id?: InputMaybe<IdFilter>;
  /** Filter by kind */
  kind?: InputMaybe<StringFilter>;
  /** Filter by likeCount */
  likeCount?: InputMaybe<IntFilter>;
  /** Filter by locale */
  locale?: InputMaybe<StringFilter>;
  /** Filter by mediaCount */
  mediaCount?: InputMaybe<IntFilter>;
  /** Filter by openReportCount */
  openReportCount?: InputMaybe<IntFilter>;
  /** Filter by publishedAt */
  publishedAt?: InputMaybe<DateTimeFilter>;
  /** Filter by redactedAt */
  redactedAt?: InputMaybe<DateTimeFilter>;
  /** Filter by reportCount */
  reportCount?: InputMaybe<IntFilter>;
  /** Filter by revision */
  revision?: InputMaybe<IntFilter>;
  /** Filter by sourceChannel */
  sourceChannel?: InputMaybe<StringFilter>;
  /** Filter by status */
  status?: InputMaybe<StringFilter>;
  /** Filter by title */
  title?: InputMaybe<StringFilter>;
  /** Filter by updatedAt */
  updatedAt?: InputMaybe<DateTimeFilter>;
};

export type ReviewCreateInput = {
  content: ReviewContentCreateInput;
  incentive?: InputMaybe<ReviewIncentiveUpdateInput>;
  media?: InputMaybe<Array<ReviewMediaSyncItemInput>>;
  orderId?: InputMaybe<Scalars['ID']['input']>;
  orderLineId?: InputMaybe<Scalars['ID']['input']>;
  productId: Scalars['ID']['input'];
  rating: Scalars['Int']['input'];
  ratings?: InputMaybe<Array<ReviewRatingValueInput>>;
  variantId?: InputMaybe<Scalars['ID']['input']>;
  verification?: InputMaybe<ReviewVerificationUpdateInput>;
};

export type ReviewCreatePayload = {
  __typename?: 'ReviewCreatePayload';
  review: Maybe<Review>;
  userErrors: Array<GenericUserError>;
};

export type ReviewDeletePayload = {
  __typename?: 'ReviewDeletePayload';
  deletedReviewId: Maybe<Scalars['ID']['output']>;
  userErrors: Array<GenericUserError>;
};

export enum ReviewDuplicatePolicy {
  AllowMultiple = 'ALLOW_MULTIPLE',
  OnePerOrderLine = 'ONE_PER_ORDER_LINE',
  OnePerProduct = 'ONE_PER_PRODUCT'
}

export type ReviewEdge = {
  __typename?: 'ReviewEdge';
  cursor: Scalars['String']['output'];
  node: Review;
};

export enum ReviewExternalSyncDirection {
  Bidirectional = 'BIDIRECTIONAL',
  Export = 'EXPORT',
  Import = 'IMPORT'
}

export enum ReviewExternalSyncStatus {
  Disabled = 'DISABLED',
  Failed = 'FAILED',
  Pending = 'PENDING',
  Synced = 'SYNCED'
}

export type ReviewIncentiveUpdateInput = {
  disclosure?: InputMaybe<Scalars['String']['input']>;
  isIncentivized: Scalars['Boolean']['input'];
};

export type ReviewMedia = Node & {
  __typename?: 'ReviewMedia';
  caption: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['DateTime']['output'];
  file: File;
  id: Scalars['ID']['output'];
  moderatedAt: Maybe<Scalars['DateTime']['output']>;
  moderatedByPrincipalId: Maybe<Scalars['String']['output']>;
  moderationNote: Maybe<Scalars['String']['output']>;
  review: Review;
  sortIndex: Scalars['Int']['output'];
  status: ReviewContentStatus;
  updatedAt: Scalars['DateTime']['output'];
};

export type ReviewMediaSyncItemInput = {
  caption?: InputMaybe<Scalars['String']['input']>;
  fileId: Scalars['ID']['input'];
  moderation?: InputMaybe<ReviewContentModerationInput>;
  sortIndex: Scalars['Int']['input'];
};

export enum ReviewModerationAction {
  Assigned = 'ASSIGNED',
  AutoFlagged = 'AUTO_FLAGGED',
  Deleted = 'DELETED',
  Edited = 'EDITED',
  Published = 'PUBLISHED',
  Redacted = 'REDACTED',
  Rejected = 'REJECTED',
  Restored = 'RESTORED',
  Submitted = 'SUBMITTED'
}

export type ReviewModerationCase = Node & {
  __typename?: 'ReviewModerationCase';
  assignedToPrincipalId: Maybe<Scalars['String']['output']>;
  content: ReviewContent;
  createdAt: Scalars['DateTime']['output'];
  dueAt: Maybe<Scalars['DateTime']['output']>;
  id: Scalars['ID']['output'];
  priority: Scalars['Int']['output'];
  reasonCode: Scalars['String']['output'];
  resolutionCode: Maybe<Scalars['String']['output']>;
  resolutionNote: Maybe<Scalars['String']['output']>;
  resolvedAt: Maybe<Scalars['DateTime']['output']>;
  resolvedByPrincipalId: Maybe<Scalars['String']['output']>;
  status: ReviewModerationCaseStatus;
  updatedAt: Scalars['DateTime']['output'];
};

export type ReviewModerationCaseConnection = {
  __typename?: 'ReviewModerationCaseConnection';
  edges: Array<ReviewModerationCaseEdge>;
  pageInfo: PageInfo;
  totalCount: Scalars['Int']['output'];
};

export type ReviewModerationCaseCreateInput = {
  assignedToPrincipalId?: InputMaybe<Scalars['String']['input']>;
  contentId: Scalars['ID']['input'];
  dueAt?: InputMaybe<Scalars['DateTime']['input']>;
  priority?: InputMaybe<Scalars['Int']['input']>;
  reasonCode: Scalars['String']['input'];
};

export type ReviewModerationCaseCreatePayload = {
  __typename?: 'ReviewModerationCaseCreatePayload';
  moderationCase: Maybe<ReviewModerationCase>;
  userErrors: Array<GenericUserError>;
};

export type ReviewModerationCaseDetailsInput = {
  assignedToPrincipalId?: InputMaybe<Scalars['String']['input']>;
  dueAt?: InputMaybe<Scalars['DateTime']['input']>;
  priority?: InputMaybe<Scalars['Int']['input']>;
  reasonCode?: InputMaybe<Scalars['String']['input']>;
};

export type ReviewModerationCaseEdge = {
  __typename?: 'ReviewModerationCaseEdge';
  cursor: Scalars['String']['output'];
  node: ReviewModerationCase;
};

/** Ordering configuration for ReviewModerationCase */
export type ReviewModerationCaseOrderByInput = {
  /** Sort direction */
  direction: SortDirection;
  /** Field to order by */
  field: ReviewModerationCaseOrderField;
};

/** Fields available for sorting ReviewModerationCase */
export enum ReviewModerationCaseOrderField {
  /** Sort by assignedToPrincipalId */
  AssignedToPrincipalId = 'assignedToPrincipalId',
  /** Sort by contentId */
  ContentId = 'contentId',
  /** Sort by createdAt */
  CreatedAt = 'createdAt',
  /** Sort by dueAt */
  DueAt = 'dueAt',
  /** Sort by id */
  Id = 'id',
  /** Sort by priority */
  Priority = 'priority',
  /** Sort by reasonCode */
  ReasonCode = 'reasonCode',
  /** Sort by resolutionCode */
  ResolutionCode = 'resolutionCode',
  /** Sort by resolvedAt */
  ResolvedAt = 'resolvedAt',
  /** Sort by resolvedByPrincipalId */
  ResolvedByPrincipalId = 'resolvedByPrincipalId',
  /** Sort by status */
  Status = 'status',
  /** Sort by updatedAt */
  UpdatedAt = 'updatedAt'
}

export type ReviewModerationCaseResolutionInput = {
  resolutionCode?: InputMaybe<Scalars['String']['input']>;
  resolutionNote?: InputMaybe<Scalars['String']['input']>;
  /** Must be RESOLVED or CANCELLED. */
  status: ReviewModerationCaseStatus;
};

export enum ReviewModerationCaseStatus {
  Cancelled = 'CANCELLED',
  InReview = 'IN_REVIEW',
  Open = 'OPEN',
  Resolved = 'RESOLVED'
}

export type ReviewModerationCaseUpdateInput = {
  details?: InputMaybe<ReviewModerationCaseDetailsInput>;
  resolution?: InputMaybe<ReviewModerationCaseResolutionInput>;
};

export type ReviewModerationCaseUpdatePayload = {
  __typename?: 'ReviewModerationCaseUpdatePayload';
  moderationCase: Maybe<ReviewModerationCase>;
  operationResults: Array<ReviewsOperationResult>;
  userErrors: Array<GenericUserError>;
};

/** Filter conditions for ReviewModerationCase */
export type ReviewModerationCaseWhereInput = {
  /** Logical AND of multiple conditions */
  _and?: InputMaybe<Array<ReviewModerationCaseWhereInput>>;
  /** Negate the condition */
  _not?: InputMaybe<ReviewModerationCaseWhereInput>;
  /** Logical OR of multiple conditions */
  _or?: InputMaybe<Array<ReviewModerationCaseWhereInput>>;
  /** Filter by assignedToPrincipalId */
  assignedToPrincipalId?: InputMaybe<StringFilter>;
  /** Filter by contentId */
  contentId?: InputMaybe<IdFilter>;
  /** Filter by createdAt */
  createdAt?: InputMaybe<DateTimeFilter>;
  /** Filter by dueAt */
  dueAt?: InputMaybe<DateTimeFilter>;
  /** Filter by id */
  id?: InputMaybe<IdFilter>;
  /** Filter by priority */
  priority?: InputMaybe<IntFilter>;
  /** Filter by reasonCode */
  reasonCode?: InputMaybe<StringFilter>;
  /** Filter by resolutionCode */
  resolutionCode?: InputMaybe<StringFilter>;
  /** Filter by resolvedAt */
  resolvedAt?: InputMaybe<DateTimeFilter>;
  /** Filter by resolvedByPrincipalId */
  resolvedByPrincipalId?: InputMaybe<StringFilter>;
  /** Filter by status */
  status?: InputMaybe<StringFilter>;
  /** Filter by updatedAt */
  updatedAt?: InputMaybe<DateTimeFilter>;
};

/** Append-only moderation timeline entry. */
export type ReviewModerationEvent = Node & {
  __typename?: 'ReviewModerationEvent';
  action: ReviewModerationAction;
  actorId: Maybe<Scalars['String']['output']>;
  actorType: Scalars['String']['output'];
  content: ReviewContent;
  createdAt: Scalars['DateTime']['output'];
  fromStatus: Maybe<ReviewContentStatus>;
  id: Scalars['ID']['output'];
  isAutomated: Scalars['Boolean']['output'];
  metadata: Scalars['JSON']['output'];
  moderationCase: Maybe<ReviewModerationCase>;
  note: Maybe<Scalars['String']['output']>;
  reasonCode: Maybe<Scalars['String']['output']>;
  toStatus: Maybe<ReviewContentStatus>;
};

export type ReviewModerationEventConnection = {
  __typename?: 'ReviewModerationEventConnection';
  edges: Array<ReviewModerationEventEdge>;
  pageInfo: PageInfo;
  totalCount: Scalars['Int']['output'];
};

export type ReviewModerationEventEdge = {
  __typename?: 'ReviewModerationEventEdge';
  cursor: Scalars['String']['output'];
  node: ReviewModerationEvent;
};

export enum ReviewModerationMode {
  Automated = 'AUTOMATED',
  Postmoderation = 'POSTMODERATION',
  Premoderation = 'PREMODERATION'
}

/** Immutable automated moderation evidence; it is not the moderation decision. */
export type ReviewModerationSignal = Node & {
  __typename?: 'ReviewModerationSignal';
  content: ReviewContent;
  createdAt: Scalars['DateTime']['output'];
  evidence: Scalars['JSON']['output'];
  id: Scalars['ID']['output'];
  modelVersion: Maybe<Scalars['String']['output']>;
  provider: Scalars['String']['output'];
  score: Maybe<Scalars['Float']['output']>;
  signalType: Scalars['String']['output'];
  verdict: ReviewModerationVerdict;
};

export type ReviewModerationSignalConnection = {
  __typename?: 'ReviewModerationSignalConnection';
  edges: Array<ReviewModerationSignalEdge>;
  pageInfo: PageInfo;
  totalCount: Scalars['Int']['output'];
};

export type ReviewModerationSignalEdge = {
  __typename?: 'ReviewModerationSignalEdge';
  cursor: Scalars['String']['output'];
  node: ReviewModerationSignal;
};

export enum ReviewModerationVerdict {
  Block = 'BLOCK',
  Pass = 'PASS',
  Review = 'REVIEW'
}

export enum ReviewNotificationChannel {
  Email = 'EMAIL',
  InApp = 'IN_APP',
  Push = 'PUSH',
  Sms = 'SMS'
}

/** Ordering configuration for Review */
export type ReviewOrderByInput = {
  /** Sort direction */
  direction: SortDirection;
  /** Field to order by */
  field: ReviewOrderField;
};

/** Fields available for sorting Review */
export enum ReviewOrderField {
  /** Sort by authorDisplayName */
  AuthorDisplayName = 'authorDisplayName',
  /** Sort by authorType */
  AuthorType = 'authorType',
  /** Sort by createdAt */
  CreatedAt = 'createdAt',
  /** Sort by deletedAt */
  DeletedAt = 'deletedAt',
  /** Sort by dislikeCount */
  DislikeCount = 'dislikeCount',
  /** Sort by id */
  Id = 'id',
  /** Sort by isIncentivized */
  IsIncentivized = 'isIncentivized',
  /** Sort by likeCount */
  LikeCount = 'likeCount',
  /** Sort by locale */
  Locale = 'locale',
  /** Sort by mediaCount */
  MediaCount = 'mediaCount',
  /** Sort by openReportCount */
  OpenReportCount = 'openReportCount',
  /** Sort by productId */
  ProductId = 'productId',
  /** Sort by publishedAt */
  PublishedAt = 'publishedAt',
  /** Sort by rating */
  Rating = 'rating',
  /** Sort by reportCount */
  ReportCount = 'reportCount',
  /** Sort by revision */
  Revision = 'revision',
  /** Sort by sourceChannel */
  SourceChannel = 'sourceChannel',
  /** Sort by status */
  Status = 'status',
  /** Sort by title */
  Title = 'title',
  /** Sort by updatedAt */
  UpdatedAt = 'updatedAt',
  /** Sort by variantId */
  VariantId = 'variantId',
  /** Sort by verificationStatus */
  VerificationStatus = 'verificationStatus'
}

export enum ReviewPublicationStatus {
  Draft = 'DRAFT',
  Failed = 'FAILED',
  Published = 'PUBLISHED',
  Scheduled = 'SCHEDULED',
  Unpublished = 'UNPUBLISHED'
}

export type ReviewRating = {
  __typename?: 'ReviewRating';
  createdAt: Scalars['DateTime']['output'];
  criterion: ReviewRatingCriterion;
  updatedAt: Scalars['DateTime']['output'];
  value: Scalars['Int']['output'];
};

export type ReviewRatingBreakdown = {
  __typename?: 'ReviewRatingBreakdown';
  rating1Count: Scalars['Int']['output'];
  rating2Count: Scalars['Int']['output'];
  rating3Count: Scalars['Int']['output'];
  rating4Count: Scalars['Int']['output'];
  rating5Count: Scalars['Int']['output'];
};

export type ReviewRatingCriterion = Node & {
  __typename?: 'ReviewRatingCriterion';
  appliesToAllProducts: Scalars['Boolean']['output'];
  assignments: Array<ReviewRatingCriterionAssignment>;
  code: Scalars['String']['output'];
  createdAt: Scalars['DateTime']['output'];
  defaultDescription: Maybe<Scalars['String']['output']>;
  defaultTitle: Scalars['String']['output'];
  deletedAt: Maybe<Scalars['DateTime']['output']>;
  id: Scalars['ID']['output'];
  isActive: Scalars['Boolean']['output'];
  isRequired: Scalars['Boolean']['output'];
  sortIndex: Scalars['Int']['output'];
  translations: Array<ReviewRatingCriterionTranslation>;
  updatedAt: Scalars['DateTime']['output'];
  weight: Scalars['Float']['output'];
};

export type ReviewRatingCriterionApplicabilityInput = {
  appliesToAllProducts: Scalars['Boolean']['input'];
};

export type ReviewRatingCriterionAssignment = Node & {
  __typename?: 'ReviewRatingCriterionAssignment';
  createdAt: Scalars['DateTime']['output'];
  criterion: ReviewRatingCriterion;
  id: Scalars['ID']['output'];
  isRequiredOverride: Maybe<Scalars['Boolean']['output']>;
  sortIndexOverride: Maybe<Scalars['Int']['output']>;
  target: ReviewRatingCriterionTarget;
  targetId: Scalars['ID']['output'];
  targetType: ReviewRatingCriterionTargetType;
};

export type ReviewRatingCriterionAssignmentInput = {
  isRequiredOverride?: InputMaybe<Scalars['Boolean']['input']>;
  sortIndexOverride?: InputMaybe<Scalars['Int']['input']>;
  targetId: Scalars['ID']['input'];
  targetType: ReviewRatingCriterionTargetType;
};

export type ReviewRatingCriterionConnection = {
  __typename?: 'ReviewRatingCriterionConnection';
  edges: Array<ReviewRatingCriterionEdge>;
  pageInfo: PageInfo;
  totalCount: Scalars['Int']['output'];
};

export type ReviewRatingCriterionCreateInput = {
  appliesToAllProducts?: InputMaybe<Scalars['Boolean']['input']>;
  assignments?: InputMaybe<Array<ReviewRatingCriterionAssignmentInput>>;
  code: Scalars['String']['input'];
  defaultDescription?: InputMaybe<Scalars['String']['input']>;
  defaultTitle: Scalars['String']['input'];
  isActive?: InputMaybe<Scalars['Boolean']['input']>;
  isRequired?: InputMaybe<Scalars['Boolean']['input']>;
  sortIndex?: InputMaybe<Scalars['Int']['input']>;
  translations?: InputMaybe<Array<ReviewRatingCriterionTranslationInput>>;
  weight?: InputMaybe<Scalars['Float']['input']>;
};

export type ReviewRatingCriterionCreatePayload = {
  __typename?: 'ReviewRatingCriterionCreatePayload';
  criterion: Maybe<ReviewRatingCriterion>;
  userErrors: Array<GenericUserError>;
};

export type ReviewRatingCriterionDefinitionInput = {
  code?: InputMaybe<Scalars['String']['input']>;
  defaultDescription?: InputMaybe<Scalars['String']['input']>;
  defaultTitle?: InputMaybe<Scalars['String']['input']>;
  isActive?: InputMaybe<Scalars['Boolean']['input']>;
  isRequired?: InputMaybe<Scalars['Boolean']['input']>;
  sortIndex?: InputMaybe<Scalars['Int']['input']>;
  weight?: InputMaybe<Scalars['Float']['input']>;
};

export type ReviewRatingCriterionDeleteInput = {
  expectedUpdatedAt: Scalars['DateTime']['input'];
  id: Scalars['ID']['input'];
  permanent?: InputMaybe<Scalars['Boolean']['input']>;
};

export type ReviewRatingCriterionDeletePayload = {
  __typename?: 'ReviewRatingCriterionDeletePayload';
  deletedCriterionId: Maybe<Scalars['ID']['output']>;
  userErrors: Array<GenericUserError>;
};

export type ReviewRatingCriterionEdge = {
  __typename?: 'ReviewRatingCriterionEdge';
  cursor: Scalars['String']['output'];
  node: ReviewRatingCriterion;
};

/** Ordering configuration for ReviewRatingCriterion */
export type ReviewRatingCriterionOrderByInput = {
  /** Sort direction */
  direction: SortDirection;
  /** Field to order by */
  field: ReviewRatingCriterionOrderField;
};

/** Fields available for sorting ReviewRatingCriterion */
export enum ReviewRatingCriterionOrderField {
  /** Sort by appliesToAllProducts */
  AppliesToAllProducts = 'appliesToAllProducts',
  /** Sort by code */
  Code = 'code',
  /** Sort by createdAt */
  CreatedAt = 'createdAt',
  /** Sort by defaultTitle */
  DefaultTitle = 'defaultTitle',
  /** Sort by deletedAt */
  DeletedAt = 'deletedAt',
  /** Sort by id */
  Id = 'id',
  /** Sort by isActive */
  IsActive = 'isActive',
  /** Sort by isRequired */
  IsRequired = 'isRequired',
  /** Sort by sortIndex */
  SortIndex = 'sortIndex',
  /** Sort by updatedAt */
  UpdatedAt = 'updatedAt',
  /** Sort by weight */
  Weight = 'weight'
}

export type ReviewRatingCriterionTarget = Category | Product;

export enum ReviewRatingCriterionTargetType {
  Category = 'CATEGORY',
  Product = 'PRODUCT'
}

export type ReviewRatingCriterionTranslation = {
  __typename?: 'ReviewRatingCriterionTranslation';
  createdAt: Scalars['DateTime']['output'];
  description: Maybe<Scalars['String']['output']>;
  locale: Scalars['String']['output'];
  title: Scalars['String']['output'];
  updatedAt: Scalars['DateTime']['output'];
};

export type ReviewRatingCriterionTranslationInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  locale: Scalars['String']['input'];
  title: Scalars['String']['input'];
};

export type ReviewRatingCriterionUpdateInput = {
  applicability?: InputMaybe<ReviewRatingCriterionApplicabilityInput>;
  /** Complete product/category assignment replacement when supplied. */
  assignments?: InputMaybe<Array<ReviewRatingCriterionAssignmentInput>>;
  definition?: InputMaybe<ReviewRatingCriterionDefinitionInput>;
  /** Complete translation replacement when supplied. */
  translations?: InputMaybe<Array<ReviewRatingCriterionTranslationInput>>;
};

export type ReviewRatingCriterionUpdatePayload = {
  __typename?: 'ReviewRatingCriterionUpdatePayload';
  criterion: Maybe<ReviewRatingCriterion>;
  operationResults: Array<ReviewsOperationResult>;
  userErrors: Array<GenericUserError>;
};

/** Filter conditions for ReviewRatingCriterion */
export type ReviewRatingCriterionWhereInput = {
  /** Logical AND of multiple conditions */
  _and?: InputMaybe<Array<ReviewRatingCriterionWhereInput>>;
  /** Negate the condition */
  _not?: InputMaybe<ReviewRatingCriterionWhereInput>;
  /** Logical OR of multiple conditions */
  _or?: InputMaybe<Array<ReviewRatingCriterionWhereInput>>;
  /** Filter by appliesToAllProducts */
  appliesToAllProducts?: InputMaybe<BooleanFilter>;
  /** Filter by code */
  code?: InputMaybe<StringFilter>;
  /** Filter by createdAt */
  createdAt?: InputMaybe<DateTimeFilter>;
  /** Filter by defaultTitle */
  defaultTitle?: InputMaybe<StringFilter>;
  /** Filter by deletedAt */
  deletedAt?: InputMaybe<DateTimeFilter>;
  /** Filter by id */
  id?: InputMaybe<IdFilter>;
  /** Filter by isActive */
  isActive?: InputMaybe<BooleanFilter>;
  /** Filter by isRequired */
  isRequired?: InputMaybe<BooleanFilter>;
  /** Filter by sortIndex */
  sortIndex?: InputMaybe<IntFilter>;
  /** Filter by updatedAt */
  updatedAt?: InputMaybe<DateTimeFilter>;
  /** Filter by weight */
  weight?: InputMaybe<FloatFilter>;
};

export type ReviewRatingUpdateInput = {
  /** Complete detailed criterion rating replacement when supplied. */
  criteria?: InputMaybe<Array<ReviewRatingValueInput>>;
  overall?: InputMaybe<Scalars['Int']['input']>;
};

export type ReviewRatingValueInput = {
  criterionId: Scalars['ID']['input'];
  value: Scalars['Int']['input'];
};

export type ReviewRepliesUpdateInput = {
  create?: InputMaybe<Array<ReviewReplyCreateOperationInput>>;
  delete?: InputMaybe<Array<ReviewReplyDeleteOperationInput>>;
  update?: InputMaybe<Array<ReviewReplyUpdateOperationInput>>;
};

export type ReviewReply = Node & ReviewContent & {
  __typename?: 'ReviewReply';
  author: ReviewContentAuthor;
  body: Scalars['String']['output'];
  createdAt: Scalars['DateTime']['output'];
  deletedAt: Maybe<Scalars['DateTime']['output']>;
  externalReferences: ReviewContentExternalReferenceConnection;
  id: Scalars['ID']['output'];
  idempotencyKey: Maybe<Scalars['String']['output']>;
  isOfficial: Scalars['Boolean']['output'];
  kind: ReviewContentKind;
  locale: Scalars['String']['output'];
  metrics: ReviewContentMetrics;
  moderatedAt: Maybe<Scalars['DateTime']['output']>;
  moderatedByPrincipalId: Maybe<Scalars['String']['output']>;
  moderationCases: ReviewModerationCaseConnection;
  moderationEvents: ReviewModerationEventConnection;
  moderationNote: Maybe<Scalars['String']['output']>;
  moderationSignals: ReviewModerationSignalConnection;
  publications: Array<ReviewContentPublication>;
  publishedAt: Maybe<Scalars['DateTime']['output']>;
  redactedAt: Maybe<Scalars['DateTime']['output']>;
  reports: ReviewContentReportConnection;
  review: Review;
  revision: Scalars['Int']['output'];
  revisions: ReviewContentRevisionConnection;
  sortIndex: Scalars['Int']['output'];
  sourceChannel: Scalars['String']['output'];
  sourceMetadata: Scalars['JSON']['output'];
  status: ReviewContentStatus;
  title: Maybe<Scalars['String']['output']>;
  translations: Array<ReviewContentTranslation>;
  unpublishedAt: Maybe<Scalars['DateTime']['output']>;
  updatedAt: Scalars['DateTime']['output'];
  votes: ReviewContentVoteConnection;
};


export type ReviewReplyExternalReferencesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


export type ReviewReplyModerationCasesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


export type ReviewReplyModerationEventsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


export type ReviewReplyModerationSignalsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


export type ReviewReplyReportsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


export type ReviewReplyRevisionsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


export type ReviewReplyVotesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};

export type ReviewReplyConnection = {
  __typename?: 'ReviewReplyConnection';
  edges: Array<ReviewReplyEdge>;
  pageInfo: PageInfo;
  totalCount: Scalars['Int']['output'];
};

export type ReviewReplyCreateOperationInput = {
  /** Client-provided correlation key returned in the operation result. */
  clientMutationId?: InputMaybe<Scalars['String']['input']>;
  content: ReviewContentCreateInput;
  isOfficial?: InputMaybe<Scalars['Boolean']['input']>;
  sortIndex?: InputMaybe<Scalars['Int']['input']>;
};

export type ReviewReplyDeleteOperationInput = {
  expectedRevision: Scalars['Int']['input'];
  /** Hard deletion is reserved for explicit privacy or retention workflows. */
  permanent?: InputMaybe<Scalars['Boolean']['input']>;
  replyId: Scalars['ID']['input'];
};

export type ReviewReplyEdge = {
  __typename?: 'ReviewReplyEdge';
  cursor: Scalars['String']['output'];
  node: ReviewReply;
};

/** Ordering configuration for ReviewReply */
export type ReviewReplyOrderByInput = {
  /** Sort direction */
  direction: SortDirection;
  /** Field to order by */
  field: ReviewReplyOrderField;
};

/** Fields available for sorting ReviewReply */
export enum ReviewReplyOrderField {
  /** Sort by authorType */
  AuthorType = 'authorType',
  /** Sort by createdAt */
  CreatedAt = 'createdAt',
  /** Sort by deletedAt */
  DeletedAt = 'deletedAt',
  /** Sort by id */
  Id = 'id',
  /** Sort by isOfficial */
  IsOfficial = 'isOfficial',
  /** Sort by locale */
  Locale = 'locale',
  /** Sort by reviewId */
  ReviewId = 'reviewId',
  /** Sort by revision */
  Revision = 'revision',
  /** Sort by sortIndex */
  SortIndex = 'sortIndex',
  /** Sort by status */
  Status = 'status',
  /** Sort by updatedAt */
  UpdatedAt = 'updatedAt'
}

export type ReviewReplyPropertiesUpdateInput = {
  isOfficial?: InputMaybe<Scalars['Boolean']['input']>;
  sortIndex?: InputMaybe<Scalars['Int']['input']>;
};

export type ReviewReplyUpdateInput = {
  /** Text, author, source, moderation, translations, and publications. */
  content?: InputMaybe<ReviewContentUpdateInput>;
  properties?: InputMaybe<ReviewReplyPropertiesUpdateInput>;
};

export type ReviewReplyUpdateOperationInput = {
  expectedRevision: Scalars['Int']['input'];
  operations: ReviewReplyUpdateInput;
  replyId: Scalars['ID']['input'];
};

/** Filter conditions for ReviewReply */
export type ReviewReplyWhereInput = {
  /** Logical AND of multiple conditions */
  _and?: InputMaybe<Array<ReviewReplyWhereInput>>;
  /** Negate the condition */
  _not?: InputMaybe<ReviewReplyWhereInput>;
  /** Logical OR of multiple conditions */
  _or?: InputMaybe<Array<ReviewReplyWhereInput>>;
  /** Filter by authorCustomerId */
  authorCustomerId?: InputMaybe<IdFilter>;
  /** Filter by authorType */
  authorType?: InputMaybe<StringFilter>;
  /** Filter by body */
  body?: InputMaybe<StringFilter>;
  /** Filter by createdAt */
  createdAt?: InputMaybe<DateTimeFilter>;
  /** Filter by deletedAt */
  deletedAt?: InputMaybe<DateTimeFilter>;
  /** Filter by id */
  id?: InputMaybe<IdFilter>;
  /** Filter by isOfficial */
  isOfficial?: InputMaybe<BooleanFilter>;
  /** Filter by locale */
  locale?: InputMaybe<StringFilter>;
  /** Filter by reviewId */
  reviewId?: InputMaybe<IdFilter>;
  /** Filter by revision */
  revision?: InputMaybe<IntFilter>;
  /** Filter by sortIndex */
  sortIndex?: InputMaybe<IntFilter>;
  /** Filter by status */
  status?: InputMaybe<StringFilter>;
  /** Filter by updatedAt */
  updatedAt?: InputMaybe<DateTimeFilter>;
};

export type ReviewRequest = Node & {
  __typename?: 'ReviewRequest';
  attemptCount: Scalars['Int']['output'];
  channel: ReviewNotificationChannel;
  createdAt: Scalars['DateTime']['output'];
  customer: Customer;
  deliveredAt: Maybe<Scalars['DateTime']['output']>;
  events: ReviewRequestEventConnection;
  expiresAt: Maybe<Scalars['DateTime']['output']>;
  id: Scalars['ID']['output'];
  lastError: Maybe<Scalars['String']['output']>;
  locale: Scalars['String']['output'];
  openedAt: Maybe<Scalars['DateTime']['output']>;
  orderId: Scalars['ID']['output'];
  orderLineId: Scalars['ID']['output'];
  product: Product;
  providerMessageId: Maybe<Scalars['String']['output']>;
  review: Maybe<Review>;
  scheduledAt: Scalars['DateTime']['output'];
  sentAt: Maybe<Scalars['DateTime']['output']>;
  sourceChannel: Scalars['String']['output'];
  status: ReviewRequestStatus;
  submittedAt: Maybe<Scalars['DateTime']['output']>;
  updatedAt: Scalars['DateTime']['output'];
  variant: Maybe<Variant>;
};


export type ReviewRequestEventsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};

export type ReviewRequestConnection = {
  __typename?: 'ReviewRequestConnection';
  edges: Array<ReviewRequestEdge>;
  pageInfo: PageInfo;
  totalCount: Scalars['Int']['output'];
};

export type ReviewRequestCreateInput = {
  channel: ReviewNotificationChannel;
  customerId: Scalars['ID']['input'];
  expiresAt?: InputMaybe<Scalars['DateTime']['input']>;
  idempotencyKey: Scalars['String']['input'];
  locale: Scalars['String']['input'];
  orderId: Scalars['ID']['input'];
  orderLineId: Scalars['ID']['input'];
  productId: Scalars['ID']['input'];
  scheduledAt: Scalars['DateTime']['input'];
  sourceChannel?: InputMaybe<Scalars['String']['input']>;
  variantId?: InputMaybe<Scalars['ID']['input']>;
};

export type ReviewRequestCreatePayload = {
  __typename?: 'ReviewRequestCreatePayload';
  reviewRequest: Maybe<ReviewRequest>;
  userErrors: Array<GenericUserError>;
};

export type ReviewRequestDeliveryUpdateInput = {
  channel?: InputMaybe<ReviewNotificationChannel>;
  locale?: InputMaybe<Scalars['String']['input']>;
};

export type ReviewRequestEdge = {
  __typename?: 'ReviewRequestEdge';
  cursor: Scalars['String']['output'];
  node: ReviewRequest;
};

export type ReviewRequestEvent = Node & {
  __typename?: 'ReviewRequestEvent';
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  metadata: Scalars['JSON']['output'];
  occurredAt: Scalars['DateTime']['output'];
  providerEventId: Maybe<Scalars['String']['output']>;
  reviewRequest: ReviewRequest;
  type: ReviewRequestEventType;
};

export type ReviewRequestEventConnection = {
  __typename?: 'ReviewRequestEventConnection';
  edges: Array<ReviewRequestEventEdge>;
  pageInfo: PageInfo;
  totalCount: Scalars['Int']['output'];
};

export type ReviewRequestEventEdge = {
  __typename?: 'ReviewRequestEventEdge';
  cursor: Scalars['String']['output'];
  node: ReviewRequestEvent;
};

export enum ReviewRequestEventType {
  Bounced = 'BOUNCED',
  Cancelled = 'CANCELLED',
  Clicked = 'CLICKED',
  Complained = 'COMPLAINED',
  Delivered = 'DELIVERED',
  Expired = 'EXPIRED',
  Failed = 'FAILED',
  Opened = 'OPENED',
  Scheduled = 'SCHEDULED',
  Sent = 'SENT',
  Submitted = 'SUBMITTED'
}

/** Ordering configuration for ReviewRequest */
export type ReviewRequestOrderByInput = {
  /** Sort direction */
  direction: SortDirection;
  /** Field to order by */
  field: ReviewRequestOrderField;
};

/** Fields available for sorting ReviewRequest */
export enum ReviewRequestOrderField {
  /** Sort by attemptCount */
  AttemptCount = 'attemptCount',
  /** Sort by channel */
  Channel = 'channel',
  /** Sort by createdAt */
  CreatedAt = 'createdAt',
  /** Sort by customerId */
  CustomerId = 'customerId',
  /** Sort by deliveredAt */
  DeliveredAt = 'deliveredAt',
  /** Sort by expiresAt */
  ExpiresAt = 'expiresAt',
  /** Sort by id */
  Id = 'id',
  /** Sort by locale */
  Locale = 'locale',
  /** Sort by openedAt */
  OpenedAt = 'openedAt',
  /** Sort by orderId */
  OrderId = 'orderId',
  /** Sort by orderLineId */
  OrderLineId = 'orderLineId',
  /** Sort by productId */
  ProductId = 'productId',
  /** Sort by providerMessageId */
  ProviderMessageId = 'providerMessageId',
  /** Sort by reviewId */
  ReviewId = 'reviewId',
  /** Sort by scheduledAt */
  ScheduledAt = 'scheduledAt',
  /** Sort by sentAt */
  SentAt = 'sentAt',
  /** Sort by sourceChannel */
  SourceChannel = 'sourceChannel',
  /** Sort by status */
  Status = 'status',
  /** Sort by submittedAt */
  SubmittedAt = 'submittedAt',
  /** Sort by updatedAt */
  UpdatedAt = 'updatedAt',
  /** Sort by variantId */
  VariantId = 'variantId'
}

export type ReviewRequestScheduleUpdateInput = {
  expiresAt?: InputMaybe<Scalars['DateTime']['input']>;
  scheduledAt: Scalars['DateTime']['input'];
};

export enum ReviewRequestStatus {
  Cancelled = 'CANCELLED',
  Delivered = 'DELIVERED',
  Expired = 'EXPIRED',
  Failed = 'FAILED',
  Opened = 'OPENED',
  Scheduled = 'SCHEDULED',
  Sent = 'SENT',
  Submitted = 'SUBMITTED'
}

export enum ReviewRequestTransitionAction {
  Cancel = 'CANCEL',
  Expire = 'EXPIRE',
  Reschedule = 'RESCHEDULE',
  Retry = 'RETRY'
}

export type ReviewRequestTransitionInput = {
  action: ReviewRequestTransitionAction;
  reason?: InputMaybe<Scalars['String']['input']>;
};

export type ReviewRequestUpdateInput = {
  delivery?: InputMaybe<ReviewRequestDeliveryUpdateInput>;
  schedule?: InputMaybe<ReviewRequestScheduleUpdateInput>;
  transition?: InputMaybe<ReviewRequestTransitionInput>;
};

export type ReviewRequestUpdatePayload = {
  __typename?: 'ReviewRequestUpdatePayload';
  operationResults: Array<ReviewsOperationResult>;
  reviewRequest: Maybe<ReviewRequest>;
  userErrors: Array<GenericUserError>;
};

/** Filter conditions for ReviewRequest */
export type ReviewRequestWhereInput = {
  /** Logical AND of multiple conditions */
  _and?: InputMaybe<Array<ReviewRequestWhereInput>>;
  /** Negate the condition */
  _not?: InputMaybe<ReviewRequestWhereInput>;
  /** Logical OR of multiple conditions */
  _or?: InputMaybe<Array<ReviewRequestWhereInput>>;
  /** Filter by attemptCount */
  attemptCount?: InputMaybe<IntFilter>;
  /** Filter by channel */
  channel?: InputMaybe<StringFilter>;
  /** Filter by createdAt */
  createdAt?: InputMaybe<DateTimeFilter>;
  /** Filter by customerId */
  customerId?: InputMaybe<IdFilter>;
  /** Filter by deliveredAt */
  deliveredAt?: InputMaybe<DateTimeFilter>;
  /** Filter by expiresAt */
  expiresAt?: InputMaybe<DateTimeFilter>;
  /** Filter by id */
  id?: InputMaybe<IdFilter>;
  /** Filter by locale */
  locale?: InputMaybe<StringFilter>;
  /** Filter by openedAt */
  openedAt?: InputMaybe<DateTimeFilter>;
  /** Filter by orderId */
  orderId?: InputMaybe<IdFilter>;
  /** Filter by orderLineId */
  orderLineId?: InputMaybe<IdFilter>;
  /** Filter by productId */
  productId?: InputMaybe<IdFilter>;
  /** Filter by providerMessageId */
  providerMessageId?: InputMaybe<StringFilter>;
  /** Filter by reviewId */
  reviewId?: InputMaybe<IdFilter>;
  /** Filter by scheduledAt */
  scheduledAt?: InputMaybe<DateTimeFilter>;
  /** Filter by sentAt */
  sentAt?: InputMaybe<DateTimeFilter>;
  /** Filter by sourceChannel */
  sourceChannel?: InputMaybe<StringFilter>;
  /** Filter by status */
  status?: InputMaybe<StringFilter>;
  /** Filter by submittedAt */
  submittedAt?: InputMaybe<DateTimeFilter>;
  /** Filter by updatedAt */
  updatedAt?: InputMaybe<DateTimeFilter>;
  /** Filter by variantId */
  variantId?: InputMaybe<IdFilter>;
};

export type ReviewStoreConfiguration = Node & {
  __typename?: 'ReviewStoreConfiguration';
  answerEditWindowHours: Scalars['Int']['output'];
  answerModerationMode: ReviewModerationMode;
  createdAt: Scalars['DateTime']['output'];
  customerAnswersEnabled: Scalars['Boolean']['output'];
  guestQuestionsEnabled: Scalars['Boolean']['output'];
  guestReviewsEnabled: Scalars['Boolean']['output'];
  id: Scalars['ID']['output'];
  maxAnswersPerQuestion: Scalars['Int']['output'];
  maxReviewMediaCount: Scalars['Int']['output'];
  questionEditWindowHours: Scalars['Int']['output'];
  questionModerationMode: ReviewModerationMode;
  questionsEnabled: Scalars['Boolean']['output'];
  reviewDuplicatePolicy: ReviewDuplicatePolicy;
  reviewEditWindowHours: Scalars['Int']['output'];
  reviewModerationMode: ReviewModerationMode;
  reviewRequestDelayDays: Scalars['Int']['output'];
  reviewRequestExpiryDays: Scalars['Int']['output'];
  reviewRequestsEnabled: Scalars['Boolean']['output'];
  reviewsEnabled: Scalars['Boolean']['output'];
  revision: Scalars['Int']['output'];
  updatedAt: Scalars['DateTime']['output'];
  verifiedPurchaseRequired: Scalars['Boolean']['output'];
};

export type ReviewStoreConfigurationUpdateInput = {
  answerEditWindowHours?: InputMaybe<Scalars['Int']['input']>;
  answerModerationMode?: InputMaybe<ReviewModerationMode>;
  customerAnswersEnabled?: InputMaybe<Scalars['Boolean']['input']>;
  guestQuestionsEnabled?: InputMaybe<Scalars['Boolean']['input']>;
  guestReviewsEnabled?: InputMaybe<Scalars['Boolean']['input']>;
  maxAnswersPerQuestion?: InputMaybe<Scalars['Int']['input']>;
  maxReviewMediaCount?: InputMaybe<Scalars['Int']['input']>;
  questionEditWindowHours?: InputMaybe<Scalars['Int']['input']>;
  questionModerationMode?: InputMaybe<ReviewModerationMode>;
  questionsEnabled?: InputMaybe<Scalars['Boolean']['input']>;
  reviewDuplicatePolicy?: InputMaybe<ReviewDuplicatePolicy>;
  reviewEditWindowHours?: InputMaybe<Scalars['Int']['input']>;
  reviewModerationMode?: InputMaybe<ReviewModerationMode>;
  reviewRequestDelayDays?: InputMaybe<Scalars['Int']['input']>;
  reviewRequestExpiryDays?: InputMaybe<Scalars['Int']['input']>;
  reviewRequestsEnabled?: InputMaybe<Scalars['Boolean']['input']>;
  reviewsEnabled?: InputMaybe<Scalars['Boolean']['input']>;
  verifiedPurchaseRequired?: InputMaybe<Scalars['Boolean']['input']>;
};

export type ReviewStoreConfigurationUpdatePayload = {
  __typename?: 'ReviewStoreConfigurationUpdatePayload';
  configuration: Maybe<ReviewStoreConfiguration>;
  operationResults: Array<ReviewsOperationResult>;
  userErrors: Array<GenericUserError>;
};

export type ReviewSubjectUpdateInput = {
  orderId?: InputMaybe<Scalars['ID']['input']>;
  orderLineId?: InputMaybe<Scalars['ID']['input']>;
  productId?: InputMaybe<Scalars['ID']['input']>;
  variantId?: InputMaybe<Scalars['ID']['input']>;
};

export enum ReviewTranslationSource {
  Human = 'HUMAN',
  Import = 'IMPORT',
  Machine = 'MACHINE'
}

/** Section-based aggregate update following Catalog productUpdate semantics. */
export type ReviewUpdateInput = {
  /** Text, author, source, moderation, translations, and publications. */
  content?: InputMaybe<ReviewContentUpdateInput>;
  incentive?: InputMaybe<ReviewIncentiveUpdateInput>;
  /** Complete media replacement when supplied. Empty removes every attachment. */
  media?: InputMaybe<Array<ReviewMediaSyncItemInput>>;
  rating?: InputMaybe<ReviewRatingUpdateInput>;
  /** Create, update, or delete replies owned by this review. */
  replies?: InputMaybe<ReviewRepliesUpdateInput>;
  subject?: InputMaybe<ReviewSubjectUpdateInput>;
  verification?: InputMaybe<ReviewVerificationUpdateInput>;
};

export type ReviewUpdatePayload = {
  __typename?: 'ReviewUpdatePayload';
  operationResults: Array<ReviewsOperationResult>;
  review: Maybe<Review>;
  userErrors: Array<GenericUserError>;
};

export enum ReviewVerificationStatus {
  Revoked = 'REVOKED',
  Unverified = 'UNVERIFIED',
  Verified = 'VERIFIED'
}

export type ReviewVerificationUpdateInput = {
  method?: InputMaybe<Scalars['String']['input']>;
  status: ReviewVerificationStatus;
  verifiedAt?: InputMaybe<Scalars['DateTime']['input']>;
};

/** Filter conditions for Review */
export type ReviewWhereInput = {
  /** Logical AND of multiple conditions */
  _and?: InputMaybe<Array<ReviewWhereInput>>;
  /** Negate the condition */
  _not?: InputMaybe<ReviewWhereInput>;
  /** Logical OR of multiple conditions */
  _or?: InputMaybe<Array<ReviewWhereInput>>;
  /** Filter by authorCustomerId */
  authorCustomerId?: InputMaybe<IdFilter>;
  /** Filter by authorDisplayName */
  authorDisplayName?: InputMaybe<StringFilter>;
  /** Filter by authorType */
  authorType?: InputMaybe<StringFilter>;
  /** Filter by body */
  body?: InputMaybe<StringFilter>;
  /** Filter by createdAt */
  createdAt?: InputMaybe<DateTimeFilter>;
  /** Filter by deletedAt */
  deletedAt?: InputMaybe<DateTimeFilter>;
  /** Filter by dislikeCount */
  dislikeCount?: InputMaybe<IntFilter>;
  /** Filter by id */
  id?: InputMaybe<IdFilter>;
  /** Filter by isIncentivized */
  isIncentivized?: InputMaybe<BooleanFilter>;
  /** Filter by likeCount */
  likeCount?: InputMaybe<IntFilter>;
  /** Filter by locale */
  locale?: InputMaybe<StringFilter>;
  /** Filter by mediaCount */
  mediaCount?: InputMaybe<IntFilter>;
  /** Filter by openReportCount */
  openReportCount?: InputMaybe<IntFilter>;
  /** Filter by orderId */
  orderId?: InputMaybe<IdFilter>;
  /** Filter by orderLineId */
  orderLineId?: InputMaybe<IdFilter>;
  /** Filter by productId */
  productId?: InputMaybe<IdFilter>;
  /** Filter by publishedAt */
  publishedAt?: InputMaybe<DateTimeFilter>;
  /** Filter by rating */
  rating?: InputMaybe<IntFilter>;
  /** Filter by reportCount */
  reportCount?: InputMaybe<IntFilter>;
  /** Filter by revision */
  revision?: InputMaybe<IntFilter>;
  /** Filter by sourceChannel */
  sourceChannel?: InputMaybe<StringFilter>;
  /** Filter by status */
  status?: InputMaybe<StringFilter>;
  /** Filter by title */
  title?: InputMaybe<StringFilter>;
  /** Filter by updatedAt */
  updatedAt?: InputMaybe<DateTimeFilter>;
  /** Filter by variantId */
  variantId?: InputMaybe<IdFilter>;
  /** Filter by verificationStatus */
  verificationStatus?: InputMaybe<StringFilter>;
};

/** Administrative commands. Storefront submission and engagement commands live elsewhere. */
export type ReviewsMutation = {
  __typename?: 'ReviewsMutation';
  contentExternalReferenceCreate: ReviewContentExternalReferenceCreatePayload;
  contentExternalReferenceDelete: ReviewContentExternalReferenceDeletePayload;
  contentExternalReferenceUpdate: ReviewContentExternalReferenceUpdatePayload;
  contentRedact: ReviewContentUpdatePayload;
  contentReportUpdate: ReviewContentReportUpdatePayload;
  contentRevisionRestore: ReviewContentUpdatePayload;
  moderationCaseCreate: ReviewModerationCaseCreatePayload;
  moderationCaseUpdate: ReviewModerationCaseUpdatePayload;
  productQuestionCreate: ProductQuestionCreatePayload;
  productQuestionDelete: ProductQuestionDeletePayload;
  productQuestionSubscriptionUpdate: ProductQuestionSubscriptionUpdatePayload;
  productQuestionUpdate: ProductQuestionUpdatePayload;
  ratingCriterionCreate: ReviewRatingCriterionCreatePayload;
  ratingCriterionDelete: ReviewRatingCriterionDeletePayload;
  ratingCriterionUpdate: ReviewRatingCriterionUpdatePayload;
  reviewCreate: ReviewCreatePayload;
  reviewDelete: ReviewDeletePayload;
  reviewRequestCreate: ReviewRequestCreatePayload;
  reviewRequestUpdate: ReviewRequestUpdatePayload;
  reviewUpdate: ReviewUpdatePayload;
  storeConfigurationUpdate: ReviewStoreConfigurationUpdatePayload;
};


/** Administrative commands. Storefront submission and engagement commands live elsewhere. */
export type ReviewsMutationContentExternalReferenceCreateArgs = {
  input: ReviewContentExternalReferenceCreateInput;
};


/** Administrative commands. Storefront submission and engagement commands live elsewhere. */
export type ReviewsMutationContentExternalReferenceDeleteArgs = {
  input: ReviewContentExternalReferenceDeleteInput;
};


/** Administrative commands. Storefront submission and engagement commands live elsewhere. */
export type ReviewsMutationContentExternalReferenceUpdateArgs = {
  expectedUpdatedAt: Scalars['DateTime']['input'];
  externalReferenceId: Scalars['ID']['input'];
  operations?: InputMaybe<ReviewContentExternalReferenceUpdateInput>;
};


/** Administrative commands. Storefront submission and engagement commands live elsewhere. */
export type ReviewsMutationContentRedactArgs = {
  contentId: Scalars['ID']['input'];
  expectedRevision: Scalars['Int']['input'];
};


/** Administrative commands. Storefront submission and engagement commands live elsewhere. */
export type ReviewsMutationContentReportUpdateArgs = {
  contentReportId: Scalars['ID']['input'];
  expectedUpdatedAt: Scalars['DateTime']['input'];
  operations?: InputMaybe<ReviewContentReportUpdateInput>;
};


/** Administrative commands. Storefront submission and engagement commands live elsewhere. */
export type ReviewsMutationContentRevisionRestoreArgs = {
  contentId: Scalars['ID']['input'];
  expectedRevision: Scalars['Int']['input'];
  revision: Scalars['Int']['input'];
};


/** Administrative commands. Storefront submission and engagement commands live elsewhere. */
export type ReviewsMutationModerationCaseCreateArgs = {
  input: ReviewModerationCaseCreateInput;
};


/** Administrative commands. Storefront submission and engagement commands live elsewhere. */
export type ReviewsMutationModerationCaseUpdateArgs = {
  expectedUpdatedAt: Scalars['DateTime']['input'];
  moderationCaseId: Scalars['ID']['input'];
  operations?: InputMaybe<ReviewModerationCaseUpdateInput>;
};


/** Administrative commands. Storefront submission and engagement commands live elsewhere. */
export type ReviewsMutationProductQuestionCreateArgs = {
  input: ProductQuestionCreateInput;
};


/** Administrative commands. Storefront submission and engagement commands live elsewhere. */
export type ReviewsMutationProductQuestionDeleteArgs = {
  input: ReviewContentDeleteInput;
};


/** Administrative commands. Storefront submission and engagement commands live elsewhere. */
export type ReviewsMutationProductQuestionSubscriptionUpdateArgs = {
  expectedUpdatedAt: Scalars['DateTime']['input'];
  operations?: InputMaybe<ProductQuestionSubscriptionUpdateInput>;
  subscriptionId: Scalars['ID']['input'];
};


/** Administrative commands. Storefront submission and engagement commands live elsewhere. */
export type ReviewsMutationProductQuestionUpdateArgs = {
  expectedRevision: Scalars['Int']['input'];
  operations?: InputMaybe<ProductQuestionUpdateInput>;
  productQuestionId: Scalars['ID']['input'];
};


/** Administrative commands. Storefront submission and engagement commands live elsewhere. */
export type ReviewsMutationRatingCriterionCreateArgs = {
  input: ReviewRatingCriterionCreateInput;
};


/** Administrative commands. Storefront submission and engagement commands live elsewhere. */
export type ReviewsMutationRatingCriterionDeleteArgs = {
  input: ReviewRatingCriterionDeleteInput;
};


/** Administrative commands. Storefront submission and engagement commands live elsewhere. */
export type ReviewsMutationRatingCriterionUpdateArgs = {
  criterionId: Scalars['ID']['input'];
  expectedUpdatedAt: Scalars['DateTime']['input'];
  operations?: InputMaybe<ReviewRatingCriterionUpdateInput>;
};


/** Administrative commands. Storefront submission and engagement commands live elsewhere. */
export type ReviewsMutationReviewCreateArgs = {
  input: ReviewCreateInput;
};


/** Administrative commands. Storefront submission and engagement commands live elsewhere. */
export type ReviewsMutationReviewDeleteArgs = {
  input: ReviewContentDeleteInput;
};


/** Administrative commands. Storefront submission and engagement commands live elsewhere. */
export type ReviewsMutationReviewRequestCreateArgs = {
  input: ReviewRequestCreateInput;
};


/** Administrative commands. Storefront submission and engagement commands live elsewhere. */
export type ReviewsMutationReviewRequestUpdateArgs = {
  expectedUpdatedAt: Scalars['DateTime']['input'];
  operations?: InputMaybe<ReviewRequestUpdateInput>;
  reviewRequestId: Scalars['ID']['input'];
};


/** Administrative commands. Storefront submission and engagement commands live elsewhere. */
export type ReviewsMutationReviewUpdateArgs = {
  expectedRevision: Scalars['Int']['input'];
  operations?: InputMaybe<ReviewUpdateInput>;
  reviewId: Scalars['ID']['input'];
};


/** Administrative commands. Storefront submission and engagement commands live elsewhere. */
export type ReviewsMutationStoreConfigurationUpdateArgs = {
  configurationId: Scalars['ID']['input'];
  expectedRevision: Scalars['Int']['input'];
  operations?: InputMaybe<ReviewStoreConfigurationUpdateInput>;
};

/** Result for one section of a unified update. */
export type ReviewsOperationResult = {
  __typename?: 'ReviewsOperationResult';
  applied: Scalars['Boolean']['output'];
  clientMutationId: Maybe<Scalars['String']['output']>;
  entityId: Maybe<Scalars['ID']['output']>;
  errors: Array<GenericUserError>;
  type: ReviewsOperationType;
};

/** Logical sections executed by unified admin update workflows. */
export enum ReviewsOperationType {
  ContentAuthorUpdate = 'CONTENT_AUTHOR_UPDATE',
  ContentExternalReferenceUpdate = 'CONTENT_EXTERNAL_REFERENCE_UPDATE',
  ContentModerationUpdate = 'CONTENT_MODERATION_UPDATE',
  ContentPublicationsSync = 'CONTENT_PUBLICATIONS_SYNC',
  ContentRedact = 'CONTENT_REDACT',
  ContentReportUpdate = 'CONTENT_REPORT_UPDATE',
  ContentRevisionRestore = 'CONTENT_REVISION_RESTORE',
  ContentSourceUpdate = 'CONTENT_SOURCE_UPDATE',
  ContentTranslationsSync = 'CONTENT_TRANSLATIONS_SYNC',
  ContentUpdate = 'CONTENT_UPDATE',
  ModerationCaseUpdate = 'MODERATION_CASE_UPDATE',
  ProductQuestionAnswerCreate = 'PRODUCT_QUESTION_ANSWER_CREATE',
  ProductQuestionAnswerDelete = 'PRODUCT_QUESTION_ANSWER_DELETE',
  ProductQuestionAnswerUpdate = 'PRODUCT_QUESTION_ANSWER_UPDATE',
  ProductQuestionSubscriptionUpdate = 'PRODUCT_QUESTION_SUBSCRIPTION_UPDATE',
  ProductQuestionUpdate = 'PRODUCT_QUESTION_UPDATE',
  RatingCriterionApplicabilityUpdate = 'RATING_CRITERION_APPLICABILITY_UPDATE',
  RatingCriterionAssignmentsSync = 'RATING_CRITERION_ASSIGNMENTS_SYNC',
  RatingCriterionDefinitionUpdate = 'RATING_CRITERION_DEFINITION_UPDATE',
  RatingCriterionTranslationsSync = 'RATING_CRITERION_TRANSLATIONS_SYNC',
  ReviewIncentiveUpdate = 'REVIEW_INCENTIVE_UPDATE',
  ReviewMediaSync = 'REVIEW_MEDIA_SYNC',
  ReviewRatingUpdate = 'REVIEW_RATING_UPDATE',
  ReviewReplyCreate = 'REVIEW_REPLY_CREATE',
  ReviewReplyDelete = 'REVIEW_REPLY_DELETE',
  ReviewReplyUpdate = 'REVIEW_REPLY_UPDATE',
  ReviewRequestUpdate = 'REVIEW_REQUEST_UPDATE',
  ReviewSubjectUpdate = 'REVIEW_SUBJECT_UPDATE',
  ReviewVerificationUpdate = 'REVIEW_VERIFICATION_UPDATE',
  StoreConfigurationUpdate = 'STORE_CONFIGURATION_UPDATE'
}

/** Administrative reads for review, Q&A, moderation, and configuration data. */
export type ReviewsQuery = {
  __typename?: 'ReviewsQuery';
  /** Any moderated content aggregate owned by Reviews. */
  content: Maybe<ReviewContent>;
  contentExternalReference: Maybe<ReviewContentExternalReference>;
  contentExternalReferences: ReviewContentExternalReferenceConnection;
  contentReport: Maybe<ReviewContentReport>;
  contentReports: ReviewContentReportConnection;
  contents: ReviewContentConnection;
  moderationCase: Maybe<ReviewModerationCase>;
  moderationCases: ReviewModerationCaseConnection;
  /** Resolve a Reviews-owned node by global ID. */
  node: Maybe<Node>;
  /** Resolve multiple Reviews-owned nodes while preserving input order. */
  nodes: Array<Maybe<Node>>;
  productQuestion: Maybe<ProductQuestion>;
  productQuestionAnswer: Maybe<ProductQuestionAnswer>;
  productQuestionAnswers: ProductQuestionAnswerConnection;
  productQuestions: ProductQuestionConnection;
  ratingCriteria: ReviewRatingCriterionConnection;
  ratingCriterion: Maybe<ReviewRatingCriterion>;
  review: Maybe<Review>;
  reviewReplies: ReviewReplyConnection;
  reviewReply: Maybe<ReviewReply>;
  reviewRequest: Maybe<ReviewRequest>;
  reviewRequests: ReviewRequestConnection;
  reviews: ReviewConnection;
  /** Current store review and Q&A configuration. */
  storeConfiguration: Maybe<ReviewStoreConfiguration>;
};


/** Administrative reads for review, Q&A, moderation, and configuration data. */
export type ReviewsQueryContentArgs = {
  id: Scalars['ID']['input'];
};


/** Administrative reads for review, Q&A, moderation, and configuration data. */
export type ReviewsQueryContentExternalReferenceArgs = {
  id: Scalars['ID']['input'];
};


/** Administrative reads for review, Q&A, moderation, and configuration data. */
export type ReviewsQueryContentExternalReferencesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<ReviewContentExternalReferenceOrderByInput>>;
  where?: InputMaybe<ReviewContentExternalReferenceWhereInput>;
};


/** Administrative reads for review, Q&A, moderation, and configuration data. */
export type ReviewsQueryContentReportArgs = {
  id: Scalars['ID']['input'];
};


/** Administrative reads for review, Q&A, moderation, and configuration data. */
export type ReviewsQueryContentReportsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<ReviewContentReportOrderByInput>>;
  where?: InputMaybe<ReviewContentReportWhereInput>;
};


/** Administrative reads for review, Q&A, moderation, and configuration data. */
export type ReviewsQueryContentsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  meta?: InputMaybe<ReviewContentConnectionMetaInput>;
  orderBy?: InputMaybe<Array<ReviewContentOrderByInput>>;
  where?: InputMaybe<ReviewContentWhereInput>;
};


/** Administrative reads for review, Q&A, moderation, and configuration data. */
export type ReviewsQueryModerationCaseArgs = {
  id: Scalars['ID']['input'];
};


/** Administrative reads for review, Q&A, moderation, and configuration data. */
export type ReviewsQueryModerationCasesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<ReviewModerationCaseOrderByInput>>;
  where?: InputMaybe<ReviewModerationCaseWhereInput>;
};


/** Administrative reads for review, Q&A, moderation, and configuration data. */
export type ReviewsQueryNodeArgs = {
  id: Scalars['ID']['input'];
};


/** Administrative reads for review, Q&A, moderation, and configuration data. */
export type ReviewsQueryNodesArgs = {
  ids: Array<Scalars['ID']['input']>;
};


/** Administrative reads for review, Q&A, moderation, and configuration data. */
export type ReviewsQueryProductQuestionArgs = {
  id: Scalars['ID']['input'];
};


/** Administrative reads for review, Q&A, moderation, and configuration data. */
export type ReviewsQueryProductQuestionAnswerArgs = {
  id: Scalars['ID']['input'];
};


/** Administrative reads for review, Q&A, moderation, and configuration data. */
export type ReviewsQueryProductQuestionAnswersArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  meta?: InputMaybe<ReviewContentConnectionMetaInput>;
  orderBy?: InputMaybe<Array<ProductQuestionAnswerOrderByInput>>;
  where?: InputMaybe<ProductQuestionAnswerWhereInput>;
};


/** Administrative reads for review, Q&A, moderation, and configuration data. */
export type ReviewsQueryProductQuestionsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  meta?: InputMaybe<ReviewContentConnectionMetaInput>;
  orderBy?: InputMaybe<Array<ProductQuestionOrderByInput>>;
  where?: InputMaybe<ProductQuestionWhereInput>;
};


/** Administrative reads for review, Q&A, moderation, and configuration data. */
export type ReviewsQueryRatingCriteriaArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<ReviewRatingCriterionOrderByInput>>;
  where?: InputMaybe<ReviewRatingCriterionWhereInput>;
};


/** Administrative reads for review, Q&A, moderation, and configuration data. */
export type ReviewsQueryRatingCriterionArgs = {
  id: Scalars['ID']['input'];
};


/** Administrative reads for review, Q&A, moderation, and configuration data. */
export type ReviewsQueryReviewArgs = {
  id: Scalars['ID']['input'];
};


/** Administrative reads for review, Q&A, moderation, and configuration data. */
export type ReviewsQueryReviewRepliesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  meta?: InputMaybe<ReviewContentConnectionMetaInput>;
  orderBy?: InputMaybe<Array<ReviewReplyOrderByInput>>;
  where?: InputMaybe<ReviewReplyWhereInput>;
};


/** Administrative reads for review, Q&A, moderation, and configuration data. */
export type ReviewsQueryReviewReplyArgs = {
  id: Scalars['ID']['input'];
};


/** Administrative reads for review, Q&A, moderation, and configuration data. */
export type ReviewsQueryReviewRequestArgs = {
  id: Scalars['ID']['input'];
};


/** Administrative reads for review, Q&A, moderation, and configuration data. */
export type ReviewsQueryReviewRequestsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<ReviewRequestOrderByInput>>;
  where?: InputMaybe<ReviewRequestWhereInput>;
};


/** Administrative reads for review, Q&A, moderation, and configuration data. */
export type ReviewsQueryReviewsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  meta?: InputMaybe<ReviewContentConnectionMetaInput>;
  orderBy?: InputMaybe<Array<ReviewOrderByInput>>;
  where?: InputMaybe<ReviewWhereInput>;
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

export type Variant = Node & {
  __typename?: 'Variant';
  id: Scalars['ID']['output'];
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

/** Product widgets contributed by the Reviews service. */
export type WidgetQuery = {
  __typename?: 'WidgetQuery';
  /** Aggregated reviews and Q&A data for a product. */
  reviews: ProductReviewsWidget;
};


/** Product widgets contributed by the Reviews service. */
export type WidgetQueryReviewsArgs = {
  productId: Scalars['ID']['input'];
};

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

/** Mapping of union types */
export type ResolversUnionTypes<_RefType extends Record<string, unknown>> = ResolversObject<{
  ReviewRatingCriterionTarget: ( Category ) | ( Product );
}>;

/** Mapping of interface types */
export type ResolversInterfaceTypes<_RefType extends Record<string, unknown>> = ResolversObject<{
  Node: ( Category ) | ( Customer ) | ( File ) | ( Product ) | ( Omit<ProductQuestion, 'answers' | 'externalReferences' | 'moderationCases' | 'moderationEvents' | 'moderationSignals' | 'publications' | 'reports' | 'revisions' | 'subscriptions' | 'translations' | 'votes'> & { answers: _RefType['ProductQuestionAnswerConnection'], externalReferences: _RefType['ReviewContentExternalReferenceConnection'], moderationCases: _RefType['ReviewModerationCaseConnection'], moderationEvents: _RefType['ReviewModerationEventConnection'], moderationSignals: _RefType['ReviewModerationSignalConnection'], publications: Array<_RefType['ReviewContentPublication']>, reports: _RefType['ReviewContentReportConnection'], revisions: _RefType['ReviewContentRevisionConnection'], subscriptions: _RefType['ProductQuestionSubscriptionConnection'], translations: Array<_RefType['ReviewContentTranslation']>, votes: _RefType['ReviewContentVoteConnection'] } ) | ( Omit<ProductQuestionAnswer, 'externalReferences' | 'moderationCases' | 'moderationEvents' | 'moderationSignals' | 'publications' | 'question' | 'reports' | 'revisions' | 'translations' | 'votes'> & { externalReferences: _RefType['ReviewContentExternalReferenceConnection'], moderationCases: _RefType['ReviewModerationCaseConnection'], moderationEvents: _RefType['ReviewModerationEventConnection'], moderationSignals: _RefType['ReviewModerationSignalConnection'], publications: Array<_RefType['ReviewContentPublication']>, question: _RefType['ProductQuestion'], reports: _RefType['ReviewContentReportConnection'], revisions: _RefType['ReviewContentRevisionConnection'], translations: Array<_RefType['ReviewContentTranslation']>, votes: _RefType['ReviewContentVoteConnection'] } ) | ( Omit<ProductQuestionSubscription, 'question'> & { question: _RefType['ProductQuestion'] } ) | ( Omit<Review, 'externalReferences' | 'media' | 'moderationCases' | 'moderationEvents' | 'moderationSignals' | 'publications' | 'ratings' | 'replies' | 'reports' | 'revisions' | 'translations' | 'votes'> & { externalReferences: _RefType['ReviewContentExternalReferenceConnection'], media: Array<_RefType['ReviewMedia']>, moderationCases: _RefType['ReviewModerationCaseConnection'], moderationEvents: _RefType['ReviewModerationEventConnection'], moderationSignals: _RefType['ReviewModerationSignalConnection'], publications: Array<_RefType['ReviewContentPublication']>, ratings: Array<_RefType['ReviewRating']>, replies: _RefType['ReviewReplyConnection'], reports: _RefType['ReviewContentReportConnection'], revisions: _RefType['ReviewContentRevisionConnection'], translations: Array<_RefType['ReviewContentTranslation']>, votes: _RefType['ReviewContentVoteConnection'] } ) | ( Omit<ReviewContentExternalReference, 'content'> & { content: _RefType['ReviewContent'] } ) | ( Omit<ReviewContentPublication, 'content'> & { content: _RefType['ReviewContent'] } ) | ( Omit<ReviewContentReport, 'content'> & { content: _RefType['ReviewContent'] } ) | ( Omit<ReviewContentRevision, 'content'> & { content: _RefType['ReviewContent'] } ) | ( Omit<ReviewContentTranslation, 'content'> & { content: _RefType['ReviewContent'] } ) | ( Omit<ReviewContentVote, 'content'> & { content: _RefType['ReviewContent'] } ) | ( Omit<ReviewMedia, 'file' | 'review'> & { file: _RefType['File'], review: _RefType['Review'] } ) | ( Omit<ReviewModerationCase, 'content'> & { content: _RefType['ReviewContent'] } ) | ( Omit<ReviewModerationEvent, 'content' | 'moderationCase'> & { content: _RefType['ReviewContent'], moderationCase?: Maybe<_RefType['ReviewModerationCase']> } ) | ( Omit<ReviewModerationSignal, 'content'> & { content: _RefType['ReviewContent'] } ) | ( Omit<ReviewRatingCriterion, 'assignments'> & { assignments: Array<_RefType['ReviewRatingCriterionAssignment']> } ) | ( Omit<ReviewRatingCriterionAssignment, 'criterion' | 'target'> & { criterion: _RefType['ReviewRatingCriterion'], target: _RefType['ReviewRatingCriterionTarget'] } ) | ( Omit<ReviewReply, 'externalReferences' | 'moderationCases' | 'moderationEvents' | 'moderationSignals' | 'publications' | 'reports' | 'review' | 'revisions' | 'translations' | 'votes'> & { externalReferences: _RefType['ReviewContentExternalReferenceConnection'], moderationCases: _RefType['ReviewModerationCaseConnection'], moderationEvents: _RefType['ReviewModerationEventConnection'], moderationSignals: _RefType['ReviewModerationSignalConnection'], publications: Array<_RefType['ReviewContentPublication']>, reports: _RefType['ReviewContentReportConnection'], review: _RefType['Review'], revisions: _RefType['ReviewContentRevisionConnection'], translations: Array<_RefType['ReviewContentTranslation']>, votes: _RefType['ReviewContentVoteConnection'] } ) | ( Omit<ReviewRequest, 'events' | 'review'> & { events: _RefType['ReviewRequestEventConnection'], review?: Maybe<_RefType['Review']> } ) | ( Omit<ReviewRequestEvent, 'reviewRequest'> & { reviewRequest: _RefType['ReviewRequest'] } ) | ( ReviewStoreConfiguration ) | ( Variant );
  ReviewContent: ( Omit<ProductQuestion, 'answers' | 'externalReferences' | 'moderationCases' | 'moderationEvents' | 'moderationSignals' | 'publications' | 'reports' | 'revisions' | 'subscriptions' | 'translations' | 'votes'> & { answers: _RefType['ProductQuestionAnswerConnection'], externalReferences: _RefType['ReviewContentExternalReferenceConnection'], moderationCases: _RefType['ReviewModerationCaseConnection'], moderationEvents: _RefType['ReviewModerationEventConnection'], moderationSignals: _RefType['ReviewModerationSignalConnection'], publications: Array<_RefType['ReviewContentPublication']>, reports: _RefType['ReviewContentReportConnection'], revisions: _RefType['ReviewContentRevisionConnection'], subscriptions: _RefType['ProductQuestionSubscriptionConnection'], translations: Array<_RefType['ReviewContentTranslation']>, votes: _RefType['ReviewContentVoteConnection'] } ) | ( Omit<ProductQuestionAnswer, 'externalReferences' | 'moderationCases' | 'moderationEvents' | 'moderationSignals' | 'publications' | 'question' | 'reports' | 'revisions' | 'translations' | 'votes'> & { externalReferences: _RefType['ReviewContentExternalReferenceConnection'], moderationCases: _RefType['ReviewModerationCaseConnection'], moderationEvents: _RefType['ReviewModerationEventConnection'], moderationSignals: _RefType['ReviewModerationSignalConnection'], publications: Array<_RefType['ReviewContentPublication']>, question: _RefType['ProductQuestion'], reports: _RefType['ReviewContentReportConnection'], revisions: _RefType['ReviewContentRevisionConnection'], translations: Array<_RefType['ReviewContentTranslation']>, votes: _RefType['ReviewContentVoteConnection'] } ) | ( Omit<Review, 'externalReferences' | 'media' | 'moderationCases' | 'moderationEvents' | 'moderationSignals' | 'publications' | 'ratings' | 'replies' | 'reports' | 'revisions' | 'translations' | 'votes'> & { externalReferences: _RefType['ReviewContentExternalReferenceConnection'], media: Array<_RefType['ReviewMedia']>, moderationCases: _RefType['ReviewModerationCaseConnection'], moderationEvents: _RefType['ReviewModerationEventConnection'], moderationSignals: _RefType['ReviewModerationSignalConnection'], publications: Array<_RefType['ReviewContentPublication']>, ratings: Array<_RefType['ReviewRating']>, replies: _RefType['ReviewReplyConnection'], reports: _RefType['ReviewContentReportConnection'], revisions: _RefType['ReviewContentRevisionConnection'], translations: Array<_RefType['ReviewContentTranslation']>, votes: _RefType['ReviewContentVoteConnection'] } ) | ( Omit<ReviewReply, 'externalReferences' | 'moderationCases' | 'moderationEvents' | 'moderationSignals' | 'publications' | 'reports' | 'review' | 'revisions' | 'translations' | 'votes'> & { externalReferences: _RefType['ReviewContentExternalReferenceConnection'], moderationCases: _RefType['ReviewModerationCaseConnection'], moderationEvents: _RefType['ReviewModerationEventConnection'], moderationSignals: _RefType['ReviewModerationSignalConnection'], publications: Array<_RefType['ReviewContentPublication']>, reports: _RefType['ReviewContentReportConnection'], review: _RefType['Review'], revisions: _RefType['ReviewContentRevisionConnection'], translations: Array<_RefType['ReviewContentTranslation']>, votes: _RefType['ReviewContentVoteConnection'] } );
  UserError: ( GenericUserError );
}>;

/** Mapping between all available schema types and the resolvers types */
export type ResolversTypes = ResolversObject<{
  BigInt: ResolverTypeWrapper<Scalars['BigInt']['output']>;
  BooleanFilter: BooleanFilter;
  Boolean: ResolverTypeWrapper<Scalars['Boolean']['output']>;
  Category: ResolverTypeWrapper<Category>;
  ID: ResolverTypeWrapper<Scalars['ID']['output']>;
  CurrencyCode: CurrencyCode;
  Customer: ResolverTypeWrapper<Customer>;
  DateTime: ResolverTypeWrapper<Scalars['DateTime']['output']>;
  DateTimeFilter: DateTimeFilter;
  DimensionUnit: DimensionUnit;
  Email: ResolverTypeWrapper<Scalars['Email']['output']>;
  File: ResolverTypeWrapper<File>;
  FloatFilter: FloatFilter;
  Float: ResolverTypeWrapper<Scalars['Float']['output']>;
  GenericUserError: ResolverTypeWrapper<GenericUserError>;
  String: ResolverTypeWrapper<Scalars['String']['output']>;
  IDFilter: IdFilter;
  IntFilter: IntFilter;
  Int: ResolverTypeWrapper<Scalars['Int']['output']>;
  JSON: ResolverTypeWrapper<Scalars['JSON']['output']>;
  LocaleCode: LocaleCode;
  Mutation: ResolverTypeWrapper<{}>;
  Node: ResolverTypeWrapper<ResolversInterfaceTypes<ResolversTypes>['Node']>;
  PageInfo: ResolverTypeWrapper<PageInfo>;
  Product: ResolverTypeWrapper<Product>;
  ProductQuestion: ResolverTypeWrapper<Omit<ProductQuestion, 'answers' | 'externalReferences' | 'moderationCases' | 'moderationEvents' | 'moderationSignals' | 'publications' | 'reports' | 'revisions' | 'subscriptions' | 'translations' | 'votes'> & { answers: ResolversTypes['ProductQuestionAnswerConnection'], externalReferences: ResolversTypes['ReviewContentExternalReferenceConnection'], moderationCases: ResolversTypes['ReviewModerationCaseConnection'], moderationEvents: ResolversTypes['ReviewModerationEventConnection'], moderationSignals: ResolversTypes['ReviewModerationSignalConnection'], publications: Array<ResolversTypes['ReviewContentPublication']>, reports: ResolversTypes['ReviewContentReportConnection'], revisions: ResolversTypes['ReviewContentRevisionConnection'], subscriptions: ResolversTypes['ProductQuestionSubscriptionConnection'], translations: Array<ResolversTypes['ReviewContentTranslation']>, votes: ResolversTypes['ReviewContentVoteConnection'] }>;
  ProductQuestionAnswer: ResolverTypeWrapper<Omit<ProductQuestionAnswer, 'externalReferences' | 'moderationCases' | 'moderationEvents' | 'moderationSignals' | 'publications' | 'question' | 'reports' | 'revisions' | 'translations' | 'votes'> & { externalReferences: ResolversTypes['ReviewContentExternalReferenceConnection'], moderationCases: ResolversTypes['ReviewModerationCaseConnection'], moderationEvents: ResolversTypes['ReviewModerationEventConnection'], moderationSignals: ResolversTypes['ReviewModerationSignalConnection'], publications: Array<ResolversTypes['ReviewContentPublication']>, question: ResolversTypes['ProductQuestion'], reports: ResolversTypes['ReviewContentReportConnection'], revisions: ResolversTypes['ReviewContentRevisionConnection'], translations: Array<ResolversTypes['ReviewContentTranslation']>, votes: ResolversTypes['ReviewContentVoteConnection'] }>;
  ProductQuestionAnswerConnection: ResolverTypeWrapper<Omit<ProductQuestionAnswerConnection, 'edges'> & { edges: Array<ResolversTypes['ProductQuestionAnswerEdge']> }>;
  ProductQuestionAnswerCreateOperationInput: ProductQuestionAnswerCreateOperationInput;
  ProductQuestionAnswerDeleteOperationInput: ProductQuestionAnswerDeleteOperationInput;
  ProductQuestionAnswerEdge: ResolverTypeWrapper<Omit<ProductQuestionAnswerEdge, 'node'> & { node: ResolversTypes['ProductQuestionAnswer'] }>;
  ProductQuestionAnswerOrderByInput: ProductQuestionAnswerOrderByInput;
  ProductQuestionAnswerOrderField: ProductQuestionAnswerOrderField;
  ProductQuestionAnswerPropertiesUpdateInput: ProductQuestionAnswerPropertiesUpdateInput;
  ProductQuestionAnswerState: ProductQuestionAnswerState;
  ProductQuestionAnswerUpdateInput: ProductQuestionAnswerUpdateInput;
  ProductQuestionAnswerUpdateOperationInput: ProductQuestionAnswerUpdateOperationInput;
  ProductQuestionAnswerWhereInput: ProductQuestionAnswerWhereInput;
  ProductQuestionAnswersUpdateInput: ProductQuestionAnswersUpdateInput;
  ProductQuestionConnection: ResolverTypeWrapper<Omit<ProductQuestionConnection, 'edges'> & { edges: Array<ResolversTypes['ProductQuestionEdge']> }>;
  ProductQuestionCreateInput: ProductQuestionCreateInput;
  ProductQuestionCreatePayload: ResolverTypeWrapper<Omit<ProductQuestionCreatePayload, 'productQuestion'> & { productQuestion?: Maybe<ResolversTypes['ProductQuestion']> }>;
  ProductQuestionDeletePayload: ResolverTypeWrapper<ProductQuestionDeletePayload>;
  ProductQuestionEdge: ResolverTypeWrapper<Omit<ProductQuestionEdge, 'node'> & { node: ResolversTypes['ProductQuestion'] }>;
  ProductQuestionOrderByInput: ProductQuestionOrderByInput;
  ProductQuestionOrderField: ProductQuestionOrderField;
  ProductQuestionSubjectUpdateInput: ProductQuestionSubjectUpdateInput;
  ProductQuestionSubscription: ResolverTypeWrapper<Omit<ProductQuestionSubscription, 'question'> & { question: ResolversTypes['ProductQuestion'] }>;
  ProductQuestionSubscriptionConnection: ResolverTypeWrapper<Omit<ProductQuestionSubscriptionConnection, 'edges'> & { edges: Array<ResolversTypes['ProductQuestionSubscriptionEdge']> }>;
  ProductQuestionSubscriptionEdge: ResolverTypeWrapper<Omit<ProductQuestionSubscriptionEdge, 'node'> & { node: ResolversTypes['ProductQuestionSubscription'] }>;
  ProductQuestionSubscriptionStatus: ProductQuestionSubscriptionStatus;
  ProductQuestionSubscriptionUpdateInput: ProductQuestionSubscriptionUpdateInput;
  ProductQuestionSubscriptionUpdatePayload: ResolverTypeWrapper<Omit<ProductQuestionSubscriptionUpdatePayload, 'subscription'> & { subscription?: Maybe<ResolversTypes['ProductQuestionSubscription']> }>;
  ProductQuestionSummary: ResolverTypeWrapper<ProductQuestionSummary>;
  ProductQuestionUpdateInput: ProductQuestionUpdateInput;
  ProductQuestionUpdatePayload: ResolverTypeWrapper<Omit<ProductQuestionUpdatePayload, 'productQuestion'> & { productQuestion?: Maybe<ResolversTypes['ProductQuestion']> }>;
  ProductQuestionWhereInput: ProductQuestionWhereInput;
  ProductRatingCriterionSummary: ResolverTypeWrapper<Omit<ProductRatingCriterionSummary, 'criterion'> & { criterion: ResolversTypes['ReviewRatingCriterion'] }>;
  ProductReviewSummary: ResolverTypeWrapper<Omit<ProductReviewSummary, 'criteria'> & { criteria: Array<ResolversTypes['ProductRatingCriterionSummary']> }>;
  ProductReviewsWidget: ResolverTypeWrapper<Omit<ProductReviewsWidget, 'reviewSummary'> & { reviewSummary?: Maybe<ResolversTypes['ProductReviewSummary']> }>;
  Query: ResolverTypeWrapper<{}>;
  Review: ResolverTypeWrapper<Omit<Review, 'externalReferences' | 'media' | 'moderationCases' | 'moderationEvents' | 'moderationSignals' | 'publications' | 'ratings' | 'replies' | 'reports' | 'revisions' | 'translations' | 'votes'> & { externalReferences: ResolversTypes['ReviewContentExternalReferenceConnection'], media: Array<ResolversTypes['ReviewMedia']>, moderationCases: ResolversTypes['ReviewModerationCaseConnection'], moderationEvents: ResolversTypes['ReviewModerationEventConnection'], moderationSignals: ResolversTypes['ReviewModerationSignalConnection'], publications: Array<ResolversTypes['ReviewContentPublication']>, ratings: Array<ResolversTypes['ReviewRating']>, replies: ResolversTypes['ReviewReplyConnection'], reports: ResolversTypes['ReviewContentReportConnection'], revisions: ResolversTypes['ReviewContentRevisionConnection'], translations: Array<ResolversTypes['ReviewContentTranslation']>, votes: ResolversTypes['ReviewContentVoteConnection'] }>;
  ReviewConnection: ResolverTypeWrapper<Omit<ReviewConnection, 'edges'> & { edges: Array<ResolversTypes['ReviewEdge']> }>;
  ReviewContent: ResolverTypeWrapper<ResolversInterfaceTypes<ResolversTypes>['ReviewContent']>;
  ReviewContentAuthor: ResolverTypeWrapper<ReviewContentAuthor>;
  ReviewContentAuthorCreateInput: ReviewContentAuthorCreateInput;
  ReviewContentAuthorType: ReviewContentAuthorType;
  ReviewContentAuthorUpdateInput: ReviewContentAuthorUpdateInput;
  ReviewContentConnection: ResolverTypeWrapper<Omit<ReviewContentConnection, 'edges'> & { edges: Array<ResolversTypes['ReviewContentEdge']> }>;
  ReviewContentConnectionMetaInput: ReviewContentConnectionMetaInput;
  ReviewContentCreateInput: ReviewContentCreateInput;
  ReviewContentDeleteInput: ReviewContentDeleteInput;
  ReviewContentEdge: ResolverTypeWrapper<Omit<ReviewContentEdge, 'node'> & { node: ResolversTypes['ReviewContent'] }>;
  ReviewContentExternalReference: ResolverTypeWrapper<Omit<ReviewContentExternalReference, 'content'> & { content: ResolversTypes['ReviewContent'] }>;
  ReviewContentExternalReferenceConnection: ResolverTypeWrapper<Omit<ReviewContentExternalReferenceConnection, 'edges'> & { edges: Array<ResolversTypes['ReviewContentExternalReferenceEdge']> }>;
  ReviewContentExternalReferenceCreateInput: ReviewContentExternalReferenceCreateInput;
  ReviewContentExternalReferenceCreatePayload: ResolverTypeWrapper<Omit<ReviewContentExternalReferenceCreatePayload, 'externalReference'> & { externalReference?: Maybe<ResolversTypes['ReviewContentExternalReference']> }>;
  ReviewContentExternalReferenceDeleteInput: ReviewContentExternalReferenceDeleteInput;
  ReviewContentExternalReferenceDeletePayload: ResolverTypeWrapper<ReviewContentExternalReferenceDeletePayload>;
  ReviewContentExternalReferenceEdge: ResolverTypeWrapper<Omit<ReviewContentExternalReferenceEdge, 'node'> & { node: ResolversTypes['ReviewContentExternalReference'] }>;
  ReviewContentExternalReferenceIdentityInput: ReviewContentExternalReferenceIdentityInput;
  ReviewContentExternalReferenceOrderByInput: ReviewContentExternalReferenceOrderByInput;
  ReviewContentExternalReferenceOrderField: ReviewContentExternalReferenceOrderField;
  ReviewContentExternalReferenceSyncInput: ReviewContentExternalReferenceSyncInput;
  ReviewContentExternalReferenceUpdateInput: ReviewContentExternalReferenceUpdateInput;
  ReviewContentExternalReferenceUpdatePayload: ResolverTypeWrapper<Omit<ReviewContentExternalReferenceUpdatePayload, 'externalReference'> & { externalReference?: Maybe<ResolversTypes['ReviewContentExternalReference']> }>;
  ReviewContentExternalReferenceWhereInput: ReviewContentExternalReferenceWhereInput;
  ReviewContentKind: ReviewContentKind;
  ReviewContentMetrics: ResolverTypeWrapper<ReviewContentMetrics>;
  ReviewContentModerationInput: ReviewContentModerationInput;
  ReviewContentOrderByInput: ReviewContentOrderByInput;
  ReviewContentOrderField: ReviewContentOrderField;
  ReviewContentPublication: ResolverTypeWrapper<Omit<ReviewContentPublication, 'content'> & { content: ResolversTypes['ReviewContent'] }>;
  ReviewContentPublicationSyncInput: ReviewContentPublicationSyncInput;
  ReviewContentReport: ResolverTypeWrapper<Omit<ReviewContentReport, 'content'> & { content: ResolversTypes['ReviewContent'] }>;
  ReviewContentReportAssignmentInput: ReviewContentReportAssignmentInput;
  ReviewContentReportConnection: ResolverTypeWrapper<Omit<ReviewContentReportConnection, 'edges'> & { edges: Array<ResolversTypes['ReviewContentReportEdge']> }>;
  ReviewContentReportEdge: ResolverTypeWrapper<Omit<ReviewContentReportEdge, 'node'> & { node: ResolversTypes['ReviewContentReport'] }>;
  ReviewContentReportOrderByInput: ReviewContentReportOrderByInput;
  ReviewContentReportOrderField: ReviewContentReportOrderField;
  ReviewContentReportReason: ReviewContentReportReason;
  ReviewContentReportResolutionInput: ReviewContentReportResolutionInput;
  ReviewContentReportStatus: ReviewContentReportStatus;
  ReviewContentReportUpdateInput: ReviewContentReportUpdateInput;
  ReviewContentReportUpdatePayload: ResolverTypeWrapper<Omit<ReviewContentReportUpdatePayload, 'contentReport'> & { contentReport?: Maybe<ResolversTypes['ReviewContentReport']> }>;
  ReviewContentReportWhereInput: ReviewContentReportWhereInput;
  ReviewContentRevision: ResolverTypeWrapper<Omit<ReviewContentRevision, 'content'> & { content: ResolversTypes['ReviewContent'] }>;
  ReviewContentRevisionConnection: ResolverTypeWrapper<Omit<ReviewContentRevisionConnection, 'edges'> & { edges: Array<ResolversTypes['ReviewContentRevisionEdge']> }>;
  ReviewContentRevisionEdge: ResolverTypeWrapper<Omit<ReviewContentRevisionEdge, 'node'> & { node: ResolversTypes['ReviewContentRevision'] }>;
  ReviewContentSourceCreateInput: ReviewContentSourceCreateInput;
  ReviewContentSourceUpdateInput: ReviewContentSourceUpdateInput;
  ReviewContentStatus: ReviewContentStatus;
  ReviewContentTextUpdateInput: ReviewContentTextUpdateInput;
  ReviewContentTranslation: ResolverTypeWrapper<Omit<ReviewContentTranslation, 'content'> & { content: ResolversTypes['ReviewContent'] }>;
  ReviewContentTranslationSyncInput: ReviewContentTranslationSyncInput;
  ReviewContentUpdateInput: ReviewContentUpdateInput;
  ReviewContentUpdatePayload: ResolverTypeWrapper<Omit<ReviewContentUpdatePayload, 'content'> & { content?: Maybe<ResolversTypes['ReviewContent']> }>;
  ReviewContentVote: ResolverTypeWrapper<Omit<ReviewContentVote, 'content'> & { content: ResolversTypes['ReviewContent'] }>;
  ReviewContentVoteConnection: ResolverTypeWrapper<Omit<ReviewContentVoteConnection, 'edges'> & { edges: Array<ResolversTypes['ReviewContentVoteEdge']> }>;
  ReviewContentVoteEdge: ResolverTypeWrapper<Omit<ReviewContentVoteEdge, 'node'> & { node: ResolversTypes['ReviewContentVote'] }>;
  ReviewContentVoteType: ReviewContentVoteType;
  ReviewContentWhereInput: ReviewContentWhereInput;
  ReviewCreateInput: ReviewCreateInput;
  ReviewCreatePayload: ResolverTypeWrapper<Omit<ReviewCreatePayload, 'review'> & { review?: Maybe<ResolversTypes['Review']> }>;
  ReviewDeletePayload: ResolverTypeWrapper<ReviewDeletePayload>;
  ReviewDuplicatePolicy: ReviewDuplicatePolicy;
  ReviewEdge: ResolverTypeWrapper<Omit<ReviewEdge, 'node'> & { node: ResolversTypes['Review'] }>;
  ReviewExternalSyncDirection: ReviewExternalSyncDirection;
  ReviewExternalSyncStatus: ReviewExternalSyncStatus;
  ReviewIncentiveUpdateInput: ReviewIncentiveUpdateInput;
  ReviewMedia: ResolverTypeWrapper<Omit<ReviewMedia, 'file' | 'review'> & { file: ResolversTypes['File'], review: ResolversTypes['Review'] }>;
  ReviewMediaSyncItemInput: ReviewMediaSyncItemInput;
  ReviewModerationAction: ReviewModerationAction;
  ReviewModerationCase: ResolverTypeWrapper<Omit<ReviewModerationCase, 'content'> & { content: ResolversTypes['ReviewContent'] }>;
  ReviewModerationCaseConnection: ResolverTypeWrapper<Omit<ReviewModerationCaseConnection, 'edges'> & { edges: Array<ResolversTypes['ReviewModerationCaseEdge']> }>;
  ReviewModerationCaseCreateInput: ReviewModerationCaseCreateInput;
  ReviewModerationCaseCreatePayload: ResolverTypeWrapper<Omit<ReviewModerationCaseCreatePayload, 'moderationCase'> & { moderationCase?: Maybe<ResolversTypes['ReviewModerationCase']> }>;
  ReviewModerationCaseDetailsInput: ReviewModerationCaseDetailsInput;
  ReviewModerationCaseEdge: ResolverTypeWrapper<Omit<ReviewModerationCaseEdge, 'node'> & { node: ResolversTypes['ReviewModerationCase'] }>;
  ReviewModerationCaseOrderByInput: ReviewModerationCaseOrderByInput;
  ReviewModerationCaseOrderField: ReviewModerationCaseOrderField;
  ReviewModerationCaseResolutionInput: ReviewModerationCaseResolutionInput;
  ReviewModerationCaseStatus: ReviewModerationCaseStatus;
  ReviewModerationCaseUpdateInput: ReviewModerationCaseUpdateInput;
  ReviewModerationCaseUpdatePayload: ResolverTypeWrapper<Omit<ReviewModerationCaseUpdatePayload, 'moderationCase'> & { moderationCase?: Maybe<ResolversTypes['ReviewModerationCase']> }>;
  ReviewModerationCaseWhereInput: ReviewModerationCaseWhereInput;
  ReviewModerationEvent: ResolverTypeWrapper<Omit<ReviewModerationEvent, 'content' | 'moderationCase'> & { content: ResolversTypes['ReviewContent'], moderationCase?: Maybe<ResolversTypes['ReviewModerationCase']> }>;
  ReviewModerationEventConnection: ResolverTypeWrapper<Omit<ReviewModerationEventConnection, 'edges'> & { edges: Array<ResolversTypes['ReviewModerationEventEdge']> }>;
  ReviewModerationEventEdge: ResolverTypeWrapper<Omit<ReviewModerationEventEdge, 'node'> & { node: ResolversTypes['ReviewModerationEvent'] }>;
  ReviewModerationMode: ReviewModerationMode;
  ReviewModerationSignal: ResolverTypeWrapper<Omit<ReviewModerationSignal, 'content'> & { content: ResolversTypes['ReviewContent'] }>;
  ReviewModerationSignalConnection: ResolverTypeWrapper<Omit<ReviewModerationSignalConnection, 'edges'> & { edges: Array<ResolversTypes['ReviewModerationSignalEdge']> }>;
  ReviewModerationSignalEdge: ResolverTypeWrapper<Omit<ReviewModerationSignalEdge, 'node'> & { node: ResolversTypes['ReviewModerationSignal'] }>;
  ReviewModerationVerdict: ReviewModerationVerdict;
  ReviewNotificationChannel: ReviewNotificationChannel;
  ReviewOrderByInput: ReviewOrderByInput;
  ReviewOrderField: ReviewOrderField;
  ReviewPublicationStatus: ReviewPublicationStatus;
  ReviewRating: ResolverTypeWrapper<Omit<ReviewRating, 'criterion'> & { criterion: ResolversTypes['ReviewRatingCriterion'] }>;
  ReviewRatingBreakdown: ResolverTypeWrapper<ReviewRatingBreakdown>;
  ReviewRatingCriterion: ResolverTypeWrapper<Omit<ReviewRatingCriterion, 'assignments'> & { assignments: Array<ResolversTypes['ReviewRatingCriterionAssignment']> }>;
  ReviewRatingCriterionApplicabilityInput: ReviewRatingCriterionApplicabilityInput;
  ReviewRatingCriterionAssignment: ResolverTypeWrapper<Omit<ReviewRatingCriterionAssignment, 'criterion' | 'target'> & { criterion: ResolversTypes['ReviewRatingCriterion'], target: ResolversTypes['ReviewRatingCriterionTarget'] }>;
  ReviewRatingCriterionAssignmentInput: ReviewRatingCriterionAssignmentInput;
  ReviewRatingCriterionConnection: ResolverTypeWrapper<Omit<ReviewRatingCriterionConnection, 'edges'> & { edges: Array<ResolversTypes['ReviewRatingCriterionEdge']> }>;
  ReviewRatingCriterionCreateInput: ReviewRatingCriterionCreateInput;
  ReviewRatingCriterionCreatePayload: ResolverTypeWrapper<Omit<ReviewRatingCriterionCreatePayload, 'criterion'> & { criterion?: Maybe<ResolversTypes['ReviewRatingCriterion']> }>;
  ReviewRatingCriterionDefinitionInput: ReviewRatingCriterionDefinitionInput;
  ReviewRatingCriterionDeleteInput: ReviewRatingCriterionDeleteInput;
  ReviewRatingCriterionDeletePayload: ResolverTypeWrapper<ReviewRatingCriterionDeletePayload>;
  ReviewRatingCriterionEdge: ResolverTypeWrapper<Omit<ReviewRatingCriterionEdge, 'node'> & { node: ResolversTypes['ReviewRatingCriterion'] }>;
  ReviewRatingCriterionOrderByInput: ReviewRatingCriterionOrderByInput;
  ReviewRatingCriterionOrderField: ReviewRatingCriterionOrderField;
  ReviewRatingCriterionTarget: ResolverTypeWrapper<ResolversUnionTypes<ResolversTypes>['ReviewRatingCriterionTarget']>;
  ReviewRatingCriterionTargetType: ReviewRatingCriterionTargetType;
  ReviewRatingCriterionTranslation: ResolverTypeWrapper<ReviewRatingCriterionTranslation>;
  ReviewRatingCriterionTranslationInput: ReviewRatingCriterionTranslationInput;
  ReviewRatingCriterionUpdateInput: ReviewRatingCriterionUpdateInput;
  ReviewRatingCriterionUpdatePayload: ResolverTypeWrapper<Omit<ReviewRatingCriterionUpdatePayload, 'criterion'> & { criterion?: Maybe<ResolversTypes['ReviewRatingCriterion']> }>;
  ReviewRatingCriterionWhereInput: ReviewRatingCriterionWhereInput;
  ReviewRatingUpdateInput: ReviewRatingUpdateInput;
  ReviewRatingValueInput: ReviewRatingValueInput;
  ReviewRepliesUpdateInput: ReviewRepliesUpdateInput;
  ReviewReply: ResolverTypeWrapper<Omit<ReviewReply, 'externalReferences' | 'moderationCases' | 'moderationEvents' | 'moderationSignals' | 'publications' | 'reports' | 'review' | 'revisions' | 'translations' | 'votes'> & { externalReferences: ResolversTypes['ReviewContentExternalReferenceConnection'], moderationCases: ResolversTypes['ReviewModerationCaseConnection'], moderationEvents: ResolversTypes['ReviewModerationEventConnection'], moderationSignals: ResolversTypes['ReviewModerationSignalConnection'], publications: Array<ResolversTypes['ReviewContentPublication']>, reports: ResolversTypes['ReviewContentReportConnection'], review: ResolversTypes['Review'], revisions: ResolversTypes['ReviewContentRevisionConnection'], translations: Array<ResolversTypes['ReviewContentTranslation']>, votes: ResolversTypes['ReviewContentVoteConnection'] }>;
  ReviewReplyConnection: ResolverTypeWrapper<Omit<ReviewReplyConnection, 'edges'> & { edges: Array<ResolversTypes['ReviewReplyEdge']> }>;
  ReviewReplyCreateOperationInput: ReviewReplyCreateOperationInput;
  ReviewReplyDeleteOperationInput: ReviewReplyDeleteOperationInput;
  ReviewReplyEdge: ResolverTypeWrapper<Omit<ReviewReplyEdge, 'node'> & { node: ResolversTypes['ReviewReply'] }>;
  ReviewReplyOrderByInput: ReviewReplyOrderByInput;
  ReviewReplyOrderField: ReviewReplyOrderField;
  ReviewReplyPropertiesUpdateInput: ReviewReplyPropertiesUpdateInput;
  ReviewReplyUpdateInput: ReviewReplyUpdateInput;
  ReviewReplyUpdateOperationInput: ReviewReplyUpdateOperationInput;
  ReviewReplyWhereInput: ReviewReplyWhereInput;
  ReviewRequest: ResolverTypeWrapper<Omit<ReviewRequest, 'events' | 'review'> & { events: ResolversTypes['ReviewRequestEventConnection'], review?: Maybe<ResolversTypes['Review']> }>;
  ReviewRequestConnection: ResolverTypeWrapper<Omit<ReviewRequestConnection, 'edges'> & { edges: Array<ResolversTypes['ReviewRequestEdge']> }>;
  ReviewRequestCreateInput: ReviewRequestCreateInput;
  ReviewRequestCreatePayload: ResolverTypeWrapper<Omit<ReviewRequestCreatePayload, 'reviewRequest'> & { reviewRequest?: Maybe<ResolversTypes['ReviewRequest']> }>;
  ReviewRequestDeliveryUpdateInput: ReviewRequestDeliveryUpdateInput;
  ReviewRequestEdge: ResolverTypeWrapper<Omit<ReviewRequestEdge, 'node'> & { node: ResolversTypes['ReviewRequest'] }>;
  ReviewRequestEvent: ResolverTypeWrapper<Omit<ReviewRequestEvent, 'reviewRequest'> & { reviewRequest: ResolversTypes['ReviewRequest'] }>;
  ReviewRequestEventConnection: ResolverTypeWrapper<Omit<ReviewRequestEventConnection, 'edges'> & { edges: Array<ResolversTypes['ReviewRequestEventEdge']> }>;
  ReviewRequestEventEdge: ResolverTypeWrapper<Omit<ReviewRequestEventEdge, 'node'> & { node: ResolversTypes['ReviewRequestEvent'] }>;
  ReviewRequestEventType: ReviewRequestEventType;
  ReviewRequestOrderByInput: ReviewRequestOrderByInput;
  ReviewRequestOrderField: ReviewRequestOrderField;
  ReviewRequestScheduleUpdateInput: ReviewRequestScheduleUpdateInput;
  ReviewRequestStatus: ReviewRequestStatus;
  ReviewRequestTransitionAction: ReviewRequestTransitionAction;
  ReviewRequestTransitionInput: ReviewRequestTransitionInput;
  ReviewRequestUpdateInput: ReviewRequestUpdateInput;
  ReviewRequestUpdatePayload: ResolverTypeWrapper<Omit<ReviewRequestUpdatePayload, 'reviewRequest'> & { reviewRequest?: Maybe<ResolversTypes['ReviewRequest']> }>;
  ReviewRequestWhereInput: ReviewRequestWhereInput;
  ReviewStoreConfiguration: ResolverTypeWrapper<ReviewStoreConfiguration>;
  ReviewStoreConfigurationUpdateInput: ReviewStoreConfigurationUpdateInput;
  ReviewStoreConfigurationUpdatePayload: ResolverTypeWrapper<ReviewStoreConfigurationUpdatePayload>;
  ReviewSubjectUpdateInput: ReviewSubjectUpdateInput;
  ReviewTranslationSource: ReviewTranslationSource;
  ReviewUpdateInput: ReviewUpdateInput;
  ReviewUpdatePayload: ResolverTypeWrapper<Omit<ReviewUpdatePayload, 'review'> & { review?: Maybe<ResolversTypes['Review']> }>;
  ReviewVerificationStatus: ReviewVerificationStatus;
  ReviewVerificationUpdateInput: ReviewVerificationUpdateInput;
  ReviewWhereInput: ReviewWhereInput;
  ReviewsMutation: ResolverTypeWrapper<Omit<ReviewsMutation, 'contentExternalReferenceCreate' | 'contentExternalReferenceUpdate' | 'contentRedact' | 'contentReportUpdate' | 'contentRevisionRestore' | 'moderationCaseCreate' | 'moderationCaseUpdate' | 'productQuestionCreate' | 'productQuestionSubscriptionUpdate' | 'productQuestionUpdate' | 'ratingCriterionCreate' | 'ratingCriterionUpdate' | 'reviewCreate' | 'reviewRequestCreate' | 'reviewRequestUpdate' | 'reviewUpdate'> & { contentExternalReferenceCreate: ResolversTypes['ReviewContentExternalReferenceCreatePayload'], contentExternalReferenceUpdate: ResolversTypes['ReviewContentExternalReferenceUpdatePayload'], contentRedact: ResolversTypes['ReviewContentUpdatePayload'], contentReportUpdate: ResolversTypes['ReviewContentReportUpdatePayload'], contentRevisionRestore: ResolversTypes['ReviewContentUpdatePayload'], moderationCaseCreate: ResolversTypes['ReviewModerationCaseCreatePayload'], moderationCaseUpdate: ResolversTypes['ReviewModerationCaseUpdatePayload'], productQuestionCreate: ResolversTypes['ProductQuestionCreatePayload'], productQuestionSubscriptionUpdate: ResolversTypes['ProductQuestionSubscriptionUpdatePayload'], productQuestionUpdate: ResolversTypes['ProductQuestionUpdatePayload'], ratingCriterionCreate: ResolversTypes['ReviewRatingCriterionCreatePayload'], ratingCriterionUpdate: ResolversTypes['ReviewRatingCriterionUpdatePayload'], reviewCreate: ResolversTypes['ReviewCreatePayload'], reviewRequestCreate: ResolversTypes['ReviewRequestCreatePayload'], reviewRequestUpdate: ResolversTypes['ReviewRequestUpdatePayload'], reviewUpdate: ResolversTypes['ReviewUpdatePayload'] }>;
  ReviewsOperationResult: ResolverTypeWrapper<ReviewsOperationResult>;
  ReviewsOperationType: ReviewsOperationType;
  ReviewsQuery: ResolverTypeWrapper<Omit<ReviewsQuery, 'content' | 'contentExternalReference' | 'contentExternalReferences' | 'contentReport' | 'contentReports' | 'contents' | 'moderationCase' | 'moderationCases' | 'node' | 'nodes' | 'productQuestion' | 'productQuestionAnswer' | 'productQuestionAnswers' | 'productQuestions' | 'ratingCriteria' | 'ratingCriterion' | 'review' | 'reviewReplies' | 'reviewReply' | 'reviewRequest' | 'reviewRequests' | 'reviews'> & { content?: Maybe<ResolversTypes['ReviewContent']>, contentExternalReference?: Maybe<ResolversTypes['ReviewContentExternalReference']>, contentExternalReferences: ResolversTypes['ReviewContentExternalReferenceConnection'], contentReport?: Maybe<ResolversTypes['ReviewContentReport']>, contentReports: ResolversTypes['ReviewContentReportConnection'], contents: ResolversTypes['ReviewContentConnection'], moderationCase?: Maybe<ResolversTypes['ReviewModerationCase']>, moderationCases: ResolversTypes['ReviewModerationCaseConnection'], node?: Maybe<ResolversTypes['Node']>, nodes: Array<Maybe<ResolversTypes['Node']>>, productQuestion?: Maybe<ResolversTypes['ProductQuestion']>, productQuestionAnswer?: Maybe<ResolversTypes['ProductQuestionAnswer']>, productQuestionAnswers: ResolversTypes['ProductQuestionAnswerConnection'], productQuestions: ResolversTypes['ProductQuestionConnection'], ratingCriteria: ResolversTypes['ReviewRatingCriterionConnection'], ratingCriterion?: Maybe<ResolversTypes['ReviewRatingCriterion']>, review?: Maybe<ResolversTypes['Review']>, reviewReplies: ResolversTypes['ReviewReplyConnection'], reviewReply?: Maybe<ResolversTypes['ReviewReply']>, reviewRequest?: Maybe<ResolversTypes['ReviewRequest']>, reviewRequests: ResolversTypes['ReviewRequestConnection'], reviews: ResolversTypes['ReviewConnection'] }>;
  SortDirection: SortDirection;
  StringFilter: StringFilter;
  UserError: ResolverTypeWrapper<ResolversInterfaceTypes<ResolversTypes>['UserError']>;
  Variant: ResolverTypeWrapper<Variant>;
  WeightUnit: WeightUnit;
  WidgetQuery: ResolverTypeWrapper<Omit<WidgetQuery, 'reviews'> & { reviews: ResolversTypes['ProductReviewsWidget'] }>;
}>;

/** Mapping between all available schema types and the resolvers parents */
export type ResolversParentTypes = ResolversObject<{
  BigInt: Scalars['BigInt']['output'];
  BooleanFilter: BooleanFilter;
  Boolean: Scalars['Boolean']['output'];
  Category: Category;
  ID: Scalars['ID']['output'];
  Customer: Customer;
  DateTime: Scalars['DateTime']['output'];
  DateTimeFilter: DateTimeFilter;
  Email: Scalars['Email']['output'];
  File: File;
  FloatFilter: FloatFilter;
  Float: Scalars['Float']['output'];
  GenericUserError: GenericUserError;
  String: Scalars['String']['output'];
  IDFilter: IdFilter;
  IntFilter: IntFilter;
  Int: Scalars['Int']['output'];
  JSON: Scalars['JSON']['output'];
  Mutation: {};
  Node: ResolversInterfaceTypes<ResolversParentTypes>['Node'];
  PageInfo: PageInfo;
  Product: Product;
  ProductQuestion: Omit<ProductQuestion, 'answers' | 'externalReferences' | 'moderationCases' | 'moderationEvents' | 'moderationSignals' | 'publications' | 'reports' | 'revisions' | 'subscriptions' | 'translations' | 'votes'> & { answers: ResolversParentTypes['ProductQuestionAnswerConnection'], externalReferences: ResolversParentTypes['ReviewContentExternalReferenceConnection'], moderationCases: ResolversParentTypes['ReviewModerationCaseConnection'], moderationEvents: ResolversParentTypes['ReviewModerationEventConnection'], moderationSignals: ResolversParentTypes['ReviewModerationSignalConnection'], publications: Array<ResolversParentTypes['ReviewContentPublication']>, reports: ResolversParentTypes['ReviewContentReportConnection'], revisions: ResolversParentTypes['ReviewContentRevisionConnection'], subscriptions: ResolversParentTypes['ProductQuestionSubscriptionConnection'], translations: Array<ResolversParentTypes['ReviewContentTranslation']>, votes: ResolversParentTypes['ReviewContentVoteConnection'] };
  ProductQuestionAnswer: Omit<ProductQuestionAnswer, 'externalReferences' | 'moderationCases' | 'moderationEvents' | 'moderationSignals' | 'publications' | 'question' | 'reports' | 'revisions' | 'translations' | 'votes'> & { externalReferences: ResolversParentTypes['ReviewContentExternalReferenceConnection'], moderationCases: ResolversParentTypes['ReviewModerationCaseConnection'], moderationEvents: ResolversParentTypes['ReviewModerationEventConnection'], moderationSignals: ResolversParentTypes['ReviewModerationSignalConnection'], publications: Array<ResolversParentTypes['ReviewContentPublication']>, question: ResolversParentTypes['ProductQuestion'], reports: ResolversParentTypes['ReviewContentReportConnection'], revisions: ResolversParentTypes['ReviewContentRevisionConnection'], translations: Array<ResolversParentTypes['ReviewContentTranslation']>, votes: ResolversParentTypes['ReviewContentVoteConnection'] };
  ProductQuestionAnswerConnection: Omit<ProductQuestionAnswerConnection, 'edges'> & { edges: Array<ResolversParentTypes['ProductQuestionAnswerEdge']> };
  ProductQuestionAnswerCreateOperationInput: ProductQuestionAnswerCreateOperationInput;
  ProductQuestionAnswerDeleteOperationInput: ProductQuestionAnswerDeleteOperationInput;
  ProductQuestionAnswerEdge: Omit<ProductQuestionAnswerEdge, 'node'> & { node: ResolversParentTypes['ProductQuestionAnswer'] };
  ProductQuestionAnswerOrderByInput: ProductQuestionAnswerOrderByInput;
  ProductQuestionAnswerPropertiesUpdateInput: ProductQuestionAnswerPropertiesUpdateInput;
  ProductQuestionAnswerUpdateInput: ProductQuestionAnswerUpdateInput;
  ProductQuestionAnswerUpdateOperationInput: ProductQuestionAnswerUpdateOperationInput;
  ProductQuestionAnswerWhereInput: ProductQuestionAnswerWhereInput;
  ProductQuestionAnswersUpdateInput: ProductQuestionAnswersUpdateInput;
  ProductQuestionConnection: Omit<ProductQuestionConnection, 'edges'> & { edges: Array<ResolversParentTypes['ProductQuestionEdge']> };
  ProductQuestionCreateInput: ProductQuestionCreateInput;
  ProductQuestionCreatePayload: Omit<ProductQuestionCreatePayload, 'productQuestion'> & { productQuestion?: Maybe<ResolversParentTypes['ProductQuestion']> };
  ProductQuestionDeletePayload: ProductQuestionDeletePayload;
  ProductQuestionEdge: Omit<ProductQuestionEdge, 'node'> & { node: ResolversParentTypes['ProductQuestion'] };
  ProductQuestionOrderByInput: ProductQuestionOrderByInput;
  ProductQuestionSubjectUpdateInput: ProductQuestionSubjectUpdateInput;
  ProductQuestionSubscription: Omit<ProductQuestionSubscription, 'question'> & { question: ResolversParentTypes['ProductQuestion'] };
  ProductQuestionSubscriptionConnection: Omit<ProductQuestionSubscriptionConnection, 'edges'> & { edges: Array<ResolversParentTypes['ProductQuestionSubscriptionEdge']> };
  ProductQuestionSubscriptionEdge: Omit<ProductQuestionSubscriptionEdge, 'node'> & { node: ResolversParentTypes['ProductQuestionSubscription'] };
  ProductQuestionSubscriptionUpdateInput: ProductQuestionSubscriptionUpdateInput;
  ProductQuestionSubscriptionUpdatePayload: Omit<ProductQuestionSubscriptionUpdatePayload, 'subscription'> & { subscription?: Maybe<ResolversParentTypes['ProductQuestionSubscription']> };
  ProductQuestionSummary: ProductQuestionSummary;
  ProductQuestionUpdateInput: ProductQuestionUpdateInput;
  ProductQuestionUpdatePayload: Omit<ProductQuestionUpdatePayload, 'productQuestion'> & { productQuestion?: Maybe<ResolversParentTypes['ProductQuestion']> };
  ProductQuestionWhereInput: ProductQuestionWhereInput;
  ProductRatingCriterionSummary: Omit<ProductRatingCriterionSummary, 'criterion'> & { criterion: ResolversParentTypes['ReviewRatingCriterion'] };
  ProductReviewSummary: Omit<ProductReviewSummary, 'criteria'> & { criteria: Array<ResolversParentTypes['ProductRatingCriterionSummary']> };
  ProductReviewsWidget: Omit<ProductReviewsWidget, 'reviewSummary'> & { reviewSummary?: Maybe<ResolversParentTypes['ProductReviewSummary']> };
  Query: {};
  Review: Omit<Review, 'externalReferences' | 'media' | 'moderationCases' | 'moderationEvents' | 'moderationSignals' | 'publications' | 'ratings' | 'replies' | 'reports' | 'revisions' | 'translations' | 'votes'> & { externalReferences: ResolversParentTypes['ReviewContentExternalReferenceConnection'], media: Array<ResolversParentTypes['ReviewMedia']>, moderationCases: ResolversParentTypes['ReviewModerationCaseConnection'], moderationEvents: ResolversParentTypes['ReviewModerationEventConnection'], moderationSignals: ResolversParentTypes['ReviewModerationSignalConnection'], publications: Array<ResolversParentTypes['ReviewContentPublication']>, ratings: Array<ResolversParentTypes['ReviewRating']>, replies: ResolversParentTypes['ReviewReplyConnection'], reports: ResolversParentTypes['ReviewContentReportConnection'], revisions: ResolversParentTypes['ReviewContentRevisionConnection'], translations: Array<ResolversParentTypes['ReviewContentTranslation']>, votes: ResolversParentTypes['ReviewContentVoteConnection'] };
  ReviewConnection: Omit<ReviewConnection, 'edges'> & { edges: Array<ResolversParentTypes['ReviewEdge']> };
  ReviewContent: ResolversInterfaceTypes<ResolversParentTypes>['ReviewContent'];
  ReviewContentAuthor: ReviewContentAuthor;
  ReviewContentAuthorCreateInput: ReviewContentAuthorCreateInput;
  ReviewContentAuthorUpdateInput: ReviewContentAuthorUpdateInput;
  ReviewContentConnection: Omit<ReviewContentConnection, 'edges'> & { edges: Array<ResolversParentTypes['ReviewContentEdge']> };
  ReviewContentConnectionMetaInput: ReviewContentConnectionMetaInput;
  ReviewContentCreateInput: ReviewContentCreateInput;
  ReviewContentDeleteInput: ReviewContentDeleteInput;
  ReviewContentEdge: Omit<ReviewContentEdge, 'node'> & { node: ResolversParentTypes['ReviewContent'] };
  ReviewContentExternalReference: Omit<ReviewContentExternalReference, 'content'> & { content: ResolversParentTypes['ReviewContent'] };
  ReviewContentExternalReferenceConnection: Omit<ReviewContentExternalReferenceConnection, 'edges'> & { edges: Array<ResolversParentTypes['ReviewContentExternalReferenceEdge']> };
  ReviewContentExternalReferenceCreateInput: ReviewContentExternalReferenceCreateInput;
  ReviewContentExternalReferenceCreatePayload: Omit<ReviewContentExternalReferenceCreatePayload, 'externalReference'> & { externalReference?: Maybe<ResolversParentTypes['ReviewContentExternalReference']> };
  ReviewContentExternalReferenceDeleteInput: ReviewContentExternalReferenceDeleteInput;
  ReviewContentExternalReferenceDeletePayload: ReviewContentExternalReferenceDeletePayload;
  ReviewContentExternalReferenceEdge: Omit<ReviewContentExternalReferenceEdge, 'node'> & { node: ResolversParentTypes['ReviewContentExternalReference'] };
  ReviewContentExternalReferenceIdentityInput: ReviewContentExternalReferenceIdentityInput;
  ReviewContentExternalReferenceOrderByInput: ReviewContentExternalReferenceOrderByInput;
  ReviewContentExternalReferenceSyncInput: ReviewContentExternalReferenceSyncInput;
  ReviewContentExternalReferenceUpdateInput: ReviewContentExternalReferenceUpdateInput;
  ReviewContentExternalReferenceUpdatePayload: Omit<ReviewContentExternalReferenceUpdatePayload, 'externalReference'> & { externalReference?: Maybe<ResolversParentTypes['ReviewContentExternalReference']> };
  ReviewContentExternalReferenceWhereInput: ReviewContentExternalReferenceWhereInput;
  ReviewContentMetrics: ReviewContentMetrics;
  ReviewContentModerationInput: ReviewContentModerationInput;
  ReviewContentOrderByInput: ReviewContentOrderByInput;
  ReviewContentPublication: Omit<ReviewContentPublication, 'content'> & { content: ResolversParentTypes['ReviewContent'] };
  ReviewContentPublicationSyncInput: ReviewContentPublicationSyncInput;
  ReviewContentReport: Omit<ReviewContentReport, 'content'> & { content: ResolversParentTypes['ReviewContent'] };
  ReviewContentReportAssignmentInput: ReviewContentReportAssignmentInput;
  ReviewContentReportConnection: Omit<ReviewContentReportConnection, 'edges'> & { edges: Array<ResolversParentTypes['ReviewContentReportEdge']> };
  ReviewContentReportEdge: Omit<ReviewContentReportEdge, 'node'> & { node: ResolversParentTypes['ReviewContentReport'] };
  ReviewContentReportOrderByInput: ReviewContentReportOrderByInput;
  ReviewContentReportResolutionInput: ReviewContentReportResolutionInput;
  ReviewContentReportUpdateInput: ReviewContentReportUpdateInput;
  ReviewContentReportUpdatePayload: Omit<ReviewContentReportUpdatePayload, 'contentReport'> & { contentReport?: Maybe<ResolversParentTypes['ReviewContentReport']> };
  ReviewContentReportWhereInput: ReviewContentReportWhereInput;
  ReviewContentRevision: Omit<ReviewContentRevision, 'content'> & { content: ResolversParentTypes['ReviewContent'] };
  ReviewContentRevisionConnection: Omit<ReviewContentRevisionConnection, 'edges'> & { edges: Array<ResolversParentTypes['ReviewContentRevisionEdge']> };
  ReviewContentRevisionEdge: Omit<ReviewContentRevisionEdge, 'node'> & { node: ResolversParentTypes['ReviewContentRevision'] };
  ReviewContentSourceCreateInput: ReviewContentSourceCreateInput;
  ReviewContentSourceUpdateInput: ReviewContentSourceUpdateInput;
  ReviewContentTextUpdateInput: ReviewContentTextUpdateInput;
  ReviewContentTranslation: Omit<ReviewContentTranslation, 'content'> & { content: ResolversParentTypes['ReviewContent'] };
  ReviewContentTranslationSyncInput: ReviewContentTranslationSyncInput;
  ReviewContentUpdateInput: ReviewContentUpdateInput;
  ReviewContentUpdatePayload: Omit<ReviewContentUpdatePayload, 'content'> & { content?: Maybe<ResolversParentTypes['ReviewContent']> };
  ReviewContentVote: Omit<ReviewContentVote, 'content'> & { content: ResolversParentTypes['ReviewContent'] };
  ReviewContentVoteConnection: Omit<ReviewContentVoteConnection, 'edges'> & { edges: Array<ResolversParentTypes['ReviewContentVoteEdge']> };
  ReviewContentVoteEdge: Omit<ReviewContentVoteEdge, 'node'> & { node: ResolversParentTypes['ReviewContentVote'] };
  ReviewContentWhereInput: ReviewContentWhereInput;
  ReviewCreateInput: ReviewCreateInput;
  ReviewCreatePayload: Omit<ReviewCreatePayload, 'review'> & { review?: Maybe<ResolversParentTypes['Review']> };
  ReviewDeletePayload: ReviewDeletePayload;
  ReviewEdge: Omit<ReviewEdge, 'node'> & { node: ResolversParentTypes['Review'] };
  ReviewIncentiveUpdateInput: ReviewIncentiveUpdateInput;
  ReviewMedia: Omit<ReviewMedia, 'file' | 'review'> & { file: ResolversParentTypes['File'], review: ResolversParentTypes['Review'] };
  ReviewMediaSyncItemInput: ReviewMediaSyncItemInput;
  ReviewModerationCase: Omit<ReviewModerationCase, 'content'> & { content: ResolversParentTypes['ReviewContent'] };
  ReviewModerationCaseConnection: Omit<ReviewModerationCaseConnection, 'edges'> & { edges: Array<ResolversParentTypes['ReviewModerationCaseEdge']> };
  ReviewModerationCaseCreateInput: ReviewModerationCaseCreateInput;
  ReviewModerationCaseCreatePayload: Omit<ReviewModerationCaseCreatePayload, 'moderationCase'> & { moderationCase?: Maybe<ResolversParentTypes['ReviewModerationCase']> };
  ReviewModerationCaseDetailsInput: ReviewModerationCaseDetailsInput;
  ReviewModerationCaseEdge: Omit<ReviewModerationCaseEdge, 'node'> & { node: ResolversParentTypes['ReviewModerationCase'] };
  ReviewModerationCaseOrderByInput: ReviewModerationCaseOrderByInput;
  ReviewModerationCaseResolutionInput: ReviewModerationCaseResolutionInput;
  ReviewModerationCaseUpdateInput: ReviewModerationCaseUpdateInput;
  ReviewModerationCaseUpdatePayload: Omit<ReviewModerationCaseUpdatePayload, 'moderationCase'> & { moderationCase?: Maybe<ResolversParentTypes['ReviewModerationCase']> };
  ReviewModerationCaseWhereInput: ReviewModerationCaseWhereInput;
  ReviewModerationEvent: Omit<ReviewModerationEvent, 'content' | 'moderationCase'> & { content: ResolversParentTypes['ReviewContent'], moderationCase?: Maybe<ResolversParentTypes['ReviewModerationCase']> };
  ReviewModerationEventConnection: Omit<ReviewModerationEventConnection, 'edges'> & { edges: Array<ResolversParentTypes['ReviewModerationEventEdge']> };
  ReviewModerationEventEdge: Omit<ReviewModerationEventEdge, 'node'> & { node: ResolversParentTypes['ReviewModerationEvent'] };
  ReviewModerationSignal: Omit<ReviewModerationSignal, 'content'> & { content: ResolversParentTypes['ReviewContent'] };
  ReviewModerationSignalConnection: Omit<ReviewModerationSignalConnection, 'edges'> & { edges: Array<ResolversParentTypes['ReviewModerationSignalEdge']> };
  ReviewModerationSignalEdge: Omit<ReviewModerationSignalEdge, 'node'> & { node: ResolversParentTypes['ReviewModerationSignal'] };
  ReviewOrderByInput: ReviewOrderByInput;
  ReviewRating: Omit<ReviewRating, 'criterion'> & { criterion: ResolversParentTypes['ReviewRatingCriterion'] };
  ReviewRatingBreakdown: ReviewRatingBreakdown;
  ReviewRatingCriterion: Omit<ReviewRatingCriterion, 'assignments'> & { assignments: Array<ResolversParentTypes['ReviewRatingCriterionAssignment']> };
  ReviewRatingCriterionApplicabilityInput: ReviewRatingCriterionApplicabilityInput;
  ReviewRatingCriterionAssignment: Omit<ReviewRatingCriterionAssignment, 'criterion' | 'target'> & { criterion: ResolversParentTypes['ReviewRatingCriterion'], target: ResolversParentTypes['ReviewRatingCriterionTarget'] };
  ReviewRatingCriterionAssignmentInput: ReviewRatingCriterionAssignmentInput;
  ReviewRatingCriterionConnection: Omit<ReviewRatingCriterionConnection, 'edges'> & { edges: Array<ResolversParentTypes['ReviewRatingCriterionEdge']> };
  ReviewRatingCriterionCreateInput: ReviewRatingCriterionCreateInput;
  ReviewRatingCriterionCreatePayload: Omit<ReviewRatingCriterionCreatePayload, 'criterion'> & { criterion?: Maybe<ResolversParentTypes['ReviewRatingCriterion']> };
  ReviewRatingCriterionDefinitionInput: ReviewRatingCriterionDefinitionInput;
  ReviewRatingCriterionDeleteInput: ReviewRatingCriterionDeleteInput;
  ReviewRatingCriterionDeletePayload: ReviewRatingCriterionDeletePayload;
  ReviewRatingCriterionEdge: Omit<ReviewRatingCriterionEdge, 'node'> & { node: ResolversParentTypes['ReviewRatingCriterion'] };
  ReviewRatingCriterionOrderByInput: ReviewRatingCriterionOrderByInput;
  ReviewRatingCriterionTarget: ResolversUnionTypes<ResolversParentTypes>['ReviewRatingCriterionTarget'];
  ReviewRatingCriterionTranslation: ReviewRatingCriterionTranslation;
  ReviewRatingCriterionTranslationInput: ReviewRatingCriterionTranslationInput;
  ReviewRatingCriterionUpdateInput: ReviewRatingCriterionUpdateInput;
  ReviewRatingCriterionUpdatePayload: Omit<ReviewRatingCriterionUpdatePayload, 'criterion'> & { criterion?: Maybe<ResolversParentTypes['ReviewRatingCriterion']> };
  ReviewRatingCriterionWhereInput: ReviewRatingCriterionWhereInput;
  ReviewRatingUpdateInput: ReviewRatingUpdateInput;
  ReviewRatingValueInput: ReviewRatingValueInput;
  ReviewRepliesUpdateInput: ReviewRepliesUpdateInput;
  ReviewReply: Omit<ReviewReply, 'externalReferences' | 'moderationCases' | 'moderationEvents' | 'moderationSignals' | 'publications' | 'reports' | 'review' | 'revisions' | 'translations' | 'votes'> & { externalReferences: ResolversParentTypes['ReviewContentExternalReferenceConnection'], moderationCases: ResolversParentTypes['ReviewModerationCaseConnection'], moderationEvents: ResolversParentTypes['ReviewModerationEventConnection'], moderationSignals: ResolversParentTypes['ReviewModerationSignalConnection'], publications: Array<ResolversParentTypes['ReviewContentPublication']>, reports: ResolversParentTypes['ReviewContentReportConnection'], review: ResolversParentTypes['Review'], revisions: ResolversParentTypes['ReviewContentRevisionConnection'], translations: Array<ResolversParentTypes['ReviewContentTranslation']>, votes: ResolversParentTypes['ReviewContentVoteConnection'] };
  ReviewReplyConnection: Omit<ReviewReplyConnection, 'edges'> & { edges: Array<ResolversParentTypes['ReviewReplyEdge']> };
  ReviewReplyCreateOperationInput: ReviewReplyCreateOperationInput;
  ReviewReplyDeleteOperationInput: ReviewReplyDeleteOperationInput;
  ReviewReplyEdge: Omit<ReviewReplyEdge, 'node'> & { node: ResolversParentTypes['ReviewReply'] };
  ReviewReplyOrderByInput: ReviewReplyOrderByInput;
  ReviewReplyPropertiesUpdateInput: ReviewReplyPropertiesUpdateInput;
  ReviewReplyUpdateInput: ReviewReplyUpdateInput;
  ReviewReplyUpdateOperationInput: ReviewReplyUpdateOperationInput;
  ReviewReplyWhereInput: ReviewReplyWhereInput;
  ReviewRequest: Omit<ReviewRequest, 'events' | 'review'> & { events: ResolversParentTypes['ReviewRequestEventConnection'], review?: Maybe<ResolversParentTypes['Review']> };
  ReviewRequestConnection: Omit<ReviewRequestConnection, 'edges'> & { edges: Array<ResolversParentTypes['ReviewRequestEdge']> };
  ReviewRequestCreateInput: ReviewRequestCreateInput;
  ReviewRequestCreatePayload: Omit<ReviewRequestCreatePayload, 'reviewRequest'> & { reviewRequest?: Maybe<ResolversParentTypes['ReviewRequest']> };
  ReviewRequestDeliveryUpdateInput: ReviewRequestDeliveryUpdateInput;
  ReviewRequestEdge: Omit<ReviewRequestEdge, 'node'> & { node: ResolversParentTypes['ReviewRequest'] };
  ReviewRequestEvent: Omit<ReviewRequestEvent, 'reviewRequest'> & { reviewRequest: ResolversParentTypes['ReviewRequest'] };
  ReviewRequestEventConnection: Omit<ReviewRequestEventConnection, 'edges'> & { edges: Array<ResolversParentTypes['ReviewRequestEventEdge']> };
  ReviewRequestEventEdge: Omit<ReviewRequestEventEdge, 'node'> & { node: ResolversParentTypes['ReviewRequestEvent'] };
  ReviewRequestOrderByInput: ReviewRequestOrderByInput;
  ReviewRequestScheduleUpdateInput: ReviewRequestScheduleUpdateInput;
  ReviewRequestTransitionInput: ReviewRequestTransitionInput;
  ReviewRequestUpdateInput: ReviewRequestUpdateInput;
  ReviewRequestUpdatePayload: Omit<ReviewRequestUpdatePayload, 'reviewRequest'> & { reviewRequest?: Maybe<ResolversParentTypes['ReviewRequest']> };
  ReviewRequestWhereInput: ReviewRequestWhereInput;
  ReviewStoreConfiguration: ReviewStoreConfiguration;
  ReviewStoreConfigurationUpdateInput: ReviewStoreConfigurationUpdateInput;
  ReviewStoreConfigurationUpdatePayload: ReviewStoreConfigurationUpdatePayload;
  ReviewSubjectUpdateInput: ReviewSubjectUpdateInput;
  ReviewUpdateInput: ReviewUpdateInput;
  ReviewUpdatePayload: Omit<ReviewUpdatePayload, 'review'> & { review?: Maybe<ResolversParentTypes['Review']> };
  ReviewVerificationUpdateInput: ReviewVerificationUpdateInput;
  ReviewWhereInput: ReviewWhereInput;
  ReviewsMutation: Omit<ReviewsMutation, 'contentExternalReferenceCreate' | 'contentExternalReferenceUpdate' | 'contentRedact' | 'contentReportUpdate' | 'contentRevisionRestore' | 'moderationCaseCreate' | 'moderationCaseUpdate' | 'productQuestionCreate' | 'productQuestionSubscriptionUpdate' | 'productQuestionUpdate' | 'ratingCriterionCreate' | 'ratingCriterionUpdate' | 'reviewCreate' | 'reviewRequestCreate' | 'reviewRequestUpdate' | 'reviewUpdate'> & { contentExternalReferenceCreate: ResolversParentTypes['ReviewContentExternalReferenceCreatePayload'], contentExternalReferenceUpdate: ResolversParentTypes['ReviewContentExternalReferenceUpdatePayload'], contentRedact: ResolversParentTypes['ReviewContentUpdatePayload'], contentReportUpdate: ResolversParentTypes['ReviewContentReportUpdatePayload'], contentRevisionRestore: ResolversParentTypes['ReviewContentUpdatePayload'], moderationCaseCreate: ResolversParentTypes['ReviewModerationCaseCreatePayload'], moderationCaseUpdate: ResolversParentTypes['ReviewModerationCaseUpdatePayload'], productQuestionCreate: ResolversParentTypes['ProductQuestionCreatePayload'], productQuestionSubscriptionUpdate: ResolversParentTypes['ProductQuestionSubscriptionUpdatePayload'], productQuestionUpdate: ResolversParentTypes['ProductQuestionUpdatePayload'], ratingCriterionCreate: ResolversParentTypes['ReviewRatingCriterionCreatePayload'], ratingCriterionUpdate: ResolversParentTypes['ReviewRatingCriterionUpdatePayload'], reviewCreate: ResolversParentTypes['ReviewCreatePayload'], reviewRequestCreate: ResolversParentTypes['ReviewRequestCreatePayload'], reviewRequestUpdate: ResolversParentTypes['ReviewRequestUpdatePayload'], reviewUpdate: ResolversParentTypes['ReviewUpdatePayload'] };
  ReviewsOperationResult: ReviewsOperationResult;
  ReviewsQuery: Omit<ReviewsQuery, 'content' | 'contentExternalReference' | 'contentExternalReferences' | 'contentReport' | 'contentReports' | 'contents' | 'moderationCase' | 'moderationCases' | 'node' | 'nodes' | 'productQuestion' | 'productQuestionAnswer' | 'productQuestionAnswers' | 'productQuestions' | 'ratingCriteria' | 'ratingCriterion' | 'review' | 'reviewReplies' | 'reviewReply' | 'reviewRequest' | 'reviewRequests' | 'reviews'> & { content?: Maybe<ResolversParentTypes['ReviewContent']>, contentExternalReference?: Maybe<ResolversParentTypes['ReviewContentExternalReference']>, contentExternalReferences: ResolversParentTypes['ReviewContentExternalReferenceConnection'], contentReport?: Maybe<ResolversParentTypes['ReviewContentReport']>, contentReports: ResolversParentTypes['ReviewContentReportConnection'], contents: ResolversParentTypes['ReviewContentConnection'], moderationCase?: Maybe<ResolversParentTypes['ReviewModerationCase']>, moderationCases: ResolversParentTypes['ReviewModerationCaseConnection'], node?: Maybe<ResolversParentTypes['Node']>, nodes: Array<Maybe<ResolversParentTypes['Node']>>, productQuestion?: Maybe<ResolversParentTypes['ProductQuestion']>, productQuestionAnswer?: Maybe<ResolversParentTypes['ProductQuestionAnswer']>, productQuestionAnswers: ResolversParentTypes['ProductQuestionAnswerConnection'], productQuestions: ResolversParentTypes['ProductQuestionConnection'], ratingCriteria: ResolversParentTypes['ReviewRatingCriterionConnection'], ratingCriterion?: Maybe<ResolversParentTypes['ReviewRatingCriterion']>, review?: Maybe<ResolversParentTypes['Review']>, reviewReplies: ResolversParentTypes['ReviewReplyConnection'], reviewReply?: Maybe<ResolversParentTypes['ReviewReply']>, reviewRequest?: Maybe<ResolversParentTypes['ReviewRequest']>, reviewRequests: ResolversParentTypes['ReviewRequestConnection'], reviews: ResolversParentTypes['ReviewConnection'] };
  StringFilter: StringFilter;
  UserError: ResolversInterfaceTypes<ResolversParentTypes>['UserError'];
  Variant: Variant;
  WidgetQuery: Omit<WidgetQuery, 'reviews'> & { reviews: ResolversParentTypes['ProductReviewsWidget'] };
}>;

export interface BigIntScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['BigInt'], any> {
  name: 'BigInt';
}

export type CategoryResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['Category'] = ResolversParentTypes['Category']> = ResolversObject<{
  __resolveReference?: ReferenceResolver<Maybe<ResolversTypes['Category']>, ParentType, ContextType>;

  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CustomerResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['Customer'] = ResolversParentTypes['Customer']> = ResolversObject<{
  __resolveReference?: ReferenceResolver<Maybe<ResolversTypes['Customer']>, ParentType, ContextType>;

  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

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
  reviewsMutation?: Resolver<ResolversTypes['ReviewsMutation'], ParentType, ContextType>;
}>;

export type NodeResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['Node'] = ResolversParentTypes['Node']> = ResolversObject<{
  __resolveType: TypeResolveFn<'Category' | 'Customer' | 'File' | 'Product' | 'ProductQuestion' | 'ProductQuestionAnswer' | 'ProductQuestionSubscription' | 'Review' | 'ReviewContentExternalReference' | 'ReviewContentPublication' | 'ReviewContentReport' | 'ReviewContentRevision' | 'ReviewContentTranslation' | 'ReviewContentVote' | 'ReviewMedia' | 'ReviewModerationCase' | 'ReviewModerationEvent' | 'ReviewModerationSignal' | 'ReviewRatingCriterion' | 'ReviewRatingCriterionAssignment' | 'ReviewReply' | 'ReviewRequest' | 'ReviewRequestEvent' | 'ReviewStoreConfiguration' | 'Variant', ParentType, ContextType>;
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

export type ProductQuestionResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ProductQuestion'] = ResolversParentTypes['ProductQuestion']> = ResolversObject<{
  __resolveReference?: ReferenceResolver<Maybe<ResolversTypes['ProductQuestion']>, { __typename: 'ProductQuestion' } & GraphQLRecursivePick<ParentType, {"id":true}>, ContextType>;
  answerState?: Resolver<ResolversTypes['ProductQuestionAnswerState'], ParentType, ContextType>;
  answers?: Resolver<ResolversTypes['ProductQuestionAnswerConnection'], ParentType, ContextType, Partial<ProductQuestionAnswersArgs>>;
  author?: Resolver<ResolversTypes['ReviewContentAuthor'], ParentType, ContextType>;
  body?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  deletedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  externalReferences?: Resolver<ResolversTypes['ReviewContentExternalReferenceConnection'], ParentType, ContextType, Partial<ProductQuestionExternalReferencesArgs>>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  idempotencyKey?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  kind?: Resolver<ResolversTypes['ReviewContentKind'], ParentType, ContextType>;
  locale?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  metrics?: Resolver<ResolversTypes['ReviewContentMetrics'], ParentType, ContextType>;
  moderatedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  moderatedByPrincipalId?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  moderationCases?: Resolver<ResolversTypes['ReviewModerationCaseConnection'], ParentType, ContextType, Partial<ProductQuestionModerationCasesArgs>>;
  moderationEvents?: Resolver<ResolversTypes['ReviewModerationEventConnection'], ParentType, ContextType, Partial<ProductQuestionModerationEventsArgs>>;
  moderationNote?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  moderationSignals?: Resolver<ResolversTypes['ReviewModerationSignalConnection'], ParentType, ContextType, Partial<ProductQuestionModerationSignalsArgs>>;
  product?: Resolver<ResolversTypes['Product'], ParentType, ContextType>;
  publications?: Resolver<Array<ResolversTypes['ReviewContentPublication']>, ParentType, ContextType>;
  publishedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  redactedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  reports?: Resolver<ResolversTypes['ReviewContentReportConnection'], ParentType, ContextType, Partial<ProductQuestionReportsArgs>>;
  revision?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  revisions?: Resolver<ResolversTypes['ReviewContentRevisionConnection'], ParentType, ContextType, Partial<ProductQuestionRevisionsArgs>>;
  sourceChannel?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  sourceMetadata?: Resolver<ResolversTypes['JSON'], ParentType, ContextType>;
  status?: Resolver<ResolversTypes['ReviewContentStatus'], ParentType, ContextType>;
  subscriptions?: Resolver<ResolversTypes['ProductQuestionSubscriptionConnection'], ParentType, ContextType, Partial<ProductQuestionSubscriptionsArgs>>;
  title?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  translations?: Resolver<Array<ResolversTypes['ReviewContentTranslation']>, ParentType, ContextType>;
  unpublishedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  variant?: Resolver<Maybe<ResolversTypes['Variant']>, ParentType, ContextType>;
  votes?: Resolver<ResolversTypes['ReviewContentVoteConnection'], ParentType, ContextType, Partial<ProductQuestionVotesArgs>>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ProductQuestionAnswerResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ProductQuestionAnswer'] = ResolversParentTypes['ProductQuestionAnswer']> = ResolversObject<{
  __resolveReference?: ReferenceResolver<Maybe<ResolversTypes['ProductQuestionAnswer']>, { __typename: 'ProductQuestionAnswer' } & GraphQLRecursivePick<ParentType, {"id":true}>, ContextType>;
  author?: Resolver<ResolversTypes['ReviewContentAuthor'], ParentType, ContextType>;
  body?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  deletedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  externalReferences?: Resolver<ResolversTypes['ReviewContentExternalReferenceConnection'], ParentType, ContextType, Partial<ProductQuestionAnswerExternalReferencesArgs>>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  idempotencyKey?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  isAccepted?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  isOfficial?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  kind?: Resolver<ResolversTypes['ReviewContentKind'], ParentType, ContextType>;
  locale?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  metrics?: Resolver<ResolversTypes['ReviewContentMetrics'], ParentType, ContextType>;
  moderatedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  moderatedByPrincipalId?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  moderationCases?: Resolver<ResolversTypes['ReviewModerationCaseConnection'], ParentType, ContextType, Partial<ProductQuestionAnswerModerationCasesArgs>>;
  moderationEvents?: Resolver<ResolversTypes['ReviewModerationEventConnection'], ParentType, ContextType, Partial<ProductQuestionAnswerModerationEventsArgs>>;
  moderationNote?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  moderationSignals?: Resolver<ResolversTypes['ReviewModerationSignalConnection'], ParentType, ContextType, Partial<ProductQuestionAnswerModerationSignalsArgs>>;
  publications?: Resolver<Array<ResolversTypes['ReviewContentPublication']>, ParentType, ContextType>;
  publishedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  question?: Resolver<ResolversTypes['ProductQuestion'], ParentType, ContextType>;
  redactedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  reports?: Resolver<ResolversTypes['ReviewContentReportConnection'], ParentType, ContextType, Partial<ProductQuestionAnswerReportsArgs>>;
  revision?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  revisions?: Resolver<ResolversTypes['ReviewContentRevisionConnection'], ParentType, ContextType, Partial<ProductQuestionAnswerRevisionsArgs>>;
  sortIndex?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  sourceChannel?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  sourceMetadata?: Resolver<ResolversTypes['JSON'], ParentType, ContextType>;
  status?: Resolver<ResolversTypes['ReviewContentStatus'], ParentType, ContextType>;
  title?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  translations?: Resolver<Array<ResolversTypes['ReviewContentTranslation']>, ParentType, ContextType>;
  unpublishedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  votes?: Resolver<ResolversTypes['ReviewContentVoteConnection'], ParentType, ContextType, Partial<ProductQuestionAnswerVotesArgs>>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ProductQuestionAnswerConnectionResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ProductQuestionAnswerConnection'] = ResolversParentTypes['ProductQuestionAnswerConnection']> = ResolversObject<{
  edges?: Resolver<Array<ResolversTypes['ProductQuestionAnswerEdge']>, ParentType, ContextType>;
  pageInfo?: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ProductQuestionAnswerEdgeResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ProductQuestionAnswerEdge'] = ResolversParentTypes['ProductQuestionAnswerEdge']> = ResolversObject<{
  cursor?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  node?: Resolver<ResolversTypes['ProductQuestionAnswer'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ProductQuestionConnectionResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ProductQuestionConnection'] = ResolversParentTypes['ProductQuestionConnection']> = ResolversObject<{
  edges?: Resolver<Array<ResolversTypes['ProductQuestionEdge']>, ParentType, ContextType>;
  pageInfo?: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ProductQuestionCreatePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ProductQuestionCreatePayload'] = ResolversParentTypes['ProductQuestionCreatePayload']> = ResolversObject<{
  productQuestion?: Resolver<Maybe<ResolversTypes['ProductQuestion']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ProductQuestionDeletePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ProductQuestionDeletePayload'] = ResolversParentTypes['ProductQuestionDeletePayload']> = ResolversObject<{
  deletedProductQuestionId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ProductQuestionEdgeResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ProductQuestionEdge'] = ResolversParentTypes['ProductQuestionEdge']> = ResolversObject<{
  cursor?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  node?: Resolver<ResolversTypes['ProductQuestion'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ProductQuestionSubscriptionResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ProductQuestionSubscription'] = ResolversParentTypes['ProductQuestionSubscription']> = ResolversObject<{
  __resolveReference?: ReferenceResolver<Maybe<ResolversTypes['ProductQuestionSubscription']>, { __typename: 'ProductQuestionSubscription' } & GraphQLRecursivePick<ParentType, {"id":true}>, ContextType>;
  channel?: Resolver<ResolversTypes['ReviewNotificationChannel'], ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  lastNotifiedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  locale?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  question?: Resolver<ResolversTypes['ProductQuestion'], ParentType, ContextType>;
  status?: Resolver<ResolversTypes['ProductQuestionSubscriptionStatus'], ParentType, ContextType>;
  subscriberCustomer?: Resolver<Maybe<ResolversTypes['Customer']>, ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ProductQuestionSubscriptionConnectionResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ProductQuestionSubscriptionConnection'] = ResolversParentTypes['ProductQuestionSubscriptionConnection']> = ResolversObject<{
  edges?: Resolver<Array<ResolversTypes['ProductQuestionSubscriptionEdge']>, ParentType, ContextType>;
  pageInfo?: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ProductQuestionSubscriptionEdgeResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ProductQuestionSubscriptionEdge'] = ResolversParentTypes['ProductQuestionSubscriptionEdge']> = ResolversObject<{
  cursor?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  node?: Resolver<ResolversTypes['ProductQuestionSubscription'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ProductQuestionSubscriptionUpdatePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ProductQuestionSubscriptionUpdatePayload'] = ResolversParentTypes['ProductQuestionSubscriptionUpdatePayload']> = ResolversObject<{
  operationResults?: Resolver<Array<ResolversTypes['ReviewsOperationResult']>, ParentType, ContextType>;
  subscription?: Resolver<Maybe<ResolversTypes['ProductQuestionSubscription']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ProductQuestionSummaryResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ProductQuestionSummary'] = ResolversParentTypes['ProductQuestionSummary']> = ResolversObject<{
  answerCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  answeredQuestionCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  lastAnsweredAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  lastQuestionAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  officialAnswerCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  product?: Resolver<ResolversTypes['Product'], ParentType, ContextType>;
  questionCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  unansweredQuestionCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ProductQuestionUpdatePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ProductQuestionUpdatePayload'] = ResolversParentTypes['ProductQuestionUpdatePayload']> = ResolversObject<{
  operationResults?: Resolver<Array<ResolversTypes['ReviewsOperationResult']>, ParentType, ContextType>;
  productQuestion?: Resolver<Maybe<ResolversTypes['ProductQuestion']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ProductRatingCriterionSummaryResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ProductRatingCriterionSummary'] = ResolversParentTypes['ProductRatingCriterionSummary']> = ResolversObject<{
  averageRating?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  criterion?: Resolver<ResolversTypes['ReviewRatingCriterion'], ParentType, ContextType>;
  ratingBreakdown?: Resolver<ResolversTypes['ReviewRatingBreakdown'], ParentType, ContextType>;
  ratingSum?: Resolver<ResolversTypes['BigInt'], ParentType, ContextType>;
  reviewCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ProductReviewSummaryResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ProductReviewSummary'] = ResolversParentTypes['ProductReviewSummary']> = ResolversObject<{
  averageRating?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  criteria?: Resolver<Array<ResolversTypes['ProductRatingCriterionSummary']>, ParentType, ContextType>;
  lastReviewedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  mediaReviewCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  product?: Resolver<ResolversTypes['Product'], ParentType, ContextType>;
  ratingBreakdown?: Resolver<ResolversTypes['ReviewRatingBreakdown'], ParentType, ContextType>;
  ratingSum?: Resolver<ResolversTypes['BigInt'], ParentType, ContextType>;
  reviewCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  verifiedReviewCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ProductReviewsWidgetResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ProductReviewsWidget'] = ResolversParentTypes['ProductReviewsWidget']> = ResolversObject<{
  questionSummary?: Resolver<Maybe<ResolversTypes['ProductQuestionSummary']>, ParentType, ContextType>;
  reviewSummary?: Resolver<Maybe<ResolversTypes['ProductReviewSummary']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type QueryResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['Query'] = ResolversParentTypes['Query']> = ResolversObject<{
  reviewsQuery?: Resolver<ResolversTypes['ReviewsQuery'], ParentType, ContextType>;
  widgetQuery?: Resolver<ResolversTypes['WidgetQuery'], ParentType, ContextType>;
}>;

export type ReviewResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['Review'] = ResolversParentTypes['Review']> = ResolversObject<{
  __resolveReference?: ReferenceResolver<Maybe<ResolversTypes['Review']>, { __typename: 'Review' } & GraphQLRecursivePick<ParentType, {"id":true}>, ContextType>;
  author?: Resolver<ResolversTypes['ReviewContentAuthor'], ParentType, ContextType>;
  body?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  deletedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  externalReferences?: Resolver<ResolversTypes['ReviewContentExternalReferenceConnection'], ParentType, ContextType, Partial<ReviewExternalReferencesArgs>>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  idempotencyKey?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  incentiveDisclosure?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  isIncentivized?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  isVerifiedPurchase?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  kind?: Resolver<ResolversTypes['ReviewContentKind'], ParentType, ContextType>;
  locale?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  media?: Resolver<Array<ResolversTypes['ReviewMedia']>, ParentType, ContextType>;
  metrics?: Resolver<ResolversTypes['ReviewContentMetrics'], ParentType, ContextType>;
  moderatedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  moderatedByPrincipalId?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  moderationCases?: Resolver<ResolversTypes['ReviewModerationCaseConnection'], ParentType, ContextType, Partial<ReviewModerationCasesArgs>>;
  moderationEvents?: Resolver<ResolversTypes['ReviewModerationEventConnection'], ParentType, ContextType, Partial<ReviewModerationEventsArgs>>;
  moderationNote?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  moderationSignals?: Resolver<ResolversTypes['ReviewModerationSignalConnection'], ParentType, ContextType, Partial<ReviewModerationSignalsArgs>>;
  orderId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  orderLineId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  product?: Resolver<ResolversTypes['Product'], ParentType, ContextType>;
  publications?: Resolver<Array<ResolversTypes['ReviewContentPublication']>, ParentType, ContextType>;
  publishedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  rating?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  ratings?: Resolver<Array<ResolversTypes['ReviewRating']>, ParentType, ContextType>;
  redactedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  replies?: Resolver<ResolversTypes['ReviewReplyConnection'], ParentType, ContextType, Partial<ReviewRepliesArgs>>;
  reports?: Resolver<ResolversTypes['ReviewContentReportConnection'], ParentType, ContextType, Partial<ReviewReportsArgs>>;
  revision?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  revisions?: Resolver<ResolversTypes['ReviewContentRevisionConnection'], ParentType, ContextType, Partial<ReviewRevisionsArgs>>;
  sourceChannel?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  sourceMetadata?: Resolver<ResolversTypes['JSON'], ParentType, ContextType>;
  status?: Resolver<ResolversTypes['ReviewContentStatus'], ParentType, ContextType>;
  title?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  translations?: Resolver<Array<ResolversTypes['ReviewContentTranslation']>, ParentType, ContextType>;
  unpublishedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  variant?: Resolver<Maybe<ResolversTypes['Variant']>, ParentType, ContextType>;
  verificationMethod?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  verificationStatus?: Resolver<ResolversTypes['ReviewVerificationStatus'], ParentType, ContextType>;
  verifiedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  votes?: Resolver<ResolversTypes['ReviewContentVoteConnection'], ParentType, ContextType, Partial<ReviewVotesArgs>>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ReviewConnectionResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ReviewConnection'] = ResolversParentTypes['ReviewConnection']> = ResolversObject<{
  edges?: Resolver<Array<ResolversTypes['ReviewEdge']>, ParentType, ContextType>;
  pageInfo?: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ReviewContentResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ReviewContent'] = ResolversParentTypes['ReviewContent']> = ResolversObject<{
  __resolveType: TypeResolveFn<'ProductQuestion' | 'ProductQuestionAnswer' | 'Review' | 'ReviewReply', ParentType, ContextType>;
  author?: Resolver<ResolversTypes['ReviewContentAuthor'], ParentType, ContextType>;
  body?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  deletedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  externalReferences?: Resolver<ResolversTypes['ReviewContentExternalReferenceConnection'], ParentType, ContextType, Partial<ReviewContentExternalReferencesArgs>>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  idempotencyKey?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  kind?: Resolver<ResolversTypes['ReviewContentKind'], ParentType, ContextType>;
  locale?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  metrics?: Resolver<ResolversTypes['ReviewContentMetrics'], ParentType, ContextType>;
  moderatedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  moderatedByPrincipalId?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  moderationCases?: Resolver<ResolversTypes['ReviewModerationCaseConnection'], ParentType, ContextType, Partial<ReviewContentModerationCasesArgs>>;
  moderationEvents?: Resolver<ResolversTypes['ReviewModerationEventConnection'], ParentType, ContextType, Partial<ReviewContentModerationEventsArgs>>;
  moderationNote?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  moderationSignals?: Resolver<ResolversTypes['ReviewModerationSignalConnection'], ParentType, ContextType, Partial<ReviewContentModerationSignalsArgs>>;
  publications?: Resolver<Array<ResolversTypes['ReviewContentPublication']>, ParentType, ContextType>;
  publishedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  redactedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  reports?: Resolver<ResolversTypes['ReviewContentReportConnection'], ParentType, ContextType, Partial<ReviewContentReportsArgs>>;
  revision?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  revisions?: Resolver<ResolversTypes['ReviewContentRevisionConnection'], ParentType, ContextType, Partial<ReviewContentRevisionsArgs>>;
  sourceChannel?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  sourceMetadata?: Resolver<ResolversTypes['JSON'], ParentType, ContextType>;
  status?: Resolver<ResolversTypes['ReviewContentStatus'], ParentType, ContextType>;
  title?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  translations?: Resolver<Array<ResolversTypes['ReviewContentTranslation']>, ParentType, ContextType>;
  unpublishedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  votes?: Resolver<ResolversTypes['ReviewContentVoteConnection'], ParentType, ContextType, Partial<ReviewContentVotesArgs>>;
}>;

export type ReviewContentAuthorResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ReviewContentAuthor'] = ResolversParentTypes['ReviewContentAuthor']> = ResolversObject<{
  customer?: Resolver<Maybe<ResolversTypes['Customer']>, ParentType, ContextType>;
  displayName?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  email?: Resolver<Maybe<ResolversTypes['Email']>, ParentType, ContextType>;
  principalId?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  type?: Resolver<ResolversTypes['ReviewContentAuthorType'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ReviewContentConnectionResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ReviewContentConnection'] = ResolversParentTypes['ReviewContentConnection']> = ResolversObject<{
  edges?: Resolver<Array<ResolversTypes['ReviewContentEdge']>, ParentType, ContextType>;
  pageInfo?: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ReviewContentEdgeResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ReviewContentEdge'] = ResolversParentTypes['ReviewContentEdge']> = ResolversObject<{
  cursor?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  node?: Resolver<ResolversTypes['ReviewContent'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ReviewContentExternalReferenceResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ReviewContentExternalReference'] = ResolversParentTypes['ReviewContentExternalReference']> = ResolversObject<{
  __resolveReference?: ReferenceResolver<Maybe<ResolversTypes['ReviewContentExternalReference']>, { __typename: 'ReviewContentExternalReference' } & GraphQLRecursivePick<ParentType, {"id":true}>, ContextType>;
  content?: Resolver<ResolversTypes['ReviewContent'], ParentType, ContextType>;
  contentChecksum?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  deletedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  direction?: Resolver<ResolversTypes['ReviewExternalSyncDirection'], ParentType, ContextType>;
  etag?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  externalId?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  externalSystem?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  externalType?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  externalUrl?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  lastError?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  lastSyncedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  metadata?: Resolver<ResolversTypes['JSON'], ParentType, ContextType>;
  syncStatus?: Resolver<ResolversTypes['ReviewExternalSyncStatus'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ReviewContentExternalReferenceConnectionResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ReviewContentExternalReferenceConnection'] = ResolversParentTypes['ReviewContentExternalReferenceConnection']> = ResolversObject<{
  edges?: Resolver<Array<ResolversTypes['ReviewContentExternalReferenceEdge']>, ParentType, ContextType>;
  pageInfo?: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ReviewContentExternalReferenceCreatePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ReviewContentExternalReferenceCreatePayload'] = ResolversParentTypes['ReviewContentExternalReferenceCreatePayload']> = ResolversObject<{
  externalReference?: Resolver<Maybe<ResolversTypes['ReviewContentExternalReference']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ReviewContentExternalReferenceDeletePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ReviewContentExternalReferenceDeletePayload'] = ResolversParentTypes['ReviewContentExternalReferenceDeletePayload']> = ResolversObject<{
  deletedExternalReferenceId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ReviewContentExternalReferenceEdgeResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ReviewContentExternalReferenceEdge'] = ResolversParentTypes['ReviewContentExternalReferenceEdge']> = ResolversObject<{
  cursor?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  node?: Resolver<ResolversTypes['ReviewContentExternalReference'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ReviewContentExternalReferenceUpdatePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ReviewContentExternalReferenceUpdatePayload'] = ResolversParentTypes['ReviewContentExternalReferenceUpdatePayload']> = ResolversObject<{
  externalReference?: Resolver<Maybe<ResolversTypes['ReviewContentExternalReference']>, ParentType, ContextType>;
  operationResults?: Resolver<Array<ResolversTypes['ReviewsOperationResult']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ReviewContentMetricsResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ReviewContentMetrics'] = ResolversParentTypes['ReviewContentMetrics']> = ResolversObject<{
  acceptedChildCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  childCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  dislikeCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  lastChildAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  likeCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  mediaCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  officialChildCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  openReportCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  reportCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ReviewContentPublicationResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ReviewContentPublication'] = ResolversParentTypes['ReviewContentPublication']> = ResolversObject<{
  __resolveReference?: ReferenceResolver<Maybe<ResolversTypes['ReviewContentPublication']>, { __typename: 'ReviewContentPublication' } & GraphQLRecursivePick<ParentType, {"id":true}>, ContextType>;
  channel?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  content?: Resolver<ResolversTypes['ReviewContent'], ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  lastError?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  locale?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  publishedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  scheduledAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  status?: Resolver<ResolversTypes['ReviewPublicationStatus'], ParentType, ContextType>;
  unpublishedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ReviewContentReportResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ReviewContentReport'] = ResolversParentTypes['ReviewContentReport']> = ResolversObject<{
  __resolveReference?: ReferenceResolver<Maybe<ResolversTypes['ReviewContentReport']>, { __typename: 'ReviewContentReport' } & GraphQLRecursivePick<ParentType, {"id":true}>, ContextType>;
  assignedToPrincipalId?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  content?: Resolver<ResolversTypes['ReviewContent'], ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  details?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  reason?: Resolver<ResolversTypes['ReviewContentReportReason'], ParentType, ContextType>;
  reporterCustomer?: Resolver<Maybe<ResolversTypes['Customer']>, ParentType, ContextType>;
  resolutionNote?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  resolvedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  resolvedByPrincipalId?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  status?: Resolver<ResolversTypes['ReviewContentReportStatus'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ReviewContentReportConnectionResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ReviewContentReportConnection'] = ResolversParentTypes['ReviewContentReportConnection']> = ResolversObject<{
  edges?: Resolver<Array<ResolversTypes['ReviewContentReportEdge']>, ParentType, ContextType>;
  pageInfo?: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ReviewContentReportEdgeResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ReviewContentReportEdge'] = ResolversParentTypes['ReviewContentReportEdge']> = ResolversObject<{
  cursor?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  node?: Resolver<ResolversTypes['ReviewContentReport'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ReviewContentReportUpdatePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ReviewContentReportUpdatePayload'] = ResolversParentTypes['ReviewContentReportUpdatePayload']> = ResolversObject<{
  contentReport?: Resolver<Maybe<ResolversTypes['ReviewContentReport']>, ParentType, ContextType>;
  operationResults?: Resolver<Array<ResolversTypes['ReviewsOperationResult']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ReviewContentRevisionResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ReviewContentRevision'] = ResolversParentTypes['ReviewContentRevision']> = ResolversObject<{
  __resolveReference?: ReferenceResolver<Maybe<ResolversTypes['ReviewContentRevision']>, { __typename: 'ReviewContentRevision' } & GraphQLRecursivePick<ParentType, {"id":true}>, ContextType>;
  changeReason?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  changedById?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  changedByType?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  content?: Resolver<ResolversTypes['ReviewContent'], ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  revision?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  snapshot?: Resolver<ResolversTypes['JSON'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ReviewContentRevisionConnectionResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ReviewContentRevisionConnection'] = ResolversParentTypes['ReviewContentRevisionConnection']> = ResolversObject<{
  edges?: Resolver<Array<ResolversTypes['ReviewContentRevisionEdge']>, ParentType, ContextType>;
  pageInfo?: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ReviewContentRevisionEdgeResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ReviewContentRevisionEdge'] = ResolversParentTypes['ReviewContentRevisionEdge']> = ResolversObject<{
  cursor?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  node?: Resolver<ResolversTypes['ReviewContentRevision'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ReviewContentTranslationResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ReviewContentTranslation'] = ResolversParentTypes['ReviewContentTranslation']> = ResolversObject<{
  __resolveReference?: ReferenceResolver<Maybe<ResolversTypes['ReviewContentTranslation']>, { __typename: 'ReviewContentTranslation' } & GraphQLRecursivePick<ParentType, {"id":true}>, ContextType>;
  body?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  content?: Resolver<ResolversTypes['ReviewContent'], ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  locale?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  reviewedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  reviewedByPrincipalId?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  revision?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  source?: Resolver<ResolversTypes['ReviewTranslationSource'], ParentType, ContextType>;
  status?: Resolver<ResolversTypes['ReviewContentStatus'], ParentType, ContextType>;
  title?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ReviewContentUpdatePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ReviewContentUpdatePayload'] = ResolversParentTypes['ReviewContentUpdatePayload']> = ResolversObject<{
  content?: Resolver<Maybe<ResolversTypes['ReviewContent']>, ParentType, ContextType>;
  operationResults?: Resolver<Array<ResolversTypes['ReviewsOperationResult']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ReviewContentVoteResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ReviewContentVote'] = ResolversParentTypes['ReviewContentVote']> = ResolversObject<{
  __resolveReference?: ReferenceResolver<Maybe<ResolversTypes['ReviewContentVote']>, { __typename: 'ReviewContentVote' } & GraphQLRecursivePick<ParentType, {"id":true}>, ContextType>;
  content?: Resolver<ResolversTypes['ReviewContent'], ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  type?: Resolver<ResolversTypes['ReviewContentVoteType'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  voterCustomer?: Resolver<Maybe<ResolversTypes['Customer']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ReviewContentVoteConnectionResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ReviewContentVoteConnection'] = ResolversParentTypes['ReviewContentVoteConnection']> = ResolversObject<{
  edges?: Resolver<Array<ResolversTypes['ReviewContentVoteEdge']>, ParentType, ContextType>;
  pageInfo?: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ReviewContentVoteEdgeResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ReviewContentVoteEdge'] = ResolversParentTypes['ReviewContentVoteEdge']> = ResolversObject<{
  cursor?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  node?: Resolver<ResolversTypes['ReviewContentVote'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ReviewCreatePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ReviewCreatePayload'] = ResolversParentTypes['ReviewCreatePayload']> = ResolversObject<{
  review?: Resolver<Maybe<ResolversTypes['Review']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ReviewDeletePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ReviewDeletePayload'] = ResolversParentTypes['ReviewDeletePayload']> = ResolversObject<{
  deletedReviewId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ReviewEdgeResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ReviewEdge'] = ResolversParentTypes['ReviewEdge']> = ResolversObject<{
  cursor?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  node?: Resolver<ResolversTypes['Review'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ReviewMediaResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ReviewMedia'] = ResolversParentTypes['ReviewMedia']> = ResolversObject<{
  __resolveReference?: ReferenceResolver<Maybe<ResolversTypes['ReviewMedia']>, { __typename: 'ReviewMedia' } & GraphQLRecursivePick<ParentType, {"id":true}>, ContextType>;
  caption?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  file?: Resolver<ResolversTypes['File'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  moderatedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  moderatedByPrincipalId?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  moderationNote?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  review?: Resolver<ResolversTypes['Review'], ParentType, ContextType>;
  sortIndex?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  status?: Resolver<ResolversTypes['ReviewContentStatus'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ReviewModerationCaseResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ReviewModerationCase'] = ResolversParentTypes['ReviewModerationCase']> = ResolversObject<{
  __resolveReference?: ReferenceResolver<Maybe<ResolversTypes['ReviewModerationCase']>, { __typename: 'ReviewModerationCase' } & GraphQLRecursivePick<ParentType, {"id":true}>, ContextType>;
  assignedToPrincipalId?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  content?: Resolver<ResolversTypes['ReviewContent'], ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  dueAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  priority?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  reasonCode?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  resolutionCode?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  resolutionNote?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  resolvedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  resolvedByPrincipalId?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  status?: Resolver<ResolversTypes['ReviewModerationCaseStatus'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ReviewModerationCaseConnectionResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ReviewModerationCaseConnection'] = ResolversParentTypes['ReviewModerationCaseConnection']> = ResolversObject<{
  edges?: Resolver<Array<ResolversTypes['ReviewModerationCaseEdge']>, ParentType, ContextType>;
  pageInfo?: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ReviewModerationCaseCreatePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ReviewModerationCaseCreatePayload'] = ResolversParentTypes['ReviewModerationCaseCreatePayload']> = ResolversObject<{
  moderationCase?: Resolver<Maybe<ResolversTypes['ReviewModerationCase']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ReviewModerationCaseEdgeResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ReviewModerationCaseEdge'] = ResolversParentTypes['ReviewModerationCaseEdge']> = ResolversObject<{
  cursor?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  node?: Resolver<ResolversTypes['ReviewModerationCase'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ReviewModerationCaseUpdatePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ReviewModerationCaseUpdatePayload'] = ResolversParentTypes['ReviewModerationCaseUpdatePayload']> = ResolversObject<{
  moderationCase?: Resolver<Maybe<ResolversTypes['ReviewModerationCase']>, ParentType, ContextType>;
  operationResults?: Resolver<Array<ResolversTypes['ReviewsOperationResult']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ReviewModerationEventResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ReviewModerationEvent'] = ResolversParentTypes['ReviewModerationEvent']> = ResolversObject<{
  __resolveReference?: ReferenceResolver<Maybe<ResolversTypes['ReviewModerationEvent']>, { __typename: 'ReviewModerationEvent' } & GraphQLRecursivePick<ParentType, {"id":true}>, ContextType>;
  action?: Resolver<ResolversTypes['ReviewModerationAction'], ParentType, ContextType>;
  actorId?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  actorType?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  content?: Resolver<ResolversTypes['ReviewContent'], ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  fromStatus?: Resolver<Maybe<ResolversTypes['ReviewContentStatus']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  isAutomated?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  metadata?: Resolver<ResolversTypes['JSON'], ParentType, ContextType>;
  moderationCase?: Resolver<Maybe<ResolversTypes['ReviewModerationCase']>, ParentType, ContextType>;
  note?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  reasonCode?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  toStatus?: Resolver<Maybe<ResolversTypes['ReviewContentStatus']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ReviewModerationEventConnectionResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ReviewModerationEventConnection'] = ResolversParentTypes['ReviewModerationEventConnection']> = ResolversObject<{
  edges?: Resolver<Array<ResolversTypes['ReviewModerationEventEdge']>, ParentType, ContextType>;
  pageInfo?: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ReviewModerationEventEdgeResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ReviewModerationEventEdge'] = ResolversParentTypes['ReviewModerationEventEdge']> = ResolversObject<{
  cursor?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  node?: Resolver<ResolversTypes['ReviewModerationEvent'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ReviewModerationSignalResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ReviewModerationSignal'] = ResolversParentTypes['ReviewModerationSignal']> = ResolversObject<{
  __resolveReference?: ReferenceResolver<Maybe<ResolversTypes['ReviewModerationSignal']>, { __typename: 'ReviewModerationSignal' } & GraphQLRecursivePick<ParentType, {"id":true}>, ContextType>;
  content?: Resolver<ResolversTypes['ReviewContent'], ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  evidence?: Resolver<ResolversTypes['JSON'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  modelVersion?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  provider?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  score?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>;
  signalType?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  verdict?: Resolver<ResolversTypes['ReviewModerationVerdict'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ReviewModerationSignalConnectionResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ReviewModerationSignalConnection'] = ResolversParentTypes['ReviewModerationSignalConnection']> = ResolversObject<{
  edges?: Resolver<Array<ResolversTypes['ReviewModerationSignalEdge']>, ParentType, ContextType>;
  pageInfo?: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ReviewModerationSignalEdgeResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ReviewModerationSignalEdge'] = ResolversParentTypes['ReviewModerationSignalEdge']> = ResolversObject<{
  cursor?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  node?: Resolver<ResolversTypes['ReviewModerationSignal'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ReviewRatingResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ReviewRating'] = ResolversParentTypes['ReviewRating']> = ResolversObject<{
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  criterion?: Resolver<ResolversTypes['ReviewRatingCriterion'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  value?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ReviewRatingBreakdownResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ReviewRatingBreakdown'] = ResolversParentTypes['ReviewRatingBreakdown']> = ResolversObject<{
  rating1Count?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  rating2Count?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  rating3Count?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  rating4Count?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  rating5Count?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ReviewRatingCriterionResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ReviewRatingCriterion'] = ResolversParentTypes['ReviewRatingCriterion']> = ResolversObject<{
  __resolveReference?: ReferenceResolver<Maybe<ResolversTypes['ReviewRatingCriterion']>, { __typename: 'ReviewRatingCriterion' } & GraphQLRecursivePick<ParentType, {"id":true}>, ContextType>;
  appliesToAllProducts?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  assignments?: Resolver<Array<ResolversTypes['ReviewRatingCriterionAssignment']>, ParentType, ContextType>;
  code?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  defaultDescription?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  defaultTitle?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  deletedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  isActive?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  isRequired?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  sortIndex?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  translations?: Resolver<Array<ResolversTypes['ReviewRatingCriterionTranslation']>, ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  weight?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ReviewRatingCriterionAssignmentResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ReviewRatingCriterionAssignment'] = ResolversParentTypes['ReviewRatingCriterionAssignment']> = ResolversObject<{
  __resolveReference?: ReferenceResolver<Maybe<ResolversTypes['ReviewRatingCriterionAssignment']>, { __typename: 'ReviewRatingCriterionAssignment' } & GraphQLRecursivePick<ParentType, {"id":true}>, ContextType>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  criterion?: Resolver<ResolversTypes['ReviewRatingCriterion'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  isRequiredOverride?: Resolver<Maybe<ResolversTypes['Boolean']>, ParentType, ContextType>;
  sortIndexOverride?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  target?: Resolver<ResolversTypes['ReviewRatingCriterionTarget'], ParentType, ContextType>;
  targetId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  targetType?: Resolver<ResolversTypes['ReviewRatingCriterionTargetType'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ReviewRatingCriterionConnectionResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ReviewRatingCriterionConnection'] = ResolversParentTypes['ReviewRatingCriterionConnection']> = ResolversObject<{
  edges?: Resolver<Array<ResolversTypes['ReviewRatingCriterionEdge']>, ParentType, ContextType>;
  pageInfo?: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ReviewRatingCriterionCreatePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ReviewRatingCriterionCreatePayload'] = ResolversParentTypes['ReviewRatingCriterionCreatePayload']> = ResolversObject<{
  criterion?: Resolver<Maybe<ResolversTypes['ReviewRatingCriterion']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ReviewRatingCriterionDeletePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ReviewRatingCriterionDeletePayload'] = ResolversParentTypes['ReviewRatingCriterionDeletePayload']> = ResolversObject<{
  deletedCriterionId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ReviewRatingCriterionEdgeResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ReviewRatingCriterionEdge'] = ResolversParentTypes['ReviewRatingCriterionEdge']> = ResolversObject<{
  cursor?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  node?: Resolver<ResolversTypes['ReviewRatingCriterion'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ReviewRatingCriterionTargetResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ReviewRatingCriterionTarget'] = ResolversParentTypes['ReviewRatingCriterionTarget']> = ResolversObject<{
  __resolveType: TypeResolveFn<'Category' | 'Product', ParentType, ContextType>;
}>;

export type ReviewRatingCriterionTranslationResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ReviewRatingCriterionTranslation'] = ResolversParentTypes['ReviewRatingCriterionTranslation']> = ResolversObject<{
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  description?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  locale?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  title?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ReviewRatingCriterionUpdatePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ReviewRatingCriterionUpdatePayload'] = ResolversParentTypes['ReviewRatingCriterionUpdatePayload']> = ResolversObject<{
  criterion?: Resolver<Maybe<ResolversTypes['ReviewRatingCriterion']>, ParentType, ContextType>;
  operationResults?: Resolver<Array<ResolversTypes['ReviewsOperationResult']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ReviewReplyResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ReviewReply'] = ResolversParentTypes['ReviewReply']> = ResolversObject<{
  __resolveReference?: ReferenceResolver<Maybe<ResolversTypes['ReviewReply']>, { __typename: 'ReviewReply' } & GraphQLRecursivePick<ParentType, {"id":true}>, ContextType>;
  author?: Resolver<ResolversTypes['ReviewContentAuthor'], ParentType, ContextType>;
  body?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  deletedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  externalReferences?: Resolver<ResolversTypes['ReviewContentExternalReferenceConnection'], ParentType, ContextType, Partial<ReviewReplyExternalReferencesArgs>>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  idempotencyKey?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  isOfficial?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  kind?: Resolver<ResolversTypes['ReviewContentKind'], ParentType, ContextType>;
  locale?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  metrics?: Resolver<ResolversTypes['ReviewContentMetrics'], ParentType, ContextType>;
  moderatedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  moderatedByPrincipalId?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  moderationCases?: Resolver<ResolversTypes['ReviewModerationCaseConnection'], ParentType, ContextType, Partial<ReviewReplyModerationCasesArgs>>;
  moderationEvents?: Resolver<ResolversTypes['ReviewModerationEventConnection'], ParentType, ContextType, Partial<ReviewReplyModerationEventsArgs>>;
  moderationNote?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  moderationSignals?: Resolver<ResolversTypes['ReviewModerationSignalConnection'], ParentType, ContextType, Partial<ReviewReplyModerationSignalsArgs>>;
  publications?: Resolver<Array<ResolversTypes['ReviewContentPublication']>, ParentType, ContextType>;
  publishedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  redactedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  reports?: Resolver<ResolversTypes['ReviewContentReportConnection'], ParentType, ContextType, Partial<ReviewReplyReportsArgs>>;
  review?: Resolver<ResolversTypes['Review'], ParentType, ContextType>;
  revision?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  revisions?: Resolver<ResolversTypes['ReviewContentRevisionConnection'], ParentType, ContextType, Partial<ReviewReplyRevisionsArgs>>;
  sortIndex?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  sourceChannel?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  sourceMetadata?: Resolver<ResolversTypes['JSON'], ParentType, ContextType>;
  status?: Resolver<ResolversTypes['ReviewContentStatus'], ParentType, ContextType>;
  title?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  translations?: Resolver<Array<ResolversTypes['ReviewContentTranslation']>, ParentType, ContextType>;
  unpublishedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  votes?: Resolver<ResolversTypes['ReviewContentVoteConnection'], ParentType, ContextType, Partial<ReviewReplyVotesArgs>>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ReviewReplyConnectionResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ReviewReplyConnection'] = ResolversParentTypes['ReviewReplyConnection']> = ResolversObject<{
  edges?: Resolver<Array<ResolversTypes['ReviewReplyEdge']>, ParentType, ContextType>;
  pageInfo?: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ReviewReplyEdgeResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ReviewReplyEdge'] = ResolversParentTypes['ReviewReplyEdge']> = ResolversObject<{
  cursor?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  node?: Resolver<ResolversTypes['ReviewReply'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ReviewRequestResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ReviewRequest'] = ResolversParentTypes['ReviewRequest']> = ResolversObject<{
  __resolveReference?: ReferenceResolver<Maybe<ResolversTypes['ReviewRequest']>, { __typename: 'ReviewRequest' } & GraphQLRecursivePick<ParentType, {"id":true}>, ContextType>;
  attemptCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  channel?: Resolver<ResolversTypes['ReviewNotificationChannel'], ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  customer?: Resolver<ResolversTypes['Customer'], ParentType, ContextType>;
  deliveredAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  events?: Resolver<ResolversTypes['ReviewRequestEventConnection'], ParentType, ContextType, Partial<ReviewRequestEventsArgs>>;
  expiresAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  lastError?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  locale?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  openedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  orderId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  orderLineId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  product?: Resolver<ResolversTypes['Product'], ParentType, ContextType>;
  providerMessageId?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  review?: Resolver<Maybe<ResolversTypes['Review']>, ParentType, ContextType>;
  scheduledAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  sentAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  sourceChannel?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  status?: Resolver<ResolversTypes['ReviewRequestStatus'], ParentType, ContextType>;
  submittedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  variant?: Resolver<Maybe<ResolversTypes['Variant']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ReviewRequestConnectionResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ReviewRequestConnection'] = ResolversParentTypes['ReviewRequestConnection']> = ResolversObject<{
  edges?: Resolver<Array<ResolversTypes['ReviewRequestEdge']>, ParentType, ContextType>;
  pageInfo?: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ReviewRequestCreatePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ReviewRequestCreatePayload'] = ResolversParentTypes['ReviewRequestCreatePayload']> = ResolversObject<{
  reviewRequest?: Resolver<Maybe<ResolversTypes['ReviewRequest']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ReviewRequestEdgeResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ReviewRequestEdge'] = ResolversParentTypes['ReviewRequestEdge']> = ResolversObject<{
  cursor?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  node?: Resolver<ResolversTypes['ReviewRequest'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ReviewRequestEventResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ReviewRequestEvent'] = ResolversParentTypes['ReviewRequestEvent']> = ResolversObject<{
  __resolveReference?: ReferenceResolver<Maybe<ResolversTypes['ReviewRequestEvent']>, { __typename: 'ReviewRequestEvent' } & GraphQLRecursivePick<ParentType, {"id":true}>, ContextType>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  metadata?: Resolver<ResolversTypes['JSON'], ParentType, ContextType>;
  occurredAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  providerEventId?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  reviewRequest?: Resolver<ResolversTypes['ReviewRequest'], ParentType, ContextType>;
  type?: Resolver<ResolversTypes['ReviewRequestEventType'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ReviewRequestEventConnectionResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ReviewRequestEventConnection'] = ResolversParentTypes['ReviewRequestEventConnection']> = ResolversObject<{
  edges?: Resolver<Array<ResolversTypes['ReviewRequestEventEdge']>, ParentType, ContextType>;
  pageInfo?: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ReviewRequestEventEdgeResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ReviewRequestEventEdge'] = ResolversParentTypes['ReviewRequestEventEdge']> = ResolversObject<{
  cursor?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  node?: Resolver<ResolversTypes['ReviewRequestEvent'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ReviewRequestUpdatePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ReviewRequestUpdatePayload'] = ResolversParentTypes['ReviewRequestUpdatePayload']> = ResolversObject<{
  operationResults?: Resolver<Array<ResolversTypes['ReviewsOperationResult']>, ParentType, ContextType>;
  reviewRequest?: Resolver<Maybe<ResolversTypes['ReviewRequest']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ReviewStoreConfigurationResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ReviewStoreConfiguration'] = ResolversParentTypes['ReviewStoreConfiguration']> = ResolversObject<{
  __resolveReference?: ReferenceResolver<Maybe<ResolversTypes['ReviewStoreConfiguration']>, { __typename: 'ReviewStoreConfiguration' } & GraphQLRecursivePick<ParentType, {"id":true}>, ContextType>;
  answerEditWindowHours?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  answerModerationMode?: Resolver<ResolversTypes['ReviewModerationMode'], ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  customerAnswersEnabled?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  guestQuestionsEnabled?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  guestReviewsEnabled?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  maxAnswersPerQuestion?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  maxReviewMediaCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  questionEditWindowHours?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  questionModerationMode?: Resolver<ResolversTypes['ReviewModerationMode'], ParentType, ContextType>;
  questionsEnabled?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  reviewDuplicatePolicy?: Resolver<ResolversTypes['ReviewDuplicatePolicy'], ParentType, ContextType>;
  reviewEditWindowHours?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  reviewModerationMode?: Resolver<ResolversTypes['ReviewModerationMode'], ParentType, ContextType>;
  reviewRequestDelayDays?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  reviewRequestExpiryDays?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  reviewRequestsEnabled?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  reviewsEnabled?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  revision?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  verifiedPurchaseRequired?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ReviewStoreConfigurationUpdatePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ReviewStoreConfigurationUpdatePayload'] = ResolversParentTypes['ReviewStoreConfigurationUpdatePayload']> = ResolversObject<{
  configuration?: Resolver<Maybe<ResolversTypes['ReviewStoreConfiguration']>, ParentType, ContextType>;
  operationResults?: Resolver<Array<ResolversTypes['ReviewsOperationResult']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ReviewUpdatePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ReviewUpdatePayload'] = ResolversParentTypes['ReviewUpdatePayload']> = ResolversObject<{
  operationResults?: Resolver<Array<ResolversTypes['ReviewsOperationResult']>, ParentType, ContextType>;
  review?: Resolver<Maybe<ResolversTypes['Review']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ReviewsMutationResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ReviewsMutation'] = ResolversParentTypes['ReviewsMutation']> = ResolversObject<{
  contentExternalReferenceCreate?: Resolver<ResolversTypes['ReviewContentExternalReferenceCreatePayload'], ParentType, ContextType, RequireFields<ReviewsMutationContentExternalReferenceCreateArgs, 'input'>>;
  contentExternalReferenceDelete?: Resolver<ResolversTypes['ReviewContentExternalReferenceDeletePayload'], ParentType, ContextType, RequireFields<ReviewsMutationContentExternalReferenceDeleteArgs, 'input'>>;
  contentExternalReferenceUpdate?: Resolver<ResolversTypes['ReviewContentExternalReferenceUpdatePayload'], ParentType, ContextType, RequireFields<ReviewsMutationContentExternalReferenceUpdateArgs, 'expectedUpdatedAt' | 'externalReferenceId'>>;
  contentRedact?: Resolver<ResolversTypes['ReviewContentUpdatePayload'], ParentType, ContextType, RequireFields<ReviewsMutationContentRedactArgs, 'contentId' | 'expectedRevision'>>;
  contentReportUpdate?: Resolver<ResolversTypes['ReviewContentReportUpdatePayload'], ParentType, ContextType, RequireFields<ReviewsMutationContentReportUpdateArgs, 'contentReportId' | 'expectedUpdatedAt'>>;
  contentRevisionRestore?: Resolver<ResolversTypes['ReviewContentUpdatePayload'], ParentType, ContextType, RequireFields<ReviewsMutationContentRevisionRestoreArgs, 'contentId' | 'expectedRevision' | 'revision'>>;
  moderationCaseCreate?: Resolver<ResolversTypes['ReviewModerationCaseCreatePayload'], ParentType, ContextType, RequireFields<ReviewsMutationModerationCaseCreateArgs, 'input'>>;
  moderationCaseUpdate?: Resolver<ResolversTypes['ReviewModerationCaseUpdatePayload'], ParentType, ContextType, RequireFields<ReviewsMutationModerationCaseUpdateArgs, 'expectedUpdatedAt' | 'moderationCaseId'>>;
  productQuestionCreate?: Resolver<ResolversTypes['ProductQuestionCreatePayload'], ParentType, ContextType, RequireFields<ReviewsMutationProductQuestionCreateArgs, 'input'>>;
  productQuestionDelete?: Resolver<ResolversTypes['ProductQuestionDeletePayload'], ParentType, ContextType, RequireFields<ReviewsMutationProductQuestionDeleteArgs, 'input'>>;
  productQuestionSubscriptionUpdate?: Resolver<ResolversTypes['ProductQuestionSubscriptionUpdatePayload'], ParentType, ContextType, RequireFields<ReviewsMutationProductQuestionSubscriptionUpdateArgs, 'expectedUpdatedAt' | 'subscriptionId'>>;
  productQuestionUpdate?: Resolver<ResolversTypes['ProductQuestionUpdatePayload'], ParentType, ContextType, RequireFields<ReviewsMutationProductQuestionUpdateArgs, 'expectedRevision' | 'productQuestionId'>>;
  ratingCriterionCreate?: Resolver<ResolversTypes['ReviewRatingCriterionCreatePayload'], ParentType, ContextType, RequireFields<ReviewsMutationRatingCriterionCreateArgs, 'input'>>;
  ratingCriterionDelete?: Resolver<ResolversTypes['ReviewRatingCriterionDeletePayload'], ParentType, ContextType, RequireFields<ReviewsMutationRatingCriterionDeleteArgs, 'input'>>;
  ratingCriterionUpdate?: Resolver<ResolversTypes['ReviewRatingCriterionUpdatePayload'], ParentType, ContextType, RequireFields<ReviewsMutationRatingCriterionUpdateArgs, 'criterionId' | 'expectedUpdatedAt'>>;
  reviewCreate?: Resolver<ResolversTypes['ReviewCreatePayload'], ParentType, ContextType, RequireFields<ReviewsMutationReviewCreateArgs, 'input'>>;
  reviewDelete?: Resolver<ResolversTypes['ReviewDeletePayload'], ParentType, ContextType, RequireFields<ReviewsMutationReviewDeleteArgs, 'input'>>;
  reviewRequestCreate?: Resolver<ResolversTypes['ReviewRequestCreatePayload'], ParentType, ContextType, RequireFields<ReviewsMutationReviewRequestCreateArgs, 'input'>>;
  reviewRequestUpdate?: Resolver<ResolversTypes['ReviewRequestUpdatePayload'], ParentType, ContextType, RequireFields<ReviewsMutationReviewRequestUpdateArgs, 'expectedUpdatedAt' | 'reviewRequestId'>>;
  reviewUpdate?: Resolver<ResolversTypes['ReviewUpdatePayload'], ParentType, ContextType, RequireFields<ReviewsMutationReviewUpdateArgs, 'expectedRevision' | 'reviewId'>>;
  storeConfigurationUpdate?: Resolver<ResolversTypes['ReviewStoreConfigurationUpdatePayload'], ParentType, ContextType, RequireFields<ReviewsMutationStoreConfigurationUpdateArgs, 'configurationId' | 'expectedRevision'>>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ReviewsOperationResultResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ReviewsOperationResult'] = ResolversParentTypes['ReviewsOperationResult']> = ResolversObject<{
  applied?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  clientMutationId?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  entityId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  errors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  type?: Resolver<ResolversTypes['ReviewsOperationType'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ReviewsQueryResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ReviewsQuery'] = ResolversParentTypes['ReviewsQuery']> = ResolversObject<{
  content?: Resolver<Maybe<ResolversTypes['ReviewContent']>, ParentType, ContextType, RequireFields<ReviewsQueryContentArgs, 'id'>>;
  contentExternalReference?: Resolver<Maybe<ResolversTypes['ReviewContentExternalReference']>, ParentType, ContextType, RequireFields<ReviewsQueryContentExternalReferenceArgs, 'id'>>;
  contentExternalReferences?: Resolver<ResolversTypes['ReviewContentExternalReferenceConnection'], ParentType, ContextType, Partial<ReviewsQueryContentExternalReferencesArgs>>;
  contentReport?: Resolver<Maybe<ResolversTypes['ReviewContentReport']>, ParentType, ContextType, RequireFields<ReviewsQueryContentReportArgs, 'id'>>;
  contentReports?: Resolver<ResolversTypes['ReviewContentReportConnection'], ParentType, ContextType, Partial<ReviewsQueryContentReportsArgs>>;
  contents?: Resolver<ResolversTypes['ReviewContentConnection'], ParentType, ContextType, Partial<ReviewsQueryContentsArgs>>;
  moderationCase?: Resolver<Maybe<ResolversTypes['ReviewModerationCase']>, ParentType, ContextType, RequireFields<ReviewsQueryModerationCaseArgs, 'id'>>;
  moderationCases?: Resolver<ResolversTypes['ReviewModerationCaseConnection'], ParentType, ContextType, Partial<ReviewsQueryModerationCasesArgs>>;
  node?: Resolver<Maybe<ResolversTypes['Node']>, ParentType, ContextType, RequireFields<ReviewsQueryNodeArgs, 'id'>>;
  nodes?: Resolver<Array<Maybe<ResolversTypes['Node']>>, ParentType, ContextType, RequireFields<ReviewsQueryNodesArgs, 'ids'>>;
  productQuestion?: Resolver<Maybe<ResolversTypes['ProductQuestion']>, ParentType, ContextType, RequireFields<ReviewsQueryProductQuestionArgs, 'id'>>;
  productQuestionAnswer?: Resolver<Maybe<ResolversTypes['ProductQuestionAnswer']>, ParentType, ContextType, RequireFields<ReviewsQueryProductQuestionAnswerArgs, 'id'>>;
  productQuestionAnswers?: Resolver<ResolversTypes['ProductQuestionAnswerConnection'], ParentType, ContextType, Partial<ReviewsQueryProductQuestionAnswersArgs>>;
  productQuestions?: Resolver<ResolversTypes['ProductQuestionConnection'], ParentType, ContextType, Partial<ReviewsQueryProductQuestionsArgs>>;
  ratingCriteria?: Resolver<ResolversTypes['ReviewRatingCriterionConnection'], ParentType, ContextType, Partial<ReviewsQueryRatingCriteriaArgs>>;
  ratingCriterion?: Resolver<Maybe<ResolversTypes['ReviewRatingCriterion']>, ParentType, ContextType, RequireFields<ReviewsQueryRatingCriterionArgs, 'id'>>;
  review?: Resolver<Maybe<ResolversTypes['Review']>, ParentType, ContextType, RequireFields<ReviewsQueryReviewArgs, 'id'>>;
  reviewReplies?: Resolver<ResolversTypes['ReviewReplyConnection'], ParentType, ContextType, Partial<ReviewsQueryReviewRepliesArgs>>;
  reviewReply?: Resolver<Maybe<ResolversTypes['ReviewReply']>, ParentType, ContextType, RequireFields<ReviewsQueryReviewReplyArgs, 'id'>>;
  reviewRequest?: Resolver<Maybe<ResolversTypes['ReviewRequest']>, ParentType, ContextType, RequireFields<ReviewsQueryReviewRequestArgs, 'id'>>;
  reviewRequests?: Resolver<ResolversTypes['ReviewRequestConnection'], ParentType, ContextType, Partial<ReviewsQueryReviewRequestsArgs>>;
  reviews?: Resolver<ResolversTypes['ReviewConnection'], ParentType, ContextType, Partial<ReviewsQueryReviewsArgs>>;
  storeConfiguration?: Resolver<Maybe<ResolversTypes['ReviewStoreConfiguration']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type UserErrorResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['UserError'] = ResolversParentTypes['UserError']> = ResolversObject<{
  __resolveType: TypeResolveFn<'GenericUserError', ParentType, ContextType>;
  code?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  field?: Resolver<Maybe<Array<ResolversTypes['String']>>, ParentType, ContextType>;
  message?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
}>;

export type VariantResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['Variant'] = ResolversParentTypes['Variant']> = ResolversObject<{
  __resolveReference?: ReferenceResolver<Maybe<ResolversTypes['Variant']>, ParentType, ContextType>;

  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type WidgetQueryResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['WidgetQuery'] = ResolversParentTypes['WidgetQuery']> = ResolversObject<{
  reviews?: Resolver<ResolversTypes['ProductReviewsWidget'], ParentType, ContextType, RequireFields<WidgetQueryReviewsArgs, 'productId'>>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type Resolvers<ContextType = ServiceContext> = ResolversObject<{
  BigInt?: GraphQLScalarType;
  Category?: CategoryResolvers<ContextType>;
  Customer?: CustomerResolvers<ContextType>;
  DateTime?: GraphQLScalarType;
  Email?: GraphQLScalarType;
  File?: FileResolvers<ContextType>;
  GenericUserError?: GenericUserErrorResolvers<ContextType>;
  JSON?: GraphQLScalarType;
  Mutation?: MutationResolvers<ContextType>;
  Node?: NodeResolvers<ContextType>;
  PageInfo?: PageInfoResolvers<ContextType>;
  Product?: ProductResolvers<ContextType>;
  ProductQuestion?: ProductQuestionResolvers<ContextType>;
  ProductQuestionAnswer?: ProductQuestionAnswerResolvers<ContextType>;
  ProductQuestionAnswerConnection?: ProductQuestionAnswerConnectionResolvers<ContextType>;
  ProductQuestionAnswerEdge?: ProductQuestionAnswerEdgeResolvers<ContextType>;
  ProductQuestionConnection?: ProductQuestionConnectionResolvers<ContextType>;
  ProductQuestionCreatePayload?: ProductQuestionCreatePayloadResolvers<ContextType>;
  ProductQuestionDeletePayload?: ProductQuestionDeletePayloadResolvers<ContextType>;
  ProductQuestionEdge?: ProductQuestionEdgeResolvers<ContextType>;
  ProductQuestionSubscription?: ProductQuestionSubscriptionResolvers<ContextType>;
  ProductQuestionSubscriptionConnection?: ProductQuestionSubscriptionConnectionResolvers<ContextType>;
  ProductQuestionSubscriptionEdge?: ProductQuestionSubscriptionEdgeResolvers<ContextType>;
  ProductQuestionSubscriptionUpdatePayload?: ProductQuestionSubscriptionUpdatePayloadResolvers<ContextType>;
  ProductQuestionSummary?: ProductQuestionSummaryResolvers<ContextType>;
  ProductQuestionUpdatePayload?: ProductQuestionUpdatePayloadResolvers<ContextType>;
  ProductRatingCriterionSummary?: ProductRatingCriterionSummaryResolvers<ContextType>;
  ProductReviewSummary?: ProductReviewSummaryResolvers<ContextType>;
  ProductReviewsWidget?: ProductReviewsWidgetResolvers<ContextType>;
  Query?: QueryResolvers<ContextType>;
  Review?: ReviewResolvers<ContextType>;
  ReviewConnection?: ReviewConnectionResolvers<ContextType>;
  ReviewContent?: ReviewContentResolvers<ContextType>;
  ReviewContentAuthor?: ReviewContentAuthorResolvers<ContextType>;
  ReviewContentConnection?: ReviewContentConnectionResolvers<ContextType>;
  ReviewContentEdge?: ReviewContentEdgeResolvers<ContextType>;
  ReviewContentExternalReference?: ReviewContentExternalReferenceResolvers<ContextType>;
  ReviewContentExternalReferenceConnection?: ReviewContentExternalReferenceConnectionResolvers<ContextType>;
  ReviewContentExternalReferenceCreatePayload?: ReviewContentExternalReferenceCreatePayloadResolvers<ContextType>;
  ReviewContentExternalReferenceDeletePayload?: ReviewContentExternalReferenceDeletePayloadResolvers<ContextType>;
  ReviewContentExternalReferenceEdge?: ReviewContentExternalReferenceEdgeResolvers<ContextType>;
  ReviewContentExternalReferenceUpdatePayload?: ReviewContentExternalReferenceUpdatePayloadResolvers<ContextType>;
  ReviewContentMetrics?: ReviewContentMetricsResolvers<ContextType>;
  ReviewContentPublication?: ReviewContentPublicationResolvers<ContextType>;
  ReviewContentReport?: ReviewContentReportResolvers<ContextType>;
  ReviewContentReportConnection?: ReviewContentReportConnectionResolvers<ContextType>;
  ReviewContentReportEdge?: ReviewContentReportEdgeResolvers<ContextType>;
  ReviewContentReportUpdatePayload?: ReviewContentReportUpdatePayloadResolvers<ContextType>;
  ReviewContentRevision?: ReviewContentRevisionResolvers<ContextType>;
  ReviewContentRevisionConnection?: ReviewContentRevisionConnectionResolvers<ContextType>;
  ReviewContentRevisionEdge?: ReviewContentRevisionEdgeResolvers<ContextType>;
  ReviewContentTranslation?: ReviewContentTranslationResolvers<ContextType>;
  ReviewContentUpdatePayload?: ReviewContentUpdatePayloadResolvers<ContextType>;
  ReviewContentVote?: ReviewContentVoteResolvers<ContextType>;
  ReviewContentVoteConnection?: ReviewContentVoteConnectionResolvers<ContextType>;
  ReviewContentVoteEdge?: ReviewContentVoteEdgeResolvers<ContextType>;
  ReviewCreatePayload?: ReviewCreatePayloadResolvers<ContextType>;
  ReviewDeletePayload?: ReviewDeletePayloadResolvers<ContextType>;
  ReviewEdge?: ReviewEdgeResolvers<ContextType>;
  ReviewMedia?: ReviewMediaResolvers<ContextType>;
  ReviewModerationCase?: ReviewModerationCaseResolvers<ContextType>;
  ReviewModerationCaseConnection?: ReviewModerationCaseConnectionResolvers<ContextType>;
  ReviewModerationCaseCreatePayload?: ReviewModerationCaseCreatePayloadResolvers<ContextType>;
  ReviewModerationCaseEdge?: ReviewModerationCaseEdgeResolvers<ContextType>;
  ReviewModerationCaseUpdatePayload?: ReviewModerationCaseUpdatePayloadResolvers<ContextType>;
  ReviewModerationEvent?: ReviewModerationEventResolvers<ContextType>;
  ReviewModerationEventConnection?: ReviewModerationEventConnectionResolvers<ContextType>;
  ReviewModerationEventEdge?: ReviewModerationEventEdgeResolvers<ContextType>;
  ReviewModerationSignal?: ReviewModerationSignalResolvers<ContextType>;
  ReviewModerationSignalConnection?: ReviewModerationSignalConnectionResolvers<ContextType>;
  ReviewModerationSignalEdge?: ReviewModerationSignalEdgeResolvers<ContextType>;
  ReviewRating?: ReviewRatingResolvers<ContextType>;
  ReviewRatingBreakdown?: ReviewRatingBreakdownResolvers<ContextType>;
  ReviewRatingCriterion?: ReviewRatingCriterionResolvers<ContextType>;
  ReviewRatingCriterionAssignment?: ReviewRatingCriterionAssignmentResolvers<ContextType>;
  ReviewRatingCriterionConnection?: ReviewRatingCriterionConnectionResolvers<ContextType>;
  ReviewRatingCriterionCreatePayload?: ReviewRatingCriterionCreatePayloadResolvers<ContextType>;
  ReviewRatingCriterionDeletePayload?: ReviewRatingCriterionDeletePayloadResolvers<ContextType>;
  ReviewRatingCriterionEdge?: ReviewRatingCriterionEdgeResolvers<ContextType>;
  ReviewRatingCriterionTarget?: ReviewRatingCriterionTargetResolvers<ContextType>;
  ReviewRatingCriterionTranslation?: ReviewRatingCriterionTranslationResolvers<ContextType>;
  ReviewRatingCriterionUpdatePayload?: ReviewRatingCriterionUpdatePayloadResolvers<ContextType>;
  ReviewReply?: ReviewReplyResolvers<ContextType>;
  ReviewReplyConnection?: ReviewReplyConnectionResolvers<ContextType>;
  ReviewReplyEdge?: ReviewReplyEdgeResolvers<ContextType>;
  ReviewRequest?: ReviewRequestResolvers<ContextType>;
  ReviewRequestConnection?: ReviewRequestConnectionResolvers<ContextType>;
  ReviewRequestCreatePayload?: ReviewRequestCreatePayloadResolvers<ContextType>;
  ReviewRequestEdge?: ReviewRequestEdgeResolvers<ContextType>;
  ReviewRequestEvent?: ReviewRequestEventResolvers<ContextType>;
  ReviewRequestEventConnection?: ReviewRequestEventConnectionResolvers<ContextType>;
  ReviewRequestEventEdge?: ReviewRequestEventEdgeResolvers<ContextType>;
  ReviewRequestUpdatePayload?: ReviewRequestUpdatePayloadResolvers<ContextType>;
  ReviewStoreConfiguration?: ReviewStoreConfigurationResolvers<ContextType>;
  ReviewStoreConfigurationUpdatePayload?: ReviewStoreConfigurationUpdatePayloadResolvers<ContextType>;
  ReviewUpdatePayload?: ReviewUpdatePayloadResolvers<ContextType>;
  ReviewsMutation?: ReviewsMutationResolvers<ContextType>;
  ReviewsOperationResult?: ReviewsOperationResultResolvers<ContextType>;
  ReviewsQuery?: ReviewsQueryResolvers<ContextType>;
  UserError?: UserErrorResolvers<ContextType>;
  Variant?: VariantResolvers<ContextType>;
  WidgetQuery?: WidgetQueryResolvers<ContextType>;
}>;

