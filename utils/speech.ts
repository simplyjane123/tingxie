import { Platform } from 'react-native';

/**
 * Cross-platform speech utility.
 * Uses Web Speech API directly on web for reliable Chinese TTS.
 * Uses expo-speech on native platforms.
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

// Find the best Chinese voice available on the browser
function getChineseVoice(): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !window.speechSynthesis) return null;
  const voices = window.speechSynthesis.getVoices();
  // Prefer zh-CN, then zh-TW, then any zh
  return (
    voices.find((v) => v.lang === 'zh-CN') ||
    voices.find((v) => v.lang.startsWith('zh')) ||
    null
  );
}

interface SpeakOptions {
  language?: string;
  rate?: number;
  pitch?: number;
  onDone?: () => void;
  onError?: () => void;
}

export function speak(text: string, options: SpeakOptions = {}) {
  const {
    language = 'zh-CN',
    rate = 0.8,
    pitch = 1.0,
    onDone,
    onError,
  } = options;

  if (Platform.OS === 'web') {
    speakWeb(text, { language, rate, pitch, onDone, onError });
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
  utterance.rate = options.rate || 0.8;
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
      rate: options.rate || 0.8,
      pitch: options.pitch || 1.0,
      onDone: options.onDone,
      onError: options.onError,
    });
  } catch {
    options.onError?.();
  }
}

/** Convenience for Chinese speech */
export function speakChinese(text: string, rate = 0.8, onDone?: () => void) {
  speak(text, { language: 'zh-CN', rate, onDone });
}

/** Convenience for Chinese praise with higher pitch */
export function speakPraise(text: string, onDone?: () => void) {
  speak(text, { language: 'zh-CN', rate: 0.9, pitch: 1.1, onDone });
}
