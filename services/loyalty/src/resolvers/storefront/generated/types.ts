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
  Color: { input: any; output: any; }
  /** An opaque cursor used for pagination. */
  Cursor: { input: string; output: string; }
  /** An ISO 8601-encoded date and time string. */
  DateTime: { input: string; output: string; }
  /** An arbitrary-precision signed decimal number. */
  Decimal: { input: string; output: string; }
  /** An email address. */
  Email: { input: any; output: any; }
  /** A string containing HTML code. */
  HTML: { input: any; output: any; }
  /** An ISO 8601-encoded date and time string. */
  ISO8601DateTime: { input: any; output: any; }
  /** A JSON-serializable value. */
  JSON: { input: Record<string, unknown>; output: Record<string, unknown>; }
  /** An RFC 3986 and RFC 3987 compliant URI string. */
  URL: { input: any; output: any; }
  /** An unsigned 64-bit integer serialized as a decimal string. */
  UnsignedInt64: { input: string; output: string; }
  _FieldSet: { input: any; output: any; }
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
  /**
   * The authenticated customer's account in this store's active loyalty program.
   *
   * Returns null when the store has no active program or the customer has no
   * visible account. Merged accounts are never exposed.
   */
  loyaltyAccount?: Maybe<LoyaltyAccount>;
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

/**
 * The authenticated customer's account in the store's active loyalty program.
 *
 * The account is resolved only for the customer and store from the authenticated
 * request context. A Customer federation reference is not an authorization grant.
 */
export type LoyaltyAccount = {
  __typename?: 'LoyaltyAccount';
  /**
   * Issued rewards that the customer can currently use.
   *
   * Expired, revoked, redeemed, future, and otherwise unusable entitlements are
   * excluded by the server. The storefront must not reimplement entitlement state
   * or date checks.
   */
  availableRewards: LoyaltyAvailableRewardConnection;
  balance: LoyaltyBalance;
  id: Scalars['ID']['output'];
  /**
   * Server-ranked actions through which the current customer can earn or unlock a
   * loyalty reward. Values, eligibility, limits, localization, and ordering are
   * fully resolved for the active storefront context.
   */
  opportunities: LoyaltyAccountOpportunityPresentation;
  status: LoyaltyAccountStatus;
  tier?: Maybe<LoyaltyTier>;
  /**
   * Customer-visible balance changes, newest first. Internal bucket transfers,
   * reservations, releases, merges, and activation events are not returned.
   */
  transactions: LoyaltyTransactionConnection;
  /**
   * The nearest point expirations, ordered by expiresAt ascending.
   *
   * The projection contains at most 20 entries. Expirations with the same date may
   * be aggregated into one entry by the Loyalty service.
   */
  upcomingExpirations: Array<LoyaltyPointsExpiration>;
};


/**
 * The authenticated customer's account in the store's active loyalty program.
 *
 * The account is resolved only for the customer and store from the authenticated
 * request context. A Customer federation reference is not an authorization grant.
 */
export type LoyaltyAccountAvailableRewardsArgs = {
  after?: InputMaybe<Scalars['Cursor']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
};


/**
 * The authenticated customer's account in the store's active loyalty program.
 *
 * The account is resolved only for the customer and store from the authenticated
 * request context. A Customer federation reference is not an authorization grant.
 */
export type LoyaltyAccountTransactionsArgs = {
  after?: InputMaybe<Scalars['Cursor']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
};

/**
 * Account-level opportunities selected and ranked for the authenticated customer.
 * Product-scoped opportunities remain available through Product.loyalty.
 */
export type LoyaltyAccountOpportunityPresentation = {
  __typename?: 'LoyaltyAccountOpportunityPresentation';
  evaluatedAt: Scalars['DateTime']['output'];
  opportunities: Array<LoyaltyOpportunity>;
  primaryOpportunity?: Maybe<LoyaltyOpportunity>;
  revision: Scalars['String']['output'];
  validUntil?: Maybe<Scalars['DateTime']['output']>;
};

export enum LoyaltyAccountStatus {
  Active = 'ACTIVE',
  Closed = 'CLOSED',
  Suspended = 'SUSPENDED'
}

/** An issued reward that the current customer can use now. */
export type LoyaltyAvailableReward = Node & {
  __typename?: 'LoyaltyAvailableReward';
  id: Scalars['ID']['output'];
  issuedAt: Scalars['DateTime']['output'];
  /** Localized server-authored copy ready for an account or checkout surface. */
  presentation: LoyaltyOpportunityCopy;
  /**
   * Opaque revision used by a later reservation or redemption mutation owned by
   * Checkout. The storefront does not interpret it.
   */
  revision: Scalars['String']['output'];
  reward: LoyaltyRewardPresentation;
  validUntil?: Maybe<Scalars['DateTime']['output']>;
};

export type LoyaltyAvailableRewardConnection = Connection & {
  __typename?: 'LoyaltyAvailableRewardConnection';
  edges: Array<LoyaltyAvailableRewardEdge>;
  nodes: Array<LoyaltyAvailableReward>;
  pageInfo: PageInfo;
  totalCount: Scalars['Int']['output'];
};

export type LoyaltyAvailableRewardEdge = {
  __typename?: 'LoyaltyAvailableRewardEdge';
  cursor: Scalars['Cursor']['output'];
  node: LoyaltyAvailableReward;
};

/** The customer's current point balances. */
export type LoyaltyBalance = {
  __typename?: 'LoyaltyBalance';
  availablePoints: Scalars['UnsignedInt64']['output'];
  debtPoints: Scalars['UnsignedInt64']['output'];
  pendingPoints: Scalars['UnsignedInt64']['output'];
  reservedPoints: Scalars['UnsignedInt64']['output'];
};

export type LoyaltyFreeProductRewardPresentation = LoyaltyRewardPresentation & {
  __typename?: 'LoyaltyFreeProductRewardPresentation';
  copy: LoyaltyOpportunityCopy;
  kind: LoyaltyRewardKind;
  product: Product;
  quantity: Scalars['UnsignedInt64']['output'];
  variant?: Maybe<ProductVariant>;
};

export type LoyaltyFreeShippingRewardPresentation = LoyaltyRewardPresentation & {
  __typename?: 'LoyaltyFreeShippingRewardPresentation';
  copy: LoyaltyOpportunityCopy;
  kind: LoyaltyRewardKind;
};

