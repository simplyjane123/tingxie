import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { colors, spacing, radius } from '../../constants/theme';

const LEVELS = [
  { level: 1, label: 'P1', subtitle: 'Primary 1', icon: '⭐' },
  { level: 2, label: 'P2', subtitle: 'Primary 2', icon: '⭐⭐' },
  { level: 3, label: 'P3', subtitle: 'Primary 3', icon: '🌟' },
  { level: 4, label: 'P4', subtitle: 'Primary 4', icon: '🌟🌟' },
  { level: 5, label: 'P5', subtitle: 'Primary 5', icon: '🏆' },
  { level: 6, label: 'P6', subtitle: 'Primary 6', icon: '🏆🏆' },
];

export default function NewListScreen() {
  const [selectedLevel, setSelectedLevel] = useState<number | null>(null);

  const handleNext = () => {
    if (selectedLevel == null) return;
    router.push({
      pathname: '/upload/method',
      params: { primaryLevel: String(selectedLevel) },
    });
  };

  return (
    <SafeAreaView style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
          <Text style={styles.backText}>‹ Back</Text>
        </Pressable>
        <View style={styles.stepIndicator}>
          <View style={[styles.stepDot, styles.stepDotActive]} />
          <View style={styles.stepLine} />
          <View style={styles.stepDot} />
          <View style={styles.stepLine} />
          <View style={styles.stepDot} />
        </View>
        <Text style={styles.stepLabel}>Step 1 of 3</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>New Spelling List</Text>
        <Text style={styles.subtitle}>Select the Primary level for this list</Text>

        {/* Level Grid */}
        <View style={styles.levelGrid}>
          {LEVELS.map(({ level, label, subtitle, icon }) => {
            const isSelected = selectedLevel === level;
            return (
              <Pressable
                key={level}
                style={({ pressed }) => [
                  styles.levelCard,
                  isSelected && styles.levelCardSelected,
                  pressed && !isSelected && { opacity: 0.75 },
                ]}
                onPress={() => setSelectedLevel(level)}
              >
                <Text style={styles.levelIcon}>{icon}</Text>
                <Text style={[styles.levelLabel, isSelected && styles.levelLabelSelected]}>
                  {label}
                </Text>
                <Text style={[styles.levelSub, isSelected && styles.levelSubSelected]}>
                  {subtitle}
                </Text>
                {isSelected && <View style={styles.checkmark}><Text style={styles.checkmarkText}>✓</Text></View>}
              </Pressable>
            );
          })}
        </View>

        {selectedLevel != null && (
          <View style={styles.selectedInfo}>
            <Text style={styles.selectedInfoText}>
              Primary {selectedLevel} selected · {selectedLevel >= 3 ? 'Unguided dictation unlocked' : 'Guided writing mode'}
            </Text>
          </View>
        )}
      </View>

      {/* Next Button */}
      <View style={styles.footer}>
        <Pressable
          style={[styles.nextBtn, selectedLevel == null && styles.nextBtnDisabled]}
          onPress={handleNext}
          disabled={selectedLevel == null}
        >
          <Text style={styles.nextBtnText}>Next →</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  backBtn: {
    alignSelf: 'flex-start',
  },
  backText: {
    fontSize: 17,
    color: colors.primary,
    fontWeight: '600',
  },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: 0,
  },
  stepDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.border,
  },
  stepDotActive: {
    backgroundColor: colors.primary,
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  stepLine: {
    width: 32,
    height: 2,
    backgroundColor: colors.border,
  },
  stepLabel: {
    fontSize: 12,
    color: colors.textLight,
    textAlign: 'center',
    fontWeight: '500',
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    gap: spacing.lg,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: colors.textLight,
    textAlign: 'center',
    marginTop: -spacing.sm,
  },
  levelGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    justifyContent: 'center',
  },
  levelCard: {
    width: '44%',
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    gap: spacing.xs,
    borderWidth: 2,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
    position: 'relative',
  },
  levelCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '0D',
  },
  levelIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  levelLabel: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
  },
  levelLabelSelected: {
    color: colors.primary,
  },
  levelSub: {
    fontSize: 13,
    color: colors.textLight,
    fontWeight: '500',
  },
  levelSubSelected: {
    color: colors.primary,
  },
  checkmark: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmarkText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '800',
  },
  selectedInfo: {
    backgroundColor: colors.primary + '15',
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
  },
  selectedInfoText: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '600',
    textAlign: 'center',
  },
  footer: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.lg,
    paddingTop: spacing.sm,
  },
  nextBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  nextBtnDisabled: {
    backgroundColor: colors.border,
    shadowOpacity: 0,
    elevation: 0,
  },
  nextBtnText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
