import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, Alert } from 'react-native';
import { router } from 'expo-router';
import ScreenWrapper from '../components/common/ScreenWrapper';
import { allLessons } from '../data/lessons';
import { useAppStore } from '../store/useAppStore';
import { colors, spacing, radius, typography } from '../constants/theme';
import { Lesson } from '../types';

export default function HomeScreen() {
  const progress = useAppStore((s) => s.progress);
  const customLessons = useAppStore((s) => s.customLessons);
  const deleteCustomLesson = useAppStore((s) => s.deleteCustomLesson);

  // Auto-expand all groups by default
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(() => {
    const groups = new Set<string>();
    customLessons.forEach((lesson) => {
      const key = lesson.school && lesson.grade
        ? `${lesson.school}|||${lesson.grade}`
        : 'other';
      groups.add(key);
    });
    return groups;
  });

  // Group custom lessons by school + grade
  const groupedCustomLessons = React.useMemo(() => {
    const groups: Record<string, Lesson[]> = {};

    customLessons.forEach((lesson) => {
      const key = lesson.school && lesson.grade
        ? `${lesson.school}|||${lesson.grade}`
        : 'other';

      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(lesson);
    });

    return groups;
  }, [customLessons]);

  // Auto-expand new groups when custom lessons change
  React.useEffect(() => {
    const newExpanded = new Set(expandedGroups);
    let hasChanges = false;

    Object.keys(groupedCustomLessons).forEach((key) => {
      if (!expandedGroups.has(key)) {
        newExpanded.add(key);
        hasChanges = true;
      }
    });

    if (hasChanges) {
      setExpandedGroups(newExpanded);
    }
  }, [groupedCustomLessons]);

  const getLessonProgress = (lessonId: string, itemCount: number) => {
    let completed = 0;
    for (let i = 0; i < itemCount; i++) {
      const key = `${lessonId}-${i + 1}`;
      const p = progress[key];
      if (p && (p.writingComplete || p.pinyinStage >= 4)) {
        completed++;
      }
    }
    return completed;
  };

  const toggleGroup = (groupKey: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupKey)) {
      newExpanded.delete(groupKey);
    } else {
      newExpanded.add(groupKey);
    }
    setExpandedGroups(newExpanded);
  };

  const renderLessonCard = (lesson: Lesson) => {
    const completed = getLessonProgress(lesson.id, lesson.items.length);
    const total = lesson.items.length;
    const isCustom = lesson.id.startsWith('custom-');

    return (
      <Pressable
        key={lesson.id}
        style={({ pressed }) => [styles.card, pressed && { opacity: 0.8 }]}
        onPress={() => {
          useAppStore.getState().setLesson(lesson.id);
          router.push(`/lesson/${lesson.id}`);
        }}
        onLongPress={isCustom ? () => {
          Alert.alert(
            'Delete Lesson',
            `Delete "${lesson.label}"?`,
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Delete', style: 'destructive', onPress: () => deleteCustomLesson(lesson.id) },
            ]
          );
        } : undefined}
      >
        <Text style={styles.lessonLabel}>{lesson.label}</Text>
        <Text style={styles.lessonName}>{lesson.lessonName}</Text>
        <Text style={styles.date}>{lesson.date}</Text>

        {/* Progress bar */}
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              { width: total > 0 ? `${(completed / total) * 100}%` : '0%' },
            ]}
          />
        </View>
        <Text style={styles.progressText}>
          {completed}/{total} 个词
        </Text>
      </Pressable>
    );
  };

  return (
    <ScreenWrapper>
      <View style={styles.header}>
        <Text style={styles.title}>小小听写伴</Text>
        <Text style={styles.subtitle}>选择听写</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Built-in lessons */}
        <View style={styles.grid}>
          {allLessons.map((lesson) => renderLessonCard(lesson))}

          {/* Upload button */}
          <Pressable
            style={({ pressed }) => [styles.card, styles.uploadCard, pressed && { opacity: 0.8 }]}
            onPress={() => router.push('/upload')}
          >
            <Text style={styles.uploadIcon}>+</Text>
            <Text style={styles.uploadText}>Upload</Text>
            <Text style={styles.uploadSubtext}>上传听写单</Text>
          </Pressable>
        </View>

        {/* Grouped custom lessons */}
        {Object.entries(groupedCustomLessons).map(([groupKey, lessons]) => {
          const isExpanded = expandedGroups.has(groupKey);
          const [school, grade] = groupKey === 'other'
            ? ['Other Lessons', '']
            : groupKey.split('|||');

          return (
            <View key={groupKey} style={styles.groupBox}>
              <Pressable
                style={styles.groupHeader}
                onPress={() => toggleGroup(groupKey)}
              >
                <View style={styles.groupHeaderContent}>
                  <Text style={styles.groupTitle}>{school}</Text>
                  {grade && <Text style={styles.groupSubtitle}>{grade}</Text>}
                  <Text style={styles.groupCount}>{lessons.length} lesson{lessons.length > 1 ? 's' : ''}</Text>
                </View>
                <Text style={styles.expandIcon}>{isExpanded ? '▼' : '▶'}</Text>
              </Pressable>

              {isExpanded && (
                <View style={styles.groupContent}>
                  {lessons.map((lesson) => renderLessonCard(lesson))}
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>

      <Pressable
        style={styles.parentBtn}
        onPress={() => router.push('/parent')}
      >
        <Text style={styles.parentBtnText}>家长</Text>
      </Pressable>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  title: {
    fontSize: 36,
    fontWeight: '800',
    color: colors.text,
  },
  subtitle: {
    fontSize: typography.body.fontSize,
    color: colors.textLight,
    marginTop: spacing.xs,
  },
  scrollContent: {
    paddingBottom: spacing.xl,
    gap: spacing.lg,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.md,
  },
  groupBox: {
    marginHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: colors.primary,
    overflow: 'hidden',
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    backgroundColor: colors.primary + '15',
  },
  groupHeaderContent: {
    flex: 1,
    gap: 4,
  },
  groupTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
  },
  groupSubtitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  groupCount: {
    fontSize: 12,
    color: colors.textLight,
    marginTop: 2,
  },
  expandIcon: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: '700',
    marginLeft: spacing.sm,
  },
  groupContent: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.md,
  },
  card: {
    width: 160,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    alignItems: 'center',
    gap: spacing.xs,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  lessonLabel: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.primary,
  },
  lessonName: {
    fontSize: 16,
    color: colors.text,
    fontWeight: '500',
  },
  date: {
    fontSize: 13,
    color: colors.textLight,
  },
  progressBar: {
    width: '100%',
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.border,
    marginTop: spacing.xs,
  },
  progressFill: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.correct,
  },
  progressText: {
    fontSize: 12,
    color: colors.textLight,
  },
  uploadCard: {
    borderWidth: 2,
    borderColor: colors.primary,
    borderStyle: 'dashed',
    backgroundColor: 'transparent',
    justifyContent: 'center',
  },
  uploadIcon: {
    fontSize: 36,
    fontWeight: '300',
    color: colors.primary,
  },
  uploadText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
  },
  uploadSubtext: {
    fontSize: 13,
    color: colors.textLight,
  },
  parentBtn: {
    alignSelf: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  parentBtnText: {
    fontSize: 16,
    color: colors.textLight,
  },
});
