import { Lesson, SpellingItem } from '../types';
import { parsePinyinString } from './pinyin';

const APP_BASE_URL = 'https://xiao-ting-xie.vercel.app';

// Compact payload format to keep URLs short
interface SharePayload {
  v: 1;
  l: string;       // label
  n: string;       // lessonName
  d: string;       // date
  s?: string;      // school
  g?: string;      // grade
  items: ShareItem[];
}

interface ShareItem {
  t: 'p' | 'h';   // type: pinyin or hanzi
  py: string;      // pinyin
  ch?: string;     // characters
  en?: string;     // english
}

function lessonToPayload(lesson: Lesson): SharePayload {
  return {
    v: 1,
    l: lesson.label,
    n: lesson.lessonName,
    d: lesson.date,
    ...(lesson.school ? { s: lesson.school } : {}),
    ...(lesson.grade ? { g: lesson.grade } : {}),
    items: lesson.items.map((item) => ({
      t: item.type === 'pinyin' ? 'p' as const : 'h' as const,
      py: item.pinyin,
      ...(item.characters ? { ch: item.characters } : {}),
      ...(item.english ? { en: item.english } : {}),
    })),
  };
}

function payloadToLesson(payload: SharePayload): Lesson {
  const id = `custom-${Date.now()}`;
  const items: SpellingItem[] = payload.items.map((item, index) => {
    const pinyinStr = item.py.trim();
    let syllables;
    try {
      syllables = parsePinyinString(pinyinStr);
    } catch {
      syllables = [];
    }
    return {
      id: `${id}-${index + 1}`,
      lessonId: id,
      type: item.t === 'p' ? 'pinyin' : 'hanzi',
      pinyin: pinyinStr,
      syllables,
      ...(item.ch ? { characters: item.ch } : {}),
      ...(item.en ? { english: item.en } : {}),
    };
  });

  return {
    id,
    label: payload.l,
    lessonName: payload.n,
    order: 0,
    date: payload.d,
    items,
    ...(payload.s ? { school: payload.s } : {}),
    ...(payload.g ? { grade: payload.g } : {}),
  };
}

export function encodeLessonToUrl(lesson: Lesson): string {
  const payload = lessonToPayload(lesson);
  const json = JSON.stringify(payload);

  // Encode to UTF-8 bytes, then to base64
  const bytes = new TextEncoder().encode(json);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = btoa(binary);

  // Make URL-safe: replace + with -, / with _, remove trailing =
  const urlSafe = base64
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  return `${APP_BASE_URL}/share?data=${urlSafe}`;
}

export function decodeLessonFromUrl(data: string): Lesson {
  try {
    // Restore standard base64 from URL-safe variant
    let base64 = data.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4 !== 0) {
      base64 += '=';
    }

    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const json = new TextDecoder().decode(bytes);
    const payload: SharePayload = JSON.parse(json);

    if (payload.v !== 1) {
      throw new Error('Unsupported share format version');
    }
    if (!payload.l || !payload.n || !Array.isArray(payload.items) || payload.items.length === 0) {
      throw new Error('Invalid lesson data');
    }

    return payloadToLesson(payload);
  } catch (e: any) {
    if (e.message === 'Unsupported share format version' || e.message === 'Invalid lesson data') {
      throw e;
    }
    throw new Error('Could not read the shared lesson. The link may be damaged or incomplete.');
  }
}
