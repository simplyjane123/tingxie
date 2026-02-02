import React, { useState, useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Syllable } from '../../types';
import { stripTone, generateDistractors } from '../../utils/pinyin';
import { colors, spacing, radius, typography } from '../../constants/theme';

interface Props {
  syllables: Syllable[];
  onComplete: (correct: boolean) => void;
}

export default function PinyinBuilder({ syllables, onComplete }: Props) {
  const targetParts = useMemo(() => syllables.map(s => stripTone(s.pinyin)), [syllables]);
  const [placed, setPlaced] = useState<(string | null)[]>(Array(targetParts.length).fill(null));
  const [result, setResult] = useState<boolean | null>(null);

  // Generate choices: correct parts + distractors
  const choices = useMemo(() => {
    const parts = [...targetParts];
    const extras = generateDistractors(targetParts[0], 3);
    const all = [...parts, ...extras.slice(0, Math.max(2, 4 - parts.length))];
    return all.sort(() => Math.random() - 0.5);
  }, [targetParts]);

  const [usedChoices, setUsedChoices] = useState<Set<number>>(new Set());

  const handleChoiceTap = (choiceIdx: number) => {
    if (result !== null) return;

    const choice = choices[choiceIdx];
    const nextSlot = placed.indexOf(null);
    if (nextSlot === -1) return;

    const newPlaced = [...placed];
    newPlaced[nextSlot] = choice;
    setPlaced(newPlaced);
    setUsedChoices(new Set([...usedChoices, choiceIdx]));

    // Check if all slots filled
    if (newPlaced.every(p => p !== null)) {
      const isCorrect = newPlaced.every((p, i) => p === targetParts[i]);
      setResult(isCorrect);
      setTimeout(() => onComplete(isCorrect), 800);
    }
  };

  const handleSlotTap = (slotIdx: number) => {
    if (result !== null) return;
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
