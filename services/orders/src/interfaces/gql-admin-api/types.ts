import { GraphQLResolveInfo, GraphQLScalarType, GraphQLScalarTypeConfig } from 'graphql';
import { GraphQLContext } from './context.js';
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
  /** An arbitrary-size integer serialized as a decimal string. */
  BigInt: { input: string; output: string; }
  /** An ISO 8601 date-time string. */
  DateTime: { input: string; output: string; }
  /** An arbitrary-precision signed decimal serialized as a string. */
  Decimal: { input: string; output: string; }
  /** A syntactically valid email address. */
  Email: { input: string; output: string; }
  /** A JSON-serializable value with secrets excluded. */
  JSON: { input: unknown; output: unknown; }
  /** An absolute RFC 3986 or RFC 3987 URL string. */
  URL: { input: string; output: string; }
};

export type ApiApiKey = {
  __typename?: 'ApiKey';
  /** Federated ApiKey ID. */
  id: Scalars['ID']['output'];
};

/** Comparison operators for big int; omitted operators do not constrain results. */
export type ApiBigIntFilterInput = {
  /** Validated input value for eq. */
  eq?: InputMaybe<Scalars['BigInt']['input']>;
  /** Validated input value for gt. */
  gt?: InputMaybe<Scalars['BigInt']['input']>;
  /** Validated input value for gte. */
  gte?: InputMaybe<Scalars['BigInt']['input']>;
  /** Validated input value for lt. */
  lt?: InputMaybe<Scalars['BigInt']['input']>;
  /** Validated input value for lte. */
  lte?: InputMaybe<Scalars['BigInt']['input']>;
};

/** Orders Admin representation of calculated order. */
export type ApiCalculatedOrder = {
  __typename?: 'CalculatedOrder';
  /** Projected value for balance delta. */
  balanceDelta: ApiMoney;
  /** Projected value for cost. */
  cost: ApiOrderCost;
  /** Projected value for lines. */
  lines: Array<ApiOrderLine>;
};

export type ApiCheckout = {
  __typename?: 'Checkout';
  /** Federated Checkout ID. */
  id: Scalars['ID']['output'];
};

/** Shared fields exposed by every Relay-style connection. */
export type ApiConnection = {
  /** Metadata required to continue forward or backward pagination. */
  pageInfo: ApiPageInfo;
  /** Total resources matching the filter before pagination. */
  totalCount: Scalars['Int']['output'];
};

export enum ApiCountryCode {
  /** Andorra */
  Ad = 'AD',
  /** United Arab Emirates */
  Ae = 'AE',
  /** Afghanistan */
  Af = 'AF',
  /** Antigua and Barbuda */
  Ag = 'AG',
  /** Albania */
  Al = 'AL',
  /** Armenia */
  Am = 'AM',
  /** Angola */
  Ao = 'AO',
  /** Argentina */
  Ar = 'AR',
  /** Austria */
  At = 'AT',
  /** Australia */
  Au = 'AU',
  /** Aruba */
  Aw = 'AW',
  /** Åland Islands */
  Ax = 'AX',
  /** Azerbaijan */
  Az = 'AZ',
  /** Bosnia and Herzegovina */
  Ba = 'BA',
  /** Barbados */
  Bb = 'BB',
  /** Bangladesh */
  Bd = 'BD',
  /** Belgium */
  Be = 'BE',
  /** Burkina Faso */
  Bf = 'BF',
  /** Bulgaria */
  Bg = 'BG',
  /** Bahrain */
  Bh = 'BH',
  /** Burundi */
  Bi = 'BI',
  /** Benin */
  Bj = 'BJ',
  /** Bermuda */
  Bm = 'BM',
  /** Brunei */
  Bn = 'BN',
  /** Bolivia */
  Bo = 'BO',
  /** Brazil */
  Br = 'BR',
  /** Bahamas */
  Bs = 'BS',
  /** Bhutan */
  Bt = 'BT',
  /** Botswana */
  Bw = 'BW',
  /** Belarus */
  By = 'BY',
  /** Belize */
  Bz = 'BZ',
  /** Canada */
  Ca = 'CA',
  /** Democratic Republic of the Congo */
  Cd = 'CD',
  /** Central African Republic */
  Cf = 'CF',
  /** Republic of the Congo */
  Cg = 'CG',
  /** Switzerland */
  Ch = 'CH',
  /** Ivory Coast */
  Ci = 'CI',
  /** Chile */
  Cl = 'CL',
  /** Cameroon */
  Cm = 'CM',
  /** China */
  Cn = 'CN',
  /** Colombia */
  Co = 'CO',
  /** Costa Rica */
  Cr = 'CR',
  /** Cuba */
  Cu = 'CU',
  /** Cape Verde */
  Cv = 'CV',
  /** Curaçao */
  Cw = 'CW',
  /** Cyprus */
  Cy = 'CY',
  /** Czech Republic */
  Cz = 'CZ',
  /** Germany */
  De = 'DE',
  /** Djibouti */
  Dj = 'DJ',
  /** Denmark */
  Dk = 'DK',
  /** Dominica */
  Dm = 'DM',
  /** Dominican Republic */
  Do = 'DO',
  /** Algeria */
  Dz = 'DZ',
  /** Ecuador */
  Ec = 'EC',
  /** Estonia */
  Ee = 'EE',
  /** Egypt */
  Eg = 'EG',
  /** Western Sahara */
  Eh = 'EH',
  /** Eritrea */
  Er = 'ER',
  /** Spain */
  Es = 'ES',
  /** Ethiopia */
  Et = 'ET',
  /** Finland */
  Fi = 'FI',
  /** Fiji */
  Fj = 'FJ',
  /** Micronesia */
  Fm = 'FM',
  /** Faroe Islands */
  Fo = 'FO',
  /** France */
  Fr = 'FR',
  /** Gabon */
  Ga = 'GA',
  /** United Kingdom */
  Gb = 'GB',
  /** Grenada */
  Gd = 'GD',
  /** Georgia */
  Ge = 'GE',
  /** Guernsey */
  Gg = 'GG',
  /** Ghana */
  Gh = 'GH',
  /** Greenland */
  Gl = 'GL',
  /** Gambia */
  Gm = 'GM',
  /** Guinea */
  Gn = 'GN',
  /** Equatorial Guinea */
  Gq = 'GQ',
  /** Greece */
  Gr = 'GR',
  /** Guatemala */
  Gt = 'GT',
  /** Guinea-Bissau */
  Gw = 'GW',
  /** Guyana */
  Gy = 'GY',
  /** Honduras */
  Hn = 'HN',
  /** Croatia */
  Hr = 'HR',
  /** Haiti */
  Ht = 'HT',
  /** Hungary */
  Hu = 'HU',
  /** Indonesia */
  Id = 'ID',
  /** Ireland */
  Ie = 'IE',
  /** Israel */
  Il = 'IL',
  /** Isle of Man */
  Im = 'IM',
  /** India */
  In = 'IN',
  /** Iraq */
  Iq = 'IQ',
  /** Iran */
  Ir = 'IR',
  /** Iceland */
  Is = 'IS',
  /** Italy */
  It = 'IT',
  /** Jersey */
  Je = 'JE',
  /** Jamaica */
  Jm = 'JM',
  /** Jordan */
  Jo = 'JO',
  /** Japan */
  Jp = 'JP',
  /** Kenya */
  Ke = 'KE',
  /** Kyrgyzstan */
  Kg = 'KG',
  /** Cambodia */
  Kh = 'KH',
  /** Comoros */
  Km = 'KM',
  /** Saint Kitts and Nevis */
  Kn = 'KN',
  /** North Korea */
  Kp = 'KP',
  /** South Korea */
  Kr = 'KR',
  /** Kuwait */
  Kw = 'KW',
  /** Kazakhstan */
  Kz = 'KZ',
  /** Laos */
  La = 'LA',
  /** Lebanon */
  Lb = 'LB',
  /** Saint Lucia */
  Lc = 'LC',
  /** Liechtenstein */
  Li = 'LI',
  /** Sri Lanka */
  Lk = 'LK',
  /** Liberia */
  Lr = 'LR',
  /** Lesotho */
  Ls = 'LS',
  /** Lithuania */
  Lt = 'LT',
  /** Luxembourg */
  Lu = 'LU',
  /** Latvia */
  Lv = 'LV',
  /** Morocco */
  Ma = 'MA',
  /** Monaco */
  Mc = 'MC',
  /** Moldova */
  Md = 'MD',
  /** Montenegro */
  Me = 'ME',
  /** Madagascar */
  Mg = 'MG',
  /** Marshall Islands */
  Mh = 'MH',
  /** North Macedonia */
  Mk = 'MK',
  /** Mali */
  Ml = 'ML',
  /** Myanmar */
  Mm = 'MM',
  /** Mongolia */
  Mn = 'MN',
  /** Mauritania */
  Mr = 'MR',
  /** Malta */
  Mt = 'MT',
  /** Mauritius */
  Mu = 'MU',
  /** Maldives */
  Mv = 'MV',
  /** Malawi */
  Mw = 'MW',
  /** Mexico */
  Mx = 'MX',
  /** Malaysia */
  My = 'MY',
  /** Mozambique */
  Mz = 'MZ',
  /** Namibia */
  Na = 'NA',
  /** New Caledonia */
  Nc = 'NC',
  /** Niger */
  Ne = 'NE',
  /** Nigeria */
  Ng = 'NG',
  /** Nicaragua */
  Ni = 'NI',
  /** Netherlands */
  Nl = 'NL',
  /** Norway */
  No = 'NO',
  /** Nepal */
  Np = 'NP',
  /** New Zealand */
  Nz = 'NZ',
  /** Oman */
  Om = 'OM',
  /** Panama */
  Pa = 'PA',
  /** Peru */
  Pe = 'PE',
  /** Papua New Guinea */
  Pg = 'PG',
  /** Philippines */
  Ph = 'PH',
  /** Pakistan */
  Pk = 'PK',
  /** Poland */
  Pl = 'PL',
  /** Palestine */
  Ps = 'PS',
  /** Portugal */
  Pt = 'PT',
  /** Palau */
  Pw = 'PW',
  /** Paraguay */
  Py = 'PY',
  /** Qatar */
  Qa = 'QA',
  /** Romania */
  Ro = 'RO',
  /** Serbia */
  Rs = 'RS',
  /** Russia */
  Ru = 'RU',
  /** Rwanda */
  Rw = 'RW',
  /** Saudi Arabia */
  Sa = 'SA',
  /** Solomon Islands */
  Sb = 'SB',
  /** Seychelles */
  Sc = 'SC',
  /** Sudan */
  Sd = 'SD',
  /** Sweden */
  Se = 'SE',
  /** Singapore */
  Sg = 'SG',
  /** Slovenia */
  Si = 'SI',
  /** Slovakia */
  Sk = 'SK',
  /** Sierra Leone */
  Sl = 'SL',
  /** San Marino */
  Sm = 'SM',
  /** Senegal */
  Sn = 'SN',
  /** Suriname */
  Sr = 'SR',
  /** South Sudan */
  Ss = 'SS',
  /** El Salvador */
  Sv = 'SV',
  /** Syria */
  Sy = 'SY',
  /** Swaziland (Eswatini) */
  Sz = 'SZ',
  /** Chad */
  Td = 'TD',
  /** Togo */
  Tg = 'TG',
  /** Thailand */
  Th = 'TH',
  /** Tajikistan */
  Tj = 'TJ',
  /** Timor-Leste (East Timor) */
  Tl = 'TL',
  /** Turkmenistan */
  Tm = 'TM',
  /** Tunisia */
  Tn = 'TN',
  /** Tonga */
  To = 'TO',
  /** Turkey */
  Tr = 'TR',
  /** Trinidad and Tobago */
  Tt = 'TT',
  /** Tanzania */
  Tz = 'TZ',
  /** Ukraine */
  Ua = 'UA',
  /** Uganda */
  Ug = 'UG',
  /** United States */
  Us = 'US',
  /** Uruguay */
  Uy = 'UY',
  /** Uzbekistan */
  Uz = 'UZ',
  /** Vatican City */
  Va = 'VA',
  /** Saint Vincent and the Grenadines */
  Vc = 'VC',
  /** Venezuela */
  Ve = 'VE',
  /** British Virgin Islands */
  Vg = 'VG',
  /** US Virgin Islands */
  Vi = 'VI',
  /** Vietnam */
  Vn = 'VN',
  /** Vanuatu */
  Vu = 'VU',
  /** Samoa */
  Ws = 'WS',
  /** Kosovo */
  Xk = 'XK',
  /** Yemen */
  Ye = 'YE',
  /** South Africa */
  Za = 'ZA',
  /** Zambia */
  Zm = 'ZM',
  /** Zimbabwe */
  Zw = 'ZW'
}

/** Comparison operators for country code; omitted operators do not constrain results. */
export type ApiCountryCodeFilterInput = {
  /** Validated input value for eq. */
  eq?: InputMaybe<ApiCountryCode>;
  /** Validated input value for in. */
  in?: InputMaybe<Array<ApiCountryCode>>;
};

/** Currency codes according to ISO 4217 */
export enum ApiCurrencyCode {
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

/** Comparison operators for currency code; omitted operators do not constrain results. */
export type ApiCurrencyCodeFilterInput = {
  /** Validated input value for eq. */
  eq?: InputMaybe<ApiCurrencyCode>;
  /** Validated input value for in. */
  in?: InputMaybe<Array<ApiCurrencyCode>>;
};

export type ApiCustomer = {
  __typename?: 'Customer';
  /** Federated Customer ID. */
  id: Scalars['ID']['output'];
};

/** Comparison operators for date time; omitted operators do not constrain results. */
export type ApiDateTimeFilterInput = {
  /** Validated input value for eq. */
  eq?: InputMaybe<Scalars['DateTime']['input']>;
  /** Validated input value for gt. */
  gt?: InputMaybe<Scalars['DateTime']['input']>;
  /** Validated input value for gte. */
  gte?: InputMaybe<Scalars['DateTime']['input']>;
  /** Validated input value for lt. */
  lt?: InputMaybe<Scalars['DateTime']['input']>;
  /** Validated input value for lte. */
  lte?: InputMaybe<Scalars['DateTime']['input']>;
};

/** Comparison operators for decimal; omitted operators do not constrain results. */
export type ApiDecimalFilterInput = {
  /** Validated input value for eq. */
  eq?: InputMaybe<Scalars['Decimal']['input']>;
  /** Validated input value for gt. */
  gt?: InputMaybe<Scalars['Decimal']['input']>;
  /** Validated input value for gte. */
  gte?: InputMaybe<Scalars['Decimal']['input']>;
  /** Validated input value for lt. */
  lt?: InputMaybe<Scalars['Decimal']['input']>;
  /** Validated input value for lte. */
  lte?: InputMaybe<Scalars['Decimal']['input']>;
};

/** Dimension (length) measurement units */
export enum ApiDimensionUnit {
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

/** Physical dimensions expressed in one supported length unit. */
export type ApiDimensions = {
  __typename?: 'Dimensions';
  /** Height in unit. */
  height: Scalars['Float']['output'];
  /** Length in unit. */
  length: Scalars['Float']['output'];
  /** Unit shared by width, height, and length. */
  unit: ApiDimensionUnit;
  /** Width in unit. */
  width: Scalars['Float']['output'];
};

/** Expected mutation error displayable to an authorized Admin user. */
export type ApiDisplayableError = {
  /** Path to the invalid input field, or null for an aggregate-level error. */
  field: Maybe<Array<Scalars['String']['output']>>;
  /** Human-readable error explanation. */
  message: Scalars['String']['output'];
};

/** Execution fact consuming quantities allocated to a fulfillment order. */
export type ApiFulfillment = ApiNode & {
  __typename?: 'Fulfillment';
  /** Timestamp for created, or null when it has not occurred. */
  createdAt: Scalars['DateTime']['output'];
  /** Projected value for fulfillment order. */
  fulfillmentOrder: ApiFulfillmentOrder;
  /** Relay global ID of this resource. */
  id: Scalars['ID']['output'];
  /** Projected value for lines. */
  lines: Array<ApiFulfillmentLine>;
  /** Relay global ID identifying the location. */
  locationId: Scalars['ID']['output'];
  /** Whether completion should enqueue a customer notification. */
  notifyCustomer: Scalars['Boolean']['output'];
  /** Fresh order projection returned after the command. */
  order: ApiOrder;
  /** Projected value for shipments. */
  shipments: Array<ApiShipment>;
  /** Current lifecycle or derived projection status. */
  status: ApiFulfillmentStatus;
  /** Timestamp for updated, or null when it has not occurred. */
  updatedAt: Scalars['DateTime']['output'];
  /** Internal aggregate version. */
  version: Scalars['Int']['output'];
};

/** Validated input for fulfillment cancel. Tenant identifiers come only from trusted context. */
export type ApiFulfillmentCancelInput = {
  /** Relay global ID identifying the fulfillment. */
  fulfillmentId: Scalars['ID']['input'];
  /** Stable audited reason code. */
  reasonCode: Scalars['String']['input'];
  /** Validated input value for restock. */
  restock?: InputMaybe<Scalars['Boolean']['input']>;
};

/** Validated input for fulfillment create. Tenant identifiers come only from trusted context. */
export type ApiFulfillmentCreateInput = {
  /** Relay global ID identifying the fulfillment order. */
  fulfillmentOrderId: Scalars['ID']['input'];
  /** Validated input value for lines. */
  lines: Array<ApiFulfillmentOrderLineQuantityInput>;
  /** Whether completion should enqueue a customer notification. */
  notifyCustomer?: InputMaybe<Scalars['Boolean']['input']>;
};

/** Orders Admin representation of fulfillment hold. */
export type ApiFulfillmentHold = ApiNode & {
  __typename?: 'FulfillmentHold';
  /** Timestamp for created, or null when it has not occurred. */
  createdAt: Scalars['DateTime']['output'];
  /** Projected value for held by. */
  heldBy: ApiOrderActor;
  /** Relay global ID of this resource. */
  id: Scalars['ID']['output'];
  /** Projected value for note. */
  note: Maybe<Scalars['String']['output']>;
  /** Stable audited reason code. */
  reasonCode: Scalars['String']['output'];
  /** Timestamp for released, or null when it has not occurred. */
  releasedAt: Maybe<Scalars['DateTime']['output']>;
};

/** Orders Admin representation of fulfillment line. */
export type ApiFulfillmentLine = {
  __typename?: 'FulfillmentLine';
  /** Projected value for order line. */
  orderLine: ApiOrderLine;
  /** Quantity validated against domain conservation invariants. */
  quantity: Scalars['Int']['output'];
};

/** Allocatable fulfillment work unit, separate from provider execution and physical shipment. */
export type ApiFulfillmentOrder = ApiNode & {
  __typename?: 'FulfillmentOrder';
  /** Relay global ID identifying the assigned location. */
  assignedLocationId: Scalars['ID']['output'];
  /** Projected value for assigned service. */
  assignedService: Maybe<ApiFulfillmentServiceRoute>;
  /** Timestamp for created, or null when it has not occurred. */
  createdAt: Scalars['DateTime']['output'];
  /** Projected value for delivery group. */
  deliveryGroup: ApiOrderDeliveryGroup;
  /** Timestamp for fulfill, or null when it has not occurred. */
  fulfillAt: Maybe<Scalars['DateTime']['output']>;
  /** Projected value for fulfill by. */
  fulfillBy: Maybe<Scalars['DateTime']['output']>;
  /** Projected value for holds. */
  holds: Array<ApiFulfillmentHold>;
  /** Relay global ID of this resource. */
  id: Scalars['ID']['output'];
  /** Projected value for lines. */
  lines: Array<ApiFulfillmentOrderLine>;
  /** Fresh order projection returned after the command. */
  order: ApiOrder;
  /** Current request status. */
  requestStatus: ApiFulfillmentRequestStatus;
  /** Current lifecycle or derived projection status. */
  status: ApiFulfillmentOrderStatus;
  /** Projected value for supported actions. */
  supportedActions: Array<Scalars['String']['output']>;
  /** Timestamp for updated, or null when it has not occurred. */
  updatedAt: Scalars['DateTime']['output'];
  /** Internal aggregate version. */
  version: Scalars['Int']['output'];
};

/** Validated input for fulfillment order cancel request. Tenant identifiers come only from trusted context. */
export type ApiFulfillmentOrderCancelRequestInput = {
  /** Relay global ID identifying the fulfillment order. */
  fulfillmentOrderId: Scalars['ID']['input'];
  /** Validated input value for note. */
  note?: InputMaybe<Scalars['String']['input']>;
  /** Stable audited reason code. */
  reasonCode: Scalars['String']['input'];
};

/** Validated input for fulfillment order hold. Tenant identifiers come only from trusted context. */
export type ApiFulfillmentOrderHoldInput = {
  /** Relay global ID identifying the fulfillment order. */
  fulfillmentOrderId: Scalars['ID']['input'];
  /** Validated input value for note. */
  note?: InputMaybe<Scalars['String']['input']>;
  /** Stable audited reason code. */
  reasonCode: Scalars['String']['input'];
};

/** Orders Admin representation of fulfillment order line. */
export type ApiFulfillmentOrderLine = ApiNode & {
  __typename?: 'FulfillmentOrderLine';
  /** Projected fulfilled quantity. */
  fulfilledQuantity: Scalars['Int']['output'];
  /** Relay global ID of this resource. */
  id: Scalars['ID']['output'];
  /** Projected value for order line. */
  orderLine: ApiOrderLine;
  /** Quantity validated against domain conservation invariants. */
  quantity: Scalars['Int']['output'];
  /** Projected remaining quantity. */
  remainingQuantity: Scalars['Int']['output'];
};

/** Validated input for fulfillment order line quantity. Tenant identifiers come only from trusted context. */
export type ApiFulfillmentOrderLineQuantityInput = {
  /** Relay global ID identifying the fulfillment order line. */
  fulfillmentOrderLineId: Scalars['ID']['input'];
  /** Quantity validated against domain conservation invariants. */
  quantity: Scalars['Int']['input'];
};

/** Validated input for fulfillment order move. Tenant identifiers come only from trusted context. */
export type ApiFulfillmentOrderMoveInput = {
  /** Relay global ID identifying the fulfillment order. */
  fulfillmentOrderId: Scalars['ID']['input'];
  /** Relay global ID identifying the location. */
  locationId: Scalars['ID']['input'];
  /** Stable service code. */
  serviceCode?: InputMaybe<Scalars['String']['input']>;
};

/** Mutation result for fulfillment order; expected failures are returned in userErrors. */
export type ApiFulfillmentOrderPayload = {
  __typename?: 'FulfillmentOrderPayload';
  /** Projected value for fulfillment order. */
  fulfillmentOrder: Maybe<ApiFulfillmentOrder>;
  /** Fresh order projection returned after the command. */
  order: Maybe<ApiOrder>;
  /** Expected validation, permission, concurrency, and business-rule failures; empty on success. */
  userErrors: Array<ApiOrderUserError>;
};

/** Validated input for fulfillment order release hold. Tenant identifiers come only from trusted context. */
export type ApiFulfillmentOrderReleaseHoldInput = {
  /** Relay global ID identifying the fulfillment order. */
  fulfillmentOrderId: Scalars['ID']['input'];
  /** Relay global ID identifying the hold. */
  holdId: Scalars['ID']['input'];
};

/** Validated input for fulfillment order split. Tenant identifiers come only from trusted context. */
export type ApiFulfillmentOrderSplitInput = {
  /** Relay global ID identifying the fulfillment order. */
  fulfillmentOrderId: Scalars['ID']['input'];
  /** Validated input value for lines. */
  lines: Array<ApiFulfillmentOrderLineQuantityInput>;
};

/** Closed set of fulfillment order status values used by Orders Admin API. */
export enum ApiFulfillmentOrderStatus {
  /** Cancelled value of fulfillment order status. */
  Cancelled = 'CANCELLED',
  /** Closed value of fulfillment order status. */
  Closed = 'CLOSED',
  /** In progress value of fulfillment order status. */
  InProgress = 'IN_PROGRESS',
  /** On hold value of fulfillment order status. */
  OnHold = 'ON_HOLD',
  /** Open value of fulfillment order status. */
  Open = 'OPEN',
  /** Scheduled value of fulfillment order status. */
  Scheduled = 'SCHEDULED'
}

/** Validated input for fulfillment order submit. Tenant identifiers come only from trusted context. */
export type ApiFulfillmentOrderSubmitInput = {
  /** Relay global ID identifying the fulfillment order. */
  fulfillmentOrderId: Scalars['ID']['input'];
};

/** Mutation result for fulfillment; expected failures are returned in userErrors. */
export type ApiFulfillmentPayload = {
  __typename?: 'FulfillmentPayload';
  /** Projected value for fulfillment. */
  fulfillment: Maybe<ApiFulfillment>;
  /** Fresh order projection returned after the command. */
  order: Maybe<ApiOrder>;
  /** Expected validation, permission, concurrency, and business-rule failures; empty on success. */
  userErrors: Array<ApiOrderUserError>;
};

/** Closed set of fulfillment request status values used by Orders Admin API. */
export enum ApiFulfillmentRequestStatus {
  /** Accepted value of fulfillment request status. */
  Accepted = 'ACCEPTED',
  /** Cancellation accepted value of fulfillment request status. */
  CancellationAccepted = 'CANCELLATION_ACCEPTED',
  /** Cancellation rejected value of fulfillment request status. */
  CancellationRejected = 'CANCELLATION_REJECTED',
  /** Cancellation requested value of fulfillment request status. */
  CancellationRequested = 'CANCELLATION_REQUESTED',
  /** Rejected value of fulfillment request status. */
  Rejected = 'REJECTED',
  /** Submitted value of fulfillment request status. */
  Submitted = 'SUBMITTED',
  /** Unsubmitted value of fulfillment request status. */
  Unsubmitted = 'UNSUBMITTED'
}

/** Orders Admin representation of fulfillment service route. */
export type ApiFulfillmentServiceRoute = {
  __typename?: 'FulfillmentServiceRoute';
  /** Stable app code. */
  appCode: Scalars['String']['output'];
  /** Projected value for external reference. */
  externalReference: Maybe<Scalars['String']['output']>;
  /** Relay global ID identifying the installation. */
  installationId: Scalars['ID']['output'];
  /** Projected value for provider revision. */
  providerRevision: Scalars['String']['output'];
  /** Stable service code. */
  serviceCode: Scalars['String']['output'];
};

/** Closed set of fulfillment status values used by Orders Admin API. */
export enum ApiFulfillmentStatus {
  /** Cancelled value of fulfillment status. */
  Cancelled = 'CANCELLED',
  /** Failure value of fulfillment status. */
  Failure = 'FAILURE',
  /** Open value of fulfillment status. */
  Open = 'OPEN',
  /** Pending value of fulfillment status. */
  Pending = 'PENDING',
  /** Success value of fulfillment status. */
  Success = 'SUCCESS'
}

/** Comparison operators for id; omitted operators do not constrain results. */
export type ApiIdFilterInput = {
  /** Validated input value for eq. */
  eq?: InputMaybe<Scalars['ID']['input']>;
  /** Validated input value for in. */
  in?: InputMaybe<Array<Scalars['ID']['input']>>;
  /** Validated input value for not in. */
  notIn?: InputMaybe<Array<Scalars['ID']['input']>>;
};

/** Language/Locale codes based on ISO 639-1 and BCP 47 */
export enum ApiLocaleCode {
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
 * Exact monetary value.
 *
 * amount is an arbitrary-precision decimal string at the GraphQL boundary.
 */
export type ApiMoney = {
  __typename?: 'Money';
  /** Exact decimal amount serialized as a string. */
  amount: Scalars['Decimal']['output'];
  /** ISO 4217 currency code. */
  currencyCode: ApiCurrencyCode;
};

/** Validated input for money. Tenant identifiers come only from trusted context. */
export type ApiMoneyInput = {
  /** Exact decimal amount serialized as a string. */
  amount: Scalars['Decimal']['input'];
  /** ISO 4217 currency code. */
  currencyCode: ApiCurrencyCode;
};

export type ApiMutation = {
  __typename?: 'Mutation';
  /** Entry point for all store-scoped Orders Admin commands. */
  ordersMutation: ApiOrdersMutation;
};

/**
 * An object addressable by a Relay global ID.
 *
 * Consumers must treat the encoded ID as opaque.
 */
export type ApiNode = {
  /** Relay global ID of the object. */
  id: Scalars['ID']['output'];
};

/** Authoritative commercial order aggregate and current projections. Lifecycle changes require explicit commands; payment, fulfillment, delivery, return, and risk statuses derive from child facts. */
export type ApiOrder = ApiNode & {
  __typename?: 'Order';
  /** Projected value for activity. */
  activity: ApiOrderActivityConnection;
  /** Projected value for admin note. */
  adminNote: Maybe<Scalars['String']['output']>;
  /** Timestamp for archived, or null when it has not occurred. */
  archivedAt: Maybe<Scalars['DateTime']['output']>;
  /** Projected value for available actions. */
  availableActions: Array<ApiOrderAction>;
  /** Projected value for billing address. */
  billingAddress: Maybe<ApiOrderAddress>;
  /** Timestamp for cancelled, or null when it has not occurred. */
  cancelledAt: Maybe<Scalars['DateTime']['output']>;
  /** Projected value for checkout. */
  checkout: Maybe<ApiCheckout>;
  /** Projected value for checkout placement. */
  checkoutPlacement: Maybe<ApiOrderCheckoutPlacement>;
  /** Timestamp for closed, or null when it has not occurred. */
  closedAt: Maybe<Scalars['DateTime']['output']>;
  /** Projected value for contact. */
  contact: ApiOrderContact;
  /** Projected value for cost. */
  cost: ApiOrderCost;
  /** Timestamp for created, or null when it has not occurred. */
  createdAt: Scalars['DateTime']['output'];
  /** ISO 4217 currency code. */
  currencyCode: ApiCurrencyCode;
  /** Merchant-defined structured data; core business facts are not stored here. */
  customFields: Scalars['JSON']['output'];
  /** Projected value for customer. */
  customer: Maybe<ApiCustomer>;
  /** Projected value for customer note. */
  customerNote: Maybe<Scalars['String']['output']>;
  /** Projected value for customer snapshot. */
  customerSnapshot: ApiOrderCustomerSnapshot;
  /** Projected value for delivery groups. */
  deliveryGroups: Array<ApiOrderDeliveryGroup>;
  /** Current delivery status. */
  deliveryStatus: ApiOrderDeliveryStatus;
  /** Projected value for discounts. */
  discounts: Array<ApiOrderDiscount>;
  /** Projected value for exchanges. */
  exchanges: ApiOrderExchangeConnection;
  /** Timestamp for expires, or null when it has not occurred. */
  expiresAt: Maybe<Scalars['DateTime']['output']>;
  /** Projected value for fulfillment orders. */
  fulfillmentOrders: Array<ApiFulfillmentOrder>;
  /** Current fulfillment status. */
  fulfillmentStatus: ApiOrderFulfillmentStatus;
  /** Projected value for fulfillments. */
  fulfillments: Array<ApiFulfillment>;
  /** Relay global ID of this resource. */
  id: Scalars['ID']['output'];
  /** Projected value for integration links. */
  integrationLinks: Array<ApiOrderIntegrationLink>;
  /** Projected value for lines. */
  lines: Array<ApiOrderLine>;
  /** Stable locale code. */
  localeCode: Maybe<ApiLocaleCode>;
  /** Store-local order number serialized without precision loss. */
  number: Scalars['BigInt']['output'];
  /** Projected value for origin. */
  origin: ApiOrderOrigin;
  /** Projected value for payment. */
  payment: ApiOrderPayment;
  /** Current payment status. */
  paymentStatus: ApiOrderPaymentStatus;
  /** Timestamp for placed, or null when it has not occurred. */
  placedAt: Maybe<Scalars['DateTime']['output']>;
  /** Projected value for refunds. */
  refunds: ApiOrderRefundConnection;
  /** Current return status. */
  returnStatus: ApiOrderReturnStatus;
  /** Projected value for returns. */
  returns: ApiOrderReturnConnection;
  /** Projected value for risk level. */
  riskLevel: ApiOrderRiskLevel;
  /** Projected value for shipments. */
  shipments: Array<ApiShipment>;
  /** Projected value for shipping address. */
  shippingAddress: Maybe<ApiOrderAddress>;
  /** Projected value for source. */
  source: Maybe<ApiOrderSource>;
  /** Current lifecycle or derived projection status. */
  status: ApiOrderStatus;
  /** Projected value for tags. */
  tags: Array<Scalars['String']['output']>;
  /** Projected value for tax lines. */
  taxLines: Array<ApiOrderTaxLine>;
  /** Projected total quantity. */
  totalQuantity: Scalars['Int']['output'];
  /** Timestamp for updated, or null when it has not occurred. */
  updatedAt: Scalars['DateTime']['output'];
  /** Internal aggregate version. */
  version: Scalars['Int']['output'];
};


/** Authoritative commercial order aggregate and current projections. Lifecycle changes require explicit commands; payment, fulfillment, delivery, return, and risk statuses derive from child facts. */
export type ApiOrderActivityArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
};


/** Authoritative commercial order aggregate and current projections. Lifecycle changes require explicit commands; payment, fulfillment, delivery, return, and risk statuses derive from child facts. */
export type ApiOrderExchangesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
};


/** Authoritative commercial order aggregate and current projections. Lifecycle changes require explicit commands; payment, fulfillment, delivery, return, and risk statuses derive from child facts. */
export type ApiOrderRefundsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
};


