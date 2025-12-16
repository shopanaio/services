/**
 * Language/Locale codes based on ISO 639-1 and BCP 47
 */
export enum LocaleCode {
  /** Akan */
  ak = "ak",
  /** Albanian */
  sq = "sq",
  /** Amharic */
  am = "am",
  /** Arabic */
  ar = "ar",
  /** Armenian */
  hy = "hy",
  /** Assamese */
  as = "as",
  /** Azerbaijani */
  az = "az",
  /** Bambara */
  bm = "bm",
  /** Bangla */
  bn = "bn",
  /** Basque */
  eu = "eu",
  /** Belarusian */
  be = "be",
  /** Bosnian */
  bs = "bs",
  /** Breton */
  br = "br",
  /** Bulgarian */
  bg = "bg",
  /** Burmese */
  my = "my",
  /** Catalan */
  ca = "ca",
  /** Central Kurdish */
  ckb = "ckb",
  /** Chechen */
  ce = "ce",
  /** Chinese (Simplified) */
  zh_CN = "zh-CN",
  /** Chinese (Traditional) */
  zh_TW = "zh-TW",
  /** Cornish */
  kw = "kw",
  /** Croatian */
  hr = "hr",
  /** Czech */
  cs = "cs",
  /** Danish */
  da = "da",
  /** Dutch */
  nl = "nl",
  /** Dzongkha */
  dz = "dz",
  /** English */
  en = "en",
  /** Esperanto */
  eo = "eo",
  /** Estonian */
  et = "et",
  /** Ewe */
  ee = "ee",
  /** Faroese */
  fo = "fo",
  /** Filipino */
  fil = "fil",
  /** Finnish */
  fi = "fi",
  /** French */
  fr = "fr",
  /** Fulah */
  ff = "ff",
  /** Galician */
  gl = "gl",
  /** Ganda */
  lg = "lg",
  /** Georgian */
  ka = "ka",
  /** German */
  de = "de",
  /** Greek */
  el = "el",
  /** Gujarati */
  gu = "gu",
  /** Hausa */
  ha = "ha",
  /** Hebrew */
  he = "he",
  /** Hindi */
  hi = "hi",
  /** Hungarian */
  hu = "hu",
  /** Icelandic */
  is = "is",
  /** Igbo */
  ig = "ig",
  /** Indonesian */
  id = "id",
  /** Interlingua */
  ia = "ia",
  /** Irish */
  ga = "ga",
  /** Italian */
  it = "it",
  /** Japanese */
  ja = "ja",
  /** Javanese */
  jv = "jv",
  /** Kalaallisut */
  kl = "kl",
  /** Kannada */
  kn = "kn",
  /** Kashmiri */
  ks = "ks",
  /** Kazakh */
  kk = "kk",
  /** Khmer */
  km = "km",
  /** Kikuyu */
  ki = "ki",
  /** Kinyarwanda */
  rw = "rw",
  /** Korean */
  ko = "ko",
  /** Kurdish */
  ku = "ku",
  /** Kyrgyz */
  ky = "ky",
  /** Lao */
  lo = "lo",
  /** Latvian */
  lv = "lv",
  /** Lingala */
  ln = "ln",
  /** Lithuanian */
  lt = "lt",
  /** Luba-Katanga */
  lu = "lu",
  /** Luxembourgish */
  lb = "lb",
  /** Macedonian */
  mk = "mk",
  /** Malagasy */
  mg = "mg",
  /** Malay */
  ms = "ms",
  /** Malayalam */
  ml = "ml",
  /** Maltese */
  mt = "mt",
  /** Manx */
  gv = "gv",
  /** Marathi */
  mr = "mr",
  /** Mongolian */
  mn = "mn",
  /** Māori */
  mi = "mi",
  /** Nepali */
  ne = "ne",
  /** North Ndebele */
  nd = "nd",
  /** Northern Sami */
  se = "se",
  /** Norwegian */
  no = "no",
  /** Norwegian Bokmål */
  nb = "nb",
  /** Norwegian Nynorsk */
  nn = "nn",
  /** Odia */
  or = "or",
  /** Oromo */
  om = "om",
  /** Ossetic */
  os = "os",
  /** Pashto */
  ps = "ps",
  /** Persian */
  fa = "fa",
  /** Polish */
  pl = "pl",
  /** Portuguese (Brazil) */
  pt_BR = "pt-BR",
  /** Portuguese (Portugal) */
  pt_PT = "pt-PT",
  /** Punjabi */
  pa = "pa",
  /** Quechua */
  qu = "qu",
  /** Romanian */
  ro = "ro",
  /** Romansh */
  rm = "rm",
  /** Rundi */
  rn = "rn",
  /** Russian */
  ru = "ru",
  /** Sango */
  sg = "sg",
  /** Sanskrit */
  sa = "sa",
  /** Sardinian */
  sc = "sc",
  /** Scottish Gaelic */
  gd = "gd",
  /** Serbian */
  sr = "sr",
  /** Shona */
  sn = "sn",
  /** Sichuan Yi */
  ii = "ii",
  /** Sindhi */
  sd = "sd",
  /** Sinhala */
  si = "si",
  /** Slovak */
  sk = "sk",
  /** Slovenian */
  sl = "sl",
  /** Somali */
  so = "so",
  /** Spanish */
  es = "es",
  /** Sundanese */
  su = "su",
  /** Swahili */
  sw = "sw",
  /** Swedish */
  sv = "sv",
  /** Tajik */
  tg = "tg",
  /** Tamil */
  ta = "ta",
  /** Tatar */
  tt = "tt",
  /** Telugu */
  te = "te",
  /** Thai */
  th = "th",
  /** Tibetan */
  bo = "bo",
  /** Tigrinya */
  ti = "ti",
  /** Tongan */
  to = "to",
  /** Turkish */
  tr = "tr",
  /** Turkmen */
  tk = "tk",
  /** Ukrainian */
  uk = "uk",
  /** Urdu */
  ur = "ur",
  /** Uyghur */
  ug = "ug",
  /** Uzbek */
  uz = "uz",
  /** Vietnamese */
  vi = "vi",
  /** Welsh */
  cy = "cy",
  /** Western Frisian */
  fy = "fy",
  /** Wolof */
  wo = "wo",
  /** Xhosa */
  xh = "xh",
  /** Yiddish */
  yi = "yi",
  /** Yoruba */
  yo = "yo",
  /** Zulu */
  zu = "zu",
}

