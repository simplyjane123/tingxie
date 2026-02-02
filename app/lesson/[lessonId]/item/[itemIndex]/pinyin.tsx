import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import ScreenWrapper from '../../../../../components/common/ScreenWrapper';
import PinyinDisplay from '../../../../../components/pinyin/PinyinDisplay';
import PinyinBuilder from '../../../../../components/pinyin/PinyinBuilder';
import ToneSelector from '../../../../../components/pinyin/ToneSelector';
import ToneCurve from '../../../../../components/pinyin/ToneCurve';
import SpeakButton from '../../../../../components/audio/SpeakButton';
import BigButton from '../../../../../components/common/BigButton';
import ProgressDots from '../../../../../components/common/ProgressDots';
import CelebrationRoll from '../../../../../components/feedback/CelebrationRoll';
import LocalCorrection from '../../../../../components/feedback/LocalCorrection';
import { getLessonById } from '../../../../../data/lessons';
import { useAppStore } from '../../../../../store/useAppStore';
import { colors, spacing, typography, toneColor } from '../../../../../constants/theme';

export default function PinyinScreen() {
  const { lessonId, itemIndex } = useLocalSearchParams<{ lessonId: string; itemIndex: string }>();
  const lesson = getLessonById(lessonId ?? '');
  const idx = parseInt(itemIndex ?? '0', 10);
  const item = lesson?.items[idx];

  const progress = useAppStore((s) => item ? s.progress[item.id] : undefined);
  const startStage = Math.min((progress?.pinyinStage ?? 0) + 1, 4);
  const [stage, setStage] = useState(startStage);
  const [showCelebration, setShowCelebration] = useState(false);

  // Stage 3 state
  const [currentSyllableIdx, setCurrentSyllableIdx] = useState(0);
  const [selectedTone, setSelectedTone] = useState<number | null>(null);
  const [toneResult, setToneResult] = useState<boolean | null>(null);

  // Stage 4 state
  const [stage4Step, setStage4Step] = useState<'spelling' | 'tones'>('spelling');
  const [stage4ToneIdx, setStage4ToneIdx] = useState(0);
  const [stage4SelectedTone, setStage4SelectedTone] = useState<number | null>(null);
  const [stage4ToneResult, setStage4ToneResult] = useState<boolean | null>(null);

  if (!item) {
    return (
      <ScreenWrapper>
        <Text style={styles.errorText}>找不到词语</Text>
      </ScreenWrapper>
    );
  }

  const syllables = item.syllables;

  const advanceStage = () => {
    useAppStore.getState().advancePinyinStage(item.id);
    setShowCelebration(true);

    setTimeout(() => {
      setShowCelebration(false);
      if (stage < 4) {
        setStage(stage + 1);
        // Reset sub-state
        setCurrentSyllableIdx(0);
        setSelectedTone(null);
        setToneResult(null);
        setStage4Step('spelling');
        setStage4ToneIdx(0);
        setStage4SelectedTone(null);
        setStage4ToneResult(null);
      } else {
        // All stages complete
        router.back();
      }
    }, 1000);
  };

  const handleToneSelect = (tone: 1 | 2 | 3 | 4) => {
    if (toneResult !== null) return;
    setSelectedTone(tone);
    const correct = syllables[currentSyllableIdx].tone === tone;
    setToneResult(correct);

    if (!correct) {
      useAppStore.getState().recordError(item.id, `tone:${syllables[currentSyllableIdx].pinyin}:expected${syllables[currentSyllableIdx].tone}:got${tone}`);
    }

    setTimeout(() => {
      if (correct) {
        if (currentSyllableIdx + 1 < syllables.length) {
          setCurrentSyllableIdx(currentSyllableIdx + 1);
          setSelectedTone(null);
          setToneResult(null);
        } else {
          advanceStage();
        }
      } else {
        setSelectedTone(null);
        setToneResult(null);
      }
    }, 800);
  };

  const handleStage4ToneSelect = (tone: 1 | 2 | 3 | 4) => {
    if (stage4ToneResult !== null) return;
    setStage4SelectedTone(tone);
    const correct = syllables[stage4ToneIdx].tone === tone;
    setStage4ToneResult(correct);

    if (!correct) {
      useAppStore.getState().recordError(item.id, `s4tone:${syllables[stage4ToneIdx].pinyin}:expected${syllables[stage4ToneIdx].tone}:got${tone}`);
    }

    setTimeout(() => {
      if (correct) {
        if (stage4ToneIdx + 1 < syllables.length) {
          setStage4ToneIdx(stage4ToneIdx + 1);
          setStage4SelectedTone(null);
          setStage4ToneResult(null);
        } else {
          advanceStage();
        }
      } else {
        setStage4SelectedTone(null);
        setStage4ToneResult(null);
      }
    }, 800);
  };

  return (
    <ScreenWrapper>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← 返回</Text>
        </Pressable>
        <ProgressDots total={4} current={stage - 1} />
        <Text style={styles.stageLabel}>
          {stage === 1 && '听一听'}
          {stage === 2 && '拼一拼'}
          {stage === 3 && '选声调'}
          {stage === 4 && '全部来'}
        </Text>
      </View>

      <View style={styles.content}>
        {/* STAGE 1: Listen and Learn */}
        {stage === 1 && (
          <View style={styles.stage}>
            <PinyinDisplay syllables={syllables} showToneColor />
            {syllables.map((syl, i) => (
              <ToneCurve key={i} tone={syl.tone as 1|2|3|4} size={80} />
            ))}
            <SpeakButton text={item.characters || item.pinyin} autoPlay />
            <BigButton label="我听懂了" onPress={advanceStage} color={colors.correct} />
          </View>
        )}

        {/* STAGE 2: Build the Pinyin */}
        {stage === 2 && (
          <View style={styles.stage}>
            <SpeakButton text={item.characters || item.pinyin} size="large" />
            <Text style={styles.hint}>拼出正确的拼音</Text>
            <PinyinBuilder
              syllables={syllables}
              onComplete={(correct) => {
                if (correct) {
                  advanceStage();
                } else {
                  useAppStore.getState().recordError(item.id, `spelling:${item.pinyin}`);
                }
              }}
            />
          </View>
        )}

        {/* STAGE 3: Identify the Tone */}
        {stage === 3 && (
          <View style={styles.stage}>
            <Text style={styles.hint}>听声音，选声调</Text>
            <SpeakButton
              text={syllables[currentSyllableIdx]?.pinyin ?? ''}
              autoPlay
            />
            <Text style={styles.syllableCount}>
              第 {currentSyllableIdx + 1}/{syllables.length} 个音节
            </Text>
            <LocalCorrection isCorrect={toneResult}>
              <ToneSelector
                onSelect={handleToneSelect}
                selectedTone={selectedTone}
                correctTone={toneResult === false ? syllables[currentSyllableIdx].tone : null}
                disabled={toneResult !== null}
                syllable={syllables[currentSyllableIdx]?.pinyin}
              />
            </LocalCorrection>
          </View>
        )}

        {/* STAGE 4: Independent Mastery */}
        {stage === 4 && (
          <View style={styles.stage}>
            <SpeakButton text={item.characters || item.pinyin} size="large" />

            {stage4Step === 'spelling' && (
              <>
                <Text style={styles.hint}>拼出拼音，再选声调</Text>
                <PinyinBuilder
                  syllables={syllables}
                  onComplete={(correct) => {
                    if (correct) {
                      setStage4Step('tones');
                    } else {
                      useAppStore.getState().recordError(item.id, `s4spelling:${item.pinyin}`);
                    }
                  }}
                />
              </>
            )}

            {stage4Step === 'tones' && (
              <>
                <Text style={styles.hint}>
                  选声调 — {syllables[stage4ToneIdx]?.pinyin}
                </Text>
                <Text style={styles.syllableCount}>
                  第 {stage4ToneIdx + 1}/{syllables.length} 个
                </Text>
                <LocalCorrection isCorrect={stage4ToneResult}>
                  <ToneSelector
                    onSelect={handleStage4ToneSelect}
                    selectedTone={stage4SelectedTone}
                    correctTone={stage4ToneResult === false ? syllables[stage4ToneIdx].tone : null}
                    disabled={stage4ToneResult !== null}
                    syllable={syllables[stage4ToneIdx]?.pinyin}
                  />
                </LocalCorrection>
              </>
            )}
          </View>
        )}
      </View>

      <CelebrationRoll visible={showCelebration} />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: spacing.md,
    alignItems: 'center',
    gap: spacing.sm,
  },
  backBtn: {
    alignSelf: 'flex-start',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  backText: {
    fontSize: 18,
    color: colors.primary,
    fontWeight: '500',
  },
  stageLabel: {
    fontSize: typography.title.fontSize,
    fontWeight: typography.title.fontWeight,
    color: colors.text,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  stage: {
    alignItems: 'center',
    gap: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  hint: {
    fontSize: typography.body.fontSize,
    color: colors.textLight,
    fontWeight: '500',
    textAlign: 'center',
  },
  syllableCount: {
    fontSize: typography.caption.fontSize,
    color: colors.textMuted,
  },
  errorText: {
    fontSize: 20,
    color: colors.textLight,
    textAlign: 'center',
    marginTop: 100,
  },
});
