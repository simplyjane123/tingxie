import { parsePinyinString } from './pinyin';

interface ParsedItem {
  characters: string;
  pinyin: string;
  english: string;
}

/**
 * Simple parser for OCR text based on user preferences
 * Extracts Chinese characters, pinyin, and English from OCR output
 */
export function parseOcrSimple(ocrText: string): ParsedItem[] {
  const lines = ocrText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  const items: ParsedItem[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Skip lines that are just numbers or common headers
    if (/^\d+$/.test(line)) continue;
    if (line.includes('听写') || line.includes('日期')) continue;

    // Check if line contains Chinese characters
    const hasChineseChars = /[\u4e00-\u9fa5]/.test(line);

    if (hasChineseChars) {
      // Extract Chinese characters
      const chineseMatch = line.match(/[\u4e00-\u9fa5]+/g);
      if (!chineseMatch) continue;

      const characters = chineseMatch.join('');

      // Try to extract pinyin and English from the same line
      // Format might be: "汉字 pinyin English" or "汉字 - pinyin - English"
      let pinyin = '';
      let english = '';

      // Remove Chinese characters from line to get remaining text
      const remaining = line.replace(/[\u4e00-\u9fa5]/g, '').trim();

      // Split by common separators
      const parts = remaining.split(/[-—–:：\s]+/).filter(p => p.length > 0);

      for (const part of parts) {
        // Check if it's pinyin (contains tone marks or common pinyin letters)
        if (/[āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ]/.test(part) || /^[a-z\s]+$/i.test(part)) {
          if (!pinyin) pinyin = part.trim();
        }
        // Check if it's English (contains English words)
        else if (/[a-zA-Z]/.test(part) && part.length > 1) {
          if (!english) english = part.trim();
        }
      }

      // If no pinyin found on same line, check next line for pinyin
      if (!pinyin && i + 1 < lines.length) {
        const nextLine = lines[i + 1];
        if (/^[a-z\s]+$/i.test(nextLine) || /[āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ]/.test(nextLine)) {
          pinyin = nextLine.trim();
          i++; // Skip next line since we used it
        }
      }

      items.push({
        characters,
        pinyin,
        english,
      });
    }
  }

  return items;
}

/**
 * Format items based on user preferences
 */
export function formatItems(
  items: ParsedItem[],
  wantPinyin: boolean,
  wantEnglish: boolean,
  lessonId: string
) {
  return items.map((item, index) => {
    const pinyin = wantPinyin ? item.pinyin : '';
    const syllables = wantPinyin ? parsePinyinString(pinyin) : [];
    const type = syllables.length === 1 ? 'hanzi' : 'pinyin';

    return {
      id: `${lessonId}-${index}`,
      lessonId,
      type,
      pinyin,
      syllables,
      characters: item.characters,
      english: wantEnglish ? item.english : '',
    };
  });
}