export type LoyaltyMemberBenefitRewardPresentation = LoyaltyRewardPresentation & {
  __typename?: 'LoyaltyMemberBenefitRewardPresentation';
  code?: Maybe<Scalars['String']['output']>;
  copy: LoyaltyOpportunityCopy;
  kind: LoyaltyRewardKind;
};

/** Minimum and maximum monetary values in one storefront currency. */
export type LoyaltyMoneyRange = {
  __typename?: 'LoyaltyMoneyRange';
  maximum: Money;
  minimum: Money;
};

/** Cashback, store credit, or a fixed monetary discount. */
export type LoyaltyMoneyRewardPresentation = LoyaltyRewardPresentation & {
  __typename?: 'LoyaltyMoneyRewardPresentation';
  accuracy: LoyaltyValueAccuracy;
  amount: LoyaltyMoneyRange;
  copy: LoyaltyOpportunityCopy;
  kind: LoyaltyRewardKind;
};

/** A customer-visible action through which a loyalty reward can be obtained. */
export type LoyaltyOpportunity = {
  __typename?: 'LoyaltyOpportunity';
  /** Stable opaque key within the returned presentation revision. */
  key: Scalars['String']['output'];
  /** Localized, merchant-configurable copy ready for direct rendering. */
  presentation: LoyaltyOpportunityCopy;
  /**
   * Number of additional times the viewer can currently receive this reward.
   * Null means that no finite viewer limit applies or the viewer is anonymous.
   */
  remainingUses?: Maybe<Scalars['UnsignedInt64']['output']>;
  /** The fully calculated reward value. */
  reward: LoyaltyRewardPresentation;
  /**
   * Viewer-specific state calculated from authentication, prior events, limits,
   * budgets, account status, segments, tier, and schedule.
   */
  state: LoyaltyOpportunityState;
  /** The customer action represented by this opportunity. */
  type: LoyaltyOpportunityType;
  /** End of the currently evaluated rule or entitlement window. */
  validUntil?: Maybe<Scalars['DateTime']['output']>;
};

/** Localized server-authored copy for one opportunity or issued reward. */
export type LoyaltyOpportunityCopy = {
  __typename?: 'LoyaltyOpportunityCopy';
  /** Complete localized text for assistive technology. */
  accessibilityLabel: Scalars['String']['output'];
  /** Short text suitable for a product-card badge. */
  badge?: Maybe<Scalars['String']['output']>;
  /** Optional explanatory text for a detail surface. */
  description?: Maybe<Scalars['String']['output']>;
  /** Primary text, for example `Earn 300 points for a review`. */
  headline: Scalars['String']['output'];
  /** Already localized customer-facing terms selected by the server. */
  terms: Array<Scalars['String']['output']>;
};

/**
 * Presentation state, not a command authorization.
 *
 * The authoritative eligibility check is repeated when the underlying action is
 * accepted by its owning service.
 */
export enum LoyaltyOpportunityState {
  AuthenticationRequired = 'AUTHENTICATION_REQUIRED',
  Available = 'AVAILABLE',
  BudgetExhausted = 'BUDGET_EXHAUSTED',
  Completed = 'COMPLETED',
  LimitReached = 'LIMIT_REACHED'
}

export enum LoyaltyOpportunityType {
  Anniversary = 'ANNIVERSARY',
  Birthday = 'BIRTHDAY',
  Custom = 'CUSTOM',
  Login = 'LOGIN',
  Purchase = 'PURCHASE',
  Referral = 'REFERRAL',
  Review = 'REVIEW',
  Signup = 'SIGNUP',
  SubscriptionRenewal = 'SUBSCRIPTION_RENEWAL'
}

export type LoyaltyPercentageRewardPresentation = LoyaltyRewardPresentation & {
  __typename?: 'LoyaltyPercentageRewardPresentation';
  copy: LoyaltyOpportunityCopy;
  kind: LoyaltyRewardKind;
  /** Percentage expressed as a decimal value, for example `5` for five percent. */
  percentage: Scalars['Decimal']['output'];
};

/** Points scheduled to expire at the same time. */
export type LoyaltyPointsExpiration = {
  __typename?: 'LoyaltyPointsExpiration';
  expiresAt: Scalars['DateTime']['output'];
  points: Scalars['UnsignedInt64']['output'];
};

export type LoyaltyPointsRewardPresentation = LoyaltyRewardPresentation & {
  __typename?: 'LoyaltyPointsRewardPresentation';
  accuracy: LoyaltyValueAccuracy;
  copy: LoyaltyOpportunityCopy;
  kind: LoyaltyRewardKind;
  points: LoyaltyUnsignedRange;
};

export enum LoyaltyRewardKind {
  Cashback = 'CASHBACK',
  FixedDiscount = 'FIXED_DISCOUNT',
  FreeProduct = 'FREE_PRODUCT',
  FreeShipping = 'FREE_SHIPPING',
  MemberBenefit = 'MEMBER_BENEFIT',
  PercentageDiscount = 'PERCENTAGE_DISCOUNT',
  Points = 'POINTS',
  StoreCredit = 'STORE_CREDIT',
  Voucher = 'VOUCHER'
}

/**
 * A calculated reward value.
 *
 * All implementations expose common server-authored copy. Clients can render that
 * copy without inspecting the concrete reward type; typed fields are available for
 * richer native presentation and analytics.
 */
export type LoyaltyRewardPresentation = {
  copy: LoyaltyOpportunityCopy;
  kind: LoyaltyRewardKind;
};

/** The customer's current tier membership. */
export type LoyaltyTier = {
  __typename?: 'LoyaltyTier';
  code: Scalars['String']['output'];
  effectiveFrom: Scalars['DateTime']['output'];
  effectiveTo?: Maybe<Scalars['DateTime']['output']>;
  name: Scalars['String']['output'];
  rank: Scalars['Int']['output'];
};

/** A customer-visible balance change. */
export type LoyaltyTransaction = {
  __typename?: 'LoyaltyTransaction';
  description?: Maybe<Scalars['String']['output']>;
  direction: LoyaltyTransactionDirection;
  effectiveAt: Scalars['DateTime']['output'];
  expiresAt?: Maybe<Scalars['DateTime']['output']>;
  id: Scalars['ID']['output'];
  occurredAt: Scalars['DateTime']['output'];
  points: Scalars['UnsignedInt64']['output'];
  type: LoyaltyTransactionType;
};

