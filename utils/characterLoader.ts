import AsyncStorage from '@react-native-async-storage/async-storage';

const CDN_BASE = 'https://cdn.jsdelivr.net/npm/hanzi-writer-data@2.0/';
const CACHE_PREFIX = 'chardata:';

export interface CharacterData {
  strokes: string[];
  medians: number[][][];
}

// Load character stroke data from CDN, with AsyncStorage cache for offline
export async function loadCharacterData(char: string): Promise<CharacterData | null> {
  // Check cache first
  try {
    const cached = await AsyncStorage.getItem(CACHE_PREFIX + char);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch {}

  // Fetch from CDN
  try {
    const resp = await fetch(`${CDN_BASE}${char}.json`);
    if (!resp.ok) return null;
    const data = await resp.json();

    // Cache for offline use
    try {
      await AsyncStorage.setItem(CACHE_PREFIX + char, JSON.stringify(data));
    } catch {}

    return data;
  } catch {
    return null;
  }
}

// Preload all characters for a lesson
export async function preloadLessonCharacters(characters: string[]): Promise<void> {
  const unique = [...new Set(characters)];
  await Promise.all(unique.map(loadCharacterData));
}