/** Authoritative commercial order aggregate and current projections. Lifecycle changes require explicit commands; payment, fulfillment, delivery, return, and risk statuses derive from child facts. */
export type ApiOrderReturnsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
};

/** Closed set of order action values used by Orders Admin API. */
export enum ApiOrderAction {
  /** Archive value of order action. */
  Archive = 'ARCHIVE',
  /** Cancel value of order action. */
  Cancel = 'CANCEL',
  /** Capture payment value of order action. */
  CapturePayment = 'CAPTURE_PAYMENT',
  /** Close value of order action. */
  Close = 'CLOSE',
  /** Complete draft value of order action. */
  CompleteDraft = 'COMPLETE_DRAFT',
  /** Create exchange value of order action. */
  CreateExchange = 'CREATE_EXCHANGE',
  /** Create fulfillment value of order action. */
  CreateFulfillment = 'CREATE_FULFILLMENT',
  /** Create return value of order action. */
  CreateReturn = 'CREATE_RETURN',
  /** Edit lines value of order action. */
  EditLines = 'EDIT_LINES',
  /** Record manual payment value of order action. */
  RecordManualPayment = 'RECORD_MANUAL_PAYMENT',
  /** Refund value of order action. */
  Refund = 'REFUND',
  /** Reopen value of order action. */
  Reopen = 'REOPEN',
  /** Request integration sync value of order action. */
  RequestIntegrationSync = 'REQUEST_INTEGRATION_SYNC',
  /** Retry payment value of order action. */
  RetryPayment = 'RETRY_PAYMENT',
  /** Unarchive value of order action. */
  Unarchive = 'UNARCHIVE',
  /** Update details value of order action. */
  UpdateDetails = 'UPDATE_DETAILS',
  /** Void payment value of order action. */
  VoidPayment = 'VOID_PAYMENT'
}

/** Append-only audit and activity timeline entry. */
export type ApiOrderActivity = ApiNode & {
  __typename?: 'OrderActivity';
  /** Projected value for actor. */
  actor: ApiOrderActor;
  /** Structured snapshot or audit data with secrets excluded. */
  data: Scalars['JSON']['output'];
  /** Timestamp for happened, or null when it has not occurred. */
  happenedAt: Scalars['DateTime']['output'];
  /** Relay global ID of this resource. */
  id: Scalars['ID']['output'];
  /** Human-readable explanation safe for an authorized Admin user. */
  message: Maybe<Scalars['String']['output']>;
  /** Timestamp for recorded, or null when it has not occurred. */
  recordedAt: Scalars['DateTime']['output'];
  /** Projected value for sequence. */
  sequence: Scalars['BigInt']['output'];
  /** Projected value for type. */
  type: Scalars['String']['output'];
  /** Projected value for visibility. */
  visibility: Scalars['String']['output'];
};

/** Relay-style paginated connection of order activity resources. */
export type ApiOrderActivityConnection = ApiConnection & {
  __typename?: 'OrderActivityConnection';
  /** Cursor and resource pairs in this page. */
  edges: Array<ApiOrderActivityEdge>;
  /** Resources in this page. */
  nodes: Array<ApiOrderActivity>;
  /** Relay pagination metadata. */
  pageInfo: ApiPageInfo;
  /** Total matching resources before pagination. */
  totalCount: Scalars['Int']['output'];
};

/** Cursor and resource pair for a order activity connection. */
export type ApiOrderActivityEdge = {
  __typename?: 'OrderActivityEdge';
  /** Opaque Relay cursor for this edge. */
  cursor: Scalars['String']['output'];
  /** Projected value for node. */
  node: ApiOrderActivity;
};

/** Mutation result for order activity; expected failures are returned in userErrors. */
export type ApiOrderActivityPayload = {
  __typename?: 'OrderActivityPayload';
  /** Projected value for activity. */
  activity: Maybe<ApiOrderActivity>;
  /** Fresh order projection returned after the command. */
  order: Maybe<ApiOrder>;
  /** Expected validation, permission, concurrency, and business-rule failures; empty on success. */
  userErrors: Array<ApiOrderUserError>;
};

/** Orders Admin representation of order actor. */
export type ApiOrderActor = {
  __typename?: 'OrderActor';
  /** Projected value for api key. */
  apiKey: Maybe<ApiApiKey>;
  /** Projected value for display name. */
  displayName: Maybe<Scalars['String']['output']>;
  /** Relay global ID of this resource. */
  id: Maybe<Scalars['ID']['output']>;
  /** Projected value for type. */
  type: ApiOrderActorType;
  /** Projected value for user. */
  user: Maybe<ApiUser>;
};

/** Closed set of order actor type values used by Orders Admin API. */
export enum ApiOrderActorType {
  /** Api key value of order actor type. */
  ApiKey = 'API_KEY',
  /** App value of order actor type. */
  App = 'APP',
  /** Customer value of order actor type. */
  Customer = 'CUSTOMER',
  /** System value of order actor type. */
  System = 'SYSTEM',
  /** User value of order actor type. */
  User = 'USER'
}

/** Order-local postal address snapshot retained for billing, delivery, and audit. */
export type ApiOrderAddress = ApiNode & {
  __typename?: 'OrderAddress';
  /** Projected value for address1. */
  address1: Maybe<Scalars['String']['output']>;
  /** Projected value for address2. */
  address2: Maybe<Scalars['String']['output']>;
  /** Projected value for city. */
  city: Maybe<Scalars['String']['output']>;
  /** Projected value for company. */
  company: Maybe<Scalars['String']['output']>;
  /** Stable country code. */
  countryCode: Maybe<ApiCountryCode>;
  /** Structured snapshot or audit data with secrets excluded. */
  data: Scalars['JSON']['output'];
  /** Projected value for email. */
  email: Maybe<Scalars['String']['output']>;
  /** Projected value for first name. */
  firstName: Maybe<Scalars['String']['output']>;
  /** Relay global ID of this resource. */
  id: Scalars['ID']['output'];
  /** Projected value for last name. */
  lastName: Maybe<Scalars['String']['output']>;
  /** Projected value for middle name. */
  middleName: Maybe<Scalars['String']['output']>;
  /** Projected value for phone. */
  phone: Maybe<Scalars['String']['output']>;
  /** Stable postal code. */
  postalCode: Maybe<Scalars['String']['output']>;
  /** Stable province code. */
  provinceCode: Maybe<Scalars['String']['output']>;
  /** Timestamp for redacted, or null when it has not occurred. */
  redactedAt: Maybe<Scalars['DateTime']['output']>;
};

/** Validated input for order address. Tenant identifiers come only from trusted context. */
export type ApiOrderAddressInput = {
  /** Validated input value for address1. */
  address1?: InputMaybe<Scalars['String']['input']>;
  /** Validated input value for address2. */
  address2?: InputMaybe<Scalars['String']['input']>;
  /** Validated input value for city. */
  city?: InputMaybe<Scalars['String']['input']>;
  /** Validated input value for company. */
  company?: InputMaybe<Scalars['String']['input']>;
  /** Stable country code. */
  countryCode: ApiCountryCode;
  /** Structured snapshot or audit data with secrets excluded. */
  data?: InputMaybe<Scalars['JSON']['input']>;
  /** Validated input value for email. */
  email?: InputMaybe<Scalars['String']['input']>;
  /** Validated input value for first name. */
  firstName?: InputMaybe<Scalars['String']['input']>;
  /** Validated input value for last name. */
  lastName?: InputMaybe<Scalars['String']['input']>;
  /** Validated input value for middle name. */
  middleName?: InputMaybe<Scalars['String']['input']>;
  /** Validated input value for phone. */
  phone?: InputMaybe<Scalars['String']['input']>;
  /** Stable postal code. */
  postalCode?: InputMaybe<Scalars['String']['input']>;
  /** Stable province code. */
  provinceCode?: InputMaybe<Scalars['String']['input']>;
};

/** Validated input for order admin note update. Tenant identifiers come only from trusted context. */
export type ApiOrderAdminNoteUpdateInput = {
  /** Validated input value for admin note. */
  adminNote?: InputMaybe<Scalars['String']['input']>;
  /** Relay global ID of this resource. */
  id: Scalars['ID']['input'];
};

/** Validated input for order archive. Tenant identifiers come only from trusted context. */
export type ApiOrderArchiveInput = {
  /** Relay global ID of this resource. */
  id: Scalars['ID']['input'];
};

/** Validated input for order bulk selection. Tenant identifiers come only from trusted context. */
export type ApiOrderBulkSelectionInput = {
  /** Validated input value for excluded ids. */
  excludedIds?: InputMaybe<Array<Scalars['ID']['input']>>;
  /** Validated input value for ids. */
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  /** Validated input value for where. */
  where?: InputMaybe<ApiOrderWhereInput>;
};

/** Validated input for order cancel. Tenant identifiers come only from trusted context. */
export type ApiOrderCancelInput = {
  /** Relay global ID of this resource. */
  id: Scalars['ID']['input'];
  /** Whether completion should enqueue a customer notification. */
  notifyCustomer?: InputMaybe<Scalars['Boolean']['input']>;
  /** Stable audited reason code. */
  reasonCode: Scalars['String']['input'];
  /** Validated input value for refund mode. */
  refundMode?: InputMaybe<Scalars['String']['input']>;
  /** Validated input value for restock. */
  restock?: InputMaybe<Scalars['Boolean']['input']>;
  /** Validated input value for staff note. */
  staffNote?: InputMaybe<Scalars['String']['input']>;
};

/** Checkout-owned placement provenance projected into Orders. */
export type ApiOrderCheckoutPlacement = {
  __typename?: 'OrderCheckoutPlacement';
  /** Relay global ID identifying the checkout. */
  checkoutId: Scalars['ID']['output'];
  /** Projected value for checkout version. */
  checkoutVersion: Scalars['Int']['output'];
  /** Timestamp for confirmed, or null when it has not occurred. */
  confirmedAt: Maybe<Scalars['DateTime']['output']>;
  /** Projected value for contract version. */
  contractVersion: Scalars['Int']['output'];
  /** Projected value for delivery revision. */
  deliveryRevision: Scalars['String']['output'];
  /** Timestamp for failed, or null when it has not occurred. */
  failedAt: Maybe<Scalars['DateTime']['output']>;
  /** Projected value for final quote revision. */
  finalQuoteRevision: Scalars['String']['output'];
  /** Projected value for payment methods revision. */
  paymentMethodsRevision: Scalars['String']['output'];
  /** Relay global ID identifying the placement. */
  placementId: Scalars['ID']['output'];
  /** Projected value for result revision. */
  resultRevision: Scalars['String']['output'];
  /** Projected value for snapshot hash. */
  snapshotHash: Scalars['String']['output'];
  /** Current lifecycle or derived projection status. */
  status: ApiOrderPlacementStatus;
};

/** Validated input for order close. Tenant identifiers come only from trusted context. */
export type ApiOrderCloseInput = {
  /** Relay global ID of this resource. */
  id: Scalars['ID']['input'];
  /** Validated input value for reason. */
  reason?: InputMaybe<Scalars['String']['input']>;
};

/** Validated input for order comment add. Tenant identifiers come only from trusted context. */
export type ApiOrderCommentAddInput = {
  /** Validated input value for comment. */
  comment: Scalars['String']['input'];
  /** Relay global ID of this resource. */
  id: Scalars['ID']['input'];
  /** Validated input value for visibility. */
  visibility?: InputMaybe<Scalars['String']['input']>;
};

/** Validated input for order complete draft. Tenant identifiers come only from trusted context. */
export type ApiOrderCompleteDraftInput = {
  /** Relay global ID of this resource. */
  id: Scalars['ID']['input'];
  /** Whether completion should enqueue a customer notification. */
  notifyCustomer?: InputMaybe<Scalars['Boolean']['input']>;
};

/** Relay-style paginated connection of order resources. */
export type ApiOrderConnection = ApiConnection & {
  __typename?: 'OrderConnection';
  /** Cursor and resource pairs in this page. */
  edges: Array<ApiOrderEdge>;
  /** Resources in this page. */
  nodes: Array<ApiOrder>;
  /** Relay pagination metadata. */
  pageInfo: ApiPageInfo;
  /** Total matching resources before pagination. */
  totalCount: Scalars['Int']['output'];
};

/** Order-local contact snapshot with explicit redaction state. */
export type ApiOrderContact = {
  __typename?: 'OrderContact';
  /** Projected value for company. */
  company: Maybe<Scalars['String']['output']>;
  /** Projected value for email. */
  email: Maybe<Scalars['String']['output']>;
  /** Projected value for first name. */
  firstName: Maybe<Scalars['String']['output']>;
  /** Projected value for last name. */
  lastName: Maybe<Scalars['String']['output']>;
  /** Projected value for middle name. */
  middleName: Maybe<Scalars['String']['output']>;
  /** Projected value for note. */
  note: Maybe<Scalars['String']['output']>;
  /** Projected value for phone. */
  phone: Maybe<Scalars['String']['output']>;
  /** Timestamp for redacted, or null when it has not occurred. */
  redactedAt: Maybe<Scalars['DateTime']['output']>;
};

/** Validated input for order contact. Tenant identifiers come only from trusted context. */
export type ApiOrderContactInput = {
  /** Validated input value for company. */
  company?: InputMaybe<Scalars['String']['input']>;
  /** Validated input value for email. */
  email?: InputMaybe<Scalars['String']['input']>;
  /** Validated input value for first name. */
  firstName?: InputMaybe<Scalars['String']['input']>;
  /** Validated input value for last name. */
  lastName?: InputMaybe<Scalars['String']['input']>;
  /** Validated input value for middle name. */
  middleName?: InputMaybe<Scalars['String']['input']>;
  /** Validated input value for note. */
  note?: InputMaybe<Scalars['String']['input']>;
  /** Validated input value for phone. */
  phone?: InputMaybe<Scalars['String']['input']>;
};

/** Server-calculated totals in one currency. Paid, refunded, and outstanding amounts derive from successful financial facts. */
export type ApiOrderCost = {
  __typename?: 'OrderCost';
  /** Monetary adjustment in the order currency. */
  adjustmentAmount: ApiMoney;
  /** Monetary discount in the order currency. */
  discountAmount: ApiMoney;
  /** Monetary duty in the order currency. */
  dutyAmount: ApiMoney;
  /** Monetary outstanding in the order currency. */
  outstandingAmount: ApiMoney;
  /** Monetary paid in the order currency. */
  paidAmount: ApiMoney;
  /** Monetary refunded in the order currency. */
  refundedAmount: ApiMoney;
  /** Monetary shipping in the order currency. */
  shippingAmount: ApiMoney;
  /** Monetary subtotal in the order currency. */
  subtotalAmount: ApiMoney;
  /** Monetary tax in the order currency. */
  taxAmount: ApiMoney;
  /** Monetary total in the order currency. */
  totalAmount: ApiMoney;
};

/** Validated input for order create. Tenant identifiers come only from trusted context. */
export type ApiOrderCreateInput = {
  /** Validated input value for admin note. */
  adminNote?: InputMaybe<Scalars['String']['input']>;
  /** Validated input value for billing address. */
  billingAddress?: InputMaybe<ApiOrderAddressInput>;
  /** Validated input value for contact. */
  contact: ApiOrderContactInput;
  /** Merchant-defined structured data; core business facts are not stored here. */
  customFields?: InputMaybe<Scalars['JSON']['input']>;
  /** Relay global ID identifying the customer. */
  customerId?: InputMaybe<Scalars['ID']['input']>;
  /** Validated input value for customer note. */
  customerNote?: InputMaybe<Scalars['String']['input']>;
  /** Relay global ID identifying the external. */
  externalId?: InputMaybe<Scalars['String']['input']>;
  /** Validated input value for lines. */
  lines: Array<ApiOrderLineCreateInput>;
  /** Stable locale code. */
  localeCode?: InputMaybe<ApiLocaleCode>;
  /** Stable payment method code. */
  paymentMethodCode?: InputMaybe<Scalars['String']['input']>;
  /** Validated input value for shipping. */
  shipping?: InputMaybe<ApiOrderDeliveryInput>;
  /** Stable source code. */
  sourceCode?: InputMaybe<Scalars['String']['input']>;
  /** Validated input value for tags. */
  tags?: InputMaybe<Array<Scalars['String']['input']>>;
};

/** Validated input for order custom fields update. Tenant identifiers come only from trusted context. */
export type ApiOrderCustomFieldsUpdateInput = {
  /** Merchant-defined structured data; core business facts are not stored here. */
  customFields: Scalars['JSON']['input'];
  /** Relay global ID of this resource. */
  id: Scalars['ID']['input'];
};

/** Validated input for order customer set. Tenant identifiers come only from trusted context. */
export type ApiOrderCustomerSetInput = {
  /** Relay global ID identifying the customer. */
  customerId?: InputMaybe<Scalars['ID']['input']>;
  /** Relay global ID of this resource. */
  id: Scalars['ID']['input'];
};

/** Immutable customer identity captured for the commercial record independently of later profile changes. */
export type ApiOrderCustomerSnapshot = {
  __typename?: 'OrderCustomerSnapshot';
  /** Projected value for company. */
  company: Maybe<Scalars['String']['output']>;
  /** Stable country code. */
  countryCode: Maybe<ApiCountryCode>;
  /** Relay global ID identifying the customer. */
  customerId: Maybe<Scalars['ID']['output']>;
  /** Projected value for email. */
  email: Maybe<Scalars['String']['output']>;
  /** Projected value for first name. */
  firstName: Maybe<Scalars['String']['output']>;
  /** Projected value for last name. */
  lastName: Maybe<Scalars['String']['output']>;
  /** Projected value for middle name. */
  middleName: Maybe<Scalars['String']['output']>;
  /** Projected value for phone. */
  phone: Maybe<Scalars['String']['output']>;
};

/** Validated input for order delete. Tenant identifiers come only from trusted context. */
export type ApiOrderDeleteInput = {
  /** Relay global ID of this resource. */
  id: Scalars['ID']['input'];
};

/** Mutation result for order delete; expected failures are returned in userErrors. */
export type ApiOrderDeletePayload = {
  __typename?: 'OrderDeletePayload';
  /** Relay global ID identifying the deleted. */
  deletedId: Maybe<Scalars['ID']['output']>;
  /** Fresh order projection returned after the command. */
  order: Maybe<ApiOrder>;
  /** Expected validation, permission, concurrency, and business-rule failures; empty on success. */
  userErrors: Array<ApiOrderUserError>;
};

/** Orders Admin representation of order delivery group. */
export type ApiOrderDeliveryGroup = ApiNode & {
  __typename?: 'OrderDeliveryGroup';
  /** Projected value for address. */
  address: Maybe<ApiOrderAddress>;
  /** Timestamp for created, or null when it has not occurred. */
  createdAt: Scalars['DateTime']['output'];
  /** Relay global ID of this resource. */
  id: Scalars['ID']['output'];
  /** Projected value for lines. */
  lines: Array<ApiOrderLine>;
  /** Projected value for recipient. */
  recipient: Maybe<ApiOrderContact>;
  /** Projected value for selected method. */
  selectedMethod: Maybe<ApiOrderDeliveryMethod>;
  /** Timestamp for updated, or null when it has not occurred. */
  updatedAt: Scalars['DateTime']['output'];
};

/** Validated input for order delivery. Tenant identifiers come only from trusted context. */
export type ApiOrderDeliveryInput = {
  /** Validated input value for address. */
  address?: InputMaybe<ApiOrderAddressInput>;
  /** Stable method code. */
  methodCode?: InputMaybe<Scalars['String']['input']>;
  /** Validated input value for recipient. */
  recipient?: InputMaybe<ApiOrderContactInput>;
};

/** Orders Admin representation of order delivery method. */
export type ApiOrderDeliveryMethod = {
  __typename?: 'OrderDeliveryMethod';
  /** Exact decimal amount serialized as a string. */
  amount: ApiMoney;
  /** Stable machine-readable code. */
  code: Scalars['String']['output'];
  /** Projected value for customer input. */
  customerInput: Scalars['JSON']['output'];
  /** Projected value for payment model. */
  paymentModel: Maybe<Scalars['String']['output']>;
  /** Stable provider code. */
  providerCode: Scalars['String']['output'];
  /** Projected value for provider snapshot. */
  providerSnapshot: Scalars['JSON']['output'];
  /** Projected value for title. */
  title: Scalars['String']['output'];
  /** Projected value for type. */
  type: Scalars['String']['output'];
};

/** Closed set of order delivery status values used by Orders Admin API. */
export enum ApiOrderDeliveryStatus {
  /** Cancelled value of order delivery status. */
  Cancelled = 'CANCELLED',
  /** Delayed value of order delivery status. */
  Delayed = 'DELAYED',
  /** Delivered value of order delivery status. */
  Delivered = 'DELIVERED',
  /** Delivery attempted value of order delivery status. */
  DeliveryAttempted = 'DELIVERY_ATTEMPTED',
  /** Exception value of order delivery status. */
  Exception = 'EXCEPTION',
  /** In transit value of order delivery status. */
  InTransit = 'IN_TRANSIT',
  /** Not shipped value of order delivery status. */
  NotShipped = 'NOT_SHIPPED',
  /** Out for delivery value of order delivery status. */
  OutForDelivery = 'OUT_FOR_DELIVERY',
  /** Partially shipped value of order delivery status. */
  PartiallyShipped = 'PARTIALLY_SHIPPED',
  /** Returned to sender value of order delivery status. */
  ReturnedToSender = 'RETURNED_TO_SENDER',
  /** Shipped value of order delivery status. */
  Shipped = 'SHIPPED'
}

/** Comparison operators for order delivery status; omitted operators do not constrain results. */
export type ApiOrderDeliveryStatusFilterInput = {
  /** Validated input value for eq. */
  eq?: InputMaybe<ApiOrderDeliveryStatus>;
  /** Validated input value for in. */
  in?: InputMaybe<Array<ApiOrderDeliveryStatus>>;
};

/** Validated input for dimensions. Tenant identifiers come only from trusted context. */
export type ApiOrderDimensionsInput = {
  /** Validated input value for height. */
  height: Scalars['Float']['input'];
  /** Validated input value for length. */
  length: Scalars['Float']['input'];
  /** Validated input value for unit. */
  unit: ApiDimensionUnit;
  /** Validated input value for width. */
  width: Scalars['Float']['input'];
};

/** Orders Admin representation of order discount. */
export type ApiOrderDiscount = ApiNode & {
  __typename?: 'OrderDiscount';
  /** Exact decimal amount serialized as a string. */
  amount: ApiMoney;
  /** Stable machine-readable code. */
  code: Maybe<Scalars['String']['output']>;
  /** Relay global ID of this resource. */
  id: Scalars['ID']['output'];
  /** Projected value for metadata. */
  metadata: Scalars['JSON']['output'];
  /** Projected value for source. */
  source: Scalars['String']['output'];
  /** Projected value for target. */
  target: Scalars['String']['output'];
  /** Projected value for title. */
  title: Scalars['String']['output'];
  /** Projected value for value. */
  value: Scalars['Decimal']['output'];
};

/** Cursor and resource pair for a order connection. */
export type ApiOrderEdge = {
  __typename?: 'OrderEdge';
  /** Opaque Relay cursor for this edge. */
  cursor: Scalars['String']['output'];
  /** Projected value for node. */
  node: ApiOrder;
};

/** Validated input for order edit abandon. Tenant identifiers come only from trusted context. */
export type ApiOrderEditAbandonInput = {
  /** Relay global ID identifying the edit. */
  editId: Scalars['ID']['input'];
};

/** Validated input for order edit begin. Tenant identifiers come only from trusted context. */
export type ApiOrderEditBeginInput = {
  /** Relay global ID identifying the order. */
  orderId: Scalars['ID']['input'];
};

/** Orders Admin representation of order edit change. */
export type ApiOrderEditChange = ApiNode & {
  __typename?: 'OrderEditChange';
  /** Timestamp for created, or null when it has not occurred. */
  createdAt: Scalars['DateTime']['output'];
  /** Relay global ID of this resource. */
  id: Scalars['ID']['output'];
  /** Projected value for kind. */
  kind: Scalars['String']['output'];
  /** Projected value for payload. */
  payload: Scalars['JSON']['output'];
};

/** Validated input for order edit commit. Tenant identifiers come only from trusted context. */
export type ApiOrderEditCommitInput = {
  /** Relay global ID identifying the edit. */
  editId: Scalars['ID']['input'];
  /** Whether completion should enqueue a customer notification. */
  notifyCustomer?: InputMaybe<Scalars['Boolean']['input']>;
  /** Validated input value for staff note. */
  staffNote?: InputMaybe<Scalars['String']['input']>;
};

/** Validated input for order edit discount add. Tenant identifiers come only from trusted context. */
export type ApiOrderEditDiscountAddInput = {
  /** Exact decimal amount serialized as a string. */
  amount: ApiMoneyInput;
  /** Relay global ID identifying the edit. */
  editId: Scalars['ID']['input'];
  /** Stable audited reason code. */
  reasonCode: Scalars['String']['input'];
  /** Validated input value for title. */
  title: Scalars['String']['input'];
};

/** Validated input for order edit discount remove. Tenant identifiers come only from trusted context. */
export type ApiOrderEditDiscountRemoveInput = {
  /** Relay global ID identifying the discount. */
  discountId: Scalars['ID']['input'];
  /** Relay global ID identifying the edit. */
  editId: Scalars['ID']['input'];
};

/** Validated input for order edit line add. Tenant identifiers come only from trusted context. */
export type ApiOrderEditLineAddInput = {
  /** Relay global ID identifying the edit. */
  editId: Scalars['ID']['input'];
  /** Validated input value for line. */
  line: ApiOrderLineCreateInput;
};

/** Validated input for order edit line remove. Tenant identifiers come only from trusted context. */
export type ApiOrderEditLineRemoveInput = {
  /** Relay global ID identifying the edit. */
  editId: Scalars['ID']['input'];
  /** Relay global ID identifying the line. */
  lineId: Scalars['ID']['input'];
};

/** Validated input for order edit line update. Tenant identifiers come only from trusted context. */
export type ApiOrderEditLineUpdateInput = {
  /** Relay global ID identifying the edit. */
  editId: Scalars['ID']['input'];
  /** Relay global ID identifying the line. */
  lineId: Scalars['ID']['input'];
  /** Quantity validated against domain conservation invariants. */
  quantity?: InputMaybe<Scalars['Int']['input']>;
  /** Validated input value for unit price. */
  unitPrice?: InputMaybe<ApiMoneyInput>;
};

/** Mutation result for order edit; expected failures are returned in userErrors. */
export type ApiOrderEditPayload = {
  __typename?: 'OrderEditPayload';
  /** Projected value for edit. */
  edit: Maybe<ApiOrderEditSession>;
  /** Fresh order projection returned after the command. */
  order: Maybe<ApiOrder>;
  /** Expected validation, permission, concurrency, and business-rule failures; empty on success. */
  userErrors: Array<ApiOrderUserError>;
};

/** Isolated and previewable staged edit for an OPEN order. */
export type ApiOrderEditSession = ApiNode & {
  __typename?: 'OrderEditSession';
  /** Projected value for base order version. */
  baseOrderVersion: Scalars['Int']['output'];
  /** Projected value for calculated order. */
  calculatedOrder: ApiCalculatedOrder;
  /** Projected value for changes. */
  changes: Array<ApiOrderEditChange>;
  /** Timestamp for created, or null when it has not occurred. */
  createdAt: Scalars['DateTime']['output'];
  /** Projected value for created by. */
  createdBy: ApiOrderActor;
  /** Timestamp for expires, or null when it has not occurred. */
  expiresAt: Scalars['DateTime']['output'];
  /** Relay global ID of this resource. */
  id: Scalars['ID']['output'];
  /** Fresh order projection returned after the command. */
  order: ApiOrder;
  /** Current lifecycle or derived projection status. */
  status: Scalars['String']['output'];
  /** Internal aggregate version. */
  version: Scalars['Int']['output'];
};

/** Validated input for order edit shipping update. Tenant identifiers come only from trusted context. */
export type ApiOrderEditShippingUpdateInput = {
  /** Relay global ID identifying the edit. */
  editId: Scalars['ID']['input'];
  /** Validated input value for shipping. */
  shipping: ApiOrderDeliveryInput;
};

/** Exchange linking inbound return quantities with outbound replacement lines. */
export type ApiOrderExchange = ApiNode & {
  __typename?: 'OrderExchange';
  /** Projected value for balance. */
  balance: ApiMoney;
  /** Timestamp for created, or null when it has not occurred. */
  createdAt: Scalars['DateTime']['output'];
  /** Relay global ID of this resource. */
  id: Scalars['ID']['output'];
  /** Projected value for inbound lines. */
  inboundLines: Array<ApiOrderReturnLine>;
  /** Fresh order projection returned after the command. */
  order: ApiOrder;
  /** Projected value for outbound lines. */
  outboundLines: Array<ApiOrderLine>;
  /** Current lifecycle or derived projection status. */
  status: ApiOrderExchangeStatus;
  /** Timestamp for updated, or null when it has not occurred. */
  updatedAt: Scalars['DateTime']['output'];
  /** Internal aggregate version. */
  version: Scalars['Int']['output'];
};