export type LoyaltyTransactionConnection = Connection & {
  __typename?: 'LoyaltyTransactionConnection';
  edges: Array<LoyaltyTransactionEdge>;
  pageInfo: PageInfo;
  totalCount: Scalars['Int']['output'];
};

export enum LoyaltyTransactionDirection {
  Credit = 'CREDIT',
  Debit = 'DEBIT'
}

export type LoyaltyTransactionEdge = {
  __typename?: 'LoyaltyTransactionEdge';
  cursor: Scalars['Cursor']['output'];
  node: LoyaltyTransaction;
};

/** A stable customer-facing category rather than an internal ledger event kind. */
export enum LoyaltyTransactionType {
  Adjusted = 'ADJUSTED',
  Earned = 'EARNED',
  Expired = 'EXPIRED',
  Redeemed = 'REDEEMED',
  Refunded = 'REFUNDED'
}

/** Minimum and maximum unsigned values calculated by the server. */
export type LoyaltyUnsignedRange = {
  __typename?: 'LoyaltyUnsignedRange';
  maximum: Scalars['UnsignedInt64']['output'];
  minimum: Scalars['UnsignedInt64']['output'];
};

export enum LoyaltyValueAccuracy {
  /** The value can change after cart, Pricing, or final eligibility evaluation. */
  Estimated = 'ESTIMATED',
  /** The value cannot change for the evaluated subject and context. */
  Exact = 'EXACT'
}

export type LoyaltyVoucherRewardPresentation = LoyaltyRewardPresentation & {
  __typename?: 'LoyaltyVoucherRewardPresentation';
  /**
   * Customer-visible voucher code. Null for an opportunity that has not yet issued
   * an entitlement.
   */
  code?: Maybe<Scalars['String']['output']>;
  copy: LoyaltyOpportunityCopy;
  kind: LoyaltyRewardKind;
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
  endCursor?: Maybe<Scalars['Cursor']['output']>;
  hasNextPage: Scalars['Boolean']['output'];
  hasPreviousPage: Scalars['Boolean']['output'];
  startCursor?: Maybe<Scalars['Cursor']['output']>;
};

export type Product = {
  __typename?: 'Product';
  id: Scalars['ID']['output'];
  /**
   * Loyalty values ready for rendering on a product card or product page.
   *
   * Purchase values use a quantity of one and span the currently purchasable
   * variants. The server batches resolution across products in a listing. Null
   * means that the store has no active customer-visible loyalty presentation.
   */
  loyalty?: Maybe<ProductLoyaltyPresentation>;
};

/**
 * Complete loyalty presentation for one product or variant in the current
 * storefront viewer context.
 *
 * An empty opportunities list means that nothing should be shown. The storefront
 * must not infer hidden or ineligible rules from the empty result.
 */
export type ProductLoyaltyPresentation = {
  __typename?: 'ProductLoyaltyPresentation';
  /** Server-ranked non-purchase rewards such as a verified-review reward. */
  engagementOpportunities: Array<LoyaltyOpportunity>;
  /** When this complete presentation snapshot was calculated. */
  evaluatedAt: Scalars['DateTime']['output'];
  /**
   * The single opportunity selected by server-side priority for compact surfaces.
   *
   * Null means that the product card should not render a loyalty badge. The client
   * must not select or rank another opportunity itself.
   */
  primaryOpportunity?: Maybe<LoyaltyOpportunity>;
  /** Server-ranked purchase rewards applicable to this product or variant. */
  purchaseOpportunities: Array<LoyaltyOpportunity>;
  /**
   * The purchase opportunity selected by the server for a standard product-price
   * or add-to-cart surface. Null means no purchase reward should be displayed.
   */
  purchaseOpportunity?: Maybe<LoyaltyOpportunity>;
  /**
   * The review opportunity selected by the server for the product review surface.
   * Null means no review reward should be displayed.
   */
  reviewOpportunity?: Maybe<LoyaltyOpportunity>;
  /** Opaque revision suitable for response caching and diagnostics. */
  revision: Scalars['String']['output'];
  /**
   * Earliest time at which a schedule, price, customer state, usage limit, or
   * program version can invalidate this snapshot. Null means no known time-based
   * invalidation; normal server cache policy still applies.
   */
  validUntil?: Maybe<Scalars['DateTime']['output']>;
};

export type ProductVariant = {
  __typename?: 'ProductVariant';
  id: Scalars['ID']['output'];
  /**
   * Loyalty values ready for rendering for this variant at quantity one. Null
   * means that the store has no active customer-visible loyalty presentation.
   */
  loyalty?: Maybe<ProductLoyaltyPresentation>;
};

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
  field?: Maybe<Array<Scalars['String']['output']>>;
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


/** Mapping of interface types */
export type ResolversInterfaceTypes<_RefType extends Record<string, unknown>> = ResolversObject<{
  Connection: ( Omit<LoyaltyAvailableRewardConnection, 'edges' | 'nodes'> & { edges: Array<_RefType['LoyaltyAvailableRewardEdge']>, nodes: Array<_RefType['LoyaltyAvailableReward']> } ) | ( LoyaltyTransactionConnection );
  DisplayableError: ( UserError );
  LoyaltyRewardPresentation: ( Omit<LoyaltyFreeProductRewardPresentation, 'copy' | 'product' | 'variant'> & { copy: _RefType['LoyaltyOpportunityCopy'], product: _RefType['Product'], variant?: Maybe<_RefType['ProductVariant']> } ) | ( Omit<LoyaltyFreeShippingRewardPresentation, 'copy'> & { copy: _RefType['LoyaltyOpportunityCopy'] } ) | ( Omit<LoyaltyMemberBenefitRewardPresentation, 'copy'> & { copy: _RefType['LoyaltyOpportunityCopy'] } ) | ( Omit<LoyaltyMoneyRewardPresentation, 'copy'> & { copy: _RefType['LoyaltyOpportunityCopy'] } ) | ( Omit<LoyaltyPercentageRewardPresentation, 'copy'> & { copy: _RefType['LoyaltyOpportunityCopy'] } ) | ( Omit<LoyaltyPointsRewardPresentation, 'copy'> & { copy: _RefType['LoyaltyOpportunityCopy'] } ) | ( Omit<LoyaltyVoucherRewardPresentation, 'copy'> & { copy: _RefType['LoyaltyOpportunityCopy'] } );
  Node: ( Omit<LoyaltyAvailableReward, 'presentation' | 'reward'> & { presentation: _RefType['LoyaltyOpportunityCopy'], reward: _RefType['LoyaltyRewardPresentation'] } );
}>;

