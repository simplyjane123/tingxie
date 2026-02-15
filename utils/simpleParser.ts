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
 * Matches: "听写 1", "听写1", "听写(3)", "听写（三）", "听写(三)《标题》", etc.
 */
function detectLessons(lines: string[]): LessonGroup[] {
  const lessonGroups: LessonGroup[] = [];
  let currentLesson: LessonGroup | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Check if this line is a lesson header
    // Matches: 听写1, 听写 1, 听写(3), 听写（三）, 听写(三)《标题》, etc.
    const lessonMatch = line.match(/(?:听写|ting\s*xie|lesson)\s*[（(]?\s*(\d+|[一二三四五六七八九十]+)\s*[）)]?/i);

    // Debug logging
    if (line.includes('听写') || line.includes('ting') || line.toLowerCase().includes('lesson')) {
      console.log(`Checking line ${i}: "${line}"`);
      console.log(`Match result:`, lessonMatch);
    }

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

    if (hasChineseChars && currentLesson) {
      // Only extract items after a lesson header has been detected
      const item = parseLineToItem(line, lines, i);
      if (item) {
        currentLesson.items.push(item);
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
 * Simple parser for OCR text
 * Returns empty array if no lesson headers are detected
 */
export function parseOcrSimple(ocrText: string): ParsedItem[] {
  const lessonGroups = parseOcrWithLessons(ocrText);

  // Only return items if we detected explicit lesson headers
  // If "Lesson 1" was auto-created (no headers found), don't return anything
  if (lessonGroups.length === 1 && lessonGroups[0].lessonName === 'Lesson 1') {
    // Check if this was auto-created by looking at the OCR text
    const hasExplicitHeader = /(?:听写|ting\s*xie|lesson)\s*[（(]?\s*(\d+|[一二三四五六七八九十]+)\s*[）)]?/i.test(ocrText);
    if (!hasExplicitHeader) {
      return []; // No lesson headers found, return empty
    }
  }

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

/**
 * Format multiple lessons with proper lesson IDs
 */
export function formatMultipleLessons(
  lessonGroups: LessonGroup[],
  wantPinyin: boolean,
  wantEnglish: boolean,
  baseLessonId: string
) {
  return lessonGroups.map((group, lessonIndex) => {
    const lessonId = `${baseLessonId}-${lessonIndex}`;
    const items = formatItems(group.items, wantPinyin, wantEnglish, lessonId);

    return {
      lessonId,
      lessonName: group.lessonName,
      items,
    };
  });
}

export type { LessonGroup, ParsedItem };