/** Validated input for order exchange cancel. Tenant identifiers come only from trusted context. */
export type ApiOrderExchangeCancelInput = {
  /** Relay global ID identifying the exchange. */
  exchangeId: Scalars['ID']['input'];
  /** Stable audited reason code. */
  reasonCode: Scalars['String']['input'];
};

/** Validated input for order exchange complete. Tenant identifiers come only from trusted context. */
export type ApiOrderExchangeCompleteInput = {
  /** Relay global ID identifying the exchange. */
  exchangeId: Scalars['ID']['input'];
  /** Whether completion should enqueue a customer notification. */
  notifyCustomer?: InputMaybe<Scalars['Boolean']['input']>;
  /** Validated input value for staff note. */
  staffNote?: InputMaybe<Scalars['String']['input']>;
};

/** Relay-style paginated connection of order exchange resources. */
export type ApiOrderExchangeConnection = ApiConnection & {
  __typename?: 'OrderExchangeConnection';
  /** Cursor and resource pairs in this page. */
  edges: Array<ApiOrderExchangeEdge>;
  /** Resources in this page. */
  nodes: Array<ApiOrderExchange>;
  /** Relay pagination metadata. */
  pageInfo: ApiPageInfo;
  /** Total matching resources before pagination. */
  totalCount: Scalars['Int']['output'];
};

/** Validated input for order exchange create. Tenant identifiers come only from trusted context. */
export type ApiOrderExchangeCreateInput = {
  /** Validated input value for inbound lines. */
  inboundLines: Array<ApiOrderReturnLineInput>;
  /** Whether completion should enqueue a customer notification. */
  notifyCustomer?: InputMaybe<Scalars['Boolean']['input']>;
  /** Relay global ID identifying the order. */
  orderId: Scalars['ID']['input'];
  /** Validated input value for outbound lines. */
  outboundLines: Array<ApiOrderLineCreateInput>;
  /** Validated input value for staff note. */
  staffNote?: InputMaybe<Scalars['String']['input']>;
};

/** Cursor and resource pair for a order exchange connection. */
export type ApiOrderExchangeEdge = {
  __typename?: 'OrderExchangeEdge';
  /** Opaque Relay cursor for this edge. */
  cursor: Scalars['String']['output'];
  /** Projected value for node. */
  node: ApiOrderExchange;
};

/** Mutation result for order exchange; expected failures are returned in userErrors. */
export type ApiOrderExchangePayload = {
  __typename?: 'OrderExchangePayload';
  /** Projected value for exchange. */
  exchange: Maybe<ApiOrderExchange>;
  /** Fresh order projection returned after the command. */
  order: Maybe<ApiOrder>;
  /** Expected validation, permission, concurrency, and business-rule failures; empty on success. */
  userErrors: Array<ApiOrderUserError>;
};

/** Closed set of order exchange status values used by Orders Admin API. */
export enum ApiOrderExchangeStatus {
  /** Cancelled value of order exchange status. */
  Cancelled = 'CANCELLED',
  /** Completed value of order exchange status. */
  Completed = 'COMPLETED',
  /** Open value of order exchange status. */
  Open = 'OPEN',
  /** Requested value of order exchange status. */
  Requested = 'REQUESTED'
}

/** Closed set of order fulfillment status values used by Orders Admin API. */
export enum ApiOrderFulfillmentStatus {
  /** Cancelled value of order fulfillment status. */
  Cancelled = 'CANCELLED',
  /** Fulfilled value of order fulfillment status. */
  Fulfilled = 'FULFILLED',
  /** On hold value of order fulfillment status. */
  OnHold = 'ON_HOLD',
  /** Partially fulfilled value of order fulfillment status. */
  PartiallyFulfilled = 'PARTIALLY_FULFILLED',
  /** Scheduled value of order fulfillment status. */
  Scheduled = 'SCHEDULED',
  /** Unfulfilled value of order fulfillment status. */
  Unfulfilled = 'UNFULFILLED'
}

/** Comparison operators for order fulfillment status; omitted operators do not constrain results. */
export type ApiOrderFulfillmentStatusFilterInput = {
  /** Validated input value for eq. */
  eq?: InputMaybe<ApiOrderFulfillmentStatus>;
  /** Validated input value for in. */
  in?: InputMaybe<Array<ApiOrderFulfillmentStatus>>;
};

/** Closed set of order integration kind values used by Orders Admin API. */
export enum ApiOrderIntegrationKind {
  /** Analytics value of order integration kind. */
  Analytics = 'ANALYTICS',
  /** Crm value of order integration kind. */
  Crm = 'CRM',
  /** Erp value of order integration kind. */
  Erp = 'ERP',
  /** Marketplace value of order integration kind. */
  Marketplace = 'MARKETPLACE',
  /** Wms value of order integration kind. */
  Wms = 'WMS'
}

/** Pinned relationship and synchronization state for a CRM, ERP, marketplace, WMS, or analytics integration. */
export type ApiOrderIntegrationLink = ApiNode & {
  __typename?: 'OrderIntegrationLink';
  /** Stable app code. */
  appCode: Scalars['String']['output'];
  /** Timestamp for created, or null when it has not occurred. */
  createdAt: Scalars['DateTime']['output'];
  /** Projected value for direction. */
  direction: ApiOrderSyncDirection;
  /** Relay global ID identifying the external. */
  externalId: Maybe<Scalars['String']['output']>;
  /** Projected value for external url. */
  externalUrl: Maybe<Scalars['URL']['output']>;
  /** Relay global ID of this resource. */
  id: Scalars['ID']['output'];
  /** Relay global ID identifying the installation. */
  installationId: Scalars['ID']['output'];
  /** Projected value for kind. */
  kind: ApiOrderIntegrationKind;
  /** Stable last error code. */
  lastErrorCode: Maybe<Scalars['String']['output']>;
  /** Projected value for last error message. */
  lastErrorMessage: Maybe<Scalars['String']['output']>;
  /** Projected value for last exported order version. */
  lastExportedOrderVersion: Maybe<Scalars['Int']['output']>;
  /** Projected value for last imported external version. */
  lastImportedExternalVersion: Maybe<Scalars['String']['output']>;
  /** Timestamp for last synced, or null when it has not occurred. */
  lastSyncedAt: Maybe<Scalars['DateTime']['output']>;
  /** Current lifecycle or derived projection status. */
  status: ApiOrderIntegrationSyncStatus;
  /** Timestamp for updated, or null when it has not occurred. */
  updatedAt: Scalars['DateTime']['output'];
};

/** Validated input for order integration link detach. Tenant identifiers come only from trusted context. */
export type ApiOrderIntegrationLinkDetachInput = {
  /** Relay global ID identifying the integration link. */
  integrationLinkId: Scalars['ID']['input'];
  /** Relay global ID identifying the order. */
  orderId: Scalars['ID']['input'];
  /** Validated input value for reason. */
  reason: Scalars['String']['input'];
};

/** Validated input for order integration sync request. Tenant identifiers come only from trusted context. */
export type ApiOrderIntegrationSyncRequestInput = {
  /** Validated input value for force. */
  force?: InputMaybe<Scalars['Boolean']['input']>;
  /** Relay global ID identifying the integration link. */
  integrationLinkId: Scalars['ID']['input'];
  /** Relay global ID identifying the order. */
  orderId: Scalars['ID']['input'];
};

/** Validated input for order integration sync retry. Tenant identifiers come only from trusted context. */
export type ApiOrderIntegrationSyncRetryInput = {
  /** Relay global ID identifying the operation. */
  operationId: Scalars['ID']['input'];
  /** Relay global ID identifying the order. */
  orderId: Scalars['ID']['input'];
};

/** Closed set of order integration sync status values used by Orders Admin API. */
export enum ApiOrderIntegrationSyncStatus {
  /** Disabled value of order integration sync status. */
  Disabled = 'DISABLED',
  /** Failed value of order integration sync status. */
  Failed = 'FAILED',
  /** Never synced value of order integration sync status. */
  NeverSynced = 'NEVER_SYNCED',
  /** Out of sync value of order integration sync status. */
  OutOfSync = 'OUT_OF_SYNC',
  /** Pending value of order integration sync status. */
  Pending = 'PENDING',
  /** Synced value of order integration sync status. */
  Synced = 'SYNCED'
}

/** Commercial line snapshot with conserved ordered, cancelled, fulfillable, fulfilled, returnable, returned, and refundable quantities. */
export type ApiOrderLine = ApiNode & {
  __typename?: 'OrderLine';
  /** Projected cancelled quantity. */
  cancelledQuantity: Scalars['Int']['output'];
  /** Projected value for cost. */
  cost: ApiOrderLineCost;
  /** Timestamp for created, or null when it has not occurred. */
  createdAt: Scalars['DateTime']['output'];
  /** Merchant-defined structured data; core business facts are not stored here. */
  customFields: Scalars['JSON']['output'];
  /** Projected fulfillable quantity. */
  fulfillableQuantity: Scalars['Int']['output'];
  /** Projected fulfilled quantity. */
  fulfilledQuantity: Scalars['Int']['output'];
  /** Relay global ID of this resource. */
  id: Scalars['ID']['output'];
  /** Projected value for image url. */
  imageUrl: Maybe<Scalars['URL']['output']>;
  /** Projected value for parent line. */
  parentLine: Maybe<ApiOrderLine>;
  /** Relay global ID identifying the product. */
  productId: Maybe<Scalars['ID']['output']>;
  /** Relay global ID identifying the purchasable. */
  purchasableId: Maybe<Scalars['ID']['output']>;
  /** Projected value for purchasable snapshot. */
  purchasableSnapshot: Scalars['JSON']['output'];
  /** Quantity validated against domain conservation invariants. */
  quantity: Scalars['Int']['output'];
  /** Projected refundable quantity. */
  refundableQuantity: Scalars['Int']['output'];
  /** Projected value for requires shipping. */
  requiresShipping: Scalars['Boolean']['output'];
  /** Projected returnable quantity. */
  returnableQuantity: Scalars['Int']['output'];
  /** Projected returned quantity. */
  returnedQuantity: Scalars['Int']['output'];
  /** Projected value for sku. */
  sku: Maybe<Scalars['String']['output']>;
  /** Projected value for taxable. */
  taxable: Scalars['Boolean']['output'];
  /** Projected value for title. */
  title: Scalars['String']['output'];
  /** Projected value for unit cost. */
  unitCost: Maybe<ApiMoney>;
  /** Timestamp for updated, or null when it has not occurred. */
  updatedAt: Scalars['DateTime']['output'];
  /** Relay global ID identifying the variant. */
  variantId: Maybe<Scalars['ID']['output']>;
  /** Internal aggregate version. */
  version: Scalars['Int']['output'];
  /** Projected value for weight. */
  weight: Maybe<ApiWeight>;
};

/** Validated input for order line add. Tenant identifiers come only from trusted context. */
export type ApiOrderLineAddInput = {
  /** Validated input value for line. */
  line: ApiOrderLineCreateInput;
  /** Relay global ID identifying the order. */
  orderId: Scalars['ID']['input'];
};

/** Orders Admin representation of order line cost. */
export type ApiOrderLineCost = {
  __typename?: 'OrderLineCost';
  /** Monetary discount in the order currency. */
  discountAmount: ApiMoney;
  /** Monetary duty in the order currency. */
  dutyAmount: ApiMoney;
  /** Monetary subtotal in the order currency. */
  subtotalAmount: ApiMoney;
  /** Monetary tax in the order currency. */
  taxAmount: ApiMoney;
  /** Monetary total in the order currency. */
  totalAmount: ApiMoney;
  /** Projected value for unit compare at price. */
  unitCompareAtPrice: Maybe<ApiMoney>;
  /** Projected value for unit price. */
  unitPrice: ApiMoney;
};

/** Validated input for order line create. Tenant identifiers come only from trusted context. */
export type ApiOrderLineCreateInput = {
  /** Merchant-defined structured data; core business facts are not stored here. */
  customFields?: InputMaybe<Scalars['JSON']['input']>;
  /** Relay global ID identifying the purchasable. */
  purchasableId?: InputMaybe<Scalars['ID']['input']>;
  /** Quantity validated against domain conservation invariants. */
  quantity: Scalars['Int']['input'];
  /** Validated input value for requires shipping. */
  requiresShipping?: InputMaybe<Scalars['Boolean']['input']>;
  /** Validated input value for sku. */
  sku?: InputMaybe<Scalars['String']['input']>;
  /** Validated input value for taxable. */
  taxable?: InputMaybe<Scalars['Boolean']['input']>;
  /** Validated input value for title. */
  title: Scalars['String']['input'];
  /** Validated input value for unit compare at price. */
  unitCompareAtPrice?: InputMaybe<ApiMoneyInput>;
  /** Validated input value for unit cost. */
  unitCost?: InputMaybe<ApiMoneyInput>;
  /** Validated input value for unit price. */
  unitPrice: ApiMoneyInput;
  /** Validated input value for weight. */
  weight?: InputMaybe<ApiOrderWeightInput>;
};

/** Validated input for order line delete. Tenant identifiers come only from trusted context. */
export type ApiOrderLineDeleteInput = {
  /** Relay global ID identifying the line. */
  lineId: Scalars['ID']['input'];
  /** Relay global ID identifying the order. */
  orderId: Scalars['ID']['input'];
};

/** Mutation result for order line; expected failures are returned in userErrors. */
export type ApiOrderLinePayload = {
  __typename?: 'OrderLinePayload';
  /** Projected value for line. */
  line: Maybe<ApiOrderLine>;
  /** Fresh order projection returned after the command. */
  order: Maybe<ApiOrder>;
  /** Expected validation, permission, concurrency, and business-rule failures; empty on success. */
  userErrors: Array<ApiOrderUserError>;
};

/** Validated input for order line update. Tenant identifiers come only from trusted context. */
export type ApiOrderLineUpdateInput = {
  /** Merchant-defined structured data; core business facts are not stored here. */
  customFields?: InputMaybe<Scalars['JSON']['input']>;
  /** Relay global ID identifying the line. */
  lineId: Scalars['ID']['input'];
  /** Relay global ID identifying the order. */
  orderId: Scalars['ID']['input'];
  /** Quantity validated against domain conservation invariants. */
  quantity?: InputMaybe<Scalars['Int']['input']>;
  /** Validated input value for unit cost. */
  unitCost?: InputMaybe<ApiMoneyInput>;
  /** Validated input value for weight. */
  weight?: InputMaybe<ApiOrderWeightInput>;
};

/** Validated input for order manual payment record. Tenant identifiers come only from trusted context. */
export type ApiOrderManualPaymentRecordInput = {
  /** Exact decimal amount serialized as a string. */
  amount: ApiMoneyInput;
  /** Stable method code. */
  methodCode: Scalars['String']['input'];
  /** Validated input value for note. */
  note?: InputMaybe<Scalars['String']['input']>;
  /** Relay global ID identifying the order. */
  orderId: Scalars['ID']['input'];
  /** Timestamp for paid, or null when it has not occurred. */
  paidAt: Scalars['DateTime']['input'];
  /** Validated input value for reference. */
  reference?: InputMaybe<Scalars['String']['input']>;
};

/** Durable DBOS operation handle for polling progress and terminal outcome. */
export type ApiOrderOperation = ApiNode & {
  __typename?: 'OrderOperation';
  /** Timestamp for completed, or null when it has not occurred. */
  completedAt: Maybe<Scalars['DateTime']['output']>;
  /** Timestamp for created, or null when it has not occurred. */
  createdAt: Scalars['DateTime']['output'];
  /** Stable failure code. */
  failureCode: Maybe<Scalars['String']['output']>;
  /** Projected value for failure message. */
  failureMessage: Maybe<Scalars['String']['output']>;
  /** Relay global ID of this resource. */
  id: Scalars['ID']['output'];
  /** Projected value for kind. */
  kind: ApiOrderOperationKind;
  /** Fresh order projection returned after the command. */
  order: Maybe<ApiOrder>;
  /** Projected value for progress. */
  progress: Maybe<Scalars['Int']['output']>;
  /** Relay global ID identifying the resource. */
  resourceId: Maybe<Scalars['ID']['output']>;
  /** Whether retrying after transient state changes may succeed. */
  retryable: Scalars['Boolean']['output'];
  /** Timestamp for started, or null when it has not occurred. */
  startedAt: Maybe<Scalars['DateTime']['output']>;
  /** Current lifecycle or derived projection status. */
  status: ApiOrderOperationStatus;
};

/** Closed set of order operation kind values used by Orders Admin API. */
export enum ApiOrderOperationKind {
  /** Bulk action value of order operation kind. */
  BulkAction = 'BULK_ACTION',
  /** Fulfillment cancel value of order operation kind. */
  FulfillmentCancel = 'FULFILLMENT_CANCEL',
  /** Fulfillment submit value of order operation kind. */
  FulfillmentSubmit = 'FULFILLMENT_SUBMIT',
  /** Integration sync value of order operation kind. */
  IntegrationSync = 'INTEGRATION_SYNC',
  /** Order cancel value of order operation kind. */
  OrderCancel = 'ORDER_CANCEL',
  /** Order edit commit value of order operation kind. */
  OrderEditCommit = 'ORDER_EDIT_COMMIT',
  /** Payment capture value of order operation kind. */
  PaymentCapture = 'PAYMENT_CAPTURE',
  /** Payment refund value of order operation kind. */
  PaymentRefund = 'PAYMENT_REFUND',
  /** Payment retry value of order operation kind. */
  PaymentRetry = 'PAYMENT_RETRY',
  /** Payment void value of order operation kind. */
  PaymentVoid = 'PAYMENT_VOID',
  /** Return receive value of order operation kind. */
  ReturnReceive = 'RETURN_RECEIVE',
  /** Shipment cancel value of order operation kind. */
  ShipmentCancel = 'SHIPMENT_CANCEL',
  /** Shipment create value of order operation kind. */
  ShipmentCreate = 'SHIPMENT_CREATE',
  /** Shipment reconcile value of order operation kind. */
  ShipmentReconcile = 'SHIPMENT_RECONCILE'
}

/** Mutation result for order operation; expected failures are returned in userErrors. */
export type ApiOrderOperationPayload = {
  __typename?: 'OrderOperationPayload';
  /** Durable operation returned for polling asynchronous work. */
  operation: Maybe<ApiOrderOperation>;
  /** Fresh order projection returned after the command. */
  order: Maybe<ApiOrder>;
  /** Expected validation, permission, concurrency, and business-rule failures; empty on success. */
  userErrors: Array<ApiOrderUserError>;
};

/** Closed set of order operation status values used by Orders Admin API. */
export enum ApiOrderOperationStatus {
  /** Cancelled value of order operation status. */
  Cancelled = 'CANCELLED',
  /** Failed value of order operation status. */
  Failed = 'FAILED',
  /** Pending value of order operation status. */
  Pending = 'PENDING',
  /** Running value of order operation status. */
  Running = 'RUNNING',
  /** Succeeded value of order operation status. */
  Succeeded = 'SUCCEEDED'
}

/** Validated input for order order by. Tenant identifiers come only from trusted context. */
export type ApiOrderOrderByInput = {
  /** Validated input value for direction. */
  direction: ApiOrderSortDirection;
  /** Input path associated with the error, when applicable. */
  field: ApiOrderSortField;
};

/** Closed set of order origin values used by Orders Admin API. */
export enum ApiOrderOrigin {
  /** Admin value of order origin. */
  Admin = 'ADMIN',
  /** Api value of order origin. */
  Api = 'API',
  /** Checkout value of order origin. */
  Checkout = 'CHECKOUT',
  /** Crm value of order origin. */
  Crm = 'CRM',
  /** Import value of order origin. */
  Import = 'IMPORT',
  /** Marketplace value of order origin. */
  Marketplace = 'MARKETPLACE'
}

/** Mutation result for order; expected failures are returned in userErrors. */
export type ApiOrderPayload = {
  __typename?: 'OrderPayload';
  /** Fresh order projection returned after the command. */
  order: Maybe<ApiOrder>;
  /** Expected validation, permission, concurrency, and business-rule failures; empty on success. */
  userErrors: Array<ApiOrderUserError>;
};

/** Read-only financial projection derived from attempts, transactions, refunds, and disputes. */
export type ApiOrderPayment = {
  __typename?: 'OrderPayment';
  /** Projected value for attempts. */
  attempts: Array<ApiOrderPaymentAttempt>;
  /** Monetary authorized in the order currency. */
  authorizedAmount: ApiMoney;
  /** Monetary captured in the order currency. */
  capturedAmount: ApiMoney;
  /** Projected value for disputes. */
  disputes: Array<ApiOrderPaymentDispute>;
  /** Monetary outstanding in the order currency. */
  outstandingAmount: ApiMoney;
  /** Monetary refunded in the order currency. */
  refundedAmount: ApiMoney;
  /** Projected value for selected method. */
  selectedMethod: Maybe<ApiOrderPaymentMethod>;
  /** Current lifecycle or derived projection status. */
  status: ApiOrderPaymentStatus;
  /** Projected value for transactions. */
  transactions: Array<ApiOrderPaymentTransaction>;
  /** Monetary voided in the order currency. */
  voidedAmount: ApiMoney;
};

/** Orders Admin representation of order payment attempt. */
export type ApiOrderPaymentAttempt = ApiNode & {
  __typename?: 'OrderPaymentAttempt';
  /** Timestamp for created, or null when it has not occurred. */
  createdAt: Scalars['DateTime']['output'];
  /** Projected value for customer action. */
  customerAction: Maybe<Scalars['JSON']['output']>;
  /** Timestamp for expires, or null when it has not occurred. */
  expiresAt: Maybe<Scalars['DateTime']['output']>;
  /** Stable failure code. */
  failureCode: Maybe<Scalars['String']['output']>;
  /** Projected value for failure message. */
  failureMessage: Maybe<Scalars['String']['output']>;
  /** Relay global ID of this resource. */
  id: Scalars['ID']['output'];
  /** Timestamp for processed, or null when it has not occurred. */
  processedAt: Maybe<Scalars['DateTime']['output']>;
  /** Stable provider code. */
  providerCode: Scalars['String']['output'];
  /** Projected value for provider reference. */
  providerReference: Maybe<Scalars['String']['output']>;
  /** Monetary requested in the order currency. */
  requestedAmount: ApiMoney;
  /** Current lifecycle or derived projection status. */
  status: ApiOrderPaymentStatus;
  /** Timestamp for updated, or null when it has not occurred. */
  updatedAt: Scalars['DateTime']['output'];
};

/** Validated input for order payment capture. Tenant identifiers come only from trusted context. */
export type ApiOrderPaymentCaptureInput = {
  /** Exact decimal amount serialized as a string. */
  amount?: InputMaybe<ApiMoneyInput>;
  /** Relay global ID identifying the order. */
  orderId: Scalars['ID']['input'];
  /** Relay global ID identifying the transaction. */
  transactionId: Scalars['ID']['input'];
};

/** Orders Admin representation of order payment dispute. */
export type ApiOrderPaymentDispute = ApiNode & {
  __typename?: 'OrderPaymentDispute';
  /** Exact decimal amount serialized as a string. */
  amount: ApiMoney;
  /** Timestamp for created, or null when it has not occurred. */
  createdAt: Scalars['DateTime']['output'];
  /** Relay global ID of this resource. */
  id: Scalars['ID']['output'];
  /** Stable provider code. */
  providerCode: Scalars['String']['output'];
  /** Projected value for provider reference. */
  providerReference: Scalars['String']['output'];
  /** Projected value for reason. */
  reason: Maybe<Scalars['String']['output']>;
  /** Timestamp for resolved, or null when it has not occurred. */
  resolvedAt: Maybe<Scalars['DateTime']['output']>;
  /** Timestamp for response due, or null when it has not occurred. */
  responseDueAt: Maybe<Scalars['DateTime']['output']>;
  /** Current lifecycle or derived projection status. */
  status: Scalars['String']['output'];
  /** Timestamp for updated, or null when it has not occurred. */
  updatedAt: Scalars['DateTime']['output'];
};

/** Orders Admin representation of order payment method. */
export type ApiOrderPaymentMethod = {
  __typename?: 'OrderPaymentMethod';
  /** Stable machine-readable code. */
  code: Scalars['String']['output'];
  /** Projected value for customer input. */
  customerInput: Scalars['JSON']['output'];
  /** Projected value for flow. */
  flow: Scalars['String']['output'];
  /** Stable provider code. */
  providerCode: Scalars['String']['output'];
  /** Projected value for provider snapshot. */
  providerSnapshot: Scalars['JSON']['output'];
  /** Projected value for title. */
  title: Scalars['String']['output'];
};

/** Validated input for order payment retry. Tenant identifiers come only from trusted context. */
export type ApiOrderPaymentRetryInput = {
  /** Relay global ID identifying the order. */
  orderId: Scalars['ID']['input'];
  /** Stable payment method code. */
  paymentMethodCode?: InputMaybe<Scalars['String']['input']>;
  /** Validated input value for return url. */
  returnUrl?: InputMaybe<Scalars['URL']['input']>;
};

/** Closed set of order payment status values used by Orders Admin API. */
export enum ApiOrderPaymentStatus {
  /** Authorized value of order payment status. */
  Authorized = 'AUTHORIZED',
  /** Expired value of order payment status. */
  Expired = 'EXPIRED',
  /** Failed value of order payment status. */
  Failed = 'FAILED',
  /** Not required value of order payment status. */
  NotRequired = 'NOT_REQUIRED',
  /** Paid value of order payment status. */
  Paid = 'PAID',
  /** Partially paid value of order payment status. */
  PartiallyPaid = 'PARTIALLY_PAID',
  /** Partially refunded value of order payment status. */
  PartiallyRefunded = 'PARTIALLY_REFUNDED',
  /** Pending value of order payment status. */
  Pending = 'PENDING',
  /** Refunded value of order payment status. */
  Refunded = 'REFUNDED',
  /** Voided value of order payment status. */
  Voided = 'VOIDED'
}

/** Comparison operators for order payment status; omitted operators do not constrain results. */
export type ApiOrderPaymentStatusFilterInput = {
  /** Validated input value for eq. */
  eq?: InputMaybe<ApiOrderPaymentStatus>;
  /** Validated input value for in. */
  in?: InputMaybe<Array<ApiOrderPaymentStatus>>;
};

/** Validated input for order payment status override. Tenant identifiers come only from trusted context. */
export type ApiOrderPaymentStatusOverrideInput = {
  /** Validated input value for note. */
  note: Scalars['String']['input'];
  /** Relay global ID identifying the order. */
  orderId: Scalars['ID']['input'];
  /** Stable audited reason code. */
  reasonCode: Scalars['String']['input'];
  /** Current lifecycle or derived projection status. */
  status: ApiOrderPaymentStatus;
};

/** Immutable authorization, capture, sale, refund, void, manual payment, or adjustment fact. */
export type ApiOrderPaymentTransaction = ApiNode & {
  __typename?: 'OrderPaymentTransaction';
  /** Exact decimal amount serialized as a string. */
  amount: ApiMoney;
  /** Timestamp for created, or null when it has not occurred. */
  createdAt: Scalars['DateTime']['output'];
  /** Stable failure code. */
  failureCode: Maybe<Scalars['String']['output']>;
  /** Projected value for failure message. */
  failureMessage: Maybe<Scalars['String']['output']>;
  /** Relay global ID of this resource. */
  id: Scalars['ID']['output'];
  /** Projected value for kind. */
  kind: ApiOrderPaymentTransactionKind;
  /** Projected value for parent transaction. */
  parentTransaction: Maybe<ApiOrderPaymentTransaction>;
  /** Timestamp for processed, or null when it has not occurred. */
  processedAt: Maybe<Scalars['DateTime']['output']>;
  /** Stable provider code. */
  providerCode: Scalars['String']['output'];
  /** Projected value for provider reference. */
  providerReference: Maybe<Scalars['String']['output']>;
  /** Current lifecycle or derived projection status. */
  status: ApiOrderPaymentTransactionStatus;
};

/** Closed set of order payment transaction kind values used by Orders Admin API. */
export enum ApiOrderPaymentTransactionKind {
  /** Adjustment value of order payment transaction kind. */
  Adjustment = 'ADJUSTMENT',
  /** Authorization value of order payment transaction kind. */
  Authorization = 'AUTHORIZATION',
  /** Capture value of order payment transaction kind. */
  Capture = 'CAPTURE',
  /** Manual value of order payment transaction kind. */
  Manual = 'MANUAL',
  /** Refund value of order payment transaction kind. */
  Refund = 'REFUND',
  /** Sale value of order payment transaction kind. */
  Sale = 'SALE',
  /** Void value of order payment transaction kind. */
  Void = 'VOID'
}

/** Closed set of order payment transaction status values used by Orders Admin API. */
export enum ApiOrderPaymentTransactionStatus {
  /** Cancelled value of order payment transaction status. */
  Cancelled = 'CANCELLED',
  /** Failure value of order payment transaction status. */
  Failure = 'FAILURE',
  /** Pending value of order payment transaction status. */
  Pending = 'PENDING',
  /** Success value of order payment transaction status. */
  Success = 'SUCCESS'
}

/** Validated input for order payment void. Tenant identifiers come only from trusted context. */
export type ApiOrderPaymentVoidInput = {
  /** Relay global ID identifying the order. */
  orderId: Scalars['ID']['input'];
  /** Validated input value for reason. */
  reason: Scalars['String']['input'];
  /** Relay global ID identifying the transaction. */
  transactionId: Scalars['ID']['input'];
};

/** Closed set of order placement status values used by Orders Admin API. */
export enum ApiOrderPlacementStatus {
  /** Awaiting finalization value of order placement status. */
  AwaitingFinalization = 'AWAITING_FINALIZATION',
  /** Confirmed value of order placement status. */
  Confirmed = 'CONFIRMED',
  /** Failed value of order placement status. */
  Failed = 'FAILED'
}

/** Comparison operators for order placement status; omitted operators do not constrain results. */
export type ApiOrderPlacementStatusFilterInput = {
  /** Validated input value for eq. */
  eq?: InputMaybe<ApiOrderPlacementStatus>;
  /** Validated input value for in. */
  in?: InputMaybe<Array<ApiOrderPlacementStatus>>;
};

/** Refund aggregate and its line and payment-transaction allocations. */
export type ApiOrderRefund = ApiNode & {
  __typename?: 'OrderRefund';
  /** Exact decimal amount serialized as a string. */
  amount: ApiMoney;
  /** Timestamp for created, or null when it has not occurred. */
  createdAt: Scalars['DateTime']['output'];
  /** Relay global ID of this resource. */
  id: Scalars['ID']['output'];
  /** Projected value for lines. */
  lines: Array<ApiOrderRefundLine>;
  /** Projected value for note. */
  note: Maybe<Scalars['String']['output']>;
  /** Fresh order projection returned after the command. */
  order: ApiOrder;
  /** Timestamp for processed, or null when it has not occurred. */
  processedAt: Maybe<Scalars['DateTime']['output']>;
  /** Stable audited reason code. */
  reasonCode: Scalars['String']['output'];
  /** Current lifecycle or derived projection status. */
  status: ApiOrderRefundStatus;
  /** Projected value for transactions. */
  transactions: Array<ApiOrderPaymentTransaction>;
  /** Internal aggregate version. */
  version: Scalars['Int']['output'];
};