/** Mapping between all available schema types and the resolvers types */
export type ResolversTypes = ResolversObject<{
  Color: ResolverTypeWrapper<Scalars['Color']['output']>;
  Connection: ResolverTypeWrapper<ResolversInterfaceTypes<ResolversTypes>['Connection']>;
  Int: ResolverTypeWrapper<Scalars['Int']['output']>;
  CountryCode: CountryCode;
  CurrencyCode: CurrencyCode;
  Cursor: ResolverTypeWrapper<Scalars['Cursor']['output']>;
  Customer: ResolverTypeWrapper<Omit<Customer, 'loyaltyAccount'> & { loyaltyAccount?: Maybe<ResolversTypes['LoyaltyAccount']> }>;
  ID: ResolverTypeWrapper<Scalars['ID']['output']>;
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
  LoyaltyAccount: ResolverTypeWrapper<Omit<LoyaltyAccount, 'availableRewards' | 'opportunities'> & { availableRewards: ResolversTypes['LoyaltyAvailableRewardConnection'], opportunities: ResolversTypes['LoyaltyAccountOpportunityPresentation'] }>;
  LoyaltyAccountOpportunityPresentation: ResolverTypeWrapper<Omit<LoyaltyAccountOpportunityPresentation, 'opportunities' | 'primaryOpportunity'> & { opportunities: Array<ResolversTypes['LoyaltyOpportunity']>, primaryOpportunity?: Maybe<ResolversTypes['LoyaltyOpportunity']> }>;
  LoyaltyAccountStatus: LoyaltyAccountStatus;
  LoyaltyAvailableReward: ResolverTypeWrapper<Omit<LoyaltyAvailableReward, 'presentation' | 'reward'> & { presentation: ResolversTypes['LoyaltyOpportunityCopy'], reward: ResolversTypes['LoyaltyRewardPresentation'] }>;
  LoyaltyAvailableRewardConnection: ResolverTypeWrapper<Omit<LoyaltyAvailableRewardConnection, 'edges' | 'nodes'> & { edges: Array<ResolversTypes['LoyaltyAvailableRewardEdge']>, nodes: Array<ResolversTypes['LoyaltyAvailableReward']> }>;
  LoyaltyAvailableRewardEdge: ResolverTypeWrapper<Omit<LoyaltyAvailableRewardEdge, 'node'> & { node: ResolversTypes['LoyaltyAvailableReward'] }>;
  LoyaltyBalance: ResolverTypeWrapper<LoyaltyBalance>;
  LoyaltyFreeProductRewardPresentation: ResolverTypeWrapper<Omit<LoyaltyFreeProductRewardPresentation, 'copy' | 'product' | 'variant'> & { copy: ResolversTypes['LoyaltyOpportunityCopy'], product: ResolversTypes['Product'], variant?: Maybe<ResolversTypes['ProductVariant']> }>;
  LoyaltyFreeShippingRewardPresentation: ResolverTypeWrapper<Omit<LoyaltyFreeShippingRewardPresentation, 'copy'> & { copy: ResolversTypes['LoyaltyOpportunityCopy'] }>;
  LoyaltyMemberBenefitRewardPresentation: ResolverTypeWrapper<Omit<LoyaltyMemberBenefitRewardPresentation, 'copy'> & { copy: ResolversTypes['LoyaltyOpportunityCopy'] }>;
  LoyaltyMoneyRange: ResolverTypeWrapper<LoyaltyMoneyRange>;
  LoyaltyMoneyRewardPresentation: ResolverTypeWrapper<Omit<LoyaltyMoneyRewardPresentation, 'copy'> & { copy: ResolversTypes['LoyaltyOpportunityCopy'] }>;
  LoyaltyOpportunity: ResolverTypeWrapper<Omit<LoyaltyOpportunity, 'presentation' | 'reward'> & { presentation: ResolversTypes['LoyaltyOpportunityCopy'], reward: ResolversTypes['LoyaltyRewardPresentation'] }>;
  LoyaltyOpportunityCopy: ResolverTypeWrapper<LoyaltyOpportunityCopy>;
  LoyaltyOpportunityState: LoyaltyOpportunityState;
  LoyaltyOpportunityType: LoyaltyOpportunityType;
  LoyaltyPercentageRewardPresentation: ResolverTypeWrapper<Omit<LoyaltyPercentageRewardPresentation, 'copy'> & { copy: ResolversTypes['LoyaltyOpportunityCopy'] }>;
  LoyaltyPointsExpiration: ResolverTypeWrapper<LoyaltyPointsExpiration>;
  LoyaltyPointsRewardPresentation: ResolverTypeWrapper<Omit<LoyaltyPointsRewardPresentation, 'copy'> & { copy: ResolversTypes['LoyaltyOpportunityCopy'] }>;
  LoyaltyRewardKind: LoyaltyRewardKind;
  LoyaltyRewardPresentation: ResolverTypeWrapper<ResolversInterfaceTypes<ResolversTypes>['LoyaltyRewardPresentation']>;
  LoyaltyTier: ResolverTypeWrapper<LoyaltyTier>;
  LoyaltyTransaction: ResolverTypeWrapper<LoyaltyTransaction>;
  LoyaltyTransactionConnection: ResolverTypeWrapper<LoyaltyTransactionConnection>;
  LoyaltyTransactionDirection: LoyaltyTransactionDirection;
  LoyaltyTransactionEdge: ResolverTypeWrapper<LoyaltyTransactionEdge>;
  LoyaltyTransactionType: LoyaltyTransactionType;
  LoyaltyUnsignedRange: ResolverTypeWrapper<LoyaltyUnsignedRange>;
  LoyaltyValueAccuracy: LoyaltyValueAccuracy;
  LoyaltyVoucherRewardPresentation: ResolverTypeWrapper<Omit<LoyaltyVoucherRewardPresentation, 'copy'> & { copy: ResolversTypes['LoyaltyOpportunityCopy'] }>;
  Money: ResolverTypeWrapper<Money>;
  Node: ResolverTypeWrapper<ResolversInterfaceTypes<ResolversTypes>['Node']>;
  PageInfo: ResolverTypeWrapper<PageInfo>;
  Boolean: ResolverTypeWrapper<Scalars['Boolean']['output']>;
  Product: ResolverTypeWrapper<Omit<Product, 'loyalty'> & { loyalty?: Maybe<ResolversTypes['ProductLoyaltyPresentation']> }>;
  ProductLoyaltyPresentation: ResolverTypeWrapper<Omit<ProductLoyaltyPresentation, 'engagementOpportunities' | 'primaryOpportunity' | 'purchaseOpportunities' | 'purchaseOpportunity' | 'reviewOpportunity'> & { engagementOpportunities: Array<ResolversTypes['LoyaltyOpportunity']>, primaryOpportunity?: Maybe<ResolversTypes['LoyaltyOpportunity']>, purchaseOpportunities: Array<ResolversTypes['LoyaltyOpportunity']>, purchaseOpportunity?: Maybe<ResolversTypes['LoyaltyOpportunity']>, reviewOpportunity?: Maybe<ResolversTypes['LoyaltyOpportunity']> }>;
  ProductVariant: ResolverTypeWrapper<Omit<ProductVariant, 'loyalty'> & { loyalty?: Maybe<ResolversTypes['ProductLoyaltyPresentation']> }>;
  RichText: ResolverTypeWrapper<RichText>;
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
  Cursor: Scalars['Cursor']['output'];
  Customer: Omit<Customer, 'loyaltyAccount'> & { loyaltyAccount?: Maybe<ResolversParentTypes['LoyaltyAccount']> };
  ID: Scalars['ID']['output'];
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
  LoyaltyAccount: Omit<LoyaltyAccount, 'availableRewards' | 'opportunities'> & { availableRewards: ResolversParentTypes['LoyaltyAvailableRewardConnection'], opportunities: ResolversParentTypes['LoyaltyAccountOpportunityPresentation'] };
  LoyaltyAccountOpportunityPresentation: Omit<LoyaltyAccountOpportunityPresentation, 'opportunities' | 'primaryOpportunity'> & { opportunities: Array<ResolversParentTypes['LoyaltyOpportunity']>, primaryOpportunity?: Maybe<ResolversParentTypes['LoyaltyOpportunity']> };
  LoyaltyAvailableReward: Omit<LoyaltyAvailableReward, 'presentation' | 'reward'> & { presentation: ResolversParentTypes['LoyaltyOpportunityCopy'], reward: ResolversParentTypes['LoyaltyRewardPresentation'] };
  LoyaltyAvailableRewardConnection: Omit<LoyaltyAvailableRewardConnection, 'edges' | 'nodes'> & { edges: Array<ResolversParentTypes['LoyaltyAvailableRewardEdge']>, nodes: Array<ResolversParentTypes['LoyaltyAvailableReward']> };
  LoyaltyAvailableRewardEdge: Omit<LoyaltyAvailableRewardEdge, 'node'> & { node: ResolversParentTypes['LoyaltyAvailableReward'] };
  LoyaltyBalance: LoyaltyBalance;
  LoyaltyFreeProductRewardPresentation: Omit<LoyaltyFreeProductRewardPresentation, 'copy' | 'product' | 'variant'> & { copy: ResolversParentTypes['LoyaltyOpportunityCopy'], product: ResolversParentTypes['Product'], variant?: Maybe<ResolversParentTypes['ProductVariant']> };
  LoyaltyFreeShippingRewardPresentation: Omit<LoyaltyFreeShippingRewardPresentation, 'copy'> & { copy: ResolversParentTypes['LoyaltyOpportunityCopy'] };
  LoyaltyMemberBenefitRewardPresentation: Omit<LoyaltyMemberBenefitRewardPresentation, 'copy'> & { copy: ResolversParentTypes['LoyaltyOpportunityCopy'] };
  LoyaltyMoneyRange: LoyaltyMoneyRange;
  LoyaltyMoneyRewardPresentation: Omit<LoyaltyMoneyRewardPresentation, 'copy'> & { copy: ResolversParentTypes['LoyaltyOpportunityCopy'] };
  LoyaltyOpportunity: Omit<LoyaltyOpportunity, 'presentation' | 'reward'> & { presentation: ResolversParentTypes['LoyaltyOpportunityCopy'], reward: ResolversParentTypes['LoyaltyRewardPresentation'] };
  LoyaltyOpportunityCopy: LoyaltyOpportunityCopy;
  LoyaltyPercentageRewardPresentation: Omit<LoyaltyPercentageRewardPresentation, 'copy'> & { copy: ResolversParentTypes['LoyaltyOpportunityCopy'] };
  LoyaltyPointsExpiration: LoyaltyPointsExpiration;
  LoyaltyPointsRewardPresentation: Omit<LoyaltyPointsRewardPresentation, 'copy'> & { copy: ResolversParentTypes['LoyaltyOpportunityCopy'] };
  LoyaltyRewardPresentation: ResolversInterfaceTypes<ResolversParentTypes>['LoyaltyRewardPresentation'];
  LoyaltyTier: LoyaltyTier;
  LoyaltyTransaction: LoyaltyTransaction;
  LoyaltyTransactionConnection: LoyaltyTransactionConnection;
  LoyaltyTransactionEdge: LoyaltyTransactionEdge;
  LoyaltyUnsignedRange: LoyaltyUnsignedRange;
  LoyaltyVoucherRewardPresentation: Omit<LoyaltyVoucherRewardPresentation, 'copy'> & { copy: ResolversParentTypes['LoyaltyOpportunityCopy'] };
  Money: Money;
  Node: ResolversInterfaceTypes<ResolversParentTypes>['Node'];
  PageInfo: PageInfo;
  Boolean: Scalars['Boolean']['output'];
  Product: Omit<Product, 'loyalty'> & { loyalty?: Maybe<ResolversParentTypes['ProductLoyaltyPresentation']> };
  ProductLoyaltyPresentation: Omit<ProductLoyaltyPresentation, 'engagementOpportunities' | 'primaryOpportunity' | 'purchaseOpportunities' | 'purchaseOpportunity' | 'reviewOpportunity'> & { engagementOpportunities: Array<ResolversParentTypes['LoyaltyOpportunity']>, primaryOpportunity?: Maybe<ResolversParentTypes['LoyaltyOpportunity']>, purchaseOpportunities: Array<ResolversParentTypes['LoyaltyOpportunity']>, purchaseOpportunity?: Maybe<ResolversParentTypes['LoyaltyOpportunity']>, reviewOpportunity?: Maybe<ResolversParentTypes['LoyaltyOpportunity']> };
  ProductVariant: Omit<ProductVariant, 'loyalty'> & { loyalty?: Maybe<ResolversParentTypes['ProductLoyaltyPresentation']> };
  RichText: RichText;
  URL: Scalars['URL']['output'];
  UnsignedInt64: Scalars['UnsignedInt64']['output'];
  UserError: UserError;
  Weight: Weight;
}>;

