import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import ScreenWrapper from '../../../../../components/common/ScreenWrapper';
import StrokeDemo from '../../../../../components/writing/StrokeDemo';
import StrokeTracer from '../../../../../components/writing/StrokeTracer';
import BigButton from '../../../../../components/common/BigButton';
import SpeakButton from '../../../../../components/audio/SpeakButton';
import CelebrationRoll from '../../../../../components/feedback/CelebrationRoll';
import { getLessonById } from '../../../../../data/lessons';
import { useAppStore } from '../../../../../store/useAppStore';
import { colors, spacing, typography } from '../../../../../constants/theme';
import { loadCharacterData, CharacterData, preloadLessonCharacters } from '../../../../../utils/characterLoader';
import { WRITING_GRID_SIZE } from '../../../../../constants/layout';

type Mode = 'demo' | 'trace' | 'done';

export default function WritingScreen() {
  const { lessonId, itemIndex } = useLocalSearchParams<{ lessonId: string; itemIndex: string }>();
  const customLessons = useAppStore((s) => s.customLessons);
  const lesson = getLessonById(lessonId ?? '', customLessons);
  const idx = parseInt(itemIndex ?? '0', 10);
  const item = lesson?.items[idx];

  const [mode, setMode] = useState<Mode>('trace');
  const [charIdx, setCharIdx] = useState(0);
  const [completedChars, setCompletedChars] = useState<string[]>([]);
  const [charData, setCharData] = useState<CharacterData | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [loading, setLoading] = useState(true);
  const [speakKey, setSpeakKey] = useState(0); // bump to trigger a fresh autoPlay

  const characters = item?.characters?.split('') ?? [];
  const currentChar = characters[charIdx] ?? '';

  // Preload all characters for the word upfront so transitions are instant
  useEffect(() => {
    if (characters.length > 1) preloadLessonCharacters(characters);
  }, []);

  // Load character stroke data from CDN with offline cache
  useEffect(() => {
    if (!currentChar) return;
    setCharData(null);
    setLoading(true);
    loadCharacterData(currentChar).then((data) => {
      setCharData(data);
      setLoading(false);
    });
  }, [currentChar]);

  if (!item || characters.length === 0) {
    return (
      <ScreenWrapper>
        <Text style={styles.errorText}>没有可写的字</Text>
        <BigButton label="返回" onPress={() => router.replace(`/lesson/${lessonId}`)} />
      </ScreenWrapper>
    );
  }

  const handleDemoComplete = () => {
    // After demo, go to trace mode
  };

  const handleTraceComplete = () => {
    if (charIdx + 1 < characters.length) {
      // Move to next character — keep completed chars visible to the left
      setCompletedChars([...completedChars, currentChar]);
      setCharIdx(charIdx + 1);
      setMode('trace');
    } else {
      // All characters done — trigger SpeakButton remount to say the word, then celebrate
      useAppStore.getState().markWritingComplete(item.id);
      setSpeakKey(k => k + 1);
      setTimeout(() => {
        setShowCelebration(true);
        setTimeout(() => {
          setShowCelebration(false);
          setMode('done');
        }, 1500);
      }, 1400);
    }
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
        <Text style={styles.modeLabel}>
          {mode === 'trace' ? '写一写' : '写好了!'}
        </Text>
        {characters.length > 1 && (
          <Text style={styles.charCount}>
            第 {charIdx + 1}/{characters.length} 个字
          </Text>
        )}
      </View>

      <View style={styles.content}>
        {/* Full word label always visible during demo/trace */}
        {(mode === 'demo' || mode === 'trace') && (
          <Text style={styles.wordLabel}>
            {item.characters} ({item.pinyin})
          </Text>
        )}

        {loading && (
          <Text style={styles.wordLabel}>加载中...</Text>
        )}

        {mode === 'demo' && !loading && (
          <>
            {/* Completed chars + demo grid in a row */}
            <View style={styles.writingRow}>
              {completedChars.map((ch, i) => (
                <View key={i} style={styles.completedCharBox}>
                  <Text style={styles.completedCharText}>{ch}</Text>
                </View>
              ))}
              <StrokeDemo
                characterData={charData}
                character={currentChar}
                speakText={item.characters}
                onComplete={handleDemoComplete}
              />
            </View>
            <BigButton
              label="开始写"
              onPress={() => setMode('trace')}
              style={styles.actionBtn}
            />
          </>
        )}

        {mode === 'trace' && (
          <>
            {/* Auto-plays on mount; remounts (via speakKey) to replay after last char written */}
            <SpeakButton
              key={speakKey}
              text={item.characters || item.pinyin}
              size="small"
              autoPlay
              autoPlayDelay={speakKey === 0 ? 500 : 0}
            />
            {/* Completed chars + tracer grid in a row */}
            <View style={styles.writingRow}>
              {completedChars.map((ch, i) => (
                <View key={i} style={styles.completedCharBox}>
                  <Text style={styles.completedCharText}>{ch}</Text>
                </View>
              ))}
              <StrokeTracer
                key={charIdx}
                characterData={charData}
                character={currentChar}
                speakText={item.characters}
                onComplete={handleTraceComplete}
                suppressCelebration
              />
            </View>
          </>
        )}

        {mode === 'done' && (
          <View style={styles.doneArea}>
            <Text style={styles.doneChar}>{item.characters}</Text>
            <Text style={styles.doneText}>太棒了!</Text>
            <BigButton
              label="再写一次"
              onPress={() => {
                setCharIdx(0);
                setCompletedChars([]);
                setMode('trace');
              }}
              color={colors.primary}
            />
            <BigButton
              label="返回词语列表"
              onPress={() => router.replace(`/lesson/${lessonId}`)}
              color={colors.correct}
            />
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
    gap: spacing.xs,
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
  modeLabel: {
    fontSize: typography.title.fontSize,
    fontWeight: typography.title.fontWeight,
    color: colors.text,
  },
  charCount: {
    fontSize: typography.caption.fontSize,
    color: colors.textLight,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: spacing.sm,
    paddingTop: spacing.xs,
    paddingBottom: 60,
  },
  wordLabel: {
    fontSize: 20,
    color: colors.textLight,
    fontWeight: '500',
  },
  actionBtn: {
    marginTop: spacing.md,
  },
  doneArea: {
    alignItems: 'center',
    gap: spacing.lg,
  },
  doneChar: {
    fontSize: 80,
    color: colors.text,
  },
  doneText: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.correct,
  },
  errorText: {
    fontSize: 20,
    color: colors.textLight,
    textAlign: 'center',
    marginTop: 100,
  },
  writingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  completedCharBox: {
    width: WRITING_GRID_SIZE,
    height: WRITING_GRID_SIZE,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  completedCharText: {
    fontSize: WRITING_GRID_SIZE * 0.55,
    color: colors.correct,
    fontWeight: '500',
  },
});