/** Relay-style paginated connection of order refund resources. */
export type ApiOrderRefundConnection = ApiConnection & {
  __typename?: 'OrderRefundConnection';
  /** Cursor and resource pairs in this page. */
  edges: Array<ApiOrderRefundEdge>;
  /** Resources in this page. */
  nodes: Array<ApiOrderRefund>;
  /** Relay pagination metadata. */
  pageInfo: ApiPageInfo;
  /** Total matching resources before pagination. */
  totalCount: Scalars['Int']['output'];
};

/** Validated input for order refund create. Tenant identifiers come only from trusted context. */
export type ApiOrderRefundCreateInput = {
  /** Exact decimal amount serialized as a string. */
  amount: ApiMoneyInput;
  /** Validated input value for lines. */
  lines?: InputMaybe<Array<ApiOrderRefundLineInput>>;
  /** Validated input value for note. */
  note?: InputMaybe<Scalars['String']['input']>;
  /** Whether completion should enqueue a customer notification. */
  notifyCustomer?: InputMaybe<Scalars['Boolean']['input']>;
  /** Relay global ID identifying the order. */
  orderId: Scalars['ID']['input'];
  /** Stable audited reason code. */
  reasonCode: Scalars['String']['input'];
  /** Validated input value for transaction allocations. */
  transactionAllocations?: InputMaybe<Array<ApiOrderRefundTransactionAllocationInput>>;
};

/** Cursor and resource pair for a order refund connection. */
export type ApiOrderRefundEdge = {
  __typename?: 'OrderRefundEdge';
  /** Opaque Relay cursor for this edge. */
  cursor: Scalars['String']['output'];
  /** Projected value for node. */
  node: ApiOrderRefund;
};

/** Orders Admin representation of order refund line. */
export type ApiOrderRefundLine = {
  __typename?: 'OrderRefundLine';
  /** Exact decimal amount serialized as a string. */
  amount: ApiMoney;
  /** Projected value for order line. */
  orderLine: Maybe<ApiOrderLine>;
  /** Quantity validated against domain conservation invariants. */
  quantity: Maybe<Scalars['Int']['output']>;
};

/** Validated input for order refund line. Tenant identifiers come only from trusted context. */
export type ApiOrderRefundLineInput = {
  /** Exact decimal amount serialized as a string. */
  amount: ApiMoneyInput;
  /** Relay global ID identifying the order line. */
  orderLineId: Scalars['ID']['input'];
  /** Quantity validated against domain conservation invariants. */
  quantity: Scalars['Int']['input'];
};

/** Closed set of order refund status values used by Orders Admin API. */
export enum ApiOrderRefundStatus {
  /** Cancelled value of order refund status. */
  Cancelled = 'CANCELLED',
  /** Failed value of order refund status. */
  Failed = 'FAILED',
  /** Pending value of order refund status. */
  Pending = 'PENDING',
  /** Succeeded value of order refund status. */
  Succeeded = 'SUCCEEDED'
}

/** Validated input for order refund transaction allocation. Tenant identifiers come only from trusted context. */
export type ApiOrderRefundTransactionAllocationInput = {
  /** Exact decimal amount serialized as a string. */
  amount: ApiMoneyInput;
  /** Relay global ID identifying the transaction. */
  transactionId: Scalars['ID']['input'];
};

/** Validated input for order reopen. Tenant identifiers come only from trusted context. */
export type ApiOrderReopenInput = {
  /** Relay global ID of this resource. */
  id: Scalars['ID']['input'];
  /** Validated input value for reason. */
  reason: Scalars['String']['input'];
};

/** Return request and its approved, transported, received, and disposition quantities. */
export type ApiOrderReturn = ApiNode & {
  __typename?: 'OrderReturn';
  /** Timestamp for approved, or null when it has not occurred. */
  approvedAt: Maybe<Scalars['DateTime']['output']>;
  /** Timestamp for completed, or null when it has not occurred. */
  completedAt: Maybe<Scalars['DateTime']['output']>;
  /** Timestamp for created, or null when it has not occurred. */
  createdAt: Scalars['DateTime']['output'];
  /** Projected value for customer note. */
  customerNote: Maybe<Scalars['String']['output']>;
  /** Relay global ID of this resource. */
  id: Scalars['ID']['output'];
  /** Projected value for lines. */
  lines: Array<ApiOrderReturnLine>;
  /** Fresh order projection returned after the command. */
  order: ApiOrder;
  /** Timestamp for received, or null when it has not occurred. */
  receivedAt: Maybe<Scalars['DateTime']['output']>;
  /** Timestamp for requested, or null when it has not occurred. */
  requestedAt: Scalars['DateTime']['output'];
  /** Projected value for return shipment. */
  returnShipment: Maybe<ApiShipment>;
  /** Projected value for staff note. */
  staffNote: Maybe<Scalars['String']['output']>;
  /** Current lifecycle or derived projection status. */
  status: ApiOrderReturnRequestStatus;
  /** Timestamp for updated, or null when it has not occurred. */
  updatedAt: Scalars['DateTime']['output'];
  /** Internal aggregate version. */
  version: Scalars['Int']['output'];
};

/** Validated input for order return approve. Tenant identifiers come only from trusted context. */
export type ApiOrderReturnApproveInput = {
  /** Validated input value for create return shipment. */
  createReturnShipment?: InputMaybe<Scalars['Boolean']['input']>;
  /** Relay global ID identifying the location. */
  locationId: Scalars['ID']['input'];
  /** Relay global ID identifying the return. */
  returnId: Scalars['ID']['input'];
  /** Validated input value for staff note. */
  staffNote?: InputMaybe<Scalars['String']['input']>;
};

/** Validated input for order return cancel. Tenant identifiers come only from trusted context. */
export type ApiOrderReturnCancelInput = {
  /** Stable audited reason code. */
  reasonCode: Scalars['String']['input'];
  /** Relay global ID identifying the return. */
  returnId: Scalars['ID']['input'];
};

/** Relay-style paginated connection of order return resources. */
export type ApiOrderReturnConnection = ApiConnection & {
  __typename?: 'OrderReturnConnection';
  /** Cursor and resource pairs in this page. */
  edges: Array<ApiOrderReturnEdge>;
  /** Resources in this page. */
  nodes: Array<ApiOrderReturn>;
  /** Relay pagination metadata. */
  pageInfo: ApiPageInfo;
  /** Total matching resources before pagination. */
  totalCount: Scalars['Int']['output'];
};

/** Validated input for order return create. Tenant identifiers come only from trusted context. */
export type ApiOrderReturnCreateInput = {
  /** Validated input value for customer note. */
  customerNote?: InputMaybe<Scalars['String']['input']>;
  /** Validated input value for lines. */
  lines: Array<ApiOrderReturnLineInput>;
  /** Whether completion should enqueue a customer notification. */
  notifyCustomer?: InputMaybe<Scalars['Boolean']['input']>;
  /** Relay global ID identifying the order. */
  orderId: Scalars['ID']['input'];
  /** Validated input value for staff note. */
  staffNote?: InputMaybe<Scalars['String']['input']>;
};

/** Cursor and resource pair for a order return connection. */
export type ApiOrderReturnEdge = {
  __typename?: 'OrderReturnEdge';
  /** Opaque Relay cursor for this edge. */
  cursor: Scalars['String']['output'];
  /** Projected value for node. */
  node: ApiOrderReturn;
};

/** Orders Admin representation of order return line. */
export type ApiOrderReturnLine = {
  __typename?: 'OrderReturnLine';
  /** Projected damaged quantity. */
  damagedQuantity: Scalars['Int']['output'];
  /** Projected value for note. */
  note: Maybe<Scalars['String']['output']>;
  /** Projected value for order line. */
  orderLine: ApiOrderLine;
  /** Quantity validated against domain conservation invariants. */
  quantity: Scalars['Int']['output'];
  /** Stable audited reason code. */
  reasonCode: Scalars['String']['output'];
  /** Projected received quantity. */
  receivedQuantity: Scalars['Int']['output'];
  /** Projected restockable quantity. */
  restockableQuantity: Scalars['Int']['output'];
};

/** Validated input for order return line. Tenant identifiers come only from trusted context. */
export type ApiOrderReturnLineInput = {
  /** Validated input value for note. */
  note?: InputMaybe<Scalars['String']['input']>;
  /** Relay global ID identifying the order line. */
  orderLineId: Scalars['ID']['input'];
  /** Quantity validated against domain conservation invariants. */
  quantity: Scalars['Int']['input'];
  /** Stable audited reason code. */
  reasonCode: Scalars['String']['input'];
};

/** Mutation result for order return; expected failures are returned in userErrors. */
export type ApiOrderReturnPayload = {
  __typename?: 'OrderReturnPayload';
  /** Fresh order projection returned after the command. */
  order: Maybe<ApiOrder>;
  /** Projected value for return. */
  return: Maybe<ApiOrderReturn>;
  /** Expected validation, permission, concurrency, and business-rule failures; empty on success. */
  userErrors: Array<ApiOrderUserError>;
};

/** Validated input for order return receive. Tenant identifiers come only from trusted context. */
export type ApiOrderReturnReceiveInput = {
  /** Validated input value for lines. */
  lines: Array<ApiOrderReturnReceiveLineInput>;
  /** Relay global ID identifying the location. */
  locationId: Scalars['ID']['input'];
  /** Validated input value for refund. */
  refund?: InputMaybe<ApiOrderReturnRefundInput>;
  /** Relay global ID identifying the return. */
  returnId: Scalars['ID']['input'];
};

/** Validated input for order return receive line. Tenant identifiers come only from trusted context. */
export type ApiOrderReturnReceiveLineInput = {
  /** Requested damaged quantity. */
  damagedQuantity: Scalars['Int']['input'];
  /** Relay global ID identifying the order line. */
  orderLineId: Scalars['ID']['input'];
  /** Requested received quantity. */
  receivedQuantity: Scalars['Int']['input'];
  /** Requested restockable quantity. */
  restockableQuantity: Scalars['Int']['input'];
};

/** Validated input for order return refund. Tenant identifiers come only from trusted context. */
export type ApiOrderReturnRefundInput = {
  /** Exact decimal amount serialized as a string. */
  amount: ApiMoneyInput;
  /** Whether completion should enqueue a customer notification. */
  notifyCustomer?: InputMaybe<Scalars['Boolean']['input']>;
  /** Stable audited reason code. */
  reasonCode: Scalars['String']['input'];
};

/** Validated input for order return reject. Tenant identifiers come only from trusted context. */
export type ApiOrderReturnRejectInput = {
  /** Stable audited reason code. */
  reasonCode: Scalars['String']['input'];
  /** Relay global ID identifying the return. */
  returnId: Scalars['ID']['input'];
  /** Validated input value for staff note. */
  staffNote?: InputMaybe<Scalars['String']['input']>;
};

/** Closed set of order return request status values used by Orders Admin API. */
export enum ApiOrderReturnRequestStatus {
  /** Approved value of order return request status. */
  Approved = 'APPROVED',
  /** Cancelled value of order return request status. */
  Cancelled = 'CANCELLED',
  /** Completed value of order return request status. */
  Completed = 'COMPLETED',
  /** In transit value of order return request status. */
  InTransit = 'IN_TRANSIT',
  /** Received value of order return request status. */
  Received = 'RECEIVED',
  /** Rejected value of order return request status. */
  Rejected = 'REJECTED',
  /** Requested value of order return request status. */
  Requested = 'REQUESTED'
}

/** Closed set of order return status values used by Orders Admin API. */
export enum ApiOrderReturnStatus {
  /** None value of order return status. */
  None = 'NONE',
  /** Partially returned value of order return status. */
  PartiallyReturned = 'PARTIALLY_RETURNED',
  /** Requested value of order return status. */
  Requested = 'REQUESTED',
  /** Returned value of order return status. */
  Returned = 'RETURNED'
}

/** Comparison operators for order return status; omitted operators do not constrain results. */
export type ApiOrderReturnStatusFilterInput = {
  /** Validated input value for eq. */
  eq?: InputMaybe<ApiOrderReturnStatus>;
  /** Validated input value for in. */
  in?: InputMaybe<Array<ApiOrderReturnStatus>>;
};

/** Closed set of order risk level values used by Orders Admin API. */
export enum ApiOrderRiskLevel {
  /** High value of order risk level. */
  High = 'HIGH',
  /** Low value of order risk level. */
  Low = 'LOW',
  /** Medium value of order risk level. */
  Medium = 'MEDIUM',
  /** None value of order risk level. */
  None = 'NONE'
}

/** Closed set of sort direction values used by Orders Admin API. */
export enum ApiOrderSortDirection {
  /** Asc value of sort direction. */
  Asc = 'ASC',
  /** Desc value of sort direction. */
  Desc = 'DESC'
}

/** Closed set of order sort field values used by Orders Admin API. */
export enum ApiOrderSortField {
  /** Created at value of order sort field. */
  CreatedAt = 'CREATED_AT',
  /** Customer name value of order sort field. */
  CustomerName = 'CUSTOMER_NAME',
  /** Delivery status value of order sort field. */
  DeliveryStatus = 'DELIVERY_STATUS',
  /** Fulfillment status value of order sort field. */
  FulfillmentStatus = 'FULFILLMENT_STATUS',
  /** Number value of order sort field. */
  Number = 'NUMBER',
  /** Payment status value of order sort field. */
  PaymentStatus = 'PAYMENT_STATUS',
  /** Placed at value of order sort field. */
  PlacedAt = 'PLACED_AT',
  /** Status value of order sort field. */
  Status = 'STATUS',
  /** Total amount value of order sort field. */
  TotalAmount = 'TOTAL_AMOUNT',
  /** Updated at value of order sort field. */
  UpdatedAt = 'UPDATED_AT'
}

/** Orders Admin representation of order source. */
export type ApiOrderSource = {
  __typename?: 'OrderSource';
  /** Stable machine-readable code. */
  code: Scalars['String']['output'];
  /** Relay global ID identifying the external. */
  externalId: Maybe<Scalars['String']['output']>;
  /** Projected value for external url. */
  externalUrl: Maybe<Scalars['URL']['output']>;
};

/** Closed set of order status values used by Orders Admin API. */
export enum ApiOrderStatus {
  /** Cancelled value of order status. */
  Cancelled = 'CANCELLED',
  /** Closed value of order status. */
  Closed = 'CLOSED',
  /** Draft value of order status. */
  Draft = 'DRAFT',
  /** Open value of order status. */
  Open = 'OPEN'
}

/** Comparison operators for order status; omitted operators do not constrain results. */
export type ApiOrderStatusFilterInput = {
  /** Validated input value for eq. */
  eq?: InputMaybe<ApiOrderStatus>;
  /** Validated input value for in. */
  in?: InputMaybe<Array<ApiOrderStatus>>;
};

/** Closed set of order sync direction values used by Orders Admin API. */
export enum ApiOrderSyncDirection {
  /** Bidirectional value of order sync direction. */
  Bidirectional = 'BIDIRECTIONAL',
  /** Export value of order sync direction. */
  Export = 'EXPORT',
  /** Import value of order sync direction. */
  Import = 'IMPORT'
}

/** Validated input for order tags update. Tenant identifiers come only from trusted context. */
export type ApiOrderTagsUpdateInput = {
  /** Relay global ID of this resource. */
  id: Scalars['ID']['input'];
  /** Validated input value for tags. */
  tags: Array<Scalars['String']['input']>;
};

/** Orders Admin representation of order tax line. */
export type ApiOrderTaxLine = ApiNode & {
  __typename?: 'OrderTaxLine';
  /** Exact decimal amount serialized as a string. */
  amount: ApiMoney;
  /** Relay global ID of this resource. */
  id: Scalars['ID']['output'];
  /** Projected value for included. */
  included: Scalars['Boolean']['output'];
  /** Projected value for jurisdiction. */
  jurisdiction: Maybe<Scalars['String']['output']>;
  /** Projected value for rate. */
  rate: Scalars['Decimal']['output'];
  /** Projected value for title. */
  title: Scalars['String']['output'];
};

/** Validated input for order unarchive. Tenant identifiers come only from trusted context. */
export type ApiOrderUnarchiveInput = {
  /** Relay global ID of this resource. */
  id: Scalars['ID']['input'];
};

/** Validated input for order update. Tenant identifiers come only from trusted context. */
export type ApiOrderUpdateInput = {
  /** Validated input value for billing address. */
  billingAddress?: InputMaybe<ApiOrderAddressInput>;
  /** Validated input value for contact. */
  contact?: InputMaybe<ApiOrderContactInput>;
  /** Validated input value for customer note. */
  customerNote?: InputMaybe<Scalars['String']['input']>;
  /** Relay global ID of this resource. */
  id: Scalars['ID']['input'];
  /** Stable locale code. */
  localeCode?: InputMaybe<ApiLocaleCode>;
  /** Validated input value for shipping. */
  shipping?: InputMaybe<ApiOrderDeliveryInput>;
};

/** Expected validation, permission, concurrency, or business-rule error returned by a mutation. */
export type ApiOrderUserError = ApiDisplayableError & {
  __typename?: 'OrderUserError';
  /** Stable machine-readable code. */
  code: Scalars['String']['output'];
  /** Current server revision returned with a version conflict. */
  currentVersion: Maybe<Scalars['Int']['output']>;
  /** Input path associated with the error, when applicable. */
  field: Maybe<Array<Scalars['String']['output']>>;
  /** Human-readable explanation safe for an authorized Admin user. */
  message: Scalars['String']['output'];
  /** Whether retrying after transient state changes may succeed. */
  retryable: Scalars['Boolean']['output'];
};

/** Validated input for weight. Tenant identifiers come only from trusted context. */
export type ApiOrderWeightInput = {
  /** Validated input value for unit. */
  unit: ApiWeightUnit;
  /** Validated input value for value. */
  value: Scalars['Float']['input'];
};

/** Composable store-scoped filter for order reads. */
export type ApiOrderWhereInput = {
  /** Validated input value for and. */
  and?: InputMaybe<Array<ApiOrderWhereInput>>;
  /** Validated input value for archived. */
  archived?: InputMaybe<Scalars['Boolean']['input']>;
  /** Timestamp for created, or null when it has not occurred. */
  createdAt?: InputMaybe<ApiDateTimeFilterInput>;
  /** ISO 4217 currency code. */
  currencyCode?: InputMaybe<ApiCurrencyCodeFilterInput>;
  /** Validated input value for customer email. */
  customerEmail?: InputMaybe<ApiStringFilterInput>;
  /** Relay global ID identifying the customer. */
  customerId?: InputMaybe<ApiIdFilterInput>;
  /** Validated input value for customer name. */
  customerName?: InputMaybe<ApiStringFilterInput>;
  /** Validated input value for customer phone. */
  customerPhone?: InputMaybe<ApiStringFilterInput>;
  /** Stable delivery method code. */
  deliveryMethodCode?: InputMaybe<ApiStringFilterInput>;
  /** Current delivery status. */
  deliveryStatus?: InputMaybe<ApiOrderDeliveryStatusFilterInput>;
  /** Relay global ID identifying the external. */
  externalId?: InputMaybe<ApiStringFilterInput>;
  /** Current fulfillment status. */
  fulfillmentStatus?: InputMaybe<ApiOrderFulfillmentStatusFilterInput>;
  /** Validated input value for has tracking. */
  hasTracking?: InputMaybe<Scalars['Boolean']['input']>;
  /** Relay global ID of this resource. */
  id?: InputMaybe<ApiIdFilterInput>;
  /** Store-local order number serialized without precision loss. */
  number?: InputMaybe<ApiBigIntFilterInput>;
  /** Validated input value for or. */
  or?: InputMaybe<Array<ApiOrderWhereInput>>;
  /** Stable payment method code. */
  paymentMethodCode?: InputMaybe<ApiStringFilterInput>;
  /** Current payment status. */
  paymentStatus?: InputMaybe<ApiOrderPaymentStatusFilterInput>;
  /** Timestamp for placed, or null when it has not occurred. */
  placedAt?: InputMaybe<ApiDateTimeFilterInput>;
  /** Current placement status. */
  placementStatus?: InputMaybe<ApiOrderPlacementStatusFilterInput>;
  /** Current return status. */
  returnStatus?: InputMaybe<ApiOrderReturnStatusFilterInput>;
  /** Validated input value for shipping country. */
  shippingCountry?: InputMaybe<ApiCountryCodeFilterInput>;
  /** Stable source code. */
  sourceCode?: InputMaybe<ApiStringFilterInput>;
  /** Current lifecycle or derived projection status. */
  status?: InputMaybe<ApiOrderStatusFilterInput>;
  /** Validated input value for tag. */
  tag?: InputMaybe<ApiStringFilterInput>;
  /** Monetary total in the order currency. */
  totalAmount?: InputMaybe<ApiDecimalFilterInput>;
  /** Validated input value for tracking number. */
  trackingNumber?: InputMaybe<ApiStringFilterInput>;
  /** Timestamp for updated, or null when it has not occurred. */
  updatedAt?: InputMaybe<ApiDateTimeFilterInput>;
};

/** Validated input for orders bulk action. Tenant identifiers come only from trusted context. */
export type ApiOrdersBulkActionInput = {
  /** Validated input value for action. */
  action: ApiOrdersBulkActionKind;
  /** Relay global ID identifying the integration link. */
  integrationLinkId?: InputMaybe<Scalars['ID']['input']>;
  /** Stable audited reason code. */
  reasonCode?: InputMaybe<Scalars['String']['input']>;
  /** Validated input value for selection. */
  selection: ApiOrderBulkSelectionInput;
  /** Validated input value for tags. */
  tags?: InputMaybe<Array<Scalars['String']['input']>>;
};

/** Closed set of orders bulk action kind values used by Orders Admin API. */
export enum ApiOrdersBulkActionKind {
  /** Add tags value of orders bulk action kind. */
  AddTags = 'ADD_TAGS',
  /** Archive value of orders bulk action kind. */
  Archive = 'ARCHIVE',
  /** Cancel value of orders bulk action kind. */
  Cancel = 'CANCEL',
  /** Remove tags value of orders bulk action kind. */
  RemoveTags = 'REMOVE_TAGS',
  /** Request integration sync value of orders bulk action kind. */
  RequestIntegrationSync = 'REQUEST_INTEGRATION_SYNC',
  /** Unarchive value of orders bulk action kind. */
  Unarchive = 'UNARCHIVE'
}

/** Command namespace. Every command is store-scoped from trusted context. */
export type ApiOrdersMutation = {
  __typename?: 'OrdersMutation';
  /** Start durable fulfillment cancellation and optional restocking. */
  fulfillmentCancel: ApiOrderOperationPayload;
  /** Create merchant-managed fulfillment facts for allocated quantities. */
  fulfillmentCreate: ApiFulfillmentPayload;
  /** Request cancellation from the pinned fulfillment service. */
  fulfillmentOrderCancelRequest: ApiOrderOperationPayload;
  /** Place a reasoned hold on fulfillment work. */
  fulfillmentOrderHold: ApiFulfillmentOrderPayload;
  /** Move fulfillment work to another location or pinned fulfillment-service route. */
  fulfillmentOrderMove: ApiFulfillmentOrderPayload;
  /** Release one fulfillment hold. */
  fulfillmentOrderReleaseHold: ApiFulfillmentOrderPayload;
  /** Split selected remaining quantities into a new fulfillment work unit. */
  fulfillmentOrderSplit: ApiFulfillmentOrderPayload;
  /** Submit fulfillment work through its pinned fulfillment service. */
  fulfillmentOrderSubmit: ApiOrderOperationPayload;
  /** Update the current staff-only note and append an immutable audit event. */
  orderAdminNoteUpdate: ApiOrderPayload;
  /** Archive an order without changing lifecycle status. */
  orderArchive: ApiOrderPayload;
  /** Start durable cancellation across fulfillment, payment, inventory, and notifications. */
  orderCancel: ApiOrderOperationPayload;
  /** Close an eligible OPEN order. */
  orderClose: ApiOrderPayload;
  /** Append a staff or customer-visible comment to the immutable activity timeline. */
  orderCommentAdd: ApiOrderActivityPayload;
  /** Validate and transition a DRAFT order to OPEN. */
  orderCompleteDraft: ApiOrderPayload;
  /** Create an idempotent DRAFT order and calculate all totals server-side. */
  orderCreate: ApiOrderPayload;
  /** Replace validated merchant custom fields without storing core business facts in JSON. */
  orderCustomFieldsUpdate: ApiOrderPayload;
  /** Attach or detach the federated customer reference while preserving historical contact snapshots. */
  orderCustomerSet: ApiOrderPayload;
  /** Permanently delete a DRAFT order; placed orders are never physically deleted. */
  orderDelete: ApiOrderDeletePayload;
  /** Abandon an uncommitted staged edit. */
  orderEditAbandon: ApiOrderEditPayload;
  /** Begin an isolated staged edit of an OPEN order. */
  orderEditBegin: ApiOrderEditPayload;
  /** Durably commit a staged edit after verifying edit and order revisions. */
  orderEditCommit: ApiOrderOperationPayload;
  /** Add a reasoned manual discount to a staged edit. */
  orderEditDiscountAdd: ApiOrderEditPayload;
  /** Remove a proposed discount from a staged edit. */
  orderEditDiscountRemove: ApiOrderEditPayload;
  /** Add a proposed line to a staged edit and refresh its calculated preview. */
  orderEditLineAdd: ApiOrderEditPayload;
  /** Remove a proposed line without mutating the committed order. */
  orderEditLineRemove: ApiOrderEditPayload;
  /** Update a proposed line in a staged edit and refresh its calculated preview. */
  orderEditLineUpdate: ApiOrderEditPayload;
  /** Update proposed delivery details in a staged edit. */
  orderEditShippingUpdate: ApiOrderEditPayload;
  /** Cancel an eligible exchange. */
  orderExchangeCancel: ApiOrderExchangePayload;
  /** Complete an eligible exchange after inbound receipt and outbound fulfillment. */
  orderExchangeComplete: ApiOrderExchangePayload;
  /** Create an exchange from eligible inbound quantities and replacement lines. */
  orderExchangeCreate: ApiOrderExchangePayload;
  /** Detach an integration link while preserving synchronization and audit history. */
  orderIntegrationLinkDetach: ApiOrderPayload;
  /** Request asynchronous synchronization through a pinned integration link. */
  orderIntegrationSyncRequest: ApiOrderOperationPayload;
  /** Retry a failed integration operation without changing its pinned route. */
  orderIntegrationSyncRetry: ApiOrderOperationPayload;
  /** Add a line directly to a DRAFT order and recalculate totals. */
  orderLineAdd: ApiOrderLinePayload;
  /** Delete a line directly from a DRAFT order. */
  orderLineDelete: ApiOrderDeletePayload;
  /** Update an editable DRAFT line and recalculate totals. */
  orderLineUpdate: ApiOrderLinePayload;
  /** Record an audited offline or imported payment fact. */
  orderManualPaymentRecord: ApiOrderOperationPayload;
  /** Start durable capture of an eligible authorization. */
  orderPaymentCapture: ApiOrderOperationPayload;
  /** Start a new payment attempt without rewriting previous attempts. */
  orderPaymentRetry: ApiOrderOperationPayload;
  /** Apply an elevated override only to offline or imported facts with a mandatory reason. */
  orderPaymentStatusOverride: ApiOrderPayload;
  /** Start durable voiding of an eligible authorization or transaction. */
  orderPaymentVoid: ApiOrderOperationPayload;
  /** Start a durable refund with optional line and transaction allocations. */
  orderRefundCreate: ApiOrderOperationPayload;
  /** Reopen an eligible CLOSED order. */
  orderReopen: ApiOrderPayload;
  /** Approve a return and optionally request a return shipment. */
  orderReturnApprove: ApiOrderReturnPayload;
  /** Cancel an eligible return request. */
  orderReturnCancel: ApiOrderReturnPayload;
  /** Create a return request for currently returnable quantities. */
  orderReturnCreate: ApiOrderReturnPayload;
  /** Start durable receipt, disposition, restocking, and optional refund processing. */
  orderReturnReceive: ApiOrderOperationPayload;
  /** Reject a return with a stable reason code. */
  orderReturnReject: ApiOrderReturnPayload;
  /** Replace normalized tags and append an immutable audit event. */
  orderTagsUpdate: ApiOrderPayload;
  /** Remove the archive marker without changing lifecycle status. */
  orderUnarchive: ApiOrderPayload;
  /** Update editable order details without directly overwriting derived aggregate statuses. */
  orderUpdate: ApiOrderPayload;
  /** Start a durable bulk action over an explicit or filtered order selection. */
  ordersBulkAction: ApiOrderOperationPayload;
  /** Start durable cancellation of an eligible shipment. */
  shipmentCancel: ApiOrderOperationPayload;
  /** Start merchant-managed or provider-managed physical shipment creation. */
  shipmentCreate: ApiOrderOperationPayload;
  /** Record confirmed physical delivery. */
  shipmentMarkDelivered: ApiShipmentPayload;
  /** Record physical handoff of a shipment. */
  shipmentMarkShipped: ApiShipmentPayload;
  /** Reconcile shipment state through its pinned provider route. */
  shipmentReconcile: ApiOrderOperationPayload;
  /** Replace merchant-managed tracking details. */
  shipmentTrackingUpdate: ApiShipmentPayload;
};


/** Command namespace. Every command is store-scoped from trusted context. */
export type ApiOrdersMutationFulfillmentCancelArgs = {
  input: ApiFulfillmentCancelInput;
};


/** Command namespace. Every command is store-scoped from trusted context. */
export type ApiOrdersMutationFulfillmentCreateArgs = {
  input: ApiFulfillmentCreateInput;
};


/** Command namespace. Every command is store-scoped from trusted context. */
export type ApiOrdersMutationFulfillmentOrderCancelRequestArgs = {
  input: ApiFulfillmentOrderCancelRequestInput;
};


/** Command namespace. Every command is store-scoped from trusted context. */
export type ApiOrdersMutationFulfillmentOrderHoldArgs = {
  input: ApiFulfillmentOrderHoldInput;
};


/** Command namespace. Every command is store-scoped from trusted context. */
export type ApiOrdersMutationFulfillmentOrderMoveArgs = {
  input: ApiFulfillmentOrderMoveInput;
};


/** Command namespace. Every command is store-scoped from trusted context. */
export type ApiOrdersMutationFulfillmentOrderReleaseHoldArgs = {
  input: ApiFulfillmentOrderReleaseHoldInput;
};


/** Command namespace. Every command is store-scoped from trusted context. */
export type ApiOrdersMutationFulfillmentOrderSplitArgs = {
  input: ApiFulfillmentOrderSplitInput;
};


/** Command namespace. Every command is store-scoped from trusted context. */
export type ApiOrdersMutationFulfillmentOrderSubmitArgs = {
  input: ApiFulfillmentOrderSubmitInput;
};


/** Command namespace. Every command is store-scoped from trusted context. */
export type ApiOrdersMutationOrderAdminNoteUpdateArgs = {
  input: ApiOrderAdminNoteUpdateInput;
};


/** Command namespace. Every command is store-scoped from trusted context. */
export type ApiOrdersMutationOrderArchiveArgs = {
  input: ApiOrderArchiveInput;
};


/** Command namespace. Every command is store-scoped from trusted context. */
export type ApiOrdersMutationOrderCancelArgs = {
  input: ApiOrderCancelInput;
};


/** Command namespace. Every command is store-scoped from trusted context. */
export type ApiOrdersMutationOrderCloseArgs = {
  input: ApiOrderCloseInput;
};


/** Command namespace. Every command is store-scoped from trusted context. */
export type ApiOrdersMutationOrderCommentAddArgs = {
  input: ApiOrderCommentAddInput;
};