export const LOCALE_CODES = Object.values(LocaleCode);

export interface LocaleInfo {
  code: LocaleCode;
  name: string;
  nativeName: string;
}

export const LOCALE_INFO: Record<LocaleCode, LocaleInfo> = {
  [LocaleCode.ak]: { code: LocaleCode.ak, name: "Akan", nativeName: "Akan" },
  [LocaleCode.sq]: { code: LocaleCode.sq, name: "Albanian", nativeName: "Shqip" },
  [LocaleCode.am]: { code: LocaleCode.am, name: "Amharic", nativeName: "አማርኛ" },
  [LocaleCode.ar]: { code: LocaleCode.ar, name: "Arabic", nativeName: "العربية" },
  [LocaleCode.hy]: { code: LocaleCode.hy, name: "Armenian", nativeName: "Հայերdelays" },
  [LocaleCode.as]: { code: LocaleCode.as, name: "Assamese", nativeName: "অসমীয়া" },
  [LocaleCode.az]: { code: LocaleCode.az, name: "Azerbaijani", nativeName: "Azərbaycan" },
  [LocaleCode.bm]: { code: LocaleCode.bm, name: "Bambara", nativeName: "Bamanankan" },
  [LocaleCode.bn]: { code: LocaleCode.bn, name: "Bangla", nativeName: "বাংলা" },
  [LocaleCode.eu]: { code: LocaleCode.eu, name: "Basque", nativeName: "Euskara" },
  [LocaleCode.be]: { code: LocaleCode.be, name: "Belarusian", nativeName: "Беларуская" },
  [LocaleCode.bs]: { code: LocaleCode.bs, name: "Bosnian", nativeName: "Bosanski" },
  [LocaleCode.br]: { code: LocaleCode.br, name: "Breton", nativeName: "Brezhoneg" },
  [LocaleCode.bg]: { code: LocaleCode.bg, name: "Bulgarian", nativeName: "Български" },
  [LocaleCode.my]: { code: LocaleCode.my, name: "Burmese", nativeName: "မြန်မာ" },
  [LocaleCode.ca]: { code: LocaleCode.ca, name: "Catalan", nativeName: "Català" },
  [LocaleCode.ckb]: { code: LocaleCode.ckb, name: "Central Kurdish", nativeName: "کوردی" },
  [LocaleCode.ce]: { code: LocaleCode.ce, name: "Chechen", nativeName: "Нохчийн" },
  [LocaleCode.zh_CN]: { code: LocaleCode.zh_CN, name: "Chinese (Simplified)", nativeName: "简体中文" },
  [LocaleCode.zh_TW]: { code: LocaleCode.zh_TW, name: "Chinese (Traditional)", nativeName: "繁體中文" },
  [LocaleCode.kw]: { code: LocaleCode.kw, name: "Cornish", nativeName: "Kernewek" },
  [LocaleCode.hr]: { code: LocaleCode.hr, name: "Croatian", nativeName: "Hrvatski" },
  [LocaleCode.cs]: { code: LocaleCode.cs, name: "Czech", nativeName: "Čeština" },
  [LocaleCode.da]: { code: LocaleCode.da, name: "Danish", nativeName: "Dansk" },
  [LocaleCode.nl]: { code: LocaleCode.nl, name: "Dutch", nativeName: "Nederlands" },
  [LocaleCode.dz]: { code: LocaleCode.dz, name: "Dzongkha", nativeName: "རྫོང་ཁ" },
  [LocaleCode.en]: { code: LocaleCode.en, name: "English", nativeName: "English" },
  [LocaleCode.eo]: { code: LocaleCode.eo, name: "Esperanto", nativeName: "Esperanto" },
  [LocaleCode.et]: { code: LocaleCode.et, name: "Estonian", nativeName: "Eesti" },
  [LocaleCode.ee]: { code: LocaleCode.ee, name: "Ewe", nativeName: "Eʋegbe" },
  [LocaleCode.fo]: { code: LocaleCode.fo, name: "Faroese", nativeName: "Føroyskt" },
  [LocaleCode.fil]: { code: LocaleCode.fil, name: "Filipino", nativeName: "Filipino" },
  [LocaleCode.fi]: { code: LocaleCode.fi, name: "Finnish", nativeName: "Suomi" },
  [LocaleCode.fr]: { code: LocaleCode.fr, name: "French", nativeName: "Français" },
  [LocaleCode.ff]: { code: LocaleCode.ff, name: "Fulah", nativeName: "Fulfulde" },
  [LocaleCode.gl]: { code: LocaleCode.gl, name: "Galician", nativeName: "Galego" },
  [LocaleCode.lg]: { code: LocaleCode.lg, name: "Ganda", nativeName: "Luganda" },
  [LocaleCode.ka]: { code: LocaleCode.ka, name: "Georgian", nativeName: "ქართული" },
  [LocaleCode.de]: { code: LocaleCode.de, name: "German", nativeName: "Deutsch" },
  [LocaleCode.el]: { code: LocaleCode.el, name: "Greek", nativeName: "Ελληνικά" },
  [LocaleCode.gu]: { code: LocaleCode.gu, name: "Gujarati", nativeName: "ગુજરાતી" },
  [LocaleCode.ha]: { code: LocaleCode.ha, name: "Hausa", nativeName: "Hausa" },
  [LocaleCode.he]: { code: LocaleCode.he, name: "Hebrew", nativeName: "עברית" },
  [LocaleCode.hi]: { code: LocaleCode.hi, name: "Hindi", nativeName: "हिन्दी" },
  [LocaleCode.hu]: { code: LocaleCode.hu, name: "Hungarian", nativeName: "Magyar" },
  [LocaleCode.is]: { code: LocaleCode.is, name: "Icelandic", nativeName: "Íslenska" },
  [LocaleCode.ig]: { code: LocaleCode.ig, name: "Igbo", nativeName: "Igbo" },
  [LocaleCode.id]: { code: LocaleCode.id, name: "Indonesian", nativeName: "Indonesia" },
  [LocaleCode.ia]: { code: LocaleCode.ia, name: "Interlingua", nativeName: "Interlingua" },
  [LocaleCode.ga]: { code: LocaleCode.ga, name: "Irish", nativeName: "Gaeilge" },
  [LocaleCode.it]: { code: LocaleCode.it, name: "Italian", nativeName: "Italiano" },
  [LocaleCode.ja]: { code: LocaleCode.ja, name: "Japanese", nativeName: "日本語" },
  [LocaleCode.jv]: { code: LocaleCode.jv, name: "Javanese", nativeName: "Basa Jawa" },
  [LocaleCode.kl]: { code: LocaleCode.kl, name: "Kalaallisut", nativeName: "Kalaallisut" },
  [LocaleCode.kn]: { code: LocaleCode.kn, name: "Kannada", nativeName: "ಕನ್ನಡ" },
  [LocaleCode.ks]: { code: LocaleCode.ks, name: "Kashmiri", nativeName: "कॉशुर" },
  [LocaleCode.kk]: { code: LocaleCode.kk, name: "Kazakh", nativeName: "Қазақ тілі" },
  [LocaleCode.km]: { code: LocaleCode.km, name: "Khmer", nativeName: "ខ្មែរ" },
  [LocaleCode.ki]: { code: LocaleCode.ki, name: "Kikuyu", nativeName: "Gĩkũyũ" },
  [LocaleCode.rw]: { code: LocaleCode.rw, name: "Kinyarwanda", nativeName: "Kinyarwanda" },
  [LocaleCode.ko]: { code: LocaleCode.ko, name: "Korean", nativeName: "한국어" },
  [LocaleCode.ku]: { code: LocaleCode.ku, name: "Kurdish", nativeName: "Kurdî" },
  [LocaleCode.ky]: { code: LocaleCode.ky, name: "Kyrgyz", nativeName: "Кыргызча" },
  [LocaleCode.lo]: { code: LocaleCode.lo, name: "Lao", nativeName: "ລາວ" },
  [LocaleCode.lv]: { code: LocaleCode.lv, name: "Latvian", nativeName: "Latviešu" },
  [LocaleCode.ln]: { code: LocaleCode.ln, name: "Lingala", nativeName: "Lingála" },
  [LocaleCode.lt]: { code: LocaleCode.lt, name: "Lithuanian", nativeName: "Lietuvių" },
  [LocaleCode.lu]: { code: LocaleCode.lu, name: "Luba-Katanga", nativeName: "Tshiluba" },
  [LocaleCode.lb]: { code: LocaleCode.lb, name: "Luxembourgish", nativeName: "Lëtzebuergesch" },
  [LocaleCode.mk]: { code: LocaleCode.mk, name: "Macedonian", nativeName: "Македонски" },
  [LocaleCode.mg]: { code: LocaleCode.mg, name: "Malagasy", nativeName: "Malagasy" },
  [LocaleCode.ms]: { code: LocaleCode.ms, name: "Malay", nativeName: "Bahasa Melayu" },
  [LocaleCode.ml]: { code: LocaleCode.ml, name: "Malayalam", nativeName: "മലയാളം" },
  [LocaleCode.mt]: { code: LocaleCode.mt, name: "Maltese", nativeName: "Malti" },
  [LocaleCode.gv]: { code: LocaleCode.gv, name: "Manx", nativeName: "Gaelg" },
  [LocaleCode.mr]: { code: LocaleCode.mr, name: "Marathi", nativeName: "मराठी" },
  [LocaleCode.mn]: { code: LocaleCode.mn, name: "Mongolian", nativeName: "Монгол" },
  [LocaleCode.mi]: { code: LocaleCode.mi, name: "Māori", nativeName: "Te Reo Māori" },
  [LocaleCode.ne]: { code: LocaleCode.ne, name: "Nepali", nativeName: "नेपाली" },
  [LocaleCode.nd]: { code: LocaleCode.nd, name: "North Ndebele", nativeName: "isiNdebele" },
  [LocaleCode.se]: { code: LocaleCode.se, name: "Northern Sami", nativeName: "Davvisámegiella" },
  [LocaleCode.no]: { code: LocaleCode.no, name: "Norwegian", nativeName: "Norsk" },
  [LocaleCode.nb]: { code: LocaleCode.nb, name: "Norwegian Bokmål", nativeName: "Norsk bokmål" },
  [LocaleCode.nn]: { code: LocaleCode.nn, name: "Norwegian Nynorsk", nativeName: "Norsk nynorsk" },
  [LocaleCode.or]: { code: LocaleCode.or, name: "Odia", nativeName: "ଓଡ଼ିଆ" },
  [LocaleCode.om]: { code: LocaleCode.om, name: "Oromo", nativeName: "Oromoo" },
  [LocaleCode.os]: { code: LocaleCode.os, name: "Ossetic", nativeName: "Ирон" },
  [LocaleCode.ps]: { code: LocaleCode.ps, name: "Pashto", nativeName: "پښتو" },
  [LocaleCode.fa]: { code: LocaleCode.fa, name: "Persian", nativeName: "فارسی" },
  [LocaleCode.pl]: { code: LocaleCode.pl, name: "Polish", nativeName: "Polski" },
  [LocaleCode.pt_BR]: { code: LocaleCode.pt_BR, name: "Portuguese (Brazil)", nativeName: "Português (Brasil)" },
  [LocaleCode.pt_PT]: { code: LocaleCode.pt_PT, name: "Portuguese (Portugal)", nativeName: "Português (Portugal)" },
  [LocaleCode.pa]: { code: LocaleCode.pa, name: "Punjabi", nativeName: "ਪੰਜਾਬੀ" },
  [LocaleCode.qu]: { code: LocaleCode.qu, name: "Quechua", nativeName: "Runasimi" },
  [LocaleCode.ro]: { code: LocaleCode.ro, name: "Romanian", nativeName: "Română" },
  [LocaleCode.rm]: { code: LocaleCode.rm, name: "Romansh", nativeName: "Rumantsch" },
  [LocaleCode.rn]: { code: LocaleCode.rn, name: "Rundi", nativeName: "Ikirundi" },
  [LocaleCode.ru]: { code: LocaleCode.ru, name: "Russian", nativeName: "Русский" },
  [LocaleCode.sg]: { code: LocaleCode.sg, name: "Sango", nativeName: "Sängö" },
  [LocaleCode.sa]: { code: LocaleCode.sa, name: "Sanskrit", nativeName: "संस्कृतम्" },
  [LocaleCode.sc]: { code: LocaleCode.sc, name: "Sardinian", nativeName: "Sardu" },
  [LocaleCode.gd]: { code: LocaleCode.gd, name: "Scottish Gaelic", nativeName: "Gàidhlig" },
  [LocaleCode.sr]: { code: LocaleCode.sr, name: "Serbian", nativeName: "Српски" },
  [LocaleCode.sn]: { code: LocaleCode.sn, name: "Shona", nativeName: "chiShona" },
  [LocaleCode.ii]: { code: LocaleCode.ii, name: "Sichuan Yi", nativeName: "ꆈꌠꉙ" },
  [LocaleCode.sd]: { code: LocaleCode.sd, name: "Sindhi", nativeName: "سنڌي" },
  [LocaleCode.si]: { code: LocaleCode.si, name: "Sinhala", nativeName: "සිංහල" },
  [LocaleCode.sk]: { code: LocaleCode.sk, name: "Slovak", nativeName: "Slovenčina" },
  [LocaleCode.sl]: { code: LocaleCode.sl, name: "Slovenian", nativeName: "Slovenščina" },
  [LocaleCode.so]: { code: LocaleCode.so, name: "Somali", nativeName: "Soomaali" },
  [LocaleCode.es]: { code: LocaleCode.es, name: "Spanish", nativeName: "Español" },
  [LocaleCode.su]: { code: LocaleCode.su, name: "Sundanese", nativeName: "Basa Sunda" },
  [LocaleCode.sw]: { code: LocaleCode.sw, name: "Swahili", nativeName: "Kiswahili" },
  [LocaleCode.sv]: { code: LocaleCode.sv, name: "Swedish", nativeName: "Svenska" },
  [LocaleCode.tg]: { code: LocaleCode.tg, name: "Tajik", nativeName: "Тоҷикӣ" },
  [LocaleCode.ta]: { code: LocaleCode.ta, name: "Tamil", nativeName: "தமிழ்" },
  [LocaleCode.tt]: { code: LocaleCode.tt, name: "Tatar", nativeName: "Татар" },
  [LocaleCode.te]: { code: LocaleCode.te, name: "Telugu", nativeName: "తెలుగు" },
  [LocaleCode.th]: { code: LocaleCode.th, name: "Thai", nativeName: "ไทย" },
  [LocaleCode.bo]: { code: LocaleCode.bo, name: "Tibetan", nativeName: "བོད་སྐད་" },
  [LocaleCode.ti]: { code: LocaleCode.ti, name: "Tigrinya", nativeName: "ትግርኛ" },
  [LocaleCode.to]: { code: LocaleCode.to, name: "Tongan", nativeName: "Lea faka-Tonga" },
  [LocaleCode.tr]: { code: LocaleCode.tr, name: "Turkish", nativeName: "Türkçe" },
  [LocaleCode.tk]: { code: LocaleCode.tk, name: "Turkmen", nativeName: "Türkmen" },
  [LocaleCode.uk]: { code: LocaleCode.uk, name: "Ukrainian", nativeName: "Українська" },
  [LocaleCode.ur]: { code: LocaleCode.ur, name: "Urdu", nativeName: "اردو" },
  [LocaleCode.ug]: { code: LocaleCode.ug, name: "Uyghur", nativeName: "ئۇيغۇرچە" },
  [LocaleCode.uz]: { code: LocaleCode.uz, name: "Uzbek", nativeName: "Oʻzbekcha" },
  [LocaleCode.vi]: { code: LocaleCode.vi, name: "Vietnamese", nativeName: "Tiếng Việt" },
  [LocaleCode.cy]: { code: LocaleCode.cy, name: "Welsh", nativeName: "Cymraeg" },
  [LocaleCode.fy]: { code: LocaleCode.fy, name: "Western Frisian", nativeName: "Frysk" },
  [LocaleCode.wo]: { code: LocaleCode.wo, name: "Wolof", nativeName: "Wolof" },
  [LocaleCode.xh]: { code: LocaleCode.xh, name: "Xhosa", nativeName: "isiXhosa" },
  [LocaleCode.yi]: { code: LocaleCode.yi, name: "Yiddish", nativeName: "ייִדיש" },
  [LocaleCode.yo]: { code: LocaleCode.yo, name: "Yoruba", nativeName: "Yorùbá" },
  [LocaleCode.zu]: { code: LocaleCode.zu, name: "Zulu", nativeName: "isiZulu" },
};
