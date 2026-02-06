import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import * as Speech from 'expo-speech';
import { Syllable } from '../../types';
import { stripTone, generateDistractors } from '../../utils/pinyin';
import { colors, spacing, radius } from '../../constants/theme';

interface Props {
  syllables: Syllable[];
  onComplete: (correct: boolean) => void;
  autoPlayWord?: boolean;
  wordText?: string; // The full word to speak on success
  characters?: string; // Chinese characters for each syllable (e.g., "女儿")
}

const speakChinese = (text: string, rate: number = 0.8) => {
  Speech.speak(text, {
    language: 'zh-CN',
    rate,
  });
};

export default function PinyinBuilder({ syllables, onComplete, autoPlayWord = false, wordText, characters }: Props) {
  const targetParts = useMemo(() => syllables.map(s => stripTone(s.pinyin)), [syllables]);
  const [placed, setPlaced] = useState<(string | null)[]>(Array(targetParts.length).fill(null));
  const [result, setResult] = useState<boolean | null>(null);

  // Auto-play the word when component mounts
  useEffect(() => {
    if (autoPlayWord && wordText) {
      speakChinese(wordText);
    }
  }, [autoPlayWord, wordText]);

  // Generate choices: correct parts + distractors
  const choices = useMemo(() => {
    const parts = [...targetParts];
    const extras = generateDistractors(targetParts[0], 3);
    const all = [...parts, ...extras.slice(0, Math.max(2, 4 - parts.length))];
    return all.sort(() => Math.random() - 0.5);
  }, [targetParts]);

  const [usedChoices, setUsedChoices] = useState<Set<number>>(new Set());

  const handleChoiceTap = (choiceIdx: number) => {
    // Only block if result is true (correct and locked)
    if (result === true) return;

    const choice = choices[choiceIdx];
    const nextSlot = placed.indexOf(null);
    if (nextSlot === -1) return;

    const newPlaced = [...placed];
    newPlaced[nextSlot] = choice;
    setPlaced(newPlaced);
    setUsedChoices(new Set([...usedChoices, choiceIdx]));

    // Speak the syllable with correct tone using Chinese character
    // Find which syllable index matches this choice
    const syllableIdx = targetParts.indexOf(choice);
    if (syllableIdx !== -1 && characters && characters[syllableIdx]) {
      // Speak the actual Chinese character (e.g., "女" for "nǚ") - much better TTS
      speakChinese(characters[syllableIdx]);
    } else {
      // Distractor or no character - speak the pinyin
      const matchingSyllable = syllables.find(s => stripTone(s.pinyin) === choice);
      speakChinese(matchingSyllable?.pinyin || choice);
    }

    // Check if all slots filled
    if (newPlaced.every(p => p !== null)) {
      const isCorrect = newPlaced.every((p, i) => p === targetParts[i]);
      setResult(isCorrect);

      setTimeout(() => {
        if (isCorrect && wordText) {
          // Speak the full word on success
          speakChinese(wordText);
          setTimeout(() => onComplete(true), 600);
        } else if (!isCorrect) {
          // Speak error sound - but don't call onComplete, let child retry
          speakChinese('踏', 0.9);
        }
      }, 400);
    }
  };

  const handleSlotTap = (slotIdx: number) => {
    // Allow tapping when result is false (wrong) to retry
    if (result === true) return;
    if (placed[slotIdx] === null) return;

    // Find which choice index was used
    const val = placed[slotIdx];
    const choiceIdx = choices.findIndex((c, i) => c === val && usedChoices.has(i));

    const newPlaced = [...placed];
    newPlaced[slotIdx] = null;
    setPlaced(newPlaced);

    const newUsed = new Set(usedChoices);
    if (choiceIdx >= 0) newUsed.delete(choiceIdx);
    setUsedChoices(newUsed);

    // Reset result so child can try again
    if (result === false) {
      setResult(null);
    }
  };

  return (
    <View style={styles.container}>
      {/* Slots */}
      <View style={styles.slotsRow}>
        {placed.map((val, i) => (
          <Pressable
            key={i}
            onPress={() => handleSlotTap(i)}
            style={[
              styles.slot,
              val !== null && result === true && { borderColor: colors.correct },
              val !== null && result === false && { borderColor: colors.incorrect },
            ]}
          >
            <Text style={styles.slotText}>{val ?? ''}</Text>
          </Pressable>
        ))}
      </View>

      {/* Choices */}
      <View style={styles.choicesRow}>
        {choices.map((choice, i) => (
          <Pressable
            key={i}
            onPress={() => handleChoiceTap(i)}
            disabled={usedChoices.has(i)}
            style={[
              styles.choice,
              usedChoices.has(i) && styles.choiceUsed,
            ]}
          >
            <Text style={[
              styles.choiceText,
              usedChoices.has(i) && { color: colors.textMuted },
            ]}>
              {choice}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xl,
    alignItems: 'center',
  },
  slotsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  slot: {
    minWidth: 80,
    height: 56,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
  },
  slotText: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
  },
  choicesRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  choice: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    minWidth: 72,
    alignItems: 'center',
  },
  choiceUsed: {
    backgroundColor: colors.border,
  },
  choiceText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
