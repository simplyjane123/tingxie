import { SpellingItem, ItemType } from '../types';
import { parsePinyinString } from './pinyin';

const CJK_RANGE = /[\u4e00-\u9fff]/;
const TONE_VOWELS = /[āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ]/;
const PINYIN_PATTERN = /[a-zA-Zāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜü]+/;

type LineType = 'chinese' | 'pinyin' | 'mixed' | 'noise';

function classifyLine(line: string): LineType {
  const hasChinese = CJK_RANGE.test(line);
  const hasPinyin = TONE_VOWELS.test(line) || /[a-zA-Z]{2,}/.test(line);

  if (hasChinese && hasPinyin) return 'mixed';
  if (hasChinese) return 'chinese';
  if (hasPinyin) return 'pinyin';
  return 'noise';
}

function cleanLine(line: string): string {
  // Remove leading numbers, dots, parentheses, whitespace
  return line
    .replace(/^\s*\d+[\.\)、\s]*/, '')
    .replace(/[()（）]/g, '')
    .trim();
}

function splitMixedLine(line: string): { chinese: string; pinyin: string } | null {
  // Find the boundary between CJK characters and Latin/pinyin text
  const match = line.match(/^([\u4e00-\u9fff\s]+)\s+(.+)$/);
  if (match) {
    return { chinese: match[1].trim(), pinyin: match[2].trim() };
  }
  // Try reverse order: pinyin then Chinese
  const matchReverse = line.match(/^([a-zA-Zāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜü\s]+)\s+([\u4e00-\u9fff]+)$/);
  if (matchReverse) {
    return { chinese: matchReverse[2].trim(), pinyin: matchReverse[1].trim() };
  }
  return null;
}

interface ParsedPair {
  characters: string;
  pinyin: string;
}

export function parseOcrText(fullText: string, lessonId: string): SpellingItem[] {
  const rawLines = fullText.split('\n').map(cleanLine).filter(Boolean);
  const classified = rawLines.map((line) => ({
    line,
    type: classifyLine(line),
  }));

  const pairs: ParsedPair[] = [];

  for (let i = 0; i < classified.length; i++) {
    const { line, type } = classified[i];

    if (type === 'noise') continue;

    if (type === 'mixed') {
      const split = splitMixedLine(line);
      if (split) {
        pairs.push(split);
      }
      continue;
    }

    if (type === 'chinese') {
      // Look ahead for a pinyin line
      if (i + 1 < classified.length && classified[i + 1].type === 'pinyin') {
        pairs.push({
          characters: line.replace(/\s/g, ''),
          pinyin: classified[i + 1].line,
        });
        i++; // Skip the pinyin line
      } else {
        // Chinese only - still add it, pinyin can be filled manually
        pairs.push({ characters: line.replace(/\s/g, ''), pinyin: '' });
      }
      continue;
    }

    if (type === 'pinyin') {
      // Standalone pinyin (pinyin-only item)
      pairs.push({ characters: '', pinyin: line });
      continue;
    }
  }

  // Convert pairs to SpellingItems
  return pairs.map((pair, index) => {
    const itemId = `${lessonId}-${index + 1}`;
    const hasChinese = pair.characters.length > 0;
    const type: ItemType = hasChinese ? 'hanzi' : 'pinyin';

    // Clean pinyin: normalize spaces
    const pinyinClean = pair.pinyin.replace(/\s+/g, ' ').trim();

    let syllables;
    try {
      syllables = pinyinClean ? parsePinyinString(pinyinClean) : [];
    } catch {
      syllables = [];
    }

    return {
      id: itemId,
      lessonId,
      type,
      pinyin: pinyinClean,
      syllables,
      characters: pair.characters || undefined,
    };
  });
}
