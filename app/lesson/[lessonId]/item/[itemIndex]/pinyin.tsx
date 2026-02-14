import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import ScreenWrapper from '../../../../../components/common/ScreenWrapper';
import PinyinDisplay from '../../../../../components/pinyin/PinyinDisplay';
import PinyinBuilder from '../../../../../components/pinyin/PinyinBuilder';
import ToneSelector from '../../../../../components/pinyin/ToneSelector';
import SpeakButton from '../../../../../components/audio/SpeakButton';
import BigButton from '../../../../../components/common/BigButton';
import ProgressDots from '../../../../../components/common/ProgressDots';
import CelebrationRoll from '../../../../../components/feedback/CelebrationRoll';
import LocalCorrection from '../../../../../components/feedback/LocalCorrection';
import { getLessonById } from '../../../../../data/lessons';
import { useAppStore } from '../../../../../store/useAppStore';
import { colors, spacing, typography, toneColor } from '../../../../../constants/theme';
import { stripTone } from '../../../../../utils/pinyin';

export default function PinyinScreen() {
  const { lessonId, itemIndex } = useLocalSearchParams<{ lessonId: string; itemIndex: string }>();
  const customLessons = useAppStore((s) => s.customLessons);
  const lesson = getLessonById(lessonId ?? '', customLessons);
  const idx = parseInt(itemIndex ?? '0', 10);
  const item = lesson?.items[idx];

  const progress = useAppStore((s) => item ? s.progress[item.id] : undefined);
  // Always start at Stage 1 (听一听) to show animated tones and pronunciation first
  const [stage, setStage] = useState(1);
  const [showCelebration, setShowCelebration] = useState(false);
  const [replayKey, setReplayKey] = useState(0);

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
    // CelebrationRoll's onDone callback will handle the transition
  };

  const handleCelebrationDone = () => {
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
        <View style={styles.headerTop}>
          <Pressable onPress={() => router.replace(`/lesson/${lessonId}`)} style={styles.backBtn}>
            <Text style={styles.backText}>← 返回</Text>
          </Pressable>
          <Pressable onPress={() => router.push(`/lesson/${lessonId}/test`)} style={styles.testListBtn}>
            <Text style={styles.testListText}>📝 测试列表</Text>
          </Pressable>
        </View>
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
            <PinyinDisplay
              syllables={syllables}
              showToneColor
              showToneCurve
              size="xlarge"
              replayKey={replayKey}
            />
            <SpeakButton
              text={item.characters || item.pinyin}
              autoPlay
              onPress={() => setReplayKey((k) => k + 1)}
            />
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
              autoPlayWord
              wordText={item.characters || item.pinyin}
              characters={item.characters}
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
            {/* Custom display: show bare pinyin, fill in tones as child progresses */}
            <View style={styles.toneProgressRow}>
              {syllables.map((syl, i) => {
                const bare = stripTone(syl.pinyin);
                const isCompleted = i < currentSyllableIdx;
                const isCurrent = i === currentSyllableIdx;
                // Show toned version immediately when correct tone is selected
                const justCompleted = isCurrent && toneResult === true;
                const displayText = (isCompleted || justCompleted) ? syl.pinyin : bare;
                const color = (isCompleted || justCompleted) ? toneColor(syl.tone) : (isCurrent ? colors.text : colors.textMuted);
                const opacity = isCurrent ? 1 : (isCompleted ? 1 : 0.4);

                return (
                  <Text
                    key={i}
                    style={[
                      styles.toneProgressText,
                      { color, opacity },
                    ]}
                  >
                    {displayText}
                  </Text>
                );
              })}
            </View>
            <SpeakButton
              text={item.characters?.[currentSyllableIdx] || syllables[currentSyllableIdx]?.pinyin || ''}
              autoPlay
              autoPlayDelay={1000}
            />
            <Text style={styles.hint}>选择正确的声调</Text>
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
                  autoPlayWord
                  wordText={item.characters || item.pinyin}
                  characters={item.characters}
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
                {/* Custom display: show bare pinyin, fill in tones as child progresses */}
                <View style={styles.toneProgressRow}>
                  {syllables.map((syl, i) => {
                    const bare = stripTone(syl.pinyin);
                    const isCompleted = i < stage4ToneIdx;
                    const isCurrent = i === stage4ToneIdx;
                    // Show toned version immediately when correct tone is selected
                    const justCompleted = isCurrent && stage4ToneResult === true;
                    const displayText = (isCompleted || justCompleted) ? syl.pinyin : bare;
                    const color = (isCompleted || justCompleted) ? toneColor(syl.tone) : (isCurrent ? colors.text : colors.textMuted);
                    const opacity = isCurrent ? 1 : (isCompleted ? 1 : 0.4);

                    return (
                      <Text
                        key={i}
                        style={[
                          styles.toneProgressText,
                          { color, opacity },
                        ]}
                      >
                        {displayText}
                      </Text>
                    );
                  })}
                </View>
                <SpeakButton
                  text={item.characters?.[stage4ToneIdx] || syllables[stage4ToneIdx]?.pinyin || ''}
                  autoPlay
                  autoPlayDelay={1000}
                />
                <Text style={styles.hint}>选择正确的声调</Text>
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

      <CelebrationRoll visible={showCelebration} onDone={handleCelebrationDone} />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: spacing.md,
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerTop: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
  },
  backBtn: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  backText: {
    fontSize: 18,
    color: colors.primary,
    fontWeight: '500',
  },
  testListBtn: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: 8,
  },
  testListText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
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
  toneProgressRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.lg,
  },
  toneProgressText: {
    fontSize: 48,
    fontWeight: '700',
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
