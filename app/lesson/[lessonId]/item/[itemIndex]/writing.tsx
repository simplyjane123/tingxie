import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import ScreenWrapper from '../../../../../components/common/ScreenWrapper';
import StrokeDemo from '../../../../../components/writing/StrokeDemo';
import StrokeTracer from '../../../../../components/writing/StrokeTracer';
import BigButton from '../../../../../components/common/BigButton';
import CelebrationRoll from '../../../../../components/feedback/CelebrationRoll';
import { getLessonById } from '../../../../../data/lessons';
import { useAppStore } from '../../../../../store/useAppStore';
import { colors, spacing, typography } from '../../../../../constants/theme';
import { loadCharacterData, CharacterData } from '../../../../../utils/characterLoader';

type Mode = 'demo' | 'trace' | 'done';

export default function WritingScreen() {
  const { lessonId, itemIndex } = useLocalSearchParams<{ lessonId: string; itemIndex: string }>();
  const customLessons = useAppStore((s) => s.customLessons);
  const lesson = getLessonById(lessonId ?? '', customLessons);
  const idx = parseInt(itemIndex ?? '0', 10);
  const item = lesson?.items[idx];

  const [mode, setMode] = useState<Mode>('demo');
  const [charIdx, setCharIdx] = useState(0);
  const [charData, setCharData] = useState<CharacterData | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [loading, setLoading] = useState(true);

  const characters = item?.characters?.split('') ?? [];
  const currentChar = characters[charIdx] ?? '';

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
    setShowCelebration(true);
    setTimeout(() => {
      setShowCelebration(false);

      if (charIdx + 1 < characters.length) {
        // Move to next character
        setCharIdx(charIdx + 1);
        setMode('demo');
      } else {
        // All characters done
        useAppStore.getState().markWritingComplete(item.id);
        setMode('done');
      }
    }, 1000);
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
          {mode === 'demo' ? '看一看' : mode === 'trace' ? '写一写' : '写好了!'}
        </Text>
        {characters.length > 1 && (
          <Text style={styles.charCount}>
            第 {charIdx + 1}/{characters.length} 个字
          </Text>
        )}
      </View>

      <View style={styles.content}>
        {/* Show the full word context - only in demo mode at top */}
        {mode === 'demo' && (
          <Text style={styles.wordLabel}>
            {item.characters} ({item.pinyin})
          </Text>
        )}

        {loading && (
          <Text style={styles.wordLabel}>加载中...</Text>
        )}

        {mode === 'demo' && !loading && (
          <>
            <StrokeDemo
              characterData={charData}
              character={currentChar}
              speakText={item.characters}
              onComplete={handleDemoComplete}
            />
            <BigButton
              label="开始写"
              onPress={() => setMode('trace')}
              style={styles.actionBtn}
            />
          </>
        )}

        {mode === 'trace' && (
          <StrokeTracer
            characterData={charData}
            character={currentChar}
            wordLabel={`${item.characters} (${item.pinyin})`}
            speakText={item.characters}
            onComplete={handleTraceComplete}
          />
        )}

        {mode === 'done' && (
          <View style={styles.doneArea}>
            <Text style={styles.doneChar}>{item.characters}</Text>
            <Text style={styles.doneText}>太棒了!</Text>
            <BigButton
              label="再写一次"
              onPress={() => {
                setCharIdx(0);
                setMode('demo');
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
});
