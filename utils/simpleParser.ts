import { parsePinyinString } from './pinyin';

interface ParsedItem {
  characters: string;
  pinyin: string;
  english: string;
  lessonName?: string;
}

interface LessonGroup {
  lessonName: string;
  items: ParsedItem[];
}

/**
 * Detect lesson boundaries in OCR text
 * Matches: "听写 1", "听写1", "Ting Xie 1", "Lesson 1", etc.
 */
function detectLessons(lines: string[]): LessonGroup[] {
  const lessonGroups: LessonGroup[] = [];
  let currentLesson: LessonGroup | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Check if this line is a lesson header
    const lessonMatch = line.match(/(?:听写|ting\s*xie|lesson)\s*(\d+|[一二三四五六七八九十]+)/i);

    if (lessonMatch) {
      // Start a new lesson
      currentLesson = {
        lessonName: line,
        items: []
      };
      lessonGroups.push(currentLesson);
      continue;
    }

    // Skip common non-content lines
    if (/^\d+$/.test(line) || line.includes('日期') || line.length < 2) continue;

    // Check if line contains Chinese characters
    const hasChineseChars = /[\u4e00-\u9fa5]/.test(line);

    if (hasChineseChars) {
      const item = parseLineToItem(line, lines, i);
      if (item) {
        if (currentLesson) {
          currentLesson.items.push(item);
        } else {
          // No lesson detected yet, create a default one
          if (lessonGroups.length === 0) {
            currentLesson = {
              lessonName: 'Lesson 1',
              items: []
            };
            lessonGroups.push(currentLesson);
          }
          lessonGroups[lessonGroups.length - 1].items.push(item);
        }
      }
    }
  }

  return lessonGroups;
}

/**
 * Parse a single line into an item
 */
function parseLineToItem(line: string, allLines: string[], currentIndex: number): ParsedItem | null {
  // Extract Chinese characters
  const chineseMatch = line.match(/[\u4e00-\u9fa5]+/g);
  if (!chineseMatch) return null;

  const characters = chineseMatch.join('');
  let pinyin = '';
  let english = '';

  // Remove Chinese characters to get remaining text
  const remaining = line.replace(/[\u4e00-\u9fa5]/g, '').trim();

  // Split by common separators including |
  const parts = remaining.split(/[|\-—–:：\s]+/).filter(p => p.length > 0);

  for (const part of parts) {
    // Check if it's pinyin (contains tone marks or common pinyin letters)
    if (/[āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ]/.test(part) || /^[a-z\s]+$/i.test(part)) {
      if (!pinyin && !/^(the|a|an|to|is|are|and|or|of|in|on|at)$/i.test(part)) {
        pinyin = part.trim();
      }
    }
    // Check if it's English (contains English words)
    else if (/[a-zA-Z]/.test(part) && part.length > 1) {
      if (!english) english = part.trim();
    }
  }

  // If no pinyin found on same line, check next line
  if (!pinyin && currentIndex + 1 < allLines.length) {
    const nextLine = allLines[currentIndex + 1].trim();
    if (/^[a-z\s]+$/i.test(nextLine) || /[āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ]/.test(nextLine)) {
      pinyin = nextLine;
    }
  }

  return {
    characters,
    pinyin,
    english
  };
}

/**
 * Parse OCR text with lesson detection
 */
export function parseOcrWithLessons(ocrText: string): LessonGroup[] {
  const lines = ocrText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  return detectLessons(lines);
}

/**
 * Simple parser for OCR text (original, for backward compatibility)
 */
export function parseOcrSimple(ocrText: string): ParsedItem[] {
  const lessonGroups = parseOcrWithLessons(ocrText);

  // Flatten all items from all lessons
  const allItems: ParsedItem[] = [];
  for (const group of lessonGroups) {
    allItems.push(...group.items);
  }

  return allItems;
}

/**
 * Format items for a specific lesson based on user preferences
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

/**
 * Extract items for a specific lesson by name
 */
export function extractSingleLesson(
  ocrText: string,
  targetLesson: string
): ParsedItem[] {
  const lessonGroups = parseOcrWithLessons(ocrText);

  // Find the target lesson
  const target = lessonGroups.find(group =>
    group.lessonName.toLowerCase().includes(targetLesson.toLowerCase()) ||
    targetLesson.toLowerCase().includes(group.lessonName.toLowerCase())
  );

  return target ? target.items : [];
}
