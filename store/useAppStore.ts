import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, WordProgress } from '../types';
import { fetchProgress, saveProgress } from '../lib/progressApi';

const defaultProgress: WordProgress = {
  writingComplete: false,
  pinyinStage: 0,
  attempts: 0,
  errors: [],
};

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      currentLessonId: null,
      currentItemIndex: 0,
      progress: {},
      isParentMode: false,
      customLessons: [],
      ocrApiKey: '',

      setLesson: (id) => set({ currentLessonId: id, currentItemIndex: 0 }),

      setItemIndex: (i) => set({ currentItemIndex: i }),

      markWritingComplete: (itemId) =>
        set((state) => ({
          progress: {
            ...state.progress,
            [itemId]: {
              ...(state.progress[itemId] ?? defaultProgress),
              writingComplete: true,
            },
          },
        })),

      advancePinyinStage: (itemId) =>
        set((state) => {
          const current = state.progress[itemId] ?? defaultProgress;
          const nextStage = Math.min(current.pinyinStage + 1, 4) as 0 | 1 | 2 | 3 | 4;
          return {
            progress: {
              ...state.progress,
              [itemId]: { ...current, pinyinStage: nextStage },
            },
          };
        }),

      recordError: (itemId, error) =>
        set((state) => {
          const current = state.progress[itemId] ?? defaultProgress;
          return {
            progress: {
              ...state.progress,
              [itemId]: {
                ...current,
                attempts: current.attempts + 1,
                errors: [...current.errors, error],
              },
            },
          };
        }),

      toggleParentMode: () => set((state) => ({ isParentMode: !state.isParentMode })),

      resetProgress: (lessonId) =>
        set((state) => {
          const newProgress = { ...state.progress };
          for (const key of Object.keys(newProgress)) {
            if (key.startsWith(lessonId)) {
              delete newProgress[key];
            }
          }
          return { progress: newProgress };
        }),

      getItemProgress: (itemId) => {
        return get().progress[itemId] ?? defaultProgress;
      },

      addCustomLesson: (lesson) =>
        set((state) => ({
          customLessons: [...state.customLessons, lesson],
        })),

      deleteCustomLesson: (lessonId) =>
        set((state) => ({
          customLessons: state.customLessons.filter((l) => l.id !== lessonId),
        })),

      setCustomLessons: (lessons) => set({ customLessons: lessons }),

      setOcrApiKey: (key) => set({ ocrApiKey: key }),

      initFromCloud: async () => {
        const saved = await fetchProgress();
        if (saved) {
          set({
            currentLessonId: saved.currentLessonId ?? null,
            currentItemIndex: saved.currentItemIndex ?? 0,
            progress: saved.progress ?? {},
          });
        }
      },
    }),
    {
      name: 'xiao-ting-xie-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        progress: state.progress,
        currentLessonId: state.currentLessonId,
        currentItemIndex: state.currentItemIndex,
        ocrApiKey: state.ocrApiKey,
      }),
    },
  ),
);

// Auto-sync progress to Supabase whenever it changes (debounced 1.5s)
let syncTimeout: ReturnType<typeof setTimeout> | null = null;
useAppStore.subscribe((state, prev) => {
  if (
    state.progress === prev.progress &&
    state.currentLessonId === prev.currentLessonId &&
    state.currentItemIndex === prev.currentItemIndex
  ) return;

  if (syncTimeout) clearTimeout(syncTimeout);
  syncTimeout = setTimeout(() => {
    saveProgress({
      currentLessonId: state.currentLessonId,
      currentItemIndex: state.currentItemIndex,
      progress: state.progress,
    });
  }, 1500);
});
