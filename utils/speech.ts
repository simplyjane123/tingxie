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

// Find the best Chinese female voice available on the browser
function getChineseVoice(): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !window.speechSynthesis) return null;
  const voices = window.speechSynthesis.getVoices();

  // Filter for Chinese voices
  const chineseVoices = voices.filter((v) => v.lang.startsWith('zh'));
  if (chineseVoices.length === 0) return null;

  // Known male voice names to exclude
  const maleIndicators = ['kangkang', 'yunyang', 'yunxi', 'yunze', 'male', ' man'];

  // Known female voice names to prefer
  const femaleIndicators = [
    'huihui', 'ting-ting', 'yaoyao', 'lili', 'xiaoyi', 'xiaoxiao',
    'xiaochen', 'xiaohan', 'xiaomo', 'xiaorui', 'xiaoxuan', 'xiaoyou',
    'meijia', 'siqi', 'yunying', 'female', 'woman',
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
  const {
    language = 'zh-CN',
    rate = 0.65,
    pitch = 1.0,
    onDone,
    onError,
  } = options;

  if (Platform.OS === 'web') {
    // Try Cloud TTS first for accurate tones, fall back to Web Speech API
    speakCloudTTS(text, onDone, onError).then((success) => {
      if (!success) {
        speakWeb(text, { language, rate, pitch, onDone, onError });
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