/** Command namespace. Every command is store-scoped from trusted context. */
export type ApiOrdersMutationOrderCompleteDraftArgs = {
  input: ApiOrderCompleteDraftInput;
};


/** Command namespace. Every command is store-scoped from trusted context. */
export type ApiOrdersMutationOrderCreateArgs = {
  input: ApiOrderCreateInput;
};


/** Command namespace. Every command is store-scoped from trusted context. */
export type ApiOrdersMutationOrderCustomFieldsUpdateArgs = {
  input: ApiOrderCustomFieldsUpdateInput;
};


/** Command namespace. Every command is store-scoped from trusted context. */
export type ApiOrdersMutationOrderCustomerSetArgs = {
  input: ApiOrderCustomerSetInput;
};


/** Command namespace. Every command is store-scoped from trusted context. */
export type ApiOrdersMutationOrderDeleteArgs = {
  input: ApiOrderDeleteInput;
};


/** Command namespace. Every command is store-scoped from trusted context. */
export type ApiOrdersMutationOrderEditAbandonArgs = {
  input: ApiOrderEditAbandonInput;
};


/** Command namespace. Every command is store-scoped from trusted context. */
export type ApiOrdersMutationOrderEditBeginArgs = {
  input: ApiOrderEditBeginInput;
};


/** Command namespace. Every command is store-scoped from trusted context. */
export type ApiOrdersMutationOrderEditCommitArgs = {
  input: ApiOrderEditCommitInput;
};


/** Command namespace. Every command is store-scoped from trusted context. */
export type ApiOrdersMutationOrderEditDiscountAddArgs = {
  input: ApiOrderEditDiscountAddInput;
};


/** Command namespace. Every command is store-scoped from trusted context. */
export type ApiOrdersMutationOrderEditDiscountRemoveArgs = {
  input: ApiOrderEditDiscountRemoveInput;
};


/** Command namespace. Every command is store-scoped from trusted context. */
export type ApiOrdersMutationOrderEditLineAddArgs = {
  input: ApiOrderEditLineAddInput;
};


/** Command namespace. Every command is store-scoped from trusted context. */
export type ApiOrdersMutationOrderEditLineRemoveArgs = {
  input: ApiOrderEditLineRemoveInput;
};


/** Command namespace. Every command is store-scoped from trusted context. */
export type ApiOrdersMutationOrderEditLineUpdateArgs = {
  input: ApiOrderEditLineUpdateInput;
};


/** Command namespace. Every command is store-scoped from trusted context. */
export type ApiOrdersMutationOrderEditShippingUpdateArgs = {
  input: ApiOrderEditShippingUpdateInput;
};


/** Command namespace. Every command is store-scoped from trusted context. */
export type ApiOrdersMutationOrderExchangeCancelArgs = {
  input: ApiOrderExchangeCancelInput;
};


/** Command namespace. Every command is store-scoped from trusted context. */
export type ApiOrdersMutationOrderExchangeCompleteArgs = {
  input: ApiOrderExchangeCompleteInput;
};


/** Command namespace. Every command is store-scoped from trusted context. */
export type ApiOrdersMutationOrderExchangeCreateArgs = {
  input: ApiOrderExchangeCreateInput;
};


/** Command namespace. Every command is store-scoped from trusted context. */
export type ApiOrdersMutationOrderIntegrationLinkDetachArgs = {
  input: ApiOrderIntegrationLinkDetachInput;
};


/** Command namespace. Every command is store-scoped from trusted context. */
export type ApiOrdersMutationOrderIntegrationSyncRequestArgs = {
  input: ApiOrderIntegrationSyncRequestInput;
};


/** Command namespace. Every command is store-scoped from trusted context. */
export type ApiOrdersMutationOrderIntegrationSyncRetryArgs = {
  input: ApiOrderIntegrationSyncRetryInput;
};


/** Command namespace. Every command is store-scoped from trusted context. */
export type ApiOrdersMutationOrderLineAddArgs = {
  input: ApiOrderLineAddInput;
};


/** Command namespace. Every command is store-scoped from trusted context. */
export type ApiOrdersMutationOrderLineDeleteArgs = {
  input: ApiOrderLineDeleteInput;
};


/** Command namespace. Every command is store-scoped from trusted context. */
export type ApiOrdersMutationOrderLineUpdateArgs = {
  input: ApiOrderLineUpdateInput;
};


/** Command namespace. Every command is store-scoped from trusted context. */
export type ApiOrdersMutationOrderManualPaymentRecordArgs = {
  input: ApiOrderManualPaymentRecordInput;
};


/** Command namespace. Every command is store-scoped from trusted context. */
export type ApiOrdersMutationOrderPaymentCaptureArgs = {
  input: ApiOrderPaymentCaptureInput;
};


/** Command namespace. Every command is store-scoped from trusted context. */
export type ApiOrdersMutationOrderPaymentRetryArgs = {
  input: ApiOrderPaymentRetryInput;
};


/** Command namespace. Every command is store-scoped from trusted context. */
export type ApiOrdersMutationOrderPaymentStatusOverrideArgs = {
  input: ApiOrderPaymentStatusOverrideInput;
};


/** Command namespace. Every command is store-scoped from trusted context. */
export type ApiOrdersMutationOrderPaymentVoidArgs = {
  input: ApiOrderPaymentVoidInput;
};


/** Command namespace. Every command is store-scoped from trusted context. */
export type ApiOrdersMutationOrderRefundCreateArgs = {
  input: ApiOrderRefundCreateInput;
};


/** Command namespace. Every command is store-scoped from trusted context. */
export type ApiOrdersMutationOrderReopenArgs = {
  input: ApiOrderReopenInput;
};


/** Command namespace. Every command is store-scoped from trusted context. */
export type ApiOrdersMutationOrderReturnApproveArgs = {
  input: ApiOrderReturnApproveInput;
};


/** Command namespace. Every command is store-scoped from trusted context. */
export type ApiOrdersMutationOrderReturnCancelArgs = {
  input: ApiOrderReturnCancelInput;
};


/** Command namespace. Every command is store-scoped from trusted context. */
export type ApiOrdersMutationOrderReturnCreateArgs = {
  input: ApiOrderReturnCreateInput;
};


/** Command namespace. Every command is store-scoped from trusted context. */
export type ApiOrdersMutationOrderReturnReceiveArgs = {
  input: ApiOrderReturnReceiveInput;
};


/** Command namespace. Every command is store-scoped from trusted context. */
export type ApiOrdersMutationOrderReturnRejectArgs = {
  input: ApiOrderReturnRejectInput;
};


/** Command namespace. Every command is store-scoped from trusted context. */
export type ApiOrdersMutationOrderTagsUpdateArgs = {
  input: ApiOrderTagsUpdateInput;
};


/** Command namespace. Every command is store-scoped from trusted context. */
export type ApiOrdersMutationOrderUnarchiveArgs = {
  input: ApiOrderUnarchiveInput;
};


/** Command namespace. Every command is store-scoped from trusted context. */
export type ApiOrdersMutationOrderUpdateArgs = {
  input: ApiOrderUpdateInput;
};


/** Command namespace. Every command is store-scoped from trusted context. */
export type ApiOrdersMutationOrdersBulkActionArgs = {
  input: ApiOrdersBulkActionInput;
};


/** Command namespace. Every command is store-scoped from trusted context. */
export type ApiOrdersMutationShipmentCancelArgs = {
  input: ApiShipmentCancelInput;
};


/** Command namespace. Every command is store-scoped from trusted context. */
export type ApiOrdersMutationShipmentCreateArgs = {
  input: ApiShipmentCreateInput;
};


/** Command namespace. Every command is store-scoped from trusted context. */
export type ApiOrdersMutationShipmentMarkDeliveredArgs = {
  input: ApiShipmentMarkDeliveredInput;
};


/** Command namespace. Every command is store-scoped from trusted context. */
export type ApiOrdersMutationShipmentMarkShippedArgs = {
  input: ApiShipmentMarkShippedInput;
};


/** Command namespace. Every command is store-scoped from trusted context. */
export type ApiOrdersMutationShipmentReconcileArgs = {
  input: ApiShipmentReconcileInput;
};


/** Command namespace. Every command is store-scoped from trusted context. */
export type ApiOrdersMutationShipmentTrackingUpdateArgs = {
  input: ApiShipmentTrackingUpdateInput;
};

/** Read namespace for the Orders Admin API. */
export type ApiOrdersQuery = {
  __typename?: 'OrdersQuery';
  /** Find an order by Relay global ID in the current store; inaccessible resources resolve to null. */
  order: Maybe<ApiOrder>;
  /** Find an order by its store-local number. */
  orderByNumber: Maybe<ApiOrder>;
  /** Find a staged order edit by Relay global ID. */
  orderEditSession: Maybe<ApiOrderEditSession>;
  /** Find a durable operation for workflow polling. */
  orderOperation: Maybe<ApiOrderOperation>;
  /** List current-store orders with Relay pagination, composable filters, and deterministic sorting. */
  orders: ApiOrderConnection;
};


/** Read namespace for the Orders Admin API. */
export type ApiOrdersQueryOrderArgs = {
  id: Scalars['ID']['input'];
};


/** Read namespace for the Orders Admin API. */
export type ApiOrdersQueryOrderByNumberArgs = {
  number: Scalars['BigInt']['input'];
};


/** Read namespace for the Orders Admin API. */
export type ApiOrdersQueryOrderEditSessionArgs = {
  id: Scalars['ID']['input'];
};


/** Read namespace for the Orders Admin API. */
export type ApiOrdersQueryOrderOperationArgs = {
  id: Scalars['ID']['input'];
};


/** Read namespace for the Orders Admin API. */
export type ApiOrdersQueryOrdersArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<ApiOrderOrderByInput>>;
  where?: InputMaybe<ApiOrderWhereInput>;
};

/** Relay pagination metadata shared with existing Admin subgraphs. */
export type ApiPageInfo = {
  __typename?: 'PageInfo';
  /** Opaque cursor of the last edge, or null for an empty page. */
  endCursor: Maybe<Scalars['String']['output']>;
  /** Whether another page exists after endCursor. */
  hasNextPage: Scalars['Boolean']['output'];
  /** Whether another page exists before startCursor. */
  hasPreviousPage: Scalars['Boolean']['output'];
  /** Opaque cursor of the first edge, or null for an empty page. */
  startCursor: Maybe<Scalars['String']['output']>;
};

export type ApiQuery = {
  __typename?: 'Query';
  /** Entry point for all store-scoped Orders Admin reads. */
  ordersQuery: ApiOrdersQuery;
};

/** Physical shipment projection with pinned provider references, packages, tracking, and status events. */
export type ApiShipment = ApiNode & {
  __typename?: 'Shipment';
  /** Timestamp for created, or null when it has not occurred. */
  createdAt: Scalars['DateTime']['output'];
  /** Timestamp for delivered, or null when it has not occurred. */
  deliveredAt: Maybe<Scalars['DateTime']['output']>;
  /** Timestamp for estimated delivery, or null when it has not occurred. */
  estimatedDeliveryAt: Maybe<Scalars['DateTime']['output']>;
  /** Projected value for events. */
  events: Array<ApiShipmentEvent>;
  /** Projected value for fulfillment. */
  fulfillment: ApiFulfillment;
  /** Relay global ID of this resource. */
  id: Scalars['ID']['output'];
  /** Fresh order projection returned after the command. */
  order: ApiOrder;
  /** Projected value for packages. */
  packages: Array<ApiShipmentPackage>;
  /** Stable provider code. */
  providerCode: Maybe<Scalars['String']['output']>;
  /** Projected value for provider reference. */
  providerReference: Maybe<Scalars['String']['output']>;
  /** Stable service code. */
  serviceCode: Maybe<Scalars['String']['output']>;
  /** Timestamp for shipped, or null when it has not occurred. */
  shippedAt: Maybe<Scalars['DateTime']['output']>;
  /** Current lifecycle or derived projection status. */
  status: ApiShipmentStatus;
  /** Projected value for tracking. */
  tracking: Array<ApiShipmentTracking>;
  /** Timestamp for updated, or null when it has not occurred. */
  updatedAt: Scalars['DateTime']['output'];
  /** Internal aggregate version. */
  version: Scalars['Int']['output'];
};

/** Validated input for shipment cancel. Tenant identifiers come only from trusted context. */
export type ApiShipmentCancelInput = {
  /** Stable audited reason code. */
  reasonCode: Scalars['String']['input'];
  /** Relay global ID identifying the shipment. */
  shipmentId: Scalars['ID']['input'];
};

/** Validated input for shipment create. Tenant identifiers come only from trusted context. */
export type ApiShipmentCreateInput = {
  /** Relay global ID identifying the fulfillment. */
  fulfillmentId: Scalars['ID']['input'];
  /** Whether completion should enqueue a customer notification. */
  notifyCustomer?: InputMaybe<Scalars['Boolean']['input']>;
  /** Validated input value for packages. */
  packages: Array<ApiShipmentPackageInput>;
  /** Stable provider code. */
  providerCode?: InputMaybe<Scalars['String']['input']>;
  /** Stable service code. */
  serviceCode?: InputMaybe<Scalars['String']['input']>;
};

/** Orders Admin representation of shipment event. */
export type ApiShipmentEvent = ApiNode & {
  __typename?: 'ShipmentEvent';
  /** Timestamp for happened, or null when it has not occurred. */
  happenedAt: Scalars['DateTime']['output'];
  /** Relay global ID of this resource. */
  id: Scalars['ID']['output'];
  /** Projected value for location. */
  location: Maybe<Scalars['String']['output']>;
  /** Human-readable explanation safe for an authorized Admin user. */
  message: Maybe<Scalars['String']['output']>;
  /** Timestamp for recorded, or null when it has not occurred. */
  recordedAt: Scalars['DateTime']['output'];
  /** Current lifecycle or derived projection status. */
  status: ApiShipmentStatus;
};

/** Validated input for shipment mark delivered. Tenant identifiers come only from trusted context. */
export type ApiShipmentMarkDeliveredInput = {
  /** Timestamp for delivered, or null when it has not occurred. */
  deliveredAt: Scalars['DateTime']['input'];
  /** Relay global ID identifying the shipment. */
  shipmentId: Scalars['ID']['input'];
};

/** Validated input for shipment mark shipped. Tenant identifiers come only from trusted context. */
export type ApiShipmentMarkShippedInput = {
  /** Relay global ID identifying the shipment. */
  shipmentId: Scalars['ID']['input'];
  /** Timestamp for shipped, or null when it has not occurred. */
  shippedAt: Scalars['DateTime']['input'];
};

/** Orders Admin representation of shipment package. */
export type ApiShipmentPackage = ApiNode & {
  __typename?: 'ShipmentPackage';
  /** Projected value for declared value. */
  declaredValue: Maybe<ApiMoney>;
  /** Projected value for dimensions. */
  dimensions: Maybe<ApiDimensions>;
  /** Relay global ID of this resource. */
  id: Scalars['ID']['output'];
  /** Projected value for items. */
  items: Array<ApiShipmentPackageItem>;
  /** Projected value for weight. */
  weight: Maybe<ApiWeight>;
};

/** Validated input for shipment package. Tenant identifiers come only from trusted context. */
export type ApiShipmentPackageInput = {
  /** Validated input value for declared value. */
  declaredValue?: InputMaybe<ApiMoneyInput>;
  /** Validated input value for dimensions. */
  dimensions?: InputMaybe<ApiOrderDimensionsInput>;
  /** Validated input value for items. */
  items: Array<ApiShipmentPackageItemInput>;
  /** Validated input value for weight. */
  weight?: InputMaybe<ApiOrderWeightInput>;
};

/** Orders Admin representation of shipment package item. */
export type ApiShipmentPackageItem = {
  __typename?: 'ShipmentPackageItem';
  /** Projected value for order line. */
  orderLine: ApiOrderLine;
  /** Quantity validated against domain conservation invariants. */
  quantity: Scalars['Int']['output'];
};

/** Validated input for shipment package item. Tenant identifiers come only from trusted context. */
export type ApiShipmentPackageItemInput = {
  /** Relay global ID identifying the order line. */
  orderLineId: Scalars['ID']['input'];
  /** Quantity validated against domain conservation invariants. */
  quantity: Scalars['Int']['input'];
};

/** Mutation result for shipment; expected failures are returned in userErrors. */
export type ApiShipmentPayload = {
  __typename?: 'ShipmentPayload';
  /** Fresh order projection returned after the command. */
  order: Maybe<ApiOrder>;
  /** Projected value for shipment. */
  shipment: Maybe<ApiShipment>;
  /** Expected validation, permission, concurrency, and business-rule failures; empty on success. */
  userErrors: Array<ApiOrderUserError>;
};

/** Validated input for shipment reconcile. Tenant identifiers come only from trusted context. */
export type ApiShipmentReconcileInput = {
  /** Relay global ID identifying the shipment. */
  shipmentId: Scalars['ID']['input'];
};

/** Closed set of shipment status values used by Orders Admin API. */
export enum ApiShipmentStatus {
  /** Cancelled value of shipment status. */
  Cancelled = 'CANCELLED',
  /** Delayed value of shipment status. */
  Delayed = 'DELAYED',
  /** Delivered value of shipment status. */
  Delivered = 'DELIVERED',
  /** Delivery attempted value of shipment status. */
  DeliveryAttempted = 'DELIVERY_ATTEMPTED',
  /** Draft value of shipment status. */
  Draft = 'DRAFT',
  /** Exception value of shipment status. */
  Exception = 'EXCEPTION',
  /** In transit value of shipment status. */
  InTransit = 'IN_TRANSIT',
  /** Label created value of shipment status. */
  LabelCreated = 'LABEL_CREATED',
  /** Out for delivery value of shipment status. */
  OutForDelivery = 'OUT_FOR_DELIVERY',
  /** Picked up value of shipment status. */
  PickedUp = 'PICKED_UP',
  /** Ready for pickup value of shipment status. */
  ReadyForPickup = 'READY_FOR_PICKUP',
  /** Returned to sender value of shipment status. */
  ReturnedToSender = 'RETURNED_TO_SENDER'
}

/** Orders Admin representation of shipment tracking. */
export type ApiShipmentTracking = {
  __typename?: 'ShipmentTracking';
  /** Projected value for company. */
  company: Maybe<Scalars['String']['output']>;
  /** Store-local order number serialized without precision loss. */
  number: Scalars['String']['output'];
  /** Projected value for url. */
  url: Maybe<Scalars['URL']['output']>;
};

/** Validated input for shipment tracking. Tenant identifiers come only from trusted context. */
export type ApiShipmentTrackingInput = {
  /** Validated input value for company. */
  company?: InputMaybe<Scalars['String']['input']>;
  /** Store-local order number serialized without precision loss. */
  number: Scalars['String']['input'];
  /** Validated input value for url. */
  url?: InputMaybe<Scalars['URL']['input']>;
};

/** Validated input for shipment tracking update. Tenant identifiers come only from trusted context. */
export type ApiShipmentTrackingUpdateInput = {
  /** Relay global ID identifying the shipment. */
  shipmentId: Scalars['ID']['input'];
  /** Validated input value for tracking. */
  tracking: Array<ApiShipmentTrackingInput>;
};

/** Comparison operators for string; omitted operators do not constrain results. */
export type ApiStringFilterInput = {
  /** Validated input value for contains. */
  contains?: InputMaybe<Scalars['String']['input']>;
  /** Validated input value for eq. */
  eq?: InputMaybe<Scalars['String']['input']>;
  /** Validated input value for in. */
  in?: InputMaybe<Array<Scalars['String']['input']>>;
  /** Validated input value for starts with. */
  startsWith?: InputMaybe<Scalars['String']['input']>;
};

export type ApiUser = {
  __typename?: 'User';
  /** Federated User ID. */
  id: Scalars['ID']['output'];
};

/** Physical weight expressed in a supported measurement unit. */
export type ApiWeight = {
  __typename?: 'Weight';
  /** Unit used by value. */
  unit: ApiWeightUnit;
  /** Numeric weight in unit. */
  value: Scalars['Float']['output'];
};

/** Weight measurement units */
export enum ApiWeightUnit {
  /** Gram */
  G = 'g',
  /** Kilogram */
  Kg = 'kg',
  /** Pound */
  Lb = 'lb',
  /** Ounce */
  Oz = 'oz'
}



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
export type ApiResolversInterfaceTypes<_RefType extends Record<string, unknown>> = {
  Connection: ( ApiOrderActivityConnection ) | ( ApiOrderConnection ) | ( ApiOrderExchangeConnection ) | ( ApiOrderRefundConnection ) | ( ApiOrderReturnConnection );
  DisplayableError: ( ApiOrderUserError );
  Node: ( ApiFulfillment ) | ( ApiFulfillmentHold ) | ( ApiFulfillmentOrder ) | ( ApiFulfillmentOrderLine ) | ( ApiOrder ) | ( ApiOrderActivity ) | ( ApiOrderAddress ) | ( ApiOrderDeliveryGroup ) | ( ApiOrderDiscount ) | ( ApiOrderEditChange ) | ( ApiOrderEditSession ) | ( ApiOrderExchange ) | ( ApiOrderIntegrationLink ) | ( ApiOrderLine ) | ( ApiOrderOperation ) | ( ApiOrderPaymentAttempt ) | ( ApiOrderPaymentDispute ) | ( ApiOrderPaymentTransaction ) | ( ApiOrderRefund ) | ( ApiOrderReturn ) | ( ApiOrderTaxLine ) | ( ApiShipment ) | ( ApiShipmentEvent ) | ( ApiShipmentPackage );
};

/** Mapping between all available schema types and the resolvers types */
export type ApiResolversTypes = {
  ApiKey: ResolverTypeWrapper<ApiApiKey>;
  BigInt: ResolverTypeWrapper<Scalars['BigInt']['output']>;
  BigIntFilterInput: ApiBigIntFilterInput;
  Boolean: ResolverTypeWrapper<Scalars['Boolean']['output']>;
  CalculatedOrder: ResolverTypeWrapper<ApiCalculatedOrder>;
  Checkout: ResolverTypeWrapper<ApiCheckout>;
  Connection: ResolverTypeWrapper<ApiResolversInterfaceTypes<ApiResolversTypes>['Connection']>;
  CountryCode: ApiCountryCode;
  CountryCodeFilterInput: ApiCountryCodeFilterInput;
  CurrencyCode: ApiCurrencyCode;
  CurrencyCodeFilterInput: ApiCurrencyCodeFilterInput;
  Customer: ResolverTypeWrapper<ApiCustomer>;
  DateTime: ResolverTypeWrapper<Scalars['DateTime']['output']>;
  DateTimeFilterInput: ApiDateTimeFilterInput;
  Decimal: ResolverTypeWrapper<Scalars['Decimal']['output']>;
  DecimalFilterInput: ApiDecimalFilterInput;
  DimensionUnit: ApiDimensionUnit;
  Dimensions: ResolverTypeWrapper<ApiDimensions>;
  DisplayableError: ResolverTypeWrapper<ApiResolversInterfaceTypes<ApiResolversTypes>['DisplayableError']>;
  Email: ResolverTypeWrapper<Scalars['Email']['output']>;
  Float: ResolverTypeWrapper<Scalars['Float']['output']>;
  Fulfillment: ResolverTypeWrapper<ApiFulfillment>;
  FulfillmentCancelInput: ApiFulfillmentCancelInput;
  FulfillmentCreateInput: ApiFulfillmentCreateInput;
  FulfillmentHold: ResolverTypeWrapper<ApiFulfillmentHold>;
  FulfillmentLine: ResolverTypeWrapper<ApiFulfillmentLine>;
  FulfillmentOrder: ResolverTypeWrapper<ApiFulfillmentOrder>;
  FulfillmentOrderCancelRequestInput: ApiFulfillmentOrderCancelRequestInput;
  FulfillmentOrderHoldInput: ApiFulfillmentOrderHoldInput;
  FulfillmentOrderLine: ResolverTypeWrapper<ApiFulfillmentOrderLine>;
  FulfillmentOrderLineQuantityInput: ApiFulfillmentOrderLineQuantityInput;
  FulfillmentOrderMoveInput: ApiFulfillmentOrderMoveInput;
  FulfillmentOrderPayload: ResolverTypeWrapper<ApiFulfillmentOrderPayload>;
  FulfillmentOrderReleaseHoldInput: ApiFulfillmentOrderReleaseHoldInput;
  FulfillmentOrderSplitInput: ApiFulfillmentOrderSplitInput;
  FulfillmentOrderStatus: ApiFulfillmentOrderStatus;
  FulfillmentOrderSubmitInput: ApiFulfillmentOrderSubmitInput;
  FulfillmentPayload: ResolverTypeWrapper<ApiFulfillmentPayload>;
  FulfillmentRequestStatus: ApiFulfillmentRequestStatus;
  FulfillmentServiceRoute: ResolverTypeWrapper<ApiFulfillmentServiceRoute>;
  FulfillmentStatus: ApiFulfillmentStatus;
  ID: ResolverTypeWrapper<Scalars['ID']['output']>;
  IDFilterInput: ApiIdFilterInput;
  Int: ResolverTypeWrapper<Scalars['Int']['output']>;
  JSON: ResolverTypeWrapper<Scalars['JSON']['output']>;
  LocaleCode: ApiLocaleCode;
  Money: ResolverTypeWrapper<ApiMoney>;
  MoneyInput: ApiMoneyInput;
  Mutation: ResolverTypeWrapper<{}>;
  Node: ResolverTypeWrapper<ApiResolversInterfaceTypes<ApiResolversTypes>['Node']>;
  Order: ResolverTypeWrapper<ApiOrder>;
  OrderAction: ApiOrderAction;
  OrderActivity: ResolverTypeWrapper<ApiOrderActivity>;
  OrderActivityConnection: ResolverTypeWrapper<ApiOrderActivityConnection>;
  OrderActivityEdge: ResolverTypeWrapper<ApiOrderActivityEdge>;
  OrderActivityPayload: ResolverTypeWrapper<ApiOrderActivityPayload>;
  OrderActor: ResolverTypeWrapper<ApiOrderActor>;
  OrderActorType: ApiOrderActorType;
  OrderAddress: ResolverTypeWrapper<ApiOrderAddress>;
  OrderAddressInput: ApiOrderAddressInput;
  OrderAdminNoteUpdateInput: ApiOrderAdminNoteUpdateInput;
  OrderArchiveInput: ApiOrderArchiveInput;
  OrderBulkSelectionInput: ApiOrderBulkSelectionInput;
  OrderCancelInput: ApiOrderCancelInput;
  OrderCheckoutPlacement: ResolverTypeWrapper<ApiOrderCheckoutPlacement>;
  OrderCloseInput: ApiOrderCloseInput;
  OrderCommentAddInput: ApiOrderCommentAddInput;
  OrderCompleteDraftInput: ApiOrderCompleteDraftInput;
  OrderConnection: ResolverTypeWrapper<ApiOrderConnection>;
  OrderContact: ResolverTypeWrapper<ApiOrderContact>;
  OrderContactInput: ApiOrderContactInput;
  OrderCost: ResolverTypeWrapper<ApiOrderCost>;
  OrderCreateInput: ApiOrderCreateInput;
  OrderCustomFieldsUpdateInput: ApiOrderCustomFieldsUpdateInput;
  OrderCustomerSetInput: ApiOrderCustomerSetInput;
  OrderCustomerSnapshot: ResolverTypeWrapper<ApiOrderCustomerSnapshot>;
  OrderDeleteInput: ApiOrderDeleteInput;
  OrderDeletePayload: ResolverTypeWrapper<ApiOrderDeletePayload>;
  OrderDeliveryGroup: ResolverTypeWrapper<ApiOrderDeliveryGroup>;
  OrderDeliveryInput: ApiOrderDeliveryInput;
  OrderDeliveryMethod: ResolverTypeWrapper<ApiOrderDeliveryMethod>;
  OrderDeliveryStatus: ApiOrderDeliveryStatus;
  OrderDeliveryStatusFilterInput: ApiOrderDeliveryStatusFilterInput;
  OrderDimensionsInput: ApiOrderDimensionsInput;
  OrderDiscount: ResolverTypeWrapper<ApiOrderDiscount>;
  OrderEdge: ResolverTypeWrapper<ApiOrderEdge>;
  OrderEditAbandonInput: ApiOrderEditAbandonInput;
  OrderEditBeginInput: ApiOrderEditBeginInput;
  OrderEditChange: ResolverTypeWrapper<ApiOrderEditChange>;
  OrderEditCommitInput: ApiOrderEditCommitInput;
  OrderEditDiscountAddInput: ApiOrderEditDiscountAddInput;
  OrderEditDiscountRemoveInput: ApiOrderEditDiscountRemoveInput;
  OrderEditLineAddInput: ApiOrderEditLineAddInput;
  OrderEditLineRemoveInput: ApiOrderEditLineRemoveInput;
  OrderEditLineUpdateInput: ApiOrderEditLineUpdateInput;
  OrderEditPayload: ResolverTypeWrapper<ApiOrderEditPayload>;
  OrderEditSession: ResolverTypeWrapper<ApiOrderEditSession>;
  OrderEditShippingUpdateInput: ApiOrderEditShippingUpdateInput;
  OrderExchange: ResolverTypeWrapper<ApiOrderExchange>;
  OrderExchangeCancelInput: ApiOrderExchangeCancelInput;
  OrderExchangeCompleteInput: ApiOrderExchangeCompleteInput;
  OrderExchangeConnection: ResolverTypeWrapper<ApiOrderExchangeConnection>;
  OrderExchangeCreateInput: ApiOrderExchangeCreateInput;
  OrderExchangeEdge: ResolverTypeWrapper<ApiOrderExchangeEdge>;
  OrderExchangePayload: ResolverTypeWrapper<ApiOrderExchangePayload>;
  OrderExchangeStatus: ApiOrderExchangeStatus;
  OrderFulfillmentStatus: ApiOrderFulfillmentStatus;
  OrderFulfillmentStatusFilterInput: ApiOrderFulfillmentStatusFilterInput;
  OrderIntegrationKind: ApiOrderIntegrationKind;
  OrderIntegrationLink: ResolverTypeWrapper<ApiOrderIntegrationLink>;
  OrderIntegrationLinkDetachInput: ApiOrderIntegrationLinkDetachInput;
  OrderIntegrationSyncRequestInput: ApiOrderIntegrationSyncRequestInput;
  OrderIntegrationSyncRetryInput: ApiOrderIntegrationSyncRetryInput;
  OrderIntegrationSyncStatus: ApiOrderIntegrationSyncStatus;
  OrderLine: ResolverTypeWrapper<ApiOrderLine>;
  OrderLineAddInput: ApiOrderLineAddInput;
  OrderLineCost: ResolverTypeWrapper<ApiOrderLineCost>;
  OrderLineCreateInput: ApiOrderLineCreateInput;
  OrderLineDeleteInput: ApiOrderLineDeleteInput;
  OrderLinePayload: ResolverTypeWrapper<ApiOrderLinePayload>;
  OrderLineUpdateInput: ApiOrderLineUpdateInput;
  OrderManualPaymentRecordInput: ApiOrderManualPaymentRecordInput;
  OrderOperation: ResolverTypeWrapper<ApiOrderOperation>;
  OrderOperationKind: ApiOrderOperationKind;
  OrderOperationPayload: ResolverTypeWrapper<ApiOrderOperationPayload>;
  OrderOperationStatus: ApiOrderOperationStatus;
  OrderOrderByInput: ApiOrderOrderByInput;
  OrderOrigin: ApiOrderOrigin;
  OrderPayload: ResolverTypeWrapper<ApiOrderPayload>;
  OrderPayment: ResolverTypeWrapper<ApiOrderPayment>;
  OrderPaymentAttempt: ResolverTypeWrapper<ApiOrderPaymentAttempt>;
  OrderPaymentCaptureInput: ApiOrderPaymentCaptureInput;
  OrderPaymentDispute: ResolverTypeWrapper<ApiOrderPaymentDispute>;
  OrderPaymentMethod: ResolverTypeWrapper<ApiOrderPaymentMethod>;
  OrderPaymentRetryInput: ApiOrderPaymentRetryInput;
  OrderPaymentStatus: ApiOrderPaymentStatus;
  OrderPaymentStatusFilterInput: ApiOrderPaymentStatusFilterInput;
  OrderPaymentStatusOverrideInput: ApiOrderPaymentStatusOverrideInput;
  OrderPaymentTransaction: ResolverTypeWrapper<ApiOrderPaymentTransaction>;
  OrderPaymentTransactionKind: ApiOrderPaymentTransactionKind;
  OrderPaymentTransactionStatus: ApiOrderPaymentTransactionStatus;
  OrderPaymentVoidInput: ApiOrderPaymentVoidInput;
  OrderPlacementStatus: ApiOrderPlacementStatus;
  OrderPlacementStatusFilterInput: ApiOrderPlacementStatusFilterInput;
  OrderRefund: ResolverTypeWrapper<ApiOrderRefund>;
  OrderRefundConnection: ResolverTypeWrapper<ApiOrderRefundConnection>;
  OrderRefundCreateInput: ApiOrderRefundCreateInput;
  OrderRefundEdge: ResolverTypeWrapper<ApiOrderRefundEdge>;
  OrderRefundLine: ResolverTypeWrapper<ApiOrderRefundLine>;
  OrderRefundLineInput: ApiOrderRefundLineInput;
  OrderRefundStatus: ApiOrderRefundStatus;
  OrderRefundTransactionAllocationInput: ApiOrderRefundTransactionAllocationInput;
  OrderReopenInput: ApiOrderReopenInput;
  OrderReturn: ResolverTypeWrapper<ApiOrderReturn>;
  OrderReturnApproveInput: ApiOrderReturnApproveInput;
  OrderReturnCancelInput: ApiOrderReturnCancelInput;
  OrderReturnConnection: ResolverTypeWrapper<ApiOrderReturnConnection>;
  OrderReturnCreateInput: ApiOrderReturnCreateInput;
  OrderReturnEdge: ResolverTypeWrapper<ApiOrderReturnEdge>;
  OrderReturnLine: ResolverTypeWrapper<ApiOrderReturnLine>;
  OrderReturnLineInput: ApiOrderReturnLineInput;
  OrderReturnPayload: ResolverTypeWrapper<ApiOrderReturnPayload>;
  OrderReturnReceiveInput: ApiOrderReturnReceiveInput;
  OrderReturnReceiveLineInput: ApiOrderReturnReceiveLineInput;
  OrderReturnRefundInput: ApiOrderReturnRefundInput;
  OrderReturnRejectInput: ApiOrderReturnRejectInput;
  OrderReturnRequestStatus: ApiOrderReturnRequestStatus;
  OrderReturnStatus: ApiOrderReturnStatus;
  OrderReturnStatusFilterInput: ApiOrderReturnStatusFilterInput;
  OrderRiskLevel: ApiOrderRiskLevel;
  OrderSortDirection: ApiOrderSortDirection;
  OrderSortField: ApiOrderSortField;
  OrderSource: ResolverTypeWrapper<ApiOrderSource>;
  OrderStatus: ApiOrderStatus;
  OrderStatusFilterInput: ApiOrderStatusFilterInput;
  OrderSyncDirection: ApiOrderSyncDirection;
  OrderTagsUpdateInput: ApiOrderTagsUpdateInput;
  OrderTaxLine: ResolverTypeWrapper<ApiOrderTaxLine>;
  OrderUnarchiveInput: ApiOrderUnarchiveInput;
  OrderUpdateInput: ApiOrderUpdateInput;
  OrderUserError: ResolverTypeWrapper<ApiOrderUserError>;
  OrderWeightInput: ApiOrderWeightInput;
  OrderWhereInput: ApiOrderWhereInput;
  OrdersBulkActionInput: ApiOrdersBulkActionInput;
  OrdersBulkActionKind: ApiOrdersBulkActionKind;
  OrdersMutation: ResolverTypeWrapper<ApiOrdersMutation>;
  OrdersQuery: ResolverTypeWrapper<ApiOrdersQuery>;
  PageInfo: ResolverTypeWrapper<ApiPageInfo>;
  Query: ResolverTypeWrapper<{}>;
  Shipment: ResolverTypeWrapper<ApiShipment>;
  ShipmentCancelInput: ApiShipmentCancelInput;
  ShipmentCreateInput: ApiShipmentCreateInput;
  ShipmentEvent: ResolverTypeWrapper<ApiShipmentEvent>;
  ShipmentMarkDeliveredInput: ApiShipmentMarkDeliveredInput;
  ShipmentMarkShippedInput: ApiShipmentMarkShippedInput;
  ShipmentPackage: ResolverTypeWrapper<ApiShipmentPackage>;
  ShipmentPackageInput: ApiShipmentPackageInput;
  ShipmentPackageItem: ResolverTypeWrapper<ApiShipmentPackageItem>;
  ShipmentPackageItemInput: ApiShipmentPackageItemInput;
  ShipmentPayload: ResolverTypeWrapper<ApiShipmentPayload>;
  ShipmentReconcileInput: ApiShipmentReconcileInput;
  ShipmentStatus: ApiShipmentStatus;
  ShipmentTracking: ResolverTypeWrapper<ApiShipmentTracking>;
  ShipmentTrackingInput: ApiShipmentTrackingInput;
  ShipmentTrackingUpdateInput: ApiShipmentTrackingUpdateInput;
  String: ResolverTypeWrapper<Scalars['String']['output']>;
  StringFilterInput: ApiStringFilterInput;
  URL: ResolverTypeWrapper<Scalars['URL']['output']>;
  User: ResolverTypeWrapper<ApiUser>;
  Weight: ResolverTypeWrapper<ApiWeight>;
  WeightUnit: ApiWeightUnit;
};

