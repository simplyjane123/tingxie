import { Platform } from 'react-native';

/**
 * Cross-platform speech utility.
 * Primary: Google Cloud TTS via /api/tts (accurate Chinese tones).
 * Fallback: Web Speech API on web, expo-speech on native.
 */

let webSpeechUnlocked = false;

// Unlock web speech synthesis on first user interaction
if (Platform.OS === 'web' && typeof window !== 'undefined') {
  const unlock = () => {
    if (!webSpeechUnlocked && window.speechSynthesis) {
      const utterance = new SpeechSynthesisUtterance('');
      utterance.volume = 0;
      window.speechSynthesis.speak(utterance);
      webSpeechUnlocked = true;
    }
    window.removeEventListener('click', unlock);
    window.removeEventListener('touchstart', unlock);
  };
  window.addEventListener('click', unlock);
  window.addEventListener('touchstart', unlock);
}

// Cache voices — they load asynchronously on many browsers/iOS
let cachedVoices: SpeechSynthesisVoice[] = [];

function refreshVoices() {
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    cachedVoices = window.speechSynthesis.getVoices();
  }
}

if (Platform.OS === 'web' && typeof window !== 'undefined' && window.speechSynthesis) {
  refreshVoices();
  window.speechSynthesis.onvoiceschanged = refreshVoices;
}

// Find the best Chinese female voice available on the browser
function getChineseVoice(): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !window.speechSynthesis) return null;
  refreshVoices(); // always refresh in case voices loaded late

  // Filter for Chinese voices (zh-CN, zh-TW, zh-HK, cmn, etc.)
  const chineseVoices = cachedVoices.filter((v) =>
    v.lang.startsWith('zh') || v.lang.startsWith('cmn')
  );
  if (chineseVoices.length === 0) return null;

  // Known male voice names to exclude
  const maleIndicators = ['kangkang', 'yunyang', 'yunxi', 'yunze', 'male', ' man'];

  // Known female voice names to prefer (ordered by quality)
  const femaleIndicators = [
    'ting-ting', 'meijia', 'siqi',  // iOS/macOS high quality
    'huihui', 'yaoyao', 'lili',     // Windows/other
    'xiaoyi', 'xiaoxiao', 'xiaochen', 'xiaohan', 'xiaomo',
    'xiaorui', 'xiaoxuan', 'xiaoyou', 'yunying',
    'female', 'woman',
  ];

  const nameLower = (v: SpeechSynthesisVoice) => v.name.toLowerCase();

  // First: find a known female voice
  const knownFemale = chineseVoices.find((v) =>
    femaleIndicators.some(f => nameLower(v).includes(f))
  );
  if (knownFemale) return knownFemale;

  // Second: find any Chinese voice that is NOT a known male voice
  const notMale = chineseVoices.find((v) =>
    !maleIndicators.some(m => nameLower(v).includes(m))
  );
  if (notMale) return notMale;

  // Fallback: any Chinese voice
  return chineseVoices[0];
}

interface SpeakOptions {
  language?: string;
  rate?: number;
  pitch?: number;
  onDone?: () => void;
  onError?: () => void;
}

/** Try Google Cloud TTS first. Returns true if audio played successfully. */
async function speakCloudTTS(text: string, onDone?: () => void, onError?: () => void): Promise<boolean> {
  try {
    const response = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });

    if (!response.ok) return false;

    const { audio } = await response.json();
    if (!audio) return false;

    const audioSrc = `data:audio/mp3;base64,${audio}`;
    const audioEl = new Audio(audioSrc);
    audioEl.onended = () => onDone?.();
    audioEl.onerror = () => onError?.();
    await audioEl.play();
    return true;
  } catch {
    return false;
  }
}

export function speak(text: string, options: SpeakOptions = {}) {
  // Longer sentences get a faster rate so they sound more natural
  const defaultRate = text.length > 3 ? 0.85 : 0.65;
  const {
    language = 'zh-CN',
    rate = defaultRate,
    pitch = 1.0,
    onDone,
    onError,
  } = options;

  if (Platform.OS === 'web') {
    let cloudSucceeded = false;

    // Start Web Speech API immediately (synchronous — preserves iOS user gesture context)
    speakWeb(text, {
      language, rate, pitch,
      onDone: () => { if (!cloudSucceeded) onDone?.(); },
      onError: () => { if (!cloudSucceeded) onError?.(); },
    });

    // In the background, try Cloud TTS for better quality.
    // If it succeeds, cancel Web Speech and play Cloud audio instead.
    speakCloudTTS(text, onDone, onError).then((success) => {
      if (success && typeof window !== 'undefined' && window.speechSynthesis) {
        cloudSucceeded = true;
        window.speechSynthesis.cancel();
      }
    });
  } else {
    speakNative(text, { language, rate, pitch, onDone, onError });
  }
}

function speakWeb(text: string, options: SpeakOptions) {
  if (typeof window === 'undefined' || !window.speechSynthesis) {
    options.onError?.();
    return;
  }

  // Cancel any ongoing speech
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = options.language || 'zh-CN';
  utterance.rate = options.rate || 0.65;
  utterance.pitch = options.pitch || 1.0;

  const voice = getChineseVoice();
  if (voice) {
    utterance.voice = voice;
    utterance.lang = voice.lang; // match lang to the selected voice exactly
  } else {
    // No Chinese voice available — lower volume so Cloud TTS can take over
    utterance.volume = 0.15;
  }

  utterance.onend = () => options.onDone?.();
  utterance.onerror = () => options.onError?.();

  window.speechSynthesis.speak(utterance);
}

async function speakNative(text: string, options: SpeakOptions) {
  try {
    const Speech = await import('expo-speech');
    Speech.speak(text, {
      language: options.language || 'zh-CN',
      rate: options.rate || 0.65,
      pitch: options.pitch || 1.0,
      onDone: options.onDone,
      onError: options.onError,
    });
  } catch {
    options.onError?.();
  }
}

/** Convenience for Chinese speech */
export function speakChinese(text: string, rate = 0.65, onDone?: () => void) {
  speak(text, { language: 'zh-CN', rate, onDone });
}

/** Convenience for Chinese praise with higher pitch */
export function speakPraise(text: string, onDone?: () => void) {
  speak(text, { language: 'zh-CN', rate: 0.75, pitch: 1.0, onDone });
}
