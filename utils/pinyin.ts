import { Syllable } from '../types';

const TONE_MAP: Record<string, [string, number]> = {
  'ā': ['a', 1], 'á': ['a', 2], 'ǎ': ['a', 3], 'à': ['a', 4],
  'ē': ['e', 1], 'é': ['e', 2], 'ě': ['e', 3], 'è': ['e', 4],
  'ī': ['i', 1], 'í': ['i', 2], 'ǐ': ['i', 3], 'ì': ['i', 4],
  'ō': ['o', 1], 'ó': ['o', 2], 'ǒ': ['o', 3], 'ò': ['o', 4],
  'ū': ['u', 1], 'ú': ['u', 2], 'ǔ': ['u', 3], 'ù': ['u', 4],
  'ǖ': ['ü', 1], 'ǘ': ['ü', 2], 'ǚ': ['ü', 3], 'ǜ': ['ü', 4],
};

const INITIALS = [
  'zh', 'ch', 'sh',
  'b', 'p', 'm', 'f',
  'd', 't', 'n', 'l',
  'g', 'k', 'h',
  'j', 'q', 'x',
  'z', 'c', 's',
  'r', 'y', 'w',
];

export function stripTone(s: string): string {
  let result = '';
  for (const ch of s) {
    if (TONE_MAP[ch]) {
      result += TONE_MAP[ch][0];
    } else {
      result += ch;
    }
  }
  return result;
}

export function getTone(s: string): 0 | 1 | 2 | 3 | 4 {
  for (const ch of s) {
    if (TONE_MAP[ch]) {
      return TONE_MAP[ch][1] as 1 | 2 | 3 | 4;
    }
  }
  return 0;
}

export function getInitial(bare: string): string {
  for (const init of INITIALS) {
    if (bare.startsWith(init)) {
      return init;
    }
  }
  return '';
}

export function getFinal(bare: string, initial: string): string {
  return bare.slice(initial.length);
}

export function decomposeSyllable(pinyin: string): Syllable {
  const tone = getTone(pinyin);
  const bare = stripTone(pinyin);
  const initial = getInitial(bare);
  const final = getFinal(bare, initial);
  return { pinyin, tone, initial, final };
}

export function parsePinyinString(pinyinStr: string): Syllable[] {
  return pinyinStr.trim().split(/\s+/).map(decomposeSyllable);
}

// Generate distractor pinyin syllables for quizzes
export function generateDistractors(correct: string, count: number): string[] {
  const allInitials = ['b', 'p', 'm', 'f', 'd', 't', 'n', 'l', 'g', 'k', 'h', 'j', 'q', 'x', 'zh', 'ch', 'sh', 'r', 'z', 'c', 's'];
  const allFinals = ['a', 'o', 'e', 'i', 'u', 'ü', 'ai', 'ei', 'ao', 'ou', 'an', 'en', 'ang', 'eng', 'ong', 'ia', 'ie', 'iu', 'ian', 'in', 'iang', 'ing', 'iong', 'ua', 'uo', 'uai', 'ui', 'uan', 'un', 'uang'];

  const bare = stripTone(correct);
  const initial = getInitial(bare);
  const final = getFinal(bare, initial);
  const distractors: string[] = [];

  // Strategy: swap initial or final to create plausible wrong answers
  const shuffled = [...allInitials].sort(() => Math.random() - 0.5);
  for (const init of shuffled) {
    if (init !== initial && distractors.length < count) {
      const candidate = init + final;
      if (candidate !== bare) {
        distractors.push(candidate);
      }
    }
  }

  // If not enough, swap finals
  if (distractors.length < count) {
    const shuffledFinals = [...allFinals].sort(() => Math.random() - 0.5);
    for (const fin of shuffledFinals) {
      if (fin !== final && distractors.length < count) {
        const candidate = initial + fin;
        if (candidate !== bare && !distractors.includes(candidate)) {
          distractors.push(candidate);
        }
      }
    }
  }

  return distractors.slice(0, count);
}

// Get tone mark character for a given vowel and tone number
export function addToneMark(vowel: string, tone: 1 | 2 | 3 | 4): string {
  const marks: Record<string, string[]> = {
    'a': ['ā', 'á', 'ǎ', 'à'],
    'e': ['ē', 'é', 'ě', 'è'],
    'i': ['ī', 'í', 'ǐ', 'ì'],
    'o': ['ō', 'ó', 'ǒ', 'ò'],
    'u': ['ū', 'ú', 'ǔ', 'ù'],
    'ü': ['ǖ', 'ǘ', 'ǚ', 'ǜ'],
  };
  return marks[vowel]?.[tone - 1] ?? vowel;
}

// Apply a tone to a bare (toneless) pinyin syllable
// e.g. applyTone('pa', 1) → 'pā', applyTone('guo', 3) → 'guǒ'
export function applyTone(bare: string, tone: 1 | 2 | 3 | 4): string {
  const vowels = 'aeiouü';
  // Rule: a or e always takes the tone mark
  for (const v of ['a', 'e']) {
    const idx = bare.indexOf(v);
    if (idx !== -1) {
      return bare.slice(0, idx) + addToneMark(v, tone) + bare.slice(idx + 1);
    }
  }
  // Rule: in 'ou', the mark goes on 'o'
  if (bare.includes('ou')) {
    const idx = bare.indexOf('o');
    return bare.slice(0, idx) + addToneMark('o', tone) + bare.slice(idx + 1);
  }
  // Otherwise: mark goes on the last vowel
  for (let i = bare.length - 1; i >= 0; i--) {
    if (vowels.includes(bare[i])) {
      return bare.slice(0, i) + addToneMark(bare[i], tone) + bare.slice(i + 1);
    }
  }
  return bare;
}
