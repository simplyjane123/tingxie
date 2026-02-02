export type ItemType = 'pinyin' | 'hanzi';

export interface Syllable {
  pinyin: string;       // with tone mark e.g. "wǒ"
  tone: 0 | 1 | 2 | 3 | 4;
  initial: string;      // e.g. "w"
  final: string;        // e.g. "o"
}

export interface SpellingItem {
  id: string;
  lessonId: string;
  type: ItemType;
  pinyin: string;             // full pinyin string e.g. "yǔ yī"
  syllables: Syllable[];
  characters?: string;        // Chinese characters e.g. "雨衣"
  english?: string;
}

export interface Lesson {
  id: string;
  label: string;              // "听写 1"
  lessonName: string;         // "第一课"
  order: number;
  date: string;               // "1月30日"
  items: SpellingItem[];
}

export interface WordProgress {
  writingComplete: boolean;
  pinyinStage: 0 | 1 | 2 | 3 | 4;
  attempts: number;
  errors: string[];
}

export interface AppState {
  currentLessonId: string | null;
  currentItemIndex: number;
  progress: Record<string, WordProgress>;
  isParentMode: boolean;

  setLesson: (id: string) => void;
  setItemIndex: (i: number) => void;
  markWritingComplete: (itemId: string) => void;
  advancePinyinStage: (itemId: string) => void;
  recordError: (itemId: string, error: string) => void;
  toggleParentMode: () => void;
  resetProgress: (lessonId: string) => void;
  getItemProgress: (itemId: string) => WordProgress;
}
