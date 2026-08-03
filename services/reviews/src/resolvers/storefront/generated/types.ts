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
  /** A CSS color represented as a hexadecimal string. */
  Color: { input: string; output: string; }
  /** An opaque cursor used for pagination. */
  Cursor: { input: string; output: string; }
  /** An ISO 8601-encoded date and time string. */
  DateTime: { input: string; output: string; }
  /** An arbitrary-precision signed decimal number. */
  Decimal: { input: string; output: string; }
  /** An email address. */
  Email: { input: string; output: string; }
  /** A string containing HTML code. */
  HTML: { input: string; output: string; }
  /** An ISO 8601-encoded date and time string. */
  ISO8601DateTime: { input: string; output: string; }
  /** A JSON-serializable value. */
  JSON: { input: Record<string, unknown>; output: Record<string, unknown>; }
  /** An RFC 3986 and RFC 3987 compliant URI string. */
  URL: { input: string; output: string; }
  /** An unsigned 64-bit integer serialized as a decimal string. */
  UnsignedInt64: { input: string; output: string; }
  _FieldSet: { input: any; output: any; }
};

export type Category = {
  __typename?: 'Category';
  id: Scalars['ID']['output'];
};

/** Shared fields exposed by every Relay-style connection. */
export type Connection = {
  pageInfo: PageInfo;
  totalCount: Scalars['Int']['output'];
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

export type Customer = {
  __typename?: 'Customer';
  id: Scalars['ID']['output'];
  productQuestions: ProductQuestionConnection;
  reviewRequests: ReviewRequestConnection;
  reviews: ReviewConnection;
};


export type CustomerProductQuestionsArgs = {
  after?: InputMaybe<Scalars['Cursor']['input']>;
  before?: InputMaybe<Scalars['Cursor']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  sort?: InputMaybe<ProductQuestionSort>;
};


export type CustomerReviewRequestsArgs = {
  after?: InputMaybe<Scalars['Cursor']['input']>;
  before?: InputMaybe<Scalars['Cursor']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


export type CustomerReviewsArgs = {
  after?: InputMaybe<Scalars['Cursor']['input']>;
  before?: InputMaybe<Scalars['Cursor']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  sort?: InputMaybe<ReviewSort>;
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

export type Media = {
  id: Scalars['ID']['output'];
};

/** A precise monetary value with its associated currency. */
export type Money = {
  __typename?: 'Money';
  amount: Scalars['Decimal']['output'];
  currencyCode: CurrencyCode;
};

export type Mutation = {
  __typename?: 'Mutation';
  /**
   * Adds a customer answer to an existing product question.
   *
   * Customer answers must be enabled by reviewStoreConfiguration. Official and
   * accepted-answer state cannot be assigned through the Storefront API.
   */
  productQuestionAnswerCreate: ProductQuestionAnswerCreatePayload;
  /** Deletes a question answer owned by the authenticated customer. */
  productQuestionAnswerDelete: ProductQuestionAnswerDeletePayload;
  /** Updates a question answer owned by the authenticated customer. */
  productQuestionAnswerUpdate: ProductQuestionAnswerUpdatePayload;
  /**
   * Submits a product question in the active storefront context.
   *
   * The authenticated customer is resolved from trusted request context. Guest
   * submission is available only when enabled by reviewStoreConfiguration.
   */
  productQuestionCreate: ProductQuestionCreatePayload;
  /** Deletes a product question owned by the authenticated customer. */
  productQuestionDelete: ProductQuestionDeletePayload;
  /** Creates, updates, pauses, or removes the viewer's question subscription. */
  productQuestionSubscriptionSet: ProductQuestionSubscriptionSetPayload;
  /** Updates a product question owned by the authenticated customer. */
  productQuestionUpdate: ProductQuestionUpdatePayload;
  /**
   * Reports storefront review content for moderation.
   *
   * A viewer may have only one active report for the same content. Customer or
   * anonymous visitor identity is resolved from trusted storefront request
   * context and cannot be supplied as a GraphQL argument.
   */
  reviewContentReportCreate: ReviewContentReportCreatePayload;
  /** Removes the current viewer's LIKE or DISLIKE vote. */
  reviewContentVoteRemove: ReviewContentVoteRemovePayload;
  /**
   * Sets the current viewer's LIKE or DISLIKE vote on storefront review content.
   *
   * Repeating the same vote is idempotent. Setting the opposite type replaces the
   * previous vote. Customer or anonymous visitor identity is resolved from
   * trusted storefront request context.
   */
  reviewContentVoteSet: ReviewContentVoteSetPayload;
  /**
   * Submits a product review in the active storefront context.
   *
   * The authenticated customer is resolved from trusted request context. Guest
   * submission is available only when enabled by reviewStoreConfiguration.
   * Verification and moderation state are always determined by the service.
   */
  reviewCreate: ReviewCreatePayload;
  /** Deletes a review owned by the authenticated customer within its edit window. */
  reviewDelete: ReviewDeletePayload;
  /** Updates a review owned by the authenticated customer within its edit window. */
  reviewUpdate: ReviewUpdatePayload;
};


export type MutationProductQuestionAnswerCreateArgs = {
  input: ProductQuestionAnswerCreateInput;
};


export type MutationProductQuestionAnswerDeleteArgs = {
  input: ReviewContentDeleteInput;
};


export type MutationProductQuestionAnswerUpdateArgs = {
  input: ProductQuestionAnswerUpdateInput;
};


export type MutationProductQuestionCreateArgs = {
  input: ProductQuestionCreateInput;
};


export type MutationProductQuestionDeleteArgs = {
  input: ReviewContentDeleteInput;
};


export type MutationProductQuestionSubscriptionSetArgs = {
  input: ProductQuestionSubscriptionSetInput;
};


export type MutationProductQuestionUpdateArgs = {
  input: ProductQuestionUpdateInput;
};


export type MutationReviewContentReportCreateArgs = {
  input: ReviewContentReportCreateInput;
};


export type MutationReviewContentVoteRemoveArgs = {
  input: ReviewContentVoteRemoveInput;
};


export type MutationReviewContentVoteSetArgs = {
  input: ReviewContentVoteSetInput;
};


export type MutationReviewCreateArgs = {
  input: ReviewCreateInput;
};


export type MutationReviewDeleteArgs = {
  input: ReviewContentDeleteInput;
};


export type MutationReviewUpdateArgs = {
  input: ReviewUpdateInput;
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

export type Product = {
  __typename?: 'Product';
  id: Scalars['ID']['output'];
  /** Published question and answer aggregates for this product. */
  questionSummary: ProductQuestionSummary;
  /** Published questions for this product. */
  questions: ProductQuestionConnection;
  /** Rating criteria applicable to this product in display order. */
  reviewRatingCriteria: ReviewRatingCriterionConnection;
  /** Published review aggregates for this product. */
  reviewSummary: ProductReviewSummary;
  /** Published reviews for this product. */
  reviews: ReviewConnection;
};


export type ProductQuestionsArgs = {
  after?: InputMaybe<Scalars['Cursor']['input']>;
  answered?: InputMaybe<Scalars['Boolean']['input']>;
  before?: InputMaybe<Scalars['Cursor']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  sort?: InputMaybe<ProductQuestionSort>;
};


export type ProductReviewRatingCriteriaArgs = {
  after?: InputMaybe<Scalars['Cursor']['input']>;
  before?: InputMaybe<Scalars['Cursor']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


export type ProductReviewsArgs = {
  after?: InputMaybe<Scalars['Cursor']['input']>;
  before?: InputMaybe<Scalars['Cursor']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  rating?: InputMaybe<Scalars['Int']['input']>;
  sort?: InputMaybe<ReviewSort>;
  verifiedOnly?: InputMaybe<Scalars['Boolean']['input']>;
  withMediaOnly?: InputMaybe<Scalars['Boolean']['input']>;
};

export type ProductQuestion = Node & ReviewContent & {
  __typename?: 'ProductQuestion';
  answers: ProductQuestionAnswerConnection;
  author: ReviewContentAuthor;
  body: Scalars['String']['output'];
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  kind: ReviewContentKind;
  locale: LocaleCode;
  metrics: ReviewContentMetrics;
  product: Product;
  publishedAt: Maybe<Scalars['DateTime']['output']>;
  revision: Scalars['Int']['output'];
  status: ReviewContentStatus;
  title: Maybe<Scalars['String']['output']>;
  translations: Array<ReviewContentTranslation>;
  updatedAt: Scalars['DateTime']['output'];
  variant: Maybe<ProductVariant>;
  viewerCapabilities: ReviewContentViewerCapabilities;
  viewerEngagement: ReviewContentViewerEngagement;
  viewerSubscription: Maybe<ProductQuestionSubscription>;
};


export type ProductQuestionAnswersArgs = {
  after?: InputMaybe<Scalars['Cursor']['input']>;
  before?: InputMaybe<Scalars['Cursor']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  sort?: InputMaybe<ProductQuestionAnswerSort>;
};

export type ProductQuestionAnswer = Node & ReviewContent & {
  __typename?: 'ProductQuestionAnswer';
  author: ReviewContentAuthor;
  body: Scalars['String']['output'];
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  isAccepted: Scalars['Boolean']['output'];
  isOfficial: Scalars['Boolean']['output'];
  kind: ReviewContentKind;
  locale: LocaleCode;
  metrics: ReviewContentMetrics;
  publishedAt: Maybe<Scalars['DateTime']['output']>;
  question: ProductQuestion;
  revision: Scalars['Int']['output'];
  sortIndex: Scalars['Int']['output'];
  status: ReviewContentStatus;
  title: Maybe<Scalars['String']['output']>;
  translations: Array<ReviewContentTranslation>;
  updatedAt: Scalars['DateTime']['output'];
  viewerCapabilities: ReviewContentViewerCapabilities;
  viewerEngagement: ReviewContentViewerEngagement;
};

export type ProductQuestionAnswerConnection = Connection & {
  __typename?: 'ProductQuestionAnswerConnection';
  edges: Array<ProductQuestionAnswerEdge>;
  nodes: Array<ProductQuestionAnswer>;
  pageInfo: PageInfo;
  totalCount: Scalars['Int']['output'];
};

/** Input for an authenticated customer answer to a product question. */
export type ProductQuestionAnswerCreateInput = {
  /**
   * Shared text, locale, and idempotency metadata. Guest author data is rejected
   * because storefront question answers require an authenticated customer.
   */
  content: ReviewContentSubmissionInput;
  /** Revision returned by ProductQuestion.revision. */
  expectedRevision: Scalars['Int']['input'];
  productQuestionId: Scalars['ID']['input'];
};

/** Result of adding a customer answer to a product question. */
export type ProductQuestionAnswerCreatePayload = {
  __typename?: 'ProductQuestionAnswerCreatePayload';
  answer: Maybe<ProductQuestionAnswer>;
  productQuestion: Maybe<ProductQuestion>;
  userErrors: Array<ReviewUserError>;
};

export type ProductQuestionAnswerDeletePayload = {
  __typename?: 'ProductQuestionAnswerDeletePayload';
  deletedAnswerId: Maybe<Scalars['ID']['output']>;
  userErrors: Array<ReviewUserError>;
};

export type ProductQuestionAnswerEdge = {
  __typename?: 'ProductQuestionAnswerEdge';
  cursor: Scalars['Cursor']['output'];
  node: ProductQuestionAnswer;
};

/** Customer-facing orderings supported by question-answer connections. */
export enum ProductQuestionAnswerSort {
  MostHelpful = 'MOST_HELPFUL',
  Newest = 'NEWEST',
  Oldest = 'OLDEST'
}

/** Customer-editable fields of an existing question answer. */
export type ProductQuestionAnswerUpdateInput = {
  answerId: Scalars['ID']['input'];
  content: ReviewContentEditInput;
  expectedRevision: Scalars['Int']['input'];
};

export type ProductQuestionAnswerUpdatePayload = {
  __typename?: 'ProductQuestionAnswerUpdatePayload';
  answer: Maybe<ProductQuestionAnswer>;
  userErrors: Array<ReviewUserError>;
};

export type ProductQuestionConnection = Connection & {
  __typename?: 'ProductQuestionConnection';
  edges: Array<ProductQuestionEdge>;
  nodes: Array<ProductQuestion>;
  pageInfo: PageInfo;
  totalCount: Scalars['Int']['output'];
};

/** Input for a customer or guest product-question submission. */
export type ProductQuestionCreateInput = {
  /** Shared text, locale, guest identity, and idempotency metadata. */
  content: ReviewContentSubmissionInput;
  productId: Scalars['ID']['input'];
  variantId?: InputMaybe<Scalars['ID']['input']>;
};

/** Result of submitting a product question. */
export type ProductQuestionCreatePayload = {
  __typename?: 'ProductQuestionCreatePayload';
  productQuestion: Maybe<ProductQuestion>;
  userErrors: Array<ReviewUserError>;
};

export type ProductQuestionDeletePayload = {
  __typename?: 'ProductQuestionDeletePayload';
  deletedProductQuestionId: Maybe<Scalars['ID']['output']>;
  userErrors: Array<ReviewUserError>;
};

export type ProductQuestionEdge = {
  __typename?: 'ProductQuestionEdge';
  cursor: Scalars['Cursor']['output'];
  node: ProductQuestion;
};

/** Customer-facing orderings supported by product-question connections. */
export enum ProductQuestionSort {
  MostAnswered = 'MOST_ANSWERED',
  MostHelpful = 'MOST_HELPFUL',
  Newest = 'NEWEST',
  Oldest = 'OLDEST'
}

export type ProductQuestionSubscription = Node & {
  __typename?: 'ProductQuestionSubscription';
  channel: ReviewNotificationChannel;
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  lastNotifiedAt: Maybe<Scalars['DateTime']['output']>;
  locale: LocaleCode;
  question: ProductQuestion;
  status: ProductQuestionSubscriptionStatus;
  subscriberCustomer: Maybe<Customer>;
  updatedAt: Scalars['DateTime']['output'];
};

/**
 * Desired notification state for the current customer's product-question
 * subscription. The operation creates or updates the viewer's subscription.
 */
export type ProductQuestionSubscriptionSetInput = {
  channel?: InputMaybe<ReviewNotificationChannel>;
  locale?: InputMaybe<LocaleCode>;
  productQuestionId: Scalars['ID']['input'];
  subscribed: Scalars['Boolean']['input'];
};

export type ProductQuestionSubscriptionSetPayload = {
  __typename?: 'ProductQuestionSubscriptionSetPayload';
  subscription: Maybe<ProductQuestionSubscription>;
  userErrors: Array<ReviewUserError>;
};

export enum ProductQuestionSubscriptionStatus {
  Active = 'ACTIVE',
  Paused = 'PAUSED',
  Unsubscribed = 'UNSUBSCRIBED'
}

/** Published question and answer aggregates for one product. */
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

/** Customer-editable fields of an existing product question. */
export type ProductQuestionUpdateInput = {
  content: ReviewContentEditInput;
  expectedRevision: Scalars['Int']['input'];
  productQuestionId: Scalars['ID']['input'];
};

export type ProductQuestionUpdatePayload = {
  __typename?: 'ProductQuestionUpdatePayload';
  productQuestion: Maybe<ProductQuestion>;
  userErrors: Array<ReviewUserError>;
};

export type ProductRatingCriterionSummary = {
  __typename?: 'ProductRatingCriterionSummary';
  averageRating: Scalars['Float']['output'];
  criterion: ReviewRatingCriterion;
  ratingBreakdown: ReviewRatingBreakdown;
  reviewCount: Scalars['Int']['output'];
  updatedAt: Scalars['DateTime']['output'];
};

/** Published review aggregates for one product. */
export type ProductReviewSummary = {
  __typename?: 'ProductReviewSummary';
  averageRating: Scalars['Float']['output'];
  criteria: Array<ProductRatingCriterionSummary>;
  lastReviewedAt: Maybe<Scalars['DateTime']['output']>;
  mediaReviewCount: Scalars['Int']['output'];
  product: Product;
  ratingBreakdown: ReviewRatingBreakdown;
  reviewCount: Scalars['Int']['output'];
  updatedAt: Scalars['DateTime']['output'];
  verifiedReviewCount: Scalars['Int']['output'];
};

export type ProductVariant = {
  __typename?: 'ProductVariant';
  id: Scalars['ID']['output'];
  questions: ProductQuestionConnection;
  reviews: ReviewConnection;
};


export type ProductVariantQuestionsArgs = {
  after?: InputMaybe<Scalars['Cursor']['input']>;
  before?: InputMaybe<Scalars['Cursor']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  sort?: InputMaybe<ProductQuestionSort>;
};


export type ProductVariantReviewsArgs = {
  after?: InputMaybe<Scalars['Cursor']['input']>;
  before?: InputMaybe<Scalars['Cursor']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  sort?: InputMaybe<ReviewSort>;
};

export type Query = {
  __typename?: 'Query';
  /** Returns a product question visible in the current storefront context. */
  productQuestion: Maybe<ProductQuestion>;
  /** Returns a published product-question answer by its global ID. */
  productQuestionAnswer: Maybe<ProductQuestionAnswer>;
  /** Returns a review visible in the current storefront context. */
  review: Maybe<Review>;
  /** Returns a published review reply by its global ID. */
  reviewReply: Maybe<ReviewReply>;
  /** Returns a review request owned by the authenticated customer. */
  reviewRequest: Maybe<ReviewRequest>;
  /** Storefront capabilities and limits for reviews and product questions. */
  reviewStoreConfiguration: Maybe<ReviewStoreConfiguration>;
};


export type QueryProductQuestionArgs = {
  id: Scalars['ID']['input'];
};


export type QueryProductQuestionAnswerArgs = {
  id: Scalars['ID']['input'];
};


export type QueryReviewArgs = {
  id: Scalars['ID']['input'];
};


export type QueryReviewReplyArgs = {
  id: Scalars['ID']['input'];
};


export type QueryReviewRequestArgs = {
  id: Scalars['ID']['input'];
};

export type Review = Node & ReviewContent & {
  __typename?: 'Review';
  author: ReviewContentAuthor;
  body: Scalars['String']['output'];
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  incentiveDisclosure: Maybe<Scalars['String']['output']>;
  isIncentivized: Scalars['Boolean']['output'];
  isVerifiedPurchase: Scalars['Boolean']['output'];
  kind: ReviewContentKind;
  locale: LocaleCode;
  media: Array<ReviewMedia>;
  metrics: ReviewContentMetrics;
  product: Product;
  publishedAt: Maybe<Scalars['DateTime']['output']>;
  rating: Scalars['Int']['output'];
  ratings: Array<ReviewRating>;
  replies: ReviewReplyConnection;
  revision: Scalars['Int']['output'];
  status: ReviewContentStatus;
  title: Maybe<Scalars['String']['output']>;
  translations: Array<ReviewContentTranslation>;
  updatedAt: Scalars['DateTime']['output'];
  variant: Maybe<ProductVariant>;
  verificationStatus: ReviewVerificationStatus;
  viewerCapabilities: ReviewContentViewerCapabilities;
  viewerEngagement: ReviewContentViewerEngagement;
};


export type ReviewRepliesArgs = {
  after?: InputMaybe<Scalars['Cursor']['input']>;
  before?: InputMaybe<Scalars['Cursor']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};

/** A Relay connection to product reviews. */
export type ReviewConnection = Connection & {
  __typename?: 'ReviewConnection';
  edges: Array<ReviewEdge>;
  nodes: Array<Review>;
  pageInfo: PageInfo;
  totalCount: Scalars['Int']['output'];
};

/** Shared storefront contract for reviews, replies, questions, and answers. */
export type ReviewContent = {
  author: ReviewContentAuthor;
  body: Scalars['String']['output'];
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  kind: ReviewContentKind;
  locale: LocaleCode;
  metrics: ReviewContentMetrics;
  publishedAt: Maybe<Scalars['DateTime']['output']>;
  revision: Scalars['Int']['output'];
  status: ReviewContentStatus;
  title: Maybe<Scalars['String']['output']>;
  translations: Array<ReviewContentTranslation>;
  updatedAt: Scalars['DateTime']['output'];
  viewerCapabilities: ReviewContentViewerCapabilities;
  viewerEngagement: ReviewContentViewerEngagement;
};

/** Privacy-safe author snapshot rendered with storefront content. */
export type ReviewContentAuthor = {
  __typename?: 'ReviewContentAuthor';
  customer: Maybe<Customer>;
  displayName: Scalars['String']['output'];
  type: ReviewContentAuthorType;
};

/** The identity class used to present a content author. */
export enum ReviewContentAuthorType {
  Customer = 'CUSTOMER',
  External = 'EXTERNAL',
  Guest = 'GUEST',
  Seller = 'SELLER',
  Staff = 'STAFF',
  System = 'SYSTEM'
}

export type ReviewContentConnection = Connection & {
  __typename?: 'ReviewContentConnection';
  edges: Array<ReviewContentEdge>;
  nodes: Array<ReviewContent>;
  pageInfo: PageInfo;
  totalCount: Scalars['Int']['output'];
};

/** Optimistic input used to delete content owned by the current customer. */
export type ReviewContentDeleteInput = {
  expectedRevision: Scalars['Int']['input'];
  id: Scalars['ID']['input'];
};

export type ReviewContentEdge = {
  __typename?: 'ReviewContentEdge';
  cursor: Scalars['Cursor']['output'];
  node: ReviewContent;
};

/** Customer-editable text fields shared by reviews, questions, and answers. */
export type ReviewContentEditInput = {
  body?: InputMaybe<Scalars['String']['input']>;
  locale?: InputMaybe<LocaleCode>;
  title?: InputMaybe<Scalars['String']['input']>;
};

export type ReviewContentExternalReference = Node & {
  __typename?: 'ReviewContentExternalReference';
  content: ReviewContent;
  createdAt: Scalars['DateTime']['output'];
  direction: ReviewExternalSyncDirection;
  externalId: Scalars['String']['output'];
  externalSystem: Scalars['String']['output'];
  externalType: Scalars['String']['output'];
  externalUrl: Maybe<Scalars['URL']['output']>;
  id: Scalars['ID']['output'];
  lastSyncedAt: Maybe<Scalars['DateTime']['output']>;
  metadata: Scalars['JSON']['output'];
  syncStatus: ReviewExternalSyncStatus;
  updatedAt: Scalars['DateTime']['output'];
};

export type ReviewContentExternalReferenceConnection = Connection & {
  __typename?: 'ReviewContentExternalReferenceConnection';
  edges: Array<ReviewContentExternalReferenceEdge>;
  nodes: Array<ReviewContentExternalReference>;
  pageInfo: PageInfo;
  totalCount: Scalars['Int']['output'];
};

export type ReviewContentExternalReferenceEdge = {
  __typename?: 'ReviewContentExternalReferenceEdge';
  cursor: Scalars['Cursor']['output'];
  node: ReviewContentExternalReference;
};

/** The concrete Reviews aggregate represented by a content node. */
export enum ReviewContentKind {
  ProductQuestion = 'PRODUCT_QUESTION',
  QuestionAnswer = 'QUESTION_ANSWER',
  Review = 'REVIEW',
  ReviewReply = 'REVIEW_REPLY'
}

/** Counters maintained for fast storefront rendering. */
export type ReviewContentMetrics = {
  __typename?: 'ReviewContentMetrics';
  acceptedChildCount: Scalars['Int']['output'];
  childCount: Scalars['Int']['output'];
  dislikeCount: Scalars['Int']['output'];
  lastChildAt: Maybe<Scalars['DateTime']['output']>;
  likeCount: Scalars['Int']['output'];
  mediaCount: Scalars['Int']['output'];
  officialChildCount: Scalars['Int']['output'];
  updatedAt: Scalars['DateTime']['output'];
};

export type ReviewContentPublication = Node & {
  __typename?: 'ReviewContentPublication';
  channel: Scalars['String']['output'];
  content: ReviewContent;
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  locale: Maybe<LocaleCode>;
  publishedAt: Maybe<Scalars['DateTime']['output']>;
  scheduledAt: Maybe<Scalars['DateTime']['output']>;
  status: ReviewPublicationStatus;
  unpublishedAt: Maybe<Scalars['DateTime']['output']>;
  updatedAt: Scalars['DateTime']['output'];
};

/** A report submitted against storefront content. */
export type ReviewContentReport = Node & {
  __typename?: 'ReviewContentReport';
  content: ReviewContent;
  createdAt: Scalars['DateTime']['output'];
  details: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  reason: ReviewContentReportReason;
  reporterCustomer: Maybe<Customer>;
  resolvedAt: Maybe<Scalars['DateTime']['output']>;
  status: ReviewContentReportStatus;
  updatedAt: Scalars['DateTime']['output'];
};

export type ReviewContentReportConnection = Connection & {
  __typename?: 'ReviewContentReportConnection';
  edges: Array<ReviewContentReportEdge>;
  nodes: Array<ReviewContentReport>;
  pageInfo: PageInfo;
  totalCount: Scalars['Int']['output'];
};

/** Input for reporting storefront review content to moderation. */
export type ReviewContentReportCreateInput = {
  /** Review, reply, product question, or question answer being reported. */
  contentId: Scalars['ID']['input'];
  /**
   * Additional customer-provided context, limited to 2,000 characters. Details
   * are required when reason is OTHER.
   */
  details?: InputMaybe<Scalars['String']['input']>;
  reason: ReviewContentReportReason;
};

/** Result of submitting a storefront content report. */
export type ReviewContentReportCreatePayload = {
  __typename?: 'ReviewContentReportCreatePayload';
  /** Reported content with refreshed viewer engagement. */
  content: Maybe<ReviewContent>;
  /**
   * The viewer's active report. An existing active report is returned when the
   * same logical submission is safely retried.
   */
  report: Maybe<ReviewContentReport>;
  userErrors: Array<ReviewUserError>;
};

export type ReviewContentReportEdge = {
  __typename?: 'ReviewContentReportEdge';
  cursor: Scalars['Cursor']['output'];
  node: ReviewContentReport;
};

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

export enum ReviewContentReportStatus {
  Actioned = 'ACTIONED',
  Dismissed = 'DISMISSED',
  Open = 'OPEN',
  UnderReview = 'UNDER_REVIEW'
}

/** A revision of content owned by the current customer. */
export type ReviewContentRevision = Node & {
  __typename?: 'ReviewContentRevision';
  changeReason: Maybe<Scalars['String']['output']>;
  content: ReviewContent;
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  revision: Scalars['Int']['output'];
};

export type ReviewContentRevisionConnection = Connection & {
  __typename?: 'ReviewContentRevisionConnection';
  edges: Array<ReviewContentRevisionEdge>;
  nodes: Array<ReviewContentRevision>;
  pageInfo: PageInfo;
  totalCount: Scalars['Int']['output'];
};

export type ReviewContentRevisionEdge = {
  __typename?: 'ReviewContentRevisionEdge';
  cursor: Scalars['Cursor']['output'];
  node: ReviewContentRevision;
};

/** The public lifecycle state of customer-authored content. */
export enum ReviewContentStatus {
  Pending = 'PENDING',
  Published = 'PUBLISHED',
  Rejected = 'REJECTED'
}

/** Shared text and request metadata for customer-authored content. */
export type ReviewContentSubmissionInput = {
  /**
   * Guest author details. Required for a guest request and optional for an
   * authenticated customer request.
   */
  author?: InputMaybe<ReviewSubmissionAuthorInput>;
  /** Customer-authored body text, limited to 5,000 characters. */
  body: Scalars['String']['input'];
  /**
   * Client-generated opaque key used to safely replay the submission.
   * The key must be unique within the active store.
   */
  idempotencyKey: Scalars['String']['input'];
  /**
   * Submission locale. When omitted, the locale from trusted storefront context
   * is used.
   */
  locale?: InputMaybe<LocaleCode>;
};

export type ReviewContentTranslation = Node & {
  __typename?: 'ReviewContentTranslation';
  body: Scalars['String']['output'];
  content: ReviewContent;
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  locale: LocaleCode;
  revision: Scalars['Int']['output'];
  source: ReviewTranslationSource;
  status: ReviewContentStatus;
  title: Maybe<Scalars['String']['output']>;
  updatedAt: Scalars['DateTime']['output'];
};

/**
 * Actions the current storefront viewer may perform on this content.
 *
 * Ownership, moderation state, and the configured edit window are already
 * applied, so storefront clients do not need to reproduce authorization rules.
 */
export type ReviewContentViewerCapabilities = {
  __typename?: 'ReviewContentViewerCapabilities';
  canDelete: Scalars['Boolean']['output'];
  canUpdate: Scalars['Boolean']['output'];
  editableUntil: Maybe<Scalars['DateTime']['output']>;
};

/** Request-scoped engagement state for the current storefront visitor. */
export type ReviewContentViewerEngagement = {
  __typename?: 'ReviewContentViewerEngagement';
  hasReported: Scalars['Boolean']['output'];
  vote: Maybe<ReviewContentVoteType>;
};

export type ReviewContentVote = Node & {
  __typename?: 'ReviewContentVote';
  content: ReviewContent;
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  type: ReviewContentVoteType;
  updatedAt: Scalars['DateTime']['output'];
  voterCustomer: Maybe<Customer>;
};

export type ReviewContentVoteConnection = Connection & {
  __typename?: 'ReviewContentVoteConnection';
  edges: Array<ReviewContentVoteEdge>;
  nodes: Array<ReviewContentVote>;
  pageInfo: PageInfo;
  totalCount: Scalars['Int']['output'];
};

export type ReviewContentVoteEdge = {
  __typename?: 'ReviewContentVoteEdge';
  cursor: Scalars['Cursor']['output'];
  node: ReviewContentVote;
};

/** Input for removing the current viewer's reaction from review content. */
export type ReviewContentVoteRemoveInput = {
  contentId: Scalars['ID']['input'];
};

/** Result of removing the current viewer's reaction. */
export type ReviewContentVoteRemovePayload = {
  __typename?: 'ReviewContentVoteRemovePayload';
  content: Maybe<ReviewContent>;
  removedVoteId: Maybe<Scalars['ID']['output']>;
  userErrors: Array<ReviewUserError>;
};

/** Input for setting the current viewer's reaction to review content. */
export type ReviewContentVoteSetInput = {
  /** Review, reply, product question, or question answer to vote on. */
  contentId: Scalars['ID']['input'];
  type: ReviewContentVoteType;
};

/** Result of setting or replacing the current viewer's vote. */
export type ReviewContentVoteSetPayload = {
  __typename?: 'ReviewContentVoteSetPayload';
  /** Updated content with refreshed metrics and viewer engagement. */
  content: Maybe<ReviewContent>;
  userErrors: Array<ReviewUserError>;
  /** The current viewer's resulting vote. */
  vote: Maybe<ReviewContentVote>;
};

export enum ReviewContentVoteType {
  Dislike = 'DISLIKE',
  Like = 'LIKE'
}

/** Input for a customer or guest product-review submission. */
export type ReviewCreateInput = {
  /** Shared text, locale, guest identity, and idempotency metadata. */
  content: ReviewContentSubmissionInput;
  /** Review media in storefront display order. */
  media?: InputMaybe<Array<ReviewMediaCreateInput>>;
  /**
   * Order associated with the review. Ownership and eligibility are validated by
   * the service and cannot be used to self-assign verified-purchase status.
   */
  orderId?: InputMaybe<Scalars['ID']['input']>;
  /** Order line associated with the reviewed product or variant. */
  orderLineId?: InputMaybe<Scalars['ID']['input']>;
  productId: Scalars['ID']['input'];
  /** Overall rating from 1 through 5. */
  rating: Scalars['Int']['input'];
  /** Detailed values for the product's active rating criteria. */
  ratings?: InputMaybe<Array<ReviewRatingValueInput>>;
  /** Optional review title, limited to 150 characters. */
  title?: InputMaybe<Scalars['String']['input']>;
  variantId?: InputMaybe<Scalars['ID']['input']>;
};

/** Result of submitting a product review. */
export type ReviewCreatePayload = {
  __typename?: 'ReviewCreatePayload';
  review: Maybe<Review>;
  userErrors: Array<ReviewUserError>;
};

export type ReviewDeletePayload = {
  __typename?: 'ReviewDeletePayload';
  deletedReviewId: Maybe<Scalars['ID']['output']>;
  userErrors: Array<ReviewUserError>;
};

export enum ReviewDuplicatePolicy {
  AllowMultiple = 'ALLOW_MULTIPLE',
  OnePerOrderLine = 'ONE_PER_ORDER_LINE',
  OnePerProduct = 'ONE_PER_PRODUCT'
}

export type ReviewEdge = {
  __typename?: 'ReviewEdge';
  cursor: Scalars['Cursor']['output'];
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

export type ReviewMedia = Node & {
  __typename?: 'ReviewMedia';
  caption: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  media: Media;
  review: Review;
  sortIndex: Scalars['Int']['output'];
  status: ReviewContentStatus;
  updatedAt: Scalars['DateTime']['output'];
};

/** One media attachment submitted with a review. */
export type ReviewMediaCreateInput = {
  caption?: InputMaybe<Scalars['String']['input']>;
  mediaId: Scalars['ID']['input'];
  /** Zero-based display position. Defaults to the input list position. */
  sortIndex?: InputMaybe<Scalars['Int']['input']>;
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

/** A moderation case associated with content owned by the current customer. */
export type ReviewModerationCase = Node & {
  __typename?: 'ReviewModerationCase';
  content: ReviewContent;
  createdAt: Scalars['DateTime']['output'];
  dueAt: Maybe<Scalars['DateTime']['output']>;
  id: Scalars['ID']['output'];
  priority: Scalars['Int']['output'];
  reasonCode: Scalars['String']['output'];
  resolutionCode: Maybe<Scalars['String']['output']>;
  resolvedAt: Maybe<Scalars['DateTime']['output']>;
  status: ReviewModerationCaseStatus;
  updatedAt: Scalars['DateTime']['output'];
};

export type ReviewModerationCaseConnection = Connection & {
  __typename?: 'ReviewModerationCaseConnection';
  edges: Array<ReviewModerationCaseEdge>;
  nodes: Array<ReviewModerationCase>;
  pageInfo: PageInfo;
  totalCount: Scalars['Int']['output'];
};

export type ReviewModerationCaseEdge = {
  __typename?: 'ReviewModerationCaseEdge';
  cursor: Scalars['Cursor']['output'];
  node: ReviewModerationCase;
};

export enum ReviewModerationCaseStatus {
  Cancelled = 'CANCELLED',
  InReview = 'IN_REVIEW',
  Open = 'OPEN',
  Resolved = 'RESOLVED'
}

/** An append-only public lifecycle event for moderated content. */
export type ReviewModerationEvent = Node & {
  __typename?: 'ReviewModerationEvent';
  action: ReviewModerationAction;
  content: ReviewContent;
  createdAt: Scalars['DateTime']['output'];
  fromStatus: Maybe<ReviewContentStatus>;
  id: Scalars['ID']['output'];
  isAutomated: Scalars['Boolean']['output'];
  moderationCase: Maybe<ReviewModerationCase>;
  reasonCode: Maybe<Scalars['String']['output']>;
  toStatus: Maybe<ReviewContentStatus>;
};

export type ReviewModerationEventConnection = Connection & {
  __typename?: 'ReviewModerationEventConnection';
  edges: Array<ReviewModerationEventEdge>;
  nodes: Array<ReviewModerationEvent>;
  pageInfo: PageInfo;
  totalCount: Scalars['Int']['output'];
};

export type ReviewModerationEventEdge = {
  __typename?: 'ReviewModerationEventEdge';
  cursor: Scalars['Cursor']['output'];
  node: ReviewModerationEvent;
};

export enum ReviewModerationMode {
  Automated = 'AUTOMATED',
  Postmoderation = 'POSTMODERATION',
  Premoderation = 'PREMODERATION'
}

/** Automated moderation evidence associated with customer-owned content. */
export type ReviewModerationSignal = Node & {
  __typename?: 'ReviewModerationSignal';
  content: ReviewContent;
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  modelVersion: Maybe<Scalars['String']['output']>;
  provider: Scalars['String']['output'];
  score: Maybe<Scalars['Float']['output']>;
  signalType: Scalars['String']['output'];
  verdict: ReviewModerationVerdict;
};

export type ReviewModerationSignalConnection = Connection & {
  __typename?: 'ReviewModerationSignalConnection';
  edges: Array<ReviewModerationSignalEdge>;
  nodes: Array<ReviewModerationSignal>;
  pageInfo: PageInfo;
  totalCount: Scalars['Int']['output'];
};

export type ReviewModerationSignalEdge = {
  __typename?: 'ReviewModerationSignalEdge';
  cursor: Scalars['Cursor']['output'];
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

/** Distribution of reviews across the five supported rating values. */
export type ReviewRatingBreakdown = {
  __typename?: 'ReviewRatingBreakdown';
  rating1Count: Scalars['Int']['output'];
  rating2Count: Scalars['Int']['output'];
  rating3Count: Scalars['Int']['output'];
  rating4Count: Scalars['Int']['output'];
  rating5Count: Scalars['Int']['output'];
};

/** A localized rating dimension such as quality, fit, or value. */
export type ReviewRatingCriterion = Node & {
  __typename?: 'ReviewRatingCriterion';
  appliesToAllProducts: Scalars['Boolean']['output'];
  assignments: Array<ReviewRatingCriterionAssignment>;
  code: Scalars['String']['output'];
  createdAt: Scalars['DateTime']['output'];
  defaultDescription: Maybe<Scalars['String']['output']>;
  defaultTitle: Scalars['String']['output'];
  description: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  isActive: Scalars['Boolean']['output'];
  isRequired: Scalars['Boolean']['output'];
  sortIndex: Scalars['Int']['output'];
  title: Scalars['String']['output'];
  translations: Array<ReviewRatingCriterionTranslation>;
  updatedAt: Scalars['DateTime']['output'];
  weight: Scalars['Float']['output'];
};

export type ReviewRatingCriterionAssignment = Node & {
  __typename?: 'ReviewRatingCriterionAssignment';
  createdAt: Scalars['DateTime']['output'];
  criterion: ReviewRatingCriterion;
  id: Scalars['ID']['output'];
  isRequired: Scalars['Boolean']['output'];
  sortIndex: Scalars['Int']['output'];
  target: ReviewRatingCriterionTarget;
  targetType: ReviewRatingCriterionTargetType;
};

/** A Relay connection to rating criteria applicable in the current context. */
export type ReviewRatingCriterionConnection = Connection & {
  __typename?: 'ReviewRatingCriterionConnection';
  edges: Array<ReviewRatingCriterionEdge>;
  nodes: Array<ReviewRatingCriterion>;
  pageInfo: PageInfo;
  totalCount: Scalars['Int']['output'];
};

export type ReviewRatingCriterionEdge = {
  __typename?: 'ReviewRatingCriterionEdge';
  cursor: Scalars['Cursor']['output'];
  node: ReviewRatingCriterion;
};

export type ReviewRatingCriterionTarget = Category | Product;

export enum ReviewRatingCriterionTargetType {
  Category = 'CATEGORY',
  Product = 'PRODUCT'
}

export type ReviewRatingCriterionTranslation = {
  __typename?: 'ReviewRatingCriterionTranslation';
  description: Maybe<Scalars['String']['output']>;
  locale: LocaleCode;
  title: Scalars['String']['output'];
};

/** One detailed rating value supplied for an active product criterion. */
export type ReviewRatingValueInput = {
  criterionId: Scalars['ID']['input'];
  /** Rating from 1 through 5. */
  value: Scalars['Int']['input'];
};

export type ReviewReply = Node & ReviewContent & {
  __typename?: 'ReviewReply';
  author: ReviewContentAuthor;
  body: Scalars['String']['output'];
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  isOfficial: Scalars['Boolean']['output'];
  kind: ReviewContentKind;
  locale: LocaleCode;
  metrics: ReviewContentMetrics;
  publishedAt: Maybe<Scalars['DateTime']['output']>;
  review: Review;
  revision: Scalars['Int']['output'];
  sortIndex: Scalars['Int']['output'];
  status: ReviewContentStatus;
  title: Maybe<Scalars['String']['output']>;
  translations: Array<ReviewContentTranslation>;
  updatedAt: Scalars['DateTime']['output'];
  viewerCapabilities: ReviewContentViewerCapabilities;
  viewerEngagement: ReviewContentViewerEngagement;
};

export type ReviewReplyConnection = Connection & {
  __typename?: 'ReviewReplyConnection';
  edges: Array<ReviewReplyEdge>;
  nodes: Array<ReviewReply>;
  pageInfo: PageInfo;
  totalCount: Scalars['Int']['output'];
};

export type ReviewReplyEdge = {
  __typename?: 'ReviewReplyEdge';
  cursor: Scalars['Cursor']['output'];
  node: ReviewReply;
};

/** A customer-facing invitation to review a purchased product. */
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
  locale: LocaleCode;
  openedAt: Maybe<Scalars['DateTime']['output']>;
  product: Product;
  review: Maybe<Review>;
  scheduledAt: Scalars['DateTime']['output'];
  sentAt: Maybe<Scalars['DateTime']['output']>;
  status: ReviewRequestStatus;
  submittedAt: Maybe<Scalars['DateTime']['output']>;
  updatedAt: Scalars['DateTime']['output'];
  variant: Maybe<ProductVariant>;
};


/** A customer-facing invitation to review a purchased product. */
export type ReviewRequestEventsArgs = {
  after?: InputMaybe<Scalars['Cursor']['input']>;
  before?: InputMaybe<Scalars['Cursor']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};

export type ReviewRequestConnection = Connection & {
  __typename?: 'ReviewRequestConnection';
  edges: Array<ReviewRequestEdge>;
  nodes: Array<ReviewRequest>;
  pageInfo: PageInfo;
  totalCount: Scalars['Int']['output'];
};

export type ReviewRequestEdge = {
  __typename?: 'ReviewRequestEdge';
  cursor: Scalars['Cursor']['output'];
  node: ReviewRequest;
};

export type ReviewRequestEvent = Node & {
  __typename?: 'ReviewRequestEvent';
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  occurredAt: Scalars['DateTime']['output'];
  reviewRequest: ReviewRequest;
  type: ReviewRequestEventType;
};

export type ReviewRequestEventConnection = Connection & {
  __typename?: 'ReviewRequestEventConnection';
  edges: Array<ReviewRequestEventEdge>;
  nodes: Array<ReviewRequestEvent>;
  pageInfo: PageInfo;
  totalCount: Scalars['Int']['output'];
};

export type ReviewRequestEventEdge = {
  __typename?: 'ReviewRequestEventEdge';
  cursor: Scalars['Cursor']['output'];
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

/** Customer-facing orderings supported by review connections. */
export enum ReviewSort {
  HighestRating = 'HIGHEST_RATING',
  LowestRating = 'LOWEST_RATING',
  MostHelpful = 'MOST_HELPFUL',
  Newest = 'NEWEST',
  Oldest = 'OLDEST'
}

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

/**
 * Guest identity supplied for a storefront content submission.
 *
 * Authenticated customer identity is always taken from trusted request context;
 * when a customer is authenticated this input is ignored.
 */
export type ReviewSubmissionAuthorInput = {
  /** Public display name shown alongside the submitted content. */
  displayName: Scalars['String']['input'];
  /** Contact email required for guest submissions and never exposed publicly. */
  email?: InputMaybe<Scalars['Email']['input']>;
};

export enum ReviewTranslationSource {
  Human = 'HUMAN',
  Import = 'IMPORT',
  Machine = 'MACHINE'
}

/** Customer-editable fields of an existing review. */
export type ReviewUpdateInput = {
  content?: InputMaybe<ReviewContentEditInput>;
  expectedRevision: Scalars['Int']['input'];
  /** Complete media replacement when supplied. An empty list removes media. */
  media?: InputMaybe<Array<ReviewMediaCreateInput>>;
  /** New overall rating from 1 through 5. */
  rating?: InputMaybe<Scalars['Int']['input']>;
  /** Complete detailed criterion rating replacement when supplied. */
  ratings?: InputMaybe<Array<ReviewRatingValueInput>>;
  reviewId: Scalars['ID']['input'];
};

export type ReviewUpdatePayload = {
  __typename?: 'ReviewUpdatePayload';
  review: Maybe<Review>;
  userErrors: Array<ReviewUserError>;
};

/** A customer-facing mutation error safe to display in a storefront. */
export type ReviewUserError = DisplayableError & {
  __typename?: 'ReviewUserError';
  /** Stable machine-readable error code. */
  code: Maybe<Scalars['String']['output']>;
  /** Path to the invalid input field, when available. */
  field: Maybe<Array<Scalars['String']['output']>>;
  /** Human-readable error message. */
  message: Scalars['String']['output'];
};

export enum ReviewVerificationStatus {
  Revoked = 'REVOKED',
  Unverified = 'UNVERIFIED',
  Verified = 'VERIFIED'
}

/** Localized rich text in plain text, HTML, and structured JSON formats. */
export type RichText = {
  __typename?: 'RichText';
  html: Scalars['HTML']['output'];
  json: Scalars['JSON']['output'];
  text: Scalars['String']['output'];
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

/** Mapping of union types */
export type ResolversUnionTypes<_RefType extends Record<string, unknown>> = ResolversObject<{
  ReviewRatingCriterionTarget: ( Category ) | ( Omit<Product, 'questionSummary' | 'questions' | 'reviewRatingCriteria' | 'reviewSummary' | 'reviews'> & { questionSummary: _RefType['ProductQuestionSummary'], questions: _RefType['ProductQuestionConnection'], reviewRatingCriteria: _RefType['ReviewRatingCriterionConnection'], reviewSummary: _RefType['ProductReviewSummary'], reviews: _RefType['ReviewConnection'] } );
}>;

/** Mapping of interface types */
export type ResolversInterfaceTypes<_RefType extends Record<string, unknown>> = ResolversObject<{
  Connection: ( Omit<ProductQuestionAnswerConnection, 'edges' | 'nodes'> & { edges: Array<_RefType['ProductQuestionAnswerEdge']>, nodes: Array<_RefType['ProductQuestionAnswer']> } ) | ( Omit<ProductQuestionConnection, 'edges' | 'nodes'> & { edges: Array<_RefType['ProductQuestionEdge']>, nodes: Array<_RefType['ProductQuestion']> } ) | ( Omit<ReviewConnection, 'edges' | 'nodes'> & { edges: Array<_RefType['ReviewEdge']>, nodes: Array<_RefType['Review']> } ) | ( Omit<ReviewContentConnection, 'edges' | 'nodes'> & { edges: Array<_RefType['ReviewContentEdge']>, nodes: Array<_RefType['ReviewContent']> } ) | ( Omit<ReviewContentExternalReferenceConnection, 'edges' | 'nodes'> & { edges: Array<_RefType['ReviewContentExternalReferenceEdge']>, nodes: Array<_RefType['ReviewContentExternalReference']> } ) | ( Omit<ReviewContentReportConnection, 'edges' | 'nodes'> & { edges: Array<_RefType['ReviewContentReportEdge']>, nodes: Array<_RefType['ReviewContentReport']> } ) | ( Omit<ReviewContentRevisionConnection, 'edges' | 'nodes'> & { edges: Array<_RefType['ReviewContentRevisionEdge']>, nodes: Array<_RefType['ReviewContentRevision']> } ) | ( Omit<ReviewContentVoteConnection, 'edges' | 'nodes'> & { edges: Array<_RefType['ReviewContentVoteEdge']>, nodes: Array<_RefType['ReviewContentVote']> } ) | ( Omit<ReviewModerationCaseConnection, 'edges' | 'nodes'> & { edges: Array<_RefType['ReviewModerationCaseEdge']>, nodes: Array<_RefType['ReviewModerationCase']> } ) | ( Omit<ReviewModerationEventConnection, 'edges' | 'nodes'> & { edges: Array<_RefType['ReviewModerationEventEdge']>, nodes: Array<_RefType['ReviewModerationEvent']> } ) | ( Omit<ReviewModerationSignalConnection, 'edges' | 'nodes'> & { edges: Array<_RefType['ReviewModerationSignalEdge']>, nodes: Array<_RefType['ReviewModerationSignal']> } ) | ( Omit<ReviewRatingCriterionConnection, 'edges' | 'nodes'> & { edges: Array<_RefType['ReviewRatingCriterionEdge']>, nodes: Array<_RefType['ReviewRatingCriterion']> } ) | ( Omit<ReviewReplyConnection, 'edges' | 'nodes'> & { edges: Array<_RefType['ReviewReplyEdge']>, nodes: Array<_RefType['ReviewReply']> } ) | ( Omit<ReviewRequestConnection, 'edges' | 'nodes'> & { edges: Array<_RefType['ReviewRequestEdge']>, nodes: Array<_RefType['ReviewRequest']> } ) | ( ReviewRequestEventConnection );
  DisplayableError: ( ReviewUserError ) | ( UserError );
  Media: never;
  Node: ( Omit<ProductQuestion, 'answers' | 'author' | 'product' | 'translations' | 'viewerSubscription'> & { answers: _RefType['ProductQuestionAnswerConnection'], author: _RefType['ReviewContentAuthor'], product: _RefType['Product'], translations: Array<_RefType['ReviewContentTranslation']>, viewerSubscription?: Maybe<_RefType['ProductQuestionSubscription']> } ) | ( Omit<ProductQuestionAnswer, 'author' | 'question' | 'translations'> & { author: _RefType['ReviewContentAuthor'], question: _RefType['ProductQuestion'], translations: Array<_RefType['ReviewContentTranslation']> } ) | ( Omit<ProductQuestionSubscription, 'question' | 'subscriberCustomer'> & { question: _RefType['ProductQuestion'], subscriberCustomer?: Maybe<_RefType['Customer']> } ) | ( Omit<Review, 'author' | 'media' | 'product' | 'ratings' | 'replies' | 'translations'> & { author: _RefType['ReviewContentAuthor'], media: Array<_RefType['ReviewMedia']>, product: _RefType['Product'], ratings: Array<_RefType['ReviewRating']>, replies: _RefType['ReviewReplyConnection'], translations: Array<_RefType['ReviewContentTranslation']> } ) | ( Omit<ReviewContentExternalReference, 'content'> & { content: _RefType['ReviewContent'] } ) | ( Omit<ReviewContentPublication, 'content'> & { content: _RefType['ReviewContent'] } ) | ( Omit<ReviewContentReport, 'content' | 'reporterCustomer'> & { content: _RefType['ReviewContent'], reporterCustomer?: Maybe<_RefType['Customer']> } ) | ( Omit<ReviewContentRevision, 'content'> & { content: _RefType['ReviewContent'] } ) | ( Omit<ReviewContentTranslation, 'content'> & { content: _RefType['ReviewContent'] } ) | ( Omit<ReviewContentVote, 'content' | 'voterCustomer'> & { content: _RefType['ReviewContent'], voterCustomer?: Maybe<_RefType['Customer']> } ) | ( Omit<ReviewMedia, 'media' | 'review'> & { media: _RefType['Media'], review: _RefType['Review'] } ) | ( Omit<ReviewModerationCase, 'content'> & { content: _RefType['ReviewContent'] } ) | ( Omit<ReviewModerationEvent, 'content' | 'moderationCase'> & { content: _RefType['ReviewContent'], moderationCase?: Maybe<_RefType['ReviewModerationCase']> } ) | ( Omit<ReviewModerationSignal, 'content'> & { content: _RefType['ReviewContent'] } ) | ( Omit<ReviewRatingCriterion, 'assignments'> & { assignments: Array<_RefType['ReviewRatingCriterionAssignment']> } ) | ( Omit<ReviewRatingCriterionAssignment, 'criterion' | 'target'> & { criterion: _RefType['ReviewRatingCriterion'], target: _RefType['ReviewRatingCriterionTarget'] } ) | ( Omit<ReviewReply, 'author' | 'review' | 'translations'> & { author: _RefType['ReviewContentAuthor'], review: _RefType['Review'], translations: Array<_RefType['ReviewContentTranslation']> } ) | ( Omit<ReviewRequest, 'customer' | 'product' | 'review'> & { customer: _RefType['Customer'], product: _RefType['Product'], review?: Maybe<_RefType['Review']> } ) | ( Omit<ReviewRequestEvent, 'reviewRequest'> & { reviewRequest: _RefType['ReviewRequest'] } ) | ( ReviewStoreConfiguration );
  ReviewContent: ( Omit<ProductQuestion, 'answers' | 'author' | 'product' | 'translations' | 'viewerSubscription'> & { answers: _RefType['ProductQuestionAnswerConnection'], author: _RefType['ReviewContentAuthor'], product: _RefType['Product'], translations: Array<_RefType['ReviewContentTranslation']>, viewerSubscription?: Maybe<_RefType['ProductQuestionSubscription']> } ) | ( Omit<ProductQuestionAnswer, 'author' | 'question' | 'translations'> & { author: _RefType['ReviewContentAuthor'], question: _RefType['ProductQuestion'], translations: Array<_RefType['ReviewContentTranslation']> } ) | ( Omit<Review, 'author' | 'media' | 'product' | 'ratings' | 'replies' | 'translations'> & { author: _RefType['ReviewContentAuthor'], media: Array<_RefType['ReviewMedia']>, product: _RefType['Product'], ratings: Array<_RefType['ReviewRating']>, replies: _RefType['ReviewReplyConnection'], translations: Array<_RefType['ReviewContentTranslation']> } ) | ( Omit<ReviewReply, 'author' | 'review' | 'translations'> & { author: _RefType['ReviewContentAuthor'], review: _RefType['Review'], translations: Array<_RefType['ReviewContentTranslation']> } );
}>;

/** Mapping between all available schema types and the resolvers types */
export type ResolversTypes = ResolversObject<{
  Category: ResolverTypeWrapper<Category>;
  ID: ResolverTypeWrapper<Scalars['ID']['output']>;
  Color: ResolverTypeWrapper<Scalars['Color']['output']>;
  Connection: ResolverTypeWrapper<ResolversInterfaceTypes<ResolversTypes>['Connection']>;
  Int: ResolverTypeWrapper<Scalars['Int']['output']>;
  CountryCode: CountryCode;
  CurrencyCode: CurrencyCode;
  Cursor: ResolverTypeWrapper<Scalars['Cursor']['output']>;
  Customer: ResolverTypeWrapper<Omit<Customer, 'productQuestions' | 'reviewRequests' | 'reviews'> & { productQuestions: ResolversTypes['ProductQuestionConnection'], reviewRequests: ResolversTypes['ReviewRequestConnection'], reviews: ResolversTypes['ReviewConnection'] }>;
  DateTime: ResolverTypeWrapper<Scalars['DateTime']['output']>;
  Decimal: ResolverTypeWrapper<Scalars['Decimal']['output']>;
  DimensionUnit: DimensionUnit;
  Dimensions: ResolverTypeWrapper<Dimensions>;
  Float: ResolverTypeWrapper<Scalars['Float']['output']>;
  DisplayableError: ResolverTypeWrapper<ResolversInterfaceTypes<ResolversTypes>['DisplayableError']>;
  String: ResolverTypeWrapper<Scalars['String']['output']>;
  Email: ResolverTypeWrapper<Scalars['Email']['output']>;
  HTML: ResolverTypeWrapper<Scalars['HTML']['output']>;
  ISO8601DateTime: ResolverTypeWrapper<Scalars['ISO8601DateTime']['output']>;
  JSON: ResolverTypeWrapper<Scalars['JSON']['output']>;
  LocaleCode: LocaleCode;
  Media: ResolverTypeWrapper<ResolversInterfaceTypes<ResolversTypes>['Media']>;
  Money: ResolverTypeWrapper<Money>;
  Mutation: ResolverTypeWrapper<{}>;
  Node: ResolverTypeWrapper<ResolversInterfaceTypes<ResolversTypes>['Node']>;
  PageInfo: ResolverTypeWrapper<PageInfo>;
  Boolean: ResolverTypeWrapper<Scalars['Boolean']['output']>;
  Product: ResolverTypeWrapper<Omit<Product, 'questionSummary' | 'questions' | 'reviewRatingCriteria' | 'reviewSummary' | 'reviews'> & { questionSummary: ResolversTypes['ProductQuestionSummary'], questions: ResolversTypes['ProductQuestionConnection'], reviewRatingCriteria: ResolversTypes['ReviewRatingCriterionConnection'], reviewSummary: ResolversTypes['ProductReviewSummary'], reviews: ResolversTypes['ReviewConnection'] }>;
  ProductQuestion: ResolverTypeWrapper<Omit<ProductQuestion, 'answers' | 'author' | 'product' | 'translations' | 'viewerSubscription'> & { answers: ResolversTypes['ProductQuestionAnswerConnection'], author: ResolversTypes['ReviewContentAuthor'], product: ResolversTypes['Product'], translations: Array<ResolversTypes['ReviewContentTranslation']>, viewerSubscription?: Maybe<ResolversTypes['ProductQuestionSubscription']> }>;
  ProductQuestionAnswer: ResolverTypeWrapper<Omit<ProductQuestionAnswer, 'author' | 'question' | 'translations'> & { author: ResolversTypes['ReviewContentAuthor'], question: ResolversTypes['ProductQuestion'], translations: Array<ResolversTypes['ReviewContentTranslation']> }>;
  ProductQuestionAnswerConnection: ResolverTypeWrapper<Omit<ProductQuestionAnswerConnection, 'edges' | 'nodes'> & { edges: Array<ResolversTypes['ProductQuestionAnswerEdge']>, nodes: Array<ResolversTypes['ProductQuestionAnswer']> }>;
  ProductQuestionAnswerCreateInput: ProductQuestionAnswerCreateInput;
  ProductQuestionAnswerCreatePayload: ResolverTypeWrapper<Omit<ProductQuestionAnswerCreatePayload, 'answer' | 'productQuestion'> & { answer?: Maybe<ResolversTypes['ProductQuestionAnswer']>, productQuestion?: Maybe<ResolversTypes['ProductQuestion']> }>;
  ProductQuestionAnswerDeletePayload: ResolverTypeWrapper<ProductQuestionAnswerDeletePayload>;
  ProductQuestionAnswerEdge: ResolverTypeWrapper<Omit<ProductQuestionAnswerEdge, 'node'> & { node: ResolversTypes['ProductQuestionAnswer'] }>;
  ProductQuestionAnswerSort: ProductQuestionAnswerSort;
  ProductQuestionAnswerUpdateInput: ProductQuestionAnswerUpdateInput;
  ProductQuestionAnswerUpdatePayload: ResolverTypeWrapper<Omit<ProductQuestionAnswerUpdatePayload, 'answer'> & { answer?: Maybe<ResolversTypes['ProductQuestionAnswer']> }>;
  ProductQuestionConnection: ResolverTypeWrapper<Omit<ProductQuestionConnection, 'edges' | 'nodes'> & { edges: Array<ResolversTypes['ProductQuestionEdge']>, nodes: Array<ResolversTypes['ProductQuestion']> }>;
  ProductQuestionCreateInput: ProductQuestionCreateInput;
  ProductQuestionCreatePayload: ResolverTypeWrapper<Omit<ProductQuestionCreatePayload, 'productQuestion'> & { productQuestion?: Maybe<ResolversTypes['ProductQuestion']> }>;
  ProductQuestionDeletePayload: ResolverTypeWrapper<ProductQuestionDeletePayload>;
  ProductQuestionEdge: ResolverTypeWrapper<Omit<ProductQuestionEdge, 'node'> & { node: ResolversTypes['ProductQuestion'] }>;
  ProductQuestionSort: ProductQuestionSort;
  ProductQuestionSubscription: ResolverTypeWrapper<Omit<ProductQuestionSubscription, 'question' | 'subscriberCustomer'> & { question: ResolversTypes['ProductQuestion'], subscriberCustomer?: Maybe<ResolversTypes['Customer']> }>;
  ProductQuestionSubscriptionSetInput: ProductQuestionSubscriptionSetInput;
  ProductQuestionSubscriptionSetPayload: ResolverTypeWrapper<Omit<ProductQuestionSubscriptionSetPayload, 'subscription'> & { subscription?: Maybe<ResolversTypes['ProductQuestionSubscription']> }>;
  ProductQuestionSubscriptionStatus: ProductQuestionSubscriptionStatus;
  ProductQuestionSummary: ResolverTypeWrapper<Omit<ProductQuestionSummary, 'product'> & { product: ResolversTypes['Product'] }>;
  ProductQuestionUpdateInput: ProductQuestionUpdateInput;
  ProductQuestionUpdatePayload: ResolverTypeWrapper<Omit<ProductQuestionUpdatePayload, 'productQuestion'> & { productQuestion?: Maybe<ResolversTypes['ProductQuestion']> }>;
  ProductRatingCriterionSummary: ResolverTypeWrapper<Omit<ProductRatingCriterionSummary, 'criterion'> & { criterion: ResolversTypes['ReviewRatingCriterion'] }>;
  ProductReviewSummary: ResolverTypeWrapper<Omit<ProductReviewSummary, 'criteria' | 'product'> & { criteria: Array<ResolversTypes['ProductRatingCriterionSummary']>, product: ResolversTypes['Product'] }>;
  ProductVariant: ResolverTypeWrapper<Omit<ProductVariant, 'questions' | 'reviews'> & { questions: ResolversTypes['ProductQuestionConnection'], reviews: ResolversTypes['ReviewConnection'] }>;
  Query: ResolverTypeWrapper<{}>;
  Review: ResolverTypeWrapper<Omit<Review, 'author' | 'media' | 'product' | 'ratings' | 'replies' | 'translations'> & { author: ResolversTypes['ReviewContentAuthor'], media: Array<ResolversTypes['ReviewMedia']>, product: ResolversTypes['Product'], ratings: Array<ResolversTypes['ReviewRating']>, replies: ResolversTypes['ReviewReplyConnection'], translations: Array<ResolversTypes['ReviewContentTranslation']> }>;
  ReviewConnection: ResolverTypeWrapper<Omit<ReviewConnection, 'edges' | 'nodes'> & { edges: Array<ResolversTypes['ReviewEdge']>, nodes: Array<ResolversTypes['Review']> }>;
  ReviewContent: ResolverTypeWrapper<ResolversInterfaceTypes<ResolversTypes>['ReviewContent']>;
  ReviewContentAuthor: ResolverTypeWrapper<Omit<ReviewContentAuthor, 'customer'> & { customer?: Maybe<ResolversTypes['Customer']> }>;
  ReviewContentAuthorType: ReviewContentAuthorType;
  ReviewContentConnection: ResolverTypeWrapper<Omit<ReviewContentConnection, 'edges' | 'nodes'> & { edges: Array<ResolversTypes['ReviewContentEdge']>, nodes: Array<ResolversTypes['ReviewContent']> }>;
  ReviewContentDeleteInput: ReviewContentDeleteInput;
  ReviewContentEdge: ResolverTypeWrapper<Omit<ReviewContentEdge, 'node'> & { node: ResolversTypes['ReviewContent'] }>;
  ReviewContentEditInput: ReviewContentEditInput;
  ReviewContentExternalReference: ResolverTypeWrapper<Omit<ReviewContentExternalReference, 'content'> & { content: ResolversTypes['ReviewContent'] }>;
  ReviewContentExternalReferenceConnection: ResolverTypeWrapper<Omit<ReviewContentExternalReferenceConnection, 'edges' | 'nodes'> & { edges: Array<ResolversTypes['ReviewContentExternalReferenceEdge']>, nodes: Array<ResolversTypes['ReviewContentExternalReference']> }>;
  ReviewContentExternalReferenceEdge: ResolverTypeWrapper<Omit<ReviewContentExternalReferenceEdge, 'node'> & { node: ResolversTypes['ReviewContentExternalReference'] }>;
  ReviewContentKind: ReviewContentKind;
  ReviewContentMetrics: ResolverTypeWrapper<ReviewContentMetrics>;
  ReviewContentPublication: ResolverTypeWrapper<Omit<ReviewContentPublication, 'content'> & { content: ResolversTypes['ReviewContent'] }>;
  ReviewContentReport: ResolverTypeWrapper<Omit<ReviewContentReport, 'content' | 'reporterCustomer'> & { content: ResolversTypes['ReviewContent'], reporterCustomer?: Maybe<ResolversTypes['Customer']> }>;
  ReviewContentReportConnection: ResolverTypeWrapper<Omit<ReviewContentReportConnection, 'edges' | 'nodes'> & { edges: Array<ResolversTypes['ReviewContentReportEdge']>, nodes: Array<ResolversTypes['ReviewContentReport']> }>;
  ReviewContentReportCreateInput: ReviewContentReportCreateInput;
  ReviewContentReportCreatePayload: ResolverTypeWrapper<Omit<ReviewContentReportCreatePayload, 'content' | 'report'> & { content?: Maybe<ResolversTypes['ReviewContent']>, report?: Maybe<ResolversTypes['ReviewContentReport']> }>;
  ReviewContentReportEdge: ResolverTypeWrapper<Omit<ReviewContentReportEdge, 'node'> & { node: ResolversTypes['ReviewContentReport'] }>;
  ReviewContentReportReason: ReviewContentReportReason;
  ReviewContentReportStatus: ReviewContentReportStatus;
  ReviewContentRevision: ResolverTypeWrapper<Omit<ReviewContentRevision, 'content'> & { content: ResolversTypes['ReviewContent'] }>;
  ReviewContentRevisionConnection: ResolverTypeWrapper<Omit<ReviewContentRevisionConnection, 'edges' | 'nodes'> & { edges: Array<ResolversTypes['ReviewContentRevisionEdge']>, nodes: Array<ResolversTypes['ReviewContentRevision']> }>;
  ReviewContentRevisionEdge: ResolverTypeWrapper<Omit<ReviewContentRevisionEdge, 'node'> & { node: ResolversTypes['ReviewContentRevision'] }>;
  ReviewContentStatus: ReviewContentStatus;
  ReviewContentSubmissionInput: ReviewContentSubmissionInput;
  ReviewContentTranslation: ResolverTypeWrapper<Omit<ReviewContentTranslation, 'content'> & { content: ResolversTypes['ReviewContent'] }>;
  ReviewContentViewerCapabilities: ResolverTypeWrapper<ReviewContentViewerCapabilities>;
  ReviewContentViewerEngagement: ResolverTypeWrapper<ReviewContentViewerEngagement>;
  ReviewContentVote: ResolverTypeWrapper<Omit<ReviewContentVote, 'content' | 'voterCustomer'> & { content: ResolversTypes['ReviewContent'], voterCustomer?: Maybe<ResolversTypes['Customer']> }>;
  ReviewContentVoteConnection: ResolverTypeWrapper<Omit<ReviewContentVoteConnection, 'edges' | 'nodes'> & { edges: Array<ResolversTypes['ReviewContentVoteEdge']>, nodes: Array<ResolversTypes['ReviewContentVote']> }>;
  ReviewContentVoteEdge: ResolverTypeWrapper<Omit<ReviewContentVoteEdge, 'node'> & { node: ResolversTypes['ReviewContentVote'] }>;
  ReviewContentVoteRemoveInput: ReviewContentVoteRemoveInput;
  ReviewContentVoteRemovePayload: ResolverTypeWrapper<Omit<ReviewContentVoteRemovePayload, 'content'> & { content?: Maybe<ResolversTypes['ReviewContent']> }>;
  ReviewContentVoteSetInput: ReviewContentVoteSetInput;
  ReviewContentVoteSetPayload: ResolverTypeWrapper<Omit<ReviewContentVoteSetPayload, 'content' | 'vote'> & { content?: Maybe<ResolversTypes['ReviewContent']>, vote?: Maybe<ResolversTypes['ReviewContentVote']> }>;
  ReviewContentVoteType: ReviewContentVoteType;
  ReviewCreateInput: ReviewCreateInput;
  ReviewCreatePayload: ResolverTypeWrapper<Omit<ReviewCreatePayload, 'review'> & { review?: Maybe<ResolversTypes['Review']> }>;
  ReviewDeletePayload: ResolverTypeWrapper<ReviewDeletePayload>;
  ReviewDuplicatePolicy: ReviewDuplicatePolicy;
  ReviewEdge: ResolverTypeWrapper<Omit<ReviewEdge, 'node'> & { node: ResolversTypes['Review'] }>;
  ReviewExternalSyncDirection: ReviewExternalSyncDirection;
  ReviewExternalSyncStatus: ReviewExternalSyncStatus;
  ReviewMedia: ResolverTypeWrapper<Omit<ReviewMedia, 'media' | 'review'> & { media: ResolversTypes['Media'], review: ResolversTypes['Review'] }>;
  ReviewMediaCreateInput: ReviewMediaCreateInput;
  ReviewModerationAction: ReviewModerationAction;
  ReviewModerationCase: ResolverTypeWrapper<Omit<ReviewModerationCase, 'content'> & { content: ResolversTypes['ReviewContent'] }>;
  ReviewModerationCaseConnection: ResolverTypeWrapper<Omit<ReviewModerationCaseConnection, 'edges' | 'nodes'> & { edges: Array<ResolversTypes['ReviewModerationCaseEdge']>, nodes: Array<ResolversTypes['ReviewModerationCase']> }>;
  ReviewModerationCaseEdge: ResolverTypeWrapper<Omit<ReviewModerationCaseEdge, 'node'> & { node: ResolversTypes['ReviewModerationCase'] }>;
  ReviewModerationCaseStatus: ReviewModerationCaseStatus;
  ReviewModerationEvent: ResolverTypeWrapper<Omit<ReviewModerationEvent, 'content' | 'moderationCase'> & { content: ResolversTypes['ReviewContent'], moderationCase?: Maybe<ResolversTypes['ReviewModerationCase']> }>;
  ReviewModerationEventConnection: ResolverTypeWrapper<Omit<ReviewModerationEventConnection, 'edges' | 'nodes'> & { edges: Array<ResolversTypes['ReviewModerationEventEdge']>, nodes: Array<ResolversTypes['ReviewModerationEvent']> }>;
  ReviewModerationEventEdge: ResolverTypeWrapper<Omit<ReviewModerationEventEdge, 'node'> & { node: ResolversTypes['ReviewModerationEvent'] }>;
  ReviewModerationMode: ReviewModerationMode;
  ReviewModerationSignal: ResolverTypeWrapper<Omit<ReviewModerationSignal, 'content'> & { content: ResolversTypes['ReviewContent'] }>;
  ReviewModerationSignalConnection: ResolverTypeWrapper<Omit<ReviewModerationSignalConnection, 'edges' | 'nodes'> & { edges: Array<ResolversTypes['ReviewModerationSignalEdge']>, nodes: Array<ResolversTypes['ReviewModerationSignal']> }>;
  ReviewModerationSignalEdge: ResolverTypeWrapper<Omit<ReviewModerationSignalEdge, 'node'> & { node: ResolversTypes['ReviewModerationSignal'] }>;
  ReviewModerationVerdict: ReviewModerationVerdict;
  ReviewNotificationChannel: ReviewNotificationChannel;
  ReviewPublicationStatus: ReviewPublicationStatus;
  ReviewRating: ResolverTypeWrapper<Omit<ReviewRating, 'criterion'> & { criterion: ResolversTypes['ReviewRatingCriterion'] }>;
  ReviewRatingBreakdown: ResolverTypeWrapper<ReviewRatingBreakdown>;
  ReviewRatingCriterion: ResolverTypeWrapper<Omit<ReviewRatingCriterion, 'assignments'> & { assignments: Array<ResolversTypes['ReviewRatingCriterionAssignment']> }>;
  ReviewRatingCriterionAssignment: ResolverTypeWrapper<Omit<ReviewRatingCriterionAssignment, 'criterion' | 'target'> & { criterion: ResolversTypes['ReviewRatingCriterion'], target: ResolversTypes['ReviewRatingCriterionTarget'] }>;
  ReviewRatingCriterionConnection: ResolverTypeWrapper<Omit<ReviewRatingCriterionConnection, 'edges' | 'nodes'> & { edges: Array<ResolversTypes['ReviewRatingCriterionEdge']>, nodes: Array<ResolversTypes['ReviewRatingCriterion']> }>;
  ReviewRatingCriterionEdge: ResolverTypeWrapper<Omit<ReviewRatingCriterionEdge, 'node'> & { node: ResolversTypes['ReviewRatingCriterion'] }>;
  ReviewRatingCriterionTarget: ResolverTypeWrapper<ResolversUnionTypes<ResolversTypes>['ReviewRatingCriterionTarget']>;
  ReviewRatingCriterionTargetType: ReviewRatingCriterionTargetType;
  ReviewRatingCriterionTranslation: ResolverTypeWrapper<ReviewRatingCriterionTranslation>;
  ReviewRatingValueInput: ReviewRatingValueInput;
  ReviewReply: ResolverTypeWrapper<Omit<ReviewReply, 'author' | 'review' | 'translations'> & { author: ResolversTypes['ReviewContentAuthor'], review: ResolversTypes['Review'], translations: Array<ResolversTypes['ReviewContentTranslation']> }>;
  ReviewReplyConnection: ResolverTypeWrapper<Omit<ReviewReplyConnection, 'edges' | 'nodes'> & { edges: Array<ResolversTypes['ReviewReplyEdge']>, nodes: Array<ResolversTypes['ReviewReply']> }>;
  ReviewReplyEdge: ResolverTypeWrapper<Omit<ReviewReplyEdge, 'node'> & { node: ResolversTypes['ReviewReply'] }>;
  ReviewRequest: ResolverTypeWrapper<Omit<ReviewRequest, 'customer' | 'product' | 'review'> & { customer: ResolversTypes['Customer'], product: ResolversTypes['Product'], review?: Maybe<ResolversTypes['Review']> }>;
  ReviewRequestConnection: ResolverTypeWrapper<Omit<ReviewRequestConnection, 'edges' | 'nodes'> & { edges: Array<ResolversTypes['ReviewRequestEdge']>, nodes: Array<ResolversTypes['ReviewRequest']> }>;
  ReviewRequestEdge: ResolverTypeWrapper<Omit<ReviewRequestEdge, 'node'> & { node: ResolversTypes['ReviewRequest'] }>;
  ReviewRequestEvent: ResolverTypeWrapper<Omit<ReviewRequestEvent, 'reviewRequest'> & { reviewRequest: ResolversTypes['ReviewRequest'] }>;
  ReviewRequestEventConnection: ResolverTypeWrapper<ReviewRequestEventConnection>;
  ReviewRequestEventEdge: ResolverTypeWrapper<ReviewRequestEventEdge>;
  ReviewRequestEventType: ReviewRequestEventType;
  ReviewRequestStatus: ReviewRequestStatus;
  ReviewSort: ReviewSort;
  ReviewStoreConfiguration: ResolverTypeWrapper<ReviewStoreConfiguration>;
  ReviewSubmissionAuthorInput: ReviewSubmissionAuthorInput;
  ReviewTranslationSource: ReviewTranslationSource;
  ReviewUpdateInput: ReviewUpdateInput;
  ReviewUpdatePayload: ResolverTypeWrapper<Omit<ReviewUpdatePayload, 'review'> & { review?: Maybe<ResolversTypes['Review']> }>;
  ReviewUserError: ResolverTypeWrapper<ReviewUserError>;
  ReviewVerificationStatus: ReviewVerificationStatus;
  RichText: ResolverTypeWrapper<RichText>;
  URL: ResolverTypeWrapper<Scalars['URL']['output']>;
  UnsignedInt64: ResolverTypeWrapper<Scalars['UnsignedInt64']['output']>;
  UserError: ResolverTypeWrapper<UserError>;
  Weight: ResolverTypeWrapper<Weight>;
  WeightUnit: WeightUnit;
}>;

/** Mapping between all available schema types and the resolvers parents */
export type ResolversParentTypes = ResolversObject<{
  Category: Category;
  ID: Scalars['ID']['output'];
  Color: Scalars['Color']['output'];
  Connection: ResolversInterfaceTypes<ResolversParentTypes>['Connection'];
  Int: Scalars['Int']['output'];
  Cursor: Scalars['Cursor']['output'];
  Customer: Omit<Customer, 'productQuestions' | 'reviewRequests' | 'reviews'> & { productQuestions: ResolversParentTypes['ProductQuestionConnection'], reviewRequests: ResolversParentTypes['ReviewRequestConnection'], reviews: ResolversParentTypes['ReviewConnection'] };
  DateTime: Scalars['DateTime']['output'];
  Decimal: Scalars['Decimal']['output'];
  Dimensions: Dimensions;
  Float: Scalars['Float']['output'];
  DisplayableError: ResolversInterfaceTypes<ResolversParentTypes>['DisplayableError'];
  String: Scalars['String']['output'];
  Email: Scalars['Email']['output'];
  HTML: Scalars['HTML']['output'];
  ISO8601DateTime: Scalars['ISO8601DateTime']['output'];
  JSON: Scalars['JSON']['output'];
  Media: ResolversInterfaceTypes<ResolversParentTypes>['Media'];
  Money: Money;
  Mutation: {};
  Node: ResolversInterfaceTypes<ResolversParentTypes>['Node'];
  PageInfo: PageInfo;
  Boolean: Scalars['Boolean']['output'];
  Product: Omit<Product, 'questionSummary' | 'questions' | 'reviewRatingCriteria' | 'reviewSummary' | 'reviews'> & { questionSummary: ResolversParentTypes['ProductQuestionSummary'], questions: ResolversParentTypes['ProductQuestionConnection'], reviewRatingCriteria: ResolversParentTypes['ReviewRatingCriterionConnection'], reviewSummary: ResolversParentTypes['ProductReviewSummary'], reviews: ResolversParentTypes['ReviewConnection'] };
  ProductQuestion: Omit<ProductQuestion, 'answers' | 'author' | 'product' | 'translations' | 'viewerSubscription'> & { answers: ResolversParentTypes['ProductQuestionAnswerConnection'], author: ResolversParentTypes['ReviewContentAuthor'], product: ResolversParentTypes['Product'], translations: Array<ResolversParentTypes['ReviewContentTranslation']>, viewerSubscription?: Maybe<ResolversParentTypes['ProductQuestionSubscription']> };
  ProductQuestionAnswer: Omit<ProductQuestionAnswer, 'author' | 'question' | 'translations'> & { author: ResolversParentTypes['ReviewContentAuthor'], question: ResolversParentTypes['ProductQuestion'], translations: Array<ResolversParentTypes['ReviewContentTranslation']> };
  ProductQuestionAnswerConnection: Omit<ProductQuestionAnswerConnection, 'edges' | 'nodes'> & { edges: Array<ResolversParentTypes['ProductQuestionAnswerEdge']>, nodes: Array<ResolversParentTypes['ProductQuestionAnswer']> };
  ProductQuestionAnswerCreateInput: ProductQuestionAnswerCreateInput;
  ProductQuestionAnswerCreatePayload: Omit<ProductQuestionAnswerCreatePayload, 'answer' | 'productQuestion'> & { answer?: Maybe<ResolversParentTypes['ProductQuestionAnswer']>, productQuestion?: Maybe<ResolversParentTypes['ProductQuestion']> };
  ProductQuestionAnswerDeletePayload: ProductQuestionAnswerDeletePayload;
  ProductQuestionAnswerEdge: Omit<ProductQuestionAnswerEdge, 'node'> & { node: ResolversParentTypes['ProductQuestionAnswer'] };
  ProductQuestionAnswerUpdateInput: ProductQuestionAnswerUpdateInput;
  ProductQuestionAnswerUpdatePayload: Omit<ProductQuestionAnswerUpdatePayload, 'answer'> & { answer?: Maybe<ResolversParentTypes['ProductQuestionAnswer']> };
  ProductQuestionConnection: Omit<ProductQuestionConnection, 'edges' | 'nodes'> & { edges: Array<ResolversParentTypes['ProductQuestionEdge']>, nodes: Array<ResolversParentTypes['ProductQuestion']> };
  ProductQuestionCreateInput: ProductQuestionCreateInput;
  ProductQuestionCreatePayload: Omit<ProductQuestionCreatePayload, 'productQuestion'> & { productQuestion?: Maybe<ResolversParentTypes['ProductQuestion']> };
  ProductQuestionDeletePayload: ProductQuestionDeletePayload;
  ProductQuestionEdge: Omit<ProductQuestionEdge, 'node'> & { node: ResolversParentTypes['ProductQuestion'] };
  ProductQuestionSubscription: Omit<ProductQuestionSubscription, 'question' | 'subscriberCustomer'> & { question: ResolversParentTypes['ProductQuestion'], subscriberCustomer?: Maybe<ResolversParentTypes['Customer']> };
  ProductQuestionSubscriptionSetInput: ProductQuestionSubscriptionSetInput;
  ProductQuestionSubscriptionSetPayload: Omit<ProductQuestionSubscriptionSetPayload, 'subscription'> & { subscription?: Maybe<ResolversParentTypes['ProductQuestionSubscription']> };
  ProductQuestionSummary: Omit<ProductQuestionSummary, 'product'> & { product: ResolversParentTypes['Product'] };
  ProductQuestionUpdateInput: ProductQuestionUpdateInput;
  ProductQuestionUpdatePayload: Omit<ProductQuestionUpdatePayload, 'productQuestion'> & { productQuestion?: Maybe<ResolversParentTypes['ProductQuestion']> };
  ProductRatingCriterionSummary: Omit<ProductRatingCriterionSummary, 'criterion'> & { criterion: ResolversParentTypes['ReviewRatingCriterion'] };
  ProductReviewSummary: Omit<ProductReviewSummary, 'criteria' | 'product'> & { criteria: Array<ResolversParentTypes['ProductRatingCriterionSummary']>, product: ResolversParentTypes['Product'] };
  ProductVariant: Omit<ProductVariant, 'questions' | 'reviews'> & { questions: ResolversParentTypes['ProductQuestionConnection'], reviews: ResolversParentTypes['ReviewConnection'] };
  Query: {};
  Review: Omit<Review, 'author' | 'media' | 'product' | 'ratings' | 'replies' | 'translations'> & { author: ResolversParentTypes['ReviewContentAuthor'], media: Array<ResolversParentTypes['ReviewMedia']>, product: ResolversParentTypes['Product'], ratings: Array<ResolversParentTypes['ReviewRating']>, replies: ResolversParentTypes['ReviewReplyConnection'], translations: Array<ResolversParentTypes['ReviewContentTranslation']> };
  ReviewConnection: Omit<ReviewConnection, 'edges' | 'nodes'> & { edges: Array<ResolversParentTypes['ReviewEdge']>, nodes: Array<ResolversParentTypes['Review']> };
  ReviewContent: ResolversInterfaceTypes<ResolversParentTypes>['ReviewContent'];
  ReviewContentAuthor: Omit<ReviewContentAuthor, 'customer'> & { customer?: Maybe<ResolversParentTypes['Customer']> };
  ReviewContentConnection: Omit<ReviewContentConnection, 'edges' | 'nodes'> & { edges: Array<ResolversParentTypes['ReviewContentEdge']>, nodes: Array<ResolversParentTypes['ReviewContent']> };
  ReviewContentDeleteInput: ReviewContentDeleteInput;
  ReviewContentEdge: Omit<ReviewContentEdge, 'node'> & { node: ResolversParentTypes['ReviewContent'] };
  ReviewContentEditInput: ReviewContentEditInput;
  ReviewContentExternalReference: Omit<ReviewContentExternalReference, 'content'> & { content: ResolversParentTypes['ReviewContent'] };
  ReviewContentExternalReferenceConnection: Omit<ReviewContentExternalReferenceConnection, 'edges' | 'nodes'> & { edges: Array<ResolversParentTypes['ReviewContentExternalReferenceEdge']>, nodes: Array<ResolversParentTypes['ReviewContentExternalReference']> };
  ReviewContentExternalReferenceEdge: Omit<ReviewContentExternalReferenceEdge, 'node'> & { node: ResolversParentTypes['ReviewContentExternalReference'] };
  ReviewContentMetrics: ReviewContentMetrics;
  ReviewContentPublication: Omit<ReviewContentPublication, 'content'> & { content: ResolversParentTypes['ReviewContent'] };
  ReviewContentReport: Omit<ReviewContentReport, 'content' | 'reporterCustomer'> & { content: ResolversParentTypes['ReviewContent'], reporterCustomer?: Maybe<ResolversParentTypes['Customer']> };
  ReviewContentReportConnection: Omit<ReviewContentReportConnection, 'edges' | 'nodes'> & { edges: Array<ResolversParentTypes['ReviewContentReportEdge']>, nodes: Array<ResolversParentTypes['ReviewContentReport']> };
  ReviewContentReportCreateInput: ReviewContentReportCreateInput;
  ReviewContentReportCreatePayload: Omit<ReviewContentReportCreatePayload, 'content' | 'report'> & { content?: Maybe<ResolversParentTypes['ReviewContent']>, report?: Maybe<ResolversParentTypes['ReviewContentReport']> };
  ReviewContentReportEdge: Omit<ReviewContentReportEdge, 'node'> & { node: ResolversParentTypes['ReviewContentReport'] };
  ReviewContentRevision: Omit<ReviewContentRevision, 'content'> & { content: ResolversParentTypes['ReviewContent'] };
  ReviewContentRevisionConnection: Omit<ReviewContentRevisionConnection, 'edges' | 'nodes'> & { edges: Array<ResolversParentTypes['ReviewContentRevisionEdge']>, nodes: Array<ResolversParentTypes['ReviewContentRevision']> };
  ReviewContentRevisionEdge: Omit<ReviewContentRevisionEdge, 'node'> & { node: ResolversParentTypes['ReviewContentRevision'] };
  ReviewContentSubmissionInput: ReviewContentSubmissionInput;
  ReviewContentTranslation: Omit<ReviewContentTranslation, 'content'> & { content: ResolversParentTypes['ReviewContent'] };
  ReviewContentViewerCapabilities: ReviewContentViewerCapabilities;
  ReviewContentViewerEngagement: ReviewContentViewerEngagement;
  ReviewContentVote: Omit<ReviewContentVote, 'content' | 'voterCustomer'> & { content: ResolversParentTypes['ReviewContent'], voterCustomer?: Maybe<ResolversParentTypes['Customer']> };
  ReviewContentVoteConnection: Omit<ReviewContentVoteConnection, 'edges' | 'nodes'> & { edges: Array<ResolversParentTypes['ReviewContentVoteEdge']>, nodes: Array<ResolversParentTypes['ReviewContentVote']> };
  ReviewContentVoteEdge: Omit<ReviewContentVoteEdge, 'node'> & { node: ResolversParentTypes['ReviewContentVote'] };
  ReviewContentVoteRemoveInput: ReviewContentVoteRemoveInput;
  ReviewContentVoteRemovePayload: Omit<ReviewContentVoteRemovePayload, 'content'> & { content?: Maybe<ResolversParentTypes['ReviewContent']> };
  ReviewContentVoteSetInput: ReviewContentVoteSetInput;
  ReviewContentVoteSetPayload: Omit<ReviewContentVoteSetPayload, 'content' | 'vote'> & { content?: Maybe<ResolversParentTypes['ReviewContent']>, vote?: Maybe<ResolversParentTypes['ReviewContentVote']> };
  ReviewCreateInput: ReviewCreateInput;
  ReviewCreatePayload: Omit<ReviewCreatePayload, 'review'> & { review?: Maybe<ResolversParentTypes['Review']> };
  ReviewDeletePayload: ReviewDeletePayload;
  ReviewEdge: Omit<ReviewEdge, 'node'> & { node: ResolversParentTypes['Review'] };
  ReviewMedia: Omit<ReviewMedia, 'media' | 'review'> & { media: ResolversParentTypes['Media'], review: ResolversParentTypes['Review'] };
  ReviewMediaCreateInput: ReviewMediaCreateInput;
  ReviewModerationCase: Omit<ReviewModerationCase, 'content'> & { content: ResolversParentTypes['ReviewContent'] };
  ReviewModerationCaseConnection: Omit<ReviewModerationCaseConnection, 'edges' | 'nodes'> & { edges: Array<ResolversParentTypes['ReviewModerationCaseEdge']>, nodes: Array<ResolversParentTypes['ReviewModerationCase']> };
  ReviewModerationCaseEdge: Omit<ReviewModerationCaseEdge, 'node'> & { node: ResolversParentTypes['ReviewModerationCase'] };
  ReviewModerationEvent: Omit<ReviewModerationEvent, 'content' | 'moderationCase'> & { content: ResolversParentTypes['ReviewContent'], moderationCase?: Maybe<ResolversParentTypes['ReviewModerationCase']> };
  ReviewModerationEventConnection: Omit<ReviewModerationEventConnection, 'edges' | 'nodes'> & { edges: Array<ResolversParentTypes['ReviewModerationEventEdge']>, nodes: Array<ResolversParentTypes['ReviewModerationEvent']> };
  ReviewModerationEventEdge: Omit<ReviewModerationEventEdge, 'node'> & { node: ResolversParentTypes['ReviewModerationEvent'] };
  ReviewModerationSignal: Omit<ReviewModerationSignal, 'content'> & { content: ResolversParentTypes['ReviewContent'] };
  ReviewModerationSignalConnection: Omit<ReviewModerationSignalConnection, 'edges' | 'nodes'> & { edges: Array<ResolversParentTypes['ReviewModerationSignalEdge']>, nodes: Array<ResolversParentTypes['ReviewModerationSignal']> };
  ReviewModerationSignalEdge: Omit<ReviewModerationSignalEdge, 'node'> & { node: ResolversParentTypes['ReviewModerationSignal'] };
  ReviewRating: Omit<ReviewRating, 'criterion'> & { criterion: ResolversParentTypes['ReviewRatingCriterion'] };
  ReviewRatingBreakdown: ReviewRatingBreakdown;
  ReviewRatingCriterion: Omit<ReviewRatingCriterion, 'assignments'> & { assignments: Array<ResolversParentTypes['ReviewRatingCriterionAssignment']> };
  ReviewRatingCriterionAssignment: Omit<ReviewRatingCriterionAssignment, 'criterion' | 'target'> & { criterion: ResolversParentTypes['ReviewRatingCriterion'], target: ResolversParentTypes['ReviewRatingCriterionTarget'] };
  ReviewRatingCriterionConnection: Omit<ReviewRatingCriterionConnection, 'edges' | 'nodes'> & { edges: Array<ResolversParentTypes['ReviewRatingCriterionEdge']>, nodes: Array<ResolversParentTypes['ReviewRatingCriterion']> };
  ReviewRatingCriterionEdge: Omit<ReviewRatingCriterionEdge, 'node'> & { node: ResolversParentTypes['ReviewRatingCriterion'] };
  ReviewRatingCriterionTarget: ResolversUnionTypes<ResolversParentTypes>['ReviewRatingCriterionTarget'];
  ReviewRatingCriterionTranslation: ReviewRatingCriterionTranslation;
  ReviewRatingValueInput: ReviewRatingValueInput;
  ReviewReply: Omit<ReviewReply, 'author' | 'review' | 'translations'> & { author: ResolversParentTypes['ReviewContentAuthor'], review: ResolversParentTypes['Review'], translations: Array<ResolversParentTypes['ReviewContentTranslation']> };
  ReviewReplyConnection: Omit<ReviewReplyConnection, 'edges' | 'nodes'> & { edges: Array<ResolversParentTypes['ReviewReplyEdge']>, nodes: Array<ResolversParentTypes['ReviewReply']> };
  ReviewReplyEdge: Omit<ReviewReplyEdge, 'node'> & { node: ResolversParentTypes['ReviewReply'] };
  ReviewRequest: Omit<ReviewRequest, 'customer' | 'product' | 'review'> & { customer: ResolversParentTypes['Customer'], product: ResolversParentTypes['Product'], review?: Maybe<ResolversParentTypes['Review']> };
  ReviewRequestConnection: Omit<ReviewRequestConnection, 'edges' | 'nodes'> & { edges: Array<ResolversParentTypes['ReviewRequestEdge']>, nodes: Array<ResolversParentTypes['ReviewRequest']> };
  ReviewRequestEdge: Omit<ReviewRequestEdge, 'node'> & { node: ResolversParentTypes['ReviewRequest'] };
  ReviewRequestEvent: Omit<ReviewRequestEvent, 'reviewRequest'> & { reviewRequest: ResolversParentTypes['ReviewRequest'] };
  ReviewRequestEventConnection: ReviewRequestEventConnection;
  ReviewRequestEventEdge: ReviewRequestEventEdge;
  ReviewStoreConfiguration: ReviewStoreConfiguration;
  ReviewSubmissionAuthorInput: ReviewSubmissionAuthorInput;
  ReviewUpdateInput: ReviewUpdateInput;
  ReviewUpdatePayload: Omit<ReviewUpdatePayload, 'review'> & { review?: Maybe<ResolversParentTypes['Review']> };
  ReviewUserError: ReviewUserError;
  RichText: RichText;
  URL: Scalars['URL']['output'];
  UnsignedInt64: Scalars['UnsignedInt64']['output'];
  UserError: UserError;
  Weight: Weight;
}>;

export type CategoryResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['Category'] = ResolversParentTypes['Category']> = ResolversObject<{
  __resolveReference?: ReferenceResolver<Maybe<ResolversTypes['Category']>, ParentType, ContextType>;

  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export interface ColorScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['Color'], any> {
  name: 'Color';
}

export type ConnectionResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['Connection'] = ResolversParentTypes['Connection']> = ResolversObject<{
  __resolveType: TypeResolveFn<'ProductQuestionAnswerConnection' | 'ProductQuestionConnection' | 'ReviewConnection' | 'ReviewContentConnection' | 'ReviewContentExternalReferenceConnection' | 'ReviewContentReportConnection' | 'ReviewContentRevisionConnection' | 'ReviewContentVoteConnection' | 'ReviewModerationCaseConnection' | 'ReviewModerationEventConnection' | 'ReviewModerationSignalConnection' | 'ReviewRatingCriterionConnection' | 'ReviewReplyConnection' | 'ReviewRequestConnection' | 'ReviewRequestEventConnection', ParentType, ContextType>;
  pageInfo?: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
}>;

export interface CursorScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['Cursor'], any> {
  name: 'Cursor';
}

export type CustomerResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['Customer'] = ResolversParentTypes['Customer']> = ResolversObject<{
  __resolveReference?: ReferenceResolver<Maybe<ResolversTypes['Customer']>, { __typename: 'Customer' } & GraphQLRecursivePick<ParentType, {"id":true}>, ContextType>;

  productQuestions?: Resolver<ResolversTypes['ProductQuestionConnection'], { __typename: 'Customer' } & GraphQLRecursivePick<ParentType, {"id":true}>, ContextType, RequireFields<CustomerProductQuestionsArgs, 'sort'>>;
  reviewRequests?: Resolver<ResolversTypes['ReviewRequestConnection'], { __typename: 'Customer' } & GraphQLRecursivePick<ParentType, {"id":true}>, ContextType, Partial<CustomerReviewRequestsArgs>>;
  reviews?: Resolver<ResolversTypes['ReviewConnection'], { __typename: 'Customer' } & GraphQLRecursivePick<ParentType, {"id":true}>, ContextType, RequireFields<CustomerReviewsArgs, 'sort'>>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export interface DateTimeScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['DateTime'], any> {
  name: 'DateTime';
}

export interface DecimalScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['Decimal'], any> {
  name: 'Decimal';
}

export type DimensionsResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['Dimensions'] = ResolversParentTypes['Dimensions']> = ResolversObject<{
  height?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  length?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  unit?: Resolver<ResolversTypes['DimensionUnit'], ParentType, ContextType>;
  width?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type DisplayableErrorResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['DisplayableError'] = ResolversParentTypes['DisplayableError']> = ResolversObject<{
  __resolveType: TypeResolveFn<'ReviewUserError' | 'UserError', ParentType, ContextType>;
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

export type MediaResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['Media'] = ResolversParentTypes['Media']> = ResolversObject<{
  __resolveType: TypeResolveFn<null, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
}>;

export type MoneyResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['Money'] = ResolversParentTypes['Money']> = ResolversObject<{
  amount?: Resolver<ResolversTypes['Decimal'], ParentType, ContextType>;
  currencyCode?: Resolver<ResolversTypes['CurrencyCode'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type MutationResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['Mutation'] = ResolversParentTypes['Mutation']> = ResolversObject<{
  productQuestionAnswerCreate?: Resolver<ResolversTypes['ProductQuestionAnswerCreatePayload'], ParentType, ContextType, RequireFields<MutationProductQuestionAnswerCreateArgs, 'input'>>;
  productQuestionAnswerDelete?: Resolver<ResolversTypes['ProductQuestionAnswerDeletePayload'], ParentType, ContextType, RequireFields<MutationProductQuestionAnswerDeleteArgs, 'input'>>;
  productQuestionAnswerUpdate?: Resolver<ResolversTypes['ProductQuestionAnswerUpdatePayload'], ParentType, ContextType, RequireFields<MutationProductQuestionAnswerUpdateArgs, 'input'>>;
  productQuestionCreate?: Resolver<ResolversTypes['ProductQuestionCreatePayload'], ParentType, ContextType, RequireFields<MutationProductQuestionCreateArgs, 'input'>>;
  productQuestionDelete?: Resolver<ResolversTypes['ProductQuestionDeletePayload'], ParentType, ContextType, RequireFields<MutationProductQuestionDeleteArgs, 'input'>>;
  productQuestionSubscriptionSet?: Resolver<ResolversTypes['ProductQuestionSubscriptionSetPayload'], ParentType, ContextType, RequireFields<MutationProductQuestionSubscriptionSetArgs, 'input'>>;
  productQuestionUpdate?: Resolver<ResolversTypes['ProductQuestionUpdatePayload'], ParentType, ContextType, RequireFields<MutationProductQuestionUpdateArgs, 'input'>>;
  reviewContentReportCreate?: Resolver<ResolversTypes['ReviewContentReportCreatePayload'], ParentType, ContextType, RequireFields<MutationReviewContentReportCreateArgs, 'input'>>;
  reviewContentVoteRemove?: Resolver<ResolversTypes['ReviewContentVoteRemovePayload'], ParentType, ContextType, RequireFields<MutationReviewContentVoteRemoveArgs, 'input'>>;
  reviewContentVoteSet?: Resolver<ResolversTypes['ReviewContentVoteSetPayload'], ParentType, ContextType, RequireFields<MutationReviewContentVoteSetArgs, 'input'>>;
  reviewCreate?: Resolver<ResolversTypes['ReviewCreatePayload'], ParentType, ContextType, RequireFields<MutationReviewCreateArgs, 'input'>>;
  reviewDelete?: Resolver<ResolversTypes['ReviewDeletePayload'], ParentType, ContextType, RequireFields<MutationReviewDeleteArgs, 'input'>>;
  reviewUpdate?: Resolver<ResolversTypes['ReviewUpdatePayload'], ParentType, ContextType, RequireFields<MutationReviewUpdateArgs, 'input'>>;
}>;

export type NodeResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['Node'] = ResolversParentTypes['Node']> = ResolversObject<{
  __resolveType: TypeResolveFn<'ProductQuestion' | 'ProductQuestionAnswer' | 'ProductQuestionSubscription' | 'Review' | 'ReviewContentExternalReference' | 'ReviewContentPublication' | 'ReviewContentReport' | 'ReviewContentRevision' | 'ReviewContentTranslation' | 'ReviewContentVote' | 'ReviewMedia' | 'ReviewModerationCase' | 'ReviewModerationEvent' | 'ReviewModerationSignal' | 'ReviewRatingCriterion' | 'ReviewRatingCriterionAssignment' | 'ReviewReply' | 'ReviewRequest' | 'ReviewRequestEvent' | 'ReviewStoreConfiguration', ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
}>;

export type PageInfoResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['PageInfo'] = ResolversParentTypes['PageInfo']> = ResolversObject<{
  endCursor?: Resolver<Maybe<ResolversTypes['Cursor']>, ParentType, ContextType>;
  hasNextPage?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  hasPreviousPage?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  startCursor?: Resolver<Maybe<ResolversTypes['Cursor']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ProductResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['Product'] = ResolversParentTypes['Product']> = ResolversObject<{
  __resolveReference?: ReferenceResolver<Maybe<ResolversTypes['Product']>, { __typename: 'Product' } & GraphQLRecursivePick<ParentType, {"id":true}>, ContextType>;

  questionSummary?: Resolver<ResolversTypes['ProductQuestionSummary'], { __typename: 'Product' } & GraphQLRecursivePick<ParentType, {"id":true}>, ContextType>;
  questions?: Resolver<ResolversTypes['ProductQuestionConnection'], { __typename: 'Product' } & GraphQLRecursivePick<ParentType, {"id":true}>, ContextType, RequireFields<ProductQuestionsArgs, 'sort'>>;
  reviewRatingCriteria?: Resolver<ResolversTypes['ReviewRatingCriterionConnection'], { __typename: 'Product' } & GraphQLRecursivePick<ParentType, {"id":true}>, ContextType, Partial<ProductReviewRatingCriteriaArgs>>;
  reviewSummary?: Resolver<ResolversTypes['ProductReviewSummary'], { __typename: 'Product' } & GraphQLRecursivePick<ParentType, {"id":true}>, ContextType>;
  reviews?: Resolver<ResolversTypes['ReviewConnection'], { __typename: 'Product' } & GraphQLRecursivePick<ParentType, {"id":true}>, ContextType, RequireFields<ProductReviewsArgs, 'sort' | 'verifiedOnly' | 'withMediaOnly'>>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ProductQuestionResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ProductQuestion'] = ResolversParentTypes['ProductQuestion']> = ResolversObject<{
  __resolveReference?: ReferenceResolver<Maybe<ResolversTypes['ProductQuestion']>, { __typename: 'ProductQuestion' } & GraphQLRecursivePick<ParentType, {"id":true}>, ContextType>;
  answers?: Resolver<ResolversTypes['ProductQuestionAnswerConnection'], ParentType, ContextType, RequireFields<ProductQuestionAnswersArgs, 'sort'>>;
  author?: Resolver<ResolversTypes['ReviewContentAuthor'], ParentType, ContextType>;
  body?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  kind?: Resolver<ResolversTypes['ReviewContentKind'], ParentType, ContextType>;
  locale?: Resolver<ResolversTypes['LocaleCode'], ParentType, ContextType>;
  metrics?: Resolver<ResolversTypes['ReviewContentMetrics'], ParentType, ContextType>;
  product?: Resolver<ResolversTypes['Product'], ParentType, ContextType>;
  publishedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  revision?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  status?: Resolver<ResolversTypes['ReviewContentStatus'], ParentType, ContextType>;
  title?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  translations?: Resolver<Array<ResolversTypes['ReviewContentTranslation']>, ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  variant?: Resolver<Maybe<ResolversTypes['ProductVariant']>, ParentType, ContextType>;
  viewerCapabilities?: Resolver<ResolversTypes['ReviewContentViewerCapabilities'], ParentType, ContextType>;
  viewerEngagement?: Resolver<ResolversTypes['ReviewContentViewerEngagement'], ParentType, ContextType>;
  viewerSubscription?: Resolver<Maybe<ResolversTypes['ProductQuestionSubscription']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ProductQuestionAnswerResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ProductQuestionAnswer'] = ResolversParentTypes['ProductQuestionAnswer']> = ResolversObject<{
  __resolveReference?: ReferenceResolver<Maybe<ResolversTypes['ProductQuestionAnswer']>, { __typename: 'ProductQuestionAnswer' } & GraphQLRecursivePick<ParentType, {"id":true}>, ContextType>;
  author?: Resolver<ResolversTypes['ReviewContentAuthor'], ParentType, ContextType>;
  body?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  isAccepted?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  isOfficial?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  kind?: Resolver<ResolversTypes['ReviewContentKind'], ParentType, ContextType>;
  locale?: Resolver<ResolversTypes['LocaleCode'], ParentType, ContextType>;
  metrics?: Resolver<ResolversTypes['ReviewContentMetrics'], ParentType, ContextType>;
  publishedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  question?: Resolver<ResolversTypes['ProductQuestion'], ParentType, ContextType>;
  revision?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  sortIndex?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  status?: Resolver<ResolversTypes['ReviewContentStatus'], ParentType, ContextType>;
  title?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  translations?: Resolver<Array<ResolversTypes['ReviewContentTranslation']>, ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  viewerCapabilities?: Resolver<ResolversTypes['ReviewContentViewerCapabilities'], ParentType, ContextType>;
  viewerEngagement?: Resolver<ResolversTypes['ReviewContentViewerEngagement'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ProductQuestionAnswerConnectionResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ProductQuestionAnswerConnection'] = ResolversParentTypes['ProductQuestionAnswerConnection']> = ResolversObject<{
  edges?: Resolver<Array<ResolversTypes['ProductQuestionAnswerEdge']>, ParentType, ContextType>;
  nodes?: Resolver<Array<ResolversTypes['ProductQuestionAnswer']>, ParentType, ContextType>;
  pageInfo?: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ProductQuestionAnswerCreatePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ProductQuestionAnswerCreatePayload'] = ResolversParentTypes['ProductQuestionAnswerCreatePayload']> = ResolversObject<{
  answer?: Resolver<Maybe<ResolversTypes['ProductQuestionAnswer']>, ParentType, ContextType>;
  productQuestion?: Resolver<Maybe<ResolversTypes['ProductQuestion']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['ReviewUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ProductQuestionAnswerDeletePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ProductQuestionAnswerDeletePayload'] = ResolversParentTypes['ProductQuestionAnswerDeletePayload']> = ResolversObject<{
  deletedAnswerId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['ReviewUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ProductQuestionAnswerEdgeResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ProductQuestionAnswerEdge'] = ResolversParentTypes['ProductQuestionAnswerEdge']> = ResolversObject<{
  cursor?: Resolver<ResolversTypes['Cursor'], ParentType, ContextType>;
  node?: Resolver<ResolversTypes['ProductQuestionAnswer'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ProductQuestionAnswerUpdatePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ProductQuestionAnswerUpdatePayload'] = ResolversParentTypes['ProductQuestionAnswerUpdatePayload']> = ResolversObject<{
  answer?: Resolver<Maybe<ResolversTypes['ProductQuestionAnswer']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['ReviewUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ProductQuestionConnectionResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ProductQuestionConnection'] = ResolversParentTypes['ProductQuestionConnection']> = ResolversObject<{
  edges?: Resolver<Array<ResolversTypes['ProductQuestionEdge']>, ParentType, ContextType>;
  nodes?: Resolver<Array<ResolversTypes['ProductQuestion']>, ParentType, ContextType>;
  pageInfo?: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ProductQuestionCreatePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ProductQuestionCreatePayload'] = ResolversParentTypes['ProductQuestionCreatePayload']> = ResolversObject<{
  productQuestion?: Resolver<Maybe<ResolversTypes['ProductQuestion']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['ReviewUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ProductQuestionDeletePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ProductQuestionDeletePayload'] = ResolversParentTypes['ProductQuestionDeletePayload']> = ResolversObject<{
  deletedProductQuestionId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['ReviewUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ProductQuestionEdgeResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ProductQuestionEdge'] = ResolversParentTypes['ProductQuestionEdge']> = ResolversObject<{
  cursor?: Resolver<ResolversTypes['Cursor'], ParentType, ContextType>;
  node?: Resolver<ResolversTypes['ProductQuestion'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ProductQuestionSubscriptionResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ProductQuestionSubscription'] = ResolversParentTypes['ProductQuestionSubscription']> = ResolversObject<{
  __resolveReference?: ReferenceResolver<Maybe<ResolversTypes['ProductQuestionSubscription']>, { __typename: 'ProductQuestionSubscription' } & GraphQLRecursivePick<ParentType, {"id":true}>, ContextType>;
  channel?: Resolver<ResolversTypes['ReviewNotificationChannel'], ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  lastNotifiedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  locale?: Resolver<ResolversTypes['LocaleCode'], ParentType, ContextType>;
  question?: Resolver<ResolversTypes['ProductQuestion'], ParentType, ContextType>;
  status?: Resolver<ResolversTypes['ProductQuestionSubscriptionStatus'], ParentType, ContextType>;
  subscriberCustomer?: Resolver<Maybe<ResolversTypes['Customer']>, ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ProductQuestionSubscriptionSetPayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ProductQuestionSubscriptionSetPayload'] = ResolversParentTypes['ProductQuestionSubscriptionSetPayload']> = ResolversObject<{
  subscription?: Resolver<Maybe<ResolversTypes['ProductQuestionSubscription']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['ReviewUserError']>, ParentType, ContextType>;
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
  productQuestion?: Resolver<Maybe<ResolversTypes['ProductQuestion']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['ReviewUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ProductRatingCriterionSummaryResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ProductRatingCriterionSummary'] = ResolversParentTypes['ProductRatingCriterionSummary']> = ResolversObject<{
  averageRating?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  criterion?: Resolver<ResolversTypes['ReviewRatingCriterion'], ParentType, ContextType>;
  ratingBreakdown?: Resolver<ResolversTypes['ReviewRatingBreakdown'], ParentType, ContextType>;
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
  reviewCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  verifiedReviewCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ProductVariantResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ProductVariant'] = ResolversParentTypes['ProductVariant']> = ResolversObject<{
  __resolveReference?: ReferenceResolver<Maybe<ResolversTypes['ProductVariant']>, { __typename: 'ProductVariant' } & GraphQLRecursivePick<ParentType, {"id":true}>, ContextType>;

  questions?: Resolver<ResolversTypes['ProductQuestionConnection'], { __typename: 'ProductVariant' } & GraphQLRecursivePick<ParentType, {"id":true}>, ContextType, RequireFields<ProductVariantQuestionsArgs, 'sort'>>;
  reviews?: Resolver<ResolversTypes['ReviewConnection'], { __typename: 'ProductVariant' } & GraphQLRecursivePick<ParentType, {"id":true}>, ContextType, RequireFields<ProductVariantReviewsArgs, 'sort'>>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type QueryResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['Query'] = ResolversParentTypes['Query']> = ResolversObject<{
  productQuestion?: Resolver<Maybe<ResolversTypes['ProductQuestion']>, ParentType, ContextType, RequireFields<QueryProductQuestionArgs, 'id'>>;
  productQuestionAnswer?: Resolver<Maybe<ResolversTypes['ProductQuestionAnswer']>, ParentType, ContextType, RequireFields<QueryProductQuestionAnswerArgs, 'id'>>;
  review?: Resolver<Maybe<ResolversTypes['Review']>, ParentType, ContextType, RequireFields<QueryReviewArgs, 'id'>>;
  reviewReply?: Resolver<Maybe<ResolversTypes['ReviewReply']>, ParentType, ContextType, RequireFields<QueryReviewReplyArgs, 'id'>>;
  reviewRequest?: Resolver<Maybe<ResolversTypes['ReviewRequest']>, ParentType, ContextType, RequireFields<QueryReviewRequestArgs, 'id'>>;
  reviewStoreConfiguration?: Resolver<Maybe<ResolversTypes['ReviewStoreConfiguration']>, ParentType, ContextType>;
}>;

export type ReviewResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['Review'] = ResolversParentTypes['Review']> = ResolversObject<{
  __resolveReference?: ReferenceResolver<Maybe<ResolversTypes['Review']>, { __typename: 'Review' } & GraphQLRecursivePick<ParentType, {"id":true}>, ContextType>;
  author?: Resolver<ResolversTypes['ReviewContentAuthor'], ParentType, ContextType>;
  body?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  incentiveDisclosure?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  isIncentivized?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  isVerifiedPurchase?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  kind?: Resolver<ResolversTypes['ReviewContentKind'], ParentType, ContextType>;
  locale?: Resolver<ResolversTypes['LocaleCode'], ParentType, ContextType>;
  media?: Resolver<Array<ResolversTypes['ReviewMedia']>, ParentType, ContextType>;
  metrics?: Resolver<ResolversTypes['ReviewContentMetrics'], ParentType, ContextType>;
  product?: Resolver<ResolversTypes['Product'], ParentType, ContextType>;
  publishedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  rating?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  ratings?: Resolver<Array<ResolversTypes['ReviewRating']>, ParentType, ContextType>;
  replies?: Resolver<ResolversTypes['ReviewReplyConnection'], ParentType, ContextType, Partial<ReviewRepliesArgs>>;
  revision?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  status?: Resolver<ResolversTypes['ReviewContentStatus'], ParentType, ContextType>;
  title?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  translations?: Resolver<Array<ResolversTypes['ReviewContentTranslation']>, ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  variant?: Resolver<Maybe<ResolversTypes['ProductVariant']>, ParentType, ContextType>;
  verificationStatus?: Resolver<ResolversTypes['ReviewVerificationStatus'], ParentType, ContextType>;
  viewerCapabilities?: Resolver<ResolversTypes['ReviewContentViewerCapabilities'], ParentType, ContextType>;
  viewerEngagement?: Resolver<ResolversTypes['ReviewContentViewerEngagement'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ReviewConnectionResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ReviewConnection'] = ResolversParentTypes['ReviewConnection']> = ResolversObject<{
  edges?: Resolver<Array<ResolversTypes['ReviewEdge']>, ParentType, ContextType>;
  nodes?: Resolver<Array<ResolversTypes['Review']>, ParentType, ContextType>;
  pageInfo?: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ReviewContentResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ReviewContent'] = ResolversParentTypes['ReviewContent']> = ResolversObject<{
  __resolveType: TypeResolveFn<'ProductQuestion' | 'ProductQuestionAnswer' | 'Review' | 'ReviewReply', ParentType, ContextType>;
  author?: Resolver<ResolversTypes['ReviewContentAuthor'], ParentType, ContextType>;
  body?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  kind?: Resolver<ResolversTypes['ReviewContentKind'], ParentType, ContextType>;
  locale?: Resolver<ResolversTypes['LocaleCode'], ParentType, ContextType>;
  metrics?: Resolver<ResolversTypes['ReviewContentMetrics'], ParentType, ContextType>;
  publishedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  revision?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  status?: Resolver<ResolversTypes['ReviewContentStatus'], ParentType, ContextType>;
  title?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  translations?: Resolver<Array<ResolversTypes['ReviewContentTranslation']>, ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  viewerCapabilities?: Resolver<ResolversTypes['ReviewContentViewerCapabilities'], ParentType, ContextType>;
  viewerEngagement?: Resolver<ResolversTypes['ReviewContentViewerEngagement'], ParentType, ContextType>;
}>;

export type ReviewContentAuthorResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ReviewContentAuthor'] = ResolversParentTypes['ReviewContentAuthor']> = ResolversObject<{
  customer?: Resolver<Maybe<ResolversTypes['Customer']>, ParentType, ContextType>;
  displayName?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  type?: Resolver<ResolversTypes['ReviewContentAuthorType'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ReviewContentConnectionResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ReviewContentConnection'] = ResolversParentTypes['ReviewContentConnection']> = ResolversObject<{
  edges?: Resolver<Array<ResolversTypes['ReviewContentEdge']>, ParentType, ContextType>;
  nodes?: Resolver<Array<ResolversTypes['ReviewContent']>, ParentType, ContextType>;
  pageInfo?: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ReviewContentEdgeResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ReviewContentEdge'] = ResolversParentTypes['ReviewContentEdge']> = ResolversObject<{
  cursor?: Resolver<ResolversTypes['Cursor'], ParentType, ContextType>;
  node?: Resolver<ResolversTypes['ReviewContent'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ReviewContentExternalReferenceResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ReviewContentExternalReference'] = ResolversParentTypes['ReviewContentExternalReference']> = ResolversObject<{
  __resolveReference?: ReferenceResolver<Maybe<ResolversTypes['ReviewContentExternalReference']>, { __typename: 'ReviewContentExternalReference' } & GraphQLRecursivePick<ParentType, {"id":true}>, ContextType>;
  content?: Resolver<ResolversTypes['ReviewContent'], ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  direction?: Resolver<ResolversTypes['ReviewExternalSyncDirection'], ParentType, ContextType>;
  externalId?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  externalSystem?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  externalType?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  externalUrl?: Resolver<Maybe<ResolversTypes['URL']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  lastSyncedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  metadata?: Resolver<ResolversTypes['JSON'], ParentType, ContextType>;
  syncStatus?: Resolver<ResolversTypes['ReviewExternalSyncStatus'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ReviewContentExternalReferenceConnectionResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ReviewContentExternalReferenceConnection'] = ResolversParentTypes['ReviewContentExternalReferenceConnection']> = ResolversObject<{
  edges?: Resolver<Array<ResolversTypes['ReviewContentExternalReferenceEdge']>, ParentType, ContextType>;
  nodes?: Resolver<Array<ResolversTypes['ReviewContentExternalReference']>, ParentType, ContextType>;
  pageInfo?: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ReviewContentExternalReferenceEdgeResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ReviewContentExternalReferenceEdge'] = ResolversParentTypes['ReviewContentExternalReferenceEdge']> = ResolversObject<{
  cursor?: Resolver<ResolversTypes['Cursor'], ParentType, ContextType>;
  node?: Resolver<ResolversTypes['ReviewContentExternalReference'], ParentType, ContextType>;
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
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ReviewContentPublicationResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ReviewContentPublication'] = ResolversParentTypes['ReviewContentPublication']> = ResolversObject<{
  __resolveReference?: ReferenceResolver<Maybe<ResolversTypes['ReviewContentPublication']>, { __typename: 'ReviewContentPublication' } & GraphQLRecursivePick<ParentType, {"id":true}>, ContextType>;
  channel?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  content?: Resolver<ResolversTypes['ReviewContent'], ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  locale?: Resolver<Maybe<ResolversTypes['LocaleCode']>, ParentType, ContextType>;
  publishedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  scheduledAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  status?: Resolver<ResolversTypes['ReviewPublicationStatus'], ParentType, ContextType>;
  unpublishedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ReviewContentReportResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ReviewContentReport'] = ResolversParentTypes['ReviewContentReport']> = ResolversObject<{
  __resolveReference?: ReferenceResolver<Maybe<ResolversTypes['ReviewContentReport']>, { __typename: 'ReviewContentReport' } & GraphQLRecursivePick<ParentType, {"id":true}>, ContextType>;
  content?: Resolver<ResolversTypes['ReviewContent'], ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  details?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  reason?: Resolver<ResolversTypes['ReviewContentReportReason'], ParentType, ContextType>;
  reporterCustomer?: Resolver<Maybe<ResolversTypes['Customer']>, ParentType, ContextType>;
  resolvedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  status?: Resolver<ResolversTypes['ReviewContentReportStatus'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ReviewContentReportConnectionResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ReviewContentReportConnection'] = ResolversParentTypes['ReviewContentReportConnection']> = ResolversObject<{
  edges?: Resolver<Array<ResolversTypes['ReviewContentReportEdge']>, ParentType, ContextType>;
  nodes?: Resolver<Array<ResolversTypes['ReviewContentReport']>, ParentType, ContextType>;
  pageInfo?: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ReviewContentReportCreatePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ReviewContentReportCreatePayload'] = ResolversParentTypes['ReviewContentReportCreatePayload']> = ResolversObject<{
  content?: Resolver<Maybe<ResolversTypes['ReviewContent']>, ParentType, ContextType>;
  report?: Resolver<Maybe<ResolversTypes['ReviewContentReport']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['ReviewUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ReviewContentReportEdgeResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ReviewContentReportEdge'] = ResolversParentTypes['ReviewContentReportEdge']> = ResolversObject<{
  cursor?: Resolver<ResolversTypes['Cursor'], ParentType, ContextType>;
  node?: Resolver<ResolversTypes['ReviewContentReport'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ReviewContentRevisionResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ReviewContentRevision'] = ResolversParentTypes['ReviewContentRevision']> = ResolversObject<{
  __resolveReference?: ReferenceResolver<Maybe<ResolversTypes['ReviewContentRevision']>, { __typename: 'ReviewContentRevision' } & GraphQLRecursivePick<ParentType, {"id":true}>, ContextType>;
  changeReason?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  content?: Resolver<ResolversTypes['ReviewContent'], ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  revision?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ReviewContentRevisionConnectionResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ReviewContentRevisionConnection'] = ResolversParentTypes['ReviewContentRevisionConnection']> = ResolversObject<{
  edges?: Resolver<Array<ResolversTypes['ReviewContentRevisionEdge']>, ParentType, ContextType>;
  nodes?: Resolver<Array<ResolversTypes['ReviewContentRevision']>, ParentType, ContextType>;
  pageInfo?: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ReviewContentRevisionEdgeResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ReviewContentRevisionEdge'] = ResolversParentTypes['ReviewContentRevisionEdge']> = ResolversObject<{
  cursor?: Resolver<ResolversTypes['Cursor'], ParentType, ContextType>;
  node?: Resolver<ResolversTypes['ReviewContentRevision'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ReviewContentTranslationResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ReviewContentTranslation'] = ResolversParentTypes['ReviewContentTranslation']> = ResolversObject<{
  __resolveReference?: ReferenceResolver<Maybe<ResolversTypes['ReviewContentTranslation']>, { __typename: 'ReviewContentTranslation' } & GraphQLRecursivePick<ParentType, {"id":true}>, ContextType>;
  body?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  content?: Resolver<ResolversTypes['ReviewContent'], ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  locale?: Resolver<ResolversTypes['LocaleCode'], ParentType, ContextType>;
  revision?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  source?: Resolver<ResolversTypes['ReviewTranslationSource'], ParentType, ContextType>;
  status?: Resolver<ResolversTypes['ReviewContentStatus'], ParentType, ContextType>;
  title?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ReviewContentViewerCapabilitiesResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ReviewContentViewerCapabilities'] = ResolversParentTypes['ReviewContentViewerCapabilities']> = ResolversObject<{
  canDelete?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  canUpdate?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  editableUntil?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ReviewContentViewerEngagementResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ReviewContentViewerEngagement'] = ResolversParentTypes['ReviewContentViewerEngagement']> = ResolversObject<{
  hasReported?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  vote?: Resolver<Maybe<ResolversTypes['ReviewContentVoteType']>, ParentType, ContextType>;
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
  nodes?: Resolver<Array<ResolversTypes['ReviewContentVote']>, ParentType, ContextType>;
  pageInfo?: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ReviewContentVoteEdgeResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ReviewContentVoteEdge'] = ResolversParentTypes['ReviewContentVoteEdge']> = ResolversObject<{
  cursor?: Resolver<ResolversTypes['Cursor'], ParentType, ContextType>;
  node?: Resolver<ResolversTypes['ReviewContentVote'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ReviewContentVoteRemovePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ReviewContentVoteRemovePayload'] = ResolversParentTypes['ReviewContentVoteRemovePayload']> = ResolversObject<{
  content?: Resolver<Maybe<ResolversTypes['ReviewContent']>, ParentType, ContextType>;
  removedVoteId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['ReviewUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ReviewContentVoteSetPayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ReviewContentVoteSetPayload'] = ResolversParentTypes['ReviewContentVoteSetPayload']> = ResolversObject<{
  content?: Resolver<Maybe<ResolversTypes['ReviewContent']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['ReviewUserError']>, ParentType, ContextType>;
  vote?: Resolver<Maybe<ResolversTypes['ReviewContentVote']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ReviewCreatePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ReviewCreatePayload'] = ResolversParentTypes['ReviewCreatePayload']> = ResolversObject<{
  review?: Resolver<Maybe<ResolversTypes['Review']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['ReviewUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ReviewDeletePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ReviewDeletePayload'] = ResolversParentTypes['ReviewDeletePayload']> = ResolversObject<{
  deletedReviewId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['ReviewUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ReviewEdgeResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ReviewEdge'] = ResolversParentTypes['ReviewEdge']> = ResolversObject<{
  cursor?: Resolver<ResolversTypes['Cursor'], ParentType, ContextType>;
  node?: Resolver<ResolversTypes['Review'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ReviewMediaResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ReviewMedia'] = ResolversParentTypes['ReviewMedia']> = ResolversObject<{
  __resolveReference?: ReferenceResolver<Maybe<ResolversTypes['ReviewMedia']>, { __typename: 'ReviewMedia' } & GraphQLRecursivePick<ParentType, {"id":true}>, ContextType>;
  caption?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  media?: Resolver<ResolversTypes['Media'], ParentType, ContextType>;
  review?: Resolver<ResolversTypes['Review'], ParentType, ContextType>;
  sortIndex?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  status?: Resolver<ResolversTypes['ReviewContentStatus'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ReviewModerationCaseResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ReviewModerationCase'] = ResolversParentTypes['ReviewModerationCase']> = ResolversObject<{
  __resolveReference?: ReferenceResolver<Maybe<ResolversTypes['ReviewModerationCase']>, { __typename: 'ReviewModerationCase' } & GraphQLRecursivePick<ParentType, {"id":true}>, ContextType>;
  content?: Resolver<ResolversTypes['ReviewContent'], ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  dueAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  priority?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  reasonCode?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  resolutionCode?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  resolvedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  status?: Resolver<ResolversTypes['ReviewModerationCaseStatus'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ReviewModerationCaseConnectionResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ReviewModerationCaseConnection'] = ResolversParentTypes['ReviewModerationCaseConnection']> = ResolversObject<{
  edges?: Resolver<Array<ResolversTypes['ReviewModerationCaseEdge']>, ParentType, ContextType>;
  nodes?: Resolver<Array<ResolversTypes['ReviewModerationCase']>, ParentType, ContextType>;
  pageInfo?: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ReviewModerationCaseEdgeResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ReviewModerationCaseEdge'] = ResolversParentTypes['ReviewModerationCaseEdge']> = ResolversObject<{
  cursor?: Resolver<ResolversTypes['Cursor'], ParentType, ContextType>;
  node?: Resolver<ResolversTypes['ReviewModerationCase'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ReviewModerationEventResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ReviewModerationEvent'] = ResolversParentTypes['ReviewModerationEvent']> = ResolversObject<{
  __resolveReference?: ReferenceResolver<Maybe<ResolversTypes['ReviewModerationEvent']>, { __typename: 'ReviewModerationEvent' } & GraphQLRecursivePick<ParentType, {"id":true}>, ContextType>;
  action?: Resolver<ResolversTypes['ReviewModerationAction'], ParentType, ContextType>;
  content?: Resolver<ResolversTypes['ReviewContent'], ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  fromStatus?: Resolver<Maybe<ResolversTypes['ReviewContentStatus']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  isAutomated?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  moderationCase?: Resolver<Maybe<ResolversTypes['ReviewModerationCase']>, ParentType, ContextType>;
  reasonCode?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  toStatus?: Resolver<Maybe<ResolversTypes['ReviewContentStatus']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ReviewModerationEventConnectionResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ReviewModerationEventConnection'] = ResolversParentTypes['ReviewModerationEventConnection']> = ResolversObject<{
  edges?: Resolver<Array<ResolversTypes['ReviewModerationEventEdge']>, ParentType, ContextType>;
  nodes?: Resolver<Array<ResolversTypes['ReviewModerationEvent']>, ParentType, ContextType>;
  pageInfo?: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ReviewModerationEventEdgeResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ReviewModerationEventEdge'] = ResolversParentTypes['ReviewModerationEventEdge']> = ResolversObject<{
  cursor?: Resolver<ResolversTypes['Cursor'], ParentType, ContextType>;
  node?: Resolver<ResolversTypes['ReviewModerationEvent'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ReviewModerationSignalResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ReviewModerationSignal'] = ResolversParentTypes['ReviewModerationSignal']> = ResolversObject<{
  __resolveReference?: ReferenceResolver<Maybe<ResolversTypes['ReviewModerationSignal']>, { __typename: 'ReviewModerationSignal' } & GraphQLRecursivePick<ParentType, {"id":true}>, ContextType>;
  content?: Resolver<ResolversTypes['ReviewContent'], ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
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
  nodes?: Resolver<Array<ResolversTypes['ReviewModerationSignal']>, ParentType, ContextType>;
  pageInfo?: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ReviewModerationSignalEdgeResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ReviewModerationSignalEdge'] = ResolversParentTypes['ReviewModerationSignalEdge']> = ResolversObject<{
  cursor?: Resolver<ResolversTypes['Cursor'], ParentType, ContextType>;
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
  description?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  isActive?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  isRequired?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  sortIndex?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  title?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
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
  isRequired?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  sortIndex?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  target?: Resolver<ResolversTypes['ReviewRatingCriterionTarget'], ParentType, ContextType>;
  targetType?: Resolver<ResolversTypes['ReviewRatingCriterionTargetType'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ReviewRatingCriterionConnectionResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ReviewRatingCriterionConnection'] = ResolversParentTypes['ReviewRatingCriterionConnection']> = ResolversObject<{
  edges?: Resolver<Array<ResolversTypes['ReviewRatingCriterionEdge']>, ParentType, ContextType>;
  nodes?: Resolver<Array<ResolversTypes['ReviewRatingCriterion']>, ParentType, ContextType>;
  pageInfo?: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ReviewRatingCriterionEdgeResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ReviewRatingCriterionEdge'] = ResolversParentTypes['ReviewRatingCriterionEdge']> = ResolversObject<{
  cursor?: Resolver<ResolversTypes['Cursor'], ParentType, ContextType>;
  node?: Resolver<ResolversTypes['ReviewRatingCriterion'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ReviewRatingCriterionTargetResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ReviewRatingCriterionTarget'] = ResolversParentTypes['ReviewRatingCriterionTarget']> = ResolversObject<{
  __resolveType: TypeResolveFn<'Category' | 'Product', ParentType, ContextType>;
}>;

export type ReviewRatingCriterionTranslationResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ReviewRatingCriterionTranslation'] = ResolversParentTypes['ReviewRatingCriterionTranslation']> = ResolversObject<{
  description?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  locale?: Resolver<ResolversTypes['LocaleCode'], ParentType, ContextType>;
  title?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ReviewReplyResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ReviewReply'] = ResolversParentTypes['ReviewReply']> = ResolversObject<{
  __resolveReference?: ReferenceResolver<Maybe<ResolversTypes['ReviewReply']>, { __typename: 'ReviewReply' } & GraphQLRecursivePick<ParentType, {"id":true}>, ContextType>;
  author?: Resolver<ResolversTypes['ReviewContentAuthor'], ParentType, ContextType>;
  body?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  isOfficial?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  kind?: Resolver<ResolversTypes['ReviewContentKind'], ParentType, ContextType>;
  locale?: Resolver<ResolversTypes['LocaleCode'], ParentType, ContextType>;
  metrics?: Resolver<ResolversTypes['ReviewContentMetrics'], ParentType, ContextType>;
  publishedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  review?: Resolver<ResolversTypes['Review'], ParentType, ContextType>;
  revision?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  sortIndex?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  status?: Resolver<ResolversTypes['ReviewContentStatus'], ParentType, ContextType>;
  title?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  translations?: Resolver<Array<ResolversTypes['ReviewContentTranslation']>, ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  viewerCapabilities?: Resolver<ResolversTypes['ReviewContentViewerCapabilities'], ParentType, ContextType>;
  viewerEngagement?: Resolver<ResolversTypes['ReviewContentViewerEngagement'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ReviewReplyConnectionResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ReviewReplyConnection'] = ResolversParentTypes['ReviewReplyConnection']> = ResolversObject<{
  edges?: Resolver<Array<ResolversTypes['ReviewReplyEdge']>, ParentType, ContextType>;
  nodes?: Resolver<Array<ResolversTypes['ReviewReply']>, ParentType, ContextType>;
  pageInfo?: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ReviewReplyEdgeResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ReviewReplyEdge'] = ResolversParentTypes['ReviewReplyEdge']> = ResolversObject<{
  cursor?: Resolver<ResolversTypes['Cursor'], ParentType, ContextType>;
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
  locale?: Resolver<ResolversTypes['LocaleCode'], ParentType, ContextType>;
  openedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  product?: Resolver<ResolversTypes['Product'], ParentType, ContextType>;
  review?: Resolver<Maybe<ResolversTypes['Review']>, ParentType, ContextType>;
  scheduledAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  sentAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  status?: Resolver<ResolversTypes['ReviewRequestStatus'], ParentType, ContextType>;
  submittedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  variant?: Resolver<Maybe<ResolversTypes['ProductVariant']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ReviewRequestConnectionResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ReviewRequestConnection'] = ResolversParentTypes['ReviewRequestConnection']> = ResolversObject<{
  edges?: Resolver<Array<ResolversTypes['ReviewRequestEdge']>, ParentType, ContextType>;
  nodes?: Resolver<Array<ResolversTypes['ReviewRequest']>, ParentType, ContextType>;
  pageInfo?: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ReviewRequestEdgeResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ReviewRequestEdge'] = ResolversParentTypes['ReviewRequestEdge']> = ResolversObject<{
  cursor?: Resolver<ResolversTypes['Cursor'], ParentType, ContextType>;
  node?: Resolver<ResolversTypes['ReviewRequest'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ReviewRequestEventResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ReviewRequestEvent'] = ResolversParentTypes['ReviewRequestEvent']> = ResolversObject<{
  __resolveReference?: ReferenceResolver<Maybe<ResolversTypes['ReviewRequestEvent']>, { __typename: 'ReviewRequestEvent' } & GraphQLRecursivePick<ParentType, {"id":true}>, ContextType>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  occurredAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  reviewRequest?: Resolver<ResolversTypes['ReviewRequest'], ParentType, ContextType>;
  type?: Resolver<ResolversTypes['ReviewRequestEventType'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ReviewRequestEventConnectionResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ReviewRequestEventConnection'] = ResolversParentTypes['ReviewRequestEventConnection']> = ResolversObject<{
  edges?: Resolver<Array<ResolversTypes['ReviewRequestEventEdge']>, ParentType, ContextType>;
  nodes?: Resolver<Array<ResolversTypes['ReviewRequestEvent']>, ParentType, ContextType>;
  pageInfo?: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ReviewRequestEventEdgeResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ReviewRequestEventEdge'] = ResolversParentTypes['ReviewRequestEventEdge']> = ResolversObject<{
  cursor?: Resolver<ResolversTypes['Cursor'], ParentType, ContextType>;
  node?: Resolver<ResolversTypes['ReviewRequestEvent'], ParentType, ContextType>;
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

export type ReviewUpdatePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ReviewUpdatePayload'] = ResolversParentTypes['ReviewUpdatePayload']> = ResolversObject<{
  review?: Resolver<Maybe<ResolversTypes['Review']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['ReviewUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ReviewUserErrorResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ReviewUserError'] = ResolversParentTypes['ReviewUserError']> = ResolversObject<{
  code?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  field?: Resolver<Maybe<Array<ResolversTypes['String']>>, ParentType, ContextType>;
  message?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type RichTextResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['RichText'] = ResolversParentTypes['RichText']> = ResolversObject<{
  html?: Resolver<ResolversTypes['HTML'], ParentType, ContextType>;
  json?: Resolver<ResolversTypes['JSON'], ParentType, ContextType>;
  text?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
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

export type Resolvers<ContextType = ServiceContext> = ResolversObject<{
  Category?: CategoryResolvers<ContextType>;
  Color?: GraphQLScalarType;
  Connection?: ConnectionResolvers<ContextType>;
  Cursor?: GraphQLScalarType;
  Customer?: CustomerResolvers<ContextType>;
  DateTime?: GraphQLScalarType;
  Decimal?: GraphQLScalarType;
  Dimensions?: DimensionsResolvers<ContextType>;
  DisplayableError?: DisplayableErrorResolvers<ContextType>;
  Email?: GraphQLScalarType;
  HTML?: GraphQLScalarType;
  ISO8601DateTime?: GraphQLScalarType;
  JSON?: GraphQLScalarType;
  Media?: MediaResolvers<ContextType>;
  Money?: MoneyResolvers<ContextType>;
  Mutation?: MutationResolvers<ContextType>;
  Node?: NodeResolvers<ContextType>;
  PageInfo?: PageInfoResolvers<ContextType>;
  Product?: ProductResolvers<ContextType>;
  ProductQuestion?: ProductQuestionResolvers<ContextType>;
  ProductQuestionAnswer?: ProductQuestionAnswerResolvers<ContextType>;
  ProductQuestionAnswerConnection?: ProductQuestionAnswerConnectionResolvers<ContextType>;
  ProductQuestionAnswerCreatePayload?: ProductQuestionAnswerCreatePayloadResolvers<ContextType>;
  ProductQuestionAnswerDeletePayload?: ProductQuestionAnswerDeletePayloadResolvers<ContextType>;
  ProductQuestionAnswerEdge?: ProductQuestionAnswerEdgeResolvers<ContextType>;
  ProductQuestionAnswerUpdatePayload?: ProductQuestionAnswerUpdatePayloadResolvers<ContextType>;
  ProductQuestionConnection?: ProductQuestionConnectionResolvers<ContextType>;
  ProductQuestionCreatePayload?: ProductQuestionCreatePayloadResolvers<ContextType>;
  ProductQuestionDeletePayload?: ProductQuestionDeletePayloadResolvers<ContextType>;
  ProductQuestionEdge?: ProductQuestionEdgeResolvers<ContextType>;
  ProductQuestionSubscription?: ProductQuestionSubscriptionResolvers<ContextType>;
  ProductQuestionSubscriptionSetPayload?: ProductQuestionSubscriptionSetPayloadResolvers<ContextType>;
  ProductQuestionSummary?: ProductQuestionSummaryResolvers<ContextType>;
  ProductQuestionUpdatePayload?: ProductQuestionUpdatePayloadResolvers<ContextType>;
  ProductRatingCriterionSummary?: ProductRatingCriterionSummaryResolvers<ContextType>;
  ProductReviewSummary?: ProductReviewSummaryResolvers<ContextType>;
  ProductVariant?: ProductVariantResolvers<ContextType>;
  Query?: QueryResolvers<ContextType>;
  Review?: ReviewResolvers<ContextType>;
  ReviewConnection?: ReviewConnectionResolvers<ContextType>;
  ReviewContent?: ReviewContentResolvers<ContextType>;
  ReviewContentAuthor?: ReviewContentAuthorResolvers<ContextType>;
  ReviewContentConnection?: ReviewContentConnectionResolvers<ContextType>;
  ReviewContentEdge?: ReviewContentEdgeResolvers<ContextType>;
  ReviewContentExternalReference?: ReviewContentExternalReferenceResolvers<ContextType>;
  ReviewContentExternalReferenceConnection?: ReviewContentExternalReferenceConnectionResolvers<ContextType>;
  ReviewContentExternalReferenceEdge?: ReviewContentExternalReferenceEdgeResolvers<ContextType>;
  ReviewContentMetrics?: ReviewContentMetricsResolvers<ContextType>;
  ReviewContentPublication?: ReviewContentPublicationResolvers<ContextType>;
  ReviewContentReport?: ReviewContentReportResolvers<ContextType>;
  ReviewContentReportConnection?: ReviewContentReportConnectionResolvers<ContextType>;
  ReviewContentReportCreatePayload?: ReviewContentReportCreatePayloadResolvers<ContextType>;
  ReviewContentReportEdge?: ReviewContentReportEdgeResolvers<ContextType>;
  ReviewContentRevision?: ReviewContentRevisionResolvers<ContextType>;
  ReviewContentRevisionConnection?: ReviewContentRevisionConnectionResolvers<ContextType>;
  ReviewContentRevisionEdge?: ReviewContentRevisionEdgeResolvers<ContextType>;
  ReviewContentTranslation?: ReviewContentTranslationResolvers<ContextType>;
  ReviewContentViewerCapabilities?: ReviewContentViewerCapabilitiesResolvers<ContextType>;
  ReviewContentViewerEngagement?: ReviewContentViewerEngagementResolvers<ContextType>;
  ReviewContentVote?: ReviewContentVoteResolvers<ContextType>;
  ReviewContentVoteConnection?: ReviewContentVoteConnectionResolvers<ContextType>;
  ReviewContentVoteEdge?: ReviewContentVoteEdgeResolvers<ContextType>;
  ReviewContentVoteRemovePayload?: ReviewContentVoteRemovePayloadResolvers<ContextType>;
  ReviewContentVoteSetPayload?: ReviewContentVoteSetPayloadResolvers<ContextType>;
  ReviewCreatePayload?: ReviewCreatePayloadResolvers<ContextType>;
  ReviewDeletePayload?: ReviewDeletePayloadResolvers<ContextType>;
  ReviewEdge?: ReviewEdgeResolvers<ContextType>;
  ReviewMedia?: ReviewMediaResolvers<ContextType>;
  ReviewModerationCase?: ReviewModerationCaseResolvers<ContextType>;
  ReviewModerationCaseConnection?: ReviewModerationCaseConnectionResolvers<ContextType>;
  ReviewModerationCaseEdge?: ReviewModerationCaseEdgeResolvers<ContextType>;
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
  ReviewRatingCriterionEdge?: ReviewRatingCriterionEdgeResolvers<ContextType>;
  ReviewRatingCriterionTarget?: ReviewRatingCriterionTargetResolvers<ContextType>;
  ReviewRatingCriterionTranslation?: ReviewRatingCriterionTranslationResolvers<ContextType>;
  ReviewReply?: ReviewReplyResolvers<ContextType>;
  ReviewReplyConnection?: ReviewReplyConnectionResolvers<ContextType>;
  ReviewReplyEdge?: ReviewReplyEdgeResolvers<ContextType>;
  ReviewRequest?: ReviewRequestResolvers<ContextType>;
  ReviewRequestConnection?: ReviewRequestConnectionResolvers<ContextType>;
  ReviewRequestEdge?: ReviewRequestEdgeResolvers<ContextType>;
  ReviewRequestEvent?: ReviewRequestEventResolvers<ContextType>;
  ReviewRequestEventConnection?: ReviewRequestEventConnectionResolvers<ContextType>;
  ReviewRequestEventEdge?: ReviewRequestEventEdgeResolvers<ContextType>;
  ReviewStoreConfiguration?: ReviewStoreConfigurationResolvers<ContextType>;
  ReviewUpdatePayload?: ReviewUpdatePayloadResolvers<ContextType>;
  ReviewUserError?: ReviewUserErrorResolvers<ContextType>;
  RichText?: RichTextResolvers<ContextType>;
  URL?: GraphQLScalarType;
  UnsignedInt64?: GraphQLScalarType;
  UserError?: UserErrorResolvers<ContextType>;
  Weight?: WeightResolvers<ContextType>;
}>;