/** Mapping between all available schema types and the resolvers parents */
export type ApiResolversParentTypes = {
  ApiKey: ApiApiKey;
  BigInt: Scalars['BigInt']['output'];
  BigIntFilterInput: ApiBigIntFilterInput;
  Boolean: Scalars['Boolean']['output'];
  CalculatedOrder: ApiCalculatedOrder;
  Checkout: ApiCheckout;
  Connection: ApiResolversInterfaceTypes<ApiResolversParentTypes>['Connection'];
  CountryCodeFilterInput: ApiCountryCodeFilterInput;
  CurrencyCodeFilterInput: ApiCurrencyCodeFilterInput;
  Customer: ApiCustomer;
  DateTime: Scalars['DateTime']['output'];
  DateTimeFilterInput: ApiDateTimeFilterInput;
  Decimal: Scalars['Decimal']['output'];
  DecimalFilterInput: ApiDecimalFilterInput;
  Dimensions: ApiDimensions;
  DisplayableError: ApiResolversInterfaceTypes<ApiResolversParentTypes>['DisplayableError'];
  Email: Scalars['Email']['output'];
  Float: Scalars['Float']['output'];
  Fulfillment: ApiFulfillment;
  FulfillmentCancelInput: ApiFulfillmentCancelInput;
  FulfillmentCreateInput: ApiFulfillmentCreateInput;
  FulfillmentHold: ApiFulfillmentHold;
  FulfillmentLine: ApiFulfillmentLine;
  FulfillmentOrder: ApiFulfillmentOrder;
  FulfillmentOrderCancelRequestInput: ApiFulfillmentOrderCancelRequestInput;
  FulfillmentOrderHoldInput: ApiFulfillmentOrderHoldInput;
  FulfillmentOrderLine: ApiFulfillmentOrderLine;
  FulfillmentOrderLineQuantityInput: ApiFulfillmentOrderLineQuantityInput;
  FulfillmentOrderMoveInput: ApiFulfillmentOrderMoveInput;
  FulfillmentOrderPayload: ApiFulfillmentOrderPayload;
  FulfillmentOrderReleaseHoldInput: ApiFulfillmentOrderReleaseHoldInput;
  FulfillmentOrderSplitInput: ApiFulfillmentOrderSplitInput;
  FulfillmentOrderSubmitInput: ApiFulfillmentOrderSubmitInput;
  FulfillmentPayload: ApiFulfillmentPayload;
  FulfillmentServiceRoute: ApiFulfillmentServiceRoute;
  ID: Scalars['ID']['output'];
  IDFilterInput: ApiIdFilterInput;
  Int: Scalars['Int']['output'];
  JSON: Scalars['JSON']['output'];
  Money: ApiMoney;
  MoneyInput: ApiMoneyInput;
  Mutation: {};
  Node: ApiResolversInterfaceTypes<ApiResolversParentTypes>['Node'];
  Order: ApiOrder;
  OrderActivity: ApiOrderActivity;
  OrderActivityConnection: ApiOrderActivityConnection;
  OrderActivityEdge: ApiOrderActivityEdge;
  OrderActivityPayload: ApiOrderActivityPayload;
  OrderActor: ApiOrderActor;
  OrderAddress: ApiOrderAddress;
  OrderAddressInput: ApiOrderAddressInput;
  OrderAdminNoteUpdateInput: ApiOrderAdminNoteUpdateInput;
  OrderArchiveInput: ApiOrderArchiveInput;
  OrderBulkSelectionInput: ApiOrderBulkSelectionInput;
  OrderCancelInput: ApiOrderCancelInput;
  OrderCheckoutPlacement: ApiOrderCheckoutPlacement;
  OrderCloseInput: ApiOrderCloseInput;
  OrderCommentAddInput: ApiOrderCommentAddInput;
  OrderCompleteDraftInput: ApiOrderCompleteDraftInput;
  OrderConnection: ApiOrderConnection;
  OrderContact: ApiOrderContact;
  OrderContactInput: ApiOrderContactInput;
  OrderCost: ApiOrderCost;
  OrderCreateInput: ApiOrderCreateInput;
  OrderCustomFieldsUpdateInput: ApiOrderCustomFieldsUpdateInput;
  OrderCustomerSetInput: ApiOrderCustomerSetInput;
  OrderCustomerSnapshot: ApiOrderCustomerSnapshot;
  OrderDeleteInput: ApiOrderDeleteInput;
  OrderDeletePayload: ApiOrderDeletePayload;
  OrderDeliveryGroup: ApiOrderDeliveryGroup;
  OrderDeliveryInput: ApiOrderDeliveryInput;
  OrderDeliveryMethod: ApiOrderDeliveryMethod;
  OrderDeliveryStatusFilterInput: ApiOrderDeliveryStatusFilterInput;
  OrderDimensionsInput: ApiOrderDimensionsInput;
  OrderDiscount: ApiOrderDiscount;
  OrderEdge: ApiOrderEdge;
  OrderEditAbandonInput: ApiOrderEditAbandonInput;
  OrderEditBeginInput: ApiOrderEditBeginInput;
  OrderEditChange: ApiOrderEditChange;
  OrderEditCommitInput: ApiOrderEditCommitInput;
  OrderEditDiscountAddInput: ApiOrderEditDiscountAddInput;
  OrderEditDiscountRemoveInput: ApiOrderEditDiscountRemoveInput;
  OrderEditLineAddInput: ApiOrderEditLineAddInput;
  OrderEditLineRemoveInput: ApiOrderEditLineRemoveInput;
  OrderEditLineUpdateInput: ApiOrderEditLineUpdateInput;
  OrderEditPayload: ApiOrderEditPayload;
  OrderEditSession: ApiOrderEditSession;
  OrderEditShippingUpdateInput: ApiOrderEditShippingUpdateInput;
  OrderExchange: ApiOrderExchange;
  OrderExchangeCancelInput: ApiOrderExchangeCancelInput;
  OrderExchangeCompleteInput: ApiOrderExchangeCompleteInput;
  OrderExchangeConnection: ApiOrderExchangeConnection;
  OrderExchangeCreateInput: ApiOrderExchangeCreateInput;
  OrderExchangeEdge: ApiOrderExchangeEdge;
  OrderExchangePayload: ApiOrderExchangePayload;
  OrderFulfillmentStatusFilterInput: ApiOrderFulfillmentStatusFilterInput;
  OrderIntegrationLink: ApiOrderIntegrationLink;
  OrderIntegrationLinkDetachInput: ApiOrderIntegrationLinkDetachInput;
  OrderIntegrationSyncRequestInput: ApiOrderIntegrationSyncRequestInput;
  OrderIntegrationSyncRetryInput: ApiOrderIntegrationSyncRetryInput;
  OrderLine: ApiOrderLine;
  OrderLineAddInput: ApiOrderLineAddInput;
  OrderLineCost: ApiOrderLineCost;
  OrderLineCreateInput: ApiOrderLineCreateInput;
  OrderLineDeleteInput: ApiOrderLineDeleteInput;
  OrderLinePayload: ApiOrderLinePayload;
  OrderLineUpdateInput: ApiOrderLineUpdateInput;
  OrderManualPaymentRecordInput: ApiOrderManualPaymentRecordInput;
  OrderOperation: ApiOrderOperation;
  OrderOperationPayload: ApiOrderOperationPayload;
  OrderOrderByInput: ApiOrderOrderByInput;
  OrderPayload: ApiOrderPayload;
  OrderPayment: ApiOrderPayment;
  OrderPaymentAttempt: ApiOrderPaymentAttempt;
  OrderPaymentCaptureInput: ApiOrderPaymentCaptureInput;
  OrderPaymentDispute: ApiOrderPaymentDispute;
  OrderPaymentMethod: ApiOrderPaymentMethod;
  OrderPaymentRetryInput: ApiOrderPaymentRetryInput;
  OrderPaymentStatusFilterInput: ApiOrderPaymentStatusFilterInput;
  OrderPaymentStatusOverrideInput: ApiOrderPaymentStatusOverrideInput;
  OrderPaymentTransaction: ApiOrderPaymentTransaction;
  OrderPaymentVoidInput: ApiOrderPaymentVoidInput;
  OrderPlacementStatusFilterInput: ApiOrderPlacementStatusFilterInput;
  OrderRefund: ApiOrderRefund;
  OrderRefundConnection: ApiOrderRefundConnection;
  OrderRefundCreateInput: ApiOrderRefundCreateInput;
  OrderRefundEdge: ApiOrderRefundEdge;
  OrderRefundLine: ApiOrderRefundLine;
  OrderRefundLineInput: ApiOrderRefundLineInput;
  OrderRefundTransactionAllocationInput: ApiOrderRefundTransactionAllocationInput;
  OrderReopenInput: ApiOrderReopenInput;
  OrderReturn: ApiOrderReturn;
  OrderReturnApproveInput: ApiOrderReturnApproveInput;
  OrderReturnCancelInput: ApiOrderReturnCancelInput;
  OrderReturnConnection: ApiOrderReturnConnection;
  OrderReturnCreateInput: ApiOrderReturnCreateInput;
  OrderReturnEdge: ApiOrderReturnEdge;
  OrderReturnLine: ApiOrderReturnLine;
  OrderReturnLineInput: ApiOrderReturnLineInput;
  OrderReturnPayload: ApiOrderReturnPayload;
  OrderReturnReceiveInput: ApiOrderReturnReceiveInput;
  OrderReturnReceiveLineInput: ApiOrderReturnReceiveLineInput;
  OrderReturnRefundInput: ApiOrderReturnRefundInput;
  OrderReturnRejectInput: ApiOrderReturnRejectInput;
  OrderReturnStatusFilterInput: ApiOrderReturnStatusFilterInput;
  OrderSource: ApiOrderSource;
  OrderStatusFilterInput: ApiOrderStatusFilterInput;
  OrderTagsUpdateInput: ApiOrderTagsUpdateInput;
  OrderTaxLine: ApiOrderTaxLine;
  OrderUnarchiveInput: ApiOrderUnarchiveInput;
  OrderUpdateInput: ApiOrderUpdateInput;
  OrderUserError: ApiOrderUserError;
  OrderWeightInput: ApiOrderWeightInput;
  OrderWhereInput: ApiOrderWhereInput;
  OrdersBulkActionInput: ApiOrdersBulkActionInput;
  OrdersMutation: ApiOrdersMutation;
  OrdersQuery: ApiOrdersQuery;
  PageInfo: ApiPageInfo;
  Query: {};
  Shipment: ApiShipment;
  ShipmentCancelInput: ApiShipmentCancelInput;
  ShipmentCreateInput: ApiShipmentCreateInput;
  ShipmentEvent: ApiShipmentEvent;
  ShipmentMarkDeliveredInput: ApiShipmentMarkDeliveredInput;
  ShipmentMarkShippedInput: ApiShipmentMarkShippedInput;
  ShipmentPackage: ApiShipmentPackage;
  ShipmentPackageInput: ApiShipmentPackageInput;
  ShipmentPackageItem: ApiShipmentPackageItem;
  ShipmentPackageItemInput: ApiShipmentPackageItemInput;
  ShipmentPayload: ApiShipmentPayload;
  ShipmentReconcileInput: ApiShipmentReconcileInput;
  ShipmentTracking: ApiShipmentTracking;
  ShipmentTrackingInput: ApiShipmentTrackingInput;
  ShipmentTrackingUpdateInput: ApiShipmentTrackingUpdateInput;
  String: Scalars['String']['output'];
  StringFilterInput: ApiStringFilterInput;
  URL: Scalars['URL']['output'];
  User: ApiUser;
  Weight: ApiWeight;
};

