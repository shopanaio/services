package main

// Language codes based on ISO 639-1 and BCP 47
type LocaleCode string

const (
	// English
	LocaleCodeEn LocaleCode = "en"
	// Russian
	LocaleCodeRu LocaleCode = "ru"
	// Ukrainian
	LocaleCodeUk LocaleCode = "uk"
	// French
	LocaleCodeFr LocaleCode = "fr"
	// Spanish
	LocaleCodeEs LocaleCode = "es"
	// German
	LocaleCodeDe LocaleCode = "de"
	// Italian
	LocaleCodeIt LocaleCode = "it"
	// Portuguese (Portugal/Brazil unified)
	LocaleCodePt LocaleCode = "pt"
	// Japanese
	LocaleCodeJa LocaleCode = "ja"
	// Korean
	LocaleCodeKo LocaleCode = "ko"
	// Chinese (Simplified, China)
	LocaleCodeZhCn LocaleCode = "zh_CN"
	// Chinese (Traditional, Taiwan)
	LocaleCodeZhTw LocaleCode = "zh_TW"
	// Polish
	LocaleCodePl LocaleCode = "pl"
	// Turkish
	LocaleCodeTr LocaleCode = "tr"
	// Dutch
	LocaleCodeNl LocaleCode = "nl"
	// Arabic
	LocaleCodeAr LocaleCode = "ar"
	// Hebrew
	LocaleCodeHe LocaleCode = "he"
	// Hindi
	LocaleCodeHi LocaleCode = "hi"
	// Bengali
	LocaleCodeBn LocaleCode = "bn"
	// Vietnamese
	LocaleCodeVi LocaleCode = "vi"
	// Thai
	LocaleCodeTh LocaleCode = "th"
	// Indonesian
	LocaleCodeID LocaleCode = "id"
	// Malay
	LocaleCodeMs LocaleCode = "ms"
	// Czech
	LocaleCodeCs LocaleCode = "cs"
	// Slovak
	LocaleCodeSk LocaleCode = "sk"
	// Romanian
	LocaleCodeRo LocaleCode = "ro"
	// Hungarian
	LocaleCodeHu LocaleCode = "hu"
	// Greek
	LocaleCodeEl LocaleCode = "el"
	// Bulgarian
	LocaleCodeBg LocaleCode = "bg"
	// Serbian
	LocaleCodeSr LocaleCode = "sr"
	// Croatian
	LocaleCodeHr LocaleCode = "hr"
	// Slovenian
	LocaleCodeSl LocaleCode = "sl"
	// Lithuanian
	LocaleCodeLt LocaleCode = "lt"
	// Latvian
	LocaleCodeLv LocaleCode = "lv"
	// Estonian
	LocaleCodeEt LocaleCode = "et"
	// Finnish
	LocaleCodeFi LocaleCode = "fi"
	// Swedish
	LocaleCodeSv LocaleCode = "sv"
	// Norwegian
	LocaleCodeNo LocaleCode = "no"
	// Danish
	LocaleCodeDa LocaleCode = "da"
	// Icelandic
	LocaleCodeIs LocaleCode = "is"
	// Filipino
	LocaleCodeFil LocaleCode = "fil"
	// Swahili
	LocaleCodeSw LocaleCode = "sw"
	// Azerbaijani
	LocaleCodeAz LocaleCode = "az"
	// Armenian
	LocaleCodeHy LocaleCode = "hy"
	// Georgian
	LocaleCodeKa LocaleCode = "ka"
	// Kazakh
	LocaleCodeKk LocaleCode = "kk"
	// Uzbek
	LocaleCodeUz LocaleCode = "uz"
	// Turkmen
	LocaleCodeTk LocaleCode = "tk"
	// Kyrgyz
	LocaleCodeKy LocaleCode = "ky"
	// Tajik
	LocaleCodeTg LocaleCode = "tg"
	// Pashto
	LocaleCodePs LocaleCode = "ps"
	// Persian (Farsi)
	LocaleCodeFa LocaleCode = "fa"
	// Kurdish
	LocaleCodeKu LocaleCode = "ku"
	// Mongolian
	LocaleCodeMn LocaleCode = "mn"
	// Nepali
	LocaleCodeNe LocaleCode = "ne"
	// Sinhala
	LocaleCodeSi LocaleCode = "si"
	// Tamil
	LocaleCodeTa LocaleCode = "ta"
	// Telugu
	LocaleCodeTe LocaleCode = "te"
	// Kannada
	LocaleCodeKn LocaleCode = "kn"
	// Malayalam
	LocaleCodeMl LocaleCode = "ml"
	// Marathi
	LocaleCodeMr LocaleCode = "mr"
	// Gujarati
	LocaleCodeGu LocaleCode = "gu"
	// Punjabi
	LocaleCodePa LocaleCode = "pa"
	// Lao
	LocaleCodeLo LocaleCode = "lo"
	// Burmese
	LocaleCodeMy LocaleCode = "my"
	// Khmer
	LocaleCodeKm LocaleCode = "km"
	// Basque
	LocaleCodeEu LocaleCode = "eu"
	// Galician
	LocaleCodeGl LocaleCode = "gl"
	// Catalan
	LocaleCodeCa LocaleCode = "ca"
	// Welsh
	LocaleCodeCy LocaleCode = "cy"
	// Irish
	LocaleCodeGa LocaleCode = "ga"
	// Scottish Gaelic
	LocaleCodeGd LocaleCode = "gd"
	// Haitian Creole
	LocaleCodeHt LocaleCode = "ht"
	// Afrikaans
	LocaleCodeAf LocaleCode = "af"
	// Zulu
	LocaleCodeZu LocaleCode = "zu"
	// Xhosa
	LocaleCodeXh LocaleCode = "xh"
	// Yoruba
	LocaleCodeYo LocaleCode = "yo"
	// Igbo
	LocaleCodeIg LocaleCode = "ig"
	// Amharic
	LocaleCodeAm LocaleCode = "am"
	// Malagasy
	LocaleCodeMg LocaleCode = "mg"
	// Maori
	LocaleCodeMi LocaleCode = "mi"
	// Samoan
	LocaleCodeSm LocaleCode = "sm"
	// Tongan
	LocaleCodeTo LocaleCode = "to"
	// Esperanto
	LocaleCodeEo LocaleCode = "eo"
	// Latin
	LocaleCodeLa LocaleCode = "la"
)

