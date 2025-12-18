import { GraphQLResolveInfo, GraphQLScalarType, GraphQLScalarTypeConfig } from 'graphql';
import { GraphQLContext } from './context.js';
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
  BigInt: { input: number; output: number; }
  DateTime: { input: any; output: any; }
  Email: { input: string; output: string; }
  JSON: { input: unknown; output: unknown; }
};

export type ApiApiKey = {
  __typename?: 'ApiKey';
  id: Scalars['ID']['output'];
};

export type ApiCollectionMeta = {
  __typename?: 'CollectionMeta';
  count: Scalars['Int']['output'];
  page: Scalars['Int']['output'];
  pageCount: Scalars['Int']['output'];
  pageSize: Scalars['Int']['output'];
  total: Scalars['Int']['output'];
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

export type ApiCustomer = {
  __typename?: 'Customer';
  id: Scalars['ID']['output'];
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

export type ApiLabel = {
  __typename?: 'Label';
  id: Scalars['ID']['output'];
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

export type ApiMutation = {
  __typename?: 'Mutation';
  orderMutation: ApiOrderMutation;
};

export type ApiNode = {
  id: Scalars['ID']['output'];
};

export type ApiOrder = {
  __typename?: 'Order';
  adminNote: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['DateTime']['output'];
  createdBy: ApiOrderActor;
  currencyCode: Scalars['String']['output'];
  customerIdentity: ApiOrderCustomerIdentity;
  customerNote: Maybe<Scalars['String']['output']>;
  customerStatistic: ApiOrderCustomerStatistic;
  deletedAt: Maybe<Scalars['DateTime']['output']>;
  discountTotal: Maybe<Scalars['BigInt']['output']>;
  events: Array<ApiOrderEvent>;
  grandTotal: Scalars['BigInt']['output'];
  id: Scalars['ID']['output'];
  labels: Array<ApiLabel>;
  lines: Array<ApiOrderLine>;
  number: Scalars['BigInt']['output'];
  shippingTotal: Maybe<Scalars['BigInt']['output']>;
  status: ApiOrderStatus;
  subtotal: Scalars['BigInt']['output'];
  tags: Array<ApiTag>;
  taxTotal: Maybe<Scalars['BigInt']['output']>;
  updatedAt: Scalars['DateTime']['output'];
};

export type ApiOrderActor = ApiApiKey | ApiUser;

export type ApiOrderAdminNoteUpdateInput = {
  note: Scalars['String']['input'];
  orderId: Scalars['ID']['input'];
};

export type ApiOrderCancelInput = {
  comment: InputMaybe<Scalars['String']['input']>;
  orderId: Scalars['ID']['input'];
  reason: ApiOrderCancelReason;
};

export enum ApiOrderCancelReason {
  Customer = 'CUSTOMER',
  Fraud = 'FRAUD',
  Inventory = 'INVENTORY',
  Other = 'OTHER',
  Staff = 'STAFF'
}

export type ApiOrderCloseInput = {
  comment: InputMaybe<Scalars['String']['input']>;
  orderId: Scalars['ID']['input'];
};

export type ApiOrderCommentAddInput = {
  comment: Scalars['String']['input'];
  orderId: Scalars['ID']['input'];
};

export type ApiOrderCustomerIdentity = {
  __typename?: 'OrderCustomerIdentity';
  countryCode: Maybe<ApiCountryCode>;
  customer: Maybe<ApiCustomer>;
  data: Maybe<Scalars['JSON']['output']>;
  email: Maybe<Scalars['Email']['output']>;
  phone: Maybe<Scalars['String']['output']>;
};

export type ApiOrderCustomerStatistic = {
  __typename?: 'OrderCustomerStatistic';
  totalAuthorizedOrders: Scalars['Int']['output'];
  totalGuestOrders: Scalars['Int']['output'];
  totalRevenue: Scalars['Int']['output'];
};

export type ApiOrderDeliveryAddress = {
  __typename?: 'OrderDeliveryAddress';
  address1: Scalars['String']['output'];
  address2: Maybe<Scalars['String']['output']>;
  city: Scalars['String']['output'];
  countryCode: ApiCountryCode;
  data: Maybe<Scalars['JSON']['output']>;
  email: Maybe<Scalars['Email']['output']>;
  firstName: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  lastName: Maybe<Scalars['String']['output']>;
  postalCode: Maybe<Scalars['String']['output']>;
  provinceCode: Maybe<Scalars['String']['output']>;
};

export type ApiOrderEvent = {
  __typename?: 'OrderEvent';
  createdAt: Scalars['DateTime']['output'];
  data: Maybe<Scalars['JSON']['output']>;
  eventType: ApiOrderEventType;
  id: Scalars['String']['output'];
  metadata: Maybe<Scalars['JSON']['output']>;
  performedBy: ApiOrderActor;
};

export enum ApiOrderEventType {
  OrderCreated = 'ORDER_CREATED'
}

export type ApiOrderLine = {
  __typename?: 'OrderLine';
  createdAt: Scalars['DateTime']['output'];
  discountAmount: Scalars['Int']['output'];
  id: Scalars['ID']['output'];
  purchasableId: Scalars['ID']['output'];
  quantity: Scalars['Int']['output'];
  subtotalAmount: Scalars['Int']['output'];
  taxAmount: Maybe<Scalars['Int']['output']>;
  totalAmount: Scalars['Int']['output'];
  unitComparePrice: Scalars['Int']['output'];
  unitPrice: Scalars['Int']['output'];
  updatedAt: Scalars['DateTime']['output'];
};

export type ApiOrderMutation = {
  __typename?: 'OrderMutation';
  orderAdminNoteUpdate: Scalars['Boolean']['output'];
  orderCancel: Scalars['Boolean']['output'];
  orderClose: Scalars['Boolean']['output'];
  orderCommentAdd: Scalars['Boolean']['output'];
};


export type ApiOrderMutationOrderAdminNoteUpdateArgs = {
  input: ApiOrderAdminNoteUpdateInput;
};


export type ApiOrderMutationOrderCancelArgs = {
  input: ApiOrderCancelInput;
};


export type ApiOrderMutationOrderCloseArgs = {
  input: ApiOrderCloseInput;
};


export type ApiOrderMutationOrderCommentAddArgs = {
  input: ApiOrderCommentAddInput;
};

export type ApiOrderQuery = {
  __typename?: 'OrderQuery';
  order: Maybe<ApiOrder>;
  orders: ApiOrdersOutput;
};


export type ApiOrderQueryOrderArgs = {
  id: Scalars['ID']['input'];
};


export type ApiOrderQueryOrdersArgs = {
  input: InputMaybe<ApiOrdersInput>;
};

export enum ApiOrderStatus {
  Active = 'ACTIVE',
  Cancelled = 'CANCELLED',
  Closed = 'CLOSED',
  Draft = 'DRAFT'
}

export type ApiOrdersInput = {
  order: InputMaybe<Scalars['String']['input']>;
  page: InputMaybe<Scalars['Int']['input']>;
  pageSize: InputMaybe<Scalars['Int']['input']>;
  where: InputMaybe<Scalars['JSON']['input']>;
};

export type ApiOrdersOutput = {
  __typename?: 'OrdersOutput';
  data: Array<ApiOrder>;
  meta: ApiCollectionMeta;
};

export type ApiPurchasable = {
  /** Unique identifier of the purchasable entity. */
  id: Scalars['ID']['output'];
};

export type ApiPurchasableSnapshot = ApiPurchasable & {
  __typename?: 'PurchasableSnapshot';
  id: Scalars['ID']['output'];
  purchasableSnapshot: Scalars['JSON']['output'];
};

export type ApiQuery = {
  __typename?: 'Query';
  orderQuery: ApiOrderQuery;
};

export type ApiTag = {
  __typename?: 'Tag';
  id: Scalars['ID']['output'];
};

export type ApiUser = {
  __typename?: 'User';
  id: Scalars['ID']['output'];
};

export type ApiWeight = {
  __typename?: 'Weight';
  unit: ApiWeightUnit;
  weight: Scalars['Float']['output'];
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

/** Mapping of union types */
export type ApiResolversUnionTypes<_RefType extends Record<string, unknown>> = {
  OrderActor: ( ApiApiKey ) | ( ApiUser );
};

/** Mapping of interface types */
export type ApiResolversInterfaceTypes<_RefType extends Record<string, unknown>> = {
  Node: never;
  Purchasable: ( ApiPurchasableSnapshot );
};

/** Mapping between all available schema types and the resolvers types */
export type ApiResolversTypes = {
  ApiKey: ResolverTypeWrapper<ApiApiKey>;
  BigInt: ResolverTypeWrapper<Scalars['BigInt']['output']>;
  Boolean: ResolverTypeWrapper<Scalars['Boolean']['output']>;
  CollectionMeta: ResolverTypeWrapper<ApiCollectionMeta>;
  CountryCode: ApiCountryCode;
  CurrencyCode: ApiCurrencyCode;
  Customer: ResolverTypeWrapper<ApiCustomer>;
  DateTime: ResolverTypeWrapper<Scalars['DateTime']['output']>;
  DimensionUnit: ApiDimensionUnit;
  Email: ResolverTypeWrapper<Scalars['Email']['output']>;
  Float: ResolverTypeWrapper<Scalars['Float']['output']>;
  ID: ResolverTypeWrapper<Scalars['ID']['output']>;
  Int: ResolverTypeWrapper<Scalars['Int']['output']>;
  JSON: ResolverTypeWrapper<Scalars['JSON']['output']>;
  Label: ResolverTypeWrapper<ApiLabel>;
  LocaleCode: ApiLocaleCode;
  Mutation: ResolverTypeWrapper<{}>;
  Node: ResolverTypeWrapper<ApiResolversInterfaceTypes<ApiResolversTypes>['Node']>;
  Order: ResolverTypeWrapper<Omit<ApiOrder, 'createdBy' | 'events'> & { createdBy: ApiResolversTypes['OrderActor'], events: Array<ApiResolversTypes['OrderEvent']> }>;
  OrderActor: ResolverTypeWrapper<ApiResolversUnionTypes<ApiResolversTypes>['OrderActor']>;
  OrderAdminNoteUpdateInput: ApiOrderAdminNoteUpdateInput;
  OrderCancelInput: ApiOrderCancelInput;
  OrderCancelReason: ApiOrderCancelReason;
  OrderCloseInput: ApiOrderCloseInput;
  OrderCommentAddInput: ApiOrderCommentAddInput;
  OrderCustomerIdentity: ResolverTypeWrapper<ApiOrderCustomerIdentity>;
  OrderCustomerStatistic: ResolverTypeWrapper<ApiOrderCustomerStatistic>;
  OrderDeliveryAddress: ResolverTypeWrapper<ApiOrderDeliveryAddress>;
  OrderEvent: ResolverTypeWrapper<Omit<ApiOrderEvent, 'performedBy'> & { performedBy: ApiResolversTypes['OrderActor'] }>;
  OrderEventType: ApiOrderEventType;
  OrderLine: ResolverTypeWrapper<ApiOrderLine>;
  OrderMutation: ResolverTypeWrapper<ApiOrderMutation>;
  OrderQuery: ResolverTypeWrapper<Omit<ApiOrderQuery, 'order' | 'orders'> & { order: Maybe<ApiResolversTypes['Order']>, orders: ApiResolversTypes['OrdersOutput'] }>;
  OrderStatus: ApiOrderStatus;
  OrdersInput: ApiOrdersInput;
  OrdersOutput: ResolverTypeWrapper<Omit<ApiOrdersOutput, 'data'> & { data: Array<ApiResolversTypes['Order']> }>;
  Purchasable: ResolverTypeWrapper<ApiResolversInterfaceTypes<ApiResolversTypes>['Purchasable']>;
  PurchasableSnapshot: ResolverTypeWrapper<ApiPurchasableSnapshot>;
  Query: ResolverTypeWrapper<{}>;
  String: ResolverTypeWrapper<Scalars['String']['output']>;
  Tag: ResolverTypeWrapper<ApiTag>;
  User: ResolverTypeWrapper<ApiUser>;
  Weight: ResolverTypeWrapper<ApiWeight>;
  WeightUnit: ApiWeightUnit;
};

/** Mapping between all available schema types and the resolvers parents */
export type ApiResolversParentTypes = {
  ApiKey: ApiApiKey;
  BigInt: Scalars['BigInt']['output'];
  Boolean: Scalars['Boolean']['output'];
  CollectionMeta: ApiCollectionMeta;
  Customer: ApiCustomer;
  DateTime: Scalars['DateTime']['output'];
  Email: Scalars['Email']['output'];
  Float: Scalars['Float']['output'];
  ID: Scalars['ID']['output'];
  Int: Scalars['Int']['output'];
  JSON: Scalars['JSON']['output'];
  Label: ApiLabel;
  Mutation: {};
  Node: ApiResolversInterfaceTypes<ApiResolversParentTypes>['Node'];
  Order: Omit<ApiOrder, 'createdBy' | 'events'> & { createdBy: ApiResolversParentTypes['OrderActor'], events: Array<ApiResolversParentTypes['OrderEvent']> };
  OrderActor: ApiResolversUnionTypes<ApiResolversParentTypes>['OrderActor'];
  OrderAdminNoteUpdateInput: ApiOrderAdminNoteUpdateInput;
  OrderCancelInput: ApiOrderCancelInput;
  OrderCloseInput: ApiOrderCloseInput;
  OrderCommentAddInput: ApiOrderCommentAddInput;
  OrderCustomerIdentity: ApiOrderCustomerIdentity;
  OrderCustomerStatistic: ApiOrderCustomerStatistic;
  OrderDeliveryAddress: ApiOrderDeliveryAddress;
  OrderEvent: Omit<ApiOrderEvent, 'performedBy'> & { performedBy: ApiResolversParentTypes['OrderActor'] };
  OrderLine: ApiOrderLine;
  OrderMutation: ApiOrderMutation;
  OrderQuery: Omit<ApiOrderQuery, 'order' | 'orders'> & { order: Maybe<ApiResolversParentTypes['Order']>, orders: ApiResolversParentTypes['OrdersOutput'] };
  OrdersInput: ApiOrdersInput;
  OrdersOutput: Omit<ApiOrdersOutput, 'data'> & { data: Array<ApiResolversParentTypes['Order']> };
  Purchasable: ApiResolversInterfaceTypes<ApiResolversParentTypes>['Purchasable'];
  PurchasableSnapshot: ApiPurchasableSnapshot;
  Query: {};
  String: Scalars['String']['output'];
  Tag: ApiTag;
  User: ApiUser;
  Weight: ApiWeight;
};

export type ApiApiKeyResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['ApiKey'] = ApiResolversParentTypes['ApiKey']> = {
  id: Resolver<ApiResolversTypes['ID'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export interface ApiBigIntScalarConfig extends GraphQLScalarTypeConfig<ApiResolversTypes['BigInt'], any> {
  name: 'BigInt';
}

export type ApiCollectionMetaResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['CollectionMeta'] = ApiResolversParentTypes['CollectionMeta']> = {
  count: Resolver<ApiResolversTypes['Int'], ParentType, ContextType>;
  page: Resolver<ApiResolversTypes['Int'], ParentType, ContextType>;
  pageCount: Resolver<ApiResolversTypes['Int'], ParentType, ContextType>;
  pageSize: Resolver<ApiResolversTypes['Int'], ParentType, ContextType>;
  total: Resolver<ApiResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ApiCustomerResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['Customer'] = ApiResolversParentTypes['Customer']> = {
  id: Resolver<ApiResolversTypes['ID'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export interface ApiDateTimeScalarConfig extends GraphQLScalarTypeConfig<ApiResolversTypes['DateTime'], any> {
  name: 'DateTime';
}

export interface ApiEmailScalarConfig extends GraphQLScalarTypeConfig<ApiResolversTypes['Email'], any> {
  name: 'Email';
}

export interface ApiJsonScalarConfig extends GraphQLScalarTypeConfig<ApiResolversTypes['JSON'], any> {
  name: 'JSON';
}

export type ApiLabelResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['Label'] = ApiResolversParentTypes['Label']> = {
  id: Resolver<ApiResolversTypes['ID'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ApiMutationResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['Mutation'] = ApiResolversParentTypes['Mutation']> = {
  orderMutation: Resolver<ApiResolversTypes['OrderMutation'], ParentType, ContextType>;
};

export type ApiNodeResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['Node'] = ApiResolversParentTypes['Node']> = {
  __resolveType: TypeResolveFn<null, ParentType, ContextType>;
  id: Resolver<ApiResolversTypes['ID'], ParentType, ContextType>;
};

export type ApiOrderResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['Order'] = ApiResolversParentTypes['Order']> = {
  adminNote: Resolver<Maybe<ApiResolversTypes['String']>, ParentType, ContextType>;
  createdAt: Resolver<ApiResolversTypes['DateTime'], ParentType, ContextType>;
  createdBy: Resolver<ApiResolversTypes['OrderActor'], ParentType, ContextType>;
  currencyCode: Resolver<ApiResolversTypes['String'], ParentType, ContextType>;
  customerIdentity: Resolver<ApiResolversTypes['OrderCustomerIdentity'], ParentType, ContextType>;
  customerNote: Resolver<Maybe<ApiResolversTypes['String']>, ParentType, ContextType>;
  customerStatistic: Resolver<ApiResolversTypes['OrderCustomerStatistic'], ParentType, ContextType>;
  deletedAt: Resolver<Maybe<ApiResolversTypes['DateTime']>, ParentType, ContextType>;
  discountTotal: Resolver<Maybe<ApiResolversTypes['BigInt']>, ParentType, ContextType>;
  events: Resolver<Array<ApiResolversTypes['OrderEvent']>, ParentType, ContextType>;
  grandTotal: Resolver<ApiResolversTypes['BigInt'], ParentType, ContextType>;
  id: Resolver<ApiResolversTypes['ID'], ParentType, ContextType>;
  labels: Resolver<Array<ApiResolversTypes['Label']>, ParentType, ContextType>;
  lines: Resolver<Array<ApiResolversTypes['OrderLine']>, ParentType, ContextType>;
  number: Resolver<ApiResolversTypes['BigInt'], ParentType, ContextType>;
  shippingTotal: Resolver<Maybe<ApiResolversTypes['BigInt']>, ParentType, ContextType>;
  status: Resolver<ApiResolversTypes['OrderStatus'], ParentType, ContextType>;
  subtotal: Resolver<ApiResolversTypes['BigInt'], ParentType, ContextType>;
  tags: Resolver<Array<ApiResolversTypes['Tag']>, ParentType, ContextType>;
  taxTotal: Resolver<Maybe<ApiResolversTypes['BigInt']>, ParentType, ContextType>;
  updatedAt: Resolver<ApiResolversTypes['DateTime'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ApiOrderActorResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['OrderActor'] = ApiResolversParentTypes['OrderActor']> = {
  __resolveType: TypeResolveFn<'ApiKey' | 'User', ParentType, ContextType>;
};

export type ApiOrderCustomerIdentityResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['OrderCustomerIdentity'] = ApiResolversParentTypes['OrderCustomerIdentity']> = {
  countryCode: Resolver<Maybe<ApiResolversTypes['CountryCode']>, ParentType, ContextType>;
  customer: Resolver<Maybe<ApiResolversTypes['Customer']>, ParentType, ContextType>;
  data: Resolver<Maybe<ApiResolversTypes['JSON']>, ParentType, ContextType>;
  email: Resolver<Maybe<ApiResolversTypes['Email']>, ParentType, ContextType>;
  phone: Resolver<Maybe<ApiResolversTypes['String']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ApiOrderCustomerStatisticResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['OrderCustomerStatistic'] = ApiResolversParentTypes['OrderCustomerStatistic']> = {
  totalAuthorizedOrders: Resolver<ApiResolversTypes['Int'], ParentType, ContextType>;
  totalGuestOrders: Resolver<ApiResolversTypes['Int'], ParentType, ContextType>;
  totalRevenue: Resolver<ApiResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ApiOrderDeliveryAddressResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['OrderDeliveryAddress'] = ApiResolversParentTypes['OrderDeliveryAddress']> = {
  address1: Resolver<ApiResolversTypes['String'], ParentType, ContextType>;
  address2: Resolver<Maybe<ApiResolversTypes['String']>, ParentType, ContextType>;
  city: Resolver<ApiResolversTypes['String'], ParentType, ContextType>;
  countryCode: Resolver<ApiResolversTypes['CountryCode'], ParentType, ContextType>;
  data: Resolver<Maybe<ApiResolversTypes['JSON']>, ParentType, ContextType>;
  email: Resolver<Maybe<ApiResolversTypes['Email']>, ParentType, ContextType>;
  firstName: Resolver<Maybe<ApiResolversTypes['String']>, ParentType, ContextType>;
  id: Resolver<ApiResolversTypes['ID'], ParentType, ContextType>;
  lastName: Resolver<Maybe<ApiResolversTypes['String']>, ParentType, ContextType>;
  postalCode: Resolver<Maybe<ApiResolversTypes['String']>, ParentType, ContextType>;
  provinceCode: Resolver<Maybe<ApiResolversTypes['String']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ApiOrderEventResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['OrderEvent'] = ApiResolversParentTypes['OrderEvent']> = {
  createdAt: Resolver<ApiResolversTypes['DateTime'], ParentType, ContextType>;
  data: Resolver<Maybe<ApiResolversTypes['JSON']>, ParentType, ContextType>;
  eventType: Resolver<ApiResolversTypes['OrderEventType'], ParentType, ContextType>;
  id: Resolver<ApiResolversTypes['String'], ParentType, ContextType>;
  metadata: Resolver<Maybe<ApiResolversTypes['JSON']>, ParentType, ContextType>;
  performedBy: Resolver<ApiResolversTypes['OrderActor'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ApiOrderLineResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['OrderLine'] = ApiResolversParentTypes['OrderLine']> = {
  createdAt: Resolver<ApiResolversTypes['DateTime'], ParentType, ContextType>;
  discountAmount: Resolver<ApiResolversTypes['Int'], ParentType, ContextType>;
  id: Resolver<ApiResolversTypes['ID'], ParentType, ContextType>;
  purchasableId: Resolver<ApiResolversTypes['ID'], ParentType, ContextType>;
  quantity: Resolver<ApiResolversTypes['Int'], ParentType, ContextType>;
  subtotalAmount: Resolver<ApiResolversTypes['Int'], ParentType, ContextType>;
  taxAmount: Resolver<Maybe<ApiResolversTypes['Int']>, ParentType, ContextType>;
  totalAmount: Resolver<ApiResolversTypes['Int'], ParentType, ContextType>;
  unitComparePrice: Resolver<ApiResolversTypes['Int'], ParentType, ContextType>;
  unitPrice: Resolver<ApiResolversTypes['Int'], ParentType, ContextType>;
  updatedAt: Resolver<ApiResolversTypes['DateTime'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ApiOrderMutationResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['OrderMutation'] = ApiResolversParentTypes['OrderMutation']> = {
  orderAdminNoteUpdate: Resolver<ApiResolversTypes['Boolean'], ParentType, ContextType, RequireFields<ApiOrderMutationOrderAdminNoteUpdateArgs, 'input'>>;
  orderCancel: Resolver<ApiResolversTypes['Boolean'], ParentType, ContextType, RequireFields<ApiOrderMutationOrderCancelArgs, 'input'>>;
  orderClose: Resolver<ApiResolversTypes['Boolean'], ParentType, ContextType, RequireFields<ApiOrderMutationOrderCloseArgs, 'input'>>;
  orderCommentAdd: Resolver<ApiResolversTypes['Boolean'], ParentType, ContextType, RequireFields<ApiOrderMutationOrderCommentAddArgs, 'input'>>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ApiOrderQueryResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['OrderQuery'] = ApiResolversParentTypes['OrderQuery']> = {
  order: Resolver<Maybe<ApiResolversTypes['Order']>, ParentType, ContextType, RequireFields<ApiOrderQueryOrderArgs, 'id'>>;
  orders: Resolver<ApiResolversTypes['OrdersOutput'], ParentType, ContextType, ApiOrderQueryOrdersArgs>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ApiOrdersOutputResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['OrdersOutput'] = ApiResolversParentTypes['OrdersOutput']> = {
  data: Resolver<Array<ApiResolversTypes['Order']>, ParentType, ContextType>;
  meta: Resolver<ApiResolversTypes['CollectionMeta'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ApiPurchasableResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['Purchasable'] = ApiResolversParentTypes['Purchasable']> = {
  __resolveType: TypeResolveFn<'PurchasableSnapshot', ParentType, ContextType>;
  id: Resolver<ApiResolversTypes['ID'], ParentType, ContextType>;
};

export type ApiPurchasableSnapshotResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['PurchasableSnapshot'] = ApiResolversParentTypes['PurchasableSnapshot']> = {
  id: Resolver<ApiResolversTypes['ID'], ParentType, ContextType>;
  purchasableSnapshot: Resolver<ApiResolversTypes['JSON'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ApiQueryResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['Query'] = ApiResolversParentTypes['Query']> = {
  orderQuery: Resolver<ApiResolversTypes['OrderQuery'], ParentType, ContextType>;
};

export type ApiTagResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['Tag'] = ApiResolversParentTypes['Tag']> = {
  id: Resolver<ApiResolversTypes['ID'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ApiUserResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['User'] = ApiResolversParentTypes['User']> = {
  id: Resolver<ApiResolversTypes['ID'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ApiWeightResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['Weight'] = ApiResolversParentTypes['Weight']> = {
  unit: Resolver<ApiResolversTypes['WeightUnit'], ParentType, ContextType>;
  weight: Resolver<ApiResolversTypes['Float'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ApiResolvers<ContextType = GraphQLContext> = {
  ApiKey: ApiApiKeyResolvers<ContextType>;
  BigInt: GraphQLScalarType;
  CollectionMeta: ApiCollectionMetaResolvers<ContextType>;
  Customer: ApiCustomerResolvers<ContextType>;
  DateTime: GraphQLScalarType;
  Email: GraphQLScalarType;
  JSON: GraphQLScalarType;
  Label: ApiLabelResolvers<ContextType>;
  Mutation: ApiMutationResolvers<ContextType>;
  Node: ApiNodeResolvers<ContextType>;
  Order: ApiOrderResolvers<ContextType>;
  OrderActor: ApiOrderActorResolvers<ContextType>;
  OrderCustomerIdentity: ApiOrderCustomerIdentityResolvers<ContextType>;
  OrderCustomerStatistic: ApiOrderCustomerStatisticResolvers<ContextType>;
  OrderDeliveryAddress: ApiOrderDeliveryAddressResolvers<ContextType>;
  OrderEvent: ApiOrderEventResolvers<ContextType>;
  OrderLine: ApiOrderLineResolvers<ContextType>;
  OrderMutation: ApiOrderMutationResolvers<ContextType>;
  OrderQuery: ApiOrderQueryResolvers<ContextType>;
  OrdersOutput: ApiOrdersOutputResolvers<ContextType>;
  Purchasable: ApiPurchasableResolvers<ContextType>;
  PurchasableSnapshot: ApiPurchasableSnapshotResolvers<ContextType>;
  Query: ApiQueryResolvers<ContextType>;
  Tag: ApiTagResolvers<ContextType>;
  User: ApiUserResolvers<ContextType>;
  Weight: ApiWeightResolvers<ContextType>;
};

