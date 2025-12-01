package main

type CountryCode string

const (
	// United States
	CountryCodeUs CountryCode = "US"
	// Canada
	CountryCodeCa CountryCode = "CA"
	// Mexico
	CountryCodeMx CountryCode = "MX"
	// United Kingdom
	CountryCodeGb CountryCode = "GB"
	// Germany
	CountryCodeDe CountryCode = "DE"
	// France
	CountryCodeFr CountryCode = "FR"
	// Italy
	CountryCodeIt CountryCode = "IT"
	// Spain
	CountryCodeEs CountryCode = "ES"
	// Australia
	CountryCodeAu CountryCode = "AU"
	// New Zealand
	CountryCodeNz CountryCode = "NZ"
	// Japan
	CountryCodeJp CountryCode = "JP"
	// China
	CountryCodeCn CountryCode = "CN"
	// South Korea
	CountryCodeKr CountryCode = "KR"
	// India
	CountryCodeIn CountryCode = "IN"
	// Brazil
	CountryCodeBr CountryCode = "BR"
	// Argentina
	CountryCodeAr CountryCode = "AR"
	// South Africa
	CountryCodeZa CountryCode = "ZA"
	// Russia
	CountryCodeRu CountryCode = "RU"
	// Ukraine
	CountryCodeUa CountryCode = "UA"
	// Poland
	CountryCodePl CountryCode = "PL"
	// Netherlands
	CountryCodeNl CountryCode = "NL"
	// Belgium
	CountryCodeBe CountryCode = "BE"
	// Sweden
	CountryCodeSe CountryCode = "SE"
	// Norway
	CountryCodeNo CountryCode = "NO"
	// Denmark
	CountryCodeDk CountryCode = "DK"
	// Finland
	CountryCodeFi CountryCode = "FI"
	// Switzerland
	CountryCodeCh CountryCode = "CH"
	// Austria
	CountryCodeAt CountryCode = "AT"
	// Portugal
	CountryCodePt CountryCode = "PT"
	// Ireland
	CountryCodeIe CountryCode = "IE"
	// Czech Republic
	CountryCodeCz CountryCode = "CZ"
	// Hungary
	CountryCodeHu CountryCode = "HU"
	// Slovakia
	CountryCodeSk CountryCode = "SK"
	// Slovenia
	CountryCodeSi CountryCode = "SI"
	// Croatia
	CountryCodeHr CountryCode = "HR"
	// Greece
	CountryCodeGr CountryCode = "GR"
	// Turkey
	CountryCodeTr CountryCode = "TR"
	// Romania
	CountryCodeRo CountryCode = "RO"
	// Bulgaria
	CountryCodeBg CountryCode = "BG"
	// Estonia
	CountryCodeEe CountryCode = "EE"
	// Latvia
	CountryCodeLv CountryCode = "LV"
	// Lithuania
	CountryCodeLt CountryCode = "LT"
	// Iceland
	CountryCodeIs CountryCode = "IS"
	// Luxembourg
	CountryCodeLu CountryCode = "LU"
	// Liechtenstein
	CountryCodeLi CountryCode = "LI"
	// Malta
	CountryCodeMt CountryCode = "MT"
	// Cyprus
	CountryCodeCy CountryCode = "CY"
	// Israel
	CountryCodeIl CountryCode = "IL"
	// Saudi Arabia
	CountryCodeSa CountryCode = "SA"
	// United Arab Emirates
	CountryCodeAe CountryCode = "AE"
	// Qatar
	CountryCodeQa CountryCode = "QA"
	// Kuwait
	CountryCodeKw CountryCode = "KW"
	// Oman
	CountryCodeOm CountryCode = "OM"
	// Jordan
	CountryCodeJo CountryCode = "JO"
	// Egypt
	CountryCodeEg CountryCode = "EG"
	// Morocco
	CountryCodeMa CountryCode = "MA"
	// Tunisia
	CountryCodeTn CountryCode = "TN"
	// Algeria
	CountryCodeDz CountryCode = "DZ"
	// Nigeria
	CountryCodeNg CountryCode = "NG"
	// Kenya
	CountryCodeKe CountryCode = "KE"
	// Ethiopia
	CountryCodeEt CountryCode = "ET"
	// Ghana
	CountryCodeGh CountryCode = "GH"
	// Senegal
	CountryCodeSn CountryCode = "SN"
	// Ivory Coast
	CountryCodeCi CountryCode = "CI"
	// Tanzania
	CountryCodeTz CountryCode = "TZ"
	// Uganda
	CountryCodeUg CountryCode = "UG"
	// Cameroon
	CountryCodeCm CountryCode = "CM"
	// Zambia
	CountryCodeZm CountryCode = "ZM"
	// Zimbabwe
	CountryCodeZw CountryCode = "ZW"
	// Mozambique
	CountryCodeMz CountryCode = "MZ"
	// Botswana
	CountryCodeBw CountryCode = "BW"
	// Namibia
	CountryCodeNa CountryCode = "NA"
	// Angola
	CountryCodeAo CountryCode = "AO"
	// Democratic Republic of the Congo
	CountryCodeCd CountryCode = "CD"
	// Sudan
	CountryCodeSd CountryCode = "SD"
	// Pakistan
	CountryCodePk CountryCode = "PK"
	// Bangladesh
	CountryCodeBd CountryCode = "BD"
	// Nepal
	CountryCodeNp CountryCode = "NP"
	// Thailand
	CountryCodeTh CountryCode = "TH"
	// Vietnam
	CountryCodeVn CountryCode = "VN"
	// Malaysia
	CountryCodeMy CountryCode = "MY"
	// Singapore
	CountryCodeSg CountryCode = "SG"
	// Indonesia
	CountryCodeID CountryCode = "ID"
	// Philippines
	CountryCodePh CountryCode = "PH"
	// Myanmar
	CountryCodeMm CountryCode = "MM"
	// Cambodia
	CountryCodeKh CountryCode = "KH"
	// Laos
	CountryCodeLa CountryCode = "LA"
	// Brunei
	CountryCodeBn CountryCode = "BN"
	// Kazakhstan
	CountryCodeKz CountryCode = "KZ"
	// Uzbekistan
	CountryCodeUz CountryCode = "UZ"
	// Turkmenistan
	CountryCodeTm CountryCode = "TM"
	// Kyrgyzstan
	CountryCodeKg CountryCode = "KG"
	// Tajikistan
	CountryCodeTj CountryCode = "TJ"
	// Georgia
	CountryCodeGe CountryCode = "GE"
	// Armenia
	CountryCodeAm CountryCode = "AM"
	// Azerbaijan
	CountryCodeAz CountryCode = "AZ"
	// Belarus
	CountryCodeBy CountryCode = "BY"
	// Moldova
	CountryCodeMd CountryCode = "MD"
	// Serbia
	CountryCodeRs CountryCode = "RS"
	// Montenegro
	CountryCodeMe CountryCode = "ME"
	// North Macedonia
	CountryCodeMk CountryCode = "MK"
	// Bosnia and Herzegovina
	CountryCodeBa CountryCode = "BA"
	// Albania
	CountryCodeAl CountryCode = "AL"
	// Kosovo
	CountryCodeXk CountryCode = "XK"
	// Greenland
	CountryCodeGl CountryCode = "GL"
	// Panama
	CountryCodePa CountryCode = "PA"
	// Costa Rica
	CountryCodeCr CountryCode = "CR"
	// El Salvador
	CountryCodeSv CountryCode = "SV"
	// Guatemala
	CountryCodeGt CountryCode = "GT"
	// Honduras
	CountryCodeHn CountryCode = "HN"
	// Nicaragua
	CountryCodeNi CountryCode = "NI"
	// Jamaica
	CountryCodeJm CountryCode = "JM"
	// Cuba
	CountryCodeCu CountryCode = "CU"
	// Dominican Republic
	CountryCodeDo CountryCode = "DO"
	// Haiti
	CountryCodeHt CountryCode = "HT"
	// Trinidad and Tobago
	CountryCodeTt CountryCode = "TT"
	// Barbados
	CountryCodeBb CountryCode = "BB"
	// Bahamas
	CountryCodeBs CountryCode = "BS"
	// Paraguay
	CountryCodePy CountryCode = "PY"
	// Uruguay
	CountryCodeUy CountryCode = "UY"
	// Chile
	CountryCodeCl CountryCode = "CL"
	// Peru
	CountryCodePe CountryCode = "PE"
	// Colombia
	CountryCodeCo CountryCode = "CO"
	// Venezuela
	CountryCodeVe CountryCode = "VE"
	// Bolivia
	CountryCodeBo CountryCode = "BO"
	// Ecuador
	CountryCodeEc CountryCode = "EC"
	// Suriname
	CountryCodeSr CountryCode = "SR"
	// Guyana
	CountryCodeGy CountryCode = "GY"
	// Fiji
	CountryCodeFj CountryCode = "FJ"
	// Papua New Guinea
	CountryCodePg CountryCode = "PG"
	// Samoa
	CountryCodeWs CountryCode = "WS"
	// Tonga
	CountryCodeTo CountryCode = "TO"
	// Solomon Islands
	CountryCodeSb CountryCode = "SB"
	// Vanuatu
	CountryCodeVu CountryCode = "VU"
	// New Caledonia
	CountryCodeNc CountryCode = "NC"
	// Marshall Islands
	CountryCodeMh CountryCode = "MH"
	// Micronesia
	CountryCodeFm CountryCode = "FM"
	// Palau
	CountryCodePw CountryCode = "PW"
	// Maldives
	CountryCodeMv CountryCode = "MV"
	// Seychelles
	CountryCodeSc CountryCode = "SC"
	// Mauritius
	CountryCodeMu CountryCode = "MU"
	// Sri Lanka
	CountryCodeLk CountryCode = "LK"
	// Bhutan
	CountryCodeBt CountryCode = "BT"
	// Mongolia
	CountryCodeMn CountryCode = "MN"
	// North Korea
	CountryCodeKp CountryCode = "KP"
	// Iraq
	CountryCodeIq CountryCode = "IQ"
	// Iran
	CountryCodeIr CountryCode = "IR"
	// Afghanistan
	CountryCodeAf CountryCode = "AF"
	// Yemen
	CountryCodeYe CountryCode = "YE"
	// Syria
	CountryCodeSy CountryCode = "SY"
	// Lebanon
	CountryCodeLb CountryCode = "LB"
	// Palestine
	CountryCodePs CountryCode = "PS"
	// Bahrain
	CountryCodeBh CountryCode = "BH"
	// Malawi
	CountryCodeMw CountryCode = "MW"
	// Rwanda
	CountryCodeRw CountryCode = "RW"
	// Burundi
	CountryCodeBi CountryCode = "BI"
	// South Sudan
	CountryCodeSs CountryCode = "SS"
	// Lesotho
	CountryCodeLs CountryCode = "LS"
	// Swaziland (Eswatini)
	CountryCodeSz CountryCode = "SZ"
	// Madagascar
	CountryCodeMg CountryCode = "MG"
	// Central African Republic
	CountryCodeCf CountryCode = "CF"
	// Republic of the Congo
	CountryCodeCg CountryCode = "CG"
	// Gabon
	CountryCodeGa CountryCode = "GA"
	// Guinea
	CountryCodeGn CountryCode = "GN"
	// Guinea-Bissau
	CountryCodeGw CountryCode = "GW"
	// Equatorial Guinea
	CountryCodeGq CountryCode = "GQ"
	// Sierra Leone
	CountryCodeSl CountryCode = "SL"
	// Liberia
	CountryCodeLr CountryCode = "LR"
	// Benin
	CountryCodeBj CountryCode = "BJ"
	// Togo
	CountryCodeTg CountryCode = "TG"
	// Niger
	CountryCodeNe CountryCode = "NE"
	// Mali
	CountryCodeMl CountryCode = "ML"
	// Burkina Faso
	CountryCodeBf CountryCode = "BF"
	// Chad
	CountryCodeTd CountryCode = "TD"
	// Mauritania
	CountryCodeMr CountryCode = "MR"
	// Gambia
	CountryCodeGm CountryCode = "GM"
	// Cape Verde
	CountryCodeCv CountryCode = "CV"
	// Eritrea
	CountryCodeEr CountryCode = "ER"
	// Djibouti
	CountryCodeDj CountryCode = "DJ"
	// Comoros
	CountryCodeKm CountryCode = "KM"
	// Andorra
	CountryCodeAd CountryCode = "AD"
	// Monaco
	CountryCodeMc CountryCode = "MC"
	// San Marino
	CountryCodeSm CountryCode = "SM"
	// Vatican City
	CountryCodeVa CountryCode = "VA"
	// Timor-Leste (East Timor)
	CountryCodeTl CountryCode = "TL"
	// Antigua and Barbuda
	CountryCodeAg CountryCode = "AG"
	// Saint Kitts and Nevis
	CountryCodeKn CountryCode = "KN"
	// Saint Lucia
	CountryCodeLc CountryCode = "LC"
	// Saint Vincent and the Grenadines
	CountryCodeVc CountryCode = "VC"
	// Grenada
	CountryCodeGd CountryCode = "GD"
	// Dominica
	CountryCodeDm CountryCode = "DM"
	// Belize
	CountryCodeBz CountryCode = "BZ"
	// Aruba
	CountryCodeAw CountryCode = "AW"
	// Curaçao
	CountryCodeCw CountryCode = "CW"
	// Bermuda
	CountryCodeBm CountryCode = "BM"
	// Faroe Islands
	CountryCodeFo CountryCode = "FO"
	// Isle of Man
	CountryCodeIm CountryCode = "IM"
	// Jersey
	CountryCodeJe CountryCode = "JE"
	// Guernsey
	CountryCodeGg CountryCode = "GG"
	// Åland Islands
	CountryCodeAx CountryCode = "AX"
	// Western Sahara
	CountryCodeEh CountryCode = "EH"
	// British Virgin Islands
	CountryCodeVg CountryCode = "VG"
	// US Virgin Islands
	CountryCodeVi CountryCode = "VI"
)