var AllLocaleCode = []LocaleCode{
	LocaleCodeEn,
	LocaleCodeRu,
	LocaleCodeUk,
	LocaleCodeFr,
	LocaleCodeEs,
	LocaleCodeDe,
	LocaleCodeIt,
	LocaleCodePt,
	LocaleCodeJa,
	LocaleCodeKo,
	LocaleCodeZhCn,
	LocaleCodeZhTw,
	LocaleCodePl,
	LocaleCodeTr,
	LocaleCodeNl,
	LocaleCodeAr,
	LocaleCodeHe,
	LocaleCodeHi,
	LocaleCodeBn,
	LocaleCodeVi,
	LocaleCodeTh,
	LocaleCodeID,
	LocaleCodeMs,
	LocaleCodeCs,
	LocaleCodeSk,
	LocaleCodeRo,
	LocaleCodeHu,
	LocaleCodeEl,
	LocaleCodeBg,
	LocaleCodeSr,
	LocaleCodeHr,
	LocaleCodeSl,
	LocaleCodeLt,
	LocaleCodeLv,
	LocaleCodeEt,
	LocaleCodeFi,
	LocaleCodeSv,
	LocaleCodeNo,
	LocaleCodeDa,
	LocaleCodeIs,
	LocaleCodeFil,
	LocaleCodeSw,
	LocaleCodeAz,
	LocaleCodeHy,
	LocaleCodeKa,
	LocaleCodeKk,
	LocaleCodeUz,
	LocaleCodeTk,
	LocaleCodeKy,
	LocaleCodeTg,
	LocaleCodePs,
	LocaleCodeFa,
	LocaleCodeKu,
	LocaleCodeMn,
	LocaleCodeNe,
	LocaleCodeSi,
	LocaleCodeTa,
	LocaleCodeTe,
	LocaleCodeKn,
	LocaleCodeMl,
	LocaleCodeMr,
	LocaleCodeGu,
	LocaleCodePa,
	LocaleCodeLo,
	LocaleCodeMy,
	LocaleCodeKm,
	LocaleCodeEu,
	LocaleCodeGl,
	LocaleCodeCa,
	LocaleCodeCy,
	LocaleCodeGa,
	LocaleCodeGd,
	LocaleCodeHt,
	LocaleCodeAf,
	LocaleCodeZu,
	LocaleCodeXh,
	LocaleCodeYo,
	LocaleCodeIg,
	LocaleCodeAm,
	LocaleCodeMg,
	LocaleCodeMi,
	LocaleCodeSm,
	LocaleCodeTo,
	LocaleCodeEo,
	LocaleCodeLa,
}
