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
  school?: string;            // "Montfort Junior School"
  grade?: string;             // "Primary 4"
  primaryLevel?: number;      // 1-6 for Primary 1 through Primary 6
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
  customLessons: Lesson[];
  ocrApiKey: string;

  setLesson: (id: string) => void;
  setItemIndex: (i: number) => void;
  markWritingComplete: (itemId: string) => void;
  advancePinyinStage: (itemId: string) => void;
  recordError: (itemId: string, error: string) => void;
  toggleParentMode: () => void;
  resetProgress: (lessonId: string) => void;
  getItemProgress: (itemId: string) => WordProgress;
  addCustomLesson: (lesson: Lesson) => void;
  deleteCustomLesson: (lessonId: string) => void;
  setCustomLessons: (lessons: Lesson[]) => void;
  setOcrApiKey: (key: string) => void;
}