export interface ColorScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['Color'], any> {
  name: 'Color';
}

export type ConnectionResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['Connection'] = ResolversParentTypes['Connection']> = ResolversObject<{
  __resolveType: TypeResolveFn<'LoyaltyAvailableRewardConnection' | 'LoyaltyTransactionConnection', ParentType, ContextType>;
  pageInfo?: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
}>;

export interface CursorScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['Cursor'], any> {
  name: 'Cursor';
}

export type CustomerResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['Customer'] = ResolversParentTypes['Customer']> = ResolversObject<{
  __resolveReference?: ReferenceResolver<Maybe<ResolversTypes['Customer']>, { __typename: 'Customer' } & GraphQLRecursivePick<ParentType, {"id":true}>, ContextType>;

  loyaltyAccount?: Resolver<Maybe<ResolversTypes['LoyaltyAccount']>, { __typename: 'Customer' } & GraphQLRecursivePick<ParentType, {"id":true}>, ContextType>;
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

export type LoyaltyAccountResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['LoyaltyAccount'] = ResolversParentTypes['LoyaltyAccount']> = ResolversObject<{
  availableRewards?: Resolver<ResolversTypes['LoyaltyAvailableRewardConnection'], ParentType, ContextType, RequireFields<LoyaltyAccountAvailableRewardsArgs, 'first'>>;
  balance?: Resolver<ResolversTypes['LoyaltyBalance'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  opportunities?: Resolver<ResolversTypes['LoyaltyAccountOpportunityPresentation'], ParentType, ContextType>;
  status?: Resolver<ResolversTypes['LoyaltyAccountStatus'], ParentType, ContextType>;
  tier?: Resolver<Maybe<ResolversTypes['LoyaltyTier']>, ParentType, ContextType>;
  transactions?: Resolver<ResolversTypes['LoyaltyTransactionConnection'], ParentType, ContextType, RequireFields<LoyaltyAccountTransactionsArgs, 'first'>>;
  upcomingExpirations?: Resolver<Array<ResolversTypes['LoyaltyPointsExpiration']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type LoyaltyAccountOpportunityPresentationResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['LoyaltyAccountOpportunityPresentation'] = ResolversParentTypes['LoyaltyAccountOpportunityPresentation']> = ResolversObject<{
  evaluatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  opportunities?: Resolver<Array<ResolversTypes['LoyaltyOpportunity']>, ParentType, ContextType>;
  primaryOpportunity?: Resolver<Maybe<ResolversTypes['LoyaltyOpportunity']>, ParentType, ContextType>;
  revision?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  validUntil?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type LoyaltyAvailableRewardResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['LoyaltyAvailableReward'] = ResolversParentTypes['LoyaltyAvailableReward']> = ResolversObject<{
  __resolveReference?: ReferenceResolver<Maybe<ResolversTypes['LoyaltyAvailableReward']>, { __typename: 'LoyaltyAvailableReward' } & GraphQLRecursivePick<ParentType, {"id":true}>, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  issuedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  presentation?: Resolver<ResolversTypes['LoyaltyOpportunityCopy'], ParentType, ContextType>;
  revision?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  reward?: Resolver<ResolversTypes['LoyaltyRewardPresentation'], ParentType, ContextType>;
  validUntil?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type LoyaltyAvailableRewardConnectionResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['LoyaltyAvailableRewardConnection'] = ResolversParentTypes['LoyaltyAvailableRewardConnection']> = ResolversObject<{
  edges?: Resolver<Array<ResolversTypes['LoyaltyAvailableRewardEdge']>, ParentType, ContextType>;
  nodes?: Resolver<Array<ResolversTypes['LoyaltyAvailableReward']>, ParentType, ContextType>;
  pageInfo?: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type LoyaltyAvailableRewardEdgeResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['LoyaltyAvailableRewardEdge'] = ResolversParentTypes['LoyaltyAvailableRewardEdge']> = ResolversObject<{
  cursor?: Resolver<ResolversTypes['Cursor'], ParentType, ContextType>;
  node?: Resolver<ResolversTypes['LoyaltyAvailableReward'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type LoyaltyBalanceResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['LoyaltyBalance'] = ResolversParentTypes['LoyaltyBalance']> = ResolversObject<{
  availablePoints?: Resolver<ResolversTypes['UnsignedInt64'], ParentType, ContextType>;
  debtPoints?: Resolver<ResolversTypes['UnsignedInt64'], ParentType, ContextType>;
  pendingPoints?: Resolver<ResolversTypes['UnsignedInt64'], ParentType, ContextType>;
  reservedPoints?: Resolver<ResolversTypes['UnsignedInt64'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type LoyaltyFreeProductRewardPresentationResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['LoyaltyFreeProductRewardPresentation'] = ResolversParentTypes['LoyaltyFreeProductRewardPresentation']> = ResolversObject<{
  copy?: Resolver<ResolversTypes['LoyaltyOpportunityCopy'], ParentType, ContextType>;
  kind?: Resolver<ResolversTypes['LoyaltyRewardKind'], ParentType, ContextType>;
  product?: Resolver<ResolversTypes['Product'], ParentType, ContextType>;
  quantity?: Resolver<ResolversTypes['UnsignedInt64'], ParentType, ContextType>;
  variant?: Resolver<Maybe<ResolversTypes['ProductVariant']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type LoyaltyFreeShippingRewardPresentationResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['LoyaltyFreeShippingRewardPresentation'] = ResolversParentTypes['LoyaltyFreeShippingRewardPresentation']> = ResolversObject<{
  copy?: Resolver<ResolversTypes['LoyaltyOpportunityCopy'], ParentType, ContextType>;
  kind?: Resolver<ResolversTypes['LoyaltyRewardKind'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type LoyaltyMemberBenefitRewardPresentationResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['LoyaltyMemberBenefitRewardPresentation'] = ResolversParentTypes['LoyaltyMemberBenefitRewardPresentation']> = ResolversObject<{
  code?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  copy?: Resolver<ResolversTypes['LoyaltyOpportunityCopy'], ParentType, ContextType>;
  kind?: Resolver<ResolversTypes['LoyaltyRewardKind'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type LoyaltyMoneyRangeResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['LoyaltyMoneyRange'] = ResolversParentTypes['LoyaltyMoneyRange']> = ResolversObject<{
  maximum?: Resolver<ResolversTypes['Money'], ParentType, ContextType>;
  minimum?: Resolver<ResolversTypes['Money'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type LoyaltyMoneyRewardPresentationResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['LoyaltyMoneyRewardPresentation'] = ResolversParentTypes['LoyaltyMoneyRewardPresentation']> = ResolversObject<{
  accuracy?: Resolver<ResolversTypes['LoyaltyValueAccuracy'], ParentType, ContextType>;
  amount?: Resolver<ResolversTypes['LoyaltyMoneyRange'], ParentType, ContextType>;
  copy?: Resolver<ResolversTypes['LoyaltyOpportunityCopy'], ParentType, ContextType>;
  kind?: Resolver<ResolversTypes['LoyaltyRewardKind'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type LoyaltyOpportunityResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['LoyaltyOpportunity'] = ResolversParentTypes['LoyaltyOpportunity']> = ResolversObject<{
  key?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  presentation?: Resolver<ResolversTypes['LoyaltyOpportunityCopy'], ParentType, ContextType>;
  remainingUses?: Resolver<Maybe<ResolversTypes['UnsignedInt64']>, ParentType, ContextType>;
  reward?: Resolver<ResolversTypes['LoyaltyRewardPresentation'], ParentType, ContextType>;
  state?: Resolver<ResolversTypes['LoyaltyOpportunityState'], ParentType, ContextType>;
  type?: Resolver<ResolversTypes['LoyaltyOpportunityType'], ParentType, ContextType>;
  validUntil?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type LoyaltyOpportunityCopyResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['LoyaltyOpportunityCopy'] = ResolversParentTypes['LoyaltyOpportunityCopy']> = ResolversObject<{
  accessibilityLabel?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  badge?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  description?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  headline?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  terms?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type LoyaltyPercentageRewardPresentationResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['LoyaltyPercentageRewardPresentation'] = ResolversParentTypes['LoyaltyPercentageRewardPresentation']> = ResolversObject<{
  copy?: Resolver<ResolversTypes['LoyaltyOpportunityCopy'], ParentType, ContextType>;
  kind?: Resolver<ResolversTypes['LoyaltyRewardKind'], ParentType, ContextType>;
  percentage?: Resolver<ResolversTypes['Decimal'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type LoyaltyPointsExpirationResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['LoyaltyPointsExpiration'] = ResolversParentTypes['LoyaltyPointsExpiration']> = ResolversObject<{
  expiresAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  points?: Resolver<ResolversTypes['UnsignedInt64'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type LoyaltyPointsRewardPresentationResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['LoyaltyPointsRewardPresentation'] = ResolversParentTypes['LoyaltyPointsRewardPresentation']> = ResolversObject<{
  accuracy?: Resolver<ResolversTypes['LoyaltyValueAccuracy'], ParentType, ContextType>;
  copy?: Resolver<ResolversTypes['LoyaltyOpportunityCopy'], ParentType, ContextType>;
  kind?: Resolver<ResolversTypes['LoyaltyRewardKind'], ParentType, ContextType>;
  points?: Resolver<ResolversTypes['LoyaltyUnsignedRange'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type LoyaltyRewardPresentationResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['LoyaltyRewardPresentation'] = ResolversParentTypes['LoyaltyRewardPresentation']> = ResolversObject<{
  __resolveType: TypeResolveFn<'LoyaltyFreeProductRewardPresentation' | 'LoyaltyFreeShippingRewardPresentation' | 'LoyaltyMemberBenefitRewardPresentation' | 'LoyaltyMoneyRewardPresentation' | 'LoyaltyPercentageRewardPresentation' | 'LoyaltyPointsRewardPresentation' | 'LoyaltyVoucherRewardPresentation', ParentType, ContextType>;
  copy?: Resolver<ResolversTypes['LoyaltyOpportunityCopy'], ParentType, ContextType>;
  kind?: Resolver<ResolversTypes['LoyaltyRewardKind'], ParentType, ContextType>;
}>;

export type LoyaltyTierResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['LoyaltyTier'] = ResolversParentTypes['LoyaltyTier']> = ResolversObject<{
  code?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  effectiveFrom?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  effectiveTo?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  rank?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type LoyaltyTransactionResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['LoyaltyTransaction'] = ResolversParentTypes['LoyaltyTransaction']> = ResolversObject<{
  description?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  direction?: Resolver<ResolversTypes['LoyaltyTransactionDirection'], ParentType, ContextType>;
  effectiveAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  expiresAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  occurredAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  points?: Resolver<ResolversTypes['UnsignedInt64'], ParentType, ContextType>;
  type?: Resolver<ResolversTypes['LoyaltyTransactionType'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type LoyaltyTransactionConnectionResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['LoyaltyTransactionConnection'] = ResolversParentTypes['LoyaltyTransactionConnection']> = ResolversObject<{
  edges?: Resolver<Array<ResolversTypes['LoyaltyTransactionEdge']>, ParentType, ContextType>;
  pageInfo?: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type LoyaltyTransactionEdgeResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['LoyaltyTransactionEdge'] = ResolversParentTypes['LoyaltyTransactionEdge']> = ResolversObject<{
  cursor?: Resolver<ResolversTypes['Cursor'], ParentType, ContextType>;
  node?: Resolver<ResolversTypes['LoyaltyTransaction'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type LoyaltyUnsignedRangeResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['LoyaltyUnsignedRange'] = ResolversParentTypes['LoyaltyUnsignedRange']> = ResolversObject<{
  maximum?: Resolver<ResolversTypes['UnsignedInt64'], ParentType, ContextType>;
  minimum?: Resolver<ResolversTypes['UnsignedInt64'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type LoyaltyVoucherRewardPresentationResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['LoyaltyVoucherRewardPresentation'] = ResolversParentTypes['LoyaltyVoucherRewardPresentation']> = ResolversObject<{
  code?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  copy?: Resolver<ResolversTypes['LoyaltyOpportunityCopy'], ParentType, ContextType>;
  kind?: Resolver<ResolversTypes['LoyaltyRewardKind'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type MoneyResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['Money'] = ResolversParentTypes['Money']> = ResolversObject<{
  amount?: Resolver<ResolversTypes['Decimal'], ParentType, ContextType>;
  currencyCode?: Resolver<ResolversTypes['CurrencyCode'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type NodeResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['Node'] = ResolversParentTypes['Node']> = ResolversObject<{
  __resolveType: TypeResolveFn<'LoyaltyAvailableReward', ParentType, ContextType>;
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

  loyalty?: Resolver<Maybe<ResolversTypes['ProductLoyaltyPresentation']>, { __typename: 'Product' } & GraphQLRecursivePick<ParentType, {"id":true}>, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ProductLoyaltyPresentationResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ProductLoyaltyPresentation'] = ResolversParentTypes['ProductLoyaltyPresentation']> = ResolversObject<{
  engagementOpportunities?: Resolver<Array<ResolversTypes['LoyaltyOpportunity']>, ParentType, ContextType>;
  evaluatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  primaryOpportunity?: Resolver<Maybe<ResolversTypes['LoyaltyOpportunity']>, ParentType, ContextType>;
  purchaseOpportunities?: Resolver<Array<ResolversTypes['LoyaltyOpportunity']>, ParentType, ContextType>;
  purchaseOpportunity?: Resolver<Maybe<ResolversTypes['LoyaltyOpportunity']>, ParentType, ContextType>;
  reviewOpportunity?: Resolver<Maybe<ResolversTypes['LoyaltyOpportunity']>, ParentType, ContextType>;
  revision?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  validUntil?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ProductVariantResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ProductVariant'] = ResolversParentTypes['ProductVariant']> = ResolversObject<{
  __resolveReference?: ReferenceResolver<Maybe<ResolversTypes['ProductVariant']>, { __typename: 'ProductVariant' } & GraphQLRecursivePick<ParentType, {"id":true}>, ContextType>;

  loyalty?: Resolver<Maybe<ResolversTypes['ProductLoyaltyPresentation']>, { __typename: 'ProductVariant' } & GraphQLRecursivePick<ParentType, {"id":true}>, ContextType>;
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
  LoyaltyAccount?: LoyaltyAccountResolvers<ContextType>;
  LoyaltyAccountOpportunityPresentation?: LoyaltyAccountOpportunityPresentationResolvers<ContextType>;
  LoyaltyAvailableReward?: LoyaltyAvailableRewardResolvers<ContextType>;
  LoyaltyAvailableRewardConnection?: LoyaltyAvailableRewardConnectionResolvers<ContextType>;
  LoyaltyAvailableRewardEdge?: LoyaltyAvailableRewardEdgeResolvers<ContextType>;
  LoyaltyBalance?: LoyaltyBalanceResolvers<ContextType>;
  LoyaltyFreeProductRewardPresentation?: LoyaltyFreeProductRewardPresentationResolvers<ContextType>;
  LoyaltyFreeShippingRewardPresentation?: LoyaltyFreeShippingRewardPresentationResolvers<ContextType>;
  LoyaltyMemberBenefitRewardPresentation?: LoyaltyMemberBenefitRewardPresentationResolvers<ContextType>;
  LoyaltyMoneyRange?: LoyaltyMoneyRangeResolvers<ContextType>;
  LoyaltyMoneyRewardPresentation?: LoyaltyMoneyRewardPresentationResolvers<ContextType>;
  LoyaltyOpportunity?: LoyaltyOpportunityResolvers<ContextType>;
  LoyaltyOpportunityCopy?: LoyaltyOpportunityCopyResolvers<ContextType>;
  LoyaltyPercentageRewardPresentation?: LoyaltyPercentageRewardPresentationResolvers<ContextType>;
  LoyaltyPointsExpiration?: LoyaltyPointsExpirationResolvers<ContextType>;
  LoyaltyPointsRewardPresentation?: LoyaltyPointsRewardPresentationResolvers<ContextType>;
  LoyaltyRewardPresentation?: LoyaltyRewardPresentationResolvers<ContextType>;
  LoyaltyTier?: LoyaltyTierResolvers<ContextType>;
  LoyaltyTransaction?: LoyaltyTransactionResolvers<ContextType>;
  LoyaltyTransactionConnection?: LoyaltyTransactionConnectionResolvers<ContextType>;
  LoyaltyTransactionEdge?: LoyaltyTransactionEdgeResolvers<ContextType>;
  LoyaltyUnsignedRange?: LoyaltyUnsignedRangeResolvers<ContextType>;
  LoyaltyVoucherRewardPresentation?: LoyaltyVoucherRewardPresentationResolvers<ContextType>;
  Money?: MoneyResolvers<ContextType>;
  Node?: NodeResolvers<ContextType>;
  PageInfo?: PageInfoResolvers<ContextType>;
  Product?: ProductResolvers<ContextType>;
  ProductLoyaltyPresentation?: ProductLoyaltyPresentationResolvers<ContextType>;
  ProductVariant?: ProductVariantResolvers<ContextType>;
  RichText?: RichTextResolvers<ContextType>;
  URL?: GraphQLScalarType;
  UnsignedInt64?: GraphQLScalarType;
  UserError?: UserErrorResolvers<ContextType>;
  Weight?: WeightResolvers<ContextType>;
}>;