export type ApiApiKeyResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['ApiKey'] = ApiResolversParentTypes['ApiKey']> = {
  id?: Resolver<ApiResolversTypes['ID'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export interface ApiBigIntScalarConfig extends GraphQLScalarTypeConfig<ApiResolversTypes['BigInt'], any> {
  name: 'BigInt';
}

export type ApiCalculatedOrderResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['CalculatedOrder'] = ApiResolversParentTypes['CalculatedOrder']> = {
  balanceDelta?: Resolver<ApiResolversTypes['Money'], ParentType, ContextType>;
  cost?: Resolver<ApiResolversTypes['OrderCost'], ParentType, ContextType>;
  lines?: Resolver<Array<ApiResolversTypes['OrderLine']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ApiCheckoutResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['Checkout'] = ApiResolversParentTypes['Checkout']> = {
  id?: Resolver<ApiResolversTypes['ID'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ApiConnectionResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['Connection'] = ApiResolversParentTypes['Connection']> = {
  __resolveType: TypeResolveFn<'OrderActivityConnection' | 'OrderConnection' | 'OrderExchangeConnection' | 'OrderRefundConnection' | 'OrderReturnConnection', ParentType, ContextType>;
  pageInfo?: Resolver<ApiResolversTypes['PageInfo'], ParentType, ContextType>;
  totalCount?: Resolver<ApiResolversTypes['Int'], ParentType, ContextType>;
};

export type ApiCustomerResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['Customer'] = ApiResolversParentTypes['Customer']> = {
  id?: Resolver<ApiResolversTypes['ID'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export interface ApiDateTimeScalarConfig extends GraphQLScalarTypeConfig<ApiResolversTypes['DateTime'], any> {
  name: 'DateTime';
}

export interface ApiDecimalScalarConfig extends GraphQLScalarTypeConfig<ApiResolversTypes['Decimal'], any> {
  name: 'Decimal';
}

export type ApiDimensionsResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['Dimensions'] = ApiResolversParentTypes['Dimensions']> = {
  height?: Resolver<ApiResolversTypes['Float'], ParentType, ContextType>;
  length?: Resolver<ApiResolversTypes['Float'], ParentType, ContextType>;
  unit?: Resolver<ApiResolversTypes['DimensionUnit'], ParentType, ContextType>;
  width?: Resolver<ApiResolversTypes['Float'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ApiDisplayableErrorResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['DisplayableError'] = ApiResolversParentTypes['DisplayableError']> = {
  __resolveType: TypeResolveFn<'OrderUserError', ParentType, ContextType>;
  field?: Resolver<Maybe<Array<ApiResolversTypes['String']>>, ParentType, ContextType>;
  message?: Resolver<ApiResolversTypes['String'], ParentType, ContextType>;
};

export interface ApiEmailScalarConfig extends GraphQLScalarTypeConfig<ApiResolversTypes['Email'], any> {
  name: 'Email';
}

export type ApiFulfillmentResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['Fulfillment'] = ApiResolversParentTypes['Fulfillment']> = {
  createdAt?: Resolver<ApiResolversTypes['DateTime'], ParentType, ContextType>;
  fulfillmentOrder?: Resolver<ApiResolversTypes['FulfillmentOrder'], ParentType, ContextType>;
  id?: Resolver<ApiResolversTypes['ID'], ParentType, ContextType>;
  lines?: Resolver<Array<ApiResolversTypes['FulfillmentLine']>, ParentType, ContextType>;
  locationId?: Resolver<ApiResolversTypes['ID'], ParentType, ContextType>;
  notifyCustomer?: Resolver<ApiResolversTypes['Boolean'], ParentType, ContextType>;
  order?: Resolver<ApiResolversTypes['Order'], ParentType, ContextType>;
  shipments?: Resolver<Array<ApiResolversTypes['Shipment']>, ParentType, ContextType>;
  status?: Resolver<ApiResolversTypes['FulfillmentStatus'], ParentType, ContextType>;
  updatedAt?: Resolver<ApiResolversTypes['DateTime'], ParentType, ContextType>;
  version?: Resolver<ApiResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ApiFulfillmentHoldResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['FulfillmentHold'] = ApiResolversParentTypes['FulfillmentHold']> = {
  createdAt?: Resolver<ApiResolversTypes['DateTime'], ParentType, ContextType>;
  heldBy?: Resolver<ApiResolversTypes['OrderActor'], ParentType, ContextType>;
  id?: Resolver<ApiResolversTypes['ID'], ParentType, ContextType>;
  note?: Resolver<Maybe<ApiResolversTypes['String']>, ParentType, ContextType>;
  reasonCode?: Resolver<ApiResolversTypes['String'], ParentType, ContextType>;
  releasedAt?: Resolver<Maybe<ApiResolversTypes['DateTime']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ApiFulfillmentLineResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['FulfillmentLine'] = ApiResolversParentTypes['FulfillmentLine']> = {
  orderLine?: Resolver<ApiResolversTypes['OrderLine'], ParentType, ContextType>;
  quantity?: Resolver<ApiResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ApiFulfillmentOrderResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['FulfillmentOrder'] = ApiResolversParentTypes['FulfillmentOrder']> = {
  assignedLocationId?: Resolver<ApiResolversTypes['ID'], ParentType, ContextType>;
  assignedService?: Resolver<Maybe<ApiResolversTypes['FulfillmentServiceRoute']>, ParentType, ContextType>;
  createdAt?: Resolver<ApiResolversTypes['DateTime'], ParentType, ContextType>;
  deliveryGroup?: Resolver<ApiResolversTypes['OrderDeliveryGroup'], ParentType, ContextType>;
  fulfillAt?: Resolver<Maybe<ApiResolversTypes['DateTime']>, ParentType, ContextType>;
  fulfillBy?: Resolver<Maybe<ApiResolversTypes['DateTime']>, ParentType, ContextType>;
  holds?: Resolver<Array<ApiResolversTypes['FulfillmentHold']>, ParentType, ContextType>;
  id?: Resolver<ApiResolversTypes['ID'], ParentType, ContextType>;
  lines?: Resolver<Array<ApiResolversTypes['FulfillmentOrderLine']>, ParentType, ContextType>;
  order?: Resolver<ApiResolversTypes['Order'], ParentType, ContextType>;
  requestStatus?: Resolver<ApiResolversTypes['FulfillmentRequestStatus'], ParentType, ContextType>;
  status?: Resolver<ApiResolversTypes['FulfillmentOrderStatus'], ParentType, ContextType>;
  supportedActions?: Resolver<Array<ApiResolversTypes['String']>, ParentType, ContextType>;
  updatedAt?: Resolver<ApiResolversTypes['DateTime'], ParentType, ContextType>;
  version?: Resolver<ApiResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ApiFulfillmentOrderLineResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['FulfillmentOrderLine'] = ApiResolversParentTypes['FulfillmentOrderLine']> = {
  fulfilledQuantity?: Resolver<ApiResolversTypes['Int'], ParentType, ContextType>;
  id?: Resolver<ApiResolversTypes['ID'], ParentType, ContextType>;
  orderLine?: Resolver<ApiResolversTypes['OrderLine'], ParentType, ContextType>;
  quantity?: Resolver<ApiResolversTypes['Int'], ParentType, ContextType>;
  remainingQuantity?: Resolver<ApiResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ApiFulfillmentOrderPayloadResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['FulfillmentOrderPayload'] = ApiResolversParentTypes['FulfillmentOrderPayload']> = {
  fulfillmentOrder?: Resolver<Maybe<ApiResolversTypes['FulfillmentOrder']>, ParentType, ContextType>;
  order?: Resolver<Maybe<ApiResolversTypes['Order']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ApiResolversTypes['OrderUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ApiFulfillmentPayloadResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['FulfillmentPayload'] = ApiResolversParentTypes['FulfillmentPayload']> = {
  fulfillment?: Resolver<Maybe<ApiResolversTypes['Fulfillment']>, ParentType, ContextType>;
  order?: Resolver<Maybe<ApiResolversTypes['Order']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ApiResolversTypes['OrderUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ApiFulfillmentServiceRouteResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['FulfillmentServiceRoute'] = ApiResolversParentTypes['FulfillmentServiceRoute']> = {
  appCode?: Resolver<ApiResolversTypes['String'], ParentType, ContextType>;
  externalReference?: Resolver<Maybe<ApiResolversTypes['String']>, ParentType, ContextType>;
  installationId?: Resolver<ApiResolversTypes['ID'], ParentType, ContextType>;
  providerRevision?: Resolver<ApiResolversTypes['String'], ParentType, ContextType>;
  serviceCode?: Resolver<ApiResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export interface ApiJsonScalarConfig extends GraphQLScalarTypeConfig<ApiResolversTypes['JSON'], any> {
  name: 'JSON';
}

export type ApiMoneyResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['Money'] = ApiResolversParentTypes['Money']> = {
  amount?: Resolver<ApiResolversTypes['Decimal'], ParentType, ContextType>;
  currencyCode?: Resolver<ApiResolversTypes['CurrencyCode'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ApiMutationResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['Mutation'] = ApiResolversParentTypes['Mutation']> = {
  ordersMutation?: Resolver<ApiResolversTypes['OrdersMutation'], ParentType, ContextType>;
};

export type ApiNodeResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['Node'] = ApiResolversParentTypes['Node']> = {
  __resolveType: TypeResolveFn<'Fulfillment' | 'FulfillmentHold' | 'FulfillmentOrder' | 'FulfillmentOrderLine' | 'Order' | 'OrderActivity' | 'OrderAddress' | 'OrderDeliveryGroup' | 'OrderDiscount' | 'OrderEditChange' | 'OrderEditSession' | 'OrderExchange' | 'OrderIntegrationLink' | 'OrderLine' | 'OrderOperation' | 'OrderPaymentAttempt' | 'OrderPaymentDispute' | 'OrderPaymentTransaction' | 'OrderRefund' | 'OrderReturn' | 'OrderTaxLine' | 'Shipment' | 'ShipmentEvent' | 'ShipmentPackage', ParentType, ContextType>;
  id?: Resolver<ApiResolversTypes['ID'], ParentType, ContextType>;
};

export type ApiOrderResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['Order'] = ApiResolversParentTypes['Order']> = {
  activity?: Resolver<ApiResolversTypes['OrderActivityConnection'], ParentType, ContextType, RequireFields<ApiOrderActivityArgs, 'first'>>;
  adminNote?: Resolver<Maybe<ApiResolversTypes['String']>, ParentType, ContextType>;
  archivedAt?: Resolver<Maybe<ApiResolversTypes['DateTime']>, ParentType, ContextType>;
  availableActions?: Resolver<Array<ApiResolversTypes['OrderAction']>, ParentType, ContextType>;
  billingAddress?: Resolver<Maybe<ApiResolversTypes['OrderAddress']>, ParentType, ContextType>;
  cancelledAt?: Resolver<Maybe<ApiResolversTypes['DateTime']>, ParentType, ContextType>;
  checkout?: Resolver<Maybe<ApiResolversTypes['Checkout']>, ParentType, ContextType>;
  checkoutPlacement?: Resolver<Maybe<ApiResolversTypes['OrderCheckoutPlacement']>, ParentType, ContextType>;
  closedAt?: Resolver<Maybe<ApiResolversTypes['DateTime']>, ParentType, ContextType>;
  contact?: Resolver<ApiResolversTypes['OrderContact'], ParentType, ContextType>;
  cost?: Resolver<ApiResolversTypes['OrderCost'], ParentType, ContextType>;
  createdAt?: Resolver<ApiResolversTypes['DateTime'], ParentType, ContextType>;
  currencyCode?: Resolver<ApiResolversTypes['CurrencyCode'], ParentType, ContextType>;
  customFields?: Resolver<ApiResolversTypes['JSON'], ParentType, ContextType>;
  customer?: Resolver<Maybe<ApiResolversTypes['Customer']>, ParentType, ContextType>;
  customerNote?: Resolver<Maybe<ApiResolversTypes['String']>, ParentType, ContextType>;
  customerSnapshot?: Resolver<ApiResolversTypes['OrderCustomerSnapshot'], ParentType, ContextType>;
  deliveryGroups?: Resolver<Array<ApiResolversTypes['OrderDeliveryGroup']>, ParentType, ContextType>;
  deliveryStatus?: Resolver<ApiResolversTypes['OrderDeliveryStatus'], ParentType, ContextType>;
  discounts?: Resolver<Array<ApiResolversTypes['OrderDiscount']>, ParentType, ContextType>;
  exchanges?: Resolver<ApiResolversTypes['OrderExchangeConnection'], ParentType, ContextType, RequireFields<ApiOrderExchangesArgs, 'first'>>;
  expiresAt?: Resolver<Maybe<ApiResolversTypes['DateTime']>, ParentType, ContextType>;
  fulfillmentOrders?: Resolver<Array<ApiResolversTypes['FulfillmentOrder']>, ParentType, ContextType>;
  fulfillmentStatus?: Resolver<ApiResolversTypes['OrderFulfillmentStatus'], ParentType, ContextType>;
  fulfillments?: Resolver<Array<ApiResolversTypes['Fulfillment']>, ParentType, ContextType>;
  id?: Resolver<ApiResolversTypes['ID'], ParentType, ContextType>;
  integrationLinks?: Resolver<Array<ApiResolversTypes['OrderIntegrationLink']>, ParentType, ContextType>;
  lines?: Resolver<Array<ApiResolversTypes['OrderLine']>, ParentType, ContextType>;
  localeCode?: Resolver<Maybe<ApiResolversTypes['LocaleCode']>, ParentType, ContextType>;
  number?: Resolver<ApiResolversTypes['BigInt'], ParentType, ContextType>;
  origin?: Resolver<ApiResolversTypes['OrderOrigin'], ParentType, ContextType>;
  payment?: Resolver<ApiResolversTypes['OrderPayment'], ParentType, ContextType>;
  paymentStatus?: Resolver<ApiResolversTypes['OrderPaymentStatus'], ParentType, ContextType>;
  placedAt?: Resolver<Maybe<ApiResolversTypes['DateTime']>, ParentType, ContextType>;
  refunds?: Resolver<ApiResolversTypes['OrderRefundConnection'], ParentType, ContextType, RequireFields<ApiOrderRefundsArgs, 'first'>>;
  returnStatus?: Resolver<ApiResolversTypes['OrderReturnStatus'], ParentType, ContextType>;
  returns?: Resolver<ApiResolversTypes['OrderReturnConnection'], ParentType, ContextType, RequireFields<ApiOrderReturnsArgs, 'first'>>;
  riskLevel?: Resolver<ApiResolversTypes['OrderRiskLevel'], ParentType, ContextType>;
  shipments?: Resolver<Array<ApiResolversTypes['Shipment']>, ParentType, ContextType>;
  shippingAddress?: Resolver<Maybe<ApiResolversTypes['OrderAddress']>, ParentType, ContextType>;
  source?: Resolver<Maybe<ApiResolversTypes['OrderSource']>, ParentType, ContextType>;
  status?: Resolver<ApiResolversTypes['OrderStatus'], ParentType, ContextType>;
  tags?: Resolver<Array<ApiResolversTypes['String']>, ParentType, ContextType>;
  taxLines?: Resolver<Array<ApiResolversTypes['OrderTaxLine']>, ParentType, ContextType>;
  totalQuantity?: Resolver<ApiResolversTypes['Int'], ParentType, ContextType>;
  updatedAt?: Resolver<ApiResolversTypes['DateTime'], ParentType, ContextType>;
  version?: Resolver<ApiResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ApiOrderActivityResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['OrderActivity'] = ApiResolversParentTypes['OrderActivity']> = {
  actor?: Resolver<ApiResolversTypes['OrderActor'], ParentType, ContextType>;
  data?: Resolver<ApiResolversTypes['JSON'], ParentType, ContextType>;
  happenedAt?: Resolver<ApiResolversTypes['DateTime'], ParentType, ContextType>;
  id?: Resolver<ApiResolversTypes['ID'], ParentType, ContextType>;
  message?: Resolver<Maybe<ApiResolversTypes['String']>, ParentType, ContextType>;
  recordedAt?: Resolver<ApiResolversTypes['DateTime'], ParentType, ContextType>;
  sequence?: Resolver<ApiResolversTypes['BigInt'], ParentType, ContextType>;
  type?: Resolver<ApiResolversTypes['String'], ParentType, ContextType>;
  visibility?: Resolver<ApiResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ApiOrderActivityConnectionResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['OrderActivityConnection'] = ApiResolversParentTypes['OrderActivityConnection']> = {
  edges?: Resolver<Array<ApiResolversTypes['OrderActivityEdge']>, ParentType, ContextType>;
  nodes?: Resolver<Array<ApiResolversTypes['OrderActivity']>, ParentType, ContextType>;
  pageInfo?: Resolver<ApiResolversTypes['PageInfo'], ParentType, ContextType>;
  totalCount?: Resolver<ApiResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ApiOrderActivityEdgeResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['OrderActivityEdge'] = ApiResolversParentTypes['OrderActivityEdge']> = {
  cursor?: Resolver<ApiResolversTypes['String'], ParentType, ContextType>;
  node?: Resolver<ApiResolversTypes['OrderActivity'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ApiOrderActivityPayloadResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['OrderActivityPayload'] = ApiResolversParentTypes['OrderActivityPayload']> = {
  activity?: Resolver<Maybe<ApiResolversTypes['OrderActivity']>, ParentType, ContextType>;
  order?: Resolver<Maybe<ApiResolversTypes['Order']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ApiResolversTypes['OrderUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ApiOrderActorResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['OrderActor'] = ApiResolversParentTypes['OrderActor']> = {
  apiKey?: Resolver<Maybe<ApiResolversTypes['ApiKey']>, ParentType, ContextType>;
  displayName?: Resolver<Maybe<ApiResolversTypes['String']>, ParentType, ContextType>;
  id?: Resolver<Maybe<ApiResolversTypes['ID']>, ParentType, ContextType>;
  type?: Resolver<ApiResolversTypes['OrderActorType'], ParentType, ContextType>;
  user?: Resolver<Maybe<ApiResolversTypes['User']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ApiOrderAddressResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['OrderAddress'] = ApiResolversParentTypes['OrderAddress']> = {
  address1?: Resolver<Maybe<ApiResolversTypes['String']>, ParentType, ContextType>;
  address2?: Resolver<Maybe<ApiResolversTypes['String']>, ParentType, ContextType>;
  city?: Resolver<Maybe<ApiResolversTypes['String']>, ParentType, ContextType>;
  company?: Resolver<Maybe<ApiResolversTypes['String']>, ParentType, ContextType>;
  countryCode?: Resolver<Maybe<ApiResolversTypes['CountryCode']>, ParentType, ContextType>;
  data?: Resolver<ApiResolversTypes['JSON'], ParentType, ContextType>;
  email?: Resolver<Maybe<ApiResolversTypes['String']>, ParentType, ContextType>;
  firstName?: Resolver<Maybe<ApiResolversTypes['String']>, ParentType, ContextType>;
  id?: Resolver<ApiResolversTypes['ID'], ParentType, ContextType>;
  lastName?: Resolver<Maybe<ApiResolversTypes['String']>, ParentType, ContextType>;
  middleName?: Resolver<Maybe<ApiResolversTypes['String']>, ParentType, ContextType>;
  phone?: Resolver<Maybe<ApiResolversTypes['String']>, ParentType, ContextType>;
  postalCode?: Resolver<Maybe<ApiResolversTypes['String']>, ParentType, ContextType>;
  provinceCode?: Resolver<Maybe<ApiResolversTypes['String']>, ParentType, ContextType>;
  redactedAt?: Resolver<Maybe<ApiResolversTypes['DateTime']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ApiOrderCheckoutPlacementResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['OrderCheckoutPlacement'] = ApiResolversParentTypes['OrderCheckoutPlacement']> = {
  checkoutId?: Resolver<ApiResolversTypes['ID'], ParentType, ContextType>;
  checkoutVersion?: Resolver<ApiResolversTypes['Int'], ParentType, ContextType>;
  confirmedAt?: Resolver<Maybe<ApiResolversTypes['DateTime']>, ParentType, ContextType>;
  contractVersion?: Resolver<ApiResolversTypes['Int'], ParentType, ContextType>;
  deliveryRevision?: Resolver<ApiResolversTypes['String'], ParentType, ContextType>;
  failedAt?: Resolver<Maybe<ApiResolversTypes['DateTime']>, ParentType, ContextType>;
  finalQuoteRevision?: Resolver<ApiResolversTypes['String'], ParentType, ContextType>;
  paymentMethodsRevision?: Resolver<ApiResolversTypes['String'], ParentType, ContextType>;
  placementId?: Resolver<ApiResolversTypes['ID'], ParentType, ContextType>;
  resultRevision?: Resolver<ApiResolversTypes['String'], ParentType, ContextType>;
  snapshotHash?: Resolver<ApiResolversTypes['String'], ParentType, ContextType>;
  status?: Resolver<ApiResolversTypes['OrderPlacementStatus'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ApiOrderConnectionResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['OrderConnection'] = ApiResolversParentTypes['OrderConnection']> = {
  edges?: Resolver<Array<ApiResolversTypes['OrderEdge']>, ParentType, ContextType>;
  nodes?: Resolver<Array<ApiResolversTypes['Order']>, ParentType, ContextType>;
  pageInfo?: Resolver<ApiResolversTypes['PageInfo'], ParentType, ContextType>;
  totalCount?: Resolver<ApiResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ApiOrderContactResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['OrderContact'] = ApiResolversParentTypes['OrderContact']> = {
  company?: Resolver<Maybe<ApiResolversTypes['String']>, ParentType, ContextType>;
  email?: Resolver<Maybe<ApiResolversTypes['String']>, ParentType, ContextType>;
  firstName?: Resolver<Maybe<ApiResolversTypes['String']>, ParentType, ContextType>;
  lastName?: Resolver<Maybe<ApiResolversTypes['String']>, ParentType, ContextType>;
  middleName?: Resolver<Maybe<ApiResolversTypes['String']>, ParentType, ContextType>;
  note?: Resolver<Maybe<ApiResolversTypes['String']>, ParentType, ContextType>;
  phone?: Resolver<Maybe<ApiResolversTypes['String']>, ParentType, ContextType>;
  redactedAt?: Resolver<Maybe<ApiResolversTypes['DateTime']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ApiOrderCostResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['OrderCost'] = ApiResolversParentTypes['OrderCost']> = {
  adjustmentAmount?: Resolver<ApiResolversTypes['Money'], ParentType, ContextType>;
  discountAmount?: Resolver<ApiResolversTypes['Money'], ParentType, ContextType>;
  dutyAmount?: Resolver<ApiResolversTypes['Money'], ParentType, ContextType>;
  outstandingAmount?: Resolver<ApiResolversTypes['Money'], ParentType, ContextType>;
  paidAmount?: Resolver<ApiResolversTypes['Money'], ParentType, ContextType>;
  refundedAmount?: Resolver<ApiResolversTypes['Money'], ParentType, ContextType>;
  shippingAmount?: Resolver<ApiResolversTypes['Money'], ParentType, ContextType>;
  subtotalAmount?: Resolver<ApiResolversTypes['Money'], ParentType, ContextType>;
  taxAmount?: Resolver<ApiResolversTypes['Money'], ParentType, ContextType>;
  totalAmount?: Resolver<ApiResolversTypes['Money'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ApiOrderCustomerSnapshotResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['OrderCustomerSnapshot'] = ApiResolversParentTypes['OrderCustomerSnapshot']> = {
  company?: Resolver<Maybe<ApiResolversTypes['String']>, ParentType, ContextType>;
  countryCode?: Resolver<Maybe<ApiResolversTypes['CountryCode']>, ParentType, ContextType>;
  customerId?: Resolver<Maybe<ApiResolversTypes['ID']>, ParentType, ContextType>;
  email?: Resolver<Maybe<ApiResolversTypes['String']>, ParentType, ContextType>;
  firstName?: Resolver<Maybe<ApiResolversTypes['String']>, ParentType, ContextType>;
  lastName?: Resolver<Maybe<ApiResolversTypes['String']>, ParentType, ContextType>;
  middleName?: Resolver<Maybe<ApiResolversTypes['String']>, ParentType, ContextType>;
  phone?: Resolver<Maybe<ApiResolversTypes['String']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ApiOrderDeletePayloadResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['OrderDeletePayload'] = ApiResolversParentTypes['OrderDeletePayload']> = {
  deletedId?: Resolver<Maybe<ApiResolversTypes['ID']>, ParentType, ContextType>;
  order?: Resolver<Maybe<ApiResolversTypes['Order']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ApiResolversTypes['OrderUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ApiOrderDeliveryGroupResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['OrderDeliveryGroup'] = ApiResolversParentTypes['OrderDeliveryGroup']> = {
  address?: Resolver<Maybe<ApiResolversTypes['OrderAddress']>, ParentType, ContextType>;
  createdAt?: Resolver<ApiResolversTypes['DateTime'], ParentType, ContextType>;
  id?: Resolver<ApiResolversTypes['ID'], ParentType, ContextType>;
  lines?: Resolver<Array<ApiResolversTypes['OrderLine']>, ParentType, ContextType>;
  recipient?: Resolver<Maybe<ApiResolversTypes['OrderContact']>, ParentType, ContextType>;
  selectedMethod?: Resolver<Maybe<ApiResolversTypes['OrderDeliveryMethod']>, ParentType, ContextType>;
  updatedAt?: Resolver<ApiResolversTypes['DateTime'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ApiOrderDeliveryMethodResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['OrderDeliveryMethod'] = ApiResolversParentTypes['OrderDeliveryMethod']> = {
  amount?: Resolver<ApiResolversTypes['Money'], ParentType, ContextType>;
  code?: Resolver<ApiResolversTypes['String'], ParentType, ContextType>;
  customerInput?: Resolver<ApiResolversTypes['JSON'], ParentType, ContextType>;
  paymentModel?: Resolver<Maybe<ApiResolversTypes['String']>, ParentType, ContextType>;
  providerCode?: Resolver<ApiResolversTypes['String'], ParentType, ContextType>;
  providerSnapshot?: Resolver<ApiResolversTypes['JSON'], ParentType, ContextType>;
  title?: Resolver<ApiResolversTypes['String'], ParentType, ContextType>;
  type?: Resolver<ApiResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ApiOrderDiscountResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['OrderDiscount'] = ApiResolversParentTypes['OrderDiscount']> = {
  amount?: Resolver<ApiResolversTypes['Money'], ParentType, ContextType>;
  code?: Resolver<Maybe<ApiResolversTypes['String']>, ParentType, ContextType>;
  id?: Resolver<ApiResolversTypes['ID'], ParentType, ContextType>;
  metadata?: Resolver<ApiResolversTypes['JSON'], ParentType, ContextType>;
  source?: Resolver<ApiResolversTypes['String'], ParentType, ContextType>;
  target?: Resolver<ApiResolversTypes['String'], ParentType, ContextType>;
  title?: Resolver<ApiResolversTypes['String'], ParentType, ContextType>;
  value?: Resolver<ApiResolversTypes['Decimal'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ApiOrderEdgeResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['OrderEdge'] = ApiResolversParentTypes['OrderEdge']> = {
  cursor?: Resolver<ApiResolversTypes['String'], ParentType, ContextType>;
  node?: Resolver<ApiResolversTypes['Order'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ApiOrderEditChangeResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['OrderEditChange'] = ApiResolversParentTypes['OrderEditChange']> = {
  createdAt?: Resolver<ApiResolversTypes['DateTime'], ParentType, ContextType>;
  id?: Resolver<ApiResolversTypes['ID'], ParentType, ContextType>;
  kind?: Resolver<ApiResolversTypes['String'], ParentType, ContextType>;
  payload?: Resolver<ApiResolversTypes['JSON'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ApiOrderEditPayloadResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['OrderEditPayload'] = ApiResolversParentTypes['OrderEditPayload']> = {
  edit?: Resolver<Maybe<ApiResolversTypes['OrderEditSession']>, ParentType, ContextType>;
  order?: Resolver<Maybe<ApiResolversTypes['Order']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ApiResolversTypes['OrderUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ApiOrderEditSessionResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['OrderEditSession'] = ApiResolversParentTypes['OrderEditSession']> = {
  baseOrderVersion?: Resolver<ApiResolversTypes['Int'], ParentType, ContextType>;
  calculatedOrder?: Resolver<ApiResolversTypes['CalculatedOrder'], ParentType, ContextType>;
  changes?: Resolver<Array<ApiResolversTypes['OrderEditChange']>, ParentType, ContextType>;
  createdAt?: Resolver<ApiResolversTypes['DateTime'], ParentType, ContextType>;
  createdBy?: Resolver<ApiResolversTypes['OrderActor'], ParentType, ContextType>;
  expiresAt?: Resolver<ApiResolversTypes['DateTime'], ParentType, ContextType>;
  id?: Resolver<ApiResolversTypes['ID'], ParentType, ContextType>;
  order?: Resolver<ApiResolversTypes['Order'], ParentType, ContextType>;
  status?: Resolver<ApiResolversTypes['String'], ParentType, ContextType>;
  version?: Resolver<ApiResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ApiOrderExchangeResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['OrderExchange'] = ApiResolversParentTypes['OrderExchange']> = {
  balance?: Resolver<ApiResolversTypes['Money'], ParentType, ContextType>;
  createdAt?: Resolver<ApiResolversTypes['DateTime'], ParentType, ContextType>;
  id?: Resolver<ApiResolversTypes['ID'], ParentType, ContextType>;
  inboundLines?: Resolver<Array<ApiResolversTypes['OrderReturnLine']>, ParentType, ContextType>;
  order?: Resolver<ApiResolversTypes['Order'], ParentType, ContextType>;
  outboundLines?: Resolver<Array<ApiResolversTypes['OrderLine']>, ParentType, ContextType>;
  status?: Resolver<ApiResolversTypes['OrderExchangeStatus'], ParentType, ContextType>;
  updatedAt?: Resolver<ApiResolversTypes['DateTime'], ParentType, ContextType>;
  version?: Resolver<ApiResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ApiOrderExchangeConnectionResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['OrderExchangeConnection'] = ApiResolversParentTypes['OrderExchangeConnection']> = {
  edges?: Resolver<Array<ApiResolversTypes['OrderExchangeEdge']>, ParentType, ContextType>;
  nodes?: Resolver<Array<ApiResolversTypes['OrderExchange']>, ParentType, ContextType>;
  pageInfo?: Resolver<ApiResolversTypes['PageInfo'], ParentType, ContextType>;
  totalCount?: Resolver<ApiResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ApiOrderExchangeEdgeResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['OrderExchangeEdge'] = ApiResolversParentTypes['OrderExchangeEdge']> = {
  cursor?: Resolver<ApiResolversTypes['String'], ParentType, ContextType>;
  node?: Resolver<ApiResolversTypes['OrderExchange'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ApiOrderExchangePayloadResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['OrderExchangePayload'] = ApiResolversParentTypes['OrderExchangePayload']> = {
  exchange?: Resolver<Maybe<ApiResolversTypes['OrderExchange']>, ParentType, ContextType>;
  order?: Resolver<Maybe<ApiResolversTypes['Order']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ApiResolversTypes['OrderUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ApiOrderIntegrationLinkResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['OrderIntegrationLink'] = ApiResolversParentTypes['OrderIntegrationLink']> = {
  appCode?: Resolver<ApiResolversTypes['String'], ParentType, ContextType>;
  createdAt?: Resolver<ApiResolversTypes['DateTime'], ParentType, ContextType>;
  direction?: Resolver<ApiResolversTypes['OrderSyncDirection'], ParentType, ContextType>;
  externalId?: Resolver<Maybe<ApiResolversTypes['String']>, ParentType, ContextType>;
  externalUrl?: Resolver<Maybe<ApiResolversTypes['URL']>, ParentType, ContextType>;
  id?: Resolver<ApiResolversTypes['ID'], ParentType, ContextType>;
  installationId?: Resolver<ApiResolversTypes['ID'], ParentType, ContextType>;
  kind?: Resolver<ApiResolversTypes['OrderIntegrationKind'], ParentType, ContextType>;
  lastErrorCode?: Resolver<Maybe<ApiResolversTypes['String']>, ParentType, ContextType>;
  lastErrorMessage?: Resolver<Maybe<ApiResolversTypes['String']>, ParentType, ContextType>;
  lastExportedOrderVersion?: Resolver<Maybe<ApiResolversTypes['Int']>, ParentType, ContextType>;
  lastImportedExternalVersion?: Resolver<Maybe<ApiResolversTypes['String']>, ParentType, ContextType>;
  lastSyncedAt?: Resolver<Maybe<ApiResolversTypes['DateTime']>, ParentType, ContextType>;
  status?: Resolver<ApiResolversTypes['OrderIntegrationSyncStatus'], ParentType, ContextType>;
  updatedAt?: Resolver<ApiResolversTypes['DateTime'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ApiOrderLineResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['OrderLine'] = ApiResolversParentTypes['OrderLine']> = {
  cancelledQuantity?: Resolver<ApiResolversTypes['Int'], ParentType, ContextType>;
  cost?: Resolver<ApiResolversTypes['OrderLineCost'], ParentType, ContextType>;
  createdAt?: Resolver<ApiResolversTypes['DateTime'], ParentType, ContextType>;
  customFields?: Resolver<ApiResolversTypes['JSON'], ParentType, ContextType>;
  fulfillableQuantity?: Resolver<ApiResolversTypes['Int'], ParentType, ContextType>;
  fulfilledQuantity?: Resolver<ApiResolversTypes['Int'], ParentType, ContextType>;
  id?: Resolver<ApiResolversTypes['ID'], ParentType, ContextType>;
  imageUrl?: Resolver<Maybe<ApiResolversTypes['URL']>, ParentType, ContextType>;
  parentLine?: Resolver<Maybe<ApiResolversTypes['OrderLine']>, ParentType, ContextType>;
  productId?: Resolver<Maybe<ApiResolversTypes['ID']>, ParentType, ContextType>;
  purchasableId?: Resolver<Maybe<ApiResolversTypes['ID']>, ParentType, ContextType>;
  purchasableSnapshot?: Resolver<ApiResolversTypes['JSON'], ParentType, ContextType>;
  quantity?: Resolver<ApiResolversTypes['Int'], ParentType, ContextType>;
  refundableQuantity?: Resolver<ApiResolversTypes['Int'], ParentType, ContextType>;
  requiresShipping?: Resolver<ApiResolversTypes['Boolean'], ParentType, ContextType>;
  returnableQuantity?: Resolver<ApiResolversTypes['Int'], ParentType, ContextType>;
  returnedQuantity?: Resolver<ApiResolversTypes['Int'], ParentType, ContextType>;
  sku?: Resolver<Maybe<ApiResolversTypes['String']>, ParentType, ContextType>;
  taxable?: Resolver<ApiResolversTypes['Boolean'], ParentType, ContextType>;
  title?: Resolver<ApiResolversTypes['String'], ParentType, ContextType>;
  unitCost?: Resolver<Maybe<ApiResolversTypes['Money']>, ParentType, ContextType>;
  updatedAt?: Resolver<ApiResolversTypes['DateTime'], ParentType, ContextType>;
  variantId?: Resolver<Maybe<ApiResolversTypes['ID']>, ParentType, ContextType>;
  version?: Resolver<ApiResolversTypes['Int'], ParentType, ContextType>;
  weight?: Resolver<Maybe<ApiResolversTypes['Weight']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ApiOrderLineCostResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['OrderLineCost'] = ApiResolversParentTypes['OrderLineCost']> = {
  discountAmount?: Resolver<ApiResolversTypes['Money'], ParentType, ContextType>;
  dutyAmount?: Resolver<ApiResolversTypes['Money'], ParentType, ContextType>;
  subtotalAmount?: Resolver<ApiResolversTypes['Money'], ParentType, ContextType>;
  taxAmount?: Resolver<ApiResolversTypes['Money'], ParentType, ContextType>;
  totalAmount?: Resolver<ApiResolversTypes['Money'], ParentType, ContextType>;
  unitCompareAtPrice?: Resolver<Maybe<ApiResolversTypes['Money']>, ParentType, ContextType>;
  unitPrice?: Resolver<ApiResolversTypes['Money'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ApiOrderLinePayloadResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['OrderLinePayload'] = ApiResolversParentTypes['OrderLinePayload']> = {
  line?: Resolver<Maybe<ApiResolversTypes['OrderLine']>, ParentType, ContextType>;
  order?: Resolver<Maybe<ApiResolversTypes['Order']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ApiResolversTypes['OrderUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ApiOrderOperationResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['OrderOperation'] = ApiResolversParentTypes['OrderOperation']> = {
  completedAt?: Resolver<Maybe<ApiResolversTypes['DateTime']>, ParentType, ContextType>;
  createdAt?: Resolver<ApiResolversTypes['DateTime'], ParentType, ContextType>;
  failureCode?: Resolver<Maybe<ApiResolversTypes['String']>, ParentType, ContextType>;
  failureMessage?: Resolver<Maybe<ApiResolversTypes['String']>, ParentType, ContextType>;
  id?: Resolver<ApiResolversTypes['ID'], ParentType, ContextType>;
  kind?: Resolver<ApiResolversTypes['OrderOperationKind'], ParentType, ContextType>;
  order?: Resolver<Maybe<ApiResolversTypes['Order']>, ParentType, ContextType>;
  progress?: Resolver<Maybe<ApiResolversTypes['Int']>, ParentType, ContextType>;
  resourceId?: Resolver<Maybe<ApiResolversTypes['ID']>, ParentType, ContextType>;
  retryable?: Resolver<ApiResolversTypes['Boolean'], ParentType, ContextType>;
  startedAt?: Resolver<Maybe<ApiResolversTypes['DateTime']>, ParentType, ContextType>;
  status?: Resolver<ApiResolversTypes['OrderOperationStatus'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ApiOrderOperationPayloadResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['OrderOperationPayload'] = ApiResolversParentTypes['OrderOperationPayload']> = {
  operation?: Resolver<Maybe<ApiResolversTypes['OrderOperation']>, ParentType, ContextType>;
  order?: Resolver<Maybe<ApiResolversTypes['Order']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ApiResolversTypes['OrderUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ApiOrderPayloadResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['OrderPayload'] = ApiResolversParentTypes['OrderPayload']> = {
  order?: Resolver<Maybe<ApiResolversTypes['Order']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ApiResolversTypes['OrderUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ApiOrderPaymentResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['OrderPayment'] = ApiResolversParentTypes['OrderPayment']> = {
  attempts?: Resolver<Array<ApiResolversTypes['OrderPaymentAttempt']>, ParentType, ContextType>;
  authorizedAmount?: Resolver<ApiResolversTypes['Money'], ParentType, ContextType>;
  capturedAmount?: Resolver<ApiResolversTypes['Money'], ParentType, ContextType>;
  disputes?: Resolver<Array<ApiResolversTypes['OrderPaymentDispute']>, ParentType, ContextType>;
  outstandingAmount?: Resolver<ApiResolversTypes['Money'], ParentType, ContextType>;
  refundedAmount?: Resolver<ApiResolversTypes['Money'], ParentType, ContextType>;
  selectedMethod?: Resolver<Maybe<ApiResolversTypes['OrderPaymentMethod']>, ParentType, ContextType>;
  status?: Resolver<ApiResolversTypes['OrderPaymentStatus'], ParentType, ContextType>;
  transactions?: Resolver<Array<ApiResolversTypes['OrderPaymentTransaction']>, ParentType, ContextType>;
  voidedAmount?: Resolver<ApiResolversTypes['Money'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ApiOrderPaymentAttemptResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['OrderPaymentAttempt'] = ApiResolversParentTypes['OrderPaymentAttempt']> = {
  createdAt?: Resolver<ApiResolversTypes['DateTime'], ParentType, ContextType>;
  customerAction?: Resolver<Maybe<ApiResolversTypes['JSON']>, ParentType, ContextType>;
  expiresAt?: Resolver<Maybe<ApiResolversTypes['DateTime']>, ParentType, ContextType>;
  failureCode?: Resolver<Maybe<ApiResolversTypes['String']>, ParentType, ContextType>;
  failureMessage?: Resolver<Maybe<ApiResolversTypes['String']>, ParentType, ContextType>;
  id?: Resolver<ApiResolversTypes['ID'], ParentType, ContextType>;
  processedAt?: Resolver<Maybe<ApiResolversTypes['DateTime']>, ParentType, ContextType>;
  providerCode?: Resolver<ApiResolversTypes['String'], ParentType, ContextType>;
  providerReference?: Resolver<Maybe<ApiResolversTypes['String']>, ParentType, ContextType>;
  requestedAmount?: Resolver<ApiResolversTypes['Money'], ParentType, ContextType>;
  status?: Resolver<ApiResolversTypes['OrderPaymentStatus'], ParentType, ContextType>;
  updatedAt?: Resolver<ApiResolversTypes['DateTime'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ApiOrderPaymentDisputeResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['OrderPaymentDispute'] = ApiResolversParentTypes['OrderPaymentDispute']> = {
  amount?: Resolver<ApiResolversTypes['Money'], ParentType, ContextType>;
  createdAt?: Resolver<ApiResolversTypes['DateTime'], ParentType, ContextType>;
  id?: Resolver<ApiResolversTypes['ID'], ParentType, ContextType>;
  providerCode?: Resolver<ApiResolversTypes['String'], ParentType, ContextType>;
  providerReference?: Resolver<ApiResolversTypes['String'], ParentType, ContextType>;
  reason?: Resolver<Maybe<ApiResolversTypes['String']>, ParentType, ContextType>;
  resolvedAt?: Resolver<Maybe<ApiResolversTypes['DateTime']>, ParentType, ContextType>;
  responseDueAt?: Resolver<Maybe<ApiResolversTypes['DateTime']>, ParentType, ContextType>;
  status?: Resolver<ApiResolversTypes['String'], ParentType, ContextType>;
  updatedAt?: Resolver<ApiResolversTypes['DateTime'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ApiOrderPaymentMethodResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['OrderPaymentMethod'] = ApiResolversParentTypes['OrderPaymentMethod']> = {
  code?: Resolver<ApiResolversTypes['String'], ParentType, ContextType>;
  customerInput?: Resolver<ApiResolversTypes['JSON'], ParentType, ContextType>;
  flow?: Resolver<ApiResolversTypes['String'], ParentType, ContextType>;
  providerCode?: Resolver<ApiResolversTypes['String'], ParentType, ContextType>;
  providerSnapshot?: Resolver<ApiResolversTypes['JSON'], ParentType, ContextType>;
  title?: Resolver<ApiResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ApiOrderPaymentTransactionResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['OrderPaymentTransaction'] = ApiResolversParentTypes['OrderPaymentTransaction']> = {
  amount?: Resolver<ApiResolversTypes['Money'], ParentType, ContextType>;
  createdAt?: Resolver<ApiResolversTypes['DateTime'], ParentType, ContextType>;
  failureCode?: Resolver<Maybe<ApiResolversTypes['String']>, ParentType, ContextType>;
  failureMessage?: Resolver<Maybe<ApiResolversTypes['String']>, ParentType, ContextType>;
  id?: Resolver<ApiResolversTypes['ID'], ParentType, ContextType>;
  kind?: Resolver<ApiResolversTypes['OrderPaymentTransactionKind'], ParentType, ContextType>;
  parentTransaction?: Resolver<Maybe<ApiResolversTypes['OrderPaymentTransaction']>, ParentType, ContextType>;
  processedAt?: Resolver<Maybe<ApiResolversTypes['DateTime']>, ParentType, ContextType>;
  providerCode?: Resolver<ApiResolversTypes['String'], ParentType, ContextType>;
  providerReference?: Resolver<Maybe<ApiResolversTypes['String']>, ParentType, ContextType>;
  status?: Resolver<ApiResolversTypes['OrderPaymentTransactionStatus'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ApiOrderRefundResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['OrderRefund'] = ApiResolversParentTypes['OrderRefund']> = {
  amount?: Resolver<ApiResolversTypes['Money'], ParentType, ContextType>;
  createdAt?: Resolver<ApiResolversTypes['DateTime'], ParentType, ContextType>;
  id?: Resolver<ApiResolversTypes['ID'], ParentType, ContextType>;
  lines?: Resolver<Array<ApiResolversTypes['OrderRefundLine']>, ParentType, ContextType>;
  note?: Resolver<Maybe<ApiResolversTypes['String']>, ParentType, ContextType>;
  order?: Resolver<ApiResolversTypes['Order'], ParentType, ContextType>;
  processedAt?: Resolver<Maybe<ApiResolversTypes['DateTime']>, ParentType, ContextType>;
  reasonCode?: Resolver<ApiResolversTypes['String'], ParentType, ContextType>;
  status?: Resolver<ApiResolversTypes['OrderRefundStatus'], ParentType, ContextType>;
  transactions?: Resolver<Array<ApiResolversTypes['OrderPaymentTransaction']>, ParentType, ContextType>;
  version?: Resolver<ApiResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ApiOrderRefundConnectionResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['OrderRefundConnection'] = ApiResolversParentTypes['OrderRefundConnection']> = {
  edges?: Resolver<Array<ApiResolversTypes['OrderRefundEdge']>, ParentType, ContextType>;
  nodes?: Resolver<Array<ApiResolversTypes['OrderRefund']>, ParentType, ContextType>;
  pageInfo?: Resolver<ApiResolversTypes['PageInfo'], ParentType, ContextType>;
  totalCount?: Resolver<ApiResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ApiOrderRefundEdgeResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['OrderRefundEdge'] = ApiResolversParentTypes['OrderRefundEdge']> = {
  cursor?: Resolver<ApiResolversTypes['String'], ParentType, ContextType>;
  node?: Resolver<ApiResolversTypes['OrderRefund'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ApiOrderRefundLineResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['OrderRefundLine'] = ApiResolversParentTypes['OrderRefundLine']> = {
  amount?: Resolver<ApiResolversTypes['Money'], ParentType, ContextType>;
  orderLine?: Resolver<Maybe<ApiResolversTypes['OrderLine']>, ParentType, ContextType>;
  quantity?: Resolver<Maybe<ApiResolversTypes['Int']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ApiOrderReturnResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['OrderReturn'] = ApiResolversParentTypes['OrderReturn']> = {
  approvedAt?: Resolver<Maybe<ApiResolversTypes['DateTime']>, ParentType, ContextType>;
  completedAt?: Resolver<Maybe<ApiResolversTypes['DateTime']>, ParentType, ContextType>;
  createdAt?: Resolver<ApiResolversTypes['DateTime'], ParentType, ContextType>;
  customerNote?: Resolver<Maybe<ApiResolversTypes['String']>, ParentType, ContextType>;
  id?: Resolver<ApiResolversTypes['ID'], ParentType, ContextType>;
  lines?: Resolver<Array<ApiResolversTypes['OrderReturnLine']>, ParentType, ContextType>;
  order?: Resolver<ApiResolversTypes['Order'], ParentType, ContextType>;
  receivedAt?: Resolver<Maybe<ApiResolversTypes['DateTime']>, ParentType, ContextType>;
  requestedAt?: Resolver<ApiResolversTypes['DateTime'], ParentType, ContextType>;
  returnShipment?: Resolver<Maybe<ApiResolversTypes['Shipment']>, ParentType, ContextType>;
  staffNote?: Resolver<Maybe<ApiResolversTypes['String']>, ParentType, ContextType>;
  status?: Resolver<ApiResolversTypes['OrderReturnRequestStatus'], ParentType, ContextType>;
  updatedAt?: Resolver<ApiResolversTypes['DateTime'], ParentType, ContextType>;
  version?: Resolver<ApiResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ApiOrderReturnConnectionResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['OrderReturnConnection'] = ApiResolversParentTypes['OrderReturnConnection']> = {
  edges?: Resolver<Array<ApiResolversTypes['OrderReturnEdge']>, ParentType, ContextType>;
  nodes?: Resolver<Array<ApiResolversTypes['OrderReturn']>, ParentType, ContextType>;
  pageInfo?: Resolver<ApiResolversTypes['PageInfo'], ParentType, ContextType>;
  totalCount?: Resolver<ApiResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ApiOrderReturnEdgeResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['OrderReturnEdge'] = ApiResolversParentTypes['OrderReturnEdge']> = {
  cursor?: Resolver<ApiResolversTypes['String'], ParentType, ContextType>;
  node?: Resolver<ApiResolversTypes['OrderReturn'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ApiOrderReturnLineResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['OrderReturnLine'] = ApiResolversParentTypes['OrderReturnLine']> = {
  damagedQuantity?: Resolver<ApiResolversTypes['Int'], ParentType, ContextType>;
  note?: Resolver<Maybe<ApiResolversTypes['String']>, ParentType, ContextType>;
  orderLine?: Resolver<ApiResolversTypes['OrderLine'], ParentType, ContextType>;
  quantity?: Resolver<ApiResolversTypes['Int'], ParentType, ContextType>;
  reasonCode?: Resolver<ApiResolversTypes['String'], ParentType, ContextType>;
  receivedQuantity?: Resolver<ApiResolversTypes['Int'], ParentType, ContextType>;
  restockableQuantity?: Resolver<ApiResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ApiOrderReturnPayloadResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['OrderReturnPayload'] = ApiResolversParentTypes['OrderReturnPayload']> = {
  order?: Resolver<Maybe<ApiResolversTypes['Order']>, ParentType, ContextType>;
  return?: Resolver<Maybe<ApiResolversTypes['OrderReturn']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ApiResolversTypes['OrderUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ApiOrderSourceResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['OrderSource'] = ApiResolversParentTypes['OrderSource']> = {
  code?: Resolver<ApiResolversTypes['String'], ParentType, ContextType>;
  externalId?: Resolver<Maybe<ApiResolversTypes['String']>, ParentType, ContextType>;
  externalUrl?: Resolver<Maybe<ApiResolversTypes['URL']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ApiOrderTaxLineResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['OrderTaxLine'] = ApiResolversParentTypes['OrderTaxLine']> = {
  amount?: Resolver<ApiResolversTypes['Money'], ParentType, ContextType>;
  id?: Resolver<ApiResolversTypes['ID'], ParentType, ContextType>;
  included?: Resolver<ApiResolversTypes['Boolean'], ParentType, ContextType>;
  jurisdiction?: Resolver<Maybe<ApiResolversTypes['String']>, ParentType, ContextType>;
  rate?: Resolver<ApiResolversTypes['Decimal'], ParentType, ContextType>;
  title?: Resolver<ApiResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ApiOrderUserErrorResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['OrderUserError'] = ApiResolversParentTypes['OrderUserError']> = {
  code?: Resolver<ApiResolversTypes['String'], ParentType, ContextType>;
  currentVersion?: Resolver<Maybe<ApiResolversTypes['Int']>, ParentType, ContextType>;
  field?: Resolver<Maybe<Array<ApiResolversTypes['String']>>, ParentType, ContextType>;
  message?: Resolver<ApiResolversTypes['String'], ParentType, ContextType>;
  retryable?: Resolver<ApiResolversTypes['Boolean'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ApiOrdersMutationResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['OrdersMutation'] = ApiResolversParentTypes['OrdersMutation']> = {
  fulfillmentCancel?: Resolver<ApiResolversTypes['OrderOperationPayload'], ParentType, ContextType, RequireFields<ApiOrdersMutationFulfillmentCancelArgs, 'input'>>;
  fulfillmentCreate?: Resolver<ApiResolversTypes['FulfillmentPayload'], ParentType, ContextType, RequireFields<ApiOrdersMutationFulfillmentCreateArgs, 'input'>>;
  fulfillmentOrderCancelRequest?: Resolver<ApiResolversTypes['OrderOperationPayload'], ParentType, ContextType, RequireFields<ApiOrdersMutationFulfillmentOrderCancelRequestArgs, 'input'>>;
  fulfillmentOrderHold?: Resolver<ApiResolversTypes['FulfillmentOrderPayload'], ParentType, ContextType, RequireFields<ApiOrdersMutationFulfillmentOrderHoldArgs, 'input'>>;
  fulfillmentOrderMove?: Resolver<ApiResolversTypes['FulfillmentOrderPayload'], ParentType, ContextType, RequireFields<ApiOrdersMutationFulfillmentOrderMoveArgs, 'input'>>;
  fulfillmentOrderReleaseHold?: Resolver<ApiResolversTypes['FulfillmentOrderPayload'], ParentType, ContextType, RequireFields<ApiOrdersMutationFulfillmentOrderReleaseHoldArgs, 'input'>>;
  fulfillmentOrderSplit?: Resolver<ApiResolversTypes['FulfillmentOrderPayload'], ParentType, ContextType, RequireFields<ApiOrdersMutationFulfillmentOrderSplitArgs, 'input'>>;
  fulfillmentOrderSubmit?: Resolver<ApiResolversTypes['OrderOperationPayload'], ParentType, ContextType, RequireFields<ApiOrdersMutationFulfillmentOrderSubmitArgs, 'input'>>;
  orderAdminNoteUpdate?: Resolver<ApiResolversTypes['OrderPayload'], ParentType, ContextType, RequireFields<ApiOrdersMutationOrderAdminNoteUpdateArgs, 'input'>>;
  orderArchive?: Resolver<ApiResolversTypes['OrderPayload'], ParentType, ContextType, RequireFields<ApiOrdersMutationOrderArchiveArgs, 'input'>>;
  orderCancel?: Resolver<ApiResolversTypes['OrderOperationPayload'], ParentType, ContextType, RequireFields<ApiOrdersMutationOrderCancelArgs, 'input'>>;
  orderClose?: Resolver<ApiResolversTypes['OrderPayload'], ParentType, ContextType, RequireFields<ApiOrdersMutationOrderCloseArgs, 'input'>>;
  orderCommentAdd?: Resolver<ApiResolversTypes['OrderActivityPayload'], ParentType, ContextType, RequireFields<ApiOrdersMutationOrderCommentAddArgs, 'input'>>;
  orderCompleteDraft?: Resolver<ApiResolversTypes['OrderPayload'], ParentType, ContextType, RequireFields<ApiOrdersMutationOrderCompleteDraftArgs, 'input'>>;
  orderCreate?: Resolver<ApiResolversTypes['OrderPayload'], ParentType, ContextType, RequireFields<ApiOrdersMutationOrderCreateArgs, 'input'>>;
  orderCustomFieldsUpdate?: Resolver<ApiResolversTypes['OrderPayload'], ParentType, ContextType, RequireFields<ApiOrdersMutationOrderCustomFieldsUpdateArgs, 'input'>>;
  orderCustomerSet?: Resolver<ApiResolversTypes['OrderPayload'], ParentType, ContextType, RequireFields<ApiOrdersMutationOrderCustomerSetArgs, 'input'>>;
  orderDelete?: Resolver<ApiResolversTypes['OrderDeletePayload'], ParentType, ContextType, RequireFields<ApiOrdersMutationOrderDeleteArgs, 'input'>>;
  orderEditAbandon?: Resolver<ApiResolversTypes['OrderEditPayload'], ParentType, ContextType, RequireFields<ApiOrdersMutationOrderEditAbandonArgs, 'input'>>;
  orderEditBegin?: Resolver<ApiResolversTypes['OrderEditPayload'], ParentType, ContextType, RequireFields<ApiOrdersMutationOrderEditBeginArgs, 'input'>>;
  orderEditCommit?: Resolver<ApiResolversTypes['OrderOperationPayload'], ParentType, ContextType, RequireFields<ApiOrdersMutationOrderEditCommitArgs, 'input'>>;
  orderEditDiscountAdd?: Resolver<ApiResolversTypes['OrderEditPayload'], ParentType, ContextType, RequireFields<ApiOrdersMutationOrderEditDiscountAddArgs, 'input'>>;
  orderEditDiscountRemove?: Resolver<ApiResolversTypes['OrderEditPayload'], ParentType, ContextType, RequireFields<ApiOrdersMutationOrderEditDiscountRemoveArgs, 'input'>>;
  orderEditLineAdd?: Resolver<ApiResolversTypes['OrderEditPayload'], ParentType, ContextType, RequireFields<ApiOrdersMutationOrderEditLineAddArgs, 'input'>>;
  orderEditLineRemove?: Resolver<ApiResolversTypes['OrderEditPayload'], ParentType, ContextType, RequireFields<ApiOrdersMutationOrderEditLineRemoveArgs, 'input'>>;
  orderEditLineUpdate?: Resolver<ApiResolversTypes['OrderEditPayload'], ParentType, ContextType, RequireFields<ApiOrdersMutationOrderEditLineUpdateArgs, 'input'>>;
  orderEditShippingUpdate?: Resolver<ApiResolversTypes['OrderEditPayload'], ParentType, ContextType, RequireFields<ApiOrdersMutationOrderEditShippingUpdateArgs, 'input'>>;
  orderExchangeCancel?: Resolver<ApiResolversTypes['OrderExchangePayload'], ParentType, ContextType, RequireFields<ApiOrdersMutationOrderExchangeCancelArgs, 'input'>>;
  orderExchangeComplete?: Resolver<ApiResolversTypes['OrderExchangePayload'], ParentType, ContextType, RequireFields<ApiOrdersMutationOrderExchangeCompleteArgs, 'input'>>;
  orderExchangeCreate?: Resolver<ApiResolversTypes['OrderExchangePayload'], ParentType, ContextType, RequireFields<ApiOrdersMutationOrderExchangeCreateArgs, 'input'>>;
  orderIntegrationLinkDetach?: Resolver<ApiResolversTypes['OrderPayload'], ParentType, ContextType, RequireFields<ApiOrdersMutationOrderIntegrationLinkDetachArgs, 'input'>>;
  orderIntegrationSyncRequest?: Resolver<ApiResolversTypes['OrderOperationPayload'], ParentType, ContextType, RequireFields<ApiOrdersMutationOrderIntegrationSyncRequestArgs, 'input'>>;
  orderIntegrationSyncRetry?: Resolver<ApiResolversTypes['OrderOperationPayload'], ParentType, ContextType, RequireFields<ApiOrdersMutationOrderIntegrationSyncRetryArgs, 'input'>>;
  orderLineAdd?: Resolver<ApiResolversTypes['OrderLinePayload'], ParentType, ContextType, RequireFields<ApiOrdersMutationOrderLineAddArgs, 'input'>>;
  orderLineDelete?: Resolver<ApiResolversTypes['OrderDeletePayload'], ParentType, ContextType, RequireFields<ApiOrdersMutationOrderLineDeleteArgs, 'input'>>;
  orderLineUpdate?: Resolver<ApiResolversTypes['OrderLinePayload'], ParentType, ContextType, RequireFields<ApiOrdersMutationOrderLineUpdateArgs, 'input'>>;
  orderManualPaymentRecord?: Resolver<ApiResolversTypes['OrderOperationPayload'], ParentType, ContextType, RequireFields<ApiOrdersMutationOrderManualPaymentRecordArgs, 'input'>>;
  orderPaymentCapture?: Resolver<ApiResolversTypes['OrderOperationPayload'], ParentType, ContextType, RequireFields<ApiOrdersMutationOrderPaymentCaptureArgs, 'input'>>;
  orderPaymentRetry?: Resolver<ApiResolversTypes['OrderOperationPayload'], ParentType, ContextType, RequireFields<ApiOrdersMutationOrderPaymentRetryArgs, 'input'>>;
  orderPaymentStatusOverride?: Resolver<ApiResolversTypes['OrderPayload'], ParentType, ContextType, RequireFields<ApiOrdersMutationOrderPaymentStatusOverrideArgs, 'input'>>;
  orderPaymentVoid?: Resolver<ApiResolversTypes['OrderOperationPayload'], ParentType, ContextType, RequireFields<ApiOrdersMutationOrderPaymentVoidArgs, 'input'>>;
  orderRefundCreate?: Resolver<ApiResolversTypes['OrderOperationPayload'], ParentType, ContextType, RequireFields<ApiOrdersMutationOrderRefundCreateArgs, 'input'>>;
  orderReopen?: Resolver<ApiResolversTypes['OrderPayload'], ParentType, ContextType, RequireFields<ApiOrdersMutationOrderReopenArgs, 'input'>>;
  orderReturnApprove?: Resolver<ApiResolversTypes['OrderReturnPayload'], ParentType, ContextType, RequireFields<ApiOrdersMutationOrderReturnApproveArgs, 'input'>>;
  orderReturnCancel?: Resolver<ApiResolversTypes['OrderReturnPayload'], ParentType, ContextType, RequireFields<ApiOrdersMutationOrderReturnCancelArgs, 'input'>>;
  orderReturnCreate?: Resolver<ApiResolversTypes['OrderReturnPayload'], ParentType, ContextType, RequireFields<ApiOrdersMutationOrderReturnCreateArgs, 'input'>>;
  orderReturnReceive?: Resolver<ApiResolversTypes['OrderOperationPayload'], ParentType, ContextType, RequireFields<ApiOrdersMutationOrderReturnReceiveArgs, 'input'>>;
  orderReturnReject?: Resolver<ApiResolversTypes['OrderReturnPayload'], ParentType, ContextType, RequireFields<ApiOrdersMutationOrderReturnRejectArgs, 'input'>>;
  orderTagsUpdate?: Resolver<ApiResolversTypes['OrderPayload'], ParentType, ContextType, RequireFields<ApiOrdersMutationOrderTagsUpdateArgs, 'input'>>;
  orderUnarchive?: Resolver<ApiResolversTypes['OrderPayload'], ParentType, ContextType, RequireFields<ApiOrdersMutationOrderUnarchiveArgs, 'input'>>;
  orderUpdate?: Resolver<ApiResolversTypes['OrderPayload'], ParentType, ContextType, RequireFields<ApiOrdersMutationOrderUpdateArgs, 'input'>>;
  ordersBulkAction?: Resolver<ApiResolversTypes['OrderOperationPayload'], ParentType, ContextType, RequireFields<ApiOrdersMutationOrdersBulkActionArgs, 'input'>>;
  shipmentCancel?: Resolver<ApiResolversTypes['OrderOperationPayload'], ParentType, ContextType, RequireFields<ApiOrdersMutationShipmentCancelArgs, 'input'>>;
  shipmentCreate?: Resolver<ApiResolversTypes['OrderOperationPayload'], ParentType, ContextType, RequireFields<ApiOrdersMutationShipmentCreateArgs, 'input'>>;
  shipmentMarkDelivered?: Resolver<ApiResolversTypes['ShipmentPayload'], ParentType, ContextType, RequireFields<ApiOrdersMutationShipmentMarkDeliveredArgs, 'input'>>;
  shipmentMarkShipped?: Resolver<ApiResolversTypes['ShipmentPayload'], ParentType, ContextType, RequireFields<ApiOrdersMutationShipmentMarkShippedArgs, 'input'>>;
  shipmentReconcile?: Resolver<ApiResolversTypes['OrderOperationPayload'], ParentType, ContextType, RequireFields<ApiOrdersMutationShipmentReconcileArgs, 'input'>>;
  shipmentTrackingUpdate?: Resolver<ApiResolversTypes['ShipmentPayload'], ParentType, ContextType, RequireFields<ApiOrdersMutationShipmentTrackingUpdateArgs, 'input'>>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ApiOrdersQueryResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['OrdersQuery'] = ApiResolversParentTypes['OrdersQuery']> = {
  order?: Resolver<Maybe<ApiResolversTypes['Order']>, ParentType, ContextType, RequireFields<ApiOrdersQueryOrderArgs, 'id'>>;
  orderByNumber?: Resolver<Maybe<ApiResolversTypes['Order']>, ParentType, ContextType, RequireFields<ApiOrdersQueryOrderByNumberArgs, 'number'>>;
  orderEditSession?: Resolver<Maybe<ApiResolversTypes['OrderEditSession']>, ParentType, ContextType, RequireFields<ApiOrdersQueryOrderEditSessionArgs, 'id'>>;
  orderOperation?: Resolver<Maybe<ApiResolversTypes['OrderOperation']>, ParentType, ContextType, RequireFields<ApiOrdersQueryOrderOperationArgs, 'id'>>;
  orders?: Resolver<ApiResolversTypes['OrderConnection'], ParentType, ContextType, RequireFields<ApiOrdersQueryOrdersArgs, 'first'>>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ApiPageInfoResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['PageInfo'] = ApiResolversParentTypes['PageInfo']> = {
  endCursor?: Resolver<Maybe<ApiResolversTypes['String']>, ParentType, ContextType>;
  hasNextPage?: Resolver<ApiResolversTypes['Boolean'], ParentType, ContextType>;
  hasPreviousPage?: Resolver<ApiResolversTypes['Boolean'], ParentType, ContextType>;
  startCursor?: Resolver<Maybe<ApiResolversTypes['String']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ApiQueryResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['Query'] = ApiResolversParentTypes['Query']> = {
  ordersQuery?: Resolver<ApiResolversTypes['OrdersQuery'], ParentType, ContextType>;
};

export type ApiShipmentResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['Shipment'] = ApiResolversParentTypes['Shipment']> = {
  createdAt?: Resolver<ApiResolversTypes['DateTime'], ParentType, ContextType>;
  deliveredAt?: Resolver<Maybe<ApiResolversTypes['DateTime']>, ParentType, ContextType>;
  estimatedDeliveryAt?: Resolver<Maybe<ApiResolversTypes['DateTime']>, ParentType, ContextType>;
  events?: Resolver<Array<ApiResolversTypes['ShipmentEvent']>, ParentType, ContextType>;
  fulfillment?: Resolver<ApiResolversTypes['Fulfillment'], ParentType, ContextType>;
  id?: Resolver<ApiResolversTypes['ID'], ParentType, ContextType>;
  order?: Resolver<ApiResolversTypes['Order'], ParentType, ContextType>;
  packages?: Resolver<Array<ApiResolversTypes['ShipmentPackage']>, ParentType, ContextType>;
  providerCode?: Resolver<Maybe<ApiResolversTypes['String']>, ParentType, ContextType>;
  providerReference?: Resolver<Maybe<ApiResolversTypes['String']>, ParentType, ContextType>;
  serviceCode?: Resolver<Maybe<ApiResolversTypes['String']>, ParentType, ContextType>;
  shippedAt?: Resolver<Maybe<ApiResolversTypes['DateTime']>, ParentType, ContextType>;
  status?: Resolver<ApiResolversTypes['ShipmentStatus'], ParentType, ContextType>;
  tracking?: Resolver<Array<ApiResolversTypes['ShipmentTracking']>, ParentType, ContextType>;
  updatedAt?: Resolver<ApiResolversTypes['DateTime'], ParentType, ContextType>;
  version?: Resolver<ApiResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ApiShipmentEventResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['ShipmentEvent'] = ApiResolversParentTypes['ShipmentEvent']> = {
  happenedAt?: Resolver<ApiResolversTypes['DateTime'], ParentType, ContextType>;
  id?: Resolver<ApiResolversTypes['ID'], ParentType, ContextType>;
  location?: Resolver<Maybe<ApiResolversTypes['String']>, ParentType, ContextType>;
  message?: Resolver<Maybe<ApiResolversTypes['String']>, ParentType, ContextType>;
  recordedAt?: Resolver<ApiResolversTypes['DateTime'], ParentType, ContextType>;
  status?: Resolver<ApiResolversTypes['ShipmentStatus'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ApiShipmentPackageResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['ShipmentPackage'] = ApiResolversParentTypes['ShipmentPackage']> = {
  declaredValue?: Resolver<Maybe<ApiResolversTypes['Money']>, ParentType, ContextType>;
  dimensions?: Resolver<Maybe<ApiResolversTypes['Dimensions']>, ParentType, ContextType>;
  id?: Resolver<ApiResolversTypes['ID'], ParentType, ContextType>;
  items?: Resolver<Array<ApiResolversTypes['ShipmentPackageItem']>, ParentType, ContextType>;
  weight?: Resolver<Maybe<ApiResolversTypes['Weight']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ApiShipmentPackageItemResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['ShipmentPackageItem'] = ApiResolversParentTypes['ShipmentPackageItem']> = {
  orderLine?: Resolver<ApiResolversTypes['OrderLine'], ParentType, ContextType>;
  quantity?: Resolver<ApiResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ApiShipmentPayloadResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['ShipmentPayload'] = ApiResolversParentTypes['ShipmentPayload']> = {
  order?: Resolver<Maybe<ApiResolversTypes['Order']>, ParentType, ContextType>;
  shipment?: Resolver<Maybe<ApiResolversTypes['Shipment']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ApiResolversTypes['OrderUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ApiShipmentTrackingResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['ShipmentTracking'] = ApiResolversParentTypes['ShipmentTracking']> = {
  company?: Resolver<Maybe<ApiResolversTypes['String']>, ParentType, ContextType>;
  number?: Resolver<ApiResolversTypes['String'], ParentType, ContextType>;
  url?: Resolver<Maybe<ApiResolversTypes['URL']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export interface ApiUrlScalarConfig extends GraphQLScalarTypeConfig<ApiResolversTypes['URL'], any> {
  name: 'URL';
}

export type ApiUserResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['User'] = ApiResolversParentTypes['User']> = {
  id?: Resolver<ApiResolversTypes['ID'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ApiWeightResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['Weight'] = ApiResolversParentTypes['Weight']> = {
  unit?: Resolver<ApiResolversTypes['WeightUnit'], ParentType, ContextType>;
  value?: Resolver<ApiResolversTypes['Float'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ApiResolvers<ContextType = GraphQLContext> = {
  ApiKey?: ApiApiKeyResolvers<ContextType>;
  BigInt?: GraphQLScalarType;
  CalculatedOrder?: ApiCalculatedOrderResolvers<ContextType>;
  Checkout?: ApiCheckoutResolvers<ContextType>;
  Connection?: ApiConnectionResolvers<ContextType>;
  Customer?: ApiCustomerResolvers<ContextType>;
  DateTime?: GraphQLScalarType;
  Decimal?: GraphQLScalarType;
  Dimensions?: ApiDimensionsResolvers<ContextType>;
  DisplayableError?: ApiDisplayableErrorResolvers<ContextType>;
  Email?: GraphQLScalarType;
  Fulfillment?: ApiFulfillmentResolvers<ContextType>;
  FulfillmentHold?: ApiFulfillmentHoldResolvers<ContextType>;
  FulfillmentLine?: ApiFulfillmentLineResolvers<ContextType>;
  FulfillmentOrder?: ApiFulfillmentOrderResolvers<ContextType>;
  FulfillmentOrderLine?: ApiFulfillmentOrderLineResolvers<ContextType>;
  FulfillmentOrderPayload?: ApiFulfillmentOrderPayloadResolvers<ContextType>;
  FulfillmentPayload?: ApiFulfillmentPayloadResolvers<ContextType>;
  FulfillmentServiceRoute?: ApiFulfillmentServiceRouteResolvers<ContextType>;
  JSON?: GraphQLScalarType;
  Money?: ApiMoneyResolvers<ContextType>;
  Mutation?: ApiMutationResolvers<ContextType>;
  Node?: ApiNodeResolvers<ContextType>;
  Order?: ApiOrderResolvers<ContextType>;
  OrderActivity?: ApiOrderActivityResolvers<ContextType>;
  OrderActivityConnection?: ApiOrderActivityConnectionResolvers<ContextType>;
  OrderActivityEdge?: ApiOrderActivityEdgeResolvers<ContextType>;
  OrderActivityPayload?: ApiOrderActivityPayloadResolvers<ContextType>;
  OrderActor?: ApiOrderActorResolvers<ContextType>;
  OrderAddress?: ApiOrderAddressResolvers<ContextType>;
  OrderCheckoutPlacement?: ApiOrderCheckoutPlacementResolvers<ContextType>;
  OrderConnection?: ApiOrderConnectionResolvers<ContextType>;
  OrderContact?: ApiOrderContactResolvers<ContextType>;
  OrderCost?: ApiOrderCostResolvers<ContextType>;
  OrderCustomerSnapshot?: ApiOrderCustomerSnapshotResolvers<ContextType>;
  OrderDeletePayload?: ApiOrderDeletePayloadResolvers<ContextType>;
  OrderDeliveryGroup?: ApiOrderDeliveryGroupResolvers<ContextType>;
  OrderDeliveryMethod?: ApiOrderDeliveryMethodResolvers<ContextType>;
  OrderDiscount?: ApiOrderDiscountResolvers<ContextType>;
  OrderEdge?: ApiOrderEdgeResolvers<ContextType>;
  OrderEditChange?: ApiOrderEditChangeResolvers<ContextType>;
  OrderEditPayload?: ApiOrderEditPayloadResolvers<ContextType>;
  OrderEditSession?: ApiOrderEditSessionResolvers<ContextType>;
  OrderExchange?: ApiOrderExchangeResolvers<ContextType>;
  OrderExchangeConnection?: ApiOrderExchangeConnectionResolvers<ContextType>;
  OrderExchangeEdge?: ApiOrderExchangeEdgeResolvers<ContextType>;
  OrderExchangePayload?: ApiOrderExchangePayloadResolvers<ContextType>;
  OrderIntegrationLink?: ApiOrderIntegrationLinkResolvers<ContextType>;
  OrderLine?: ApiOrderLineResolvers<ContextType>;
  OrderLineCost?: ApiOrderLineCostResolvers<ContextType>;
  OrderLinePayload?: ApiOrderLinePayloadResolvers<ContextType>;
  OrderOperation?: ApiOrderOperationResolvers<ContextType>;
  OrderOperationPayload?: ApiOrderOperationPayloadResolvers<ContextType>;
  OrderPayload?: ApiOrderPayloadResolvers<ContextType>;
  OrderPayment?: ApiOrderPaymentResolvers<ContextType>;
  OrderPaymentAttempt?: ApiOrderPaymentAttemptResolvers<ContextType>;
  OrderPaymentDispute?: ApiOrderPaymentDisputeResolvers<ContextType>;
  OrderPaymentMethod?: ApiOrderPaymentMethodResolvers<ContextType>;
  OrderPaymentTransaction?: ApiOrderPaymentTransactionResolvers<ContextType>;
  OrderRefund?: ApiOrderRefundResolvers<ContextType>;
  OrderRefundConnection?: ApiOrderRefundConnectionResolvers<ContextType>;
  OrderRefundEdge?: ApiOrderRefundEdgeResolvers<ContextType>;
  OrderRefundLine?: ApiOrderRefundLineResolvers<ContextType>;
  OrderReturn?: ApiOrderReturnResolvers<ContextType>;
  OrderReturnConnection?: ApiOrderReturnConnectionResolvers<ContextType>;
  OrderReturnEdge?: ApiOrderReturnEdgeResolvers<ContextType>;
  OrderReturnLine?: ApiOrderReturnLineResolvers<ContextType>;
  OrderReturnPayload?: ApiOrderReturnPayloadResolvers<ContextType>;
  OrderSource?: ApiOrderSourceResolvers<ContextType>;
  OrderTaxLine?: ApiOrderTaxLineResolvers<ContextType>;
  OrderUserError?: ApiOrderUserErrorResolvers<ContextType>;
  OrdersMutation?: ApiOrdersMutationResolvers<ContextType>;
  OrdersQuery?: ApiOrdersQueryResolvers<ContextType>;
  PageInfo?: ApiPageInfoResolvers<ContextType>;
  Query?: ApiQueryResolvers<ContextType>;
  Shipment?: ApiShipmentResolvers<ContextType>;
  ShipmentEvent?: ApiShipmentEventResolvers<ContextType>;
  ShipmentPackage?: ApiShipmentPackageResolvers<ContextType>;
  ShipmentPackageItem?: ApiShipmentPackageItemResolvers<ContextType>;
  ShipmentPayload?: ApiShipmentPayloadResolvers<ContextType>;
  ShipmentTracking?: ApiShipmentTrackingResolvers<ContextType>;
  URL?: GraphQLScalarType;
  User?: ApiUserResolvers<ContextType>;
  Weight?: ApiWeightResolvers<ContextType>;
};