var AllCountryCode = []CountryCode{
	CountryCodeUs,
	CountryCodeCa,
	CountryCodeMx,
	CountryCodeGb,
	CountryCodeDe,
	CountryCodeFr,
	CountryCodeIt,
	CountryCodeEs,
	CountryCodeAu,
	CountryCodeNz,
	CountryCodeJp,
	CountryCodeCn,
	CountryCodeKr,
	CountryCodeIn,
	CountryCodeBr,
	CountryCodeAr,
	CountryCodeZa,
	CountryCodeRu,
	CountryCodeUa,
	CountryCodePl,
	CountryCodeNl,
	CountryCodeBe,
	CountryCodeSe,
	CountryCodeNo,
	CountryCodeDk,
	CountryCodeFi,
	CountryCodeCh,
	CountryCodeAt,
	CountryCodePt,
	CountryCodeIe,
	CountryCodeCz,
	CountryCodeHu,
	CountryCodeSk,
	CountryCodeSi,
	CountryCodeHr,
	CountryCodeGr,
	CountryCodeTr,
	CountryCodeRo,
	CountryCodeBg,
	CountryCodeEe,
	CountryCodeLv,
	CountryCodeLt,
	CountryCodeIs,
	CountryCodeLu,
	CountryCodeLi,
	CountryCodeMt,
	CountryCodeCy,
	CountryCodeIl,
	CountryCodeSa,
	CountryCodeAe,
	CountryCodeQa,
	CountryCodeKw,
	CountryCodeOm,
	CountryCodeJo,
	CountryCodeEg,
	CountryCodeMa,
	CountryCodeTn,
	CountryCodeDz,
	CountryCodeNg,
	CountryCodeKe,
	CountryCodeEt,
	CountryCodeGh,
	CountryCodeSn,
	CountryCodeCi,
	CountryCodeTz,
	CountryCodeUg,
	CountryCodeCm,
	CountryCodeZm,
	CountryCodeZw,
	CountryCodeMz,
	CountryCodeBw,
	CountryCodeNa,
	CountryCodeAo,
	CountryCodeCd,
	CountryCodeSd,
	CountryCodePk,
	CountryCodeBd,
	CountryCodeNp,
	CountryCodeTh,
	CountryCodeVn,
	CountryCodeMy,
	CountryCodeSg,
	CountryCodeID,
	CountryCodePh,
	CountryCodeMm,
	CountryCodeKh,
	CountryCodeLa,
	CountryCodeBn,
	CountryCodeKz,
	CountryCodeUz,
	CountryCodeTm,
	CountryCodeKg,
	CountryCodeTj,
	CountryCodeGe,
	CountryCodeAm,
	CountryCodeAz,
	CountryCodeBy,
	CountryCodeMd,
	CountryCodeRs,
	CountryCodeMe,
	CountryCodeMk,
	CountryCodeBa,
	CountryCodeAl,
	CountryCodeXk,
	CountryCodeGl,
	CountryCodePa,
	CountryCodeCr,
	CountryCodeSv,
	CountryCodeGt,
	CountryCodeHn,
	CountryCodeNi,
	CountryCodeJm,
	CountryCodeCu,
	CountryCodeDo,
	CountryCodeHt,
	CountryCodeTt,
	CountryCodeBb,
	CountryCodeBs,
	CountryCodePy,
	CountryCodeUy,
	CountryCodeCl,
	CountryCodePe,
	CountryCodeCo,
	CountryCodeVe,
	CountryCodeBo,
	CountryCodeEc,
	CountryCodeSr,
	CountryCodeGy,
	CountryCodeFj,
	CountryCodePg,
	CountryCodeWs,
	CountryCodeTo,
	CountryCodeSb,
	CountryCodeVu,
	CountryCodeNc,
	CountryCodeMh,
	CountryCodeFm,
	CountryCodePw,
	CountryCodeMv,
	CountryCodeSc,
	CountryCodeMu,
	CountryCodeLk,
	CountryCodeBt,
	CountryCodeMn,
	CountryCodeKp,
	CountryCodeIq,
	CountryCodeIr,
	CountryCodeAf,
	CountryCodeYe,
	CountryCodeSy,
	CountryCodeLb,
	CountryCodePs,
	CountryCodeBh,
	CountryCodeMw,
	CountryCodeRw,
	CountryCodeBi,
	CountryCodeSs,
	CountryCodeLs,
	CountryCodeSz,
	CountryCodeMg,
	CountryCodeCf,
	CountryCodeCg,
	CountryCodeGa,
	CountryCodeGn,
	CountryCodeGw,
	CountryCodeGq,
	CountryCodeSl,
	CountryCodeLr,
	CountryCodeBj,
	CountryCodeTg,
	CountryCodeNe,
	CountryCodeMl,
	CountryCodeBf,
	CountryCodeTd,
	CountryCodeMr,
	CountryCodeGm,
	CountryCodeCv,
	CountryCodeEr,
	CountryCodeDj,
	CountryCodeKm,
	CountryCodeAd,
	CountryCodeMc,
	CountryCodeSm,
	CountryCodeVa,
	CountryCodeTl,
	CountryCodeAg,
	CountryCodeKn,
	CountryCodeLc,
	CountryCodeVc,
	CountryCodeGd,
	CountryCodeDm,
	CountryCodeBz,
	CountryCodeAw,
	CountryCodeCw,
	CountryCodeBm,
	CountryCodeFo,
	CountryCodeIm,
	CountryCodeJe,
	CountryCodeGg,
	CountryCodeAx,
	CountryCodeEh,
	CountryCodeVg,
	CountryCodeVi,
}
