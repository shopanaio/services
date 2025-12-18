/**
 * Transliterates Cyrillic characters to Latin characters for slug generation
 * @param text - Text to transliterate
 * @returns Transliterated text in Latin characters
 */
export function transliterate(text: string): string {
  const cyrillicToLatinMap: Record<string, string> = {
    // Russian/Ukrainian lowercase
    'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo',
    'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm',
    'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
    'ф': 'f', 'х': 'h', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'sch',
    'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya',
    // Ukrainian specific
    'є': 'ye', 'і': 'i', 'ї': 'yi', 'ґ': 'g',
    // Russian/Ukrainian uppercase
    'А': 'A', 'Б': 'B', 'В': 'V', 'Г': 'G', 'Д': 'D', 'Е': 'E', 'Ё': 'Yo',
    'Ж': 'Zh', 'З': 'Z', 'И': 'I', 'Й': 'Y', 'К': 'K', 'Л': 'L', 'М': 'M',
    'Н': 'N', 'О': 'O', 'П': 'P', 'Р': 'R', 'С': 'S', 'Т': 'T', 'У': 'U',
    'Ф': 'F', 'Х': 'H', 'Ц': 'Ts', 'Ч': 'Ch', 'Ш': 'Sh', 'Щ': 'Sch',
    'Ъ': '', 'Ы': 'Y', 'Ь': '', 'Э': 'E', 'Ю': 'Yu', 'Я': 'Ya',
    // Ukrainian specific uppercase
    'Є': 'Ye', 'І': 'I', 'Ї': 'Yi', 'Ґ': 'G',
  };

  return text
    .split('')
    .map((char) => cyrillicToLatinMap[char] ?? char)
    .join('');
}

/**
 * Converts text to a URL-friendly slug (Latin characters only)
 * @param text - Text to convert to slug
 * @returns URL-friendly slug in Latin characters
 */
export function slugify(text: string): string {
  return transliterate(text)
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')           // Replace spaces with hyphens
    .replace(/[^\w-]+/g, '')        // Remove non-word characters
    .replace(/--+/g, '-')           // Replace multiple hyphens with single hyphen
    .replace(/^-+/, '')             // Trim hyphens from start
    .replace(/-+$/, '');            // Trim hyphens from end
}
